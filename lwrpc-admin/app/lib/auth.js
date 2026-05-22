import { createClient } from "@supabase/supabase-js";
import { defaultDashboardForRole, hasRole } from "./permissions";

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
    const { data: memberData } = await supabase
      .from("members")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();

    if (memberData?.id) {
      const { data: memberRoleData } = await supabase
        .from("user_roles")
        .select("role, member_id")
        .eq("member_id", memberData.id)
        .maybeSingle();

      return {
        session: sessionData.session,
        role: memberRoleData?.role || "player",
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
