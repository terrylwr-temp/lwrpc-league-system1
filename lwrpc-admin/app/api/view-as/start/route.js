import {startViewAs,viewError,ViewAsError} from '../../../lib/viewAsServer.js';
import {authenticateRequestIdentity,createAdminSupabase} from '../../../lib/serverSupabase.js';
import {viewAsOrigins,requestOrigin,rejectViewAsMutation} from '../../../lib/viewAsBoundary.js';
export async function GET(req){try{
 const origins=viewAsOrigins();if(!origins||requestOrigin(req)!==origins.normal||rejectViewAsMutation(req))throw new ViewAsError();
 const principal=await authenticateRequestIdentity(req);
 const target=new URL(req.url).searchParams.get('target');
 if(target!==null&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(target))throw new ViewAsError();
 const {data,error}=await createAdminSupabase().rpc('lms_view_as',{p_op:target?'preflight':'can_start',p_input:{actor:principal.user.id,...(target?{target}:{})}});
 if(error||!data?.allowed)throw new ViewAsError();
 return Response.json({origin:origins.view,...(target?{name:data.name}:{})},{headers:{'Cache-Control':'no-store'}});
}catch(error){return viewError(error);}}
export async function POST(req){try{const raw=await req.text();if(raw.length>2000)throw new ViewAsError();return Response.json(await startViewAs(req,JSON.parse(raw)),{headers:{'Cache-Control':'no-store'}});}catch(error){return viewError(error);}}
