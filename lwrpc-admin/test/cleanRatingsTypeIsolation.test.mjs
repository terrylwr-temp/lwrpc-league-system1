import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const page=readFileSync(new URL('../app/ratings/page.js',import.meta.url),'utf8');
function helper(name) {
 const start=page.indexOf('\nfunction '+name+'(');
 assert.ok(start>=0,'Missing cleanup helper: '+name);
 const end=page.indexOf('\nfunction ',start+1);
 return page.slice(start,end<0?undefined:end);
}
function action(name) {
 const start=page.indexOf('  async function '+name+'(');
 const end=page.indexOf('\n  async function ',start+1);
 assert.ok(start>=0 && end>start);
 return page.slice(start,end);
}
const helpers=['isReliabilityNrAdjustment','cleanedSeasonDuprRating','cleanedAgeBasedRating',
 'truncateToTenth','reliabilityAdjustmentNote','ratingNotesWithReliabilityAdjustment','ratingCleanupValuesMatch'].map(helper).join('\n');
const base={id:'rating',member_id:'player',season_id:'selected',
 dupr_doubles_rating:'NR',dupr_age_based_rating:'NR',dupr_reliability_rating:100,
 season_dupr_rating:3.1,season_primetime_rating:4.1,notes:'Existing note'};
function roster(type,max,overrides={}) {
 return {member_id:'player',teams:{id:type+'-'+max,is_active:true,divisions:{
  id:'division-'+type+'-'+max,rating_type:type,max_dupr:max,
  name:type==='dupr'?'PrimeTime display name':'Regular DUPR display name',
  leagues:{id:'league-'+type,season_id:'selected'}}},...overrides};
}
async function plan(rosters,overrides={},threshold=29) {
 const rating={...base,...overrides},before=structuredClone(rating);
 const teamsBefore=structuredClone(rosters);
 let projection;
 const run=vm.runInNewContext(helpers+'\n'+action('buildRatingCleanupChanges')+'\nbuildRatingCleanupChanges',{
  selectedSeason:'selected',ratings:[rating],members:[{id:'player'}],
  supabase:{from(table){assert.equal(table,'team_members');return {
   select:async text=>{projection=text;return {data:rosters,error:null};}
  };}}
 });
 const result=JSON.parse(JSON.stringify(await run(threshold)));
 assert.deepEqual(rating,before,'Cleanup planning preserves every source/final input');
 assert.deepEqual(rosters,teamsBefore,'Cleanup never changes roster inputs');
 return {...result,projection};
}

test('DUPR-only NR and low-RF cleanup uses the regular division and preserves the other final',async()=>{
 for(const inputs of [{},{dupr_doubles_rating:'3.876',dupr_reliability_rating:28}]) {
  const {changes}=await plan([roster('dupr',4.5)],inputs);
  assert.equal(changes[0].payload.season_dupr_rating,4);
  assert.equal(Object.hasOwn(changes[0].payload,'season_primetime_rating'),false);
 }
});

test('PrimeTime-only NR and low-RF cleanup uses the PrimeTime division and preserves regular final',async()=>{
 for(const inputs of [{},{dupr_age_based_rating:'4.876',dupr_reliability_rating:28}]) {
  const {changes}=await plan([roster('primetime',5)],inputs);
  assert.equal(changes[0].payload.season_primetime_rating,4.5);
  assert.equal(Object.hasOwn(changes[0].payload,'season_dupr_rating'),false);
 }
});

test('dual-type NR and inclusive low-RF cleanup produce independent final ratings',async()=>{
 for(const inputs of [{},{dupr_doubles_rating:'3.876',dupr_age_based_rating:'4.876',dupr_reliability_rating:29}]) {
  const {changes}=await plan([roster('dupr',4.5),roster('primetime',5)],inputs);
  assert.equal(changes[0].payload.season_dupr_rating,4);
  assert.equal(changes[0].payload.season_primetime_rating,4.5);
  const regularChanged=await plan([roster('dupr',4.9),roster('primetime',5)],inputs);
  assert.equal(regularChanged.changes[0].payload.season_primetime_rating,4.5);
  const primeChanged=await plan([roster('dupr',4.5),roster('primetime',5.5)],inputs);
  assert.equal(primeChanged.changes[0].payload.season_dupr_rating,4);
 }
});

