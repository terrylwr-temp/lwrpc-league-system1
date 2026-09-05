// One controller per mounted assistant. The lock is synchronous, before React renders.
export function createFeedbackController({ updateEntry, getAuthorizationHeaders, fetchImpl = fetch }) {
  const inFlight = new Set();
  const confirmed = new Map();
  return async function submitFeedback(entry, helpful) {
    const receipt = entry?.result?.feedbackReceipt;
    const selected = confirmed.has(entry?.id) ? confirmed.get(entry.id) : entry?.feedback?.helpful;
    if (!receipt || inFlight.has(entry.id) || selected === helpful) return;
    inFlight.add(entry.id);
    updateEntry(entry.id, { feedbackWorking: true, feedbackError: false });
    try {
      const response = await fetchImpl("/api/ask-lwr/feedback", {
        method: "POST", headers: { "Content-Type": "application/json", ...(await getAuthorizationHeaders()) },
        body: JSON.stringify({ receipt, helpful }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success || typeof payload?.result?.helpful !== "boolean") throw new Error("feedback_failed");
      confirmed.set(entry.id, payload.result.helpful);
      updateEntry(entry.id, { feedback: { helpful: payload.result.helpful, feedbackId: payload.result.feedbackId || null } });
    } catch {
      // Keep the last confirmed selection; never optimistically commit a failed vote.
      updateEntry(entry.id, { feedbackError: true });
    } finally {
      inFlight.delete(entry.id);
      updateEntry(entry.id, { feedbackWorking: false });
    }
  };
}

export function resetFeedbackPending(entry) {
  return { ...entry, feedbackWorking: false };
}
