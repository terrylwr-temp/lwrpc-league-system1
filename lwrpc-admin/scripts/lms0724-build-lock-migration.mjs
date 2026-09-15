// Local artifact construction only. Never connects to a database.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const original=await readFile(new URL('supabase/migrations/20260907201448_lms0724_view_as.sql',root),'utf8');
const helper=await readFile(new URL('scripts/lms0724-lock-correction-source.sql',root),'utf8');
const md5=s=>createHash('md5').update(s).digest('hex');
const lookup=original.match(/create or replace function view_as_private\.lookup[\s\S]*?end \$\$;/)[0];
const before=lookup.split('as $$')[1].split('$$;')[0];
let after=before;
const replace=(old,next)=>{if(!after.includes(old))throw Error('Lookup source mismatch: '+old);after=after.replace(old,next);};
replace('v_result jsonb;',"v_proof jsonb:=p_query->'_view_proof'; v_result jsonb;");
replace(' if p_actor is null then',` p_query:=p_query-'_view_proof';
 if v_proof is null or (v_proof->>'actor')::uuid is distinct from p_actor
 or (v_proof->>'id')::uuid is distinct from p_context
 or (v_proof->>'target')::uuid is distinct from p_member
 or not view_as_private.lock_authorization(v_proof,'identity') then return jsonb_build_object('status','denied');end if;
 if p_actor is null then`);
