import {excerptSelection,sourceRange,officialDocumentPeriod} from './aiEvidenceExcerpts.js';
import {evidencePassages} from './aiQuestionApplicability.js';
import {officialDateEvent,officialDatePeriod} from './aiLeagueDateFacts.js';

export function selectLeagueDateEvidence(candidates,intent) {
 if(intent.object==='schedule_release')return scheduleReleaseSelection(candidates,intent).selected;
 if (!intent.leagues.length) return [];
 const dates=candidates.filter(c=>c.documentType==='league_supplement'&&intent.leagues.some(l=>new RegExp(`^${l} (?:DUPR )?League Key Dates$`,'i').test(c.heading||'')));
 const result=[];
 for (const c of dates) {
  const passages=evidencePassages(c).map(text=>text.split(/\nNote:/i)[0].trimEnd()).filter(text=>officialDateEvent(text)===intent.event).filter(text=>{
   if(intent.policyYear&&officialDatePeriod(c.content,sourceRange(c,text).start,officialDocumentPeriod(c.documentTitle)).calendarYear!==intent.policyYear)return false;
   const genders=['women','men'].filter(g=>new RegExp(`\\b${g}\\b`,'i').test(text));
   if(intent.gender&&genders.length&&!genders.includes(intent.gender))return false;
   const labels=[...text.matchAll(/\bDUPR\s*(\d{1,2})\b/gi)].map(m=>m[1]);
   return !intent.category||!labels.length||labels.includes(intent.category);
  });
  if (!passages.length)continue;
  const league=intent.leagues.find(l=>new RegExp(l,'i').test(c.heading));
  result.push(excerptSelection(c,passages.map(text=>({text,applicability:{role:'official_date',league},scopeBindings:[{...sourceRange(c,c.heading),kind:'league'}]})),'official_date'));
 }
 // Never silently truncate distinct date sources.
 return result.length<=4?result:[];
}

export function scheduleReleaseSelection(candidates,intent) {
 const empty={selected:[],choices:[]};
 if(intent.contextConflict)return empty;
 const leagues=intent.leagues.length?intent.leagues:intent.season?.kind==='fall'?['weekday','primetime']:['weekday','saturday','primetime'];
 const selected=selectLeagueDateEvidence(candidates,{...intent,object:'league_date',leagues});
 if(selected.length!==leagues.length||leagues.some(l=>selected.filter(c=>c.excerptItems.some(i=>i.applicability.league===l)).length!==1))return empty;
 const identities=[];
 for(const c of selected){
  if(c.excerptItems.length!==1)return empty;
  const item=c.excerptItems[0],original=candidates.find(x=>x.chunkId===c.chunkId);
  const year=officialDatePeriod(original.content,item.start,officialDocumentPeriod(original.documentTitle)).calendarYear;
  if(!year)return empty;
  // Include the source qualifier in equality; BY and ON are not interchangeable.
  identities.push(year+'|'+item.text.replace(/^[•]\s*/,'').toLowerCase().replace(/\s+/g,' '));
 }
 if(new Set(identities).size>1&&leagues.length>1)return {selected:[],choices:leagues};
 return {selected,choices:[]};
}
