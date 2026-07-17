import { z } from "zod";

const featureSchema = z.enum([
  "risk_analysis",
  "routine",
  "incident_investigation",
  "management_system",
  "controls",
]);

const inputSchema = z.object({
  plan: z.enum(["step1", "step2", "step3"]),
  feature: featureSchema,
  clinicName: z.string().default(""),
  municipality: z.string().default(""),
  careScope: z.string().default(""),
  qualityProcess: z.string().default(""),
  staffing: z.string().default(""),
  incidentRoutine: z.string().default(""),
  currentRisk: z
    .object({
      title: z.string().default(""),
      description: z.string().default(""),
      probability: z.number().default(3),
      consequence: z.number().default(3),
      ownerRole: z.string().default(""),
      dueDate: z.string().default(""),
    })
    .optional(),
  currentIncident: z
    .object({
      title: z.string().default(""),
      eventDate: z.string().default(""),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      description: z.string().default(""),
      immediateAction: z.string().default(""),
    })
    .optional(),
  currentControl: z
    .object({
      title: z.string().default(""),
      description: z.string().default(""),
      frequency: z.enum(["weekly", "monthly", "quarterly", "yearly", "ad_hoc"]).default("monthly"),
      ownerRole: z.string().default(""),
      nextDueDate: z.string().default(""),
    })
    .optional(),
  currentManagementSystem: z
    .object({
      owner: z.string().default(""),
      processes: z.string().default(""),
      documents: z.string().default(""),
    })
    .optional(),
  currentRoutine: z
    .object({
      area: z.string().default(""),
      changeLog: z.string().default(""),
      owner: z.string().default(""),
      nextReview: z.string().default(""),
    })
    .optional(),
});

const riskOutputSchema = z.object({
  feature: z.literal("risk_analysis"),
  title: z.string(),
  description: z.string(),
  probability: z.number().min(1).max(5),
  consequence: z.number().min(1).max(5),
  ownerRole: z.string(),
  dueDate: z.string(),
});

const routineOutputSchema = z.object({
  feature: z.literal("routine"),
  area: z.string(),
  changeLog: z.string(),
  owner: z.string(),
  nextReview: z.string(),
});

const incidentOutputSchema = z.object({
  feature: z.literal("incident_investigation"),
  description: z.string(),
  immediateAction: z.string(),
});

const managementSystemOutputSchema = z.object({
  feature: z.literal("management_system"),
  owner: z.string(),
  processes: z.string(),
  documents: z.string(),
});

