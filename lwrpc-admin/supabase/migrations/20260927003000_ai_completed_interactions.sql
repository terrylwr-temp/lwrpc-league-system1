-- Additive official-document interaction history. No historical backfill or retention job.
begin;

create table if not exists public.ai_completed_interactions (
  id uuid primary key,
  outcome_id uuid not null unique references public.ai_request_outcomes(id) on delete restrict,
  request_started_at timestamptz not null,
  completed_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  original_question text not null check (length(original_question) between 1 and 1000 and original_question !~* '^choice:[0-9a-f-]{36}$'),
  effective_question text not null check (length(effective_question) between 1 and 2400 and effective_question !~* '^choice:[0-9a-f-]{36}$'),
  final_answer text not null check (length(final_answer) between 1 and 16000),
  auth_user_id uuid references auth.users(id) on delete set null,
  member_id uuid references public.members(id) on delete set null,
  role_at_request text not null check (role_at_request in ('player','captain','club_pro','league_manager','commissioner')),
  origin text not null check (origin in ('player_interface','manager_test')),
  test_classification text not null check (test_classification in ('none','manager_console','automated_test')),
  result_kind text not null check (result_kind in ('answer','insufficient_evidence')),
  completion_status text not null default 'finalized' check (completion_status = 'finalized'),
  server_response_ms numeric(12,3) not null check (server_response_ms >= 0),
  source_refs jsonb not null default '[]'::jsonb check (
    jsonb_typeof(source_refs) = 'array' and jsonb_array_length(source_refs) <= 8
    and octet_length(source_refs::text) <= 8192 and source_refs::text !~* 'https?://'
  ),
  assistant_version text not null check (length(assistant_version) between 1 and 80),
  payload_purged_at timestamptz,
  check (id = outcome_id and completed_at >= request_started_at),
  check ((origin = 'player_interface' and test_classification in ('none','automated_test'))
    or (origin = 'manager_test' and test_classification = 'manager_console'))
);
create index if not exists ai_completed_interactions_recent on public.ai_completed_interactions
  (test_classification, result_kind, completed_at desc, id desc);
create index if not exists ai_completed_interactions_member on public.ai_completed_interactions (member_id, completed_at desc);

revoke all on table public.ai_completed_interactions from public, anon, authenticated, service_role;
grant select, insert on table public.ai_completed_interactions to service_role;
alter table public.ai_completed_interactions enable row level security;

alter table public.ai_answer_feedback_events
  add column if not exists completed_interaction_id uuid references public.ai_completed_interactions(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='ai_answer_feedback_completed_identity'
    and conrelid='public.ai_answer_feedback_events'::regclass) then
    alter table public.ai_answer_feedback_events add constraint ai_answer_feedback_completed_identity
      check (completed_interaction_id is null or completed_interaction_id = answer_id);
  end if;
end $$;
create index if not exists ai_answer_feedback_completed on public.ai_answer_feedback_events
  (completed_interaction_id, created_at desc, id desc) where completed_interaction_id is not null;

create or replace function public.capture_ai_completed_official(
  p_outcome jsonb, p_occurrence jsonb, p_route jsonb, p_interaction jsonb
) returns jsonb language plpgsql security invoker
set search_path = pg_catalog, public set statement_timeout = '2s' as $$
declare v public.ai_completed_interactions; old public.ai_completed_interactions;
begin
  if current_user not in ('service_role','postgres') then raise exception 'completed_forbidden'; end if;
  if jsonb_typeof(p_outcome) <> 'object' or jsonb_typeof(p_interaction) <> 'object' then raise exception 'completed_invalid'; end if;
  v := jsonb_populate_record(null::public.ai_completed_interactions,p_interaction);
  if v.id is null or v.outcome_id is distinct from v.id or v.id is distinct from (p_outcome->>'id')::uuid
    or v.origin is distinct from p_outcome->>'origin' or v.result_kind is distinct from p_outcome->>'final_kind'
    or v.request_started_at is distinct from (p_outcome->>'request_started_at')::timestamptz
    or v.completed_at is distinct from (p_outcome->>'completed_at')::timestamptz
    or v.auth_user_id is null or v.original_question is null or v.effective_question is null
    or v.final_answer is null or v.source_refs is null then raise exception 'completed_identity'; end if;
  v.recorded_at := clock_timestamp();
  if exists (select 1 from jsonb_array_elements(v.source_refs) as x(source)
    cross join lateral jsonb_object_keys(x.source) as k(key)
    where jsonb_typeof(x.source) <> 'object' or k.key not in
      ('sourceKind','documentId','documentVersionId','chunkId','approvedAnswerId','approvedRevisionId',
       'documentTitle','citation','ruleNumber','pageNumber','sectionLabel'))
    then raise exception 'completed_source_shape'; end if;
  perform public.capture_ai_quality(p_outcome,p_occurrence,p_route,null);
  select * into old from public.ai_completed_interactions where id=v.id;
  if found then
    if (to_jsonb(old)-'recorded_at'-'payload_purged_at') is distinct from
       (to_jsonb(v)-'recorded_at'-'payload_purged_at') then raise exception 'completed_mismatch'; end if;
  else
    insert into public.ai_completed_interactions select (v).*;
  end if;
  return jsonb_build_object('recorded',true,'id',v.id);
