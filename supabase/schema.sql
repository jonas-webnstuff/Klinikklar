create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_number text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

create unique index if not exists organizations_org_number_idx on organizations(org_number);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists clinics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text not null,
  municipality text not null,
  region text not null,
  has_radiology boolean not null default false,
  has_sedation boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists persons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  role_title text not null,
  legitimation_number text,
  email text not null
);

create table if not exists ownership_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id uuid not null references persons(id) on delete cascade,
  role_type text not null check (role_type in ('owner', 'medical_responsible', 'quality_responsible')),
  ownership_percent numeric(5,2)
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clinic_id uuid not null references clinics(id) on delete cascade,
  status text not null check (status in ('draft', 'in_review', 'ready_to_submit', 'submitted')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  question_key text not null,
  answer text not null,
  follow_up_answer text,
  updated_at timestamptz not null default now(),
  unique (application_id, question_key)
);

create table if not exists requirements (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  code text not null,
  title text not null,
  status text not null check (status in ('missing', 'in_progress', 'complete')),
  missing_reason text,
  unique (application_id, code)
);

create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references requirements(id) on delete cascade,
  title text not null,
  note text,
  file_path text
);

create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('verksamhetsbeskrivning', 'ledningssystem', 'riskanalys', 'avvikelsehantering', 'egenkontroll')),
  version text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists generated_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  template_id uuid references document_templates(id),
  kind text not null check (kind in ('verksamhetsbeskrivning', 'ledningssystem', 'riskanalys', 'avvikelsehantering', 'egenkontroll')),
  title text not null,
  body text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  generated_document_id uuid not null references generated_documents(id) on delete cascade,
  version integer not null,
  body text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  unique (generated_document_id, version)
);

create table if not exists compliance_audit_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists compliance_cycles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  label text not null,
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('planned', 'active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start, period_end)
);

