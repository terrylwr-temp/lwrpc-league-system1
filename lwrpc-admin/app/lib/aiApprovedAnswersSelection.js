import {approvedEligible,APPROVED_SOURCE_NAME,safeAuthorityWarnings} from './aiApprovedAnswersShared.js';
// Candidate scoring proposes relevance; fixed scope/authority gates decide eligibility.
// These conservative thresholds are independently tested against adjacent-topic fixtures.
export const APPROVED_SEMANTIC_MIN=.65;
const WORD_STOP=new Set('a an the is are was were be to of in on at for with and or what which how when where can could should do does we i my our you your club lwr league pickleball'.split(' '));
function words(text){return [...new Set(String(text).toLowerCase().match(/[a-z]+/g)||[])].filter(w=>w.length>2&&!WORD_STOP.has(w));}
function sharedTopic(a,b){const left=words(a),right=new Set(words(b));return left.length>0&&left.filter(w=>right.has(w)).length/left.length>=.6;}
export function meaningfulDiscrepancy(managed,formal){
 // Compare aligned statements only. Different unrelated numbers or mere co-retrieval are not evidence of conflict.
 const m=String(managed.approved_answer||'').replace(/\s+/g,' ').split(/[.!?]\s/).filter(Boolean), f=String(formal.content||'').replace(/\s+/g,' ').split(/[.!?]\s/).filter(Boolean);
 for(const a of m)for(const b of f){
  if(!sharedTopic(a,b)||!sharedTopic(b,a))continue;
  const permission=s=>/\b(?:may|can|allowed|permitted|prohibited|must not|cannot)\b/i.test(s);
  const negative=s=>/\b(?:not|never|cannot|prohibited)\b|\bcan't\b/i.test(s);
  if(permission(a)&&permission(b)&&negative(a)!==negative(b))return 'opposed_permission';
  // Values must occupy the same textual statement, rather than comparing unrelated figures in a passage.
  const normalize=s=>s.toLowerCase().replace(/^\s*\d+(?:\.\d+)*\.?\s+/,'').replace(/\b\d+(?:\.\d+)?\b/g,'#').replace(/[^a-z# ]/g,'').replace(/\s+/g,' ').trim();
  const values=s=>s.replace(/^\s*\d+(?:\.\d+)*\.?\s+/,'').match(/\b\d+(?:\.\d+)?\b/g)||[];
  if(normalize(a)===normalize(b)&&values(a).length&&values(a).join('|')!==values(b).join('|'))return 'different_policy_value';
 }
 return null;
}
export function managedQuestionCompatible(question,revision){
 const days=text=>(String(text).toLowerCase().match(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g)||[]);
 const requested=days(question),defined=days(revision.canonical_question);
 if(/\b(?:how long|how soon|how many (?:days|hours|weeks))\b/i.test(question)&&!/\b(?:minutes?|hours?|days?|weeks?|months?|immediately|within)\b/i.test(revision.approved_answer))return false;
 if(requested.length&&defined.length&&requested.some(d=>!defined.includes(d)))return false;
 if(/\bweekend\b/i.test(question)&&defined.length&&!requested.length)return false;
 const values=String(question).match(/\b\d+(?:\.\d+)?\b/g)||[];
 if(values.some(v=>!new RegExp("\\b"+v.replace(".","\\.")+"\\b").test(revision.canonical_question+" "+revision.approved_answer)))return false;
 return true;
}
// A managed revision cannot establish a standalone exception to rules of play.
export function managedPlayingRule(text){return /\b(?:volley|volleying|nvz|kitchen|serv(?:e|ing|ice)|rall(?:y|ies)|double.?bounce|foot.?fault|line.?call|hinder|let.?serve|paddle specifications|ball specifications)\b/i.test(text)||/\b(?:ball|paddle)\b[\s\S]*\b(?:crack|break|damag|legal|illegal|replay)/i.test(text);}
export function chooseApprovedEvidence(question,formal,rows,{date,scope='all',seasonId=null}={}){
 const relevant=(rows||[]).filter(x=>x?.revision?.status==='active'&&managedQuestionCompatible(question,x.revision)&&Number.isFinite(x.semantic_score)&&x.semantic_score>=APPROVED_SEMANTIC_MIN);
 const scopeMatches=r=>r.league_scope==='all'||r.league_scope===scope;
 const warnings=[];
 for(const item of relevant.filter(x=>scopeMatches(x.revision)))for(const source of formal.filter(s=>s.documentType!=='usap_rulebook')){
  const reason=meaningfulDiscrepancy(item.revision,source);
  if(reason)warnings.push({approvedAnswerId:item.revision.answer_id,approvedRevisionId:item.revision.id,documentId:source.documentId,documentVersionId:source.documentVersionId,chunkId:source.chunkId,reason,leagueScope:item.revision.league_scope});
 }
 // Existing selected formal/guide/USAP evidence keeps its governing behavior.
 // Managed knowledge fills a genuine unsupported issue, never displaces an accepted selected source.
 const eligible=relevant.filter(x=>approvedEligible(x.revision,{date,scope,seasonId:seasonId||x.resolved_season_id,manifest:x.manifest}));
 if(formal.length){
   const complementary=eligible.find(x=>!managedPlayingRule(question)&&!managedPlayingRule(x.revision.approved_answer)&&x.revision.related_chunk_id&&formal.some(f=>f.documentType!=='usap_rulebook'&&f.chunkId===x.revision.related_chunk_id)&&!formal.some(f=>meaningfulDiscrepancy(x.revision,f)));
   return {selected:complementary&&formal.length<4?[...formal,managedCandidate(complementary)]:formal,warnings:safeAuthorityWarnings(warnings),conflict:false};
 }
 if(managedPlayingRule(question)||eligible.some(x=>managedPlayingRule(x.revision.approved_answer)))return {selected:[],warnings:[],conflict:false};
 if(!eligible.length)return {selected:[],warnings:[],conflict:false};
 for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
  if(meaningfulDiscrepancy(eligible[i].revision,{content:eligible[j].revision.approved_answer}))return {selected:[],warnings:[],conflict:true};
 }
 // Near-tied distinct policies are ambiguous; no arbitrary semantic-rank tie break.
 if(eligible.length>1&&eligible[0].revision.topic_key!==eligible[1].revision.topic_key&&eligible[0].semantic_score-eligible[1].semantic_score<.06)return {selected:[],warnings:[],conflict:false};
 return {selected:[managedCandidate(eligible[0])],warnings:[],conflict:false};
}
function managedCandidate(item){
 const r=item.revision;
 return {sourceKind:'approved_answer',approvedAnswerId:r.answer_id,approvedRevisionId:r.id,approvedRevisionNumber:r.revision_number,contentHash:r.content_hash,
  leagueScope:r.league_scope,effectiveOn:r.effective_on,expiresOn:r.expires_on,
  documentTitle:`${APPROVED_SOURCE_NAME} — ${r.title}`,documentType:'approved_answer',sourceClassification:'lwr_approved_answer',
  content:r.approved_answer,ruleNumber:'',heading:r.title,combinedScore:item.semantic_score,evidenceRole:'Approved static LWR knowledge',evidenceSelectionReason:'Eligible immutable approved revision; formal evidence retains governing priority',
 };
}
