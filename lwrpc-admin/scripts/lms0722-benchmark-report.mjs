import fs from 'node:fs';import assert from 'node:assert/strict';
import {officialQuestionConcept} from '../app/lib/aiQuestionConcepts.js';
const benchmark=JSON.parse(fs.readFileSync('../docs/lms-0722-generated-benchmark.json'));
const required=JSON.parse(fs.readFileSync('../docs/lms-0722-required-league-controls.json'));
for(const question of required){
 const r=benchmark.results.find(r=>r.question===question);assert.ok(r);assert.equal(r.kind,'answer');assert.ok(r.sources.length);
 const league=officialQuestionConcept(question).leagues[0];
 assert.ok(r.selected.every(s=>s.scope.every(p=>p.league===league&&!p.ambiguousLeague)));
 assert.ok(r.sources.every(s=>!s.citation.includes('Saturday League PrimeTime League')));
 const content=[r.answer,...r.selected.map(s=>s.content)].join(' ');
 if(league==='primetime')assert.doesNotMatch(content,/Saturday|Weekday|6 men|6 women|12 players|25 points|to 25|mixed round|mixed teams/i);
 if(league==='saturday')assert.doesNotMatch(content,/PrimeTime|Weekday|65 or older|2 out of 3 to 11/i);
 if(question.startsWith('How many')){assert.match(r.answer,/match/);assert.doesNotMatch(r.answer,/maximum|roster is|roster size/);}
}
const run=benchmark.results;const ms=run.filter(x=>x.modelCalls).map(x=>x.wallMs).sort((a,b)=>a-b);
const replay=JSON.parse(fs.readFileSync('../docs/lms-0722-current-replay.json')).cases;
const started=performance.now();for(let i=0;i<1000;i++)for(const q of required)officialQuestionConcept(q);
const intentMs=(performance.now()-started)/(1000*required.length);
const report={version:'LMS-0722 / 0.1.544',questions:run.length,grounded:run.filter(x=>x.kind==='answer').length,clarifications:run.filter(x=>x.kind==='clarification').length,insufficient:run.filter(x=>x.kind==='insufficient_evidence').length,modelCalls:run.reduce((n,r)=>n+r.modelCalls,0),requiredScopedControls:required.length,crossLeagueLeakage:0,modelPlusSourceWallMs:{min:ms[0],median:ms[Math.floor(ms.length/2)],max:ms.at(-1)},deterministicConceptMeanMs:intentMs,requiredRetrievalSamples:replay.filter(c=>required.includes(c.question)).map(c=>({question:c.question,metrics:c.metrics,assistance:c.conceptAssistance})),limitations:['Captured active production RPC results, local corrected selection, live configured model/source validation. Not deployed UI acceptance or a load test.','Retrieval timing samples span implementation; old selections are historical. Generated benchmark records the final selected evidence for each run.','Original production baseline uses owner reports and diagnosis, not newly manufactured historical answers.']};
fs.writeFileSync('../docs/lms-0722-benchmark-metrics.json',JSON.stringify(report,null,2));
const esc=s=>String(s||'').replaceAll('|','/').replaceAll('\n',' ');
const lines=['# LMS-0722 generated-answer benchmark','',benchmark.method,'','The 12 named-league mandatory controls passed with **Cross-League Leakage = 0** in this bounded run. Assertions inspect selected passage scopes, foreign-league propositions, citations, and match-count wording. These results require confirmation after authorized deployment.','','| Question | Outcome | Calls | Official citation(s) | Generated answer |','|---|---|---:|---|---|'];
for(const r of run)lines.push(`| ${esc(r.question)} | ${r.kind} | ${r.modelCalls} | ${esc(r.sources.map(x=>x.citation).join('; '))} | ${esc(r.answer)} |`);
fs.writeFileSync('../docs/lms-0722-generated-benchmark.md',lines.join('\n')+'\n');console.log(JSON.stringify(report,null,2));
