import { sourceRfClassification, rulesRfThreshold } from './rfPolicy.js';
import { ELIGIBILITY_POLICY_BINDING } from './aiEligibilityPolicy.js';
import {eligibilityProvenance,resultSourceFamily} from './aiResultSource.js';
import {randomUUID} from 'node:crypto';
import {eligibilityIntent,isEligibilityReceipt} from './aiEligibilityIntent.js';
import {divisionOptions,eligibilityPolicy,evaluateEligibility,eligibilityText} from './aiEligibilityPolicy.js';
import {sealLive,openLive} from './liveLmsReceipts.js';
import {resolveOfficialSources} from './aiAnswerGeneration.js';
import {officialDocumentViewerHref} from './aiOfficialDocumentViewer.js';
import {excerptReferences,excerptSelection} from './aiEvidenceExcerpts.js';
import {persistQuality} from './aiQualityPersistence.js';
import {APP_VERSION} from './version.js';
const PREFIX='live1.eligibility.';
async function read(query){const r=await query.abortSignal(AbortSignal.timeout(5000));if(r.error)throw Error('eligibility_read');return r.data;}
export async function loadEligibilityCatalog(db){
 const docs=await read(db.from('ai_documents').select('id,title,document_type,authority_rank,active_version_id,active_version:ai_document_versions!ai_documents_active_version_id_fkey!inner(processing_status)').eq('status','active').eq('document_type','league_rules').eq('active_version.processing_status','ready').limit(5));
 if(docs.length!==1)throw Error('eligibility_catalog');const d=docs[0];
 const rows=await read(db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,section_label,content').eq('document_version_id',d.active_version_id).eq('is_searchable',true).order('chunk_ordinal').limit(161));
 if(!rows.length||rows.length>160)throw Error('eligibility_chunks');
 const divisions=await read(db.from('divisions').select('id,name,is_active,min_dupr,max_dupr,team_dupr_max,rating_type,league:leagues!inner(id,name,is_active,season:seasons!inner(id,name,is_active))').eq('is_active',true).eq('league.is_active',true).eq('league.season.is_active',true).limit(101));
 if(divisions.length>100)throw Error('eligibility_divisions');
 return {candidates:rows.map(c=>({chunkId:c.id,documentId:d.id,documentVersionId:c.document_version_id,documentTitle:d.title,documentType:d.document_type,documentAuthorityRank:d.authority_rank,content:c.content,pageNumber:c.page_number,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,chunkOrdinal:c.chunk_ordinal})),divisions:divisions.map(x=>({id:x.id,name:x.name,active:x.is_active&&x.league.is_active&&x.league.season.is_active,league:['weekday','saturday','primetime'].find(l=>x.league.name.toLowerCase().includes(l)),seasonId:x.league.season.id,seasonName:x.league.season.name,min:x.min_dupr,max:x.max_dupr,pair:x.team_dupr_max,rating:x.rating_type==='primetime'?'primetime':x.rating_type==='dupr'?'season':x.rating_type}))};
}
export async function runEligibility({body,principal,origin='player_interface',lookup,loadCatalog=loadEligibilityCatalog,resolveSources=resolveOfficialSources,persist=persistQuality,deferRecovery,viewerId=principal.user.id}){
 let intent=eligibilityIntent(body.question),previous=null,choice=null;
 if(!intent&&!/^choice:/.test(body.question||''))return null;
 const id=randomUUID(),started=Date.now();let result,lookupAttempted=false,liveConsulted=false;
 const finish=async value=>{
 value.privateContext=true;
 value.provenance=eligibilityProvenance(value,{lookupAttempted,liveConsulted});
 if(value.provenance.liveDataUsed)value.live={operation:'ELIGIBILITY',checkedAt:new Date().toISOString()};

 try { await persist(principal.supabase,()=>({p_outcome:{id,request_started_at:new Date(started).toISOString(),completed_at:new Date().toISOString(),origin,final_kind:value.kind,reason_code:'eligibility_'+(value.eligibility?.outcome||value.kind).toLowerCase(),assistant_version:APP_VERSION,model:null,feedback_eligible:false,source_family:resultSourceFamily(value),selected_evidence_count:value.sources?.length||0,stage3_invoked:false,model_call_skipped:true,resolver_classification:'eligibility_deterministic',diagnostic_snapshot:{workflow:'ELIGIBILITY_SELF',result:value.eligibility?.outcome||value.kind,...value.provenance},total_ms:Date.now()-started,input_tokens:0,output_tokens:0,telemetry_version:2},p_occurrence:null,p_route:null,p_feedback_id:null}),{correlationId:id,origin,deferRecovery}); } catch { /* Persistence is fail-open; never create another logical outcome. */ } return value;};
 try{
  if(isEligibilityReceipt(body.conversationReceipt)&&/^choice:/.test(body.question)){
   previous=openLive('live1.'+body.conversationReceipt.slice(PREFIX.length),'eligibility',principal);
   choice=previous.options.find(o=>'choice:'+o.key===body.question);if(!choice)throw Error('eligibility_choice');intent=previous.intent;
  }else if(!intent)return null;
  if(intent.kind==='unsupported_personal_rf')return finish({kind:'protected',answer:'Ask LWR does not provide standalone or other-player Reliability Factor lookups. You can ask about your own eligibility for a current division.',sources:[]});
  const catalog=await loadCatalog(principal.supabase);
  if(previous&&previous.version!==catalog.candidates[0]?.documentVersionId)throw Error('eligibility_stale');
  const sourceCards=async evidence=>{const verified=await resolveSources(principal.supabase,evidence);const cards=[...new Map(verified.map(s=>[s.documentVersionId,{...s,citation:s.documentTitle+' — Rules pages '+[...new Set(verified.filter(v=>v.documentVersionId===s.documentVersionId).map(v=>v.pageNumber))].sort((a,b)=>a-b).join(', '),officialDocumentUrl:officialDocumentViewerHref(s,viewerId)}])).values()];if(cards.length>4)throw Error('eligibility_source_bound');return cards;};
  if(intent.kind==='source_rf_policy'){
   const c=catalog.candidates.find(c=>c.documentVersionId===ELIGIBILITY_POLICY_BINDING.version&&c.documentType==='league_rules'&&rulesRfThreshold(c.content)!==null);
   if(!c)throw Error('rf_policy_evidence');
   const threshold=rulesRfThreshold(c.content);
   const classification=sourceRfClassification(intent.rf,threshold);
   const answer=classification==='RF_UNKNOWN'?'That Reliability Factor is outside the supported 0–100 range.':`Under current Rule 4.1.1, the Reliability Factor you supplied (${intent.rf}) ${classification==='NR'?`is NR because it is ${threshold} or below`:`does not trigger NR because it is above ${threshold}`}. This applies the RF rule to your supplied value; it does not verify your stored rating, change a locked Season DUPR, or establish complete eligibility.`;
   return finish({kind:'answer',answer,sources:await sourceCards([excerptSelection(c,[{text:c.content}],'requirement')]),eligibility:{level:'POLICY_ONLY',outcome:'POLICY_ONLY',classification}});
  }
  if(intent.ageOnly){const c=catalog.candidates.find(c=>/6\.3\.2\./.test(c.content)&&/12\/31 of the season/.test(c.content));if(!c)throw Error('eligibility_age_policy');return finish({kind:'answer',answer:c.content,sources:await sourceCards([excerptSelection(c,[{text:c.content}],'requirement')]),eligibility:{level:'POLICY_ONLY',outcome:'POLICY_ONLY'}});}
  let options=divisionOptions(catalog.divisions,intent);
  if(choice?.division){options=options.filter(d=>d.ids.includes(choice.division));if(!options.length)throw Error('eligibility_stale');}
  if(!options.length)return finish({kind:'answer',answer:'I cannot find that division in the current active league structure. Please confirm the league and division; I will not substitute another league or division.',sources:[],eligibility:{level:'POLICY_ONLY',outcome:'CANNOT_DETERMINE'}});
  const clarify=(choices,answer)=>{const keyed=choices.slice(0,10).map(o=>({...o,key:randomUUID()}));if(choices.length>10)throw Error('eligibility_choice_bound');const token=sealLive('eligibility',principal,{intent,version:catalog.candidates[0].documentVersionId,options:keyed});return finish({kind:'clarification',answer,sources:[],conversationReceipt:PREFIX+token.slice(6),clarification:{kind:'eligibility context',options:keyed.map(o=>({key:'choice:'+o.key,label:o.label}))},eligibility:{level:'POLICY_ONLY',outcome:'CANNOT_DETERMINE'}});};
  if(options.length!==1||intent.decimal&&!choice||intent.referential&&!choice)return clarify(options.map(d=>({division:d.ids[0],label:d.label})), 'Which current league and division do you mean?');
  const division=options[0],policy=eligibilityPolicy(catalog.candidates,division);
  let input=null;
  if(intent.personal&&policy.status==='READY'){
   const query={intent:'ELIGIBILITY_SELF',subjectKind:'SELF',rating:division.rating,season:choice?.season||division.seasonId,origin};
   lookupAttempted=true;
   const response=await (lookup||((q)=>principal.supabase.rpc('ai_live_lookup',{p_actor:principal.user.id,p_request:id,p_query:q}).abortSignal(AbortSignal.timeout(5000))))(query);
   if(response.error)throw Error('eligibility_lookup');input=response.data;
   if(input.status==='ambiguous')return clarify((input.choices||[]).filter(c=>c.season===division.seasonId).map(c=>({division:division.ids[0],season:c.season,label:c.label})), 'Which authorized season do you mean?');
   if(['denied','not_found','rate_limited','unsupported'].includes(input.status))return finish({kind:'protected',answer:'I cannot access those personal eligibility inputs for your account and selected context.',sources:[],eligibility:{level:'POLICY_ONLY',outcome:'CANNOT_DETERMINE'}});
   if(!['success','missing','no_season'].includes(input.status))throw Error('eligibility_lookup');
   liveConsulted=['success','missing'].includes(input.status);
  }
  const evaluation=evaluateEligibility(policy,input);
  result={kind:policy.status==='POLICY_CONFLICT'?'conflict':'answer',answer:eligibilityText(policy,input,evaluation,intent.personal&&liveConsulted)+(intent.personal&&policy.status==='READY'&&!liveConsulted?'\n\nNo authorized personal eligibility inputs were available for this season; the information above is policy guidance only.':''),sources:policy.evidence?await sourceCards(policy.evidence):[],eligibility:{level:liveConsulted?'PARTIAL_PERSONAL_EVALUATION':'POLICY_ONLY',...evaluation,...(!intent.personal?{outcome:policy.status==='READY'?'POLICY_ONLY':evaluation.outcome}:{}),evidence:policy.evidence?.map(excerptReferences)||[]},conversationReceipt:null};
  return await finish(result);
 }catch{return finish({kind:'technical_error',answer:'I could not safely complete that eligibility check. Please ask the full question again.',sources:[],eligibility:{level:'POLICY_ONLY',outcome:'CANNOT_DETERMINE'}});}
}
