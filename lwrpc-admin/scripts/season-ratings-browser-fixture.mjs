// Isolated actual Ratings page + actual import route + synthetic Postgres database.
// No .env is loaded or copied. Only loopback HTTP is configured.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { schema, migration, id, asService, fingerprint } from '../test/helpers/ratingsSourceDatabase.mjs';
const root=process.cwd(),dir=path.join(root,'..','.local-validation','ratings-browser-'+Date.now());fs.mkdirSync(dir,{recursive:true});
for(const item of ['app','public'])fs.cpSync(path.join(root,item),path.join(dir,item),{recursive:true});
for(const item of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs'])fs.copyFileSync(path.join(root,item),path.join(dir,item));
fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'junction');
const config=path.join(dir,'next.config.ts');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace('const nextConfig: NextConfig = {','const nextConfig: NextConfig = { devIndicators: false, allowedDevOrigins: ["127.0.0.1"],').replace('const repositoryRoot = join(appRoot, "..");',`const repositoryRoot = ${JSON.stringify(path.resolve(root,'..'))};`));
const db=new PGlite();await db.exec(schema);await db.exec(migration);
const frozen=await fingerprint(db);
const tables={members:(await db.query('select * from members')).rows.map(m=>({...m,email:'synthetic@example.invalid',created_at:'2026-01-01'})),seasons:(await db.query('select * from seasons')).rows,member_season_ratings:(await db.query('select * from member_season_ratings')).rows.map((r,i)=>({...r,id:id(400+i)})),team_members:[]};
fs.writeFileSync(path.join(dir,'app/lib/auth.js'),`import {createViewAsProjectionClient} from './viewAsProjectionClient.js';const tables=${JSON.stringify(tables)};export const supabase={...createViewAsProjectionClient(()=>tables),auth:{getSession:async()=>({data:{session:{access_token:'synthetic-token'}}})}};export const requireRole=async()=>({id:'${id(101)}'});`);
fs.writeFileSync(path.join(dir,'app/components/AppHeader.js'),`export default function Header(){return <header className="bg-slate-900 p-4 font-bold text-white">Local synthetic verification — Season Ratings</header>}`);
fs.writeFileSync(path.join(dir,'app/layout.tsx'),`import './globals.css';import {AppDialogProvider} from './components/AppDialogProvider';export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><AppDialogProvider>{children}</AppDialogProvider></body></html>}`);
let commits=0;const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  try {
    const url=new URL(req.url,'http://127.0.0.1:3097');
    if(url.pathname==='/auth/v1/user'){res.end(JSON.stringify({id:id(101),email:'synthetic@example.invalid',aud:'authenticated',role:'authenticated'}));return;}
    if(url.pathname==='/evidence'){res.end(JSON.stringify({commits,sourceRows:(await db.query('select count(*) n from ratings_source_private.sources')).rows[0].n,seasonUnchanged:JSON.stringify(await fingerprint(db))===JSON.stringify(frozen)}));return;}
    if(req.method==='POST'&&req.headers.apikey==='synthetic-service'&&url.pathname.startsWith('/rest/v1/rpc/')){
      let text='';for await(const c of req)text+=c;const body=JSON.parse(text);let result;
      if(url.pathname.endsWith('/season_ratings_source_snapshot'))result=await asService(db,'select public.season_ratings_source_snapshot($1,$2,$3) result',[body.p_actor,body.p_season,body.p_ids]);
      else if(url.pathname.endsWith('/season_ratings_source_commit')){result=await asService(db,'select public.season_ratings_source_commit($1,$2) result',[body.p_actor,body.p_payload]);commits++;}
      else throw Error('Unknown RPC denied');
      res.end(JSON.stringify(result.rows[0].result));return;
    }
    res.statusCode=403;res.end('{"message":"Fixture denies this operation"}');
  }catch(error){res.statusCode=400;res.end(JSON.stringify({message:error.message}));}
});server.listen(3097,'127.0.0.1');
const env={...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3097',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service'};
for(const k of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD|VIEW_AS_ORIGIN|LMS_ORIGIN/i.test(k)&&!['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY'].includes(k))delete env[k];
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--port','3096'],{cwd:dir,env,stdio:'inherit',windowsHide:true});
console.log('Fixture directory: '+dir);
const close=async()=>{child.kill();server.close();await db.close();};process.on('SIGINT',close);process.on('SIGTERM',close);
