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