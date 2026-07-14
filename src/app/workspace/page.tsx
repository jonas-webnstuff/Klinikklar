"use client";

import { useEffect, useMemo, useState } from "react";
import { complianceRequirements, questionnaireItems } from "@/lib/requirements";
import type {
  ControlTaskFrequency,
  ControlTaskStatus,
  DocumentKind,
  IncidentSeverity,
  IncidentStatus,
  RiskStatus,
} from "@/types/domain";

type ProfileState = {
  clinicName: string;
  orgNumber: string;
  municipality: string;
  email: string;
};

type AnswersState = Record<string, { answer: string; followUpAnswer: string }>;

type GeneratedState = Partial<
  Record<
    DocumentKind,
    {
      content: string;
      approved: boolean;
      isLoading: boolean;
    }
  >
>;

type HelpEntry = {
  id: string;
  label: string;
  helpDescription: string;
  helpChecklist: string[];
  helpExample: string;
  ivoSectionTitle: string;
  ivoUrl: string;
};

type PlanLevel = "step1" | "step2" | "step3";

type IncidentItem = {
  id: string;
  title: string;
  eventDate: string;
  severity: IncidentSeverity;
  description: string;
  immediateAction?: string | null;
  status: IncidentStatus;
  createdAt: string;
};

type IncidentFormState = {
  title: string;
  eventDate: string;
  severity: IncidentSeverity;
  description: string;
  immediateAction: string;
};

type RiskItem = {
  id: string;
  title: string;
  description: string;
  probability: number;
  consequence: number;
  status: RiskStatus;
  ownerRole?: string | null;
  dueDate?: string | null;
  createdAt: string;
};

type RiskFormState = {
  title: string;
  description: string;
  probability: number;
  consequence: number;
  ownerRole: string;
  dueDate: string;
};

type ControlItem = {
  id: string;
  title: string;
  description?: string | null;
  frequency: ControlTaskFrequency;
  ownerRole?: string | null;
  nextDueDate?: string | null;
  status: ControlTaskStatus;
  lastCompletedAt?: string | null;
  createdAt: string;
};

type ControlFormState = {
  title: string;
  description: string;
  frequency: ControlTaskFrequency;
  ownerRole: string;
  nextDueDate: string;
};

const planLabels: Record<PlanLevel, string> = {
  step1: "Klinikklar Start",
  step2: "Klinikklar Drift",
  step3: "Klinikklar Premium",
};

const planFeatureMap: Record<PlanLevel, string[]> = {
  step1: ["IVO", "Ledningssystem", "Dokument", "AI", "Checklistor", "Support"],
  step2: ["Uppdateringar", "Avvikelser", "Rutiner", "Riskanalyser", "Årshjul"],
  step3: ["AI Compliance Officer", "Regelbevakning", "AI-förslag", "Revision", "Internkontroll"],
};

const planAccessRank: Record<PlanLevel, number> = {
  step1: 1,
  step2: 2,
  step3: 3,
};

const initialProfile: ProfileState = {
  clinicName: "",
  orgNumber: "",
  municipality: "",
  email: "",
};

const initialAnswers: AnswersState = Object.fromEntries(
  questionnaireItems.map((item) => [item.key, { answer: "", followUpAnswer: "" }])
);

const initialIncidentForm: IncidentFormState = {
  title: "",
  eventDate: new Date().toISOString().slice(0, 10),
  severity: "medium",
  description: "",
  immediateAction: "",
};

const initialRiskForm: RiskFormState = {
  title: "",
  description: "",
  probability: 3,
  consequence: 3,
  ownerRole: "",
  dueDate: "",
};

const initialControlForm: ControlFormState = {
  title: "",
  description: "",
  frequency: "monthly",
  ownerRole: "",
  nextDueDate: "",
};

const clinicProfileHelp: HelpEntry[] = [
  {
    id: "clinicName",
    label: "Klinikens namn",
    helpDescription:
      "Ange det namn verksamheten använder utåt och i ansökningsunderlaget. Namnet ska vara konsekvent i alla dokument och enkelt att koppla till ansvarig organisation.",
    helpChecklist: [
      "Använd samma namn som i avtal, dokumentmallar och extern kommunikation.",
      "Undvik interna arbetsnamn om verksamheten presenteras under annat namn utåt.",
    ],
    helpExample: "Klinikklar Tandvård AB, Klinik Vasastan",
    ivoSectionTitle: "IVO: tillstånd för privat tandvård",
    ivoUrl: "https://www.ivo.se/vard-omsorgsgivare/tillstand/privat-tandvard/",
  },
  {
    id: "orgNumber",
    label: "Organisationsnummer",
    helpDescription:
      "Ange det juridiska organisationsnumret för den aktör som ska bedriva vårdverksamheten. Det används för att koppla ansvar, tillstånd och framtida dokumentation till rätt bolag eller enskild firma.",
    helpChecklist: [
      "Ange numret för den juridiska person som ska stå som vårdgivare.",
      "Säkerställ att samma organisationsnummer används i alla tillhörande underlag.",
    ],
    helpExample: "559123-4567",
    ivoSectionTitle: "IVO: tillstånd för privat tandvård",
    ivoUrl: "https://www.ivo.se/vard-omsorgsgivare/tillstand/privat-tandvard/",
  },
  {
    id: "municipality",
    label: "Kommun",
    helpDescription:
      "Ange vilken kommun verksamhetsstället tillhör. Det hjälper till att tydliggöra var verksamheten ska bedrivas och används ofta tillsammans med adressuppgifter i underlagen.",
    helpChecklist: [
      "Ange den kommun där kliniken faktiskt ska bedriva verksamheten.",
      "Om flera verksamhetsställen finns bör varje plats kunna särskiljas senare.",
    ],
    helpExample: "Stockholm",
    ivoSectionTitle: "IVO: tillstånd för privat tandvård",
    ivoUrl: "https://www.ivo.se/vard-omsorgsgivare/tillstand/privat-tandvard/",
  },
  {
    id: "email",
    label: "E-post",
    helpDescription:
      "Ange en e-postadress som används för kontakt i ansöknings- och uppföljningsärenden. Den bör vara långsiktigt bevakad av verksamheten eller ansvarig person.",
    helpChecklist: [
      "Använd en adress som bevakas regelbundet och inte är knuten till tillfällig personal.",
      "Om möjligt, använd en funktionsbrevlåda för compliance eller verksamhetskontakt.",
    ],
    helpExample: "kontakt@klinikklar-tandvard.se",
    ivoSectionTitle: "IVO: tillstånd för privat tandvård",
    ivoUrl: "https://www.ivo.se/vard-omsorgsgivare/tillstand/privat-tandvard/",
  },
];

