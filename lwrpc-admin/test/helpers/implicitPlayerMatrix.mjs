import assert from 'node:assert/strict';
import {id,migrationName,readMigration} from './implicitPlayerFixture.mjs';
const sql=await readMigration(migrationName);
const proof=n=>({id:id(700+n),actor:id(108),target:id(n),browser:String(n).repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()});
export async function call(db,op,input){await db.exec('set role service_role');try{return(await db.query('select public.lms_view_as($1,$2) result',[op,input])).rows[0].result;}finally{await db.exec('reset role');}}
export async function implicitMatrix(db){
 const role=async n=>(await db.query('select view_as_private.member_role($1) role',[id(n)])).rows[0].role;
 const before=(await db.query('select jsonb_agg(to_jsonb(u)) roles from user_roles u')).rows;
 for(let i=0;i<3;i++)await db.exec(sql);
 assert.deepEqual((await db.query('select jsonb_agg(to_jsonb(u)) roles from user_roles u')).rows,before);
 await db.exec(`delete from user_roles where member_id='${id(1)}';`); // Synthetic Marilyn state only.
 assert.equal(await role(1),'player');assert.equal(await role(9),'player');assert.equal(await role(2),'captain');
 await db.exec(`insert into user_roles values(null,'${id(2)}','club_pro')`);assert.equal(await role(2),'club_pro');
 await db.exec(`insert into user_roles values('${id(998)}','${id(3)}','player')`);assert.equal(await role(3),null);await db.exec(`delete from user_roles where user_id='${id(998)}'`);
 assert.equal(await role(999),null);
 for(const value of ['false','null']){await db.exec(`update members set is_active_member=${value} where id='${id(1)}'`);assert.equal(await role(1),null);assert.equal((await call(db,'preflight',{actor:id(108),target:id(1)})).allowed,false);}
 await db.exec(`update members set is_active_member=true where id='${id(1)}';insert into user_roles values(null,'${id(1)}','unsupported')`);assert.equal(await role(1),null);
 await db.exec(`delete from user_roles where member_id='${id(1)}'`);
 for(const actor of [101,102])assert.equal((await call(db,'preflight',{actor:id(actor),target:id(1)})).allowed,false);
 for(const actor of [107,108])assert.equal((await call(db,'preflight',{actor:id(actor),target:id(1)})).allowed,true);
 const p=proof(1);await call(db,'start',p);const viewer=await call(db,'exchange',p);assert.equal(viewer.role,'player');assert.equal(viewer.hasAuth,false);
 const page=await call(db,'page_read',{...p,contract:'dashboard',args:{}});assert.equal(page.viewer.memberId,id(1));assert.equal(page.viewer.role,'player');assert.deepEqual(page.tables.user_roles,[]);assert.deepEqual(page.viewer.managed,[]);
 assert.ok(!page.tables.member_season_ratings.some(r=>r.member_id===id(9)));assert.ok(!JSON.stringify(page).includes('dupr_reliability_rating'));
 const live=async q=>call(db,'live',{...p,request:id(900),query:q});
 assert.equal((await live({intent:'SELF_RATING',rating:'season',subjectKind:'SELF'})).value,'3.72');
 assert.equal((await live({intent:'ELIGIBILITY_SELF',rating:'season',subjectKind:'SELF',season:id(20)})).rf,28.999);
 assert.equal((await live({intent:'PLAYER_CONTACT',subjectKind:'EXPLICIT_PERSON',subject:id(9)})).status,'denied');
 const forged=await call(db,'live',{...p,target:id(9),request:id(901),query:{intent:'SELF_RATING',rating:'season'}});assert.ok(forged.denied||forged.status==='denied');
 assert.equal((await live({intent:'ELIGIBILITY_SELF',subjectKind:'SELF',rating:'season',subject:id(9)})).status,'denied');
 for(const r of ['anon','authenticated','service_role']){await db.exec('set role '+r);for(const q of ["select view_as_private.member_role('"+id(1)+"')","select view_as_private.lookup(null,null,null,null,'{}')"])await assert.rejects(db.exec(q),/permission/);await db.exec('reset role');}
 await db.exec('set role service_role');const normal=(await db.query("select public.ai_live_lookup($1,$2,$3) result",[id(101),id(905),{intent:'SELF_RATING',rating:'season'}])).rows[0].result;await db.exec('reset role');assert.equal(normal.status,'denied');
 await call(db,'end',p);assert.equal((await call(db,'resolve',p)).denied,true);
 const ended=(await db.query('select credential,code,context from view_as_private.contexts where id=$1',[p.id])).rows[0];assert.deepEqual(ended,{credential:null,code:null,context:null});
 await db.exec(`delete from user_roles where member_id='${id(9)}';delete from team_members where member_id='${id(9)}'`);
 const unrostered=proof(9);await call(db,'start',unrostered);assert.equal((await call(db,'exchange',unrostered)).role,'player');
 const empty=await call(db,'page_read',{...unrostered,contract:'dashboard',args:{}});assert.deepEqual(empty.viewer.teams,[]);assert.deepEqual(empty.viewer.managed,[]);await call(db,'end',unrostered);
 return {apply:true,replay:true,secondReplay:true,implicit:true,explicit:true,captain:true,multiRole:true,inactiveDenied:true,unknownDenied:true,privateAccessDenied:true,effectiveSelf:true,noRawRfProjection:true,forgedTargetDenied:true,exit:true,normalLive:'separate MUST-FIX'};
}
