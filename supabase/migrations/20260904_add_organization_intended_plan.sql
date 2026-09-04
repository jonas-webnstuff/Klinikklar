-- Tracks which plan a visitor picked (from a pricing card, or from the in-app plan comparison
-- shown while filling in Grunduppgifter) before they've actually paid. Separate from `plan`,
-- which only a real Stripe payment (or an admin) may set — this column is just a UI hint so the
-- "Aktivera konto" button knows what to send to /api/stripe/checkout, and survives navigation/
-- re-login instead of being threaded through URL query params.
alter table organizations
  add column if not exists intended_plan text check (intended_plan in ('ansokan', 'step1', 'step2', 'step3'));
