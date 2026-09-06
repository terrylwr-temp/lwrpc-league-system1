// Generation contract only. Selection and conflict/eligibility gates establish
// this trusted role; neither model output nor a retrieved candidate can set it.
export const MATERIAL_SUPPLEMENT_INSTRUCTION = 'Evidence marked "Supplemental official LWR knowledge — materially selected" has already passed applicability, current-policy and non-conflict selection. Its distinct material policy contributions are required, not optional. Preserve the governing rule AND every additional material obligation, permission, qualification or procedure supplied by that selected supplement. Higher formal authority prevents contradiction or override; it does not discard consistent supplemental requirements. Preserve each requirement\'s triggering condition and scope: do not narrow a generally applicable supplemental obligation to an exception described by the formal rule. Merge genuinely redundant statements once; do not repeat all source sentences or add commentary about this contract. Do not decide to ignore a materially selected supplement for brevity. Before finalizing, check that your answer communicates all distinct material contributions from each marked source. If that cannot be done consistently from the supplied evidence, report the existing supported/conflict status truthfully rather than returning a partial answer as supported.';

export function hasMaterialSupplements(evidence) {
  return evidence.some(s=>s.sourceKind==='approved_answer'&&s.materialSupplement===true);
}

export function supplementalPromptMetadata(source) {
  return source.sourceKind==='approved_answer'&&source.materialSupplement===true
    ? '\nMaterial contribution contract: REQUIRED. Preserve the distinct policy contributions and their conditions in the exact approved content below; combine redundant formal facts once. The formal rule remains governing.' : '';
}
