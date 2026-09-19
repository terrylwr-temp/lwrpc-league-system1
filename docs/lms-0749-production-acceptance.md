# LMS-0749 / 0.1.572 — production acceptance

**PRODUCTION ACCEPTED — September 19, 2026**, with the real-session and historical-data coverage limits below. This supersedes the local-only status in the implementation report. The owner explicitly authorized this deployment, its one additive migration, real Commissioner acceptance, and the small Ask LWR regression set. The owner subsequently confirmed: “Only Commissioner is available; record other-role session coverage limits.”

## Deployment and recovery

| Item | Verified value |
| --- | --- |
| Production | https://league.lwrpickleballclub.com |
| Version | LMS-0749 / 0.1.572 |
| Commit | `2bf916b8b2ecf9863a2c518a0e62af7d80ae6855` |
| Vercel deployment | `dpl_Dr68zt62cthVFL5HHb5diAwKE12B` — READY |
| Immutable deployment | https://lwrpc-admin-joynkzfao-terry-lwrpc.vercel.app |
| READY time | 2026-09-19 11:29:39 UTC |
| Prior production | LMS-0748 / 0.1.571, commit `efce2939c9a36279a994517cf43ce30a875ee893` |
| Retained rollback | `dpl_ALQweBELZjWggy3wUGtbDcKZ1Ukw` — READY, rollback candidate verified |
| Rollback URL | https://lwrpc-admin-fd6idv2i9-terry-lwrpc.vercel.app |

The exact 14-file enhancement commit was pushed through the existing GitHub main → Vercel production pipeline. Remote HEAD was checked immediately before pushing. Independent review confirms no generation/retrieval, feedback-write, personalized authorization, View-As, corpus-processing or dependency change. Unrelated uncommitted schedule sorting/test changes remain outside the deployment. No additional application edits were made during acceptance, and no rollback was performed or overwritten.

Application recovery is the retained READY deployment. The additive function is compatible with the prior app and can remain during application rollback. Local database recovery tests also verified removing only the new function with RESTRICT, retaining existing tables/functions and the old report, and reapplying the migration against unchanged fixture data. No production recovery drill or destructive SQL was run. Previously recorded physical-backup availability was not freshly reverified; the applicable recovery for this function-only change is the tested compatible/function-only path.

## Migration

Applied **once**, successfully, in Supabase project `glikrmmgirilnmamxxyl`:

- Source: `lwrpc-admin/supabase/migrations/20260919105119_ai_feedback_question_history.sql`.
- Source SHA-256: `60AB3BAB21DC599098415B3B2B454D1C6906EC057C5ADB2B73B8BF80A48E8BCA`.
- Production migration history: **`20260919112713_ai_feedback_question_history`**. Supabase records application time, so its version differs from the source filename.
- New object: `public.ai_review_interactions(jsonb)`, stable, SECURITY INVOKER, owned by postgres.
- Function settings: `search_path=pg_catalog, public`, `statement_timeout=5s`, `plan_cache_mode=force_custom_plan`.
- Exact ACL: `{postgres=X/postgres,service_role=X/postgres}`. PUBLIC, anon and authenticated have no EXECUTE; service_role has EXECUTE.

The function was absent before application. There is exactly one added migration record. No new table or index, existing object change, RLS weakening, business-data mutation or existing-function replacement occurred. All 27 data fingerprints matched immediately after migration. Seven catalog fingerprints remained identical, covering 68 relations, 884 columns, 224 indexes, 380 constraints, 141 policies, 64 existing functions and four tracked schemas. The final catalog comparison confirms the new function is the only expected addition.

## Normal LMS first

Real Commissioner preflight and post-deployment checks passed before history acceptance. Dashboard All Seasons shows 100 active teams, 16 roster assignments, 1,836 active members and average Season DUPR 3.854 after asynchronous loading completes. Teams & Rosters shows 100 of 120 teams and retains normal operational controls, including Add Team. No write was submitted.

The previously reported Active Seasons count discrepancy is resolved: that scope uses the actual season start/end date window. Fall begins October 14 and Saturday begins October 17, so zero Active Seasons teams on September 19 is expected. All Seasons/Current Entries includes the preseason registrations. No corrective code or data change was needed. Real Captain/Player screens cannot be accepted from the Commissioner's session, and production has no schedules/matches yet, as the owner already confirmed.

