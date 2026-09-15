'use client';
import { useState } from 'react';

const labels = { total: 'Total rows', matched: 'Matched by DUPR ID', notFound: 'Not found', missingId: 'Missing DUPR ID', ambiguous: 'Duplicate / ambiguous', ready: 'Ready to update', noChange: 'No change', skipped: 'Skipped', invalid: 'Invalid ratings' };
const fields = { doubles: 'DUPR Doubles', rf: 'Reliability Factor', age: 'Age-based DUPR', ageSource: 'Age metric', ageMissing: 'Age metric absent in file', rfMissing: 'RF absent in file', doublesMissing: 'Doubles absent in file' };
export default function RatingsImportPreview({ preview, busy, onImport }) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(preview.rows.length / 50);
  const current = Math.min(page, Math.max(0, pages - 1));
  return <section className="mt-4 rounded-xl border border-blue-200 bg-white p-4" aria-label="Source ratings preview">
    <h3 className="text-lg font-bold">Source ratings — {preview.season.name}</h3>
    <p className="mt-2 text-sm">Current source information only. Season DUPR, PrimeTime Season DUPR, season RF and member details are preserved. Clean Ratings is not run.</p>
    <dl className="my-4 grid grid-cols-2 gap-3 md:grid-cols-3">
      {Object.entries(labels).map(([key, label]) => <div key={key}><dt className="text-sm text-slate-600">{label}</dt><dd className="font-bold">{preview.counts[key]}</dd></div>)}
    </dl>
    <p className="text-sm">Matched is an identity count. Ready, no change, skipped and invalid are the action totals. Protected season fields are excluded from every update.</p>
    {preview.receipt && preview.counts.ready > 0 ? <button type="button" disabled={busy} onClick={onImport} className="my-4 rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Importing…' : 'Import Matched Ratings'}</button> : <p className="my-4 font-semibold">{preview.committed ? 'Source import completed. Season ratings were preserved.' : 'No confirmed import is available. Review the row reasons or select a CSV again.'}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="bg-slate-900 text-white"><tr>{['CSV line', 'Action', 'LMS member / CSV reference', 'DUPR ID', 'Source Reliability Factor', 'Exact source changes', 'Reason'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
      <tbody>{preview.rows.slice(current * 50, (current + 1) * 50).map(row => <tr key={row.line} className="border-b border-slate-200">
        <td className="p-3">{row.line}</td><td className="p-3 font-bold">{row.action}</td><td className="p-3">{row.name}</td><td className="p-3">{row.duprId || 'Missing'}</td>
        <td className="p-3">{row.sourceRf ?? 'Not supplied'}<div className="text-xs text-slate-500">Source only; no season reclassification</div></td>
        <td className="p-3">{row.changes.length ? row.changes.map(c => <div key={c.field}>{fields[c.field] || c.field}: {String(c.before ?? 'blank')} → {String(c.after)}</div>) : 'None'}</td><td className="p-3">{row.reason}{row.protectedRatings && <div className="mt-2 text-xs text-slate-600">Preserved season values: DUPR {row.protectedRatings.seasonDupr ?? 'blank'}; PrimeTime {row.protectedRatings.primetime == null ? 'blank' : Number(Number(row.protectedRatings.primetime).toFixed(3))}; RF {row.protectedRatings.rf ?? 'blank'}.</div>}</td>
      </tr>)}</tbody>
    </table></div>
    <div className="mt-3 flex items-center gap-4"><button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button><span>Page {current + 1} of {pages}</span><button type="button" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button></div>
  </section>;
}
