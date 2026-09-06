import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
process.env.LWR_AI_ENABLED='true';process.env.OPENAI_API_KEY='synthetic-test-only';process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-test-only';
const {schedulingQuestionKind}=await import('../app/lib/aiSchedulingApplicability.js');
const {genericApplicablePassages}=await import('../app/lib/aiQuestionApplicability.js');
const {chooseApprovedEvidence}=await import('../app/lib/aiApprovedAnswersSelection.js');
const {prepareApprovedRelatedEvidence}=await import('../app/lib/aiApprovedRelatedEvidence.js');
const {selectAnswerEvidence,generateOfficialAnswer,resolveOfficialSources}=await import('../app/lib/aiAnswerGeneration.js');
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {isUnsupportedOperationalQuestion,toPlayerAnswerResult}=await import('../app/lib/askLwrPlayerAnswer.js');
const replay=JSON.parse(readFileSync(new URL('../../docs/lms-0721-natural-variant-replay.json',import.meta.url)));
const chunkId='01444d6d-44da-4fd9-8069-e7fe1e117e28',versionId='c0604ad8-7057-4e63-b6e1-e9389aee2157',documentId='9c200d0f-be41-4c73-9f47-41c18dcd0132';
const revision={...replay.revision,answer_id:'8d11bdd6-5024-416a-ab48-df90a5b35477',revision_number:1,status:'active',authority_manifest_hash:'test-manifest',related_chunk_id:chunkId};
const stored={id:chunkId,document_version_id:versionId,is_searchable:true,page_number:5,rule_number:'5.10',heading:'Video Recording',section_label:'TEAM/GAME RULES',content:'5.10. Video Recording: Video recording is allowed only if all players give their approval before\nthe game starts.\n'+revision.related_passage};
const version={id:versionId,document_id:documentId,processing_status:'ready',document:{id:documentId,title:'LWR Pickleball Club DUPR League Rules',status:'active',active_version_id:versionId,document_type:'league_rules',scope_kind:'all',authority_rank:1}};
const source={chunkId,documentId,documentVersionId:versionId,documentTitle:version.document.title,documentType:'league_rules',documentAuthorityRank:1,content:stored.content,ruleNumber:stored.rule_number,heading:stored.heading,combinedScore:.4723};
function dbFor(chunk=stored,v=version){return {from:table=>({select:()=>({in:async()=>({data:table==='ai_document_chunks'?[chunk]:[v]})})})};}
function managed(score=.6849,r=revision){return {revision:r,semantic_score:score,manifest:'test-manifest'};}
function retrieval(question,candidates){return {request:{question,askAbout:'all'},suppliedEvidence:candidates,authorityReviewCandidates:candidates,evidence:{sufficient:!!candidates.length,threshold:.35}};}

for(const row of replay.rows.slice(0,7))test('0721 scheduling production matrix: '+row.question,async()=>{
  assert.equal(schedulingQuestionKind(row.question),'match_schedule_change');
  assert.deepEqual(genericApplicablePassages(source,row.question),[revision.related_passage]);
  const ranked=row.stage3.find(c=>c.id===chunkId);
  const formal=selectAnswerEvidence(retrieval(row.question,ranked?[{...source,combinedScore:ranked.score}]:[]));
  const prepared=await prepareApprovedRelatedEvidence({supabase:dbFor(),question:row.question,formal,rows:[managed(row.score)],date:'2026-09-06'});
  const result=chooseApprovedEvidence(row.question,prepared.formal,prepared.rows,{date:'2026-09-06'});
  assert.equal(result.selected.some(s=>s.sourceKind==='approved_answer'),row.thresholdPass);
  assert.equal(prepared.diagnostic.lookupCount,row.thresholdPass?2:0);
  assert.equal(result.warnings.length,0);
  if(row.thresholdPass){assert.equal(result.selected.length,2);assert.equal(result.selected[0].content,revision.related_passage);assert.equal(result.selected[0].ruleNumber,'5.11');assert.equal(result.selected[0].evidenceRole,'Primary / controlling');}
});

for(const row of replay.rows.slice(7))test('0721 scheduling negative even with high managed score: '+row.question,async()=>{
  if(row.guard)assert.equal(isUnsupportedOperationalQuestion(row.question),true);
  assert.notEqual(schedulingQuestionKind(row.question),'match_schedule_change');
  const prepared=await prepareApprovedRelatedEvidence({supabase:dbFor(),question:row.question,formal:[],rows:[managed(.99)]});
  assert.equal(prepared.diagnostic.lookupCount,0);
  assert.equal(chooseApprovedEvidence(row.question,[],prepared.rows).selected.length,0);
});

test('0721 scheduling inflections do not admit forfeiture, sibling video or generic play',()=>{
 const weather=replay.rows.find(r=>r.question==='Can we reschedule our match?').formal[0];
 for(const q of ['Can our match be rescheduled?','Is rescheduling our match allowed?','Can we move our match?','Can we play our match at another time?']){
  const result=selectAnswerEvidence(retrieval(q,[{...source,combinedScore:.4723},{...source,chunkId:weather.id,content:weather.content,combinedScore:.3698}]));
  assert.equal(result.length,1);assert.equal(result[0].content,revision.related_passage);
 }
 for(const q of ['Can we play earlier?','Can I move?','Can I change my court position?'])assert.equal(schedulingQuestionKind(q),'');
});

