import { NextResponse } from "next/server";
import { z } from "zod";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import { structuredRequirementDefinitions } from "@/lib/requirements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  requirementCode: z.enum(["R-06", "R-07", "R-08", "R-09", "R-10"]),
  fields: z.record(z.string(), z.union([z.string(), z.number()])),
});

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const authSupabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Du måste vara inloggad." }, { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const context = await resolveUserApplicationContext(supabase, user.id);

    if (!context) {
      return NextResponse.json(
        { ok: false, error: "Ingen aktiv ansökan hittades. Spara ansökningsuppgifterna först." },
        { status: 400 }
      );
    }

    const query = payload.id
      ? supabase
          .from("structured_requirement_items")
          .update({
            fields: payload.fields,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          })
          .eq("id", payload.id)
          .eq("application_id", context.applicationId)
      : supabase.from("structured_requirement_items").insert({
          application_id: context.applicationId,
          requirement_code: payload.requirementCode,
          fields: payload.fields,
          updated_by: user.id,
        });

    const { data: item, error: itemError } = await query
      .select("id, requirement_code, fields, created_at")
      .single();

    if (itemError) throw itemError;

    const exclusiveFieldKeys = structuredRequirementDefinitions[payload.requirementCode].fields
      .filter((field) => field.exclusive)
      .map((field) => field.key);

    for (const fieldKey of exclusiveFieldKeys) {
      if (String(payload.fields[fieldKey]) !== "true") {
        continue;
      }

      const { data: otherRows, error: otherRowsError } = await supabase
        .from("structured_requirement_items")
        .select("id, fields")
        .eq("application_id", context.applicationId)
        .eq("requirement_code", payload.requirementCode)
        .neq("id", item.id);

      if (otherRowsError) throw otherRowsError;

      for (const otherRow of otherRows || []) {
        const otherFields = (otherRow.fields as Record<string, unknown>) || {};

        if (String(otherFields[fieldKey]) !== "true") {
          continue;
        }

        const { error: clearError } = await supabase
          .from("structured_requirement_items")
          .update({ fields: { ...otherFields, [fieldKey]: "false" } })
          .eq("id", otherRow.id);

        if (clearError) throw clearError;
      }
    }

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: payload.id ? "structured_requirement_updated" : "structured_requirement_created",
      message: `Strukturerat krav ${payload.id ? "uppdaterat" : "skapat"}: ${payload.requirementCode}`,
      metadata: {
        itemId: item.id,
        requirementCode: payload.requirementCode,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: item.id,
        requirementCode: item.requirement_code,
        fields: item.fields || {},
        createdAt: item.created_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte spara strukturerat krav" },
      { status: 400 }
    );
  }
}
