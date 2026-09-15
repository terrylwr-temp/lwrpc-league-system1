import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {proxy} from '../proxy.js';
import {rejectViewAsMutation} from '../app/lib/viewAsBoundary.js';
const normal='https://normal.example.invalid';
const isolated='https://view.example.invalid';
const pages=['/login','/','/player-dashboard','/captain-dashboard','/teams','/teams/synthetic-team','/members','/members/synthetic-member','/ratings','/standings','/scheduling','/matches','/matches/synthetic-match','/score-entry/synthetic-match','/locations','/seasons','/divisions','/ask-lwr'];
const apis=['/api/system-settings','/api/ask-lwr','/api/match-setup','/api/admin/delete-member','/api/tournaments/action','/api/round-robin/action'];
function environment(changes,fn){const old=new Map(Object.keys(changes).map(k=>[k,process.env[k]]));try{for(const [k,v]of Object.entries(changes)){if(v===undefined)delete process.env[k];else process.env[k]=v;}return fn();}finally{for(const [k,v]of old){if(v===undefined)delete process.env[k];else process.env[k]=v;}}}

test('0726 normal routing is independent of View-As context service, hostname availability and maintenance',()=>{
 const originalFetch=globalThis.fetch;let attemptedCalls=0;
 globalThis.fetch=()=>{attemptedCalls++;throw new Error('Synthetic View-As infrastructure outage');};
 try{for(const enabled of [false,true])environment({LMS_ORIGIN:normal,VIEW_AS_ORIGIN:enabled?isolated:undefined,VIEW_AS_ENCRYPTION_KEY:undefined,CRON_SECRET:undefined},()=>{
  for(const pathname of pages){const res=proxy(new NextRequest(normal+pathname,{headers:{host:new URL(normal).host}}));assert.equal(res.headers.get('x-middleware-next'),'1',pathname);assert.equal(res.headers.get('x-middleware-rewrite'),null,pathname);assert.equal(res.headers.get('content-security-policy'),null,pathname);}
  for(const pathname of apis){const req=new NextRequest(normal+pathname,{method:'POST',headers:{host:new URL(normal).host,origin:normal,authorization:'Bearer synthetic-normal-token'}});assert.equal(rejectViewAsMutation(req),null,pathname);assert.equal(proxy(req).headers.get('x-middleware-next'),'1',pathname);}
 });assert.equal(attemptedCalls,0);}finally{globalThis.fetch=originalFetch;}
});

test('0726 unavailable context never converts isolated requests into normal mutation authority',()=>environment({LMS_ORIGIN:normal,VIEW_AS_ORIGIN:isolated},()=>{
 for(const pathname of apis)for(const extra of [{},{'x-view-as-context':'expired-synthetic-context'},{authorization:'Bearer synthetic-normal-token'}]){
  const res=proxy(new NextRequest(normal+pathname,{method:'POST',headers:{host:new URL(isolated).host,origin:isolated,...extra}}));assert.equal(res.status,403,pathname);
 }
 for(const pathname of apis){const replay=proxy(new NextRequest(normal+pathname,{method:'POST',headers:{host:new URL(normal).host,origin:normal,'x-view-as-context':'expired-synthetic-context'}}));assert.equal(replay.status,403,pathname);}
}));
