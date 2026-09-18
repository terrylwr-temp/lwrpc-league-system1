-- Preserve the existing direct teams -> divisions PostgREST embed path.
-- The award table's two cross-links create an alternate inferred many-to-many
-- relationship and make established teams(divisions(...)) reads ambiguous.
alter table public.division_compensatory_point_awards
  drop constraint if exists division_compensatory_point_awards_division_fk,
  drop constraint if exists division_compensatory_point_awards_team_fk;
