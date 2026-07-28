import { NextResponse } from "next/server";
import { resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
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
      return NextResponse.json({ ok: true, codes: [] });
    }

    const { data: rows, error: rowsError } = await supabase
      .from("care_scope_codes")
      .select("code")
      .eq("application_id", context.applicationId);

    if (rowsError) throw rowsError;

    return NextResponse.json({ ok: true, codes: (rows || []).map((row) => row.code) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte hämta inriktningskoder" },
      { status: 400 }
    );
  }
}
