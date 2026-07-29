import {
  complianceRequirements,
  facilityRequirementItems,
  ivoReadinessItemDefinitions,
  mainCareScopeCodes,
  managementSystemRequirementItems,
  questionnaireItems,
  structuredRequirementDefinitions,
  type StructuredRequirementCode,
} from "@/lib/requirements";
import { isPlaceholderDocumentDraftBody } from "@/lib/document-drafts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ApplicationStatus = "draft" | "in_review" | "ready_to_submit" | "submitted";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

export type ApplicationContext = {
  organizationId: string;
  clinicId: string;
  applicationId: string;
  status: ApplicationStatus;
};

export type ReadinessChecklist = {
  hasOrganization: boolean;
  hasClinic: boolean;
  questionnaireComplete: boolean;
  requirementsComplete: boolean;
  evidenceLinked: boolean;
  ivoChecklistComplete: boolean;
  ivoChecklistItems: Array<{
    key: string;
    label: string;
    detail: string;
    done: boolean;
  }>;
  missingIvoItems: string[];
  advisoryIvoGaps: string[];
  missingDocumentRequirements: string[];
  missingStructuredRequirementFields: string[];
  canMoveToReady: boolean;
  canSubmit: boolean;
  evidenceCount: number;
  completeRequirementCount: number;
  requirementCount: number;
  completeStructuredRequirementCodeCount: number;
  structuredRequirementCodeCount: number;
};

export function getEffectiveApplicationStatus(
  status: ApplicationStatus,
  checklist: ReadinessChecklist
): ApplicationStatus {
  if (status === "submitted" && !checklist.canSubmit) {
    return checklist.canMoveToReady ? "ready_to_submit" : "draft";
  }

  if ((status === "ready_to_submit" || status === "in_review") && !checklist.canMoveToReady) {
    return "draft";
  }

  return status;
}

export async function synchronizeApplicationStatus(
  supabase: SupabaseAdmin,
  input: {
    applicationId: string;
    userId: string;
    currentStatus: ApplicationStatus;
    checklist: ReadinessChecklist;
  }
): Promise<ApplicationStatus> {
  const effectiveStatus = getEffectiveApplicationStatus(input.currentStatus, input.checklist);

  if (effectiveStatus === input.currentStatus) {
    return input.currentStatus;
  }

  const { error: updateError } = await supabase
    .from("applications")
    .update({ status: effectiveStatus, updated_at: new Date().toISOString() })
    .eq("id", input.applicationId);

  if (updateError) {
    throw updateError;
  }

  await logApplicationEvent(supabase, {
    applicationId: input.applicationId,
    userId: input.userId,
    eventType: "application_status_normalized",
    message: `Status justerad automatiskt: ${input.currentStatus} -> ${effectiveStatus}`,
    metadata: {
      from: input.currentStatus,
      to: effectiveStatus,
    },
  });

  return effectiveStatus;
}

