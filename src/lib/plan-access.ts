export type PlanLevel = "ansokan" | "step1" | "step2" | "step3";

export const PLAN_ACCESS_RANK: Record<PlanLevel, number> = {
  ansokan: 0,
  step1: 1,
  step2: 2,
  step3: 3,
};

export function hasPlanAccess(
  currentPlan: PlanLevel | null | undefined,
  requiredPlan: PlanLevel
): boolean {
  if (!currentPlan) return false;
  return PLAN_ACCESS_RANK[currentPlan] >= PLAN_ACCESS_RANK[requiredPlan];
}
