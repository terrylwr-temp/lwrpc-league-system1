import test from 'node:test';
import assert from 'node:assert/strict';
import { memberImportLocation } from '../app/lib/memberImportLocation.js';

const locations = [
  { id: 'heights', name: 'Esplanade at the Heights', is_active: true },
  { id: 'indigo', name: 'Indigo @ LWR', is_active: true },
];
test('new imported member receives matching text and link together', () => {
  assert.deepEqual(memberImportLocation(null, ' Esplanade at the Heights ', locations), {
    patch: { club_location: 'Esplanade at the Heights', location_id: 'heights' }, review: false,
  });
});
test('missing link uses existing community, not conflicting import', () => {
  assert.deepEqual(memberImportLocation({club_location:'Esplanade at the Heights', location_id:null}, 'Indigo @ LWR', locations), {
    patch: {location_id:'heights'}, review:false,
  });
});
test('non-null conflicting link remains unchanged and is flagged', () => {
  assert.deepEqual(memberImportLocation({club_location:'Esplanade at the Heights',location_id:'indigo'}, 'Esplanade at the Heights', locations), {patch:{},review:true});
});
test('duplicate or inactive matches never assign a link', () => {
  for (const catalog of [[...locations,{id:'duplicate',name:'esplanade at the heights',is_active:true}], [{id:'old',name:'Esplanade at the Heights',is_active:false}]]) {
    assert.deepEqual(memberImportLocation(null, 'Esplanade at the Heights', catalog), {patch:{club_location:'Esplanade at the Heights'},review:true});
  }
});
test('aliases are not guessed and established alias links are preserved', () => {
  assert.deepEqual(memberImportLocation(null, 'The Heights', locations), {patch:{club_location:'The Heights'},review:true});
  assert.deepEqual(memberImportLocation({club_location:'The Heights',location_id:'heights'}, '', locations), {patch:{},review:true});
});
test('blank input does not clear a community and exact matching ignores case/edge whitespace', () => {
  assert.deepEqual(memberImportLocation(null, '', locations), {patch:{},review:false});
  assert.deepEqual(memberImportLocation({club_location:' esplanade AT the heights ',location_id:null}, '', locations), {patch:{location_id:'heights'},review:false});
  assert.deepEqual(memberImportLocation({club_location:'Esplanade at the Heights',location_id:'heights'}, '', locations), {patch:{},review:false});
});
