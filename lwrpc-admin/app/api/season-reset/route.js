import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "commissioner");

    if (authorization.error) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status }
      );
    }

    const body = await req.json().catch(() => ({}));

    if (!body.seasonId) {
      return NextResponse.json(
        { success: false, error: "Select a season to reset." },
        { status: 400 }
      );
    }

    if (body.confirmation !== "RESET SEASON") {
      return NextResponse.json(
        { success: false, error: "Confirmation text did not match." },
        { status: 400 }
      );
    }

    const { data, error } = await authorization.supabase.rpc(
      "admin_reset_season",
      { p_season_id: body.seasonId }
    );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      season: data?.season || null,
      updated: data || {},
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
