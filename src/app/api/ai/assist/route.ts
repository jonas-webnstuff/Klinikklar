import { NextResponse } from "next/server";
import { z } from "zod";
import { generateAssistance } from "@/lib/ai/generate-assistance";

const bodySchema = z.object({
  plan: z.enum(["ansokan", "step1", "step2", "step3"]),
  feature: z.enum([
    "risk_analysis",
    "routine",
    "incident_investigation",
    "management_system",
    "controls",
    "regulation_watch",
    "revision_readiness",
    "responsible_people",
    "ownership_suitability",
    "facility_and_equipment",
    "attachment_checklist",
    "application_evidence",
  ]),
  clinicName: z.string().default(""),
  municipality: z.string().default(""),
  careScope: z.string().default(""),
  qualityProcess: z.string().default(""),
  staffing: z.string().default(""),
  incidentRoutine: z.string().default(""),
  currentRisk: z.any().optional(),
  currentRoutine: z.any().optional(),
  currentIncident: z.any().optional(),
  currentManagementSystem: z.any().optional(),
  currentResponsiblePeople: z
    .object({
      operationsManagerName: z.string().default(""),
      operationsManagerRole: z.string().default(""),
      operationsManagerLicense: z.string().default(""),
      medicalResponsibleName: z.string().default(""),
      medicalResponsibleRole: z.string().default(""),
      medicalResponsibleLicense: z.string().default(""),
      qualityResponsibleName: z.string().default(""),
      qualityResponsibleRole: z.string().default(""),
      qualityResponsibleCompetence: z.string().default(""),
    })
    .optional(),
  currentOwnershipSuitability: z
    .object({
      legalEntityName: z.string().default(""),
      legalEntityOrgNumber: z.string().default(""),
      representativeName: z.string().default(""),
      ownershipStructureDescription: z.string().default(""),
      suitabilityStatement: z.string().default(""),
    })
    .optional(),
  currentFacilityAndEquipment: z
    .object({
      premisesDescription: z.string().default(""),
      hygieneFlow: z.string().default(""),
      equipmentScope: z.string().default(""),
      specialRisks: z.string().default(""),
    })
    .optional(),
  currentAttachmentChecklist: z
    .object({
      coverNote: z.string().default(""),
      businessDescriptionRef: z.string().default(""),
      managementSystemRef: z.string().default(""),
      staffingRef: z.string().default(""),
      evidenceIndexRef: z.string().default(""),
    })
    .optional(),
  currentEvidence: z
    .object({
      requirementCode: z.string().default(""),
      requirementTitle: z.string().default(""),
      title: z.string().default(""),
      note: z.string().default(""),
      filePath: z.string().default(""),
    })
    .optional(),
  currentControl: z.any().optional(),
  currentRegulationWatch: z.any().optional(),
  currentRevisionReadiness: z.any().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());

    if (payload.plan === "step2") {
      return NextResponse.json(
        { error: "AI-stöd i formulär och ansökan ingår i Klinikklar Komplett och Klinikklar Premium." },
        { status: 403 }
      );
    }

    if (
      (payload.feature === "regulation_watch" || payload.feature === "revision_readiness") &&
      payload.plan !== "step3"
    ) {
      return NextResponse.json(
        {
          error: "Avancerad AI-stöd för regelbevakning och revisionsberedskap är tillgängligt i Premium-steget.",
        },
        { status: 403 }
      );
    }

    const result = await generateAssistance(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Kunde inte skapa AI-förslag." },
      { status: 400 }
    );
  }
}
