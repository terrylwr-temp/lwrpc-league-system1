"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/auth";
import { passkeyErrorMessage } from "../lib/passkeyErrors";
import { passwordResetAccess, passwordResetLinkError, RESET_SESSION_ERROR } from "../lib/passwordResetAccess";
import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkError, setLinkError] = useState("");
  const returnLabel = "Return to System";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(safeInternalReturnPath(params.get("returnTo")));
  }, []);

  useEffect(() => {
    let mounted = true;
    const errorFromLink = passwordResetLinkError(window.location.search, window.location.hash);
    setLinkError(errorFromLink);
    let signedOut = false;
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT" || !mounted) return;
      signedOut = true;
      setSessionReady(false);
      setPassword("");
      setConfirmPassword("");
      setMessage(errorFromLink || RESET_SESSION_ERROR);
    });

    async function confirmRecoverySession() {
      const access = await passwordResetAccess(supabase.auth, errorFromLink);
      if (!mounted) return;
      setCheckingSession(false);
      setSessionReady(access.ready && !signedOut);
      setMessage(signedOut ? errorFromLink || RESET_SESSION_ERROR : access.message);
    }

    confirmRecoverySession();
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(e) {
    e.preventDefault();
    if (checkingSession || !sessionReady || linkError) {
      setMessage(linkError || RESET_SESSION_ERROR);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("Updating password...");

    const access = await passwordResetAccess(supabase.auth, linkError);
    if (!access.ready) {
      setSessionReady(false);
      setPassword("");
      setConfirmPassword("");
      setMessage(access.message);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setMessage(`Password updated. You can register a passkey / fingerprint below, or ${returnTo ? "return to Admin Setup" : "return to login"} when you are done.`);
    setLoading(false);
  }

  async function registerPasskey() {
    const access = await passwordResetAccess(supabase.auth, linkError);
    if (checkingSession || !sessionReady || !access.ready) {
      setSessionReady(false);
      setMessage(access.message || RESET_SESSION_ERROR);
      return;
    }
    if (!supabase.auth.registerPasskey) {
      setPasskeyMessage("Passkey / fingerprint registration is not available in this browser yet.");
      return;
    }

    setPasskeyLoading(true);
    setPasskeyMessage("Opening passkey / fingerprint registration...");

    const { error } = await supabase.auth.registerPasskey();

    if (error) {
      setPasskeyMessage(passkeyErrorMessage(error, "registration"));
      setPasskeyLoading(false);
      return;
    }

    setPasskeyMessage("Passkey / fingerprint login registered.");
    setPasskeyLoading(false);
  }

  return (
    <main className="full-screen-main flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl bg-white p-10 shadow-2xl">
          <div className="text-center">
            <Image
              src="https://lwrpickleballclub.com/lwrpc-logo.png"
              alt="Lakewood Ranch Pickleball Club"
              width={112}
              height={112}
              className="mx-auto h-28 w-28 rounded-full bg-white object-contain"
            />

            <h1 className="mt-6 text-3xl font-black text-slate-900">
              Account Security
            </h1>

            <p className="mt-3 text-sm font-medium text-slate-500">
              Change your password or register passkey / fingerprint login for the LWR PC League Management System.
            </p>
          </div>

          <form onSubmit={updatePassword} className="mt-8">
            <h2 className="text-lg font-black text-slate-900">
              Change Password
            </h2>

            <div className="mt-4">
              <label htmlFor="new-password" className="text-sm font-semibold text-slate-700">
                New Password
              </label>

              <PasswordInput
                id="new-password"
                label="new password"
                disabled={loading || checkingSession || !sessionReady}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="mt-5">
              <label htmlFor="confirm-new-password" className="text-sm font-semibold text-slate-700">
                Confirm New Password
              </label>

              <PasswordInput
                id="confirm-new-password"
                label="confirm new password"
                disabled={loading || checkingSession || !sessionReady}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || checkingSession || !sessionReady}
              className="mt-7 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {checkingSession ? "Checking Secure Link..." : loading ? "Updating..." : "Update Password"}
            </button>

            {message && (
              <div role="alert" className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </div>
            )}
          </form>

          <div className="mt-8 border-t border-slate-200 pt-7">
            <h2 className="text-lg font-black text-slate-900">
              Passkey / Fingerprint Login
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Register this device so you can sign in with a passkey or fingerprint instead of typing your password.
            </p>

            <button
              type="button"
              onClick={registerPasskey}
              disabled={passkeyLoading || checkingSession || !sessionReady}
              className="mt-5 w-full rounded-xl bg-sky-600 px-5 py-3 font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
            >
              {passkeyLoading ? "Registering..." : "Register Passkey / Fingerprint"}
            </button>

            {passkeyMessage && (
              <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {passkeyMessage}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push(returnTo || "/login")}
            className="mt-5 w-full rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {returnLabel}
          </button>
        </div>

        <div className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          © {COPYRIGHT_YEAR} Lakewood Ranch Pickleball Club.
          <br />
          All rights reserved.
          <br />
          Version {APP_VERSION}
        </div>
      </div>
    </main>
  );
}

function PasswordInput({ id, label, disabled, ...inputProps }) {
  const [visible, setVisible] = useState(false);
  const revealed = visible && !disabled;

  return (
    <div className="relative mt-1">
      <input
        {...inputProps}
        id={id}
        type={revealed ? "text" : "password"}
        autoComplete="new-password"
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-14 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible(current => !current)}
        aria-label={`${revealed ? "Hide" : "Show"} ${label}`}
        aria-pressed={revealed}
        aria-controls={id}
        className="absolute inset-y-0 right-1 my-1 flex w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {revealed ? (
            <>
              <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.9 10.9 0 0 1 12 4c6 0 10 8 10 8a18.7 18.7 0 0 1-3.1 4.1M6.5 6.5A20.6 20.6 0 0 0 2 12s4 8 10 8a10.8 10.8 0 0 0 5.5-1.5" />
            </>
          ) : (
            <>
              <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

function safeInternalReturnPath(value) {
  const text = String(value || "").trim();
  if (!text || !text.startsWith("/") || text.startsWith("//")) return "";

  try {
    const url = new URL(text, "https://league.lwrpickleballclub.com");
    if (url.origin !== "https://league.lwrpickleballclub.com") return "";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "";
  }
}
