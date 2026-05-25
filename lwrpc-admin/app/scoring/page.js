"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatDisplayDate, formatDisplayTime, formatDisplayTimestampShort } from "../lib/dateTime";
import { splitNotificationRecipients } from "../lib/notificationPreferences";

const TEMPLATE_KEY = "score_reminder";
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

const DEFAULT_SUBJECT = "Score entry reminder";

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
  <img src="https://lwrpickleballclub.com/lwrpc-logo.png" alt="Lakewood Ranch Pickleball Club" style="width: 84px; height: 84px; object-fit: contain;" />
  <h2 style="margin: 16px 0 8px;">Score Entry Reminder</h2>
  <p>Captains,</p>
  <p>The following match score(s) are due for entry and verification:</p>
  <div>{{matches}}</div>
  <p>Please log into the <strong>LWRPC League Management System</strong> and enter or verify the scores as soon as possible.</p>
  <p>Thank you,<br /><strong>LWRPC League Management</strong></p>
</div>`;

export default function ScoringPage() {
  const router = useRouter();

  const [matches, setMatches] = useState([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [showUnverifiedOnly, setShowUnverifiedOnly] = useState(false);
  const [emailSubject, setEmailSubject] = useState(DEFAULT_SUBJECT);
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [lastSendResult, setLastSendResult] = useState("");
  const [today, setToday] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [exportingScores, setExportingScores] = useState(false);
  const [includeAlreadyExported, setIncludeAlreadyExported] = useState(false);
  const [scoreMembersById, setScoreMembersById] = useState({});

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadTemplate = useCallback(async function loadTemplate() {
    const localSubject = window.localStorage.getItem("lwrpc-score-reminder-subject");
    const localBody = window.localStorage.getItem("lwrpc-score-reminder-template");

    if (localSubject) setEmailSubject(localSubject);
    if (localBody) setEmailTemplate(localBody);

    const { data } = await supabase
      .from("notification_templates")
      .select("subject, body")
      .eq("template_key", TEMPLATE_KEY)
      .maybeSingle();

    if (data) {
      setEmailSubject(data.subject || DEFAULT_SUBJECT);
      setEmailTemplate(data.body || DEFAULT_TEMPLATE);
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

  const visibleMatches = useMemo(() => {
    if (!showUnverifiedOnly) return matches;

    return matches.filter((match) => match.score_status !== "verified");
  }, [matches, showUnverifiedOnly]);

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

  async function saveTemplate() {
    setSavingTemplate(true);
    window.localStorage.setItem("lwrpc-score-reminder-subject", emailSubject);
    window.localStorage.setItem("lwrpc-score-reminder-template", emailTemplate);

    const { error } = await supabase
      .from("notification_templates")
      .upsert({
        template_key: TEMPLATE_KEY,
        subject: emailSubject,
        body: emailTemplate,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "template_key",
      });

    setSavingTemplate(false);

    if (error) {
      alert("Template saved in this browser. Run the scoring schema SQL to save templates for all managers.");
      return;
    }

    alert("Email template saved.");
  }

  async function sendReminders() {
    if (selectedMatches.length === 0) {
      alert("Select one or more matches first.");
      return;
    }

    const { emails, phones } = splitNotificationRecipients(
      selectedMatches.flatMap((match) => captainContacts(match))
    );

    if (emails.length === 0 && phones.length === 0) {
      alert("No captain email addresses or text phone numbers were found for the selected matches based on member notification preferences.");
      return;
    }

    const ok = confirm(`Send score reminder to ${emails.length} email recipient${emails.length === 1 ? "" : "s"} and ${phones.length} text recipient${phones.length === 1 ? "" : "s"}?`);
    if (!ok) return;

    setSending(true);
    setLastSendResult("");

    const html = renderHtmlTemplate(emailTemplate, selectedMatches);
    const text = htmlToText(html);
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emails,
        phones,
        subject: emailSubject,
        text,
        html,
        smsBody: text,
      }),
    });

    const result = await response.json().catch(() => ({}));
    setSending(false);

    if (!response.ok || result.success === false) {
      alert(result.error || "Email send failed.");
      return;
    }

    setLastSendResult(`Reminder sent to ${emails.length} email recipient${emails.length === 1 ? "" : "s"} and ${phones.length} text recipient${phones.length === 1 ? "" : "s"}.`);
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
      alert("Score export requires the score_exported_at schema update. Run the updated Supabase SQL, then try again.");
      return;
    }

    const rows = (data || [])
      .map((match) => {
        const sourceMatch = exportMatches.find((item) => item.id === match.id) || match;
        return {
          ...sourceMatch,
          match_lines: match.match_lines || [],
        };
      })
      .sort(compareScoringMatches);

    if (rows.length === 0) {
      setExportingScores(false);
      alert("No verified scores were found for the selected matches.");
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
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Score Reminder Template</h2>
              <p className="mt-1 text-sm text-slate-600">
                HTML email body. Available placeholders: {"{{matches}}"}, {"{{match_count}}"}, {"{{date}}"}.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTemplateOpen((value) => !value)}
                className="rounded-xl bg-blue-100 px-5 py-3 font-semibold text-blue-900 hover:bg-blue-200"
              >
                {templateOpen ? "Close Template" : "Edit Template"}
              </button>

              {templateOpen && (
                <button
                  type="button"
                  onClick={saveTemplate}
                  disabled={savingTemplate}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingTemplate ? "Saving..." : "Save Template"}
                </button>
              )}
            </div>
          </div>

          {templateOpen && (
          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-4">
            <div>
              <FieldLabel label="Subject" />
              <input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <FieldLabel label="Email Body" />
              <textarea
                value={emailTemplate}
                onChange={(e) => setEmailTemplate(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-slate-500">
                You can use regular HTML for logo images, bold text, headings, links, colors, and basic layout styles.
              </p>
            </div>
            </div>

            <div>
              <FieldLabel label="Preview" />
              <div
                className="min-h-80 overflow-auto rounded-xl border border-slate-300 bg-white p-4"
                dangerouslySetInnerHTML={{ __html: renderHtmlTemplate(emailTemplate, []) }}
              />
            </div>
          </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Matches On or Before Today</h2>
              <p className="mt-1 text-sm text-slate-600">
                Showing matches dated {today ? formatDate(today) : "today"} or earlier.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowUnverifiedOnly((value) => !value)}
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
                {exportingScores ? "Exporting..." : "Export For DUPR"}
              </button>
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
                onOpen={() => router.push(`/matches/${match.id}`)}
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

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              <span>{formatDate(match.scheduled_date)} at {formatDisplayTime(match.scheduled_time, "TBD")}</span>
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
  const divisionCompare = (a.divisions?.name || "").localeCompare(b.divisions?.name || "");
  if (divisionCompare !== 0) return divisionCompare;

  const dateCompare = String(a.scheduled_date || "").localeCompare(String(b.scheduled_date || ""));
  if (dateCompare !== 0) return dateCompare;

  return (a.home_team?.name || "").localeCompare(b.home_team?.name || "");
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
        "SIDEOUT",
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
      {match.score_verified_at && (
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
    match.away_team?.captain,
    match.away_team?.co_captain_1,
    match.away_team?.co_captain_2,
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

function renderHtmlTemplate(template, matches) {
  const matchLines = matches.length > 0
    ? `<ul>${matches.map((match) => {
      return `<li><strong>${escapeHtml(formatDate(match.scheduled_date))}</strong>: ${escapeHtml(match.home_team?.name || "Home")} vs ${escapeHtml(match.away_team?.name || "Away")} (${escapeHtml(match.divisions?.name || "No Division")}, score status: ${escapeHtml(match.score_status || "not_entered")})</li>`;
    }).join("")}</ul>`
    : "<p><em>Selected matches will appear here when reminders are sent.</em></p>";

  return template
    .replaceAll("{{matches}}", matchLines)
    .replaceAll("{{match_count}}", String(matches.length))
    .replaceAll("{{date}}", formatDate(localDateString()));
}

function htmlToText(value) {
  return String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function FieldLabel({ label }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      {label}
    </label>
  );
}
