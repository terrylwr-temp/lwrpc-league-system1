# LMS-0718 / 0.1.540 — Stage 7B implementation readiness

Read-only production verification and design, 2026-09-05. **Implementation has not started.** LMS-0717 / 0.1.539 is deployed and production accepted by the owner; LMS-0716 / Stage 7A is complete, accepted and collecting telemetry. Stages 1–6 remain accepted. The application version remains 0.1.539. The governing reference is `stage-7-ai-feedback-review-design.md`, with the production-accepted LMS-0716 schema.

**Assessment:** the collected data and existing table model support the requested initial manager page. One implementation prerequisite needs approval: the current Supabase REST transport has only a capture RPC, not an atomic manager case-update/audit transaction. Recommend a narrowly restricted, function-only migration for that transaction and bounded reporting queries. No new tables, columns or indexes are currently justified. No SQL was written or applied during this pass.

## 1. Production counts

Production project: `glikrmmgirilnmamxxyl`. Snapshot anchor: **2026-09-05 22:34:34.69525 UTC** (18:34 EDT). These are small, test-heavy production counts, not long-term quality trends.

| Table | Rows |
| --- | ---: |
| ai_request_outcomes | 42 |
| ai_review_occurrences | 11 |
| ai_question_groups | 9 |
| ai_question_fingerprint_routes | 9 |
| ai_manager_review_cases | 9 |
| ai_manager_review_events | 9 |
| ai_answer_feedback_events | 13 |

There are **41 player outcomes**: 22 grounded answers (all feedback eligible), nine insufficient-evidence, six clarification and four protected. There are zero final conflicts or technical errors. One additional insufficient-evidence outcome is `manager_test`. All nine cases are New / Normal / Unclassified; eight belong to player groups and one to manager testing. All nine audit events are system `case_created` events. No manager transitions have occurred. No orphan occurrence/outcome or group/case relationships were found; no details were marked purged and no groups redirected.

## 2. Real review examples and retained fields

All examples below have a deterministic group and New / Normal / Unclassified case. Counts are occurrences, not feedback clicks.

| Stored question | LMS | Occurrences | Stored result |
| --- | --- | ---: | --- |
| Does LWR PC reimburse me for lost prescription sunglasses? | 0717 | 2 | insufficient_evidence |
| What is the chemical symbol for tungsten? | 0716 | 2 | insufficient_evidence, player |
| what kind of ball are we using | 0717 | 1 | insufficient_evidence, historical false negative |
| When are they recorded for the weekday league? | 0717 | 1 | insufficient_evidence, historical Season DUPR follow-up |
| Can I join a team in another community? | 0717 | 1 | insufficient_evidence, historical Rule 3.5 false negative |
| What happens if we have a cracked ball when playing a point? | 0717 | 1 | insufficient_evidence, historical cracked-ball failure |
| Are there any color considerations for Paddle? | 0716 | 1 | insufficient_evidence, clarification follow-up |
| Can I volley in the kitchen? | 0716 | 1 | grounded answer with Helpful → Not Helpful |
| What is the chemical symbol for tungsten? | 0716 | 1 | insufficient_evidence, separate manager_test group |

Every reviewable example retains original/effective question, outcome, version, parent outcome, resolver context, group and case. Insufficient-evidence examples retain the fallback text, eight bounded candidate diagnostics, and empty selected-evidence/source arrays: display “No evidence selected,” without treating retrieved candidates as Official Sources.

The kitchen answer completed at **19:57:21.407 UTC**, with Helpful at **19:58:02.029295** and Not Helpful at **19:58:57.98709**. Its occurrence does not duplicate answer text; the existing feedback snapshot retains the generated answer, one source and one selected-evidence item. Join that snapshot for the detail view. Preserve both feedback events while showing one current Not Helpful answer.

Limits to reflect honestly in the UI:

- Candidate snapshots retain at most eight items, not a full Stage 3 trace. Show retained order and available scores; do not invent omitted ranks or exclusions.
- Selected-evidence snapshots are bounded identifiers/roles/reasons, not guaranteed verbatim copies of every minimal passage sent to the model. Historical chunk text, when safely retrievable, must be labeled as such.
- Unvoted grounded outcomes are intentionally lightweight: no complete question/answer detail to display.
- Six clarification and four protected outcomes provide aggregate metadata, not reviewable question/answer histories or a reconstructed conversation. Do not manufacture cases or a clarification completion funnel.
- Missing model, diagnostic or historical source details should say “Not retained,” not be inferred from today's configuration.

## 3. Legacy feedback

