import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { trustedSelectedRuleIdentity as identity } from "../app/lib/aiSelectedRuleIdentity.js";
import { evidencePassages } from "../app/lib/aiQuestionApplicability.js";
import { selectAnswerEvidence, citationLabel, generateOfficialAnswer } from "../app/lib/aiAnswerGeneration.js";
import { createConversationContext, CURRENT_CONTEXT_KEY, SESSION_EXCHANGES_KEY } from "../app/lib/askLwrConversationState.js";
import { createFollowUpReceipt, createClarificationReceipt, resolveConversationTurn, createFeedbackReceipt, readFeedbackReceipt } from "../app/lib/aiConversation.js";
const fixtures = JSON.parse(await readFile(new URL("./fixtures/lms0719-diagnosis-provisions.json", import.meta.url), "utf8"));
for (const name of ["lms0717-production-evidence.json", "lms0717-correction-production-evidence.json"]) {
 const rows=JSON.parse(await readFile(new URL("./fixtures/"+name, import.meta.url), "utf8"));
 for (const {retrieval:r} of rows) fixtures.push(...(r.candidates||[]),...(r.suppliedEvidence||[]),...(r.authorityReviewCandidates||[]),...(r.intentEvidenceCandidates||[]));
}
const stored = c => ({ rule_number:c.ruleNumber, content:c.content, heading:c.heading });
const storage = () => { const map=new Map(); return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; };
const unit = (id) => {
 for (const c of fixtures) { const passage=evidencePassages(c).find(p=>p.startsWith(id+". ")); if(passage)return {c,passage}; }
 throw new Error("Missing production provision "+id);
};
for(const id of ["3.5","5.5","5.7","4.1","4.2"]) test(`0719 LWR selected production provision ${id}`,()=>{
 const {c,passage}=unit(id); assert.equal(identity({selectedPassages:[passage]},stored(c)),id);
 if(id==="3.5") { assert.match(passage,/roster availability/); assert.match(citationLabel({...c,chunkRuleNumber:c.ruleNumber,ruleNumber:id}),/Rule 3.5.*PLAYER REQUIREMENTS.*Page 2/); }
 if(id==="5.7") assert.match(passage,/5\.7\.1[\s\S]*5\.7\.2/);
});
test("0719 two independent propositions remain one bounded combined source",()=>{
 const {c,passage}=unit("4.1"); const second=evidencePassages(c).find(p=>p.startsWith("4.2. "));
 assert.ok(second); const number=identity({selectedPassages:[passage,second,passage]},stored(c)); assert.equal(number,"4.1, 4.2");
 assert.match(citationLabel({...c,chunkRuleNumber:c.ruleNumber,ruleNumber:number}),/Rules 4.1, 4.2/);
});
for(const id of ["3.C.3","7.A.2","7.A.2.a","10.G","10.G.1","11.A","11.A.2","11.A.3","20.F","20.F.1"]) test(`0719 USAP production identity ${id}`,()=>{
 const c=fixtures.find(c=>c.ruleNumber===id); assert.ok(c); assert.equal(identity({content:c.content},stored(c)),id);
});
test("0719 rejects mismatched selected evidence and ignores forged identity",()=>{
 const {c,passage}=unit("3.5"); assert.equal(identity({ruleNumber:"99.9",trustedRuleIds:["99.9"],selectedPassages:[passage]},stored(c)),"3.5");
 assert.throws(()=>identity({selectedPassages:[passage+" Invented permission."]},stored(c)),/not present/);
 assert.throws(()=>identity({content:"Forged model text",selectedPassages:[passage]},stored(c)),/does not match/);
});
test("0719 cross references, continuation fragments, arbitrary dates, and unrelated deeper rules do not govern",()=>{
 for(const content of ["See Rule 3.5 for details.","continued in Rule 3.5.","2026. Calendar date."]) assert.equal(identity({content},{rule_number:"3",content}),"3");
 assert.equal(identity({content:"Sept. 27 - ratings recorded"},{rule_number:"",content:"Sept. 27 - ratings recorded"}),"");
 const {c,passage}=unit("3.5"); const fragment=passage.slice(passage.indexOf("Players")); assert.equal(identity({content:fragment},stored(c)),"3");
 const family="5.7. Incomplete Matches:\n5.7.1. First branch.\n5.7.2. Second branch."; assert.equal(identity({content:family},{rule_number:"5",content:family}),"5.7");
});
test("0719 every existing production replay selection binds to its original chunk, including assembled date units",async()=>{
 for(const file of ["lms0717-production-evidence.json","lms0717-correction-production-evidence.json"]){
  const rows=JSON.parse(await readFile(new URL("./fixtures/"+file,import.meta.url),"utf8"));
  for(const {retrieval} of rows){ const selected=selectAnswerEvidence(retrieval); for(const c of selected){
   const original=[...(retrieval.candidates||[]),...(retrieval.suppliedEvidence||[]),...(retrieval.authorityReviewCandidates||[]),...(retrieval.intentEvidenceCandidates||[])].find(x=>x.chunkId===c.chunkId);
   assert.doesNotThrow(()=>identity(c,stored(original)),retrieval.request.question);
  }}
 }
 const f=JSON.parse(await readFile(new URL("./fixtures/lms0717-final-production-evidence.json",import.meta.url),"utf8"));
 const candidates=f.cases.timing; const selected=selectAnswerEvidence({request:{question:"When are Season DUPR ratings recorded?"},suppliedEvidence:candidates,authorityReviewCandidates:candidates,evidence:{sufficient:true,threshold:.35}});
 assert.ok(selected.length); for(const c of selected)assert.equal(identity(c,stored(candidates.find(x=>x.chunkId===c.chunkId))),"");
});
for(const receipt of ["follow-up","clarification"]) test(`0719 reset removes ${receipt}, history, errors and local votes without I/O`,()=>{
 const s=storage(),state=createConversationContext(s); state.complete(state.begin(),receipt);
 state.saveHistory([{id:"1",result:{answer:"one"},feedback:{helpful:true}},{id:"2",requestError:true}],state.generation());
 assert.equal(createConversationContext(s).history().length,2); assert.equal(createConversationContext(s).current(),receipt);
 let notifications=0;state.subscribe(()=>notifications++);assert.equal(state.reset(),true);assert.equal(state.reset(),true);
 assert.equal(notifications,2);assert.deepEqual(state.history(),[]);assert.equal(state.current(),null);
 assert.equal(s.getItem(CURRENT_CONTEXT_KEY),undefined);assert.equal(s.getItem(SESSION_EXCHANGES_KEY),undefined);
 assert.equal(createConversationContext(s).begin().receipt,null);assert.deepEqual(createConversationContext(s).history(),[]);
});
for(const kind of ["Ask","feedback"]) test(`0719 pending ${kind} blocks reset across remount and synchronous rapid clicks`,()=>{
 const state=createConversationContext(storage());const end=state.startOperation();assert.equal(state.busy(),true); assert.equal(state.reset(),false);assert.equal(state.reset(),false);
 end();end();assert.equal(state.busy(),false);assert.equal(state.reset(),true);
});
test("0719 obsolete completions cannot repopulate context, memory, or storage after reset",()=>{
 const s=storage(),state=createConversationContext(s),request=state.begin(),generation=state.generation();state.reset();
 state.complete(request,"stale");assert.equal(state.saveHistory([{result:{answer:"stale"}}],generation),false);
 assert.equal(state.current(),null);assert.deepEqual(state.history(),[]);assert.equal(s.getItem(SESSION_EXCHANGES_KEY),undefined);
});
test("0719 unavailable storage still resets in memory",()=>{
 const state=createConversationContext({getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}});
 state.complete(state.begin(),"context");state.saveHistory([{result:{answer:"old"}}],state.generation());assert.equal(state.reset(),true);assert.equal(state.current(),null);assert.deepEqual(state.history(),[]);
});
test("0719 reset clears real signed follow-up and clarification dependencies",()=>{
 process.env.SUPABASE_SERVICE_ROLE_KEY="0719-local-test-secret";const userId="11111111-1111-4111-8111-111111111111";
 for(const receipt of [createFollowUpReceipt(userId,"Can I volley in the kitchen?"),createClarificationReceipt(userId,"What color?","color_subject")]){
  const state=createConversationContext(storage());state.complete(state.begin(),receipt);state.reset();
  const result=resolveConversationTurn({question:"What about Saturday?",userId,receipt:state.begin().receipt});assert.equal(Boolean(result.priorContextAvailable),false);
  const fresh=resolveConversationTurn({question:"What are the rules for a legal serve?",userId,receipt:state.current()});assert.equal(fresh.effectiveQuestion,"What are the rules for a legal serve?");
 }
});
test("0719 reset UI has standalone focus, announcement and bounded responsive actions",async()=>{
 const ui=await readFile(new URL("../app/components/AskLwrAssistant.js",import.meta.url),"utf8"),css=await readFile(new URL("../app/components/AskLwrAssistant.module.css",import.meta.url),"utf8");
 assert.match(ui,/inputRef \|\| fallbackInputRef/);assert.match(ui,/composerRef.current\?\.focus/);assert.match(ui,/type="button" onClick=\{newQuestion\} disabled=\{busy\}/);assert.match(ui,/New question started/);assert.match(ui,/aria-live="polite"/);
 assert.match(css,/@media \(max-width: 639px\)[\s\S]*\.composer \{ flex-direction: column/);assert.match(css,/\.actions button \{ flex: 1/);assert.match(css,/100dvh/);assert.match(css,/z-index: 10000/);
 const reset=ui.slice(ui.indexOf("function newQuestion"),ui.indexOf("async function submit("));assert.doesNotMatch(reset,/fetch|supabase|sendFeedback/);
});

test("0719 revalidated identity reaches model metadata and both existing snapshot serializers",async()=>{
 const {c,passage}=unit("3.5");
 process.env.OPENAI_API_KEY="local-model-stub";process.env.SUPABASE_SERVICE_ROLE_KEY="local-receipt-stub";
 process.env.AI_QUALITY_HMAC_KEY="0719-local-grouping-stub-at-least-32-bytes";
 const selected={...c,content:passage,combinedScore:.8,documentAuthorityRank:1};
 const supabase={from(table){return {select(){return this;},async in(){return {data:table==="ai_document_versions"?[{id:c.documentVersionId,document_id:c.documentId,processing_status:"ready",storage_bucket:"local",storage_path:"local.pdf",document:{id:c.documentId,title:c.documentTitle,status:"active",active_version_id:c.documentVersionId}}]:[{id:c.chunkId,document_version_id:c.documentVersionId,is_searchable:true,...stored(c),page_number:c.pageNumber,section_label:c.sectionLabel}]};}};},storage:{from(){return {async createSignedUrl(){return {data:{signedUrl:"https://example.test/local.pdf"}};}};}}};
 let prompt;
 const answer=await generateOfficialAnswer({retrieval:{request:{question:"Can I join a team in another community?"},suppliedEvidence:[selected],evidence:{sufficient:true,threshold:.35}},supabase,fetchImpl:async(_,options)=>{prompt=JSON.parse(options.body);return {ok:true,json:async()=>({status:"completed",output_text:JSON.stringify({answer:"Local stub answer",conflict:false})})};}});
 assert.match(prompt.input[0].content,/Rule: 3\.5/);assert.match(prompt.instructions,/only an identity explicitly supplied/);
 assert.equal(answer.selectedEvidence[0].ruleNumber,"3.5");assert.equal(answer.selectedEvidence[0].chunkRuleNumber,"3");assert.equal(answer.sources[0].ruleNumber,"3.5");
 const userId="11111111-1111-4111-8111-111111111111";
 const claims=readFeedbackReceipt(createFeedbackReceipt({userId,originalQuestion:"Can a player join another community team?",effectiveQuestion:"Can a player join another community team?",answer:answer.answer,sources:answer.sources,selectedEvidence:answer.selectedEvidence,assistantVersion:"LMS-0719"}),userId);
 const {qualityFeedback}=await import("../app/lib/aiQualitySnapshots.js");const snapshot=qualityFeedback(claims).p_occurrence;
 assert.equal(claims.sources[0].ruleNumber,"3.5");assert.equal(claims.selectedEvidence[0].ruleNumber,"3.5");assert.equal(snapshot.source_snapshot[0].ruleNumber,"3.5");assert.equal(snapshot.selection_snapshot.selectedEvidence[0].ruleNumber,"3.5");
 for(const number of ["4.1, 4.2","7.A.2.a"]){const copied={...answer.sources[0],ruleNumber:number};const saved=readFeedbackReceipt(createFeedbackReceipt({userId,originalQuestion:"General rule?",effectiveQuestion:"General rule?",answer:"Local stub answer",sources:[copied],selectedEvidence:[copied],assistantVersion:"LMS-0719"}),userId);assert.equal(qualityFeedback(saved).p_occurrence.source_snapshot[0].ruleNumber,number);}
});
test("0719 heading cleanup removes only exact parent or selected prefixes",()=>{
 assert.match(citationLabel({documentTitle:"Rules",ruleNumber:"3.5",chunkRuleNumber:"3",heading:"Rule 3 - PLAYER REQUIREMENTS",pageNumber:2}),/Rule 3.5 — PLAYER REQUIREMENTS — Page 2/);
 assert.match(citationLabel({documentTitle:"Rules",ruleNumber:"3.5",chunkRuleNumber:"3",heading:"Rule 3.5 - PLAYER REQUIREMENTS",pageNumber:2}),/Rule 3.5 — PLAYER REQUIREMENTS — Page 2/);
 assert.match(citationLabel({documentTitle:"USAP",ruleNumber:"7.A.2.a",heading:"7.A.2.a. Serving",pageNumber:21}),/Rule 7.A.2.a — Serving — Page 21/);
});
