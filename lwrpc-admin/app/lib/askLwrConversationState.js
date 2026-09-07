import { resetFeedbackPending } from "./askLwrFeedbackState.js";
export const CURRENT_CONTEXT_KEY = "lwr-ask-ai-current-context-v1";
export const SESSION_EXCHANGES_KEY = "lwr-ask-ai-exchanges";

// Display history is deliberately not an input. Missing/legacy state starts empty.
export function createConversationContext(storage) {
  let receipt = null;
  let revision = 0;
  let generation = 0;
  let operations = 0;
  let history;
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener());
  try {
    const saved = JSON.parse(storage?.getItem(CURRENT_CONTEXT_KEY) || "null");
    receipt = typeof saved?.receipt === "string" && !saved.receipt.startsWith('live1.') ? saved.receipt : null;
  } catch { /* Unavailable or invalid session storage starts without context. */ }
  function replace(value) {
    receipt = typeof value === "string" && value ? value : null;
    try { storage?.setItem(CURRENT_CONTEXT_KEY, JSON.stringify({ receipt:receipt?.startsWith('live1.')?null:receipt })); } catch { /* Keep in-memory context. */ }
  }
  return {
    generation: () => generation,
    busy: () => operations > 0,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    startOperation() { operations++; notify(); let ended = false; return () => { if (!ended) { ended = true; operations--; notify(); } }; },
    history() {
      if (history === undefined) {
        try { const saved = JSON.parse(storage?.getItem(SESSION_EXCHANGES_KEY) || "[]"); history = Array.isArray(saved) ? saved.filter(e => e && !e.liveSensitive && !e.result?.live && !e.pending && (e.result || e.requestError)).slice(0, 8).map(resetFeedbackPending) : []; } catch { history = []; }
      }
      return history;
    },
    saveHistory(value, expectedGeneration) {
      if (expectedGeneration !== generation) return false;
      history = value;
      try {
        const completed = value.filter(e => !e.liveSensitive && !e.result?.live && !e.pending && (e.result || e.requestError)).slice(0, 8);
        if (completed.length) storage?.setItem(SESSION_EXCHANGES_KEY, JSON.stringify(completed));
        else storage?.removeItem(SESSION_EXCHANGES_KEY);
      } catch { /* In-memory history remains usable when storage refuses writes. */ }
      notify();
      return true;
    },
    reset(force = false) {
      if (operations && !force) return false;
      ++revision; ++generation;
      receipt = null; history = [];
      for (const key of [CURRENT_CONTEXT_KEY, SESSION_EXCHANGES_KEY]) {
        try { storage?.removeItem(key); } catch { /* Reset is immediate, but cannot guarantee persistence across reload. */ }
      }
      notify();
      return true;
    },
    current: () => receipt,
    begin() {
      const request = { receipt, revision: ++revision, generation };
      // A submitted dependency cannot be resurrected after an error or remount.
      replace(null);
      return request;
    },
    complete(request, value) {
      if (request.revision === revision && request.generation === generation) replace(value);
    },
  };
}

let browserContext;
let identitySubscribed=false;
export function currentConversationContext(authClient) {
  if (!browserContext) {
    let storage;
    try { storage = window.sessionStorage; } catch { /* Session storage may be disabled. */ }
    browserContext = createConversationContext(storage);
  }
  if(authClient&&!identitySubscribed){
    identitySubscribed=true;
    let previousUser;
    authClient.auth.onAuthStateChange((event,session)=>{
      const user=session?.user?.id;
      if(event==='SIGNED_OUT'||(previousUser!==undefined&&previousUser!==user))browserContext.reset(true);
      previousUser=user;
    });
  }
  return browserContext;
}
