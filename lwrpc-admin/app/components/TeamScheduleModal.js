"use client";

export default function TeamScheduleModal({
  title,
  subtitle,
  teams = [],
  selectedTeamId,
  onSelectTeam,
  matches = [],
  loading = false,
  compact = false,
  onClose,
}) {
  const selectedTeam = teams.find((team) => String(team.id) === String(selectedTeamId));
  const teamRecordById = Object.fromEntries(
    teams.map((team) => [String(team.id), formatTeamRecord(team)])
  );
  const visibleMatches = matches.filter(
    (match) =>
      String(match.home_team_id) === String(selectedTeamId) ||
      String(match.away_team_id) === String(selectedTeamId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-slate-950 via-blue-950 to-emerald-900 px-6 py-5 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Division Schedule
            </div>
            <h2 className="mt-1 text-2xl font-black">{title || "Team Schedule"}</h2>
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-200">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="max-h-[72vh] overflow-auto border-b border-slate-200 bg-slate-100 p-4 md:border-b-0 md:border-r">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Teams
            </div>
            <div className="space-y-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => onSelectTeam?.(team)}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold shadow-sm transition ${
                    String(team.id) === String(selectedTeamId)
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-white bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <span>{team.name}</span>
                  <span className={`mt-1 block text-xs ${
                    String(team.id) === String(selectedTeamId)
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}>
                    {formatTeamRecord(team)}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="max-h-[72vh] overflow-auto bg-slate-50 p-5">
            <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Selected Team
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900">
                {selectedTeam?.name || "Select a team"}
              </div>
              {selectedTeam && (
                <div className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900">
                  Season Record: {formatTeamRecord(selectedTeam)}
                </div>
              )}
            </div>

            {loading ? (
              <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                Loading schedule...
              </div>
            ) : visibleMatches.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                No schedule found for this team.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleMatches.map((match) => (
                  <ScheduleMatchCard
                    key={match.id}
                    match={match}
                    selectedTeamId={selectedTeamId}
                    compact={compact}
                    teamRecordById={teamRecordById}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ScheduleMatchCard({ match, selectedTeamId, compact, teamRecordById }) {
  const isHome = String(match.home_team_id) === String(selectedTeamId);
  const opponent = isHome ? match.away_team : match.home_team;
  const selectedScore = isHome ? match.home_score : match.away_score;
  const opponentScore = isHome ? match.away_score : match.home_score;
  const hasScore = selectedScore !== null && selectedScore !== undefined && opponentScore !== null && opponentScore !== undefined;
  const homeScore = match.home_score;
  const awayScore = match.away_score;
  const homeWon =
    String(match.winning_team_id || "") === String(match.home_team_id || "") ||
    (homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined && Number(homeScore) > Number(awayScore));
  const awayWon =
    String(match.winning_team_id || "") === String(match.away_team_id || "") ||
    (homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined && Number(awayScore) > Number(homeScore));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`h-1 ${hasScore ? "bg-emerald-500" : "bg-blue-500"}`} />
      <div className="p-4">
      <div className={compact ? "grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem] md:items-start" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0">
          <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-black text-blue-950">
            {formatDate(match.scheduled_date)} at {match.scheduled_time || "Time TBD"}
          </div>
          <div className={`${compact ? "break-words" : ""} mt-1 text-lg font-black text-slate-900`}>
            {formatTeamNameWithRecord(match.home_team, teamRecordById, "Home")} vs {formatTeamNameWithRecord(match.away_team, teamRecordById, "Away")}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
            <span>{isHome ? "Home" : "Away"} vs {formatTeamNameWithRecord(opponent, teamRecordById, "Opponent")}</span>
            <span>{match.locations?.name || "Location TBD"}</span>
            <span>Week {match.week_number || "-"}</span>
          </div>
        </div>

        <div className={compact ? "w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:w-56 md:justify-self-end" : "rounded-lg bg-slate-100 px-3 py-2 text-right"}>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {match.score_status ? match.score_status.replaceAll("_", " ") : match.status || "scheduled"}
          </div>
          {compact ? (
            <div className="mt-2 space-y-1">
              <ScoreRow label="Home" name={formatTeamNameWithRecord(match.home_team, teamRecordById, "Home")} score={homeScore} won={homeWon} />
              <ScoreRow label="Away" name={formatTeamNameWithRecord(match.away_team, teamRecordById, "Away")} score={awayScore} won={awayWon} />
            </div>
          ) : (
            <div className="mt-1 text-lg font-black text-slate-900">
              {hasScore ? `${selectedScore}-${opponentScore}` : "No score"}
            </div>
          )}
        </div>
      </div>

      {!compact && match.match_lines?.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-100">
          {match.match_lines
            .slice()
            .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))
            .map((line) => (
              <div key={line.id} className="border-b border-slate-100 px-3 py-2 last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-800">
                    Game {line.line_number || "-"}{line.division_lines?.line_name ? ` - ${line.division_lines.line_name}` : ""}
                  </span>
                  <span className="font-bold text-slate-900">
                    {line.home_team_games_won ?? 0}-{line.away_team_games_won ?? 0}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                  {(line.line_games || [])
                    .slice()
                    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
                    .filter((game) => game.home_score !== null && game.home_score !== undefined && game.away_score !== null && game.away_score !== undefined)
                    .map((game) => (
                      <span key={game.id} className="rounded-full bg-slate-100 px-2 py-0.5">
                        {game.game_number}: {game.home_score}-{game.away_score}
                      </span>
                    ))}
                </div>
              </div>
            ))}
        </div>
      )}
      </div>
    </div>
  );
}

function ScoreRow({ label, name, score, won }) {
  const hasScore = score !== null && score !== undefined;

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 ${
      won ? "bg-emerald-100 text-emerald-950" : "bg-white text-slate-800"
    }`}>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-wide opacity-70">
          {label}{won ? " Winner" : ""}
        </div>
        <div className="truncate text-xs font-bold">{name}</div>
      </div>
      <div className={`text-xl font-black ${won ? "text-emerald-800" : "text-slate-700"}`}>
        {hasScore ? score : "-"}
      </div>
    </div>
  );
}

function formatTeamRecord(team) {
  const standing = team?.standing;

  if (!standing) return "0-0-0";

  return `${standing.match_wins ?? 0}-${standing.match_losses ?? 0}-${standing.match_ties ?? 0}`;
}

function formatTeamNameWithRecord(team, teamRecordById, fallback) {
  const name = team?.name || fallback;
  const record = team?.id ? teamRecordById?.[String(team.id)] : "";

  return record ? `${name} (${record})` : name;
}

function formatDate(value) {
  if (!value) return "Date TBD";

  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString();
  } catch {
    return value;
  }
}
