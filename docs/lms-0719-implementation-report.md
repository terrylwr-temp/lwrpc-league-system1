# LMS-0719 / 0.1.541 implementation report

Status: **LMS-0719 / 0.1.541 — DEPLOYED AND PRODUCTION ACCEPTED.** Owner deployed commit 7b6dc2d; final production acceptance completed 2026-09-06 UTC (2026-09-05 local). LMS-0718 / Stage 7B remains production accepted. No next version or Live LMS Intelligence has started. The original local implementation/deployment-plan sections below are preserved as historical evidence.

## Changes and scope

Two approved changes only: explicit New Question session reset, and trusted selected-provision citation presentation. No Stage 3 retrieval, Stage 4 applicability, governing hierarchy, clarification policy, model settings, feedback route/schema, Stage 7 RPC/HMAC, document processing, corpus, embedding, active version, or historical viewer authorization changes.

### New Question

The secondary `type="button"` control sits above primary Ask in a 116px desktop action column. At the existing 639px phone breakpoint, the textarea occupies the full composer width and both actions share a row below it. Existing disclaimer, mobile overlay, safe areas, visualViewport sizing, panel scrolling, Escape and drawer focus containment remain intact.

Reset synchronously invalidates the conversation revision and advances the shared session generation before clearing the authoritative receipt. It removes `lwr-ask-ai-current-context-v1` and `lwr-ask-ai-exchanges`, clears shared/visible exchanges, composer drafts, request errors and local exchange feedback, and notifies mounted subscribers. Removing exchanges does not delete persisted votes or telemetry. The next request has a null inherited receipt and retains its normal page/module context. Normal clarification remains available.

A module-level browser context survives component remounts. Shared synchronous operation tracking disables New Question while Ask or feedback is pending, including close/reopen during a request. Release callbacks are idempotent. Request completions carry generation/revision; obsolete completions and obsolete history writes cannot restore discarded context. Shared history avoids stale React persistence effects and publishes pending/completed exchanges to a reopened component. Repeated reset clicks are harmless. No cancellation machinery was added.

Closing without reset preserves session history and receipt; reset then close/reopen remains empty. Session storage exceptions do not prevent immediate memory reset or surface an application error. If browser storage refuses removal, reset durability across full page reload cannot be guaranteed.

Reset returns focus to the composer and announces `New question started` through a polite status region. The standalone page now has a fallback composer ref. Pending reset has a disabled state and explanatory title. No reset HTTP request, feedback event, Stage 7 outcome, logout or navigation is performed.

### Trusted rule identity

`aiSelectedRuleIdentity.js` is a small presentation utility invoked after final applicable evidence selection and exact active-source revalidation. It uses the revalidated chunk's full content, parent rule, and existing structural passage assembly. Selected model text must agree with its selected passages; each passage must belong to the trusted chunk or its existing assembled structural units. Missing/mismatched text is rejected before model prompting. Identity supplied on a retrieval object is ignored.

Separate numeric LWR and letter-bearing USAP start grammars preserve case, validate ancestry against the stored parent, and require a matching structural start in trusted content. Prose cross-references, dates and arbitrary embedded numbers cannot establish identity. Ambiguous continuation fragments fall back to the verified parent. An absent valid parent leaves the rule label empty.

The selected proposition's parent wins when it covers a family of child branches. The implementation does not take the deepest visible number. Independent selected propositions are deduplicated and combined within one source card, capped at four identities and 120 characters; excessive/ambiguous identities fall back to the parent. A separately selected child beginning at its own trusted boundary can retain that child ID. A combined parent/context unit conservatively retains the parent.

The selector and evidence relationships retain their existing parent IDs during selection. After source validation, `chunkRuleNumber` retains the former chunk identity on the returned evidence while `ruleNumber` carries the validated presentation identity. Exact document/version/chunk/page IDs remain the source/access keys. The four-evidence/source limit is unchanged.