## Commissioner history acceptance

All four cards are clickable and apply the correct history filter. Before regression requests, the same all-origin 30-day scope shows **657 total, 27 Helpful, 5 Not Helpful, 625 No Feedback, 0 Ambiguous** in both SQL and the real browser. Helpful returns only Helpful rows; No Feedback returns unvoted rows with the expected missing-text labels; Total restores the broader history. Existing review queues and Live feedback remain present.

All five actual Not Helpful records were opened and cross-checked against the underlying feedback/outcome records, including exact paired text, request IDs, latest feedback, current member label and date basis:

| Request ID | Retained question | Full answer length |
| --- | --- | ---: |
| `a3c4db5d-c48f-4f15-b827-91c6b06b5a09` | Can I volley in the kitchen? | 227 |
| `ca15235d-8db0-404e-8435-39254307d042` | When is the primetime season starting? | 46 |
| `e02e689d-ee9e-47cf-92e9-d9a59dc85831` | what does an NR DUPR rating mean | 431 |
| `1ed46006-e0a7-4487-9b10-57b776685d2c` | I'm changing my roster but I can't find a player in the list, why? | 692 |
| `d61e3343-812f-4ffd-93cf-963586ea4a33` | Can I volley in the kitchen? | 162 |

The two kitchen records retain their different original answers; they are not accidentally paired to the same response. Legacy dates correctly use the first recorded feedback event, explicitly labeled, rather than presenting the latest vote time as the answer time. Current member names are explicitly current profile labels; missing historical roles/context remain “Not recorded.” Historical answer correctness is not rejudged by this read-only display.

The 431- and 692-character answers truncate in the list and appear completely in detail, including the ending text. Paragraphs render as text rather than executing HTML/Markdown. Expanded diagnostics show the corresponding request ID, original LMS version, available response time, selected document/version/chunk evidence, rule/page/source information and resolver metadata. No credential markers or secrets appeared in the five inspected details. Automated sanitization tests cover forbidden fields and credential-like text.

## Filters, search, pagination and mobile

| Check | Production result before regression |
| --- | --- |
| Last 7 days | 196 total: 5 Helpful, 0 Not Helpful, 191 No Feedback |
| Last 30 days | 657 total |
| Last 90 days | 657 total |
| All retained history | 657 total |
| Question search `NR DUPR` | Exactly the expected one paired record |
| Answer-only phrase `Certified DUPR Coach` | The same one paired record, although phrase is absent from its question |
| Diagnostic-only chunk ID `c0908ed3-19cf-4630-a9d6-0247765bc5ba` | Zero results despite being present in inspected diagnostics |
| Helpful pagination | 25 rows then 2; 27 distinct displayed rows, no overlap, no omitted row relative to SQL total; next disabled on page 2 |

Date/search counts were independently checked through the read function. Filters remain applied during pagination. Card counts update with date/search scope and Clear search restores all retained records.

Desktop and 390×844 mobile verification passed. Mobile cards, date filter and pagination were operated; detail opened and closed; the complete 692-character answer wrapped; diagnostics expanded without increasing the dialog width. Answer client/scroll width both 343px; dialog client/scroll width both 375px. A minor 4px outer-page horizontal overflow was observed (394px document at 390px viewport); it did not overflow the answer/dialog or obstruct controls. No application change was made for that nonblocking layout observation. The temporary viewport override was reset.

## Authorization evidence and limits

| Principal/path | Result and evidence |
| --- | --- |
| Real Commissioner production session | Allowed; list/detail/cards/filters exercised end to end |
| League Manager | Local real HTTP service tests allow list/detail (200); real production role session unavailable |
| Captain, Co-Captain, Player, Club Pro | Local server tests reject list/detail (403) before database access; real production role sessions unavailable |
| Anonymous production API | Both history operations return 401 with no history data |
| Production API with View-As marker | Both operations return 403 |
| Direct production database `anon` and `authenticated` | Actual read-only role execution attempts return PostgreSQL 42501, permission denied for the function |
| SQL PUBLIC/service role | Catalog confirms PUBLIC cannot execute; service role can execute |
| History writes | Both history POST operations return 405 in local HTTP tests |

