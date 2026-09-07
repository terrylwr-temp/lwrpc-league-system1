import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {materialQualification,preserveMaterialQualifications} from '../app/lib/aiMaterialQualifications.js';
import {selectAnswerEvidence} from '../app/lib/aiAnswerGeneration.js';
const base='Every registered member may reserve available courts online.';
test('material exception restricts the same proposition',()=>assert.equal(materialQualification(base,'Registered members may reserve available courts online only after payment.'),true));
test('non-material related detail is not a qualification',()=>assert.equal(materialQualification(base,'Registered members reserve available courts online using the reservation screen.'),false));
test('unrelated terminology does not establish a relationship',()=>assert.equal(materialQualification(base,'The online court notice may only display the weather forecast.'),false));
test('contradiction is retained for conflict assessment, not treated as automatic override',()=>{
 const broad={chunkId:'b',documentVersionId:'v',documentType:'league_rules',documentAuthorityRank:1,content:base,combinedScore:.7};
 const narrow={...broad,chunkId:'n',content:'Registered members must not reserve available courts online.'};
 const result=preserveMaterialQualifications({authorityReviewCandidates:[broad,narrow],evidence:{threshold:.35}},[broad]);
 assert.equal(result.length,2); assert.equal(result[0].content,base);assert.match(result[1].content,/must not/);
});
test('foreign scope cannot qualify a broad proposition',()=>{
 const broad={chunkId:'b',documentVersionId:'v',documentType:'league_rules',documentAuthorityRank:1,content:base,combinedScore:.7,heading:'Saturday League'};
 const detail={...broad,chunkId:'n',heading:'PrimeTime League',content:'Registered members may reserve available courts online only after payment.'};
 assert.equal(preserveMaterialQualifications({authorityReviewCandidates:[detail]},[broad]).length,1);
});
test('production candidate already in review preserves material scoring qualification',()=>{
 const trace=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0722-qualification-before.json',import.meta.url)));
 const selected=selectAnswerEvidence({request:{question:trace.question},candidates:trace.candidates,authorityReviewCandidates:trace.review,evidence:{sufficient:true,threshold:.35}});
 assert.match(selected.map(c=>c.content).join('\n'),/game-winning point only while serving/);
 assert.ok(selected.some(c=>c.pageNumber===16)); assert.ok(selected.some(c=>c.pageNumber===15));
 assert.ok(selected.length<=4);
 for(const c of selected)assert.equal(new Set(c.selectedPassages).size,c.selectedPassages.length);
});
for(const question of ['How does rally scoring work?','Do you score when receiving in rally scoring?','Do I have to be serving to win in rally scoring?','What happens at game point in rally scoring?','How does the scoring freeze work?','What are the Weekday rally scoring rules?','What are the Saturday rally scoring rules?','What are the PrimeTime rally scoring rules?'])test('scoring qualification control: '+question,()=>{
 const trace=JSON.parse(fs.readFileSync(new URL('../../docs/lms-0722-qualification-before.json',import.meta.url)));
 const selected=selectAnswerEvidence({request:{question},candidates:trace.candidates,authorityReviewCandidates:trace.review,evidence:{sufficient:true,threshold:.35}});
 assert.match(selected.map(c=>c.content).join('\n'),/game-winning point only while serving/);
 assert.ok(selected.every(c=>c.passageScopes.every(s=>!s.league&&!s.division)));
});
