import {randomUUID} from 'node:crypto';
import {createAdminSupabase,authenticateRequestIdentity} from './serverSupabase.js';
import {viewAsOrigins,requestOrigin,VIEW_AS_COOKIE,isolatedRequestAllowed} from './viewAsBoundary.js';
import {opaque,digest,validOpaque,sealAdminCredential,openAdminCredential} from './viewAsCrypto.js';

export class ViewAsError extends Error {constructor(message='View As User is unavailable or expired.',status=403){super(message);this.status=status;}}
export function viewError(error) {return Response.json({success:false,error:error instanceof ViewAsError?error.message:'View As User is temporarily unavailable.'},{status:error instanceof ViewAsError?error.status:503,headers:{'Cache-Control':'private, no-store'}});}
export function assertViewOrigin(req){if(!isolatedRequestAllowed(req,viewAsOrigins()))throw new ViewAsError();}
export function binding(req){const raw=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(`${VIEW_AS_COOKIE}=`))?.slice(VIEW_AS_COOKIE.length+1);if(!validOpaque(raw))throw new ViewAsError();return raw;}
export const viewCookie = value => `${VIEW_AS_COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict`;
export async function viewRpc(client,op,input){const {data,error}=await client.rpc('lms_view_as',{p_op:op,p_input:input}).abortSignal(AbortSignal.timeout(5000));if(error)throw new ViewAsError('View As User is temporarily unavailable.',503);if(!data || data.denied)throw new ViewAsError(data?.message);return data;}
export async function startViewAs(req,body){
 const origins=viewAsOrigins();if(!origins || requestOrigin(req)!==origins.normal || req.headers.get('origin')!==origins.normal || req.headers.has('x-view-as-context'))throw new ViewAsError();
 if(!validOpaque(body.challenge)||typeof body.target!=='string')throw new ViewAsError();
 const principal=await authenticateRequestIdentity(req),token=req.headers.get('authorization').slice(7);
 const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
 const id=randomUUID(),code=opaque();
 const result=await viewRpc(createAdminSupabase(),'start',{id,actor:principal.user.id,target:body.target,binding:principal.receiptBinding,browser:body.challenge,code:digest(code),credential:sealAdminCredential(token,id),expires:new Date(Math.min(Date.now()+1800000,claims.exp*1000)).toISOString()});
 return {origin:origins.view,code,expires:result.expires};
}
async function authenticateStored(record){
 const token=openAdminCredential(record.credential,record.id);
 const principal=await authenticateRequestIdentity(new Request('https://internal.invalid/',{headers:{authorization:`Bearer ${token}`}}));
 if(principal.user.id!==record.actor || principal.receiptBinding!==record.binding)throw new ViewAsError();
 return principal;
}
export async function exchangeViewAs(req,body){
 assertViewOrigin(req);if(!validOpaque(body.code)||Object.keys(body).some(k=>k!=='code'))throw new ViewAsError();
 const client=createAdminSupabase(),browser=digest(binding(req));
 const record=await viewRpc(client,'load_handoff',{code:digest(body.code),browser});
 const principal=await authenticateStored(record),context=opaque();
 const viewer=await viewRpc(client,'exchange',{id:record.id,actor:principal.user.id,code:digest(body.code),browser,context:digest(context)});
 return {context,viewer};
}
export async function resolveEffectiveViewer(req){
 assertViewOrigin(req);const context=req.headers.get('x-view-as-context');if(!validOpaque(context))throw new ViewAsError();
 const client=createAdminSupabase(),browser=digest(binding(req));
 const record=await viewRpc(client,'load',{context:digest(context),browser});
 let principal;
 try { principal=await authenticateStored(record); }
 catch(error){
  if(error.status===401){try{await viewRpc(client,'end',{id:record.id,actor:record.actor,context:digest(context),browser});}catch{/* Fail closed even when termination persistence is unavailable. */}throw new ViewAsError('View As User authentication expired.');}
  throw new ViewAsError('View As User authentication is temporarily unavailable.',503);
 }
 const viewer=await viewRpc(client,'resolve',{id:record.id,actor:principal.user.id,context:digest(context),browser});
 return {client,viewer,record,principal,context:digest(context),browser};
}
