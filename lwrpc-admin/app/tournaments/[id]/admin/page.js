"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { scoreDisplay, tournamentDivisionColors, tournamentStandingLabel } from "../../../lib/tournaments";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../../../lib/systemSettings";

const TABS = ["Courts", "Queue", "Standings", "Teams", "Admin Setup", "SMS", "Log"];
const OPEN_STATUSES = new Set(["pending", "not_played"]);
const DEFAULT_SMS_TEMPLATES = {
  courtReady: "You're up! You are on Court {court}.\n\nPlease stop by the Desk to grab your basket and ball. Once you've finished your game, fill out the scoresheet and return the basket and ball.\nHave a great match!\n\n{division} {line}\n{home} vs {away}",
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

export default function TournamentAdminPage() {
  const { id } = useParams();
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
      return false;
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
    if (action === "autoAssign") setNotice(`Assigned ${result.assigned || 0} open court${Number(result.assigned || 0) === 1 ? "" : "s"}.`);
    if (action === "returnToQueue") setNotice("Match returned to the queue.");
    if (action === "swapToCourt") setNotice("Queued match moved to the selected court.");
    if (action === "completeMatch") setNotice("Result saved and court opened.");
    if (action === "sendCourtText") setNotice(`Court text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`);
    if (action === "syncLeagueDivisions") setNotice(`Synced ${result.synced || 0} main-system division${Number(result.synced || 0) === 1 ? "" : "s"}.`);
    if (action === "updateDivisionStatus") setNotice("Division status updated.");
    if (action === "deleteDivision") setNotice("Tournament division deleted.");
    if (action === "updateTournamentSettings") setNotice("Tournament settings saved.");
    if (action === "updateTournamentTeam") setNotice(options.notice || "Tournament team saved.");
    if (action === "deleteTournamentTeam") setNotice("Tournament team deleted.");
    if (action === "saveCourts") setNotice(`Saved ${result.courts || 0} court${Number(result.courts || 0) === 1 ? "" : "s"}.`);
    if (action === "resetMatches") setNotice("Tournament matches reset.");
    if (action === "startTournament") setNotice("Tournament started and wait times reset.");
    if (action === "generateRoundRobin") setNotice(`Generated ${result.generated || 0} round robin match${Number(result.generated || 0) === 1 ? "" : "es"}.`);
    if (action === "updateSmsTemplates") setNotice("SMS templates saved.");
    if (action === "sendBroadcastText") setNotice(`Broadcast text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`);
    if (action === "sendTestText") setNotice(`Test text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`);
    return true;
  }

  function lock() {
    window.sessionStorage.removeItem(storageKey);
    setState(null);
    setEventCode("");
    setNotice("");
    setError("");
  }

  if (!state) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow">
          <div className="text-xs font-black uppercase tracking-wide text-blue-700">Tournament Main System</div>
          <h1 className="mt-1 text-2xl font-black text-slate-950">Enter Event Code</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            Public display, standings, and player views do not require this code. Tournament setup and operations do.
          </p>

          <input
            type="password"
            value={eventCode}
            onChange={(event) => {
              setEventCode(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") unlock();
            }}
            className="mt-5 w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-2xl font-black tracking-[0.4em]"
            placeholder="Code"
          />

          {error && <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}

          <button
            type="button"
            onClick={() => unlock()}
            disabled={loading || !eventCode.trim()}
            className="mt-4 w-full rounded-xl bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "Unlocking..." : "Unlock Main System"}
          </button>

          <Link className="mt-3 block text-center text-sm font-bold text-blue-700" href={`/tourney/${id}/display`}>
            Back to public display
          </Link>
        </div>
      </main>
    );
  }

  const tournamentKey = state.tournament.slug || id;

  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="mx-auto max-w-[1440px] p-3 sm:p-5">
        <DirectorHeader
          state={state}
          systemSettings={systemSettings}
          smsEnabled={smsEnabled}
          setSmsEnabled={setSmsEnabled}
          lock={lock}
          tournamentKey={tournamentKey}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl border px-4 py-3 text-sm font-black shadow-sm transition ${
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
        {activeTab === "Log" && <LogTab state={state} />}
      </div>

      {resultMatch && (
        <ResultModal
          match={resultMatch}
          onClose={() => setResultMatch(null)}
          onSave={async (payload) => {
            const saved = await runAction("completeMatch", payload);
            if (saved) setResultMatch(null);
          }}
          saving={actionLoading === "completeMatch"}
        />
      )}
    </main>
  );
}

