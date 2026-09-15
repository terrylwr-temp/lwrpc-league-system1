// Local synthetic verification only. Does not load .env or use production data.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {spawn} from 'node:child_process';
import {pageFixture,id} from '../test/helpers/viewAsPageFixture.mjs';
import {createViewAsProjectionClient} from '../app/lib/viewAsProjectionClient.js';
import {executeFixtureReadRpc} from '../test/helpers/fixtureRpcManifest.mjs';
import {queryNormalDashboardFixture} from '../test/helpers/normalDashboardFixtureQuery.mjs';
const root=process.cwd(),accepted=path.resolve(root,'../.local-validation/lms0725-exact-accepted'),source=accepted,dir=path.join(root,'..','.local-validation','lms0726-browser-fixture-'+Date.now());fs.mkdirSync(dir,{recursive:true});
for(const item of ['app','public'])fs.cpSync(path.join(source,item),path.join(dir,item),{recursive:true});
for(const item of ['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','postcss.config.mjs','proxy.js'])fs.copyFileSync(path.join(source,item),path.join(dir,item));
const config=path.join(dir,'next.config.ts');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace('const nextConfig: NextConfig = {', 'const nextConfig: NextConfig = { devIndicators: false, allowedDevOrigins: ["127.0.0.1"],').replace('const repositoryRoot = join(appRoot, "..");',`const repositoryRoot = ${JSON.stringify(path.resolve(root,'..'))};`));
if(!fs.existsSync(path.join(dir,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'),'junction');
const db=await pageFixture();
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql'),'utf8');
const rehearsal={deployment:'dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8',stage:'accepted',events:[]};
const allColumns=JSON.parse(fs.readFileSync(path.resolve(root,'../docs/lms-0726-database-catalog.json'),'utf8')).columns;
const have=new Set((await db.query("select table_name||'.'||column_name name from information_schema.columns where table_schema='public'")).rows.map(r=>r.name));
const known=new Set((await db.query("select table_name from information_schema.tables where table_schema='public'")).rows.map(r=>r.table_name));
for(const c of allColumns){if(have.has(c.table+'.'+c.column)||c.type==='vector')continue;if(!/^[a-z_0-9]+$/.test(c.table+c.column+c.type.replace(/^_/,'')))continue;if(!known.has(c.table)){await db.exec('create table public.'+c.table+'(fixture_unused boolean)');known.add(c.table);}await db.exec('alter table public.'+c.table+' add column '+c.column+' '+(c.type.startsWith('_')?c.type.slice(1)+'[]':c.type));}

await db.exec(`update divisions set number_of_lines=3,primary_team_type='gender_doubles',rating_type='dupr',min_dupr=2,max_dupr=5;update teams set abbreviation='SYN';update members set full_name=first_name||' '||last_name,club_location='Synthetic Courts',self_rating=3.5;update seasons set abbreviation='SYN',start_date=current_date-30,end_date=current_date+180;insert into team_members(id,team_id,member_id,is_active) values('${id(302)}','${id(30)}','${id(2)}',true);update team_members set id=member_id where id is null;update locations set is_active=true;`);
for(let line=1;line<=3;line++)await db.exec(`insert into match_lineups(id,match_id,team_id,line_number,player_1_member_id,player_2_member_id) values('${id(500+line)}','${id(50)}','${id(30)}',${line},'${id(1)}','${id(2)}'),('${id(510+line)}','${id(50)}','${id(31)}',${line},'${id(9)}','${id(9)}')`);
await db.exec(`insert into team_standings(team_id,division_id,rank,standings_points,match_wins,match_losses) values('${id(30)}','${id(22)}',1,12,3,0),('${id(31)}','${id(22)}',2,4,1,2);`);
await db.exec(`update members set is_active_member=false where id='${id(9)}';update user_roles set user_id=null where member_id='${id(3)}';insert into user_roles(user_id,member_id,role) values(null,'${id(4)}','player');update locations set club_pro_2_member_id='${id(6)}' where id='${id(40)}';`);
await db.query('update matches set league_id=$1',[id(21)]);
await db.exec('create unique index fixture_match_lineups_key on match_lineups(match_id,team_id,line_number)');
for(const n of [3,4,5,6])await db.query('insert into team_members(id,team_id,member_id,is_active) values($1,$2,$3,true)',[id(900+n),id(30),id(n)]);
for(let line=1;line<=3;line++)await db.query('update match_lineups set player_1_member_id=$1,player_2_member_id=$2 where team_id=$3 and line_number=$4',[id(line*2-1),id(line*2),id(30),line]);
await db.exec(fs.readFileSync(path.join(root,'test/fixtures/lms0726-member-directory.sql'),'utf8'));
const tables={};for(const {table_name}of (await db.query("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'")).rows)tables[table_name]=(await db.query('select row_to_json(r) data from public.'+table_name+' r')).rows.map(r=>r.data);
const display=createViewAsProjectionClient(()=>tables);

if(process.argv.includes('--lock-correction')){
 for(const table of ['members','user_roles','teams','team_members','seasons','leagues','divisions','member_season_ratings','locations','team_standings','matches','system_settings'])await db.exec('alter table public.'+table+' enable row level security');
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20260908011413_lms0724_view_as_authorization_locks.sql'),'utf8'));
}
const server=http.createServer(async(req,res)=>{res.setHeader('Access-Control-Allow-Origin','http://localhost:3076');res.setHeader('Access-Control-Allow-Headers',req.headers['access-control-request-headers']||'authorization,apikey,content-type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,HEAD,OPTIONS');res.setHeader('Content-Type','application/json');if(req.method==='OPTIONS'){res.end('{}');return;}
 try{
  if(req.url==='/__rehearsal'&&req.method==='POST'){
   let input='';for await(const chunk of req)input+=chunk;const {stage}=JSON.parse(input);
   if(!['candidate','rollback'].includes(stage))throw new Error('Invalid local stage');
   const business=async()=>{const out={};for(const table of Object.keys(tables).sort())out[table]=(await db.query('select row_to_json(t) row from public.'+table+' t')).rows.map(r=>JSON.stringify(r.row)).sort();return JSON.stringify(out);};
   const before=await business();
   if(stage==='candidate')await db.exec(migration);
   const after=await business();if(before!==after)throw new Error('Migration changed business data');
   child.kill();await new Promise(resolve=>child.once('exit',resolve));
   const restore=stage==='candidate'?root:accepted;
   for(const item of ['app','public'])fs.cpSync(path.join(restore,item),path.join(dir,item),{recursive:true});
   for(const item of ['package.json','package-lock.json','proxy.js'])fs.copyFileSync(path.join(restore,item),path.join(dir,item));
   child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--port','3076'],{cwd:dir,env,stdio:'inherit'});
   rehearsal.stage=stage;rehearsal.events.push({stage,businessRowsUnchanged:true,sqlRollback:'none; additive reads retained',at:new Date().toISOString()});
   fs.writeFileSync(path.resolve(root,'../docs/lms-0726-rehearsal-stage-results.json'),JSON.stringify(rehearsal,null,2));res.end(JSON.stringify(rehearsal));return;
  }
  if(req.url.startsWith('/auth/v1/token?')&&req.method==='POST'){
   let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);
   const n=body.email?Number(/^synthetic([1-8])@example\.invalid$/.exec(body.email)?.[1]):Number(/^fixture-refresh-([1-8])$/.exec(body.refresh_token)?.[1]);
   if(!n||(body.email&&body.password!=='fixture-password')){res.statusCode=400;res.end(JSON.stringify({message:'Invalid synthetic credentials'}));return;}
   const user={id:id(100+n),email:`synthetic${n}@example.invalid`,aud:'authenticated',role:'authenticated'};
   const token=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,session_id:id(200+n),exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'synthetic-signature'].join('.');
   res.end(JSON.stringify({access_token:token,refresh_token:'fixture-refresh-'+n,expires_in:3600,token_type:'bearer',user}));return;
  }
  if(req.url.startsWith('/auth/v1/logout')&&req.method==='POST'){res.end('{}');return;}
  if(req.url.startsWith('/auth/v1/admin/users')&&req.method==='GET'&&req.headers.apikey==='synthetic-service'){res.end(JSON.stringify({users:[],aud:'authenticated'}));return;}
  if(req.url==='/auth/v1/user'){if(!req.headers.authorization?.startsWith('Bearer ')){res.statusCode=401;res.end(JSON.stringify({message:'invalid synthetic session'}));return;}const claims=JSON.parse(Buffer.from(req.headers.authorization.slice(7).split('.')[1],'base64url').toString());const n=Number(claims.sub.slice(-3))-100;res.end(JSON.stringify({id:claims.sub,aud:'authenticated',role:'authenticated',email:`synthetic${n}@example.invalid`}));return;}
  if(req.url==='/rest/v1/rpc/lms_view_as'&&req.headers.apikey==='synthetic-service'){
   let text='';for await(const chunk of req)text+=chunk;const p=JSON.parse(text);
   // Serial fixture requests, same server-only RPC boundary used by the application.
   const data=(await db.query('select lms_view_as($1,$2) result',[p.p_op,p.p_input])).rows[0].result;res.end(JSON.stringify(data));return;
  }
  const url=new URL(req.url,'http://127.0.0.1:3077');
  if(url.pathname.startsWith('/rest/v1/rpc/')){
   let raw='';for await(const chunk of req)raw+=chunk;
   const data=await executeFixtureReadRpc(db,url.pathname.split('/').pop(),raw?JSON.parse(raw):{}, {credential:req.headers.apikey,readOnly:true});
   res.end(JSON.stringify(data));return;
  }
  if(url.pathname.startsWith('/rest/v1/')&&['POST','PATCH','DELETE'].includes(req.method)&&req.headers.authorization?.startsWith('Bearer ')){
   const table=url.pathname.split('/').pop();
   const memberEdit=table==='members'&&req.method==='PATCH'&&/^eq\.10000000-0000-4000-8000-00000000000[1-9]$/.test(url.searchParams.get('id')||'');
   if(memberEdit){const claims=JSON.parse(Buffer.from(req.headers.authorization.slice(7).split('.')[1],'base64url'));if(![id(107),id(108)].includes(claims.sub)||req.headers['x-view-as-context'])throw new Error('Synthetic member edit denied');}
   if(!Object.hasOwn(tables,table)||(!memberEdit&&!['teams','team_members','match_lineups','match_scores'].includes(table)))throw new Error('Synthetic write outside smoke-test scope');
   const columns=(await db.query('select column_name from information_schema.columns where table_schema=$1 and table_name=$2',['public',table])).rows.map(r=>r.column_name);
   let raw='';for await(const chunk of req)raw+=chunk;const body=raw?JSON.parse(raw):{};if(memberEdit&&Object.keys(body).some(k=>!['first_name','last_name','email','phone','notification_preference','club_location','location_id','dupr_id','renewal_date','notes'].includes(k)))throw new Error('Synthetic member edit field denied');const params=[],where=[];
   for(const [key,value]of url.searchParams){if(key==='select')continue;if(key==='columns'){if(value.split(',').map(v=>v.replaceAll('"','')).some(v=>!columns.includes(v)))throw new Error('Unsupported synthetic columns metadata');continue;}if(key==='on_conflict'){if(table!=='match_lineups'||value!=='match_id,team_id,line_number')throw new Error('Unsupported synthetic conflict target');continue;}if(!columns.includes(key)||!value.startsWith('eq.'))throw new Error('Unsupported synthetic write filter');params.push(value.slice(3));where.push('"'+key+'"=$'+params.length);}
   let result;
   if(req.method==='DELETE'){if(!where.length)throw new Error('Synthetic delete needs exact filter');result=await db.query('delete from public.'+table+' where '+where.join(' and ')+' returning *',params);}
   else if(req.method==='POST'){const rows=Array.isArray(body)?body:[body];result={rows:[]};for(const row of rows){const keys=Object.keys(row);if(keys.some(k=>!columns.includes(k)))throw new Error('Unsupported synthetic column');if(columns.includes('id')&&!row.id){row.id=crypto.randomUUID();keys.push('id');}const inserted=await db.query('insert into public.'+table+'('+keys.map(k=>'"'+k+'"').join(',')+') values('+keys.map((_,i)=>'$'+(i+1)).join(',')+')'+(url.searchParams.has('on_conflict')?' on conflict(match_id,team_id,line_number) do update set '+keys.filter(k=>!['id','match_id','team_id','line_number'].includes(k)).map(k=>'"'+k+'"=excluded."'+k+'"').join(','):'')+' returning *',keys.map(k=>row[k]));result.rows.push(...inserted.rows);}}
   else {if(!where.length)throw new Error('Synthetic PATCH requires filter');const keys=Object.keys(body);if(keys.some(k=>!columns.includes(k)))throw new Error('Unknown column');const offset=params.length;params.push(...keys.map(k=>body[k]));result=await db.query('update public.'+table+' set '+keys.map((k,i)=>'"'+k+'"=$'+(offset+i+1)).join(',')+' where '+where.join(' and ')+' returning *',params);}
   tables[table]=(await db.query('select row_to_json(r) data from public.'+table+' r')).rows.map(r=>r.data);res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object')?result.rows[0]:result.rows));return;
  }
  if(url.pathname.startsWith('/rest/v1/')&&['GET','HEAD'].includes(req.method)){
   if(url.pathname==='/rest/v1/line_games' && url.searchParams.get('select')?.includes('match_lines!inner')){
    const result=await queryNormalDashboardFixture(db,url.searchParams);
    res.setHeader('Content-Range',result.count ? `0-${result.count-1}/${result.count}` : '*/0');
    res.setHeader('Access-Control-Expose-Headers','Content-Range');
    res.end(req.method==='HEAD'?'':JSON.stringify(result.data));return;
   }
   const table=url.pathname.split('/').pop();let query=display.from(table).select(url.searchParams.get('select')||'*');
   for(const [key,value]of url.searchParams){if(key==='select')continue;if(key==='order'){for(const part of value.split(',')){const [field,direction]=part.split('.');query=query.order(field,{ascending:direction!=='desc'});}continue;}if(key==='limit'){query=query.limit(Number(value));continue;}if(key==='or'){query=query.or(value.replace(/^\(/,'').replace(/\)$/,''));continue;}const [op,...rest]=value.split('.');let v=rest.join('.');if(op==='eq'){v=v==='true'?true:v==='false'?false:v;query=query.eq(key,v);}else if(op==='in')query=query.in(key,v.slice(1,-1).split(','));else if(op==='is')query=query.is(key,v==='null'?null:v);else if(op==='ilike')query=query.ilike(key,v);else if(['gte','lte','gt','lt','neq'].includes(op))query=query[op](key,v);}
   if(req.headers.accept?.includes('vnd.pgrst.object'))query=query.maybeSingle();const result=await query;if(result.error){res.statusCode=400;res.end(JSON.stringify(result.error));return;}if(req.headers.prefer?.includes('count=exact')){res.setHeader('Content-Range','0-0/'+(Array.isArray(result.data)?result.data.length:result.data?1:0));res.setHeader('Access-Control-Expose-Headers','Content-Range');}res.end(req.method==='HEAD'?'':JSON.stringify(result.data));return;
  }
  res.statusCode=403;res.end('{"error":"Synthetic fixture denies all other operations"}');
 }catch(e){res.statusCode=500;res.end(JSON.stringify({message:e.message}));}
});server.listen(3077,'127.0.0.1');
const fixturePage=path.join(dir,'app','view-as-test');fs.mkdirSync(fixturePage,{recursive:true});
fs.writeFileSync(path.join(fixturePage,'page.js'),fs.readFileSync(path.join(root,'test/fixtures/lms0726-entry.jsx'),'utf8'));
const actionDir=path.join(dir,'app','api','view-as-test');fs.mkdirSync(actionDir,{recursive:true});fs.writeFileSync(path.join(actionDir,'route.js'),`import {rejectViewAsMutation} from '../../lib/viewAsBoundary.js';import {authenticateRequestIdentity} from '../../lib/serverSupabase.js';export async function POST(req){const denied=rejectViewAsMutation(req);if(denied)return denied;try{await authenticateRequestIdentity(req);globalThis.syntheticViewWrites=(globalThis.syntheticViewWrites||0)+1;return Response.json({syntheticWrites:globalThis.syntheticViewWrites});}catch{return Response.json({error:'denied'},{status:401});}}`);
const env={...process.env,NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3077',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-anon',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',VIEW_AS_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),LMS_ORIGIN:'http://localhost:3076',VIEW_AS_ORIGIN:'http://127.0.0.1:3076'};
for(const k of Object.keys(env))if(/KEY|TOKEN|SECRET|PASSWORD/i.test(k)&&!['NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','VIEW_AS_ENCRYPTION_KEY'].includes(k))delete env[k];
let child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--port','3076'],{cwd:dir,env,stdio:'inherit'});
async function close(){child.kill();server.close();await db.close();}process.on('SIGINT',close);process.on('SIGTERM',close);
