import { z } from "zod";

const featureSchema = z.enum([
  "risk_analysis",
  "routine",
  "incident_investigation",
  "management_system",
  "controls",
  "regulation_watch",
  "revision_readiness",
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
  currentRegulationWatch: z
    .object({
      title: z.string().default(""),
      source: z.string().default(""),
      effectiveDate: z.string().default(""),
      impact: z.enum(["low", "medium", "high"]).default("medium"),
      recommendedAction: z.string().default(""),
    })
    .optional(),
  currentRevisionReadiness: z
    .object({
      missingLedningssystem: z.array(z.string()).default([]),
      openRisks: z.number().default(0),
      highPriorityRisks: z.number().default(0),
      openIncidents: z.number().default(0),
      overdueControls: z.number().default(0),
      revisionPercent: z.number().default(0),
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

const regulationWatchOutputSchema = z.object({
  feature: z.literal("regulation_watch"),
  impact: z.enum(["low", "medium", "high"]),
  recommendedAction: z.string(),
});

const revisionReadinessOutputSchema = z.object({
  feature: z.literal("revision_readiness"),
  focus: z.string(),
  evidenceList: z.string(),
  nextReviewDate: z.string(),
});

const outputSchema = z.discriminatedUnion("feature", [
  riskOutputSchema,
  routineOutputSchema,
  incidentOutputSchema,
  managementSystemOutputSchema,
  controlsOutputSchema,
  regulationWatchOutputSchema,
  revisionReadinessOutputSchema,
]);

export type GenerateAssistanceInput = z.infer<typeof inputSchema>;
export type GenerateAssistanceOutput = z.infer<typeof outputSchema>;

function planContext(plan: GenerateAssistanceInput["plan"]) {
  if (plan === "step1") {
    return "Basnivå: håll förslagen enkla, tydliga och realistiska för en nystartad klinik.";
  }

  if (plan === "step2") {
    return "Driftnivå: fokusera på löpande uppföljning, ansvar och återkommande kontroller i vardagen.";
  }

  return "Premiumnivå: inkludera tydlig spårbarhet, ansvarsfördelning, uppföljning och revisionsberedskap.";
}

function featureGuidance(feature: GenerateAssistanceInput["feature"]) {
  switch (feature) {
    case "risk_analysis":
      return [
        "Utgå från konkreta risker i tandvård, till exempel sterilhantering, journalföring, delegering, läkemedel, röntgen eller bemanningsbrist.",
        "Beskriv risk, möjlig orsak, möjlig konsekvens och vad som praktiskt bör följas upp.",
        "Välj sannolikhet och konsekvens på en rimlig nivå, inte alltid högsta värden.",
      ].join(" ");
    case "routine":
      return [
        "Formulera en faktisk rutinuppdatering, inte marknadstext.",
        "Beskriv vilket område som ändras, varför rutinen uppdateras och hur uppföljning ska ske.",
        "Föreslå en ansvarig roll som känns realistisk för en privat tandvårdsklinik.",
      ].join(" ");
    case "incident_investigation":
      return [
        "Skriv som en saklig intern utredning efter en avvikelse.",
        "Beskriv händelse, troliga orsaker, påverkan på patient eller verksamhet och direkt åtgärd.",
        "Undvik överdrifter och skriv inte att något är lagkrav om det inte uttryckligen framgår.",
      ].join(" ");
    case "management_system":
      return [
        "Beskriv ledningssystemet som ett levande arbetssätt, inte bara ett dokument.",
        "Ta med huvudprocesser som patientmottagning, hygien, journalföring, avvikelsehantering, riskanalys och egenkontroll.",
        "Nämn styrande dokument som faktiskt brukar finnas i mindre vårdverksamheter.",
      ].join(" ");
    case "controls":
      return [
        "Föreslå en konkret kontrollpunkt som faktiskt går att utföra och följa upp i årshjulet.",
        "Knyt kontrollen till hygien, journalgranskning, avvikelser, kompetens eller utrustning.",
        "Välj rimlig frekvens och ge en tydlig beskrivning av vad som ska kontrolleras.",
      ].join(" ");
    case "regulation_watch":
      return [
        "Bedöm påverkan av en regeländring för privat tandvård i praktiken.",
        "Ge en konkret rekommenderad åtgärd med tydlig ansvarspunkt och tidsram.",
        "Välj påverkan low, medium eller high baserat på patientsäkerhet och driftpåverkan.",
      ].join(" ");
    case "revision_readiness":
      return [
        "Prioritera revisionsberedskap med fokus på underlag som ofta efterfrågas.",
        "Skapa en kort evidenslista som är möjlig att samla under nästa period.",
        "Sätt ett realistiskt nästa datum för intern revisionsöversyn.",
      ].join(" ");
  }
}

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
          input.currentRisk?.title || `Riskanalys för ${input.careScope || "verksamhetens huvudprocesser"}`,
        description:
          input.currentRisk?.description ||
          `Risk kopplad till ${input.careScope || "vårdutbudet"}. Beskriv troliga orsaker, konsekvenser för patientsäkerheten samt vilka förebyggande kontroller och uppföljningar som ska minska risken över tid.`,
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
          "Rutinen uppdateras för att tydliggöra ansvar, kontrollpunkter och dokumentation vid avvikelser, egenkontroller och återkommande uppföljning.",
        owner: input.currentRoutine?.owner || "Kvalitetsansvarig",
        nextReview: input.currentRoutine?.nextReview || isoDateAfter(90),
      };
    case "incident_investigation":
      return {
        feature: "incident_investigation",
        description:
          input.currentIncident?.description ||
          "Beskriv händelsen kronologiskt, möjliga orsaker, berörda processer, eventuell påverkan på patient eller arbetsflöde samt vad som behöver följas upp vidare.",
        immediateAction:
          input.currentIncident?.immediateAction ||
          "Säkra omedelbart patientsäkerheten, informera ansvarig roll, dokumentera initial bedömning och starta utredning samma arbetsdag.",
      };
    case "management_system":
      return {
        feature: "management_system",
        owner: input.currentManagementSystem?.owner || "Verksamhetschef",
        processes:
          input.currentManagementSystem?.processes ||
          "Ledningssystemet omfattar patientmottagning, journalföring, hygien, avvikelsehantering, riskuppföljning, bemanning och egenkontroll med månadsvis uppföljning i ledningsmöte.",
        documents:
          input.currentManagementSystem?.documents ||
          "Styrande dokument inkluderar ledningssystem, hygienrutiner, avvikelseprocess, riskregister, introduktionsmaterial, delegeringsrutiner och kontrolljournal.",
      };
    case "controls":
      return {
        feature: "controls",
        title: input.currentControl?.title || "Månadskontroll av hygien och dokumentation",
        description:
          input.currentControl?.description ||
          "Genomför kontroll av hygienrutiner, journalstickprov och uppföljning av öppna avvikelser. Dokumentera resultat, avvikelser och beslutad åtgärd.",
        frequency: input.currentControl?.frequency || "monthly",
        ownerRole: input.currentControl?.ownerRole || "Kvalitetsansvarig",
        nextDueDate: input.currentControl?.nextDueDate || isoDateAfter(30),
      };
    case "regulation_watch": {
      const elevatedSignals =
        (input.currentRevisionReadiness?.highPriorityRisks || 0) +
          (input.currentRevisionReadiness?.overdueControls || 0) >
        2;

      return {
        feature: "regulation_watch",
        impact: elevatedSignals ? "high" : input.currentRegulationWatch?.impact || "medium",
        recommendedAction:
          input.currentRegulationWatch?.recommendedAction ||
          "Gör en snabb gap-analys mot berörda rutiner, uppdatera styrande dokument och planera intern information inom 30 dagar.",
      };
    }
    case "revision_readiness":
      return {
        feature: "revision_readiness",
        focus:
          "Säkra spårbarhet mellan risker, avvikelser, kontroller och beslut i ledningssystemet.",
        evidenceList:
          "- Uppdaterad versionslogg\n- Senaste riskgenomgång\n- Avvikelselogg med åtgärdsstatus\n- Genomförda kontroller i årshjul",
        nextReviewDate: isoDateAfter(30),
      };
  }
}

function outputInstructions(feature: GenerateAssistanceInput["feature"]) {
  switch (feature) {
    case "risk_analysis":
      return `Returnera enbart JSON med exakt dessa fält: {"feature":"risk_analysis","title":"...","description":"...","probability":1-5,"consequence":1-5,"ownerRole":"...","dueDate":"YYYY-MM-DD"}`;
    case "routine":
      return `Returnera enbart JSON med exakt dessa fält: {"feature":"routine","area":"...","changeLog":"...","owner":"...","nextReview":"YYYY-MM-DD"}`;
    case "incident_investigation":
      return `Returnera enbart JSON med exakt dessa fält: {"feature":"incident_investigation","description":"...","immediateAction":"..."}`;
    case "management_system":
      return `Returnera enbart JSON med exakt dessa fält: {"feature":"management_system","owner":"...","processes":"...","documents":"..."}`;
    case "controls":
      return `Returnera enbart JSON med exakt dessa fält: {"feature":"controls","title":"...","description":"...","frequency":"weekly|monthly|quarterly|yearly|ad_hoc","ownerRole":"...","nextDueDate":"YYYY-MM-DD"}`;
    case "regulation_watch":
      return `Returnera enbart JSON med exakt dessa fält: {"feature":"regulation_watch","impact":"low|medium|high","recommendedAction":"..."}`;
    case "revision_readiness":
      return `Returnera enbart JSON med exakt dessa fält: {"feature":"revision_readiness","focus":"...","evidenceList":"...","nextReviewDate":"YYYY-MM-DD"}`;
  }
}

function buildPrompt(input: GenerateAssistanceInput) {
  return [
    "Du är en AI-assistent för svensk privat tandvård och ledningssystem.",
    "Skriv på svenska med praktiskt fokus. Ge inga juridiska garantier.",
    "Målet är att förifylla ett formulär i en SaaS-produkt för klinikens kvalitetsarbete.",
    planContext(input.plan),
    featureGuidance(input.feature),
    outputInstructions(input.feature),
    `Plan: ${input.plan}`,
    `Klinik: ${input.clinicName}`,
    `Kommun: ${input.municipality}`,
    `Vårdutbud: ${input.careScope}`,
    `Kvalitetsarbete: ${input.qualityProcess}`,
    `Bemanning: ${input.staffing}`,
    `Avvikelserutin: ${input.incidentRoutine}`,
    `Nuvarande riskdata: ${JSON.stringify(input.currentRisk || {})}`,
    `Nuvarande rutinutkast: ${JSON.stringify(input.currentRoutine || {})}`,
    `Nuvarande avvikelseutkast: ${JSON.stringify(input.currentIncident || {})}`,
    `Nuvarande ledningssystemutkast: ${JSON.stringify(input.currentManagementSystem || {})}`,
    `Nuvarande regelbevakning: ${JSON.stringify(input.currentRegulationWatch || {})}`,
    `Nuvarande revisionsberedskap: ${JSON.stringify(input.currentRevisionReadiness || {})}`,
    `Nuvarande kontrollutkast: ${JSON.stringify(input.currentControl || {})}`,
    "Om befintliga fält redan innehåller relevant information ska du bygga vidare på den i stället för att byta ämne.",
    "Ge konkreta, trovärdiga och kortfattade formuleringar som en klinik faktiskt kan använda direkt i sitt arbete.",
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
