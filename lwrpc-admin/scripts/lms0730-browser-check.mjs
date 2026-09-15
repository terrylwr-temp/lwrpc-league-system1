import {createRequire} from 'node:module';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);const {chromium}=require('C:/Users/t_ade/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});const results=[],errors=[];
const id=n=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0');
try{
 for(const [n,role,path]of [[2,'captain','captain-dashboard'],[1,'player','player-dashboard'],[5,'club_pro','captain-dashboard']]){
  const context=await browser.newContext({viewport:{width:390,height:900}});context.setDefaultTimeout(30000);
  await context.route('**/*',r=>{const u=new URL(r.request().url());return ['localhost','127.0.0.1'].includes(u.hostname)||u.protocol==='data:'?r.continue():r.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  async function login(member,target=n){await page.goto(`http://localhost:3092/view-as-test?member=${member}&target=${target}`);await page.getByRole('heading',{name:'Synthetic normal fixture'}).waitFor();await page.waitForTimeout(700);}
  async function schedule(p){await p.getByRole('button',{name:/Division Schedules|Team Schedule|Schedule/i}).filter({visible:true}).first().click();await p.getByRole('heading',{name:'Division Team Schedules',exact:true}).waitFor();await p.getByLabel('Choose team schedule').selectOption(id(31));await p.getByText(/Captains: Synthetic Very Long Captain Display Name Person9/).waitFor();return p.getByText(/^Captains:/).last().innerText();}
  await login(n);await page.goto('http://localhost:3092/'+path);await page.waitForTimeout(1200);
  console.log(role,await page.getByRole('button').allTextContents());
  const normal=await schedule(page);assert.match(normal,/synthetic6@example.invalid/);
  const modal=p=>p.getByRole('heading',{name:'Division Team Schedules',exact:true}).locator('xpath=../../..');
  const normalFields=(await modal(page).innerText()).replace(normal,'CAPTAIN_NAMES');
  const normalTeamIds=await page.getByLabel('Choose team schedule').locator('option').evaluateAll(es=>es.map(e=>e.value));
  await login(8);await page.goto('http://localhost:3092/members/'+id(n));await page.waitForTimeout(1200);const popup=page.waitForEvent('popup',{timeout:60000});await page.getByRole('button',{name:'View As User',exact:true}).click();await page.waitForTimeout(300);console.log('confirmation',await page.getByRole('dialog').count());if(await page.getByRole('dialog').isVisible())await page.getByRole('dialog').getByRole('button',{name:'View As User',exact:true}).click();const view=await popup;
  await view.waitForURL('**/'+path,{timeout:90000});await view.getByText('Validating read-only access…').waitFor({state:'hidden',timeout:60000});
  const names=await schedule(view);assert.equal(names,normal.replace('synthetic6@example.invalid, ',''));assert.ok(!names.includes('@'));
  assert.equal((await modal(view).innerText()).replace(names,'CAPTAIN_NAMES'),normalFields);
  assert.deepEqual(await view.getByLabel('Choose team schedule').locator('option').evaluateAll(es=>es.map(e=>e.value)),normalTeamIds);
  await view.getByLabel('Choose team schedule').focus();assert.equal(await view.getByLabel('Choose team schedule').evaluate(e=>e===document.activeElement),true);
  for(const width of [1280,390,320]){await view.setViewportSize({width,height:900});await view.screenshot({path:`../docs/lms-0730-${role}-${width}.png`,fullPage:false});assert.ok(await view.getByText(/^Captains:/).last().isVisible());}
  await view.keyboard.press('Escape');await view.reload();await view.getByText('Validating read-only access…').waitFor({state:'hidden'});await view.setViewportSize({width:390,height:900});assert.equal(await schedule(view),names);
  await view.goto('http://127.0.0.1:3092/'+path);await view.getByText('Validating read-only access…').waitFor({state:'hidden'});assert.equal(await schedule(view),names);
  await view.getByRole('button',{name:'Close',exact:true}).click();await view.getByRole('heading',{name:'Division Team Schedules',exact:true}).waitFor({state:'hidden'});
  await view.getByRole('button',{name:'Exit View As User',exact:true}).click();await view.waitForURL('http://localhost:3092/members/**');
  results.push({role,normal,names,scheduleFieldsEqual:true,teamIdsEqual:true,keyboardFocus:true,refresh:true,directRoute:true,closeControl:true,widths:[1280,390,320],exit:true});await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await fs.writeFile('../docs/lms-0730-browser-results.json',JSON.stringify({results,errors,modelCalls:0},null,2));await browser.close();}
