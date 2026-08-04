"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { appConfirm, appPrompt } from "../lib/appDialog";
import AppHeader from "../components/AppHeader";
import ListingCount from "../components/ListingCount";
import { getRequestAuthorizationHeaders, requireRole, supabase } from "../lib/auth";
import { confirmDeleteActionAsync } from "../lib/confirmDelete";
import { formatDisplayDate } from "../lib/dateTime";
import { useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";

export default function SeasonsPage() {
  const router = useRouter();
  const [seasons, setSeasons] = useState([]);
  const [seasonName, setSeasonName] = useState("");
  const [seasonAbbreviation, setSeasonAbbreviation] = useState("");
  const [seasonStart, setSeasonStart] = useState("");
  const [seasonEnd, setSeasonEnd] = useState("");
  const [editingSeasonId, setEditingSeasonId] = useState(null);
  const [seasonFormOpen, setSeasonFormOpen] = useState(false);
  const [seasonSearch, setSeasonSearch] = useState("");
  const [showInactiveSeasons, setShowInactiveSeasons] = useState(false);
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const [rolloverSourceSeasonId, setRolloverSourceSeasonId] = useState("");
  const [rolloverName, setRolloverName] = useState("");
  const [rolloverAbbreviation, setRolloverAbbreviation] = useState("");
  const [rolloverStartDate, setRolloverStartDate] = useState("");
  const [rolloverEndDate, setRolloverEndDate] = useState("");
  const [rolloverCopyRosters, setRolloverCopyRosters] = useState(true);
  const [rollingOver, setRollingOver] = useState(false);

  useUnsavedChangesWarning(
    Boolean(seasonFormOpen && (editingSeasonId || seasonName.trim() || seasonAbbreviation.trim() || seasonStart || seasonEnd)),
    "season"
  );

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
      abbreviation: seasonAbbreviation.trim() || null,
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
    setSeasonFormOpen(false);
    loadSeasons();
  }

  async function deleteSeason(id) {
    const ok = await confirmDeleteActionAsync({
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
      const ok = await appConfirm(`Activate season "${season.name}"? Teams will remain in their current active/inactive state.`, { title: "Activate season", confirmLabel: "Activate", tone: "warning" });
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

    const ok = await confirmTypedInactivateAction({
      title: `Inactivate season "${season.name}"?`,
      details: [
        "This will archive the season and mark its teams inactive.",
        "Historical standings, matches, scores, rosters, and player history will be kept exactly as they are.",
      ].join("\n"),
    });

    if (!ok) return;

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

    return { error: null };
  }

  function openRollover() {
    setRolloverSourceSeasonId(seasons.find((season) => season.is_active !== false)?.id || seasons[0]?.id || "");
    setRolloverName("");
    setRolloverAbbreviation("");
    setRolloverStartDate("");
    setRolloverEndDate("");
    setRolloverCopyRosters(true);
    setRolloverOpen(true);
  }

  async function runRollover() {
    if (!rolloverSourceSeasonId || !rolloverName.trim()) {
      alert("Choose a source season and enter the new season name.");
      return;
    }

    const sourceSeason = seasons.find((season) => String(season.id) === String(rolloverSourceSeasonId));
    const ok = await appConfirm(
      `Create "${rolloverName.trim()}" from "${sourceSeason?.name || "the selected season"}"?\n\nThis copies leagues, divisions, configured game lines, teams, captains, and${rolloverCopyRosters ? " rosters" : " no rosters"}. It does not copy standings, schedules, byes, matches, scores, ratings, or player results.`,
      { title: "Create next season", confirmLabel: "Copy Forward", tone: "warning" }
    );
    if (!ok) return;

    setRollingOver(true);
    try {
      const response = await fetch("/api/season-rollover", {
        method: "POST",
        headers: await getRequestAuthorizationHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          sourceSeasonId: rolloverSourceSeasonId,
          name: rolloverName.trim(),
          abbreviation: rolloverAbbreviation.trim(),
          startDate: rolloverStartDate || null,
          endDate: rolloverEndDate || null,
          copyRosters: rolloverCopyRosters,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to copy the season forward.");
      await appConfirm(`New season created with ${result.copied.leagues} leagues, ${result.copied.divisions} divisions, ${result.copied.teams} teams, and ${result.copied.rosterMemberships} roster memberships. Standings and schedules were not copied.`, { title: "Season created", confirmLabel: "OK", tone: "success" });
      setRolloverOpen(false);
      await loadSeasons();
    } catch (error) {
      alert(error.message || "Unable to copy the season forward.");
    } finally {
      setRollingOver(false);
    }
  }

  function editSeason(season) {
    setEditingSeasonId(season.id);
    setSeasonName(season.name || "");
    setSeasonAbbreviation(season.abbreviation || "");
    setSeasonStart(season.start_date || "");
    setSeasonEnd(season.end_date || "");
    setSeasonFormOpen(true);
  }

  function openCreateSeason() {
    clearSeasonForm();
    setSeasonFormOpen(true);
  }

  function closeSeasonForm() {
    clearSeasonForm();
    setSeasonFormOpen(false);
  }

  function clearSeasonForm() {
    setEditingSeasonId(null);
    setSeasonName("");
    setSeasonAbbreviation("");
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

  const filteredSeasons = useMemo(() => {
    const search = seasonSearch.trim().toLowerCase();
    return seasons.filter((season) => {
      if (!showInactiveSeasons && season.is_active === false) return false;
      return !search || [season.name, season.abbreviation, season.start_date, season.end_date]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [seasonSearch, seasons, showInactiveSeasons]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Season Administration"
          subtitle="Create seasons and manage their date windows."
        />

        <div className="grid grid-cols-1 gap-6">
          {seasonFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
          <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
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

              <Field label="Season Abbreviation">
                <input
                  type="text"
                  value={seasonAbbreviation}
                  onChange={(e) => setSeasonAbbreviation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Short season label"
                />
              </Field>

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

                <button
                  type="button"
                  onClick={closeSeasonForm}
                  className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
          </div>
          )}

          {rolloverOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
              <section className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-slate-900">Create Next Season</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">This creates a fresh season from an existing setup. Historical standings, schedules, matches, scores, and player results stay only with the source season.</p>
                <div className="mt-5 space-y-4">
                  <Field label="Copy setup from">
                    <select value={rolloverSourceSeasonId} onChange={(event) => setRolloverSourceSeasonId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3">
                      <option value="">Select source season</option>
                      {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}{season.abbreviation ? ` (${season.abbreviation})` : ""}</option>)}
                    </select>
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="New season name"><input value={rolloverName} onChange={(event) => setRolloverName(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="e.g. Fall 2026" /></Field>
                    <Field label="Abbreviation"><input value={rolloverAbbreviation} onChange={(event) => setRolloverAbbreviation(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" placeholder="e.g. F26" /></Field>
                    <Field label="Start date"><input type="date" value={rolloverStartDate} onChange={(event) => setRolloverStartDate(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></Field>
                    <Field label="End date"><input type="date" value={rolloverEndDate} onChange={(event) => setRolloverEndDate(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" /></Field>
                  </div>
                  <label className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
                    <input type="checkbox" checked={rolloverCopyRosters} onChange={(event) => setRolloverCopyRosters(event.target.checked)} className="mt-1" />
                    <span>
                      <strong>Copy player rosters</strong>
                      <span className="mt-1 block">
                        {rolloverCopyRosters
                          ? "Copies team names, captains, co-captains, club pros, and current player roster memberships. You can adjust the new season without changing the old one."
                          : "Team names, captains, co-captains, and club pros will still be copied. The new teams will start with empty player rosters."}
                      </span>
                    </span>
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><strong>Not copied:</strong> standings, schedules, byes, matches, scores, ratings, and player results. New teams begin with no standings.</div>
                  <div className="flex gap-3">
                    <button type="button" onClick={runRollover} disabled={rollingOver} className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{rollingOver ? "Copying..." : "Create Next Season"}</button>
                    <button type="button" onClick={() => setRolloverOpen(false)} disabled={rollingOver} className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300 disabled:opacity-50">Cancel</button>
                  </div>
                </div>
              </section>
            </div>
          )}

          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Current Seasons</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={openCreateSeason}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Add Season
                </button>
                <button
                  type="button"
                  onClick={openRollover}
                  className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Create Next Season
                </button>
                <ListingCount label="Seasons" shown={filteredSeasons.length} total={seasons.length} />
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Search Seasons</label>
                <input
                  value={seasonSearch}
                  onChange={(e) => setSeasonSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  placeholder="Search by name, abbreviation, or date"
                />
              </div>
              <div className="flex items-end">
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setSeasonSearch("")}
                    className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300 sm:w-auto"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInactiveSeasons((value) => !value)}
                    className={`w-full rounded-xl px-4 py-3 font-semibold sm:w-auto ${
                      showInactiveSeasons
                        ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                        : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                    }`}
                  >
                    {showInactiveSeasons ? "Hide Inactive Seasons" : "Include Inactive Seasons"}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredSeasons.map((season) => (
                <div key={season.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        {season.name}
                      </div>
                      {season.abbreviation && (
                        <div className="mt-1 text-sm font-black text-slate-700">
                          Abbreviation: {season.abbreviation}
                        </div>
                      )}
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

              {seasons.length > 0 && filteredSeasons.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  No seasons match the current search.
                </div>
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

async function confirmTypedInactivateAction({ title, details }) {
  const firstOk = await appConfirm([
    title,
    "",
    details,
    "This is a major administrative change and may not be fully undoable.",
  ].join("\n"), { title, confirmLabel: "Continue", tone: "warning" });

  if (!firstOk) return false;

  const typed = await appPrompt({ title: "Type to confirm", message: "Type INACTIVATE to confirm.", inputLabel: "Type INACTIVATE", requiredValue: "INACTIVATE", confirmLabel: "Inactivate", tone: "error" });
  return String(typed || "").trim() === "INACTIVATE";
}