Source cards retain their layout and descriptive parent heading. Heading-prefix cleanup removes only an exact parent or selected rule prefix, preventing a parent such as 3 from accidentally stripping the prefix of 3.5. Multiple provisions stay in one card.

The model receives the same selected text with the validated Rule metadata. One instruction permits optional natural references only to those supplied identities, and prohibits inference from cross-references. There were no live model calls during local validation; actual optional model phrasing is a production acceptance check.

### LWR and USAP results

| Selected evidence | Validated identity / result |
| --- | --- |
| Current captured community permission plus roster-availability exception | Rule 3.5; full qualification retained; page 2 |
| Roster-before-play / retroactive additions | Rule 5.5 |
| Incomplete-match parent with multiple medical branches | Rule 5.7, not an arbitrary child |
| Season DUPR establishment | Rule 4.1 |
| Truncation | Rule 4.2 |
| Independently selected establishment and truncation | Rules 4.1, 4.2 in one source |
| Important Dates, including heading plus selected date bullet | No fabricated rule number |
| USAP color, serving, NVZ, damaged-ball and referee provisions | 3.C.3, 7.A.2, 7.A.2.a, 10.G, 10.G.1, 11.A, 11.A.2, 11.A.3, 20.F, 20.F.1 preserved |
| 20.F.1 cross-reference to 10.G.1 | Remains 20.F.1 |
| Forged identity / substituted model text / absent selected passage | Forged ID ignored; substituted or absent text rejected |

Expected current community source presentation is `LWR Pickleball Club DUPR League Rules — Rule 3.5 — PLAYER REQUIREMENTS — Page 2`.

Production-format fixtures come from the prior authorized read-only LMS-0719 diagnosis and existing LMS-0717 capture files. Older captures include historical wording; the current Rule 3.5 test explicitly uses the diagnosis capture with the accepted roster-availability qualification. These are local structural/selection replays, not new production retrieval measurements.

### Feedback, Stage 7 and viewer compatibility

The implementation deliberately uses the existing bounded `ruleNumber` string rather than adding a new structured snapshot field. Tests exercise trusted source resolution through generation, the encrypted feedback receipt serializer, and Stage 7 quality feedback serialization, including combined numeric and lowercase USAP identities. Specific identities survive both source and selected-evidence snapshots. Grounded unvoted outcomes remain lightweight through the unchanged Stage 7 implementation.

No old snapshot is changed or reinterpreted. The active player PDF viewer calls source resolution with exact IDs and no selected answer text; that existing path still revalidates its source without requiring an answer passage. LMS-0718 manager historical ready/superseded authorization and page access are unchanged and remain covered by the baseline suite. Rule identity is never an authorization key.

## Exact LMS-0719 file set

Application:

- `lwrpc-admin/app/components/AskLwrAssistant.js`
- `lwrpc-admin/app/components/AskLwrAssistant.module.css`
- `lwrpc-admin/app/lib/askLwrConversationState.js`
- `lwrpc-admin/app/lib/aiSelectedRuleIdentity.js` (new)
- `lwrpc-admin/app/lib/aiAnswerGeneration.js`
- `lwrpc-admin/app/lib/version.js`
- `lwrpc-admin/package.json`
- `lwrpc-admin/package-lock.json`

Validation:

- `lwrpc-admin/test/lms0719.test.mjs` (new)
- `lwrpc-admin/test/fixtures/lms0719-diagnosis-provisions.json` (new)
- `lwrpc-admin/scripts/verify-lms0719-ui.cjs` (new)
- `lwrpc-admin/test/aiAnswerGeneration.test.mjs` (source fixture now includes revalidated content)
- `lwrpc-admin/test/askLwrAssistant.test.mjs` (storage assertion follows moved ownership)
- `lwrpc-admin/test/askLwrFeedbackState.test.mjs` (pending-reset assertion follows moved ownership)

Documentation:

- `docs/project-roadmap.md`
- `docs/lms-0719-implementation-report.md` (new)

Preexisting uncommitted changes in `docs/lms-0718-implementation-report.md` and `docs/stage-7-ai-feedback-review-design.md` were preserved and not edited during LMS-0719. The roadmap's preexisting acceptance history was also preserved. No commit or push was made.

