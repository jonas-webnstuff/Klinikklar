-- Rutiner tab (workspace) used to store its 6-point routine checklist as a JSON blob inside
-- answers.routine_updates_entries (persisted via questionnaire_responses, question_key =
-- 'routine_updates_entries'), only saved when the user clicked the unrelated whole-workspace
-- "Spara" button. This gives it its own table, matching the risk_register_entries /
-- incident_reports / control_tasks pattern (organization-scoped, own CRUD routes), so
-- saveRoutineForPoint() can persist immediately instead of silently claiming "sparad" while
-- only touching local state.

create table if not exists routine_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  requirement_key text not null,
  requirement_label text not null,
  area text not null,
  change_log text not null,
  owner_role text not null,
  next_review date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, requirement_key)
);

create index if not exists routine_entries_org_idx
on routine_entries(organization_id);

drop trigger if exists routine_entries_set_updated_at on routine_entries;
create trigger routine_entries_set_updated_at
before update on routine_entries
for each row
execute procedure public.set_updated_at();

alter table routine_entries enable row level security;

drop policy if exists routine_entries_member_policy on routine_entries;
create policy routine_entries_member_policy
on routine_entries
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

-- One-off backfill: as of writing this migration, exactly one application in production has
-- data in the old JSON blob (confirmed via direct query before writing this migration — the
-- other real clinics, including the Bygdens tandklinik test account, have none). Copy it
-- forward so nothing existing disappears from the UI, keyed by (organization_id,
-- requirement_key) to match the table's uniqueness constraint.
do $$
declare
  response record;
  entry jsonb;
begin
  for response in
    select qr.answer, a.organization_id
    from questionnaire_responses qr
    join applications a on a.id = qr.application_id
    where qr.question_key = 'routine_updates_entries'
      and qr.answer is not null
      and qr.answer <> ''
      and qr.answer <> '[]'
  loop
    for entry in select * from jsonb_array_elements(response.answer::jsonb)
    loop
      insert into routine_entries (
        organization_id,
        requirement_key,
        requirement_label,
        area,
        change_log,
        owner_role,
        next_review
      )
      values (
        response.organization_id,
        entry->>'requirementKey',
        entry->>'requirementLabel',
        entry->>'area',
        entry->>'changeLog',
        entry->>'owner',
        (entry->>'nextReview')::date
      )
      on conflict (organization_id, requirement_key) do update set
        requirement_label = excluded.requirement_label,
        area = excluded.area,
        change_log = excluded.change_log,
        owner_role = excluded.owner_role,
        next_review = excluded.next_review;
    end loop;
  end loop;
end $$;

-- The old storage location is now dead weight — nothing reads it after this migration.
delete from questionnaire_responses
where question_key in (
  'routine_updates_entries',
  'routine_updates_area',
  'routine_updates_change_log',
  'routine_updates_owner',
  'routine_updates_next_review'
);
