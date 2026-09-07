# LMS-0722 / 0.1.544 implementation report

Status: **LMS-0722 / 0.1.544 — PRODUCTION ACCEPTED.** Corrected deployment 42778fd is READY. 614 tests and isolated production build passed; 28-question acceptance benchmark and required live gates passed, Cross-League Leakage = 0. Per-document collapsed history is deployed. No legitimate new activation occurred; live activation remains the owner-authorized limitation. [Final acceptance evidence](lms-0722-production-acceptance.md).

The implementation-stage configured-model benchmark below sent only selected official passages and benchmark questions, without member data, credentials, conversation history or unrelated LMS data. Its results remain **local validation**, not the unfinished production benchmark.

## Current official baseline

The final read-only verification passed for Rules **v20260907001227-e4d9bf77**, version `e4d9bf77-e15e-4d80-84ba-2f7259970ba6`. Rules 6.3.3, 6.3.6 and the PrimeTime summary consistently establish Picklebreaker **15, win by 2, Rally Scoring**. Both earlier versions are superseded and their chunks/PDFs remain available to existing historical viewers. The specific conflict is **RESOLVED BY OWNER SOURCE CORRECTION**. The application contains no hardcoded league score or product answer. [Verification](lms-0722-final-source-verification.md).

The historical diagnosis/replay remains preserved and explicitly precedes that owner correction. Current-corpus benchmark results are separate artifacts.

## Corrections

A shared deterministic question-concept layer now distinguishes document navigation, documented account/help procedures, object-bound website facts, apparel, NVZ definitions/contact, mixed-round participation, player counts, division formats and scoped scoring. It extends the existing interpretation/conversation/retrieval/selection pipeline; it is not a second answer service. Raw/effective question text remains unchanged for standalone questions.

- **Saturday mixed-only players:** selects the actual 6.2.2 permission instead of requiring conversational words such as “clarification” in evidence. Generated answer permits additional mixed-only players, with the correct specific source.
- **Website:** club/LMS/DUPR are distinct requested entities. Explicit official label/value facts can apply without a verb such as “must.” Club question selects 1.1 and its actual URL, not a DUPR website paragraph.
- **Rally scoring:** general questions select general mechanics and their complete continuation, excluding league-specific targets. Explicit leagues can use their own scoped provisions. Numeric examples remain conditional. The known stored p15 heading “DUPR LEAGUE MANAGERS” remains a presentation limitation; the correct document/page and rally passages are used. No corpus metadata was changed for that heading.
- **Kitchen/NVZ:** the accepted terminology mapping supports equivalence, definition, boundary and presence as distinct intents. Definition uses 3.A.4.c; contact without volleying uses 11.A. Adaptive/tournament exceptions are not substituted.
- **Apparel:** independently explicit blouse/shirt/jersey/apparel wording does not trigger an object clarification, including after a previous clothing turn. No applicable LWR clothing-color policy was established, so insufficient evidence remains appropriate. Unbound color questions can still clarify.
- **Document navigation:** active catalog identity and searchable anchors serve pure locator requests without embeddings or answer-model calls. Generic Rules and the two Captain guides can require a bounded document clarification. Named substantive objects, such as roster rules or selected ball, retain normal substantive selection. Viewer links use the existing server-validated Official Source mechanism.
- **LMS help:** password/login and stable documented procedures are distinct from personal account state. Password-reset answer uses official guide instructions; account-email/status/token questions remain protected. No account lookup/reset is performed.
- **Equipment assumptions:** possessive/plural pickleball wording retains selected-equipment intent. Proposed products are claims to verify, not required evidence tokens or aliases. The active guide determines the ball; the Joola assertion is corrected from its Franklin passage. Existing legal-ball/color/damage controls remain in the full suite.
- **Composition/division:** fields/lines/courts, roster capacity/recommendations, division identity and pair versus individual DUPR are distinct concepts. A division exception is recognized from same-version structural ancestry, rather than a hardcoded league count. Match-count answers explicitly describe players fielded/required for a match.
- **Multi-part 9.1:** both recorded questions lack an unambiguous league. They now ask which league instead of guessing a composition/aggregate rating. A general partial-answer engine is still deferred; a later multi-proposition request that remains incompletely supported can still fall back. No invented roster recommendation or unqualified interpretation of “9.1” is supplied.

