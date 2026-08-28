-- Public "Kontakt" section on the marketing homepage (replaces the old "Kunskapsbank" teaser).
-- Submissions come from anonymous visitors, so writes go through the /api/contact route using
-- the service-role client (bypasses RLS) rather than the browser's anon key — RLS stays enabled
-- with no policies, so nobody can read or write this table directly from the client.

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;
