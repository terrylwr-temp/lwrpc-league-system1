import {questionIntent} from '../lwrpc-admin/app/lib/aiRequestIntent.js';
// Diagnosis only: executes existing pure classifiers/selectors, no network or database.
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {liveIntent} from '../lwrpc-admin/app/lib/liveLmsIntent.js';
import {officialQuestionConcept} from '../lwrpc-admin/app/lib/aiQuestionConcepts.js';
import {interpretQuestion} from '../lwrpc-admin/app/lib/aiQuestionInterpretation.js';
import {isUnsupportedOperationalQuestion} from '../lwrpc-admin/app/lib/askLwrPlayerAnswer.js';
import {selectConceptEvidence} from '../lwrpc-admin/app/lib/aiOfficialApplicability.js';
import {clarificationFromRetrieval} from '../lwrpc-admin/app/lib/aiConversation.js';
const groups=[
 ['roster_state','LIVE',[
 'Who is on my roster?','Show me my roster.','How many players are currently on my roster?','Who is on the Artisan Lakes roster?','Show the Artisan Lakes roster.','Which players are on our roster?']],
 ['roster_date','DOCUMENT',[
 'What date can I start entering my roster for weekday league','when can I start entering my players for my team','When can I start entering my roster?','What date can I start entering my roster for weekday league?','When can I add players?','When does roster entry open?','When can I start entering my PrimeTime players?','When can I start entering my Saturday roster?','When may I begin entering team players?','When can I build my roster?','When can I fill my roster?','When can I start my roster?','Can I add players to my roster yet?','When do we begin adding players to our team?','What date does player entry open for Weekday?','When can I start entering my rosterr for weekdy league?','when can i add plyers to my team','When can I enter players in the match lineup?']],
 ['roster_procedure','DOCUMENT',[
 'How do I enter players on my roster?','How do I add a player to my roster?','How can I update my roster?','Where do I go to build my team roster?','How do I enter match scores?']],
 ['scoring_applicability','DOCUMENT',[
 'Does the weekday dupr league use rally scoring','Does the Weekday DUPR League use Rally Scoring?','What scoring method does the Weekday League use?','Do regular Weekday games use Rally Scoring?','Does Weekday 9.1 use Rally Scoring?','Does the Weekday 9.1 Picklebreaker use Rally Scoring?','Is Weekday all rally?','Does the weekdy league use raly scoring?','Does Saturday use Rally Scoring?','Do regular Saturday games use Rally Scoring?','Does the Saturday Picklebreaker use Rally Scoring?','Does PrimeTime use Rally Scoring?','Do regular PrimeTime games use Rally Scoring?','Does the PrimeTime Picklebreaker use Rally Scoring?','Does Weekday 8.1 use Rally Scoring?']],
 ['scoring_mechanics','DOCUMENT',[
 'How does Rally Scoring work?','How does Rally Scoring work in a Picklebreaker?','Do I have to be serving to win with Rally Scoring?','What happens at 24 all in a game to 25 by 2?','When do scores freeze again?']],
 ['rating_state','LIVE',[
 "What's my DUPR",'What is my Season DUPR?','What is my PrimeTime Season DUPR?','What is my current official DUPR?']],
 ['rating_policy','DOCUMENT',[
 'When is Season DUPR established?','When is my Season DUPR established?','How is my Season DUPR calculated?','When are Season DUPR ratings recorded for Saturday?']],
 ['privacy_control','PROTECTED',[
 'Export all player emails','What is my password?','Did I save my lineup?','Am I currently eligible for this team?','Show my rating and tell me if I am eligible','What is my roster and when can I add players?']]
];
let i=0;const cases=groups.flatMap(([family,expectedRoute,questions])=>questions.map(question=>{const live=liveIntent(question),guard=isUnsupportedOperationalQuestion(question);const route=live?(live.intent==='UNSUPPORTED'?'PROTECTED':'LIVE'):guard?'PROTECTED':'DOCUMENT';return {id:`Q${String(++i).padStart(2,'0')}`,family,question,expectedRoute,expectedScope:/weekday|weekdy/i.test(question)?'Weekday':/saturday/i.test(question)?'Saturday':/primetime/i.test(question)?'PrimeTime':'unspecified',baseline:{semantic:questionIntent(question),liveIntent:live,documentGuardIfReached:guard,route,routeMatches:route===expectedRoute,concept:officialQuestionConcept(question),interpretation:interpretQuestion(question)}}}));
const source=JSON.parse(fs.readFileSync(new URL('./lms-0725-official-evidence.json',import.meta.url)));
const candidates=source.evidence.map(e=>({chunkId:e.id,documentId:e.document.id,documentVersionId:e.document_version_id,documentTitle:e.document.title,documentType:e.document.document_type,documentAuthorityRank:e.document.authority_rank,content:e.content,pageNumber:e.page_number,ruleNumber:e.rule_number,heading:e.heading,sectionLabel:e.section_label,combinedScore:.8,structuralContext:[]}));
const mechanics=candidates.find(c=>c.chunkId==='dd088f2f-6f6d-4deb-b4d9-66369e51f29b');
const probe=selectConceptEvidence({request:{question:'Does the weekday dupr league use rally scoring'},evidence:{threshold:.35,sufficient:true},candidates:[mechanics],authorityReviewCandidates:[mechanics]});
const clarification=clarificationFromRetrieval({kind:'resolved',rawQuestion:'When can I start entering my roster?',effectiveQuestion:'When can I start entering my roster?'},{candidates,policyEvidence:{status:'complete',candidates}});
for(let r=0;r<100;r++)for(const c of cases)liveIntent(c.question);
const samples=[];for(let r=0;r<1000;r++){const t=performance.now();for(const c of cases)liveIntent(c.question);samples.push((performance.now()-t)/cases.length)}samples.sort((a,b)=>a-b);
const report={recordedAt:new Date().toISOString(),method:'Post-implementation local classifier and selector execution against the diagnosis benchmark and official evidence snapshot. No SQL, network, provider calls, API route replay or production writes. This is not live end-to-end execution.',summary:{cases:cases.length,routeMatches:cases.filter(c=>c.baseline.routeMatches).length,routeMismatches:cases.filter(c=>!c.baseline.routeMatches).length},timing:{method:'100 warmup batches;1000 timed batches;per-question average within each batch, not request latency',batchMeanPerQuestionMedianMs:samples[500],batchMeanPerQuestionP95Ms:samples[950],addedOverhead:'Local routing CPU compared with lms-0725-before.json; production request timing deferred'},mechanicsOnlyCounterfactual:{method:'Actual current selector; actual active source text; artificial .8 score above .35 threshold; only mechanics candidate supplied. NOT observed Stage 3 rankings or model output.',selected:probe?.map(c=>({chunkId:c.chunkId,evidenceSelectionReason:c.evidenceSelectionReason,content:c.content}))},equalDatesCounterfactual:{method:'Actual post-retrieval clarification with inspected current source candidates and artificial .8 scores; not production retrieval',clarification},cases};
fs.writeFileSync(new URL('./lms-0725-implementation-benchmark.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,timing:report.timing,mechanicsSelected:probe?.length,equalDatesClarification:clarification?.clarification,mismatches:cases.filter(c=>!c.baseline.routeMatches).map(c=>({id:c.id,q:c.question,actual:c.baseline.route,expected:c.expectedRoute}))},null,2));
