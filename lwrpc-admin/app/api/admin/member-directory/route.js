import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "../../../lib/serverSupabase";
import { normalizeEmailAddress } from "../../../lib/email";

export const runtime = "nodejs";

const PAGE_SIZE = 100;
const LAST_LOGIN_CACHE_MS = 5 * 60 * 1000;
let lastLoginCache = { loadedAt: 0, values: {} };

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") === "roles" ? "roles" : "members";
    const authorization = await authorizeAdminRequest(
      req,
      mode === "roles" ? "commissioner" : "league_manager"
    );

    if (authorization.error) {
      return NextResponse.json(
        { success: false, error: authorization.error },
        { status: authorization.status }
      );
    }

    const page = positiveInteger(url.searchParams.get("page"), 1);
    const pageSize = Math.min(
      positiveInteger(url.searchParams.get("pageSize"), PAGE_SIZE),
      PAGE_SIZE
    );
    const { data, error } = await authorization.supabase.rpc(
      "admin_member_directory_page",
      {
        p_search: url.searchParams.get("search") || "",
        p_include_inactive:
          mode === "roles" || url.searchParams.get("includeInactive") === "true",
        p_current_roster_only:
          mode === "members" &&
          url.searchParams.get("currentRosterOnly") === "true",
        p_sort_key: allowedSortKey(url.searchParams.get("sort")),
        p_sort_direction:
          url.searchParams.get("direction") === "desc" ? "desc" : "asc",
        p_offset: (page - 1) * pageSize,
        p_limit: pageSize,
      }
    );

    if (error) throw error;

    const result = data || {};
    let rows = Array.isArray(result.rows) ? result.rows : [];
    const memberIds = rows.map((member) => member.id).filter(Boolean);

    if (memberIds.length > 0) {
      const { data: roleRows, error: roleError } = await authorization.supabase
        .from("user_roles")
        .select("id, member_id, role")
        .in("member_id", memberIds);

      if (roleError) throw roleError;

      const rolesByMemberId = (roleRows || []).reduce((byMember, role) => {
        if (!byMember[role.member_id]) byMember[role.member_id] = [];
        byMember[role.member_id].push(role);
        return byMember;
      }, {});

      rows = rows.map((member) => ({
        ...member,
        user_roles: rolesByMemberId[member.id] || [],
      }));
    }

    let lastLoginsByEmail = {};

    if (mode === "roles") {
      const allLastLogins = await loadLastLogins(authorization.supabase);
      lastLoginsByEmail = Object.fromEntries(
        rows
          .map((member) => normalizeEmailAddress(member.email))
          .filter(Boolean)
          .map((email) => [email, allLastLogins[email] || null])
      );
    }

    return NextResponse.json({
      success: true,
      rows,
      filteredCount: Number(result.filtered_count || 0),
      totalCount: Number(result.total_count || 0),
      lastLoginsByEmail,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function allowedSortKey(value) {
  return ["member", "location", "phone", "dupr_id", "status", "role"].includes(
    value
  )
    ? value
    : "member";
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
