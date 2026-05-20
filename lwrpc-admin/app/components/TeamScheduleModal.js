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
  const visibleMatches = matches.filter(
    (match) =>
      String(match.home_team_id) === String(selectedTeamId) ||
      String(match.away_team_id) === String(selectedTeamId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title || "Team Schedule"}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-300"
          >
            Close
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="max-h-[72vh] overflow-auto border-b border-slate-200 bg-slate-50 p-4 md:border-b-0 md:border-r">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Teams
            </div>
            <div className="space-y-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => onSelectTeam?.(team)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                    String(team.id) === String(selectedTeamId)
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {team.name}
                </button>
              ))}
            </div>
          </aside>

          <section className="max-h-[72vh] overflow-auto p-5">
            <div className="mb-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Selected Team
              </div>
              <div className="mt-1 text-2xl font-black text-slate-900">
                {selectedTeam?.name || "Select a team"}
              </div>
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
                  <ScheduleMatchCard key={match.id} match={match} selectedTeamId={selectedTeamId} compact={compact} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ScheduleMatchCard({ match, selectedTeamId, compact }) {
  const isHome = String(match.home_team_id) === String(selectedTeamId);
  const opponent = isHome ? match.away_team : match.home_team;
  const selectedScore = isHome ? match.home_score : match.away_score;
  const opponentScore = isHome ? match.away_score : match.home_score;
  const hasScore = selectedScore !== null && selectedScore !== undefined && opponentScore !== null && opponentScore !== undefined;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">
            {formatDate(match.scheduled_date)} at {match.scheduled_time || "Time TBD"}
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
            <span>{isHome ? "Home" : "Away"} vs {opponent?.name || "Opponent"}</span>
            <span>{match.locations?.name || "Location TBD"}</span>
            <span>Week {match.week_number || "-"}</span>
          </div>
        </div>

        <div className="rounded-lg bg-slate-100 px-3 py-2 text-right">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {match.score_status ? match.score_status.replaceAll("_", " ") : match.status || "scheduled"}
          </div>
          <div className="mt-1 text-lg font-black text-slate-900">
            {hasScore ? `${selectedScore}-${opponentScore}` : "No score"}
          </div>
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
  );
}

function formatDate(value) {
  if (!value) return "Date TBD";

  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString();
  } catch {
    return value;
  }
}
