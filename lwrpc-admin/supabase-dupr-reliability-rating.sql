alter table public.member_season_ratings
  add column if not exists dupr_reliability_rating numeric(6, 3);

comment on column public.member_season_ratings.dupr_reliability_rating
  is 'Raw DUPR doublesReliability value imported from ratings CSV files.';
