"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";

export default function DivisionsPage() {
  const router = useRouter();

  const [leagues, setLeagues] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [scoreSheetTemplates, setScoreSheetTemplates] = useState([]);
  const [leagueFilter, setLeagueFilter] = useState("");
  const [divisionSearch, setDivisionSearch] = useState("");
  const [openLeagueName, setOpenLeagueName] = useState("");
  const [copyDivision, setCopyDivision] = useState(null);
  const [copyTargetLeague, setCopyTargetLeague] = useState("");
  const [copyName, setCopyName] = useState("");
  const [copyingDivision, setCopyingDivision] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [selectedLeague, setSelectedLeague] = useState("");
  const [name, setName] = useState("");
  const [ratingType, setRatingType] = useState("dupr");
  const [minDupr, setMinDupr] = useState("");
  const [maxDupr, setMaxDupr] = useState("");
  const [teamDuprMax, setTeamDuprMax] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [playoffTeamCount, setPlayoffTeamCount] = useState("");

  const [numberOfTeams, setNumberOfTeams] = useState("3");
  const [defaultGameFormat, setDefaultGameFormat] = useState("");
  const [gamesPerTeam, setGamesPerTeam] = useState("3");
  const [pointsToWin, setPointsToWin] = useState("11");
  const [winBy, setWinBy] = useState("2");
  const [picklebreakerEnabled, setPicklebreakerEnabled] = useState(false);
  const [picklebreakerPoints, setPicklebreakerPoints] = useState("25");
  const [picklebreakerWinPoints, setPicklebreakerWinPoints] = useState("1");
  const [picklebreakerLossPoints, setPicklebreakerLossPoints] = useState("0");
  const [lineNotes, setLineNotes] = useState("");
  const [scoreSheetTemplateId, setScoreSheetTemplateId] = useState("");

  const [standingsWinPoints, setStandingsWinPoints] = useState("2");
  const [standingsTiePoints, setStandingsTiePoints] = useState("1");
  const [standingsLossPoints, setStandingsLossPoints] = useState("0");

  const [tiebreak1, setTiebreak1] = useState("standings_points");
  const [tiebreak2, setTiebreak2] = useState("line_wins");
  const [tiebreak3, setTiebreak3] = useState("point_differential");

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: leagueData, error: leagueError } = await supabase
      .from("leagues")
      .select(`
        id,
        name,
        seasons (
          name,
          is_active
        ),
        is_active
      `)
      .order("name", { ascending: true });

    if (leagueError) {
      alert(leagueError.message);
      return;
    }

    const { data: divisionData, error: divisionError } = await supabase
      .from("divisions")
      .select(`
        *,
        leagues (
          name,
          is_active,
          seasons (
            name,
            is_active
          )
        )
      `)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (divisionError) {
      alert(divisionError.message);
      return;
    }

    const { data: templateData, error: templateError } = await supabase
      .from("score_sheet_templates")
      .select("id, name, is_active, is_default")
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (templateError) {
      alert(`Score Sheet selection requires the Supabase score sheet schema update: ${templateError.message}`);
      return;
    }

    const { data: lineCountData, error: lineCountError } = await supabase
      .from("division_lines")
      .select("division_id, line_number");

    if (lineCountError) {
      alert(lineCountError.message);
      return;
    }

    const lineNumbersByDivisionId = (lineCountData || []).reduce((map, line) => {
      const key = String(line.division_id || "");
      if (!map[key]) map[key] = new Set();
      map[key].add(String(line.line_number || ""));
      return map;
    }, {});

    setLeagues(leagueData || []);
    setScoreSheetTemplates(templateData || []);
    setDivisions(
      (divisionData || []).map((division) => ({
        ...division,
        configured_line_count: lineNumbersByDivisionId[String(division.id)]?.size || 0,
      }))
    );
  }, []);

  async function saveDivision(e) {
    e.preventDefault();

    if (!selectedLeague || !name) {
      alert("League and division name are required");
      return;
    }

    const payload = {
      league_id: selectedLeague,
      name,
      rating_type: ratingType || "dupr",
      min_dupr: ratingNumber(minDupr),
      max_dupr: ratingNumber(maxDupr),
      team_dupr_max: ratingNumber(teamDuprMax),
      sort_order: sortOrder ? Number(sortOrder) : 0,
      playoff_team_count: playoffTeamCount ? Number(playoffTeamCount) : null,

      number_of_lines: Number(numberOfTeams || 3),
      default_game_format: defaultGameFormat || null,
      games_per_line: Number(gamesPerTeam || 3),
      points_to_win: Number(pointsToWin || 11),
      win_by: Number(winBy || 2),
      third_game_format: null,
      picklebreaker_enabled: picklebreakerEnabled,
      picklebreaker_points: Number(picklebreakerPoints || 25),
      picklebreaker_win_points: Number(picklebreakerWinPoints || 1),
      picklebreaker_loss_points: Number(picklebreakerLossPoints || 0),

      standings_win_points: Number(standingsWinPoints || 2),
      standings_tie_points: Number(standingsTiePoints || 1),
      standings_loss_points: Number(standingsLossPoints || 0),
      standings_tiebreak_1: tiebreak1,
      standings_tiebreak_2: tiebreak2,
      standings_tiebreak_3: tiebreak3,

      line_notes: lineNotes || null,
      score_sheet_template_id: scoreSheetTemplateId || null,
      updated_at: new Date().toISOString(),
    };

    const result = editingId
      ? await supabase.from("divisions").update(payload).eq("id", editingId)
      : await supabase.from("divisions").insert(payload);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    clearForm();
    loadData();
  }

  async function deleteDivision(id) {
    const ok = confirmDeleteAction({
      title: "Delete this division?",
      details: "This may delete or orphan teams, schedules, matches, scores, standings, configured game lines, and roster records tied to this division.",
    });

    if (!ok) return;

    const { error } = await supabase.from("divisions").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  async function toggleDivisionActive(division) {
    const currentlyActive = division.is_active !== false;

    if (currentlyActive) {
      const ok = confirm(`Inactivate division "${division.name}"? It will be hidden from current setup dropdowns.`);
      if (!ok) return;
    }

    const { error } = await supabase
      .from("divisions")
      .update({
        is_active: !currentlyActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", division.id);

    if (error) {
      alert(error.message);
      return;
    }

    loadData();
  }

  function openCopyDivision(division) {
    setCopyDivision(division);
    setCopyTargetLeague("");
    setCopyName(division.name || "");
  }

  function closeCopyDivision() {
    setCopyDivision(null);
    setCopyTargetLeague("");
    setCopyName("");
    setCopyingDivision(false);
  }

  async function copyDivisionWithLines() {
    if (!copyDivision || !copyTargetLeague || !copyName.trim()) {
      alert("Choose a target league and division name.");
      return;
    }

    const targetLeague = leagues.find((league) => String(league.id) === String(copyTargetLeague));
    const ok = confirm(
      [
        `Copy "${copyDivision.name}" to ${targetLeague?.name || "selected league"}?`,
        "",
        "This creates a new division and copies its configured game lines.",
        "It does not copy teams, schedules, matches, scores, or standings.",
      ].join("\n")
    );

    if (!ok) return;

    setCopyingDivision(true);

    const divisionPayload = copyDivisionPayload(copyDivision, copyTargetLeague, copyName.trim());

    const { data: createdDivision, error: divisionError } = await supabase
      .from("divisions")
      .insert(divisionPayload)
      .select("id")
      .single();

    if (divisionError) {
      setCopyingDivision(false);
      alert(divisionError.message);
      return;
    }

    const { data: lineRows, error: lineError } = await supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", copyDivision.id)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true });

    if (lineError) {
      setCopyingDivision(false);
      alert(lineError.message);
      return;
    }

    if ((lineRows || []).length > 0) {
      const { error: insertLineError } = await supabase
        .from("division_lines")
        .insert(
          lineRows.map((line) => copyDivisionLinePayload(line, createdDivision.id))
        );

      if (insertLineError) {
        setCopyingDivision(false);
        alert(insertLineError.message);
        return;
      }
    }

    closeCopyDivision();
    await loadData();
  }

  function editDivision(division) {
    setEditingId(division.id);

    setSelectedLeague(division.league_id || "");
    setName(division.name || "");
    setRatingType(division.rating_type || "dupr");

    setMinDupr(division.min_dupr == null ? "" : String(division.min_dupr));
    setMaxDupr(division.max_dupr == null ? "" : String(division.max_dupr));
    setTeamDuprMax(division.team_dupr_max == null ? "" : String(division.team_dupr_max));
    setSortOrder(division.sort_order == null ? "" : String(division.sort_order));
    setPlayoffTeamCount(
      division.playoff_team_count == null ? "" : String(division.playoff_team_count)
    );

    setNumberOfTeams(
      division.number_of_lines == null ? "3" : String(division.number_of_lines)
    );

    setDefaultGameFormat(division.default_game_format || "");

    setGamesPerTeam(
      division.games_per_line == null ? "3" : String(division.games_per_line)
    );

    setPointsToWin(
      division.points_to_win == null ? "11" : String(division.points_to_win)
    );

    setWinBy(division.win_by == null ? "2" : String(division.win_by));

    setPicklebreakerEnabled(division.picklebreaker_enabled || false);

    setPicklebreakerPoints(
      division.picklebreaker_points == null
        ? "25"
        : String(division.picklebreaker_points)
    );

    setPicklebreakerWinPoints(
      division.picklebreaker_win_points == null
        ? "1"
        : String(division.picklebreaker_win_points)
    );

    setPicklebreakerLossPoints(
      division.picklebreaker_loss_points == null
        ? "0"
        : String(division.picklebreaker_loss_points)
    );

    setStandingsWinPoints(
      division.standings_win_points == null
        ? "2"
        : String(division.standings_win_points)
    );

    setStandingsTiePoints(
      division.standings_tie_points == null
        ? "1"
        : String(division.standings_tie_points)
    );

    setStandingsLossPoints(
      division.standings_loss_points == null
        ? "0"
        : String(division.standings_loss_points)
    );

    setTiebreak1(division.standings_tiebreak_1 || "standings_points");
    setTiebreak2(division.standings_tiebreak_2 || "line_wins");
    setTiebreak3(division.standings_tiebreak_3 || "point_differential");

    setLineNotes(division.line_notes || "");
    setScoreSheetTemplateId(division.score_sheet_template_id || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    setEditingId(null);

    setSelectedLeague("");
    setName("");
    setRatingType("dupr");

    setMinDupr("");
    setMaxDupr("");
    setTeamDuprMax("");
    setSortOrder("");
    setPlayoffTeamCount("");

    setNumberOfTeams("3");
    setDefaultGameFormat("");
    setGamesPerTeam("3");

    setPointsToWin("11");
    setWinBy("2");

    setPicklebreakerEnabled(false);
    setPicklebreakerPoints("25");
    setPicklebreakerWinPoints("1");
    setPicklebreakerLossPoints("0");

    setStandingsWinPoints("2");
    setStandingsTiePoints("1");
    setStandingsLossPoints("0");

    setTiebreak1("standings_points");
    setTiebreak2("line_wins");
    setTiebreak3("point_differential");

    setLineNotes("");
    setScoreSheetTemplateId("");
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        loadData();
      }
    }

    run();
  }, [checkAuth, loadData]);

  const filteredDivisions = useMemo(() => {
    const search = divisionSearch.trim().toLowerCase();

    return divisions.filter((division) => {
      const matchesLeague = !leagueFilter || division.league_id === leagueFilter;
      const matchesName =
        !search || (division.name || "").toLowerCase().includes(search);

      return matchesLeague && matchesName;
    });
  }, [divisions, divisionSearch, leagueFilter]);

  const groupedDivisions = useMemo(() => {
    const groups = {};

    filteredDivisions.forEach((division) => {
      const leagueName = division.leagues?.name || "No League";

      if (!groups[leagueName]) {
        groups[leagueName] = [];
      }

      groups[leagueName].push(division);
    });

    return groups;
  }, [filteredDivisions]);

  const activeLeagues = useMemo(() => {
    return leagues.filter((league) => league.is_active !== false && league.seasons?.is_active !== false);
  }, [leagues]);

  function ratingTypeLabel(type) {
    if (type === "primetime") return "Season PrimeTime";
    if (type === "self_rating") return "Self Rating";
    return "Season DUPR";
  }

  function tiebreakLabel(value) {
    const labels = {
      standings_points: "Standings Points",
      line_wins: "Line Wins",
      game_wins: "Game Wins",
      point_differential: "Point Differential",
      points_for: "Total Points For",
    };

    return labels[value] || value || "—";
  }

  function scoreSheetTemplateName(templateId) {
    if (!templateId) return "Default Score Sheet";
    return scoreSheetTemplates.find((template) => String(template.id) === String(templateId))?.name || "Saved Score Sheet";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Divisions"
          subtitle="Manage division rules, rating systems, match formats, standings rules, and line/game configurations."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingId ? "Edit Division" : "Create Division"}
              </h2>

              <div className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
                {divisions.length} Divisions
              </div>
            </div>

            <form onSubmit={saveDivision} className="space-y-5">
              <Field label="League">
                <select
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Select League</option>

                  {activeLeagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                      {league.seasons?.name ? ` (${league.seasons.name})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Division Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Example: 3.5 Women"
                />
              </Field>

              <Field label="Rating Type">
                <select
                  value={ratingType}
                  onChange={(e) => setRatingType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="dupr">Season DUPR Rating</option>
                  <option value="primetime">Season PrimeTime Rating</option>
                  <option value="self_rating">Self Rating</option>
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  Controls which rating is used for roster eligibility.
                </p>
              </Field>

              <Field label="Rating Range">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    value={minDupr}
                    onChange={(e) => setMinDupr(e.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Min"
                  />

                  <input
                    type="number"
                    step="0.01"
                    value={maxDupr}
                    onChange={(e) => setMaxDupr(e.target.value)}
                    className="rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Max"
                  />
                </div>
              </Field>

              <Field label="Doubles Team DUPR Maximum">
                <input
                  type="number"
                  step="0.01"
                  value={teamDuprMax}
                  onChange={(e) => setTeamDuprMax(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Combined doubles-team maximum"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Maximum combined rating for one doubles pair using this division&apos;s selected rating type.
                </p>
              </Field>

              <Field label="Number of Teams">
                <input
                  type="number"
                  min="1"
                  value={numberOfTeams}
                  onChange={(e) => setNumberOfTeams(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Number of teams each community team will use in a match.
                </p>
              </Field>

              <Field label="Standings Tiebreak Order">
                <div className="space-y-3">
                  <select
                    value={tiebreak1}
                    onChange={(e) => setTiebreak1(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    <option value="standings_points">Standings Points</option>
                    <option value="line_wins">Line Wins</option>
                    <option value="game_wins">Game Wins</option>
                    <option value="point_differential">Point Differential</option>
                    <option value="points_for">Total Points For</option>
                  </select>

                  <select
                    value={tiebreak2}
                    onChange={(e) => setTiebreak2(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    <option value="line_wins">Line Wins</option>
                    <option value="game_wins">Game Wins</option>
                    <option value="point_differential">Point Differential</option>
                    <option value="points_for">Total Points For</option>
                    <option value="standings_points">Standings Points</option>
                  </select>

                  <select
                    value={tiebreak3}
                    onChange={(e) => setTiebreak3(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    <option value="point_differential">Point Differential</option>
                    <option value="game_wins">Game Wins</option>
                    <option value="points_for">Total Points For</option>
                    <option value="line_wins">Line Wins</option>
                    <option value="standings_points">Standings Points</option>
                  </select>
                </div>
              </Field>

              <Field label="Top teams in Playoffs/Championship">
                <input
                  type="number"
                  min="0"
                  value={playoffTeamCount}
                  onChange={(e) => setPlayoffTeamCount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Example: 4"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Highlights the top ranked teams in standings as Playoffs/Championship Day teams.
                </p>
              </Field>

              <Field label="Additional Division Rules / Notes">
                <textarea
                  value={lineNotes}
                  onChange={(e) => setLineNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                />
              </Field>

              <Field label="Score Sheet Format">
                <select
                  value={scoreSheetTemplateId}
                  onChange={(event) => setScoreSheetTemplateId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="">Default Score Sheet</option>
                  {scoreSheetTemplates
                    .filter((template) => template.is_active !== false || String(template.id) === String(scoreSheetTemplateId))
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}{template.is_default ? " (Default)" : ""}
                        {template.is_active === false ? " (Inactive)" : ""}
                      </option>
                    ))}
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Controls the printed Match Score Sheet on the Captain Dashboard.
                </p>
              </Field>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                >
                  {editingId ? "Save Division" : "Create Division"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={clearForm}
                    className="rounded-xl bg-slate-200 px-5 py-3 font-semibold hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Current Divisions
              </h2>

              <div className="rounded-xl bg-slate-900 px-5 py-3 text-white">
                <div className="text-xs uppercase tracking-wide text-slate-300">
                  Showing
                </div>

                <div className="text-2xl font-bold">
                  {filteredDivisions.length} / {divisions.length}
                </div>
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  League
                </label>
                <select
                  value={leagueFilter}
                  onChange={(e) => setLeagueFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">All Leagues</option>
                  {activeLeagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                      {league.seasons?.name ? ` (${league.seasons.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Division Name
                </label>
                <input
                  value={divisionSearch}
                  onChange={(e) => setDivisionSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                  placeholder="Search divisions"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setLeagueFilter("");
                    setDivisionSearch("");
                  }}
                  className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 hover:bg-slate-300 md:w-auto"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {Object.keys(groupedDivisions).map((leagueName) => {
                const isOpen = openLeagueName === leagueName;

                return (
                <div
                  key={leagueName}
                  className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50/40"
                >
                  <button
                    type="button"
                    onClick={() => setOpenLeagueName((current) => current === leagueName ? "" : leagueName)}
                    className="flex w-full items-center justify-between gap-3 border-b border-blue-100 bg-blue-700 px-4 py-3 text-left text-white hover:bg-blue-800"
                  >
                    <h3 className="text-lg font-bold">
                      {leagueName}
                    </h3>
                    <span className="flex items-center gap-3">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                        {groupedDivisions[leagueName].length} Divisions
                      </span>
                      <span className="text-xl font-black">{isOpen ? "-" : "+"}</span>
                    </span>
                  </button>

                  {isOpen && (
                  <div className="space-y-3 p-3">
                    {groupedDivisions[leagueName].map((division) => (
                      <div
                        key={division.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-lg font-bold text-slate-900">
                              {division.name}
                            </div>

                            <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                              division.is_active === false
                                ? "bg-slate-200 text-slate-700"
                                : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {division.is_active === false ? "Inactive" : "Active"}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                              Rating Type: {ratingTypeLabel(division.rating_type)}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                              Rating Range: {division.min_dupr ?? "—"} to{" "}
                              {division.max_dupr ?? "—"}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                              Doubles Team DUPR Maximum: {division.team_dupr_max ?? "—"}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                              Number of Teams: {division.number_of_lines ?? 3}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                              Score Sheet: {scoreSheetTemplateName(division.score_sheet_template_id)}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                              Playoffs/Championship Teams: {division.playoff_team_count ?? "—"}
                            </div>

                            {false && (
                              <>
                            <div className="mt-1 text-sm text-slate-600">
                              Picklebreaker:{" "}
                              {division.picklebreaker_enabled
                                ? `Yes (${division.picklebreaker_points}) · W=${division.picklebreaker_win_points ?? 1} / L=${division.picklebreaker_loss_points ?? 0}`
                                : "No"}
                            </div>

                            <div className="mt-1 text-sm text-slate-600">
                              Standings Points: W={division.standings_win_points ?? 2} / T=
                              {division.standings_tie_points ?? 1} / L=
                              {division.standings_loss_points ?? 0}
                            </div>
                              </>
                            )}

                            <div className="mt-1 text-sm text-slate-600">
                              Tiebreaks: {tiebreakLabel(division.standings_tiebreak_1)}
                              {" → "}
                              {tiebreakLabel(division.standings_tiebreak_2)}
                              {" → "}
                              {tiebreakLabel(division.standings_tiebreak_3)}
                            </div>

                            {division.line_notes && (
                              <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                                {division.line_notes}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleDivisionActive(division)}
                              className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                                division.is_active === false
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                  : "bg-amber-100 text-amber-900 hover:bg-amber-200"
                              }`}
                            >
                              {division.is_active === false ? "Activate" : "Inactivate"}
                            </button>

                            <button
                              type="button"
                              onClick={() => router.push(`/divisions/${division.id}`)}
                              className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                              Configure Game Lines ({division.configured_line_count || 0})
                            </button>

                            <button
                              type="button"
                              onClick={() => editDivision(division)}
                              className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => openCopyDivision(division)}
                              className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 hover:bg-emerald-200"
                            >
                              Copy
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteDivision(division.id)}
                              className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
                );
              })}

              {divisions.length === 0 && (
                <div className="text-slate-500">No divisions created yet.</div>
              )}

              {divisions.length > 0 && filteredDivisions.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                  No divisions match the current filters.
                </div>
              )}
            </div>
          </div>
        </div>

        {copyDivision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="bg-slate-950 px-5 py-4 text-white">
                <div className="text-xs font-black uppercase tracking-wide text-emerald-200">
                  Copy Division
                </div>
                <h2 className="mt-1 text-xl font-black">
                  {copyDivision.name}
                </h2>
              </div>

              <div className="space-y-4 p-5">
                <Field label="New Division Name">
                  <input
                    value={copyName}
                    onChange={(event) => setCopyName(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  />
                </Field>

                <Field label="Copy To League">
                  <select
                    value={copyTargetLeague}
                    onChange={(event) => setCopyTargetLeague(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  >
                    <option value="">Select Target League</option>
                    {activeLeagues.map((league) => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                        {league.seasons?.name ? ` (${league.seasons.name})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950">
                  This copies the division settings and configured game lines only. Teams, schedules,
                  matches, scores, and standings are not copied.
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeCopyDivision}
                    className="rounded-xl bg-slate-200 px-4 py-3 text-sm font-bold text-slate-900 hover:bg-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={copyDivisionWithLines}
                    disabled={copyingDivision}
                    className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {copyingDivision ? "Copying..." : "Copy Division"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function ratingNumber(value) {
  if (value === "" || value === null || value === undefined) return null;

  const number = Number(value);

  if (Number.isNaN(number)) return null;

  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function copyDivisionPayload(division, leagueId, name) {
  const {
    id,
    leagues,
    division_lines,
    created_at,
    updated_at,
    ...rest
  } = division;
  void id;
  void leagues;
  void division_lines;
  void created_at;
  void updated_at;

  return {
    ...rest,
    league_id: leagueId,
    name,
    updated_at: new Date().toISOString(),
  };
}

function copyDivisionLinePayload(line, divisionId) {
  const {
    id,
    created_at,
    updated_at,
    ...rest
  } = line;
  void id;
  void created_at;
  void updated_at;

  return {
    ...rest,
    division_id: divisionId,
    updated_at: new Date().toISOString(),
  };
}
