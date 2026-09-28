import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import * as rosterChecks from '../app/lib/rosterPlayerChecks.js';
const templateSource=readFileSync(new URL('../app/lib/emailTemplates.js',import.meta.url),'utf8');
const templateKeys=templateSource.match(/export (const EMAIL_TEMPLATE_KEYS = \{[\s\S]*?\n\};)/);
assert.ok(templateKeys);
const EMAIL_TEMPLATE_KEYS=vm.runInNewContext(templateKeys[1]+';EMAIL_TEMPLATE_KEYS');

const source=readFileSync(new URL('../app/teams/[id]/page.js',import.meta.url),'utf8');
function action(name){
 const match=new RegExp('^  (?:async )?function '+name+'\\(', 'm').exec(source);
 assert.ok(match,'Missing roster action: '+name);
 const after=source.slice(match.index+match[0].length);
 const next=/^  (?:async )?function |^function |^  const /m.exec(after);
 assert.ok(next,'Missing roster action boundary: '+name);
 return source.slice(match.index,match.index+match[0].length+next.index);
}
const actions=['getSeasonRating','formatMemberName','getRatingType','getRatingLabel','getPlayerRating',
 'memberHasDuprId','hasNrDuprDoublesRating','ratingRangeLabel','playerRatingEligibility',
 'handleAvailablePlayerSelection','sendRatingCheckAlert','sendRatingCheckPlayerAlert','addPlayer'].map(action).join('\n');
async function add({rating={},member={},seasonRatings,roster=[],division={},viewAs=false,insertError=null,homeRestriction=false}={}){
 const selected={id:'player',first_name:'Alex',last_name:'Player',email:'player@example.invalid',dupr_id:'D12345',location_id:'other',...member};
 const rows=seasonRatings??[{member_id:selected.id,season_id:'current',dupr_doubles_rating:null,
  season_dupr_rating:null,season_primetime_rating:null,dupr_reliability_rating:100,...rating}];
 const before=structuredClone(rows),requests=[],inserts=[],alerts=[],events=[];
 let selectedId=selected.id,modalOpen=true,reloads=0;
 const context={...rosterChecks,EMAIL_TEMPLATE_KEYS,id:'team',members:[selected],seasonRatings:rows,roster,
  selectedMemberId:selected.id,team:{name:'Team',home_location_id:'home',captain:{email:'captain@example.invalid'},
   co_captain_1:{email:'co@example.invalid'},co_captain_2:{email:'CAPTAIN@example.invalid'},
   divisions:{rating_type:'dupr',min_dupr:3,max_dupr:5,...division,leagues:{season_id:'current',name:'League'}}},
  locations:[{id:'home',name:'Home'}],homeCommunityRestrictionApplies:homeRestriction,
  normalizeLocationName:v=>String(v??'').toLowerCase(),isViewAsMode:()=>viewAs,
  alert:message=>alerts.push(message),console:{warn(){}},
  setSelectedMemberId:value=>{selectedId=value;},setAddPlayerModalOpen:value=>{modalOpen=value;},loadData:()=>{reloads++;},
  supabase:{from(table){assert.equal(table,'team_members');return {insert:async row=>{inserts.push(JSON.parse(JSON.stringify(row)));events.push('insert');return {error:insertError};}};}},
  getRequestAuthorizationHeaders:async headers=>headers,captainAlertDetailsHtml:()=>'',
  loadClientEmailTemplate:async key=>({key}),renderEmailTemplate:(template,fields)=>({subject:template.key,text:fields.reason,html:fields.reason}),
  fetch:async(url,options)=>{assert.equal(url,'/api/notifications');assert.equal(options.method,'POST');
   const payload=JSON.parse(options.body);requests.push(payload);events.push(payload.subject);
   return {ok:true,json:async()=>({email:{sent:payload.emails.length}})};
  },
 };
 const run=vm.runInNewContext(actions+'\n({addPlayer,handleAvailablePlayerSelection,playerRatingEligibility})',context);
 const eligibility=run.playerRatingEligibility(selected);
 run.handleAvailablePlayerSelection(selected.id);
 const selectionAlerts=[...alerts];alerts.length=0;
 await run.addPlayer();
 assert.deepEqual(rows,before,'Roster add does not modify rating rows');
 return {requests,inserts,alerts,events,selectionAlerts,eligibility,selectedId,modalOpen,reloads};
}
function assertAdded(result){
 assert.deepEqual(result.inserts,[{team_id:'team',member_id:'player'}]);
 assert.equal(result.selectedId,'');assert.equal(result.modalOpen,false);assert.equal(result.reloads,1);
}
function assertNoEmails(result){
 assertAdded(result);assert.equal(result.requests.length,0,'Neither League Management nor player/captains receive a missing-DUPR email');
 assert.deepEqual(result.selectionAlerts,[],'Selection must not promise suppressed emails');assert.deepEqual(result.alerts,[]);
}

