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
    .replace(/non[ -]volley zone|kitchen/g, "nvz")
    .replace(/can't finish|cannot finish|cannot complete|unable to finish|retire(?:ment|d)?|injur(?:y|ed)|hurt|medical issue/g, "retirement")
    .replace(/\btouch(?:ing|es|ed)?\b/g, "touch")
    .replace(/scoring/g, "score").replace(/serving|service|server/g, "serve")
    .replace(/\b(balls|serves|volleys|bounces|feet|lines)\b/g, (word) => ({ balls: "ball", serves: "serve", volleys: "volley", bounces: "bounce", feet: "foot", lines: "line" })[word]);
}

function issueTerms(question) {
  return [...new Set((normalized(question).match(/[a-z0-9]+/g) || []).filter((term) => !FRAMING.has(term)))];
}

// A body passage must contain the issue's specific terms and an actual rule or
// instruction. Titles/headings alone and scattered paragraphs cannot override.
function directPassages(candidate, question) {
  const terms = issueTerms(question);
  if (!terms.length) return [];
  return String(candidate.content || "").split(/\n\s*\n|\n(?=\s*(?:[•]|\d+(?:\.\d+)*\.\s))/).filter((passage) => {
    return passage.split(/(?<=[.!?])\s+(?=[A-Z])/).some((sentence) => {
      const words = new Set(normalized(sentence).match(/[a-z0-9]+/g) || []);
      if (!terms.every((term) => words.has(term))) return false;
      // A direction to consult a rule or a statement about its coverage is
      // not the rule's outcome, even when all of the topic words occur locally.
      if (/\b(?:refer|consult|review|read|discuss|address|describe|cover)(?:s|ed|ing)?\b/i.test(sentence)) return false;
      return /\b(?:must|shall|may|cannot|can|only|required|allowed|permitted|prohibited|fault|loses?|wins?|recorded|awarded|use|select|click|save)\b/i.test(sentence);
    });
  });
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
