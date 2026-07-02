alter table public.leagues
  add column if not exists only_home_community_players boolean not null default false;

comment on column public.leagues.only_home_community_players is
  'When true, captain-level roster adds are limited to the team home community. League managers and commissioners can override the roster location filter.';
