import { createClient } from '@supabase/supabase-js';
import { rejectViewAsMutation, requestOrigin } from '../../../lib/viewAsBoundary.js';
import { ratingsUploadRequest } from '../../../lib/seasonRatingsUploadServer.js';

export const runtime = 'nodejs';
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function POST(request) {
  const denied = rejectViewAsMutation(request);
  if (denied) return denied;
  if (request.headers.get('origin') && request.headers.get('origin') !== requestOrigin(request)) return json({ error: 'Wrong origin.' }, 403);
  try {
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Not authorized.' }, 401);
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!url || !secret) return json({ error: 'Ratings import is not configured.' }, 503);
    const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const auth = await db.auth.getUser(token);
    if (auth.error || !auth.data.user?.id) return json({ error: 'Not authorized.' }, 401);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Missing request.' }, 400);
    let size = 0; const chunks = [];
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4 * 1024 * 1024) { await reader.cancel(); return json({ error: 'Request too large.' }, 413); }
      chunks.push(Buffer.from(value));
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const result = await ratingsUploadRequest({ body, actor: auth.data.user.id, token, db, secret });
    return json(result);
  } catch (error) {
    return json({ error: error.message || 'Import failed; no changes confirmed. Preview again or retry the same confirmed import.' }, 400);
  }
}
