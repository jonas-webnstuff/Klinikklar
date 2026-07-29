create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_number text not null,
  email text not null,
  phone text,
  plan text check (plan in ('ansokan', 'step1', 'step2', 'step3')),
  created_at timestamptz not null default now()
);

alter table organizations
  add column if not exists plan text check (plan in ('ansokan', 'step1', 'step2', 'step3'));

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
  postal_code text not null,
  municipality text not null,
  region text not null,
  has_radiology boolean not null default false,
  has_sedation boolean not null default false,
  created_at timestamptz not null default now()
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
  is_current boolean not null default true,
  source text not null default 'ai' check (source in ('ai', 'manual')),
  created_at timestamptz not null default now()
);

alter table generated_documents
  add column if not exists is_current boolean not null default true;

alter table generated_documents
  add column if not exists source text not null default 'ai' check (source in ('ai', 'manual'));

-- Backfill: bara senaste raden per (application_id, kind) ska vara aktuell.
-- Krävs innan unique-indexet nedan kan skapas på databaser som redan har
-- flera rader per krav (annars defaultar alla befintliga rader till
-- is_current = true och indexet hittar dubbletter).
with ranked as (
  select id, row_number() over (
    partition by application_id, kind order by created_at desc, id desc
  ) as rn
  from generated_documents
)
update generated_documents
set is_current = false
where id in (select id from ranked where rn > 1);

update generated_documents
set source = 'manual'
where source = 'ai' and body like 'OBS: Manuellt startdokument%';

create unique index if not exists generated_documents_one_current_per_kind
  on generated_documents (application_id, kind)
  where is_current;

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  generated_document_id uuid not null references generated_documents(id) on delete cascade,
  version integer not null,
  body text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  unique (generated_document_id, version)
);

-- Atomisk demote-gammal + insert-ny, anropas från documents/draft/route.ts.
create or replace function public.create_document_draft_version(
  p_application_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_source text
) returns generated_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document generated_documents;
begin
  update generated_documents
  set is_current = false
  where application_id = p_application_id
    and kind = p_kind
    and is_current = true;

  insert into generated_documents (application_id, kind, title, body, is_approved, is_current, source)
  values (p_application_id, p_kind, p_title, p_body, false, true, p_source)
  returning * into v_document;

  insert into document_versions (generated_document_id, version, body)
  values (v_document.id, 1, p_body);

  return v_document;
end;
$$;

revoke all on function public.create_document_draft_version(uuid, text, text, text, text) from public;
grant execute on function public.create_document_draft_version(uuid, text, text, text, text) to service_role;

-- Atomisk demote-gammal + promote-vald + nollställ granskningsinfo, anropas
-- från documents/restore/route.ts.
create or replace function public.restore_document_draft_version(
  p_document_id uuid,
  p_application_id uuid
) returns generated_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target generated_documents;
begin
  select * into v_target
  from generated_documents
  where id = p_document_id
    and application_id = p_application_id
  for update;

  if not found then
    raise exception 'document_not_found';
  end if;

  if v_target.is_current then
    return v_target;
  end if;

  update generated_documents
  set is_current = false
  where application_id = p_application_id
    and kind = v_target.kind
    and is_current = true;

  update generated_documents
  set is_current = true, is_approved = false
  where id = v_target.id
  returning * into v_target;

  update document_versions
  set reviewed_by = null, reviewed_at = null
  where generated_document_id = v_target.id;

  return v_target;
end;
$$;

revoke all on function public.restore_document_draft_version(uuid, uuid) from public;
grant execute on function public.restore_document_draft_version(uuid, uuid) to service_role;

