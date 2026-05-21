"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/auth";
import { APP_VERSION, COPYRIGHT_YEAR } from "../lib/version";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user?.email) {
      router.push("/");
      return;
    }

    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (!member?.id) {
      router.push("/");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("member_id", member.id)
      .maybeSingle();

    const role = roleData?.role || "player";

    if (role === "captain") {
      router.push("/captain-dashboard");
      return;
    }

    if (role === "player") {
      router.push("/player-dashboard");
      return;
    }

    router.push("/");
  }

  async function forgotPassword() {
    if (!email) {
      setMessage(
        "Enter your email address first, then click Forgot Password."
      );
      return;
    }

    setLoading(true);
    setMessage("Sending password reset email...");

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          "https://league.lwrpickleballclub.com/reset-password"
      });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Password reset email sent. Please check your inbox."
    );

    setLoading(false);
  }

  const messageText = message.toLowerCase();
  const isSuccessMessage = messageText.includes("sent");
  const isPendingMessage =
    messageText.includes("signing") ||
    messageText.includes("sending");
  const isErrorMessage =
    Boolean(message) && !isSuccessMessage && !isPendingMessage;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

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
              LWR PC League
              <br />
              Management System
            </h1>

            <p className="mt-3 text-sm font-medium text-slate-500">
              League Operations & Match Management
            </p>

          </div>

          <form
            onSubmit={login}
            className="mt-8"
          >

            <div>

              <label className="text-sm font-semibold text-slate-700">
                Email Address
              </label>

              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />

            </div>

            <div className="mt-5">

              <label className="text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative mt-1">
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

            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-7 w-full rounded-xl bg-blue-700 px-5 py-3 font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <button
              type="button"
              onClick={forgotPassword}
              disabled={loading}
              className="mt-3 w-full rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
            >
              Forgot Password?
            </button>

            <p className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-center text-sm font-semibold text-blue-900">
              First time logging in? Click Forgot Password to create your password.
            </p>

            {message && (
              <div
                role={isErrorMessage ? "alert" : "status"}
                aria-live={isErrorMessage ? "assertive" : "polite"}
                className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                  isSuccessMessage
                    ? "border-green-300 bg-green-50 font-medium text-green-800"
                    : isErrorMessage
                    ? "border-2 border-red-500 bg-red-100 font-bold text-red-950 shadow-lg shadow-red-200/70"
                    : "border-blue-300 bg-blue-50 font-medium text-blue-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  {isErrorMessage && (
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-700 text-sm font-black text-white">
                      !
                    </span>
                  )}

                  <div>
                    {isErrorMessage && (
                      <p className="mb-1 text-xs font-black uppercase tracking-wide text-red-800">
                        Sign in problem
                      </p>
                    )}
                    <p>{message}</p>
                  </div>
                </div>
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
