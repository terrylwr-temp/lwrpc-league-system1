"use client";

import { formatDisplayDate, formatDisplayTime, formatDisplayTimestampShort } from "../lib/dateTime";
import { useRef, useState } from "react";

export default function TeamScheduleModal({
  title,
  subtitle,
  teams = [],
  selectedTeamId,
  onSelectTeam,
  matches = [],
  byes = [],
  ratings = [],
  ratingType = "dupr",
  loading = false,
  compact = false,
  onClose,
}) {
  const [standingsView, setStandingsView] = useState("summary");
  const selectedTeam = teams.find((team) => String(team.id) === String(selectedTeamId));
  const selectedTeamCaptainNames = captainNames(selectedTeam);
  const ratingByMemberId = Object.fromEntries(
    ratings.map((rating) => [String(rating.member_id), rating])
  );
  const visibleMatches = matches.filter(
    (match) =>
      String(match.home_team_id) === String(selectedTeamId) ||
      String(match.away_team_id) === String(selectedTeamId)
  );
  const visibleByes = byes.filter((bye) => String(bye.team_id) === String(selectedTeamId));
  const scheduleItems = [
    ...visibleMatches.map((match) => ({
      type: "match",
      key: `match:${match.id}`,
      date: match.scheduled_date,
      time: match.scheduled_time || "00:00",
      data: match,
    })),
    ...visibleByes.map((bye) => ({
      type: "bye",
      key: `bye:${bye.id}`,
      date: bye.bye_date,
      time: "00:00",
      data: bye,
    })),
  ].sort(compareScheduleItems);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-0">
      <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden rounded-none bg-white shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-slate-950 via-blue-950 to-emerald-900 px-4 py-4 text-white sm:px-6 sm:py-5">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
              Division Schedule
            </div>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{title || "Team Schedule"}</h2>
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
          <aside className="border-b border-slate-200 bg-slate-100 p-3 sm:p-4 md:max-h-none md:overflow-auto md:border-b-0 md:border-r">
            <label className="block md:hidden">
              <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                Team Schedule
              </span>
              <select
                value={selectedTeamId || ""}
                onChange={(event) => {
                  const team = teams.find((candidate) => String(candidate.id) === String(event.target.value));
                  if (team) onSelectTeam?.(team);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-900 shadow-sm"
                aria-label="Choose team schedule"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.standing?.rank ? `#${team.standing.rank} ` : ""}{team.name} - {team.standing?.standings_points ?? 0} pts
                  </option>
                ))}
              </select>
            </label>
            <div className="hidden md:block">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Teams sorted by Rank
              </div>
              <div className="inline-grid grid-cols-2 overflow-hidden rounded-xl border border-slate-300 bg-white p-0.5 text-xs font-black shadow-sm">
                <button
                  type="button"
                  onClick={() => setStandingsView("summary")}
                  className={`rounded-lg px-3 py-1.5 ${
                    standingsView === "summary"
                      ? "bg-blue-700 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Summary
                </button>
                <button
                  type="button"
                  onClick={() => setStandingsView("detail")}
                  className={`rounded-lg px-3 py-1.5 ${
                    standingsView === "detail"
                      ? "bg-blue-700 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Detail
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:block md:space-y-2">
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
                  {standingsView === "summary" ? (
                    <span className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 truncate">{team.name}</span>
                      <span className="shrink-0 text-right text-xs font-black">
                        {team.standing?.standings_points ?? 0} pts / {formatTeamRecord(team)}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span>{team.standing?.rank ? `#${team.standing.rank} ` : ""}{team.name}</span>
                      <span className={`mt-1 block text-xs ${
                        String(team.id) === String(selectedTeamId)
                          ? "text-slate-300"
                          : "text-slate-500"
                      }`}>
                        {formatTeamSummary(team)}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
            </div>
          </aside>

          <section className="min-h-0 overflow-auto bg-slate-50 p-3 sm:p-5">
            <div className="mb-3 overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-700 via-blue-800 to-emerald-700 p-4 text-white shadow-lg sm:mb-4 sm:p-5">
              <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <div className="min-w-0 sm:flex-1">
                  <div className="text-xs font-black uppercase tracking-wide text-blue-100">
                    Selected Team
                  </div>
                  <div className="mt-1 break-words text-xl font-black sm:truncate sm:text-2xl">
                    {selectedTeam?.name || "Select a team"}
                  </div>
                </div>
                {selectedTeam && selectedTeamCaptainNames && (
                  <div
                    className="w-full min-w-0 text-left text-[11px] font-bold leading-tight text-blue-100 sm:max-w-[42%] sm:shrink-0 sm:truncate sm:text-right sm:text-xs"
                    title={`Captains: ${selectedTeamCaptainNames}`}
                  >
                    Captains: {selectedTeamCaptainNames}
                  </div>
                )}
              </div>
              {selectedTeam && (
                <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-white/15 px-3 py-2 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wide text-blue-100">
                      Season Record
                    </div>
                    <div className="mt-1 font-black text-white">
                      {formatTeamSummary(selectedTeam)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/15 px-3 py-2 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-wide text-blue-100">
                      Home Location
                    </div>
                    <div className="mt-1 font-black text-white">
                      {formatHomeLocation(selectedTeam)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                Loading schedule...
              </div>
            ) : scheduleItems.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                No schedule found for this team.
              </div>
            ) : (
              <div className="space-y-3">
                {scheduleItems.map((item) =>
                  item.type === "bye" ? (
                    <ScheduleByeCard key={`${selectedTeamId}:${item.key}`} bye={item.data} />
                  ) : (
                    <ScheduleMatchCard
                      key={`${selectedTeamId}:${item.key}`}
                      match={item.data}
                      selectedTeamId={selectedTeamId}
                      compact={compact}
                      ratingByMemberId={ratingByMemberId}
                      ratingType={ratingType}
                    />
                  )
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ScheduleByeCard({ bye }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
      <div className="h-1 bg-amber-500" />
      <div className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 sm:text-sm">
                {formatDate(bye.bye_date)}
              </div>
              <div className="inline-flex rounded-full bg-amber-500 px-3 py-1 text-xs font-black uppercase tracking-wide text-white sm:text-sm">
                BYE WEEK
              </div>
              <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white sm:text-sm">
                Week {bye.week_number || "-"}
              </div>
            </div>
            <div className="mt-2 text-base font-black text-amber-950 sm:text-lg">
              {bye.teams?.name || "Team"} has no match scheduled
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-amber-900">
              <span>{bye.divisions?.name || "Division"}</span>
            </div>
          </div>

          <div className="rounded-xl bg-white px-3 py-2 text-sm font-black uppercase tracking-wide text-amber-900 shadow-sm">
            No Match Scheduled
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleMatchCard({ match, selectedTeamId, compact, ratingByMemberId, ratingType }) {
  const [expanded, setExpanded] = useState(false);
  const matchCardRef = useRef(null);
  const isHome = String(match.home_team_id) === String(selectedTeamId);
  const opponent = isHome ? match.away_team : match.home_team;
  const selectedScore = isHome ? match.home_score : match.away_score;
  const opponentScore = isHome ? match.away_score : match.home_score;
  const hasScore = selectedScore !== null && selectedScore !== undefined && opponentScore !== null && opponentScore !== undefined;
  const showMatchDetails = hasScore && match.score_status === "verified";
  const verifiedCompleted = match.status === "completed" && match.score_status === "verified";
  const selectedTeamWon =
    verifiedCompleted &&
    selectedTeamId &&
    match.winning_team_id &&
    String(match.winning_team_id) === String(selectedTeamId);
  const selectedTeamLost =
    verifiedCompleted &&
    selectedTeamId &&
    match.winning_team_id &&
    String(match.winning_team_id) !== String(selectedTeamId);
  const homeScore = match.home_score;
  const awayScore = match.away_score;
  const homeWon =
    String(match.winning_team_id || "") === String(match.home_team_id || "") ||
    (homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined && Number(homeScore) > Number(awayScore));
  const awayWon =
    String(match.winning_team_id || "") === String(match.away_team_id || "") ||
    (homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined && Number(awayScore) > Number(homeScore));
  const matchAccentClass = selectedTeamWon
    ? "bg-emerald-500"
    : selectedTeamLost
      ? "bg-red-500"
      : "bg-blue-500";
  function hideMatchDetails() {
    setExpanded(false);
    requestAnimationFrame(() => {
      matchCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function hideMatchDetailsOnKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    hideMatchDetails();
  }

  return (
    <div ref={matchCardRef} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`h-1 ${matchAccentClass}`} />
      <div className="p-3 sm:p-4">
      <div className={compact ? "grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem] md:items-start" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-950 sm:text-sm">
              {formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "Time TBD")}
            </div>
            <div className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white sm:text-sm">
              Week {match.week_number || "-"}
            </div>
          </div>
          <div className={`${compact ? "break-words" : ""} mt-1 text-base font-black text-slate-900 sm:text-lg`}>
            {formatTeamName(match.home_team, "Home")} vs {formatTeamName(match.away_team, "Away")}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
            <span>{isHome ? "Home" : "Away"} vs {formatTeamName(opponent, "Opponent")}</span>
            <span>at {match.locations?.name || "Location TBD"}</span>
            {showMatchDetails && (
              <button
                type="button"
                onClick={() => {
                  if (expanded) {
                    hideMatchDetails();
                    return;
                  }

                  setExpanded(true);
                }}
                className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-black text-blue-900 hover:bg-blue-200"
              >
                {expanded ? "Hide Match Details" : "Show Match Details"}
              </button>
            )}
          </div>
        </div>

        <div className={compact ? "w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:w-56 md:justify-self-end" : "rounded-lg bg-slate-100 px-3 py-2 text-right"}>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {formatScoreStatus(match)}
          </div>
          {compact ? (
            <div className="mt-2 space-y-1">
              <ScoreRow label="Home" name={formatTeamName(match.home_team, "Home")} score={homeScore} won={homeWon} />
              <ScoreRow label="Away" name={formatTeamName(match.away_team, "Away")} score={awayScore} won={awayWon} />
            </div>
          ) : (
            <div className="mt-1 text-lg font-black text-slate-900">
              {hasScore ? `${selectedScore}-${opponentScore}` : "No score"}
            </div>
          )}
        </div>
      </div>
      </div>

      {showMatchDetails && expanded && match.match_lines?.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={hideMatchDetails}
          onKeyDown={hideMatchDetailsOnKeyDown}
          className="mx-3 mb-4 cursor-pointer space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:mx-4"
          aria-label="Hide match details"
        >
          {match.match_lines
            .slice()
            .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))
            .map((line) => {
              const winnerName = formatLineWinnerName(match, line);
              const lineAccentClass = lineHeaderAccentClass(match, line, selectedTeamId);

              return (
              <div key={line.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg ${lineAccentClass} px-3 py-2 text-sm text-white`}>
                  <span className="font-black">
                    Game {line.line_number || "-"}{line.division_lines?.line_name ? ` - ${line.division_lines.line_name}` : ""}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white">
                    {capitalizeLabel(line.division_lines?.line_type || "Line")} · {duprPostedLabel(line)}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900">
                      Team Points: {formatLineTeamPoints(line)}
                    </span>
                    {winnerName && (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950">
                        Winner: {winnerName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                  <TeamPlayers
                    label="Home"
                    players={[line.home_player_1, line.home_player_2]}
                    ratingByMemberId={ratingByMemberId}
                    ratingType={ratingType}
                  />
                  <TeamPlayers
                    label="Away"
                    players={[line.away_player_1, line.away_player_2]}
                    ratingByMemberId={ratingByMemberId}
                    ratingType={ratingType}
                  />
                </div>
                <GameScoreRows line={line} match={match} />
              </div>
              );
            })}
        </div>
      )}
      {showMatchDetails && expanded && !match.match_lines?.length && (
        <div
          role="button"
          tabIndex={0}
          onClick={hideMatchDetails}
          onKeyDown={hideMatchDetailsOnKeyDown}
          className="mx-4 mb-4 cursor-pointer rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500"
          aria-label="Hide match details"
        >
          No game details have been entered for this match yet.
        </div>
      )}
    </div>
  );
}

function compareScheduleItems(a, b) {
  const aDate = new Date(`${a.date || "9999-12-31"}T${a.time || "00:00"}`);
  const bDate = new Date(`${b.date || "9999-12-31"}T${b.time || "00:00"}`);
  return aDate - bDate;
}

function GameScoreRows({ line, match }) {
  const games = (line.line_games || [])
    .slice()
    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0));

  if (games.length === 0) {
    return (
      <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
        No individual game scores entered.
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
      {games.map((game) => (
        <GameScoreCard key={game.id} game={game} match={match} />
      ))}
    </div>
  );
}

function GameScoreCard({ game, match }) {
  const specialLabel = specialGameStatusLabel(game.game_status, match);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        Game {game.game_number || "-"}
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="rounded-lg bg-white px-2 py-2 font-black text-slate-800">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Home</div>
          <div className="text-2xl text-slate-950">{game.home_score ?? "-"}</div>
        </div>
        <div className="text-sm font-black text-slate-400">-</div>
        <div className="rounded-lg bg-white px-2 py-2 font-black text-slate-800">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Away</div>
          <div className="text-2xl text-slate-950">{game.away_score ?? "-"}</div>
        </div>
      </div>
      {specialLabel && (
        <div className="mt-2 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-black text-amber-950">
          {specialLabel}
        </div>
      )}
    </div>
  );
}

function TeamPlayers({ label, players, ratingByMemberId, ratingType }) {
  const enteredPlayers = players.filter(Boolean);

  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 space-y-1 font-semibold text-slate-800">
        {enteredPlayers.length === 0 ? (
          <div className="text-slate-500">Players not entered</div>
        ) : (
          enteredPlayers.map((player) => (
            <div key={player.id} className="flex items-center justify-between gap-2">
              <span>{formatMemberName(player)}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">
                {formatPlayerRating(player, ratingByMemberId, ratingType)}
              </span>
            </div>
          ))
        )}
        {enteredPlayers.length > 0 && (
          <div className="pt-1 text-xs font-black uppercase tracking-wide text-slate-600">
            Team Rating: {formatTeamLineRating(enteredPlayers, ratingByMemberId, ratingType)}
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

function formatTeamSummary(team) {
  const standing = team?.standing;
  const points = standing?.standings_points ?? 0;

  return `${formatTeamRecord(team)} / ${points} pts`;
}

function formatHomeLocation(team) {
  return team?.locations?.name || "No Home Location";
}

function captainNames(team) {
  return [
    team?.captain,
    team?.co_captain_1,
    team?.co_captain_2,
  ]
    .map(formatCaptainName)
    .filter(Boolean)
    .join(", ");
}

function formatCaptainName(member) {
  if (!member) return "";
  return (
    member.full_name ||
    `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
    member.email ||
    ""
  );
}

function formatLineTeamPoints(line) {
  const divisionLine = line?.division_lines || {};
  const lineType = String(divisionLine.line_type || "").trim().toLowerCase();
  const games = line?.line_games || [];
  const hasPlayedGame = games.some((game) =>
    game.home_score !== null && game.home_score !== undefined ||
    game.away_score !== null && game.away_score !== undefined ||
    game.game_status && game.game_status !== "scheduled"
  );
  const points = lineType === "picklebreaker" && !hasPlayedGame
    ? Number(divisionLine.picklebreaker_not_played_points ?? divisionLine.team_win_points ?? 1)
    : Number(divisionLine.team_win_points ?? 1);

  if (Number.isNaN(points)) return "-";
  return lineType === "picklebreaker" && !hasPlayedGame ? `${points} not played` : points;
}

function lineHeaderAccentClass(match, line, selectedTeamId) {
  const selectedId = String(selectedTeamId || "");
  const winningId = String(line?.winning_team_id || "");

  if (selectedId && winningId) {
    return winningId === selectedId ? "bg-emerald-500" : "bg-red-500";
  }

  const selectedIsHome = selectedId && String(match?.home_team_id || "") === selectedId;
  const selectedIsAway = selectedId && String(match?.away_team_id || "") === selectedId;
  const homeWins = Number(line?.home_team_games_won || 0);
  const awayWins = Number(line?.away_team_games_won || 0);

  if ((selectedIsHome && homeWins > awayWins) || (selectedIsAway && awayWins > homeWins)) {
    return "bg-emerald-500";
  }

  if ((selectedIsHome && awayWins > homeWins) || (selectedIsAway && homeWins > awayWins)) {
    return "bg-red-500";
  }

  return "bg-blue-500";
}

function duprPostedLabel(line) {
  const posted = line?.posted_to_dupr ?? line?.division_lines?.posted_to_dupr;
  return posted ? "Posted to DUPR" : "Not Posted to DUPR";
}

function capitalizeLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTeamName(team, fallback) {
  return team?.name || fallback;
}

function specialGameStatusLabel(status, match) {
  if (status === "forfeit_home") return `Forfeited to ${formatTeamName(match?.home_team, "Home")}`;
  if (status === "forfeit_away") return `Forfeited to ${formatTeamName(match?.away_team, "Away")}`;
  if (status === "retired_home") return `Retired to ${formatTeamName(match?.home_team, "Home")}`;
  if (status === "retired_away") return `Retired to ${formatTeamName(match?.away_team, "Away")}`;
  return "";
}

function formatLineWinnerName(match, line) {
  if (line?.winning_team_id) {
    if (String(line.winning_team_id) === String(match?.home_team_id)) {
      return formatTeamName(match?.home_team, "Home");
    }

    if (String(line.winning_team_id) === String(match?.away_team_id)) {
      return formatTeamName(match?.away_team, "Away");
    }
  }

  const homeWins = Number(line?.home_team_games_won || 0);
  const awayWins = Number(line?.away_team_games_won || 0);

  if (homeWins > awayWins) return formatTeamName(match?.home_team, "Home");
  if (awayWins > homeWins) return formatTeamName(match?.away_team, "Away");

  return "";
}

function formatScoreStatus(match) {
  const status = match?.score_status || "not_entered";

  if (status === "not_entered") return "Not Entered";

  const label = status.replaceAll("_", " ");
  const titleLabel = label.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const timestamp =
    status === "verified"
      ? match?.score_verified_at
      : match?.score_entered_at;

  return timestamp
    ? `${titleLabel} - ${formatDisplayTimestampShort(timestamp)}`
    : titleLabel;
}

function formatDate(value) {
  return formatDisplayDate(value, "Date TBD");
}

function formatMemberName(member) {
  return `${member?.first_name || ""} ${member?.last_name || ""}`.trim() || "Player";
}

function formatPlayerRating(player, ratingByMemberId, ratingType) {
  const ratingRow = player?.id ? ratingByMemberId?.[String(player.id)] : null;
  const rating =
    ratingType === "primetime"
      ? ratingRow?.season_primetime_rating
      : ratingType === "self_rating"
        ? player?.self_rating
        : ratingRow?.season_dupr_rating;

  if (rating === null || rating === undefined || rating === "") return "NR";

  const number = Number(rating);
  return Number.isNaN(number) ? "NR" : number.toFixed(2);
}

function formatTeamLineRating(players, ratingByMemberId, ratingType) {
  const ratings = players
    .map((player) => Number(formatPlayerRating(player, ratingByMemberId, ratingType)))
    .filter((rating) => !Number.isNaN(rating));

  if (!ratings.length) return "NR";

  return ratings.reduce((sum, rating) => sum + rating, 0).toFixed(2);
}
