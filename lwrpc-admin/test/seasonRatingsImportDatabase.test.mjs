import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { schema, migration, id, payload, commit, asService, fingerprint } from './helpers/ratingsSourceDatabase.mjs';

test('source-only transaction, rollback, identity revalidation, role boundary and idempotency', async () => {
  const db = new PGlite();
  try {
    await db.exec(schema); const before = await fingerprint(db); await db.exec(migration);
    assert.deepEqual(await fingerprint(db), before);
    const read = await asService(db, 'select public.season_ratings_source_snapshot($1,$2,$3) result', [id(101),id(20),['ABC123','DEF456']]);
    assert.equal(read.rows[0].result.members.length, 2);
    await assert.rejects(commit(db,payload(),id(102)), /Only League Managers/);
    for (const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(db.query('select public.season_ratings_source_commit($1,$2)',[id(101),payload()]), /permission denied/);
      await db.exec('reset role');
    }
    const altered = payload(); altered.updates[1].duprId = 'WRONG';
    await assert.rejects(commit(db,altered), /identity changed/);
    assert.equal((await db.query('select count(*) n from ratings_source_private.sources')).rows[0].n, 0);
    await db.exec(`insert into members values('${id(3)}','Duplicate','Inactive','ABC123',false)`);
    await assert.rejects(commit(db), /identity changed/);
    await db.exec(`delete from members where id='${id(3)}'`);
    // Force an unexpected failure after a previous row has been inserted.
    await db.exec(`create function ratings_source_private.fail_second() returns trigger language plpgsql as $$begin if new.member_id='${id(2)}' then raise exception 'injected late failure';end if;return new;end$$;create trigger fail_second before insert on ratings_source_private.sources for each row execute function ratings_source_private.fail_second();`);
    await assert.rejects(commit(db), /injected late failure/);
    assert.equal((await db.query('select count(*) n from ratings_source_private.sources')).rows[0].n, 0);
    assert.equal((await db.query('select count(*) n from ratings_source_private.batches')).rows[0].n, 0);
    await db.exec('drop trigger fail_second on ratings_source_private.sources');
    const result = (await commit(db)).rows[0].result; assert.equal(result.updated, 2); assert.equal(result.seasonValuesChanged, 0);
    assert.deepEqual((await commit(db)).rows[0].result, result);
    assert.equal(Number((await db.query('select sum(revision) n from ratings_source_private.sources')).rows[0].n), 2);
    await assert.rejects(commit(db,payload({id:id(901)})), /Source ratings changed/);
    const refresh = payload({ id:id(902) }); refresh.updates.forEach(x => { x.expectedRevision=1; x.data.rf=30; });
    await commit(db,refresh);
    assert.deepEqual(await fingerprint(db), before);
    assert.equal((await db.query('select count(*) n from ratings_source_private.batches')).rows[0].n, 2);
    const invalid = payload({ id:id(903) }); invalid.updates.forEach(x => { x.expectedRevision=2; }); invalid.updates[1].data.season_dupr_rating=8;
    await assert.rejects(commit(db,invalid), /Unexpected source field/);
    assert.deepEqual(await fingerprint(db), before);
    await db.exec(`update user_roles set role='player' where user_id='${id(101)}'`);
    await assert.rejects(commit(db,refresh), /Only League Managers/);
  } finally { await db.close(); }
});
