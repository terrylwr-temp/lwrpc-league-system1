"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '../../components/AppHeader';
import LoadingScreen from '../../components/LoadingScreen';
import { getRequestAuthorizationHeaders, requireRole } from '../../lib/auth';
import { REVIEW_CATEGORIES, REVIEW_STATUSES, RETEST_KEY, feedbackPercent, reviewRoleAllowed } from '../../lib/aiReviewShared.js';
import styles from './review.module.css';
import ApprovedAnswersPanel from './ApprovedAnswersPanel';

async function api(params, body) {
  const response=await fetch(`/api/ai-assistant/review?${new URLSearchParams(params)}`,{method:body?'POST':'GET',cache:'no-store',headers:{...(await getRequestAuthorizationHeaders()),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json(); if(!response.ok || !data.success) throw new Error(data.error || 'Review unavailable.'); return data;
}
const label=value=>String(value || 'Unavailable').replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const date=value=>value?new Date(value).toLocaleString():'Not retained';
function dates(){const now=new Date();return {from:new Date(now.getTime()-30*86400000).toISOString().slice(0,10),to:now.toISOString().slice(0,10)};}
function range(filters){return {...filters,from:`${filters.from}T00:00:00.000Z`,to:new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime()+86400000).toISOString()};}

export default function AiFeedbackReviewPage() {
  const router=useRouter(); const [ready,setReady]=useState(false),[tab,setTab]=useState('needs');
  const [draft,setDraft]=useState(()=>({...dates(),search:'',status:'',type:'',source:'',version:''}));
  const [filters,setFilters]=useState(draft),[page,setPage]=useState({rows:[],next:null}),[summary,setSummary]=useState(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[detail,setDetail]=useState(null),[health,setHealth]=useState(null);
  const serial=useRef(0),lastFocus=useRef(null);const [approvedCaseId,setApprovedCaseId]=useState(null);
  useEffect(()=>{let active=true;(async()=>{const user=await requireRole(router,'league_manager');if(active && user && reviewRoleAllowed(user.role))setReady(true);})();return()=>{active=false;};},[router]);
  const load=useCallback(async(cursor=null)=>{
    if(tab==='approved')return;
    const n=++serial.current; setBusy(true);setError('');
    try{
      const f=range(filters);const data=await api({...f,tab,...(cursor?{cursor}:{})});
      const cards=await api({from:f.from,to:f.to,version:f.version,source:f.source,asof:data.asof,tab:'summary'});
      if(n===serial.current){setPage(data);setSummary(cards.summary);}
    }catch(e){if(n===serial.current)setError(e.message);}finally{if(n===serial.current)setBusy(false);}
  },[filters,tab]);
  useEffect(()=>{if(ready)load();},[ready,load]);
  useEffect(()=>{if(!ready)return;let active=true;(async()=>{try{const r=await fetch('/api/ai-assistant/capture-health',{cache:'no-store',headers:await getRequestAuthorizationHeaders()});const h=await r.json();if(active)setHealth(r.ok?h.result:{status:'unknown'});}catch{if(active)setHealth({status:'unknown'});}})();return()=>{active=false;};},[ready]);
  useEffect(()=>{if(!ready)return;const group=new URL(window.location.href).searchParams.get('group');if(!group)return;let active=true;(async()=>{try{const result=await api({op:'detail',group});if(active)setDetail(result);}catch(e){if(active)setError(e.message);}})();return()=>{active=false;};},[ready]);
  async function open(row){lastFocus.current=document.activeElement;setError('');try{setDetail(await api({op:'detail',...(tab==='feedback'?{answer:row.answer_id}:{group:row.id})}));}catch(e){setError(e.message);}}
  function close(){setDetail(null);requestAnimationFrame(()=>lastFocus.current?.focus());}
  if(!ready)return <LoadingScreen subtitle="Loading AI Feedback & Review…"/>;
  if(tab==='approved')return <main className={styles.page}><AppHeader title="AI Feedback & Review" subtitle="Approved static club knowledge and authority review."/><div className={styles.workspace}><nav className={styles.tabs} aria-label="Review views">{[['needs','Needs Review'],['unanswered','Unanswered'],['feedback','Feedback'],['resolved','Resolved'],['approved','Approved Answers']].map(([key,title])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>setTab(key)}>{title}</button>)}</nav><ApprovedAnswersPanel initialCaseId={approvedCaseId} router={router}/></div></main>;
  const f=(name,title,type='text')=><label>{title}<input type={type} maxLength={name==='search'?200:80} value={draft[name]} onChange={e=>setDraft({...draft,[name]:e.target.value})}/></label>;
  const select=(name,title,values)=><label>{title}<select aria-label={title} value={draft[name]} onChange={e=>setDraft({...draft,[name]:e.target.value})}><option value="">All</option>{values.map(v=><option key={v} value={v}>{label(v)}</option>)}</select></label>;
  return <main className={styles.page}><AppHeader title="AI Feedback & Review" subtitle="Official-answer feedback, unanswered questions and manager review."/>
    <div className={styles.workspace}><div className={styles.health}>AI Quality Capture: <b>{health?.status==='degraded'?'Degraded':'Unknown'}</b> · Last recorded: {date(health?.lastRecordedAt)}. Independent operator log verification is required.</div>
    <section className={styles.cards} aria-label="Player outcome summary">{[
      ['Grounded Answers',summary?.grounded],['Feedback Participation',summary?feedbackPercent(summary.voted,summary.eligible):'—'],
      ['Helpful %',summary?(summary.voted && !summary.helpful && !summary.not_helpful?'Ambiguous':feedbackPercent(summary.helpful,summary.helpful+summary.not_helpful)):'—'],['Not Helpful',summary?.not_helpful],['Unanswered',summary?.unanswered],['Open Review Cases',summary?.open_cases],
    ].map(([name,value])=><article key={name}><span>{name}</span><strong>{value??'—'}</strong></article>)}</section>
    <p className={styles.hint}>Player metrics only; manager tests and legacy feedback are excluded. Participation counts answers, not clicks. Cards use completion dates; queues use latest activity. Search/status/type apply to lists only. Date filters are UTC; displayed times use your device timezone. Small, test-heavy activity is not a long-term performance trend.</p>
    <p className={styles.hint}>Future Live LMS Intelligence demand: {summary?.protected??'—'} protected outcomes (category unspecified). These are not unanswered failures. Clarifications: {summary?.clarification??'—'}.</p>
    <form className={styles.filters} onSubmit={e=>{e.preventDefault();setFilters({...draft});}}>{f('search','Question search')}{f('from','From (UTC)','date')}{f('to','Through (UTC)','date')}{select('status','Status',REVIEW_STATUSES)}{select('type','Type',tab==='feedback'?['helpful','not_helpful']:['not_helpful','unanswered','conflict'])}{select('source','Source family',['lwr','usap','mixed','none','unknown'])}{f('version','LMS version')}<button disabled={busy}>Apply filters</button></form>
    <nav className={styles.tabs} aria-label="Review views">{[['needs','Needs Review'],['unanswered','Unanswered'],['feedback','Feedback'],['resolved','Resolved'],['approved','Approved Answers']].map(([key,title])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>{setTab(key);setDraft(d=>({...d,type:''}));setFilters(d=>({...d,type:''}));}}>{title}</button>)}</nav>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <section aria-busy={busy} className={styles.tableWrap}><table><caption className={styles.hint}>{busy?'Loading…':`${page.rows.length} items on this page`}</caption><thead><tr>{(tab==='feedback'?['Current feedback','Question','Feedback time','Answer time','LMS Version','Source','Case','View']:['Status','Priority','Question / Group','Type','Occurrences','Latest Activity','LMS Version','Category','View']).map(s=><th key={s}>{s}</th>)}</tr></thead><tbody>{page.rows.map(row=><tr key={row.id||row.answer_id}>{tab==='feedback'?<><td>{row.helpful===null?'Ambiguous':row.helpful?'Helpful':'Not Helpful'}</td><td>{row.question}{!row.completed_at&&<small>Legacy — parent telemetry unavailable</small>}</td><td>{date(row.latest_at)}</td><td>{date(row.completed_at)}</td><td>{row.assistant_version}</td><td>{label(row.source_family)}</td><td>{row.case_id?label(row.status):'No review case'}</td></>:<><td>{label(row.status)}{row.new_activity&&['resolved','dismissed'].includes(row.status)&&<small>New activity</small>}</td><td>{row.family==='conflict'?'Confirmed conflict · ':''}{label(row.priority)}</td><td>{row.title}</td><td>{row.family==='grounded_feedback'?(row.negative?'Not Helpful':'Feedback'):label(row.family)}</td><td><b>{row.occurrences}</b></td><td>{date(row.latest_activity)}</td><td>{row.assistant_version}</td><td>{REVIEW_CATEGORIES[row.action_category]||'Unclassified'}</td></>}<td><button onClick={()=>open(row)}>View</button></td></tr>)}</tbody></table>{!busy&&!page.rows.length&&<p className={styles.empty}>No items match these filters.</p>}</section>
    <div className={styles.actions}><button disabled={busy} onClick={()=>load()}>Refresh / first page</button><button disabled={busy||!page.next} onClick={()=>load(page.next)}>Next page</button></div>
    {detail&&<Detail key={`${detail.answerId}:${detail.case?.revision}`} detail={detail} close={close} createApproved={id=>{close();setApprovedCaseId(id);setTab('approved');}} reload={async()=>{setDetail(await api({op:'detail',answer:detail.answerId}));load();}} select={async answer=>setDetail(await api({op:'detail',answer}))} router={router}/>}</div>
  </main>;
}

function Detail({detail:d,close,reload,select,router,createApproved}) {
  const dialog=useRef(null);const [error,setError]=useState(''),[working,setWorking]=useState(false),[note,setNote]=useState('');
  const [category,setCategory]=useState(d.case?.action_category||'unclassified'),[priority,setPriority]=useState(d.case?.priority||'normal');
  const retry=useRef(null);const [sourceLink,setSourceLink]=useState(null);
  useEffect(()=>{const el=dialog.current;el.showModal();const prior=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=prior;};},[]);
  async function action(action,value=null){
    setError('');setWorking(true);const payload={token:d.reviewToken,action,value,note};const fingerprint=JSON.stringify(payload);
    if(retry.current?.fingerprint!==fingerprint)retry.current={fingerprint,operation:crypto.randomUUID()};
    try{await api({}, {...payload,operation:retry.current.operation});retry.current=null;await reload();}catch(e){setError(e.message);}finally{setWorking(false);}
  }
  function retest(){try{sessionStorage.setItem(RETEST_KEY,JSON.stringify({question:d.effective||d.original,expires:Date.now()+300000}));router.push('/ai-assistant/console');}catch{setError('Unable to prefill. Copy the question into Test AI Assistant.');}}
  async function source(index){setSourceLink(null);try{setSourceLink(await api({op:'source'},{answer:d.answerId,index}));}catch(e){setError(e.message);}}
  return <dialog ref={dialog} className={styles.dialog} onCancel={e=>{e.preventDefault();if(!working)close();}} aria-labelledby="review-detail-title"><header><h2 id="review-detail-title">Review detail</h2><button onClick={close} disabled={working} aria-label="Close review detail">Close</button></header>
    {error&&<p role="alert" className={styles.error}>{error}</p>}
    <section><h3>Question</h3><p>{d.original}</p><b>Effective question</b><p>{d.effective}</p><p className={styles.hint}>{d.version} · {label(d.result)} · Answer: {date(d.completedAt)} · Observed: {date(d.observedAt)}{d.legacy?' · Legacy — parent telemetry unavailable':''}</p><button onClick={retest}>Retest Question</button><p className={styles.hint}>Opens a prefilled question. Run the test explicitly; no test is submitted here.</p></section>
    {d.case&&['new','reviewing'].includes(d.case.status)&&d.result==='insufficient_evidence'&&<section><h3>Knowledge decision</h3><p>Check existing official evidence before creating knowledge. A retrieval defect or protected/live-data question is not a missing policy.</p><button onClick={()=>createApproved(d.case.id)}>Create Approved Answer</button></section>}
    <section><h3>AI result</h3><p className={styles.answer}>{d.output||'Answer text not retained.'}</p></section>
    <section><h3>Official Sources / Evidence</h3>{d.sources.length?d.sources.map((s,i)=><article key={i}><p>{s.citation||s.documentTitle} · {s.ruleNumber?`Rule ${s.ruleNumber} · `:''}Page {s.pageNumber||'not retained'}</p><button onClick={()=>source(i)}>Prepare cited document link</button></article>):<p>No evidence selected.</p>}
      {sourceLink&&<p><b>{sourceLink.historical?(sourceLink.lifecycle==='superseded'?'Historical Source — Superseded':'Historical Source — Inactive'):'Current active version'}</b> — <a href={sourceLink.url} target="_blank" rel="noreferrer">Open {sourceLink.title}</a> (link expires in 5 minutes). {sourceLink.historical&&'This is the source retained with the historical AI response, not necessarily the current governing version.'}</p>}
      <a href="/ai-assistant">AI Assistant Management</a>
      {(d.selection.selectedEvidence||[]).map((s,i)=><p key={i}>{s.documentTitle||'Selected evidence'} · {s.evidenceRole||'Role not retained'} · {s.evidenceSelectionReason||'Selection reason not retained'}</p>)}
    </section>
    <details><summary>Technical diagnostics (bounded snapshot)</summary><p>Model: {d.model||'Not retained / skipped'} · Source family: {label(d.sourceFamily)}</p><p>Candidate count: {d.diagnostics.candidateCount??'Not retained'}. Full Stage 3 rankings and omitted exclusions are not retained.</p><ul>{(d.selection.candidates||[]).map((c,i)=><li key={i}>Retained candidate {i+1}: score {c.combinedScore??'not retained'}</li>)}</ul><h4>Resolver and retained selection details</h4><pre>{JSON.stringify({resolver:d.resolver,diagnostics:d.diagnostics,selection:d.selection},null,2)}</pre></details>
    {d.group&&<History kind="occurrences" id={d.group} title="Related occurrences" onSelect={async row=>{try{await select(row.answer_id);}catch(e){setError(e.message);}}}/>}
    <p>Current feedback: {d.currentFeedback===true?'Helpful':d.currentFeedback===false?'Not Helpful':d.feedbackCount?'Ambiguous latest state':'No feedback'}</p><History kind="feedback" id={d.answerId} title="Feedback history (chronological)"/>
    {d.case?<section><h3>Manager review</h3><p>Current status: <b>{label(d.case.status)}</b> · Reviewed through: {date(d.case.reviewed_through_at)}</p><p className={styles.hint}>A status decision acknowledges displayed activity through {date(d.reviewedActivityAt)}. Later arrivals remain new activity.</p>
      <label>Manager note / closing summary<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={4000}/></label><p className={styles.hint}>Plain text; no member details or credentials. A closing summary is required (maximum 2,000 characters). Notes append to history.</p>
      <div className={styles.actions}><button disabled={working||!note.trim()} onClick={()=>action('note')}>Add note</button><button disabled={working} onClick={()=>action('review')}>Mark displayed activity reviewed</button>
        {d.case.status==='new'&&<button disabled={working} onClick={()=>action('status','reviewing')}>Start reviewing</button>}
        {d.case.status==='reviewing'&&<button disabled={working} onClick={()=>action('status','new')}>Return to New (reason required)</button>}
        {['new','reviewing'].includes(d.case.status)?<><button disabled={working} onClick={()=>action('status','resolved')}>Resolve</button><button disabled={working} onClick={()=>action('status','dismissed')}>Dismiss</button></>:<button disabled={working} onClick={()=>action('status','reviewing')}>Reopen (reason required)</button>}
      </div><div className={styles.actions}><label>Category<select aria-label="Category" value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(REVIEW_CATEGORIES).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><button disabled={working} onClick={()=>action('category',category)}>Save category</button><label>Priority<select aria-label="Priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="normal">Normal</option><option value="high">High</option></select></label><button disabled={working} onClick={()=>action('priority',priority)}>Save priority</button></div>
      <History kind="audit" id={d.case.id} title="Append-only manager history"/>
    </section>:<p>No manager case exists for this feedback. Legacy history remains available without fabricated telemetry.</p>}
  </dialog>;
}

