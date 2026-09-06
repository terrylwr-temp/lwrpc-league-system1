// Bounded Stage 4 concepts, not query rewriting or general-purpose stemming.
const normalized = value => String(value || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
const change = /\b(?:reschedul(?:e|ed|ing)|chang(?:e|ed|ing)|mov(?:e|ed|ing))\b/;
export function schedulingQuestionKind(question) {
  const q = normalized(question);
  const temporal = /\b(?:earlier|later|another (?:day|time)|different (?:day|time)|date|time|scheduled)\b/.test(q);
  const operation = change.test(q) || /\bplay\b/.test(q) && temporal;
  if (!operation) return '';
  if (/\b(?:playoffs?|championships?)\b/.test(q)) return /\bmakeup\b/.test(q) ? 'makeup_deadline' : 'competition';
  if (/\b(?:lineups?|rosters?|players?|scores?|results?|division|join|change teams|switch teams)\b/.test(q)) return '';
  const context = /\b(?:match|game)s?\b/.test(q) || /\bboth (?:captains|coaches)\b/.test(q) && /\bagree\b/.test(q) && /\bplay\b/.test(q);
  if (!context) return '';
  if (/\b(?:interrupted|stopped|unfinished|forfeit|unable to reschedule|resume)\b/.test(q)) return '';
  if (/\bflex\b|\b(?:edit|button|click|lms)\b/.test(q)) return 'flex';
  if (/\breschedul(?:e|ed|ing)\b/.test(q) || temporal || /\bmov(?:e|ed|ing)\b/.test(q)) return 'match_schedule_change';
  return '';
}

export function schedulingPassageApplies(passage, kind) {
  const p = normalized(passage);
  if (kind === 'makeup_deadline') return /\bmakeup games?\b/.test(p) && /\bmust be played\b/.test(p) && /\bbefore\b/.test(p) && /\bplayo(?:ff|ư)s?\/championship|\bplayoffs?\b/.test(p);
  if (kind === 'flex') return /\bflex league\b/.test(p) && /\b(?:modify|edit|chang(?:e|ing))\b/.test(p) && /\b(?:day|date|time)\b/.test(p);
  if (kind !== 'match_schedule_change') return false;
  // An operative mutual-agreement permission, not consequences of failure or
  // editing privileges scoped to flex divisions. Preserve the full provision.
  return /\b(?:both|mutual(?:ly)?)\b/.test(p) && /\b(?:coaches|captains)\b/.test(p) && /\bagree\b/.test(p)
    && /\b(?:games?|matches?|match)\b/.test(p) && /\bmay\b[^.!?]{0,100}\breschedul(?:e|ed|ing)\b/.test(p)
    && /\b(?:same (?:day|week)|another (?:day|time)|different time)\b/.test(p)
    && !/\bflex league|\binterrupt\w*|\bunable to reschedule\b/.test(p);
}

export function schedulingPolicyApplies(question, revision) {
  return schedulingQuestionKind(question) === 'match_schedule_change'
    && schedulingQuestionKind(revision.canonical_question) === 'match_schedule_change'
    && schedulingPassageApplies(revision.approved_answer, 'match_schedule_change');
}
