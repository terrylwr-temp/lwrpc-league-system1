import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture,id} from './helpers/viewAsFixture.mjs';

test('reviewed maintenance: unattended expiry, active protection, repeat safety, retention and atomic failure', async()=>{
 const db=await fixture();
 try {
  await db.exec(await readFile(new URL('../supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql',import.meta.url),'utf8'));
  const add=async(n,expires,started=true)=>db.query(`insert into view_as_private.contexts(id,actor,target,binding,browser,credential,expires_at,started_at,exchange_by) values($1,$2,$3,'synthetic binding',$4,'synthetic ciphertext',clock_timestamp()+$5::interval,case when $6 then clock_timestamp() end,clock_timestamp()-interval '1 minute')`,[id(n),id(107),id(1),'b'.repeat(64),expires,started]);
  await add(700,'-1 minute');await add(701,'10 minutes');await add(702,'10 minutes',false);await add(703,'10 minutes');
  await db.query("select view_as_private.end_context($1,'explicit_exit')",[id(703)]);
  const active=(await db.query('select * from view_as_private.contexts where id=$1',[id(701)])).rows;
  const metadata=(await db.query("select to_jsonb(c)-'credential'-'code'-'context'-'ended_at'-'end_reason' m from view_as_private.contexts c where id=$1",[id(700)])).rows;
  await db.exec('select public.lms_view_as_maintenance()');
  assert.deepEqual((await db.query('select * from view_as_private.contexts where id=$1',[id(701)])).rows,active);
  assert.deepEqual((await db.query("select to_jsonb(c)-'credential'-'code'-'context'-'ended_at'-'end_reason' m from view_as_private.contexts c where id=$1",[id(700)])).rows,metadata);
  for(const n of [700,702,703]){const c=(await db.query('select * from view_as_private.contexts where id=$1',[id(n)])).rows[0];assert.equal(c.credential,null);assert.equal(c.code,null);assert.equal(c.context,null);assert.ok(c.ended_at);}
  assert.equal((await db.query("select count(*)::int n from view_as_private.audit_events where event='VIEW_AS_ENDED' and reason='expiration'")).rows[0].n,1);
  const cleaned=(await db.query('select * from view_as_private.contexts order by id')).rows;
  await db.exec('select public.lms_view_as_maintenance()');
  assert.deepEqual((await db.query('select * from view_as_private.contexts order by id')).rows,cleaned);
  assert.equal((await db.query('select count(*)::int n from view_as_private.audit_events')).rows[0].n,2);
  await db.exec(`insert into view_as_private.attempts values('${id(107)}',clock_timestamp()-interval '25 hours',false),('${id(107)}',clock_timestamp()-interval '23 hours',false);
   insert into view_as_private.diagnostic_outcomes(id,context_id,at,family,kind) values('${id(800)}','${id(700)}',clock_timestamp()-interval '31 days','test','test'),('${id(801)}','${id(700)}',clock_timestamp()-interval '29 days','test','test');
   insert into view_as_private.audit_events(context_id,actor,effective_member,event,at) values('${id(700)}','${id(107)}','${id(1)}','old',clock_timestamp()-interval '91 days'),('${id(700)}','${id(107)}','${id(1)}','retained',clock_timestamp()-interval '89 days');
   update view_as_private.contexts set ended_at=clock_timestamp()-interval '91 days' where id in('${id(700)}','${id(702)}');
   select public.lms_view_as_maintenance();`);
  assert.equal((await db.query('select count(*)::int n from view_as_private.attempts')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from view_as_private.diagnostic_outcomes')).rows[0].n,1);
  assert.equal((await db.query("select count(*)::int n from view_as_private.audit_events where event='old'")).rows[0].n,0);
  assert.equal((await db.query('select count(*)::int n from view_as_private.contexts where id=$1',[id(700)])).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from view_as_private.contexts where id=$1',[id(702)])).rows[0].n,0);
  await add(704,'-1 minute');
  await db.exec("create function public.synthetic_audit_failure() returns trigger language plpgsql as $$begin raise exception 'synthetic audit failure';end$$;create trigger synthetic_failure before insert on view_as_private.audit_events for each row execute function public.synthetic_audit_failure();");
  await assert.rejects(db.exec('select public.lms_view_as_maintenance()'),/synthetic audit failure/);
  const failed=(await db.query('select ended_at,credential is not null retained,expires_at<clock_timestamp() expired from view_as_private.contexts where id=$1',[id(704)])).rows[0];
  assert.deepEqual(failed,{ended_at:null,retained:true,expired:true});
  for(const role of ['anon','authenticated','lms_view_as_executor'])assert.equal((await db.query("select has_function_privilege($1,'public.lms_view_as_maintenance()','EXECUTE') allowed",[role])).rows[0].allowed,false);
 }finally{await db.close();}
});
