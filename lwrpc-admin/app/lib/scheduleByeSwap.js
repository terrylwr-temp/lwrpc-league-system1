const joinedFields = new Set(['leagues', 'divisions', 'locations', 'home_team', 'away_team']);

// Preserve all stored columns for the server's optimistic concurrency check.
export function scheduleRowSnapshot(row) {
  return Object.fromEntries(Object.entries(row || {}).filter(([key]) => !joinedFields.has(key)));
}

export function isByeSwapMatchEditable(match) {
  return Boolean(match?.scheduled_date && match.home_team_id && match.away_team_id &&
    match.home_team_id !== match.away_team_id && ['draft', 'scheduled'].includes(match.status) &&
    match.home_score == null && match.away_score == null && !match.score_entered_at &&
    !match.score_verified_at && !match.finalized_at && !match.winning_team_id);
}

export function sameSchedulePeriod(match, other) {
  return Boolean(match.scheduled_date && match.scheduled_date === other.scheduled_date) ||
    (match.week_number != null && other.week_number != null &&
      String(match.league_id) === String(other.league_id) &&
      String(match.division_id) === String(other.division_id) &&
      Number(match.week_number) === Number(other.week_number));
}

// Recorded byes are authoritative; an arbitrary unscheduled team is not a bye.
export function getByeSwapCandidates({ match, side, teams = [], byes = [], matches = [] }) {
  if (!['home', 'away'].includes(side) || !isByeSwapMatchEditable(match)) return [];
  const selectedId = match[`${side}_team_id`];
  const opponentId = match[`${side === 'home' ? 'away' : 'home'}_team_id`];
  const eligibleTeam = (id) => teams.find(team => team.id === id && team.is_active !== false && team.division_id === match.division_id);
  if (!eligibleTeam(selectedId) || !eligibleTeam(opponentId)) return [];
  const busy = new Set(matches.filter(row => row.id !== match.id && row.status !== 'cancelled' && sameSchedulePeriod(match, row))
    .flatMap(row => [row.home_team_id, row.away_team_id]).filter(Boolean));
  if (busy.has(selectedId) || busy.has(opponentId)) return [];
  const periodByes = byes.filter(bye => bye.league_id === match.league_id && bye.division_id === match.division_id &&
    bye.bye_date === match.scheduled_date && (bye.week_number ?? null) === (match.week_number ?? null));
  if (periodByes.some(bye => bye.team_id === selectedId || bye.team_id === opponentId)) return [];
  return periodByes.filter(bye => (!bye.schedule_setting_id || bye.schedule_setting_id === match.schedule_setting_id) &&
    !busy.has(bye.team_id) && periodByes.filter(row => row.team_id === bye.team_id).length === 1)
    .map(bye => ({ bye, team: eligibleTeam(bye.team_id) })).filter(choice => choice.team)
    .sort((a, b) => a.team.name.localeCompare(b.team.name));
}
