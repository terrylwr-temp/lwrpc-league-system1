-- LMS-0721 / 0.1.543 bounded correction. Local only; production application requires review.
begin;
-- Preserve the existing FK and UNIQUE (NULLs distinct) constraint.
alter table public.ai_approved_answers alter column source_review_case_id drop not null;

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
  -- NULL explicitly selects manager origin; non-NULL keeps every existing case gate.
  if p_id is not null then
  select c.group_id into gid from public.ai_manager_review_cases c join public.ai_question_groups g on g.id=c.group_id
   where c.id=p_id and c.status in ('new','reviewing') and g.family='unanswered' and g.merged_into_group_id is null;
  if gid is null then raise exception 'approved_case_not_missing_knowledge'; end if;
  if exists(select 1 from public.ai_approved_answers where source_review_case_id=p_id) then raise exception 'approved_case_already_linked'; end if;
  end if;
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
 if p_action='create' and a.source_review_case_id is not null then
  insert into public.ai_approved_answer_events(answer_id,revision_id,operation_id,event_ordinal,request_hash,action,actor_user_id,after_state)
   values(a.id,r.id,p_operation,1,h,'linked_to_case',p_actor,jsonb_build_object('case_id',a.source_review_case_id));
 end if;
 return jsonb_build_object('answerId',a.id,'revisionId',r.id,'replayed',false);
end $$;

-- Re-establish service-only execution even under production default grants.
revoke all on function public.ai_approved_answer_action(uuid,uuid,text,uuid,bigint,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.ai_approved_answer_action(uuid,uuid,text,uuid,bigint,jsonb) to service_role;
commit;
