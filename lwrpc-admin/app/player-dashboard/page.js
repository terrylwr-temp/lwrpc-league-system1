"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";

export default function PlayerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState(null);
  const [teams, setTeams] = useState([]);

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setLoading(false);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("email", user.email)
      .maybeSingle();

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    setMember(memberData || null);

    if (!memberData?.id) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const { data: rosterData, error: rosterError } = await supabase
      .from("team_members")
      .select(`
        team_id,
        teams (
          id,
          name,
          divisions (
            id,
            name,
            leagues (
              id,
              name
            )
          ),
          locations (
            id,
            name
          )
        )
      `)
      .eq("member_id", memberData.id);

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    setTeams((rosterData || []).map((row) => row.teams).filter(Boolean));
    setLoading(false);
  }

  useEffect(() => {
    async function run() {
      const ok = await requireRole(router, "player");
      if (ok) await loadData();
    }

    run();
  }, []);

  if (loading) {
    return <LoadingScreen subtitle="Loading Player Dashboard..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Player Dashboard"
          subtitle="Your league teams, standings, and match access."
        />

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Signed In As
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {member ? `${member.first_name || ""} ${member.last_name || ""}`.trim() : "Player"}
          </div>
          <div className="mt-1 text-sm text-slate-600">{member?.email || ""}</div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">My Teams</h2>
            <button
              type="button"
              onClick={() => router.push("/standings")}
              className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              View All Standings
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="rounded-xl border border-slate-200 p-4">
                <div className="text-lg font-bold text-slate-900">{team.name}</div>
                <div className="mt-1 text-sm text-slate-600">
                  League: {team.divisions?.leagues?.name || ""}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Division: {team.divisions?.name || ""}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Home Location: {team.locations?.name || ""}
                </div>
                <button
                  type="button"
                  onClick={() => router.push(`/standings?league=${team.divisions?.leagues?.id || ""}&division=${team.divisions?.id || ""}`)}
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Division Standings
                </button>
              </div>
            ))}

            {teams.length === 0 && (
              <div className="rounded-xl bg-slate-50 p-6 text-slate-500">
                You are not currently listed on any team rosters.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
