import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes} from 'node:crypto';
function key(){const secret=process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;if(!secret)throw new Error('live_configuration');return createHash('sha256').update('LMS-live-receipts-v1\0'+secret).digest();}
export function liveSessionBinding(userId, sessionId) { return createHmac('sha256',key()).update('LMS-live-session-binding-v1\0'+userId+'\0'+sessionId).digest('hex'); }
export const isLiveReceipt = value => typeof value==='string' && value.startsWith('live1.');
export function sealLive(purpose,principal,payload,now=Date.now()) {
 if(!principal.receiptBinding)throw new Error('live_receipt_invalid');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
 const data=Buffer.concat([cipher.update(JSON.stringify({purpose,user:principal.user.id,binding:principal.receiptBinding,expires:now+(purpose==='feedback'?86400000:300000),payload}),'utf8'),cipher.final()]);
 return 'live1.'+Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');
}
export function openLive(value,purpose,principal,now=Date.now()) {
 try{
  if(!isLiveReceipt(value)||value.length>12000)throw new Error();
  const b=Buffer.from(value.slice(6),'base64url'),decipher=createDecipheriv('aes-256-gcm',key(),b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));
  const c=JSON.parse(Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString('utf8'));
  if(c.purpose!==purpose||c.user!==principal.user.id||!principal.receiptBinding||c.binding!==principal.receiptBinding||c.expires<=now)throw new Error();
  return c.payload;
 }catch{throw new Error('live_receipt_invalid');}
}
