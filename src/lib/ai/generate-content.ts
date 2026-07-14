import { z } from "zod";
import type { DocumentKind } from "@/types/domain";

const inputSchema = z.object({
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

export type GenerateContentInput = z.infer<typeof inputSchema>;

function fallbackTemplate(input: GenerateContentInput): string {
  const intro = `Dokumenttyp: ${input.documentKind}\nKlinik: ${input.clinicName}\nKommun: ${input.municipality}`;

  const sections: Record<DocumentKind, string[]> = {
    verksamhetsbeskrivning: [
      `Verksamheten erbjuder: ${input.careScope}.`,
      `Bemanning och roller: ${input.staffing}.`,
      "Målet är en säker, tillgänglig och evidensbaserad tandvård.",
    ],
    ledningssystem: [
      `Kvalitetsuppföljning genomförs enligt följande: ${input.qualityProcess}.`,
      "Roller och ansvar dokumenteras i ett årligt styrdokument.",
      "Avvikelser följs upp med korrigerande och förebyggande åtgärder.",
    ],
    riskanalys: [
      `Identifierad risk kopplad till vårdutbud: ${input.careScope}.`,
      `Planerad åtgärd och resursplan: ${input.staffing}.`,
      "Risker utvärderas kvartalsvis med riskmatris och åtgärdsägare.",
    ],
    avvikelsehantering: [
      `Avvikelser rapporteras enligt rutin: ${input.incidentRoutine}.`,
      "Varje avvikelse klassificeras, åtgärdas och återkopplas i teamet.",
      "Allvarliga händelser eskaleras till verksamhetsansvarig samma dag.",
    ],
    egenkontroll: [
      `Egenkontroll omfattar: ${input.qualityProcess}.`,
      "Checklistor följs upp månadsvis och dokumenteras i kontrolljournal.",
      "Resultat används i förbättringsarbete och intern utbildning.",
    ],
  };

  return [intro, ...sections[input.documentKind]].join("\n\n");
}

export async function generateContent(rawInput: unknown): Promise<string> {
  const input = inputSchema.parse(rawInput);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackTemplate(input);
  }

  const prompt = [
    "Du är en AI-assistent för ledningssystem i privat tandvård i Sverige.",
    "Skriv ett professionellt utkast på svenska i punktform och korta stycken.",
    "Fokusera på praktisk efterlevnad och IVO-relevant struktur men ge inte juridiska garantier.",
    `Dokumenttyp: ${input.documentKind}`,
    `Klinik: ${input.clinicName}`,
    `Kommun: ${input.municipality}`,
    `Vårdutbud: ${input.careScope}`,
    `Kvalitetsarbete: ${input.qualityProcess}`,
    `Bemanning: ${input.staffing}`,
    `Avvikelserutin: ${input.incidentRoutine}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    return fallbackTemplate(input);
  }

  const data = (await response.json()) as {
    output_text?: string;
  };

  return data.output_text?.trim() || fallbackTemplate(input);
}
