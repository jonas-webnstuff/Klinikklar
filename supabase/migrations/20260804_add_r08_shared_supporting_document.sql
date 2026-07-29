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
-- structured_requirement_item_attachments — replacing the shared document keeps every
-- prior version's Storage object and a row here pointing at it.
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

alter table requirement_supporting_documents enable row level security;
alter table requirement_supporting_document_versions enable row level security;

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

-- Insert-or-update the shared "current file" pointer, then record this version in
-- history — same atomicity principle as replace_structured_requirement_attachment
-- (R-09), adapted for the fact that a first-ever upload has no pre-existing row to
-- attach to. Reuses the same requirement-attachments Storage bucket (requirement-
-- attachments); no new bucket needed since the bucket's RLS policy only inspects the
-- org-id path segment, not the rest of the path shape.
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
