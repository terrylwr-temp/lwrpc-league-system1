import { createClient } from "@supabase/supabase-js";
import { liveSessionBinding } from "./liveLmsReceipts.js";
import { hasRole, ROLE_LEVELS } from "./permissions.js";

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

export const LIVE_AUTH_TIMEOUT_MS = 5000;
const identityUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class LiveAuthenticationError extends Error {
  constructor(status, category) { super(category); this.name = "LiveAuthenticationError"; this.status = status; }
}

// Online provider validation is the identity authority; decoded claims only bind
// the already verified token to opaque context. Never return the token/user object.
export async function authenticateRequestIdentity(request, { clientFactory = createClient, timeoutMs = LIVE_AUTH_TIMEOUT_MS } = {}) {
  const started = performance.now();
  const header = request.headers.get("authorization") || "";
  if (header.length > 16384 || !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/i.test(header)) throw new LiveAuthenticationError(401, "live_auth_invalid");
  const token = header.slice(7);
  const controller = new AbortController();
  let timer;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new LiveAuthenticationError(503, "live_auth_unavailable");
    const client = clientFactory(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (url, init) => fetch(url, { ...init, signal: controller.signal }) },
    });
    const response = await Promise.race([
      client.auth.getUser(token),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new LiveAuthenticationError(503, "live_auth_timeout")); }, timeoutMs); }),
    ]);
    if (response?.error) {
      const status = response.error.status;
      throw new LiveAuthenticationError([400,401,403,404,422].includes(status) ? 401 : 503, "live_auth_rejected");
    }
    const user = response?.data?.user;
    if (!user || !identityUuid.test(user.id || "")) throw new LiveAuthenticationError(503, "live_auth_unavailable");
    if (user.is_anonymous) throw new LiveAuthenticationError(401, "live_auth_invalid");
    let claims;
    try { claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")); } catch { throw new LiveAuthenticationError(401, "live_auth_invalid"); }
    if (claims.sub !== user.id || !identityUuid.test(claims.session_id || "") || claims.session_id === "00000000-0000-0000-0000-000000000000" || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new LiveAuthenticationError(401, "live_auth_invalid");
    return { user: { id: user.id }, receiptBinding: liveSessionBinding(user.id, claims.session_id), authMs: performance.now() - started };
  } catch (error) {
    if (error instanceof LiveAuthenticationError) throw error;
    throw new LiveAuthenticationError(503, "live_auth_unavailable");
  } finally { clearTimeout(timer); }
}
