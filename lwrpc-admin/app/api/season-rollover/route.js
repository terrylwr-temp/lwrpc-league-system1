import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../lib/serverSupabase";

export const runtime = "nodejs";

const OMITTED_COLUMNS = new Set(["id", "created_at", "updated_at"]);

function copyRow(row, overrides = {}) {
  return {
    ...Object.fromEntries(Object.entries(row).filter(([key]) => !OMITTED_COLUMNS.has(key))),
    ...overrides,
    updated_at: new Date().toISOString(),
  };
}

async function loadRows(supabase, table, column, values) {
  if (values.length === 0) return [];
  const { data, error } = await supabase.from(table).select("*").in(column, values);
  if (error) throw error;
  return data || [];
}

async function insertCopy(supabase, table, row, overrides) {
  const { data, error } = await supabase
    .from(table)
    .insert(copyRow(row, overrides))
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");
    if (authorization.error) {
      return NextResponse.json({ success: false, error: authorization.error }, { status: authorization.status });
    }

    const body = await req.json().catch(() => ({}));
    const sourceSeasonId = String(body.sourceSeasonId || "").trim();
    const name = String(body.name || "").trim();
    if (!sourceSeasonId || !name) {
      return NextResponse.json({ success: false, error: "Choose a source season and enter a new season name." }, { status: 400 });
    }

    const supabase = authorization.supabase;
    const { data: sourceSeason, error: sourceError } = await supabase
      .from("seasons")
      .select("id")
      .eq("id", sourceSeasonId)
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!sourceSeason) return NextResponse.json({ success: false, error: "Source season was not found." }, { status: 404 });

    const { data: existingSeason, error: existingError } = await supabase
      .from("seasons")
      .select("id")
      .eq("name", name)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingSeason) return NextResponse.json({ success: false, error: "A season with that name already exists." }, { status: 409 });

    const { data: newSeason, error: seasonError } = await supabase
      .from("seasons")
      .insert({
        name,
        abbreviation: String(body.abbreviation || "").trim() || null,
        start_date: body.startDate || null,
        end_date: body.endDate || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (seasonError) throw seasonError;

    const { data: sourceLeagues, error: leaguesError } = await supabase
      .from("leagues")
      .select("*")
      .eq("season_id", sourceSeasonId)
      .order("name");
    if (leaguesError) throw leaguesError;

    const leagueIdMap = new Map();
    for (const league of sourceLeagues || []) {
      leagueIdMap.set(String(league.id), await insertCopy(supabase, "leagues", league, { season_id: newSeason.id, is_active: true }));
    }

    const sourceDivisions = await loadRows(supabase, "divisions", "league_id", [...leagueIdMap.keys()]);
    const divisionIdMap = new Map();
    for (const division of sourceDivisions) {
      divisionIdMap.set(String(division.id), await insertCopy(supabase, "divisions", division, { league_id: leagueIdMap.get(String(division.league_id)), is_active: true }));
    }

    const sourceLines = await loadRows(supabase, "division_lines", "division_id", [...divisionIdMap.keys()]);
    for (const line of sourceLines) {
      await insertCopy(supabase, "division_lines", line, { division_id: divisionIdMap.get(String(line.division_id)) });
    }

    const sourceTeams = await loadRows(supabase, "teams", "division_id", [...divisionIdMap.keys()]);
    const teamIdMap = new Map();
    for (const team of sourceTeams) {
      teamIdMap.set(String(team.id), await insertCopy(supabase, "teams", team, { division_id: divisionIdMap.get(String(team.division_id)), is_active: true }));
    }

    let rosterCount = 0;
    if (body.copyRosters !== false) {
      const sourceRoster = await loadRows(supabase, "team_members", "team_id", [...teamIdMap.keys()]);
      for (const membership of sourceRoster) {
        await insertCopy(supabase, "team_members", membership, { team_id: teamIdMap.get(String(membership.team_id)) });
        rosterCount += 1;
      }
    }

    return NextResponse.json({
      success: true,
      seasonId: newSeason.id,
      copied: {
        leagues: leagueIdMap.size,
        divisions: divisionIdMap.size,
        configuredLines: sourceLines.length,
        teams: teamIdMap.size,
        rosterMemberships: rosterCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message || "Unable to copy the season forward." }, { status: 500 });
  }
}
