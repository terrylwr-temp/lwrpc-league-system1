'use client';
import {useState} from 'react';
import {getRequestAuthorizationHeaders} from '../../lib/auth';
export default function LiveFeedbackPanel(){
 const [groups,setGroups]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function load(){setBusy(true);setError('');try{
  const response=await fetch('/api/ai-assistant/live-review',{cache:'no-store',headers:await getRequestAuthorizationHeaders()});
  const data=await response.json();if(!response.ok||!data.success)throw new Error();setGroups(data.groups);
 }catch{setError('Live diagnostics could not be loaded.');}finally{setBusy(false);}}
 return <section className="my-4 rounded-xl border border-sky-200 bg-sky-50 p-4" aria-label="Live LMS feedback"><h2 className="font-bold">LIVE LMS DATA — Feedback diagnostics</h2><p className="my-2 text-sm">Live values and questions are not retained. Groups identify the capability, result and authorization class. These are not missing-rule cases or Approved Answer candidates. Run a new authorized question in Test AI Assistant to investigate current behavior.</p><button type="button" className="min-h-11 rounded border border-sky-400 px-3" disabled={busy} onClick={load}>{busy?'Loading…':'Load / refresh live feedback'}</button>{error&&<p role="alert">{error}</p>}{groups&&<div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Capability','Result','Access','Origin','Helpful','Not Helpful','Version','Latest'].map(x=><th className="p-2" key={x}>{x}</th>)}</tr></thead><tbody>{groups.map((g,i)=><tr key={i}>{[g.intent,g.result_code,g.relationship,g.origin,g.helpful,g.not_helpful,g.assistant_version,new Date(g.latest_at).toLocaleString()].map((v,n)=><td className="p-2" key={n}>{v}</td>)}</tr>)}</tbody></table>{groups.length===0&&<p>No live feedback has been recorded in the last 90 days.</p>}</div>}</section>;
}
