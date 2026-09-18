export const COMPENSATORY_POINTS_CALCULATION_VERSION = "rule-5.15.1-v1";

export function roundCompensatoryPoints(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number + 0.5);
}

export function buildCompensatoryPointsPreview({ baseline, baselineTeams, baselineMatches, currentMatches, standings, awards }) {
  const matchesById = new Map((currentMatches || []).map((match) => [String(match.id), match]));
  const standingsByTeamId = new Map((standings || []).map((row) => [String(row.team_id), row]));
  const awardsByTeamId = new Map((awards || []).map((row) => [String(row.team_id), row]));
  const verifiedMatchCounts = new Map();
  const verifiedDates = new Map();
  const unresolvedMatches = [];

  for (const baselineMatch of baselineMatches || []) {
    const match = matchesById.get(String(baselineMatch.match_id));
    const cancelled = ["cancelled", "canceled"].includes(String(match?.status || "").toLowerCase());
    const verified = match?.status === "completed" && match?.score_status === "verified";
    if (!cancelled && !verified) {
      unresolvedMatches.push({
        matchId: baselineMatch.match_id,
        scheduledDate: baselineMatch.scheduled_date || "",
        reason: match ? "Match is not completed and verified." : "Starting-schedule match no longer exists.",
      });
    }
    if (verified) {
      for (const teamId of [baselineMatch.home_team_id, baselineMatch.away_team_id]) {
        const key = String(teamId || "");
        verifiedMatchCounts.set(key, (verifiedMatchCounts.get(key) || 0) + 1);
        if (!verifiedDates.has(key)) verifiedDates.set(key, new Set());
        verifiedDates.get(key).add(String(baselineMatch.scheduled_date));
      }
    }
  }

  const maximumScheduledMatchDates = Number(baseline?.max_scheduled_match_dates || 0);
  const rows = (baselineTeams || []).map((team) => {
    const standing = standingsByTeamId.get(String(team.team_id)) || {};
    const existingAward = awardsByTeamId.get(String(team.team_id)) || null;
    const compensatoryAlreadyIncluded = Number(standing.compensatory_points || 0);
    const earnedPoints = Number(
      standing.earned_standings_points ??
      (Number(standing.standings_points || 0) - compensatoryAlreadyIncluded)
    );
    const verifiedMatchCount = verifiedMatchCounts.get(String(team.team_id)) || 0;
    const qualifyingMatchDates = verifiedDates.get(String(team.team_id))?.size || 0;
    const recordedMatches = Number(standing.matches_played || 0);
    const scheduledMatchDatesAtStart = Number(team.scheduled_match_dates || 0);
    const missingMatchDates = Math.max(0, maximumScheduledMatchDates - scheduledMatchDatesAtStart);
    const averagePoints = qualifyingMatchDates > 0 ? earnedPoints / qualifyingMatchDates : 0;
    const rawCompensatoryPoints = averagePoints * missingMatchDates;
    const compensatoryPoints = roundCompensatoryPoints(rawCompensatoryPoints);

    return {
      teamId: team.team_id,
      teamName: team.team_name || "Team",
      scheduledMatchDatesAtStart,
      maximumScheduledMatchDates,
      missingMatchDates,
      qualifyingMatchDates,
      verifiedMatchCount,
      recordedMatches,
      earnedPoints,
      averagePoints,
      rawCompensatoryPoints,
      compensatoryPoints,
      finalPoints: earnedPoints + compensatoryPoints,
      alreadyApplied: Boolean(existingAward),
      validationError: recordedMatches !== verifiedMatchCount
        ? "Recorded standings matches do not match the verified starting-schedule matches. Rebuild and review before finalizing."
        : qualifyingMatchDates === 0 && missingMatchDates > 0
          ? "No qualifying match dates are available for an average."
          : "",
    };
  });

  return {
    baseline,
    rows,
    unresolvedMatches,
    readyToApply: unresolvedMatches.length === 0 && rows.every((row) => !row.validationError),
    applied: rows.length > 0 && rows.every((row) => row.alreadyApplied),
  };
}