test('missing underlying Doubles information preserves both existing alerts when Season rating is missing',async()=>{
 for(const doubles of [null,undefined,'','  ','NR','invalid']){
  const result=await add({rating:{dupr_doubles_rating:doubles}});assertAdded(result);
  assert.deepEqual(result.requests.map(r=>r.subject),[EMAIL_TEMPLATE_KEYS.ratingCheckAlert,EMAIL_TEMPLATE_KEYS.ratingCheckAlertToPlayer]);
  assert.deepEqual(result.requests[0].emails,['info@lwrpickleballclub.com']);
  assert.deepEqual(result.requests[1].emails,['player@example.invalid','captain@example.invalid','co@example.invalid']);
  assert.equal(result.events[0],'insert');assert.equal(result.selectionAlerts.length,1);
 }
 const missingRow=await add({seasonRatings:[]});assertAdded(missingRow);assert.equal(missingRow.requests.length,2);
});

test('numeric DUPR Doubles plus missing Season DUPR adds the player without either email',async()=>{
 for(const doubles of [3.876,'3.876',' 3.876 '])for(const final of [null,undefined]){
  const result=await add({rating:{dupr_doubles_rating:doubles,season_dupr_rating:final}});
  assert.equal(result.eligibility,'Rating Needed');assert.equal(rosterChecks.rosterPlayerSelectionDisabled(result.eligibility),false);assertNoEmails(result);
 }
});

test('numeric DUPR Doubles plus NR Season classification does not generate either email',async()=>{
 const result=await add({rating:{dupr_doubles_rating:'3.876',season_dupr_rating:'NR',notes:'Classified NR pending cleanup'}});
 assert.equal(result.eligibility,'Rating Needed');assertNoEmails(result);
});

test('Doubles rating with Reliability Score at the inclusive cleanup threshold does not email',async()=>{
 for(const threshold of [29,50])assertNoEmails(await add({rating:{dupr_doubles_rating:'3.876',dupr_reliability_rating:threshold,season_dupr_rating:null}}));
});

test('Doubles rating with Reliability Score below the cleanup threshold does not email',async()=>{
 for(const score of [28,0])assertNoEmails(await add({rating:{dupr_doubles_rating:'3.876',dupr_reliability_rating:score,season_dupr_rating:null}}));
});

test('Doubles presence suppresses the same missing-final proxy for PrimeTime and Self Rating teams',async()=>{
 for(const rating_type of ['primetime','self_rating'])assertNoEmails(await add({division:{rating_type},rating:{dupr_doubles_rating:'3.876'}}));
});

test('genuinely missing DUPR ID still sends both alerts even when Doubles rating exists',async()=>{
 const result=await add({member:{dupr_id:' '},rating:{dupr_doubles_rating:'3.876'}});assertAdded(result);
 assert.equal(result.requests.length,2);assert.ok(result.requests.every(r=>r.text.includes('No DUPR ID entered')));assert.equal(result.selectionAlerts.length,1);
});

test('existing valid Season rating without Doubles does not introduce a new notification',async()=>{
 assertNoEmails(await add({rating:{season_dupr_rating:3.8}}));
});

test('literal underlying NR with assigned Season rating preserves the existing manager-only alert',async()=>{
 const result=await add({rating:{dupr_doubles_rating:'NR',season_dupr_rating:3.8}});assertAdded(result);
 assert.equal(result.requests.length,1);assert.equal(result.requests[0].subject,EMAIL_TEMPLATE_KEYS.ratingCheckAlert);
 assert.deepEqual(result.requests[0].emails,['info@lwrpickleballclub.com']);
});

test('rating-range, duplicate, home-community and View-As guards still prevent inserts and emails',async()=>{
 const cases=[{rating:{season_dupr_rating:5.1,dupr_doubles_rating:3.8}},
  {roster:[{member_id:'player'}],rating:{dupr_doubles_rating:3.8}},
  {homeRestriction:true,rating:{dupr_doubles_rating:3.8}},
  {viewAs:true,rating:{dupr_doubles_rating:3.8}}];
 for(const fixture of cases){const result=await add(fixture);assert.equal(result.inserts.length,0);assert.equal(result.requests.length,0);}
});

test('failed roster insert never sends either missing-information email',async()=>{
 const result=await add({insertError:{message:'Synthetic insert failure'}});
 assert.equal(result.inserts.length,1);assert.equal(result.requests.length,0);assert.deepEqual(result.alerts,['Synthetic insert failure']);assert.equal(result.reloads,0);
});
