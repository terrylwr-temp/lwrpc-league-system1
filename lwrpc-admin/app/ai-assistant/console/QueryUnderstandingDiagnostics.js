export default function QueryUnderstandingDiagnostics({diagnostic,answer,documents}) {
  if(!diagnostic)return null;
  const plan=diagnostic.plan;
  return <section className="rounded-2xl border border-slate-200 bg-white p-4">
    <h2 className="font-black text-slate-900">Semantic query understanding and rescue</h2>
    <p className="mt-2 break-words text-sm"><b>Original:</b> {diagnostic.originalQuery}</p>
    <p className="mt-2 text-sm"><b>Status:</b> {diagnostic.status} · <b>Rescue ran:</b> {diagnostic.rescueRan?'Yes':'No'}</p>
    {diagnostic.rescue&&<p className="mt-2 text-sm">Rescue considered: {String(diagnostic.rescue.considered)} · triggered: {String(diagnostic.rescue.triggered)} · queries executed: {diagnostic.rescue.queriesExecuted} · candidates returned: {diagnostic.rescue.candidatesReturned} · evidence selected: {String(diagnostic.rescue.evidenceSelected)}</p>}
    {plan&&<dl className="mt-3 space-y-2 text-sm">
      <div><dt className="font-bold">Intent / requested fact</dt><dd>{plan.intent} / {plan.factType}</dd></div>
      <div><dt className="font-bold">Entities / nouns</dt><dd>{[...plan.entities,...plan.nouns].join(', ')||'None'}</dd></div>
      <div><dt className="font-bold">Normalized concepts</dt><dd>{plan.concepts.join(', ')}</dd></div>
      <div><dt className="font-bold">Equivalent question</dt><dd>{plan.normalizedQuestion}</dd></div>
      <div><dt className="font-bold">Soft document affinities</dt><dd>{plan.documentAffinities.join(', ')||'None'} — ranking boost 0.025; raw evidence threshold unchanged.</dd></div>
    </dl>}
    <p className="mt-3 text-sm"><b>Initial rejection:</b> {diagnostic.initialFailure||'None; existing selection succeeded'}</p>
    <p className="mt-2 text-sm"><b>Final result:</b> {answer?.evidenceSufficient?'Evidence selected':diagnostic.fallbackReason||answer?.diagnostic?.category||'Selection not run'}</p>
    <details className="mt-3"><summary className="cursor-pointer text-sm font-bold">Queries, candidate scores, catalog and final evidence</summary>
      <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{JSON.stringify({...diagnostic,documentsConsidered:documents||diagnostic.documentsConsidered,finalEvidence:answer?.selectedEvidence?.map(c=>({chunkId:c.chunkId,documentTitle:c.documentTitle,heading:c.heading,content:c.content}))||diagnostic.finalEvidence},null,2)}</pre>
    </details>
  </section>;
}
