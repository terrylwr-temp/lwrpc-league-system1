import { createRequire } from 'node:module';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '.next', 'ask-ui-check');
await mkdir(output, { recursive: true });
const modulePath = process.env.PLAYWRIGHT_MODULE_PATH || 'playwright';
const { chromium } = require(modulePath);
const { webpack } = require('next/dist/compiled/webpack/webpack');
const tsPath = require.resolve('typescript');
await writeFile(join(output, 'loader.cjs'), `const ts=require(${JSON.stringify(tsPath)});module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;};`);
const component = join(root, 'app/components/AskLwrAssistant.js');
const css = await readFile(join(root, 'app/components/AskLwrAssistant.module.css'), 'utf8');
await writeFile(join(output, 'styles.js'), 'export default '+JSON.stringify(Object.fromEntries(['overlay','panel','header','icon','close','scroll','composer'].map(k=>[k,k])))+';');
await writeFile(join(output, 'stubs.js'), `export const usePathname=()=>'/player-dashboard'; export const getRequestAuthorizationHeaders=async()=>({}); export const supabase={};export const getCurrentUserRole=async()=>({});export const GUIDE_DOCUMENT_TYPES=[];export const LEAGUE_DOCUMENT_TYPES=[];export const openGuideDocument=()=>{};export const leagueDocumentPath=()=>'';export const normalizeLeagueDocumentBucket=()=>'';`);
await writeFile(join(output, 'entry.js'), `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{AskLwrAssistantDrawer}from ${JSON.stringify(component)};function App(){const[open,setOpen]=useState(false);return <><header style={{transform:'translateZ(0)',position:'relative',zIndex:3}}><button id="open" onClick={()=>setOpen(true)}>Open assistant</button><AskLwrAssistantDrawer open={open} onClose={()=>setOpen(false)} role="player"/></header><main style={{position:'relative',zIndex:999,height:1800,background:'#f59e0b'}}>Underlying dashboard fixture</main></>};createRoot(document.getElementById('root')).render(<App/>);`);
await new Promise((res,rej)=>webpack({mode:'development',devtool:false,context:root,entry:join(output,'entry.js'),output:{path:output,filename:'bundle.js'},resolve:{modules:[join(root,'node_modules'),'node_modules'],alias:{'next/navigation':join(output,'stubs.js'),'../lib/auth':join(output,'stubs.js'),'../lib/dashboardGuides':join(output,'stubs.js'),'../lib/leagueDocuments':join(output,'stubs.js'),'./AskLwrAssistant.module.css':join(output,'styles.js')}},module:{rules:[{test:/\.js$/,type:'javascript/auto',exclude:/node_modules/,use:join(output,'loader.cjs')}]},plugins:[new webpack.DefinePlugin({'process.env.NODE_ENV':JSON.stringify('development')})]},(err,stats)=>err?rej(err):stats.hasErrors()?rej(Error(stats.toString({all:false,errors:true}))):res()));
const postcss=require('postcss');const tailwind=require('@tailwindcss/postcss');
const generated=await postcss([tailwind({base:root})]).process('@import "tailwindcss";', {from:join(root,'app/globals.css')});
const html=`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>${generated.css}\n${css}</style><div id="root"></div><script src="/bundle.js"></script>`;
const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'application/javascript':'text/html');res.end(req.url==='/bundle.js'?await readFile(join(output,'bundle.js')):html);});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
let browser;
try{
 browser=await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));const requests=[];
 await page.route('**/api/ask-lwr',async route=>{const body=route.request().postDataJSON();requests.push(body);const clarification=/color considerations\?$/.test(body.question);const insufficient=body.question==='Paddle';await route.fulfill({json:{success:true,result:{kind:clarification?'clarification':insufficient?'insufficient_evidence':'answer',answer:clarification?'What are you asking about—the ball, paddle, clothing, or something else?':insufficient?'Insufficient evidence fixture.':'Grounded answer fixture.\n'.repeat(14),conversationReceipt:clarification?'pending-color':insufficient?null:'normal-follow-up',feedbackReceipt:clarification||insufficient?null:'feedback-fixture',sources:clarification||insufficient?[]:[{officialDocumentUrl:'#official',documentTitle:'Official source fixture',citation:'Page 13'}]}}});});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#open').click();await page.locator('[role=dialog]').waitFor();
 async function geometry(width,height){await page.setViewportSize({width,height});await page.waitForTimeout(100);const metrics=await page.evaluate(()=>{const panel=document.querySelector('aside'),input=document.querySelector('textarea'),close=panel.querySelector('button'),overlay=document.querySelector('[role=dialog]'),header=panel.querySelector('header');const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};return{overlay:rect(overlay),panel:rect(panel),input:rect(input),close:rect(close),header:rect(header),font:getComputedStyle(header.querySelector('h2')).fontSize,scroll:getComputedStyle(document.querySelector('.scroll')).overflowY,inside:panel.contains(document.elementFromPoint(input.getBoundingClientRect().x+10,input.getBoundingClientRect().y+10)),portal:overlay.parentElement===document.body,inert:document.querySelector('#root').inert};});assert.equal(metrics.portal,true);assert.equal(metrics.inert,true);assert.equal(metrics.inside,true);assert.equal(metrics.scroll,'auto');assert.ok(metrics.close.right<=width);assert.ok(metrics.input.bottom<=height);if(width<640){assert.equal(metrics.panel.width,width);assert.equal(metrics.overlay.height,height);assert.equal(metrics.font,'14px');assert.ok(metrics.close.width>=44);}else{assert.equal(metrics.panel.width,640);assert.equal(metrics.font,'18px');}console.log(JSON.stringify({width,height,...metrics}));}
 const focusTargets=page.locator('aside').locator('a[href], button:not([disabled]), textarea:not([disabled])');await focusTargets.first().focus();await page.keyboard.press('Shift+Tab');assert.equal(await focusTargets.last().evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Tab');assert.equal(await focusTargets.first().evaluate(e=>e===document.activeElement),true);
 await geometry(390,844);await page.screenshot({path:join(output,'mobile-welcome.png')});await geometry(320,568);
 // Emulate keyboard visual viewport shrink without changing the layout viewport.
 await page.evaluate(()=>{Object.defineProperty(window,'visualViewport',{configurable:true,value:Object.assign(new EventTarget(),{height:330,offsetTop:0})});});
 await page.keyboard.press('Escape');await page.locator('#open').click();await page.locator('textarea').fill('Keyboard test');await page.waitForTimeout(100);
 assert.equal(await page.locator('[role=dialog]').evaluate(e=>Math.round(e.getBoundingClientRect().height)),330);
 assert.ok(await page.locator('textarea').evaluate(e=>e.getBoundingClientRect().bottom<=330));
 await page.screenshot({path:join(output,'mobile-keyboard-simulation.png')});
 await page.evaluate(()=>{window.visualViewport.height=568;window.visualViewport.dispatchEvent(new Event('resize'));});
 async function submit(q){await page.locator('textarea').fill(q);await page.getByRole('button',{name:'Ask',exact:true}).click();await page.getByRole('status').waitFor({state:'hidden'});}
 await submit('Are there any color considerations?');assert.equal(requests.at(-1).conversationReceipt,null);
 await submit('Paddle');assert.equal(requests.at(-1).conversationReceipt,'pending-color');assert.equal(await page.getByRole('button',{name:'👍 Helpful'}).count(),0);
 await page.keyboard.press('Escape');await page.locator('#open').click();await submit('what kind of ball are we using');assert.equal(requests.at(-1).conversationReceipt,null);
 await page.getByRole('button',{name:'👍 Helpful'}).waitFor();
 const order=await page.locator('article').first().evaluate(e=>{const answer=e.querySelector('h3 + p'),feedback=[...e.querySelectorAll('button')].find(x=>x.textContent.includes('Helpful')),source=e.querySelector('a');return Boolean(answer.compareDocumentPosition(feedback)&Node.DOCUMENT_POSITION_FOLLOWING)&&Boolean(feedback.compareDocumentPosition(source)&Node.DOCUMENT_POSITION_FOLLOWING);});assert.ok(order);
 await page.locator('.scroll').evaluate(e=>e.scrollTop=e.scrollHeight);assert.ok(await page.locator('.scroll').evaluate(e=>e.scrollTop>0));
 await page.keyboard.press('Escape');assert.equal(await page.locator('#root').evaluate(e=>e.inert),false);assert.equal(await page.locator('#open').evaluate(e=>e===document.activeElement),true);
 await page.evaluate(()=>sessionStorage.clear());await page.reload();await page.setViewportSize({width:1280,height:800});await page.locator('#open').click();await geometry(1280,800);await page.screenshot({path:join(output,'desktop-welcome.png')});
 await page.getByRole('button',{name:'Can I volley in the kitchen?',exact:true}).click();await page.getByRole('button',{name:'👍 Helpful'}).waitFor();assert.equal(requests.at(-1).question,'Can I volley in the kitchen?');
 await page.keyboard.press('Escape');assert.deepEqual(errors,[]);console.log('PASS: responsive geometry, portal isolation, keyboard viewport simulation, null receipt remount, source/feedback order, suggestions, close/focus restoration; no page errors.');
}finally{await browser?.close();await new Promise(res=>server.close(res));}
