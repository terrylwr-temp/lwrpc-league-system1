-- LMS-0721 / 0.1.543. Local implementation; apply only after owner deployment approval.
begin;
create table if not exists public.ai_approved_answers (
 id uuid primary key default gen_random_uuid(),
 source_review_case_id uuid not null unique references public.ai_manager_review_cases(id) on delete restrict,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by_user_id uuid references auth.users(id) on delete set null,
 updated_by_user_id uuid references auth.users(id) on delete set null,
 row_version bigint not null default 1 check(row_version>0)
);
create table if not exists public.ai_approved_answer_revisions (
 id uuid primary key default gen_random_uuid(), answer_id uuid not null references public.ai_approved_answers(id) on delete restrict,
 revision_number integer not null check(revision_number>0), status text not null default 'draft' check(status in ('draft','active','retired')),
 title text not null check(length(trim(title)) between 1 and 160), topic_key text not null check(topic_key ~ '^[a-z][a-z0-9_-]{0,79}$'),
 canonical_question text not null check(length(trim(canonical_question)) between 1 and 2400),
 approved_answer text not null check(length(trim(approved_answer)) between 1 and 6000),
 league_scope text not null check(league_scope in ('all','weekday','saturday','primetime')),
 temporal_scope text not null check(temporal_scope in ('standing','season')),
 season_id uuid references public.seasons(id) on delete restrict, effective_on date not null, expires_on date,
 related_chunk_id uuid references public.ai_document_chunks(id) on delete restrict, related_rule_identity text check(length(related_rule_identity)<=120),
 public_links jsonb not null default '[]' check(jsonb_typeof(public_links)='array' and jsonb_array_length(public_links)<=3),
 content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'), authority_manifest_hash text,
 embedding extensions.vector(1536), embedding_model text, embedding_created_at timestamptz,
 search_vector tsvector generated always as (to_tsvector('english',title||' '||canonical_question||' '||approved_answer)) stored,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by_user_id uuid references auth.users(id) on delete set null, updated_by_user_id uuid references auth.users(id) on delete set null,
 activated_at timestamptz, activated_by_user_id uuid references auth.users(id) on delete set null,
 retired_at timestamptz, retired_by_user_id uuid references auth.users(id) on delete set null,
 retirement_reason text check(length(retirement_reason)<=2000),
 replaced_by_revision_id uuid references public.ai_approved_answer_revisions(id) on delete restrict,
 row_version bigint not null default 1 check(row_version>0),
 unique(answer_id,revision_number), check(expires_on is null or expires_on>effective_on),
 check((temporal_scope='standing' and season_id is null) or (temporal_scope='season' and season_id is not null and expires_on is not null)),
 check((status='draft' and activated_at is null and embedding is null and embedding_model is null and embedding_created_at is null)
   or (status in ('active','retired') and activated_at is not null and embedding is not null and embedding_model='text-embedding-3-small' and embedding_created_at is not null and authority_manifest_hash is not null)),
 check((status='retired')=(retired_at is not null)),
 check(status<>'retired' or length(trim(retirement_reason))>0),
 check(octet_length(jsonb_build_array(title,topic_key,canonical_question,approved_answer,league_scope,temporal_scope,season_id,effective_on,expires_on,related_chunk_id,public_links)::text)<=32768)
);
create unique index if not exists ai_approved_one_active on public.ai_approved_answer_revisions(answer_id) where status='active';
create unique index if not exists ai_approved_one_draft on public.ai_approved_answer_revisions(answer_id) where status='draft';
create index if not exists ai_approved_scope_dates on public.ai_approved_answer_revisions(status,league_scope,effective_on,expires_on);
create table if not exists public.ai_approved_answer_events (
 id uuid primary key default gen_random_uuid(), answer_id uuid not null references public.ai_approved_answers(id) on delete restrict,
 revision_id uuid references public.ai_approved_answer_revisions(id) on delete restrict,
 operation_id uuid not null, event_ordinal smallint not null default 0 check(event_ordinal>=0), request_hash text not null,
 action text not null check(action in ('created','draft_edited','activated','replaced','retired','linked_to_case','linked_to_source')),
 actor_user_id uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 before_state jsonb not null default '{}', after_state jsonb not null default '{}', reason text check(length(reason)<=2000),
 unique(operation_id,event_ordinal),
 check(jsonb_typeof(before_state)='object' and jsonb_typeof(after_state)='object'),
 check(octet_length(jsonb_build_array(before_state,after_state)::text)<=98304)
);
create index if not exists ai_approved_event_history on public.ai_approved_answer_events(answer_id,created_at,id);
alter table public.ai_approved_answers enable row level security;
alter table public.ai_approved_answer_revisions enable row level security;
alter table public.ai_approved_answer_events enable row level security;
revoke all on public.ai_approved_answers,public.ai_approved_answer_revisions,public.ai_approved_answer_events from public,anon,authenticated,service_role;
grant select on public.ai_approved_answers,public.ai_approved_answer_revisions,public.ai_approved_answer_events to service_role;

