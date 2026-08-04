import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");

    if (authorization.error) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status }
      );
    }

    const body = await req.json().catch(() => ({}));
    const teamId = String(body.teamId || "").trim();

    if (!teamId) {
      return NextResponse.json(
        { success: false, error: "Select a team to delete." },
        { status: 400 }
      );
    }

    const { data, error } = await authorization.supabase
      .from("teams")
      .delete()
      .eq("id", teamId)
      .select("id")
      .maybeSingle();

    if (error) {
      const message = error.code === "23503"
        ? "This team is still used by league records and cannot be deleted until those dependent records are removed."
        : error.message;
      return NextResponse.json({ success: false, error: message }, { status: 409 });
    }

    if (!data?.id) {
      return NextResponse.json(
        { success: false, error: "The team was not found or was already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, teamId: data.id });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Unable to delete the team." },
      { status: 500 }
    );
  }
}
