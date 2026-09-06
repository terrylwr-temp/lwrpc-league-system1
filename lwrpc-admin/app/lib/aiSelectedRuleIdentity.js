import { evidencePassages } from "./aiQuestionApplicability.js";
// Presentation only: never used to retrieve, select, or authorize evidence.
const compact = value => String(value || "").replace(/\s+/g, " ").trim();
const valid = value => /^(?:\d{1,2}(?:\.\d{1,2})*|\d{1,2}(?:\.(?:[A-Z]|\d{1,2}|[a-z])){1,6})$/.test(value);
const within = (child, parent) => child === parent || child.startsWith(`${parent}.`);

export function trustedSelectedRuleIdentity(selected, stored) {
  const parent = String(stored.rule_number || "").trim();
  const fallback = valid(parent) ? parent : "";
  const passages = Array.isArray(selected.selectedPassages) && selected.selectedPassages.length ? selected.selectedPassages : [selected.content];
  if (selected.content !== undefined && compact(selected.content) !== compact(passages.join("\n"))) throw new Error("Selected model text does not match its selected passages.");
  const content = compact(stored.content);
  // Reject altered evidence before either prompting or attaching sources.
  const units = evidencePassages({ content: stored.content, heading: stored.heading }).map(compact);
  if (!content || passages.some(p => !compact(p) || !(content.includes(compact(p)) || units.includes(compact(p))))) throw new Error("Selected passage is not present in the revalidated official chunk.");
  if (!fallback) return "";
  const usap = /[A-Za-z]/.test(parent);
  const start = usap ? /^(\d{1,2}(?:\.(?:[A-Z]|\d{1,2}|[a-z])){1,6})\.?\s+/ : /^(\d{1,2}(?:\.\d{1,2})*)\.\s+/;
  const identities = [];
  for (const passage of passages) {
    const lines = String(passage).trim().split(/\r?\n/);
    const id = lines[0].match(start)?.[1];
    if (!id || !valid(id) || !within(id, parent)) return fallback;
    // The start must also be a structural boundary in the trusted full chunk.
    const trustedLines = String(stored.content).split(/\r?\n/).map(line => line.trim());
    if (!trustedLines.some(line => line.match(start)?.[1] === id && compact(passage).startsWith(compact(line)))) return fallback;
    const others = lines.slice(1).map(line => line.trim().match(start)?.[1]).filter(Boolean);
    if (others.some(other => !within(other, id))) return fallback;
    identities.push(id);
  }
  const unique = [...new Set(identities)].filter(id => !identities.some(other => other !== id && within(id, other)));
  const combined = unique.join(", ");
  return unique.length <= 4 && combined.length <= 120 ? combined : fallback;
}
