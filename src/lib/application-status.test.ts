import { describe, expect, it } from "vitest";
import { computeReadinessChecklist } from "@/lib/application-status";
import {
  facilityRequirementItems,
  managementSystemRequirementItems,
  type StructuredRequirementCode,
} from "@/lib/requirements";
import { createFakeSupabase, type FakeTables } from "@/lib/testing/fakeSupabase";
import { TEST_APPLICATION_ID, buildGoldenPathTables, cloneTables } from "@/lib/testing/readinessFixtures";

function withoutQuestionnaireAnswer(tables: FakeTables, questionKey: string): FakeTables {
  const clone = cloneTables(tables);
  clone.questionnaire_responses = clone.questionnaire_responses.filter((row) => row.question_key !== questionKey);
  return clone;
}

function withoutStructuredRows(tables: FakeTables, code: StructuredRequirementCode): FakeTables {
  const clone = cloneTables(tables);
  clone.structured_requirement_items = clone.structured_requirement_items.filter(
    (row) => row.requirement_code !== code
  );
  return clone;
}

/**
 * One targeted mutation per IVO checklist item key, each breaking ONLY the data that
 * item is supposed to read. Test #2 below asserts each mutation flips exactly its own
 * item and leaves all other items' `done` values untouched — this is the regression
 * guard for the "one shared boolean silently gates several unrelated checks" bug class
 * (see the care_scope / profileComplete incident).
 */
const BREAKERS: Record<string, (tables: FakeTables) => FakeTables> = {
  organization_identity: (tables) => {
    const clone = cloneTables(tables);
    clone.organizations = clone.organizations.map((row) => ({ ...row, email: "" }));
    return clone;
  },
  clinic_location: (tables) => {
    const clone = cloneTables(tables);
    clone.clinics = clone.clinics.map((row) => ({ ...row, postal_code: "" }));
    return clone;
  },
  care_scope: (tables) => {
    const clone = cloneTables(tables);
    clone.care_scope_codes = [];
    return clone;
  },
  staffing: (tables) => withoutStructuredRows(tables, "R-06"),
  quality_process: (tables) => withoutQuestionnaireAnswer(tables, "quality_process"),
  incident_routine: (tables) => withoutQuestionnaireAnswer(tables, "incident_routine"),
  management_system: (tables) => withoutQuestionnaireAnswer(tables, managementSystemRequirementItems[0].key),
  responsible_people: (tables) => withoutStructuredRows(tables, "R-07"),
  ownership_suitability: (tables) => {
    const clone = cloneTables(tables);
    clone.structured_requirement_items = clone.structured_requirement_items.map((row) =>
      row.requirement_code === "R-08"
        ? { ...row, fields: { ...(row.fields as Record<string, unknown>), ownershipPercent: "50" } }
        : row
    );
    return clone;
  },
  facility_and_equipment: (tables) => withoutQuestionnaireAnswer(tables, facilityRequirementItems[0].key),
  economic_conditions: (tables) => withoutStructuredRows(tables, "R-10"),
  attachment_checklist: (tables) => withoutStructuredRows(tables, "R-09"),
  evidence_package: (tables) => {
    const clone = cloneTables(tables);
    clone.evidence = clone.evidence.slice(1);
    return clone;
  },
};

describe("computeReadinessChecklist", () => {
  it("test #1 (sanity): reports every IVO item done and the application ready to submit on a fully-satisfying dataset", async () => {
    const supabase = createFakeSupabase(buildGoldenPathTables());
    const result = await computeReadinessChecklist(supabase, TEST_APPLICATION_ID);

    expect(result.missingIvoItems).toEqual([]);
    expect(result.missingStructuredRequirementFields).toEqual([]);
    expect(result.ivoChecklistItems.every((item) => item.done)).toBe(true);
    expect(result.canMoveToReady).toBe(true);
    expect(result.canSubmit).toBe(true);
  });

  describe("test #2: each checklist item's signal is independent of every other item's", () => {
    const goldenPath = buildGoldenPathTables();

    it("has a breaker fixture registered for every ivoReadinessItemDefinitions key", async () => {
      const supabase = createFakeSupabase(goldenPath);
      const result = await computeReadinessChecklist(supabase, TEST_APPLICATION_ID);
      const allKeys = result.ivoChecklistItems.map((item) => item.key);

      // Fails loudly if a new checklist item is ever added without a corresponding
      // isolation test — the whole point of this suite.
      expect(Object.keys(BREAKERS).sort()).toEqual(allKeys.sort());
    });

    for (const [brokenKey, breakFixture] of Object.entries(BREAKERS)) {
      it(`breaking "${brokenKey}" only changes "${brokenKey}", not the other 12 items`, async () => {
        const supabase = createFakeSupabase(breakFixture(goldenPath));
        const result = await computeReadinessChecklist(supabase, TEST_APPLICATION_ID);

        for (const item of result.ivoChecklistItems) {
          if (item.key === brokenKey) {
            expect(item.done, `expected "${brokenKey}" to become incomplete`).toBe(false);
          } else {
            expect(item.done, `expected "${item.key}" to stay unaffected by breaking "${brokenKey}"`).toBe(true);
          }
        }
      });
    }
  });

  it("test #3: an R-07 row saved before the checkbox fields existed is treated as incomplete, not a crash", async () => {
    const tables = buildGoldenPathTables();
    tables.structured_requirement_items = tables.structured_requirement_items.map((row) =>
      row.requirement_code === "R-07"
        ? { ...row, fields: { name: "Anna Andersson", role: "Verksamhetschef", licenseNumber: "123456" } }
        : row
    );

    const supabase = createFakeSupabase(tables);
    const result = await computeReadinessChecklist(supabase, TEST_APPLICATION_ID);

    const responsiblePeople = result.ivoChecklistItems.find((item) => item.key === "responsible_people");
    expect(responsiblePeople?.done).toBe(false);
    expect(result.missingStructuredRequirementFields).toContain("R-07: verksamhetschef måste anges");
    expect(result.missingStructuredRequirementFields).toContain(
      "R-07: kunskap om patientsäkerhetslagen, tandvårdslagen och patientdatalagen måste anges av minst en person"
    );
  });

  it("test #7: an R-09 row with status \"finns\" but file_path: null is treated as missing, not fulfilled", async () => {
    const tables = buildGoldenPathTables();
    const targetStandardType = "premises_drawing"; // "Lokalritningar" preset

    tables.structured_requirement_items = tables.structured_requirement_items.map((row) => {
      const fields = row.fields as Record<string, unknown>;
      return fields?.standardType === targetStandardType ? { ...row, file_path: null } : row;
    });

    const supabase = createFakeSupabase(tables);
    const result = await computeReadinessChecklist(supabase, TEST_APPLICATION_ID);

    const attachmentChecklist = result.ivoChecklistItems.find((item) => item.key === "attachment_checklist");
    expect(attachmentChecklist?.done).toBe(false);
    expect(result.missingStructuredRequirementFields).toContain("R-09: lokalritningar saknas");
  });

  describe("test #6: a broken query throws instead of silently reporting an all-false checklist", () => {
    const tablesToBreak = ["care_scope_codes", "organizations", "structured_requirement_items"];

    for (const table of tablesToBreak) {
      it(`propagates the error when "${table}" fails`, async () => {
        const supabase = createFakeSupabase(buildGoldenPathTables(), { errorOnTable: table });

        await expect(computeReadinessChecklist(supabase, TEST_APPLICATION_ID)).rejects.toThrow();
      });
    }
  });
});
