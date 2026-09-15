import {selectRegistrationEvidence} from './aiRegistrationEvidence.js';
import {selectAgeReferenceEvidence} from './aiAgeReferencePolicy.js';
import {selectLeagueDateEvidence} from './aiLeagueDateEvidence.js';
import {excerptSelection,sourceRange,officialDocumentPeriod} from './aiEvidenceExcerpts.js';
import {communityParticipationPassages,leagueCompatible,evidencePassages} from './aiQuestionApplicability.js';
import {questionIntent} from './aiRequestIntent.js';
import {policySelectionDiagnostic} from './aiPolicyDiagnostics.js';

const scoreEntry=question=>questionIntent(question).object==='score_entry'||/\b(?:how|where)\b.*\b(?:enter|submit|record)\b.*\b(?:match )?scores?\b/i.test(question||'');
export function needsPolicyEvidence(question){const p=questionIntent(question);return ['team_registration','schedule_release'].includes(p.object)||p.object==='community_participation'||p.object==='age_eligibility'||p.object==='league_date'||scoreEntry(question)||p.object==='rating'&&['policy_date','action_policy'].includes(p.kind)||p.kind==='scoring_mechanics'&&/rally.*scor/i.test(question)||p.kind==='scoring_applicability'||p.object==='roster'&&['policy_date','procedure','action_policy'].includes(p.kind);}
// A bounded active-version completion read, not an alternative answer store.
export async function completePolicyEvidence(db,retrieval) {
 if(!needsPolicyEvidence(retrieval.request?.question)||typeof db?.from!=='function')return;
 const start=performance.now();
 const signal=AbortSignal.timeout(5000),read=query=>typeof query.abortSignal==='function'?query.abortSignal(signal):query;
 let stage='catalog',reason='READ_FAILED';
 try{
  const {data:docs,error}=await read(db.from('ai_documents').select('id,title,document_type,authority_rank,active_version_id,active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(id,processing_status)').eq('status','active').eq('active_version.processing_status','ready').limit(24));
  if(error)throw error;
  const p=questionIntent(retrieval.request.question),wanted=(docs||[]).filter(d=>['community_participation','age_eligibility'].includes(p.object)?d.document_type==='league_rules':['league_date','schedule_release'].includes(p.object)?d.document_type==='league_supplement':p.kind.startsWith('scoring_')?d.document_type==='league_rules':p.object==='rating'?['league_rules','league_supplement'].includes(d.document_type):scoreEntry(retrieval.request.question)?d.document_type==='captain_guide':['league_supplement','captain_guide'].includes(d.document_type));
  if(!wanted.length||wanted.length>4){reason='CATALOG_BOUND';throw Error('policy_catalog');}
  const all=[];
  for(const d of wanted){
   stage='chunks';
   const {data:rows,error}=await read(db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,section_label,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(161));
   if(error)throw error;
   if(!rows?.length||rows.length>160){reason='CHUNK_BOUND';throw Error('policy_budget');}
   all.push(...rows.map(c=>({chunkId:c.id,documentId:d.id,documentVersionId:c.document_version_id,documentTitle:d.title,documentType:d.document_type,documentAuthorityRank:d.authority_rank,pageNumber:c.page_number,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,chunkOrdinal:c.chunk_ordinal,content:c.content,structuralCompletion:true})));
  }
  retrieval.policyEvidence={status:'complete',candidates:all};
 }catch{retrieval.policyEvidence={status:'unavailable',candidates:[],stage,reason:signal.aborted?'DEADLINE':reason};}
 retrieval.policyEvidence.durationMs=performance.now()-start;
}

