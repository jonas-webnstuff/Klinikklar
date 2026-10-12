-- Needed for the Stripe Billing Portal (self-service "säg upp abonnemang") — the portal needs
-- to know which Stripe Customer a request is for. Set once, on first successful checkout.
alter table organizations
  add column if not exists stripe_customer_id text;
