import test from 'node:test';
import assert from 'node:assert/strict';
import {redactQualityText} from '../app/lib/aiQualitySnapshots.js';
import {hasQualityPersonalName} from '../app/lib/aiQualityNameClassification.js';
test('0721 structural possessives require context and preserve apostrophe spelling',()=>{
 for(const term of ['Rule','Rules','League','Management','Captain','Home Captain','Visiting Captain','Team','Division','Match Setup','Season DUPR','USA Pickleball','Picklebreaker','League Rule','USAP Rule'])for(const apostrophe of ["'",'’']) {
  const value=`the ${term}${apostrophe}s requirements`;
  assert.deepEqual(redactQualityText(value,6000),{text:value,redacted:false});
 }
 for(const value of ['Rule','Rules',"Rules'",'Rule 5.11','under Rule 5.11',"Rule's requirements",'the Rule’s scheduling and score-reporting requirements'])assert.equal(redactQualityText(value,6000).redacted,false);
});
test('0721 structural terms never exempt identity or mixed private content',()=>{
 for(const value of ["John Smith's requirements",'member John Smith',"John Rule's requirements","the member Rule's requirements","the Captain's roster and John Smith's address",'Under Rule 5.11, contact John Smith at personal@example.com',"John Smith's email is info@lwrpickleballclub.com",'the Rule’s requirements; player John Smith',"the Rule's requirements; 941-555-0199",'under Rule 5.11; info@lwrpickleballclub.com bearer synthetic'])assert.equal(redactQualityText(value,6000).redacted,true,value);
 assert.equal(hasQualityPersonalName("the Smith's requirements"),true);
});
