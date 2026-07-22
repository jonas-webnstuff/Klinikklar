"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ApplicationStatus = "draft" | "in_review" | "ready_to_submit" | "submitted";
type PlanLevel = "step1" | "step2" | "step3";

type AiEvidenceSuggestion = {
  feature: "application_evidence";
  title: string;
  note: string;
  filePathHint: string;
};

type IvoChecklistItem = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
};

type ReadinessChecklist = {
  hasOrganization: boolean;
  hasClinic: boolean;
  questionnaireComplete: boolean;
  requirementsComplete: boolean;
  evidenceLinked: boolean;
  ivoChecklistComplete: boolean;
  ivoChecklistItems: IvoChecklistItem[];
  missingIvoItems: string[];
  advisoryIvoGaps: string[];
  canMoveToReady: boolean;
  canSubmit: boolean;
  evidenceCount: number;
  completeRequirementCount: number;
  requirementCount: number;
};

type RequirementOption = {
  id: string;
  code: string;
  title: string;
};

type EvidenceItem = {
  id: string;
  requirementId: string;
  requirementCode: string;
  requirementTitle: string;
  title: string;
  note?: string;
  filePath?: string;
};

type AuditItem = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
};

const stages: Array<{
  key: ApplicationStatus;
  title: string;
  description: string;
}> = [
  {
    key: "draft",
    title: "Utkast",
    description: "Fyll i frågeguiden och samla underlag.",
  },
  {
    key: "in_review",
    title: "Klar för granskning",
    description: "Gå igenom dokument och kontrollera innehållet.",
  },
  {
    key: "ready_to_submit",
    title: "Godkänd",
    description: "Materialet är klart för inskick.",
  },
  {
    key: "submitted",
    title: "Klar att skicka",
    description: "Underlaget är låst och redo för manuell inskick till IVO.",
  },
];

const stageLabels: Record<ApplicationStatus, string> = {
  draft: "Utkast",
  in_review: "Klar för granskning",
  ready_to_submit: "Godkänd",
  submitted: "Klar att skicka",
};

