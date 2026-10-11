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
    priceIds: ["price_1UPQonRBRRb7RNjZ58HZKJgE"],
  },
  step2: {
    // Klinikklar Drift: månad + startavgift
    mode: "subscription",
    priceIds: ["price_1UPQomRBRRb7RNjZpqXQIv7A", "price_1UPQomRBRRb7RNjZkHY7QG0f"],
  },
  step1: {
    // Klinikklar Komplett: månad + startavgift
    mode: "subscription",
    priceIds: ["price_1UPQojRBRRb7RNjZuX9Z8p78", "price_1UPQojRBRRb7RNjZdJWm2Ybk"],
  },
};

// Klinikklar Premium (step3) prices — created in Stripe, not wired into STRIPE_PLAN_PRICES yet.
// Add "step3" to PurchasablePlan and move these in once "Prioriterad support" actually works
// (src/app/api/support/create/route.ts).
// step3 month: price_1UPQofRBRRb7RNjZxmb20mz5
// step3 setup fee: price_1UPQofRBRRb7RNjZDzNKFSxS

export function isPurchasablePlan(value: string | null): value is PurchasablePlan {
  return value === "ansokan" || value === "step1" || value === "step2";
}