export async function logApplicationEvent(
  supabase: SupabaseAdmin,
  input: {
    applicationId: string;
    userId: string;
    eventType: string;
    message: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("compliance_audit_events").insert({
    application_id: input.applicationId,
    user_id: input.userId,
    event_type: input.eventType,
    message: input.message,
    metadata: input.metadata || null,
  });

  if (error) {
    throw error;
  }
}

export async function resolveUserApplicationContext(
  supabase: SupabaseAdmin,
  userId: string
): Promise<ApplicationContext | null> {
  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  const organizationId = membership?.organization_id;

  if (!organizationId) {
    return null;
  }

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (clinicError) throw clinicError;

  if (!clinic?.id) {
    return null;
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("clinic_id", clinic.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError) throw applicationError;

  if (!application?.id) {
    return null;
  }

  return {
    organizationId,
    clinicId: clinic.id,
    applicationId: application.id,
    status: application.status as ApplicationStatus,
  };
}

export async function computeReadinessChecklist(
  supabase: SupabaseAdmin,
  applicationId: string
): Promise<ReadinessChecklist> {
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("organization_id, clinic_id")
    .eq("id", applicationId)
    .maybeSingle();

  if (applicationError) throw applicationError;

  const organizationId = application?.organization_id;
  const clinicId = application?.clinic_id;

  let hasOrganization = false;
  let hasClinic = false;
  let clinicProfileComplete = false;

  if (organizationId) {
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name, org_number, email")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationError) throw organizationError;

    hasOrganization = Boolean(
      organization?.name?.trim() &&
        organization?.org_number?.trim() &&
        organization?.email?.trim()
    );
  }

  if (clinicId) {
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("name, address, postal_code, municipality")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError) throw clinicError;

    clinicProfileComplete = Boolean(
      clinic?.name?.trim() &&
        clinic?.address?.trim() &&
        clinic?.postal_code?.trim() &&
        clinic?.municipality?.trim()
    );

    // hasClinic and clinicProfileComplete previously required different field sets
    // (hasClinic required `region`, which is never actually collected from the
    // user and is always hardcoded to "Ej angivet" — see getOrCreateClinic in
    // /api/workspace/save/route.ts). They now share one definition so they can't
    // silently diverge again.
    hasClinic = clinicProfileComplete;
  }

  const { data: responses, error: responsesError } = await supabase
    .from("questionnaire_responses")
    .select("question_key, answer, follow_up_answer")
    .eq("application_id", applicationId);

  if (responsesError) throw responsesError;

  const answerMap = new Map<string, string>();
  for (const row of responses || []) {
    answerMap.set(row.question_key, row.answer || "");
  }

  const responseValue = (key: string) => answerMap.get(key)?.trim() || "";

  const { data: careScopeRows, error: careScopeError } = await supabase
    .from("care_scope_codes")
    .select("code")
    .eq("application_id", applicationId);

  if (careScopeError) throw careScopeError;

  const hasMainCareScopeCode = (careScopeRows || []).some((row) =>
    (mainCareScopeCodes as string[]).includes(row.code)
  );

  const requiredQuestionKeys = questionnaireItems
    .map((item) => item.key)
    .filter((key) => key !== "care_scope");
  const questionnaireComplete = requiredQuestionKeys.every((key) =>
    Boolean(answerMap.get(key)?.trim())
  );

  const { data: requirementRows, error: requirementsError } = await supabase
    .from("requirements")
    .select("id, code, status")
    .eq("application_id", applicationId);

  if (requirementsError) throw requirementsError;

  const requirementCount = complianceRequirements.length;
  const requirementMap = new Map<string, string>();
  const requirementIds: string[] = [];

  for (const row of requirementRows || []) {
    requirementMap.set(row.code, row.status);
    requirementIds.push(row.id);
  }

  const { data: documentRows, error: documentsError } = await supabase
    .from("generated_documents")
    .select("kind, is_approved, body")
    .eq("application_id", applicationId)
    .eq("is_current", true);

  if (documentsError) throw documentsError;

  const hasApprovedSubstantiveDraft = new Set(
    (documentRows || [])
      .filter((row) => row.is_approved && !isPlaceholderDocumentDraftBody(row.body))
      .map((row) => row.kind)
  );

  const completeRequirementCount = complianceRequirements.filter(
    (requirement) =>
      requirementMap.get(requirement.code) === "complete" &&
      hasApprovedSubstantiveDraft.has(requirement.documentKind)
  ).length;

  const missingDocumentRequirements = complianceRequirements
    .filter((requirement) => !hasApprovedSubstantiveDraft.has(requirement.documentKind))
    .map((requirement) => `${requirement.code} – ${requirement.title}: saknar godkänt, ifyllt dokumentutkast`);

  const { data: structuredRows, error: structuredError } = await supabase
    .from("structured_requirement_items")
    .select("requirement_code, fields, file_path")
    .eq("application_id", applicationId);

  if (structuredError) throw structuredError;

  // R-08's supporting document (aktiebok/registreringsbevis) is shared across the whole
  // requirement, not one file per owner row — see requirement_supporting_documents in
  // schema.sql for why this is a separate table from structured_requirement_items.
  const { data: requirementDocumentRows, error: requirementDocumentError } = await supabase
    .from("requirement_supporting_documents")
    .select("requirement_code, file_path")
    .eq("application_id", applicationId);

  if (requirementDocumentError) throw requirementDocumentError;

  const requirementSupportingDocumentByCode = new Map<string, string | null>(
    (requirementDocumentRows || []).map((row) => [row.requirement_code, row.file_path])
  );

  const missingStructuredRequirementFields: string[] = [];

  for (const code of Object.keys(structuredRequirementDefinitions) as StructuredRequirementCode[]) {
    const rows = (structuredRows || []).filter((row) => row.requirement_code === code);
    const def = structuredRequirementDefinitions[code];

    if (code === "R-09") {
      for (const preset of def.quickPicks || []) {
        const standardType = preset.fields.standardType;

        if (!standardType) {
          continue;
        }

        // Requires an actually uploaded file, not just the self-declared "status: finns"
        // text — a row can otherwise claim a document exists without one ever having
        // been attached. Status is now a label derived from file_path, not a source of truth.
        const hasFulfilledRow = rows.some((row) => {
          const fields = row.fields as Record<string, unknown>;
          return fields?.standardType === standardType && Boolean(row.file_path);
        });

        if (!hasFulfilledRow) {
          missingStructuredRequirementFields.push(`R-09: ${preset.label.toLowerCase()} saknas`);
        }
      }
      continue;
    }

    if (rows.length === 0) {
      missingStructuredRequirementFields.push(`${code}: minst en ${def.itemLabel} måste läggas till`);
      continue;
    }

    for (const field of def.fields) {
      if (field.optional) {
        continue;
      }

      const missingCount = rows.filter(
        (row) => !String((row.fields as Record<string, unknown>)?.[field.key] ?? "").trim()
      ).length;

      if (missingCount > 0) {
        missingStructuredRequirementFields.push(
          `${code}: ${field.label.toLowerCase()} saknas för ${missingCount} av ${rows.length} (${def.itemLabel})`
        );
      }
    }

    if (code === "R-08") {
      const totalPercent = rows.reduce(
        (sum, row) => sum + (Number((row.fields as Record<string, unknown>)?.ownershipPercent) || 0),
        0
      );

      if (Math.abs(totalPercent - 100) > 0.5) {
        missingStructuredRequirementFields.push(
          `R-08: ägarandelarna summerar till ${totalPercent}%, måste bli 100%`
        );
      }

      // Only checked once owner rows actually exist (this whole branch is skipped by
      // the `rows.length === 0` continue above) — with zero owners, "minst en ägare
      // måste läggas till" is already the whole story, and a second "handling saknas"
      // message on top of it would just be noise pointing at the wrong problem.
      if (!requirementSupportingDocumentByCode.get(code)) {
        missingStructuredRequirementFields.push(
          "R-08: styrkande handling (t.ex. aktiebok eller registreringsbevis) saknas"
        );
      }
    }

    for (const field of def.fields) {
      if (!field.requiresAtLeastOne) {
        continue;
      }

      const hasAtLeastOne = rows.some(
        (row) => String((row.fields as Record<string, unknown>)?.[field.key] ?? "").toLowerCase() === "true"
      );

      if (!hasAtLeastOne) {
        missingStructuredRequirementFields.push(field.requiresAtLeastOneMessage || `${code}: ${field.label} saknas`);
      }
    }
  }

  const isStructuredRequirementComplete = (code: StructuredRequirementCode) =>
    !missingStructuredRequirementFields.some((message) => message.startsWith(`${code}:`));

  // Computed once here, from the same isStructuredRequirementComplete used for the IVO
  // checklist items below, and sent to the client as a plain number — the client must
  // never re-derive this by re-parsing missingStructuredRequirementFields itself (that
  // duplicated-prefix-matching pattern is exactly what caused the care_scope regression).
  const structuredRequirementCodes = Object.keys(structuredRequirementDefinitions) as StructuredRequirementCode[];
  const structuredRequirementCodeCount = structuredRequirementCodes.length;
  const completeStructuredRequirementCodeCount = structuredRequirementCodes.filter(
    isStructuredRequirementComplete
  ).length;

  const requirementsComplete =
    requirementCount > 0 && completeRequirementCount === requirementCount;

  let evidenceCount = 0;
  let evidenceLinked = false;
  const hasFullRequirementSet = requirementIds.length === requirementCount;

  if (requirementIds.length > 0) {
    const { data: evidenceRows, error: evidenceError } = await supabase
      .from("evidence")
      .select("id, requirement_id")
      .in("requirement_id", requirementIds);

    if (evidenceError) throw evidenceError;
    const rows = evidenceRows || [];
    evidenceCount = rows.length;

    const coveredRequirementIds = new Set(rows.map((row) => row.requirement_id));
    evidenceLinked =
      hasFullRequirementSet &&
      requirementIds.every((requirementId) => coveredRequirementIds.has(requirementId));
  }

  const managementSystemComplete = managementSystemRequirementItems.every((item) =>
    Boolean(responseValue(item.key))
  );
  const facilityAndEquipmentComplete = facilityRequirementItems.every((item) =>
    Boolean(responseValue(item.key))
  );

  const ivoChecklistItems = ivoReadinessItemDefinitions.map((item) => {
    switch (item.key) {
      case "organization_identity":
        return { key: item.key, label: item.label, detail: item.description, done: hasOrganization };
      case "clinic_location":
        return { key: item.key, label: item.label, detail: item.description, done: clinicProfileComplete };
      case "care_scope":
        return { key: item.key, label: item.label, detail: item.description, done: hasMainCareScopeCode };
      case "staffing":
        return { key: item.key, label: item.label, detail: item.description, done: isStructuredRequirementComplete("R-06") };
      case "quality_process":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: Boolean(responseValue("quality_process")),
        };
      case "incident_routine":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: Boolean(responseValue("incident_routine")),
        };
      case "management_system":
        return { key: item.key, label: item.label, detail: item.description, done: managementSystemComplete };
      case "responsible_people":
        return { key: item.key, label: item.label, detail: item.description, done: isStructuredRequirementComplete("R-07") };
      case "ownership_suitability":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: isStructuredRequirementComplete("R-08"),
        };
      case "facility_and_equipment":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: facilityAndEquipmentComplete,
        };
      case "economic_conditions":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: isStructuredRequirementComplete("R-10"),
        };
      case "attachment_checklist":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: isStructuredRequirementComplete("R-09"),
        };
      case "evidence_package":
        return { key: item.key, label: item.label, detail: item.description, done: evidenceLinked };
      default:
        return { key: item.key, label: item.label, detail: item.description, done: false };
    }
  });

  const missingIvoItems = ivoChecklistItems.filter((item) => !item.done).map((item) => item.label);
  const ivoChecklistComplete = missingIvoItems.length === 0;
  const advisoryIvoGaps: string[] = [];

  const canMoveToReady =
    hasOrganization && hasClinic && questionnaireComplete && requirementsComplete && ivoChecklistComplete;
  const canSubmit = canMoveToReady && evidenceLinked;

  return {
    hasOrganization,
    hasClinic,
    questionnaireComplete,
    requirementsComplete,
    evidenceLinked,
    ivoChecklistComplete,
    ivoChecklistItems,
    missingIvoItems,
    advisoryIvoGaps,
    missingDocumentRequirements,
    missingStructuredRequirementFields,
    canMoveToReady,
    canSubmit,
    evidenceCount,
    completeRequirementCount,
    requirementCount,
    completeStructuredRequirementCodeCount,
    structuredRequirementCodeCount,
  };
}
