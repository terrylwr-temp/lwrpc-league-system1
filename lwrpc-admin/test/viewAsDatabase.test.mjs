import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const migration=await readFile(new URL('../supabase/migrations/20260907201448_lms0724_view_as.sql',import.meta.url),'utf8');
import {id,fixture} from './helpers/viewAsFixture.mjs';
const browser='b'.repeat(64),code='c'.repeat(64),context='d'.repeat(64);
async function call(db,op,input){await db.exec('set role service_role');try{return(await db.query('select lms_view_as($1,$2) result',[op,input])).rows[0].result;}finally{await db.exec('reset role');}}
async function start(db,target=id(1),suffix=700){const base={id:id(suffix),actor:id(107),browser,context};await call(db,'start',{...base,target,binding:'synthetic binding',code,credential:'synthetic ciphertext',expires:new Date(Date.now()+600000).toISOString()});assert.equal((await call(db,'exchange',{...base,code})).role,target===id(2)?'captain':'player');return base;}
test('0724 effective database privileges, one-use exchange, target scope and lifecycle',async()=>{const db=await fixture();try{
 const denied=await call(db,'start',{id:id(699),actor:id(101),target:id(1),browser,code,binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()});assert.equal(denied.denied,true);
 const base=await start(db);
 assert.equal((await call(db,'exchange',{...base,code})).denied,true);
 assert.equal((await call(db,'resolve',{...base,context:'e'.repeat(64)})).denied,true);
 assert.equal((await call(db,'resolve',{...base,actor:id(108)})).denied,true);
 assert.equal((await call(db,'resolve',{...base,browser:'f'.repeat(64)})).denied,true);
 let r=await call(db,'live',{...base,request:id(800),query:{intent:'SELF_RATING',rating:'season'}});assert.equal(r.value,'3.72');assert.equal(r.label,'Synthetic Person1');
 assert.equal((await call(db,'live',{...base,request:id(801),query:{intent:'PLAYER_CONTACT',name:'Synthetic Person9'}})).status,'denied');
 const snapshot=await call(db,'snapshot',base);assert.deepEqual(snapshot.teams.map(t=>t.name),['Synthetic Team']);assert.ok(!JSON.stringify(snapshot).includes('example.invalid'));assert.equal(snapshot.rosters.length,1);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select lms_view_as($1,$2)',['resolve',base]),/permission/);await assert.rejects(db.exec('select * from view_as_private.contexts'),/permission/);await db.exec('reset role');}
 await db.exec('set role service_role');await assert.rejects(db.exec('select * from view_as_private.contexts'),/permission/);await assert.rejects(db.exec('update view_as_private.audit_events set reason=null'),/permission/);await db.exec('reset role');
 const before=(await db.query("select relname,relacl::text from pg_class where relname in('members','teams') order by relname")).rows;
 await db.exec(migration);assert.deepEqual((await db.query("select relname,relacl::text from pg_class where relname in('members','teams') order by relname")).rows,before);
 assert.equal((await call(db,'end',base)).ended,true);assert.equal((await call(db,'resolve',base)).denied,true);
 assert.deepEqual((await db.query('select event from view_as_private.audit_events order by id')).rows.map(r=>r.event),['VIEW_AS_STARTED','READ_DENIED','VIEW_AS_ENDED']);
 assert.equal((await db.query('select credential from view_as_private.contexts')).rows[0].credential,null);
}finally{await db.close();}});

test('0724 roles, six Live projections, no Auth target, current relationships and immutable audit',async()=>{const db=await fixture();try{
 for(let n=1;n<=6;n++)assert.equal((await call(db,'can_start',{actor:id(100+n)})).allowed,false);
 for(const n of [7,8])assert.equal((await call(db,'can_start',{actor:id(100+n)})).allowed,true);
 await db.exec(`update user_roles set user_id=null where member_id='${id(2)}'`);
 const base=await start(db,id(2));assert.equal((await call(db,'resolve',base)).hasAuth,false);
 const query=async q=>call(db,'live',{...base,request:id(801),query:q});
 for(const rating of ['season','primetime'])assert.equal((await query({intent:'SELF_RATING',rating})).status,'success');
 assert.equal((await query({intent:'PLAYER_RATING',name:'Synthetic Person1',rating:'season'})).value,'3.72');
 assert.equal((await query({intent:'PLAYER_CONTACT',name:'Synthetic Person1'})).value,'synthetic1@example.invalid');
 assert.equal((await query({intent:'SELF_TEAM'})).team,'Synthetic Team');
 assert.deepEqual((await query({intent:'TEAM_ROSTER'})).players,[{label:'Synthetic Person1'}]);
 assert.equal((await query({intent:'NEXT_MATCH'})).opponent,'Other Team');
 assert.equal((await query({intent:'PLAYER_CONTACT',subject:id(9)})).status,'not_found');
 const audit=(await db.query("select actor,effective_member,subject from view_as_private.audit_events where event='SENSITIVE_READ'")).rows;
 assert.ok(audit.length>=2);for(const row of audit)assert.deepEqual(row,{actor:id(107),effective_member:id(2),subject:id(1)});
 await db.exec(`update teams set captain_member_id=null where id='${id(30)}'`);
 assert.equal((await query({intent:'PLAYER_CONTACT',subject:id(1)})).status,'not_found');
 await db.exec(`update user_roles set role='player' where member_id='${id(7)}'`);
 assert.equal((await call(db,'resolve',base)).denied,true);
 assert.equal((await db.query('select end_reason from view_as_private.contexts')).rows[0].end_reason,'authorization_loss');
}finally{await db.close();}});

