import Link from "next/link";
import Image from "next/image";

const heroBullets = [
  "Ledningssystem, egenkontroll och avvikelsehantering i samma arbetsyta",
  "AI som skriver utkast, sammanfattar risker och föreslår åtgärder",
  "IVO-förberedelse som en modul i ett löpande kvalitetssystem",
];

const featureHighlights = [
  {
    title: "Löpande efterlevnad",
    text: "Få koll på kravbilden vecka för vecka, inte bara vid ansökan.",
  },
  {
    title: "AI-stödda rutiner",
    text: "Skapa och uppdatera processer, rutiner och underlag med AI.",
  },
  {
    title: "Modulbaserad kontroll",
    text: "Arbeta i moduler för risk, avvikelse, egenkontroll och förbättring.",
  },
  {
    title: "Inspektionsberedskap",
    text: "Ha dokumentation och historik redo när tillsyn eller revision sker.",
  },
];

const processSteps = [
  "Bygg ert ledningssystem med klinikprofil, roller och processer",
  "Planera återkommande kontroller, riskarbete och avvikelseflöden",
  "Generera, granska och exportera underlag för intern styrning och IVO",
];

const customerJourneySteps = [
  {
    step: "Steg 1",
    title: "Bli klinikklar",
    text: "Hjälp med tillstånd, dokument och uppstart så att kliniken kommer igång tryggt.",
  },
  {
    step: "Steg 2",
    title: "Driv kliniken rätt",
    text: "Ett levande ledningssystem med rutiner, avvikelser och egenkontroller.",
  },
  {
    step: "Steg 3",
    title: "Var alltid redo",
    text: "AI håller koll på regeländringar och hjälper kliniken att vara förberedd inför tillsyn och interna kvalitetsgenomgångar.",
  },
];

const pricingPlans = [
  {
    id: "step1",
    badge: "Engångspaket",
    title: "Klinikklar Start",
    price: "19 900 kr",
    billing: "",
    description: "Kom igång med tillstånd, grundstruktur och komplett uppstartsstöd.",
    features: [
      "IVO",
      "Ledningssystem",
      "Dokument",
      "AI",
      "Checklistor",
      "Support",
    ],
    ctaLabel: "Välj Klinikklar Start",
    ctaHref: "/login?next=/workspace&plan=step1",
  },
  {
    id: "step2",
    badge: "Löpande",
    title: "Klinikklar Drift",
    price: "995 kr",
    billing: "/mån",
    description: "För daglig drift med strukturerat kvalitetsarbete och uppföljning.",
    features: [
      "Uppdateringar",
      "Avvikelser",
      "Rutiner",
      "Riskanalyser",
      "Årshjul",
    ],
    ctaLabel: "Välj Klinikklar Drift",
    ctaHref: "/login?next=/workspace&plan=step2",
    highlighted: true,
  },
  {
    id: "step3",
    badge: "Utökad nivå",
    title: "Klinikklar Premium",
    price: "2 495 kr",
    billing: "/mån",
    description: "För kliniker som vill ha proaktiv AI-styrning och hög revisionsberedskap.",
    features: [
      "AI Compliance Officer",
      "Regelbevakning",
      "AI-förslag",
      "Revision",
      "Internkontroll",
    ],
    ctaLabel: "Välj Klinikklar Premium",
    ctaHref: "/login?next=/workspace&plan=step3",
  },
];

function CheckBullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3 text-[17px] leading-8 text-[color:var(--ink)]">
      <span className="mt-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--brand)] text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6">
          <path d="M20 7 10 17l-6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{text}</span>
    </li>
  );
}

