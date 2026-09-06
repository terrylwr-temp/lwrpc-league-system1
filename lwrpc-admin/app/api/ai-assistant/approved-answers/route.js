import {authorizeAdminRequest} from '../../../lib/serverSupabase';
import {requireReviewRole} from '../../../lib/aiReviewService.js';
import {ApprovedAnswerError} from '../../../lib/aiApprovedAnswersShared.js';
import {approvedList,approvedDetail,approvedCase,approvedPreflight,approvedMutation,approvedFormalSource,approvedSourceReview} from '../../../lib/aiApprovedAnswersService.js';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
async function handle(request){
 try{
  const auth=await authorizeAdminRequest(request,'league_manager');requireReviewRole(auth);
  const params=new URL(request.url).searchParams;let result;
  if(request.method==='GET'){
   const op=params.get('op')||'list';
   if(op==='list')result=await approvedList(auth.supabase);
   else if(op==='detail')result=await approvedDetail(auth.supabase,params.get('id'));
   else if(op==='case')result=await approvedCase(auth.supabase,params.get('id'));
   else if(op==='evidence')result={sources:await approvedSourceReview(auth.supabase,String(params.get('question')||'').slice(0,2400))};
   else if(op==='source')result={source:await approvedFormalSource(auth.supabase,params.get('id'))};
   else throw new ApprovedAnswerError('Invalid operation.');
  }else{
   const raw=await request.text();if(Buffer.byteLength(raw)>48000)throw new ApprovedAnswerError('Request too large.',413);
   let body;try{body=JSON.parse(raw);}catch{throw new ApprovedAnswerError('Invalid request.');}
   result=body.action==='preflight'?await approvedPreflight(auth.supabase,body.id,auth.user.id):await approvedMutation(auth.supabase,body,auth.user.id);
  }
  return Response.json({success:true,...result},{headers});
 }catch(error){return Response.json({success:false,error:['ApprovedAnswerError','ReviewError'].includes(error.name)?error.message:'Approved Answers unavailable.'},{status:Number(error.status)||503,headers});}
}
export const GET=handle;
export const POST=handle;
