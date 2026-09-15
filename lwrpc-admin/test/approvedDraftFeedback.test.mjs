import test from 'node:test';
import assert from 'node:assert/strict';
import {draftSaveError} from '../app/ai-assistant/review/approvedDraftFeedback.js';
import {approvedEligible,validateApprovedDraft} from '../app/lib/aiApprovedAnswersShared.js';

test('draft failures preserve useful validation and replace opaque failures',()=>{
 assert.equal(draftSaveError(Error('League scope is required.')),'Draft was not saved. League scope is required.');
 for(const reason of ['', 'HTTP 400','Bad Request','technical_error','Failed to fetch'])assert.equal(draftSaveError(Error(reason)),'Draft was not saved. Please review the required fields and try again.');
});
test('a saved draft is excluded while an eligible active revision can govern',()=>{
 const row={status:'draft',activated_at:null,effective_on:'2026-09-01',expires_on:null,league_scope:'weekday',temporal_scope:'standing',authority_manifest_hash:'current'};
 const context={date:'2026-09-10',scope:'weekday',manifest:'current'};
 assert.equal(approvedEligible(row,context),false);
 const active={...row,status:'active',activated_at:'2026-09-09T00:00:00Z'};
 assert.equal(approvedEligible(active,context),true);
 for(const patch of [{scope:'saturday'},{date:'2026-08-31'},{manifest:'old'}])assert.equal(approvedEligible(active,{...context,...patch}),false);
});
test('shared field validation preserves required title and policy-key restrictions',()=>{
 const draft={title:'Synthetic',topic_key:'synthetic-policy',canonical_question:'How is this policy reviewed?',approved_answer:'Ask League Management.',league_scope:'all',temporal_scope:'standing',season_id:null,effective_on:'2026-09-10',expires_on:null,public_links:[]};
 assert.equal(validateApprovedDraft(draft).topic_key,'synthetic-policy');
 assert.throws(()=>validateApprovedDraft({...draft,title:''}),/Title/);
 assert.throws(()=>validateApprovedDraft({...draft,topic_key:'not a key'}),/policy key/);
});
