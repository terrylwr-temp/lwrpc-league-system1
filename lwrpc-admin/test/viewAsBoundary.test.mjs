import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {viewAsOrigins,rejectViewAsMutation,isolatedRequestAllowed,VIEW_AS_COOKIE} from '../app/lib/viewAsBoundary.js';
import {opaque,digest,sealAdminCredential,openAdminCredential} from '../app/lib/viewAsCrypto.js';
const env={NODE_ENV:'production',LMS_ORIGIN:'https://lms.example.invalid',VIEW_AS_ORIGIN:'https://view.example.invalid'};
const req=(path,headers={},method='POST')=>new Request(path,{method,headers});
test('0724 omit-context and legacy/event-code replay boundary; normal tab unchanged',()=>{
 for(const path of ['/api/tournaments/action','/api/round-robin/action','/api/master-reset','/api/pbcc/reminders','/api/admin/delete-member']){
  assert.equal(rejectViewAsMutation(req(env.VIEW_AS_ORIGIN+path),env).status,403);
  assert.equal(rejectViewAsMutation(req(env.LMS_ORIGIN+path,{origin:env.VIEW_AS_ORIGIN}),env).status,403);
  assert.equal(rejectViewAsMutation(req(env.LMS_ORIGIN+path,{'x-view-as-context':opaque()}),env).status,403);
  assert.equal(rejectViewAsMutation(req(env.LMS_ORIGIN+path,{cookie:VIEW_AS_COOKIE+'='+opaque()}),env).status,403);
  assert.equal(rejectViewAsMutation(req(env.LMS_ORIGIN+path,{origin:env.LMS_ORIGIN,authorization:'Bearer normal-synthetic-token'}),env),null);
 }
});
test('0724 strict origins and server credential confidentiality',()=>{
 const origins=viewAsOrigins(env);assert.equal(isolatedRequestAllowed(req(env.VIEW_AS_ORIGIN+'/api/view-as/read',{origin:env.VIEW_AS_ORIGIN}),origins),true);
 for(const headers of [{},{origin:env.LMS_ORIGIN},{origin:env.VIEW_AS_ORIGIN,authorization:'Bearer admin'},{origin:env.VIEW_AS_ORIGIN,'sec-fetch-site':'cross-site'}])assert.equal(isolatedRequestAllowed(req(env.VIEW_AS_ORIGIN+'/api/view-as/read',headers),origins),false);
 assert.throws(()=>viewAsOrigins({...env,VIEW_AS_ORIGIN:env.LMS_ORIGIN}));assert.throws(()=>viewAsOrigins({...env,VIEW_AS_ORIGIN:'http://view.example.invalid'}));
 process.env.VIEW_AS_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');const value=sealAdminCredential('synthetic-private-token','context-a');assert.ok(!value.includes('synthetic-private'));assert.equal(openAdminCredential(value,'context-a'),'synthetic-private-token');assert.throws(()=>openAdminCredential(value,'context-b'));assert.match(digest(opaque()),/^[a-f0-9]{64}$/);
});
async function routes(dir){let files=[];for(const ent of await readdir(dir,{withFileTypes:true})){const p=new URL(ent.name+(ent.isDirectory()?'/':''),dir);if(ent.isDirectory())files.push(...await routes(p));else if(ent.name==='route.js')files.push(p);}return files;}
test('0724 complete legacy handler guard registry and isolated renderer dependency boundary',async()=>{
 for(const file of await routes(new URL('../app/api/',import.meta.url))){if(file.pathname.includes('/view-as/'))continue;const text=await readFile(file,'utf8');assert.match(text,/rejectViewAsMutation\((req|request)\)/,file.pathname);}
 const page=await readFile(new URL('../app/view-as/page.js',import.meta.url),'utf8');for(const forbidden of ['lib/auth','createClient','getSession','getUser','NEXT_PUBLIC_SUPABASE','feedbackReceipt','localStorage'])assert.ok(!page.includes(forbidden),forbidden);
 const proxy=await readFile(new URL('../proxy.js',import.meta.url),'utf8');for(const protection of ["connect-src 'self'","frame-ancestors 'none'",'no-referrer','private, no-store','x-view-as-nonce'])assert.ok(proxy.includes(protection));
 const read=await readFile(new URL('../app/api/view-as/read/route.js',import.meta.url),'utf8');assert.ok(!read.includes('observeQualityRequest'));assert.match(read,/delete result.feedbackReceipt/);assert.match(read,/persist:async\(\)=>\{\}/);
});
import {NextRequest} from 'next/server.js';
import {proxy} from '../proxy.js';
test('0724 normalized Next URL uses Host boundary but keeps rewrite internal',()=>{
 const old={LMS_ORIGIN:process.env.LMS_ORIGIN,VIEW_AS_ORIGIN:process.env.VIEW_AS_ORIGIN};Object.assign(process.env,env);
 try{const request=new NextRequest('https://lms.example.invalid/members',{headers:{host:'view.example.invalid'}});const res=proxy(request);assert.equal(res.headers.get('x-middleware-rewrite'),'https://lms.example.invalid/view-as');assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);
 const mutation=proxy(new NextRequest('https://lms.example.invalid/api/tournaments/action',{method:'POST',headers:{host:'view.example.invalid'}}));assert.equal(mutation.status,403);
 }finally{for(const [k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
import {createOfficialDocumentViewerToken,readOfficialDocumentViewerToken} from '../app/lib/aiOfficialDocumentViewer.js';
import {sealLive,openLive} from '../app/lib/liveLmsReceipts.js';
test('0724 ordinary and Live citation/conversation receipts cannot cross contexts or ordinary actor session',()=>{
 process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-receipt-key';
 const a='10000000-0000-4000-8000-000000000700',b='10000000-0000-4000-8000-000000000701';
 const token=createOfficialDocumentViewerToken({documentId:a,documentVersionId:a,chunkId:a},a);assert.equal(readOfficialDocumentViewerToken(token,a).sub,a);assert.throws(()=>readOfficialDocumentViewerToken(token,b));
 const principal={user:{id:'synthetic-actor'},receiptBinding:'view_as:'+a+':synthetic-session'};const receipt=sealLive('context',principal,{intent:'SELF_RATING'});assert.equal(openLive(receipt,'context',principal).intent,'SELF_RATING');assert.throws(()=>openLive(receipt,'context',{...principal,receiptBinding:'synthetic-session'}));assert.throws(()=>openLive(receipt,'context',{...principal,receiptBinding:'view_as:'+b+':synthetic-session'}));
});

test('0724 Member Detail is the only entry; isolated target cannot nest',async()=>{
 async function scan(dir){let found=[];for(const e of await readdir(dir,{withFileTypes:true})){const u=new URL(e.name+(e.isDirectory()?'/':''),dir);if(e.isDirectory())found.push(...await scan(u));else if(/\.[jt]sx?$/.test(e.name)&&(await readFile(u,'utf8')).includes('<ViewAsStartButton'))found.push(u.pathname);}return found;}
 assert.deepEqual((await scan(new URL('../app/',import.meta.url))).map(p=>p.slice(p.indexOf('/app/'))),['/app/members/[id]/page.js']);
 const button=await readFile(new URL('../app/components/ViewAsStartButton.js',import.meta.url),'utf8');assert.ok(button.indexOf('/api/view-as/start?target=')<button.indexOf('await appConfirm'));assert.match(button,/target\.name/);
});
