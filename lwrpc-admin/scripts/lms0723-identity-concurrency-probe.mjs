// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || 'C:/Program Files/PostgreSQL/18/bin';
const dir=await mkdtemp(path.join(tmpdir(),'lms0723-concurrency-'));
const data=path.join(dir,'data'); const port='56173';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[]; const results=[];
const id=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
class Session{
 constructor(){
  this.pending=null;this.buffer='';this.errors='';
  this.p=spawn(path.join(bin,'psql.exe'),['-X','-qAt','-h','127.0.0.1','-p',port,'-U','postgres','-d','postgres'],{env,windowsHide:true,stdio:'pipe'});
  this.p.stdout.on('data',b=>{this.buffer+=b; if(this.pending&&this.buffer.includes(this.pending.marker)){
   const {resolve,marker,timer}=this.pending;clearTimeout(timer);const out=this.buffer.slice(0,this.buffer.indexOf(marker)).trim();
   this.buffer=this.buffer.slice(this.buffer.indexOf(marker)+marker.length).trimStart();this.pending=null;resolve({out,error:this.errors});this.errors='';
  }});
  this.p.stderr.on('data',b=>this.errors+=b);
  this.p.on('error',e=>this.pending?.reject(e));sessions.push(this);
 }
 q(sql){assert.equal(this.pending,null);return new Promise((resolve,reject)=>{const marker=`DONE_${Math.random().toString(16).slice(2)}`;
  const timer=setTimeout(()=>reject(Error('isolated query timeout')),20000);
  this.pending={resolve,reject,marker,timer};this.p.stdin.write(`${sql}\n\\echo ${marker}\n`);
 });}
 async ok(sql){const r=await this.q(sql);assert.equal(r.error,'',r.error);return r.out;}
}
try{
 run('initdb.exe',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const a=new Session(),b=new Session(),gate=new Session();
 const version=await gate.ok('show server_version;');
 await gate.ok(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,email_change text,deleted_at timestamptz,banned_until timestamptz,is_anonymous boolean);
 create table members(id uuid primary key,email text,is_active_member boolean);
 create index idx_members_email on members(lower(email));
 create table user_roles(id uuid primary key default gen_random_uuid(),user_id uuid unique references auth.users(id) on delete cascade,
 member_id uuid references members(id) on delete set null,role text not null default 'player',created_at timestamptz default now(),updated_at timestamptz default now());
 create index user_roles_member_id_idx on user_roles(member_id);
 alter default privileges grant all on tables to anon,authenticated,service_role;
 alter default privileges grant execute on functions to anon,authenticated,service_role;
 create table teams(id int primary key,name text);
 `);
 const doc=await readFile(new URL('../../docs/lms-0723-identity-repair-sql-proposal.md',import.meta.url),'utf8');
 let sql=doc.match(/```sql\r?\n([\s\S]*?)\r?\n```/)[1];
 // Evaluate the tempting row-lock/advisory-lock replacement. Barrier is test-only.
 sql=sql.replace(/LOCK TABLE auth\.users IN SHARE MODE;\s*LOCK TABLE public\.members IN SHARE MODE;\s*LOCK TABLE public\.user_roles IN SHARE ROW EXCLUSIVE MODE;/,
 'PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_auth::text,0));');
 sql=sql.replace('  IF has_ar AND has_mr THEN',`  IF current_setting('test.barrier',true)='on' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(4723,1);
  END IF;
  IF has_ar AND has_mr THEN`);
 await gate.ok(sql);
 const reset=async(split=false)=>gate.ok(`truncate user_roles,members,auth.users,identity_repair_private.events cascade;
 insert into auth.users(id,email,email_confirmed_at) values('${id(1)}','one@example.invalid',now()),('${id(2)}','two@example.invalid',now());
 insert into members values('${id(11)}','one@example.invalid',true),('${id(12)}','two@example.invalid',true);
 insert into user_roles(id,user_id,member_id,role) values('${id(21)}','${id(2)}','${id(12)}','commissioner');
 ${split?`insert into user_roles(id,user_id,member_id,role) values('${id(22)}','${id(1)}',null,'commissioner'),('${id(23)}',null,'${id(11)}','commissioner');`:
 `insert into user_roles(id,user_id,member_id,role) values('${id(22)}',null,'${id(11)}','captain');`}`);
 const repair=`select identity_repair_private.reconcile('${id(99)}','${id(2)}','${id(1)}','${id(11)}');`;
 async function blockedOnBarrier(){
  for(let i=0;i<100;i++){
   if(Number(await gate.ok("select count(*) from pg_locks where locktype='advisory' and classid=4723 and objid=1 and not granted;"))>0)return;
   await new Promise(r=>setTimeout(r,20));
  }throw Error('barrier not reached');
 }
 for(const split of [false,true]){
  await reset(split);await gate.ok('select pg_advisory_lock(4723,1);');
  const first=a.q(`begin;set local test.barrier='on';${repair}commit;`);await blockedOnBarrier();
  const second=b.q(`begin;${repair}commit;`);
  await gate.ok(`insert into teams values(${split?2:1},'Synthetic concurrent registration');`);
  await gate.ok('select pg_advisory_unlock(4723,1);');
  const r1=await first,r2=await second;assert.equal(r1.error,'');assert.equal(r2.error,'');assert.match(r2.out,/already_linked/);
  assert.equal(await gate.ok('select count(*) from identity_repair_private.events;'),'1');
  results.push({gate:split?'C concurrent consolidation':'A same-identity repair',result:'pass',second:'already_linked',auditEvents:1,unrelatedTeamWrite:'completed'});
  assert.equal(await a.ok(repair),'already_linked');
 }
 results.push({gate:'D immediate rerun',result:'pass',auditEvents:1});
 await reset();await b.ok(`begin;update user_roles set role='league_manager' where id='${id(22)}';`);
 const pending=a.q(`begin;${repair}commit;`);
 // Wait until the repair is blocked on the legitimate row writer, then release it.
 for(let i=0;i<100;i++){if(Number(await gate.ok("select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%identity_repair_private.reconcile%';"))>0)break;await new Promise(r=>setTimeout(r,20));}
 await b.ok('commit;');const changed=await pending;assert.equal(changed.error,'');
 assert.equal(await gate.ok(`select role from user_roles where id='${id(22)}';`),'league_manager');
 results.push({gate:'B concurrent role change',result:'reviewed-state guard absent',roleOverwrite:false,repairAcceptedChangedRole:true});
 await reset();await b.ok(`update user_roles set user_id='${id(1)}',member_id='${id(12)}' where id='${id(22)}';`);
 const stale=await a.q(`begin;${repair}commit;`);assert.match(stale.error,/auth_already_linked_elsewhere|multiple_member_role_rows/);
 results.push({gate:'E conflict committed before revalidation',result:'pass/refused'});
 for(const isolation of ['read committed','serializable']){
  await reset();await gate.ok('select pg_advisory_lock(4723,1);');
  const tx=a.q(`begin isolation level ${isolation};set local test.barrier='on';${repair}commit;`);await blockedOnBarrier();
  // Legacy writer does not participate in advisory locks; this row did not exist to lock.
  await b.ok(`insert into members values('${id(13)}','one@example.invalid',true);`);
  await gate.ok('select pg_advisory_unlock(4723,1);');const done=await tx;assert.equal(done.error,'');
  assert.equal(await gate.ok("select count(*) from members where lower(btrim(email))='one@example.invalid';"),'2');
  assert.equal(await gate.ok(`select count(*) from user_roles where user_id='${id(1)}' and member_id='${id(11)}';`),'1');
  results.push({gate:`E concurrent duplicate candidate (${isolation} repair / read committed writer)`,result:'FAIL: both committed',candidateMembers:2,repairCommitted:true});
 }
 const result={diagnosticOnly:true,productionMutations:0,serverVersion:version,results,conclusion:'STOP: row/advisory locks alone do not satisfy required identity uniqueness with legacy writers'};
 await writeFile(new URL('../../docs/lms-0723-identity-concurrency-probe-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}finally{
 for(const s of sessions){s.p.stdin.end('\\q\n');s.p.kill();}
 if(started)run('pg_ctl.exe',['-D',data,'-m','fast','-w','stop']);
}