export function rosterDateFacts(candidates){
 const facts=[];
 for(const c of candidates||[]){if(c.documentType!=='league_supplement')continue;
  const league=['weekday','saturday','primetime'].find(l=>new RegExp(`\\b${l}\\b`,'i').test(c.heading+' '+c.sectionLabel));
  const period=officialDocumentPeriod(c.documentTitle),year=period.calendarYear;
  for(const line of c.content.split('\n'))if(/(?:updat\w*|open\w*|enter\w*)\s+rosters?|roster\s+entry/i.test(line)){
   const m=line.match(/\b(Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\.?\s+(\d{1,2})\b/i);
   if(league&&m)facts.push({league,period,dateLabel:m[0],date:year?`${year}-${String(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].slice(0,3).toLowerCase())+1).padStart(2,'0')}-${m[2].padStart(2,'0')}`:null,condition:line.replace(/^.*?\s[–-]\s*/,'').trim(),candidate:c,line});
  }
 }
 return facts;
}
export function rosterLeagueChoices(question,candidates){
 const p=questionIntent(question);if(p.object!=='roster'||p.kind!=='policy_date'||p.leagues.length)return [];
 const facts=rosterDateFacts(candidates);const leagues=[...new Set(facts.map(f=>f.league))];
 const identities=new Set(facts.map(f=>`${f.date??f.dateLabel+"|"+f.period.seasonLabel}|${f.condition.toLowerCase()}`));
 return identities.size>1?leagues:[];
}
function chosen(c,content,role){const texts=role==='procedure'?evidencePassages({...c,content}):[content];return excerptSelection(c,texts.map(text=>({text,applicability:{role:role==='procedure'&&/\b(?:only|must|cannot|do not|ineligible|blocked)\b/i.test(text)?'requirement':role}})),role);}
const sourceOrder=(a,b)=>(a.documentAuthorityRank||99)-(b.documentAuthorityRank||99)||a.documentVersionId.localeCompare(b.documentVersionId)||(a.chunkOrdinal??a.pageNumber??0)-(b.chunkOrdinal??b.pageNumber??0)||a.chunkId.localeCompare(b.chunkId);
function scopeBinding(node,kind){const part=node.parts[0];return {...sourceRange(part.c,part.text.split('\n')[0]),kind};}

export function selectPolicyEvidence(retrieval){
 const selected=selectPolicyEvidenceInternal(retrieval);
 if(needsPolicyEvidence(retrieval.request?.question)){
  const reason=selected?.length?'SELECTED':retrieval.policyEvidence?.status==='unavailable'?'POLICY_COMPLETION_UNAVAILABLE':retrieval.policySelectionReason||(!(retrieval.policyEvidence?.candidates||retrieval.candidates||[]).length?'NO_RETRIEVAL_CANDIDATES':'APPLICABILITY_REJECTED');
  policySelectionDiagnostic(retrieval,selected,reason);
 }
 return selected;
}
function selectPolicyEvidenceInternal(retrieval){
 delete retrieval.policySelectionReason;
 const p=questionIntent(retrieval.request?.question);if(!needsPolicyEvidence(retrieval.request?.question))return null;
 // Legacy direct candidate consumers retain their existing roster selector.
 // Production completion failures are explicit and fail closed.
 if(!retrieval.policyEvidence&&p.kind!=='scoring_applicability')return null;
 if(retrieval.policyEvidence?.status!=='complete')return [];
 const unique=new Map();
 for(const c of retrieval.policyEvidence.candidates){const prior=unique.get(c.chunkId);if(prior&&(prior.content!==c.content||prior.documentVersionId!==c.documentVersionId)){retrieval.policySelectionReason='DEDUP_CONFLICT';return [];}unique.set(c.chunkId,c);}
 const candidates=[...unique.values()].sort(sourceOrder);
 if(p.object==='community_participation'){
  const matches=candidates.filter(c=>leagueCompatible(c,retrieval.request.question)).flatMap(c=>communityParticipationPassages(c).filter(text=>/\band\s+has\s+(?:roster\s+)?availability\s+for\s+additional\s+players\b/i.test(text)).map(text=>({c,text})));
  if(matches.length!==1)return [];
  return matches.map(({c,text})=>excerptSelection(c,[{text,applicability:{role:'permission'}}],'permission'));
 }
 if(p.object==='age_eligibility')return selectAgeReferenceEvidence(candidates,p);
 if(p.object==='team_registration')return selectRegistrationEvidence(candidates,p);
 if(['league_date','schedule_release'].includes(p.object))return selectLeagueDateEvidence(candidates,p);
 if(scoreEntry(retrieval.request.question)){
  const guide=candidates.filter(c=>c.documentType==='captain_guide'&&/Entering Match Scores/i.test(c.content));
  return guide.map(c=>chosen(c,c.content,'procedure')).slice(0,4);
 }
 if(p.object==='rating'){
  const rules=candidates.filter(c=>c.documentType==='league_rules');
  const definitions=rules.flatMap(c=>evidencePassages(c).filter(text=>/Season DUPR Rating is established/i.test(text)).map(text=>({c,text})));
  const dates=candidates.filter(c=>c.documentType==='league_supplement'&&(!p.leagues.length||p.leagues.some(l=>new RegExp(l,'i').test(c.heading)))).flatMap(c=>evidencePassages(c).filter(text=>/Season DUPR ratings? recorded/i.test(text)).map(text=>({c,text})));
  const dated=()=>dates.map(({c,text})=>excerptSelection(c,[{text,applicability:{league:['weekday','saturday','primetime'].find(l=>new RegExp(l,'i').test(c.heading)),role:'recording_date'},scopeBindings:[{...sourceRange(c,c.heading),kind:'league'}]}],'recording_date'));
  if(p.kind==='policy_date'){
   if(/\brecorded\b/.test(p.matchingQuestion))return dated().slice(0,4);
   if(!definitions.length)return [];
   // Establishment/duration and any explicit season-rating reset qualifications
   // are separate exact passages. Never interpret absence as a reset permission.
   const qualifications=rules.flatMap(c=>evidencePassages(c).filter(text=>/\b(?:reset|mid.?season|re.?establish|re.?record)\b/i.test(text)&&/\b(?:season|rating|dupr)\b/i.test(text)).map(text=>({c,text})));
   const policy=[definitions[0],...qualifications];
   if(p.leagues.includes('primetime')){
    const binding=rules.flatMap(c=>evidencePassages(c).filter(text=>/Age-based.*DUPR[\s\S]*still follow all DUPR/i.test(text)).map(text=>({c,text})));
    if(!binding.length){retrieval.policySelectionReason='SCOPE_REJECTED';return [];}
    policy.push(...binding);
   }
   const grouped=new Map();
   for(const {c,text} of policy){if(!grouped.has(c.chunkId))grouped.set(c.chunkId,{c,texts:new Set()});grouped.get(c.chunkId).texts.add(text);}
   const selected=[...grouped.values()].map(({c,texts})=>excerptSelection(c,[...texts].map(text=>({text,applicability:{role:'rating_policy'}})),'rating_policy'));
   if(selected.length>4)return [];
   return [...selected,...dated().slice(0,4-selected.length)];
  }
  // General calculation must include the base method, not only NR/multi-division exceptions.
  const material=rules.map(c=>({c,passages:evidencePassages(c).filter(text=>/Season DUPR Rating is established|Reliability Factor (?:below|of \d+(?:\.\d+)? or below)|truncated to the nearest tenth|Age-based.*DUPR|For team aggregate rating calculations, an NR|highest adjusted Season/is.test(text))})).filter(x=>x.passages.length);
  if(!material.some(x=>x.passages.some(t=>/truncated to the nearest tenth/i.test(t)))||!definitions.length)return [];
  if(material.length>4)return [];
  return material.map(({c,passages})=>excerptSelection(c,passages.map(text=>({text,applicability:{role:'rating_policy'}})),'rating_policy'));
 }
 if(p.kind==='scoring_mechanics'){
  const mechanics=candidates.filter(c=>c.documentType==='league_rules'&&/^Rally Scoring Rules\s*\r?\n/i.test(c.content));
  const selected=mechanics.map(c=>excerptSelection(c,evidencePassages(c).filter(t=>/service positioning|switching sides|side outs|game points|scoring freeze|win-by-two/i.test(t)).map(text=>({text,applicability:{role:'mechanics'}})),'mechanics'));
  for(const c of [...selected]){
   if(!/\b(?:the|and|or|to|of|for|with|by|game)\s*$/i.test(c.content))continue;
   const next=candidates.find(n=>n.documentVersionId===c.documentVersionId&&n.chunkOrdinal===c.chunkOrdinal+1&&n.heading===c.heading);
   if(!next)return [];
   if(!selected.some(s=>s.chunkId===next.chunkId))selected.push({...chosen(next,evidencePassages(next)[0],'mechanics'),continuationOf:c.chunkId});
  }
  return selected.length<=4?selected:[];
 }
 if(p.object==='roster'){
  if(p.kind==='procedure')return candidates.filter(c=>c.documentType==='captain_guide'&&/Captain Tools|Click the Add Player button/.test(c.content)).map(c=>chosen(c,c.content,'procedure')).slice(0,4);
  if(p.event==='closing')return []; // Never substitute an opening for an unverified closing date.
  if(p.event==='removal'||p.kind==='action_policy')return candidates.filter(c=>c.documentType==='captain_guide'&&/Captain Roster Control/.test(c.content)).map(c=>chosen(c,c.content,'permission'));
  const requestedYear=p.matchingQuestion.match(/\b20\d{2}\b/)?.[0];
  const facts=rosterDateFacts(candidates).filter(f=>(!p.leagues.length||p.leagues.includes(f.league))&&(!requestedYear||f.date?.startsWith(requestedYear)));
  if(!facts.length||!p.leagues.length&&new Set(facts.map(f=>f.league)).size!==3||rosterLeagueChoices(retrieval.request.question,candidates).length)return [];
  const dates=[...new Map(facts.map(f=>[f.candidate.chunkId,excerptSelection(f.candidate,[{text:f.line,applicability:{league:f.league,role:'opening_date'},scopeBindings:[{...sourceRange(f.candidate,f.candidate.heading),kind:'league'}]}],'opening_date')])).values()];
  if(dates.length>3||['weekday','saturday','primetime'].some(l=>new Set(facts.filter(f=>f.league===l).map(f=>f.date??f.dateLabel+'|'+f.period.seasonLabel)).size>1))return [];
  const unlock=candidates.find(c=>c.documentType==='captain_guide'&&/notify you when team rosters.*unlocked/is.test(c.content));
  if(!unlock)return [];
  return [...dates,chosen(unlock,unlock.content,'unlock_qualification')].slice(0,4);
 }
 // Parse complete ordered numbered clauses. Scope follows source hierarchy rather
 // than inherited PDF headings or the first matching noun in a flattened table.
 const rules=candidates.filter(c=>c.documentType==='league_rules');
 if(new Set(rules.map(c=>c.documentVersionId)).size!==1)return [];
 const nodes=[];let current=null;
 for(const c of rules){if(!c.ruleNumber&&c.heading&&!/^\s*\d+(?:\.\d+)*\.\s/m.test(c.content)){current=null;continue;}for(const line of c.content.split('\n')){
  const m=line.match(/^\s*(\d+(?:\.\d+)*)\.\s+(.+)$/);
  if(m){current={number:m[1],text:m[2],parts:[{c,text:line}]};nodes.push(current);}
  else if(current){current.text+='\n'+line;const last=current.parts.at(-1);if(last.c.chunkId===c.chunkId)last.text+='\n'+line;else current.parts.push({c,text:line});}
 }}
 const defaults=nodes.filter(n=>/all games shall use\s+Standard Scoring/i.test(n.text)&&/only when.*expressly identifies Rally\s+Scoring/is.test(n.text));
 if(defaults.length!==1||p.leagues.length!==1)return [];
 const root=nodes.find(n=>new RegExp(`^${p.leagues[0]} (?:DUPR )?League\\s*$`,'i').test(n.text.split('\n')[0]));if(!root)return [];
 const scoped=nodes.filter(n=>n.number.startsWith(root.number+'.'));
 if(!scoped.some(n=>/Match (?:Day )?Format:/i.test(n.text)))return [];
 const divisionRoots=scoped.filter(n=>/^.*\bDivision:/i.test(n.text.split('\n')[0]));
 const divisionRoot=p.division?divisionRoots.find(n=>new RegExp(`\\b${p.division.replace('.','\\.')}\\b`).test(n.text.split('\n')[0])):null;
 if(p.division&&!divisionRoot&&!rules.some(c=>new RegExp(p.leagues[0]+' .*Divisions','i').test(c.heading||'')&&new RegExp('\\b'+p.division.replace('.','\\.')+'\\b').test(c.content)))return [];
 const applicable=scoped.filter(n=>{const d=divisionRoots.find(d=>n.number===d.number||n.number.startsWith(d.number+'.'));return !d||!p.division||d===divisionRoot;});
 const expressAll=applicable.filter(n=>/rally\s+scoring/i.test(n.text)&&/(?:using|required|uses?)/i.test(n.text));
 const express=expressAll.filter(n=>!/potential\s+Picklebreaker/i.test(n.text)||!expressAll.some(x=>x!==n&&/shall be played only when/i.test(x.text)));
 if(p.phase==='picklebreaker'&&!express.some(n=>/picklebreaker/i.test(n.text)))return [];
 const required=[defaults[0],...express];
 // Scope headers bind metadata to exact source ranges, outside excerpt text.
 const mapped=new Map();
 for(const n of required){
  const d=divisionRoots.find(d=>n.number===d.number||n.number.startsWith(d.number+'.'));
  const isDefault=n===defaults[0];
  const applicability=isDefault?{role:'default'}:{role:'express_format',league:p.leagues[0],...(d?{division:d.text.match(/\b\d{1,2}\.\d\b/)?.[0]}:{})};
  const scopeBindings=isDefault?[]:[scopeBinding(root,'league'),...(d?[scopeBinding(d,'division')]:[])];
  for(const part of n.parts){
   const old=mapped.get(part.c.chunkId);
   const item={text:part.text,applicability,scopeBindings};
   mapped.set(part.c.chunkId,excerptSelection(part.c,[...(old?.excerptItems||[]),item],isDefault?'default':'express_format'));
  }
 }
 if(mapped.size>4||[...mapped.values()].reduce((n,c)=>n+c.excerptItems.length,0)>16)return [];
 return [...mapped.values()];
}
export function policyCalendarContext(retrieval,now=new Date()) {
 const p=questionIntent(retrieval.request?.question);if(!p.currentDate||p.object!=='roster')return null;
 const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const facts=rosterDateFacts(retrieval.policyEvidence?.candidates||[]).filter(f=>!p.leagues.length||p.leagues.includes(f.league));
 return {asOf,timezone:'America/New_York',publishedOpenings:facts.map(f=>({league:f.league,date:f.date,seasonLabel:f.period.seasonLabel,comparison:!f.date?'undetermined':asOf<f.date?'before_opening':'on_or_after_opening'})),limit:'Calendar comparison only. Actual team unlock and personal eligibility have not been checked.'};
}
