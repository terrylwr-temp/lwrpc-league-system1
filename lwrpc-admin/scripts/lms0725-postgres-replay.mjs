// Diagnostic experiment only. NOT a deployable repair. Synthetic, loopback PostgreSQL.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0725-replay-'));
const data=path.join(dir,'data'); const port='56176';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];
import {fixture,id} from '../test/helpers/viewAsFixture.mjs';
class Session{
 constructor(){
  this.pending=null;this.buffer='';this.errors='';
  this.p=spawn(path.join(bin,'psql.exe'),['-X','-qAt','-h','127.0.0.1','-p',port,'-U','local_bootstrap','-d','postgres'],{env,windowsHide:true,stdio:'pipe'});
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


try {
 run('initdb.exe',['-D',data,'-U','local_bootstrap','-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const gate=new Session();await gate.ok('create role postgres nologin createrole bypassrls');
 const quote=v=>v==null?'null':typeof v==='number'?String(v):`'${(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")}'`;
 const adapter={exec:sql=>gate.ok(sql),query:async(sql,params=[])=>{const bound=sql.replace(/\$(\d+)/g,(_,n)=>quote(params[Number(n)-1]));if(!/^\s*select\b/i.test(bound)){await gate.ok(bound);return {rows:[]};}return {rows:JSON.parse(await gate.ok(`select coalesce(json_agg(x),'[]') from (${bound.replace(/;\s*$/,'')}) x;`))};}};
 await fixture(adapter);
 const read=name=>readFile(path.join(process.cwd(),'supabase/migrations',name),'utf8');
 for(const file of ['supabase-ai-assistant-lms-0712-stage6.sql','supabase-ai-assistant-lms-0716-stage7a.sql'])await gate.ok(await readFile(file,'utf8'));
 await gate.ok(await read('20260907110701_lms0723_live_intelligence.sql'));
 await gate.ok('revoke usage on schema auth from ai_live_session_reader');
 await gate.ok(await read('20260907131012_lms0723_server_session_validation.sql'));
 await gate.ok(await read('20260908011413_lms0724_view_as_authorization_locks.sql'));
 const migration=await read('20260908114532_lms0725_clarification_choices.sql');
 const metadata=()=>gate.ok("select json_agg(x order by signature) from (select oid::regprocedure::text signature,pg_get_userbyid(proowner) owner,prosecdef,proconfig,proacl::text from pg_proc where oid in ('ai_live_private.lookup(uuid,uuid,jsonb)'::regprocedure,'view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)'::regprocedure)) x;");
 await gate.ok("grant usage,create on schema ai_live_private,view_as_private to postgres;alter function ai_live_private.lookup(uuid,uuid,jsonb) owner to postgres;alter function view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb) owner to postgres;");
 const before=await metadata();
 await gate.ok('set role postgres');
 assert.equal(await gate.ok('select rolsuper from pg_roles where rolname=current_user;'),'f');
 for(let i=0;i<3;i++){await gate.ok(migration);assert.equal(await metadata(),before);}
 const normal=migration.match(/create or replace function ai_live_private\.lookup[\s\S]*?end \$\$;/)[0];
 await gate.ok(normal.replace('as $$',()=> 'as $$\n-- synthetic drift\n'));
 const drift=await gate.q(migration);assert.match(drift.error,/LMS-0725 lookup drift/);await gate.ok('rollback;');
 await gate.ok(normal);assert.equal(await metadata(),before);
 console.log(JSON.stringify({postgresVersion:await gate.ok('show server_version;'),migrationRole:'postgres',superuser:false,cleanApply:'PASS',replay:'PASS',secondReplay:'PASS',ownerAclSecuritySearchPath:'unchanged',sourceDrift:'rejected without partial apply'}));
}finally{for(const session of sessions)session.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}