create table if not exists structured_requirement_items (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  requirement_code text not null check (requirement_code in ('R-06', 'R-07', 'R-08', 'R-09', 'R-10')),
  fields jsonb not null default '{}'::jsonb,
  file_path text,
  file_name text,
  file_size bigint,
  file_mime_type text,
  uploaded_at timestamptz,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table structured_requirement_items
  add column if not exists file_path text;

alter table structured_requirement_items
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_mime_type text,
  add column if not exists uploaded_at timestamptz,
  add column if not exists uploaded_by uuid references auth.users(id);

-- Private bucket for real file uploads (R-09 today, R-08 later). Path convention:
-- {organization_id}/{application_id}/{requirement_code}/{item_id}/{version}-{safe_filename}
-- so the org id is always the first path segment and storage RLS can reuse is_org_member().
insert into storage.buckets (id, name, public)
values ('requirement-attachments', 'requirement-attachments', false)
on conflict (id) do nothing;

-- Full upload history: replacing a file never deletes the old object from Storage or
-- this table, mirroring the document_versions precedent for R-01-R-05 drafts.
create table if not exists structured_requirement_item_attachments (
  id uuid primary key default gen_random_uuid(),
  structured_requirement_item_id uuid not null references structured_requirement_items(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  file_mime_type text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);

create index if not exists structured_requirement_item_attachments_item_idx
  on structured_requirement_item_attachments (structured_requirement_item_id, uploaded_at desc);

-- Atomic history-insert + current-pointer-update, analogous to
-- create_document_draft_version. Called from
-- structured-requirements/attachments/route.ts AFTER the file is already
-- uploaded to Storage — this function only touches the database.
create or replace function public.replace_structured_requirement_attachment(
  p_item_id uuid,
  p_application_id uuid,
  p_file_path text,
  p_file_name text,
  p_file_size bigint,
  p_file_mime_type text,
  p_uploaded_by uuid
) returns structured_requirement_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item structured_requirement_items;
begin
  select * into v_item
  from structured_requirement_items
  where id = p_item_id
    and application_id = p_application_id
  for update;

  if not found then
    raise exception 'structured_requirement_item_not_found';
  end if;

  insert into structured_requirement_item_attachments (
    structured_requirement_item_id, file_path, file_name, file_size, file_mime_type, uploaded_by
  )
  values (p_item_id, p_file_path, p_file_name, p_file_size, p_file_mime_type, p_uploaded_by);

  update structured_requirement_items
  set file_path = p_file_path,
      file_name = p_file_name,
      file_size = p_file_size,
      file_mime_type = p_file_mime_type,
      uploaded_at = now(),
      uploaded_by = p_uploaded_by,
      updated_at = now(),
      updated_by = p_uploaded_by
  where id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

revoke all on function public.replace_structured_requirement_attachment(uuid, uuid, text, text, bigint, text, uuid) from public;
grant execute on function public.replace_structured_requirement_attachment(uuid, uuid, text, text, bigint, text, uuid) to service_role;

create index if not exists structured_requirement_items_app_kind_idx
  on structured_requirement_items (application_id, requirement_code, created_at);

-- NOT the same thing as structured_requirement_items / structured_requirement_item_attachments
-- (R-09's per-ROW file uploads — one file per attachment line, scoped to a single item id).
-- R-08 has one row per owner in structured_requirement_items, but a single handling
-- (aktiebok, registreringsbevis från Bolagsverket) typically proves the whole ownership
-- picture at once — it doesn't belong to any one owner row. So this file is scoped to
-- (application_id, requirement_code) instead: one shared document per requirement, not
-- one per row. Deliberately named with no "item"/"attachment" overlap with the R-09
-- tables so the two can't be confused at a glance or queried by mistake.
create table if not exists requirement_supporting_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  requirement_code text not null,
  file_path text,
  file_name text,
  file_size bigint,
  file_mime_type text,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id),
  unique (application_id, requirement_code)
);

-- Full upload history, same "never overwrite or delete in Storage" principle as
-- structured_requirement_item_attachments.
create table if not exists requirement_supporting_document_versions (
  id uuid primary key default gen_random_uuid(),
  requirement_supporting_document_id uuid not null references requirement_supporting_documents(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint not null,
  file_mime_type text not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references auth.users(id)
);

create index if not exists requirement_supporting_document_versions_doc_idx
  on requirement_supporting_document_versions (requirement_supporting_document_id, uploaded_at desc);

-- Insert-or-update the shared "current file" pointer, then record this version in
-- history — same atomicity principle as replace_structured_requirement_attachment,
-- adapted for the fact that a first-ever upload has no pre-existing row to attach to.
create or replace function public.replace_requirement_supporting_document(
  p_application_id uuid,
  p_requirement_code text,
  p_file_path text,
  p_file_name text,
  p_file_size bigint,
  p_file_mime_type text,
  p_uploaded_by uuid
) returns requirement_supporting_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document requirement_supporting_documents;
begin
  select * into v_document
  from requirement_supporting_documents
  where application_id = p_application_id
    and requirement_code = p_requirement_code
  for update;

  if not found then
    insert into requirement_supporting_documents (
      application_id, requirement_code, file_path, file_name, file_size, file_mime_type, uploaded_by
    )
    values (p_application_id, p_requirement_code, p_file_path, p_file_name, p_file_size, p_file_mime_type, p_uploaded_by)
    returning * into v_document;
  else
    update requirement_supporting_documents
    set file_path = p_file_path,
        file_name = p_file_name,
        file_size = p_file_size,
        file_mime_type = p_file_mime_type,
        uploaded_at = now(),
        uploaded_by = p_uploaded_by
    where id = v_document.id
    returning * into v_document;
  end if;

  insert into requirement_supporting_document_versions (
    requirement_supporting_document_id, file_path, file_name, file_size, file_mime_type, uploaded_by
  )
  values (v_document.id, p_file_path, p_file_name, p_file_size, p_file_mime_type, p_uploaded_by);

  return v_document;
end;
$$;

revoke all on function public.replace_requirement_supporting_document(uuid, text, text, text, bigint, text, uuid) from public;
grant execute on function public.replace_requirement_supporting_document(uuid, text, text, text, bigint, text, uuid) to service_role;

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

create table if not exists compliance_audit_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists risk_register_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  clinic_id uuid references clinics(id) on delete set null,
  cycle_id uuid,
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
  cycle_id uuid,
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
  cycle_id uuid,
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

create index if not exists risk_register_entries_org_status_idx
on risk_register_entries(organization_id, status);

create index if not exists incident_reports_org_status_idx
on incident_reports(organization_id, status);

create index if not exists control_tasks_org_due_idx
on control_tasks(organization_id, next_due_date);

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
alter table applications enable row level security;
alter table questionnaire_responses enable row level security;
alter table requirements enable row level security;
alter table evidence enable row level security;
alter table document_templates enable row level security;
alter table generated_documents enable row level security;
alter table document_versions enable row level security;
alter table structured_requirement_items enable row level security;
alter table structured_requirement_item_attachments enable row level security;
alter table requirement_supporting_documents enable row level security;
alter table requirement_supporting_document_versions enable row level security;
alter table care_scope_codes enable row level security;
alter table compliance_audit_events enable row level security;
alter table risk_register_entries enable row level security;
alter table incident_reports enable row level security;
alter table control_tasks enable row level security;

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

drop policy if exists structured_requirement_item_attachments_member_policy on structured_requirement_item_attachments;
create policy structured_requirement_item_attachments_member_policy
on structured_requirement_item_attachments
for all
using (
  exists (
    select 1
    from structured_requirement_items sri
    join applications a on a.id = sri.application_id
    where sri.id = structured_requirement_item_attachments.structured_requirement_item_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from structured_requirement_items sri
    join applications a on a.id = sri.application_id
    where sri.id = structured_requirement_item_attachments.structured_requirement_item_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists requirement_supporting_documents_member_policy on requirement_supporting_documents;
create policy requirement_supporting_documents_member_policy
on requirement_supporting_documents
for all
using (
  exists (
    select 1
    from applications a
    where a.id = requirement_supporting_documents.application_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from applications a
    where a.id = requirement_supporting_documents.application_id
      and public.is_org_member(a.organization_id)
  )
);

drop policy if exists requirement_supporting_document_versions_member_policy on requirement_supporting_document_versions;
create policy requirement_supporting_document_versions_member_policy
on requirement_supporting_document_versions
for all
using (
  exists (
    select 1
    from requirement_supporting_documents rsd
    join applications a on a.id = rsd.application_id
    where rsd.id = requirement_supporting_document_versions.requirement_supporting_document_id
      and public.is_org_member(a.organization_id)
  )
)
with check (
  exists (
    select 1
    from requirement_supporting_documents rsd
    join applications a on a.id = rsd.application_id
    where rsd.id = requirement_supporting_document_versions.requirement_supporting_document_id
      and public.is_org_member(a.organization_id)
  )
);

-- Defense-in-depth: the app writes/reads via the service-role route layer (same
-- pattern as every other table here), so this isn't the primary access control,
-- but it stops a leaked anon/authenticated token from reaching other orgs' files.
drop policy if exists requirement_attachments_select_own_org on storage.objects;
create policy requirement_attachments_select_own_org
on storage.objects for select
using (
  bucket_id = 'requirement-attachments'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
);

drop policy if exists requirement_attachments_insert_own_org on storage.objects;
create policy requirement_attachments_insert_own_org
on storage.objects for insert
with check (
  bucket_id = 'requirement-attachments'
  and public.is_org_member((storage.foldername(name))[1]::uuid)
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

