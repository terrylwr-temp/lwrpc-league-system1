'use client';
export default function AskLwrChoices({clarification,onChoose,disabled=false}) {
 if(!clarification?.options?.length&&!clarification?.hasMore)return null;
 return <div role="group" aria-label="Answer clarification" className="mt-3 flex flex-wrap gap-2">{clarification.options?.map(option=><button key={option.key} type="button" disabled={disabled} onClick={()=>onChoose(option.key)} className="min-h-11 max-w-full rounded-lg border border-blue-700 bg-white px-3 py-2 text-left font-semibold text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50">{option.label}</button>)}{clarification.hasMore&&<button type="button" disabled={disabled} onClick={()=>onChoose('next page')} className="min-h-11 rounded-lg border border-blue-700 bg-white px-3 py-2 font-semibold text-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">More choices</button>}</div>;
}
