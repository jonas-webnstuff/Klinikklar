import { complianceRequirements, questionnaireItems } from "@/lib/requirements";
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
  canMoveToReady: boolean;
  canSubmit: boolean;
  evidenceCount: number;
  completeRequirementCount: number;
  requirementCount: number;
};

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
  const { data: responses, error: responsesError } = await supabase
    .from("questionnaire_responses")
    .select("question_key, answer")
    .eq("application_id", applicationId);

  if (responsesError) throw responsesError;

  const answerMap = new Map<string, string>();
  for (const row of responses || []) {
    answerMap.set(row.question_key, row.answer || "");
  }

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
  if (requirementIds.length > 0) {
    const { data: evidenceRows, error: evidenceError } = await supabase
      .from("evidence")
      .select("id")
      .in("requirement_id", requirementIds);

    if (evidenceError) throw evidenceError;
    evidenceCount = (evidenceRows || []).length;
  }

  const evidenceLinked = evidenceCount > 0;

  const hasOrganization = true;
  const hasClinic = true;
  const canMoveToReady = hasOrganization && hasClinic && questionnaireComplete && requirementsComplete;
  const canSubmit = canMoveToReady && evidenceLinked;

  return {
    hasOrganization,
    hasClinic,
    questionnaireComplete,
    requirementsComplete,
    evidenceLinked,
    canMoveToReady,
    canSubmit,
    evidenceCount,
    completeRequirementCount,
    requirementCount,
  };
}
