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
