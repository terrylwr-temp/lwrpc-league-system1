// Request-local manager diagnostics only. Never include receipt contents or history.
export function conversationDiagnostics(resolution, { stage3Invoked = false, answer = null } = {}) {
  return {
    rawQuestion: String(resolution.rawQuestion || "").slice(0, 1000),
    receiptSupplied: Boolean(resolution.receiptSupplied),
    receiptValidation: resolution.receiptValidation,
    priorContextPurpose: resolution.priorContextPurpose,
    classification: resolution.classification,
    effectiveQuestion: String(resolution.effectiveQuestion || "").slice(0, 2400),
    inheritedContext: ["follow_up", "clarification_response"].includes(resolution.classification),
    rawLiveDataGuard: resolution.rawLiveDataGuard,
    effectiveLiveDataGuard: resolution.effectiveLiveDataGuard,
    stage3Invoked,
    selectedEvidence: (answer?.selectedEvidence || []).slice(0, 24).map(item => ({
      chunkId: String(item.chunkId || "").slice(0, 80), ruleNumber: String(item.ruleNumber || "").slice(0, 80),
    })),
    finalResponseKind: resolution.kind !== "resolved" ? resolution.kind
      : answer?.conflict?.requiresClarification ? "conflict" : answer?.evidenceSufficient ? "answer" : "insufficient_evidence",
  };
}