export default function AnsokanPage() {
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("draft");
  const [activePlan, setActivePlan] = useState<PlanLevel | null>(null);
  const [checklist, setChecklist] = useState<ReadinessChecklist | null>(null);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);
  const [isAiSuggestingEvidence, setIsAiSuggestingEvidence] = useState(false);
  const [aiContext, setAiContext] = useState({ clinicName: "", municipality: "" });
  const [evidenceForm, setEvidenceForm] = useState({
    requirementId: "",
    title: "",
    note: "",
    filePath: "",
  });

  const activeStageIndex = stages.findIndex((stage) => stage.key === applicationStatus);
  const canUseAiSupport = activePlan === "step1" || activePlan === "step3";

  const readinessItems = useMemo(
    () => [
      {
        key: "profile",
        label: "Grunduppgifter för verksamheten är kompletta",
        done: Boolean(checklist?.hasOrganization && checklist?.hasClinic),
      },
      {
        key: "questionnaire",
        label: "Frågeguiden är ifylld",
        done: checklist?.questionnaireComplete || false,
      },
      {
        key: "requirements",
        label: "Kravlistan är komplett",
        done: checklist?.requirementsComplete || false,
      },
      {
        key: "evidence",
        label: "Evidens finns för varje krav",
        done: checklist?.evidenceLinked || false,
      },
    ],
    [checklist]
  );

  async function loadApplicationState() {
    setIsLoading(true);
    setStatusMessage("");

    const response = await fetch("/api/application/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setIsLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte hämta ansökningsstatus.");
      return;
    }

    const data = (await response.json()) as {
      found: boolean;
      status?: ApplicationStatus;
      checklist?: ReadinessChecklist;
      audit?: AuditItem[];
    };

    if (!data.found) {
      setStatusMessage("Ingen aktiv ansökan hittades. Spara workspace först.");
      return;
    }

    if (data.status) {
      setApplicationStatus(data.status);
    }

    if (data.checklist) {
      setChecklist(data.checklist);
    }

    setAudit(data.audit || []);
  }

  async function loadEvidence() {
    const response = await fetch("/api/evidence/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setEvidenceMessage(data.error || "Kunde inte hämta evidens.");
      return;
    }

    const data = (await response.json()) as {
      evidence: EvidenceItem[];
      requirements: RequirementOption[];
    };

    setEvidence(data.evidence || []);
    setRequirements(data.requirements || []);

    setEvidenceForm((prev) => ({
      ...prev,
      requirementId: prev.requirementId || data.requirements?.[0]?.id || "",
    }));
  }

  async function loadWorkspacePlanContext() {
    const response = await fetch("/api/workspace/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      found?: boolean;
      plan?: PlanLevel | null;
      profile?: {
        clinicName?: string;
        municipality?: string;
      };
    };

    if (data.plan === "step1" || data.plan === "step2" || data.plan === "step3") {
      setActivePlan(data.plan);
    }

    setAiContext({
      clinicName: data.profile?.clinicName || "",
      municipality: data.profile?.municipality || "",
    });
  }

  async function updateApplicationStatus(status: ApplicationStatus) {
    setStatusMessage("");

    const response = await fetch("/api/application/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte uppdatera status.");
      return;
    }

    const data = (await response.json()) as {
      status: ApplicationStatus;
      checklist: ReadinessChecklist;
    };

    setApplicationStatus(data.status);
    setChecklist(data.checklist);
    setStatusMessage("Status uppdaterad.");
    await loadApplicationState();
  }

  async function createEvidence() {
    if (!evidenceForm.requirementId || !evidenceForm.title.trim()) {
      setEvidenceMessage("Välj krav och ange titel på underlaget.");
      return;
    }

    setIsSavingEvidence(true);
    setEvidenceMessage("");

    const response = await fetch("/api/evidence/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evidenceForm),
    });

    setIsSavingEvidence(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setEvidenceMessage(data.error || "Kunde inte spara evidens.");
      return;
    }

    setEvidenceMessage("Evidens sparad.");
    setEvidenceForm((prev) => ({ ...prev, title: "", note: "", filePath: "" }));
    await loadEvidence();
    await loadApplicationState();
  }

  async function suggestEvidence() {
    if (!canUseAiSupport || !activePlan) {
      setEvidenceMessage("AI-stöd i ansökan ingår i Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    if (!evidenceForm.requirementId) {
      setEvidenceMessage("Välj krav innan du ber om AI-förslag.");
      return;
    }

    const selectedRequirement = requirements.find((item) => item.id === evidenceForm.requirementId);

    setIsAiSuggestingEvidence(true);
    setEvidenceMessage("");

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature: "application_evidence",
        clinicName: aiContext.clinicName,
        municipality: aiContext.municipality,
        currentEvidence: {
          requirementCode: selectedRequirement?.code || "",
          requirementTitle: selectedRequirement?.title || "",
          title: evidenceForm.title,
          note: evidenceForm.note,
          filePath: evidenceForm.filePath,
        },
      }),
    });

    setIsAiSuggestingEvidence(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setEvidenceMessage(data.error || "Kunde inte skapa AI-förslag för evidens.");
      return;
    }

    const data = (await response.json()) as AiEvidenceSuggestion;

    if (data.feature !== "application_evidence") {
      setEvidenceMessage("AI-svaret hade fel format. Försök igen.");
      return;
    }

    setEvidenceForm((prev) => ({
      ...prev,
      title: data.title,
      note: data.note,
      filePath: data.filePathHint,
    }));

    setEvidenceMessage("AI-förslag infogat i evidensformuläret.");
  }

  useEffect(() => {
    void loadApplicationState();
    void loadEvidence();
    void loadWorkspacePlanContext();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Ansökan
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">Frågeguide och underlag</h1>
        <p className="mt-3 max-w-3xl text-[color:var(--muted)]">
          Här samlar vi frågeguiden, dokumentgranskning, evidens och export inför inskick.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
          Nuvarande status: {stageLabels[applicationStatus]}
        </div>
        {statusMessage ? <p className="mt-3 text-sm text-[color:var(--muted)]">{statusMessage}</p> : null}
      </header>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
              Flöde
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Steg för ansökan</h2>
          </div>
          <p className="text-sm text-[color:var(--muted)]">Backend-spårad status</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage, index) => {
            const isActive = index === activeStageIndex;
            const isCompleted = index < activeStageIndex;

            return (
              <article
                key={stage.key}
                className={`rounded-2xl border p-4 ${
                  isActive
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                    : "border-[color:var(--line)] bg-[color:var(--panel)]"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    isActive || isCompleted ? "text-[color:var(--brand)]" : "text-[color:var(--muted)]"
                  }`}
                >
                  {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{stage.title}</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{stage.description}</p>
                {isActive ? (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
                    Aktivt steg
                  </p>
                ) : isCompleted ? (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Klart
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {applicationStatus !== "draft" ? (
            <button
              type="button"
              onClick={() => updateApplicationStatus("draft")}
              className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
            >
              Återställ till utkast
            </button>
          ) : null}
          {applicationStatus === "draft" ? (
            <button
              type="button"
              onClick={() => updateApplicationStatus("in_review")}
              disabled={!checklist?.canMoveToReady}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Markera klar för granskning
            </button>
          ) : null}
          {applicationStatus === "in_review" ? (
            <button
              type="button"
              onClick={() => updateApplicationStatus("ready_to_submit")}
              disabled={!checklist?.canMoveToReady}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Godkänn ansökan
            </button>
          ) : null}
          {applicationStatus === "ready_to_submit" ? (
            <button
              type="button"
              onClick={() => updateApplicationStatus("submitted")}
              disabled={!checklist?.canSubmit}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Markera som klar att skicka
            </button>
          ) : null}
        </div>

        <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Readiness-checklista</p>
          <ul className="mt-3 space-y-2 text-sm">
            {readinessItems.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-[color:var(--ink)]">{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.done
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.done ? "Klar" : "Saknas"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Krav klara: {checklist?.completeRequirementCount || 0}/{checklist?.requirementCount || 0}. Evidens: {checklist?.evidenceCount || 0}.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">IVO-specifik ansokningsbild</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                Kontrollpunkter som ligger narmare sjalva ansokan an den vanliga dokumentchecklistan.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                checklist?.ivoChecklistComplete
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {checklist?.ivoChecklistComplete ? "Grundpaket komplett" : "Komplettering kravs"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(checklist?.ivoChecklistItems || []).map((item) => (
              <article
                key={item.key}
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.done ? "Klar" : "Saknas"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{item.detail}</p>
              </article>
            ))}
          </div>

          {checklist?.missingIvoItems?.length ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">Kvar innan ansokningsunderlaget ar komplett i appen</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {checklist.missingIvoItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {checklist?.advisoryIvoGaps?.length ? (
            <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Kvar att modellera i produkten</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
                {checklist.advisoryIvoGaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Evidens och underlag</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Koppla dokument eller länkar till respektive krav för att stärka ansökningsunderlaget.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Lägg till evidens</p>
            <select
              value={evidenceForm.requirementId}
              onChange={(event) =>
                setEvidenceForm((prev) => ({ ...prev, requirementId: event.target.value }))
              }
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            >
              <option value="">Välj krav</option>
              {requirements.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.code} - {requirement.title}
                </option>
              ))}
            </select>
            <input
              value={evidenceForm.title}
              onChange={(event) => setEvidenceForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Titel på underlag"
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            />
            <textarea
              value={evidenceForm.note}
              onChange={(event) => setEvidenceForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Kort beskrivning"
              rows={3}
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            />
            <input
              value={evidenceForm.filePath}
              onChange={(event) => setEvidenceForm((prev) => ({ ...prev, filePath: event.target.value }))}
              placeholder="Filväg eller URL (valfritt)"
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={suggestEvidence}
              disabled={isAiSuggestingEvidence}
              className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isAiSuggestingEvidence ? "AI arbetar..." : "AI: Föreslå evidensutkast"}
            </button>
            <button
              type="button"
              onClick={createEvidence}
              disabled={isSavingEvidence}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSavingEvidence ? "Sparar..." : "Spara evidens"}
            </button>
            {!canUseAiSupport && activePlan === "step2" ? (
              <p className="text-xs text-[color:var(--muted)]">
                AI-stöd i ansökan ingår i Klinikklar Komplett och Klinikklar Premium.
              </p>
            ) : null}
            {evidenceMessage ? <p className="text-sm text-[color:var(--muted)]">{evidenceMessage}</p> : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Tillagt underlag</p>
            {isLoading ? (
              <p className="text-sm text-[color:var(--muted)]">Läser in...</p>
            ) : evidence.length === 0 ? (
              <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
                Ingen evidens registrerad än.
              </p>
            ) : (
              evidence.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                    {item.requirementCode}
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{item.requirementTitle}</p>
                  {item.note ? <p className="mt-2 text-sm text-[color:var(--muted)]">{item.note}</p> : null}
                  {item.filePath ? (
                    <p className="mt-2 text-xs text-[color:var(--muted)]">Ref: {item.filePath}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Auditlogg</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Senaste händelser för status och evidens i ansökningsprocessen.
        </p>
        <div className="mt-4 space-y-2">
          {audit.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Ingen logghistorik ännu.</p>
          ) : (
            audit.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2"
              >
                <p className="text-sm font-semibold text-[color:var(--ink)]">{item.message}</p>
                <p className="text-xs text-[color:var(--muted)]">{new Date(item.created_at).toLocaleString("sv-SE")}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Steg 1
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Fyll i frågeguiden</h2>
          <p className="mt-2 text-[color:var(--muted)]">
            Besvara underlagen steg för steg och spara löpande. Frågorna utgör grunden för ansökan.
          </p>
          <Link
            href="/workspace?view=dokument"
            className="mt-4 inline-flex rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            Öppna frågeguiden
          </Link>
        </article>

        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Steg 2
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Granska och exportera</h2>
          <p className="mt-2 text-[color:var(--muted)]">
            När underlaget är klart markeras det som granskat och kan exporteras till Word eller PDF.
          </p>
          <Link
            href="/workspace?view=dokument"
            className="mt-4 inline-flex rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
          >
            Gå till dokumentgranskning
          </Link>
        </article>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Rekommenderat arbetssätt</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">1. Samla fakta</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Fyll i verksamhet, rutiner och ansvar i appen.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">2. Skriv utkast</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Generera dokument i appen och justera innehållet direkt.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">3. Exportera</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Ladda ner som Word när materialet ska delas eller skickas in.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/workspace"
          className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
        >
          Till startsida
        </Link>
        <Link
          href="/workspace?view=ledningssystem"
          className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
        >
          Till arbetsyta
        </Link>
      </div>
    </div>
  );
}