replace('limit 1 for share of u,m;', 'limit 1;');
replace(' perform 1 from public.members where id=v_target and is_active_member is true for share;\n if not found then'," if not view_as_private.lock_authorization(v_proof,'subject',v_target) then");
const relationStart=after.indexOf(" if v_target<>v_member and v_role not in ('league_manager','commissioner') then");
const relationEnd=after.indexOf(" if v_intent in ('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT')",relationStart);
after=after.slice(0,relationStart)+after.slice(relationEnd); // same relation locked/rechecked inside subject helper
replace('  perform 1 from public.seasons where id=v_season and is_active is true for share;\n  if not found then',"  if not view_as_private.lock_authorization(v_proof,'season',v_target,null,v_season) then");
replace('  select t.name as team,d.name as division,l.name as league,s.name as season into v_context',"  if not view_as_private.lock_authorization(v_proof,'team',v_target,v_team) then return jsonb_build_object('status','denied');end if;\n  select t.name as team,d.name as division,l.name as league,s.name as season into v_context");
replace(')) for share of t,d,l,s;', '));');
replace('  perform 1 from public.team_members where team_id=v_team and member_id=v_member and is_active is true for share;\n  if not found and',"  if not view_as_private.lock_authorization(v_proof,'membership',v_member,v_team) and");
replace('   perform 1 from public.team_members where team_id=v_team and member_id=v_target and is_active is true for share;\n   if not found then',"   if not view_as_private.lock_authorization(v_proof,'membership',v_target,v_team) then");
if(/for share/i.test(after))throw Error('Unconverted lock');
const dispatchBefore=original.split('expected_source text := $view_as_source$')[1].split('$view_as_source$;')[0];
let dispatchAfter=dispatchBefore.replace(' perform 1 from public.user_roles u join public.members m on m.id=u.member_id where u.user_id=c.actor or u.member_id=c.target for share of u,m;'," if not view_as_private.lock_authorization(p_input,'identity') then return jsonb_build_object('denied',true);end if;");
dispatchAfter=dispatchAfter.replace("p_input->'query');", "(p_input->'query')||jsonb_build_object('_view_proof',(p_input-'query')||jsonb_build_object('target',c.target,'intent',p_input->'query'->>'intent')));");
if(dispatchAfter===dispatchBefore)throw Error('Dispatcher mismatch');
const helperBody=helper.split('as $$')[1].split('$$;')[0];
const guard=`do $guard$ declare p pg_catalog.pg_proc; sig text; allowed oid[];begin
 select * into p from pg_catalog.pg_proc where oid='public.lms_view_as(text,jsonb)'::regprocedure;
 if pg_catalog.md5(p.prosrc) not in('${md5(dispatchBefore)}','${md5(dispatchAfter)}') or p.proowner<>'lms_view_as_executor'::regrole or not p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'View-As dispatcher drift';end if;
 select * into p from pg_catalog.pg_proc where oid='view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)'::regprocedure;
 if pg_catalog.md5(p.prosrc) not in('${md5(before)}','${md5(after)}') or p.proowner<>current_user::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""'] then raise exception 'View-As lookup drift';end if;
 select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid)');
 if found and (p.proowner<>current_user::regrole or not p.prosecdef or pg_catalog.md5(p.prosrc)<>'${md5(helperBody)}' or p.proconfig is distinct from array['search_path=""']) then raise exception 'View-As lock helper collision/drift';end if;
 foreach sig in array array['public.lms_view_as(text,jsonb)','view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)','view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid)'] loop
  select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(sig);
  if found then
   allowed:=array[p.proowner,case when sig='public.lms_view_as(text,jsonb)' then 'service_role'::regrole::oid else 'lms_view_as_executor'::regrole::oid end];
   if exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where not(a.grantee=any(allowed)) or a.is_grantable) then raise exception 'View-As function ACL drift: %',sig;end if;
  end if;
 end loop;
end $guard$;`;
const output=`-- LMS-0724 / 0.1.546: bounded authorization-row locks. LOCAL REVIEW ONLY.
-- Original migration is immutable. No data DML, public RLS policy changes or Auth access.
begin;
${guard}
${helper}
${lookup.replace(before,()=>after)}
-- Retain original invoker/owner/ACL; no public helper or signature added.
grant create on schema public to lms_view_as_executor;
select pg_catalog.set_config('lms0724.migration_operator',current_user,true);
set local role lms_view_as_executor;
create or replace function public.lms_view_as(p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $corrected$${dispatchAfter}$corrected$;
select pg_catalog.set_config('role',pg_catalog.current_setting('lms0724.migration_operator'),true);
revoke create on schema public from lms_view_as_executor;
-- Locking moved behind context proof; remove every former operational UPDATE grant.
revoke update(id) on public.members,public.seasons,public.leagues,public.divisions,public.teams from lms_view_as_executor;
revoke update(member_id) on public.user_roles,public.team_members from lms_view_as_executor;
commit;
`;
await writeFile(new URL('supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql',root),output);
const rollback=`-- REVIEW-ONLY rollback: restores the known-denying prior behavior. Never auto-run.
begin;
do $$begin
 if (select md5(prosrc) from pg_proc where oid='public.lms_view_as(text,jsonb)'::regprocedure)<>'${md5(dispatchAfter)}' then raise exception 'Unexpected dispatcher: stop rollback';end if;
end $$;
${lookup}
grant create on schema public to lms_view_as_executor;
select pg_catalog.set_config('lms0724.migration_operator',current_user,true);
set local role lms_view_as_executor;
create or replace function public.lms_view_as(p_op text,p_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $prior$${dispatchBefore}$prior$;
select pg_catalog.set_config('role',pg_catalog.current_setting('lms0724.migration_operator'),true);
revoke create on schema public from lms_view_as_executor;
grant update(id) on public.members,public.seasons,public.leagues,public.divisions,public.teams to lms_view_as_executor;
grant update(member_id) on public.user_roles,public.team_members to lms_view_as_executor;
drop function view_as_private.lock_authorization(jsonb,text,uuid,uuid,uuid);
commit;
`;
await writeFile(new URL('../docs/lms-0724-lock-correction-rollback.sql',root),rollback);
console.log(JSON.stringify({lookupBefore:md5(before),lookupAfter:md5(after),dispatcherBefore:md5(dispatchBefore),dispatcherAfter:md5(dispatchAfter)}));

