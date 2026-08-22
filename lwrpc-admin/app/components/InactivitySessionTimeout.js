"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/auth";

const INACTIVITY_LIMIT_MS = 4 * 60 * 60 * 1000;
const WARNING_LEAD_MS = 15 * 60 * 1000;
const ACTIVITY_STORAGE_KEY = "lwrpc-session-last-activity";
const LOGOUT_NOTICE_STORAGE_KEY = "lwrpc-inactivity-logout-notice";
const PBCC_RETURN_TO = "/pbcc/player";

function isPbccPath(pathname) {
  return pathname?.startsWith("/pbcc") || pathname?.startsWith("/round-robin/rpro");
}

function storedActivityFor(userId) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(ACTIVITY_STORAGE_KEY) || "null");
    if (stored?.userId !== userId || !Number.isFinite(stored.at)) return null;
    return stored.at;
  } catch {
    return null;
  }
}

function formatRemainingTime(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `${hours} hour${hours === 1 ? "" : "s"} ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`
    : `${hours} hour${hours === 1 ? "" : "s"}`;
}

export default function InactivitySessionTimeout() {
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef(null);
  const userIdRef = useRef(null);
  const signingOutRef = useRef(false);
  const staySignedInButtonRef = useRef(null);
  const [hasSession, setHasSession] = useState(false);
  const [warningSecondsRemaining, setWarningSecondsRemaining] = useState(null);

  const clearTrackedSession = useCallback(() => {
    lastActivityRef.current = null;
    userIdRef.current = null;
    setHasSession(false);
    setWarningSecondsRemaining(null);
  }, []);

  const expireSession = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    try {
      window.localStorage.removeItem(ACTIVITY_STORAGE_KEY);
      window.sessionStorage.setItem(LOGOUT_NOTICE_STORAGE_KEY, "true");
      // Local scope signs out this browser session without logging the member out on other devices.
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // Clearing the local session state and returning to sign-in still protects this browser.
    } finally {
      clearTrackedSession();
      const signInPath = isPbccPath(pathname)
        ? `/login?returnTo=${encodeURIComponent(PBCC_RETURN_TO)}`
        : "/login";
      router.replace(signInPath);
      signingOutRef.current = false;
    }
  }, [clearTrackedSession, pathname, router]);

  const recordActivity = useCallback(() => {
    const userId = userIdRef.current;
    if (!userId || signingOutRef.current) return;

    const now = Date.now();
    if (lastActivityRef.current && now - lastActivityRef.current >= INACTIVITY_LIMIT_MS) {
      void expireSession();
      return;
    }

    // Avoid frequent localStorage writes while retaining precise inactivity behavior.
    if (lastActivityRef.current && now - lastActivityRef.current < 5000) return;
    lastActivityRef.current = now;
    window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify({ userId, at: now }));
    setWarningSecondsRemaining(null);
  }, [expireSession]);

  const trackSession = useCallback((session) => {
    const userId = session?.user?.id;
    if (!userId) {
      clearTrackedSession();
      return;
    }

    userIdRef.current = userId;
    const priorActivity = storedActivityFor(userId);
    const activityAt = priorActivity || Date.now();
    lastActivityRef.current = activityAt;
    setHasSession(true);

    if (!priorActivity) {
      window.localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify({ userId, at: activityAt }));
    }
  }, [clearTrackedSession]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) trackSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearTrackedSession();
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        trackSession(session);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [clearTrackedSession, trackSession]);

  useEffect(() => {
    if (!hasSession) return undefined;

    function checkInactivity() {
      const lastActivity = lastActivityRef.current;
      if (!lastActivity) return;

      const elapsed = Date.now() - lastActivity;
      if (elapsed >= INACTIVITY_LIMIT_MS) {
        void expireSession();
        return;
      }

      const remaining = Math.ceil((INACTIVITY_LIMIT_MS - elapsed) / 1000);
      setWarningSecondsRemaining(elapsed >= INACTIVITY_LIMIT_MS - WARNING_LEAD_MS ? remaining : null);
    }

    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    window.addEventListener("focus", checkInactivity);
    document.addEventListener("visibilitychange", checkInactivity);
    const timer = window.setInterval(checkInactivity, 1000);
    checkInactivity();

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener("focus", checkInactivity);
      document.removeEventListener("visibilitychange", checkInactivity);
      window.clearInterval(timer);
    };
  }, [expireSession, hasSession, recordActivity]);

  useEffect(() => {
    function syncActivityAcrossTabs(event) {
      if (event.key !== ACTIVITY_STORAGE_KEY) return;

      const activityAt = storedActivityFor(userIdRef.current);
      if (activityAt) {
        lastActivityRef.current = activityAt;
        setWarningSecondsRemaining(null);
      }
    }

    window.addEventListener("storage", syncActivityAcrossTabs);
    return () => window.removeEventListener("storage", syncActivityAcrossTabs);
  }, []);

  useEffect(() => {
    if (warningSecondsRemaining === null) return undefined;
    staySignedInButtonRef.current?.focus();
  }, [warningSecondsRemaining]);

  if (warningSecondsRemaining === null) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" role="presentation">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="inactivity-timeout-title" aria-describedby="inactivity-timeout-message">
        <header className="flex items-start gap-3 bg-gradient-to-r from-[#102e64] to-[#1558d5] px-5 py-4 text-white">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-lg font-black text-amber-900" aria-hidden="true">!</span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[.14em] text-blue-100">League Management System</span>
            <h2 id="inactivity-timeout-title" className="mt-0.5 text-xl font-black leading-tight">Still there?</h2>
          </div>
        </header>
        <div className="px-5 py-5">
          <p id="inactivity-timeout-message" className="text-sm font-semibold leading-6 text-slate-700">
            You have been inactive. For your security, you will be signed out in {formatRemainingTime(warningSecondsRemaining)}.
          </p>
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => void expireSession()} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-200">
            Sign Out Now
          </button>
          <button ref={staySignedInButtonRef} type="button" onClick={recordActivity} className="rounded-xl bg-[#1558d5] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#1047af] focus:outline-none focus:ring-4 focus:ring-blue-300">
            Stay Signed In
          </button>
        </footer>
      </section>
    </div>
  );
}
