import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

export const interactionHistoryMigration = 'supabase/migrations/20260919105119_ai_feedback_question_history.sql';
const readSql = name => readFile(new URL(`../../${name}`, import.meta.url), 'utf8');

// Isolated PostgreSQL fixtures only. No environment credentials or network calls.
export async function createInteractionHistoryFixture({ seed = true, now = new Date() } = {}) {
  const db = new PGlite();
  const stamp = offset => new Date(now.getTime() + offset).toISOString();
  const day = 86400000;
  const actor = randomUUID(), member = randomUUID();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create table public.members(id uuid primary key, first_name text, last_name text, full_name text, email text);
    grant usage on schema public, auth to service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
    grant select on public.members to service_role;
  `);
  await db.query('insert into auth.users values($1)', [actor]);
  await db.query('insert into public.members values($1,$2,$3,$4,$5)', [member, 'Synthetic', 'Reviewer', null, 'never-display@example.invalid']);
  await db.exec(await readSql('supabase-ai-assistant-lms-0712-stage6.sql'));
  await db.exec(await readSql('supabase-ai-assistant-lms-0716-stage7a.sql'));
  await db.exec(await readSql('supabase-ai-assistant-lms-0718-stage7b.sql'));
  await db.exec(`
    alter table public.ai_request_outcomes drop constraint ai_request_outcomes_source_family_check;
    alter table public.ai_request_outcomes add constraint ai_request_outcomes_source_family_check
      check(source_family in ('lwr','usap','mixed','none','unknown','LIVE_LMS_DATA'));
    alter table public.ai_request_outcomes drop constraint ai_request_outcomes_origin_check;
    alter table public.ai_request_outcomes add constraint ai_request_outcomes_origin_check
      check(origin in ('player_interface','manager_test','view_as'));
    create schema ai_live_private;
    revoke all on schema ai_live_private from public, anon, authenticated;
    grant usage on schema ai_live_private to service_role;
  `);
  const liveMigration = await readSql('supabase/migrations/20260907110701_lms0723_live_intelligence.sql');
  const liveFeedbackSchema = liveMigration.slice(liveMigration.indexOf('create table if not exists ai_live_private.feedback ('), liveMigration.indexOf('alter table ai_live_private.attempts enable'));
  await db.exec(liveFeedbackSchema);
  await db.exec(`
    alter table ai_live_private.feedback enable row level security;
    revoke all on ai_live_private.feedback from public, anon, authenticated, service_role;
    grant select, insert on ai_live_private.feedback to service_role;
  `);
  const snapshotTables = async () => JSON.stringify((await db.query(`
    select n.nspname, c.relname, c.relacl::text, c.relrowsecurity,
      (select jsonb_agg(jsonb_build_array(a.attname,a.atttypid,a.attnotnull) order by a.attnum)
       from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped) columns,
      (select jsonb_agg(pg_get_indexdef(i.indexrelid) order by i.indexrelid)
       from pg_index i where i.indrelid=c.oid) indexes
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r' and n.nspname in ('public','ai_live_private') order by n.nspname,c.relname
  `)).rows);
  const tablesBefore = await snapshotTables();
  const migration = await readSql(interactionHistoryMigration);
  await db.exec(migration);

  const addOutcome = async ({ id = randomUUID(), at = stamp(-day), recordedAt = at, origin = 'player_interface', kind = 'answer', source = 'lwr', diagnostic = {}, totalMs = 125, eligible = kind === 'answer' } = {}) => {
    await db.query(`insert into public.ai_request_outcomes
      (id,request_started_at,completed_at,recorded_at,origin,final_kind,assistant_version,feedback_eligible,
       source_family,selected_evidence_count,stage3_invoked,diagnostic_snapshot,total_ms)
      values($1,$2::timestamptz-interval '125 milliseconds',$2,$3,$4,$5,'LMS-FIXTURE',$6,$7,0,false,$8,$9)`,
    [id, at, recordedAt, origin, kind, eligible, source, diagnostic, totalMs]);
    return id;
  };
  const addVote = async (answerId, { id = randomUUID(), helpful = true, at = stamp(-day + 1000), question = 'What ball is used?', answer = 'Use the Franklin X-40 outdoor ball.', memberId = member, effective = question, selection = { selectedEvidence: [] }, sources = [] } = {}) => {
    await db.query(`insert into public.ai_answer_feedback_events
      (id,answer_id,auth_user_id,member_id,helpful,original_question,effective_question,generated_answer,source_snapshot,selection_snapshot,assistant_version,created_at)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'LMS-FIXTURE',$11)`,
    [id, answerId, actor, memberId, helpful, question, effective, answer, sources, selection, at]);
    return id;
  };
  const addLiveVote = async (answerId, { id = randomUUID(), helpful = true, at = stamp(-day + 1000), origin = 'player_interface' } = {}) => {
    await db.query(`insert into ai_live_private.feedback
      (id,answer_id,actor,intent,result_code,relationship,origin,helpful,assistant_version,at)
      values($1,$2,$3,'SELF_TEAM','success','self',$4,$5,'LMS-0723',$6)`, [id, answerId, actor, origin, helpful, at]);
    return id;
  };
  const addOccurrence = async (answerId, { at = stamp(-day), recordedAt = at, completedAt = null, question = 'Unanswered retained question?', output = 'No applicable official evidence.', kind = 'insufficient_evidence', redacted = false, purged = false, origin = 'player_interface', parent = true, selection = {}, resolver = {}, sources = [] } = {}) => {
    const group = randomUUID();
    await db.query(`insert into public.ai_question_groups(id,origin,family,title,first_seen_at,last_seen_at)
      values($1,$2,$3,'Synthetic review group',$4,$4)`, [group, origin, kind === 'insufficient_evidence' ? 'unanswered' : kind, at]);
    await db.query(`insert into public.ai_review_occurrences
      (answer_id,outcome_id,group_id,provenance,origin,occurrence_kind,first_observed_at,recorded_at,
       original_question,effective_question,output_text,assistant_version,redaction_applied,payload_purged_at,selection_snapshot,resolver_snapshot,source_snapshot,answer_completed_at)
      values($1,$2,$3,'live_capture',$4,$5,$6,$7,$8,$8,$9,'LMS-FIXTURE',$10,$11,$12,$13,$14,$15)`,
    [answerId, parent ? answerId : null, group, origin, kind, at, recordedAt, question, output, redacted, purged ? at : null, selection, resolver, sources, completedAt]);
    return group;
  };

  const ids = { actor, member };
  if (seed) {
    ids.helpful = await addOutcome({ at: stamp(-2 * day), diagnostic: { candidateCount: 4, configurationVersion: 'LMS-FIXTURE', rawAuthorization: 'never-display' } });
    await addVote(ids.helpful, { at: stamp(-2 * day + 1000), question: 'Which ball should we use?', answer: 'Use the Franklin X-40 outdoor ball.' });
    ids.flipped = await addOutcome({ at: stamp(-3 * day) });
    await addVote(ids.flipped, { at: stamp(-3 * day + 1000), helpful: true, question: 'Can I volley in the kitchen?', answer: 'A volley in the non-volley zone is a fault.' });
    await addVote(ids.flipped, { at: stamp(-3 * day + 2000), helpful: false, question: 'Can I volley in the kitchen?', answer: 'A volley in the non-volley zone is a fault.' });
    ids.ambiguous = await addOutcome({ at: stamp(-4 * day) });
    await addVote(ids.ambiguous, { at: stamp(-4 * day + 1000), helpful: true });
    await addVote(ids.ambiguous, { at: stamp(-4 * day + 1000), helpful: false });
    ids.unvoted = await addOutcome({ at: stamp(-5 * day) });
    ids.exception = await addOutcome({ at: stamp(-6 * day), kind: 'insufficient_evidence' });
    await addOccurrence(ids.exception, { at: stamp(-6 * day), question: 'What is the missing scheduling procedure?', output: 'This procedure is not present in retained official evidence.' });
    ids.live = await addOutcome({ at: stamp(-7 * day), source: 'LIVE_LMS_DATA', diagnostic: { liveIntent: 'SELF_TEAM', relationship: 'self', resultCode: 'success', target: 'never-display' } });
    await addLiveVote(ids.live, { at: stamp(-7 * day + 1000), helpful: false });
    ids.liveUnvoted = await addOutcome({ at: stamp(-8 * day), source: 'LIVE_LMS_DATA', diagnostic: { liveIntent: 'SELF_TEAM', relationship: 'self' } });
    ids.legacy = randomUUID();
    await addVote(ids.legacy, { at: stamp(-40 * day), question: 'Legacy retained question?', answer: 'Legacy complete answer.' });
    ids.orphanOccurrence = randomUUID();
    await addOccurrence(ids.orphanOccurrence, { at: stamp(-41 * day), question: 'Orphan retained question?', parent: false });
    ids.manager = await addOutcome({ at: stamp(-day), origin: 'manager_test' });
    ids.viewAs = await addOutcome({ at: stamp(-day), origin: 'view_as' });
    ids.redacted = await addOutcome({ at: stamp(-9 * day) });
    await addVote(ids.redacted, { at: stamp(-9 * day + 1000), question: 'private retained legacy text', answer: 'private legacy answer' });
    await addOccurrence(ids.redacted, { at: stamp(-9 * day), question: '[detail omitted for privacy]', output: null, kind: 'grounded_feedback', redacted: true });
    ids.purged = await addOutcome({ at: stamp(-10 * day) });
    await addVote(ids.purged, { at: stamp(-10 * day + 1000), question: 'expired legacy text', answer: 'expired legacy answer' });
    await addOccurrence(ids.purged, { at: stamp(-10 * day), question: '[detail expired]', output: null, kind: 'grounded_feedback', purged: true });
    ids.long = await addOutcome({ at: stamp(-11 * day) });
    ids.longQuestion = 'Question start ' + 'complete retained wording '.repeat(30) + 'Question end';
    ids.longAnswer = 'Answer start ' + 'complete retained response '.repeat(150) + 'Answer end';
    await addVote(ids.long, { at: stamp(-11 * day + 1000), question: ids.longQuestion, answer: ids.longAnswer });
    ids.pagination = [];
    for (let i = 0; i < 31; i++) ids.pagination.push(await addOutcome({ at: stamp(-12 * day) }));
  }
  const filters = { from: null, to: now.toISOString(), asof: now.toISOString(), origin: 'all', feedback: 'all', search: '', limit: 25 };
  return { db, ids, filters, addOutcome, addVote, addOccurrence, addLiveVote, snapshotTables, tablesBefore, migration };
}
