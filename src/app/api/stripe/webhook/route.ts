import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe/server";
import { isPurchasablePlan } from "@/lib/stripe/prices";

// Plans sold as Stripe subscriptions — "ansokan" is a one-time payment and must never be
// revoked by a subscription event.
const SUBSCRIPTION_PLANS = ["step1", "step2", "step3"];

// A subscription in any of these states no longer pays for access. "past_due" is deliberately
// not here: Stripe is still retrying the card, and once its retries run out (per the Dashboard's
// Billing → Subscriptions → "Manage failed payments" setting) it cancels the subscription,
// which arrives here as customer.subscription.deleted.
const ENDED_SUBSCRIPTION_STATUSES: Stripe.Subscription.Status[] = ["canceled", "unpaid", "incomplete_expired"];

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organization_id;
  const plan = session.metadata?.plan ?? null;

  // client_reference_id / metadata are set by us in api/stripe/checkout, but Stripe events
  // are still an external input — never trust the plan value without checking it's one we
  // actually sell, same as the old bypass this replaces.
  if (!organizationId || !isPurchasablePlan(plan) || session.payment_status !== "paid") return;

  const supabase = createSupabaseAdminClient();
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

  const { error } = await supabase
    .from("organizations")
    .update({
      plan,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    })
    .eq("id", organizationId);

  if (error) throw error;
}

async function revokeSubscriptionPlan(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("organizations")
    .update({ plan: null })
    .eq("stripe_customer_id", customerId)
    .in("plan", SUBSCRIPTION_PLANS);

  if (error) throw error;
}

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

  // A failed database write must not be acknowledged with a 2xx — Stripe only retries
  // deliveries that fail, so swallowing the error here would leave a paying customer without
  // access (or a cancelled one with it) and nothing would ever correct it.
  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object);
    } else if (event.type === "customer.subscription.deleted") {
      await revokeSubscriptionPlan(event.data.object);
    } else if (
      event.type === "customer.subscription.updated" &&
      ENDED_SUBSCRIPTION_STATUSES.includes(event.data.object.status)
    ) {
      await revokeSubscriptionPlan(event.data.object);
    }
  } catch (error) {
    console.error(`[stripe-webhook] Failed to handle ${event.type} (${event.id}):`, error);
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
