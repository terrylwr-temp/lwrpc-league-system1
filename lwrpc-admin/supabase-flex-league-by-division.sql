begin;

alter table public.divisions
  add column if not exists flex_league boolean not null default false;

comment on column public.divisions.flex_league is
  'When true, the home captain or co-captain can modify scheduled match date/time within the Captain Dashboard flex window.';

-- Preserve any existing league-level Flex selections while ownership moves to divisions.
update public.divisions d
set flex_league = true
from public.leagues l
where l.id = d.league_id
  and l.flex_league = true
  and d.flex_league = false;

commit;
