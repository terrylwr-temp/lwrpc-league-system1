import { APP_VERSION } from './version.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const id = value => UUID.test(String(value || '')) ? value : null;
const label = (value, limit) => {
  const text = String(value || '').trim();
  if (/https?:\/\//i.test(text) || text.length > limit) throw new Error('completed_source_invalid');
  return text;
};

// Only final, trusted citations are retained. Viewer URLs and evidence excerpts
// never enter the completed-interaction payload.
export function completedSourceRefs(sources = []) {
  if (!Array.isArray(sources) || sources.length > 8) throw new Error('completed_sources_bound');
  return sources.map(source => ({
    sourceKind: label(source.sourceKind, 80),
    documentId: id(source.documentId), documentVersionId: id(source.documentVersionId),
    chunkId: id(source.chunkId), approvedAnswerId: id(source.approvedAnswerId),
    approvedRevisionId: id(source.approvedRevisionId),
    documentTitle: label(source.documentTitle, 300), citation: label(source.citation, 600),
    ruleNumber: label(source.ruleNumber, 120), pageNumber: Number.isInteger(source.pageNumber) ? source.pageNumber : null,
    sectionLabel: label(source.sectionLabel, 300),
  }));
}

export function completedInteractionPayload({ outcome, execution, authorization, routeStarted, origin }) {
  const resolution = execution.conversationResolution || {};
  const raw = String(resolution.rawQuestion || '').trim();
  const original = resolution.clarificationConsumed && resolution.reviewOriginalQuestion
    ? String(resolution.reviewOriginalQuestion).trim() : raw;
  const effective = String(resolution.effectiveQuestion || '').trim();
  const finalAnswer = String(execution.result?.answer || '');
  if (!original || !effective || !finalAnswer.trim() || /^choice:[0-9a-f-]{36}$/i.test(original)
    || /^choice:[0-9a-f-]{36}$/i.test(effective)
    || original.length > 1000 || effective.length > 2400 || finalAnswer.length > 16000) {
    throw new Error('completed_content_invalid');
  }
  const sourceRefs = completedSourceRefs(execution.answer?.sources || []);
  return {
    id: outcome.id, outcome_id: outcome.id,
    request_started_at: outcome.request_started_at, completed_at: outcome.completed_at,
    original_question: original, effective_question: effective, final_answer: finalAnswer,
    auth_user_id: authorization.user.id, member_id: authorization.memberRows?.[0]?.id || null,
    role_at_request: authorization.role, origin,
    test_classification: origin === 'manager_test' ? 'manager_console' : 'none',
    result_kind: outcome.final_kind, completion_status: 'finalized',
    server_response_ms: Math.max(0.001, Number((performance.now() - routeStarted).toFixed(3))),
    source_refs: sourceRefs, assistant_version: APP_VERSION,
  };
}

export async function persistCompletedOfficial(db, { outcome, exception, execution, authorization, routeStarted, origin }) {
  const interaction = completedInteractionPayload({ outcome, execution, authorization, routeStarted, origin });
  const { error } = await db.rpc('capture_ai_completed_official', {
    p_outcome: outcome, p_occurrence: exception.p_occurrence,
    p_route: exception.p_route, p_interaction: interaction,
  }).abortSignal(AbortSignal.timeout(5000));
  if (error) throw new Error('completed_capture_failed');
  return interaction.id;
}