Nine distinct legacy answers have **11 feedback events**, without Stage 7A parents: LMS-0712 has three events/three answers, LMS-0713 six/five, and LMS-0714 two/one. No LMS-0715 rows were found. Original/effective question, generated answer and source/evidence snapshot structures remain present.

Use a read-time left join in Feedback reporting, clearly labeled **Legacy — parent telemetry unavailable**. Show actual feedback timestamps; show answer-generation time as unavailable. Do not create outcomes, retrieval records or review cases merely to make these rows fit. Preserve legacy history separately from Stage 7A participation metrics. Initial scope does not require backfill or legacy case creation.

## 4. Metrics calculated from production

Use player-interface outcomes only, latest feedback state per answer as of the reporting cutoff, and answer counts rather than event counts.

| Metric | Calculation | Result |
| --- | --- | ---: |
| Grounded completed answers | G | 22 |
| Feedback-eligible grounded answers | E | 22 |
| Answers receiving feedback | F | 1 |
| Feedback participation | F / E | 4.55% |
| Current Helpful | Latest state | 0 |
| Current Not Helpful | Latest state | 1 |
| Helpful percentage | Helpful / F | 0% |
| Unvoted eligible answers | E − F | 21 |
| Unanswered | U: final insufficient_evidence | 9 |
| Confirmed conflicts | C | 0 |
| Unanswered rate | U / (G + U + C) | 29.03% |
| Conflict rate | C / (G + U + C) | 0% |
| Open player review cases | New + Reviewing | 8 |

Separately: four protected, six clarification, one manager_test outcome. Legacy current feedback is **five Helpful / four Not Helpful**, Helpful percentage **55.56%**; participation cannot be calculated without its missing denominator. Across both cohorts there are ten distinct feedback answers and 13 events, but do not blend these into the default cards. No conflicting latest-timestamp feedback ties were found. Historical false negatives remain historical insufficient-evidence outcomes even after a manager resolves their cases.

## 5. Workflow/schema fit

Production supports New, Reviewing, Resolved and Dismissed independently of category. Categories map to the approved LWR Rule, LWR Guide, Important Dates/source, AI/Retrieval Review, Clarification/wording, USAP/no LWR change, Future Live LMS Intelligence, Not actually a problem and Other, plus Unclassified. Priorities are Normal/High.

Case revision, review cutoff, closure fields and append-only events support audited notes, category/priority changes, resolve/dismiss and explicit reopen without rewriting occurrences. Closing requires a summary; Other requires a note. Reopen requires a reason and clears current closure fields while retaining historical audit events. Reviewing → New also requires a reason. Use a server-derived cutoff for activity actually reviewed, not unseen activity arriving during editing.

New negative/unanswered/conflict activity after a closed case's review cutoff returns it to Needs Review with a new-activity badge, without silently changing its status. Helpful does not automatically close a case. Historical match-ball, Season DUPR and community failures can be categorized AI/Retrieval Review and resolved after a successful manual retest; original occurrences remain intact.

## 6. Navigation

Add **AI Feedback & Review** at `/ai-assistant/review`. Keep AI Assistant Management and Test AI Assistant separate. Use the existing active-route helper with exact matching for these leaf entries, including trailing-slash handling; management must never match the review or console descendant. Use an in-page detail drawer so detail navigation does not require broad parent matching.

## 7. Summary cards

Grounded Answers **22**; Feedback Participation **4.55%**; Helpful **0%**; Not Helpful **1**; Unanswered **9**; Open Review Cases **8**, for the default player cohort at this snapshot. Explain denominators and show “No feedback” rather than 0% when a filtered denominator is zero. No charts are needed initially.

## 8. Tabs/sections

Use Needs Review, Unanswered, Feedback and Resolved. Needs Review includes New/Reviewing and closed cases with qualifying new activity; offer type filtering for Not Helpful, Unanswered and Conflict. Make confirmed conflicts prominent there; zero current conflicts do not justify a separate tab. Feedback shows one current row per answer with transition history, including clearly separated legacy rows. Resolved includes Resolved/Dismissed and exposes subsequent-activity badges.

## 9. Main table

Columns: **Status · Priority · Question / Group · Type · Occurrences · Latest Activity · LMS Version · Category · View**. Emphasize repeated occurrence counts. Group version should mean latest occurrence version, with all retained versions in detail. Do not expose auth/member IDs. Use accessible row actions, responsive stacked rows or contained horizontal scrolling, and a mobile full-width detail view.

## 10. Filters/search

