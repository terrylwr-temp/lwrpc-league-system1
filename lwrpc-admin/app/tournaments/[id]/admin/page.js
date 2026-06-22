"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  bracketByDivision,
  bracketMatchesById,
  bracketSingleGameScore,
  bracketStatusLabel,
  isBracketMatch,
  isEliminationTournament,
  isRoundRobinTop4Tournament,
  scoreDisplay,
  tournamentDivisionColors,
  tournamentFormat,
  tournamentFormatLabel,
  tournamentStandingLabel,
} from "../../../lib/tournaments";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../../../lib/systemSettings";
import { formatPhoneNumberForStorage, formatPhoneNumberInput } from "../../../lib/phone";

const TABS = ["Courts", "Queue", "Standings", "Teams", "Admin Setup", "SMS", "Log"];
const OPEN_STATUSES = new Set(["pending", "not_played"]);
const DEFAULT_SMS_TEMPLATES = {
  checkIn: "LWR PC Tournament Check-In\nHi {player}, please check in at the tournament desk for {team} in {division}.\n\n{tournament}",
  courtReady: "You're up! You are on Court {court}.\n\nPlease stop by the Desk to grab your basket and ball. Once you've finished your game, fill out the scoresheet and return the basket and ball.\nHave a great match!\n\n{division} {line}\n{home} vs {away}",
  returnToQueue: "Tournament update: your game is not ready to play yet. Please do not go to Court {court}. We will text you again when your game is ready.\n\n{division} {line}\n{home} vs {away}",
  result: "{tournament} Result\n{division} {line}\n\n{home} vs {away}\n{result}\n\nPlease let us know right away if anything is incorrect.",
  broadcast: "LWR PC Tournament Update\nWelcome to the {tournament}!\n{status}",
};
const STANDINGS_RULE_OPTIONS = [
  { value: "wins", label: "Wins" },
  { value: "point_differential", label: "Point Differential" },
  { value: "points_for", label: "Points For" },
  { value: "points_against", label: "Points Against" },
  { value: "losses", label: "Losses" },
  { value: "regular_season_standing", label: "Regular Season Standing" },
];
const DEFAULT_STANDINGS_RULES = ["wins", "point_differential", "points_for", "regular_season_standing"];
const TOURNAMENT_FORMAT_OPTIONS = [
  { value: "round_robin", label: "Round Robin" },
  { value: "round_robin_top4", label: "Round Robin + Top 4 Playoff" },
  { value: "single_elimination", label: "Single Elimination" },
  { value: "double_elimination", label: "Double Elimination" },
];

