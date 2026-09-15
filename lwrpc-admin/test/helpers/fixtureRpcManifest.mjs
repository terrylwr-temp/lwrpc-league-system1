// Test infrastructure only. HTTP POST does not classify an RPC as a mutation.
export const fixtureRpcManifest = Object.freeze({
  admin_member_directory_page: Object.freeze({
    kind: 'READ', credential: 'synthetic-service',
    parameters: ['p_search', 'p_include_inactive', 'p_current_roster_only', 'p_sort_key', 'p_sort_direction', 'p_offset', 'p_limit'],
    defaults: ['', false, false, 'member', 'asc', 0, 100],
    sql: 'select public.admin_member_directory_page($1,$2,$3,$4,$5,$6,$7) result',
  }),
  admin_master_reset_all: Object.freeze({kind: 'WRITE'}),
});

export function classifyFixtureRpc(name, {credential, readOnly = true, allowedWrites = []} = {}) {
  const entry = Object.hasOwn(fixtureRpcManifest, name) ? fixtureRpcManifest[name] : null;
  if (!entry) throw new Error('Unclassified fixture RPC denied');
  if (entry.kind === 'WRITE') {
    if (readOnly || !allowedWrites.includes(name)) throw new Error('Fixture mutation RPC denied');
    return entry;
  }
  if (credential !== entry.credential) throw new Error('Fixture RPC credential denied');
  return entry;
}

export async function executeFixtureReadRpc(db, name, body, context) {
  const entry = classifyFixtureRpc(name, context);
  if (entry.kind !== 'READ') throw new Error('Write RPC cannot use read executor');
  if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).some(k => !entry.parameters.includes(k))) throw new Error('Unknown fixture RPC argument');
  const values = entry.parameters.map((k, i) => Object.hasOwn(body, k) ? body[k] : entry.defaults[i]);
  // Even an accidentally mutating implementation cannot write through this path.
  return db.transaction(async tx => {
    await tx.exec('set transaction read only');
    return (await tx.query(entry.sql, values)).rows[0].result;
  });
}
