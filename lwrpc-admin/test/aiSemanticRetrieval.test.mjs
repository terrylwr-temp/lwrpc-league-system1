import test from 'node:test';
import assert from 'node:assert/strict';
import {retainSemanticRetrieval,assistSemanticRetrieval,rankSemanticCandidates,validateQueryPlan,createSemanticQueryPlan} from '../app/lib/aiSemanticRetrieval.js';
import {selectAnswerEvidence,selectAnswerEvidenceWithAssistance} from '../app/lib/aiAnswerGeneration.js';
import {evaluateEvidence} from '../app/lib/aiRetrieval.js';
import {readFile} from 'node:fs/promises';
import {selectSemanticEvidence,assessSemanticEvidence} from '../app/lib/aiSemanticEvidence.js';

const documents=[{id:'dates',title:'2026 Fall League Important Dates',type:'league_supplement',activeVersionId:'v1'}];
function chunk(league='PrimeTime') {
  const heading=`${league} DUPR League Key Dates`;
  return {chunkId:league,documentId:'dates',documentVersionId:'v1',documentTitle:documents[0].title,documentType:'league_supplement',documentAuthorityRank:2,heading,sectionLabel:heading,chunkOrdinal:1,pageNumber:2,semanticScore:.64,keywordScore:.95,exactScore:.85,combinedScore:.7566,
    content:`${heading}\n• Sept. 7, Monday – Open Registration\n• Oct. 4, Sunday – Last day to register (4 weeks)\n• Oct. 7, Wednesday – Schedules completed and sent\n• Oct. 16 - ${league} League Starts\n• Dec. 4 - ${league} League Regular Season Ends\n• Dec. 11 - ${league} League Championship Day`};
}
function policyDb(chunks) {
  return {from(table){
    const filters={};
    const query={select(){return query;},eq(k,v){filters[k]=v;return query;},order(){return query;},limit(){return query;},abortSignal(){return query;},then(resolve){
      if(table==='ai_documents')return Promise.resolve({data:[{id:'dates',title:documents[0].title,document_type:'league_supplement',authority_rank:2,active_version_id:'v1'}]}).then(resolve);
      assert.equal(filters.is_searchable,true);assert.equal(filters.document_version_id,'v1');
      return Promise.resolve({data:chunks.map(c=>({id:c.chunkId,document_version_id:'v1',chunk_ordinal:c.chunkOrdinal,page_number:c.pageNumber,heading:c.heading,section_label:c.sectionLabel,content:c.content}))}).then(resolve);
    }};return query;
  }};
}
function plan(normalizedQuestion,entity='PrimeTime') {
  return {intent:'calendar event timing',factType:'date',entities:[entity],nouns:['event'],concepts:['event timing'],normalizedQuestion,queries:[`${entity} event date`],rescueQueries:[`${entity} timeline event`,`${entity} calendar`],documentAffinities:['league_supplement']};
}
function setup(question,p,rows=[chunk()],options={}) {
  const r={request:{question,askAbout:'all',context:{userRole:'captain'}},candidates:[...rows],suppliedEvidence:[...rows],authorityReviewCandidates:[...rows],metrics:{totalMs:0,retrievalMs:0},evidence:evaluateEvidence(rows,.35)};
  const calls=[];
  retainSemanticRetrieval(r,{supabase:policyDb(options.policyRows||rows),assess:options.assess|| (async()=>({supported:false,chunkIds:[],reason:'No fixture support'})),catalog:async()=>documents,plan:options.plan|| (async()=>({plan:p,usage:{input_tokens:30,output_tokens:20}})),search:async q=>{calls.push(q);return options.search?options.search(q):rows;},qualifies:c=>evaluateEvidence([c],.35).sufficient,refresh:()=>{r.suppliedEvidence=r.candidates.slice(0,8);r.authorityReviewCandidates=r.candidates.slice(0,12);r.evidence=evaluateEvidence(r.suppliedEvidence,.35);}});
  return {r,calls};
}

const cases=[
 ['when does the primetime league get their schedules','When are primetime league schedules released?','primetime','Schedules completed and sent'],
 ['when will PrimeTime schedules be sent out','When are PrimeTime schedules released?','PrimeTime','Schedules completed and sent'],
 ['what date are the PrimeTime schedules available','When are PrimeTime schedules released?','PrimeTime','Schedules completed and sent'],
 ['when do captains get the PrimeTime schedule','When are PrimeTime schedules released?','PrimeTime','Schedules completed and sent'],
 ['What is the Weekday sign-up opening date?','When does Weekday league registration open?','Weekday','Open Registration'],
 ['What is the last chance to sign up for the Saturday league?','When does Saturday league registration close?','Saturday','Last day to register'],
 ['When does the Weekday competition kick off?','When does the Weekday league season start?','Weekday','League Starts'],
 ['When does the Saturday regular competition wrap up?','When does the Saturday league regular season end?','Saturday','Regular Season Ends'],
 ['When is the Weekday title decider?','When is the Weekday league championship?','Weekday','Championship Day'],
];
for(const [question,normalized,entity,expected] of cases)test(`generated interpretation uses official evidence: ${question}`,async()=>{
  const rows=[chunk(entity.toLowerCase()==='primetime'?'PrimeTime':entity)];
  const {r}=setup(question,plan(normalized,entity),rows);
  const original=structuredClone(r.request);
  const selected=await selectAnswerEvidenceWithAssistance(r);
  assert.equal(selected.length,1,JSON.stringify(r.queryUnderstanding));
  assert.match(selected[0].content,new RegExp(expected));
  assert.deepEqual(r.request,original);assert.equal(r.queryUnderstanding.fallbackReason,null);
  assert.equal(selected[0].excerptItems[0].scopeBindings[0].chunkId,rows[0].chunkId);
});

