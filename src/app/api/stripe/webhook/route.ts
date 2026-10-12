import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { isPurchasablePlan } from "@/lib/stripe/prices";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook signature or secret." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const organizationId = session.metadata?.organization_id;
    const plan = session.metadata?.plan ?? null;

    // client_reference_id / metadata are set by us in api/stripe/checkout, but Stripe events
    // are still an external input — never trust the plan value without checking it's one we
    // actually sell, same as the old bypass this replaces.
    if (organizationId && isPurchasablePlan(plan) && session.payment_status === "paid") {
      const supabase = createSupabaseAdminClient();
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      await supabase
        .from("organizations")
        .update({
          plan,
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        })
        .eq("id", organizationId);
    }
  }

  return NextResponse.json({ received: true });
}
