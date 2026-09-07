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
 'next/navigation': 'const router={};exports.useRouter=()=>router;',
 '../lib/auth': 'exports.getRequestAuthorizationHeaders=async()=>({});exports.requireRole=async()=>({role:"league_manager"});',
 '../components/AppHeader': 'exports.__esModule=true;exports.default=()=>null;',
 '../components/LoadingScreen': 'exports.__esModule=true;exports.default=()=>null;',
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
const component=add(path.join(root,'app/ai-assistant/page.js'));
const react=add(require.resolve('react')),dom=add(require.resolve('react-dom/client'));
const bundle=`const process={env:{NODE_ENV:'development'}};const definitions={${[...modules].filter(([k])=>!k.endsWith('#map')).map(([k,v])=>JSON.stringify(k)+':'+(v.startsWith('function(')?v:`function(require,module,exports){${v}}`)).join(',')}};const maps=${JSON.stringify(Object.fromEntries([...modules].filter(([k])=>k.endsWith('#map')).map(([k,v])=>[k.slice(0,-4),v])))};const cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};definitions[id](n=>load(maps[id]?.[n]||n),module,module.exports);return module.exports;}
const React=load(${JSON.stringify(react)}),{createRoot}=load(${JSON.stringify(dom)}),Component=load(${JSON.stringify(component)}).default;
const versions=[{id:'known',original_filename:'Known.pdf',version_label:'Synthetic active',processing_status:'ready',activated_at:'2026-09-07T00:30:00Z',activated_by_name:'Synthetic Manager',chunk_count:1},{id:'old',created_at:'2026-09-06T00:00:00Z',original_filename:'Old.pdf',version_label:'Synthetic superseded',processing_status:'superseded',activated_at:'2026-09-06T00:30:00Z',activated_by_name:'Previous Manager',chunk_count:1},{id:'unknown',original_filename:'Unknown.pdf',version_label:'Historical',processing_status:'superseded',activated_at:null,activated_by_name:'Unknown',created_at:'2026-09-01T00:00:00Z',chunk_count:1}];
const documentRow={id:'doc',title:'Synthetic official document',document_type:'league_rules',authority_rank:1,status:'active',active_version_id:'known',active_version:versions[0]};
const secondDocument={...documentRow,id:'doc2',title:'Second official document'};
window.calls=[];window.fetch=async(url,opts={})=>{if(opts.method&&opts.method!=='GET')throw Error('No mutation in UI check');window.calls.push(url);return {ok:true,json:async()=>({success:true,documents:[documentRow,secondDocument],options:{seasons:[],leagues:[],divisions:[]},document:new URL(url,location.origin).searchParams.get('documentId')==='doc2'?secondDocument:documentRow,versions,selectedVersionId:new URL(url,location.origin).searchParams.get('versionId')||'known',previewChunks:[]})};};
createRoot(document.getElementById('root')).render(React.createElement(Component));`;
const cssDir=path.join(root,'.next/static/chunks');
const tailwind=fs.existsSync(cssDir)?fs.readdirSync(cssDir).filter(n=>n.endsWith('.css')).map(n=>fs.readFileSync(path.join(cssDir,n),'utf8')).join('\n'):'';
const css=tailwind+'\n*{box-sizing:border-box}body{margin:0}';
(async()=>{
 const server=http.createServer((_req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<style>${css}</style><div id="root"></div><script>${bundle.replace(/<\/script/gi,'<\\/script')}</script>`);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await playwright.chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || "msedge"}).catch(error=>{server.close();throw error;});
 try {
  const page=await browser.newPage({timezoneId:'America/New_York'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:/Synthetic official document/}).click();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:844});
   await page.getByRole('button',{name:/Known.pdf/}).waitFor();
   assert.match(await page.getByRole('button',{name:/Known.pdf/}).innerText(),/Activated:[\s\S]*8:30[\s\S]*PM[\s\S]*Activated by: Synthetic Manager/);
   const toggle=page.getByRole('button',{name:'Prior Versions (2)'});
   assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await page.getByRole('button',{name:/Old.pdf/}).count(),0);
   await toggle.focus(); await page.keyboard.press('Enter');
   assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.match(await page.getByRole('button',{name:/Old.pdf/}).innerText(),/Activated by: Previous Manager/);
   assert.match(await page.getByRole('button',{name:/Unknown.pdf/}).innerText(),/Activated: Unknown[\s\S]*Activated by: Unknown/);
   const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,6).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,40)}))}));if(overflow.scroll>width+1)console.log(overflow);assert.ok(overflow.scroll<=width+1);
   await page.screenshot({path:path.join(root,'../docs',`lms-0722-activation-${width}.png`),fullPage:true});
   await toggle.focus();await page.keyboard.press('Space');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
   assert.equal(await toggle.evaluate(el=>el===document.activeElement),true);
  }
  await page.getByRole('button',{name:'Prior Versions (2)'}).click();
  await page.getByRole('button',{name:/Old.pdf/}).click();assert.ok(await page.getByText('Activated by: Previous Manager',{exact:false}).count());
  await page.getByRole('button',{name:/Second official document/}).click();assert.equal(await page.getByRole('button',{name:'Prior Versions (2)'}).getAttribute('aria-expanded'),'false');
  await page.getByRole('button',{name:/Synthetic official document/}).click();assert.equal(await page.getByRole('button',{name:'Prior Versions (2)'}).getAttribute('aria-expanded'),'true');
  assert.deepEqual(errors,[]);console.log('PASS: actual management page, local-only GET fixtures, active/superseded/Unknown activation fields; device-local timezone; 1280/390/320 widths; no horizontal overflow; no page errors.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
