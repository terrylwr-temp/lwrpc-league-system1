"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TurnstileWidget from "../components/TurnstileWidget";
import { supabase } from "../lib/auth";
import { isValidEmailAddress, normalizeEmailAddress } from "../lib/email";
import { defaultDashboardForRole } from "../lib/permissions";
import { passkeyErrorMessage } from "../lib/passkeyErrors";
import { DEFAULT_SYSTEM_SETTINGS, cacheSystemSettings, mergeSystemSettings } from "../lib/systemSettings";
import { findMembersByEmail, highestRoleForMembers, memberEmailResolution } from "../lib/memberLookup";

export default function LoginPage() {
  const router = useRouter();
  const emailInputRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [systemSettings, setSystemSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [showPasswordResetSecurity, setShowPasswordResetSecurity] = useState(false);
  const [pendingPasswordResetEmail, setPendingPasswordResetEmail] = useState("");

  useEffect(() => {
    async function loadSystemSettings() {
      const response = await fetch("/api/system-settings");
      const result = await response.json().catch(() => ({}));

      if (result.settings) {
        const nextSettings = mergeSystemSettings(result.settings);
        cacheSystemSettings(nextSettings);
        setSystemSettings(nextSettings);
      }
    }

    setMounted(true);
    loadSystemSettings();
    routeExistingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await routeSignedInUser();
  }

  async function routeSignedInUser() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.push("/");
      return;
    }

    const { data: memberRows } = await findMembersByEmail(
      supabase,
      user.email,
      "id, is_active_member, user_roles(role)"
    );
    const { activeMembers, selectedMember } = memberEmailResolution(memberRows);

    if (!selectedMember?.id) {
      router.push("/");
      return;
    }

    const role = highestRoleForMembers(activeMembers.length > 0 ? activeMembers : [selectedMember]);

    router.push(defaultDashboardForRole(role));
  }

  async function routeExistingSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await routeSignedInUser();
    }
  }

  async function signInWithPasskey() {
    if (!supabase.auth.signInWithPasskey) {
      setMessage("Passkey / fingerprint sign in is not available in this browser yet.");
      return;
    }

    setLoading(true);
    setMessage("Opening passkey / fingerprint sign in...");

    const { error } = await supabase.auth.signInWithPasskey();

    if (error) {
      setMessage(passkeyErrorMessage(error, "sign in"));
      setLoading(false);
      return;
    }

    await routeSignedInUser();
  }

  async function forgotPassword(tokenOverride = "") {
    const normalizedEmail = normalizeEmailAddress(tokenOverride ? pendingPasswordResetEmail : (emailInputRef.current?.value || email));
    const securityToken = tokenOverride || turnstileToken;

    if (!normalizedEmail) {
      setMessage(
        "Enter your email address first, then click Forgot Password."
      );
      return;
    }

    if (!isValidEmailAddress(normalizedEmail)) {
      setMessage("Please enter a valid email address, such as name@example.com.");
      return;
    }

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !securityToken) {
      setPendingPasswordResetEmail(normalizedEmail);
      setShowPasswordResetSecurity(true);
      setMessage("");
      return;
    }

    setLoading(true);
    setEmail(normalizedEmail);
    setMessage("Checking member email...");

    try {
      const memberCheck = await fetch("/api/member-password-reset-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          turnstileToken: securityToken,
        }),
      });

      const memberCheckResult = await memberCheck.json();

      if (!memberCheck.ok || !memberCheckResult.success) {
        setMessage(memberCheckResult.error || "Unable to verify that email address.");
        return;
      }

      setMessage(memberCheckResult.message || "If that email address belongs to an active league member, a sign-in email has been sent. Please check your inbox, spam, and promotions folders.");
    } catch {
      setMessage("Unable to verify that email address. Please try again.");
    } finally {
      setLoading(false);
      setTurnstileToken("");
      setTurnstileResetKey((currentKey) => currentKey + 1);
      setShowPasswordResetSecurity(false);
      setPendingPasswordResetEmail("");
    }
  }

  const messageText = message.toLowerCase();
  const isSuccessMessage = messageText.includes("sent");
  const isPendingMessage =
    messageText.includes("signing") ||
    messageText.includes("sending") ||
    messageText.includes("checking") ||
    messageText.includes("opening");
  const isErrorMessage =
    Boolean(message) && !isSuccessMessage && !isPendingMessage;
  const clubName = systemSettings.club_name || DEFAULT_SYSTEM_SETTINGS.club_name;
  const systemName = systemSettings.system_name || DEFAULT_SYSTEM_SETTINGS.system_name;
  const logoUrl = systemSettings.logo_url || DEFAULT_SYSTEM_SETTINGS.logo_url;
  const clubWebsite = systemSettings.club_website || DEFAULT_SYSTEM_SETTINGS.club_website;

  if (!mounted) {
    return (
      <main className="full-screen-main show-system-footer flex min-h-screen items-center justify-center bg-slate-100 p-6 pb-14">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-2xl">
          Loading sign in...
        </div>
      </main>
    );
  }

  return (
    <main className="full-screen-main show-system-footer flex min-h-screen items-center justify-center bg-slate-100 p-4 pb-14 sm:p-6 sm:pb-14">

      <div className="w-full max-w-md">

        <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">

          <div className="text-center">

            <a
              href={clubWebsite}
              target="_blank"
              rel="noreferrer"
              title={`Open ${clubName} website`}
              className="inline-flex rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Image
                src={logoUrl}
                alt={clubName}
                width={112}
                height={112}
                className="mx-auto h-20 w-20 rounded-full bg-white object-contain sm:h-24 sm:w-24"
                unoptimized
              />
            </a>

            <h1 className="mt-4 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
              {clubName}
              <span className="mt-1 block text-xl text-blue-700 sm:text-2xl">{systemName}</span>
            </h1>
          </div>

          <form
            onSubmit={login}
            className="mt-6"
          >

            <div>

              <label className="text-sm font-semibold text-slate-700">
                Email Address
              </label>

              <input
                ref={emailInputRef}
                type="email"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">

              <label className="text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative col-span-2 mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl border border-slate-300 py-3 pl-4 pr-12 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(current => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 transition hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {showPassword ? (
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3l18 18M10.7 10.7a2 2 0 002.6 2.6M9.9 4.2A9.8 9.8 0 0112 4c5 0 8.5 4.5 9.7 6.3.4.6.4 1.4 0 2a18.6 18.6 0 01-2.3 2.8M6.5 6.5a18.6 18.6 0 00-4.2 3.8c-.4.6-.4 1.4 0 2C3.5 14 7 18.5 12 18.5c1.3 0 2.6-.3 3.8-.8"
                      />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.3 10.3C3.5 8.5 7 4 12 4s8.5 4.5 9.7 6.3c.4.6.4 1.4 0 2C20.5 14 17 18.5 12 18.5S3.5 14 2.3 12.3c-.4-.6-.4-1.4 0-2z"
                      />
                      <circle cx="12" cy="11.3" r="2.8" />
                    </svg>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => forgotPassword()}
                disabled={loading}
                className="col-start-2 row-start-1 justify-self-end rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-950 shadow-sm">
              First time logging in? Enter your email and click Forgot Password.
            </p>

            <div className="mt-3">
              <button
                type="button"
                onClick={signInWithPasskey}
                disabled={loading}
                aria-label="Sign in with passkey or fingerprint"
                title="Passkey / Fingerprint"
                className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md disabled:opacity-50"
              >
                <svg aria-hidden="true" className="h-5 w-5 text-blue-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7M8 18h8M15 8h5v4h-2v2h-3" />
                </svg>
                <span>Sign In with Passkey / Fingerprint</span>
              </button>
            </div>

            {showPasswordResetSecurity && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="mb-2 text-center text-xs font-semibold text-slate-600">Security check required before sending a password reset email.</p>
                <TurnstileWidget
                  key={turnstileResetKey}
                  onToken={(token) => {
                    setTurnstileToken(token);
                    if (token) void forgotPassword(token);
                  }}
                />
              </div>
            )}

            {message && !isErrorMessage && !isSuccessMessage && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                  isSuccessMessage
                    ? "border-green-300 bg-green-50 font-medium text-green-800"
                    : "border-blue-300 bg-blue-50 font-medium text-blue-800"
                }`}
              >
                <p>{message}</p>
              </div>
            )}


          </form>

        </div>

        {isSuccessMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="login-success-title"
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-sm font-black text-green-700">
                OK
              </div>
              <h2 id="login-success-title" className="mt-4 text-xl font-black text-slate-950">
                Email Sent
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                {message}
              </p>
              <button
                type="button"
                onClick={() => setMessage("")}
                className="mt-5 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {isErrorMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="login-error-title"
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl font-black text-red-700">
                !
              </div>
              <h2 id="login-error-title" className="mt-4 text-xl font-black text-slate-950">
                Sign In Problem
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                {message}
              </p>
              <button
                type="button"
                onClick={() => setMessage("")}
                className="mt-5 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800"
              >
                OK
              </button>
            </div>
          </div>
        )}

      </div>

    </main>
  );
}
