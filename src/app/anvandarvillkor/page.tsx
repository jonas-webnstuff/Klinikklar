import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

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
        Avtalet ingås mellan [BOLAGSNAMN] och den organisation (klinik) som registrerar ett
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
        [Betalnings- och uppsägningsvillkor per plan – engångsinsats respektive löpande
        abonnemang med eventuell startavgift – ska specificeras och granskas innan publicering.]
      </p>

      <h2>5. Immateriella rättigheter</h2>
      <p>
        Klinikklar och dess innehåll (utom kundens egna uppladdade uppgifter och dokument) tillhör
        [BOLAGSNAMN] eller dess licensgivare. Kunden behåller äganderätten till de uppgifter och
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
        [Villkor för uppsägning av abonnemang och eventuell radering/export av uppgifter vid
        avslut ska specificeras.]
      </p>

      <h2>8. Tillämplig lag och tvist</h2>
      <p>Svensk lag ska tillämpas på dessa villkor. [Forum/tvistlösning att fastställa.]</p>

      <h2>9. Ändringar av villkoren</h2>
      <p>Vi kan komma att uppdatera dessa villkor. Väsentliga ändringar meddelas i tjänsten.</p>

      <h2>10. Kontakt</h2>
      <p>[E-POST]</p>
    </LegalPageLayout>
  );
}
