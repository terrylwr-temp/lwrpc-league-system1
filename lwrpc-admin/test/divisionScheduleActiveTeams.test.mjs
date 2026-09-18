import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createViewAsProjectionClient } from '../app/lib/viewAsProjectionClient.js';

// Execute each real loader's team query against the same mixed-status data.
// This also exercises the filter used by the shared View-As projection.
for (const [file, loader] of [
  ['captain-dashboard/page.js', 'openDivisionSchedule'],
  ['player-dashboard/page.js', 'openDivisionScheduleForTeam'],
  ['division-schedules/page.js', 'loadDivisionSchedule'],
]) {
  test(`${file}: division schedule selects only active teams in the selected division`, async () => {
    const source = await readFile(new URL(`../app/${file}`, import.meta.url), 'utf8');
    const body = source.slice(source.indexOf(`async function ${loader}(`));
    const query = body.match(/supabase\s*\.from\("teams"\)[\s\S]*?\.order\("name"(?:, \{ ascending: true \})?\)/)?.[0];
    assert.ok(query, 'real schedule team query found');
    const teams = [
      { id: 'inactive', name: 'A retired', division_id: 'one', is_active: false },
      { id: 'active', name: 'B current', division_id: 'one', is_active: true },
      { id: 'unknown', name: 'C unknown', division_id: 'one', is_active: null },
      { id: 'other', name: 'D other division', division_id: 'two', is_active: true },
    ];
    const supabase = createViewAsProjectionClient(() => ({ teams, locations: [], members: [] }));
    for (const [divisionId, expected] of [['one', ['active']], ['two', ['other']], ['empty', []]]) {
      const result = await vm.runInNewContext(query, { supabase, divisionId, team: { division_id: divisionId } });
      assert.equal(result.error, null);
      assert.deepEqual(result.data.map(row => row.id), expected);
    }
    assert.equal(teams.length, 4, 'inactive business records remain intact');
  });
}
