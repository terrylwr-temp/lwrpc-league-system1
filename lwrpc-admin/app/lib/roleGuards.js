export function wouldRemoveLastCommissioner(roles, currentRole, nextRole, currentRoleId) {
  if (currentRole !== "commissioner" || nextRole === "commissioner") return false;

  const commissionerCount = (roles || []).filter(
    (role) => role.role === "commissioner"
  ).length;

  if (commissionerCount <= 1) return true;

  const otherCommissioners = (roles || []).filter(
    (role) => role.role === "commissioner" && role.id !== currentRoleId
  );

  return otherCommissioners.length === 0;
}

export async function hasAnotherCommissioner(supabase, currentRoleId) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("role", "commissioner");

  if (error) throw error;

  return (data || []).some((role) => role.id !== currentRoleId);
}
