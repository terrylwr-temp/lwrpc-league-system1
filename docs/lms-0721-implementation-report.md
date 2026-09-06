# LMS-0721 / 0.1.543 — Approved LWR Answers / Managed Knowledge

Date: 2026-09-06. **Implemented locally; stop for review. Not deployed or production accepted.** Production remains accepted LMS-0720 / 0.1.542. Stages 1–6 and Stage 7A/B remain accepted.

## Approved clarification and original stop

The initial readiness check proved that existing Stage 7 cannot attach an automatic conflict occurrence to a grounded answer: the snapshot helper emits no exception and the capture RPC rejects it with `quality_occurrence_outcome`. The owner explicitly approved a metadata-only Authority Warning workflow instead. This resolves the earlier design stop; it does not change the meaning of Stage 7 outcomes.

When directly applicable formal LWR evidence and an Active managed revision meaningfully disagree, the formal evidence governs, the player receives a grounded answer and its normal feedback controls, and the managed revision is excluded from governing citations. A bounded warning in the existing outcome diagnostic identifies exact approved revision and formal document/version/chunk, scope and a fixed discrepancy reason. It contains no raw question/answer, member identity, notes, embedding or signed URL.

The manager Approved Answers tab shows Authority Warnings separately from Not Helpful, Unanswered and Conflict. It links the implicated revision and formal passage; revision detail supplies Retest and linked review-case navigation. There is no hide-warning button. Replacement or retirement removes the old Active revision from current warning visibility; historical outcomes, feedback and revisions are preserved. Corrected or retired knowledge produces no warning on subsequent evaluation. Ordinary complementary evidence does not itself produce a warning. No automatic occurrence/case/vote is fabricated.

## Implemented workflow

- Create from an unresolved, unmerged, genuine unanswered review case. A prior linked item blocks duplicate creation. Independent active-LWR source review is separate from the player Stage 4 selector. Direct answering evidence blocks creation/activation; similar evidence requires a recorded missing-policy distinction. The website Rule 1.1 control independently detects the existing official answer.
- Draft editor validates title, policy key, canonical question, static approved answer, league/season/date scope, optional trusted source and up to three structured official public links. Explicit static-policy confirmation is required. Saving does not activate, embed, retest or resolve the case.
- Activation review binds the saved Draft version/hash, formal authority manifest and managed-knowledge manifest in an expiring user-bound server ticket. Unsaved changes disable activation. A second explicit confirmation is required.
- Activation generates the exact revision embedding outside SQL locks, validates model/dimensions/nonzero finite vector, checks authority/duplicates again, then atomically stores publication metadata and retires any predecessor. SQL serializes managed mutations, rechecks manifests under locks, validates dates/overlaps, and appends audit. Failed activation leaves Draft/old Active intact.
- Editing a published revision creates a new Draft. Published content is not overwritten. Replacement and retirement retain the historical text, source identity, timestamps and audit. Retirement needs a reason. Case resolution remains a separate manager action.
- Search, scope and publication filters operate over the most recent 300 revisions. Detail includes exact revision history, bounded before/after audit, actual activation time, Activated By where resolved, related formal source, and linked case. Manager times use the device timezone; eligibility dates use the club's America/New_York calendar.
- Active rows display Scheduled, Expired or Needs authority revalidation where applicable. These are derived eligibility labels, not additional statuses.
- Player citations explicitly identify an Approved Answer and exact immutable revision. The authenticated, user-bound encrypted citation viewer renders approved plain text and separately validated public links. Historical Retired citations remain viewable and marked historical; Drafts cannot be viewed through this path. Existing PDF viewers and historical PDF sources remain intact.
- Feedback, conversation receipts and Stage 7 snapshots retain a backward-compatible tagged approved source identity; no fake PDF IDs. Approved sources remain in the existing LWR family. Existing feedback correlation, HMAC, grouping, capture SQL and metric definitions are unchanged.
- Test AI Assistant displays bounded managed-search timing/call diagnostics and Authority Warnings. Manager tests retain their existing origin separation.

## Retrieval and authority bounds

The original accepted question embedding is reused for one managed RPC, with a 500 ms JavaScript deadline/abort and 450 ms database statement timeout, at most four candidates and four total selected sources. No extra query embedding or classification-model call is introduced. The existing PDF Stage 3 RPC, 32/8/12 candidate windows, PDF threshold, interpretation-assisted retrieval and equipment handoff remain unchanged.

