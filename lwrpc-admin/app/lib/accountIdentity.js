import { authenticateRequestIdentity, createAdminSupabase } from './serverSupabase.js';

// Account infrastructure only. Never uses an email or member ID supplied by the caller.
export async function reconcileSignedInAccount(request, {
  authenticate = authenticateRequestIdentity,
  createDatabase = createAdminSupabase,
} = {}) {
  let principal;
  try { principal = await authenticate(request); }
  catch { return { httpStatus: 401, status: 'not_authorized' }; }
  try {
    const { data, error } = await createDatabase().rpc('link_future_existing_member_identity', {
      p_user: principal.user.id,
    }).abortSignal(AbortSignal.timeout(3000));
    if (error || data === 'BUSY') return { httpStatus: 503, status: 'retry_later' };
    return { httpStatus: 200, status: ['LINKED', 'ALREADY_LINKED'].includes(data) ? 'linked' : 'pending' };
  } catch { return { httpStatus: 503, status: 'retry_later' }; }
}
