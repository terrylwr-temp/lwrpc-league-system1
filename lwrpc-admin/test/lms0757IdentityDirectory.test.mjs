import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fixture, preview, source, id as ratingId } from './helpers/uploadWorkingDatabase.mjs';
import { fingerprint } from './helpers/ratingsSourceDatabase.mjs';
import { pageFixture, id as memberId } from './helpers/viewAsPageFixture.mjs';

const migration = await readFile(new URL('../supabase/migrations/20260922204254_lms0757_ratings_identity_member_directory.sql', import.meta.url), 'utf8');
const capacity = await readFile(new URL('../supabase/migrations/20260922003928_season_ratings_large_csv_import.sql', import.meta.url), 'utf8');
const directoryDefinition = await readFile(new URL('./fixtures/lms0726-member-directory.sql', import.meta.url), 'utf8');
const blocks = [...migration.matchAll(/do \$migration\$[\s\S]*?\$migration\$;/g)].map(match => match[0]);
assert.equal(blocks.length, 2);
const ratingUpload = (duprId, line = 2) => ({ duprId, line, data: source() });

test('0757 upload resolves each CSV row once while preserving transfer and protected fields', async () => {
  const db = await fixture();
  try {
    await db.exec(capacity);
    const before = await fingerprint(db);
    const transferBefore = await preview(db, 'transfer');
    await db.exec(blocks[0]);
    await db.exec(blocks[0]);
    assert.deepEqual(await fingerprint(db), before);
    assert.deepEqual(await preview(db, 'transfer'), transferBefore);

    const one = await preview(db, 'upload', [ratingUpload('ABC123')]);
    assert.equal(one.counts.total, 1);
    assert.equal(one.rows[0].memberId, ratingId(1));
    assert.equal(one.rows[0].action, 'FILL');
    assert.equal(one.rows[0].fills.doubles, undefined);
    assert.ok(one.counts.protectedFields > 0);

    await db.query('insert into members(id,first_name,last_name,dupr_id,is_active_member) values($1,$2,$3,$4,false)', [ratingId(3), 'Old', 'One', ' abc123 ']);
    let result = await preview(db, 'upload', [ratingUpload(' abc123 ')]);
    assert.equal(result.counts.total, 1);
    assert.equal(result.rows[0].memberId, ratingId(1));
    assert.equal(result.rows[0].action, 'FILL');

    await db.query('insert into members(id,first_name,last_name,dupr_id,is_active_member) values($1,$2,$3,$4,false)', [ratingId(4), 'Old', 'Two', 'ABC123']);
    result = await preview(db, 'upload', [ratingUpload('ABC123')]);
    assert.equal(result.counts.total, 1);
    assert.equal(result.rows[0].memberId, ratingId(1));
    assert.notEqual(result.rows[0].action, 'REVIEW');

    await db.query('insert into members(id,first_name,last_name,dupr_id,is_active_member) values($1,$2,$3,$4,true)', [ratingId(5), 'Active', 'Two', 'ABC123']);
    result = await preview(db, 'upload', [ratingUpload('ABC123')]);
    assert.equal(result.counts.total, 1);
    assert.equal(result.rows[0].action, 'REVIEW');
    assert.equal(result.rows[0].memberId, undefined);

    await db.query('update members set is_active_member=false where id=$1', [ratingId(5)]);
    result = await preview(db, 'upload', [ratingUpload('ABC123'), ratingUpload(' abc123 ', 3)]);
    assert.equal(result.counts.total, 2);
    assert.deepEqual(result.rows.map(row => row.action), ['REVIEW', 'REVIEW']);

    result = await preview(db, 'upload', [ratingUpload('NO-MATCH')]);
    assert.equal(result.rows[0].reason, 'DUPR ID not found');

    await db.query('insert into members(id,first_name,last_name,dupr_id,is_active_member) values($1,$2,$3,$4,false)', [ratingId(6), 'Old', 'Single', 'INACTIVE']);
    result = await preview(db, 'upload', [ratingUpload('INACTIVE')]);
    assert.equal(result.rows[0].action, 'SKIP');
    await db.query('insert into members(id,first_name,last_name,dupr_id,is_active_member) values($1,$2,$3,$4,false)', [ratingId(7), 'Old', 'Extra', ' inactive ']);
    result = await preview(db, 'upload', [ratingUpload('INACTIVE')]);
    assert.equal(result.rows[0].action, 'REVIEW');
    assert.equal(result.rows[0].memberId, undefined);

    const many = Array.from({ length: 1800 }, (_, index) => ratingUpload(`UNMATCHED${index}`, index + 2));
    result = await preview(db, 'upload', many);
    assert.equal(result.counts.total, 1800);
    assert.equal(result.rows.length, 1800);
    assert.equal(result.counts.affected, 0);
    const capacityRows = Array.from({ length: 5000 }, (_, index) => ratingUpload(`CAPACITY${index}`, index + 2));
    result = await preview(db, 'upload', capacityRows);
    assert.equal(result.counts.total, 5000);
    assert.equal(result.rows.length, 5000);
  } finally {
    await db.close();
  }
});

