import { NextResponse } from "next/server";
import { resolveUserApplicationContext } from "@/lib/application-status";
import { ATTACHMENTS_BUCKET, ATTACHMENT_SIGNED_URL_TTL_SECONDS } from "@/lib/attachments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Stable link for exported documents (see /api/structured-requirements/attachments/open
 * for the same pattern applied to R-09's per-row files) — re-checks auth/org-membership
 * and mints a fresh short-lived signed URL at click time, never at export time.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const requirementCode = requestUrl.searchParams.get("requirementCode");

  const unavailable = (reason: string) =>
    NextResponse.redirect(new URL(`/bilaga-otillganglig?reason=${reason}`, requestUrl.origin));

  if (!requirementCode) {
    return unavailable("not_found");
  }

  const authSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", requestUrl.origin);
    loginUrl.searchParams.set("next", `${requestUrl.pathname}${requestUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const supabase = createSupabaseAdminClient();
  const context = await resolveUserApplicationContext(supabase, user.id);

  if (!context) {
    return unavailable("no_access");
  }

  const { data: document, error: documentError } = await supabase
    .from("requirement_supporting_documents")
    .select("file_path")
    .eq("application_id", context.applicationId)
    .eq("requirement_code", requirementCode)
    .maybeSingle();

  if (documentError || !document) {
    return unavailable("not_found");
  }

  if (!document.file_path) {
    return unavailable("no_file");
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(document.file_path, ATTACHMENT_SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return unavailable("not_found");
  }

  return NextResponse.redirect(signed.signedUrl);
}
