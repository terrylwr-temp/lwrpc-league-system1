import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRatingsCsv,ratingSource} from '../app/lib/seasonRatingsImport.js';

const keys=['duprId','name','doubles','doublesReliability','metrics'];
const metrics=JSON.stringify({subscores:{doubles:{over_65:4.237,over_50:4.511}}});
const values=['ABC123','Synthetic, "Player"','3.237','29.123',metrics];
const encode=row=>row.map(v=>'"'+v.replaceAll('"','""')+'"').join(',');
const canonical=encode(keys)+'\r\n'+encode(values);
for(const [label,extra,ending] of [
 ['omitted quoted column',[""],''],
 ['present empty column',[""],',""'],
 ['multiple omitted columns',["",""],''],
 ['partially supplied empty columns',["",""],','],
 ['whitespace-only trailing header',["  "],''],
])test(`DUPR export: ${label}`,()=>{
 const rows=parseRatingsCsv(encode([...keys,...extra])+'\r\n'+encode(values)+ending);
 assert.deepEqual(rows,parseRatingsCsv(canonical));
 assert.deepEqual(ratingSource(rows[0]),ratingSource(parseRatingsCsv(canonical)[0]));
 assert.equal(rows[0].metrics,metrics);
 assert.equal(rows[0].doubles,'3.237');
 assert.equal(rows[0].doublesreliability,'29.123');
});
test('mixed padded/unpadded rows, BOM and LF retain every record',()=>{
 const text='\uFEFF'+encode([...keys,''])+'\n'+encode(values)+'\n'+encode(values)+',""';
 const rows=parseRatingsCsv(text);assert.equal(rows.length,2);assert.equal(rows[1].line,3);assert.equal(rows[1].metrics,metrics);
});
test('missing named fields, nonempty unnamed columns, extra fields and malformed quoting remain rejected',()=>{
 for(const input of [
  encode([...keys,''])+'\n'+encode(values.slice(0,-1)),
  encode([...keys,''])+'\n'+encode([...values,'unexpected']),
  canonical+',""',
  encode([...keys,'!!!'])+'\n'+encode(values),
  'duprId,,doubles\nABC123,3.237',
  'duprId,""\n"ABC123',
 ])assert.throws(()=>parseRatingsCsv(input));
});
