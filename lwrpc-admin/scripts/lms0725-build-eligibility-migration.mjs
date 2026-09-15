import fs from 'node:fs';import {createHash} from 'node:crypto';
const file='supabase/migrations/20260908203904_lms0725_eligibility_self.sql';
const source=fs.readFileSync('supabase/migrations/20260908114532_lms0725_clarification_choices.sql','utf8').replaceAll('\r\n','\n');
const defs=[...source.matchAll(/create or replace function (?:ai_live_private|view_as_private)\.lookup[\s\S]*?end \$\$;/g)].map(m=>m[0]);if(defs.length!==2)throw Error('Expected two definitions');
const hash=s=>createHash('md5').update(s).digest('hex'),body=s=>s.split('as $$')[1].split('$$;')[0];let sql='-- LMS-0725 / 0.1.547. LOCAL REVIEW ONLY.\nbegin;\n',rollback='-- Review only. Preserve eligibility audit history and its allowlist.\nbegin;\n';
for(const old of defs){const view=old.includes('view_as_private.lookup'),sig=view?'view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)':'ai_live_private.lookup(uuid,uuid,jsonb)',grant=view?'lms_view_as_executor':'service_role';
const recurse=view?`view_as_private.lookup(p_actor,p_member,p_context,p_request,jsonb_set(jsonb_set(p_query,'{intent}','"SELF_RATING"'::jsonb),'{_view_proof,intent}','"SELF_RATING"'::jsonb))`:`ai_live_private.lookup(p_actor,p_request,jsonb_set(p_query,'{intent}','"SELF_RATING"'::jsonb))`;
const branch=`
 if p_query->>'intent'='ELIGIBILITY_SELF' then
  if p_query->>'subjectKind' is distinct from 'SELF' or p_query->>'rating' is null or p_query->>'rating' not in ('season','primetime')
   or exists(select 1 from pg_catalog.jsonb_object_keys(p_query) k where k not in ('intent','origin','rating','season','subjectKind'${view?",'_view_proof'":''})) then return jsonb_build_object('status','denied');end if;
  v_eligibility_snapshot:=${recurse};
  if v_eligibility_snapshot->>'status' not in ('success','missing') then return jsonb_build_object('status',v_eligibility_snapshot->>'status','choiceKind',v_eligibility_snapshot->>'choiceKind','choices',v_eligibility_snapshot->'choices');end if;
  ${view?"if (v_eligibility_snapshot->>'subject')::uuid is distinct from p_member then return jsonb_build_object('status','denied');end if;":''}
  select jsonb_build_object('sourceIsNr',case when upper(trim(r.dupr_doubles_rating))='NR' then true when trim(r.dupr_doubles_rating) ~ '^[0-9]+([.][0-9]+)?$' then false else null end,'rf',r.dupr_reliability_rating,'value',case when p_query->>'rating'='primetime' then r.season_primetime_rating else r.season_dupr_rating end) into v_eligibility_inputs from public.member_season_ratings r where r.member_id=(v_eligibility_snapshot->>'subject')::uuid and r.season_id=(v_eligibility_snapshot->>'seasonRef')::uuid;
  ${view?"insert into view_as_private.audit_events(context_id,actor,effective_member,subject,event,capability,reason) values(p_context,p_actor,p_member,p_member,'SENSITIVE_READ','ELIGIBILITY_SELF',v_eligibility_snapshot->>'status');":"insert into ai_live_private.access_audit(actor,target,request_id,intent,decision) values(p_actor,(v_eligibility_snapshot->>'subject')::uuid,p_request,'ELIGIBILITY_SELF',v_eligibility_snapshot->>'status');"}
  return jsonb_build_object('status',v_eligibility_snapshot->>'status','season',v_eligibility_snapshot->>'season','seasonRef',v_eligibility_snapshot->>'seasonRef','rating',p_query->>'rating')||coalesce(v_eligibility_inputs,jsonb_build_object('sourceIsNr',null,'rf',null,'value',null));
 end if;
`;
const next=old.replace('begin\n',()=>'v_eligibility_snapshot jsonb;v_eligibility_inputs jsonb;\nbegin\n'+branch);
sql+=`do $guard$ declare p pg_catalog.pg_proc;begin
 select * into p from pg_catalog.pg_proc where oid='${sig}'::regprocedure;
 if pg_catalog.md5(p.prosrc) not in ('${hash(body(old))}','${hash(body(old).replaceAll('\n','\r\n'))}','${hash(body(next))}') or p.proowner<>current_user::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'Eligibility lookup drift';end if;
 if exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee not in(p.proowner,'${grant}'::regrole::oid) or a.is_grantable) then raise exception 'Eligibility ACL drift';end if;
 end $guard$;
${next}
revoke all on function ${sig} from public,anon,authenticated;
grant execute on function ${sig} to ${grant};
`;
rollback+=`do $guard$ begin if (select pg_catalog.md5(prosrc) from pg_catalog.pg_proc where oid='${sig}'::regprocedure)<>'${hash(body(next))}' then raise exception 'Eligibility rollback drift';end if;end $guard$;\n${old}\n`;
}
const wrapper=fs.readFileSync('supabase/migrations/20260907131012_lms0723_server_session_validation.sql','utf8').replaceAll('\r\n','\n').match(/create or replace function public\.ai_live_lookup\(p_actor[\s\S]*?end \$\$;/)[0];
const nextWrapper=wrapper.replace("('PLAYER_CONTACT','PLAYER_RATING','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH')","('PLAYER_CONTACT','PLAYER_RATING','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH','ELIGIBILITY_SELF')");
sql+=`do $guard$ declare p pg_catalog.pg_proc;begin select * into p from pg_catalog.pg_proc where oid='public.ai_live_lookup(uuid,uuid,jsonb)'::regprocedure;
 if pg_catalog.md5(p.prosrc) not in ('${hash(body(wrapper))}','${hash(body(wrapper).replaceAll('\n','\r\n'))}','${hash(body(nextWrapper))}') or p.proowner<>current_user::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'Eligibility wrapper drift';end if;
 if exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee not in(p.proowner,'service_role'::regrole::oid) or a.is_grantable) then raise exception 'Eligibility wrapper ACL drift';end if;end $guard$;
${nextWrapper}
revoke all on function public.ai_live_lookup(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ai_live_lookup(uuid,uuid,jsonb) to service_role;
`;
rollback+=`do $guard$ begin if (select pg_catalog.md5(prosrc) from pg_catalog.pg_proc where oid='public.ai_live_lookup(uuid,uuid,jsonb)'::regprocedure)<>'${hash(body(nextWrapper))}' then raise exception 'Eligibility wrapper rollback drift';end if;end $guard$;\n`+wrapper+'\nrevoke select(dupr_reliability_rating,dupr_doubles_rating) on public.member_season_ratings from lms_view_as_executor;\n';
const constraintBefore="CHECK ((intent = ANY (ARRAY['PLAYER_CONTACT'::text, 'PLAYER_RATING'::text, 'SELF_TEAM'::text, 'TEAM_ROSTER'::text, 'NEXT_MATCH'::text])))";
const constraintAfter=constraintBefore.replace("'NEXT_MATCH'::text", "'NEXT_MATCH'::text, 'ELIGIBILITY_SELF'::text");
sql+=`do $guard$ declare definition text;begin select pg_catalog.pg_get_constraintdef(oid) into definition from pg_catalog.pg_constraint where conrelid='ai_live_private.access_audit'::regclass and conname='access_audit_intent_check' and convalidated and contype='c';
if definition is null or pg_catalog.md5(definition) not in ('${hash(constraintBefore)}','${hash(constraintAfter)}') then raise exception 'Eligibility audit constraint drift';end if;end $guard$;\n`;
sql+=`grant select(dupr_reliability_rating,dupr_doubles_rating) on public.member_season_ratings to lms_view_as_executor;
alter table ai_live_private.access_audit drop constraint if exists access_audit_intent_check;
alter table ai_live_private.access_audit add constraint access_audit_intent_check check(intent in ('PLAYER_CONTACT','PLAYER_RATING','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH','ELIGIBILITY_SELF'));
commit;\n`;
fs.writeFileSync(file,sql);fs.writeFileSync('../docs/lms-0725-eligibility-rollback.sql',rollback+'commit;\n');console.log(JSON.stringify({file,sha256:createHash('sha256').update(sql).digest('hex')}));