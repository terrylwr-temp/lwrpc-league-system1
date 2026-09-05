// Local-only synthetic UI verification. No production requests or database writes.
// Set LMS_PLAYWRIGHT_PATH to an existing Playwright index.mjs when not installed locally.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.LMS_PLAYWRIGHT_PATH?pathToFileURL(process.env.LMS_PLAYWRIGHT_PATH).href:'playwright');
const base=process.env.LMS_REVIEW_TEST_URL||'http://127.0.0.1:3018';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local test server only');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const group='11111111-1111-4111-8111-111111111111',aid='22222222-2222-4222-8222-222222222222';
const stamp='2026-09-05T12:00:00Z';let state='new',revision=1,category='unclassified',answerRequests=0;
const events=[],errors=[],operations=new Set();
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.addInitScript(()=>{
  const user={id:'33333333-3333-4333-8333-333333333333',email:'synthetic-manager@example.invalid'};
  const session={user,access_token:'synthetic-ui-token'};
  const member={id:user.id,email:user.email,first_name:'Synthetic',last_name:'Manager',is_active_member:true,user_roles:[{role:'commissioner'}]};
  globalThis.__lwrpcSupabaseClient={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from(table){let single=false;const q=new Proxy({}, {get(_,key){if(key==='then')return resolve=>resolve({data:single?(table==='members'?member:null):(table==='members'?[member]:[]),error:null});return()=>{if(key==='single'||key==='maybeSingle')single=true;return q;};}});return q;}};
 });
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==new URL(base).origin)return route.abort();
  if(!url.pathname.startsWith('/api/'))return route.continue();
  let response={success:true};const op=url.searchParams.get('op'),tab=url.searchParams.get('tab');
  if(url.pathname==='/api/ai-assistant/answer'){answerRequests++;return route.fulfill({json:{success:false,error:'Synthetic test never runs a model.'}});}
  if(url.pathname==='/api/ai-assistant/capture-health')response.result={status:'unknown',lastRecordedAt:stamp};
  else if(url.pathname==='/api/ai-assistant/review'){
   if(route.request().method()==='POST'){
    const b=route.request().postDataJSON();
    if(op==='source')Object.assign(response,{url:`${base}/synthetic-official.pdf#page=3`,historical:true,title:'Historical official fixture'});
    else if(!operations.has(b.operation)){
     operations.add(b.operation);events.push({id:b.operation,action:`${b.action}_changed`,actor:'Manager',created_at:stamp,note:b.note,before_state:{status:state},after_state:{status:b.value}});
     if(b.action==='status')state=b.value;if(b.action==='category')category=b.value;revision++;
    }
   }else if(op==='detail')Object.assign(response,{group,answerId:aid,original:'what kind of ball are we using',effective:'What kind of ball are we using?',result:'insufficient_evidence',output:'No applicable official evidence.',version:'LMS-0717',observedAt:stamp,completedAt:stamp,sources:[],selection:{candidates:[]},resolver:{classification:'standalone'},diagnostics:{candidateCount:8},sourceFamily:'none',reviewedActivityAt:stamp,currentFeedback:null,feedbackCount:0,reviewToken:'synthetic-review-token',case:{id:group,status:state,revision,action_category:category,priority:'normal'}});
   else if(op==='history')response.rows=url.searchParams.get('kind')==='audit'?events:url.searchParams.get('kind')==='occurrences'?[{id:aid,answer_id:aid,recorded_at:stamp,original_question:'what kind of ball are we using',effective_question:'What kind of ball are we using?',assistant_version:'LMS-0717',occurrence_kind:'insufficient_evidence'}]:[];
   else if(tab==='summary')response.summary={grounded:22,eligible:22,voted:1,helpful:0,not_helpful:1,unanswered:9,protected:4,clarification:6,open_cases:8};
   else response.rows=[{id:group,case_id:group,title:'what kind of ball are we using',family:'unanswered',status:state,priority:'normal',occurrences:2,latest_activity:stamp,assistant_version:'LMS-0717',action_category:category}];
   response.asof=stamp;response.next=null;
  }
  return route.fulfill({json:response});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}/ai-assistant/review`);await page.getByRole('button',{name:'View',exact:true}).waitFor();
 assert.match(await page.locator('main').innerText(),/4\.55%/);assert.match(await page.locator('main').innerText(),/AI Quality Capture: Unknown/);
 await page.waitForFunction(()=>document.querySelector('section[aria-label]').getBoundingClientRect().x>=document.querySelector('aside').getBoundingClientRect().right);
 await mkdir('.next/lms0718-ui',{recursive:true});await page.screenshot({path:'.next/lms0718-ui/desktop.png',fullPage:true,animations:'disabled'});
 assert.ok(await page.evaluate(()=>document.querySelector('section[aria-label="Player outcome summary"] article').getBoundingClientRect().x>=document.querySelector('aside').getBoundingClientRect().right));
 await page.getByRole('button',{name:'View',exact:true}).click();await page.getByRole('dialog').waitFor();
 await page.getByRole('button',{name:'Start reviewing'}).click();await page.getByText('Current status: Reviewing',{exact:false}).waitFor();
 await page.getByLabel('Category',{exact:true}).selectOption('ai_retrieval_selection');await page.getByRole('button',{name:'Save category'}).click();
 await page.getByLabel('Manager note / closing summary').fill('Synthetic successful retest; preserve original occurrence.');
 await page.getByRole('button',{name:'Resolve',exact:true}).click();await page.getByRole('button',{name:'Reopen (reason required)'}).waitFor();
 assert.equal(state,'resolved');assert.equal(category,'ai_retrieval_selection');assert.equal(events.length,3);
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'View',exact:true}).click();
 const box=await page.getByRole('dialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);assert.ok(box.height<=845);
 await page.screenshot({path:'.next/lms0718-ui/mobile-detail.png'});
 const close=page.getByRole('button',{name:'Close review detail'});await close.focus();await page.keyboard.press('Tab');
 assert.ok(await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)));
 await page.getByRole('button',{name:'Retest Question'}).click();await page.waitForURL('**/ai-assistant/console');
 await page.getByRole('textbox',{name:'Question',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Question',exact:true}).inputValue(),'What kind of ball are we using?');
 assert.equal(answerRequests,0);assert.equal(new URL(page.url()).search,'');assert.deepEqual(errors,[]);
 console.log('PASS desktop/mobile rendering, modal containment/Escape, workflow controls, retained occurrence, health Unknown, manual prefill/no model request.');
}finally{await browser.close();}
