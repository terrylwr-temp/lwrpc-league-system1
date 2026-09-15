import fs from 'node:fs';
import {createHash} from 'node:crypto';
const root='../docs/';
const evidence=JSON.parse(fs.readFileSync(root+'lms-0729-read-only-design-evidence.json','utf8'));
const normal=evidence.liveFunctions.find(f=>f.proname==='lookup').definition.trim()+';';
const feedback=evidence.liveFunctions.find(f=>f.proname==='ai_live_feedback').definition.trim()+';';
const viewSource=fs.readFileSync('supabase/migrations/20260909202216_lms0728_implicit_player.sql','utf8').replaceAll('\r\n','\n');
const start=viewSource.indexOf('create or replace function view_as_private.lookup(');
const view=viewSource.slice(start,viewSource.indexOf('$$;',start)+3);
function replace(s,from,to){if(!s.includes(from))throw Error('Source drift: '+from.slice(0,100));return s.replace(from,to);}
const join="select u.member_id,u.role into v_member,v_role from public.user_roles u join public.members m on m.id=u.member_id\n where u.user_id=p_actor and m.is_active_member is true and u.role in ('player','captain','club_pro','league_manager','commissioner') for share of u,m;";
let n=replace(normal,join,"select (x->>'memberId')::uuid,x->>'role' into v_member,v_role from (select ai_live_private.resolve_identity(p_actor) x) resolved;");
n=replace(n,"'TEAM_ROSTER','NEXT_MATCH') then return jsonb_build_object('status','unsupported');","'TEAM_ROSTER','NEXT_MATCH','TEAM_RECORD') then return jsonb_build_object('status','unsupported');");
n=replace(n," insert into ai_live_private.attempts(actor,contact) values(p_actor,v_intent='PLAYER_CONTACT');"," insert into ai_live_private.attempts(actor,contact) values(p_actor,v_intent='PLAYER_CONTACT');\n if v_intent='TEAM_RECORD' then return lms_read_private.team_record(v_member,v_role,p_query);end if;");
// SELF guard in the unchanged normal body treats SELF as member-scoped but does not disclose it.
let v=replace(view,"'TEAM_ROSTER','NEXT_MATCH') then return jsonb_build_object('status','unsupported');","'TEAM_ROSTER','NEXT_MATCH','TEAM_RECORD') then return jsonb_build_object('status','unsupported');");
v=replace(v," if v_member is null then return jsonb_build_object('status','denied'); end if;"," if v_member is null then return jsonb_build_object('status','denied'); end if;\n if v_intent='TEAM_RECORD' then return lms_read_private.team_record(v_member,v_role,p_query);end if;");
let f=replace(feedback,"p_actor is null or not exists(select 1 from public.user_roles u join public.members m on m.id=u.member_id where u.user_id=p_actor and m.is_active_member is true)","ai_live_private.resolve_identity(p_actor) is null");
f=replace(f,"p_helpful,'LMS-0723'","p_helpful,'LMS-0729'");
const body=s=>{const tag=s.match(/as (\$\w*\$)/i)[1];return s.slice(s.indexOf(tag)+tag.length,s.lastIndexOf(tag));};
const hash=s=>createHash('md5').update(body(s)).digest('hex');
const pairs=[[normal,n,'ai_live_private.lookup(uuid,uuid,jsonb)','service_role'],[feedback,f,'public.ai_live_feedback(uuid,uuid,boolean,jsonb)','service_role'],[view,v,'view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)','lms_view_as_executor']];
const guards=pairs.map(([a,b,sig,role])=>`do $guard$ declare p pg_catalog.pg_proc;begin select * into p from pg_catalog.pg_proc where oid=to_regprocedure('${sig}');if not found or p.proowner<>'postgres'::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""'] or md5(p.prosrc) not in('${hash(a)}','${hash(b)}') then raise exception 'LMS-0729 function drift ${sig}';end if;if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee not in(p.proowner,'${role}'::regrole::oid) or a.is_grantable) or not has_function_privilege('${role}',p.oid,'EXECUTE') then raise exception 'LMS-0729 ACL drift';end if;end $guard$;`).join('\n');
const readerGuard = `do $guard$ begin
 if not exists(select 1 from pg_roles where rolname='lms_view_as_reader' and not rolsuper and not rolinherit and not rolcreaterole and not rolcreatedb and not rolcanlogin and not rolreplication and not rolbypassrls) then raise exception 'LMS-0729 reader role drift';end if;
 if exists(select 1 from pg_auth_members where member='lms_view_as_reader'::regrole) or exists(select 1 from pg_auth_members where roleid='lms_view_as_reader'::regrole and member<>'postgres'::regrole) then raise exception 'LMS-0729 reader membership drift';end if;
 if has_schema_privilege('anon','lms_read_private','USAGE') or has_schema_privilege('authenticated','lms_read_private','USAGE') then raise exception 'LMS-0729 browser schema drift';end if;
end $guard$;`;
const helpers=['identity','record'].map(x=>fs.readFileSync('scripts/lms0729-'+x+'.sql','utf8')).join('\n');
const constraints=`alter table ai_live_private.feedback drop constraint feedback_intent_check;
alter table ai_live_private.feedback add constraint feedback_intent_check check(intent in('SELF_RATING','PLAYER_RATING','PLAYER_CONTACT','SELF_TEAM','TEAM_ROSTER','NEXT_MATCH','TEAM_RECORD'));
alter table ai_live_private.feedback drop constraint feedback_assistant_version_check;
alter table ai_live_private.feedback add constraint feedback_assistant_version_check check(assistant_version in('LMS-0723','LMS-0729'));`;
const filename=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_lms0729_live_identity_team_record.sql'));if(!filename)throw Error('Create CLI migration first');
// Helpers are private and must never overwrite an unrelated object on apply/replay.
const helperGuards=[['ai_live_private.resolve_identity(uuid)','identity',true,['service_role']],['lms_read_private.team_record(uuid,text,jsonb)','record',true,['service_role','lms_view_as_executor']]].map(([sig,file,definer,roles])=>{
 const src=fs.readFileSync('scripts/lms0729-'+file+'.sql','utf8');
 return `do $guard$ declare p pg_proc;begin select * into p from pg_proc where oid=to_regprocedure('${sig}');if found and (md5(p.prosrc)<>'${hash(src)}' or p.proowner<>'${file==='record'?'lms_view_as_reader':'postgres'}'::regrole or p.prosecdef is distinct from ${definer} or p.proconfig is distinct from array['search_path=""'] or exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee not in(p.proowner,${roles.map(r=>"'"+r+"'::regrole::oid").join(',')}) or a.is_grantable)) then raise exception 'LMS-0729 helper drift';end if;end $guard$;`;
}).join('\n');
fs.writeFileSync('supabase/migrations/'+filename,`-- LMS-0729 / 0.1.551 local candidate. No production approval.\nbegin;\n${readerGuard}\n${guards}\n${helperGuards}\n${helpers}\n${n}\n${v}\n${f}\n${constraints}\ncommit;\n`);
fs.writeFileSync(root+'lms-0729-rollback.sql',`-- Review before production rollback; preserves new feedback rows and their CHECK compatibility.\nbegin;\n${guards}\n${normal}\n${view}\n${feedback}\ngrant lms_view_as_reader to postgres with admin false, inherit false, set true;\nset local role lms_view_as_reader;\ndrop function lms_read_private.team_record(uuid,text,jsonb);\nreset role;\nrevoke lms_view_as_reader from postgres granted by postgres;\ndrop function ai_live_private.resolve_identity(uuid);\nrevoke usage on schema lms_read_private from service_role,lms_view_as_executor;\ncommit;\n`);
fs.writeFileSync(root+'lms-0729-function-manifest.json',JSON.stringify(pairs.map(([a,b,signature,role])=>({signature,oldMd5:hash(a),newMd5:hash(b),owner:'postgres',execute:role})),null,2));
console.log(filename);
