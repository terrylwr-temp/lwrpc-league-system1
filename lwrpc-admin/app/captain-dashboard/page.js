"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";

export default function CaptainDashboardPage() {
  const router = useRouter();

  const [currentMember, setCurrentMember] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [byeWeeks, setByeWeeks] = useState([]);
  const [teamStats, setTeamStats] = useState({});
  const [upcomingTeamFilter, setUpcomingTeamFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    const user = await requireRole(router, "captain");
    return !!user;
  }

  async function loadData() {
    setLoading(true);

    const startedAt = Date.now();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    if (!memberData) {
      setCurrentMember(null);
      setLoading(false);
      return;
    }

    setCurrentMember(memberData);

    const { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select(`
        *,
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
      `)
      .or(
        `captain_member_id.eq.${memberData.id},co_captain_member_id.eq.${memberData.id},co_captain_2_member_id.eq.${memberData.id}`
      )
      .order("name", { ascending: true });

    if (teamError) {
      alert(teamError.message);
      setLoading(false);
      return;
    }

    setTeams(teamData || []);

    const teamIds = (teamData || []).map((team) => team.id);

    if (teamIds.length === 0) {
      setMatches([]);
      setByeWeeks([]);
      setTeamStats({});
      finishLoading(startedAt, setLoading);
      return;
    }

    const [{ data: rosterRows, error: rosterError }, { data: standingsRows, error: standingsError }] =
      await Promise.all([
        supabase
          .from("team_members")
          .select("team_id")
          .in("team_id", teamIds),
        supabase
          .from("team_standings")
          .select("team_id, rank, standings_points, match_wins, match_losses, match_ties")
          .in("team_id", teamIds),
      ]);

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    if (standingsError) {
      alert(standingsError.message);
      setLoading(false);
      return;
    }

    const nextTeamStats = {};

    teamIds.forEach((teamId) => {
      nextTeamStats[teamId] = {
        playerCount: 0,
        standing: null,
      };
    });

    (rosterRows || []).forEach((row) => {
      if (!nextTeamStats[row.team_id]) {
        nextTeamStats[row.team_id] = { playerCount: 0, standing: null };
      }

      nextTeamStats[row.team_id].playerCount += 1;
    });

    (standingsRows || []).forEach((row) => {
      if (!nextTeamStats[row.team_id]) {
        nextTeamStats[row.team_id] = { playerCount: 0, standing: null };
      }

      nextTeamStats[row.team_id].standing = row;
    });

    setTeamStats(nextTeamStats);

    const { data: matchData, error: matchError } = await supabase
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
        ),
        winning_team:teams!matches_winning_team_id_fkey (
          id,
          name
        )
      `)
      .or(
        `home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`
      )
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (matchError) {
      alert(matchError.message);
      setLoading(false);
      return;
    }

    setMatches(matchData || []);

    const { data: byeData, error: byeError } = await supabase
      .from("team_byes")
      .select(`
        *,
        teams (
          id,
          name
        ),
        divisions (
          id,
          name
        )
      `)
      .in("team_id", teamIds)
      .order("bye_date", { ascending: true });

    if (byeError) {
      alert(byeError.message);
      setLoading(false);
      return;
    }

    setByeWeeks(byeData || []);
    finishLoading(startedAt, setLoading);
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, []);

  const upcomingMatches = useMemo(() => {
    return matches.filter(
      (match) => match.status !== "completed" && match.status !== "cancelled"
    );
  }, [matches]);

  const filteredUpcomingMatches = useMemo(() => {
    if (!upcomingTeamFilter) return upcomingMatches;

    return upcomingMatches.filter(
      (match) =>
        String(match.home_team_id) === String(upcomingTeamFilter) ||
        String(match.away_team_id) === String(upcomingTeamFilter)
    );
  }, [upcomingMatches, upcomingTeamFilter]);

  const filteredByeWeeks = useMemo(() => {
    if (!upcomingTeamFilter) return byeWeeks;

    return byeWeeks.filter(
      (bye) => String(bye.team_id) === String(upcomingTeamFilter)
    );
  }, [byeWeeks, upcomingTeamFilter]);

  const upcomingItems = useMemo(() => {
    return [
      ...filteredUpcomingMatches.map((match) => ({
        type: "match",
        date: match.scheduled_date,
        time: match.scheduled_time || "00:00",
        data: match,
      })),
      ...filteredByeWeeks.map((bye) => ({
        type: "bye",
        date: bye.bye_date,
        time: "00:00",
        data: bye,
      })),
    ].sort((a, b) => {
      const aDate = new Date(`${a.date || "9999-12-31"}T${a.time || "00:00"}`);
      const bDate = new Date(`${b.date || "9999-12-31"}T${b.time || "00:00"}`);
      return aDate - bDate;
    });
  }, [filteredUpcomingMatches, filteredByeWeeks]);

  const pendingVerification = useMemo(() => {
    return matches.filter((match) => match.score_status === "pending_verification");
  }, [matches]);

  const completedMatches = useMemo(() => {
    return matches.filter((match) => match.status === "completed");
  }, [matches]);

  function matchCard(match) {
    const canEnterScores =
      match.scheduled_date &&
      match.scheduled_date <= localDateString();

    return (
      <div
        key={match.id}
        className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="truncate text-base font-bold text-slate-900">
                {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
              </div>

              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-blue-900">
                Week {match.week_number || "—"}
              </span>

              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-green-900">
                Home: {match.home_team?.name || "Home"}
              </span>

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-700">
                Away: {match.away_team?.name || "Away"}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>{formatDate(match.scheduled_date)} at {match.scheduled_time || "—"}</span>
              <span>{match.locations?.name || "No Location"}</span>
              <span>{match.status || "scheduled"}</span>
              <span>Score: <span className="font-semibold">{match.score_status || "not_entered"}</span></span>
            </div>

            {match.status === "completed" && (
              <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
                Score: {match.home_score ?? 0} - {match.away_score ?? 0} · Winner: {match.winning_team?.name || "—"}
              </div>
            )}

            {match.score_disputed && (
              <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
                Disputed: {match.score_dispute_notes || "No notes provided."}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!canEnterScores}
            onClick={() => {
              if (canEnterScores) router.push(`/matches/${match.id}`);
            }}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            title={canEnterScores ? "Enter match scores" : "Scores unlock on the scheduled match date"}
          >
            Enter Scores
          </button>
        </div>
      </div>
    );
  }
  if (loading) {
    return <LoadingScreen subtitle="Loading Captain Dashboard..." />;
  }

  if (!currentMember) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl">
          <AppHeader
            title="Captain Dashboard"
            subtitle="Captain tools, match operations, and score verification."
          />

          <div className="rounded-2xl bg-white p-8 text-slate-600 shadow">
            Your login email is not currently linked to a member record.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Captain Dashboard"
          subtitle="Captain tools, upcoming matches, score entry, and score verification."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard label="My Teams" value={teams.length} />
          <SummaryCard label="Upcoming Items" value={upcomingItems.length} />
          <SummaryCard label="Pending Verification" value={pendingVerification.length} />
          <SummaryCard label="Completed Matches" value={completedMatches.length} />
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">My Teams</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teams.map((team) => {
              const stats = teamStats[team.id] || {};
              const standing = stats.standing;

              return (
              <div key={team.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-lg font-bold text-slate-900">{team.name}</div>

                  <button
                    type="button"
                    onClick={() => router.push(`/standings?league=${team.divisions?.leagues?.id || ""}&division=${team.divisions?.id || ""}`)}
                    className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-blue-900 hover:bg-blue-200"
                  >
                    Rank {standing?.rank ? `#${standing.rank}` : "N/A"}
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    Players: {stats.playerCount ?? 0}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    Points: {standing?.standings_points ?? 0}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    W-L-T: {standing?.match_wins ?? 0}-{standing?.match_losses ?? 0}-{standing?.match_ties ?? 0}
                  </span>
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  League: {team.divisions?.leagues?.name || "—"}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Division: {team.divisions?.name || "—"}
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Home Location: {team.locations?.name || "—"}
                </div>

                <button
                  type="button"
                  onClick={() => router.push(`/teams/${team.id}`)}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Manage Roster
                </button>
              </div>
              );
            })}

            {teams.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-slate-500">
                You are not currently assigned as captain or co-captain of any team.
              </div>
            )}
          </div>
        </div>

        <Section title="Pending Score Verification" count={pendingVerification.length}>
          {pendingVerification.map(matchCard)}
          {pendingVerification.length === 0 && <Empty message="No scores currently need verification." />}
        </Section>

        <Section
          title="Upcoming Matches / Byes"
          count={upcomingItems.length}
          actions={
            teams.length > 1 ? (
              <select
                value={upcomingTeamFilter}
                onChange={(e) => setUpcomingTeamFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 md:w-64"
                aria-label="Filter upcoming matches by team"
              >
                <option value="">All My Teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            ) : null
          }
        >
          {upcomingItems.map((item) =>
            item.type === "match" ? matchCard(item.data) : byeCard(item.data)
          )}

          {upcomingItems.length === 0 && <Empty message="No upcoming matches or byes found." />}
        </Section>

        <Section title="Completed Matches" count={completedMatches.length}>
          {completedMatches.map(matchCard)}
          {completedMatches.length === 0 && <Empty message="No completed matches found." />}
        </Section>
      </div>
    </main>
  );
}

function finishLoading(startedAt, setLoading) {
  const elapsed = Date.now() - startedAt;
  const remaining = Math.max(0, 500 - elapsed);

  setTimeout(() => {
    setLoading(false);
  }, remaining);
}

function formatDate(value) {
  if (!value) return "—";

  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString();
  } catch {
    return value;
  }
}

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function byeCard(bye) {
  return (
    <div
      key={`bye-${bye.id}`}
      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-900">
          <span className="font-bold">BYE WEEK</span>
          <span>{bye.teams?.name || "—"}</span>
          <span>{bye.divisions?.name || "—"}</span>
          <span>Week {bye.week_number || "—"}</span>
          <span>{formatDate(bye.bye_date)}</span>
        </div>

        <div className="rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-900">
          No Match Scheduled
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Section({ title, count, actions, children }) {
  return (
    <div className="mt-6 rounded-2xl bg-white p-6 shadow">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>

        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {actions}

          <div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-bold text-white">
            {count}
          </div>
        </div>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Empty({ message }) {
  return (
    <div className="rounded-xl bg-slate-50 p-6 text-center text-slate-500">
      {message}
    </div>
  );
}



