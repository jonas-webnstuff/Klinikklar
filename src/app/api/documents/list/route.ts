import { NextResponse } from "next/server";
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

    const { data: context } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!context?.organization_id) {
      return NextResponse.json({ ok: true, documents: [] });
    }

    const { data: clinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("organization_id", context.organization_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!clinic?.id) {
      return NextResponse.json({ ok: true, documents: [] });
    }

    const { data: application } = await supabase
      .from("applications")
      .select("id")
      .eq("organization_id", context.organization_id)
      .eq("clinic_id", clinic.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!application?.id) {
      return NextResponse.json({ ok: true, documents: [] });
    }

    const { data: documents, error: documentError } = await supabase
      .from("generated_documents")
      .select("id, kind, title, body, is_approved, created_at")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false });

    if (documentError) throw documentError;

    const documentIds = (documents || []).map((item) => item.id);

    const { data: versions, error: versionsError } = await supabase
      .from("document_versions")
      .select("generated_document_id, reviewed_by, reviewed_at")
      .in("generated_document_id", documentIds);

    if (versionsError) throw versionsError;

    const versionMap = new Map(
      (versions || []).map((item) => [item.generated_document_id, { reviewedBy: item.reviewed_by, reviewedAt: item.reviewed_at }])
    );

    return NextResponse.json({
      ok: true,
      documents: (documents || []).map((item) => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        body: item.body,
        isApproved: item.is_approved,
        createdAt: item.created_at,
        reviewedBy: versionMap.get(item.id)?.reviewedBy || null,
        reviewedAt: versionMap.get(item.id)?.reviewedAt || null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte hämta dokumentutkast" },
      { status: 400 }
    );
  }
}