### Bounded recall and authority review

The normal original question embedding is retained. A recognized concept can use **one** deterministic search-text projection through the unchanged Stage 3 RPC, with **zero additional concept embeddings**. Existing equipment-probe behavior is retained separately. Concept assistance and existing interpretation assistance do not chain into unbounded retries.

The 32-candidate pool, eight supplied candidates, 12 authority-review candidates, four selected-source cap and .35 threshold remain. For explicit league format/composition/scoring questions, the original eight ranked candidates are preserved; the four existing additional authority-review slots prioritize controlling candidates whose same-version structural scope matches the requested league/division. Original scores and Stage 3 ranks are retained, not boosted or invented. Diagnostic review rank is separate. This lets a lower-ranked actual PrimeTime provision survive a high-ranked multi-league table and unrelated introductions.

Structural reads are bounded to two retrieved Rules versions, 32 parent/predecessor rule identities and 48 rows per read; at most two reads support original and assisted candidates. They label scope, not fabricate scored evidence. Same-version immediately adjacent continuation reads are limited by the four selected-source cap, require matching structural identity, exclude following numbered siblings and avoid duplicate companion sources. A failed continuation read retains only complete propositions. No arbitrary neighboring page is treated as supporting evidence.

## Mandatory league controls and hybrid-answer root cause

[Detailed boundary diagnosis](lms-0722-cross-league-diagnosis.md) and [LMS-0721 selector replay](lms-0722-cross-league-baseline.json).

The page-13 summary was extracted as flattened multi-column text with the stored heading **Saturday League PrimeTime League**. It is not a real combined league. In the current-corpus baseline, the old selector chooses that chunk, rank 4/.4567, and passes its heading and combined rows toward generation/citation. The broad old league check accepts a candidate if any named league in its metadata matches; it cannot assign table values to individual columns. “What kind of games” also lacked the specific format concept. This reproduces the selection/citation boundary failure without manufacturing a historical model response.

The correction recognizes format wording, derives scope from the selected numbered proposition and nearest verified ancestor, and rejects ambiguous flattened league scope. It does not ban a literal phrase or relabel a mixed chunk as PrimeTime. Actual PrimeTime Rule 6.3.3 is selected/cited on p12. Paired Saturday answers use 6.2.3 and its own continuation. An isolated adjoining-section test proves that one broad chunk containing both numbered sections can contribute only the applicable child passage.

**Required gates (not optional benchmarks):**

| Question family | Active controlling evidence | Verified answer meaning |
|---|---|---|
| PrimeTime players | 6.3.2, p12 | 4 fielded / 2 lines / 2 courts |
| Saturday players | 6.2.2, p9 | 12 fielded: 6 men and 6 women; mixed-only additions permitted; 4 courts |
| Weekday players | 6.1.2, p7 | 6 fielded / 3 lines / 3 courts |
| Weekday 9.1 players | 6.1.9.1, p8 | 4 fielded / 2 lines / 2 courts |
| PrimeTime kind of games / match format | 6.3.3, p12 | Round robin, best 2 of 3 to 11 by 2; potential PB to 15 by 2 Rally |
| Saturday kind of games / match format | 6.2.3, pp9–10 | Gender doubles and mixed rounds; regular games 15 by 1 Rally; conditional PB 25 by 2 |
| PrimeTime PB | 6.3.3, p12 | 15 by 2 Rally from current Rules |
| Saturday PB | 6.2.3.5 / continuation, pp9–10 | Only at 12–12; mixed teams; 25 by 2 Rally; 3-point bonus |

All **12 required phrasings** in [the gate list](lms-0722-required-league-controls.json) returned grounded answers. **Cross-League Leakage = 0** in their selected evidence, source labels and inspected generated propositions. Negative assertions reject foreign league scope and distinctive foreign provisions, not just check positive facts. Counts are not represented as overall roster maximums. These are local corrected-pipeline/live-model replays, not production UI acceptance.

