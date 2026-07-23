"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import OrganizationProfileForm from "@/components/OrganizationProfileForm";
import {
  attachmentChecklistRequirementItems,
  complianceRequirements,
  facilityRequirementItems,
  managementSystemRequirementItems,
  ownershipRequirementItems,
  questionnaireItems,
  responsiblePersonRequirementItems,
} from "@/lib/requirements";

type ApplicationStatus = "draft" | "in_review" | "ready_to_submit" | "submitted";
type PlanLevel = "ansokan" | "step1" | "step2" | "step3";

type AiEvidenceSuggestion = {
  feature: "application_evidence";
  title: string;
  note: string;
  filePathHint: string;
};

type AiManagementSystemSuggestion = {
  feature: "management_system";
  owner: string;
  processes: string;
  documents: string;
};

type AiResponsiblePeopleSuggestion = {
  feature: "responsible_people";
  operationsManagerName: string;
  operationsManagerRole: string;
  operationsManagerLicense: string;
  medicalResponsibleName: string;
  medicalResponsibleRole: string;
  medicalResponsibleLicense: string;
  qualityResponsibleName: string;
  qualityResponsibleRole: string;
  qualityResponsibleCompetence: string;
};

type AiOwnershipSuitabilitySuggestion = {
  feature: "ownership_suitability";
  legalEntityName: string;
  legalEntityOrgNumber: string;
  representativeName: string;
  ownershipStructureDescription: string;
  suitabilityStatement: string;
};

type AiFacilitySuggestion = {
  feature: "facility_and_equipment";
  premisesDescription: string;
  hygieneFlow: string;
  equipmentScope: string;
  specialRisks: string;
};

type AiAttachmentChecklistSuggestion = {
  feature: "attachment_checklist";
  coverNote: string;
  businessDescriptionRef: string;
  managementSystemRef: string;
  staffingRef: string;
  evidenceIndexRef: string;
};

type ProfileState = {
  clinicName: string;
  orgNumber: string;
  address: string;
  postalCode: string;
  municipality: string;
  email: string;
};

type AnswersState = Record<string, { answer: string; followUpAnswer: string }>;

type IvoChecklistItem = {
  key: string;
  label: string;
  detail: string;
  done: boolean;
};

type ReadinessChecklist = {
  hasOrganization: boolean;
  hasClinic: boolean;
  questionnaireComplete: boolean;
  requirementsComplete: boolean;
  evidenceLinked: boolean;
  ivoChecklistComplete: boolean;
  ivoChecklistItems: IvoChecklistItem[];
  missingIvoItems: string[];
  advisoryIvoGaps: string[];
  canMoveToReady: boolean;
  canSubmit: boolean;
  evidenceCount: number;
  completeRequirementCount: number;
  requirementCount: number;
};

type RequirementOption = {
  id: string;
  code: string;
  title: string;
};

type EvidenceItem = {
  id: string;
  requirementId: string;
  requirementCode: string;
  requirementTitle: string;
  title: string;
  note?: string;
  filePath?: string;
};

type AuditItem = {
  id: string;
  event_type: string;
  message: string;
  created_at: string;
};

const stages: Array<{
  key: ApplicationStatus;
  title: string;
  description: string;
}> = [
  {
    key: "draft",
    title: "Utkast",
    description: "Fyll i frågeguiden och samla underlag.",
  },
  {
    key: "in_review",
    title: "Klar för granskning",
    description: "Gå igenom dokument och kontrollera innehållet.",
  },
  {
    key: "ready_to_submit",
    title: "Godkänd",
    description: "Materialet är klart för inskick.",
  },
  {
    key: "submitted",
    title: "Klar att skicka",
    description: "Underlaget är låst och redo för manuell inskick till IVO.",
  },
];

const stageLabels: Record<ApplicationStatus, string> = {
  draft: "Utkast",
  in_review: "Klar för granskning",
  ready_to_submit: "Godkänd",
  submitted: "Klar att skicka",
};

function renderStatusAction(
  applicationStatus: ApplicationStatus,
  checklist: ReadinessChecklist | null,
  updateApplicationStatus: (status: ApplicationStatus) => Promise<void>
) {
  if (applicationStatus === "draft") {
    return (
      <button
        type="button"
        onClick={() => void updateApplicationStatus("in_review")}
        disabled={!checklist?.canMoveToReady}
        className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Markera klar för granskning
      </button>
    );
  }

  if (applicationStatus === "in_review") {
    return (
      <button
        type="button"
        onClick={() => void updateApplicationStatus("ready_to_submit")}
        disabled={!checklist?.canMoveToReady}
        className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Godkänn ansökan
      </button>
    );
  }

  if (applicationStatus === "ready_to_submit") {
    return (
      <button
        type="button"
        onClick={() => void updateApplicationStatus("submitted")}
        disabled={!checklist?.canSubmit}
        className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Markera som klar att skicka
      </button>
    );
  }

  if (applicationStatus === "submitted") {
    return (
      <button
        type="button"
        onClick={() => void updateApplicationStatus("draft")}
        className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
      >
        Återställ till utkast
      </button>
    );
  }

  return null;
}

