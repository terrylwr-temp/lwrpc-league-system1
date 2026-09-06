// Public constants and validation only. No credentials, database client or model calls.
export const APPROVED_SOURCE_NAME = 'LWR Pickleball Club Approved Answer';
export const APPROVED_SCOPES = Object.freeze(['all', 'weekday', 'saturday', 'primetime']);
export const APPROVED_STATUSES = Object.freeze(['draft', 'active', 'retired']);
export const APPROVED_PUBLIC_BYTES = 32768;
export const APPROVED_EMBEDDING_MODEL = 'text-embedding-3-small';
export const APPROVED_EMBEDDING_DIMENSIONS = 1536;
export const APPROVED_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_HOSTS = new Set(['lwrpickleballclub.com', 'www.lwrpickleballclub.com', 'league.lwrpickleballclub.com']);

export class ApprovedAnswerError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'ApprovedAnswerError'; this.status = status; }
}
export function approvedId(value) {
  if (!APPROVED_UUID.test(String(value || ''))) throw new ApprovedAnswerError('Invalid Approved Answer reference.');
  return value;
}
function text(value, name, max, optional = false) {
  if (typeof value !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new ApprovedAnswerError(`${name} must be plain text.`);
  const result = value.trim();
  if ((!optional && !result) || [...result].length > max) throw new ApprovedAnswerError(`${name} must contain ${optional ? 'at most' : '1–'}${max} characters.`);
  return result;
}
function dateOnly(value, name, optional = false) {
  if (optional && !value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) !== value) throw new ApprovedAnswerError(`${name} must be a valid date.`);
  return value;
}
export function validateApprovedLinks(value = []) {
  if (!Array.isArray(value) || value.length > 3) throw new ApprovedAnswerError('Use at most three official public links.');
  return value.map(link => {
    const label = text(link?.label, 'Link label', 100);
    const raw = text(link?.url, 'Public URL', 500);
    let url; try { url = new URL(raw); } catch { throw new ApprovedAnswerError('Use an official public HTTPS URL.'); }
    if (url.protocol !== 'https:' || !PUBLIC_HOSTS.has(url.hostname.toLowerCase()) || url.username || url.password || url.port || url.search || url.hash || /%|\\|\s/.test(raw)
      || /(?:token|secret|signature|signed|password|auth|callback)/i.test(url.pathname)) throw new ApprovedAnswerError('Use an official public HTTPS link without credentials, tokens or query parameters.');
    return { label, url: url.href };
  });
}
export function validateApprovedDraft(input = {}) {
  const draft = {
    title: text(input.title, 'Title', 160), topic_key: text(input.topic_key, 'Policy/topic key', 80).toLowerCase(),
    canonical_question: text(input.canonical_question, 'Canonical question', 2400),
    approved_answer: text(input.approved_answer, 'Approved answer', 6000),
    league_scope: input.league_scope, temporal_scope: input.temporal_scope,
    season_id: input.season_id ? approvedId(input.season_id) : null,
    effective_on: dateOnly(input.effective_on, 'Effective date'), expires_on: dateOnly(input.expires_on, 'Expiration date', true),
    related_chunk_id: input.related_chunk_id ? approvedId(input.related_chunk_id) : null,
    related_passage: input.related_chunk_id ? text(input.related_passage, 'Related passage', 16384) : null,
    related_rule_identity: input.related_chunk_id ? text(input.related_rule_identity, 'Related rule identity', 120, true) : null,
    public_links: validateApprovedLinks(input.public_links),
  };
  if (!draft.related_chunk_id && (input.related_passage || input.related_rule_identity)) throw new ApprovedAnswerError('Related passage requires its official chunk.');
  if (draft.related_passage && new TextEncoder().encode(draft.related_passage).length > 16384) throw new ApprovedAnswerError('Related passage exceeds 16 KiB.');
  if (!/^[a-z][a-z0-9_-]{0,79}$/.test(draft.topic_key)) throw new ApprovedAnswerError('Use a short policy key containing letters, digits, hyphens or underscores.');
  if (!APPROVED_SCOPES.includes(draft.league_scope) || !['standing', 'season'].includes(draft.temporal_scope)) throw new ApprovedAnswerError('Choose a valid league and time scope.');
  if (draft.temporal_scope === 'season' ? !draft.season_id || !draft.expires_on : draft.season_id !== null) throw new ApprovedAnswerError('Season policies require a season and expiration; standing policies cannot select a season.');
  if (draft.expires_on && draft.expires_on <= draft.effective_on) throw new ApprovedAnswerError('Expiration must be after the effective date (the expiration date is excluded).');
  if (new TextEncoder().encode(JSON.stringify(draft)).length > APPROVED_PUBLIC_BYTES) throw new ApprovedAnswerError('Approved public content exceeds the 32 KiB byte limit. Shorten it before saving.');
  const prose = `${draft.title}\n${draft.canonical_question}\n${draft.approved_answer}`;
  if (/<\/?[a-z][^>]*>|https?:\/\/|www\.|\[[^\]]*\]\(/i.test(prose)) throw new ApprovedAnswerError('Use plain text. Add public URLs through the structured links fields.');
  if (/\b(?:bearer|password|api[_ -]?key|access[_ -]?token|refresh[_ -]?token)\b|[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(prose)) throw new ApprovedAnswerError('Do not include credentials or personal contact information.');
  return draft;
}
export function approvedPublicRevision(row) {
  return { id: row.id, answer_id: row.answer_id, revision_number: row.revision_number, status: row.status,
    title: row.title, canonical_question: row.canonical_question, approved_answer: row.approved_answer,
    league_scope: row.league_scope, temporal_scope: row.temporal_scope, season_id: row.season_id,
    effective_on: row.effective_on, expires_on: row.expires_on, public_links: validateApprovedLinks(row.public_links || []),
    related_chunk_id: row.related_chunk_id || null, related_rule_identity: row.related_rule_identity || '', related_passage: row.related_passage || null,
    content_hash: row.content_hash, activated_at: row.activated_at };
}
export function approvedSourceIdentity(value) {
  if (value?.sourceKind !== 'approved_answer') return {};
  if (!APPROVED_UUID.test(value.approvedAnswerId || '') || !APPROVED_UUID.test(value.approvedRevisionId || '')
      || !Number.isSafeInteger(value.approvedRevisionNumber) || value.approvedRevisionNumber < 1 || !/^[a-f0-9]{64}$/.test(value.contentHash || '')) throw new ApprovedAnswerError('Invalid approved source identity.');
  return { sourceKind: 'approved_answer', approvedAnswerId: value.approvedAnswerId, approvedRevisionId: value.approvedRevisionId,
    approvedRevisionNumber: value.approvedRevisionNumber, contentHash: value.contentHash,
    leagueScope: APPROVED_SCOPES.includes(value.leagueScope) ? value.leagueScope : null,
    effectiveOn: dateOnly(value.effectiveOn, 'Effective date'), expiresOn: dateOnly(value.expiresOn, 'Expiration date', true) };
}
export function clubPolicyDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function approvedEligible(row, { date = clubPolicyDate(), scope = 'all', seasonId = null, manifest } = {}) {
  return row?.status === 'active' && Boolean(row.activated_at) && row.effective_on <= date && (!row.expires_on || date < row.expires_on)
    && (row.league_scope === 'all' || row.league_scope === scope)
    && (row.temporal_scope === 'standing' || Boolean(seasonId) && row.season_id === seasonId)
    && Boolean(manifest) && row.authority_manifest_hash === manifest;
}

// Warnings carry source identities and fixed reason codes, never question/answer text.
export function safeAuthorityWarnings(values) {
  if (!Array.isArray(values)) return [];
  const result = [];
  for (const value of values.slice(0,4)) {
    if (!APPROVED_UUID.test(value?.approvedAnswerId || '') || !APPROVED_UUID.test(value?.approvedRevisionId || '')
        || !APPROVED_UUID.test(value?.documentId || '') || !APPROVED_UUID.test(value?.documentVersionId || '') || !APPROVED_UUID.test(value?.chunkId || '')
        || !['opposed_permission', 'different_policy_value'].includes(value?.reason)) continue;
    result.push({ approvedAnswerId: value.approvedAnswerId, approvedRevisionId: value.approvedRevisionId,
      documentId: value.documentId, documentVersionId: value.documentVersionId, chunkId: value.chunkId,
      reason: value.reason, leagueScope: APPROVED_SCOPES.includes(value.leagueScope) ? value.leagueScope : null });
  }
  return result;
}
