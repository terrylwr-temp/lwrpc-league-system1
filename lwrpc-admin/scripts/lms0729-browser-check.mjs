// Synthetic loopback UI acceptance; no production access or model traffic.
import {createRequire} from 'node:module';
import {writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/t_ade/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const results=[],errors=[];
try{
 const context=await browser.newContext();context.setDefaultTimeout(20000);context.setDefaultNavigationTimeout(60000);await context.route('**/*',route=>{const u=new URL(route.request().url());if(['localhost','127.0.0.1'].includes(u.hostname)||u.protocol==='data:')return route.continue();return route.abort();});
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 const normal=await context.newPage();
 const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const login=async n=>{await normal.goto(`http://localhost:3086/view-as-test?member=${n}&target=1`);await normal.getByRole('heading',{name:'Synthetic normal fixture'}).waitFor();await normal.getByRole('button',{name:'Ordinary local action'}).click();await normal.getByText('Local actions: 1').waitFor();await normal.waitForTimeout(500);};
 const inspect=async path=>{try{await normal.goto('http://localhost:3086'+path);}catch(e){if(!e.message.includes('ERR_ABORTED'))throw e;await normal.waitForTimeout(1500);await normal.goto('http://localhost:3086'+path);}await normal.locator('main').first().waitFor({timeout:60000});await normal.waitForTimeout(700);assert.ok(!normal.url().includes('/login'));assert.equal(await normal.locator('[data-nextjs-dialog]').count(),0);assert.ok((await normal.locator('body').innerText()).length>80);};
 async function ask(page,question,pattern){
  if(!await page.getByLabel('Ask a question',{exact:true}).isVisible())await page.getByRole('button',{name:'Ask LWR Pickleball Club AI',exact:true}).filter({visible:true}).first().click();
  await page.getByLabel('Ask a question',{exact:true}).fill(question);await page.getByRole('button',{name:'Ask',exact:true}).click();
  await page.getByText(pattern).last().waitFor({timeout:60000});await page.getByText('LIVE LMS DATA',{exact:true}).last().waitFor();
 }
 if(!process.argv.includes('--view-only')){
 for(const [member,role,dashboard]of [[8,'Commissioner','/'],[2,'Captain','/captain-dashboard'],[1,'implicit Player','/player-dashboard']]){
  await login(member);for(const path of [dashboard,'/teams/'+id(30),'/standings','/matches']){await inspect(path);results.push({normal:role,path,pass:true});}
 }
 await inspect('/player-dashboard');
 await ask(normal,'What is our teams record?',/3\u20132\u20131/);
 for(const width of [1280,390,320]){await normal.setViewportSize({width,height:900});await normal.screenshot({path:`../docs/lms-0729-normal-record-${width}.png`,fullPage:true});assert.ok(await normal.getByLabel('Ask a question',{exact:true}).isVisible());}
 await ask(normal,'What place are we in?',/ranking explanations aren't available/);
 results.push({normalImplicitLiveRecord:true,rankDeferred:true,widths:[1280,390,320]});
 }else{results.push(...JSON.parse(await readFile('../docs/lms-0729-browser-results.json','utf8')).results);}
 console.log('start view flow');await login(8);console.log('signed in fixture');await normal.setViewportSize({width:1280,height:900});await inspect('/members/'+id(1));
 await normal.getByRole('button',{name:'View As User',exact:true}).click();const dialog=normal.getByRole('dialog');await dialog.waitFor();await normal.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 const focusReturn=await normal.getByRole('button',{name:'View As User',exact:true}).evaluate(e=>document.activeElement===e);
 const baseline=JSON.parse(await readFile('../docs/lms-0728-browser-results.json','utf8')).results[0].escapeFocusReturn;assert.equal(focusReturn,baseline);results.push({confirmationEscapeCloses:true,focusReturn,baselineFocusReturn:baseline,existingLimitationUnchanged:true});
 await normal.getByRole('button',{name:'View As User',exact:true}).click();const promise=normal.waitForEvent('popup');await normal.getByRole('dialog').getByRole('button',{name:'View As User',exact:true}).click();const view=await promise;console.log('popup opened',view.url());
 view.on('console',m=>console.log('view console',m.text()));normal.on('console',m=>console.log('normal console',m.text()));
 await view.waitForURL('**/player-dashboard',{timeout:90000});await view.getByRole('complementary',{name:'View As User status'}).waitFor();await view.getByText('Validating read-only access\u2026').waitFor({state:'hidden',timeout:60000});
 await ask(view,'What is our teams record?',/3\u20132\u20131/);assert.equal(await view.getByRole('button',{name:/helpful/i}).count(),0);
 for(const width of [1280,390,320]){await view.setViewportSize({width,height:900});await view.screenshot({path:`../docs/lms-0729-view-record-${width}.png`,fullPage:true});}
 const mutation=await view.evaluate(async()=>{const r=await fetch('/api/view-as-test',{method:'POST'});return r.status;});assert.equal(mutation,403);
 await view.keyboard.press('Escape');await view.getByRole('button',{name:'Exit View As User',exact:true}).click();await view.waitForURL('http://localhost:3086/members/**',{timeout:60000});
 results.push({viewAsEffectiveRecord:true,feedbackDisabled:true,readOnly:true,exit:true,originalTabUnchanged:normal.url().includes('/members/'),widths:[1280,390,320]});
 assert.deepEqual(errors,[]);
}finally{await writeFile('../docs/lms-0729-browser-results.json',JSON.stringify({results,errors,modelCalls:0,productionAccess:false},null,2));await browser.close();}
