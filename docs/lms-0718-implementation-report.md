# LMS-0718 / 0.1.540 — Stage 7B AI Feedback & Review

2026-09-05. **DEPLOYED; PRODUCTION ACCEPTANCE BLOCKED.** LMS-0718 / 0.1.540 is live. Historical-source handling failed acceptance as detailed below; Stage 7B is not complete. LMS-0717 / 0.1.539 remains the accepted rollback baseline; LMS-0716 / Stage 7A remains accepted. The local implementation/validation sections below are preserved as historical checkpoints.

## Migration and server security

Exact migration: `lwrpc-admin/supabase-ai-assistant-lms-0718-stage7b.sql`.

It creates/replaces only four functions, within a transaction:

| Function | Purpose |
| --- | --- |
| `ai_review_case_action(uuid,uuid,uuid,integer,text,text,text,timestamptz)` | Atomic manager case mutation and append-only event. |
| `ai_review_feedback_state(timestamptz)` | Latest feedback per answer before filtering, with ambiguous simultaneous opposite votes represented explicitly. |
| `ai_review_group_rows(timestamptz)` | Lightweight group/case/activity aggregation without answer/source payloads. |
| `ai_review_report(jsonb)` | Bounded summaries and paginated queue/feedback reporting. |

All use SECURITY INVOKER and fixed `pg_catalog,public` search paths. EXECUTE is explicitly revoked from PUBLIC, anon, authenticated and service_role before granting only service_role. No existing table, column, index, capture function, table ACL, default privilege or feedback schema is altered. No new reporting copies of data are created.

The mutation uses a short transaction, an operation-ID advisory lock and **group → case** row-lock order matching Stage 7A capture. This order was checked during implementation to avoid a possible inverse-lock wait involving capture and the audit insert's foreign keys. Case revision checks reject stale edits. A retry with the same operation/actor/target/decision returns the earlier result; mismatched retries fail. The case update and audit insert either both commit or both roll back. Manager identity comes from the server-authenticated user, never the submitted body. Signed, actor-bound review tokens carry the revision and displayed retained activity cutoff; the cutoff never blindly advances to wall-clock time. Later arrivals remain outstanding.

Every HTTP operation authenticates Commissioner or League Manager using the established server authorizer and an explicit two-role allowlist. Club Pro, Captain, Player and anonymous access are denied. Responses are private/no-store; raw auth/member identifiers are not projected to the manager UI. Browser access to the Stage 7 tables remains RLS/privilege-protected. No new environment variable or HMAC-key change is required.

## Manager interface and reporting

**Route:** `/ai-assistant/review`. AI Feedback & Review is a separate System Setup entry. AI Assistant Management and Test AI Assistant remain separate. All three AI leaf entries use exact route matching, including trailing slash handling.

**Cards:** Grounded Answers, Feedback Participation, Helpful %, Not Helpful, Unanswered and Open Review Cases. Participation uses distinct eligible answers with feedback divided by eligible grounded player outcomes. Helpful % uses current unambiguous Helpful divided by current unambiguous feedback answers; unvoted answers are excluded. Opposite latest-timestamp ties are not resolved using UUID order. Helpful → Not Helpful is one currently Not Helpful answer with both transitions retained. Manager tests, protected outcomes and clarifications are excluded from unanswered metrics. Legacy feedback does not manufacture denominators. The page explains that this is small/test-heavy activity and capture is best effort.

**Views:** Needs Review, Unanswered, Feedback and Resolved. Confirmed conflicts sort first in Needs Review, followed by High priority. New/Reviewing cases and closed cases with new negative/unanswered/conflict activity are included. Resolved/Dismissed retain their status until explicit reopen. Later Helpful votes do not delete cases. Unanswered groups emphasize occurrence counts. Feedback has one latest-state row per answer and separate chronological event history.

**Columns:** status, priority, question/group, type, occurrences, latest activity, LMS version, category and View. Feedback uses current vote, question, feedback time, answer time, version, source family, case state and View.

