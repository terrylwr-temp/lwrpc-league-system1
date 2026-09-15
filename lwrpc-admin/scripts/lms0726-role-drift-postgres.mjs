// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=(process.argv[2]?.startsWith('--')?null:process.argv[2]) || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0726-page-read-races-'));
const data=path.join(dir,'data'); const port='56189';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {pageFixture,id} from '../test/helpers/viewAsPageFixture.mjs';
class Session{
 constructor(user="postgres"){
  this.pending=null;this.buffer='';this.errors='';
  this.p=spawn(path.join(bin,'psql.exe'),['-X','-qAt','-h','127.0.0.1','-p',port,'-U',user,'-d','postgres'],{env,windowsHide:true,stdio:'pipe'});
  this.p.stdout.on('data',b=>{this.buffer+=b; if(this.pending&&this.buffer.includes(this.pending.marker)){
   const {resolve,marker,timer}=this.pending;clearTimeout(timer);const out=this.buffer.slice(0,this.buffer.indexOf(marker)).trim();
   this.buffer=this.buffer.slice(this.buffer.indexOf(marker)+marker.length).trimStart();this.pending=null;resolve({out,error:this.errors});this.errors='';
  }});
  this.p.stderr.on('data',b=>this.errors+=b);
  this.p.on('error',e=>this.pending?.reject(e));sessions.push(this);
 }
 q(sql){assert.equal(this.pending,null);return new Promise((resolve,reject)=>{const marker=`DONE_${Math.random().toString(16).slice(2)}`;
  const timer=setTimeout(()=>reject(Error('isolated query timeout: '+sql.slice(0,160))),20000);
  this.pending={resolve,reject,marker,timer};this.p.stdin.write(`${sql}\n;\n\\echo ${marker}\n`);
 });}
 async ok(sql){const r=await this.q(sql);assert.ok(!/ERROR:|FATAL:/.test(r.error),r.error);return r.out;}
}


