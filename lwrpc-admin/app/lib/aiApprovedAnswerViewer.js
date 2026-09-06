import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';
import {approvedSourceIdentity,ApprovedAnswerError} from './aiApprovedAnswersShared.js';
function key(){const secret=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE||process.env.SERVICE_ROLE_KEY;if(!secret)throw new ApprovedAnswerError('Viewer unavailable.',503);return createHash('sha256').update('lwr-approved-viewer-v1:').update(secret).digest();}
export function approvedViewerHref(source,user,now=Date.now()){
 const identity=approvedSourceIdentity(source);if(!identity.approvedRevisionId||!user)throw new ApprovedAnswerError('Invalid citation.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify({v:1,user,...identity,exp:now+900000})),cipher.final()]);
 const token=[iv,cipher.getAuthTag(),encrypted].map(b=>b.toString('base64url')).join('.');return `/approved-answer/${encodeURIComponent(token)}`;
}
export function readApprovedViewer(token,user,now=Date.now()){
 try{
  if(typeof token!=='string'||token.length>4096)throw new Error();const parts=token.split('.');if(parts.length!==3)throw new Error();
  const [iv,tag,data]=parts.map(p=>Buffer.from(p,'base64url'));const d=createDecipheriv('aes-256-gcm',key(),iv);d.setAuthTag(tag);
  const p=JSON.parse(Buffer.concat([d.update(data),d.final()]).toString());
  if(p.v!==1||p.user!==user||!Number.isFinite(p.exp)||p.exp<=now)throw new Error();approvedSourceIdentity(p);return p;
 }catch{throw new ApprovedAnswerError('Citation unavailable or expired.',403);}
}
