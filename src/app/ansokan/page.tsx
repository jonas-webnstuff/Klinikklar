"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import OrganizationProfileForm from "@/components/OrganizationProfileForm";
import { ApplicationPreparationChecklist } from "@/components/ansokan/ApplicationPreparationChecklist";
import { getOrganizationProfileError, type OrganizationProfileInput } from "@/lib/organization-profile";
import {
  documentKindFromRequirementCode,
  documentKindLabel,
  isPlaceholderDocumentDraftBody,
} from "@/lib/document-drafts";
import { callAiAssist } from "@/lib/ai/request-assistance";
import {
  careScopeCodeDefinitions,
  complianceRequirements,
  facilityRequirementItems,
  mainCareScopeCodes,
  managementSystemRequirementItems,
  questionnaireItems,
  structuredRequirementDefinitions,
  type CareScopeCode,
  type StructuredRequirementCode,
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

type AiFacilitySuggestion = {
  feature: "facility_and_equipment";
  premisesDescription: string;
  hygieneFlow: string;
  equipmentScope: string;
  specialRisks: string;
};

type StructuredRequirementRow = {
  id: string;
  requirementCode: StructuredRequirementCode;
  fields: Record<string, string>;
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  uploadedAt?: string | null;
  createdAt: string;
};

// Document shared across an entire requirement (R-08's aktiebok/registreringsbevis) —
// not one row per structured requirement item, see requirement_supporting_documents in
// schema.sql for why this is a separate concept from StructuredRequirementRow's files.
type RequirementSupportingDocument = {
  requirementCode: string;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  uploadedAt: string | null;
};

type ProfileState = OrganizationProfileInput;

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
  missingDocumentRequirements: string[];
  missingStructuredRequirementFields: string[];
  canMoveToReady: boolean;
  canSubmit: boolean;
  evidenceCount: number;
  completeRequirementCount: number;
  requirementCount: number;
  completeStructuredRequirementCodeCount: number;
  structuredRequirementCodeCount: number;
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

type DocumentDraftItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  isApproved: boolean;
  isCurrent: boolean;
  source: "ai" | "manual";
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

type ExportFormat = "pdf" | "docx";

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

const primaryButtonClass =
  "rounded-xl bg-[color:var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400";
const secondaryButtonClass =
  "rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] disabled:cursor-not-allowed disabled:text-slate-400";

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
        className={primaryButtonClass}
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
        className={primaryButtonClass}
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
        className={primaryButtonClass}
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
        className={secondaryButtonClass}
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
  const [documentDrafts, setDocumentDrafts] = useState<DocumentDraftItem[]>([]);
  const [requirements, setRequirements] = useState<RequirementOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingGuide, setIsSavingGuide] = useState(false);
  const [savingBlockKey, setSavingBlockKey] = useState<string | null>(null);
  const [savedBlocks, setSavedBlocks] = useState<Record<string, boolean>>({});
  const [dirtyBlocks, setDirtyBlocks] = useState<Record<string, boolean>>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [documentDraftMessage, setDocumentDraftMessage] = useState("");
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [isSavingEvidence, setIsSavingEvidence] = useState(false);
  const [isGeneratingDocumentDraft, setIsGeneratingDocumentDraft] = useState(false);
  const [isApprovingDocumentDraft, setIsApprovingDocumentDraft] = useState(false);
  const [deletingDocumentDraftId, setDeletingDocumentDraftId] = useState<string | null>(null);
  const [restoringDocumentId, setRestoringDocumentId] = useState<string | null>(null);
  const [expandedHistoryKinds, setExpandedHistoryKinds] = useState<Record<string, boolean>>({});
  const [isAiSuggestingEvidence, setIsAiSuggestingEvidence] = useState(false);
  const [isAiSuggestingManagement, setIsAiSuggestingManagement] = useState(false);
  const [isAiSuggestingFacility, setIsAiSuggestingFacility] = useState(false);
  const [documentDraftAiFailed, setDocumentDraftAiFailed] = useState(false);
  const [evidenceAiFailed, setEvidenceAiFailed] = useState(false);
  const [managementAiFailed, setManagementAiFailed] = useState(false);
  const [facilityAiFailed, setFacilityAiFailed] = useState(false);
  const [structuredRequirements, setStructuredRequirements] = useState<StructuredRequirementRow[]>([]);
  const [structuredRowEdits, setStructuredRowEdits] = useState<Record<string, Record<string, string>>>({});
  const [newStructuredRowDrafts, setNewStructuredRowDrafts] = useState<
    Partial<Record<StructuredRequirementCode, Record<string, string>>>
  >({});
  const [savingStructuredRowId, setSavingStructuredRowId] = useState<string | null>(null);
  const [deletingStructuredRowId, setDeletingStructuredRowId] = useState<string | null>(null);
  const [uploadingAttachmentRowId, setUploadingAttachmentRowId] = useState<string | null>(null);
  const [downloadingAttachmentRowId, setDownloadingAttachmentRowId] = useState<string | null>(null);
  const [attachmentErrorsByRowId, setAttachmentErrorsByRowId] = useState<Record<string, string>>({});
  const [requirementSupportingDocuments, setRequirementSupportingDocuments] = useState<
    Record<string, RequirementSupportingDocument>
  >({});
  const [uploadingRequirementCode, setUploadingRequirementCode] = useState<string | null>(null);
  const [downloadingRequirementCode, setDownloadingRequirementCode] = useState<string | null>(null);
  const [requirementAttachmentErrorsByCode, setRequirementAttachmentErrorsByCode] = useState<Record<string, string>>(
    {}
  );
  const [structuredRequirementMessage, setStructuredRequirementMessage] = useState("");
  const [careScopeCodes, setCareScopeCodes] = useState<CareScopeCode[]>([]);
  const [savingCareScopeCode, setSavingCareScopeCode] = useState<CareScopeCode | null>(null);
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
  const [documentDraftForm, setDocumentDraftForm] = useState({
    requirementId: "",
    title: "",
    body: "",
    note: "",
    kind: "",
  });

  const activeStageIndex = stages.findIndex((stage) => stage.key === applicationStatus);
  const canUseAiSupport = activePlan === "ansokan" || activePlan === "step1" || activePlan === "step3";
  const approvedDocumentDrafts = documentDrafts.filter((draft) => draft.isApproved && draft.isCurrent);
  const approvedDocumentDraftCount = approvedDocumentDrafts.length;

  const documentDraftGroups = useMemo(() => {
    const groups = new Map<string, { kind: string; current?: DocumentDraftItem; history: DocumentDraftItem[] }>();

    for (const draft of documentDrafts) {
      const group = groups.get(draft.kind) || { kind: draft.kind, current: undefined, history: [] };

      if (draft.isCurrent) {
        group.current = draft;
      } else {
        group.history.push(draft);
      }

      groups.set(draft.kind, group);
    }

    for (const group of groups.values()) {
      group.history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return Array.from(groups.values());
  }, [documentDrafts]);

  const hasMainCareScopeCode = useMemo(
    () => careScopeCodes.some((code) => (mainCareScopeCodes as CareScopeCode[]).includes(code)),
    [careScopeCodes]
  );

  const blockCompletion = useMemo(() => {
    const hasValue = (value: string) => Boolean(value.trim());
    const hasAnswer = (key: string) => hasValue(answers[key]?.answer || "");

    const profileQuestionnaireComplete =
      hasValue(profile.clinicName) &&
      hasValue(profile.orgNumber) &&
      hasValue(profile.address) &&
      hasValue(profile.postalCode) &&
      hasValue(profile.municipality) &&
      hasValue(profile.email) &&
      questionnaireItems.filter((item) => item.key !== "care_scope").every((item) => hasAnswer(item.key));

    const managementSystemComplete = managementSystemRequirementItems.every((item) => hasAnswer(item.key));
    const facilityComplete = facilityRequirementItems.every((item) => hasAnswer(item.key));

    return {
      "profile-questionnaire": profileQuestionnaireComplete,
      "management-system": managementSystemComplete,
      facility: facilityComplete,
      "application-all":
        profileQuestionnaireComplete &&
        managementSystemComplete &&
        facilityComplete,
    };
  }, [answers, profile]);

  function isBlockComplete(blockKey: string) {
    if (dirtyBlocks[blockKey]) {
      return false;
    }

    return savedBlocks[blockKey] || blockCompletion[blockKey as keyof typeof blockCompletion] || false;
  }

  function formatEvidenceReference(item: EvidenceItem) {
    const rawValue = (item.filePath || "").trim();

    if (!rawValue) {
      return "";
    }

    if (rawValue.includes("[kravkod]-underlag-v1.docx")) {
      return `Intern referens: underlag-${item.requirementCode.toLowerCase()}-v1.docx`;
    }

    if (rawValue.toLowerCase().startsWith("intern referens:")) {
      return rawValue;
    }

    if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
      return `Länk: ${rawValue}`;
    }

    if (rawValue.startsWith("/docs/")) {
      return `Dokumentreferens: ${rawValue}`;
    }

    return `Intern referens: ${rawValue}`;
  }

  const uiChecklist = useMemo(() => {
    if (!checklist) {
      return null;
    }

    const managementSystemComplete = !dirtyBlocks["management-system"] && (savedBlocks["management-system"] || blockCompletion["management-system"]);
    const facilityComplete = !dirtyBlocks.facility && (savedBlocks.facility || blockCompletion.facility);

    const ivoChecklistItems = checklist.ivoChecklistItems.map((item) => {
      switch (item.key) {
        // organization_identity, clinic_location, quality_process and incident_routine
        // intentionally have no client-side override here: each already carries the
        // correct server-computed `done` value from computeReadinessChecklist, and none
        // of the four are actually related to one another. Overriding them with a single
        // shared local boolean caused a past regression (see care_scope fix); trust the
        // server per-item instead of re-deriving a coarser approximation client-side.
        case "care_scope":
          return { ...item, done: hasMainCareScopeCode };
        case "management_system":
          return { ...item, done: managementSystemComplete };
        case "facility_and_equipment":
          return { ...item, done: facilityComplete };
        default:
          return item;
      }
    });

    const missingIvoItems = ivoChecklistItems.filter((item) => !item.done).map((item) => item.label);
    const ivoChecklistComplete = missingIvoItems.length === 0;
    const canMoveToReady =
      checklist.hasOrganization &&
      checklist.hasClinic &&
      checklist.questionnaireComplete &&
      checklist.requirementsComplete &&
      ivoChecklistComplete;
    const canSubmit = canMoveToReady && checklist.evidenceLinked;

    return {
      ...checklist,
      ivoChecklistItems,
      missingIvoItems,
      ivoChecklistComplete,
      canMoveToReady,
      canSubmit,
    };
  }, [checklist, dirtyBlocks, savedBlocks, blockCompletion, hasMainCareScopeCode]);

  // Aggregates every independent "unsaved changes" signal on the page into one count, so a
  // single sticky banner can warn regardless of which section the user is currently looking
  // at. structuredRowEdits/newStructuredRowDrafts are the real risk — each row is saved by
  // its own button, so editing one row and then saving a different one silently strands the
  // first (see the R-06/R-07 "Spara rad" pattern). dirtyBlocks (Grunduppgifter/Ledningssystem/
  // Lokaler) is safer in practice — saveGuide posts the whole answers/profile state regardless
  // of which block's button was clicked — but its per-block flag can still lag behind, so it's
  // included too rather than have the banner disagree with a card still showing "Spara".
  // Prefixed keys keep the three id namespaces (row id / draft code / block key) from colliding.
  const unsavedChangeCount = useMemo(() => {
    const dirtyKeys = new Set<string>();

    for (const [rowId, edits] of Object.entries(structuredRowEdits)) {
      if (edits && Object.keys(edits).length > 0) {
        dirtyKeys.add(`row:${rowId}`);
      }
    }

    for (const [code, draft] of Object.entries(newStructuredRowDrafts)) {
      if (draft && Object.values(draft).some((value) => String(value ?? "").trim())) {
        dirtyKeys.add(`draft:${code}`);
      }
    }

    for (const [blockKey, isDirty] of Object.entries(dirtyBlocks)) {
      if (isDirty && blockKey !== "application-all") {
        dirtyKeys.add(`block:${blockKey}`);
      }
    }

    return dirtyKeys.size;
  }, [structuredRowEdits, newStructuredRowDrafts, dirtyBlocks]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (unsavedChangeCount === 0) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsavedChangeCount]);

  const visibleApplicationStatus = useMemo(() => {
    if (applicationStatus === "submitted" && !uiChecklist?.canSubmit) {
      return uiChecklist?.canMoveToReady ? "ready_to_submit" : "draft";
    }

    if ((applicationStatus === "ready_to_submit" || applicationStatus === "in_review") && !uiChecklist?.canMoveToReady) {
      return "draft";
    }

    return applicationStatus;
  }, [applicationStatus, uiChecklist]);

  const visibleActiveStageIndex = stages.findIndex((stage) => stage.key === visibleApplicationStatus);

  function resolveBlockKeyForAnswer(questionKey: string) {
    if (questionnaireItems.some((item) => item.key === questionKey)) {
      return "profile-questionnaire";
    }

    if (managementSystemRequirementItems.some((item) => item.key === questionKey)) {
      return "management-system";
    }

    if (facilityRequirementItems.some((item) => item.key === questionKey)) {
      return "facility";
    }

    return null;
  }

  function markBlockAsDirty(blockKey: string | null) {
    if (!blockKey) {
      return;
    }

    setDirtyBlocks((prev) => ({
      ...prev,
      [blockKey]: true,
      "application-all": true,
    }));

    setSavedBlocks((prev) => ({
      ...prev,
      [blockKey]: false,
      "application-all": false,
    }));
  }

  function getAnswerValue(key: string) {
    return answers[key]?.answer || "";
  }

  function getFollowUpValue(key: string) {
    return answers[key]?.followUpAnswer || "";
  }

  function setAnswerValue(key: string, value: string) {
    markBlockAsDirty(resolveBlockKeyForAnswer(key));
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        answer: value,
        followUpAnswer: prev[key]?.followUpAnswer || "",
      },
    }));
  }

  function setFollowUpValue(key: string, value: string) {
    markBlockAsDirty(resolveBlockKeyForAnswer(key));
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        answer: prev[key]?.answer || "",
        followUpAnswer: value,
      },
    }));
  }

  useEffect(() => {
    const representativeValue = profile.email.trim();

    setAnswers((prev) => {
      const legalEntityNameCurrent = prev.ownership_legal_entity_name?.answer || "";
      const legalEntityOrgNumberCurrent = prev.ownership_legal_entity_org_number?.answer || "";
      const representativeCurrent = prev.ownership_representative_name?.answer || "";

      if (
        legalEntityNameCurrent === profile.clinicName &&
        legalEntityOrgNumberCurrent === profile.orgNumber &&
        representativeCurrent === representativeValue
      ) {
        return prev;
      }

      return {
        ...prev,
        ownership_legal_entity_name: {
          answer: profile.clinicName,
          followUpAnswer: prev.ownership_legal_entity_name?.followUpAnswer || "",
        },
        ownership_legal_entity_org_number: {
          answer: profile.orgNumber,
          followUpAnswer: prev.ownership_legal_entity_org_number?.followUpAnswer || "",
        },
        ownership_representative_name: {
          answer: representativeValue,
          followUpAnswer: prev.ownership_representative_name?.followUpAnswer || "",
        },
      };
    });
  }, [profile.clinicName, profile.orgNumber, profile.email]);

  const readinessItems = useMemo(
    () => [
      {
        key: "profile",
        label: "Grunduppgifter för verksamheten är kompletta",
        done: Boolean(uiChecklist?.hasOrganization && uiChecklist?.hasClinic),
      },
      {
        key: "questionnaire",
        label: "Frågeguiden är ifylld",
        done: uiChecklist?.questionnaireComplete || false,
      },
      {
        key: "requirements",
        label: "Kravlistan är komplett",
        done: uiChecklist?.requirementsComplete || false,
      },
      {
        key: "evidence",
        label: "Evidens finns för varje krav",
        done: uiChecklist?.evidenceLinked || false,
      },
    ],
    [uiChecklist]
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

  async function loadDocumentDrafts() {
    const response = await fetch("/api/documents/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      documents?: DocumentDraftItem[];
    };

    setDocumentDrafts(data.documents || []);
  }

  async function loadStructuredRequirements() {
    const response = await fetch("/api/structured-requirements/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      items?: StructuredRequirementRow[];
    };

    setStructuredRequirements(data.items || []);
  }

  async function loadRequirementSupportingDocuments() {
    const response = await fetch("/api/requirement-attachments/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as {
      documents?: RequirementSupportingDocument[];
    };

    setRequirementSupportingDocuments(
      Object.fromEntries((data.documents || []).map((doc) => [doc.requirementCode, doc]))
    );
  }

  async function loadCareScopeCodes() {
    const response = await fetch("/api/care-scope/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { codes?: CareScopeCode[] };
    setCareScopeCodes(data.codes || []);
  }

  async function toggleCareScopeCode(code: CareScopeCode, selected: boolean) {
    markBlockAsDirty("profile-questionnaire");
    setSavingCareScopeCode(code);
    setStructuredRequirementMessage("");

    const response = await fetch("/api/care-scope/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, selected }),
    });

    setSavingCareScopeCode(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStructuredRequirementMessage(data.error || "Kunde inte spara inriktningskoden.");
      return;
    }

    setCareScopeCodes((prev) =>
      selected ? [...prev.filter((item) => item !== code), code] : prev.filter((item) => item !== code)
    );
    await loadApplicationState();
  }

  function updateStructuredRowEdit(rowId: string, key: string, value: string) {
    setStructuredRowEdits((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [key]: value },
    }));
  }

  function updateNewStructuredRowDraft(code: StructuredRequirementCode, key: string, value: string) {
    setNewStructuredRowDrafts((prev) => ({
      ...prev,
      [code]: { ...(prev[code] || {}), [key]: value },
    }));
  }

  /**
   * At most one row (existing or draft) per requirement code may have `fieldKey` set to "true".
   * `keepRowId === null` means the draft row is the one being checked.
   */
  function clearOtherExclusiveFields(code: StructuredRequirementCode, fieldKey: string, keepRowId: string | null) {
    structuredRequirements
      .filter((row) => row.requirementCode === code && row.id !== keepRowId)
      .forEach((row) => updateStructuredRowEdit(row.id, fieldKey, "false"));

    if (keepRowId !== null && newStructuredRowDrafts[code]?.[fieldKey] === "true") {
      updateNewStructuredRowDraft(code, fieldKey, "false");
    }
  }

  function startNewStructuredRow(code: StructuredRequirementCode) {
    setNewStructuredRowDrafts((prev) => ({ ...prev, [code]: {} }));
  }

  function startNewStructuredRowFromPreset(code: StructuredRequirementCode, fields: Record<string, string>) {
    setNewStructuredRowDrafts((prev) => ({ ...prev, [code]: { ...fields } }));
  }

  // Builds a human-readable summary of a structured requirement row for use as an R-09
  // attachment name. Excludes checkbox fields — without this, R-07's isOperationsManager/
  // hasInsight* fields leak their raw "true"/"false" string straight into the summary
  // (confirmed live in production data: "Anna Svensson — Verksamhetschef — 234524 — true").
  function summarizeStructuredRow(row: StructuredRequirementRow) {
    const def = structuredRequirementDefinitions[row.requirementCode];
    const visibleFields = def.fields.filter((field) => field.type !== "checkbox");

    return (
      visibleFields
        .map((field) => row.fields[field.key])
        .filter(Boolean)
        .join(" — ") || def.itemLabel
    );
  }

  function getInternalDocumentOptions() {
    const fromDrafts = approvedDocumentDrafts.map((draft) => {
      const requirement = complianceRequirements.find((item) => item.documentKind === draft.kind);
      const code = requirement?.code || "";

      return {
        value: `draft:${draft.id}`,
        label: `${code} – ${draft.title}`,
        attachmentName: draft.title,
        relatedRequirement: code,
        linkedDraftId: draft.id,
        linkedItemId: undefined as string | undefined,
      };
    });

    const fromStructured = structuredRequirements
      .filter(
        (row) =>
          row.requirementCode === "R-06" || row.requirementCode === "R-07" || row.requirementCode === "R-08"
      )
      .map((row) => {
        const summary = summarizeStructuredRow(row);

        return {
          value: `structured:${row.id}`,
          label: `${row.requirementCode} – ${summary}`,
          attachmentName: summary,
          relatedRequirement: row.requirementCode,
          linkedItemId: row.id as string | undefined,
          linkedDraftId: undefined as string | undefined,
        };
      });

    return [...fromDrafts, ...fromStructured];
  }

  function selectInternalDocumentForAttachment(optionValue: string) {
    const option = getInternalDocumentOptions().find((item) => item.value === optionValue);

    if (!option) {
      return;
    }

    const isApprovedDraft = optionValue.startsWith("draft:");

    startNewStructuredRowFromPreset("R-09", {
      attachmentName: option.attachmentName,
      relatedRequirement: option.relatedRequirement,
      // Kept alongside the text snapshot so we can later detect if the source row/draft
      // was deleted or changed — see getLinkedAttachmentWarning. Never used to gate
      // completeness, purely informational.
      ...(option.linkedItemId ? { linkedItemId: option.linkedItemId } : {}),
      ...(option.linkedDraftId ? { linkedDraftId: option.linkedDraftId } : {}),
      status: isApprovedDraft ? "finns" : "kopplat, ej bifogat",
    });
  }

  function cancelNewStructuredRow(code: StructuredRequirementCode) {
    setNewStructuredRowDrafts((prev) => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
  }

  async function saveStructuredRow(code: StructuredRequirementCode, rowId?: string) {
    const existingRow = rowId ? structuredRequirements.find((row) => row.id === rowId) : undefined;
    const fields = rowId
      ? { ...(existingRow?.fields || {}), ...(structuredRowEdits[rowId] || {}) }
      : newStructuredRowDrafts[code] || {};

    const savingId = rowId || `new:${code}`;
    setSavingStructuredRowId(savingId);
    setStructuredRequirementMessage("");

    const response = await fetch("/api/structured-requirements/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId, requirementCode: code, fields }),
    });

    setSavingStructuredRowId(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStructuredRequirementMessage(data.error || "Kunde inte spara.");
      return;
    }

    if (rowId) {
      setStructuredRowEdits((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
    } else {
      cancelNewStructuredRow(code);
    }

    await loadStructuredRequirements();
    await loadApplicationState();
  }

  async function deleteStructuredRow(rowId: string) {
    setDeletingStructuredRowId(rowId);
    setStructuredRequirementMessage("");

    const response = await fetch("/api/structured-requirements/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rowId }),
    });

    setDeletingStructuredRowId(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStructuredRequirementMessage(data.error || "Kunde inte ta bort posten.");
      return;
    }

    await loadStructuredRequirements();
    await loadApplicationState();
  }

  function setAttachmentRowError(rowId: string, error: string | null) {
    setAttachmentErrorsByRowId((prev) => {
      if (error === null) {
        if (!(rowId in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[rowId];
        return next;
      }
      return { ...prev, [rowId]: error };
    });
  }

  // Upload/download errors (fel filtyp, för stor fil, m.m.) are shown inline at the row
  // whose upload control triggered them, not as a page-level banner — with many R-09
  // rows on screen, a banner at the top can go unnoticed.
  async function uploadStructuredRowAttachment(rowId: string, file: File) {
    setUploadingAttachmentRowId(rowId);
    setAttachmentRowError(rowId, null);

    const formData = new FormData();
    formData.append("itemId", rowId);
    formData.append("file", file);

    const response = await fetch("/api/structured-requirements/attachments", {
      method: "POST",
      body: formData,
    });

    setUploadingAttachmentRowId(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setAttachmentRowError(rowId, data.error || "Kunde inte ladda upp filen.");
      return;
    }

    await loadStructuredRequirements();
    await loadApplicationState();
  }

  async function downloadStructuredRowAttachment(rowId: string) {
    setDownloadingAttachmentRowId(rowId);
    setAttachmentRowError(rowId, null);

    const response = await fetch("/api/structured-requirements/attachments/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: rowId }),
    });

    setDownloadingAttachmentRowId(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setAttachmentRowError(rowId, data.error || "Kunde inte skapa nedladdningslänk.");
      return;
    }

    const data = (await response.json()) as { url?: string };

    if (data.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    }
  }

  function setRequirementAttachmentError(requirementCode: string, error: string | null) {
    setRequirementAttachmentErrorsByCode((prev) => {
      if (error === null) {
        if (!(requirementCode in prev)) {
          return prev;
        }
        const next = { ...prev };
        delete next[requirementCode];
        return next;
      }
      return { ...prev, [requirementCode]: error };
    });
  }

  // Mirrors uploadStructuredRowAttachment/downloadStructuredRowAttachment above, but for
  // a document shared across the whole requirement (R-08's aktiebok) instead of one row.
  async function uploadRequirementSupportingDocument(requirementCode: string, file: File) {
    setUploadingRequirementCode(requirementCode);
    setRequirementAttachmentError(requirementCode, null);

    const formData = new FormData();
    formData.append("requirementCode", requirementCode);
    formData.append("file", file);

    const response = await fetch("/api/requirement-attachments", {
      method: "POST",
      body: formData,
    });

    setUploadingRequirementCode(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setRequirementAttachmentError(requirementCode, data.error || "Kunde inte ladda upp filen.");
      return;
    }

    await loadRequirementSupportingDocuments();
    await loadApplicationState();
  }

  async function downloadRequirementSupportingDocument(requirementCode: string) {
    setDownloadingRequirementCode(requirementCode);
    setRequirementAttachmentError(requirementCode, null);

    const response = await fetch("/api/requirement-attachments/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requirementCode }),
    });

    setDownloadingRequirementCode(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setRequirementAttachmentError(requirementCode, data.error || "Kunde inte skapa nedladdningslänk.");
      return;
    }

    const data = (await response.json()) as { url?: string };

    if (data.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    }
  }

  /**
   * An R-09 row created via "Koppla till befintligt dokument" stores a one-time text
   * snapshot (attachmentName) of the R-06/07/08 row or document draft it pointed at —
   * never a live reference. If the source is later deleted or edited, the snapshot goes
   * stale silently. This detects that using linkedItemId/linkedDraftId (stored going
   * forward, see selectInternalDocumentForAttachment) where available, and falls back to
   * a weaker "can't verify" notice for rows saved before that tracking existed.
   *
   * Quickpick-created rows (standardType set) are category labels, not snapshots of a
   * specific row/draft, and are never flagged.
   */
  function getLinkedAttachmentWarning(row: StructuredRequirementRow): string | null {
    const fields = row.fields as Record<string, string | undefined>;

    if (fields.standardType) {
      return null;
    }

    if (fields.linkedItemId) {
      const source = structuredRequirements.find((item) => item.id === fields.linkedItemId);

      if (!source) {
        return "Käll-raden för den här bilagan har tagits bort sedan kopplingen gjordes. Kontrollera att uppgiften fortfarande stämmer.";
      }

      const currentSummary = summarizeStructuredRow(source);

      if (currentSummary !== fields.attachmentName) {
        return `Källuppgiften har ändrats sedan kopplingen gjordes. Aktuell uppgift: "${currentSummary}".`;
      }

      return null;
    }

    if (fields.linkedDraftId) {
      const source = documentDrafts.find((draft) => draft.id === fields.linkedDraftId);

      if (!source) {
        return "Det kopplade dokumentutkastet har tagits bort sedan kopplingen gjordes. Kontrollera att uppgiften fortfarande stämmer.";
      }

      if (source.title !== fields.attachmentName) {
        return `Det kopplade dokumentutkastet har bytt titel sedan kopplingen gjordes. Aktuell titel: "${source.title}".`;
      }

      return null;
    }

    if (fields.relatedRequirement) {
      return `Den här bilagan hänvisar till ${fields.relatedRequirement}, men kopplingen skapades innan käll-raden kunde spåras. Kontrollera manuellt att uppgiften fortfarande stämmer.`;
    }

    return null;
  }

  function renderStructuredRequirementSection(code: StructuredRequirementCode) {
    const def = structuredRequirementDefinitions[code];
    const rows = structuredRequirements.filter((row) => row.requirementCode === code);
    const newRowDraft = newStructuredRowDrafts[code];

    return (
      <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">{code}</p>
        <h3 className="mt-2 text-base font-semibold text-[color:var(--ink)]">{def.title}</h3>
        <p className="mt-1 text-sm text-[color:var(--muted)]">{def.description}</p>

        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-[color:var(--line)] bg-white p-3">
              <div className="grid gap-3 md:grid-cols-3">
                {def.fields.map((field) => {
                  // R-09's status is derived from whether a file is actually attached
                  // (see computeReadinessChecklist) — a free-text status field would let
                  // someone mark "finns" again without a real upload, exactly the gap
                  // the file upload closes. Rendered as the attachment block below instead.
                  if (code === "R-09" && field.key === "status") {
                    return null;
                  }

                  return field.type === "checkbox" ? (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={(structuredRowEdits[row.id]?.[field.key] ?? row.fields[field.key]) === "true"}
                        onChange={(event) => {
                          if (event.target.checked && field.exclusive) {
                            clearOtherExclusiveFields(code, field.key, row.id);
                          }
                          updateStructuredRowEdit(row.id, field.key, event.target.checked ? "true" : "false");
                        }}
                      />
                      {field.label}
                    </label>
                  ) : (
                    <div key={field.key}>
                      <label className="text-xs font-semibold text-[color:var(--muted)]">{field.label}</label>
                      <input
                        type={field.type === "number" ? "number" : "text"}
                        value={structuredRowEdits[row.id]?.[field.key] ?? row.fields[field.key] ?? ""}
                        onChange={(event) => updateStructuredRowEdit(row.id, field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  );
                })}
              </div>

              {code === "R-09" ? (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3">
                    {row.filePath ? (
                      <>
                        <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          ✓ Finns
                        </span>
                        <span className="text-sm text-[color:var(--ink)]">
                          {row.fileName}
                          {row.uploadedAt
                            ? ` · uppladdad ${new Date(row.uploadedAt).toLocaleDateString("sv-SE")}`
                            : ""}
                        </span>
                        <button
                          type="button"
                          onClick={() => void downloadStructuredRowAttachment(row.id)}
                          disabled={downloadingAttachmentRowId === row.id}
                          className="text-xs font-semibold text-[color:var(--brand)] disabled:text-slate-400"
                        >
                          {downloadingAttachmentRowId === row.id ? "Öppnar..." : "Ladda ner"}
                        </button>
                      </>
                    ) : (
                      <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                        Saknas
                      </span>
                    )}
                    <label
                      className={`${secondaryButtonClass} cursor-pointer ${
                        uploadingAttachmentRowId === row.id ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      {uploadingAttachmentRowId === row.id ? "Laddar upp..." : row.filePath ? "Byt fil" : "Ladda upp fil"}
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        className="hidden"
                        disabled={uploadingAttachmentRowId === row.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";

                          if (file) {
                            void uploadStructuredRowAttachment(row.id, file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {attachmentErrorsByRowId[row.id] ? (
                    <p className="mt-2 text-xs font-semibold text-red-700">{attachmentErrorsByRowId[row.id]}</p>
                  ) : null}
                  {getLinkedAttachmentWarning(row) ? (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      ⚠ {getLinkedAttachmentWarning(row)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveStructuredRow(code, row.id)}
                  disabled={savingStructuredRowId === row.id}
                  className={
                    structuredRowEdits[row.id] && Object.keys(structuredRowEdits[row.id]).length > 0
                      ? primaryButtonClass
                      : secondaryButtonClass
                  }
                >
                  {savingStructuredRowId === row.id ? "Sparar..." : "Spara rad"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteStructuredRow(row.id)}
                  disabled={deletingStructuredRowId === row.id}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {deletingStructuredRowId === row.id ? "Tar bort..." : `Ta bort ${def.itemLabel}`}
                </button>
              </div>
            </div>
          ))}
        </div>

        {code === "R-08" ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Styrkande handling (delas av samtliga ägare ovan)
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              T.ex. aktiebok eller registreringsbevis från Bolagsverket — en handling som styrker hela ägarbilden,
              inte en fil per ägare.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3">
              {requirementSupportingDocuments[code]?.filePath ? (
                <>
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    ✓ Finns
                  </span>
                  <span className="text-sm text-[color:var(--ink)]">
                    {requirementSupportingDocuments[code].fileName}
                    {requirementSupportingDocuments[code].uploadedAt
                      ? ` · uppladdad ${new Date(requirementSupportingDocuments[code].uploadedAt as string).toLocaleDateString("sv-SE")}`
                      : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => void downloadRequirementSupportingDocument(code)}
                    disabled={downloadingRequirementCode === code}
                    className="text-xs font-semibold text-[color:var(--brand)] disabled:text-slate-400"
                  >
                    {downloadingRequirementCode === code ? "Öppnar..." : "Ladda ner"}
                  </button>
                </>
              ) : (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                  Saknas
                </span>
              )}
              <label
                className={`${secondaryButtonClass} cursor-pointer ${
                  uploadingRequirementCode === code ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {uploadingRequirementCode === code
                  ? "Laddar upp..."
                  : requirementSupportingDocuments[code]?.filePath
                    ? "Byt fil"
                    : "Ladda upp fil"}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  className="hidden"
                  disabled={uploadingRequirementCode === code}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";

                    if (file) {
                      void uploadRequirementSupportingDocument(code, file);
                    }
                  }}
                />
              </label>
            </div>
            {requirementAttachmentErrorsByCode[code] ? (
              <p className="mt-2 text-xs font-semibold text-red-700">{requirementAttachmentErrorsByCode[code]}</p>
            ) : null}
          </div>
        ) : null}

        {code === "R-09" ? (
          <div className="mt-3">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Koppla till befintligt dokument (valfritt)
            </label>
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  selectInternalDocumentForAttachment(event.target.value);
                }
              }}
              className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
            >
              <option value="">Välj ett godkänt R-01–R-05-dokument eller R-06–R-08-krav...</option>
              {getInternalDocumentOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {def.quickPicks && def.quickPicks.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Vanliga bilagor som IVO efterfrågar
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {def.quickPicks.map((preset) => {
                const standardType = preset.fields.standardType;
                const isFulfilled =
                  Boolean(standardType) &&
                  rows.some((row) => row.fields.standardType === standardType && Boolean(row.filePath));

                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => startNewStructuredRowFromPreset(code, preset.fields)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                      isFulfilled
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                        : "border-[color:var(--line)] bg-white text-[color:var(--ink)]"
                    }`}
                  >
                    {isFulfilled ? `✓ ${preset.label}` : preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {newRowDraft ? (
          <div className="mt-3 rounded-xl border border-dashed border-[color:var(--line)] bg-white p-3">
            <div className="grid gap-3 md:grid-cols-3">
              {def.fields.map((field) => {
                // Same reasoning as the saved-rows list above: R-09 status isn't a free
                // text field anymore. The row also doesn't exist yet here, so upload
                // isn't possible until after it's saved — see the hint below instead.
                if (code === "R-09" && field.key === "status") {
                  return null;
                }

                return field.type === "checkbox" ? (
                  <label
                    key={field.key}
                    className="flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={newRowDraft[field.key] === "true"}
                      onChange={(event) => {
                        if (event.target.checked && field.exclusive) {
                          clearOtherExclusiveFields(code, field.key, null);
                        }
                        updateNewStructuredRowDraft(code, field.key, event.target.checked ? "true" : "false");
                      }}
                    />
                    {field.label}
                  </label>
                ) : (
                  <div key={field.key}>
                    <label className="text-xs font-semibold text-[color:var(--muted)]">{field.label}</label>
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={newRowDraft[field.key] || ""}
                      onChange={(event) => updateNewStructuredRowDraft(code, field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                    />
                  </div>
                );
              })}
            </div>
            {code === "R-09" ? (
              <p className="mt-2 text-xs text-[color:var(--muted)]">
                Spara raden först — sedan kan du ladda upp filen.
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveStructuredRow(code)}
                disabled={savingStructuredRowId === `new:${code}`}
                className={primaryButtonClass}
              >
                {savingStructuredRowId === `new:${code}` ? "Sparar..." : "Spara rad"}
              </button>
              <button type="button" onClick={() => cancelNewStructuredRow(code)} className={secondaryButtonClass}>
                Avbryt
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <button type="button" onClick={() => startNewStructuredRow(code)} className={secondaryButtonClass}>
              {`Lägg till ${def.itemLabel}`}
            </button>
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    const selectedRequirement = requirements.find((item) => item.id === documentDraftForm.requirementId);

    if (!selectedRequirement) {
      return;
    }

    const nextKind = documentKindFromRequirementCode(selectedRequirement.code);

    setDocumentDraftForm((prev) =>
      prev.kind === nextKind ? prev : { ...prev, kind: nextKind }
    );
  }, [documentDraftForm.requirementId, requirements]);

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

  async function saveGuide(successMessage: string, blockKey = "guide") {
    const profileError = getOrganizationProfileError(profile);

    if (profileError) {
      setStatusMessage(profileError);
      return;
    }

    setIsSavingGuide(true);
    setSavingBlockKey(blockKey);
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
    setSavingBlockKey(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setStatusMessage(data.error || "Kunde inte spara ansökningsuppgifterna.");
      return;
    }

    setAiContext({ clinicName: profile.clinicName, municipality: profile.municipality });
    setDirtyBlocks((prev) => ({
      ...prev,
      [blockKey]: false,
    }));
    setSavedBlocks((prev) => ({
      ...prev,
      [blockKey]: true,
    }));
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

  async function createDocumentDraft(options?: { manual?: boolean }) {
    if (!documentDraftForm.requirementId) {
      setDocumentDraftMessage("Välj krav innan du skapar ett dokumentutkast.");
      return;
    }

    const selectedRequirement = requirements.find((item) => item.id === documentDraftForm.requirementId);

    if (!selectedRequirement) {
      setDocumentDraftMessage("Välj ett giltigt krav.");
      return;
    }

    setIsGeneratingDocumentDraft(true);
    setDocumentDraftMessage("");
    setDocumentDraftAiFailed(false);

    const result = await callAiAssist<{ document: DocumentDraftItem }>("/api/documents/draft", {
      requirementId: documentDraftForm.requirementId,
      title: documentDraftForm.title,
      body: documentDraftForm.body,
      note: documentDraftForm.note,
      mode: options?.manual ? "manual" : "ai",
    });

    setIsGeneratingDocumentDraft(false);

    if (!result.ok) {
      setDocumentDraftAiFailed(true);
      setDocumentDraftMessage(result.error);
      return;
    }

    const data = result.data;

    setDocumentDraftForm((prev) => ({
      ...prev,
      title: data.document.title,
      body: data.document.body,
      note: "Utkastet är skapat och väntar på godkännande.",
      kind: documentKindFromRequirementCode(selectedRequirement.code),
    }));
    setDocumentDraftMessage("Dokumentutkast skapat. Granska och godkänn när det är klart.");
    await loadDocumentDrafts();
    await loadApplicationState();
  }

  async function approveDocumentDraft(documentId: string) {
    setIsApprovingDocumentDraft(true);
    setDocumentDraftMessage("");

    const response = await fetch("/api/documents/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });

    setIsApprovingDocumentDraft(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setDocumentDraftMessage(data.error || "Kunde inte godkänna dokumentutkastet.");
      return;
    }

    const data = (await response.json()) as { warning?: string };

    setDocumentDraftMessage(
      data.warning
        ? `Dokumentutkastet är godkänt av verksamhetsansvarig. ⚠ ${data.warning}`
        : "Dokumentutkastet är godkänt av verksamhetsansvarig."
    );
    await loadDocumentDrafts();
    await loadApplicationState();
  }

  async function deleteDocumentDraft(documentId: string) {
    setDeletingDocumentDraftId(documentId);
    setDocumentDraftMessage("");

    const response = await fetch("/api/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });

    setDeletingDocumentDraftId(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setDocumentDraftMessage(data.error || "Kunde inte ta bort dokumentutkastet.");
      return;
    }

    setDocumentDraftMessage("Dokumentutkastet togs bort.");
    await loadDocumentDrafts();
    await loadApplicationState();
  }

  async function restoreDocumentDraft(documentId: string) {
    setRestoringDocumentId(documentId);
    setDocumentDraftMessage("");

    const response = await fetch("/api/documents/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });

    setRestoringDocumentId(null);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setDocumentDraftMessage(data.error || "Kunde inte återställa versionen.");
      return;
    }

    setDocumentDraftMessage("Versionen är återställd som aktuellt utkast. Godkänn på nytt innan det används i ansökan.");
    await loadDocumentDrafts();
    await loadApplicationState();
  }

  async function downloadDocumentDraft(draft: DocumentDraftItem, format: ExportFormat) {
    const statusLine = draft.reviewedBy
      ? `Godkänt av ${draft.reviewedBy}${draft.reviewedAt ? ` den ${new Date(draft.reviewedAt).toLocaleString("sv-SE")}` : ""}`
      : draft.isApproved
        ? "Godkänt"
        : "Ej godkänt";

    const documentContent = [
      `# ${draft.title}`,
      `## Dokumenttyp: ${documentKindLabel(draft.kind as never)}`,
      `## Status: ${statusLine}`,
      "",
      "## Innehåll",
      draft.body,
    ].join("\n");

    const response = await fetch("/api/documents/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        title: draft.title,
        content: documentContent,
      }),
    });

    if (!response.ok) {
      setDocumentDraftMessage("Kunde inte exportera dokumentutkastet.");
      return;
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${draft.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  }

  async function downloadApprovedDocumentPackage(format: ExportFormat) {
    if (approvedDocumentDraftCount === 0) {
      setDocumentDraftMessage("Det finns inga godkända dokument att exportera.");
      return;
    }

    const packageTitle = "Ansökan - dokumentpaket";
    const packageContent = approvedDocumentDrafts
      .map((draft) => {
        const statusLine = draft.reviewedBy
          ? `Godkänt av ${draft.reviewedBy}${draft.reviewedAt ? ` den ${new Date(draft.reviewedAt).toLocaleString("sv-SE")}` : ""}`
          : "Godkänt";

        return [
          `### ${documentKindLabel(draft.kind as never)}: ${draft.title}`,
          `Status: ${statusLine}`,
          "",
          draft.body,
          "",
          "---",
          "",
        ].join("\n");
      })
      .join("\n");

    const response = await fetch("/api/documents/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        title: packageTitle,
        content: packageContent,
      }),
    });

    if (!response.ok) {
      setDocumentDraftMessage("Kunde inte exportera dokumentpaketet.");
      return;
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${packageTitle
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  }

  async function downloadCompleteApplicationPackage(format: ExportFormat) {
    if (approvedDocumentDraftCount === 0 && evidence.length === 0) {
      setEvidenceMessage("Det finns inget underlag att exportera ännu.");
      return;
    }

    setEvidenceMessage("");

    const packageTitle = "Ansökan - komplett underlag";
    const generatedAt = new Date().toLocaleString("sv-SE");

    const approvedDraftSection =
      approvedDocumentDrafts.length > 0
        ? approvedDocumentDrafts
            .map((draft) => {
              const statusLine = draft.reviewedBy
                ? `Godkänt av ${draft.reviewedBy}${draft.reviewedAt ? ` den ${new Date(draft.reviewedAt).toLocaleString("sv-SE")}` : ""}`
                : "Godkänt";

              return [
                `### ${documentKindLabel(draft.kind as never)}: ${draft.title}`,
                statusLine,
                "",
                draft.body,
                "",
                "---",
                "",
              ].join("\n");
            })
            .join("\n")
          : "Inga godkända dokumentutkast i paketet.";

    const evidenceSection =
      evidence.length > 0
        ? evidence
            .map((item) => {
              const referenceText = formatEvidenceReference(item);

              return [
                `### ${item.requirementCode} - ${item.requirementTitle}`,
                `Titel: ${item.title}`,
                item.note ? `Beskrivning: ${item.note}` : "Beskrivning: -",
                referenceText ? referenceText : "Intern referens: -",
                "",
                "---",
                "",
              ].join("\n");
            })
            .join("\n")
        : "Ingen kopplad evidens i paketet.";

    const careScopeSection = (() => {
      const selectedDefinitions = careScopeCodeDefinitions.filter((definition) =>
        careScopeCodes.includes(definition.code)
      );

      const body =
        selectedDefinitions.length > 0
          ? selectedDefinitions.map((definition) => `- ${definition.label} (${definition.code})`).join("\n")
          : "Ingen inriktningskod vald.";

      const description = getAnswerValue("care_scope").trim();

      return ["## Inriktning (IVO-kod)", body, description ? `\nYtterligare beskrivning: ${description}` : ""].join(
        "\n"
      );
    })();

    const structuredSection = (code: StructuredRequirementCode) => {
      const def = structuredRequirementDefinitions[code];
      const rows = structuredRequirements.filter((row) => row.requirementCode === code);

      const insightAreaLabels: Array<{ key: string; shortLabel: string }> = [
        { key: "hasInsightLegislation", shortLabel: "lagstiftning" },
        { key: "hasInsightLaborLaw", shortLabel: "arbetsrätt" },
        { key: "hasInsightEconomy", shortLabel: "ekonomi" },
      ];

      const formatRow = (row: StructuredRequirementRow) => {
        if (code === "R-07") {
          const isOperationsManager = row.fields.isOperationsManager === "true";
          const visibleFields = def.fields.filter((field) => field.type !== "checkbox");
          const line = visibleFields.map((field) => row.fields[field.key] || "-").join(" — ");
          const coveredAreas = insightAreaLabels
            .filter((area) => row.fields[area.key] === "true")
            .map((area) => area.shortLabel);

          const tags = [
            isOperationsManager ? "Verksamhetschef" : null,
            coveredAreas.length > 0 ? `Kunskap: ${coveredAreas.join(", ")}` : null,
          ].filter((tag): tag is string => Boolean(tag));

          return tags.length > 0 ? `${line} (${tags.join(" · ")})` : line;
        }

        if (code === "R-09") {
          // Status is derived from the uploaded file, not the stored fields.status text
          // (see computeReadinessChecklist) — the export must agree with that, not with
          // whatever text happened to be saved before the file-upload requirement existed.
          const visibleFields = def.fields.filter((field) => field.key !== "status");
          const line = visibleFields.map((field) => row.fields[field.key] || "-").join(" — ");
          const statusLabel = row.filePath ? `Finns${row.fileName ? ` (${row.fileName})` : ""}` : "Saknas";
          // Must reach the actual exported document, not just the web UI — a stale
          // "Koppla till befintligt dokument" reference (deleted/changed source row) is
          // exactly the kind of thing that must not silently slip into what gets sent to IVO.
          const linkWarning = getLinkedAttachmentWarning(row);
          const warningSuffix = linkWarning ? ` [VARNING: ${linkWarning}]` : "";
          return `${line} — ${statusLabel}${warningSuffix}`;
        }

        return def.fields.map((field) => row.fields[field.key] || "-").join(" — ");
      };

      const sortedRows =
        code === "R-07"
          ? [...rows].sort(
              (a, b) =>
                Number(b.fields.isOperationsManager === "true") - Number(a.fields.isOperationsManager === "true")
            )
          : rows;

      const body =
        sortedRows.length > 0
          ? sortedRows.map(formatRow).map((line) => `- ${line}`).join("\n")
          : `Inga rader tillagda för ${def.title.toLowerCase()}.`;

      return [`## ${def.title} (${code})`, body].join("\n");
    };

    const attachmentsSection = (() => {
      const rows = structuredRequirements.filter((row) => row.requirementCode === "R-09");
      const introLine =
        "Länkarna nedan är för din egen nedladdning – logga in på Klinikklar för att hämta filerna, och bifoga dem sedan separat när ni skickar in ansökan till IVO. Länkarna fungerar inte för någon utanför er organisation.";

      if (rows.length === 0) {
        return ["## Bilagor (nedladdningslänkar)", introLine, "", "Inga bilagerader tillagda."].join("\n");
      }

      const origin = window.location.origin;

      const body = rows
        .map((row) => {
          const name = row.fields.attachmentName || "(namnlös bilaga)";
          const related = row.fields.relatedRequirement || "-";
          // Must reach the actual exported document, not just the web UI — see
          // getLinkedAttachmentWarning for what this catches.
          const linkWarning = getLinkedAttachmentWarning(row);
          const warningLine = linkWarning ? `⚠ VARNING: ${linkWarning}` : null;

          if (!row.filePath) {
            // Listed explicitly rather than silently omitted — otherwise the export
            // looks incomplete with no explanation for why a checklist item has no
            // download link.
            return [
              `### ${name}`,
              `Kopplat krav: ${related}`,
              "Ingen fil bifogad – hanteras separat.",
              ...(warningLine ? [warningLine] : []),
              "",
              "---",
              "",
            ].join("\n");
          }

          const uploadedAtText = row.uploadedAt ? new Date(row.uploadedAt).toLocaleString("sv-SE") : "-";
          // A stable link to /api/.../open, not a signed Storage URL — the signed URL is
          // minted fresh at click time (see that route), since this export can be read
          // days or weeks after a short-lived signed URL would already have expired.
          const openUrl = `${origin}/api/structured-requirements/attachments/open?itemId=${row.id}`;

          return [
            `### ${name}`,
            `Kopplat krav: ${related}`,
            `Fil: ${row.fileName || "-"} (uppladdad ${uploadedAtText})`,
            `Nedladdning: ${openUrl}`,
            ...(warningLine ? [warningLine] : []),
            "",
            "---",
            "",
          ].join("\n");
        })
        .join("\n");

      return ["## Bilagor (nedladdningslänkar)", introLine, "", body].join("\n");
    })();

    const r08SupportingDocumentSection = (() => {
      const document = requirementSupportingDocuments["R-08"];

      if (!document?.filePath) {
        return ["## R-08: Styrkande handling (ägarbild)", "Ingen delad handling uppladdad."].join("\n");
      }

      const uploadedAtText = document.uploadedAt ? new Date(document.uploadedAt).toLocaleString("sv-SE") : "-";
      const openUrl = `${window.location.origin}/api/requirement-attachments/open?requirementCode=R-08`;

      return [
        "## R-08: Styrkande handling (ägarbild)",
        `Fil: ${document.fileName || "-"} (uppladdad ${uploadedAtText})`,
        `Nedladdning: ${openUrl}`,
      ].join("\n");
    })();

    const packageContent = [
      "# Komplett ansökningsunderlag",
      `Genererad: ${generatedAt}`,
      "",
      "## A. Godkända dokumentutkast",
      approvedDraftSection,
      "",
      "## B. Kopplade underlag och evidens",
      evidenceSection,
      "",
      careScopeSection,
      "",
      structuredSection("R-06"),
      "",
      structuredSection("R-07"),
      "",
      structuredSection("R-08"),
      "",
      r08SupportingDocumentSection,
      "",
      structuredSection("R-09"),
      "",
      attachmentsSection,
      "",
      structuredSection("R-10"),
    ].join("\n");

    const response = await fetch("/api/documents/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        title: packageTitle,
        content: packageContent,
      }),
    });

    if (!response.ok) {
      setEvidenceMessage("Kunde inte exportera komplett underlag.");
      return;
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${packageTitle
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  }

  async function suggestEvidence(options?: { manual?: boolean }) {
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
    setEvidenceAiFailed(false);

    const result = await callAiAssist<AiEvidenceSuggestion>("/api/ai/assist", {
      plan: activePlan,
      feature: "application_evidence",
      mode: options?.manual ? "manual" : "ai",
      clinicName: aiContext.clinicName,
      municipality: aiContext.municipality,
      currentEvidence: {
        requirementCode: selectedRequirement?.code || "",
        requirementTitle: selectedRequirement?.title || "",
        title: evidenceForm.title,
        note: evidenceForm.note,
        filePath: evidenceForm.filePath,
      },
    });

    setIsAiSuggestingEvidence(false);

    if (!result.ok) {
      setEvidenceAiFailed(true);
      setEvidenceMessage(result.error);
      return;
    }

    const data = result.data;

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

  async function suggestManagementSystem(options?: { manual?: boolean }) {
    if (!canUseAiSupport || !activePlan) {
      setStatusMessage("AI-stöd i ansökan ingår i Klinikklar Ansökan, Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    setIsAiSuggestingManagement(true);
    setStatusMessage("");
    setManagementAiFailed(false);

    const result = await callAiAssist<AiManagementSystemSuggestion>("/api/ai/assist", {
      plan: activePlan,
      feature: "management_system",
      mode: options?.manual ? "manual" : "ai",
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
    });

    setIsAiSuggestingManagement(false);

    if (!result.ok) {
      setManagementAiFailed(true);
      setStatusMessage(result.error);
      return;
    }

    const data = result.data;

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


  async function suggestFacilityAndEquipment(options?: { manual?: boolean }) {
    if (!canUseAiSupport || !activePlan) {
      setStatusMessage("AI-stöd i ansökan ingår i Klinikklar Ansökan, Klinikklar Komplett och Klinikklar Premium.");
      return;
    }

    setIsAiSuggestingFacility(true);
    setStatusMessage("");
    setFacilityAiFailed(false);

    const result = await callAiAssist<AiFacilitySuggestion>("/api/ai/assist", {
      plan: activePlan,
      feature: "facility_and_equipment",
      mode: options?.manual ? "manual" : "ai",
      clinicName: profile.clinicName,
      municipality: profile.municipality,
      currentFacilityAndEquipment: {
        premisesDescription: getAnswerValue("facility_premises_description"),
        hygieneFlow: getAnswerValue("facility_hygiene_flow"),
        equipmentScope: getAnswerValue("facility_equipment_scope"),
        specialRisks: getAnswerValue("facility_special_risks"),
      },
    });

    setIsAiSuggestingFacility(false);

    if (!result.ok) {
      setFacilityAiFailed(true);
      setStatusMessage(result.error);
      return;
    }

    const data = result.data;

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


  useEffect(() => {
    void loadApplicationState();
    void loadEvidence();
    void loadDocumentDrafts();
    void loadStructuredRequirements();
    void loadRequirementSupportingDocuments();
    void loadCareScopeCodes();
    void loadWorkspacePlanContext();
  }, []);

  return (
    <>
      {unsavedChangeCount > 0 ? (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-100 px-6 py-2 text-sm font-semibold text-amber-900 shadow-[0_4px_16px_rgba(146,64,14,0.12)]">
          Du har osparade ändringar ({unsavedChangeCount}) — spara innan du lämnar sidan.
        </div>
      ) : null}

      <div
        className={`mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10 md:px-10 ${
          unsavedChangeCount > 0 ? "pt-16" : ""
        }`}
      >
      <header className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">
          Ansökan
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-[color:var(--ink)]">Förbered din IVO-ansökan</h1>
        <p className="mt-3 max-w-3xl text-[color:var(--muted)]">
          Här samlar du frågeguiden, underlagen, evidensen och statusen inför inskick till IVO.
        </p>
        <div className="mt-4 inline-flex rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
          Nuvarande status: {stageLabels[visibleApplicationStatus]}
        </div>
        {statusMessage ? <p className="mt-3 text-sm text-[color:var(--muted)]">{statusMessage}</p> : null}
      </header>

      <ApplicationPreparationChecklist />

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
            const isActive = index === visibleActiveStageIndex;
            const isCompleted = index < visibleActiveStageIndex;

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
                {stage.key === "submitted" ? (
                  <a
                    href="#ivo-export"
                    className="mt-3 inline-flex rounded-lg border border-[color:var(--line)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--ink)]"
                  >
                    Gå till export
                  </a>
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

        <div id="readiness-checklist" className="mt-5 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
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
            Krav klara: {uiChecklist?.completeRequirementCount || 0}/{uiChecklist?.requirementCount || 0}. Evidens: {uiChecklist?.evidenceCount || 0}.
          </p>
          {uiChecklist?.missingDocumentRequirements?.length ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                Krav som saknar godkänt, ifyllt dokumentutkast
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {uiChecklist.missingDocumentRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {uiChecklist?.missingStructuredRequirementFields?.length ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                Strukturerade krav (R-06–R-10) som saknar uppgifter
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {uiChecklist.missingStructuredRequirementFields.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
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
                uiChecklist?.ivoChecklistComplete
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {uiChecklist?.ivoChecklistComplete ? "Grundpaket komplett" : "Komplettering krävs"}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(uiChecklist?.ivoChecklistItems || []).map((item) => (
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

          {uiChecklist?.missingIvoItems?.length ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">Kvar innan ansökningsunderlaget är komplett i appen</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {uiChecklist.missingIvoItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {uiChecklist?.advisoryIvoGaps?.length ? (
            <div className="mt-4 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Kvar att modellera i produkten</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
                {uiChecklist.advisoryIvoGaps.map((item) => (
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
              onChange={(field, value) => {
                markBlockAsDirty("profile-questionnaire");
                if (field === "clinicName" || field === "orgNumber" || field === "email") {
                  markBlockAsDirty("ownership");
                }
                setProfile((prev) => ({ ...prev, [field]: value }));
              }}
              disabled={isSavingGuide}
            />
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Inriktning (IVO-kod)</p>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Ange verksamhetens inriktning med IVO:s koder. Kryssa i minst en huvudkategori. Om
            &quot;Tandläkarverksamhet, allmän tandvård (A02)&quot; kryssas i kan ni även ange eventuell
            specialistverksamhet nedan.
          </p>
          {structuredRequirementMessage ? (
            <p className="mt-2 text-sm text-[color:var(--muted)]">{structuredRequirementMessage}</p>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {careScopeCodeDefinitions
              .filter((definition) => definition.group === "main")
              .map((definition) => (
                <label
                  key={definition.code}
                  className="flex items-start gap-2 rounded-xl border border-[color:var(--line)] bg-white p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={careScopeCodes.includes(definition.code)}
                    disabled={savingCareScopeCode === definition.code}
                    onChange={(event) => void toggleCareScopeCode(definition.code, event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    {definition.label} ({definition.code})
                  </span>
                </label>
              ))}
          </div>

          {careScopeCodes.includes("A02") ? (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
                Specialistverksamhet (frivilligt)
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {careScopeCodeDefinitions
                  .filter((definition) => definition.group === "specialist")
                  .map((definition) => (
                    <label
                      key={definition.code}
                      className="flex items-start gap-2 rounded-xl border border-[color:var(--line)] bg-white p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={careScopeCodes.includes(definition.code)}
                        disabled={savingCareScopeCode === definition.code}
                        onChange={(event) => void toggleCareScopeCode(definition.code, event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>
                        {definition.label} ({definition.code})
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <p className="text-sm font-semibold text-[color:var(--ink)]">Frågeguide</p>
          <div className="mt-3 grid gap-4">
            {questionnaireItems.map((item) => (
              <div key={item.key} className="rounded-2xl border border-[color:var(--line)] bg-white p-4">
                {item.key === "quality_process" ? (
                  <p className="mb-2 text-sm text-[color:var(--muted)]">
                    Det korta svaret här räcker för att uppfylla IVO-checklistans egen punkt om kvalitetsuppföljning.
                    Det ersätter inte det mer utförliga R-05 (Internkontroll)-dokumentutkastet som skapas och
                    godkänns längre fram i ansökan — båda behövs.
                  </p>
                ) : null}
                {item.key === "incident_routine" ? (
                  <p className="mb-2 text-sm text-[color:var(--muted)]">
                    Det korta svaret här räcker för att uppfylla IVO-checklistans egen punkt om avvikelsehantering.
                    Det ersätter inte det mer utförliga R-04 (Avvikelsehantering)-dokumentutkastet som skapas och
                    godkänns längre fram i ansökan — båda behövs.
                  </p>
                ) : null}
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
            onClick={() => void saveGuide("Grunduppgifter och frågeguide sparade.", "profile-questionnaire")}
            disabled={isSavingGuide}
            className={isBlockComplete("profile-questionnaire") ? secondaryButtonClass : primaryButtonClass}
          >
            {isSavingGuide && savingBlockKey === "profile-questionnaire"
              ? "Sparar..."
              : isBlockComplete("profile-questionnaire")
                ? "Sparad"
                : "Spara grunduppgifter och frågeguide"}
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
                className={secondaryButtonClass}
              >
                {isAiSuggestingManagement ? "AI arbetar..." : "AI: Föreslå utkast"}
              </button>
            ) : null}
            {managementAiFailed ? (
              <button
                type="button"
                onClick={() => void suggestManagementSystem({ manual: true })}
                disabled={isAiSuggestingManagement}
                className={secondaryButtonClass}
              >
                Fortsätt utan AI-hjälp (fyll i mall)
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
            onClick={() => void saveGuide("Ledningssystemet för ansökan sparat.", "management-system")}
            disabled={isSavingGuide}
            className={isBlockComplete("management-system") ? secondaryButtonClass : primaryButtonClass}
          >
            {isSavingGuide && savingBlockKey === "management-system"
              ? "Sparar..."
              : isBlockComplete("management-system")
                ? "Sparad"
                : "Spara ledningssystem"}
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

        {structuredRequirementMessage ? (
          <p className="mt-4 text-sm text-[color:var(--muted)]">{structuredRequirementMessage}</p>
        ) : null}

        {uiChecklist?.missingStructuredRequirementFields?.length ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              Strukturerade krav (R-06–R-09) som saknar uppgifter
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
              {uiChecklist.missingStructuredRequirementFields.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-4 text-sm text-[color:var(--muted)]">
          Detta är en separat, strukturerad lista över roller och bemanning (R-06). Den ersätter inte fritextfrågan
          &quot;Hur är bemanningen planerad?&quot; i frågeguiden ovan — båda behöver fyllas i.
        </p>
        {renderStructuredRequirementSection("R-06")}
        {renderStructuredRequirementSection("R-07")}
        {renderStructuredRequirementSection("R-08")}

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
                className={secondaryButtonClass}
              >
                {isAiSuggestingFacility ? "AI arbetar..." : "AI: Föreslå utkast"}
              </button>
            ) : null}
            {facilityAiFailed ? (
              <button
                type="button"
                onClick={() => void suggestFacilityAndEquipment({ manual: true })}
                disabled={isAiSuggestingFacility}
                className={secondaryButtonClass}
              >
                Fortsätt utan AI-hjälp (fyll i mall)
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {facilityRequirementItems.map((item) => (
              <div key={item.key}>
                <label className="text-sm font-semibold text-[color:var(--ink)]">{item.label}</label>
                <textarea
                  value={getAnswerValue(item.key)}
                  onChange={(event) => setAnswerValue(item.key, event.target.value)}
                  placeholder={item.placeholder}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveGuide("Lokaler och utrustning sparat.", "facility")}
              disabled={isSavingGuide}
              className={isBlockComplete("facility") ? secondaryButtonClass : primaryButtonClass}
            >
              {isSavingGuide && savingBlockKey === "facility"
                ? "Sparar..."
                : isBlockComplete("facility")
                  ? "Sparad"
                  : "Spara lokaler och utrustning"}
            </button>
          </div>
        </div>

        {renderStructuredRequirementSection("R-09")}
        {renderStructuredRequirementSection("R-10")}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void saveGuide("Ansökningsuppgifterna sparade.", "application-all")}
            disabled={isSavingGuide}
            className={isBlockComplete("application-all") ? secondaryButtonClass : primaryButtonClass}
          >
            {isSavingGuide && savingBlockKey === "application-all"
              ? "Sparar..."
              : isBlockComplete("application-all")
                ? "Hela ansökan sparad"
                : "Spara ansökningsuppgifter"}
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
            <p className="text-sm font-semibold text-[color:var(--ink)]">Skapa dokumentutkast</p>
            <p className="text-sm text-[color:var(--muted)]">
              AI skapar ett utkast som verksamhetsansvarig kan granska och godkänna innan det används i ansökan.
            </p>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Krav</label>
              <select
                value={documentDraftForm.requirementId}
                onChange={(event) => {
                  const nextRequirementId = event.target.value;
                  const nextRequirement = requirements.find((item) => item.id === nextRequirementId);
                  const nextKind = nextRequirement ? documentKindFromRequirementCode(nextRequirement.code) : "";
                  const nextTitle = nextRequirement
                    ? `Dokumentutkast ${nextRequirement.code} - ${nextRequirement.title}`
                    : "";

                  setDocumentDraftMessage("");
                  setDocumentDraftForm((prev) => ({
                    ...prev,
                    requirementId: nextRequirementId,
                    kind: nextKind,
                    title: nextTitle,
                    body: "",
                    note: "",
                  }));
                }}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Välj krav för dokumentutkast</option>
                {requirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>
                    {requirement.code} - {requirement.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm text-[color:var(--muted)]">
              Dokumenttyp: {documentDraftForm.kind ? documentKindLabel(documentDraftForm.kind as never) : "Välj ett krav först"}
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Titel</label>
              <input
                value={documentDraftForm.title}
                onChange={(event) => setDocumentDraftForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Titel på dokumentutkast"
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Innehåll</label>
              <textarea
                value={documentDraftForm.body}
                onChange={(event) => setDocumentDraftForm((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="Dokumentets innehåll"
                rows={8}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Notis till verksamhetsansvarig</label>
              <textarea
                value={documentDraftForm.note}
                onChange={(event) => setDocumentDraftForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Notis till verksamhetsansvarig"
                rows={3}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => createDocumentDraft()}
                disabled={isGeneratingDocumentDraft}
                className={primaryButtonClass}
              >
                {isGeneratingDocumentDraft ? "AI arbetar..." : "AI: Skapa dokumentutkast"}
              </button>
              {documentDraftAiFailed ? (
                <button
                  type="button"
                  onClick={() => createDocumentDraft({ manual: true })}
                  disabled={isGeneratingDocumentDraft}
                  className={secondaryButtonClass}
                >
                  Fortsätt utan AI-hjälp (fyll i mall)
                </button>
              ) : null}
            </div>
            {documentDraftMessage ? <p className="text-sm text-[color:var(--muted)]">{documentDraftMessage}</p> : null}
          </div>

          <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-white p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Granska och exportera</p>
            <p className="text-sm text-[color:var(--muted)]">
              {approvedDocumentDraftCount} godkända dokument är redo att exporteras i paketet.
            </p>
            <div className="flex flex-wrap gap-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3">
              <button
                type="button"
                onClick={() => void downloadApprovedDocumentPackage("pdf")}
                className={secondaryButtonClass}
              >
                Ladda ner paket som PDF
              </button>
              <button
                type="button"
                onClick={() => void downloadApprovedDocumentPackage("docx")}
                className={secondaryButtonClass}
              >
                Ladda ner paket som DOCX
              </button>
            </div>
            {documentDrafts.length === 0 ? (
              <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
                Inga dokumentutkast skapade ännu.
              </p>
            ) : (
              <div className="space-y-3">
                {documentDraftGroups.map((group) => {
                  const draft = group.current;
                  if (!draft) return null;

                  const isHistoryExpanded = Boolean(expandedHistoryKinds[group.kind]);
                  const isPlaceholder = isPlaceholderDocumentDraftBody(draft.body);

                  return (
                    <article key={group.kind} className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--brand)]">
                            {documentKindLabel(draft.kind as never)}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-[color:var(--ink)]">{draft.title}</h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[color:var(--line)] px-2 py-0.5 text-xs font-semibold text-[color:var(--ink)]">
                            {draft.source === "manual" ? "Manuellt ifyllt" : "AI-genererat"}
                          </span>
                          {isPlaceholder ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                              ⚠ Ofullständigt innehåll
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              draft.isApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {draft.isApproved ? "Godkänd och klar" : "Väntar på godkännande"}
                          </span>
                        </div>
                      </div>
                      <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-[color:var(--line)] bg-white p-3 text-xs leading-5 text-[color:var(--ink)]">
                        {draft.body}
                      </pre>
                      {draft.reviewedBy ? (
                        <p className="mt-2 text-xs text-[color:var(--muted)]">
                          Godkänd av {draft.reviewedBy}
                          {draft.reviewedAt ? ` den ${new Date(draft.reviewedAt).toLocaleString("sv-SE")}` : ""}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => void approveDocumentDraft(draft.id)}
                          disabled={draft.isApproved || isApprovingDocumentDraft}
                          className={primaryButtonClass}
                        >
                          {draft.isApproved
                            ? "Godkänt"
                            : isApprovingDocumentDraft
                              ? "Godkänner..."
                              : "Godkänn som verksamhetsansvarig"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDocumentDraft(draft.id)}
                          disabled={deletingDocumentDraftId === draft.id}
                          className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:text-slate-400"
                        >
                          {deletingDocumentDraftId === draft.id ? "Tar bort..." : "Ta bort utkast"}
                        </button>
                        {draft.isApproved ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void downloadDocumentDraft(draft, "pdf")}
                              className={secondaryButtonClass}
                            >
                              Ladda ner PDF
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadDocumentDraft(draft, "docx")}
                              className={secondaryButtonClass}
                            >
                              Ladda ner DOCX
                            </button>
                          </>
                        ) : null}
                      </div>

                      {group.history.length > 0 ? (
                        <div className="mt-3 border-t border-[color:var(--line)] pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedHistoryKinds((prev) => ({ ...prev, [group.kind]: !prev[group.kind] }))
                            }
                            className="text-xs font-semibold text-[color:var(--brand)] underline"
                          >
                            {isHistoryExpanded
                              ? "Dölj tidigare versioner"
                              : `Visa tidigare versioner (${group.history.length})`}
                          </button>

                          {isHistoryExpanded ? (
                            <div className="mt-3 space-y-2">
                              {group.history.map((historyItem) => (
                                <div
                                  key={historyItem.id}
                                  className="rounded-xl border border-[color:var(--line)] bg-white p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-xs text-[color:var(--muted)]">
                                      {new Date(historyItem.createdAt).toLocaleString("sv-SE")}
                                      {" · "}
                                      {historyItem.source === "manual" ? "Manuellt ifyllt" : "AI-genererat"}
                                      {isPlaceholderDocumentDraftBody(historyItem.body) ? " · ⚠ Ofullständigt innehåll" : ""}
                                      {historyItem.reviewedBy ? ` · Tidigare godkänd av ${historyItem.reviewedBy}` : ""}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => void restoreDocumentDraft(historyItem.id)}
                                      disabled={restoringDocumentId === historyItem.id}
                                      className={secondaryButtonClass}
                                    >
                                      {restoringDocumentId === historyItem.id
                                        ? "Återställer..."
                                        : "Återställ den här versionen"}
                                    </button>
                                  </div>
                                  <details className="mt-2">
                                    <summary className="cursor-pointer text-xs font-semibold text-[color:var(--ink)]">
                                      Visa text
                                    </summary>
                                    <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] p-3 text-xs leading-5 text-[color:var(--ink)]">
                                      {historyItem.body}
                                    </pre>
                                  </details>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
          Detta är ett komplement till dokumentutkasten ovan – här kan du länka befintligt material (filer, länkar,
          referenser) som ytterligare stöd för vilket krav som helst, utöver R-01–R-05:s fullständiga
          AI-genererade dokument.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <p className="text-sm font-semibold text-[color:var(--ink)]">Koppla evidens per krav</p>
            <p className="text-sm text-[color:var(--muted)]">
              Lägg in bilagor, länkar eller korta beskrivningar som visar hur kravet uppfylls i praktiken.
            </p>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Krav</label>
              <select
                value={evidenceForm.requirementId}
                onChange={(event) =>
                  setEvidenceForm((prev) => ({ ...prev, requirementId: event.target.value }))
                }
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              >
                <option value="">Välj krav</option>
                {requirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>
                    {requirement.code} - {requirement.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Titel</label>
              <input
                value={evidenceForm.title}
                onChange={(event) => setEvidenceForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Titel på underlag"
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Beskrivning</label>
              <textarea
                value={evidenceForm.note}
                onChange={(event) => setEvidenceForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Kort beskrivning"
                rows={3}
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[color:var(--muted)]">Filväg eller URL</label>
              <input
                value={evidenceForm.filePath}
                onChange={(event) => setEvidenceForm((prev) => ({ ...prev, filePath: event.target.value }))}
                placeholder="Filväg eller URL (valfritt)"
                className="mt-1 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => suggestEvidence()}
              disabled={isAiSuggestingEvidence}
              className={secondaryButtonClass}
            >
              {isAiSuggestingEvidence ? "AI arbetar..." : "AI: Föreslå evidensutkast"}
            </button>
            {evidenceAiFailed ? (
              <button
                type="button"
                onClick={() => suggestEvidence({ manual: true })}
                disabled={isAiSuggestingEvidence}
                className={secondaryButtonClass}
              >
                Fortsätt utan AI-hjälp (fyll i mall)
              </button>
            ) : null}
            <button type="button" onClick={createEvidence} disabled={isSavingEvidence} className={primaryButtonClass}>
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Kopplade underlag</p>
              <a href="#ivo-export" className="text-xs font-semibold text-[color:var(--brand)]">
                Exportera i Steg 4
              </a>
            </div>
            {isLoading ? (
              <p className="text-sm text-[color:var(--muted)]">Läser in...</p>
            ) : evidence.length === 0 ? (
              <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-sm text-[color:var(--muted)]">
                Ingen evidens registrerad än.
              </p>
            ) : (
              evidence.map((item) => {
                const referenceText = formatEvidenceReference(item);

                return (
                  <article key={item.id} className="rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--muted)]">Underlag</p>
                    <p className="text-sm font-semibold text-[color:var(--ink)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {item.requirementCode} - {item.requirementTitle}
                    </p>
                    {item.note ? <p className="mt-2 text-sm text-[color:var(--muted)]">{item.note}</p> : null}
                    {referenceText ? (
                      <p className="mt-2 text-xs text-[color:var(--muted)]">{referenceText}</p>
                    ) : null}
                  </article>
                );
              })
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
            När underlaget är komplett kan det granskas och förberedas för export eller manuell inskickning.
          </p>
          <p className="mt-4 text-sm text-[color:var(--muted)]">
            Använd readiness-checklistan, evidensen och statussteget här på sidan för att slutföra ansökan.
          </p>
          <a
            href="#ivo-export"
            className="mt-4 inline-flex rounded-xl border border-[color:var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)]"
          >
            Fortsätt till Steg 4: Export
          </a>
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
              {renderStatusAction(visibleApplicationStatus, checklist, updateApplicationStatus)}
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

      <section id="ivo-export" className="rounded-3xl border border-[color:var(--line)] bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--brand)]">Steg 4</p>
        <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">Klar att skicka - export till IVO</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Här samlar du all export på ett ställe innan manuell inskickning till IVO.
        </p>

        {uiChecklist && !uiChecklist.canMoveToReady ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              Ansökan är inte komplett än – {uiChecklist.missingIvoItems.length} punkter saknar uppgifter.
            </p>
            <a href="#readiness-checklist" className="mt-1 inline-block text-sm font-semibold text-amber-900 underline">
              Granska readiness-checklistan innan du skickar in
            </a>
          </div>
        ) : null}

        <div className="mt-4">
          <article className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-[color:var(--ink)]">Komplett ansökningspaket</p>
              {uiChecklist && !uiChecklist.canMoveToReady ? (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Ofullständig
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              Innehåller godkända dokumentutkast samt kopplade underlag och evidens.
            </p>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Godkända dokument: {approvedDocumentDraftCount}. Kopplade underlag: {evidence.length}. Strukturerade
              krav (R-06–R-10) klara: {uiChecklist?.completeStructuredRequirementCodeCount ?? 0}/
              {uiChecklist?.structuredRequirementCodeCount ?? 0}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void downloadCompleteApplicationPackage("pdf")}
                disabled={approvedDocumentDraftCount === 0 && evidence.length === 0}
                className={primaryButtonClass}
              >
                Ladda ner komplett paket PDF
              </button>
              <button
                type="button"
                onClick={() => void downloadCompleteApplicationPackage("docx")}
                disabled={approvedDocumentDraftCount === 0 && evidence.length === 0}
                className={secondaryButtonClass}
              >
                Ladda ner komplett paket DOCX
              </button>
            </div>
          </article>
        </div>

        {evidenceMessage ? <p className="mt-3 text-sm text-[color:var(--muted)]">{evidenceMessage}</p> : null}
        {documentDraftMessage ? <p className="mt-1 text-sm text-[color:var(--muted)]">{documentDraftMessage}</p> : null}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className={secondaryButtonClass}
        >
          Till startsidan
        </Link>
      </div>
      </div>
    </>
  );
}
