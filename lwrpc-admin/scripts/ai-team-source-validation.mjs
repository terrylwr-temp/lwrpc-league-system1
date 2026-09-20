// Read-only current-source revalidation; no answer provider or history writes.
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {selectAnswerEvidenceWithAssistance,resolveOfficialSources}=await import('../app/lib/aiAnswerGeneration.js');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const questions=process.env.AI_QUESTIONS?.split('|').filter(Boolean)||['Can we have players on multiple teams?','Can I play on two teams?','Are players limited to only one roster?','Can a player be rostered on more than one team?'];
for(const question of questions){
  const retrieval=await retrieveOfficialEvidence({supabase:db,body:{question}});
  const selected=await selectAnswerEvidenceWithAssistance(retrieval);
  const sources=await resolveOfficialSources(db,selected);
  console.log(JSON.stringify({question,selected:selected.map(c=>({id:c.chunkId,content:c.content})),sources:sources.map(s=>({versionId:s.documentVersionId,chunkId:s.chunkId,ruleNumber:s.ruleNumber,citation:s.citation,hasSignedUrl:Boolean(s.officialDocumentUrl)}))}));
}
