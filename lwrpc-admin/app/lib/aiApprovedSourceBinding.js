import {trustedSelectedRuleIdentity} from './aiSelectedRuleIdentity.js';

export const RELATED_PASSAGE_BYTES = 16384;
// Same structural formats as the accepted citation utility. Prose references are not boundaries.
const start = /^(\d{1,2}(?:\.(?:\d{1,2}|[A-Z]|[a-z])){0,6})\.?\s+/;
const within = (child,parent) => child===parent||child.startsWith(`${parent}.`);

export function managedFormalPassages(stored) {
  const text=String(stored.content||'');
  const boundaries=[];let offset=0;
  for(const line of text.split('\n')) {
    const id=line.trim().match(start)?.[1];
    if(id)boundaries.push({id,offset});
    offset+=line.length+1;
  }
  const values=boundaries.length?boundaries.map((b,i)=>{
    const next=boundaries.slice(i+1).find(n=>!within(n.id,b.id));
    return text.slice(b.offset,next?.offset??text.length).trim();
  }):[text.trim()];
  return [...new Set(values)].filter(p=>p&&new TextEncoder().encode(p).length<=RELATED_PASSAGE_BYTES).map(passage=>({
    passage,ruleNumber:trustedSelectedRuleIdentity({content:passage,selectedPassages:[passage]},stored,{managedSibling:true}),
    heading:passage.match(start)?passage.split('\n')[0].replace(start,'').split(':')[0].trim():stored.heading||'',
  }));
}

export function validateManagedPassage(stored, passage, identity) {
  // Match a whole selectable provision/family, not an arbitrary substring mentioning a rule.
  const found=managedFormalPassages(stored).find(p=>p.passage===passage);
  if(!found||found.ruleNumber!==identity)throw new Error('Related official passage or identity does not match the trusted source.');
  return found;
}

// Prospective citation presentation only. Never accept a retrieval/model label
// as heading authority, and never borrow a sibling's specific heading.
export function trustedPassageHeading(selected, stored) {
  const passages=selected.selectedPassages?.length?selected.selectedPassages:[selected.content];
  if(!passages[0])return String(stored.heading||stored.section_label||'');
  const identity=selected.boundRelatedPassage
    ? validateManagedPassage(stored,selected.content,selected.ruleNumber).ruleNumber
    : trustedSelectedRuleIdentity(selected,stored);
  const trusted=managedFormalPassages(stored);
  if(!stored.rule_number&&!trusted.some(p=>p.ruleNumber))return String(stored.heading||stored.section_label||'');
  const headings=passages.map(p=>{
    const exact=trusted.find(t=>t.passage===p);
    if(!exact)return '';
    // Only a structural "number. Heading:" label is a specific heading.
    const line=p.trim().split('\n')[0];
    const label=line.match(start)?line.replace(start,'').match(/^([^:\n]{1,120}):/)?.[1]?.trim():'';
    return label||'';
  });
  const unique=[...new Set(headings.filter(Boolean))];
  if(headings.every(Boolean)&&unique.length===1)return unique[0];
  const parent=String(stored.rule_number||'');
  const ids=passages.map(p=>String(p).trim().match(start)?.[1]);
  if(identity&&ids.every(id=>id&&within(id,parent))&&stored.heading)return stored.heading;
  const section=String(stored.section_label||'');
  const sectionRule=section.match(/^Rule\s+(\d+(?:\.[A-Za-z0-9]+)*)\b/i)?.[1];
  return sectionRule&&!ids.every(id=>id&&within(id,sectionRule))?'':section;
}
