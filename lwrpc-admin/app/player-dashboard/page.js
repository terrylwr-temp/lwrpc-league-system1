"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import {
  filterHistoryRows,
  formatDate,
  historyFilterOptions,
  playerLineDetails,
  sortHistoryRows,
} from "../lib/playHistory";
import { formatPhoneNumberForStorage } from "../lib/phone";

export default function PlayerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standings, setStandings] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [activePanel, setActivePanel] = useState("history");
  const [selectedUpcomingTeamId, setSelectedUpcomingTeamId] = useState("");
  const [selectedStandingsTeamId, setSelectedStandingsTeamId] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");

  const loadData = useCallback(async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("email", user.email)
      .maybeSingle();

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    setMember(memberData || null);

    if (!memberData?.id) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const { data: rosterData, error: rosterError } = await supabase
      .from("team_members")
      .select(`
        team_id,
        teams (
          id,
          name,
          divisions (
            id,
            name,
            leagues (
              id,
              name
            )
          ),
          locations (
            id,
            name
          ),
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        )
      `)
      .eq("member_id", memberData.id);

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    const playerTeams = (rosterData || []).map((row) => row.teams).filter(Boolean);
    const teamIds = playerTeams.map((team) => team.id);
    let matchData = [];
    let standingsData = [];
    let historyData = [];

    if (teamIds.length > 0) {
      const divisionIds = [...new Set(playerTeams.map((team) => team.divisions?.id).filter(Boolean))];
      const [
        { data, error },
        { data: standingsRows, error: standingsError },
      ] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            *,
            divisions (
              id,
              name
            ),
            locations (
              id,
              name
            ),
            home_team:teams!matches_home_team_id_fkey (
              id,
              name
            ),
            away_team:teams!matches_away_team_id_fkey (
              id,
              name
            )
          `)
          .or(
            `home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`
          )
          .order("scheduled_date", { ascending: true })
          .order("scheduled_time", { ascending: true }),
        supabase
          .from("team_standings")
          .select(`
            *,
            teams (
              id,
              name
            )
          `)
          .in("division_id", divisionIds.length > 0 ? divisionIds : ["00000000-0000-0000-0000-000000000000"])
          .order("rank", { ascending: true }),
      ]);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      if (standingsError) {
        alert(standingsError.message);
        setLoading(false);
        return;
      }

      matchData = data || [];
      standingsData = standingsRows || [];
    }

    const { data: playerHistoryData, error: playerHistoryError } = await supabase
      .from("match_lines")
      .select(`
        id,
        line_number,
        home_player_1_id,
        home_player_2_id,
        away_player_1_id,
        away_player_2_id,
        home_team_games_won,
        away_team_games_won,
        winning_team_id,
        line_games (
          id,
          game_number,
          home_score,
          away_score,
          game_status
        ),
        division_lines (
          id,
          line_name,
          line_type
        ),
        matches (
          id,
          scheduled_date,
          scheduled_time,
          status,
          home_team_id,
          away_team_id,
          home_team:teams!matches_home_team_id_fkey (
            id,
            name
          ),
          away_team:teams!matches_away_team_id_fkey (
            id,
            name
          ),
          divisions (
            id,
            name
          ),
          leagues (
            id,
            name,
            seasons (
              id,
              name
            )
          )
        )
      `)
      .or(
        `home_player_1_id.eq.${memberData.id},home_player_2_id.eq.${memberData.id},away_player_1_id.eq.${memberData.id},away_player_2_id.eq.${memberData.id}`
      );

    if (playerHistoryError) {
      alert(playerHistoryError.message);
      setLoading(false);
      return;
    }

    historyData = playerHistoryData || [];

    setTeams(playerTeams);
    setMatches(matchData);
    setStandings(standingsData);
    setPlayHistory(historyData);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "player");
      if (ok) await loadData();
    }

    run();
  }, [loadData, router]);

  const upcomingMatchesBySelectedTeam = useMemo(() => {
    if (!selectedUpcomingTeamId) return [];

    return matches.filter(
      (match) =>
        match.status !== "completed" &&
        match.status !== "cancelled" &&
        (String(match.home_team_id) === String(selectedUpcomingTeamId) ||
          String(match.away_team_id) === String(selectedUpcomingTeamId))
    );
  }, [matches, selectedUpcomingTeamId]);

  const selectedUpcomingTeam = useMemo(() => {
    return teams.find(
      (team) => String(team.id) === String(selectedUpcomingTeamId)
    );
  }, [teams, selectedUpcomingTeamId]);

  const selectedStandingsTeam = useMemo(() => {
    return teams.find(
      (team) => String(team.id) === String(selectedStandingsTeamId)
    );
  }, [teams, selectedStandingsTeamId]);

  const selectedDivisionStandings = useMemo(() => {
    if (!selectedStandingsTeam) return [];

    return standings.filter(
      (row) => String(row.division_id) === String(selectedStandingsTeam.divisions?.id)
    );
  }, [selectedStandingsTeam, standings]);

  const sortedPlayHistory = useMemo(() => {
    return sortHistoryRows(playHistory);
  }, [playHistory]);

  const playHistoryOptions = useMemo(() => {
    return historyFilterOptions(sortedPlayHistory);
  }, [sortedPlayHistory]);

  const filteredPlayHistory = useMemo(() => {
    return filterHistoryRows(sortedPlayHistory, historyFilter);
  }, [sortedPlayHistory, historyFilter]);

  const playHistoryStats = useMemo(() => {
    return filteredPlayHistory.reduce(
      (stats, row) => {
        const details = playerLineDetails(row, member?.id);

        stats.games += 1;

        if (details.result === "W") stats.wins += 1;
        if (details.result === "L") stats.losses += 1;
        if (details.result !== "W" && details.result !== "L") stats.ties += 1;

        return stats;
      },
      {
        games: 0,
        wins: 0,
        losses: 0,
        ties: 0,
      }
    );
  }, [filteredPlayHistory, member]);

  function selectPanel(panel) {
    setActivePanel(panel);

    if (panel === "standings" && !selectedStandingsTeamId && teams.length > 0) {
      setSelectedStandingsTeamId(teams[0].id);
    }

    if (panel === "upcoming" && !selectedUpcomingTeamId && teams.length > 0) {
      setSelectedUpcomingTeamId(teams[0].id);
    }
  }

  if (loading) {
    return <LoadingScreen subtitle="Loading Player Dashboard..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Player Dashboard"
          subtitle="Your league teams, standings, and match access."
        />

        <section className="rounded-2xl bg-white p-5 shadow">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}

            {teams.length === 0 && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-slate-500">
                You are not currently listed on any team rosters.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <DashboardOption
              active={activePanel === "history"}
              label="My Play History"
              value={filteredPlayHistory.length}
              onClick={() => selectPanel("history")}
            />
            <DashboardOption
              active={activePanel === "standings"}
              label="Division Standings"
              value={selectedDivisionStandings.length || standings.length}
              onClick={() => selectPanel("standings")}
            />
            <DashboardOption
              active={activePanel === "upcoming"}
              label="Upcoming Matches"
              value={upcomingMatchesBySelectedTeam.length || matches.filter((match) => match.status !== "completed" && match.status !== "cancelled").length}
              onClick={() => selectPanel("upcoming")}
            />
          </div>
        </section>

        {activePanel === "standings" && (
          <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
            <div className="flex flex-col gap-2 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Division Standings: {selectedStandingsTeam?.divisions?.name || "Division"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                {selectedStandingsTeam?.divisions?.leagues?.name || ""}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <TeamSelect
                  value={selectedStandingsTeamId}
                  onChange={setSelectedStandingsTeamId}
                  teams={teams}
                  label="Choose team for standings"
                />
                <div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white">
                  {selectedDivisionStandings.length}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="p-3 text-left">Rank</th>
                    <th className="p-3 text-left">Team</th>
                    <th className="p-3 text-left">W-L-T</th>
                    <th className="p-3 text-left">Games</th>
                    <th className="p-3 text-left">PF</th>
                    <th className="p-3 text-left">PA</th>
                    <th className="p-3 text-left">Diff</th>
                    <th className="p-3 text-left">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDivisionStandings.map((row) => (
                    <tr key={row.id} className={`border-b border-slate-100 ${String(row.team_id) === String(selectedStandingsTeamId) ? "bg-blue-50" : ""}`}>
                      <td className="p-3 font-bold">#{row.rank}</td>
                      <td className="p-3 font-semibold">{row.teams?.name}</td>
                      <td className="p-3">{row.match_wins}-{row.match_losses}-{row.match_ties}</td>
                      <td className="p-3">{row.game_wins}-{row.game_losses}</td>
                      <td className="p-3">{row.points_for}</td>
                      <td className="p-3">{row.points_against}</td>
                      <td className="p-3">{row.point_differential}</td>
                      <td className="p-3 font-bold text-blue-700">{row.standings_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedDivisionStandings.length === 0 && (
                <div className="p-6 text-center text-slate-500">
                  No standings found for this division yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === "upcoming" && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Upcoming Matches: {selectedUpcomingTeam?.name || "Team"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedUpcomingTeam?.divisions?.leagues?.name || ""} / {selectedUpcomingTeam?.divisions?.name || ""}
                </p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <TeamSelect
                  value={selectedUpcomingTeamId}
                  onChange={setSelectedUpcomingTeamId}
                  teams={teams}
                  label="Choose team for upcoming matches"
                />
                <div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white">
                  {upcomingMatchesBySelectedTeam.length}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {upcomingMatchesBySelectedTeam.map((match) => (
                <MatchSummaryCard key={match.id} match={match} router={router} />
              ))}

              {upcomingMatchesBySelectedTeam.length === 0 && (
                <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                  No upcoming matches found for this team.
                </div>
              )}
            </div>
          </div>
        )}

        {activePanel === "history" && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold text-slate-900">My Play History</h2>

            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
              aria-label="Filter play history by league and season"
            >
              <option value="">All Leagues / Seasons</option>
              {playHistoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <HistoryStat label="Games Played" value={playHistoryStats.games} />
            <HistoryStat label="Wins" value={playHistoryStats.wins} />
            <HistoryStat label="Losses" value={playHistoryStats.losses} />
            <HistoryStat label="Other" value={playHistoryStats.ties} />
          </div>

          <div className="space-y-3">
            {filteredPlayHistory.map((row) => (
              <PlayerHistoryRowWithScores
                key={row.id}
                row={row}
                memberId={member?.id}
              />
            ))}

            {filteredPlayHistory.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
                No game play history found.
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </main>
  );
}

function DashboardOption({ active, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        active
          ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700"
          : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-black text-slate-950">{label}</div>
          <div className={`mt-1 text-xs font-bold ${active ? "text-blue-700" : "text-slate-500 group-hover:text-blue-700"}`}>
            Click to view
          </div>
        </div>
        <div className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-bold text-white">
          {value}
        </div>
      </div>
    </button>
  );
}

function HistoryStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function TeamCard({ team }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="font-bold text-slate-900">{team.name}</div>
      <div className="mt-1 text-slate-600">
        {team.divisions?.leagues?.name || ""} / {team.divisions?.name || ""}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-3">
        {teamCaptainContacts(team).map((contact) => (
          <div key={contact.label} className="rounded-lg bg-white px-3 py-2">
            <div className="font-bold text-slate-900">{contact.label}</div>
            <div>{contact.name || "Not assigned"}</div>
            {contact.phone && <div>{contact.phone}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function teamCaptainContacts(team) {
  return [
    { label: "Captain", member: team.captain },
    { label: "Co-Captain 1", member: team.co_captain_1 },
    { label: "Co-Captain 2", member: team.co_captain_2 },
  ].map((item) => ({
    label: item.label,
    name: formatMemberName(item.member),
    phone: formatPhoneNumberForStorage(item.member?.phone),
  }));
}

function formatMemberName(member) {
  if (!member) return "";
  return `${member.first_name || ""} ${member.last_name || ""}`.trim() || member.email || "";
}

function TeamSelect({ value, onChange, teams, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-64 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
      aria-label={label}
    >
      <option value="">Select Team</option>
      {teams.map((team) => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </select>
  );
}

function MatchSummaryCard({ match, router }) {
  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-bold text-slate-900">
            {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide">
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-900">
              Home: {match.home_team?.name || "Home"}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              Played at: {match.locations?.name || "No Location"}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>{formatDate(match.scheduled_date)} at {match.scheduled_time || "—"}</span>
            <span>{match.divisions?.name || "No Division"}</span>
            <span>Week {match.week_number || "—"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/live-match/${match.id}`)}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Match Details
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PlayerHistoryRow({ row, memberId }) {
  const match = row.matches;
  const details = playerLineDetails(row, memberId);
  const gameScores = formatGameScores(row, details.sideLabel);
  void gameScores;

  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-black ${
            details.result === "W"
              ? "bg-green-100 text-green-800"
              : details.result === "L"
              ? "bg-red-100 text-red-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {details.result}
        </span>
        <span className="font-bold text-slate-900">
          {formatDate(match?.scheduled_date)}
        </span>
        <span className="text-slate-600">vs {details.opponentName}</span>
        <span className="font-semibold text-slate-800">{details.score}</span>
      </div>

      <div className="mt-1 text-sm text-slate-600">
        {match?.leagues?.seasons?.name || "No Season"} / {match?.leagues?.name || "No League"} · {match?.divisions?.name || "No Division"} · {row.division_lines?.line_name || row.division_lines?.line_type || `Line ${row.line_number || "—"}`} · {details.sideLabel}
      </div>
    </div>
  );
}

