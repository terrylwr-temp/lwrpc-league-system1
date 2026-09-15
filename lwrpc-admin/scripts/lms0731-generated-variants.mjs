// Bounded owner-authorized generation certification. No database connection or
// embeddings: reproduce the active policy using isolated source fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {revision,variants,row} from '../test/fixtures/lms0731-substitute.mjs';
process.loadEnvFile('.env.local');process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
const output='../docs/lms-0731-semantic-generated.json';
if(fs.existsSync(output))throw Error('Existing results: review before authorizing another run.');
const results=[];
for(const index of [1,0,3,4,5,8]){
 const question=variants[index];let calls=0,usage,requestedModel,returnedModel;
 const db={rpc:async name=>({data:name==='search_ai_approved_answers'?[row()]:[]})};
 const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question},embedQuery:async()=>({embedding:Array(1536).fill(.01)})});
 const answer=await generateOfficialAnswer({retrieval,supabase:db,resolveSources:async(_db,rows)=>rows.map(r=>({...r,citation:r.documentTitle})),fetchImpl:async(url,opts)=>{
  assert.equal(new URL(url).hostname,'api.openai.com');assert.equal(++calls,1);
  requestedModel=JSON.parse(opts.body).model;
  const response=await fetch(url,opts);const data=await response.clone().json();usage=data.usage;returnedModel=data.model;return response;
 }});
 const inverse=[1,3,4].includes(index);
 const passed=answer.evidenceSufficient&&!answer.conflict.requiresClarification&&answer.sources[0]?.approvedRevisionId===revision.id&&(!inverse||/^No\b/i.test(answer.answer));
 results.push({question,passed,answer:answer.answer,modelCalls:calls,requestedModel,returnedModel,category:'LOCAL_BENCHMARK',usage,metrics:answer.metrics,source:answer.sources[0]?.documentTitle,selection:retrieval.approvedRetrieval?.selection});
 fs.writeFileSync(output,JSON.stringify({method:'Isolated current-policy fixture, deterministic candidate score .5, real unchanged production answer model; no database/embedding/telemetry mutation. Six affected scenarios only, inverse first, stop on failure.',results},null,2));
 console.log(JSON.stringify({question,passed,calls,metrics:answer.metrics}));
 if(!passed)throw Error('Affected case failed; stop before further generation.');
}