test('0721 scheduling preserves makeup deadline and flex editing scope',()=>{
 const makeup={...source,content:'5.12. Makeup Game Deadline: All makeup games must be played at least one week before the\nplayoƯs/championship date.'};
 const flex={...source,content:'6.1.9. Men’s/Women’s 9.1 Division: These divisions will initially be scheduled as a “flex\nleague” with matches initially scheduled for Fridays at noon but the Captains can\nmodify the match day/time (within 7 days).'};
 assert.equal(genericApplicablePassages(makeup,'Can we reschedule our makeup match before the playoffs?').length,1);
 assert.equal(genericApplicablePassages(makeup,'Can we reschedule our match?').length,0);
 assert.equal(genericApplicablePassages(flex,'Can we reschedule our match?').length,0);
 assert.equal(genericApplicablePassages(flex,'Can we change our flex league match time?').length,1);
 assert.equal(genericApplicablePassages(source,'Can playoffs be rescheduled?').length,0);
});

for(const failure of ['sibling','identity','stale','scope','unsearchable','timeout'])test('0721 related source fails safely: '+failure,async()=>{
 const r=failure==='sibling'?{...revision,related_passage:stored.content.split('\n5.11.')[0],related_rule_identity:'5.10'}:failure==='identity'?{...revision,related_rule_identity:'5.10'}:revision;
 const db=failure==='timeout'?{from:()=>({select:()=>({in:()=>new Promise(()=>{})})})}:dbFor({...stored,is_searchable:failure!=='unsearchable'},{...version,document:{...version.document,active_version_id:failure==='stale'?randomUUID():versionId,scope_kind:failure==='scope'?'league':'all'}});
 const prepared=await prepareApprovedRelatedEvidence({supabase:db,question:'Can we reschedule our match?',formal:[],rows:[managed(.9,r)],timeoutMs:10});
 assert.equal(chooseApprovedEvidence('Can we reschedule our match?',prepared.formal,prepared.rows).selected.length,0);
 assert.ok(['rejected','unavailable'].includes(prepared.diagnostic.considered[0].status));
});

test('0721 source identity revalidated at citation resolution selects sibling 5.11 exactly',async()=>{
 const p=await prepareApprovedRelatedEvidence({supabase:dbFor(),question:'Can we reschedule our match?',formal:[],rows:[managed()]});
 const db={...dbFor(),storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://example.invalid/test.pdf'}})})}};
 const sources=await resolveOfficialSources(db,p.formal);
 assert.equal(sources[0].ruleNumber,'5.11');assert.match(sources[0].citation,/5.11/);
 await assert.rejects(()=>resolveOfficialSources({...dbFor({...stored,content:stored.content.replace('same week','next month')}),storage:db.storage},p.formal));
});

test('0721 normal handoff uses one embedding/model, both sources, private diagnostics and provenance',async()=>{
 let embeddings=0,models=0;
 const db={...dbFor(),rpc:async name=>({data:name==='search_ai_approved_answers'?[managed()]:[]})};
 const r=await retrieveOfficialEvidence({supabase:db,body:{question:'Can we reschedule our match?'},embedQuery:async()=>{embeddings++;return {embedding:Array(1536).fill(.01)};}});
 const answer=await generateOfficialAnswer({retrieval:r,supabase:db,resolveSources:async(_db,rows)=>rows.map(x=>({...x,citation:x.documentTitle,officialDocumentUrl:'https://example.invalid/test.pdf'})),fetchImpl:async(_url,options)=>{
  models++;const body=JSON.parse(options.body);assert.match(JSON.stringify(body),/Sunday/);assert.match(JSON.stringify(body),/info@lwrpickleballclub.com/);
  return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:revision.approved_answer,conflict:false,supported:true})}]}]})};
 }});
 assert.equal(answer.evidenceSufficient,true);assert.equal(embeddings,1);assert.equal(models,1);assert.equal(answer.selectedEvidence.length,2);
 assert.equal(r.approvedRelatedEvidence.combination,'formal_plus_supplemental');assert.equal(r.authorityWarnings.length,0);
 const player=toPlayerAnswerResult(answer,randomUUID(),{originalQuestion:r.request.question,effectiveQuestion:r.request.question,retrieval:r});
 assert.equal(player.kind,'answer');assert.equal('approvedRelatedEvidence' in player,false);assert.ok(player.feedbackReceipt);assert.equal(player.sources.find(s=>s.sourceKind==='approved_answer').approvedRevisionId,revision.id);
});

test('0721 independent eligibility prevents source reads for stale, Draft, retired, expired or wrong scope',async()=>{
 for(const extra of [{status:'draft'},{status:'retired'},{authority_manifest_hash:'stale'},{expires_on:'2026-09-05'},{league_scope:'saturday'}]){
  const p=await prepareApprovedRelatedEvidence({supabase:dbFor(),question:'Can we reschedule our match?',formal:[],rows:[managed(.99,{...revision,...extra})],date:'2026-09-06'});
  assert.equal(p.diagnostic.lookupCount,0);assert.equal(chooseApprovedEvidence('Can we reschedule our match?',p.formal,p.rows,{date:'2026-09-06'}).selected.length,0);
 }
});

test('0721 binding uses structure, not Rule 5.11 or item IDs; genuine conflict is not suppressed',async()=>{
 const passage=revision.related_passage.replace(/^5\.11\./,'9.4.');
 const r={...revision,id:randomUUID(),answer_id:randomUUID(),related_rule_identity:'9.4',related_passage:passage,approved_answer:passage.replace('may be\nrescheduled','may not be\nrescheduled')};
 const p=await prepareApprovedRelatedEvidence({supabase:dbFor({...stored,rule_number:'9.4',content:passage}),question:'Can we reschedule our match?',formal:[],rows:[managed(.99,r)]});
 assert.equal(p.diagnostic.considered[0].status,'validated');
 const chosen=chooseApprovedEvidence('Can we reschedule our match?',p.formal,p.rows);
 assert.equal(chosen.warnings.length,1);assert.equal(chosen.selected.some(s=>s.sourceKind==='approved_answer'),false);
});
