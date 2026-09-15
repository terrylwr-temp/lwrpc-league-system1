// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=(process.argv[2]?.startsWith('--')?null:process.argv[2]) || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0728-implicit-'));
const data=path.join(dir,'data'); const port='56192';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {implicitPlayerFixture,id,migrationName,readMigration} from '../test/helpers/implicitPlayerFixture.mjs';
import {implicitMatrix} from '../test/helpers/implicitPlayerMatrix.mjs';
import {writeFile} from 'node:fs/promises';
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
 run('initdb.exe',['-D',data,'-U','supabase_admin','-A','trust','--no-locale','-E','UTF8']);run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const admin=new Session('supabase_admin');await admin.ok('create role postgres superuser login createrole createdb replication bypassrls;alter database postgres owner to postgres;');
 const gate=new Session();
 const quote=v=>v==null?'null':typeof v==='number'?String(v):`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
 const db={exec:s=>gate.ok(s),query:async(s,p=[])=>{s=s.replace(/\$(\d+)/g,(_,n)=>quote(p[Number(n)-1]));if(/^\s*select\b/i.test(s))return{rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${s.replace(/;\s*$/,'')}) x`))};await gate.ok(s);return{rows:[]}}};
 await implicitPlayerFixture(db,async()=>{await admin.ok('grant anon,authenticated,service_role to postgres with inherit false,set true;alter role postgres nosuperuser;grant lms_view_as_executor to postgres with admin true,inherit false,set false;');await gate.ok('grant lms_view_as_executor to postgres with admin false,inherit false,set true;');});
 const sql=await readMigration(migrationName),rollback=await readFile('../docs/lms-0728-rollback.sql','utf8');
 const tables=(await db.query("select tablename from pg_tables where schemaname='public' order by 1")).rows;
 for(const {tablename}of tables)await gate.ok(`alter table public.${tablename} enable row level security`);
 const fingerprint=async()=>{const r=[];for(const {tablename}of tables)r.push([tablename,await gate.ok(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${tablename} t`)]);return JSON.stringify(r)};
 const catalog=()=>gate.ok("select jsonb_agg(to_jsonb(x) order by x.oid) from (select oid,proowner,proacl,proconfig,prosecdef,prosrc from pg_proc where pronamespace in('view_as_private'::regnamespace,'ai_live_private'::regnamespace,'lms_read_private'::regnamespace)) x");
 const grants=()=>gate.ok("select jsonb_agg(to_jsonb(x) order by x.oid) from (select oid,relacl from pg_class where relnamespace='public'::regnamespace) x");
 const policies=()=>gate.ok('select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p');
 const before=await fingerprint(),old=JSON.parse(await catalog()),acl=await grants(),rls=await policies();
 await gate.ok(sql);await gate.ok(sql);await gate.ok(sql);
 assert.equal(await fingerprint(),before);assert.equal(await grants(),acl);assert.equal(await policies(),rls);
 const changed=JSON.parse(await catalog()).filter((r,i)=>JSON.stringify(r)!==JSON.stringify(old[i]));assert.equal(changed.length,2);
 for(const r of changed){const o=old.find(x=>x.oid===r.oid);assert.deepEqual({...r,prosrc:o.prosrc},o);}
 await gate.ok(rollback);assert.deepEqual(JSON.parse(await catalog()),old);
 // Simulated interrupted release: only first definition installed, then recover atomically.
 await gate.ok(sql.slice(sql.indexOf('create or replace function view_as_private.member_role'),sql.indexOf('create or replace function view_as_private.lookup')));await gate.ok(sql);await gate.ok(rollback);assert.deepEqual(JSON.parse(await catalog()),old);
 const variants=[['definer','alter function view_as_private.member_role(uuid) security definer'],['path',"alter function view_as_private.member_role(uuid) set search_path=public"],['acl','grant execute on function view_as_private.member_role(uuid) to authenticated'],['body',"create or replace function view_as_private.member_role(p_member uuid) returns text language sql stable as $$select 'commissioner'::text$$"],['owner','alter function view_as_private.member_role(uuid) owner to service_role']];
 for(const [name,mutation]of variants){await admin.ok('begin;'+mutation+';set session authorization postgres;');const r=await admin.q(sql.replace(/^begin;$/m,'').replace(/^commit;$/m,''));assert.match(r.error,/drift/,name);await admin.ok('rollback;reset session authorization;');}
 const matrix=await implicitMatrix(db);
 // Existing protected member lock blocks active-state invalidation; no broad lock grants.
 const a=new Session(),b=new Session();await a.ok('begin;'+`select id from public.members where id='${id(1)}' for share;`);await b.ok("set lock_timeout='200ms'");const race=await b.q(`update public.members set is_active_member=false where id='${id(1)}'`);assert.match(race.error,/lock timeout/);await a.ok('rollback');
 // Role insertion into an empty set need not invent a lockable row. Revalidation
 // sees the committed new role on the next operation, with no actor elevation.
 await b.ok(`insert into public.user_roles(user_id,member_id,role) values(null,'${id(1)}','unsupported')`);assert.equal(await gate.ok(`select view_as_private.member_role('${id(1)}') is null`),'t');
 await b.ok(`delete from public.user_roles where member_id='${id(1)}'`);
 const result={postgres:await gate.ok('show server_version'),productionCompatibleNonSuperuser:true,loopbackOnly:true,modelCalls:0,changedFunctionCount:changed.length,metadataPreserved:true,grantsUnchanged:true,rlsUnchanged:true,businessRowsUnchangedByMigration:true,cleanApply:true,replay:true,secondReplay:true,partialRecovery:true,rollback:true,unsafeDriftRejected:variants.map(v=>v[0]),activeStateLock:true,roleInsertionRevalidated:true,...matrix};
 await writeFile('../docs/lms-0728-postgres-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const s of sessions)s.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}

