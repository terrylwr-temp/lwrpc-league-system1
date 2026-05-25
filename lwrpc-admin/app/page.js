"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "./components/AppHeader";
import { requireRole, supabase } from "./lib/auth";
import {
  DEFAULT_GUIDE_BUCKET,
  DEFAULT_GUIDE_PREFIX,
  GUIDE_DOCUMENT_TYPES,
  guideDocumentBody,
  initialGuideDocuments,
  loadGuideDocument,
  openGuideDocument,
} from "./lib/dashboardGuides";

const LOGIN_MESSAGE_TEMPLATES = [
  {
    key: "captain_login_popup",
    label: "Captain Message",
    defaultSubject: "Captain Message",
  },
  {
    key: "player_login_popup",
    label: "Player Message",
    defaultSubject: "Player Message",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [dashboardCounts, setDashboardCounts] = useState(null);
  const [dashboardScope, setDashboardScope] = useState("active");
  const [loginMessages, setLoginMessages] = useState(() =>
    Object.fromEntries(
      LOGIN_MESSAGE_TEMPLATES.map((template) => [
        template.key,
        {
          subject: template.defaultSubject,
          body: "",
        },
      ])
    )
  );
  const [savingMessageKey, setSavingMessageKey] = useState("");
  const [masterResetting, setMasterResetting] = useState(false);
  const [guideDocuments, setGuideDocuments] = useState(initialGuideDocuments());
  const [guideBucket, setGuideBucket] = useState(DEFAULT_GUIDE_BUCKET);
  const [guidePrefix, setGuidePrefix] = useState(DEFAULT_GUIDE_PREFIX);
  const [guideFiles, setGuideFiles] = useState([]);
  const [guideFilesStatus, setGuideFilesStatus] = useState("");
  const [loadingGuideFiles, setLoadingGuideFiles] = useState(false);
  const [savingGuideKey, setSavingGuideKey] = useState("");
  const adminGuide = GUIDE_DOCUMENT_TYPES.find((guideType) => guideType.key === "admin_guide_pdf");

  const loadDashboardCounts = useCallback(async function loadDashboardCounts() {
    setDashboardCounts(null);

    const today = localDateValue(new Date());
    const { start, end } = currentWeekDateRange();

    const [
      membersCount,
      scopedLeagueData,
      teamData,
    ] = await Promise.all([
      countRows("members"),
      loadDashboardLeagues(today, dashboardScope),
      loadTeamsForDashboard(),
    ]);

    const scopedLeagueIds = scopedLeagueData.leagueIds;
    const scopedSeasonIds = scopedLeagueData.seasonIds;
    const scopedTeams = teamData.filter((team) =>
      scopedLeagueIds.includes(team.divisions?.league_id)
    );
    const scopedTeamIds = scopedTeams.map((team) => team.id).filter(Boolean);

    const [
      matchesThisWeekCount,
      scopedRosterData,
      scopedRatingData,
      pendingVerificationCount,
    ] = await Promise.all([
      countScopedMatches(scopedLeagueIds, (query) =>
        query
          .gte("scheduled_date", start)
          .lte("scheduled_date", end)
      ),
      loadScopedRosterData(scopedTeamIds),
      loadScopedRatingData(scopedSeasonIds),
      countScopedMatches(scopedLeagueIds, (query) =>
        query.eq("score_status", "pending_verification")
      ),
    ]);

    const playersOnTeamsCount = scopedRosterData.length;
    const teamsCount = scopedTeams.length;

    setDashboardCounts({
      members: membersCount,
      playersOnTeams: playersOnTeamsCount,
      teams: teamsCount,
      matchesThisWeek: matchesThisWeekCount,
      pendingVerification: pendingVerificationCount,
      averageRosterCount: averageRosterCount(scopedTeams, scopedRosterData),
      averageTeamDupr: averageTeamDupr(scopedTeams, scopedRosterData, scopedRatingData),
    });
  }, [dashboardScope]);

  const loadLoginMessages = useCallback(async function loadLoginMessages() {
    const { data } = await supabase
      .from("notification_templates")
      .select("template_key, subject, body")
      .in("template_key", LOGIN_MESSAGE_TEMPLATES.map((template) => template.key));

    if (!data?.length) return;

    setLoginMessages((current) => {
      const next = { ...current };

      data.forEach((template) => {
        next[template.template_key] = {
          subject: template.subject || next[template.template_key]?.subject || "",
          body: template.body || "",
        };
      });

      return next;
    });
  }, []);

  const loadGuideDocuments = useCallback(async function loadGuideDocuments() {
    const entries = await Promise.all(
      GUIDE_DOCUMENT_TYPES.map(async (guideType) => [
        guideType.key,
        await loadGuideDocument(guideType.key),
      ])
    );

    const nextGuideDocuments = Object.fromEntries(entries);
    setGuideDocuments(nextGuideDocuments);

    const firstConfigured = entries.map(([, document]) => document).find((document) => document?.bucket);
    if (firstConfigured?.bucket) setGuideBucket(firstConfigured.bucket);
  }, []);

  useEffect(() => {
    async function run() {
      const user = await requireRole(router, "league_manager");
      if (user) {
        setReady(true);
        loadDashboardCounts();
        loadLoginMessages();
        loadGuideDocuments();
      }
    }

    run();
  }, [loadDashboardCounts, loadGuideDocuments, loadLoginMessages, router]);

  function updateLoginMessage(templateKey, field, value) {
    setLoginMessages((current) => ({
      ...current,
      [templateKey]: {
        ...current[templateKey],
        [field]: value,
      },
    }));
  }

  async function saveLoginMessage(template) {
    const message = loginMessages[template.key] || {};
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before saving dashboard messages.");
      return;
    }

    setSavingMessageKey(template.key);
    const response = await fetch("/api/notification-templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        template_key: template.key,
        subject: message.subject?.trim() || template.defaultSubject,
        body: message.body || "",
      }),
    });
    const result = await response.json();
    setSavingMessageKey("");

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to save dashboard message.");
      return;
    }

    alert(`${template.label} saved.`);
  }

  function updateGuideDocument(templateKey, field, value) {
    setGuideDocuments((current) => ({
      ...current,
      [templateKey]: {
        ...(current[templateKey] || {
          bucket: guideBucket,
          path: "",
        }),
        [field]: value,
      },
    }));
  }

  async function loadGuideFiles() {
    const bucket = guideBucket.trim();
    const prefix = guidePrefix.trim().replace(/^\/+|\/+$/g, "");

    if (!bucket) {
      setGuideFiles([]);
      setGuideFilesStatus("Enter a Supabase Storage bucket name first.");
      return;
    }

    setLoadingGuideFiles(true);
    setGuideFilesStatus(`Loading PDFs${prefix ? ` from ${prefix}/` : ""}...`);

    const { files, error } = await listPdfFiles(bucket, prefix);

    setLoadingGuideFiles(false);

    if (error) {
      setGuideFiles([]);
      setGuideFilesStatus(error.message);
      return;
    }

    setGuideFiles(files);
    setGuideFilesStatus(
      files.length === 0
        ? `No PDFs found${prefix ? ` in ${prefix}/` : " in this bucket"}.`
        : `${files.length} PDF file${files.length === 1 ? "" : "s"} found.`
    );
  }

  async function saveGuideDocument(guideType) {
    const document = {
      ...(guideDocuments[guideType.key] || {}),
      bucket: guideBucket.trim() || DEFAULT_GUIDE_BUCKET,
    };
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before saving guide PDFs.");
      return;
    }

    setSavingGuideKey(guideType.key);

    const response = await fetch("/api/notification-templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        template_key: guideType.key,
        subject: guideType.label,
        body: guideDocumentBody(document),
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSavingGuideKey("");

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to save guide PDF.");
      return;
    }

    setGuideDocuments((current) => ({
      ...current,
      [guideType.key]: document,
    }));
    alert(`${guideType.label} saved.`);
  }

  async function runMasterResetAll() {
    const firstOk = confirm([
      "Master Reset All will permanently remove generated league operations data.",
      "",
      "It will delete all matches, match lines, game scores, saved match setup lineups, byes, standings, and team roster rows.",
      "It will clear team captains/co-captains, mark all teams inactive, and change Captain user roles back to Player.",
      "Saved Schedule Settings will not be deleted.",
      "",
      "Continue?",
    ].join("\n"));

    if (!firstOk) return;

    const secondOk = confirm("This cannot be undone from the app. Are you absolutely sure you want to reset all leagues and teams?");
    if (!secondOk) return;

    const typed = prompt('Final confirmation: type MASTER RESET ALL to continue.');
    if (String(typed || "").trim() !== "MASTER RESET ALL") return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before running Master Reset All.");
      return;
    }

    setMasterResetting(true);

    const response = await fetch("/api/master-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        confirmation: "MASTER RESET ALL",
      }),
    });
    const result = await response.json().catch(() => ({}));
    setMasterResetting(false);

    if (!response.ok || !result.success) {
      alert(result.error || "Master Reset All failed.");
      return;
    }

    alert("Master Reset All complete.");
    loadDashboardCounts();
  }

  if (!ready) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-6 shadow">
          Loading dashboard...
        </div>
      </main>
    );
  }

  const scopeHelper =
    dashboardScope === "active"
      ? "Active-season"
      : "Current-entry";

  const metricCards = [
    { label: "Members", value: formatCount(dashboardCounts?.members), helper: "Member records", tone: "slate" },
    { label: "Players On Teams", value: formatCount(dashboardCounts?.playersOnTeams), helper: `${scopeHelper} roster assignments`, tone: "blue" },
    { label: "Teams", value: formatCount(dashboardCounts?.teams), helper: `${scopeHelper} teams`, tone: "emerald" },
    { label: "This Week", value: formatCount(dashboardCounts?.matchesThisWeek), helper: `${scopeHelper} scheduled matches`, tone: "amber" },
  ];

  const statusCards = [
    { label: "Average Team Roster Count", value: formatDecimal(dashboardCounts?.averageRosterCount, 1), helper: `Players per ${scopeHelper.toLowerCase()} team` },
    { label: "Pending Verification", value: formatCount(dashboardCounts?.pendingVerification), helper: "Matches awaiting score review" },
    { label: "Average Team DUPR Rating", value: formatDecimal(dashboardCounts?.averageTeamDupr, 3), helper: `Average roster DUPR by ${scopeHelper.toLowerCase()} team` },
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
        { title: "Seasons", desc: "Create seasons and maintain season date ranges.", path: "/seasons", code: "SN", tone: "amber" },
        { title: "Leagues", desc: "Manage leagues and roster locking.", path: "/leagues", code: "LG", tone: "blue" },
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
          actions={
            <button
              type="button"
              onClick={() => openGuideDocument(supabase, adminGuide)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-400"
            >
              Admin Guide
            </button>
          }
        />

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="bg-slate-950 px-4 py-6 text-white md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
              <div className="flex rounded-2xl bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => setDashboardScope("active")}
                  className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                    dashboardScope === "active"
                      ? "bg-white text-slate-950"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  Active Season
                </button>
                <button
                  type="button"
                  onClick={() => setDashboardScope("current")}
                  className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                    dashboardScope === "current"
                      ? "bg-white text-slate-950"
                      : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  Not Active (Current Entries)
                </button>
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

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b border-slate-200 px-4 py-5 md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Dashboard Guides</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Select the guide PDFs shown on the Player, Captain, and Admin dashboards.
                </p>
              </div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                PDF guides
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 md:p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem_auto] md:items-end">
              <GuideField label="Document Bucket">
                <input
                  type="text"
                  value={guideBucket}
                  onChange={(event) => setGuideBucket(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  placeholder="league-documents"
                />
              </GuideField>

              <GuideField label="Folder">
                <input
                  type="text"
                  value={guidePrefix}
                  onChange={(event) => setGuidePrefix(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  placeholder="private"
                />
              </GuideField>

              <button
                type="button"
                onClick={loadGuideFiles}
                disabled={loadingGuideFiles}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loadingGuideFiles ? "Loading..." : "Load PDFs"}
              </button>
            </div>

            {guideFilesStatus && (
              <div className="text-sm font-semibold text-slate-600">
                {guideFilesStatus}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {GUIDE_DOCUMENT_TYPES.map((guideType) => {
                const selectedPath = guideDocuments[guideType.key]?.path || "";

                return (
                  <div key={guideType.key} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-end">
                    <GuideField label={guideType.label}>
                      <select
                        value={selectedPath}
                        onChange={(event) => updateGuideDocument(guideType.key, "path", event.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                      >
                        <option value="">No PDF selected</option>
                        {selectedPath && !guideFiles.includes(selectedPath) && (
                          <option value={selectedPath}>{selectedPath}</option>
                        )}
                        {guideFiles.map((filePath) => (
                          <option key={filePath} value={filePath}>
                            {filePath}
                          </option>
                        ))}
                      </select>
                    </GuideField>

                    <button
                      type="button"
                      onClick={() => saveGuideDocument(guideType)}
                      disabled={savingGuideKey === guideType.key}
                      className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {savingGuideKey === guideType.key ? "Saving..." : "Save"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b border-slate-200 px-4 py-5 md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">Dashboard Messages</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Create login messages for captains and players.
                </p>
              </div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                Login popups
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6">
            {LOGIN_MESSAGE_TEMPLATES.map((template) => {
              const message = loginMessages[template.key] || {};

              return (
                <div key={template.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-black uppercase tracking-wide text-slate-500">
                    {template.label}
                  </div>

                  <input
                    type="text"
                    value={message.subject || ""}
                    onChange={(event) => updateLoginMessage(template.key, "subject", event.target.value)}
                    placeholder={`${template.label} subject`}
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                  />

                  <textarea
                    value={message.body || ""}
                    onChange={(event) => updateLoginMessage(template.key, "body", event.target.value)}
                    placeholder={`Enter the ${template.label.toLowerCase()} to show on login. Leave blank to hide the popup.`}
                    rows={5}
                    className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => saveLoginMessage(template)}
                      disabled={savingMessageKey === template.key}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {savingMessageKey === template.key ? "Saving..." : "Save Message"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-red-200 bg-white shadow">
          <div className="border-b border-red-100 bg-red-50 px-4 py-5 md:px-6">
            <h2 className="text-xl font-black text-red-950">Master Reset</h2>
            <p className="mt-1 text-sm font-semibold text-red-800">
              Deletes generated schedules, matches, scores, standings, byes, rosters, and captain assignments. Saved Schedule Settings are preserved.
            </p>
          </div>
          <div className="p-4 md:p-6">
            <button
              type="button"
              onClick={runMasterResetAll}
              disabled={masterResetting}
              className="rounded-xl bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {masterResetting ? "Resetting..." : "Master Reset All"}
            </button>
          </div>
        </section>

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

async function loadDashboardLeagues(today, dashboardScope) {
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
    console.error("Unable to load dashboard leagues", error);
    return { leagueIds: [], seasonIds: [] };
  }

  const scopedLeagues = (data || []).filter((league) => {
    if (dashboardScope === "current") return true;

    const season = league.seasons;
    if (!season?.start_date || !season?.end_date) return false;
    return season.start_date <= today && season.end_date >= today;
  });

  return {
    leagueIds: scopedLeagues.map((league) => league.id).filter(Boolean),
    seasonIds: uniqueValues(scopedLeagues.map((league) => league.season_id)),
  };
}

async function loadTeamsForDashboard() {
  const { data, error } = await supabase
    .from("teams")
    .select(`
      id,
      is_active,
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

  return (data || []).filter((team) => team.is_active !== false);
}

async function countScopedMatches(scopedLeagueIds, applyFilters) {
  if (!scopedLeagueIds.length) return 0;

  return countRows("matches", (query) => {
    let scopedQuery = query.in("league_id", scopedLeagueIds);

    if (applyFilters) {
      scopedQuery = applyFilters(scopedQuery);
    }

    return scopedQuery;
  });
}

async function loadScopedRosterData(teamIds) {
  if (!teamIds.length) return [];

  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, member_id")
    .in("team_id", teamIds);

  if (error) {
    console.error("Unable to load dashboard roster data", error);
    return [];
  }

  return data || [];
}

async function loadScopedRatingData(seasonIds) {
  if (!seasonIds.length) return [];

  const { data, error } = await supabase
    .from("member_season_ratings")
    .select("member_id, season_id, season_dupr_rating")
    .in("season_id", seasonIds);

  if (error) {
    console.error("Unable to load dashboard season ratings", error);
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

function GuideField({ label, children }) {
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
