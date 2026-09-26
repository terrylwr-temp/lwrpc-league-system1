import {eligibilityProvenance,resultSourceFamily} from './aiResultSource.js';
import {randomUUID} from 'node:crypto';
import {eligibilityIntent,isEligibilityReceipt} from './aiEligibilityIntent.js';
import {divisionOptions,eligibilityPolicy,evaluateEligibility,eligibilityText,currentEligibilityRules,classifyRfCondition} from './aiEligibilityPolicy.js';
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
 if(rows.length>160)throw Error('eligibility_chunks');
 const divisions=await read(db.from('divisions').select('id,name,is_active,min_dupr,max_dupr,team_dupr_max,rating_type,league:leagues!inner(id,name,is_active,season:seasons!inner(id,name,is_active))').eq('is_active',true).eq('league.is_active',true).eq('league.season.is_active',true).limit(101));
 if(divisions.length>100)throw Error('eligibility_divisions');
 return {rulesVersionId:d.active_version_id,candidates:rows.map(c=>({chunkId:c.id,documentId:d.id,documentVersionId:c.document_version_id,documentTitle:d.title,documentType:d.document_type,documentAuthorityRank:d.authority_rank,content:c.content,pageNumber:c.page_number,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,chunkOrdinal:c.chunk_ordinal})),divisions:divisions.map(x=>({id:x.id,name:x.name,active:x.is_active&&x.league.is_active&&x.league.season.is_active,league:['weekday','saturday','primetime'].find(l=>x.league.name.toLowerCase().includes(l)),seasonId:x.league.season.id,seasonName:x.league.season.name,min:x.min_dupr,max:x.max_dupr,pair:x.team_dupr_max,rating:x.rating_type==='primetime'?'primetime':x.rating_type==='dupr'?'season':x.rating_type}))};
}
export async function runEligibility({body,principal,origin='player_interface',lookup,loadCatalog=loadEligibilityCatalog,resolveSources=resolveOfficialSources,persist=persistQuality,deferRecovery,viewerId=principal.user.id}){
 let intent=eligibilityIntent(body.question),previous=null,choice=null;
 if(!intent&&!/^choice:/.test(body.question||''))return null;
 const id=randomUUID(),started=Date.now();let result,lookupAttempted=false,liveConsulted=false;
 const finish=async value=>{
 if(previous&&choice)value.resolvedQuestion=[previous.originalQuestion||'Eligibility question',...(previous.selectedLabels||[]),choice.label].filter(Boolean).join(' — ');
 value.privateContext=true;
 value.provenance=eligibilityProvenance(value,{lookupAttempted,liveConsulted});
 if(value.provenance.liveDataUsed)value.live={operation:'ELIGIBILITY',checkedAt:new Date().toISOString()};

 try { await persist(principal.supabase,()=>({p_outcome:{id,request_started_at:new Date(started).toISOString(),completed_at:new Date().toISOString(),origin,final_kind:value.kind,reason_code:'eligibility_'+(value.eligibility?.outcome||value.kind).toLowerCase(),assistant_version:APP_VERSION,model:null,feedback_eligible:false,source_family:resultSourceFamily(value),selected_evidence_count:value.sources?.length||0,stage3_invoked:false,model_call_skipped:true,resolver_classification:'eligibility_deterministic',diagnostic_snapshot:{workflow:'ELIGIBILITY_SELF',result:value.eligibility?.outcome||value.kind,...value.provenance},total_ms:Date.now()-started,input_tokens:0,output_tokens:0,telemetry_version:2},p_occurrence:null,p_route:null,p_feedback_id:null}),{correlationId:id,origin,deferRecovery}); } catch { /* Persistence is fail-open; never create another logical outcome. */ } return value;};
 try{
  if(isEligibilityReceipt(body.conversationReceipt)&&/^choice:/.test(body.question)){
   previous=openLive('live1.'+body.conversationReceipt.slice(PREFIX.length),'eligibility',principal);
   choice=previous.options.find(o=>'choice:'+o.key===body.question);if(!choice)throw Error('eligibility_choice');intent=previous.intent;
  }else if(!intent)throw Error('eligibility_choice');
  if(intent.kind==='unsupported_personal_rf')return finish({kind:'protected',answer:'Ask LWR does not provide standalone or other-player Reliability Factor lookups. You can ask about your own eligibility for a current division.',sources:[]});
  const catalog=await loadCatalog(principal.supabase);
  const rules=currentEligibilityRules(catalog.candidates);
  const unavailable=()=>finish({kind:'insufficient_evidence',answer:'I cannot establish the current eligibility rule from verified official Rules evidence. Please ask League Management to confirm the applicable policy.',sources:[],eligibility:{level:'POLICY_ONLY',outcome:'POLICY_UNAVAILABLE'}});
  if(!rules||catalog.rulesVersionId&&rules.version!==catalog.rulesVersionId)return unavailable();
  if(previous&&previous.version!==rules.version)return unavailable();
  const sourceCards=async evidence=>{const verified=await resolveSources(principal.supabase,evidence);const cards=[...new Map(verified.map(s=>[s.documentVersionId,{...s,citation:s.documentTitle+' — Rules pages '+[...new Set(verified.filter(v=>v.documentVersionId===s.documentVersionId).map(v=>v.pageNumber))].sort((a,b)=>a-b).join(', '),officialDocumentUrl:officialDocumentViewerHref(s,viewerId)}])).values()];if(cards.length>4)throw Error('eligibility_source_bound');return cards;};
  if(intent.kind==='source_rf_policy'){
   if(!rules.rfReady)return unavailable();
   const classification=classifyRfCondition(intent.rfCondition,rules.threshold);
   const supplied=intent.rfCondition;
   const condition=supplied.operator==='lt'?'less than':supplied.operator==='lte'?'at most':supplied.operator==='gt'?'greater than':supplied.operator==='gte'?'at least':'exactly';
   const answer=classification==='RF_UNKNOWN'?`Rule 4.1.1 classifies a player as Not Rated (NR) at a Reliability Score/Factor of ${rules.threshold} or below. The condition you gave (${condition} ${supplied.value}) spans both sides of that threshold, so I cannot classify every possible value without the actual score.`:classification==='NR'?`Yes. Under current Rule 4.1.1, a Reliability Score/Factor ${condition} ${supplied.value} is within the ${rules.threshold}-or-below NR rule.${intent.decimal?` A numeric DUPR of ${intent.decimal} does not override that RF classification.`:''} Rule 4.5 permits NR players in any division, subject to appropriate placement and the other participation requirements. This is the general rule, not a check of that player's stored rating or complete eligibility.`:`No. A Reliability Score/Factor ${condition} ${supplied.value} is above the ${rules.threshold}-or-below NR threshold in Rule 4.1.1. Other rating and eligibility requirements may still apply; I have not checked a player's record.`;
   return finish({kind:'answer',answer,sources:await sourceCards([excerptSelection(rules.rf,[{text:rules.rf.content}],'requirement'),excerptSelection(rules.nr,[{text:rules.nr.content}],'requirement')]),eligibility:{level:'POLICY_ONLY',outcome:'POLICY_ONLY',classification}});
  }
  if(intent.ageOnly){const c=catalog.candidates.find(c=>/6\.3\.2\./.test(c.content)&&/12\/31 of the season/.test(c.content));if(!c)return unavailable();return finish({kind:'answer',answer:c.content,sources:await sourceCards([excerptSelection(c,[{text:c.content}],'requirement')]),eligibility:{level:'POLICY_ONLY',outcome:'POLICY_ONLY'}});}
  if(!rules.fullReady)return unavailable();
  let options=divisionOptions(catalog.divisions,intent);
  if(choice?.division){options=options.filter(d=>d.ids.includes(choice.division));if(!options.length)throw Error('eligibility_stale');}
  if(!options.length)return finish({kind:'answer',answer:'I cannot find that division in the current active league structure. Please confirm the league and division; I will not substitute another league or division.',sources:[],eligibility:{level:'POLICY_ONLY',outcome:'CANNOT_DETERMINE'}});
  const clarify=(choices,answer)=>{const keyed=choices.slice(0,10).map(o=>({...o,key:randomUUID()}));if(choices.length>10)throw Error('eligibility_choice_bound');const token=sealLive('eligibility',principal,{intent,version:rules.version,options:keyed,originalQuestion:previous?.originalQuestion||String(body.question||'').slice(0,1000),selectedLabels:[...(previous?.selectedLabels||[]),...(choice?.label?[choice.label]:[])]});return finish({kind:'clarification',answer,sources:[],conversationReceipt:PREFIX+token.slice(6),clarification:{kind:'eligibility context',options:keyed.map(o=>({key:'choice:'+o.key,label:o.label}))},eligibility:{level:'POLICY_ONLY',outcome:'CANNOT_DETERMINE'}});};
  if(options.length!==1||intent.decimal&&!choice||intent.referential&&!choice)return clarify(options.map(d=>({division:d.ids[0],label:d.label})), 'Which current league and division do you mean?');
  const division=options[0],policy=eligibilityPolicy(catalog.candidates,division);
  if(policy.status==='POLICY_UNKNOWN'||policy.status==='POLICY_SCOPE_UNKNOWN')return unavailable();
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
  const conditionClass=intent.rfCondition&&policy.status==='READY'?classifyRfCondition(intent.rfCondition,policy.threshold):null;
  const conditionNote=!intent.personal&&conditionClass==='NR'?`\n\nThe reliability condition in your question falls within the ${policy.threshold}-or-below NR rule. This is policy guidance, not a lookup of that player's record or a complete eligibility determination.`:'';
  result={kind:policy.status==='POLICY_CONFLICT'?'conflict':'answer',answer:eligibilityText(policy,input,evaluation,intent.personal&&liveConsulted)+conditionNote+(intent.personal&&policy.status==='READY'&&!liveConsulted?'\n\nNo authorized personal eligibility inputs were available for this season; the information above is policy guidance only.':''),sources:policy.evidence?await sourceCards(policy.evidence):[],eligibility:{level:liveConsulted?'PARTIAL_PERSONAL_EVALUATION':'POLICY_ONLY',...evaluation,...(!intent.personal?{outcome:policy.status==='READY'?'POLICY_ONLY':evaluation.outcome}:{}),evidence:policy.evidence?.map(excerptReferences)||[]},conversationReceipt:null};
  return await finish(result);
 }catch(error){if(['eligibility_catalog','eligibility_chunks'].includes(error?.message))return finish({kind:'insufficient_evidence',answer:'I cannot establish the current eligibility rule from verified official Rules evidence. Please ask League Management to confirm the applicable policy.',sources:[],eligibility:{level:'POLICY_ONLY',outcome:'POLICY_UNAVAILABLE'}});return finish({kind:'technical_error',answer:'I could not safely complete that eligibility check. Please ask the full question again.',sources:[],eligibility:{level:'POLICY_ONLY',outcome:'CANNOT_DETERMINE'}});}
}
