import fs from 'node:fs';
import { tableShapeSql } from './lms0726/table-shapes.mjs';
import { policySeedSql } from './lms0726/policy-seeds.mjs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const hash = value => createHash('md5').update(value).digest('hex');
const functions = [];
export function sqlFunction(name, args, returns, owner, executors, body, security = 'definer') {
  body = body.replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
  const signature = `${name}(${args.map(([, type]) => type).join(',')})`;
  functions.push({ name, signature, owner, executors, security, bodyHash: hash(body) });
  return `
do $drift$ declare p pg_catalog.pg_proc; begin
 select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure(${quote(signature)});
 if found and (p.proowner<>${quote(owner)}::regrole or p.prosecdef<>${security === 'definer'} or
 p.proconfig is distinct from array['search_path=""'] or pg_catalog.md5(p.prosrc)<>${quote(hash(body))}) then
 raise exception 'LMS0726 function drift: ${signature}'; end if;
 if found and exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
  where a.grantee not in (p.proowner${executors.map(role => `,${quote(role)}::regrole`).join('')}) or (a.is_grantable and a.grantee<>p.proowner)) then
  raise exception 'LMS0726 function ACL drift: ${signature}'; end if;
end $drift$;
create or replace function ${name}(${args.map(([n,t]) => `${n} ${t}`).join(',')}) returns ${returns}
language plpgsql volatile security ${security} set search_path='' as $body$${body}$body$;
alter function ${signature} owner to ${owner};
revoke all on function ${signature} from public,anon,authenticated,service_role,lms_view_as_executor,lms_page_reader,lms_roster_writer,lms_lineup_writer,lms_eligibility_reader,lms_normal_executor,lms_notification_worker;
${executors.length ? `grant execute on function ${signature} to ${executors.join(',')};` : ''}
`;
}
const roleNames = ['lms_page_reader','lms_roster_writer','lms_lineup_writer','lms_eligibility_reader','lms_normal_executor','lms_notification_worker'];
let sql = `-- LMS-0726 additive foundation. Local implementation; production approval required.
begin;
set local lock_timeout='5s';
`;
for (const role of roleNames) sql += `do $role$ begin
 if not exists(select 1 from pg_catalog.pg_roles where rolname=${quote(role)}) then create role ${role} nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls; end if;
 if exists(select 1 from pg_catalog.pg_roles where rolname=${quote(role)} and (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolbypassrls)) then raise exception 'LMS0726 role drift: ${role}'; end if;
end $role$;\n`;
sql += fs.readFileSync(path.join(root, 'scripts/lms0726/foundation-tables.sql'), 'utf8');

const management = `exists(select 1 from public.user_roles u join public.members m on m.id=u.member_id
 where u.user_id=p_actor and m.is_active_member=true and u.role in('league_manager','commissioner'))`;
const scope = allowPro => `exists(select 1 from public.teams t join public.user_roles u on
 (u.member_id in(t.captain_member_id,t.co_captain_member_id,t.co_captain_2_member_id) and u.role='captain'
 ${allowPro ? "or u.member_id=t.club_pro_member_id and u.role='club_pro'" : ''})
 join public.members m on m.id=u.member_id where t.id=p_team and u.user_id=p_actor and m.is_active_member=true)`;
for (const operation of ['add','remove']) {
  const candidate = operation === 'add' ? 'p_candidate' : 'p_membership';
  const tables = operation === 'add'
    ? 'public.user_roles,public.members,public.seasons,public.leagues,public.divisions,public.locations,public.teams,public.member_season_ratings,public.team_members,lms_write_private.policy_bindings'
    : 'public.user_roles,public.members,public.seasons,public.leagues,public.divisions,public.teams,public.team_members,public.matches,public.match_lineups,public.match_lines,public.line_games';
  const authority = `(${management} or ${scope(operation === 'add')})`;
  sql += sqlFunction(`lms_write_private.lock_roster_${operation}`, [['p_actor','uuid'],['p_team','uuid'],[candidate,'uuid']], 'boolean', 'postgres', ['lms_roster_writer'], `
begin
 if p_actor is null or p_team is null or ${candidate} is null or not ${authority} then return false; end if;
 lock table ${tables} in share row exclusive mode;
 return exists(select 1 from public.teams where id=p_team) and ${authority};
end
`);
}