## Real Player Question Benchmark

[Full 28 generated answers and citations](lms-0722-generated-benchmark.md), [machine-readable selected evidence](lms-0722-generated-benchmark.json), [current RPC traces](lms-0722-current-replay.json), [metrics](lms-0722-benchmark-metrics.json).

Before classifications below use retained owner production reports and the accepted diagnosis; no missing historical generated answers were invented. After uses corrected local selection on captured current production-format RPC results, actual active-source validation and the existing configured answer model. Pure document navigation reads the live catalog but skips generation. No Ask route or Stage 7 write is used.

| Recorded question/family | LMS-0721 baseline | LMS-0722 after |
|---|---|---|
| Saturday additional mixed-only players | Incorrect insufficient evidence | Grounded 6.2.2 answer |
| Club website | Incorrect/irrelevant source answer | Grounded 1.1 URL |
| General rally scoring | Incorrect scope in answer | Grounded universal mechanics |
| Kitchen equals NVZ | Incorrect insufficient evidence | Grounded definition |
| Clothing fragment | Appropriate insufficient evidence | Appropriate insufficient evidence |
| Saturday Rules locator | Incorrect insufficient evidence | Grounded navigation, no model |
| Unable to log in/reset password | Incorrect insufficient evidence | Grounded official help |
| Weekday ball with Joola assumption | Incorrect insufficient evidence | Grounded selected-ball correction |
| Men/women/mixed/heat 9.1 multi-part | Incorrect insufficient evidence | Appropriate league clarification |
| LWRCC team-size/combined 9.1 | Incorrect insufficient evidence | Appropriate league clarification |
| Weekday 9.1 different format | Incorrect insufficient evidence | Grounded flex scheduling + format |
| PrimeTime player count | Incorrect insufficient evidence | Grounded match count |
| Full blouse/color question | Inappropriate object clarification | Appropriate insufficient evidence |

For these **13 recorded questions**, baseline categories are 9 incorrect insufficient responses, 2 incorrect answers, 1 inappropriate clarification and 1 appropriate insufficient response. After: 9 grounded answers/navigation, 2 appropriate clarifications, 2 appropriate insufficient responses. No genuine unresolved-source conflict occurs in this set; generic conflict safety is tested separately.

**Answerability/recall:** all 9 answerable original cases now have useful grounded/navigation results. Clarification and no-source cases are excluded from this denominator. Across the expanded 28-question set, 24 returned grounded answers (including one deterministic navigation response), 2 clarified, and 2 safely declined.

**Grounding/safety precision:** review found support for all 24 grounded results; no observed cross-league leakage in the 12 mandatory scoped controls; no invented overall roster cap or user-product authority in the final benchmark. This is a bounded sample, not a guarantee over all questions. Before/after is not a randomized production A/B or a claim that unchanged model outputs are deterministic.

## Conflict and managed-knowledge safeguards

The owner-corrected PrimeTime source conflict is no longer an active defect. An isolated fixture with two genuinely conflicting equal-authority targets (17 versus 19, not hardcoded production scores) returns the existing conflict response, cites both and skips generation in both orders.

Managed-answer retrieval/authority threshold remains **.65**. Existing warning, supplement preservation, binding, lifecycle, historical citation and feedback tests remain. The standalone competing-policy conflict test now checks reverse order too. This does **not** claim to repair the separately diagnosed multiple overlapping formal-complement selection problem; that redesign remains deferred as approved, and multiple overlapping Active supplements must not be enabled without its separate safeguard. No managed policy was created, activated or revised here.

## Required document activation history

Migration: `lwrpc-admin/supabase/migrations/20260907001910_lms0722_document_activation_history.sql` (local only).

