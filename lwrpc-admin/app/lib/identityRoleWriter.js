import { ROLE_LEVELS } from './permissions.js';

// Existing role-assignment authority remains in RLS. No identity is inferred here.
export async function ensureAssignedMemberRole(client, memberId, desiredRole) {
  if (!memberId) return null;
  const message = 'The role update is busy or changed. The team/location save succeeded; edit the saved record to retry the role assignment.';
  try {
    const { data: row, error: readError } = await client.from('user_roles').select('*').eq('member_id', memberId).maybeSingle();
    if (readError) return message;
    if (row && (ROLE_LEVELS[row.role] || ROLE_LEVELS.player) >= ROLE_LEVELS[desiredRole]) return null;
    const result = row
      ? await client.from('user_roles').update({ role: desiredRole, updated_at: new Date().toISOString() })
        .eq('id', row.id).eq('role', row.role).select('id').single()
      : await client.from('user_roles').insert({ user_id: null, member_id: memberId, role: desiredRole }).select('id').single();
    return result.error || !result.data ? message : null;
  } catch { return message; }
}
