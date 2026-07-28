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
      return NextResponse.json({ ok: true, items: [] });
    }

    const { data: items, error: itemsError } = await supabase
      .from("structured_requirement_items")
      .select("id, requirement_code, fields, file_path, file_name, file_size, uploaded_at, created_at")
      .eq("application_id", context.applicationId)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    return NextResponse.json({
      ok: true,
      items: (items || []).map((item) => ({
        id: item.id,
        requirementCode: item.requirement_code,
        fields: item.fields || {},
        filePath: item.file_path,
        fileName: item.file_name,
        fileSize: item.file_size,
        uploadedAt: item.uploaded_at,
        createdAt: item.created_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte hämta strukturerade krav" },
      { status: 400 }
    );
  }
}
