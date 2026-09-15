// The overlay never adds a team or retains contact fields from a prior projection.
const keys = ['captain', 'co_captain_1', 'co_captain_2'];
function safeName(member) {
  if (!member || typeof member !== 'object' || Array.isArray(member)) return null;
  return Object.fromEntries(['id', 'first_name', 'last_name', 'full_name']
    .filter(key => typeof member[key] === 'string').map(key => [key, member[key]]));
}
export function mergeScheduleCaptainNames(teams, names = []) {
  const byTeam = new Map(names.map(row => [row.id, row]));
  return teams.map(team => ({...team, ...Object.fromEntries(keys.map(key =>
    [key, safeName(byTeam.get(team.id)?.[key])]))}));
}
export function validScheduleNameArgs(args) {
  return !!args && typeof args === 'object' && !Array.isArray(args)
    && Object.keys(args).length === 1 && typeof args.divisionId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(args.divisionId);
}
