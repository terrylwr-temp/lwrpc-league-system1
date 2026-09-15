import test from 'node:test';import assert from 'node:assert/strict';
import {eligibilityIntent} from '../app/lib/aiEligibilityIntent.js';
import {eligibilityPolicy,evaluateEligibility,divisionOptions,rfClassification} from '../app/lib/aiEligibilityPolicy.js';
import {runEligibility} from '../app/lib/aiEligibilityService.js';
import {catalog,candidates,divisions,sourceDatabase} from './helpers/eligibilityFixture.mjs';
import {id} from './helpers/viewAsFixture.mjs';
process.env.SUPABASE_SERVICE_ROLE_KEY='local-synthetic-eligibility-fixture-only';
const division=divisionOptions(divisions,eligibilityIntent('Can I play DUPR5?'))[0];const policy=eligibilityPolicy(candidates,division);
export const controls=[
 ['RF01 below', {rf:28,value:4,sourceIsNr:false},'NR','PARTIALLY_CONFIRMED'],
 ['RF02 fraction', {rf:28.999,value:4,sourceIsNr:false},'NR','PARTIALLY_CONFIRMED'],
 ['RF03 boundary', {rf:29,value:2.8,sourceIsNr:false},'NR','PARTIALLY_CONFIRMED'],
 ['RF04 above', {rf:80,value:2.8,sourceIsNr:false},'RATED','PARTIALLY_CONFIRMED'],
 ['RF05 missing', {rf:null,value:2.8,sourceIsNr:false},'RF_UNKNOWN','CANNOT_DETERMINE'],
 ['RF06 numeric NR', {rf:20,value:4,sourceIsNr:true},'NR','PARTIALLY_CONFIRMED'],
 ['RF07 rated below', {rf:80,value:1.9,sourceIsNr:false},'RATED','NOT_ELIGIBLE'],
 ['RF08 rated inside', {rf:80,value:2.899,sourceIsNr:false},'RATED','PARTIALLY_CONFIRMED'],
 ['RF09 rated above', {rf:80,value:2.9,sourceIsNr:false},'RATED','NOT_ELIGIBLE'],
 ['RF10 independent NR', {rf:80,value:4,sourceIsNr:true},'NR','PARTIALLY_CONFIRMED'],
 ['RF11 independent unknown', {rf:80,value:2.8,sourceIsNr:null},'RF_UNKNOWN','CANNOT_DETERMINE'],
 ['RF12 pair unknown', {rf:80,value:2.5,sourceIsNr:false},'RATED','PARTIALLY_CONFIRMED'],
];
for(const [label,input,classification,outcome] of controls)test(label,()=>{assert.equal(policy.status,'READY');const r=evaluateEligibility(policy,input);assert.equal(r.classification,classification);assert.equal(r.outcome,outcome);assert.ok(r.unresolved.includes('PAIR_AGGREGATE_UNKNOWN'));});
const principal={user:{id:id(101)},receiptBinding:'synthetic-session',supabase:sourceDatabase()};
async function ask(question,extra={}){let calls=0,telemetry=[];const r=await runEligibility({body:{question},principal,loadCatalog:async()=>catalog,lookup:async q=>{calls++;assert.equal(q.subjectKind,'SELF');return {data:{status:'success',rf:28.999,value:4,sourceIsNr:false}};},persist:async(_db,make)=>{telemetry.push(make());return true;},...extra});return {r,calls,telemetry};}
test('Exact official source gate + NR precedence + sanitized single telemetry outcome',async()=>{const {r,calls,telemetry}=await ask('Can I play DUPR5?');assert.equal(r.kind,'answer');assert.equal(calls,1);assert.equal(r.eligibility.classification,'NR');assert.equal(r.sources.length,1);assert.equal(r.eligibility.evidence.length,8);assert.match(r.answer,/minus 0.5/);assert.doesNotMatch(r.answer,/28.999/);assert.equal(telemetry.length,1);assert.doesNotMatch(JSON.stringify(telemetry),/28.999|sourceIsNr|reliability|member_id/);});
test('Policy only never reads SELF',async()=>{const {r,calls}=await ask('What are the requirements for DUPR5?');assert.equal(r.kind,'answer');assert.equal(calls,0);assert.equal(r.eligibility.outcome,'POLICY_ONLY');});
test('PT9 conflict blocks personal lookup; no crossing to Weekday rules',async()=>{const {r,calls}=await ask('Can I play PrimeTime 9?');assert.equal(r.kind,'conflict');assert.equal(calls,0);assert.equal(r.eligibility.outcome,'POLICY_CONFIGURATION_CONFLICT');});
test('PrimeTime age policy includes exact 6.3.2 source; no live lookup',async()=>{const {r,calls}=await ask('What age do I need to be for PrimeTime?');assert.equal(r.kind,'answer');assert.match(r.answer,/12\/31/);assert.equal(calls,0);});
test('Clarification binds subject session, exact choice and current source',async()=>{const {r,calls}=await ask('Can I play DUPR7?');assert.equal(r.kind,'clarification');assert.equal(calls,0);const body={question:r.clarification.options[0].key,conversationReceipt:r.conversationReceipt};assert.equal((await ask('',{body})).r.kind,'answer');assert.equal((await ask('',{body,principal:{...principal,receiptBinding:'other'}})).r.kind,'technical_error');assert.equal((await ask('',{body:{...body,question:'choice:forged'}})).r.kind,'technical_error');assert.equal((await ask('',{body,loadCatalog:async()=>({...catalog,candidates:candidates.map(c=>({...c,documentVersionId:id(900)}))})})).r.kind,'technical_error');});
test('Inactive or unavailable SDUPR5 does not substitute another division',async()=>{const {r,calls}=await ask('Can I play SDUPR5?');assert.equal(r.eligibility.outcome,'CANNOT_DETERMINE');assert.equal(calls,0);assert.deepEqual(r.sources,[]);});
test('Missing RF stays unknown and denied subject remains protected',async()=>{assert.equal((await ask('Can I play DUPR5?',{lookup:async()=>({data:{status:'missing',rf:null,value:2.8}})})).r.eligibility.outcome,'CANNOT_DETERMINE');assert.equal((await ask('Can I play DUPR5?',{lookup:async()=>({data:{status:'denied'}})})).r.kind,'protected');});
test('Telemetry exceptions fail open with exactly one logical attempt',async()=>{let n=0;const {r}=await ask('Can I play DUPR5?',{persist:async()=>{n++;throw Error('synthetic');}});assert.equal(r.kind,'answer');assert.equal(n,1);});
test('Standalone other-player RF is protected before catalog or provider',async()=>{for(const q of ["What is John's RF?",'What is my Reliability Factor?']){const {r,calls}=await ask(q,{loadCatalog:async()=>{throw Error('must not read');}});assert.equal(r.kind,'protected');assert.equal(calls,0);}});
test('Changed policy version, future season and missing continuation fail closed',()=>{assert.equal(eligibilityPolicy(candidates,{...division,seasonId:id(999)}).status,'POLICY_SCOPE_UNKNOWN');assert.equal(eligibilityPolicy(candidates.filter(c=>!/^4\.5\.1\./m.test(c.content)),division).status,'POLICY_UNKNOWN');assert.equal(rfClassification(29,policy),'NR');});
