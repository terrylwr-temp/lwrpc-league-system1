// Request-local, same-version continuation support; no corpus edits or new rank.
const readers=new WeakMap();
export function retainPassageReader(retrieval,db){if(typeof db?.from==='function')readers.set(retrieval,db);}
function incomplete(text){return /\b(?:the|a|an|and|or|to|of|for|with|from|in|at|by|game|same|designated|will|shall|be|are|consist)$/i.test(String(text).trim());}
export async function completeSelectedPassages(retrieval,selected){
 const db=readers.get(retrieval);readers.delete(retrieval);
 if(!db||!selected.some(c=>c.passageScopes&&incomplete(c.content)))return selected;
 const result=[];
 for(const c of selected){
  if(!c.passageScopes||!incomplete(c.content)){result.push(c);continue;}
  let continuation=null;
  try{
   const anchor=await db.from('ai_document_chunks').select('document_version_id,chunk_ordinal,rule_number,heading').eq('id',c.chunkId).eq('document_version_id',c.documentVersionId).eq('is_searchable',true).maybeSingle();
   if(!anchor.error&&anchor.data){
    const next=await db.from('ai_document_chunks').select('id,content,page_number,section_label,rule_number,heading').eq('document_version_id',c.documentVersionId).eq('chunk_ordinal',anchor.data.chunk_ordinal+1).eq('is_searchable',true).maybeSingle();
    if(!next.error&&next.data && !/^\s*(?:\d+(?:\.\d+)*\.|[A-Z][A-Z ]{8,})\s/.test(next.data.content) && (next.data.rule_number===anchor.data.rule_number || !next.data.rule_number&&!anchor.data.rule_number&&next.data.heading===anchor.data.heading))continuation={...next.data,content:next.data.content.split(/\n(?=\s*\d+(?:\.\d+)*\.\s)/)[0].trim()};
   }
  }catch{ /* Keep only complete propositions if context is unavailable. */ }
  if(continuation && selected.some(x=>x.chunkId===continuation.id)){result.push(c);continue;}
  if(continuation && result.length+selected.length-selected.indexOf(c)<4){
   result.push(c,{...c,chunkId:continuation.id,pageNumber:continuation.page_number,ruleNumber:continuation.rule_number||'',heading:continuation.heading||'',sectionLabel:continuation.section_label||'',content:continuation.content,selectedPassages:[continuation.content],continuationOf:c.chunkId,evidenceSelectionReason:'Verified immediately adjacent same-version passage continuation'});
  }else{
   const passages=(c.selectedPassages||[c.content]).filter(p=>!incomplete(p));
   // Retain complete sentences in an otherwise incomplete final paragraph.
   const tail=(c.selectedPassages||[c.content]).filter(incomplete).map(p=>p.slice(0,Math.max(p.lastIndexOf('. '),p.lastIndexOf('.\n'))+1)).filter(p=>p.length>20&&/[.!?]$/.test(p));
   if(passages.length||tail.length)result.push({...c,selectedPassages:[...passages,...tail],content:[...passages,...tail].join('\n\n')});
  }
 }
 return result.slice(0,4);
}
export function conflictingSelectedTargets(selected){
 const claims=[];
 for(const c of selected){
  if(c.sourceClassification!=='lwr_controlling')continue;
  for(const p of c.selectedPassages||[c.content]){
   const scope=c.passageScopes?.find(s=>s.league);
   if(!scope)continue;
   for(const m of p.matchAll(/Picklebreaker[^.]{0,180}?(?:game\s+)?to\s+(\d+)\b/gi))claims.push({value:Number(m[1]),league:scope.league,division:scope.division||null,authority:c.documentAuthorityRank});
  }
 }
 return claims.some((a,i)=>claims.slice(i+1).some(b=>a.league===b.league&&a.division===b.division&&a.authority===b.authority&&a.value!==b.value));
}