**Filters/pagination:** literal bounded question search (200 characters), date range, status, type, source family and LMS version. Dates are explicitly UTC filter bounds; rendered timestamps use the device timezone. Date/version/source filters apply to cards; search/status/type apply to lists and are labeled accordingly. Default 30-day window; 25 rows per UI page; server supports 25/50/100 with a 100-row maximum. Signed cursors bind actor, filters, as-of time and stable priority/activity/ID ordering. Summary and list calls share an as-of cutoff. Detail/history loads separately in pages of 25. New activity remains refreshable; the UI does not claim immutable historical case state across concurrent edits.

**Detail:** original/effective question, completion/observation dates, LMS version, result, retained answer/fallback, Official Sources, selected roles/reasons, source family/model and an expandable bounded technical snapshot. Full Stage 3 traces, omitted exclusions and missing answer/model data are labeled unavailable. Related occurrences preserve each original/effective wording and can be opened individually. Feedback displays current state and append-only chronological history. The native modal contains focus, supports Escape/close, owns scrolling and locks background scrolling; mobile uses the usable viewport with safe-area padding. Styles are scoped to review content, leaving the shared sidebar appearance intact.

**Workflow:** New → Reviewing, New/Reviewing → Resolved/Dismissed, Reviewing → New with reason, and Resolved/Dismissed → Reviewing with reopen reason. Closing requires a 1–2,000-character summary. Notes are append-only, maximum 4,000 characters. Category/priority changes and explicit “Mark displayed activity reviewed” append events. The exact existing category enum is used; Other requires a note. Priorities remain Normal/High. Actor attribution stays stored in the database; the UI labels events Manager/System without exposing raw auth IDs.

Historical match-ball/Season DUPR/Rule 3.5 failures can be classified AI/Retrieval Review and resolved after manual retest. Occurrences are not deleted or rewritten. Existing retention policy remains unchanged; no retention or backfill job runs in this release. Manual merge/split, assignment tooling, charts, topic classification and Live LMS Intelligence remain deferred.

## Legacy data, safe links and health

Parentless feedback remains visible in Feedback with “Legacy — parent telemetry unavailable.” Answer completion time stays unavailable; actual event times and retained question/answer/source/evidence snapshots remain usable. No parent outcomes, retrieval records or review cases are fabricated for legacy rows.

Retest Question places the effective/original text in a five-minute, one-time session-storage handoff and opens Test AI Assistant. No question text goes in the navigation URL, no conversation receipt is copied, and no test is auto-submitted. The console's existing 1,000-character manual request limit remains unchanged: longer retained effective questions can be prefilled intact but must be edited before execution through that existing pipeline. No normalized/effective text is truncated by this release.

Historical document links use a separate manager-only POST operation. The server selects the source from the stored answer snapshot by index, validates its document/version/chunk relationship and issues a five-minute link to that exact file/page. Inactive versions are labeled Historical/inactive; no current source is silently substituted. Unavailable sources fail honestly. AI Assistant Management remains a navigation destination, with no processing/activation controls added here. The existing player Official Sources/citation viewer is untouched.

Protected demand is an informational count labeled Future Live LMS Intelligence demand, category unspecified; raw protected questions are not reconstructed. Capture health reuses the accepted endpoint and displays Unknown or Degraded, with last recorded time and the independent operator-log verification caveat. It never infers Recording from a recent row.

## API and query implementation

`/api/ai-assistant/review` uses a single protected dispatcher:

- GET (default): summary or queue/feedback report, selected by `tab`.
- GET `op=detail`: one retained answer/occurrence and optional case.
- GET `op=history`: paginated occurrence, feedback or audit history.
- POST (default): validated case action with signed review token and operation ID.
- POST `op=source`: validated historical source link.

