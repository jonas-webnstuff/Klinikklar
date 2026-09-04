"use client";

import type { PurchasablePlan } from "@/lib/stripe/prices";

const plans: Array<{ id: PurchasablePlan; title: string; price: string }> = [
  { id: "ansokan", title: "Klinikklar Ansökan", price: "9 995 kr engång" },
  { id: "step2", title: "Klinikklar Drift", price: "4 995 kr start + 995 kr/mån" },
  { id: "step1", title: "Klinikklar Komplett", price: "19 900 kr start + 995 kr/mån" },
];

// Only the differences that actually decide which plan someone needs — full feature lists
// already exist on the pricing section of the startsida, no need to repeat them here.
const rows: Array<{ label: string; values: Record<PurchasablePlan, string> }> = [
  {
    label: "Hjälp med IVO-ansökan",
    values: { ansokan: "Ja", step2: "Nej", step1: "Ja" },
  },
  {
    label: "Löpande ledningssystem",
    values: { ansokan: "Nej", step2: "Ja", step1: "Ja" },
  },
];

type Props = {
  selected: PurchasablePlan | null;
  onSelect: (plan: PurchasablePlan) => void;
};

export function PlanComparisonPicker({ selected, onSelect }: Props) {
  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-[color:var(--line)] bg-white">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-40 p-3" />
            {plans.map((plan) => (
              <th key={plan.id} className="p-3 text-left align-top">
                <button
                  type="button"
                  onClick={() => onSelect(plan.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                    selected === plan.id
                      ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                      : "border-[color:var(--line)] text-[color:var(--ink)] hover:border-[color:var(--brand)]"
                  }`}
                >
                  {plan.title}
                  <span className="mt-1 block text-xs font-normal text-[color:var(--muted)]">
                    {plan.price}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-[color:var(--line)]">
              <td className="p-3 text-xs font-semibold text-[color:var(--muted)]">{row.label}</td>
              {plans.map((plan) => (
                <td key={plan.id} className="p-3 text-[color:var(--ink)]">
                  {row.values[plan.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
