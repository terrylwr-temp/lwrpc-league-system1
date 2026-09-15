import fs from 'node:fs';
// Explicitly authorized official non-personal document benchmark only. No application
// endpoint, Supabase, Storage or telemetry network access is allowed by this runner.
process.env.OPENAI_API_KEY='offline-validation-fixture';
const {selectAnswerEvidence}=await import('../app/lib/aiAnswerGeneration.js');
const {liveIntent}=await import('../app/lib/liveLmsIntent.js');
const {isUnsupportedOperationalQuestion,resolveOfficialConversation}=await import('../app/lib/askLwrPlayerAnswer.js');
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-current-official-evidence.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal,combinedScore:.8}));
const retrieval=question=>({request:{question,askAbout:'all',context:{}},candidates,suppliedEvidence:candidates,authorityReviewCandidates:candidates,policyEvidence:{status:'complete',candidates},evidence:{sufficient:true,threshold:.35},metrics:{retrievalMs:0,totalMs:0}});
const {questionIntent}=await import('../app/lib/aiRequestIntent.js');
const {needsPolicyEvidence}=await import('../app/lib/aiPolicyEvidence.js');
const {interpretQuestion}=await import('../app/lib/aiQuestionInterpretation.js');
const {genericApplicablePassages}=await import('../app/lib/aiQuestionApplicability.js');
const cases=["when does the women weekday dupr league start","What is the starting date for the women's weekday dupr league"].map(question=>({question,interpretation:interpretQuestion(question),intent:questionIntent(question),liveRoute:liveIntent(question),documentGuard:isUnsupportedOperationalQuestion(question),conversation:resolveOfficialConversation({question,userId:'local-fixture'}),boundedPolicyCompletion:needsPolicyEvidence(question),dateCandidate:candidates.filter(c=>c.documentType==='league_supplement').map(c=>({chunkId:c.chunkId,heading:c.heading,applicable:genericApplicablePassages(c,question)})),selected:selectAnswerEvidence(retrieval(question))}));
fs.writeFileSync(new URL('../../docs/lms-0725-league-date-before.json',import.meta.url),JSON.stringify(cases,null,2)+'\n');
console.log(JSON.stringify(cases,null,2));
