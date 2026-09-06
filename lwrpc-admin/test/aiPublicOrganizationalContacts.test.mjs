import test from 'node:test';
import assert from 'node:assert/strict';
import {validateApprovedDraft,validateApprovedLinks,approvedPublicRevision} from '../app/lib/aiApprovedAnswersShared.js';
import {redactQualityText} from '../app/lib/aiQualitySnapshots.js';
const policy = "Yes. Under Rule 5.11, captains may mutually agree to reschedule a match to another time that day or to another day within the same week, subject to the Rule's scheduling and score-reporting requirements. Whenever captains agree to change a scheduled match date or time, they must also notify League Management at info@lwrpickleballclub.com of the new date and time.";
const draft = approved_answer => ({title:'Match Scheduling Changes',topic_key:'match-scheduling-changes',canonical_question:'As a captain, can I change our scheduled match date or time?',approved_answer,league_scope:'all',temporal_scope:'standing',effective_on:'2026-09-06',public_links:[]});
test('0721 shared public contact preserves exact policy and display casing',()=>{
 for(const value of [policy,policy.replace(String.fromCharCode(39),String.fromCharCode(8217)),'info@lwrpickleballclub.com','INFO@LWRPICKLEBALLCLUB.COM','Notify info@lwrpickleballclub.com.']) {
  assert.equal(validateApprovedDraft(draft(value)).approved_answer,value);
  assert.deepEqual(redactQualityText(value,6000),{text:value,redacted:false});
  assert.equal(approvedPublicRevision(draft(value)).approved_answer,value);
 }
});
test('0721 shared email exception rejects complete unapproved addresses including club-domain and spoof variants',()=>{
 for(const email of ['captain@gmail.com','player@yahoo.com','player@outlook.com','terry@example.com','office@otherclub.org','privateperson@lwrpickleballclub.com','xinfo@lwrpickleballclub.com','info+private@lwrpickleballclub.com','info@lwrpickleballclub.com.evil.org']) {
  const value=`Notify info@lwrpickleballclub.com and ${email}`;
  assert.throws(()=>validateApprovedDraft(draft(value)),/credentials or personal/);
  assert.equal(redactQualityText(value,6000).text,'[detail omitted for privacy]');
 }
});
test('0721 public email cannot exempt secrets phone or signed links',()=>{
 for(const sensitive of ['password: synthetic','API key: synthetic','bearer synthetic','access token: synthetic','Supabase secret: synthetic','HMAC secret: synthetic','Call 941-555-0199','https://lwrpickleballclub.com/private?token=synthetic']) {
  const value=`info@lwrpickleballclub.com ${sensitive}`;
  assert.throws(()=>validateApprovedDraft(draft(value)));
  assert.equal(redactQualityText(value,6000).redacted,true);
 }
 assert.equal(redactQualityText('info@lwrpickleballclub.com member Jane Doe',6000).redacted,true);
 assert.equal(redactQualityText('info@lwrpickleballclub.com',4).text,'info');
 assert.equal(redactQualityText('info@lwrpickleballclub.com',4).redacted,true);
});
test('0721 public email leaves structured URL policy unchanged',()=>{
 assert.equal(validateApprovedLinks([{label:'Club',url:'https://lwrpickleballclub.com'}])[0].url,'https://lwrpickleballclub.com/');
 for(const url of ['javascript:alert(1)','https://user:pass@lwrpickleballclub.com','https://lwrpickleballclub.com/?token=synthetic','https://lwrpickleballclub.com/auth/private'])assert.throws(()=>validateApprovedLinks([{label:'Club',url}]));
 assert.throws(()=>validateApprovedDraft(draft('info@lwrpickleballclub.com <script>alert(1)</script>')));
});
