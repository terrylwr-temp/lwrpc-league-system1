import { rejectViewAsMutation } from '../../../lib/viewAsBoundary.js';
import {authenticateLive,liveAuthFailure} from '../../../lib/liveLmsService.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const viewAsDenied = rejectViewAsMutation(request);
  if (viewAsDenied) return viewAsDenied;
 const headers={'Cache-Control':'private, no-store'};
 try{
  const p=await authenticateLive(request);
  const {data,error}=await p.supabase.rpc('ai_live_review',{p_actor:p.user.id});
  if(error)throw new Error('live_review');
  return Response.json({success:true,...data},{headers});
 }catch(error){
  const failure=liveAuthFailure(error);if(failure)return Response.json(failure.body,{status:failure.status,headers});
return Response.json({success:false,error:'Live diagnostics are unavailable for this account.'},{status:403,headers});}
}
