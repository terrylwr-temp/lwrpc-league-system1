import { ReviewError, reviewToken, readReviewToken } from './aiReviewService.js';
import { safeInteractionText } from './aiInteractionHistory.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FEEDBACK = ['all','helpful','not_helpful','no_feedback','ambiguous'];
const CLASSIFICATIONS = ['none','manager_console','automated_test','all'];
const RESULTS = ['all','answer','insufficient_evidence'];
const stamp = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const uuid = value => UUID.test(String(value || '')) ? value : null;
const clean = (value, max) => typeof value === 'string' ? safeInteractionText(value)?.slice(0,max) || null : null;
const count = value => Number.isSafeInteger(Number(value)) && Number(value)>=0 ? Number(value) : 0;

export function completedFilters(params, now = new Date()) {
  const period = params.get('period') || '30';
  const asof = stamp(params.get('asof') || now.toISOString());
  const filters = {
    period, feedback: params.get('feedback') || 'all',
    classification: params.get('classification') || 'none',
    result: params.get('result') || 'all', rule: (params.get('rule') || '').trim(),
    search: (params.get('search') || '').trim(), limit: Number(params.get('limit') || 25),
  };
  if (!['7','30','90','all'].includes(period) || !FEEDBACK.includes(filters.feedback)
    || !CLASSIFICATIONS.includes(filters.classification) || !RESULTS.includes(filters.result)
    || filters.rule.length>120 || filters.search.length>200 || ![25,50].includes(filters.limit)
    || !asof || asof>now.toISOString()) throw new ReviewError('Invalid completed interaction filters.');
  return { ...filters, from:period==='all'?null:new Date(new Date(asof).getTime()-Number(period)*86400000).toISOString(),to:asof,asof };
}

function view(row, detail = false) {
  const result = {
    id: uuid(row.answer_id), occurredAt: stamp(row.occurred_at), timeBasis:'completed',
    origin: row.origin === 'manager_test' ? 'manager_test' : 'player_interface',
    classification: CLASSIFICATIONS.includes(row.test_classification) ? row.test_classification : 'none',
    result: RESULTS.includes(row.result) ? row.result : null,
    completionStatus: row.completion_status === 'finalized' ? 'finalized' : null,
    question:clean(row.question,detail?1000:240), answer:clean(row.answer,detail?16000:320),
    feedback:FEEDBACK.includes(row.feedback)?row.feedback:'no_feedback',feedbackAt:stamp(row.feedback_at),
    userName:clean(row.user_name,300),userNameBasis:row.user_name_basis==='current_member_record'?'current_member_record':null,
    userId:uuid(row.auth_user_id),memberId:uuid(row.member_id),userRole:clean(row.user_role,80),
    responseMs:Number.isFinite(Number(row.response_ms))?Number(row.response_ms):null,
    sourceRefs:Array.isArray(row.source_refs)?row.source_refs.slice(0,8).map(s=>({
      sourceKind:clean(s.sourceKind,80),documentId:uuid(s.documentId),documentVersionId:uuid(s.documentVersionId),
      chunkId:uuid(s.chunkId),approvedAnswerId:uuid(s.approvedAnswerId),approvedRevisionId:uuid(s.approvedRevisionId),
      documentTitle:clean(s.documentTitle,300),citation:clean(s.citation,600),ruleNumber:clean(s.ruleNumber,120),
      pageNumber:Number.isInteger(s.pageNumber)?s.pageNumber:null,sectionLabel:clean(s.sectionLabel,300),
    })):[],
    payloadPurged:row.payload_purged===true,hasQuestion:row.has_question===true,hasAnswer:row.has_answer===true,
  };
  if (detail) result.effectiveQuestion=clean(row.effective_question,2400);
  return result;
}

function checked(response) {
  if (response.error || !Array.isArray(response.data?.rows)) throw new ReviewError('Completed interaction history is unavailable.',503);
  return response.data;
}

export async function completedInteractionReport(db, params, user) {
  let filters=completedFilters(params);
  let after={};
  const cursor=params.get('cursor');
  if(cursor){
    const token=readReviewToken(cursor,user);
    if(token.kind!=='ai_completed' || JSON.stringify(token.filters)!==JSON.stringify(filters)
      || !stamp(token.at) || !uuid(token.id)) throw new ReviewError('History filters changed. Start again.');
    filters=token.filters;after={cursor_at:token.at,cursor_id:token.id};
  }
  const data=checked(await db.rpc('ai_review_completed_interactions',{p_filters:{...filters,...after}}));
  const rows=data.rows.slice(0,filters.limit);
  const last=rows.at(-1);
  const summary=Object.fromEntries(['total','helpful','not_helpful','no_feedback','ambiguous'].map(k=>[k,count(data.summary?.[k])]));
  return {rows:rows.map(r=>view(r)),summary,asof:filters.asof,
    total:summary[filters.feedback==='all'?'total':filters.feedback],
    next:data.rows.length>filters.limit&&last?reviewToken({user,kind:'ai_completed',filters,at:last.occurred_at,id:last.answer_id}):null};
}

export async function completedInteractionDetail(db, params) {
  const answer=uuid(params.get('answer'));
  if(!answer)throw new ReviewError('Select an interaction.');
  const now=new Date().toISOString();
  const data=checked(await db.rpc('ai_review_completed_interactions',{p_filters:{
    from:null,to:now,asof:now,limit:25,feedback:'all',classification:'all',result:'all',
    rule:'',search:'',answer,
  }}));
  const row=data.rows.find(r=>r.answer_id===answer);
  if(!row)throw new ReviewError('Interaction unavailable or no longer retained.',404);
  return {interaction:view(row,true)};
}
