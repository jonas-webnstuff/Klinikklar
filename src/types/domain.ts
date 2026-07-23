export type UUID = string;

export type ApplicationStatus =
  | "draft"
  | "in_review"
  | "ready_to_submit"
  | "submitted";

export type RequirementStatus = "missing" | "in_progress" | "complete";

export type DocumentKind =
  | "verksamhetsbeskrivning"
  | "ledningssystem"
  | "riskanalys"
  | "avvikelsehantering"
  | "egenkontroll";

export interface Organization {
  id: UUID;
  name: string;
  orgNumber: string;
  email: string;
  phone?: string;
  plan?: "ansokan" | "step1" | "step2" | "step3" | null;
  createdAt: string;
}

export interface Clinic {
  id: UUID;
  organizationId: UUID;
  name: string;
  address: string;
  municipality: string;
  region: string;
  hasRadiology: boolean;
  hasSedation: boolean;
  createdAt: string;
}

export interface Person {
  id: UUID;
  organizationId: UUID;
  fullName: string;
  roleTitle: string;
  legitimationNumber?: string;
  email: string;
}

export interface OwnershipRole {
  id: UUID;
  organizationId: UUID;
  personId: UUID;
  roleType: "owner" | "medical_responsible" | "quality_responsible";
  ownershipPercent?: number;
}

export interface Application {
  id: UUID;
  organizationId: UUID;
  clinicId: UUID;
  status: ApplicationStatus;
  startedAt: string;
  updatedAt: string;
}

export interface QuestionnaireResponse {
  id: UUID;
  applicationId: UUID;
  questionKey: string;
  answer: string;
  followUpAnswer?: string;
  updatedAt: string;
}

export interface Requirement {
  id: UUID;
  applicationId: UUID;
  code: string;
  title: string;
  status: RequirementStatus;
  missingReason?: string;
}

export interface Evidence {
  id: UUID;
  requirementId: UUID;
  title: string;
  note?: string;
  filePath?: string;
}

export interface DocumentTemplate {
  id: UUID;
  kind: DocumentKind;
  version: string;
  content: string;
  createdAt: string;
}

export interface GeneratedDocument {
  id: UUID;
  applicationId: UUID;
  templateId: UUID;
  kind: DocumentKind;
  title: string;
  body: string;
  isApproved: boolean;
  createdAt: string;
}

export interface DocumentVersion {
  id: UUID;
  generatedDocumentId: UUID;
  version: number;
  body: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export type ComplianceCycleStatus =
  | "planned"
  | "active"
  | "completed"
  | "archived";

export interface ComplianceCycle {
  id: UUID;
  organizationId: UUID;
  label: string;
  periodStart: string;
  periodEnd: string;
  status: ComplianceCycleStatus;
  createdAt: string;
  updatedAt: string;
}

export type RiskStatus = "open" | "mitigating" | "closed";

export interface RiskRegisterEntry {
  id: UUID;
  organizationId: UUID;
  clinicId?: UUID;
  cycleId?: UUID;
  title: string;
  description: string;
  probability: number;
  consequence: number;
  status: RiskStatus;
  ownerRole?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "new" | "investigating" | "closed";

export interface IncidentReport {
  id: UUID;
  organizationId: UUID;
  clinicId?: UUID;
  cycleId?: UUID;
  title: string;
  eventDate: string;
  severity: IncidentSeverity;
  description: string;
  immediateAction?: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
}

export type ControlTaskFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "ad_hoc";

export type ControlTaskStatus = "pending" | "done" | "overdue" | "skipped";

export interface ControlTask {
  id: UUID;
  organizationId: UUID;
  clinicId?: UUID;
  cycleId?: UUID;
  title: string;
  description?: string;
  frequency: ControlTaskFrequency;
  ownerRole?: string;
  nextDueDate?: string;
  status: ControlTaskStatus;
  lastCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ImprovementSourceType = "incident" | "risk" | "audit" | "manual";
export type ImprovementStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface ImprovementAction {
  id: UUID;
  organizationId: UUID;
  clinicId?: UUID;
  cycleId?: UUID;
  sourceType: ImprovementSourceType;
  sourceId?: UUID;
  title: string;
  actionDescription: string;
  ownerRole?: string;
  dueDate?: string;
  status: ImprovementStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
