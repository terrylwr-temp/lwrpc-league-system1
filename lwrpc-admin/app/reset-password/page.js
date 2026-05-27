"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/auth";
import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

    setMessage("Password updated. Redirecting to login...");

    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }

  return (
    <main className="full-screen-main flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md">
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
              Reset Password
            </h1>

            <p className="mt-3 text-sm font-medium text-slate-500">
              Enter your new password for the LWR PC League Management System.
            </p>
          </div>

          <form onSubmit={updatePassword} className="mt-8">
            <div>
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
