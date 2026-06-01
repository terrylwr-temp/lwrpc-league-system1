import { ROLE_LEVELS } from "./permissions";

export async function findMembersByEmail(supabaseClient, email, selectColumns) {
  return supabaseClient
    .from("members")
    .select(selectColumns)
    .eq("email", email)
    .order("created_at", { ascending: true });
}

export function memberEmailResolution(memberRows) {
  const members = memberRows || [];
  const activeMembers = members.filter((member) => member.is_active_member !== false);
  const selectedMember = activeMembers[0] || members[0] || null;

  return {
    members,
    activeMembers,
    selectedMember,
    duplicateCount: members.length,
    hasDuplicateMemberships: members.length > 1,
  };
}

export function highestRoleForMembers(members) {
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