try{
 run('initdb.exe',['-D',data,'-U',process.argv.includes('--superuser')?'postgres':'supabase_admin','-A','trust','--no-locale','-E','UTF8']);run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const admin=new Session(process.argv.includes('--superuser')?'postgres':'supabase_admin');if(!process.argv.includes('--superuser'))await admin.ok('create role postgres superuser login createrole createdb replication bypassrls; alter database postgres owner to postgres;');
 const gate=new Session();const quote=v=>v==null?'null':typeof v==='number'?String(v):`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
 const adapter={exec:s=>gate.ok(s),query:async(s,p=[])=>{s=s.replace(/\$(\d+)/g,(_,n)=>quote(p[Number(n)-1]));if(/^\s*select\b/i.test(s))return{rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${s.replace(/;\s*$/,'')}) x`))};await gate.ok(s);return{rows:[]}}};
 await pageFixture(adapter);await admin.ok('grant anon,authenticated,service_role to postgres with inherit false,set true;');
 if(!process.argv.includes('--superuser')) await admin.ok('alter role postgres nosuperuser; grant lms_view_as_executor to postgres with admin true, inherit false, set false;');
 await gate.ok('grant lms_view_as_executor to postgres with admin false, inherit false, set true;');
 const original=await readFile('supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql','utf8');
 const first=original.slice(0,original.indexOf('do $scope_guard$'));
 await gate.ok(first);
 const membership=JSON.parse(await gate.ok("select coalesce(json_agg(json_build_object('role',r.rolname,'member',m.rolname,'grantor',g.rolname,'admin',a.admin_option,'inherit',a.inherit_option,'set',a.set_option)),'[]') from pg_auth_members a join pg_roles r on r.oid=a.roleid join pg_roles m on m.oid=a.member join pg_roles g on g.oid=a.grantor where r.rolname='lms_view_as_reader'"));
 await gate.ok('rollback;');
 const fail=await gate.q(process.argv.includes('--superuser')?original.slice(0,original.lastIndexOf('commit;')):original);if(!process.argv.includes('--superuser'))assert.match(fail.error,/View-As read role drift/);await gate.ok('rollback;');
 assert.equal(await gate.ok("select to_regrole('lms_view_as_reader') is null"),'t');
 await gate.ok(await readFile('test/fixtures/lms0726-member-directory.sql','utf8'));
 for(const name of ['league_blackout_dates','league_schedule_settings','location_court_availability'])if(await gate.ok(`select to_regclass('public.${name}') is null`)==='t')await gate.ok(`create table public.${name}(fixture_id int primary key);insert into public.${name}(fixture_id) values(1);`);
 for(const {tablename} of (await adapter.query("select tablename from pg_tables where schemaname='public'")).rows)await gate.ok(`alter table public.${tablename} enable row level security;`);
 const directoryBefore=await gate.ok('select public.admin_member_directory_page()');
 const tables=(await adapter.query("select tablename from pg_tables where schemaname='public' order by 1")).rows;
 const fingerprint=async()=>{const rows=[];for(const {tablename}of tables)rows.push([tablename,await gate.ok(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${tablename} t`)]);return JSON.stringify(rows)};
 const before=await fingerprint();
 const dispatcher=await gate.ok("select pg_get_functiondef('public.lms_view_as(text,jsonb)'::regprocedure)");
 const maintenance=await gate.ok("select pg_get_functiondef('public.lms_view_as_maintenance()'::regprocedure)");
 const policyQuery="select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' and policyname<>'lms0726_internal_page_read' order by tablename,policyname";
 const oldPolicies=await gate.ok('select json_agg(x) from ('+policyQuery+') x');
 const grants=await gate.ok("select coalesce(json_agg(x),'[]') from (select table_name,column_name,privilege_type from information_schema.column_privileges where grantee='lms_view_as_reader' order by 1,2,3) x");
 const corrected=await readFile('supabase/migrations/20260909153000_lms0726_view_as_real_ui_reads_role_compat.sql','utf8');
 await gate.ok(corrected);await gate.ok(corrected);await gate.ok(corrected);
 assert.equal(await fingerprint(),before);
 assert.equal(await gate.ok('select json_agg(x) from ('+policyQuery+') x'),oldPolicies);
 assert.equal(await gate.ok("select has_schema_privilege('lms_view_as_reader','lms_read_private','CREATE') or has_schema_privilege('lms_view_as_reader','view_as_private','CREATE') or has_schema_privilege('lms_view_as_executor','public','CREATE')"),'f');
 assert.equal(await gate.ok("select exists(select 1 from pg_auth_members where roleid='lms_view_as_reader'::regrole and (inherit_option or set_option))"),'f');
 const proof={id:id(777),actor:id(107),target:id(2),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 const call=op=>`select public.lms_view_as(${quote(op)},${quote({...proof,contract:'dashboard',args:{}})}::jsonb);`;
 // Only synthetic context/audit mutation. Public business rows remain unchanged.
 const svc=new Session();await svc.ok('set role service_role;');await svc.ok(call('start'));await svc.ok(call('exchange'));
 const page=JSON.parse(await svc.ok(call('page_read')));assert.ok(page.viewer.managed.includes(id(30)));assert.equal(page.viewer.memberId,id(2));
 const snapshot=await svc.ok(call('snapshot'));
 const denied=[];for(const role of ['anon','authenticated','service_role']){const c=new Session();await c.ok(`set role ${role};`);const r=await c.q("select view_as_private.page_read('{}','dashboard','{}');");assert.match(r.error,/permission denied/);denied.push(role);}
 // Permanent unsafe-state controls; each unsafe setup is itself inside a local rollback transaction.
 const variants=[
  ['login','alter role lms_view_as_reader login'],['super','alter role lms_view_as_reader superuser'],['inherit','alter role lms_view_as_reader inherit'],['bypass','alter role lms_view_as_reader bypassrls'],['createdb','alter role lms_view_as_reader createdb'],['createrole','alter role lms_view_as_reader createrole'],['replication','alter role lms_view_as_reader replication'],
  ['browser_membership','grant lms_view_as_reader to authenticated'],['outbound_membership','grant authenticated to lms_view_as_reader'],['creator_set','grant lms_view_as_reader to postgres with inherit false,set true'],['creator_inherit','grant lms_view_as_reader to postgres with inherit true,set false'],
  ['role_config',"alter role lms_view_as_reader set search_path='public'"],['table_write','grant update on public.members to lms_view_as_reader'],['table_read','grant select on public.members to lms_view_as_reader'],['column_write','grant update(first_name) on public.members to lms_view_as_reader'],['persistent_ddl','grant create on schema lms_read_private to lms_view_as_reader'],['function_acl',"grant execute on function view_as_private.page_read(jsonb,text,jsonb) to authenticated"],['function_owner',"alter function lms_read_private.people(jsonb,text,jsonb) owner to postgres"],['default_acl','alter default privileges for role lms_view_as_reader grant execute on functions to authenticated']
 ];const rejected=[];
 for(const [name,mutation]of variants){await admin.ok('begin;'+mutation+';set session authorization postgres;');const r=await admin.q(corrected.replace(/^begin;$/m,'').replace(/^commit;$/m,''));assert.match(r.error,/drift|unexpected owned function/,name);await admin.ok('rollback;reset session authorization;');rejected.push(name);}
 // Compatible role-only recovery is checked in a separate initial transaction below via removal/reapply.
 await admin.ok('drop function lms_read_private.people(jsonb,text,jsonb);drop policy lms0726_internal_page_read on public.members;revoke select(first_name) on public.members from lms_view_as_reader;');
 await gate.ok(corrected);assert.ok(JSON.parse(await svc.ok(call('page_read'))).viewer.managed.includes(id(30)));
 // SQL rollback under the non-superuser deployment principal, with scoped temporary owner execution.
 let removal='begin;grant create on schema public to lms_view_as_executor;set local role lms_view_as_executor;'+dispatcher+';reset role;revoke create on schema public from lms_view_as_executor;grant lms_view_as_reader to postgres with inherit false,set true granted by postgres;set local role lms_view_as_reader;';
 for(const name of ['view_as_private.page_read','lms_read_private.people','lms_read_private.competition'])removal+=`drop function ${name}(jsonb,text,jsonb);`;
 removal+='reset role;drop function lms_read_private.lock_viewer(jsonb,text,jsonb);revoke lms_view_as_reader from postgres granted by postgres;';
 for(const r of (await adapter.query("select tablename from pg_policies where schemaname='public' and policyname='lms0726_internal_page_read'")).rows)removal+=`drop policy lms0726_internal_page_read on public.${r.tablename};`;
 for(const r of (await adapter.query("select table_name,column_name from information_schema.column_privileges where grantee='lms_view_as_reader'")).rows)removal+=`revoke select(${r.column_name}) on public.${r.table_name} from lms_view_as_reader;`;
 removal+='commit;';await gate.ok(removal);
 assert.equal(await svc.ok(call('snapshot')),snapshot);assert.equal(await fingerprint(),before);assert.equal(await gate.ok("select pg_get_functiondef('public.lms_view_as_maintenance()'::regprocedure)"),maintenance);
 await gate.ok(corrected);assert.ok(JSON.parse(await svc.ok(call('page_read'))).viewer.managed.includes(id(30)));assert.equal(await fingerprint(),before);
 assert.equal(await gate.ok('select public.admin_member_directory_page()'),directoryBefore);
 const footprint=JSON.parse(await gate.ok("select json_build_object('functions',(select json_agg(json_build_object('signature',p.oid::regprocedure::text,'md5',md5(p.prosrc),'owner',pg_get_userbyid(p.proowner),'definer',p.prosecdef,'settings',p.proconfig,'acl',p.proacl)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='lms_read_private' or n.nspname='view_as_private' and proname='page_read'),'policies',(select count(*) from pg_policies where policyname='lms0726_internal_page_read'),'columns',(select count(*) from information_schema.column_privileges where grantee='lms_view_as_reader'),'table_acl',(select count(*) from pg_class c cross join lateral aclexplode(c.relacl) a where a.grantee='lms_view_as_reader'::regrole),'membership',(select coalesce(json_agg(json_build_object('member',pg_get_userbyid(member),'grantor',pg_get_userbyid(grantor),'admin',admin_option,'inherit',inherit_option,'set',set_option)),'[]') from pg_auth_members where roleid='lms_view_as_reader'::regrole))"));
 console.log(JSON.stringify({footprint,rlsEnabledOnPublicFixtures:true,normalMemberDirectoryUnchanged:true,mode:process.argv.includes('--superuser')?'clean-superuser':'production-compatible',postgres:await gate.ok('show server_version'),membership,unchangedMigrationReproduces:!process.argv.includes('--superuser'),correctedApply:true,replays:2,unsafeRejected:rejected,partialRecovery:true,compatibleExistingRoleRecovery:true,normalPoliciesUnchanged:true,publicBusinessTables:tables.length,publicBusinessUnchanged:true,directHelperDenied:denied,postCommitDdlPrivilege:false,postCommitSetOrInherit:false,acceptedSnapshotRollback:true,maintenanceUnchanged:true,correctedPageReadAfterRollbackReapply:true},null,2));
}finally{for(const session of sessions)session.p.stdin.end('\\q\n');if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}


