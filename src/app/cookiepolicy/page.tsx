import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Cookiepolicy | Klinikklar",
};

export default function CookiepolicyPage() {
  return (
    <LegalPageLayout title="Cookiepolicy" updated="30 juli 2026">
      <h2>1. Vad är cookies</h2>
      <p>
        En cookie är en liten textfil som sparas i din webbläsare. Vissa cookies är strikt
        nödvändiga för att en tjänst ska fungera, t.ex. för att hålla dig inloggad.
      </p>

      <h2>2. Cookies vi använder idag</h2>
      <p>
        Klinikklar använder i dagsläget endast strikt nödvändiga cookies för inloggning och
        session, satta av vår autentiseringsleverantör Supabase. Vi använder inga analys-,
        marknadsförings- eller tredjepartscookies.
      </p>
      <table>
        <thead>
          <tr>
            <th>Namn (mönster)</th>
            <th>Ändamål</th>
            <th>Kategori</th>
            <th>Varaktighet</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>sb-*-auth-token</td>
            <td>Håller dig inloggad och din session säker</td>
            <td>Strikt nödvändig</td>
            <td>Så länge sessionen är aktiv / enligt Supabase standardinställning</td>
          </tr>
          <tr>
            <td>klinikklar_cookie_notice</td>
            <td>Kommer ihåg att du har sett cookieinformationen</td>
            <td>Strikt nödvändig</td>
            <td>12 månader</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Vad vi inte använder</h2>
      <p>
        Vi använder inte cookies för analys (t.ex. Google Analytics), marknadsföring, eller
        spårning mellan webbplatser. Eftersom det bara finns strikt nödvändiga cookies idag krävs
        inget aktivt samtycke enligt gällande regler – vi informerar dig istället om att de
        används.
      </p>

      <h2>4. Så hanterar du cookies</h2>
      <p>
        Du kan när som helst se den här informationen igen via länken &quot;Cookieinformation&quot;
        i sidfoten. Du kan även blockera eller radera cookies i din webbläsares inställningar,
        men observera att inloggning då kan sluta fungera.
      </p>

      <h2>5. Ändringar</h2>
      <p>
        Om vi i framtiden lägger till cookies som inte är strikt nödvändiga (t.ex. för analys)
        kommer denna policy att uppdateras och du kommer att tillfrågas om ett aktivt samtycke
        innan sådana cookies sätts.
      </p>
    </LegalPageLayout>
  );
}
