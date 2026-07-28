create table if not exists structured_requirement_items (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  requirement_code text not null check (requirement_code in ('R-06', 'R-07', 'R-08', 'R-09')),
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists structured_requirement_items_app_kind_idx
  on structured_requirement_items (application_id, requirement_code, created_at);

alter table structured_requirement_items enable row level security;
