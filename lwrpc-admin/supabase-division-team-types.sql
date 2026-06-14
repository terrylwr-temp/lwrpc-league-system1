alter table public.divisions
  add column if not exists primary_team_type text not null default 'gender_doubles',
  add column if not exists secondary_number_of_lines integer,
  add column if not exists secondary_team_type text;

update public.divisions
set primary_team_type = 'gender_doubles'
where primary_team_type is null or primary_team_type = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'divisions_primary_team_type_check'
  ) then
    alter table public.divisions
      add constraint divisions_primary_team_type_check
      check (primary_team_type in ('gender_doubles', 'mixed_doubles'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'divisions_secondary_team_type_check'
  ) then
    alter table public.divisions
      add constraint divisions_secondary_team_type_check
      check (secondary_team_type is null or secondary_team_type in ('gender_doubles', 'mixed_doubles'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'divisions_secondary_number_of_lines_check'
  ) then
    alter table public.divisions
      add constraint divisions_secondary_number_of_lines_check
      check (secondary_number_of_lines is null or secondary_number_of_lines >= 1);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'divisions_secondary_team_setup_check'
  ) then
    alter table public.divisions
      add constraint divisions_secondary_team_setup_check
      check (
        (
          secondary_number_of_lines is null
          and secondary_team_type is null
        )
        or (
          secondary_number_of_lines is not null
          and secondary_team_type is not null
          and secondary_team_type <> primary_team_type
        )
      );
  end if;
end $$;
