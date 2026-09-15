import test from 'node:test';
import assert from 'node:assert/strict';
import {recordFixture} from './helpers/liveRecordFixture.mjs';
import {scheduleNamesMatrix} from './helpers/scheduleNamesMatrix.mjs';
import {mergeScheduleCaptainNames,validScheduleNameArgs} from '../app/lib/scheduleCaptainNames.js';
test('0730 scoped SQL names: Captain/Co-Captains/Player/Club Pro, privacy and unchanged dashboard',async()=>{const db=await recordFixture();try{await scheduleNamesMatrix(db);}finally{await db.close();}});
test('0730 overlay cannot append teams, copy contact fields or retain email fallback',()=>{
 const base=[{id:'a',date:'old',captain:{email:'PRIVATE'}}];
 const r=mergeScheduleCaptainNames(base,[{id:'a',captain:{id:'m',full_name:'Name',email:'PRIVATE',phone:'PRIVATE'}},{id:'b',captain:{full_name:'Other'}}]);
 assert.equal(r.length,1);assert.equal(r[0].date,'old');assert.deepEqual(r[0].captain,{id:'m',full_name:'Name'});assert.equal(mergeScheduleCaptainNames(base)[0].captain,null);assert.equal(base[0].captain.email,'PRIVATE');
 assert.equal(validScheduleNameArgs({divisionId:'10000000-0000-4000-8000-000000000022'}),true);
 for(const x of [null,[],{divisionId:'bad'},{divisionId:'10000000-0000-4000-8000-000000000022',team:'arbitrary'}])assert.equal(validScheduleNameArgs(x),false);
});
