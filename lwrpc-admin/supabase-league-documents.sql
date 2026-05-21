alter table public.leagues
  add column if not exists league_document_bucket text,
  add column if not exists code_of_conduct_pdf_path text,
  add column if not exists captains_guide_pdf_path text,
  add column if not exists league_rules_pdf_path text,
  add column if not exists score_sheet_pdf_path text,
  add column if not exists league_waiver_pdf_path text;

comment on column public.leagues.league_document_bucket is
  'Supabase Storage bucket that contains this league document set.';
comment on column public.leagues.code_of_conduct_pdf_path is
  'Storage object path for this league Code of Conduct PDF.';
comment on column public.leagues.captains_guide_pdf_path is
  'Storage object path for this league Captains Guide PDF.';
comment on column public.leagues.league_rules_pdf_path is
  'Storage object path for this league Rules PDF.';
comment on column public.leagues.score_sheet_pdf_path is
  'Storage object path for this league Score Sheet PDF.';
comment on column public.leagues.league_waiver_pdf_path is
  'Storage object path for this league Waiver PDF.';
