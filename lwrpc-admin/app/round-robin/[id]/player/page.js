"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SYSTEM_SETTINGS } from "../../../lib/systemSettings";

const PLAYER_RECORD_RANGES = [
  { id: "currentMonth", label: "Current Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "currentYear", label: "Current Year" },
  { id: "all", label: "All" },
];

export default function RoundRobinPlayerPage() {
  const { id } = useParams();
  const storageKey = useMemo(() => `lwrpc-round-robin-player-phone-${id}`, [id]);
  const [phone, setPhone] = useState("");
  const [savePhone, setSavePhone] = useState(true);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);

  useEffect(() => {
    const savedPhone = window.localStorage.getItem(storageKey) || "";
    if (savedPhone) {
      setPhone(formatPhoneInput(savedPhone));
      loadPlayer(savedPhone, { quiet: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 12000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function loadPlayer(nextPhone = phone, options = {}) {
    const cleanPhone = String(nextPhone || "").trim();
    if (!cleanPhone) {
      setError("Enter your phone number.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/round-robin/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load", groupId: id, phone: cleanPhone }),
    });
    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok || !result.success) {
      setState(null);
      if (!options.quiet) window.localStorage.removeItem(storageKey);
      setError(result.error || "Unable to find your Round Robin sessions.");
      return;
    }

    if (savePhone) window.localStorage.setItem(storageKey, cleanPhone);
    setPhone(formatPhoneInput(cleanPhone));
    setState(result);
  }

  async function updateStatus(sessionId, status) {
    const cleanPhone = String(phone || "").trim();
    setActionLoading(`${sessionId}-${status}`);
    setError("");
    setNotice("");

    const response = await fetch("/api/round-robin/player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateStatus", groupId: id, phone: cleanPhone, sessionId, status }),
    });
    const result = await response.json().catch(() => ({}));
    setActionLoading("");

    if (!response.ok || !result.success) {
      setError(result.error || "Unable to save your response.");
      return;
    }

    if (savePhone) window.localStorage.setItem(storageKey, cleanPhone);
    setState(result);
    setNotice(statusNotice(result.resolvedStatus || status));
  }

  function clearSavedPhone() {
    window.localStorage.removeItem(storageKey);
    setState(null);
    setPhone("");
    setNotice("");
    setError("");
    setShowHistory(false);
    setSelectedHistorySession(null);
  }

  function openHostSession(session) {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Enter the full phone number saved for you by the host.");
      return;
    }

    window.sessionStorage.setItem(`lwrpc-round-robin-host-phone-${groupKey}`, cleanPhone);
    window.sessionStorage.setItem(`lwrpc-round-robin-host-session-${groupKey}`, session.id);
    window.location.href = `/round-robin/${groupKey}/admin?hostSessionId=${encodeURIComponent(session.id)}`;
  }

  function openManagerSystem() {
    window.sessionStorage.removeItem(`lwrpc-round-robin-host-phone-${groupKey}`);
    window.sessionStorage.removeItem(`lwrpc-round-robin-host-session-${groupKey}`);
    window.sessionStorage.removeItem(`lwrpc-round-robin-code-${groupKey}`);
    window.location.href = `/round-robin/${groupKey}/admin?manager=1`;
  }

  async function finishHostSession(session) {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Enter the full phone number saved for you by the host.");
      return;
    }
    if (!window.confirm(`Finish ${session.session_name || "this session"}? This will close scoring and text results if SMS is enabled.`)) return;

    setActionLoading(`${session.id}-finish`);
    setError("");
    setNotice("");

    const response = await fetch("/api/round-robin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "completeSession",
        groupId: id,
        hostPhone: cleanPhone,
        hostSessionId: session.id,
        sessionId: session.id,
        smsEnabled: true,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setActionLoading("");

    if (!response.ok || !result.success) {
      setError(result.error || "Unable to finish this session.");
      return;
    }

    await loadPlayer(cleanPhone, { quiet: true });
    setNotice(result.sms?.skipped ? "Session finished. Result text was logged only." : `Session finished. Result texts sent: ${result.sms?.sent || 0}.`);
  }

  const groupKey = state?.group?.slug || id;
  const clubName = state?.systemSettings?.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;

  return (
    <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-3 text-slate-950 sm:p-6">
      <div className="w-full">
        <header className="overflow-hidden rounded-lg border border-teal-900/10 bg-slate-950 text-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.95)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-teal-200">Round Robin Player</div>
              <h1 className="text-3xl font-black sm:text-4xl">{clubName}</h1>
              {state?.player && <p className="mt-2 text-xl font-black text-teal-100 sm:text-2xl">{state.player.displayName}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openManagerSystem} className="rounded-lg border border-amber-200/70 bg-amber-400 px-4 py-2 text-sm font-black text-slate-950 shadow-[0_10px_24px_-14px_rgba(245,158,11,0.9)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-lg">
                Manager
              </button>
              {state && (
                <button type="button" onClick={clearSavedPhone} className="rounded-lg border border-teal-200/60 bg-teal-500 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(20,184,166,0.9)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-lg">
                  Switch Player
                </button>
              )}
            </div>
          </div>
        </header>

        {(error || notice) && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
            error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
          }`}>
            {error || notice}
          </div>
        )}

        {!state && (
          <section className="mt-5 overflow-hidden rounded-lg border border-white/80 bg-white/95 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.75)]">
            <div className="h-2 bg-[linear-gradient(90deg,#0f766e,#2563eb,#f59e0b)]" />
            <div className="p-5">
              <h2 className="text-2xl font-black">Player Sign In</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <label className="block text-sm font-bold text-slate-600">
                  Phone number
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadPlayer();
                    }}
                    autoComplete="tel"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-lg font-black text-slate-950 shadow-inner outline-none ring-teal-400/30 focus:ring-4"
                    placeholder="941-555-1212"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => loadPlayer()}
                  disabled={loading || !phone.trim()}
                  className="rounded-lg border border-teal-900 bg-teal-700 px-6 py-3 font-black text-white shadow-[0_14px_28px_-18px_rgba(15,118,110,0.9)] transition hover:-translate-y-0.5 hover:bg-teal-800 disabled:border-slate-300 disabled:bg-slate-300"
                >
                  {loading ? "Loading..." : "Continue"}
                </button>
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                <input type="checkbox" checked={savePhone} onChange={(event) => setSavePhone(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
                Save on this device
              </label>
            </div>
          </section>
        )}

        {state && (
          <section className="mt-5 space-y-4">
            <PlayerHistorySummary
              history={state.history}
              showHistory={showHistory}
              setShowHistory={setShowHistory}
            />

            {showHistory && (
              <PastSessions
                history={state.history}
                onSelect={setSelectedHistorySession}
              />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-slate-950">Upcoming Sessions</h2>
              <button type="button" onClick={() => loadPlayer()} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-500 hover:bg-teal-50 disabled:bg-slate-100">
                Refresh
              </button>
            </div>

            {(state.sessions || []).length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/90 p-8 text-center font-semibold text-slate-500 shadow-sm">
                No upcoming invited sessions are open for this phone number.
              </div>
            )}

            {(state.sessions || []).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                actionLoading={actionLoading}
                updateStatus={updateStatus}
                onHostSession={openHostSession}
                onFinishSession={finishHostSession}
              />
            ))}
          </section>
        )}

        {selectedHistorySession && (
          <HistorySessionModal
            session={selectedHistorySession}
            onClose={() => setSelectedHistorySession(null)}
          />
        )}
      </div>
    </main>
  );
}

function PlayerHistorySummary({ history, showHistory, setShowHistory }) {
  const [range, setRange] = useState("all");
  const filteredSessions = filterHistorySessions(history?.sessions || [], range);
  const stats = aggregateHistorySessions(filteredSessions);
  const sessionCount = history?.sessions?.length || 0;

  return (
    <section className="overflow-hidden rounded-lg border border-white/80 bg-white/95 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.8)]">
      <div className="h-2 bg-[linear-gradient(90deg,#0f766e,#2563eb,#f59e0b)]" />
      <div className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-950">Player Record</h2>
          <button
            type="button"
            onClick={() => setShowHistory((current) => !current)}
            className="rounded-lg border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            {showHistory ? "Hide Past Sessions" : `Past Sessions (${sessionCount})`}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PLAYER_RECORD_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={`rounded-lg px-3 py-2 text-xs font-black shadow-sm ${range === item.id ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <StatTile label="Sessions" value={stats.sessionsScored} />
          <StatTile label="Record" value={`${stats.wins || 0}-${stats.losses || 0}`} />
          <StatTile label="Win %" value={formatPercent(stats.winPct)} />
          <StatTile label="Point Diff" value={formatSignedNumber(stats.pointDiff || 0)} />
        </div>
      </div>
    </section>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function PastSessions({ history, onSelect }) {
  const sessions = history?.sessions || [];

  return (
    <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.8)]">
      <h2 className="text-xl font-black text-slate-950">Past Sessions</h2>
      <div className="mt-3 space-y-2">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session)}
            className="grid w-full grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-400 hover:bg-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <span className="min-w-0">
              <span className="block text-lg font-black text-slate-950">{formatSessionHeadline(session)}</span>
              <span className="mt-1 block text-sm font-bold text-slate-600">{session.session_name || "Round Robin Session"}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{session.location || "Location pending"}</span>
            </span>
            <span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-black text-teal-900">
              {playerResultLabel(session.playerResult)}
            </span>
          </button>
        ))}
        {sessions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-bold text-slate-500">
            No completed past sessions are saved yet.
          </div>
        )}
      </div>
    </section>
  );
}