This consolidates the readiness report's suggested subroutes without changing authorization or data boundaries. Overview projections omit full answers, source arrays and diagnostic snapshots. Latest feedback is calculated in SQL before filtering; group aggregation uses existing indexes and includes late feedback timestamps. No per-row document lookup occurs in overview. Source lookup is two bounded metadata reads only when a manager requests a cited source. Read RPCs have a five-second statement setting; mutations use a three-second statement and 250ms lock setting. No new index was demonstrated necessary; production-scale query/hosting latency remains a deployment acceptance observation.

## Exact files changed

Paths are relative to `C:\lwrpc-league-system`.

| File | Change |
| --- | --- |
| `lwrpc-admin/supabase-ai-assistant-lms-0718-stage7b.sql` | Four-function migration only. |
| `lwrpc-admin/app/ai-assistant/review/page.js` | Manager reporting and review UI. |
| `lwrpc-admin/app/ai-assistant/review/review.module.css` | Scoped responsive review styles. |
| `lwrpc-admin/app/api/ai-assistant/review/route.js` | Dynamic Node server endpoint. |
| `lwrpc-admin/app/lib/aiReviewHttp.js` | Authenticated HTTP dispatcher and safe errors. |
| `lwrpc-admin/app/lib/aiReviewService.js` | Reporting/detail/history/action/source services and signed cursors/tokens. |
| `lwrpc-admin/app/lib/aiReviewShared.js` | Category/status labels, role allowlist, metrics formatting and one-time prefill reader. |
| `lwrpc-admin/app/lib/adminNavigation.js` | Separate review entry and exact AI leaf matching. |
| `lwrpc-admin/app/ai-assistant/console/page.js` | Prefill consumption only. |
| `lwrpc-admin/app/lib/version.js` | LMS-0718. |
| `lwrpc-admin/package.json` | 0.1.540; dependencies unchanged. |
| `lwrpc-admin/package-lock.json` | Root/package version 0.1.540 only. |
| `lwrpc-admin/test/aiReviewDatabase.test.mjs` | Isolated actual PostgreSQL migration/report/workflow tests. |
| `lwrpc-admin/test/aiReviewService.test.mjs` | Authorization, navigation, tokens, filtering, detail, legacy/source and UI regressions. |
| `lwrpc-admin/scripts/verify-ai-review-ui.mjs` | Repeatable local-only Playwright verification with synthetic responses and external requests blocked. |
| `docs/project-roadmap.md` | Accepted production baseline and local LMS-0718 status. |
| `docs/stage-7-ai-feedback-review-design.md` | Stage 7B implementation checkpoint and explicit deferred scope. |
| `docs/lms-0718-implementation-report.md` | This report. |

Also present from the preceding approved readiness pass: `docs/lms-0718-stage7b-readiness-report.md` and the owner-acceptance status correction in `docs/lms-0717-implementation-report.md`. Historical LMS-0716/0717 implementation checkpoints are preserved.

## Validation

| Check | Result |
| --- | --- |
| Full `npm test` | **310 passed**, including all 283 existing tests unchanged. |
| `npm run lint` | Pass; six pre-existing warnings, no new warnings. |
| `npx tsc --noEmit --incremental false` | Pass. |
| `npm run verify:ai-pdf-server-bundle` | Pass on normal compiled output and isolated production output. |
| `npm run build` | Compiled successfully; known `.next/cache/.tsbuildinfo` EPERM prevented cache writing. Not reported as a successful normal build. |
| Established isolated clean production build | Pass: compilation, TypeScript, 72/72 pages and optimization. |
| Desktop/mobile local browser flow | Pass with synthetic data: cards, workflow, retained occurrence, modal containment/Escape, health Unknown and prefill without model submission. |
| `git diff --check` | Pass. |

The isolated build uses ignored `.next/lms0718-clean-build`, source copies, the existing dependency junction and inherited local environment without copying/printing secrets. Browser verification uses the bundled Playwright runtime because agent-browser CLI was unavailable. Local screenshots are under ignored `.next/lms0718-ui`; external browser requests and live API calls were intercepted. These are UI fixture checks, not production role/account acceptance.