Formal selected evidence retains priority. Managed knowledge can complement a selected LWR passage only through its matching trusted related-source identity, or fill an unsupported administrative issue. It cannot stand alone to invent a rules-of-play exception when formal recall is absent. Date, league and season checks reject ineligible revisions; changed formal manifests invalidate managed eligibility until reviewed through a new revision. Ambiguous near-tied different policies abstain; a detected material same-authority contradiction uses the existing conflict response. The answer model is not asked to arbitrate policy conflicts.

Generation remains the existing single grounded model call. Only when managed evidence is selected, its strict response schema also requires a support flag; lack of direct support returns the existing insufficient-evidence fallback. Eligibility is rechecked after generation to catch retirement/replacement races. Managed lookup failures do not suppress an otherwise grounded PDF answer.

### Measured calibration and limits

Ten embedding calls used only synthetic local administrative-policy representations/questions with the configured `text-embedding-3-small`, 1,536 dimensions. No database knowledge or document embeddings were written. No external answer-generation call was made for these tests.

The initial .82 provisional gate rejected real paraphrases. Measured positives ranged .6639–.7352. A different match-score question scored .3849; an unsupported duration question .6494. Saturday/weekend variants scored about .799 against a Sunday policy, demonstrating that similarity alone is unsafe. The managed minimum is .65 together with explicit day/weekend, numeric, duration, date/scope/season and selected-evidence support controls. Measured fixtures retain scores and synthetic texts, not vectors or credentials.

This eight-question sample is a bounded calibration, not proof of arbitrary semantic consistency or comprehensive recall. Conservative aligned-statement discrepancy checks recognize opposing permissions or different values in otherwise matching statements; they do not claim to understand every free-text contradiction. Human source review remains mandatory. Unknown or indirect applicability can still require manager review/abstention. Production acceptance must include the actual approved policy's paraphrases and adjacent negatives.

## Migration and security

New migration:

`lwrpc-admin/supabase/migrations/20260906152030_lms0721_approved_answers.sql`

Created through the Supabase CLI. It adds:

1. `ai_approved_answers` — item and unique originating case linkage.
2. `ai_approved_answer_revisions` — immutable published revision content, eligibility, vector/hash and lifecycle metadata.
3. `ai_approved_answer_events` — append-only before/after lifecycle and linkage audit.

The canonical-question limit remains 2,400 characters; approved prose is limited to 6,000 characters. Complete public revision content is bounded to 32 KiB UTF-8 bytes, rejected rather than truncated; audit snapshots have a separate 96 KiB bound. Partial unique indexes allow at most one Active and one Draft per item. Restrictive foreign keys preserve history.

All three tables enable RLS. Explicit revokes remove default/inherited PUBLIC, anon, authenticated and service-role table privileges; only service-role SELECT is restored. Mutations use the restricted audited SECURITY DEFINER action function, fixed search path, qualified objects and trusted actor-role revalidation. Browser roles have neither direct table access nor new RPC execution. Service role cannot directly insert/update/delete/truncate any new table. New manifest/search/source-review RPCs are service-only. No project-wide default privileges are changed.

The only existing schema/function compatibility change is the explicitly approved `approved_lwr_answer` review action category, added to the case CHECK and the otherwise preserved existing `ai_review_case_action` validation. Its ACL is preserved. Existing feedback/capture functions and document tables/privileges are not changed.

Isolated PGlite with pgvector ran the real 0712/0716/0718 prerequisites and 0721 migration under production-like default grants. Tests exercised actual denied/permitted operations, RLS, all five new RPC ACLs, existing feedback/capture/review ACL preservation, replay, unauthorized actor rejection, failed-vector rollback, Draft/Retired search exclusion, atomic replacement and audit. This is local PostgreSQL-compatible validation, not a claim of production migration verification.

## Validation

- `npm test`: **446 passed**, including the 430-test accepted baseline and 16 new tests/subtests.
- `npm run lint`: passed, zero errors; six existing warnings in captain/player code.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed.
- `npm run build`: compilation succeeded; the known Windows `.next/cache/.tsbuildinfo` EPERM prevented the normal build from completing.
- Isolated clean production build: passed compilation, TypeScript, all **74** static pages and final optimization.
- `git diff --check`: passed.

