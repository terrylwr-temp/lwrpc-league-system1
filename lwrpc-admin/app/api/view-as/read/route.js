import {randomUUID} from 'node:crypto';
import {resolveEffectiveViewer,viewRpc,viewError,ViewAsError} from '../../../lib/viewAsServer.js';
import {needsLive,runLive} from '../../../lib/liveLmsService.js';
import {runPlayerOfficialAnswer} from '../../../lib/askLwrPlayerAnswer.js';
import {retrieveOfficialEvidence} from '../../../lib/aiRetrieval.js';
import {generateOfficialAnswer} from '../../../lib/aiAnswerGeneration.js';
import {resolveOfficialDocumentViewerSource} from '../../../lib/aiOfficialDocumentViewer.js';
import {readApprovedViewer} from '../../../lib/aiApprovedAnswerViewer.js';
import {publicApprovedRevision} from '../../../lib/aiApprovedAnswersService.js';
export const runtime='nodejs';
export async function POST(req){
 try {
  const raw=await req.text();if(raw.length>16000)throw new ViewAsError('Request too large.',413);
  const body=JSON.parse(raw);if(!body || typeof body!=='object'||Array.isArray(body))throw new ViewAsError();
  if(Object.keys(body).some(k=>!['operation','question','conversationReceipt','source'].includes(k)))throw new ViewAsError();
  const validationStarted=performance.now();
  const v=await resolveEffectiveViewer(req);
  const validationMs=performance.now()-validationStarted;
  const base={id:v.record.id,actor:v.principal.user.id,browser:v.browser,context:v.context};
  const call=(op,extra={})=>viewRpc(v.client,op,{...base,...extra});
  const headers={'Server-Timing':`viewas;dur=${validationMs.toFixed(1)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  if(body.operation==='status')return Response.json({viewer:v.viewer},{headers});
  if(body.operation==='exit')return Response.json(await call('end'),{headers});
  if(body.operation==='snapshot')return Response.json(await call('snapshot'),{headers});
  if(body.operation==='source'){
   if(typeof body.source!=='string' || body.source.length>8192)throw new ViewAsError();
   const match=body.source.match(/^\/(official-document|approved-answer)\/([^/?#]+)$/);if(!match)throw new ViewAsError();
   const token=decodeURIComponent(match[2]);
   if(match[1]==='approved-answer'){
    const claims=readApprovedViewer(token,v.record.id);
    const revision=await publicApprovedRevision(v.client,claims.approvedRevisionId,claims.contentHash);
    if(revision.answer_id!==claims.approvedAnswerId)throw new ViewAsError();
    return Response.json({revision},{headers});
   }
   const source=await resolveOfficialDocumentViewerSource(v.client,token,v.record.id);
   const {data,error}=await v.client.storage.from(source.storageBucket).download(source.storagePath);
   if(error||!data)throw new ViewAsError('Source unavailable.',404);
   return new Response(data,{headers:{...headers,'Content-Type':'application/pdf'}});
  }
  if(body.operation!=='ask'||typeof body.question!=='string'||body.question.length>2400||!body.question.trim())throw new ViewAsError();
  const started=Date.now(),request=randomUUID();let result;
  const question={question:body.question,conversationReceipt:body.conversationReceipt};
  if(needsLive(question)){
   result=await runLive({body:question,principal:{...v.principal,receiptBinding:`view_as:${v.record.id}:${v.principal.receiptBinding}`,supabase:v.client},
    origin:'view_as',lookup:async query=>({data:await call('live',{request,query})}),persist:async()=>{}});
   if(!result)question.conversationReceipt=null;
  }
  const family=result?'LIVE_LMS_DATA':'document';
  if(!result && (await call('reserve_document')).rate_limited)throw new ViewAsError('Diagnostic question limit reached. Please try again later.',429);
  if(!result)({result}=await runPlayerOfficialAnswer({body:question,role:v.viewer.role,userId:v.record.id,supabase:v.client,answerId:request,retrieveOfficialEvidence,generateOfficialAnswer}));
  // Revalidate after potentially slow retrieval/model execution, before disclosing.
  await resolveEffectiveViewer(req);
  delete result.feedbackReceipt;
  try{await call('diagnostic',{request,family,kind:result.kind,total_ms:Date.now()-started});}catch{/* No raw question, answer, identity or facts in diagnostic logs. */}
  return Response.json({result},{headers});
 }catch(error){return viewError(error);}
}
