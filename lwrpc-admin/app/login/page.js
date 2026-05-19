"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
          "http://localhost:3000/reset-password"
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

      <div className="w-full max-w-md">

        <div className="rounded-3xl bg-white p-10 shadow-2xl">

          <div className="text-center">

            <img
              src="https://lwrpickleballclub.com/lwrpc-logo.png"
              alt="Lakewood Ranch Pickleball Club"
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

              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

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

{message && (
  <div
    className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium ${
      message.toLowerCase().includes("sent")
        ? "border-green-300 bg-green-50 text-green-800"
        : message.toLowerCase().includes("error") ||
          message.toLowerCase().includes("invalid")
        ? "border-red-300 bg-red-50 text-red-800"
        : "border-blue-300 bg-blue-50 text-blue-800"
    }`}
  >
    {message}
  </div>
)}


          </form>

        </div>

        <div className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          © {new Date().getFullYear()} Lakewood Ranch Pickleball Club.
          <br />
          All rights reserved.
        </div>

      </div>

    </main>
  );
}
