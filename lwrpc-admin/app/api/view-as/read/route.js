import {DEFAULT_SYSTEM_SETTINGS} from "../../../lib/systemSettings.js";
import {validScheduleNameArgs} from '../../../lib/scheduleCaptainNames.js';
import {scopedProfileImage} from "../../../lib/viewAsPageAssets.js";
import {LEAGUE_DOCUMENT_TYPES,leagueDocumentPath,normalizeLeagueDocumentBucket} from "../../../lib/leagueDocuments.js";
import {normalizeGuideDocument} from "../../../lib/dashboardGuides.js";
import {visibleDashboardGuideKeys,canBrowseLeagueDocument} from "../../../lib/askLwrAssistantConfig.js";
import {viewAsSourceFamily} from '../../../lib/aiResultSource.js';
import {needsEligibility} from '../../../lib/aiEligibilityIntent.js';
import {runEligibility} from '../../../lib/aiEligibilityService.js';
import {randomUUID} from 'node:crypto';
import {resolveEffectiveViewer,viewRpc,viewError,ViewAsError} from '../../../lib/viewAsServer.js';
import {needsLive,runLive} from '../../../lib/liveLmsService.js';
import {runPlayerOfficialAnswer} from '../../../lib/askLwrPlayerAnswer.js';
import {retrieveOfficialEvidence} from '../../../lib/aiRetrieval.js';
import {generateOfficialAnswer} from '../../../lib/aiAnswerGeneration.js';
import {resolveOfficialDocumentViewerSource} from '../../../lib/aiOfficialDocumentViewer.js';
import {readApprovedViewer} from '../../../lib/aiApprovedAnswerViewer.js';
import {publicApprovedRevision,approvedBoundSource} from '../../../lib/aiApprovedAnswersService.js';
export const runtime='nodejs';
export async function POST(req){
 try {
  const raw=await req.text();if(raw.length>16000)throw new ViewAsError('Request too large.',413);
  const body=JSON.parse(raw);if(!body || typeof body!=='object'||Array.isArray(body))throw new ViewAsError();
  if(Object.keys(body).some(k=>!['operation','question','conversationReceipt','source','contract','args','key','leagueId'].includes(k)))throw new ViewAsError();
  const validationStarted=performance.now();
  const v=await resolveEffectiveViewer(req);
  const validationMs=performance.now()-validationStarted;
  const base={id:v.record.id,actor:v.principal.user.id,browser:v.browser,context:v.context};
  const call=(op,extra={})=>viewRpc(v.client,op,{...base,...extra});
  const headers={'Server-Timing':`viewas;dur=${validationMs.toFixed(1)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  if(body.operation==='status')return Response.json({viewer:v.viewer},{headers});
  if(body.operation==='exit')return Response.json(await call('end'),{headers});
  if(body.operation==='page'){
   const dashboard=body.contract==='dashboard'&&body.args&&typeof body.args==='object'&&!Array.isArray(body.args)&&Object.keys(body.args).length===0;
   if(!dashboard&&!(body.contract==='schedule_captains'&&validScheduleNameArgs(body.args)))throw new ViewAsError();
   const page=await call('page_read',{contract:body.contract,args:body.args});
   await resolveEffectiveViewer(req);
   return Response.json(page,{headers});
  }
  if(body.operation==='logo'){
   const page=await call('page_read',{contract:'dashboard',args:{}});
   const value=page.tables.system_settings.find(r=>r.setting_key==='logo_url')?.setting_value||DEFAULT_SYSTEM_SETTINGS.logo_url;
   let data;
   if(value===DEFAULT_SYSTEM_SETTINGS.logo_url){const response=await fetch(value,{redirect:'error',signal:AbortSignal.timeout(5000)});if(response.ok)data=await response.blob();}
   else {const url=new URL(value),storage=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL),prefix='/storage/v1/object/public/';
    if(url.origin!==storage.origin||url.search||url.hash||url.username||url.password||!url.pathname.startsWith(prefix))throw new ViewAsError('Logo unavailable.',404);
    const [bucket,...parts]=decodeURIComponent(url.pathname.slice(prefix.length)).split('/');if(!bucket||!parts.length||parts.some(p=>!p||p==='..'||p==='.'))throw new ViewAsError();
    ({data}=await v.client.storage.from(bucket).download(parts.join('/')));
   }
   if(!data||data.size>2000000||!['image/jpeg','image/png','image/webp'].includes(data.type))throw new ViewAsError('Logo unavailable.',404);
   await resolveEffectiveViewer(req);return new Response(data,{headers:{...headers,'Content-Type':data.type}});
  }
  if(body.operation==='profile_image'){
   const page=await call('page_read',{contract:'dashboard',args:{}});
   const image=scopedProfileImage(page,body.key,process.env.NEXT_PUBLIC_SUPABASE_URL);
   if(!image)throw new ViewAsError('Profile image unavailable.',404);
   const {data,error}=await v.client.storage.from(image.bucket).download(image.path);
   if(error||!data||data.size>2000000||!['image/jpeg','image/png','image/webp'].includes(data.type))throw new ViewAsError('Profile image unavailable.',404);
   await resolveEffectiveViewer(req);
   return new Response(data,{headers:{...headers,'Content-Type':data.type}});
  }
  if(body.operation==='league_document'){
   const type=LEAGUE_DOCUMENT_TYPES.find(t=>t.key===body.key);
   if(!type||!canBrowseLeagueDocument(v.viewer.role,type.key)||typeof body.leagueId!=='string')throw new ViewAsError();
   const page=await call('page_read',{contract:'dashboard',args:{}});
   const league=page.tables.leagues.find(l=>l.id===body.leagueId);
   const related=page.tables.teams.some(t=>page.viewer.teams.includes(t.id)&&page.tables.divisions.some(d=>d.id===t.division_id&&d.league_id===league?.id));
   const path=leagueDocumentPath(league,type);
   if(!related||!path||!path.toLowerCase().endsWith('.pdf')||path.split('/').includes('..'))throw new ViewAsError('This document is unavailable.',404);
   const {data,error}=await v.client.storage.from(normalizeLeagueDocumentBucket(league.league_document_bucket)).download(path);
   if(error||!data)throw new ViewAsError('This document is unavailable.',404);
   await resolveEffectiveViewer(req);
   return new Response(data,{headers:{...headers,'Content-Type':'application/pdf'}});
  }
  if(body.operation==='guide'){
   if(typeof body.key!=='string'||!visibleDashboardGuideKeys(v.viewer.role).includes(body.key))throw new ViewAsError();
   const page=await call('page_read',{contract:'dashboard',args:{}});
   const template=page.tables.notification_templates.find(r=>r.template_key===body.key);
   let document;try{document=normalizeGuideDocument(JSON.parse(template?.body||'{}'));}catch{document=normalizeGuideDocument({path:template?.body||''});}
   if(!document.path||!document.path.toLowerCase().endsWith('.pdf')||document.path.split('/').includes('..'))throw new ViewAsError('This guide is unavailable.',404);
   const {data,error}=await v.client.storage.from(document.bucket).download(document.path);
   if(error||!data)throw new ViewAsError('This guide is unavailable.',404);
   await resolveEffectiveViewer(req);
   return new Response(data,{headers:{...headers,'Content-Type':'application/pdf'}});
  }
  if(body.operation==='source'){
   if(typeof body.source!=='string' || body.source.length>8192)throw new ViewAsError();
   const match=body.source.match(/^\/(official-document|approved-answer)\/([^/?#]+)$/);if(!match)throw new ViewAsError();
   const token=decodeURIComponent(match[2]);
   if(match[1]==='approved-answer'){
    const claims=readApprovedViewer(token,v.record.id);
    const revision=await publicApprovedRevision(v.client,claims.approvedRevisionId,claims.contentHash);
    if(revision.answer_id!==claims.approvedAnswerId)throw new ViewAsError();
    const related=revision.related_chunk_id?await approvedBoundSource(v.client,revision):null;
    await resolveEffectiveViewer(req);
    return Response.json({revision,related},{headers});
   }
   const source=await resolveOfficialDocumentViewerSource(v.client,token,v.record.id);
   const {data,error}=await v.client.storage.from(source.storageBucket).download(source.storagePath);
   if(error||!data)throw new ViewAsError('Source unavailable.',404);
   await resolveEffectiveViewer(req);
   return new Response(data,{headers:{...headers,'Content-Type':'application/pdf','X-Document-Title':encodeURIComponent(source.documentTitle||'Official Document'),'X-Document-Citation':encodeURIComponent(source.citation||''),'X-Document-Page':String(source.pageNumber||1)}});
  }
  if(body.operation!=='ask'||typeof body.question!=='string'||body.question.length>2400||!body.question.trim())throw new ViewAsError();
  const started=Date.now(),request=randomUUID();let result;
  const question={question:body.question,conversationReceipt:body.conversationReceipt};
  if(needsEligibility(question)){
   result=await runEligibility({body:question,principal:{...v.principal,receiptBinding:`view_as:${v.record.id}:${v.principal.receiptBinding}`,supabase:v.client},viewerId:v.record.id,origin:'view_as',lookup:async query=>({data:await call('live',{request,query})}),persist:async()=>{}});
   if(!result)question.conversationReceipt=null;
  }
  if(!result&&needsLive(question)){
   result=await runLive({body:question,principal:{...v.principal,receiptBinding:`view_as:${v.record.id}:${v.principal.receiptBinding}`,supabase:v.client},
    origin:'view_as',lookup:async query=>({data:await call('live',{request,query})}),persist:async()=>{}});
   if(!result)question.conversationReceipt=null;
  }
  const family=result?viewAsSourceFamily(result):'document';
  if(!result && (await call('reserve_document')).rate_limited)throw new ViewAsError('Diagnostic question limit reached. Please try again later.',429);
  if(!result)({result}=await runPlayerOfficialAnswer({body:question,role:v.viewer.role,userId:v.record.id,supabase:v.client,answerId:request,diagnosticOrigin:"view_as",retrieveOfficialEvidence,generateOfficialAnswer}));
  // Revalidate after potentially slow retrieval/model execution, before disclosing.
  await resolveEffectiveViewer(req);
  delete result.feedbackReceipt;
  if(result.provenance)console.info('view_as_source_classification',{request,...result.provenance});
  try{await call('diagnostic',{request,family,kind:result.kind,total_ms:Date.now()-started});}catch{/* No raw question, answer, identity or facts in diagnostic logs. */}
  return Response.json({result},{headers});
 }catch(error){return viewError(error);}
}