-- Stable, deterministic manifest of current official authority and searchable text state.
create or replace function public.ai_approved_authority_manifest()
returns text language sql stable security invoker set search_path=pg_catalog as $$
 select encode(sha256(convert_to(coalesce(string_agg(x.identity,'|' order by x.identity),''),'UTF8')),'hex')
 from (
  select 'd:'||d.id::text||':'||d.active_version_id::text||':'||d.updated_at::text||':'||v.updated_at::text as identity
   from public.ai_documents d join public.ai_document_versions v on v.id=d.active_version_id
   where d.status='active' and v.processing_status='ready'
  union all
  select 'c:'||c.id::text||':'||c.updated_at::text||':'||c.is_searchable::text
   from public.ai_document_chunks c join public.ai_documents d on d.active_version_id=c.document_version_id where d.status='active'
 ) x;
$$;

create or replace function public.ai_approved_knowledge_manifest()
returns text language sql stable security invoker set search_path=pg_catalog as $$
 select encode(sha256(convert_to(coalesce(string_agg(id::text||':'||updated_at::text||':'||content_hash,'|' order by id),''),'UTF8')),'hex')
 from public.ai_approved_answer_revisions where status='active';
$$;

-- All mutations serialize in a short bounded transaction; no network/model calls inside it.
create or replace function public.ai_approved_answer_action(p_actor uuid,p_operation uuid,p_action text,p_id uuid,p_expected bigint,p_body jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog set statement_timeout='3s' set lock_timeout='250ms' as $$
declare
 a public.ai_approved_answers; r public.ai_approved_answer_revisions; old_r public.ai_approved_answer_revisions;
 ev public.ai_approved_answer_events; prior jsonb:='{}'; result jsonb; h text; manifest text;
 actor_email text; gid uuid; draft_id uuid; policy_end date; policy_start date;
begin
 select lower(trim(email)) into actor_email from auth.users where id=p_actor;
 if actor_email is null or not exists (
  select 1 from public.members m join public.user_roles ur on ur.member_id=m.id
  where m.email=actor_email and ur.role in ('commissioner','league_manager')
   and (m.is_active_member is distinct from false or not exists(select 1 from public.members m2 where m2.email=actor_email and m2.is_active_member is distinct from false))
 ) then raise exception 'approved_forbidden'; end if;
 if p_operation is null or p_action not in ('create','save','edit','activate','retire') or p_body is null or jsonb_typeof(p_body)<>'object' then raise exception 'approved_request'; end if;
 h:=encode(sha256(convert_to(jsonb_build_array(p_actor,p_action,p_id,p_expected,p_body)::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended('lwr-approved-mutation-v1',0));
 select * into ev from public.ai_approved_answer_events where operation_id=p_operation and event_ordinal=0;
 if found then
  if ev.request_hash<>h then raise exception 'approved_operation_mismatch'; end if;
  return jsonb_build_object('answerId',ev.answer_id,'revisionId',ev.revision_id,'replayed',true);
 end if;
 if p_action='create' then
  select c.group_id into gid from public.ai_manager_review_cases c join public.ai_question_groups g on g.id=c.group_id
   where c.id=p_id and c.status in ('new','reviewing') and g.family='unanswered' and g.merged_into_group_id is null;
  if gid is null then raise exception 'approved_case_not_missing_knowledge'; end if;
  if exists(select 1 from public.ai_approved_answers where source_review_case_id=p_id) then raise exception 'approved_case_already_linked'; end if;
  insert into public.ai_approved_answers(source_review_case_id,created_by_user_id,updated_by_user_id) values(p_id,p_actor,p_actor) returning * into a;
  r.id:=gen_random_uuid();r.answer_id:=a.id;r.revision_number:=1;r.status:='draft';r.row_version:=1;r.created_at:=now();r.created_by_user_id:=p_actor;
 else
  select * into r from public.ai_approved_answer_revisions where id=p_id for update;
  if not found then raise exception 'approved_not_found'; end if;
  select * into a from public.ai_approved_answers where id=r.answer_id for update;
  if r.row_version is distinct from p_expected then raise exception 'approved_stale_revision'; end if;
  prior:=to_jsonb(r)-'embedding'-'search_vector';
 end if;
 if p_action='edit' then
  if r.status not in ('active','retired') then raise exception 'approved_edit_published_only'; end if;
  if exists(select 1 from public.ai_approved_answer_revisions where answer_id=a.id and status='draft') then raise exception 'approved_draft_exists'; end if;
  select coalesce(max(revision_number),0)+1 into r.revision_number from public.ai_approved_answer_revisions where answer_id=a.id;
  r.id:=gen_random_uuid();r.status:='draft';r.embedding:=null;r.embedding_model:=null;r.embedding_created_at:=null;
  r.activated_at:=null;r.activated_by_user_id:=null;r.retired_at:=null;r.retired_by_user_id:=null;r.retirement_reason:=null;r.replaced_by_revision_id:=null;
  r.authority_manifest_hash:=null;r.created_at:=now();r.created_by_user_id:=p_actor;r.row_version:=1;
 end if;
 if p_action in ('create','save') then
  if r.status<>'draft' then raise exception 'approved_published_immutable'; end if;
  r.title:=p_body->>'title';r.topic_key:=p_body->>'topic_key';r.canonical_question:=p_body->>'canonical_question';r.approved_answer:=p_body->>'approved_answer';
  r.league_scope:=p_body->>'league_scope';r.temporal_scope:=p_body->>'temporal_scope';r.season_id:=(p_body->>'season_id')::uuid;
  r.effective_on:=(p_body->>'effective_on')::date;r.expires_on:=(p_body->>'expires_on')::date;r.related_chunk_id:=(p_body->>'related_chunk_id')::uuid;
  r.related_rule_identity:=null;r.public_links:=coalesce(p_body->'public_links','[]'::jsonb);r.content_hash:=p_body->>'content_hash';
 end if;
 if p_action='activate' then
  if r.status<>'draft' or p_body->>'content_hash' is distinct from r.content_hash then raise exception 'approved_activation_state'; end if;
  -- SHARE locks prevent a concurrent document/metadata promotion between manifest check and commit.
  lock table public.ai_documents,public.ai_document_versions,public.ai_document_chunks in share mode;
  manifest:=public.ai_approved_authority_manifest();
  if p_body->>'managed_manifest_hash' is distinct from public.ai_approved_knowledge_manifest() then raise exception 'approved_overlap_review_stale'; end if;
  if p_body->>'authority_manifest_hash' is distinct from manifest or (p_body->>'preflight_expires_at')::timestamptz<=now() or p_body->>'preflight_expires_at' is null then raise exception 'approved_preflight_stale'; end if;
  if r.expires_on is not null and r.expires_on<=(now() at time zone 'America/New_York')::date then raise exception 'approved_expired'; end if;
  if r.temporal_scope='season' then
   select start_date,end_date into policy_start,policy_end from public.seasons where id=r.season_id;
   if policy_start is null or policy_end is null or r.effective_on<policy_start or r.expires_on>policy_end+1 then raise exception 'approved_season_dates'; end if;
  end if;
  if r.related_chunk_id is not null and not exists(select 1 from public.ai_document_chunks c join public.ai_documents d on d.active_version_id=c.document_version_id where c.id=r.related_chunk_id and c.is_searchable and d.status='active') then raise exception 'approved_related_source_stale'; end if;
  if exists(select 1 from public.ai_approved_answer_revisions v where v.status='active' and v.answer_id<>r.answer_id and v.topic_key=r.topic_key
   and (v.league_scope='all' or r.league_scope='all' or v.league_scope=r.league_scope)
   and (v.temporal_scope='standing' or r.temporal_scope='standing' or v.season_id=r.season_id)
   and v.effective_on<coalesce(r.expires_on,'infinity'::date) and r.effective_on<coalesce(v.expires_on,'infinity'::date)) then raise exception 'approved_policy_overlap'; end if;
  r.embedding:=(p_body->>'embedding')::extensions.vector;r.embedding_model:=p_body->>'embedding_model';r.embedding_created_at:=now();
  if r.embedding is null or extensions.vector_norm(r.embedding)=0 then raise exception 'approved_embedding_invalid'; end if;
  r.authority_manifest_hash:=manifest;r.related_rule_identity:=p_body->>'related_rule_identity';
  select * into old_r from public.ai_approved_answer_revisions where answer_id=a.id and status='active' for update;
  if found then
   update public.ai_approved_answer_revisions set status='retired',retired_at=now(),retired_by_user_id=p_actor,retirement_reason='Replaced by revision '||r.revision_number, replaced_by_revision_id=r.id,updated_at=now(),updated_by_user_id=p_actor,row_version=row_version+1 where id=old_r.id;
   insert into public.ai_approved_answer_events(answer_id,revision_id,operation_id,event_ordinal,request_hash,action,actor_user_id,before_state,after_state)
    values(a.id,old_r.id,p_operation,1,h,'replaced',p_actor,to_jsonb(old_r)-'embedding'-'search_vector',jsonb_build_object('status','retired','replacement_revision_id',r.id));
  end if;
  r.status:='active';r.activated_at:=now();r.activated_by_user_id:=p_actor;
 elsif p_action='retire' then
  if r.status<>'active' or length(trim(coalesce(p_body->>'reason',''))) not between 1 and 2000 then raise exception 'approved_retirement_reason'; end if;
  r.status:='retired';r.retired_at:=now();r.retired_by_user_id:=p_actor;r.retirement_reason:=p_body->>'reason';
 end if;
 r.updated_at:=now();r.updated_by_user_id:=p_actor;
 if p_action in ('create','edit') then
  insert into public.ai_approved_answer_revisions(id,answer_id,revision_number,status,title,topic_key,canonical_question,approved_answer,league_scope,temporal_scope,season_id,effective_on,expires_on,related_chunk_id,public_links,content_hash,created_at,updated_at,created_by_user_id,updated_by_user_id,row_version)
   values(r.id,r.answer_id,r.revision_number,r.status,r.title,r.topic_key,r.canonical_question,r.approved_answer,r.league_scope,r.temporal_scope,r.season_id,r.effective_on,r.expires_on,r.related_chunk_id,r.public_links,r.content_hash,r.created_at,r.updated_at,r.created_by_user_id,r.updated_by_user_id,r.row_version);
 else
  update public.ai_approved_answer_revisions set title=r.title,topic_key=r.topic_key,canonical_question=r.canonical_question,approved_answer=r.approved_answer,
   league_scope=r.league_scope,temporal_scope=r.temporal_scope,season_id=r.season_id,effective_on=r.effective_on,expires_on=r.expires_on,related_chunk_id=r.related_chunk_id,related_rule_identity=r.related_rule_identity,
   public_links=r.public_links,content_hash=r.content_hash,status=r.status,embedding=r.embedding,embedding_model=r.embedding_model,embedding_created_at=r.embedding_created_at,
   authority_manifest_hash=r.authority_manifest_hash,activated_at=r.activated_at,activated_by_user_id=r.activated_by_user_id,retired_at=r.retired_at,retired_by_user_id=r.retired_by_user_id,retirement_reason=r.retirement_reason,
   updated_at=r.updated_at,updated_by_user_id=p_actor,row_version=row_version+1 where id=r.id;
 end if;
 update public.ai_approved_answers set updated_at=now(),updated_by_user_id=p_actor,row_version=row_version+1 where id=a.id;
 select to_jsonb(v)-'embedding'-'search_vector' into result from public.ai_approved_answer_revisions v where id=r.id;
 insert into public.ai_approved_answer_events(answer_id,revision_id,operation_id,request_hash,action,actor_user_id,before_state,after_state,reason)
  values(a.id,r.id,p_operation,h,case p_action when 'create' then 'created' when 'activate' then 'activated' when 'retire' then 'retired' else 'draft_edited' end,p_actor,prior,result,p_body->>'reason');
 if p_action='create' then
  insert into public.ai_approved_answer_events(answer_id,revision_id,operation_id,event_ordinal,request_hash,action,actor_user_id,after_state)
   values(a.id,r.id,p_operation,1,h,'linked_to_case',p_actor,jsonb_build_object('case_id',a.source_review_case_id));
 end if;
 return jsonb_build_object('answerId',a.id,'revisionId',r.id,'replayed',false);
end $$;
create or replace function public.search_ai_approved_answers(p_embedding extensions.vector(1536),p_question text)
returns table(revision jsonb,semantic_score double precision,lexical_score real,manifest text,resolved_season_id uuid)
language sql stable security invoker set search_path=pg_catalog set statement_timeout='450ms' as $$
 select to_jsonb(r)-'embedding'-'search_vector',1-(r.embedding operator(extensions.<=>) p_embedding),
  ts_rank_cd(r.search_vector,plainto_tsquery('english',left(p_question,2400))),public.ai_approved_authority_manifest(),
  (select case when count(*)=1 then (array_agg(s.id))[1] end from public.seasons s where
    lower(p_question) like '%'||lower(s.name)||'%' or (not exists(select 1 from public.seasons named where lower(p_question) like '%'||lower(named.name)||'%') and s.start_date<=(now() at time zone 'America/New_York')::date and s.end_date>=(now() at time zone 'America/New_York')::date))
 from public.ai_approved_answer_revisions r where r.status='active'
 order by r.embedding operator(extensions.<=>) p_embedding,r.id limit 4;
$$;
-- Manager-only independent source review; does not call or change the player Stage 3 RPC.
create or replace function public.ai_approved_source_review(p_terms text[])
returns table(chunk_id uuid,document_id uuid,document_version_id uuid,document_title text,document_type text,content text,page_number integer,rule_number text,heading text,matches bigint)
language sql stable security invoker set search_path=pg_catalog set statement_timeout='2s' as $$
 select c.id,d.id,v.id,d.title,d.document_type,c.content,c.page_number,c.rule_number,c.heading,
  (select count(*) from unnest(p_terms[1:12]) term where length(term) between 2 and 40 and term ~ '^[a-z0-9]+$' and lower(c.content) like '%'||term||'%') as matches
 from public.ai_documents d join public.ai_document_versions v on v.id=d.active_version_id join public.ai_document_chunks c on c.document_version_id=v.id
 where d.status='active' and v.processing_status='ready' and c.is_searchable and d.document_type<>'usap_rulebook'
  and exists(select 1 from unnest(p_terms[1:12]) term where length(term) between 2 and 40 and term ~ '^[a-z0-9]+$' and lower(c.content) like '%'||term||'%')
 order by matches desc,d.authority_rank,c.id limit 24;
$$;
revoke all on function public.ai_approved_knowledge_manifest(),public.ai_approved_authority_manifest(),public.ai_approved_answer_action(uuid,uuid,text,uuid,bigint,jsonb),public.search_ai_approved_answers(extensions.vector,text),public.ai_approved_source_review(text[]) from public,anon,authenticated,service_role;
grant execute on function public.ai_approved_knowledge_manifest(),public.ai_approved_authority_manifest(),public.ai_approved_answer_action(uuid,uuid,text,uuid,bigint,jsonb),public.search_ai_approved_answers(extensions.vector,text),public.ai_approved_source_review(text[]) to service_role;

do $$ begin if to_regprocedure('public.ai_review_case_action(uuid,uuid,uuid,integer,text,text,text,timestamptz)') is null then raise exception 'approved_requires_stage7b'; end if; end $$;
-- Approved category compatibility only. Existing function ACLs remain unchanged.
alter table public.ai_manager_review_cases drop constraint ai_manager_review_cases_action_category_check;
alter table public.ai_manager_review_cases add constraint ai_manager_review_cases_action_category_check check(action_category in ('unclassified','lwr_rule_update','lwr_guide_update','dates_source_update','ai_retrieval_selection','clarification_wording','usap_no_lwr_change','future_live_lms','not_a_problem','other','approved_lwr_answer'));
create or replace function public.ai_review_case_action(
 p_case uuid, p_actor uuid, p_operation uuid, p_revision integer,
 p_action text, p_value text, p_note text, p_cutoff timestamptz
) returns jsonb language plpgsql security invoker
set search_path=pg_catalog,public set statement_timeout='3s' set lock_timeout='250ms' as $$
declare
 c public.ai_manager_review_cases; e public.ai_manager_review_events;
 before_value jsonb; after_value jsonb; event_action text; stamp timestamptz:=clock_timestamp();
begin
 if current_user not in ('service_role','postgres') then raise exception 'review_forbidden'; end if;
 if p_actor is null or p_operation is null or p_revision is null or p_revision<1
    or p_action is null or p_action not in ('status','category','priority','note','review')
    or (p_action in ('note','review') and p_value is not null)
    or length(coalesce(p_note,''))>4000 or length(coalesce(p_value,''))>80
 then raise exception 'review_invalid'; end if;
 -- One logical retry cannot target two cases concurrently.
 perform pg_advisory_xact_lock(hashtextextended('review-operation:'||p_operation::text,0));
 -- Match capture's group -> case order, including the audit insert's FK locks.
 -- Otherwise capture and review could each wait for the other's row lock.
 perform 1 from public.ai_question_groups where id=(select group_id from public.ai_manager_review_cases where id=p_case) for update;
 select * into c from public.ai_manager_review_cases where id=p_case for update;
 if not found then raise exception 'review_not_found'; end if;
 event_action:=case p_action when 'status' then 'status_changed' when 'category' then 'category_changed'
   when 'priority' then 'priority_changed' when 'note' then 'note_added' else 'review_completed' end;
 select * into e from public.ai_manager_review_events where operation_id=p_operation and event_ordinal=0;
 if found then
  if e.case_id is distinct from p_case or e.actor_user_id is distinct from p_actor or e.actor_kind<>'manager'
    or e.action<>event_action or (e.before_state->>'revision')::integer<>p_revision
    or e.note is distinct from nullif(trim(p_note),'')
    or (p_action='status' and e.after_state->>'status' is distinct from p_value)
    or (p_action='category' and e.after_state->>'action_category' is distinct from p_value)
    or (p_action='priority' and e.after_state->>'priority' is distinct from p_value)
    or (p_action in ('status','review') and (e.after_state->>'reviewed_through_at')::timestamptz is distinct from p_cutoff)
  then raise exception 'review_retry_mismatch'; end if;
  return jsonb_build_object('revision',e.after_state->'revision','replayed',true);
 end if;
 if c.revision<>p_revision then raise exception 'review_revision_conflict'; end if;
 if p_action in ('status','review') and (p_cutoff is null or p_cutoff>stamp or p_cutoff<c.created_at
    or p_cutoff<coalesce(c.reviewed_through_at,c.created_at)) then raise exception 'review_invalid_cutoff'; end if;
 if p_action in ('note','review') and p_value is not null then raise exception 'review_invalid'; end if;
 before_value:=jsonb_build_object('status',c.status,'action_category',c.action_category,'priority',c.priority,
   'revision',c.revision,'reviewed_through_at',c.reviewed_through_at,'closed_at',c.closed_at,
   'resolved_at',c.resolved_at,'resolution_summary',c.resolution_summary);
 if p_action='status' then
  if p_value is null or not ((c.status='new' and p_value in ('reviewing','resolved','dismissed'))
     or (c.status='reviewing' and p_value in ('new','resolved','dismissed'))
     or (c.status in ('resolved','dismissed') and p_value='reviewing')) then raise exception 'review_transition'; end if;
  if (p_value in ('new','resolved','dismissed') or c.status in ('resolved','dismissed'))
      and length(trim(coalesce(p_note,'')))=0 then raise exception 'review_reason_required'; end if;
  if p_value in ('resolved','dismissed') and length(trim(p_note))>2000 then raise exception 'review_summary_size'; end if;
  c.status:=p_value; c.closed_at:=case when p_value in ('resolved','dismissed') then stamp end;
  c.resolved_at:=case when p_value='resolved' then stamp end;
  c.resolution_summary:=case when p_value in ('resolved','dismissed') then trim(p_note) end;
 elsif p_action='category' then
  if p_value is null or p_value not in ('unclassified','lwr_rule_update','lwr_guide_update','dates_source_update',
    'ai_retrieval_selection','clarification_wording','usap_no_lwr_change','future_live_lms','not_a_problem','other','approved_lwr_answer')
    then raise exception 'review_category'; end if;
  if p_value='other' and length(trim(coalesce(p_note,'')))=0 then raise exception 'review_reason_required'; end if;
  c.action_category:=p_value;
 elsif p_action='priority' then
  if p_value is null or p_value not in ('normal','high') then raise exception 'review_priority'; end if;
  c.priority:=p_value;
 elsif p_action='note' and length(trim(coalesce(p_note,'')))=0 then raise exception 'review_reason_required';
 end if;
 if p_action in ('status','review') then
  c.reviewed_by:=p_actor; c.reviewed_at:=stamp; c.reviewed_through_at:=p_cutoff;
 end if;
 c.revision:=c.revision+1;
 update public.ai_manager_review_cases set status=c.status,action_category=c.action_category,priority=c.priority,
   closed_at=c.closed_at,resolved_at=c.resolved_at,resolution_summary=c.resolution_summary,
   reviewed_by=c.reviewed_by,reviewed_at=c.reviewed_at,reviewed_through_at=c.reviewed_through_at,
   revision=c.revision,updated_at=stamp where id=p_case;
 after_value:=jsonb_build_object('status',c.status,'action_category',c.action_category,'priority',c.priority,
   'revision',c.revision,'reviewed_through_at',c.reviewed_through_at,'closed_at',c.closed_at,
   'resolved_at',c.resolved_at,'resolution_summary',c.resolution_summary);
 insert into public.ai_manager_review_events(operation_id,group_id,case_id,actor_user_id,actor_kind,action,before_state,after_state,note)
 values(p_operation,c.group_id,c.id,p_actor,'manager',event_action,before_value,after_value,nullif(trim(p_note),''));
 return jsonb_build_object('revision',c.revision,'replayed',false);
end $$;
commit;