An initial build invocation wrote its log inside .next and hit an EBUSY log-file cleanup lock before compilation. The log was relocated and the normal build rerun. A temporary preview's stale generated type was removed before the successful explicit type check. Neither was treated as an application compilation defect.

Real manager components were exercised with a temporary, local, synthetic request adapter at desktop 1280×900 and mobile 390×844. Draft → explicit activation → Edit as New Draft → save → replacement → retirement passed. Revision history and warning removal were observed; activation was disabled for unsaved edits. Mobile dialog matched 390×844, owned its scroll, and retained a 44 px close target. Escape closed it and restored body scrolling; desktop and mobile had no document overflow or browser errors. The preview route and calibration runner were removed. These checks used no production knowledge mutations; the global application shell made its usual read-only system-settings request.

The model-generation tests use controlled responses and production-format formal Rule 3.5 evidence. They verify formal-rule priority, normal feedback eligibility, metadata-only warning and no automatic Stage 7 occurrence; correction/retirement leaves historical observations intact. Exact approved viewer identity/user binding and fail-open generation races are covered. Real owner-policy/model/database acceptance remains a separate deployment gate.

## Exact files

See the file list appended below. The pre-existing LMS-0720 acceptance-document edits were preserved; they are not an LMS-0721 functional change. No player dashboard/layout file was edited. The only dependency addition is pinned development-only `@electric-sql/pglite-pgvector@0.0.9` for actual vector SQL tests.

## Controlled deployment and production acceptance — not executed

1. Review and approve this implementation/migration. Retain the accepted LMS-0720 production baseline until authorized deployment.
2. Read-only preflight the correct production project: three-table/five-function name collisions, existing case constraint/function, vector extension schema and current role/default grants. Preserve hashes/ACLs of existing feedback/capture/document objects.
3. Apply only the reviewed 0721 migration once, in the established production process, after the accepted Stage 7 migrations. Do not run a blanket CLI database push against this repository's historical SQL files. Verify resulting constraints, indexes, FKs, RLS, effective table/RPC privileges and unchanged existing ACLs.
4. Verify server-only existing embedding/model/service configuration without printing secrets. No HMAC rotation or corpus processing is needed. Deploy 0.1.543 through the normal production pipeline only after database/security validation passes.
5. Use a genuine owner-approved missing administrative policy, reviewed against active official sources. Website, kitchen/NVZ, tungsten and live/personal questions are not acceptance knowledge. Do not fabricate a live club policy for testing.
6. From its genuine unanswered case: precheck → Draft → confirm not retrievable/no embedding → explicit activation → verify authoritative activation actor/time. Test canonical wording, natural paraphrases, adjacent negatives and protected requests; inspect managed query/call/latency diagnostics and player citation/viewer.
7. Exercise Helpful/Not Helpful with same-answer exact revision correlation. Verify Stage 7 family/origin and unchanged player feedback semantics. Resolve the case separately only after retest.
8. Create replacement Draft, prove original Active still answers, activate replacement, then open the original historical citation/review snapshot. Retire replacement, prove new retrieval excludes it and historical viewing still works. Retain audit; do not delete published history to clean up.
9. Use isolated fixtures for intentionally contradictory authority scenarios. If a real runtime warning occurs, formal evidence must govern, managers must see it separately, and no fake occurrence/case/metric may be produced.
10. Confirm hosting capture logs, bounded latency/fail-open behavior, role authorization and accepted LMS-0720 regression controls. Stop on unexpected schema/security or answer behavior before making extra changes.

## Deferred and unchanged

AI Source Management document activation history remains separately approved future work: current document schema/audit does not authoritatively retain activation time/user. Created/uploaded/processed/updated timestamps cannot substitute; historical versions must say activation time not recorded unless independent records prove it. Approved Answer revisions do retain their own actual activation timestamps/actors now.

Website Rule 1.1 Stage 4 selection, kitchen/NVZ and Live LMS Intelligence remain deferred. No document/corpus processing, existing document embedding regeneration, active PDF version, HMAC configuration, production SQL or deployment was changed. No LMS-0722 work started.

### LMS-0721 file list

