import test from 'node:test';import assert from 'node:assert/strict';
process.env.LWR_AI_ENABLED='true';
const {fixture,replay,queryRows}=await import('../scripts/lms0722-replay-fixture.mjs');
const {officialQuestionConcept}=await import('../app/lib/aiQuestionConcepts.js');
const {selectAnswerEvidence,generateOfficialAnswer,CONFLICT_ANSWER}=await import('../app/lib/aiAnswerGeneration.js');
const {resolveConversationTurn}=await import('../app/lib/aiConversation.js');
const {isUnsupportedOperationalQuestion}=await import('../app/lib/askLwrPlayerAnswer.js');
const {retrieveDocumentNavigation}=await import('../app/lib/aiDocumentNavigation.js');
const {conflictingSelectedTargets}=await import('../app/lib/aiPassageContinuations.js');
for(const c of fixture.cases.filter(c=>c.searches?.length))test('0722 production-format original/vector-reuse replay: '+c.question,async()=>{
 const a=await replay(c);assert.ok(a.calls<=2 || /ball|Pickleball/.test(c.question));assert.ok(a.selected.length<=4);assert.equal(a.r.request.question,c.question);assert.ok(a.r.candidates.length<=32);assert.equal(a.r.evidence.threshold,.35);
 if(/men and 2 women|LWRCC/.test(c.question)){assert.equal(a.clarification?.clarification.category,'roster_league');return;}
 if(c.question==='clothing'||c.question.includes('blouse')){assert.equal(a.selected.length,0);return;}
 assert.ok(a.selected.length,'applicable production evidence');
 if(/how many players/i.test(c.question)){const n=/Saturday/i.test(c.question)?12:/Weekday/i.test(c.question)&&!/9\.1/.test(c.question)?6:4;assert.match(a.selected.map(x=>x.content).join(' '),new RegExp(n+' players','i'));}
 if(/rally scoring rules/.test(c.question)){assert.ok(a.selected.every(x=>x.passageScopes.every(s=>!s.league)));assert.ok(a.selected.length<=4);assert.ok(a.selected.filter(x=>/would win the$/.test(x.content)).every(x=>a.selected.some(y=>y.continuationOf===x.chunkId)));assert.match(a.selected.at(-1).content,/always be scored while serving/);}
 if(/website/.test(c.question))assert.ok(a.selected.every(x=>/Club main website:/.test(x.content)));
});
for(const q of ["We are currently trying to order a blouse for our team. Are there any color restrictions?","Are there color restrictions for our team shirts?","Can our team wear any color jersey?","We're ordering blouses for the team. Are there color restrictions?"])test('0722 apparel object is explicit: '+q,()=>{assert.equal(officialQuestionConcept(q)?.kind,'apparel');assert.equal(resolveConversationTurn({question:q,userId:'test'}).kind,'resolved');assert.equal(isUnsupportedOperationalQuestion(q),false);});
for(const q of ['What color can our team wear?','Are there color restrictions?'])test('0722 unbound color clarifies: '+q,()=>assert.equal(resolveConversationTurn({question:q,userId:'test'}).kind,'clarification'));
for(const q of ['What email address is my account under?','What is my DUPR?','What team am I on?','Did I enter my match scores?'])test('0722 protected intent: '+q,()=>assert.equal(isUnsupportedOperationalQuestion(q),true));
for(const q of ['How do I reset my password?','Where do I enter match scores?','How do I update my roster?'])test('0722 documented procedure remains public: '+q,()=>assert.equal(isUnsupportedOperationalQuestion(q),false));
test('0722 generic equal-authority target conflict is order-independent and skips generation',async()=>{
 const make=(id,n)=>({chunkId:id,documentId:id,documentVersionId:id,documentTitle:'Isolated Rules',documentType:'league_rules',documentAuthorityRank:1,combinedScore:.7,pageNumber:1,ruleNumber:'8.2',content:`8.2. Saturday Picklebreaker shall consist of one game to ${n} points, win by two, using Rally Scoring.`,structuralContext:[]});
 for(const items of [[make('a',17),make('b',19)],[make('b',19),make('a',17)]]){
 const r={request:{question:'What is the Saturday Picklebreaker format?'},suppliedEvidence:items,evidence:{sufficient:true,threshold:.35}};
 assert.equal(conflictingSelectedTargets(selectAnswerEvidence(r)),true);
 const answer=await generateOfficialAnswer({retrieval:r,supabase:null,resolveSources:async(_,e)=>e.map(c=>({...c,citation:c.documentTitle,officialDocumentUrl:'https://example.test/fixture.pdf'})),fetchImpl:async()=>{throw new Error('must not call model');}});
 assert.equal(answer.answer,CONFLICT_ANSWER);assert.equal(answer.modelCallSkipped,true);assert.equal(answer.sources.length,2);
 }
});
test('0722 document navigation uses active catalog/anchor without scores, embeddings or model',async()=>{
 const doc={id:'doc',title:'Official League Rules',document_type:'league_rules',authority_rank:1,active_version_id:'version',status:'active','active_version.processing_status':'ready'};
 const anchor={id:'chunk',document_version_id:'version',chunk_ordinal:1,is_searchable:true,page_number:9,content:'6.2. Saturday League',rule_number:'6.2'};
 const db={from:table=>{const q=queryRows(table==='ai_documents'?[doc]:[anchor]);q.ilike=()=>q;return q;}};
 const r=await retrieveDocumentNavigation(db,{question:'Where are the Saturday rules?'});assert.equal(r.documentNavigation.status,'found');assert.equal(r.metrics.embeddingMs,0);assert.equal(r.suppliedEvidence[0].documentVersionId,'version');assert.equal(r.suppliedEvidence[0].combinedScore,undefined);
 const answer=await generateOfficialAnswer({retrieval:r,supabase:null,resolveSources:async(_,e)=>e.map(c=>({...c,citation:c.documentTitle,officialDocumentUrl:'https://example.test/fixture.pdf'})),fetchImpl:async()=>{throw new Error('no model');}});assert.equal(answer.modelCallSkipped,true);assert.equal(answer.evidenceSufficient,true);
 assert.equal(officialQuestionConcept('What are the Saturday roster rules?'),null);
});


