import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {authenticateRequestIdentity,LiveAuthenticationError} from '../app/lib/serverSupabase.js';
import {runLive,liveAuthFailure} from '../app/lib/liveLmsService.js';
import {openLive,sealLive} from '../app/lib/liveLmsReceipts.js';
process.env.NEXT_PUBLIC_SUPABASE_URL='https://synthetic-auth.example.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-server-only';
const user='10000000-0000-4000-8000-000000000001',session='20000000-0000-4000-8000-000000000001';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(overrides={},key='synthetic-auth-signing') {const s=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:user,session_id:session,exp:Math.floor(Date.now()/1000)+3600,...overrides});return s+'.'+createHmac('sha256',key).update(s).digest('base64url');}
const request=t=>new Request('https://app.example.invalid/api/ask-lwr',{headers:t?{Authorization:'Bearer '+t}:{}});
// Controlled Auth-service contract double, not evidence of hosted revocation.
function provider({revoked=false,unavailable=false}={}) {return ()=>({auth:{getUser:async jwt=>{
 if(unavailable)throw new Error('SECRET provider failure');
 const [h,p,s]=jwt.split('.');const c=JSON.parse(Buffer.from(p,'base64url'));
 if(revoked || createHmac('sha256','synthetic-auth-signing').update(h+'.'+p).digest('base64url')!==s || c.exp*1000<=Date.now())return {error:{status:401,message:'SECRET'}};
 return {data:{user:{id:c.sub,email:'SECRET@example.invalid',user_metadata:{role:'commissioner'},is_anonymous:false}}};
}}});}

test('0723 online identity, forged requester, six routes use only trusted actor; zero model calls',async()=>{
 const principal=await authenticateRequestIdentity(request(token()),{clientFactory:provider()});
 assert.deepEqual(Object.keys(principal).sort(),['authMs','receiptBinding','user']);assert.deepEqual(principal.user,{id:user});
 for(const secret of ['SECRET',session,'commissioner'])assert.ok(!JSON.stringify(principal).includes(secret));
 let calls=0;
 principal.supabase={rpc:(name,args)=>{calls++;assert.equal(name,'ai_live_lookup');assert.equal(args.p_actor,user);assert.ok(!JSON.stringify(args).includes('forged'));assert.ok(!('p_session' in args));return {abortSignal:async()=>({data:{status:'success',value:'3.5',relationship:'self'}})};}};
 const result=await runLive({principal,body:{question:'What is my Season DUPR?',userId:'forged',p_actor:'forged',memberId:'forged',teamId:'forged',subject:'forged',role:'commissioner'},persist:async()=>{}});
 assert.equal(calls,1);assert.equal(result.kind,'answer');
});

test('0723 invalid and provider-rejected identities fail before protected lookup',async()=>{
 for(const t of [null,'broken',token({},'forged'),token({exp:1})])await assert.rejects(authenticateRequestIdentity(request(t),{clientFactory:provider()}),e=>e instanceof LiveAuthenticationError&&e.status===401);
 await assert.rejects(authenticateRequestIdentity(request(token()),{clientFactory:provider({revoked:true})}),e=>e.status===401);
 await assert.rejects(authenticateRequestIdentity(request(token()),{clientFactory:()=>({auth:{getUser:async()=>({data:{user:{id:session}}})}})}),e=>e.status===401);
 for(const claims of [{session_id:null},{session_id:'00000000-0000-0000-0000-000000000000'}])await assert.rejects(authenticateRequestIdentity(request(token(claims)),{clientFactory:provider()}),e=>e.status===401);
});

test('0723 auth timeout, thrown/malformed/unavailable responses fail closed and sanitized',async()=>{
 for(const factory of [provider({unavailable:true}),()=>({auth:{getUser:async()=>null}}),()=>({auth:{getUser:()=>new Promise(()=>{})}})]){
  const started=performance.now();await assert.rejects(authenticateRequestIdentity(request(token()),{clientFactory:factory,timeoutMs:20}),e=>{assert.equal(e.status,503);assert.ok(!JSON.stringify(liveAuthFailure(e)).includes('SECRET'));return true;});assert.ok(performance.now()-started<1000);
 }
});

test('0723 opaque receipts preserve refreshed-session and cross-user/session rejection',async()=>{
 const a=await authenticateRequestIdentity(request(token()),{clientFactory:provider()});
 const refreshed=await authenticateRequestIdentity(request(token({exp:Math.floor(Date.now()/1000)+7200})),{clientFactory:provider()});
 const other=await authenticateRequestIdentity(request(token({sub:session})),{clientFactory:provider()});
 const newSession=await authenticateRequestIdentity(request(token({session_id:user})),{clientFactory:provider()});
 const receipt=sealLive('context',a,{subject:'protected-reference'});
 assert.equal(openLive(receipt,'context',refreshed).subject,'protected-reference');
 for(const p of [other,newSession,{...a,receiptBinding:undefined}])assert.throws(()=>openLive(receipt,'context',p));
});

test('0723 real SDK Auth rejection and timeout never reach live RPC or model transport',async()=>{
 const {authenticateLive}=await import('../app/lib/liveLmsService.js');
 const previous=globalThis.fetch;const paths=[];
 try {
  globalThis.fetch=async url=>{paths.push(String(url));assert.ok(String(url).endsWith('/auth/v1/user'));return new Response(JSON.stringify({code:'session_not_found',msg:'Session no longer valid'}),{status:403,headers:{'content-type':'application/json'}});};
  await assert.rejects(authenticateLive(request(token())),e=>e.status===401);
  assert.equal(paths.length,1);
 }finally{globalThis.fetch=previous;}
});
