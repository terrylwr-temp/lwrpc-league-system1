# LMS-0749 — AI Feedback Drill-Down & Question History

Local implementation and verification, September 19, 2026. Application version: **LMS-0749 / 0.1.572**. **Not deployed. The migration has not been applied to production.**

## Delivered behavior

The existing AI Feedback & Review page now begins with AI Question & Answer History. Total Requests, Helpful, Not Helpful and No Feedback cards immediately filter the list below. An Ambiguous card appears when opposing official feedback votes share the latest timestamp; these are not counted as No Feedback. The selected card is visibly highlighted and exposed through `aria-pressed`.

All cards share the selected date range, origin and applied search. Date choices are rolling Last 7, 30 or 90 days, or All retained history; 30 days is the default. Origin can include all recorded origins or narrow to Ask LWR PC AI, manager tests, View As, or legacy/unknown records. Search matches retained question/answer text and available current member names. Role search is intentionally absent because historical roles were not recorded.

The server returns 25 interactions per page, ordered by interaction date and request ID. Next/Previous use a signed cursor bound to the administrator, filter controls and original event cutoff. Refresh starts a new cutoff on page one. Counts cover the entire matching retained population; the browser receives only the current page. Completion time is used where available; legacy records otherwise identify the first recorded event. Times display in the device timezone.

Each row shows date, available user name, question and answer previews, feedback and available total response time. View details opens the entire retained question, effective question when different, and answer, plus feedback, recorded context and expandable sanitized diagnostics. Long detail text is not truncated by this feature. Native dialog behavior provides keyboard focus containment, Escape/Close, and focus return. Mobile rows preserve accessible table headings.

Existing Live feedback diagnostics, quality indicators, review queues, case actions and Approved Answers remain available. Their separate filtering is explicitly labeled. The former supporting Not Helpful card is replaced with Feedback Received to avoid presenting a second, differently scoped Not Helpful count.

## Existing data reused

| Existing source | Fields and purpose |
|---|---|
| `public.ai_request_outcomes` | Request/answer `id`, request/completion/record timestamps, origin, final kind, version, source family, `total_ms`, and allowlisted `diagnostic_snapshot` metadata. Supplies requests without feedback. |
| `public.ai_answer_feedback_events` | `answer_id`, latest `created_at`/`helpful`, recorded `member_id`, original/effective questions, `generated_answer`, source/selection snapshots and version. Supplies retained official-answer text and votes. |
| `public.ai_review_occurrences` | `answer_id`, completion/first-observed/record times, origin/kind, original/effective questions, `output_text`, source/selection/resolver snapshots, version/source family, `redaction_applied` and `payload_purged_at`. Supplies retained exceptional interactions and enforces existing privacy/retention decisions. |
| `ai_live_private.feedback` | Answer ID, timestamp/ID vote ordering, helpful state, origin, intent, result code, relationship and version. Supplies Live feedback metadata without personal question/answer content. |
| `public.members` | Current first/last/full name, joined only through the member ID already recorded with feedback. UI explicitly labels this as the **current member profile**, not the historical name. |

The query unions request IDs so each retained interaction is counted once, including legacy feedback or occurrences lacking a parent outcome. It preserves existing official feedback tie semantics and existing Live feedback timestamp/ID ordering. It never joins Live target facts, access-audit records, authentication sessions or present-day league data to reconstruct an old answer.

## Migration and authorization

Added `lwrpc-admin/supabase/migrations/20260919105119_ai_feedback_question_history.sql`. It creates only the read-only, stable, `SECURITY INVOKER` function `public.ai_review_interactions(jsonb)`, with a fixed search path, bounded page sizes and a five-second statement timeout. It changes no existing tables, columns, indexes, functions, RLS policies or table grants. Browser `anon`/`authenticated` roles cannot execute it; execution is reserved for the existing trusted server role. There are **no new indexes** and no new telemetry collection.

The existing `/api/ai-assistant/review` endpoint gains GET operations `interactions` and `interaction`. Both use the existing server-side verified user authorization and explicit Commissioner/League Manager role check before any query. The existing route-level View As guard remains first. POST requests for these two read-only operations return 405. Results are private/no-store and contain explicit field allowlists; identity IDs, emails and raw authorization/credential telemetry are omitted. Recognizable credential-bearing free text is replaced with a security omission marker.

For a later authorized release, apply the additive migration before the application. The earlier application remains compatible with the added function. Isolated recovery verification passed: applying the migration twice is idempotent; dropping only the new function with RESTRICT preserves existing tables, indexes, RLS, grants and function definitions; the old ai_review_report remains callable by service_role; reapplying restores the identical 45-interaction report. This work does not authorize production deployment or migration execution.

## Data limitations

