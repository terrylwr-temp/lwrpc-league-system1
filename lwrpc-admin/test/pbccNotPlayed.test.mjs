import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {roundRobinStandings} from '../app/lib/roundRobinSchedule.js';
const admin=fs.readFileSync(new URL('../app/round-robin/[id]/admin/page.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../app/api/round-robin/action/route.js',import.meta.url),'utf8');
function functions(source,names,context={}) {
 const ast=ts.createSourceFile('test.jsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
 const found=new Map();
 function visit(node){if(ts.isFunctionDeclaration(node)&&names.includes(node.name?.text))found.set(node.name.text,node.getText(ast));ts.forEachChild(node,visit);}
 visit(ast);assert.equal(found.size,names.length);
 const js=ts.transpileModule(`${[...found.values()].join('\n')};({${names.join(',')}})`,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2022}}).outputText;
 return vm.runInNewContext(js,context);
}
const scoring={pointsToWin:21,winBy:1,scoreType:'standard'};
function apiHarness({exported=false,fail=false}={}) {
 const writes=[];let rebuilds=0;
 const context={DEFAULT_ROUND_ROBIN_SCORING:scoring,loadMatchForGroup:async(db,g,id)=>{assert.equal(g,'group');assert.equal(id,'game');return {session_id:'session'};},loadSessionForGroup:async()=>({settings:exported?{duprExportedAt:'2026-09-14'}:{scoring}}),rebuildResults:async()=>{rebuilds++;return [];}};
 const funcs=functions(api,['updateMatchScore','normalizeScore','validateRoundRobinMatchScore','normalizeRoundRobinScoring','roundRobinScoringLabel','sessionDuprExported','clampNumber','normalizeRoundRobinScoreType'],context);
 const db={from:table=>{assert.equal(table,'round_robin_matches');const chain={update:value=>{writes.push(value);return chain;},eq:()=>chain,select:()=>chain,single:async()=>({data:writes.at(-1),error:fail?new Error('write failed'):null})};return chain;}};
 return {writes,get rebuilds(){return rebuilds;},save:body=>funcs.updateMatchScore(db,{id:'group'},{matchId:'game',...body})};
}
test('not played stores null scores even when stale numeric inputs are sent',async()=>{
 const h=apiHarness();const r=await h.save({notPlayed:true,team1Score:21,team2Score:10});
 assert.equal(r.match.status,'not_played');assert.equal(r.match.team1_score,null);assert.equal(r.match.team2_score,null);assert.equal(h.rebuilds,1);
});
test('reopen retains blank scheduled state and ordinary scores still complete',async()=>{
 const h=apiHarness();await h.save({notPlayed:false,team1Score:'',team2Score:''});assert.equal(h.writes[0].status,'scheduled');
 await h.save({team1Score:21,team2Score:10});assert.equal(h.writes[1].status,'complete');
 await assert.rejects(h.save({team1Score:10,team2Score:10}),/tied/);
});
test('DUPR export lock denies not played and reopening before any writes',async()=>{
 for(const notPlayed of [true,false]){const h=apiHarness({exported:true});await assert.rejects(h.save({notPlayed}),/exported/);assert.equal(h.writes.length,0);}
});
test('failed result write does not rebuild results or return success',async()=>{
 const h=apiHarness({fail:true});await assert.rejects(h.save({notPlayed:true}),/write failed/);assert.equal(h.rebuilds,0);
});
test('round completion accepts not played but blocks unmarked blank games',async()=>{
 const skipped={id:'skip',round_number:1,status:'not_played',team1_score:null,team2_score:null};
 const state={matches:[skipped]};let calls=0;
 const ctx={state,pendingScores:{skip:{team1Score:'21',team2Score:'10'}},normalizeRoundRobinScoring:()=>scoring,validateRoundRobinMatchScore:()=>'',runAction:async()=>{calls++;return {success:true};},setPendingScores:()=>{}};
 const {saveCurrentRoundScores}=functions(admin,['saveCurrentRoundScores'],ctx);
 assert.equal((await saveCurrentRoundScores(null,{requireComplete:true})).success,true);assert.equal(calls,0);
 state.matches=[{...skipped,status:'scheduled'}];ctx.pendingScores={};
 assert.equal((await saveCurrentRoundScores(null,{requireComplete:true})).success,false);assert.equal(calls,0);
});
test('mark cancellation and failure preserve local input; success clears it',async()=>{
 for(const mode of ['cancel','fail','success']){
  const edits=[];let calls=0;
  const {setNotPlayed}=functions(admin,['setNotPlayed'],{savingResult:false,match:{id:'game'},appConfirm:async()=>mode!=='cancel',setSavingResult:()=>{},runAction:async()=>{calls++;return {success:mode!=='fail'};},setTeam1Score:v=>edits.push(v),setTeam2Score:v=>edits.push(v),onPendingScoreChange:()=>{},setEditingScore:()=>{}});
  await setNotPlayed(true);assert.equal(calls,mode==='cancel'?0:1);assert.equal(edits.length,mode==='success'?2:0);
 }
});
test('not played contributes no games, wins, losses or points',()=>{
 const players=[{id:'a',displayName:'A'},{id:'b',displayName:'B'}];
 const rows=roundRobinStandings([{status:'not_played',team1_players:[players[0]],team2_players:[players[1]],team1_score:null,team2_score:null}],players);
 for(const row of rows){assert.equal(row.games,0);assert.equal(row.wins,0);assert.equal(row.losses,0);assert.equal(row.pointsFor,0);assert.equal(row.pointsAgainst,0);assert.equal(row.byes,0);}
});
test('DUPR export omits not played games and retains scored games',()=>{
 const matches=[{id:'skip',status:'not_played',team1_score:null,team2_score:null},{id:'played',status:'complete',team1_score:21,team2_score:10}];
 const ctx={sessionMatchesForSession:()=>matches,duprScoreTypeForSession:()=> 'SIDEOUT',duprTeamPlayers:()=>[{},{}],csvDate:()=>'',duprPlayerName:()=>'',duprPlayerId:()=>''};
 const {duprRowsForSession}=functions(admin,['duprRowsForSession','matchHasSavedScore'],ctx);
 const rows=duprRowsForSession({},{id:'session'},'Event');assert.equal(rows.length,1);assert.equal(rows[0][12],21);assert.equal(rows[0][13],10);
});
test('court displays persisted not played with blank disabled inputs and reopening control',()=>{
 const context={React,useState:React.useState,useEffect:React.useEffect,useRef:React.useRef,DEFAULT_ROUND_ROBIN_SCORING:scoring,normalizeRoundRobinScoring:()=>scoring,matchElementId:id=>id,SlotSide:()=>null};
 const {ScoreCourt}=functions(admin,['ScoreCourt','matchHasSavedScore'],context);
 const markup=renderToStaticMarkup(React.createElement(ScoreCourt,{match:{id:'game',status:'not_played',team1_score:null,team2_score:null},swapSelection:[]}));
 assert.match(markup,/Not played — no score/);assert.match(markup,/Reopen for scoring/);
 assert.equal((markup.match(/<input[^>]*disabled=""/g)||[]).length,2);
 assert.equal((markup.match(/value=""/g)||[]).length,2);
 assert.doesNotMatch(markup,/Score Saved/);
});

