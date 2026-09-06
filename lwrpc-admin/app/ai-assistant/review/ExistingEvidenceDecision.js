'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './approved.module.css';

export default function ExistingEvidenceDecision({data,request,retest,children}){
 const [expanded,setExpanded]=useState(null),[selected,setSelected]=useState([]),[proceed,setProceed]=useState(false),[saved,setSaved]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const retry=useRef(null),pending=useRef(false),buttons=useRef(new Map());
 const continuation=useRef(null);
 useEffect(()=>{if(proceed)continuation.current?.focus();},[proceed]);
 const key=s=>`${s.chunkId}:${s.passageHash}`;
 function toggle(s){setSelected(list=>list.some(r=>key(r)===key(s))?list.filter(r=>key(r)!==key(s)):list.length<2?[...list,s]:list);}
 async function confirm(){
  if(pending.current||!selected.length)return;pending.current=true;setBusy(true);setError('');
  const evidence=selected.map(s=>({chunkId:s.chunkId,passageHash:s.passageHash}));
  const signature=JSON.stringify(evidence);if(retry.current?.signature!==signature)retry.current={signature,operation:crypto.randomUUID()};
  try{await request({}, {action:'existing-evidence',token:data.decisionToken,operation:retry.current.operation,evidence});setSaved(true);setProceed(false);}catch(e){setError(e.message);}finally{pending.current=false;setBusy(false);}
 }
 const decisions=<div className={styles.decisionActions}><p><strong>Does this existing official evidence answer the player&apos;s question?</strong></p><p>Select up to two passages that answer it. This records a manager decision; it does not resolve the case.</p>{selected.map(s=><p key={key(s)}>Selected: {s.title} — Rule {s.ruleNumber||'not numbered'} — Page {s.pageNumber}</p>)}<button disabled={busy||!selected.length} onClick={confirm}>Yes — Existing Evidence Answers It</button><button disabled={busy} onClick={()=>setProceed(true)}>No — Continue with Approved Answer</button></div>;
 if(saved)return <section className={styles.decision}><h3>Existing Official Evidence Confirmed</h3><p role="status">This question has been classified as AI/Retrieval Review because the official answer already exists, but Ask LWR did not use it correctly. This action does not change Ask LWR&apos;s answer yet. The AI retrieval/selection issue must be corrected first. After it is corrected, use Retest Question to verify the answer and then mark the case Resolved.</p><button onClick={()=>retest(data.question)}>Retest Question</button> <a href={`/ai-assistant/review?group=${encodeURIComponent(data.groupId)}`}>Return to review case</a></section>;
 return <section className={styles.decision} aria-label="Existing evidence decision">
  {error&&<p role="alert">{error}</p>}
  <p>Review the official evidence before deciding whether new knowledge is needed.</p>
  {data.sources.map(s=><article key={key(s)} className={styles.evidenceCard}><h4>{s.title} — Rule {s.ruleNumber||'not numbered'} — Page {s.pageNumber}</h4><p>{s.heading}</p><button ref={el=>{if(el)buttons.current.set(key(s),el);else buttons.current.delete(key(s));}} disabled={busy} aria-expanded={expanded===key(s)} onClick={()=>setExpanded(expanded===key(s)?null:key(s))}>View existing evidence</button>
   {expanded===key(s)&&<div><p className={styles.passage}>{s.passage}</p><label><input type="checkbox" disabled={busy||(!selected.some(r=>key(r)===key(s))&&selected.length>=2)} checked={selected.some(r=>key(r)===key(s))} onChange={()=>toggle(s)}/> Use this passage for my decision</label>{decisions}<button disabled={busy} onClick={()=>{setExpanded(null);buttons.current.get(key(s))?.focus();}}>Close source / Back to decision</button></div>}
  </article>)}
  {!expanded&&decisions}
  {proceed&&<section aria-label="Approved Answer decision result"><h3 ref={continuation} tabIndex={-1}>Continue evaluating an Approved Answer</h3>{children}</section>}
 </section>;
}
