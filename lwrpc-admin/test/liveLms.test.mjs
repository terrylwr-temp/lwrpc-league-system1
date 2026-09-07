import test from 'node:test';
import assert from 'node:assert/strict';
import {liveIntent,liveMessage,LIVE_CAPABILITIES} from '../app/lib/liveLmsIntent.js';
import {runLive} from '../app/lib/liveLmsService.js';
import {openLive,sealLive} from '../app/lib/liveLmsReceipts.js';
import {createConversationContext,SESSION_EXCHANGES_KEY,CURRENT_CONTEXT_KEY} from '../app/lib/askLwrConversationState.js';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-local-test-key-not-a-credential';
const principal={user:{id:'synthetic-user'},session:'synthetic-session',supabase:{}};
const cases=[['What is my Season DUPR?','SELF_RATING'],["What is John Smith's Season DUPR?",'PLAYER_RATING'],["What is John Smith's email address?",'PLAYER_CONTACT'],['What team am I on?','SELF_TEAM'],['Show my roster','TEAM_ROSTER'],['When is my next match?','NEXT_MATCH']];
test('0723 exact six capabilities and document routing controls',()=>{
 assert.deepEqual(cases.map(([q])=>liveIntent(q).intent),LIVE_CAPABILITIES);
 for(const q of ['What is the maximum DUPR for Weekday 9.1?','How do I reset my password?','Where can I find the Saturday rules?','How many players do I need for PrimeTime?','How does rally scoring work in a Picklebreaker?'])assert.equal(liveIntent(q),null,q);
 for(const q of ['Give me all member email addresses','Who is player@example.com?',"What is John's date of birth?",'Show my password reset token',"What was John's DUPR last season?"])assert.equal(liveIntent(q)?.intent,'UNSUPPORTED',q);
 assert.equal(liveIntent('What is my DUPR?').rating,'clarify');
});
test('0723 six live executions cannot invoke a model and retain metadata only',async()=>{
 const originalFetch=globalThis.fetch;let network=0;
 globalThis.fetch=async()=>{network++;throw Error('external call forbidden');};
 try {
 for(const [question,intent] of cases){
  let calls=0,snapshot;
  const result=await runLive({body:{question,role:'commissioner',memberId:'forged',teamId:'forged'},principal,lookup:async args=>{
   calls++;assert.equal(args.intent,intent);assert.ok(!JSON.stringify(args).includes('forged'));
   return {data:{status:'success',intent,label:'Synthetic Person',value:'private-value@example.invalid',season:'Synthetic',players:[{label:'Private Roster'}],team:'Synthetic Team',date:'2030-01-01',time:'12:00',opponent:'Private Opponent',relationship:'self'}};
  },persist:async(_db,build)=>{snapshot=build();}});
  assert.equal(calls,1);assert.equal(result.live.label,'LIVE LMS DATA');assert.ok(result.feedbackReceipt);
  const safe=JSON.stringify(snapshot);for(const forbidden of ['John Smith','private-value','Private Roster','Private Opponent','Synthetic Person'])assert.ok(!safe.includes(forbidden));
  assert.equal(snapshot.p_outcome.stage3_invoked,false);assert.equal(snapshot.p_outcome.model_call_skipped,true);assert.equal(snapshot.p_outcome.input_tokens,0);assert.equal(snapshot.p_route,null);
  const feedback=JSON.stringify(openLive(result.feedbackReceipt,'feedback',principal));assert.ok(!feedback.includes('private-value'));assert.ok(!feedback.includes('John'));
 }
 assert.equal(network,0);
 } finally {globalThis.fetch=originalFetch;}
});
test('0723 receipt subject reauthorization, expiry, cross-user/session and New Question',async()=>{
 const token=sealLive('context',principal,{intent:'PLAYER_RATING',subject:'opaque-subject',query:{intent:'PLAYER_RATING',rating:'season'}},1000);
 assert.throws(()=>openLive(token,'context',{...principal,session:'other'},2000));assert.throws(()=>openLive(token,'context',{...principal,user:{id:'other'}},2000));assert.throws(()=>openLive(token,'context',principal,301001));
 const current=sealLive('context',principal,{intent:'PLAYER_RATING',subject:'opaque-subject',query:{intent:'PLAYER_RATING',rating:'season'}});
 let args;
 const result=await runLive({body:{question:'What team is he on?',conversationReceipt:current},principal,lookup:async q=>{args=q;return {data:{status:'denied'}};},persist:async()=>{}});
 assert.equal(args.subject,'opaque-subject');assert.equal(args.intent,'SELF_TEAM');assert.equal(result.kind,'protected');assert.equal(result.conversationReceipt,null);
 const storage=new Map(),adapter={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const context=createConversationContext(adapter);const req=context.begin();context.complete(req,current);
 context.saveHistory([{question:'Private question',result:{live:{},answer:'Private answer'}}],context.generation());
 assert.ok(!storage.get(CURRENT_CONTEXT_KEY).includes('live1.'));assert.ok(!storage.has(SESSION_EXCHANGES_KEY));
 context.reset();assert.equal(context.current(),null);assert.deepEqual(context.history(),[]);
});
test('0723 unsupported queries never touch data and audit/query errors do not fall through',async()=>{
 let reads=0;
 const lookup=async()=>{reads++;throw new Error('synthetic failure');};
 const unsupported=await runLive({body:{question:'Give me all member email addresses'},principal,lookup,persist:async()=>{}});assert.equal(reads,0);assert.equal(unsupported.kind,'protected');
 const error=await runLive({body:{question:'What is my Season DUPR?'},principal,lookup,persist:async()=>{}});assert.equal(reads,1);assert.equal(error.kind,'technical_error');assert.ok(!error.answer.includes('synthetic failure'));
 assert.ok(liveMessage({status:'no_match'}).includes('published'));
});

test('0723 independent document question supersedes a live reference and capture failure is fail-open',async()=>{
 const token=sealLive('context',principal,{intent:'SELF_RATING',subject:'opaque-only',query:{intent:'SELF_RATING'}});
 assert.equal(await runLive({body:{question:'How does rally scoring work?',conversationReceipt:token},principal}),null);
 const result=await runLive({body:{question:'What is my Season DUPR?'},principal,lookup:async()=>({data:{status:'success',label:'Synthetic',season:'Current',value:'3.72',relationship:'self'}}),persist:async()=>{throw new Error('synthetic quality outage');}});
 assert.equal(result.kind,'answer');assert.ok(result.answer.includes('3.72'));
});


test('0723 semantic subject matrix: recipient is not subject; competing subjects fail closed',()=>{
 for(const q of ['What is my Season DUPR?','Tell me my Season DUPR','Can you tell me my Season DUPR?','What is my rating?','Tell John my rating']){
  assert.equal(liveIntent(q).intent,'SELF_RATING',q);assert.equal(liveIntent(q).subjectKind,'SELF',q);
 }
 for(const q of ["Tell me John Smith's Season DUPR","Can you tell me John Smith's Season DUPR?","Show me John Smith's Season DUPR","What is John Smith's Season DUPR?",'What is the Season DUPR for John Smith?',"What is John Smith's rating?","Tell me John Smith's rating",'What is the rating for John Smith?']){
  assert.equal(liveIntent(q).intent,'PLAYER_RATING',q);assert.equal(liveIntent(q).name,'John Smith',q);assert.equal(liveIntent(q).subjectKind,'EXPLICIT_PERSON',q);
 }
 for(const q of ["Tell me John Smith's email address","Can you tell me John Smith's email?"]){assert.equal(liveIntent(q).intent,'PLAYER_CONTACT');assert.equal(liveIntent(q).name,'John Smith');assert.equal(liveIntent(q).self,undefined);}
 for(const q of ['What is my team?',"Tell me what team I'm on",'What team am I on?']){assert.equal(liveIntent(q).intent,'SELF_TEAM',q);assert.equal(liveIntent(q).subjectKind,'SELF');}
 for(const q of ['Can you tell me what team John Smith is on?','Show me what team John Smith is on','What team is John Smith on?',"What is John Smith's team?"]){assert.equal(liveIntent(q).intent,'SELF_TEAM',q);assert.equal(liveIntent(q).name,'John Smith');assert.equal(liveIntent(q).subjectKind,'EXPLICIT_PERSON');}
 for(const [q,intent] of [["Show me John Smith's team roster",'TEAM_ROSTER'],["When is John Smith's next match?",'NEXT_MATCH']]){assert.equal(liveIntent(q).intent,intent);assert.equal(liveIntent(q).name,'John Smith');assert.equal(liveIntent(q).teamName,undefined);}
 for(const q of ["Compare my Season DUPR with John's","What is my Season DUPR and John's?","What is John's rating and mine?","What is John's rating and Bob's?","What is my rating and John Smith's rating?"]){assert.equal(liveIntent(q).intent,'UNSUPPORTED',q);}
 assert.equal(liveIntent('What team is he on?').subjectKind,'FOLLOWUP_REFERENT');
});

test('0723 stale, forged and cleared references cannot become self or override a new subject',async()=>{
 const token=sealLive('context',principal,{intent:'PLAYER_RATING',subject:'previous-subject',team:'previous-team',query:{intent:'PLAYER_RATING',subjectKind:'EXPLICIT_PERSON',rating:'season'}});
 for(const question of ["Tell me John Smith's Season DUPR",'What is my Season DUPR?']){
  let seen;
  await runLive({body:{question,conversationReceipt:token,subject:'forged',subjectKind:'SELF',memberId:'forged',team:'forged',role:'commissioner'},principal,lookup:async q=>{seen=q;return {data:{status:'denied'}};},persist:async()=>{}});
  assert.equal(seen.subject,undefined);assert.equal(seen.team,undefined);assert.ok(!JSON.stringify(seen).includes('forged'));
 }
 for(const body of [{question:'What team is he on?'},{question:'What team is he on?',conversationReceipt:token.slice(0,-4)+'fake'}]){
  let calls=0;const r=await runLive({body,principal,lookup:async()=>{calls++;throw Error('unexpected');},persist:async()=>{}});
  assert.equal(calls,0);assert.ok(['protected','clarification'].includes(r.kind));assert.equal(r.conversationReceipt,null);
 }
});