Database tests use isolated PGlite PostgreSQL with production-like default grants and the exact migrations. They verify unchanged table ACL/RLS state, migration replay, effective browser denial, immutable audit/no-delete restrictions, latest-state/legacy metrics, literal search, priority/keyset pagination, allowed/invalid transitions, retry mismatch, stale/competing revisions, mark-reviewed, historical occurrence preservation, new activity on a closed case and rollback when audit insertion fails. Physical multi-connection production contention was not load-tested.

## Deployment and production acceptance — requires review/authorization

1. Review this implementation and the exact function-only migration. Confirm production project `glikrmmgirilnmamxxyl` and hosting project `lwrpc-admin`; verify no unexpected collision with the four function signatures. Record existing Stage 7/feedback/capture definitions, table ACLs/RLS and data counts for comparison. Stop on unexpected objects or permissions.
2. Apply **only** `supabase-ai-assistant-lms-0718-stage7b.sql`. Do not reapply LMS-0716. Verify all four definitions, invoker rights, search paths and effective EXECUTE permissions; anon/authenticated/PUBLIC denied, service_role allowed. Verify existing tables, capture function, ACLs and data remain unchanged.
3. Deploy LMS-0718 / 0.1.540 through the normal production pipeline, after database security verification. No new environment configuration or corpus/document processing is required.
4. Verify Commissioner/League Manager access and Club Pro/Captain/Player/anonymous denial on page and all API operations. Check exact navigation selection and desktop/mobile layout.
5. Compare cards and paginated views against direct read-only database calculations with identical date/cohort/as-of filters. Check latest votes, legacy labeling, manager-test exclusion, protected/clarification separation and Unknown/Degraded health wording. Do not reuse the readiness snapshot's counts as current acceptance values.
6. With controlled workflow authorization, select an existing historical defect, explicitly Retest, confirm correct current behavior, classify AI/Retrieval Review, add a note and Resolve. Verify the original occurrence remains and each mutation has one attributed audit event. Exercise Dismiss/Reopen only as approved; inspect retry/revision behavior without manufacturing player feedback.
7. Verify the exact historical/current source label and cited page, safe unavailable-source behavior, related occurrence/history pagination and no automatic test execution. Check query/hosting latency and capture-health/log observations without production load or outage injection.
8. Verify player Ask LWR payload/UI, retrieval, selection, guards, resolver, feedback controls, citations and Stage 7A capture remain unchanged. Record production acceptance separately before marking Stage 7B accepted.

If rollback is needed, roll the application back to accepted LMS-0717 while leaving the additive functions and original Stage 7A data intact; no destructive schema rollback is required. The preceding local implementation checkpoint was not deployed; the controlled production checkpoint below supersedes that status.

## Controlled production checkpoint — 2026-09-05

Owner authorized migration, deployment and bounded acceptance. Production project `glikrmmgirilnmamxxyl` confirmed healthy. Rollback application baseline is LMS-0717 / 0.1.539, commit `5975ee683c2f85a0b6d0f3424c89de43abc3780a`, Vercel deployment `dpl_FddvP5anKEmdW15xzgHq3ASH8QtQ`. Fresh browser navigation confirmed LMS-0717. Retained HMAC grouping versions remain `[1]`; no environment configuration was changed or secret read.

The four-function migration was applied successfully. Immediate comparison at 23:41 UTC verified identical hashes/counts for all six Stage 7A tables, existing feedback, documents, versions and chunks. Public table schema/ACL hash and all pre-existing function definition/ACL hashes remained identical. Each new function body hash matches the local reviewed migration. All four are SECURITY INVOKER with fixed `pg_catalog, public` search path; workflow timeouts are 3s/250ms, reporting statement timeout 5s. Effective EXECUTE: service_role allowed; anon/authenticated/PUBLIC denied, with only owner and service_role in ACLs. Production application deployment and acceptance remain pending at this checkpoint.

## Controlled production acceptance result — stopped for review