const ledningssystemModules = [
  {
    key: "management_system",
    title: "Ledningssystem",
    availableFrom: "step1" as PlanLevel,
    cadence: "Månatlig uppföljning",
    description: "Ansvar, processer och styrande dokument hålls uppdaterade.",
  },
  {
    key: "routine_updates",
    title: "Rutiner och uppdateringar",
    availableFrom: "step2" as PlanLevel,
    cadence: "Löpande",
    description: "Versionera rutiner och förändringar i driftarbetet.",
  },
  {
    key: "incident_management",
    title: "Avvikelsehantering",
    availableFrom: "step2" as PlanLevel,
    cadence: "Löpande",
    description: "Registrera händelser, åtgärder och återkoppling till teamet.",
  },
  {
    key: "risk_register",
    title: "Riskanalyser",
    availableFrom: "step2" as PlanLevel,
    cadence: "Kvartalsvis genomgång",
    description: "Följ risknivå, åtgärdsägare och status över tid.",
  },
  {
    key: "year_wheel",
    title: "Årshjul",
    availableFrom: "step2" as PlanLevel,
    cadence: "Planering per period",
    description: "Schemalägg kontroller, genomgångar och uppföljning över året.",
  },
  {
    key: "self_monitoring",
    title: "Internkontroll",
    availableFrom: "step3" as PlanLevel,
    cadence: "Vecko- och månadspunkter",
    description: "Planera och stäng kontroller med tydliga deadlines.",
  },
  {
    key: "ai_officer",
    title: "AI Compliance Officer",
    availableFrom: "step3" as PlanLevel,
    cadence: "Löpande assistans",
    description: "Få AI-stöd för prioritering, dokumentgranskning och nästa steg.",
  },
  {
    key: "ai_suggestions",
    title: "AI-förslag",
    availableFrom: "step3" as PlanLevel,
    cadence: "Efter varje uppdatering",
    description: "Förslag på åtgärder utifrån risker, avvikelser och uppföljning.",
  },
  {
    key: "revision_readiness",
    title: "Revision",
    availableFrom: "step3" as PlanLevel,
    cadence: "Införsyn + intern revision",
    description: "Samla underlag och kontrollpunkter för intern och extern granskning.",
  },
  {
    key: "regulation_watch",
    title: "Regelbevakning (AI)",
    availableFrom: "step3" as PlanLevel,
    cadence: "Löpande monitorering",
    description: "Identifiera förändringar i kravbild och få prioriterade åtgärdsförslag.",
  },
];

