"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatDisplayDate, formatDisplayDateWithWeekday, formatDisplayTime, formatDisplayTimestampShort } from "../lib/dateTime";
import { splitNotificationRecipients } from "../lib/notificationPreferences";
import { EMAIL_TEMPLATE_KEYS, getEmailTemplateConfig, renderEmailTemplate } from "../lib/emailTemplates";

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

export default function ScoringPage() {
  const router = useRouter();

  const [matches, setMatches] = useState([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [matchSearch, setMatchSearch] = useState("");
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);
  const [emailSubject, setEmailSubject] = useState(SCORE_REMINDER_TEMPLATE.defaultSubject);
  const [emailTemplate, setEmailTemplate] = useState(SCORE_REMINDER_TEMPLATE.defaultBody);
  const [sending, setSending] = useState(false);
  const [lastSendResult, setLastSendResult] = useState("");
  const [today, setToday] = useState("");
  const [exportingScores, setExportingScores] = useState(false);
  const [includeAlreadyExported, setIncludeAlreadyExported] = useState(false);
  const [scoreMembersById, setScoreMembersById] = useState({});

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadTemplate = useCallback(async function loadTemplate() {
    const response = await fetch(`/api/notification-templates?template_key=${encodeURIComponent(TEMPLATE_KEY)}`);
    const result = await response.json().catch(() => null);
    const data = result?.template;

    if (data) {
      setEmailSubject(data.subject || SCORE_REMINDER_TEMPLATE.defaultSubject);
      setEmailTemplate(data.body || SCORE_REMINDER_TEMPLATE.defaultBody);
    }
  }, []);

  const loadMatches = useCallback(async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
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
      .lte("scheduled_date", localDateString())
      .order("scheduled_date", { ascending: false })
      .order("scheduled_time", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const sortedMatches = [...(data || [])].sort(compareScoringMatches);
    const scoreMemberIds = [
      ...sortedMatches.map((match) => match.score_entered_by_member_id),
      ...sortedMatches.map((match) => match.score_verified_by_member_id),
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

    setMatches(sortedMatches);
    setSelectedMatchIds(
      sortedMatches
        .filter((match) => match.score_status === "verified" && !match.score_exported_at)
        .map((match) => match.id)
    );
  }, []);

  useEffect(() => {
    async function run() {
      setToday(localDateString());
      const ok = await checkAuth();

      if (ok) {
        await Promise.all([loadMatches(), loadTemplate()]);
      }
    }

    run();
  }, [checkAuth, loadMatches, loadTemplate]);

  const searchableMatches = useMemo(() => {
    const q = matchSearch.trim().toLowerCase();

    if (!q) return matches;

    return matches.filter((match) => {
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
  }, [matchSearch, matches]);

  const visibleMatches = useMemo(() => {
    if (!showUnverifiedOnly) return searchableMatches;

    return searchableMatches.filter((match) => match.score_status !== "verified");
  }, [searchableMatches, showUnverifiedOnly]);

  const selectedMatches = useMemo(() => {
    const selected = new Set(selectedMatchIds);
    return matches.filter((match) => selected.has(match.id));
  }, [matches, selectedMatchIds]);

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

  function toggleUnverifiedFilter() {
    if (showUnverifiedOnly) {
      setShowUnverifiedOnly(false);
      return;
    }

    const unverifiedIds = searchableMatches
      .filter((match) => match.score_status !== "verified")
      .map((match) => match.id);

    setSelectedMatchIds(unverifiedIds);
    setShowUnverifiedOnly(true);
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
          headers: {
            "Content-Type": "application/json",
          },
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
    const exportMatches = selectedMatches.filter(
      (match) =>
        match.score_status === "verified" &&
        (includeAlreadyExported || !match.score_exported_at)
    );

    if (exportMatches.length === 0) {
      alert("Select one or more verified matches to export.");
      return;
    }

    setExportingScores(true);

    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
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

    if (csvRows.length === 0) {
      setExportingScores(false);
      alert("No completed line scores were found for the selected matches.");
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

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Scoring Operations"
          subtitle="Monitor overdue match scores and remind captains to enter or verify results."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard label="Due Matches" value={matches.length} />
          <SummaryCard label="Not Verified" value={matches.filter((match) => match.score_status !== "verified").length} />
          <SummaryCard label="Verified" value={matches.filter((match) => match.score_status === "verified").length} />
          <SummaryCard label="Selected" value={selectedMatchIds.length} />
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Matches On or Before Today</h2>
              <p className="mt-1 text-sm text-slate-600">
                Showing matches dated {today ? formatDate(today) : "today"} or earlier.
              </p>
              <div className="mt-1 text-sm text-slate-500">
                {visibleMatches.length} shown / {matches.length} total due matches
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
              <div className="w-full lg:min-w-[28rem]">
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Search / Filter
                </label>
                <input
                  value={matchSearch}
                  onChange={(event) => setMatchSearch(event.target.value)}
                  placeholder="Teams, division, date, location..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold"
                />
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Dates work as MM/DD/YYYY, M/D/YYYY, or YYYY-MM-DD.
                </div>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={toggleUnverifiedFilter}
                  className={`rounded-xl px-4 py-3 font-semibold ${
                    showUnverifiedOnly
                      ? "bg-blue-700 text-white hover:bg-blue-800"
                      : "bg-blue-100 text-blue-900 hover:bg-blue-200"
                  }`}
                >
                  {showUnverifiedOnly ? "Showing Not Verified" : "Filter Not Verified"}
                </button>

                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-900 hover:bg-slate-300"
                >
                  {allVisibleSelected ? "Clear Visible" : "Select Visible"}
                </button>

                <button
                  type="button"
                  onClick={sendReminders}
                  disabled={sending || selectedMatches.length === 0}
                  className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sending ? "Sending..." : "Send Email Reminder"}
                </button>

                <button
                  type="button"
                  onClick={exportForDupr}
                  disabled={exportingScores}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {exportingScores ? "Exporting..." : "DUPR Export"}
                </button>
              </div>
            </div>
          </div>

          <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={includeAlreadyExported}
              onChange={(e) => setIncludeAlreadyExported(e.target.checked)}
            />
            Include already exported verified matches for re-export override
          </label>

          {lastSendResult && (
            <div className="mb-4 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-900">
              {lastSendResult}
            </div>
          )}

          <div className="space-y-3">
            {visibleMatches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                selected={selectedMatchIds.includes(match.id)}
                membersById={scoreMembersById}
                onToggle={() => toggleMatch(match.id)}
                onOpen={() => router.push(`/matches/${match.id}?from=scoring`)}
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

function MatchRow({ match, selected, membersById, onToggle, onOpen }) {
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

        <button
          type="button"
          onClick={onOpen}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open Match
        </button>
      </div>
    </div>
  );
}

function compareScoringMatches(a, b) {
  const dateCompare = String(b.scheduled_date || "").localeCompare(String(a.scheduled_date || ""));
  if (dateCompare !== 0) return dateCompare;

  const timeCompare = String(a.scheduled_time || "").localeCompare(String(b.scheduled_time || ""));
  if (timeCompare !== 0) return timeCompare;

  const divisionCompare = (a.divisions?.name || "").localeCompare(b.divisions?.name || "");
  if (divisionCompare !== 0) return divisionCompare;

  return (a.home_team?.name || "").localeCompare(b.home_team?.name || "");
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
      verified ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"
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