export default function TournamentAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const storageKey = `lwrpc-tournament-event-code-${id}`;
  const [eventCode, setEventCode] = useState("");
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("Courts");
  const [selectedPendingId, setSelectedPendingId] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [resultMatch, setResultMatch] = useState(null);
  const [autoAssignSummary, setAutoAssignSummary] = useState(null);
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);

  useEffect(() => {
    const cachedCode = window.sessionStorage.getItem(storageKey) || "";
    if (cachedCode) {
      setEventCode(cachedCode);
      unlock(cachedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/system-settings");
        const result = await response.json().catch(() => ({}));
        if (isMounted && result.success) {
          setSystemSettings(mergeSystemSettings(result.settings));
        }
      } catch {
        if (isMounted) setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      }
    }

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;

    const timeout = window.setTimeout(() => {
      setNotice("");
    }, 30000);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function unlock(code = eventCode) {
    const cleanCode = String(code || "").trim();

    if (!cleanCode) {
      setError("Enter the event code.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/tournaments/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId: id, eventCode: cleanCode }),
    });
    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok || !result.success) {
      window.sessionStorage.removeItem(storageKey);
      setState(null);
      setError(result.error || "Unable to unlock tournament admin.");
      return;
    }

    window.sessionStorage.setItem(storageKey, cleanCode);
    setEventCode(cleanCode);
    setState(result);
  }

  async function runAction(action, payload = {}, options = {}) {
    const cleanCode = String(eventCode || window.sessionStorage.getItem(storageKey) || "").trim();
    setActionLoading(action);
    setError("");
    setNotice("");

    const response = await fetch("/api/tournaments/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tournamentId: id,
        eventCode: cleanCode,
        action,
        ...payload,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setActionLoading("");

    if (!response.ok || !result.success) {
      setError(result.error || "Unable to complete tournament action.");
      return options.returnResult ? { success: false, error: result.error || "Unable to complete tournament action." } : false;
    }

    const replacementEventCode = action === "updateTournamentSettings" ? String(payload.adminCode || "").trim() : "";
    const refreshCode = replacementEventCode || cleanCode;
    if (replacementEventCode) {
      window.sessionStorage.setItem(storageKey, replacementEventCode);
      setEventCode(replacementEventCode);
    }

    if (!options.skipRefresh) {
      await unlock(refreshCode);
    }
    if (action === "autoAssign") setNotice(`Assigned ${result.assigned || 0} open court${Number(result.assigned || 0) === 1 ? "" : "s"}. Court texts sent: ${result.sms?.sent || 0}.`);
    if (action === "returnToQueue") setNotice(`Match returned to the queue. Return texts sent: ${result.sms?.sent || 0}.`);
    if (action === "swapToCourt") setNotice(`Queued match moved to the selected court. Court texts sent: ${result.sms?.sent || 0}.`);
    if (action === "completeMatch") setNotice(`Result saved and court opened. Result texts sent: ${result.sms?.sent || 0}.`);
    if (action === "sendCourtText") setNotice(`Court text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`);
    if (action === "syncLeagueDivisions") setNotice(`Synced ${result.synced || 0} main-system division${Number(result.synced || 0) === 1 ? "" : "s"}.`);
    if (action === "updateDivisionStatus") setNotice("Division status updated.");
    if (action === "deleteDivision") setNotice("Tournament division deleted.");
    if (action === "updateTournamentSettings") setNotice("Tournament settings saved.");
    if (action === "updateTournamentTeam") setNotice(options.notice || "Tournament team saved.");
    if (action === "createTournamentTeam") setNotice("Tournament team added.");
    if (action === "deleteTournamentTeam") setNotice("Tournament team deleted.");
    if (action === "saveCourts") setNotice(`Saved ${result.courts || 0} court${Number(result.courts || 0) === 1 ? "" : "s"}.`);
    if (action === "resetMatches") setNotice("Tournament matches, standings, and activity log reset.");
    if (action === "resetTournamentSystem") setNotice(`Tournament system reset. Deleted ${result.deleted?.matches || 0} match${Number(result.deleted?.matches || 0) === 1 ? "" : "es"}, ${result.deleted?.teams || 0} team${Number(result.deleted?.teams || 0) === 1 ? "" : "s"}, ${result.deleted?.divisions || 0} division${Number(result.deleted?.divisions || 0) === 1 ? "" : "s"}, and ${result.deleted?.logs || 0} log entr${Number(result.deleted?.logs || 0) === 1 ? "y" : "ies"}.`);
    if (action === "clearLog") setNotice("Activity log cleared.");
    if (action === "startTournament") setNotice("Tournament started and wait times reset.");
    if (action === "generateRoundRobin") setNotice(`Generated ${result.generated || 0} round robin match${Number(result.generated || 0) === 1 ? "" : "es"}.`);
    if (action === "generateEliminationBracket") setNotice(`Generated ${result.generated || 0} ${tournamentFormatLabel({ format: result.format })} bracket match${Number(result.generated || 0) === 1 ? "" : "es"}.`);
    if (action === "generateTop4Playoff") setNotice(`Generated ${result.generated || 0} top 4 playoff match${Number(result.generated || 0) === 1 ? "" : "es"}.`);
    if (action === "updateSmsTemplates") setNotice("SMS templates saved.");
    if (action === "sendBroadcastText") setNotice(`Broadcast text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`);
    if (action === "sendTestText") setNotice(`Test text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`);
    if (action === "sendCheckInText") setNotice(`Check-In text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`);
    if (action === "updatePlayerPhone") setNotice(`Phone number updated for ${result.playerName || "player"}.`);
    return options.returnResult ? result : true;
  }

  function exitToLms() {
    if (!window.confirm("Exit the tournament Main System and return to the LMS Admin Dashboard?")) return;

    window.sessionStorage.removeItem(storageKey);
    setState(null);
    setEventCode("");
    setNotice("");
    setError("");
    router.push("/");
  }

  if (!state) {
    const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
    const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;

    return (
      <main className="full-screen-main flex min-h-screen items-center justify-center bg-[#07111f] p-4 sm:p-6">
        <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-blue-200/20 bg-slate-950 text-white shadow-2xl">
          <div className="border-b border-blue-300/20 bg-blue-950/70 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-lg">
                <Image
                  src={logoUrl}
                  alt={`${clubName} logo`}
                  width={72}
                  height={72}
                  className="h-full w-full object-contain"
                  unoptimized
                />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wide text-cyan-200">{clubName}</div>
                <h1 className="mt-1 text-2xl font-black">Tournament Main System</h1>
              </div>
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-xl font-black">Enter Event Code</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-blue-100">
              Public display, standings, and player views do not require this code. Tournament setup and operations do.
            </p>

            <input
              type="password"
              suppressHydrationWarning
              autoComplete="one-time-code"
              value={eventCode}
              onChange={(event) => {
                setEventCode(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") unlock();
              }}
              className="mt-5 w-full rounded-2xl border border-blue-300/30 bg-slate-900 px-4 py-4 text-center text-2xl font-black tracking-[0.4em] text-white outline-none ring-cyan-400/40 focus:ring-4"
              placeholder="Code"
            />

            {error && <div className="mt-3 rounded-xl bg-red-950/70 p-3 text-sm font-bold text-red-100">{error}</div>}

            <button
              type="button"
              onClick={() => unlock()}
              disabled={loading || !eventCode.trim()}
              className="mt-4 w-full rounded-2xl bg-cyan-500 px-5 py-4 font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
            >
              {loading ? "Unlocking..." : "Unlock Main System"}
            </button>

            <Link className="mt-4 block text-center text-sm font-bold text-cyan-200 hover:text-white" href={`/tourney/${id}/display`}>
              Back to public display
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const tournamentKey = state.tournament.slug || id;

  return (
    <main className="full-screen-main min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto w-full max-w-[1800px] p-2 sm:p-4 xl:p-5">
        <DirectorHeader
          state={state}
          systemSettings={systemSettings}
          smsEnabled={smsEnabled}
          exitToLms={exitToLms}
          tournamentKey={tournamentKey}
        />

        <div className="sticky top-0 z-30 -mx-2 mt-3 flex gap-1 overflow-x-auto border-y border-blue-300/20 bg-[#07111f]/95 px-2 py-1.5 shadow-xl backdrop-blur sm:mx-0 sm:mt-4 sm:flex-wrap sm:overflow-visible sm:rounded-2xl sm:border sm:p-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-black shadow-sm transition sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === tab
                  ? "border-cyan-300 bg-cyan-500 text-white"
                  : "border-blue-400/40 bg-blue-950/70 text-white hover:bg-blue-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {(error || notice) && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            error ? "border-red-300 bg-red-950/60 text-red-100" : "border-emerald-300 bg-emerald-950/60 text-emerald-100"
          }`}>
            {error || notice}
          </div>
        )}

        {activeTab === "Courts" && (
          <CourtsTab
            state={state}
            actionLoading={actionLoading}
            selectedPendingId={selectedPendingId}
            setSelectedPendingId={setSelectedPendingId}
            runAction={runAction}
            setResultMatch={setResultMatch}
            setAutoAssignSummary={setAutoAssignSummary}
            smsEnabled={smsEnabled}
          />
        )}
        {activeTab === "Queue" && <QueueTab state={state} setSelectedPendingId={setSelectedPendingId} setActiveTab={setActiveTab} />}
        {activeTab === "Standings" && (
          <StandingsTab
            state={state}
            runAction={runAction}
            setResultMatch={setResultMatch}
            actionLoading={actionLoading}
            smsEnabled={smsEnabled}
          />
        )}
        {activeTab === "Teams" && <TeamsTab state={state} setState={setState} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "Admin Setup" && <AdminSetupTab state={state} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "SMS" && (
          <SmsTab
            state={state}
            smsEnabled={smsEnabled}
            setSmsEnabled={setSmsEnabled}
            runAction={runAction}
            actionLoading={actionLoading}
          />
        )}
        {activeTab === "Log" && <LogTab state={state} runAction={runAction} actionLoading={actionLoading} />}
      </div>

      {resultMatch && (
        <ResultModal
          match={resultMatch}
          matches={state.matches}
          smsEnabled={smsEnabled}
          settings={state.tournament.settings}
          onClose={() => setResultMatch(null)}
          onSave={async (payload) => {
            const saved = await runAction("completeMatch", payload);
            if (saved) setResultMatch(null);
          }}
          saving={actionLoading === "completeMatch"}
        />
      )}

      {autoAssignSummary && (
        <AutoAssignSummaryModal
          summary={autoAssignSummary}
          onClose={() => setAutoAssignSummary(null)}
        />
      )}
    </main>
  );
}

function DirectorHeader({ state, systemSettings, smsEnabled, exitToLms, tournamentKey }) {
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;

  return (
    <header className="rounded-2xl border border-blue-300/20 bg-slate-900/90 p-4 shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={logoUrl}
            alt={`${clubName} logo`}
            width={48}
            height={48}
            unoptimized
            className="size-12 shrink-0 rounded-full bg-white object-contain p-1"
          />
          <div>
            <h1 className="text-2xl font-black leading-tight text-white">{state.tournament.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-black text-blue-200">
              <span>Tournament Director Dashboard</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-4 py-2 text-sm font-black ${smsEnabled ? "bg-emerald-700 text-white" : "bg-rose-950 text-rose-100"}`}
          >
            SMS {smsEnabled ? "ON" : "OFF"}
          </span>
          <Link className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-2 text-sm font-black text-white hover:bg-blue-900" href={`/tourney/${tournamentKey}/display`}>
            Public Display
          </Link>
          <button type="button" onClick={exitToLms} className="rounded-xl border border-blue-400/50 bg-blue-950 px-4 py-2 text-sm font-black text-white hover:bg-blue-900">
            Exit to LMS
          </button>
        </div>
      </div>
    </header>
  );
}

function CourtsTab({ state, actionLoading, selectedPendingId, setSelectedPendingId, runAction, setResultMatch, setAutoAssignSummary, smsEnabled }) {
  const bracketDetails = useMemo(() => bracketMatchesById(state.matches, state.teams, state.divisions, state.tournament.settings), [state.divisions, state.matches, state.teams, state.tournament.settings]);
  const matches = useMemo(() => applyBracketMatchDetails(state.matches, bracketDetails), [bracketDetails, state.matches]);
  const busyTeamIds = useMemo(() => busyTeams(matches), [matches]);
  const pendingMatches = useMemo(() => availablePendingMatches(matches, busyTeamIds), [busyTeamIds, matches]);
  const playingByCourt = useMemo(() => matchesByCourt(matches), [matches]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (selectedPendingId && !pendingMatches.some((match) => String(match.id) === String(selectedPendingId))) {
      setSelectedPendingId("");
    }
  }, [pendingMatches, selectedPendingId, setSelectedPendingId]);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  async function handleAutoAssign() {
    const result = await runAction("autoAssign", { smsEnabled }, { returnResult: true });
    if (result?.success) {
      setAutoAssignSummary({
        assigned: result.assigned || 0,
        assignments: result.assignments || [],
      });
    }
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-blue-300/20 bg-slate-950/70 p-5 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black">Court Dashboard</h2>
          <button
            type="button"
            onClick={handleAutoAssign}
            disabled={actionLoading === "autoAssign"}
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-black text-white shadow hover:from-cyan-400 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "autoAssign" ? "Assigning..." : "Auto Assign Open Courts"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <label className="text-sm font-black text-blue-200" htmlFor="queued-match-select">
          Queued match to swap/override onto a court
        </label>
        <select
          id="queued-match-select"
          value={selectedPendingId}
          onChange={(event) => setSelectedPendingId(event.target.value)}
          className="mt-2 w-full rounded-xl border border-blue-300/40 bg-slate-950 px-4 py-3 text-white"
        >
          <option value="">Select queued match...</option>
          {pendingMatches.map((match) => (
            <option key={match.id} value={match.id}>
              {matchSummary(match)}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm font-semibold text-blue-200">
          Only queued matches with both teams available are shown. Choose one, then use Swap Selected Here on the desired court.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {state.courts.map((court) => (
          <CourtCard
            key={court.id}
            court={court}
            match={playingByCourt[String(court.id)]}
            selectedPendingId={selectedPendingId}
            actionLoading={actionLoading}
            runAction={runAction}
            setResultMatch={setResultMatch}
            smsEnabled={smsEnabled}
            now={now}
          />
        ))}
      </div>
    </section>
  );
}

function AutoAssignSummaryModal({ summary, onClose }) {
  const assignments = summary.assignments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-blue-300/30 bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">Auto Assign Summary</h2>
            <p className="mt-2 text-sm font-semibold text-blue-100">
              Assigned {summary.assigned || 0} open court{Number(summary.assigned || 0) === 1 ? "" : "s"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
          >
            Close
          </button>
        </div>

        {assignments.length > 0 ? (
          <div className="mt-5 overflow-x-auto rounded-xl border border-blue-300/20">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-blue-950/80 text-xs uppercase tracking-wide text-blue-100">
                <tr>
                  <th className="px-4 py-3">Court #</th>
                  <th className="px-4 py-3">Home Team</th>
                  <th className="px-4 py-3">Away Team</th>
                  <th className="px-4 py-3">Division</th>
                  <th className="px-4 py-3">Line</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment, index) => (
                  <tr key={`${assignment.court}-${assignment.homeTeam}-${assignment.awayTeam}-${index}`} className="border-t border-blue-300/10">
                    <td className="px-4 py-3 font-black text-cyan-100">{assignment.court || "-"}</td>
                    <td className="px-4 py-3 font-semibold">{assignment.homeTeam || "Home"}</td>
                    <td className="px-4 py-3 font-semibold">{assignment.awayTeam || "Away"}</td>
                    <td className="px-4 py-3 text-blue-100">{assignment.division || "Division"}</td>
                    <td className="px-4 py-3 text-blue-100">{assignment.lineLabel || `Line ${assignment.line || 1}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-blue-300/20 bg-blue-950/70 p-4 text-sm font-bold text-blue-100">
            No open courts were assigned.
          </div>
        )}
      </div>
    </div>
  );
}

function CourtCard({ court, match, selectedPendingId, actionLoading, runAction, setResultMatch, smsEnabled, now }) {
  const colors = match ? tournamentDivisionColors(match.division?.name) : null;
  const busy = Boolean(actionLoading);

  return (
    <article className={`min-h-[310px] rounded-2xl border border-blue-300/20 border-l-4 ${colors ? `${colors.border} ${colors.panel}` : "border-l-slate-500 bg-slate-950/70"} p-5 shadow-lg`}>
      <div className="text-2xl font-black">Court {court.name}</div>

      {match ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className={`rounded-full px-3 py-1 ${colors.badge}`}>{match.division?.name || "Division"}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1 text-blue-100">{matchLineLabel(match)}</span>
          </div>
          <div className="mt-4 text-xl font-black leading-7">
            <div>{bracketTeamDisplayName(match, "home")}</div>
            <div className={`text-sm ${colors.accent}`}>vs</div>
            <div>{bracketTeamDisplayName(match, "away")}</div>
          </div>
          <div className="mt-3 text-sm font-semibold text-blue-100">
            Assigned: {formatTime(match.assigned_at)} <span className="text-blue-300">|</span> Play Time: {playTime(match.assigned_at, now)}
          </div>
          <div className="mt-5 flex flex-col gap-2">
            <button type="button" onClick={() => setResultMatch(match)} className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400">
              Enter Result / Score
            </button>
            <button
              type="button"
              onClick={() => runAction("sendCourtText", { matchId: match.id })}
              disabled={!smsEnabled || busy}
              className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
            >
              Send Court Text
            </button>
            <button
              type="button"
              onClick={() => runAction("returnToQueue", { matchId: match.id, smsEnabled })}
              disabled={busy}
              className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Return to Queue
            </button>
            {selectedPendingId && (
              <button
                type="button"
                onClick={() => runAction("swapToCourt", { matchId: selectedPendingId, courtId: court.id, smsEnabled })}
                disabled={busy}
                className="rounded-xl border border-emerald-300/60 bg-emerald-800 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Swap Selected Here
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-cyan-300/40 bg-slate-950/50 p-5 text-center">
          <div className="text-xl font-black text-cyan-100">Open Court</div>
          <div className="mt-2 text-sm font-semibold text-blue-200">Ready for the next queued match.</div>
          {selectedPendingId && (
            <button
              type="button"
              onClick={() => runAction("swapToCourt", { matchId: selectedPendingId, courtId: court.id, smsEnabled })}
              disabled={busy}
              className="mt-5 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Swap Selected Here
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function QueueTab({ state, setSelectedPendingId, setActiveTab }) {
  const bracketDetails = useMemo(() => bracketMatchesById(state.matches, state.teams, state.divisions, state.tournament.settings), [state.divisions, state.matches, state.teams, state.tournament.settings]);
  const matches = useMemo(() => applyBracketMatchDetails(state.matches, bracketDetails), [bracketDetails, state.matches]);
  const busyTeamIds = useMemo(() => busyTeams(matches), [matches]);
  const pendingMatches = useMemo(() => sortedPendingMatches(matches), [matches]);
  const queueStatus = useMemo(() => tournamentQueueStatus(matches, state.courts), [matches, state.courts]);
  const insights = useMemo(() => schedulingInsights(matches, state.courts), [matches, state.courts]);
  const queueRows = useMemo(() => matchQueueMetrics(pendingMatches, matches, busyTeamIds), [busyTeamIds, pendingMatches, matches]);

  return (
    <section className="mt-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black">Tournament Status Dashboard</h2>
        <span className="rounded-full bg-amber-400/25 px-4 py-2 text-sm font-black text-amber-100">{queueStatus.remaining} remaining</span>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatusMetric label="Total Matches" value={queueStatus.total} />
          <StatusMetric label="Completed" value={queueStatus.completed} />
          <StatusMetric label="On Court" value={queueStatus.onCourt} />
          <StatusMetric label="In Queue" value={queueStatus.inQueue} />
          <StatusMetric label="Ready Now" value={queueStatus.readyNow} />
          <StatusMetric label="Blocked" value={queueStatus.blocked} />
        </div>
        <div className="mt-4 text-sm font-semibold text-blue-100">Tournament Completion: {queueStatus.completionPercent}%</div>
        <div className="mt-2 h-5 overflow-hidden rounded-full border border-blue-300/20 bg-slate-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
            style={{ width: `${queueStatus.completionPercent}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-950/40 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black">AI Scheduling Insights</h2>
          <span className="w-fit rounded-full bg-amber-400/25 px-4 py-2 text-sm font-black text-amber-100">
            Estimated Finish: {insights.finishTime} | Avg Game Length: {formatDurationMinutes(insights.averageMatchMinutes)}
          </span>
        </div>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Based on current completed match pace, average match length is about {insights.averageMatchMinutes} minutes. Queue priority favors division and line groups with lower completion progress, available teams, and stronger rest balance.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {insights.groups.map((group) => {
            const colors = tournamentDivisionColors(group.name);

            return (
            <div key={group.name} className={`rounded-xl border border-blue-300/20 border-l-4 ${colors.border} ${colors.panel} p-4`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">{group.name}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${colors.badge}`}>{group.pending} pending</span>
              </div>
              <div className="mt-4 text-3xl font-black">{group.completionPercent}%</div>
              <div className="text-sm font-semibold text-blue-100">{group.heat}</div>
              <div className={`mt-1 text-sm font-semibold ${colors.accent}`}>Progress: {group.progressPercent}% - Avg Rest: {group.averageRestMinutes} min</div>
            </div>
            );
          })}
          {insights.groups.length === 0 && <div className="text-sm font-semibold text-blue-100">Scheduling insights will appear once matches are loaded.</div>}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black">Match Queue</h2>
        <div className="mt-4 space-y-3">
          {queueRows.map((row, index) => {
            const match = row.match;
            const colors = tournamentDivisionColors(match.division?.name);
            return (
              <div
                key={match.id}
                className={`rounded-2xl border border-l-4 ${colors.border} ${colors.panel} p-4 ${
                  index === 0 && !row.blocked ? "border-amber-300" : "border-blue-300/20"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  {index === 0 && !row.blocked && <span className="rounded-full bg-amber-400/25 px-3 py-1 text-amber-100">Likely Next</span>}
                  <span className={`rounded-full px-3 py-1 ${colors.badge}`}>{match.division?.name || "Division"}</span>
                  <span className="rounded-full bg-blue-400/20 px-3 py-1 text-blue-100">{matchLineLabel(match)}</span>
                  <span className={`rounded-full px-3 py-1 ${row.blocked ? "bg-rose-400/20 text-rose-100" : "bg-emerald-400/20 text-emerald-100"}`}>
                    {row.blocked ? "Blocked" : "Ready"}
                  </span>
                </div>
                <div className="mt-4 text-lg font-black">{bracketTeamDisplayName(match, "home")} vs {bracketTeamDisplayName(match, "away")}</div>
                <div className={`mt-3 text-sm font-semibold ${colors.accent}`}>
                  Wait: {row.waitMinutes} min - Rest: {row.restMinutes} min - Group progress: {row.groupProgress}% - Avg group rest: {row.averageGroupRestMinutes} min - {row.blocked ? "Team on court" : "Ready"}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPendingId(match.id);
                    setActiveTab("Courts");
                  }}
                  className="mt-4 rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
                >
                  Select for Court Swap
                </button>
              </div>
            );
          })}
          {queueRows.length === 0 && <div className="rounded-xl border border-blue-300/20 bg-blue-950/70 p-4 text-sm font-semibold text-blue-100">No matches are currently queued.</div>}
        </div>
      </div>
    </section>
  );
}

function StatusMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-blue-300/10 bg-white/5 p-4">
      <div className="text-3xl font-black text-white">{value}</div>
      <div className="text-sm font-semibold text-blue-200">{label}</div>
    </div>
  );
}

function StandingsTab({ state, runAction, setResultMatch, actionLoading, smsEnabled }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const isElimination = isEliminationTournament(state.tournament.settings);
  const isTop4 = isRoundRobinTop4Tournament(state.tournament.settings);
  const standings = useMemo(() => groupedDivisionStandings(state.matches, state.teams, state.divisions, state.tournament.settings), [state.divisions, state.matches, state.teams, state.tournament.settings]);
  const divisions = Object.entries(standings);

  if (isElimination) {
    return (
      <BracketStandingsTab
        state={state}
        runAction={runAction}
        setResultMatch={setResultMatch}
        actionLoading={actionLoading}
        smsEnabled={smsEnabled}
      />
    );
  }

  return (
    <section className="mt-5 space-y-4">
      <div>
        <h2 className="text-2xl font-black">Division Standings</h2>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Standings are grouped by team name within each division, even when that team has multiple line entries.
        </p>
      </div>

      {divisions.map(([division, rows]) => {
        const colors = tournamentDivisionColors(division);

        return (
        <div key={division} className={`rounded-2xl border border-blue-300/20 border-l-4 ${colors.border} ${colors.panel} p-4`}>
          <h3 className="text-xl font-black">{division}</h3>
          <div className="mt-4 overflow-x-auto rounded-xl bg-slate-950/35">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-blue-900/60 text-xs text-blue-100">
                <tr>
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Team</th>
                  <th className="px-3 py-3 text-center">W</th>
                  <th className="px-3 py-3 text-center">L</th>
                  <th className="px-3 py-3 text-center">PF</th>
                  <th className="px-3 py-3 text-center">PA</th>
                  <th className="px-3 py-3 text-center">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key} className="border-t border-blue-300/10">
                    <td className="px-3 py-4 font-black">{index + 1}</td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedTeam({ ...row, division })}
                        className="rounded-xl border border-blue-300/30 bg-blue-900/70 px-4 py-3 text-left font-black text-white hover:bg-blue-800"
                      >
                        {teamStandingLabel(row)}
                      </button>
                    </td>
                    <td className="px-3 py-4 text-center font-black">{row.w}</td>
                    <td className="px-3 py-4 text-center font-black">{row.l}</td>
                    <td className="px-3 py-4 text-center font-black">{row.pf}</td>
                    <td className="px-3 py-4 text-center font-black">{row.pa}</td>
                    <td className="px-3 py-4 text-center font-black">{row.pf - row.pa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        );
      })}
      {divisions.length === 0 && <EmptyPanel title="Standings" message="No completed matches are available for standings yet." />}
      {isTop4 && (
        <Top4PlayoffBracket
          state={state}
          runAction={runAction}
          setResultMatch={setResultMatch}
          actionLoading={actionLoading}
          smsEnabled={smsEnabled}
        />
      )}
      {selectedTeam && (
        <StandingTeamModal
          team={selectedTeam}
          matches={matchesForStandingTeam(state.matches, selectedTeam)}
          onClose={() => setSelectedTeam(null)}
          setResultMatch={setResultMatch}
          runAction={runAction}
          actionLoading={actionLoading}
          smsEnabled={smsEnabled}
        />
      )}
    </section>
  );
}

function Top4PlayoffBracket({ state, runAction, setResultMatch, actionLoading, smsEnabled }) {
  const bracketDivisions = useMemo(
    () => bracketByDivision(state.matches, state.teams, state.divisions, state.tournament.settings),
    [state.divisions, state.matches, state.teams, state.tournament.settings]
  );

  return (
    <section className="mt-5 space-y-4">
      <div>
        <h2 className="text-2xl font-black">Top 4 Playoff</h2>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Generate this after the round robin is complete. Seeds are 1 vs 4 and 2 vs 3, with winners advancing to the final.
        </p>
      </div>
      {bracketDivisions.length > 0 ? (
        <BracketDivisionList
          bracketDivisions={bracketDivisions}
          runAction={runAction}
          setResultMatch={setResultMatch}
          actionLoading={actionLoading}
          smsEnabled={smsEnabled}
        />
      ) : (
        <EmptyPanel title="Top 4 Playoff" message="Generate the Top 4 Playoff from Admin Setup after all round robin matches are complete." />
      )}
    </section>
  );
}

function BracketStandingsTab({ state, runAction, setResultMatch, actionLoading, smsEnabled }) {
  const bracketDivisions = useMemo(
    () => bracketByDivision(state.matches, state.teams, state.divisions, state.tournament.settings),
    [state.divisions, state.matches, state.teams, state.tournament.settings]
  );

  return (
    <section className="mt-5 space-y-4">
      <div>
        <h2 className="text-2xl font-black">{tournamentFormatLabel(state.tournament.settings)} Bracket</h2>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Brackets are grouped by division and update as results are entered.
        </p>
      </div>

      <BracketDivisionList
        bracketDivisions={bracketDivisions}
        runAction={runAction}
        setResultMatch={setResultMatch}
        actionLoading={actionLoading}
        smsEnabled={smsEnabled}
      />

      {bracketDivisions.length === 0 && <EmptyPanel title="Bracket" message="Generate an elimination bracket from Admin Setup to show standings here." />}
    </section>
  );
}

function BracketDivisionList({ bracketDivisions, runAction, setResultMatch, actionLoading, smsEnabled }) {
  return (
    <>
      {bracketDivisions.map((divisionGroup) => {
        const colors = tournamentDivisionColors(divisionGroup.division.name);

        return (
          <details key={divisionGroup.division.id} className={`rounded-2xl border border-blue-300/20 border-l-4 ${colors.border} ${colors.panel} p-4`}>
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-black">{divisionGroup.division.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-blue-100">Open to view this division bracket.</p>
                </div>
                {divisionGroup.champion && (
                  <span className="w-fit rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-slate-950">
                    Champion: {divisionGroup.champion.name}
                  </span>
                )}
                {!divisionGroup.champion && <span className="w-fit rounded-full bg-blue-400/20 px-4 py-2 text-sm font-black text-blue-100">Collapsed</span>}
              </div>
            </summary>
            <BracketSections
              sections={divisionGroup.sections}
              colors={colors}
              runAction={runAction}
              setResultMatch={setResultMatch}
              actionLoading={actionLoading}
              smsEnabled={smsEnabled}
            />
          </details>
        );
      })}
    </>
  );
}

function BracketSections({ sections, colors, runAction, setResultMatch, actionLoading, smsEnabled }) {
  return (
    <div className="mt-5 space-y-5">
      {sections.map((section) => (
        <div key={section.key} className="rounded-2xl border border-blue-300/15 bg-slate-950/35 p-4">
          <h4 className="text-lg font-black">{section.title}</h4>
          <div className="mt-4 flex min-w-max gap-10 overflow-x-auto pb-4">
            {section.rounds.map((round, roundIndex) => (
              <div key={round.key} className="w-72 shrink-0">
                <div className={`rounded-full px-3 py-2 text-center text-xs font-black ${colors.badge}`}>{round.title}</div>
                <div className="mt-5 space-y-6">
                  {round.matches.map((match, matchIndex) => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      isLastRound={roundIndex === section.rounds.length - 1}
                      offsetLevel={roundIndex}
                      matchIndex={matchIndex}
                      setResultMatch={setResultMatch}
                      runAction={runAction}
                      actionLoading={actionLoading}
                      smsEnabled={smsEnabled}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BracketMatchCard({ match, offsetLevel, matchIndex, setResultMatch, runAction, actionLoading, smsEnabled }) {
  const ready = Boolean(match.home_team_id && match.away_team_id);
  const score = scoreDisplay(match);
  const statusLabel = bracketStatusLabel(match);
  const homeScore = bracketSingleGameScore(match, "home");
  const awayScore = bracketSingleGameScore(match, "away");
  const showScoreFooter = statusLabel !== "bye" && score && homeScore === "" && awayScore === "";
  const topOffset = matchIndex === 0 ? 0 : Math.min(72, Number(offsetLevel || 0) * 18);

  return (
    <div className="relative" style={{ marginTop: `${topOffset}px` }}>
      <div className="relative rounded-sm border border-blue-100/65 bg-slate-950/70 p-3 shadow-lg">
        <div className="absolute -left-3 -top-3 flex size-8 items-center justify-center rounded-full border border-blue-100/70 bg-slate-950 text-xs font-black text-white shadow">
          #{match.bracketMatchNumber || match.bracketMeta?.match || ""}
        </div>
        <div className="mb-2 flex items-center justify-end gap-2 text-xs font-black text-blue-200">
          <span className="uppercase">{statusLabel}</span>
        </div>
        <BracketTeamLine
          name={match.home_team?.name || "TBD"}
          sourceLabel={match.homeSourceLabel}
          score={homeScore}
          eliminated={Boolean(match.homeEliminated)}
          winner={String(match.winner_team_id || "") === String(match.home_team_id || "")}
        />
        <BracketTeamLine
          name={match.away_team?.name || "TBD"}
          sourceLabel={match.awaySourceLabel}
          score={awayScore}
          eliminated={Boolean(match.awayEliminated)}
          winner={String(match.winner_team_id || "") === String(match.away_team_id || "")}
        />
        {showScoreFooter && <div className="mt-2 rounded-sm bg-slate-950/60 px-3 py-2 text-xs font-black text-blue-100">{score}</div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!ready}
            onClick={() => setResultMatch(match)}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit Result
          </button>
          {ready && match.status === "done" && (
            <button
              type="button"
              disabled={actionLoading === "returnToQueue"}
              onClick={() => runAction("returnToQueue", { matchId: match.id, smsEnabled })}
              className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BracketTeamLine({ name, sourceLabel = "", score = "", winner, eliminated = false }) {
  return (
    <div className={`mt-1 flex min-h-11 items-center justify-between rounded-sm border px-3 py-2 text-sm font-black ${
      winner ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-100" : "border-blue-100/45 bg-slate-950/45 text-white"
    }`}>
      <span className="min-w-0 flex-1 break-words pr-3">{sourceLabel ? `(${sourceLabel}) ` : ""}{name}</span>
      <span className="ml-2 flex w-16 shrink-0 items-center justify-end gap-1">
        {winner && <span className="rounded-full bg-emerald-400 px-2 py-1 text-[11px] font-black text-slate-950">W</span>}
        {eliminated && <span className="rounded-full bg-rose-500 px-2 py-1 text-[11px] font-black text-white">D</span>}
        {score !== "" && <span className="min-w-8 rounded-full bg-white/15 px-2 py-1 text-center text-xs text-white">{score}</span>}
      </span>
    </div>
  );
}

function StandingTeamModal({ team, matches, onClose, setResultMatch, runAction, actionLoading, smsEnabled }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
      <div className="mx-auto min-h-[85vh] max-w-6xl rounded-3xl border border-blue-300/20 bg-blue-950 p-5 text-white shadow-2xl">
        <div className="rounded-2xl bg-slate-950/55 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-3xl font-black">{team.team}</h2>
              <p className="mt-3 text-sm font-semibold text-blue-200">{team.division} Match Detail</p>
            </div>
            <button type="button" onClick={onClose} className="w-fit rounded-xl border border-blue-300/40 bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
              Close
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl bg-slate-950/30">
          <table className="min-w-[880px] w-full text-left text-sm">
            <thead className="bg-blue-900/70 text-blue-100">
              <tr>
                <th className="px-3 py-3">Line</th>
                <th className="px-3 py-3">Match</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Result</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Court</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-t border-blue-300/10 align-top">
                  <td className="px-3 py-4 font-semibold">Line<br />{match.line_number || 1}</td>
                  <td className="px-3 py-4 font-semibold">{match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}</td>
                  <td className="px-3 py-4 font-semibold">{match.status}</td>
                  <td className="px-3 py-4 font-semibold">{matchResultText(match)}</td>
                  <td className="px-3 py-4 font-semibold">{scoreDisplay(match) || ""}</td>
                  <td className="px-3 py-4 font-semibold">{match.court?.name || ""}</td>
                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setResultMatch(match)}
                        className="w-fit rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 font-black text-white hover:bg-blue-900"
                      >
                        Edit Result
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading === "returnToQueue"}
                        onClick={() => runAction("returnToQueue", { matchId: match.id, smsEnabled })}
                        className="w-fit rounded-xl bg-rose-700 px-4 py-3 font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reset to Queue
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.length === 0 && <div className="p-4 text-sm font-semibold text-blue-100">No matches were found for this team.</div>}
        </div>
      </div>
    </div>
  );
}

function TeamsTab({ state, setState, runAction, actionLoading }) {
  const isElimination = isEliminationTournament(state.tournament.settings) || isRoundRobinTop4Tournament(state.tournament.settings);
  const contactsByTeam = useMemo(() => groupBy(state.contacts || [], "tournament_team_id"), [state.contacts]);
  const activeDivisions = useMemo(() => state.divisions.filter((division) => division.is_active), [state.divisions]);
  const activeDivisionIds = useMemo(() => new Set(activeDivisions.map((division) => String(division.id))), [activeDivisions]);
  const divisionsById = useMemo(() => Object.fromEntries(activeDivisions.map((division) => [division.id, division])), [activeDivisions]);
  const divisionOrder = useMemo(() => activeDivisions.map((division) => division.name), [activeDivisions]);
  const [teamFilter, setTeamFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("");
  const [editingTeam, setEditingTeam] = useState(null);
  const [addingTeam, setAddingTeam] = useState(false);
  const [checkInPrompt, setCheckInPrompt] = useState(null);
  const cleanPlayerFilter = playerFilter.trim();
  const activeTeams = useMemo(() => {
    return state.teams.filter((team) => activeDivisionIds.has(String(team.division_id)));
  }, [activeDivisionIds, state.teams]);
  const notReadyTeamCount = useMemo(() => activeTeams.filter((team) => !teamReady(team)).length, [activeTeams]);
  const teamFilterOptions = [
    { value: "all", label: "All Teams", count: activeTeams.length },
    { value: "notReady", label: "Teams Not Ready", count: notReadyTeamCount },
  ];
  const teamsByDivision = useMemo(() => {
    return activeTeams
      .filter((team) => teamFilter === "all" || !teamReady(team))
      .filter((team) => teamMatchesPlayerFilter(team, contactsByTeam[String(team.id)] || [], cleanPlayerFilter))
      .reduce((map, team) => {
        const division = divisionsById[team.division_id]?.name || "Unassigned";
        map[division] = [...(map[division] || []), team];
        return map;
      }, {});
  }, [activeTeams, divisionsById, teamFilter, contactsByTeam, cleanPlayerFilter]);

  const divisionEntries = useMemo(() => {
    return Object.entries(teamsByDivision)
      .map(([division, teams]) => [division, [...teams].sort(compareTournamentTeamsByName)])
      .sort(([a], [b]) => {
        const aIndex = divisionOrder.indexOf(a);
        const bIndex = divisionOrder.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex) || a.localeCompare(b);
      });
  }, [divisionOrder, teamsByDivision]);

  function togglePlayerCheck(team, slot, checkedIn = !Boolean(slot === 1 ? team.player_1_checked_in : team.player_2_checked_in)) {
    const nextP1 = slot === 1 ? checkedIn : Boolean(team.player_1_checked_in);
    const nextP2 = slot === 2 ? checkedIn : Boolean(team.player_2_checked_in);
    updateTournamentTeamState(setState, team.id, {
      player_1_checked_in: nextP1,
      player_2_checked_in: nextP2,
      checked_in: nextP1 && nextP2,
    });

    return runAction("updateTournamentTeam", {
      teamId: team.id,
      player1CheckedIn: nextP1,
      player2CheckedIn: nextP2,
      checkedIn: nextP1 && nextP2,
    }, { skipRefresh: true, notice: "Check-in updated." });
  }

  function openPlayerCheckIn(team, contacts, slot) {
    const checkedIn = Boolean(slot === 1 ? team.player_1_checked_in : team.player_2_checked_in);
    if (checkedIn) {
      togglePlayerCheck(team, slot, false);
      return;
    }

    setCheckInPrompt({
      team,
      slot,
      playerName: playerDisplayName(team, contacts, slot),
      phone: playerPhoneFromContacts(contacts, slot),
      memberId: playerMemberIdFromContacts(contacts, slot),
    });
  }

  async function confirmPlayerCheckIn() {
    if (!checkInPrompt) return;
    const completed = await togglePlayerCheck(checkInPrompt.team, checkInPrompt.slot, true);
    if (completed) setCheckInPrompt(null);
  }

  async function savePlayerPhone(phone) {
    if (!checkInPrompt) return { success: false, error: "No player is selected." };
    const formattedPhone = formatPhoneNumberForStorage(phone);
    const result = await runAction("updatePlayerPhone", {
      teamId: checkInPrompt.team.id,
      slot: checkInPrompt.slot,
      memberId: checkInPrompt.memberId,
      playerName: checkInPrompt.playerName,
      phone: formattedPhone,
    }, { skipRefresh: true, returnResult: true });
    if (result?.success) {
      updateTournamentContactPhoneState(setState, {
        teamId: checkInPrompt.team.id,
        slot: checkInPrompt.slot,
        memberId: result.memberId || checkInPrompt.memberId,
        displayName: checkInPrompt.playerName,
        phone: result.newPhone || formattedPhone,
      });
      addLocalPhoneChangeLog(setState, result.logMetadata || {
        playerName: result.playerName || checkInPrompt.playerName,
        memberId: result.memberId || checkInPrompt.memberId,
        teamId: checkInPrompt.team.id,
        teamName: checkInPrompt.team.name || "",
        playerSlot: checkInPrompt.slot,
        oldPhone: result.oldPhone || "",
        newPhone: result.newPhone || formattedPhone,
        coreMemberUpdated: Boolean(result.coreMemberUpdated),
      });
      setCheckInPrompt((current) => current ? { ...current, phone: result.newPhone || formattedPhone, memberId: result.memberId || current.memberId } : current);
    }
    return result?.success ? { success: true } : { success: false, error: result?.error || "Phone number was not saved." };
  }

  async function deleteTeam(team) {
    if (!confirmTypedAction(`Delete ${team.name || "this team"} from the tournament?`, "DELETE")) return;
    setEditingTeam(null);
    const completed = await runAction("deleteTournamentTeam", { teamId: team.id });
    window.alert(completed ? "Delete completed." : "Delete was not completed.");
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black">Team List</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <label className="min-w-[260px] flex-1">
            <span className="sr-only">Find player by name or phone number</span>
            <input
              type="search"
              value={playerFilter}
              onChange={(event) => setPlayerFilter(event.target.value)}
              placeholder="Find player by name or phone"
              className="h-11 w-full rounded-xl border border-blue-300/40 bg-blue-950 px-4 text-sm font-semibold text-white placeholder:text-blue-200 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            />
          </label>
          <button
            type="button"
            onClick={() => setAddingTeam(true)}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 sm:w-auto"
          >
            Add Team
          </button>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-blue-300/40 bg-blue-950/70" role="group" aria-label="Filter teams">
            {teamFilterOptions.map((option) => {
              const active = teamFilter === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTeamFilter(option.value)}
                  className={`px-3 py-3 text-sm font-black transition ${active ? "bg-cyan-500 text-white" : "text-blue-100 hover:bg-blue-900"}`}
                >
                  {option.label} ({option.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {divisionEntries.map(([division, teams]) => {
        const colors = tournamentDivisionColors(division);

        return (
        <details key={division} className={`rounded-2xl border border-blue-300/20 border-l-4 ${colors.border} ${colors.panel} p-4`}>
          <summary className="cursor-pointer text-xl font-black">{division} <span className={`ml-2 rounded-full px-3 py-1 text-xs ${colors.badge}`}>{teams.length} shown</span></summary>
          <div className="mt-4 space-y-2">
            {teams.map((team) => {
                const contacts = contactsByTeam[String(team.id)] || [];
                const ready = teamReady(team);
                const totalRating = teamTotalRating(team, contacts, state);

                return (
                  <div key={team.id} className="rounded-xl border border-blue-300/20 bg-blue-950/70 p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black">{isElimination ? team.name || "Team" : teamStandingLabel(team)}</div>
                          {isElimination && regularSeasonStandingValue(team) && (
                            <div className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black text-cyan-100">
                              Standings {regularSeasonStandingValue(team)}
                            </div>
                          )}
                          {!isElimination && <div className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black text-cyan-100">Line {team.line_number || 1}</div>}
                          <div className={`rounded-full px-3 py-1 text-xs font-black ${ready ? "bg-emerald-400/25 text-emerald-100" : "bg-amber-400/25 text-amber-100"}`}>
                            {ready ? "Team Ready" : "Not Ready"}
                          </div>
                          <div className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-100">
                            Team Total {totalRating || "NR"}
                          </div>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-blue-100">
                          {playerSummary(team, contacts, 1)} & {playerSummary(team, contacts, 2)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openPlayerCheckIn(team, contacts, 1)}
                          disabled={Boolean(actionLoading)}
                          className={`rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${team.player_1_checked_in ? "bg-emerald-600 text-white" : "bg-rose-700 text-white"}`}
                        >
                          {playerDisplayName(team, contacts, 1)}
                        </button>
                        <button
                          type="button"
                          onClick={() => openPlayerCheckIn(team, contacts, 2)}
                          disabled={Boolean(actionLoading)}
                          className={`rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${team.player_2_checked_in ? "bg-emerald-600 text-white" : "bg-rose-700 text-white"}`}
                        >
                          {playerDisplayName(team, contacts, 2)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTeam(team)}
                          className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            {teams.length === 0 && <div className="rounded-xl border border-blue-300/20 bg-blue-950/60 p-4 text-sm font-semibold text-blue-100">No teams match this filter.</div>}
          </div>
        </details>
        );
      })}
      {divisionEntries.length === 0 && <EmptyPanel title="Teams" message="No teams match this filter." />}
      {editingTeam && (
        <TeamEditModal
          team={editingTeam}
          state={state}
          contacts={contactsByTeam[String(editingTeam.id)] || []}
          onClose={() => setEditingTeam(null)}
          onDelete={() => deleteTeam(editingTeam)}
          deleting={actionLoading === "deleteTournamentTeam"}
          saving={actionLoading === "updateTournamentTeam"}
          sendingTestText={actionLoading === "sendTestText"}
          onSendTestText={(phone) => runAction("sendTestText", { phone }, { skipRefresh: true })}
          onSave={async (payload) => {
            setEditingTeam(null);
            await runAction("updateTournamentTeam", payload);
          }}
        />
      )}
      {addingTeam && (
        <TeamEditModal
          mode="add"
          team={emptyTournamentTeam()}
          state={state}
          contacts={[]}
          onClose={() => setAddingTeam(false)}
          saving={actionLoading === "createTournamentTeam"}
          sendingTestText={actionLoading === "sendTestText"}
          onSendTestText={(phone) => runAction("sendTestText", { phone }, { skipRefresh: true })}
          onSave={async (payload) => {
            const completed = await runAction("createTournamentTeam", payload);
            if (completed) setAddingTeam(false);
          }}
        />
      )}
      {checkInPrompt && (
        <PlayerCheckInModal
          prompt={checkInPrompt}
          sendingCheckInText={actionLoading === "sendCheckInText"}
          saving={actionLoading === "updateTournamentTeam" || actionLoading === "updatePlayerPhone"}
          onClose={() => setCheckInPrompt(null)}
          onConfirm={confirmPlayerCheckIn}
          onSendCheckInText={(phone) => runAction("sendCheckInText", {
            phone,
            teamId: checkInPrompt.team.id,
            slot: checkInPrompt.slot,
            playerName: checkInPrompt.playerName,
          }, { skipRefresh: true })}
          onSavePhone={savePlayerPhone}
        />
      )}
    </section>
  );
}

function PlayerCheckInModal({ prompt, onClose, onConfirm, onSendCheckInText, onSavePhone, saving, sendingCheckInText }) {
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(prompt.phone || "");
  const [saveMessage, setSaveMessage] = useState("");
  const phone = formatPhoneNumberForStorage(prompt.phone || "");
  const cleanPhoneInput = formatPhoneNumberForStorage(phoneInput);

  useEffect(() => {
    setPhoneInput(prompt.phone || "");
    setEditingPhone(false);
    setSaveMessage("");
  }, [prompt.phone]);

  async function savePhone() {
    setSaveMessage("");
    const result = await onSavePhone(cleanPhoneInput);
    setSaveMessage(result?.success ? "Phone number saved." : `Phone number was not saved. ${result?.error || "No reason was returned."}`);
    if (result?.success) setEditingPhone(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-md rounded-2xl border border-blue-300/30 bg-slate-900 p-5 text-white shadow-2xl">
        <h2 className="text-2xl font-black">Confirm Check-In</h2>
        <p className="mt-2 text-sm font-semibold text-blue-100">
          Is this phone number correct for {prompt.playerName}?
        </p>
        <div className="mt-4 rounded-xl border border-blue-300/20 bg-blue-950/70 px-4 py-3 text-xl font-black">
          {phone || "No phone number entered"}
        </div>
        {editingPhone && (
          <label className="mt-4 block text-sm font-black text-blue-200">
            New Phone #
            <input
              type="tel"
              value={phoneInput}
              onChange={(event) => setPhoneInput(formatPhoneNumberInput(event.target.value))}
              onBlur={(event) => setPhoneInput(formatPhoneNumberForStorage(event.target.value))}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-lg font-black text-white"
              autoFocus
            />
          </label>
        )}
        {saveMessage && (
          <div className={`mt-3 rounded-xl px-4 py-3 text-sm font-black ${saveMessage.includes("not") ? "bg-rose-950/70 text-rose-100" : "bg-emerald-950/70 text-emerald-100"}`}>
            {saveMessage}
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {!editingPhone && (
            <button
              type="button"
              onClick={() => setEditingPhone(true)}
              className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
            >
              Change Phone #
            </button>
          )}
          {editingPhone && (
            <button
              type="button"
              onClick={savePhone}
              disabled={saving || !cleanPhoneInput || cleanPhoneInput === phone}
              className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Phone #"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onSendCheckInText(phone)}
            disabled={sendingCheckInText || !phone}
            className="rounded-xl border border-amber-300/50 bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendingCheckInText ? "Sending..." : "Send Check-In SMS"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Check In"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamEditModal({ team, state, contacts, onClose, onSave, onDelete, onSendTestText, saving, deleting, sendingTestText, mode = "edit" }) {
  const isAddMode = mode === "add";
  const isElimination = isEliminationTournament(state.tournament.settings) || isRoundRobinTop4Tournament(state.tournament.settings);
  const activeDivisions = useMemo(() => state.divisions.filter((division) => division.is_active !== false), [state.divisions]);
  const sourceTeams = useMemo(() => state.sourceTeams || [], [state.sourceTeams]);
  const sourceTeamOptions = useMemo(() => sortedSourceTeams(sourceTeams), [sourceTeams]);
  const sourceRosters = useMemo(() => state.sourceRosters || [], [state.sourceRosters]);
  const [form, setForm] = useState(() => isAddMode ? emptyTeamFormState() : teamFormState(team, contacts, sourceTeamOptions));
  const selectedSourceTeam = useMemo(() => sourceTeamOptions.find((sourceTeam) => String(sourceTeam.id) === String(form.sourceTeamId)), [form.sourceTeamId, sourceTeamOptions]);
  const allRosterPlayers = useMemo(() => uniqueRosterPlayers(sourceRosters), [sourceRosters]);
  const selectedRoster = useMemo(() => {
    if (isElimination) return allRosterPlayers;

    return sourceRosters
      .filter((row) => String(row.team_id) === String(form.sourceTeamId))
      .sort((a, b) =>
        String(a.members?.first_name || "").localeCompare(String(b.members?.first_name || "")) ||
        memberDisplayName(a.members).localeCompare(memberDisplayName(b.members))
      );
  }, [allRosterPlayers, form.sourceTeamId, isElimination, sourceRosters]);
  const teamTotal = teamTotalFromForm(form);
  const selectedLeagueDivision = useMemo(() => {
    const selectedDivisionName = selectedTournamentDivisionName(state.divisions, form.divisionId);
    return (state.leagueDivisions || []).find((division) =>
      normalizeName(division.name) === normalizeName(selectedDivisionName)
    );
  }, [form.divisionId, state.divisions, state.leagueDivisions]);
  const divisionTeamMax = Number(isElimination ? selectedLeagueDivision?.team_dupr_max : selectedSourceTeam?.divisions?.team_dupr_max);
  const hasDivisionTeamMax = Number.isFinite(divisionTeamMax) && divisionTeamMax > 0;
  const exceedsDivisionTeamMax = hasDivisionTeamMax && teamTotal !== "" && Number(teamTotal) > divisionTeamMax;
  const duplicateTeamLine = !isElimination && duplicateTournamentTeamLine(state.teams, team.id, form.name, form.lineNumber);
  const selectedTournamentDivision = useMemo(() => {
    if (isElimination) {
      return activeDivisions.find((division) => String(division.id) === String(form.divisionId));
    }

    const sourceDivisionName = selectedSourceTeam?.divisions?.name || "";
    return (state.divisions || []).find((division) =>
      division.is_active !== false && normalizeName(division.name) === normalizeName(sourceDivisionName)
    );
  }, [activeDivisions, form.divisionId, isElimination, selectedSourceTeam, state.divisions]);
  const missingTournamentDivision = isAddMode && !isElimination && form.sourceTeamId && !selectedTournamentDivision;
  const addValidationMessages = isAddMode ? addTeamValidationMessages(state, form, selectedSourceTeam, teamTotal, divisionTeamMax, isElimination) : [];
  const missingStanding = !String(form.regularSeasonStanding || "").trim();
  const invalidStanding = !missingStanding && (!Number.isFinite(Number(form.regularSeasonStanding)) || Number(form.regularSeasonStanding) < 1);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectSourceTeam(sourceTeamId) {
    const sourceTeam = sourceTeamOptions.find((item) => String(item.id) === String(sourceTeamId));
    setForm((current) => ({
      ...current,
      sourceTeamId,
      name: sourceTeam ? sourceTeam.name : current.name,
      player1MemberId: "",
      player1Name: "",
      player1Phone: "",
      player1Rating: "",
      player2MemberId: "",
      player2Name: "",
      player2Phone: "",
      player2Rating: "",
    }));
  }

  function selectPlayer(slot, memberId) {
    const row = selectedRoster.find((item) => String(item.member_id) === String(memberId));
    const prefix = slot === 1 ? "player1" : "player2";
    setForm((current) => {
      const selectedName = row ? memberDisplayName(row.members) : "";
      const next = {
        ...current,
        [`${prefix}MemberId`]: memberId,
        [`${prefix}Name`]: selectedName,
        [`${prefix}Phone`]: row?.members?.phone || "",
        [`${prefix}Rating`]: row ? playerRatingForSource(row, state.sourceRatings || [], sourceTeamOptions) : "",
      };
      if (isElimination && shouldReplaceGeneratedTeamName(current.name, current.player1Name, current.player2Name)) {
        next.name = eliminationTeamName(next.player1Name, next.player2Name);
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-blue-300/30 bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">{isAddMode ? "Add Team" : "Edit Team"}</h2>
            <p className="mt-1 text-sm font-semibold text-blue-200">{isAddMode ? selectedTournamentDivision?.name || (isElimination ? "Select Division" : "Select Main System Team") : team.name}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
              {selectedTournamentDivision && (
                <span className="rounded-full bg-cyan-400/20 px-3 py-1 text-cyan-100">
                  {selectedTournamentDivision.name}
                </span>
              )}
              <span className="rounded-full bg-blue-400/20 px-3 py-1 text-blue-100">
                Division Team Max {hasDivisionTeamMax ? divisionTeamMax.toFixed(2) : "Not set"}
              </span>
              <span className={`rounded-full px-3 py-1 ${exceedsDivisionTeamMax ? "bg-rose-400/25 text-rose-100" : "bg-emerald-400/20 text-emerald-100"}`}>
                Team Total {teamTotal || "NR"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {isElimination ? (
            <label className="text-sm font-black text-blue-200 md:col-span-2">
              Division
              <select value={form.divisionId} onChange={(event) => updateForm("divisionId", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
                <option value="">Select division...</option>
                {activeDivisions.map((division) => (
                  <option key={division.id} value={division.id}>{division.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className={`text-sm font-black text-blue-200 ${isAddMode ? "md:col-span-2" : ""}`}>
              Main System Team
              <select value={form.sourceTeamId} onChange={(event) => selectSourceTeam(event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
                <option value="">Select team...</option>
                {sourceTeamOptions.map((sourceTeam) => (
                  <option key={sourceTeam.id} value={sourceTeam.id}>{sourceTeam.divisions?.name || "Division"} - {sourceTeam.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm font-black text-blue-200">
            Team Name
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="text-sm font-black text-blue-200">
            {isElimination ? "Standings" : "Regular Season Standing"}
            <input type="number" min="1" value={form.regularSeasonStanding} onChange={(event) => updateForm("regularSeasonStanding", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
          </label>
          {!isElimination && <label className="text-sm font-black text-blue-200">
            Line
            <input type="number" min="1" value={form.lineNumber} onChange={(event) => updateForm("lineNumber", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
          </label>}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((slot) => {
            const prefix = slot === 1 ? "player1" : "player2";
            return (
              <div key={slot} className="rounded-xl border border-blue-300/20 bg-blue-950/60 p-4">
                <label className="text-sm font-black text-blue-200">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span>Player {slot}</span>
                    <button
                      type="button"
                      onClick={() => onSendTestText(form[`${prefix}Phone`])}
                      disabled={sendingTestText || !String(form[`${prefix}Phone`] || "").trim()}
                      className="rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                    >
                      Send Test Text
                    </button>
                  </span>
                  <select value={form[`${prefix}MemberId`]} onChange={(event) => selectPlayer(slot, event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
                    <option value="">Select player...</option>
                    {selectedRoster.map((row) => {
                      const rating = playerRatingForSource(row, state.sourceRatings || [], sourceTeamOptions);
                      return (
                        <option key={`${slot}-${row.member_id}`} value={row.member_id}>
                          {memberDisplayName(row.members)} - {formatRatingDisplay(rating)}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  <input value={form[`${prefix}Name`]} onChange={(event) => updateForm(`${prefix}Name`, event.target.value)} placeholder="Player name" className="rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
                  <input
                    value={form[`${prefix}Phone`]}
                    onChange={(event) => updateForm(`${prefix}Phone`, formatPhoneNumberInput(event.target.value))}
                    onBlur={(event) => updateForm(`${prefix}Phone`, formatPhoneNumberForStorage(event.target.value))}
                    placeholder="Phone"
                    className="rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
                  />
                  <input value={form[`${prefix}Rating`]} onChange={(event) => updateForm(`${prefix}Rating`, event.target.value)} placeholder="Rating" className="rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {exceedsDivisionTeamMax && (
            <div className="w-full rounded-xl border border-rose-300/30 bg-rose-950/60 px-4 py-3 text-sm font-black text-rose-100">
              Team Total Rating exceeds the Division Team Max.
            </div>
          )}
          {duplicateTeamLine && (
            <div className="w-full rounded-xl border border-rose-300/30 bg-rose-950/60 px-4 py-3 text-sm font-black text-rose-100">
              A tournament team already exists with this Team Name and Line #.
            </div>
          )}
          {missingTournamentDivision && (
            <div className="w-full rounded-xl border border-rose-300/30 bg-rose-950/60 px-4 py-3 text-sm font-black text-rose-100">
              This Main System Team does not match an active tournament division.
            </div>
          )}
          {(missingStanding || invalidStanding) && (
            <div className="w-full rounded-xl border border-rose-300/30 bg-rose-950/60 px-4 py-3 text-sm font-black text-rose-100">
              {isElimination ? "Standings is required." : "Regular Season Standing is required."}
            </div>
          )}
          {addValidationMessages.map((message) => (
            <div key={message} className="w-full rounded-xl border border-rose-300/30 bg-rose-950/60 px-4 py-3 text-sm font-black text-rose-100">
              {message}
            </div>
          ))}
          <button
            type="button"
            disabled={saving || !form.name.trim() || (isAddMode && (isElimination ? !form.divisionId : !form.sourceTeamId)) || missingStanding || invalidStanding || exceedsDivisionTeamMax || duplicateTeamLine || missingTournamentDivision || addValidationMessages.length > 0}
            onClick={() => onSave(teamSavePayload(team, form))}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : isAddMode ? "Add Team" : "Save Team"}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-blue-300/40 bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
            Cancel
          </button>
          {!isAddMode && (
            <button
              type="button"
              disabled={saving || deleting}
              onClick={onDelete}
              className="ml-auto rounded-xl bg-rose-700 px-5 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete Team"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
function AdminSetupTab({ state, runAction, actionLoading }) {
  const sortedDivisions = useMemo(() => sortDivisionsByName(state.divisions), [state.divisions]);
  const activeDivisions = useMemo(() => sortedDivisions.filter((division) => division.is_active), [sortedDivisions]);
  const teamCounts = useMemo(() => teamCountsByDivision(state.teams), [state.teams]);
  const [selectedDivisionIds, setSelectedDivisionIds] = useState(() => activeDivisions.map((division) => division.id));
  const [showInactiveDivisions, setShowInactiveDivisions] = useState(false);
  const [tournamentName, setTournamentName] = useState(state.tournament.name || "");
  const [eventEntryCode, setEventEntryCode] = useState("");
  const [eventEntryCodeConfirm, setEventEntryCodeConfirm] = useState("");
  const [eventEntryCodeApproval, setEventEntryCodeApproval] = useState("");
  const [format, setFormat] = useState(tournamentFormat(state.tournament.settings));
  const [numberOfGames, setNumberOfGames] = useState(String(tournamentScoreSettings(state.tournament.settings).numberOfGames));
  const [gamesPlayedTo, setGamesPlayedTo] = useState(String(tournamentScoreSettings(state.tournament.settings).gamesPlayedTo));
  const [winBy, setWinBy] = useState(String(tournamentScoreSettings(state.tournament.settings).winBy));
  const [rallyScoring, setRallyScoring] = useState(Boolean(tournamentScoreSettings(state.tournament.settings).rallyScoring));
  const [standingsRules, setStandingsRules] = useState(() => standingsRulesState(state.tournament.settings?.standingsRules));
  const [courtLabels, setCourtLabels] = useState(() => courtLabelsFromCourts(state.courts));
  const [courtCount, setCourtCount] = useState(Math.max(1, state.courts.length || 1));
  const [startCourtNumber, setStartCourtNumber] = useState("");

  useEffect(() => {
    setSelectedDivisionIds(activeDivisions.map((division) => division.id));
  }, [activeDivisions]);

  useEffect(() => {
    setTournamentName(state.tournament.name || "");
    setEventEntryCode("");
    setEventEntryCodeConfirm("");
    setEventEntryCodeApproval("");
    setFormat(tournamentFormat(state.tournament.settings));
    setNumberOfGames(String(tournamentScoreSettings(state.tournament.settings).numberOfGames));
    setGamesPlayedTo(String(tournamentScoreSettings(state.tournament.settings).gamesPlayedTo));
    setWinBy(String(tournamentScoreSettings(state.tournament.settings).winBy));
    setRallyScoring(Boolean(tournamentScoreSettings(state.tournament.settings).rallyScoring));
    setStandingsRules(standingsRulesState(state.tournament.settings?.standingsRules));
    setCourtLabels(courtLabelsFromCourts(state.courts));
    setCourtCount(Math.max(1, state.courts.length || 1));
  }, [state.courts, state.tournament.name, state.tournament.settings]);

  function toggleSelectedDivision(divisionId) {
    setSelectedDivisionIds((current) =>
      current.includes(divisionId)
        ? current.filter((id) => id !== divisionId)
        : [...current, divisionId]
    );
  }

  function changeCourtCount(value) {
    const nextCount = Math.max(1, Math.min(64, Number(value) || 1));
    setCourtCount(nextCount);
    setCourtLabels((current) => courtLabelsForCount(current, nextCount));
  }

  function updateCourtLabel(index, value) {
    setCourtLabels((current) => current.map((label, itemIndex) => itemIndex === index ? value : label));
  }

  function fillCourtNumberSequence() {
    const start = Number(startCourtNumber);
    if (!Number.isFinite(start)) return;
    setCourtLabels(Array.from({ length: courtCount }, (_, index) => String(start + index)));
  }

  function updateStandingsRule(index, value) {
    setStandingsRules((current) => current.map((rule, ruleIndex) => ruleIndex === index ? value : rule));
  }

  async function saveEventEntryCode() {
    if (!eventEntryCode.trim()) return;
    if (eventEntryCode !== eventEntryCodeConfirm) {
      window.alert("Enter the same new event entry code in both boxes.");
      return;
    }
    if (eventEntryCodeApproval.trim().toUpperCase() !== "CHANGE CODE") {
      window.alert("Type CHANGE CODE to confirm this event entry code change.");
      return;
    }
    if (!confirmTypedAction("Change the event entry code for this tournament? The current admin session will immediately switch to the new code.", "CHANGE CODE")) return;

    const saved = await runAction("updateTournamentSettings", {
      ...tournamentSettingsPayload,
      adminCode: eventEntryCode,
      adminCodeConfirm: eventEntryCodeConfirm,
      adminCodeConfirmation: eventEntryCodeApproval,
    });
    if (saved) {
      setEventEntryCode("");
      setEventEntryCodeConfirm("");
      setEventEntryCodeApproval("");
    }
    window.alert(saved ? "Event entry code change completed." : "Event entry code change was not completed.");
  }

  const savedCourtNames = courtLabels.map((label, index) => label.trim() || `Court ${index + 1}`).join(",");
  const visibleDivisions = showInactiveDivisions ? sortedDivisions : sortedDivisions.filter((division) => division.is_active);
  const hiddenInactiveDivisionCount = sortedDivisions.filter((division) => !division.is_active).length;
  const selectedDivisionNames = activeDivisions
    .filter((division) => selectedDivisionIds.includes(division.id))
    .map((division) => division.name)
    .join(", ");
  const canSaveEventEntryCode = Boolean(
    !actionLoading &&
    tournamentName.trim() &&
    eventEntryCode.trim() &&
    eventEntryCode === eventEntryCodeConfirm &&
    eventEntryCodeApproval.trim().toUpperCase() === "CHANGE CODE"
  );
  const tournamentSettingsPayload = {
    name: tournamentName,
    format,
    numberOfGames: numberOfGames || String(tournamentScoreSettings(state.tournament.settings).numberOfGames),
    gamesPlayedTo: gamesPlayedTo || String(tournamentScoreSettings(state.tournament.settings).gamesPlayedTo),
    winBy: winBy || String(tournamentScoreSettings(state.tournament.settings).winBy),
    rallyScoring,
    standingsRules,
  };
  const isEliminationFormat = format === "single_elimination" || format === "double_elimination";
  const isTop4Format = format === "round_robin_top4";
  const currentFormatLabel = tournamentFormatLabel({ format });

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black">Admin Setup</h2>
          <p className="mt-3 rounded-xl border border-blue-300/20 bg-white/5 px-4 py-3 text-sm font-semibold text-blue-100">
            Set court count, control SMS sending, generate/reset matches, export results, and manage divisions.
          </p>
        </div>
        <span className="w-fit rounded-full bg-blue-400/20 px-4 py-2 text-sm font-black text-blue-100">Tournament Controls</span>
      </div>

      <div>
        <h3 className="text-2xl font-black">Divisions</h3>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Divisions come from the main system. Mark them active or inactive for this tournament; existing generated matches are not changed until matches are reset or regenerated.
        </p>
        <div className="mt-4 rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirmTypedAction("Refresh tournament divisions and teams from the main system? This may add or update tournament setup data.", "REFRESH")) {
                  runAction("syncLeagueDivisions").then((completed) => {
                    window.alert(completed ? "Refresh completed." : "Refresh was not completed.");
                  });
                }
              }}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh From Main System
            </button>
            <button
              type="button"
              onClick={() => setShowInactiveDivisions((value) => !value)}
              className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
            >
              {showInactiveDivisions ? "Hide Deactivated Divisions" : `Show Deactivated Divisions${hiddenInactiveDivisionCount ? ` (${hiddenInactiveDivisionCount})` : ""}`}
            </button>
          </div>
          <details className="mt-4 rounded-2xl border border-blue-300/20 bg-slate-950/60 p-4">
            <summary className="cursor-pointer text-xl font-black">
              Divisions <span className="ml-2 rounded-full bg-blue-400/20 px-3 py-1 text-xs text-blue-100">{visibleDivisions.length} shown</span>
            </summary>
            <div className="mt-4 space-y-3">
            {visibleDivisions.map((division) => {
              const active = Boolean(division.is_active);
              const teamCount = teamCounts[String(division.id)] || 0;
              const colors = tournamentDivisionColors(division.name);
              return (
                <div key={division.id} className={`rounded-2xl border border-blue-300/20 border-l-4 ${colors.border} ${colors.panel} p-4`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-black">{division.name}</div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${colors.badge}`}>{teamCount} teams</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => runAction("updateDivisionStatus", { divisionId: division.id, isActive: !active })}
                          disabled={Boolean(actionLoading)}
                          className={`w-fit rounded-xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                            active
                              ? "bg-emerald-600 text-white hover:bg-emerald-500"
                              : "bg-rose-700 text-white hover:bg-rose-600"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmTypedAction(`Delete the ${division.name} division from this tournament? This cannot be undone.`, "DELETE")) {
                            runAction("deleteDivision", { divisionId: division.id }).then((completed) => {
                              window.alert(completed ? "Delete completed." : "Delete was not completed.");
                            });
                          }
                        }}
                        disabled={Boolean(actionLoading) || teamCount > 0}
                        title={teamCount > 0 ? "Delete is available after all teams are removed from this division." : "Delete division"}
                        className="w-fit rounded-xl bg-rose-700 px-5 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete Division
                      </button>
                      </div>
                  </div>
                </div>
              );
            })}
            {state.divisions.length === 0 && <div className="py-4 text-sm font-semibold text-blue-100">No tournament divisions have been synced yet.</div>}
            {state.divisions.length > 0 && visibleDivisions.length === 0 && <div className="py-4 text-sm font-semibold text-blue-100">No active divisions are shown. Use Show Deactivated Divisions to view inactive divisions.</div>}
            </div>
          </details>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Tournament Format</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <label className="text-sm font-black text-blue-200">
            Format
            <select value={format} onChange={(event) => setFormat(event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
              {TOURNAMENT_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => runAction("updateTournamentSettings", tournamentSettingsPayload)}
            disabled={Boolean(actionLoading) || !tournamentName.trim()}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save Format
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">{currentFormatLabel} Divisions</h3>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Select which active divisions to generate. Inactive divisions are hidden from standings and not shown here.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          {activeDivisions.map((division) => {
            const colors = tournamentDivisionColors(division.name);

            return (
            <label key={division.id} className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black ${colors.badge}`}>
              <input
                type="checkbox"
                checked={selectedDivisionIds.includes(division.id)}
                onChange={() => toggleSelectedDivision(division.id)}
                className="size-4 accent-cyan-400"
              />
              {division.name}
            </label>
            );
          })}
          {activeDivisions.length === 0 && <div className="text-sm font-semibold text-blue-100">No active divisions are available.</div>}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const action = isEliminationFormat ? "generateEliminationBracket" : "generateRoundRobin";
              if (confirmTypedAction(`Generate ${currentFormatLabel.toLowerCase()} matches for ${selectedDivisionNames || "the selected divisions"}? This replaces generated matches in those divisions.`, "GENERATE")) {
                runAction(action, { divisionIds: selectedDivisionIds }).then((completed) => {
                  window.alert(completed ? `${currentFormatLabel} generation completed.` : `${currentFormatLabel} generation was not completed.`);
                });
              }
            }}
            disabled={Boolean(actionLoading) || selectedDivisionIds.length === 0}
            className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate Selected {isEliminationFormat ? "Bracket" : "Round Robin"}
          </button>
          {isTop4Format && (
            <button
              type="button"
              onClick={() => {
                if (confirmTypedAction(`Generate top 4 playoff matches for ${selectedDivisionNames || "the selected divisions"}? This keeps completed round robin matches and replaces any existing playoff bracket in those divisions.`, "PLAYOFF")) {
                  runAction("generateTop4Playoff", { divisionIds: selectedDivisionIds }).then((completed) => {
                    window.alert(completed ? "Top 4 Playoff generation completed." : "Top 4 Playoff generation was not completed.");
                  });
                }
              }}
              disabled={Boolean(actionLoading) || selectedDivisionIds.length === 0}
              className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Generate Top 4 Playoff
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (confirmTypedAction("Reset all tournament matches? This removes generated matches and clears court assignments.", "RESET")) {
                runAction("resetMatches").then((completed) => {
                  window.alert(completed ? "Reset completed." : "Reset was not completed.");
                });
              }
            }}
            disabled={Boolean(actionLoading)}
            className="rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset Matches
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmTypedAction("Start the tournament and reset wait-time tracking for active matches?", "START")) {
                runAction("startTournament").then((completed) => {
                  window.alert(completed ? "Start tournament completed." : "Start tournament was not completed.");
                });
              }
            }}
            disabled={Boolean(actionLoading)}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Tournament / Reset Wait Times
          </button>
          <button
            type="button"
            onClick={() => exportMatchesCsv(state, selectedDivisionIds)}
            className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-400"
          >
            Export Matches CSV
          </button>
          <button
            type="button"
            onClick={() => exportDuprCsv(state, selectedDivisionIds)}
            className="rounded-xl border border-emerald-300/50 bg-emerald-700 px-4 py-3 text-sm font-black text-white hover:bg-emerald-600"
          >
            DUPR Export
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Tournament Name</h3>
        <input
          type="text"
          value={tournamentName}
          onChange={(event) => setTournamentName(event.target.value)}
          className="mt-4 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
        />
        <p className="mt-3 text-sm font-semibold text-blue-100">Shown on the Main System and all public display screens.</p>
        <button
          type="button"
          onClick={() => runAction("updateTournamentSettings", tournamentSettingsPayload)}
          disabled={Boolean(actionLoading) || !tournamentName.trim()}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Tournament Name
        </button>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Match Format</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="text-sm font-black text-blue-200">
            Number of Games
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={numberOfGames}
              onChange={(event) => setNumberOfGames(onlyDigits(event.target.value))}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <label className="text-sm font-black text-blue-200">
            Games Played To
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={gamesPlayedTo}
              onChange={(event) => setGamesPlayedTo(onlyDigits(event.target.value))}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <label className="text-sm font-black text-blue-200">
            Win By
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={winBy}
              onChange={(event) => setWinBy(onlyDigits(event.target.value))}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <label className="flex items-end gap-3 rounded-xl border border-blue-300/20 bg-slate-950/40 px-4 py-3 text-sm font-black text-blue-200">
            <input
              type="checkbox"
              checked={rallyScoring}
              onChange={(event) => setRallyScoring(event.target.checked)}
              className="mb-1 size-4 accent-cyan-400"
            />
            Rally Scoring
          </label>
        </div>
        <p className="mt-3 text-sm font-semibold text-blue-100">A 1-game match asks for one score. A 3-game match is best 2 of 3, so Game 3 is only needed if the teams split Games 1 and 2.</p>
        <button
          type="button"
          onClick={() => runAction("updateTournamentSettings", tournamentSettingsPayload)}
          disabled={Boolean(actionLoading) || !tournamentName.trim() || !numberOfGames || !gamesPlayedTo || !winBy}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Match Format
        </button>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Standings Placement Rules</h3>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Choose the tournament tie-break order. Regular Season Standing sorts lower numbers first.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {standingsRules.map((rule, index) => (
            <label key={index} className="text-sm font-black text-blue-200">
              Tie-break {index + 1}
              <select value={rule} onChange={(event) => updateStandingsRule(index, event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
                {STANDINGS_RULE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => runAction("updateTournamentSettings", tournamentSettingsPayload)}
          disabled={Boolean(actionLoading) || !tournamentName.trim()}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Standings Rules
        </button>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Courts</h3>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Set how many courts are available, then enter the number or name posted on each court.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr_auto] lg:items-end">
          <label className="block text-sm font-black text-blue-200">
            Courts Available
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={courtCount}
              onChange={(event) => changeCourtCount(onlyDigits(event.target.value))}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <label className="block text-sm font-black text-blue-200">
            Quick Fill Starting Court Number
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={startCourtNumber}
              onChange={(event) => setStartCourtNumber(onlyDigits(event.target.value))}
              placeholder="Example: 5"
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <button
            type="button"
            onClick={fillCourtNumberSequence}
            disabled={!startCourtNumber.trim()}
            className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Fill Numbers
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {courtLabels.map((label, index) => (
            <label key={index} className="block rounded-xl border border-blue-300/20 bg-slate-950/40 p-3 text-sm font-black text-blue-200">
              Court Slot {index + 1}
              <input
                type="text"
                value={label}
                onChange={(event) => updateCourtLabel(index, event.target.value)}
                placeholder={`Court ${index + 1}`}
                className="mt-2 w-full rounded-lg border border-blue-300/30 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => runAction("saveCourts", { courtNames: savedCourtNames })}
          disabled={Boolean(actionLoading) || courtLabels.every((label) => !label.trim())}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Courts
        </button>
        <div className="mt-4 rounded-xl border border-blue-300/20 bg-white/5 p-4">
          <div className="font-black">Current Courts: {state.courts.length} court{state.courts.length === 1 ? "" : "s"}</div>
          <div className="mt-2 text-sm font-semibold text-blue-200">{courtNamesString(state.courts) || "No courts configured"}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Event Entry Code</h3>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          This is the code used on the Enter Event Code screen to unlock the tournament Main System. To change it, enter the new code twice, type CHANGE CODE in the confirmation box, then save.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            type="password"
            value={eventEntryCode}
            onChange={(event) => setEventEntryCode(event.target.value)}
            className="w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            placeholder="New entry code"
          />
          <input
            type="password"
            value={eventEntryCodeConfirm}
            onChange={(event) => setEventEntryCodeConfirm(event.target.value)}
            className="w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            placeholder="Confirm new entry code"
          />
        </div>
        <input
          type="text"
          value={eventEntryCodeApproval}
          onChange={(event) => setEventEntryCodeApproval(event.target.value)}
          className="mt-3 w-full rounded-xl border border-amber-300/50 bg-slate-950 px-4 py-3 font-black uppercase tracking-wide text-white"
          placeholder="Type CHANGE CODE"
        />
        <p className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
          After saving, this browser session switches to the new code automatically. If the saved code is ever lost, an administrator can set the server-only TOURNAMENT_ADMIN_OVERRIDE_CODE value and use that to get back in.
        </p>
        <button
          type="button"
          onClick={saveEventEntryCode}
          disabled={!canSaveEventEntryCode}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Entry Code
        </button>
      </div>

      <div className="rounded-2xl border border-red-400/40 bg-red-950/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-black text-red-100">Danger Area</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-red-100">
              Reset the entire tournament system only after all matches have been exported and recorded. This deletes all tournament history, divisions, teams, standings data, and logs for this tournament.
            </p>
          </div>
          <span className="w-fit rounded-full border border-red-300/40 bg-red-700/40 px-3 py-1 text-xs font-black uppercase text-red-100">Permanent</span>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirmTypedAction("Reset the entire tournament system? Confirm that all matches have been exported and recorded before continuing. This deletes all history, divisions, teams, standings data, and logs for this tournament.", "RESET TOURNAMENT")) {
              runAction("resetTournamentSystem").then((completed) => {
                window.alert(completed ? "Tournament system reset completed." : "Tournament system reset was not completed.");
              });
            }
          }}
          disabled={Boolean(actionLoading)}
          className="mt-4 rounded-xl bg-red-700 px-4 py-3 text-sm font-black text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset Entire Tournament System
        </button>
      </div>
    </section>
  );
}
function SmsTab({ state, smsEnabled, setSmsEnabled, runAction, actionLoading }) {
  const activeDivisions = useMemo(() => state.divisions.filter((division) => division.is_active), [state.divisions]);
  const activeDivisionIds = useMemo(() => activeDivisions.map((division) => String(division.id)), [activeDivisions]);
  const phoneCount = useMemo(() => broadcastPhoneCount(state, activeDivisionIds), [activeDivisionIds, state]);
  const [testPhone, setTestPhone] = useState("");
  const [showFields, setShowFields] = useState(false);
  const [showBroadcastPrompt, setShowBroadcastPrompt] = useState(false);
  const [templates, setTemplates] = useState(() => smsTemplateState(state.tournament.settings?.smsTemplates));

  useEffect(() => {
    setTemplates(smsTemplateState(state.tournament.settings?.smsTemplates));
  }, [state.tournament.settings?.smsTemplates]);

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h2 className="text-xl font-black">SMS Sending Control</h2>
        <label className="mt-8 flex items-center gap-3 text-sm font-semibold text-blue-100">
          <input
            type="checkbox"
            checked={smsEnabled}
            onChange={(event) => setSmsEnabled(event.target.checked)}
            className="size-4 accent-cyan-400"
          />
          SMS notifications ON
        </label>
        <p className="mt-4 text-sm font-semibold text-blue-100">
          When ON, court assignment and result texts can be sent. Leave OFF while testing or setting up.
        </p>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h2 className="text-xl font-black">Tournament Broadcast</h2>
        <p className="mt-4 text-sm font-semibold text-blue-100">
          Send a status update to every unique phone number entered for all teams.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <button
            type="button"
            disabled={!smsEnabled || Boolean(actionLoading) || phoneCount === 0}
            onClick={() => setShowBroadcastPrompt(true)}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Text All Participants
          </button>
          <label className="min-w-[240px] flex-1 text-sm font-black text-blue-200">
            Test Phone
            <input
              type="tel"
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              placeholder="Enter test phone"
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <button
            type="button"
            disabled={!smsEnabled || Boolean(actionLoading) || !testPhone.trim()}
            onClick={() => runAction("sendTestText", { phone: testPhone })}
            className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send Test Text
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold text-blue-200">{phoneCount} unique tournament phone number{phoneCount === 1 ? "" : "s"} available.</p>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h2 className="text-xl font-black">Default SMS Templates</h2>
        <button
          type="button"
          onClick={() => setShowFields((value) => !value)}
          className="mt-4 w-full rounded-xl border border-blue-300/20 bg-white/5 px-4 py-3 text-left text-lg font-black text-white hover:bg-white/10"
        >
          {showFields ? "v" : ">"} SMS Template Fields
        </button>
        {showFields && (
          <div className="mt-3 rounded-xl border border-blue-300/20 bg-slate-950/50 p-4 text-sm font-semibold text-blue-100">
          {"{tournament}"} tournament name, {"{player}"} player, {"{team}"} team, {"{court}"} court, {"{division}"} division, {"{line}"} line, {"{home}"} home team, {"{away}"} away team, {"{result}"} result, {"{status}"} tournament status.
          </div>
        )}

        <SmsTemplateTextArea
          label="Check-In Text"
          value={templates.checkIn}
          onChange={(value) => setTemplates((current) => ({ ...current, checkIn: value }))}
        />
        <SmsTemplateTextArea
          label="Court Ready Text"
          value={templates.courtReady}
          onChange={(value) => setTemplates((current) => ({ ...current, courtReady: value }))}
        />
        <SmsTemplateTextArea
          label="Return to Queue Text"
          value={templates.returnToQueue}
          onChange={(value) => setTemplates((current) => ({ ...current, returnToQueue: value }))}
        />
        <SmsTemplateTextArea
          label="Result Text"
          value={templates.result}
          onChange={(value) => setTemplates((current) => ({ ...current, result: value }))}
        />
        <SmsTemplateTextArea
          label="Broadcast Text"
          value={templates.broadcast}
          onChange={(value) => setTemplates((current) => ({ ...current, broadcast: value }))}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(actionLoading)}
            onClick={() => runAction("updateSmsTemplates", { templates })}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save SMS Templates
          </button>
          <button
            type="button"
            onClick={() => setTemplates(smsTemplateState())}
            className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
          >
            Restore Defaults
          </button>
        </div>
      </div>
      {showBroadcastPrompt && (
        <BroadcastTextModal
          state={state}
          divisions={activeDivisions}
          initialMessage={templates.broadcast}
          sending={actionLoading === "sendBroadcastText"}
          onClose={() => setShowBroadcastPrompt(false)}
          onSend={async ({ message, divisionIds }) => {
            const completed = await runAction("sendBroadcastText", { message, divisionIds });
            if (completed) setShowBroadcastPrompt(false);
          }}
        />
      )}
    </section>
  );
}

function BroadcastTextModal({ state, divisions, initialMessage, onClose, onSend, sending }) {
  const [message, setMessage] = useState(initialMessage || "");
  const [selectedDivisionIds, setSelectedDivisionIds] = useState(() => divisions.map((division) => String(division.id)));
  const recipientCount = useMemo(() => broadcastPhoneCount(state, selectedDivisionIds), [selectedDivisionIds, state]);

  function toggleDivision(divisionId) {
    const key = String(divisionId);
    setSelectedDivisionIds((current) =>
      current.includes(key) ? current.filter((id) => id !== key) : [...current, key]
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
      <div className="mx-auto max-w-2xl rounded-2xl border border-blue-300/30 bg-slate-900 p-5 text-white shadow-2xl">
        <h2 className="text-2xl font-black">Tournament Broadcast</h2>
        <div className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-3 text-lg font-black text-cyan-100">
          Sending to {recipientCount} phone number{recipientCount === 1 ? "" : "s"}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {divisions.map((division) => {
            const checked = selectedDivisionIds.includes(String(division.id));
            return (
              <label key={division.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-black ${checked ? "border-cyan-300/50 bg-blue-950 text-white" : "border-blue-300/20 bg-slate-950/60 text-blue-200"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDivision(division.id)}
                  className="size-4 accent-cyan-400"
                />
                {division.name}
              </label>
            );
          })}
        </div>
        <label className="mt-4 block text-sm font-black text-blue-200">
          Broadcast Text
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={8}
            className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 font-mono text-sm text-white"
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSend({ message, divisionIds: selectedDivisionIds })}
            disabled={sending || recipientCount === 0 || !message.trim() || selectedDivisionIds.length === 0}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Broadcast"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function SmsTemplateTextArea({ label, value, onChange }) {
  return (
    <label className="mt-4 block text-sm font-semibold text-blue-200">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 font-mono text-sm text-white"
      />
    </label>
  );
}

function LogTab({ state, runAction, actionLoading }) {
  const [showPhoneChanges, setShowPhoneChanges] = useState(false);
  const phoneChanges = useMemo(() => state.phoneChangeLog || phoneChangeLogRows(state.log), [state.log, state.phoneChangeLog]);
  const rows = showPhoneChanges ? phoneChanges : state.log;

  return (
    <section className="mt-5 rounded-2xl border border-blue-300/20 bg-slate-950/70 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black">Activity Log</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowPhoneChanges((value) => !value)}
            disabled={phoneChanges.length === 0}
            className={`w-fit rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${showPhoneChanges ? "bg-cyan-500 text-white" : "border border-blue-300/40 bg-blue-950 text-white hover:bg-blue-900"}`}
          >
            {showPhoneChanges ? "Show Full Log" : "Show Phone # Changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirmTypedAction("Clear the tournament activity log? This cannot be undone.", "CLEAR")) {
                runAction("clearLog");
              }
            }}
            disabled={Boolean(actionLoading) || state.log.length === 0}
            className="w-fit rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Log
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-blue-300/20 bg-blue-950/70 px-4 py-3 text-sm font-semibold text-blue-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-black text-white">{showPhoneChanges ? phoneChangeLabel(row) : row.log_type}</span>
              <span>{formatTime(row.created_at)}</span>
            </div>
            {showPhoneChanges ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div><span className="text-blue-300">Name:</span> {phoneChangeMetadata(row).playerName || "Player"}</div>
                <div><span className="text-blue-300">Old:</span> {phoneChangeMetadata(row).oldPhone || "blank"}</div>
                <div><span className="text-blue-300">New:</span> {phoneChangeMetadata(row).newPhone || "blank"}</div>
              </div>
            ) : (
              <div className="mt-1">{row.message}</div>
            )}
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm font-semibold text-blue-100">{showPhoneChanges ? "No phone number changes yet." : "No activity yet."}</div>}
      </div>
    </section>
  );
}

function ResultModal({ match, matches = [], smsEnabled, settings = {}, onClose, onSave, saving }) {
  const [resultType, setResultType] = useState(match.result_type || "completed");
  const scoreSettings = tournamentScoreSettings(settings);
  const [gameScores, setGameScores] = useState(() => resultGameScoresForMatch(match, scoreSettings.numberOfGames));
  const matchSummaryResult = tournamentMatchScoreSummary(gameScores, scoreSettings);
  const scoreValidationMessage = resultType === "completed" ? tournamentMatchScoreValidationMessage(gameScores, scoreSettings) : "";
  const defaultWinner =
    matchSummaryResult.winner === "home"
      ? match.home_team_id
      : matchSummaryResult.winner === "away"
        ? match.away_team_id
        : match.home_team_id;
  const [winnerTeamId, setWinnerTeamId] = useState(match.winner_team_id || defaultWinner);
  const requiredGameCount = requiredResultGameCount(gameScores, scoreSettings);
  const eliminationPreview = useMemo(
    () => resultEliminationPreview(match, matches, settings, winnerTeamId, resultType),
    [match, matches, resultType, settings, winnerTeamId]
  );

  useEffect(() => {
    if (resultType === "not_played") {
      setWinnerTeamId("");
    } else if (matchSummaryResult.winner === "home") {
      setWinnerTeamId(match.home_team_id);
    } else if (matchSummaryResult.winner === "away") {
      setWinnerTeamId(match.away_team_id);
    }
  }, [match.away_team_id, match.home_team_id, matchSummaryResult.winner, resultType]);

  function updateGameScore(index, side, value) {
    setGameScores((current) =>
      current.map((game, gameIndex) =>
        gameIndex === index
          ? { ...game, [side]: onlyDigits(value) }
          : game
      )
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-blue-300/30 bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Enter Result / Score</h2>
            <p className="mt-1 text-sm font-semibold text-blue-200">{matchSummary(match)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-blue-300/30 px-3 py-2 text-sm font-black text-white hover:bg-blue-950">
            Close
          </button>
        </div>
        {resultType === "completed" && (
          <div className="mt-3 rounded-xl border border-blue-300/20 bg-blue-950/60 px-4 py-3 text-sm font-black text-blue-100">
            {scoreSettings.numberOfGames === 1 ? "1 game" : `Best ${scoreSettings.gamesNeededToWin} of ${scoreSettings.numberOfGames}`} | Played to {scoreSettings.gamesPlayedTo}, win by {scoreSettings.winBy}{scoreSettings.rallyScoring ? ", Rally Scoring" : ""}
          </div>
        )}
        {scoreValidationMessage && (
          <div className="mt-3 rounded-xl border border-rose-300/30 bg-rose-950/60 px-4 py-3 text-sm font-black text-rose-100">
            {scoreValidationMessage}
          </div>
        )}

        {resultType === "completed" && (
          <div className="mt-5 space-y-3">
            {scoreSettings.numberOfGames > 1 ? (
              <div className="overflow-hidden rounded-2xl border border-blue-300/25 bg-blue-950/50">
                <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] gap-2 border-b border-blue-300/20 bg-slate-950/60 px-3 py-3 text-xs font-black uppercase text-blue-100 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]">
                  <div>Game</div>
                  <div className="truncate">{match.home_team?.name || "Home"}</div>
                  <div className="truncate">{match.away_team?.name || "Away"}</div>
                </div>
                <div className="divide-y divide-blue-300/15">
                  {gameScores.map((game, index) => {
                    const needed = index < requiredGameCount;
                    return (
                      <div key={index} className={`grid grid-cols-[5.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 px-3 py-3 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] ${needed ? "" : "bg-slate-950/45"}`}>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-black uppercase text-blue-100">Game {index + 1}</span>
                          {!needed && <span className="w-fit rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-black text-slate-200">Not needed</span>}
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`${match.home_team?.name || "Home"} Game ${index + 1} score`}
                          value={game.home}
                          disabled={!needed}
                          onChange={(event) => updateGameScore(index, "home", event.target.value)}
                          className="w-full rounded-xl border border-blue-300/30 bg-slate-950 px-3 py-3 text-center text-2xl font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                        />
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`${match.away_team?.name || "Away"} Game ${index + 1} score`}
                          value={game.away}
                          disabled={!needed}
                          onChange={(event) => updateGameScore(index, "away", event.target.value)}
                          className="w-full rounded-xl border border-blue-300/30 bg-slate-950 px-3 py-3 text-center text-2xl font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              gameScores.map((game, index) => {
                const needed = index < requiredGameCount;
                return (
                  <div key={index} className={`rounded-2xl border ${needed ? "border-blue-300/25 bg-blue-950/50" : "border-slate-600/40 bg-slate-950/50"} p-4`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-black uppercase text-blue-100">Game {index + 1}</h3>
                      {!needed && <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-black text-slate-200">Not needed</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm font-black text-blue-200">
                        {match.home_team?.name || "Home"}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={game.home}
                          disabled={!needed}
                          onChange={(event) => updateGameScore(index, "home", event.target.value)}
                          className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-2xl font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </label>
                      <label className="text-sm font-black text-blue-200">
                        {match.away_team?.name || "Away"}
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={game.away}
                          disabled={!needed}
                          onChange={(event) => updateGameScore(index, "away", event.target.value)}
                          className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-2xl font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </label>
                    </div>
                  </div>
                );
              })
            )}
            <div className="rounded-xl bg-slate-950/70 px-4 py-3 text-sm font-black text-blue-100">
              Game Wins: {match.home_team?.name || "Home"} {matchSummaryResult.homeWins} - {match.away_team?.name || "Away"} {matchSummaryResult.awayWins}
            </div>
          </div>
        )}

        <label className="mt-4 block text-sm font-black text-blue-200">
          Result Type
          <select value={resultType} onChange={(event) => setResultType(event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
            <option value="completed">Completed</option>
            <option value="forfeit">Forfeit</option>
            <option value="retired">Retired</option>
            <option value="not_played">Not Played</option>
          </select>
        </label>

        {resultType !== "not_played" && (
          <label className="mt-4 block text-sm font-black text-blue-200">
            Winner
            <select value={winnerTeamId || ""} onChange={(event) => setWinnerTeamId(event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
              <option value={match.home_team_id}>{match.home_team?.name || "Home"}</option>
              <option value={match.away_team_id}>{match.away_team?.name || "Away"}</option>
            </select>
          </label>
        )}

        {eliminationPreview && (
          <div className="mt-4 rounded-xl border border-rose-300/35 bg-rose-950/65 px-4 py-3 text-sm font-black text-rose-100">
            <span className="mr-2 inline-flex rounded-full bg-rose-500 px-2 py-1 text-[11px] text-white">D</span>
            {eliminationPreview.teamName} will be out if this result is saved.
          </div>
        )}

        <button
          type="button"
          disabled={saving || Boolean(scoreValidationMessage)}
          onClick={() => onSave({
            matchId: match.id,
            resultType,
            homeScore: matchSummaryResult.homePoints,
            awayScore: matchSummaryResult.awayPoints,
            gameScores: trimmedResultGameScores(gameScores, scoreSettings),
            winnerTeamId,
            smsEnabled,
            scoreText: resultType === "not_played" ? "Not played" : resultScoreText(gameScores, scoreSettings),
          })}
          className="mt-5 w-full rounded-xl bg-cyan-500 px-5 py-3 font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Result"}
        </button>
      </div>
    </div>
  );
}

function EmptyPanel({ title, message }) {
  return (
    <section className="mt-5 rounded-2xl border border-blue-300/20 bg-slate-950/70 p-5">
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-blue-100">{message}</p>
    </section>
  );
}

function groupedDivisionStandings(matches, teams, divisions, settings = {}) {
  const teamRecords = Object.fromEntries((teams || []).map((team) => [team.id, team]));
  const divisionsById = Object.fromEntries((divisions || []).map((division) => [division.id, division]));
  const activeDivisionIds = new Set((divisions || []).filter((division) => division.is_active).map((division) => String(division.id)));
  const standings = {};

  (teams || []).filter((team) => activeDivisionIds.has(String(team.division_id))).forEach((team) => {
    const divisionName = divisionsById[team.division_id]?.name || "Unassigned";
    const teamName = team.name || "Team";
    const key = `${divisionName}|${teamName}`;
    standings[divisionName] ||= {};
    standings[divisionName][key] ||= blankGroupedStanding(key, teamName);
    standings[divisionName][key].teamIds.add(String(team.id));
    const standing = regularSeasonStandingValue(team);
    if (standing) {
      standings[divisionName][key].regularSeasonStandings.add(standing);
    }
  });

  (matches || [])
    .filter((match) => !isBracketMatch(match) && activeDivisionIds.has(String(match.division_id)) && match.status === "done" && match.result_type !== "not_played")
    .forEach((match) => {
      const divisionName = match.division?.name || "Unassigned";
      standings[divisionName] ||= {};

      const home = ensureGroupedStanding(standings[divisionName], divisionName, match.home_team || teamRecords[match.home_team_id], match.home_team_id);
      const away = ensureGroupedStanding(standings[divisionName], divisionName, match.away_team || teamRecords[match.away_team_id], match.away_team_id);
      const homeScore = Number(match.home_score || 0);
      const awayScore = Number(match.away_score || 0);

      home.pf += homeScore;
      home.pa += awayScore;
      away.pf += awayScore;
      away.pa += homeScore;

      const winnerId = String(match.winner_team_id || "");
      if (winnerId && home.teamIds.has(winnerId)) {
        home.w += 1;
        away.l += 1;
      } else if (winnerId && away.teamIds.has(winnerId)) {
        away.w += 1;
        home.l += 1;
      } else if (homeScore > awayScore) {
        home.w += 1;
        away.l += 1;
      } else if (awayScore > homeScore) {
        away.w += 1;
        home.l += 1;
      }
    });

  return Object.fromEntries(
    Object.entries(standings).map(([division, rows]) => [
      division,
      Object.values(rows)
        .map((row) => ({
          ...row,
          teamIds: [...row.teamIds],
          regularSeasonStandings: [...row.regularSeasonStandings].sort((a, b) => a - b),
        }))
        .sort((a, b) => compareGroupedStandingRows(a, b, settings?.standingsRules)),
    ])
  );
}

function ensureGroupedStanding(divisionRows, divisionName, team, teamId) {
  const teamName = team?.name || "Team";
  const key = `${divisionName}|${teamName}`;
  divisionRows[key] ||= blankGroupedStanding(key, teamName);
  if (teamId) divisionRows[key].teamIds.add(String(teamId));
  const standing = regularSeasonStandingValue(team);
  if (standing) divisionRows[key].regularSeasonStandings.add(standing);
  return divisionRows[key];
}

function blankGroupedStanding(key, team) {
  return {
    key,
    team,
    teamIds: new Set(),
    regularSeasonStandings: new Set(),
    w: 0,
    l: 0,
    pf: 0,
    pa: 0,
  };
}

function matchesForStandingTeam(matches, team) {
  const ids = new Set((team.teamIds || []).map(String));
  const teamName = team.team;

  return (matches || [])
    .filter((match) =>
      ids.has(String(match.home_team_id)) ||
      ids.has(String(match.away_team_id)) ||
      match.home_team?.name === teamName ||
      match.away_team?.name === teamName
    )
    .sort((a, b) =>
      Number(a.line_number || 1) - Number(b.line_number || 1) ||
      statusOrder(a.status) - statusOrder(b.status) ||
      Number(a.created_order || 0) - Number(b.created_order || 0)
    );
}

function teamStandingLabel(row) {
  if (row.regularSeasonStandings?.length > 0) {
    return `${row.team} (${row.regularSeasonStandings.join(", ")})`;
  }

  return tournamentStandingLabel({
    team: row.team || row.name,
    regularSeasonStanding: regularSeasonStandingValue(row),
  });
}

function compareGroupedStandingRows(a, b, rules = []) {
  const normalizedRules = standingsRulesState(rules);

  for (const rule of normalizedRules) {
    if (rule === "regular_season_standing") {
      const aStanding = Number(a.regularSeasonStandings?.[0] || Number.MAX_SAFE_INTEGER);
      const bStanding = Number(b.regularSeasonStandings?.[0] || Number.MAX_SAFE_INTEGER);
      if (aStanding !== bStanding) return aStanding - bStanding;
    } else if (rule === "losses") {
      if (Number(a.l || 0) !== Number(b.l || 0)) return Number(a.l || 0) - Number(b.l || 0);
    } else if (rule === "point_differential") {
      const aDiff = Number(a.pf || 0) - Number(a.pa || 0);
      const bDiff = Number(b.pf || 0) - Number(b.pa || 0);
      if (aDiff !== bDiff) return bDiff - aDiff;
    } else if (rule === "points_for") {
      if (Number(a.pf || 0) !== Number(b.pf || 0)) return Number(b.pf || 0) - Number(a.pf || 0);
    } else if (rule === "points_against") {
      if (Number(a.pa || 0) !== Number(b.pa || 0)) return Number(a.pa || 0) - Number(b.pa || 0);
    } else if (Number(a.w || 0) !== Number(b.w || 0)) {
      return Number(b.w || 0) - Number(a.w || 0);
    }
  }

  return String(a.team || "").localeCompare(String(b.team || ""));
}

function teamReady(team) {
  return Boolean(team.player_1_checked_in && team.player_2_checked_in);
}

function compareTournamentTeamsByName(a, b) {
  return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true, sensitivity: "base" }) ||
    Number(a.line_number || 1) - Number(b.line_number || 1) ||
    Number(regularSeasonStandingValue(a) || 999) - Number(regularSeasonStandingValue(b) || 999) ||
    String(a.id || "").localeCompare(String(b.id || ""));
}

function duplicateTournamentTeamLine(teams, teamId, teamName, lineNumber) {
  const cleanName = normalizeName(teamName);
  const cleanLine = Number(lineNumber || 1);
  if (!cleanName || !Number.isFinite(cleanLine)) return false;

  return (teams || []).some((team) =>
    String(team.id) !== String(teamId) &&
    normalizeName(team.name) === cleanName &&
    Number(team.line_number || 1) === cleanLine
  );
}

function selectedTournamentDivisionName(divisions, divisionId) {
  return (divisions || []).find((division) => String(division.id) === String(divisionId))?.name || "";
}

function addTeamValidationMessages(state, form, selectedSourceTeam, teamTotal, divisionTeamMax, isElimination = false) {
  const messages = [];
  const player1Id = String(form.player1MemberId || "");
  const player2Id = String(form.player2MemberId || "");
  const lineNumber = Number(form.lineNumber);

  if (isElimination && !String(form.divisionId || "").trim()) {
    messages.push("Division is required.");
  }

  if (!isElimination && !String(form.lineNumber || "").trim()) {
    messages.push("Line is required.");
  }

  if (!isElimination && !String(form.regularSeasonStanding || "").trim()) {
    messages.push("Regular Season Standing is required.");
  }

  if (isElimination && !String(form.regularSeasonStanding || "").trim()) {
    messages.push("Standings is required.");
  }

  if (!player1Id || !player2Id) {
    messages.push("Both players must be selected.");
  }

  if (player1Id && player2Id && player1Id === player2Id) {
    messages.push("The same player cannot be entered twice on the same team.");
  }

  const usedPlayer = (state.contacts || []).find((contact) =>
    contact.member_id && [player1Id, player2Id].includes(String(contact.member_id))
  );
  if (usedPlayer) {
    messages.push(`${usedPlayer.display_name || "A selected player"} is already on another tournament team.`);
  }

  const duplicateTeamName = isElimination && (state.teams || []).some((team) =>
    String(team.division_id || "") === String(form.divisionId || "") &&
    normalizeName(team.name) === normalizeName(form.name)
  );
  if (duplicateTeamName) {
    messages.push("A tournament team already exists with this Team Name in that Division.");
  }

  const max = Number(divisionTeamMax);
  if (Number.isFinite(max) && max > 0 && teamTotal !== "" && Number(teamTotal) > max) {
    messages.push("The players' total rating must be at or below the Division Team Max.");
  }

  if (!isElimination && selectedSourceTeam && Number.isFinite(lineNumber)) {
    const duplicateMainTeamLine = (state.teams || []).some((team) =>
      normalizeName(team.name) === normalizeName(selectedSourceTeam.name) &&
      Number(team.line_number || 1) === lineNumber
    );
    if (duplicateMainTeamLine) {
      messages.push("That Main System Team already has a tournament team with this Line #.");
    }
  }

  return [...new Set(messages)];
}

function updateTournamentTeamState(setState, teamId, updates) {
  setState((current) => {
    if (!current) return current;

    return {
      ...current,
      teams: (current.teams || []).map((team) =>
        String(team.id) === String(teamId) ? { ...team, ...updates } : team
      ),
      matches: (current.matches || []).map((match) => ({
        ...match,
        home_team: String(match.home_team_id) === String(teamId) && match.home_team
          ? { ...match.home_team, ...updates }
          : match.home_team,
        away_team: String(match.away_team_id) === String(teamId) && match.away_team
          ? { ...match.away_team, ...updates }
          : match.away_team,
      })),
    };
  });
}

function updateTournamentContactPhoneState(setState, details) {
  setState((current) => {
    if (!current) return current;

    const teamKey = String(details.teamId);
    const slot = Number(details.slot);
    let foundContact = false;
    const contacts = (current.contacts || []).map((contact) => {
      if (String(contact.tournament_team_id) !== teamKey || Number(contact.player_slot) !== slot) return contact;
      foundContact = true;
      return {
        ...contact,
        member_id: details.memberId || contact.member_id,
        display_name: details.displayName || contact.display_name,
        phone: details.phone,
      };
    });

    if (!foundContact) {
      contacts.push({
        id: `local-${teamKey}-${slot}`,
        tournament_team_id: details.teamId,
        player_slot: slot,
        member_id: details.memberId || null,
        display_name: details.displayName || null,
        phone: details.phone,
      });
    }

    return { ...current, contacts };
  });
}

function addLocalPhoneChangeLog(setState, metadata) {
  setState((current) => {
    if (!current) return current;

    const now = new Date().toISOString();
    const message = `${metadata.playerName || "Player"} phone changed from ${metadata.oldPhone || "blank"} to ${metadata.newPhone || "blank"}.`;
    const row = {
      id: `local-phone-change-${metadata.teamId}-${metadata.playerSlot}-${Date.now()}`,
      tournament_id: current.tournament?.id || "",
      log_type: "phone_change",
      message,
      metadata,
      created_at: now,
    };

    return {
      ...current,
      log: [row, ...(current.log || [])],
      phoneChangeLog: [row, ...(current.phoneChangeLog || [])],
    };
  });
}

function playerSummary(team, contacts, slot) {
  const contact = (contacts || []).find((row) => Number(row.player_slot) === slot);
  const name = slot === 1 ? team.player_1_name : team.player_2_name;
  const phone = contact?.phone;
  return [
    name || `Player ${slot}`,
    phone ? `(${phone})` : "",
  ].filter(Boolean).join(" ");
}

function teamMatchesPlayerFilter(team, contacts, query) {
  const cleanQuery = String(query || "").trim().toLowerCase();
  if (!cleanQuery) return true;

  const queryDigits = cleanQuery.replace(/\D/g, "");
  const candidates = [
    team.player_1_name,
    team.player_2_name,
    ...(contacts || []).flatMap((contact) => [contact.display_name, contact.phone]),
  ];

  return candidates.some((value) => {
    const text = String(value || "").toLowerCase();
    if (text.includes(cleanQuery)) return true;
    return Boolean(queryDigits && text.replace(/\D/g, "").includes(queryDigits));
  });
}

function playerDisplayName(team, contacts, slot) {
  const contact = (contacts || []).find((row) => Number(row.player_slot) === slot);
  const name = slot === 1 ? team.player_1_name : team.player_2_name;
  return contact?.display_name || name || `Player ${slot}`;
}

function playerPhoneFromContacts(contacts, slot) {
  const contact = (contacts || []).find((row) => Number(row.player_slot) === slot);
  return contact?.phone || "";
}

function playerMemberIdFromContacts(contacts, slot) {
  const contact = (contacts || []).find((row) => Number(row.player_slot) === slot);
  return contact?.member_id || "";
}

function broadcastPhoneCount(state, selectedDivisionIds = []) {
  const selectedDivisionSet = new Set((selectedDivisionIds || []).map((divisionId) => String(divisionId)));
  if (selectedDivisionSet.size === 0) return 0;
  const teamsById = (state.teams || []).reduce((map, team) => {
    map[String(team.id)] = team;
    return map;
  }, {});
  const phones = new Set();

  (state.contacts || []).forEach((contact) => {
    const team = teamsById[String(contact.tournament_team_id)];
    if (!team || !contact.phone) return;
    if (selectedDivisionSet.size > 0 && !selectedDivisionSet.has(String(team.division_id || ""))) return;
    phones.add(contact.phone);
  });

  return phones.size;
}

function phoneChangeLogRows(logRows = []) {
  return (logRows || []).filter((row) => row.log_type === "phone_change");
}

function phoneChangeMetadata(row) {
  if (!row?.metadata) return {};
  if (typeof row.metadata === "string") {
    try {
      return JSON.parse(row.metadata);
    } catch {
      return {};
    }
  }
  return row.metadata;
}

function phoneChangeLabel(row) {
  const metadata = phoneChangeMetadata(row);
  return metadata.teamName ? `Phone Change - ${metadata.teamName}` : "Phone Change";
}

function emptyTournamentTeam() {
  return {
    id: "",
    name: "",
    line_number: 1,
    seed: "",
    player_1_name: "",
    player_2_name: "",
  };
}

function emptyTeamFormState() {
  return {
    name: "",
    lineNumber: 1,
    sourceTeamId: "",
    divisionId: "",
    regularSeasonStanding: "",
    player1MemberId: "",
    player1Name: "",
    player1Phone: "",
    player1Rating: "",
    player2MemberId: "",
    player2Name: "",
    player2Phone: "",
    player2Rating: "",
  };
}

function teamFormState(team, contacts, sourceTeams = []) {
  const p1 = (contacts || []).find((contact) => Number(contact.player_slot) === 1) || {};
  const p2 = (contacts || []).find((contact) => Number(contact.player_slot) === 2) || {};
  const matchedSourceTeam = sourceTeams.find((sourceTeam) => normalizeName(sourceTeam.name) === normalizeName(team.name));
  return {
    name: team.name || "",
    lineNumber: team.line_number || 1,
    sourceTeamId: team.source_team_id || matchedSourceTeam?.id || "",
    divisionId: team.division_id || "",
    regularSeasonStanding: regularSeasonStandingValue(team) || "",
    player1MemberId: p1.member_id || "",
    player1Name: team.player_1_name || p1.display_name || "",
    player1Phone: p1.phone || "",
    player1Rating: "",
    player2MemberId: p2.member_id || "",
    player2Name: team.player_2_name || p2.display_name || "",
    player2Phone: p2.phone || "",
    player2Rating: "",
  };
}

function teamSavePayload(team, form) {
  return {
    teamId: team.id,
    name: form.name,
    lineNumber: form.lineNumber,
    sourceTeamId: form.sourceTeamId,
    divisionId: form.divisionId,
    regularSeasonStanding: form.regularSeasonStanding,
    player1MemberId: form.player1MemberId,
    player1Name: form.player1Name,
    player1Phone: form.player1Phone,
    player1Rating: form.player1Rating,
    player2MemberId: form.player2MemberId,
    player2Name: form.player2Name,
    player2Phone: form.player2Phone,
    player2Rating: form.player2Rating,
  };
}

function memberDisplayName(member = {}) {
  return member.full_name || [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email || "Member";
}

function sortedSourceTeams(sourceTeams) {
  return [...(sourceTeams || [])].sort((a, b) =>
    String(a.divisions?.name || "").localeCompare(String(b.divisions?.name || "")) ||
    String(a.name || "").localeCompare(String(b.name || ""))
  );
}

function uniqueRosterPlayers(sourceRosters) {
  const byMember = new Map();
  (sourceRosters || []).forEach((row) => {
    if (!row.member_id || byMember.has(String(row.member_id))) return;
    byMember.set(String(row.member_id), row);
  });

  return [...byMember.values()].sort((a, b) =>
    String(a.members?.first_name || "").localeCompare(String(b.members?.first_name || "")) ||
    memberDisplayName(a.members).localeCompare(memberDisplayName(b.members))
  );
}

function playerRatingForSource(row, ratings, sourceTeams) {
  const sourceTeam = sourceTeams.find((team) => String(team.id) === String(row.team_id));
  const seasonId = sourceTeam?.divisions?.leagues?.season_id;
  const ratingType = sourceTeam?.divisions?.rating_type || "dupr";
  const rating = (ratings || []).find((item) =>
    String(item.member_id) === String(row.member_id) &&
    (!seasonId || String(item.season_id) === String(seasonId))
  );

  if (ratingType === "primetime") return rating?.season_primetime_rating || "";
  if (ratingType === "self_rating") return row.members?.self_rating || "";
  return rating?.season_dupr_rating || row.members?.self_rating || "";
}

function teamTotalRating(team, contacts, state) {
  const total = [1, 2].reduce((sum, slot) => {
    const contact = (contacts || []).find((row) => Number(row.player_slot) === slot);
    const rosterRow = (state.sourceRosters || []).find((row) => String(row.member_id) === String(contact?.member_id));
    const rating = rosterRow ? playerRatingForSource(rosterRow, state.sourceRatings || [], state.sourceTeams || []) : "";
    const number = Number(rating);
    return Number.isFinite(number) ? sum + number : sum;
  }, 0);

  return total > 0 ? total.toFixed(2) : "";
}

function shouldReplaceGeneratedTeamName(currentName, player1Name, player2Name) {
  const clean = String(currentName || "").trim();
  if (!clean) return true;
  return normalizeName(clean) === normalizeName(eliminationTeamName(player1Name, player2Name));
}

function eliminationTeamName(player1Name, player2Name) {
  return [player1Name, player2Name]
    .map((name) => {
      const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
      return parts[parts.length - 1];
    })
    .filter(Boolean)
    .join(" / ");
}

function teamTotalFromForm(form) {
  const ratings = [form.player1Rating, form.player2Rating]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (ratings.length === 0) return "";
  return ratings.reduce((sum, rating) => sum + rating, 0).toFixed(2);
}

function formatRatingDisplay(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "NR";
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function regularSeasonStandingValue(team) {
  const value = team?.regularSeasonStanding ?? team?.seed;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function standingsRulesState(value) {
  const cleanRules = (Array.isArray(value) ? value : [])
    .filter((rule) => STANDINGS_RULE_OPTIONS.some((option) => option.value === rule));
  return [...cleanRules, ...DEFAULT_STANDINGS_RULES].slice(0, 4);
}

function matchResultText(match) {
  if (match.status !== "done") return "";
  if (match.result_type === "not_played") return "Not played";
  if (match.winner_team?.name) return `Winner: ${match.winner_team.name}`;
  if (Number(match.home_score || 0) > Number(match.away_score || 0)) return `Winner: ${match.home_team?.name || "Home"}`;
  if (Number(match.away_score || 0) > Number(match.home_score || 0)) return `Winner: ${match.away_team?.name || "Away"}`;
  return "";
}

function statusOrder(status) {
  if (status === "playing") return 0;
  if (status === "pending") return 1;
  if (status === "done") return 2;
  return 3;
}

function teamCountsByDivision(teams) {
  return (teams || []).reduce((counts, team) => {
    const key = String(team.division_id || "");
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function courtNamesString(courts) {
  return (courts || [])
    .map((court) => court.name)
    .filter(Boolean)
    .join(", ");
}

function courtLabelsFromCourts(courts) {
  const labels = (courts || [])
    .map((court) => court.name)
    .filter(Boolean);
  return labels.length > 0 ? labels : [""];
}

function courtLabelsForCount(labels, count) {
  return Array.from({ length: count }, (_, index) => labels[index] || "");
}

function exportMatchesCsv(state, selectedDivisionIds = []) {
  const contactsByTeam = contactsByTournamentTeam(state.contacts);
  const teamsById = teamsByTournamentId(state.teams);
  const selectedDivisionSet = selectedDivisionIdSet(selectedDivisionIds);
  const rows = [
    [
      "Match ID", "Division", "Line", "Status", "Court", "Result Type", "Winner",
      "Home Team", "Home Line", "Home Seed", "Home Player 1", "Home Player 1 Phone", "Home Player 2", "Home Player 2 Phone",
      "Away Team", "Away Line", "Away Seed", "Away Player 1", "Away Player 1 Phone", "Away Player 2", "Away Player 2 Phone",
      "Game 1 Home", "Game 1 Away", "Game 2 Home", "Game 2 Away", "Game 3 Home", "Game 3 Away", "Game 4 Home", "Game 4 Away", "Game 5 Home", "Game 5 Away",
      "Home Game Wins", "Away Game Wins", "Home Total Points", "Away Total Points", "Compact Score", "Assigned At", "Completed At", "Game Length",
    ],
    ...selectedTournamentMatches(state.matches, selectedDivisionSet).map((match) => {
      const homeTeam = teamsById[String(match.home_team_id)] || match.home_team || {};
      const awayTeam = teamsById[String(match.away_team_id)] || match.away_team || {};
      const homeContacts = contactsByTeam[String(match.home_team_id)] || [];
      const awayContacts = contactsByTeam[String(match.away_team_id)] || [];
      const games = matchGames(match);
      const totals = gameTotals(games);

      return [
        match.legacy_id || match.id,
        match.division?.name || "",
        matchLineLabel(match),
        match.status || "",
        match.court?.name || "",
        match.result_type || "",
        match.winner_team?.name || winnerNameFromMatch(match),
        homeTeam.name || "",
        homeTeam.line_number || match.line_number || "",
        regularSeasonStandingValue(homeTeam) || "",
        playerName(homeTeam, homeContacts, 1),
        playerPhone(homeContacts, 1),
        playerName(homeTeam, homeContacts, 2),
        playerPhone(homeContacts, 2),
        awayTeam.name || "",
        awayTeam.line_number || match.line_number || "",
        regularSeasonStandingValue(awayTeam) || "",
        playerName(awayTeam, awayContacts, 1),
        playerPhone(awayContacts, 1),
        playerName(awayTeam, awayContacts, 2),
        playerPhone(awayContacts, 2),
        gameScore(games, 0, "home"),
        gameScore(games, 0, "away"),
        gameScore(games, 1, "home"),
        gameScore(games, 1, "away"),
        gameScore(games, 2, "home"),
        gameScore(games, 2, "away"),
        gameScore(games, 3, "home"),
        gameScore(games, 3, "away"),
        gameScore(games, 4, "home"),
        gameScore(games, 4, "away"),
        totals.homeWins,
        totals.awayWins,
        totals.homePoints,
        totals.awayPoints,
        scoreDisplay(match),
        csvDateTime(match.assigned_at),
        csvDateTime(match.completed_at),
        matchDurationText(match),
      ];
    }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `${slugify(state.tournament.name || "tournament")}-matches-detailed.csv`;
  downloadCsv(csv, fileName);
}

function exportDuprCsv(state, selectedDivisionIds = []) {
  const contactsByTeam = contactsByTournamentTeam(state.contacts);
  const teamsById = teamsByTournamentId(state.teams);
  const duprByMemberId = duprIdsByMemberId(state.sourceRosters);
  const selectedDivisionSet = selectedDivisionIdSet(selectedDivisionIds);
  const rows = [
    [
      "matchType", "scoreType", "event", "date",
      "playerA1", "playerA1DuprId", "playerA2", "playerA2DuprId",
      "playerB1", "playerB1DuprId", "playerB2", "playerB2DuprId",
      "teamAGame1", "teamBGame1", "teamAGame2", "teamBGame2", "teamAGame3", "teamBGame3", "teamAGame4", "teamBGame4", "teamAGame5", "teamBGame5",
    ],
    ...selectedTournamentMatches(state.matches, selectedDivisionSet)
      .filter((match) => match.status === "done" && match.result_type !== "not_played" && matchGames(match).length > 0)
      .map((match) => {
        const homeTeam = teamsById[String(match.home_team_id)] || match.home_team || {};
        const awayTeam = teamsById[String(match.away_team_id)] || match.away_team || {};
        const homeContacts = contactsByTeam[String(match.home_team_id)] || [];
        const awayContacts = contactsByTeam[String(match.away_team_id)] || [];
        const games = matchGames(match);

        return [
          "D",
          "SIDEOUT",
          state.tournament.name || "LWR Pickleball Club DUPR League",
          csvDate(match.completed_at || match.assigned_at || match.updated_at),
          playerName(homeTeam, homeContacts, 1),
          playerDuprId(homeContacts, duprByMemberId, 1),
          playerName(homeTeam, homeContacts, 2),
          playerDuprId(homeContacts, duprByMemberId, 2),
          playerName(awayTeam, awayContacts, 1),
          playerDuprId(awayContacts, duprByMemberId, 1),
          playerName(awayTeam, awayContacts, 2),
          playerDuprId(awayContacts, duprByMemberId, 2),
          gameScore(games, 0, "home"),
          gameScore(games, 0, "away"),
          gameScore(games, 1, "home"),
          gameScore(games, 1, "away"),
          gameScore(games, 2, "home"),
          gameScore(games, 2, "away"),
          gameScore(games, 3, "home"),
          gameScore(games, 3, "away"),
          gameScore(games, 4, "home"),
          gameScore(games, 4, "away"),
        ];
      }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `${slugify(state.tournament.name || "tournament")}-dupr-export.csv`;
  downloadCsv(csv, fileName);
}

function selectedDivisionIdSet(selectedDivisionIds = []) {
  return new Set((selectedDivisionIds || []).map((divisionId) => String(divisionId)));
}

function selectedTournamentMatches(matches = [], selectedDivisionSet) {
  return (matches || []).filter((match) =>
    selectedDivisionSet.size === 0 || selectedDivisionSet.has(String(match.division_id || ""))
  );
}

function contactsByTournamentTeam(contacts = []) {
  return (contacts || []).reduce((map, contact) => {
    const key = String(contact.tournament_team_id || "");
    map[key] = [...(map[key] || []), contact];
    return map;
  }, {});
}

function teamsByTournamentId(teams = []) {
  return (teams || []).reduce((map, team) => {
    map[String(team.id || "")] = team;
    return map;
  }, {});
}

function duprIdsByMemberId(sourceRosters = []) {
  return (sourceRosters || []).reduce((map, row) => {
    if (row.member_id) map[String(row.member_id)] = row.members?.dupr_id || "";
    return map;
  }, {});
}

function playerContact(contacts, slot) {
  return (contacts || []).find((contact) => Number(contact.player_slot) === Number(slot)) || {};
}

function playerName(team, contacts, slot) {
  const contact = playerContact(contacts, slot);
  if (contact.display_name) return contact.display_name;
  return slot === 1 ? team?.player_1_name || "" : team?.player_2_name || "";
}

function playerPhone(contacts, slot) {
  return playerContact(contacts, slot).phone || "";
}

function playerDuprId(contacts, duprByMemberId, slot) {
  const contact = playerContact(contacts, slot);
  return duprByMemberId[String(contact.member_id || "")] || "";
}

function matchGames(match) {
  if (Array.isArray(match?.game_scores) && match.game_scores.length > 0) {
    return match.game_scores
      .map((game) => ({ home: numberOrBlank(game.home), away: numberOrBlank(game.away) }))
      .filter((game) => game.home !== "" || game.away !== "");
  }

  if (match?.home_score !== null && match?.home_score !== undefined) {
    return [{ home: numberOrBlank(match.home_score), away: numberOrBlank(match.away_score) }];
  }

  return [];
}

function gameScore(games, index, side) {
  return games[index]?.[side] ?? "";
}

function gameTotals(games) {
  return (games || []).reduce((totals, game) => {
    const home = Number(game.home);
    const away = Number(game.away);
    if (Number.isFinite(home)) totals.homePoints += home;
    if (Number.isFinite(away)) totals.awayPoints += away;
    if (Number.isFinite(home) && Number.isFinite(away)) {
      if (home > away) totals.homeWins += 1;
      if (away > home) totals.awayWins += 1;
    }
    return totals;
  }, { homeWins: 0, awayWins: 0, homePoints: 0, awayPoints: 0 });
}

function winnerNameFromMatch(match) {
  const home = Number(match.home_score);
  const away = Number(match.away_score);
  if (!Number.isFinite(home) || !Number.isFinite(away) || home === away) return "";
  return home > away ? match.home_team?.name || "" : match.away_team?.name || "";
}

function numberOrBlank(value) {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function positiveIntegerOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function tournamentScoreSettings(settings = {}) {
  const numberOfGames = positiveIntegerOrDefault(settings.numberOfGames, legacyNumberOfGames(settings.matchFormat));
  return {
    numberOfGames,
    gamesNeededToWin: Math.floor(numberOfGames / 2) + 1,
    gamesPlayedTo: positiveIntegerOrDefault(settings.gamesPlayedTo, 11),
    winBy: positiveIntegerOrDefault(settings.winBy, 2),
    rallyScoring: settings.rallyScoring === true,
  };
}

function legacyNumberOfGames(matchFormat) {
  const value = String(matchFormat || "");
  if (/best\s*2\s*(of|out of)\s*3/i.test(value)) return 3;
  const numberMatch = value.match(/\d+/);
  return numberMatch ? Number(numberMatch[0]) : 1;
}

function tournamentScoreValidationMessage(homeScore, awayScore, settings = {}) {
  if (homeScore === "" || awayScore === "") return "Enter both team scores.";

  const home = Number(homeScore);
  const away = Number(awayScore);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return "Enter valid numeric scores.";
  if (home < 0 || away < 0) return "Scores cannot be negative.";
  if (home === away) return "Completed matches cannot end in a tie.";

  const scoreSettings = tournamentScoreSettings(settings);
  const winner = Math.max(home, away);
  const loser = Math.min(home, away);
  if (winner < scoreSettings.gamesPlayedTo) return `Winning score must be at least ${scoreSettings.gamesPlayedTo}.`;
  if (scoreSettings.winBy <= 1 && winner > scoreSettings.gamesPlayedTo) {
    return `Winning score cannot be more than ${scoreSettings.gamesPlayedTo} when Win By is 1.`;
  }
  if (winner - loser < scoreSettings.winBy) return `Winning margin must be at least ${scoreSettings.winBy}.`;
  return "";
}

function resultGameScoresForMatch(match, numberOfGames) {
  const existingGames = matchGames(match);
  const sourceGames = existingGames.length > 0
    ? existingGames
    : match?.home_score !== null && match?.home_score !== undefined
      ? [{ home: numberOrBlank(match.home_score), away: numberOrBlank(match.away_score) }]
      : [];

  return Array.from({ length: numberOfGames }, (_, index) => ({
    home: sourceGames[index]?.home === undefined ? "" : String(sourceGames[index].home),
    away: sourceGames[index]?.away === undefined ? "" : String(sourceGames[index].away),
  }));
}

function requiredResultGameCount(gameScores, settings = {}) {
  let homeWins = 0;
  let awayWins = 0;

  for (let index = 0; index < settings.numberOfGames; index += 1) {
    if (index > 0 && (homeWins >= settings.gamesNeededToWin || awayWins >= settings.gamesNeededToWin)) {
      return index;
    }

    const game = gameScores[index] || {};
    if (game.home === "" || game.away === "") {
      return Math.max(index + 1, settings.numberOfGames === 1 ? 1 : settings.gamesNeededToWin);
    }

    const home = Number(game.home);
    const away = Number(game.away);
    if (Number.isFinite(home) && Number.isFinite(away)) {
      if (home > away) homeWins += 1;
      if (away > home) awayWins += 1;
    }
  }

  return settings.numberOfGames;
}

function trimmedResultGameScores(gameScores, settings = {}) {
  return (gameScores || [])
    .slice(0, requiredResultGameCount(gameScores, settings))
    .map((game) => ({ home: numberOrBlank(game.home), away: numberOrBlank(game.away) }))
    .filter((game) => game.home !== "" || game.away !== "");
}

function tournamentMatchScoreSummary(gameScores, settings = {}) {
  return trimmedResultGameScores(gameScores, settings).reduce((summary, game) => {
    const home = Number(game.home);
    const away = Number(game.away);
    if (!Number.isFinite(home) || !Number.isFinite(away)) return summary;

    summary.homePoints += home;
    summary.awayPoints += away;
    if (home > away) summary.homeWins += 1;
    if (away > home) summary.awayWins += 1;
    summary.winner = summary.homeWins > summary.awayWins ? "home" : summary.awayWins > summary.homeWins ? "away" : "";
    return summary;
  }, { homeWins: 0, awayWins: 0, homePoints: 0, awayPoints: 0, winner: "" });
}

function tournamentMatchScoreValidationMessage(gameScores, settings = {}) {
  const requiredCount = requiredResultGameCount(gameScores, settings);
  let homeWins = 0;
  let awayWins = 0;

  for (let index = 0; index < requiredCount; index += 1) {
    const game = gameScores[index] || {};
    const gameMessage = tournamentScoreValidationMessage(game.home, game.away, settings);
    if (gameMessage) return `Game ${index + 1}: ${gameMessage}`;

    const home = Number(game.home);
    const away = Number(game.away);
    if (home > away) homeWins += 1;
    if (away > home) awayWins += 1;
  }

  if (homeWins < settings.gamesNeededToWin && awayWins < settings.gamesNeededToWin) {
    return `Enter enough game scores for one team to win ${settings.gamesNeededToWin} game${settings.gamesNeededToWin === 1 ? "" : "s"}.`;
  }

  return "";
}

function resultEliminationPreview(match, matches, settings = {}, winnerTeamId, resultType) {
  if (!match?.legacy_id?.startsWith("BR|")) return null;
  if (resultType === "not_played") return null;
  const format = tournamentFormat(settings);
  if (!["single_elimination", "double_elimination"].includes(format)) return null;
  const loserId = resultLoserTeamId(match, winnerTeamId);
  if (!loserId) return null;

  const priorLosses = bracketLossCountBeforeMatch(matches, match, loserId);
  const maxLosses = format === "double_elimination" ? 2 : 1;
  if (priorLosses + 1 < maxLosses) return null;

  return {
    teamId: loserId,
    teamName: String(match.home_team_id || "") === String(loserId)
      ? match.home_team?.name || "Home"
      : match.away_team?.name || "Away",
  };
}

function resultLoserTeamId(match, winnerTeamId) {
  const winner = String(winnerTeamId || "");
  if (!winner) return "";
  if (String(match.home_team_id || "") === winner) return String(match.away_team_id || "");
  if (String(match.away_team_id || "") === winner) return String(match.home_team_id || "");
  return "";
}

function bracketLossCountBeforeMatch(matches, currentMatch, teamId) {
  const currentOrder = Number(currentMatch?.created_order || Number.MAX_SAFE_INTEGER);
  return (matches || []).filter((match) => {
    if (String(match.id) === String(currentMatch.id)) return false;
    if (!match.legacy_id?.startsWith("BR|")) return false;
    if (match.status !== "done" || match.result_type === "not_played" || !match.winner_team_id) return false;
    const order = Number(match.created_order || 0);
    if (Number.isFinite(currentOrder) && order >= currentOrder) return false;
    return String(resultLoserTeamId(match, match.winner_team_id)) === String(teamId || "");
  }).length;
}

function resultScoreText(gameScores, settings = {}) {
  const games = trimmedResultGameScores(gameScores, settings);
  if (games.length === 0) return "";
  if (games.length === 1) return `${games[0].home || 0}-${games[0].away || 0}`;
  return games.map((game, index) => `G${index + 1} ${game.home || 0}-${game.away || 0}`).join(" | ");
}

function csvDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function csvDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}

function downloadCsv(csv, fileName) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tournament";
}

function smsTemplateState(saved = {}) {
  return {
    checkIn: saved.checkIn || DEFAULT_SMS_TEMPLATES.checkIn,
    courtReady: saved.courtReady || DEFAULT_SMS_TEMPLATES.courtReady,
    returnToQueue: saved.returnToQueue || DEFAULT_SMS_TEMPLATES.returnToQueue,
    result: saved.result || DEFAULT_SMS_TEMPLATES.result,
    broadcast: saved.broadcast || DEFAULT_SMS_TEMPLATES.broadcast,
  };
}

function tournamentQueueStatus(matches, courts) {
  const busyTeamIds = busyTeams(matches);
  const queued = sortedPendingMatches(matches);
  const completed = (matches || []).filter((match) => match.status === "done").length;
  const activeCourtIds = new Set((courts || []).map((court) => String(court.id)));
  const onCourt = new Set(
    (matches || [])
      .filter((match) => match.status === "playing" && match.court_id && activeCourtIds.has(String(match.court_id)))
      .map((match) => String(match.court_id))
  ).size;
  const readyNow = queued.filter((match) =>
    !busyTeamIds.has(String(match.home_team_id)) &&
    !busyTeamIds.has(String(match.away_team_id))
  ).length;
  const total = (matches || []).length;

  return {
    total,
    completed,
    onCourt,
    inQueue: queued.length,
    readyNow,
    blocked: Math.max(0, queued.length - readyNow),
    remaining: Math.max(0, total - completed),
    courts: (courts || []).length,
    completionPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

function schedulingInsights(matches, courts) {
  const averageMatchMinutes = averageCompletedMatchMinutes(matches);
  const remaining = (matches || []).filter((match) => match.status !== "done").length;
  const courtCount = Math.max(1, (courts || []).length);
  const wavesRemaining = Math.max(1, Math.ceil(remaining / courtCount));
  const finishDate = new Date(Date.now() + wavesRemaining * averageMatchMinutes * 60000);
  const groups = divisionInsightGroups(matches);

  return {
    averageMatchMinutes,
    finishTime: finishDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    groups,
  };
}

function divisionInsightGroups(matches) {
  const lastPlayed = teamLastPlayed(matches);
  const now = Date.now();
  const groups = {};

  (matches || []).forEach((match) => {
    const name = match.division?.name || "Unassigned";
    groups[name] ||= {
      name,
      total: 0,
      completed: 0,
      playing: 0,
      pending: 0,
      restMinutes: [],
    };
    groups[name].total += 1;
    if (match.status === "done") groups[name].completed += 1;
    if (match.status === "playing") groups[name].playing += 1;
    if (OPEN_STATUSES.has(match.status)) {
      groups[name].pending += 1;
      groups[name].restMinutes.push(restMinutesForMatch(match, lastPlayed, now));
    }
  });

  return Object.values(groups)
    .map((group) => {
      const completionPercent = group.total > 0 ? Math.round((group.completed / group.total) * 100) : 0;
      const progressPercent = group.total > 0 ? Math.round(((group.completed + group.playing) / group.total) * 100) : 0;
      const averageRestMinutes = average(group.restMinutes);
      const heat = group.pending === 0 ? "Complete" : progressPercent < 35 ? "Delay heat" : progressPercent < 75 ? "Balanced" : "Final push";

      return {
        ...group,
        completionPercent,
        progressPercent,
        averageRestMinutes,
        heat,
      };
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

function matchQueueMetrics(pendingMatches, allMatches, busyTeamIds) {
  const lastPlayed = teamLastPlayed(allMatches);
  const groupStats = divisionLineStats(allMatches);
  const divisionBacklog = pendingCountBy(allMatches, (match) => match.division_id);
  const teamBacklog = teamPendingCounts(allMatches);
  const now = Date.now();

  return (pendingMatches || [])
    .map((match) => {
      const key = divisionLineKey(match);
      const stats = groupStats[key] || { total: 1, completed: 0, playing: 0, restMinutes: [] };
      const restMinutes = restMinutesForMatch(match, lastPlayed, now);
      const groupProgress = Math.round(((stats.completed + stats.playing) / Math.max(1, stats.total)) * 100);
      const divisionPending = divisionBacklog[String(match.division_id || "")] || 0;
      const teamPending = Math.max(
        teamBacklog[String(match.home_team_id || "")] || 0,
        teamBacklog[String(match.away_team_id || "")] || 0
      );

      return {
        match,
        blocked: busyTeamIds.has(String(match.home_team_id)) || busyTeamIds.has(String(match.away_team_id)),
        waitMinutes: minutesSince(match.queue_entered_at || match.created_at, now),
        restMinutes,
        groupProgress,
        divisionPending,
        teamPending,
        averageGroupRestMinutes: average(stats.restMinutes),
      };
    })
    .sort((a, b) =>
      Number(a.blocked) - Number(b.blocked) ||
      b.restMinutes - a.restMinutes ||
      b.divisionPending - a.divisionPending ||
      b.teamPending - a.teamPending ||
      a.groupProgress - b.groupProgress ||
      b.waitMinutes - a.waitMinutes ||
      Number(a.match.created_order || 0) - Number(b.match.created_order || 0)
    );
}

function divisionLineStats(matches) {
  const lastPlayed = teamLastPlayed(matches);
  const now = Date.now();

  return (matches || []).reduce((stats, match) => {
    const key = divisionLineKey(match);
    stats[key] ||= { total: 0, completed: 0, playing: 0, pending: 0, restMinutes: [] };
    stats[key].total += 1;
    if (match.status === "done") stats[key].completed += 1;
    if (match.status === "playing") stats[key].playing += 1;
    if (OPEN_STATUSES.has(match.status)) {
      stats[key].pending += 1;
      stats[key].restMinutes.push(restMinutesForMatch(match, lastPlayed, now));
    }
    return stats;
  }, {});
}

function sortedPendingMatches(matches) {
  return (matches || [])
    .filter((match) => OPEN_STATUSES.has(match.status) && match.home_team_id && match.away_team_id)
    .sort((a, b) =>
      String(a.division?.name || "").localeCompare(String(b.division?.name || "")) ||
      Number(a.line_number || 1) - Number(b.line_number || 1) ||
      new Date(a.queue_entered_at || a.created_at || 0).getTime() - new Date(b.queue_entered_at || b.created_at || 0).getTime() ||
      Number(a.created_order || 0) - Number(b.created_order || 0)
    );
}

function availablePendingMatches(matches, busyTeamIds = busyTeams(matches)) {
  return matchQueueMetrics(sortedPendingMatches(matches), matches, busyTeamIds)
    .filter((row) => !row.blocked)
    .map((row) => row.match);
}

function busyTeams(matches) {
  const ids = new Set();
  (matches || []).filter((match) => match.status === "playing").forEach((match) => {
    ids.add(String(match.home_team_id));
    ids.add(String(match.away_team_id));
  });
  return ids;
}

function pendingCountBy(matches, keyFn) {
  return (matches || []).reduce((counts, match) => {
    if (!OPEN_STATUSES.has(match.status)) return counts;
    const key = String(keyFn(match) || "");
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function teamPendingCounts(matches) {
  return (matches || []).reduce((counts, match) => {
    if (!OPEN_STATUSES.has(match.status)) return counts;
    [match.home_team_id, match.away_team_id].filter(Boolean).forEach((teamId) => {
      const key = String(teamId);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, {});
}

function matchesByCourt(matches) {
  return Object.fromEntries(
    (matches || [])
      .filter((match) => match.status === "playing" && match.court_id)
      .map((match) => [String(match.court_id), match])
  );
}

function applyBracketMatchDetails(matches, bracketDetails) {
  return (matches || []).map((match) => ({
    ...match,
    ...(bracketDetails[String(match.id)] || {}),
  }));
}

function matchSummary(match) {
  return `${match.division?.name || "Division"} ${matchLineLabel(match)} - ${bracketTeamDisplayName(match, "home")} vs ${bracketTeamDisplayName(match, "away")}`;
}

function matchLineLabel(match) {
  return match.legacy_id?.startsWith("BR|") ? `Game #${match.bracketMatchNumber || match.bracketMeta?.match || ""}` : `Line ${match.line_number || 1}`;
}

function bracketTeamDisplayName(match, side) {
  const isAway = side === "away";
  const name = isAway ? match.away_team?.name || "Away" : match.home_team?.name || "Home";
  const sourceLabel = isAway ? match.awaySourceLabel : match.homeSourceLabel;
  return sourceLabel ? `(${sourceLabel}) ${name}` : name;
}

function confirmTypedAction(message, requiredWord) {
  const word = String(requiredWord || "").trim().toUpperCase();
  if (!window.confirm(`${message}\n\nYou will be asked to type ${word} to continue.`)) {
    window.alert("Action was not completed.");
    return false;
  }
  const typed = window.prompt(`Type ${word} to continue.`);
  if (String(typed || "").trim().toUpperCase() !== word) {
    window.alert(`Action was not completed. You must type ${word} exactly.`);
    return false;
  }
  return true;
}

function sortDivisionsByName(divisions = []) {
  return [...(divisions || [])].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base", numeric: true }) ||
    Number(a?.sort_order || 0) - Number(b?.sort_order || 0)
  );
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatTime(value) {
  if (!value) return "Not assigned";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not assigned";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function playTime(value, now) {
  if (!value) return "0 min";
  const assignedAt = new Date(value).getTime();
  if (Number.isNaN(assignedAt)) return "0 min";
  if (!now) return "0 min";
  const elapsedMs = Math.max(0, Number(now) - assignedAt);
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

function matchDurationText(match) {
  const minutes = matchDurationMinutes(match);
  return minutes === null ? "" : formatDurationMinutes(minutes);
}

function matchDurationMinutes(match) {
  if (!match?.assigned_at || !match?.completed_at) return null;
  const assignedAt = new Date(match.assigned_at).getTime();
  const completedAt = new Date(match.completed_at).getTime();
  if (Number.isNaN(assignedAt) || Number.isNaN(completedAt) || completedAt < assignedAt) return null;
  return Math.round((completedAt - assignedAt) / 60000);
}

function formatDurationMinutes(value) {
  const totalMinutes = Number(value);
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "0 min";
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

function groupBy(items, key) {
  return (items || []).reduce((map, item) => {
    const groupKey = String(item[key]);
    map[groupKey] = [...(map[groupKey] || []), item];
    return map;
  }, {});
}

function averageCompletedMatchMinutes(matches) {
  const durations = (matches || [])
    .filter((match) => match.status === "done" && match.assigned_at && match.completed_at)
    .map((match) => {
      const minutes = Math.round((new Date(match.completed_at).getTime() - new Date(match.assigned_at).getTime()) / 60000);
      return minutes >= 5 && minutes <= 180 ? minutes : null;
    })
    .filter((minutes) => minutes !== null);

  return durations.length > 0 ? average(durations) : 25;
}

function teamLastPlayed(matches) {
  const last = {};

  (matches || [])
    .filter((match) => match.status === "done" || match.status === "playing")
    .forEach((match) => {
      const timestamp = new Date(match.completed_at || match.assigned_at || 0).getTime();
      if (!Number.isFinite(timestamp) || timestamp <= 0) return;
      [match.home_team_id, match.away_team_id].filter(Boolean).forEach((teamId) => {
        const key = String(teamId);
        last[key] = Math.max(last[key] || 0, timestamp);
      });
    });

  return last;
}

function restMinutesForMatch(match, lastPlayed, now) {
  const rests = [match.home_team_id, match.away_team_id]
    .map((teamId) => lastPlayed[String(teamId)])
    .filter(Boolean)
    .map((timestamp) => Math.max(0, Math.round((now - timestamp) / 60000)));

  if (rests.length === 0) return 999;
  return Math.min(...rests);
}

function minutesSince(value, now = Date.now()) {
  const timestamp = new Date(value || now).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.round((now - timestamp) / 60000));
}

function average(values) {
  const cleanValues = (values || []).filter((value) => Number.isFinite(value));
  if (cleanValues.length === 0) return 0;
  return Math.round(cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length);
}

function divisionLineKey(match) {
  return `${match.division_id || ""}|${Number(match.line_number || 1)}`;
}
