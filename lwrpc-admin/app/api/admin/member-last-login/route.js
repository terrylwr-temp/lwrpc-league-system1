import { NextResponse } from "next/server";
import { normalizeEmailAddress } from "../../../lib/email";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";

export const runtime = "nodejs";

const LAST_LOGIN_CACHE_MS = 5 * 60 * 1000;
let lastLoginCache = { loadedAt: 0, values: {} };

export async function GET(req) {
  try {
    const authorization = await authorizeAdminRequest(req, "league_manager");

    if (authorization.error) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status }
      );
    }

    const memberId = new URL(req.url).searchParams.get("memberId");

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: "A member ID is required." },
        { status: 400 }
      );
    }

    const { data: member, error: memberError } = await authorization.supabase
      .from("members")
      .select("email")
      .eq("id", memberId)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found." },
        { status: 404 }
      );
    }

    const email = normalizeEmailAddress(member.email);
    const lastLoginsByEmail = await loadLastLogins(authorization.supabase);

    return NextResponse.json({
      success: true,
      lastLogin: email ? lastLoginsByEmail[email] || null : null,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function loadLastLogins(supabase) {
  if (Date.now() - lastLoginCache.loadedAt < LAST_LOGIN_CACHE_MS) {
    return lastLoginCache.values;
  }

  const values = {};
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    (data?.users || []).forEach((user) => {
      const email = normalizeEmailAddress(user.email);
      if (email) values[email] = user.last_sign_in_at || null;
    });

    if (!data?.users || data.users.length < perPage) break;
  }

  lastLoginCache = { loadedAt: Date.now(), values };
  return values;
}
