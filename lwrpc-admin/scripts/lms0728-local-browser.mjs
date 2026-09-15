// Local synthetic verification only. Does not load .env or use production data.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {spawn} from 'node:child_process';
import {implicitPlayerFixture,id,migrationName,readMigration} from '../test/helpers/implicitPlayerFixture.mjs';
import {createViewAsProjectionClient} from '../app/lib/viewAsProjectionClient.js';
const root=process.cwd(),dir=path.join(root,'..','.local-validation','lms0728-browser-fixture-'+Date.now());fs.mkdirSync(dir,{recursive:true});
for(const item of ['app','public'])fs.cpSync(path.join(root,item),path.join(dir,item),{recursive:true});
for(const item of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs','proxy.js'])fs.copyFileSync(path.join(root,item),path.join(dir,item));
const config=path.join(dir,'next.config.ts');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace('const nextConfig: NextConfig = {', 'const nextConfig: NextConfig = { devIndicators: false, allowedDevOrigins: ["127.0.0.1"],').replace('const repositoryRoot = join(appRoot, "..");',`const repositoryRoot = ${JSON.stringify(path.resolve(root,'..'))};`));
if(!fs.existsSync(path.join(dir,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'junction');
const db=await implicitPlayerFixture();
await db.exec(await readMigration(migrationName));
await db.exec(`delete from user_roles where member_id='${id(1)}';`);
await db.exec(`update divisions set number_of_lines=3,primary_team_type='gender_doubles',rating_type='dupr',min_dupr=2,max_dupr=5;update teams set abbreviation='SYN';update members set full_name=first_name||' '||last_name,club_location='Synthetic Courts',self_rating=3.5;update seasons set abbreviation='SYN',start_date=current_date-30,end_date=current_date+180;insert into team_members(id,team_id,member_id,is_active) values('${id(302)}','${id(30)}','${id(2)}',true);update team_members set id=member_id where id is null;update locations set is_active=true;`);
for(let line=1;line<=3;line++)await db.exec(`insert into match_lineups(id,match_id,team_id,line_number,player_1_member_id,player_2_member_id) values('${id(500+line)}','${id(50)}','${id(30)}',${line},'${id(1)}','${id(2)}'),('${id(510+line)}','${id(50)}','${id(31)}',${line},'${id(9)}','${id(9)}')`);
await db.exec(`insert into team_standings(team_id,division_id,rank,standings_points,match_wins,match_losses) values('${id(30)}','${id(22)}',1,12,3,0),('${id(31)}','${id(22)}',2,4,1,2);`);
await db.exec(`update members set is_active_member=false where id='${id(9)}';update user_roles set user_id=null where member_id='${id(3)}';insert into user_roles(user_id,member_id,role) values(null,'${id(4)}','player');update locations set club_pro_2_member_id='${id(6)}' where id='${id(40)}';`);
const tables={};for(const {table_name}of (await db.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")).rows)tables[table_name]=(await db.query('select row_to_json(r) data from public.'+table_name+' r')).rows.map(r=>r.data);
const display=createViewAsProjectionClient(()=>tables);

if(process.argv.includes('--lock-correction')){
 for(const table of ['members','user_roles','teams','team_members','seasons','leagues','divisions','member_season_ratings','locations','team_standings','matches','system_settings'])await db.exec('alter table public.'+table+' enable row level security');
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql'),'utf8'));
}
const server=http.createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin','http://localhost:3086');res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,HEAD,OPTIONS');res.setHeader('Content-Type','application/json');if(req.method==='OPTIONS'){res.end('{}');return;}
 try{
  if(req.url.startsWith('/auth/v1/admin/users')&&req.method==='GET'&&req.headers.apikey==='synthetic-service'){res.end(JSON.stringify({users:[],aud:'authenticated'}));return;}
  if(req.url==='/auth/v1/user'){if(!req.headers.authorization?.startsWith('Bearer ')){res.statusCode=401;res.end(JSON.stringify({message:'invalid synthetic session'}));return;}const claims=JSON.parse(Buffer.from(req.headers.authorization.slice(7).split('.')[1],'base64url').toString());const n=Number(claims.sub.slice(-3))-100;res.end(JSON.stringify({id:claims.sub,aud:'authenticated',role:'authenticated',email:`synthetic${n}@example.invalid`}));return;}
  if(req.url==='/rest/v1/rpc/lms_view_as'&&req.headers.apikey==='synthetic-service'){
   let text='';for await(const chunk of req)text+=chunk;const p=JSON.parse(text);
   // Serial fixture requests, same server-only RPC boundary used by the application.
   const data=(await db.query('select lms_view_as($1,$2) result',[p.p_op,p.p_input])).rows[0].result;res.end(JSON.stringify(data));return;
  }
  const url=new URL(req.url,'http://127.0.0.1:3087');
  if(url.pathname.startsWith('/rest/v1/')&&['POST','PATCH','DELETE'].includes(req.method)&&req.headers.authorization?.startsWith('Bearer ')){
   const table=url.pathname.split('/').pop();if(!Object.hasOwn(tables,table)||!['team_members','match_lineups'].includes(table))throw new Error('Synthetic write outside smoke-test scope');
   const columns=(await db.query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2',['public',table])).rows.map(r=>r.column_name);
   let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};const params=[],where=[];
   for(const [key,value]of url.searchParams){if(key==='select')continue;if(!columns.includes(key)||!value.startsWith('eq.'))throw new Error('Unsupported synthetic write filter');params.push(value.slice(3));where.push('"'+key+'"=$'+params.length);}
   let result;
   if(req.method==='DELETE'){if(!where.length)throw new Error('Synthetic delete needs exact filter');result=await db.query('delete from public.'+table+' where '+where.join(' and ')+' returning *',params);}
   else if(req.method==='POST'){const rows=Array.isArray(body)?body:[body];result={rows:[]};for(const row of rows){const keys=Object.keys(row);if(keys.some(k=>!columns.includes(k)))throw new Error('Unsupported synthetic column');if(columns.includes('id')&&!row.id){row.id=crypto.randomUUID();keys.push('id');}const inserted=await db.query('insert into public.'+table+'('+keys.map(k=>'"'+k+'"').join(',')+') values('+keys.map((_,i)=>'$'+(i+1)).join(',')+') returning *',keys.map(k=>row[k]));result.rows.push(...inserted.rows);}}
   else throw new Error('Synthetic PATCH not needed by roster smoke');
   tables[table]=(await db.query('select row_to_json(r) data from public.'+table+' r')).rows.map(r=>r.data);res.end(JSON.stringify(result.rows));return;
  }
  if(url.pathname.startsWith('/rest/v1/')&&req.method==='GET'){
   const table=url.pathname.split('/').pop();let query=display.from(table).select(url.searchParams.get('select')||'*');
   for(const [key,value]of url.searchParams){if(key==='select')continue;if(key==='order'){for(const part of value.split(',')){const [field,direction]=part.split('.');query=query.order(field,{ascending:direction!=='desc'});}continue;}if(key==='limit'){query=query.limit(Number(value));continue;}if(key==='or'){query=query.or(value.replace(/^\(/,'').replace(/\)$/,''));continue;}const [op,...rest]=value.split('.');let v=rest.join('.');if(op==='eq'){v=v==='true'?true:v==='false'?false:v;query=query.eq(key,v);}else if(op==='in')query=query.in(key,v.slice(1,-1).split(','));else if(op==='is')query=query.is(key,v==='null'?null:v);else if(op==='ilike')query=query.ilike(key,v);else if(['gte','lte','gt','lt','neq'].includes(op))query=query[op](key,v);}
   if(req.headers.accept?.includes('vnd.pgrst.object'))query=query.maybeSingle();const result=await query;if(result.error){res.statusCode=400;res.end(JSON.stringify(result.error));return;}res.end(JSON.stringify(result.data));return;
  }
  res.statusCode=403;res.end('{"error":"Synthetic fixture denies all other operations"}');
 }catch(e){res.statusCode=500;res.end(JSON.stringify({message:e.message}));}
});server.listen(3087,'127.0.0.1');
const fixturePage=path.join(dir,'app','view-as-test');fs.mkdirSync(fixturePage,{recursive:true});
fs.writeFileSync(path.join(fixturePage,'page.js'),fs.readFileSync(path.join(root,'test/fixtures/lms0726-entry.jsx'),'utf8'));
const actionDir=path.join(dir,'app','api','view-as-test');fs.mkdirSync(actionDir,{recursive:true});fs.writeFileSync(path.join(actionDir,'route.js'),`import {rejectViewAsMutation} from '../../lib/viewAsBoundary.js';import {authenticateRequestIdentity} from '../../lib/serverSupabase.js';export async function POST(req){const denied=rejectViewAsMutation(req);if(denied)return denied;try{await authenticateRequestIdentity(req);globalThis.syntheticViewWrites=(globalThis.syntheticViewWrites||0)+1;return Response.json({syntheticWrites:globalThis.syntheticViewWrites});}catch{return Response.json({error:'denied'},{status:401});}}`);
const env={...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3087',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',VIEW_AS_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),LMS_ORIGIN:'http://localhost:3086',VIEW_AS_ORIGIN:'http://127.0.0.1:3086'};
for(const k of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD/i.test(k)&&!['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','VIEW_AS_ENCRYPTION_KEY'].includes(k))delete env[k];
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--port','3086'],{cwd:dir,env,stdio:'inherit'});
async function close(){child.kill();server.close();await db.close();}process.on('SIGINT',close);process.on('SIGTERM',close);