test('each type preserves highest eligible division selection and max-minus-0.5 truncation',async()=>{
 const rows=[roster('dupr',4.5),roster('primetime',5.2),roster('dupr','4.899'),roster('primetime','5.499')];
 for(const ordered of [rows,[...rows].reverse()]) {
  const {changes}=await plan(ordered);
  assert.equal(changes[0].payload.season_dupr_rating,4.3);
  assert.equal(changes[0].payload.season_primetime_rating,4.9);
 }
});

test('reliable players above the selected cutoff retain numeric cleanup regardless of roster divisions',async()=>{
 for(const rows of [[],[roster('dupr',7.9),roster('primetime',9.9)]]) {
  const {changes}=await plan(rows,{dupr_doubles_rating:'3.876',dupr_age_based_rating:'4.876',dupr_reliability_rating:30});
  assert.deepEqual(changes[0].payload,{season_dupr_rating:3.8,season_primetime_rating:4.8});
 }
 const zero=await plan([roster('dupr',7.9),roster('primetime',9.9)],{dupr_doubles_rating:'3.876',dupr_age_based_rating:'4.876',dupr_reliability_rating:0},0);
 assert.deepEqual(zero.changes[0].payload,{season_dupr_rating:3.8,season_primetime_rating:4.8});
});

test('unknown/self-rating, inactive teams and other seasons cannot contribute maxima',async()=>{
 const inactive=roster('dupr',8);inactive.teams.is_active=false;
 const old=roster('primetime',9);old.teams.divisions.leagues.season_id='other';
 const rows=[roster('dupr',4.5),roster('primetime',5),roster('self_rating',10),roster('unknown',11),inactive,old];
 const {changes}=await plan(rows);
 assert.equal(changes[0].payload.season_dupr_rating,4);
 assert.equal(changes[0].payload.season_primetime_rating,4.5);
});

test('cleanup reads division rating_type and retains legacy null-type DUPR default',async()=>{
 const {changes,projection}=await plan([roster(null,4.5)]);
 assert.match(projection,/\brating_type\b/);
 assert.equal(changes[0].payload.season_dupr_rating,4);
 assert.equal(Object.hasOwn(changes[0].payload,'season_primetime_rating'),false);
});

test('PrimeTime NR can use its own division when Doubles is NR and age input is absent',async()=>{
 const {changes}=await plan([roster('dupr',4.5),roster('primetime',5)],{dupr_age_based_rating:null,season_primetime_rating:null});
 assert.equal(changes[0].payload.season_dupr_rating,4);
 assert.equal(changes[0].payload.season_primetime_rating,4.5);
});

test('absence of a PrimeTime division preserves existing numeric age cleanup and never borrows DUPR',async()=>{
 const {changes}=await plan([roster('dupr',4.5)],{dupr_age_based_rating:'4.659'});
 assert.equal(changes[0].payload.season_dupr_rating,4);
 assert.equal(changes[0].payload.season_primetime_rating,4.6);
 const missing=await plan([roster('self_rating',9)]);
 assert.deepEqual(missing.changes,[]);
});

test('synthetic Clean applies the isolated finals without writing rating inputs or roster data',async()=>{
 const {changes}=await plan([roster('dupr',4.5),roster('primetime',5)]);
 const writes=[];
 const apply=vm.runInNewContext(action('applyRatingCleanupChanges')+'\napplyRatingCleanupChanges',{
  selectedSeason:'selected',Date,
  supabase:{from(table){assert.equal(table,'member_season_ratings');return {
   update(payload){writes.push(JSON.parse(JSON.stringify(payload)));return {eq:async(k,v)=>{assert.equal(k,'id');assert.equal(v,'rating');return {error:null};}};}
  };}},
  loadRatings:async()=>{},loadAllRatings:async()=>{},setRatingsRefreshVersion:()=>{},
  setRatingImportStatus:()=>{},alert:()=>{assert.fail('Unexpected alert');}
 });
 assert.equal(await apply(changes,29),true);
 assert.equal(writes.length,1);
 assert.equal(writes[0].season_dupr_rating,4);
 assert.equal(writes[0].season_primetime_rating,4.5);
 assert.deepEqual(Object.keys(writes[0]).sort(),['season_dupr_rating','season_primetime_rating','updated_at']);
});