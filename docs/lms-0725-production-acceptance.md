# LMS-0725 / 0.1.547 controlled production acceptance

**STOP — LMS-0725 / 0.1.547 DEPLOYED, NOT PRODUCTION ACCEPTED.** First mandatory roster-date replay returned HTTP 500 / technical_error. Acceptance stopped before retry or correction. Exact migration remains applied once; deployment remains live. No rollback was attempted under the instruction to stop before correction. LMS-0724 remains the last accepted release, not the currently served release.

The owner's SQL clarification supersedes the earlier no-SQL restriction. Source file: `lwrpc-admin/supabase/migrations/20260908114532_lms0725_clarification_choices.sql`; SHA256 `9EF22DEB9422E7D7D1F7FA915224CC1F527CC72D043510D53F73C85F0D4ABE85`. Supabase applied the exact file and generated migration-history version `20260908123627`, name `lms0725_clarification_choices`, recorded once. No earlier migration was reapplied.

Production project `glikrmmgirilnmamxxyl`, LWR PC League Management, was ACTIVE_HEALTHY. Accepted deployment `dpl_FF21fdcEUy5TBzYvK4xanXMNTrxR` was READY on both main and View-As origins before mutation. Existing HMAC and View-As environment metadata unchanged; no secret values retrieved.

Only `ai_live_private.lookup(uuid,uuid,jsonb)` and `view_as_private.lookup(uuid,uuid,uuid,uuid,jsonb)` changed. Both remain owned by postgres, SECURITY INVOKER, fixed empty search_path. Normal EXECUTE ACL remains postgres + service_role; View-As remains postgres + lms_view_as_executor. PUBLIC/anon/authenticated have no EXECUTE. No GRANT/REVOKE or RLS policy changes. Normal choices use existing requester authorization; View-As uses target-effective authorization. Counts follow existing team authorization and do not bypass it. Combined choices project only supported rating/season context, not broad contact data. Live provider boundaries remain unchanged.

Before source MD5s matched exact guards: normal `d6c466eeed338b97e928bfd61eee6f3d`, View-As `47f7e2646aeeef5b25a842041412766b`. After source MD5s match reviewed outputs: normal `9e60d8bbd1342887d20d665ddf92b99b`, View-As `79a9d17bdcf6a3fa34ca5dfc88b14944`.

Real local PostgreSQL 17.11 test under a non-superuser postgres role: clean apply PASS, replay PASS, second replay PASS, owner/ACL/security/search_path unchanged, synthetic drift rejected. Script: `lwrpc-admin/scripts/lms0725-postgres-replay.mjs`. Local harness setup errors were corrected; reviewed migration bytes never changed. This supplements the already-passing isolated behavior and target-authorization tests.

Immediate production before/after aggregate fingerprints match for all captured member/team/roster/rating/identity data, corpus, Approved Answers/revisions/events, Stage 7 outcomes/feedback, RLS policies, table security, column ACLs and unrelated functions. Counts: members 1951, teams 92, rosters 0, ratings 1012, identity links 158; corpus 7 documents/23 versions/1804 chunks; Approved Answers 1/2 revisions/7 events; outcomes 221, feedback 20. Corpus and revision fingerprints also match the accepted LMS-0724 baseline. No operational data mutation occurred in migration.

Maintenance job 3 remains active every minute; latest five observed runs succeeded through 12:32 UTC. Full acceptance, production answer matrix, timings and final integrity remain pending.

## Deployment and first mandatory replay

Production deployment `dpl_3BDCFztdq2rX1CN2JV9fT7sUv4zc` is READY, with main and dedicated View-As aliases assigned. URL: https://lwrpc-admin-5trfyjtgs-terry-lwrpc.vercel.app . The main signed-in browser displayed Version LMS-0725 after refresh. This was a CLI deployment of the reviewed working tree; its metadata retains the previous Git commit plus `gitDirty=1`, so that commit is not claimed to identify the new release contents. No new version or commit was created. The first CLI invocation from the app directory failed before creating a deployment because the configured project root is `lwrpc-admin`; the repository-root invocation succeeded.

The first exact owner question was submitted once in the existing authenticated Commissioner session:

> What date can I start entering my roster for weekday league

Observed response:

> Sorry, I couldn't complete that request right now. Please try again.

**FAIL.** No September 28, 2026 answer, source or citation was returned. No team clarification was shown. Telemetry proves Stage 3 was invoked, but the failed request provides no completed scope/evidence selection to validate. It is not evidence of a successful policy answer, and there is no basis to call it TEAM_ROSTER or an unsupported-intent result.

