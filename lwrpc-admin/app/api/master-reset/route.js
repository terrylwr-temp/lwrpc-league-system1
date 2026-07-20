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

    if (body.confirmation !== "MASTER RESET ALL") {
      return NextResponse.json(
        { success: false, error: "Confirmation text did not match." },
        { status: 400 }
      );
    }

    const { data, error } = await authorization.supabase.rpc(
      "admin_master_reset_all"
    );

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deleted: data || {},
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
