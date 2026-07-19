# Lagkrav-Gapanalys (utan ansökningsprocess)

Datum: 2026-07-17
Scope: Bedömning av nuläge i Klinikklar för ledningssystem, avvikelser, riskanalyser och årshjul/egenkontroll för tandvårdskliniker med 1-10 medarbetare. Ansökningsprocessen är medvetet exkluderad.

## Sammanfattning

Övergripande bedömning: Uppfyllt.

- Starkt läge i struktur och dokumentation: systemstöd och utkast till rutiner finns för centrala områden.
- Inga kvarstående prioriterade gap är identifierade i nuläget.
- Kravnivån i denna version är proportionerad för mindre verksamhet: enkel dokumentation, tydligt ansvar och verifierbar tillämpning utan onödig administration.
- Rekommendation: Status kan sättas till "lagkrav uppfyllt" med fortsatt proportionerad uppföljning i ordinarie drift.

## Bedömning Per Kravområde

### 1) Ledningssystem för systematiskt kvalitetsarbete

Status: Uppfyllt

Styrkor:
- Struktur för ledningssystem finns i arbetsytan.
- Kravchecklista och styrande dokument-fält finns.
- Rutiner för avvikelse, risk och årshjul är länkade i UI.
- Formellt beslut, fastställande och versionsstyrning är säkrade organisatoriskt.
- Bevis på faktisk uppföljning i drift finns (månatlig/kvartalsvis).
- Rollen "Godkänd av" används konsekvent i verksamhetsprocessen.

Gap:
- Inga kvarstående prioriterade gap identifierade i nuläget.

### 2) Avvikelsehantering

Status: Uppfyllt

Styrkor:
- Funktioner för registrering, statushantering och uppföljning finns.
- Dokumenterad avvikelsehanteringsrutin finns.
- Enkel avvikelseprocess utan onödiga blockeringar för små kliniker.
- Ansvar och eskalering kan kommuniceras via introduktion i små team.
- Formell dokumentation av beslutad avvikelserutin med ansvarig roll och eskaleringsväg finns.

Gap:
- Inga kvarstående prioriterade gap identifierade i nuläget.

### 3) Riskhantering

Status: Uppfyllt

Styrkor:
- Riskregister med sannolikhet, konsekvens, riskvärde och status finns.
- Dokumenterad riskanalysrutin finns.
- Enhetlig metodik och tröskelvärden för prioritering är beslutade i enkel modell.
- Höga risker hanteras med uppdaterad status och åtgärdsplan i systemet.

Gap:
- Inga kvarstående prioriterade gap identifierade i nuläget.

### 4) Årshjul och egenkontroller

Status: Uppfyllt

Styrkor:
- Kontrollmodul, statusflöde och ett-klicks årschecklista finns.
- Dokumenterad kontrollrutin för årshjul finns.
- Resultatrad (utfall, avvikelse ja/nej, åtgärd, deadline) dokumenteras med enkel mall i varje kontrollcykel.
- Rutin för försenade kontroller tillämpas och kan hanteras i ordinarie uppföljningsmöte i små kliniker.

Gap:
- Inga kvarstående prioriterade gap identifierade i nuläget.

### 5) Informationssäkerhet, åtkomst och dataskydd

Status: Uppfyllt

Styrkor:
- Datamodell med organisationstillhörighet finns.
- Skyddstänk kring sekretess och personuppgifter finns i rutindokument.
- Åtkomstregler mellan användare/organisationer är verifierade i testunderlag.
- Enkel behörighetsmatris per roll är dokumenterad.
- Rutiner för logggranskning vid behov är beslutade.

Gap:
- Inga kvarstående prioriterade gap identifierade i nuläget.

### 6) Spårbarhet, audit trail och tillsynsbar evidens

Status: Uppfyllt

Styrkor:
- Pilotmatris finns och arbetssätt för testning är etablerat.
- Struktur för uppföljning finns i systemet.
- Auth/RLS-separation mellan organisationer är testad och verifierad.
- Kritiska funktioner (registrering, statusbyte, stängning) loggas.
- Spårbarhet för avvikelse/risk/kontroll fungerar end-to-end.

Gap:
- Inga kvarstående prioriterade gap identifierade i nuläget.

## Riskklassning Av Kvarstående Gap

- Inga kvarstående prioriterade gap identifierade i nuläget.

## Prioriterad Åtgärdsplan (fortsatt mognad)

1. Bibehåll månatlig/kvartalsvis uppföljning i drift.
- Leverabel: uppdaterad uppföljningslogg och nästa planerade uppföljningsdatum.

2. Fortsätt årlig granskning av rutiner och system.
- Leverabel: granskningsmöte med protokoll och eventuella förbättringspunkter.

3. Följ upp exporttester och åtkomstkontroller vid större systemändringar.
- Leverabel: kort verifieringsprotokoll vid förändring.

## Rekommenderad Beslutsstatus Nu

- Rekommenderad status: Go för påstående "alla lagkrav uppfyllda".
- Rekommenderad status: Go för fortsatt drift med proportionerad uppföljning och löpande förbättring.

## Definition Av "Lagkrav Uppfyllt" I Detta Projekt

Använd följande kriterier innan status ändras till uppfyllt:

- Rutiner är fastställda, signerade och kommunicerade.
- Kritiska auth/RLS- och audit-tester är passerade och dokumenterade.
- Processkedjan fungerar i praktik: avvikelse/risk/kontroll -> åtgärd -> uppföljt utfall.
- Dataskydd och behörighetsstyrning är verifierade i återkommande, proportionerad kontroll.
- Tillsynsbar evidensmapp finns och är uppdaterad.

---

Notering: Bedömningen ovan är ett operativt compliance-underlag och ersätter inte formell juridisk rådgivning.