const controlsOutputSchema = z.object({
  feature: z.literal("controls"),
  title: z.string(),
  description: z.string(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly", "ad_hoc"]),
  ownerRole: z.string(),
  nextDueDate: z.string(),
});

const outputSchema = z.discriminatedUnion("feature", [
  riskOutputSchema,
  routineOutputSchema,
  incidentOutputSchema,
  managementSystemOutputSchema,
  controlsOutputSchema,
]);

export type GenerateAssistanceInput = z.infer<typeof inputSchema>;
export type GenerateAssistanceOutput = z.infer<typeof outputSchema>;

function isoDateAfter(days: number) {
  const target = new Date();
  target.setDate(target.getDate() + days);
  return target.toISOString().slice(0, 10);
}

function fallbackOutput(input: GenerateAssistanceInput): GenerateAssistanceOutput {
  switch (input.feature) {
    case "risk_analysis":
      return {
        feature: "risk_analysis",
        title:
          input.currentRisk?.title || `Riskanalys for ${input.careScope || "verksamhetens huvudprocesser"}`,
        description:
          input.currentRisk?.description ||
          `Risk kopplad till ${input.careScope || "vårdutbudet"}. Beskriv sannolika orsaker, konsekvenser för patientsakerhet och vilka kontroller som ska minska risken.`,
        probability: input.currentRisk?.probability || 3,
        consequence: input.currentRisk?.consequence || 4,
        ownerRole: input.currentRisk?.ownerRole || "Verksamhetschef",
        dueDate: input.currentRisk?.dueDate || isoDateAfter(30),
      };
    case "routine":
      return {
        feature: "routine",
        area: input.currentRoutine?.area || "Steril och hygien",
        changeLog:
          input.currentRoutine?.changeLog ||
          "Rutinen uppdateras for att tydliggora ansvar, kontrollpunkter och dokumentation vid avvikelser och egenkontroller.",
        owner: input.currentRoutine?.owner || "Kvalitetsansvarig",
        nextReview: input.currentRoutine?.nextReview || isoDateAfter(90),
      };
    case "incident_investigation":
      return {
        feature: "incident_investigation",
        description:
          input.currentIncident?.description ||
          "Beskriv handelsen kronologiskt, mojliga orsaker, berorda processer och vilken patient- eller kvalitetsrisk som uppstod.",
        immediateAction:
          input.currentIncident?.immediateAction ||
          "Sakra omedelbart patientsakerheten, informera ansvarig roll och starta dokumenterad utredning samma arbetsdag.",
      };
    case "management_system":
      return {
        feature: "management_system",
        owner: input.currentManagementSystem?.owner || "Verksamhetschef",
        processes:
          input.currentManagementSystem?.processes ||
          "Ledningssystemet omfattar patientmottagning, journalforing, hygien, avvikelsehantering, riskuppfoljning och egenkontroll med manadsvis uppfoljning.",
        documents:
          input.currentManagementSystem?.documents ||
          "Styrande dokument inkluderar ledningssystem, hygienrutiner, avvikelseprocess, riskregister, introduktionsmaterial och kontrolljournal.",
      };
    case "controls":
      return {
        feature: "controls",
        title: input.currentControl?.title || "Manadskontroll av hygien och dokumentation",
        description:
          input.currentControl?.description ||
          "Genomfor kontroll av hygienrutiner, journalstickprov och uppfoljning av oppna avvikelser. Dokumentera resultat och ansvarig atgard.",
        frequency: input.currentControl?.frequency || "monthly",
        ownerRole: input.currentControl?.ownerRole || "Kvalitetsansvarig",
        nextDueDate: input.currentControl?.nextDueDate || isoDateAfter(30),
      };
  }
}

function outputInstructions(feature: GenerateAssistanceInput["feature"]) {
  switch (feature) {
    case "risk_analysis":
      return `Returnera enbart JSON med exakt dessa falt: {"feature":"risk_analysis","title":"...","description":"...","probability":1-5,"consequence":1-5,"ownerRole":"...","dueDate":"YYYY-MM-DD"}`;
    case "routine":
      return `Returnera enbart JSON med exakt dessa falt: {"feature":"routine","area":"...","changeLog":"...","owner":"...","nextReview":"YYYY-MM-DD"}`;
    case "incident_investigation":
      return `Returnera enbart JSON med exakt dessa falt: {"feature":"incident_investigation","description":"...","immediateAction":"..."}`;
    case "management_system":
      return `Returnera enbart JSON med exakt dessa falt: {"feature":"management_system","owner":"...","processes":"...","documents":"..."}`;
    case "controls":
      return `Returnera enbart JSON med exakt dessa falt: {"feature":"controls","title":"...","description":"...","frequency":"weekly|monthly|quarterly|yearly|ad_hoc","ownerRole":"...","nextDueDate":"YYYY-MM-DD"}`;
  }
}

function buildPrompt(input: GenerateAssistanceInput) {
  return [
    "Du ar en AI-assistent for svensk privat tandvard och ledningssystem.",
    "Skriv pa svenska med praktiskt fokus. Ge inga juridiska garantier.",
    "Malen ar att forifylla ett formulär i en SaaS-produkt for klinikens kvalitetsarbete.",
    outputInstructions(input.feature),
    `Plan: ${input.plan}`,
    `Klinik: ${input.clinicName}`,
    `Kommun: ${input.municipality}`,
    `Vardutbud: ${input.careScope}`,
    `Kvalitetsarbete: ${input.qualityProcess}`,
    `Bemanning: ${input.staffing}`,
    `Avvikelserutin: ${input.incidentRoutine}`,
    `Nuvarande riskdata: ${JSON.stringify(input.currentRisk || {})}`,
    `Nuvarande rutinutkast: ${JSON.stringify(input.currentRoutine || {})}`,
    `Nuvarande avvikelseutkast: ${JSON.stringify(input.currentIncident || {})}`,
    `Nuvarande ledningssystemutkast: ${JSON.stringify(input.currentManagementSystem || {})}`,
    `Nuvarande kontrollutkast: ${JSON.stringify(input.currentControl || {})}`,
  ].join("\n");
}

function parseJson(text: string) {
  const trimmed = text.trim();
  const withoutFence = trimmed.replace(/^```json\s*|^```\s*|```$/g, "").trim();
  return JSON.parse(withoutFence);
}

export async function generateAssistance(rawInput: unknown): Promise<GenerateAssistanceOutput> {
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