- Nullable `activated_at timestamptz` and `activated_by_member_id` member FK retain authoritative first activation. Member deletion can clear the actor while retaining the time; the UI then truthfully shows Unknown actor.
- The protected route derives actor from its authorized manager/commissioner member record, never request input. Existing activation authorization is preserved.
- One server transaction locks the document, validates the ready/searchable/embedded target, records history, switches the active pointer, and supersedes the prior version. Failure rolls back all changes. Same-version retries preserve existing values, including historical Unknown.
- The old actor-less RPC is removed. The new RPC is SECURITY INVOKER with a fixed search path, explicit revoke of inherited/default function permissions and execute granted only to service_role. Browser roles cannot execute it. A trigger prevents prospective active-pointer changes without history.
- Existing document/version/chunk table grants and RLS remain unchanged. No project-wide default privileges are changed.
- No historical backfill. The currently active owner-corrected Rules may initially show **Activated: Unknown / Activated by: Unknown**. Neither processing time nor a version label is activation evidence.
- The existing version list/detail shows time and friendly actor near status, for current and superseded versions. Formatting uses device-local timezone with a zone suffix; the database stores the normal timestamp. Raw actor IDs are stripped server-side.

Isolated PGlite tests use production-like default grants and test effective permissions/denials, function replay, old-overload removal, existing ACL/RLS preservation, successful activation, same-version idempotency, direct-pointer bypass rejection, rollback, superseded-history preservation, actor deletion, browser denial and missing actor failure. They validate transaction behavior without fake production activations. Browser checks exercise the actual manager component with local GET-only fixtures at 1280/390/320 widths, known and Unknown values, no overflow/page errors.

## Performance and call counts

Concept classification averaged about **0.0033 ms** over 12,000 local control classifications. Existing interpretation instrumentation for the required controls measured about 0.40–1.98 ms. No interpretation-model call was added.

Required-control recorded retrieval totals were approximately **0.59–1.52 s** including original embeddings; bounded assistance samples were about **0.26–0.37 s**. Earlier broad-question samples include 6–8.6 s outliers, retained in the traces rather than discarded. Timing samples span implementation and are not a controlled same-host production latency comparison.

Final retained benchmark uses **23 answer-model calls for 28 questions**; 1 grounded navigation + 2 clarification + 2 insufficient outcomes skip generation. Model/source-validation wall times were **1.38–5.03 s**, median **2.01 s**, excluding the previously captured retrieval latency. Do not add these as if measured in a single deployed request. Document navigation measured 117 ms catalog retrieval and about 291 ms including source validation in its benchmark.

Concept assistance reuses one original vector. The accepted equipment probe can separately use an additional embedding; it is not falsely counted as zero extra calls. Structural/continuation reads add bounded work. A production load/latency gate remains required; no blanket production latency guarantee is claimed from this local run.

## Validation

- `npm test`: **600 passed**, including all 525 accepted baseline tests and new production-format/scope/activation coverage.
- `npm run lint`: passed, **six existing warnings**, no errors.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed.
- `npm run build`: compiled successfully in 10.6 s; failed writing known locked `.next/cache/.tsbuildinfo` (EPERM), not compilation failure.
- Fresh isolated production build: passed compilation, type checking and static generation. Its new workspace uses existing dependencies and contains no copied secret env file.
- Actual manager component browser checks: passed desktop/mobile, local-time activation information, historical Unknown, no horizontal overflow or page errors.
- Offline mandatory generated-answer gate: passed all 12 controls with zero detected cross-league leakage.
- `git diff --check`: passed.

No production deployment, SQL application, document processing/activation, corpus/embedding/metadata mutation, Stage 7 change, live member lookup, or Approved Answer change occurred.

## Exact implementation files

[Complete exact working-tree file manifest, including every evidence artifact](lms-0722-file-manifest.md).

Application/version changes:

