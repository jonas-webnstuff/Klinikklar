import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveUserApplicationContext } from "@/lib/application-status";
import { ATTACHMENTS_BUCKET, ATTACHMENT_SIGNED_URL_TTL_SECONDS } from "@/lib/attachments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  requirementCode: z.string().min(1),
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
      return NextResponse.json({ ok: false, error: "Ingen aktiv ansökan hittades." }, { status: 400 });
    }

    const { data: document, error: documentError } = await supabase
      .from("requirement_supporting_documents")
      .select("file_path, file_name")
      .eq("application_id", context.applicationId)
      .eq("requirement_code", payload.requirementCode)
      .maybeSingle();

    if (documentError) throw documentError;

    if (!document?.file_path) {
      return NextResponse.json({ ok: false, error: "Ingen fil hittades för kravet." }, { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .createSignedUrl(document.file_path, ATTACHMENT_SIGNED_URL_TTL_SECONDS, {
        download: document.file_name || undefined,
      });

    if (signError) throw signError;

    return NextResponse.json({ ok: true, url: signed.signedUrl });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Kunde inte skapa nedladdningslänk" },
      { status: 400 }
    );
  }
}