create table if not exists risk_register_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete set null,
  cycle_id uuid references compliance_cycles(id) on delete set null,
  title text not null,
  description text not null,
  probability integer not null check (probability between 1 and 5),
  consequence integer not null check (consequence between 1 and 5),
  status text not null check (status in ('open', 'mitigating', 'closed')),
  owner_role text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists incident_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete set null,
  cycle_id uuid references compliance_cycles(id) on delete set null,
  title text not null,
  event_date date not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  description text not null,
  immediate_action text,
  status text not null check (status in ('new', 'investigating', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists control_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete set null,
  cycle_id uuid references compliance_cycles(id) on delete set null,
  title text not null,
  description text,
  frequency text not null check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly', 'ad_hoc')),
  owner_role text,
  next_due_date date,
  status text not null check (status in ('pending', 'done', 'overdue', 'skipped')),
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists improvement_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete set null,
  cycle_id uuid references compliance_cycles(id) on delete set null,
  source_type text not null check (source_type in ('incident', 'risk', 'audit', 'manual')),
  source_id uuid,
  title text not null,
  action_description text not null,
  owner_role text,
  due_date date,
  status text not null check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists compliance_cycles_org_idx
on compliance_cycles(organization_id, period_start desc);

create index if not exists risk_register_entries_org_status_idx
on risk_register_entries(organization_id, status);

create index if not exists incident_reports_org_status_idx
on incident_reports(organization_id, status);

create index if not exists control_tasks_org_due_idx
on control_tasks(organization_id, next_due_date);

create index if not exists improvement_actions_org_status_idx
on improvement_actions(organization_id, status);

create index if not exists compliance_audit_events_application_created_idx
on compliance_audit_events(application_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists applications_set_updated_at on applications;
create trigger applications_set_updated_at
before update on applications
for each row
execute procedure public.set_updated_at();

drop trigger if exists compliance_cycles_set_updated_at on compliance_cycles;
create trigger compliance_cycles_set_updated_at
before update on compliance_cycles
for each row
execute procedure public.set_updated_at();

drop trigger if exists risk_register_entries_set_updated_at on risk_register_entries;
create trigger risk_register_entries_set_updated_at
before update on risk_register_entries
for each row
execute procedure public.set_updated_at();

drop trigger if exists incident_reports_set_updated_at on incident_reports;
create trigger incident_reports_set_updated_at
before update on incident_reports
for each row
execute procedure public.set_updated_at();

drop trigger if exists control_tasks_set_updated_at on control_tasks;
create trigger control_tasks_set_updated_at
before update on control_tasks
for each row
execute procedure public.set_updated_at();

drop trigger if exists improvement_actions_set_updated_at on improvement_actions;
create trigger improvement_actions_set_updated_at
before update on improvement_actions
for each row
execute procedure public.set_updated_at();

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from organization_memberships m
    where m.organization_id = target_org_id
      and m.user_id = auth.uid()
  );
$$;

-- Enable RLS as a baseline for SaaS hardening.
alter table organizations enable row level security;
alter table profiles enable row level security;
alter table organization_memberships enable row level security;
alter table clinics enable row level security;
alter table persons enable row level security;
alter table ownership_roles enable row level security;
alter table applications enable row level security;
alter table questionnaire_responses enable row level security;
alter table requirements enable row level security;
alter table evidence enable row level security;
alter table document_templates enable row level security;
alter table generated_documents enable row level security;
alter table document_versions enable row level security;
alter table compliance_audit_events enable row level security;
alter table compliance_cycles enable row level security;
alter table risk_register_entries enable row level security;
alter table incident_reports enable row level security;
alter table control_tasks enable row level security;
alter table improvement_actions enable row level security;

drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own
on profiles
for select
using (auth.uid() = id);

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own
on profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own
on profiles
for insert
with check (auth.uid() = id);

drop policy if exists organization_memberships_select_own on organization_memberships;
create policy organization_memberships_select_own
on organization_memberships
for select
using (auth.uid() = user_id);

drop policy if exists organizations_select_member on organizations;
create policy organizations_select_member
on organizations
for select
using (public.is_org_member(id));

drop policy if exists organizations_update_member on organizations;
create policy organizations_update_member
on organizations
for update
using (public.is_org_member(id))
with check (public.is_org_member(id));

drop policy if exists clinics_member_policy on clinics;
create policy clinics_member_policy
on clinics
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists persons_member_policy on persons;
create policy persons_member_policy
on persons
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists ownership_roles_member_policy on ownership_roles;
create policy ownership_roles_member_policy
on ownership_roles
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists applications_member_policy on applications;
create policy applications_member_policy
on applications
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists requirements_member_policy on requirements;
create policy requirements_member_policy
on requirements
for all
using (
  exists (
    select 1
    from applications a
    where a.id = requirements.application_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from applications a
    where a.id = requirements.application_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists evidence_member_policy on evidence;
create policy evidence_member_policy
on evidence
for all
using (
  exists (
    select 1
    from requirements r
    join applications a on a.id = r.application_id
    where r.id = evidence.requirement_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from requirements r
    join applications a on a.id = r.application_id
    where r.id = evidence.requirement_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists document_templates_select_all on document_templates;
create policy document_templates_select_all
on document_templates
for select
using (true);

drop policy if exists generated_documents_member_policy on generated_documents;
create policy generated_documents_member_policy
on generated_documents
for all
using (
  exists (
    select 1
    from applications a
    where a.id = generated_documents.application_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from applications a
    where a.id = generated_documents.application_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists document_versions_member_policy on document_versions;
create policy document_versions_member_policy
on document_versions
for all
using (
  exists (
    select 1
    from generated_documents gd
    join applications a on a.id = gd.application_id
    where gd.id = document_versions.generated_document_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from generated_documents gd
    join applications a on a.id = gd.application_id
    where gd.id = document_versions.generated_document_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists compliance_audit_events_member_policy on compliance_audit_events;
create policy compliance_audit_events_member_policy
on compliance_audit_events
for all
using (
  exists (
    select 1
    from applications a
    where a.id = compliance_audit_events.application_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from applications a
    where a.id = compliance_audit_events.application_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists questionnaire_responses_member_policy on questionnaire_responses;
create policy questionnaire_responses_member_policy
on questionnaire_responses
for all
using (
  exists (
    select 1
    from applications a
    where a.id = questionnaire_responses.application_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from applications a
    where a.id = questionnaire_responses.application_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists compliance_cycles_member_policy on compliance_cycles;
create policy compliance_cycles_member_policy
on compliance_cycles
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists risk_register_entries_member_policy on risk_register_entries;
create policy risk_register_entries_member_policy
on risk_register_entries
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists incident_reports_member_policy on incident_reports;
create policy incident_reports_member_policy
on incident_reports
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists control_tasks_member_policy on control_tasks;
create policy control_tasks_member_policy
on control_tasks
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

drop policy if exists improvement_actions_member_policy on improvement_actions;
create policy improvement_actions_member_policy
on improvement_actions
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));
