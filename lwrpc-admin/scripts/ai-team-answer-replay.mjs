// Read-only final answer replay. Uses the normal source-validation and model path.
import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const questions=(process.env.AI_QUESTIONS||'Can we have players on multiple teams?|Can I play on two teams?|Are players limited to only one roster?|Can a player be rostered on more than one team?').split('|');
const results=[];
for(const question of questions){
  const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question}});
  const answer=await generateOfficialAnswer({retrieval,supabase:db});
  results.push({question,answer:answer.answer,kind:answer.kind,model:answer.model,metrics:answer.metrics||null,selected:answer.selectedEvidence?.map(c=>({id:c.chunkId,versionId:c.documentVersionId,rule:c.ruleNumber,content:c.content})),sources:answer.sources?.map(s=>({documentId:s.documentId,versionId:s.documentVersionId,chunkId:s.chunkId,ruleNumber:s.ruleNumber,citation:s.citation})),queryUnderstanding:{status:retrieval.queryUnderstanding?.status,paths:retrieval.queryUnderstanding?.paths?.map(p=>({kind:p.kind,query:p.query,candidateCount:p.candidates?.length})),fallbackReason:retrieval.queryUnderstanding?.fallbackReason}});
  console.log(JSON.stringify({question,answer:answer.answer,kind:answer.kind,selectedIds:results.at(-1).selected?.map(s=>s.id)}));
}
fs.writeFileSync('../docs/ai-multiple-team-answer-replay.json',JSON.stringify({recordedAt:new Date().toISOString(),method:'Read-only normal generation with active-source revalidation; no feedback/quality writes.',results},null,2)+'\n');
