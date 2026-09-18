export const COMPENSATORY_POINTS_CALCULATION_VERSION = "dupr-rule-6.3.9-v2-played-dates";

export function roundCompensatoryPoints(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.floor(number + 0.5);
}

export function buildEndOfSeasonPointsPreview({ teams, matches, standings, awards }) {
  const standingsByTeamId = new Map((standings || []).map((row) => [String(row.team_id), row]));
  const awardsByTeamId = new Map((awards || []).map((row) => [String(row.team_id), row]));
  const verifiedMatchCounts = new Map((teams || []).map((team) => [String(team.id), 0]));
  const verifiedDates = new Map((teams || []).map((team) => [String(team.id), new Set()]));
  const unresolvedMatches = [];

  for (const match of matches || []) {
    const cancelled = ["cancelled", "canceled"].includes(String(match?.status || "").toLowerCase());
    const verified = match?.status === "completed" && match?.score_status === "verified";

    if (!cancelled && !verified) {
      unresolvedMatches.push({
        matchId: match.id,
        scheduledDate: match.scheduled_date || "",
        reason: "Match is not completed and verified.",
      });
      continue;
    }

    if (verified && !match.scheduled_date) {
      unresolvedMatches.push({
        matchId: match.id,
        scheduledDate: "",
        reason: "Verified match is missing its scheduled date.",
      });
      continue;
    }

    if (!verified) continue;

    for (const teamId of [match.home_team_id, match.away_team_id]) {
      const key = String(teamId || "");
      verifiedMatchCounts.set(key, (verifiedMatchCounts.get(key) || 0) + 1);
      if (!verifiedDates.has(key)) verifiedDates.set(key, new Set());
      verifiedDates.get(key).add(String(match.scheduled_date));
    }
  }

  const maximumMatchDatesPlayed = Math.max(
    0,
    ...(teams || []).map((team) => verifiedDates.get(String(team.id))?.size || 0)
  );

  const rows = (teams || []).map((team) => {
    const teamId = String(team.id);
    const standing = standingsByTeamId.get(teamId) || {};
    const existingAward = awardsByTeamId.get(teamId) || null;
    const compensatoryAlreadyIncluded = Number(standing.compensatory_points || 0);
    const earnedPoints = Number(
      standing.earned_standings_points ??
      (Number(standing.standings_points || 0) - compensatoryAlreadyIncluded)
    );
    const verifiedMatchCount = verifiedMatchCounts.get(teamId) || 0;
    const matchDatesPlayed = verifiedDates.get(teamId)?.size || 0;
    const recordedMatches = Number(standing.matches_played || 0);
    const missingMatchDates = Math.max(0, maximumMatchDatesPlayed - matchDatesPlayed);
    const averagePoints = matchDatesPlayed > 0 ? earnedPoints / matchDatesPlayed : 0;
    const rawCompensatoryPoints = averagePoints * missingMatchDates;
    const compensatoryPoints = roundCompensatoryPoints(rawCompensatoryPoints);

    return {
      teamId: team.id,
      teamName: team.name || "Team",
      matchDatesPlayed,
      maximumMatchDatesPlayed,
      missingMatchDates,
      qualifyingMatchDates: matchDatesPlayed,
      verifiedMatchCount,
      recordedMatches,
      earnedPoints,
      averagePoints,
      rawCompensatoryPoints,
      compensatoryPoints,
      finalPoints: earnedPoints + compensatoryPoints,
      alreadyApplied: Boolean(existingAward),
      validationError: recordedMatches !== verifiedMatchCount
        ? "Recorded standings matches do not match the verified matches. Rebuild and review before finalizing."
        : matchDatesPlayed === 0 && missingMatchDates > 0
          ? "No verified match dates are available for an average."
          : "",
    };
  });

  return {
    rows,
    unresolvedMatches,
    maximumMatchDatesPlayed,
    readyToApply: unresolvedMatches.length === 0 && rows.length >= 2 && rows.every((row) => !row.validationError),
    applied: rows.length > 0 && rows.every((row) => row.alreadyApplied),
  };
}
