import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { COMPANY_INFO } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Integritetspolicy | Klinikklar",
};

export default function IntegritetspolicyPage() {
  return (
    <LegalPageLayout title="Integritetspolicy" updated="30 juli 2026">
      <h2>1. Personuppgiftsansvarig</h2>
      <p>
        {COMPANY_INFO.name}, org.nr {COMPANY_INFO.orgNumber} (&quot;Klinikklar&quot;, &quot;vi&quot;), är
        personuppgiftsansvarig för behandlingen av personuppgifter som beskrivs i denna policy.
        Frågor om vår personuppgiftsbehandling kan skickas till {COMPANY_INFO.email}.
      </p>

      <h2>2. Vilka personuppgifter vi behandlar</h2>
      <p>Vi behandlar följande kategorier av personuppgifter, baserat på hur tjänsten är uppbyggd idag:</p>
      <ul>
        <li>
          <strong>Kontouppgifter:</strong> namn och e-postadress kopplade till ditt användarkonto
          (inloggning sker via vår leverantör Supabase).
        </li>
        <li>
          <strong>Organisationsuppgifter:</strong> organisationsnamn, organisationsnummer, e-post
          och telefonnummer för den klinik/organisation du representerar.
        </li>
        <li>
          <strong>Klinikuppgifter:</strong> adress, postnummer, kommun och region för respektive
          klinik.
        </li>
        <li>
          <strong>Uppgifter om ansvariga personer:</strong> namn, roll, legitimationsnummer och
          uppgift om verksamhetschef, som registreras i samband med kravet &quot;Ansvariga
          personer, roller och legitimationer&quot; (R-07).
        </li>
        <li>
          <strong>Ägaruppgifter:</strong> ägarnamn, ägarandel och lämplighetsbedömning i samband
          med kravet &quot;Ägarbild och lämplighetsuppgifter&quot; (R-08).
        </li>
        <li>
          <strong>Ekonomiska uppgifter:</strong> förväntad omsättning, förväntade kostnader,
          finansieringskälla och egna anteckningar i samband med kravet &quot;Ekonomiska
          förutsättningar&quot; (R-10).
        </li>
        <li>
          <strong>Uppladdade dokument:</strong> filer som laddas upp som bilagor till kraven ovan
          (t.ex. registreringsbevis, ägarbevis, kompetensintyg), som lagras i vår molnlagring
          (Supabase Storage).
        </li>
      </ul>

      <h2>3. Varför vi behandlar uppgifterna</h2>
      <ul>
        <li>För att tillhandahålla tjänsten och fullgöra avtalet med dig och din klinik.</li>
        <li>
          För att hjälpa er ta fram och strukturera underlag inför tillståndsansökan och tillsyn.
        </li>
        <li>För kontohantering, support och säkerhet, t.ex. inloggning och sessionshantering.</li>
      </ul>
      <p>
        [Rättslig grund per kategori – avtal, rättslig förpliktelse respektive berättigat intresse
        – ska specificeras av jurist innan publicering.]
      </p>

      <h2>4. Var uppgifterna lagras</h2>
      <p>
        Uppgifterna lagras hos vår databas- och lagringsleverantör Supabase [region att bekräfta,
        t.ex. EU/EES]. Uppgifterna sparas så länge du har ett aktivt konto eller så länge det krävs
        enligt tillämplig lagstiftning [exakt lagringstid per kategori att fastställa].
      </p>

      <h2>5. Vilka vi delar uppgifter med</h2>
      <ul>
        <li>
          <strong>Supabase</strong> – databas, autentisering och fillagring (personuppgiftsbiträde).
        </li>
        <li>
          <strong>OpenAI</strong> – om AI-funktioner i tjänsten används för att generera
          textutkast, kan relevant textinnehåll skickas till OpenAIs API för bearbetning.
        </li>
      </ul>
      <p>Vi säljer aldrig dina personuppgifter till tredje part.</p>

      <h2>6. Dina rättigheter</h2>
      <p>
        Du har rätt att begära tillgång till, rättelse av eller radering av dina personuppgifter,
        samt rätt att invända mot eller begränsa behandlingen i vissa fall. Du har även rätt att
        lämna klagomål till Integritetsskyddsmyndigheten (IMY).
      </p>

      <h2>7. Cookies</h2>
      <p>
        Vi använder cookies för inloggning och säker session. Se vår{" "}
        <Link href="/cookiepolicy">cookiepolicy</Link> för fullständig information.
      </p>

      <h2>8. Ändringar av policyn</h2>
      <p>Vi kan komma att uppdatera denna policy. Väsentliga ändringar meddelas i tjänsten.</p>

      <h2>9. Kontakt</h2>
      <p>{COMPANY_INFO.email}</p>
    </LegalPageLayout>
  );
}
