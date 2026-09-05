// Shared bounded wording: general player-availability checks, not live roster lookup.
export function isRosterTroubleshooting(value) {
  return /\b(?:player|person|member)\b/i.test(value)
    && /\b(?:why|what\s+should\s+i\s+check)\b/i.test(value)
    && /\b(?:find|show\s+up|available)\b/i.test(value)
    && /\b(?:add|adding|change|changing|roster)\b/i.test(value);
}

export const ROSTER_TROUBLESHOOTING_INTENT = "Roster availability troubleshooting";

export function rosterTroubleshootingSupport(passage) {
  // A match lineup, retroactive addition or viewing page does not explain Manage Roster availability.
  if (/\b(?:match\s+setup|upcoming\s+match|match\s+rosters?|match\s+lineups?|player\s+pairings?|retroactive|forfeit|scheduling|roster\s*&\s*courts)\b/.test(passage)) return null;
  const procedure = /\bmanage\s+roster\b/.test(passage)
    && /\b(?:add|change|remove|update)\b/.test(passage);
  const eligibility = /\bplayers?\b[^.]{0,100}\bmust\b[^.]{0,140}\b(?:members?|membership|dupr)\b/.test(passage)
    || /\b(?:current|valid|active)\b[^.]{0,30}\bmember\b/.test(passage)
    || /\beligible\s+for\s+(?:(?:that|the|their)\s+)?division\b/.test(passage);
  const selection = /\badd\s+player\b/.test(passage)
    && /\b(?:available|eligibility|community|drop-down)\b/.test(passage);
  return eligibility || selection ? { strength: 100, reason: "Documented player eligibility or selection checks; not a live diagnosis" }
    : procedure ? { strength: 75, reason: "Direct Manage Roster procedure" } : null;
}
