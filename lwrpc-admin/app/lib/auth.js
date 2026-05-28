import { createClient } from "@supabase/supabase-js";
import { ROLE_LEVELS, defaultDashboardForRole, hasRole } from "./permissions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  globalThis.__lwrpcSupabaseClient ||
  createClient(supabaseUrl, supabaseAnonKey);

if (!globalThis.__lwrpcSupabaseClient) {
  globalThis.__lwrpcSupabaseClient = supabase;
}

export async function getCurrentUserRole() {
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData.session) {
    return {
      session: null,
      role: null,
      memberId: null
    };
  }

  const user = sessionData.session.user;
  const userId = user.id;

  if (user.email) {
    const { data: memberRows } = await supabase
      .from("members")
      .select("id, is_active_member, user_roles(role)")
      .eq("email", user.email)
      .order("created_at", { ascending: true });

    const members = memberRows || [];
    const activeMembers = members.filter((member) => member.is_active_member !== false);
    const memberData = activeMembers[0] || members[0] || null;

    if (memberData?.id) {
      return {
        session: sessionData.session,
        role: highestRoleForMembers(activeMembers.length > 0 ? activeMembers : [memberData]),
        memberId: memberData.id
      };
    }
  }

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role, member_id")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    session: sessionData.session,
    role: roleData?.role || "player",
    memberId: roleData?.member_id || null
  };
}

function highestRoleForMembers(members) {
  return (members || []).reduce((highestRole, member) => {
    const memberRoles = member.user_roles || [];

    return memberRoles.reduce((currentHighest, roleRow) => {
      const role = roleRow?.role || "player";
      return (ROLE_LEVELS[role] || 0) > (ROLE_LEVELS[currentHighest] || 0)
        ? role
        : currentHighest;
    }, highestRole);
  }, "player");
}

export async function requireRole(router, requiredRole) {
  const user = await getCurrentUserRole();

  if (!user.session) {
    router.push("/login");
    return null;
  }

  if (!hasRole(user.role, requiredRole)) {
    alert("You do not have permission to access this page.");
    router.push(defaultDashboardForRole(user.role));
    return null;
  }

  return user;
}
