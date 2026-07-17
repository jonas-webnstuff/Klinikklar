const legalBasis = [
  "SOSFS 2011:9 - ledningssystem för systematiskt kvalitetsarbete",
  "Patientsäkerhetslagen (2010:659)",
  "Verksamheten ska planera, följa upp och förbättra återkommande kontroller",
  "Egenkontroller ska dokumenteras med resultat och åtgärd",
];

const processSteps = [
  "Planera kontrollpunkter med frekvens och ansvarig roll.",
  "Genomför kontroll enligt årshjul och dokumentera utfall.",
  "Klassificera avvikelser från förväntat resultat.",
  "Besluta korrigerande åtgärder med tidsfrist.",
  "Följ upp effekt av åtgärder i efterföljande kontroll.",
  "Markera kontroll som klar när genomförd och utfall registrerat.",
  "Eskalera till riskanalys eller avvikelsehantering vid behov.",
];

const minimumRequirements = [
  "Varje kontroll ska ha titel, frekvens och nästa datum",
  "Ansvarig roll ska vara angiven eller tydligt delegerad",
  "Försenade kontroller ska åtgärdas eller dokumenteras (kan hanteras i vanlig uppföljning)",
  "Resultat och beslutade åtgärder ska vara spårbara i systemet",
];

export default function ArshjulRutinPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Klinikklar</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Kontrollrutin för årshjul (utkast)</h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Den här sidan dokumenterar hur planerade kontroller ska styras, följas upp och stängas.
          Funktionen i Årshjul och kontroller stödjer registrering, men processkrav omfattar även
          ansvar, uppföljning och verifierad effekt.
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
          Denna rutin är anpassad för tandvårdskliniker med 1-10 medarbetare. Dokumentet behöver
          fastställas av ansvarig funktion och anpassas till er exakta verksamhetsform innan det
          kan betraktas som fullt lagkravsanpassat.
        </p>
      </section>

      <a
        href="/workspace?view=arshjul"
        className="inline-flex rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
      >
        Tillbaka till Årshjul och kontroller
      </a>
    </main>
  );
}
