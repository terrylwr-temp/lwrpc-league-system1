"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";

export default function LeaguesPage() {
  const router = useRouter();

  const [seasons, setSeasons] = useState([]);
  const [leagues, setLeagues] = useState([]);

  const [seasonName, setSeasonName] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");

  const [leagueName, setLeagueName] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");

  const [editingSeasonId, setEditingSeasonId] = useState(null);
  const [editingLeagueId, setEditingLeagueId] = useState(null);

  async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }

  async function loadData() {
    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true });

    const { data: leaguesData } = await supabase
      .from("leagues")
      .select(`
        *,
        seasons (
          name
        )
      `)
      .order("name", { ascending: true });

    setSeasons(seasonsData || []);
    setLeagues(leaguesData || []);
  }

  async function saveSeason(e) {
    e.preventDefault();

    if (!seasonName) {
      alert("Season name required");
      return;
    }

    if (editingSeasonId) {
      const { error } = await supabase
        .from("seasons")
        .update({
          name: seasonName,
          start_date: seasonStart || null,
          end_date: seasonEnd || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingSeasonId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("seasons")
        .insert({
          name: seasonName,
          start_date: seasonStart || null,
          end_date: seasonEnd || null
        });

      if (error) {
        alert(error.message);
        return;
      }
    }

    clearSeasonForm();
    loadData();
  }

  async function saveLeague(e) {
    e.preventDefault();

    if (!leagueName || !selectedSeason) {
      alert("League name and season required");
      return;
    }

    if (editingLeagueId) {
      const { error } = await supabase
        .from("leagues")
        .update({
          name: leagueName,
          season_id: selectedSeason,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingLeagueId);

      if (error) {
        alert(error.message);
        return;
      }
    } else {
      const { error } = await supabase
        .from("leagues")
        .insert({
          name: leagueName,
          season_id: selectedSeason
        });

      if (error) {
        alert(error.message);
        return;
      }
    }

    clearLeagueForm();
    loadData();
  }

  async function deleteSeason(id) {
    const ok = confirm(
      "Delete this season and all related leagues/divisions/teams?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("seasons")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function deleteLeague(id) {
    const ok = confirm(
      "Delete this league and all related divisions/teams?"
    );

    if (!ok) return;

    const { error } = await supabase
      .from("leagues")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function editSeason(season) {
    setEditingSeasonId(season.id);

    setSeasonName(season.name || "");
    setSeasonStart(season.start_date || "");
    setSeasonEnd(season.end_date || "");
  }

  function editLeague(league) {
    setEditingLeagueId(league.id);

    setLeagueName(league.name || "");
    setSelectedSeason(league.season_id || "");
  }

  function clearSeasonForm() {
    setEditingSeasonId(null);

    setSeasonName("");
    setSeasonStart("");
    setSeasonEnd("");
  }

  function clearLeagueForm() {
    setEditingLeagueId(null);

    setLeagueName("");
    setSelectedSeason("");
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

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <AppHeader
          title="League Administration"
          subtitle="Manage seasons, leagues, and league organization structure."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                {editingSeasonId
                  ? "Edit Season"
                  : "Create Season"}
              </h2>

              <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">

                <div className="text-xs uppercase tracking-wide text-slate-300">
                  Seasons
                </div>

                <div className="text-2xl font-bold">
                  {seasons.length}
                </div>

              </div>

            </div>

            <form
              onSubmit={saveSeason}
              className="space-y-4"
            >

              <input
                type="text"
                value={seasonName}
                onChange={e =>
                  setSeasonName(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                placeholder="Season Name"
              />

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={seasonStart}
                    onChange={e =>
                      setSeasonStart(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />

                </div>

                <div>

                  <label className="mb-1 block text-sm font-semibold text-slate-700">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={seasonEnd}
                    onChange={e =>
                      setSeasonEnd(e.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />

                </div>

              </div>

              <div className="flex gap-3">

                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                >
                  {editingSeasonId
                    ? "Save Season"
                    : "Create Season"}
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

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                {editingLeagueId
                  ? "Edit League"
                  : "Create League"}
              </h2>

              <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">

                <div className="text-xs uppercase tracking-wide text-slate-300">
                  Leagues
                </div>

                <div className="text-2xl font-bold">
                  {leagues.length}
                </div>

              </div>

            </div>

            <form
              onSubmit={saveLeague}
              className="space-y-4"
            >

              <input
                type="text"
                value={leagueName}
                onChange={e =>
                  setLeagueName(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                placeholder="League Name"
              />

              <select
                value={selectedSeason}
                onChange={e =>
                  setSelectedSeason(e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >

                <option value="">
                  Select Season
                </option>

                {seasons.map(season => (
                  <option
                    key={season.id}
                    value={season.id}
                  >
                    {season.name}
                  </option>
                ))}

              </select>

              <div className="flex gap-3">

                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                >
                  {editingLeagueId
                    ? "Save League"
                    : "Create League"}
                </button>

                {editingLeagueId && (
                  <button
                    type="button"
                    onClick={clearLeagueForm}
                    className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                )}

              </div>

            </form>

          </div>

        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                Seasons
              </h2>

              <div className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                {seasons.length}
              </div>

            </div>

            <div className="space-y-3">

              {seasons.map(season => (
                <div
                  key={season.id}
                  className="rounded-xl border border-slate-200 p-4"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <div className="text-lg font-bold text-slate-900">
                        {season.name}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        {season.start_date || "—"}
                        {" to "}
                        {season.end_date || "—"}
                      </div>

                    </div>

                    <div className="flex gap-2">

                      <button
                        onClick={() => editSeason(season)}
                        className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteSeason(season.id)
                        }
                        className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                </div>
              ))}

              {seasons.length === 0 && (
                <div className="text-slate-500">
                  No seasons created yet.
                </div>
              )}

            </div>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">

              <h2 className="text-xl font-bold text-slate-900">
                Leagues
              </h2>

              <div className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                {leagues.length}
              </div>

            </div>

            <div className="space-y-3">

              {leagues.map(league => (
                <div
                  key={league.id}
                  className="rounded-xl border border-slate-200 p-4"
                >

                  <div className="flex items-start justify-between gap-4">

                    <div>

                      <div className="text-lg font-bold text-slate-900">
                        {league.name}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Season:
                        {" "}
                        {league.seasons?.name || "—"}
                      </div>

                    </div>

                    <div className="flex gap-2">

                      <button
                        onClick={() => editLeague(league)}
                        className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          deleteLeague(league.id)
                        }
                        className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>

                    </div>

                  </div>

                </div>
              ))}

              {leagues.length === 0 && (
                <div className="text-slate-500">
                  No leagues created yet.
                </div>
              )}

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
