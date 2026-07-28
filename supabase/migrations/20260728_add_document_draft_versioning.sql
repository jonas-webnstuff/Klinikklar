alter table generated_documents
  add column if not exists is_current boolean not null default true;

alter table generated_documents
  add column if not exists source text not null default 'ai' check (source in ('ai', 'manual'));

-- Backfill: bara senaste raden per (application_id, kind) ska vara aktuell.
with ranked as (
  select id, row_number() over (
    partition by application_id, kind order by created_at desc, id desc
  ) as rn
  from generated_documents
)
update generated_documents
set is_current = false
where id in (select id from ranked where rn > 1);

-- Best-effort backfill av source för befintliga rader: rader skapade i manuellt
-- läge har prefixet "OBS: Manuellt startdokument" i body (se documents/draft/route.ts).
update generated_documents
set source = 'manual'
where body like 'OBS: Manuellt startdokument%';

-- Enforce på DB-nivå: max en aktuell rad per krav och ansökan. Detta är ett
-- skyddsnät, inte huvudmekanismen — atomiciteten kommer från funktionerna
-- nedan, som kör demote+insert/demote+promote i en enda Postgres-transaktion.
create unique index if not exists generated_documents_one_current_per_kind
  on generated_documents (application_id, kind)
  where is_current;

-- Atomisk demote-gammal + insert-ny, anropas från documents/draft/route.ts
-- EFTER att AI-anropet (generateAssistance) redan är klart — funktionen rör
-- bara databasen, aldrig externa anrop.
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
