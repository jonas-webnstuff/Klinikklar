alter table if exists clinics
  add column if not exists postal_code text;

update clinics
set postal_code = coalesce(postal_code, '')
where postal_code is null;

alter table clinics
  alter column postal_code set default '';

update clinics
set postal_code = ''
where postal_code = '';

alter table clinics
  alter column postal_code set not null;