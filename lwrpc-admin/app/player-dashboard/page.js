"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useEffect, useMemo, useState } from "react";
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

export default function PlayerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [playHistory, setPlayHistory] = useState([]);
  const [selectedUpcomingTeamId, setSelectedUpcomingTeamId] = useState("");
  const [historyFilter, setHistoryFilter] = useState("");

  async function loadData() {
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
    let historyData = [];

    if (teamIds.length > 0) {
      const { data, error } = await supabase
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
        .order("scheduled_time", { ascending: true });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      matchData = data || [];
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
    setPlayHistory(historyData);
    setLoading(false);
  }

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "player");
      if (ok) await loadData();
    }

    run();
  }, []);

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

  const sortedPlayHistory = useMemo(() => {
    return sortHistoryRows(playHistory);
  }, [playHistory]);

  const playHistoryOptions = useMemo(() => {
    return historyFilterOptions(sortedPlayHistory);
  }, [sortedPlayHistory]);

  const filteredPlayHistory = useMemo(() => {
    return filterHistoryRows(sortedPlayHistory, historyFilter);
  }, [sortedPlayHistory, historyFilter]);

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

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Signed In As
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {member ? `${member.first_name || ""} ${member.last_name || ""}`.trim() : "Player"}
          </div>
          <div className="mt-1 text-sm text-slate-600">{member?.email || ""}</div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">My Teams</h2>
            <button
              type="button"
              onClick={() => router.push("/standings")}
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              View All Standings
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="rounded-xl border border-slate-200 p-4">
                <div className="text-lg font-bold text-slate-900">{team.name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  League: {team.divisions?.leagues?.name || ""}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Division: {team.divisions?.name || ""}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Home Location: {team.locations?.name || ""}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/standings?league=${team.divisions?.leagues?.id || ""}&division=${team.divisions?.id || ""}`)}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Division Standings
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedUpcomingTeamId((current) =>
                      current === team.id ? "" : team.id
                    )
                  }
                  className="ml-2 mt-4 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Upcoming Matches
                </button>
              </div>
            ))}

            {teams.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-slate-500">
                You are not currently listed on any team rosters.
              </div>
            )}
          </div>
        </div>

        {selectedUpcomingTeamId && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Upcoming Matches: {selectedUpcomingTeam?.name || "Team"}
              </h2>

              <div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white">
                {upcomingMatchesBySelectedTeam.length}
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

          <div className="space-y-3">
            {filteredPlayHistory.map((row) => (
              <PlayerHistoryRow
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
      </div>
    </main>
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
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span>{formatDate(match.scheduled_date)} at {match.scheduled_time || "—"}</span>
            <span>{match.divisions?.name || "No Division"}</span>
            <span>{match.locations?.name || "No Location"}</span>
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

function PlayerHistoryRow({ row, memberId }) {
  const match = row.matches;
  const details = playerLineDetails(row, memberId);

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
