"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { getRequestAuthorizationHeaders, requireRole, supabase } from "../lib/auth";
import { formatDisplayDate, formatDisplayDateWithWeekday, formatDisplayTime, formatDisplayTimestampShort } from "../lib/dateTime";
import { splitNotificationRecipients } from "../lib/notificationPreferences";
import { EMAIL_TEMPLATE_KEYS, getEmailTemplateConfig, renderEmailTemplate } from "../lib/emailTemplates";
import { confirmDeleteAction } from "../lib/confirmDelete";

const TEMPLATE_KEY = EMAIL_TEMPLATE_KEYS.scoreReminder;
const DUPR_EXPORT_HEADERS = [
  "matchType",
  "scoreType",
  "event",
  "date",
  "playerA1",
  "playerA1DuprId",
  "playerA2",
  "playerA2DuprId",
  "playerB1",
  "playerB1DuprId",
  "playerB2",
  "playerB2DuprId",
  "teamAGame1",
  "teamBGame1",
  "teamAGame2",
  "teamBGame2",
  "teamAGame3",
  "teamBGame3",
  "teamAGame4",
  "teamBGame4",
  "teamAGame5",
  "teamBGame5",
];
const DUPR_EXPORT_EVENT = "LWR Pickleball Club DUPR League";

const SCORE_REMINDER_TEMPLATE = getEmailTemplateConfig(TEMPLATE_KEY);
const DASHBOARD_SCORE_ACTION_MATCH_IDS_KEY = "lwrpc-admin-dashboard-score-action-match-ids";

