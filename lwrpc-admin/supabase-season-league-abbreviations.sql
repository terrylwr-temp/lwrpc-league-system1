-- Adds short labels used to disambiguate historical play-history team filters.
-- Run in the Supabase SQL editor before deploying the related app changes.

alter table public.seasons
  add column if not exists abbreviation text;

alter table public.leagues
  add column if not exists abbreviation text;
