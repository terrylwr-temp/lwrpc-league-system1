/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness bundles the actual CommonJS React runtime. */
// Isolated browser test of the real component. All auth, guide and HTTP transports are local stubs.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const modules = new Map();
const mocks = {
 '../../lib/auth': 'exports.getRequestAuthorizationHeaders=async()=>({});',
 'next/navigation': 'const router={};exports.useRouter=()=>router;',
 '../lib/auth': 'exports.getRequestAuthorizationHeaders=async()=>({});exports.requireRole=async()=>({role:"league_manager"});',
 '../components/AppHeader': 'exports.__esModule=true;exports.default=()=>null;',
 '../components/LoadingScreen': 'exports.__esModule=true;exports.default=()=>null;',
};
function add(filename) {
  if(modules.has(filename))return filename;
  modules.set(filename,'');
  let source=fs.readFileSync(filename,'utf8');
  source=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020},fileName:filename.includes('app')?'component.tsx':filename}).outputText;
  const req=createRequire(filename),mapping={};
  for(const match of source.matchAll(/require\(["']([^"']+)["']\)/g)){
    const name=match[1];let id;
    if(mocks[name]){id=name;modules.set(id,mocks[name]);}
    else if(name.endsWith('.module.css')){id=name;modules.set(id,'exports.__esModule=true;exports.default=new Proxy({}, {get:(_,key)=>String(key)});');}
    else {let resolved;try{resolved=req.resolve(name);}catch{resolved=req.resolve(name+'.js');}id=add(resolved);}
    mapping[name]=id;
  }
  modules.set(filename,`function(require,module,exports){${source}\n}`);
  modules.set(filename+'#map',mapping);return filename;
}
const component=add(path.join(root,'app/ai-assistant/review/ApprovedAnswersPanel.js'));
const react=add(require.resolve('react')),dom=add(require.resolve('react-dom/client'));
const bundle=`const process={env:{NODE_ENV:'development'}};const definitions={${[...modules].filter(([k])=>!k.endsWith('#map')).map(([k,v])=>JSON.stringify(k)+':'+(v.startsWith('function(')?v:`function(require,module,exports){${v}}`)).join(',')}};const maps=${JSON.stringify(Object.fromEntries([...modules].filter(([k])=>k.endsWith('#map')).map(([k,v])=>[k.slice(0,-4),v])))};const cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};definitions[id](n=>load(maps[id]?.[n]||n),module,module.exports);return module.exports;}
const React=load(${JSON.stringify(react)}),{createRoot}=load(${JSON.stringify(dom)}),Component=load(${JSON.stringify(component)}).default;

const request=async(params={},body)=>{const r=await fetch('/fixture',{method:'POST',body:JSON.stringify({params,body,failure:window.fixtureFailure})});const v=await r.json();if(!r.ok)throw Error(v.error);return v;};
function App(){const [visible,setVisible]=React.useState(true);return React.createElement(React.Fragment,null,React.createElement('button',{'data-approved-leave':true,onClick:()=>setVisible(v=>!v)},visible?'Other review tab':'Approved Answers tab'),visible&&React.createElement(Component,{request,initialCaseId:'10000000-0000-4000-8000-000000000002',router:{push:()=>{window.retested=true;}}}));}
createRoot(document.getElementById('root')).render(React.createElement(App));`;
const os=require('node:os'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'approved-draft-ux-')),file=path.join(dir,'store.json');
fs.writeFileSync(file,JSON.stringify({rows:[],operations:{},writes:0,saveRequests:0,caseStatus:'new'}));
const read=()=>JSON.parse(fs.readFileSync(file,'utf8')),write=data=>fs.writeFileSync(file,JSON.stringify(data)),id='10000000-0000-4000-8000-000000000001';
const css=fs.readFileSync(path.join(root,'app/ai-assistant/review/approved.module.css'),'utf8')+fs.readFileSync(path.join(root,'app/ai-assistant/review/review.module.css'),'utf8')+'\n*{box-sizing:border-box}body{margin:0;padding:12px;font-family:Arial}button{min-height:44px}';
(async()=>{
 const server=http.createServer(async(req,res)=>{
  if(req.url!=='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<style>${css}</style><div id="root"></div><script>${bundle.replace(/<\/script/gi,'<\\/script')}</script>`);return;}
  let raw='';for await(const chunk of req)raw+=chunk;const {params,body,failure}=JSON.parse(raw);let data=read(),result;
  if(body&&['create','save'].includes(body.action)){
   if(failure){res.statusCode=400;res.end(JSON.stringify({error:failure}));return;}
   data.saveRequests++;write(data);await new Promise(r=>setTimeout(r,150));data=read();
   if(!data.operations[body.operation]){const prior=data.rows[0];data.rows=[{...body.draft,id,answer_id:id,status:'draft',revision_number:1,row_version:(prior?.row_version||0)+1}];data.writes++;data.operations[body.operation]=id;write(data);}
   result={success:true,revisionId:id};
  }else if(body?.action==='preflight')result={sources:[],overlaps:[],blocked:false,token:'fixture-only'};
  else if(body?.action==='activate'){data.rows[0].status='active';data.rows[0].activated_at=new Date().toISOString();data.rows[0].row_version++;write(data);result={success:true,revisionId:id};}
  else if(params.op==='case')result={caseId:'10000000-0000-4000-8000-000000000002',question:'How is a synthetic policy reviewed?',sources:[],blocked:false};
  else if(params.op==='detail'&&failure==='detail'){res.statusCode=503;res.end(JSON.stringify({error:'Review temporarily unavailable.'}));return;}
  else if(params.op==='detail')result={revision:data.rows[0],item:{source_review_case_id:'10000000-0000-4000-8000-000000000002'},linkedCase:{group_id:id,status:'new',question:'How is a synthetic policy reviewed?'},history:data.rows,events:[],activatedBy:'Synthetic Manager'};
  else result={revisions:data.rows,seasons:[],warnings:[]};
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await playwright.chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:/Continue with Approved Answer/}).click();
  for(const [label,value] of [['Title','Synthetic policy'],['Policy/topic key','synthetic-policy'],['Canonical question','How is a synthetic policy reviewed?'],['Official approved answer','Review this synthetic policy with League Management.']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByLabel(/I reviewed the official sources/).check();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:844});await page.evaluate(()=>window.fixtureFailure='League scope is required.');
   await page.getByRole('button',{name:'Save Draft',exact:true}).focus();await page.keyboard.press('Enter');const alert=page.getByRole('alert');await alert.waitFor();
   assert.match(await alert.innerText(),/Draft was not saved. League scope is required/);
   await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='alert');
   const box=await alert.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=844);assert.equal(read().writes,0);
   assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Synthetic policy');assert.equal(await page.getByRole('status').count(),0);
   await page.screenshot({path:path.join(root,'../docs',`lms-0731-save-error-${width}.png`)});
  }
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Close creation',exact:true}).click();assert.equal(await page.getByLabel('Title',{exact:true}).count(),1);
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Other review tab',exact:true}).click();assert.equal(await page.getByLabel('Title',{exact:true}).count(),1);
  await page.evaluate(()=>window.fixtureFailure='technical_error');await page.getByRole('button',{name:'Save Draft',exact:true}).click();await page.getByText('Draft was not saved. Please review the required fields and try again.',{exact:true}).waitFor();
  await page.evaluate(()=>window.fixtureFailure=null);await page.getByRole('button',{name:'Save Draft',exact:true}).evaluate(el=>{el.click();el.click();});
  await page.getByRole('status').filter({hasText:'Draft saved.'}).waitFor();assert.equal(read().writes,1);assert.equal(read().saveRequests,1);assert.equal(read().rows[0].status,'draft');
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:844});await page.getByRole('status').filter({hasText:'Draft saved.'}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'../docs',`lms-0731-save-success-${width}.png`)});}
  await page.evaluate(()=>window.fixtureFailure='detail');await page.getByRole('button',{name:'Review / Activate Draft',exact:true}).click();await page.getByRole('alert').filter({hasText:'Draft saved, but its review could not be loaded.'}).waitFor();assert.equal(read().writes,1);
  await page.evaluate(()=>window.fixtureFailure=null);await page.getByRole('button',{name:'Review / Activate Draft',exact:true}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Other review tab',exact:true}).click();await page.getByRole('button',{name:'Approved Answers tab',exact:true}).click();
  await page.getByRole('cell').filter({hasText:'Status: DRAFT'}).waitFor();await page.getByRole('button',{name:'View',exact:true}).click();
  assert.equal(await page.getByLabel('Official approved answer',{exact:true}).inputValue(),'Review this synthetic policy with League Management.');
  await page.getByRole('button',{name:'Review activation',exact:true}).click();await page.getByLabel(/Activate this official answer for players/).check();await page.getByRole('button',{name:'Activate',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Approved Answer activated.'}).waitFor();assert.equal(read().rows[0].status,'active');assert.equal(read().caseStatus,'new');
  await page.getByRole('button',{name:'Retest Question',exact:true}).click();assert.equal(await page.evaluate(()=>window.retested),true);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,widths:[1280,390,320],writes:read().writes,status:read().rows[0].status,externalCalls:0}));
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
