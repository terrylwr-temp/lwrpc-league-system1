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

## Production deployment and initial manager verification — gate 7 pause (2026-09-06)

The preceding checkpoints are historical. Current status is **LMS-0721 / 0.1.543 DEPLOYED, NOT YET PRODUCTION ACCEPTED**. Commit `455099a5d16cbb51a6bdbd84065b95e37245b6fc` was pushed through the normal main-branch pipeline. Vercel deployment `dpl_CMsmNtyW1Aqjt162Cq8ucUvKg9kv` is READY and serves the production domain. The live footer displays LMS-0721. No second migration application or document activation occurred.

After owner sign-in, the Commissioner session successfully loaded AI Feedback & Review with existing summary/queues, then the Approved Answers tab. Visual verification shows the selected tab, scope and Draft/Active/Retired filters, empty revision listing, zero Authority Warnings, and device-timezone guidance. Anonymous managed-answer API and viewer requests returned 401. Other signed-in role paths have not been exercised in production; isolated role tests are evidence but do not establish a completed live matrix. A deployment-scoped error/fatal hosting-log check returned no entries in its checked interval; this is not lifecycle/capture acceptance evidence.

The owner's controlled deployment approval, section 7, explicitly requires stopping if no genuine missing-knowledge case with an owner-approved official answer is available. No such acceptance item has been supplied. Website and kitchen/NVZ questions remain excluded. No Draft, activation, feedback, question replay, revision, retirement or case mutation was manufactured. Request the canonical question and approved answer, league scope and applicable effective/expiration dates before resuming the dependent gates.

### Acceptance disposition by requested report category

| Category | Current evidence / remaining work |
| --- | --- |
| 1. Migration/security | Applied once; effective ACL/RLS/functions/indexes and unchanged existing state verified as above. |
| 2. Deployment | READY main-branch production deployment; live LMS-0721 verified. |
| 3. Authorization | Commissioner UI success and anonymous API/viewer denial verified; other authenticated roles pending live checks. |
| 4. Activation history | PDF document activation history deferred by governing design; no timestamps fabricated. Managed activation history awaits lifecycle. |
| 5. Draft creation/isolation | Pending owner-approved acceptance item. |
| 6. Duplicate authority | Isolated coverage and production read-only source-review RPC verified; production creation-workflow gate pending. |
| 7. Activation | Pending. No knowledge activated. |
| 8. Original/variant retrieval | Pending. |
| 9. Viewer | Anonymous denial verified; published revision viewer pending. |
| 10. Feedback provenance | Pending approved-answer-grounded event. |
| 11. Revision replacement | Pending. |
| 12. Historical revision | Pending. |
| 13. Retirement | Pending. |
| 14. Case workflow | Existing queues load; new knowledge-linked disposition pending. |
| 15. Authority hierarchy | Isolated tests passed; remaining controlled acceptance pending. |
| 16. Authority Warning | Production empty warning panel loads; isolated conflict behavior passed. |
| 17. Duplicate/conflict safety | Isolated tests passed; no contradictory production knowledge created. |
| 18. Dynamic-data boundary | Isolated coverage retained; live gate pending. |
| 19. URL safety | Isolated coverage retained; live lifecycle/viewer gate pending. |
| 20. LMS-0720 sanity | Review UI loads; bounded question/New Question replay pending. |
| 21. Integrity | Exact pre/post-migration corpus/history hashes unchanged; final post-acceptance comparison still required. |
| 22. Limitations | Genuine owner-approved knowledge absent; non-Commissioner signed-in production role checks outstanding. No new defect demonstrated by initial UI verification. |
| 23. Decision | Deployed, acceptance incomplete. Resume from remaining authorization checks and gate 7 without reapplying migration or redeploying unnecessarily. |

No environment/HMAC change, corpus processing, document activation or next-version work occurred. This status update is local documentation only and does not trigger another deployment.

## Gate 7 NR candidate — existing authority stop (2026-09-06)

The owner supplied “If I have an NR rating, can I play on any team?” and approved the accompanying coach-input/captain-responsibility answer, all leagues, standing/no expiration, expressly subject to a pre-creation authority check. Read-only inspection searched currently active LWR chunks for NR, Not Rated/unrated, Certified DUPR, qualified pickleball and balanced/fair wording. Active Rules version remains `v20260906111607-c0604ad8` (`c0604ad8-7057-4e63-b6e1-e9389aee2157`). No draft or player request was submitted.