## Validation

- Full `npm test`: **346 passed**, including all 317 baseline tests and 29 new tests. Existing test coverage was retained; three static/fixture checks were adapted to the moved storage ownership and new content revalidation.
- `npm run lint`: passed, six existing warnings (captain dashboard hook dependency, player answer destructuring, two unused player dashboard declarations); no new warnings.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed.
- `npm run build`: compiled successfully, then hit the established `.next/cache/.tsbuildinfo` EPERM write lock. This is distinguished from a compilation failure.
- Isolated production build: passed using `.next/lms0719-clean`, copied final app/config/package inputs, existing node_modules junction and existing environment inherited in memory without printing credentials. The isolated tracing root is adjusted to the actual repository, following the established workaround.
- `git diff --check`: passed.
- Browser: real component transpiled into an isolated local harness, actual React runtime and built application styles, with mocked auth/guide/HTTP dependencies. Headless Edge passed desktop, 390px and 320px bounds/action-layout checks, pending Ask close/remount, disabled reset during feedback, reset focus/history/storage/no-HTTP, fresh request receipt, reload persistence and standalone focus. No production sign-in, API call, model call or database write was used.

The browser helper accepts `PLAYWRIGHT_MODULE` for an already installed Playwright package and `PLAYWRIGHT_CHANNEL` (defaults to msedge). Run `node scripts/verify-lms0719-ui.cjs` from the app after compiling styles. No dependency installation or package changes are needed on this workstation. Browser results use emulated viewport sizes, not a physical phone keyboard; keyboard hardware and optional live answer wording remain production checks.

## Deployment and exact acceptance sequence — after approval only

1. Review the file set and this report. Commit the approved LMS-0719 files together; include preexisting acceptance documentation only after reviewing it. Confirm app `LMS-0719`, package/lock `0.1.541`, and clean diff checks.
2. Use the normal approved Git/main production pipeline for Vercel `lwrpc-admin`. No SQL migration, environment/HMAC adjustment, corpus processing, document activation or embedding job is needed. Do not deploy from this report without authorization.
3. Verify the intended commit/build is READY and the production app reports LMS-0719. Preserve the accepted LMS-0718 deployment/commit `3911c3d59dfc2c814d7fc13205a3eebca49b0cdb` as the rollback baseline. A rollback is application-only; do not change the database.
4. In player Ask LWR, ask a contextual sequence such as `Can I volley in the kitchen?` then `What if I step in after I hit it?`. Close/reopen first and confirm preservation. Press New Question; confirm empty history/composer, focus, announcement and removal of both browser-session keys. No request should be sent on reset.
5. Ask a short question that could otherwise inherit that subject, such as `What about Saturday?`. Verify null incoming conversational receipt and no inherited kitchen subject; normal clarification is allowed. Reset and close/reopen again; verify it remains empty.
6. Start a pending Ask and close/reopen. Verify New Question stays disabled until completion. Verify it is also disabled during feedback submission. Check desktop, 390px/320px phone widths and a real phone keyboard: full-width composer/action row, visible close control, scrolling, safe-area behavior and reachable content after keyboard close.
7. Ask `My community has a team in my division, but they don't have any room for additional players. Can I play for another community's team?`. Confirm the accepted qualified answer, Rule 3.5 source, PLAYER REQUIREMENTS heading and PDF page 2. Rule 3.5 wording in the answer is permitted but optional.
8. Ask the accepted incomplete-match injury question. Confirm the branch-qualified answer and Rule 5.7 rather than an inappropriate child. Ask the accepted roster-before-play/retroactive-addition question and confirm Rule 5.5 without changing selected evidence or answer scope.
9. Ask Season DUPR establishment, truncation and their combined question; verify 4.1, 4.2 or the combined label only where those passages are selected. Repeat the accepted contextual recording-date question; verify Important Dates retains dates and has no fabricated rule number.
10. Ask the accepted NVZ momentum and serve-foot-fault controls; verify 11.A.2 and 7.A.2.a where selected, correct page links and preserved lowercase letter. Retest damaged/cracked ball replay distinctions, Franklin match ball, reimbursement insufficient evidence and protected live-data controls.
11. Submit one authorized feedback event on an LMS-0719 grounded answer with a specific rule citation. Inspect its receipt/event/review snapshot through the approved read-only verification path: same answer identity, LMS-0719 version, specific source and evidence rule IDs. Confirm prior feedback/Stage 7 records and pre-0719 citation snapshots remain unchanged after New Question. Do not manufacture extra validation events.
12. Verify Stage 7B manager reporting/workflow and an authorized retained superseded-source PDF still work. Keep exact source authorization and historical content distinct from the current evidence.
13. Review capture health and sanitized hosting logs for unexpected errors during this bounded sequence. Stop on unexpected behavior rather than expanding scope. Report acceptance only after these production checks pass; otherwise list blockers. Do not start another LMS version or Live LMS Intelligence.


