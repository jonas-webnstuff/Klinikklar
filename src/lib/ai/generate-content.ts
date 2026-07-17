import { z } from "zod";
import type { DocumentKind } from "@/types/domain";

type PlanLevel = "step1" | "step2" | "step3";

const inputSchema = z.object({
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

export type GenerateContentInput = z.infer<typeof inputSchema>;

const planLabels: Record<PlanLevel, string> = {
  step1: "Klinikklar Start",
  step2: "Klinikklar Drift",
  step3: "Klinikklar Premium",
};

function documentGuidance(kind: DocumentKind): string[] {
  switch (kind) {
    case "verksamhetsbeskrivning":
      return [
        "Beskriv klinikens uppdrag, vårdutbud, målgrupp och övergripande arbetssätt.",
        "Håll tonen saklig och användbar för intern styrning och myndighetsunderlag.",
      ];
    case "ledningssystem":
      return [
        "Beskriv ansvarsfördelning, uppföljning, avvikelsehantering och förbättringsarbete som ett levande system.",
        "Undvik alltför generella formuleringar och nämn konkreta uppföljningsmoment.",
      ];
    case "riskanalys":
      return [
        "Beskriv relevanta risker för privat tandvård, orsaker, konsekvenser och planerade åtgärder.",
        "Använd konkreta exempel från drift, hygien, journalföring eller bemanning när det passar.",
      ];
    case "avvikelsehantering":
      return [
        "Beskriv hur avvikelser rapporteras, utreds, åtgärdas och återkopplas i verksamheten.",
        "Fokusera på lärande, ansvar och dokumentation.",
      ];
    case "egenkontroll":
      return [
        "Beskriv återkommande kontroller, ansvar, frekvens och hur resultat används i förbättringsarbete.",
        "Knyt egenkontrollen till konkreta uppföljningspunkter i vardagen.",
      ];
  }
}

function planDocumentationProcess(plan: PlanLevel): string[] {
  if (plan === "step1") {
    return [
      "Dokumentationsprocess (Start):",
      "- Samla grundkrav och ansvarsfördelning i ett basdokument.",
      "- Uppdatera dokument månadsvis eller vid större förändring.",
      "- Håll version och datum synliga i varje dokument.",
    ];
  }

  if (plan === "step2") {
    return [
      "Dokumentationsprocess (Drift):",
      "- Håll en levande versionslogg för rutiner, risker och avvikelser.",
      "- Ange ansvarig roll, datum och beslut för varje uppdatering.",
      "- Koppla ändringar till uppföljning i årshjul och kontrollpunkter.",
    ];
  }

  return [
    "Dokumentationsprocess (Premium):",
    "- Dokumentera internkontroll med spårbar historik per version.",
    "- Beskriv granskningsflöde: utkast, intern granskning, godkännande.",
    "- Prioritera revisionsberedskap med tydliga evidensreferenser.",
  ];
}

function fallbackTemplate(input: GenerateContentInput): string {
  const intro = [
    `Dokumenttyp: ${input.documentKind}`,
    `Plan: ${planLabels[input.plan]}`,
    `Klinik: ${input.clinicName}`,
    `Kommun: ${input.municipality}`,
  ].join("\n");

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

  return [intro, ...planDocumentationProcess(input.plan), ...sections[input.documentKind]].join(
    "\n\n"
  );
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
    "Anpassa detaljnivå och dokumentationsprocess efter planens mognad.",
    `Plan: ${planLabels[input.plan]} (${input.plan})`,
    ...planDocumentationProcess(input.plan),
    ...documentGuidance(input.documentKind),
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
