export const IMPORT_POLICY = 'source-only-v1';
export const MAX_IMPORT_ROWS = 5000;
export const MAX_CSV_BYTES = 2 * 1024 * 1024;
const header = value => value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
export const normalizeDuprId = value => String(value ?? '').trim().toUpperCase();

export function parseRatingsCsv(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_CSV_BYTES) throw Error('CSV exceeds 2 MiB.');
  text = text.replace(/^\uFEFF/, '');
  const records = []; let record = [], cell = '', quoted = false, closed = false;
  const pushCell = () => { record.push(cell); cell = ''; closed = false; };
  const pushRow = () => { pushCell(); if (record.some(v => v.trim())) records.push(record); record = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else cell += c;
    } else if (c === ',') pushCell();
    else if (c === '\r' || c === '\n') { if (c === '\r' && text[i + 1] === '\n') i++; pushRow(); }
    else if (c === '"' && !cell && !closed) quoted = true;
    else { if (closed || c === '"') throw Error('Malformed CSV quoting.'); cell += c; }
  }
  if (quoted) throw Error('Unclosed CSV quote.');
  if (cell || record.length) pushRow();
  const rawHeaders = records.shift();
  const headers = rawHeaders?.map(header);
  if (!headers?.includes('duprid')) throw Error('CSV requires duprId.');
  if (new Set(headers.filter(Boolean)).size !== headers.filter(Boolean).length) throw Error('Duplicate CSV headers.');
  if (!records.length || records.length > MAX_IMPORT_ROWS) throw Error('Choose a CSV with 1–5,000 rows.');
  return records.map((values, index) => {
    // DUPR exports may append empty header columns but omit them from data rows.
    // Only pad omitted, literally empty trailing headers; never a named field.
    if (values.length < headers.length && rawHeaders.slice(values.length).every(value => !value.trim())) {
      values = [...values, ...Array(headers.length - values.length).fill('')];
    }
    if (values.length !== headers.length) throw Error(`CSV row ${index + 2} has the wrong number of fields.`);
    const row = {};
    headers.forEach((key, i) => { if (key) row[key] = values[i].trim(); else if (values[i].trim()) throw Error('Unnamed nonempty CSV column.'); });
    return { ...row, line: index + 2, duprid: normalizeDuprId(row.duprid) };
  });
}

function number(value, label, min, max) {
  if (!/^\d+(?:\.\d{1,3})?$/.test(String(value)) || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) throw Error(`${label} must be a decimal from ${min} to ${max}, with at most 3 decimal places.`);
  return Number(value);
}

export function ratingSource(row) {
  const patch = {}; const notes = [];
  if (row.doubles) patch.doubles = row.doubles.toUpperCase() === 'NR' ? 'NR' : number(row.doubles, 'Doubles', 2, 8).toFixed(3);
  const rf = Object.hasOwn(row, 'doublesreliability') ? row.doublesreliability : row.doublesre;
  if (row.doublesreliability && row.doublesre && number(row.doublesreliability, 'RF', 0, 100) !== number(row.doublesre, 'RF alias', 0, 100)) throw Error('Reliability columns disagree.');
  if (rf) patch.rf = number(rf, 'RF', 0, 100);
  let metrics = null;
  if (row.metrics) { try { metrics = JSON.parse(row.metrics); } catch { throw Error('Metrics must be valid JSON.'); } }
  for (const object of [metrics, metrics?.subscores, metrics?.subscores?.doubles]) {
    if (object != null && (typeof object !== 'object' || Array.isArray(object))) throw Error('Metrics has an invalid object structure.');
  }
  const subscores = metrics?.subscores?.doubles;
  for (const key of ['over_65', 'over_50']) {
    const value = subscores?.[key];
    if (value === null || value === undefined || value === '') continue;
    patch.age = number(value, key, 2, 8); patch.ageSource = key; break;
  }
  patch.ageMissing = patch.age === undefined;
  patch.rfMissing = patch.rf === undefined;
  patch.doublesMissing = patch.doubles === undefined;
  if (patch.ageMissing) notes.push('No applicable age metric; previous source age preserved.');
  if (patch.rfMissing) notes.push('RF absent; previous source RF preserved.');
  return { patch, notes, usable: ['doubles', 'rf', 'age'].some(key => Object.hasOwn(patch, key)) };
}

export function buildRatingsPreview(rows, snapshot) {
  const counts = { total: rows.length, matched: 0, notFound: 0, missingId: 0, ambiguous: 0, ready: 0, noChange: 0, skipped: 0, invalid: 0, locked: 0 };
  const frequency = new Map(); rows.forEach(r => frequency.set(r.duprid, (frequency.get(r.duprid) || 0) + 1));
  const byId = new Map();
  for (const m of snapshot.members) { const key = normalizeDuprId(m.dupr_id); byId.set(key, [...(byId.get(key) || []), m]); }
  const updates = [];
  const preview = rows.map(row => {
    const result = { line: row.line, duprId: row.duprid, name: row.name || '', action: 'SKIP', reason: '', changes: [], sourceRf: null };
    if (!row.duprid) { counts.missingId++; result.reason = 'Missing DUPR ID.'; }
    else if (frequency.get(row.duprid) > 1 || (byId.get(row.duprid)?.length || 0) > 1) { counts.ambiguous++; result.reason = 'Duplicate source DUPR ID or ambiguous LMS identity.'; }
    else if (!byId.has(row.duprid)) { counts.notFound++; result.reason = 'DUPR ID not found in LMS.'; }
    else {
      counts.matched++;
      const member = byId.get(row.duprid)[0]; result.name = member.name; result.protectedRatings = member.seasonRatings;
      if (member.is_active_member === false) result.reason = 'Inactive LMS member; excluded.';
      else {
        try {
          const { patch, notes, usable } = ratingSource(row);
          const before = member.source?.data || {}; const after = { ...before, ...patch };
          result.sourceRf = patch.rfMissing ? null : patch.rf;
          result.changes = Object.keys(patch).filter(k => before[k] !== after[k]).map(field => ({ field, before: before[field] ?? null, after: after[field] }));
          if (!usable || !result.changes.length) { result.action = 'NO CHANGE'; result.reason = 'No new usable source values.'; counts.noChange++; }
          else {
            result.action = 'UPDATE'; counts.ready++;
            result.reason = ['Refresh source only; season values preserved.', ...notes].join(' ');
            updates.push({ line: row.line, duprId: row.duprid, memberId: member.id, expectedRevision: member.source?.revision || 0, data: after });
          }
        } catch (error) { result.action = 'INVALID'; result.reason = error.message; counts.invalid++; }
      }
    }
    if (result.action === 'SKIP') counts.skipped++;
    return result;
  });
  return { rows: preview, counts, updates, season: snapshot.season, policy: IMPORT_POLICY };
}