sql += sqlFunction('public.lms_roster_remove_player', [['p_actor','uuid'],['p_team','uuid'],['p_membership','uuid'],['p_request','uuid']], 'jsonb', 'lms_roster_writer', ['service_role','lms_normal_executor'], `
declare receipt record; dependency_ids jsonb; result jsonb; locked boolean; operation_id uuid:=gen_random_uuid();
begin
 if p_request is null then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
 if not lms_write_private.lock_roster_remove(p_actor,p_team,p_membership) then return jsonb_build_object('status','NOT_AUTHORIZED');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text||':'||p_request::text,726));
 select * into receipt from lms_write_private.operation_receipts where actor_user_id=p_actor and request_id=p_request;
 if found then
  if receipt.operation<>'ROSTER_REMOVE' or receipt.resource_id<>p_team or receipt.subject_id<>p_membership then return jsonb_build_object('status','REQUEST_CONFLICT');end if;
  return receipt.outcome||jsonb_build_object('replayed',true);
 end if;
 select l.rosters_locked into locked from public.teams t join public.divisions d on d.id=t.division_id join public.leagues l on l.id=d.league_id where t.id=p_team;
 if not found then return jsonb_build_object('status','INVALID_TEAM');end if;
 if locked is distinct from false and not ${management} then return jsonb_build_object('status','REMOVAL_NOT_ALLOWED','reasonCodes',jsonb_build_array('ROSTER_LOCKED'));end if;
 if not exists(select 1 from public.team_members where id=p_membership and team_id=p_team) then return jsonb_build_object('status','NOT_ON_ROSTER');end if;
 select coalesce(jsonb_agg(x.id order by x.id),'[]'::jsonb) into dependency_ids from (
  select distinct m.id from public.matches m join public.team_members tm on tm.id=p_membership and tm.team_id=p_team
  where m.status is distinct from 'completed' and p_team in(m.home_team_id,m.away_team_id) and (
   exists(select 1 from public.match_lineups lu where lu.match_id=m.id and lu.team_id=p_team and tm.member_id in(lu.player_1_member_id,lu.player_2_member_id)) or
   exists(select 1 from public.match_lines ml where ml.match_id=m.id and
    ((m.home_team_id=p_team and tm.member_id in(ml.home_player_1_id,ml.home_player_2_id)) or
     (m.away_team_id=p_team and tm.member_id in(ml.away_player_1_id,ml.away_player_2_id))))
  )
 ) x;
 if jsonb_array_length(dependency_ids)>0 then return jsonb_build_object('status','REMOVAL_NOT_ALLOWED','reasonCodes',jsonb_build_array('FUTURE_LINEUP_DEPENDENCY'),'matches',dependency_ids);end if;
 delete from public.team_members where id=p_membership and team_id=p_team;
 result:=jsonb_build_object('status','REMOVED','membershipId',p_membership,'operationId',operation_id,'replayed',false,'notificationStatus','NOT_APPLICABLE');
 insert into lms_write_private.operation_receipts(id,actor_user_id,request_id,operation,resource_id,subject_id,request_hash,outcome)
 values(operation_id,p_actor,p_request,'ROSTER_REMOVE',p_team,p_membership,pg_catalog.md5(p_team::text||':'||p_membership::text),result);
 return result;
end
`);

sql += sqlFunction('lms_write_private.evaluate_eligibility', [['p_actor','uuid'],['p_team','uuid'],['p_members','uuid[]'],['p_stage','text'],['p_match','uuid'],['p_lines','jsonb']], 'jsonb', 'lms_eligibility_reader', ['lms_roster_writer','lms_lineup_writer','lms_normal_executor'], fs.readFileSync(path.join(root, 'scripts/lms0726/eligibility-body.sql'), 'utf8'));
sql += sqlFunction('public.lms_roster_add_player', [['p_actor','uuid'],['p_team','uuid'],['p_candidate','uuid'],['p_request','uuid']], 'jsonb', 'lms_roster_writer', ['service_role','lms_normal_executor'], fs.readFileSync(path.join(root, 'scripts/lms0726/add-body.sql'), 'utf8'));

sql += sqlFunction('lms_write_private.lock_match_setup', [['p_actor','uuid'],['p_match','uuid'],['p_team','uuid']], 'boolean', 'postgres', ['lms_lineup_writer','lms_normal_executor'], `
begin
 if p_actor is null or p_match is null or not (${management} or (p_team is not null and ${scope(true)})) then return false;end if;
 lock table public.user_roles,public.members,public.seasons,public.leagues,public.divisions,public.locations,public.teams,public.member_season_ratings,public.team_members,lms_write_private.policy_bindings,public.matches,public.match_lineups,public.match_lines,public.line_games in share row exclusive mode;
 return (${management} or (p_team is not null and ${scope(true)})) and exists(select 1 from public.matches m where m.id=p_match and (p_team is null or p_team in(m.home_team_id,m.away_team_id)));
end
`);
sql += sqlFunction('public.lms_match_setup_save', [['p_actor','uuid'],['p_match','uuid'],['p_team','uuid'],['p_lineups','jsonb'],['p_request','uuid']], 'jsonb', 'lms_lineup_writer', ['service_role','lms_normal_executor'], fs.readFileSync(path.join(root, 'scripts/lms0726/lineup-save-body.sql'), 'utf8'));
sql += sqlFunction('public.lms_match_setup_reset', [['p_actor','uuid'],['p_match','uuid'],['p_request','uuid']], 'jsonb', 'lms_lineup_writer', ['service_role','lms_normal_executor'], fs.readFileSync(path.join(root, 'scripts/lms0726/lineup-reset-body.sql'), 'utf8'));
// Remaining reviewed shared page contracts precede application cutover.
sql += fs.readFileSync(path.join(root, 'scripts/lms0726/foundation-grants.sql'), 'utf8');
sql += tableShapeSql();
sql += policySeedSql();
sql += '\ncommit;\n';
fs.writeFileSync(path.join(root, 'supabase/migrations/20260909002847_lms0726_security_foundation_additive.sql'), sql);
fs.writeFileSync(path.join(root, 'scripts/lms0726/function-manifest.json'), JSON.stringify(functions, null, 2) + '\n');
console.log(JSON.stringify({ functions: functions.length, phase: 'local foundation in progress', sha256: createHash('sha256').update(sql).digest('hex') }));




