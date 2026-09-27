'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './interactionHistory.module.css';

const FEEDBACK = [
  ['all', 'Total Requests'],
  ['helpful', 'Helpful'],
  ['not_helpful', 'Not Helpful'],
  ['no_feedback', 'No Feedback'],
  ['ambiguous', 'Ambiguous'],
];
const ORIGINS = [
  ['all', 'All recorded origins'],
  ['player_interface', 'Ask LWR PC AI'],
  ['manager_test', 'Manager test'],
  ['view_as', 'View As'],
  ['legacy_unknown', 'Legacy / unknown'],
];
const CLASSIFICATIONS = [['none','Player interface'],['manager_console','Manager test'],['automated_test','Automated test'],['all','All classifications']];
const RESULTS = [['all','All completed results'],['answer','Answers'],['insufficient_evidence','Insufficient evidence']];
const INITIAL_FILTERS = { period: '30', feedback: 'all', search: '', origin: 'all', classification: 'none', result: 'all', rule: '' };
const feedbackLabel = value => FEEDBACK.find(([key]) => key === value)?.[1] || 'Not recorded';
const originLabel = value => ORIGINS.find(([key]) => key === value)?.[1] || 'Not recorded';
const date = value => value ? new Date(value).toLocaleString() : 'Not recorded';
const label = value => value ? String(value).replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()) : 'Not recorded';
const timing = value => typeof value === 'number' ? value < 1000 ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ms` : `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} s` : 'Not recorded';

function missingText(row, field) {
  if (row.payloadPurged) return `${field} text is no longer retained.`;
  if (row.redacted) return `${field} text is unavailable under the existing privacy controls.`;
  return `${field} text was not retained with this interaction.`;
}

function FeedbackBadge({ value }) {
  return <span className={styles.badge} data-feedback={value}>{feedbackLabel(value)}</span>;
}

export default function InteractionHistoryPanel({ api }) {
  const [dataset, setDataset] = useState('completed');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [search, setSearch] = useState('');
  const [paging, setPaging] = useState({ cursor: null, previous: [], asof: null });
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const lastFocus = useRef(null);

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    // Clear old rows and counts so a changed filter never labels stale results.
    setData(null);
    (async () => {
      try {
        const result = await api({
          op: dataset === 'completed' ? 'interactions' : 'legacy-interactions', ...filters,
          ...(paging.cursor ? { cursor: paging.cursor } : {}),
          ...(paging.asof ? { asof: paging.asof } : {}),
        });
        if (active) setData(result);
      } catch (e) {
        if (active) setError(e.message || 'Interaction history could not be loaded.');
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, [api, dataset, filters, paging, refresh]);

  function applyFilter(changes) {
    setFilters(current => ({ ...current, ...changes }));
    setPaging({ cursor: null, previous: [], asof: null });
  }
  function changeDataset(next) {
    setDataset(next);
    setPaging({ cursor: null, previous: [], asof: null });
    setSelectedId(null);
  }

  function openDetail(id) {
    lastFocus.current = document.activeElement;
    setSelectedId(id);
  }

  function closeDetail() {
    setSelectedId(null);
    requestAnimationFrame(() => lastFocus.current?.focus());
  }

  const rows = data?.rows || [];
  const pageNumber = paging.previous.length + 1;
  const cards = FEEDBACK.filter(([key]) => key !== 'ambiguous' || data?.summary?.ambiguous > 0 || filters.feedback === 'ambiguous');

  return <section className={styles.panel} aria-labelledby="interaction-history-title">
    <header className={styles.heading}>
      <div><h2 id="interaction-history-title">Recent AI Interactions</h2><p>Completed official-document answers and their later feedback.</p></div>
      <span className={styles.readOnly}>Read-only history</span>
    </header>
    <div className={styles.filters}><label>History view<select aria-label="History view" value={dataset} onChange={event => changeDataset(event.target.value)}><option value="completed">Completed official interactions</option><option value="legacy">Operational / legacy diagnostics</option></select></label></div>
    <div className={styles.cards} aria-label="Filter interaction history by feedback">
      {cards.map(([key, title]) => <button key={key} type="button" aria-pressed={filters.feedback === key} aria-controls="interaction-history-results" onClick={() => applyFilter({ feedback: key })}>
        <span>{title}</span><strong>{data?.summary?.[key === 'all' ? 'total' : key] ?? '—'}</strong>
        <small>{filters.feedback === key ? 'Selected' : 'View interactions'}</small>
      </button>)}
    </div>
    <form className={styles.filters} onSubmit={event => { event.preventDefault(); applyFilter({ search: search.trim() }); }}>
      <label>Date range<select value={filters.period} onChange={event => applyFilter({ period: event.target.value })}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All retained history</option></select></label>
      <label>Feedback<select value={filters.feedback} onChange={event => applyFilter({ feedback: event.target.value })}>{FEEDBACK.map(([key, title]) => <option key={key} value={key}>{key === 'all' ? 'All feedback' : title}</option>)}</select></label>
      {dataset === 'completed' ? <>
        <label>Player or test<select value={filters.classification} onChange={event => applyFilter({ classification: event.target.value })}>{CLASSIFICATIONS.map(([key,title]) => <option key={key} value={key}>{title}</option>)}</select></label>
        <label>Result type<select value={filters.result} onChange={event => applyFilter({ result: event.target.value })}>{RESULTS.map(([key,title]) => <option key={key} value={key}>{title}</option>)}</select></label>
        <label>Rule number<input type="search" maxLength={120} value={filters.rule} placeholder="e.g. 6.2.2" onChange={event => applyFilter({rule:event.target.value.trim()})}/></label>
      </> : <label>Origin<select value={filters.origin} onChange={event => applyFilter({ origin: event.target.value })}>{ORIGINS.map(([key, title]) => <option key={key} value={key}>{title}</option>)}</select></label>}
      <label className={styles.search}>Search questions and answers<input type="search" maxLength={200} value={search} placeholder="Search retained question or answer text" onChange={event => setSearch(event.target.value)} /></label>
      <button type="submit">Search</button>
      {filters.search && <button type="button" onClick={() => { setSearch(''); applyFilter({ search: '' }); }}>Clear search</button>}
    </form>
    <p className={styles.hint}>Counts follow the selected filters. No Feedback means no vote was recorded. Player-interface answers and insufficient-evidence results are shown by default; tests and metadata-only outcomes are available through the filters or diagnostic view.</p>
    <details className={styles.retention}><summary>About retained history and missing text</summary><p>Completed official-document responses are captured when finalized. Operational / legacy diagnostics include older metadata-only requests whose question, answer or user was never retained. Live LMS and eligibility content is not recorded here. No historical data is reconstructed.</p><p>Names are from the current member profile; the stored role describes the role at request time. Response times measure server processing, not browser delivery.</p></details>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div id="interaction-history-results" aria-busy={busy}>
      <div className={styles.resultHeading}><h3>{dataset === 'completed' ? 'Completed official interactions' : 'Operational / legacy outcomes'}</h3><p role="status">{busy ? 'Loading interaction history…' : data ? `${data.total.toLocaleString()} matching ${data.total === 1 ? 'interaction' : 'interactions'} · Page ${pageNumber}${filters.search ? ` · Search: “${filters.search}”` : ''}` : 'History unavailable'}</p></div>
      {!busy && data && rows.length === 0 && <p className={styles.empty}>No retained interactions match these filters.</p>}
      {rows.length > 0 && <div className={styles.tableWrap}><table role="table"><caption className={styles.visuallyHidden}>Recorded AI questions, answers, users and feedback. Open View details for complete retained text and diagnostics.</caption><thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Date &amp; user</th><th role="columnheader" scope="col">Question</th><th role="columnheader" scope="col">AI answer</th><th role="columnheader" scope="col">Feedback</th><th role="columnheader" scope="col">Details</th></tr></thead><tbody role="rowgroup">{rows.map(row => <tr key={row.id} role="row">
        <td role="cell"><time dateTime={row.occurredAt || undefined}>{date(row.occurredAt)}</time>{row.timeBasis === 'first_recorded' && <small>First recorded event</small>}<b className={styles.userName}>{row.userName || (row.userId ? `User ${row.userId}` : 'User not recorded')}</b>{row.userNameBasis === 'current_member_record' && <small>Current member profile</small>}<small>Role: {label(row.userRole)}</small><small>{originLabel(row.origin)}{row.classification && row.classification !== 'none' ? ` · ${label(row.classification)}` : ''}{row.legacy ? ' · Legacy' : ''}</small></td>
        <td role="cell"><p className={styles.preview}>{row.question || missingText(row, 'Question')}</p></td>
        <td role="cell"><p className={styles.preview}>{row.answer || missingText(row, 'Answer')}</p></td>
        <td role="cell"><FeedbackBadge value={row.feedback} /><small>Response: {timing(row.responseMs ?? row.totalMs)}</small></td>
        <td role="cell"><button type="button" onClick={() => openDetail(row.id)} aria-label={`View interaction details from ${date(row.occurredAt)}${row.userName ? ` for ${row.userName}` : ''}`}>View details</button></td>
      </tr>)}</tbody></table></div>}
    </div>
    <div className={styles.pagination} aria-label="Interaction history pagination">
      <button type="button" disabled={busy} onClick={() => { setPaging({ cursor: null, previous: [], asof: null }); setRefresh(value => value + 1); }}>Refresh / first page</button>
      <button type="button" disabled={busy || !paging.previous.length} onClick={() => setPaging(current => ({ cursor: current.previous.at(-1), previous: current.previous.slice(0, -1), asof: data?.asof || current.asof }))}>Previous page</button>
      <button type="button" disabled={busy || !data?.next} onClick={() => setPaging(current => ({ cursor: data.next, previous: [...current.previous, current.cursor], asof: data.asof }))}>Next page</button>
    </div>
    {selectedId && <InteractionDetail key={`${dataset}:${selectedId}`} id={selectedId} dataset={dataset} api={api} close={closeDetail} />}
  </section>;
}

function InteractionDetail({ id, dataset, api, close }) {
  const dialog = useRef(null);
  const [interaction, setInteraction] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await api({ op: dataset === 'completed' ? 'interaction' : 'legacy-interaction', answer: id });
        if (active) setInteraction(result.interaction);
      } catch (e) {
        if (active) setError(e.message || 'Interaction details could not be loaded.');
      }
    })();
    return () => { active = false; };
  }, [api, id, dataset]);

  const d = interaction;
  const context = d?.context || {};
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="interaction-detail-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id="interaction-detail-title">AI interaction detail</h2><button type="button" onClick={close} aria-label="Close interaction detail">Close</button></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!d && !error && <p role="status">Loading complete interaction…</p>}
    {d && <>
      <p className={styles.hint}>{date(d.occurredAt)}{d.timeBasis === 'first_recorded' ? ' · First recorded event' : ' · Request completed'} · {originLabel(d.origin)}{d.legacy ? ' · Legacy record' : ''}</p>
      <section><h3>Question</h3><p className={styles.fullText}>{d.question || missingText(d, 'Question')}</p>{d.effectiveQuestion && d.effectiveQuestion !== d.question && <><h4>Effective question used by AI</h4><p className={styles.fullText}>{d.effectiveQuestion}</p></>}</section>
      <section><h3>AI Answer</h3><p className={styles.fullText}>{d.answer || missingText(d, 'Answer')}</p></section>
      <section><h3>Feedback</h3><FeedbackBadge value={d.feedback} /><p>{d.feedbackAt ? `Latest recorded feedback: ${date(d.feedbackAt)}` : 'No feedback timestamp recorded.'}</p>{d.feedback === 'ambiguous' && <p>Conflicting votes share the latest recorded timestamp. A single Helpful or Not Helpful state cannot be determined.</p>}</section>
      <section><h3>User Context</h3><dl className={styles.context}>
        <div><dt>User</dt><dd>{d.userName || d.userId || 'Not recorded'}{d.userNameBasis === 'current_member_record' && <small>Current member profile linked to the recorded member ID; name at request time was not recorded.</small>}</dd></div>
        <div><dt>Role at request time</dt><dd>{label(d.userRole)}</dd></div>
        <div><dt>LMS page</dt><dd>{context.page || 'Not recorded'}</dd></div>
        <div><dt>League</dt><dd>{context.league || 'Not recorded'}</dd></div>
        <div><dt>Division</dt><dd>{context.division || 'Not recorded'}</dd></div>
        <div><dt>Team</dt><dd>{context.team || 'Not recorded'}</dd></div>
        <div><dt>Origin</dt><dd>{originLabel(d.origin)}</dd></div>
        <div><dt>Result</dt><dd>{label(d.result)}</dd></div>
        <div><dt>Source family</dt><dd>{label(d.sourceFamily)}</dd></div>
        <div><dt>Response time</dt><dd>{timing(d.responseMs ?? d.totalMs)}</dd></div>
        {context.liveIntent && <div><dt>Recorded live intent</dt><dd>{label(context.liveIntent)}</dd></div>}
        {context.resultCode && <div><dt>Recorded context result</dt><dd>{label(context.resultCode)}</dd></div>}
        {context.relationship && <div><dt>Recorded access relationship</dt><dd>{label(context.relationship)}</dd></div>}
        {context.workflow && <div><dt>Recorded workflow</dt><dd>{label(context.workflow)}</dd></div>}
      </dl></section>
      {dataset === 'completed' && <section><h3>Official Sources</h3>{d.sourceRefs?.length ? <ul>{d.sourceRefs.map((source,index) => <li key={index}>{source.citation || [source.documentTitle || 'Official document',source.ruleNumber && `Rule ${source.ruleNumber}`,source.pageNumber && `Page ${source.pageNumber}`].filter(Boolean).join(' · ')}</li>)}</ul> : <p>No official source cited.</p>}</section>}
      <details className={styles.diagnostics}><summary>Diagnostics and retained evidence</summary><dl className={styles.context}><div><dt>Request / answer ID</dt><dd>{d.id}</dd></div><div><dt>LMS version</dt><dd>{d.version || 'Not recorded'}</dd></div><div><dt>Result</dt><dd>{label(d.result)}</dd></div><div><dt>Source family</dt><dd>{label(d.sourceFamily)}</dd></div></dl><p className={styles.hint}>Only existing retained diagnostics are available. Omitted data was not recorded or is no longer retained.</p>{d.diagnostics && Object.keys(d.diagnostics).length > 0 ? <pre>{JSON.stringify(d.diagnostics, null, 2)}</pre> : <p>No additional diagnostics were retained.</p>}</details>
    </>}
  </dialog>;
}
