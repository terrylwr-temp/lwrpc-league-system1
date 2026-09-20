import test from 'node:test';
import assert from 'node:assert/strict';

process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {selectAnswerEvidence,selectAnswerEvidenceWithAssistance}=await import('../app/lib/aiAnswerGeneration.js');
const {isMultiTeamMembershipQuestion,multiTeamMembershipPassages,sourceAlignedMembershipQuery}=await import('../app/lib/aiTeamMembership.js');

const rule={
  chunk_id:'rule-37',document_id:'rules',document_version_id:'active-ready',document_title:'Current League Rules',document_type:'league_rules',document_authority_rank:1,document_scope_kind:'all',page_number:3,rule_number:'3.6',
  content:'3.6. Captains should prioritize local players.\n3.7. Players are permitted to join or substitute for multiple community teams within the same community, provided that all League and DUPR rating regulations are adhered to.',
  semantic_score:.507,keyword_score:.028,exact_score:0,authority_score:.38,context_score:0,combined_score:.268,vector_rank:1,keyword_rank:2,exact_match:false,
};
const registration={
  chunk_id:'registration',document_id:'guide',document_version_id:'guide-ready',document_title:'Captain Guide',document_type:'captain_guide',document_authority_rank:3,document_scope_kind:'all',page_number:4,
  content:'If you need to register multiple teams, please complete the registration process separately for each team.',
  semantic_score:.442,keyword_score:0,exact_score:.85,authority_score:.824,context_score:0,combined_score:.419,vector_rank:7,keyword_rank:null,exact_match:true,
};
const aligned={...rule,semantic_score:.507,keyword_score:.1,exact_score:.85,authority_score:.85,combined_score:.465,vector_rank:1,keyword_rank:1,exact_match:true};
const generalRule={...rule,chunk_id:'rule-512',rule_number:'5',page_number:4,content:'5.1. Team Structure: A team roster may consist of any number of eligible players.\n5.1.2. A player may be listed on more than one team roster, provided the player independently satisfies all eligibility requirements applicable to each team, league, and division under these League Rules.',semantic_score:.46,keyword_score:.255,exact_score:.85,authority_score:.85,combined_score:.49};
const questions=[
  'Can we have players on multiple teams?',
  'Can I play on two teams?',
  'Are players limited to only one roster?',
  'Can a player be rostered on more than one team?',
  'Can someone play for two different teams?',
  'Can I join another team too?',
  'Am I allowed on multiple rosters?',
  'Are players limited to one team?',
];

function dbFor(alignedScore=.465){
  const calls=[];
  const db={rpc:async(name,args)=>{
    assert.equal(name,'search_ai_official_chunks');
    calls.push(args);
    return {data:args.p_query_text==='multiple community teams'?[registration,{...aligned,combined_score:alignedScore}]:[registration,rule],error:null};
  }};
  return {db,calls};
}

function currentDb(){
  const calls=[];
  return {calls,db:{rpc:async(name,args)=>{
    assert.equal(name,'search_ai_official_chunks');calls.push(args);
    return {data:args.p_query_text==='more than one team roster'?[generalRule,registration]:[registration,rule],error:null};
  }}};
}

test('normal semantic equivalents select the active rule passage with its same-community and rating conditions',async()=>{
  for(const question of questions){
    const {db,calls}=currentDb();let embeddings=0,plans=0;
    const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question},embedQuery:async()=>{embeddings++;return {embedding:Array(1536).fill(.01)};},planQuery:async()=>{plans++;throw Error('unexpected planner');}});
    const selected=await selectAnswerEvidenceWithAssistance(retrieval);
    assert.deepEqual(selected.map(c=>c.chunkId),['rule-512'],question);
    assert.match(selected[0].content,/5\.1\.2\. A player may be listed/);
    assert.match(selected[0].content,/each team, league, and division/);
    assert.doesNotMatch(selected[0].content,/5\.1\. Team Structure/);
    assert.equal(retrieval.queryUnderstanding.paths[1].kind,'concept_aligned');
    assert.equal(retrieval.queryUnderstanding.conceptAlignedQuery,'more than one team roster');
    assert.equal(embeddings,1);assert.equal(plans,0);
    assert.equal(calls.length,2);assert.equal(calls[0].p_query_embedding,calls[1].p_query_embedding);
  }
});

