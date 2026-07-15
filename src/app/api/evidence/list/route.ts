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
      return NextResponse.json({ ok: true, evidence: [] });
    }

    const { data: requirements, error: requirementsError } = await supabase
      .from("requirements")
      .select("id, code, title")
      .eq("application_id", context.applicationId)
      .order("code", { ascending: true });

    if (requirementsError) throw requirementsError;

    const requirementIds = (requirements || []).map((row) => row.id);

    if (requirementIds.length === 0) {
      return NextResponse.json({ ok: true, evidence: [] });
    }

    const { data: evidenceRows, error: evidenceError } = await supabase
      .from("evidence")
      .select("id, requirement_id, title, note, file_path")
      .in("requirement_id", requirementIds)
      .order("id", { ascending: false });

    if (evidenceError) throw evidenceError;

    const requirementMap = new Map((requirements || []).map((row) => [row.id, row]));

    return NextResponse.json({
      ok: true,
      evidence: (evidenceRows || []).map((row) => ({
        id: row.id,
        requirementId: row.requirement_id,
        requirementCode: requirementMap.get(row.requirement_id)?.code || "",
        requirementTitle: requirementMap.get(row.requirement_id)?.title || "",
        title: row.title,
        note: row.note,
        filePath: row.file_path,
      })),
      requirements: (requirements || []).map((row) => ({
        id: row.id,
        code: row.code,
        title: row.title,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte hämta evidens",
      },
      { status: 400 }
    );
  }
}
