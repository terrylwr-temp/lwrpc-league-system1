import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
process.env.LWR_AI_ENABLED='true';process.env.OPENAI_API_KEY='synthetic-local-only';process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-local-receipt-key';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
const {toPlayerAnswerResult}=await import('../app/lib/askLwrPlayerAnswer.js');
const {qualityOutcome,qualityException}=await import('../app/lib/aiQualitySnapshots.js');
const {chooseApprovedEvidence,meaningfulDiscrepancy}=await import('../app/lib/aiApprovedAnswersSelection.js');
const {sourceReviewFindings}=await import('../app/lib/aiApprovedAnswersService.js');
const {readApprovedViewer}=await import('../app/lib/aiApprovedAnswerViewer.js');
const fixtures=JSON.parse(await readFile(new URL('./fixtures/lms0720-assisted-retrieval-production.json',import.meta.url),'utf8'));
function managed(extra={}){return {id:randomUUID(),answer_id:randomUUID(),revision_number:1,status:'active',activated_at:'2026-01-01T00:00:00Z',title:'Synthetic administrative procedure',topic_key:'synthetic-policy',canonical_question:'How can I request an administrative review?',approved_answer:'Request an administrative review through League Management.',league_scope:'all',temporal_scope:'standing',effective_on:'2026-01-01',expires_on:null,content_hash:'a'.repeat(64),authority_manifest_hash:'manifest',public_links:[],...extra};}
const response=value=>({ok:true,status:200,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
test('0721 production-format Rule 3.5 governs; authority warning is metadata only',async()=>{
 const fixture=fixtures.find(f=>f.question.includes('comunity'));
 const rule=fixture.searches.at(-1).rows.find(r=>String(r.content).includes('roster availability'));
 const passage=rule.content.slice(rule.content.indexOf('3.5.'),rule.content.indexOf('3.6.'));
 const contradiction=managed({canonical_question:fixture.question,approved_answer:passage.replace('not\npermitted','permitted').replace('not permitted','permitted')});
 let searches=0,managedCalls=0,models=0;const db={rpc:async name=>name==='search_ai_approved_answers'?(managedCalls++,{data:[{revision:contradiction,semantic_score:.99,manifest:'manifest'}]}):{data:fixture.searches[searches++].rows}};
 const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question:fixture.question},embedQuery:async()=>({embedding:Array(1536).fill(.01)})});
 const answer=await generateOfficialAnswer({retrieval,supabase:db,resolveSources:async(_db,rows)=>rows.map(r=>({...r,citation:r.documentTitle,officialDocumentUrl:'https://example.invalid/local.pdf'})),fetchImpl:async()=>{models++;return response({answer:'The formal LWR community roster-availability restriction governs.',conflict:false});}});
 assert.equal(answer.evidenceSufficient,true);assert.equal(answer.conflict.requiresClarification,false);assert.ok(answer.selectedEvidence.every(r=>r.sourceKind!=='approved_answer'));
 assert.equal(retrieval.authorityWarnings.length,1);assert.equal(retrieval.authorityWarnings[0].approvedRevisionId,contradiction.id);
 assert.equal(managedCalls,1);assert.equal(models,1);
 const result=toPlayerAnswerResult(answer,randomUUID(),{originalQuestion:fixture.question,effectiveQuestion:fixture.question,retrieval});assert.ok(result.feedbackReceipt);assert.equal(result.kind,'answer');assert.equal('authorityWarnings' in result,false);
 const execution={result,answer,retrieval,conversationResolution:{rawQuestion:fixture.question,effectiveQuestion:fixture.question}};
 const outcome=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1000,completed:1200,execution});
 assert.equal(outcome.final_kind,'answer');assert.equal(outcome.diagnostic_snapshot.authorityWarnings.length,1);assert.equal(qualityException(outcome,execution).p_occurrence,null);
 assert.ok(Buffer.byteLength(JSON.stringify(outcome.diagnostic_snapshot))<4096);
 assert.equal(chooseApprovedEvidence(fixture.question,answer.selectedEvidence,[{revision:{...contradiction,status:'retired'},semantic_score:.99,manifest:'manifest'}]).warnings.length,0);
 assert.equal(chooseApprovedEvidence(fixture.question,answer.selectedEvidence,[{revision:{...contradiction,approved_answer:passage},semantic_score:.99,manifest:'manifest'}]).warnings.length,0);
});
test('0721 managed answer has exact feedback/viewer provenance, one query embedding and one model call',async()=>{
 const revision=managed();let embeddings=0,queries=0,modelCalls=0,sourceChecks=0;
 const db={rpc:async name=>name==='search_ai_approved_answers'?(queries++,{data:[{revision,semantic_score:.95,manifest:'manifest'}]}):{data:[]}};
 const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question:'How do I ask for an administrative review?'},embedQuery:async()=>{embeddings++;return {embedding:Array(1536).fill(.01)};}});
 const answer=await generateOfficialAnswer({retrieval,supabase:db,resolveSources:async(_db,rows)=>{sourceChecks++;return rows.map(r=>({...r,citation:r.documentTitle}));},fetchImpl:async(_url,options)=>{modelCalls++;assert.ok(JSON.parse(options.body).text.format.schema.required.includes('supported'));return response({answer:revision.approved_answer,conflict:false,supported:true});}});
 assert.equal(answer.evidenceSufficient,true);assert.equal(embeddings,1);assert.equal(queries,1);assert.equal(modelCalls,1);assert.equal(sourceChecks,2);
 const user=randomUUID(),result=toPlayerAnswerResult(answer,user,{originalQuestion:retrieval.request.question,effectiveQuestion:retrieval.request.question,retrieval});
 assert.equal(result.kind,'answer');assert.ok(result.feedbackReceipt);assert.equal(result.sources[0].approvedRevisionId,revision.id);assert.match(result.sources[0].citation,/Approved Answer/);
 const token=decodeURIComponent(result.sources[0].officialDocumentUrl.split('/').at(-1));assert.equal(readApprovedViewer(token,user).approvedRevisionId,revision.id);assert.throws(()=>readApprovedViewer(token,randomUUID()));
});
for(const failure of ['unsupported','retired-during-generation'])test('0721 safe managed fallback: '+failure,async()=>{
 const revision=managed();let checks=0;
 const retrieval=await retrieveOfficialEvidence({supabase:{rpc:async name=>({data:name==='search_ai_approved_answers'?[{revision,semantic_score:.99,manifest:'manifest'}]:[]})},body:{question:revision.canonical_question},embedQuery:async()=>({embedding:Array(1536).fill(.01)})});
 const answer=await generateOfficialAnswer({retrieval,supabase:{},resolveSources:async(_db,rows)=>{if(++checks===2)throw Error('retired');return rows.map(r=>({...r,citation:r.documentTitle}));},fetchImpl:async()=>response({answer:'Synthetic response',conflict:false,supported:failure!=='unsupported'})});
 assert.equal(answer.evidenceSufficient,false);assert.equal(answer.modelCallSkipped,false);assert.deepEqual(answer.sources,[]);assert.equal(toPlayerAnswerResult(answer,randomUUID()).feedbackReceipt,null);
});
test('0721 website existing-authority review independently identifies Rule 1.1',()=>{
 const findings=sourceReviewFindings('What is the website for the club',[{chunk_id:randomUUID(),document_id:randomUUID(),document_version_id:randomUUID(),document_title:'LWR Pickleball Club DUPR League Rules',document_type:'league_rules',page_number:2,rule_number:'1',heading:'CLUB LEAGUE FORMAT',content:'1. CLUB LEAGUE FORMAT\n1.1. Club main website: https://lwrpickleballclub.com\n1.2. League Management System (LMS) website: https://league.lwrpickleballclub.com'}]);
 assert.equal(findings[0].direct,true);assert.equal(findings[0].ruleNumber,'1.1');
});
test('0721 scope, competing policies and complementary evidence remain distinct',()=>{
 const revision=managed({canonical_question:'Can we arrange a makeup on Sunday?',approved_answer:'Teams may arrange a makeup on Sunday.'});
 const row={revision,semantic_score:.99,manifest:'manifest'};
 assert.deepEqual(chooseApprovedEvidence('Can we arrange a makeup on the weekend?',[],[row]).selected,[]);
 assert.deepEqual(chooseApprovedEvidence('Can we arrange a makeup on Saturday?',[],[row]).selected,[]);
 assert.equal(meaningfulDiscrepancy(revision,{content:'An organizer can provide administrative assistance.'}),null);
 const other={revision:{...revision,id:randomUUID(),approved_answer:'Teams may not arrange a makeup on Sunday.'},semantic_score:.98,manifest:'manifest'};
 assert.equal(chooseApprovedEvidence(revision.canonical_question,[],[row,other]).conflict,true);
 assert.equal(chooseApprovedEvidence(revision.canonical_question,[],[other,row]).conflict,true);
});
