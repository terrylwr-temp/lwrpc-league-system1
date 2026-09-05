export const CURRENT_CONTEXT_KEY = "lwr-ask-ai-current-context-v1";

// Display history is deliberately not an input. Missing/legacy state starts empty.
export function createConversationContext(storage) {
  let receipt = null;
  let revision = 0;
  try {
    const saved = JSON.parse(storage?.getItem(CURRENT_CONTEXT_KEY) || "null");
    receipt = typeof saved?.receipt === "string" ? saved.receipt : null;
  } catch { /* Unavailable or invalid session storage starts without context. */ }
  function replace(value) {
    receipt = typeof value === "string" && value ? value : null;
    try { storage?.setItem(CURRENT_CONTEXT_KEY, JSON.stringify({ receipt })); } catch { /* Keep in-memory context. */ }
  }
  return {
    current: () => receipt,
    begin() {
      const request = { receipt, revision: ++revision };
      // A submitted dependency cannot be resurrected after an error or remount.
      replace(null);
      return request;
    },
    complete(request, value) {
      if (request.revision === revision) replace(value);
    },
  };
}

let browserContext;
export function currentConversationContext() {
  if (!browserContext) {
    let storage;
    try { storage = window.sessionStorage; } catch { /* Session storage may be disabled. */ }
    browserContext = createConversationContext(storage);
  }
  return browserContext;
}
