alter table organizations drop constraint if exists organizations_plan_check;

alter table organizations
  add constraint organizations_plan_check
  check (plan in ('ansokan', 'step1', 'step2', 'step3'));