function DirectorHeader({ state, systemSettings, smsEnabled, setSmsEnabled, lock, tournamentKey }) {
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
          <Link className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-2 text-sm font-black text-white hover:bg-blue-900" href={`/tourney/${tournamentKey}/display`}>
            Public Display
          </Link>
          <button
            type="button"
            onClick={() => setSmsEnabled((value) => !value)}
            className={`rounded-full px-4 py-2 text-sm font-black ${smsEnabled ? "bg-emerald-700 text-white" : "bg-rose-950 text-rose-100"}`}
          >
            SMS {smsEnabled ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={lock} className="rounded-xl border border-blue-400/50 bg-blue-950 px-4 py-2 text-sm font-black text-white hover:bg-blue-900">
            Lock
          </button>
        </div>
      </div>
    </header>
  );
}

function CourtsTab({ state, actionLoading, selectedPendingId, setSelectedPendingId, runAction, setResultMatch, smsEnabled }) {
  const busyTeamIds = useMemo(() => busyTeams(state.matches), [state.matches]);
  const pendingMatches = useMemo(() => availablePendingMatches(state.matches, busyTeamIds), [busyTeamIds, state.matches]);
  const playingByCourt = useMemo(() => matchesByCourt(state.matches), [state.matches]);

  useEffect(() => {
    if (selectedPendingId && !pendingMatches.some((match) => String(match.id) === String(selectedPendingId))) {
      setSelectedPendingId("");
    }
  }, [pendingMatches, selectedPendingId, setSelectedPendingId]);

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-blue-300/20 bg-slate-950/70 p-5 shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black">Court Dashboard</h2>
          <button
            type="button"
            onClick={() => runAction("autoAssign")}
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
          />
        ))}
      </div>
    </section>
  );
}

