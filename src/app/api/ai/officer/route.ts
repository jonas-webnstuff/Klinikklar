import { NextResponse } from "next/server";
import { z } from "zod";
import { generateOfficerAdvice } from "@/lib/ai/generate-officer";

const bodySchema = z.object({
  plan: z.enum(["step1", "step2", "step3"]),
  question: z.string().min(3),
  profile: z
    .object({
      clinicName: z.string().default(""),
      municipality: z.string().default(""),
    })
    .optional(),
  stats: z
    .object({
      incidentsOpen: z.number().int().min(0).default(0),
      risksOpen: z.number().int().min(0).default(0),
      controlsOverdue: z.number().int().min(0).default(0),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    if (payload.plan !== "step3") {
      return NextResponse.json(
        { error: "AI Compliance Officer ingar endast i Klinikklar Premium." },
        { status: 403 }
      );
    }

    const result = await generateOfficerAdvice(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Kunde inte skapa rekommendation fran AI Compliance Officer." },
      { status: 400 }
    );
  }
}
