"use client";

import { formatDisplayDate, formatDisplayTime, formatDisplayTimestampShort } from "../lib/dateTime";
import { useState } from "react";

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
  const selectedTeam = teams.find((team) => String(team.id) === String(selectedTeamId));
  const teamRecordById = Object.fromEntries(
    teams.map((team) => [String(team.id), formatTeamSummary(team)])
  );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 sm:p-4">
      <div className="flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
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
          <aside className="max-h-40 overflow-auto border-b border-slate-200 bg-slate-100 p-3 sm:p-4 md:max-h-[72vh] md:border-b-0 md:border-r">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Teams sorted by Rank
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
                  <span>{team.standing?.rank ? `#${team.standing.rank} ` : ""}{team.name}</span>
                  <span className={`mt-1 block text-xs ${
                    String(team.id) === String(selectedTeamId)
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}>
                    {formatTeamSummary(team)}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="min-h-0 overflow-auto bg-slate-50 p-3 sm:p-5 md:max-h-[72vh]">
            <div className="mb-3 rounded-2xl bg-white p-3 shadow-sm sm:mb-4 sm:p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Selected Team
              </div>
              <div className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
                {selectedTeam?.name || "Select a team"}
              </div>
              {selectedTeam && (
                <div className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-black text-emerald-900">
                  Season Record: {formatTeamSummary(selectedTeam)}
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
                      teamRecordById={teamRecordById}
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
            <div className="inline-flex rounded-full bg-amber-200 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-950">
              Bye Week
            </div>
            <div className="mt-2 text-base font-black text-amber-950 sm:text-lg">
              {bye.teams?.name || "Team"} has no match scheduled
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold text-amber-900">
              <span>{formatDate(bye.bye_date)}</span>
              <span>Week {bye.week_number || "-"}</span>
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

function ScheduleMatchCard({ match, selectedTeamId, compact, teamRecordById, ratingByMemberId, ratingType }) {
  const [expanded, setExpanded] = useState(false);
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
      <div className="p-3 sm:p-4">
      <div className={compact ? "grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_14rem] md:items-start" : "flex flex-wrap items-start justify-between gap-3"}>
        <div className="min-w-0">
          <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-950 sm:text-sm">
            {formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "Time TBD")}
          </div>
          <div className={`${compact ? "break-words" : ""} mt-1 text-base font-black text-slate-900 sm:text-lg`}>
            {formatTeamNameWithRecord(match.home_team, teamRecordById, "Home")} vs {formatTeamNameWithRecord(match.away_team, teamRecordById, "Away")}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
            <span>{isHome ? "Home" : "Away"} vs {formatTeamNameWithRecord(opponent, teamRecordById, "Opponent")}</span>
            <span>{match.locations?.name || "Location TBD"}</span>
            <span>Week {match.week_number || "-"}</span>
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="rounded-lg bg-blue-100 px-3 py-1 text-xs font-black text-blue-900 hover:bg-blue-200"
            >
              {expanded ? "Hide Match Details" : "Show Match Details"}
            </button>
          </div>
        </div>

        <div className={compact ? "w-full rounded-xl border border-slate-200 bg-slate-50 p-3 md:w-56 md:justify-self-end" : "rounded-lg bg-slate-100 px-3 py-2 text-right"}>
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
            {formatScoreStatus(match)}
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
      </div>

      {expanded && match.match_lines?.length > 0 && (
        <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-slate-100">
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
                <GameScoreRows line={line} />
              </div>
            ))}
        </div>
      )}
      {expanded && !match.match_lines?.length && (
        <div className="mx-4 mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
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

function GameScoreRows({ line }) {
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
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 text-xs">
      {games.map((game) => (
        <div
          key={game.id}
          className="grid grid-cols-1 gap-2 border-b border-slate-100 bg-white px-3 py-2 last:border-b-0 md:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] md:items-center"
        >
          <div className="font-semibold text-slate-700">
            Home
          </div>
          <div className="rounded-lg bg-slate-950 px-3 py-2 text-center font-black text-white">
            Game {game.game_number || "-"}: {game.home_score ?? "-"}-{game.away_score ?? "-"}
          </div>
          <div className="font-semibold text-slate-700 md:text-right">
            Away
          </div>
          <div className="text-slate-600 md:col-span-3">
            Result: {formatGameStatus(game.game_status)}
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamPlayers({ label, players, ratingByMemberId, ratingType }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 space-y-1 font-semibold text-slate-800">
        {players.filter(Boolean).length === 0 ? (
          <div className="text-slate-500">Players not entered</div>
        ) : (
          players.filter(Boolean).map((player) => (
            <div key={player.id} className="flex items-center justify-between gap-2">
              <span>{formatMemberName(player)}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-slate-700">
                {formatPlayerRating(player, ratingByMemberId, ratingType)}
              </span>
            </div>
          ))
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

function formatTeamNameWithRecord(team, teamRecordById, fallback) {
  const name = team?.name || fallback;
  const record = team?.id ? teamRecordById?.[String(team.id)] : "";

  return record ? `${name} (${record})` : name;
}

function formatGameStatus(status) {
  return status ? status.replaceAll("_", " ") : "scheduled";
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