test('exact reproduction retrieves correct rank one but legacy applicability rejects it',()=>{
  const {r}=setup(cases[0][0],plan(cases[0][1],'primetime'));
  assert.equal(r.evidence.sufficient,true);assert.equal(r.candidates[0].combinedScore,.7566);
  assert.deepEqual(selectAnswerEvidence(r),[]);
});
test('rescue can recover a candidate absent from the original and expanded searches',async()=>{
  const p=plan('When are PrimeTime schedules released?');
  const {r,calls}=setup('When does PrimeTime get the schedules?',p,[],{policyRows:[chunk()],search:q=>q===p.rescueQueries[0]?[chunk()]:[]});
  const selected=await assistSemanticRetrieval(r,selectAnswerEvidence);
  assert.equal(selected.length,1);assert.equal(r.queryUnderstanding.rescueRan,true);assert.equal(calls.length,4);
});
test('rescue remains bounded and preserves the evidence threshold',async()=>{
  const weak={...chunk(),combinedScore:.34};
  const {r,calls}=setup('When does PrimeTime get the schedules?',plan('When are PrimeTime schedules released?'),[weak]);
  assert.deepEqual(await assistSemanticRetrieval(r,selectAnswerEvidence),[]);
  assert.equal(calls.length,4);assert.equal(r.queryUnderstanding.fallbackReason,'NO_QUALIFYING_EVIDENCE_AFTER_RESCUE');
  assert.deepEqual(await assistSemanticRetrieval(r,selectAnswerEvidence),[]);assert.equal(calls.length,4);
});
test('affinity is soft, dedup keeps strongest raw score, and cannot qualify weak evidence',()=>{
  const qualifies=c=>evaluateEvidence([c],.35).sufficient;
  const weak={...chunk(),combinedScore:.34};
  const strong={...chunk(),chunkId:'rules',documentType:'league_rules',combinedScore:.36};
  const ranked=rankSemanticCandidates([weak,strong,{...weak,combinedScore:.30}],plan('When are PrimeTime schedules released?'),qualifies);
  assert.equal(ranked.length,2);assert.equal(ranked[0].chunkId,'rules');assert.equal(ranked[1].combinedScore,.34);assert.equal(ranked[1].affinityBoost,0);
});
test('invalid interpretation fails closed without searching or leaking provider errors',async()=>{
  const {r,calls}=setup('When does PrimeTime get schedules?',plan('When are Saturday schedules released?'));
  assert.deepEqual(await assistSemanticRetrieval(r,selectAnswerEvidence),[]);assert.equal(calls.length,0);
  assert.equal(r.queryUnderstanding.fallbackReason,'QUERY_PLAN_DROPPED_CONSTRAINT');
  const failed=setup('unknown question',null,[],{plan:async()=>{throw Error('secret provider detail');}});
  await assistSemanticRetrieval(failed.r,selectAnswerEvidence);
  assert.equal(failed.r.queryUnderstanding.fallbackReason,'SEMANTIC_RETRIEVAL_UNAVAILABLE');
  assert.doesNotMatch(JSON.stringify(failed.r),/secret provider/);
});
test('keeps explicit numbers, negation, personal references and deterministic league scope',()=>{
  for(const [q,normalized] of [['When does PrimeTime 2027 start?','When does PrimeTime start?'],['Can my PrimeTime team not play?','Can PrimeTime teams play?'],['When does PrimeTime start?','When does PrimeTime and Saturday start?']]){
    assert.throws(()=>validateQueryPlan(plan(normalized),q,documents),/QUERY_PLAN_/);
  }
});
test('successful established selection skips planner entirely',async()=>{
  let planned=false;
  const {r}=setup('When are PrimeTime schedules released?',plan('When are PrimeTime schedules released?'),[chunk()],{plan:async()=>{planned=true;throw Error('must not run');}});
  r.policyEvidence={status:'complete',candidates:[chunk()]};
  assert.equal((await selectAnswerEvidenceWithAssistance(r)).length,1);assert.equal(planned,false);
});
test('planner uses strict structured output, bounded timeout, no persistence or source answers',async()=>{
  const prior=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fixture';
  try{
    const output=await createSemanticQueryPlan({question:cases[0][0],documents,fetchImpl:async(url,options)=>{
      const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.ok(options.signal);assert.match(body.instructions,/NEVER an answer/);
      return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(plan(cases[0][1],'primetime'))}]}],usage:{input_tokens:12}})};
    }});
    assert.equal(output.plan.normalizedQuestion,cases[0][1]);
  }finally{if(prior===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=prior;}
});
test('implementation contains no production example-specific phrasing',async()=>{
  const source=await readFile(new URL('../app/lib/aiSemanticRetrieval.js',import.meta.url),'utf8');
  assert.doesNotMatch(source,/primetime|captains get|schedules sent|Oct\. 7|schedule_release/i);
});
test('unrecognized paraphrase can select evidence without matching a fixed intent phrase',async()=>{
  const q='When does PrimeTime receive its fixture list?';
  const {r}=setup(q,plan('When does PrimeTime receive its fixture list?'),[chunk()],{assess:async({question,candidates})=>{
    assert.equal(question,q);assert.match(candidates[0].content,/Schedules completed and sent/);
    return {supported:true,chunkIds:['PrimeTime'],reason:'The fixture list distribution date is explicitly present.'};
  }});
  const selected=await selectAnswerEvidenceWithAssistance(r);
  assert.equal(selected.length,1);assert.equal(selected[0].chunkId,'PrimeTime');
  assert.equal(r.queryUnderstanding.rescueRan,true);assert.ok(r.queryUnderstanding.semanticEvidence);
});
test('semantic relevance rejects invented IDs and does not receive another league or weak evidence',async()=>{
  const {r}=setup('When does PrimeTime receive its fixture list?',null,[chunk(),chunk('Saturday'),{...chunk(),chunkId:'weak',combinedScore:.2}]);
  const result=await selectSemanticEvidence(r,{qualifies:c=>evaluateEvidence([c],.35).sufficient,assess:async({candidates})=>{
    assert.deepEqual(candidates.map(c=>c.chunkId),['PrimeTime']);
    return {supported:true,chunkIds:['invented'],reason:'fixture'};
  }});
  assert.deepEqual(result.selected,[]);assert.equal(result.diagnostic.reason,'INVALID_EVIDENCE_IDS');
});
test('one bounded retry repairs invalid IDs without discarding valid evidence',async()=>{
 const {r}=setup('When does PrimeTime receive its fixture list?',null,[chunk()]);let calls=0;
 const result=await selectSemanticEvidence(r,{qualifies:()=>true,assess:async({candidates,repairReason})=>{
  calls++;assert.deepEqual(candidates.map(c=>c.chunkId),['PrimeTime']);
  if(calls===1)return {supported:true,chunkIds:['stale-id'],reason:'test'};
  assert.equal(repairReason,'UNKNOWN_IDS');return {supported:true,chunkIds:['PrimeTime'],reason:'Valid supplied source'};
 }});
 assert.equal(calls,2);assert.equal(result.selected[0].chunkId,'PrimeTime');assert.equal(result.diagnostic.attempts[0].rejection,'UNKNOWN_IDS');
});
test('provider schema enumerates exact candidate IDs and bounds selection size',async()=>{
 const prior=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='fixture';
 try{await assessSemanticEvidence({question:'fixture',candidates:[chunk()],fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body),ids=body.text.format.schema.properties.chunkIds;
  assert.deepEqual(ids.items.enum,['PrimeTime']);assert.equal(ids.maxItems,4);
  return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({supported:true,chunkIds:['PrimeTime'],reason:'fixture'})}]}]})};
 }});}finally{if(prior===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=prior;}
});
test('rescue diagnostics count actual searches and their returned and selected evidence',async()=>{
 const p=plan('When are PrimeTime schedules released?');
 const {r}=setup('When does PrimeTime get schedules?',p,[],{policyRows:[chunk()],search:q=>q===p.rescueQueries[0]?[chunk()]:[]});
 await assistSemanticRetrieval(r,selectAnswerEvidence);
 assert.deepEqual(r.queryUnderstanding.rescue,{considered:true,triggered:true,queriesExecuted:2,candidatesReturned:1,evidenceSelected:true,selectedCandidateIds:['PrimeTime']});
});
test('rescue considered with no query is not reported as executed',async()=>{
 const q='unknown';const p={...plan(q),entities:[],nouns:[],concepts:[],queries:[],rescueQueries:[]};
 const {r}=setup(q,p,[]);await assistSemanticRetrieval(r,()=>[]);
 assert.equal(r.queryUnderstanding.rescue.triggered,true);assert.equal(r.queryUnderstanding.rescueRan,false);assert.equal(r.queryUnderstanding.rescue.queriesExecuted,0);
});
for(const executed of [false,true])test(`rescue failure records whether the query executed: ${executed}`,async()=>{
 const {r}=setup('When does PrimeTime get schedules?',plan('When are PrimeTime schedules released?'),[],{search:async()=>{const e=Error('failure');e.queryExecuted=executed;throw e;}});
 await assistSemanticRetrieval(r,()=>[]);
 assert.equal(r.queryUnderstanding.rescue.queriesExecuted,executed?2:0);
 assert.equal(r.queryUnderstanding.rescueRan,executed);
 assert.equal(r.queryUnderstanding.rescue.candidatesReturned,0);assert.equal(r.queryUnderstanding.rescue.evidenceSelected,false);
});
