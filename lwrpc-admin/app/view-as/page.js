'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
const STORE='lwr-view-context-v1';
const button='min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:opacity-50';
export default function ViewAsPage(){
 const [viewer,setViewer]=useState(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[snapshot,setSnapshot]=useState(null),[page,setPage]=useState('dashboard');
 const [question,setQuestion]=useState(''),[exchanges,setExchanges]=useState([]),[busy,setBusy]=useState(false),[source,setSource]=useState(null);
 const handle=useRef(null),normal=useRef(null),returnPath=useRef('/'),epoch=useRef(0),sourceBlob=useRef(null),focused=useRef(false);
 const purge=useCallback((message)=>{epoch.current++;focused.current=false;handle.current=null;sessionStorage.removeItem(STORE);setViewer(null);setSnapshot(null);setExchanges([]);setSource(null);setReady(false);setError(message);if(sourceBlob.current)URL.revokeObjectURL(sourceBlob.current);},[]);
 const request=useCallback(async(body)=>{
  if(!handle.current)throw new Error('Start View As User from Member Detail in your normal LMS tab.');
  const response=await fetch('/api/view-as/read',{method:'POST',headers:{'Content-Type':'application/json','x-view-as-context':handle.current},body:JSON.stringify(body),cache:'no-store'});
  if(!response.ok){const data=await response.json();if(response.status===401||response.status===403)purge(data.error||'View As User expired.');throw new Error(data.error||'View As User unavailable.');}
  return response;
 },[purge]);
 const refresh=useCallback(async(conceal=true)=>{
  const stamp=epoch.current;if(conceal)setReady(false);try{const data=await(await request({operation:'status'})).json();if(stamp!==epoch.current)return;setViewer(data.viewer);returnPath.current=data.viewer.returnPath;const rows=await(await request({operation:'snapshot'})).json();if(stamp!==epoch.current)return;setSnapshot(rows);setReady(true);setError('');}catch(e){setError(e.message);}
 },[request]);
 useEffect(()=>{
  let disposed=false;const opener=window.opener;let exchanging=false;
  const exchange=async event=>{
   if(disposed||exchanging||event.source!==opener||!normal.current||event.origin!==normal.current||event.data?.type!=='lwr-view-handoff')return;
   exchanging=true;
   try{const res=await fetch('/api/view-as/exchange',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:event.data.code})});const data=await res.json();if(!res.ok)throw new Error(data.error||'Handoff failed.');handle.current=data.context;sessionStorage.setItem(STORE,data.context);window.opener=null;await refresh();}catch(e){purge(e.message);}
  };
  window.addEventListener('message',exchange);
  fetch('/api/view-as/bootstrap',{method:'POST'}).then(r=>{if(!r.ok)throw new Error('View As User is not configured.');return r.json();}).then(data=>{
   if(disposed)return;normal.current=data.normalOrigin;handle.current=sessionStorage.getItem(STORE);
   if(handle.current)refresh();else if(opener)opener.postMessage({type:'lwr-view-ready',challenge:data.challenge},data.normalOrigin);else setError('Start View As User from Member Detail in your normal LMS tab.');
  }).catch(e=>{if(!disposed)setError(e.message);});
  const validate=()=>{if(handle.current)refresh();};
  const hide=()=>{if(document.hidden)setReady(false);else validate();};
  window.addEventListener('pageshow',validate);window.addEventListener('focus',validate);document.addEventListener('visibilitychange',hide);
  const timer=setInterval(()=>{if(handle.current)refresh(false);},30000);
  return()=>{disposed=true;clearInterval(timer);window.removeEventListener('message',exchange);window.removeEventListener('pageshow',validate);window.removeEventListener('focus',validate);document.removeEventListener('visibilitychange',hide);};
 },[refresh,purge]);
 useEffect(()=>{if(!viewer)return;const timer=setTimeout(()=>purge('View As User session expired.'),Math.max(0,new Date(viewer.expires)-Date.now()));return()=>clearTimeout(timer);},[viewer,purge]);
 async function exit(){try{await request({operation:'exit'});purge('View As User ended. Your normal LMS session is unchanged.');if(normal.current)window.location.assign(normal.current+returnPath.current);}catch(e){setError(e.message);}}
 async function ask(event){event.preventDefault();if(!question.trim()||busy)return;setBusy(true);const stamp=epoch.current,q=question;setQuestion('');
  try{const data=await(await request({operation:'ask',question:q,conversationReceipt:exchanges[0]?.result.conversationReceipt})).json();if(stamp===epoch.current)setExchanges(prev=>[{question:q,result:data.result},...prev]);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function showSource(item){const stamp=epoch.current;try{const response=await request({operation:'source',source:item.officialDocumentUrl});if(stamp!==epoch.current)return;if(sourceBlob.current)URL.revokeObjectURL(sourceBlob.current);if(response.headers.get('content-type')?.includes('application/pdf')){sourceBlob.current=URL.createObjectURL(await response.blob());setSource({url:sourceBlob.current,page:item.pageNumber,title:item.citation});}else{setSource({revision:(await response.json()).revision,title:item.citation});}}catch(e){setError(e.message);}}
 useEffect(()=>{if(ready&&!focused.current){document.querySelector('main h1')?.focus();focused.current=true;}},[ready]);
 const nav=[['dashboard','Dashboard'],['teams','Teams & Rosters'],['matches','Matches'],['standings','Standings'],['ask','Ask LWR']];
 return <div className="min-h-dvh bg-slate-100 text-slate-950">
  <header className="sticky top-0 z-50 border-b-4 border-amber-500 bg-slate-950 px-4 py-3 text-white" style={{paddingTop:'max(.75rem, env(safe-area-inset-top))'}}>
   <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><div><strong>VIEW AS USER — READ ONLY</strong>{viewer&&<><p>Viewing as {viewer.targetName} · {viewer.roles.join(', ').replaceAll('_',' ')}</p><p className="text-sm text-slate-300">Signed in as {viewer.actorName} · {viewer.actorRole.replaceAll('_',' ')}</p></>}</div>{viewer&&<button className={button} onClick={exit}>Exit View As User</button>}</div>
  </header>
  <main className="mx-auto max-w-6xl space-y-5 p-4 pb-12" style={{paddingBottom:'max(3rem, env(safe-area-inset-bottom))'}}>
   {error&&<p role="alert" className="rounded border border-red-300 bg-white p-4">{error}</p>}
   {!viewer&&<button className={button} onClick={()=>{if(normal.current)window.location.assign(normal.current+returnPath.current);}}>Return to normal LMS</button>}
   {viewer&&!ready&&<p role="status">Validating read-only access…</p>}
   {viewer&&ready&&<>
    {!viewer.hasAuth&&<p className="rounded bg-amber-100 p-3">LMS permission preview. This member has no linked sign-in account; sign-in behavior is not simulated.</p>}
    <nav aria-label="View As User"><div className="flex flex-wrap gap-2">{nav.map(([key,label])=><button key={key} className={button} aria-current={page===key?'page':undefined} onClick={async()=>{await refresh();setPage(key);}}>{label}</button>)}{['commissioner','league_manager'].includes(viewer.role)&&<button className={button} onClick={()=>setPage('unsupported')}>Manager tools</button>}</div></nav>
    {page==='unsupported'&&<section className="rounded-xl bg-white p-5"><h1 tabIndex={-1} className="text-xl font-semibold">Exit required</h1><p>This screen is not available in the read-only preview. Exit View As User to use manager tools.</p></section>}
    {page==='dashboard'&&<section className="rounded-xl bg-white p-5"><h1 tabIndex={-1} className="text-2xl font-semibold">{viewer.targetName}’s dashboard</h1><p className="mt-3">{snapshot?.teams.length||0} authorized active teams. Use Ask LWR to check current ratings or other supported Live LMS information.</p><p className="mt-2 text-sm text-slate-600">Profile changes, roster changes, scores, messages, uploads and feedback are unavailable in this read-only preview.</p></section>}
    {['dashboard','teams'].includes(page)&&<section className="space-y-3"><h2 className="text-xl font-semibold">Teams & Rosters</h2>{!snapshot?.teams.length&&<p>No authorized active teams.</p>}{snapshot?.teams.map(team=><article className="rounded-xl bg-white p-4" key={team.id}><h3 className="font-semibold">{team.name}</h3><p>{team.division} · {team.league} · {team.season}</p>{page==='teams'&&<ul className="mt-3 list-inside list-disc">{snapshot.rosters.filter(p=>p.team_id===team.id).map((p,i)=><li key={i}>{p.name}</li>)}</ul>}</article>)}</section>}
    {page==='matches'&&<section className="space-y-3"><h1 tabIndex={-1} className="text-2xl font-semibold">Published matches</h1>{!snapshot?.matches.length&&<p>No authorized published matches.</p>}{snapshot?.matches.map(m=><article className="rounded-xl bg-white p-4" key={m.id}><h2>{m.home_team} vs {m.away_team}</h2><p>{m.scheduled_date} · {m.scheduled_time} · {m.location}</p><p>{m.status}</p></article>)}</section>}
    {page==='standings'&&<section><h1 tabIndex={-1} className="text-2xl font-semibold">Standings</h1><div className="overflow-x-auto rounded-xl bg-white"><table className="w-full text-left"><thead><tr>{['Team / Division','Rank','Points','Won','Lost'].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{snapshot?.standings.map((s,i)=><tr key={i}><td className="p-3">{s.team} / {s.division}</td>{['rank','standings_points','match_wins','match_losses'].map(k=><td className="p-3" key={k}>{s[k]}</td>)}</tr>)}</tbody></table></div></section>}
    {page==='ask'&&<section className="rounded-xl bg-white p-4"><h1 tabIndex={-1} className="text-2xl font-semibold">Ask LWR Pickleball Club AI</h1><p className="mb-4 text-sm">Read-only diagnostic · Feedback disabled</p><form onSubmit={ask} className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="view-question">Ask a question</label><input id="view-question" className="min-h-11 min-w-0 flex-1 rounded border p-3" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2400} placeholder="Ask a question"/><button className={button} disabled={busy||!question.trim()}>Ask</button></form>{busy&&<p role="status">Checking…</p>}{exchanges.map((e,i)=><article key={i} className="mt-5 border-t pt-4"><h2 className="font-semibold">{e.question}</h2><p className="my-3 whitespace-pre-wrap">{e.result.answer}</p>{e.result.live&&<p className="text-xs font-semibold">LIVE LMS DATA</p>}{e.result.sources?.length>0&&<h3>Official Sources</h3>}{e.result.sources?.map((s,j)=><button className={`${button} my-1 w-full text-left`} key={j} onClick={()=>showSource(s)}>{s.citation}</button>)}</article>)}</section>}
    {source&&<section role="region" aria-label="Official Source" className="rounded-xl bg-white p-4"><div className="flex items-center justify-between gap-3"><h2>{source.title}</h2><button className={button} onClick={()=>{setSource(null);if(sourceBlob.current)URL.revokeObjectURL(sourceBlob.current);}}>Close source</button></div>{source.url?<iframe title="Official document" src={`${source.url}#page=${source.page||1}`} className="mt-3 h-[70dvh] w-full"/>:<p className="mt-3 whitespace-pre-wrap">{source.revision?.approved_answer}</p>}</section>}
    <p className="text-xs text-slate-600">Bounded preview: up to 100 teams, 500 roster entries, 100 published matches and 200 standings rows. Exit to use other screens.</p>
   </>}
  </main>
 </div>;
}
