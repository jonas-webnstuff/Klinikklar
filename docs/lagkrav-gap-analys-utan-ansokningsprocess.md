# Lagkrav-Gapanalys (utan ansökningsprocess)

Datum: 2026-07-17
Scope: Bedömning av nuläge i Klinikklar för ledningssystem, avvikelser, riskanalyser och årshjul/egenkontroll för tandvårdskliniker med 1-10 medarbetare. Ansökningsprocessen är medvetet exkluderad.

## Sammanfattning

Övergripande bedömning: Delvis uppfyllt.

- Starkt läge i struktur och dokumentation: systemstöd och utkast till rutiner finns för centrala områden.
- Kvarstående gap finns i formellt fastställande, verifierad praktisk tillämpning, behörighetstester och tillsynsbar spårbarhet.
- Kravnivån i denna version är proportionerad för mindre verksamhet: enkel dokumentation, tydligt ansvar och verifierbar tillämpning utan onödig administration.
- Rekommendation: Inte kalla läget "fullt lagkravsuppfyllt" ännu. Sätt status "pilot med kvarstående compliance-gap" tills kritiska punkter nedan är stängda.

## Bedömning Per Kravområde

### 1) Ledningssystem för systematiskt kvalitetsarbete

Status: Delvis uppfyllt

Styrkor:
- Struktur för ledningssystem finns i arbetsytan.
- Kravchecklista och styrande dokument-fält finns.
- Rutiner för avvikelse, risk och årshjul är länkade i UI.

Gap:
- Formellt beslut, fastställande och versionsstyrning behöver säkras organisatoriskt.
- Bevis på faktisk uppföljning i drift saknas (månatlig eller kvartalsvis räcker för små kliniker).
- Rollen "godkänd av" behöver användas konsekvent i verksamhetsprocessen.

### 2) Avvikelsehantering

Status: Delvis uppfyllt

Styrkor:
- Funktioner för registrering, statushantering och uppföljning finns.
- Dokumenterad avvikelsehanteringsrutin finns.
- Enkel avvikelseprocess utan onödiga blockeringar för små kliniker.
- Ansvar och eskalering kan kommuniceras via introduktion i små team.

Gap:
- Formell dokumentation av beslutad avvikelserutin med ansvarig roll och eskaleringsväg krävs (redan rutiniserad).

### 3) Riskhantering

Status: Delvis uppfyllt

Styrkor:
- Riskregister med sannolikhet, konsekvens, riskvärde och status finns.
- Dokumenterad riskanalysrutin finns.

Gap:
- Enhetlig metodik och tröskelvärden för prioritering behöver beslutas och dokumenteras i enkel modell.
- Höga risker ska ha uppdaterad status och åtgärdsplan i systemet.

### 4) Årshjul och egenkontroller

Status: Delvis uppfyllt

Styrkor:
- Kontrollmodul, statusflöde och ett-klicks årschecklista finns.
- Dokumenterad kontrollrutin för årshjul finns.

Gap:
- Resultatrad (utfall, avvikelse ja/nej, åtgärd, deadline) behöver dokumenteras med enkel mall i varje kontrollcykel.
- Rutin för försenade kontroller behöver dokumenterad tillämpning (kan hanteras i ordinarie uppföljningsmöte i små kliniker).

### 5) Informationssäkerhet, åtkomst och dataskydd

Status: Delvis uppfyllt

Styrkor:
- Datamodell med organisationstillhörighet finns.
- Skyddstänk kring sekretess och personuppgifter finns i rutindokument.

Gap:
- Åtkomstregler mellan användare/organisationer behöver verifieras i testunderlag.
- Enkel behörighetsmatris per roll behöver dokumenteras.
- Rutiner för logggranskning vid behov behöver beslutas.

### 6) Spårbarhet, audit trail och tillsynsbar evidens

Status: Delvis uppfyllt

Styrkor:
- Pilotmatris finns och arbetssätt för testning är etablerat.
- Struktur för uppföljning finns i systemet.

Gap:
- Auth/RLS-separation mellan organisationer behöver testas och verifieras.
- Kritiska funktioner (registrering, statusbyte, stängning) behöver loggas.
- Spårbarhet för avvikelse/risk/kontroll behöver fungera end-to-end.

## Riskklassning Av Kvarstående Gap

- Hög:
  - Ej verifierad auth/RLS-separation mellan organisationer.
  - Ej slutförd verifiering av audit trail i kritiska flöden.
  - Avsaknad av formellt beslutad och fastställd rutinportfölj i drift.
- Medel:
  - Ojämt dokumenterad uppföljning av åtgärder i allvarliga eller återkommande ärenden.
  - Ej dokumenterad enkel behörighetsmatris och access review-rutiner.

## Prioriterad Åtgärdsplan (Go/No-Go)

### P0 (måste stängas före "lagkrav uppfyllt")

1. Formellt fastställ rutinerna för avvikelse, risk och årshjul.
- Leverabel: signerade versioner med beslutsdatum, ansvarig funktion och revideringsintervall.

2. Kör och dokumentera auth/RLS-verifiering med testkonton.
- Leverabel: testprotokoll med pass/fail för grundläggande separation mellan organisationer.

3. Verifiera audit trail i kritiska flöden.
- Leverabel: bevis på loggning för statusbyte, skapande, uppdatering och stängning.

4. Säkerställ att export fungerar i inloggat, godkänt flöde.
- Leverabel: godkända DOCX/PDF-tester med versionsspårning.

5. Säkerställ enkel, beslutad avvikelserutin med ansvar och eskalering.
- Leverabel: dokumenterad rutin med ansvarig roll, när eskalering sker och hur personal informeras.

### P1 (stängs direkt efter P0)

6. Inför proportionerad effektuppföljning för allvarliga eller återkommande ärenden.
- Leverabel: dokumenterad check med datum, ansvarig och uppföljt utfall i relevanta ärenden.

7. Upprätta enkel behörighetsmatris per roll.
- Leverabel: dokumenterad matris för tandläkare, tandvårdskonsult, administratör och ansvarig.

8. Dokumentera dataskyddsrutiner för gallring, logggranskning och incidenthantering.
- Leverabel: beslutad rutin + genomförd första kontroll.

### P2 (mognad)

9. Etablera enkel uppföljning och rapportering för ledning.
- Exempel: öppna avvikelser, status på åtgärder, försenade kontroller.

10. Genomför årlig granskning av rutiner och system.
- Leverabel: enkelt granskningsmöte med protokoll och eventuella uppdateringar.

## Rekommenderad Beslutsstatus Nu

- Rekommenderad status: No-Go för påstående "alla lagkrav uppfyllda".
- Rekommenderad status: Go för fortsatt pilotdrift med tydlig åtgärdsplan och tidsatta ägare.

## Definition Av "Lagkrav Uppfyllt" I Detta Projekt

Använd följande kriterier innan status ändras till uppfyllt:

- Rutiner är fastställda, signerade och kommunicerade.
- Kritiska auth/RLS- och audit-tester är passerade och dokumenterade.
- Processkedjan fungerar i praktik: avvikelse/risk/kontroll -> åtgärd -> uppföljt utfall.
- Dataskydd och behörighetsstyrning är verifierade i återkommande, proportionerad kontroll.
- Tillsynsbar evidensmapp finns och är uppdaterad.

---

Notering: Bedömningen ovan är ett operativt compliance-underlag och ersätter inte formell juridisk rådgivning.
