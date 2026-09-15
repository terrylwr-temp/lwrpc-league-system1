import fs from 'node:fs';import {createHash} from 'node:crypto';
const path='supabase/migrations/20260909231834_lms0730_schedule_captain_names.sql';let sql=fs.readFileSync(path,'utf8');
const body=name=>sql.slice(sql.indexOf('as $fn$',sql.indexOf('function '+name))+7,sql.indexOf('$fn$;',sql.indexOf('as $fn$',sql.indexOf('function '+name))+7));
const md5=s=>createHash('md5').update(s).digest('hex');
const checks=[['view_as_private.page_read','jsonb,text,jsonb',true,'dd863d21b369c899fd713573ef3f05db'],['lms_read_private.schedule_captains','jsonb,jsonb',false,null]].map(([name,args,def,old])=>{
 const hashes=[md5(body(name)),...(old?[old]:[])].map(x=>`'${x}'`).join(',');
 return `do $check$ declare p pg_proc;begin select * into p from pg_proc where oid=to_regprocedure('${name}(${args})');if found then
 if p.proowner<>'lms_view_as_reader'::regrole or p.prosecdef is distinct from ${def} or p.proconfig is distinct from array['search_path=""'] or md5(p.prosrc) not in(${hashes}) then raise exception 'LMS-0730 function drift';end if;
 if exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee not in('lms_view_as_reader'::regrole${old?",'lms_view_as_executor'::regrole":''}) or a.is_grantable) then raise exception 'LMS-0730 ACL drift';end if;
 end if;end $check$;`;
}).join('\n');
sql=sql.replace(/-- BEGIN SOURCE GUARDS[\s\S]*?-- END SOURCE GUARDS\n/,'');
sql=sql.replace('grant lms_view_as_reader to postgres','-- BEGIN SOURCE GUARDS\n'+checks+'\n-- END SOURCE GUARDS\ngrant lms_view_as_reader to postgres');fs.writeFileSync(path,sql);
const baseline=fs.readFileSync('supabase/migrations/20260909153000_lms0726_view_as_real_ui_reads_role_compat.sql','utf8');const start=baseline.indexOf('create or replace function view_as_private.page_read('),end=baseline.indexOf('$fn$;',start)+5;
fs.writeFileSync('../docs/lms-0730-rollback.sql',`-- Reviewed local rollback candidate only. No business rows touched.\nbegin;\ngrant lms_view_as_reader to postgres with admin false, inherit false, set true;\ngrant create on schema view_as_private to lms_view_as_reader;\nset local role lms_view_as_reader;\n${baseline.slice(start,end)}\ndrop function lms_read_private.schedule_captains(jsonb,jsonb);\nreset role;\nrevoke create on schema view_as_private from lms_view_as_reader;\nrevoke lms_view_as_reader from postgres granted by postgres;\ncommit;\n`);
console.log(createHash('sha256').update(sql).digest('hex'));