**Result: STOP before creation. Existing official knowledge, not a managed-knowledge gap.** LWR Pickleball Club DUPR League Rules, Rule 4.5, DUPR RATINGS/DIVISIONS, page 3, already establishes all substantive NR guidance. The rule spans two adjacent stored chunks with parent rule_number 4; its explicit 4.5 heading and continuation establish the specific rule identity:

> 4.5. Players with a DUPR Rating of "NR" (Not Rated): Players with a DUPR rating of NR (Not Rated) are eligible to participate in any division. However, it is strongly recommended that a Certified DUPR Coach or qualified pickleball professional provide input to help determine the player's most appropriate skill level. The team captain is ultimately responsible for ensuring the player is placed in the proper division to promote balanced and fair competition for all teams.

| Proposed substantive point | Existing controlling evidence |
| --- | --- |
| NR eligibility | Rule 4.5, page 3: eligible to participate in any division. This is not unrestricted permission to join any team. |
| Coach/professional recommendation | Rule 4.5, page 3: same Certified DUPR Coach or qualified pickleball professional recommendation. |
| Captain responsibility | Rule 4.5, page 3: same ultimate responsibility for proper division placement. |
| Balanced/fair competition | Rule 4.5, page 3: same express purpose for all teams. |

Related Rule 4.1.1, page 3, treats DUPR Reliability Factor below 29 as NR, directs appropriate current-skill division placement under 4.5 and encourages consultation with a local Certified DUPR Coach, pickleball professional or knowledgeable captain. Rule 4.5.1, page 4, specifies the initial Season DUPR used for team aggregate calculations (division maximum individual rating minus 0.5).

**Wording issue:** the canonical question's “any team” followed by an unqualified “Yes” could overstate Rule 4.5's “any division.” Rule 3.5, page 2, still prohibits another community's team when the player's own community has a team in their division with roster availability. Rules 3.1–3.3 retain membership/waiver/DUPR requirements; league-specific age requirements also remain. NR is not a general eligibility exemption. No policy wording was silently rewritten, and no additional substantive guidance missing from the formal source was identified.

Read-only managed-table counts after review: answers 0, revisions 0, events 0. No production mutation, model call, corpus processing, formal-source edit, deployment or version change occurred. This manual authority check does not claim that the application's duplicate-prevention workflow has been exercised. Remaining acceptance lifecycle and non-Commissioner role gates remain pending. LMS-0721 / 0.1.543 remains deployed, **NOT PRODUCTION ACCEPTED**. A different genuine missing-knowledge candidate is required to resume Gate 7.

## Gate 7 scheduling candidate — partial overlap and wording stop (2026-09-06)

Owner supplied “As a captain, can I change our scheduled match date or time?” with permission when both captains agree and mandatory notification of the new date/time to info@lwrpickleballclub.com, all leagues, standing/no expiration. Authorization is conditional on existing-authority review, preserving all formal scheduling requirements. Read-only searches of all active LWR sources covered schedule/date/time changes, rescheduling, makeup, mutual agreement, flex and notification, including Important Dates and both Captain guides. No model call or production mutation was made.

Active DUPR League Rules version `v20260906111607-c0604ad8`, **Rule 5.11, Rescheduling & Score Submission Deadlines, page 5**, states:

> If both coaches agree, games may be rescheduled to a different time on the same day or to another day within the same week. However, all game scores must be submitted by the end of Sunday of the same week by midnight. If this deadline cannot be met due to weather conditions or other unforeseen circumstances, the Home Captain must notify info@lwrpickleballclub.com before Sunday at midnight with the rescheduled date and time. Failure to do so may result in forfeiture of the games.

The quote normalizes the extracted `diƯerent` ligature to `different`; it retains the source's actual word **coaches**, not silently substituting captains. Rule 5.11 is in general **TEAM/GAME RULES**, which begins on page 4, before the league-specific section 6. It is not the DUPR 9 flex provision. Rule 5.12, page 5, additionally requires makeup games at least one week before playoffs/championships. Rule 5.13.3, page 6, retains original players and positions for rescheduled interrupted games. Important Dates pages 1–2 retain league break windows and championship dates.

