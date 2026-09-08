import {randomBytes,createHash,createCipheriv,createDecipheriv} from 'node:crypto';
export const opaque = () => randomBytes(32).toString('hex');
export const digest = value => createHash('sha256').update(value).digest('hex');
export function validOpaque(value) {return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);}
function key() {
  const value=process.env.VIEW_AS_ENCRYPTION_KEY || '';
  const bytes=Buffer.from(value,'base64');
  if(bytes.length!==32 || bytes.toString('base64')!==value)throw new Error('View As encryption configuration unavailable');
  return bytes;
}
export function sealAdminCredential(token,contextId) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv);
  cipher.setAAD(Buffer.from(`view-as-admin-v1:${contextId}`));
  const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');
}
export function openAdminCredential(value,contextId) {
  const bytes=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',key(),bytes.subarray(0,12));
  cipher.setAAD(Buffer.from(`view-as-admin-v1:${contextId}`));cipher.setAuthTag(bytes.subarray(12,28));
  return Buffer.concat([cipher.update(bytes.subarray(28)),cipher.final()]).toString('utf8');
}