function FeatureIcon({ index }: { index: number }) {
  const icons = [
    <path key="a" d="M7 4h7l4 4v12H7zM14 4v4h4M10 12h5M10 16h5" />,
    <path key="b" d="M4 17.5V20h2.5L17 9.5 14.5 7 4 17.5ZM13 8.5l2.5 2.5M8 20h12" />,
    <path key="c" d="m5 12 4 4L19 6" />,
    <path key="d" d="M12 3a4 4 0 0 0-4 4v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a4 4 0 0 0-4-4Zm-2 6V7a2 2 0 1 1 4 0v2" />,
  ];

  return (
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
      <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[index]}
      </svg>
    </span>
  );
}

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-6 pb-16 pt-6 lg:px-8 lg:pt-10">
      <section className="grid items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="max-w-[560px]">
          <h1 className="font-display text-[3.5rem] font-semibold leading-[0.94] tracking-[-0.06em] text-[color:var(--ink)] md:text-[5.5rem]">
            AI-ledningssystem för <span className="text-[color:var(--brand)]">privat tandvård</span>.
          </h1>
          <p className="mt-7 max-w-[520px] text-[1.45rem] leading-9 text-[color:var(--muted)]">
            Klinikklar hjälper kliniker att arbeta strukturerat med kvalitet, patientsäkerhet
            och efterlevnad varje månad, med IVO-underlag som en naturlig del.
          </p>
          <ul className="mt-8 space-y-3">
            {heroBullets.map((item) => (
              <CheckBullet key={item} text={item} />
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/workspace"
              className="rounded-xl bg-[color:var(--brand)] px-8 py-4 text-[17px] font-semibold text-white shadow-[0_18px_40px_rgba(42,184,111,0.28)] transition hover:bg-[color:var(--brand-2)]"
            >
              Kom igång idag
            </Link>
            <a
              href="#sa-fungerar-det"
              className="inline-flex items-center gap-3 rounded-xl border border-[color:var(--line)] bg-white px-7 py-4 text-[17px] font-semibold text-[color:var(--ink)] shadow-[0_12px_30px_rgba(13,39,87,0.06)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--panel)] text-[color:var(--ink)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M8 6v12l10-6z" />
                </svg>
              </span>
              Se hur det fungerar
            </a>
          </div>
          <div className="mt-10 flex items-center gap-3 text-[17px] text-[color:var(--muted)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3 5 6v5c0 4.5 2.8 8.4 7 10 4.2-1.6 7-5.5 7-10V6l-7-3Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m9.5 12 1.7 1.7 3.3-3.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Utvecklat för svensk vård. Byggt för trygghet.
          </div>
        </div>

        <div className="relative min-h-[620px]">
          <div className="hero-glow absolute inset-0 overflow-hidden rounded-[2rem] border border-[color:var(--line)] bg-white">
            <Image
              src="/images/hero-dentist.png"
              alt="Tandläkare i klinikmiljö"
              fill
              priority
              className="object-cover"
              style={{ objectPosition: "78% 42%" }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.4),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(236,244,252,0.75)_100%)]" />
          </div>

          <div className="absolute right-0 top-24 w-[240px] rounded-[1.6rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_20px_45px_rgba(13,39,87,0.12)]">
            <p className="text-sm font-medium text-[color:var(--muted)]">IVO-ansökan</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-semibold tracking-[-0.05em] text-[color:var(--brand)]">72%</span>
              <span className="pb-2 text-sm font-medium text-[color:var(--brand-2)]">uppfyllt</span>
            </div>
            <div className="mt-4 h-3 rounded-full bg-[#eaf0f6]">
              <div className="h-full w-[72%] rounded-full bg-[color:var(--brand)]" />
            </div>
            <button className="mt-5 flex w-full items-center justify-between rounded-xl border border-[color:var(--line)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--ink)]">
                  Öppna dagens åtgärder
              <span aria-hidden="true">&gt;</span>
            </button>
          </div>

          <div className="absolute bottom-12 right-0 w-[286px] rounded-[1.6rem] border border-[color:var(--line)] bg-white p-5 shadow-[0_20px_45px_rgba(13,39,87,0.12)]">
            <p className="text-base font-semibold text-[color:var(--ink)]">Dokument</p>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--muted)]">
              {[
                "Ledningssystem",
                "Egenkontrollplan",
                "Avvikelsejournal",
                "Riskregister",
                "Förbättringsplan",
              ].map((item) => (
                <li key={item} className="flex items-center justify-between gap-3">
                  <span>{item}</span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--brand-soft)] text-[color:var(--brand)]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6">
                      <path d="M20 7 10 17l-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </li>
              ))}
            </ul>
            <button className="mt-5 flex w-full items-center justify-between text-sm font-semibold text-[color:var(--ink)]">
              Visa alla dokument
              <span aria-hidden="true">&gt;</span>
            </button>
          </div>

          <div className="absolute bottom-2 left-[15%] max-w-[330px] rounded-[1.4rem] border border-[color:var(--line)] bg-white/96 px-5 py-4 shadow-[0_20px_40px_rgba(13,39,87,0.1)]">
            <p className="text-base font-semibold text-[color:var(--muted)]">
              Vi använder Klinikklar varje vecka för att styra kvalitet och patientsäkerhet.
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Tandläkare, Stockholm</p>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-8 rounded-[2rem] border border-[color:var(--line)] bg-white px-8 py-9 lg:grid-cols-4">
        {featureHighlights.map((item, index) => (
          <article key={item.title} className="flex items-start gap-4">
            <FeatureIcon index={index} />
            <div>
              <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                {item.title}
              </h2>
              <p className="mt-2 text-[15px] leading-7 text-[color:var(--muted)]">{item.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section id="sa-fungerar-det" className="mt-18 grid gap-8 pt-16 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Så fungerar det
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
            Från daglig kvalitetsstyrning till komplett tillsynsunderlag
          </h2>
        </div>
        <div className="grid gap-4">
          {processSteps.map((step, index) => (
            <article key={step} className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
                Steg 0{index + 1}
              </p>
              <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="funktioner" className="mt-18 grid gap-6 pt-16 md:grid-cols-2 xl:grid-cols-3">
        {[
          "Modul för ledningssystem med ansvar, processer och årshjul",
          "Egenkontroller med frekvens, ägare och förfallodatum",
          "Avvikelsehantering med status, åtgärd och återkoppling",
          "Riskregister med prioritering och uppföljning",
          "Förbättringsplaner som kopplar åtgärder till rotorsak",
          "IVO-beredskap med exporterbara underlag och historik",
        ].map((feature) => (
          <article key={feature} className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
            <p className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--ink)]">{feature}</p>
          </article>
        ))}
      </section>

      <section id="tre-steg" className="mt-18 pt-16">
        <div className="rounded-[2rem] border border-[color:var(--line)] bg-white p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Erbjudande i tre steg
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
            Samma plattform genom hela klinikresan
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {customerJourneySteps.map((item) => (
              <article
                key={item.step}
                className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                  {item.step}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-[color:var(--muted)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="priser" className="mt-18 pt-16">
        <div className="rounded-[2rem] border border-[color:var(--line)] bg-[linear-gradient(180deg,#ffffff_0%,#f2f8fd_100%)] p-8 lg:p-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">Priser</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
              Välj nivå efter var kliniken befinner sig
            </h2>
            <p className="mt-4 text-lg leading-8 text-[color:var(--muted)]">
              Börja i rätt steg och väx vidare i samma plattform när behovet ökar.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article
                key={plan.id}
                className={`flex h-full flex-col rounded-3xl border p-6 shadow-[0_16px_40px_rgba(13,39,87,0.05)] ${
                  plan.highlighted
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                    : "border-[color:var(--line)] bg-white"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand)]">
                  {plan.badge}
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[color:var(--ink)]">
                  {plan.title}
                </h3>
                <div className="mt-3 flex items-end gap-1">
                  <p className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--ink)]">
                    {plan.price}
                  </p>
                  <p className="pb-1 text-sm text-[color:var(--muted)]">{plan.billing}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{plan.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-[color:var(--ink)]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-[color:var(--brand)]" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaHref}
                  className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-[color:var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--brand-2)]"
                >
                  {plan.ctaLabel}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="om-oss" className="mt-18 grid gap-6 pt-16 lg:grid-cols-2">
        <article className="rounded-[2rem] border border-[color:var(--line)] bg-white p-8 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">Om oss</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
            Byggt för svensk privat tandvård
          </h2>
          <p className="mt-4 text-[17px] leading-8 text-[color:var(--muted)]">
            Klinikklar är framtaget för att minska administration kring styrning,
            kvalitetssystem och dokumentation utan att bli ett journalsystem.
          </p>
        </article>
        <article id="kunskapsbank" className="rounded-[2rem] border border-[color:var(--line)] bg-white p-8 shadow-[0_16px_40px_rgba(13,39,87,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">Kunskapsbank</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.05em] text-[color:var(--ink)]">
            Mallar, regler och arbetsstöd på ett ställe
          </h2>
          <p className="mt-4 text-[17px] leading-8 text-[color:var(--muted)]">
            Plattformen förbereds för en versionshanterad regel- och mallbank så att nya krav
            kan rullas ut som en del av ett löpande compliance-abonnemang.
          </p>
        </article>
      </section>
    </div>
  );
}
