"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  const [dashboardFilter, setDashboardFilter] = useState("active");
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
  const [leagueAnalyticsExpanded, setLeagueAnalyticsExpanded] = useState(false);
  const [pendingVerificationModalOpen, setPendingVerificationModalOpen] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    setChartsReady(true);
  }, []);
  const loadDashboardCounts = useCallback(async function loadDashboardCounts() {
    setDashboardCounts(null);

    const today = localDateValue(new Date());
    const { start, end } = currentWeekDateRange();

    const [membersCount, leagueData, teamData] = await Promise.all([
      countActiveMembers(),
      loadDashboardLeagues(today, dashboardFilter),
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
      pendingVerificationMatches,
      gamesPlayedCount,
      matchesPlayedCount,
      scopedMatches,
      scopedStandings,
    ] = await Promise.all([
      countScopedMatches(leagueData, (query) =>
        query
          .gte("scheduled_date", start)
          .lte("scheduled_date", end)
      ),
      loadScopedRosterData(scopedTeamIds),
      loadScopedRatingData(scopedSeasonIds),
      loadScopedPendingVerificationMatches(leagueData),
      countScopedPlayedGames(leagueData),
      countScopedMatches(leagueData, (query) =>
        query.eq("score_status", "verified")
      ),
      loadScopedMatchData(leagueData),
      loadScopedStandingsData(leagueData),
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
      pendingVerification: pendingVerificationMatches.length,
      pendingVerificationMatches,
      gamesPlayed: gamesPlayedCount,
      matchesPlayed: matchesPlayedCount,
      averageRosterCount: averageRosterCount(scopedTeams, scopedRosterData),
      averageTeamDupr: averageTeamDupr(scopedTeams, scopedRosterData, scopedRatingData),
      executive: buildExecutiveAnalytics({
        teams: scopedTeams,
        rosterRows: scopedRosterData,
        ratingRows: scopedRatingData,
        matches: scopedMatches,
        standings: scopedStandings,
      }),
    });
  }, [dashboardFilter]);

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
    dashboardFilterLabel(dashboardFilter, dashboardFilterOptions);
  const playersOnTeamsCount =
    dashboardRosterCountMode === "unique"
      ? dashboardCounts?.playersOnTeamsUnique
      : dashboardCounts?.playersOnTeamsAssignments;

  const metricCards = [
    { label: "Members", value: formatCount(dashboardCounts?.members), helper: "Active members", tone: "slate" },
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
    {
      label: "Pending Verification",
      value: formatCount(dashboardCounts?.pendingVerification),
      helper: "Matches awaiting score review",
      tone: "amber",
      onClick: Number(dashboardCounts?.pendingVerification || 0) > 0
        ? () => setPendingVerificationModalOpen(true)
        : null,
    },
  ];
  const executiveAnalytics = dashboardCounts?.executive || emptyExecutiveAnalytics();

  const sections = [
    {
      title: "People And Teams",
      desc: "Keep player records, captains, ratings, teams, and access current.",
      cards: [
        { title: "Members", desc: "Search, edit, and review member records.", path: "/members", code: "MB", tone: "slate" },
        { title: "Season Ratings", desc: "Update DUPR and PrimeTime ratings.", path: "/ratings", code: "RT", tone: "amber" },
        { title: "Teams & Rosters", desc: "Create teams and manage rosters.", path: "/teams", code: "TR", tone: "emerald" },
        ...(currentUserRole === "commissioner"
          ? [{ title: "User Roles", desc: "Manage role-based access permissions.", path: "/users", code: "UR", tone: "blue" }]
          : []),
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
        ...(currentUserRole === "commissioner"
          ? [
              { title: "Locations", desc: "Maintain clubs, courts, and court availability.", path: "/locations", code: "LC", tone: "slate" },
              { title: "Email Options", desc: "Edit automated email templates and send test notifications.", path: "/email-options", code: "EO", tone: "blue" },
              { title: "Score Sheets", desc: "Manage printable score sheet templates.", path: "/score-sheets", code: "SS", tone: "emerald" },
              { title: "Club Setup", desc: "Configure club branding and contact defaults.", path: "/system-setup", code: "CS", tone: "amber" },
            ]
          : []),
      ],
    },
  ];
  const moduleSection = {
    title: "Modules",
    desc: "Standalone tools that share club data with the main league system.",
    cards: [
      { title: "Tournaments", desc: "Open public tournament displays and event-code tournament operations.", path: "/tourney/tpro", code: "TN", tone: "emerald" },
      { title: "PBCourtCommand", desc: "Run round robin and ladder sessions with saved players, lineups, scores, and texts.", path: "/pbcc/admin", code: "PB", tone: "blue" },
      { title: "AI League Insights", desc: "Ask LMS, weekly health, anomalies, lineup gaps, and cleanup suggestions.", path: "/ai-insights", code: "AI", tone: "amber" },
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
                    <option value="active">Active Seasons</option>
                    <option value="current">Not Active (Current Entries)</option>
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

          <ExecutiveDashboard
            analytics={executiveAnalytics}
            scopeLabel={scopeHelper}
            chartsReady={chartsReady}
            expanded={leagueAnalyticsExpanded}
            onToggle={() => setLeagueAnalyticsExpanded((current) => !current)}
          />
        </section>

        {pendingVerificationModalOpen && (
          <PendingVerificationModal
            matches={dashboardCounts?.pendingVerificationMatches || []}
            scopeLabel={scopeHelper}
            onClose={() => setPendingVerificationModalOpen(false)}
            onOpenMatch={(matchId) => router.push(`/matches/${matchId}`)}
          />
        )}

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

function ExecutiveDashboard({ analytics, scopeLabel, chartsReady, expanded, onToggle }) {
  const [expandedStandingGroupId, setExpandedStandingGroupId] = useState("");

  useEffect(() => {
    if (!expandedStandingGroupId) return;
    if (!analytics.standingsLeaderGroups.some((group) => group.id === expandedStandingGroupId)) {
      setExpandedStandingGroupId("");
    }
  }, [analytics.standingsLeaderGroups, expandedStandingGroupId]);

  return (
    <div className="border-t border-slate-200 bg-slate-50 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-blue-700">
            Executive Dashboard
          </div>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            League Analytics
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Charts, progress, standings leaders, and division-level trend views for {scopeLabel.toLowerCase()} operations.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-64 rounded-xl border border-blue-700 bg-slate-900 px-5 py-3 text-white shadow-sm ring-1 ring-slate-950/10">
            <div className="text-xs font-black uppercase tracking-wide text-blue-200">
              Dashboard Scope
            </div>
            <div className="mt-1 text-xl font-black leading-tight text-white">
              {scopeLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide text-white shadow-sm transition ${
              expanded
                ? "bg-slate-950 hover:bg-blue-800"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {expanded ? "Hide Analytics" : "Show Analytics"}
          </button>
        </div>
      </div>

      {!expanded && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-semibold text-slate-600">
          League Analytics is collapsed by default. Expand it when you want charts and standings leaders for the selected dashboard scope.
        </div>
      )}

      {expanded && (
        <>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <ChartPanel title="Seasons Progress" helper={`${analytics.completedMatches} of ${analytics.scheduledMatches} scheduled matches complete`}>
          {chartsReady ? (
            <SeasonProgressPie
              completed={analytics.completedMatches}
              remaining={analytics.remainingMatches}
              percentage={analytics.matchCompletionPercentage}
            />
          ) : (
            <StaticCompletionProgress value={analytics.matchCompletionPercentage} />
          )}
        </ChartPanel>

        <ChartPanel title="Matches By Week" helper="Scheduled and completed match volume by week">
          {!chartsReady ? (
            <EmptyChartState label="Charts loading..." />
          ) : analytics.matchesByWeek.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={analytics.matchesByWeek} margin={{ top: 10, right: 18, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="scheduled" name="Scheduled" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#059669" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState label="No matches in this scope." />
          )}
        </ChartPanel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="Teams By Division" helper="Active teams in each selected division">
          {!chartsReady ? (
            <EmptyChartState label="Charts loading..." />
          ) : analytics.teamsByDivision.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.teamsByDivision} margin={{ top: 10, right: 18, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="division" tick={{ fontSize: 11, fontWeight: 700 }} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="teams" name="Teams" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState label="No teams in this scope." />
          )}
        </ChartPanel>

        <ChartPanel title="Players By Division" helper="Unique rostered players in each selected division">
          {!chartsReady ? (
            <EmptyChartState label="Charts loading..." />
          ) : analytics.playersByDivision.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.playersByDivision} margin={{ top: 10, right: 18, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="division" tick={{ fontSize: 11, fontWeight: 700 }} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="players" name="Players" fill="#2563eb" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState label="No rostered players in this scope." />
          )}
        </ChartPanel>

        <ChartPanel title="Rating Distribution By Division" helper="Rostered players grouped by season rating bands">
          {!chartsReady ? (
            <EmptyChartState label="Charts loading..." />
          ) : analytics.ratingDistributionByDivision.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.ratingDistributionByDivision} margin={{ top: 10, right: 18, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="division" tick={{ fontSize: 11, fontWeight: 700 }} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="Under 3.0" stackId="ratings" fill="#38bdf8" />
                <Bar dataKey="3.0-3.49" stackId="ratings" fill="#2563eb" />
                <Bar dataKey="3.5-3.99" stackId="ratings" fill="#059669" />
                <Bar dataKey="4.0+" stackId="ratings" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState label="No season ratings in this scope." />
          )}
        </ChartPanel>

        <ChartPanel title="Matches By Location" helper="Top scheduled match locations">
          {!chartsReady ? (
            <EmptyChartState label="Charts loading..." />
          ) : analytics.matchesByLocation.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.matchesByLocation} layout="vertical" margin={{ top: 10, right: 18, left: 28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                <YAxis type="category" dataKey="location" width={110} tick={{ fontSize: 11, fontWeight: 700 }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="matches" name="Matches" fill="#7c3aed" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState label="No locations in this scope." />
          )}
        </ChartPanel>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-black text-slate-950">Standings Leaders</h4>
            <p className="mt-1 text-sm font-semibold text-slate-600">Top ranked teams sorted by league and division.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-800">
            By Division
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {chartsReady && analytics.standingsLeaderGroups.map((group) => (
            <StandingsLeaderGroupRow
              key={group.id}
              group={group}
              expanded={expandedStandingGroupId === group.id}
              onToggle={() => setExpandedStandingGroupId((current) => current === group.id ? "" : group.id)}
            />
          ))}
          {!chartsReady && (
            <EmptyChartState label="Charts loading..." />
          )}
          {chartsReady && analytics.standingsLeaderGroups.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500 xl:col-span-2">
              No standings leaders are available for this scope.
            </div>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

const chartTooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  boxShadow: "0 12px 30px -20px rgba(15,23,42,0.75)",
  fontWeight: 700,
};

function ChartPanel({ title, helper, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h4 className="text-lg font-black text-slate-950">{title}</h4>
        <p className="mt-1 text-sm font-semibold text-slate-600">{helper}</p>
      </div>
      {children}
    </div>
  );
}

function SeasonProgressPie({ completed, remaining, percentage }) {
  const chartValue = Math.max(0, Math.min(100, Number(percentage || 0)));
  const completedCount = Math.max(0, Number(completed || 0));
  const remainingCount = Math.max(0, Number(remaining || 0));
  const data = completedCount + remainingCount > 0
    ? [
        { name: "Completed", value: completedCount, fill: "#059669" },
        { name: "Remaining", value: remainingCount, fill: "#e2e8f0" },
      ]
    : [{ name: "No Matches", value: 1, fill: "#e2e8f0" }];

  return (
    <div className="relative h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={completedCount && remainingCount ? 3 : 0}
            startAngle={90}
            endAngle={-270}
            stroke="#ffffff"
            strokeWidth={4}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-black text-slate-950">{chartValue}%</div>
        <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">Complete</div>
        <div className="mt-2 text-[11px] font-bold text-slate-500">
          {formatCount(completedCount)} done / {formatCount(remainingCount)} left
        </div>
      </div>
    </div>
  );
}

function StandingsLeaderGroupRow({ group, expanded, onToggle }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <div className="min-w-0">
          <div className="truncate text-xs font-black uppercase tracking-wide text-blue-700">{group.league}</div>
          <div className="mt-1 truncate text-base font-black text-slate-950">{group.division}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
            {group.leaders.length}
          </span>
          <span className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-lg font-black leading-none text-white">
            {expanded ? "\u2212" : "+"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-200 bg-white p-4">
          <StandingsLeaderGroupChart group={group} />
        </div>
      )}
    </div>
  );
}

function StandingsLeaderGroupChart({ group }) {
  const height = Math.max(170, group.leaders.length * 48 + 68);

  return (
    <div>
      <div className="h-[var(--leader-chart-height)]" style={{ "--leader-chart-height": `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={group.leaders} layout="vertical" margin={{ top: 8, right: 24, left: 18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals tick={{ fontSize: 11, fontWeight: 700 }} />
            <YAxis type="category" dataKey="chartLabel" width={132} tick={{ fontSize: 11, fontWeight: 800 }} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name, item) => [
              name === "Standings Points" ? formatDecimal(value, 1) : formatCount(value),
              `${name} (${item?.payload?.record || "0-0"})`,
            ]} />
            <Bar dataKey="chartValue" name={group.metricLabel} fill="#2563eb" minPointSize={4} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StaticCompletionProgress({ value }) {
  const chartValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="flex h-[280px] items-center justify-center">
      <div className="w-full max-w-52 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
        <div className="text-4xl font-black text-slate-950">{chartValue}%</div>
        <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">Complete</div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${chartValue}%` }} />
        </div>
      </div>
    </div>
  );
}

function EmptyChartState({ label }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm font-bold text-slate-500">
      {label}
    </div>
  );
}

function dashboardFilterLabel(dashboardFilter, filterOptions) {
  const [filterType, filterId] = String(dashboardFilter || "active").split(":");

  if (filterType === "active") return "Active Seasons";
  if (filterType === "current") return "Not Active (Current Entries)";
  if (filterType === "all") return "All Seasons";

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

async function countActiveMembers() {
  return countRows("members", (query) =>
    query.or("is_active_member.eq.true,is_active_member.is.null")
  );
}

async function loadDashboardLeagues(today, dashboardFilter) {
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
  const [filterType, filterId] = String(dashboardFilter || "active").split(":");

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
    if (filterType === "current") return true;

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
      name,
      division_id,
      is_active,
      divisions (
        id,
        name,
        league_id,
        leagues (
          id,
          name,
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

async function loadScopedMatchData(scopeData) {
  if (!scopeData.leagueIds.length) return [];

  let query = supabase
    .from("matches")
    .select(`
      id,
      league_id,
      division_id,
      location_id,
      week_number,
      scheduled_date,
      status,
      score_status,
      locations (
        id,
        name
      )
    `)
    .in("league_id", scopeData.leagueIds)
    .order("scheduled_date", { ascending: true });

  if (scopeData.divisionIds.length > 0) {
    query = query.in("division_id", scopeData.divisionIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Unable to load executive dashboard matches", error);
    return [];
  }

  return data || [];
}

async function loadScopedPendingVerificationMatches(scopeData) {
  if (!scopeData.leagueIds.length) return [];

  let query = supabase
    .from("matches")
    .select(`
      id,
      league_id,
      division_id,
      week_number,
      scheduled_date,
      scheduled_time,
      status,
      score_status,
      home_team:teams!matches_home_team_id_fkey (
        id,
        name
      ),
      away_team:teams!matches_away_team_id_fkey (
        id,
        name
      ),
      leagues (
        id,
        name
      ),
      divisions (
        id,
        name
      ),
      locations (
        id,
        name
      )
    `)
    .in("league_id", scopeData.leagueIds)
    .eq("score_status", "pending_verification")
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true });

  if (scopeData.divisionIds.length > 0) {
    query = query.in("division_id", scopeData.divisionIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Unable to load pending verification matches", error);
    return [];
  }

  return data || [];
}

async function loadScopedStandingsData(scopeData) {
  if (!scopeData.leagueIds.length) return [];

  let query = supabase
    .from("team_standings")
    .select(`
      id,
      league_id,
      division_id,
      team_id,
      rank,
      match_wins,
      match_losses,
      match_ties,
      standings_points,
      point_differential,
      teams (
        id,
        name,
        is_active
      ),
      leagues (
        id,
        name
      ),
      divisions (
        id,
        name
      )
    `)
    .in("league_id", scopeData.leagueIds)
    .order("rank", { ascending: true });

  if (scopeData.divisionIds.length > 0) {
    query = query.in("division_id", scopeData.divisionIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Unable to load executive dashboard standings", error);
    return [];
  }

  return (data || []).filter((row) => row.teams?.is_active !== false);
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

function emptyExecutiveAnalytics() {
  return {
    totalTeams: 0,
    totalRosteredPlayers: 0,
    averagePlayerRating: null,
    minPlayerRating: null,
    maxPlayerRating: null,
    scheduledMatches: 0,
    completedMatches: 0,
    remainingMatches: 0,
    matchCompletionPercentage: 0,
    matchesByWeek: [],
    teamsByDivision: [],
    playersByDivision: [],
    ratingDistributionByDivision: [],
    matchesByLocation: [],
    standingsLeaders: [],
    standingsLeaderGroups: [],
  };
}

function buildExecutiveAnalytics({ teams = [], rosterRows = [], ratingRows = [], matches = [], standings = [] }) {
  const analytics = emptyExecutiveAnalytics();
  const teamById = new Map(teams.map((team) => [String(team.id), team]));
  const ratingsByMemberSeason = new Map();

  ratingRows.forEach((rating) => {
    const value = Number(rating.season_dupr_rating);
    if (!Number.isFinite(value)) return;
    ratingsByMemberSeason.set(memberSeasonKey(rating.member_id, rating.season_id), value);
  });

  const rosteredMembers = new Set();
  const ratingKeys = new Set();
  const ratingValues = [];
  const teamsByDivision = new Map();
  const playersByDivision = new Map();
  const ratingsByDivision = new Map();

  teams.forEach((team) => {
    const divisionName = dashboardDivisionName(team);
    const current = teamsByDivision.get(divisionName) || 0;
    teamsByDivision.set(divisionName, current + 1);
  });

  rosterRows.forEach((row) => {
    const team = teamById.get(String(row.team_id || ""));
    if (!team) return;

    const memberId = String(row.member_id || "");
    if (!memberId) return;

    const divisionName = dashboardDivisionName(team);
    const seasonId = team.divisions?.leagues?.season_id || "";
    const rating = ratingsByMemberSeason.get(memberSeasonKey(memberId, seasonId));

    rosteredMembers.add(memberId);
    if (!playersByDivision.has(divisionName)) playersByDivision.set(divisionName, new Set());
    playersByDivision.get(divisionName).add(memberId);

    if (rating !== undefined) {
      const ratingKey = memberSeasonKey(memberId, seasonId);
      if (!ratingKeys.has(ratingKey)) {
        ratingKeys.add(ratingKey);
        ratingValues.push(rating);
      }

      const divisionRatingKey = `${divisionName}:${memberId}:${seasonId}`;
      if (!ratingsByDivision.has(divisionName)) ratingsByDivision.set(divisionName, new Map());
      ratingsByDivision.get(divisionName).set(divisionRatingKey, rating);
    }
  });

  const scheduledMatches = matches.filter((match) => Boolean(match.scheduled_date));
  const completedMatches = matches.filter(isCompletedMatch);
  const matchesByWeek = new Map();
  const matchesByLocation = new Map();

  matches.forEach((match) => {
    const weekLabel = matchWeekLabel(match);
    const week = matchesByWeek.get(weekLabel) || { week: weekLabel, scheduled: 0, completed: 0 };
    week.scheduled += 1;
    if (isCompletedMatch(match)) week.completed += 1;
    matchesByWeek.set(weekLabel, week);

    const locationName = match.locations?.name || "No Location";
    matchesByLocation.set(locationName, (matchesByLocation.get(locationName) || 0) + 1);
  });

  analytics.totalTeams = teams.length;
  analytics.totalRosteredPlayers = rosteredMembers.size;
  analytics.averagePlayerRating = averageValue(ratingValues);
  analytics.minPlayerRating = ratingValues.length ? Math.min(...ratingValues) : null;
  analytics.maxPlayerRating = ratingValues.length ? Math.max(...ratingValues) : null;
  analytics.scheduledMatches = scheduledMatches.length;
  analytics.completedMatches = completedMatches.length;
  analytics.remainingMatches = Math.max(0, scheduledMatches.length - completedMatches.length);
  analytics.matchCompletionPercentage = scheduledMatches.length
    ? Math.round((completedMatches.length / scheduledMatches.length) * 100)
    : 0;
  analytics.matchesByWeek = Array.from(matchesByWeek.values()).sort(compareWeekLabels);
  analytics.teamsByDivision = mapToChartRows(teamsByDivision, "division", "teams");
  analytics.playersByDivision = Array.from(playersByDivision.entries())
    .map(([division, players]) => ({ division, players: players.size }))
    .sort((a, b) => b.players - a.players || a.division.localeCompare(b.division));
  analytics.ratingDistributionByDivision = Array.from(ratingsByDivision.entries())
    .map(([division, ratings]) => ratingDistributionRow(division, Array.from(ratings.values())))
    .sort((a, b) => a.division.localeCompare(b.division));
  analytics.matchesByLocation = mapToChartRows(matchesByLocation, "location", "matches").slice(0, 8);
  analytics.standingsLeaders = standings
    .filter((row) => Number(row.rank || 0) > 0)
    .sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999))
    .slice(0, 6)
    .map((row) => ({
      id: row.id || `${row.division_id}:${row.team_id}`,
      team: row.teams?.name || "Team",
      rank: Number(row.rank || 0),
      record: `${Number(row.match_wins || 0)}-${Number(row.match_losses || 0)}${Number(row.match_ties || 0) ? `-${Number(row.match_ties || 0)}` : ""}`,
      points: Number(row.standings_points || 0),
      differential: Number(row.point_differential || 0),
    }));
  analytics.standingsLeaderGroups = standingsLeaderGroups(standings);

  return analytics;
}

function standingsLeaderGroups(standings = []) {
  const groups = new Map();

  standings
    .filter((row) => Number(row.rank || 0) > 0)
    .forEach((row) => {
      const league = row.leagues?.name || "League";
      const division = row.divisions?.name || "Division";
      const id = `${row.league_id || league}:${row.division_id || division}`;

      if (!groups.has(id)) {
        groups.set(id, {
          id,
          league,
          division,
          leaders: [],
        });
      }

      groups.get(id).leaders.push({
        id: row.id || `${row.division_id}:${row.team_id}`,
        team: row.teams?.name || "Team",
        rank: Number(row.rank || 0),
        record: `${Number(row.match_wins || 0)}-${Number(row.match_losses || 0)}${Number(row.match_ties || 0) ? `-${Number(row.match_ties || 0)}` : ""}`,
        points: Number(row.standings_points || 0),
        wins: Number(row.match_wins || 0),
        differential: Number(row.point_differential || 0),
      });
    });

  return Array.from(groups.values())
    .map((group) => {
      const leaders = group.leaders
        .sort((a, b) => a.rank - b.rank || b.points - a.points || b.differential - a.differential || a.team.localeCompare(b.team))
        .slice(0, 5);
      const usesPoints = leaders.some((leader) => leader.points !== 0);

      return {
        ...group,
        metricLabel: usesPoints ? "Standings Points" : "Match Wins",
        leaders: leaders.map((leader) => ({
          ...leader,
          chartLabel: `#${leader.rank} ${leader.team}`,
          chartValue: usesPoints ? leader.points : leader.wins,
        })),
      };
    })
    .sort((a, b) => a.league.localeCompare(b.league) || a.division.localeCompare(b.division));
}

function isCompletedMatch(match) {
  return match?.score_status === "verified" || match?.status === "completed";
}

function dashboardDivisionName(team) {
  return team?.divisions?.name || "Unassigned";
}

function averageValue(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function matchWeekLabel(match) {
  const weekNumber = Number(match.week_number || 0);
  if (weekNumber > 0) return `Week ${weekNumber}`;
  if (!match.scheduled_date) return "No Date";
  return `Week of ${match.scheduled_date.slice(5)}`;
}

function compareWeekLabels(a, b) {
  const aNumber = Number(String(a.week || "").replace(/\D/g, ""));
  const bNumber = Number(String(b.week || "").replace(/\D/g, ""));
  if (Number.isFinite(aNumber) && Number.isFinite(bNumber) && aNumber !== bNumber) return aNumber - bNumber;
  return String(a.week || "").localeCompare(String(b.week || ""));
}

function mapToChartRows(map, nameKey, valueKey) {
  return Array.from(map.entries())
    .map(([name, value]) => ({ [nameKey]: name, [valueKey]: value }))
    .sort((a, b) => b[valueKey] - a[valueKey] || String(a[nameKey]).localeCompare(String(b[nameKey])));
}

function ratingDistributionRow(division, ratings) {
  const row = {
    division,
    "Under 3.0": 0,
    "3.0-3.49": 0,
    "3.5-3.99": 0,
    "4.0+": 0,
  };

  ratings.forEach((rating) => {
    if (rating < 3) row["Under 3.0"] += 1;
    else if (rating < 3.5) row["3.0-3.49"] += 1;
    else if (rating < 4) row["3.5-3.99"] += 1;
    else row["4.0+"] += 1;
  });

  return row;
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

function PendingVerificationModal({ matches, scopeLabel, onClose, onOpenMatch }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-amber-200">
              Pending Verification
            </div>
            <h2 className="mt-1 text-2xl font-black">Matches Awaiting Review</h2>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {matches.length} match{matches.length === 1 ? "" : "es"} in {scopeLabel.toLowerCase()}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          {matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((match) => (
                <div key={match.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-wide text-blue-700">
                        {match.leagues?.name || "League"} / {match.divisions?.name || "Division"}
                      </div>
                      <h3 className="mt-1 break-words text-lg font-black text-slate-950">
                        {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                          {dashboardMatchDate(match.scheduled_date)}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                          {dashboardMatchTime(match.scheduled_time)}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                          Week {Number(match.week_number || 0) || "N/A"}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 shadow-sm">
                          {match.locations?.name || "No Location"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenMatch(match.id)}
                      className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-blue-800"
                    >
                      Open Match
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
              No matches are pending verification in this scope.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function dashboardMatchDate(value) {
  if (!value) return "No Date";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function dashboardMatchTime(value) {
  if (!value) return "Time TBD";
  const [hoursText, minutesText] = String(value).split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

function Status({ label, value, helper, action, tone, onClick }) {
  const tones = {
    slate: "bg-slate-900 text-white",
    blue: "bg-blue-700 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-400 text-slate-950",
  };
  const content = (
    <>
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
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-2xl p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${tones[tone] || tones.slate}`}
      >
        {content}
        <div className="mt-3 text-[10px] font-black uppercase tracking-wide opacity-80">
          Click for match detail
        </div>
      </button>
    );
  }

  return (
    <div className={`rounded-2xl p-4 shadow-sm ${tones[tone] || tones.slate}`}>
      {content}
    </div>
  );
}
