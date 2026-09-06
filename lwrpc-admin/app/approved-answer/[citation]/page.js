'use client';
import {use,useEffect,useState} from 'react';
import {getRequestAuthorizationHeaders} from '../../lib/auth';
import {APPROVED_SOURCE_NAME} from '../../lib/aiApprovedAnswersShared.js';
export default function ApprovedAnswerViewer({params}){
 const {citation}=use(params);const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{try{const r=await fetch(`/api/approved-answer-viewer?${new URLSearchParams({citation})}`,{cache:'no-store',headers:await getRequestAuthorizationHeaders()});const d=await r.json();if(!r.ok)throw new Error(d.error);if(active)setData(d);}catch(e){if(active)setError(e.message);}})();return()=>{active=false;};},[citation]);
 const r=data?.revision;
 return <main className="mx-auto max-w-3xl p-5 text-slate-900"><p>{APPROVED_SOURCE_NAME}</p>{error&&<p role="alert">{error}</p>}{!r&&!error&&<p>Loading approved source…</p>}{r&&<>
  <h1 className="my-4 text-2xl font-bold">{r.title}</h1><p>Revision {r.revision_number} · {r.league_scope} · Effective {r.effective_on}{r.expires_on?` · Expires ${r.expires_on}`:''}</p>
  {r.status==='retired'&&<p className="my-3 rounded border border-amber-300 bg-amber-50 p-3">Historical approved source — retired. This is the exact revision cited, not current policy.</p>}
  <p className="my-6 whitespace-pre-wrap">{r.approved_answer}</p>
  {r.public_links?.length>0&&<section><h2 className="font-bold">Public information links</h2>{r.public_links.map(l=><p key={l.url}><a className="underline" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a></p>)}</section>}
  {data.related&&<section className="mt-6"><h2 className="font-bold">Related Official Source</h2><p>{data.related.title} · Rule {data.related.ruleNumber} · Page {data.related.pageNumber}</p><p className="whitespace-pre-wrap">{data.related.passage}</p></section>}
 </>}</main>;
}
