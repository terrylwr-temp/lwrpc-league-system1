"use client";
import {useId,useRef,useState} from 'react';
import {ASK_LWR_INITIAL_COPY,ASK_LWR_HELP_GROUPS} from '../lib/askLwrAssistantConfig';

export default function AskLwrWelcome({onChoose,disabled=false}) {
 const dialogRef=useRef(null),triggerRef=useRef(null),id=useId();
 const [open,setOpen]=useState(false);
 const close=()=>dialogRef.current?.close();
 const handleKeyDown=event=>{
  if(event.key==='Escape'){event.stopPropagation();return;}
  if(event.key!=='Tab')return;
  event.stopPropagation();
  const controls=[...dialogRef.current.querySelectorAll('button:not([disabled])')];
  const first=controls[0],last=controls.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
 };
 return <section className="mt-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
  <h3 className="text-base font-black text-[#102e64]">How can I help?</h3>
  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{ASK_LWR_INITIAL_COPY}</p>
  <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={()=>{dialogRef.current?.showModal();setOpen(true);}} className="mt-2 min-h-11 rounded-lg px-2 text-sm font-bold text-blue-800 underline decoration-blue-200 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">What can I ask?</button>
  <dialog ref={dialogRef} id={id} aria-labelledby={`${id}-title`} onKeyDown={handleKeyDown} onCancel={e=>{e.preventDefault();close();}} onClose={()=>{setOpen(false);triggerRef.current?.focus({preventScroll:true});}} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-blue-100 bg-white p-4 text-slate-800 shadow-2xl backdrop:bg-slate-950/50 sm:p-6">
   <div className="flex items-start justify-between gap-3"><h2 id={`${id}-title`} className="text-lg font-black text-[#102e64]">What can I ask?</h2><button type="button" onClick={close} aria-label="Close question help" className="min-h-11 min-w-11 shrink-0 rounded-full text-xl font-bold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">×</button></div>
   {ASK_LWR_HELP_GROUPS.map(group=><section key={group.title} className="mt-4"><h3 className="text-sm font-black uppercase tracking-wide text-[#102e64]">{group.title}</h3>{group.description&&<p className="mt-2 text-sm leading-5 text-slate-600">{group.description}</p>}<ul className="mt-2 space-y-2">{group.questions.map(q=><li key={q}><button type="button" disabled={disabled} onClick={()=>{close();onChoose(q);}} className="min-h-11 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-left text-sm font-semibold leading-5 text-blue-900 hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50">{q}</button></li>)}</ul></section>)}
  </dialog>
 </section>;
}
