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

Gap:
- Lex Maria-beslutsordning behöver formaliseras och tillämpas vid relevanta händelser.
- Effekten av åtgärder behöver följas upp i allvarliga eller återkommande avvikelser (behöver inte vara systemblockerande i varje ärende).
- Eskaleringsvägar och ansvar behöver vara beslutade och kommunicerade till berörd personal (introduktion räcker som grund i små team).

### 3) Riskhantering

Status: Delvis uppfyllt

Styrkor:
- Riskregister med sannolikhet, konsekvens, riskvärde och status finns.
- Dokumenterad riskanalysrutin finns.

Gap:
- Enhetlig metodik och tröskelvärden för prioritering behöver beslutas och dokumenteras i enkel modell.
- Systematiskt bevis på uppföljning av högprioriterade risker över tid saknas.
- Tydlig koppling risk -> åtgärd -> verifierad effekt behöver förstärkas i arbetssätt och evidens.

### 4) Årshjul och egenkontroller

Status: Delvis uppfyllt

Styrkor:
- Kontrollmodul, statusflöde och ett-klicks årschecklista finns.
- Dokumenterad kontrollrutin för årshjul finns.

Gap:
- Obligatorisk resultatrad (utfall, avvikelse ja/nej, åtgärd, deadline, verifiering) behöver säkerställas med enkel mall i varje kontrollcykel.
- Rutin för försenade kontroller behöver dokumenterad tillämpning (kan hanteras i ordinarie uppföljningsmöte i små kliniker).
- Sign-off och ansvar per stängd kontroll behöver visas konsekvent.

### 5) Informationssäkerhet, åtkomst och dataskydd

Status: Delvis uppfyllt

Styrkor:
- Datamodell med organisationstillhörighet finns.
- Skyddstänk kring sekretess och personuppgifter finns i rutindokument.

Gap:
- Full verifiering av åtkomstregler mellan användare/organisationer saknas i testunderlag.
- Rutiner för gallring, logggranskning och incidenthantering för personuppgifter behöver verifieras och dokumenteras i en praktisk miniminivå.
- Enkel behörighetsmatris och återkommande access review saknas i underlaget.

### 6) Spårbarhet, audit trail och tillsynsbar evidens

Status: Delvis uppfyllt

Styrkor:
- Pilotmatris finns och arbetssätt för testning är etablerat.
- Struktur för uppföljning finns i systemet.

Gap:
- Kritiska tester i pilotmatris är inte passerade (särskilt auth/RLS och export i verifierad inloggad körning).
- Audit trail behöver verifieras med faktiska testbevis i end-to-end-flöden.
- Tydlig beviskedja vid tillsyn behöver sammanställas: identifierad brist -> åtgärd -> uppföljt utfall.

## Riskklassning Av Kvarstående Gap

- Hög:
  - Ej verifierad auth/RLS-separation mellan organisationer.
  - Ej slutförd verifiering av audit trail i kritiska flöden.
  - Avsaknad av formellt beslutad och fastställd rutinportfölj i drift.
- Medel:
  - Ojämt dokumenterad uppföljning av åtgärdseffekt i allvarliga eller återkommande ärenden.
  - Ej fullständigt dokumenterad dataskydds- och access review-process.
- Låg:
  - Språklig konsekvens och UX-förtydliganden (pågår och har förbättrats).

## Prioriterad Åtgärdsplan (Go/No-Go)

### P0 (måste stängas före "lagkrav uppfyllt")

1. Formellt fastställ rutinerna för avvikelse, risk och årshjul.
- Leverabel: signerade versioner med beslutsdatum, ansvarig funktion och revideringsintervall.

2. Kör och dokumentera auth/RLS-verifiering med minst två testkonton.
- Leverabel: testprotokoll med pass/fail och skärmdumpar/loggar.

3. Verifiera audit trail i kritiska flöden.
- Leverabel: bevis på loggning för statusbyte, skapande, uppdatering och stängning.

4. Säkerställ att export fungerar i inloggat, godkänt flöde.
- Leverabel: godkända DOCX/PDF-tester med versionsspårning.

5. Säkerställ enkel, beslutad avvikelserutin med ansvar och eskalering.
- Leverabel: dokumenterad rutin med ansvarig roll, när eskalering sker och hur personal informeras.

### P1 (stängs direkt efter P0)

6. Inför proportionerad effektuppföljning för allvarliga eller återkommande ärenden.
- Leverabel: dokumenterad check med datum, ansvarig och uppföljt utfall i relevanta ärenden.

7. Upprätta och tillämpa enkel behörighetsmatris + access review.
- Leverabel: matris per roll och återkommande granskning (exempelvis kvartalsvis).

8. Dokumentera dataskyddsrutiner för gallring, logggranskning och incidenthantering.
- Leverabel: beslutad rutin + genomförd första kontroll.

### P2 (mognad)

9. Etablera KPI-dashboard för compliance.
- Exempel: andel öppna avvikelser > 30 dagar, andel försenade kontroller, andel höga risker utan aktiv åtgärdsplan.

10. Genomför internrevision på kvartalsbasis.
- Leverabel: revisionsprotokoll med avvikelseklassning och åtgärdsuppföljning.

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
