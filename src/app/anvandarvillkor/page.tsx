import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { COMPANY_INFO } from "@/lib/legal/company-info";

export const metadata: Metadata = {
  title: "Användarvillkor | Klinikklar",
};

export default function AnvandarvillkorPage() {
  return (
    <LegalPageLayout title="Användarvillkor" updated="30 juli 2026">
      <h2>1. Om tjänsten</h2>
      <p>
        Klinikklar är en AI-driven complianceplattform för privat tandvård som hjälper kliniker
        att strukturera underlag inför tillståndsansökan samt driva ett löpande ledningssystem
        (rutiner, riskanalyser, avvikelsehantering och årshjul). Aktuella planer och priser
        framgår av vår prissida.
      </p>

      <h2>2. Avtalspart och användare</h2>
      <p>
        Avtalet ingås mellan {COMPANY_INFO.name} och den organisation (klinik) som registrerar ett
        konto. Den fysiska person som skapar eller administrerar kontot ansvarar för att ha
        behörighet att företräda organisationen.
      </p>

      <h2>3. Konto och ansvar för uppgifter</h2>
      <p>
        Du ansvarar för att uppgifter som registreras i tjänsten – t.ex. om ansvariga personer,
        ägarförhållanden och ekonomiska förutsättningar – är korrekta och att du har rätt att
        registrera dem. Du ansvarar även för att skydda dina inloggningsuppgifter.
      </p>

      <h2>4. Betalning och abonnemang</h2>
      <p>
        Klinikklar Ansökan betalas som en engångsavgift i samband med beställning och innebär
        ingen löpande kostnad.
      </p>
      <p>
        Klinikklar Drift, Komplett och Premium innebär en startavgift som betalas i samband med
        beställning, samt en löpande månadsavgift som debiteras automatiskt tills abonnemanget
        sägs upp. Betalning sker via vår betaltjänstleverantör Stripe. Aktuella priser för
        respektive nivå framgår av vår prissida.
      </p>
      <p>
        Vi kan komma att ändra priserna för framtida betalperioder. Väsentliga prisändringar
        meddelas i god tid innan de träder i kraft.
      </p>

      <h2>5. Immateriella rättigheter</h2>
      <p>
        Klinikklar och dess innehåll (utom kundens egna uppladdade uppgifter och dokument) tillhör
        {COMPANY_INFO.name} eller dess licensgivare. Kunden behåller äganderätten till de uppgifter och
        dokument som laddas upp i tjänsten.
      </p>

      <h2>6. Ansvarsbegränsning</h2>
      <p>
        Klinikklar hjälper er att strukturera, sammanställa och ta fram underlag – inklusive
        AI-genererade utkast – men ersätter inte juridisk eller annan professionell rådgivning.
        Kliniken/organisationen ansvarar själv för att den faktiska verksamheten uppfyller
        tillämpliga lagkrav, t.ex. patientsäkerhetslagen och tillståndsvillkor från IVO.
      </p>

      <h2>7. Uppsägning</h2>
      <p>
        Abonnemangen (Drift, Komplett och Premium) löper tills vidare utan bindningstid. Ni kan
        säga upp abonnemanget själva via &quot;Hantera abonnemang&quot; i arbetsytan, eller genom
        att kontakta oss på {COMPANY_INFO.email}. Uppsägning gäller från och med nästa betalperiod –
        redan betald avgift för innevarande period återbetalas inte. Klinikklar Ansökan är en
        engångsprodukt och omfattas inte av uppsägning.
      </p>
      <p>
        Vid avslutat konto hanteras era uppgifter enligt vår integritetspolicy. Ni kan när som
        helst begära export eller radering av era uppgifter i enlighet med GDPR.
      </p>

      <h2>8. Tillämplig lag och tvist</h2>
      <p>
        Svensk lag ska tillämpas på dessa villkor. Tvist med anledning av villkoren ska i första
        hand lösas genom överenskommelse mellan parterna. Kan parterna inte enas ska tvisten
        avgöras av svensk allmän domstol.
      </p>

      <h2>9. Ändringar av villkoren</h2>
      <p>Vi kan komma att uppdatera dessa villkor. Väsentliga ändringar meddelas i tjänsten.</p>

      <h2>10. Kontakt</h2>
      <p>{COMPANY_INFO.email}</p>
    </LegalPageLayout>
  );
}
