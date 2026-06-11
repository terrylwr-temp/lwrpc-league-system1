"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { roundRobinModeLabel } from "../../../lib/roundRobins";
import { roundRobinPlayerLabel } from "../../../lib/roundRobinSchedule";

const TABS = ["Session", "Players", "Groups", "Courts", "Settings", "SMS", "Log"];
const DEFAULT_SMS_TEMPLATES = {
  sessionInvite: "{{group_name}}: {{session_name}} is open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Reply to the host or open {{public_link}} to join.",
  sessionReminder: "{{group_name}} reminder: {{session_name}} is still open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Please reply if you can play or if you are out.",
  gameUpdate: "{{group_name}} game update: ",
  weatherUpdate: "{{group_name}} weather update: ",
  sessionResults: "{{group_name}} Results for {{date}}:\n{{result_rankings}}",
};
const SMS_TEMPLATE_OPTIONS = [
  { key: "sessionInvite", label: "New Session" },
  { key: "sessionReminder", label: "Pending Reminder" },
  { key: "gameUpdate", label: "Game Update" },
  { key: "weatherUpdate", label: "Weather Update" },
  { key: "sessionResults", label: "Results" },
];
const PLAYER_STATS_RANGES = [
  { id: "currentSession", label: "Current Session" },
  { id: "currentMonth", label: "Current Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "currentYear", label: "Current Year" },
  { id: "all", label: "All" },
];

export default function RoundRobinAdminPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storageKey = `lwrpc-round-robin-code-${id}`;
  const hostPhoneStorageKey = `lwrpc-round-robin-host-phone-${id}`;
  const hostSessionStorageKey = `lwrpc-round-robin-host-session-${id}`;
  const playerPhoneStorageKey = `lwrpc-round-robin-player-phone-${id}`;
  const requestedHostSessionId = searchParams.get("hostSessionId") || "";
  const requestedManagerMode = searchParams.get("manager") === "1";
  const [eventCode, setEventCode] = useState("");
  const [hostPhone, setHostPhone] = useState("");
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState("Session");
  const [swapSelection, setSwapSelection] = useState([]);
  const [liveSessionId, setLiveSessionId] = useState("");
  const [hostUnlocking, setHostUnlocking] = useState(false);
  const [pendingScores, setPendingScores] = useState({});

  useEffect(() => {
    if (requestedManagerMode) {
      window.sessionStorage.removeItem(hostPhoneStorageKey);
      window.sessionStorage.removeItem(hostSessionStorageKey);
      window.sessionStorage.removeItem(storageKey);
      setEventCode("");
      setHostPhone("");
      setState(null);
      return;
    }

    const cachedHostSessionId = requestedHostSessionId || window.sessionStorage.getItem(hostSessionStorageKey) || "";
    const cachedHostPhone = window.sessionStorage.getItem(hostPhoneStorageKey) || window.localStorage.getItem(playerPhoneStorageKey) || "";
    if (cachedHostSessionId && cachedHostPhone) {
      window.sessionStorage.setItem(hostPhoneStorageKey, cachedHostPhone);
      window.sessionStorage.setItem(hostSessionStorageKey, cachedHostSessionId);
      setHostPhone(cachedHostPhone);
      setHostUnlocking(true);
      unlockHost(cachedHostPhone, cachedHostSessionId);
      return;
    }

    if (requestedHostSessionId && !cachedHostPhone) {
      setError("Open this session from your player screen so your phone can be verified.");
      setHostUnlocking(false);
      return;
    }

    const cachedCode = window.sessionStorage.getItem(storageKey) || "";
    if (cachedCode) {
      setEventCode(cachedCode);
      unlock(cachedCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, requestedHostSessionId, requestedManagerMode, playerPhoneStorageKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 20000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function unlock(code = eventCode, preferredSessionId = liveSessionId) {
    const cleanCode = String(code || "").trim();
    if (!cleanCode) {
      setError("Enter the manager code.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/round-robin/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: id,
        eventCode: cleanCode,
        ...(preferredSessionId ? { hostSessionId: preferredSessionId } : {}),
      }),
    });
    const result = await response.json().catch(() => ({}));
    setLoading(false);
    setHostUnlocking(false);

    if (!response.ok || !result.success) {
      window.sessionStorage.removeItem(storageKey);
      setState(null);
      setError(result.error || "Unable to unlock Round Robin manager.");
      return;
    }

    window.sessionStorage.setItem(storageKey, cleanCode);
    setEventCode(cleanCode);
    setState(result);
  }

  async function unlockHost(nextPhone = hostPhone, nextSessionId = requestedHostSessionId || window.sessionStorage.getItem(hostSessionStorageKey) || "") {
    const cleanPhone = String(nextPhone || window.sessionStorage.getItem(hostPhoneStorageKey) || window.localStorage.getItem(playerPhoneStorageKey) || "").trim();
    const cleanSessionId = String(nextSessionId || "").trim();
    if (!cleanPhone || !cleanSessionId) {
      setError("Open this session from your player screen so your phone can be verified.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    const response = await fetch("/api/round-robin/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: id, hostPhone: cleanPhone, hostSessionId: cleanSessionId }),
    });
    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok || !result.success) {
      window.sessionStorage.removeItem(hostPhoneStorageKey);
      window.sessionStorage.removeItem(hostSessionStorageKey);
      setState(null);
      setError(result.error || "Unable to unlock host controls.");
      return;
    }

    window.sessionStorage.setItem(hostPhoneStorageKey, cleanPhone);
    window.sessionStorage.setItem(hostSessionStorageKey, result.hostSessionId || cleanSessionId);
    setHostPhone(cleanPhone);
    setEventCode("");
    setActiveTab("Session");
    setState(result);
  }

  async function runAction(action, payload = {}, options = {}) {
    const isHostAccess = state?.accessMode === "host";
    const cleanCode = String(eventCode || window.sessionStorage.getItem(storageKey) || "").trim();
    const cleanHostPhone = String(hostPhone || window.sessionStorage.getItem(hostPhoneStorageKey) || "").trim();
    const cleanHostSessionId = String(payload.sessionId || state?.hostSessionId || window.sessionStorage.getItem(hostSessionStorageKey) || "").trim();
    const preferredSessionId = String(payload.sessionId || liveSessionId || "").trim();
    setActionLoading(action);
    setError("");
    setNotice("");

    const response = await fetch("/api/round-robin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupId: id,
        ...(isHostAccess ? { hostPhone: cleanHostPhone, hostSessionId: cleanHostSessionId } : { eventCode: cleanCode }),
        action,
        ...payload,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setActionLoading("");

    if (!response.ok || !result.success) {
      setError(result.error || "Unable to complete Round Robin action.");
      return options.returnResult ? { success: false, error: result.error } : false;
    }

    if (isHostAccess) {
      await unlockHost(cleanHostPhone, cleanHostSessionId);
    } else {
      await unlock(cleanCode, preferredSessionId);
    }
    setNotice(noticeForAction(action, result));
    return options.returnResult ? result : true;
  }

  function recordPendingScore(matchId, side, value) {
    setPendingScores((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] || {}),
        [side]: value,
      },
    }));
  }

  async function saveCurrentRoundScores() {
    const matches = state?.matches || [];
    if (matches.length === 0) return;

    const savedMatchIds = [];
    for (const match of matches) {
      const pending = pendingScores[match.id] || {};
      const team1Score = pending.team1Score ?? match.team1_score ?? "";
      const team2Score = pending.team2Score ?? match.team2_score ?? "";
      if (String(team1Score).trim() === "" || String(team2Score).trim() === "") continue;
      if (String(match.team1_score ?? "") === String(team1Score) && String(match.team2_score ?? "") === String(team2Score)) continue;

      const result = await runAction("updateMatchScore", {
        matchId: match.id,
        team1Score,
        team2Score,
      }, { returnResult: true });
      if (result?.success !== false) savedMatchIds.push(match.id);
    }

    if (savedMatchIds.length > 0) {
      setPendingScores((current) => {
        const next = { ...current };
        savedMatchIds.forEach((matchId) => delete next[matchId]);
        return next;
      });
    }
  }

  async function enterLiveSession(sessionId) {
    const nextSessionId = String(sessionId || "").trim();
    if (!nextSessionId) return;
    setActiveTab("Session");
    setSwapSelection([]);
    const cleanCode = String(eventCode || window.sessionStorage.getItem(storageKey) || "").trim();
    if (cleanCode) await unlock(cleanCode, nextSessionId);
    setLiveSessionId(nextSessionId);
  }

  async function exitLiveSession() {
    setLiveSessionId("");
    setSwapSelection([]);
    router.push(`/round-robin/${state?.group?.slug || id}/player`);
  }

  function exitToDashboard() {
    window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(hostPhoneStorageKey);
    window.sessionStorage.removeItem(hostSessionStorageKey);
    setState(null);
    setEventCode("");
    setHostPhone("");
    setLiveSessionId("");
    router.push("/");
  }

  function exitHostToPlayer() {
    router.push(`/round-robin/${state?.group?.slug || id}/player`);
  }

  if (!state && requestedHostSessionId && !requestedManagerMode) {
    return (
      <main className="full-screen-main flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-4 text-slate-950">
        <div className="w-full max-w-lg overflow-hidden rounded-lg border border-white/80 bg-white/95 text-center shadow-[0_24px_70px_-42px_rgba(15,23,42,0.75)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="p-6">
            <div className="text-xs font-black uppercase tracking-wide text-teal-700">Live Session</div>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{hostUnlocking || loading ? "Opening session..." : "Live session access"}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {error || "Verifying your saved player phone and opening the assigned live session."}
            </p>
            {error && (
              <button type="button" onClick={() => router.push(`/round-robin/${id}/player`)} className="mt-4 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                Back to Player Screen
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="full-screen-main flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#063a34_0%,#132d4b_58%,#5f4517_100%)] p-4 text-white">
        <div className="w-full max-w-lg overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-[0_34px_90px_-46px_rgba(0,0,0,0.95)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="border-b border-teal-300/20 bg-slate-900 px-6 py-5">
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">Round Robin</div>
            <h1 className="mt-1 text-3xl font-black">Manager System</h1>
            <p className="mt-2 text-sm font-semibold text-teal-100">
              Public schedule and results do not require this code. Player contacts, setup, scoring, and texts do.
            </p>
          </div>
          <div className="p-6" suppressHydrationWarning>
            <input
              type="text"
              suppressHydrationWarning
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              data-1p-ignore="true"
              data-bwignore="true"
              data-form-type="other"
              value={eventCode}
              onChange={(event) => {
                setEventCode(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") unlock();
              }}
              className="w-full rounded-lg border border-teal-300/30 bg-slate-900 px-4 py-4 text-center text-2xl font-black tracking-[0.35em] text-white outline-none ring-teal-400/40 focus:ring-4"
              style={{ WebkitTextSecurity: "disc" }}
              placeholder="Code"
            />
            {error && <div className="mt-3 rounded-lg bg-red-950/70 p-3 text-sm font-bold text-red-100">{error}</div>}
            <button
              type="button"
              onClick={() => unlock()}
              disabled={loading || !eventCode.trim()}
              className="mt-4 w-full rounded-lg bg-teal-500 px-5 py-4 font-black text-white shadow-sm hover:bg-teal-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {loading ? "Unlocking..." : "Unlock Manager"}
            </button>
            <Link className="mt-4 block text-center text-sm font-bold text-teal-200 hover:text-white" href={`/round-robin/${id}/player`}>
              Back to Player View
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const groupKey = state.group.slug || id;
  const latestSession = (state.sessions || []).find((session) => String(session.id) === String(state.activeSessionId || "")) || state.sessions?.[0] || null;
  const liveSession = liveSessionId ? (state.sessions || []).find((session) => String(session.id || "") === String(liveSessionId)) : null;
  const rounds = groupMatchesByRound(state.matches || []);
  const visibleTabs = state.accessMode === "host" ? ["Session"] : TABS;

  if (state.accessMode === "host") {
    return (
      <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-3 text-slate-950 sm:p-5">
        <div className="w-full space-y-4">
          {(error || notice) && (
            <div className={`rounded-lg px-4 py-3 text-sm font-bold ${
              error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
            }`}>
              {error || notice}
            </div>
          )}

          {latestSession ? (
            <ActiveSessionControls
              session={latestSession}
              state={state}
              runAction={runAction}
              saveCurrentRoundScores={saveCurrentRoundScores}
              actionLoading={actionLoading}
              onExit={exitHostToPlayer}
              hostMode
            />
          ) : (
            <section className="rounded-lg border border-white/80 bg-white/95 p-8 text-center shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
              <h1 className="text-2xl font-black text-slate-950">No active session found</h1>
              <button type="button" onClick={exitHostToPlayer} className="mt-4 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                Exit
              </button>
            </section>
          )}

          {rounds.map((round) => (
            <ManagerRound
              key={round.roundNumber}
              round={round}
              runAction={runAction}
              actionLoading={actionLoading}
              swapSelection={swapSelection}
              setSwapSelection={setSwapSelection}
              onPendingScoreChange={recordPendingScore}
            />
          ))}
        </div>
      </main>
    );
  }

  if (liveSessionId && activeTab === "Session") {
    const selectedSession = liveSession || latestSession;
    return (
      <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-3 text-slate-950 sm:p-5">
        <div className="w-full space-y-4">
          {(error || notice) && (
            <div className={`rounded-lg px-4 py-3 text-sm font-bold ${
              error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
            }`}>
              {error || notice}
            </div>
          )}

          {selectedSession ? (
            <ActiveSessionControls
              session={selectedSession}
              state={state}
              runAction={runAction}
              saveCurrentRoundScores={saveCurrentRoundScores}
              actionLoading={actionLoading}
              onExit={exitLiveSession}
              showExit
            />
          ) : (
            <section className="rounded-lg border border-white/80 bg-white/95 p-8 text-center shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
              <h1 className="text-2xl font-black text-slate-950">No active session found</h1>
              <button type="button" onClick={exitLiveSession} className="mt-4 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                Exit
              </button>
            </section>
          )}

          {rounds.map((round) => (
            <ManagerRound
              key={round.roundNumber}
              round={round}
              runAction={runAction}
              actionLoading={actionLoading}
              swapSelection={swapSelection}
              setSwapSelection={setSwapSelection}
              onPendingScoreChange={recordPendingScore}
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-3 text-slate-950 sm:p-5">
      <div className="w-full">
        <header className="overflow-hidden rounded-lg border border-teal-900/10 bg-slate-950 text-white shadow-[0_26px_75px_-44px_rgba(15,23,42,0.95)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-teal-200">{state.accessMode === "host" ? "Round Robin Host" : "Round Robin Manager"}</div>
              <h1 className="text-3xl font-black sm:text-4xl">{state.group.name}</h1>
              <p className="mt-1 text-sm font-semibold text-slate-300">
                {roundRobinModeLabel(state.group.mode)}
                {latestSession ? ` - Latest: ${formatDate(latestSession.session_date)} (${latestSession.status})` : ""}
                {state.hostPlayer ? ` - ${state.hostPlayer.display_name}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-lg border border-white/40 bg-white px-4 py-2 text-sm font-black text-slate-950 shadow-[0_10px_24px_-14px_rgba(255,255,255,0.9)] ring-1 ring-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-lg" href={`/round-robin/${groupKey}/player`}>
                Player View
              </Link>
              <button type="button" onClick={exitToDashboard} className="rounded-lg border border-teal-200/60 bg-teal-500 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(20,184,166,0.9)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-lg">
                Exit
              </button>
            </div>
          </div>
          </div>
        </header>

        <div className="sticky top-0 z-20 mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-300 bg-white/95 p-2 shadow-[0_18px_46px_-32px_rgba(15,23,42,0.9)] backdrop-blur sm:flex sm:flex-wrap">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg border px-4 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                activeTab === tab
                  ? "border-slate-950 bg-slate-950 text-white ring-2 ring-teal-300/70"
                  : "border-slate-300 bg-slate-50 text-slate-800 ring-1 ring-white hover:border-teal-500 hover:bg-teal-50 hover:text-teal-950"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {(error || notice) && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
            error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
          }`}>
            {error || notice}
          </div>
        )}

        {activeTab === "Session" && (
          <SessionTab
            state={state}
            runAction={runAction}
            actionLoading={actionLoading}
            rounds={rounds}
            swapSelection={swapSelection}
            setSwapSelection={setSwapSelection}
            enterLiveSession={enterLiveSession}
          />
        )}

        {activeTab === "Players" && <PlayersTab state={state} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "Groups" && <GroupsTab state={state} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "Courts" && <CourtsTab state={state} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "Settings" && <SettingsTab state={state} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "SMS" && <SmsTab state={state} latestSession={latestSession} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "Log" && <LogTab state={state} />}
      </div>
    </main>
  );
}

function SessionTab(props) {
  const {
    state,
    runAction,
    actionLoading,
    enterLiveSession,
  } = props;
  const [form, setForm] = useState(() => newSessionForm(state));
  const [editingSessionId, setEditingSessionId] = useState("");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [playersModalSession, setPlayersModalSession] = useState(null);
  const [playersModalStatus, setPlayersModalStatus] = useState("joined");
  const [startModalSession, setStartModalSession] = useState(null);
  const [startCourts, setStartCourts] = useState([]);
  const [resultsModalSession, setResultsModalSession] = useState(null);
  const isEditingSession = Boolean(editingSessionId);
  const visibleSessionBase = useMemo(
    () => sessionsForMode(state.sessions || [], showPastSessions),
    [state.sessions, showPastSessions]
  );
  const filteredSessions = useMemo(
    () => filterSessions(visibleSessionBase, sessionSearch, state),
    [state, visibleSessionBase, sessionSearch]
  );

  function toggleInvitedGroup(groupId) {
    setForm((current) => ({
      ...current,
      invitedGroupIds: current.invitedGroupIds.includes(groupId)
        ? current.invitedGroupIds.filter((id) => id !== groupId)
        : [...current.invitedGroupIds, groupId],
    }));
  }

  function openAddSession() {
    setEditingSessionId("");
    setForm(newSessionForm(state));
    setSessionModalOpen(true);
  }

  async function saveSession() {
    const saved = await runAction(isEditingSession ? "updatePlannedSession" : "createPlannedSession", {
      ...form,
      sessionId: editingSessionId,
      mode: state.group.mode,
      publicUrl: playerRoundRobinUrl(state.group),
    });
    if (saved) {
      setSessionModalOpen(false);
      setEditingSessionId("");
      setForm(newSessionForm(state));
    }
  }

  function editSession(session) {
    setEditingSessionId(session.id);
    setForm(sessionFormFromSession(state, session));
    setSessionModalOpen(true);
  }

  function duplicateSession(session) {
    setEditingSessionId("");
    setForm({
      ...sessionFormFromSession(state, session),
      sessionDate: "",
      smsEnabled: state.group.settings?.smsSendingEnabled === true,
    });
    setSessionModalOpen(true);
  }

  function cancelEditSession() {
    setEditingSessionId("");
    setSessionModalOpen(false);
    setForm(newSessionForm(state));
  }

  function openPlayersModal(session, status = "joined") {
    setPlayersModalSession(session);
    setPlayersModalStatus(status);
  }

  function openStartModal(session) {
    const joinedCount = sessionPlayersForStatus(state, session.id, "joined").length;
    const suggestedCourtCount = suggestedCourtCountForPlayers(joinedCount);
    setStartModalSession(session);
    setStartCourts(sessionCourtRows(session, state.courts, suggestedCourtCount));
  }

  function updateStartCourt(index, field, value) {
    setStartCourts((current) => current.map((court, courtIndex) => courtIndex === index ? { ...court, [field]: value } : court));
  }

  async function confirmStartSession() {
    if (!startModalSession) return;
    const sessionId = startModalSession.id;
    const started = await runAction("startSessionAndGenerateFirstGame", {
      sessionId,
      courtCount: startCourts.length,
      sessionCourts: startCourts,
    });
    if (started) {
      setStartModalSession(null);
      enterLiveSession(sessionId);
    }
  }

  async function deleteSession(session) {
    if (!window.confirm(`Delete ${session.session_name || "this session"}? It will be removed from active sessions and kept as cancelled history.`)) return;
    await runAction("deleteSession", { sessionId: session.id });
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="space-y-4">
        <SessionsPanel
          state={state}
          sessions={filteredSessions}
          totalCount={visibleSessionBase.length}
          showPastSessions={showPastSessions}
          setShowPastSessions={setShowPastSessions}
          sessionSearch={sessionSearch}
          setSessionSearch={setSessionSearch}
          openAddSession={openAddSession}
          editingSessionId={editingSessionId}
          editSession={editSession}
          duplicateSession={duplicateSession}
          openPlayersModal={openPlayersModal}
          openStartModal={openStartModal}
          openSessionResults={setResultsModalSession}
          enterLiveSession={enterLiveSession}
          deleteSession={deleteSession}
          runAction={runAction}
          actionLoading={actionLoading}
        />
      </section>

      {sessionModalOpen && (
        <SessionFormModal
          state={state}
          form={form}
          setForm={setForm}
          isEditingSession={isEditingSession}
          toggleInvitedGroup={toggleInvitedGroup}
          saveSession={saveSession}
          actionLoading={actionLoading}
          onClose={cancelEditSession}
        />
      )}

      {playersModalSession && (
        <SessionPlayersModal
          state={state}
          session={playersModalSession}
          status={playersModalStatus}
          setStatus={setPlayersModalStatus}
          runAction={runAction}
          actionLoading={actionLoading}
          onClose={() => setPlayersModalSession(null)}
        />
      )}

      {startModalSession && (
        <StartSessionModal
          session={startModalSession}
          courts={startCourts}
          updateCourt={updateStartCourt}
          joinedCount={sessionPlayersForStatus(state, startModalSession.id, "joined").length}
          actionLoading={actionLoading}
          onClose={() => setStartModalSession(null)}
          onStart={confirmStartSession}
        />
      )}

      {resultsModalSession && (
        <SessionResultsModal
          state={state}
          session={resultsModalSession}
          onClose={() => setResultsModalSession(null)}
        />
      )}
    </div>
  );
}

function SessionFormModal({ state, form, setForm, isEditingSession, toggleInvitedGroup, saveSession, actionLoading, onClose }) {
  const saving = ["createPlannedSession", "updatePlannedSession"].includes(actionLoading);
  const smsAvailable = state.group.settings?.smsSendingEnabled === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">Session Setup</div>
            <h2 className="text-2xl font-black">{isEditingSession ? "Edit Session" : "Add Session"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
            Cancel
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextInput label="Session name" value={form.sessionName} onChange={(value) => setForm((current) => ({ ...current, sessionName: value }))} />
            <TextInput label="Location" value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} />
            <TextInput label="Date" type="date" value={form.sessionDate} onChange={(value) => setForm((current) => ({ ...current, sessionDate: value }))} />
            <TextInput label="Start time" type="time" value={form.startsAt} onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} />
            <TextInput label="Max players" type="number" value={form.maxPlayers} onChange={(value) => setForm((current) => ({ ...current, maxPlayers: Number(value) }))} />
            <label className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.repeatsWeekly} onChange={(event) => setForm((current) => ({ ...current, repeatsWeekly: event.target.checked }))} className="mb-1 h-5 w-5 rounded border-slate-300 text-teal-700" />
              Repeats weekly
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Host
              <select value={form.hostPlayerId} onChange={(event) => setForm((current) => ({ ...current, hostPlayerId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                <option value="">Select host</option>
                {activePlayers(state.players).map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Co-host
              <select value={form.cohostPlayerId} onChange={(event) => setForm((current) => ({ ...current, cohostPlayerId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                <option value="">No co-host</option>
                {activePlayers(state.players).map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-black text-slate-700">Invited Groups</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {(state.playerGroups || []).filter((group) => group.is_active !== false).map((group) => (
                <label key={group.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
                  <input type="checkbox" checked={form.invitedGroupIds.includes(group.id)} onChange={() => toggleInvitedGroup(group.id)} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
                  <span className="min-w-0 flex-1">{group.name}</span>
                  <span className="text-xs text-slate-500">{playerCountForGroup(state, group.id)}</span>
                </label>
              ))}
              {(state.playerGroups || []).length === 0 && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Create at least one player group first.</div>}
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={smsAvailable && form.smsEnabled}
              onChange={(event) => setForm((current) => ({ ...current, smsEnabled: event.target.checked }))}
              disabled={!smsAvailable}
              className="h-5 w-5 rounded border-slate-300 text-teal-700 disabled:bg-slate-200"
            />
            {isEditingSession ? "Text all Joined Players when updated" : "Text invited players when created"}
          </label>
          {!smsAvailable && (
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              SMS sending is off in the SMS tab. Turn it on before this checkbox can be used.
            </div>
          )}

          <button
            type="button"
            onClick={saveSession}
            disabled={saving || !form.sessionName.trim() || !form.sessionDate || form.invitedGroupIds.length === 0}
            className="mt-4 w-full rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300"
          >
            {saving ? "Saving..." : isEditingSession ? "Update Session" : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionsPanel(props) {
  const {
    state,
    sessions,
    totalCount,
    showPastSessions,
    setShowPastSessions,
    sessionSearch,
    setSessionSearch,
    openAddSession,
    editingSessionId,
    editSession,
    duplicateSession,
    openPlayersModal,
    openStartModal,
    openSessionResults,
    enterLiveSession,
    deleteSession,
    runAction,
    actionLoading,
  } = props;

  return (
    <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Sessions</h2>
          <div className="mt-1 text-xs font-bold text-slate-500">
            Showing {sessions.length} of {totalCount} {showPastSessions ? "past" : "upcoming/current"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openAddSession} className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-800">
            Add Session
          </button>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-300 bg-slate-100 p-1 text-xs font-black">
            <button type="button" onClick={() => setShowPastSessions(false)} className={`rounded-md px-3 py-2 ${showPastSessions ? "text-slate-600 hover:bg-white" : "bg-white text-slate-950 shadow-sm"}`}>
              Upcoming
            </button>
            <button type="button" onClick={() => setShowPastSessions(true)} className={`rounded-md px-3 py-2 ${showPastSessions ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white"}`}>
              Past
            </button>
          </div>
        </div>
      </div>

      <label className="mt-3 block text-sm font-bold text-slate-600">
        Search sessions
        <input
          type="search"
          value={sessionSearch}
          onChange={(event) => setSessionSearch(event.target.value)}
          placeholder="Name, location, date, status"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-950 shadow-inner outline-none ring-teal-400/30 focus:ring-4"
        />
      </label>

      <div className="mt-3 space-y-2">
        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            state={state}
            session={session}
            isEditing={String(session.id) === String(editingSessionId)}
            editSession={editSession}
            duplicateSession={duplicateSession}
            openPlayersModal={openPlayersModal}
            openStartModal={openStartModal}
            openSessionResults={openSessionResults}
            enterLiveSession={enterLiveSession}
            deleteSession={deleteSession}
            runAction={runAction}
            actionLoading={actionLoading}
          />
        ))}
        {sessions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-bold text-slate-500">
            No sessions match this view.
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveSessionControls({ session, state, runAction, saveCurrentRoundScores = null, actionLoading, onExit = null, showExit = false, hostMode = false }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const isPlaying = session.status === "playing";
  const isClosed = ["done", "cancelled"].includes(session.status);
  const joinedCount = allPlayersForSession(state, session.id).filter((player) => player.response_status === "joined").length;
  const canStartSession = isPlaying || joinedCount >= 4;

  async function primaryAction() {
    if (isPlaying) {
      if (saveCurrentRoundScores) await saveCurrentRoundScores();
      await runAction("generateNextGame", { sessionId: session.id });
      return;
    }

    await runAction("startSessionAndGenerateFirstGame", { sessionId: session.id });
  }

  async function finishSession() {
    if (!window.confirm(`Finish ${session.session_name || "this session"}? This will close scoring and save final results.`)) return;
    if (saveCurrentRoundScores) await saveCurrentRoundScores();
    await runAction("completeSession", { sessionId: session.id, smsEnabled: true });
  }

  async function exitSession() {
    if (saveCurrentRoundScores) await saveCurrentRoundScores();
    onExit?.();
  }

  async function openStats() {
    if (saveCurrentRoundScores) await saveCurrentRoundScores();
    setStatsOpen(true);
  }

  return (
    <section className="sticky top-2 z-30 rounded-lg border border-teal-200 bg-teal-50/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-wide text-teal-700">Live Session</div>
          <h2 className="text-xl font-black text-slate-950">{session.session_name || "Session"}</h2>
          <div className="mt-1 text-sm font-bold text-slate-600">
            {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openStats}
            className="rounded-lg border border-teal-300 bg-white px-4 py-3 text-sm font-black text-teal-900 shadow-sm hover:border-teal-500 hover:bg-white"
          >
            Stats
          </button>
          <button
            type="button"
            onClick={primaryAction}
            disabled={isClosed || !canStartSession || ["generateNextGame", "startSessionAndGenerateFirstGame"].includes(actionLoading)}
            className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-300"
          >
            {["generateNextGame", "startSessionAndGenerateFirstGame"].includes(actionLoading)
              ? "Working..."
              : isPlaying ? "Next Game" : "Start Session"}
          </button>
          <button
            type="button"
            onClick={finishSession}
            disabled={isClosed || actionLoading === "completeSession"}
            className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-800 disabled:bg-slate-300"
          >
            {actionLoading === "completeSession" ? "Finishing..." : "Finish"}
          </button>
          {(showExit || hostMode) && onExit && (
            <button type="button" onClick={exitSession} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm hover:border-teal-500 hover:bg-teal-50">
              Exit
            </button>
          )}
        </div>
      </div>
      {!isPlaying && joinedCount < 4 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
          At least 4 joined players are required before this session can start. Current joined players: {joinedCount}.
        </div>
      )}
      {statsOpen && <SessionStatsModal session={session} state={state} onClose={() => setStatsOpen(false)} />}
    </section>
  );
}

function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function SessionStatsModal({ session, state, onClose }) {
  const matches = state?.matches || [];
  const latestRoundNumber = Math.max(0, ...matches.map((match) => Number(match.round_number || 0)));
  const currentMatches = latestRoundNumber > 0 ? matches.filter((match) => Number(match.round_number || 0) === latestRoundNumber) : matches;
  const currentPlayers = new Map();
  currentMatches.forEach((match) => {
    [...(match.team1_players || []), ...(match.team2_players || []), ...(match.bye_players || [])].forEach((player) => {
      currentPlayers.set(String(player.id), player.displayName || player.display_name || player.firstLabel || "Player");
    });
  });
  const resultsByPlayer = new Map((state?.results || []).map((row) => [String(row.player_id), row]));
  const rows = Array.from(currentPlayers.entries())
    .map(([playerId, displayName]) => ({
      player_id: playerId,
      display_name: displayName,
      games: 0,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      point_diff: 0,
      byes: 0,
      rank: null,
      ...(resultsByPlayer.get(playerId) || {}),
    }))
    .sort((first, second) => {
      const firstRank = Number(first.rank || 9999);
      const secondRank = Number(second.rank || 9999);
      if (firstRank !== secondRank) return firstRank - secondRank;
      return String(first.display_name || "").localeCompare(String(second.display_name || ""));
    })
    .map((row, index) => ({ ...row, displayRank: index + 1 }));

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
      <div className="my-2 max-h-[calc(100vh-1rem)] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">Current Game Stats</div>
            <h2 className="text-2xl font-black">{session.session_name || "Session"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
            Close
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {rows.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Player</th>
                    <th className="px-3 py-2 text-right">Record</th>
                    <th className="px-3 py-2 text-right">Games</th>
                    <th className="px-3 py-2 text-right">Points</th>
                    <th className="px-3 py-2 text-right">Diff</th>
                    <th className="px-3 py-2 text-right">Byes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((row) => (
                    <tr key={row.player_id}>
                      <td className="px-3 py-2 font-black text-slate-950">#{row.displayRank}</td>
                      <td className="px-3 py-2 font-black text-slate-950">{row.display_name || "Player"}</td>
                      <td className="px-3 py-2 text-right font-black text-slate-950">{row.wins || 0}-{row.losses || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.games || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.points_for || 0}-{row.points_against || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.point_diff || 0)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.byes || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-bold text-slate-500">
              Generate a game to show current player rankings.
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function SessionResultsModal({ state, session, onClose }) {
  const standings = sessionResultsForSession(state, session.id);
  const matches = sessionMatchesForSession(state, session.id);

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
        <div className="my-2 max-h-[calc(100vh-1rem)] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-teal-200">Past Session Results</div>
              <h2 className="text-2xl font-black">{session.session_name || "Session"}</h2>
              <div className="mt-1 text-sm font-semibold text-slate-300">
                {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}{session.location ? ` - ${session.location}` : ""}
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
              Close
            </button>
          </div>
          <div className="max-h-[76vh] overflow-y-auto p-4">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Player</th>
                    <th className="px-3 py-2 text-right">Record</th>
                    <th className="px-3 py-2 text-right">Games</th>
                    <th className="px-3 py-2 text-right">Points</th>
                    <th className="px-3 py-2 text-right">Diff</th>
                    <th className="px-3 py-2 text-right">Byes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {standings.map((row, index) => (
                    <tr key={row.id || `${row.session_id}-${row.player_id}`}>
                      <td className="px-3 py-2 font-black text-slate-950">#{index + 1}</td>
                      <td className="px-3 py-2 font-black text-slate-950">{row.display_name || "Player"}</td>
                      <td className="px-3 py-2 text-right font-black text-slate-950">{row.wins || 0}-{row.losses || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.games || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.points_for || 0}-{row.points_against || 0}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.point_diff || 0)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.byes || 0}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm font-bold text-slate-500" colSpan={7}>No played-player stats are saved for this session yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200">
              <div className="bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">Rounds</div>
              <div className="divide-y divide-slate-100">
                {matches.map((match) => (
                  <div key={match.id} className="px-3 py-3 text-sm">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="font-black text-slate-600">Round {match.round_number} - {match.court_name || `Court ${match.court_number}`}</div>
                      <div className="rounded-md bg-slate-950 px-3 py-1 text-center font-black text-white">
                        {match.team1_score ?? "-"} - {match.team2_score ?? "-"}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                      <div className="rounded-lg bg-teal-50 px-3 py-2 font-bold text-teal-950">{playerNames(match.team1_players)}</div>
                      <div className="text-center text-xs font-black uppercase tracking-wide text-slate-400">vs</div>
                      <div className="rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-950">{playerNames(match.team2_players)}</div>
                    </div>
                    {(match.bye_players || []).length > 0 && (
                      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-black text-amber-900">
                        Bye: {playerNames(match.bye_players)}
                      </div>
                    )}
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
    </ModalPortal>
  );
}

function SessionListItem({ state, session, isEditing, editSession, duplicateSession, openPlayersModal, openStartModal, openSessionResults, enterLiveSession, deleteSession, actionLoading }) {
  const joined = sessionPlayersForStatus(state, session.id, "joined").length;
  const waitlist = sessionPlayersForStatus(state, session.id, "waitlist").length;
  const canStart = !["playing", "done", "cancelled"].includes(session.status) && joined >= 4;
  const canResume = session.status === "playing";
  const isHostAccess = state.accessMode === "host";
  const isStarted = ["playing", "done", "cancelled"].includes(session.status);
  const canShowResults = isPastSession(session);
  const canDuplicate = !isHostAccess && session.status === "done";
  const canShowPlayers = session.status !== "done";
  const stopActionClick = (event) => event.stopPropagation();

  return (
    <div
      role={canShowResults ? "button" : undefined}
      tabIndex={canShowResults ? 0 : undefined}
      onClick={canShowResults ? () => openSessionResults(session) : undefined}
      onKeyDown={canShowResults ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSessionResults(session);
        }
      } : undefined}
      className={`rounded-lg border p-3 ${canShowResults ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-teal-400 hover:bg-white hover:shadow-md" : ""} ${isEditing ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-slate-50"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-black text-slate-950">{session.session_name || "Session"}</div>
            <span className={`rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wide ${sessionLifecycleClass(session.status)}`}>
              {session.status}
            </span>
          </div>
          <div className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-xl">
            {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
          </div>
          {session.location && <div className="mt-1 text-xs font-bold text-slate-500">{session.location}</div>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-md bg-teal-100 px-2 py-1 text-teal-900">{joined} Joined</span>
            <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-900">{waitlist} Waitlist</span>
            {session.max_players && <span className="rounded-md bg-blue-100 px-2 py-1 text-blue-900">Max {session.max_players}</span>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {!isHostAccess && !isStarted && (
            <button type="button" onClick={(event) => { stopActionClick(event); editSession(session); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm hover:border-teal-500 hover:bg-teal-50">
              Edit
            </button>
          )}
          {canShowPlayers && (
            <button type="button" onClick={(event) => { stopActionClick(event); openPlayersModal(session); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm hover:border-blue-500 hover:bg-blue-50">
              Players
            </button>
          )}
          {canShowResults && (
            <button type="button" onClick={(event) => { stopActionClick(event); openSessionResults(session); }} className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-black text-teal-900 shadow-sm hover:border-teal-500 hover:bg-teal-100">
              Results
            </button>
          )}
          {canDuplicate && (
            <button type="button" onClick={(event) => { stopActionClick(event); duplicateSession(session); }} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 shadow-sm hover:border-amber-500 hover:bg-amber-100">
              Duplicate
            </button>
          )}
          {canResume ? (
            <button type="button" onClick={(event) => { stopActionClick(event); enterLiveSession(session.id); }} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800">
              Resume Session
            </button>
          ) : (
            <button type="button" onClick={(event) => { stopActionClick(event); openStartModal(session); }} disabled={!canStart || actionLoading === "startSessionAndGenerateFirstGame"} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-300">
              Start Session
            </button>
          )}
          {!isHostAccess && !isStarted && (
            <button type="button" onClick={(event) => { stopActionClick(event); deleteSession(session); }} disabled={actionLoading === "deleteSession" || session.status === "cancelled"} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 shadow-sm hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionPlayersModal({ state, session, status, setStatus, runAction, actionLoading, onClose }) {
  const players = sessionPlayersForStatus(state, session.id, status);
  const statuses = ["joined", "declined", "waitlist", "invited"];
  const statusActionLoading = actionLoading === "updateSessionPlayerStatus";
  const [addPlayerId, setAddPlayerId] = useState("");
  const currentSessionPlayerIds = new Set(allPlayersForSession(state, session.id).map((player) => String(player.player_id || "")).filter(Boolean));
  const addablePlayers = activePlayers(state.players)
    .filter((player) => !currentSessionPlayerIds.has(String(player.id)))
    .sort((a, b) => String(a.display_name || "").localeCompare(String(b.display_name || "")));

  function updatePlayerStatus(player, nextStatus) {
    runAction("updateSessionPlayerStatus", {
      sessionId: session.id,
      playerId: player.player_id,
      status: nextStatus,
    });
  }

  async function addSavedPlayer() {
    if (!addPlayerId) return;
    const added = await runAction("addSessionPlayer", {
      sessionId: session.id,
      playerId: addPlayerId,
    });
    if (added) {
      setAddPlayerId("");
      setStatus("joined");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">Session Players</div>
            <h2 className="text-2xl font-black">{session.session_name || "Session"}</h2>
            <div className="mt-1 text-sm font-semibold text-slate-300">
              {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
            Close
          </button>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {statuses.map((item) => (
              <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-lg border px-3 py-2 text-sm font-black capitalize shadow-sm ${
                status === item ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-slate-50 text-slate-700 hover:bg-white"
              }`}>
                {item} ({sessionPlayersForStatus(state, session.id, item).length})
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block text-sm font-bold text-slate-600">
                Add saved player to this session
                <select value={addPlayerId} onChange={(event) => setAddPlayerId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-950">
                  <option value="">Select player</option>
                  {addablePlayers.map((player) => (
                    <option key={player.id} value={player.id}>{player.display_name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={addSavedPlayer}
                disabled={!addPlayerId || actionLoading === "addSessionPlayer"}
                className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300"
              >
                {actionLoading === "addSessionPlayer" ? "Adding..." : "Add Joined"}
              </button>
            </div>
            {addablePlayers.length === 0 && <div className="mt-2 text-xs font-bold text-slate-500">All saved active players are already listed for this session.</div>}
          </div>
          <div className="mt-4 max-h-[52vh] overflow-y-auto rounded-lg border border-slate-200">
            {players.map((player) => (
              <div key={player.id} className="grid grid-cols-1 gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="font-black text-slate-950">{player.display_name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {[player.email, player.phone].filter(Boolean).join(" / ") || "No contact saved"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {player.response_status !== "joined" && (
                    <button
                      type="button"
                      onClick={() => updatePlayerStatus(player, "joined")}
                      disabled={statusActionLoading}
                      className="rounded-lg border border-teal-700 bg-teal-50 px-3 py-2 text-xs font-black text-teal-900 shadow-sm hover:bg-teal-100 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Join
                    </button>
                  )}
                  {player.response_status !== "declined" && (
                    <button
                      type="button"
                      onClick={() => updatePlayerStatus(player, "declined")}
                      disabled={statusActionLoading}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-800 shadow-sm hover:bg-red-100 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Decline
                    </button>
                  )}
                </div>
              </div>
            ))}
            {players.length === 0 && (
              <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">
                No {status} players for this session.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StartSessionModal({ session, courts, updateCourt, joinedCount, actionLoading, onClose, onStart }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">Start Session</div>
            <h2 className="text-2xl font-black">{session.session_name || "Session"}</h2>
            <div className="mt-1 text-sm font-semibold text-slate-300">
              {joinedCount} joined players - {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
            Cancel
          </button>
        </div>
        <div className="p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-black text-slate-700">Confirm Court Names</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {courts.map((court, index) => (
                <div key={`start-court-${index}`} className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <TextInput label={`Court ${index + 1}`} value={court.name} onChange={(value) => updateCourt(index, "name", value)} />
                  <TextInput label="Description" value={court.description} onChange={(value) => updateCourt(index, "description", value)} />
                </div>
              ))}
            </div>
          </div>
          <button type="button" onClick={onStart} disabled={actionLoading === "startSessionAndGenerateFirstGame" || joinedCount < 4} className="mt-4 w-full rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
            {actionLoading === "startSessionAndGenerateFirstGame" ? "Starting..." : "Start And Generate First Game"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManagerRound({ round, runAction, actionLoading, swapSelection, setSwapSelection, onPendingScoreChange }) {
  const roundScored = round.matches.length > 0 && round.matches.every(matchHasSavedScore);
  const playersInRound = round.matches.flatMap((match) => [
    ...slotPlayers(match, "team1"),
    ...slotPlayers(match, "team2"),
    ...slotPlayers(match, "bye"),
  ]);

  async function shuffleRound() {
    if (roundScored) return;
    const shuffled = [...playersInRound].sort(() => Math.random() - 0.5);
    const updatedMatches = round.matches.map((match) => {
      const team1 = shuffled.splice(0, (match.team1_players || []).length);
      const team2 = shuffled.splice(0, (match.team2_players || []).length);
      const byesForMatch = shuffled.splice(0, (match.bye_players || []).length);
      return { match, team1, team2, byes: byesForMatch };
    });

    for (const item of updatedMatches) {
      await runAction("updateMatchLineup", {
        matchId: item.match.id,
        team1Players: item.team1,
        team2Players: item.team2,
        byePlayers: item.byes,
      }, { returnResult: true });
    }
    setSwapSelection([]);
  }

  return (
    <section className={`rounded-lg border p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.75)] ${
      roundScored
        ? "border-emerald-300 bg-emerald-50/95 ring-2 ring-emerald-200/80"
        : "border-white/80 bg-white/95"
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-black">Round {round.roundNumber}</h2>
            {roundScored && (
              <span className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-black uppercase tracking-wide text-white shadow-sm">
                Round Complete
              </span>
            )}
          </div>
          {roundScored && <div className="mt-1 text-xs font-black uppercase tracking-wide text-emerald-700">Scores saved - lineup locked</div>}
        </div>
        {!roundScored && (
          <button type="button" onClick={shuffleRound} disabled={actionLoading === "updateMatchLineup"} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-amber-600 disabled:bg-slate-300">
            Shuffle Round
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 2xl:grid-cols-2">
        {round.matches.map((match) => (
          <ScoreCourt
            key={match.id}
            match={match}
            lineupLocked={roundScored}
            runAction={runAction}
            actionLoading={actionLoading}
            swapSelection={swapSelection}
            setSwapSelection={setSwapSelection}
            onPendingScoreChange={onPendingScoreChange}
          />
        ))}
      </div>
    </section>
  );
}

function ScoreCourt({ match, lineupLocked = false, runAction, actionLoading, swapSelection, setSwapSelection, onPendingScoreChange }) {
  const [team1Score, setTeam1Score] = useState(match.team1_score ?? "");
  const [team2Score, setTeam2Score] = useState(match.team2_score ?? "");
  const team2ScoreRef = useRef(null);

  useEffect(() => {
    setTeam1Score(match.team1_score ?? "");
    setTeam2Score(match.team2_score ?? "");
  }, [match.team1_score, match.team2_score]);

  async function saveScore() {
    await runAction("updateMatchScore", {
      matchId: match.id,
      team1Score,
      team2Score,
    });
  }

  function moveToSecondScore(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    team2ScoreRef.current?.focus();
    team2ScoreRef.current?.select();
  }

  function submitScoreFromKeyboard(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    saveScore();
  }

  function pickSlot(slot) {
    if (lineupLocked) return;
    const next = [...swapSelection, slot].slice(-2);
    setSwapSelection(next);
    if (next.length === 2) {
      performSwap(next[0], next[1], runAction).then(() => setSwapSelection([]));
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-900/10 bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.9)]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[linear-gradient(90deg,#0f3b36,#166b61)] px-3 py-2 text-white">
        <div className="font-black">{match.court_name || `Court ${match.court_number}`}</div>
        <div className="flex items-center gap-2">
          {matchHasSavedScore(match) && <div className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-black text-emerald-950">Score Saved</div>}
          <button type="button" onClick={saveScore} disabled={actionLoading === "updateMatchScore"} className="rounded-md bg-amber-300 px-3 py-1.5 text-xs font-black text-slate-950 shadow-sm hover:bg-amber-200 disabled:bg-slate-200">
            Save Score
          </button>
        </div>
      </div>
      <div className="relative min-h-48 overflow-hidden bg-[#163f38] p-3" style={{ perspective: "900px" }}>
        <div className="absolute inset-4 rounded-lg border border-white/35 bg-[linear-gradient(145deg,#9fe7c5_0%,#54c49a_48%,#20856f_100%)] shadow-[0_24px_42px_-24px_rgba(0,0,0,0.65)]" style={{ transform: "rotateX(8deg)", transformOrigin: "center bottom" }}>
          <div className="absolute inset-3 rounded-md border border-white/60" />
          <div className="absolute bottom-3 top-3 left-1/2 w-px bg-white/65" />
          <div className="absolute left-3 right-3 top-1/2 h-px bg-white/50" />
          <div className="absolute bottom-3 top-3 left-[25%] w-px bg-white/35" />
          <div className="absolute bottom-3 top-3 right-[25%] w-px bg-white/35" />
        </div>
        <div className="relative z-10 grid min-h-44 grid-cols-[1fr_auto_1fr] items-stretch gap-3 p-3">
          <div className="flex flex-col justify-start gap-3 pt-2">
            <input value={team1Score} onChange={(event) => { setTeam1Score(event.target.value); onPendingScoreChange?.(match.id, "team1Score", event.target.value); }} onKeyDown={moveToSecondScore} inputMode="numeric" className="ml-auto mr-1 w-20 rounded-md border border-amber-200 bg-white px-2 py-2 text-center text-lg font-black text-slate-950 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.9)] outline-none ring-amber-300/30 focus:ring-4" />
            <SlotSide match={match} side="team1" align="right" pickSlot={pickSlot} selected={swapSelection} tone="teal" locked={lineupLocked} />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-full w-px rounded-full bg-white/70 shadow-[0_0_16px_rgba(255,255,255,0.65)]" />
          </div>
          <div className="flex flex-col justify-start gap-3 pt-2">
            <input ref={team2ScoreRef} value={team2Score} onChange={(event) => { setTeam2Score(event.target.value); onPendingScoreChange?.(match.id, "team2Score", event.target.value); }} onKeyDown={submitScoreFromKeyboard} inputMode="numeric" className="ml-1 w-20 rounded-md border border-amber-200 bg-white px-2 py-2 text-center text-lg font-black text-slate-950 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.9)] outline-none ring-amber-300/30 focus:ring-4" />
            <SlotSide match={match} side="team2" pickSlot={pickSlot} selected={swapSelection} tone="blue" locked={lineupLocked} />
          </div>
        </div>
      </div>
      {(match.bye_players || []).length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 p-2 text-sm font-bold text-amber-900">
          Bye:
          <div className="mt-1 flex flex-wrap gap-2">
            {(match.bye_players || []).map((player, index) => (
              <PlayerChip key={`${player.id}-${index}`} player={player} slot={{ match, side: "bye", index, player }} pickSlot={pickSlot} selected={swapSelection} locked={lineupLocked} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SlotSide({ match, side, align = "left", pickSlot, selected, tone = "teal", locked = false }) {
  const players = side === "team1" ? match.team1_players || [] : match.team2_players || [];
  return (
    <div className={`flex flex-col justify-center gap-2 ${align === "right" ? "items-end text-right" : "items-start text-left"}`}>
      {players.map((player, index) => (
        <PlayerChip key={`${player.id}-${index}`} player={player} slot={{ match, side, index, player }} pickSlot={pickSlot} selected={selected} tone={tone} locked={locked} />
      ))}
    </div>
  );
}

function PlayerChip({ player, slot, pickSlot, selected, tone = "teal", locked = false }) {
  const isSelected = selected.some((item) => item.match.id === slot.match.id && item.side === slot.side && item.index === slot.index);
  const toneClass = tone === "blue"
    ? "border-blue-200 bg-blue-950/90 text-white hover:bg-blue-900"
    : "border-teal-200 bg-teal-950/90 text-white hover:bg-teal-900";
  return (
    <button
      type="button"
      onClick={() => pickSlot(slot)}
      disabled={locked}
      tabIndex={-1}
      className={`w-fit rounded-full border px-4 py-2 text-base font-black shadow-[0_14px_28px_-18px_rgba(15,23,42,0.95)] ring-1 ring-white/25 transition ${
        locked ? "cursor-default border-slate-300 bg-slate-700/90 text-white" : isSelected ? "border-amber-200 bg-amber-300 text-slate-950 ring-2 ring-amber-100" : toneClass
      }`}
    >
      {player.firstLabel || player.displayName || roundRobinPlayerLabel(player.display_name)}
    </button>
  );
}

async function performSwap(first, second, runAction) {
  if (!first || !second) return;
  const firstMatch = cloneMatch(first.match);
  const secondMatch = first.match.id === second.match.id ? firstMatch : cloneMatch(second.match);
  const firstPlayer = getSlotPlayer(firstMatch, first);
  const secondPlayer = getSlotPlayer(secondMatch, second);
  setSlotPlayer(firstMatch, first, secondPlayer);
  setSlotPlayer(secondMatch, second, firstPlayer);

  await runAction("updateMatchLineup", {
    matchId: firstMatch.id,
    team1Players: firstMatch.team1_players,
    team2Players: firstMatch.team2_players,
    byePlayers: firstMatch.bye_players,
  }, { returnResult: true });

  if (secondMatch.id !== firstMatch.id) {
    await runAction("updateMatchLineup", {
      matchId: secondMatch.id,
      team1Players: secondMatch.team1_players,
      team2Players: secondMatch.team2_players,
      byePlayers: secondMatch.bye_players,
    }, { returnResult: true });
  }
}

function PlayersTab({ state, runAction, actionLoading }) {
  const [form, setForm] = useState(emptyPlayerForm());
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [statsPlayer, setStatsPlayer] = useState(null);
  const savedPlayers = useMemo(
    () => (state.players || []).filter((player) => player.is_active !== false),
    [state.players]
  );
  const filteredSavedPlayers = useMemo(
    () => filterPlayers(state, savedPlayers, playerSearch),
    [state, savedPlayers, playerSearch]
  );
  const memberOptions = useMemo(
    () => filteredMemberOptions(state.members || [], memberSearch),
    [state.members, memberSearch]
  );

  function editPlayer(player) {
    const linkedMember = (state.members || []).find((member) => String(member.id) === String(player.member_id || ""));
    setForm({
      id: player.id,
      memberId: player.member_id || "",
      displayName: player.display_name || "",
      email: player.email || "",
      phone: player.phone || "",
      notes: player.notes || "",
      isActive: player.is_active !== false,
      groupIds: groupIdsForPlayer(state, player.id),
    });
    setMemberSearch(linkedMember ? memberLabel(linkedMember) : "");
    setMemberPickerOpen(false);
  }

  function chooseMember(memberId) {
    const member = (state.members || []).find((row) => String(row.id) === String(memberId));
    if (!member) return;
    setForm((current) => ({
      ...current,
      memberId: member.id,
      displayName: member.full_name || [member.first_name, member.last_name].filter(Boolean).join(" "),
      email: member.email || "",
      phone: member.phone || "",
    }));
    setMemberSearch(memberLabel(member));
    setMemberPickerOpen(false);
  }

  function updateMemberSearch(value) {
    setMemberSearch(value);
    setMemberPickerOpen(true);
    if (form.memberId) {
      setForm((current) => ({ ...current, memberId: "" }));
    }
  }

  function clearMemberLink() {
    setForm((current) => ({ ...current, memberId: "" }));
    setMemberSearch("");
    setMemberPickerOpen(false);
  }

  function togglePlayerGroup(groupId) {
    setForm((current) => ({
      ...current,
      groupIds: current.groupIds.includes(groupId)
        ? current.groupIds.filter((id) => id !== groupId)
        : [...current.groupIds, groupId],
    }));
  }

  async function save() {
    const saved = await runAction("savePlayer", {
      player: {
        id: form.id,
        memberId: form.memberId,
        displayName: form.displayName,
        email: form.email,
        phone: form.phone,
        notes: form.notes,
        is_active: form.isActive,
        groupIds: form.groupIds,
      },
    });
    if (saved) {
      setForm(emptyPlayerForm());
      setMemberSearch("");
      setMemberPickerOpen(false);
    }
  }

  async function deleteSavedPlayer(player) {
    const playerName = player.display_name || "this player";
    if (!window.confirm(`Delete ${playerName} from Saved Players? Past session history will stay saved.`)) return;

    const deleted = await runAction("deletePlayer", { playerId: player.id });
    if (deleted && String(form.id) === String(player.id)) {
      setForm(emptyPlayerForm());
      setMemberSearch("");
      setMemberPickerOpen(false);
    }
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[26rem_minmax(0,1fr)]">
      <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
        <h2 className="text-xl font-black">{form.id ? "Edit Player" : "Add Player"}</h2>
        <div className="mt-3 space-y-3">
          <div className="relative">
            <label className="block text-sm font-bold text-slate-600" htmlFor="round-robin-member-search">
              Main member system
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="round-robin-member-search"
                type="text"
                value={memberSearch}
                onChange={(event) => updateMemberSearch(event.target.value)}
                onFocus={() => setMemberPickerOpen(true)}
                onBlur={() => window.setTimeout(() => setMemberPickerOpen(false), 150)}
                placeholder="Type first name to find an LMS member"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
              />
              {form.memberId && (
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearMemberLink} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200">
                  Clear
                </button>
              )}
            </div>
            {memberPickerOpen && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-[0_18px_38px_-24px_rgba(15,23,42,0.85)]">
                {memberOptions.length > 0 ? (
                  memberOptions.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        chooseMember(member.id);
                      }}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left hover:bg-teal-50"
                    >
                      <span className="block text-sm font-black text-slate-950">{memberDisplayName(member)}</span>
                      <span className="block text-xs font-semibold text-slate-500">{[member.email, member.phone].filter(Boolean).join(" / ") || "No contact in LMS"}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm font-semibold text-slate-500">No LMS member matches. Use the manual fields below.</div>
                )}
              </div>
            )}
          </div>
          <TextInput label="Name" value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} />
          <TextInput label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
          <TextInput label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
          <TextInput label="Notes" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
          <div>
            <div className="text-sm font-bold text-slate-600">Player groups</div>
            <div className="mt-1 grid grid-cols-1 gap-2">
              {(state.playerGroups || []).filter((group) => group.is_active !== false).map((group) => (
                <label key={group.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                  <input type="checkbox" checked={form.groupIds.includes(group.id)} onChange={() => togglePlayerGroup(group.id)} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
                  {group.name}
                </label>
              ))}
              {(state.playerGroups || []).length === 0 && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Create a group first, then assign players.</div>}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
            Active
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={actionLoading === "savePlayer" || !form.displayName.trim()} className="rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
              Save Player
            </button>
            {form.id && <button type="button" onClick={() => { setForm(emptyPlayerForm()); setMemberSearch(""); setMemberPickerOpen(false); }} className="rounded-lg bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200">Cancel</button>}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Saved Players</h2>
            <div className="mt-1 text-xs font-bold text-slate-500">
              Showing {filteredSavedPlayers.length} of {savedPlayers.length}
            </div>
          </div>
          <label className="min-w-0 flex-1 text-sm font-bold text-slate-600 sm:max-w-xs">
            Search players
            <input
              type="search"
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
              placeholder="Name, phone, email, group"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-950 shadow-inner outline-none ring-teal-400/30 focus:ring-4"
            />
          </label>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-950 text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSavedPlayers.map((player) => (
                <tr key={player.id}>
                  <td className="px-3 py-2 font-black">{player.display_name}</td>
                  <td className="px-3 py-2 font-semibold text-slate-600">
                    <div>{[player.email, player.phone].filter(Boolean).join(" / ") || "No contact"}</div>
                    <div className="mt-1 text-xs text-slate-500">{groupNamesForPlayer(state, player.id).join(", ") || "No groups"}</div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => editPlayer(player)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">Edit</button>
                      <button type="button" onClick={() => setStatsPlayer(player)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100">Stats</button>
                      <button type="button" onClick={() => deleteSavedPlayer(player)} disabled={actionLoading === "deletePlayer"} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {savedPlayers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center font-semibold text-slate-500">No saved players yet.</td>
                </tr>
              )}
              {savedPlayers.length > 0 && filteredSavedPlayers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center font-semibold text-slate-500">No players match that search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {statsPlayer && <PlayerStatsModal state={state} player={statsPlayer} onClose={() => setStatsPlayer(null)} />}
    </div>
  );
}

function PlayerStatsModal({ state, player, onClose }) {
  const [range, setRange] = useState("currentSession");
  const rows = playerResultsForRange(state, player.id, range);
  const totals = aggregatePlayerResultRows(rows);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
      <div className="my-2 max-h-[calc(100vh-1rem)] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-950 p-4 text-white">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">Saved Player Stats</div>
            <h2 className="text-2xl font-black">{player.display_name || "Player"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
            Close
          </button>
        </div>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
          <div className="flex flex-wrap gap-2">
            {PLAYER_STATS_RANGES.map((item) => (
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

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatBox label="Sessions" value={totals.sessions} />
            <StatBox label="Record" value={`${totals.wins}-${totals.losses}`} />
            <StatBox label="Games" value={totals.games} />
            <StatBox label="Win %" value={formatPercent(totals.winPct)} />
            <StatBox label="Points" value={`${totals.pointsFor}-${totals.pointsAgainst}`} />
            <StatBox label="Diff" value={formatSignedNumber(totals.pointDiff)} />
            <StatBox label="Byes" value={totals.byes} />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Session</th>
                  <th className="px-3 py-2 text-right">Session Rank</th>
                  <th className="px-3 py-2 text-right">Record</th>
                  <th className="px-3 py-2 text-right">Points</th>
                  <th className="px-3 py-2 text-right">Diff</th>
                  <th className="px-3 py-2 text-right">Byes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id || `${row.session_id}-${row.player_id}`}>
                    <td className="px-3 py-2 font-bold text-slate-700">{formatDate(row.session_date)}</td>
                    <td className="px-3 py-2 font-black text-slate-950">{row.session_name || "Session"}</td>
                    <td className="px-3 py-2 text-right font-black text-slate-950">#{row.rank || "-"}</td>
                    <td className="px-3 py-2 text-right font-black text-slate-950">{row.wins || 0}-{row.losses || 0}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{row.points_for || 0}-{row.points_against || 0}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.point_diff || 0)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{row.byes || 0}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm font-bold text-slate-500">No saved stats for this range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function GroupsTab({ state, runAction, actionLoading }) {
  const [form, setForm] = useState(emptyPlayerGroupForm());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const activeGroups = (state.playerGroups || []).filter((group) => group.is_active !== false);

  function editGroup(group) {
    setForm({
      id: group.id,
      name: group.name || "",
      description: group.description || "",
      isActive: group.is_active !== false,
    });
  }

  async function save() {
    const saved = await runAction("savePlayerGroup", {
      playerGroup: {
        id: form.id,
        name: form.name,
        description: form.description,
        is_active: form.isActive,
      },
    });
    if (saved) setForm(emptyPlayerGroupForm());
  }

  async function deleteGroup(group) {
    if (!window.confirm(`Delete ${group.name}? Players and past sessions will stay saved.`)) return;
    const deleted = await runAction("deletePlayerGroup", { playerGroupId: group.id });
    if (deleted) {
      if (String(form.id) === String(group.id)) setForm(emptyPlayerGroupForm());
      if (String(selectedGroup?.id) === String(group.id)) setSelectedGroup(null);
    }
  }

  const selectedPlayers = selectedGroup ? playersForGroup(state, selectedGroup.id) : [];

  return (
    <>
    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[26rem_minmax(0,1fr)]">
      <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
        <h2 className="text-xl font-black">{form.id ? "Edit Group" : "Add Group"}</h2>
        <div className="mt-3 space-y-3">
          <TextInput label="Group name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <TextInput label="Description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
            Active
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={actionLoading === "savePlayerGroup" || !form.name.trim()} className="rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
              Save Group
            </button>
            {form.id && <button type="button" onClick={() => setForm(emptyPlayerGroupForm())} className="rounded-lg bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200">Cancel</button>}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
        <h2 className="text-xl font-black">Player Groups</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {activeGroups.map((group) => (
            <div key={group.id} onClick={() => setSelectedGroup(group)} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedGroup(group); }} className="cursor-pointer rounded-lg border border-teal-100 bg-teal-50/70 p-4 shadow-sm transition hover:border-teal-300 hover:bg-teal-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black">{group.name}</h3>
                  {group.description && <p className="mt-1 text-sm font-semibold text-slate-600">{group.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={(event) => { event.stopPropagation(); editGroup(group); }} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">Edit</button>
                  <button type="button" onClick={(event) => { event.stopPropagation(); deleteGroup(group); }} disabled={actionLoading === "deletePlayerGroup"} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400">Delete</button>
                </div>
              </div>
              <div className="mt-3 text-sm font-bold text-slate-700">{playerCountForGroup(state, group.id)} player{playerCountForGroup(state, group.id) === 1 ? "" : "s"}</div>
            </div>
          ))}
          {activeGroups.length === 0 && <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center font-semibold text-slate-500">No groups yet.</div>}
        </div>
      </section>
    </div>
    {selectedGroup && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
          <div className="flex items-center justify-between gap-3 bg-slate-950 px-5 py-4 text-white">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-teal-200">Current Players</div>
              <h2 className="text-2xl font-black">{selectedGroup.name}</h2>
            </div>
            <button type="button" onClick={() => setSelectedGroup(null)} className="rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-950">Close</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-5">
            {selectedPlayers.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Player</th>
                      <th className="px-3 py-2 text-left">Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPlayers.map((player) => (
                      <tr key={player.id}>
                        <td className="px-3 py-2 font-black text-slate-950">{player.display_name}</td>
                        <td className="px-3 py-2 font-semibold text-slate-600">{[player.email, player.phone].filter(Boolean).join(" / ") || "No contact"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center font-semibold text-slate-500">No current players in this group.</div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function CourtsTab({ state, runAction, actionLoading }) {
  const [courts, setCourts] = useState(() => activeCourts(state.courts).map(editableCourt));

  useEffect(() => {
    setCourts(activeCourts(state.courts).map(editableCourt));
  }, [state.courts]);

  function updateCourt(index, field, value) {
    setCourts((current) => current.map((court, courtIndex) => courtIndex === index ? { ...court, [field]: value } : court));
  }

  function addCourt() {
    setCourts((current) => [...current, { id: "", name: `Court ${current.length + 1}`, description: "", is_active: true }]);
  }

  function removeCourt(index) {
    setCourts((current) => current.filter((_, courtIndex) => courtIndex !== index));
  }

  return (
    <section className="mt-4 rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Courts</h2>
        <button type="button" onClick={addCourt} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">Add Court</button>
      </div>
      <div className="mt-3 space-y-3">
        {courts.map((court, index) => (
          <div key={`${court.id || "new"}-${index}`} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-[1fr_1fr_auto]">
            <TextInput label="Court name" value={court.name} onChange={(value) => updateCourt(index, "name", value)} />
            <TextInput label="Description" value={court.description} onChange={(value) => updateCourt(index, "description", value)} />
            <button type="button" onClick={() => removeCourt(index)} className="self-end rounded-lg bg-red-50 px-3 py-2 text-sm font-black text-red-700">Remove</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => runAction("saveCourts", { courts })} disabled={actionLoading === "saveCourts"} className="mt-4 rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
        Save Courts
      </button>
    </section>
  );
}

function SettingsTab({ state, runAction, actionLoading }) {
  const [form, setForm] = useState({
    name: state.group.name || "",
    adminCode: "",
    mode: state.group.mode || "daily_round_robin",
    scheduleDay: state.group.schedule_day || "",
    scheduleTime: state.group.schedule_time || "",
    timezone: state.group.timezone || "America/New_York",
    defaultRounds: Number(state.group.settings?.defaultRounds || 6),
  });
  const sessionCount = state.sessions?.length || 0;

  async function masterResetRoundRobin() {
    const firstOk = window.confirm([
      "Master Reset will permanently delete all Round Robin sessions for this group.",
      "",
      "This removes session history, joined/declined/waitlist session responses, generated rounds, scores, rankings, player stats, and session activity logs.",
      "",
      "Saved Players, Groups, and the players assigned to those Groups will be kept.",
    ].join("\n"));
    if (!firstOk) return;

    const typed = window.prompt('Final confirmation: type MASTER RESET to continue.');
    if (String(typed || "").trim() !== "MASTER RESET") return;

    await runAction("masterResetRoundRobin");
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="w-full rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
        <h2 className="text-xl font-black">Default Settings</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <TextInput label="Group name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <label className="text-sm font-bold text-slate-600">
            Default mode
            <select value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
              <option value="daily_round_robin">Daily Round Robin</option>
              <option value="ladder">Ladder League</option>
            </select>
          </label>
          <TextInput label="Default recurring day" value={form.scheduleDay} onChange={(value) => setForm((current) => ({ ...current, scheduleDay: value }))} placeholder="Tuesday" />
          <TextInput label="Default start time" value={form.scheduleTime} onChange={(value) => setForm((current) => ({ ...current, scheduleTime: value }))} placeholder="18:30" />
          <TextInput label="Default timezone" value={form.timezone} onChange={(value) => setForm((current) => ({ ...current, timezone: value }))} />
          <TextInput label="Default rounds" type="number" value={form.defaultRounds} onChange={(value) => setForm((current) => ({ ...current, defaultRounds: Number(value) }))} />
          <TextInput label="New manager code" value={form.adminCode} onChange={(value) => setForm((current) => ({ ...current, adminCode: value }))} placeholder="Leave blank to keep current" />
        </div>
        <button type="button" onClick={() => runAction("saveSettings", form)} disabled={actionLoading === "saveSettings" || !form.name.trim()} className="mt-4 rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
          Save Settings
        </button>
      </section>

      <section className="w-full rounded-lg border border-red-200 bg-red-50/95 p-4 shadow-[0_18px_48px_-36px_rgba(127,29,29,0.55)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-red-950">Master Reset</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-red-800">
              Deletes all session history, generated games, scores, rankings, and player stats for this Round Robin group. Saved Players, Groups, and player group assignments stay in place.
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-red-700">
              Current sessions/history rows: {sessionCount}
            </p>
          </div>
          <button type="button" onClick={masterResetRoundRobin} disabled={actionLoading === "masterResetRoundRobin"} className="rounded-lg bg-red-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-red-800 disabled:bg-slate-300">
            {actionLoading === "masterResetRoundRobin" ? "Resetting..." : "Master Reset"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SmsTab({ state, latestSession, runAction, actionLoading }) {
  const smsSessions = useMemo(() => [...(state.sessions || [])].sort(sortSessionsDescending), [state.sessions]);
  const initialSessionId = String(latestSession?.id || smsSessions[0]?.id || "");
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const selectedSmsSession = smsSessions.find((session) => String(session.id || "") === String(selectedSessionId)) || null;
  const selectedSessionPlayers = allPlayersForSession(state, selectedSmsSession?.id);
  const [templates, setTemplates] = useState(() => normalizeSmsTemplates(state.group.settings?.smsTemplates));
  const [message, setMessage] = useState(() => renderClientSmsTemplate(normalizeSmsTemplates(state.group.settings?.smsTemplates).gameUpdate, state.group, selectedSmsSession, selectedSessionPlayers));
  const [smsEnabled, setSmsEnabled] = useState(state.group.settings?.smsSendingEnabled === true);
  const [recipientScope, setRecipientScope] = useState("joined");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("gameUpdate");
  const [testPhone, setTestPhone] = useState("");
  const selectedTemplate = SMS_TEMPLATE_OPTIONS.find((template) => template.key === selectedTemplateKey) || SMS_TEMPLATE_OPTIONS[0];
  const isPendingReminder = selectedTemplateKey === "sessionReminder";

  useEffect(() => {
    setSmsEnabled(state.group.settings?.smsSendingEnabled === true);
    setTemplates(normalizeSmsTemplates(state.group.settings?.smsTemplates));
  }, [state.group.settings]);

  useEffect(() => {
    if (selectedSessionId && smsSessions.some((session) => String(session.id || "") === String(selectedSessionId))) return;
    setSelectedSessionId(initialSessionId);
  }, [initialSessionId, selectedSessionId, smsSessions]);

  function setTemplate(key, value) {
    setTemplates((current) => ({ ...current, [key]: value }));
  }

  async function saveSmsSettings(nextEnabled = smsEnabled, nextTemplates = templates) {
    await runAction("saveSmsSettings", {
      smsSendingEnabled: nextEnabled,
      smsTemplates: nextTemplates,
    });
  }

  async function toggleSmsSending(value) {
    setSmsEnabled(value);
    await saveSmsSettings(value, templates);
  }

  function applyTemplate(key) {
    setSelectedTemplateKey(key);
    setMessage(renderClientSmsTemplate(templates[key], state.group, selectedSmsSession, selectedSessionPlayers));
  }

  function selectSmsSession(sessionId) {
    const nextSession = smsSessions.find((session) => String(session.id || "") === String(sessionId)) || null;
    setSelectedSessionId(sessionId);
    setMessage(renderClientSmsTemplate(templates[selectedTemplateKey], state.group, nextSession, allPlayersForSession(state, nextSession?.id)));
  }

  async function sendSelectedText() {
    if (isPendingReminder) {
      if (!selectedSmsSession) return;
      await runAction("sendSessionReminderText", {
        sessionId: selectedSmsSession.id,
        message,
        smsEnabled,
        publicUrl: playerRoundRobinUrl(state.group),
      });
      return;
    }

    await runAction("sendBroadcastText", { sessionId: selectedSmsSession?.id, message, smsEnabled, recipientScope });
  }

  async function sendTemplateTest(key) {
    await runAction("sendTestTemplateText", {
      sessionId: selectedSmsSession?.id,
      phone: testPhone,
      template: templates[key],
      smsEnabled,
      publicUrl: playerRoundRobinUrl(state.group),
    });
  }

  return (
    <section className="mt-4 w-full rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
      <h2 className="text-xl font-black">Text Players</h2>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        Push notifications can be added later with app install/browser permission support. This first version uses the existing Twilio SMS path.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[minmax(16rem,1fr)_minmax(16rem,1fr)_auto] lg:items-end">
        <label className="block text-sm font-bold text-slate-600">
          Texting session
          <select value={selectedSessionId} onChange={(event) => selectSmsSession(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold">
            <option value="">Select session</option>
            {smsSessions.map((session) => (
              <option key={session.id} value={session.id}>
                {smsSessionLabel(session)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-600">
          {isPendingReminder ? "Recipients handled by selected text" : "Recipients"}
          <select value={recipientScope} onChange={(event) => setRecipientScope(event.target.value)} disabled={isPendingReminder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold disabled:bg-slate-100 disabled:text-slate-500">
            <option value="joined">Current joined players</option>
            <option value="invited">All invited players not joined/declined</option>
            <option value="session">All session players except declined</option>
            <option value="all">All saved active players</option>
          </select>
          {isPendingReminder && (
            <span className="mt-1 block text-xs font-semibold text-slate-500">
              Pending Reminder automatically goes to invited players who have not joined or declined.
            </span>
          )}
        </label>
        <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-slate-700">
          <input type="checkbox" checked={smsEnabled} onChange={(event) => toggleSmsSending(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
          SMS sending enabled
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {SMS_TEMPLATE_OPTIONS.map((template) => (
          <button
            key={template.key}
            type="button"
            onClick={() => applyTemplate(template.key)}
            className={`rounded-lg px-3 py-2 text-sm font-black shadow-sm ${selectedTemplateKey === template.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {template.label}
          </button>
        ))}
      </div>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={7} className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-sm font-semibold shadow-inner" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={sendSelectedText}
          disabled={["sendBroadcastText", "sendSessionReminderText"].includes(actionLoading) || !message.trim() || !selectedSmsSession}
          className="rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300"
        >
          {smsEnabled ? `Send ${selectedTemplate.label}` : `Log ${selectedTemplate.label}`}
        </button>
        {!selectedSmsSession && (
          <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
            Select a session before sending or logging texts.
          </div>
        )}
      </div>
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-950">Text Templates</h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Test phone
              <input type="tel" value={testPhone} onChange={(event) => setTestPhone(formatPhoneInput(event.target.value))} placeholder="941-555-1212" className="mt-1 w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-950" />
            </label>
            <button type="button" onClick={() => saveSmsSettings()} disabled={actionLoading === "saveSmsSettings"} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300">
              Save SMS Settings
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <TemplateTextarea label="New session text" value={templates.sessionInvite} onChange={(value) => setTemplate("sessionInvite", value)} onTest={() => sendTemplateTest("sessionInvite")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Pending signup reminder" value={templates.sessionReminder} onChange={(value) => setTemplate("sessionReminder", value)} onTest={() => sendTemplateTest("sessionReminder")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Game update" value={templates.gameUpdate} onChange={(value) => setTemplate("gameUpdate", value)} onTest={() => sendTemplateTest("gameUpdate")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Weather update" value={templates.weatherUpdate} onChange={(value) => setTemplate("weatherUpdate", value)} onTest={() => sendTemplateTest("weatherUpdate")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Session results" value={templates.sessionResults} onChange={(value) => setTemplate("sessionResults", value)} onTest={() => sendTemplateTest("sessionResults")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
        </div>
        <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-500">
          Placeholders: {"{{group_name}}"}, {"{{session_name}}"}, {"{{date}}"}, {"{{time}}"}, {"{{location}}"}, {"{{location_line}}"}, {"{{public_link}}"}, {"{{joined_count}}"}, {"{{available_spots}}"}, {"{{result_rankings}}"}
        </div>
      </div>
    </section>
  );
}

function LogTab({ state }) {
  return (
    <section className="mt-4 rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
      <h2 className="text-xl font-black">Activity Log</h2>
      <div className="mt-3 space-y-2">
        {(state.log || []).map((item) => (
          <div key={item.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <div className="font-black text-slate-950">{item.message}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{new Date(item.created_at).toLocaleString()}</div>
          </div>
        ))}
        {(state.log || []).length === 0 && <div className="text-sm font-semibold text-slate-500">No log entries yet.</div>}
      </div>
    </section>
  );
}

function TemplateTextarea({ label, value, onChange, onTest = null, testDisabled = false }) {
  return (
    <label className="block text-sm font-bold text-slate-600">
      <span className="flex items-center justify-between gap-2">
        <span>{label}</span>
        {onTest && (
          <button type="button" onClick={onTest} disabled={testDisabled} className="rounded-md bg-amber-100 px-2 py-1 text-xs font-black text-amber-900 hover:bg-amber-200 disabled:bg-slate-100 disabled:text-slate-400">
            Test
          </button>
        )}
      </span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm font-semibold text-slate-950 shadow-inner" />
    </label>
  );
}

function TextInput({ label, value, onChange, placeholder = "", type = "text" }) {
  return (
    <label className="block text-sm font-bold text-slate-600">
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950" />
    </label>
  );
}

function activePlayers(players = []) {
  return players.filter((player) => player.is_active !== false);
}

function sessionsForMode(sessions = [], showPastSessions) {
  const filtered = sessions.filter((session) => showPastSessions ? isPastSession(session) : !isPastSession(session));
  return filtered.sort(showPastSessions ? sortSessionsDescending : sortSessionsAscending);
}

function isPastSession(session) {
  const today = new Date().toISOString().slice(0, 10);
  return ["done", "cancelled"].includes(session.status) || String(session.session_date || "") < today;
}

function sortSessionsAscending(a, b) {
  return sessionSortValue(a).localeCompare(sessionSortValue(b));
}

function sortSessionsDescending(a, b) {
  return sessionSortValue(b).localeCompare(sessionSortValue(a));
}

function sessionSortValue(session) {
  return `${session.session_date || ""} ${session.starts_at || "99:99:99"} ${session.created_at || ""}`;
}

function sessionPlayersForStatus(state, sessionId, status) {
  return allPlayersForSession(state, sessionId)
    .filter((player) => player.response_status === status)
    .sort((a, b) => String(a.display_name || "").localeCompare(String(b.display_name || "")));
}

function allPlayersForSession(state, sessionId) {
  const rows = state.allSessionPlayers || [];
  const fallbackRows = rows.length > 0 ? rows : state.sessionPlayers || [];
  return fallbackRows.filter((player) => String(player.session_id) === String(sessionId));
}

function sessionResultsForSession(state, sessionId) {
  const playedPlayerIds = playerIdsFromMatches(sessionMatchesForSession(state, sessionId));
  return (state.allPlayerResults || state.results || [])
    .filter((row) => String(row.session_id || "") === String(sessionId))
    .filter((row) => playedPlayerIds.size === 0 || playedPlayerIds.has(String(row.player_id || "")))
    .sort((first, second) => {
      const firstRank = Number(first.rank || 9999);
      const secondRank = Number(second.rank || 9999);
      if (firstRank !== secondRank) return firstRank - secondRank;
      return String(first.display_name || "").localeCompare(String(second.display_name || ""));
    });
}

function sessionMatchesForSession(state, sessionId) {
  return (state.allMatches || state.matches || [])
    .filter((match) => String(match.session_id || "") === String(sessionId))
    .sort((first, second) => {
      const firstRound = Number(first.round_number || 0);
      const secondRound = Number(second.round_number || 0);
      if (firstRound !== secondRound) return firstRound - secondRound;
      return Number(first.court_number || 0) - Number(second.court_number || 0);
    });
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

function playerNames(players) {
  return (players || [])
    .map((player) => player.firstLabel || player.displayName || player.display_name || player.display_name_snapshot || "Player")
    .join(" / ") || "Team";
}

function suggestedCourtCountForPlayers(playerCount) {
  const count = Number(playerCount || 0);
  if (count < 8) return 1;
  if (count < 12) return 2;
  return Math.max(1, Math.floor(count / 4));
}

function sessionLifecycleClass(status) {
  if (status === "playing") return "bg-teal-100 text-teal-900";
  if (status === "done") return "bg-emerald-100 text-emerald-900";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  if (status === "open") return "bg-blue-100 text-blue-900";
  return "bg-slate-200 text-slate-700";
}

function filterSessions(sessions = [], query, state) {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return sessions;

  return sessions.filter((session) => {
    const host = playerNameById(state, session.host_player_id);
    const cohost = playerNameById(state, session.cohost_player_id);
    const invitedGroups = groupNamesByIds(state, session.invited_group_ids || []);
    const text = normalizeSearchText([
      session.session_name,
      session.location,
      session.session_date,
      session.starts_at,
      session.status,
      session.mode,
      session.max_players,
      session.repeats_weekly ? "weekly recurring repeats" : "",
      host,
      cohost,
      invitedGroups.join(" "),
      formatDate(session.session_date),
      session.starts_at ? formatTime(session.starts_at) : "",
    ]);
    return text.includes(cleanQuery);
  });
}

function filterPlayers(state, players = [], query) {
  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) return players;

  return players.filter((player) => {
    const text = normalizeSearchText([
      player.display_name,
      player.first_name,
      player.email,
      player.phone,
      player.notes,
      groupNamesForPlayer(state, player.id).join(" "),
    ]);
    return text.includes(cleanQuery);
  });
}

function playerNameById(state, playerId) {
  if (!playerId) return "";
  return (state.players || []).find((player) => String(player.id) === String(playerId))?.display_name || "";
}

function groupNamesByIds(state, groupIds = []) {
  const ids = new Set((Array.isArray(groupIds) ? groupIds : []).map(String));
  return (state.playerGroups || [])
    .filter((group) => ids.has(String(group.id)))
    .map((group) => group.name);
}

function normalizeSearchText(value) {
  if (Array.isArray(value)) return value.map(normalizeSearchText).join(" ").trim();
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function newSessionForm(state) {
  return {
    sessionName: `${state.group.name} Session`,
    location: "",
    sessionDate: new Date().toISOString().slice(0, 10),
    startsAt: timeInputValue(state.group.schedule_time),
    maxPlayers: 8,
    repeatsWeekly: false,
    hostPlayerId: activePlayers(state.players)[0]?.id || "",
    cohostPlayerId: "",
    invitedGroupIds: [],
    smsEnabled: state.group.settings?.smsSendingEnabled === true,
  };
}

function sessionFormFromSession(state, session) {
  return {
    sessionName: session.session_name || `${state.group.name} Session`,
    location: session.location || "",
    sessionDate: session.session_date || new Date().toISOString().slice(0, 10),
    startsAt: timeInputValue(session.starts_at),
    maxPlayers: Number(session.max_players || 8),
    repeatsWeekly: Boolean(session.repeats_weekly),
    hostPlayerId: session.host_player_id || "",
    cohostPlayerId: session.cohost_player_id || "",
    invitedGroupIds: Array.isArray(session.invited_group_ids) ? session.invited_group_ids : [],
    smsEnabled: false,
  };
}

function activeCourts(courts = []) {
  return courts.filter((court) => court.is_active !== false);
}

function editableCourt(court) {
  return {
    id: court.id || "",
    name: court.name || "",
    description: court.description || "",
    is_active: court.is_active !== false,
  };
}

function sessionCourtRows(session, defaultCourts, count) {
  const desiredCount = Math.max(1, Number(count || session?.court_count || 1));
  const existingCourts = Array.isArray(session?.settings?.sessionCourts) ? session.settings.sessionCourts : [];
  const sourceCourts = existingCourts.length > 0 ? existingCourts : activeCourts(defaultCourts);

  return Array.from({ length: desiredCount }, (_, index) => ({
    name: sourceCourts[index]?.name || `Court ${index + 1}`,
    description: sourceCourts[index]?.description || "",
  }));
}

function normalizeSmsTemplates(templates = {}) {
  return {
    sessionInvite: templates.sessionInvite || DEFAULT_SMS_TEMPLATES.sessionInvite,
    sessionReminder: templates.sessionReminder || DEFAULT_SMS_TEMPLATES.sessionReminder,
    gameUpdate: templates.gameUpdate || DEFAULT_SMS_TEMPLATES.gameUpdate,
    weatherUpdate: templates.weatherUpdate || DEFAULT_SMS_TEMPLATES.weatherUpdate,
    sessionResults: templates.sessionResults || DEFAULT_SMS_TEMPLATES.sessionResults,
  };
}

function renderClientSmsTemplate(template, group, session, sessionPlayers = []) {
  const date = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US") : "the next session";
  const time = session?.starts_at ? formatTime(session.starts_at) : "TBD";
  const location = session?.location || "";
  const joinedCount = sessionPlayers.length > 0
    ? sessionPlayers.filter((player) => player.response_status === "joined").length
    : Number(session?.joinedCount || session?.joined_count || 0);
  const maxPlayers = Number(session?.maxPlayers || session?.max_players || 0);
  const availableSpots = maxPlayers > 0 ? Math.max(0, maxPlayers - joinedCount) : "";
  const replacements = {
    group_name: group?.name || "Round Robin",
    session_name: session?.session_name || `${group?.name || "Round Robin"} Session`,
    date,
    time,
    location,
    location_line: location ? ` at ${location}` : "",
    public_link: playerRoundRobinUrl(group),
    joined_count: joinedCount,
    available_spots: availableSpots,
    result_rankings: "Rankings will be inserted when the session is finished.",
  };

  return String(template || "")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => replacements[key] ?? "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function smsSessionLabel(session) {
  return [
    formatDate(session.session_date) || "Date pending",
    session.starts_at ? formatTime(session.starts_at) : "",
    session.session_name || "Session",
    session.status ? `(${session.status})` : "",
  ].filter(Boolean).join(" - ");
}

function publicRoundRobinUrl(group) {
  const key = group?.slug || group?.id || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/round-robin/${key}`;
}

function playerRoundRobinUrl(group) {
  return `${publicRoundRobinUrl(group)}/player`;
}

function groupMatchesByRound(matches) {
  const byRound = {};
  matches.forEach((match) => {
    byRound[match.round_number] ||= { roundNumber: match.round_number, matches: [] };
    byRound[match.round_number].matches.push(match);
  });
  return Object.values(byRound).sort((a, b) => a.roundNumber - b.roundNumber);
}

function slotPlayers(match, side) {
  if (side === "team1") return (match.team1_players || []).map((player, index) => ({ ...player, match, side, index }));
  if (side === "team2") return (match.team2_players || []).map((player, index) => ({ ...player, match, side, index }));
  return (match.bye_players || []).map((player, index) => ({ ...player, match, side: "bye", index }));
}

function matchHasSavedScore(match) {
  return match.team1_score !== null
    && match.team1_score !== undefined
    && match.team2_score !== null
    && match.team2_score !== undefined;
}

function cloneMatch(match) {
  return {
    ...match,
    team1_players: [...(match.team1_players || [])],
    team2_players: [...(match.team2_players || [])],
    bye_players: [...(match.bye_players || [])],
  };
}

function getSlotPlayer(match, slot) {
  return playerArray(match, slot.side)[slot.index];
}

function setSlotPlayer(match, slot, player) {
  playerArray(match, slot.side)[slot.index] = player;
}

function playerArray(match, side) {
  if (side === "team1") return match.team1_players;
  if (side === "team2") return match.team2_players;
  return match.bye_players;
}

function emptyPlayerForm() {
  return {
    id: "",
    memberId: "",
    displayName: "",
    email: "",
    phone: "",
    notes: "",
    isActive: true,
    groupIds: [],
  };
}

function emptyPlayerGroupForm() {
  return {
    id: "",
    name: "",
    description: "",
    isActive: true,
  };
}

function filteredMemberOptions(members, query) {
  const cleanQuery = String(query || "").trim().toLowerCase();
  if (!cleanQuery) return members.slice(0, 100);

  return members
    .map((member) => ({ member, rank: memberSearchRank(member, cleanQuery) }))
    .filter((item) => item.rank < 100)
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return memberDisplayName(a.member).localeCompare(memberDisplayName(b.member));
    })
    .slice(0, 100)
    .map((item) => item.member);
}

function memberSearchRank(member, query) {
  const firstName = String(member.first_name || "").trim().toLowerCase();
  const lastName = String(member.last_name || "").trim().toLowerCase();
  const displayName = memberDisplayName(member).toLowerCase();
  const email = String(member.email || "").trim().toLowerCase();
  const phone = String(member.phone || "").trim().toLowerCase();

  if (firstName.startsWith(query)) return 0;
  if (displayName.startsWith(query)) return 1;
  if (lastName.startsWith(query)) return 2;
  if (email.startsWith(query)) return 3;
  if (`${displayName} ${firstName} ${lastName} ${email} ${phone}`.includes(query)) return 10;
  return 100;
}

function memberDisplayName(member) {
  return member.full_name || [member.first_name, member.last_name].filter(Boolean).join(" ") || "Member";
}

function memberLabel(member) {
  const name = memberDisplayName(member);
  return member.email ? `${name} (${member.email})` : name;
}

function groupIdsForPlayer(state, playerId) {
  return (state.playerGroupMembers || [])
    .filter((row) => String(row.player_id) === String(playerId))
    .map((row) => row.player_group_id);
}

function groupNamesForPlayer(state, playerId) {
  const groupIds = new Set(groupIdsForPlayer(state, playerId).map(String));
  return (state.playerGroups || [])
    .filter((group) => group.is_active !== false && groupIds.has(String(group.id)))
    .map((group) => group.name);
}

function playerCountForGroup(state, groupId) {
  return playersForGroup(state, groupId).length;
}

function playersForGroup(state, groupId) {
  const playerIds = new Set(
    (state.playerGroupMembers || [])
      .filter((row) => String(row.player_group_id) === String(groupId))
      .map((row) => String(row.player_id))
  );

  return activePlayers(state.players || [])
    .filter((player) => playerIds.has(String(player.id)))
    .sort((a, b) => String(a.display_name || "").localeCompare(String(b.display_name || "")));
}

function playerResultsForRange(state, playerId, range) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const rows = (state.allPlayerResults || [])
    .filter((row) => String(row.player_id || "") === String(playerId))
    .filter((row) => {
      if (range === "all") return true;
      if (range === "currentSession") return String(row.session_id || "") === String(state.activeSessionId || "");

      const date = row.session_date ? new Date(`${row.session_date}T12:00:00`) : null;
      if (!date || Number.isNaN(date.getTime())) return false;
      if (range === "currentMonth") return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
      if (range === "lastMonth") return date.getFullYear() === lastMonthDate.getFullYear() && date.getMonth() === lastMonthDate.getMonth();
      if (range === "currentYear") return date.getFullYear() === currentYear;
      return true;
    });

  return rows.sort((a, b) => String(b.session_date || "").localeCompare(String(a.session_date || "")));
}

function aggregatePlayerResultRows(rows = []) {
  const totals = rows.reduce((summary, row) => ({
    sessions: summary.sessions + 1,
    games: summary.games + Number(row.games || 0),
    wins: summary.wins + Number(row.wins || 0),
    losses: summary.losses + Number(row.losses || 0),
    pointsFor: summary.pointsFor + Number(row.points_for || 0),
    pointsAgainst: summary.pointsAgainst + Number(row.points_against || 0),
    pointDiff: summary.pointDiff + Number(row.point_diff || 0),
    byes: summary.byes + Number(row.byes || 0),
  }), {
    sessions: 0,
    games: 0,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDiff: 0,
    byes: 0,
  });

  return {
    ...totals,
    winPct: totals.games > 0 ? totals.wins / totals.games : 0,
  };
}

function noticeForAction(action, result) {
  if (action === "createSession") return `Generated ${result.session?.round_count || 0} rounds.`;
  if (action === "createPlannedSession") return result.sms?.skipped ? "Session opened. Invite texts were not sent." : `Session opened. Texts sent: ${result.sms?.sent || 0}.`;
  if (action === "updatePlannedSession") {
    if (result.sms?.skipped) return `Session saved. Added ${result.addedPlayers || 0} newly invited player${Number(result.addedPlayers || 0) === 1 ? "" : "s"}.`;
    return `Session saved. Update texts sent: ${result.sms?.sent || 0}.`;
  }
  if (action === "savePlayerGroup") return "Group saved.";
  if (action === "deletePlayerGroup") return "Group deleted.";
  if (action === "saveSmsSettings") return "SMS settings saved.";
  if (action === "updateSessionPlayerStatus") return "Player status updated.";
  if (action === "addSessionPlayer") return "Player added and joined.";
  if (action === "startSession") return "Session started.";
  if (action === "startSessionAndGenerateFirstGame") return `Session started. Game ${result.roundNumber || 1} generated.`;
  if (action === "deleteSession") return "Session deleted from active sessions.";
  if (action === "generateNextGame") return `Game ${result.roundNumber || ""} generated.`;
  if (action === "updateMatchScore") return "Score saved.";
  if (action === "updateMatchLineup") return "Lineup updated.";
  if (action === "completeSession") return result.sms?.skipped ? "Session completed. Result text was logged only." : `Session completed. Result texts sent: ${result.sms?.sent || 0}.`;
  if (action === "sendBroadcastText") {
    if (result.sms?.skipped) return `Test text logged for ${result.recipients || 0} recipient${Number(result.recipients || 0) === 1 ? "" : "s"}. SMS is off.`;
    return `Text sent to ${result.sms?.sent || 0} recipient${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`;
  }
  if (action === "sendSessionReminderText") {
    if (result.sms?.skipped) return `Pending reminder logged for ${result.recipients || 0} player${Number(result.recipients || 0) === 1 ? "" : "s"}. SMS is off.`;
    return `Pending reminder sent to ${result.sms?.sent || 0} player${Number(result.sms?.sent || 0) === 1 ? "" : "s"}.`;
  }
  if (action === "sendTestTemplateText") {
    if (result.sms?.skipped) return "Test template text logged. SMS is off.";
    return "Test template text sent.";
  }
  if (action === "savePlayer") return "Player saved.";
  if (action === "deletePlayer") return "Player deleted from Saved Players.";
  if (action === "saveCourts") return "Courts saved.";
  if (action === "saveSettings") return "Settings saved.";
  if (action === "masterResetRoundRobin") return `Master Reset complete. Deleted ${result.sessionsDeleted || 0} session${Number(result.sessionsDeleted || 0) === 1 ? "" : "s"} and all related play history.`;
  return "Saved.";
}

function formatDate(value) {
  if (!value) return "";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value) {
  const [hourText, minuteText] = String(value || "").split(":");
  const hour = Number(hourText || 0);
  const minute = Number(minuteText || 0);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatSignedNumber(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number}` : String(number);
}

function formatPercent(value) {
  const number = Number(value || 0);
  return `${Math.round(number * 100)}%`;
}

function formatPhoneInput(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function timeInputValue(value) {
  return String(value || "").slice(0, 5);
}
