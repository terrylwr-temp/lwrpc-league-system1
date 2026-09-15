// Four owner-authorized affected cases only; fixtures, no DB/embedding traffic.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {retrieval,database} from '../test/fixtures/lms0732-documents.mjs';
process.loadEnvFile('.env.local');process.env.LWR_AI_ENABLED='true';
const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
const output='../docs/lms-0732-generated.json';
if(fs.existsSync(output))throw Error('Existing results: no automatic rerun.');
const questions=["I'm trying to sign up our team for the 2026 Fall PrimeTime DUPR league. Will you send me step-by-step instructions?",'When will you send out the schedules?','When will the 2026 Fall PrimeTime schedules be released?','How do I register a Saturday team for the 26/27 Saturday Season?'];
const results=[];
for(const question of questions){let calls=0,usage,requestedModel,returnedModel;
 const answer=await generateOfficialAnswer({retrieval:retrieval(question),supabase:database(),fetchImpl:async(url,opts)=>{assert.equal(new URL(url).hostname,'api.openai.com');assert.equal(++calls,1);requestedModel=JSON.parse(opts.body).model;assert.equal(requestedModel,'gpt-5.5');const response=await fetch(url,opts);const body=await response.clone().json();usage=body.usage;returnedModel=body.model;return response;}});
 const registration=/register|sign up/i.test(question);
 const passed=answer.evidenceSufficient&&!answer.conflict.requiresClarification&&(registration?/payment/i.test(answer.answer)&&/activat/i.test(answer.answer)&&/unlock/i.test(answer.answer)&&answer.sources.length===2:/October 7|Oct\.? 7/i.test(answer.answer));
 results.push({question,passed,answer:answer.answer,sources:answer.sources.map(s=>({title:s.documentTitle,page:s.pageNumber,chunkId:s.chunkId})),modelCalls:calls,requestedModel,returnedModel,category:'LOCAL_BENCHMARK',usage,metrics:answer.metrics});
 fs.writeFileSync(output,JSON.stringify({method:'Four affected generations using verified official-document fixtures and real source revalidation against isolated database mock. No production, embedding, telemetry writes or Live data.',results},null,2)+'\n');
 console.log(JSON.stringify({question,passed,calls,usage}));if(!passed)throw Error('Affected case failed; stop remaining model calls.');
}