end $$;
revoke all on function public.capture_ai_completed_official(jsonb,jsonb,jsonb,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.capture_ai_completed_official(jsonb,jsonb,jsonb,jsonb) to service_role;

create or replace function public.ai_review_completed_interactions(p_filters jsonb)
returns jsonb language plpgsql stable security invoker
set search_path = pg_catalog, public set statement_timeout = '5s' as $$
declare
  v_from timestamptz := (p_filters->>'from')::timestamptz;
  v_to timestamptz := (p_filters->>'to')::timestamptz;
  v_asof timestamptz := (p_filters->>'asof')::timestamptz;
  v_limit integer := (p_filters->>'limit')::integer;
  v_feedback text := coalesce(p_filters->>'feedback','all');
  v_class text := coalesce(p_filters->>'classification','none');
  v_result text := coalesce(p_filters->>'result','all');
  v_rule text := trim(coalesce(p_filters->>'rule',''));
  v_search text := lower(trim(coalesce(p_filters->>'search','')));
  v_cursor_at timestamptz := (p_filters->>'cursor_at')::timestamptz;
  v_cursor_id uuid := (p_filters->>'cursor_id')::uuid;
  v_answer uuid := (p_filters->>'answer')::uuid;
  v_output jsonb;
begin
  if current_user not in ('service_role','postgres') then raise exception 'review_forbidden'; end if;
  if jsonb_typeof(p_filters) is distinct from 'object' or v_to is null or v_asof is null
    or (v_from is not null and v_from >= v_to) or v_limit is null or v_limit not in (25,50)
    or v_feedback not in ('all','helpful','not_helpful','no_feedback','ambiguous')
    or v_class not in ('none','manager_console','automated_test','all')
    or v_result not in ('all','answer','insufficient_evidence')
    or length(v_search)>200 or length(v_rule)>120
    or ((v_cursor_at is null) <> (v_cursor_id is null)) then raise exception 'review_invalid'; end if;
  with votes as (
    select f.completed_interaction_id id, max(f.created_at) latest_at
    from public.ai_answer_feedback_events f where f.completed_interaction_id is not null
      and f.created_at <= v_asof group by f.completed_interaction_id
  ), vote_state as (
    select v.id,v.latest_at,
      case when count(distinct f.helpful)=1 then bool_and(f.helpful) end helpful
    from votes v join public.ai_answer_feedback_events f
      on f.completed_interaction_id=v.id and f.created_at=v.latest_at
    group by v.id,v.latest_at
  ), retained as materialized (
    select c.id answer_id,c.completed_at occurred_at,'completed'::text time_basis,c.origin,
      c.test_classification,c.result_kind result,c.completion_status,c.assistant_version,
      c.original_question question,c.effective_question,c.final_answer answer,c.source_refs,
      c.auth_user_id,c.member_id,c.role_at_request user_role,c.server_response_ms response_ms,
      coalesce(nullif(trim(concat_ws(' ',m.first_name,m.last_name)),''),nullif(trim(m.full_name),'')) user_name,
      case when m.id is not null then 'current_member_record'::text end user_name_basis,
      case when v.id is null then 'no_feedback' when v.helpful is null then 'ambiguous'
        when v.helpful then 'helpful' else 'not_helpful' end feedback,
      v.latest_at feedback_at,c.payload_purged_at is not null payload_purged
    from public.ai_completed_interactions c
    left join public.members m on m.id=c.member_id
    left join vote_state v on v.id=c.id
    where c.recorded_at<=v_asof and c.completed_at<=v_asof and c.completed_at<v_to
      and (v_from is null or c.completed_at>=v_from)
      and (v_answer is null or c.id=v_answer)
      and (v_class='all' or c.test_classification=v_class)
      and (v_result='all' or c.result_kind=v_result)
      and (v_rule='' or exists(select 1 from jsonb_array_elements(c.source_refs) as s(source) where s.source->>'ruleNumber'=v_rule))
      and (v_search='' or position(v_search in lower(c.original_question))>0
        or position(v_search in lower(c.effective_question))>0
        or position(v_search in lower(c.final_answer))>0
        or position(v_search in lower(coalesce(m.full_name,concat_ws(' ',m.first_name,m.last_name))))>0)
  ), filtered as materialized (
    select * from retained where v_feedback='all' or feedback=v_feedback
  ), page as (
    select * from filtered where v_cursor_at is null or (occurred_at,answer_id)<(v_cursor_at,v_cursor_id)
    order by occurred_at desc,answer_id desc limit v_limit+1
  ), page_json as (
    select occurred_at,answer_id,
      (to_jsonb(p)-'question'-'effective_question'-'answer') || jsonb_build_object(
        'question',case when v_answer is null then left(p.question,240) else p.question end,
        'effective_question',case when v_answer is null then left(p.effective_question,240) else p.effective_question end,
        'answer',case when v_answer is null then left(p.answer,320) else p.answer end,
        'has_question',true,'has_answer',true) item
    from page p
  )
  select jsonb_build_object(
    'rows',coalesce((select jsonb_agg(item order by occurred_at desc,answer_id desc) from page_json),'[]'::jsonb),
    'summary',(select jsonb_build_object('total',count(*),
      'helpful',count(*) filter(where feedback='helpful'),
      'not_helpful',count(*) filter(where feedback='not_helpful'),
      'no_feedback',count(*) filter(where feedback='no_feedback'),
      'ambiguous',count(*) filter(where feedback='ambiguous')) from retained)
  ) into v_output;
  return v_output;
end $$;
revoke all on function public.ai_review_completed_interactions(jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.ai_review_completed_interactions(jsonb) to service_role;
commit;
