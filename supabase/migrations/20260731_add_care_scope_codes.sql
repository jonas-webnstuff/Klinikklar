create table if not exists care_scope_codes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  code text not null check (code in ('A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12')),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (application_id, code)
);

create index if not exists care_scope_codes_app_idx
  on care_scope_codes (application_id, created_at);

alter table care_scope_codes enable row level security;
