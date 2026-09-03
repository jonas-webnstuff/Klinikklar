// Premium (step3) is deliberately left out — "Prioriterad support" doesn't work yet
// (see src/app/api/support/create/route.ts), so it isn't for sale until that's fixed.
export type PurchasablePlan = "ansokan" | "step1" | "step2";

type PlanPriceConfig = {
  mode: "payment" | "subscription";
  priceIds: string[];
};

export const STRIPE_PLAN_PRICES: Record<PurchasablePlan, PlanPriceConfig> = {
  ansokan: {
    mode: "payment",
    priceIds: ["price_1UAvfeEmbzXQIQUUFB4Uq8XZ"],
  },
  step2: {
    // Klinikklar Drift: 995 kr/mån + 4 995 kr startavgift
    mode: "subscription",
    priceIds: ["price_1UAvgGEmbzXQIQUUQIXzRaIH", "price_1UAvhJEmbzXQIQUUgF0T699U"],
  },
  step1: {
    // Klinikklar Komplett: 995 kr/mån + 19 900 kr startavgift
    mode: "subscription",
    priceIds: ["price_1UAvhnEmbzXQIQUUysqQll3O", "price_1UAvi6EmbzXQIQUURYIHOzLc"],
  },
};

// Klinikklar Premium (step3) prices — created in Stripe, not wired into STRIPE_PLAN_PRICES yet.
// Add "step3" to PurchasablePlan and move these in once "Prioriterad support" actually works
// (src/app/api/support/create/route.ts).
// step3 month: price_1UAvibEmbzXQIQUUfj3XiOcC
// step3 setup fee: price_1UAvizEmbzXQIQUUjQSVKLd8

export function isPurchasablePlan(value: string | null): value is PurchasablePlan {
  return value === "ansokan" || value === "step1" || value === "step2";
}
