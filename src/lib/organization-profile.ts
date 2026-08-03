import { z } from "zod";

export const organizationProfileSchema = z.object({
  clinicName: z.string().trim().min(1),
  orgNumber: z.string().trim().min(1),
  address: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  municipality: z.string().trim().min(1),
  email: z.string().trim().email(),
});

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;

const fieldErrorMessages: Record<keyof OrganizationProfileInput, string> = {
  clinicName: "Ange klinikens namn innan du sparar.",
  orgNumber: "Ange organisationsnummer innan du sparar.",
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