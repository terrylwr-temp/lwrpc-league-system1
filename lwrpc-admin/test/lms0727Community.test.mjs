import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questionIntent} from '../app/lib/aiRequestIntent.js';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
import {eligibilityIntent} from '../app/lib/aiEligibilityIntent.js';
import {selectAnswerEvidence,generateOfficialAnswer} from '../app/lib/aiAnswerGeneration.js';
import {completePolicyEvidence} from '../app/lib/aiPolicyEvidence.js';
import {revalidateExcerptItems} from '../app/lib/aiEvidenceExcerpts.js';
import {documentProvenance,resultSourcePresentation} from '../app/lib/aiResultSource.js';
import {runPlayerOfficialAnswer,isUnsupportedOperationalQuestion} from '../app/lib/askLwrPlayerAnswer.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='0727-local-receipt-only';
const candidates=JSON.parse(fs.readFileSync(new URL('./fixtures/lms0727-community-source.json',import.meta.url)));
export const questions=[
'Can I play on a team in a different community?',
'Can I play in a different community?',
'Can I play for another community?',
"Can I join another community's team?",
'Can players from different communities be on the same team?',
'Do I have to play for my own community?',
'Are cross-community teams allowed?',
"My community doesn't have a team in my division. Can I play for another community?",
"My community has a team but it's full. Can I play for another community?",
'My community has a team in my division and has room. Can I play for another community?',
'My community has a team in another division. Can I play elsewhere in my division?',
'What are the rules for cross-community teams?',
"Can I play on another community's team?",
"My community doesn't have a DUPR7 team. Can I play for another community?",
'Can players play on teams in other communities?',
'Do you have to play for your own community?',
'Can I play for another community if mine has a team?',
"What if my community's team is full?",
'My community has a Saturday DUPR7 team. Can I play for another community in Weekday DUPR8?',
];
const make=(q=questions[0],cs=candidates)=>({request:{question:q},candidates:[],suppliedEvidence:[],authorityReviewCandidates:[],policyEvidence:{status:'complete',candidates:structuredClone(cs).map(c=>({...c,structuralCompletion:true}))},evidence:{sufficient:false,threshold:.35},metrics:{}});
for(const q of questions)test('0727 policy routing and exact evidence: '+q,async()=>{
 assert.equal(questionIntent(q).object,'community_participation');assert.equal(liveIntent(q),null);assert.equal(eligibilityIntent(q),null);assert.equal(isUnsupportedOperationalQuestion(q),false);
 const r=make(q),s=selectAnswerEvidence(r);assert.equal(s.length,1);assert.equal(s[0].chunkId,candidates[0].chunkId);assert.match(s[0].content,/^3\.5\./);assert.match(s[0].content,/division and has roster availability/);
 const x=revalidateExcerptItems(s[0],{content:candidates[0].content,page_number:2,rule_number:'3'},new Map());assert.equal(x[0].ruleNumber,'3.5');assert.equal(x[0].pageNumber,2);
 assert.equal(resultSourcePresentation({provenance:documentProvenance({evidenceSufficient:true,selectedEvidence:s})}).label,'OFFICIAL RULES');assert.equal(r.policyDiagnostic.intent,'community_policy');
 const result=await runPlayerOfficialAnswer({body:{question:q},userId:'11111111-1111-4111-8111-111111111111',role:'player',retrieveOfficialEvidence:async()=>make(q),generateOfficialAnswer:async()=>({answer:'Fixture policy response',evidenceSufficient:true,selectedEvidence:s,sources:s.map(c=>({...c,officialDocumentUrl:'/fixture'}))})});assert.equal(result.result.kind,'answer');
});
test('0727 separate live and division eligibility remain separate',()=>{
 assert.equal(liveIntent('What team am I on?').intent,'SELF_TEAM');assert.equal(eligibilityIntent('Can I play on a DUPR5 team?').kind,'personal_eligibility');
 for(const q of ['Where is my community playing location?','What community am I registered with?','Show my rating and cross-community rules','Can I play a point?'])assert.notEqual(questionIntent(q).object,'community_participation');
});
test('0727 missing conjunction, conflicting candidates, changed exact source fail closed',()=>{
 for(const content of [candidates[0].content.replace(' and has roster availability for additional players.','.'),'3.5. Players must always play for their own community.'])assert.deepEqual(selectAnswerEvidence(make(questions[0],[{...candidates[0],content}])),[]);
 assert.deepEqual(selectAnswerEvidence(make(questions[0],[...candidates,{...candidates[0],chunkId:'11111111-1111-4111-8111-111111111111'}])),[]);
 const s=selectAnswerEvidence(make())[0];assert.throws(()=>revalidateExcerptItems(s,{content:candidates[0].content.replace('availability','capacity')},new Map()));
});
test('0727 completion reads only active ready searchable document corpus',async()=>{
 const reads=[];const db={from(table){assert.ok(['ai_documents','ai_document_chunks'].includes(table));const filters=[];const query={select(){return this;},eq(...v){filters.push(v);return this;},order(){return this;},limit(){return this;},abortSignal(){return this;},then(resolve){reads.push({table,filters});return Promise.resolve({data:table==='ai_documents'?[{id:candidates[0].documentId,title:candidates[0].documentTitle,document_type:'league_rules',authority_rank:1,active_version_id:candidates[0].documentVersionId}]:[{id:candidates[0].chunkId,document_version_id:candidates[0].documentVersionId,content:candidates[0].content,heading:candidates[0].heading,rule_number:'3',page_number:2}]}).then(resolve);}};return query;}};
 const r=make();delete r.policyEvidence;await completePolicyEvidence(db,r);assert.equal(selectAnswerEvidence(r).length,1);assert.deepEqual(reads[0].filters,[['status','active'],['active_version.processing_status','ready']]);assert.deepEqual(reads[1].filters,[['document_version_id',candidates[0].documentVersionId],['is_searchable',true]]);
});
test('0727 generated request contains only exact policy/question, with conditional fact instructions',async()=>{
 process.env.OPENAI_API_KEY='offline-fixture';let calls=0;
 const result=await generateOfficialAnswer({retrieval:make(questions[9]),resolveSources:async(_,s)=>s.map(c=>({...c,officialDocumentUrl:'/local-fixture-source'})),fetchImpl:async(_,o)=>{calls++;const b=JSON.parse(o.body);assert.match(b.instructions,/explicitly user-supplied facts only as conditional premises/);assert.match(b.instructions,/another division or league cannot establish/);assert.match(b.instructions,/does NOT establish that there is no team/);assert.match(b.instructions,/do not invent a numerical definition/);assert.doesNotMatch(b.input[0].content,/3\.4\.|primary address|Commissioner|memberId/);return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Offline fixture',conflict:false})}]}]})};}});
 assert.equal(calls,1);assert.equal(result.evidenceSufficient,true);
});

test('0727 league-scoped distractor never becomes governing evidence for another league',()=>{
 const wrong={...candidates[0],heading:'Saturday DUPR League',scopeLeague:'saturday'};assert.deepEqual(selectAnswerEvidence(make('Can I play for another community in the Weekday League?',[wrong])),[]);
});
