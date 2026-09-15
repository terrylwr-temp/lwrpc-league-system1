import test from 'node:test';
import assert from 'node:assert/strict';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
import {runLive} from '../app/lib/liveLmsService.js';
import {openLive} from '../app/lib/liveLmsReceipts.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-limitation-test';
const principal={user:{id:'synthetic-actor'},receiptBinding:'view_as:synthetic-target',supabase:{}};
const generic=["What's my DUPR?",'What is my DUPR rating?','What is my rating on DUPR?','Can you tell me my DUPR?'];
const explicit=[["What's my Season DUPR?",'season'],["What's my PrimeTime Season DUPR?",'primetime'],['What is my Season DUPR for 2026 Fall?','season']];
const choices=[{season:'fall',rating:'season',label:'Season DUPR - 2026 Fall Season'},{season:'fall',rating:'primetime',label:'PrimeTime Season DUPR - 2026 Fall Season'}];
for(const question of generic)test(`generic rating limitation and combined choices: ${question}`,async()=>{
 assert.equal(liveIntent(question).rating,'clarify');let audit;
 const result=await runLive({body:{question},principal,lookup:async()=>({data:{status:'ambiguous',choiceKind:'rating and season',choices,relationship:'self'}}),persist:async(_db,build)=>{audit=build().p_outcome;}});
 assert.match(result.answer,/Current official DUPR isn't available/);assert.match(result.answer,/Which rating and season/);assert.equal(result.clarification.options.length,2);assert.equal(audit.model,null);assert.equal(audit.stage3_invoked,false);assert.equal(audit.model_call_skipped,true);
});
for(const question of ["What's my current DUPR?","What's my current official DUPR?"])test(`official rating unavailable without lookup: ${question}`,async()=>{
 const result=await runLive({body:{question},principal,lookup:async()=>assert.fail('No stored rating substitution'),persist:async()=>{}});assert.equal(result.kind,'protected');assert.match(result.answer,/Current official DUPR.*not.*available/);assert.equal(result.conversationReceipt,null);
});
for(const [question,rating] of explicit)test(`explicit supported rating stays uncluttered: ${question}`,async()=>{
 assert.equal(liveIntent(question).rating,rating);
 for(const data of [{status:'ambiguous',choiceKind:'season',choices:choices.filter(c=>c.rating===rating)},{status:'success',season:'2026 Fall Season',rating,label:'Synthetic',value:'3.5'}]){
 const result=await runLive({body:{question},principal,lookup:async args=>{assert.equal(args.rating,rating);return {data};},persist:async()=>{}});assert.doesNotMatch(result.answer,/official DUPR/);}
});
test('combined selection reauthorizes and refetches; missing, denial and target binding remain separate',async()=>{
 let calls=0,net=0;const original=globalThis.fetch;globalThis.fetch=async()=>{net++;throw Error('No model or embedding');};
 try{
 const first=await runLive({body:{question:"What's my DUPR?",role:'commissioner',memberId:'forged'},principal,lookup:async args=>{calls++;assert.ok(!JSON.stringify(args).includes('forged'));return {data:{status:'ambiguous',choiceKind:'rating and season',choices,subject:'target'}};},persist:async()=>{}});
 for(const selection of [first.clarification.options[0].key,'1','Season DUPR - 2026 Fall Season']){
 const result=await runLive({body:{question:selection,conversationReceipt:first.conversationReceipt},principal,lookup:async args=>{calls++;assert.equal(args.season,'fall');assert.equal(args.rating,'season');return {data:{status:'missing',season:'2026 Fall Season',rating:'season',subject:'target'}};},persist:async()=>{}});
 assert.match(result.resolvedQuestion,/my Season DUPR.*2026 Fall Season/);assert.match(result.answer,/You don't currently have a Season DUPR recorded/);assert.doesNotMatch(result.answer,/official DUPR/);
 }
 const denied=await runLive({body:{question:'1',conversationReceipt:first.conversationReceipt},principal,lookup:async()=>({data:{status:'denied'}}),persist:async()=>{}});assert.equal(denied.kind,'protected');assert.match(denied.answer,/can't access/);assert.doesNotMatch(denied.answer,/official DUPR/);
 assert.throws(()=>openLive(first.conversationReceipt,'context',{...principal,receiptBinding:'view_as:other'}));assert.equal(calls,4);assert.equal(net,0);
 }finally{globalThis.fetch=original;}
});
