# Pilottest: Testmatris (Pass/Fail)

Syfte: Verifiera att Klinikklar fungerar stabilt och spårbart i realistisk testmiljö innan skarp pilot.

## Testmetadata

- Miljö: lokal (http://localhost:3001)
- Datum: 2026-07-15
- Testansvarig: Jonas + GitHub Copilot
- Build/commit: d6dc6fc6

## 1. Setup och miljö

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| S1 | Miljövariabler satta | Kontrollera `.env.local` | URL/keys för Supabase + OpenAI finns | ☑ Pass ☐ Fail | Samtliga nycklar hittades i lokal miljö. |
| S2 | Databas schema applicerat | Kör/validera `supabase/schema.sql` i Supabase | Tabeller, index, RLS och policies finns utan fel | ☐ Pass ☑ Fail | Schema/rader för audit+RLS finns i repo men applicering i Supabase SQL Editor ej verifierad i denna körning. |
| S3 | App startar | Starta med `npm run dev:3001` | App laddar på `http://localhost:3001` | ☑ Pass ☐ Fail | Startsida, arbetsyta och ansökan laddar i browser. |

## 2. Auth och åtkomst (RLS)

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| A1 | Inloggad användare ser egen data | Logga in med User A | Endast org-kopplad data visas | ☐ Pass ☑ Fail | Ej genomfört: saknar aktiv inloggad testsession i denna körning. |
| A2 | Användare utanför org blockeras | Logga in med User B utan medlemskap | Ingen åtkomst till User A:s data | ☐ Pass ☑ Fail | Ej genomfört: kräver två testkonton och org-sättning. |
| A3 | Användare i samma org får åtkomst | Lägg User B i samma org och logga in | Delad org-data visas korrekt | ☐ Pass ☑ Fail | Ej genomfört: kräver två testkonton och org-sättning. |

## 3. Kärnflöde: Arbetsyta till Ansökan

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| F1 | Klinikprofil sparas/laddas | Fyll i Profil och ladda om sidan | Data kvarstår korrekt | ☐ Pass ☐ Fail | |
| F2 | Ledningssystem-fält fungerar | Fyll i ägare, processer, dokument, datum | Värden sparas/laddas utan datatapp | ☐ Pass ☐ Fail | |
| F3 | Frågeguide påverkar readiness | Svara på nyckelfrågor | Checklistan uppdateras enligt svar | ☐ Pass ☐ Fail | |

## 4. Ansökningsstatus och låsning

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| ST1 | Status: draft -> in_review | Byt status i Ansökan | Tillåten övergång sparas och visas | ☐ Pass ☑ Fail | Knappen var disabled och sidan visar "Du måste vara inloggad." |
| ST2 | Status: in_review -> ready_to_submit | Byt status i Ansökan | Tillåten övergång sparas och visas | ☐ Pass ☐ Fail | |
| ST3 | Status: ready_to_submit -> submitted | Byt status i Ansökan | Tillåten övergång sparas och visas | ☐ Pass ☐ Fail | |
| ST4 | Dokument låses efter submitted | Försök redigera efter submitted | Redigering blockeras enligt krav | ☐ Pass ☐ Fail | |

## 5. Evidens och audit trail

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| E1 | Skapa evidenspost | Lägg till evidens i Ansökan | Post skapas och syns i lista | ☐ Pass ☑ Fail | Sidan visar "Du måste vara inloggad." och ingen evidens kunde sparas. |
| E2 | Kravkoppling på evidens | Välj requirement vid skapande | Korrekt requirement-id sparas | ☐ Pass ☐ Fail | |
| E3 | Auditlogg skrivs vid statusbyte | Byt status och uppdatera vy | Audit-event syns med korrekt metadata | ☐ Pass ☐ Fail | |
| E4 | Auditlogg skrivs vid evidens | Skapa evidens och uppdatera vy | Audit-event för evidens visas | ☐ Pass ☐ Fail | |

## 6. AI-generering per plan

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| AI1 | Start-plan ger grundnivå | Generera innehåll med plan=Start | Kortare, enklare processnivå | ☐ Pass ☐ Fail | |
| AI2 | Drift-plan ger mellanläge | Generera innehåll med plan=Drift | Mer operationaliserad processnivå | ☐ Pass ☐ Fail | |
| AI3 | Premium-plan ger hög nivå | Generera innehåll med plan=Premium | Tydligare styrning, uppföljning, ansvar | ☐ Pass ☐ Fail | |

## 7. Export och dokument

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| D1 | Export DOCX | Exportera dokument | Fil laddas ner och går att öppna | ☐ Pass ☑ Fail | Exportknappar var disabled i denna körning (ej redo/inloggad). |
| D2 | Export PDF | Exportera dokument | Fil laddas ner och går att öppna | ☐ Pass ☑ Fail | Exportknappar var disabled i denna körning (ej redo/inloggad). |
| D3 | Innehåll stämmer | Jämför export med senast sparad data | Export speglar aktuellt innehåll | ☐ Pass ☐ Fail | |

## 8. Felhantering och robusthet

| ID | Testfall | Steg | Förväntat resultat | Status | Kommentar |
| --- | --- | --- | --- | --- | --- |
| R1 | Nätverksfel vid API-anrop | Simulera avbrott/offline | Tydligt felmeddelande, ingen korrupt data | ☐ Pass ☐ Fail | |
| R2 | Otillåten statusövergång | Försök ogiltig transition | API blockerar med begripligt fel | ☐ Pass ☐ Fail | |
| R3 | Tomma/ogiltiga indata | Skapa evidens utan obligatoriska fält | Valideringsfel visas korrekt | ☐ Pass ☑ Fail | Validering av indata blockerad av auth; först meddelande "Du måste vara inloggad." |

## Go/No-Go inför skarp pilot

- Go om alla kritiska tester är Pass: A1, A2, ST1, ST2, ST3, ST4, E1, E3, D1
- No-Go om något kritiskt test är Fail
- Åtgärda fail och kör om berörd sektion

## Kritiska buggar funna under test

| ID | Beskrivning | Allvarlighetsgrad | Åtgärdsägare | Status |
| --- | --- | --- | --- | --- |
| B1 |  | Hög/Medel/Låg |  | Öppen/Löst |