export default function ScoringPage() {
  const router = useRouter();

  const [matches, setMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [teams, setTeams] = useState([]);
  const [locations, setLocations] = useState([]);
  const [createMatchOpen, setCreateMatchOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchView, setMatchView] = useState("current");
  const [deletingMatchId, setDeletingMatchId] = useState("");
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [matchSearch, setMatchSearch] = useState("");
  const [scoreStatusFilter, setScoreStatusFilter] = useState("");
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);
  const [showDuprExportReadyOnly, setShowDuprExportReadyOnly] = useState(false);
  const [showDuprOptions, setShowDuprOptions] = useState(false);
  const [emailSubject, setEmailSubject] = useState(SCORE_REMINDER_TEMPLATE.defaultSubject);
  const [emailTemplate, setEmailTemplate] = useState(SCORE_REMINDER_TEMPLATE.defaultBody);
  const [sending, setSending] = useState(false);
  const [lastSendResult, setLastSendResult] = useState("");
  const [today, setToday] = useState("");
  const [exportingScores, setExportingScores] = useState(false);
  const [updatingDuprStatus, setUpdatingDuprStatus] = useState(false);
  const [includeAlreadyExported, setIncludeAlreadyExported] = useState(false);
  const [scoreMembersById, setScoreMembersById] = useState({});
  const [dashboardScoreActionMatchIds, setDashboardScoreActionMatchIds] = useState([]);

  useEffect(() => {
    const requestedStatus = new URLSearchParams(window.location.search).get("scoreStatus");
    const requestedDashboardScoreActions =
      new URLSearchParams(window.location.search).get("dashboardScoreActions") === "1";

    if (requestedDashboardScoreActions) {
      try {
        const matchIds = JSON.parse(
          window.sessionStorage.getItem(DASHBOARD_SCORE_ACTION_MATCH_IDS_KEY) || "[]"
        );
        if (Array.isArray(matchIds)) {
          setDashboardScoreActionMatchIds(matchIds.filter(Boolean));
          setMatchView("current");
          setScoreStatusFilter("");
          setShowUnverifiedOnly(false);
          setShowDuprExportReadyOnly(false);
        }
      } catch {
        window.sessionStorage.removeItem(DASHBOARD_SCORE_ACTION_MATCH_IDS_KEY);
      }
    }

    if (requestedStatus === "pending_verification") {
      setMatchView("current");
      setScoreStatusFilter(requestedStatus);
      setShowUnverifiedOnly(false);
      setShowDuprExportReadyOnly(false);
    }
  }, []);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadTemplate = useCallback(async function loadTemplate() {
    const response = await fetch(`/api/notification-templates?template_key=${encodeURIComponent(TEMPLATE_KEY)}`, {
      headers: await getRequestAuthorizationHeaders(),
    });
    const result = await response.json().catch(() => null);
    const data = result?.template;

    if (data) {
      setEmailSubject(data.subject || SCORE_REMINDER_TEMPLATE.defaultSubject);
      setEmailTemplate(data.body || SCORE_REMINDER_TEMPLATE.defaultBody);
    }
  }, []);

  const loadMatchOptions = useCallback(async function loadMatchOptions() {
    const [leagueResult, divisionResult, teamResult, locationResult] = await Promise.all([
      supabase.from("leagues").select("id, name, is_active, seasons(is_active)").order("name", { ascending: true }),
      supabase.from("divisions").select("id, name, league_id, is_active, sort_order").order("sort_order", { ascending: true }),
      supabase.from("teams").select("id, name, division_id, is_active").order("name", { ascending: true }),
      supabase.from("locations").select("id, name").order("name", { ascending: true }),
    ]);

    const firstError = [leagueResult, divisionResult, teamResult, locationResult]
      .map((result) => result.error)
      .find(Boolean);

    if (firstError) {
      alert(firstError.message);
      return;
    }

    setLeagues((leagueResult.data || []).filter((league) => league.is_active !== false && league.seasons?.is_active !== false));
    setDivisions((divisionResult.data || []).filter((division) => division.is_active !== false));
    setTeams((teamResult.data || []).filter((team) => team.is_active !== false));
    setLocations(locationResult.data || []);
  }, []);
  const loadMatches = useCallback(async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        league_id,
        division_id,
        home_team_id,
        away_team_id,
        location_id,
        notes,
        scheduled_date,
        scheduled_time,
        week_number,
        status,
        score_status,
        score_entered_by_member_id,
        score_entered_at,
        score_verified_by_member_id,
        score_verified_at,
        score_exported_at,
        home_score,
        away_score,
        divisions (
          id,
          name
        ),
        leagues (
          id,
          name
        ),
        locations (
          id,
          name
        ),
        home_team:teams!matches_home_team_id_fkey (
          id,
          name,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        ),
        away_team:teams!matches_away_team_id_fkey (
          id,
          name,
          captain:members!teams_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_1:members!teams_co_captain_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          co_captain_2:members!teams_co_captain_2_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          ),
          club_pro:members!teams_club_pro_member_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone,
            notification_preference
          )
        )
      `)
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const sortedMatches = [...(data || [])].sort(compareScoringMatches);
    const currentDate = localDateString();
    const dueMatches = sortedMatches.filter(
      (match) => match.scheduled_date && match.scheduled_date <= currentDate
    );
    const scoreMemberIds = [
      ...dueMatches.map((match) => match.score_entered_by_member_id),
      ...dueMatches.map((match) => match.score_verified_by_member_id),
    ].filter(Boolean);

    if (scoreMemberIds.length > 0) {
      const { data: scoreMembers } = await supabase
        .from("members")
        .select("id, first_name, last_name, email")
        .in("id", [...new Set(scoreMemberIds)]);

      setScoreMembersById(Object.fromEntries((scoreMembers || []).map((member) => [String(member.id), member])));
    } else {
      setScoreMembersById({});
    }

    setAllMatches(sortedMatches);
    setMatches(dueMatches);
    setSelectedMatchIds(
      dueMatches
        .filter((match) => match.score_status === "verified" && !match.score_exported_at)
        .map((match) => match.id)
    );
  }, []);

  useEffect(() => {
    async function run() {
      setToday(localDateString());
      const ok = await checkAuth();

      if (ok) {
        await Promise.all([loadMatches(), loadMatchOptions(), loadTemplate()]);
      }
    }

    run();
  }, [checkAuth, loadMatches, loadMatchOptions, loadTemplate]);

  const activeMatches = useMemo(() => {
    if (dashboardScoreActionMatchIds.length > 0) {
      const selectedIds = new Set(dashboardScoreActionMatchIds);
      return allMatches.filter((match) => selectedIds.has(match.id));
    }

    if (matchView === "upcoming") {
      return allMatches.filter((match) => match.scheduled_date && match.scheduled_date > today);
    }

    return matches;
  }, [allMatches, dashboardScoreActionMatchIds, matchView, matches, today]);

  useEffect(() => {
    if (dashboardScoreActionMatchIds.length === 0 || allMatches.length === 0) return;
    const availableIds = new Set(allMatches.map((match) => match.id));
    setSelectedMatchIds(dashboardScoreActionMatchIds.filter((id) => availableIds.has(id)));
  }, [allMatches, dashboardScoreActionMatchIds]);

  const searchableMatches = useMemo(() => {
    const q = matchSearch.trim().toLowerCase();

    if (!q) return activeMatches;

    return activeMatches.filter((match) => {
      const text = [
        match.home_team?.name,
        match.away_team?.name,
        match.leagues?.name,
        match.divisions?.name,
        match.locations?.name,
        match.scheduled_date,
        ...dateSearchValues(match.scheduled_date),
        match.scheduled_time,
        formatDisplayTime(match.scheduled_time, ""),
        match.week_number,
        match.status,
        match.score_status,
        scoreStatusLabel(match.score_status),
      ].join(" ").toLowerCase();

      return text.includes(q);
    });
  }, [activeMatches, matchSearch]);

  const visibleMatches = useMemo(() => {
    if (scoreStatusFilter) {
      return searchableMatches.filter((match) => match.score_status === scoreStatusFilter);
    }

    if (showUnverifiedOnly) {
      return searchableMatches.filter((match) => match.score_status !== "verified");
    }

    if (showDuprExportReadyOnly) {
      return searchableMatches.filter(
        (match) => match.score_status === "verified" && !match.score_exported_at
      );
    }

    return searchableMatches;
  }, [scoreStatusFilter, searchableMatches, showDuprExportReadyOnly, showUnverifiedOnly]);

  const selectedMatches = useMemo(() => {
    const selected = new Set(selectedMatchIds);
    return activeMatches.filter((match) => selected.has(match.id));
  }, [activeMatches, selectedMatchIds]);
  const selectedExportMatches = useMemo(
    () => selectedMatches.filter((match) => match.score_status === "verified" && (includeAlreadyExported || !match.score_exported_at)),
    [includeAlreadyExported, selectedMatches]
  );
  const selectedAlreadyExportedMatches = useMemo(
    () => selectedMatches.filter((match) => !!match.score_exported_at),
    [selectedMatches]
  );
  const allVisibleSelected = visibleMatches.length > 0 &&
    visibleMatches.every((match) => selectedMatchIds.includes(match.id));

  function toggleMatch(matchId) {
    setSelectedMatchIds((current) =>
      current.includes(matchId)
        ? current.filter((id) => id !== matchId)
        : [...current, matchId]
    );
  }

  function toggleAllVisible() {
    const visibleIds = visibleMatches.map((match) => match.id);

    if (allVisibleSelected) {
      setSelectedMatchIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedMatchIds((current) => [...new Set([...current, ...visibleIds])]);
  }

  function changeMatchView(nextView) {
    setMatchView(nextView);
    setSelectedMatchIds([]);
    setScoreStatusFilter("");
    setShowUnverifiedOnly(false);
    setShowDuprExportReadyOnly(false);
  }

  function toggleUnverifiedFilter() {
    if (showUnverifiedOnly) {
      setShowUnverifiedOnly(false);
      return;
    }

    const unverifiedIds = searchableMatches
      .filter((match) => match.score_status !== "verified")
      .map((match) => match.id);

    setSelectedMatchIds(unverifiedIds);
    setScoreStatusFilter("");
    setShowDuprExportReadyOnly(false);
    setShowUnverifiedOnly(true);
  }

  function toggleDuprExportReadyFilter() {
    if (showDuprExportReadyOnly) {
      setShowDuprExportReadyOnly(false);
      return;
    }

    const exportReadyIds = searchableMatches
      .filter((match) => match.score_status === "verified" && !match.score_exported_at)
      .map((match) => match.id);

    setSelectedMatchIds(exportReadyIds);
    setScoreStatusFilter("");
    setShowUnverifiedOnly(false);
    setShowDuprExportReadyOnly(true);
  }

  async function deleteMatch(match) {
    if (match.status === "completed") {
      alert("Completed matches cannot be deleted. Use Schedule Editor reset tools first if the result must be removed.");
      return;
    }

    const ok = confirmDeleteAction({
      title: "Delete this non-completed match?",
      details: "This will permanently delete the match, its lineup, generated match lines, and game rows. Completed matches are protected.",
    });

    if (!ok) return;

    setDeletingMatchId(match.id);

    const { data, error } = await supabase
      .from("matches")
      .delete()
      .eq("id", match.id)
      .neq("status", "completed")
      .select("id");

    setDeletingMatchId("");

    if (error) {
      alert(error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert("This match is now completed or no longer exists, so it was not deleted.");
      await loadMatches();
      return;
    }

    await loadMatches();
  }
  async function sendReminders() {
    if (selectedMatches.length === 0) {
      alert("Select one or more matches first.");
      return;
    }

    const reminderJobs = selectedMatches
      .filter((match) => match.score_status !== "verified")
      .map((match) => ({
        match,
        ...splitNotificationRecipients(scoreReminderContacts(match)),
      }))
      .filter((job) => job.emails.length > 0 || job.phones.length > 0);

    if (reminderJobs.length === 0) {
      alert("No eligible unverified matches with captain email addresses or text phone numbers were found for the selected matches based on member notification preferences.");
      return;
    }

    const emailCount = reminderJobs.reduce((total, job) => total + job.emails.length, 0);
    const phoneCount = reminderJobs.reduce((total, job) => total + job.phones.length, 0);
    const skippedCount = selectedMatches.length - reminderJobs.length;
    const ok = confirm(
      `Send ${reminderJobs.length} separate score reminder email${reminderJobs.length === 1 ? "" : "s"} for ${reminderJobs.length} match${reminderJobs.length === 1 ? "" : "es"}?\n\nRecipients across all reminders: ${emailCount} email recipient${emailCount === 1 ? "" : "s"} and ${phoneCount} text recipient${phoneCount === 1 ? "" : "s"}.${skippedCount > 0 ? `\n\nSkipped ${skippedCount} selected match${skippedCount === 1 ? "" : "es"} because it is verified or has no reminder recipients.` : ""}`
    );
    if (!ok) return;

    setSending(true);
    setLastSendResult("");

    const results = await Promise.all(
      reminderJobs.map(async (job) => {
        const rendered = renderEmailTemplate(
          {
            template_key: TEMPLATE_KEY,
            subject: emailSubject,
            body: emailTemplate,
          },
          scoreReminderValues([job.match])
        );
        const response = await fetch("/api/notifications", {
          method: "POST",
          headers: await getRequestAuthorizationHeaders({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            emails: job.emails,
            phones: job.phones,
            subject: rendered.subject,
            text: rendered.text,
            html: rendered.html,
            smsBody: rendered.text,
          }),
        });

        const result = await response.json().catch(() => ({}));

        return {
          ok: response.ok && result.success !== false,
          error: result.error || "Email send failed.",
          emails: job.emails.length,
          phones: job.phones.length,
        };
      })
    );
    setSending(false);

    const failed = results.filter((result) => !result.ok);

    if (failed.length > 0) {
      alert(failed[0].error || "One or more score reminders failed.");
      return;
    }

    setLastSendResult(`Sent ${results.length} separate score reminder${results.length === 1 ? "" : "s"} to ${emailCount} email recipient${emailCount === 1 ? "" : "s"} and ${phoneCount} text recipient${phoneCount === 1 ? "" : "s"}.`);
  }

  async function exportForDupr() {
    const exportMatches = selectedExportMatches;

    if (exportMatches.length === 0) {
      alert("Select one or more verified matches to export.");
      return;
    }

    setExportingScores(true);

    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        league_id,
        division_id,
        home_team_id,
        away_team_id,
        location_id,
        notes,
        scheduled_date,
        score_status,
        score_exported_at,
        match_lines (
          id,
          line_number,
          posted_to_dupr,
          division_lines (
            posted_to_dupr,
            score_type
          ),
          home_player_1:members!match_lines_home_player_1_id_fkey(first_name, last_name, full_name, dupr_id),
          home_player_2:members!match_lines_home_player_2_id_fkey(first_name, last_name, full_name, dupr_id),
          away_player_1:members!match_lines_away_player_1_id_fkey(first_name, last_name, full_name, dupr_id),
          away_player_2:members!match_lines_away_player_2_id_fkey(first_name, last_name, full_name, dupr_id),
          line_games (
            game_number,
            home_score,
            away_score
          )
        )
      `)
      .eq("score_status", "verified")
      .in("id", exportMatches.map((match) => match.id));

    if (error) {
      setExportingScores(false);
      alert("Score export requires the latest scoring schema updates, including score_exported_at and division line score_type. Run the updated Supabase SQL, then try again.");
      return;
    }

    const rows = (data || [])
      .map((match) => {
        const sourceMatch = exportMatches.find((item) => item.id === match.id) || match;
        return {
          ...sourceMatch,
          match_lines: (match.match_lines || []).filter(linePostsToDupr),
        };
      })
      .filter((match) => match.match_lines.length > 0)
      .sort(compareScoringMatches);

    if (rows.length === 0) {
      setExportingScores(false);
      alert("No selected verified matches have completed line scores marked to Post to DUPR.");
      return;
    }

    const csvRows = rows.flatMap((match) => duprRowsForMatch(match));
    const gameCount = rows.reduce(
      (total, match) => total + (match.match_lines || []).reduce(
        (lineTotal, line) => lineTotal + (line.line_games || []).filter(hasCompletedGameScore).length,
        0
      ),
      0
    );

    if (csvRows.length === 0 || gameCount === 0) {
      setExportingScores(false);
      alert("No completed line scores were found for the selected matches.");
      return;
    }

    const confirmed = window.confirm(
      `Export ${gameCount} completed game${gameCount === 1 ? "" : "s"} from ${rows.length} selected match${rows.length === 1 ? "" : "es"}?\n\nA DUPR CSV file will be downloaded and ${rows.length === 1 ? "this match" : "these matches"} will be marked as exported.`
    );

    if (!confirmed) {
      setExportingScores(false);
      return;
    }

    const csv = toCsv([DUPR_EXPORT_HEADERS, ...csvRows]);

    downloadCsv(csv, `lwrpc-dupr-export-${localDateString()}.csv`);

    const { error: updateError } = await supabase
      .from("matches")
      .update({
        score_exported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", rows.map((match) => match.id));

    if (updateError) {
      alert(updateError.message);
      setExportingScores(false);
      return;
    }

    await loadMatches();
    setExportingScores(false);
  }

  async function markSelectedNotExported() {
    if (selectedAlreadyExportedMatches.length === 0) {
      alert("Select one or more matches currently marked as exported.");
      return;
    }

    const confirmed = window.confirm(
      `Mark ${selectedAlreadyExportedMatches.length} selected match${selectedAlreadyExportedMatches.length === 1 ? "" : "es"} as not exported?\n\n${selectedAlreadyExportedMatches.length === 1 ? "It" : "They"} will become eligible for DUPR export again.`
    );

    if (!confirmed) return;

    setUpdatingDuprStatus(true);
    const { error } = await supabase
      .from("matches")
      .update({
        score_exported_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", selectedAlreadyExportedMatches.map((match) => match.id));

    if (error) {
      alert(error.message);
      setUpdatingDuprStatus(false);
      return;
    }

    await loadMatches();
    setUpdatingDuprStatus(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Scoring Operations"
          subtitle="Create and manage matches, monitor overdue scores, and remind captains to enter or verify results."
        />

        <MatchEditorDialog
          open={createMatchOpen || !!editingMatch}
          match={editingMatch}
          leagues={leagues}
          divisions={divisions}
          teams={teams}
          locations={locations}
          matchCount={allMatches.length}
          onClose={() => {
            setCreateMatchOpen(false);
            setEditingMatch(null);
          }}
          onSaved={async () => {
            setCreateMatchOpen(false);
            setEditingMatch(null);
            await loadMatches();
          }}
        />

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard label={matchView === "current" ? "Current Matches" : "Upcoming Matches"} value={activeMatches.length} />
          <SummaryCard label="Not Verified" value={activeMatches.filter((match) => match.score_status !== "verified").length} />
          <SummaryCard label="Verified" value={activeMatches.filter((match) => match.score_status === "verified").length} />
          <SummaryCard label="Selected" value={selectedMatches.length} />
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Match Workspace</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {matchView === "current" ? "Current Matches" : "Upcoming Matches"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {matchView === "current"
                  ? `Matches dated ${today ? formatDate(today) : "today"} or earlier.`
                  : `Matches scheduled after ${today ? formatDate(today) : "today"}.`}
              </p>
              <div className="mt-1 text-sm text-slate-500">
                {visibleMatches.length} shown / {activeMatches.length} total {matchView === "current" ? "current" : "upcoming"} matches
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-xl bg-slate-100 p-1" aria-label="Match date view">
                <button type="button" onClick={() => changeMatchView("current")} aria-pressed={matchView === "current"} className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${matchView === "current" ? "bg-white text-blue-800 shadow" : "text-slate-600 hover:text-slate-950"}`}>Current</button>
                <button type="button" onClick={() => changeMatchView("upcoming")} aria-pressed={matchView === "upcoming"} className={`rounded-lg px-4 py-2.5 text-sm font-black transition ${matchView === "upcoming" ? "bg-white text-blue-800 shadow" : "text-slate-600 hover:text-slate-950"}`}>Upcoming</button>
              </div>
              <button type="button" onClick={() => { setEditingMatch(null); setCreateMatchOpen(true); }} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800">
                New Match
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(18rem,1fr)_auto] lg:items-start">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">Search / Filter</label>
              <input value={matchSearch} onChange={(event) => setMatchSearch(event.target.value)} placeholder="Teams, league, division, date, location..." className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold" />
              <div className="mt-1 text-xs font-semibold text-slate-500">Dates work as MM/DD/YYYY, M/D/YYYY, or YYYY-MM-DD.</div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end lg:pt-5">
              {dashboardScoreActionMatchIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setDashboardScoreActionMatchIds([]);
                    window.sessionStorage.removeItem(DASHBOARD_SCORE_ACTION_MATCH_IDS_KEY);
                    window.history.replaceState(window.history.state, "", window.location.pathname);
                  }}
                  className="rounded-xl bg-amber-700 px-4 py-3 text-sm font-bold text-white hover:bg-amber-800"
                >
                  Showing Dashboard Score Actions
                </button>
              )}
              {scoreStatusFilter === "pending_verification" && (
                <button
                  type="button"
                  onClick={() => {
                    setScoreStatusFilter("");
                    window.history.replaceState(window.history.state, "", window.location.pathname);
                  }}
                  className="rounded-xl bg-red-700 px-4 py-3 text-sm font-bold text-white hover:bg-red-800"
                >
                  Showing Pending Verification
                </button>
              )}
              <button type="button" onClick={toggleUnverifiedFilter} className={`rounded-xl px-4 py-3 text-sm font-bold ${showUnverifiedOnly ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-blue-100 text-blue-900 hover:bg-blue-200"}`}>
                {showUnverifiedOnly ? "Showing Not Verified" : "Not Verified"}
              </button>
              <button type="button" onClick={toggleAllVisible} className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-300">
                {allVisibleSelected ? "Clear Visible" : "Select Visible"}
              </button>
              <button type="button" onClick={sendReminders} disabled={sending || selectedMatches.length === 0} className="rounded-xl bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {sending ? "Sending..." : "Send Reminder"}
              </button>
              <button type="button" onClick={() => setShowDuprOptions((value) => !value)} aria-expanded={showDuprOptions} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800">
                DUPR Options {showDuprOptions ? "\u25B2" : "\u25BC"}
              </button>
            </div>
          </div>

          {showDuprOptions && (
            <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" aria-label="DUPR options">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800">DUPR Options</div>
                  <p className="mt-1 text-sm font-semibold text-emerald-950">Filter export-ready matches, export selected scores, or correct an exported status.</p>
                  <label className="mt-3 flex items-start gap-2 text-sm font-semibold text-emerald-950">
                    <input type="checkbox" checked={includeAlreadyExported} onChange={(event) => setIncludeAlreadyExported(event.target.checked)} className="mt-0.5" />
                    Include already exported verified matches when exporting again
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 lg:max-w-[42rem] lg:justify-end">
                  <button type="button" onClick={toggleDuprExportReadyFilter} className={`rounded-xl px-4 py-3 text-sm font-bold ${showDuprExportReadyOnly ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-white text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"}`}>
                    {showDuprExportReadyOnly ? "Showing Export Ready" : "DUPR Export Ready"}
                  </button>
                  <button type="button" onClick={exportForDupr} disabled={exportingScores || selectedExportMatches.length === 0} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {exportingScores ? "Exporting..." : `DUPR Export (${selectedExportMatches.length})`}
                  </button>
                  <button type="button" onClick={markSelectedNotExported} disabled={updatingDuprStatus || selectedAlreadyExportedMatches.length === 0} className="rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm font-bold text-amber-900 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">
                    {updatingDuprStatus ? "Updating..." : `Mark Not Exported (${selectedAlreadyExportedMatches.length})`}
                  </button>
                </div>
              </div>
            </section>
          )}

          {lastSendResult && (
            <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-900">
              {lastSendResult}
            </div>
          )}

          <div className="mt-5 space-y-3">
            {visibleMatches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                selected={selectedMatchIds.includes(match.id)}
                membersById={scoreMembersById}
                onToggle={() => toggleMatch(match.id)}
                onOpen={() => router.push(`/matches/${match.id}?from=scoring`)}
                onEdit={() => setEditingMatch(match)}
                onDelete={() => deleteMatch(match)}
                deleting={deletingMatchId === match.id}
              />
            ))}

            {visibleMatches.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-8 text-center text-slate-500">
                No matches match the current filter.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function MatchEditorDialog({ open, match, leagues, divisions, teams, locations, matchCount, onClose, onSaved }) {
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedDivision, setSelectedDivision] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [weekNumber, setWeekNumber] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = !!match;
  const structureLocked = match?.status === "completed";

  useEffect(() => {
    if (!open) return;

    setSelectedLeague(match?.league_id || "");
    setSelectedDivision(match?.division_id || "");
    setHomeTeamId(match?.home_team_id || "");
    setAwayTeamId(match?.away_team_id || "");
    setLocationId(match?.location_id || "");
    setScheduledDate(match?.scheduled_date || "");
    setScheduledTime(match?.scheduled_time || "");
    setWeekNumber(match?.week_number == null ? "1" : String(match.week_number));
    setNotes(match?.notes || "");
    setSaving(false);
  }, [match, open]);

  const filteredDivisions = useMemo(
    () => divisions.filter((division) => division.league_id === selectedLeague),
    [divisions, selectedLeague]
  );
  const filteredTeams = useMemo(
    () => teams.filter((team) => team.division_id === selectedDivision),
    [teams, selectedDivision]
  );

  async function saveMatch(event) {
    event.preventDefault();

    if (!selectedLeague || !selectedDivision || !homeTeamId || !awayTeamId) {
      alert("League, division, home team, and away team are required.");
      return;
    }

    if (homeTeamId === awayTeamId) {
      alert("Home and away teams cannot be the same.");
      return;
    }

    const structuralChange = editing && !structureLocked && (
      selectedLeague !== match.league_id ||
      selectedDivision !== match.division_id ||
      homeTeamId !== match.home_team_id ||
      awayTeamId !== match.away_team_id
    );

    if (structuralChange && !confirm("Changing the league, division, or teams will clear saved lineups and rebuild the generated scoring rows for this match. Continue?")) {
      return;
    }

    setSaving(true);

    const schedulePayload = {
      location_id: locationId || null,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      week_number: Number(weekNumber || 1),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    };
    const fullPayload = {
      ...schedulePayload,
      league_id: selectedLeague,
      division_id: selectedDivision,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
    };

    if (editing) {
      const { error } = await supabase
        .from("matches")
        .update(structureLocked ? schedulePayload : fullPayload)
        .eq("id", match.id)
        .select("id")
        .single();

      if (error) {
        setSaving(false);
        alert(error.message);
        return;
      }

      if (structuralChange) {
        const resetError = await resetMatchScheduleRows(match.id);
        const setupError = resetError || await generateMatchScheduleRows(match.id, selectedDivision);

        if (setupError) {
          alert(`The match was updated, but its generated scoring rows could not be rebuilt: ${setupError.message}`);
        }
      }
    } else {
      const { data: createdMatch, error } = await supabase
        .from("matches")
        .insert({ ...fullPayload, status: "scheduled" })
        .select("id")
        .single();

      if (error) {
        setSaving(false);
        alert(error.message);
        return;
      }

      const setupError = await generateMatchScheduleRows(createdMatch.id, selectedDivision);

      if (setupError) {
        alert(`The match was created, but its generated scoring rows could not be completed: ${setupError.message}`);
      }
    }

    await onSaved();
    setSaving(false);
  }

  if (!open) return null;

  const currentLeagueMissing = selectedLeague && !leagues.some((league) => league.id === selectedLeague);
  const currentDivisionMissing = selectedDivision && !filteredDivisions.some((division) => division.id === selectedDivision);
  const currentHomeTeamMissing = homeTeamId && !filteredTeams.some((team) => team.id === homeTeamId);
  const currentAwayTeamMissing = awayTeamId && !filteredTeams.some((team) => team.id === awayTeamId);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="match-editor-title">
      <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-slate-950 to-blue-900 px-5 py-4 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Scoring Operations</div>
            <h2 id="match-editor-title" className="text-xl font-black text-white">{editing ? "Edit Match" : "Create New Match"}</h2>
          </div>

          <div className="hidden rounded-xl bg-white/10 px-5 py-2.5 sm:block">
            <div className="text-xs font-bold uppercase tracking-wide text-blue-200">Current Matches</div>
            <div className="text-2xl font-black">{matchCount}</div>
          </div>

          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-white/30 bg-white px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60">
            Close
          </button>
        </div>

        <form onSubmit={saveMatch} className="max-h-[calc(100dvh-7rem)] space-y-4 overflow-y-auto p-5">
          {structureLocked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-6 text-amber-900">
              This match is completed. League, division, and teams are locked to protect its scores; date, time, location, week, and notes can still be corrected.
            </div>
          )}

          <div>
            <FieldLabel label="League" />
            <select
              value={selectedLeague}
              onChange={(event) => {
                setSelectedLeague(event.target.value);
                setSelectedDivision("");
                setHomeTeamId("");
                setAwayTeamId("");
              }}
              disabled={structureLocked}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base disabled:bg-slate-100 disabled:text-slate-600"
              required
            >
              <option value="">Select League</option>
              {currentLeagueMissing && <option value={selectedLeague}>{match?.leagues?.name || "Current League"}</option>}
              {leagues.map((league) => <option key={league.id} value={league.id}>{league.name}</option>)}
            </select>
          </div>

          <div>
            <FieldLabel label="Division" />
            <select
              value={selectedDivision}
              onChange={(event) => {
                setSelectedDivision(event.target.value);
                setHomeTeamId("");
                setAwayTeamId("");
              }}
              disabled={structureLocked}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base disabled:bg-slate-100 disabled:text-slate-600"
              required
            >
              <option value="">Select Division</option>
              {currentDivisionMissing && <option value={selectedDivision}>{match?.divisions?.name || "Current Division"}</option>}
              {filteredDivisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Home Team" />
              <select value={homeTeamId} onChange={(event) => setHomeTeamId(event.target.value)} disabled={structureLocked} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base disabled:bg-slate-100 disabled:text-slate-600" required>
                <option value="">Select Home Team</option>
                {currentHomeTeamMissing && <option value={homeTeamId}>{match?.home_team?.name || "Current Home Team"}</option>}
                {filteredTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel label="Away Team" />
              <select value={awayTeamId} onChange={(event) => setAwayTeamId(event.target.value)} disabled={structureLocked} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base disabled:bg-slate-100 disabled:text-slate-600" required>
                <option value="">Select Away Team</option>
                {currentAwayTeamMissing && <option value={awayTeamId}>{match?.away_team?.name || "Current Away Team"}</option>}
                {filteredTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <FieldLabel label="Match Location" />
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base">
              <option value="">Select Location</option>
              {locationId && !locations.some((location) => location.id === locationId) && <option value={locationId}>{match?.locations?.name || "Current Location"}</option>}
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel label="Match Date" />
              <input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base" />
            </div>
            <div>
              <FieldLabel label="Match Time" />
              <input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base" />
            </div>
            <div>
              <FieldLabel label="Week Number" />
              <input type="number" min="1" value={weekNumber} onChange={(event) => setWeekNumber(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base" />
            </div>
          </div>

          <div>
            <FieldLabel label="Match Notes" />
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" placeholder="Rain date, makeup match, holiday week, special court assignment, etc." />
          </div>

          <button type="submit" disabled={saving} className="w-full rounded-xl bg-blue-700 px-5 py-3.5 text-base font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            {saving ? (editing ? "Saving Match..." : "Creating Match...") : (editing ? "Save Match" : "Create Match")}
          </button>
        </form>
      </div>
    </div>
  );
}
async function generateMatchScheduleRows(matchId, divisionId) {
  const { data: lineTemplates, error } = await supabase
    .from("division_lines")
    .select("id, line_number, posted_to_dupr, games_per_line")
    .eq("division_id", divisionId)
    .order("line_number", { ascending: true });

  if (error || !lineTemplates?.length) return error || null;

  const { data: createdLines, error: lineError } = await supabase
    .from("match_lines")
    .insert(lineTemplates.map((line) => ({
      match_id: matchId,
      division_line_id: line.id,
      line_number: line.line_number,
      posted_to_dupr: line.posted_to_dupr,
      line_status: "scheduled",
    })))
    .select("id, division_line_id");

  if (lineError) return lineError;

  const gameRows = (createdLines || []).flatMap((matchLine) => {
    const template = lineTemplates.find((line) => line.id === matchLine.division_line_id);
    return Array.from({ length: Number(template?.games_per_line || 1) }, (_, index) => ({
      match_line_id: matchLine.id,
      game_number: index + 1,
      game_status: "scheduled",
    }));
  });

  if (gameRows.length === 0) return null;

  const { error: gameError } = await supabase.from("line_games").insert(gameRows);
  return gameError || null;
}

async function resetMatchScheduleRows(matchId) {
  const { error: lineupError } = await supabase
    .from("match_lineups")
    .delete()
    .eq("match_id", matchId);

  if (lineupError) return lineupError;

  const { error: lineError } = await supabase
    .from("match_lines")
    .delete()
    .eq("match_id", matchId);

  return lineError || null;
}
function FieldLabel({ label }) {
  return <label className="mb-1 block text-sm font-bold text-slate-700">{label}</label>;
}
function MatchRow({ match, selected, membersById, onToggle, onOpen, onEdit, onDelete, deleting }) {
  const contacts = captainContacts(match);

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <label className="flex min-w-0 flex-1 items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="mt-1"
            aria-label={`Select ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}`}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-lg font-bold text-slate-900">
                {match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}
              </div>

              <ScoreStatusBadge value={match.score_status} />
              {match.score_exported_at && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
                  Exported
                </span>
              )}
            </div>

            <div className="mt-1 text-base font-black text-slate-950 sm:text-lg">
              {formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "TBD")}
            </div>

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>{match.leagues?.name || "No League"}</span>
              <span>{match.divisions?.name || "No Division"}</span>
              <span>{match.locations?.name || "No Location"}</span>
              <span>Status: {match.status || "scheduled"}</span>
            </div>

            {match.status === "completed" && (
              <ScoreAuditDetails match={match} membersById={membersById} />
            )}

            <div className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">Captains:</span>{" "}
              {contacts.length > 0 ? contacts.map((contact) => contact.name).join(", ") : "No captain contacts found"}
            </div>
          </div>
        </label>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-blue-100 px-4 py-2.5 text-sm font-bold text-blue-900 hover:bg-blue-200"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onOpen}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            Open Match
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={match.status === "completed" || deleting}
            title={match.status === "completed" ? "Completed matches cannot be deleted" : "Delete this non-completed match"}
            className="rounded-lg bg-red-100 px-4 py-2.5 text-sm font-bold text-red-800 hover:bg-red-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function compareScoringMatches(a, b) {
  const dateCompare = String(a.scheduled_date || "9999-12-31").localeCompare(String(b.scheduled_date || "9999-12-31"));
  if (dateCompare !== 0) return dateCompare;

  const leagueCompare = (a.leagues?.name || "").localeCompare(b.leagues?.name || "", undefined, { sensitivity: "base" });
  if (leagueCompare !== 0) return leagueCompare;

  const divisionCompare = (a.divisions?.name || "").localeCompare(b.divisions?.name || "", undefined, { sensitivity: "base" });
  if (divisionCompare !== 0) return divisionCompare;

  const homeTeamCompare = (a.home_team?.name || "").localeCompare(b.home_team?.name || "", undefined, { sensitivity: "base" });
  if (homeTeamCompare !== 0) return homeTeamCompare;

  return String(a.scheduled_time || "").localeCompare(String(b.scheduled_time || ""));
}

function hasCompletedGameScore(game) {
  return game?.home_score !== null && game?.home_score !== undefined && game?.away_score !== null && game?.away_score !== undefined;
}

function dateSearchValues(value) {
  const text = String(value || "");
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!match) return [formatDisplayDate(value, "")];

  const [, year, month, day] = match;
  const shortMonth = String(Number(month));
  const shortDay = String(Number(day));

  return [
    `${month}/${day}/${year}`,
    `${shortMonth}/${shortDay}/${year}`,
    `${month}-${day}-${year}`,
    `${shortMonth}-${shortDay}-${year}`,
  ];
}

function duprRowsForMatch(match) {
  return [...(match.match_lines || [])]
    .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))
    .map((line) => {
      const games = [...(line.line_games || [])]
        .sort((a, b) => Number(a.game_number || 0) - Number(b.game_number || 0))
        .slice(0, 5);
      const gameScores = Array.from({ length: 5 }, (_, index) => {
        const game = games[index] || {};
        return [game.home_score ?? "", game.away_score ?? ""];
      }).flat();

      return [
        "D",
        duprScoreType(line),
        DUPR_EXPORT_EVENT,
        match.scheduled_date || "",
        duprPlayerName(line.home_player_1),
        line.home_player_1?.dupr_id || "",
        duprPlayerName(line.home_player_2),
        line.home_player_2?.dupr_id || "",
        duprPlayerName(line.away_player_1),
        line.away_player_1?.dupr_id || "",
        duprPlayerName(line.away_player_2),
        line.away_player_2?.dupr_id || "",
        ...gameScores,
      ];
    });
}

function duprScoreType(line) {
  const value = String(line?.division_lines?.score_type || "sideout").trim().toLowerCase();
  return value === "rally" ? "RALLY" : "SIDEOUT";
}

function linePostsToDupr(line) {
  const value = line?.posted_to_dupr ?? line?.division_lines?.posted_to_dupr;
  return value === true || value === "true" || value === 1 || value === "1";
}

function duprPlayerName(member) {
  if (!member) return "";

  return (
    member.full_name ||
    `${member.first_name || ""} ${member.last_name || ""}`.trim()
  );
}

function ScoreAuditDetails({ match, membersById }) {
  const enteredBy = scoreMemberName(membersById?.[String(match.score_entered_by_member_id || "")]);
  const verifiedBy = scoreMemberName(membersById?.[String(match.score_verified_by_member_id || "")]);

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
      {match.score_entered_at && (
        <span>
          Entered: {formatDisplayTimestampShort(match.score_entered_at)}
          {enteredBy ? ` by ${enteredBy}` : ""}
        </span>
      )}
      {match.score_status === "verified" && match.score_verified_at && (
        <span>
          Verified: {formatDisplayTimestampShort(match.score_verified_at)}
          {verifiedBy ? ` by ${verifiedBy}` : ""}
        </span>
      )}
    </div>
  );
}

function scoreMemberName(member) {
  return `${member?.first_name || ""} ${member?.last_name || ""}`.trim() || member?.email || "";
}

function ScoreStatusBadge({ value }) {
  const status = value || "not_entered";
  const verified = status === "verified";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
      verified ? "bg-green-100 text-green-800" : "bg-red-600 text-white"
    }`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function captainContacts(match) {
  return [
    match.home_team?.captain,
    match.home_team?.co_captain_1,
    match.home_team?.co_captain_2,
    match.home_team?.club_pro,
    match.away_team?.captain,
    match.away_team?.co_captain_1,
    match.away_team?.co_captain_2,
    match.away_team?.club_pro,
  ]
    .filter(Boolean)
    .map((member) => ({
      id: member.id,
      name: formatMemberName(member),
      email: member.email || "",
      phone: member.phone || "",
      notification_preference: member.notification_preference || "email",
    }))
    .filter((contact, index, all) =>
      contact.id && all.findIndex((item) => item.id === contact.id) === index
    );
}

function scoreReminderContacts(match) {
  if (match.score_status === "not_entered" || !match.score_status) {
    return [
      ...teamCaptainContacts(match.home_team),
      ...teamCaptainContacts(match.away_team),
    ];
  }

  if (match.score_status === "pending_verification") {
    const submitterSide = scoreSubmitterSide(match);

    if (submitterSide === "home") return teamCaptainContacts(match.away_team);
    if (submitterSide === "away") return teamCaptainContacts(match.home_team);

    return [
      ...teamCaptainContacts(match.home_team),
      ...teamCaptainContacts(match.away_team),
    ];
  }

  return [
    ...teamCaptainContacts(match.home_team),
    ...teamCaptainContacts(match.away_team),
  ];
}

function teamCaptainContacts(team) {
  return [
    team?.captain,
    team?.co_captain_1,
    team?.co_captain_2,
  ]
    .filter(Boolean)
    .map((member) => ({
      id: member.id,
      name: formatMemberName(member),
      email: member.email || "",
      phone: member.phone || "",
      notification_preference: member.notification_preference || "email",
    }))
    .filter((contact, index, all) =>
      contact.id && all.findIndex((item) => item.id === contact.id) === index
    );
}

function scoreSubmitterSide(match) {
  const submitterId = String(match?.score_entered_by_member_id || "");

  if (!submitterId) return "";

  const homeCaptainIds = teamCaptainContacts(match.home_team).map((contact) => String(contact.id));
  const awayCaptainIds = teamCaptainContacts(match.away_team).map((contact) => String(contact.id));

  if (homeCaptainIds.includes(submitterId)) return "home";
  if (awayCaptainIds.includes(submitterId)) return "away";

  return "";
}

function scoreReminderValues(matches) {
  const matchLines = matches.length > 0
    ? `<ul>${matches.map((match) => {
      return `<li><strong>${escapeHtml(formatEmailDate(match.scheduled_date))} at ${escapeHtml(formatDisplayTime(match.scheduled_time, "TBD"))}</strong>: ${escapeHtml(match.home_team?.name || "Home")} vs ${escapeHtml(match.away_team?.name || "Away")} (${escapeHtml(match.divisions?.name || "No Division")}, score status: ${escapeHtml(scoreStatusLabel(match.score_status))})</li>`;
    }).join("")}</ul>`
    : "<p><em>Selected matches will appear here when reminders are sent.</em></p>";
  const firstMatch = matches[0] || {};

  return {
    home_team: firstMatch.home_team?.name || "Home",
    away_team: firstMatch.away_team?.name || "Away",
    match_date: firstMatch.scheduled_date ? formatEmailDate(firstMatch.scheduled_date) : "TBD",
    match_time: formatDisplayTime(firstMatch.scheduled_time, "TBD"),
    division: firstMatch.divisions?.name || "No Division",
    score_status: scoreStatusLabel(firstMatch.score_status),
    reminder_action: scoreReminderAction(firstMatch),
    matches: matchLines,
    match_count: String(matches.length),
    date: formatDate(localDateString()),
  };
}

function scoreReminderAction(match) {
  if (match?.score_status === "pending_verification") {
    return "Validate or dispute the submitted scores for this match.";
  }

  return "Enter the scores for this match.";
}

function scoreStatusLabel(value) {
  return String(value || "not_entered").replaceAll("_", " ");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMemberName(member) {
  return (
    `${member?.first_name || ""} ${member?.last_name || ""}`.trim() ||
    member?.email ||
    "Unnamed Member"
  );
}

function formatDate(value) {
  return formatDisplayDate(value, "TBD");
}

function formatEmailDate(value) {
  return formatDisplayDateWithWeekday(value, "TBD");
}

function localDateString() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const text = String(value ?? "");
          return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(",")
    )
    .join("\r\n");
}

function downloadCsv(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
