import {authorizeAdminRequest} from '../../lib/serverSupabase';
import {readApprovedViewer} from '../../lib/aiApprovedAnswerViewer.js';
import {publicApprovedRevision,approvedFormalSource} from '../../lib/aiApprovedAnswersService.js';
export const runtime='nodejs';
export async function GET(request){
 const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
 try{
  const auth=await authorizeAdminRequest(request,'player');if(auth.error)return Response.json({error:'Sign in to view this citation.'},{status:auth.status,headers});
  const claims=readApprovedViewer(new URL(request.url).searchParams.get('citation'),auth.user.id);
  const revision=await publicApprovedRevision(auth.supabase,claims.approvedRevisionId,claims.contentHash);
  if(revision.answer_id!==claims.approvedAnswerId)throw new Error('identity');
  const related=revision.related_chunk_id?await approvedFormalSource(auth.supabase,revision.related_chunk_id):null;
  return Response.json({success:true,revision,related},{headers});
 }catch(error){return Response.json({success:false,error:'This approved citation is unavailable or has expired.'},{status:error.status||404,headers});}
}
