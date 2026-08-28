import { z } from "zod";

// Validates format + Luhn checksum only (same checksum algorithm Skatteverket uses for both
// organisationsnummer and personnummer) — no register lookup, so no per-lookup cost. Deliberately
// accepts personnummer-shaped numbers too: an enskild firma's organisationsnummer *is* its
// owner's personnummer, so we can't require the "group digit >= 2" rule that only holds for
// aktiebolag/handelsbolag.
function isValidSwedishOrgNumber(value: string): boolean {
  if (!/^\d{6}-?\d{4}$/.test(value)) return false;

  const digits = value.replace("-", "");
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let digit = Number(digits[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const organizationProfileSchema = z.object({
  clinicName: z.string().trim().min(1),
  orgNumber: z.string().trim().refine(isValidSwedishOrgNumber),
  address: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  municipality: z.string().trim().min(1),
  email: z.string().trim().email(),
});

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;

const fieldErrorMessages: Record<keyof OrganizationProfileInput, string> = {
  clinicName: "Ange klinikens namn innan du sparar.",
  orgNumber: "Ange ett giltigt organisationsnummer, t.ex. 556677-8899.",
  address: "Ange besöksadress innan du sparar.",
  postalCode: "Ange postnummer innan du sparar.",
  municipality: "Ange ort innan du sparar.",
  email: "Ange en giltig e-postadress innan du sparar.",
};

export function getOrganizationProfileError(profile: OrganizationProfileInput): string | null {
  const result = organizationProfileSchema.safeParse(profile);

  if (result.success) {
    return null;
  }

  const field = result.error.issues[0]?.path[0] as keyof OrganizationProfileInput | undefined;
  return (field && fieldErrorMessages[field]) || "Kontrollera grunduppgifterna innan du sparar.";
}