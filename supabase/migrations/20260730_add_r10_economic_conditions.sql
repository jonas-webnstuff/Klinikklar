alter table structured_requirement_items
  drop constraint if exists structured_requirement_items_requirement_code_check;

alter table structured_requirement_items
  add constraint structured_requirement_items_requirement_code_check
  check (requirement_code in ('R-06', 'R-07', 'R-08', 'R-09', 'R-10'));
