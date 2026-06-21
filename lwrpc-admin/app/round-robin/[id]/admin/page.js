"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PbccPwaRegister from "../../../components/PbccPwaRegister";
import { DEFAULT_LADDER_RANKING_CRITERIA, LADDER_RANKING_CRITERIA_OPTIONS, compareLadderRowsByCriteria, ladderRankingCriteriaLabel, normalizeLadderRankingCriteria } from "../../../lib/roundRobinLadderRankings";
import { publicRoundRobinUrl as roundRobinPublicUrl, roundRobinPath } from "../../../lib/roundRobins";
import { roundRobinPlayerLabel } from "../../../lib/roundRobinSchedule";

const TABS = ["Matches", "Ladders", "Players", "Groups", "Courts", "Settings", "SMS", "Log"];
const SECONDARY_TABS = ["Ladders", "Players"];
const TAB_TONES = {
  Matches: {
    active: "border-teal-700 bg-teal-600 text-white ring-2 ring-teal-200",
    idle: "border-teal-200 bg-teal-50 text-teal-950 hover:border-teal-400 hover:bg-teal-100",
  },
  Players: {
    active: "border-blue-700 bg-blue-600 text-white ring-2 ring-blue-200",
    idle: "border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-400 hover:bg-blue-100",
  },
  Ladders: {
    active: "border-violet-700 bg-violet-600 text-white ring-2 ring-violet-200",
    idle: "border-violet-200 bg-violet-50 text-violet-950 hover:border-violet-400 hover:bg-violet-100",
  },
  Groups: {
    active: "border-emerald-700 bg-emerald-600 text-white ring-2 ring-emerald-200",
    idle: "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100",
  },
  Courts: {
    active: "border-cyan-700 bg-cyan-600 text-white ring-2 ring-cyan-200",
    idle: "border-cyan-200 bg-cyan-50 text-cyan-950 hover:border-cyan-400 hover:bg-cyan-100",
  },
  Settings: {
    active: "border-amber-600 bg-amber-400 text-slate-950 ring-2 ring-amber-200",
    idle: "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400 hover:bg-amber-100",
  },
  SMS: {
    active: "border-fuchsia-700 bg-fuchsia-600 text-white ring-2 ring-fuchsia-200",
    idle: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-950 hover:border-fuchsia-400 hover:bg-fuchsia-100",
  },
  Log: {
    active: "border-slate-700 bg-slate-700 text-white ring-2 ring-slate-200",
    idle: "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-400 hover:bg-slate-100",
  },
};
const DEFAULT_SMS_TEMPLATES = {
  newPlayer: "{{group_name}}: {{player_name}}, you have been added to PBCourtCommand. You may receive match invite/update texts at this number. Reply STOP to opt out. {{public_link}}",
  ladderAdded: "{{group_name}}: {{player_name}}, you have been added to {{ladder_name}}. Watch for ladder match invites and results texts. {{public_link}}",
  sessionInvite: "{{group_name}}: {{session_name}} match is open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Reply to the host or open {{public_link}} to join.",
  sessionReminder: "{{group_name}} reminder: {{session_name}} match is still open for {{date}} at {{time}}{{location_line}}. {{joined_count}} joined, {{available_spots}} spots open. Please reply if you can play or if you are out.",
  gameUpdate: "{{group_name}} game update: ",
  weatherUpdate: "{{group_name}} weather update: ",
  sessionResults: "{{group_name}} Results for {{date}}:\n{{result_rankings}}",
};
const SMS_TEMPLATE_OPTIONS = [
  { key: "newPlayer", label: "New Player" },
  { key: "ladderAdded", label: "Ladder Added" },
  { key: "sessionInvite", label: "New Match" },
  { key: "sessionReminder", label: "Pending Reminder" },
  { key: "gameUpdate", label: "Game Update" },
  { key: "weatherUpdate", label: "Weather Update" },
  { key: "sessionResults", label: "Match Results" },
];
const PLAYER_STATS_RANGES = [
  { id: "currentSession", label: "Current Match" },
  { id: "currentMonth", label: "Current Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "currentYear", label: "Current Year" },
  { id: "all", label: "All" },
];
const PLAYER_STATS_MATCH_TYPES = [
  { id: "regular", label: "Regular Matches" },
  { id: "ladder", label: "Ladder Matches" },
  { id: "all", label: "All" },
];
const PARTICIPATION_REQUIREMENT_HELP = "Percentage of games that must be played (after at least 4 dates scheduled) that a player will move down one ranking number per scheduled date.";
const LADDER_DAYS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
];
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
const MODAL_HEADER_CHROME = "border-b border-teal-200/60 bg-[linear-gradient(135deg,#0f766e,#2563eb)] text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.18)]";
const MODAL_EYEBROW_CHROME = "text-xs font-black uppercase tracking-wide text-cyan-100";
const MODAL_SUPPORTING_TEXT = "mt-1 text-sm font-semibold text-blue-50/90";
const DEFAULT_ROUND_ROBIN_SCORING = {
  pointsToWin: 21,
  winBy: 1,
  scoreType: "standard",
};
const ROUND_ROBIN_SCORE_TYPE_OPTIONS = [
  { value: "standard", label: "Standard" },
  { value: "rally", label: "Rally" },
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
  const [activeTab, setActiveTab] = useState("Matches");
  const [swapSelection, setSwapSelection] = useState([]);
  const [liveSessionId, setLiveSessionId] = useState("");
  const [hostUnlocking, setHostUnlocking] = useState(false);
  const [pendingScores, setPendingScores] = useState({});
  const [dirtyTabs, setDirtyTabs] = useState(() => new Set());

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
      setError("Open this match from your player screen so your phone can be verified.");
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

  useEffect(() => {
    if (dirtyTabs.size === 0) return undefined;
    const warnBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [dirtyTabs]);

  useEffect(() => {
    if (state?.accessMode === "secondary" && !SECONDARY_TABS.includes(activeTab)) {
      setActiveTab("Ladders");
    }
  }, [activeTab, state?.accessMode]);

  const setTabDirty = useCallback((tab, isDirty) => {
    setDirtyTabs((current) => {
      const next = new Set(current);
      if (isDirty) next.add(tab);
      else next.delete(tab);
      return next;
    });
  }, []);

  function canLeaveCurrentTab() {
    if (!dirtyTabs.has(activeTab)) return true;
    window.alert("Save or cancel your changes before moving to another screen.");
    return false;
  }

  function changeActiveTab(tab) {
    if (tab === activeTab) return;
    if (!canLeaveCurrentTab()) return;
    setActiveTab(tab);
  }

  function goToPlayerView() {
    if (!canLeaveCurrentTab()) return;
    router.push(roundRobinPath(groupKey, "player"));
  }

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
      setError(result.error || "Unable to unlock Admin Setup.");
      return;
    }

    window.sessionStorage.setItem(storageKey, cleanCode);
    setEventCode(cleanCode);
    if (result.accessMode === "secondary") setActiveTab("Ladders");
    setState(result);
  }

  async function unlockHost(nextPhone = hostPhone, nextSessionId = requestedHostSessionId || window.sessionStorage.getItem(hostSessionStorageKey) || "") {
    const cleanPhone = String(nextPhone || window.sessionStorage.getItem(hostPhoneStorageKey) || window.localStorage.getItem(playerPhoneStorageKey) || "").trim();
    const cleanSessionId = String(nextSessionId || "").trim();
    if (!cleanPhone || !cleanSessionId) {
      setError("Open this match from your player screen so your phone can be verified.");
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
    setActiveTab("Matches");
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
        publicUrl: playerRoundRobinUrl(state?.group),
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

  async function saveCurrentRoundScores(session = null, options = {}) {
    const requireComplete = options.requireComplete === true;
    const matches = state?.matches || [];
    if (matches.length === 0) return { success: true };

    const sessionMatches = matches.filter((match) => !session?.id || String(match.session_id || "") === String(session.id));
    const roundNumber = Math.max(0, ...sessionMatches.map((match) => Number(match.round_number || 0)));
    const matchesToCheck = roundNumber > 0 ? sessionMatches.filter((match) => Number(match.round_number || 0) === roundNumber) : sessionMatches;
    const scoring = normalizeRoundRobinScoring(session?.settings?.scoring);

    for (const match of matchesToCheck) {
      const pending = pendingScores[match.id] || {};
      const team1Score = pending.team1Score ?? match.team1_score ?? "";
      const team2Score = pending.team2Score ?? match.team2_score ?? "";
      const team1Blank = String(team1Score).trim() === "";
      const team2Blank = String(team2Score).trim() === "";
      const courtLabel = match.court_name || `Court ${match.court_number || ""}`.trim();
      if (team1Blank && team2Blank) {
        if (requireComplete) {
          return { success: false, error: `Round ${match.round_number || roundNumber} ${courtLabel}: enter scores before continuing.`, targetMatchId: match.id };
        }
        continue;
      }
      if (team1Blank || team2Blank) {
        return { success: false, error: `Round ${match.round_number || roundNumber} ${courtLabel}: enter both scores before continuing.`, targetMatchId: match.id };
      }
      const scoreError = validateRoundRobinMatchScore(team1Score, team2Score, scoring);
      if (scoreError) {
        return { success: false, error: `Round ${match.round_number || roundNumber} ${courtLabel}: ${scoreError}`, targetMatchId: match.id };
      }
    }

    const savedMatchIds = [];
    for (const match of matchesToCheck) {
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
      if (result?.success === false) return { success: false, error: result.error || "Unable to save scores.", targetMatchId: match.id };
      if (result?.success !== false) savedMatchIds.push(match.id);
    }

    if (savedMatchIds.length > 0) {
      setPendingScores((current) => {
        const next = { ...current };
        savedMatchIds.forEach((matchId) => delete next[matchId]);
        return next;
      });
    }

    return { success: true, savedMatchIds };
  }

  async function enterLiveSession(sessionId) {
    const nextSessionId = String(sessionId || "").trim();
    if (!nextSessionId) return;
    setActiveTab("Matches");
    setSwapSelection([]);
    const cleanCode = String(eventCode || window.sessionStorage.getItem(storageKey) || "").trim();
    if (cleanCode) await unlock(cleanCode, nextSessionId);
    setLiveSessionId(nextSessionId);
  }

  async function exitLiveSession() {
    setLiveSessionId("");
    setSwapSelection([]);
    const cleanHostPhone = String(hostPhone || window.sessionStorage.getItem(hostPhoneStorageKey) || "").trim();
    if (cleanHostPhone) window.localStorage.setItem(playerPhoneStorageKey, cleanHostPhone);
    router.push(roundRobinPath(state?.group || id, "player"));
  }

  function exitToDashboard() {
    if (!canLeaveCurrentTab()) return;
    if (!window.confirm("Exit to LMS? Your PBCC admin access will be closed.")) return;
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
    const cleanHostPhone = String(hostPhone || window.sessionStorage.getItem(hostPhoneStorageKey) || "").trim();
    if (cleanHostPhone) window.localStorage.setItem(playerPhoneStorageKey, cleanHostPhone);
    router.push(roundRobinPath(state?.group || id, "player"));
  }

  if (!state && requestedHostSessionId && !requestedManagerMode) {
    return (
      <main className="full-screen-main flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-4 text-slate-950">
        <PbccPwaRegister />
        <div className="w-full max-w-lg overflow-hidden rounded-lg border border-white/80 bg-white/95 text-center shadow-[0_24px_70px_-42px_rgba(15,23,42,0.75)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="p-6">
            <div className="text-xs font-black uppercase tracking-wide text-teal-700">Live Match</div>
            <h1 className="mt-1 text-2xl font-black text-slate-950">{hostUnlocking || loading ? "Opening match..." : "Live match access"}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {error || "Verifying your saved player phone and opening the assigned live match."}
            </p>
            {error && (
              <button type="button" onClick={() => router.push(roundRobinPath(id, "player"))} className="mt-4 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
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
        <PbccPwaRegister />
        <div className="w-full max-w-lg overflow-hidden rounded-lg border border-white/15 bg-slate-950 shadow-[0_34px_90px_-46px_rgba(0,0,0,0.95)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="border-b border-teal-300/20 bg-slate-900 px-6 py-5">
            <div className="text-xs font-black uppercase tracking-wide text-teal-200">PBCourtCommand</div>
            <h1 className="mt-1 text-3xl font-black">Admin Setup</h1>
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
              {loading ? "Unlocking..." : "Unlock Admin Setup"}
            </button>
            <Link className="mt-4 block text-center text-sm font-bold text-teal-200 hover:text-white" href={roundRobinPath(id, "player")}>
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
  const visibleTabs = state.accessMode === "host" ? ["Matches"] : state.accessMode === "secondary" ? SECONDARY_TABS : TABS;

  if (state.accessMode === "host") {
    return (
      <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-3 text-slate-950 sm:p-5">
        <PbccPwaRegister />
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
              <h1 className="text-2xl font-black text-slate-950">No active match found</h1>
              <button type="button" onClick={exitHostToPlayer} className="mt-4 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                Exit
              </button>
            </section>
          )}

          {rounds.map((round) => (
            <ManagerRound
              key={round.roundNumber}
              round={round}
              session={latestSession}
              runAction={runAction}
              actionLoading={actionLoading}
              swapSelection={swapSelection}
              setSwapSelection={setSwapSelection}
              isLadderMatch={isLadderSession(latestSession)}
              onPendingScoreChange={recordPendingScore}
            />
          ))}
        </div>
      </main>
    );
  }

  if (liveSessionId && activeTab === "Matches") {
    const selectedSession = liveSession || latestSession;
    return (
      <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-3 text-slate-950 sm:p-5">
        <PbccPwaRegister />
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
              <h1 className="text-2xl font-black text-slate-950">No active match found</h1>
              <button type="button" onClick={exitLiveSession} className="mt-4 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">
                Exit
              </button>
            </section>
          )}

          {rounds.map((round) => (
            <ManagerRound
              key={round.roundNumber}
              round={round}
              session={selectedSession}
              runAction={runAction}
              actionLoading={actionLoading}
              swapSelection={swapSelection}
              setSwapSelection={setSwapSelection}
              isLadderMatch={isLadderSession(selectedSession)}
              onPendingScoreChange={recordPendingScore}
            />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-2 text-slate-950 sm:p-5">
      <PbccPwaRegister />
      <div className="w-full">
        <header className="overflow-hidden rounded-lg border border-teal-900/10 bg-slate-950 text-white shadow-[0_26px_75px_-44px_rgba(15,23,42,0.95)]">
          <div className="h-1.5 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)] sm:h-2" />
          <div className="p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-wide text-teal-200">{state.accessMode === "host" ? "PBCourtCommand Host" : "Administration Setup"}</div>
              <h1 className="text-2xl font-black sm:text-4xl">PBCourtCommand</h1>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              <button type="button" onClick={goToPlayerView} className="rounded-lg border border-white/40 bg-white px-3 py-1.5 text-xs font-black text-slate-950 shadow-[0_10px_24px_-14px_rgba(255,255,255,0.9)] ring-1 ring-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-lg sm:px-4 sm:py-2 sm:text-sm">
                Player View
              </button>
              {state.accessMode !== "secondary" && (
                <button type="button" onClick={exitToDashboard} className="rounded-lg border border-teal-200/60 bg-teal-500 px-3 py-1.5 text-xs font-black text-white shadow-[0_10px_24px_-14px_rgba(20,184,166,0.9)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-lg sm:px-4 sm:py-2 sm:text-sm">
                  Exit to LMS
                </button>
              )}
            </div>
          </div>
          </div>
        </header>

        <div className="sticky top-0 z-20 mt-2 grid grid-cols-4 gap-1 rounded-lg border border-slate-300 bg-white/95 p-1 shadow-[0_18px_46px_-32px_rgba(15,23,42,0.9)] backdrop-blur sm:mt-4 sm:flex sm:flex-wrap sm:gap-2 sm:rounded-xl sm:p-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => changeActiveTab(tab)}
              className={`rounded-md border px-1.5 py-2 text-[11px] font-black leading-tight shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:rounded-lg sm:px-4 sm:py-3 sm:text-sm ${
                activeTab === tab ? tabTone(tab).active : tabTone(tab).idle
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

        {activeTab === "Matches" && (
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

        {activeTab === "Ladders" && <LaddersTab state={state} runAction={runAction} actionLoading={actionLoading} setTabDirty={setTabDirty} />}
        {activeTab === "Players" && <PlayersTab state={state} runAction={runAction} actionLoading={actionLoading} setTabDirty={setTabDirty} />}
        {activeTab === "Groups" && <GroupsTab state={state} runAction={runAction} actionLoading={actionLoading} />}
        {activeTab === "Courts" && <CourtsTab state={state} runAction={runAction} actionLoading={actionLoading} setTabDirty={setTabDirty} />}
        {activeTab === "Settings" && <SettingsTab state={state} runAction={runAction} actionLoading={actionLoading} setTabDirty={setTabDirty} />}
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
  } = props;
  const [form, setForm] = useState(() => newSessionForm(state));
  const [editingSessionId, setEditingSessionId] = useState("");
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [showPastSessions, setShowPastSessions] = useState(false);
  const [needDuprExportOnly, setNeedDuprExportOnly] = useState(false);
  const [sessionMatchType, setSessionMatchType] = useState("all");
  const [playersModalSession, setPlayersModalSession] = useState(null);
  const [playersModalStatus, setPlayersModalStatus] = useState("joined");
  const [resultsModalSession, setResultsModalSession] = useState(null);
  const isEditingSession = Boolean(editingSessionId);
  const showMatchTypeFilter = useMemo(() => hasRegularAndLadderSessions(state.sessions || []), [state.sessions]);
  const visibleSessionBase = useMemo(
    () => sessionsForMode(state.sessions || [], showPastSessions),
    [state.sessions, showPastSessions]
  );
  const visibleSessions = useMemo(
    () => showPastSessions && needDuprExportOnly
      ? visibleSessionBase.filter(needsDuprExport)
      : visibleSessionBase,
    [needDuprExportOnly, showPastSessions, visibleSessionBase]
  );
  const matchTypeFilteredSessions = useMemo(
    () => filterSessionsByMatchType(visibleSessions, showMatchTypeFilter ? sessionMatchType : "all"),
    [visibleSessions, showMatchTypeFilter, sessionMatchType]
  );
  const filteredSessions = useMemo(
    () => filterSessions(matchTypeFilteredSessions, sessionSearch, state),
    [state, matchTypeFilteredSessions, sessionSearch]
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
      mode: form.mode || "daily_round_robin",
      publicUrl: playerRoundRobinUrl(state.group),
    });
    if (saved) {
      setSessionModalOpen(false);
      setEditingSessionId("");
      setShowPastSessions(false);
      setNeedDuprExportOnly(false);
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

  async function deleteSession(session) {
    if (!window.confirm(`Delete ${session.session_name || "this match"}? It will be removed from active matches and kept as cancelled history.`)) return;
    await runAction("deleteSession", { sessionId: session.id });
  }

  function setPastView(nextValue) {
    setShowPastSessions(nextValue);
    if (!nextValue) setNeedDuprExportOnly(false);
  }

  async function exportSessionDupr(session) {
    const exported = exportSessionDuprCsv(state, session);
    if (!exported) return;
    await runAction("markSessionDuprExported", {
      sessionId: session.id,
      eventName: exported.eventName,
      rowCount: exported.rowCount,
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="space-y-4">
        <SessionsPanel
          state={state}
          sessions={filteredSessions}
          totalCount={matchTypeFilteredSessions.length}
          showPastSessions={showPastSessions}
          setShowPastSessions={setPastView}
          needDuprExportOnly={needDuprExportOnly}
          setNeedDuprExportOnly={setNeedDuprExportOnly}
          showMatchTypeFilter={showMatchTypeFilter}
          sessionMatchType={sessionMatchType}
          setSessionMatchType={setSessionMatchType}
          sessionSearch={sessionSearch}
          setSessionSearch={setSessionSearch}
          openAddSession={openAddSession}
          editingSessionId={editingSessionId}
          editSession={editSession}
          duplicateSession={duplicateSession}
          openPlayersModal={openPlayersModal}
          openSessionResults={setResultsModalSession}
          deleteSession={deleteSession}
          exportSessionDupr={exportSessionDupr}
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
        <div className={`flex flex-wrap items-start justify-between gap-3 p-4 ${MODAL_HEADER_CHROME}`}>
          <div>
            <div className={MODAL_EYEBROW_CHROME}>Match Setup</div>
            <h2 className="text-2xl font-black">{isEditingSession ? "Edit Match" : "Add Match"}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
            Cancel
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextInput label="Match name" value={form.sessionName} onChange={(value) => setForm((current) => ({ ...current, sessionName: value }))} />
            <TextInput label="Location" value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} />
            <TextInput label="Date" type="date" value={form.sessionDate} onChange={(value) => setForm((current) => ({ ...current, sessionDate: value }))} />
            <TextInput label="Start time" type="time" value={form.startsAt} onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} />
            <TextInput label="Max players" type="number" value={form.maxPlayers} onChange={(value) => setForm((current) => ({ ...current, maxPlayers: Number(value) }))} />
            <label className="block text-sm font-bold text-slate-600">
              Text reminder hours before match
              <input
                type="number"
                min="0"
                max="168"
                value={form.reminderHoursBefore}
                onChange={(event) => setForm((current) => ({ ...current, reminderHoursBefore: clampNumber(event.target.value, 0, 168, 0) }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
              />
              <span className="mt-1 block text-xs font-bold text-slate-500">Use 0 for no reminder.</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.repeatsWeekly} onChange={(event) => setForm((current) => ({ ...current, repeatsWeekly: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
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

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <h3 className="text-sm font-black text-blue-950">Match Scoring</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block text-sm font-bold text-slate-600">
                Game Points To
                <input
                  type="number"
                  min="1"
                  value={form.pointsToWin}
                  onChange={(event) => setForm((current) => ({ ...current, pointsToWin: clampNumber(event.target.value, 1, 99, DEFAULT_ROUND_ROBIN_SCORING.pointsToWin) }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
                />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Win By
                <input
                  type="number"
                  min="1"
                  value={form.winBy}
                  onChange={(event) => setForm((current) => ({ ...current, winBy: clampNumber(event.target.value, 1, 20, DEFAULT_ROUND_ROBIN_SCORING.winBy) }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
                />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Scoring Type
                <select
                  value={form.scoreType}
                  onChange={(event) => setForm((current) => ({ ...current, scoreType: normalizeRoundRobinScoreType(event.target.value) }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
                >
                  {ROUND_ROBIN_SCORE_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
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
            {saving ? "Saving..." : isEditingSession ? "Update Match" : "Create Match"}
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
    needDuprExportOnly,
    setNeedDuprExportOnly,
    showMatchTypeFilter,
    sessionMatchType,
    setSessionMatchType,
    sessionSearch,
    setSessionSearch,
    openAddSession,
    editingSessionId,
    editSession,
    duplicateSession,
    openPlayersModal,
    openSessionResults,
    deleteSession,
    exportSessionDupr,
    actionLoading,
  } = props;

  return (
    <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Matches</h2>
          <div className="mt-1 text-xs font-bold text-slate-500">
            Showing {sessions.length} of {totalCount} {showPastSessions ? "past" : "upcoming/current"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={openAddSession} className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-800">
            Add Match
          </button>
          {showPastSessions && (
            <button
              type="button"
              onClick={() => setNeedDuprExportOnly((current) => !current)}
              className={`rounded-lg border px-4 py-3 text-sm font-black shadow-sm ${
                needDuprExportOnly
                  ? "border-blue-700 bg-blue-700 text-white hover:bg-blue-800"
                  : "border-blue-300 bg-blue-50 text-blue-900 hover:border-blue-500 hover:bg-blue-100"
              }`}
            >
              Need DUPR Export
            </button>
          )}
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-300 bg-slate-100 p-1 text-xs font-black">
            <button type="button" onClick={() => setShowPastSessions(false)} className={`rounded-md px-3 py-2 ${showPastSessions ? "text-slate-600 hover:bg-white" : "bg-white text-slate-950 shadow-sm"}`}>
              Upcoming
            </button>
            <button type="button" onClick={() => setShowPastSessions(true)} className={`rounded-md px-3 py-2 ${showPastSessions ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white"}`}>
              Past
            </button>
          </div>
          {showMatchTypeFilter && (
            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-blue-100 bg-blue-50 p-1.5 text-xs font-black">
              {PLAYER_STATS_MATCH_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSessionMatchType(item.id)}
                  className={`rounded-md px-2 py-2 shadow-sm ${sessionMatchType === item.id ? "bg-blue-700 text-white" : "bg-white text-blue-900 hover:bg-blue-100"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-sm font-bold text-slate-600">
          Search matches
          <input
            type="search"
            value={sessionSearch}
            onChange={(event) => setSessionSearch(event.target.value)}
            placeholder="Name, location, date, status"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-950 shadow-inner outline-none ring-teal-400/30 focus:ring-4"
          />
        </label>
      </div>

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
            openSessionResults={openSessionResults}
            deleteSession={deleteSession}
            exportSessionDupr={exportSessionDupr}
            actionLoading={actionLoading}
          />
        ))}
        {sessions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-bold text-slate-500">
            No matches match this view.
          </div>
        )}
      </div>
    </section>
  );
}

function ActiveSessionControls({ session, state, runAction, saveCurrentRoundScores = null, actionLoading, onExit = null, showExit = false, hostMode = false }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [startModalMode, setStartModalMode] = useState("initial");
  const [startCourts, setStartCourts] = useState([]);
  const [startCheckedPlayerIds, setStartCheckedPlayerIds] = useState([]);
  const [pendingRoundScroll, setPendingRoundScroll] = useState(null);
  const [progressMessage, setProgressMessage] = useState("");
  const [scoreError, setScoreError] = useState("");
  const [scoreErrorMatchId, setScoreErrorMatchId] = useState("");
  const [sendResultsOnStatsOk, setSendResultsOnStatsOk] = useState(false);
  const isPlaying = session.status === "playing";
  const isClosed = ["done", "cancelled"].includes(session.status);
  const joinedPlayers = sessionPlayersForStatus(state, session.id, "joined");
  const joinedCount = joinedPlayers.length;
  const canStartSession = isPlaying || joinedCount >= 4;
  const verifyPlayersRoundNumber = startModalMode === "round"
    ? nextRoundNumberForSession(state, session.id)
    : 1;

  useEffect(() => {
    if (!pendingRoundScroll) return;
    if (!(state?.matches || []).some((match) => Number(match.round_number) === Number(pendingRoundScroll))) return;
    const timeout = window.setTimeout(() => {
      scrollToRoundHeader(pendingRoundScroll);
      setPendingRoundScroll(null);
    }, 75);
    return () => window.clearTimeout(timeout);
  }, [pendingRoundScroll, state?.matches]);

  async function primaryAction() {
    if (isPlaying) {
      setProgressMessage("Checking and saving current scores...");
      try {
        if (!(await saveScoresForTopAction())) return;
      } finally {
        setProgressMessage("");
      }
    }
    openStartModal(isPlaying ? "round" : "initial");
  }

  async function saveScoresForTopAction() {
    if (!saveCurrentRoundScores) return true;
    const saved = await saveCurrentRoundScores(session, { requireComplete: true });
    if (saved?.success === false) {
      setScoreError(saved.error || "Check the scores before continuing.");
      setScoreErrorMatchId(saved.targetMatchId || "");
      return false;
    }
    return true;
  }

  function openStartModal(mode = "initial") {
    const checkedIds = mode === "round"
      ? defaultRoundSessionPlayerIds(state, session.id, joinedPlayers)
      : joinedPlayers.map((player) => String(player.id));
    setStartModalMode(mode);
    setStartCheckedPlayerIds(checkedIds);
    setStartCourts(mode === "initial"
      ? sessionCourtRows(session, state.courts, suggestedCourtCountForPlayers(checkedIds.length))
      : []);
    setStartModalOpen(true);
  }

  function updateStartCourt(index, field, value) {
    setStartCourts((current) => current.map((court, courtIndex) => courtIndex === index ? { ...court, [field]: value } : court));
  }

  function toggleStartPlayer(playerId) {
    setStartCheckedPlayerIds((current) => {
      const cleanPlayerId = String(playerId || "");
      const next = current.includes(cleanPlayerId)
        ? current.filter((id) => id !== cleanPlayerId)
        : [...current, cleanPlayerId];
      if (startModalMode === "initial") {
        setStartCourts((currentCourts) => sessionCourtRows(session, state.courts, suggestedCourtCountForPlayers(next.length), currentCourts));
      }
      return next;
    });
  }

  async function confirmStartSession() {
    const isInitialStart = startModalMode === "initial";
    setProgressMessage(isInitialStart
      ? "Starting match, saving attendance, and generating the first round..."
      : "Saving current scores and generating the next round...");
    try {
      if (!isInitialStart && !(await saveScoresForTopAction())) return;
      const result = await runAction(
        isInitialStart ? "startSessionAndGenerateFirstGame" : "generateNextGame",
        {
          sessionId: session.id,
          ...(isInitialStart ? { courtCount: startCourts.length, sessionCourts: startCourts } : {}),
          selectedSessionPlayerIds: startCheckedPlayerIds,
        },
        { returnResult: true }
      );
      if (result?.success === false) {
        setScoreError(result.error || "Unable to continue.");
        setScoreErrorMatchId("");
        return;
      }
      if (result?.success !== false) {
        setStartModalOpen(false);
        setStartCheckedPlayerIds([]);
        if (result?.roundNumber) setPendingRoundScroll(result.roundNumber);
      }
    } finally {
      setProgressMessage("");
    }
  }

  async function finishSession() {
    if (!(await saveScoresForTopAction())) return;
    if (!window.confirm(`Finish ${session.session_name || "this match"}? This will close scoring and save final results.`)) return;
    setProgressMessage("Saving scores and preparing final stats...");
    try {
      const completed = await runAction("completeSession", { sessionId: session.id, smsEnabled: false }, { returnResult: true });
      if (completed?.success === false) {
        setScoreError(completed.error || "Unable to finish this match.");
        setScoreErrorMatchId("");
        return;
      }
      if (completed?.success !== false) {
        setSendResultsOnStatsOk(true);
        setStatsOpen(true);
      }
    } finally {
      setProgressMessage("");
    }
  }

  async function exitSession() {
    onExit?.();
  }

  async function openStats() {
    if (!(await saveScoresForTopAction())) return;
    setStatsOpen(true);
  }

  async function sendResultsAndCloseStats() {
    if (!sendResultsOnStatsOk) {
      setStatsOpen(false);
      return;
    }

    setProgressMessage("Sending result text to players...");
    try {
      const sent = await runAction("sendSessionResultsText", { sessionId: session.id, smsEnabled: true }, { returnResult: true });
      if (sent?.success !== false) {
        setSendResultsOnStatsOk(false);
        setStatsOpen(false);
        onExit?.();
      }
    } finally {
      setProgressMessage("");
    }
  }

  return (
    <section className="sticky top-0 z-30 rounded-lg border border-teal-200 bg-teal-50/95 p-2 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.35)] backdrop-blur sm:top-2 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className={`min-w-0 ${isPlaying ? "hidden sm:block" : ""}`}>
          <div className="text-xs font-black uppercase tracking-wide text-teal-700">Live Match</div>
          <h2 className="break-words text-lg font-black text-slate-950 sm:text-xl">{session.session_name || "Match"}</h2>
          <div className="mt-1 text-sm font-bold text-slate-600">
            {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap sm:justify-end sm:gap-2">
          <button
            type="button"
            onClick={primaryAction}
            disabled={isClosed || !canStartSession || ["generateNextGame", "startSessionAndGenerateFirstGame"].includes(actionLoading)}
            className="rounded-lg bg-blue-700 px-2 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300 sm:px-4 sm:py-3 sm:text-sm"
          >
            {["generateNextGame", "startSessionAndGenerateFirstGame"].includes(actionLoading)
              ? "Working..."
              : isPlaying ? "Next Round" : "Start Match"}
          </button>
          <button
            type="button"
            onClick={finishSession}
            disabled={isClosed || actionLoading === "completeSession"}
            className="rounded-lg bg-emerald-700 px-2 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-800 disabled:bg-slate-300 sm:px-4 sm:py-3 sm:text-sm"
          >
            {actionLoading === "completeSession" ? "Finishing..." : "Finish Match"}
          </button>
          <button
            type="button"
            onClick={openStats}
            className="rounded-lg border border-teal-300 bg-white px-2 py-2 text-xs font-black text-teal-900 shadow-sm hover:border-teal-500 hover:bg-white sm:px-4 sm:py-3 sm:text-sm"
          >
            Stats
          </button>
          {(showExit || hostMode) && onExit && (
            <button type="button" onClick={exitSession} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-black text-slate-800 shadow-sm hover:border-teal-500 hover:bg-teal-50 sm:px-4 sm:py-3 sm:text-sm">
              Exit
            </button>
          )}
        </div>
      </div>
      {!isPlaying && joinedCount < 4 && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
          At least 4 joined players are required before this match can start. Current joined players: {joinedCount}.
        </div>
      )}
      {statsOpen && (
        <SessionStatsModal
          session={session}
          state={state}
          onClose={() => {
            setStatsOpen(false);
            setSendResultsOnStatsOk(false);
          }}
          onConfirm={sendResultsOnStatsOk ? sendResultsAndCloseStats : null}
          confirmLabel={sendResultsOnStatsOk ? "OK - Send Results" : "Close"}
        />
      )}
      {startModalOpen && (
        <StartSessionModal
          session={session}
          courts={startCourts}
          updateCourt={updateStartCourt}
          joinedPlayers={joinedPlayers}
          checkedPlayerIds={startCheckedPlayerIds}
          togglePlayer={toggleStartPlayer}
          mode={startModalMode}
          roundNumber={verifyPlayersRoundNumber}
          actionLoading={actionLoading}
          onClose={() => { setStartModalOpen(false); setStartCheckedPlayerIds([]); }}
          onStart={confirmStartSession}
        />
      )}
      {progressMessage && <ActionProgressModal message={progressMessage} />}
      {scoreError && (
        <ScoreErrorModal
          message={scoreError}
          onClose={() => {
            const targetMatchId = scoreErrorMatchId;
            setScoreError("");
            setScoreErrorMatchId("");
            if (targetMatchId) window.setTimeout(() => scrollToMatchCard(targetMatchId), 50);
          }}
        />
      )}
    </section>
  );
}

function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function ActionProgressModal({ message }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/55 p-4">
        <div className="w-full max-w-xs rounded-lg border border-white/70 bg-white p-5 text-center shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
          <Image
            src="/favicon.ico"
            alt="Working"
            width={56}
            height={56}
            className="mx-auto h-14 w-14 animate-spin object-contain"
          />
          <div className="mt-4 text-base font-black text-slate-950">Working on it...</div>
          <p className="mt-2 text-sm font-semibold leading-5 text-slate-600">{message}</p>
        </div>
      </div>
    </ModalPortal>
  );
}

function ScoreErrorModal({ message, onClose }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/60 p-4">
        <div className="w-full max-w-sm rounded-lg border border-red-200 bg-white p-5 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
          <div className="text-sm font-black uppercase tracking-wide text-red-700">Score Check</div>
          <div className="mt-2 text-lg font-black text-slate-950">Check scores before continuing</div>
          <p className="mt-3 text-sm font-semibold leading-5 text-slate-700">{message}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-red-800"
          >
            OK
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

function SessionStatsModal({ session, state, onClose, onConfirm = null, confirmLabel = "Close" }) {
  const [showMobileStatsDetail, setShowMobileStatsDetail] = useState(false);
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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-0 sm:p-6">
      <div className="h-full max-h-screen w-full max-w-4xl overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:my-2 sm:h-auto sm:max-h-[calc(100vh-1rem)] sm:rounded-lg">
        <div className={`flex flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Current Game Stats</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">{session.session_name || "Match"}</h2>
          </div>
          <button type="button" onClick={onConfirm || onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            {confirmLabel}
          </button>
        </div>
        <div className="max-h-[calc(100vh-6.5rem)] overflow-y-auto p-3 sm:max-h-[70vh] sm:p-4">
          {rows.length > 0 ? (
            <>
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 md:hidden">
              <div className="text-sm font-black text-slate-700">Standings</div>
              <button
                type="button"
                onClick={() => setShowMobileStatsDetail((current) => !current)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-800 shadow-sm"
              >
                {showMobileStatsDetail ? "Summary" : "Detail"}
              </button>
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
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
            <div className="grid grid-cols-1 gap-2 md:hidden">
              {rows.map((row) => (
                showMobileStatsDetail ? (
                  <AdminStandingMobileCard key={row.player_id} row={row} rank={row.displayRank} />
                ) : (
                  <AdminStandingMobileSummaryRow key={row.player_id} row={row} rank={row.displayRank} />
                )
              ))}
            </div>
            </>
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

function tabTone(tab) {
  return TAB_TONES[tab] || TAB_TONES.Log;
}

function AdminStandingMobileSummaryRow({ row, rank }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700 shadow-sm">#{rank}</span>
        <span className="truncate text-sm font-black text-slate-950">{row.display_name || "Player"}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700 shadow-sm">{row.wins || 0}-{row.losses || 0}</span>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-amber-800 shadow-sm">Byes {row.byes || 0}</span>
      </div>
    </div>
  );
}

function AdminStandingMobileCard({ row, rank, isLadder = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Rank #{rank}</div>
          {isLadder && (
            <div className="mt-1 inline-flex rounded-md bg-blue-100 px-2 py-1 text-xs font-black text-blue-800">
              Before {formatLadderRank(row.ladderPreviousPosition, row.ladderPositionCount)}
            </div>
          )}
          <div className="mt-1 break-words text-base font-black text-slate-950">{row.display_name || "Player"}</div>
        </div>
        <div className="rounded-md bg-white px-2 py-1 text-sm font-black text-teal-800 shadow-sm">
          {formatPercent(winPctForStanding(row))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <MobileStatPill label="Record" value={`${row.wins || 0}-${row.losses || 0}`} />
        <MobileStatPill label="Games" value={row.games || 0} />
        <MobileStatPill label="Points" value={`${row.points_for || 0}-${row.points_against || 0}`} />
        <MobileStatPill label="Diff" value={formatSignedNumber(row.point_diff || 0)} />
        <MobileStatPill label="Byes" value={row.byes || 0} />
      </div>
    </div>
  );
}

function MobileStatPill({ label, value }) {
  return (
    <div className="rounded-md bg-white px-2 py-2 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 font-black text-slate-950">{value}</div>
    </div>
  );
}

function AdminGameResultCard({ match }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.95)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-black uppercase tracking-wide text-slate-500">
          {match.court_name || `Court ${match.court_number || "-"}`}
        </div>
        <div className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-wide text-slate-500">
          Final
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch">
        <AdminGameTeamPanel
          players={match.team1_players}
          score={match.team1_score}
          tone="teal"
          isWinner={isWinningScore(match.team1_score, match.team2_score)}
        />
        <div className="flex items-center justify-center text-xs font-black uppercase tracking-wide text-slate-400">vs</div>
        <AdminGameTeamPanel
          players={match.team2_players}
          score={match.team2_score}
          tone="blue"
          isWinner={isWinningScore(match.team2_score, match.team1_score)}
        />
      </div>
    </div>
  );
}

function AdminGameTeamPanel({ players, score, tone, isWinner }) {
  const toneClass = tone === "blue"
    ? "border-blue-200 bg-blue-50 text-blue-950"
    : "border-teal-200 bg-teal-50 text-teal-950";

  return (
    <div className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 font-bold shadow-sm ${toneClass}`}>
      <div className="min-w-0 break-words text-sm">{playerNames(players)}</div>
      <div className={`shrink-0 rounded-lg px-2.5 py-1.5 text-center shadow-[0_10px_18px_-14px_rgba(15,23,42,0.9)] ${
        isWinner ? "bg-teal-700 text-white" : "bg-slate-950 text-white"
      }`}>
        <div className="text-[10px] font-black uppercase tracking-wide opacity-80">Score</div>
        <div className="text-xl font-black leading-none">{formatGameScore(score)}</div>
      </div>
    </div>
  );
}

function SessionResultsModal({ state, session, onClose }) {
  const [showLadderHelp, setShowLadderHelp] = useState(false);
  const isLadder = isLadderSession(session);
  const ladder = sessionLadderForSession(state, session);
  const standings = sessionResultsForSession(state, session.id).map((row) => ({
    ...row,
    ladderPreviousPosition: ladderPreviousPositionForResult(state, session, row),
    ladderPositionCount: ladderPositionCountForResult(state, session, row),
  }));
  const matches = sessionMatchesForSession(state, session.id);
  const roundGroups = groupMatchesByRound(matches);
  const rankColSpan = isLadder ? 9 : 8;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-0 sm:p-6">
        <div className="h-full max-h-screen w-full max-w-5xl overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:my-2 sm:h-auto sm:max-h-[calc(100vh-1rem)] sm:rounded-lg">
          <div className={`flex flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
            <div className="min-w-0">
              <div className={MODAL_EYEBROW_CHROME}>Past Match Results</div>
              <h2 className="break-words text-xl font-black sm:text-2xl">{session.session_name || "Match"}</h2>
              <div className={MODAL_SUPPORTING_TEXT}>
                {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}{session.location ? ` - ${session.location}` : ""}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
              Close
            </button>
          </div>
          <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-3 sm:max-h-[76vh] sm:p-4">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-3 py-2">
                <div className="text-sm font-black text-slate-700">Match Standings</div>
                {isLadder && (
                  <button
                    type="button"
                    onClick={() => setShowLadderHelp((current) => !current)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
                    aria-label="Show ladder ranking rules"
                  >
                    ?
                  </button>
                )}
              </div>
              {isLadder && showLadderHelp && (
                <div className="border-t border-slate-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-950">
                  <div className="font-black">Ladder movement rules</div>
                  <div className="mt-1">
                    Selected movement: {ladderMovementLabel(ladder)}. {ladder?.movementMode === "top2" ? "Top 2 move up and bottom 2 move down" : "Top 1 moves up and bottom 1 moves down"} on each court after the match. Middle players stay on the same court.
                  </div>
                  <div className="mt-1">
                    Match-date ranking uses total points scored, then head-to-head if points are tied, then win percentage, average point differential, games played, and player name.
                  </div>
                  <div className="mt-1">
                    Starting with session 4, players below the {clampNumber(ladder?.participationRequirement, 10, 100, 50)}% participation requirement drop one court for the next ladder date.
                  </div>
                </div>
              )}
              <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] table-fixed text-xs sm:text-sm">
                <colgroup>
                  <col className="w-[8%]" />
                  {isLadder && <col className="w-[14%]" />}
                  <col className="w-[24%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Rank</th>
                    {isLadder && <th className="px-2 py-2 text-left">Rank Before</th>}
                    <th className="px-2 py-2 text-left">Player</th>
                    <th className="px-2 py-2 text-right">Record</th>
                    <th className="px-2 py-2 text-right">Win %</th>
                    <th className="px-2 py-2 text-right">Games</th>
                    <th className="px-2 py-2 text-right">Points</th>
                    <th className="px-2 py-2 text-right">Diff</th>
                    <th className="px-2 py-2 text-right">Byes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {standings.map((row, index) => (
                    <tr key={row.id || `${row.session_id}-${row.player_id}`}>
                      <td className="px-2 py-2 font-black text-slate-950">#{index + 1}</td>
                      {isLadder && (
                        <td className="px-2 py-2 font-black text-blue-800">{formatLadderRank(row.ladderPreviousPosition, row.ladderPositionCount)}</td>
                      )}
                      <td className="truncate px-2 py-2 font-black text-slate-950" title={row.display_name || "Player"}>{row.display_name || "Player"}</td>
                      <td className="px-2 py-2 text-right font-black text-slate-950">{row.wins || 0}-{row.losses || 0}</td>
                      <td className="px-2 py-2 text-right font-black text-teal-800">{formatPercent(winPctForStanding(row))}</td>
                      <td className="px-2 py-2 text-right font-bold text-slate-700">{row.games || 0}</td>
                      <td className="px-2 py-2 text-right font-bold text-slate-700">{row.points_for || 0}-{row.points_against || 0}</td>
                      <td className="px-2 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.point_diff || 0)}</td>
                      <td className="px-2 py-2 text-right font-bold text-slate-700">{row.byes || 0}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm font-bold text-slate-500" colSpan={rankColSpan}>No played-player stats are saved for this match yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
              <div className="grid grid-cols-1 gap-2 bg-white p-3 md:hidden">
                {standings.map((row, index) => (
                  <AdminStandingMobileCard key={row.id || `${row.session_id}-${row.player_id}`} row={row} rank={index + 1} isLadder={isLadder} />
                ))}
                {standings.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No played-player stats are saved for this match yet.</div>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-sm font-black text-slate-700">Rounds</div>
              <div className="mt-3 space-y-3">
                {roundGroups.map((round) => {
                  const byes = roundByePlayers(round);
                  return (
                    <section key={round.roundNumber} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_38px_-28px_rgba(15,23,42,0.85)]">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-[linear-gradient(90deg,#0f766e,#2563eb)] px-3 py-2 text-white">
                        <div className="text-base font-black">Round {round.roundNumber}</div>
                        <div className="rounded-md bg-white/15 px-2 py-1 text-xs font-black uppercase tracking-wide text-teal-50">
                          {round.matches.length} game{round.matches.length === 1 ? "" : "s"}
                        </div>
                      </div>
                      {byes.length > 0 && (
                        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
                          Bye: {playerNames(byes)}
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-3 p-3">
                        {round.matches.map((match) => (
                          <AdminGameResultCard key={match.id} match={match} />
                        ))}
                      </div>
                    </section>
                  );
                })}
                {matches.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No games were saved for this match.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function SessionListItem({ state, session, isEditing, editSession, duplicateSession, openPlayersModal, openSessionResults, deleteSession, exportSessionDupr, actionLoading }) {
  const joined = sessionPlayersForStatus(state, session.id, "joined").length;
  const waitlist = sessionPlayersForStatus(state, session.id, "waitlist").length;
  const isHostAccess = state.accessMode === "host";
  const isStarted = ["playing", "done", "cancelled"].includes(session.status);
  const canShowResults = isPastSession(session);
  const canDuplicate = !isHostAccess && session.status === "done";
  const isLadder = isLadderSession(session);
  const duprExported = sessionDuprExported(session);
  const spotsOpen = session.max_players ? Math.max(0, Number(session.max_players || 0) - joined) : null;
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
      className={`rounded-lg border p-3 ${canShowResults ? `cursor-pointer transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md ${isLadder ? "hover:border-violet-400" : "hover:border-teal-400"}` : ""} ${isEditing ? "border-teal-500 bg-teal-50" : isLadder ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-slate-50"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-black text-slate-950">{session.session_name || "Match"}</div>
            <span className={`rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wide ${sessionLifecycleClass(session.status)}`}>
              {sessionStatusLabel(session.status)}
            </span>
            {isLadder && (
              <span className="rounded-md bg-violet-700 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                Ladder
              </span>
            )}
            {canShowResults && session.status === "done" && (
              <span className={`rounded-md px-2 py-1 text-[11px] font-black uppercase tracking-wide ${
                duprExported ? "bg-blue-100 text-blue-900" : "bg-amber-100 text-amber-900"
              }`}>
                DUPR {duprExported ? "\u2713 Exported" : "Needs Export"}
              </span>
            )}
          </div>
          <div className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-xl">
            {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
          </div>
          {session.location && <div className="mt-1 text-xs font-bold text-slate-500">{session.location}</div>}
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
            <button
              type="button"
              onClick={(event) => { stopActionClick(event); openPlayersModal(session); }}
              className="rounded-md bg-teal-100 px-2 py-1 text-teal-900 shadow-sm hover:bg-teal-200"
            >
              {spotsOpen === null ? `${joined} Joined` : `${joined} Joined / ${spotsOpen} spots open`}
            </button>
            <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-900">{waitlist} Waitlist</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          {!isHostAccess && !isStarted && (
            <button type="button" onClick={(event) => { stopActionClick(event); editSession(session); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-800 shadow-sm hover:border-teal-500 hover:bg-teal-50">
              Edit
            </button>
          )}
          {!isHostAccess && !isStarted && (
            <button type="button" onClick={(event) => { stopActionClick(event); deleteSession(session); }} disabled={actionLoading === "deleteSession" || session.status === "cancelled"} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 shadow-sm hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400">
              Delete
            </button>
          )}
          {canShowResults && (
            <button type="button" onClick={(event) => { stopActionClick(event); openSessionResults(session); }} className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-black text-teal-900 shadow-sm hover:border-teal-500 hover:bg-teal-100">
              Results
            </button>
          )}
          {canShowResults && session.status === "done" && (
            <button type="button" onClick={(event) => { stopActionClick(event); exportSessionDupr(session); }} className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-black text-blue-900 shadow-sm hover:border-blue-500 hover:bg-blue-100">
              DUPR Export
            </button>
          )}
          {canDuplicate && (
            <button type="button" onClick={(event) => { stopActionClick(event); duplicateSession(session); }} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 shadow-sm hover:border-amber-500 hover:bg-amber-100">
              Duplicate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionPlayersModal({ state, session, status, setStatus, runAction, actionLoading, onClose }) {
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");
  const players = sessionPlayersForStatus(state, session.id, status);
  const statuses = ["joined", "declined", "waitlist", "invited"];
  const statusActionLoading = actionLoading === "updateSessionPlayerStatus";
  const addPlayerLoading = actionLoading === "addSessionNewPlayer";
  const canAddPlayer = !isLadderSession(session);

  function updatePlayerStatus(player, nextStatus) {
    runAction("updateSessionPlayerStatus", {
      sessionId: session.id,
      playerId: player.player_id,
      status: nextStatus,
    });
  }

  async function addNewPlayer() {
    if (!newPlayerName.trim() || normalizePhone(newPlayerPhone).length < 10) return;
    const result = await runAction("addSessionNewPlayer", {
      sessionId: session.id,
      player: {
        displayName: newPlayerName,
        phone: newPlayerPhone,
      },
    });
    if (result) {
      setNewPlayerName("");
      setNewPlayerPhone("");
      setShowAddPlayer(false);
      setStatus("joined");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <div className={`shrink-0 p-4 ${MODAL_HEADER_CHROME}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className={MODAL_EYEBROW_CHROME}>Match Players</div>
              <h2 className="text-2xl font-black">{session.session_name || "Match"}</h2>
              <div className={MODAL_SUPPORTING_TEXT}>
                {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {statuses.map((item) => (
              <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-lg border px-3 py-2 text-sm font-black capitalize shadow-sm ${
                status === item ? "border-white bg-white text-slate-950" : "border-white/35 bg-white/10 text-white hover:bg-white/20"
              }`}>
                {item} ({sessionPlayersForStatus(state, session.id, item).length})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {canAddPlayer && (
            <div className="mb-4">
              {!showAddPlayer ? (
                <button
                  type="button"
                  onClick={() => setShowAddPlayer(true)}
                  className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-800"
                >
                  Add Player
                </button>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TextInput
                      label="Player name"
                      value={newPlayerName}
                      onChange={setNewPlayerName}
                      required
                    />
                    <TextInput
                      label="Phone #"
                      type="tel"
                      value={newPlayerPhone}
                      onChange={(value) => setNewPlayerPhone(formatPhoneInput(value))}
                      placeholder="(941) 555-1212"
                      required
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddPlayer(false);
                        setNewPlayerName("");
                        setNewPlayerPhone("");
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addNewPlayer}
                      disabled={addPlayerLoading || !newPlayerName.trim() || normalizePhone(newPlayerPhone).length < 10}
                      className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300"
                    >
                      {addPlayerLoading ? "Adding..." : "Add Player"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="overflow-hidden rounded-lg border border-slate-200">
            {players.map((player) => (
              <div key={player.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="font-black text-slate-950">{player.display_name}</div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {[player.email, player.phone].filter(Boolean).join(" / ") || "No contact saved"}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
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
                      className="rounded-lg border border-red-800 bg-red-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-red-700 disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-400"
                    >
                      Decline
                    </button>
                  )}
                </div>
              </div>
            ))}
            {players.length === 0 && (
              <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">
                No {status} players for this match.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StartSessionModal({ session, courts, updateCourt, joinedPlayers, checkedPlayerIds, togglePlayer, mode = "initial", roundNumber = 1, actionLoading, onClose, onStart }) {
  const checkedSet = new Set((checkedPlayerIds || []).map(String));
  const checkedCount = checkedSet.size;
  const courtLabel = `${courts.length} court${courts.length === 1 ? "" : "s"}`;
  const initialMode = mode === "initial";
  const busy = ["startSessionAndGenerateFirstGame", "generateNextGame", "updateMatchScore"].includes(actionLoading);

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/70 p-0 sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:my-4 sm:h-auto sm:max-h-[92vh] sm:rounded-lg">
        <div className={`shrink-0 p-3 sm:p-4 ${MODAL_HEADER_CHROME}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Start Match</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">{session.session_name || "Match"}</h2>
            <div className={MODAL_SUPPORTING_TEXT}>
              {checkedCount} checked players{initialMode ? ` - ${courtLabel}` : ""} - {formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            Cancel
          </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className={`grid grid-cols-1 gap-4 ${initialMode ? "lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : ""}`}>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-black text-blue-950">Verify Players - Round {roundNumber}</div>
                  <div className="mt-1 text-xs font-bold text-blue-800">
                    {initialMode ? "Uncheck anyone who did not show up." : "Uncheck anyone not playing this round."}
                  </div>
                </div>
                <div className="rounded-md bg-white px-2 py-1 text-xs font-black text-blue-900 shadow-sm">
                  {checkedCount} of {joinedPlayers.length}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {joinedPlayers.map((player) => {
                  const playerId = String(player.id);
                  const checked = checkedSet.has(playerId);
                  return (
                    <label key={player.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-black shadow-sm ${
                      checked ? "border-teal-300 bg-white text-slate-950" : "border-slate-200 bg-slate-100 text-slate-500"
                    }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePlayer(playerId)}
                        className="h-5 w-5 rounded border-slate-300 text-teal-700"
                      />
                      <span className="min-w-0 break-words">{player.display_name || "Player"}</span>
                    </label>
                  );
                })}
                {joinedPlayers.length === 0 && (
                  <div className="rounded-lg border border-dashed border-blue-200 bg-white px-3 py-6 text-center text-sm font-bold text-blue-900">
                    No joined players are listed for this match.
                  </div>
                )}
              </div>
            </div>

            {initialMode && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-slate-700">Confirm Courts</div>
                  </div>
                  <div className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700 shadow-sm">{courtLabel}</div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3">
                  {courts.map((court, index) => (
                    <div key={`start-court-${index}`}>
                      <TextInput label={`Court ${index + 1}`} value={court.name} onChange={(value) => updateCourt(index, "name", value)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {checkedCount < 4 && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-black text-amber-900">
              At least 4 checked players are required to generate games.
            </div>
          )}
        </div>
        <div className="sticky bottom-0 z-10 mt-auto shrink-0 border-t border-slate-200 bg-white p-3 shadow-[0_-16px_36px_-28px_rgba(15,23,42,0.9)] sm:p-4">
          <button type="button" onClick={onStart} disabled={busy || checkedCount < 4} className="w-full rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
            {busy ? "Starting..." : initialMode ? "Start and Generate First Game" : "Start Match"}
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

function ManagerRound({ round, session = null, runAction, actionLoading, swapSelection, setSwapSelection, isLadderMatch = false, onPendingScoreChange }) {
  const scoring = normalizeRoundRobinScoring(session?.settings?.scoring);
  const roundScored = round.matches.length > 0 && round.matches.every(matchHasSavedScore);
  const byeSlots = round.matches.flatMap((match) => slotPlayers(match, "bye"));
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

  function pickRoundSlot(slot) {
    if (roundScored) return;
    const next = [...swapSelection, slot].slice(-2);
    setSwapSelection(next);
    if (next.length === 2) {
      performSwap(next[0], next[1], runAction).then(() => setSwapSelection([]));
    }
  }

  return (
    <section id={roundElementId(round.roundNumber)} className={`scroll-mt-28 rounded-lg border p-4 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.75)] ${
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
          {byeSlots.length > 0 && (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
              <span className="mr-2 font-black">Bye:</span>
              <span className="inline-flex flex-wrap gap-2 align-middle">
                {byeSlots.map((slot, index) => (
                  <PlayerChip key={`${slot.id || "bye"}-${index}`} player={slot} slot={slot} pickSlot={pickRoundSlot} selected={swapSelection} locked={roundScored} />
                ))}
              </span>
            </div>
          )}
        </div>
        {!roundScored && !isLadderMatch && (
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
            scoring={scoring}
            lineupLocked={roundScored}
            runAction={runAction}
            swapSelection={swapSelection}
            setSwapSelection={setSwapSelection}
            onPendingScoreChange={onPendingScoreChange}
          />
        ))}
      </div>
    </section>
  );
}

function ScoreCourt({ match, scoring = DEFAULT_ROUND_ROBIN_SCORING, lineupLocked = false, runAction, swapSelection, setSwapSelection, onPendingScoreChange }) {
  const [team1Score, setTeam1Score] = useState(match.team1_score ?? "");
  const [team2Score, setTeam2Score] = useState(match.team2_score ?? "");
  const team2ScoreRef = useRef(null);
  const scoreRules = normalizeRoundRobinScoring(scoring);

  useEffect(() => {
    setTeam1Score(match.team1_score ?? "");
    setTeam2Score(match.team2_score ?? "");
  }, [match.team1_score, match.team2_score]);

  async function saveScore() {
    const scoreError = validateRoundRobinMatchScore(team1Score, team2Score, scoreRules);
    if (scoreError) {
      window.alert(scoreError);
      return;
    }
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
    <div id={matchElementId(match.id)} className="scroll-mt-32 overflow-hidden rounded-lg border border-slate-900/10 bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.9)]">
      <div className="flex flex-col gap-2 bg-[linear-gradient(90deg,#0f3b36,#166b61)] px-3 py-2 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="font-black">{match.court_name || `Court ${match.court_number}`}</div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          {matchHasSavedScore(match) && <div className="rounded-md bg-emerald-300 px-2 py-1 text-xs font-black text-emerald-950">Score Saved</div>}
        </div>
      </div>
      <div className="relative min-h-48 overflow-hidden bg-[#163f38] p-2 sm:p-3" style={{ perspective: "900px" }}>
        <div className="absolute inset-4 rounded-lg border border-white/35 bg-[linear-gradient(145deg,#9fe7c5_0%,#54c49a_48%,#20856f_100%)] shadow-[0_24px_42px_-24px_rgba(0,0,0,0.65)]" style={{ transform: "rotateX(8deg)", transformOrigin: "center bottom" }}>
          <div className="absolute inset-3 rounded-md border border-white/60" />
          <div className="absolute bottom-3 top-3 left-1/2 w-1 -translate-x-1/2 rounded-full bg-white/85 shadow-[0_0_14px_rgba(255,255,255,0.85)]" />
          <div className="absolute left-3 right-3 top-1/2 h-px bg-white/50" />
          <div className="absolute bottom-3 top-3 left-[25%] w-px bg-white/35" />
          <div className="absolute bottom-3 top-3 right-[25%] w-px bg-white/35" />
        </div>
        <div className="relative z-10 grid min-h-44 grid-cols-[minmax(0,1fr)_0.75rem_minmax(0,1fr)] items-stretch gap-2 p-2 sm:gap-3 sm:p-3">
          <div className="flex min-w-0 flex-col items-center justify-start gap-3 pt-2">
            <input value={team1Score} onChange={(event) => { setTeam1Score(event.target.value); onPendingScoreChange?.(match.id, "team1Score", event.target.value); }} onKeyDown={moveToSecondScore} inputMode="numeric" className="w-20 rounded-md border border-amber-200 bg-white px-2 py-2 text-center text-lg font-black text-slate-950 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.9)] outline-none ring-amber-300/30 focus:ring-4" />
            <SlotSide match={match} side="team1" align="center" pickSlot={pickSlot} selected={swapSelection} tone="teal" locked={lineupLocked} />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-full w-1.5 rounded-full bg-white/90 shadow-[0_0_18px_rgba(255,255,255,0.8)]" />
          </div>
          <div className="flex min-w-0 flex-col items-center justify-start gap-3 pt-2">
            <input ref={team2ScoreRef} value={team2Score} onChange={(event) => { setTeam2Score(event.target.value); onPendingScoreChange?.(match.id, "team2Score", event.target.value); }} onKeyDown={submitScoreFromKeyboard} inputMode="numeric" className="w-20 rounded-md border border-amber-200 bg-white px-2 py-2 text-center text-lg font-black text-slate-950 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.9)] outline-none ring-amber-300/30 focus:ring-4" />
            <SlotSide match={match} side="team2" align="center" pickSlot={pickSlot} selected={swapSelection} tone="blue" locked={lineupLocked} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SlotSide({ match, side, align = "left", pickSlot, selected, tone = "teal", locked = false }) {
  const players = side === "team1" ? match.team1_players || [] : match.team2_players || [];
  const alignClass = align === "center"
    ? "items-stretch text-center"
    : align === "right"
      ? "items-start text-left sm:items-end sm:text-right"
      : "items-start text-left";

  return (
    <div className={`flex w-full min-w-0 flex-col justify-center gap-2 ${alignClass}`}>
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
      className={`w-full max-w-full rounded-full border px-2.5 py-2 text-center text-sm font-black shadow-[0_14px_28px_-18px_rgba(15,23,42,0.95)] ring-1 ring-white/25 transition sm:w-fit sm:px-4 sm:text-base ${
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

function PlayersTab({ state, runAction, actionLoading, setTabDirty }) {
  const [form, setForm] = useState(emptyPlayerForm());
  const [formBaseline, setFormBaseline] = useState(() => emptyPlayerForm());
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");
  const [statsPlayer, setStatsPlayer] = useState(null);
  const savedPlayers = useMemo(
    () => state.players || [],
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
  const formDirty = JSON.stringify(form) !== JSON.stringify(formBaseline);

  useEffect(() => {
    setTabDirty?.("Players", playerModalOpen && JSON.stringify(form) !== JSON.stringify(formBaseline));
    return () => setTabDirty?.("Players", false);
  }, [form, formBaseline, playerModalOpen, setTabDirty]);

  function resetPlayerForm() {
    const emptyForm = emptyPlayerForm();
    setForm(emptyForm);
    setFormBaseline(emptyForm);
    setMemberSearch("");
    setMemberPickerOpen(false);
  }

  function openAddPlayer() {
    resetPlayerForm();
    setPlayerModalOpen(true);
  }

  function closePlayerModal() {
    resetPlayerForm();
    setPlayerModalOpen(false);
  }

  function editPlayer(player) {
    const linkedMember = (state.members || []).find((member) => String(member.id) === String(player.member_id || ""));
    const nextForm = {
      id: player.id,
      memberId: player.member_id || "",
      displayName: player.display_name || "",
      duprId: normalizeDuprId(player.dupr_id),
      email: player.email || "",
      phone: formatPhoneInput(player.phone || ""),
      notes: player.notes || "",
      isActive: player.is_active !== false,
      groupIds: groupIdsForPlayer(state, player.id),
    };
    setForm(nextForm);
    setFormBaseline(nextForm);
    setMemberSearch(linkedMember ? memberLabel(linkedMember) : "");
    setMemberPickerOpen(false);
    setPlayerModalOpen(true);
  }

  function chooseMember(memberId) {
    const member = (state.members || []).find((row) => String(row.id) === String(memberId));
    if (!member) return;
    setForm((current) => ({
      ...current,
      memberId: member.id,
      displayName: member.full_name || [member.first_name, member.last_name].filter(Boolean).join(" "),
      duprId: normalizeDuprId(member.dupr_id),
      email: member.email || "",
      phone: formatPhoneInput(member.phone || ""),
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
        duprId: normalizeDuprId(form.duprId),
        email: form.email,
        phone: formatPhoneInput(form.phone),
        notes: form.notes,
        is_active: form.isActive,
        groupIds: form.groupIds,
        publicUrl: playerRoundRobinUrl(state.group),
      },
    });
    if (saved) {
      closePlayerModal();
    }
  }

  async function deleteSavedPlayer(player) {
    const playerName = player.display_name || "this player";
    if (!window.confirm(`Delete ${playerName} from saved PBCC players? Upcoming match roster entries will be removed. Completed match history will keep the saved display name.`)) return;

    const deleted = await runAction("deletePlayer", { playerId: player.id });
    if (deleted && String(form.id) === String(player.id)) {
      closePlayerModal();
    }
  }

  async function toggleSavedPlayerActive(player, isActive) {
    await runAction("savePlayer", {
      player: {
        id: player.id,
        memberId: player.member_id || "",
        displayName: player.display_name || "",
        duprId: normalizeDuprId(player.dupr_id),
        email: player.email || "",
        phone: formatPhoneInput(player.phone || ""),
        notes: player.notes || "",
        is_active: isActive,
        groupIds: groupIdsForPlayer(state, player.id),
        publicUrl: playerRoundRobinUrl(state.group),
      },
    });
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Saved Players</h2>
            <div className="mt-1 text-xs font-bold text-slate-500">
              Showing {filteredSavedPlayers.length} of {savedPlayers.length}
            </div>
          </div>
          <button type="button" onClick={openAddPlayer} className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-800">
            Add Player
          </button>
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
                <th className="px-3 py-2 text-center">Active</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSavedPlayers.map((player) => (
                <tr key={player.id} className={player.is_active === false ? "bg-slate-50 text-slate-500" : ""}>
                  <td className="px-3 py-2 font-black">
                    <div>{player.display_name}</div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={player.is_active !== false}
                      onChange={(event) => toggleSavedPlayerActive(player, event.target.checked)}
                      disabled={actionLoading === "savePlayer"}
                      className="h-5 w-5 rounded border-slate-300 text-teal-700"
                      aria-label={`Set ${player.display_name || "player"} active`}
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-600">
                    <div>{[player.email, player.phone].filter(Boolean).join(" / ") || "No contact"}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">DUPR ID: {normalizeDuprId(player.dupr_id) || "-"}</div>
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
                  <td colSpan={4} className="px-3 py-8 text-center font-semibold text-slate-500">No saved players yet.</td>
                </tr>
              )}
              {savedPlayers.length > 0 && filteredSavedPlayers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center font-semibold text-slate-500">No players match that search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {playerModalOpen && (
        <PlayerFormModal
          state={state}
          form={form}
          setForm={setForm}
          formDirty={formDirty}
          memberSearch={memberSearch}
          memberPickerOpen={memberPickerOpen}
          memberOptions={memberOptions}
          actionLoading={actionLoading}
          chooseMember={chooseMember}
          updateMemberSearch={updateMemberSearch}
          clearMemberLink={clearMemberLink}
          setMemberPickerOpen={setMemberPickerOpen}
          togglePlayerGroup={togglePlayerGroup}
          save={save}
          onClose={closePlayerModal}
        />
      )}
      {statsPlayer && <PlayerStatsModal state={state} player={statsPlayer} onClose={() => setStatsPlayer(null)} />}
    </div>
  );
}

function PlayerFormModal({ state, form, setForm, formDirty, memberSearch, memberPickerOpen, memberOptions, actionLoading, chooseMember, updateMemberSearch, clearMemberLink, setMemberPickerOpen, togglePlayerGroup, save, onClose }) {
  const saving = actionLoading === "savePlayer";
  const canSave = !saving && form.displayName.trim() && normalizePhone(form.phone).length >= 10;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 sm:items-center sm:p-4">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
          <div className={MODAL_HEADER_CHROME}>
            <div className="flex items-start justify-between gap-3 p-4">
              <div>
                <div className={MODAL_EYEBROW_CHROME}>Saved Player</div>
                <h2 className="text-2xl font-black">{form.id ? "Edit Player" : "Add Player"}</h2>
                <p className={MODAL_SUPPORTING_TEXT}>Player detail entry for PBCourtCommand.</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-sm font-black text-white hover:bg-white/25">
                Close
              </button>
            </div>
          </div>

          <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-4">
            <div className="space-y-3">
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

              <TextInput label="Name" value={form.displayName} onChange={(value) => setForm((current) => ({ ...current, displayName: value }))} required />
              <TextInput label="DUPR ID" value={form.duprId} onChange={(value) => setForm((current) => ({ ...current, duprId: normalizeDuprId(value) }))} />
              <TextInput label="Email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              <TextInput label="Phone" type="tel" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: formatPhoneInput(value) }))} required />
              <TextInput label="Notes" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />

              <div>
                <div className="text-sm font-bold text-slate-600">Player groups</div>
                <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
                <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200">
                  {formDirty ? "Cancel" : "Close"}
                </button>
                <button type="button" onClick={save} disabled={!canSave} className="rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
                  {saving ? "Saving..." : "Save Player"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function PlayerStatsModal({ state, player, onClose }) {
  const [range, setRange] = useState("currentMonth");
  const [matchType, setMatchType] = useState("all");
  const matchTypeAvailability = useMemo(() => playerStatsMatchTypeAvailability(state, player.id), [state, player.id]);
  const showMatchTypeFilter = matchTypeAvailability.regular && matchTypeAvailability.ladder;
  const effectiveMatchType = showMatchTypeFilter ? matchType : matchTypeAvailability.ladder && !matchTypeAvailability.regular ? "ladder" : matchTypeAvailability.regular && !matchTypeAvailability.ladder ? "regular" : "all";
  const rows = playerResultsForRange(state, player.id, range, effectiveMatchType);
  const totals = aggregatePlayerResultRows(rows);
  const lastDatePlayed = lastPlayedDate(rows);
  const matchTypeLabel = PLAYER_STATS_MATCH_TYPES.find((item) => item.id === effectiveMatchType)?.label || "All";
  const rangeLabel = PLAYER_STATS_RANGES.find((item) => item.id === range)?.label || "Current Month";
  const ladderRankLabels = useMemo(() => playerLadderRankLabels(state, player.id), [state, player.id]);
  const showingOnlyLadderMatches = effectiveMatchType === "ladder";

  useEffect(() => {
    if (!showMatchTypeFilter && matchType !== "all") setMatchType("all");
  }, [matchType, showMatchTypeFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .player-stats-print-area,
          .player-stats-print-area * {
            visibility: visible !important;
          }
          .player-stats-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .player-stats-print-scroll {
            max-height: none !important;
            overflow: visible !important;
          }
          .player-stats-print-hide {
            display: none !important;
          }
        }
      `}</style>
      <div className="player-stats-print-area my-2 max-h-[calc(100vh-1rem)] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
        <div className={`flex flex-wrap items-start justify-between gap-3 p-4 ${MODAL_HEADER_CHROME}`}>
          <div>
            <div className={MODAL_EYEBROW_CHROME}>Saved Player Stats</div>
            <h2 className="text-2xl font-black">{player.display_name || "Player"}</h2>
            {ladderRankLabels.length > 0 && (
              <div className="mt-1 text-sm font-black text-white">{ladderRankLabels.join(" | ")}</div>
            )}
            <div className="mt-1 text-sm font-bold text-cyan-50">{matchTypeLabel} | {rangeLabel}</div>
          </div>
          <div className="player-stats-print-hide flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
              Print
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
              Close
            </button>
          </div>
        </div>
        <div className="player-stats-print-scroll max-h-[calc(100vh-8rem)] overflow-y-auto p-4">
          {showMatchTypeFilter && (
            <div className="player-stats-print-hide rounded-lg border border-blue-100 bg-blue-50 p-2">
              <div className="flex flex-wrap gap-2">
                {PLAYER_STATS_MATCH_TYPES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMatchType(item.id)}
                    className={`rounded-lg px-3 py-2 text-xs font-black shadow-sm ${matchType === item.id ? "bg-blue-700 text-white" : "bg-white text-blue-900 hover:bg-blue-100"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="player-stats-print-hide mt-3 flex flex-wrap gap-2">
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

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatBox compact label="Dates Played" value={totals.sessions} />
            <StatBox compact label="Last Date Played" value={lastDatePlayed ? formatDate(lastDatePlayed) : "-"} />
            <StatBox compact label="Record" value={`${totals.wins}-${totals.losses}`} />
            <StatBox compact label="Games" value={totals.games} />
            <StatBox compact label="Win %" value={formatPercent(totals.winPct)} />
            <StatBox compact label="Points" value={`${totals.pointsFor}-${totals.pointsAgainst}`} />
            <StatBox compact label="Diff" value={formatSignedNumber(totals.pointDiff)} />
            <StatBox compact label="Byes" value={totals.byes} />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className={`w-full text-sm ${showingOnlyLadderMatches ? "min-w-[820px]" : "min-w-[720px]"}`}>
              <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Match</th>
                  <th className="px-3 py-2 text-right">{showingOnlyLadderMatches ? "Rank" : "Match Rank"}</th>
                  {showingOnlyLadderMatches && <th className="px-3 py-2 text-right">Prior Rank</th>}
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
                    <td className="px-3 py-2 font-black text-slate-950">{row.session_name || "Match"}</td>
                    <td className="px-3 py-2 text-right font-black text-slate-950">#{row.rank || "-"}</td>
                    {showingOnlyLadderMatches && (
                      <td className="px-3 py-2 text-right font-black text-blue-800">{previousLadderRankForResult(state, row)}</td>
                    )}
                    <td className="px-3 py-2 text-right font-black text-slate-950">{row.wins || 0}-{row.losses || 0}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{row.points_for || 0}-{row.points_against || 0}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.point_diff || 0)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-700">{row.byes || 0}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={showingOnlyLadderMatches ? 8 : 7} className="px-3 py-8 text-center text-sm font-bold text-slate-500">No saved stats for this range.</td>
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

function LaddersTab({ state, runAction, actionLoading, setTabDirty }) {
  const ladders = normalizeLadderList(state.group.settings?.ladders);
  const [form, setForm] = useState(() => emptyLadderForm(state));
  const [formBaseline, setFormBaseline] = useState(() => emptyLadderForm(state));
  const [ladderModalOpen, setLadderModalOpen] = useState(false);
  const [ladderMatchModal, setLadderMatchModal] = useState(null);
  const [expandedLadderIds, setExpandedLadderIds] = useState(() => new Set());
  const [positionDrafts, setPositionDrafts] = useState({});
  const [draggedLadderPlayer, setDraggedLadderPlayer] = useState(null);
  const [resultsSession, setResultsSession] = useState(null);
  const [ladderHistoryPlayerFilters, setLadderHistoryPlayerFilters] = useState({});
  const activeGroups = (state.playerGroups || []).filter((group) => group.is_active !== false);

  useEffect(() => {
    const formDirty = ladderModalOpen && JSON.stringify(form) !== JSON.stringify(formBaseline);
    const positionsDirty = Object.keys(positionDrafts).length > 0;
    setTabDirty?.("Ladders", formDirty || positionsDirty);
    return () => setTabDirty?.("Ladders", false);
  }, [form, formBaseline, ladderModalOpen, positionDrafts, setTabDirty]);

  function closeLadderModal() {
    const emptyForm = emptyLadderForm(state);
    setForm(emptyForm);
    setFormBaseline(emptyForm);
    setLadderModalOpen(false);
  }

  function openAddLadder() {
    const emptyForm = emptyLadderForm(state);
    setForm(emptyForm);
    setFormBaseline(emptyForm);
    setLadderModalOpen(true);
  }

  function editLadder(ladder) {
    const nextForm = ladderFormFromLadder(ladder);
    setForm(nextForm);
    setFormBaseline(nextForm);
    setLadderModalOpen(true);
  }

  async function saveLadder() {
    const saved = await runAction("saveLadder", { ladder: { ...form, format: "ladder", publicUrl: playerRoundRobinUrl(state.group) } });
    if (saved) closeLadderModal();
  }

  async function recalculateLadderRankings(ladderForm = form) {
    if (!ladderForm.id) return;
    const label = ladderForm.name || "this ladder";
    if (!window.confirm(`Recalculate all completed match rankings for ${label}?`)) return;
    await runAction("recalculateLadderRankings", { ladderId: ladderForm.id, ladder: { ...ladderForm, format: "ladder" } });
  }

  async function deleteLadder(ladder) {
    if (!window.confirm(`Delete ${ladder.name || "this ladder"}? If no games have been played, all match dates for this ladder will also be deleted.`)) return;
    await runAction("deleteLadder", { ladderId: ladder.id });
    if (form.id === ladder.id) closeLadderModal();
  }

  function openCreateNextMatch(ladder) {
    const summary = ladderSummary(state, ladder);
    setLadderMatchModal({
      ladder,
      sessionDate: summary.nextDate || ladder.startDate || new Date().toISOString().slice(0, 10),
      startsAt: ladder.startTime || state.group?.schedule_time || "",
      hostPlayerId: ladder.hostPlayerId || defaultHostPlayerId(state) || activePlayers(state.players)[0]?.id || "",
      cohostPlayerId: ladder.cohostPlayerId || "",
      reminderHoursBefore: clampNumber(ladder.reminderHoursBefore, 0, 168, 0),
    });
  }

  function closeCreateNextMatch() {
    setLadderMatchModal(null);
  }

  async function createNextMatch() {
    if (!ladderMatchModal?.ladder) return;
    const ladder = ladderMatchModal.ladder;
    const created = await runAction("createLadderMatch", {
      ladderId: ladder.id,
      sessionDate: ladderMatchModal.sessionDate,
      startsAt: ladderMatchModal.startsAt,
      hostPlayerId: ladderMatchModal.hostPlayerId,
      cohostPlayerId: ladderMatchModal.cohostPlayerId,
      reminderHoursBefore: ladderMatchModal.reminderHoursBefore,
      publicUrl: playerRoundRobinUrl(state.group),
      smsEnabled: state.group.settings?.smsSendingEnabled === true,
    });
    if (created) closeCreateNextMatch();
  }

  function setCreateMatchField(field, value) {
    setLadderMatchModal((current) => current ? { ...current, [field]: value } : current);
  }

  function saveLadderPositionsDraft(ladder, rows) {
    setPositionDrafts((current) => ({
      ...current,
      [ladder.id]: positionsFromRows(rows),
    }));
  }

  function moveLadderPlayer(ladder, rows, playerId, nextPosition) {
    saveLadderPositionsDraft(ladder, movePlayerToPosition(rows, playerId, nextPosition));
  }

  function dragLadderPlayerTo(ladder, rows, targetPlayerId) {
    if (!draggedLadderPlayer || String(draggedLadderPlayer.ladderId) !== String(ladder.id)) return;
    moveLadderPlayer(ladder, rows, draggedLadderPlayer.playerId, positionForPlayer(rows, targetPlayerId));
    setDraggedLadderPlayer(null);
  }

  function toggleLadderPlayers(ladderId) {
    setExpandedLadderIds((current) => {
      const next = new Set(current);
      const cleanId = String(ladderId || "");
      if (next.has(cleanId)) next.delete(cleanId);
      else next.add(cleanId);
      return next;
    });
  }

  function setLadderHistoryPlayerFilter(ladderId, playerId) {
    setLadderHistoryPlayerFilters((current) => ({
      ...current,
      [String(ladderId || "")]: playerId,
    }));
  }

  function setPositionDraft(ladder, playerId, position) {
    const summary = ladderSummary(state, ladder);
    const rows = orderedRowsFromDraft(summary.rows, positionDrafts[ladder.id] || {});
    moveLadderPlayer(ladder, rows, playerId, Number(position));
  }

  async function savePositions(ladder, rows) {
    const positions = { ...positionsFromRows(rows), ...(positionDrafts[ladder.id] || {}) };
    const saved = await runAction("saveLadderPositions", {
      ladderId: ladder.id,
      positions,
    });
    if (saved) {
      setPositionDrafts((current) => {
        const next = { ...current };
        delete next[ladder.id];
        return next;
      });
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.75)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Ladders</h2>
            <div className="mt-1 text-xs font-black uppercase tracking-wide text-slate-500">{ladders.length} configured</div>
          </div>
          <button type="button" onClick={openAddLadder} className="rounded-lg bg-violet-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-violet-800">
            Add Ladder
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {ladders.map((ladder) => {
            const summary = ladderSummary(state, ladder);
            const groupName = groupNamesByIds(state, [ladder.playerGroupId])[0] || "Group missing";
            const playersExpanded = expandedLadderIds.has(String(ladder.id));
            const canEditPositions = !summary.sessions.some((session) => ["playing", "done"].includes(session.status));
            const draftPositions = { ...positionsFromRows(summary.rows), ...(positionDrafts[ladder.id] || {}) };
            const orderedRows = orderedRowsFromDraft(summary.rows, draftPositions);
            const positionError = canEditPositions ? ladderPositionDraftError(draftPositions, orderedRows.length) : "";
            const selectedHistoryPlayerId = ladderHistoryPlayerFilters[String(ladder.id)] || "all";
            const historyPlayerOptions = historyPlayerOptionsForRows(summary.historyRows);
            const visibleHistoryRows = selectedHistoryPlayerId === "all"
              ? summary.historyRows
              : summary.historyRows.filter((row) => String(row.playerId || "") === String(selectedHistoryPlayerId));
            return (
              <div key={ladder.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-black text-slate-950">{ladder.name}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">
                      {groupName} | {ladder.dayOfWeekLabel || ladder.dayOfWeek} {ladder.startTime || ""} | {ladder.participationRequirement}% participation
                    </div>
                    <div className="mt-1 text-xs font-black uppercase tracking-wide text-violet-700">
                      Ranking: {rankingCriteriaSummary(ladder.rankingCriteria)} | Movement: {ladderMovementLabel(ladder)}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => toggleLadderPlayers(ladder.id)} className={`rounded-lg border px-3 py-2 text-xs font-black shadow-sm ${playersExpanded ? "border-violet-500 bg-violet-700 text-white" : "border-slate-300 bg-white text-slate-800 hover:border-blue-500 hover:bg-blue-50"}`}>Players</button>
                    <button type="button" onClick={() => editLadder(ladder)} className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">Edit</button>
                    <button type="button" onClick={() => deleteLadder(ladder)} disabled={actionLoading === "deleteLadder"} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:bg-slate-100 disabled:text-slate-400">Delete</button>
                    <button type="button" onClick={() => openCreateNextMatch(ladder)} disabled={actionLoading === "createLadderMatch"} className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white hover:bg-violet-800 disabled:bg-slate-300">Create Next Match Date</button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  <StatBox label="Sessions/Dates Played" value={summary.sessionCount} />
                  <StatBox label="Eligible" value={summary.eligibleCount} />
                  <StatBox label="Next Date (Potential)" value={summary.nextDate ? formatDate(summary.nextDate) : "-"} />
                </div>
                {summary.sessions.length > 0 && (
                  <div className="mt-3 rounded-lg border border-violet-100 bg-white p-3">
                    <div className="text-xs font-black uppercase tracking-wide text-violet-700">Matches - click on a match to see details</div>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {summary.sessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => setResultsSession(session)}
                          className={`rounded-lg border px-3 py-2 text-left text-sm font-bold shadow-sm transition hover:-translate-y-0.5 ${ladderMatchButtonClass(session)}`}
                        >
                          <span className="block font-black text-slate-950">{formatDate(session.session_date)} {session.starts_at ? `- ${formatTime(session.starts_at)}` : ""}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{session.session_name || ladder.name} - {sessionStatusLabel(session.status)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {playersExpanded && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white">
                    {canEditPositions && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-violet-50 px-3 py-2">
                        <div className="text-sm font-black text-violet-950">Drag player rows or change Current Position. Positions can be edited until the first ladder match starts.</div>
                        <button
                          type="button"
                          onClick={() => savePositions(ladder, orderedRows)}
                          disabled={actionLoading === "saveLadderPositions" || Boolean(positionError)}
                          className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black text-white hover:bg-violet-800 disabled:bg-slate-300"
                        >
                          {actionLoading === "saveLadderPositions" ? "Saving..." : "Save Positions"}
                        </button>
                        {positionDrafts[ladder.id] && (
                          <button
                            type="button"
                            onClick={() => setPositionDrafts((current) => {
                              const next = { ...current };
                              delete next[ladder.id];
                              return next;
                            })}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                          >
                            Discard Position Changes
                          </button>
                        )}
                        {positionError && <div className="w-full text-xs font-black text-red-700">{positionError}</div>}
                      </div>
                    )}
                    {!canEditPositions && (
                      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-600">
                        Current Position is locked because the first ladder match has started.
                      </div>
                    )}
                    <div className="space-y-2 p-3 md:hidden">
                      {orderedRows.map((row) => (
                        <div
                          key={row.playerId}
                          draggable={canEditPositions}
                          onDragStart={() => setDraggedLadderPlayer({ ladderId: ladder.id, playerId: row.playerId })}
                          onDragOver={(event) => {
                            if (canEditPositions) event.preventDefault();
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            dragLadderPlayerTo(ladder, orderedRows, row.playerId);
                          }}
                          onDragEnd={() => setDraggedLadderPlayer(null)}
                          className={`rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm ${canEditPositions ? "cursor-move" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="break-words text-base font-black text-slate-950">{row.displayName}</div>
                              {canEditPositions && <div className="mt-0.5 text-xs font-black uppercase tracking-wide text-violet-700">Drag to reorder</div>}
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">Current Position</div>
                              {canEditPositions ? (
                                <select
                                  value={draftPositions[row.playerId] || row.position}
                                  onChange={(event) => setPositionDraft(ladder, row.playerId, event.target.value)}
                                  className="mt-1 w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-black text-slate-950"
                                >
                                  {Array.from({ length: orderedRows.length }, (_, index) => index + 1).map((position) => (
                                    <option key={position} value={position}>{position}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="mt-1 rounded-lg bg-slate-900 px-3 py-1 text-sm font-black text-white">#{row.position}</div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <MobileStandingStat label="Previous Position" value={formatLadderRank(row.previousPosition, row.positionCount)} />
                            <MobileStandingStat label="Dates Played" value={row.sessionsPlayed} />
                            <MobileStandingStat label="Last Played" value={row.lastPlayedDate ? formatDate(row.lastPlayedDate) : "-"} />
                            <MobileStandingStat label="Games Played" value={row.matchesPlayed} />
                            <MobileStandingStat label="Points" value={row.pointsFor || 0} />
                            <MobileStandingStat label="Win %" value={formatPercent(row.winPct)} />
                          </div>
                        </div>
                      ))}
                      {orderedRows.length === 0 && (
                        <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No players are assigned to this ladder group.</div>
                      )}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[760px] text-sm">
                        <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-3 py-2 text-left">Current Position</th>
                            <th className="px-3 py-2 text-left">Previous Position</th>
                            <th className="px-3 py-2 text-left">Player</th>
                            <th className="px-3 py-2 text-right">Dates Played</th>
                            <th className="px-3 py-2 text-left">Last Date Played</th>
                            <th className="px-3 py-2 text-right">Games Played</th>
                            <th className="px-3 py-2 text-right">Points</th>
                            <th className="px-3 py-2 text-right">Win %</th>
                            <th className="px-3 py-2 text-center">Eligible</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {orderedRows.map((row) => (
                          <tr
                            key={row.playerId}
                            draggable={canEditPositions}
                            onDragStart={() => setDraggedLadderPlayer({ ladderId: ladder.id, playerId: row.playerId })}
                            onDragOver={(event) => {
                              if (canEditPositions) event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              dragLadderPlayerTo(ladder, orderedRows, row.playerId);
                            }}
                            onDragEnd={() => setDraggedLadderPlayer(null)}
                            className={canEditPositions ? "cursor-move transition hover:bg-violet-50" : ""}
                          >
                            <td className="px-3 py-2 font-black text-slate-950">
                              {canEditPositions ? (
                                <select
                                  value={draftPositions[row.playerId] || row.position}
                                  onChange={(event) => setPositionDraft(ladder, row.playerId, event.target.value)}
                                  className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-black text-slate-950"
                                >
                                  {Array.from({ length: summary.rows.length }, (_, index) => index + 1).map((position) => (
                                    <option key={position} value={position}>{position}</option>
                                  ))}
                                </select>
                              ) : `#${row.position}`}
                            </td>
                            <td className="px-3 py-2 font-black text-blue-800">{formatLadderRank(row.previousPosition, row.positionCount)}</td>
                            <td className="px-3 py-2 font-bold text-slate-700">
                              <span className="inline-flex items-center gap-2">
                                {canEditPositions && <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">Drag</span>}
                                {row.displayName}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-slate-700">{row.sessionsPlayed}</td>
                            <td className="px-3 py-2 font-bold text-slate-700">{row.lastPlayedDate ? formatDate(row.lastPlayedDate) : "-"}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-700">{row.matchesPlayed}</td>
                            <td className="px-3 py-2 text-right font-black text-slate-950">{row.pointsFor || 0}</td>
                            <td className="px-3 py-2 text-right font-black text-slate-950">{formatPercent(row.winPct)}</td>
                            <td className="px-3 py-2 text-center font-black">{row.eligible ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                        {orderedRows.length === 0 && (
                          <tr>
                            <td colSpan={9} className="px-3 py-8 text-center text-sm font-bold text-slate-500">No players are assigned to this ladder group.</td>
                          </tr>
                        )}
                        </tbody>
                      </table>
                    </div>
                    {summary.historyRows.length > 0 && (
                      <div className="border-t border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div className="text-sm font-black text-slate-950">Ladder History by Date</div>
                          <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
                            Player
                            <select
                              value={selectedHistoryPlayerId}
                              onChange={(event) => setLadderHistoryPlayerFilter(ladder.id, event.target.value)}
                              className="mt-1 w-full min-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black normal-case tracking-normal text-slate-950 shadow-sm"
                            >
                              <option value="all">All Players</option>
                              {historyPlayerOptions.map((option) => (
                                <option key={option.playerId} value={option.playerId}>{option.displayName}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                          <table className="w-full min-w-[940px] text-sm">
                            <thead className="bg-slate-100 text-xs font-black uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-3 py-2 text-left">Date</th>
                                <th className="px-3 py-2 text-left">Player</th>
                                <th className="px-3 py-2 text-left">Previous Position</th>
                                <th className="px-3 py-2 text-left">New Position</th>
                                <th className="px-3 py-2 text-right">Points</th>
                                <th className="px-3 py-2 text-right">Win %</th>
                                <th className="px-3 py-2 text-right">Games</th>
                                <th className="px-3 py-2 text-right">Record</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {visibleHistoryRows.map((row) => (
                                <tr key={`${row.sessionId}-${row.playerId}`}>
                                  <td className="px-3 py-2 font-black text-slate-950">{formatDate(row.sessionDate)}</td>
                                  <td className="px-3 py-2 font-bold text-slate-700">{row.displayName}</td>
                                  <td className="px-3 py-2 font-black text-blue-800">{formatLadderRank(row.previousPosition, row.positionCount)}</td>
                                  <td className="px-3 py-2 font-black text-emerald-800">{formatLadderRank(row.newPosition, row.positionCount)}</td>
                                  <td className="px-3 py-2 text-right font-black text-slate-950">{row.pointsFor}</td>
                                  <td className="px-3 py-2 text-right font-black text-slate-950">{formatPercent(row.winPct)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-700">{row.games}</td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-700">{row.wins}-{row.losses}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {ladders.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm font-bold text-slate-500">No ladders created yet.</div>
          )}
        </div>
      </section>

      {ladderModalOpen && (
        <LadderFormModal
          form={form}
          setForm={setForm}
          activeGroups={activeGroups}
          activePlayers={activePlayers(state.players)}
          actionLoading={actionLoading}
          hasStartedMatches={ladderHasStarted(state, form.id)}
          onRecalculate={() => recalculateLadderRankings(form)}
          onSave={saveLadder}
          onClose={closeLadderModal}
        />
      )}

      {ladderMatchModal && (
        <LadderMatchConfirmModal
          modal={ladderMatchModal}
          actionLoading={actionLoading}
          onChange={setCreateMatchField}
          onCreate={createNextMatch}
          onClose={closeCreateNextMatch}
        />
      )}

      {resultsSession && (
        <SessionResultsModal
          state={state}
          session={resultsSession}
          onClose={() => setResultsSession(null)}
        />
      )}
    </div>
  );
}

function LadderMatchConfirmModal({ modal, actionLoading, onChange, onCreate, onClose }) {
  const creating = actionLoading === "createLadderMatch";
  const ladder = modal.ladder || {};

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
        <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
          <div className={`flex flex-wrap items-start justify-between gap-3 p-4 ${MODAL_HEADER_CHROME}`}>
            <div>
              <div className={MODAL_EYEBROW_CHROME}>Create Ladder Match</div>
              <h2 className="text-2xl font-black">{ladder.name || "Ladder"}</h2>
              <p className={MODAL_SUPPORTING_TEXT}>Confirm the date and start time for the next ladder match.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
              Cancel
            </button>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextInput label="Match date" type="date" value={modal.sessionDate || ""} onChange={(value) => onChange("sessionDate", value)} required />
              <TextInput label="Start time" type="time" value={modal.startsAt || ""} onChange={(value) => onChange("startsAt", value)} />
              <label className="block text-sm font-bold text-slate-600 sm:col-span-2">
                Text reminder hours before match
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={modal.reminderHoursBefore ?? 0}
                  onChange={(event) => onChange("reminderHoursBefore", clampNumber(event.target.value, 0, 168, 0))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
                />
                <span className="mt-1 block text-xs font-bold text-slate-500">Use 0 for no reminder.</span>
              </label>
            </div>
            <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-950">
              This will open the match date, invite the selected ladder group, and send New Match texts when SMS is enabled.
            </div>
            <button
              type="button"
              onClick={onCreate}
              disabled={creating || !modal.sessionDate}
              className="mt-4 w-full rounded-lg bg-violet-700 px-4 py-3 font-black text-white shadow-sm hover:bg-violet-800 disabled:bg-slate-300"
            >
              {creating ? "Creating..." : "Create Match"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function LadderFormModal({ form, setForm, activeGroups, activePlayers, actionLoading, hasStartedMatches, onRecalculate, onSave, onClose }) {
  const isEditing = Boolean(form.id);
  const saving = actionLoading === "saveLadder";
  const recalculating = actionLoading === "recalculateLadderRankings";
  const rankingCriteria = normalizeLadderRankingCriteria(form.rankingCriteria);
  const [showParticipationHelp, setShowParticipationHelp] = useState(false);

  function setRankingCriterion(index, value) {
    setForm((current) => {
      const nextCriteria = normalizeLadderRankingCriteria(current.rankingCriteria);
      if (nextCriteria.some((item, itemIndex) => itemIndex !== index && item === value)) return current;
      nextCriteria[index] = value;
      return { ...current, rankingCriteria: normalizeLadderRankingCriteria(nextCriteria) };
    });
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)]">
          <div className={`flex flex-wrap items-start justify-between gap-3 p-4 ${MODAL_HEADER_CHROME}`}>
            <div>
              <div className={MODAL_EYEBROW_CHROME}>Ladder Setup</div>
              <h2 className="text-2xl font-black">{isEditing ? "Edit Ladder" : "Add Ladder"}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100">
              Cancel
            </button>
          </div>
          <div className="max-h-[78vh] overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextInput label="Name of League/Ladder" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
              <label className="block text-sm font-bold text-slate-600">
                Player Group
                <select value={form.playerGroupId} onChange={(event) => setForm((current) => ({ ...current, playerGroupId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                  <option value="">Select group</option>
                  {activeGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                </select>
              </label>
              <TextInput label="Start date" type="date" value={form.startDate} onChange={(value) => setForm((current) => ({ ...current, startDate: value, dayOfWeek: dayOfWeekForDate(value) || current.dayOfWeek }))} required />
              <TextInput label="End date" type="date" value={form.endDate} onChange={(value) => setForm((current) => ({ ...current, endDate: value }))} />
              <label className="block text-sm font-bold text-slate-600">
                Day of week
                <select value={form.dayOfWeek} onChange={(event) => setForm((current) => ({ ...current, dayOfWeek: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                  {LADDER_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                </select>
              </label>
              <TextInput label="Start time" type="time" value={form.startTime} onChange={(value) => setForm((current) => ({ ...current, startTime: value }))} />
              <label className="block text-sm font-bold text-slate-600">
                Host
                <select value={form.hostPlayerId} onChange={(event) => setForm((current) => ({ ...current, hostPlayerId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                  <option value="">Select host</option>
                  {activePlayers.map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Co-Host
                <select value={form.cohostPlayerId} onChange={(event) => setForm((current) => ({ ...current, cohostPlayerId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                  <option value="">No co-host</option>
                  {activePlayers.map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Default Text reminder hours before match
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={form.reminderHoursBefore}
                  onChange={(event) => setForm((current) => ({ ...current, reminderHoursBefore: clampNumber(event.target.value, 0, 168, 0) }))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950"
                />
                <span className="mt-1 block text-xs font-bold text-slate-500">Use 0 for no reminder.</span>
              </label>
              <label className="block text-sm font-bold text-slate-600">
                <span className="flex items-center gap-2">
                  <span>Participation requirements</span>
                  <button
                    type="button"
                    onClick={() => setShowParticipationHelp((current) => !current)}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-violet-200 bg-violet-50 text-xs font-black text-violet-900 shadow-sm hover:bg-violet-100"
                    aria-expanded={showParticipationHelp}
                    aria-label="Participation requirements help"
                    title={PARTICIPATION_REQUIREMENT_HELP}
                  >
                    ?
                  </button>
                </span>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={form.participationRequirement}
                    onChange={(event) => setForm((current) => ({ ...current, participationRequirement: clampNumber(event.target.value, 10, 100, 50) }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 font-semibold text-slate-950"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-black text-slate-500">%</span>
                </div>
                {showParticipationHelp && (
                  <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-3 py-2 text-xs font-bold leading-relaxed text-violet-950">
                    {PARTICIPATION_REQUIREMENT_HELP}
                  </div>
                )}
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Balance Matchups
                <select value={form.balanceMode} onChange={(event) => setForm((current) => ({ ...current, balanceMode: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                  <option value="session">Balance each match session</option>
                  <option value="season">Balance across the length of the league</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-600">
                Movement
                <select value={form.movementMode} onChange={(event) => setForm((current) => ({ ...current, movementMode: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                  <option value="top1">Top 1 up, bottom 1 down</option>
                  <option value="top2">Top 2 up, bottom 2 down</option>
                </select>
              </label>
              <div className="md:col-span-2 rounded-lg border border-violet-100 bg-violet-50 p-3">
                <div className="text-sm font-black uppercase tracking-wide text-violet-800">Ranking Calculations</div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {rankingCriteria.map((criterion, index) => (
                    <label key={index} className="block text-sm font-bold text-slate-600">
                      Calculation {index + 1}
                      <select
                        value={criterion}
                        onChange={(event) => setRankingCriterion(index, event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold"
                      >
                        {LADDER_RANKING_CRITERIA_OPTIONS.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                            disabled={rankingCriteria.some((item, itemIndex) => itemIndex !== index && item === option.value)}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                {isEditing && hasStartedMatches && (
                  <button
                    type="button"
                    onClick={onRecalculate}
                    disabled={recalculating || !form.name.trim() || !form.startDate || !form.playerGroupId}
                    className="mt-3 rounded-lg bg-violet-900 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-violet-800 disabled:bg-slate-300"
                  >
                    {recalculating ? "Recalculating..." : "Recalculate Prior Matches"}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !form.name.trim() || !form.startDate || !form.playerGroupId}
              className="mt-4 w-full rounded-lg bg-violet-700 px-4 py-3 font-black text-white shadow-sm hover:bg-violet-800 disabled:bg-slate-300"
            >
              {saving ? "Saving..." : isEditing ? "Update Ladder" : "Create Ladder"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function StatBox({ label, value, compact = false }) {
  return (
    <div className={`min-w-0 rounded-lg border border-slate-200 bg-slate-50 ${compact ? "p-2" : "p-3"}`}>
      <div className={`${compact ? "text-[10px]" : "text-xs"} font-black uppercase tracking-wide text-slate-500`}>{label}</div>
      <div className={`mt-1 break-words font-black leading-tight text-slate-950 ${compact ? "text-lg" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function MobileStandingStat({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 break-words text-base font-black text-slate-950">{value}</div>
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
    if (!window.confirm(`Delete ${group.name}? Players and past matches will stay saved.`)) return;
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
          <div className={`flex items-center justify-between gap-3 px-5 py-4 ${MODAL_HEADER_CHROME}`}>
            <div>
              <div className={MODAL_EYEBROW_CHROME}>Current Players</div>
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

function CourtsTab({ state, runAction, actionLoading, setTabDirty }) {
  const [courts, setCourts] = useState(() => activeCourts(state.courts).map(editableCourt));
  const [courtsBaseline, setCourtsBaseline] = useState(() => activeCourts(state.courts).map(editableCourt));

  useEffect(() => {
    const nextCourts = activeCourts(state.courts).map(editableCourt);
    setCourts(nextCourts);
    setCourtsBaseline(nextCourts);
  }, [state.courts]);

  useEffect(() => {
    setTabDirty?.("Courts", JSON.stringify(courts) !== JSON.stringify(courtsBaseline));
    return () => setTabDirty?.("Courts", false);
  }, [courts, courtsBaseline, setTabDirty]);

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
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={async () => { const saved = await runAction("saveCourts", { courts }); if (saved) setCourtsBaseline(courts); }} disabled={actionLoading === "saveCourts"} className="rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
          Save Courts
        </button>
        {JSON.stringify(courts) !== JSON.stringify(courtsBaseline) && (
          <button type="button" onClick={() => setCourts(courtsBaseline)} className="rounded-lg bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200">
            Reset Changes
          </button>
        )}
      </div>
    </section>
  );
}

function SettingsTab({ state, runAction, actionLoading, setTabDirty }) {
  const [form, setForm] = useState({
    name: state.group.name || "",
    adminCode: "",
    mode: state.group.mode || "daily_round_robin",
    scheduleDay: state.group.schedule_day || "",
    scheduleTime: state.group.schedule_time || "",
    timezone: state.group.timezone || "America/New_York",
    defaultRounds: Number(state.group.settings?.defaultRounds || 6),
    defaultLocation: state.group.settings?.defaultLocation || "",
    defaultHostPlayerId: defaultHostPlayerId(state),
    secondaryCode: "",
  });
  const [formBaseline, setFormBaseline] = useState(form);
  const sessionCount = state.sessions?.length || 0;
  const activeDefaultHostPlayers = activePlayers(state.players);

  useEffect(() => {
    setTabDirty?.("Settings", JSON.stringify(form) !== JSON.stringify(formBaseline));
    return () => setTabDirty?.("Settings", false);
  }, [form, formBaseline, setTabDirty]);

  async function masterResetRoundRobin() {
    const firstOk = window.confirm([
      "Master Reset will permanently delete all Round Robin and Ladder matches for this group.",
      "",
      "This removes match history, joined/declined/waitlist match responses, generated rounds, scores, rankings, player stats, and match activity logs.",
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
          <TextInput label="Default Location" value={form.defaultLocation} onChange={(value) => setForm((current) => ({ ...current, defaultLocation: value }))} placeholder="Court location" />
          <label className="block text-sm font-bold text-slate-600">
            Default Host
            <select value={form.defaultHostPlayerId} onChange={(event) => setForm((current) => ({ ...current, defaultHostPlayerId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
              <option value="">First active player</option>
              {activeDefaultHostPlayers.map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
            </select>
          </label>
          <TextInput label="New manager code" value={form.adminCode} onChange={(value) => setForm((current) => ({ ...current, adminCode: value }))} placeholder="Leave blank to keep current" />
          <TextInput label="Secondary Code" value={form.secondaryCode} onChange={(value) => setForm((current) => ({ ...current, secondaryCode: value }))} placeholder="Leave blank to keep current" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={async () => { const saved = await runAction("saveSettings", form); if (saved) setFormBaseline(form); }} disabled={actionLoading === "saveSettings" || !form.name.trim()} className="rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300">
            Save Settings
          </button>
          {JSON.stringify(form) !== JSON.stringify(formBaseline) && (
            <button type="button" onClick={() => setForm(formBaseline)} className="rounded-lg bg-slate-100 px-4 py-3 font-black text-slate-700 hover:bg-slate-200">
              Reset Changes
            </button>
          )}
        </div>
      </section>

      <section className="w-full rounded-lg border border-red-200 bg-red-50/95 p-4 shadow-[0_18px_48px_-36px_rgba(127,29,29,0.55)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-red-950">Master Reset</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-red-800">
              Deletes all regular match and ladder match history, generated games, scores, rankings, and player stats for this Round Robin group. Saved Players, Groups, and player group assignments stay in place.
            </p>
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-red-700">
              Current matches/history rows: {sessionCount}
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
  const selectedSessionPlayers = activeSessionPlayersForSession(state, selectedSmsSession?.id);
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
    setMessage(renderClientSmsTemplate(templates[selectedTemplateKey], state.group, nextSession, activeSessionPlayersForSession(state, nextSession?.id)));
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
          Texting match
          <select value={selectedSessionId} onChange={(event) => selectSmsSession(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold">
            <option value="">Select match</option>
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
            <option value="session">All match players except declined</option>
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
            Select a match before sending or logging texts.
          </div>
        )}
      </div>
      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-black text-slate-950">Text Templates</h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs font-black uppercase tracking-wide text-slate-500">
              Test phone
              <input type="tel" value={testPhone} onChange={(event) => setTestPhone(formatPhoneInput(event.target.value))} placeholder="(941) 555-1212" className="mt-1 w-40 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-950" />
            </label>
            <button type="button" onClick={() => saveSmsSettings()} disabled={actionLoading === "saveSmsSettings"} className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 disabled:bg-slate-300">
              Save SMS Settings
            </button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <TemplateTextarea label="New Player" value={templates.newPlayer} onChange={(value) => setTemplate("newPlayer", value)} onTest={() => sendTemplateTest("newPlayer")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Ladder Added" value={templates.ladderAdded} onChange={(value) => setTemplate("ladderAdded", value)} onTest={() => sendTemplateTest("ladderAdded")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="New match text" value={templates.sessionInvite} onChange={(value) => setTemplate("sessionInvite", value)} onTest={() => sendTemplateTest("sessionInvite")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Pending signup reminder" value={templates.sessionReminder} onChange={(value) => setTemplate("sessionReminder", value)} onTest={() => sendTemplateTest("sessionReminder")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Game update" value={templates.gameUpdate} onChange={(value) => setTemplate("gameUpdate", value)} onTest={() => sendTemplateTest("gameUpdate")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Weather update" value={templates.weatherUpdate} onChange={(value) => setTemplate("weatherUpdate", value)} onTest={() => sendTemplateTest("weatherUpdate")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
          <TemplateTextarea label="Match results" value={templates.sessionResults} onChange={(value) => setTemplate("sessionResults", value)} onTest={() => sendTemplateTest("sessionResults")} testDisabled={!testPhone.trim() || actionLoading === "sendTestTemplateText"} />
        </div>
        <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-500">
          Placeholders: {"{{group_name}}"}, {"{{player_name}}"}, {"{{ladder_name}}"}, {"{{session_name}}"}, {"{{date}}"}, {"{{time}}"}, {"{{location}}"}, {"{{location_line}}"}, {"{{public_link}}"}, {"{{joined_count}}"}, {"{{available_spots}}"}, {"{{result_rankings}}"}
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

function TextInput({ label, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <label className="block text-sm font-bold text-slate-600">
      {label}{required ? " *" : ""}
      <input type={type} value={value} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950" />
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

function isLadderSession(session) {
  return Boolean(session?.settings?.ladderId) || session?.mode === "ladder";
}

function hasRegularAndLadderSessions(sessions = []) {
  const activeSessions = sessions.filter((session) => session.status !== "cancelled");
  return activeSessions.some(isLadderSession) && activeSessions.some((session) => !isLadderSession(session));
}

function filterSessionsByMatchType(sessions = [], matchType = "all") {
  if (matchType === "ladder") return sessions.filter(isLadderSession);
  if (matchType === "regular") return sessions.filter((session) => !isLadderSession(session));
  return sessions;
}

function sessionDuprExported(session) {
  return Boolean(session?.settings?.duprExportedAt || session?.settings?.duprExport?.exportedAt);
}

function needsDuprExport(session) {
  return isPastSession(session) && session.status === "done" && !sessionDuprExported(session);
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
  return activeSessionPlayersForSession(state, sessionId)
    .filter((player) => player.response_status === status)
    .sort((a, b) => compareNamesByFirstName(a.display_name, b.display_name));
}

function allPlayersForSession(state, sessionId) {
  const rows = state.allSessionPlayers || [];
  const fallbackRows = rows.length > 0 ? rows : state.sessionPlayers || [];
  return fallbackRows.filter((player) => String(player.session_id) === String(sessionId));
}

function activeSessionPlayersForSession(state, sessionId) {
  const activePlayerIds = new Set((state.players || [])
    .filter((player) => player.is_active !== false)
    .map((player) => String(player.id)));
  return allPlayersForSession(state, sessionId)
    .filter((player) => !player.player_id || activePlayerIds.has(String(player.player_id)));
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

function sessionLadderForSession(state, session) {
  const ladderId = String(session?.settings?.ladderId || "").trim();
  if (!ladderId) return null;
  const settingsLadder = normalizeLadderList(state.group?.settings?.ladders || [])
    .find((ladder) => String(ladder.id) === ladderId);
  if (settingsLadder) return settingsLadder;
  const fallback = session?.settings?.ladderConfig || {};
  const name = fallback.name || session?.settings?.ladderName || "Ladder";
  return normalizeLadderList([{ ...fallback, id: ladderId, name }])[0] || null;
}

function ladderPreviousPositionForResult(state, session, row) {
  const metadata = resultMetadata(row);
  const savedPosition = positiveNumber(metadata.ladderPreviousPosition ?? metadata.previousPosition);
  if (savedPosition) return savedPosition;
  const ladder = sessionLadderForSession(state, session);
  if (!ladder) return null;
  const order = ladderPositionOrderBeforeSession(state, ladder, session);
  const index = order.findIndex((playerId) => String(playerId) === String(row.player_id || ""));
  return index >= 0 ? index + 1 : null;
}

function ladderPositionCountForResult(state, session, row) {
  const metadata = resultMetadata(row);
  const savedCount = positiveNumber(metadata.ladderPositionCount ?? metadata.positionCount);
  if (savedCount) return savedCount;
  const ladder = sessionLadderForSession(state, session);
  return ladder ? playerIdsForGroup(state, ladder.playerGroupId).length : null;
}

function ladderPositionOrderBeforeSession(state, ladder, session) {
  const priorSessions = (state.sessions || [])
    .filter((item) => String(item.id || "") !== String(session?.id || ""))
    .filter((item) => String(item.settings?.ladderId || "") === String(ladder.id))
    .filter((item) => item.status === "done")
    .filter((item) => sessionSortValue(item) < sessionSortValue(session))
    .sort(sortSessionsAscending);
  const priorSessionIds = new Set(priorSessions.map((item) => String(item.id || "")));
  const resultRows = (state.allPlayerResults || state.results || [])
    .filter((item) => priorSessionIds.has(String(item.session_id || "")));
  const matchRows = (state.allMatches || state.matches || [])
    .filter((item) => priorSessionIds.has(String(item.session_id || "")));
  return ladderPositionOrder(playerIdsForGroup(state, ladder.playerGroupId), priorSessions, resultRows, ladder, matchRows);
}

function resultMetadata(row) {
  const metadata = row?.metadata;
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
}

function resultRowHasScoredMatch(row) {
  return Number(row?.games || 0) > 0 || Number(row?.wins || 0) > 0 || Number(row?.losses || 0) > 0;
}

function positiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function formatLadderRank(position, count) {
  const safePosition = positiveNumber(position);
  if (!safePosition) return "-";
  const safeCount = positiveNumber(count);
  return safeCount ? `#${safePosition} out of ${safeCount}` : `#${safePosition}`;
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

function winPctForStanding(row) {
  const wins = Number(row?.wins || 0);
  const losses = Number(row?.losses || 0);
  const games = Number(row?.games || wins + losses);
  return games > 0 ? wins / games : 0;
}

function isWinningScore(score, opponentScore) {
  const numeric = Number(score);
  const opponentNumeric = Number(opponentScore);
  if (Number.isNaN(numeric) || Number.isNaN(opponentNumeric)) return false;
  return numeric > opponentNumeric;
}

function formatGameScore(score) {
  return score ?? "-";
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

function defaultRoundSessionPlayerIds(state, sessionId, joinedPlayers = []) {
  const joinedRows = joinedPlayers || [];
  const bySavedPlayerId = new Map(joinedRows
    .map((player) => [String(player.player_id || player.id || ""), String(player.id || "")])
    .filter(([savedPlayerId, sessionPlayerId]) => savedPlayerId && sessionPlayerId));
  const matches = sessionMatchesForSession(state, sessionId);
  const latestRoundNumber = Math.max(0, ...matches.map((match) => Number(match.round_number || 0)));

  if (latestRoundNumber > 0) {
    const latestPlayerIds = playerIdsFromMatches(matches.filter((match) => Number(match.round_number || 0) === latestRoundNumber));
    const sessionPlayerIds = [...latestPlayerIds]
      .map((playerId) => bySavedPlayerId.get(String(playerId)))
      .filter(Boolean);
    if (sessionPlayerIds.length > 0) return sessionPlayerIds;
  }

  return joinedRows.map((player) => String(player.id || "")).filter(Boolean);
}

function playerNames(players) {
  return (players || [])
    .map((player) => player.firstLabel || player.displayName || player.display_name || player.display_name_snapshot || "Player")
    .join(" / ") || "Team";
}

function suggestedCourtCountForPlayers(playerCount) {
  const count = Number(playerCount || 0);
  if (count <= 7) return 1;
  return Math.max(1, Math.ceil((count - 3) / 4));
}

function roundElementId(roundNumber) {
  return `live-round-${String(roundNumber || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function matchElementId(matchId) {
  return `live-match-${String(matchId || "").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function scrollToRoundHeader(roundNumber) {
  const element = document.getElementById(roundElementId(roundNumber));
  if (!element) return;
  const offset = 112;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function scrollToMatchCard(matchId) {
  const element = document.getElementById(matchElementId(matchId));
  if (!element) return;
  const offset = 112;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

function nextRoundNumberForSession(state, sessionId) {
  const currentRoundNumber = Math.max(
    0,
    ...(state?.matches || [])
      .filter((match) => String(match.session_id || "") === String(sessionId || ""))
      .map((match) => Number(match.round_number || 0))
  );
  return currentRoundNumber + 1;
}

function sessionLifecycleClass(status) {
  if (status === "playing") return "bg-teal-100 text-teal-900";
  if (status === "done") return "bg-emerald-100 text-emerald-900";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  if (status === "open") return "bg-blue-100 text-blue-900";
  return "bg-slate-200 text-slate-700";
}

function sessionStatusLabel(status) {
  if (status === "done") return "Finished";
  return status || "";
}

function ladderMovementLabel(ladder) {
  return ladder?.movementMode === "top2" ? "Top 2 up, bottom 2 down" : "Top 1 up, bottom 1 down";
}

function ladderMatchButtonClass(session) {
  if (session?.status === "done") return "border-emerald-300 bg-emerald-50 text-emerald-950 hover:border-emerald-500 hover:bg-emerald-100";
  if (session?.status === "cancelled") return "border-red-300 bg-red-50 text-red-950 hover:border-red-500 hover:bg-red-100";
  return "border-violet-200 bg-violet-50 text-slate-800 hover:border-violet-400 hover:bg-white";
}

function compareNamesByFirstName(firstName, secondName) {
  const first = String(firstName || "").trim();
  const second = String(secondName || "").trim();
  const firstGiven = first.split(/\s+/)[0] || first;
  const secondGiven = second.split(/\s+/)[0] || second;
  return firstGiven.localeCompare(secondGiven, undefined, { sensitivity: "base" })
    || first.localeCompare(second, undefined, { sensitivity: "base" });
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
      sessionStatusLabel(session.status),
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
      player.dupr_id,
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

function rankingCriteriaSummary(criteria) {
  return normalizeLadderRankingCriteria(criteria).map(ladderRankingCriteriaLabel).join(", ");
}

function ladderHasStarted(state, ladderId) {
  const cleanId = String(ladderId || "");
  if (!cleanId) return false;
  return (state.sessions || []).some((session) => (
    String(session.settings?.ladderId || "") === cleanId &&
    ["playing", "done"].includes(session.status)
  ));
}

function normalizeSearchText(value) {
  if (Array.isArray(value)) return value.map(normalizeSearchText).join(" ").trim();
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function emptyLadderForm(state) {
  const startDate = new Date().toISOString().slice(0, 10);
  return {
    id: "",
    name: "",
    format: "ladder",
    startDate,
    endDate: "",
    dayOfWeek: dayOfWeekForDate(startDate) || "monday",
    startTime: timeInputValue(state.group.schedule_time),
    hostPlayerId: defaultHostPlayerId(state) || activePlayers(state.players)[0]?.id || "",
    cohostPlayerId: "",
    reminderHoursBefore: 0,
    playerGroupId: "",
    participationRequirement: 50,
    balanceMode: "session",
    movementMode: "top1",
    rankingCriteria: DEFAULT_LADDER_RANKING_CRITERIA,
    status: "active",
  };
}

function ladderFormFromLadder(ladder) {
  return {
    id: ladder.id || "",
    name: ladder.name || "",
    format: ladder.format || "ladder",
    startDate: ladder.startDate || "",
    endDate: ladder.endDate || "",
    dayOfWeek: ladder.dayOfWeek || "monday",
    startTime: ladder.startTime || "",
    hostPlayerId: ladder.hostPlayerId || "",
    cohostPlayerId: ladder.cohostPlayerId || "",
    reminderHoursBefore: clampNumber(ladder.reminderHoursBefore, 0, 168, 0),
    playerGroupId: ladder.playerGroupId || "",
    participationRequirement: ladder.participationRequirement || 50,
    balanceMode: ladder.balanceMode || "session",
    movementMode: ladder.movementMode || "top1",
    rankingCriteria: normalizeLadderRankingCriteria(ladder.rankingCriteria || ladder.ranking_criteria),
    status: ladder.status || "active",
    initialPositions: ladder.initialPositions || {},
  };
}

function normalizeLadderList(ladders = []) {
  return (Array.isArray(ladders) ? ladders : []).map((ladder) => ({
    id: String(ladder.id || "").trim(),
    name: String(ladder.name || "").trim(),
    format: ladder.format === "ladder" ? "ladder" : "round_robin",
    startDate: normalizeIsoDate(ladder.startDate),
    endDate: normalizeIsoDate(ladder.endDate),
    dayOfWeek: normalizeDayOfWeek(ladder.dayOfWeek) || dayOfWeekForDate(ladder.startDate) || "monday",
    dayOfWeekLabel: LADDER_DAYS.find((day) => day.value === normalizeDayOfWeek(ladder.dayOfWeek))?.label || "",
    startTime: String(ladder.startTime || "").slice(0, 5),
    hostPlayerId: String(ladder.hostPlayerId || "").trim(),
    cohostPlayerId: String(ladder.cohostPlayerId || "").trim(),
    reminderHoursBefore: clampNumber(ladder.reminderHoursBefore, 0, 168, 0),
    playerGroupId: String(ladder.playerGroupId || "").trim(),
    participationRequirement: clampNumber(ladder.participationRequirement, 10, 100, 50),
    balanceMode: ladder.balanceMode === "season" ? "season" : "session",
    movementMode: ladder.movementMode === "top2" ? "top2" : "top1",
    rankingCriteria: normalizeLadderRankingCriteria(ladder.rankingCriteria || ladder.ranking_criteria),
    status: ladder.status === "inactive" ? "inactive" : "active",
    initialPositions: normalizeInitialPositions(ladder.initialPositions || ladder.initial_positions || {}),
  })).filter((ladder) => ladder.id && ladder.name);
}

function ladderSummary(state, ladder) {
  const sessions = (state.sessions || [])
    .filter((session) => String(session.settings?.ladderId || "") === String(ladder.id))
    .sort((a, b) => String(a.session_date || "").localeCompare(String(b.session_date || "")));
  const completedSessions = sessions.filter((session) => session.status === "done");
  const completedSessionIds = new Set(completedSessions.map((session) => String(session.id)));
  const resultRows = (state.allPlayerResults || []).filter((row) => completedSessionIds.has(String(row.session_id || "")));
  const matchRows = (state.allMatches || []).filter((row) => completedSessionIds.has(String(row.session_id || "")));
  const rows = ladderStandingsRows(state, ladder, completedSessions, resultRows, matchRows);
  const sessionById = new Map(completedSessions.map((session) => [String(session.id), session]));
  const historyRows = resultRows
    .filter(resultRowHasScoredMatch)
    .slice()
    .sort((first, second) => {
      const firstSession = sessionById.get(String(first.session_id || ""));
      const secondSession = sessionById.get(String(second.session_id || ""));
      return String(secondSession?.session_date || "").localeCompare(String(firstSession?.session_date || "")) ||
        Number(first.rank || 999) - Number(second.rank || 999) ||
        String(first.display_name || "").localeCompare(String(second.display_name || ""));
    })
    .map((row) => {
      const games = Number(row.games || 0) || Number(row.wins || 0) + Number(row.losses || 0);
      const session = sessionById.get(String(row.session_id || ""));
      const metadata = resultMetadata(row);
      return {
        sessionId: String(row.session_id || ""),
        sessionDate: session?.session_date || row.session_date || "",
        playerId: String(row.player_id || ""),
        displayName: row.display_name || "Player",
        pointsFor: Number(row.points_for || 0),
        winPct: games > 0 ? Number(row.wins || 0) / games : 0,
        games,
        wins: Number(row.wins || 0),
        losses: Number(row.losses || 0),
        previousPosition: positiveNumber(metadata.ladderPreviousPosition ?? metadata.previousPosition),
        newPosition: positiveNumber(metadata.ladderNewPosition ?? metadata.newPosition),
        positionCount: positiveNumber(metadata.ladderPositionCount ?? metadata.positionCount),
      };
    });
  const standingsRows = (completedSessions.length >= 4 ? rows.filter((row) => row.eligible) : rows)
    .slice()
    .sort((first, second) => compareLadderRowsByCriteria(first, second, matchRows, ladder.rankingCriteria));
  return {
    sessions,
    sessionCount: completedSessions.length,
    eligibleCount: rows.filter((row) => row.eligible).length,
    nextDate: sessions.length > 0 ? addDaysToIsoDate(sessions[sessions.length - 1].session_date, 7) : ladder.startDate,
    rows,
    historyRows,
    standingsRows,
  };
}

function ladderStandingsRows(state, ladder, sessions, resultRows, matchRows = []) {
  const sessionCount = sessions.length;
  const sessionById = new Map((sessions || []).map((session) => [String(session.id), session]));
  const rosterIds = playerIdsForGroup(state, ladder.playerGroupId);
  const statsByPlayer = new Map();
  rosterIds.forEach((playerId, index) => {
    const player = (state.players || []).find((item) => String(item.id) === String(playerId));
    statsByPlayer.set(String(playerId), {
      playerId: String(playerId),
      displayName: player?.display_name || "Player",
      seedIndex: index,
      sessionsPlayed: 0,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointDiff: 0,
      previousPosition: null,
      positionCount: null,
      lastPlayedDate: "",
    });
  });

  resultRows.forEach((row) => {
    const playerId = String(row.player_id || "");
    if (!statsByPlayer.has(playerId)) return;
    if (!resultRowHasScoredMatch(row)) return;
    const stats = statsByPlayer.get(playerId);
    const sessionDate = sessionById.get(String(row.session_id || ""))?.session_date || "";
    const metadata = resultMetadata(row);
    stats.sessionsPlayed += 1;
    stats.matchesPlayed += Number(row.games || 0);
    stats.wins += Number(row.wins || 0);
    stats.losses += Number(row.losses || 0);
    stats.pointsFor += Number(row.points_for || 0);
    stats.pointDiff += Number(row.point_diff || 0);
    if (sessionDate && (!stats.lastPlayedDate || String(sessionDate) >= String(stats.lastPlayedDate))) {
      stats.lastPlayedDate = sessionDate;
      stats.previousPosition = positiveNumber(metadata.ladderPreviousPosition ?? metadata.previousPosition);
      stats.positionCount = positiveNumber(metadata.ladderPositionCount ?? metadata.positionCount);
    }
  });

  const order = ladderPositionOrder(rosterIds, sessions, resultRows, ladder, matchRows);
  const positionByPlayer = new Map(order.map((playerId, index) => [String(playerId), index + 1]));
  return [...statsByPlayer.values()]
    .map((row) => {
      const games = row.wins + row.losses || row.matchesPlayed;
      const participationPct = sessionCount > 0 ? (row.sessionsPlayed / sessionCount) * 100 : 0;
      return {
        ...row,
        position: positionByPlayer.get(String(row.playerId)) || row.seedIndex + 1,
        positionCount: row.positionCount || rosterIds.length,
        winPct: games > 0 ? row.wins / games : 0,
        avgPointDiff: games > 0 ? row.pointDiff / games : 0,
        eligible: sessionCount < 4 || participationPct >= Number(ladder.participationRequirement || 50),
      };
    })
    .sort((a, b) => a.position - b.position);
}

function ladderPositionOrder(rosterIds, sessions, resultRows, ladder, matchRows = []) {
  const initialPositions = normalizeInitialPositions(ladder.initialPositions || {}, rosterIds);
  const order = rosterIds
    .map(String)
    .sort((first, second) => {
      const firstPosition = Number(initialPositions[first] || Number.MAX_SAFE_INTEGER);
      const secondPosition = Number(initialPositions[second] || Number.MAX_SAFE_INTEGER);
      return firstPosition - secondPosition || first.localeCompare(second);
    });
  const resultsBySession = resultRows.reduce((map, row) => {
    const key = String(row.session_id || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
  const matchesBySession = matchRows.reduce((map, row) => {
    const key = String(row.session_id || "");
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
    return map;
  }, new Map());
  const movementCount = ladder.movementMode === "top2" ? 2 : 1;
  sessions.forEach((session) => {
    const sessionMatches = matchesBySession.get(String(session.id)) || [];
    const sessionResults = resultsBySession.get(String(session.id)) || [];
    const sessionPlayerIds = playerIdsFromMatches(sessionMatches);
    const participatingOrder = order.filter((playerId) => sessionPlayerIds.has(String(playerId)));
    const courts = splitLadderIdsIntoCourts(participatingOrder);

    courts.forEach((courtIds, courtIndex) => {
      const rows = courtIds
        .map((playerId) => sessionResults.find((row) => String(row.player_id || "") === String(playerId)))
        .filter(Boolean)
        .sort((first, second) => compareLadderRowsByCriteria(first, second, sessionMatches, ladder.rankingCriteria));
      const topIds = courtIndex > 0 ? rows.slice(0, movementCount).map((row) => String(row.player_id || "")) : [];
      const bottomIds = courtIndex < courts.length - 1 ? rows.slice(-movementCount).map((row) => String(row.player_id || "")) : [];
      topIds.forEach((playerId) => movePlayerByStep(order, playerId, -Math.max(4, courts[courtIndex - 1]?.length || 4)));
      bottomIds.reverse().forEach((playerId) => movePlayerByStep(order, playerId, Math.max(4, courts[courtIndex + 1]?.length || 4)));
    });
    if (sessions.length >= 4) {
      const completedSessionIds = sessions.filter((item) => String(item.session_date || "") <= String(session.session_date || "")).map((item) => String(item.id));
      order.forEach((playerId) => {
        const playedCount = completedSessionIds.filter((sessionId) => (
          resultsBySession.get(sessionId) || []
        ).some((row) => String(row.player_id || "") === String(playerId) && resultRowHasScoredMatch(row))).length;
        const participationPct = completedSessionIds.length > 0 ? (playedCount / completedSessionIds.length) * 100 : 100;
        if (participationPct < Number(ladder.participationRequirement || 50)) movePlayerByStep(order, playerId, 1);
      });
    }
  });
  return order;
}

function splitLadderIdsIntoCourts(playerIds = []) {
  return splitLadderPlayersIntoCourts(playerIds.map((id) => ({ id }))).map((court) => court.map((player) => String(player.id)));
}

function splitLadderPlayersIntoCourts(players = []) {
  const total = players.length;
  const courtCount = Math.max(1, Math.floor(total / 4));
  const baseSize = Math.floor(total / courtCount);
  const extra = total % courtCount;
  const courts = [];
  let offset = 0;
  for (let courtIndex = 0; courtIndex < courtCount; courtIndex += 1) {
    const size = baseSize + (courtIndex < extra ? 1 : 0);
    courts.push(players.slice(offset, offset + size));
    offset += size;
  }
  return courts.filter((court) => court.length >= 4);
}

function movePlayerByStep(order, playerId, step) {
  const index = order.findIndex((id) => String(id) === String(playerId));
  if (index < 0) return;
  const nextIndex = Math.max(0, Math.min(order.length - 1, index + step));
  if (nextIndex === index) return;
  const [item] = order.splice(index, 1);
  order.splice(nextIndex, 0, item);
}

function playerIdsForGroup(state, groupId) {
  const ids = new Set((state.playerGroupMembers || [])
    .filter((row) => String(row.player_group_id || "") === String(groupId))
    .map((row) => String(row.player_id || "")));
  return activePlayers(state.players || [])
    .filter((player) => ids.has(String(player.id)))
    .sort((a, b) => compareNamesByFirstName(a.display_name, b.display_name))
    .map((player) => String(player.id));
}

function normalizeIsoDate(value) {
  const clean = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : "";
}

function normalizeDayOfWeek(value) {
  const clean = String(value || "").trim().toLowerCase();
  return LADDER_DAYS.some((day) => day.value === clean) ? clean : "";
}

function dayOfWeekForDate(value) {
  const date = new Date(`${String(value || "").slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return LADDER_DAYS[date.getDay()]?.value || "";
}

function addDaysToIsoDate(value, days) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeRoundRobinScoreType(value) {
  return String(value || "").trim().toLowerCase() === "rally" ? "rally" : "standard";
}

function normalizeRoundRobinScoring(settings = {}) {
  const source = settings?.scoring && typeof settings.scoring === "object" ? settings.scoring : settings;
  return {
    pointsToWin: Math.round(clampNumber(source.pointsToWin ?? source.points_to_win, 1, 99, DEFAULT_ROUND_ROBIN_SCORING.pointsToWin)),
    winBy: Math.round(clampNumber(source.winBy ?? source.win_by, 1, 20, DEFAULT_ROUND_ROBIN_SCORING.winBy)),
    scoreType: normalizeRoundRobinScoreType(source.scoreType ?? source.score_type),
  };
}

function roundRobinScoringLabel(settings = {}) {
  const scoring = normalizeRoundRobinScoring(settings);
  const scoreTypeLabel = scoring.scoreType === "rally" ? "Rally" : "Standard";
  return `${scoreTypeLabel} to ${scoring.pointsToWin}, win by ${scoring.winBy}`;
}

function validateRoundRobinMatchScore(team1Score, team2Score, settings = {}) {
  if (team1Score === "" || team1Score === null || team1Score === undefined || team2Score === "" || team2Score === null || team2Score === undefined) return "";
  const score1 = Number(team1Score);
  const score2 = Number(team2Score);
  if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) return "Scores must be whole numbers.";
  if (score1 === score2) return "Scores cannot be tied.";

  const scoring = normalizeRoundRobinScoring(settings);
  const highScore = Math.max(score1, score2);
  const lowScore = Math.min(score1, score2);
  if (highScore < scoring.pointsToWin) return `Score must be ${roundRobinScoringLabel(scoring)}. The winning score must be at least ${scoring.pointsToWin}.`;
  if (scoring.winBy <= 1 && highScore !== scoring.pointsToWin) return `Score must be ${roundRobinScoringLabel(scoring)}. The winning score must be exactly ${scoring.pointsToWin}.`;
  if (highScore - lowScore < scoring.winBy) return `Score must be ${roundRobinScoringLabel(scoring)}. The winner must win by at least ${scoring.winBy}.`;
  return "";
}

function normalizeInitialPositions(positions = {}, rosterIds = []) {
  const source = positions && typeof positions === "object" ? positions : {};
  const rosterSet = new Set((rosterIds || []).map(String));
  const entries = Object.entries(source)
    .map(([playerId, position]) => [String(playerId), Number(position)])
    .filter(([playerId, position]) => (
      Number.isInteger(position) &&
      position > 0 &&
      (rosterSet.size === 0 || rosterSet.has(playerId))
    ))
    .sort((first, second) => first[1] - second[1] || first[0].localeCompare(second[0]));
  const normalized = {};
  const used = new Set();
  entries.forEach(([playerId, position]) => {
    if (used.has(position)) return;
    normalized[playerId] = position;
    used.add(position);
  });
  let nextPosition = 1;
  (rosterIds || []).map(String).forEach((playerId) => {
    if (normalized[playerId]) return;
    while (used.has(nextPosition)) nextPosition += 1;
    normalized[playerId] = nextPosition;
    used.add(nextPosition);
  });
  return normalized;
}

function positionsFromRows(rows = []) {
  return rows.reduce((positions, row, index) => ({
    ...positions,
    [row.playerId]: Number(row.position || index + 1),
  }), {});
}

function orderedRowsFromDraft(rows = [], positions = {}) {
  return rows
    .slice()
    .sort((first, second) => {
      const firstPosition = Number(positions[first.playerId] || first.position || first.seedIndex + 1);
      const secondPosition = Number(positions[second.playerId] || second.position || second.seedIndex + 1);
      return firstPosition - secondPosition || String(first.displayName || "").localeCompare(String(second.displayName || ""));
    })
    .map((row, index) => ({ ...row, position: index + 1 }));
}

function positionForPlayer(rows = [], playerId) {
  const index = rows.findIndex((row) => String(row.playerId) === String(playerId));
  return index >= 0 ? index + 1 : 1;
}

function movePlayerToPosition(rows = [], playerId, nextPosition) {
  const orderedRows = orderedRowsFromDraft(rows, positionsFromRows(rows));
  const currentIndex = orderedRows.findIndex((row) => String(row.playerId) === String(playerId));
  if (currentIndex < 0) return orderedRows;
  const boundedPosition = Math.min(orderedRows.length, Math.max(1, Number(nextPosition) || 1));
  const nextRows = orderedRows.slice();
  const [movedRow] = nextRows.splice(currentIndex, 1);
  nextRows.splice(boundedPosition - 1, 0, movedRow);
  return nextRows.map((row, index) => ({ ...row, position: index + 1 }));
}

function ladderPositionDraftError(positions = {}, playerCount = 0) {
  const values = Object.values(positions).map(Number);
  if (values.length !== playerCount) return "Every player needs a position.";
  if (values.some((position) => !Number.isInteger(position) || position < 1 || position > playerCount)) {
    return `Positions must be from 1 to ${playerCount}.`;
  }
  if (new Set(values).size !== values.length) return "Positions cannot use the same number twice.";
  return "";
}

function newSessionForm(state) {
  const scoring = normalizeRoundRobinScoring(state.group.settings?.defaultScoring);
  return {
    sessionName: `${state.group.name} Match`,
    mode: "daily_round_robin",
    location: state.group.settings?.defaultLocation || "",
    sessionDate: new Date().toISOString().slice(0, 10),
    startsAt: timeInputValue(state.group.schedule_time),
    maxPlayers: 8,
    repeatsWeekly: false,
    hostPlayerId: defaultHostPlayerId(state) || activePlayers(state.players)[0]?.id || "",
    cohostPlayerId: "",
    invitedGroupIds: [],
    smsEnabled: state.group.settings?.smsSendingEnabled === true,
    reminderHoursBefore: 0,
    pointsToWin: scoring.pointsToWin,
    winBy: scoring.winBy,
    scoreType: scoring.scoreType,
  };
}

function defaultHostPlayerId(state) {
  const savedHostId = String(state?.group?.settings?.defaultHostPlayerId || "").trim();
  if (!savedHostId) return "";
  return activePlayers(state?.players || []).some((player) => String(player.id) === savedHostId) ? savedHostId : "";
}

function sessionFormFromSession(state, session) {
  const scoring = normalizeRoundRobinScoring(session.settings?.scoring);
  return {
    sessionName: session.session_name || `${state.group.name} Match`,
    mode: session.mode === "ladder" ? "ladder" : "daily_round_robin",
    location: session.location || "",
    sessionDate: session.session_date || new Date().toISOString().slice(0, 10),
    startsAt: timeInputValue(session.starts_at),
    maxPlayers: Number(session.max_players || 8),
    repeatsWeekly: Boolean(session.repeats_weekly),
    hostPlayerId: session.host_player_id || "",
    cohostPlayerId: session.cohost_player_id || "",
    invitedGroupIds: Array.isArray(session.invited_group_ids) ? session.invited_group_ids : [],
    smsEnabled: false,
    reminderHoursBefore: clampNumber(session.settings?.reminderHoursBefore, 0, 168, 0),
    pointsToWin: scoring.pointsToWin,
    winBy: scoring.winBy,
    scoreType: scoring.scoreType,
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

function sessionCourtRows(session, defaultCourts, count, currentCourts = []) {
  const desiredCount = Math.max(1, Number(count || session?.court_count || 1));
  const existingCourts = Array.isArray(session?.settings?.sessionCourts) ? session.settings.sessionCourts : [];
  const currentRows = Array.isArray(currentCourts) ? currentCourts : [];
  const sourceCourts = currentRows.length > 0 ? currentRows : existingCourts.length > 0 ? existingCourts : activeCourts(defaultCourts);

  return Array.from({ length: desiredCount }, (_, index) => ({
    name: sourceCourts[index]?.name || `Court ${index + 1}`,
    description: sourceCourts[index]?.description || "",
  }));
}

function normalizeSmsTemplates(templates = {}) {
  return {
    newPlayer: templates.newPlayer || DEFAULT_SMS_TEMPLATES.newPlayer,
    ladderAdded: templates.ladderAdded || DEFAULT_SMS_TEMPLATES.ladderAdded,
    sessionInvite: templates.sessionInvite || DEFAULT_SMS_TEMPLATES.sessionInvite,
    sessionReminder: templates.sessionReminder || DEFAULT_SMS_TEMPLATES.sessionReminder,
    gameUpdate: templates.gameUpdate || DEFAULT_SMS_TEMPLATES.gameUpdate,
    weatherUpdate: templates.weatherUpdate || DEFAULT_SMS_TEMPLATES.weatherUpdate,
    sessionResults: templates.sessionResults || DEFAULT_SMS_TEMPLATES.sessionResults,
  };
}

function renderClientSmsTemplate(template, group, session, sessionPlayers = []) {
  const date = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US") : "the next match";
  const time = session?.starts_at ? formatTime(session.starts_at) : "TBD";
  const location = session?.location || "";
  const joinedCount = sessionPlayers.length > 0
    ? sessionPlayers.filter((player) => player.response_status === "joined").length
    : Number(session?.joinedCount || session?.joined_count || 0);
  const maxPlayers = Number(session?.maxPlayers || session?.max_players || 0);
  const availableSpots = maxPlayers > 0 ? Math.max(0, maxPlayers - joinedCount) : "";
  const replacements = {
    group_name: group?.name || "Round Robin",
    session_name: session?.session_name || `${group?.name || "Round Robin"} Match`,
    date,
    time,
    location,
    location_line: location ? ` at ${location}` : "",
    public_link: playerRoundRobinUrl(group),
    player_name: "Player",
    ladder_name: session?.settings?.ladderName || session?.settings?.ladderConfig?.name || "Ladder",
    joined_count: joinedCount,
    available_spots: availableSpots,
    result_rankings: "Rankings will be inserted when the match is finished.",
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
    session.session_name || "Match",
    session.status ? `(${sessionStatusLabel(session.status)})` : "",
  ].filter(Boolean).join(" - ");
}

function publicRoundRobinUrl(group) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return roundRobinPublicUrl(group, origin);
}

function playerRoundRobinUrl(group) {
  return `${publicRoundRobinUrl(group)}/player`;
}

function exportSessionDuprCsv(state, session) {
  const defaultEventName = session.session_name || `${state.group?.name || "PBCC"} Match`;
  const eventName = window.prompt("DUPR event name", defaultEventName);
  if (eventName === null) return null;

  const cleanEventName = String(eventName || "").trim() || defaultEventName;
  const rows = duprRowsForSession(state, session, cleanEventName);
  if (rows.length === 0) {
    window.alert("No completed PBCC games with scores were found for this match.");
    return null;
  }

  const csv = [DUPR_EXPORT_HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  downloadCsv(csv, `${slugify(defaultEventName)}-dupr-export.csv`);
  return { eventName: cleanEventName, rowCount: rows.length };
}

function duprRowsForSession(state, session, eventName) {
  const scoreType = duprScoreTypeForSession(session);
  return sessionMatchesForSession(state, session.id)
    .filter((match) => match.status === "complete" && matchHasSavedScore(match))
    .map((match) => {
      const team1 = duprTeamPlayers(match.team1_players);
      const team2 = duprTeamPlayers(match.team2_players);

      return [
        "D",
        scoreType,
        eventName,
        csvDate(session.session_date || match.updated_at || match.created_at),
        duprPlayerName(team1[0]),
        duprPlayerId(state, match, team1[0]),
        duprPlayerName(team1[1]),
        duprPlayerId(state, match, team1[1]),
        duprPlayerName(team2[0]),
        duprPlayerId(state, match, team2[0]),
        duprPlayerName(team2[1]),
        duprPlayerId(state, match, team2[1]),
        match.team1_score ?? "",
        match.team2_score ?? "",
        "", "", "", "", "", "", "", "",
      ];
    });
}

function duprScoreTypeForSession(session) {
  return normalizeRoundRobinScoring(session?.settings?.scoring).scoreType === "rally" ? "RALLY" : "SIDEOUT";
}

function duprTeamPlayers(players = []) {
  return Array.from({ length: 2 }, (_, index) => players[index] || null);
}

function duprPlayerName(player) {
  if (!player) return "";
  return player.displayName || player.display_name || player.name || "";
}

function duprPlayerId(state, match, player) {
  if (!player) return "";
  const playerId = String(player.id || player.player_id || "").trim();
  const savedPlayer = (state.players || []).find((row) => String(row.id || "") === playerId);
  const sessionPlayer = allPlayersForSession(state, match.session_id)
    .find((row) => String(row.player_id || "") === playerId);
  return normalizeDuprId(player.duprId || player.dupr_id || savedPlayer?.dupr_id || sessionPlayer?.dupr_id);
}

function normalizeDuprId(value) {
  return String(value || "").trim().toUpperCase();
}

function groupMatchesByRound(matches) {
  const byRound = {};
  matches.forEach((match) => {
    byRound[match.round_number] ||= { roundNumber: match.round_number, matches: [] };
    byRound[match.round_number].matches.push(match);
  });
  return Object.values(byRound).sort((a, b) => a.roundNumber - b.roundNumber);
}

function roundByePlayers(round) {
  return (round?.matches || []).flatMap((match) => match.bye_players || []);
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
    duprId: "",
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

function playerStatsMatchTypeAvailability(state, playerId) {
  const sessionById = new Map((state.sessions || []).map((session) => [String(session.id || ""), session]));
  const availability = { regular: false, ladder: false };

  (state.allPlayerResults || [])
    .filter((row) => String(row.player_id || "") === String(playerId))
    .forEach((row) => {
      const session = sessionById.get(String(row.session_id || ""));
      if (isLadderSession(session)) availability.ladder = true;
      else availability.regular = true;
    });

  const playerGroupIds = new Set((state.playerGroupMembers || [])
    .filter((row) => String(row.player_id || "") === String(playerId))
    .map((row) => String(row.player_group_id || "")));

  if (playerGroupIds.size > 0) {
    (state.sessions || []).forEach((session) => {
      const sessionGroupIds = playerGroupIdsForSession(session);
      if (!sessionGroupIds.some((groupId) => playerGroupIds.has(String(groupId)))) return;
      if (isLadderSession(session)) availability.ladder = true;
      else availability.regular = true;
    });
  }

  return availability;
}

function playerGroupIdsForSession(session) {
  const settings = session?.settings || {};
  return [
    ...(Array.isArray(session?.invited_group_ids) ? session.invited_group_ids : []),
    ...(Array.isArray(settings.createdFromGroups) ? settings.createdFromGroups : []),
    settings.playerGroupId,
    settings.ladderConfig?.playerGroupId,
  ].filter(Boolean).map(String);
}

function historyPlayerOptionsForRows(rows = []) {
  const byPlayer = new Map();
  rows.forEach((row) => {
    const playerId = String(row.playerId || "");
    if (!playerId || byPlayer.has(playerId)) return;
    byPlayer.set(playerId, {
      playerId,
      displayName: row.displayName || "Player",
    });
  });
  return [...byPlayer.values()].sort((first, second) => compareNamesByFirstName(first.displayName, second.displayName));
}

function playerLadderRankLabels(state, playerId) {
  const ladders = normalizeLadderList(state.group?.settings?.ladders || []);
  return ladders
    .map((ladder) => {
      const summary = ladderSummary(state, ladder);
      const row = summary.rows.find((item) => String(item.playerId || "") === String(playerId));
      if (!row) return "";
      const rank = formatLadderRank(row.position, row.positionCount || summary.rows.length);
      if (rank === "-") return "";
      return summary.rows.length > 0 && ladders.length > 1
        ? `${ladder.name}: Rank ${rank}`
        : `Rank ${rank}`;
    })
    .filter(Boolean);
}

function previousLadderRankForResult(state, row) {
  const session = (state.sessions || []).find((item) => String(item.id || "") === String(row.session_id || ""));
  return formatLadderRank(
    ladderPreviousPositionForResult(state, session, row),
    ladderPositionCountForResult(state, session, row)
  );
}

function playerResultsForRange(state, playerId, range, matchType = "all") {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const sessionById = new Map((state.sessions || []).map((session) => [String(session.id || ""), session]));
  const rows = (state.allPlayerResults || [])
    .filter((row) => String(row.player_id || "") === String(playerId))
    .filter(resultRowHasScoredMatch)
    .filter((row) => {
      if (matchType === "all") return true;
      const session = sessionById.get(String(row.session_id || ""));
      const ladder = isLadderSession(session);
      return matchType === "ladder" ? ladder : !ladder;
    })
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

function lastPlayedDate(rows = []) {
  return rows
    .map((row) => row.session_date)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0] || "";
}

function noticeForAction(action, result) {
  if (action === "createSession") return `Generated ${result.session?.round_count || 0} rounds.`;
  if (action === "createPlannedSession") return result.sms?.skipped ? "Match opened. Invite texts were not sent." : `Match opened. Texts sent: ${result.sms?.sent || 0}.`;
  if (action === "updatePlannedSession") {
    if (result.sms?.skipped) return `Match saved. Added ${result.addedPlayers || 0} newly invited player${Number(result.addedPlayers || 0) === 1 ? "" : "s"}.`;
    return `Match saved. Update texts sent: ${result.sms?.sent || 0}.`;
  }
  if (action === "savePlayerGroup") return "Group saved.";
  if (action === "deletePlayerGroup") return "Group deleted.";
  if (action === "saveSmsSettings") return "SMS settings saved.";
  if (action === "saveLadder") {
    if (result.ladderTextSent) {
      if (result.sms?.skipped) return `Ladder saved. Ladder Added texts were not sent: ${result.sms.reason || "SMS unavailable"}.`;
      return `Ladder saved. Ladder Added texts sent: ${result.sms?.sent || 0}.`;
    }
    return "Ladder saved.";
  }
  if (action === "deleteLadder") return `Ladder deleted.${Number(result.sessionsDeleted || 0) > 0 ? ` Removed ${result.sessionsDeleted} unplayed match date${Number(result.sessionsDeleted || 0) === 1 ? "" : "s"}.` : ""}`;
  if (action === "saveLadderPositions") return "Ladder positions saved.";
  if (action === "recalculateLadderRankings") return `Ladder rankings recalculated for ${result.sessionsRecalculated || 0} completed match${Number(result.sessionsRecalculated || 0) === 1 ? "" : "es"}.`;
  if (action === "createLadderMatch") return `Ladder match created for ${formatDate(result.sessionDate)}.`;
  if (action === "updateSessionPlayerStatus") return "Player status updated.";
  if (action === "addSessionPlayer") return "Player added and joined.";
  if (action === "startSession") return "Match started.";
  if (action === "startSessionAndGenerateFirstGame") return `Match started. Round ${result.roundNumber || 1} generated.`;
  if (action === "deleteSession") return "Match deleted from active matches.";
  if (action === "generateNextGame") return `Round ${result.roundNumber || ""} generated.`;
  if (action === "updateMatchScore") return "Score saved.";
  if (action === "updateMatchLineup") return "Lineup updated.";
  if (action === "markSessionDuprExported") return `DUPR Export marked complete for ${result.rowCount || 0} row${Number(result.rowCount || 0) === 1 ? "" : "s"}.`;
  if (action === "completeSession") {
    return `Match completed. Review stats, then tap OK to text results.${weeklyRepeatNotice(result.weeklyRepeat)}`;
  }
  if (action === "sendSessionResultsText") {
    if (result.sms?.skipped) return `Result text logged for ${result.recipients || 0} player${Number(result.recipients || 0) === 1 ? "" : "s"}. SMS is off.`;
    return `Result texts sent: ${result.sms?.sent || 0}.`;
  }
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
  if (action === "savePlayer") {
    if (result.newPlayerTextSent) {
      if (result.sms?.skipped) return `Player saved. New Player text was not sent: ${result.sms.reason || "SMS unavailable"}.`;
      return `Player saved. New Player text sent: ${result.sms?.sent || 0}.`;
    }
    return "Player saved.";
  }
  if (action === "deletePlayer") return "Player deleted from Saved Players.";
  if (action === "saveCourts") return "Courts saved.";
  if (action === "saveSettings") return "Settings saved.";
  if (action === "addSessionNewPlayer") {
    if (result.sms?.skipped) return `Player added to this match and saved to PBCC Players. New Player text was not sent: ${result.sms.reason || "SMS unavailable"}.`;
    return `Player added to this match and saved to PBCC Players. New Player texts sent: ${result.sms?.sent || 0}.`;
  }
  if (action === "masterResetRoundRobin") return `Master Reset complete. Deleted ${result.sessionsDeleted || 0} regular/ladder match${Number(result.sessionsDeleted || 0) === 1 ? "" : "es"} and all related play history.`;
  return "Saved.";
}

function weeklyRepeatNotice(weeklyRepeat) {
  if (weeklyRepeat?.created) {
    return ` Next weekly match opened for ${formatDate(weeklyRepeat.sessionDate)}.`;
  }
  if (weeklyRepeat?.requested && weeklyRepeat?.skipped) {
    return ` Weekly repeat was not created: ${weeklyRepeat.reason || "unknown reason"}.`;
  }
  return "";
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
  const digits = normalizePhone(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("1")) return digits.slice(-10);
  return digits;
}

function timeInputValue(value) {
  return String(value || "").slice(0, 5);
}

function csvDate(value) {
  return String(value || "").slice(0, 10);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
}

function downloadCsv(csv, fileName) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return String(value || "pbcc-session")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "pbcc-session";
}
