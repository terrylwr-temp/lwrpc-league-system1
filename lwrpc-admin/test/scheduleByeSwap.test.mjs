import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { getByeSwapCandidates, scheduleRowSnapshot } from '../app/lib/scheduleByeSwap.js';
import { createScheduleByeSwapHandler } from '../app/lib/scheduleByeSwapServer.js';
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function fixture() {
 const match={id:id(10),league_id:id(20),division_id:id(30),home_team_id:id(1),away_team_id:id(2),scheduled_date:'2026-10-20',week_number:2,status:'scheduled',schedule_setting_id:id(40),home_score:null,away_score:null};
 const teams=[1,2,3,4,5,6,7].map(n=>({id:id(n),name:'Team '+n,division_id:n===5?id(31):id(30),is_active:true,home_location_id:id(50)}));
 const byes=[3,4,5,6].map(n=>({id:id(100+n),team_id:id(n),league_id:id(20),division_id:n===5?id(31):id(30),bye_date:'2026-10-20',week_number:2,schedule_setting_id:id(40)}));
 const matches=[match,{...match,id:id(11),home_team_id:id(6),away_team_id:id(7),scheduled_date:'2026-10-21'}];
 return {match,side:'home',teams,byes,matches};
}
test('bye choices include all active recorded byes, excluding another division and a team already playing that week; Location is irrelevant',()=>{
 const f=fixture();assert.deepEqual(getByeSwapCandidates(f).map(x=>x.team.id),[id(3),id(4)]);
 f.teams.find(t=>t.id===id(3)).home_location_id=id(99);assert.equal(getByeSwapCandidates(f).length,2);
 f.teams.find(t=>t.id===id(4)).is_active=false;assert.deepEqual(getByeSwapCandidates(f).map(x=>x.team.id),[id(3)]);
 f.byes=f.byes.filter(b=>b.team_id!==id(3));assert.deepEqual(getByeSwapCandidates(f),[]);
});
test('bye choices require exact date/week and preserve legacy unassigned ownership, excluding other copied settings and duplicates',()=>{
 const f=fixture();f.byes[0].schedule_setting_id=null;f.byes[1].schedule_setting_id=id(41);
 assert.deepEqual(getByeSwapCandidates(f).map(x=>x.team.id),[id(3)]);
 f.byes[0].week_number=3;assert.deepEqual(getByeSwapCandidates(f),[]);f.byes[0].week_number=2;
 f.byes.push({...f.byes[0],id:id(999)});assert.deepEqual(getByeSwapCandidates(f),[]);
 f.byes=[];assert.deepEqual(getByeSwapCandidates(f),[]);
});
test('busy original/opponent, played matches and invalid side do not offer swaps',()=>{
 const f=fixture();f.matches[1].home_team_id=id(1);assert.deepEqual(getByeSwapCandidates(f),[]);
 f.matches.pop();for(const status of ['in_progress','completed','cancelled','rainout'])assert.deepEqual(getByeSwapCandidates({...f,match:{...f.match,status}}),[]);
 assert.deepEqual(getByeSwapCandidates({...f,side:'location'}),[]);
 assert.deepEqual(getByeSwapCandidates({...f,match:{...f.match,home_score:0}}),[]);
});
test('complete row snapshot strips only joined display relationships and preserves stored values',()=>{
 const f=fixture().match;assert.deepEqual(scheduleRowSnapshot({...f,home_team:{name:'Joined'},leagues:{name:'Joined'},notes:'keep'}),{...f,notes:'keep'});
});

test('actual editor cancel and confirmation handlers use explicit confirmation, keep the selected side, and handle conflict without a client write',async()=>{
 const source=await readFile(new URL('../app/schedule-editor/page.js',import.meta.url),'utf8');
 const handlers=source.slice(source.indexOf('  function openByeSwap('),source.indexOf('  function renderByeTeamAction('));
 const f=fixture();const calls=[];
 const sandbox={byeSwapPrompt:null,byeSwapSelection:'',byeSwapSaving:false,byeChoices:()=>getByeSwapCandidates(f),scheduleRowSnapshot,
  setByeSwapPrompt:v=>{sandbox.byeSwapPrompt=v;},setByeSwapSelection:v=>{sandbox.byeSwapSelection=v;},setByeSwapError:v=>{sandbox.error=v;},setByeSwapSaving:v=>{sandbox.byeSwapSaving=v;},
  getRequestAuthorizationHeaders:async h=>h,fetch:async(url,init)=>{calls.push({url,payload:JSON.parse(init.body)});return {ok:false,json:async()=>({success:false,error:'Stale match'})};},loadData:async()=>{throw Error('Must not refresh as successful after conflict');}};
 vm.createContext(sandbox);vm.runInContext(handlers,sandbox);sandbox.openByeSwap(f.match,'away');sandbox.cancelByeSwap();await sandbox.confirmByeSwap();assert.equal(calls.length,0);
 sandbox.openByeSwap(f.match,'away');await sandbox.confirmByeSwap();assert.equal(calls.length,0);sandbox.byeSwapSelection=id(103);await sandbox.confirmByeSwap();assert.equal(calls.length,1);
 assert.equal(calls[0].payload.side,'away');assert.equal(calls[0].payload.matchId,f.match.id);assert.deepEqual(calls[0].payload.expectedMatch,f.match);assert.equal(sandbox.error,'Stale match');assert.ok(sandbox.byeSwapPrompt);
 assert.match(source,/onClick=\{\(\) => swapHomeAway\(match\)\}/);assert.match(source,/location_id: proposedMatch.location_id/);assert.match(source,/role="dialog" aria-modal="true" aria-labelledby="bye-swap-title"/);
});

