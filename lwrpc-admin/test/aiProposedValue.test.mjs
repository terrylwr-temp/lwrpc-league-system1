import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateVerification,verificationCandidates,validateComparison} from '../app/lib/aiProposedValue.js';
import {validateQueryPlan,retainSemanticRetrieval,assistSemanticRetrieval} from '../app/lib/aiSemanticRetrieval.js';
import {selectSemanticEvidence,assessSemanticEvidence} from '../app/lib/aiSemanticEvidence.js';

const candidate=(content,id='club',type='captain_guide',score=.41)=>({chunkId:id,documentId:'doc',documentVersionId:'active',documentTitle:'Official Club Guide',documentType:type,documentAuthorityRank:type==='league_rules'?1:3,content,combinedScore:score});
const verification=(subject,proposedValue)=>({subject,proposedValue,scope:'club_operation',subjectQueries:[subject+' official assignment']});
const plan=(question,v)=>({intent:'verification',factType:v.subject,entities:[v.proposedValue],nouns:[],concepts:[],normalizedQuestion:question,queries:[],rescueQueries:[],documentAffinities:['captain_guide'],verification:v});
const fixtures=[
 ['Are we going to use the Lifetime ball?','match ball','Lifetime','Franklin Outdoor X-40','The club will provide Franklin Outdoor X-40 balls for every match.','contradicts'],
 ['Are we using Franklin balls?','match ball','Franklin','Franklin','The club will provide Franklin balls for every match.','matches'],
 ['Is the match ball an X-40?','match ball model','X-40','X-40','The assigned match ball is the X-40 model for this season.','matches'],
 ['Do we play the Picklebreaker to 25?','tiebreak game target','25','25','The designated tiebreak game is played to 25, win by two.','matches'],
 ['Is registration due on October 3?','registration deadline','October 3','October 4','Registration is due on October 4 for this season.','contradicts'],
 ['Is registration due on October 4?','registration deadline','October 4','October 4','Registration is due on October 4 for this season.','matches'],
 ['Are there 9 players per team?','team player count','9','12','Each team fields 12 players for the match.','contradicts'],
 ['Are there 12 players per team?','team player count','12','12','Each team fields 12 players for the match.','matches'],
];
for(const [question,subject,proposed,value,content,relation] of fixtures)test(`proposed-value evidence contract: ${question}`,async()=>{
 const v=verification(subject,proposed),c=candidate(content);
 assert.equal(validateQueryPlan(plan(question,v),question,[{type:'captain_guide'}]).verification.proposedValue,proposed);
 const r={request:{question},candidates:[c],evidence:{threshold:.35},queryUnderstanding:{plan:{verification:v}}};
 const result=await selectSemanticEvidence(r,{qualifies:c=>c.combinedScore>=.35,assess:async input=>{
  assert.equal(input.verification.subject,subject);
  return {supported:true,chunkIds:['club'],reason:'Affirmative assignment',comparison:{relation,chunkId:'club',quote:content,documentedValue:value}};
 }});
 assert.equal(result.selected[0].chunkId,'club');assert.equal(result.diagnostic.comparison.relation,relation);
});

