import { ROLE_LEVELS } from './permissions.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Construct only from the server's locked identity result, never request JSON.
export function createLmsViewer({ mode, actorId, memberId, roles, contextId = null }) {
  if (!['normal', 'view_as'].includes(mode) || !uuid.test(actorId || '') || !uuid.test(memberId || '')) {
    throw new Error('Invalid viewer identity');
  }
  if (mode === 'view_as' && !uuid.test(contextId || '')) throw new Error('Missing isolated context');
  if (mode === 'normal' && contextId !== null) throw new Error('Unexpected isolated context');
  const effectiveRoles = [...new Set(roles || [])];
  if (!effectiveRoles.length || effectiveRoles.some(role => !Object.hasOwn(ROLE_LEVELS, role))) {
    throw new Error('Invalid effective roles');
  }
  effectiveRoles.sort((a, b) => ROLE_LEVELS[b] - ROLE_LEVELS[a]);
  return Object.freeze({ mode, actorId, memberId, contextId, roles: Object.freeze(effectiveRoles),
    role: effectiveRoles[0], readOnly: mode === 'view_as' });
}

export function canManagePrivateTeams(viewer) {
  return viewer?.roles?.some(role => role === 'league_manager' || role === 'commissioner') === true;
}

// The database repeats this check under the operation's transaction locks.
export function rosterAuthority(viewer, team, operation, rostersLocked) {
  if (!viewer || viewer.readOnly || viewer.mode !== 'normal' || !team) return false;
  if (!['add', 'remove'].includes(operation)) return false;
  if (canManagePrivateTeams(viewer)) return true;
  if (rostersLocked !== false) return false;
  const captainAssignment = [team.captain_member_id, team.co_captain_member_id, team.co_captain_2_member_id]
    .includes(viewer.memberId);
  if (viewer.roles.includes('captain') && captainAssignment) return true;
  return operation === 'add' && viewer.roles.includes('club_pro') && team.club_pro_member_id === viewer.memberId;
}
