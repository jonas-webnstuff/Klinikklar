import { NextResponse } from "next/server";
import { z } from "zod";
import { AiAssistanceError, generateAssistance, type GenerateAssistanceInput } from "@/lib/ai/generate-assistance";
import { careScopeCodeDefinitions } from "@/lib/requirements";
import { resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  plan: z.enum(["ansokan", "step1", "step2", "step3"]),
  mode: z.enum(["ai", "manual"]).default("ai"),
  feature: z.enum([
    "risk_analysis",
    "routine",
    "incident_investigation",
    "management_system",
    "controls",
    "document_draft",
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
  currentDocumentDraft: z
    .object({
      kind: z.string().default(""),
      requirementCode: z.string().default(""),
      requirementTitle: z.string().default(""),
      title: z.string().default(""),
      body: z.string().default(""),
      note: z.string().default(""),
    })
    .optional(),
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

    const authSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 });
    }

    // risk_analysis, incident_investigation and routine use this (see generate-assistance.ts
    // featureGuidance) — fetched here rather than trusting client-supplied data, since the client
    // has no way to see another organization's rows anyway and this keeps the enrichment
    // authoritative.
    let clinicContext: GenerateAssistanceInput["clinicContext"];

    if (
      payload.feature === "risk_analysis" ||
      payload.feature === "incident_investigation" ||
      payload.feature === "routine"
    ) {
      const supabase = createSupabaseAdminClient();
      const context = await resolveUserApplicationContext(supabase, user.id);

      if (context) {
        const [{ data: staffingRows }, { data: careScopeRows }, { data: riskRows }] = await Promise.all([
          supabase
            .from("structured_requirement_items")
            .select("fields")
            .eq("application_id", context.applicationId)
            .eq("requirement_code", "R-06"),
          supabase.from("care_scope_codes").select("code").eq("application_id", context.applicationId),
          supabase
            .from("risk_register_entries")
            .select("title")
            .eq("organization_id", context.organizationId)
            .limit(50),
        ]);

        clinicContext = {
          staffingRoles: (staffingRows || []).map((row) => {
            const fields = (row.fields || {}) as Record<string, unknown>;
            return {
              role: String(fields.role || ""),
              headcount: String(fields.headcount || ""),
              competenceNotes: String(fields.competenceNotes || ""),
            };
          }),
          careScopeLabels: (careScopeRows || [])
            .map((row) => careScopeCodeDefinitions.find((def) => def.code === row.code)?.label)
            .filter((label): label is string => Boolean(label)),
          existingRiskTitles: (riskRows || []).map((row) => row.title),
        };
      }
    }

    const result = await generateAssistance({ ...payload, clinicContext });
    return NextResponse.json(result);
  } catch (error) {
    const reason = error instanceof AiAssistanceError ? error.reason : undefined;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Kunde inte skapa AI-förslag.",
        reason,
      },
      { status: 400 }
    );
  }
}
