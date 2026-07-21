# Premium releaseplan (varde for prisskillnad)

## Mal
Gora Klinikklar Premium tydligt vard 1 995 kr/man genom funktioner som ger:
- lagre tillsynsrisk
- mindre admintid
- snabbare aterkoppling vid kritiska fragor

## Vad byggs forst (prioritetsordning)

### 1) Regelbevakning med kallbevis och andringsdiff (MVP)
Leverans:
- logga regelpost med: kalla, datum, andring, paverkan, rekommenderad atgard
- auto-genererad "vad har andrats"-sammanfattning (diff-text)
- statusflode: planerad -> pagaende -> klar
- ansvarig roll + deadline

Varfor detta forst:
- tydligt Premium-varde direkt
- latt att visa i demo
- hog praktisk nytta for icke-jurister

Definition of done:
- anvandare kan skapa, uppdatera och stanga regelposter
- varje post visar kalla + datum + ansvarig + deadline
- exportbar lista for manadsmote

### 2) Revisionspaket med ett klick
Leverans:
- export av revisionsunderlag med:
  - ledningssystemstatus
  - oppna/hoga risker
  - oppna avvikelser
  - forsenade kontroller
  - evidenslista
  - senaste atgarder
- PDF och DOCX

Varfor detta som nummer 2:
- stor upplevd nytta i tillsyns- och revisionslage
- konkret "sparad tid" som motiverar pris

Definition of done:
- ett klick skapar komplett rapportpaket
- rapporten innehaller tidsstampel och period
- rapporten ar lasbar utan inloggning internt

### 3) Premium-SLA och prioriteringslogik i support
Leverans:
- tydlig SLA-text i appen
- ticket-prioritering normal/hog/akut
- svarsmal i UI (ex: 2h akut, 4h hog)
- enkel logg over skickade arenden och status

Varfor detta som nummer 3:
- kopplar pris till service, inte bara funktion
- minskar osakerhet for kund

Definition of done:
- SLA visas vid skapande av arende
- ticket far prioritet, tidsstampel och status
- supportlogg visar senaste arenden

## Vad kan marknadsforas direkt (nar punkt 1 ar live)

### Ny premium-copy (kort)
- "Regelbevakning med kallsparning och atgardsforslag"
- "Revisionsberedskap med tydlig luckbild"
- "Prioriterad support med tydlig svarstid"

### Ny premium-copy (lang)
"Klinikklar Premium ger kliniken ett proaktivt compliance-stod: regelbevakning med kallsparning, AI-prioriterad revisionsberedskap och prioriterad support med tydliga svarstider. Malet ar att minska tillsynsrisk och spara administrativ tid varje manad."

## KPI:er som bevisar vardet

### Effekt-KPI (for kund)
- Tid till atgard: median dagar fran ny regelpost till status klar
- Andel stangda hogriskpunkter per manad
- Forsenade kontroller: antal och trend
- Tid sparad i revisionsforberedelse (sjalvrapporterad)

### Produkt-KPI (for er)
- Premium MAU: andel premiumkunder aktiva varje vecka
- Feature adoption:
  - regelbevakning skapade poster/manad
  - revisionsexport/manad
  - supporttickets med SLA-traf
- Conversion till Premium fran Drift

### Malnivaer (forsta 60 dagar)
- >= 70% av premiumkunder skapar minst 1 regelpost/manad
- >= 40% gor minst 1 revisionspaketexport/manad
- >= 90% SLA-efterlevnad pa premiumsupport
- >= 20% minskning av forsenade kontroller hos aktiva premiumkunder

## Enkel prismotivering till kund
"Om Premium sparar 4-6 timmar admin/manad eller forebygger en stor avvikelse vid tillsyn, blir merkostnaden snabbt aterbetald."

## Implementeringsplan (4 veckor)

### Vecka 1
- hardna regelbevakningsflode (kalla, andring, paverkan, atgard, ansvarig, deadline)
- lagg till tydlig statusmodell och filtrering

### Vecka 2
- bygg revisionspaket-export (PDF/DOCX)
- lagg till periodval + sammanfattning

### Vecka 3
- SLA-visning och supportforbattringar i UI
- tracking for SLA-traf och ticketstatus

### Vecka 4
- KPI-panel (internt) + justering av premium-copy
- demo-script och pilotutrullning

## Risker och hantering
- Risk: premium lover mer an datakvaliteten stoder
  - Hantering: visa datakompletthet i rapporten (t.ex. "underlag saknas")
- Risk: AI uppfattas som juridiskt facit
  - Hantering: tydlig text "AI-assistent, manuell validering kravs"
- Risk: lag adoption
  - Hantering: onboarding-wizard for premium med 3 steg

## Beslutspunkt
Go live med Premium-budskap nar punkt 1 ar produktionssatt och minst 1 pilotkund verifierat nyttan.