"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "./components/AppHeader";
import { requireRole, supabase } from "./lib/auth";
import { formatDisplayTimestampShort } from "./lib/dateTime";
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

const SETUP_REMINDER_HIDE_DATE_KEY = "lwrpc-match-setup-reminder-hide-date";

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [dashboardCounts, setDashboardCounts] = useState(null);
  const [dashboardScope, setDashboardScope] = useState("active");
  const [dashboardFilter, setDashboardFilter] = useState("scope");
  const [dashboardRosterCountMode, setDashboardRosterCountMode] = useState("assignments");
  const [dashboardGamesPlayedMode, setDashboardGamesPlayedMode] = useState("games");
  const [dashboardFilterOptions, setDashboardFilterOptions] = useState({
    seasons: [],
    leagues: [],
    divisions: [],
  });
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
  const [messageHistory, setMessageHistory] = useState([]);
  const [loadingMessageHistory, setLoadingMessageHistory] = useState(false);
  const [savingMessageKey, setSavingMessageKey] = useState("");
  const [deletingHistoryId, setDeletingHistoryId] = useState("");
  const [masterResetting, setMasterResetting] = useState(false);
  const [masterResetAcknowledged, setMasterResetAcknowledged] = useState(false);
  const [seasonResetOptions, setSeasonResetOptions] = useState([]);
  const [seasonResetSeasonId, setSeasonResetSeasonId] = useState("");
  const [seasonResetAcknowledged, setSeasonResetAcknowledged] = useState(false);
  const [seasonResetting, setSeasonResetting] = useState(false);
  const [seasonResetHelpOpen, setSeasonResetHelpOpen] = useState(false);
  const [guideDocuments, setGuideDocuments] = useState(initialGuideDocuments());
  const [guideBucket, setGuideBucket] = useState(DEFAULT_GUIDE_BUCKET);
  const [guidePrefix, setGuidePrefix] = useState(DEFAULT_GUIDE_PREFIX);
  const [guideFiles, setGuideFiles] = useState([]);
  const [guideFilesStatus, setGuideFilesStatus] = useState("");
  const [loadingGuideFiles, setLoadingGuideFiles] = useState(false);
  const [savingGuideKey, setSavingGuideKey] = useState("");
  const adminGuide = GUIDE_DOCUMENT_TYPES.find((guideType) => guideType.key === "admin_guide_pdf");
  const [setupReminderPreview, setSetupReminderPreview] = useState(null);
  const [checkingSetupReminders, setCheckingSetupReminders] = useState(false);
  const [sendingSetupReminders, setSendingSetupReminders] = useState(false);
  const [hideSetupRemindersToday, setHideSetupRemindersToday] = useState(false);
  const loadDashboardCounts = useCallback(async function loadDashboardCounts() {
    setDashboardCounts(null);

    const today = localDateValue(new Date());
    const { start, end } = currentWeekDateRange();

    const [membersCount, leagueData, teamData] = await Promise.all([
      countRows("members"),
      loadDashboardLeagues(today, dashboardScope, dashboardFilter),
      loadTeamsForDashboard(),
    ]);

    const scopedLeagueIds = leagueData.leagueIds;
    const scopedDivisionIds = leagueData.divisionIds;
    const scopedSeasonIds = leagueData.seasonIds;
    const scopedTeams = teamData.filter((team) => {
      const divisionId = team.divisions?.id;
      const leagueId = team.divisions?.league_id;

      if (scopedDivisionIds.length > 0) {
        return scopedDivisionIds.includes(divisionId);
      }

      return scopedLeagueIds.includes(leagueId);
    });
    const scopedTeamIds = scopedTeams.map((team) => team.id).filter(Boolean);

    const [
      matchesThisWeekCount,
      scopedRosterData,
      scopedRatingData,
      pendingVerificationCount,
      gamesPlayedCount,
      matchesPlayedCount,
    ] = await Promise.all([
      countScopedMatches(leagueData, (query) =>
        query
          .gte("scheduled_date", start)
          .lte("scheduled_date", end)
      ),
      loadScopedRosterData(scopedTeamIds),
      loadScopedRatingData(scopedSeasonIds),
      countScopedMatches(leagueData, (query) =>
        query.eq("score_status", "pending_verification")
      ),
      countScopedPlayedGames(leagueData),
      countScopedMatches(leagueData, (query) =>
        query.eq("score_status", "verified")
      ),
    ]);

    const rosterAssignmentCount = scopedRosterData.length;
    const uniqueRosterPlayerCount = uniqueValues(scopedRosterData.map((row) => row.member_id)).length;
    const teamsCount = scopedTeams.length;

    setDashboardCounts({
      members: membersCount,
      playersOnTeamsAssignments: rosterAssignmentCount,
      playersOnTeamsUnique: uniqueRosterPlayerCount,
      teams: teamsCount,
      matchesThisWeek: matchesThisWeekCount,
      pendingVerification: pendingVerificationCount,
      gamesPlayed: gamesPlayedCount,
      matchesPlayed: matchesPlayedCount,
      averageRosterCount: averageRosterCount(scopedTeams, scopedRosterData),
      averageTeamDupr: averageTeamDupr(scopedTeams, scopedRosterData, scopedRatingData),
    });
  }, [dashboardFilter, dashboardScope]);

  const loadDashboardFilterOptions = useCallback(async function loadDashboardFilterOptions() {
    const [{ data: seasonData }, { data: leagueData }, { data: divisionData }] = await Promise.all([
      supabase.from("seasons").select("id, name").order("name", { ascending: true }),
      supabase.from("leagues").select("id, name, season_id, seasons(name)").order("name", { ascending: true }),
      supabase.from("divisions").select("id, name, league_id, leagues(name, season_id, seasons(name))").order("name", { ascending: true }),
    ]);

    setDashboardFilterOptions({
      seasons: seasonData || [],
      leagues: leagueData || [],
      divisions: divisionData || [],
    });
  }, []);

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

  const loadMessageHistory = useCallback(async function loadMessageHistory() {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) return;

    setLoadingMessageHistory(true);
    const response = await fetch("/api/notification-template-history", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const result = await response.json().catch(() => ({}));
    setLoadingMessageHistory(false);

    if (!response.ok || !result.success) {
      setMessageHistory([]);
      return;
    }

    setMessageHistory(result.history || []);
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

  const checkMatchSetupReminderPrompt = useCallback(async function checkMatchSetupReminderPrompt() {
    const today = localDateValue(new Date());

    if (window.localStorage.getItem(SETUP_REMINDER_HIDE_DATE_KEY) === today) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) return;

    setCheckingSetupReminders(true);
    const response = await fetch("/api/match-setup-reminders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ dryRun: true }),
    });
    const result = await response.json().catch(() => ({}));
    setCheckingSetupReminders(false);

    if (!response.ok || !result.success || Number(result.pending || 0) === 0) {
      return;
    }

    setHideSetupRemindersToday(false);
    setSetupReminderPreview(result);
  }, []);

  const loadSeasonResetOptions = useCallback(async function loadSeasonResetOptions() {
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name, is_active, start_date, end_date")
      .order("name", { ascending: true });

    if (error) {
      console.error("Unable to load season reset options", error);
      return;
    }

    setSeasonResetOptions(data || []);
  }, []);

  useEffect(() => {
    async function run() {
      const user = await requireRole(router, "league_manager");
      if (user) {
        setCurrentUserRole(user.role || "");
        setReady(true);
        loadDashboardCounts();
        loadDashboardFilterOptions();
        loadLoginMessages();
        loadMessageHistory();
        loadGuideDocuments();
        loadSeasonResetOptions();
        checkMatchSetupReminderPrompt();
      }
    }

    run();
  }, [checkMatchSetupReminderPrompt, loadDashboardCounts, loadDashboardFilterOptions, loadGuideDocuments, loadLoginMessages, loadMessageHistory, loadSeasonResetOptions, router]);

  function closeSetupReminderPrompt() {
    if (hideSetupRemindersToday) {
      window.localStorage.setItem(SETUP_REMINDER_HIDE_DATE_KEY, localDateValue(new Date()));
    }

    setSetupReminderPreview(null);
    setHideSetupRemindersToday(false);
  }

  async function sendSetupRemindersNow() {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before sending match setup reminders.");
      return;
    }

    setSendingSetupReminders(true);
    const response = await fetch("/api/match-setup-reminders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ dryRun: false }),
    });
    const result = await response.json().catch(() => ({}));
    setSendingSetupReminders(false);

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to send match setup reminders.");
      return;
    }

    alert(`Match setup reminders sent for ${result.sent || 0} team setup${Number(result.sent || 0) === 1 ? "" : "s"}.`);
    window.localStorage.setItem(SETUP_REMINDER_HIDE_DATE_KEY, localDateValue(new Date()));
    setSetupReminderPreview(null);
    setHideSetupRemindersToday(false);
  }

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
        audience: template.label,
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

    await loadLoginMessages();
    await loadMessageHistory();
    alert(`${template.label} saved.`);
  }

  async function clearLoginMessage(template) {
    const ok = confirm(`Clear the active ${template.label}? Players or captains will no longer see this popup until a new message is saved.`);
    if (!ok) return;

    setLoginMessages((current) => ({
      ...current,
      [template.key]: {
        subject: current[template.key]?.subject || template.defaultSubject,
        body: "",
      },
    }));

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before clearing dashboard messages.");
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
        audience: template.label,
        subject: template.defaultSubject,
        body: "",
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSavingMessageKey("");

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to clear dashboard message.");
      return;
    }

    await loadLoginMessages();
    await loadMessageHistory();
    alert(`${template.label} cleared.`);
  }

  function editMessageHistoryItem(item) {
    setLoginMessages((current) => ({
      ...current,
      [item.template_key]: {
        subject: item.subject || templateDefaultSubject(item.template_key),
        body: item.body || "",
      },
    }));

    const editor = document.getElementById(`dashboard-message-${item.template_key}`);
    if (editor) editor.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function deleteMessageHistoryItem(item) {
    const ok = confirm(`Delete this ${item.audience || "dashboard message"} history row? This will not change the active popup.`);
    if (!ok) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before deleting dashboard message history.");
      return;
    }

    setDeletingHistoryId(item.id);
    const response = await fetch(`/api/notification-template-history?id=${encodeURIComponent(item.id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const result = await response.json().catch(() => ({}));
    setDeletingHistoryId("");

    if (!response.ok || !result.success) {
      alert(result.error || "Unable to delete dashboard message history.");
      return;
    }

    await loadMessageHistory();
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
    if (!masterResetAcknowledged) {
      alert("Confirm that you understand Master Reset All permanently removes generated league operations data.");
      return;
    }

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
    setMasterResetAcknowledged(false);
    loadDashboardCounts();
  }

  async function runSeasonReset() {
    const season = seasonResetOptions.find((row) => String(row.id) === String(seasonResetSeasonId));

    if (!seasonResetSeasonId) {
      alert("Select a season to reset.");
      return;
    }

    if (!seasonResetAcknowledged) {
      alert("Confirm that you understand Season Reset preserves historical match results and player history.");
      return;
    }

    const firstOk = confirm([
      `Season Reset will inactivate the leagues, divisions, and teams for "${season?.name || "the selected season"}".`,
      "",
      "It will reset affected team standings rows to zero.",
      "It will clear Season DUPR Doubles, Season DUPR, and Season PrimeTime/Age-based ratings for that season.",
      "It will reset saved schedule settings for that season's leagues and delete dated Court Availability and League Blackout records within the selected season's date window.",
      "",
      "This does not delete historical match results or player history.",
      "",
      "Continue?",
    ].join("\n"));

    if (!firstOk) return;

    const typed = prompt('Final confirmation: type RESET SEASON to continue.');
    if (String(typed || "").trim() !== "RESET SEASON") return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      alert("Your session expired. Please log in again before running Season Reset.");
      return;
    }

    setSeasonResetting(true);

    const response = await fetch("/api/season-reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        seasonId: seasonResetSeasonId,
        confirmation: "RESET SEASON",
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSeasonResetting(false);

    if (!response.ok || !result.success) {
      alert(result.error || "Season Reset failed.");
      return;
    }

    alert(`Season Reset complete for ${result.season?.name || season?.name || "the selected season"}.`);
    setSeasonResetAcknowledged(false);
    loadDashboardCounts();
    loadDashboardFilterOptions();
    loadSeasonResetOptions();
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
    dashboardFilterLabel(dashboardFilter, dashboardFilterOptions, dashboardScope);
  const playersOnTeamsCount =
    dashboardRosterCountMode === "unique"
      ? dashboardCounts?.playersOnTeamsUnique
      : dashboardCounts?.playersOnTeamsAssignments;

  const metricCards = [
    { label: "Members", value: formatCount(dashboardCounts?.members), helper: "Member records", tone: "slate" },
    {
      label: "Players On Teams",
      value: formatCount(playersOnTeamsCount),
      helper: dashboardRosterCountMode === "unique"
        ? `${scopeHelper} unique players`
        : `${scopeHelper} roster assignments`,
      tone: "blue",
      action: (
        <div className="mt-3 grid grid-cols-2 rounded-xl bg-white/15 p-1 text-[10px] font-black uppercase tracking-wide">
          <button
            type="button"
            onClick={() => setDashboardRosterCountMode("assignments")}
            className={`rounded-lg px-2 py-1.5 transition ${
              dashboardRosterCountMode === "assignments"
                ? "bg-white text-blue-900"
                : "text-white hover:bg-white/10"
            }`}
          >
            All Players
          </button>
          <button
            type="button"
            onClick={() => setDashboardRosterCountMode("unique")}
            className={`rounded-lg px-2 py-1.5 transition ${
              dashboardRosterCountMode === "unique"
                ? "bg-white text-blue-900"
                : "text-white hover:bg-white/10"
            }`}
          >
            Unique
          </button>
        </div>
      ),
    },
    { label: "Teams", value: formatCount(dashboardCounts?.teams), helper: `${scopeHelper} teams`, tone: "emerald" },
    { label: "This Week", value: formatCount(dashboardCounts?.matchesThisWeek), helper: `${scopeHelper} scheduled matches`, tone: "amber" },
  ];

  const statusCards = [
    { label: "Average Team Roster Count", value: formatDecimal(dashboardCounts?.averageRosterCount, 1), helper: `Players per ${scopeHelper.toLowerCase()} team`, tone: "slate" },
    {
      label: dashboardGamesPlayedMode === "matches" ? "Matches Played" : "Games Played",
      value: formatCount(
        dashboardGamesPlayedMode === "matches"
          ? dashboardCounts?.matchesPlayed
          : dashboardCounts?.gamesPlayed
      ),
      helper: dashboardGamesPlayedMode === "matches"
        ? `${scopeHelper} verified match days`
        : `${scopeHelper} verified game scores`,
      tone: "blue",
      action: (
        <div className="mt-3 grid grid-cols-2 rounded-xl bg-white/15 p-1 text-[10px] font-black uppercase tracking-wide">
          <button
            type="button"
            onClick={() => setDashboardGamesPlayedMode("games")}
            className={`rounded-lg px-2 py-1.5 transition ${
              dashboardGamesPlayedMode === "games"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-white hover:bg-white/10"
            }`}
          >
            Games
          </button>
          <button
            type="button"
            onClick={() => setDashboardGamesPlayedMode("matches")}
            className={`rounded-lg px-2 py-1.5 transition ${
              dashboardGamesPlayedMode === "matches"
                ? "bg-white text-blue-900 shadow-sm"
                : "text-white hover:bg-white/10"
            }`}
          >
            Matches
          </button>
        </div>
      ),
    },
    { label: "Average Team DUPR Rating", value: formatDecimal(dashboardCounts?.averageTeamDupr, 3), helper: `Average roster DUPR by ${scopeHelper.toLowerCase()} team`, tone: "emerald" },
    { label: "Pending Verification", value: formatCount(dashboardCounts?.pendingVerification), helper: "Matches awaiting score review", tone: "amber" },
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
        { title: "Email Options", desc: "Edit automated email templates and send test notifications.", path: "/email-options", code: "EO", tone: "blue" },
        ...(currentUserRole === "commissioner"
          ? [{ title: "Club Setup", desc: "Configure club branding and contact defaults.", path: "/system-setup", code: "CS", tone: "amber" }]
          : []),
      ],
    },
  ];
  const moduleSection = {
    title: "Modules",
    desc: "Standalone tools that share club data with the main league system.",
    cards: [
      { title: "Tournaments", desc: "Open public tournament displays and event-code tournament operations.", path: "/tourney/tpro", code: "TN", tone: "emerald" },
      { title: "PBCourtCommand", desc: "Run round robin and ladder sessions with saved players, lineups, scores, and texts.", path: "/round-robin/rpro/admin", code: "PB", tone: "blue" },
    ],
  };

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

        {checkingSetupReminders && (
          <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
            Checking for match setup reminders...
          </div>
        )}

        {setupReminderPreview && (
          <section className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-300 bg-white shadow-lg">
            <div className="bg-amber-100 px-5 py-4">
              <h2 className="text-xl font-black text-amber-950">
                Match Setup Reminders Ready
              </h2>
              <p className="mt-1 text-sm font-semibold text-amber-900">
                The system found {setupReminderPreview.pending || 0} incomplete team setup{Number(setupReminderPreview.pending || 0) === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-900">
                    {setupReminderPreview.emails || 0} email{Number(setupReminderPreview.emails || 0) === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-700">
                    {setupReminderPreview.texts || 0} text{Number(setupReminderPreview.texts || 0) === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
                  {(setupReminderPreview.results || []).slice(0, 8).map((item) => (
                    <div key={`${item.matchId}:${item.team}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="font-bold text-slate-950">{item.team}</span>
                      {" - "}
                      {item.match}
                      {item.matchDate ? ` on ${item.matchDate}` : ""}
                    </div>
                  ))}
                  {(setupReminderPreview.results || []).length > 8 && (
                    <div className="text-xs font-bold text-slate-500">
                      Plus {(setupReminderPreview.results || []).length - 8} more.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
                <label className="flex max-w-64 items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={hideSetupRemindersToday}
                    onChange={(event) => setHideSetupRemindersToday(event.target.checked)}
                    disabled={sendingSetupReminders}
                    className="mt-1 h-4 w-4 rounded border-amber-300 text-green-700 focus:ring-green-700"
                  />
                  <span>Don&apos;t show again today</span>
                </label>
                <button
                  type="button"
                  onClick={sendSetupRemindersNow}
                  disabled={sendingSetupReminders}
                  className="rounded-xl bg-green-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {sendingSetupReminders ? "Sending..." : "Send Reminders"}
                </button>
                <button
                  type="button"
                  onClick={closeSetupReminderPrompt}
                  disabled={sendingSetupReminders}
                  className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-300 disabled:opacity-50"
                >
                  Not Now
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b border-blue-900/30 bg-gradient-to-r from-slate-950 to-blue-950 px-4 py-5 text-white md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-blue-200">
                  System Snapshot
                </div>
                <h2 className="mt-1 text-xl font-black text-white">
                  Club Operational Overview
                </h2>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <label className="w-full md:w-96">
                  <span className="mb-1 block text-xs font-black uppercase tracking-wide text-blue-200">
                    Dashboard Scope
                  </span>
                  <select
                    value={dashboardFilter}
                    onChange={(event) => setDashboardFilter(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm"
                  >
                    <option value="scope">Use Active / Current Toggle</option>
                    <option value="all">All Seasons</option>
                    <optgroup label="Seasons">
                      {dashboardFilterOptions.seasons.map((season) => (
                        <option key={season.id} value={`season:${season.id}`}>
                          {season.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Leagues">
                      {dashboardFilterOptions.leagues.map((league) => (
                        <option key={league.id} value={`league:${league.id}`}>
                          {league.name}{league.seasons?.name ? ` / ${league.seasons.name}` : ""}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Divisions">
                      {dashboardFilterOptions.divisions.map((division) => (
                        <option key={division.id} value={`division:${division.id}`}>
                          {division.name}{division.leagues?.name ? ` / ${division.leagues.name}` : ""}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>

                <div className="flex rounded-2xl bg-white/10 p-1 ring-1 ring-white/15">
                  <button
                    type="button"
                    onClick={() => setDashboardScope("active")}
                    className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                      dashboardScope === "active"
                        ? "bg-white text-slate-950"
                        : "text-blue-100 hover:bg-white/10"
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
                        : "text-blue-100 hover:bg-white/10"
                    }`}
                  >
                    Not Active (Current Entries)
                  </button>
                </div>
                {dashboardFilter !== "scope" && (
                  <div className="max-w-sm text-right text-[11px] font-bold text-blue-100">
                    Active / Current only applies when the dashboard scope uses the toggle.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:p-6">
            {metricCards.map((card) => (
              <MetricCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-4 md:grid-cols-4 md:p-6">
            {statusCards.map((card) => (
              <Status key={card.label} {...card} />
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
                <div id={`dashboard-message-${template.key}`} key={template.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
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

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => clearLoginMessage(template)}
                      disabled={savingMessageKey === template.key}
                      className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-300 disabled:opacity-50"
                    >
                      Clear Current Message
                    </button>
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

          <div className="border-t border-slate-200 p-4 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">Message History</h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Review saved dashboard messages, reload one into the editor, or delete old history rows.
                </p>
              </div>
              <button
                type="button"
                onClick={loadMessageHistory}
                disabled={loadingMessageHistory}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loadingMessageHistory ? "Loading..." : "Refresh History"}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {messageHistory.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-900">
                          {item.audience || templateLabel(item.template_key)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {formatDisplayTimestampShort(item.created_at)}
                        </span>
                        {item.saved_by_email && (
                          <span className="text-xs font-bold text-slate-500">
                            by {item.saved_by_email}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 font-black text-slate-950">
                        {item.subject || templateDefaultSubject(item.template_key)}
                      </div>
                      <div className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold leading-6 text-slate-700">
                        {item.body?.trim() || "No active message body."}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                      <button
                        type="button"
                        onClick={() => editMessageHistoryItem(item)}
                        className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMessageHistoryItem(item)}
                        disabled={deletingHistoryId === item.id}
                        className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-200 disabled:opacity-50"
                      >
                        {deletingHistoryId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {!loadingMessageHistory && messageHistory.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500">
                  No dashboard message history has been saved yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
          <div className="border-b border-slate-200 px-4 py-5 md:px-6">
            <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">{moduleSection.title}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">{moduleSection.desc}</p>
              </div>
              <div className="text-xs font-black uppercase tracking-wide text-slate-400">
                {moduleSection.cards.length} tool
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4 md:p-6">
            {moduleSection.cards.map((card) => (
              <AdminActionCard
                key={card.path}
                card={card}
                onClick={() => router.push(card.path)}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-red-200 bg-white shadow">
          <div className="border-b border-red-100 bg-red-50 px-4 py-5 md:px-6">
            <h2 className="text-xl font-black text-red-950">Reset Options</h2>
            <p className="mt-1 text-sm font-semibold text-red-800">
              Master Reset removes generated operations data. Season Reset preserves historical match results and player history while preparing the selected season&apos;s setup records for rollover.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-black text-amber-950">Season Reset</h3>
                <button
                  type="button"
                  onClick={() => setSeasonResetHelpOpen(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200 text-sm font-black text-amber-950 hover:bg-amber-300"
                  title="Season Reset help"
                  aria-label="Season Reset help"
                >
                  ?
                </button>
              </div>
              <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
                Inactivates the selected season&apos;s teams, leagues, and divisions, resets affected standings to zero, clears that season&apos;s rating values, resets saved schedule settings, and removes dated court availability and blackout records in that season window. This does not delete historical match results or player history.
              </p>

              <div className="mt-4 grid gap-3">
                <select
                  value={seasonResetSeasonId}
                  onChange={(event) => {
                    setSeasonResetSeasonId(event.target.value);
                    setSeasonResetAcknowledged(false);
                  }}
                  className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-bold text-slate-950"
                >
                  <option value="">Select Season to Reset</option>
                  {seasonResetOptions.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}{season.is_active === false ? " (Inactive)" : ""}
                    </option>
                  ))}
                </select>

                <label className="flex items-start gap-3 rounded-xl bg-white/80 p-3 text-sm font-semibold text-amber-950">
                  <input
                    type="checkbox"
                    checked={seasonResetAcknowledged}
                    onChange={(event) => setSeasonResetAcknowledged(event.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I understand this does not delete historical match results or player history.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={runSeasonReset}
                  disabled={seasonResetting || !seasonResetSeasonId || !seasonResetAcknowledged}
                  className="w-fit rounded-xl bg-amber-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {seasonResetting ? "Resetting..." : "Season Reset"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <h3 className="text-lg font-black text-red-950">Master Reset All</h3>
              <p className="mt-1 text-sm font-semibold leading-6 text-red-800">
                Removes generated league operations data across the whole system. Use only when starting from a clean operations slate.
              </p>
              <label className="mt-4 flex items-start gap-3 rounded-xl bg-white/80 p-3 text-sm font-semibold text-red-950">
                <input
                  type="checkbox"
                  checked={masterResetAcknowledged}
                  onChange={(event) => setMasterResetAcknowledged(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  I understand this permanently deletes matches, match lines, game scores, saved match setup lineups, byes, standings, and team roster rows; clears team captains and co-captains; inactivates teams; and changes Captain users back to Player.
                </span>
              </label>
              <button
                type="button"
                onClick={runMasterResetAll}
                disabled={masterResetting || !masterResetAcknowledged}
                className="mt-4 rounded-xl bg-red-700 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {masterResetting ? "Resetting..." : "Master Reset All"}
              </button>
            </div>
          </div>
        </section>

        {seasonResetHelpOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-slate-950 px-5 py-4 text-white">
                <div className="text-xs font-black uppercase tracking-wide text-amber-200">
                  Season Reset Help
                </div>
                <h2 className="mt-1 text-xl font-black">
                  Recommended Season Rollover Steps
                </h2>
              </div>

              <div className="space-y-5 p-5 text-sm font-semibold leading-6 text-slate-700">
                <div>
                  <h3 className="font-black text-slate-950">Before Season Reset</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Create the new Season.</li>
                    <li>Copy or create the new Leagues for that Season.</li>
                    <li>Use Copy League Divisions to copy old divisions into the new league structure.</li>
                    <li>Use Copy Division Teams to copy teams into the new divisions, choosing whether to copy roster players.</li>
                    <li>Review copied teams, captains, roster lock settings, division lines, and score sheet formats.</li>
                    <li>Review any Court Availability and League Blackout Dates that should carry into the new season.</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-black text-slate-950">Run Season Reset</h3>
                  <p className="mt-2">
                    Select the old season and confirm the reset. Saved Schedule Settings for that season&apos;s leagues are cleared back to draft/unassigned so they no longer show old Generated match counts. Dated Court Availability records and League Blackout Dates inside the selected season&apos;s date window are deleted. This does not delete historical match results or player history.
                  </p>
                </div>

                <div>
                  <h3 className="font-black text-slate-950">After Season Reset</h3>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Confirm old season leagues, divisions, and teams are inactive.</li>
                    <li>Import or enter the new season ratings.</li>
                    <li>Edit each Schedule Setting to select the current League and Division, then update the correct dates, weeks, match day, time, courts, and byes.</li>
                    <li>Recreate Court Availability and League Blackout Dates for the new season as needed.</li>
                    <li>Generate or adjust schedules for the new season.</li>
                    <li>Review standings and dashboard scopes using active/current filters.</li>
                  </ol>
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setSeasonResetHelpOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

function dashboardFilterLabel(dashboardFilter, filterOptions, dashboardScope) {
  const [filterType, filterId] = String(dashboardFilter || "scope").split(":");

  if (filterType === "all") return "All-season";
  if (filterType === "scope") {
    return dashboardScope === "current" ? "Current-entry" : "Active-season";
  }

  const optionLists = {
    season: filterOptions?.seasons || [],
    league: filterOptions?.leagues || [],
    division: filterOptions?.divisions || [],
  };
  const match = optionLists[filterType]?.find((option) => String(option.id) === String(filterId));

  if (!match?.name) return "Selected";
  return match.name;
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

async function loadDashboardLeagues(today, dashboardScope, dashboardFilter) {
  const [{ data, error }, { data: divisionData, error: divisionError }] = await Promise.all([
    supabase
      .from("leagues")
      .select(`
        id,
        season_id,
        seasons (
          id,
          start_date,
          end_date
        )
      `),
    supabase
      .from("divisions")
      .select("id, league_id"),
  ]);

  if (error || divisionError) {
    console.error("Unable to load dashboard leagues", error);
    return { leagueIds: [], seasonIds: [], divisionIds: [] };
  }

  const allLeagues = data || [];
  const allDivisions = divisionData || [];
  const [filterType, filterId] = String(dashboardFilter || "scope").split(":");

  if (filterType === "all") {
    return {
      leagueIds: allLeagues.map((league) => league.id).filter(Boolean),
      seasonIds: uniqueValues(allLeagues.map((league) => league.season_id)),
      divisionIds: [],
    };
  }

  if (filterType === "season") {
    const scopedLeagues = allLeagues.filter((league) => String(league.season_id) === String(filterId));

    return {
      leagueIds: scopedLeagues.map((league) => league.id).filter(Boolean),
      seasonIds: uniqueValues(scopedLeagues.map((league) => league.season_id)),
      divisionIds: [],
    };
  }

  if (filterType === "league") {
    const league = allLeagues.find((row) => String(row.id) === String(filterId));

    return {
      leagueIds: league?.id ? [league.id] : [],
      seasonIds: league?.season_id ? [league.season_id] : [],
      divisionIds: [],
    };
  }

  if (filterType === "division") {
    const division = allDivisions.find((row) => String(row.id) === String(filterId));
    const league = allLeagues.find((row) => String(row.id) === String(division?.league_id));

    return {
      leagueIds: division?.league_id ? [division.league_id] : [],
      seasonIds: league?.season_id ? [league.season_id] : [],
      divisionIds: division?.id ? [division.id] : [],
    };
  }

  const scopedLeagues = allLeagues.filter((league) => {
    if (dashboardScope === "current") return true;

    const season = league.seasons;
    if (!season?.start_date || !season?.end_date) return false;
    return season.start_date <= today && season.end_date >= today;
  });

  return {
    leagueIds: scopedLeagues.map((league) => league.id).filter(Boolean),
    seasonIds: uniqueValues(scopedLeagues.map((league) => league.season_id)),
    divisionIds: [],
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

async function countScopedMatches(scopeData, applyFilters) {
  if (!scopeData.leagueIds.length) return 0;

  return countRows("matches", (query) => {
    let scopedQuery = query.in("league_id", scopeData.leagueIds);

    if (scopeData.divisionIds.length > 0) {
      scopedQuery = scopedQuery.in("division_id", scopeData.divisionIds);
    }

    if (applyFilters) {
      scopedQuery = applyFilters(scopedQuery);
    }

    return scopedQuery;
  });
}

async function countScopedPlayedGames(scopeData) {
  if (!scopeData.leagueIds.length) return 0;

  let query = supabase
    .from("line_games")
    .select(`
      id,
      match_lines!inner(
        matches!inner(
          league_id,
          division_id,
          score_status
        )
      )
    `, { count: "exact", head: true })
    .in("match_lines.matches.league_id", scopeData.leagueIds)
    .eq("match_lines.matches.score_status", "verified")
    .or("home_score.not.is.null,away_score.not.is.null,game_status.not.is.null");

  if (scopeData.divisionIds.length > 0) {
    query = query.in("match_lines.matches.division_id", scopeData.divisionIds);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Unable to count dashboard games played", error);
    return 0;
  }

  return count || 0;
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

function templateConfig(templateKey) {
  return LOGIN_MESSAGE_TEMPLATES.find((template) => template.key === templateKey) || null;
}

function templateLabel(templateKey) {
  return templateConfig(templateKey)?.label || templateKey || "Dashboard Message";
}

function templateDefaultSubject(templateKey) {
  return templateConfig(templateKey)?.defaultSubject || "Dashboard Message";
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

function MetricCard({ label, value, helper, tone, action }) {
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
      {action}
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

function Status({ label, value, helper, action, tone }) {
  const tones = {
    slate: "bg-slate-900 text-white",
    blue: "bg-blue-700 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      <div className="text-xs font-black uppercase tracking-wide opacity-75">
        {label}
      </div>

      <div className="mt-2 text-lg font-black">
        {value}
      </div>

      {helper && (
        <div className="mt-1 text-xs font-bold opacity-80">
          {helper}
        </div>
      )}
      {action}
    </div>
  );
}
