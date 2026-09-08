// Local synthetic verification only. Does not load .env or use production data.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {spawn} from 'node:child_process';
import {fixture,id} from '../test/helpers/viewAsFixture.mjs';
const root=process.cwd(),dir=path.join(root,'..','.local-validation','lms0724-browser-fixture-'+Date.now());fs.mkdirSync(dir,{recursive:true});
for(const item of ['app','public'])fs.cpSync(path.join(root,item),path.join(dir,item),{recursive:true});
for(const item of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs','proxy.js'])fs.copyFileSync(path.join(root,item),path.join(dir,item));
const config=path.join(dir,'next.config.ts');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace('const nextConfig: NextConfig = {', 'const nextConfig: NextConfig = { devIndicators: false, allowedDevOrigins: ["127.0.0.1"],').replace('const repositoryRoot = join(appRoot, "..");',`const repositoryRoot = ${JSON.stringify(path.resolve(root,'..'))};`));
if(!fs.existsSync(path.join(dir,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'junction');
const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:id(107),session_id:id(207),exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'synthetic-signature'].join('.');
const db=await fixture();
const server=http.createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin','http://localhost:3074');res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');res.setHeader('Content-Type','application/json');if(req.method==='OPTIONS'){res.end('{}');return;}
 try{
  if(req.url==='/auth/v1/user'){if(req.headers.authorization!=='Bearer '+token){res.statusCode=401;res.end(JSON.stringify({message:'invalid synthetic session'}));return;}res.end(JSON.stringify({id:id(107),aud:'authenticated',role:'authenticated',email:'synthetic@example.invalid'}));return;}
  if(req.url==='/rest/v1/rpc/lms_view_as'&&req.headers.apikey==='synthetic-service'){
   let text='';for await(const chunk of req)text+=chunk;const p=JSON.parse(text);
   // Serial fixture requests, same server-only RPC boundary used by the application.
   const data=(await db.query('select lms_view_as($1,$2) result',[p.p_op,p.p_input])).rows[0].result;res.end(JSON.stringify(data));return;
  }
  res.statusCode=403;res.end('{"error":"Synthetic fixture denies all other operations"}');
 }catch(e){res.statusCode=500;res.end(JSON.stringify({message:e.message}));}
});server.listen(3075,'127.0.0.1');
const fixturePage=path.join(dir,'app','view-as-test');fs.mkdirSync(fixturePage,{recursive:true});
fs.writeFileSync(path.join(fixturePage,'page.js'),`'use client';\nimport {useEffect,useState} from 'react';import ViewAsStartButton from '../components/ViewAsStartButton';import {supabase} from '../lib/auth';\nexport default function Fixture(){const [ready,setReady]=useState(false),[writes,setWrites]=useState(0);useEffect(()=>{supabase.auth.setSession({access_token:${JSON.stringify(token)},refresh_token:'synthetic-only-refresh'}).then(()=>setReady(true));},[]);return <main><h1>Synthetic normal administrator</h1><button onClick={()=>setWrites(writes+1)}>Ordinary local action</button><p>Local actions: {writes}</p>{ready&&<ViewAsStartButton memberId="${id(1)}" name="Synthetic Person1"/>}</main>;}`);
const actionDir=path.join(dir,'app','api','view-as-test');fs.mkdirSync(actionDir,{recursive:true});fs.writeFileSync(path.join(actionDir,'route.js'),`import {rejectViewAsMutation} from '../../lib/viewAsBoundary.js';import {authenticateRequestIdentity} from '../../lib/serverSupabase.js';export async function POST(req){const denied=rejectViewAsMutation(req);if(denied)return denied;try{await authenticateRequestIdentity(req);globalThis.syntheticViewWrites=(globalThis.syntheticViewWrites||0)+1;return Response.json({syntheticWrites:globalThis.syntheticViewWrites});}catch{return Response.json({error:'denied'},{status:401});}}`);
const env={...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3075',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',VIEW_AS_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),LMS_ORIGIN:'http://localhost:3074',VIEW_AS_ORIGIN:'http://127.0.0.1:3074'};
for(const k of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD/i.test(k)&&!['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','VIEW_AS_ENCRYPTION_KEY'].includes(k))delete env[k];
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--port','3074'],{cwd:dir,env,stdio:'inherit'});
async function close(){child.kill();server.close();await db.close();}process.on('SIGINT',close);process.on('SIGTERM',close);