test('subject searches omit only proposed value and retain named scope',()=>{
 const q='Is Saturday registration due on October 3?',v=verification('registration deadline','October 3');
 v.subjectQueries=['registration deadline','Saturday registration deadline','Saturday October 3'];
 assert.deepEqual(validateVerification(v,q,['Saturday','October 3']).subjectQueries,['Saturday registration deadline']);
 assert.throws(()=>validateVerification({...v,proposedValue:'invented'},q,[]),/INVALID_VERIFICATION/);
 assert.throws(()=>validateVerification({...v,subjectQueries:['registration deadline']},q,['Saturday']),/NO_SUBJECT_QUERY/);
});
test('club candidate reservation prevents general rules from crowding out an assignment without suppressing USAP',()=>{
 const rows=Array.from({length:32},(_,i)=>candidate('General equipment permission',String(i),'usap_rulebook',.7));
 rows.push(candidate('The club assigns Acme equipment.'));
 const result=verificationCandidates(rows,verification('equipment','Other'),12);
 assert.equal(result.length,12);assert.equal(result[0].chunkId,'club');assert.equal(result[1].documentType,'usap_rulebook');
 assert.equal(verificationCandidates(rows,{scope:'governing_rule'},12)[0].chunkId,'0');
});
test('absence cannot establish a negative; invented quote/value/ID and unknown comparison fail closed',async()=>{
 const c=candidate('The club will publish equipment details later.'),v=verification('equipment','Acme');
 const r={request:{question:'Are we using Acme equipment?'},candidates:[c],evidence:{threshold:.35},queryUnderstanding:{plan:{verification:v}}};
 for(const comparison of [null,{relation:'unknown'}, {relation:'contradicts',chunkId:'club',quote:'We use Other equipment.',documentedValue:'Other'}, {relation:'contradicts',chunkId:'wrong',quote:c.content,documentedValue:'equipment'}, {relation:'contradicts',chunkId:'club',quote:c.content,documentedValue:'Other'}]){
  assert.equal(validateComparison(comparison,['club'],[c]),false);
  const result=await selectSemanticEvidence(r,{qualifies:()=>true,assess:async()=>({supported:true,chunkIds:['club'],comparison})});
  assert.deepEqual(result.selected,[]);assert.equal(result.diagnostic.reason,'UNSUPPORTED_VERIFICATION_COMPARISON');
 }
 const absent=await selectSemanticEvidence(r,{qualifies:()=>true,assess:async()=>({supported:false,chunkIds:[],comparison:{relation:'unknown'},reason:'No assignment'})});
 assert.deepEqual(absent.selected,[]);
});
test('verification still filters wrong league and below-threshold sources before assessment',async()=>{
 const r={request:{question:'Are Saturday games played to 30?'},candidates:[candidate('Saturday games are played to 25.','weak','league_rules',.2),{...candidate('PrimeTime League games are played to 15.','wrong','league_rules'),heading:'PrimeTime DUPR League'}],evidence:{threshold:.35},queryUnderstanding:{plan:{verification:verification('target','30')}}};
 const result=await selectSemanticEvidence(r,{qualifies:c=>c.combinedScore>=.35,assess:async()=>{throw Error('must not assess');}});
 assert.deepEqual(result.selected,[]);
});
test('subject retrieval actually executes without proposed value and records valid contradictory evidence',async()=>{
 const q='Are we going to use the Acme equipment?',v=verification('equipment assignment','Acme'),c=candidate('The club will provide Zenith equipment for each match.');
 const r={request:{question:q},candidates:[],suppliedEvidence:[],metrics:{totalMs:0,retrievalMs:0},evidence:{sufficient:false,threshold:.35}};const searches=[];
 retainSemanticRetrieval(r,{catalog:async()=>[{type:'captain_guide'}],plan:async()=>({plan:plan(q,v)}),search:async query=>{searches.push(query);return[c];},qualifies:c=>c.combinedScore>=.35,refresh:()=>{r.suppliedEvidence=r.candidates;r.evidence.sufficient=true;},assess:async()=>({supported:true,chunkIds:['club'],reason:'Different affirmative assignment',comparison:{relation:'contradicts',chunkId:'club',quote:c.content,documentedValue:'Zenith'}})});
 const selected=await assistSemanticRetrieval(r,()=>[]);
 assert.equal(selected[0].chunkId,'club');assert.ok(searches.every(q=>!q.includes('Acme')));assert.equal(r.request.question,q);
});
test('model contract explicitly requires affirmative contradictory evidence and exact current IDs',async()=>{
 const prior=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fixture';
 try{await assessSemanticEvidence({question:'Are we using Acme?',verification:verification('equipment','Acme'),candidates:[candidate('The club uses Zenith equipment.')],fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body);assert.match(body.instructions,/Never derive No from absence/);assert.match(body.instructions,/DIFFERENT value/);
  assert.ok(body.text.format.schema.required.includes('comparison'));assert.deepEqual(body.text.format.schema.properties.chunkIds.items.enum,['club']);
  return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({supported:false,chunkIds:[],reason:'No same-subject evidence',comparison:{relation:'unknown',chunkId:'',quote:'',documentedValue:''}})}]}]})};
 }});}finally{if(prior===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=prior;}
});
test('generalized implementation has no production brand, model, date or exact-question constants',async()=>{
 for(const file of ['aiProposedValue.js','aiSemanticRetrieval.js','aiSemanticEvidence.js'])assert.doesNotMatch(await readFile(new URL('../app/lib/'+file,import.meta.url),'utf8'),/Lifetime|Franklin|X-40|October 4|Picklebreaker/i);
});


