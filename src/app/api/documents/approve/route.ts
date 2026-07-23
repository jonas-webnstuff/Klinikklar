import { NextResponse } from "next/server";
import { z } from "zod";
import { logApplicationEvent, resolveUserApplicationContext } from "@/lib/application-status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  documentId: z.string().uuid(),
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

    const { data: document, error: documentError } = await supabase
      .from("generated_documents")
      .select("id, title, kind, body, is_approved")
      .eq("id", payload.documentId)
      .eq("application_id", context.applicationId)
      .maybeSingle();

    if (documentError) throw documentError;

    if (!document?.id) {
      return NextResponse.json({ ok: false, error: "Dokumentutkastet hittades inte." }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("generated_documents")
      .update({ is_approved: true })
      .eq("id", document.id);

    if (updateError) throw updateError;

    const { data: versionRow, error: versionError } = await supabase
      .from("document_versions")
      .select("id")
      .eq("generated_document_id", document.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) throw versionError;

    const reviewedAt = new Date().toISOString();

    if (versionRow?.id) {
      const { error: reviewError } = await supabase
        .from("document_versions")
        .update({
          reviewed_by: user.email || user.id,
          reviewed_at: reviewedAt,
        })
        .eq("id", versionRow.id);

      if (reviewError) throw reviewError;
    }

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "document_draft_approved",
      message: `Dokumentutkast godkänt: ${document.title}`,
      metadata: {
        documentId: document.id,
        kind: document.kind,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte godkänna dokumentutkast",
      },
      { status: 400 }
    );
  }
}