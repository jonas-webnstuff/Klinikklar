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
      return NextResponse.json({ ok: true, documents: [] });
    }

    const { data: documents, error: documentsError } = await supabase
      .from("requirement_supporting_documents")
      .select("requirement_code, file_path, file_name, file_size, uploaded_at")
      .eq("application_id", context.applicationId);

    if (documentsError) throw documentsError;

    return NextResponse.json({
      ok: true,
      documents: (documents || []).map((doc) => ({
        requirementCode: doc.requirement_code,
        filePath: doc.file_path,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        uploadedAt: doc.uploaded_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte hämta delade handlingar" },
      { status: 400 }
    );
  }
}
