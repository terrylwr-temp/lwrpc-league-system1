import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const fields=JSON.parse(await readFile('../docs/lms-0726-read-fields.json','utf8'));
const migration='supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql';
const accepted=await readFile('supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql','utf8');
const original=accepted.match(/create or replace function public\.lms_view_as[\s\S]+?\$corrected\$;/i)?.[0];
if(!original)throw new Error('Accepted dispatcher source missing');
const anchor=" if p_op='snapshot' then return view_as_private.snapshot(c.target,target_role);end if;";
if(original.split(anchor).length!==2)throw new Error('Dispatcher anchor drift');
const dispatcher=original.replace(anchor," if p_op='page_read' then return view_as_private.page_read(p_input||jsonb_build_object('target',c.target),p_input->>'contract',p_input->'args');end if;\n"+anchor).replaceAll('\r\n','\n');
fields.guide={table:'notification_templates',columns:['template_key','body']};
const projections={};const grants=new Map();
function json(key,alias='r',only){const f=fields[key],cols=only||f.columns;const set=grants.get(f.table)||new Set();cols.forEach(c=>set.add(c));grants.set(f.table,set);return `jsonb_build_object(${cols.map(c=>`'${c}',${alias}.${c}`).join(',')})`;}
function rows(key,where='true',only){const f=fields[key];return `(select coalesce(jsonb_agg(${json(key,'r',only)}),'[]'::jsonb) from public.${f.table} r where ${where})`;}
for(const key of ['season','league','division','divisionLine','location','scoreTemplate'])projections[fields[key].table]=rows(key);
projections.teams=`(select coalesce(jsonb_agg(case when r.id in(select value::uuid from jsonb_array_elements_text(p_viewer->'teams')) then ${json('team')} else ${json('teamPublic')}||jsonb_build_object('is_active',r.is_active,'home_location_id',r.home_location_id) end),'[]'::jsonb) from public.teams r)`;
projections.matches=rows('match',"r.is_published is true",fields.match.columns.filter(x=>!['notes','score_dispute_notes','score_entered_by_member_id','score_verified_by_member_id'].includes(x)));
projections.match_lines=rows('matchLine',"exists(select 1 from public.matches m where m.id=r.match_id and m.is_published is true)");
projections.line_games=rows('game',"exists(select 1 from public.match_lines ml join public.matches m on m.id=ml.match_id where ml.id=r.match_line_id and m.is_published is true)");
projections.match_lineups=rows('lineup',"r.team_id in(select value::uuid from jsonb_array_elements_text(p_viewer->'managed')) and exists(select 1 from public.matches m where m.id=r.match_id and m.is_published is true)");
projections.team_byes=rows('bye');projections.team_standings=rows('standing');
projections.match_setup_counts=`(select coalesce(jsonb_agg(jsonb_build_object('match_id',x.match_id,'team_id',x.team_id,'completed',x.completed)),'[]'::jsonb) from (select ml.match_id,ml.team_id,count(*) filter(where ml.player_1_member_id is not null and ml.player_2_member_id is not null) completed from public.match_lineups ml join public.matches m on m.id=ml.match_id where m.is_published is true and (m.home_team_id in(select value::uuid from jsonb_array_elements_text(p_viewer->'managed')) or m.away_team_id in(select value::uuid from jsonb_array_elements_text(p_viewer->'managed'))) group by ml.match_id,ml.team_id) x)`;
const membership=rows('membership',"r.team_id in(select value::uuid from jsonb_array_elements_text(p_viewer->'teams'))");
const people=`(select coalesce(jsonb_agg(case when r.id=(p_viewer->>'memberId')::uuid then ${json('selfProfile')} when exists(select 1 from public.team_members tm where tm.member_id=r.id and tm.team_id in(select value::uuid from jsonb_array_elements_text(p_viewer->'managed'))) then ${json('rosterPerson')} when exists(select 1 from public.teams t where t.id in(select value::uuid from jsonb_array_elements_text(p_viewer->'teams')) and r.id in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)) then ${json('personName')}||jsonb_build_object('email',r.email,'phone',r.phone) else ${json('personName')} end),'[]'::jsonb) from public.members r where r.id=(p_viewer->>'memberId')::uuid or exists(select 1 from public.teams t where t.id in(select value::uuid from jsonb_array_elements_text(p_viewer->'teams')) and r.id in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id)) or exists(select 1 from public.team_members tm where tm.member_id=r.id and tm.team_id in(select value::uuid from jsonb_array_elements_text(p_viewer->'teams'))) or exists(select 1 from public.match_lines ml join public.matches m on m.id=ml.match_id where m.is_published is true and r.id in(ml.home_player_1_id,ml.home_player_2_id,ml.away_player_1_id,ml.away_player_2_id)))`;
const ratings=rows('rating',"r.member_id=(p_viewer->>'memberId')::uuid or exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id where tm.member_id=r.member_id and l.season_id=r.season_id and tm.team_id in(select value::uuid from jsonb_array_elements_text(p_viewer->'teams')))");
const roles=rows('roles',"r.member_id=(p_viewer->>'memberId')::uuid");
const settings=rows('setting',"r.setting_key in('club_name','club_short_name','system_name','browser_tab_title','logo_url','main_email','support_email','club_website','membership_url','league_site_url','timezone','email_activated')");
projections.notification_templates=rows('guide',"r.template_key='player_guide_pdf' or (r.template_key='captain_guide_pdf' and p_viewer->>'role' in('captain','club_pro','league_manager','commissioner')) or (r.template_key='admin_guide_pdf' and p_viewer->>'role' in('league_manager','commissioner'))");
const competition=`create or replace function lms_read_private.competition(p_viewer jsonb,p_contract text,p_args jsonb) returns jsonb language sql security invoker set search_path='' as $fn$ select jsonb_build_object(${Object.entries(projections).map(([t,v])=>`'${t}',${v}`).join(',\n')}); $fn$;`;
const persons=`create or replace function lms_read_private.people(p_viewer jsonb,p_contract text,p_args jsonb) returns jsonb language sql security invoker set search_path='' as $fn$ select jsonb_build_object('members',${people},'team_members',${membership},'member_season_ratings',${ratings},'user_roles',${roles},'system_settings',${settings}); $fn$;`;
// Explicit referenced predicate/join columns, separate from serialized fields.
for(const [table,columns]of Object.entries({teams:['is_active','home_location_id'],members:['id'],team_members:['team_id','member_id'],matches:['id','is_published'],match_lines:['match_id','home_player_1_id','home_player_2_id','away_player_1_id','away_player_2_id'],divisions:['id','league_id'],leagues:['id','season_id']})){const set=grants.get(table)||new Set();columns.forEach(c=>set.add(c));grants.set(table,set);}
const lock=`create or replace function lms_read_private.lock_viewer(p_proof jsonb,p_contract text,p_args jsonb) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare target uuid; role_name text; managed uuid[]; teams uuid[];
begin
 if p_contract is distinct from 'dashboard' or p_args is distinct from '{}'::jsonb then raise exception 'Invalid View-As read contract';end if;
 if not view_as_private.lock_authorization(p_proof,'identity') then raise exception 'View-As access denied';end if;
 select c.target into strict target from view_as_private.contexts c where c.id=(p_proof->>'id')::uuid and c.started_at is not null and c.ended_at is null and c.expires_at>clock_timestamp();
 role_name:=view_as_private.member_role(target);
 perform 1 from public.locations l where target in(l.club_pro_member_id,l.club_pro_2_member_id) order by l.id for share;
 perform 1 from public.teams t where target in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id) or exists(select 1 from public.locations l where l.id=t.home_location_id and target in(l.club_pro_member_id,l.club_pro_2_member_id)) order by t.id for share;
 select coalesce(array_agg(t.id),'{}'::uuid[]) into managed from public.teams t where role_name in('captain','club_pro','league_manager','commissioner') and (target in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id,t.club_pro_member_id) or exists(select 1 from public.locations l where l.id=t.home_location_id and target in(l.club_pro_member_id,l.club_pro_2_member_id)));
 perform 1 from public.team_members tm where tm.member_id=target or tm.team_id=any(managed) order by tm.team_id,tm.member_id for share;
 select coalesce(array_agg(distinct x),'{}'::uuid[]) into teams from (select unnest(managed) x union select tm.team_id from public.team_members tm where tm.member_id=target) q;
 perform 1 from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id join public.seasons s on s.id=l.season_id where t.id=any(teams) order by t.id for share of t,d,l,s;
 -- Existing dashboards explicitly include target-linked inactive teams and previous seasons.
 perform 1 from public.matches m where m.home_team_id=any(managed) or m.away_team_id=any(managed) order by m.id for share;
 if not view_as_private.lock_authorization(p_proof,'identity') then raise exception 'View-As access denied';end if;
 return jsonb_build_object('memberId',target,'role',role_name,'teams',teams,'managed',managed);
end $fn$;`;
const entry=`create or replace function view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare v jsonb; result jsonb;
begin
 v:=lms_read_private.lock_viewer(p_proof,p_contract,p_args);
 result:=lms_read_private.competition(v,p_contract,p_args)||lms_read_private.people(v,p_contract,p_args);
 perform lms_read_private.lock_viewer(p_proof,p_contract,p_args);
 return jsonb_build_object('viewer',v,'tables',result);
end $fn$;`;
const oldBody=original.match(/as \$corrected\$([\s\S]*?)\$corrected\$;/i)[1].replaceAll('\r\n','\n');
const newBody=dispatcher.match(/as \$corrected\$([\s\S]*?)\$corrected\$;/i)[1];
const md5=x=>createHash('md5').update(x).digest('hex');
let sql=`-- LMS-0726 scoped View-As read projection. LOCAL VALIDATION DRAFT; no business DML or normal ACL cutover.\nbegin;\ndo $guard$ begin\nif not exists(select 1 from pg_proc p where p.oid='public.lms_view_as(text,jsonb)'::regprocedure and md5(p.prosrc) in('${md5(oldBody)}','${md5(newBody)}') and p.proowner='lms_view_as_executor'::regrole) then raise exception 'Accepted dispatcher drift';end if;\nif not exists(select 1 from pg_roles where rolname='lms_view_as_reader') then create role lms_view_as_reader nologin noinherit nobypassrls;end if;\nend $guard$;\ncreate schema if not exists lms_read_private;\nrevoke all on schema lms_read_private from public,anon,authenticated,service_role;\ngrant usage on schema lms_read_private,view_as_private,public to lms_view_as_reader;\n`;
for(const [t,cols]of grants){sql+=`grant select(${[...cols].sort().join(',')}) on public.${t} to lms_view_as_reader;\ndrop policy if exists lms0726_internal_page_read on public.${t};\ncreate policy lms0726_internal_page_read on public.${t} for select to lms_view_as_reader using(true);\n`;}
const functions=[['lms_read_private.lock_viewer(jsonb,text,jsonb)',lock,'current_user',true,'lms_view_as_reader'],['lms_read_private.competition(jsonb,text,jsonb)',competition,"'lms_view_as_reader'",false,null],['lms_read_private.people(jsonb,text,jsonb)',persons,"'lms_view_as_reader'",false,null],['view_as_private.page_read(jsonb,text,jsonb)',entry,"'lms_view_as_reader'",true,'lms_view_as_executor']];
let drift=`do $scope_guard$ declare p pg_proc;begin
if exists(select 1 from pg_roles where rolname='lms_view_as_reader' and (rolsuper or rolcanlogin or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls or rolinherit)) or exists(select 1 from pg_auth_members where roleid='lms_view_as_reader'::regrole or member='lms_view_as_reader'::regrole) then raise exception 'View-As read role drift';end if;
`;
drift+=`if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a where n.nspname='public' and a.grantee='lms_view_as_reader'::regrole) then raise exception 'View-As read table privilege drift';end if;
if exists(select 1 from pg_attribute c join pg_class t on t.oid=c.attrelid join pg_namespace n on n.oid=t.relnamespace cross join lateral aclexplode(c.attacl) a where n.nspname='public' and a.grantee='lms_view_as_reader'::regrole and (a.privilege_type<>'SELECT' or a.is_grantable or not (${[...grants].map(([table,cols])=>`(t.relname='${table}' and c.attname in(${[...cols].map(c=>`'${c}'`).join(',')}))`).join(' or ')}))) then raise exception 'View-As read column privilege drift';end if;
`;
for(const [sig,definition,owner,definer,grantee]of functions){const body=definition.split('$fn$')[1];drift+=`select * into p from pg_proc where oid=to_regprocedure('${sig}');if found then
if md5(p.prosrc)<>'${md5(body)}' or p.proowner<>${owner}::regrole or p.prosecdef<>${definer} or p.proconfig is distinct from array['search_path=""'] then raise exception 'View-As read function drift: ${sig}';end if;
if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.is_grantable or a.grantee<>p.proowner ${grantee?`and a.grantee<>'${grantee}'::regrole`:''}) then raise exception 'View-As read function ACL drift: ${sig}';end if;
end if;
`;}
for(const [table]of grants)drift+=`if exists(select 1 from pg_policy where polrelid='public.${table}'::regclass and polname='lms0726_internal_page_read' and (polcmd<>'r' or not polpermissive or polroles<>array['lms_view_as_reader'::regrole::oid] or pg_get_expr(polqual,polrelid)<>'true' or polwithcheck is not null)) then raise exception 'View-As read policy drift: ${table}';end if;\n`;
drift+='end $scope_guard$;\n';
// Check before changing any existing scoped object; transaction rollback is atomic.
const roleEnd=sql.indexOf('create schema if not exists lms_read_private;');
sql=sql.slice(0,roleEnd)+drift+sql.slice(roleEnd);
sql+=lock+'\n'+competition+'\n'+persons+'\n'+entry+'\n';
for(const sig of ['lms_read_private.lock_viewer(jsonb,text,jsonb)','lms_read_private.competition(jsonb,text,jsonb)','lms_read_private.people(jsonb,text,jsonb)','view_as_private.page_read(jsonb,text,jsonb)']){sql+=`revoke all on function ${sig} from public,anon,authenticated,service_role,lms_view_as_executor;\n`;if(!sig.includes('lock_viewer'))sql+=`alter function ${sig} owner to lms_view_as_reader;\n`;}
sql+='grant execute on function lms_read_private.lock_viewer(jsonb,text,jsonb) to lms_view_as_reader;\ngrant execute on function view_as_private.page_read(jsonb,text,jsonb) to lms_view_as_executor;\n'+dispatcher+'\ncommit;\n';
await writeFile(migration,sql);console.log(migration,createHash('sha256').update(sql).digest('hex'));
