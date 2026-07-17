"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
type WorkspaceView =
  | "overview"
  | "ledningssystem"
  | "avvikelser"
  | "riskanalyser"
  | "arshjul"
  | "dokument";
type ApplicationStatus = "draft" | "in_review" | "ready_to_submit" | "submitted";

type ReadinessChecklist = {
  canMoveToReady: boolean;
  canSubmit: boolean;
};

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

type AiAssistFeature =
  | "risk_analysis"
  | "routine"
  | "incident_investigation"
  | "management_system"
  | "controls";

type AiAssistResponse =
  | {
      feature: "risk_analysis";
      title: string;
      description: string;
      probability: number;
      consequence: number;
      ownerRole: string;
      dueDate: string;
    }
  | {
      feature: "routine";
      area: string;
      changeLog: string;
      owner: string;
      nextReview: string;
    }
  | {
      feature: "incident_investigation";
      description: string;
      immediateAction: string;
    }
  | {
      feature: "management_system";
      owner: string;
      processes: string;
      documents: string;
    }
  | {
      feature: "controls";
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

function WorkspacePageContent() {
  const searchParams = useSearchParams();
  const [activePlan, setActivePlan] = useState<PlanLevel>("step2");
  const [activeView, setActiveView] = useState<WorkspaceView>("overview");
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("draft");
  const [readiness, setReadiness] = useState<ReadinessChecklist>({
    canMoveToReady: false,
    canSubmit: false,
  });

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
  const [aiAssistLoading, setAiAssistLoading] = useState<Record<AiAssistFeature, boolean>>({
    risk_analysis: false,
    routine: false,
    incident_investigation: false,
    management_system: false,
    controls: false,
  });

  useEffect(() => {
    const plan = searchParams.get("plan");

    if (plan === "step1" || plan === "step2" || plan === "step3") {
      setActivePlan(plan);
    }

    const view = searchParams.get("view");

    if (
      view === "ledningssystem" ||
      view === "avvikelser" ||
      view === "riskanalyser" ||
      view === "arshjul" ||
      view === "dokument"
    ) {
      setActiveView(view);
      return;
    }

    setActiveView("overview");
  }, [searchParams]);

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
        plan?: PlanLevel | null;
      };

      if (!data.found) {
        return;
      }

      if (data.profile) {
        setProfile(data.profile);
      }

      if (data.plan === "step1" || data.plan === "step2" || data.plan === "step3") {
        setActivePlan(data.plan);
      }

      if (data.answers) {
        setAnswers((prev) => ({
          ...prev,
          ...data.answers,
        }));
      }

      setWorkspaceMessage("Tidigare sparade uppgifter hämtade.");
      void loadApplicationReadiness();
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
  const canUsePremiumAi = hasPlanAccess("step3");
  const isOverview = activeView === "overview";
  const isApplicationView = activeView === "dokument";
  const showSection = (view: Exclude<WorkspaceView, "overview">) =>
    activeView === view || (isOverview && view !== "dokument");
  const isApplicationSubmitted = applicationStatus === "submitted";
  const isApplicationApproved = applicationStatus === "ready_to_submit";

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

  const getAnswerValue = (key: string) => answers[key]?.answer || "";

  const setAnswerValue = (key: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        answer: value,
        followUpAnswer: prev[key]?.followUpAnswer || "",
      },
    }));
  };

  async function requestAiAssistance(feature: AiAssistFeature) {
    if (!canUsePremiumAi) {
      return null;
    }

    setAiAssistLoading((prev) => ({ ...prev, [feature]: true }));

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature,
        clinicName: profile.clinicName,
        municipality: profile.municipality,
        careScope: answers.care_scope?.answer || "",
        qualityProcess: answers.quality_process?.answer || "",
        staffing: answers.staffing?.answer || "",
        incidentRoutine: answers.incident_routine?.answer || "",
        currentRisk: riskForm,
        currentIncident: incidentForm,
        currentControl: controlForm,
        currentManagementSystem: {
          owner: getAnswerValue("management_system_owner"),
          processes: getAnswerValue("management_system_processes"),
          documents: getAnswerValue("management_system_documents"),
        },
        currentRoutine: {
          area: getAnswerValue("routine_updates_area"),
          changeLog: getAnswerValue("routine_updates_change_log"),
          owner: getAnswerValue("routine_updates_owner"),
          nextReview: getAnswerValue("routine_updates_next_review"),
        },
      }),
    });

    setAiAssistLoading((prev) => ({ ...prev, [feature]: false }));

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      const message = data.error || "Kunde inte skapa AI-forslag.";

      if (feature === "risk_analysis") setRiskMessage(message);
      if (feature === "incident_investigation") setIncidentMessage(message);
      if (feature === "controls") setControlMessage(message);
      if (feature === "routine" || feature === "management_system") setWorkspaceMessage(message);
      return null;
    }

    return (await response.json()) as AiAssistResponse;
  }

  async function suggestRiskAnalysis() {
    const suggestion = await requestAiAssistance("risk_analysis");
    if (!suggestion || suggestion.feature !== "risk_analysis") return;

    setRiskForm({
      title: suggestion.title,
      description: suggestion.description,
      probability: suggestion.probability,
      consequence: suggestion.consequence,
      ownerRole: suggestion.ownerRole,
      dueDate: suggestion.dueDate,
    });
    setRiskMessage("AI-forslag infogat i riskanalysen.");
  }

  async function suggestRoutineUpdate() {
    const suggestion = await requestAiAssistance("routine");
    if (!suggestion || suggestion.feature !== "routine") return;

    setAnswerValue("routine_updates_area", suggestion.area);
    setAnswerValue("routine_updates_change_log", suggestion.changeLog);
    setAnswerValue("routine_updates_owner", suggestion.owner);
    setAnswerValue("routine_updates_next_review", suggestion.nextReview);
    setWorkspaceMessage("AI-forslag infogat for rutiner och uppdateringar.");
  }

  async function writeIncidentInvestigation() {
    const suggestion = await requestAiAssistance("incident_investigation");
    if (!suggestion || suggestion.feature !== "incident_investigation") return;

    setIncidentForm((prev) => ({
      ...prev,
      description: suggestion.description,
      immediateAction: suggestion.immediateAction,
    }));
    setIncidentMessage("AI-utredning infogad i avvikelsen.");
  }

  async function generateManagementSystemDraft() {
    const suggestion = await requestAiAssistance("management_system");
    if (!suggestion || suggestion.feature !== "management_system") return;

    setAnswerValue("management_system_owner", suggestion.owner);
    setAnswerValue("management_system_processes", suggestion.processes);
    setAnswerValue("management_system_documents", suggestion.documents);
    setWorkspaceMessage("AI-utkast infogat i ledningssystemet.");
  }

  async function suggestControls() {
    const suggestion = await requestAiAssistance("controls");
    if (!suggestion || suggestion.feature !== "controls") return;

    setControlForm({
      title: suggestion.title,
      description: suggestion.description,
      frequency: suggestion.frequency,
      ownerRole: suggestion.ownerRole,
      nextDueDate: suggestion.nextDueDate,
    });
    setControlMessage("AI-forslag infogat i kontrollpunkten.");
  }

  async function loadApplicationReadiness() {
    const response = await fetch("/api/application/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      found: boolean;
      status?: ApplicationStatus;
      checklist?: ReadinessChecklist;
    };

    if (!data.found) {
      setApplicationStatus("draft");
      setReadiness({ canMoveToReady: false, canSubmit: false });
      return;
    }

    if (data.status) {
      setApplicationStatus(data.status);
    }

    if (data.checklist) {
      setReadiness(data.checklist);
    }
  }

  async function updateApplicationStatus(status: ApplicationStatus) {
    const response = await fetch("/api/application/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setWorkspaceMessage(data.error || "Kunde inte uppdatera ansökningsstatus.");
      return;
    }

    const data = (await response.json()) as {
      status: ApplicationStatus;
      checklist: ReadinessChecklist;
    };

    setApplicationStatus(data.status);
    setReadiness(data.checklist);
  }

  const loadIncidents = useCallback(async () => {
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
  }, [canUseIncidentModule]);

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

  const loadRisks = useCallback(async () => {
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
  }, [canUseRiskModule]);

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

  const loadControls = useCallback(async () => {
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
  }, [canUseControlModule]);

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
  }, [activePlan, canUseIncidentModule, hasHydratedWorkspace, loadIncidents]);

  useEffect(() => {
    if (!hasHydratedWorkspace || !canUseRiskModule) {
      return;
    }

    loadRisks();
  }, [activePlan, canUseRiskModule, hasHydratedWorkspace, loadRisks]);

  useEffect(() => {
    if (!hasHydratedWorkspace || !canUseControlModule) {
      return;
    }

    loadControls();
  }, [activePlan, canUseControlModule, hasHydratedWorkspace, loadControls]);

  useEffect(() => {
    if (!hasHydratedWorkspace) {
      return;
    }

    void loadApplicationReadiness();
  }, [hasHydratedWorkspace]);

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
        plan: activePlan,
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
    void loadApplicationReadiness();
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
      plan?: PlanLevel | null;
    };

    if (!data.found) {
      setWorkspaceMessage("Inga sparade uppgifter hittades för organisationsnumret.");
      return;
    }

    if (data.profile) {
      setProfile(data.profile);
    }

    if (data.plan === "step1" || data.plan === "step2" || data.plan === "step3") {
      setActivePlan(data.plan);
    }

    if (data.answers) {
      setAnswers((prev) => ({
        ...prev,
        ...data.answers,
      }));
    }

    setWorkspaceMessage("Uppgifter hämtade.");
    void loadApplicationReadiness();
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
          {isApplicationView ? "Klinikklar Ansökan" : "Klinikklar Workspace"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">
          {isApplicationView
            ? "Ansökan och underlag"
            : "Ledningssystem för privat tandvård"}
        </h1>
        <p className="mt-3 max-w-3xl text-[color:var(--muted)]">
          {isApplicationView
            ? "Arbeta med frågeguiden, granska dokument och förbered underlag för inskick."
            : "Arbeta löpande med kvalitet, risk, avvikelse och egenkontroll i samma flöde."}
        </p>
        <p className="mt-3 inline-flex items-center rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
          Aktiv nivå: {planLabels[activePlan]}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {isApplicationView ? (
            <>
              <a
                href="/workspace"
                className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
              >
                Till startsida
              </a>
              <a
                href="/workspace?view=ledningssystem"
                className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
              >
                Till arbetsyta
              </a>
            </>
          ) : (
            <>
              <a
                href="/workspace"
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  isOverview
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-[color:var(--line)] bg-white text-[color:var(--ink)]"
                }`}
              >
                Översikt
              </a>
              <a
                href="/workspace?view=ledningssystem"
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  activeView === "ledningssystem"
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-[color:var(--line)] bg-white text-[color:var(--ink)]"
                }`}
              >
                Ledningssystem
              </a>
              <a
                href="/workspace?view=avvikelser"
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  activeView === "avvikelser"
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-[color:var(--line)] bg-white text-[color:var(--ink)]"
                }`}
              >
                Avvikelser
              </a>
              <a
                href="/workspace?view=riskanalyser"
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  activeView === "riskanalyser"
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-[color:var(--line)] bg-white text-[color:var(--ink)]"
                }`}
              >
                Riskanalyser
              </a>
              <a
                href="/workspace?view=arshjul"
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  activeView === "arshjul"
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)] text-[color:var(--brand)]"
                    : "border-[color:var(--line)] bg-white text-[color:var(--ink)]"
                }`}
              >
                Årshjul
              </a>
              <a
                href="/ansokan"
                className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
              >
                Ansökan
              </a>
            </>
          )}
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

      {showSection("ledningssystem") ? (
        <section id="ledningssystem" className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
                Ledningssystem
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
                Översikt och nästa steg
              </h2>
            </div>
            <p className="text-sm text-[color:var(--muted)]">Fokus: återkommande efterlevnad</p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Status</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">Aktivt ledningsarbete</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Strukturen är redo för löpande uppdatering.</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Nästa steg</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">Se rutiner och uppdateringar</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Samla förändringar, versioner och ansvar på ett ställe.</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Dokumentation</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">Redigera i appen</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Exportera till Word när innehållet ska delas eller lämnas in.</p>
            </article>
            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Ingång</p>
              <p className="mt-2 text-lg font-semibold text-[color:var(--ink)]">Ansökan</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Frågeguiden och underlagen samlas där inför inskick.</p>
            </article>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="/workspace?view=avvikelser"
              className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
            >
              Gå till avvikelser
            </a>
            <a
              href="/workspace?view=riskanalyser"
              className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
            >
              Gå till riskanalyser
            </a>
            <a
              href="/workspace?view=arshjul"
              className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
            >
              Gå till årshjul
            </a>
            <a
              href="/ansokan"
              className="rounded-full bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Öppna ansökan
            </a>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Ledningssystem</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--brand)]">
                Månatlig uppföljning
              </p>
              {canUsePremiumAi ? (
                <button
                  type="button"
                  onClick={generateManagementSystemDraft}
                  disabled={aiAssistLoading.management_system}
                  className="mt-3 rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {aiAssistLoading.management_system ? "AI arbetar..." : "AI: Generera utkast"}
                </button>
              ) : null}
              <div className="mt-3 space-y-3">
                <input
                  value={getAnswerValue("management_system_owner")}
                  onChange={(event) => setAnswerValue("management_system_owner", event.target.value)}
                  placeholder="Ansvarig roll (ex. Verksamhetschef)"
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <textarea
                  value={getAnswerValue("management_system_processes")}
                  onChange={(event) =>
                    setAnswerValue("management_system_processes", event.target.value)
                  }
                  placeholder="Beskriv huvudprocesser och hur de följs upp"
                  rows={3}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <textarea
                  value={getAnswerValue("management_system_documents")}
                  onChange={(event) =>
                    setAnswerValue("management_system_documents", event.target.value)
                  }
                  placeholder="Styrande dokument (rutiner, policyer, riktlinjer)"
                  rows={3}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Senast uppdaterad
                  <input
                    type="date"
                    value={getAnswerValue("management_system_updated_at")}
                    onChange={(event) =>
                      setAnswerValue("management_system_updated_at", event.target.value)
                    }
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
              </div>
            </article>

            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Rutiner och uppdateringar</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--brand)]">Löpande</p>
              {canUsePremiumAi ? (
                <button
                  type="button"
                  onClick={suggestRoutineUpdate}
                  disabled={aiAssistLoading.routine}
                  className="mt-3 rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {aiAssistLoading.routine ? "AI arbetar..." : "AI: Skapa rutin"}
                </button>
              ) : null}
              <div className="mt-3 space-y-3">
                <input
                  value={getAnswerValue("routine_updates_area")}
                  onChange={(event) => setAnswerValue("routine_updates_area", event.target.value)}
                  placeholder="Berört område (ex. steril, journal, bemanning)"
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <textarea
                  value={getAnswerValue("routine_updates_change_log")}
                  onChange={(event) =>
                    setAnswerValue("routine_updates_change_log", event.target.value)
                  }
                  placeholder="Vad har ändrats och varför?"
                  rows={3}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <input
                  value={getAnswerValue("routine_updates_owner")}
                  onChange={(event) => setAnswerValue("routine_updates_owner", event.target.value)}
                  placeholder="Ansvarig för uppdateringen"
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Nästa uppföljning
                  <input
                    type="date"
                    value={getAnswerValue("routine_updates_next_review")}
                    onChange={(event) =>
                      setAnswerValue("routine_updates_next_review", event.target.value)
                    }
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
              </div>
            </article>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
      ) : null}

      {isOverview ? (
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
      ) : null}

      {showSection("avvikelser") ? (
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
              {canUsePremiumAi ? (
                <button
                  type="button"
                  onClick={writeIncidentInvestigation}
                  disabled={aiAssistLoading.incident_investigation}
                  className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {aiAssistLoading.incident_investigation ? "AI arbetar..." : "AI: Skriv utredning"}
                </button>
              ) : null}
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
      ) : null}

      {showSection("riskanalyser") ? (
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
              {canUsePremiumAi ? (
                <button
                  type="button"
                  onClick={suggestRiskAnalysis}
                  disabled={aiAssistLoading.risk_analysis}
                  className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {aiAssistLoading.risk_analysis ? "AI arbetar..." : "AI: Föreslå riskanalys"}
                </button>
              ) : null}
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
      ) : null}

      {showSection("arshjul") ? (
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
              {canUsePremiumAi ? (
                <button
                  type="button"
                  onClick={suggestControls}
                  disabled={aiAssistLoading.controls}
                  className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {aiAssistLoading.controls ? "AI arbetar..." : "AI: Föreslå kontroller"}
                </button>
              ) : null}
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
      ) : null}

      {showSection("dokument") ? (
      <section id="dokument" className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">1. Frågeguide</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Fyll i uppgifterna steg för steg. Svaren används som grund för dokument och ansökan.
        </p>
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
      ) : null}

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

      {showSection("dokument") ? (
        <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-[color:var(--ink)]">2. Dokument och granskning</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                AI-förslag skapas server-side. Granska och verifiera innehållet innan export.
              </p>
            </div>
            <div className="rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
              {applicationStatus === "draft"
                ? "Utkast"
                : applicationStatus === "in_review"
                  ? "Klar för granskning"
                  : applicationStatus === "ready_to_submit"
                    ? "Godkänd"
                    : "Inskickad"}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[color:var(--ink)]">
                {isApplicationSubmitted ? "Ansökan är inskickad" : "Ansökningsläge"}
              </p>
              <div className="flex flex-wrap gap-2">
                {applicationStatus !== "draft" ? (
                  <button
                    type="button"
                    onClick={() => updateApplicationStatus("draft")}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--ink)]"
                  >
                    Till utkast
                  </button>
                ) : null}
                {applicationStatus === "draft" ? (
                  <button
                    type="button"
                    onClick={() => updateApplicationStatus("in_review")}
                    disabled={!readiness.canMoveToReady}
                    className="rounded-xl bg-[color:var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Klar för granskning
                  </button>
                ) : null}
                {applicationStatus === "in_review" ? (
                  <button
                    type="button"
                    onClick={() => updateApplicationStatus("ready_to_submit")}
                    disabled={!readiness.canMoveToReady}
                    className="rounded-xl bg-[color:var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Godkänn
                  </button>
                ) : null}
                {applicationStatus === "ready_to_submit" ? (
                  <button
                    type="button"
                    onClick={() => updateApplicationStatus("submitted")}
                    disabled={!readiness.canSubmit}
                    className="rounded-xl bg-[color:var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Markera inskickad
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Status sparas automatiskt och avgör om dokumenten är öppna för ändringar.
            </p>
          </div>

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
                      disabled={!canGenerate || state?.isLoading || isLocked || isApplicationSubmitted}
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
                    disabled={isLocked || isApplicationSubmitted}
                    className="mt-3 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />

                  {isApplicationSubmitted ? (
                    <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                      Ansökan är inskickad och låst för ändringar.
                    </p>
                  ) : (
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
                  )}

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

                  {state?.approved && !isApplicationApproved && !isApplicationSubmitted ? (
                    <button
                      type="button"
                      onClick={() => updateApplicationStatus("ready_to_submit")}
                      disabled={!readiness.canMoveToReady}
                      className="mt-3 rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--ink)]"
                    >
                      Förbered inskick
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-[color:var(--muted)]">
          Laddar arbetsyta...
        </div>
      }
    >
      <WorkspacePageContent />
    </Suspense>
  );
}
