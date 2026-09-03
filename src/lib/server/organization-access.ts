import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasPlanAccess, type PlanLevel } from "@/lib/plan-access";

export async function getOrganizationForUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
) {
  const { data: membership, error } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!membership?.organization_id) return null;

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id, plan")
    .eq("id", membership.organization_id)
    .maybeSingle();

  if (orgError) throw orgError;
  if (!organization) return null;

  return { organizationId: organization.id as string, plan: organization.plan as PlanLevel | null };
}

// Ledningssystem features (risker, avvikelser, rutiner, kontroller, ...) require a paid plan
// at or above `requiredPlan` — checked server-side because the workspace UI's plan gating is
// client state and was never meant to be a security boundary on its own.
export async function requireOrganizationWithPlan(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  requiredPlan: PlanLevel
) {
  const organization = await getOrganizationForUser(supabase, userId);
  if (!organization || !hasPlanAccess(organization.plan, requiredPlan)) {
    return null;
  }
  return organization;
}