test('older active wording can use a phrase found in its own returned rule passage',async()=>{
  const {db,calls}=dbFor();
  const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question:questions[0]},embedQuery:async()=>({embedding:Array(1536).fill(.01)}),planQuery:async()=>{throw Error('unexpected planner');}});
  const selected=await selectAnswerEvidenceWithAssistance(retrieval);
  assert.deepEqual(selected.map(c=>c.chunkId),['rule-37']);
  assert.match(selected[0].content,/within the same community/);
  assert.equal(retrieval.queryUnderstanding.paths[1].kind,'concept_aligned');
  assert.equal(retrieval.queryUnderstanding.paths[2].kind,'source_aligned');
  assert.equal(calls.length,3);
});

test('same-community team membership selects the narrower community provision',async()=>{
  const communityRule={...rule,chunk_id:'community-rule',semantic_score:.67,keyword_score:.188,exact_score:.85,authority_score:.85,combined_score:.573,vector_rank:1,keyword_rank:1,exact_match:true};
  const db={rpc:async()=>({data:[communityRule,{...generalRule,combined_score:.23,exact_score:0,keyword_score:0}],error:null})};
  const question='Can a player join or substitute for multiple community teams within the same community?';
  const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question},embedQuery:async()=>({embedding:Array(1536).fill(.01)})});
  const selected=selectAnswerEvidence(retrieval);
  assert.deepEqual(selected.map(c=>c.chunkId),['community-rule']);
  assert.match(selected[0].content,/3\.7\. Players are permitted/);
  assert.match(selected[0].content,/within the same community/);
  assert.match(selected[0].content,/League and DUPR rating regulations/);
  assert.equal(retrieval.evidence.threshold,.35);
});

test('a failed concept query can still use an independently grounded source phrase',async()=>{
  const db={rpc:async(_name,args)=>args.p_query_text==='more than one team roster'?{error:{message:'transient search failure'}}:{data:args.p_query_text==='multiple community teams'?[aligned]:[registration,rule],error:null}};
  const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question:questions[0]},embedQuery:async()=>({embedding:Array(1536).fill(.01)}),planQuery:async()=>{throw Error('unexpected planner');}});
  const selected=await selectAnswerEvidenceWithAssistance(retrieval);
  assert.deepEqual(selected.map(c=>c.chunkId),['rule-37']);
  assert.equal(retrieval.queryUnderstanding.paths[1].status,'SEARCH_FAILED');
  assert.equal(retrieval.queryUnderstanding.paths[2].kind,'source_aligned');
});

test('source-aligned wording never qualifies a rule below the existing evidence threshold',async()=>{
  const {db}=dbFor(.34);
  const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question:questions[0]},embedQuery:async()=>({embedding:Array(1536).fill(.01)}),planQuery:async()=>{throw Error('planner unavailable');}});
  assert.deepEqual(await selectAnswerEvidenceWithAssistance(retrieval),[]);
  assert.equal(retrieval.evidence.threshold,.35);
});

test('nearby registration question and guide instructions do not become player-membership authority',()=>{
  assert.equal(isMultiTeamMembershipQuestion('How do I register two teams?'),false);
  assert.equal(isMultiTeamMembershipQuestion('Can I register multiple teams?'),false);
  assert.equal(isMultiTeamMembershipQuestion('Can I join a team in another community?'),false);
  assert.deepEqual(multiTeamMembershipPassages({...registration,documentType:'captain_guide'}),[]);
  assert.equal(sourceAlignedMembershipQuery([registration]),'');
});
