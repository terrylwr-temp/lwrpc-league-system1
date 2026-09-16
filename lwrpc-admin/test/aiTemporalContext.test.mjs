import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveTemporalContext} from '../app/lib/aiTemporalContext.js';
const derive=(content,metadata={title:'2026 Fall Season Timeline'})=>deriveTemporalContext(content,metadata);
test('same-year events inherit the official season year, not the current year',()=>{
 assert.deepEqual(derive('• Oct. 7 - Schedules sent\n• Nov. 8 - Match').map(x=>x.calendarYear),['2026','2026']);
});
test('December to January and later events inherit next calendar year',()=>{
 const text='• Oct. 17 - Season starts\n• Nov. 7 - Event\n• Dec. 12 - Last games\n• Jan. 9 / 16 - Second half\n• Feb. 20 / 27 - End of Regular Season';
 const events=derive(text);
 assert.deepEqual(events.map(x=>x.calendarYear),['2026','2026','2026','2027','2027']);
 assert.equal(events[4].derivation,'ordered_source_month_rollover');
 for(const e of events)assert.equal(text.slice(e.start,e.end),e.sourceText);
});
test('explicit source years take precedence over heading year and inference',()=>{
 const events=derive('• Dec. 9, 2028 - Event\n• Jan. 5, 2030 - Event\n• Feb. 2 - Event');
 assert.deepEqual(events.map(x=>x.calendarYear),['2028','2030','2030']);
 assert.equal(events[1].derivation,'explicit_source_year');
});
test('month/day-only entries under a season-year heading and two-year titles',()=>{
 assert.equal(derive('Jan. 9 - Event',{heading:'2028 Season calendar'} )[0].calendarYear,'2028');
 assert.deepEqual(derive('• Oct. 5 - Start\n• Jan. 9 - Finish',{title:'Season 2026–2027 timeline'}).map(x=>x.calendarYear),['2026','2027']);
 assert.equal(derive('2029 Season Timeline\n• Jan. 9 - Event',{title:'Uploaded document'})[0].calendarYear,'2029');
});
test('unanchored years and unordered summer month changes stay unknown',()=>{
 assert.equal(derive('• Jan. 5 - Event',{title:'Season timeline'})[0].calendarYear,null);
 assert.equal(derive('• Jun. 5 - Event\n• May 2 - Event')[1].calendarYear,null);
});
test('nullable stored heading is supported during source revalidation',()=>{
 assert.equal(derive('• Oct. 7 - Schedules sent',{title:'2026 Important Dates',heading:null})[0].calendarYear,'2026');
 assert.deepEqual(derive(null,{title:null,heading:null}),[]);
});
