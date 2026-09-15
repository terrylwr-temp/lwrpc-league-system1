import {officialDatePeriod} from './aiLeagueDateFacts.js';
import {trustedSelectedRuleIdentity} from './aiSelectedRuleIdentity.js';

// Four source containers remain the API/storage bound. Each container keeps
// separate exact ranges; its compatibility `content` is never a verbatim quote.
export const MAX_SOURCE_EXCERPTS = 16;
export function sourceRange(candidate, text) {
  const start = candidate.content.indexOf(text);
  if (!text || start < 0) throw new Error('Selected excerpt has no exact source range.');
  return {chunkId:candidate.chunkId,documentVersionId:candidate.documentVersionId,start,end:start+text.length};
}
export function excerptSelection(candidate, items, role) {
  const unique = new Map();
  for (const item of items) {
    const range = sourceRange(candidate,item.text);
    const key = `${range.start}:${range.end}`;
    const value = {...range,text:item.text,applicability:item.applicability||{},scopeBindings:item.scopeBindings||[]};
    if(unique.has(key) && JSON.stringify(unique.get(key))!==JSON.stringify(value))throw new Error('Conflicting applicability for the same excerpt.');
    unique.set(key,value);
  }
  const excerptItems=[...unique.values()].sort((a,b)=>a.start-b.start||a.end-b.end);
  if(!excerptItems.length||excerptItems.length>MAX_SOURCE_EXCERPTS)throw new Error('Official excerpt budget exceeded.');
  return {...candidate,excerptItems,selectedPassages:excerptItems.map(x=>x.text),content:excerptItems.map(x=>x.text).join('\n\n'),sourceClassification:candidate.documentType==='league_rules'?'lwr_controlling':'lwr_supporting_guide',evidenceRole:role,evidenceSelectionReason:'Active-version exact policy excerpts',passageScopes:[]};
}
export function revalidateExcerptItems(selected, stored, chunks, period) {
  if(!selected.excerptItems)return undefined;
  if(selected.excerptItems.length!==selected.selectedPassages?.length||selected.excerptItems.length>MAX_SOURCE_EXCERPTS)throw new Error('Invalid official excerpt representation.');
  return selected.excerptItems.map((item,index)=>{
    if(item.chunkId!==selected.chunkId||item.documentVersionId!==selected.documentVersionId||item.text!==selected.selectedPassages[index]||!Number.isInteger(item.start)||!Number.isInteger(item.end)||item.start<0||item.end<=item.start||item.end>stored.content.length||stored.content.slice(item.start,item.end)!==item.text)throw new Error('Official excerpt range no longer matches its source.');
    const applicability=item.applicability||{};
    if(applicability.role&&!['default','express_format','opening_date','unlock_qualification','procedure','permission','recording_date','rating_policy','mechanics','requirement','official_date'].includes(applicability.role)||applicability.league&&!['weekday','saturday','primetime'].includes(applicability.league)||applicability.division&&!/^\d{1,2}\.\d$/.test(applicability.division))throw new Error('Invalid official applicability metadata.');
    if(item.scopeBindings.length>2)throw new Error('Official scope binding budget exceeded.');
    for(const binding of item.scopeBindings){
      const anchor=chunks.get(binding.chunkId);
      if(!anchor||anchor.document_version_id!==selected.documentVersionId||binding.documentVersionId!==selected.documentVersionId||!anchor.is_searchable||!Number.isInteger(binding.start)||!Number.isInteger(binding.end)||binding.start<0||binding.end<=binding.start||binding.end>anchor.content.length)throw new Error('Official scope source is no longer valid.');
      const text=anchor.content.slice(binding.start,binding.end);
      const label=binding.kind==='league'?applicability.league:binding.kind==='division'?applicability.division:null;
      if(!label || !(binding.kind==='league'?new RegExp(`^(?:\\d+(?:\\.\\d+)*\\.?\\s+)?${label} (?:DUPR )?League(?: Key Dates)?\\s*$`,'i'):new RegExp(`\\b${String(label).replace('.','\\.')}\\b.*Division:`, 'i')).test(text))throw new Error('Official scope does not match its source binding.');
    }
    if(applicability.league&&!item.scopeBindings.some(b=>b.kind==='league')||applicability.division&&!item.scopeBindings.some(b=>b.kind==='division'))throw new Error('Official applicability requires a verified scope binding.');
    const ruleNumber=trustedSelectedRuleIdentity({content:item.text,selectedPassages:[item.text]},stored);
    return {...item,ruleNumber,pageNumber:stored.page_number,...(applicability.role==='official_date'?{officialDatePeriod:officialDatePeriod(stored.content,item.start,period)}:{})};
  });
}
// Retain exact ranges and scope provenance in existing JSON snapshots/receipts,
// not duplicate source prose or temporary Storage links. Legacy records omit it.
export function excerptReferences(source) {
  if(!source?.excerptItems)return {};
  const id=value=>/^[0-9a-f-]{36}$/i.test(String(value||''))?value:null;
  const integer=value=>Number.isInteger(value)&&value>=0?value:null;
  const range=item=>({chunkId:id(item.chunkId),documentVersionId:id(item.documentVersionId),start:integer(item.start),end:integer(item.end)});
  return {excerptItems:source.excerptItems.slice(0,MAX_SOURCE_EXCERPTS).map(item=>({
    ...range(item),...(item.officialDatePeriod?{officialDatePeriod:{seasonLabel:String(item.officialDatePeriod.seasonLabel||'').slice(0,300),calendarYear:/^20\d{2}$/.test(item.officialDatePeriod.calendarYear||'')?item.officialDatePeriod.calendarYear:null,derivation:['revalidated_active_document_title','active_title_and_ordered_month_rollover','unknown_calendar_year'].includes(item.officialDatePeriod.derivation)?item.officialDatePeriod.derivation:'unknown_calendar_year'}}:{}),pageNumber:integer(item.pageNumber),ruleNumber:/^[0-9A-Za-z., ]{0,120}$/.test(item.ruleNumber||'')?item.ruleNumber||'':'',
    applicability:{role:['default','express_format','opening_date','unlock_qualification','procedure','permission','recording_date','rating_policy','mechanics','requirement','official_date'].includes(item.applicability?.role)?item.applicability.role:null,...(['weekday','saturday','primetime'].includes(item.applicability?.league)?{league:item.applicability.league}:{}),...(/^\d{1,2}\.\d$/.test(item.applicability?.division||'')?{division:item.applicability.division}:{})},
    scopeBindings:(item.scopeBindings||[]).slice(0,2).map(b=>({...range(b),kind:['league','division'].includes(b.kind)?b.kind:null})),
  }))};
}

