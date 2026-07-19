import { z } from "zod";

const inputSchema = z.object({
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

const outputSchema = z.object({
  answer: z.string(),
  priorities: z.array(z.string()).max(5),
});

export type GenerateOfficerInput = z.infer<typeof inputSchema>;
export type GenerateOfficerOutput = z.infer<typeof outputSchema>;

function fallbackOutput(input: GenerateOfficerInput): GenerateOfficerOutput {
  const incidentsOpen = input.stats?.incidentsOpen || 0;
  const risksOpen = input.stats?.risksOpen || 0;
  const controlsOverdue = input.stats?.controlsOverdue || 0;

  const priorities: string[] = [];

  if (incidentsOpen > 0) {
    priorities.push("Stang eller eskalera oppna avvikelser med hogst allvarlighetsgrad forst.");
  }

  if (risksOpen > 0) {
    priorities.push("Sakra att alla oppna risker har ansvarig roll, deadline och uppdaterad status.");
  }

  if (controlsOverdue > 0) {
    priorities.push("Planera om forsenade kontroller och dokumentera atgard i internkontrollen.");
  }

  if (priorities.length === 0) {
    priorities.push("Genomfor en manadskontroll av ledningssystem, riskregister och avvikelseloggen.");
  }

  return {
    answer:
      "Fokusera pa konkreta atgarder i prioritetsordning, dokumentera vem som ager varje aktivitet och satt nasta uppfoljningsdatum.",
    priorities,
  };
}

function buildPrompt(input: GenerateOfficerInput) {
  return [
    "Du ar en AI Compliance Officer for en svensk tandvardsklinik med 1-10 medarbetare.",
    "Svara pa svenska, kortfattat och praktiskt.",
    "Ge inga juridiska garantier eller overdrivna formuleringar.",
    "Returnera ENDAST JSON med formatet: {\"answer\":\"...\",\"priorities\":[\"...\"]}.",
    `Klinik: ${input.profile?.clinicName || "Ej angivet"}`,
    `Kommun: ${input.profile?.municipality || "Ej angivet"}`,
    `Oppna avvikelser: ${input.stats?.incidentsOpen ?? 0}`,
    `Oppna risker: ${input.stats?.risksOpen ?? 0}`,
    `Forsenade kontroller: ${input.stats?.controlsOverdue ?? 0}`,
    `Fraga: ${input.question}`,
  ].join("\n");
}

function parseJson(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed.replace(/^```json\s*|^```\s*|```$/g, "").trim();
  return JSON.parse(withoutFence);
}

export async function generateOfficerAdvice(rawInput: unknown): Promise<GenerateOfficerOutput> {
  const input = inputSchema.parse(rawInput);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackOutput(input);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: buildPrompt(input),
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return fallbackOutput(input);
  }

  const data = (await response.json()) as { output_text?: string };

  if (!data.output_text?.trim()) {
    return fallbackOutput(input);
  }

  try {
    return outputSchema.parse(parseJson(data.output_text));
  } catch {
    return fallbackOutput(input);
  }
}
