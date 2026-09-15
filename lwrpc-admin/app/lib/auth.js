import {isViewAsMode, getViewAsPageState, viewAsDisplayClient, viewAsSelfRows} from "./viewAsPageState.js";
import { createClient } from "@supabase/supabase-js";
import { defaultDashboardForRole, hasRole } from "./permissions";
import { findMembersByEmail, highestRoleForMembers, memberEmailResolution } from "./memberLookup";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  isViewAsMode() ? viewAsDisplayClient : globalThis.__lwrpcSupabaseClient ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "implicit",
      experimental: {
        passkey: true,
      },
    },
  });

if (!isViewAsMode() && !globalThis.__lwrpcSupabaseClient) {
  globalThis.__lwrpcSupabaseClient = supabase;
}

export async function getRequestAuthorizationHeaders(headers = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error("Your session expired. Please sign in again.");
  }

  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getCurrentUserRole() {
  if(isViewAsMode()){const {viewer}=getViewAsPageState();return {session:null,mode:"view_as",role:viewer.role,memberId:viewer.memberId};}
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
    const { data: memberRows } = await findMembersByEmail(
      supabase,
      user.email,
      "id, is_active_member, user_roles(role)"
    );
    const { activeMembers, selectedMember } = memberEmailResolution(memberRows);

    if (selectedMember?.id) {
      return {
        session: sessionData.session,
        role: highestRoleForMembers(activeMembers.length > 0 ? activeMembers : [selectedMember]),
        memberId: selectedMember.id
      };
    }
  }

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, member_id")
    .eq("user_id", userId)
    .limit(1);

  const roleData = roleRows?.[0] || null;

  return {
    session: sessionData.session,
    role: roleData?.role || "player",
    memberId: roleData?.member_id || null
  };
}

export async function requireRole(router, requiredRole) {
  const user = await getCurrentUserRole();

  if (!user.session && user.mode !== "view_as") {
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

// Normal identity lookup is unchanged; View-As uses the validated durable member.
export async function getCurrentMemberRows(selection) {
  if(isViewAsMode()) return viewAsSelfRows();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user?.email) return {data:null,error:null,user,identityMissing:true};
  return {...await findMembersByEmail(supabase,user.email,selection),user};
}
