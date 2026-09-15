import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {runEligibility} from '../app/lib/aiEligibilityService.js';
import {eligibilityIntent} from '../app/lib/aiEligibilityIntent.js';
import {documentProvenance,resultSourcePresentation,resultSourceFamily,viewAsSourceFamily} from '../app/lib/aiResultSource.js';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
import {createConversationContext,SESSION_EXCHANGES_KEY} from '../app/lib/askLwrConversationState.js';
import {catalog,sourceDatabase} from './helpers/eligibilityFixture.mjs';
process.env.SUPABASE_SERVICE_ROLE_KEY='classification-fixture-only';
const principal={user:{id:'10000000-0000-4000-8000-000000000101'},receiptBinding:'synthetic',supabase:sourceDatabase()};
async function run(question,status='success',extra={}){let reads=0,payload;const result=await runEligibility({body:{question},principal,loadCatalog:async()=>catalog,lookup:async()=>{reads++;return {data:{status,rf:status==='missing'?null:80,value:2.5,sourceIsNr:false}};},persist:async(_db,make)=>{payload=make();return true;},...extra});return {result,reads,payload};}
for(const question of ['What are the requirements for DUPR5?','What DUPR range is allowed in DUPR5?','How does NR work for DUPR5?'])test('Document-only '+question,async()=>{const {result,reads,payload}=await run(question);assert.equal(reads,0);assert.equal(result.provenance.mode,'DOCUMENT_ONLY');assert.equal(result.live,undefined);assert.equal(resultSourcePresentation(result).label,'OFFICIAL RULES');assert.equal(resultSourcePresentation(result).checkedAt,null);assert.equal(payload.p_outcome.source_family,'lwr');assert.equal(payload.p_outcome.diagnostic_snapshot.liveConsulted,false);assert.equal(viewAsSourceFamily(result),'document');});
for(const question of ['Can I play on a DUPR5 team?','Am I eligible for DUPR5?'])test('Hybrid '+question,async()=>{const {result,reads,payload}=await run(question);assert.equal(reads,1);assert.equal(result.provenance.mode,'HYBRID_DOCUMENT_LIVE');assert.equal(resultSourcePresentation(result).label,'LIVE LMS + OFFICIAL RULES');assert.equal(result.eligibility.outcome,'PARTIALLY_CONFIRMED');assert.equal(payload.p_outcome.source_family,'LIVE_LMS_DATA');assert.equal(payload.p_outcome.diagnostic_snapshot.hybrid,true);assert.equal(viewAsSourceFamily(result),'LIVE_LMS_DATA');});
for(const question of ['When is my Season DUPR established?','Can my Season DUPR change during the season?','How does NR eligibility work?','What does the Reliability Factor rule say?'])test('Existing document policy '+question,()=>{assert.equal(eligibilityIntent(question),null);assert.equal(liveIntent(question),null);assert.equal(resultSourceFamily({sources:[{}]}),'lwr');assert.equal(resultSourcePresentation({sources:[{}]}),null);});
test('Existing Live SELF_RATING remains live-only',()=>{assert.equal(liveIntent('What is my Season DUPR?').intent,'SELF_RATING');assert.equal(resultSourcePresentation({live:{operation:'SELF_RATING',checkedAt:'2026-09-08'}}).label,'LIVE LMS DATA');});
test('Authorized missing RF is consulted and hybrid but UNKNOWN',async()=>{const {result,payload}=await run('Can I play DUPR5?','missing');assert.equal(result.provenance.mode,'HYBRID_DOCUMENT_LIVE');assert.equal(result.eligibility.outcome,'CANNOT_DETERMINE');assert.equal(payload.p_outcome.diagnostic_snapshot.liveConsulted,true);assert.match(result.answer,/missing or unavailable/);});
for(const status of ['denied','not_found','rate_limited','unsupported','ambiguous','no_season'])test('No successful personal inputs: '+status,async()=>{const {result,payload}=await run('Can I play DUPR5?',status);assert.equal(result.provenance.lookupAttempted,true);assert.equal(result.provenance.liveConsulted,false);assert.equal(result.provenance.hybrid,false);assert.equal(result.live,undefined);assert.notEqual(payload.p_outcome.source_family,'LIVE_LMS_DATA');if(status==='no_season'){assert.equal(result.provenance.mode,'DOCUMENT_ONLY');assert.match(result.answer,/policy guidance only/);}});
for(const question of ['Can I play PrimeTime 9?','Can I play DUPR7?','Can I play SDUPR5?'])test('Planned personal access not performed '+question,async()=>{const {result,reads}=await run(question);assert.equal(reads,0);assert.equal(result.provenance.liveConsulted,false);assert.equal(result.live,undefined);assert.notEqual(result.provenance.mode,'HYBRID_DOCUMENT_LIVE');});
test('Failed source validation cannot claim successful personal comparison',async()=>{const {result,payload}=await run('Can I play DUPR5?','success',{resolveSources:async()=>{throw Error('fixture');}});assert.equal(result.kind,'technical_error');assert.equal(result.provenance.liveConsulted,true);assert.equal(result.provenance.liveDataUsed,false);assert.equal(resultSourcePresentation(result),null);assert.equal(payload.p_outcome.source_family,'none');});
test('View-As uses identical trusted source classifications with no role inference',async()=>{for(const question of ['Can I play DUPR5?','What are the requirements for DUPR5?']){const a=await run(question);const b=await run(question,'success',{origin:'view_as',viewerId:'10000000-0000-4000-8000-000000000777'});assert.deepEqual(a.result.provenance,b.result.provenance);assert.equal(a.reads,b.reads);}});
test('Source metadata contains no private values or member identifiers',async()=>{const {result,payload}=await run('Can I play DUPR5?');assert.deepEqual(payload.p_outcome.diagnostic_snapshot.mode,result.provenance.mode);assert.doesNotMatch(JSON.stringify(payload),/sourceIsNr|member_id|"rf"|000000000101/);
 const assertNoPrivateRating=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))assertNoPrivateRating(child);}else{assert.notEqual(value,2.5);assert.notEqual(value,'2.5');}};
 assertNoPrivateRating(payload);});
