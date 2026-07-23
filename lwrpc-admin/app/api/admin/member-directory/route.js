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
    const sortKey = allowedSortKey(url.searchParams.get("sort"));
    const sortDirection = url.searchParams.get("direction") === "desc" ? "desc" : "asc";
    const { data, error } = await authorization.supabase.rpc(
      "admin_member_directory_page",
      {
        p_search: url.searchParams.get("search") || "",
        p_include_inactive:
          mode === "roles" || url.searchParams.get("includeInactive") === "true",
        p_current_roster_only:
          mode === "members" &&
          url.searchParams.get("currentRosterOnly") === "true",
        p_sort_key: sortKey === "last_login" ? "member" : sortKey,
        p_sort_direction: sortDirection,
        p_offset: (page - 1) * pageSize,
        p_limit: pageSize,
      }
    );

    if (error) throw error;

    let result = data || {};
    let rows = Array.isArray(result.rows) ? result.rows : [];
    let allLastLogins = null;

    if (mode === "roles" && sortKey === "last_login") {
      const filteredCount = Number(result.filtered_count || 0);
      if (filteredCount > rows.length) {
        // The database function intentionally limits every request to 100 rows.
        // Collect each safe page before sorting by the Auth-only last-login value.
        const allRows = [];
        for (let offset = 0; offset < filteredCount; offset += PAGE_SIZE) {
          const { data: pageData, error: pageError } = await authorization.supabase.rpc(
            "admin_member_directory_page",
            {
              p_search: url.searchParams.get("search") || "",
              p_include_inactive: true,
              p_current_roster_only: false,
              p_sort_key: "member",
              p_sort_direction: "asc",
              p_offset: offset,
              p_limit: PAGE_SIZE,
            }
          );
          if (pageError) throw pageError;

          const pageRows = Array.isArray(pageData?.rows) ? pageData.rows : [];
          allRows.push(...pageRows);
          if (pageRows.length < PAGE_SIZE) break;
        }
        rows = allRows;
      }

      allLastLogins = await loadLastLogins(authorization.supabase);
      rows.sort((left, right) => compareLastLogin(left, right, allLastLogins, sortDirection));
      rows = rows.slice((page - 1) * pageSize, page * pageSize);
    }

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
      allLastLogins = allLastLogins || await loadLastLogins(authorization.supabase);
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
  return ["member", "location", "phone", "dupr_id", "status", "role", "last_login"].includes(
    value
  )
    ? value
    : "member";
}

function compareLastLogin(left, right, lastLoginsByEmail, direction) {
  const leftValue = Date.parse(lastLoginsByEmail[normalizeEmailAddress(left.email)] || "") || 0;
  const rightValue = Date.parse(lastLoginsByEmail[normalizeEmailAddress(right.email)] || "") || 0;
  if (leftValue === rightValue) return String(left.last_name || left.email || "").localeCompare(String(right.last_name || right.email || ""));
  const order = leftValue - rightValue;
  return direction === "desc" ? -order : order;
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
