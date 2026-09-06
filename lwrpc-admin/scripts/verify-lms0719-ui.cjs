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
  'next/navigation': 'exports.usePathname=()=>"/ask-lwr";',
  '../lib/auth': 'exports.getRequestAuthorizationHeaders=async()=>({});exports.supabase={};',
  '../lib/dashboardGuides': 'exports.GUIDE_DOCUMENT_TYPES=[];',
  '../lib/leagueDocuments': 'exports.LEAGUE_DOCUMENT_TYPES=[];',
  '../lib/askLwrAssistantConfig': 'exports.assistantPageContext=()=>({currentPath:"/ask-lwr",featureModule:"LMS",suggestions:[]});exports.visibleDashboardGuideKeys=()=>[];exports.ASK_LWR_INITIAL_COPY="Local UI verification";',
};
function add(filename) {
  if(modules.has(filename))return filename;
  modules.set(filename,'');
  let source=fs.readFileSync(filename,'utf8');
  source=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020},fileName:filename.endsWith('AskLwrAssistant.js')?'component.tsx':filename}).outputText;
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
const component=add(path.join(root,'app/components/AskLwrAssistant.js'));
const react=add(require.resolve('react')),dom=add(require.resolve('react-dom/client'));
const bundle=`const process={env:{NODE_ENV:'development'}};const definitions={${[...modules].filter(([k])=>!k.endsWith('#map')).map(([k,v])=>JSON.stringify(k)+':'+(v.startsWith('function(')?v:`function(require,module,exports){${v}}`)).join(',')}};const maps=${JSON.stringify(Object.fromEntries([...modules].filter(([k])=>k.endsWith('#map')).map(([k,v])=>[k.slice(0,-4),v])))};const cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};definitions[id](n=>load(maps[id]?.[n]||n),module,module.exports);return module.exports;}
const React=load(${JSON.stringify(react)}),{createRoot}=load(${JSON.stringify(dom)}),{AskLwrAssistantDrawer,AskLwrAssistantPage}=load(${JSON.stringify(component)});
window.calls=[];window.pending=[];window.fetch=async(url,options)=>{window.calls.push({url,...JSON.parse(options.body)});return await new Promise(resolve=>window.pending.push(result=>resolve({ok:true,json:async()=>({success:true,result})})));};
function App(){const [open,setOpen]=React.useState(true);return React.createElement(React.Fragment,null,React.createElement('button',{onClick:()=>setOpen(true)},'Open assistant'),location.search.includes('standalone')?React.createElement(AskLwrAssistantPage,{role:'player'}):React.createElement(AskLwrAssistantDrawer,{open,onClose:()=>setOpen(false),role:'player'}));}createRoot(document.getElementById('root')).render(React.createElement(App));`;
const cssDir=path.join(root,'.next/static/chunks');
const tailwind=fs.existsSync(cssDir)?fs.readdirSync(cssDir).filter(n=>n.endsWith('.css')).map(n=>fs.readFileSync(path.join(cssDir,n),'utf8')).join('\n'):'';
const css=tailwind+'\n'+fs.readFileSync(path.join(root,'app/components/AskLwrAssistant.module.css'),'utf8');
(async()=>{
 const server=http.createServer((_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<style>${css}</style><div id="root"></div><script>${bundle.replace(/<\/script/gi,'<\\/script')}</script>`);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await playwright.chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || "msedge"}).catch(error=>{server.close();throw error;});
 try {
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const reset=page.getByRole('button',{name:'New Question',exact:true}),input=page.getByRole('textbox',{name:'Ask a question'});
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:844});await reset.waitFor();
   const boxes=await Promise.all([input.boundingBox(),reset.boundingBox(),page.getByRole('button',{name:'Ask',exact:true}).boundingBox()]);
   assert.ok(boxes.every(b=>b.x>=0&&b.x+b.width<=width+1&&b.height>=44));
   if(width<640){assert.ok(boxes[1].y>=boxes[0].y+boxes[0].height);assert.ok(boxes[0].width>width-40);}
   else assert.ok(boxes[1].y<boxes[2].y);
  }
  await input.fill('Can I volley in the kitchen?');await page.getByRole('button',{name:'Ask',exact:true}).click();assert.equal(await reset.isDisabled(),true);
  await page.getByRole('button',{name:'Close Ask LWR Pickleball Club AI',exact:true}).last().click();await page.getByRole('button',{name:'Open assistant'}).click();assert.equal(await reset.isDisabled(),true);
  await page.evaluate(()=>window.pending.shift()({kind:'answer',answer:'Local grounded answer',conversationReceipt:'local-context',feedbackReceipt:'local-feedback',sources:[]}));
  await page.getByText('Local grounded answer',{exact:true}).waitFor();
  await page.getByRole('button',{name:/^\S+ Helpful$/}).click();assert.equal(await reset.isDisabled(),true);
  await page.evaluate(()=>window.pending.shift()({helpful:true,feedbackId:'local-vote'}));
  await page.waitForFunction(()=>!document.querySelector('button[title="Start a new question"]').disabled);
  const before=await page.evaluate(()=>window.calls.length);await reset.click();assert.equal(await input.inputValue(),'');assert.equal(await input.evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.getByText('Local grounded answer',{exact:true}).count(),0);
  assert.deepEqual(await page.evaluate(()=>[sessionStorage.getItem('lwr-ask-ai-exchanges'),sessionStorage.getItem('lwr-ask-ai-current-context-v1')]),[null,null]);
  assert.equal(await page.evaluate(()=>window.calls.length),before);
  await input.fill('What about Saturday?');await page.getByRole('button',{name:'Ask',exact:true}).click();assert.equal(await page.evaluate(()=>window.calls.at(-1).conversationReceipt),null);
  await page.evaluate(()=>window.pending.shift()({kind:'clarification',answer:'Local clarification',conversationReceipt:'clarification-context',sources:[]}));await page.getByText('Local clarification',{exact:true}).waitFor();await reset.click();
  await page.reload();await reset.waitFor();assert.equal(await page.getByText('Local clarification',{exact:true}).count(),0);
  await page.goto(`http://127.0.0.1:${server.address().port}?standalone`);await input.fill('Draft');await reset.click();assert.equal(await input.inputValue(),'');assert.equal(await input.evaluate(e=>e===document.activeElement),true);
  assert.deepEqual(errors,[]);console.log('PASS: real component desktop/390/320 layout, pending Ask remount, feedback busy, reset/no HTTP, storage, fresh receipt, reload, standalone focus. Local transports only.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
