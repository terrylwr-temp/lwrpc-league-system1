import fs from 'node:fs';import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.local');process.env.LWR_AI_ENABLED='true';
const {fixture,replay}=await import('./lms0722-replay-fixture.mjs');
const {generateOfficialAnswer}=await import('../app/lib/aiAnswerGeneration.js');
const {retrieveOfficialEvidence}=await import('../app/lib/aiRetrieval.js');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const output='../docs/lms-0722-production-benchmark.json';
const only=process.env.BENCH_ONLY?.split('|');
const results=only&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output)).results.filter(r=>!only.includes(r.question)):[];
for(const c of fixture.cases.filter(c=>!only||only.includes(c.question))){
 const begin=performance.now();let calls=0;let a;
 if(c.navigation){const r=await retrieveOfficialEvidence({supabase:db,body:{question:c.question}});a={r};}else a=await replay(c,{select:false});
 const answer=a.clarification?{answer:a.clarification.clarification.message,evidenceSufficient:false,modelCallSkipped:true,sources:[],kind:'clarification'}:await generateOfficialAnswer({retrieval:a.r,supabase:db,fetchImpl:async(...args)=>{calls++;return fetch(...args);}});
 const safe={question:c.question,kind:answer.kind|| (answer.conflict?.requiresClarification?'conflict':answer.evidenceSufficient?'answer':'insufficient_evidence'),answer:answer.answer,modelCalls:calls,model:answer.model,metrics:answer.metrics,wallMs:Math.round(performance.now()-begin),sources:(answer.sources||[]).map(x=>({documentTitle:x.documentTitle,documentVersionId:x.documentVersionId,chunkId:x.chunkId,pageNumber:x.pageNumber,ruleNumber:x.ruleNumber,citation:x.citation})),selected:(answer.selectedEvidence||[]).map(x=>({chunkId:x.chunkId,content:x.content,scope:x.passageScopes}))};
 results.push(safe);fs.writeFileSync('../docs/lms-0722-production-benchmark.json',JSON.stringify({method:'Captured current production-format retrieval replay; live configured answer model and live active-source validation; no route or Stage 7 writes; navigation uses live active catalog.',results},null,2));console.log(JSON.stringify({question:c.question,kind:safe.kind,modelCalls:calls,ms:safe.wallMs}));
}

