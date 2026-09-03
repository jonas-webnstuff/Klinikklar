import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/server";
import { isPurchasablePlan, STRIPE_PLAN_PRICES } from "@/lib/stripe/prices";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");

  if (!isPurchasablePlan(plan)) {
    return NextResponse.redirect(new URL("/#priser", url.origin));
  }

  const authSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`/api/stripe/checkout?plan=${plan}`);
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
    // No clinic profile saved yet — need one before we can invoice/subscribe them to anything.
    return NextResponse.redirect(new URL("/workspace", url.origin));
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", membership.organization_id)
    .limit(1)
    .maybeSingle();

  if (organization?.plan) {
    // Already on a plan — don't let them stack a second subscription by mistake.
    return NextResponse.redirect(new URL("/workspace", url.origin));
  }

  const priceConfig = STRIPE_PLAN_PRICES[plan];
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: priceConfig.mode,
    line_items: priceConfig.priceIds.map((price) => ({ price, quantity: 1 })),
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    metadata: {
      supabase_user_id: user.id,
      organization_id: membership.organization_id,
      plan,
    },
    success_url: `${url.origin}/workspace?checkout=success`,
    cancel_url: `${url.origin}/workspace?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.redirect(new URL("/workspace?checkout=error", url.origin));
  }

  return NextResponse.redirect(session.url);
}
