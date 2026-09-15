// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0724-concurrency-'));
const data=path.join(dir,'data'); const port='56175';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {fixture,id} from '../test/helpers/viewAsFixture.mjs';
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
  this.pending={resolve,reject,marker,timer};this.p.stdin.write(`${sql}\n;\n\\echo ${marker}\n`);
 });}
 async ok(sql){const r=await this.q(sql);assert.ok(!/ERROR:|FATAL:/.test(r.error),r.error);return r.out;}
}

// Real independent-session verification of the actual corrective migration.
try {
 run('initdb.exe',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const a=new Session(),b=new Session(),gate=new Session();
 const version=await gate.ok('show server_version;');
 const quote=v=>v==null?'null':typeof v==='number'?String(v):`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
 let migrationOwnerReady=false;
 const adapter={exec:async sql=>{
  if(!sql.startsWith('-- LMS-0724:'))return gate.ok(sql);
  if(!migrationOwnerReady){
   await gate.ok("create role synthetic_migration_owner nologin createrole bypassrls;grant create on database postgres to synthetic_migration_owner;alter schema public owner to synthetic_migration_owner;alter default privileges for role synthetic_migration_owner grant all on tables to anon,authenticated,service_role;alter default privileges for role synthetic_migration_owner grant all on sequences to anon,authenticated,service_role;");
   const names=JSON.parse(await gate.ok("select json_agg(tablename) from pg_tables where schemaname='public';"));
   for(const name of names)await gate.ok('alter table public.'+name+' owner to synthetic_migration_owner;');
   migrationOwnerReady=true;
  }
  try{return await gate.ok('set role synthetic_migration_owner;'+sql);}finally{await gate.ok('reset role;');}
 },query:async(sql,params=[])=>{
  const bound=sql.replace(/\$(\d+)/g,(_,n)=>quote(params[Number(n)-1]));
  if(/^\s*select\b/i.test(bound))return{rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${bound.replace(/;\s*$/,'')}) x;`))};
  await gate.ok(bound);return{rows:[]};
 }};


 await fixture(adapter);
 for(const table of ['members','user_roles','teams','team_members','seasons','leagues','divisions','member_season_ratings','locations','team_standings','matches','system_settings'])await gate.ok('alter table public.'+table+' enable row level security');
 const base={id:id(700),actor:id(107),target:id(1),browser:'b'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 const call=(op,input=base)=>'select public.lms_view_as('+quote(op)+','+quote(input)+'::jsonb);';
 const query={...base,request:id(800),query:{intent:'SELF_RATING',rating:'season',subjectKind:'SELF'}};
 await gate.ok('set role service_role;'+call('start'));await gate.ok(call('exchange'));
 assert.equal(JSON.parse(await gate.ok(call('live',query))).status,'denied');
 const correction=await readFile(path.join(process.cwd(),'supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql'),'utf8');
 await gate.ok('reset role;set role synthetic_migration_owner;'+correction);await gate.ok('reset role;');
 const state=()=>gate.ok("select json_agg(x order by signature) from(select oid::regprocedure::text signature,proowner,prosecdef,proconfig,proacl::text,md5(prosrc) from pg_proc where pronamespace='view_as_private'::regnamespace or proname='lms_view_as') x;");
 const before=await state();await gate.ok('set role synthetic_migration_owner;'+correction);await gate.ok('reset role;');assert.equal(await state(),before);
 await gate.ok('set role service_role;');const result=JSON.parse(await gate.ok(call('live',query)));assert.equal(result.value,'3.72');assert.equal(result.subject,id(1));
 assert.equal(JSON.parse(await gate.ok(call('live',{...query,query:{intent:'PLAYER_CONTACT',name:'Synthetic Person9'}}))).status,'denied');
 for(const bad of [{actor:id(108)},{target:id(9)},{context:'e'.repeat(64)},{browser:'e'.repeat(64)}])assert.equal(JSON.parse(await gate.ok(call('resolve',{...base,...bad}))).denied,true);
 await gate.ok('reset role;');
 for(const role of ['anon','authenticated','service_role']){
  const denied=await gate.q('set role '+role+";select view_as_private.lock_authorization('{}','identity');");assert.match(denied.error,/permission denied/);await gate.ok('reset role;');
 }
 await gate.ok('set role lms_view_as_executor;');
 for(const [table,col] of [['members','id'],['user_roles','member_id'],['teams','id'],['team_members','member_id'],['seasons','id'],['leagues','id'],['divisions','id']]){const denied=await gate.q('update public.'+table+' set '+col+'='+col+';');assert.match(denied.error,/permission denied/);}
 await gate.ok('reset role;');
 // A completed live read holds identity locks until transaction end.
 await a.ok('set role service_role;begin;'+call('live',query));
 let mutated=false;const change=b.ok("update public.members set is_active_member=false where id='"+id(1)+"';").then(()=>{mutated=true;});
 await new Promise(r=>setTimeout(r,150));assert.equal(mutated,false,'target invalidation waits for read transaction');
 await a.ok('commit;');await change;
 assert.equal(JSON.parse(await a.ok(call('resolve'))).denied,true,'next read rejects invalid target');
 await gate.ok("update public.members set is_active_member=true where id='"+id(1)+"';");
 const next={...base,id:id(701),code:'e'.repeat(64),context:'f'.repeat(64)};
 await gate.ok('set role service_role;'+call('start',next));await gate.ok(call('exchange',next));await gate.ok('reset role;');
 // Invalidation winning first is observed after the helper waits on the lock.
 await b.ok("begin;update public.user_roles set role='player' where user_id='"+id(107)+"';");
 let completed=false;const waiting=a.ok(call('resolve',next)).then(x=>{completed=true;return x;});
 await new Promise(r=>setTimeout(r,150));assert.equal(completed,false);await b.ok('commit;');assert.equal(JSON.parse(await waiting).denied,true);
 console.log(JSON.stringify({version,originalRlsFailure:'reproduced',nonSuperApply:'PASS',replay:'unchanged',self:'target 3.72',crossPlayer:'denied',tampering:'denied',browserHelper:'denied',operationalUpdates:'denied all 7',targetInvalidationRace:'serialized',actorRoleLossRace:'denied after wait'}));
}finally{for(const session of sessions)session.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}