export default function AnsokanPage() {
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>("draft");
  const [activePlan, setActivePlan] = useState<PlanLevel>("ansokan");
  const [checklist, setChecklist] = useState<ReadinessChecklist | null>(null);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);
  const [isAiSuggestingEvidence, setIsAiSuggestingEvidence] = useState(false);
  const [isAiSuggestingManagement, setIsAiSuggestingManagement] = useState(false);
  const [isAiSuggestingResponsiblePeople, setIsAiSuggestingResponsiblePeople] = useState(false);
  const [isAiSuggestingOwnership, setIsAiSuggestingOwnership] = useState(false);
  const [isAiSuggestingFacility, setIsAiSuggestingFacility] = useState(false);
  const [isAiSuggestingAttachments, setIsAiSuggestingAttachments] = useState(false);
  const [profile, setProfile] = useState<ProfileState>({
    clinicName: "",
    orgNumber: "",
    address: "",
    postalCode: "",
    municipality: "",
    email: "",
  });
  const [answers, setAnswers] = useState<AnswersState>({});
  const [aiContext, setAiContext] = useState({ clinicName: "", municipality: "" });
  const [evidenceForm, setEvidenceForm] = useState({
    requirementId: "",
    title: "",
    note: "",
    filePath: "",
  });

  const activeStageIndex = stages.findIndex((stage) => stage.key === applicationStatus);
  const canUseAiSupport = activePlan === "ansokan" || activePlan === "step1" || activePlan === "step3";

  function getAnswerValue(key: string) {
    return answers[key]?.answer || "";
  }

  function getFollowUpValue(key: string) {
    return answers[key]?.followUpAnswer || "";
  }

  function setAnswerValue(key: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        answer: value,
        followUpAnswer: prev[key]?.followUpAnswer || "",
      },
    }));
  }

  function setFollowUpValue(key: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        answer: prev[key]?.answer || "",
        followUpAnswer: value,
      },
    }));
  }

  const readinessItems = useMemo(
    () => [
      {
        key: "profile",
        label: "Grunduppgifter för verksamheten är kompletta",
        done: Boolean(checklist?.hasOrganization && checklist?.hasClinic),
      },
      {
        key: "questionnaire",
        label: "Frågeguiden är ifylld",
        done: checklist?.questionnaireComplete || false,
      },
      {
        key: "requirements",
        label: "Kravlistan är komplett",
        done: checklist?.requirementsComplete || false,
      },
      {
        key: "evidence",
        label: "Evidens finns för varje krav",
        done: checklist?.evidenceLinked || false,
      },
    ],
    [checklist]
  );

  async function loadApplicationState() {
    setIsLoading(true);
    setStatusMessage("");

    const response = await fetch("/api/application/readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    setIsLoading(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte hämta ansökningsstatus.");
      return;
    }

    const data = (await response.json()) as {
      found: boolean;
      status?: ApplicationStatus;
      checklist?: ReadinessChecklist;
      audit?: AuditItem[];
    };

    if (!data.found) {
      setStatusMessage("Ingen aktiv ansökan finns ännu. Fyll i uppgifterna nedan och spara för att starta ansökan.");
      return;
    }

    if (data.status) {
      setApplicationStatus(data.status);
    }

    if (data.checklist) {
      setChecklist(data.checklist);
    }

    setAudit(data.audit || []);
  }

  async function loadEvidence() {
    const response = await fetch("/api/evidence/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setEvidenceMessage(data.error || "Kunde inte hämta evidens.");
      return;
    }

    const data = (await response.json()) as {
      evidence: EvidenceItem[];
      requirements: RequirementOption[];
    };

    setEvidence(data.evidence || []);
    setRequirements(data.requirements || []);

    setEvidenceForm((prev) => ({
      ...prev,
      requirementId: prev.requirementId || data.requirements?.[0]?.id || "",
    }));
  }

  async function loadWorkspacePlanContext() {
    const response = await fetch("/api/workspace/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      found?: boolean;
      plan?: PlanLevel | null;
      profile?: Partial<ProfileState>;
      answers?: AnswersState;
    };

    if (data.plan === "ansokan" || data.plan === "step1" || data.plan === "step2" || data.plan === "step3") {
      setActivePlan(data.plan);
    }

    if (data.profile) {
      setProfile({
        clinicName: data.profile.clinicName || "",
        orgNumber: data.profile.orgNumber || "",
        address: data.profile.address || "",
        postalCode: data.profile.postalCode || "",
        municipality: data.profile.municipality || "",
        email: data.profile.email || "",
      });
    }

    if (data.answers) {
      setAnswers(data.answers as AnswersState);
    }

    setAiContext({
      clinicName: data.profile?.clinicName || "",
      municipality: data.profile?.municipality || "",
    });
  }

  async function saveGuide(successMessage: string) {
    if (!profile.clinicName.trim()) {
      setStatusMessage("Ange klinikens namn innan du sparar.");
      return;
    }

    if (!profile.orgNumber.trim()) {
      setStatusMessage("Ange organisationsnummer innan du sparar.");
      return;
    }

    if (!profile.address.trim()) {
      setStatusMessage("Ange besöksadress innan du sparar.");
      return;
    }

    if (!profile.postalCode.trim()) {
      setStatusMessage("Ange postnummer innan du sparar.");
      return;
    }

    if (!profile.municipality.trim()) {
      setStatusMessage("Ange ort innan du sparar.");
      return;
    }

    if (!profile.email.trim()) {
      setStatusMessage("Ange e-post innan du sparar.");
      return;
    }

    setIsSavingGuide(true);
    setStatusMessage("");

    const response = await fetch("/api/workspace/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        profile,
        answers,
        requirements: complianceRequirements.map((item) => ({
          code: item.code,
          title: item.title,
          status: "missing",
        })),
      }),
    });

    setIsSavingGuide(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte spara ansökningsuppgifterna.");
      return;
    }

    setAiContext({ clinicName: profile.clinicName, municipality: profile.municipality });
    setStatusMessage(successMessage);
    await loadApplicationState();
    await loadEvidence();
  }

  async function updateApplicationStatus(status: ApplicationStatus) {
    setStatusMessage("");

    const response = await fetch("/api/application/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte uppdatera status.");
      return;
    }

    const data = (await response.json()) as {
      status: ApplicationStatus;
      checklist: ReadinessChecklist;
    };

    setApplicationStatus(data.status);
    setChecklist(data.checklist);
    setStatusMessage("Status uppdaterad.");
    await loadApplicationState();
  }

  async function createEvidence() {
    if (!evidenceForm.requirementId || !evidenceForm.title.trim()) {
      setEvidenceMessage("Välj krav och ange titel på underlaget.");
      return;
    }

    setIsSavingEvidence(true);
    setEvidenceMessage("");

    const response = await fetch("/api/evidence/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evidenceForm),
    });

    setIsSavingEvidence(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setEvidenceMessage(data.error || "Kunde inte spara evidens.");
      return;
    }

    setEvidenceMessage("Evidens sparad.");
    setEvidenceForm((prev) => ({ ...prev, title: "", note: "", filePath: "" }));
    await loadEvidence();
    await loadApplicationState();
  }

  async function suggestEvidence() {
    if (!canUseAiSupport || !activePlan) {
      setEvidenceMessage("AI-stöd i ansökan ingår i Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    if (!evidenceForm.requirementId) {
      setEvidenceMessage("Välj krav innan du ber om AI-förslag.");
      return;
    }

    const selectedRequirement = requirements.find((item) => item.id === evidenceForm.requirementId);

    setIsAiSuggestingEvidence(true);
    setEvidenceMessage("");

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature: "application_evidence",
        clinicName: aiContext.clinicName,
        municipality: aiContext.municipality,
        currentEvidence: {
          requirementCode: selectedRequirement?.code || "",
          requirementTitle: selectedRequirement?.title || "",
          title: evidenceForm.title,
          note: evidenceForm.note,
          filePath: evidenceForm.filePath,
        },
      }),
    });

    setIsAiSuggestingEvidence(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setEvidenceMessage(data.error || "Kunde inte skapa AI-förslag för evidens.");
      return;
    }

    const data = (await response.json()) as AiEvidenceSuggestion;

    if (data.feature !== "application_evidence") {
      setEvidenceMessage("AI-svaret hade fel format. Försök igen.");
      return;
    }

    setEvidenceForm((prev) => ({
      ...prev,
      title: data.title,
      note: data.note,
      filePath: data.filePathHint,
    }));

    setEvidenceMessage("AI-förslag infogat i evidensformuläret.");
  }

  async function suggestManagementSystem() {
    if (!canUseAiSupport || !activePlan) {
      setStatusMessage("AI-stöd i ansökan ingår i Klinikklar Ansökan, Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    setIsAiSuggestingManagement(true);
    setStatusMessage("");

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature: "management_system",
        clinicName: profile.clinicName,
        municipality: profile.municipality,
        careScope: getAnswerValue("care_scope"),
        qualityProcess: getAnswerValue("quality_process"),
        staffing: getAnswerValue("staffing"),
        incidentRoutine: getAnswerValue("incident_routine"),
        currentManagementSystem: {
          owner: getAnswerValue("management_system_owner"),
          processes: getAnswerValue("management_system_processes"),
          documents: getAnswerValue("management_system_documents"),
        },
      }),
    });

    setIsAiSuggestingManagement(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte skapa AI-förslag för ledningssystemet.");
      return;
    }

    const data = (await response.json()) as AiManagementSystemSuggestion;

    if (data.feature !== "management_system") {
      setStatusMessage("AI-svaret för ledningssystemet hade fel format. Försök igen.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextReviewDate = (() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      return date.toISOString().slice(0, 10);
    })();

    setAnswerValue(
      "management_system_purpose",
      getAnswerValue("management_system_purpose") ||
        "Ledningssystemet ska säkerställa kvalitet, patientsäkerhet och tydlig ansvarsfördelning i verksamheten."
    );
    setAnswerValue(
      "management_system_scope",
      getAnswerValue("management_system_scope") ||
        `Omfattar ${getAnswerValue("care_scope").toLowerCase() || "planerad tandvårdsverksamhet"}, avvikelsehantering, riskuppföljning och intern uppföljning.`
    );
    setAnswerValue("management_system_owner", data.owner);
    setAnswerValue(
      "management_system_approved_by",
      getAnswerValue("management_system_approved_by") || data.owner || "Verksamhetsansvarig"
    );
    setAnswerValue("management_system_processes", data.processes);
    setAnswerValue(
      "management_system_followup_log",
      getAnswerValue("management_system_followup_log") ||
        "Månadsvis uppföljning av avvikelser, risker, bemanning och dokumenterade förbättringsåtgärder."
    );
    setAnswerValue("management_system_documents", data.documents);
    setAnswerValue(
      "management_system_decision_log",
      getAnswerValue("management_system_decision_log") ||
        `Version 1.0 fastställd ${today} av ${data.owner || "ansvarig funktion"}.`
    );
    setAnswerValue("management_system_next_review", getAnswerValue("management_system_next_review") || nextReviewDate);
    setStatusMessage("AI-förslag infogat i ledningssystemet för ansökan.");
  }

  async function suggestResponsiblePeople() {
    if (!canUseAiSupport || !activePlan) {
      setStatusMessage("AI-stöd i ansökan ingår i Klinikklar Ansökan, Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    setIsAiSuggestingResponsiblePeople(true);
    setStatusMessage("");

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature: "responsible_people",
        clinicName: profile.clinicName,
        municipality: profile.municipality,
        currentResponsiblePeople: {
          operationsManagerName: getAnswerValue("responsible_operations_manager_name"),
          operationsManagerRole: getAnswerValue("responsible_operations_manager_role"),
          operationsManagerLicense: getAnswerValue("responsible_operations_manager_license"),
          medicalResponsibleName: getAnswerValue("responsible_medical_name"),
          medicalResponsibleRole: getAnswerValue("responsible_medical_role"),
          medicalResponsibleLicense: getAnswerValue("responsible_medical_license"),
          qualityResponsibleName: getAnswerValue("responsible_quality_name"),
          qualityResponsibleRole: getAnswerValue("responsible_quality_role"),
          qualityResponsibleCompetence: getAnswerValue("responsible_quality_competence"),
        },
      }),
    });

    setIsAiSuggestingResponsiblePeople(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte skapa AI-förslag för ansvariga personer.");
      return;
    }

    const data = (await response.json()) as AiResponsiblePeopleSuggestion;

    if (data.feature !== "responsible_people") {
      setStatusMessage("AI-svaret för ansvariga personer hade fel format. Försök igen.");
      return;
    }

    setAnswerValue("responsible_operations_manager_name", data.operationsManagerName);
    setAnswerValue("responsible_operations_manager_role", data.operationsManagerRole);
    setAnswerValue("responsible_operations_manager_license", data.operationsManagerLicense);
    setAnswerValue("responsible_medical_name", data.medicalResponsibleName);
    setAnswerValue("responsible_medical_role", data.medicalResponsibleRole);
    setAnswerValue("responsible_medical_license", data.medicalResponsibleLicense);
    setAnswerValue("responsible_quality_name", data.qualityResponsibleName);
    setAnswerValue("responsible_quality_role", data.qualityResponsibleRole);
    setAnswerValue("responsible_quality_competence", data.qualityResponsibleCompetence);
    setStatusMessage("AI-förslag infogat för ansvariga personer.");
  }

  async function suggestOwnershipSuitability() {
    if (!canUseAiSupport || !activePlan) {
      setStatusMessage("AI-stöd i ansökan ingår i Klinikklar Ansökan, Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    setIsAiSuggestingOwnership(true);
    setStatusMessage("");

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature: "ownership_suitability",
        clinicName: profile.clinicName,
        municipality: profile.municipality,
        currentOwnershipSuitability: {
          legalEntityName: getAnswerValue("ownership_legal_entity_name"),
          legalEntityOrgNumber: getAnswerValue("ownership_legal_entity_org_number"),
          representativeName: getAnswerValue("ownership_representative_name"),
          ownershipStructureDescription: getAnswerValue("ownership_structure_description"),
          suitabilityStatement: getAnswerValue("ownership_suitability_statement"),
        },
      }),
    });

    setIsAiSuggestingOwnership(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte skapa AI-förslag för ägarbild och lämplighet.");
      return;
    }

    const data = (await response.json()) as AiOwnershipSuitabilitySuggestion;

    if (data.feature !== "ownership_suitability") {
      setStatusMessage("AI-svaret för ägarbild och lämplighet hade fel format. Försök igen.");
      return;
    }

    setAnswerValue("ownership_legal_entity_name", data.legalEntityName);
    setAnswerValue("ownership_legal_entity_org_number", data.legalEntityOrgNumber);
    setAnswerValue("ownership_representative_name", data.representativeName);
    setAnswerValue("ownership_structure_description", data.ownershipStructureDescription);
    setAnswerValue("ownership_suitability_statement", data.suitabilityStatement);
    setStatusMessage("AI-förslag infogat för ägarbild och lämplighet.");
  }

  async function suggestFacilityAndEquipment() {
    if (!canUseAiSupport || !activePlan) {
      setStatusMessage("AI-stöd i ansökan ingår i Klinikklar Ansökan, Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    setIsAiSuggestingFacility(true);
    setStatusMessage("");

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature: "facility_and_equipment",
        clinicName: profile.clinicName,
        municipality: profile.municipality,
        currentFacilityAndEquipment: {
          premisesDescription: getAnswerValue("facility_premises_description"),
          hygieneFlow: getAnswerValue("facility_hygiene_flow"),
          equipmentScope: getAnswerValue("facility_equipment_scope"),
          specialRisks: getAnswerValue("facility_special_risks"),
        },
      }),
    });

    setIsAiSuggestingFacility(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte skapa AI-förslag för lokaler och utrustning.");
      return;
    }

    const data = (await response.json()) as AiFacilitySuggestion;

    if (data.feature !== "facility_and_equipment") {
      setStatusMessage("AI-svaret för lokaler och utrustning hade fel format. Försök igen.");
      return;
    }

    setAnswerValue("facility_premises_description", data.premisesDescription);
    setAnswerValue("facility_hygiene_flow", data.hygieneFlow);
    setAnswerValue("facility_equipment_scope", data.equipmentScope);
    setAnswerValue("facility_special_risks", data.specialRisks);
    setStatusMessage("AI-förslag infogat för lokaler och utrustning.");
  }

  async function suggestAttachmentChecklist() {
    if (!canUseAiSupport || !activePlan) {
      setStatusMessage("AI-stöd i ansökan ingår i Klinikklar Ansökan, Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    setIsAiSuggestingAttachments(true);
    setStatusMessage("");

    const response = await fetch("/api/ai/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: activePlan,
        feature: "attachment_checklist",
        clinicName: profile.clinicName,
        municipality: profile.municipality,
        currentAttachmentChecklist: {
          coverNote: getAnswerValue("attachment_cover_note"),
          businessDescriptionRef: getAnswerValue("attachment_business_description_ref"),
          managementSystemRef: getAnswerValue("attachment_management_system_ref"),
          staffingRef: getAnswerValue("attachment_staffing_ref"),
          evidenceIndexRef: getAnswerValue("attachment_evidence_index_ref"),
        },
      }),
    });

    setIsAiSuggestingAttachments(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte skapa AI-förslag för bilagechecklistan.");
      return;
    }

    const data = (await response.json()) as AiAttachmentChecklistSuggestion;

    if (data.feature !== "attachment_checklist") {
      setStatusMessage("AI-svaret för bilagechecklistan hade fel format. Försök igen.");
      return;
    }

    setAnswerValue("attachment_cover_note", data.coverNote);
    setAnswerValue("attachment_business_description_ref", data.businessDescriptionRef);
    setAnswerValue("attachment_management_system_ref", data.managementSystemRef);
    setAnswerValue("attachment_staffing_ref", data.staffingRef);
    setAnswerValue("attachment_evidence_index_ref", data.evidenceIndexRef);
    setStatusMessage("AI-förslag infogat för bilagechecklistan.");
  }

  useEffect(() => {
    void loadApplicationState();
    void loadEvidence();
    void loadWorkspacePlanContext();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-10">
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Ansökan
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">Frågeguide och underlag</h1>
        <p className="mt-3 max-w-3xl text-[color:var(--muted)]">
          Här samlar du frågeguiden, underlagen, evidensen och statusen inför inskick till IVO.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
          Nuvarande status: {stageLabels[applicationStatus]}
        </div>
        {statusMessage ? <p className="mt-3 text-sm text-[color:var(--muted)]">{statusMessage}</p> : null}
      </header>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
              Flöde
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Steg för ansökan</h2>
          </div>
          <p className="text-sm text-[color:var(--muted)]">Backend-spårad status</p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stages.map((stage, index) => {
            const isActive = index === activeStageIndex;
            const isCompleted = index < activeStageIndex;

            return (
              <article
                key={stage.key}
                className={`rounded-2xl border p-4 ${
                  isActive
                    ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]"
                    : "border-[color:var(--line)] bg-[color:var(--panel)]"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.16em] ${
                    isActive || isCompleted ? "text-[color:var(--brand)]" : "text-[color:var(--muted)]"
                  }`}
                >
                  {index + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-[color:var(--ink)]">{stage.title}</h3>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{stage.description}</p>
                {isActive ? (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
                    Aktivt steg
                  </p>
                ) : isCompleted ? (
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Klart
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Frågeguiden fylls i här</p>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Du kan gå igenom hela ansökningsguiden direkt på den här sidan utan att använda ledningssystemet eller andra vyer.
          </p>
          <a
            href="#ansokan-guide"
            className="mt-4 inline-flex rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            Gå till frågeguiden
          </a>
        </div>

        <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Readiness-checklista</p>
          <ul className="mt-3 space-y-2 text-sm">
            {readinessItems.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span className="text-[color:var(--ink)]">{item.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.done
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {item.done ? "Klar" : "Saknas"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[color:var(--muted)]">
            Krav klara: {checklist?.completeRequirementCount || 0}/{checklist?.requirementCount || 0}. Evidens: {checklist?.evidenceCount || 0}.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-[color:var(--line)] bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">IVO-specifik ansökningsbild</p>
              <p className="mt-1 text-xs text-[color:var(--muted)]">
                Kontrollpunkter som ligger närmare själva ansökan än den vanliga dokumentchecklistan.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                checklist?.ivoChecklistComplete
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {checklist?.ivoChecklistComplete ? "Grundpaket komplett" : "Komplettering krävs"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(checklist?.ivoChecklistItems || []).map((item) => (
              <article
                key={item.key}
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.done ? "Klar" : "Saknas"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[color:var(--muted)]">{item.detail}</p>
              </article>
            ))}
          </div>

          {checklist?.missingIvoItems?.length ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">Kvar innan ansökningsunderlaget är komplett i appen</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {checklist.missingIvoItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {checklist?.advisoryIvoGaps?.length ? (
            <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Kvar att modellera i produkten</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
                {checklist.advisoryIvoGaps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section id="ansokan-guide" className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
              Steg 1
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Grunduppgifter och frågeguide</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Fyll i de uppgifter som behövs för att starta och komplettera ansökningsunderlaget.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Grunduppgifter</p>
          <div className="mt-3">
            <OrganizationProfileForm
              value={profile}
              onChange={(field, value) => setProfile((prev) => ({ ...prev, [field]: value }))}
              disabled={isSavingGuide}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Frågeguide</p>
          <div className="mt-3 grid gap-4">
            {questionnaireItems.map((item) => (
              <div key={item.key} className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
                <label className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</label>
                <textarea
                  value={getAnswerValue(item.key)}
                  onChange={(event) => setAnswerValue(item.key, event.target.value)}
                  placeholder={item.placeholder}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
                {item.followUpLabel ? (
                  <>
                    <label className="mt-3 block text-sm font-medium text-[color:var(--ink)]">{item.followUpLabel}</label>
                    <input
                      value={getFollowUpValue(item.key)}
                      onChange={(event) => setFollowUpValue(item.key, event.target.value)}
                      placeholder={item.followUpPlaceholder}
                      className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                    />
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveGuide("Grunduppgifter och frågeguide sparade.")}
            disabled={isSavingGuide}
            className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSavingGuide ? "Sparar..." : "Spara grunduppgifter och frågeguide"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Steg 1
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Obligatoriska delar av ledningssystemet</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Här fyller du bara i de delar av ledningssystemet som behövs för ansökningsunderlaget. Det här är inte hela driftmodulen.
        </p>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">Det här behöver beskrivas</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                Syfte, omfattning, ansvar, uppföljning, styrande dokument och formellt fastställande.
              </p>
            </div>
            {canUseAiSupport ? (
              <button
                type="button"
                onClick={() => void suggestManagementSystem()}
                disabled={isAiSuggestingManagement}
                className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isAiSuggestingManagement ? "AI arbetar..." : "AI: Föreslå utkast"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Grund och ansvar</p>
            <div className="mt-3 space-y-3">
              {managementSystemRequirementItems.slice(0, 4).map((item) => (
                <div key={item.key}>
                  <label className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</label>
                  <textarea
                    value={getAnswerValue(item.key)}
                    onChange={(event) => setAnswerValue(item.key, event.target.value)}
                    placeholder={item.label}
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Processer och uppföljning</p>
            <div className="mt-3 space-y-3">
              {managementSystemRequirementItems.slice(4, 6).map((item) => (
                <div key={item.key}>
                  <label className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</label>
                  <textarea
                    value={getAnswerValue(item.key)}
                    onChange={(event) => setAnswerValue(item.key, event.target.value)}
                    placeholder={item.label}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="text-sm font-semibold text-[color:var(--ink)]">{managementSystemRequirementItems[8].label}</label>
                <input
                  type="date"
                  value={getAnswerValue(managementSystemRequirementItems[8].key)}
                  onChange={(event) => setAnswerValue(managementSystemRequirementItems[8].key, event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4 lg:col-span-2">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Dokument och fastställande</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {managementSystemRequirementItems.slice(6, 8).map((item) => (
                <div key={item.key}>
                  <label className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</label>
                  <textarea
                    value={getAnswerValue(item.key)}
                    onChange={(event) => setAnswerValue(item.key, event.target.value)}
                    placeholder={item.label}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveGuide("Ledningssystemet för ansökan sparat.")}
            disabled={isSavingGuide}
            className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSavingGuide ? "Sparar..." : "Spara ledningssystem"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Steg 1
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">IVO-specifika kompletteringar</h2>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Fyll i de ansökningsspecifika uppgifterna direkt här så att du inte behöver gå via andra sidor.
        </p>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Ansvar och legitimation</p>
          <h3 className="mt-2 text-base font-semibold text-[color:var(--ink)]">Ansvariga personer i ansökan</h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--muted)]">
              Beskriv ansvariga roller, legitimationer och kompetens på en nivå som passar ansökningsunderlaget.
            </p>
            {canUseAiSupport ? (
              <button
                type="button"
                onClick={() => void suggestResponsiblePeople()}
                disabled={isAiSuggestingResponsiblePeople}
                className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isAiSuggestingResponsiblePeople ? "AI arbetar..." : "AI: Föreslå utkast"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Verksamhetsansvarig</p>
              <div className="mt-3 space-y-3">
                {responsiblePersonRequirementItems.slice(0, 3).map((item) => (
                  <input
                    key={item.key}
                    value={getAnswerValue(item.key)}
                    onChange={(event) => setAnswerValue(item.key, event.target.value)}
                    placeholder={item.placeholder}
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Medicinskt ansvarig</p>
              <div className="mt-3 space-y-3">
                {responsiblePersonRequirementItems.slice(3, 6).map((item) => (
                  <input
                    key={item.key}
                    value={getAnswerValue(item.key)}
                    onChange={(event) => setAnswerValue(item.key, event.target.value)}
                    placeholder={item.placeholder}
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Kvalitetsansvarig</p>
              <div className="mt-3 space-y-3">
                {responsiblePersonRequirementItems.slice(6, 9).map((item) => (
                  <input
                    key={item.key}
                    value={getAnswerValue(item.key)}
                    onChange={(event) => setAnswerValue(item.key, event.target.value)}
                    placeholder={item.placeholder}
                    className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Ägarbild och lämplighet</p>
          <h3 className="mt-2 text-base font-semibold text-[color:var(--ink)]">Huvudman och företrädare</h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--muted)]">
              Sammanfatta juridisk huvudman, företrädare och varför ledning och ägare bedöms lämpliga.
            </p>
            {canUseAiSupport ? (
              <button
                type="button"
                onClick={() => void suggestOwnershipSuitability()}
                disabled={isAiSuggestingOwnership}
                className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isAiSuggestingOwnership ? "AI arbetar..." : "AI: Föreslå utkast"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {ownershipRequirementItems.map((item) => {
              const isLongField = item.key === "ownership_structure_description" || item.key === "ownership_suitability_statement";

              return isLongField ? (
                <textarea
                  key={item.key}
                  value={getAnswerValue(item.key)}
                  onChange={(event) => setAnswerValue(item.key, event.target.value)}
                  placeholder={item.placeholder}
                  rows={4}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm md:col-span-2"
                />
              ) : (
                <input
                  key={item.key}
                  value={getAnswerValue(item.key)}
                  onChange={(event) => setAnswerValue(item.key, event.target.value)}
                  placeholder={item.placeholder}
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Lokaler och utrustning</p>
          <h3 className="mt-2 text-base font-semibold text-[color:var(--ink)]">Lokaler, hygienflöden och riskområden</h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--muted)]">
              Beskriv lokaler, patientflöden, hygienkritiska moment och eventuella särskilda riskområden.
            </p>
            {canUseAiSupport ? (
              <button
                type="button"
                onClick={() => void suggestFacilityAndEquipment()}
                disabled={isAiSuggestingFacility}
                className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isAiSuggestingFacility ? "AI arbetar..." : "AI: Föreslå utkast"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {facilityRequirementItems.map((item) => (
              <textarea
                key={item.key}
                value={getAnswerValue(item.key)}
                onChange={(event) => setAnswerValue(item.key, event.target.value)}
                placeholder={item.placeholder}
                rows={3}
                className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">Bilagechecklista</p>
          <h3 className="mt-2 text-base font-semibold text-[color:var(--ink)]">Referenser till underlag</h3>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[color:var(--muted)]">
              Lista vilka underlag som ska följa med ansökan och hur de är namngivna eller versionssatta.
            </p>
            {canUseAiSupport ? (
              <button
                type="button"
                onClick={() => void suggestAttachmentChecklist()}
                disabled={isAiSuggestingAttachments}
                className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
              >
                {isAiSuggestingAttachments ? "AI arbetar..." : "AI: Föreslå utkast"}
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {attachmentChecklistRequirementItems.map((item) => (
              <textarea
                key={item.key}
                value={getAnswerValue(item.key)}
                onChange={(event) => setAnswerValue(item.key, event.target.value)}
                placeholder={item.placeholder}
                rows={2}
                className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveGuide("Ansökningsuppgifterna sparade.")}
            disabled={isSavingGuide}
            className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSavingGuide ? "Sparar..." : "Spara ansökningsuppgifter"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Evidens och underlag</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Koppla dokument eller länkar till respektive krav för att stärka ansökningsunderlaget.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Lägg till evidens</p>
            <select
              value={evidenceForm.requirementId}
              onChange={(event) =>
                setEvidenceForm((prev) => ({ ...prev, requirementId: event.target.value }))
              }
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            >
              <option value="">Välj krav</option>
              {requirements.map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.code} - {requirement.title}
                </option>
              ))}
            </select>
            <input
              value={evidenceForm.title}
              onChange={(event) => setEvidenceForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Titel på underlag"
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            />
            <textarea
              value={evidenceForm.note}
              onChange={(event) => setEvidenceForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Kort beskrivning"
              rows={3}
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            />
            <input
              value={evidenceForm.filePath}
              onChange={(event) => setEvidenceForm((prev) => ({ ...prev, filePath: event.target.value }))}
              placeholder="Filväg eller URL (valfritt)"
              className="w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={suggestEvidence}
              disabled={isAiSuggestingEvidence}
              className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {isAiSuggestingEvidence ? "AI arbetar..." : "AI: Föreslå evidensutkast"}
            </button>
            <button
              type="button"
              onClick={createEvidence}
              disabled={isSavingEvidence}
              className="rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSavingEvidence ? "Sparar..." : "Spara evidens"}
            </button>
            {!canUseAiSupport && activePlan === "step2" ? (
              <p className="text-xs text-[color:var(--muted)]">
                AI-stöd i ansökan ingår i Klinikklar Komplett och Klinikklar Premium.
              </p>
            ) : null}
            {evidenceMessage ? <p className="text-sm text-[color:var(--muted)]">{evidenceMessage}</p> : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Tillagt underlag</p>
            {isLoading ? (
              <p className="text-sm text-[color:var(--muted)]">Läser in...</p>
            ) : evidence.length === 0 ? (
              <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
                Ingen evidens registrerad än.
              </p>
            ) : (
              evidence.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">
                    {item.requirementCode}
                  </p>
                  <p className="text-sm font-semibold text-[color:var(--ink)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{item.requirementTitle}</p>
                  {item.note ? <p className="mt-2 text-sm text-[color:var(--muted)]">{item.note}</p> : null}
                  {item.filePath ? (
                    <p className="mt-2 text-xs text-[color:var(--muted)]">Ref: {item.filePath}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Auditlogg</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Senaste händelser för status och evidens i ansökningsprocessen.
        </p>
        <div className="mt-4 space-y-2">
          {audit.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Ingen logghistorik ännu.</p>
          ) : (
            audit.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2"
              >
                <p className="text-sm font-semibold text-[color:var(--ink)]">{item.message}</p>
                <p className="text-xs text-[color:var(--muted)]">{new Date(item.created_at).toLocaleString("sv-SE")}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Steg 2
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Granska och exportera</h2>
          <p className="mt-2 text-[color:var(--muted)]">
            När underlaget är komplett kan det granskas och förberedas för export eller manuell inskick.
          </p>
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            Använd readiness-checklistan, evidensen och statussteget här på sidan för att slutföra ansökan.
          </p>
        </article>

        <article className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
            Nästa steg
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">Uppdatera ansökningsstatus</h2>
          <p className="mt-2 text-[color:var(--muted)]">
            När underlagen är ifyllda och evidensen är på plats kan du flytta ansökan vidare i processen.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {renderStatusAction(applicationStatus, checklist, updateApplicationStatus)}
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-[color:var(--line)] bg-white p-6">
        <h2 className="text-xl font-semibold text-[color:var(--ink)]">Rekommenderat arbetssätt</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">1. Samla fakta</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Fyll i verksamhet, ansvar, krav och evidens i rätt ordning.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">2. Skriv utkast</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Generera utkast i appen och justera innehållet innan granskning.
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">3. Exportera</p>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Exportera när materialet är granskat och klart att skickas in.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
        >
          Till startsidan
        </Link>
      </div>
    </div>
  );
}
