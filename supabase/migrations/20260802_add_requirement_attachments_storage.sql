-- Private bucket for real file uploads (R-09 today, R-08 later). Path convention:
-- {organization_id}/{application_id}/{requirement_code}/{item_id}/{version}-{safe_filename}
-- so the org id is always the first path segment and storage RLS can reuse is_org_member().
insert into storage.buckets (id, name, public)
values ('requirement-attachments', 'requirement-attachments', false)
on conflict (id) do nothing;

-- "Current file" pointer, alongside the file_path column added in
-- 20260801_add_r09_attachment_file_path.sql.
alter table structured_requirement_items
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_mime_type text,
  add column if not exists uploaded_at timestamptz,
  add column if not exists uploaded_by uuid references auth.users(id);

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

alter table structured_requirement_item_attachments enable row level security;

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

-- Atomic history-insert + current-pointer-update, analogous to
-- create_document_draft_version. Anropas från
-- structured-requirements/attachments/route.ts EFTER att filen redan är
-- uppladdad till Storage — funktionen rör bara databasen.
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
