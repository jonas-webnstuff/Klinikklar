import { NextResponse } from "next/server";
import { z } from "zod";
import { generateContent } from "@/lib/ai/generate-content";
import { complianceRequirements } from "@/lib/requirements";

const planRank = {
  step1: 1,
  step2: 2,
  step3: 3,
} as const;

const planLabels = {
  step1: "Klinikklar Komplett",
  step2: "Klinikklar Drift",
  step3: "Klinikklar Premium",
} as const;

const bodySchema = z.object({
  plan: z.enum(["step1", "step2", "step3"]),
  clinicName: z.string().min(1),
  municipality: z.string().min(1),
  careScope: z.string().min(1),
  qualityProcess: z.string().min(1),
  staffing: z.string().min(1),
  incidentRoutine: z.string().min(1),
  documentKind: z.enum([
    "verksamhetsbeskrivning",
    "ledningssystem",
    "riskanalys",
    "avvikelsehantering",
    "egenkontroll",
  ]),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    const requirement = complianceRequirements.find(
      (item) => item.documentKind === payload.documentKind
    );

    if (requirement && planRank[payload.plan] < planRank[requirement.availableFrom]) {
      return NextResponse.json(
        {
          error: `Dokumentet ingår från nivån ${planLabels[requirement.availableFrom]}.`,
        },
        { status: 403 }
      );
    }

    const content = await generateContent(payload);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json(
      { error: "Kunde inte generera dokumentinnehåll" },
      { status: 400 }
    );
  }
}