## Final production acceptance

Authenticated production Ask LWR session, beginning 2026-09-06 01:10:47 UTC. Browser-driven normal questions and exactly one authorized Helpful vote; database verification was read-only. No code, SQL, HMAC/configuration, source processing, corpus, retrieval/applicability or deployment changes in this pass.

| Acceptance item | Result |
| --- | --- |
| New Question persistence | PASS: three exchanges and draft cleared; focus returned; close/reopen stayed empty; short question requested full wording instead of inheriting the prior subject. |
| Normal close/reopen | PASS: visible conversation preserved. The established kitchen sequence produced a grounded momentum follow-up after reopening. Server records separately confirmed retained medical context for the additional selection observation below. |
| Medical issue during match | PASS: Rule 5.7, page 5; both score branches, opponent win and remaining-game substitution/forfeit qualifications retained. No arbitrary child replacement. |
| Can I use a player that's not on my roster? | PASS: Rule 5.5, page 5; before-play roster requirement and qualified retroactive addition / forfeiture behavior retained; treated as general rules, not a live membership query. |
| How is Season DUPR determined? | PASS: Rules 4.1, 4.2 plus Rules 4.5.1, 4.5.2, both page 3. Establishment, truncation and selected NR provisions correspond to actual trusted evidence. |
| Momentum after volley | PASS: Rule 11.A.2, page 30; momentum fault remains applicable even after the ball is dead. |
| Server foot touching court when serve is hit | PASS: Rule 7.A.2.a, page 21; affirmative fault answer; lowercase subrule retained. |
| Weekend roster opening | PASS: Monday Sept. 28, Saturday DUPR League Key Dates in active 2026 Fall League Important Dates, page 1. Direct read-only document check confirms the date; no fabricated rule number. |
| New feedback snapshot | PASS: one Helpful event on the new Season DUPR answer; LMS-0719; source and selected-evidence IDs retained through feedback and Stage 7 review serializers. |
| Historical snapshots | PASS: all 13 pre-0719 feedback rows unchanged by full-row hash; sampled LMS-0716 source remains Rule 11.A, Allowable Contact, page 30. No backfill or reinterpretation. |
| Reset telemetry | PASS: counts and full-row hashes for all five requested entity types unchanged across the isolated reset window. |
| Desktop/mobile | PASS: 640px desktop drawer, useful 452px textarea, 116px action column with New Question above Ask. At 390/320px, full-screen opaque panel, full-width textarea and action row, no horizontal overflow, 44px close control inside boundary, panel-owned scrolling and z-index 10000. Reduced 390x480 viewport retained composer focus and reachable composer. |

### Feedback and historical evidence

The new answer_id is `ba80d652-f06d-4b03-b8cd-80c893a503ff`; Helpful was recorded at `2026-09-06 01:14:45.292398+00`. Exactly one feedback event exists for this answer. It uses the already-required new Season DUPR answer to avoid an unnecessary repeat of the owner's accepted Rule 3.5 check.

