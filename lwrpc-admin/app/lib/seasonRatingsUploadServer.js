import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { parseRatingsCsv, ratingSource } from './seasonRatingsImport.js';
import { uploadPreview } from './seasonRatingsUploadResult.js';

// Reuse the already deployed, audited working-input transaction for Upload only.
// Distinct receipt domain rejects old source-only and other-operation receipts.
const policy = 'upload-working-inputs-v1';
export const RATINGS_UPLOAD_RPC_TIMEOUT_MS = 30_000;
const key = secret => { if (!secret) throw Error('Server import credentials are not configured.'); return createHash('sha256').update(policy+'\0'+secret).digest(); };
const binding = (actor,token) => createHash('sha256').update(actor+'\0'+token).digest('hex');
export function signUpload(payload,actor,token,secret) {
 const data=Buffer.from(JSON.stringify({payload,binding:binding(actor,token)})).toString('base64url');
 return data+'.'+createHmac('sha256',key(secret)).update(data).digest('base64url');
}
export function verifyUpload(receipt,actor,token,secret,now=Date.now()) {
 if(typeof receipt!=='string'||receipt.length>2800000)throw Error('Invalid import preview.');
 const [data,signature,extra]=receipt.split('.');
 const expected=createHmac('sha256',key(secret)).update(data||'').digest(), supplied=Buffer.from(signature||'','base64url');
 if(extra||expected.length!==supplied.length||!timingSafeEqual(expected,supplied))throw Error('Preview changed; preview again.');
 const envelope=JSON.parse(Buffer.from(data,'base64url').toString());const p=envelope.payload;
 if(envelope.binding!==binding(actor,token)||p.actor!==actor||p.policy!==policy||p.operation!=='upload'||!Number.isFinite(Date.parse(p.expires))||Date.parse(p.expires)<=now)throw Error('Preview expired or session changed. Preview again.');
 return p;
}
export function uploadInputs(csv) {
 return parseRatingsCsv(csv).map(row=>{
  try {const {patch,usable}=ratingSource(row);if(!usable||(patch.rf!==undefined&&!Number.isInteger(patch.rf)))throw Error('Source ratings required; RF must be a whole number.');return {duprId:row.duprid,line:row.line,data:patch};}
  catch(error){return {duprId:row.duprid,line:row.line,data:{},error:error.message};}
 });
}
export async function ratingsUploadRequest({body,actor,token,db,secret,now=Date.now()}) {
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.seasonId||''))throw Error('Select a season.');
 if(body.operation && body.operation!=='upload')throw Error('This endpoint supports Upload only.');
 if(body.action==='preview') {
  const upload=uploadInputs(body.csv);
  const {data,error}=await db.rpc('season_ratings_workflow_preview',{p_actor:actor,p_season:body.seasonId,p_operation:'upload',p_upload:upload}).abortSignal(AbortSignal.timeout(RATINGS_UPLOAD_RPC_TIMEOUT_MS));
  if(error)throw Error(error.message);
  if(data?.operation!=='upload'||data.season?.id!==body.seasonId||!data.fingerprint)throw Error('Unexpected import preview.');
  const payload={id:randomUUID(),policy,actor,seasonId:body.seasonId,operation:'upload',upload,fingerprint:data.fingerprint,fileHash:createHash('sha256').update(body.csv).digest('hex'),expires:new Date(now+600000).toISOString()};
  return {...uploadPreview(data),receipt:data.counts.affected>0?signUpload(payload,actor,token,secret):null};
 }
 if(body.action==='commit'&&body.confirmed===true) {
  const payload=verifyUpload(body.receipt,actor,token,secret,now);
  if(payload.seasonId!==body.seasonId)throw Error('Season changed; preview again.');
  const {data,error}=await db.rpc('season_ratings_workflow_commit',{p_actor:actor,p_payload:payload}).abortSignal(AbortSignal.timeout(RATINGS_UPLOAD_RPC_TIMEOUT_MS));
  if(error)throw Error(error.message);
  if(data?.status!=='success')throw Error(data?.reason||'Import rolled back. Preview again.');
  return data;
 }
 throw Error('Preview and explicitly confirm the import.');
}
