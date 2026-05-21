"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "./components/AppHeader";
import { requireRole, supabase } from "./lib/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [dashboardCounts, setDashboardCounts] = useState(null);

  const loadDashboardCounts = useCallback(async function loadDashboardCounts() {
    const today = localDateValue(new Date());
    const { start, end } = currentWeekDateRange();

    const [
      membersCount,
      activeLeagueData,
      teamData,
    ] = await Promise.all([
      countRows("members"),
      loadActiveLeagues(today),
      loadTeamsForDashboard(),
    ]);

    const activeLeagueIds = activeLeagueData.leagueIds;
    const activeSeasonIds = activeLeagueData.seasonIds;
    const activeTeams = teamData.filter((team) =>
      activeLeagueIds.includes(team.divisions?.league_id)
    );
    const activeTeamIds = activeTeams.map((team) => team.id).filter(Boolean);

    const [
      matchesThisWeekCount,
      activeRosterData,
      activeRatingData,
      pendingVerificationCount,
    ] = await Promise.all([
      countActiveMatches(activeLeagueIds, (query) =>
        query
          .gte("scheduled_date", start)
          .lte("scheduled_date", end)
      ),
      loadActiveRosterData(activeTeamIds),
      loadActiveRatingData(activeSeasonIds),
      countActiveMatches(activeLeagueIds, (query) =>
        query.eq("score_status", "pending_verification")
      ),
    ]);

    const playersOnTeamsCount = activeRosterData.length;
    const teamsCount = activeTeams.length;

    setDashboardCounts({
      members: membersCount,
      playersOnTeams: playersOnTeamsCount,
      teams: teamsCount,
      matchesThisWeek: matchesThisWeekCount,
      pendingVerification: pendingVerificationCount,
      averageRosterCount: averageRosterCount(activeTeams, activeRosterData),
      averageTeamDupr: averageTeamDupr(activeTeams, activeRosterData, activeRatingData),
    });
  }, []);

  useEffect(() => {
    async function run() {
      const user = await requireRole(router, "league_manager");
      if (user) {
        setReady(true);
        loadDashboardCounts();
      }
    }

    run();
  }, [loadDashboardCounts, router]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow">
          Loading dashboard...
        </div>
      </main>
    );
  }

  const metricCards = [
    { label: "Members", value: formatCount(dashboardCounts?.members), helper: "Member records", tone: "slate" },
    { label: "Players On Teams", value: formatCount(dashboardCounts?.playersOnTeams), helper: "Active-season roster assignments", tone: "blue" },
    { label: "Teams", value: formatCount(dashboardCounts?.teams), helper: "Active-season teams", tone: "emerald" },
    { label: "This Week", value: formatCount(dashboardCounts?.matchesThisWeek), helper: "Active-season scheduled matches", tone: "amber" },
  ];

  const statusCards = [
    { label: "Average Team Roster Count", value: formatDecimal(dashboardCounts?.averageRosterCount, 1), helper: "Players per active-season team" },
    { label: "Pending Verification", value: formatCount(dashboardCounts?.pendingVerification), helper: "Matches awaiting score review" },
    { label: "Average Team DUPR Rating", value: formatDecimal(dashboardCounts?.averageTeamDupr, 3), helper: "Average roster DUPR by active-season team" },
  ];

  const sections = [
    {
      title: "People And Teams",
      desc: "Keep player records, captains, ratings, teams, and access current.",
      cards: [
        { title: "Members", desc: "Search, edit, and review member records.", path: "/members", code: "MB", tone: "slate" },
        { title: "Season Ratings", desc: "Update DUPR and PrimeTime ratings.", path: "/ratings", code: "RT", tone: "amber" },
        { title: "Teams & Rosters", desc: "Create teams and manage rosters.", path: "/teams", code: "TR", tone: "emerald" },
        { title: "User Roles", desc: "Manage role-based access permissions.", path: "/users", code: "UR", tone: "blue" },
      ],
    },
    {
      title: "Match Operations",
      desc: "Generate, edit, publish, reset, score, and export matches.",
      cards: [
        { title: "Scheduling Admin", desc: "Rules, blackout dates, and initial schedule generation.", path: "/scheduling", code: "SA", tone: "blue" },
        { title: "Schedule Editor", desc: "Review, edit, publish, and reset matches.", path: "/schedule-editor", code: "SE", tone: "amber" },
        { title: "Matches", desc: "Open match operations and match-level details.", path: "/matches", code: "MT", tone: "slate" },
        { title: "Scoring Operations", desc: "Score reminders, verification review, and DUPR export.", path: "/scoring", code: "SC", tone: "emerald" },
      ],
    },
    {
      title: "League Structure",
      desc: "Set up the season framework before teams start playing.",
      cards: [
        { title: "Leagues", desc: "Manage seasons, leagues, and roster locking.", path: "/leagues", code: "LG", tone: "blue" },
        { title: "Divisions", desc: "Manage division rules, DUPR limits, and game lines.", path: "/divisions", code: "DV", tone: "emerald" },
        { title: "Locations", desc: "Maintain clubs, courts, and court availability.", path: "/locations", code: "LC", tone: "slate" },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Admin Dashboard"
          subtitle="League operations, scheduling, scoring, rosters, and access."
        />

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="bg-slate-950 px-4 py-6 text-white md:px-6">
            <div>
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-blue-200">
                  Operations Command Center
                </div>
                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  Run the league from one place
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-300">
                  Jump into the administrative workflows used most often during setup, scheduling, match play, and scoring.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:p-6">
            {metricCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>
        </section>

        <div className="mt-6 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="overflow-hidden rounded-2xl bg-white shadow">
              <div className="border-b border-slate-200 px-4 py-5 md:px-6">
                <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">{section.title}</h2>
                    <p className="mt-1 text-sm font-semibold text-slate-600">{section.desc}</p>
                  </div>
                  <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                    {section.cards.length} tools
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4 md:p-6">
                {section.cards.map((card) => (
                  <AdminActionCard
                    key={card.path}
                    card={card}
                    onClick={() => router.push(card.path)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow md:p-6">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                System Snapshot
              </div>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Operational Counts
              </h2>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {statusCards.map((card) => (
              <Status key={card.label} {...card} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

async function countRows(tableName, applyFilters) {
  let query = supabase
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (applyFilters) {
    query = applyFilters(query);
  }

  const { count, error } = await query;

  if (error) {
    console.error(`Unable to load ${tableName} count`, error);
    return null;
  }

  return count ?? 0;
}

async function loadActiveLeagues(today) {
  const { data, error } = await supabase
    .from("leagues")
    .select(`
      id,
      season_id,
      seasons (
        id,
        start_date,
        end_date
      )
    `);

  if (error) {
    console.error("Unable to load active leagues", error);
    return { leagueIds: [], seasonIds: [] };
  }

  const activeLeagues = (data || []).filter((league) => {
    const season = league.seasons;
    if (!season?.start_date || !season?.end_date) return false;
    return season.start_date <= today && season.end_date >= today;
  });

  return {
    leagueIds: activeLeagues.map((league) => league.id).filter(Boolean),
    seasonIds: uniqueValues(activeLeagues.map((league) => league.season_id)),
  };
}

async function loadTeamsForDashboard() {
  const { data, error } = await supabase
    .from("teams")
    .select(`
      id,
      divisions (
        id,
        league_id,
        leagues (
          id,
          season_id
        )
      )
    `);

  if (error) {
    console.error("Unable to load dashboard teams", error);
    return [];
  }

  return data || [];
}

async function countActiveMatches(activeLeagueIds, applyFilters) {
  if (!activeLeagueIds.length) return 0;

  return countRows("matches", (query) => {
    let scopedQuery = query.in("league_id", activeLeagueIds);

    if (applyFilters) {
      scopedQuery = applyFilters(scopedQuery);
    }

    return scopedQuery;
  });
}

async function loadActiveRosterData(teamIds) {
  if (!teamIds.length) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, member_id")
    .in("team_id", teamIds);

  if (error) {
    console.error("Unable to load active roster data", error);
    return [];
  }

  return data || [];
}

async function loadActiveRatingData(seasonIds) {
  if (!seasonIds.length) return [];

  const { data, error } = await supabase
    .from("member_season_ratings")
    .select("member_id, season_id, season_dupr_rating")
    .in("season_id", seasonIds);

  if (error) {
    console.error("Unable to load active season ratings", error);
    return [];
  }

  return data || [];
}

function formatCount(value) {
  if (value === null || value === undefined) return "...";
  return Number(value).toLocaleString();
}

function formatDecimal(value, places) {
  if (value === null || value === undefined) return "...";
  if (Number.isNaN(Number(value))) return "...";
  return Number(value).toFixed(places);
}

function averageRosterCount(teams, rosterRows) {
  if (!teams.length) return null;
  return rosterRows.length / teams.length;
}

function averageTeamDupr(teams, rosterRows, ratingRows) {
  const ratingsByMemberSeason = {};

  ratingRows.forEach((rating) => {
    const value = Number(rating.season_dupr_rating);
    if (Number.isNaN(value)) return;
    ratingsByMemberSeason[memberSeasonKey(rating.member_id, rating.season_id)] = value;
  });

  const rosterByTeam = {};

  rosterRows.forEach((row) => {
    const teamId = String(row.team_id);
    if (!rosterByTeam[teamId]) rosterByTeam[teamId] = [];
    rosterByTeam[teamId].push(row);
  });

  const teamAverages = teams
    .map((team) => {
      const rows = rosterByTeam[String(team.id)] || [];
      const seasonId = team.divisions?.leagues?.season_id;
      const ratings = rows
        .map((row) => ratingsByMemberSeason[memberSeasonKey(row.member_id, seasonId)])
        .filter((rating) => rating !== undefined);

      if (!ratings.length) return null;

      return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    })
    .filter((rating) => rating !== null);

  if (!teamAverages.length) return null;

  return teamAverages.reduce((sum, rating) => sum + rating, 0) / teamAverages.length;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function memberSeasonKey(memberId, seasonId) {
  return `${memberId || ""}:${seasonId || ""}`;
}

function currentWeekDateRange() {
  const today = new Date();
  const start = new Date(today);
  start.setHours(12, 0, 0, 0);
  start.setDate(today.getDate() - today.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: localDateValue(start),
    end: localDateValue(end),
  };
}

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function MetricCard({ label, value, helper, tone }) {
  const tones = {
    slate: "bg-slate-900 text-white",
    blue: "bg-blue-700 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="text-[11px] font-black uppercase tracking-wide opacity-75">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
      {helper && (
        <div className="mt-1 text-xs font-bold opacity-80">
          {helper}
        </div>
      )}
    </div>
  );
}

function AdminActionCard({ card, onClick }) {
  const tones = {
    slate: "bg-slate-900 text-white",
    blue: "bg-blue-700 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-44 flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-2xl px-3 py-2 text-sm font-black shadow-sm ${tones[card.tone] || tones.slate}`}>
          {card.code}
        </div>
        <div className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-800">
          Open
        </div>
      </div>

      <div className="mt-4 text-lg font-black text-slate-950">
        {card.title}
      </div>

      <div className="mt-2 flex-1 text-sm font-semibold leading-6 text-slate-600">
        {card.desc}
      </div>
    </button>
  );
}

function Status({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-lg font-black text-slate-950">
        {value}
      </div>

      {helper && (
        <div className="mt-1 text-xs font-bold text-slate-500">
          {helper}
        </div>
      )}
    </div>
  );
}
