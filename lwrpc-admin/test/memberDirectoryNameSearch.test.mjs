import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pageFixture, id } from './helpers/viewAsPageFixture.mjs';

const directoryDefinition = await readFile(new URL('./fixtures/lms0726-member-directory.sql', import.meta.url), 'utf8');
const priorMigration = await readFile(new URL('../supabase/migrations/20260922204254_lms0757_ratings_identity_member_directory.sql', import.meta.url), 'utf8');
const nameSearchMigration = await readFile(new URL('../supabase/migrations/20260924192638_member_directory_name_tokens.sql', import.meta.url), 'utf8');
const priorDirectoryChange = [...priorMigration.matchAll(/do \$migration\$[\s\S]*?\$migration\$;/g)][1][0];

test('Member Administration matches each name token while retaining other field searches', async () => {
  const db = await pageFixture();
  try {
    await db.exec(directoryDefinition);
    await db.exec(priorDirectoryChange);
    await db.query(
      'insert into members (id, first_name, last_name, email, dupr_id, is_active_member) values ($1, $2, $3, $4, $5, true)',
      [id(41), 'Thomas M.', 'Allwine', 'thomas@example.com', 'DUPR123']
    );
    await db.query(
      'insert into members (id, first_name, last_name, email, is_active_member) values ($1, $2, $3, $4, true)',
      [id(42), 'Jane Marie', 'Doe', 'jane@example.com']
    );

    const find = async (search, memberId = id(41)) => (await db.query(
      'select public.admin_member_directory_page($1, false, false, $2, $3, 0, 100, false) result',
      [search, 'member', 'asc']
    )).rows[0].result.rows.some(row => row.id === memberId);

    assert.equal(await find('Thomas Allwine'), false, 'reproduce the original exact-phrase failure');
    assert.equal(await find('Jane Doe', id(42)), false, 'reproduce the full-middle-name failure');
    const priorDefinition = (await db.query(
      "select pg_get_functiondef('public.admin_member_directory_page(text,boolean,boolean,text,text,integer,integer,boolean)'::regprocedure) as definition"
    )).rows[0].definition;
    await db.exec(nameSearchMigration);
    await db.exec(nameSearchMigration);

    for (const search of [
      'Thomas Allwine', 'Thomas M Allwine', 'Thomas M. Allwine',
      'Thomas', 'Allwine', '  tHoMaS   aLlWiNe  ', 'Allwine Thomas',
      'thomas@example.com', 'DUPR123',
    ]) {
      assert.equal(await find(search), true, `expected ${search} to match`);
    }
    assert.equal(await find('Jane Doe', id(42)), true);
    assert.equal(await find('Jane Marie Doe', id(42)), true);
    for (const search of ['Thomas Missing', 'Unknown Allwine', 'Thomas DUPR123']) {
      assert.equal(await find(search), false, `expected ${search} not to match`);
    }
    const result = (await db.query(
      'select public.admin_member_directory_page($1, false, false, $2, $3, 0, 100, false) result',
      ['Thomas Allwine', 'member', 'asc']
    )).rows[0].result;
    assert.equal(result.filtered_count, 1);
    assert.deepEqual(result.rows.map(row => row.id), [id(41)]);

    await db.exec(priorDefinition);
    assert.equal(await find('Thomas Allwine'), false, 'the captured prior function restores the original behavior');
    assert.equal(await find('DUPR123'), true, 'the restored function retains legacy field searches');
  } finally {
    await db.close();
  }
});
