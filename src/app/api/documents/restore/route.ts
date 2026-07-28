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

    const { data: document, error: restoreError } = await supabase
      .rpc("restore_document_draft_version", {
        p_document_id: payload.documentId,
        p_application_id: context.applicationId,
      })
      .select("id, kind, title, is_current")
      .single();

    if (restoreError) {
      const notFound = restoreError.message?.includes("document_not_found");
      return NextResponse.json(
        { ok: false, error: notFound ? "Dokumentutkastet hittades inte." : restoreError.message },
        { status: notFound ? 404 : 400 }
      );
    }

    await logApplicationEvent(supabase, {
      applicationId: context.applicationId,
      userId: user.id,
      eventType: "document_draft_restored",
      message: `Dokumentutkast återställt: ${document.title}`,
      metadata: {
        documentId: document.id,
        kind: document.kind,
      },
    });

    return NextResponse.json({ ok: true, document });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Kunde inte återställa dokumentutkast",
      },
      { status: 400 }
    );
  }
}
