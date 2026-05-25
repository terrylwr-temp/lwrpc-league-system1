"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";
import { formatDisplayDate } from "../lib/dateTime";

export default function SeasonsPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState([]);
  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [editingSeasonId, setEditingSeasonId] = useState(null);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadSeasons = useCallback(async function loadSeasons() {
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setSeasons(data || []);
  }, []);

  async function saveSeason(e) {
    e.preventDefault();

    if (!seasonName) {
      alert("Season name required");
      return;
    }

    const payload = {
      name: seasonName,
      start_date: seasonStart || null,
      end_date: seasonEnd || null,
    };

    const { error } = editingSeasonId
      ? await supabase
          .from("seasons")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingSeasonId)
      : await supabase
          .from("seasons")
          .insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    clearSeasonForm();
    loadSeasons();
  }

  async function deleteSeason(id) {
    const ok = confirmDeleteAction({
      title: "Delete this season?",
      details: "This may delete or orphan related leagues, divisions, teams, schedules, matches, scores, standings, and roster records depending on database relationships.",
    });

    if (!ok) return;

    const { error } = await supabase
      .from("seasons")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadSeasons();
  }

  async function toggleSeasonActive(season) {
    const currentlyActive = season.is_active !== false;

    if (!currentlyActive) {
      const ok = confirm(`Activate season "${season.name}"? Teams will remain in their current active/inactive state.`);
      if (!ok) return;

      const { error } = await supabase
        .from("seasons")
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", season.id);

      if (error) {
        alert(error.message);
        return;
      }

      loadSeasons();
      return;
    }

    const firstOk = confirm([
      `Inactivate season "${season.name}"?`,
      "",
      "This will mark the season inactive, mark all teams in this season inactive, and reset those division standings records to 0.",
      "Historical matches and player history will not be deleted.",
    ].join("\n"));

    if (!firstOk) return;

    const typed = prompt(`Type INACTIVATE to confirm inactivating "${season.name}".`);
    if (String(typed || "").trim() !== "INACTIVATE") return;

    const { error } = await inactivateSeasonCascade(season.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadSeasons();
  }

  async function inactivateSeasonCascade(seasonId) {
    const { data: seasonLeagues, error: leaguesError } = await supabase
      .from("leagues")
      .select("id")
      .eq("season_id", seasonId);

    if (leaguesError) return { error: leaguesError };

    const leagueIds = (seasonLeagues || []).map((league) => league.id);
    const { data: seasonDivisions, error: divisionsError } = leagueIds.length > 0
      ? await supabase.from("divisions").select("id, league_id").in("league_id", leagueIds)
      : { data: [], error: null };

    if (divisionsError) return { error: divisionsError };

    const divisionIds = (seasonDivisions || []).map((division) => division.id);
    const { data: seasonTeams, error: teamsError } = divisionIds.length > 0
      ? await supabase.from("teams").select("id, division_id").in("division_id", divisionIds)
      : { data: [], error: null };

    if (teamsError) return { error: teamsError };

    const teamIds = (seasonTeams || []).map((team) => team.id);
    const now = new Date().toISOString();

    const { error: seasonError } = await supabase
      .from("seasons")
      .update({ is_active: false, updated_at: now })
      .eq("id", seasonId);

    if (seasonError) return { error: seasonError };

    if (teamIds.length > 0) {
      const { error: teamError } = await supabase
        .from("teams")
        .update({ is_active: false, updated_at: now })
        .in("id", teamIds);

      if (teamError) return { error: teamError };
    }

    const resetError = await resetSeasonStandings(seasonDivisions || [], seasonTeams || [], now);
    return { error: resetError };
  }

  async function resetSeasonStandings(divisions, teams, updatedAt) {
    const divisionIds = divisions.map((division) => division.id);

    if (divisionIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("team_standings")
        .delete()
        .in("division_id", divisionIds);

      if (deleteError) return deleteError;
    }

    const leagueByDivisionId = Object.fromEntries(
      divisions.map((division) => [String(division.id), division.league_id])
    );
    const rows = teams.map((team, index) => zeroStandingRow({
      leagueId: leagueByDivisionId[String(team.division_id)],
      divisionId: team.division_id,
      teamId: team.id,
      rank: index + 1,
      updatedAt,
    }));

    if (rows.length === 0) return null;

    const { error: insertError } = await supabase.from("team_standings").insert(rows);
    return insertError;
  }

  function editSeason(season) {
    setEditingSeasonId(season.id);
    setSeasonName(season.name || "");
    setSeasonStart(season.start_date || "");
    setSeasonEnd(season.end_date || "");
  }

  function clearSeasonForm() {
    setEditingSeasonId(null);
    setSeasonName("");
    setSeasonStart("");
    setSeasonEnd("");
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadSeasons();
      }
    }

    run();
  }, [checkAuth, loadSeasons]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Season Administration"
          subtitle="Create seasons and manage their date windows."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {editingSeasonId ? "Edit Season" : "Create Season"}
              </h2>
              <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                <div className="text-xs uppercase tracking-wide text-slate-300">
                  Seasons
                </div>
                <div className="text-2xl font-bold">{seasons.length}</div>
              </div>
            </div>

            <form onSubmit={saveSeason} className="space-y-4">
              <input
                type="text"
                value={seasonName}
                onChange={(e) => setSeasonName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                placeholder="Season Name"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Date">
                  <input
                    type="date"
                    value={seasonStart}
                    onChange={(e) => setSeasonStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </Field>

                <Field label="End Date">
                  <input
                    type="date"
                    value={seasonEnd}
                    onChange={(e) => setSeasonEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </Field>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                >
                  {editingSeasonId ? "Save Season" : "Create Season"}
                </button>

                {editingSeasonId && (
                  <button
                    type="button"
                    onClick={clearSeasonForm}
                    className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Current Seasons
              </h2>
              <div className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                {seasons.length}
              </div>
            </div>

            <div className="space-y-3">
              {seasons.map((season) => (
                <div key={season.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {season.name}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {formatDisplayDate(season.start_date, "—")} to {formatDisplayDate(season.end_date, "—")}
                      </div>
                      <SeasonStatusBadge active={season.is_active !== false} />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSeasonActive(season)}
                        className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                          season.is_active === false
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                        }`}
                      >
                        {season.is_active === false ? "Activate" : "Inactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => editSeason(season)}
                        className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSeason(season.id)}
                        className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {seasons.length === 0 && (
                <div className="text-slate-500">No seasons created yet.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SeasonStatusBadge({ active }) {
  return (
    <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
      active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
    }`}>
      {active ? "Active" : "Inactive"}
    </div>
  );
}

function zeroStandingRow({ leagueId, divisionId, teamId, rank, updatedAt }) {
  return {
    league_id: leagueId,
    division_id: divisionId,
    team_id: teamId,
    rank,
    matches_played: 0,
    match_wins: 0,
    match_losses: 0,
    match_ties: 0,
    line_wins: 0,
    line_losses: 0,
    line_ties: 0,
    game_wins: 0,
    game_losses: 0,
    points_for: 0,
    points_against: 0,
    point_differential: 0,
    standings_points: 0,
    home_wins: 0,
    home_losses: 0,
    away_wins: 0,
    away_losses: 0,
    recent_form: "",
    current_streak: "-",
    updated_at: updatedAt,
  };
}
