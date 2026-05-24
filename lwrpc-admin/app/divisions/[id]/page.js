"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import { supabase } from "../../lib/auth";
import { confirmDeleteAction } from "../../lib/confirmDelete";

const GLOBAL_DEFAULT_LINES_KEY = "lwrpc-default-lines-config";

export default function DivisionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [division, setDivision] = useState(null);
  const [lines, setLines] = useState([]);

  const [teamNumber, setTeamNumber] = useState("1");
  const [teamName, setTeamName] = useState("");
  const [postedToDupr, setPostedToDupr] = useState(true);
  const [teamType, setTeamType] = useState("doubles");
  const [gameFormat, setGameFormat] = useState("");
  const [gamesPerTeam, setGamesPerTeam] = useState("3");
  const [pointsToWin, setPointsToWin] = useState("11");
  const [winBy, setWinBy] = useState("2");
  const [teamWinPoints, setTeamWinPoints] = useState("1");
  const [editingId, setEditingId] = useState(null);

  const normalizeDefaultLinesConfig = useCallback(function normalizeDefaultLinesConfig(value) {
    if (!value) return [];

    if (Array.isArray(value)) return value;

    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return normalizeDefaultLinesConfig(parsed);
      } catch {
        return [];
      }
    }

    if (Array.isArray(value.lines)) return value.lines;
    if (Array.isArray(value.default_lines)) return value.default_lines;

    return [];
  }, []);

  function loadGlobalDefaultLinesConfig() {
    if (typeof window === "undefined") return [];

    try {
      return normalizeDefaultLinesConfig(
        window.localStorage.getItem(GLOBAL_DEFAULT_LINES_KEY)
      );
    } catch {
      return [];
    }
  }

  function saveGlobalDefaultLinesConfig(linesConfig) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(
        GLOBAL_DEFAULT_LINES_KEY,
        JSON.stringify(linesConfig || [])
      );
    } catch {
      // Local storage is a convenience fallback; database saves still matter most.
    }
  }

  async function loadSharedDefaultLinesConfig() {
    const localDefaults = loadGlobalDefaultLinesConfig();

    if (localDefaults.length > 0) {
      return {
        lines: localDefaults,
        label: "shared default game line set",
      };
    }

    const { data, error } = await supabase
      .from("divisions")
      .select("id, name, default_lines_config, updated_at")
      .neq("id", id)
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
      return {
        lines: [],
        label: "division settings",
      };
    }

    const divisionWithDefaults = (data || []).find(
      (row) => normalizeDefaultLinesConfig(row.default_lines_config).length > 0
    );

    if (!divisionWithDefaults) {
      return {
        lines: [],
        label: "division settings",
      };
    }

    const linesConfig = normalizeDefaultLinesConfig(
      divisionWithDefaults.default_lines_config
    );

    saveGlobalDefaultLinesConfig(linesConfig);

    return {
      lines: linesConfig,
        label: `shared default game line set from ${divisionWithDefaults.name}`,
    };
  }

  const lineSnapshot = useCallback(function lineSnapshot(line, index) {
    return {
      line_number: Number(line.line_number ?? index + 1),
      line_name: line.line_name ?? line.name ?? `Line ${index + 1}`,
      posted_to_dupr: line.posted_to_dupr ?? true,
      line_type: line.line_type ?? "doubles",
      game_format: line.game_format ?? line.format ?? null,
      games_per_line: Number(line.games_per_line ?? line.games_per_team ?? 3),
      points_to_win: Number(line.points_to_win ?? 11),
      win_by: Number(line.win_by ?? 2),
      team_win_points: Number(line.team_win_points ?? 1),
      picklebreaker_enabled: (line.line_type ?? "") === "picklebreaker",
      picklebreaker_points: Number(line.picklebreaker_points ?? line.points_to_win ?? 25),
      picklebreaker_win_points: Number(line.picklebreaker_win_points ?? 1),
      picklebreaker_loss_points: Number(line.picklebreaker_loss_points ?? 0),
      sort_order: Number(line.sort_order ?? line.line_number ?? index + 1),
    };
  }, []);

  const mergeLineWithDefault = useCallback(function mergeLineWithDefault(line, index, defaults) {
    const matchingDefault =
      defaults.find(
        (item) => Number(item.line_number) === Number(line.line_number)
      ) || defaults[index] || {};
    const fallback = lineSnapshot(matchingDefault, index);

    return {
      ...line,
      line_number: Number(line.line_number ?? fallback.line_number),
      line_name: line.line_name || fallback.line_name,
      posted_to_dupr: line.posted_to_dupr ?? fallback.posted_to_dupr,
      line_type: line.line_type || fallback.line_type,
      game_format: line.game_format || fallback.game_format,
      games_per_line: Number(line.games_per_line ?? fallback.games_per_line),
      points_to_win: Number(line.points_to_win ?? fallback.points_to_win),
      win_by: Number(line.win_by ?? fallback.win_by),
      team_win_points: Number(line.team_win_points ?? fallback.team_win_points ?? 1),
      picklebreaker_enabled: (line.line_type || fallback.line_type) === "picklebreaker",
      picklebreaker_points: Number(
        line.picklebreaker_points ?? fallback.picklebreaker_points
      ),
      picklebreaker_win_points: Number(
        line.picklebreaker_win_points ?? fallback.picklebreaker_win_points
      ),
      picklebreaker_loss_points: Number(
        line.picklebreaker_loss_points ?? fallback.picklebreaker_loss_points
      ),
      sort_order: Number(line.sort_order ?? fallback.sort_order),
    };
  }, [lineSnapshot]);

  function linePayloadFromConfig(line, index) {
    return {
      division_id: id,
      ...lineSnapshot(line, index),
    };
  }

  function isDatabaseId(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      String(value || "")
    );
  }

  const hydrateConfiguredLines = useCallback(function hydrateConfiguredLines(divisionData, lineData) {
    const defaultConfig = normalizeDefaultLinesConfig(
      divisionData.default_lines_config
    );
    const dbRows = lineData || [];

    if (defaultConfig.length > 0) {
      return defaultConfig.map((line, index) => {
        const matchingRow =
          dbRows.find(
            (row) => Number(row.line_number) === Number(line.line_number)
          ) || {};

        return {
          ...mergeLineWithDefault(matchingRow, index, defaultConfig),
          ...lineSnapshot(line, index),
          id: matchingRow.id || `config-${line.line_number || index + 1}`,
        };
      });
    }

    return dbRows.map((line, index) => ({
      ...lineSnapshot(line, index),
      ...line,
      id: line.id || `config-${line.line_number || index + 1}`,
    }));
  }, [mergeLineWithDefault, normalizeDefaultLinesConfig, lineSnapshot]);

  function lineTypeLabel(value) {
    const labels = {
      doubles: "Doubles",
      mixed: "Mixed Doubles",
      singles: "Singles",
      picklebreaker: "Picklebreaker",
    };

    return labels[value] || value || "-";
  }

  async function saveDivisionDefaultConfig(nextLines) {
    const orderedLines = [...nextLines]
      .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))
      .map(lineSnapshot);

    if (orderedLines.length === 0) {
      const payload = {
        default_lines_config: [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("divisions")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setDivision((current) => ({
        ...(current || {}),
        ...(data || {}),
        ...payload,
      }));

      return;
    }

    const payload = {
      default_lines_config: orderedLines,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("divisions")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setDivision((current) => ({
      ...(current || {}),
      ...(data || {}),
      ...payload,
    }));

    saveGlobalDefaultLinesConfig(orderedLines);
  }

  const checkAuth = useCallback(async function checkAuth() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      router.push("/login");
      return false;
    }

    return true;
  }, [router]);

  const loadData = useCallback(async function loadData() {
    const { data: divisionData, error: divisionError } = await supabase
      .from("divisions")
      .select(`
        *,
        leagues (
          name,
          seasons (
            name
          )
        )
      `)
      .eq("id", id)
      .single();

    if (divisionError) {
      alert(divisionError.message);
      return;
    }

    const { data: lineData, error: lineError } = await supabase
      .from("division_lines")
      .select("*")
      .eq("division_id", id)
      .order("sort_order", { ascending: true })
      .order("line_number", { ascending: true });

    if (lineError) {
      alert(lineError.message);
      return;
    }

    setDivision(divisionData);
    setLines(hydrateConfiguredLines(divisionData, lineData || []));
  }, [hydrateConfiguredLines, id]);

  async function saveTeam(e) {
    e.preventDefault();

    const requestedLineNumber = Number(teamNumber || 1);
    const duplicateLine = lines.find(
      (line) =>
        Number(line.line_number) === requestedLineNumber &&
        (!editingId || String(line.id) !== String(editingId))
    );

    if (duplicateLine) {
      alert(`Game Number ${requestedLineNumber} is already configured for this division. Choose a different Game Number or edit the existing line.`);
      return;
    }

    const snapshot = {
      line_number: requestedLineNumber,
      line_name: teamName || null,
      posted_to_dupr: postedToDupr,
      line_type: teamType || null,
      game_format: gameFormat || null,
      games_per_line: Number(gamesPerTeam || 3),
      points_to_win: Number(pointsToWin || 11),
      win_by: Number(winBy || 2),
      team_win_points: Number(teamWinPoints || 1),
      picklebreaker_enabled: teamType === "picklebreaker",
      picklebreaker_points: Number(pointsToWin || 11),
      picklebreaker_win_points: 1,
      picklebreaker_loss_points: 0,
      sort_order: requestedLineNumber,
    };

    const payload = {
      division_id: id,
      ...snapshot,
      updated_at: new Date().toISOString(),
    };

    let savedRow = null;

    if (editingId && isDatabaseId(editingId)) {
      const result = await supabase
        .from("division_lines")
        .update(payload)
        .eq("id", editingId)
        .select("*")
        .maybeSingle();

      if (result.error) {
        alert(result.error.message);
        return;
      }

      savedRow = result.data;
    } else if (!editingId) {
      const result = await supabase
        .from("division_lines")
        .insert(payload)
        .select("*")
        .maybeSingle();

      if (result.error) {
        alert(result.error.message);
        return;
      }

      savedRow = result.data;
    }

    const savedLine = {
      ...(savedRow || {}),
      ...snapshot,
      id: savedRow?.id || editingId || `config-${snapshot.line_number}-${Date.now()}`,
    };

    const nextLines = editingId
      ? lines.map((line) =>
          String(line.id) === String(editingId) ? savedLine : line
        )
      : [...lines, savedLine];

    const sortedNextLines = nextLines.sort(
      (a, b) => Number(a.line_number || 0) - Number(b.line_number || 0)
    );

    setLines(sortedNextLines);
    await saveDivisionDefaultConfig(sortedNextLines);
    clearForm();
  }

  async function deleteTeam(lineId) {
    const ok = confirmDeleteAction({
      title: "Delete this configured game line?",
      details: "This removes the configured game line from the division and default game line set. Existing generated matches may still reference older lines, and future schedules may be generated differently.",
    });
    if (!ok) return;

    if (isDatabaseId(lineId)) {
      const { error } = await supabase
        .from("division_lines")
        .delete()
        .eq("id", lineId);

      if (error) {
        alert(error.message);
        return;
      }
    }

    const nextLines = lines.filter((line) => String(line.id) !== String(lineId));
    setLines(nextLines);

    await saveDivisionDefaultConfig(nextLines);
  }

  async function saveConfiguredLinesAsDefault() {
    if (lines.length === 0) {
      const okToClear = confirm(
        "There are no configured game lines. Clear the saved default game line set for this division?"
      );

      if (!okToClear) return;

      await saveDivisionDefaultConfig([]);
      alert("Default lines cleared.");
      return;
    }

    const ok = confirm(
      `Save all ${lines.length} configured game lines as the default game line set for this division?`
    );

    if (!ok) return;

    await saveDivisionDefaultConfig(lines);

    alert("Default lines saved.");
  }

  async function generateDefaultTeams() {
    if (!division) return;

    const configuredDefaults = lines.length > 0
      ? [...lines]
          .sort((a, b) => Number(a.line_number || 0) - Number(b.line_number || 0))
          .map(lineSnapshot)
      : [];
    const savedDefaults = normalizeDefaultLinesConfig(division.default_lines_config);
    const sharedDefaults = await loadSharedDefaultLinesConfig();
    const sourceDefaults =
      configuredDefaults.length > 0 &&
      (savedDefaults.length === 0 || configuredDefaults.length >= savedDefaults.length)
        ? configuredDefaults
        : savedDefaults.length > 0
          ? savedDefaults
          : sharedDefaults.lines;

    const count = sourceDefaults.length || division.number_of_lines || 3;
    const sourceLabel =
      sourceDefaults === configuredDefaults
        ? "currently configured game lines"
        : savedDefaults.length > 0
          ? "saved default game line set"
          : sharedDefaults.lines.length > 0
            ? sharedDefaults.label
          : "division settings";
    const existingLineIds = lines
      .map((line) => line.id)
      .filter((lineId) => isDatabaseId(lineId));
    const actionLabel =
      lines.length > 0
        ? `Replace the ${lines.length} currently configured game lines with ${count} game lines from the ${sourceLabel}?`
        : `Generate ${count} default game lines from the ${sourceLabel}?`;

    const ok = confirm(
      `${actionLabel}${
        lines.length > 0
          ? " Existing generated matches will not be changed."
          : ""
      }`
    );

    if (!ok) return;

    const rows =
      sourceDefaults.length > 0
        ? sourceDefaults.map(linePayloadFromConfig)
        : Array.from({ length: count }, (_, index) => ({
            division_id: id,
            line_number: index + 1,
            line_name: `Line ${index + 1}`,
            posted_to_dupr: true,
            line_type: "doubles",
            game_format: division.default_game_format || null,
            games_per_line: division.games_per_line || 3,
            points_to_win: division.points_to_win || 11,
            win_by: division.win_by || 2,
            team_win_points: 1,
            picklebreaker_enabled: false,
            picklebreaker_points: division.points_to_win || 11,
            picklebreaker_win_points: 1,
            picklebreaker_loss_points: 0,
            sort_order: index + 1,
          }));

    if (existingLineIds.length > 0) {
      const deleteOk = confirmDeleteAction({
        title: "Replace this division's configured game lines?",
        details:
          "This will delete the existing configured game-line rows for this division and recreate them from the selected defaults. Existing generated matches are checked first and will block the replacement if they already use these game lines.",
      });

      if (!deleteOk) return;

      const { data: usedLines, error: usedLinesError } = await supabase
        .from("match_lines")
        .select("id")
        .in("division_line_id", existingLineIds)
        .limit(1);

      if (usedLinesError) {
        alert(usedLinesError.message);
        return;
      }

      if ((usedLines || []).length > 0) {
        alert(
          "These configured game lines are already used by generated matches. Delete or regenerate the schedule before replacing this division's game lines."
        );
        return;
      }

      const { error: deleteError } = await supabase
        .from("division_lines")
        .delete()
        .eq("division_id", id);

      if (deleteError) {
        alert(deleteError.message);
        return;
      }
    }

    const { data: insertedRows, error } = await supabase
      .from("division_lines")
      .insert(rows)
      .select("*");

    if (error) {
      alert(error.message);
      return;
    }

    const nextLines = (insertedRows?.length ? insertedRows : rows).sort(
      (a, b) => Number(a.line_number || 0) - Number(b.line_number || 0)
    );

    setLines(nextLines);
    await saveDivisionDefaultConfig(nextLines);
  }

  function editTeam(line) {
    setEditingId(line.id);
    setTeamNumber(String(line.line_number || 1));
    setTeamName(line.line_name || "");
    setPostedToDupr(line.posted_to_dupr ?? true);
    setTeamType(line.line_type || "doubles");
    setGameFormat(line.game_format || "");
    setGamesPerTeam(String(line.games_per_line || 3));
    setPointsToWin(String(line.points_to_win || 11));
    setWinBy(String(line.win_by || 2));
    setTeamWinPoints(String(line.team_win_points ?? 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    setEditingId(null);
    setTeamNumber("1");
    setTeamName("");
    setPostedToDupr(true);
    setTeamType("doubles");
    setGameFormat("");
    setGamesPerTeam("3");
    setPointsToWin("11");
    setWinBy("2");
    setTeamWinPoints("1");
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok && id) {
        loadData();
      }
    }

    run();
  }, [checkAuth, id, loadData]);

  if (!division) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-6xl">
          <AppHeader
            title="Configure Game Lines"
            subtitle="Manage division game line setup, scoring, and default game line sets."
          />

          <div className="rounded-2xl bg-white p-6 shadow">
          Loading division...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <AppHeader
          title="Configure Game Lines"
          subtitle={`${division.name} game line setup, scoring, and default game line sets.`}
        />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push("/divisions")}
            className="rounded-xl bg-slate-200 px-4 py-2 font-semibold hover:bg-slate-300"
          >
            ← Back to Divisions
          </button>

          <button
            type="button"
            onClick={generateDefaultTeams}
            className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
          >
            Generate Default Game Lines
          </button>

          <button
            type="button"
            onClick={saveConfiguredLinesAsDefault}
            className="rounded-xl bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
          >
            Save Configured Game Lines as Default
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h1 className="text-3xl font-bold text-slate-900">{division.name}</h1>

          <p className="mt-1 text-slate-600">
            {division.leagues?.name || "No League"} · {division.leagues?.seasons?.name || "No Season"}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Info label="DUPR Range" value={`${division.min_dupr ?? "—"} to ${division.max_dupr ?? "—"}`} />
            <Info label="Doubles Team DUPR Maximum" value={division.team_dupr_max ?? "—"} />
            <Info label="Number of Teams" value={division.number_of_lines ?? 3} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? "Edit Game Line" : "Add Game Line"}
            </h2>

            <form onSubmit={saveTeam} className="mt-4 space-y-5">
              <div>
                <FieldLabel label="Game Number" />
                <input
                  type="number"
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Game Number"
                />
                <p className="mt-1 text-xs text-slate-500">
                  The game slot this doubles setup appears in, such as Game 1, Game 2, or Game 3.
                </p>
              </div>

              <div>
                <FieldLabel label="Line Name" />
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Example: Game 1"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Optional label shown to captains. Usually Game 1, Game 2, Game 3, etc.
                </p>
              </div>

              <div>
                <FieldLabel label="Line Type" />
                <select
                  value={teamType}
                  onChange={(e) => setTeamType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                >
                  <option value="doubles">Doubles</option>
                  <option value="mixed">Mixed Doubles</option>
                  <option value="singles">Singles</option>
                  <option value="picklebreaker">Picklebreaker</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  The type of play for this line.
                </p>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-300 px-4 py-3">
                <input
                  type="checkbox"
                  checked={postedToDupr}
                  onChange={(e) => setPostedToDupr(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium text-slate-700">Post this line to DUPR</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Enable this if scores from this configured game line should be included in DUPR exports.
                  </span>
                </span>
              </label>

              <div>
                <FieldLabel label="Game Format" />
                <input
                  value={gameFormat}
                  onChange={(e) => setGameFormat(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3"
                  placeholder="Example: Single game or Best 2 of 3"
                />
                <p className="mt-1 text-xs text-slate-500">
                  How each game for this line is scored or structured.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <FieldLabel label="Games / Line" />
                  <input
                    type="number"
                    value={gamesPerTeam}
                    onChange={(e) => setGamesPerTeam(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Games"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Number of score rows for this line.
                  </p>
                </div>

                <div>
                  <FieldLabel label="Points To Win" />
                  <input
                    type="number"
                    value={pointsToWin}
                    onChange={(e) => setPointsToWin(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Points"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Standard winning score.
                  </p>
                </div>

                <div>
                  <FieldLabel label="Win By" />
                  <input
                    type="number"
                    value={winBy}
                    onChange={(e) => setWinBy(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Win By"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Minimum margin needed to win.
                  </p>
                </div>

                <div>
                  <FieldLabel label="Team Win Points" />
                  <input
                    type="number"
                    value={teamWinPoints}
                    onChange={(e) => setTeamWinPoints(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3"
                    placeholder="Points"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Points awarded to the team that wins this game line.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                >
                  {editingId ? "Save Game Line" : "Add Game Line"}
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
            <h2 className="text-xl font-bold text-slate-900">Configured Game Lines</h2>

            <div className="mt-4 space-y-3">
              {lines.map((line) => (
                <div key={line.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-bold text-slate-900">
                        Game {line.line_number}: {line.line_name || "Unnamed"}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Type: {lineTypeLabel(line.line_type)}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        DUPR Posted: {line.posted_to_dupr ? "Yes" : "No"}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Format: {line.game_format || "—"}
                      </div>

                      <div className="mt-1 text-sm text-slate-600">
                        Games / Line: {line.games_per_line} · To {line.points_to_win} · Win by {line.win_by} · Team win points: {line.team_win_points ?? 1}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editTeam(line)}
                        className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 hover:bg-blue-200"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTeam(line.id)}
                        className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {lines.length === 0 && (
                <div className="text-slate-500">
                  No game lines configured yet. Use Generate Default Game Lines or add game lines manually.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FieldLabel({ label }) {
  return (
    <label className="mb-1 block text-sm font-semibold text-slate-700">
      {label}
    </label>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
    </div>
  );
}