function CourtCard({ court, match, selectedPendingId, actionLoading, runAction, setResultMatch, smsEnabled }) {
  const colors = match ? tournamentDivisionColors(match.division?.name) : null;
  const busy = Boolean(actionLoading);

  return (
    <article className={`min-h-[310px] rounded-2xl border border-blue-300/20 border-l-4 ${colors ? `${colors.border} ${colors.panel}` : "border-l-slate-500 bg-slate-950/70"} p-5 shadow-lg`}>
      <div className="text-2xl font-black">Court {court.name}</div>

      {match ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className={`rounded-full px-3 py-1 ${colors.badge}`}>{match.division?.name || "Division"}</span>
            <span className="rounded-full bg-blue-500/25 px-3 py-1 text-blue-100">Line {match.line_number || 1}</span>
          </div>
          <div className="mt-4 text-xl font-black leading-7">
            <div>{match.home_team?.name || "Home"}</div>
            <div className={`text-sm ${colors.accent}`}>vs</div>
            <div>{match.away_team?.name || "Away"}</div>
          </div>
          <div className="mt-3 text-sm font-semibold text-blue-100">Assigned: {formatTime(match.assigned_at)}</div>
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
              onClick={() => runAction("returnToQueue", { matchId: match.id })}
              disabled={busy}
              className="rounded-xl border border-blue-300/40 bg-blue-950 px-4 py-3 text-sm font-black text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Return to Queue
            </button>
            {selectedPendingId && (
              <button
                type="button"
                onClick={() => runAction("swapToCourt", { matchId: selectedPendingId, courtId: court.id })}
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
              onClick={() => runAction("swapToCourt", { matchId: selectedPendingId, courtId: court.id })}
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
  const busyTeamIds = useMemo(() => busyTeams(state.matches), [state.matches]);
  const pendingMatches = useMemo(() => sortedPendingMatches(state.matches), [state.matches]);
  const queueStatus = useMemo(() => tournamentQueueStatus(state.matches, state.courts), [state.matches, state.courts]);
  const insights = useMemo(() => schedulingInsights(state.matches, state.courts), [state.matches, state.courts]);
  const queueRows = useMemo(() => matchQueueMetrics(pendingMatches, state.matches, busyTeamIds), [busyTeamIds, pendingMatches, state.matches]);

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
          <span className="w-fit rounded-full bg-amber-400/25 px-4 py-2 text-sm font-black text-amber-100">Estimated Finish: {insights.finishTime}</span>
        </div>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Based on current completed match pace, average match length is about {insights.averageMatchMinutes} minutes. Queue priority favors division and line groups with lower completion progress, available teams, and stronger rest balance.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          {insights.groups.map((group) => (
            <div key={group.name} className={`rounded-xl border p-4 ${group.panelClass}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black">{group.name}</h3>
                <span className="rounded-full bg-blue-400/20 px-3 py-1 text-xs font-black text-blue-100">{group.pending} pending</span>
              </div>
              <div className="mt-4 text-3xl font-black">{group.completionPercent}%</div>
              <div className="text-sm font-semibold text-blue-100">{group.heat}</div>
              <div className="mt-1 text-sm font-semibold text-blue-200">Progress: {group.progressPercent}% - Avg Rest: {group.averageRestMinutes} min</div>
            </div>
          ))}
          {insights.groups.length === 0 && <div className="text-sm font-semibold text-blue-100">Scheduling insights will appear once matches are loaded.</div>}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-black">Match Queue</h2>
        <div className="mt-4 space-y-3">
          {queueRows.map((row, index) => {
            const match = row.match;
            return (
              <div
                key={match.id}
                className={`rounded-2xl border bg-blue-950/70 p-4 ${
                  index === 0 && !row.blocked ? "border-amber-300" : "border-blue-300/20"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  {index === 0 && !row.blocked && <span className="rounded-full bg-amber-400/25 px-3 py-1 text-amber-100">Likely Next</span>}
                  <span className="rounded-full bg-blue-400/20 px-3 py-1 text-blue-100">{match.division?.name || "Division"}</span>
                  <span className="rounded-full bg-blue-400/20 px-3 py-1 text-blue-100">Line {match.line_number || 1}</span>
                  <span className={`rounded-full px-3 py-1 ${row.blocked ? "bg-rose-400/20 text-rose-100" : "bg-emerald-400/20 text-emerald-100"}`}>
                    {row.blocked ? "Blocked" : "Ready"}
                  </span>
                </div>
                <div className="mt-4 text-lg font-black">{match.home_team?.name || "Home"} vs {match.away_team?.name || "Away"}</div>
                <div className="mt-3 text-sm font-semibold text-blue-200">
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

function StandingsTab({ state, runAction, setResultMatch, actionLoading }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const standings = useMemo(() => groupedDivisionStandings(state.matches, state.teams, state.divisions, state.tournament.settings), [state.divisions, state.matches, state.teams, state.tournament.settings]);
  const divisions = Object.entries(standings);

  return (
    <section className="mt-5 space-y-4">
      <div>
        <h2 className="text-2xl font-black">Division Standings</h2>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Standings are grouped by team name within each division, even when that team has multiple line entries.
        </p>
      </div>

      {divisions.map(([division, rows]) => (
        <div key={division} className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
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
      ))}
      {divisions.length === 0 && <EmptyPanel title="Standings" message="No completed matches are available for standings yet." />}
      {selectedTeam && (
        <StandingTeamModal
          team={selectedTeam}
          matches={matchesForStandingTeam(state.matches, selectedTeam)}
          onClose={() => setSelectedTeam(null)}
          setResultMatch={setResultMatch}
          runAction={runAction}
          actionLoading={actionLoading}
        />
      )}
    </section>
  );
}

function StandingTeamModal({ team, matches, onClose, setResultMatch, runAction, actionLoading }) {
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
                        onClick={() => runAction("returnToQueue", { matchId: match.id })}
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
  const contactsByTeam = useMemo(() => groupBy(state.contacts || [], "tournament_team_id"), [state.contacts]);
  const activeDivisions = useMemo(() => state.divisions.filter((division) => division.is_active), [state.divisions]);
  const activeDivisionIds = useMemo(() => new Set(activeDivisions.map((division) => String(division.id))), [activeDivisions]);
  const divisionsById = useMemo(() => Object.fromEntries(activeDivisions.map((division) => [division.id, division])), [activeDivisions]);
  const divisionOrder = useMemo(() => activeDivisions.map((division) => division.name), [activeDivisions]);
  const [teamFilter, setTeamFilter] = useState("all");
  const [editingTeam, setEditingTeam] = useState(null);
  const teamsByDivision = useMemo(() => {
    return state.teams
      .filter((team) => activeDivisionIds.has(String(team.division_id)))
      .filter((team) => teamFilter === "all" || !teamReady(team))
      .reduce((map, team) => {
        const division = divisionsById[team.division_id]?.name || "Unassigned";
      map[division] = [...(map[division] || []), team];
      return map;
    }, {});
  }, [activeDivisionIds, state.teams, divisionsById, teamFilter]);

  const divisionEntries = useMemo(() => {
    return Object.entries(teamsByDivision).sort(([a], [b]) => {
      const aIndex = divisionOrder.indexOf(a);
      const bIndex = divisionOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex) || a.localeCompare(b);
    });
  }, [divisionOrder, teamsByDivision]);

  function togglePlayerCheck(team, slot) {
    const nextP1 = slot === 1 ? !team.player_1_checked_in : Boolean(team.player_1_checked_in);
    const nextP2 = slot === 2 ? !team.player_2_checked_in : Boolean(team.player_2_checked_in);
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

  async function deleteTeam(team) {
    if (!window.confirm(`Delete ${team.name || "this team"} from the tournament?`)) return;
    setEditingTeam(null);
    await runAction("deleteTournamentTeam", { teamId: team.id });
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-black">Team List</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTeamFilter("all")}
            className={`rounded-xl px-4 py-3 text-sm font-black ${teamFilter === "all" ? "bg-cyan-500 text-white" : "border border-blue-300/40 bg-blue-950 text-white"}`}
          >
            All Teams
          </button>
          <button
            type="button"
            onClick={() => setTeamFilter("notReady")}
            className={`rounded-xl px-4 py-3 text-sm font-black ${teamFilter === "notReady" ? "bg-cyan-500 text-white" : "border border-blue-300/40 bg-blue-950 text-white"}`}
          >
            Teams Not Ready
          </button>
        </div>
      </div>

      {divisionEntries.map(([division, teams]) => (
        <details key={division} className="rounded-2xl border border-blue-300/20 bg-slate-950/70 p-4">
          <summary className="cursor-pointer text-xl font-black">{division} <span className="ml-2 rounded-full bg-blue-400/20 px-3 py-1 text-xs text-blue-100">{teams.length} shown</span></summary>
          <div className="mt-4 space-y-2">
            {teams
              .sort((a, b) =>
                Number(regularSeasonStandingValue(a) || 999) - Number(regularSeasonStandingValue(b) || 999) ||
                Number(a.line_number || 1) - Number(b.line_number || 1) ||
                String(a.name || "").localeCompare(String(b.name || ""))
              )
              .map((team) => {
                const contacts = contactsByTeam[String(team.id)] || [];
                const ready = teamReady(team);
                const totalRating = teamTotalRating(team, contacts, state);

                return (
                  <div key={team.id} className="rounded-xl border border-blue-300/20 bg-blue-950/70 p-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-black">{teamStandingLabel(team)}</div>
                          <div className="rounded-full bg-cyan-400/20 px-3 py-1 text-xs font-black text-cyan-100">Line {team.line_number || 1}</div>
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
                          onClick={() => togglePlayerCheck(team, 1)}
                          disabled={Boolean(actionLoading)}
                          className={`rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${team.player_1_checked_in ? "bg-emerald-600 text-white" : "bg-rose-700 text-white"}`}
                        >
                          {team.player_1_checked_in ? "P1 In" : "P1 Out"}
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePlayerCheck(team, 2)}
                          disabled={Boolean(actionLoading)}
                          className={`rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${team.player_2_checked_in ? "bg-emerald-600 text-white" : "bg-rose-700 text-white"}`}
                        >
                          {team.player_2_checked_in ? "P2 In" : "P2 Out"}
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
      ))}
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
    </section>
  );
}

function TeamEditModal({ team, state, contacts, onClose, onSave, onDelete, onSendTestText, saving, deleting, sendingTestText }) {
  const sourceTeams = useMemo(() => state.sourceTeams || [], [state.sourceTeams]);
  const sourceTeamOptions = useMemo(() => sortedSourceTeams(sourceTeams), [sourceTeams]);
  const sourceRosters = useMemo(() => state.sourceRosters || [], [state.sourceRosters]);
  const [form, setForm] = useState(() => teamFormState(team, contacts, sourceTeamOptions));
  const selectedSourceTeam = useMemo(() => sourceTeamOptions.find((sourceTeam) => String(sourceTeam.id) === String(form.sourceTeamId)), [form.sourceTeamId, sourceTeamOptions]);
  const selectedRoster = useMemo(() => {
    return sourceRosters
      .filter((row) => String(row.team_id) === String(form.sourceTeamId))
      .sort((a, b) =>
        String(a.members?.first_name || "").localeCompare(String(b.members?.first_name || "")) ||
        memberDisplayName(a.members).localeCompare(memberDisplayName(b.members))
      );
  }, [form.sourceTeamId, sourceRosters]);
  const teamTotal = teamTotalFromForm(form);
  const divisionTeamMax = Number(selectedSourceTeam?.divisions?.team_dupr_max);
  const hasDivisionTeamMax = Number.isFinite(divisionTeamMax) && divisionTeamMax > 0;
  const exceedsDivisionTeamMax = hasDivisionTeamMax && teamTotal !== "" && Number(teamTotal) > divisionTeamMax;
  const duplicateTeamLine = duplicateTournamentTeamLine(state.teams, team.id, form.name, form.lineNumber);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectPlayer(slot, memberId) {
    const row = selectedRoster.find((item) => String(item.member_id) === String(memberId));
    const prefix = slot === 1 ? "player1" : "player2";
    setForm((current) => ({
      ...current,
      [`${prefix}MemberId`]: memberId,
      [`${prefix}Name`]: row ? memberDisplayName(row.members) : "",
      [`${prefix}Phone`]: row?.members?.phone || "",
      [`${prefix}Rating`]: row ? playerRatingForSource(row, state.sourceRatings || [], sourceTeamOptions) : "",
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-blue-300/30 bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Edit Team</h2>
            <p className="mt-1 text-sm font-semibold text-blue-200">{team.name}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
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
          <label className="text-sm font-black text-blue-200">
            Team Name
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="text-sm font-black text-blue-200">
            Regular Season Standing
            <input type="number" min="1" value={form.regularSeasonStanding} onChange={(event) => updateForm("regularSeasonStanding", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
          </label>
          <label className="text-sm font-black text-blue-200">
            Main System Team
            <select value={form.sourceTeamId} onChange={(event) => updateForm("sourceTeamId", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white">
              <option value="">Select team...</option>
              {sourceTeamOptions.map((sourceTeam) => (
                <option key={sourceTeam.id} value={sourceTeam.id}>{sourceTeam.divisions?.name || "Division"} - {sourceTeam.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-black text-blue-200">
            Line
            <input type="number" min="1" value={form.lineNumber} onChange={(event) => updateForm("lineNumber", event.target.value)} className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
          </label>
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
                  <input value={form[`${prefix}Phone`]} onChange={(event) => updateForm(`${prefix}Phone`, event.target.value)} placeholder="Phone" className="rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white" />
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
          <button
            type="button"
            disabled={saving || !form.name.trim() || exceedsDivisionTeamMax || duplicateTeamLine}
            onClick={() => onSave(teamSavePayload(team, form))}
            className="rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Team"}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-blue-300/40 bg-blue-950 px-5 py-3 text-sm font-black text-white hover:bg-blue-900">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving || deleting}
            onClick={onDelete}
            className="ml-auto rounded-xl bg-rose-700 px-5 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
function AdminSetupTab({ state, runAction, actionLoading }) {
  const activeDivisions = useMemo(() => state.divisions.filter((division) => division.is_active), [state.divisions]);
  const teamCounts = useMemo(() => teamCountsByDivision(state.teams), [state.teams]);
  const [selectedDivisionIds, setSelectedDivisionIds] = useState(() => activeDivisions.map((division) => division.id));
  const [tournamentName, setTournamentName] = useState(state.tournament.name || "");
  const [eventEntryCode, setEventEntryCode] = useState("");
  const [matchFormat, setMatchFormat] = useState(state.tournament.settings?.matchFormat || "Single Game");
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
    setMatchFormat(state.tournament.settings?.matchFormat || "Single Game");
    setStandingsRules(standingsRulesState(state.tournament.settings?.standingsRules));
    setCourtLabels(courtLabelsFromCourts(state.courts));
    setCourtCount(Math.max(1, state.courts.length || 1));
  }, [state.courts, state.tournament.name, state.tournament.settings?.matchFormat, state.tournament.settings?.standingsRules]);

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

  const savedCourtNames = courtLabels.map((label, index) => label.trim() || `Court ${index + 1}`).join(",");

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
              onClick={() => runAction("syncLeagueDivisions")}
              disabled={Boolean(actionLoading)}
              className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh From Main System
            </button>
          </div>
          <div className="mt-4 divide-y divide-blue-300/10">
            {state.divisions.map((division) => {
              const active = Boolean(division.is_active);
              const teamCount = teamCounts[String(division.id)] || 0;
              return (
                <div key={division.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-black">{division.name}</div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-emerald-400/25 text-emerald-100" : "bg-rose-400/25 text-rose-100"}`}>
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-blue-200">{teamCount} teams</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => runAction("updateDivisionStatus", { divisionId: division.id, isActive: !active })}
                      disabled={Boolean(actionLoading)}
                      className={`w-fit rounded-xl px-5 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 ${
                        active
                          ? "bg-cyan-500 text-white hover:bg-cyan-400"
                          : "border border-blue-300/40 bg-blue-950 text-white hover:bg-blue-900"
                      }`}
                    >
                      {active ? "Set Inactive" : "Set Active"}
                    </button>
                    {teamCount === 0 && (
                      <button
                        type="button"
                        onClick={() => runAction("deleteDivision", { divisionId: division.id })}
                        disabled={Boolean(actionLoading)}
                        className="w-fit rounded-xl bg-rose-700 px-5 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete Division
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {state.divisions.length === 0 && <div className="py-4 text-sm font-semibold text-blue-100">No tournament divisions have been synced yet.</div>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Round Robin Divisions</h3>
        <p className="mt-3 text-sm font-semibold text-blue-100">
          Select which active divisions to generate. Inactive divisions are hidden from standings and not shown here.
        </p>
        <div className="mt-5 flex flex-wrap gap-4">
          {activeDivisions.map((division) => (
            <label key={division.id} className="flex items-center gap-2 text-sm font-semibold text-blue-100">
              <input
                type="checkbox"
                checked={selectedDivisionIds.includes(division.id)}
                onChange={() => toggleSelectedDivision(division.id)}
                className="size-4 accent-cyan-400"
              />
              {division.name}
            </label>
          ))}
          {activeDivisions.length === 0 && <div className="text-sm font-semibold text-blue-100">No active divisions are available.</div>}
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runAction("generateRoundRobin", { divisionIds: selectedDivisionIds })}
            disabled={Boolean(actionLoading) || selectedDivisionIds.length === 0}
            className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Generate Selected Round Robin
          </button>
          <button
            type="button"
            onClick={() => runAction("resetMatches")}
            disabled={Boolean(actionLoading)}
            className="rounded-xl bg-rose-700 px-4 py-3 text-sm font-black text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset Matches
          </button>
          <button
            type="button"
            onClick={() => runAction("startTournament")}
            disabled={Boolean(actionLoading)}
            className="rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Start Tournament / Reset Wait Times
          </button>
          <button
            type="button"
            onClick={() => exportMatchesCsv(state)}
            className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-400"
          >
            Export Matches CSV
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
          onClick={() => runAction("updateTournamentSettings", { name: tournamentName, matchFormat, standingsRules })}
          disabled={Boolean(actionLoading) || !tournamentName.trim()}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Tournament Name
        </button>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Event Entry Code</h3>
        <input
          type="password"
          value={eventEntryCode}
          onChange={(event) => setEventEntryCode(event.target.value)}
          className="mt-4 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
          placeholder="New entry code"
        />
        <p className="mt-3 text-sm font-semibold text-blue-100">Used to unlock this tournament admin area.</p>
        <button
          type="button"
          onClick={async () => {
            const saved = await runAction("updateTournamentSettings", { name: tournamentName, matchFormat, standingsRules, adminCode: eventEntryCode });
            if (saved) setEventEntryCode("");
          }}
          disabled={Boolean(actionLoading) || !tournamentName.trim() || !eventEntryCode.trim()}
          className="mt-4 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-white hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Entry Code
        </button>
      </div>

      <div className="rounded-2xl border border-blue-300/20 bg-blue-950/70 p-4">
        <h3 className="text-xl font-black">Match Format</h3>
        <select
          value={matchFormat}
          onChange={(event) => setMatchFormat(event.target.value)}
          className="mt-4 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
        >
          <option value="Single Game">Single Game</option>
          <option value="Best 2 of 3">Best 2 of 3</option>
          <option value="Timed Match">Timed Match</option>
          <option value="Custom">Custom</option>
        </select>
        <p className="mt-3 text-sm font-semibold text-blue-100">Controls how matches are presented throughout the system.</p>
        <button
          type="button"
          onClick={() => runAction("updateTournamentSettings", { name: tournamentName, matchFormat, standingsRules })}
          disabled={Boolean(actionLoading) || !tournamentName.trim()}
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
          onClick={() => runAction("updateTournamentSettings", { name: tournamentName, matchFormat, standingsRules })}
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
              type="number"
              min="1"
              max="64"
              value={courtCount}
              onChange={(event) => changeCourtCount(event.target.value)}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-white"
            />
          </label>
          <label className="block text-sm font-black text-blue-200">
            Quick Fill Starting Court Number
            <input
              type="number"
              value={startCourtNumber}
              onChange={(event) => setStartCourtNumber(event.target.value)}
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
    </section>
  );
}
function SmsTab({ state, smsEnabled, setSmsEnabled, runAction, actionLoading }) {
  const phoneCount = new Set((state.contacts || []).map((contact) => contact.phone).filter(Boolean)).size;
  const [testPhone, setTestPhone] = useState("");
  const [showFields, setShowFields] = useState(false);
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
            onClick={() => runAction("sendBroadcastText")}
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
            {"{tournament}"} tournament name, {"{court}"} court, {"{division}"} division, {"{line}"} line, {"{home}"} home team, {"{away}"} away team, {"{result}"} result, {"{status}"} tournament status.
          </div>
        )}

        <SmsTemplateTextArea
          label="Court Ready Text"
          value={templates.courtReady}
          onChange={(value) => setTemplates((current) => ({ ...current, courtReady: value }))}
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
    </section>
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

function LogTab({ state }) {
  return (
    <section className="mt-5 rounded-2xl border border-blue-300/20 bg-slate-950/70 p-5">
      <h2 className="text-2xl font-black">Activity Log</h2>
      <div className="mt-4 space-y-2">
        {state.log.map((row) => (
          <div key={row.id} className="rounded-xl border border-blue-300/20 bg-blue-950/70 px-4 py-3 text-sm font-semibold text-blue-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-black text-white">{row.log_type}</span>
              <span>{formatTime(row.created_at)}</span>
            </div>
            <div className="mt-1">{row.message}</div>
          </div>
        ))}
        {state.log.length === 0 && <div className="text-sm font-semibold text-blue-100">No activity yet.</div>}
      </div>
    </section>
  );
}

function ResultModal({ match, onClose, onSave, saving }) {
  const [homeScore, setHomeScore] = useState(match.home_score ?? "");
  const [awayScore, setAwayScore] = useState(match.away_score ?? "");
  const [resultType, setResultType] = useState(match.result_type || "completed");
  const home = Number(homeScore || 0);
  const away = Number(awayScore || 0);
  const defaultWinner = home >= away ? match.home_team_id : match.away_team_id;
  const [winnerTeamId, setWinnerTeamId] = useState(match.winner_team_id || defaultWinner);

  useEffect(() => {
    if (resultType === "not_played") {
      setWinnerTeamId("");
    } else if (Number(homeScore || 0) !== Number(awayScore || 0)) {
      setWinnerTeamId(Number(homeScore || 0) > Number(awayScore || 0) ? match.home_team_id : match.away_team_id);
    }
  }, [awayScore, homeScore, match.away_team_id, match.home_team_id, resultType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-blue-300/30 bg-slate-900 p-5 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Enter Result / Score</h2>
            <p className="mt-1 text-sm font-semibold text-blue-200">{matchSummary(match)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-blue-300/30 px-3 py-2 text-sm font-black text-white hover:bg-blue-950">
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="text-sm font-black text-blue-200">
            {match.home_team?.name || "Home"}
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={(event) => setHomeScore(event.target.value)}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-2xl font-black text-white"
            />
          </label>
          <label className="text-sm font-black text-blue-200">
            {match.away_team?.name || "Away"}
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={(event) => setAwayScore(event.target.value)}
              className="mt-2 w-full rounded-xl border border-blue-300/30 bg-slate-950 px-4 py-3 text-2xl font-black text-white"
            />
          </label>
        </div>

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

        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({
            matchId: match.id,
            resultType,
            homeScore,
            awayScore,
            winnerTeamId,
            scoreText: resultType === "not_played" ? "Not played" : `${homeScore || 0}-${awayScore || 0}`,
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
    .filter((match) => activeDivisionIds.has(String(match.division_id)) && match.status === "done" && match.result_type !== "not_played")
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

function playerSummary(team, contacts, slot) {
  const contact = (contacts || []).find((row) => Number(row.player_slot) === slot);
  const name = slot === 1 ? team.player_1_name : team.player_2_name;
  const phone = contact?.phone;
  return [
    name || `Player ${slot}`,
    phone ? `(${phone})` : "",
  ].filter(Boolean).join(" ");
}

function teamFormState(team, contacts, sourceTeams = []) {
  const p1 = (contacts || []).find((contact) => Number(contact.player_slot) === 1) || {};
  const p2 = (contacts || []).find((contact) => Number(contact.player_slot) === 2) || {};
  const matchedSourceTeam = sourceTeams.find((sourceTeam) => normalizeName(sourceTeam.name) === normalizeName(team.name));
  return {
    name: team.name || "",
    lineNumber: team.line_number || 1,
    sourceTeamId: matchedSourceTeam?.id || "",
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

function exportMatchesCsv(state) {
  const rows = [
    ["Division", "Line", "Home Team", "Away Team", "Status", "Result", "Score", "Court", "Queued", "Assigned", "Completed"],
    ...(state.matches || []).map((match) => [
      match.division?.name || "",
      match.line_number || "",
      match.home_team?.name || "",
      match.away_team?.name || "",
      match.status || "",
      matchResultText(match),
      scoreDisplay(match),
      match.court?.name || "",
      match.queue_entered_at || "",
      match.assigned_at || "",
      match.completed_at || "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `${slugify(state.tournament.name || "tournament")}-matches.csv`;
  downloadCsv(csv, fileName);
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
    courtReady: saved.courtReady || DEFAULT_SMS_TEMPLATES.courtReady,
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
        panelClass: insightPanelClass(group.name),
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
    .filter((match) => OPEN_STATUSES.has(match.status))
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

function matchSummary(match) {
  return `${match.division?.name || "Division"} Line ${match.line_number || 1} - ${match.home_team?.name || "Home"} vs ${match.away_team?.name || "Away"}`;
}

function insightPanelClass(value) {
  const classes = [
    "border-blue-400/40 bg-blue-950/70",
    "border-emerald-400/40 bg-emerald-950/70",
    "border-rose-400/40 bg-rose-950/60",
    "border-cyan-400/40 bg-slate-900/80",
    "border-amber-400/40 bg-stone-950/70",
  ];
  const text = String(value || "");
  const index = Math.abs([...text].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % classes.length;
  return classes[index];
}

function formatTime(value) {
  if (!value) return "Not assigned";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not assigned";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
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
