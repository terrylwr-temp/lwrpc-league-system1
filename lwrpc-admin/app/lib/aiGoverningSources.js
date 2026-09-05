// Stage 4 only: neither retrieval scores nor the Stage 3 evidence gate change.
export const INSUFFICIENT_EVIDENCE_ANSWER = "I couldn't find an applicable rule or guide in the official LWR Pickleball Club or USA Pickleball materials. Please contact League Management for clarification.";

export function governingSourceClass(documentType) {
  if (["league_rules", "league_supplement"].includes(documentType)) return "lwr_controlling";
  if (documentType === "usap_rulebook") return "usap_governing_fallback";
  return "lwr_supporting_guide";
}

const FRAMING = new Set("what which who when where why how does do did is are was were can could would should will a an and about at be by for from in of on or the to with i we you my our your this that it need needs must rule rules official lwr pickleball club please explain mean meaning definition work works type kind using use used brand someone got halfway through during game games match matches player players happen happens".split(" "));

function normalized(value) {
  return String(value || "").toLowerCase()
    // The processor preserves source text verbatim. This matcher-only form
    // joins the harmless PDF line wrap found in Rule 11.A without changing a
    // stored chunk, embedding, citation, or answer excerpt.
    .replace(/\b(?:non(?:-\s*|\s+)volley\s+zone|kitchen|nvz)\b/g, "nvz")
    // These bounded phrasings describe contact with the NVZ after a volley;
    // they do not turn an isolated "step" into a momentum question.
    .replace(/\b(?:step(?:ping)?\s+(?:into|in)|enter(?:ing)?|carried\s+into)\b/g, "contact")
    .replace(/\bafter\s+(?:hitting|hit)\s+(?:a\s+)?volley\b/g, "after volley")
    .replace(/can't finish|cannot finish|cannot complete|unable to finish|retire(?:ment|d)?|injur(?:y|ed)|hurt|medical issue/g, "retirement")
    .replace(/\btouch(?:ing|es|ed)?\b/g, "touch")
    .replace(/scoring/g, "score").replace(/serving|service|server/g, "serve")
    .replace(/\b(balls|serves|volleys|volleying|bounces|feet|lines|exiting)\b/g, (word) => ({ balls: "ball", serves: "serve", volleys: "volley", volleying: "volley", bounces: "bounce", feet: "foot", lines: "line", exiting: "exit" })[word]);
}

function issueTerms(question) {
  return [...new Set((normalized(question).match(/[a-z0-9]+/g) || []).filter((term) => !FRAMING.has(term)))];
}

// A body passage must contain the issue's specific terms and an actual rule or
// instruction. Titles/headings alone and scattered paragraphs cannot override.
function directPassages(candidate, question) {
  if (isObviouslyIncompleteUsapFragment(candidate)) return [];
  const nvzScope = nvzQuestionScope(question);
  const terms = issueTerms(question);
  if (!terms.length) return [];
  if (nvzScope === "definition" && !isNvzDefinition(candidate)) return [];
  const candidateNvzScope = nvzRuleScope(candidate);
  if (nvzScope && nvzScope !== "definition" && candidate?.documentType === "usap_rulebook" && candidateNvzScope && candidateNvzScope !== nvzScope) return [];
  const content = String(candidate.content || "");
  // Definitions commonly put the term in a label sentence and the dimensions
  // in the immediately following sentence. Keep that single stored chunk
  // intact instead of requiring both words in one sentence.
  if (nvzScope === "definition") return [content];
  // Rule headings and their operative condition may likewise span separate
  // sentences. Scope has already established the USAP provision's fit.
  if (nvzScope && candidate?.documentType === "usap_rulebook" && candidateNvzScope === nvzScope) return [content];
  return content.split(/\n\s*\n|\n(?=\s*(?:[•]|\d+(?:\.\d+)*\.\s))/).filter((passage) => {
    return passage.split(/(?<=[.!?])\s+(?=[A-Z])/).some((sentence) => {
      const words = new Set(normalized(sentence).match(/[a-z0-9]+/g) || []);
      if (!terms.every((term) => words.has(term))) return false;
      if (nvzScope === "definition") return /\b(?:area|court|zone|lines?|feet|dimensional)\b/i.test(sentence);
      // A direction to consult a rule or a statement about its coverage is
      // not the rule's outcome, even when all of the topic words occur locally.
      if (/\b(?:refer|consult|review|read|discuss|address|describe|cover)(?:s|ed|ing)?\b/i.test(sentence)) return false;
      return /\b(?:must|shall|may|cannot|can|only|required|allowed|permitted|prohibited|fault|loses?|wins?|recorded|awarded|use|select|click|save)\b/i.test(sentence);
    });
  });
}

// Scope selection is based on the rule's operative language rather than a
// rule number. It keeps a general NVZ volley question with the general rule,
// while retaining the narrower provisions when the player describes their
// actual condition.
function nvzQuestionScope(question) {
  const value = normalized(question);
  const hasNvz = /\bnvz\b/.test(value);
  if (!hasNvz) return "";
  if (/\bwhat\s+is\b|\bdefine\b|\bdimensions?\b|\bhow\s+(?:big|wide|deep|long)\b/.test(value)) return "definition";
  if (/\b(?:wheelchair|assistive\s+device|large\s+rear\s+wheels?|rear\s+wheels?)\b/.test(value)) return "adaptive";
  const hasVolley = /\bvolley\b/.test(value);
  if (!hasVolley) return "";
  if (/\b(?:contact|touch)\b[^.?!]{0,60}\bwhile\b[^.?!]{0,60}\bvolley\b|\bwhile\b[^.?!]{0,60}\bvolley\b[^.?!]{0,60}\b(?:contact|touch)\b/.test(value)) return "contact_while_volley";
  if (/\b(?:contact|momentum)\b/.test(value) && /\bafter\b/.test(value)) return "post_volley_momentum";
  if (/\b(?:before|until)\b[^.?!]{0,80}\b(?:fully|completely|both\s+feet|outside|exit)\b|\b(?:fully|completely|both\s+feet|outside|exit)\b[^.?!]{0,80}\b(?:before|until)\b/.test(value)) return "exit_before_volley";
  return "general_volley";
}

function nvzRuleScope(candidate) {
  const text = normalized([candidate?.heading, candidate?.content].filter(Boolean).join(" "));
  if (/\b(?:wheelchair|assistive\s+device|large\s+rear\s+wheel|rear\s+wheel)\b/.test(text)) return "adaptive";
  if (/\b(?:contact|touch)\b[^.?!]{0,60}\bwhile\b[^.?!]{0,60}\bvolley\b|\bwhile\b[^.?!]{0,60}\bvolley\b[^.?!]{0,60}\b(?:contact|touch)\b/.test(text)) return "contact_while_volley";
  if (/\bmomentum\b|\beven\s+after\s+the\s+ball\s+becomes\s+dead\b/.test(text)) return "post_volley_momentum";
  if (/\bboth\s+feet\b|\b(?:fully|completely)\s+outside\b|\bfailure\s+to\s+exit\b/.test(text)) return "exit_before_volley";
  if (/\ball\s+volley\s+must\s+be\s+initiated\s+outside\b/.test(text)) return "general_volley";
  return "";
}

function isNvzDefinition(candidate) {
  const text = normalized([candidate?.heading, candidate?.content].filter(Boolean).join(" "));
  return /\bnvz\b/.test(text) && /\b(?:area|court|zone|lines?|feet|dimensional)\b/.test(text);
}

function isObviouslyIncompleteUsapFragment(candidate) {
  if (candidate?.documentType !== "usap_rulebook") return false;
  const content = String(candidate?.content || "").trim();
  return content.length > 0
    && !/[.!?)]$/.test(content)
    && /\b(?:when|if|unless|because|while|where|that|which|the|a|an|and|or|to|of|for|with|from|on|in|at|by|server|player|referee)$/i.test(content);
}

