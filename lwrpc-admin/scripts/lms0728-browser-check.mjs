// Synthetic loopback UI acceptance; no production access or model traffic.
import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/t_ade/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
const results=[],errors=[];
try{
 const context=await browser.newContext();await context.route('**/*',route=>{const u=new URL(route.request().url());if(['localhost','127.0.0.1'].includes(u.hostname)||u.protocol==='data:')return route.continue();return route.abort();});
 await context.addInitScript(()=>{window.addEventListener('message',e=>console.log('fixture-message',e.origin,e.data?.type));});
 context.on('page',p=>{p.on('console',m=>console.log('browser-console',p.url(),m.type(),m.text()));p.on('requestfailed',r=>console.log('request-failed',r.url(),r.failure()?.errorText));});
 const normal=await context.newPage();normal.on('pageerror',e=>errors.push(e.message));
 await normal.goto('http://localhost:3086/view-as-test?target=1');await normal.getByRole('button',{name:'View As User',exact:true}).waitFor();
 await normal.goto('http://localhost:3086/members/10000000-0000-4000-8000-000000000001');
 await normal.getByRole('button',{name:'View As User',exact:true}).waitFor({timeout:60000});
 for(const width of [1280,390,320]){await normal.setViewportSize({width,height:900});await normal.screenshot({path:`../docs/lms-0728-member-${width}.png`,fullPage:true});assert.ok(await normal.getByRole('button',{name:'View As User',exact:true}).isVisible());}
 await normal.getByRole('button',{name:'View As User',exact:true}).click();
 const dialog=normal.getByRole('dialog');await dialog.waitFor();assert.match(await dialog.innerText(),/Synthetic Person1|Synthetic.*Person1/);assert.match(await dialog.innerText(),/read.only/i);
 await normal.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});const focusReturned=await normal.getByRole('button',{name:'View As User',exact:true}).evaluate(e=>document.activeElement===e);
 await normal.getByRole('button',{name:'View As User',exact:true}).click();
 const popupPromise=normal.waitForEvent('popup');await normal.getByRole('dialog').getByRole('button',{name:'View As User',exact:true}).click();const view=await popupPromise;
 view.on('pageerror',e=>errors.push(e.message));await view.waitForTimeout(8000);console.log('popup-state',await view.locator('body').innerText());console.log('normal-state',await normal.locator('body').innerText());await view.waitForURL('**/player-dashboard',{timeout:90000});
 const banner=view.getByRole('complementary',{name:'View As User status'});await banner.waitFor();await view.getByText('Validating read-only access…').waitFor({state:'hidden',timeout:60000});
 assert.match(await banner.innerText(),/Player/);assert.match(await banner.innerText(),/READ-ONLY/);assert.match(await view.locator('body').innerText(),/Person1/);
 for(const width of [1280,390,320]){await view.setViewportSize({width,height:900});await view.screenshot({path:`../docs/lms-0728-player-${width}.png`,fullPage:true});assert.ok(await view.getByRole('button',{name:'Exit View As User',exact:true}).isVisible());}
 const mutation=await view.evaluate(async()=>{const r=await fetch('/api/view-as-test',{method:'POST'});return r.status;});assert.equal(mutation,403);
 assert.match(normal.url(),/^http:\/\/localhost:3086\/members\//);
 await view.getByRole('button',{name:'Exit View As User',exact:true}).click();await view.waitForURL('http://localhost:3086/members/**',{timeout:60000});
 results.push({implicitPlayer:true,memberDetailButton:true,confirmation:true,escapeCloses:true,escapeFocusReturn:focusReturned,sharedPlayerDashboard:true,bannerPlayer:true,readOnlyMutationDenied:true,exit:true,originalTabUnchanged:true,widths:[1280,390,320]});
 // Actual no-role normal navigation remains a Player flow; explicit Captain is separate.
 for(const [member,path,role]of [[1,'/player-dashboard','implicit Player'],[2,'/captain-dashboard','Captain']]){
  await normal.goto(`http://localhost:3086/view-as-test?member=${member}&target=1`);await normal.getByRole('heading',{name:'Synthetic normal fixture'}).waitFor();await normal.waitForTimeout(500);
  await normal.goto('http://localhost:3086'+path);await normal.getByText('Synthetic Team',{exact:true}).first().waitFor({timeout:60000});assert.ok(!normal.url().includes('/login'));assert.equal(await normal.getByRole('complementary',{name:'View As User status'}).count(),0);results.push({normal:role,path,passed:true});
 }
 await writeFile('../docs/lms-0728-browser-results.json',JSON.stringify({results,errors,modelCalls:0,productionAccess:false},null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}
