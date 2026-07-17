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

type RoutineEntry = {
  id: string;
  requirementKey: string;
  requirementLabel: string;
  area: string;
  changeLog: string;
  owner: string;
  nextReview: string;
  updatedAt: string;
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
const ledningssystemRequirementItems = [
  { key: "management_system_purpose", label: "Syfte" },
  { key: "management_system_scope", label: "Omfattning" },
  { key: "management_system_owner", label: "Ansvarig" },
  { key: "management_system_approved_by", label: "Godkänd av" },
  { key: "management_system_processes", label: "Processer och uppföljning" },
  {
    key: "management_system_followup_log",
    label: "Bevis på månatlig/kvartalsvis uppföljning i drift",
  },
  { key: "management_system_documents", label: "Styrande dokument" },
  {
    key: "management_system_decision_log",
    label: "Formellt beslut, fastställande och versionsstyrning",
  },
  { key: "management_system_next_review", label: "Nästa planerade uppföljning" },
];

const routineRequirementPoints = [
  { key: "patient_safe_processes", label: "Patientsäkerhetskritiska processer" },
  { key: "responsibility", label: "Tydlig ansvarsfördelning" },
  { key: "tracked_updates", label: "Spårbar uppdatering" },
  { key: "follow_up", label: "Regelbunden uppföljning och förbättring" },
  { key: "incident_risk_link", label: "Koppling till avvikelse och risk" },
  { key: "document_control", label: "Dokumentstyrning" },
];

const annualControlChecklistItems = [
  "Hygienrutiner och sterilhantering",
  "Journalstickprov och dokumentationskvalitet",
  "Läkemedelshantering och kontroll av hållbarhet",
  "Kompetens och delegeringar",
  "Uppföljning av avvikelser och åtgärder",
  "Uppföljning av höga risker och åtgärdsplaner",
];

const annualControlTemplates = [
  {
    title: "Hygienrutiner och sterilhantering",
    description: "Kontrollera hygienrutiner, sterilprocesser och dokumenterad egenkontroll enligt rutin.",
  },
  {
    title: "Journalstickprov och dokumentationskvalitet",
    description: "Genomför stickprov av journaler och verifiera att dokumentation är fullständig och spårbar.",
  },
  {
    title: "Läkemedelshantering och kontroll av hållbarhet",
    description: "Kontrollera förvaring, åtkomst, hållbarhet och dokumentation för läkemedel och förbrukningsmaterial.",
  },
  {
    title: "Kompetens och delegeringar",
    description: "Följ upp att roller, delegeringar och kompetenskrav är aktuella och dokumenterade.",
  },
  {
    title: "Uppföljning av avvikelser och åtgärder",
    description: "Följ upp öppna avvikelser, status på åtgärdsplaner och verifierad effekt av genomförda åtgärder.",
  },
  {
    title: "Uppföljning av höga risker och åtgärdsplaner",
    description: "Granska risker med hög prioritet, ansvar, tidsfrister och effekten av riskreducerande åtgärder.",
  },
] as const;

const controlFrequencyLabels: Record<ControlTaskFrequency, string> = {
  weekly: "Veckovis",
  monthly: "Månadsvis",
  quarterly: "Kvartalsvis",
  yearly: "Årsvis",
  ad_hoc: "Ad hoc",
};

const controlStatusLabels: Record<ControlTaskStatus, string> = {
  pending: "Planerad",
  done: "Klar",
  overdue: "Försenad",
  skipped: "Hoppad över",
};

const incidentSeverityLabels: Record<IncidentSeverity, string> = {
  low: "Låg",
  medium: "Medel",
  high: "Hög",
  critical: "Kritisk",
};

const incidentStatusLabels: Record<IncidentStatus, string> = {
  new: "Ny",
  investigating: "Under utredning",
  closed: "Stängd",
};

const riskStatusLabels: Record<RiskStatus, string> = {
  open: "Öppen",
  mitigating: "Åtgärdas",
  closed: "Stängd",
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
  const [routineMessage, setRoutineMessage] = useState("");
  const [aiAssistLoading, setAiAssistLoading] = useState<Record<AiAssistFeature, boolean>>({
    risk_analysis: false,
    routine: false,
    incident_investigation: false,
    management_system: false,
    controls: false,
  });
  const [activeRoutineRequirementKey, setActiveRoutineRequirementKey] = useState(
    routineRequirementPoints[0].key
  );

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
      if (requirement.code === "R-02") {
        const ledningssystemDone = ledningssystemRequirementItems.every(({ key }) =>
          Boolean(answers[key]?.answer?.trim())
        );

        result.set(requirement.code, ledningssystemDone);
        continue;
      }

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
  const routineEntries = useMemo<RoutineEntry[]>(() => {
    const raw = answers.routine_updates_entries?.answer;

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") {
            return null;
          }

          const candidate = item as Partial<RoutineEntry>;

          if (
            typeof candidate.requirementKey !== "string" ||
            typeof candidate.requirementLabel !== "string" ||
            typeof candidate.area !== "string" ||
            typeof candidate.changeLog !== "string" ||
            typeof candidate.owner !== "string" ||
            typeof candidate.nextReview !== "string"
          ) {
            return null;
          }

          return {
            id:
              typeof candidate.id === "string" && candidate.id
                ? candidate.id
                : `${candidate.requirementKey}-${Date.now()}`,
            requirementKey: candidate.requirementKey,
            requirementLabel: candidate.requirementLabel,
            area: candidate.area,
            changeLog: candidate.changeLog,
            owner: candidate.owner,
            nextReview: candidate.nextReview,
            updatedAt:
              typeof candidate.updatedAt === "string" && candidate.updatedAt
                ? candidate.updatedAt
                : new Date().toISOString(),
          };
        })
        .filter((entry): entry is RoutineEntry => Boolean(entry));
    } catch {
      return [];
    }
  }, [answers]);
  const routineCoverageMissingPoints = useMemo(
    () =>
      routineRequirementPoints
        .filter((point) => !routineEntries.some((entry) => entry.requirementKey === point.key))
        .map((point) => point.label),
    [routineEntries]
  );
  const hasRoutineCoverage = routineCoverageMissingPoints.length === 0;
  const activeRoutineRequirement = useMemo(
    () =>
      routineRequirementPoints.find((point) => point.key === activeRoutineRequirementKey) ||
      routineRequirementPoints[0],
    [activeRoutineRequirementKey]
  );
  const ledningssystemMissingFields = useMemo(
    () =>
      ledningssystemRequirementItems
        .filter(({ key }) => !answers[key]?.answer?.trim())
        .map(({ label }) => label),
    [answers]
  );
  const hasLedningssystemCoverage = ledningssystemMissingFields.length === 0;
  const isOverview = activeView === "overview";
  const isApplicationView = activeView === "dokument";
  const showSection = (view: Exclude<WorkspaceView, "overview">) =>
    activeView === view || (isOverview && view !== "dokument");
  const submissionBlockers = useMemo(() => {
    const blockers: string[] = [];

    if (!hasLedningssystemCoverage) {
      blockers.push(`Ledningssystem: ${ledningssystemMissingFields.join(", ")}`);
    }

    if (canUseIncidentModule && !hasRoutineCoverage) {
      blockers.push(`Rutiner (R-04): ${routineCoverageMissingPoints.join(", ")}`);
    }

    return blockers;
  }, [
    hasLedningssystemCoverage,
    ledningssystemMissingFields,
    canUseIncidentModule,
    hasRoutineCoverage,
    routineCoverageMissingPoints,
  ]);
  const canSubmitApplication = readiness.canSubmit && submissionBlockers.length === 0;
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

  const managementSystemSummary = useMemo(() => {
    const latestRoutineEntry = routineEntries
      .slice()
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
    const routineArea =
      latestRoutineEntry?.area || answers.routine_updates_area?.answer?.trim() || "Ej angivet";
    const routineOwner =
      latestRoutineEntry?.owner || answers.routine_updates_owner?.answer?.trim() || "Ej angivet";
    const routineNextReview =
      latestRoutineEntry?.nextReview || answers.routine_updates_next_review?.answer || "Ej satt";

    const managementOwner =
      answers.management_system_owner?.answer?.trim() || profile.clinicName.trim() || "Ej angivet";
    const managementNextReview = answers.management_system_next_review?.answer || "Ej satt";

    const riskHeadlines = risks.slice(0, 2).map((item) => item.title).filter(Boolean);
    const incidentHeadlines = incidents.slice(0, 2).map((item) => item.title).filter(Boolean);
    const controlHeadlines = controls.slice(0, 2).map((item) => item.title).filter(Boolean);

    return {
      responsibility: {
        managementOwner,
        routineOwner,
      },
      routines: {
        area: routineArea,
        nextReview: routineNextReview,
      },
      risks: {
        open: riskSummary.open,
        highPriority: riskSummary.highPriority,
        headlines: riskHeadlines,
      },
      incidents: {
        open: incidentSummary.open,
        criticalOrHigh: incidentSummary.criticalOrHigh,
        headlines: incidentHeadlines,
      },
      controls: {
        pending: controlSummary.pending,
        overdue: controlSummary.overdue,
        headlines: controlHeadlines,
      },
      nextReview: {
        managementSystem: managementNextReview,
        routines: routineNextReview,
      },
    };
  }, [
    answers,
    profile.clinicName,
    risks,
    incidents,
    controls,
    routineEntries,
    riskSummary,
    incidentSummary,
    controlSummary,
  ]);

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

  const ensureRoutineDocumentReferences = (text: string) => {
    const references = [
      "- Avvikelsehanteringsrutin: /avvikelser/rutin",
      "- Riskanalysrutin: /riskanalyser/rutin",
      "- Kontrollrutin (årshjul): /arshjul/rutin",
    ];

    const existingLines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const normalized = [...existingLines];

    if (!normalized.some((line) => line.toLowerCase() === "dokumenterade rutiner:")) {
      normalized.push("Dokumenterade rutiner:");
    }

    for (const reference of references) {
      if (!normalized.some((line) => line.includes(reference.split(": ")[1]))) {
        normalized.push(reference);
      }
    }

    return normalized.join("\n");
  };

  const ensureAnnualControlChecklist = (text: string) => {
    const existingLines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const normalized = [...existingLines];

    if (!normalized.some((line) => line.toLowerCase() === "årskontroll-checklista:")) {
      normalized.push("Årskontroll-checklista:");
    }

    for (const item of annualControlChecklistItems) {
      const checklistLine = `- ${item}`;
      if (!normalized.some((line) => line.toLowerCase() === checklistLine.toLowerCase())) {
        normalized.push(checklistLine);
      }
    }

    return normalized.join("\n");
  };

  function insertAnnualControlChecklistToDocuments() {
    const current = getAnswerValue("management_system_documents").trim();
    const base = current || "Styrande dokument:";
    const withRoutineRefs = ensureRoutineDocumentReferences(base);
    const withChecklist = ensureAnnualControlChecklist(withRoutineRefs);

    setAnswerValue("management_system_documents", withChecklist);
    setWorkspaceMessage("Årskontroll-checklista har infogats i Styrande dokument.");
  }

  function finalizeManagementSystemDecision() {
    const version = getAnswerValue("management_system_version").trim();
    const approvedBy = getAnswerValue("management_system_approved_by").trim();

    if (!version || !approvedBy) {
      setWorkspaceMessage(
        "Ange version och Godkänd av innan ledningssystemet fastställs."
      );
      focusManagementField(!version ? "management_system_version" : "management_system_approved_by");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const entry = `${today} | Version ${version} | Fastställd av: ${approvedBy}`;
    const existing = getAnswerValue("management_system_decision_log")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!existing.includes(entry)) {
      existing.unshift(entry);
    }

    setAnswerValue("management_system_updated_at", today);
    setAnswerValue("management_system_decision_log", existing.join("\n"));
    setWorkspaceMessage("Ledningssystem fastställt. Versionsstyrning och beslutslogg uppdaterad.");
  }

  function registerManagementFollowup(cadence: "monthly" | "quarterly") {
    const approver =
      getAnswerValue("management_system_approved_by").trim() ||
      getAnswerValue("management_system_owner").trim() ||
      "Ej angivet";

    const today = new Date().toISOString().slice(0, 10);
    const cadenceLabel = cadence === "monthly" ? "Månatlig" : "Kvartalsvis";
    const entry = `${today} | ${cadenceLabel} uppföljning | Godkänd av: ${approver}`;

    const existing = getAnswerValue("management_system_followup_log")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!existing.includes(entry)) {
      existing.unshift(entry);
    }

    setAnswerValue("management_system_updated_at", today);
    setAnswerValue("management_system_followup_log", existing.join("\n"));

    const nextReviewDate = new Date();
    nextReviewDate.setMonth(nextReviewDate.getMonth() + (cadence === "monthly" ? 1 : 3));
    setAnswerValue("management_system_next_review", nextReviewDate.toISOString().slice(0, 10));

    setWorkspaceMessage(`${cadenceLabel} uppföljning registrerad i loggen.`);
  }

  const upsertRoutineEntry = useCallback(
    (entry: Omit<RoutineEntry, "id" | "updatedAt">) => {
      const updatedEntry: RoutineEntry = {
        ...entry,
        id: `${entry.requirementKey}-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };

      setAnswers((prev) => {
        const previousRaw = prev.routine_updates_entries?.answer;
        let previousEntries: RoutineEntry[] = [];

        if (previousRaw) {
          try {
            const parsed = JSON.parse(previousRaw) as RoutineEntry[];
            if (Array.isArray(parsed)) {
              previousEntries = parsed;
            }
          } catch {
            previousEntries = [];
          }
        }

        const nextEntries = [
          ...previousEntries.filter((item) => item.requirementKey !== entry.requirementKey),
          updatedEntry,
        ];

        return {
          ...prev,
          routine_updates_entries: {
            answer: JSON.stringify(nextEntries),
            followUpAnswer: prev.routine_updates_entries?.followUpAnswer || "",
          },
          routine_updates_area: {
            answer: entry.area,
            followUpAnswer: prev.routine_updates_area?.followUpAnswer || "",
          },
          routine_updates_change_log: {
            answer: entry.changeLog,
            followUpAnswer: prev.routine_updates_change_log?.followUpAnswer || "",
          },
          routine_updates_owner: {
            answer: entry.owner,
            followUpAnswer: prev.routine_updates_owner?.followUpAnswer || "",
          },
          routine_updates_next_review: {
            answer: entry.nextReview,
            followUpAnswer: prev.routine_updates_next_review?.followUpAnswer || "",
          },
        };
      });
    },
    []
  );

  function saveRoutineForPoint() {
    const area = getAnswerValue("routine_updates_area").trim();
    const changeLog = getAnswerValue("routine_updates_change_log").trim();
    const owner = getAnswerValue("routine_updates_owner").trim();
    const nextReview = getAnswerValue("routine_updates_next_review").trim();

    if (!area || !changeLog || !owner || !nextReview) {
      setRoutineMessage("Fyll i område, ändring, ansvarig och nästa uppföljning innan du sparar rutin.");
      return;
    }

    upsertRoutineEntry({
      requirementKey: activeRoutineRequirement.key,
      requirementLabel: activeRoutineRequirement.label,
      area,
      changeLog,
      owner,
      nextReview,
    });

    setRoutineMessage(`Rutin sparad för punkt: ${activeRoutineRequirement.label}.`);
  }

  function editRoutineForPoint(requirementKey: string) {
    const entry = routineEntries.find((item) => item.requirementKey === requirementKey);

    if (!entry) {
      return;
    }

    setActiveRoutineRequirementKey(entry.requirementKey);
    setAnswerValue("routine_updates_area", entry.area);
    setAnswerValue("routine_updates_change_log", entry.changeLog);
    setAnswerValue("routine_updates_owner", entry.owner);
    setAnswerValue("routine_updates_next_review", entry.nextReview);
    setWorkspaceMessage(`Rutin laddad för redigering: ${entry.requirementLabel}.`);
  }

  function removeRoutineForPoint(requirementKey: string) {
    setAnswers((prev) => {
      const previousRaw = prev.routine_updates_entries?.answer;
      let previousEntries: RoutineEntry[] = [];

      if (previousRaw) {
        try {
          const parsed = JSON.parse(previousRaw) as RoutineEntry[];
          if (Array.isArray(parsed)) {
            previousEntries = parsed;
          }
        } catch {
          previousEntries = [];
        }
      }

      const nextEntries = previousEntries.filter((item) => item.requirementKey !== requirementKey);

      return {
        ...prev,
        routine_updates_entries: {
          answer: JSON.stringify(nextEntries),
          followUpAnswer: prev.routine_updates_entries?.followUpAnswer || "",
        },
      };
    });
    setWorkspaceMessage("Rutin borttagen för vald punkt.");
  }

  function focusManagementField(fieldKey: string) {
    const element = document.getElementById(`management-field-${fieldKey}`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus();
  }

  function focusRoutinePoint(requirementKey: string) {
    const entry = routineEntries.find((item) => item.requirementKey === requirementKey);

    if (entry) {
      editRoutineForPoint(requirementKey);
    } else {
      const point = routineRequirementPoints.find((item) => item.key === requirementKey);
      if (point) {
        setActiveRoutineRequirementKey(point.key);
        setAnswerValue("routine_updates_area", point.label);
      }
    }

    const element = document.getElementById("routine-field-area") as HTMLInputElement | null;
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus();
  }

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
          requirementPoint: activeRoutineRequirement.label,
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
      const message = data.error || "Kunde inte skapa AI-förslag.";

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
    setRiskMessage("AI-förslag infogat i riskanalysen.");
  }

  async function suggestRoutineUpdate(
    targetPoint: (typeof routineRequirementPoints)[number] = activeRoutineRequirement
  ) {
    const suggestion = await requestAiAssistance("routine");
    if (!suggestion || suggestion.feature !== "routine") return;

    const area = suggestion.area?.trim() || targetPoint.label;
    const changeLog =
      suggestion.changeLog?.trim() || "Rutinen uppdateras enligt senaste krav och uppföljning.";
    const owner = suggestion.owner?.trim() || "Kvalitetsansvarig";
    const nextReview = suggestion.nextReview?.trim() || new Date().toISOString().slice(0, 10);

    upsertRoutineEntry({
      requirementKey: targetPoint.key,
      requirementLabel: targetPoint.label,
      area,
      changeLog,
      owner,
      nextReview,
    });

    setWorkspaceMessage(`AI-rutin skapad och sparad för punkt: ${targetPoint.label}.`);
  }

  async function suggestRoutineForPoint(pointKey: string) {
    const point = routineRequirementPoints.find((item) => item.key === pointKey);

    if (!point) {
      return;
    }

    setActiveRoutineRequirementKey(pointKey);
    setAnswerValue("routine_updates_area", point.label);
    await suggestRoutineUpdate(point);
  }

  async function suggestAllMissingRoutines() {
    if (!canUsePremiumAi) {
      return;
    }

    for (const point of routineRequirementPoints) {
      const hasRoutine = routineEntries.some((entry) => entry.requirementKey === point.key);

      if (hasRoutine) {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await suggestRoutineForPoint(point.key);
    }

    setWorkspaceMessage("AI har skapat rutiner för alla saknade lagkravspunkter.");
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

    const today = new Date().toISOString().slice(0, 10);

    const fallbackPurpose =
      "Ledningssystemet ska säkerställa lagkrav, kvalitet och patientsäkerhet genom systematisk uppföljning och tydlig ansvarsfördelning.";
    const routineArea = answers.routine_updates_area?.answer?.trim() || "kärnprocesser";
    const fallbackScope = `Omfattar ${routineArea.toLowerCase()}, avvikelsehantering, riskanalys, dokumentstyrning och egenkontroller.`;
    const fallbackProcessOwners = [
      `Ledningssystem: ${suggestion.owner || getAnswerValue("management_system_owner") || "Verksamhetschef"}`,
      `Rutiner: ${getAnswerValue("routine_updates_owner") || "Kvalitetsansvarig"}`,
    ].join("\n");

    const fallbackNextReview = (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      return date.toISOString().slice(0, 10);
    })();

    const nextReview =
      getAnswerValue("routine_updates_next_review") ||
      getAnswerValue("management_system_next_review") ||
      fallbackNextReview;

    setAnswerValue("management_system_purpose", getAnswerValue("management_system_purpose") || fallbackPurpose);
    setAnswerValue("management_system_scope", getAnswerValue("management_system_scope") || fallbackScope);
    setAnswerValue("management_system_owner", suggestion.owner);
    setAnswerValue(
      "management_system_process_owners",
      getAnswerValue("management_system_process_owners") || fallbackProcessOwners
    );
    setAnswerValue("management_system_processes", suggestion.processes);
    setAnswerValue(
      "management_system_documents",
      ensureRoutineDocumentReferences(suggestion.documents)
    );
    setAnswerValue("management_system_updated_at", today);
    setAnswerValue("management_system_version", getAnswerValue("management_system_version") || "1.0");
    setAnswerValue(
      "management_system_approved_by",
      getAnswerValue("management_system_approved_by") || suggestion.owner || "Verksamhetschef"
    );
    setAnswerValue("management_system_next_review", nextReview);
    setWorkspaceMessage("AI-utkast infogat. Samtliga nyckelfält för ledningssystem har fyllts med förslag.");
  }

  function insertManagementSystemSummaryDraft() {
    const today = new Date().toISOString().slice(0, 10);
    const routineArea = managementSystemSummary.routines.area;
    const routineChangeLog = answers.routine_updates_change_log?.answer?.trim() || "Ej angivet";

    const processes = [
      `Rutiner (${routineArea}) med ansvarig ${managementSystemSummary.responsibility.routineOwner}.`,
      `Riskhantering: ${managementSystemSummary.risks.open} öppna risker, varav ${managementSystemSummary.risks.highPriority} med hög prioritet.`,
      `Avvikelsehantering: ${managementSystemSummary.incidents.open} öppna avvikelser, varav ${managementSystemSummary.incidents.criticalOrHigh} hög/kritisk.`,
      `Egenkontroller: ${managementSystemSummary.controls.pending} väntar och ${managementSystemSummary.controls.overdue} förfallna i årshjulet.`,
    ].join("\n");

    const processOwners = [
      `Ledningssystem: ${managementSystemSummary.responsibility.managementOwner}`,
      `Rutiner: ${managementSystemSummary.responsibility.routineOwner}`,
    ].join("\n");

    const supportingDocuments = [
      "Styrande dokument:",
      "- Rutiner och uppdateringslogg",
      "- Riskregister och åtgärdsplaner",
      "- Avvikelserapporter och utredningar",
      "- Årshjul och egenkontroller",
      `Senaste rutinändring: ${routineChangeLog}`,
    ].join("\n");

    const supportingDocumentsWithRoutineRefs = ensureRoutineDocumentReferences(supportingDocuments);

    setAnswers((prev) => {
      const next = { ...prev };
      const setField = (key: string, value: string) => {
        next[key] = {
          answer: value,
          followUpAnswer: prev[key]?.followUpAnswer || "",
        };
      };

      setField(
        "management_system_purpose",
        "Ledningssystemet samlar och följer upp rutiner, risker, avvikelser och egenkontroller i ett gemensamt arbetssätt."
      );
      setField(
        "management_system_scope",
        `Omfattar ${routineArea.toLowerCase()} samt uppföljning av riskanalys, avvikelsehantering och årshjul.`
      );
      setField("management_system_owner", managementSystemSummary.responsibility.managementOwner);
      setField(
        "management_system_approved_by",
        getAnswerValue("management_system_approved_by") ||
          managementSystemSummary.responsibility.managementOwner
      );
      setField("management_system_process_owners", processOwners);
      setField("management_system_processes", processes);
      setField("management_system_documents", supportingDocumentsWithRoutineRefs);
      setField("management_system_updated_at", today);

      if (/^\d{4}-\d{2}-\d{2}$/.test(managementSystemSummary.nextReview.managementSystem)) {
        setField("management_system_next_review", managementSystemSummary.nextReview.managementSystem);
      }

      return next;
    });

    setWorkspaceMessage("Sammanställningen har infogats i ledningssystem-utkastet.");
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
    setControlMessage("AI-förslag infogat i kontrollpunkten.");
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
    if (status === "submitted" && submissionBlockers.length > 0) {
      setWorkspaceMessage(`Kan inte markera som inskickad. Komplettera: ${submissionBlockers.join(" | ")}.`);
      setActiveView("ledningssystem");
      return;
    }

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

  async function createAnnualControlTemplate() {
    if (!canUseControlModule) {
      return;
    }

    setIsControlSubmitting(true);
    setControlMessage("");

    const listResponse = await fetch("/api/controls/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!listResponse.ok) {
      setIsControlSubmitting(false);
      const data = (await listResponse.json()) as { error?: string };
      setControlMessage(data.error || "Kunde inte läsa befintliga kontrollpunkter.");
      return;
    }

    const listData = (await listResponse.json()) as { controls: ControlItem[] };
    const existingTitles = new Set(
      (listData.controls || []).map((control) => control.title.trim().toLowerCase())
    );

    const nextDueDate = (() => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      return date.toISOString().slice(0, 10);
    })();

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const template of annualControlTemplates) {
      const normalizedTitle = template.title.trim().toLowerCase();

      if (existingTitles.has(normalizedTitle)) {
        skipped += 1;
        continue;
      }

      const response = await fetch("/api/controls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.title,
          description: template.description,
          frequency: "yearly",
          ownerRole: "Verksamhetschef",
          nextDueDate,
        }),
      });

      if (response.ok) {
        created += 1;
        existingTitles.add(normalizedTitle);
      } else {
        failed += 1;
      }
    }

    setIsControlSubmitting(false);
    await loadControls();

    if (failed > 0) {
      setControlMessage(
        `Standardårskontroller skapade: ${created}. Fanns redan: ${skipped}. Misslyckades: ${failed}.`
      );
      return;
    }

    setControlMessage(`Standardårskontroller skapade: ${created}. Fanns redan: ${skipped}.`);
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

    if (!getAnswerValue("management_system_approved_by").trim()) {
      setWorkspaceMessage("Ange Godkänd av i Ledningssystem innan du sparar.");
      setActiveView("ledningssystem");
      focusManagementField("management_system_approved_by");
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

          <article className="mt-6 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Ledningssystem: sammanställning från systemet</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Underlaget hämtas automatiskt från Rutiner, Riskanalyser, Avvikelser, Årshjul och ansvarsfält.
            </p>
            <button
              type="button"
              onClick={insertManagementSystemSummaryDraft}
              className="mt-3 rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)]"
            >
              Infoga sammanställning i utkast
            </button>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Ansvar</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Ledningssystem: {managementSystemSummary.responsibility.managementOwner}</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Rutiner: {managementSystemSummary.responsibility.routineOwner}</p>
              </div>

              <div className="rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Rutiner</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Område: {managementSystemSummary.routines.area}</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Nästa uppföljning: {managementSystemSummary.routines.nextReview}</p>
              </div>

              <div className="rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Riskhantering</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Öppna risker: {managementSystemSummary.risks.open}</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Hög prioritet: {managementSystemSummary.risks.highPriority}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {managementSystemSummary.risks.headlines.length > 0
                    ? `Exempel: ${managementSystemSummary.risks.headlines.join(", ")}`
                    : "Inga riskrubriker ännu."}
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Avvikelsehantering</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Öppna avvikelser: {managementSystemSummary.incidents.open}</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Hög/kritisk: {managementSystemSummary.incidents.criticalOrHigh}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {managementSystemSummary.incidents.headlines.length > 0
                    ? `Exempel: ${managementSystemSummary.incidents.headlines.join(", ")}`
                    : "Inga avvikelserubriker ännu."}
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Egenkontroller (årshjul)</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Väntar: {managementSystemSummary.controls.pending}</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Förfallna: {managementSystemSummary.controls.overdue}</p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {managementSystemSummary.controls.headlines.length > 0
                    ? `Exempel: ${managementSystemSummary.controls.headlines.join(", ")}`
                    : "Inga kontrollrubriker ännu."}
                </p>
              </div>

              <div className="rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Nästa översyn</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Ledningssystem: {managementSystemSummary.nextReview.managementSystem}</p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">Rutiner: {managementSystemSummary.nextReview.routines}</p>
              </div>
            </div>
          </article>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Ledningssystem</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--brand)]">
                Månatlig uppföljning
              </p>
              <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
                  Kravchecklista (R-02)
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[color:var(--ink)]">
                  {ledningssystemRequirementItems.map(({ key, label }) => {
                    const hasValue = Boolean(answers[key]?.answer?.trim());
                    return (
                      <li key={key} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${hasValue ? "bg-emerald-500" : "bg-amber-500"}`}
                          />
                          <span>{label}</span>
                        </span>
                        {!hasValue ? (
                          <button
                            type="button"
                            onClick={() => focusManagementField(key)}
                            className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)]"
                          >
                            Visa
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Dokumenterad avvikelsehanteringsrutin</span>
                    </span>
                    <a
                      href="/avvikelser/rutin"
                      className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)]"
                    >
                      Öppna
                    </a>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Dokumenterad riskanalysrutin</span>
                    </span>
                    <a
                      href="/riskanalyser/rutin"
                      className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)]"
                    >
                      Öppna
                    </a>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Dokumenterad kontrollrutin (årshjul)</span>
                    </span>
                    <a
                      href="/arshjul/rutin"
                      className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)]"
                    >
                      Öppna
                    </a>
                  </li>
                </ul>
                {ledningssystemMissingFields.length > 0 ? (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    Saknas: {ledningssystemMissingFields.join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-emerald-700">Alla punkter i R-02 är ifyllda.</p>
                )}
              </div>
              <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
                  Årskontroll-checklista (standard)
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[color:var(--ink)]">
                  {annualControlChecklistItems.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={insertAnnualControlChecklistToDocuments}
                  className="mt-3 rounded-lg border border-[color:var(--line)] px-3 py-2 text-xs font-semibold text-[color:var(--ink)]"
                >
                  Infoga i Styrande dokument
                </button>
              </div>
              {canUsePremiumAi ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={generateManagementSystemDraft}
                    disabled={aiAssistLoading.management_system}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {aiAssistLoading.management_system ? "AI arbetar..." : "AI: Generera utkast"}
                  </button>
                  <button
                    type="button"
                    onClick={insertManagementSystemSummaryDraft}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)]"
                  >
                    Infoga sammanställning
                  </button>
                </div>
              ) : null}
              <div className="mt-3 space-y-3">
                <textarea
                  id="management-field-management_system_purpose"
                  value={getAnswerValue("management_system_purpose")}
                  onChange={(event) => setAnswerValue("management_system_purpose", event.target.value)}
                  placeholder="Syfte med ledningssystemet (ex. säkerställa lagkrav och systematiskt kvalitetsarbete)"
                  rows={2}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <textarea
                  id="management-field-management_system_scope"
                  value={getAnswerValue("management_system_scope")}
                  onChange={(event) => setAnswerValue("management_system_scope", event.target.value)}
                  placeholder="Omfattning (ex. patientmottagning, journalföring, steril, röntgen, personal, läkemedel)"
                  rows={2}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <input
                  id="management-field-management_system_owner"
                  value={getAnswerValue("management_system_owner")}
                  onChange={(event) => setAnswerValue("management_system_owner", event.target.value)}
                  placeholder="Ansvarig roll (ex. Verksamhetschef)"
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <textarea
                  value={getAnswerValue("management_system_process_owners")}
                  onChange={(event) =>
                    setAnswerValue("management_system_process_owners", event.target.value)
                  }
                  placeholder="Processägare per område (ex. Hygien: Anna, Journal: Johan, Avvikelser: Lisa)"
                  rows={2}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <textarea
                  id="management-field-management_system_processes"
                  value={getAnswerValue("management_system_processes")}
                  onChange={(event) =>
                    setAnswerValue("management_system_processes", event.target.value)
                  }
                  placeholder="Beskriv huvudprocesser och hur de följs upp"
                  rows={3}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <textarea
                  id="management-field-management_system_documents"
                  value={getAnswerValue("management_system_documents")}
                  onChange={(event) =>
                    setAnswerValue("management_system_documents", event.target.value)
                  }
                  placeholder="Styrande dokument (rutiner, policyer, riktlinjer)"
                  rows={3}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    id="management-field-management_system_version"
                    value={getAnswerValue("management_system_version")}
                    onChange={(event) =>
                      setAnswerValue("management_system_version", event.target.value)
                    }
                    placeholder="Version (ex. 1.0, 1.1, 1.2)"
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                  <input
                    id="management-field-management_system_approved_by"
                    value={getAnswerValue("management_system_approved_by")}
                    onChange={(event) =>
                      setAnswerValue("management_system_approved_by", event.target.value)
                    }
                    placeholder="Godkänd av (ex. Verksamhetschef, styrelse)"
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                </div>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Senast uppdaterad
                  <input
                    id="management-field-management_system_updated_at"
                    type="date"
                    value={getAnswerValue("management_system_updated_at")}
                    onChange={(event) =>
                      setAnswerValue("management_system_updated_at", event.target.value)
                    }
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => registerManagementFollowup("monthly")}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)]"
                  >
                    Registrera månatlig uppföljning
                  </button>
                  <button
                    type="button"
                    onClick={() => registerManagementFollowup("quarterly")}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)]"
                  >
                    Registrera kvartalsvis uppföljning
                  </button>
                </div>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Uppföljningslogg drift
                  <textarea
                    id="management-field-management_system_followup_log"
                    value={getAnswerValue("management_system_followup_log")}
                    onChange={(event) =>
                      setAnswerValue("management_system_followup_log", event.target.value)
                    }
                    rows={4}
                    placeholder="Månatlig/kvartalsvis uppföljning visas här"
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={finalizeManagementSystemDecision}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)]"
                >
                  Fastställ och versionssätt ledningssystem
                </button>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Besluts- och versionslogg
                  <textarea
                    id="management-field-management_system_decision_log"
                    value={getAnswerValue("management_system_decision_log")}
                    onChange={(event) =>
                      setAnswerValue("management_system_decision_log", event.target.value)
                    }
                    rows={4}
                    placeholder="Fastställda versioner visas här"
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Nästa planerade uppföljning
                  <input
                    id="management-field-management_system_next_review"
                    type="date"
                    value={getAnswerValue("management_system_next_review")}
                    onChange={(event) =>
                      setAnswerValue("management_system_next_review", event.target.value)
                    }
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-normal"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void saveWorkspace()}
                  disabled={isSaving}
                  className="w-full rounded-xl bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSaving ? "Sparar..." : "Spara"}
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Rutiner och uppdateringar</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--brand)]">Löpande</p>
              <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
                  Lagkravspunkter för rutiner
                </p>
                <ul className="mt-2 space-y-1 text-sm text-[color:var(--ink)]">
                  {routineRequirementPoints.map((point) => {
                    const hasValue = routineEntries.some((entry) => entry.requirementKey === point.key);

                    return (
                      <li key={point.key} className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              hasValue ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span>{point.label}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          {hasValue ? (
                            <button
                              type="button"
                              onClick={() => focusRoutinePoint(point.key)}
                              className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)]"
                            >
                              Visa
                            </button>
                          ) : null}
                          {!hasValue && canUsePremiumAi ? (
                            <button
                              type="button"
                              onClick={() => void suggestRoutineForPoint(point.key)}
                              disabled={aiAssistLoading.routine}
                              className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              AI-generera
                            </button>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {routineCoverageMissingPoints.length > 0 ? (
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    Saknas: {routineCoverageMissingPoints.join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-emerald-700">Alla lagkravspunkter har en sparad rutin.</p>
                )}
              </div>

              <label className="mt-3 block space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                Välj lagkravspunkt
                <select
                  value={activeRoutineRequirementKey}
                  onChange={(event) => setActiveRoutineRequirementKey(event.target.value)}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-normal text-[color:var(--ink)]"
                >
                  {routineRequirementPoints.map((point) => (
                    <option key={point.key} value={point.key}>
                      {point.label}
                    </option>
                  ))}
                </select>
              </label>

              {canUsePremiumAi ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void suggestRoutineUpdate()}
                    disabled={aiAssistLoading.routine}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {aiAssistLoading.routine ? "AI arbetar..." : "AI: Skapa för vald punkt"}
                  </button>
                  <button
                    type="button"
                    onClick={suggestAllMissingRoutines}
                    disabled={aiAssistLoading.routine || routineCoverageMissingPoints.length === 0}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    AI: Skapa alla saknade
                  </button>
                </div>
              ) : null}

              <div className="mt-3 space-y-3">
                <input
                  id="routine-field-area"
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
                <button
                  type="button"
                  onClick={saveRoutineForPoint}
                  className="w-full rounded-xl bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white"
                >
                  Spara rutin för vald punkt
                </button>
                {routineMessage ? (
                  <p className="text-sm text-[color:var(--muted)]">{routineMessage}</p>
                ) : (
                  <p className="text-xs text-[color:var(--muted)]">Spara punkt och klicka sedan på Spara längst ned i kortet.</p>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                  Sparade rutiner per punkt
                </p>
                {routineRequirementPoints.map((point) => {
                  const entry = routineEntries.find((item) => item.requirementKey === point.key);

                  return (
                    <div
                      key={point.key}
                      className="rounded-xl border border-[color:var(--line)] bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[color:var(--ink)]">{point.label}</p>
                        <span
                          className={`text-xs font-semibold ${
                            entry ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {entry ? "Klar" : "Saknas"}
                        </span>
                      </div>
                      {entry ? (
                        <>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">{entry.area}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">Ansvarig: {entry.owner}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">Nästa uppföljning: {entry.nextReview}</p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => editRoutineForPoint(point.key)}
                              className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)]"
                            >
                              Redigera
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRoutineForPoint(point.key)}
                              className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs font-semibold text-[color:var(--ink)]"
                            >
                              Ta bort
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => void saveWorkspace()}
                disabled={isSaving}
                className="mt-4 w-full rounded-xl bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSaving ? "Sparar..." : "Spara"}
              </button>
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
        <div className="mt-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Dokumenterad rutin</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Avvikelsehanteringsrutin finns dokumenterad och kan användas som underlag för ledningssystemet.
          </p>
          <a
            href="/avvikelser/rutin"
            className="mt-3 inline-flex rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-slate-50"
          >
            Öppna avvikelsehanteringsrutin
          </a>
        </div>
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
                        Allvar: {incidentSeverityLabels[incident.severity]}
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Status: {incidentStatusLabels[incident.status]}
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
        <div className="mt-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Dokumenterad rutin</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Riskanalysrutin finns dokumenterad och kan användas som underlag för ledningssystemet.
          </p>
          <a
            href="/riskanalyser/rutin"
            className="mt-3 inline-flex rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-slate-50"
          >
            Öppna riskanalysrutin
          </a>
        </div>
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
                        Status: {riskStatusLabels[risk.status]}
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
        <div className="mt-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Dokumenterad rutin</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Kontrollrutin för årshjul och egenkontroller finns dokumenterad och kan användas som underlag för ledningssystemet.
          </p>
          <a
            href="/arshjul/rutin"
            className="mt-3 inline-flex rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] hover:bg-slate-50"
          >
            Öppna kontrollrutin
          </a>
        </div>
        {!canUseControlModule ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            Uppgradera till {planLabels.step2} för att hantera årshjul och kontroller.
          </p>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Ny kontrollpunkt</p>
              {canUsePremiumAi ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={suggestControls}
                    disabled={aiAssistLoading.controls || isControlSubmitting}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {aiAssistLoading.controls ? "AI arbetar..." : "AI: Föreslå en kontroll"}
                  </button>
                  <button
                    type="button"
                    onClick={createAnnualControlTemplate}
                    disabled={isControlSubmitting}
                    className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    {isControlSubmitting ? "Lägger in checklista..." : "Lägg in årschecklista (6 punkter)"}
                  </button>
                </div>
              ) : null}
              <p className="text-xs text-[color:var(--muted)]">
                AI skapar ett enskilt förslag utifrån kontext. Årschecklista lägger in fördefinierade standardpunkter.
              </p>
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
                        Frekvens: {controlFrequencyLabels[control.frequency]}
                      </span>
                      <span className="rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]">
                        Status: {controlStatusLabels[control.status]}
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
                    disabled={!canSubmitApplication}
                    className="rounded-xl bg-[color:var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                    title={
                      submissionBlockers.length === 0
                        ? undefined
                        : `Komplettera: ${submissionBlockers.join(" | ")}`
                    }
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