const request=body=>new Request('https://example.invalid/api/schedule-editor/swap-with-bye',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}});
const body=()=>({matchId:id(10),byeId:id(103),side:'home',expectedMatch:{id:id(10)},expectedBye:{id:id(103)}});
test('server handler rejects View-As, unauthorized/captain access, malformed payloads and RPC conflicts; never uses a direct client update',async()=>{
 let calls=0;const authorize=async(req,role)=>{assert.equal(role,'league_manager');return {user:{id:id(900)},supabase:{rpc:async(name,args)=>{calls++;assert.equal(name,'schedule_editor_swap_with_bye');assert.equal(args.p_side,'home');assert.equal(args.p_actor_user_id,id(900));return {error:{code:'P0001',message:'Stale schedule'}};}}};};
 assert.equal((await createScheduleByeSwapHandler({authorize,rejectViewAs:()=>Response.json({}, {status:403})})(request(body()))).status,403);assert.equal(calls,0);
 for(const status of [401,403])assert.equal((await createScheduleByeSwapHandler({authorize:async()=>({error:'Denied',status}),rejectViewAs:()=>null})(request(body()))).status,status);
 const handler=createScheduleByeSwapHandler({authorize,rejectViewAs:()=>null});for(const patch of [{side:'both'},{matchId:'invalid'},{expectedMatch:[]},{expectedBye:{id:id(9)}}])assert.equal((await handler(request({...body(),...patch}))).status,400);
 assert.equal(calls,0);assert.equal((await handler(request(body()))).status,409);assert.equal(calls,1);
});
test('server handler maps lock conflicts safely and succeeds only through one atomic RPC',async()=>{
 for(const code of ['55P03','40P01','40001']){const handler=createScheduleByeSwapHandler({rejectViewAs:()=>null,authorize:async()=>({user:{id:id(900)},supabase:{rpc:async()=>({error:{code}})}})});assert.equal((await handler(request(body()))).status,409);}
 const handler=createScheduleByeSwapHandler({rejectViewAs:()=>null,authorize:async()=>({user:{id:id(900)},supabase:{rpc:async()=>({data:{action:'SWAP_WITH_BYE'}})}})});assert.equal((await (await handler(request(body()))).json()).swap.action,'SWAP_WITH_BYE');
 const wiring=await readFile(new URL('../app/api/schedule-editor/swap-with-bye/route.js',import.meta.url),'utf8');assert.match(wiring,/authorize: authorizeAdminRequest, rejectViewAs: request => rejectViewAsMutation\(request\)/);
});

test('audit actor comes from authorized identity and cannot be supplied by the client',async()=>{
 let actor;const handler=createScheduleByeSwapHandler({rejectViewAs:()=>null,authorize:async()=>({user:{id:id(900)},supabase:{rpc:async(name,args)=>{actor=args.p_actor_user_id;return {data:{}};}}})});
 assert.equal((await handler(request({...body(),actorUserId:id(901)}))).status,200);assert.equal(actor,id(900));
 const invalid=createScheduleByeSwapHandler({rejectViewAs:()=>null,authorize:async()=>({supabase:{rpc:()=>{throw Error('Must not run without actor');}}})});assert.equal((await invalid(request(body()))).status,500);
});

test('normal generated 0-0/not_entered matches offer byes, while entered/default-looking results stay protected',()=>{
 const f=fixture();f.match.home_score=0;f.match.away_score=0;f.match.score_status='not_entered';assert.equal(getByeSwapCandidates(f).length,2);
 for(const patch of [{score_status:'entered'},{score_entered_at:'2026-10-20'},{home_score:1},{home_score:null},{score_verified_at:'2026-10-20'}])assert.equal(getByeSwapCandidates({...f,match:{...f.match,...patch}}).length,0);
});
