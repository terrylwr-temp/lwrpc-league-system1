// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=(process.argv[2]?.startsWith('--')?null:process.argv[2]) || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0729-record-'));
const data=path.join(dir,'data'); const port='56193';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {recordFixture,id,recordMigration} from '../test/helpers/liveRecordFixture.mjs';
import {readMigration} from '../test/helpers/implicitPlayerFixture.mjs';
import {recordMatrix} from '../test/helpers/liveRecordMatrix.mjs';
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
 const sql=await readMigration(recordMigration),rollback=await readFile('../docs/lms-0729-rollback.sql','utf8');
 const tables=(await db.query("select tablename from pg_tables where schemaname='public' order by 1")).rows;
 for(const {tablename}of tables)await gate.ok(`alter table public.${tablename} enable row level security`);
 const fingerprint=async()=>{const r=[];for(const {tablename}of tables)r.push([tablename,await gate.ok(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]') from public.${tablename} t`)]);return JSON.stringify(r)};
 const catalog=()=>gate.ok("select jsonb_agg(to_jsonb(x) order by x.oid) from (select oid,proowner,proacl,proconfig,prosecdef,prosrc from pg_proc where pronamespace in('view_as_private'::regnamespace,'ai_live_private'::regnamespace,'lms_read_private'::regnamespace)) x");
 const grants=()=>gate.ok("select jsonb_agg(to_jsonb(x) order by x.oid) from (select oid,relacl from pg_class where relnamespace='public'::regnamespace) x");
 const policies=()=>gate.ok('select jsonb_agg(to_jsonb(p) order by oid) from pg_policy p');
 const columns=()=>gate.ok("select coalesce(jsonb_agg(to_jsonb(x) order by attrelid,attnum),'[]') from (select attrelid,attnum,attacl from pg_attribute where attrelid in(select oid from pg_class where relnamespace='public'::regnamespace))x");
 const roles=()=>gate.ok("select jsonb_agg(to_jsonb(x) order by rolname) from (select rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls from pg_roles where rolname in('lms_view_as_reader','lms_view_as_executor'))x");
 const memberships=()=>gate.ok("select jsonb_agg(to_jsonb(x) order by roleid,member,grantor) from (select roleid,member,grantor,admin_option,inherit_option,set_option from pg_auth_members where roleid in('lms_view_as_reader'::regrole,'lms_view_as_executor'::regrole))x");
 const before=await fingerprint(),old=JSON.parse(await catalog()),acl=await grants(),col=await columns(),rls=await policies(),role=await roles(),membership=await memberships();
 await gate.ok(sql);await gate.ok(sql);await gate.ok(sql);
 assert.equal(await fingerprint(),before);assert.equal(await grants(),acl);assert.equal(await columns(),col);assert.equal(await policies(),rls);assert.equal(await roles(),role);assert.equal(await memberships(),membership);
 assert.equal(await gate.ok("select has_schema_privilege('lms_view_as_reader','lms_read_private','CREATE')"),'f');
 const changed=JSON.parse(await catalog()).filter(r=>JSON.stringify(r)!==JSON.stringify(old.find(o=>o.oid===r.oid)));assert.equal(changed.length,4);
 for(const r of changed){const prior=old.find(o=>o.oid===r.oid);if(prior)assert.deepEqual({...r,prosrc:prior.prosrc},prior);}
 assert.equal(await gate.ok('select current_user'),'postgres');
 const helper=JSON.parse(await gate.ok("select to_jsonb(x) from(select pg_get_userbyid(proowner) owner,prosecdef,proconfig from pg_proc where oid='lms_read_private.team_record(uuid,text,jsonb)'::regprocedure)x"));assert.equal(helper.owner,'lms_view_as_reader');assert.equal(helper.prosecdef,true);assert.deepEqual(helper.proconfig,['search_path=""']);
 await gate.ok(rollback);assert.deepEqual(JSON.parse(await catalog()),old);assert.equal(await fingerprint(),before);
 // Recover a prior partial local installation of the identity helper.
 await gate.ok(await readFile('scripts/lms0729-identity.sql','utf8'));await gate.ok(sql);await gate.ok(rollback);assert.deepEqual(JSON.parse(await catalog()),old);
 const variants=[['definer','alter function ai_live_private.lookup(uuid,uuid,jsonb) security definer'],['body',"create or replace function ai_live_private.lookup(p_actor uuid,p_request uuid,p_query jsonb) returns jsonb language sql as $$select '{}'::jsonb$$"],['path',"alter function ai_live_private.lookup(uuid,uuid,jsonb) set search_path=public"],['acl','grant execute on function ai_live_private.lookup(uuid,uuid,jsonb) to authenticated'],['owner','alter function ai_live_private.lookup(uuid,uuid,jsonb) owner to service_role'],['readerBypass','alter role lms_view_as_reader bypassrls'],['readerLogin','alter role lms_view_as_reader login'],['browserSchema','grant usage on schema lms_read_private to authenticated']];
 for(const [name,mutation]of variants){await admin.ok('begin;'+mutation+';set session authorization postgres;');const r=await admin.q(sql.replace(/^begin;$/m,'').replace(/^commit;$/m,''));assert.match(r.error,/drift/,name);await admin.ok('rollback;reset session authorization;');}
 const matrix=await recordMatrix(db);
 const a=new Session(),b=new Session();await a.ok('begin;'+`select ai_live_private.resolve_identity('${id(101)}');`);await b.ok("set lock_timeout='200ms'");
 const races=[];
 for(const mutation of [`update public.members set is_active_member=false where id='${id(1)}'`,`update auth.users set email='changed@example.invalid' where id='${id(101)}'`,`insert into public.user_roles(user_id,member_id,role) values('${id(101)}','${id(1)}','player')`]){const race=await b.q(mutation);assert.match(race.error,/identity_busy|lock timeout|could not obtain/i);races.push(true);}
 await a.ok('rollback');
 const result={postgres:await gate.ok('show server_version'),productionCompatibleNonSuperuser:true,loopbackOnly:true,modelCalls:0,helper,grantsUnchanged:true,columnGrantsUnchanged:true,readerAndExecutorRolesUnchanged:true,membershipsUnchanged:true,rlsUnchanged:true,businessRowsUnchangedByMigration:true,cleanApply:true,replay:true,secondReplay:true,partialRecovery:true,rollback:true,unsafeDriftRejected:variants.map(v=>v[0]),identityWriterRaces:races,...matrix};
 await writeFile('../docs/lms-0729-postgres-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));

}finally{for(const s of sessions)s.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}

