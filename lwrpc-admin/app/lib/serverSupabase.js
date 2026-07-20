import { createClient } from "@supabase/supabase-js";
import { hasRole, ROLE_LEVELS } from "./permissions";

export function createAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function createAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase anon credentials are not configured.");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function authorizeAdminRequest(req, requiredRole) {
  const token = (req.headers.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!token) {
    return { error: "Not authorized.", status: 401 };
  }

  const authSupabase = createAnonSupabase();
  const { data: userData, error: userError } = await authSupabase.auth.getUser(token);
  const email = String(userData?.user?.email || "").trim().toLowerCase();

  if (userError || !email) {
    return { error: "Not authorized.", status: 401 };
  }

  const supabase = createAdminSupabase();
  const { data: memberRows, error: roleError } = await supabase
    .from("members")
    .select("id, is_active_member, user_roles(role)")
    .eq("email", email)
    .order("created_at", { ascending: true });

  if (roleError) {
    return { error: roleError.message, status: 500 };
  }

  const activeRows = (memberRows || []).filter((row) => row.is_active_member !== false);
  const eligibleRows = activeRows.length > 0 ? activeRows : memberRows || [];
  const role = highestRole(eligibleRows.flatMap((row) => row.user_roles || []));

  if (!hasRole(role, requiredRole)) {
    return { error: `This operation requires ${requiredRole.replaceAll("_", " ")} access.`, status: 403 };
  }

  return {
    supabase,
    user: userData.user,
    memberRows: eligibleRows,
    role,
    token,
  };
}

function highestRole(roleRows) {
  return (roleRows || []).reduce((highest, row) => {
    const role = row?.role || "player";
    return (ROLE_LEVELS[role] || 0) > (ROLE_LEVELS[highest] || 0) ? role : highest;
  }, "player");
}