Release commit `d0e81494da4bf1459bbabd2ced810a5ec3607ca5` was pushed through the normal main-branch Git pipeline. Vercel deployment `dpl_5dQwwAXu9yQjZYsS9Q8bgCxbkur5` became READY at 23:44:30 UTC and is aliased to `league.lwrpickleballclub.com`. Hosted compilation/deployment/cache upload succeeded. The live footer displays LMS-0718. No environment variables changed.

**Blocker:** the LMS-0713 legacy question `what does an NR DUPR rating mean` retains a DUPR League Rules citation. Preparing its link returns `Historical source unavailable.` Read-only database inspection confirms the exact version exists, its chunk exists and matches that version, and the version is inactive with `processing_status = superseded`. `aiReviewService.js:129` requires `processing_status === ready`, so it rejects this retained historical version before signing. This prevents the required inactive-version historical link/label acceptance. No current document was substituted and no data was exposed. A separate bounded correction must review safe support for retained superseded versions with the same exact document/version/chunk checks; **no correction or further deployment was made**.

| Requested gate | Production result |
| --- | --- |
| 1. Preflight/migration | Pass; correct project, no collisions, function-only migration applied once; LMS-0716 not reapplied. |
| 2. Function permissions | Pass; all four exact source hashes/configurations and effective EXECUTE checked; existing schema/functions/ACLs unchanged. |
| 3. Deployment | Pass; Git commit/deployment above, live LMS-0718. |
| 4. Authorization | Commissioner page/report/detail/history/workflow/source path worked. Anonymous report/detail/history/mutation and capture-health requests returned 401. Other roles have isolated role-matrix evidence; no production role/account changes or additional safe sessions used. |
| 5. Navigation | Three separate AI entries present. Review alone had `aria-current=page` and selected styling at desktop 1280x900 and mobile 390x844. Full other-route live navigation sweep remains pending; existing regression tests passed. |
| 6. Metrics | Initial live cards matched independent SQL: grounded 24; participation 1/24 = 4.17%; Helpful 0/1 = 0.00%; Not Helpful 1; unanswered 9; open cases 8. Manager retest did not increase player cards. Resolving the one case reduced open cases to 7. |
| 7. Needs Review | All eight player cases visible including reimbursement, tungsten, match ball, Season DUPR, community and current Not Helpful. Required columns present. |
| 8. Detail | Original/effective question, historical fallback/answer, version/timestamps, evidence, bounded-diagnostics control, occurrences, feedback and review section present. Mobile modal measured x/y=0, 390x844, overflow auto and body scroll locked. Close/Escape worked. Expanded diagnostics and full keyboard sweep remain pending. |
| 9. Workflow/audit | Only community group `739fa168-68a3-4d71-baed-97d8334c4268` changed. New → Reviewing, AI/Retrieval Review category, append note, Resolved; direct database verification passed. |
| 10. Reopen | Same case Resolved → Reviewing → Resolved; final revision 7, category retained. Six manager events appended, seven total including original creation, seven distinct operation IDs; no history overwritten. Actual production retry injection not performed; isolated retry tests retained. |
| 11. Legacy | Ten latest-state feedback rows (nine legacy). LMS-0713 match-ball and NR detail retained question/answer/evidence and actual feedback times. Missing answer timestamp shown Not retained; no invented parent/case. |
| 12. Grouping | Tungsten one group/case, count two, two individually selectable occurrences; original question preserved. No new tungsten requests or merges. |
| 13. Historical sources | **Blocked** for retained superseded Rules version as above. Current active Captains Guide link prepared with current label and five-minute expiry. External PDF opening was not confirmed by the in-app browser; no claim of completed viewer verification. |
| 14. Retest | Community question prefilled console without submission. Explicit click returned grounded Rule 3.5 answer with own-community team, same-division and available-roster qualification. UI total 3097ms (retrieval 1329ms, validation 149ms, generation 1604ms). One separate manager_test outcome; historical occurrence unchanged. |
| 15. Protected demand | Informational category-unspecified count 4, separate from failures; clarification count 6. No protected question text on review dashboard. |
| 16. Capture health | Commissioner endpoint-backed UI shows Unknown and independent-log caveat, recent recorded time; never Recording. Anonymous denied. |
| 17. Player sanity | One LWR question `What kind of ball are we using?` completed as grounded Franklin Outdoor X-40 Optic answer with Helpful/Not Helpful and Official Source. Mobile composer/disclaimer and preserved session history visible. USAP/protected checks not run after blocker; full desktop player sanity pending. No feedback clicked. |
| 18. Database integrity | Pass for all actions completed; details below. |
| 19. Limitations | Unavailable production role sessions covered only by isolated evidence as authorized. Pending checks listed above were not claimed passed. No load/outage/retry injection or synthetic data. |
| 20. Acceptance | **LMS-0718 deployed, NOT production accepted; Stage 7B incomplete.** Stop for owner review before bounded correction/resumption. |