Many normal requests without a vote retained only outcome/timing metadata: their question, answer and user identity cannot be recovered. Live interactions deliberately did not retain personal question/answer text. Existing protected/redacted or expired payloads remain protected; the reader does not restore text from older feedback snapshots after a purge or substitute raw text for a redacted occurrence.

Some saved text was already length-limited when originally captured (commonly 1,000-character questions, with some effective questions up to 2,400 characters, and 6,000-character answers). Detail displays all text that remains stored; it cannot restore previously truncated or deleted content. Historical roles and LMS page/league/division/team labels were not generally retained and appear as Not recorded. Existing workflow, Live intent/result/relationship and eligibility provenance metadata appear only when present. Current names and later retention changes can still change while browsing; the cursor freezes event eligibility, not a database transaction snapshot.

## Verification

- `npm test -- --test-concurrency=2`: **1,402 passed**, zero failed/skipped. Includes existing feedback submission, AI behavior, authorization and normal LMS regressions.
- New history service coverage: **27 tests**; combined with neighboring review and View As controls, **54/54 passed**. Covers role denial before database access, read-only method enforcement, signed cursor tampering/expiry/scope, complete retained detail, privacy allowlists and 23 credential patterns.
- Final isolated PostgreSQL/PGlite database coverage: **11/11 passed**, including actual migration execution, service-role/browser permissions, unchanged table schema/index/RLS/grant snapshots, summary-to-row equality, feedback reversals/ties, Live and legacy records, full detail, search/date/origin, equal-timestamp pagination, event cutoff and read-only report behavior.
- `npm run lint`: passes with **0 errors, 11 existing warnings**. Changed UI files also passed scoped lint after the accessibility adjustment.
- `npm run build`: passes; production compilation includes the existing review route and new UI.
- `git diff --check`: passes.

Browser verification used the actual review page components and actual history HTTP service connected to the new SQL in an isolated PostgreSQL fixture. Authentication identities and unrelated legacy review responses were synthetic; no production sign-in, AI generation, feedback submission or business-data mutation was used for these browser checks.

Observed browser results: Commissioner and League Manager each load 43 requests in the 30-day fixture; Helpful shows exactly 4, Not Helpful 2 and No Feedback 36. All retained history shows 45 records across pages of 25 and 20, including both older legacy examples. Previous restores the same first page. Last 7 days shows 7. Answer search `Franklin` returns two paired question/answer records; question search `kitchen` returns one. Manager-test origin returns one. Long detail includes both `Question end` and `Answer end`, diagnostics expand, Escape returns focus, and the 390px layout and modal fit without page overflow. No browser warnings/errors were captured during authorized checks. Player/Captain/Club Pro fixture navigation is denied. Local real history HTTP dispatch returns 403 for Player, Captain, Co-Captain and Club Pro, 401 for anonymous, and 403 for View As.

Performance was measured only in isolated PGlite with 5,000 outcomes and 1,000 feedback records. Repeated generic cached plans caused a quadratic retained-snapshot join. Function-local `plan_cache_mode=force_custom_plan` corrected that measured issue while restoring the session's original setting after each call. Final warm timings: all history 73–86ms; last 30 days 45–78ms; Helpful 39–58ms; No Feedback 42–60ms; answer substring search 31–42ms. These are not production latency guarantees. Exact counts and substring search still scan the relevant retained population; no additional base-table index was justified by the observed plan. Only 26 internal rows are returned (25 visible plus the next-page sentinel).

## Files for this enhancement

- `lwrpc-admin/app/ai-assistant/review/page.js`
- `lwrpc-admin/app/ai-assistant/review/InteractionHistoryPanel.js`
- `lwrpc-admin/app/ai-assistant/review/interactionHistory.module.css`
- `lwrpc-admin/app/lib/aiInteractionHistory.js`
- `lwrpc-admin/app/lib/aiReviewHttp.js`
- `lwrpc-admin/app/lib/version.js`
- `lwrpc-admin/package.json`
- `lwrpc-admin/package-lock.json`
- `lwrpc-admin/supabase/migrations/20260919105119_ai_feedback_question_history.sql`
- `lwrpc-admin/test/aiInteractionHistoryService.test.mjs`
- `lwrpc-admin/test/aiInteractionHistoryDatabase.test.mjs`
- `lwrpc-admin/test/helpers/aiInteractionHistoryFixture.mjs`
- `docs/ai-feedback-question-history-local-review.md`
- `docs/project-roadmap.md`

The browser/performance fixtures and gate logs are local ignored verification artifacts under `.local-validation`. Concurrent Division Schedule sorting changes in `TeamScheduleModal.js` and `divisionScheduleDisplay.test.mjs` were preserved and are outside this enhancement's file scope.

No AI retrieval weights, evidence thresholds, chunk selection, rescue logic, personalized authorization, document authority, answer generation, capture/retention or feedback-write semantics were changed. No production database or operational business rows were modified. Local implementation stops here pending explicit deployment authorization.
