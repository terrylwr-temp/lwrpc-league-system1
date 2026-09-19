import { ReviewError, reviewToken, readReviewToken } from './aiReviewService.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FEEDBACK = ['all', 'helpful', 'not_helpful', 'no_feedback', 'ambiguous'];
const ORIGINS = ['all', 'player_interface', 'manager_test', 'legacy_unknown', 'view_as'];
const COUNT_KEYS = ['total', 'helpful', 'not_helpful', 'no_feedback', 'ambiguous'];
const OMITTED = '[Security-sensitive text omitted]';

// Apply only to this administrative reader. Capture, retention and AI behavior
// remain unchanged. Historical strings are not trusted to be safe telemetry.
export function safeInteractionText(value) {
  if (typeof value !== 'string') return null;
  const sensitive = /\bBearer\s+\S+|\bBasic\s+[A-Za-z0-9+/=]{12,}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|\b(?:sk-(?:proj-|svcacct-)?|sb_secret_)[A-Za-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|passwd|authorization|token|secret|credentials?|private[_ -]?key|secret[_ -]?key|supabase[_ -]?service[_ -]?(?:role[_ -]?)?key|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|service[_ -]?role[_ -]?key|client[_ -]?secret|session[_ -]?(?:secret|token|id)|encrypted[_ -]?credentials?)\s*["']?\s*(?:[:=]|is\b)\s*\S+|[?&](?:token|key|secret|signature|credential|code)=\S+|\b(?:postgres(?:ql)?|https?):\/\/[^\s/@:]+:[^\s/@]+@/i;
  return sensitive.test(value) ? OMITTED : value;
}

const array = value => Array.isArray(value) ? value : [];
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const text = (value, max = 600) => {
  const safe = safeInteractionText(value);
  return safe === null ? null : safe.slice(0, max);
};
const code = value => typeof value === 'string' && /^[A-Za-z0-9_. /:-]{1,160}$/.test(value) ? text(value, 160) : null;
const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const uuid = value => UUID.test(value || '') ? value : null;
const bool = value => typeof value === 'boolean' ? value : null;
const stamp = value => {
  if (typeof value !== 'string' || !Number.isFinite(new Date(value).getTime())) return null;
  return new Date(value).toISOString();
};
function pick(value, fields) {
  const input = object(value);
  return Object.fromEntries(Object.entries(fields).flatMap(([key, convert]) => {
    const result = convert(input[key]);
    return result === null || result === undefined ? [] : [[key, result]];
  }));
}
function source(value) {
  return pick(value, {
    documentId: uuid, documentVersionId: uuid, chunkId: uuid, approvedAnswerId: uuid,
    approvedRevisionId: uuid, sourceKind: code, documentTitle: text, documentType: code,
    pageNumber: number, ruleNumber: text, sectionLabel: text, heading: text, citation: text,
    sourceClassification: code, evidenceRole: text, evidenceSelectionReason: text,
    combinedScore: number,
  });
}
function policy(value) {
  const p = pick(value, {
    correlationId: uuid, origin: code, intent: code, object: code, candidateCount: number,
    completionCount: number, selectedCount: number, finalCount: number,
    referencesTruncated: bool, applicability: code, validation: code, zeroStage: code,
    completion: code, completionStage: code, completionReason: code, completionMs: number,
  });
  if (Array.isArray(value?.scope)) p.scope = value.scope.filter(v => ['weekday', 'saturday', 'primetime'].includes(v));
  if (Array.isArray(value?.candidates)) p.candidates = value.candidates.slice(0, 8).map(v => pick(v, { chunkId: uuid, versionId: uuid, reason: code }));
  return p;
}
function resolver(value) {
  return pick(value, {
    classification: code, priorContextAvailable: bool, clarificationConsumed: bool,
    contextSuperseded: bool, rawLiveDataGuard: bool, effectiveLiveDataGuard: bool,
  });
}
function retrieval(value) {
  const r = pick(value, {
    evidenceSufficient: bool, evidenceThreshold: number, candidateCount: number,
    retrievalLimit: number, authorityReviewLimit: number, sourceFamily: code,
    stage3Sufficient: bool, rescueInvoked: bool, rescueRan: bool,
    retrievalMs: number, generationMs: number, totalMs: number,
  });
  if (value?.resolver) r.resolver = resolver(value.resolver);
  return r;
}
export function sanitizeInteractionDiagnostics(value) {
  const input = object(value);
  const outcome = pick(input.outcome, {
    configurationVersion: code, candidateCount: number, evidenceThreshold: number,
    retrievalLimit: number, authorityReviewLimit: number, embeddingModel: code,
    stage3Sufficient: bool, equipmentProbeInvoked: bool, equipmentProbeRetrieved: bool,
    liveIntent: code, resultCode: code, relationship: code, projectionVersion: number,
    workflow: code, result: code, mode: code, documentEvidenceUsed: bool,
    lookupAttempted: bool, liveConsulted: bool, liveDataUsed: bool,
    hybrid: bool, personalEvaluationResult: code,
  });
  if (input.outcome?.policy) outcome.policy = policy(input.outcome.policy);
  if (Array.isArray(input.outcome?.authorityWarnings)) outcome.authorityWarnings = input.outcome.authorityWarnings.slice(0, 8).map(v => pick(v, {
    approvedAnswerId: uuid, approvedRevisionId: uuid, documentId: uuid,
    documentVersionId: uuid, chunkId: uuid, reason: code, code,
  }));
  const selection = {};
  if (Array.isArray(input.selection?.selectedEvidence)) selection.selectedEvidence = input.selection.selectedEvidence.slice(0, 4).map(source);
  if (Array.isArray(input.selection?.candidates)) selection.candidates = input.selection.candidates.slice(0, 8).map(v => pick(v, {
    chunkId: uuid, documentId: uuid, documentVersionId: uuid, combinedScore: number,
  }));
  if (input.selection?.retrieval) selection.retrieval = retrieval(input.selection.retrieval);
  return { outcome, selection, resolver: resolver(input.resolver), sources: array(input.sources).slice(0, 4).map(source) };
}

export function interactionFilters(params, now = new Date()) {
  const period = params.get('period') || '30';
  const asof = stamp(params.get('asof') || now.toISOString());
  const f = {
    period, feedback: params.get('feedback') || 'all', search: (params.get('search') || '').trim(),
    origin: params.get('origin') || 'all', limit: Number(params.get('limit') || 25),
  };
  if (!['7', '30', '90', 'all'].includes(period) || !FEEDBACK.includes(f.feedback)
    || !ORIGINS.includes(f.origin) || ![25, 50].includes(f.limit) || f.search.length > 200
    || !asof || asof > now.toISOString()) throw new ReviewError('Invalid interaction history filters.');
  return { ...f, from: period === 'all' ? null : new Date(new Date(asof).getTime() - Number(period) * 86400000).toISOString(), to: asof, asof };
}
function controls(f) {
  return JSON.stringify([f.period, f.feedback, f.search, f.origin, f.limit]);
}
function checked(result) {
  if (result.error || !result.data || !Array.isArray(result.data.rows)) {
    throw new ReviewError('Interaction history is unavailable. Confirm the AI question history migration is installed.', 503);
  }
  return result.data;
}
function count(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

export function interactionView(row, detail = false) {
  // Do not spread database records into a response: identity and sensitive
  // telemetry keys must remain server-side even in older snapshots.
  const question = row.payload_purged ? null : safeInteractionText(row.question);
  const answer = row.payload_purged ? null : safeInteractionText(row.answer);
  const view = {
    id: uuid(row.answer_id), occurredAt: stamp(row.occurred_at), timeBasis: row.time_basis === 'completed' ? 'completed' : 'first_recorded',
    origin: ORIGINS.slice(1).includes(row.origin) ? row.origin : 'legacy_unknown',
    result: code(row.result), version: text(row.assistant_version, 80), sourceFamily: code(row.source_family),
    question, answer, feedback: FEEDBACK.slice(1).includes(row.feedback) ? row.feedback : 'no_feedback',
    feedbackAt: stamp(row.feedback_at), userName: text(row.user_name, 300),
    userNameBasis: row.user_name_basis === 'current_member_record' ? row.user_name_basis : null,
    // No historical role is stored by the existing telemetry. Never infer one
    // from today's directory or from a Live relationship class.
    userRole: null, totalMs: number(row.total_ms), legacy: row.legacy === true,
    redacted: row.redacted === true || question === OMITTED || answer === OMITTED,
    payloadPurged: row.payload_purged === true,
    hasQuestion: row.payload_purged !== true && row.has_question === true,
    hasAnswer: row.payload_purged !== true && row.has_answer === true,
  };
  if (detail) {
    view.effectiveQuestion = row.payload_purged ? null : safeInteractionText(row.effective_question);
    view.context = pick(row.context, { liveIntent: code, resultCode: code, relationship: code, workflow: code });
    view.diagnostics = row.payload_purged ? {} : sanitizeInteractionDiagnostics(row.diagnostics);
  }
  return view;
}

export async function interactionReport(db, params, user) {
  let filters = interactionFilters(params);
  const cursor = params.get('cursor');
  let after = {};
  if (cursor) {
    const token = readReviewToken(cursor, user);
    if (token.kind !== 'ai_interactions' || !token.filters || controls(token.filters) !== controls(filters)
      || !uuid(token.id) || !stamp(token.at)) throw new ReviewError('History filters changed. Start again.');
    filters = token.filters;
    after = { cursor_at: token.at, cursor_id: token.id };
  }
  const data = checked(await db.rpc('ai_review_interactions', { p_filters: { ...filters, ...after } }));
  const rows = data.rows.slice(0, filters.limit);
  const last = rows.at(-1);
  const summary = Object.fromEntries(COUNT_KEYS.map(key => [key, count(data.summary?.[key])]));
  return {
    rows: rows.map(row => interactionView(row)), summary, asof: filters.asof,
    total: summary[filters.feedback === 'all' ? 'total' : filters.feedback],
    next: data.rows.length > filters.limit && uuid(last?.answer_id) && stamp(last?.occurred_at)
      ? reviewToken({ user, kind: 'ai_interactions', filters, at: last.occurred_at, id: last.answer_id }) : null,
  };
}

export async function interactionDetail(db, params) {
  const id = uuid(params.get('answer'));
  if (!id) throw new ReviewError('Select an interaction.');
  const now = new Date().toISOString();
  const data = checked(await db.rpc('ai_review_interactions', { p_filters: {
    from: null, to: now, asof: now, feedback: 'all', search: '', origin: 'all', limit: 25, answer: id,
  } }));
  const row = data.rows.find(candidate => candidate.answer_id === id);
  if (!row) throw new ReviewError('Interaction unavailable or no longer retained.', 404);
  return { interaction: interactionView(row, true) };
}