Initial filters: bounded question text, date range, status, type, source family (LWR/USAP/Mixed/None), LMS version; explicit optional manager-test inclusion defaulting off. Feedback also needs Helpful/Not Helpful and legacy/cohort filtering. Default to a clearly displayed 30-day window with timezone-aware UTC bounds. Explain that outcome cards use completion dates, while queue activity includes later feedback/occurrence ingestion. Apply a common as-of cutoff and label differing date semantics.

Search retained original/effective/group question fields only, maximum 200 characters, with escaped wildcard input and parameterized bounded queries. Derive source family from retained shown/selected sources, not tangential candidates. Do not add inferred topics or member search.

## 11. Detail view

Display original/effective question, completion/observation times, version and result; retained generated answer or fallback; sources/rule/page and selected roles/reasons; expandable bounded diagnostics, resolver context and model when present. Clearly distinguish candidate evidence from selected evidence. Include paginated related occurrences with every retained original wording, feedback transitions/current state, and manager status/category/priority/notes/audit history with Resolve, Dismiss and Reopen actions. Fetch snapshots only on opening detail. Display unavailable historical data honestly.

## 12. Deep links

**Retest Question** opens Test AI Assistant with effective question (original as fallback) prefilled through a short-lived local handoff; no question text in the URL and no automatic submission. Do not pass user identity, conversation receipts or old answers as new test context.

The existing official viewer resolves active sources. Historical review therefore needs a separate manager-authorized historical source path that validates document/version/chunk relationships and permissions before issuing a short-lived link or streaming the page. Label inactive historical versions explicitly; never substitute today's active source. Unavailable/deleted historical files remain unavailable. Link validated document IDs to AI Assistant Management without activating or editing documents.

## 13. Protected demand

All four protected outcomes use `raw_live_data_guard`; no reliable rating/team/schedule subtype breakdown is retained. A small informational count may say **Future Live LMS Intelligence demand: 4 — category unspecified**. Defer category cards. Protected outcomes are not unanswered cases or missing-rule problems. Do not recover original protected questions or start live intelligence.

## 14. Authorization

Commissioner and League Manager only; exclude Club Pro, captain and player. Existing server authorization at `league_manager` admits the two intended roles under current role levels. Authenticate and resolve the database-backed role for every list, detail, source and mutation request; never trust browser-supplied actor identity. Use private/no-store responses and server-only Supabase credentials.

Live catalog checks confirmed RLS on all six tables, no SELECT access for anon/authenticated, no service-role DELETE on any of the six, and no service-role UPDATE on outcomes or audit events. Capture RPC execution is denied to browser roles and allowed to service_role. Preserve this state. This pass inspected privileges, without attempting mutation probes.

## 15. Required APIs and manager operations

Proposed authenticated routes under `/api/ai-assistant/review`: GET `summary`, `cases`, `feedback`, `groups/[id]` (with paginated occurrence/history reads); POST `cases/[id]/actions`; POST `sources` for historical viewing. Keep all table access behind server routes.

Actions: set status/category/priority, append note, resolve, dismiss, reopen. Validate transition, required reason/summary, expected revision and bounded input. Derive actor server-side. A transaction must lock the case, check revision, update state and append audit events together. Use the established operation ID/event ordinal uniqueness for retries and reject reused IDs with different actor/target/payload. Return a conflict response for stale edits. No direct browser writes, editable audit history or deletion actions.

## 16. Merge/split

Defer both. Repeated tungsten and reimbursement questions already group deterministically, manager testing remains separate, and there are no redirected groups demonstrating an immediate need. Preserve the approved future merge/split model; do not implement it or assignment tooling merely because supporting fields exist.

## 17. Migration assessment

**The tables fit; a zero-migration implementation is not supported by the current transport for atomic manager writes.** Production exposes `capture_ai_quality(...)`, but no manager case/audit transaction helper. Supabase REST calls made sequentially cannot provide the required cross-table atomicity. A trusted direct Postgres transaction is an alternative, but no established application connection/driver was found; adding one would introduce additional infrastructure.

Recommend approval for an additive **function-only migration**: a manager-operation RPC and bounded reporting RPCs where aggregation/pagination requires them. The mutation helper should use the existing service-role permissions (SECURITY INVOKER), fixed search path and explicit EXECUTE revocation from PUBLIC/anon/authenticated, granting only service_role. HTTP routes remain the manager authorization boundary. Do not modify the capture RPC, existing table grants, schema fields, HMAC or default privileges. Test effective permissions and replay idempotency before application. No SQL has been created in this pass.

## 18. Performance/query plan