export default function WorkspacePage() {
  const [activePlan, setActivePlan] = useState<PlanLevel>("step2");

  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [answers, setAnswers] = useState<AnswersState>(initialAnswers);
  const [generated, setGenerated] = useState<GeneratedState>({});
  const [openHelpKey, setOpenHelpKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [hasHydratedWorkspace, setHasHydratedWorkspace] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<string>("");
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [incidentForm, setIncidentForm] = useState<IncidentFormState>(initialIncidentForm);
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);
  const [isIncidentSubmitting, setIsIncidentSubmitting] = useState(false);
  const [incidentMessage, setIncidentMessage] = useState("");
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [riskForm, setRiskForm] = useState<RiskFormState>(initialRiskForm);
  const [isRisksLoading, setIsRisksLoading] = useState(false);
  const [isRiskSubmitting, setIsRiskSubmitting] = useState(false);
  const [riskMessage, setRiskMessage] = useState("");
  const [controls, setControls] = useState<ControlItem[]>([]);
  const [controlForm, setControlForm] = useState<ControlFormState>(initialControlForm);
  const [isControlsLoading, setIsControlsLoading] = useState(false);
  const [isControlSubmitting, setIsControlSubmitting] = useState(false);
  const [controlMessage, setControlMessage] = useState("");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const plan = query.get("plan");

    if (plan === "step1" || plan === "step2" || plan === "step3") {
      setActivePlan(plan);
    }
  }, []);

  const helpEntries: HelpEntry[] = [
    ...clinicProfileHelp,
    ...questionnaireItems.map((item) => ({
      id: item.key,
      label: item.label,
      helpDescription: item.helpDescription,
      helpChecklist: item.helpChecklist,
      helpExample: item.helpExample,
      ivoSectionTitle: item.ivoSectionTitle,
      ivoUrl: item.ivoUrl,
    })),
  ];

  const activeHelpItem = helpEntries.find((item) => item.id === openHelpKey) || null;

  useEffect(() => {
    if (!openHelpKey) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenHelpKey(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openHelpKey]);

  useEffect(() => {
    if (hasHydratedWorkspace) {
      return;
    }

    let isCancelled = false;

    async function hydrateWorkspace() {
      setIsLoadingWorkspace(true);

      const response = await fetch("/api/workspace/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (isCancelled) {
        return;
      }

      setIsLoadingWorkspace(false);
      setHasHydratedWorkspace(true);

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        found: boolean;
        profile?: ProfileState;
        answers?: AnswersState;
      };

      if (!data.found) {
        return;
      }

      if (data.profile) {
        setProfile(data.profile);
      }

      if (data.answers) {
        setAnswers((prev) => ({
          ...prev,
          ...data.answers,
        }));
      }

      setWorkspaceMessage("Tidigare sparade uppgifter hämtade.");
    }

    hydrateWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [hasHydratedWorkspace]);

  const completionMap = useMemo(() => {
    const result = new Map<string, boolean>();

    for (const requirement of complianceRequirements) {
      const mappedItems = questionnaireItems.filter((q) =>
        q.mapsToRequirements.includes(requirement.code)
      );

      const done = mappedItems.every((item) => {
        const answer = answers[item.key];
        return Boolean(answer?.answer?.trim());
      });

      result.set(requirement.code, done);
    }

    return result;
  }, [answers]);

  const totalRequirements = complianceRequirements.length;
  const completeRequirements = Array.from(completionMap.values()).filter(Boolean).length;
  const progressPercent = Math.round((completeRequirements / totalRequirements) * 100);

  const availableModules = ledningssystemModules.filter(
    (module) => planAccessRank[module.availableFrom] <= planAccessRank[activePlan]
  );

  const activePlanFeatures = useMemo(() => {
    const orderedPlans: PlanLevel[] = ["step1", "step2", "step3"];

    return orderedPlans
      .filter((plan) => planAccessRank[plan] <= planAccessRank[activePlan])
      .flatMap((plan) => planFeatureMap[plan]);
  }, [activePlan]);

  const hasPlanAccess = (requiredPlan: PlanLevel) =>
    planAccessRank[activePlan] >= planAccessRank[requiredPlan];

  const canUseIncidentModule = hasPlanAccess("step2");
  const canUseRiskModule = hasPlanAccess("step2");
  const canUseControlModule = hasPlanAccess("step2");

  const incidentSummary = useMemo(() => {
    const summary = {
      total: incidents.length,
      open: 0,
      investigating: 0,
      closed: 0,
      criticalOrHigh: 0,
    };

    for (const incident of incidents) {
      if (incident.status === "new") {
        summary.open += 1;
      } else if (incident.status === "investigating") {
        summary.investigating += 1;
      } else if (incident.status === "closed") {
        summary.closed += 1;
      }

      if (incident.severity === "high" || incident.severity === "critical") {
        summary.criticalOrHigh += 1;
      }
    }

    return summary;
  }, [incidents]);

  const riskSummary = useMemo(() => {
    const summary = {
      total: risks.length,
      open: 0,
      mitigating: 0,
      closed: 0,
      highPriority: 0,
    };

    for (const risk of risks) {
      if (risk.status === "open") {
        summary.open += 1;
      } else if (risk.status === "mitigating") {
        summary.mitigating += 1;
      } else if (risk.status === "closed") {
        summary.closed += 1;
      }

      if (risk.probability * risk.consequence >= 15) {
        summary.highPriority += 1;
      }
    }

    return summary;
  }, [risks]);

  const controlSummary = useMemo(() => {
    const summary = {
      total: controls.length,
      pending: 0,
      done: 0,
      overdue: 0,
      skipped: 0,
    };

    for (const control of controls) {
      if (control.status === "pending") {
        summary.pending += 1;
      } else if (control.status === "done") {
        summary.done += 1;
      } else if (control.status === "overdue") {
        summary.overdue += 1;
      } else if (control.status === "skipped") {
        summary.skipped += 1;
      }
    }

    return summary;
  }, [controls]);

  const canGenerate =
    profile.clinicName.trim() &&
    profile.municipality.trim() &&
    answers.care_scope?.answer.trim() &&
    answers.quality_process?.answer.trim() &&
    answers.staffing?.answer.trim() &&
    answers.incident_routine?.answer.trim();

  async function loadIncidents() {
    if (!canUseIncidentModule) {
      return;
    }

    setIsIncidentsLoading(true);

    const response = await fetch("/api/incidents/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setIsIncidentsLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setIncidentMessage(data.error || "Kunde inte hämta avvikelser.");
      return;
    }

    const data = (await response.json()) as { incidents: IncidentItem[] };
    setIncidents(data.incidents || []);
  }

  async function createIncident() {
    if (!canUseIncidentModule) {
      return;
    }

    if (!incidentForm.title.trim() || !incidentForm.description.trim()) {
      setIncidentMessage("Ange rubrik och beskrivning för avvikelsen.");
      return;
    }

    setIsIncidentSubmitting(true);
    setIncidentMessage("");

    const response = await fetch("/api/incidents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incidentForm),
    });

    setIsIncidentSubmitting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setIncidentMessage(data.error || "Kunde inte skapa avvikelse.");
      return;
    }

    setIncidentForm((prev) => ({ ...initialIncidentForm, eventDate: prev.eventDate }));
    setIncidentMessage("Avvikelse skapad.");
    await loadIncidents();
  }

  async function loadRisks() {
    if (!canUseRiskModule) {
      return;
    }

    setIsRisksLoading(true);

    const response = await fetch("/api/risks/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setIsRisksLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setRiskMessage(data.error || "Kunde inte hämta risker.");
      return;
    }

    const data = (await response.json()) as { risks: RiskItem[] };
    setRisks(data.risks || []);
  }

  async function createRisk() {
    if (!canUseRiskModule) {
      return;
    }

    if (!riskForm.title.trim() || !riskForm.description.trim()) {
      setRiskMessage("Ange rubrik och beskrivning för risken.");
      return;
    }

    setIsRiskSubmitting(true);
    setRiskMessage("");

    const response = await fetch("/api/risks/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(riskForm),
    });

    setIsRiskSubmitting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setRiskMessage(data.error || "Kunde inte skapa risk.");
      return;
    }

    setRiskForm(initialRiskForm);
    setRiskMessage("Risk skapad.");
    await loadRisks();
  }

  async function updateRiskStatus(riskId: string, status: RiskStatus) {
    const response = await fetch("/api/risks/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ riskId, status }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setRiskMessage(data.error || "Kunde inte uppdatera riskstatus.");
      return;
    }

    await loadRisks();
  }

  async function loadControls() {
    if (!canUseControlModule) {
      return;
    }

    setIsControlsLoading(true);

    const response = await fetch("/api/controls/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setIsControlsLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setControlMessage(data.error || "Kunde inte hämta kontroller.");
      return;
    }

    const data = (await response.json()) as { controls: ControlItem[] };
    setControls(data.controls || []);
  }

  async function createControl() {
    if (!canUseControlModule) {
      return;
    }

    if (!controlForm.title.trim()) {
      setControlMessage("Ange en titel för kontrollpunkten.");
      return;
    }

    setIsControlSubmitting(true);
    setControlMessage("");

    const response = await fetch("/api/controls/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(controlForm),
    });

    setIsControlSubmitting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setControlMessage(data.error || "Kunde inte skapa kontrollpunkt.");
      return;
    }

    setControlForm(initialControlForm);
    setControlMessage("Kontrollpunkt skapad.");
    await loadControls();
  }

  async function updateControlStatus(controlId: string, status: ControlTaskStatus) {
    const response = await fetch("/api/controls/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controlId, status }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setControlMessage(data.error || "Kunde inte uppdatera kontrollstatus.");
      return;
    }

    await loadControls();
  }

  async function updateIncidentStatus(incidentId: string, status: IncidentStatus) {
    const response = await fetch("/api/incidents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentId, status }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setIncidentMessage(data.error || "Kunde inte uppdatera status.");
      return;
    }

    await loadIncidents();
  }

  useEffect(() => {
    if (!hasHydratedWorkspace || !canUseIncidentModule) {
      return;
    }

    loadIncidents();
  }, [activePlan, hasHydratedWorkspace]);

  useEffect(() => {
    if (!hasHydratedWorkspace || !canUseRiskModule) {
      return;
    }

    loadRisks();
  }, [activePlan, hasHydratedWorkspace]);

  useEffect(() => {
    if (!hasHydratedWorkspace || !canUseControlModule) {
      return;
    }

    loadControls();
  }, [activePlan, hasHydratedWorkspace]);

  async function saveWorkspace() {
    if (!profile.orgNumber.trim()) {
      setWorkspaceMessage("Ange organisationsnummer innan du sparar.");
      return;
    }

    if (!profile.email.trim()) {
      setWorkspaceMessage("Ange e-post innan du sparar.");
      return;
    }

    setIsSaving(true);
    setWorkspaceMessage("");

    const requirements = complianceRequirements.map((item) => ({
      code: item.code,
      title: item.title,
      status: completionMap.get(item.code) ? "complete" : "missing",
    }));

    const response = await fetch("/api/workspace/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile,
        answers,
        requirements,
      }),
    });

    setIsSaving(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setWorkspaceMessage(data.error || "Kunde inte spara uppgifter.");
      return;
    }

    setWorkspaceMessage("Uppgifter sparade.");
    void loadIncidents();
    void loadRisks();
    void loadControls();
  }

  async function loadWorkspace() {
    if (!profile.orgNumber.trim()) {
      setWorkspaceMessage("Ange organisationsnummer för att ladda.");
      return;
    }

    setIsLoadingWorkspace(true);
    setWorkspaceMessage("");

    const response = await fetch("/api/workspace/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgNumber: profile.orgNumber }),
    });

    setIsLoadingWorkspace(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setWorkspaceMessage(data.error || "Kunde inte hämta uppgifter.");
      return;
    }

    const data = (await response.json()) as {
      found: boolean;
      profile?: ProfileState;
      answers?: AnswersState;
    };

    if (!data.found) {
      setWorkspaceMessage("Inga sparade uppgifter hittades för organisationsnumret.");
      return;
    }

    if (data.profile) {
      setProfile(data.profile);
    }

    if (data.answers) {
      setAnswers((prev) => ({
        ...prev,
        ...data.answers,
      }));
    }

    setWorkspaceMessage("Uppgifter hämtade.");
    void loadIncidents();
    void loadRisks();
    void loadControls();
  }

  async function generateDocument(kind: DocumentKind) {
    const requirement = complianceRequirements.find((item) => item.documentKind === kind);
    if (requirement && !hasPlanAccess(requirement.availableFrom)) {
      return;
    }

    setGenerated((prev) => ({
      ...prev,
      [kind]: {
        content: prev[kind]?.content || "",
        approved: prev[kind]?.approved || false,
        isLoading: true,
      },
    }));

    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        clinicName: profile.clinicName,
        municipality: profile.municipality,
        careScope: answers.care_scope.answer,
        qualityProcess: answers.quality_process.answer,
        staffing: answers.staffing.answer,
        incidentRoutine: answers.incident_routine.answer,
        documentKind: kind,
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setGenerated((prev) => ({
        ...prev,
        [kind]: {
          content: data.error || "Kunde inte generera innehåll. Försök igen.",
          approved: false,
          isLoading: false,
        },
      }));
      return;
    }

    const data = (await response.json()) as { content: string };

    setGenerated((prev) => ({
      ...prev,
      [kind]: {
        content: data.content,
        approved: false,
        isLoading: false,
      },
    }));
  }

  async function exportDocument(kind: DocumentKind, format: "docx" | "pdf") {
    const document = generated[kind];
    if (!document?.content) {
      return;
    }

    const title = `${kind} - ${profile.clinicName || "klinikklar"}`;

    const response = await fetch("/api/documents/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        title,
        content: document.content,
      }),
    });

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${title}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--brand-2)]">
          Klinikklar Workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
          Ledningssystem för privat tandvård
        </h1>
        <p className="mt-3 max-w-3xl text-[color:var(--muted)]">
          Arbeta löpande med kvalitet, risk, avvikelse och egenkontroll i samma flöde.
          IVO-underlag genereras från ert dagliga ledningsarbete.
        </p>
        <p className="mt-3 inline-flex items-center rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
          Aktiv nivå: {planLabels[activePlan]}
        </p>
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
            Aktiva funktioner i din plan
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activePlanFeatures.map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={saveWorkspace}
            disabled={isSaving}
            className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "Sparar..." : "Spara"}
          </button>
          <button
            onClick={loadWorkspace}
            disabled={isLoadingWorkspace}
            className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {isLoadingWorkspace ? "Hämtar..." : "Hämta uppgifter"}
          </button>
          {workspaceMessage ? (
            <p className="text-sm text-[color:var(--muted)]">{workspaceMessage}</p>
          ) : null}
        </div>
      </header>

      <section id="ledningssystem" className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
              Moduler
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
              0. Ledningssystemets arbetsyta
            </h2>
          </div>
          <p className="text-sm text-[color:var(--muted)]">Fokus: återkommande efterlevnad</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {availableModules.map((module) => (
            <article
              key={module.key}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4"
            >
              <p className="text-sm font-semibold text-[color:var(--ink)]">{module.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--brand)]">
                {module.cadence}
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6 rounded-3xl border border-[color:var(--line)] bg-white p-6">
          <h2 className="text-xl font-semibold text-[color:var(--ink)]">1. Klinikprofil</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-[color:var(--muted)]">
              <span className="flex items-center gap-2">
                Klinikens namn
                <button
                  type="button"
                  onClick={() => setOpenHelpKey("clinicName")}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-xs font-bold text-[color:var(--brand)]"
                  aria-label="Info om Klinikens namn"
                >
                  i
                </button>
              </span>
              <input
                value={profile.clinicName}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, clinicName: event.target.value }))
                }
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-[color:var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-sm text-[color:var(--muted)]">
              <span className="flex items-center gap-2">
                Organisationsnummer
                <button
                  type="button"
                  onClick={() => setOpenHelpKey("orgNumber")}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-xs font-bold text-[color:var(--brand)]"
                  aria-label="Info om Organisationsnummer"
                >
                  i
                </button>
              </span>
              <input
                value={profile.orgNumber}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, orgNumber: event.target.value }))
                }
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-[color:var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-sm text-[color:var(--muted)]">
              <span className="flex items-center gap-2">
                Kommun
                <button
                  type="button"
                  onClick={() => setOpenHelpKey("municipality")}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-xs font-bold text-[color:var(--brand)]"
                  aria-label="Info om Kommun"
                >
                  i
                </button>
              </span>
              <input
                value={profile.municipality}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, municipality: event.target.value }))
                }
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-[color:var(--ink)]"
              />
            </label>
            <label className="space-y-1 text-sm text-[color:var(--muted)]">
              <span className="flex items-center gap-2">
                E-post
                <button
                  type="button"
                  onClick={() => setOpenHelpKey("email")}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-xs font-bold text-[color:var(--brand)]"
                  aria-label="Info om E-post"
                >
                  i
                </button>
              </span>
              <input
                value={profile.email}
                onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-[color:var(--ink)]"
              />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
          <h2 className="text-xl font-semibold text-[color:var(--ink)]">2. Kontrollpanel</h2>
          <div className="mt-4 rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[color:var(--muted)]">Efterlevnadsgrad (aktuell period)</p>
              <p className="text-sm font-semibold text-[color:var(--brand)]">{progressPercent}%</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[color:var(--line)]">
              <div
                className="h-full rounded-full bg-[color:var(--brand)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          {canUseIncidentModule || canUseRiskModule || canUseControlModule ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Avvikelser</p>
                <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{incidentSummary.total}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">Totalt registrerade</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Status</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">
                  Öppna {incidentSummary.open} / Utredning {incidentSummary.investigating} / Stängda {incidentSummary.closed}
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Hög/Kritisk: {incidentSummary.criticalOrHigh}
                </p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Risker</p>
                <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{riskSummary.total}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">Totalt registrerade</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Riskstatus</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">
                  Öppna {riskSummary.open} / Åtgärdas {riskSummary.mitigating} / Stängda {riskSummary.closed}
                </p>
                <p className="mt-1 text-xs text-amber-700">Hög prioritet: {riskSummary.highPriority}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Kontroller</p>
                <p className="mt-1 text-2xl font-semibold text-[color:var(--ink)]">{controlSummary.total}</p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">Totalt registrerade</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Kontrollstatus</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">
                  Planerade {controlSummary.pending} / Klara {controlSummary.done}
                </p>
                <p className="mt-1 text-xs text-amber-700">Försenade: {controlSummary.overdue}</p>
              </div>
            </div>
          ) : null}
          <ul className="mt-4 space-y-3">
            {complianceRequirements.map((item) => {
              const done = completionMap.get(item.code);
              return (
                <li
                  key={item.code}
                  className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    {item.code}
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.title}</p>
                  <p className="text-sm text-[color:var(--muted)]">{item.description}</p>
                  <p
                    className={`mt-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                      done ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {done ? "Klart" : "Saknas"}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id="avvikelser" className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">3. Avvikelser (Drift/Premium)</h2>
        {!canUseIncidentModule ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Uppgradera till {planLabels.step2} för att hantera avvikelser.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Ny avvikelse</p>
              <input
                value={incidentForm.title}
                onChange={(event) =>
                  setIncidentForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Rubrik"
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="date"
                  value={incidentForm.eventDate}
                  onChange={(event) =>
                    setIncidentForm((prev) => ({ ...prev, eventDate: event.target.value }))
                  }
                  className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
                />
                <select
                  value={incidentForm.severity}
                  onChange={(event) =>
                    setIncidentForm((prev) => ({
                      ...prev,
                      severity: event.target.value as IncidentSeverity,
                    }))
                  }
                  className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
                >
                  <option value="low">Låg</option>
                  <option value="medium">Medel</option>
                  <option value="high">Hög</option>
                  <option value="critical">Kritisk</option>
                </select>
              </div>
              <textarea
                value={incidentForm.description}
                onChange={(event) =>
                  setIncidentForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Beskriv vad som hänt"
                rows={4}
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <textarea
                value={incidentForm.immediateAction}
                onChange={(event) =>
                  setIncidentForm((prev) => ({ ...prev, immediateAction: event.target.value }))
                }
                placeholder="Omedelbar åtgärd (valfritt)"
                rows={3}
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={createIncident}
                disabled={isIncidentSubmitting}
                className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isIncidentSubmitting ? "Sparar..." : "Skapa avvikelse"}
              </button>
              {incidentMessage ? (
                <p className="text-sm text-[color:var(--muted)]">{incidentMessage}</p>
              ) : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Senaste avvikelser</p>
              {isIncidentsLoading ? (
                <p className="text-sm text-[color:var(--muted)]">Hämtar avvikelser...</p>
              ) : incidents.length === 0 ? (
                <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
                  Inga avvikelser registrerade än.
                </p>
              ) : (
                incidents.map((incident) => (
                  <article
                    key={incident.id}
                    className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[color:var(--ink)]">{incident.title}</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                        {incident.eventDate}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{incident.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Allvar: {incident.severity}
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Status: {incident.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {incident.status !== "new" ? (
                        <button
                          type="button"
                          onClick={() => updateIncidentStatus(incident.id, "new")}
                          className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
                        >
                          Återöppna
                        </button>
                      ) : null}
                      {incident.status !== "investigating" ? (
                        <button
                          type="button"
                          onClick={() => updateIncidentStatus(incident.id, "investigating")}
                          className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
                        >
                          Under utredning
                        </button>
                      ) : null}
                      {incident.status !== "closed" ? (
                        <button
                          type="button"
                          onClick={() => updateIncidentStatus(incident.id, "closed")}
                          className="rounded-lg bg-[color:var(--brand)] px-3 py-1 text-xs font-semibold text-white"
                        >
                          Stäng
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section id="riskanalyser" className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">4. Riskanalyser (Drift/Premium)</h2>
        {!canUseRiskModule ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Uppgradera till {planLabels.step2} för att hantera riskregister.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Ny risk</p>
              <input
                value={riskForm.title}
                onChange={(event) => setRiskForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Rubrik"
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <textarea
                value={riskForm.description}
                onChange={(event) =>
                  setRiskForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Beskriv risk, konsekvens och orsaker"
                rows={4}
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Sannolikhet (1-5)
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={riskForm.probability}
                    onChange={(event) =>
                      setRiskForm((prev) => ({ ...prev, probability: Number(event.target.value) || 1 }))
                    }
                    className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Konsekvens (1-5)
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={riskForm.consequence}
                    onChange={(event) =>
                      setRiskForm((prev) => ({ ...prev, consequence: Number(event.target.value) || 1 }))
                    }
                    className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm font-normal"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={riskForm.ownerRole}
                  onChange={(event) => setRiskForm((prev) => ({ ...prev, ownerRole: event.target.value }))}
                  placeholder="Ansvarig roll (valfritt)"
                  className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={riskForm.dueDate}
                  onChange={(event) => setRiskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
                />
              </div>
              <p className="text-xs text-[color:var(--muted)]">
                Riskvärde: <span className="font-semibold text-[color:var(--ink)]">{riskForm.probability * riskForm.consequence}</span>
              </p>
              <button
                type="button"
                onClick={createRisk}
                disabled={isRiskSubmitting}
                className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isRiskSubmitting ? "Sparar..." : "Skapa risk"}
              </button>
              {riskMessage ? <p className="text-sm text-[color:var(--muted)]">{riskMessage}</p> : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Senaste risker</p>
              {isRisksLoading ? (
                <p className="text-sm text-[color:var(--muted)]">Hämtar risker...</p>
              ) : risks.length === 0 ? (
                <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
                  Inga risker registrerade än.
                </p>
              ) : (
                risks.map((risk) => (
                  <article key={risk.id} className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-[color:var(--ink)]">{risk.title}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">{risk.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Riskvärde: {risk.probability * risk.consequence}
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Status: {risk.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {risk.status !== "open" ? (
                        <button
                          type="button"
                          onClick={() => updateRiskStatus(risk.id, "open")}
                          className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
                        >
                          Öppna
                        </button>
                      ) : null}
                      {risk.status !== "mitigating" ? (
                        <button
                          type="button"
                          onClick={() => updateRiskStatus(risk.id, "mitigating")}
                          className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
                        >
                          Åtgärdas
                        </button>
                      ) : null}
                      {risk.status !== "closed" ? (
                        <button
                          type="button"
                          onClick={() => updateRiskStatus(risk.id, "closed")}
                          className="rounded-lg bg-[color:var(--brand)] px-3 py-1 text-xs font-semibold text-white"
                        >
                          Stäng
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section id="arshjul" className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">5. Årshjul och kontroller (Drift/Premium)</h2>
        {!canUseControlModule ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Uppgradera till {planLabels.step2} för att hantera årshjul och kontroller.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Ny kontrollpunkt</p>
              <input
                value={controlForm.title}
                onChange={(event) => setControlForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Titel"
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <textarea
                value={controlForm.description}
                onChange={(event) =>
                  setControlForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Beskriv vad som ska kontrolleras"
                rows={3}
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={controlForm.frequency}
                  onChange={(event) =>
                    setControlForm((prev) => ({
                      ...prev,
                      frequency: event.target.value as ControlTaskFrequency,
                    }))
                  }
                  className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
                >
                  <option value="weekly">Veckovis</option>
                  <option value="monthly">Månadsvis</option>
                  <option value="quarterly">Kvartalsvis</option>
                  <option value="yearly">Årsvis</option>
                  <option value="ad_hoc">Ad hoc</option>
                </select>
                <input
                  type="date"
                  value={controlForm.nextDueDate}
                  onChange={(event) =>
                    setControlForm((prev) => ({ ...prev, nextDueDate: event.target.value }))
                  }
                  className="rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
                />
              </div>
              <input
                value={controlForm.ownerRole}
                onChange={(event) =>
                  setControlForm((prev) => ({ ...prev, ownerRole: event.target.value }))
                }
                placeholder="Ansvarig roll (valfritt)"
                className="w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={createControl}
                disabled={isControlSubmitting}
                className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isControlSubmitting ? "Sparar..." : "Skapa kontrollpunkt"}
              </button>
              {controlMessage ? <p className="text-sm text-[color:var(--muted)]">{controlMessage}</p> : null}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Planerade kontroller</p>
              {isControlsLoading ? (
                <p className="text-sm text-[color:var(--muted)]">Hämtar kontrollpunkter...</p>
              ) : controls.length === 0 ? (
                <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
                  Inga kontrollpunkter registrerade än.
                </p>
              ) : (
                controls.map((control) => (
                  <article
                    key={control.id}
                    className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[color:var(--ink)]">{control.title}</p>
                      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                        {control.nextDueDate || "-"}
                      </p>
                    </div>
                    {control.description ? (
                      <p className="mt-1 text-sm text-[color:var(--muted)]">{control.description}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Frekvens: {control.frequency}
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Status: {control.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {control.status !== "pending" ? (
                        <button
                          type="button"
                          onClick={() => updateControlStatus(control.id, "pending")}
                          className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
                        >
                          Planerad
                        </button>
                      ) : null}
                      {control.status !== "done" ? (
                        <button
                          type="button"
                          onClick={() => updateControlStatus(control.id, "done")}
                          className="rounded-lg border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
                        >
                          Klar
                        </button>
                      ) : null}
                      {control.status !== "overdue" ? (
                        <button
                          type="button"
                          onClick={() => updateControlStatus(control.id, "overdue")}
                          className="rounded-lg bg-[color:var(--brand)] px-3 py-1 text-xs font-semibold text-white"
                        >
                          Försenad
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section id="dokument" className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">6. Interaktiv frågeguide</h2>
        <div className="mt-4 space-y-5">
          {questionnaireItems.map((item) => (
            <div key={item.key} className="relative rounded-2xl bg-[color:var(--panel)] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-[color:var(--ink)]">{item.label}</p>
                <button
                  type="button"
                  onClick={() =>
                    setOpenHelpKey((current) => (current === item.key ? null : item.key))
                  }
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-sm font-bold text-[color:var(--brand)]"
                  aria-label={`Info om ${item.label}`}
                >
                  i
                </button>
              </div>

              <textarea
                value={answers[item.key]?.answer || ""}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [item.key]: {
                      ...prev[item.key],
                      answer: event.target.value,
                    },
                  }))
                }
                placeholder={item.placeholder}
                rows={3}
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
              />
              {item.followUpLabel ? (
                <>
                  <p className="mt-3 text-sm font-medium text-[color:var(--ink)]">{item.followUpLabel}</p>
                  <textarea
                    value={answers[item.key]?.followUpAnswer || ""}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [item.key]: {
                          ...prev[item.key],
                          followUpAnswer: event.target.value,
                        },
                      }))
                    }
                    placeholder={item.followUpPlaceholder}
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-[color:var(--line)] px-3 py-2 text-sm"
                  />
                </>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {activeHelpItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(9,20,38,0.48)] px-4"
          onClick={() => setOpenHelpKey(null)}
        >
          <div
            className="w-full max-w-xl rounded-[1.75rem] border border-[color:var(--line)] bg-white p-6 shadow-[0_30px_90px_rgba(13,39,87,0.2)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-help-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                  Fälthjälp
                </p>
                <h3
                  id="question-help-title"
                  className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]"
                >
                  {activeHelpItem.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpenHelpKey(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--line)] text-[color:var(--muted)]"
                aria-label="Stäng"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[color:var(--panel)] p-4">
              <p className="font-semibold text-[color:var(--ink)]">Vad ska fyllas i?</p>
              <p className="mt-2 leading-7 text-[color:var(--muted)]">
                {activeHelpItem.helpDescription}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--ink)]">
                {activeHelpItem.helpChecklist.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-white p-4">
              <p className="font-semibold text-[color:var(--ink)]">Exempel på formulering</p>
              <p className="mt-2 leading-7 text-[color:var(--muted)]">{activeHelpItem.helpExample}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-[color:var(--line)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
                IVO-avsnitt
              </p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Öppna IVO:s vägledning för att läsa vad som vanligtvis ska beskrivas i detta fält.
              </p>
              <a
                href={activeHelpItem.ivoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--ink)] underline underline-offset-2"
              >
                {activeHelpItem.ivoSectionTitle}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">7. Dokumentgenerator + granskning</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          AI-förslag skapas server-side för ledningssystemets moduler. Granska och verifiera
          innehållet innan export.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {complianceRequirements.map((requirement) => {
            const kind = requirement.documentKind;
            const state = generated[kind];
            const isLocked = !hasPlanAccess(requirement.availableFrom);
            return (
              <article
                key={requirement.code}
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                      {requirement.code}
                    </p>
                    <h3 className="text-base font-semibold text-[color:var(--ink)]">
                      {requirement.title}
                    </h3>
                    {isLocked ? (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                        Låst - ingår från {planLabels[requirement.availableFrom]}
                      </p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => generateDocument(kind)}
                    disabled={!canGenerate || state?.isLoading || isLocked}
                    className="rounded-xl bg-[color:var(--brand)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {state?.isLoading ? "Genererar..." : "Generera"}
                  </button>
                </div>

                <textarea
                  value={state?.content || ""}
                  onChange={(event) =>
                    setGenerated((prev) => ({
                      ...prev,
                      [kind]: {
                        content: event.target.value,
                        approved: prev[kind]?.approved || false,
                        isLoading: false,
                      },
                    }))
                  }
                  placeholder={
                    isLocked
                      ? `Uppgradera till ${planLabels[requirement.availableFrom]} för att skapa detta dokument.`
                      : "Genererat innehåll visas här"
                  }
                  rows={8}
                  disabled={isLocked}
                  className="mt-3 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />

                <label className="mt-3 flex items-center gap-2 text-sm text-[color:var(--ink)]">
                  <input
                    type="checkbox"
                    checked={state?.approved || false}
                    disabled={isLocked}
                    onChange={(event) =>
                      setGenerated((prev) => ({
                        ...prev,
                        [kind]: {
                          content: prev[kind]?.content || "",
                          approved: event.target.checked,
                          isLoading: false,
                        },
                      }))
                    }
                  />
                  Jag har granskat och verifierat innehållet
                </label>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => exportDocument(kind, "docx")}
                    disabled={isLocked || !state?.approved || !state?.content}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Exportera Word
                  </button>
                  <button
                    onClick={() => exportDocument(kind, "pdf")}
                    disabled={isLocked || !state?.approved || !state?.content}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Exportera PDF
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
