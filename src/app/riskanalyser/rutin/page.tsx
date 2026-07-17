const legalBasis = [
  "Patientsäkerhetslagen (2010:659)",
  "SOSFS 2011:9 - ledningssystem för systematiskt kvalitetsarbete",
  "Patientdatalagen (2008:355) och dataskyddsregler",
  "Riskbedömning ska göras löpande och vid förändringar i verksamheten",
];

const processSteps = [
  "Identifiera risk i process, moment eller förändring.",
  "Beskriv orsaker, möjliga konsekvenser och befintliga skydd.",
  "Skatta sannolikhet (1-5) och konsekvens (1-5).",
  "Beräkna riskvärde och prioritera åtgärdsbehov.",
  "Besluta åtgärder, ansvarig roll och tidplan.",
  "Följ upp effekt och uppdatera riskstatus.",
  "Knyt vid behov till avvikelsehantering och rutinuppdatering.",
];

const minimumRequirements = [
  "Risk ska ha ansvarig roll och uppföljningsdatum",
  "Riskvärde ska vara spårbart över tid",
  "Höga risker ska ha dokumenterad åtgärdsplan",
  "Stängning först efter verifierad effekt",
];

export default function RiskanalysRutinPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Klinikklar</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Riskanalysrutin (utkast)</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Den här sidan dokumenterar hur riskanalyser ska genomföras i verksamheten. Formuläret i
          Riskanalyser stödjer registrering, men lagkrav omfattar även metod, ansvar och uppföljning.
        </p>
      </header>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-lg font-semibold text-[color:var(--ink)]">Rättslig grund</h2>
        <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
          {legalBasis.map((item) => (
            <li key={item} className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-lg font-semibold text-[color:var(--ink)]">Process</h2>
        <ol className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
          {processSteps.map((item, index) => (
            <li key={item} className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2">
              <span className="font-semibold text-[color:var(--ink)]">Steg {index + 1}:</span> {item}
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-lg font-semibold text-[color:var(--ink)]">Minimikrav i praktiken</h2>
        <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
          {minimumRequirements.map((item) => (
            <li key={item} className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">Viktigt om lagkrav</h2>
        <p className="mt-2 text-sm text-amber-900">
          Detta är ett utkast och behöver fastställas av ansvarig funktion samt anpassas till er
          verksamhetsform innan det kan betraktas som fullt lagkravsanpassat.
        </p>
      </section>

      <a
        href="/workspace?view=riskanalyser"
        className="inline-flex rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
      >
        Tillbaka till Riskanalyser
      </a>
    </main>
  );
}