The genuinely narrower flex language is **Rule 6.1.9, page 8**, under Weekday: Men's/Women's 9.1 divisions initially schedule Fridays at noon and captains can modify day/time “within 7 days.” **LWRPC-Captains Guide to the LMS, Upcoming Matches, page 10**, allows modifying date/time and notifying opposing captains **if this is a flex league**. Neither establishes unrestricted all-league flex scheduling. **DUPR Captains Guide, VIEW SCHEDULE/GAME INFORMATION, page 8**, requires court reservations/start-time coordination and directs scheduling issues to league managers; page 9 requires notifying Management about full-match forfeits/weather cancellation. The LMS Captain Guide, Entering Match Scores, page 13, similarly directs full cancellations to Management. None of these establishes notification of every ordinary agreed schedule change.

**Disposition: partial existing knowledge, not a fully duplicated policy.** General agreed rescheduling and deadline-exception notification are already formal. Requiring Management notification for **every** agreed change is additional owner-approved guidance not found in active sources. That administrative requirement could supplement formal authority without contradiction, provided Rule 5.11's timing/deadline/exception conditions and other applicable restrictions remain governing.

**Stop before creation on supplied wording:** as a self-contained answer, permission conditioned only on mutual agreement plus notification could overstate the allowed rescheduling window. The owner's stated intent expressly preserves other scheduling requirements, so this is a publication-wording risk, not a claim that the owner intended to repeal Rule 5.11. Do not silently rewrite the approved text. A qualified or notification-only supplement should be reviewed before publication; the existing formal permission should not be replaced by managed knowledge.

The implementation supports consistent complementary managed evidence linked to a selected formal chunk, but that does not guarantee the formal source will be present for every canonical/variant request. No live selection replay was run and no claim of successful complementary selection is made. Read-only review found no existing scheduling-related question-group/review-case match; a legitimate source case is also needed for the approved create-from-case workflow. Do not manufacture one by bypassing Stage 7.

Managed table counts remain answers 0 / revisions 0 / events 0. No Draft, activation, feedback, revision, retirement, case mutation, corpus processing, code change, deployment or version change occurred. LMS-0721 / 0.1.543 remains deployed, NOT PRODUCTION ACCEPTED. This finding is separate from deferred website, kitchen and rally-scoring cases.

## Deferred Rally Scoring scope finding (2026-09-06)

Owner reports that `what are your rally scoring rules` produces an answer beginning `LWR DUPR League rally scoring rules are:` with `All regular games are to 15 using Rally Scoring, win by 1.` The owner identifies that provision as league/format-specific and reports broader mixing of mechanics, point values, end switching, timeouts, Picklebreaker and game-to-25 scoring freeze. Record as **AI/Retrieval Review — scope/applicability**, not a managed-knowledge gap or Approved Answer candidate. No trace/source diagnosis was performed in this documentation-only task.

The roadmap's deferred Rally Scoring section records the complete future trace requirements, evidence-based response options, scope-preservation principle and seven regression questions. Future diagnosis must determine universal versus league/division/format-specific provisions from official evidence before choosing a response strategy. General questions must not silently inherit one league's format; explicit league questions may use their applicable provisions.

For LMS-0721 duplicate/existing-authority prevention, existing official Rally Scoring evidence should lead managers toward AI/Retrieval Review rather than competing managed knowledge. Only later diagnosis can establish a genuine knowledge gap. No Approved Answer was created, no production operation was performed, and no retrieval/applicability, generation, corpus, Stage 7 or version change was made. This finding is deferred to a separately authorized AI quality diagnosis; LMS-0721 acceptance status remains unchanged.


## Manager-originated correction implemented locally — stop for review (2026-09-06)

**LMS-0721 / 0.1.543 unchanged. Production still runs the prior case-only build and is NOT PRODUCTION ACCEPTED.** The owner approved implementation and local validation of direct manager creation, explicitly requiring review before corrective migration/deployment. Nothing was applied or deployed in this correction pass.

### Exact correction files

- `lwrpc-admin/supabase/migrations/20260906172546_lms0721_manager_originated_approved_answers.sql`
- `lwrpc-admin/app/lib/aiApprovedAnswersService.js`
- `lwrpc-admin/app/ai-assistant/review/ApprovedAnswersPanel.js`
- `lwrpc-admin/test/aiApprovedAnswersDatabase.test.mjs`
- `lwrpc-admin/test/aiApprovedAnswersService.test.mjs`
- `docs/lms-0721-approved-answers-design.md`
- `docs/lms-0721-implementation-report.md`
- `docs/project-roadmap.md`

Earlier uncommitted acceptance/deferred-finding documentation is preserved. Original migration, versions/package files, player UI, retrieval/selection, generation, feedback/capture, corpus and HMAC are unchanged.

