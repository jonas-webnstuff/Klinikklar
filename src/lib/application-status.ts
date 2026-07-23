import {
  attachmentChecklistRequirementItems,
  complianceRequirements,
  facilityRequirementItems,
  ivoReadinessItemDefinitions,
  managementSystemRequirementItems,
  ownershipRequirementItems,
  questionnaireItems,
  responsiblePersonRequirementItems,
} from "@/lib/requirements";
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
  canMoveToReady: boolean;
  canSubmit: boolean;
  evidenceCount: number;
  completeRequirementCount: number;
  requirementCount: number;
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
      .select("name, address, postal_code, municipality, region")
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError) throw clinicError;

    hasClinic = Boolean(
      clinic?.name?.trim() &&
        clinic?.address?.trim() &&
        clinic?.municipality?.trim() &&
        clinic?.region?.trim()
    );

    clinicProfileComplete = Boolean(
      clinic?.name?.trim() &&
        clinic?.address?.trim() &&
        clinic?.postal_code?.trim() &&
        clinic?.municipality?.trim()
    );
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

  const requiredQuestionKeys = questionnaireItems.map((item) => item.key);
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

  const completeRequirementCount = complianceRequirements.filter(
    (requirement) => requirementMap.get(requirement.code) === "complete"
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
  const responsiblePeopleComplete = responsiblePersonRequirementItems.every((item) =>
    Boolean(responseValue(item.key))
  );
  const ownershipSuitabilityComplete = ownershipRequirementItems.every((item) =>
    Boolean(responseValue(item.key))
  );
  const facilityAndEquipmentComplete = facilityRequirementItems.every((item) =>
    Boolean(responseValue(item.key))
  );
  const attachmentChecklistComplete = attachmentChecklistRequirementItems.every((item) =>
    Boolean(responseValue(item.key))
  );

  const ivoChecklistItems = ivoReadinessItemDefinitions.map((item) => {
    switch (item.key) {
      case "organization_identity":
        return { key: item.key, label: item.label, detail: item.description, done: hasOrganization };
      case "clinic_location":
        return { key: item.key, label: item.label, detail: item.description, done: clinicProfileComplete };
      case "care_scope":
        return { key: item.key, label: item.label, detail: item.description, done: Boolean(responseValue("care_scope")) };
      case "staffing":
        return { key: item.key, label: item.label, detail: item.description, done: Boolean(responseValue("staffing")) };
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
        return { key: item.key, label: item.label, detail: item.description, done: responsiblePeopleComplete };
      case "ownership_suitability":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: ownershipSuitabilityComplete,
        };
      case "facility_and_equipment":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: facilityAndEquipmentComplete,
        };
      case "attachment_checklist":
        return {
          key: item.key,
          label: item.label,
          detail: item.description,
          done: attachmentChecklistComplete,
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
    canMoveToReady,
    canSubmit,
    evidenceCount,
    completeRequirementCount,
    requirementCount,
  };
}
