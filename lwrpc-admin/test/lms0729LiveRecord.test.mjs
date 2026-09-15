import test from 'node:test';import assert from 'node:assert/strict';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
import {runLive} from '../app/lib/liveLmsService.js';
import {recordFixture,id} from './helpers/liveRecordFixture.mjs';
import {recordMatrix} from './helpers/liveRecordMatrix.mjs';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-lms0729-only';
const questions=["What is my team's record?",'What is our teams record?','What is our record?','How many matches have we played?','How many matches have we won?','How many matches have we lost?','How many standings points do we have?'];
test('0729 record and deferred rank routing, no external calls',async()=>{
 const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('No provider calls allowed');};
 try{
  for(const q of questions)assert.equal(liveIntent(q)?.intent,'TEAM_RECORD',q);
  for(const q of ['What place are we in?','What place is my team?','Where are we in the standings?','What rank are we?','Are we in first place?','Who is in first place?','Why are we in third place?','Why are we behind Team X?','Why are we ranked second with the same wins?']){
   assert.equal(liveIntent(q)?.intent,'RANK_DEFERRED',q);const r=await runLive({body:{question:q},principal:{user:{id:'synthetic'},receiptBinding:'synthetic'},lookup:()=>{throw Error('Deferred rank must not query');},persist:async()=>{}});assert.match(r.answer,/aren't available/);assert.equal(r.live.label,'LIVE LMS DATA');
  }
  for(const q of ['How are standings calculated?','How are ties broken?','How many points do teams receive for a win?'])assert.equal(liveIntent(q),null,q);
 }finally{globalThis.fetch=original;}
});

test('0729 SQL identity, record, feedback and effective View-As',async()=>{const db=await recordFixture();try{await recordMatrix(db);}finally{await db.close();}});

test('0729 signed clarification binds identity, named scope, pagination and rejects forged selection',async()=>{
 const principal={user:{id:id(101)},receiptBinding:'synthetic'}, seen=[];
 const lookup=async args=>{seen.push(args);return {data:args.team?{status:'success',team:'Synthetic Team',division:'Synthetic Division',league:'Synthetic League',season:'Spring 2025 Season',wins:3,losses:2,ties:1,played:6,points:12.5,relationship:'team'}:{status:'ambiguous',choiceKind:'team and season',choices:[{team:id(30),label:'Synthetic Team, Spring 2025 Season'}],moreChoices:true}};};
 const first=await runLive({body:{question:"What is Synthetic Team's record for Spring 2025 Season?",team:id(999),memberId:id(999),role:'commissioner'},principal,lookup,persist:async()=>{}});
 assert.equal(first.kind,'clarification');assert.equal(seen[0].team,undefined);assert.equal(seen[0].self,false);
 const answer=await runLive({body:{question:first.clarification.options[0].key,conversationReceipt:first.conversationReceipt,team:id(999)},principal,lookup,persist:async()=>{}});
 assert.equal(seen[1].team,id(30));assert.equal(seen[1].teamName,'synthetic team');assert.equal(seen[1].seasonName,'spring 2025 season');assert.equal(seen[1].self,false);assert.match(answer.answer,/3\u20132\u20131/);assert.ok(answer.feedbackReceipt);
 const more=await runLive({body:{question:'more',conversationReceipt:first.conversationReceipt},principal,lookup,persist:async()=>{}});assert.equal(more.kind,'clarification');assert.equal(seen[2].choiceOffset,5);
 const wrong=await runLive({body:{question:first.clarification.options[0].key,conversationReceipt:first.conversationReceipt},principal:{...principal,user:{id:id(102)}},lookup:()=>{throw Error('must not query');},persist:async()=>{}});assert.match(wrong.answer,/expired/);
 const view=await runLive({body:{question:'What is our record?'},principal,origin:'view_as',lookup:async()=>({data:{status:'success',team:'Synthetic',division:'D',league:'L',season:'S',wins:1,losses:0,ties:0,played:1,points:3}}),persist:async()=>{}});assert.equal(view.feedbackReceipt,undefined);
});