export function selectGoverningEvidence(retrieval, { detectIntents, intentSupport, selectLocal, limit }) {
  const threshold = Number(retrieval.evidence.threshold) || .35;
  const candidates = retrieval.suppliedEvidence.filter((candidate) => Number(candidate.combinedScore) >= threshold);
  const question = retrieval.request?.question || "";
  // Split only explicit independent interrogatives, keeping noun conjunctions
  // (e.g. paddle and net) together so neither qualifier silently disappears.
  const clauses = question.split(/\?\s*|;\s*|\s+and\s+(?=(?:when|what|how|can|does|is|where|why)\b)/i).filter((clause) => clause.trim());
  const issues = clauses.flatMap((clause) => {
    const intents = detectIntents(clause);
    return intents.length ? intents.map((intent) => ({ intent, question: clause, local: true })) : [{ intent: clause.trim(), question: clause, local: false }];
  });
  const usapApplies = candidates.some((candidate) => candidate.documentType === "usap_rulebook" && issues.some((issue) => (
    issue.local ? intentSupport(candidate, issue.intent, issue.question) : directPassages(candidate, issue.question).length
  )));
  if (!usapApplies) {
    for (const candidate of retrieval.suppliedEvidence.filter((item) => item.documentType === "usap_rulebook")) {
      candidate.sourceClassification = "usap_governing_fallback";
      candidate.governingDiagnostics = [{ intent: question, reason: "No direct applicable USAP passage", overridden: false }];
    }
    return selectLocal({ ...retrieval, suppliedEvidence: candidates.filter((candidate) => candidate.documentType !== "usap_rulebook") });
  }
  const selected = new Map();
  const overriddenPassages = new Map();
  const diagnostics = new Map(candidates.map((candidate) => [candidate.chunkId, []]));
  for (const issue of issues) {
    const direct = candidates.map((candidate) => {
      const support = issue.local ? intentSupport(candidate, issue.intent, issue.question) : null;
      const passages = issue.local ? (support ? [candidate.content] : []) : directPassages(candidate, issue.question);
      return { candidate, support, passages, classification: governingSourceClass(candidate.documentType) };
    }).filter(({ passages }) => passages.length);
    const lwr = direct.filter((item) => item.classification === "lwr_controlling");
    const usap = direct.filter((item) => item.classification === "usap_governing_fallback");
    const governing = lwr.length ? lwr : usap.length ? usap : direct;
    // Preserve LMS-0705 strength ordering for dates/deadlines before rank.
    governing.sort((a, b) => (b.support?.strength || 0) - (a.support?.strength || 0)
      || Number(a.candidate.documentAuthorityRank) - Number(b.candidate.documentAuthorityRank)
      || Number(b.candidate.combinedScore) - Number(a.candidate.combinedScore));
    let retained = governing.slice(0, 1);
    if (issue.local && lwr.length) {
      const localSelection = selectLocal({ ...retrieval, request: { ...retrieval.request, question: issue.question }, suppliedEvidence: direct.filter((item) => item.classification !== "usap_governing_fallback").map((item) => item.candidate) });
      retained = direct.filter((item) => localSelection.some((chosen) => chosen.chunkId === item.candidate.chunkId));
    } else {
      // Retain same-authority evidence for conflict detection / continuations.
      retained = governing.filter((item) => item.candidate.documentAuthorityRank === governing[0]?.candidate.documentAuthorityRank);
    }
    for (const item of direct) {
      const overridden = item.classification === "usap_governing_fallback" && lwr.length > 0;
      if (overridden) overriddenPassages.set(item.candidate.chunkId, [...(overriddenPassages.get(item.candidate.chunkId) || []), ...item.passages]);
      diagnostics.get(item.candidate.chunkId).push({ intent: issue.intent, reason: overridden ? "Excluded: directly applicable LWR rule controls this same issue" : "Direct local passage addresses this issue", overridden });
    }
    for (const item of retained) {
      const previous = selected.get(item.candidate.chunkId);
      selected.set(item.candidate.chunkId, {
        ...item.candidate,
        // USAP chunks can span several issues. Only eligible verbatim passages
        // reach the model, preventing an overridden sibling issue leaking back.
        content: item.classification === "usap_governing_fallback" ? [...new Set([...(previous?.selectedPassages || []), ...item.passages])].join("\n\n") : item.candidate.content,
        selectedPassages: [...new Set([...(previous?.selectedPassages || []), ...item.passages])],
        sourceClassification: item.classification,
        intentSupport: [...new Set([...(previous?.intentSupport || []), issue.intent])],
        evidenceRole: item.classification === "lwr_supporting_guide" ? "Supporting" : "Primary / controlling",
        evidenceSelectionReason: item.classification === "lwr_controlling" ? "Directly applicable LWR rule controls this issue" : item.classification === "usap_governing_fallback" ? "Applicable USAP rule; no direct LWR override for this issue" : "Direct supporting guide; cannot override a governing playing rule",
      });
    }
  }
  for (const candidate of retrieval.suppliedEvidence) {
    candidate.sourceClassification = governingSourceClass(candidate.documentType);
    candidate.governingDiagnostics = diagnostics.get(candidate.chunkId) || [];
  }
  // Reserve one slot per covered issue before additional same-issue evidence.
  const values = [...selected.values()].map((candidate) => {
    if (candidate.documentType !== "usap_rulebook") return candidate;
    const blocked = overriddenPassages.get(candidate.chunkId) || [];
    const passages = candidate.selectedPassages.filter((passage) => !blocked.some((excluded) => excluded.includes(passage) || passage.includes(excluded)));
    return { ...candidate, selectedPassages: passages, content: passages.join("\n\n") };
  }).filter((candidate) => candidate.content);
  const required = issues.map((issue) => values.find((candidate) => candidate.intentSupport.includes(issue.intent))).filter(Boolean);
  return [...new Set([...required, ...values])].slice(0, limit).map((candidate) => ({ ...candidate, governingDiagnostics: diagnostics.get(candidate.chunkId) || [] }));
}
