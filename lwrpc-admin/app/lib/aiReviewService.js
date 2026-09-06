import { createHmac, timingSafeEqual } from 'node:crypto';
import { REVIEW_CATEGORIES, REVIEW_STATUSES, reviewRoleAllowed } from './aiReviewShared.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CASE_FIELDS = 'id,group_id,status,action_category,priority,revision,created_at,updated_at,reviewed_at,reviewed_through_at,resolved_at,closed_at,resolution_summary';
const EVENT_FIELDS = 'id,action,actor_kind,before_state,after_state,note,created_at';
const FEEDBACK_FIELDS = 'id,answer_id,helpful,created_at,original_question,effective_question,generated_answer,source_snapshot,selection_snapshot,assistant_version,model';
const OCCURRENCE_FIELDS = 'id,answer_id,group_id,origin,occurrence_kind,answer_completed_at,first_observed_at,recorded_at,original_question,effective_question,output_text,source_snapshot,selection_snapshot,resolver_snapshot,assistant_version,model,source_family,payload_purged_at';
export class ReviewError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
export function requireReviewRole(auth) {
  if (auth.error) throw new ReviewError(auth.status === 401 ? 'Sign in to continue.' : 'Manager access required.', auth.status || 403);
  if (!reviewRoleAllowed(auth.role)) throw new ReviewError('Manager access required.', 403);
}
function identity(id) { if (!UUID.test(id || '')) throw new ReviewError('Invalid item.'); return id; }
function check(result) { if (result.error) throw new ReviewError('Review data is unavailable. Confirm the LMS-0718 migration is installed.', 503); return result.data; }
function seal(value) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;
  if (!secret) throw new ReviewError('Review configuration unavailable.', 503);
  return createHmac('sha256', secret).update('lwr-review-v1:').update(value).digest('base64url');
}
export function reviewToken(payload) { const body = Buffer.from(JSON.stringify({ ...payload, user: seal(`actor:${payload.user}`), expires: Date.now() + 1800000 })).toString('base64url'); return `${body}.${seal(body)}`; }
export function readReviewToken(token, user) {
  if (typeof token !== 'string' || token.length > 4096) throw new ReviewError('Refresh this review.');
  const [body, signature, extra] = token.split('.'); const expected = seal(body || '');
  if (extra || !signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new ReviewError('Refresh this review.');
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { throw new ReviewError('Refresh this review.'); }
  if (p.user !== seal(`actor:${user}`) || p.expires < Date.now()) throw new ReviewError('Refresh this review.');
  return p;
}
function timestamp(value) { const d = new Date(value); if (!value || !Number.isFinite(d.getTime())) throw new ReviewError('Invalid date range.'); return d.toISOString(); }
export function reviewFilters(params, now = new Date()) {
  const f = { tab: params.get('tab') || 'needs', from: timestamp(params.get('from') || new Date(now.getTime() - 30 * 86400000).toISOString()),
    to: timestamp(params.get('to') || now.toISOString()), asof: timestamp(params.get('asof') || now.toISOString()), limit: Number(params.get('limit') || 25),
    search: (params.get('search') || '').trim(), version: params.get('version') || '', source: params.get('source') || '', status: params.get('status') || '', type: params.get('type') || '' };
  if (f.asof > now.toISOString() || !['summary','needs','unanswered','feedback','resolved'].includes(f.tab) || ![25,50,100].includes(f.limit) || f.from >= f.to || f.search.length > 200
    || f.version.length > 80 || !['','lwr','usap','mixed','none','unknown'].includes(f.source)
    || !['',...REVIEW_STATUSES].includes(f.status) || !['','helpful','not_helpful','unanswered','conflict'].includes(f.type)) throw new ReviewError('Invalid review filters.');
  return f;
}
export async function reviewReport(db, params, user) {
  let f = reviewFilters(params); const cursor = params.get('cursor');
  if (cursor) {
    const p = readReviewToken(cursor, user);
    const comparable = value => Object.fromEntries(Object.entries(value).filter(([key])=>key!=='asof'));
    if (JSON.stringify(comparable(p.filters)) !== JSON.stringify(comparable(f))) throw new ReviewError('Filters changed. Start again.');
    f = { ...p.filters, cursor_at: p.at, cursor_id: p.id, cursor_priority: p.priority };
  }
  const data = check(await db.rpc('ai_review_report', { p_filters: f }));
  if (f.tab === 'summary') return { summary: data, asof: f.asof };
  const rows = data.rows || []; const more = rows.length > f.limit; const page = rows.slice(0, f.limit); const last = page.at(-1);
  const filters=Object.fromEntries(Object.entries(f).filter(([key])=>!key.startsWith('cursor_')));
  return { rows: page, asof: f.asof, next: more ? reviewToken({ user, filters, at: last.latest_at || last.latest_activity, id: last.answer_id || last.id, priority: last.sort_priority ?? 2 }) : null };
}
// Only allowlisted fields leave the service; auth attribution stays in the database.
function eventView(event) {
  const fields = ['status','action_category','priority','revision','reviewed_through_at','closed_at','resolved_at','resolution_summary'];
  const state = value => Object.fromEntries(fields.filter(k => value?.[k] !== undefined).map(k => [k,value[k]]));
  return { ...event, before_state: state(event.before_state), after_state: state(event.after_state), actor: event.actor_kind === 'manager' ? 'Manager' : 'System' };
}
export async function reviewDetail(db, params, user) {
  const group = params.get('group'); const answer = params.get('answer');
  if (!group && !answer) throw new ReviewError('Select a review item.');
  if (group) identity(group); if (answer) identity(answer);
  const occurrenceQuery = db.from('ai_review_occurrences').select(OCCURRENCE_FIELDS);
  const occurrence = check(await (answer ? occurrenceQuery.eq('answer_id', answer) : occurrenceQuery.eq('group_id',group).order('recorded_at',{ascending:false}).order('id')).limit(1).maybeSingle());
  if (group && occurrence?.group_id !== group) throw new ReviewError('Review item unavailable.',404);
  const aid = occurrence?.answer_id || answer; const gid = occurrence?.group_id || group;
  const [feedbackResult, caseResult, outcomeResult] = await Promise.all([
    db.from('ai_answer_feedback_events').select(FEEDBACK_FIELDS).eq('answer_id',aid).order('created_at',{ascending:false}).order('id').limit(1).maybeSingle(),
    gid ? db.from('ai_manager_review_cases').select(CASE_FIELDS).eq('group_id',gid).maybeSingle() : Promise.resolve({data:null}),
    db.from('ai_request_outcomes').select('id,completed_at,origin,final_kind,assistant_version,model,source_family,diagnostic_snapshot,resolver_classification').eq('id',aid).maybeSingle(),
  ]);
  const feedback = check(feedbackResult), caseRow = check(caseResult), outcome = check(outcomeResult);
  const voteState = feedback ? check(await db.rpc('ai_review_feedback_state',{p_asof:feedback.created_at}).eq('answer_id',aid).maybeSingle()) : null;
  const currentFeedback = voteState?.helpful ?? null;
  // A review acknowledges retained activity displayed in this detail, never wall-clock now.
  const cutoff = [caseRow?.created_at,caseRow?.reviewed_through_at,occurrence?.recorded_at,feedback?.created_at].filter(Boolean).sort((a,b)=>new Date(a)-new Date(b)||a.localeCompare(b)).at(-1);
  if (!occurrence && !feedback) throw new ReviewError('Review item unavailable.',404);
  const snapshot = occurrence || (feedback && { ...feedback, output_text:feedback.generated_answer });
  return { group:gid, answerId:aid, case:caseRow, original:snapshot.original_question, effective:snapshot.effective_question,
    result:outcome?.final_kind || occurrence?.occurrence_kind || 'Legacy grounded feedback',
    completedAt:outcome?.completed_at || null, observedAt:occurrence?.first_observed_at || feedback?.created_at,
    version:snapshot.assistant_version, model:snapshot.model || null, legacy:!outcome,
    output:occurrence?.payload_purged_at ? null : (snapshot.output_text || feedback?.generated_answer || null),
    currentFeedback,feedbackCount:voteState?.event_count || 0,sources:snapshot.source_snapshot || [], selection:snapshot.selection_snapshot || {}, resolver:occurrence?.resolver_snapshot || {},
    diagnostics:outcome?.diagnostic_snapshot || {}, sourceFamily:outcome?.source_family || occurrence?.source_family || 'unknown',
    reviewedActivityAt:cutoff, reviewToken:caseRow ? reviewToken({ user, caseId:caseRow.id, revision:caseRow.revision, cutoff }) : null };
}
export async function reviewHistory(db, params, user) {
  const kind = params.get('kind'); const target = identity(params.get('id')); const cursor = params.get('cursor');
  if (!['occurrences','feedback','audit'].includes(kind)) throw new ReviewError('Invalid history.');
  const table = {occurrences:'ai_review_occurrences',feedback:'ai_answer_feedback_events',audit:'ai_manager_review_events'}[kind];
  const fields = {occurrences:'id,answer_id,original_question,effective_question,recorded_at,assistant_version,occurrence_kind',feedback:'id,helpful,created_at',audit:EVENT_FIELDS}[kind];
  const date = kind==='occurrences' ? 'recorded_at':'created_at';
  let query = db.from(table).select(fields).eq(kind==='feedback'?'answer_id':kind==='audit'?'case_id':'group_id',target);
  if (cursor) {
    const p = readReviewToken(cursor,user); if(p.kind!==kind || p.target!==target) throw new ReviewError('Invalid history cursor.');
    identity(p.id); timestamp(p.at);
    query=query.or(`${date}.gt.${p.at},and(${date}.eq.${p.at},id.gt.${p.id})`);
  }
  const data=check(await query.order(date).order('id').limit(26)); const rows=data.slice(0,25); const last=rows.at(-1);
  return {rows:kind==='audit'?rows.map(eventView):rows,next:data.length>25?reviewToken({user,kind,target,at:last[date],id:last.id}):null};
}
export async function reviewAction(db, body, user) {
  if (!body || Object.keys(body).some(k=>!['token','operation','action','value','note'].includes(k))) throw new ReviewError('Invalid action.');
  const token=readReviewToken(body.token,user); identity(token.caseId); identity(body.operation);
  if (!['status','category','priority','note','review'].includes(body.action) || typeof (body.note ?? '')!=='string' || (body.note || '').length>4000) throw new ReviewError('Invalid action.');
  if (body.action==='category' && !Object.hasOwn(REVIEW_CATEGORIES,body.value)) throw new ReviewError('Invalid category.');
  const {data,error}=await db.rpc('ai_review_case_action',{p_case:token.caseId,p_actor:user,p_operation:body.operation,p_revision:token.revision,
    p_action:body.action,p_value:body.value ?? null,p_note:body.note || null,p_cutoff:token.cutoff});
  if(error) {
    const message=error.message || '';
    if(/review_revision_conflict|review_retry_mismatch/.test(message)) throw new ReviewError('This case changed. Refresh before making another decision.',409);
    if(/review_(transition|reason_required|summary_size|category|priority|invalid)/.test(message)) throw new ReviewError('Invalid transition or missing reason. Closing summaries must be 1–2,000 characters.');
    throw new ReviewError('Review was not saved. Retry the same action or refresh.',503);
  }
  return data;
}
export async function reviewSource(db, answerId, sourceIndex, user) {
  identity(answerId); if(!Number.isInteger(sourceIndex) || sourceIndex<0 || sourceIndex>3) throw new ReviewError('Invalid source.');
  const detail=await reviewDetail(db,new URLSearchParams({answer:answerId}),user); const source=detail.sources[sourceIndex];
  if(!source) throw new ReviewError('Historical source unavailable.',404);
  const docId=identity(source.documentId), versionId=identity(source.documentVersionId), chunkId=identity(source.chunkId);
  const [vr,cr]=await Promise.all([
    db.from('ai_document_versions').select('id,document_id,storage_bucket,storage_path,processing_status,document:ai_documents!ai_document_versions_document_id_fkey!inner(id,title,status,active_version_id)').eq('id',versionId).maybeSingle(),
    db.from('ai_document_chunks').select('id,document_version_id,page_number').eq('id',chunkId).maybeSingle(),
  ]);
  const v=check(vr), c=check(cr);
  if(!v || !c || v.document_id!==docId || v.document?.id!==docId || c.document_version_id!==versionId || !['ready','superseded'].includes(v.processing_status) || !v.storage_path) throw new ReviewError('Historical source unavailable.',404);
  const signed=check(await db.storage.from(v.storage_bucket).createSignedUrl(v.storage_path,300));
  if(!signed?.signedUrl) throw new ReviewError('Historical source unavailable.',404);
  return {url:`${signed.signedUrl.split('#')[0]}${c.page_number?`#page=${c.page_number}`:''}`,historical:v.processing_status==='superseded' || v.document.active_version_id!==v.id || v.document.status!=='active',lifecycle:v.processing_status,title:v.document.title};
}