// All formal selectors share this gate, including legacy selectors and table text.
export function bindOfficialExcerpts(selected,stored){
  if(selected.excerptItems)return selected;
  const passages=[...(selected.selectedPassages?.length?selected.selectedPassages:[selected.content??stored.content])];
  for(const text of [...passages]){
    if(!/^\s/.test(text))continue;
    const before=stored.content.slice(0,stored.content.indexOf(text));
    const parent=[...before.matchAll(/^o[^\n]+:\s*$/gm)].at(-1);
    if(parent&&/\b(?:shall|must|will|may|provide|require)\b/i.test(parent[0])&&!/^(?:o |\d+\.)/m.test(before.slice(parent.index+parent[0].length))&&!passages.some(p=>p.includes(parent[0].trim())))passages.push(parent[0].trim());
  }
  const bound=excerptSelection({...selected,content:stored.content},passages.map(text=>({text})),selected.evidenceRole);
  return {...selected,content:selected.content??bound.content,selectedPassages:bound.selectedPassages,excerptItems:bound.excerptItems};
}
export function officialDocumentPeriod(title){
  const label=String(title||'');
  const years=[...new Set(label.match(/\b20\d{2}\b/g)||[])];
  const range=/\b(?:20)?\d{2}\s*[-–—/]\s*(?:20)?\d{2}\b/.test(label);
  return {seasonLabel:label,calendarYear:!range&&years.length===1?years[0]:null,derivation:'revalidated_active_document_title'};
}
