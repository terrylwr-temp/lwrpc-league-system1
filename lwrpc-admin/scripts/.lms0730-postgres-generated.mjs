import {scheduleNamesMatrix,scheduleMigration} from '../test/helpers/scheduleNamesMatrix.mjs';
// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=(process.argv[2]?.startsWith('--')?null:process.argv[2]) || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0730-names-'));
const data=path.join(dir,'data'); const port='56194';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {recordFixture,recordMigration} from '../test/helpers/liveRecordFixture.mjs';
import {readMigration} from '../test/helpers/implicitPlayerFixture.mjs';

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
 q(sql){sql=sql.replace(/\$(\w*)\$([\s\S]*?)\$\1\$/g,(whole,tag,body)=>body.includes('\r')?"E'"+body.replaceAll('\\','\\\\').replaceAll("'","''").replaceAll('\r','\\r').replaceAll('\n','\\n')+"'":whole);assert.equal(this.pending,null);return new Promise((resolve,reject)=>{const marker=`DONE_${Math.random().toString(16).slice(2)}`;
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
 await recordFixture(db,async()=>{await admin.ok('grant anon,authenticated,service_role to postgres with inherit false,set true;alter role postgres nosuperuser;grant lms_view_as_executor to postgres with admin true,inherit false,set false;');await gate.ok('grant lms_view_as_executor to postgres with admin false,inherit false,set true;');});
 await admin.ok('grant anon,authenticated,service_role to postgres with inherit false,set true;grant lms_view_as_reader to postgres with admin true,inherit false,set false;alter role postgres nosuperuser;');

 await gate.ok(await readMigration(recordMigration));
 const snapshot=()=>gate.ok("select jsonb_build_object('tables',(select jsonb_agg(jsonb_build_object('oid',oid,'acl',relacl,'rls',relrowsecurity) order by oid) from pg_class where relnamespace='public'::regnamespace),'columns',(select jsonb_agg(jsonb_build_object('table',attrelid,'column',attnum,'acl',attacl) order by attrelid,attnum) from pg_attribute a where attrelid in(select oid from pg_class where relnamespace='public'::regnamespace)),'policies',(select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p),'memberships',(select jsonb_agg(to_jsonb(m) order by oid) from pg_auth_members m),'schemas',(select jsonb_agg(to_jsonb(n) order by oid) from pg_namespace n where nspname in('view_as_private','lms_read_private')))");
 const before=await snapshot();const old=await gate.ok("select prosrc from pg_proc where oid='view_as_private.page_read(jsonb,text,jsonb)'::regprocedure");
 const matrix=await scheduleNamesMatrix(db);assert.equal(await snapshot(),before);
 assert.equal(await gate.ok("select has_schema_privilege('lms_view_as_reader','view_as_private','CREATE')"),'f');
 await gate.ok(await readFile('../docs/lms-0730-rollback.sql','utf8'));assert.equal(await snapshot(),before);assert.equal(await gate.ok("select prosrc from pg_proc where oid='view_as_private.page_read(jsonb,text,jsonb)'::regprocedure"),old);
 await gate.ok(await readMigration(scheduleMigration));
 const result={postgres:await gate.ok('show server_version'),productionCompatibleNonSuperuser:true,grantsColumnsPoliciesMembershipsSchemasUnchanged:true,rollback:true,reapply:true,...matrix,modelCalls:0};
 await writeFile('../docs/lms-0730-postgres-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const s of sessions)s.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}
