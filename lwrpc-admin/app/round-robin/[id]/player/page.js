"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { APP_VERSION, COPYRIGHT_YEAR } from "../../../lib/version";
import { publicRoundRobinUrl as roundRobinPublicUrl, roundRobinPath } from "../../../lib/roundRobins";
import { DEFAULT_SYSTEM_SETTINGS, mergeSystemSettings } from "../../../lib/systemSettings";

const PLAYER_RECORD_RANGES = [
  { id: "currentMonth", label: "Current Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "currentYear", label: "Current Year" },
  { id: "all", label: "All" },
];
const DEFAULT_HOST_SMS_TEMPLATES = {
  gameUpdate: "{{group_name}} game update: ",
};
const MODAL_HEADER_CHROME = "border-b border-teal-200/60 bg-[linear-gradient(135deg,#0f766e,#2563eb)] text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.18)]";
const MODAL_EYEBROW_CHROME = "text-xs font-black uppercase tracking-wide text-cyan-100";
const MODAL_SUPPORTING_TEXT = "mt-1 text-sm font-semibold text-blue-50/90";

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
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedHistorySession, setSelectedHistorySession] = useState(null);
  const [selectedPlayersSession, setSelectedPlayersSession] = useState(null);
  const [hostEditingSession, setHostEditingSession] = useState(null);
  const [hostSessionForm, setHostSessionForm] = useState(null);
  const [hostPlayersStatus, setHostPlayersStatus] = useState("joined");
  const [hostGameUpdateSession, setHostGameUpdateSession] = useState(null);
  const [hostGameUpdateMessage, setHostGameUpdateMessage] = useState("");
  const [playerRecordRange, setPlayerRecordRange] = useState("all");
  const [showPartnerComparison, setShowPartnerComparison] = useState(false);
  const [matchView, setMatchView] = useState("regular");
  const [selectedLadderRanking, setSelectedLadderRanking] = useState(null);
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const regularUpcomingSessions = useMemo(
    () => (state?.sessions || []).filter((session) => !isLadderSession(session)),
    [state?.sessions]
  );
  const ladderUpcomingSessions = useMemo(
    () => (state?.sessions || []).filter((session) => isLadderSession(session)),
    [state?.sessions]
  );
  const regularHistorySessions = useMemo(
    () => (state?.history?.sessions || []).filter((session) => !isLadderSession(session)),
    [state?.history?.sessions]
  );
  const ladderHistorySessions = useMemo(
    () => (state?.history?.sessions || []).filter((session) => isLadderSession(session)),
    [state?.history?.sessions]
  );
  const hasRegularMatches = regularUpcomingSessions.length > 0 || regularHistorySessions.length > 0;
  const hasLadderMatches = ladderUpcomingSessions.length > 0 || ladderHistorySessions.length > 0 || (state?.ladders || []).some((ladder) => Number(ladder.stats?.sessionsPlayed || 0) > 0);
  const visibleUpcomingSessions = useMemo(
    () => {
      const sessions = hasRegularMatches && hasLadderMatches
        ? (matchView === "ladder" ? ladderUpcomingSessions : regularUpcomingSessions)
        : hasLadderMatches ? ladderUpcomingSessions : regularUpcomingSessions;
      return filterSessionsForSearch(sessions, sessionSearch);
    },
    [regularUpcomingSessions, ladderUpcomingSessions, sessionSearch, hasRegularMatches, hasLadderMatches, matchView]
  );
  const visiblePastSessions = useMemo(
    () => {
      const sessions = hasRegularMatches && hasLadderMatches
        ? (matchView === "ladder" ? ladderHistorySessions : regularHistorySessions)
        : hasLadderMatches ? ladderHistorySessions : regularHistorySessions;
      return filterSessionsForSearch(sessions, sessionSearch);
    },
    [regularHistorySessions, ladderHistorySessions, sessionSearch, hasRegularMatches, hasLadderMatches, matchView]
  );
  const trimmedSessionSearch = sessionSearch.trim();
  const loginPhoneIsComplete = normalizePhone(phone).length === 10;

  useEffect(() => {
    const savedPhone = window.localStorage.getItem(storageKey) || "";
    if (savedPhone) {
      setPhone(formatPhoneInput(savedPhone));
      loadPlayer(savedPhone, { quiet: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    async function loadSystemSettings() {
      try {
        const response = await fetch("/api/system-settings");
        const result = await response.json().catch(() => ({}));
        if (result.settings) setSystemSettings(mergeSystemSettings(result.settings));
      } catch {
        setSystemSettings(DEFAULT_SYSTEM_SETTINGS);
      }
    }

    loadSystemSettings();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 12000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!hasLadderMatches && matchView !== "regular") setMatchView("regular");
    if (!hasRegularMatches && hasLadderMatches && matchView !== "ladder") setMatchView("ladder");
  }, [hasRegularMatches, hasLadderMatches, matchView]);

  useEffect(() => {
    if (!hasLadderMatches && playerRecordRange === "ladders") setPlayerRecordRange("all");
    if (!hasRegularMatches && hasLadderMatches && playerRecordRange !== "ladders") setPlayerRecordRange("ladders");
  }, [hasRegularMatches, hasLadderMatches, playerRecordRange]);

  function selectPlayerRecordRange(nextRange) {
    if (nextRange === "ladders" && !hasLadderMatches) return;
    if (nextRange !== "ladders" && !hasRegularMatches) return;
    setPlayerRecordRange(nextRange);
    if (nextRange === "ladders") {
      setMatchView("ladder");
    } else {
      setMatchView("regular");
    }
  }

  function selectMatchView(nextView) {
    if (nextView === "ladder" && !hasLadderMatches) return;
    if (nextView !== "ladder" && !hasRegularMatches) return;
    setMatchView(nextView);
    if (nextView === "ladder") {
      setPlayerRecordRange("ladders");
    } else if (playerRecordRange === "ladders") {
      setPlayerRecordRange("all");
    }
  }

  useEffect(() => {
    if (!state) return;
    setSelectedPlayersSession((current) => current ? (state.sessions || []).find((session) => String(session.id) === String(current.id)) || current : current);
    setHostEditingSession((current) => current ? (state.sessions || []).find((session) => String(session.id) === String(current.id)) || current : current);
  }, [state]);

  async function loadPlayer(nextPhone = phone, options = {}) {
    const cleanPhone = String(nextPhone || "").trim();
    if (!cleanPhone) {
      setError("Enter your phone number.");
      return null;
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
      setError(result.error || "Unable to find your Round Robin matches.");
      return null;
    }

    if (savePhone) window.localStorage.setItem(storageKey, cleanPhone);
    setPhone(formatPhoneInput(cleanPhone));
    setState(result);
    return result;
  }

  async function openLadderRanking(ladder) {
    if (ladderRankingRows(ladder).length > 0) {
      setSelectedLadderRanking(ladder);
      return;
    }

    const refreshed = await loadPlayer(phone, { quiet: true });
    const refreshedLadder = (refreshed?.ladders || []).find((item) => String(item.id || "") === String(ladder?.id || ""));
    setSelectedLadderRanking(refreshedLadder || ladder);
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
    setSelectedPlayersSession(null);
    setHostEditingSession(null);
    setHostSessionForm(null);
    setHostPlayersStatus("joined");
    setHostGameUpdateSession(null);
    setHostGameUpdateMessage("");
    setShowPartnerComparison(false);
  }

  async function runHostAction(action, payload = {}, loadingKey = action) {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Enter the full phone number saved for you by the host.");
      return null;
    }

    const sessionId = payload.sessionId || payload.hostSessionId;
    setActionLoading(loadingKey);
    setError("");
    setNotice("");

    const response = await fetch("/api/round-robin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        action,
        groupId: id,
        publicUrl: playerRoundRobinUrl(state?.group),
        hostPhone: cleanPhone,
        hostSessionId: sessionId,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setActionLoading("");

    if (!response.ok || !result.success) {
      setError(result.error || "Unable to save this host change.");
      return null;
    }

    await loadPlayer(cleanPhone, { quiet: true });
    setNotice(hostNoticeForAction(action, result));
    return result;
  }

  function openHostEditSession(session) {
    setHostEditingSession(session);
    setHostSessionForm(hostSessionFormFromSession(session));
  }

  function closeHostEditSession() {
    setHostEditingSession(null);
    setHostSessionForm(null);
  }

  function toggleHostInvitedGroup(groupId) {
    setHostSessionForm((current) => ({
      ...current,
      invitedGroupIds: current.invitedGroupIds.includes(groupId)
        ? current.invitedGroupIds.filter((id) => id !== groupId)
        : [...current.invitedGroupIds, groupId],
    }));
  }

  async function saveHostSession() {
    if (!hostEditingSession || !hostSessionForm) return;
    const saved = await runHostAction("updatePlannedSession", {
      ...hostSessionForm,
      sessionId: hostEditingSession.id,
      mode: state?.group?.mode,
      publicUrl: playerRoundRobinUrl(state?.group),
    }, "updatePlannedSession");
    if (saved) closeHostEditSession();
  }

  function updateHostSessionPlayerStatus(session, player, status) {
    return runHostAction("updateSessionPlayerStatus", {
      sessionId: session.id,
      playerId: player.playerId,
      status,
    }, "updateSessionPlayerStatus");
  }

  function addHostSessionNewPlayer(session, player) {
    return runHostAction("addSessionNewPlayer", {
      sessionId: session.id,
      displayName: player.displayName,
      phone: player.phone,
    }, "addSessionNewPlayer");
  }

  function openHostGameUpdate(session) {
    const templates = normalizeHostSmsTemplates(state?.smsTemplates || {});
    setHostGameUpdateSession(session);
    setHostGameUpdateMessage(renderHostSmsTemplate(templates.gameUpdate, state?.group, session, session.sessionPlayers || []));
  }

  function closeHostGameUpdate() {
    setHostGameUpdateSession(null);
    setHostGameUpdateMessage("");
  }

  async function sendHostGameUpdate() {
    if (!hostGameUpdateSession || !hostGameUpdateMessage.trim()) return;
    const sent = await runHostAction("sendBroadcastText", {
      sessionId: hostGameUpdateSession.id,
      message: hostGameUpdateMessage,
      smsEnabled: true,
      recipientScope: "joined",
    }, "sendBroadcastText");
    if (sent) closeHostGameUpdate();
  }

  function openHostSession(session) {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Enter the full phone number saved for you by the host.");
      return;
    }

    window.sessionStorage.setItem(`lwrpc-round-robin-host-phone-${groupKey}`, cleanPhone);
    window.sessionStorage.setItem(`lwrpc-round-robin-host-session-${groupKey}`, session.id);
    window.location.href = `${roundRobinPath(groupKey, "admin")}?hostSessionId=${encodeURIComponent(session.id)}`;
  }

  function openManagerSystem() {
    window.sessionStorage.removeItem(`lwrpc-round-robin-host-phone-${groupKey}`);
    window.sessionStorage.removeItem(`lwrpc-round-robin-host-session-${groupKey}`);
    window.sessionStorage.removeItem(`lwrpc-round-robin-code-${groupKey}`);
    window.location.href = `${roundRobinPath(groupKey, "admin")}?manager=1`;
  }

  async function finishHostSession(session) {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Enter the full phone number saved for you by the host.");
      return;
    }
    if (!window.confirm(`Finish ${session.session_name || "this match"}? This will close scoring and text results if SMS is enabled.`)) return;

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
        publicUrl: playerRoundRobinUrl(state?.group),
      }),
    });
    const result = await response.json().catch(() => ({}));
    setActionLoading("");

    if (!response.ok || !result.success) {
      setError(result.error || "Unable to finish this match.");
      return;
    }

    await loadPlayer(cleanPhone, { quiet: true });
    setShowHistory(false);
    setSessionSearch("");
    const finishNotice = result.sms?.skipped ? "Match finished. Result text was logged only." : `Match finished. Result texts sent: ${result.sms?.sent || 0}.`;
    setNotice(`${finishNotice}${weeklyRepeatNotice(result.weeklyRepeat)}`);
  }

  const groupKey = state?.group?.slug || id;
  const resolvedSystemSettings = state?.systemSettings || systemSettings;
  const clubName = resolvedSystemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;
  const logoUrl = resolvedSystemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubWebsite = resolvedSystemSettings.club_website || DEFAULT_SYSTEM_SETTINGS.club_website;

  if (!state) {
    return (
      <main className="full-screen-main flex min-h-[100dvh] flex-col justify-between bg-slate-100 px-4 py-3 text-slate-950 sm:p-6">
        <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-8">
            <div className="text-center">
              <a
                href={clubWebsite}
                target="_blank"
                rel="noreferrer"
                title={`Open ${clubName} website`}
                className="inline-flex rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <Image
                  src={logoUrl}
                  alt={clubName}
                  width={112}
                  height={112}
                  className="mx-auto h-16 w-16 rounded-full bg-white object-contain sm:h-24 sm:w-24"
                  unoptimized
                />
              </a>
              <h1 className="mt-3 max-w-full break-words text-[2rem] font-black leading-tight text-slate-950 sm:mt-4 sm:text-4xl">
                PBCourtCommand
              </h1>
              <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-teal-600" />
              <div className="mx-auto mt-3 max-w-xs text-sm font-black uppercase leading-snug tracking-wide text-blue-700 sm:max-w-sm sm:text-base">
                {clubName}
              </div>
            </div>

            {(error || notice) && (
              <div className={`mt-5 rounded-xl px-4 py-3 text-sm font-bold ${
                error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
              }`}>
                <FeedbackMessage message={error || notice} />
              </div>
            )}

            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (!loginPhoneIsComplete) return;
                loadPlayer();
              }}
            >
              <label className="block text-sm font-semibold text-slate-700">
                Phone number
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                  autoComplete="tel"
                  suppressHydrationWarning
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-black text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
                  placeholder="941-555-1212"
                />
              </label>

              <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={savePhone} onChange={(event) => setSavePhone(event.target.checked)} suppressHydrationWarning className="h-5 w-5 rounded border-slate-300 text-teal-700" />
                Save on this device
              </label>

              <button
                type="submit"
                disabled={loading || !loginPhoneIsComplete}
                suppressHydrationWarning
                className="mt-6 w-full rounded-xl bg-teal-700 px-4 py-3 font-black text-white shadow-sm transition hover:bg-teal-800 disabled:bg-slate-300"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <button
              type="button"
              onClick={openManagerSystem}
              suppressHydrationWarning
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-slate-950"
            >
              Admin Setup
            </button>
          </div>
        </div>
        </div>
        <footer className="pt-3 text-center text-xs font-semibold leading-relaxed text-slate-500">
          <div>{"\u00A9"} {COPYRIGHT_YEAR} {clubName}</div>
          <div>Version {APP_VERSION}</div>
        </footer>
      </main>
    );
  }

  return (
    <main className="full-screen-main min-h-screen bg-[linear-gradient(135deg,#e8f7f1_0%,#f7fbff_48%,#fff7e8_100%)] p-2 text-slate-950 sm:p-6">
      <div className="w-full">
        <header className="overflow-hidden rounded-lg border border-teal-900/10 bg-slate-950 text-white shadow-[0_28px_80px_-44px_rgba(15,23,42,0.95)]">
          <div className="h-2 bg-[linear-gradient(90deg,#14b8a6,#38bdf8,#f59e0b)]" />
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wide text-teal-200">{clubName}</div>
              <h1 className="break-words text-3xl font-black sm:text-4xl">PBCourtCommand</h1>
            </div>
            <div className="hidden gap-2 sm:flex sm:flex-wrap">
              {state && (
                <button type="button" onClick={clearSavedPhone} className="rounded-lg border border-teal-200/60 bg-teal-500 px-4 py-2 text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(20,184,166,0.9)] ring-1 ring-white/20 transition hover:-translate-y-0.5 hover:bg-teal-400 hover:shadow-lg">
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </header>

        {(error || notice) && (
          <div className={`mt-4 rounded-lg px-4 py-3 text-sm font-bold ${
            error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
          }`}>
            <FeedbackMessage message={error || notice} />
          </div>
        )}

        {state && (
          <section className="mt-5 space-y-4">
            <PlayerHistorySummary
              history={state.history}
              player={state.player}
              range={playerRecordRange}
              setRange={selectPlayerRecordRange}
              ladders={state.ladders || []}
              hasRegularMatches={hasRegularMatches}
              hasLadderMatches={hasLadderMatches}
              onPartnerComparison={() => setShowPartnerComparison(true)}
              onLadderRanking={openLadderRanking}
            />

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <h2 className="text-2xl font-black text-slate-950">{showHistory ? "All Matches" : "Upcoming Matches"}</h2>
                <label className="mt-2 block text-sm font-bold text-slate-600">
                  Search Matches
                  <input
                    type="search"
                    value={sessionSearch}
                    onChange={(event) => setSessionSearch(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 shadow-inner outline-none ring-teal-400/30 focus:ring-4"
                    placeholder={showHistory ? "Search all matches..." : "Search upcoming matches..."}
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                {hasRegularMatches && hasLadderMatches && (
                  <div className="inline-grid grid-cols-2 gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1 text-xs font-black">
                    <button type="button" onClick={() => selectMatchView("regular")} className={`rounded-md px-3 py-2 ${matchView === "regular" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white"}`}>
                      Regular Matches
                    </button>
                    <button type="button" onClick={() => selectMatchView("ladder")} className={`rounded-md px-3 py-2 ${matchView === "ladder" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:bg-white"}`}>
                      Ladder Matches
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowHistory((current) => !current)}
                  className="rounded-lg border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  {showHistory ? "Hide Past Matches" : `Past Matches (${state.history?.sessions?.length || 0})`}
                </button>
              </div>
            </div>

            {showHistory && (
              <PastSessions
                history={state.history}
                sessions={visiblePastSessions}
                searchTerm={trimmedSessionSearch}
                onSelect={setSelectedHistorySession}
              />
            )}

            {visibleUpcomingSessions.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/90 p-8 text-center font-semibold text-slate-500 shadow-sm">
                {trimmedSessionSearch
                  ? "No upcoming matches match that search."
                  : "No upcoming invited matches are open for this phone number."}
              </div>
            )}

            {visibleUpcomingSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                actionLoading={actionLoading}
                updateStatus={updateStatus}
                onHostSession={openHostSession}
                onFinishSession={finishHostSession}
                onEditSession={openHostEditSession}
                onGameUpdate={openHostGameUpdate}
                onPlayers={setSelectedPlayersSession}
              />
            ))}
          </section>
        )}

        {selectedHistorySession && (
          <HistorySessionModal
            session={selectedHistorySession}
            player={state?.player}
            onClose={() => setSelectedHistorySession(null)}
          />
        )}

        {selectedPlayersSession && (
          selectedPlayersSession.canManageSession ? (
            <HostSessionPlayersModal
              state={state}
              session={selectedPlayersSession}
              status={hostPlayersStatus}
              setStatus={setHostPlayersStatus}
              actionLoading={actionLoading}
              onUpdateStatus={updateHostSessionPlayerStatus}
              onAddNewPlayer={addHostSessionNewPlayer}
              onClose={() => setSelectedPlayersSession(null)}
            />
          ) : (
            <SessionPlayersViewModal
              session={selectedPlayersSession}
              onClose={() => setSelectedPlayersSession(null)}
            />
          )
        )}

        {hostEditingSession && hostSessionForm && (
          <HostSessionFormModal
            state={state}
            session={hostEditingSession}
            form={hostSessionForm}
            setForm={setHostSessionForm}
            toggleInvitedGroup={toggleHostInvitedGroup}
            saveSession={saveHostSession}
            actionLoading={actionLoading}
            onClose={closeHostEditSession}
          />
        )}

        {hostGameUpdateSession && (
          <HostGameUpdateModal
            session={hostGameUpdateSession}
            message={hostGameUpdateMessage}
            setMessage={setHostGameUpdateMessage}
            actionLoading={actionLoading}
            onSend={sendHostGameUpdate}
            onClose={closeHostGameUpdate}
          />
        )}

        {showPartnerComparison && (
          <PartnerComparisonModal
            history={state?.history}
            player={state?.player}
            range={playerRecordRange}
            onClose={() => setShowPartnerComparison(false)}
          />
        )}

        {selectedLadderRanking && (
          <LadderRankingModal
            ladder={selectedLadderRanking}
            player={state?.player}
            onClose={() => setSelectedLadderRanking(null)}
          />
        )}
      </div>
    </main>
  );
}

function PlayerHistorySummary({ history, player, range, setRange, ladders = [], hasRegularMatches = true, hasLadderMatches = false, onPartnerComparison, onLadderRanking }) {
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const showingLadders = hasLadderMatches && range === "ladders";
  const regularSessions = (history?.sessions || []).filter((session) => !isLadderSession(session));
  const filteredSessions = filterHistorySessions(regularSessions, range);
  const stats = showingLadders ? aggregateLadderStats(ladders) : aggregateHistorySessions(filteredSessions);
  const ladderRankings = showingLadders ? ladderRankingItems(ladders) : [];

  return (
    <section className="overflow-hidden rounded-lg border border-teal-700 bg-[linear-gradient(135deg,#0f766e_0%,#1d4ed8_72%,#f59e0b_130%)] text-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.95)]">
      <div className="h-2 bg-white/35" />
      <div className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-teal-900 shadow-[0_14px_26px_-18px_rgba(15,23,42,0.95)] ring-4 ring-white/30">
              {playerInitials(player?.displayName)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black uppercase tracking-wide text-cyan-100">Player Record</div>
              <h2 className="mt-0.5 break-words text-2xl font-black leading-tight text-white sm:text-3xl">
                {player?.displayName || "Player"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileExpanded((current) => !current)}
            className="rounded-lg border border-white/40 bg-white px-4 py-2 text-sm font-black text-teal-900 shadow-sm transition hover:bg-cyan-50 md:hidden"
            aria-expanded={mobileExpanded}
          >
            {mobileExpanded ? "Hide Details" : "Show Details"}
          </button>
          {!showingLadders && hasRegularMatches && (
            <button
              type="button"
              onClick={onPartnerComparison}
              className={`${mobileExpanded ? "block" : "hidden"} rounded-lg border border-white/40 bg-white px-4 py-2 text-sm font-black text-teal-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-50 md:block`}
            >
              Partner Comparison
            </button>
          )}
        </div>
        <div className={mobileExpanded ? "block" : "hidden md:block"}>
          <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-start">
            {hasRegularMatches && (
            <div className="rounded-lg border border-white/25 bg-white/10 p-2">
              <div className="mb-2 text-xs font-black uppercase tracking-wide text-cyan-100">Regular Matches</div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {PLAYER_RECORD_RANGES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRange(item.id)}
                    className={`rounded-lg px-3 py-2 text-xs font-black shadow-sm ${range === item.id ? "bg-white text-teal-950" : "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            )}
            {hasLadderMatches && (
              <div className="rounded-lg border border-violet-200/50 bg-violet-500/20 p-2">
                <div className="mb-2 text-xs font-black uppercase tracking-wide text-violet-100">Ladders</div>
                <button
                  type="button"
                  onClick={() => setRange("ladders")}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-black shadow-sm sm:w-auto ${showingLadders ? "bg-white text-violet-900" : "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"}`}
                >
                  Ladders
                </button>
              </div>
            )}
          </div>
          {showingLadders && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-xs font-black text-white">
              <span className="uppercase tracking-wide text-violet-100">Ranking</span>
              {ladderRankings.length > 0 ? ladderRankings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onLadderRanking?.(item.ladder)}
                  className="rounded-md bg-white px-2 py-1 text-left text-violet-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {item.label}
                </button>
              )) : (
                <span className="rounded-md bg-white/15 px-2 py-1 text-white ring-1 ring-white/25">-</span>
              )}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
            <StatTile label="Dates Played" value={stats.sessionsScored} />
            <StatTile label="Last played" value={stats.lastPlayedDate ? formatDate(stats.lastPlayedDate) : "-"} />
            <StatTile label="Record" value={`${stats.wins || 0}-${stats.losses || 0}`} />
            <StatTile label="Win %" value={formatPercent(stats.winPct)} />
            <StatTile label="Point Diff" value={formatSignedNumber(stats.pointDiff || 0)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedbackMessage({ message }) {
  const text = String(message || "");
  const brand = "PBCourtCommand";
  const brandIndex = text.indexOf(brand);
  if (brandIndex === -1) return text;

  return (
    <>
      {text.slice(0, brandIndex)}
      <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-black text-slate-950 shadow-sm ring-1 ring-current/10">
        {brand}
      </span>
      {text.slice(brandIndex + brand.length)}
    </>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-teal-100 bg-white px-3 py-3 shadow-sm">
      <div className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function playerInitials(name) {
  const parts = String(name || "P").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "P";
}

function formatLadderPosition(ladder) {
  if (!ladder?.position) return "-";
  return ladder.positionCount ? `#${ladder.position} out of ${ladder.positionCount}` : `#${ladder.position}`;
}

function ladderRankingRows(ladder) {
  const sourceRows = [
    ...(Array.isArray(ladder?.rankings) ? ladder.rankings : []),
    ...(Array.isArray(ladder?.rankingRows) ? ladder.rankingRows : []),
    ...(Array.isArray(ladder?.standings) ? ladder.standings : []),
    ...(Array.isArray(ladder?.rows) ? ladder.rows : []),
  ];
  const byPlayer = new Map();
  sourceRows.forEach((row, index) => {
    const normalized = normalizeLadderRankingRow(row, index);
    if (!normalized.playerId && !normalized.displayName) return;
    byPlayer.set(normalized.playerId || normalized.displayName, normalized);
  });
  return [...byPlayer.values()].sort((first, second) => Number(first.position || 9999) - Number(second.position || 9999) || String(first.displayName || "").localeCompare(String(second.displayName || "")));
}

function normalizeLadderRankingRow(row = {}, index = 0) {
  const wins = Number(row.wins || 0);
  const losses = Number(row.losses || 0);
  const games = Number(row.matchesPlayed ?? row.games ?? (wins + losses));
  const pointDiff = Number(row.pointDiff ?? row.point_diff ?? 0);
  return {
    playerId: String(row.playerId || row.player_id || row.id || ""),
    displayName: row.displayName || row.display_name || row.name || "Player",
    position: positiveNumber(row.position || row.rank) || index + 1,
    sessionsPlayed: Number(row.sessionsPlayed ?? row.datesPlayed ?? row.sessions_scored ?? 0),
    matchesPlayed: games,
    wins,
    losses,
    pointsFor: Number(row.pointsFor ?? row.points_for ?? 0),
    pointDiff,
    winPct: Number(row.winPct ?? row.win_pct ?? (games > 0 ? wins / games : 0)),
    avgPointDiff: Number(row.avgPointDiff ?? row.avg_point_diff ?? (games > 0 ? pointDiff / games : 0)),
    eligible: row.eligible !== false,
  };
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

function positiveNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function ladderPreviousPositionForResult(row) {
  const metadata = resultMetadata(row);
  return positiveNumber(metadata.ladderPreviousPosition ?? metadata.previousPosition);
}

function ladderPositionCountForResult(row, session = null) {
  const metadata = resultMetadata(row);
  return positiveNumber(metadata.ladderPositionCount ?? metadata.positionCount ?? session?.settings?.ladderPositionCount);
}

function formatLadderRank(position, count) {
  const safePosition = positiveNumber(position);
  if (!safePosition) return "-";
  const safeCount = positiveNumber(count);
  return safeCount ? `#${safePosition} out of ${safeCount}` : `#${safePosition}`;
}

function PastSessions({ history, sessions = null, searchTerm = "", onSelect }) {
  const sessionRows = sessions || history?.sessions || [];
  const hasSearch = Boolean(String(searchTerm || "").trim());

  return (
    <section className="rounded-lg border border-white/80 bg-white/95 p-4 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.8)]">
      <h2 className="text-xl font-black text-slate-950">Past Matches</h2>
      <p className="mt-1 text-sm font-bold text-blue-700">Click on a Match to see the Match Game Details.</p>
      <div className="mt-3 space-y-2">
        {sessionRows.map((session) => {
          const isLadder = isLadderSession(session);
          return (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session)}
            className={`grid w-full grid-cols-1 gap-3 rounded-lg border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${isLadder ? "border-violet-200 bg-violet-50 hover:border-violet-400" : "border-slate-200 bg-slate-50 hover:border-teal-400"}`}
          >
            <span className="min-w-0">
              <span className="block text-lg font-black text-slate-950">{formatSessionHeadlineWithYear(session)}{isLadder ? " - Ladder" : ""}</span>
              <span className="mt-1 block text-sm font-bold text-slate-600">{session.session_name || "Round Robin Match"}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">{session.location || "Location pending"}</span>
            </span>
            <span className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-black text-teal-900 sm:text-right">
              {pastSessionResultLabel(session.playerResult)}
            </span>
          </button>
          );
        })}
        {sessionRows.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm font-bold text-slate-500">
            {hasSearch ? "No past matches match that search." : "No completed past matches are saved yet."}
          </div>
        )}
      </div>
    </section>
  );
}

function LadderRankingModal({ ladder, player, onClose }) {
  const rows = ladderRankingRows(ladder);
  const playerId = String(player?.id || "");

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <div className={`flex shrink-0 flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Ladder Rankings</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">{ladder?.name || "Ladder"}</h2>
            <div className={MODAL_SUPPORTING_TEXT}>
              Current ranking {ladder?.position ? formatLadderPosition(ladder) : ""}
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">Current Rankings</div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[48rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2 text-right">Dates Played</th>
                    <th className="px-3 py-2 text-right">Games</th>
                    <th className="px-3 py-2 text-right">Record</th>
                    <th className="px-3 py-2 text-right">Win %</th>
                    <th className="px-3 py-2 text-right">Avg Diff</th>
                    <th className="px-3 py-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const highlighted = String(row.playerId || "") === playerId;
                    return (
                      <tr key={row.playerId} className={highlighted ? "border-y-2 border-violet-500 bg-violet-50 ring-2 ring-inset ring-violet-200" : "bg-white"}>
                        <td className="px-3 py-2 font-black text-slate-950">#{row.position || "-"}</td>
                        <td className="px-3 py-2 font-black text-slate-950">{row.displayName || "Player"}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-700">{row.sessionsPlayed || 0}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-700">{row.matchesPlayed || 0}</td>
                        <td className="px-3 py-2 text-right font-black text-slate-950">{row.wins || 0}-{row.losses || 0}</td>
                        <td className="px-3 py-2 text-right font-black text-violet-800">{formatPercent(row.winPct || 0)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-700">{formatSignedDecimalNumber(row.avgPointDiff || 0)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-700">{row.pointsFor || 0}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm font-bold text-slate-500" colSpan={8}>No ladder rankings are available yet. Refresh the player screen and try again.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 gap-2 bg-white p-3 md:hidden">
              {rows.map((row) => (
                <LadderRankingMobileCard key={row.playerId} row={row} highlighted={String(row.playerId || "") === playerId} />
              ))}
              {rows.length === 0 && (
                <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No ladder rankings are available yet. Refresh the player screen and try again.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LadderRankingMobileCard({ row, highlighted }) {
  return (
    <div className={`rounded-lg border p-3 shadow-sm ${highlighted ? "border-2 border-violet-500 bg-violet-50 ring-2 ring-violet-200" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Rank #{row.position || "-"}</div>
          <div className="mt-1 break-words text-base font-black text-slate-950">{row.displayName || "Player"}</div>
        </div>
        <div className="rounded-md bg-white px-2 py-1 text-sm font-black text-violet-800 shadow-sm">
          {formatPercent(row.winPct || 0)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <MobileStandingStat label="Dates" value={row.sessionsPlayed || 0} />
        <MobileStandingStat label="Games" value={row.matchesPlayed || 0} />
        <MobileStandingStat label="Record" value={`${row.wins || 0}-${row.losses || 0}`} />
        <MobileStandingStat label="Avg Diff" value={formatSignedDecimalNumber(row.avgPointDiff || 0)} />
      </div>
    </div>
  );
}

function SessionCard({ session, actionLoading, updateStatus, onHostSession, onFinishSession, onEditSession, onGameUpdate, onPlayers }) {
  const status = session.playerStatus || "invited";
  const maxPlayers = Number(session.maxPlayers || session.max_players || 0);
  const joinLoading = actionLoading === `${session.id}-joined`;
  const declineLoading = actionLoading === `${session.id}-declined`;
  const finishLoading = actionLoading === `${session.id}-finish`;
  const gameUpdateLoading = actionLoading === "sendBroadcastText";
  const joinLabel = session.isFull && status !== "joined" ? "Join Waitlist" : "Join";
  const availableSpots = maxPlayers ? Math.max(0, maxPlayers - Number(session.joinedCount || 0)) : null;
  const isPlaying = session.status === "playing";
  const canRespond = session.hasPlayerResponse !== false && !isPlaying;
  const canStartSession = isPlaying || Number(session.joinedCount || 0) >= 4;
  const showSetupButtons = !(session.canManageSession && isPlaying);
  const isLadder = isLadderSession(session);

  return (
    <article className={`overflow-hidden rounded-lg border shadow-[0_22px_60px_-42px_rgba(15,23,42,0.8)] ${isLadder ? "border-violet-200 bg-violet-50/95" : "border-white/80 bg-white/95"}`}>
      <div className={`h-2 ${isLadder ? "bg-[linear-gradient(90deg,#7c3aed,#a855f7,#f59e0b)]" : "bg-[linear-gradient(90deg,#0f766e,#2563eb,#f59e0b)]"}`} />
      <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h3 className="w-full text-xl font-black text-slate-950 sm:w-auto sm:text-3xl">
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
            {isLadder && (
              <span className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-black uppercase tracking-wide text-white shadow-sm">
                Ladder
              </span>
            )}
          </div>
          <div className="mt-2 break-words text-lg font-black text-slate-800 sm:text-xl">
            {session.session_name || "Round Robin Match"}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-600">
            {session.location || "Location pending"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm font-black">
            <button
              type="button"
              onClick={() => onPlayers(session)}
              className="rounded-lg bg-teal-50 px-3 py-2 text-left text-teal-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              {availableSpots === null
                ? `${session.joinedCount} joined`
                : `${session.joinedCount} joined / ${availableSpots} player spot${availableSpots === 1 ? "" : "s"} available`}
            </button>
            {session.waitlistCount > 0 && (
              <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">{session.waitlistCount} waitlist</span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {showSetupButtons && (
            <button
              type="button"
              onClick={() => onPlayers(session)}
              className="rounded-lg border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-black text-blue-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-500 hover:bg-blue-100"
            >
              Players
            </button>
          )}
          {session.canManageSession && !isPlaying && (
            <button
              type="button"
              onClick={() => onEditSession(session)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-black text-amber-900 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500 hover:bg-amber-100"
            >
              Edit
            </button>
          )}
          {session.canManageSession && !isPlaying && (
            <button
              type="button"
              onClick={() => onGameUpdate(session)}
              disabled={gameUpdateLoading}
              className="rounded-lg border border-teal-300 bg-teal-50 px-5 py-3 text-sm font-black text-teal-900 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-500 hover:bg-teal-100 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
            >
              Send Game Update Text
            </button>
          )}
          {session.canManageSession && (
            <button
              type="button"
              onClick={() => onHostSession(session)}
              disabled={!canStartSession}
              className="rounded-lg border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:border-slate-300 disabled:bg-slate-300 disabled:hover:translate-y-0"
            >
              {isPlaying ? "Resume Match" : "Start Match"}
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
              {finishLoading ? "Finishing..." : "Finish Match"}
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
              className="rounded-lg border border-red-800 bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700 disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-400"
            >
              {declineLoading ? "Saving..." : "Decline"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SessionPlayersViewModal({ session, onClose }) {
  const groups = [
    { id: "joined", label: "Joined", tone: "teal" },
    { id: "waitlist", label: "Waitlist", tone: "amber" },
    { id: "invited", label: "Invited", tone: "blue" },
    { id: "declined", label: "Declined", tone: "red" },
  ];
  const players = session.sessionPlayers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-2 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:max-h-[90vh]">
        <div className={`flex flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Match Players</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">{formatSessionHeadlineWithYear(session)}</h2>
            <div className={MODAL_SUPPORTING_TEXT}>{session.session_name || "Round Robin Match"}</div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            Close
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <SessionPlayerStatusGroup
                key={group.id}
                label={group.label}
                tone={group.tone}
                players={sessionPlayersForStatusView(players, group.id)}
              />
            ))}
          </div>
          {players.length === 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm font-bold text-slate-500">
              No players are listed for this match yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HostSessionPlayersModal({ session, status, setStatus, actionLoading, onUpdateStatus, onAddNewPlayer, onClose }) {
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");
  const statuses = ["joined", "declined", "waitlist", "invited"];
  const players = sessionPlayersForStatusView(session.sessionPlayers || [], status);
  const statusActionLoading = actionLoading === "updateSessionPlayerStatus";
  const addPlayerLoading = actionLoading === "addSessionNewPlayer";
  const canAddPlayer = !isLadderSession(session);

  async function addNewPlayer() {
    if (!newPlayerName.trim() || normalizePhone(newPlayerPhone).length < 10) return;
    const added = await onAddNewPlayer(session, {
      displayName: newPlayerName,
      phone: newPlayerPhone,
    });
    if (added) {
      setNewPlayerName("");
      setNewPlayerPhone("");
      setShowAddPlayer(false);
      setStatus("joined");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <div className={`shrink-0 p-4 ${MODAL_HEADER_CHROME}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className={MODAL_EYEBROW_CHROME}>Match Players</div>
              <h2 className="break-words text-xl font-black sm:text-2xl">{session.session_name || "Match"}</h2>
              <div className={MODAL_SUPPORTING_TEXT}>
                {formatSessionHeadline(session)}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
              Close
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {statuses.map((item) => (
              <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-lg border px-3 py-2 text-sm font-black capitalize shadow-sm ${
                status === item ? "border-white bg-white text-slate-950" : "border-white/35 bg-white/10 text-white hover:bg-white/20"
              }`}>
                {item} ({sessionPlayersForStatusView(session.sessionPlayers || [], item).length})
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">

          {canAddPlayer && (
          <div className="mt-4">
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
                  <ModalTextInput
                    label="Player name"
                    value={newPlayerName}
                    onChange={setNewPlayerName}
                    required
                  />
                  <ModalTextInput
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

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            {players.map((player) => (
              <div key={player.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="font-black text-slate-950">{player.displayName}</div>
                  {sessionPlayerLadderPositionText(player) && (
                    <div className="mt-0.5 text-xs font-black text-violet-700">
                      Current Position {sessionPlayerLadderPositionText(player)}
                    </div>
                  )}
                  <div className="mt-1 hidden text-xs font-semibold text-slate-500 sm:block">
                    {[player.email, player.phone].filter(Boolean).join(" / ") || "No contact saved"}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {player.responseStatus !== "joined" && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(session, player, "joined")}
                      disabled={statusActionLoading}
                      className="rounded-lg border border-teal-700 bg-teal-50 px-3 py-2 text-xs font-black text-teal-900 shadow-sm hover:bg-teal-100 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      Join
                    </button>
                  )}
                  {player.responseStatus !== "declined" && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(session, player, "declined")}
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

function HostSessionFormModal({ state, session, form, setForm, toggleInvitedGroup, saveSession, actionLoading, onClose }) {
  const saving = actionLoading === "updatePlannedSession";
  const smsAvailable = state?.group?.settings?.smsSendingEnabled === true;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:h-auto sm:max-h-[92vh] sm:rounded-lg">
        <div className={`flex shrink-0 flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Match Setup</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">Edit Match</h2>
            <div className={MODAL_SUPPORTING_TEXT}>{session.session_name || "Round Robin Match"}</div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <ModalTextInput label="Match name" value={form.sessionName} onChange={(value) => setForm((current) => ({ ...current, sessionName: value }))} required />
            <ModalTextInput label="Location" value={form.location} onChange={(value) => setForm((current) => ({ ...current, location: value }))} />
            <ModalTextInput label="Date" type="date" value={form.sessionDate} onChange={(value) => setForm((current) => ({ ...current, sessionDate: value }))} required />
            <ModalTextInput label="Start time" type="time" value={form.startsAt} onChange={(value) => setForm((current) => ({ ...current, startsAt: value }))} />
            <ModalTextInput label="Max players" type="number" value={form.maxPlayers} onChange={(value) => setForm((current) => ({ ...current, maxPlayers: Number(value) }))} />
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input type="checkbox" checked={form.repeatsWeekly} onChange={(event) => setForm((current) => ({ ...current, repeatsWeekly: event.target.checked }))} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
              Repeats weekly
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Host
              <select value={form.hostPlayerId} onChange={(event) => setForm((current) => ({ ...current, hostPlayerId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                <option value="">Select host</option>
                {activeHostPlayers(state?.players || []).map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Co-host
              <select value={form.cohostPlayerId} onChange={(event) => setForm((current) => ({ ...current, cohostPlayerId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold">
                <option value="">No co-host</option>
                {activeHostPlayers(state?.players || []).map((player) => <option key={player.id} value={player.id}>{player.display_name}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h3 className="text-sm font-black text-slate-700">Invited Groups</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {(state?.playerGroups || []).filter((group) => group.is_active !== false).map((group) => (
                <label key={group.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold">
                  <input type="checkbox" checked={form.invitedGroupIds.includes(group.id)} onChange={() => toggleInvitedGroup(group.id)} className="h-5 w-5 rounded border-slate-300 text-teal-700" />
                  <span className="min-w-0 flex-1">{group.name}</span>
                  <span className="text-xs text-slate-500">{hostPlayerCountForGroup(state, group.id)}</span>
                </label>
              ))}
              {(state?.playerGroups || []).length === 0 && <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">Create at least one player group first.</div>}
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
            Text all Joined Players when updated
          </label>
          {!smsAvailable && (
            <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              SMS sending is off in Admin Setup.
            </div>
          )}

          <button
            type="button"
            onClick={saveSession}
            disabled={saving || !form.sessionName.trim() || !form.sessionDate || form.invitedGroupIds.length === 0}
            className="mt-4 w-full rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300"
          >
            {saving ? "Saving..." : "Update Match"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HostGameUpdateModal({ session, message, setMessage, actionLoading, onSend, onClose }) {
  const joinedCount = sessionPlayersForStatusView(session.sessionPlayers || [], "joined").length;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <div className={`flex shrink-0 flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Game Update Text</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">{session.session_name || "Round Robin Match"}</h2>
            <div className={MODAL_SUPPORTING_TEXT}>{formatSessionHeadline(session)}</div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-black text-teal-950">
            Sending to {joinedCount} joined player{joinedCount === 1 ? "" : "s"}.
          </div>
          <label className="mt-4 block text-sm font-bold text-slate-600">
            Text message
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={8}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm font-semibold text-slate-950 shadow-inner"
            />
          </label>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={actionLoading === "sendBroadcastText" || !message.trim() || joinedCount === 0}
              className="rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300"
            >
              {actionLoading === "sendBroadcastText" ? "Sending..." : "Send Text"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalTextInput({ label, value, onChange, placeholder = "", type = "text", required = false }) {
  return (
    <label className="block text-sm font-bold text-slate-600">
      {label}{required ? " *" : ""}
      <input type={type} value={value} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-950" />
    </label>
  );
}

function SessionPlayerStatusGroup({ label, tone, players }) {
  const toneClass = {
    teal: "border-teal-200 bg-teal-50 text-teal-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    red: "border-red-200 bg-red-50 text-red-950",
  }[tone] || "border-slate-200 bg-slate-50 text-slate-950";

  return (
    <section className={`rounded-lg border p-3 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-wide">{label}</h3>
        <span className="rounded-md bg-white/80 px-2 py-1 text-xs font-black shadow-sm">{players.length}</span>
      </div>
      <div className="mt-3 space-y-2">
        {players.map((player) => (
          <div key={player.id || player.playerId || player.displayName} className="rounded-md bg-white px-3 py-2 text-sm font-black text-slate-900 shadow-sm">
            <div>{player.displayName || "Player"}</div>
            {sessionPlayerLadderPositionText(player) && (
              <div className="mt-0.5 text-xs font-black text-violet-700">
                Current Position {sessionPlayerLadderPositionText(player)}
              </div>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <div className="rounded-md border border-dashed border-slate-300 bg-white/70 px-3 py-5 text-center text-sm font-bold text-slate-500">
            None
          </div>
        )}
      </div>
    </section>
  );
}

function sessionPlayerLadderPositionText(player) {
  if (!player?.ladderPosition) return "";
  return player.ladderPositionCount ? `#${player.ladderPosition} out of ${player.ladderPositionCount}` : `#${player.ladderPosition}`;
}

function sessionPlayersForStatusView(players, status) {
  return (players || [])
    .filter((player) => String(player.responseStatus || "invited") === status)
    .sort((a, b) => compareNamesByFirstName(a.displayName, b.displayName));
}

function compareNamesByFirstName(firstName, secondName) {
  const first = String(firstName || "").trim();
  const second = String(secondName || "").trim();
  const firstGiven = first.split(/\s+/)[0] || first;
  const secondGiven = second.split(/\s+/)[0] || second;
  return firstGiven.localeCompare(secondGiven, undefined, { sensitivity: "base" })
    || first.localeCompare(second, undefined, { sensitivity: "base" });
}

function activeHostPlayers(players = []) {
  return players.filter((player) => player.is_active !== false);
}

function hostPlayerCountForGroup(state, groupId) {
  const playerIds = new Set(
    (state?.playerGroupMembers || [])
      .filter((row) => String(row.player_group_id) === String(groupId))
      .map((row) => String(row.player_id))
  );
  return activeHostPlayers(state?.players || []).filter((player) => playerIds.has(String(player.id))).length;
}

function hostSessionFormFromSession(session) {
  return {
    sessionName: session.session_name || "Round Robin Match",
    location: session.location || "",
    sessionDate: session.session_date || new Date().toISOString().slice(0, 10),
    startsAt: timeInputValue(session.starts_at),
    maxPlayers: Number(session.max_players || session.maxPlayers || 8),
    repeatsWeekly: Boolean(session.repeats_weekly || session.repeatsWeekly),
    hostPlayerId: session.host_player_id || "",
    cohostPlayerId: session.cohost_player_id || "",
    invitedGroupIds: Array.isArray(session.invited_group_ids) ? session.invited_group_ids : [],
    smsEnabled: false,
  };
}

function hostNoticeForAction(action, result) {
  if (action === "updatePlannedSession") {
    if (result.sms?.skipped) return `Match saved. Added ${result.addedPlayers || 0} newly invited player${Number(result.addedPlayers || 0) === 1 ? "" : "s"}.`;
    return `Match saved. Update texts sent: ${result.sms?.sent || 0}.`;
  }
  if (action === "updateSessionPlayerStatus") return "Player status updated.";
  if (action === "addSessionPlayer") return "Player added and joined.";
  if (action === "addSessionNewPlayer") {
    if (result.sms?.skipped) return `Player added to this match and saved to PBCC Players. New Player text was not sent: ${result.sms.reason || "SMS unavailable"}.`;
    return `Player added to this match and saved to PBCC Players. New Player texts sent: ${result.sms?.sent || 0}.`;
  }
  if (action === "sendBroadcastText") {
    if (result.sms?.skipped) return `Game update text was not sent: ${result.sms.reason || "SMS unavailable"}.`;
    return `Game update text sent: ${result.sms?.sent || 0}.`;
  }
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

function normalizeHostSmsTemplates(templates = {}) {
  return {
    gameUpdate: templates.gameUpdate || DEFAULT_HOST_SMS_TEMPLATES.gameUpdate,
  };
}

function renderHostSmsTemplate(template, group, session, sessionPlayers = []) {
  const date = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US") : "the next match";
  const time = session?.starts_at ? formatTime(session.starts_at) : "TBD";
  const location = session?.location || "";
  const joinedCount = sessionPlayersForStatusView(sessionPlayers, "joined").length;
  const maxPlayers = Number(session?.maxPlayers || session?.max_players || 0);
  const availableSpots = maxPlayers > 0 ? Math.max(0, maxPlayers - joinedCount) : "";
  const replacements = {
    group_name: group?.name || "PBCourtCommand",
    session_name: session?.session_name || "Round Robin Match",
    date,
    time,
    location,
    location_line: location ? ` at ${location}` : "",
    public_link: playerRoundRobinUrl(group),
    joined_count: joinedCount,
    available_spots: availableSpots,
  };

  return String(template || "")
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => replacements[key] ?? "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function publicRoundRobinUrl(group) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return roundRobinPublicUrl(group, origin);
}

function playerRoundRobinUrl(group) {
  return `${publicRoundRobinUrl(group)}/player`;
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

function playerRecordRangeLabel(range) {
  return PLAYER_RECORD_RANGES.find((item) => item.id === range)?.label || "All";
}

function aggregateHistorySessions(sessions) {
  const totals = sessions.reduce((summary, session) => {
    const result = session.playerResult;
    if (!result) return summary;
    const sessionDate = String(session.session_date || "");
    return {
      sessionsScored: summary.sessionsScored + 1,
      games: summary.games + Number(result.games || 0),
      wins: summary.wins + Number(result.wins || 0),
      losses: summary.losses + Number(result.losses || 0),
      pointDiff: summary.pointDiff + Number(result.point_diff || 0),
      lastPlayedDate: sessionDate && sessionDate > summary.lastPlayedDate ? sessionDate : summary.lastPlayedDate,
    };
  }, {
    sessionsScored: 0,
    games: 0,
    wins: 0,
    losses: 0,
    pointDiff: 0,
    lastPlayedDate: "",
  });

  return {
    ...totals,
    winPct: totals.games > 0 ? totals.wins / totals.games : 0,
  };
}

function aggregateLadderStats(ladders = []) {
  const totals = (ladders || []).reduce((summary, ladder) => {
    const stats = ladder.stats || {};
    const lastPlayedDate = String(ladder.lastPlayedDate || "");
    const games = Number(stats.matchesPlayed || 0) || Number(stats.wins || 0) + Number(stats.losses || 0);
    return {
      sessionsScored: summary.sessionsScored + Number(stats.sessionsPlayed || 0),
      games: summary.games + games,
      wins: summary.wins + Number(stats.wins || 0),
      losses: summary.losses + Number(stats.losses || 0),
      pointDiff: summary.pointDiff + Number(stats.pointDiff || 0),
      lastPlayedDate: lastPlayedDate && lastPlayedDate > summary.lastPlayedDate ? lastPlayedDate : summary.lastPlayedDate,
    };
  }, {
    sessionsScored: 0,
    games: 0,
    wins: 0,
    losses: 0,
    pointDiff: 0,
    lastPlayedDate: "",
  });

  const games = totals.wins + totals.losses || totals.games;
  return {
    ...totals,
    winPct: games > 0 ? totals.wins / games : 0,
  };
}

function ladderRankingItems(ladders = []) {
  return (ladders || [])
    .filter((ladder) => ladder.position && ladder.positionCount)
    .map((ladder) => ({
      id: ladder.id,
      label: `${ladder.name}: ${formatLadderPosition(ladder)}`,
      ladder,
    }));
}

function partnerComparisonRows(history, player) {
  const playerId = String(player?.id || "");
  if (!playerId) return [];

  const rows = new Map();

  (history?.sessions || []).forEach((session) => {
    (session.matches || []).forEach((match) => {
      const side = matchSideForPlayer(match, playerId);
      if (!side) return;

      const score = Number(side.score);
      const opponentScore = Number(side.opponentScore);
      const hasScore = !Number.isNaN(score) && !Number.isNaN(opponentScore);

      (side.players || [])
        .filter((partner) => playerIdValue(partner) !== playerId)
        .forEach((partner) => {
          const partnerId = playerIdValue(partner) || playerDisplayName(partner);
          if (!partnerId) return;

          if (!rows.has(partnerId)) {
            rows.set(partnerId, {
              partnerId,
              partnerName: playerDisplayName(partner),
              sessionIds: new Set(),
              wins: 0,
              losses: 0,
              games: 0,
              pointDiff: 0,
            });
          }

          const row = rows.get(partnerId);
          row.sessionIds.add(String(session.id || session.session_date || ""));

          if (hasScore) {
            row.games += 1;
            row.wins += score > opponentScore ? 1 : 0;
            row.losses += score < opponentScore ? 1 : 0;
            row.pointDiff += score - opponentScore;
          }
        });
    });
  });

  return Array.from(rows.values())
    .map((row) => ({
      ...row,
      sessions: row.sessionIds.size,
      winPct: row.games > 0 ? row.wins / row.games : 0,
    }))
    .sort((a, b) => {
      if (b.winPct !== a.winPct) return b.winPct - a.winPct;
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      if ((b.wins - b.losses) !== (a.wins - a.losses)) return (b.wins - b.losses) - (a.wins - a.losses);
      if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      return a.partnerName.localeCompare(b.partnerName);
    });
}

function matchSideForPlayer(match, playerId) {
  const team1Players = match.team1_players || [];
  const team2Players = match.team2_players || [];

  if (team1Players.some((player) => playerIdValue(player) === playerId)) {
    return {
      players: team1Players,
      score: match.team1_score,
      opponentScore: match.team2_score,
    };
  }

  if (team2Players.some((player) => playerIdValue(player) === playerId)) {
    return {
      players: team2Players,
      score: match.team2_score,
      opponentScore: match.team1_score,
    };
  }

  return null;
}

function HistorySessionModal({ session, player, onClose }) {
  const [showMobileStandingsDetail, setShowMobileStandingsDetail] = useState(false);
  const [showLadderHelp, setShowLadderHelp] = useState(false);
  const matches = session.matches || [];
  const isLadder = isLadderSession(session);
  const highlightedPlayerId = String(session.playerResult?.player_id || player?.id || "");
  const playedPlayerIds = playerIdsFromMatches(matches);
  const roundGroups = groupMatchesByRound(matches);
  const standings = (session.standings || []).filter((row) => playedPlayerIds.size === 0 || playedPlayerIds.has(String(row.player_id || "")));
  const standingsColSpan = isLadder ? 8 : 7;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <div className={`flex flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Match Results</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">{formatSessionHeadline(session)}</h2>
            <div className={MODAL_SUPPORTING_TEXT}>{session.session_name || "Round Robin Match"}</div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:max-h-[78vh] sm:flex-none sm:p-4">
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-black text-teal-950">
            Your result: {pastSessionResultLabel(session.playerResult)}
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">
              <span>Match Standings</span>
              <div className="flex items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => setShowMobileStandingsDetail((current) => !current)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-800 shadow-sm md:hidden"
                >
                  {showMobileStandingsDetail ? "Summary" : "Detail"}
                </button>
              </div>
            </div>
            {isLadder && showLadderHelp && (
              <div className="border-t border-slate-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-950">
                <div className="font-black">Ladder movement rules</div>
                <div className="mt-1">
                  {session.settings?.ladderConfig?.movementMode === "top2" ? "Top 2 move up and bottom 2 move down" : "Top 1 moves up and bottom 1 moves down"} on each court after the match. Middle players stay on the same court.
                </div>
                <div className="mt-1">
                  Match-date ranking uses total points scored, then head-to-head if points are tied, then win percentage, average point differential, games played, and player name.
                </div>
                <div className="mt-1">
                  Starting with session 4, players below the participation requirement drop one court for the next ladder date.
                </div>
              </div>
            )}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[740px] table-fixed text-xs sm:text-sm">
                <colgroup>
                  <col className="w-[8%]" />
                  {isLadder && <col className="w-[14%]" />}
                  <col className="w-[26%]" />
                  <col className="w-[12%]" />
                  <col className="w-[11%]" />
                  <col className="w-[14%]" />
                  <col className="w-[8%]" />
                  <col className="w-[7%]" />
                </colgroup>
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Rank</th>
                    {isLadder && <th className="px-2 py-2">Rank Before</th>}
                    <th className="px-2 py-2">Player</th>
                    <th className="px-2 py-2 text-right">Record</th>
                    <th className="px-2 py-2 text-right">Win %</th>
                    <th className="px-2 py-2 text-right">Points</th>
                    <th className="px-2 py-2 text-right">Diff</th>
                    <th className="px-2 py-2 text-right">Byes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {standings.map((row, index) => (
                    <tr key={row.id || `${row.session_id}-${row.player_id}`} className={String(row.player_id || "") === String(session.playerResult?.player_id || "") ? "border-y-2 border-teal-500 bg-teal-50 ring-2 ring-inset ring-teal-300" : "bg-white"}>
                      <td className="px-2 py-2 font-black text-slate-950">#{index + 1}</td>
                      {isLadder && (
                        <td className="px-2 py-2 font-black text-blue-800">{formatLadderRank(ladderPreviousPositionForResult(row), ladderPositionCountForResult(row, session))}</td>
                      )}
                      <td className="truncate px-2 py-2 font-bold text-slate-800" title={row.display_name || "Player"}>{row.display_name}</td>
                      <td className="px-2 py-2 text-right font-black text-slate-950">{row.wins}-{row.losses}</td>
                      <td className="px-2 py-2 text-right font-black text-teal-800">{formatPercent(winPctForStanding(row))}</td>
                      <td className="px-2 py-2 text-right font-bold text-slate-700">{row.points_for}-{row.points_against}</td>
                      <td className="px-2 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.point_diff || 0)}</td>
                      <td className="px-2 py-2 text-right font-bold text-slate-700">{row.byes || 0}</td>
                    </tr>
                  ))}
                  {standings.length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm font-bold text-slate-500" colSpan={standingsColSpan}>No standings have been saved for this match yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 bg-white p-3 md:hidden">
              {standings.map((row, index) => {
                const highlighted = String(row.player_id || "") === String(session.playerResult?.player_id || "");
                return showMobileStandingsDetail ? (
                  <StandingMobileCard
                    key={row.id || `${row.session_id}-${row.player_id}`}
                    row={row}
                    rank={index + 1}
                    highlighted={highlighted}
                    isLadder={isLadder}
                    ladderPositionCount={ladderPositionCountForResult(row, session)}
                  />
                ) : (
                  <StandingMobileSummaryRow
                    key={row.id || `${row.session_id}-${row.player_id}`}
                    row={row}
                    rank={index + 1}
                    highlighted={highlighted}
                    isLadder={isLadder}
                    ladderPositionCount={ladderPositionCountForResult(row, session)}
                  />
                );
              })}
              {standings.length === 0 && (
                <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No standings have been saved for this match yet.</div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-black text-slate-700">Match Game Details</div>
            <div className="mt-3 space-y-3">
              {roundGroups.map((round) => {
                const byes = roundByePlayers(round);
                return (
                  <section key={round.roundNumber} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_38px_-28px_rgba(15,23,42,0.85)] ring-1 ring-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[linear-gradient(90deg,#0f766e,#2563eb)] px-3 py-2 text-white shadow-[inset_0_-1px_0_rgba(255,255,255,0.18)]">
                      <div className="text-base font-black">Round {round.roundNumber}</div>
                      <div className="rounded-md bg-white/15 px-2 py-1 text-xs font-black uppercase tracking-wide text-teal-50">
                        {round.matches.length} game{round.matches.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    {byes.length > 0 && (
                      <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-950">
                        <span className="font-black">Bye:</span>{" "}
                        <PlayerNameList players={byes} highlightedPlayerId={highlightedPlayerId} inline />
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3 p-3">
                      {round.matches.map((match) => (
                        <div key={match.id} className="rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-3 shadow-[0_14px_24px_-20px_rgba(15,23,42,0.95)]">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                              {match.court_name || `Court ${match.court_number || "-"}`}
                            </div>
                            <div className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black uppercase tracking-wide text-slate-500">
                              Final
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-stretch">
                            <GameTeamScorePanel
                              players={match.team1_players}
                              score={match.team1_score}
                              isWinner={isWinningScore(match.team1_score, match.team2_score)}
                              highlightedPlayerId={highlightedPlayerId}
                            />
                            <div className="text-center text-xs font-black uppercase tracking-wide text-slate-400">vs</div>
                            <GameTeamScorePanel
                              players={match.team2_players}
                              score={match.team2_score}
                              isWinner={isWinningScore(match.team2_score, match.team1_score)}
                              highlightedPlayerId={highlightedPlayerId}
                              align="right"
                            />
                          </div>
                        </div>
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
  );
}

function PartnerComparisonModal({ history, player, range, onClose }) {
  const [showMobilePartnerDetail, setShowMobilePartnerDetail] = useState(false);
  const filteredSessions = filterHistorySessions(history?.sessions || [], range);
  const rows = partnerComparisonRows({ ...(history || {}), sessions: filteredSessions }, player);
  const rangeLabel = playerRecordRangeLabel(range);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-4xl flex-col overflow-hidden rounded-none bg-white shadow-[0_28px_80px_-36px_rgba(15,23,42,0.95)] sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
        <div className={`flex shrink-0 flex-col gap-3 p-4 ${MODAL_HEADER_CHROME} sm:flex-row sm:items-start sm:justify-between`}>
          <div className="min-w-0">
            <div className={MODAL_EYEBROW_CHROME}>Player Record</div>
            <h2 className="break-words text-xl font-black sm:text-2xl">Partner Comparison</h2>
            <div className={MODAL_SUPPORTING_TEXT}>{player?.displayName || "Player"}</div>
            <div className="mt-2 inline-flex rounded-md bg-white/15 px-2 py-1 text-xs font-black uppercase tracking-wide text-cyan-50">
              {rangeLabel} - {filteredSessions.length} date{filteredSessions.length === 1 ? "" : "s"} played
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-white/40 bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm hover:bg-slate-100 sm:w-auto">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-sm font-black text-teal-950">
            Partners are sorted by win percentage, then dates played, record, and point diff.
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between gap-3 bg-slate-100 px-3 py-2">
              <div className="text-sm font-black text-slate-700">All Partners</div>
              <button
                type="button"
                onClick={() => setShowMobilePartnerDetail((current) => !current)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-black text-slate-800 shadow-sm md:hidden"
              >
                {showMobilePartnerDetail ? "Summary" : "Detail"}
              </button>
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[44rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Partner</th>
                    <th className="px-3 py-2 text-right">Dates Played</th>
                    <th className="px-3 py-2 text-right">Record</th>
                    <th className="px-3 py-2 text-right">Win %</th>
                    <th className="px-3 py-2 text-right">Point Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.partnerId} className="bg-white">
                      <td className="px-3 py-2 font-black text-slate-950">{row.partnerName}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{row.sessions}</td>
                      <td className="px-3 py-2 text-right font-black text-slate-950">{row.wins}-{row.losses}</td>
                      <td className="px-3 py-2 text-right font-black text-teal-800">{formatPercent(row.winPct)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700">{formatSignedNumber(row.pointDiff)}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm font-bold text-slate-500" colSpan={5}>No partner history is available yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 bg-white p-3 md:hidden">
              {rows.map((row) => (
                showMobilePartnerDetail ? (
                  <PartnerComparisonCard key={row.partnerId} row={row} />
                ) : (
                  <PartnerComparisonSummaryRow key={row.partnerId} row={row} />
                )
              ))}
              {rows.length === 0 && (
                <div className="px-3 py-8 text-center text-sm font-bold text-slate-500">No partner history is available yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerComparisonSummaryRow({ row }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
      <div className="min-w-0 truncate text-sm font-black text-slate-950">{row.partnerName}</div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700 shadow-sm">{row.wins}-{row.losses}</span>
        <span className="rounded-md bg-white px-2 py-1 text-sm font-black text-teal-800 shadow-sm">{formatPercent(row.winPct)}</span>
      </div>
    </div>
  );
}

function PartnerComparisonCard({ row }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Partner</div>
          <div className="mt-1 break-words text-base font-black text-slate-950">{row.partnerName}</div>
        </div>
        <div className="rounded-md bg-white px-2 py-1 text-sm font-black text-teal-800 shadow-sm">
          {formatPercent(row.winPct)}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <MobileStandingStat label="Dates Played" value={row.sessions} />
        <MobileStandingStat label="Record" value={`${row.wins}-${row.losses}`} />
        <MobileStandingStat label="Win %" value={formatPercent(row.winPct)} />
        <MobileStandingStat label="Point Diff" value={formatSignedNumber(row.pointDiff)} />
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
  if (status === "joined") return "You are joined for this match.";
  if (status === "waitlist") return "The match is full, so you were added to the waitlist.";
  if (status === "declined") return "You are marked as declined for this match.";
  return "Your response was saved.";
}

function filterSessionsForSearch(sessions, searchTerm) {
  const query = String(searchTerm || "").trim().toLowerCase();
  if (!query) return sessions || [];

  return (sessions || []).filter((session) => {
    const searchableText = [
      formatSessionHeadline(session),
      session.session_name,
      session.location,
      session.status,
      session.playerStatus,
      session.hostRole,
      session.session_date,
      ...sessionDateSearchValues(session.session_date),
      session.starts_at,
      session.joinedCount,
      session.maxPlayers,
      pastSessionResultLabel(session.playerResult),
    ]
      .filter((value) => value !== null && value !== undefined && String(value).trim())
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });
}

function isLadderSession(session) {
  return Boolean(session?.settings?.ladderId) || session?.mode === "ladder";
}

function sessionDateSearchValues(value) {
  if (!value) return [];
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return [value];

  const monthNumber = Number(month);
  const dayNumber = Number(day);
  if (!monthNumber || !dayNumber) return [value];

  const padded = `${month}/${day}/${year}`;
  const unpadded = `${monthNumber}/${dayNumber}/${year}`;
  const paddedDash = `${month}-${day}-${year}`;
  const unpaddedDash = `${monthNumber}-${dayNumber}-${year}`;
  const date = new Date(`${year}-${month}-${day}T12:00:00`);

  return [
    value,
    `${year}-${month}-${day}`,
    padded,
    unpadded,
    paddedDash,
    unpaddedDash,
    date.toLocaleDateString("en-US"),
    date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }),
    date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
  ];
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

function formatSessionHeadlineWithYear(session) {
  const dateText = session?.session_date ? new Date(`${session.session_date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }) : "Date pending";
  const timeText = session?.starts_at ? formatTime(session.starts_at) : "Time pending";
  return `${dateText} at ${timeText}`;
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

function timeInputValue(value) {
  return String(value || "").slice(0, 5);
}

function pastSessionResultLabel(result) {
  if (!result) return "Match Rank - / Record: 0-0";
  return `Match Rank ${result.rank || "-"} / Record: ${result.wins || 0}-${result.losses || 0}`;
}

function StandingMobileCard({ row, rank, highlighted, isLadder = false, ladderPositionCount = null }) {
  return (
    <div className={`rounded-lg border p-3 shadow-sm ${highlighted ? "border-2 border-teal-500 bg-teal-50 ring-2 ring-teal-200" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">Rank #{rank}</div>
          {isLadder && (
            <div className="mt-1 inline-flex rounded-md bg-blue-100 px-2 py-1 text-xs font-black text-blue-800">
              Before {formatLadderRank(ladderPreviousPositionForResult(row), ladderPositionCount)}
            </div>
          )}
          <div className="mt-1 break-words text-base font-black text-slate-950">{row.display_name}</div>
        </div>
        <div className="rounded-md bg-white px-2 py-1 text-sm font-black text-teal-800 shadow-sm">
          {formatPercent(winPctForStanding(row))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <MobileStandingStat label="Record" value={`${row.wins}-${row.losses}`} />
        <MobileStandingStat label="Points" value={`${row.points_for}-${row.points_against}`} />
        <MobileStandingStat label="Diff" value={formatSignedNumber(row.point_diff || 0)} />
        <MobileStandingStat label="Byes" value={row.byes || 0} />
      </div>
    </div>
  );
}

function StandingMobileSummaryRow({ row, rank, highlighted, isLadder = false, ladderPositionCount = null }) {
  return (
    <div className={`flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 shadow-sm ${
      highlighted ? "border-2 border-teal-500 bg-teal-50 ring-2 ring-teal-200" : "border-slate-200 bg-slate-50"
    }`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-black text-slate-700 shadow-sm">#{rank}</span>
        {isLadder && (
          <span className="shrink-0 rounded-md bg-blue-100 px-2 py-1 text-xs font-black text-blue-800 shadow-sm">
            Before {formatLadderRank(ladderPreviousPositionForResult(row), ladderPositionCount)}
          </span>
        )}
        <span className="truncate text-sm font-black text-slate-950">{row.display_name}</span>
      </div>
      <div className="shrink-0 rounded-md bg-white px-2 py-1 text-sm font-black text-teal-800 shadow-sm">
        {formatPercent(winPctForStanding(row))}
      </div>
    </div>
  );
}

function MobileStandingStat({ label, value }) {
  return (
    <div className="rounded-md bg-white px-2 py-2 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 font-black text-slate-950">{value}</div>
    </div>
  );
}

function GameTeamScorePanel({ players, score, isWinner, highlightedPlayerId, align = "left" }) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 shadow-[0_10px_18px_-16px_rgba(15,23,42,0.95)] ${
      isWinner ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"
    }`}>
      <div className={`flex items-center justify-between gap-2 ${align === "right" ? "md:flex-row-reverse" : ""}`}>
        <PlayerNameList players={players} highlightedPlayerId={highlightedPlayerId} align={align} />
        <div className={`shrink-0 rounded-lg px-2.5 py-1.5 text-center shadow-[0_10px_18px_-14px_rgba(15,23,42,0.9)] ${
          isWinner ? "bg-teal-700 text-white" : "bg-slate-950 text-white"
        }`}>
          <div className="text-[10px] font-black uppercase tracking-wide opacity-80">Score</div>
          <div className="text-xl font-black leading-none">{formatGameScore(score)}</div>
        </div>
      </div>
    </div>
  );
}

function PlayerNameList({ players, highlightedPlayerId, align = "left", inline = false }) {
  const list = players || [];
  const containerClass = inline
    ? "inline-flex flex-wrap items-center gap-1 align-middle"
    : `flex flex-wrap gap-2 ${align === "right" ? "justify-start md:justify-end" : "justify-start"}`;

  if (list.length === 0) {
    return <span className={inline ? "font-black text-slate-500" : "font-black text-slate-500"}>Team</span>;
  }

  return (
    <span className={containerClass}>
      {list.map((player, index) => {
        const playerId = playerIdValue(player);
        const isHighlighted = highlightedPlayerId && playerId === highlightedPlayerId;
        return (
          <span
            key={`${playerId || "player"}-${index}`}
            className={`rounded-md px-2 py-1 text-sm font-black shadow-sm ${
              isHighlighted
                ? "border border-teal-700 bg-teal-600 text-white shadow-[0_10px_18px_-14px_rgba(15,118,110,0.95)]"
                : "border border-slate-200 bg-white text-slate-800"
            }`}
          >
            {playerDisplayName(player)}
          </span>
        );
      })}
    </span>
  );
}

function groupMatchesByRound(matches = []) {
  const groups = matches.reduce((summary, match) => {
    const roundNumber = match.round_number || "-";
    const key = String(roundNumber);
    if (!summary.has(key)) {
      summary.set(key, { roundNumber, matches: [] });
    }
    summary.get(key).matches.push(match);
    return summary;
  }, new Map());

  return Array.from(groups.values()).sort((a, b) => {
    const aRound = Number(a.roundNumber);
    const bRound = Number(b.roundNumber);
    if (Number.isNaN(aRound) && Number.isNaN(bRound)) return 0;
    if (Number.isNaN(aRound)) return 1;
    if (Number.isNaN(bRound)) return -1;
    return aRound - bRound;
  });
}

function roundByePlayers(round) {
  return (round?.matches || []).flatMap((match) => match.bye_players || []);
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

function playerDisplayName(player) {
  return player?.firstLabel || player?.displayName || player?.display_name || player?.display_name_snapshot || "Player";
}

function playerIdValue(player) {
  return String(player?.id || player?.player_id || "");
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

function formatSignedDecimalNumber(value, decimals = 2) {
  const numeric = Number(value || 0);
  const rounded = Number(numeric.toFixed(decimals));
  return rounded > 0 ? `+${rounded}` : String(rounded);
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
