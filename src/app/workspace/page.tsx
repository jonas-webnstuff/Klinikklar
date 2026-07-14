"use client";

import { useEffect, useMemo, useState } from "react";
import { complianceRequirements, questionnaireItems } from "@/lib/requirements";
import type { DocumentKind } from "@/types/domain";

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

const planLabels: Record<PlanLevel, string> = {
  step1: "Bli klinikklar",
  step2: "Driv kliniken rätt",
  step3: "Var alltid redo",
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
    key: "incident_management",
    title: "Avvikelsehantering",
    availableFrom: "step2" as PlanLevel,
    cadence: "Löpande",
    description: "Registrera händelser, åtgärder och återkoppling till teamet.",
  },
  {
    key: "risk_register",
    title: "Riskregister",
    availableFrom: "step2" as PlanLevel,
    cadence: "Kvartalsvis genomgång",
    description: "Följ risknivå, åtgärdsägare och status över tid.",
  },
  {
    key: "self_monitoring",
    title: "Egenkontroll",
    availableFrom: "step2" as PlanLevel,
    cadence: "Vecko- och månadspunkter",
    description: "Planera och stäng kontroller med tydliga deadlines.",
  },
  {
    key: "improvement_plans",
    title: "Förbättringsplaner",
    availableFrom: "step2" as PlanLevel,
    cadence: "Uppföljning varannan vecka",
    description: "Knyt åtgärder till rotorsaker och verifiera effekt.",
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

  const hasPlanAccess = (requiredPlan: PlanLevel) =>
    planAccessRank[activePlan] >= planAccessRank[requiredPlan];

  const canGenerate =
    profile.clinicName.trim() &&
    profile.municipality.trim() &&
    answers.care_scope?.answer.trim() &&
    answers.quality_process?.answer.trim() &&
    answers.staffing?.answer.trim() &&
    answers.incident_routine?.answer.trim();

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
          AI-ledningssystem för privat tandvård
        </h1>
        <p className="mt-3 max-w-3xl text-[color:var(--muted)]">
          Arbeta löpande med kvalitet, risk, avvikelse och egenkontroll i samma flöde.
          IVO-underlag genereras från ert dagliga ledningsarbete.
        </p>
        <p className="mt-3 inline-flex items-center rounded-full border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
          Aktiv nivå: {planLabels[activePlan]}
        </p>
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

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
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

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">3. Interaktiv frågeguide</h2>
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
                  Falthjalp
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
                aria-label="Stang"
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
                Oppna IVO:s vagledning for att lasa vad som vanligtvis ska beskrivas i detta falt.
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
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">4. Dokumentgenerator + granskning</h2>
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
