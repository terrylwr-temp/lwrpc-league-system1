import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { buildRatingsPreview, parseRatingsCsv, IMPORT_POLICY } from './seasonRatingsImport.js';

function key(secret) {
  if (!secret) throw Error('Server import credentials are not configured.');
  return createHash('sha256').update('lwr-source-ratings-v1\0' + secret).digest();
}
export function sealRatingsPreview(payload, binding, secret) {
  const data = Buffer.from(JSON.stringify({ payload, binding })).toString('base64url');
  return data + '.' + createHmac('sha256', key(secret)).update(data).digest('base64url');
}
export function openRatingsPreview(receipt, binding, secret, now = Date.now()) {
  if (typeof receipt !== 'string' || receipt.length > 2800000) throw Error('Invalid preview.');
  const [data, signature, extra] = receipt.split('.');
  const expected = createHmac('sha256', key(secret)).update(data || '').digest();
  const supplied = Buffer.from(signature || '', 'base64url');
  if (extra || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw Error('Preview was changed; preview again.');
  const envelope = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (envelope.binding !== binding || envelope.payload.policy !== IMPORT_POLICY || Date.parse(envelope.payload.expires) <= now) throw Error('Preview expired or belongs to another session.');
  return envelope.payload;
}
export async function ratingsImportRequest({ body, actor, token, db, secret, now = Date.now() }) {
  const binding = createHash('sha256').update(actor + '\0' + token).digest('hex');
  if (body.action === 'preview') {
    if (!/^[0-9a-f-]{36}$/i.test(body.seasonId || '')) throw Error('Select a target season.');
    const rows = parseRatingsCsv(body.csv);
    const response = await db.rpc('season_ratings_source_snapshot', { p_actor: actor, p_season: body.seasonId, p_ids: [...new Set(rows.map(r => r.duprid).filter(Boolean))] }).abortSignal(AbortSignal.timeout(8000));
    if (response.error) throw Error(response.error.message);
    const preview = buildRatingsPreview(rows, response.data);
    const payload = { id: randomUUID(), actor, seasonId: body.seasonId, fileHash: createHash('sha256').update(body.csv).digest('hex'), policy: IMPORT_POLICY, expires: new Date(now + 10 * 60 * 1000).toISOString(), updates: preview.updates };
    return { rows: preview.rows, counts: preview.counts, season: preview.season, policy: preview.policy, receipt: preview.counts.ready ? sealRatingsPreview(payload, binding, secret) : null };
  }
  if (body.action === 'commit' && body.confirmed === true) {
    const payload = openRatingsPreview(body.receipt, binding, secret, now);
    if (payload.actor !== actor || payload.seasonId !== body.seasonId) throw Error('Target season changed; preview again.');
    const response = await db.rpc('season_ratings_source_commit', { p_actor: actor, p_payload: payload }).abortSignal(AbortSignal.timeout(8000));
    if (response.error) throw Error(response.error.message);
    return response.data;
  }
  throw Error('Preview or explicitly confirm the import.');
}
