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

export interface ManagementSystemRequirementItem {
  key: string;
  label: string;
}

export interface IvoReadinessItemDefinition {
  key: string;
  label: string;
  description: string;
}

export interface ResponsiblePersonRequirementItem {
  key: string;
  label: string;
  placeholder: string;
}

export interface OwnershipRequirementItem {
  key: string;
  label: string;
  placeholder: string;
}

export interface AttachmentChecklistRequirementItem {
  key: string;
  label: string;
  placeholder: string;
}

export interface FacilityRequirementItem {
  key: string;
  label: string;
  placeholder: string;
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
    availableFrom: "step1",
  },
  {
    code: "R-04",
    title: "Avvikelsehantering",
    description: "Rutiner för rapportering, uppföljning och lärande.",
    documentKind: "avvikelsehantering",
    availableFrom: "step1",
  },
  {
    code: "R-05",
    title: "Internkontroll",
    description: "Plan för löpande internkontroll och förbättring.",
    documentKind: "egenkontroll",
    availableFrom: "step1",
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

export const managementSystemRequirementItems: ManagementSystemRequirementItem[] = [
  { key: "management_system_purpose", label: "Syfte" },
  { key: "management_system_scope", label: "Omfattning" },
  { key: "management_system_owner", label: "Ansvarig" },
  { key: "management_system_approved_by", label: "Godkänd av" },
  { key: "management_system_processes", label: "Processer och uppföljning" },
  {
    key: "management_system_followup_log",
    label: "Bevis på månatlig/kvartalsvis uppföljning i drift",
  },
  { key: "management_system_documents", label: "Styrande dokument" },
  {
    key: "management_system_decision_log",
    label: "Formellt beslut, fastställande och versionsstyrning",
  },
  { key: "management_system_next_review", label: "Nästa planerade uppföljning" },
];

export const responsiblePersonRequirementItems: ResponsiblePersonRequirementItem[] = [
  {
    key: "responsible_operations_manager_name",
    label: "Verksamhetsansvarig namn",
    placeholder: "Ex. Anna Andersson",
  },
  {
    key: "responsible_operations_manager_role",
    label: "Verksamhetsansvarig roll",
    placeholder: "Ex. Verksamhetschef eller klinikchef",
  },
  {
    key: "responsible_operations_manager_license",
    label: "Verksamhetsansvarig legitimation eller kompetens",
    placeholder: "Ex. Leg. tandläkare, 10 års erfarenhet",
  },
  {
    key: "responsible_medical_name",
    label: "Medicinskt ansvarig namn",
    placeholder: "Ex. Johan Johansson",
  },
  {
    key: "responsible_medical_role",
    label: "Medicinskt ansvarig roll",
    placeholder: "Ex. Medicinskt ansvarig tandläkare",
  },
  {
    key: "responsible_medical_license",
    label: "Medicinskt ansvarig legitimation",
    placeholder: "Ex. Leg. tandläkare, legitimation nr 123456",
  },
  {
    key: "responsible_quality_name",
    label: "Kvalitetsansvarig namn",
    placeholder: "Ex. Lisa Svensson",
  },
  {
    key: "responsible_quality_role",
    label: "Kvalitetsansvarig roll",
    placeholder: "Ex. Kvalitetsansvarig eller processägare",
  },
  {
    key: "responsible_quality_competence",
    label: "Kvalitetsansvarig kompetens",
    placeholder: "Ex. Erfarenhet av ledningssystem, internkontroll och avvikelsehantering",
  },
];

export const ownershipRequirementItems: OwnershipRequirementItem[] = [
  {
    key: "ownership_legal_entity_name",
    label: "Juridisk huvudman",
    placeholder: "Ex. Klinikklar Dental AB",
  },
  {
    key: "ownership_legal_entity_org_number",
    label: "Huvudmannens organisationsnummer",
    placeholder: "Ex. 559123-4567",
  },
  {
    key: "ownership_representative_name",
    label: "Företrädare eller kontaktperson",
    placeholder: "Ex. Anna Andersson, VD",
  },
  {
    key: "ownership_structure_description",
    label: "Ägarbild och styrning",
    placeholder: "Beskriv ägare, ägarandelar och hur styrning/ansvar ser ut.",
  },
  {
    key: "ownership_suitability_statement",
    label: "Lämplighetsbedömning",
    placeholder: "Beskriv kort varför ägare och ledning bedöms lämpliga att bedriva verksamheten.",
  },
];

export const attachmentChecklistRequirementItems: AttachmentChecklistRequirementItem[] = [
  {
    key: "attachment_cover_note",
    label: "Sammanfattning eller följebrev",
    placeholder: "Ange vad som ska skickas in som introduktion eller sammanfattning.",
  },
  {
    key: "attachment_business_description_ref",
    label: "Verksamhetsbeskrivning",
    placeholder: "Ange dokumentnamn, version eller referens till verksamhetsbeskrivningen.",
  },
  {
    key: "attachment_management_system_ref",
    label: "Ledningssystem",
    placeholder: "Ange dokumentnamn, version eller referens till ledningssystemet.",
  },
  {
    key: "attachment_staffing_ref",
    label: "Bemanning och ansvarsfördelning",
    placeholder: "Ange var bemanning, roller och ansvar dokumenteras.",
  },
  {
    key: "attachment_evidence_index_ref",
    label: "Bilage- eller evidensförteckning",
    placeholder: "Ange hur bilagor och evidens är numrerade eller sammanställda.",
  },
];

export const facilityRequirementItems: FacilityRequirementItem[] = [
  {
    key: "facility_premises_description",
    label: "Lokaler och behandlingsmiljö",
    placeholder: "Beskriv lokalerna, behandlingsrum och hur verksamheten är organiserad på plats.",
  },
  {
    key: "facility_hygiene_flow",
    label: "Hygien, steril och patientflöden",
    placeholder: "Beskriv hur hygienkritiska flöden, sterilhantering och patientflöden fungerar i lokalen.",
  },
  {
    key: "facility_equipment_scope",
    label: "Utrustning och särskilda funktioner",
    placeholder: "Beskriv viktig utrustning samt om verksamheten använder röntgen, sedering eller annan särskild funktion.",
  },
  {
    key: "facility_special_risks",
    label: "Särskilda riskområden och skyddsåtgärder",
    placeholder: "Beskriv riskområden i lokalen eller verksamheten och hur de hanteras.",
  },
];

export const ivoReadinessItemDefinitions: IvoReadinessItemDefinition[] = [
  {
    key: "organization_identity",
    label: "Organisationens grunduppgifter är kompletta",
    description: "Namn, organisationsnummer och kontaktadress finns sparade.",
  },
  {
    key: "clinic_location",
    label: "Klinikens adressuppgifter är kompletta",
    description: "Kliniknamn, besöksadress, postnummer och kommun finns dokumenterade.",
  },
  {
    key: "care_scope",
    label: "Vårdutbudet är beskrivet",
    description: "Planerade behandlingar och vårdomfattning är dokumenterade.",
  },
  {
    key: "staffing",
    label: "Bemanning och kompetens är beskrivna",
    description: "Planerad bemanning, roller och kompetensnivåer är dokumenterade.",
  },
  {
    key: "quality_process",
    label: "Kvalitetsuppföljning och patientsäkerhet är beskrivna",
    description: "Hur kvalitet följs upp och vem som ansvarar framgår.",
  },
  {
    key: "incident_routine",
    label: "Avvikelsehantering är beskriven",
    description: "Rapportering, åtgärd och återkoppling av avvikelser är dokumenterade.",
  },
  {
    key: "management_system",
    label: "Ledningssystemet är fastställt i ansökningsunderlaget",
    description: "Syfte, omfattning, ansvar, styrande dokument och uppföljning finns ifyllda.",
  },
  {
    key: "responsible_people",
    label: "Ansvariga personer, roller och legitimationer är dokumenterade",
    description: "Verksamhetsansvarig, medicinskt ansvarig och kvalitetsansvarig finns beskrivna.",
  },
  {
    key: "ownership_suitability",
    label: "Ägarbild och lämplighetsuppgifter är dokumenterade",
    description: "Juridisk huvudman, företrädare, ägarbild och lämplighetsbeskrivning finns samlade.",
  },
  {
    key: "facility_and_equipment",
    label: "Lokaler, utrustning och särskilda riskområden är dokumenterade",
    description: "Lokaler, hygienflöden, utrustning och särskilda riskområden finns beskrivna i ansökningsunderlaget.",
  },
  {
    key: "attachment_checklist",
    label: "Bilagechecklista för ansökan är komplett",
    description: "Det finns en tydlig referens till de underlag som ska skickas med ansökan.",
  },
  {
    key: "evidence_package",
    label: "Det finns kopplad evidens för varje krav",
    description: "Varje kravpost har minst ett kopplat underlag.",
  },
];
