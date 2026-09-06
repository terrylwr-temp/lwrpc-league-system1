// Official rule/role vocabulary in structural context, not globally safe words.
const structuralPossessive = /(?:^|\bthe\s+|\bunder\s+)((?:(?:League|USAP)\s+)?Rules?|League|Management|(?:Home\s+|Visiting\s+)?Captain|Team|Division|Match Setup|Season DUPR|USA Pickleball|Picklebreaker)['’]s\s+(?:requirements?|scheduling|score-reporting|rules?|responsibilit(?:y|ies)|roster|division|format|procedures?|deadline|score|points?|rating|court|captain|players?|lineup|policy|guidance)\b/g;

export function hasQualityPersonalName(text) {
  // Explicit identity context is checked before considering structural spans.
  if (/\b(?:player|member|named)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b|\bis\s+[A-Z][a-z]+\s+(?:missing|absent|eligible)\b/.test(text)) return true;
  const structural = [...text.matchAll(structuralPossessive)].map(m=>[m.index,m.index+m[0].length]);
  // Other names in a mixed field still trigger the existing whole-field omission.
  return [...text.matchAll(/\b[A-Z][a-z]+['’]s\b/g)].some(m=>!structural.some(([start,end])=>m.index>=start&&m.index+m[0].length<=end));
}
