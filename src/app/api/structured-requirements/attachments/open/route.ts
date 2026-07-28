import { NextResponse } from "next/server";
import { resolveUserApplicationContext } from "@/lib/application-status";
import { ATTACHMENTS_BUCKET, ATTACHMENT_SIGNED_URL_TTL_SECONDS } from "@/lib/attachments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Stable link embedded in exported documents (which can be read, forwarded, or
 * archived far outside the app's control) instead of a baked-in signed URL —
 * this always re-checks auth/org-membership and mints a fresh short-lived signed
 * URL at click time, so the export never carries a working Storage bypass token.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const itemId = requestUrl.searchParams.get("itemId");

  const unavailable = (reason: string) =>
    NextResponse.redirect(new URL(`/bilaga-otillganglig?reason=${reason}`, requestUrl.origin));

  if (!itemId) {
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

  const { data: item, error: itemError } = await supabase
    .from("structured_requirement_items")
    .select("file_path")
    .eq("id", itemId)
    .eq("application_id", context.applicationId)
    .maybeSingle();

  // The row can be gone by the time this link is clicked — e.g. "Ta bort bilaga" ran
  // long after the export was generated, possibly by someone with no context at all
  // (an IVO caseworker reading the document weeks later) — so this must explain
  // itself, not surface a bare 404 or bounce through a broken redirect.
  if (itemError || !item) {
    return unavailable("not_found");
  }

  if (!item.file_path) {
    return unavailable("no_file");
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(item.file_path, ATTACHMENT_SIGNED_URL_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return unavailable("not_found");
  }

  return NextResponse.redirect(signed.signedUrl);
}
