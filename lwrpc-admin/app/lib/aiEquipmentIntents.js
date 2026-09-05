// These narrow intent helpers identify the kind of official evidence needed;
// they never supply an equipment brand, model, or rule outcome.
export const CLUB_SELECTED_MATCH_EQUIPMENT_INTENT = "Club-selected match equipment";
export const USAP_LEGAL_BALL_INTENT = "USAP legal ball specifications";

function words(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }

export function isClubSelectedMatchEquipmentQuestion(question) {
  const value = words(question);
  if (!/\b(?:ball|balls)\b/.test(value)) return false;
  const asksSelection = /\b(?:what|which|kind|type)\b/.test(value);
  const useSignal = /\b(?:use|using|used|playing|play)\b/.test(value);
  const clubSignal = /\b(?:we|our|lwr|club|league|match|matches|season|playoff|playoffs)\b/.test(value);
  const matchBall = /\bmatch balls?\b|\bleague match balls?\b/.test(value);
  return matchBall || (asksSelection && useSignal && clubSignal);
}

export function isLwrSelectedMatchEquipmentEvidence(candidate) {
  if (!candidate || candidate.documentType === "usap_rulebook") return false;
  const source = [candidate.sectionLabel, candidate.heading, candidate.content].filter(Boolean).join(" ");
  const text = words(source);
  // The source must explicitly assign equipment for match play. This admits
  // the active document's "The League shall provide: Match Balls: …" wording
  // without knowing the make or model it names.
  return /\bmatch\s+balls?\s*:\s*\S/i.test(source)
    && /\b(?:shall|must|will|provide|provided|using|used|select|selected|required)\b/.test(text)
    && /\b(?:league|match|matches|season|playoff|playoffs)\b/.test(text);
}

export function isUsapLegalBallQuestion(question) {
  const value = words(question);
  if (isClubSelectedMatchEquipmentQuestion(value) || !/\b(?:ball|balls|pickleball)\b/.test(value)) return false;
  const legalOrSpecification = /\b(?:legal|approved|approval|specification|specifications|requirement|requirements)\b/.test(value);
  const usapSignal = /\b(?:usa|usap|pickleball)\b/.test(value);
  return legalOrSpecification && usapSignal;
}

export function isUsapBallSpecificationEvidence(candidate) {
  if (candidate?.documentType !== "usap_rulebook") return false;
  const text = words([candidate.sectionLabel, candidate.heading, candidate.content].filter(Boolean).join(" "));
  return /\bball specifications?\b/.test(text)
    || /\brequirements? for (?:the )?ball\b/.test(text)
    || /\bapproved balls?\b/.test(text);
}
