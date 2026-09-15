// Diagnosis only: unchanged application functions, saved official evidence, no network/model calls.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {questionIntent} from '../app/lib/aiRequestIntent.js';
import {liveIntent} from '../app/lib/liveLmsIntent.js';
import {selectPolicyEvidence} from '../app/lib/aiPolicyEvidence.js';
import {qualityOutcome,qualityException} from '../app/lib/aiQualitySnapshots.js';
import {persistQuality} from '../app/lib/aiQualityCapture.js';
const snapshot=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0725-league-dates-current-evidence.json',import.meta.url)));
const candidates=snapshot.evidence.map(c=>({chunkId:c.id,documentId:c.document.id,documentVersionId:c.document_version_id,documentTitle:c.document.title,documentType:c.document.document_type,documentAuthorityRank:c.document.authority_rank,content:c.content,ruleNumber:c.rule_number,heading:c.heading,sectionLabel:c.section_label,pageNumber:c.page_number,chunkOrdinal:c.chunk_ordinal}));
const cases=[
 ['What is my Season DUPR?','live_self_rating'],
 ['When is my Season DUPR established?','document_policy'],
 ['How is my Season DUPR determined?','document_policy'],
 ['When is Season DUPR locked?','document_policy'],
 ['Can my Season DUPR change during the season?','document_policy'],
 ['What is my PrimeTime Season DUPR?','live_self_rating'],
 ['When is my PrimeTime Season DUPR established?','document_policy'],
 ['What is my current official DUPR?','capability_limitation'],
];
const controls=cases.map(([question,expected])=>({question,expected,intent:questionIntent(question),live:liveIntent(question),selected:selectPolicyEvidence({request:{question},policyEvidence:{status:'complete',candidates}})}));
const q55=controls[1];assert.equal(q55.live,null);assert.equal(q55.selected.length,4);
for(const c of controls)for(const source of c.selected||[])for(const item of source.excerptItems){const stored=candidates.find(x=>x.chunkId===item.chunkId);assert.equal(stored.content.slice(item.start,item.end),item.text);}
const failedCompletion=selectPolicyEvidence({request:{question:q55.question},policyEvidence:{status:'unavailable',candidates:[]}});assert.deepEqual(failedCompletion,[]);
const faultControls=[];
for(const fault of ['build','rpc','timeout']){
 const logs=[];const db={rpc:()=>({abortSignal:()=>fault==='timeout'?new Promise(()=>{}):Promise.resolve({error:{code:'fixture_error'}})})};
 const ok=await persistQuality(db,()=>{if(fault==='build')throw Error('fixture_build');return {};},{budgetMs:10,log:(...args)=>logs.push(args)});
 assert.equal(ok,false);assert.deepEqual(logs,[['capture_failed','persistence']]);faultControls.push({fault,ok,logs});
}
const db=new PGlite();const shapes=[];
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create table public.members(id uuid primary key); grant usage on schema public,auth to service_role;');
 for(const name of ['supabase-ai-assistant-lms-0712-stage6.sql','supabase-ai-assistant-lms-0716-stage7a.sql'])await db.exec(fs.readFileSync(new URL('../'+name,import.meta.url),'utf8'));
 for(const [caseId,question,count] of [['Q23','when can i add plyers to my team',4],['Q36','Is Weekday all rally?',3]]){
  // Representative shape only: failed historical arguments were not retained.
  const execution={result:{kind:'answer'},answer:{model:'fixture-model',modelCallSkipped:false,selectedEvidence:candidates.slice(0,count).map(c=>({...c,excerptItems:[{text:'SENSITIVE_SENTINEL'}]}))},conversationResolution:{rawQuestion:question,effectiveQuestion:question,classification:'standalone'},retrieval:{candidates:[]}};
  const p_outcome=qualityOutcome({id:randomUUID(),origin:'player_interface',started:1000,completed:1100,execution});
  const args={p_outcome,...qualityException(p_outcome,execution),p_feedback_id:null};
  assert.equal(args.p_occurrence,null);assert.equal(JSON.stringify(args).includes('SENSITIVE_SENTINEL'),false);
  for(let i=0;i<2;i++)await db.query('select capture_ai_quality($1::jsonb,$2::jsonb,$3::jsonb,$4::uuid)',Object.values(args));
  const rows=await db.query('select count(*)::int as n from ai_request_outcomes where id=$1',[p_outcome.id]);assert.equal(rows.rows[0].n,1);
  shapes.push({caseId,selectedCount:count,representativeBytes:Buffer.byteLength(JSON.stringify(args)),payloadHasExcerpts:false,persisted:true,replayRows:1});
 }
}finally{await db.close();}
const result={diagnosisOnly:true,networkCalls:0,modelCalls:0,controls,failedCompletion,faultControls,shapes};
fs.writeFileSync(new URL('../../docs/lms-0725-q55-controls.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({controls:controls.map(({question,expected,intent,live,selected})=>({question,expected,intent:intent.kind,object:intent.object,live,selectedCount:selected?.length??null})),faultControls,shapes},null,2));
