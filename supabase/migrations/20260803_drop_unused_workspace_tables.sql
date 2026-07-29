-- Drops four tables confirmed dead via an exhaustive grep across src/ before writing
-- this migration: compliance_cycles, improvement_actions, persons, ownership_roles.
-- None were ever queried by any route or page — persons/ownership_roles predate the
-- structured_requirement_items (R-06/R-07/R-08) model and were superseded before any
-- code referenced them; compliance_cycles/improvement_actions were never wired to any
-- UI at all.

-- risk_register_entries/incident_reports/control_tasks stay (actively used by
-- /api/risks, /api/incidents, /api/controls) but their cycle_id FK pointed at
-- compliance_cycles, which is being dropped. The column stays (always null in
-- practice — the app has no "cycle" concept anywhere), only the constraint goes.
alter table risk_register_entries drop constraint if exists risk_register_entries_cycle_id_fkey;
alter table incident_reports drop constraint if exists incident_reports_cycle_id_fkey;
alter table control_tasks drop constraint if exists control_tasks_cycle_id_fkey;

-- improvement_actions before compliance_cycles: it holds a FK to compliance_cycles,
-- so dropping it first means the compliance_cycles drop below needs no cascade.
drop table if exists improvement_actions;
drop table if exists compliance_cycles;

-- ownership_roles before persons: it holds a FK to persons (person_id).
drop table if exists ownership_roles;
drop table if exists persons;