test('0724 expiration, credential erasure, target invalidation, rate limits and diagnostic privacy',async()=>{const db=await fixture();try{
 const base=await start(db);
 await call(db,'diagnostic',{...base,request:id(900),family:'LIVE_LMS_DATA',kind:'answer',total_ms:5,question:'DO NOT STORE',answer:'DO NOT STORE'});
 assert.ok(!JSON.stringify((await db.query('select * from view_as_private.diagnostic_outcomes')).rows).includes('DO NOT STORE'));
 await db.exec(`update view_as_private.contexts set expires_at=clock_timestamp()-interval '1 second'`);
 assert.equal((await call(db,'resolve',base)).denied,true);
 assert.equal((await db.query('select credential from view_as_private.contexts')).rows[0].credential,null);
 const other=await start(db,id(1),701);
 await db.exec(`update members set is_active_member=false where id='${id(1)}'`);
 assert.equal((await call(db,'resolve',other)).denied,true);
 await db.exec('select lms_view_as_maintenance()');
 for(const row of (await db.query("select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='view_as_private' and c.relkind='r'")).rows)assert.equal(row.relrowsecurity,true);
}finally{await db.close();}});

test('0724 table defaults revoked, effective column projections and audit failure close access',async()=>{const db=await fixture();try{
 for(const role of ['anon','authenticated','service_role'])for(const table of ['contexts','audit_events','diagnostic_outcomes','attempts']){const row=(await db.query("select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE') allowed",[role,'view_as_private.'+table])).rows[0];assert.equal(row.allowed,false);}
 await db.exec('alter table members enable row level security;alter table teams enable row level security;alter table user_roles enable row level security;');
 const base=await start(db,id(2));
 await db.exec(`create function fail_view_audit() returns trigger language plpgsql as $$begin raise exception 'synthetic audit unavailable';end$$;create trigger fail_view_audit before insert on view_as_private.audit_events for each row execute function fail_view_audit();`);
 await assert.rejects(call(db,'live',{...base,request:id(801),query:{intent:'PLAYER_CONTACT',subject:id(1)}}),/synthetic audit/);
}finally{await db.close();}});


test('0724 preflight checks actor and target without creating context',async()=>{const db=await fixture();try{
 for(let n=1;n<=6;n++)assert.equal((await call(db,'preflight',{actor:id(100+n),target:id(1)})).allowed,false);
 for(const n of [7,8])assert.deepEqual(await call(db,'preflight',{actor:id(100+n),target:id(1)}),{allowed:true,name:'Synthetic Person1'});
 assert.equal((await call(db,'preflight',{actor:id(107),target:id(999)})).allowed,false);
 assert.equal((await db.query('select count(*)::int n from view_as_private.contexts')).rows[0].n,0);
 await db.exec(`update members set is_active_member=false where id='${id(1)}'`);
 assert.equal((await call(db,'preflight',{actor:id(107),target:id(1)})).allowed,false);
 assert.equal((await call(db,'start',{id:id(799),actor:id(107),target:id(1),browser,code,binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()})).denied,true);
}finally{await db.close();}});

test('0724 Club Pro home-location scope is target-effective and never inherited from actor/division',async()=>{const db=await fixture();try{
 await db.exec(`update locations set club_pro_member_id='${id(6)}' where id='${id(40)}'; update teams set home_location_id='${id(40)}' where id='${id(30)}'; insert into locations(id,name,club_pro_member_id) values('${id(41)}','Unrelated Courts','${id(5)}'); update teams set home_location_id='${id(41)}' where id='${id(31)}'; insert into teams(id,division_id,name,is_active) values('${id(32)}','${id(22)}','No Location',true);`);
 const input={id:id(780),actor:id(108),target:id(6),browser,code,context,binding:'synthetic',credential:'synthetic',expires:new Date(Date.now()+600000).toISOString()};
 await call(db,'start',input);assert.equal((await call(db,'exchange',input)).role,'club_pro');
 const snapshot=()=>call(db,'snapshot',input);
 assert.deepEqual((await snapshot()).teams.map(t=>t.id),[id(30)]);
 assert.equal((await call(db,'live',{...input,request:id(880),query:{intent:'PLAYER_CONTACT',subject:id(1)}})).status,'not_found','dashboard location scope must not broaden narrower Live contact scope');
 await db.exec(`update locations set club_pro_member_id=null,club_pro_2_member_id='${id(6)}' where id='${id(40)}'`);assert.deepEqual((await snapshot()).teams.map(t=>t.id),[id(30)]);
 await db.exec(`update teams set home_location_id=null where id='${id(30)}'`);assert.deepEqual((await snapshot()).teams,[]);
 await db.exec(`update teams set home_location_id='${id(41)}' where id='${id(30)}'`);assert.deepEqual((await snapshot()).teams,[]);
 await db.exec(`update teams set club_pro_member_id='${id(6)}' where id='${id(30)}'`);assert.deepEqual((await snapshot()).teams.map(t=>t.id),[id(30)],'explicit team assignment remains supported');
 assert.equal((await call(db,'preflight',{actor:id(107),target:id(6)})).allowed,true);
}finally{await db.close();}});
