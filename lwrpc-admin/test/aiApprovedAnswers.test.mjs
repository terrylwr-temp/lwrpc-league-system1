import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateApprovedDraft, validateApprovedLinks, approvedEligible, safeAuthorityWarnings, approvedPublicRevision } from '../app/lib/aiApprovedAnswersShared.js';

const draft = (extra={}) => ({ title:'Synthetic administrative policy', topic_key:'synthetic-policy', canonical_question:'How is the synthetic administrative procedure handled?', approved_answer:'The synthetic procedure requires confirmation from the organizer.', league_scope:'all', temporal_scope:'standing', effective_on:'2026-09-06', public_links:[], ...extra });
test('0721 draft validation preserves complete Unicode and rejects invalid dates/scopes',()=>{
 const input=draft({approved_answer:'İ'.repeat(6000)}); assert.equal(validateApprovedDraft(input).approved_answer,input.approved_answer);
 assert.throws(()=>validateApprovedDraft(draft({approved_answer:'x'.repeat(6001)})),/6000/);
 assert.throws(()=>validateApprovedDraft(draft({effective_on:'2026-02-30'})),/valid date/);
 assert.throws(()=>validateApprovedDraft(draft({league_scope:'team'})),/scope/);
 assert.throws(()=>validateApprovedDraft(draft({temporal_scope:'season'})),/require/);
 assert.throws(()=>validateApprovedDraft(draft({expires_on:'2026-09-06'})),/after/);
 const wide=draft({approved_answer:'😀'.repeat(6000),canonical_question:'😀'.repeat(2400)});
 assert.throws(()=>validateApprovedDraft(wide),/32 KiB/);
});
test('0721 structured public links exclude executable/private/signed destinations',()=>{
 assert.deepEqual(validateApprovedLinks([{label:'Club',url:'https://lwrpickleballclub.com'}]),[{label:'Club',url:'https://lwrpickleballclub.com/'}]);
 for(const url of ['javascript:alert(1)','http://lwrpickleballclub.com','https://evil.example','https://127.0.0.1','https://lwrpickleballclub.com/?token=x','https://user:pass@lwrpickleballclub.com/','https://lwrpickleballclub.com/auth/callback','https://lwrpickleballclub.com/%2e%2e/private','https://lwrpickleballclub.com/#token'])assert.throws(()=>validateApprovedLinks([{label:'Unsafe',url}]));
 assert.throws(()=>validateApprovedDraft(draft({approved_answer:'<script>bad</script>'})),/plain text/);
});
test('0721 eligibility is lifecycle, date, scope, season and authority bound',()=>{
 const row={...draft(),status:'active',activated_at:'2026-09-06T12:00:00Z',authority_manifest_hash:'manifest'};
 const context={date:'2026-09-06',manifest:'manifest'};
 assert.equal(approvedEligible(row,context),true);
 for(const status of ['draft','retired'])assert.equal(approvedEligible({...row,status},context),false);
 assert.equal(approvedEligible(row,{...context,date:'2026-09-05'}),false);
 assert.equal(approvedEligible({...row,expires_on:'2026-09-07'},{...context,date:'2026-09-07'}),false);
 assert.equal(approvedEligible(row,{...context,manifest:'new-rules'}),false);
 assert.equal(approvedEligible({...row,league_scope:'saturday'},context),false);
 assert.equal(approvedEligible({...row,league_scope:'saturday'},{...context,scope:'saturday'}),true);
 const seasonId=randomUUID();const seasonal={...row,temporal_scope:'season',season_id:seasonId};
 assert.equal(approvedEligible(seasonal,context),false);assert.equal(approvedEligible(seasonal,{...context,seasonId}),true);
});
test('0721 warning metadata is bounded and excludes free text/actors',()=>{
 const warning={approvedAnswerId:randomUUID(),approvedRevisionId:randomUUID(),documentId:randomUUID(),documentVersionId:randomUUID(),chunkId:randomUUID(),reason:'opposed_permission',leagueScope:'all',question:'private question',answer:'private answer',actor:'private actor'};
 const output=safeAuthorityWarnings(Array(10).fill(warning));assert.equal(output.length,4);
 assert.equal(JSON.stringify(output).includes('private'),false);
 assert.deepEqual(safeAuthorityWarnings([{...warning,reason:'ordinary_multiple_sources'}]),[]);
 assert.deepEqual(safeAuthorityWarnings([{...warning,chunkId:'invalid'}]),[]);
 const publicValue=approvedPublicRevision({...draft(),manager_notes:'private',actor_user_id:'private',embedding:[1]});
 assert.equal(JSON.stringify(publicValue).includes('private'),false);assert.equal('embedding' in publicValue,false);
});
