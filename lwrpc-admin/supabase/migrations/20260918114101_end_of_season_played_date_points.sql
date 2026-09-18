-- DUPR Rules Rule 6.3.9: allow end-of-season awards to use verified match dates
-- without requiring a separately captured starting-schedule baseline.
alter table public.division_compensatory_point_awards
  alter column baseline_id drop not null,
  add column calculation_basis text not null default 'starting_schedule',
  add column match_dates_played integer check (match_dates_played is null or match_dates_played >= 0),
  add column maximum_match_dates_played integer check (maximum_match_dates_played is null or maximum_match_dates_played >= 0);

alter table public.division_compensatory_point_awards
  add constraint division_compensatory_point_awards_division_fk
    foreign key (division_id) references public.divisions(id) on delete cascade,
  add constraint division_compensatory_point_awards_team_fk
    foreign key (team_id) references public.teams(id) on delete cascade,
  add constraint division_compensatory_point_awards_basis_check
    check (calculation_basis in ('starting_schedule', 'verified_match_dates'));

create index division_compensatory_point_awards_team_idx
  on public.division_compensatory_point_awards (team_id);

comment on column public.division_compensatory_point_awards.calculation_basis is
  'starting_schedule for historical v1 awards; verified_match_dates for end-of-season Rule 6.3.9 awards.';
comment on column public.division_compensatory_point_awards.match_dates_played is
  'Distinct verified match dates used by the end-of-season calculation.';
comment on column public.division_compensatory_point_awards.maximum_match_dates_played is
  'Highest distinct verified match-date count among teams in the Division/Pool.';
