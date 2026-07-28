import { NextResponse } from "next/server";
import { z } from "zod";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  code: z.enum(["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10", "A11", "A12"]),
  selected: z.boolean(),
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

    if (payload.selected) {
      const { error: insertError } = await supabase.from("care_scope_codes").upsert(
        {
          application_id: context.applicationId,
          code: payload.code,
          updated_by: user.id,
        },
        { onConflict: "application_id,code" }
      );

      if (insertError) throw insertError;
    } else {
      const { error: deleteError } = await supabase
        .from("care_scope_codes")
        .delete()
        .eq("application_id", context.applicationId)
        .eq("code", payload.code);

      if (deleteError) throw deleteError;
    }

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: payload.selected ? "care_scope_code_selected" : "care_scope_code_deselected",
      message: `Inriktningskod ${payload.selected ? "vald" : "borttagen"}: ${payload.code}`,
      metadata: { code: payload.code },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte spara inriktningskod" },
      { status: 400 }
    );
  }
}
