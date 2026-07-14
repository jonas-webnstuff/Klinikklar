import type { DocumentKind } from "@/types/domain";

type PlanLevel = "step1" | "step2" | "step3";

export interface QuestionnaireItem {
  key: string;
  label: string;
  placeholder: string;
  followUpLabel?: string;
  followUpPlaceholder?: string;
  helpDescription: string;
  helpChecklist: string[];
  helpExample: string;
  ivoSectionTitle: string;
  ivoUrl: string;
  mapsToRequirements: string[];
}

export interface ComplianceRequirement {
  code: string;
  title: string;
  description: string;
  documentKind: DocumentKind;
  availableFrom: PlanLevel;
}

export const complianceRequirements: ComplianceRequirement[] = [
  {
    code: "R-01",
    title: "Verksamhetsbeskrivning",
    description: "Beskrivning av klinikens uppdrag, målgrupp och vårdutbud.",
    documentKind: "verksamhetsbeskrivning",
    availableFrom: "step1",
  },
  {
    code: "R-02",
    title: "Ledningssystem",
    description: "Processer för kvalitet, ansvar och intern styrning.",
    documentKind: "ledningssystem",
    availableFrom: "step1",
  },
  {
    code: "R-03",
    title: "Riskanalys",
    description: "Identifiering av risker samt åtgärdsplaner.",
    documentKind: "riskanalys",
    availableFrom: "step2",
  },
  {
    code: "R-04",
    title: "Avvikelsehantering",
    description: "Rutiner för rapportering, uppföljning och lärande.",
    documentKind: "avvikelsehantering",
    availableFrom: "step2",
  },
  {
    code: "R-05",
    title: "Egenkontroll",
    description: "Plan för löpande internkontroll och förbättring.",
    documentKind: "egenkontroll",
    availableFrom: "step2",
  },
];

