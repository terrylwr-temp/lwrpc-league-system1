import {createClient} from '@supabase/supabase-js';
import {createHmac} from 'node:crypto';
process.loadEnvFile('.env.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const health=await fetch(url+'/auth/v1/health',{headers:{apikey:key},signal:AbortSignal.timeout(5000)});
const info=await health.json();
console.log(JSON.stringify({check:'public_auth_health',status:health.status,version:info.version||null}));
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const payload=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:'00000000-0000-4000-8000-000000000001',session_id:'00000000-0000-4000-8000-000000000002',role:'authenticated',aud:'authenticated',exp:Math.floor(Date.now()/1000)+60});
const forged=payload+'.'+createHmac('sha256','unmistakably-synthetic-invalid-signing-key').update(payload).digest('base64url');
for(const [kind,token] of [['malformed','not-a-jwt'],['invalid_signature',forged]]) {
 const {data,error}=await auth.auth.getUser(token);
 console.log(JSON.stringify({check:kind,authenticated:Boolean(data?.user),status:error?.status,code:error?.code}));
 if(data?.user || !error)process.exitCode=1;
}