### Final integrity snapshot, 23:53 UTC

- Outcomes 44 → 46: exactly one LMS-0718 manager_test grounded answer and one player_interface grounded answer. Original 44-row hash remained `5b88e91744b09cd9069f1927756b6e6c`.
- Occurrences 11 unchanged, full-row hash `05520072e4fe882a16313669890d81d6`; groups 9 and fingerprint routes 9 unchanged with identical hashes; key versions remain `[1]`.
- Cases 9, exactly one updated. Manager audit 9 → 15, six authorized sequential revisions 1→7. Original nine audit rows hash unchanged (`023a941e6412f509cb8605fdbd8ec0b1`).
- Feedback 13 unchanged, hash `389f8eb5b008ed3770e890780d63d87a`. No feedback/synthetic events created.
- Documents 7, versions 19, chunks 1507: counts and complete row hashes unchanged.
- Public table schema/RLS/ACL hash `7e8ac1332095929f0be79cc5b7b58cdd` and pre-existing function definition/ACL hash `1e10fe81c4877e98f144b9b929362c9b` unchanged.

The approved future **New Question** UI requirement is recorded in the roadmap only. No next LMS version, Live LMS Intelligence, corpus processing, code correction or further production action was started after the blocker. This acceptance record is a local documentation update; it was not pushed to trigger another deployment.

## Approved bounded historical-source correction

The owner subsequently authorized correction and deployment within LMS-0718 / 0.1.540. The actual version CHECK enum is queued/processing/ready/failed/superseded; document states are active/inactive/archived. Manager review now permits only ready and superseded versions. Current document inactivity/non-current identity does not invalidate retained historical evidence. Queued, processing, failed, missing and mismatched versions/chunks remain denied. No player viewer changes, migration, workflow function or snapshot mutation is involved.

Exact application files: `app/lib/aiReviewService.js` (bounded lifecycle gate and lifecycle label metadata), `app/ai-assistant/review/page.js` (Historical Source — Superseded/Inactive label and explicit retained-response/current-governing distinction), `test/aiReviewService.test.mjs` (seven additional regression cases including the full source endpoint role matrix). Documentation changes are this report, roadmap and Stage 7 design checkpoint.

The POST endpoint still receives answer ID and source index; document/version/chunk identities come only from the server-loaded review/feedback snapshot. A browser-supplied unrelated version is ignored and cannot replace that identity. Exact document/version/chunk relationship and retained storage path are verified before the unchanged five-minute signing operation. Commissioner/League Manager only; other roles remain denied before reads/signing. Existing normal player viewer active-source rules are untouched.

Automated correction validation: 317 tests passed, including unchanged player-viewer tests, current and superseded versions, legitimate inactive document, queued/processing/failed denial, missing/mismatched identity denial, no-snapshot denial, ignored arbitrary browser version, signing duration/path, and immutable in-memory snapshots. Lint passed with the same six existing warnings; standalone nonincremental TypeScript passed; compiled PDF worker verification passed. An initial label encoding issue was fixed before final testing. Normal build compiled successfully then hit the established cache .tsbuildinfo EPERM; isolated build result and production acceptance are recorded below when complete.
