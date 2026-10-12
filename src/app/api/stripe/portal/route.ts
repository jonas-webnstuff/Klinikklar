import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";

// Self-service "hantera/säg upp abonnemang" — redirects into Stripe's own hosted Billing
// Portal rather than building a custom cancellation flow. Requires the Billing Portal to be
// configured once in the Stripe Dashboard (Settings → Billing → Customer portal) — this route
// just creates a session, it doesn't control what the portal lets the customer do there.
export async function GET(request: Request) {
  const url = new URL(request.url);

  const authSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent("/api/stripe/portal");
    return NextResponse.redirect(new URL(`/login?next=${next}`, url.origin));
  }

  const supabase = createSupabaseAdminClient();
  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return NextResponse.redirect(new URL("/workspace", url.origin));
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", membership.organization_id)
    .limit(1)
    .maybeSingle();

  if (!organization?.stripe_customer_id) {
    // No completed Stripe checkout yet — nothing to manage.
    return NextResponse.redirect(new URL("/workspace", url.origin));
  }

  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripe_customer_id,
    return_url: `${url.origin}/workspace`,
  });

  return NextResponse.redirect(session.url);
}
