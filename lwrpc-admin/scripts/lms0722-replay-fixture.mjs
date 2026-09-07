import fs from 'node:fs';
import {retrieveOfficialEvidence} from '../app/lib/aiRetrieval.js';
import {selectAnswerEvidenceWithAssistance} from '../app/lib/aiAnswerGeneration.js';
import {clarificationFromRetrieval,resolveConversationTurn} from '../app/lib/aiConversation.js';
export const fixture=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0722-current-replay.json',import.meta.url)));
const chunks=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0722-current-rules-fixture.json',import.meta.url)));
export function queryRows(rows){let data=rows;const q={select(){return q},eq(k,v){data=data.filter(x=>x[k]===v);return q},in(k,v){data=data.filter(x=>v.includes(x[k]));return q},order(){return q},limit(n){data=data.slice(0,n);return q},maybeSingle:async()=>({data:data[0]||null}),then(resolve){return Promise.resolve({data}).then(resolve)}};return q;}
export async function replay(c,{select=true}={}){
 let calls=0,embeddings=0;
 const db={from:table=>{if(table==='ai_document_chunks')return queryRows(chunks);throw new Error('Unexpected read '+table);},rpc:async(name,args)=>{if(name!=='search_ai_official_chunks')return {data:[]};const s=c.searches[calls++];if(!s)throw new Error('Unrecorded search');if(s.query!==args.p_query_text)throw new Error('Projection differs: '+args.p_query_text);return {data:structuredClone(s.rows)};}};
 const r=await retrieveOfficialEvidence({supabase:db,body:{question:c.question},embedQuery:async()=>{embeddings++;return {embedding:Array(1536).fill(.017)};}});
 const resolution=resolveConversationTurn({question:c.question,userId:'fixture-user'});const clarification=clarificationFromRetrieval(resolution,r);
 const selected=clarification||!select?[]:await selectAnswerEvidenceWithAssistance(r);
 return {r,selected,clarification,calls,embeddings};
}
if(process.argv[1]?.endsWith('lms0722-replay-fixture.mjs')){for(const c of fixture.cases.filter(c=>c.searches?.length)){let a=await replay(c);console.log(JSON.stringify({q:c.question,count:a.selected.length,kind:a.clarification?'clarification':a.selected.length?'answer':'insufficient',rules:a.selected.map(x=>x.ruleNumber),content:a.selected.map(x=>x.content).join('\n')}));}}
