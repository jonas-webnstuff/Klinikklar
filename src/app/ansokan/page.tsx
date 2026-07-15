"use client";

import Link from "next/link";
import useLocalStorage from "@/hooks/useLocalStorage";

type ApplicationStage = "draft" | "review" | "approved" | "submitted";

const stages: Array<{
  key: ApplicationStage;
  title: string;
  description: string;
}> = [
  {
    key: "draft",
    title: "Utkast",
    description: "Fyll i frågeguiden och samla underlag.",
  },
  {
    key: "review",
    title: "Klar för granskning",
    description: "Gå igenom dokument och kontrollera innehållet.",
  },
  {
    key: "approved",
    title: "Godkänd",
    description: "Materialet är klart för inskick.",
  },
  {
    key: "submitted",
    title: "Inskickad",
    description: "Ansökan är skickad och låst för vidare ändringar.",
  },
];

const stageLabels: Record<ApplicationStage, string> = {
  draft: "Utkast",
  review: "Klar för granskning",
  approved: "Godkänd",
  submitted: "Inskickad",
};

export default function AnsokanPage() {
  const [applicationStage, setApplicationStage] = useLocalStorage<ApplicationStage>(
    "klinikklar-ansokan-stage",
    "draft"
  );

  const activeStageIndex = stages.findIndex((stage) => stage.key === applicationStage);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Ansökan
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">Frågeguide och underlag</h1>
        <p className="mt-3 max-w-3xl text-[color:var(--muted)]">
          Här samlar vi frågeguiden, dokumentgranskning och export inför inskick. Status sparas
          automatiskt i webbläsaren.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
          Nuvarande status: {stageLabels[applicationStage]}
        </div>
      </header>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
              Flöde
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Steg för ansökan</h2>
          </div>
          <p className="text-sm text-[color:var(--muted)]">Sparas automatiskt</p>
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
          {applicationStage !== "draft" ? (
            <button
              type="button"
              onClick={() => setApplicationStage("draft")}
              className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
            >
              Återställ till utkast
            </button>
          ) : null}
          {applicationStage === "draft" ? (
            <button
              type="button"
              onClick={() => setApplicationStage("review")}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Markera klar för granskning
            </button>
          ) : null}
          {applicationStage === "review" ? (
            <button
              type="button"
              onClick={() => setApplicationStage("approved")}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Godkänn ansökan
            </button>
          ) : null}
          {applicationStage === "approved" ? (
            <button
              type="button"
              onClick={() => setApplicationStage("submitted")}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
            >
              Markera som inskickad
            </button>
          ) : null}
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
