'use client';
import { useState } from 'react';
import { ratingsImportPreviewView, toggleRatingsPreviewReviewOnly } from '../lib/ratingsImportPreviewView.js';
const value=v=>v===null||v===undefined||v===''?'—':String(v);
const fields={doubles:'DUPR Doubles',rf:'Reliability Rating',age:'Age-Based input'};
const labels={total:'CSV preview rows',ready:'Rows ready to import',doubles:'Doubles fields to fill',rf:'Reliability fields to fill',age:'Age-Based inputs to fill',protectedFields:'Populated input fields protected',skipped:'Skipped / review rows',review:'Review (ambiguous / invalid)',missing:'Missing source fields'};
export default function RatingsImportPreview({preview,busy,onImport}) {
 const [viewState,setViewState]=useState({page:0,reviewOnly:false});
 const view=ratingsImportPreviewView(preview.rows,viewState);
 const changePage=page=>setViewState(current=>({...current,page}));
 return <section className="mt-4 rounded-xl border border-blue-200 bg-white p-4" aria-label="Ratings import preview">
  <h3 className="text-lg font-bold">Import preview — {preview.season.name}</h3>
  <p className="mt-2 text-sm">Create missing season records and fill blank imported inputs. Populated inputs, final Season DUPR, PrimeTime Season DUPR and notes are preserved. Clean Ratings is not run.</p>
  <dl className="my-4 grid grid-cols-2 gap-3 md:grid-cols-3">{Object.entries(labels).map(([key,label])=><div key={key}><dt className="text-sm text-slate-600">{label}</dt><dd className="font-bold">{preview.counts[key]}</dd></div>)}</dl>
  {preview.receipt&&preview.counts.ready>0?<button type="button" disabled={busy} onClick={onImport} className="my-4 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-50">{busy?'Importing…':'Import Matched Ratings'}</button>:<p className="my-4 font-semibold">No eligible rows to import. Review the row reasons.</p>}
  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
   <button type="button" aria-pressed={viewState.reviewOnly} onClick={()=>setViewState(toggleRatingsPreviewReviewOnly)} className={`rounded-lg border px-4 py-2 text-sm font-bold ${viewState.reviewOnly?'border-blue-800 bg-blue-800 text-white':'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'}`}>{viewState.reviewOnly?'Show All Preview Rows':'Show Review / Invalid Only'}</button>
   <p className="text-sm font-semibold text-slate-700" aria-live="polite">{viewState.reviewOnly?`Showing ${view.visibleCount} review / invalid rows out of ${view.totalCount} preview rows`:`Showing all ${view.totalCount} preview rows`}</p>
  </div>
  <div className="overflow-x-auto" role="region" aria-label="CSV values and proposed fills" tabIndex={0}><table className="w-full text-left text-sm">
   <thead className="bg-slate-900 text-white"><tr>{['CSV line','Action','Member / DUPR ID','CSV values','Existing inputs','Proposed input changes','Reason / preserved finals'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead>
   <tbody>{view.pageRows.map((row,i)=><tr key={`${row.line}-${row.memberId||i}`} className="border-b border-slate-200">
    <td className="p-3">{row.line}</td><td className="p-3 font-bold">{row.action==='FILL'?'CREATE / FILL INPUTS':row.action==='RECORD'?'INPUTS UNCHANGED':row.action}</td><td className="p-3">{row.name||'Unmatched'}<br/>{row.duprId||'Missing DUPR ID'}</td>
    <td className="p-3">{Object.entries(fields).map(([key,label])=><div key={key}>{label}: {value(row.incomingValues[key])}</div>)}</td>
    <td className="p-3">{Object.entries(fields).map(([key,label])=><div key={key}>{label}: {value(row.working[key])}</div>)}</td>
    <td className="p-3">{Object.entries(row.fills).length?Object.entries(row.fills).map(([key,next])=><div key={key}>{fields[key]}: {value(row.working[key])} → {value(next)}</div>):'None'}</td>
    <td className="p-3">{row.reason}<div className="mt-2 text-xs">Final Season DUPR: {value(row.current)}; PrimeTime: {value(row.primetime)} — preserved.</div></td>
   </tr>)}</tbody>
  </table></div>
  <nav aria-label="Import preview pages" className="mt-3 flex items-center gap-4"><button type="button" disabled={view.page===0} onClick={()=>changePage(view.page-1)}>Previous</button><span>Page {view.page+1} of {view.pages}</span><button type="button" disabled={view.page+1>=view.pages} onClick={()=>changePage(view.page+1)}>Next</button></nav>
 </section>;
}
