import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {id,recordMigration} from './liveRecordFixture.mjs';
import {readMigration} from './implicitPlayerFixture.mjs';
import {call} from './implicitPlayerMatrix.mjs';
export async function recordMatrix(db){
 const sql=await readMigration(recordMigration);await db.exec(sql);await db.exec(sql);
 const lookup=async(actor,q)=>{await db.exec('set role service_role');try{return(await db.query('select public.ai_live_lookup($1,$2,$3) result',[id(actor),id(990),q])).rows[0].result;}finally{await db.exec('reset role');}};
 const q={intent:'TEAM_RECORD',subjectKind:'SELF',self:true,projection:'record'};
 let r=await lookup(101,q);assert.equal(r.status,'success');assert.equal(r.wins,3);assert.equal(Number(r.points),12.5);assert.ok(!('rank'in r));assert.ok(!JSON.stringify(r).includes('DO NOT READ'));
 for(const a of [102,103,104,105])assert.equal((await lookup(a,q)).team,'Synthetic Team');
 assert.equal((await lookup(108,q)).status,'no_team');
 assert.equal((await lookup(109,q)).status,'missing');
 assert.equal((await lookup(101,{...q,team:id(31)})).status,'denied');
 await db.exec(`insert into team_members(team_id,member_id,is_active) values('${id(31)}','${id(1)}',true)`);
 r=await lookup(101,q);assert.equal(r.status,'ambiguous');assert.equal(r.choices.length,2);assert.equal((await lookup(101,{...q,team:id(30)})).wins,3);
 await db.exec(`delete from team_members where team_id='${id(31)}' and member_id='${id(1)}'`);
 await db.exec(`update members set is_active_member=false where id='${id(1)}'`);assert.equal((await lookup(101,q)).status,'denied');
 await db.exec(`update members set is_active_member=true where id='${id(1)}';update auth.users set email_change='other@example.invalid' where id='${id(101)}'`);assert.equal((await lookup(101,q)).status,'denied');
 await db.exec(`update auth.users set email_change='' where id='${id(101)}'`);
 await db.exec('set role service_role');r=(await db.query('select public.ai_live_feedback($1,$2,true,$3) result',[id(101),id(993),{intent:'TEAM_RECORD',status:'success',relationship:'self',origin:'player_interface'}])).rows[0].result;await db.exec('reset role');assert.equal(r.changed,true);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select lms_read_private.team_record($1,$2,$3)',[id(1),'player',q]));await db.exec('reset role');}
 const p={id:id(778),actor:id(108),target:id(1),browser:'a'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 await call(db,'start',p);await call(db,'exchange',p);r=await call(db,'live',{...p,request:id(994),query:q});assert.equal(r.wins,3);assert.ok(!('rank'in r));await call(db,'end',p);
 // Additional isolated identity/feedback and record boundary controls.
 const identity=async actor=>(await db.query('select ai_live_private.resolve_identity($1) result',[id(actor)])).rows[0].result;
 assert.equal((await identity(101)).role,'player');
 for(const [column,value]of [['deleted_at','now()'],['banned_until',"now()+interval '1 day'"],['is_anonymous','true'],['email_confirmed_at','null']]){
  await db.exec(`update auth.users set ${column}=${value} where id='${id(101)}'`);assert.equal(await identity(101),null,column);
  await db.exec(`update auth.users set ${column}=${column==='email_confirmed_at'?'now()':'null'} where id='${id(101)}'`);
 }
 await db.exec(`insert into members(id,email,is_active_member) values('${id(801)}','synthetic1@example.invalid',true)`);assert.equal(await identity(101),null);await db.exec(`delete from members where id='${id(801)}'`);
 await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${id(801)}','synthetic1@example.invalid',now())`);assert.equal(await identity(101),null);await db.exec(`delete from auth.users where id='${id(801)}'`);
 await db.exec(`insert into user_roles(user_id,member_id,role) values(null,'${id(1)}','unsupported')`);assert.equal(await identity(101),null);await db.exec(`delete from user_roles where member_id='${id(1)}'`);
 await db.exec(`insert into user_roles(user_id,member_id,role) values(null,'${id(2)}','club_pro')`);assert.equal((await identity(102)).role,'club_pro');await db.exec(`delete from user_roles where member_id='${id(2)}' and role='club_pro'`);
 await assert.rejects(db.exec(`insert into user_roles(user_id,member_id,role) values('${id(102)}','${id(9)}','player')`),/identity_conflict/);assert.equal((await identity(102)).role,'captain');
 await db.exec('delete from ai_live_private.attempts');
 assert.equal((await lookup(101,{...q,self:false,subjectKind:'NONE',teamName:'Other Team'})).status,'missing');
 assert.equal((await lookup(101,{...q,self:false,subjectKind:'NONE',team:id(31)})).status,'denied');
 assert.equal((await lookup(101,{...q,scopeName:'Unrelated Division'})).status,'no_team');
 assert.equal((await lookup(101,{...q,scopeName:'Synthetic Division'})).wins,3);
 await db.exec(`update team_standings set league_id='${id(999)}' where team_id='${id(30)}'`);assert.equal((await lookup(101,q)).status,'missing');await db.exec(`update team_standings set league_id='${id(21)}' where team_id='${id(30)}'`);
 await db.exec(`update team_standings set matches_played=7 where team_id='${id(30)}'`);assert.equal((await lookup(101,q)).status,'missing');await db.exec(`update team_standings set matches_played=6 where team_id='${id(30)}'`);
 await db.exec(`insert into seasons(id,name,is_active) values('${id(820)}','Synthetic Previous Season',false);insert into leagues(id,season_id,name,is_active) values('${id(821)}','${id(820)}','Historic League',false);insert into divisions(id,league_id,name,is_active) values('${id(822)}','${id(821)}','Historic Division',false);insert into teams(id,division_id,name,is_active) values('${id(830)}','${id(822)}','Historic Team',false);insert into team_members(team_id,member_id,is_active) values('${id(830)}','${id(1)}',true);insert into team_standings(team_id,division_id,league_id,match_wins,match_losses,match_ties,matches_played,standings_points) values('${id(830)}','${id(822)}','${id(821)}',10,0,0,10,50);`);
 await db.exec('delete from ai_live_private.attempts');
 assert.equal((await lookup(101,q)).wins,3);assert.equal((await lookup(101,{...q,seasonName:'Synthetic Previous Season'})).wins,10);assert.equal((await lookup(101,{...q,seasonName:'__clarify_history__'})).wins,10);
 // Normal feedback revalidates identity, has no member payload, and is idempotent.
 const feedback=async actor=>{await db.exec('set role service_role');try{return(await db.query('select public.ai_live_feedback($1,$2,true,$3) result',[id(actor),id(993),{intent:'TEAM_RECORD',status:'success',relationship:'self',origin:'player_interface'}])).rows[0].result;}finally{await db.exec('reset role');}};
 assert.equal((await feedback(101)).changed,false);
 await db.exec(`update members set is_active_member=false where id='${id(1)}'`);await assert.rejects(feedback(101),/authorization/);await db.exec(`update members set is_active_member=true where id='${id(1)}'`);

 // Real actor has a different team: SELF and forged selection stay with target.
 await db.exec(`insert into team_members(team_id,member_id,is_active) values('${id(31)}','${id(8)}',true)`);
 const p2={...p,id:id(779)};await call(db,'start',p2);await call(db,'exchange',p2);
 assert.equal((await call(db,'live',{...p2,request:id(995),query:q})).team,'Synthetic Team');
 assert.equal((await call(db,'live',{...p2,request:id(996),query:{...q,team:id(31)}})).status,'denied');
 const forged=await call(db,'live',{...p2,target:id(9),request:id(997),query:q});assert.ok(forged.denied||forged.status==='denied');await call(db,'end',p2);
 const route=await readFile(new URL('../../app/api/view-as/read/route.js',import.meta.url),'utf8');assert.match(route,/delete result.feedbackReceipt/);
 return {identityInvalidStates:true,identityDuplicatesDenied:true,multiRolePreserved:true,historicalScoped:true,provenanceMismatchDenied:true,inconsistentRecordDenied:true,namedStandingsOnly:true,feedbackRevalidated:true,feedbackIdempotent:true,realActorTeamBleedDenied:true,implicit:true,captain:true,coCaptain:true,clubPro:true,managerSelfNotAll:true,explicit:true,noRecord:true,forgedTeamDenied:true,multiTeam:true,invalidDenied:true,feedback:true,viewAsEffective:true,rankAbsent:true,browserDenied:true};
}