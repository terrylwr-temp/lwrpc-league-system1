// Local artifact generator. No database or network access.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir='supabase/migrations';
const filename=fs.readdirSync(dir).find(n=>n.endsWith('_lms0728_implicit_player.sql'));
if(!filename)throw Error('Create the migration with the Supabase CLI first.');
const read=n=>fs.readFileSync(`${dir}/${n}`,'utf8').replaceAll('\r\n','\n');
const source=read('20260907201448_lms0724_view_as.sql');
const eligibility=read('20260908203904_lms0725_eligibility_self.sql');
const extract=(s,name)=>s.slice(s.indexOf('create or replace function '+name),s.indexOf('$$;',s.indexOf('create or replace function '+name))+3);
const oldRole=extract(source,'view_as_private.member_role(');
const oldLookup=extract(eligibility,'view_as_private.lookup(');
const newRole=`create or replace function view_as_private.member_role(p_member uuid) returns text
language sql stable security invoker set search_path='' as $$
 -- Member validity is independent of whether a baseline role is stored.
 select case when not exists(select 1 from public.user_roles u where u.member_id=m.id) then 'player'
 else (select (array_agg(u.role order by case u.role when 'commissioner' then 5 when 'league_manager' then 4 when 'club_pro' then 3 when 'captain' then 2 when 'player' then 1 else 0 end desc))[1]
       from public.user_roles u where u.member_id=m.id and u.role in('commissioner','league_manager','club_pro','captain','player')) end
 from public.members m where m.id=p_member and m.is_active_member is true
 and (select count(distinct u.user_id) from public.user_roles u where u.member_id=m.id)<=1
 and not exists(select 1 from public.user_roles a join public.user_roles b on a.user_id=b.user_id where a.member_id=m.id and b.member_id<>m.id)
$$;`;
const oldJoin=` select u.member_id,u.role into v_member,v_role from public.user_roles u join public.members m on m.id=u.member_id
 where u.member_id=p_member and m.is_active_member is true and u.role in ('player','captain','club_pro','league_manager','commissioner') order by case u.role when 'commissioner' then 5 when 'league_manager' then 4 when 'club_pro' then 3 when 'captain' then 2 else 1 end desc limit 1;`;
if(!oldLookup.includes(oldJoin))throw Error('Reviewed lookup source drift');
const newLookup=oldLookup.replace(oldJoin,` -- The preceding context proof/lock remains authoritative; never infer the actor as SELF.
 v_role:=view_as_private.member_role(p_member);
 if v_role is not null then v_member:=p_member; end if;`);
const body=s=>s.slice(s.indexOf('$$')+2,s.lastIndexOf('$$'));
const md5=s=>createHash('md5').update(body(s)).digest('hex');
const guard=(old,newer,sig)=>`do $guard$ declare p pg_catalog.pg_proc;begin
 select * into p from pg_catalog.pg_proc where oid=pg_catalog.to_regprocedure('${sig}');
 if not found or p.proowner<>'postgres'::regrole or p.prosecdef or p.proconfig is distinct from array['search_path=""']
 or p.proisstrict or p.proleakproof or pg_catalog.md5(p.prosrc) not in('${md5(old)}','${md5(newer)}') then raise exception 'LMS-0728 function drift: ${sig}';end if;
 if exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where a.grantee not in(p.proowner,'lms_view_as_executor'::regrole::oid) or a.is_grantable)
 or not pg_catalog.has_function_privilege('lms_view_as_executor',p.oid,'EXECUTE') then raise exception 'LMS-0728 ACL drift: ${sig}';end if;
end $guard$;`;
const pairs=[[oldRole,newRole,'view_as_private.member_role(uuid)'],[oldLookup,newLookup,'view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)']];
const guards=pairs.map(p=>guard(...p)).join('\n');
fs.writeFileSync(`${dir}/${filename}`,`-- LMS-0728 / 0.1.550. Local candidate; production requires exact approval.\nbegin;\n${guards}\n${newRole}\n${newLookup}\ncommit;\n`);
fs.writeFileSync('../docs/lms-0728-rollback.sql',`-- Local reviewed rollback candidate; no production execution authorized.\nbegin;\n${guards}\n${oldRole}\n${oldLookup}\ncommit;\n`);
fs.writeFileSync('../docs/lms-0728-function-manifest.json',JSON.stringify(pairs.map(([old,n,sig])=>({signature:sig,oldMd5:md5(old),newMd5:md5(n),owner:'postgres',security:'INVOKER',searchPath:'',execute:['postgres','lms_view_as_executor']})),null,2));
console.log(filename);