function PlayerHistoryRowWithScores({ row, memberId }) {
  const match = row.matches;
  const details = playerLineDetails(row, memberId);
  const gameScores = formatGameScores(row, details.sideLabel);

  return (
    <div className="rounded-xl border border-slate-200 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-black ${
            details.result === "W"
              ? "bg-green-100 text-green-800"
              : details.result === "L"
              ? "bg-red-100 text-red-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {details.result}
        </span>
        <span className="font-bold text-slate-900">
          {formatDate(match?.scheduled_date)}
        </span>
        <span className="text-slate-600">vs {details.opponentName}</span>
        <span className="font-semibold text-slate-800">{details.score}</span>
      </div>

      <div className="mt-1 text-sm text-slate-600">
        {match?.leagues?.seasons?.name || "No Season"} / {match?.leagues?.name || "No League"} / {match?.divisions?.name || "No Division"} / {row.division_lines?.line_name || row.division_lines?.line_type || `Line ${row.line_number || "Line"}`} / {details.sideLabel}
      </div>

      {gameScores.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-700">
          {gameScores.map((game) => (
            <span key={game.key} className="rounded-lg bg-slate-100 px-2 py-1">
              {game.label}: {game.score}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatGameScores(row, sideLabel) {
  return [...(row.line_games || [])]
    .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
    .filter((game) => game.home_score !== null && game.away_score !== null)
    .map((game) => {
      const isHome = sideLabel === "Home";
      const playerScore = isHome ? game.home_score : game.away_score;
      const opponentScore = isHome ? game.away_score : game.home_score;

      return {
        key: game.id || game.game_number,
        label: `Game ${game.game_number || ""}`.trim(),
        score: `${playerScore}-${opponentScore}`,
      };
    });
}
