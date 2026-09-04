-- LMS-0706: additive catalog type only. Apply before deploying LMS-0706.
begin;

alter table public.ai_documents
  drop constraint ai_documents_document_type_check;

alter table public.ai_documents
  add constraint ai_documents_document_type_check check (document_type in (
    'league_rules',
    'league_supplement',
    'usap_rulebook',
    'captain_guide',
    'player_guide',
    'lms_guide',
    'other'
  ));

commit;
