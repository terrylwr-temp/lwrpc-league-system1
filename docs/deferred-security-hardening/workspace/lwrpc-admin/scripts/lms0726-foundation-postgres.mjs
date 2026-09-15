// LMS-0726 synthetic loopback PostgreSQL verification. No production connection.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const bin=process.argv[2] || path.join(tmpdir(),'lms0723-pg17-runtime/pgsql/bin');
const dir=await mkdtemp(path.join(tmpdir(),'lms0726-foundation-'));
const data=path.join(dir,'data'); const port='56186';
const env={...process.env}; for(const k of Object.keys(env))if(k.startsWith('PG'))delete env[k];
const run=(exe,args)=>{const r=spawnSync(path.join(bin,exe),args,{env,windowsHide:true,encoding:'utf8',stdio:exe==='pg_ctl.exe'?'ignore':'pipe'});if(r.status!==0)throw Error(`${exe}: ${r.stderr||r.stdout||r.error||r.status}`);return r.stdout;};
let started=false; const sessions=[];

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



import {foundationDatabase,phase1,id} from '../test/helpers/lms0726Database.mjs';
import {writeFile} from 'node:fs/promises';
const quote=v=>v==null?'null':"'"+(typeof v==='object'?JSON.stringify(v):String(v)).replaceAll("'","''")+"'";
try {
 run('initdb.exe',['-D',data,'-U','postgres','-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl.exe',['-D',data,'-l',path.join(dir,'server.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);started=true;
 const session=new Session();
 const db={exec:s=>session.ok(s),query:async(sql,args=[])=>{sql=sql.replace(/\$(\d+)/g,(_,n)=>quote(args[Number(n)-1]));if(/^select/i.test(sql.trim()))return {rows:JSON.parse(await session.ok("select coalesce(json_agg(x),'[]') from ("+sql+") x;"))};await session.ok(sql);return {rows:[]};}};
 await foundationDatabase(db);await db.exec(phase1);await db.exec(phase1);
 const second=new Session();await second.ok('select 1');
 await session.ok('begin');
 const call=`select public.lms_roster_remove_player('${id(102)}','${id(30)}','${id(700)}','${id(800)}')`;
 const first=JSON.parse(await session.ok(call));assert.equal(first.status,'REMOVED');
 let completed=false;
 const pending=second.ok(call).then(out=>{completed=true;return JSON.parse(out)});
 // Observe database lock blocking rather than infer serialization from elapsed time.
 const locked="select count(*) from pg_locks where not granted and pid<>pg_backend_pid() and relation='public.user_roles'::regclass";
 if(Number(await session.ok(locked))===0)await session.ok('select pg_sleep(0.1)');
 assert.ok(Number(await session.ok(locked))>0);
 assert.equal(completed,false);await session.ok('commit');
 const replay=await pending;assert.equal(replay.status,'REMOVED');assert.equal(replay.replayed,true);assert.equal(replay.operationId,first.operationId);
 assert.equal(await session.ok('select count(*) from lms_write_private.operation_receipts'),'1');
 // Authority changes committed while Remove waits must be re-read after the lock.
 await session.ok(`insert into team_members(id,team_id,member_id) values('${id(701)}','${id(30)}','${id(1)}')`);
 await session.ok(`begin;update user_roles set role='player' where user_id='${id(102)}'`);
 const authorityCall=`select public.lms_roster_remove_player('${id(102)}','${id(30)}','${id(701)}','${id(801)}')`;
 const authorityPending=second.ok(authorityCall);
 if(Number(await session.ok(locked))===0)await session.ok('select pg_sleep(0.1)');
 assert.ok(Number(await session.ok(locked))>0);
 await session.ok('commit');assert.equal(JSON.parse(await authorityPending).status,'NOT_AUTHORIZED');
 await session.ok(`update user_roles set role='captain' where user_id='${id(102)}'`);
 // A new future assignment committed before Remove's dependency lock must block deletion.
 await session.ok(`begin;insert into match_lineups(match_id,team_id,line_number,player_1_member_id,player_2_member_id) values('${id(50)}','${id(30)}',1,'${id(1)}','${id(2)}')`);
 const dependencyPending=second.ok(authorityCall);
 const lineupLocked="select count(*) from pg_locks where not granted and pid<>pg_backend_pid() and relation='public.match_lineups'::regclass";
 if(Number(await session.ok(lineupLocked))===0)await session.ok('select pg_sleep(0.1)');
 assert.ok(Number(await session.ok(lineupLocked))>0);
 await session.ok('commit');assert.equal(JSON.parse(await dependencyPending).reasonCodes[0],'FUTURE_LINEUP_DEPENDENCY');
 assert.equal(await session.ok(`select count(*) from team_members where id='${id(701)}'`),'1');
 const result={postgresVersion:await session.ok('show server_version'),loopbackOnly:true,productionAccess:false,modelCalls:0,cleanApply:true,replay:true,secondReplay:true,concurrentRemoveReplay:true,authorityRevocationRace:true,futureLineupInsertionRace:true,oneCommittedReceipt:true,scope:'Partial foundation; remaining release checks not yet run'};
 await writeFile('../docs/lms-0726-foundation-postgres-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{for(const s of sessions)s.p.kill();if(started)run('pg_ctl.exe',['-D',data,'-m','immediate','-w','stop']);}



