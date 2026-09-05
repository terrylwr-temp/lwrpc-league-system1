import { requireReviewRole, ReviewError, reviewReport, reviewDetail, reviewHistory, reviewAction, reviewSource } from './aiReviewService.js';

export async function handleReviewRequest(request, authorize) {
  const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  try {
    const auth=await authorize(request,'league_manager'); requireReviewRole(auth);
    const params=new URL(request.url).searchParams; let result;
    if(request.method==='GET') {
      const op=params.get('op') || 'report';
      if(op==='detail') result=await reviewDetail(auth.supabase,params,auth.user.id);
      else if(op==='history') result=await reviewHistory(auth.supabase,params,auth.user.id);
      else if(op==='report') result=await reviewReport(auth.supabase,params,auth.user.id);
      else throw new ReviewError('Invalid operation.');
    } else if(request.method==='POST') {
      const raw=await request.text(); if(Buffer.byteLength(raw)>10000) throw new ReviewError('Request too large.',413);
      let body; try{body=JSON.parse(raw);}catch{throw new ReviewError('Invalid request.');}
      if(params.get('op')==='source') result=await reviewSource(auth.supabase,body.answer,body.index,auth.user.id);
      else result=await reviewAction(auth.supabase,body,auth.user.id);
    } else throw new ReviewError('Method not allowed.',405);
    return Response.json({success:true,...result},{headers});
  } catch(error) {
    return Response.json({success:false,error:error instanceof ReviewError?error.message:'Review data is temporarily unavailable.'},{status:error instanceof ReviewError?error.status:503,headers});
  }
}