| Primary replay | Result |
|---|---|
| What date can I start entering my roster for weekday league | FAIL: HTTP 500, technical_error; no answer/date/citations |
| when can I start entering my players for my team | NOT RUN: strict stop after first failure |
| Does the weekday dupr league use rally scoring | NOT RUN: strict stop |
| What's my DUPR | NOT RUN: strict stop |

No retry, later question, correction, corpus processing, Approved Answer or new View-As session was attempted after this failure. The existing browser remains at the failed answer for review.

## Failure evidence and observable timing

Vercel runtime logs show `POST /api/ask-lwr 500` on this deployment at 12:42:12 UTC, followed by `Ask LWR player answer failed { category: 'Error' }` and successful quality capture at 12:42:15.486 UTC. Existing sanitized logging does not expose the exception message/stack. Root cause remains undetermined; no speculative correction was made.

The corresponding LMS-0725 Stage 7 outcome records:

| Field | Observed value |
|---|---|
| Started / completed | 2026-09-08 12:42:12.694 UTC / 12:42:15.461 UTC |
| Server total processing | **2,767 ms** |
| Origin | player_interface |
| Final kind / reason | technical_error / technical_error |
| Stage 3 invoked | true |
| Source family / selected evidence | none / 0 |
| Candidate count / Stage 3 sufficient | 0 / false |
| Answer model, embedding model, tokens | unavailable (null) |
| model_call_skipped | unavailable (null); do not infer provider-call counts |
| Feedback eligible | false |

The browser observation interval was approximately 45,547 ms including tool scheduling, waiting and transport; it is not an exact request latency or evidence of 45 seconds of server processing. Routing, retrieval and clarification subdivisions were not observable for this failed request. Before/after production overhead comparisons for Rally, Live clarification and ordinary SELF were not run because the first gate failed. Exact overhead acceptance remains incomplete.

## Complete production benchmark and gate status

[All 63 production-format cases and their honest status](lms-0725-production-benchmark.md): **1 attempted / 1 failed / 62 not run**. The local 63/63 result is not substituted for production acceptance.

| Required area | Production status in this attempt |
|---|---|
| Roster policy/date, official date, scope and citation | First exact question FAIL; remaining controls NOT RUN |
| Rally applicability, Rule 5.3 default/exception, mechanics qualification, paired league sources | NOT RUN after stop |
| DUPR combined/clickable/typed choices, resolved question and missing wording | NOT RUN after stop; isolated implementation evidence remains separate |
| Reset and fresh follow-up authorization/refetch | NOT RUN after stop |
| View-As target-effective choices, diagnostic AI, feedback disabled, Exit | NOT RUN after stop; unchanged database security verified, no new preview created |
| Live zero answer-model/embedding counts | NOT RUN in production; retain isolated evidence only |
| Five quality invariants | NOT ESTABLISHED; failed first answer prevents acceptance |
| Desktop/390px/320px and accessibility | Failure observed in existing desktop browser; responsive choices, keyboard and screen-reader gates NOT RUN |
| LMS-0724 regression | Accepted deployment baseline, Member Detail entry control and maintenance checked; new release target/Exit behavior NOT RUN |
| LMS-0723 regression | Lookup metadata/browser EXECUTE denial verified; production behavioral probes NOT RUN |
| LMS-0722 document regression | NOT RUN after stop |
| Telemetry/privacy/feedback | One sanitized technical-error outcome persisted; no feedback submitted; broader correlation gate NOT RUN |
| Corpus / Approved Answers / HMAC | Corpus and Approved Answer histories unchanged; HMAC environment metadata unchanged, no secret-value comparison performed |
| Production acceptance | **NOT ACCEPTED** |

## Final integrity and scope

Final captured aggregate fingerprints match immediate pre-migration values for members, teams, rosters, ratings, identity links, documents, versions, chunks, Approved Answers/revisions/events, feedback, RLS policies, table security, column ACLs and unrelated functions. Stage 7 outcomes increased 221 to 222 with the one LMS-0725 technical-error record. Earlier outcomes were not edited by this workflow; the changed whole-table hash reflects the addition. No sensitive question/identity/token artifacts were exported. The benchmark questions are non-sensitive test wording.

Maintenance job 3 remains active every minute, with succeeded runs at 12:42, 12:43 and 12:44 UTC. Migration remains recorded exactly once. [Immediate migration integrity snapshot](lms-0725-migration-integrity.json) records the comparable pre/post hashes. Existing `.65` Approved Answer selection threshold is unchanged.

The approved SQL changes, not a no-SQL claim, are the sole production schema mutation in this release. No operational member/team/roster/rating edits, grants/revokes, RLS changes, corpus edits, document reprocessing, Approved Answers, HMAC edits or feedback were performed. No View-As UI parity work began.

Review must resolve the first production technical failure before any correction or renewed acceptance. No later gate is represented as passed merely because local tests passed.