- `docs/lms-0721-approved-answers-design.md`
- `docs/lms-0721-implementation-report.md`
- `docs/project-roadmap.md`
- `lwrpc-admin/app/ai-assistant/console/page.js`
- `lwrpc-admin/app/ai-assistant/review/ApprovedAnswersPanel.js`
- `lwrpc-admin/app/ai-assistant/review/approved.module.css`
- `lwrpc-admin/app/ai-assistant/review/page.js`
- `lwrpc-admin/app/api/ai-assistant/answer/route.js`
- `lwrpc-admin/app/api/ai-assistant/approved-answers/route.js`
- `lwrpc-admin/app/api/approved-answer-viewer/route.js`
- `lwrpc-admin/app/approved-answer/[citation]/page.js`
- `lwrpc-admin/app/lib/aiAnswerGeneration.js`
- `lwrpc-admin/app/lib/aiApprovedAnswerViewer.js`
- `lwrpc-admin/app/lib/aiApprovedAnswersSelection.js`
- `lwrpc-admin/app/lib/aiApprovedAnswersService.js`
- `lwrpc-admin/app/lib/aiApprovedAnswersShared.js`
- `lwrpc-admin/app/lib/aiConversation.js`
- `lwrpc-admin/app/lib/aiOfficialDocumentViewer.js`
- `lwrpc-admin/app/lib/aiQualitySnapshots.js`
- `lwrpc-admin/app/lib/aiRetrieval.js`
- `lwrpc-admin/app/lib/aiReviewService.js`
- `lwrpc-admin/app/lib/aiReviewShared.js`
- `lwrpc-admin/app/lib/askLwrPlayerAnswer.js`
- `lwrpc-admin/app/lib/version.js`
- `lwrpc-admin/package-lock.json`
- `lwrpc-admin/package.json`
- `lwrpc-admin/supabase/migrations/20260906152030_lms0721_approved_answers.sql`
- `lwrpc-admin/test/aiApprovedAnswers.test.mjs`
- `lwrpc-admin/test/aiApprovedAnswersDatabase.test.mjs`
- `lwrpc-admin/test/aiApprovedAnswersIntegration.test.mjs`
- `lwrpc-admin/test/aiApprovedAnswersService.test.mjs`
- `lwrpc-admin/test/fixtures/lms0721-managed-calibration.json`
- `lwrpc-admin/test/lms0720AssistedRetrieval.test.mjs`

The pre-existing `docs/lms-0720-implementation-report.md` acceptance edits remain preserved separately.

## Controlled production preflight — stopped before mutation (2026-09-06)

The owner authorized deployment/acceptance in the attached controlled sequence. Read-only preflight confirmed the correct **LWR PC League Management** Supabase project and the production domain's READY deployment `dpl_3EzLNxGmr12RDGuJJqVZnwfquxUB`, commit `9263f83257d11bae2b60656a075fc46c2c039644` (accepted LMS-0720 / 0.1.542).

**Stop condition triggered: unexplained corpus state difference from the recorded accepted baseline.** The LMS-0720 final acceptance record reports 7 documents, 19 versions and 1,507 chunks. Current production has 7 documents, **20 versions and 1,581 chunks**: one additional version and 74 additional chunks. This does not establish corruption or an LMS-0721 regression; it could be a legitimate intervening owner document update. Its authorization/provenance has not been established, so it was not silently adopted as a new baseline.

No migration was applied, no commit/push/deployment occurred, and no production acceptance questions, feedback, Drafts, activations, revisions, retirements or case actions were submitted. No code or schema correction was made. Only read-only preflight and local reporting occurred.

### Read-only findings retained

- Supabase project `glikrmmgirilnmamxxyl`: expected project, ACTIVE_HEALTHY, PostgreSQL 17.
- Live Vercel project: `lwrpc-admin`; accepted main/Git deployment unchanged.
- Existing AI tables retain RLS and their expected role ACL patterns. Stage 7 outcomes/audit retain service-role SELECT/INSERT; mutable grouping/review tables retain their bounded existing privileges.
- Existing capture, case-action, document activation and Stage 3 retrieval functions are present with restricted service-role execution. The case category CHECK has the expected pre-0721 categories.
- No new Approved Answer tables were observed; all five proposed function names have zero collisions.
- HMAC route key versions: `[1]`. No secret/environment value was read or changed.
- Current feedback: 16 events; outcomes: 100. These are a new read-only checkpoint, not a claim that all historical rows have been compared against the earlier acceptance checkpoint.
- Seven documents are Active. Full-row hashes were recorded for future same-query comparison: documents `0fe745ff877528865886f1d1dd132154`; versions `f9e16952cbcfd1e15ccb456365e978ad`; chunks including vectors `3e2c7d5c4b57e8ae165238d020ce1c19`; feedback `cb2a34ba555949c2631fb02a8febf1d5`; outcomes `0c06f89817afe97ffb8045850456e76f`. These use ordered MD5s of JSONB full rows and must not be compared directly to older hashes generated by different queries.

