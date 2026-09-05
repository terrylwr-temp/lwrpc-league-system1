export const REVIEW_CATEGORIES = {
  unclassified: 'Unclassified', lwr_rule_update: 'LWR Rule update', lwr_guide_update: 'LWR Guide update',
  dates_source_update: 'Important Dates/source update', ai_retrieval_selection: 'AI/Retrieval Review',
  clarification_wording: 'Clarification/wording', usap_no_lwr_change: 'USAP/no LWR change',
  future_live_lms: 'Future Live LMS Intelligence', not_a_problem: 'Not actually a problem', other: 'Other',
};
export const REVIEW_STATUSES = ['new', 'reviewing', 'resolved', 'dismissed'];
export const RETEST_KEY = 'lwr-ai-review-retest-v1';
export function reviewRoleAllowed(role) { return ['commissioner', 'league_manager'].includes(role); }
export function feedbackPercent(numerator, denominator) { return denominator ? `${(100 * numerator / denominator).toFixed(2)}%` : 'No feedback'; }
export function consumeReviewRetest(storage, now = Date.now()) {
  const raw = storage.getItem(RETEST_KEY); storage.removeItem(RETEST_KEY);
  try {
    const item = JSON.parse(raw);
    return item && typeof item.question === 'string' && item.question.length <= 2400 && item.expires > now && item.expires <= now + 300000 ? item.question : null;
  } catch { return null; }
}
