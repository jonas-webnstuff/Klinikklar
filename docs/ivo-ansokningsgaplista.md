# IVO-ansokningsgaplista for ny klinik

Datum: 2026-07-22
Scope: Nuvarande produktstod i Klinikklar jamfort med det underlag som normalt behover vara tydligt for en IVO-ansokan om att starta ny privat tandvardsklinik.

## Sammanfattning

Klinikklar har nu ett bra stod for internt compliance-underlag, men ansokningsberedskapen ar inte helt samma sak som en komplett IVO-ansokan.

Det som redan ar starkt i produkten ar:
- verksamhetsbeskrivning, ledningssystem, riskanalys, avvikelsehantering och egenkontroll som strukturerade kravytor
- frageguide for vardutbud, kvalitet, bemanning och avvikelsehantering
- evidenskoppling per krav
- statusflode och auditlogg i ansokan

Det som fortfarande ar en faktisk lucka mot en fullstandig ansokan ar framfor allt uppgifter som inte ar tydligt modellerade eller verifierade i produktflodet.

## Tacks Redan Av Produkten

1. Grunduppgifter om organisation och klinik
- Organisationsnummer, e-post, kliniknamn, adress, postnummer och kommun kan sparas i workspace.

2. Beskrivning av vardutbud
- Fragan om vilka behandlingar kliniken ska erbjuda finns i frageguiden.

3. Bemanning och grundlaggande kompetensbeskrivning
- Fragan om bemanning och hur franvaro hanteras finns i frageguiden.

4. Kvalitetsarbete och patientsakerhet
- Kvalitetsuppfoljning, ledningssystem och egenkontroll har eget stod i produkten.

5. Avvikelsehantering och riskarbete
- Bada omradena har egna moduler, rutinstod och evidenslogik.

## Delvis Tackt

1. Ledningssystem som faktiskt ansokningsunderlag
- Produkten kan samla syfte, omfattning, ansvar, processer, styrande dokument, beslut och uppfoljning.
- Det ar bra, men det ar fortfarande ett internt underlag och inte ett uttryckligt ansokningspaket med definierade bilagor per IVO-fraga.

2. Export
- PDF och DOCX finns, och produkten kan nu skapa ett samlat ansokningspaket med grunduppgifter, ansvariga personer, agarbild, bilagechecklista och dokumentstatus.
- Kvar ar att ga fran sammanstallt paket till mer formaliserad bilagepaketering med tydligare versionsstyrning och eventuell automatisk bifogning av underlag.

3. Bilagechecklista
- Produkten har nu en grundlaggande checklista dar verksamheten kan referera till vilka underlag som ska skickas med ansokan.
- Kvar ar att bygga automatisk paketering och tydligare koppling mellan checklistan och faktisk export.

4. Readiness
- Readiness fanns tidigare mest som intern dokumentkontroll.
- Efter denna uppdatering kontrollerar readiness ocksa fler ansokningsnara uppgifter, men den ersatter fortfarande inte manuell juridisk eller regulatorisk slutgranskning.

## Saknas Eller Ar Inte Tillrackligt Tydligt Modellerat

1. Ansvariga personer och legitimationer
- Grundstod finns nu i produktens ansokningsflode for verksamhetsansvarig, medicinskt ansvarig och kvalitetsansvarig.
- Kvar ar att avgora om dessa uppgifter senare ska lyftas till egen datamodell med starkare validering och eventuella bilagekrav.

2. Agarbild och lamplighetsuppgifter
- Grundstod finns nu i ansokningsflodet for juridisk huvudman, foretradare, agarbild och en enkel lamplighetsbeskrivning.
- Kvar ar att avgora om dessa uppgifter senare ska lyftas till egen datamodell med starkare validering och eventuella bilagekrav.

3. Lokaler, utrustning och sarskilda riskomraden
- Grundstod finns nu i ansokningsflodet for att beskriva lokaler, hygienkritiska floden, viktig utrustning och sarskilda riskomraden.
- Kvar ar att avgora om detta senare ska delas upp i mer strukturerade delmoment, till exempel egen kontroll for rontgen, sedering eller andra sarskilda funktioner.

4. Tydlig bilagechecklista for sjalva IVO-ansokan
- Grundstod finns nu i ansokningsflodet for att lista och referera de viktigaste bilagorna.
- Kvar ar att koppla checklistan till automatisk paketering, export och tydligare versionskontroll.

5. End-to-end-verifiering i pilot
- Kritiska tester for auth, statusovergangar, evidens och export ar inte fullt passerade i testmatrisen.

## Rekommenderad Produktniva Nu

Rekommenderad formulering i nulaget:

- Produkten ger starkt stod for att bygga ansokningsunderlag.
- Produkten bor inte annu beskrivas som att den ensam verifierar att en IVO-ansokan ar fullstandig.

## Rekommenderade Nastkommande Produktsteg

1. Lagga till ett uttryckligt ansokningsblock for ansvariga personer, legitimationer och roller.
2. Lagga till en strukturerad bilagechecklista for den slutliga IVO-ansokan.
3. Lagga till klinikspecifika forutsattningar som lokaler, utrustning och eventuella sarskilda riskomraden.
4. Bygga en samlad export for ansokningspaket, inte bara generiska dokument.
5. Kora om kritiska pilottester tills status- och evidensflodet ar verifierat end-to-end.