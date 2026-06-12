"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/auth";
import { passkeyErrorMessage } from "../lib/passkeyErrors";
import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function updatePassword(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("Updating password...");

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
    setMessage("Password updated. You can register a passkey / fingerprint below, or return to login when you are done.");
    setLoading(false);
  }

  async function registerPasskey() {
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
              <label className="text-sm font-semibold text-slate-700">
                New Password
              </label>

              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="mt-5">
              <label className="text-sm font-semibold text-slate-700">
                Confirm New Password
              </label>

              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>

            {message && (
              <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
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
              disabled={passkeyLoading}
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
            onClick={() => router.push("/login")}
            className="mt-5 w-full rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Return to Login
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
