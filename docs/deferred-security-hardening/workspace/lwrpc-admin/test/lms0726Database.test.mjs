import test from 'node:test';
import assert from 'node:assert/strict';
import { foundationDatabase, phase1, id } from './helpers/lms0726Database.mjs';

test('additive foundation replay, bounded Remove role/lock/dependency/history and replay controls', async () => {
  const db = await foundationDatabase();
  try {
    await db.exec(phase1); await db.exec(phase1);
    const remove = async (actor = 102, request = 800) => {
      await db.exec('set role service_role');
      try { return (await db.query('select public.lms_roster_remove_player($1,$2,$3,$4) result', [id(actor), id(30), id(700), id(request)])).rows[0].result; }
      finally { await db.exec('reset role'); }
    };
    for (const actor of [101, 105, 106, 109]) assert.equal((await remove(actor)).status, 'NOT_AUTHORIZED');
    await db.exec(`update leagues set rosters_locked=true;`);
    assert.equal((await remove()).status, 'REMOVAL_NOT_ALLOWED');
    await db.exec(`insert into match_lineups(match_id,team_id,line_number,player_1_member_id,player_2_member_id) values('${id(50)}','${id(30)}',1,'${id(1)}','${id(2)}');`);
    const managerBlocked = await remove(107);
    assert.equal(managerBlocked.reasonCodes[0], 'FUTURE_LINEUP_DEPENDENCY');
    assert.equal((await db.query('select count(*)::int n from lms_write_private.operation_receipts')).rows[0].n, 0);
    await db.exec(`update leagues set rosters_locked=false;`);
    assert.equal((await remove(103)).reasonCodes[0], 'FUTURE_LINEUP_DEPENDENCY');
    await db.exec(`update matches set status='completed' where id='${id(50)}';`);
    const result = await remove(103);
    assert.equal(result.status, 'REMOVED');
    assert.equal((await remove(103)).replayed, true);
    assert.equal((await remove(103, 801)).status, 'NOT_ON_ROSTER');
    assert.equal((await db.query('select count(*)::int n from match_lineups')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int n from lms_write_private.operation_receipts')).rows[0].n, 1);
    assert.equal((await db.query('select count(*)::int n from lms_write_private.notification_outbox')).rows[0].n, 0);
    for (const role of ['anon','authenticated','lms_view_as_executor']) {
      const result = await db.query("select has_function_privilege($1,'public.lms_roster_remove_player(uuid,uuid,uuid,uuid)','EXECUTE') allowed", [role]);
      assert.equal(result.rows[0].allowed, false);
    }
    const columns = await db.query("select has_column_privilege('lms_roster_writer','public.members','id','UPDATE') allowed");
    assert.equal(columns.rows[0].allowed, false);
    await db.exec('alter function public.lms_roster_remove_player(uuid,uuid,uuid,uuid) owner to postgres');
    await assert.rejects(db.exec(phase1), /function drift/);
    await db.exec('rollback');
  } finally { await db.close(); }
});

test('Add holds unknown admission facts without membership, receipt, notification, or protected evidence', async () => {
 const db = await foundationDatabase();
 try {
  const add = async (actor=102) => {
   await db.exec('set role service_role');
   try { return (await db.query('select public.lms_roster_add_player($1,$2,$3,$4) result',[id(actor),id(30),id(8),id(900)])).rows[0].result; }
   finally { await db.exec('reset role'); }
  };
  assert.equal((await add(101)).status,'NOT_AUTHORIZED');
  assert.equal((await add()).status,'REVIEW_REQUIRED');
  await db.exec(`insert into ai_document_versions values('${id(950)}','synthetic-rules');
   insert into ai_documents values('${id(951)}','LWR Pickleball Club DUPR League Rules','active','${id(950)}');
   update divisions set min_dupr=3.4,max_dupr=4.8,team_dupr_max=9.1,rating_type='primetime';
   update leagues set only_home_community_players=false;
   insert into lms_write_private.policy_bindings(season_id,league_id,division_id,condition_code,stage,rules_version,source_ref,source_kind,comparison,parameters,config_hash,status)
   values('${id(20)}','${id(21)}','${id(22)}','nr_classification','ADMISSION','synthetic-rules','synthetic RF policy','EXISTING_COLUMN','LT','{"operator":"LT","threshold":29}',
    md5(jsonb_build_object('min',3.4::numeric,'max',4.8::numeric,'pair',9.1::numeric,'type','primetime','homeOnly',false)::text),'VERIFIED');`);
  const held = await add();
  assert.equal(held.status,'REVIEW_REQUIRED');
  assert.ok(held.reasonCodes.includes('POLICY_BINDING_UNAVAILABLE'));
  assert.equal(JSON.stringify(held).includes('dupr_reliability_rating'),false);
  await db.exec('update divisions set max_dupr=4.9');
  assert.equal((await add()).status,'POLICY_CONFIGURATION_CONFLICT');
  assert.equal((await db.query('select count(*)::int n from team_members where member_id=$1',[id(8)])).rows[0].n,0);
  for (const table of ['operation_receipts','notification_outbox']) assert.equal((await db.query(`select count(*)::int n from lms_write_private.${table}`)).rows[0].n,0);
  for (const role of ['anon','authenticated','lms_view_as_executor']) {
   assert.equal((await db.query("select has_function_privilege($1,'public.lms_roster_add_player(uuid,uuid,uuid,uuid)','EXECUTE') allowed",[role])).rows[0].allowed,false);
  }
 } finally { await db.close(); }
});

test('Match Setup uses the bounded authority path; held saves preserve rows and reset protects completed history', async () => {
 const db=await foundationDatabase();
 try {
  await db.exec(`insert into match_lineups(match_id,team_id,line_number,player_1_member_id,player_2_member_id) values('${id(50)}','${id(30)}',1,'${id(1)}','${id(2)}');update divisions set number_of_lines=1;`);
  const call=async(sql,args)=>{
   await db.exec('set role service_role');
   try{return (await db.query(sql,args)).rows[0].result;}finally{await db.exec('reset role');}
  };
  const reset=actor=>call('select public.lms_match_setup_reset($1,$2,$3) result',[id(actor),id(50),id(970)]);
  for(const actor of [101,102,103,104,105,106,109])assert.equal((await reset(actor)).status,'NOT_AUTHORIZED');
  const lines=[{line_number:1,player_1_member_id:id(1),player_2_member_id:id(2)}];
  const save=await call('select public.lms_match_setup_save($1,$2,$3,$4,$5) result',[id(102),id(50),id(30),JSON.stringify(lines),id(971)]);
  assert.equal(save.status,'LINEUP_REVIEW_REQUIRED');
  assert.equal((await db.query('select count(*)::int n from match_lineups')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from lms_write_private.notification_outbox')).rows[0].n,0);
  await db.exec("update matches set status='completed'");
  assert.equal((await reset(107)).status,'MATCH_COMPLETED');
  assert.equal((await db.query('select count(*)::int n from match_lineups')).rows[0].n,1);
  await db.exec("update matches set status='scheduled'");
  assert.equal((await reset(107)).status,'RESET');
  assert.equal((await reset(107)).replayed,true);
  assert.equal((await db.query('select count(*)::int n from match_lineups')).rows[0].n,0);
 }finally{await db.close();}
});


test('migration rejects execution/column drift and delivery privileges cannot rewrite payloads',async()=>{
 const db=await foundationDatabase();
 try{
  await db.exec('grant execute on function public.lms_roster_remove_player(uuid,uuid,uuid,uuid) to authenticated');
  await assert.rejects(db.exec(phase1),/function ACL drift/);await db.exec('rollback');
  await db.exec('revoke execute on function public.lms_roster_remove_player(uuid,uuid,uuid,uuid) from authenticated');
  await db.exec('alter table lms_write_private.policy_bindings add column unapproved_fact text');
  await assert.rejects(db.exec(phase1),/table shape drift/);await db.exec('rollback');
  assert.equal((await db.query("select has_column_privilege('lms_notification_worker','lms_write_private.notification_outbox','payload','UPDATE') allowed")).rows[0].allowed,false);
  assert.equal((await db.query("select has_column_privilege('lms_notification_worker','lms_write_private.notification_outbox','state','UPDATE') allowed")).rows[0].allowed,true);
  assert.equal((await db.query("select has_table_privilege('service_role','lms_write_private.operation_receipts','DELETE') allowed")).rows[0].allowed,false);
  assert.equal((await db.query('select count(*)::int n from lms_write_private.policy_bindings')).rows[0].n,360);
 }finally{await db.close();}
});

test('replay refuses RLS disabled on an existing private table instead of silently repairing it',async()=>{
 const db=await foundationDatabase();try{
  await db.exec('alter table lms_write_private.operation_receipts disable row level security');
  await assert.rejects(db.exec(phase1),/table security drift/);await db.exec('rollback');
 }finally{await db.close();}
});
