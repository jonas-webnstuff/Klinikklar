import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAssistance } from "@/lib/ai/generate-assistance";

const bodySchema = z.object({
  plan: z.enum(["step1", "step2", "step3"]),
  feature: z.enum([
    "risk_analysis",
    "routine",
    "incident_investigation",
    "management_system",
    "controls",
  ]),
  clinicName: z.string().default(""),
  municipality: z.string().default(""),
  careScope: z.string().default(""),
  qualityProcess: z.string().default(""),
  staffing: z.string().default(""),
  incidentRoutine: z.string().default(""),
  currentRisk: z.any().optional(),
  currentRoutine: z.any().optional(),
  currentIncident: z.any().optional(),
  currentManagementSystem: z.any().optional(),
  currentControl: z.any().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    if (payload.plan !== "step3") {
      return NextResponse.json(
        { error: "AI-formulärstöd ingår endast i Klinikklar Premium." },
        { status: 403 }
      );
    }

    const result = await generateAssistance(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Kunde inte skapa AI-förslag." },
      { status: 400 }
    );
  }
}
