"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appConfirm, appPrompt } from "../lib/appDialog";
import AppHeader from "../components/AppHeader";
import ListingCount from "../components/ListingCount";
import LoadingScreen from "../components/LoadingScreen";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";
import {
  DEFAULT_LEAGUE_DOCUMENT_BUCKET,
  DEFAULT_LEAGUE_DOCUMENT_PREFIX,
  LEAGUE_DOCUMENT_TYPES,
  initialLeagueDocuments,
  leagueDocumentPayload,
} from "../lib/leagueDocuments";
import { useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";

export default function LeaguesPage() {
  const router = useRouter();

  const [seasons, setSeasons] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [leagueName, setLeagueName] = useState("");
  const [leagueAbbreviation, setLeagueAbbreviation] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [rostersLocked, setRostersLocked] = useState(false);
  const [onlyHomeCommunityPlayers, setOnlyHomeCommunityPlayers] = useState(false);
  const [matchSetupReminderDaysBefore, setMatchSetupReminderDaysBefore] = useState("2");
  const [documentBucket, setDocumentBucket] = useState(DEFAULT_LEAGUE_DOCUMENT_BUCKET);
  const [documentPrefix, setDocumentPrefix] = useState(DEFAULT_LEAGUE_DOCUMENT_PREFIX);
  const [leagueDocuments, setLeagueDocuments] = useState(initialLeagueDocuments());
  const [documentFiles, setDocumentFiles] = useState([]);
  const [documentFilesStatus, setDocumentFilesStatus] = useState("");
  const [loadingDocumentFiles, setLoadingDocumentFiles] = useState(false);
  const [editingLeagueId, setEditingLeagueId] = useState(null);
  const [leagueFormOpen, setLeagueFormOpen] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState("");
  const [showInactiveLeagues, setShowInactiveLeagues] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useUnsavedChangesWarning(
    Boolean(leagueFormOpen && (editingLeagueId || leagueName.trim() || leagueAbbreviation.trim() || selectedSeason || rostersLocked || onlyHomeCommunityPlayers || matchSetupReminderDaysBefore !== "2" || documentBucket !== DEFAULT_LEAGUE_DOCUMENT_BUCKET || documentPrefix !== DEFAULT_LEAGUE_DOCUMENT_PREFIX || Object.values(leagueDocuments).some(Boolean))),
    "league"
  );

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const [{ data: seasonsData }, { data: leaguesData }] = await Promise.all([
      supabase
        .from("seasons")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("leagues")
        .select(`
          *,
          seasons (
            name,
            abbreviation,
            is_active
          )
        `)
        .order("name", { ascending: true }),
    ]);

    setSeasons((seasonsData || []).filter((season) => season.is_active !== false));
    setLeagues(leaguesData || []);
  }, []);

  async function saveLeague(e) {
    e.preventDefault();

    if (!leagueName || !selectedSeason) {
      alert("League name and season required");
      return;
    }

    const payload = {
      name: leagueName,
      abbreviation: leagueAbbreviation.trim() || null,
      season_id: selectedSeason,
      rosters_locked: rostersLocked,
      only_home_community_players: onlyHomeCommunityPlayers,
      match_setup_reminder_days_before: Number(matchSetupReminderDaysBefore || 0),
      league_document_bucket: documentBucket.trim() || null,
      ...leagueDocumentPayload(leagueDocuments),
    };

    const { error } = editingLeagueId
      ? await supabase
          .from("leagues")
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingLeagueId)
      : await supabase
          .from("leagues")
          .insert(payload);

    if (error) {
      alert(error.message);
      return;
    }

    clearLeagueForm();
    setLeagueFormOpen(false);
    loadData();
  }

  async function deleteLeague(id) {
    const ok = confirmDeleteAction({
      title: "Delete this league?",
      details: "This may delete or orphan related divisions, teams, schedules, matches, scores, standings, and roster records depending on database relationships.",
    });

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

  async function toggleLeagueActive(league) {
    const currentlyActive = league.is_active !== false;

    if (currentlyActive) {
      const ok = await confirmTypedInactivateAction({
        title: `Inactivate league "${league.name}"?`,
        details: "This will hide the league from current setup dropdowns and can affect active division, team, schedule, and history workflows.",
      });
      if (!ok) return;
    }

    const { error } = await supabase
      .from("leagues")
      .update({
        is_active: !currentlyActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", league.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function editLeague(league) {
    setEditingLeagueId(league.id);
    setLeagueName(league.name || "");
    setLeagueAbbreviation(league.abbreviation || "");
    setSelectedSeason(league.season_id || "");
    setRostersLocked(league.rosters_locked === true);
    setOnlyHomeCommunityPlayers(league.only_home_community_players === true);
    setMatchSetupReminderDaysBefore(String(league.match_setup_reminder_days_before ?? 2));
    setDocumentBucket(league.league_document_bucket || DEFAULT_LEAGUE_DOCUMENT_BUCKET);
    setLeagueDocuments(
      Object.fromEntries(
        LEAGUE_DOCUMENT_TYPES.map((documentType) => [
          documentType.column,
          league[documentType.column] || "",
        ])
      )
    );
    setLeagueFormOpen(true);
  }

  function copyLeague(league) {
    setEditingLeagueId(null);
    setLeagueName(league.name || "");
    setLeagueAbbreviation(league.abbreviation || "");
    setSelectedSeason("");
    setRostersLocked(league.rosters_locked === true);
    setOnlyHomeCommunityPlayers(league.only_home_community_players === true);
    setMatchSetupReminderDaysBefore(String(league.match_setup_reminder_days_before ?? 2));
    setDocumentBucket(league.league_document_bucket || DEFAULT_LEAGUE_DOCUMENT_BUCKET);
    setLeagueDocuments(
      Object.fromEntries(
        LEAGUE_DOCUMENT_TYPES.map((documentType) => [
          documentType.column,
          league[documentType.column] || "",
        ])
      )
    );
    setLeagueFormOpen(true);
  }

  function openCreateLeague() {
    clearLeagueForm();
    setLeagueFormOpen(true);
  }

  function closeLeagueForm() {
    clearLeagueForm();
    setLeagueFormOpen(false);
  }

  function clearLeagueForm() {
    setEditingLeagueId(null);
    setLeagueName("");
    setLeagueAbbreviation("");
    setSelectedSeason("");
    setRostersLocked(false);
    setOnlyHomeCommunityPlayers(false);
    setMatchSetupReminderDaysBefore("2");
    setDocumentBucket(DEFAULT_LEAGUE_DOCUMENT_BUCKET);
    setDocumentPrefix(DEFAULT_LEAGUE_DOCUMENT_PREFIX);
    setLeagueDocuments(initialLeagueDocuments());
  }

  function updateLeagueDocument(column, value) {
    setLeagueDocuments((current) => ({
      ...current,
      [column]: value,
    }));
  }

  async function loadDocumentFiles() {
    const bucket = documentBucket.trim();
    const prefix = documentPrefix.trim().replace(/^\/+|\/+$/g, "");

    if (!bucket) {
      setDocumentFiles([]);
      setDocumentFilesStatus("Enter a Supabase Storage bucket name first.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setDocumentFiles([]);
      setDocumentFilesStatus("You must be signed in before loading private league documents.");
      return;
    }

    setLoadingDocumentFiles(true);
    setDocumentFilesStatus(`Loading PDFs${prefix ? ` from ${prefix}/` : ""}...`);

    const { files, error } = await listPdfFiles(bucket, prefix);

    setLoadingDocumentFiles(false);

    if (error) {
      setDocumentFiles([]);
      setDocumentFilesStatus(error.message);
      return;
    }

    setDocumentFiles(files);
    setDocumentFilesStatus(
      files.length === 0
        ? `No PDFs found${prefix ? ` in ${prefix}/` : " in this bucket"}. Confirm the files are stored under that folder and the bucket has a SELECT policy for authenticated users.`
        : `${files.length} PDF file${files.length === 1 ? "" : "s"} found.`
    );
  }

  useEffect(() => {
    setHydrated(true);

    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, [checkAuth, loadData]);

  if (!hydrated) {
    return <LoadingScreen subtitle="Loading League Administration..." />;
  }

  const visibleLeagues = (() => {
    const search = leagueSearch.trim().toLowerCase();

    return leagues.filter((league) => {
      const matchesActive = showInactiveLeagues || (
        league.is_active !== false && league.seasons?.is_active !== false
      );
      const matchesSearch = !search || [
        league.name,
        league.abbreviation,
        league.seasons?.name,
        league.seasons?.abbreviation,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));

      return matchesActive && matchesSearch;
    });
  })();

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="League Administration"
          subtitle="Manage league settings, rosters, and captain documents."
        />

        <div className="grid grid-cols-1 gap-6">
          {leagueFormOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
          <section className="my-auto w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {editingLeagueId ? "Edit League" : "Create League"}
              </h2>
              <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                <div className="text-xs uppercase tracking-wide text-slate-300">
                  Leagues
                </div>
                <div className="text-2xl font-bold">{leagues.length}</div>
              </div>
            </div>

            <form onSubmit={saveLeague} className="space-y-4">
              <input
                type="text"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
                placeholder="League Name"
              />

              <Field label="League Abbreviation">
                <input
                  type="text"
                  value={leagueAbbreviation}
                  onChange={(e) => setLeagueAbbreviation(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Short league label"
                />
              </Field>

              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Select Season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}{season.abbreviation ? ` (${season.abbreviation})` : ""}
                  </option>
                ))}
              </select>

              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={rostersLocked}
                  onChange={(e) => setRostersLocked(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Lock team rosters
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    When locked, captains and co-captains cannot open or modify team rosters. League Managers and Commissioners can still manage rosters. When unlocked, roster adds still require eligible season ratings.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={onlyHomeCommunityPlayers}
                  onChange={(e) => setOnlyHomeCommunityPlayers(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Only allow players from home community
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    When checked, captains, co-captains, and club pros can only add roster players from the team&apos;s home community. League Managers and Commissioners can still choose any player home location.
                  </span>
                </span>
              </label>

              <Field label="Number of days before game date to email captains to enter their teams">
                <input
                  type="number"
                  min="0"
                  value={matchSetupReminderDaysBefore}
                  onChange={(e) => setMatchSetupReminderDaysBefore(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </Field>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem_auto] md:items-end">
                  <Field label="Document Bucket">
                    <input
                      type="text"
                      value={documentBucket}
                      onChange={(e) => setDocumentBucket(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                      placeholder="league-documents"
                    />
                  </Field>

                  <Field label="Folder">
                    <input
                      type="text"
                      value={documentPrefix}
                      onChange={(e) => setDocumentPrefix(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                      placeholder="private"
                    />
                  </Field>

                  <button
                    type="button"
                    onClick={loadDocumentFiles}
                    disabled={loadingDocumentFiles}
                    className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loadingDocumentFiles ? "Loading..." : "Load PDFs"}
                  </button>
                </div>

                {documentFilesStatus && (
                  <div className="mt-2 text-sm font-semibold text-slate-600">
                    {documentFilesStatus}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3">
                  {LEAGUE_DOCUMENT_TYPES.map((documentType) => (
                    <Field key={documentType.key} label={documentType.label}>
                      <select
                        value={leagueDocuments[documentType.column] || ""}
                        onChange={(e) => updateLeagueDocument(documentType.column, e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                      >
                        <option value="">No PDF selected</option>
                        {leagueDocuments[documentType.column] &&
                          !documentFiles.includes(leagueDocuments[documentType.column]) && (
                            <option value={leagueDocuments[documentType.column]}>
                              {leagueDocuments[documentType.column]}
                            </option>
                          )}
                        {documentFiles.map((filePath) => (
                          <option key={filePath} value={filePath}>
                            {filePath}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800"
                >
                  {editingLeagueId ? "Save League" : "Create League"}
                </button>

                <button
                  type="button"
                  onClick={closeLeagueForm}
                  className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
          </div>
          )}

          <section className="rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Current Leagues</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={openCreateLeague}
                  className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
                >
                  Add League
                </button>
                <button
                  type="button"
                  onClick={() => setShowInactiveLeagues((value) => !value)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold ${
                    showInactiveLeagues
                      ? "bg-slate-200 text-slate-900 hover:bg-slate-300"
                      : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                  }`}
                >
                  {showInactiveLeagues ? "Hide Inactive Leagues" : "Include Inactive Leagues"}
                </button>
                <ListingCount label="Leagues" shown={visibleLeagues.length} total={leagues.length} />
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Search Leagues</label>
                <input
                  value={leagueSearch}
                  onChange={(e) => setLeagueSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  placeholder="Search by league, abbreviation, or season"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setLeagueSearch("")}
                  className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300 md:w-auto"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {visibleLeagues.map((league) => (
                <div key={league.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-lg font-bold text-slate-900">
                          {league.name}
                        </div>
                        {league.abbreviation && (
                          <div className="mt-1 text-sm font-black text-slate-700">
                            Abbreviation: {league.abbreviation}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => editLeague(league)}
                          className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => copyLeague(league)}
                          className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-200"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLeagueActive(league)}
                          className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                            league.is_active === false
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                          }`}
                        >
                          {league.is_active === false ? "Activate" : "Inactivate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteLeague(league.id)}
                          className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="mt-1 text-sm font-bold text-slate-900">
                        Season: {league.seasons?.name || "—"}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          league.is_active === false
                            ? "bg-slate-200 text-slate-700"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {league.is_active === false ? "Inactive" : "Active"}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                          league.rosters_locked
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}>
                          Rosters {league.rosters_locked ? "Locked" : "Open"}
                        </span>
                        {league.only_home_community_players === true && (
                          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-800">
                            Home Community Only
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-slate-600">
                        Match setup reminder: {league.match_setup_reminder_days_before ?? 2} day{Number(league.match_setup_reminder_days_before ?? 2) === 1 ? "" : "s"} before match date
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {LEAGUE_DOCUMENT_TYPES.map((documentType) => (
                          <span
                            key={documentType.key}
                            className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                              league[documentType.column]
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {documentType.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {leagues.length === 0 && (
                <div className="text-slate-500">No leagues created yet.</div>
              )}

              {leagues.length > 0 && visibleLeagues.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  No active leagues found. Use Include Inactive Leagues to view inactive records.
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
      <span className="mb-1 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

async function listPdfFiles(bucket, prefix = "", depth = 0) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, {
      limit: 1000,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

  if (error) return { files: [], error };

  const files = [];

  for (const item of data || []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    const isPdf = item.name.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      files.push(path);
      continue;
    }

    if (!item.name.includes(".") && depth < 3) {
      const nested = await listPdfFiles(bucket, path, depth + 1);
      if (nested.error) return nested;
      files.push(...nested.files);
    }
  }

  return { files, error: null };
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
