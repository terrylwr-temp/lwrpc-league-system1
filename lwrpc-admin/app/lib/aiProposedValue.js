import {questionIntent} from './aiRequestIntent.js';
// Model interpretation is a retrieval hint, never authority or permission.
// Broad grammatical gate only; the planner decides whether a value is proposed.
export const mayVerifyValue=question=>/^\s*(?:are|is|am|was|were|do|does|did|will|would|can|could|should|must|may|have|has)\b/i.test(question||'');
export const verificationSchema={anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['subject','proposedValue','scope','subjectQueries'],properties:{subject:{type:'string'},proposedValue:{type:'string'},scope:{type:'string',enum:['club_operation','governing_rule','unspecified']},subjectQueries:{type:'array',maxItems:2,items:{type:'string'}}}}]};

export function validateVerification(value,question,entities) {
  if(value==null)return null;
  const subject=String(value.subject||'').trim(),proposedValue=String(value.proposedValue||'').trim();
  if(!subject||subject.length>160||!proposedValue||proposedValue.length>160||!question.toLowerCase().includes(proposedValue.toLowerCase())||!['club_operation','governing_rule','unspecified'].includes(value.scope))throw Error('QUERY_PLAN_INVALID_VERIFICATION');
  // Entities wholly inside the proposed value are part of that proposal (e.g.
  // a brand within a proposed product). Never discard an entity containing
  // additional scope beyond the proposal.
  const intent=questionIntent(question);
  const anchors=[...new Set([...entities.filter(e=>!proposedValue.toLowerCase().includes(e.toLowerCase())),...(intent.leagues||[]),...(intent.division?[intent.division]:[])])];
  const subjectQueries=[...new Set((Array.isArray(value.subjectQueries)?value.subjectQueries:[]).filter(q=>typeof q==='string'&&q.trim().length<=240).map(q=>q.trim()).filter(q=>q&&!q.toLowerCase().includes(proposedValue.toLowerCase())&&anchors.every(e=>q.toLowerCase().includes(e.toLowerCase()))))].slice(0,2);
  if(!subjectQueries.length)throw Error('QUERY_PLAN_NO_SUBJECT_QUERY');
  return {subject,proposedValue,scope:value.scope,subjectQueries};
}

// Reserve space for club sources when investigating a club assignment. This is
// candidate diversity only: raw thresholds, source validation and applicability
// still decide whether any of these passages can answer the question.
export function verificationCandidates(candidates,verification,limit) {
  if(verification?.scope!=='club_operation')return candidates.slice(0,limit);
  const club=candidates.filter(c=>c.documentType!=='usap_rulebook').slice(0,Math.floor(limit/2));
  return [...club,...candidates.filter(c=>!club.some(x=>x.chunkId===c.chunkId))].slice(0,limit);
}

export const comparisonSchema={type:'object',additionalProperties:false,required:['relation','chunkId','quote','documentedValue'],properties:{relation:{type:'string',enum:['matches','contradicts','unknown']},chunkId:{type:'string'},quote:{type:'string'},documentedValue:{type:'string'}}};

export function validateComparison(comparison,ids,candidates) {
  if(!comparison||!['matches','contradicts'].includes(comparison.relation))return false;
  const source=candidates.find(c=>c.chunkId===comparison.chunkId&&ids.includes(c.chunkId));
  const normalize=s=>String(s||'').replace(/\s+/g,' ').trim();
  const quote=normalize(comparison.quote),value=normalize(comparison.documentedValue);
  return !!source&&quote.length>=12&&!!value&&normalize(source.content).includes(quote)&&quote.toLowerCase().includes(value.toLowerCase());
}
