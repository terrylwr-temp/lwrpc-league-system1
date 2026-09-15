import test from 'node:test';
import assert from 'node:assert/strict';
import { seasonRatingTenths, normalizedRatingRange, sameRatingDomain, classifyRating, compareSeasonRating } from '../app/lib/lmsRatingDomain.js';
import { createLmsViewer, rosterAuthority, canManagePrivateTeams } from '../app/lib/lmsViewer.js';
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const policy = { status: 'VERIFIED', operator: 'LT', threshold: 29 };

test('published precision preserves the admitted decimal domain without accepting a changed boundary', () => {
  assert.equal(sameRatingDomain({ min: 3.4, max: 4.899 }, { min: 3.4, max: 4.8 }), true);
  assert.equal(sameRatingDomain({ min: 3.4, max: 4.899 }, { min: 3.3, max: 4.9 }), false);
  assert.deepEqual(normalizedRatingRange('3.401', '4.899'), { min: 35, max: 48 });
  assert.equal(seasonRatingTenths('3.40'), 34);
  for (const value of ['3.499', '', 'NaN', 'Infinity', null, true, -1, 0]) assert.equal(seasonRatingTenths(value), null);
});

test('RF is strict and NR classification precedes numeric adjusted Season DUPR', () => {
  assert.equal(classifyRating({ rawRating: 3.7, reliability: 28.999, policy }), 'NR');
  assert.equal(classifyRating({ rawRating: 3.7, reliability: 29, policy }), 'RATED');
  assert.equal(classifyRating({ rawRating: 'NR', reliability: 80, policy }), 'NR');
  assert.equal(classifyRating({ rawRating: 3.7, reliability: null, policy }), 'UNKNOWN');
  assert.equal(classifyRating({ rawRating: 'NR', reliability: 1, policy: null }), 'UNKNOWN');
  assert.equal(compareSeasonRating({ classification: 'NR', rating: 4.8, range: { min: 2, max: 2.8 }, nrPlacementAllowed: true }), 'PASS');
  assert.equal(compareSeasonRating({ classification: 'RATED', rating: '3.499', range: { min: 3.4, max: 4.8 }, verifiedSeason: true }), 'UNKNOWN');
});

test('real actor authority cannot broaden an effective viewer or enable isolated mutation', () => {
  const team = { captain_member_id: id(2), co_captain_member_id: id(3), club_pro_member_id: id(4) };
  const viewer = (member, roles, mode = 'normal') => createLmsViewer({ mode, actorId: id(99), memberId: id(member), roles, contextId: mode === 'view_as' ? id(80) : null });
  assert.equal(canManagePrivateTeams(viewer(2, ['captain'], 'view_as')), false);
  for (const member of [2, 3]) {
    assert.equal(rosterAuthority(viewer(member, ['captain']), team, 'remove', false), true);
    assert.equal(rosterAuthority(viewer(member, ['captain']), team, 'remove', true), false);
  }
  assert.equal(rosterAuthority(viewer(4, ['club_pro']), team, 'add', false), true);
  assert.equal(rosterAuthority(viewer(4, ['club_pro']), team, 'remove', false), false);
  assert.equal(rosterAuthority(viewer(1, ['player']), team, 'remove', false), false);
  assert.equal(rosterAuthority(viewer(7, ['league_manager']), team, 'remove', true), true);
  assert.equal(rosterAuthority(viewer(7, ['commissioner'], 'view_as'), team, 'remove', false), false);
});
