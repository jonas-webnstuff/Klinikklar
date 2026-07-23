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
      .select("id, title, kind")
      .eq("id", payload.documentId)
      .eq("application_id", context.applicationId)
      .maybeSingle();

    if (documentError) throw documentError;

    if (!document?.id) {
      return NextResponse.json({ ok: false, error: "Dokumentutkastet hittades inte." }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("generated_documents")
      .delete()
      .eq("id", document.id)
      .eq("application_id", context.applicationId);

    if (deleteError) throw deleteError;

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "document_draft_deleted",
      message: `Dokumentutkast borttaget: ${document.title}`,
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
        error: error instanceof Error ? error.message : "Kunde inte ta bort dokumentutkast",
      },
      { status: 400 }
    );
  }
}