### Migration / RPC / server / UI

The CLI-generated corrective migration drops only NOT NULL from `ai_approved_answers.source_review_case_id`; preserves FK ON DELETE RESTRICT and existing standard UNIQUE; replaces the managed action function with NULL-origin creation and conditional case-link audit; explicitly revokes/regrants only that function's EXECUTE to service role. It leaves table ACL/RLS and other functions unchanged. Reviewed working-file SHA-256: `0196a104b651af0cf89832d209e1f48f8c1bb56200cab5fb2bd7c2323dfe38a1` (recompute if transport changes line endings).

Create with explicit `id: null` is manager-originated. All other actions require valid revision IDs. Non-NULL creation still checks the eligible unresolved/unmerged unanswered case and rejects duplicate case linkage. Missing/invalid creation IDs cannot accidentally enter manager mode. The shared server path retains static-policy confirmation, field bounds, official-source review, missing-policy distinction, dynamic-data rejection, overlap and activation checks. Activation preflight now checks same-topic overlapping Drafts alongside Active managed knowledge, excluding revisions of the same item. No claim is made that declared topic checks detect all semantic Draft duplicates.

The same protected API authorization and SQL actor validation allow Commissioner/League Manager and reject other roles. No browser table/RPC permissions were granted. No new API or player payload is needed. Detail skips a NULL case query. UI adds New Approved Answer and uses the existing editor, displays Manager-created origin, retains genuine case navigation and avoids a nonexistent case Resolve prompt. Existing revision/history and dialog focus/scroll behavior remain.

### Audit, idempotency and integrity proof

Normal created/draft_edited/activated/replaced/retired events retain actor/time and immutable revision history. Manager creation has no linked_to_case event; case creation still does. The existing operation UUID/request hash/advisory lock returns one item/revision on retry and rejects changed operation payload/origin/actor. UI retains the same operation UUID after a recoverable save failure; disabling buttons is not the only safeguard.

Isolated PGlite/pgvector tests apply all original prerequisites plus the new correction with production-like default table/function grants. Tests verify effective denied browser reads/writes, service SELECT-only tables, prohibited INSERT/UPDATE/DELETE/TRUNCATE, all five RPC ACLs, unchanged RLS, safe action search_path, unchanged existing feedback ACL and unchanged other function definitions/ACLs. Corrective replay preserves permissions, function definition and existing managed rows.

Tests exercise multiple NULL case links, rejected duplicate non-NULL links, rejected invalid FK, invalid/resolved case rejection, Commissioner and League Manager success, Player/Captain/Club Pro denial and browser-role RPC denial. Concurrent queued same-operation submissions return one Draft; mismatched retry bodies/origin are rejected. Direct Draft search exclusion, activation, revised Draft while original Active, atomic replacement, original historical content/actor/time and retirement search exclusion pass. Exact direct lifecycle audit contains no case linkage. Stage 7/feedback/group/case row snapshots remain identical across manager lifecycle. Existing case lifecycle retains its linked event and does not auto-resolve; the isolated explicit Resolve path is exercised separately after the synthetic retest reason.

Service tests cover direct-creation field/static/dynamic validation, official direct-source block, similar-source missing distinction, exact HTTP replay, NULL detail handling, retained linked-case lookup and Draft/Active overlap preflight.

### Validation results

- Full `npm test`: **450 passed**, no failures (446 prior tests plus four new tests/subtests).
- `npm run lint`: zero errors, six unchanged captain/player warnings.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed.
- Normal `npm run build`: compiled successfully, then the known `.next/cache/.tsbuildinfo` EPERM stopped TypeScript's cache write. This is a filesystem failure, not a source compilation error.
- Final isolated production build: compilation, TypeScript, all **74 pages** and final optimization passed with final UI code. Initial isolated setup needed its tracing root to include the existing dependency junction and the normal public Supabase build configuration; those harness/setup failures were corrected without app/environment changes. No secret was printed or copied into the test app.
- Local browser: shared editor, NULL-origin submission, required static confirmation, simulated save failure/retry, same operation ID, Manager-created detail, revision/audit section and no linked-case URL verified. Phone dialog measured exactly 390×844, overflow auto, no page horizontal overflow, 44px close target; Escape restored body scrolling and focus to View. Existing application box-sizing was included in the isolated harness. No production connection or policy mutation was used. Temporary harness encoding/setup issues were corrected before final UI observations; no temporary route was added to the deployable app. Local server stopped and browser viewport restored.
- `git diff --check`: passed.