// Applicability-only controls pool current stored passages, not live RPC recall.
const {readFile}=await import('node:fs/promises');
const stored=JSON.parse(await readFile(new URL('../../docs/lms-0722-current-rules-fixture.json',import.meta.url),'utf8'));
const productionCandidates=stored.map(c=>({chunkId:c.id,documentVersionId:c.document_version_id,documentTitle:'LWR Pickleball Club DUPR League Rules',documentType:'league_rules',documentAuthorityRank:1,combinedScore:.7,ruleNumber:c.rule_number,heading:c.heading,content:c.content,structuralContext:stored.map(r=>({ruleNumber:r.rule_number,content:r.content}))}));
const selectCurrent=q=>selectAnswerEvidence({request:{question:q},candidates:productionCandidates,authorityReviewCandidates:productionCandidates,evidence:{sufficient:true,threshold:.35}});
for(const league of ['Saturday','Weekday','PrimeTime'])test('0722 scoped rally evidence cannot leak another league: '+league,()=>{
 const selected=selectCurrent(`What are the ${league} rally scoring rules?`);assert.ok(selected.length);
 assert.ok(selected.every(c=>c.passageScopes.every(s=>!s.league||s.league===league.toLowerCase())));
});
for(const [q,league,division] of [
 ['How many players do I need for the PrimeTime League?','primetime',null],
 ['How many players play in a Weekday 9.1 match?','weekday','9.1'],
 ['How many players do I need for Saturday?','saturday',null],
 ['How is Weekday 9.1 different?','weekday','9.1'],
 ['Is Weekday 9.1 a flex league?','weekday','9.1'],
 ['When does Weekday 9.1 normally play?','weekday','9.1'],
 ['Can Weekday 9.1 captains change the match time?','weekday','9.1'],
 ['What is the Saturday 9.1 format?','saturday',null],
 ['What is the Weekday format?','weekday',null],
])test('0722 current-rule scope and division applicability: '+q,()=>{
 const selected=selectCurrent(q);assert.ok(selected.length);assert.ok(selected.every(c=>c.passageScopes.every(s=>s.league===league&&s.division===division)));
});
test('0722 overall roster question cannot use fielded-player rule',()=>{
 assert.equal(selectCurrent('How many players can I have on my PrimeTime roster?').length,0,'fielded count is not a maximum roster size');
});
for(const [q,document] of [['Show me the Captains Guide','captain'],['Where are the Important Dates?','dates'],['Where is the Players Guide?','player'],['Where is the USAP rulebook?','usap']])test('0722 document identity: '+q,()=>assert.equal(officialQuestionConcept(q).document,document));
test('0722 account identity embedded in how-to remains protected',()=>assert.equal(isUnsupportedOperationalQuestion('How can I find out what email my account is under?'),true));

const required=JSON.parse(await readFile(new URL('../../docs/lms-0722-required-league-controls.json',import.meta.url),'utf8'));
for(const question of required)test('0722 MUST PASS named-league evidence and absence of foreign scope: '+question,async()=>{
 const c=fixture.cases.find(c=>c.question===question);assert.ok(c,'actual current RPC trace required');
 const {r,selected}=await replay(c);const league=officialQuestionConcept(question).leagues[0];
 assert.ok(selected.length);assert.ok(r.authorityReviewCandidates.length<=12);
 for(const source of selected){assert.ok(source.passageScopes.every(s=>s.league===league&&!s.ambiguousLeague));assert.ok(!/Saturday League PrimeTime League/.test(source.heading));assert.ok(!source.content.includes('Players/Team 6 4 12'));}
 const text=selected.map(x=>x.content).join(' ');
 if(/primetime/i.test(question)){assert.doesNotMatch(text,/6 men|6 women|12 players|25 win|25 points|mixed round|mixed teams|games to 15 using Rally/i);if(/format|kind of games/.test(question))assert.match(text,/2 out of 3 to 11/);}
 if(/saturday/i.test(question)){assert.doesNotMatch(text,/65\+|65 or older|2 out of 3 to 11|4 players \/ 2 lines/i);if(/format|kind of games/.test(question))assert.match(text,/Mixed Round/);}
 if(/Picklebreaker/.test(question))assert.match(text,league==='saturday'?/game to 25/:/Picklebreaker to 15|game to 15/);
});

test('0722 adjoining numbered league passages override an ambiguous containing heading',()=>{
 const c={documentType:'league_rules',documentTitle:'Isolated Rules',heading:'Saturday League PrimeTime League',ruleNumber:'6.2',combinedScore:.8,documentAuthorityRank:1,content:'6.2. Saturday League\n6.2.2. Roster & Courts: 12 players require 4 courts.\n6.3. PrimeTime League\n6.3.2. Roster & Courts: 4 players require 2 courts.'};
 for(const [league,number,foreign] of [['Saturday','6.2.2','6.3.2'],['PrimeTime','6.3.2','6.2.2']]){
  const selected=selectAnswerEvidence({request:{question:`How many players do I need for ${league}?`},suppliedEvidence:[c],evidence:{sufficient:true,threshold:.35}});
  assert.equal(selected.length,1);assert.ok(selected[0].content.startsWith(number));assert.ok(!selected[0].content.includes(foreign));assert.equal(selected[0].passageScopes[0].league,league.toLowerCase());
 }
});