function History({kind,id,title,onSelect}) {
  const [data,setData]=useState({rows:[],next:null}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async(cursor=null)=>{setBusy(true);try{const p=await api({op:'history',kind,id,...(cursor?{cursor}:{})});setData(old=>({rows:cursor?[...old.rows,...p.rows]:p.rows,next:p.next}));}catch(e){setError(e.message);}finally{setBusy(false);}},[kind,id]);
  useEffect(()=>{load();},[load]);
  return <section><h3>{title}</h3>{error&&<p role="alert">{error}</p>}{data.rows.map(r=><article key={r.id}><p>{date(r.created_at||r.recorded_at)} · {kind==='feedback'?(r.helpful?'Helpful':'Not Helpful'):kind==='audit'?`${r.actor}: ${label(r.action)}`:`${r.assistant_version} · ${label(r.occurrence_kind)}`}</p>{r.original_question&&<><p>{r.original_question}</p><p>Effective: {r.effective_question}</p>{onSelect&&<button onClick={()=>onSelect(r)}>View this occurrence</button>}</>}{r.note&&<p className={styles.answer}>{r.note}</p>}{kind==='audit'&&<p>{Object.entries(r.after_state).filter(([k])=>['status','action_category','priority','revision'].includes(k)).map(([k,v])=>`${label(k)}: ${r.before_state[k]??'—'} → ${v}`).join(' · ')}</p>}</article>)}{!busy&&!data.rows.length&&<p>No retained history.</p>}{data.next&&<button disabled={busy} onClick={()=>load(data.next)}>More history</button>}</section>;
}