### Exact production continuation — requires review/authorization

1. Reverify production identity, deployed commit/version, migration history, managed rows and corpus/feedback/Stage 7 integrity against a fresh read-only checkpoint. The intentional active Rules baseline remains 7 documents / 20 versions / 1,581 chunks; reconcile later legitimate owner changes explicitly.
2. Review and apply **only** `20260906172546_lms0721_manager_originated_approved_answers.sql`. Do not reapply `20260906152030_lms0721_approved_answers.sql`. Verify nullable FK, multiple-NULL/unique-non-NULL design, effective ACL/RLS/EXECUTE/search_path and unchanged unrelated definitions/rows. No production synthetic cases or direct table inserts.
3. Commit/review the correction and deploy through the normal production main-branch pipeline only after DB/security verification. Verify new commit deployment and unchanged LMS-0721 / 0.1.543. No HMAC/env changes.
4. Verify authorized manager New Approved Answer and remaining live role gates. Create **Match Scheduling Changes**, canonical question **As a captain, can I change our scheduled match date or time?**, all-league standing policy/no expiration, with no review case. Use the owner-approved exact text below; link the active formal **Rule 5.11, page 5** through the related-source model. Confirm the actual linked/displayed identity, not merely the broader stored chunk rule. Re-run the mandatory authority review and record the genuinely new all-changes notification distinction. Stop on any unresolved existing-source block, identity discrepancy or unexpected behavior; do not bypass it.
5. Verify Draft isolation (retrieval/viewer/generation), NULL case origin and audit, then explicitly activate and verify actor/time/vector/unique Active state. Ask canonical and approved natural variants, preserving formal 5.11/5.12 limits and flex distinction; both source families must remain distinguishable, with no false Authority Warning merely for consistent supplementation.
6. Verify safe viewer and one authorized feedback event's exact revision provenance. Create/save a wording-only equivalent Draft, verify original still governs, activate replacement, inspect exact prior historical citation, retire current revision and verify new-retrieval exclusion plus historical access. Skip case Resolve for this manager-originated item; retain the isolated case workflow proof.
7. Complete remaining original lifecycle, authority/conflict, URL/dynamic-data and bounded LMS-0720 sanity gates; final read-only corpus/history integrity. Mark accepted only if all gates pass or the owner explicitly accepts documented limitations. Do not start another version.

Owner-approved text (not yet created in production):

> Yes. Under Rule 5.11, captains may mutually agree to reschedule a match to another time that day or to another day within the same week, subject to the Rule's scheduling and score-reporting requirements. Whenever captains agree to change a scheduled match date or time, they must also notify League Management at info@lwrpickleballclub.com of the new date and time.

The supplemental notification requirement does not broaden formal timing, score reporting, exception, makeup or flex editing authority. Any wording-only replacement must retain identical meaning. The corrected creation path is ready for review, not production accepted.

## Manager-origin production continuation — migration verified (2026-09-06)

Applied only `lms0721_manager_originated_approved_answers` after the renewed controlled-production approval. Verified correct Supabase project, original LMS-0721 deployment 455099a and unchanged intentional Rules baseline. Before correction: 102 outcomes (two later grounded player outcomes; original 100-row hash still identical), 16 feedback events, 16 cases, 22 review occurrences and empty managed tables. No fabricated acceptance data.

Post-migration the case link is nullable; original FK/UNIQUE remain with PostgreSQL NULLs distinct. Effective RLS/table ACLs are unchanged: service SELECT only, browser roles no access. Action RPC is service-only, SECURITY DEFINER with pg_catalog search_path and original timeouts; both conditional case checks and case-link audit are present. Action definition MD5 `8da30a9f046b49ccbcfc72002b71d613`. The complete pre/post checkpoint (all prior AI row hashes, existing capture/review/document/Stage 3 function hashes/ACLs and table ACL/RLS) is identical. Earlier migrations were not reapplied.

The latest approval's gate 23 requires PDF activation history, whereas the approved implemented scope deferred it. Read-only production verification confirms no document/version activation columns, no activation audit table, and an activation RPC that only updates pointers/status. This remains an explicit unmet acceptance gate, not a claim that upload/processing timestamps are activation timestamps. No document subsystem change was made. Continue the independently authorized managed-knowledge deployment/acceptance; do not mark full acceptance with this gate unresolved.
