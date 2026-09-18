"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import DivisionStandingsView from "../components/DivisionStandingsView";
import LoadingScreen from "../components/LoadingScreen";
import { requireRole, supabase } from "../lib/auth";

export default function DivisionStandingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState("");
  const [standings, setStandings] = useState([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStandings = useCallback(async function loadStandings(divisionId) {
    if (!divisionId) {
      setSelectedDivisionId("");
      setStandings([]);
      return;
    }

    setSelectedDivisionId(divisionId);
    setStandingsLoading(true);
    setError("");
    const { data, error: standingsError } = await supabase
      .from("team_standings")
      .select("*, teams(id, name, abbreviation, is_active)")
      .eq("division_id", divisionId)
      .order("rank", { ascending: true });
    setStandingsLoading(false);

    if (standingsError) {
      setError(standingsError.message || "Unable to load standings.");
      setStandings([]);
      return;
    }

    setStandings((data || []).filter((row) => row.teams?.is_active !== false));
  }, []);

  useEffect(() => {
    async function loadPage() {
      const user = await requireRole(router, "league_manager");
      if (!user) return;

      const { data, error: divisionsError } = await supabase
        .from("divisions")
        .select("id, name, rating_type, is_active, leagues(id, name, season_id, is_active, seasons(id, is_active))")
        .order("name", { ascending: true });

      if (divisionsError) {
        setError(divisionsError.message || "Unable to load current divisions.");
        setLoading(false);
        return;
      }

      const options = (data || [])
        .filter((division) => division.is_active !== false && division.leagues?.is_active !== false && division.leagues?.seasons?.is_active !== false)
        .map((division) => ({
          id: division.id,
          divisionName: division.name || "Division",
          leagueName: division.leagues?.name || "League",
          label: `${division.leagues?.name || "League"} / ${division.name || "Division"}`,
          division,
        }));

      setDivisionOptions(options);
      const requestedDivisionId = new URLSearchParams(window.location.search).get("division");
      const initialDivisionId = options.some((option) => String(option.id) === String(requestedDivisionId))
        ? requestedDivisionId
        : options[0]?.id || "";
      setLoading(false);
      await loadStandings(initialDivisionId);
    }

    loadPage();
  }, [loadStandings, router]);

  if (loading) return <LoadingScreen subtitle="Loading Division Standings..." />;

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Division Standings"
          subtitle="Review current standings for every active league division or pool."
        />

        <div className="mb-4 flex">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800 sm:w-auto"
          >
            Back to Admin Dashboard
          </button>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{error}</div>}

        {divisionOptions.length ? (
          <DivisionStandingsView
            divisionOptions={divisionOptions}
            selectedDivisionId={selectedDivisionId}
            onSelectDivision={loadStandings}
            standings={standings}
            loading={standingsLoading}
          />
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center font-semibold text-slate-500 shadow">There are no current divisions available.</div>
        )}
      </div>
    </main>
  );
}
