import test from 'node:test';
import assert from 'node:assert/strict';
process.env.LWR_AI_ENABLED='true';
const {officialQuestionConcept}=await import('../app/lib/aiQuestionConcepts.js');
const {selectAnswerEvidence,selectAnswerEvidenceWithAssistance}=await import('../app/lib/aiAnswerGeneration.js');
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');

const usap = (chunkId, ruleNumber, heading, content, combinedScore) => ({
  chunkId, documentId:'usap-document', documentVersionId:'usap-version', documentTitle:'2026 USA Pickleball Official Rulebook',
  documentType:'usap_rulebook', documentAuthorityRank:20, ruleNumber, heading, content, combinedScore,
});
const contact=usap('contact','11.A.1','Fault – Non-Volley Zone Contact While Volleying','11.A.1 Fault – Non-Volley Zone Contact While Volleying. When a volleying player or anything that has contact with the volleying player contacts the non-volley zone, it is a fault against the player.',.49);
const opponent=usap('opponent','9.B.3','Calling Non-Volley Zone Faults on Opponent','9.B.3 Calling Non-Volley Zone Faults and Service Foot Faults on Opponent. Players may only call non-volley zone faults and service foot faults on an opponent.',.48);
const disagreement=usap('disagreement','9.B.3.b','Disagreement Between Teams','9.B.3.b Disagreement Between Teams. When there is any disagreement between teams about a fault call, the rally must be replayed.',.38);
const momentum=usap('momentum','11.A.2','Non-Volley Zone Momentum','11.A.2 Fault – Non-Volley Zone Momentum. When a volleying player’s momentum causes the player to contact the non-volley zone, it is a fault against the player.',.55);
const unrelated=usap('serve','7.E.2','Serve Lands in Non-Volley Zone','7.E.2 Fault – Serve Lands in Non-Volley Zone. When a served ball lands in the non-volley zone, it is a fault against the server.',.52);
const candidates=[momentum,unrelated,contact,opponent,...Array.from({length:9},(_,i)=>usap(`noise-${i}`,'20.A','Other fault',`20.A.${i} A different fault provision applies to another situation.`,.47-i*.005)),disagreement];
const retrieval=question=>({request:{question},candidates,authorityReviewCandidates:candidates.slice(0,12),suppliedEvidence:candidates.slice(0,8),evidence:{sufficient:true,threshold:.35}});
const ids=question=>selectAnswerEvidence(retrieval(question)).map(x=>x.chunkId);

test('exact reported kitchen-fault claim selects the complete active USAP procedure',()=>{
  const question='how do you treat a kitchen fault when the other team claims you were in the kitchen';
  assert.equal(officialQuestionConcept(question)?.kind,'nvz_fault_call');
  assert.deepEqual(ids(question),['contact','opponent','disagreement']);
});

test('obvious opponent-claim variants retrieve contact, call authority, and disagreement resolution',()=>{
  for(const question of [
    'The opposing team called a kitchen fault on me. What happens if we disagree?',
    'What do we do when our opponents claim an NVZ fault?',
    'How is a non-volley zone fault handled if the other team insists they saw it?',
    'My opponent says I committed a kitchen fault, but I disagree. What is the ruling?',
  ]) assert.deepEqual(ids(question),['contact','opponent','disagreement'],question);
});

test('nearby kitchen mechanics do not enter the opponent-claim intent',()=>{
  for(const question of ['Can I volley in the kitchen?','Can I stand in the kitchen when I am not volleying?','What is the non-volley zone?']) {
    assert.notEqual(officialQuestionConcept(question)?.kind,'nvz_fault_call',question);
  }
});

test('live-shaped retrieval uses one bounded intent embedding when the disagreement rule ranks below review',async()=>{
  const raw=c=>({chunk_id:c.chunkId,document_id:c.documentId,document_version_id:c.documentVersionId,document_title:c.documentTitle,document_type:c.documentType,document_authority_rank:c.documentAuthorityRank,document_scope_kind:'all',page_number:20,section_label:'Faults',heading:c.heading,rule_number:c.ruleNumber,content:c.content,semantic_score:c.combinedScore,keyword_score:.5,exact_score:.5,authority_score:.5,context_score:0,combined_score:c.combinedScore,vector_rank:1,keyword_rank:1,exact_match:false});
  let rpcCalls=0;const embeddings=[];
  const result=await retrieveOfficialEvidence({
    body:{question:'My opponent says I committed a kitchen fault, but I disagree. What is the ruling?'},
    embedQuery:async query=>{embeddings.push(query);return {embedding:Array(1536).fill(.01),inputTokens:5};},
    supabase:{rpc:async name=>{
      if(name!=='search_ai_official_chunks')return {data:[],error:null};
      rpcCalls++;
      return {data:(rpcCalls===1?[contact,opponent]:[contact,opponent,disagreement]).map(raw),error:null};
    }},
  });
  assert.deepEqual((await selectAnswerEvidenceWithAssistance(result)).map(x=>x.chunkId),['contact','opponent','disagreement']);
  assert.equal(rpcCalls,2);assert.equal(embeddings.length,2);
  assert.equal(embeddings[1],'non-volley zone fault opponent disagreement between teams');
  assert.deepEqual(result.conceptAssistance,{status:'completed',searchCount:1,additionalEmbeddingCalls:1,durationMs:result.conceptAssistance.durationMs});
});