One initial read-only snapshot query used an incorrect HMAC column name; it failed without mutation. The snapshot was rerun with the established `key_version` column. This was a diagnostic-query typo, not an observed production schema change.

### Gate disposition

Migration/security production verification and deployment: **not performed** because gate 1 stopped. Exact migration review confirms the intended three-table/five-function design and approved existing case-category extension; full production security approval/application remains pending.

Production manager role/UI matrix; Draft creation/isolation; duplicate-authority prevention; activation; player original/variant retrieval; viewer; feedback provenance; replacement/history/retirement; case workflow; Authority Warning; duplicate/conflict checks; dynamic-data/URL controls; LMS-0720 sanity and post-acceptance integrity: **not run in production**. Previously documented isolated/local passes remain evidence, not substitutes for these gates.

Document/PDF activation-history work remains deferred under the governing design and is not included in this migration. Approved Answer activation history is included but has not been exercised in production. No historical timestamp was manufactured.

**LMS-0721 remains NOT DEPLOYED / NOT PRODUCTION ACCEPTED.** Resume only after the owner identifies/approves the intervening corpus update or separately authorizes diagnosis of it. The later genuine owner-approved question/answer gate also remains pending; do not activate fabricated policy. No next version started.

## Intentional Rules update verified; production preflight resumed (2026-09-06)

The owner confirmed the intervening Rules upload/processing/activation was intentional. Read-only verification identifies latest Rules version `c0604ad8-7057-4e63-b6e1-e9389aee2157` (`v20260906111607-c0604ad8`), created 2026-09-06 11:16:07 UTC, processed 11:16:12 UTC, ready and referenced by the active document pointer. These are creation/processing times, not inferred activation times.

All 74 additional chunks belong to this Rules version (72 searchable/embedded). Excluding it leaves exactly 19 historical versions and 1,507 chunks. Prior Rules version `6f9c477e-cbde-4cb9-97cb-34e56174cbb6` remains superseded with its 69 chunks. Active Rule 3.5, page 2, includes “and has roster availability for additional players.” The immediate predecessor's extracted Rule 3.5 also contains that phrase; this verification establishes correct active content and version/chunk provenance, not that this latest upload first introduced the phrase.

Adopt the owner-authorized current 7-document / 20-version / 1,581-chunk state as the LMS-0721 deployment integrity baseline. Current JSONB hashes match the prior read-only checkpoint. No document processing, activation, content or embedding mutation was performed. The earlier unexplained-corpus gate is cleared; resume the existing controlled deployment authorization. Genuine owner-approved acceptance knowledge is still required at gate 7.

## Production migration applied and verified (2026-09-06)

Applied only `lms0721_approved_answers` to the verified production project after owner baseline reconciliation. Exact reviewed migration file SHA-256: `31944dc422685b62b5aa30caf888f2c1ab9a61168c4534f7762b18c487d6bdf4`. Earlier migrations were not reapplied.

Post-application catalog checks confirm three new RLS tables, five service-only functions with fixed search paths, 10 indexes including uniqueness indexes, and the expected constraints/FKs. Service role has SELECT only on each new table; direct INSERT/UPDATE/DELETE/TRUNCATE is denied by effective privileges. Anon/authenticated have no table privileges or new RPC execution. Actual service-role reads, both manifests, empty managed search, and independent official-source review succeeded. All new table counts are zero. Separate actual anon/authenticated read attempts were denied as intended.

The same-query pre/post hashes for documents, versions, chunks/vectors, feedback, outcomes, occurrences, groups, routes, cases and manager audit events are identical. All existing table ACL/RLS states are unchanged. Capture, document activation and Stage 3 function definitions/ACLs are unchanged; only the approved review-category function extension changed its definition, retaining its ACL. HMAC route version remains [1]. No data, document processing, activation, environment or HMAC change was made.

The remote production branch remains the accepted 9263f83 baseline before the forthcoming application deployment. App deployment and production lifecycle acceptance remain pending at this checkpoint.