function SessionCard({ session, actionLoading, updateStatus, onHostSession, onFinishSession }) {
  const status = session.playerStatus || "invited";
  const maxPlayers = Number(session.maxPlayers || session.max_players || 0);
  const joinLoading = actionLoading === `${session.id}-joined`;
  const declineLoading = actionLoading === `${session.id}-declined`;
  const finishLoading = actionLoading === `${session.id}-finish`;
  const joinLabel = session.isFull && status !== "joined" ? "Join Waitlist" : "Join";
  const availableSpots = maxPlayers ? Math.max(0, maxPlayers - Number(session.joinedCount || 0)) : null;
  const isPlaying = session.status === "playing";
  const canRespond = session.hasPlayerResponse !== false && !isPlaying;
  const canStartSession = isPlaying || Number(session.joinedCount || 0) >= 4;

  return (
    <article className="overflow-hidden rounded-lg border border-white/80 bg-white/95 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.8)]">
      <div className="h-2 bg-[linear-gradient(90deg,#0f766e,#2563eb,#f59e0b)]" />
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-black text-slate-950 sm:text-3xl">
              {formatSessionHeadline(session)}
            </h3>
            <span className={`rounded-xl px-4 py-2 text-sm font-black uppercase tracking-wide shadow-sm ${statusClass(status)}`}>
              {status}
            </span>
            {session.canManageSession && (
              <span className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-black uppercase tracking-wide text-amber-900 shadow-sm">
                {session.hostRole || "Host"}
              </span>
            )}
          </div>
          <div className="mt-2 text-xl font-black text-slate-800">
            {session.session_name || "Round Robin Session"}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-600">
            {session.location || "Location pending"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
            <span className="rounded-lg bg-teal-50 px-3 py-2 text-teal-900">
              {availableSpots === null
                ? `${session.joinedCount} joined`
                : `${session.joinedCount} joined / ${availableSpots} player spot${availableSpots === 1 ? "" : "s"} available`}
            </span>
            {session.waitlistCount > 0 && (
              <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">{session.waitlistCount} waitlist</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {session.canManageSession && (
            <button
              type="button"
              onClick={() => onHostSession(session)}
              disabled={!canStartSession}
              className="rounded-lg border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:border-slate-300 disabled:bg-slate-300 disabled:hover:translate-y-0"
            >
              {isPlaying ? "Resume Session" : "Start Session"}
            </button>
          )}
          {session.canManageSession && !isPlaying && !canStartSession && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
              4 joined players required
            </div>
          )}
          {session.canManageSession && isPlaying && (
            <button
              type="button"
              onClick={() => onFinishSession(session)}
              disabled={finishLoading}
              className="rounded-lg border border-emerald-800 bg-emerald-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:border-slate-300 disabled:bg-slate-300"
            >
              {finishLoading ? "Finishing..." : "Finish Session"}
            </button>
          )}
          {canRespond && status !== "joined" && (
            <button
              type="button"
              onClick={() => updateStatus(session.id, "joined")}
              disabled={joinLoading}
              className="rounded-lg border border-teal-900 bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:border-slate-300 disabled:bg-slate-300"
            >
              {joinLoading ? "Saving..." : joinLabel}
            </button>
          )}
          {canRespond && status !== "declined" && (
            <button
              type="button"
              onClick={() => updateStatus(session.id, "declined")}
              disabled={declineLoading}
              className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {declineLoading ? "Saving..." : "Decline"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function filterHistorySessions(sessions, range) {
  if (range === "all") return sessions;

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);

  return sessions.filter((session) => {
    const date = session.session_date ? new Date(`${session.session_date}T12:00:00`) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    if (range === "currentMonth") return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    if (range === "lastMonth") return date.getFullYear() === lastMonthDate.getFullYear() && date.getMonth() === lastMonthDate.getMonth();
    if (range === "currentYear") return date.getFullYear() === currentYear;
    return true;
  });
}

function aggregateHistorySessions(sessions) {
  const totals = sessions.reduce((summary, session) => {
    const result = session.playerResult;
    if (!result) return summary;
    return {
      sessionsScored: summary.sessionsScored + 1,
      games: summary.games + Number(result.games || 0),
      wins: summary.wins + Number(result.wins || 0),
      losses: summary.losses + Number(result.losses || 0),
      pointDiff: summary.pointDiff + Number(result.point_diff || 0),
    };
  }, {
    sessionsScored: 0,
    games: 0,
    wins: 0,
    losses: 0,
    pointDiff: 0,
  });

  return {
    ...totals,
    winPct: totals.games > 0 ? totals.wins / totals.games : 0,
  };
}

function HistorySessionModal({ session, onClose }) {
  const matches = session.matches || [];
  const playedPlayerIds = playerIdsFromMatches(matches);
  const standings = (session.standings || []).filter((row) => playedPlayerIds.size === 0 || playedPlayerIds.has(String(row.player_id || "")));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">Session Results</div>
            <h2 className="text-2xl font-black">{formatSessionHeadline(session)}</h2>
            <div className="mt-1 text-sm font-semibold text-slate-300">{session.session_name || "Round Robin Session"}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
            Close
          </button>
        </div>
        <div className="max-h-[76vh] overflow-y-auto p-4">
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-black text-teal-950">
            Your result: {playerResultLabel(session.playerResult)}
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">Standings</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2 text-right">Record</th>
                    <th className="px-3 py-2 text-right">Points</th>
                    <th className="px-3 py-2 text-right">Diff</th>
                    <th className="px-3 py-2 text-right">Byes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {standings.map((row, index) => (
                    <tr key={row.id || `${row.session_id}-${row.player_id}`} className={String(row.player_id || "") === String(session.playerResult?.player_id || "") ? "bg-teal-50" : "bg-white"}>
                      <td className="px-3 py-2 font-black text-slate-950">#{index + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-800">{row.display_name}</td>
                      <td className="px-3 py-2 text-right font-black text-slate-950">{row.wins}-{row.losses}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.points_for}-{row.points_against}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.point_diff || 0)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.byes || 0}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm font-bold text-slate-500" colSpan={6}>No standings have been saved for this session yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200">
            <div className="bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">Games</div>
            <div className="divide-y divide-slate-100">
              {matches.map((match) => (
                <div key={match.id} className="grid grid-cols-1 gap-2 px-3 py-3 text-sm sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                  <div className="font-black text-slate-600">Round {match.round_number}</div>
                  <div className="font-bold text-slate-800">{playerNames(match.team1_players)}</div>
                  <div className="rounded-md bg-slate-950 px-3 py-1 text-center font-black text-white">
                    {match.team1_score ?? "-"} - {match.team2_score ?? "-"}
                  </div>
                  <div className="font-bold text-slate-800">{playerNames(match.team2_players)}</div>
                </div>
              ))}
              {matches.length === 0 && (
                <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No games were saved for this session.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusClass(status) {
  if (status === "joined") return "bg-teal-100 text-teal-900";
  if (status === "waitlist") return "bg-amber-100 text-amber-900";
  if (status === "declined") return "bg-red-100 text-red-800";
  return "bg-blue-100 text-blue-900";
}

function statusNotice(status) {
  if (status === "joined") return "You are joined for this session.";
  if (status === "waitlist") return "The session is full, so you were added to the waitlist.";
  if (status === "declined") return "You are marked as declined for this session.";
  return "Your response was saved.";
}

function formatSessionHeadline(session) {
  const dateText = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }) : "Date pending";
  const timeText = session?.starts_at ? formatTime(session.starts_at) : "Time pending";
  return `${dateText} at ${timeText}`;
}

function formatTime(value) {
  const [hourText, minuteText] = String(value || "").split(":");
  const hour = Number(hourText || 0);
  const minute = Number(minuteText || 0);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function playerResultLabel(result) {
  if (!result) return "Results pending";
  return `#${result.rank || "-"} / ${result.wins || 0}-${result.losses || 0} / ${formatSignedNumber(result.point_diff || 0)}`;
}

function playerNames(players) {
  return (players || []).map((player) => player.firstLabel || player.displayName || player.display_name || player.display_name_snapshot || "Player").join(" / ") || "Team";
}

function playerIdsFromMatches(matches = []) {
  return matches.reduce((ids, match) => {
    [
      ...(match.team1_players || []),
      ...(match.team2_players || []),
      ...(match.bye_players || []),
    ].forEach((player) => {
      const id = String(player.id || player.player_id || "");
      if (id) ids.add(id);
    });
    return ids;
  }, new Set());
}

function formatPercent(value) {
  const numeric = Number(value || 0);
  return `${Math.round(numeric * 100)}%`;
}

function formatSignedNumber(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `+${numeric}` : String(numeric);
}

function formatPhoneInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) return digits.slice(-10);
  return digits;
}