export const questionnaireItems: QuestionnaireItem[] = [
  {
    key: "care_scope",
    label: "Vilka behandlingar ska kliniken erbjuda?",
    placeholder: "Ex: allmäntandvård, kirurgi, implantat",
    followUpLabel: "Behövs särskild utrustning eller kompetens?",
    followUpPlaceholder: "Beskriv kort vad som krävs",
    helpDescription:
      "Beskriv vårdutbudet så konkret som möjligt: behandlingskategorier, om ni utför avancerad vård och vilka riskmoment som behöver särskilda rutiner.",
    helpChecklist: [
      "Vilka behandlingstyper som erbjuds, till exempel allmäntandvård, kirurgi eller implantat.",
      "Om ni utför vård som kräver särskild utrustning, särskilda lokaler eller särskilda hygienrutiner.",
      "Vilka patientgrupper eller riskmoment som kräver egna arbetsprocesser.",
    ],
    helpExample: "Kliniken erbjuder allmäntandvård för vuxna och barn samt enklare kirurgiska ingrepp. Implantatbehandlingar utförs av legitimerad tandläkare med särskild kompetens och dokumenterade hygienrutiner. Sterilhantering och röntgen följer fastställda arbetsinstruktioner.",
    ivoSectionTitle: "IVO: tillstånd för privat tandvård",
    ivoUrl: "https://www.ivo.se/vard-omsorgsgivare/tillstand/privat-tandvard/",
    mapsToRequirements: ["R-01", "R-03"],
  },
  {
    key: "quality_process",
    label: "Hur följer ni upp kvalitet och patientsäkerhet?",
    placeholder: "Ex: månadsvisa kvalitetsmöten och avvikelsegenomgång",
    followUpLabel: "Vem ansvarar för uppföljningen?",
    followUpPlaceholder: "Namn eller roll",
    helpDescription:
      "Förklara hur ni planerar, följer upp och förbättrar verksamheten. Ta med mötesstruktur, nyckeltal, avvikelseanalys och ansvarsfördelning.",
    helpChecklist: [
      "Hur kvalitet och patientsäkerhet följs upp, till exempel möten, journalgranskning eller internkontroll.",
      "Vilka mått eller signaler ni använder för att upptäcka brister och förbättringsbehov.",
      "Vem som ansvarar för uppföljning, beslut och återkoppling till teamet.",
    ],
    helpExample:
      "Patientsäkerhet och kvalitet följs upp varje månad genom kvalitetsmöte, stickprov av journaler och genomgång av rapporterade avvikelser. Verksamhetsansvarig tandläkare ansvarar för uppföljningen och beslut om förbättringsåtgärder. Identifierade brister dokumenteras i åtgärdsplan med ansvarig och deadline.",
    ivoSectionTitle: "IVO: stärkt patientsäkerhet",
    ivoUrl: "https://www.ivo.se/aktuellt/riktade-tillsynsinsatser/starkt-patientsakerhet/",
    mapsToRequirements: ["R-02", "R-04", "R-05"],
  },
  {
    key: "staffing",
    label: "Hur är bemanningen planerad?",
    placeholder: "Ex: 1 tandläkare, 1 tandsköterska, 1 receptionist",
    followUpLabel: "Hur hanteras frånvaro eller arbetstoppar?",
    followUpPlaceholder: "Ex: timanställda, samarbetsklinik",
    helpDescription:
      "Beskriv grundbemanning, kompetensnivåer och backup-plan. IVO vill kunna se att bemanning och kompetens är tillräcklig för planerad vård.",
    helpChecklist: [
      "Vilka roller som finns i vardagen och ungefär hur många personer som täcker varje funktion.",
      "Vilken legitimation, erfarenhet eller särskild kompetens som krävs för planerad vård.",
      "Hur ni säkrar drift vid sjukdom, semestrar eller hög belastning.",
    ],
    helpExample:
      "Verksamheten bemannas av en legitimerad tandläkare, en tandsköterska och en administrativ resurs på deltid. Vid planerad frånvaro används timanställd tandsköterska och samarbetsklinik för att säkra kontinuitet. Kirurgiska behandlingar bokas endast när rätt kompetens finns på plats.",
    ivoSectionTitle: "IVO: tillstånd för privat tandvård",
    ivoUrl: "https://www.ivo.se/vard-omsorgsgivare/tillstand/privat-tandvard/",
    mapsToRequirements: ["R-01", "R-02"],
  },
  {
    key: "incident_routine",
    label: "Hur rapporteras och hanteras avvikelser?",
    placeholder: "Ex: digital avvikelserapport inom 24 timmar",
    followUpLabel: "Hur återkopplas lärdomar till teamet?",
    followUpPlaceholder: "Ex: veckovis genomgång",
    helpDescription:
      "Beskriv hela flödet: rapportering, klassificering, åtgärd, uppföljning och återkoppling. Lägg gärna till tidsmål och ansvarig roll.",
    helpChecklist: [
      "Hur en avvikelse eller risk rapporteras och inom vilken tid.",
      "Vem som bedömer allvarlighetsgrad och beslutar om åtgärder.",
      "Hur lärdomar dokumenteras och förs tillbaka till rutiner eller utbildning.",
    ],
    helpExample:
      "Avvikelser rapporteras digitalt samma arbetsdag och granskas av verksamhetsansvarig senast inom 24 timmar. Händelsen klassificeras utifrån risk och leder vid behov till omedelbar åtgärd, rotorsaksanalys och uppdaterad rutin. Lärdomar återkopplas på veckomöte och dokumenteras i förbättringsloggen.",
    ivoSectionTitle: "IVO: anmäl risker och oegentligheter inom privat tandvård",
    ivoUrl: "https://www.ivo.se/vard-omsorgsgivare/anmal-handelse-lamna-underrattelse/anmal-risker-och-oegentligheter-inom-privat-tandvard/",
    mapsToRequirements: ["R-04", "R-05"],
  },
];
