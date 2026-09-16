import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const page = readFileSync(new URL('../app/ratings/page.js', import.meta.url), 'utf8');
function helper(name) {
  const start = page.indexOf(`\nfunction ${name}(`);
  assert.ok(start >= 0);
  const end = page.indexOf('\nfunction ', start + 1);
  return page.slice(start, end < 0 ? undefined : end);
}
function action(name) {
  const start = page.indexOf(`  async function ${name}(`);
  assert.ok(start >= 0);
  const end = page.indexOf('\n  async function ', start + 1);
  assert.ok(end > start);
  return page.slice(start, end);
}
const helpers = ['isReliabilityNrAdjustment', 'cleanedSeasonDuprRating', 'cleanedAgeBasedRating',
  'truncateToTenth', 'reliabilityAdjustmentNote', 'ratingNotesWithReliabilityAdjustment', 'ratingCleanupValuesMatch']
  .map(helper).join('\n');
const age = vm.runInNewContext(`${helpers}\ncleanedAgeBasedRating`);
const base = {id:'row',member_id:'member',season_id:'selected',dupr_doubles_rating:'4.114',
  dupr_reliability_rating:100,dupr_age_based_rating:'4.659',season_dupr_rating:4.1,
  season_primetime_rating:null,notes:'Preserve this note'};
async function plan(rows = [base], rf = 29, roster = []) {
  const original = structuredClone(rows);
  const run = vm.runInNewContext(`${helpers}\n${action('buildRatingCleanupChanges')}\nbuildRatingCleanupChanges`, {
    selectedSeason:'selected',ratings:rows,members:[{id:'member'}],
    supabase:{from(table){assert.equal(table,'team_members');return {select:async()=>({data:roster,error:null})};}}
  });
  const result = await run(rf);
  assert.deepEqual(rows, original, 'planning never mutates inputs');
  return JSON.parse(JSON.stringify(result));
}

test('Age-Based query includes separate input used by Clean',()=>{
  const select = page.match(/const RATING_SELECT = "([^"]+)"/)[1].split(',').map(s=>s.trim());
  assert.ok(select.includes('dupr_age_based_rating'));
});
test('reported 4.659 input creates 4.6 final without altering precision, RF, notes or regular final',async()=>{
  const {changes} = await plan();
  assert.equal(changes.length,1);
  assert.deepEqual(changes[0].payload,{season_dupr_rating:4.1,season_primetime_rating:4.6});
  assert.deepEqual(changes[0].changedFields,['season_primetime_rating']);
});
test('imported input takes precedence over old final and explicit repeat is no change',async()=>{
  assert.equal(age('4.659','3.8'),4.6);
  const {changes} = await plan([{...base,season_primetime_rating:'4.60'}]);
  assert.equal(changes[0].hasChanges,false);
  assert.deepEqual(changes[0].changedFields,[]);
});
test('blank input retains legacy final truncation; both blank never manufacture a value',()=>{
  for(const blank of [null,undefined,'','  ']) {
    assert.equal(age(blank,'3.987'),3.9);
    assert.equal(age(blank,null),null);
  }
});
test('present invalid input does not fall back or overwrite final; truncation never rounds up',async()=>{
  for(const invalid of ['NR','bad','Infinity']) {
    assert.equal(age(invalid,'4.2'),null);
    const {changes} = await plan([{...base,dupr_age_based_rating:invalid,season_primetime_rating:4.2}]);
    assert.equal(Object.hasOwn(changes[0].payload,'season_primetime_rating'),false);
  }
  for(const [raw,expected] of [['4.699',4.6],['4.6',4.6],['3.001',3],['4.659',4.6]]) assert.equal(age(raw),expected);
});
test('another season input cannot supply the selected season final',async()=>{
  const {changes} = await plan([{...base,dupr_age_based_rating:null},{...base,id:'other',season_id:'other'}]);
  assert.equal(Object.hasOwn(changes[0].payload,'season_primetime_rating'),false);
});
test('regular RF cutoff and NR division calculation remain unchanged',async()=>{
  const roster = [{member_id:'member',teams:{is_active:true,divisions:{max_dupr:4.5,leagues:{season_id:'selected'}}}}];
  for(const [rf,expected] of [[29,4],[30,4.1],[null,4.1]]) {
    const {changes} = await plan([{...base,dupr_reliability_rating:rf}],29,roster);
    assert.equal(changes[0].payload.season_dupr_rating,expected);
    assert.equal(changes[0].payload.season_primetime_rating,4.6);
  }
  const {changes} = await plan([{...base,dupr_doubles_rating:'NR'}],29,roster);
  assert.equal(changes[0].payload.season_dupr_rating,4);
});
test('successful synthetic Clean writes only proposed finals then refreshes selected grid; failure shows no success',async()=>{
  const {changes} = await plan();
  for(const fails of [false,true]) {
    const events=[];
    const apply=vm.runInNewContext(`${action('applyRatingCleanupChanges')}\napplyRatingCleanupChanges`,{
      selectedSeason:'selected',Date,
      supabase:{from(table){assert.equal(table,'member_season_ratings');return {update(payload){
        assert.equal(payload.season_primetime_rating,4.6);
        assert.deepEqual(Object.keys(payload).sort(),['season_dupr_rating','season_primetime_rating','updated_at']);
        return {eq:async(k,v)=>{assert.equal(k,'id');assert.equal(v,'row');events.push('write');return {error:fails?{message:'Failed'}:null};}};
      }}}},
      loadRatings:async s=>{assert.equal(s,'selected');events.push('selected read');},
      loadAllRatings:async()=>events.push('all read'),
      setRatingsRefreshVersion:fn=>{assert.equal(fn(4),5);events.push('grid refresh');},
      setRatingImportStatus:s=>{assert.match(s,/1 Age-Based/);events.push('success');},
      alert:s=>{assert.equal(s,'Failed');events.push('error');}
    });
    assert.equal(await apply(changes,29),!fails);
    assert.deepEqual(events,fails?['write','error']:['write','selected read','all read','grid refresh','success']);
  }
});
