import assert from 'node:assert/strict';
import {id,recordMigration} from './liveRecordFixture.mjs';
import {readMigration} from './implicitPlayerFixture.mjs';
import {call} from './implicitPlayerMatrix.mjs';
import {mergeScheduleCaptainNames} from '../../app/lib/scheduleCaptainNames.js';
export const scheduleMigration='20260909231834_lms0730_schedule_captain_names.sql';
export async function scheduleNamesMatrix(db) {
 await db.exec(await readMigration(recordMigration));
 const snapshot=async()=>JSON.stringify((await db.query("select jsonb_build_object('teams',(select jsonb_agg(to_jsonb(t)) from teams t),'members',(select jsonb_agg(to_jsonb(t)) from members t),'matches',(select jsonb_agg(to_jsonb(t)) from matches t),'policies',(select jsonb_agg(to_jsonb(p)) from pg_policy p),'acl',(select jsonb_agg(jsonb_build_object('id',oid,'acl',relacl)) from pg_class where relnamespace='public'::regnamespace)) data")).rows);
 const before=await snapshot();await db.exec(await readMigration(scheduleMigration));await db.exec(await readMigration(scheduleMigration));assert.equal(await snapshot(),before);
 await db.exec(`update teams set captain_member_id='${id(9)}',co_captain_member_id='${id(6)}',co_captain_2_member_id='${id(7)}' where id='${id(31)}'; update members set full_name=first_name||' '||last_name;`);
 await db.exec(`delete from auth.users where id='${id(101)}';insert into divisions(id,league_id,name,is_active) values('${id(25)}','${id(21)}','Unrelated inactive division',false);insert into teams(id,division_id,name,is_active,captain_member_id) values('${id(35)}','${id(25)}','Unrelated team',true,'${id(9)}');`);
 let seq=700;const roles=[];
 for(const [target,role] of [[1,'player'],[2,'captain'],[3,'captain'],[4,'captain'],[5,'club_pro']]) {
  const p={id:id(seq++),actor:id(108),target:id(target),browser:'a'.repeat(64),code:'c'.repeat(64),context:'d'.repeat(64),binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
  await call(db,'start',p);await call(db,'exchange',p);
  const args={divisionId:id(22)};
  const read=async a=>call(db,'page_read',{...p,contract:'schedule_captains',args:a});
  const dashboard=await call(db,'page_read',{...p,contract:'dashboard',args:{}});
  assert.equal(dashboard.viewer.role,role);
  const result=await read(args);assert.deepEqual(result.teams.map(t=>t.id),[id(30),id(31)]);
  const other=result.teams.find(t=>t.id===id(31));assert.equal(other.captain.full_name,'Synthetic Person9');assert.equal(other.co_captain_1.full_name,'Synthetic Person6');assert.equal(other.co_captain_2.full_name,'Synthetic Person7');
  for(const row of result.teams){assert.deepEqual(Object.keys(row).sort(),['captain','co_captain_1','co_captain_2','id']);for(const key of ['captain','co_captain_1','co_captain_2'])if(row[key])assert.deepEqual(Object.keys(row[key]).sort(),['first_name','full_name','id','last_name']);}
  assert.deepEqual(await call(db,'page_read',{...p,contract:'dashboard',args:{}}),dashboard);
  for(const bad of [{...args,team:id(31)},{...args,memberId:id(9)},{divisionId:id(999)},{divisionId:id(25)},[],null])await assert.rejects(read(bad));
  assert.equal((await call(db,'page_read',{...p,actor:id(107),contract:'schedule_captains',args})).denied,true);
  await db.exec(`update teams set is_active=false where id='${id(31)}'`);assert.deepEqual((await read(args)).teams.map(t=>t.id),[id(30)]);await db.exec(`update teams set is_active=true where id='${id(31)}'`);
  await db.exec(`update members set first_name=null,last_name=null,full_name=null where id='${id(9)}'`);
  const empty=(await read(args)).teams.find(t=>t.id===id(31));assert.equal(empty.captain.full_name,null);assert.ok(!JSON.stringify(empty).includes('email'));
  const merged=mergeScheduleCaptainNames([{id:id(31),captain:{email:'sensitive'},scheduled_date:'unchanged'}],[empty]);assert.equal(merged[0].scheduled_date,'unchanged');assert.ok(!JSON.stringify(merged).includes('sensitive'));
  await db.exec(`update members set first_name='Synthetic',last_name='Person9',full_name='Synthetic Person9' where id='${id(9)}'`);
  await db.exec(`update teams set captain_member_id='${id(7)}',co_captain_2_member_id=null where id='${id(31)}'`);
  const changed=(await read(args)).teams.find(t=>t.id===id(31));assert.equal(changed.captain.full_name,'Synthetic Person7');assert.equal(changed.co_captain_2,null);
  await db.exec(`update teams set captain_member_id='${id(9)}',co_captain_2_member_id='${id(7)}' where id='${id(31)}'`);
  await call(db,'end',p);assert.equal((await read(args)).denied,true);roles.push(role);
 }
 for(const role of ['anon','authenticated','service_role','lms_view_as_executor']){await db.exec('set role '+role);await assert.rejects(db.query("select lms_read_private.schedule_captains('{}','{}')"));await db.exec('reset role');}
 return {roles,replay:true,businessRowsUnchangedByMigration:true,dashboardUnchanged:true,activeTeams:true,noPrivateFields:true,arbitraryScopeDenied:true,endedContextDenied:true};
}