Both feedback and Stage 7 review snapshots retain:

- `4.1, 4.2` with `LWR Pickleball Club DUPR League Rules — Rules 4.1, 4.2 — DUPR RATINGS/DIVISIONS — Page 3`;
- `4.5.1, 4.5.2` with its corresponding page-3 citation;
- exact document/version/chunk/page fields, verified by database joins for both source entries.

Rule numbers did not replace authorization identities. The source snapshot retains labels while selected-evidence snapshots retain the existing bounded evidence fields. No new serializer fields or schema change was introduced.

The 13 historical feedback rows have combined full-row hash `389f8eb5b008ed3770e890780d63d87a`, unchanged before/after this pass and matching the pre-0719 acceptance checkpoint. The sampled retained LMS-0716 row hash remains `78804a9f1ab3a2dac1086fe0cb82e2ef`; its Rule 11.A citation and exact source IDs remain intact.

### Reset integrity window

Between `01:13:25.777739` and `01:14:01.007379` UTC, New Question and close/reopen occurred without submitting a question. These counts and full-row hashes were identical:

| Entity | Count | Hash |
| --- | ---: | --- |
| Outcomes | 63 | 3163c63b90dbde3617742171a8826135 |
| Review occurrences | 14 | bfcbfd619d0a21a39bea5843a9abfea7 |
| Question groups | 12 | faccd47ee35526d812b12661a72de9df |
| Manager cases | 12 | 3a063583bd50a777d60e593c395110d1 |
| Feedback events | 13 | 389f8eb5b008ed3770e890780d63d87a |

The next `What if one team has 7 points?` produced the expected full-question clarification and an unresolved_follow_up outcome. Reset itself produced no captured entity. Ten intentionally submitted questions during the full pass produced exactly ten LMS-0719 outcomes: eight answers, one expected clarification and one medical follow-up selection miss. Exactly one feedback event was added.

### Preserved passes and limitations

Owner-confirmed desktop New Question, kitchen/momentum context, reset/no-inheritance, Rule 3.5 identity/roster-availability, Franklin ball and roster/league/PrimeTime clarification passes remain accepted. The kitchen sequence was repeated only to verify the newly requested combined close/reopen plus grounded-follow-up behavior after the medical diagnostic follow-up returned insufficient evidence.

No physical phone keyboard or nonzero hardware safe-area inset was available. Mobile checks use representative browser viewports plus a reduced-height focus check. Browser tooling did not expose sessionStorage or direct HTTP interception: no receipt/token was extracted. Reset context removal is supported by the actual empty reopened UI, post-reset resolver behavior, deployed reset code and prior local storage/race tests. No-request behavior is supported by that no-fetch implementation and live unchanged telemetry, rather than a captured network waterfall. Viewport overrides were reset, and the panel was closed without clearing the final conversation.

An additional medical follow-up, `What if one team has 7 points?`, retained the correct effective question `Regarding Medical issue during match, What if one team has 7 points?`, with priorContextAvailable=true and classification=follow_up, but stopped at stage4_no_applicable_evidence. This is before the LMS-0719 source/citation changes; the relevant conversation/applicability/governing modules are unchanged from accepted LMS-0718. It is not a demonstrated LMS-0719 regression. The captured occurrence is retained for separate future quality diagnosis, and no correction was made. The established kitchen follow-up subsequently passed after close/reopen.

### Deferred typo robustness

The owner accepted the prior diagnosis as pre-existing. Record a future bounded additive interpretation signal for high-confidence minor typos, preserving original wording and applying live-data protection to both original and accepted interpretation. Examples include usin, useing, volly, comunity, roser, linep, seson, damged, craked and misspelled league names. Do not implement broad autocorrect, alter official evidence or start a new version from this record.

Final decision: **LMS-0719 / 0.1.541 PRODUCTION ACCEPTED.** No LMS-0719-specific blocker remains. LMS-0718 / Stage 7B remains production accepted. Only this report and the project roadmap were updated; no push or deployment was performed during acceptance.
