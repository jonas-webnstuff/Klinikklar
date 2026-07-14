import { NextResponse } from "next/server";
import { z } from "zod";
import { generateContent } from "@/lib/ai/generate-content";

const bodySchema = z.object({
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
    const content = await generateContent(payload);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json(
      { error: "Kunde inte generera dokumentinnehåll" },
      { status: 400 }
    );
  }
}