The boundary is server enforced, not inferred from navigation visibility. The owner explicitly accepted recording unavailable production sessions. No role impersonation, account creation, role assignment, credential acquisition or View-As session was used to fill that gap. Real League Manager allowance and per-role authenticated HTTP denial remain production-session coverage limitations, backed by the existing local HTTP/database tests; they are not claimed as live session observations.

## Ask LWR regression

Three topics were exercised in the real Commissioner's Ask LWR drawer, with New Question between topics and no feedback votes submitted:

1. **“What ball is used for league matches?”** — Franklin Outdoor X-40 optic yellow for regular season/playoffs, sourced to Captains Guide page 10. PASS.
2. **“Medical issue during match”** — neither team at six: Forfeit, 0–0, excluded from DUPR; either team at six or more: Retired, current score, posted to DUPR; opponent wins, substitution/unplayed-game treatment retained. PASS. The current active source numbers Incomplete Matches **5.8**, not historical 5.7. Direct current-source verification confirms Rule 5.8 and its three children on page 5, version `v20260918013322-d92d58f4`, activated September 18 at 01:33:30 UTC, before this release. This is an existing document renumbering, not a citation mismatch introduced by LMS-0749.
3. **“What is my Season DUPR?”** — valid season clarification, then selected existing 2026 Fall Season; LIVE LMS DATA / SELF RATING returns Terry Adelman's **4.00**, independently matching the existing member-season rating. The resolved question names the selected season. PASS.

These produced exactly four ordinary outcome records: two grounded official answers, one SELF_RATING clarification and one SELF_RATING answer. Official response times were 5,115ms and 3,258ms; deterministic Live requests 57ms and 56ms. No artificial requests were created for pagination. The history subsequently displays **661 total, 27 Helpful, 5 Not Helpful, 629 No Feedback**, as expected. No new review occurrence or feedback vote was created.

## Integrity and operational health

All **26 non-outcome table fingerprints remain identical** after acceptance. The 648 pre-existing outcome rows also retain the exact preflight fingerprint (`f68be91b428b64fe54a8d502ca89f461`); only the four authorized regression outcomes were added (648 → 652). There are no unexplained changes.

Protected checks include members 2,016; user roles 216; teams 120; team members 16; season ratings 1,422; seasons 2; leagues 3; divisions 19; locations 143; division lines 213; scheduling settings 12; blackout dates 7; special requests 2; system settings 12; and all six empty match/line/game/lineup/standing/bye tables. AI feedback events remain 34, review occurrences 145, private Live feedback 1; documents 7, versions 35 and chunks 2,429 remain byte-for-byte unchanged under the database fingerprints.

All tracked existing grants/RLS/function definitions match preflight. Three tracked cron jobs remain active, their latest runs succeeded and no failures were recorded in the preceding 24 hours. View-As maintenance last succeeded at 11:36 UTC during the final check. Supabase security advisors are unchanged: 28 existing informational [RLS-without-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and one existing [authenticated SECURITY DEFINER warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) for `season_ratings_roster_policy`. No new advisory or unrelated security hardening is included.

Vercel reported no runtime error clusters since candidate readiness and no candidate error/warning/fatal log counts. The production browser captured no warnings/errors. Candidate and retained rollback were rechecked READY.

## Validation scope and retained evidence

The accepted local baseline remains 1,402 passing tests, successful production build, lint with zero errors/11 existing warnings, and desktop/mobile verification. The deployment review independently reran the 38 history service/database tests successfully. No application edits after those checks require a rebuild.

Remaining limitations: unavailable real other-role sessions; no production schedules/matches; zero retained Ambiguous feedback cases; some historical questions/answers/user context were deliberately never retained, purged or capped at original capture. Existing local fixtures cover these cases without manufacturing production data. The small outer-page mobile overflow is recorded above. Broader existing Data API hardening remains separately scoped.

Evidence: [local implementation review](ai-feedback-question-history-local-review.md), production evidence under `.local-validation/lms0749-production/` (`final-acceptance-evidence.json`, before/after/final catalog snapshots, migration history, database denial evidence and maintenance verdict). The production acceptance report and roadmap update are retained locally to avoid an unnecessary second deployment. No next release was started.
