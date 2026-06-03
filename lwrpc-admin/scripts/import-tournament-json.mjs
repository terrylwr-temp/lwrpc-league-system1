import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

loadDotEnv(".env.local");
loadDotEnv(".env");

const args = parseArgs(process.argv.slice(2));
const filePath = args.file || args._[0];
const tournamentName = args.name || "Imported Tournament";
const tournamentSlug = args.slug || slugify(tournamentName);
const adminCode = args.code || "1234";

if (!filePath) {
  console.error("Usage: npm run import:tournament -- --file path/to/tournament.json --name \"Tournament Name\" --slug tournament-slug --code 1234");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase URL or service role key. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const raw = JSON.parse(await readFile(filePath, "utf8"));
const data = normalizeData(raw);

const tournament = await upsertTournament(data);
const divisionByName = await importDivisions(tournament.id, data);
const teamByKey = await importTeams(tournament.id, data, divisionByName);
const courtByName = await importCourts(tournament.id, data);
await importMatches(tournament.id, data, divisionByName, teamByKey, courtByName);
await importLegacyLog(tournament.id, data);

console.log(`Imported "${tournament.name}" (${tournament.id})`);
console.log(`Public display: /tourney/${tournament.slug || tournament.id}/display`);
console.log(`Admin: /tourney/${tournament.slug || tournament.id}/admin`);

async function upsertTournament(data) {
  const { data: existing, error: existingError } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", tournamentSlug)
    .maybeSingle();

  if (existingError) throw existingError;

  const payload = {
    name: data.tournamentName || tournamentName,
    slug: tournamentSlug,
    public_status: "public",
    admin_code: adminCode,
    settings: {
      ...(data.settings || {}),
      importedFrom: path.basename(filePath),
      importedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data: updated, error } = await supabase
      .from("tournaments")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return updated;
  }

  const { data: inserted, error } = await supabase
    .from("tournaments")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return inserted;
}

async function importDivisions(tournamentId, data) {
  const names = divisionsList(data);

  const rows = names.map((name, index) => ({
    tournament_id: tournamentId,
    name,
    sort_order: index + 1,
    is_active: data.divisionSettings?.[name]?.active !== false,
    settings: data.divisionSettings?.[name] || {},
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("tournament_divisions")
      .upsert(rows, { onConflict: "tournament_id,name" });
    if (error) throw error;
  }

  const { data: divisions, error } = await supabase
    .from("tournament_divisions")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (error) throw error;

  return Object.fromEntries((divisions || []).map((division) => [division.name, division]));
}

async function importTeams(tournamentId, data, divisionByName) {
  const teamByKey = {};

  for (const entry of allTeams(data)) {
    const division = divisionByName[entry.division];
    const lineNumber = Number(entry.line) || 1;

    const payload = {
      tournament_id: tournamentId,
      division_id: division?.id || null,
      name: entry.team,
      line_number: lineNumber,
      seed: entry.standing || null,
      player_1_name: entry.player1 || null,
      player_2_name: entry.player2 || null,
      player_1_checked_in: entry.player1CheckedIn === true,
      player_2_checked_in: entry.player2CheckedIn === true,
      checked_in: entry.checkedIn === true,
      updated_at: new Date().toISOString(),
    };

    let existingQuery = supabase
      .from("tournament_teams")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("name", entry.team)
      .eq("line_number", lineNumber);

    existingQuery = division?.id
      ? existingQuery.eq("division_id", division.id)
      : existingQuery.is("division_id", null);

    const { data: existing, error: existingError } = await existingQuery.maybeSingle();

    if (existingError) throw existingError;

    const { data: team, error } = existing
      ? await supabase.from("tournament_teams").update(payload).eq("id", existing.id).select("*").single()
      : await supabase.from("tournament_teams").insert(payload).select("*").single();

    if (error) throw error;

    await upsertContact(team.id, 1, entry.player1, entry.phone1);
    await upsertContact(team.id, 2, entry.player2, entry.phone2);

    teamByKey[teamKey(entry.division, lineNumber, entry.team)] = team;
  }

  return teamByKey;
}

async function upsertContact(teamId, slot, displayName, phone) {
  if (!displayName && !phone) return;

  const { error } = await supabase
    .from("tournament_team_contacts")
    .upsert({
      tournament_team_id: teamId,
      player_slot: slot,
      display_name: displayName || null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tournament_team_id,player_slot" });

  if (error) throw error;
}

async function importCourts(tournamentId, data) {
  const rows = (data.courts || []).map((court, index) => ({
    tournament_id: tournamentId,
    name: String(court.num || index + 1),
    sort_order: index + 1,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("tournament_courts")
      .upsert(rows, { onConflict: "tournament_id,name" });
    if (error) throw error;
  }

  const { data: courts, error } = await supabase
    .from("tournament_courts")
    .select("*")
    .eq("tournament_id", tournamentId);
  if (error) throw error;

  return Object.fromEntries((courts || []).map((court) => [String(court.name), court]));
}

async function importMatches(tournamentId, data, divisionByName, teamByKey, courtByName) {
  for (const [index, match] of (data.matches || []).entries()) {
    const lineNumber = Number(match.line) || 1;
    const division = divisionByName[match.division];
    const homeTeam = teamByKey[teamKey(match.division, lineNumber, match.home)];
    const awayTeam = teamByKey[teamKey(match.division, lineNumber, match.away)];
    const court = match.court ? courtByName[String(match.court)] : null;
    const winner = match.winner ? teamByKey[teamKey(match.division, lineNumber, match.winner)] : null;
    const legacyId = String(match.id || `legacy-${index + 1}`);

    const payload = {
      tournament_id: tournamentId,
      division_id: division?.id || null,
      home_team_id: homeTeam?.id || null,
      away_team_id: awayTeam?.id || null,
      court_id: court?.id || null,
      legacy_id: legacyId,
      line_number: lineNumber,
      status: normalizeMatchStatus(match.status, match.resultType),
      result_type: match.resultType || null,
      winner_team_id: winner?.id || null,
      home_score: numberOrNull(match.scoreA),
      away_score: numberOrNull(match.scoreB),
      game_scores: Array.isArray(match.gameScores) ? match.gameScores : null,
      score_text: match.scoreText || null,
      queue_entered_at: dateOrNull(match.queueEnteredAt),
      assigned_at: dateOrNull(match.assignedAt),
      completed_at: dateOrNull(match.completedAt),
      created_order: legacyOrderValue(match.createdOrder, legacyId, index),
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("tournament_matches")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("legacy_id", legacyId)
      .maybeSingle();

    if (existingError) throw existingError;

    const { error } = existing
      ? await supabase.from("tournament_matches").update(payload).eq("id", existing.id)
      : await supabase.from("tournament_matches").insert(payload);

    if (error) throw error;
  }
}

async function importLegacyLog(tournamentId, data) {
  const rows = (data.log || []).slice(0, 500).map((row) => ({
    tournament_id: tournamentId,
    log_type: row.type || "legacy",
    message: row.message || "Legacy tournament log entry",
    metadata: row,
    created_at: row.time || new Date().toISOString(),
  }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("tournament_activity_log").insert(rows);
  if (error) throw error;
}

function normalizeData(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  if (!data.tournamentName) data.tournamentName = tournamentName;
  if (!data.settings) data.settings = {};
  if (!data.divisions || typeof data.divisions !== "object" || Array.isArray(data.divisions)) data.divisions = {};
  if (!data.divisionSettings) data.divisionSettings = {};
  if (!Array.isArray(data.matches)) data.matches = [];
  if (!Array.isArray(data.courts) || data.courts.length === 0) {
    data.courts = Array.from({ length: 6 }, (_, index) => ({ num: String(index + 1), matchId: null }));
  }
  if (!Array.isArray(data.log)) data.log = [];
  return data;
}

function allTeams(data) {
  return Object.entries(data.divisions || {}).flatMap(([division, teams]) =>
    (teams || []).map((team) => ({
      division,
      team: team.team || team.teamName || team.name || "Unnamed Team",
      line: Number(team.line) || 1,
      standing: team.standing || "",
      player1: team.player1 || team.name || "",
      player2: team.player2 || team.name2 || "",
      phone1: formatPhone(team.phone1 || team.phone || ""),
      phone2: formatPhone(team.phone2 || ""),
      player1CheckedIn: team.player1CheckedIn === true || team.checkedIn === true,
      player2CheckedIn: team.player2CheckedIn === true || team.checkedIn === true,
      checkedIn: team.checkedIn === true,
    }))
  );
}

function divisionsList(data) {
  return [...new Set([
    ...Object.keys(data.divisions || {}),
    ...allTeams(data).map((team) => team.division),
  ])].filter(Boolean).sort();
}

function teamKey(division, line, team) {
  return `${division}|||${Number(line) || 1}|||${team}`;
}

function normalizeMatchStatus(status, resultType) {
  if (resultType === "not_played") return "not_played";
  if (["pending", "playing", "done", "not_played"].includes(status)) return status;
  return "pending";
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function legacyOrderValue(createdOrder, legacyId, index) {
  const value = Number(createdOrder || String(legacyId || "").replace(/\D/g, ""));
  return Number.isFinite(value) && value > 0 && value <= 2147483647 ? Math.trunc(value) : index + 1;
}

function dateOrNull(value) {
  if (!value) return null;
  if (typeof value === "number") return new Date(value).toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function slugify(value) {
  return String(value || "tournament")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tournament";
}

function parseArgs(argv) {
  const parsed = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      parsed[key] = argv[index + 1];
      index += 1;
    } else {
      parsed._.push(arg);
    }
  }

  return parsed;
}

function loadDotEnv(file) {
  if (!existsSync(file)) return;

  const content = readFileSync(file, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}
