import {retainNonVerificationFixture} from '../scripts/ai-nonverification-test-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
process.env.LWR_AI_ENABLED='true';
const {officialQuestionConcept}=await import('../app/lib/aiQuestionConcepts.js');
const {selectAnswerEvidence,selectAnswerEvidenceWithAssistance}=await import('../app/lib/aiAnswerGeneration.js');
const {retrieveOfficialEvidence:retrieveOfficialEvidenceRaw}=await import('../app/lib/aiRetrieval.js');
const exact='can i switch my mix team partners to play the picklebreakers?';
const rule={chunkId:'partners',documentId:'rules',documentVersionId:'active',documentTitle:'DUPR League Rules',documentType:'league_rules',documentAuthorityRank:10,ruleNumber:'6.2.3',pageNumber:9,heading:'Match Day Format',combinedScore:.49,structuralContext:[{content:'6.2. Saturday DUPR League'}],content:'6.2.3.5. Picklebreaker™ Game (Only played if tie at the end of all previous rounds -\n12-12): Features all the mixed teams (same partners as the Mixed Round) that'};
const noise={...rule,chunkId:'other',ruleNumber:'18.G',documentType:'usap_rulebook',content:'18.G Partner Change (Doubles). Tournament partner changes.'};
const fixture=(question,candidates=[noise,rule])=>({request:{question},candidates,authorityReviewCandidates:candidates,suppliedEvidence:candidates,evidence:{sufficient:true,threshold:.35}});
for(const question of [exact,'Can we change mixed doubles partners for the Picklebreaker?','Do we have to keep the same partners for the Saturday Picklebreaker?','Can I swap partners to play the picklebreakers?','Can we use different partners in the Picklebreaker?']){
 test(`same-partner rule: ${question}`,()=>{
  assert.equal(officialQuestionConcept(question)?.kind,'picklebreaker_partners');
  const selected=selectAnswerEvidence(fixture(question));
  assert.deepEqual(selected.map(x=>x.chunkId),['partners']);
  assert.match(selected[0].content,/same partners as the Mixed Round/);
  assert.equal(selected[0].pageNumber,9);
  assert.equal(selected[0].sourceClassification,'lwr_controlling');
 });
}
test('neighboring and eligibility requests do not enter partner-continuity intent',()=>{
 for(const q of ['How does the Saturday Picklebreaker work?','Can I switch my mixed team partners?','Can Terry play with Tim?','Are my partners eligible for the Picklebreaker?','Can I change partners for the Picklebreaker after an injury?','What DUPR rating can my different Picklebreaker partners have?'])assert.notEqual(officialQuestionConcept(q)?.kind,'picklebreaker_partners',q);
 assert.equal(officialQuestionConcept('How does the Saturday Picklebreaker work?').kind,'scoring');
});
test('explicit other league, low score, and absent same-partner provision fail closed',()=>{
 assert.deepEqual(selectAnswerEvidence(fixture('Can I change partners for the Weekday Picklebreaker?')),[]);
 assert.deepEqual(selectAnswerEvidence(fixture(exact,[{...rule,combinedScore:.2}])),[]);
 assert.deepEqual(selectAnswerEvidence(fixture(exact,[{...rule,content:'6.2.3.5. Picklebreaker game to 25 points.'}])),[]);
});
test('missed initial passage is recovered with one bounded concept search',async()=>{
 const raw=c=>({chunk_id:c.chunkId,document_id:c.documentId,document_version_id:c.documentVersionId,document_title:c.documentTitle,document_type:c.documentType,document_authority_rank:c.documentAuthorityRank,document_scope_kind:'all',page_number:9,heading:c.heading,rule_number:c.ruleNumber,content:c.content,semantic_score:.5,keyword_score:.5,exact_score:.5,authority_score:.5,context_score:0,combined_score:.49});
 const embeddings=[];let searches=0;
 const result=await retrieveOfficialEvidence({body:{question:exact},embedQuery:async q=>{embeddings.push(q);return {embedding:Array(1536).fill(.01),inputTokens:5};},supabase:{rpc:async name=>{assert.equal(name,'search_ai_official_chunks');return {data:(++searches===1?[noise]:[rule]).map(raw),error:null};}}});
 const selected=await selectAnswerEvidenceWithAssistance(result);
 assert.deepEqual(selected.map(x=>x.chunkId),['partners']);
 assert.equal(searches,2);assert.deepEqual(embeddings,[exact,'Picklebreaker same partners as the Mixed Round']);
 assert.equal(result.request.question,exact);
});

async function retrieveOfficialEvidence(options){return retainNonVerificationFixture(await retrieveOfficialEvidenceRaw(options));}