test('0757 member directory uses roster rows and shows every duplicate partner', async () => {
  const db = await pageFixture();
  try {
    await db.exec(directoryDefinition);
    await db.exec(blocks[1]);
    await db.exec(blocks[1]);
    assert.equal((await db.query("select public.admin_member_directory_page(p_search => '', p_include_inactive => false, p_current_roster_only => false, p_sort_key => 'member', p_sort_direction => 'asc', p_offset => 0, p_limit => 100) result")).rows[0].result.total_count, 9);
    const call = async args => (await db.query('select public.admin_member_directory_page($1,$2,$3,$4,$5,$6,$7,$8) result', [
      args.search || '', args.inactive || false, args.roster || false, args.sort || 'member', args.direction || 'asc', args.offset || 0, args.limit || 100, args.duplicate || false,
    ])).rows[0].result;
    let result = await call({ roster: true });
    assert.deepEqual(result.rows.map(row => row.id), [memberId(1), memberId(9)]);
    await db.exec(`insert into team_members values('${memberId(30)}','${memberId(2)}',true),('${memberId(30)}','${memberId(6)}',false);`);
    result = await call({ roster: true });
    assert.deepEqual(result.rows.map(row => row.id), [memberId(1), memberId(2), memberId(9)]);
    await db.exec(`update teams set is_active=false where id='${memberId(31)}';`);
    result = await call({ roster: true });
    assert.deepEqual(result.rows.map(row => row.id), [memberId(1), memberId(2)]);

    await db.query('update members set dupr_id=$1 where id=$2', [' abc123 ', memberId(1)]);
    await db.query('update members set dupr_id=$1,is_active_member=false where id=$2', ['ABC123', memberId(3)]);
    await db.query('update members set dupr_id=$1 where id=$2', ['unique', memberId(4)]);
    await db.query('update members set dupr_id=$1 where id=$2', [' ', memberId(5)]);
    result = await call({ duplicate: true });
    assert.equal(result.filtered_count, 2);
    assert.deepEqual(result.rows.map(row => row.id), [memberId(1), memberId(3)]);
    assert.equal((await call({ duplicate: true, search: 'Person3' })).filtered_count, 1);
    assert.equal((await call({ duplicate: true, limit: 1, offset: 1 })).rows.length, 1);
    await db.query('update members set dupr_id=$1 where id=$2', ['ABC123', memberId(2)]);
    assert.equal((await call({ duplicate: true })).filtered_count, 3);
    const signatures = (await db.query("select count(*)::int n from pg_proc where pronamespace='public'::regnamespace and proname='admin_member_directory_page'")).rows[0].n;
    assert.equal(signatures, 1);
  } finally {
    await db.close();
  }
});
