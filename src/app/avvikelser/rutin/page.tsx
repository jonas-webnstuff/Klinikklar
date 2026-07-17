const legalBasis = [
  "Patientsäkerhetslagen (2010:659)",
  "SOSFS 2011:9 - ledningssystem för systematiskt kvalitetsarbete",
  "Patientdatalagen (2008:355) och dataskyddsregler",
  "Offentlighets- och sekretesslag (2009:400) eller motsvarande sekretesskrav",
  "Lex Maria/Lex Sarah där verksamhetsform kräver det",
];

const processSteps = [
  "Omedelbar hantering och riskreducering.",
  "Registrering av avvikelse med obligatoriska uppgifter.",
  "Initial bedömning inom 24 timmar eller nästa arbetspass.",
  "Utredning och orsaksanalys (enkel eller djupgående efter allvarlighetsgrad).",
  "Åtgärdsplan med ansvar och tidsram.",
  "Bedömning av eventuell extern anmälan (Lex Maria vid allvarliga händelser).",
  "Uppföljning av åtgärd och stängning när åtgärd är genomförd.",
];

const minimumSla = [
  "Registrering: samma arbetspass eller senast inom 24 timmar",
  "Initial bedömning: inom 24 timmar eller nästa arbetspass",
  "Åtgärder: beslutas och startas inom 3-5 arbetsdagar",
  "Stängning: när åtgärd är genomförd och uppföljd (ca 14-30 dagar för normala ärenden)",
];

export default function AvvikelseRutinPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Klinikklar</p>
        <h1 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
          Avvikelsehanteringsrutin (utkast)
        </h1>
        <p className="mt-3 text-sm text-[color:var(--muted)]">
          Den här sidan dokumenterar rutinen för hur avvikelser ska hanteras från rapportering till
          uppföljning. Systemet stödjer rapportering, men lagkrav omfattar hela processen.
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
        <h2 className="text-lg font-semibold text-[color:var(--ink)]">Minimikrav på tidsramar</h2>
        <ul className="mt-3 space-y-2 text-sm text-[color:var(--muted)]">
          {minimumSla.map((item) => (
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

      <div className="flex flex-wrap gap-3">
        <a
          href="/workspace?view=avvikelser"
          className="inline-flex rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
        >
          Tillbaka till Avvikelser
        </a>
      </div>
    </main>
  );
}