test('an existing topical legacy selection cannot skip affirmative verification',async()=>{
 const q='Are we using Acme equipment?',v=verification('equipment assignment','Acme'),old=candidate('Equipment should be undamaged.','old'),correct=candidate('The club assigns Zenith equipment for each match.');
 const r={request:{question:q},candidates:[old],suppliedEvidence:[old],metrics:{totalMs:0,retrievalMs:0},evidence:{sufficient:true,threshold:.35}};let assessed=0;
 retainSemanticRetrieval(r,{catalog:async()=>[{type:'captain_guide'}],plan:async()=>({plan:plan(q,v)}),search:async()=>[correct],qualifies:c=>c.combinedScore>=.35,refresh:()=>{},assess:async()=>{assessed++;return {supported:true,chunkIds:['club'],comparison:{relation:'contradicts',chunkId:'club',quote:correct.content,documentedValue:'Zenith'}};}});
 const result=await assistSemanticRetrieval(r,()=>[old],[old]);
 assert.equal(assessed,1);assert.equal(result[0].chunkId,'club');
});

test('existing topical evidence with no assignment fails closed instead of becoming No',async()=>{
 const q='Are we using Acme equipment?',v=verification('equipment assignment','Acme'),c=candidate('Equipment should be undamaged.');
 const r={request:{question:q},candidates:[c],suppliedEvidence:[c],metrics:{totalMs:0,retrievalMs:0},evidence:{sufficient:true,threshold:.35}};
 retainSemanticRetrieval(r,{catalog:async()=>[{type:'captain_guide'}],plan:async()=>({plan:plan(q,v)}),search:async()=>[c],qualifies:()=>true,refresh:()=>{},assess:async()=>({supported:false,chunkIds:[],reason:'No assignment',comparison:{relation:'unknown'}})});
 assert.deepEqual(await assistSemanticRetrieval(r,()=>[c],[c]),[]);
});

test('a nonverification question retains validated legacy evidence without extra retrieval',async()=>{
 const q='Do the rules explain equipment?',c=candidate('Equipment is described in this guide.');
 const r={request:{question:q},candidates:[c],metrics:{totalMs:0,retrievalMs:0},evidence:{sufficient:true}};
 retainSemanticRetrieval(r,{catalog:async()=>[{type:'captain_guide'}],plan:async()=>({plan:{...plan(q,verification('equipment','equipment')),verification:null}}),search:async()=>{throw Error('unnecessary search');}});
 assert.deepEqual(await assistSemanticRetrieval(r,()=>[c],[c]),[c]);assert.equal(r.queryUnderstanding.rescueRan,false);
});

test('recognized policy rejection cannot be bypassed by verification or old selection',async()=>{
 const q='Is the Saturday schedule release date October 4?',v=verification('Saturday schedule release date','October 4'),c=candidate('The Saturday schedule release date is October 7.');
 const r={request:{question:q},candidates:[c],metrics:{totalMs:0,retrievalMs:0},evidence:{sufficient:true}};
 retainSemanticRetrieval(r,{catalog:async()=>[{type:'captain_guide'}],plan:async()=>({plan:plan(q,v)}),search:async()=>[c],qualifies:()=>true,refresh:()=>{},assess:async()=>{throw Error('must preserve policy rejection');}});
 assert.deepEqual(await assistSemanticRetrieval(r,()=>[],[c]),[]);
 assert.equal(r.queryUnderstanding.semanticEvidence,undefined);
});


test('nested proposed brand is optional but league scope cannot be erased',()=>{
 const v=verification('Saturday equipment assignment','Acme ball');
 v.subjectQueries=['Saturday equipment assignment'];
 assert.equal(validateVerification(v,'Are we using the Acme ball on Saturday?',['Acme']).subjectQueries.length,1);
 assert.throws(()=>validateVerification({...v,subjectQueries:['equipment assignment']},'Are we using the Acme ball on Saturday?',['Acme']),/NO_SUBJECT_QUERY/);
});

test('validated legacy context remains in bounded verification assessment beside continuation',async()=>{
 const context=candidate('Saturday League match rules and game sequence.','context','league_rules');
 const continuation=candidate('The deciding game is played to 25, win by two.','continuation','league_rules');
 const noise=Array.from({length:12},(_,i)=>candidate('Generic games have their own score targets.',String(i),'league_rules',.7));
 const r={request:{question:'Do Saturday games go to 15?'},candidates:[continuation,...noise,context],queryUnderstanding:{plan:{verification:verification('Saturday game target','15')}},evidence:{threshold:.35}};
 await selectSemanticEvidence(r,{qualifies:()=>true,preferredIds:['context'],assess:async({candidates})=>{assert.equal(candidates[0].chunkId,'context');assert.ok(candidates.some(c=>c.chunkId==='continuation'));return {supported:false,chunkIds:[]};}});
});