- `lwrpc-admin/app/lib/aiQuestionConcepts.js` (new)
- `lwrpc-admin/app/lib/aiOfficialApplicability.js` (new)
- `lwrpc-admin/app/lib/aiDocumentNavigation.js` (new)
- `lwrpc-admin/app/lib/aiPassageContinuations.js` (new)
- `lwrpc-admin/app/lib/aiDocumentActivation.js` (new)
- `lwrpc-admin/app/lib/aiRetrieval.js`
- `lwrpc-admin/app/lib/aiAnswerGeneration.js`
- `lwrpc-admin/app/lib/aiConversation.js`
- `lwrpc-admin/app/lib/aiEquipmentIntents.js`
- `lwrpc-admin/app/lib/askLwrPlayerAnswer.js`
- `lwrpc-admin/app/api/ai-assistant/documents/route.js`
- `lwrpc-admin/app/ai-assistant/page.js`
- `lwrpc-admin/app/lib/version.js`
- `lwrpc-admin/package.json`
- `lwrpc-admin/package-lock.json`
- `lwrpc-admin/supabase/migrations/20260907001910_lms0722_document_activation_history.sql` (new)

Tests/tools:

- `lwrpc-admin/test/lms0722.test.mjs` (new)
- `lwrpc-admin/test/aiDocumentActivation.test.mjs` (new)
- `lwrpc-admin/test/aiApprovedAnswersIntegration.test.mjs` (reverse-order assertion only)
- `lwrpc-admin/scripts/lms0722-current-replay.mjs`
- `lwrpc-admin/scripts/lms0722-replay-fixture.mjs`
- `lwrpc-admin/scripts/lms0722-generate-benchmark.mjs`
- `lwrpc-admin/scripts/lms0722-benchmark-report.mjs`
- `lwrpc-admin/scripts/lms0722-selector-inspect.mjs`
- `lwrpc-admin/scripts/lms0722-isolated-build.mjs`
- `lwrpc-admin/scripts/verify-lms0722-ui.cjs`

Documentation: this report, `docs/project-roadmap.md`, diagnosis checkpoint/addendum, final source verification, cross-league diagnosis/baseline, current Rules/replay fixtures, benchmark JSON/Markdown/metrics and required-control list, validation logs and activation screenshots. Existing LMS-0721 acceptance-document edits predated this implementation and were preserved; they are not described as LMS-0722 changes. Historical LMS-0722 diagnosis/source snapshots remain clearly dated and separate from current results.

## Controlled production sequence — future authorization required

1. Review this change and the exact migration. Confirm the production project and still-current owner corpus baseline read-only; stop on unexpected changes. Do not reprocess or reactivate anything.
2. Inspect existing activation function/table ACL/RLS and object identities. Compare effective default grants with the isolated tests. Ensure the new overload/trigger names do not collide with unexpected objects. Snapshot relevant security definitions read-only.
3. Arrange a short manager activation pause: the migration deliberately removes the old actor-less RPC, so the old app cannot activate between migration and deployment. Do not restore an insecure bypass for compatibility.
4. Apply only the activation-history migration after approval. Verify columns/FK, transaction function, trigger, fixed search path, old-overload removal, effective execute denials, unchanged table ACL/RLS and truthful null history. Stop on any mismatch. No fake production document or activation.
5. Deploy exactly LMS-0722 / 0.1.544 through the established pipeline. Confirm version and normal role-protected manager access. No new secrets/model changes are required.
6. Check activation fields for current/historical versions on desktop and phone; times must be device-local and unknown history truthful. At the **next legitimate activation**, verify actual actor/time, atomic pointer/status/history and (only if a legitimate second activation occurs) retained superseded history. If none occurs, retain this live check as an explicit owner-accepted limitation supported by isolated tests; do not silently mark it passed.
7. Run the four mandatory player-count questions and all paired format/Picklebreaker controls from the gate list in production. Verify correct active rule citations, no roster-cap invention, no foreign-league content and **Cross-League Leakage = 0**. Any failure blocks production acceptance.
8. Run the broader recorded-player benchmark, account privacy, navigation viewer, normal conversation/clarification, legal-ball/damaged-ball, managed .65/history/feedback and Stage 7 compatibility gates. Do not create managed knowledge for existing-source cases. Use authorized controlled feedback only if separately included in deployment approval.
9. Inspect bounded latency/call counts and hosting errors, source-currentness/historical access, activation authorization and unchanged player payload/UI. Stop and report unexpected behavior; do not patch production opportunistically.
10. Only after the owner reviews all results and any explicit legitimate-activation limitation may LMS-0722 be production accepted. Do not start another version or Live LMS Intelligence.
