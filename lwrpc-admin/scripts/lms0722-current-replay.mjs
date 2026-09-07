import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');process.env.LWR_AI_ENABLED='true';
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const {selectAnswerEvidenceWithAssistance}=await import('../app/lib/aiAnswerGeneration.js');
const {resolveConversationTurn,clarificationFromRetrieval}=await import('../app/lib/aiConversation.js');
const {isUnsupportedOperationalQuestion}=await import('../app/lib/askLwrPlayerAnswer.js');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:chunks,error}=await db.from('ai_document_chunks').select('id,document_version_id,chunk_ordinal,page_number,rule_number,heading,section_label,content,is_searchable').eq('document_version_id','e4d9bf77-e15e-4d80-84ba-2f7259970ba6').order('chunk_ordinal');if(error)throw new Error('Current source read failed');fs.writeFileSync('../docs/lms-0722-current-rules-fixture.json',JSON.stringify(chunks,null,2));
const base=JSON.parse(fs.readFileSync('../docs/lms-0722-diagnostic-replay.json'));const cases=process.env.REPLAY_ONLY?JSON.parse(fs.readFileSync('../docs/lms-0722-current-replay.json')).cases.filter(c=>c.question!==process.env.REPLAY_ONLY):[];
const questions=[...new Map(base.cases.map(x=>[x.family,base.cases.find(c=>c.family===x.family).question])).values(), 'Can I stand in the kitchen when I am not volleying?','How many players play in a Weekday 9.1 match?','What is the PrimeTime Picklebreaker format?',"We are currently trying to order a blouse for our team. Are there any color restrictions?"];
for(const question of (process.env.REPLAY_ONLY?[process.env.REPLAY_ONLY]:questions)){
 let searches=[];const client=new Proxy(db,{get(target,key){if(key==='rpc')return async(name,args)=>{const out=await target.rpc(name,args);if(name==='search_ai_official_chunks')searches.push({query:args.p_query_text,rows:out.data,error:Boolean(out.error)});return out;};return Reflect.get(target,key);}});
 const resolution=resolveConversationTurn({question,userId:'synthetic-local-replay'});let result={question,resolution,protected:isUnsupportedOperationalQuestion(question)};
 if(resolution.kind==='resolved'&&!result.protected){const r=await retrieveOfficialEvidence({supabase:client,body:{question}});const clarification=clarificationFromRetrieval(resolution,r);const selected=clarification?[]:await selectAnswerEvidenceWithAssistance(r);result={...result,clarification,selected,searches,metrics:r.metrics,conceptContext:r.conceptContext,conceptAssistance:r.conceptAssistance,navigation:r.documentNavigation};}
 cases.push(result);fs.writeFileSync('../docs/lms-0722-current-replay.json',JSON.stringify({version:'e4d9bf77-e15e-4d80-84ba-2f7259970ba6',cases},null,2));console.log(JSON.stringify({question,kind:result.protected?'protected':result.clarification?.kind||resolution.kind,count:result.selected?.length,navigation:result.navigation?.status}));
}