Use server pagination: 25 default, 50 optional, 100 hard maximum; stable activity timestamp plus ID cursors bound to filters. Summaries must aggregate without downloading answer snapshots. Compute latest feedback per answer before counting, preserving transition history separately; do not use UUID order as causal ordering for conflicting simultaneous votes. Handle ambiguous ties explicitly rather than inventing a latest state.

Existing indexes cover outcome time/origin/kind/eligibility, occurrence group/time and origin/kind/time, group origin/family/activity, unique case group and status/priority/update time, category/status, event case/group time and unique operation/ordinal. Feedback has an answer/user/time index. Queue activity must consider new feedback and occurrence observation times rather than group last-seen alone, including a late vote on an older answer.

Read-only EXPLAIN ANALYZE on current data: a representative player New/Reviewing case join returned eight rows in **0.190 ms**, using group-origin and unique case-group indexes; a player/date summary scanned 41 rows in **0.146 ms**. These are database execution times on a tiny dataset, not browser latency or scale benchmarks. No new index is justified now. Validate the full latest-feedback/new-activity/search queries against representative volume before proposing an index. Avoid unlimited history loads or full snapshots in list responses.

## 19. Capture-health indicator

Reuse the manager-only capture-health endpoint. It returns **unknown** with last recorded time and an independent operator-log verification requirement after a successful database read, or **degraded** on failure. It cannot prove “Recording.” Show “Status unknown — last recorded …” or “Degraded,” with a concise explanation. Latest retained outcome at this snapshot was **22:31:19.13558 UTC**. Keep the accepted Stage 7A log-verification/failure-injection limitations; a recent row is not end-to-end health proof.

## 20. Exact proposed LMS-0718 scope

Implement only the manager page, bounded reporting/detail APIs, audited case actions, safe manual retest handoff, manager historical source viewing, focused tests and documentation. Likely new files: `lwrpc-admin/app/ai-assistant/review/page.js`, review components, server review-query/action helpers, routes described above, a narrowly scoped RPC migration and review test files. Existing files likely touched: `app/lib/adminNavigation.js`, `app/ai-assistant/console/page.js` for prefill only, `app/lib/version.js`, package/version lock references and project documentation. Paths are relative to the app unless prefixed otherwise.

At implementation, update to **LMS-0718 / 0.1.540** and create its implementation report. No application version change now. Defer merge/split, assignment tooling, topic classification, charts, exports, retention jobs and Live LMS Intelligence. Preserve the approved retention policy (180-day detail/feedback and 365-day lightweight telemetry); do not initiate deletion during this UI work. No changes to retrieval, selection, generation, guards, clarification, player UI, feedback capture, corpus or Stage 7A capture are needed.

## 21. Acceptance plan

1. Reconcile cards with read-only SQL for identical cohort/cutoff; verify latest-vote transitions count answers once, zero denominators, legacy separation and manager-test exclusion.
2. Verify all three AI navigation active states, pagination/filter cursors, responsive layout, keyboard/focus behavior, empty/error states and lazy detail loading.
3. Confirm retained questions/answers/source versions and bounded diagnostics render accurately; missing fields remain explicitly unavailable. Confirm no signed URLs, credentials or unnecessary identities in lists/logs.
4. Test Commissioner/League Manager access and denial for Club Pro/captain/player/anonymous on every route, including historical sources; verify browser RLS and effective RPC privileges remain restricted.
5. In isolated tests prove state/audit atomicity, rollback, concurrent revision conflicts, retry idempotency, required notes/summaries and immutable audit history. Verify migration replay and unchanged Stage 7A/table permissions.
6. With production mutation authorization, manually retest a historical match-ball, Season DUPR or Rule 3.5 case; classify AI/Retrieval Review, add a note, resolve and verify retained occurrences/audit. Test explicit reopen/dismiss and new activity after review cutoff without silently reopening. Do not perform these writes during this verification pass.
7. Verify Retest prefills without submitting and produces manager_test only after explicit Run; verify historical inactive source viewing never substitutes an active version.
8. Verify protected and clarification counts remain outside unanswered metrics, health never overclaims Recording, and capture/player payload/UI behavior remains unchanged.
9. Preserve the complete LMS-0717 regression suite; run npm test, lint, TypeScript no-emit, PDF server-bundle verification, production build and git diff --check. Use the established isolated clean build if the known cache lock occurs after compilation, reporting it distinctly.

This pass used production SELECT/catalog queries and read-only query plans only. No production records, SQL, application code, application version, deployment or AI behavior were changed. Only project status and this readiness documentation were updated. **Stop for review; implementation requires approval, including the transaction-helper migration scope.**
