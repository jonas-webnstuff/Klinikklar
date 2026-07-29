import {
  complianceRequirements,
  facilityRequirementItems,
  mainCareScopeCodes,
  managementSystemRequirementItems,
  questionnaireItems,
  structuredRequirementDefinitions,
  type StructuredRequirementCode,
} from "@/lib/requirements";
import type { FakeRow, FakeTables } from "@/lib/testing/fakeSupabase";

export const TEST_APPLICATION_ID = "app-1";
const ORGANIZATION_ID = "org-1";
const CLINIC_ID = "clinic-1";

const SUBSTANTIVE_BODY =
  "Detta ar ett fullstandigt ifyllt dokumentutkast med tillrackligt mycket text for att inte raknas som en platshallare i testet.";

function structuredRowsFor(code: StructuredRequirementCode): FakeRow[] {
  switch (code) {
    case "R-06":
      return [
        {
          application_id: TEST_APPLICATION_ID,
          requirement_code: code,
          fields: { role: "Tandläkare", headcount: "1", competenceNotes: "Legitimerad, 3 års erfarenhet" },
        },
      ];
    case "R-07":
      return [
        {
          application_id: TEST_APPLICATION_ID,
          requirement_code: code,
          fields: {
            name: "Anna Andersson",
            role: "Verksamhetschef",
            licenseNumber: "123456",
            isOperationsManager: "true",
            hasInsightLegislation: "true",
            hasInsightLaborLaw: "true",
            hasInsightEconomy: "true",
          },
        },
      ];
    case "R-08":
      return [
        {
          application_id: TEST_APPLICATION_ID,
          requirement_code: code,
          fields: { ownerName: "Anna Andersson", ownershipPercent: "100", suitabilityStatus: "Bedömd lämplig" },
        },
      ];
    case "R-09": {
      const def = structuredRequirementDefinitions["R-09"];
      return (def.quickPicks || [])
        .filter((preset) => Boolean(preset.fields.standardType))
        .map((preset) => ({
          application_id: TEST_APPLICATION_ID,
          requirement_code: code,
          fields: { ...preset.fields, status: "finns" },
          // Completeness now requires an actually uploaded file, not just the status
          // text — every golden-path row needs a simulated file_path or the R-09
          // checklist item would read as done for the wrong reason.
          file_path: `org-1/app-1/R-09/${preset.fields.standardType}/v1-test-file.pdf`,
        }));
    }
    case "R-10":
      return [
        {
          application_id: TEST_APPLICATION_ID,
          requirement_code: code,
          fields: {
            period: "År 1",
            expectedRevenue: "1000000",
            expectedCosts: "800000",
            fundingSource: "Eget kapital",
            notes: "Inga särskilda antaganden",
          },
        },
      ];
    default:
      return [];
  }
}

/** A fully-satisfying dataset: every IVO checklist item and every R-0X requirement should read as done/complete. */
export function buildGoldenPathTables(): FakeTables {
  const requirementRows = complianceRequirements.map((requirement) => ({
    id: `req-${requirement.code}`,
    application_id: TEST_APPLICATION_ID,
    code: requirement.code,
    status: "complete",
  }));

  const documentRows = complianceRequirements.map((requirement) => ({
    application_id: TEST_APPLICATION_ID,
    kind: requirement.documentKind,
    is_approved: true,
    is_current: true,
    body: SUBSTANTIVE_BODY,
  }));

  const requiredQuestionKeys = questionnaireItems.map((item) => item.key).filter((key) => key !== "care_scope");
  const managementKeys = managementSystemRequirementItems.map((item) => item.key);
  const facilityKeys = facilityRequirementItems.map((item) => item.key);

  const questionnaireResponses = [...requiredQuestionKeys, ...managementKeys, ...facilityKeys].map((key) => ({
    application_id: TEST_APPLICATION_ID,
    question_key: key,
    answer: `Svar för ${key}`,
    follow_up_answer: "",
  }));

  const structuredItems = (Object.keys(structuredRequirementDefinitions) as StructuredRequirementCode[]).flatMap(
    structuredRowsFor
  );

  return {
    applications: [{ id: TEST_APPLICATION_ID, organization_id: ORGANIZATION_ID, clinic_id: CLINIC_ID }],
    organizations: [
      { id: ORGANIZATION_ID, name: "Testklinik AB", org_number: "5561234567", email: "test@example.com" },
    ],
    clinics: [
      { id: CLINIC_ID, name: "Testklinik AB", address: "Testgatan 1", postal_code: "123 45", municipality: "Teststad" },
    ],
    questionnaire_responses: questionnaireResponses,
    care_scope_codes: [{ application_id: TEST_APPLICATION_ID, code: mainCareScopeCodes[0] }],
    requirements: requirementRows,
    generated_documents: documentRows,
    structured_requirement_items: structuredItems,
    evidence: requirementRows.map((row) => ({ id: `ev-${row.code}`, requirement_id: row.id })),
    // R-08's shared supporting document (aktiebok/registreringsbevis) — one row per
    // requirement, not per owner. Without this, R-08 would read as incomplete even
    // when every owner row is fully filled in.
    requirement_supporting_documents: [
      {
        application_id: TEST_APPLICATION_ID,
        requirement_code: "R-08",
        file_path: "org-1/app-1/R-08/shared/v1-test-file.pdf",
      },
    ],
  };
}

export function cloneTables(tables: FakeTables): FakeTables {
  return JSON.parse(JSON.stringify(tables));
}