test('Privacy history is independent of document-only badge and stale result.live',async()=>{const {result}=await run('What are the requirements for DUPR5?');const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};const ctx=createConversationContext(storage);ctx.saveHistory([{question:'fixture',result}],ctx.generation());assert.equal(values.has(SESSION_EXCHANGES_KEY),false);values.set(SESSION_EXCHANGES_KEY,JSON.stringify([{question:'fixture',result}]));assert.deepEqual(createConversationContext(storage).history(),[]);});
test('Normal and View-As UI use shared presentation and avoid hardcoded eligibility LIVE banner',()=>{for(const file of ['app/components/AskLwrAssistant.js']){const s=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.match(s,/resultSourcePresentation/);assert.doesNotMatch(s,/>LIVE LMS DATA</);}});
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import ts from 'typescript';
const componentSource=fs.readFileSync(new URL('../app/components/AskLwrAssistant.js',import.meta.url),'utf8');
const exchangeSource=componentSource.slice(componentSource.indexOf('function Exchange('),componentSource.indexOf('function FeedbackControls('));
const compiled=ts.transpileModule(exchangeSource,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const Exchange=new Function('React','resultSourcePresentation','AskLwrChoices','FeedbackControls',compiled+';return Exchange;')(React,resultSourcePresentation,()=>null,()=>null);
test('Actual player Exchange markup renders official/hybrid/live badges and timestamp truthfully',async()=>{
 const doc=(await run('What are the requirements for DUPR5?')).result;
 const hybrid=(await run('Can I play DUPR5?')).result;
 for(const [result,label,timestamp] of [[doc,'OFFICIAL RULES',false],[hybrid,'LIVE LMS + OFFICIAL RULES',true],[{kind:'answer',answer:'fixture',sources:[],live:{operation:'SELF_RATING',checkedAt:new Date().toISOString()}},'LIVE LMS DATA',true]]){
 const html=renderToStaticMarkup(React.createElement(Exchange,{entry:{question:'fixture',result}}));assert.ok(html.includes(label));assert.equal(html.includes('Current as of'),timestamp);if(!timestamp)assert.equal(html.includes('LIVE LMS DATA'),false);
 }
});

import {toPlayerAnswerResult} from '../app/lib/askLwrPlayerAnswer.js';
import {qualityOutcome} from '../app/lib/aiQualitySnapshots.js';
import {candidates} from './helpers/eligibilityFixture.mjs';
process.env.AI_QUALITY_HMAC_KEY='local-badge-fixture-only';
const documentControls=['When is my Season DUPR established?','When is my Season DUPR locked?','Can my Season DUPR change during the season?','When can I start entering my roster?',"When does the Women's Weekday DUPR League start?",'What date is age based on for PrimeTime?','Does the Weekday DUPR League use Rally Scoring?','How does Rally Scoring work?'];
function officialFixture(documentType='league_rules') {const source={...candidates.find(c=>c.documentType==='league_rules'&&c.pageNumber===3),documentType};return {answer:'Synthetic prose for classification only.',evidenceSufficient:true,conflict:{requiresClarification:false},model:'offline-fixture',sources:[source],selectedEvidence:[source]};}
function adapted(answer,question='fixture'){return toPlayerAnswerResult(answer,principal.user.id,{originalQuestion:question,effectiveQuestion:question,answerId:'10000000-0000-4000-8000-000000000800'});}
function outcome(answer,result){return qualityOutcome({id:'10000000-0000-4000-8000-000000000800',origin:'player_interface',started:1000,completed:1001,execution:{answer,result}});}
for(const question of documentControls)test('Actual document adapter, serialization, render and telemetry parity: '+question,()=>{
 assert.equal(eligibilityIntent(question),null);assert.equal(liveIntent(question),null);
 const answer=officialFixture(), result=JSON.parse(JSON.stringify(adapted(answer,question)));
 assert.equal(result.provenance.mode,'DOCUMENT_ONLY');assert.equal(result.provenance.liveConsulted,false);
 assert.equal(resultSourceFamily(result),outcome(answer,result).source_family);
 assert.equal(resultSourcePresentation(result).label,'OFFICIAL RULES');assert.equal(viewAsSourceFamily(result),'document');
 const html=renderToStaticMarkup(React.createElement(Exchange,{entry:{question,result}}));
 assert.ok(html.includes('>OFFICIAL RULES<'));assert.ok(html.includes('Official Source'));assert.ok(result.sources[0].officialDocumentUrl);assert.equal(result.sources[0].citation,String(answer.sources[0].citation||answer.sources[0].documentTitle));assert.equal(html.includes('LIVE LMS'),false);
});
for(const family of ['league_rules','usap_rulebook','important_dates','approved_answer'])test('Trusted document processing family '+family,()=>{
 const answer=officialFixture(family),result=adapted(answer);
 assert.equal(resultSourceFamily(result),outcome(answer,result).source_family);
 assert.equal(resultSourcePresentation(result).label,'OFFICIAL RULES');
 // Citations and answer text cannot create or remove the processing badge.
 assert.equal(resultSourcePresentation({...result,sources:[],answer:'my private roster'}).label,'OFFICIAL RULES');
 assert.equal(resultSourcePresentation({kind:'answer',sources:answer.sources,answer:'official rules'}),null);
});
test('Mixed official document families retain telemetry distinction and document badge',()=>{const answer=officialFixture();answer.selectedEvidence.push({...answer.selectedEvidence[0],documentType:'usap_rulebook'});const result=adapted(answer);assert.equal(resultSourceFamily(result),'mixed');assert.equal(outcome(answer,result).source_family,'mixed');assert.equal(resultSourcePresentation(result).label,'OFFICIAL RULES');});
for(const kind of ['insufficient_evidence','conflict'])test('Non-success document processing has no successful source badge: '+kind,()=>{const answer=officialFixture();if(kind==='conflict')answer.conflict.requiresClarification=true;else answer.evidenceSufficient=false;assert.equal(resultSourcePresentation(adapted(answer)),null);});
test('Manager document response propagates identical trusted provenance',()=>{const route=fs.readFileSync(new URL('../app/api/ai-assistant/answer/route.js',import.meta.url),'utf8');assert.match(route,/response: \{\s+provenance: documentProvenance\(answer\)/);const answer=officialFixture();const response=JSON.parse(JSON.stringify({answer,provenance:documentProvenance(answer)}));assert.equal(resultSourcePresentation(response).label,resultSourcePresentation(adapted(answer)).label);const ui=fs.readFileSync(new URL('../app/ai-assistant/console/page.js',import.meta.url),'utf8');assert.match(ui,/resultSourcePresentation\(result\)/);assert.doesNotMatch(ui,/title="LIVE LMS DATA"/);});
test('Live roster stays Live even with arbitrary prose or source citations',()=>{const result={kind:'answer',answer:'official policy',sources:[{}],live:{operation:'TEAM_ROSTER'}};assert.equal(resultSourcePresentation(result).label,'LIVE LMS DATA');assert.equal(resultSourceFamily(result),'LIVE_LMS_DATA');});

test('Actual manager renderer handles policy eligibility, hybrid and Live without legacy document fields',async()=>{
 const src=fs.readFileSync(new URL('../app/ai-assistant/console/page.js',import.meta.url),'utf8');const part=src.slice(src.indexOf('function Diagnostics('),src.indexOf('function Chunks('));const js=ts.transpileModule(part,{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const Diagnostics=new Function('React','resultSourcePresentation','Panel',js+';return Diagnostics;')(React,resultSourcePresentation,({title,children})=>React.createElement('section',null,React.createElement('h2',null,title),children));
 for(const q of ['What are the requirements for DUPR5?','Can I play on a DUPR5 team?']){const {result}=await run(q);const manager={...result,answer:{answer:result.answer,sources:result.sources}};const html=renderToStaticMarkup(React.createElement(Diagnostics,{result:manager}));assert.ok(html.includes(resultSourcePresentation(result).label));assert.equal(html.includes('Current as of'),!!result.live);}
});

