# LMS-0716 implementation report — Stage 7A

**LMS-0716 / 0.1.538 — PRODUCTION ACCEPTED. Stage 7A — COMPLETE.** Final read-only review on 2026-09-05 found no new defect. The owner-authorized live authorization and failure-injection limitations are accepted and remain documented for operational review; they do not block Stage 7B unless new evidence indicates a problem. Stages 1–6 remain accepted. LMS-0717 / Stage 7B and Live LMS Intelligence have not started and are not authorized by this acceptance. Historical checkpoints below are superseded by the final acceptance section.

The owner approved the complete Stage 7 design and separately approved its Unicode normalized-question constraint correction. This implementation observes existing outcomes; it does not change retrieval or answer decisions.

## 1. Six additive tables and migration

Migration: `lwrpc-admin/supabase-ai-assistant-lms-0716-stage7a.sql`.

| Table | Implemented purpose |
|---|---|
| ai_request_outcomes | Lightweight completed-request metadata and reporting denominator; no question, answer, player identity or receipt |
| ai_review_occurrences | One bounded exceptional/voted-answer occurrence per answer_id; optional outcome parent for legacy compatibility |
| ai_question_groups | Conservative recurring-question groups; individual occurrences preserved |
| ai_question_fingerprint_routes | Versioned HMAC digest routes, full normalized text and collision slots |
| ai_manager_review_cases | One optional case per group; New/Reviewing/Resolved/Dismissed separate from action category |
| ai_manager_review_events | Append-only automatic case/priority history and the future manager audit structure |

The migration includes the approved columns, types, nullable foreign keys, source-family/origin/kind/category checks and indexes. Outcome completion must not precede request start; feedback eligibility requires a grounded answer; protected outcomes cannot claim retrieval/evidence. Occurrences have UNIQUE(answer_id), nullable unique outcome_id and the equality check between those identities. Parent outcome deletion sets the optional reference null. Case group_id is unique. Audit operations have UNIQUE(operation_id,event_ordinal). Route uniqueness covers origin/family/normalizer/key versions/digest/collision slot; full text is not a B-tree key.

Indexes cover outcome time/origin/kind/eligibility, occurrence group/origin/kind/time and feedback references, group origin/family/last-seen and redirects, route group lookup, case status/category/assignee and audit case/group/time. All six tables enable RLS and revoke PUBLIC/anon/authenticated access. The protected capture RPC uses SECURITY INVOKER, a fixed search_path and restricted service-role EXECUTE. Service-role normal grants omit UPDATE/DELETE on outcomes and audit events and omit DELETE on the other new tables. Retention execution is not enabled by this release.

Existing `ai_answer_feedback_events` schema, constraints, grants and stored history are unchanged. No document, version, chunk, embedding or retrieval SQL is modified. The migration executes within a transaction and can be replayed against its own completed schema. Inspect schema drift before production application rather than assuming IF NOT EXISTS repairs unrelated pre-existing objects.

## 2. Approved Unicode correction

The effective-question limit remains **2,400 characters**. Only `ai_question_fingerprint_routes.normalized_question` changes from the original design: nonempty full normalized text, maximum **32,768 UTF-8 bytes**, enforced in JavaScript by Buffer.byteLength and in PostgreSQL by octet_length.

Normalization never truncates. The original example of 2,400 `İ` characters produces 4,800 normalized characters / 7,200 bytes, retained in full. Tests cover Unicode expansion and values at exactly 32,768 bytes and immediately beyond at 32,769 bytes. Both multibyte and ASCII application boundaries are checked; PostgreSQL constraint and transaction behavior are tested independently. Over-limit grouping fails safely, rolls back its analytics transaction and does not replace the player's valid answer.

The governing design document records the correction and approval. No other material schema redesign was made.

## 3. Shared identity and feedback compatibility

The authenticated server creates a UUID once before executing the answer. Eligible feedback receipts seal that same UUID as answerId; outcome.id and occurrence.answer_id use it. The ID is not accepted from browser input. Receipt creation accepts a trusted optional ID, retaining its random fallback, encryption, user binding, expiry, eligible-only issuance and validation. The separate conversation-receipt architecture is untouched.

The feedback endpoint retains its latest-state check and append-only insertion. Helpful → Helpful again → Not Helpful → Not Helpful again still produces exactly Helpful → Not Helpful for one answer. Stage 7 enrichment runs after successful insertion and also after a repeated existing selection, allowing a missed enrichment to be retried without inserting another vote. All enrichment failures are contained.

Legacy receipts/rows remain valid without an outcome parent. The RPC uses actual stored feedback to establish first-observed time, provenance and whether negative feedback exists. It does not manufacture outcome records or generation timestamps. Legacy completion time remains null; legacy origin is explicitly unknown. One occurrence joins all retained feedback events through answer_id. No historical feedback backfill or mutation was executed.

## 4. Outcome and detail capture

| Existing final result | Stage 7A observation |
|---|---|
| Grounded answer, no vote | Lightweight outcome only; existing eligibility flag provides denominator |
| Grounded answer with feedback | Same outcome ID; one bounded feedback occurrence, existing answer snapshot remains in accepted feedback table; a negative transition seeds a case |
| insufficient_evidence | Automatic bounded occurrence/group/New case without a player vote; existing Stage 3 versus Stage 4 no-applicable-evidence path supplies the reason |
| conflict | Automatic conflict occurrence and High-priority case; selected opposing evidence/source identities preserved |
| Candidate-only conflict hint | No conflict occurrence if final result is an ordinary answer |
| protected | Lightweight guard-path/category metadata only; no raw/effective personal question, fingerprint, occurrence or case |
| clarification | Lightweight outcome only; no unanswered case |
| Clarification followed by insufficient evidence | Final occurrence plus bounded existing resolver classifications/flags; no full conversation |
| Technical error | Operational outcome; original error behavior preserved; no missing-rule case |
| Manager test | origin=manager_test, excluded from player denominators by design; no player feedback eligibility |

Detail contains bounded redacted original/effective questions, final exception text, up to four source/selected-evidence records and eight candidate identities/scores, resolver flags, source family and LMS/model information. Lightweight diagnostics include fixed configuration/version identifiers, retrieval limits/threshold and existing equipment-probe presence/result flags. No additional retrieval, selection, model or embedding call is made.

Snapshots omit full conversation history, receipts/tokens, credentials, signed URLs, raw chunks, vectors, unrestricted provider payloads and unrelated member records. Text is bounded and conservatively omitted for recognized sensitive content. Redaction is not claimed to be perfect anonymization; retained detail is server/manager restricted. Questions redacted in a way that could collapse identities are isolated with no automatic fingerprint route.

## 5. Grouping, cases and idempotency

The approved normalizer applies NFC, typographic quote conversion, whitespace normalization, lowercase and terminal-question-mark removal, preserving words, negation, numbers, dates and qualifiers. A length-delimited HMAC-SHA-256 input includes origin, family, normalizer version and the entire normalized question. A separate server key and explicit key version are required. Ball-use and legal-ball-specification questions stay separate.

The transaction locks the answer ID, then the digest scope for new grouping. It compares full strings with exact C collation; a digest collision allocates a different collision_slot. A retry reuses existing identity and checks outcome/snapshot invariants. It does not overwrite conflicting snapshots. Group/case creation and history commit together. A new confirmed conflict can escalate priority; replaying an old occurrence cannot undo a later manager priority choice. No merge/split/status-edit UI or manager mutation APIs exist in LMS-0716.

## 6. Fail-open capture and operational visibility

Capture is awaited with a **500 ms total client budget**, AbortController cancellation on the Supabase request, SQL lock-timeout protection and a configured RPC statement-timeout setting. Persistence errors, snapshot-size errors, missing HMAC configuration, missing schema and logging failures cannot replace the existing valid answer or feedback response. The model is never rerun for analytics. No immediate automatic retry is added; persistence replays use stable identities, and repeated feedback selections can retry enrichment.

Timeout can leave commit status uncertain across the HTTP/database boundary; idempotency handles a later replay. This is best-effort analytics, not guaranteed lossless delivery. Validate deployed cancellation/latency behavior against the hosting/PostgREST environment; local tests do not establish production transport cancellation behavior.

Sanitized `ai_quality_capture` hosting-log events record capture_succeeded/capture_failed, stage, LMS version and time only. They never log the failed payload/error text or recursively write to the failed database.

`GET /api/ai-assistant/capture-health` is authorized for League Manager/Commissioner only. It returns the last successful recorded_at, no question or user data. Its status is intentionally **unknown** until the independent hosting log signal is checked, or **degraded** when the database health read fails. No manager UI is added.

Initial operational path: the authorized operator reviews existing hosting logs for `ai_quality_capture` over the last 15 minutes, compares successes/failures with the endpoint's recorded time and follows the approved Recording/Degraded/No-recent-confirmation/Unknown interpretation. Programmatic hosting-log access and 30-day retention were not configured or verified in this local-only implementation. Verify operator access, retention and the runbook before production acceptance; do not label automated health coverage complete. A future manager display is reserved for LMS-0717.

## 7. Exact application/documentation files

Paths relative to `C:/lwrpc-league-system`:

- `lwrpc-admin/supabase-ai-assistant-lms-0716-stage7a.sql` — new additive schema and protected atomic capture RPC.
- `lwrpc-admin/app/lib/aiQualityGrouping.js` — full-string, byte-bounded versioned fingerprinting.
- `lwrpc-admin/app/lib/aiQualitySnapshots.js` — allowlisted metadata, bounded detail and privacy isolation.
- `lwrpc-admin/app/lib/aiQualityCapture.js` — shared identity, fail-open capture and hosting-log signals.
- `lwrpc-admin/app/lib/aiConversation.js` — optional trusted feedback answer ID; compatible fallback.
- `lwrpc-admin/app/lib/askLwrPlayerAnswer.js` — exposes existing generation result internally and passes shared receipt ID.
- `lwrpc-admin/app/api/ask-lwr/route.js` — observer around the existing player operation; response remains `{success:true,result}`.
- `lwrpc-admin/app/api/ask-lwr/feedback/route.js` — failure-contained post-success/repeated-selection enrichment.
- `lwrpc-admin/app/api/ai-assistant/answer/route.js` — observation of the existing manager path with manager_test origin.
- `lwrpc-admin/app/api/ai-assistant/capture-health/route.js` — protected minimal operational read, no reporting UI.
- `lwrpc-admin/app/lib/version.js` — LMS-0716.
- `lwrpc-admin/package.json` and `lwrpc-admin/package-lock.json` — 0.1.538 and pinned development-only PGlite 0.5.8 for executable isolated PostgreSQL tests.
- `lwrpc-admin/test/aiQualityCapture.test.mjs` — observation/privacy/Unicode/identity/failure/static regression coverage.
- `lwrpc-admin/test/aiQualityDatabase.test.mjs` — migration execution/replay, real constraints, RLS/grants, collision slots, legacy correlation, case priority and idempotency.
- `docs/project-roadmap.md` — accepted production baseline versus pending local Stage 7A, separate LMS-0717 scope.
- `docs/stage-7-ai-feedback-review-design.md` — approval state and approved byte-limit correction.
- `docs/lms-0716-implementation-report.md` — this report.

The existing working-tree change in `docs/lms-0715-implementation-report.md` is the preceding owner-confirmed production-acceptance status note, retained without changing historical implementation details. Ignored isolated build/test artifacts are not deployment source. No player UI, mobile layout, navigation, citations or viewer files changed.

## 8. Validation

- Full `npm test`: **209 passed**, zero failed after the permission correction, preserving all 185 pre-existing tests. The isolated database suite now includes production-like default grants and effective operation/replay checks.
- `npm run lint`: passed, zero errors; six pre-existing warnings remain.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run verify:ai-pdf-server-bundle`: passed.
- Normal `npm run build`: compiled successfully in 9.5 seconds, then failed on the known `.next/cache/.tsbuildinfo` EPERM cache write. This was not a compilation error.
- Isolated clean production build: passed compilation (9.0 seconds), TypeScript (2.5 seconds), all 71 pages and final optimization at `.next/lms0716-clean-build`. Environment was inherited without copying `.env` files. The isolated PDF server-bundle verification also passed.
- `git diff --check`: passed; new untracked source/document files were checked separately for whitespace errors.

Database tests execute the exact migration against isolated in-memory PostgreSQL through PGlite, including service-role operation, browser-role denial and SQL boundary checks. The installed native PostgreSQL tools lacked the server share files needed by initdb, so no native server was started. PGlite serializes one connection; these tests do not claim production multi-session contention or hosted cancellation performance. Separate production/nonproduction-host validation gates below preserve that distinction. No test touched Supabase production, generated an external-model answer or processed a document.

## 9. Safe production order — instructions only

1. Review/approve this implementation and migration. Retain the accepted LMS-0715 rollback artifact. Confirm production UTF-8 encoding and expected existing feedback schema.
2. **Apply the additive LMS-0716 migration first**, under a separately authorized execution step. Do not run retention/backfill or any document/corpus processing with it.
3. Verify all six tables, exact columns/checks/FKs/indexes, nullable legacy parent link, RLS flags, revoked browser privileges, service-role grants and restricted capture function execution. Verify the existing feedback table is unchanged.
4. Configure a new **server-only** `AI_QUALITY_HMAC_KEY` with at least 32 random bytes of secret material, represented safely as a string, and `AI_QUALITY_HMAC_KEY_VERSION=1`. Do not reuse a service-role/receipt key or use NEXT_PUBLIC names. Preserve this key for stable grouping; rotate only with an explicit version plan. Verify hosting-log operator access/retention.
5. Deploy the reviewed LMS-0716 / 0.1.538 application through the established workflow. No manager reporting page, source processing, embedding regeneration, metadata edits or activation is required.
6. Run the approved production capture acceptance sequence below and read-only verify stored results. Do not mark Stage 7A accepted until it passes and operational health is reviewable.
7. If application rollback is needed, restore LMS-0715; leave the additive tables/history intact. Do not automatically drop populated tables. Stage 7B/LMS-0717 remains a separate authorization.

## 10. Exact Stage 7A production acceptance

Use approved safe interactions and inspect results without unnecessary PII. No synthetic database rows or deliberate production outages are required.

1. Submit one normal grounded club/USAP question without voting. Verify one lightweight player_interface outcome, version LMS-0716, eligible=true where existing eligibility permits, and no full question/answer occurrence for this unvoted answer.
2. On that same answer click Helpful → Helpful again → Not Helpful → Not Helpful again. Verify exactly two existing feedback events, chronological true then false, same answer_id matching outcome.id; one grounded_feedback occurrence and one New case, with unchanged event snapshots/version. Inspect history rather than assuming client clicks were recorded.
3. Ask a safe genuine question with insufficient official evidence. Without voting, verify final insufficient_evidence, one occurrence, unanswered group and New case; inspect bounded reason, source/evidence/configuration/resolver snapshots.
4. Repeat the same unanswered question as a new request: new outcome/occurrence identity, same conservative group and one case. Ask a materially different ball/legal-specification question where appropriate; do not assume noun overlap means same group.
5. Ask a safe protected personal-value question such as 'What is my DUPR?'. Verify protected metadata only, no raw/effective question, player/member ID, occurrence, fingerprint or rule-gap case.
6. Exercise normal clarification and a safe follow-up. Verify clarification metadata only, existing UX unchanged; when the final result is genuinely insufficient evidence, only that final request creates the review occurrence.
7. Run Test AI Assistant as a manager. Verify manager_test origin and no player feedback eligibility; both existing manager tools and response diagnostics remain available.
8. Inspect representative existing LMS-0712–0715 feedback read-only: historical rows remain unchanged and usable without parent outcome telemetry or fabricated answer timestamps.
9. For confirmed conflict, use the isolated fixture results or a naturally occurring authorized production example; verify High priority and opposing selected evidence. Never alter the corpus to manufacture a conflict. Candidate-only hints must not produce conflict cases.
10. Verify the health endpoint accepts League Manager/Commissioner and denies Club Pro/Captain/Player/anonymous access; verify browser direct table/RPC access is denied. Inspect hosting capture events without exposing raw inputs or secrets.
11. Confirm the player response has no new internal telemetry fields and the existing mobile layout, follow-up behavior, feedback controls, Official Sources and viewer operate normally.
12. Before acceptance, run multi-session retry/collision contention and timeout/missing-schema tests in an isolated hosted PostgreSQL environment if available; local PGlite is not evidence of overlapping server sessions. Do not induce production outages. Record measured capture latency, transport cancellation behavior and the operator health/log-retention check.

No deployment, production migration, production feedback creation, retention, historical backfill or LMS-0717 work was performed. Stages 1–6 remain accepted; Stage 7A awaits review and controlled production acceptance.

## Review stop

Implementation and local validation are complete. Production schema/security verification, hosting-log operational confirmation, multi-session/transport validation and the controlled production interactions remain acceptance gates; none has been represented as completed. No production mutation or deployment was performed. LMS-0717 has not started.

## Deferred production quality findings — documentation only

The owner reported three additional production questions while LMS-0716 was being implemented: `When can I start adding players to my roster for the weekend league`, `When can I start adding players`, and `How do I enter players on my roster`. The full observed answers/citation concerns and diagnostic questions are recorded in the roadmap under **Pending post-LMS-0716 AI quality investigations**.

These findings do not change this release. After LMS-0716 is production accepted, perform a diagnosis-only pass covering Saturday/Important Dates roster timing and tangential Match Setup/score-entry selection, the missing object in the underspecified question, and direct support/material applicability of the retroactive-addition/forfeiture statement. Preserve LMS-0701/LMS-0705 controls and return findings before implementing corrections. No replay, retrieval/selection fix, terminology expansion, clarification change, document/corpus/active-version change or deployment was performed for this note. Existing LMS-0716 validation results and review stop remain unchanged.

## Production preflight stop — inherited service-role privileges (2026-09-05)

The owner subsequently authorized a controlled production migration/validation/configuration/deployment sequence. Before applying anything, read-only discovery confirmed the target is LWR PC League Management (`glikrmmgirilnmamxxyl`), PostgreSQL 17, UTF-8. The six Stage 7 tables are absent; the existing four AI tables have RLS enabled.

**Migration not applied: a permissions defect was identified during preflight.** Production's `postgres` default table ACL grants service_role all table privileges. The reviewed migration revokes PUBLIC/anon/authenticated grants but does not first revoke inherited service_role privileges. Its later limited GRANT statements are additive and therefore would leave UPDATE/DELETE and other inherited privileges on the new outcome/audit tables, contrary to the approved minimum-privilege design. Earlier isolated PGlite tests did not recreate these Supabase default ACLs, so their service-role restriction result is insufficient for this production environment.

Required bounded correction for review: include service_role in the explicit revoke-all on only the six new Stage 7 tables, then apply the existing intended grants (SELECT/INSERT on outcomes/audit; SELECT/INSERT/UPDATE on the other four). Do not alter project-wide default privileges, existing feedback privileges or existing LMS objects. Extend isolated regression coverage to recreate production-like default grants before executing the exact migration and check every retained/revoked privilege. This corrects implementation of the approved permission model, not the model itself.

No production DDL/DML, synthetic rows, cleanup, HMAC secret creation/configuration, deployment or live-answer testing occurred. LMS-0715 remains the deployed rollback baseline. Hosted concurrency, transport, health authorization, hosting-log checks and Stage 7A acceptance remain pending. No LMS-0717 or deferred roster investigation started. Await the bounded migration correction/revalidation decision before resuming production operations.

## Approved permission correction and controlled production validation — 2026-09-05

This is the current checkpoint, superseding the preceding preflight hold. The owner explicitly approved the correction and resumption of the controlled sequence within **LMS-0716 / 0.1.538**.

### Correction and local proof

Production's postgres-owned default ACL grants service_role ALL on newly created tables. GRANT is additive: granting SELECT/INSERT alone does not remove inherited UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges. The migration now explicitly revokes ALL from PUBLIC, anon, authenticated **and service_role on only the six new tables**, then establishes the approved final grants:

| Tables | service_role allowed | service_role prohibited |
|---|---|---|
| ai_request_outcomes, ai_manager_review_events | SELECT, INSERT | UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER |
| ai_review_occurrences, ai_question_groups, ai_question_fingerprint_routes, ai_manager_review_cases | SELECT, INSERT, UPDATE | DELETE, TRUNCATE, REFERENCES, TRIGGER |

RLS remains enabled; browser roles have no table access. The capture function remains SECURITY INVOKER with fixed search_path, service-role execution and no PUBLIC/anon/authenticated execution. Existing feedback-table privileges and project-wide default ACLs were not changed.

`test/aiQualityDatabase.test.mjs` now reproduces production-like ALL table grants and function EXECUTE defaults before applying the exact migration. It tests effective privileges and actual zero-row operations on every table, verifies browser and RPC denials, replays the migration and compares ACLs, deliberately broadens only isolated service grants and proves replay restores the same final ACL, and compares the existing feedback ACL before/after. All 209 tests passed, including the full accepted regression suite. The correction changed SQL/tests/documentation only; the previously successful lint/type/PDF/isolated-build results still apply to the unchanged application code.

### Production results and remaining gates

| Requested result | Evidence/status |
|---|---|
| 1. Migration | Applied successfully as `lms_0716_stage7a` to verified LWR PC League Management project `glikrmmgirilnmamxxyl`, PostgreSQL 17, UTF-8. Fresh preflight found no six-table/function collision. |
| 2. Schema/security | Exact comparison passed for 98 columns including nullability, 86 constraints, 25 indexes and capture function source/configuration. Effective grants and RLS matched the approved design. 72 actual SELECT/INSERT/UPDATE/DELETE permission checks across six tables and three roles passed, using zero-row statements so no operational data changed. Local PostgreSQL 18 represents NOT NULL additionally in pg_constraint; these catalog-only rows were excluded when comparing to production 17, while column nullability was compared explicitly. Migration replay was validated locally under production-like defaults; production was applied once. |
| 3. Concurrency/idempotency | Parallel PostgREST same-answer retries and same-question requests produced one outcome/occurrence per answer, one shared route/group/case for the three same-question answers, and no duplicate cases. Parallel forced-digest collision requests retained distinct normalized values with slots 0/1 and separate groups; retries reused them. Conflict replay preserved a later synthetic priority edit; a fresh conflict escalated to High and an older replay did not downgrade it. No deadlock or unexplained corruption occurred. The initial MCP calls were serial and are not concurrency evidence. Three concurrent HTTP calls against one deliberately held synthetic advisory key all returned 55P03 at 297–298 ms, confirming the bounded lock-failure path. The sampling query did not reliably enumerate waiting backend PIDs; successful creation tests used parallel clients without independent per-transaction timing traces. A valid feedback-enrichment race remains deferred to live acceptance because existing feedback history was not altered. |
| 4. Synthetic rows | Run `LMS0716_SYNTH_20260905_5de988cb13`; explicit answer UUIDs `07160000-2026-4000-8000-000000000001` through `...000010`. ID 7's oversized route failed and its outcome was absent. Created and removed exactly 9 outcomes, 9 occurrences, 6 groups, 6 routes, 6 cases and 7 audit events. Cleanup used an exact UUID manifest after checking synthetic text/origin and absence of external group/occurrence references. All six tables then contained zero rows. No feedback rows or existing LMS data were deleted. |
| 5. HMAC | **Blocked; no key generated or configured.** Available Vercel connector tools do not expose an environment-variable setter; no Vercel CLI auth file is present at the standard local locations, and the connected browser opens the Vercel login page. The owner-required stop condition applies. |
| 6. Deployment | **Not performed.** Accepted LMS-0715 remains live and is the rollback baseline: deployment `dpl_Bi48KvP5NddUbTF6VAgV3nziDYvU`, source commit `fc37e7bfbf3c4a6243e60e09da75177fb5540b55`. |
| 7. Grounded telemetry | Pending deployment and an approved live grounded answer. |
| 8. Feedback correlation | Pending live Helpful → Helpful again → Not Helpful → Not Helpful again sequence. Existing 11 feedback events remained unchanged throughout database validation. |
| 9. Insufficient evidence | Synthetic transactional capture passed; genuine automatic player capture remains pending deployment. |
| 10. Repeated grouping | Three distinct synthetic answers to the same normalized question shared one group/case. Live repeated-question acceptance remains pending. |
| 11. Protected telemetry | Existing local regression coverage passed; live protected question acceptance remains pending. |
| 12. Clarification | Existing local regression coverage passed; live clarification/follow-up acceptance remains pending. |
| 13. Manager test | Synthetic captures used manager_test with feedback eligibility false; actual Test AI Assistant UI acceptance remains pending. |
| 14. Latency/fail-open | Successful synthetic PostgREST calls measured 52–236 ms in the recorded batches. Held-key failures returned in 297–298 ms. An actual 32,769-byte database rejection rolled back without an outcome; the application observer/persistence wrapper returned the identical valid synthetic answer in 61 ms and emitted only capture_failed/persistence through its log callback. This is a local application wrapper using production PostgREST, not a deployed Ask LWR end-to-end result. Hosted 500 ms deadline/cancellation and post-deployment latency acceptance remain pending. A function SET statement_timeout alone is not claimed as proof of a 450 ms end-to-end bound. |
| 15. Capture health | Local authorization regressions passed previously; deployed Commissioner/League Manager allow and Club Pro/Captain/Player/anonymous deny checks remain pending. |
| 16. Hosting logs | No LMS-0716 deployment exists, so production ai_quality_capture visibility, retention and operational monitoring have not been validated. |
| 17. Blockers | Authenticated Vercel environment-write access is required. Live UI acceptance, feedback race, hosted health/log and full hosted latency gates remain open. Do not interpret synthetic results as those live acceptance results. |
| 18. Acceptance | **LMS-0716 / Stage 7A is not production accepted.** Additive database remains ready but dormant under LMS-0715. LMS-0717 and the deferred roster investigations have not started. |

Before/after comparisons found identical existing relation ACL/RLS, column, index, constraint and function hashes and identical project default-ACL hash. Full-row aggregate hashes and counts were unchanged for feedback (11), documents (7), versions (18) and chunks (1,438). Only the six approved new relations and capture function appeared. No auth users, members, league operations, corpus, embeddings, source metadata, processing or activation were changed.

### Manual HMAC configuration / safe resume

In the existing Vercel **lwrpc-admin** project (`prj_IBm5EKA3B2hciTmhvz0kIrPhZAX3`), open Settings → Environment Variables and configure **Production** only:

- `AI_QUALITY_HMAC_KEY`: a newly generated dedicated cryptographically random secret with at least 32 random bytes of entropy, represented as base64 or hex. Mark it sensitive; do not paste it into chat or source files.
- `AI_QUALITY_HMAC_KEY_VERSION`: `1`.

A local PowerShell recipe to place a new 32-byte base64 key on the clipboard without printing it is:

```powershell
$qualityKeyBytes = New-Object byte[] 32
$qualityRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$qualityRng.GetBytes($qualityKeyBytes)
Set-Clipboard -Value ([Convert]::ToBase64String($qualityKeyBytes))
$qualityRng.Dispose()
[Array]::Clear($qualityKeyBytes, 0, $qualityKeyBytes.Length)
```

This recipe was documented, not executed. Paste the value only into the specified sensitive Vercel variable, save it securely and clear the clipboard afterward. Do not reuse service-role/receipt secrets, add NEXT_PUBLIC prefixes, silently replace an existing grouping key, or configure unrelated environments. Future rotation requires a new explicit version. Alternatively, authenticate the Vercel session so the previously authorized setup can continue through available tooling.

After safe configuration, recheck production security/state and resume the already authorized LMS-0716 deployment and outstanding acceptance sequence. Do not reapply the already completed migration merely to resume. No new LMS version is required.

## HMAC gate resumed — 2026-09-05

The owner configured both Production variables manually. Read-only Vercel UI verification confirms AI_QUALITY_HMAC_KEY is Secret/Production and AI_QUALITY_HMAC_KEY_VERSION is Config/Production with value 1. The secret was not revealed, copied or changed. The previously reported configuration blocker is cleared. The production migration will not be reapplied. Release through the existing Git-connected production pipeline and live acceptance are now in progress; this note does not claim acceptance.

## Production deployment complete; authenticated acceptance pending — 2026-09-05

- Read-only Vercel UI confirmed the dedicated key as Secret/Production and version as Config/Production, value 1. The secret was never revealed, copied or changed. Successful HMAC-dependent capture remains the runtime verification gate.
- Normal Git pipeline: pushed reviewed release commit `7dae6d0c49a431e31a73bba2309242a633307b5c` to the existing main branch. Vercel production deployment `dpl_CntbLvoarcpooSgYzGsxby34DWz2` became READY; production alias is https://league.lwrpickleballclub.com. Build completed in 33 seconds; compilation and TypeScript passed. Deployment completed at 2026-09-05 19:54:15 UTC.
- Production browser reload shows LMS-0716. Anonymous GET /api/ai-assistant/capture-health returns HTTP 401 with only success:false and Manager access required. The player UI source was not changed in this deployment. Authenticated payload/UI behavior has not yet been exercised.
- Read-only database recheck: all six new tables retain approved RLS/service/browser permissions. All six remain empty and existing feedback count remains 11. No migration replay or database write occurred in this resumed pass.
- Runtime log query for ai_quality_capture in this deployment returned no events before authenticated testing. Vercel project UI identifies the Hobby plan; official runtime-log documentation specifies one-hour retention: https://vercel.com/docs/logs/runtime. This is an operational retention limit, not proof of live capture success/failure visibility. No logging infrastructure was modified.
- Browser LMS authentication had expired after four hours of inactivity. The owner was asked to sign in without sharing credentials. No member was impersonated, no token was extracted and no auth account/role was changed.
- Grounded telemetry, four-click feedback correlation, automatic/repeated insufficient-evidence capture, protected privacy, clarification/follow-up, actual manager_test separation, authenticated health role matrix, sanitized live capture logs and deployed capture latency/fail-open acceptance remain pending this authenticated test session. Prior local and synthetic database results remain evidence only for their documented scope.
- No HMAC change, document/corpus/embedding processing, deferred retrieval investigation or LMS-0717 work occurred. LMS-0716 is deployed but cannot yet be declared production accepted.

## Authenticated production acceptance stop — 2026-09-05 20:00 UTC

The owner signed in and authorized continuation. Tests used the normal Ask LWR UI under the existing Commissioner session; the player pipeline correctly records origin player_interface independently of the operator role. No auth token was extracted and no roles were changed.

### Passed live checks

- Question: **Can I volley in the kitchen?** The answer correctly stated that volleying must begin outside the NVZ and that contact during the volley is prohibited, with the 2026 USA Pickleball Rulebook Rule 11.A source. Outcome **a3c4db5d-c48f-4f15-b827-91c6b06b5a09**, LMS-0716, player_interface, final_kind=answer, feedback_eligible=true, source_family=usap. Before voting, occurrence count was zero: lightweight telemetry only.
- Actually clicked **Helpful → Helpful again → Not Helpful → Not Helpful again**. Exactly two feedback events were stored for that same answer: true at **19:58:02.029295 UTC**, false at **19:58:57.987090 UTC**, both LMS-0716. Repeated clicks created no additional event. One grounded_feedback occurrence references the same outcome/answer identity; one New case exists. One source and one selected-evidence snapshot entry are present. The route records key_version=1, establishing successful production HMAC-dependent grouping without exposing or changing the key.
- Vercel runtime logs contain sanitized ai_quality_capture/capture_succeeded entries for the answer and both feedback transitions. Application log fields contain only event, stage, assistant_version and time; no question, evidence, identity, credential or signed URL appeared in these capture entries.
- First answer completion 19:57:21.407 UTC → persistence-success log 19:57:21.451 UTC: **44 ms**. Second answer completion 20:00:04.751 UTC → persistence-success log 20:00:04.778 UTC: **27 ms**. These are application-timestamp capture intervals for two successful requests, not overall answer latency or proof of the failure deadline. Database recorded_at lay within each interval. Grounded answer generation itself took 3,649 ms; the second took 10,771 ms.
- The existing Ask LWR header/composer, newest-first exchanges, feedback selection states and Official Sources rendered normally during these tests. No new telemetry fields appeared visibly. Exact live wire-payload parity, mobile/keyboard layout and document-viewer navigation were not independently tested in this pass.

### Stop-triggering result

Question: **What is the official LWR Pickleball Club policy for reimbursement of lost prescription sunglasses?**

The intended no-source test instead produced this answer:

> LWR Pickleball Club does not provide reimbursement for lost prescription sunglasses under the supplied policy evidence. The league waiver says members release LWR PC, match sites, communities/clubs, and officers/volunteers from claims, liability, and costs. No separate reimbursement policy for lost prescription sunglasses is supplied.

Displayed sources were Code of Conduct page 1, DUPR League Rules Rule 3 / Player Requirements page 2, League Waiver page 14 and Rule 5 / Team/Game Rules page 4. A definitive reimbursement-policy assertion based on a general waiver, alongside the acknowledgment that no separate policy is supplied, is an unexpected answer-quality concern. Its correctness/applicability and whether it predates LMS-0716 have **not** been diagnosed. It is not evidence that Stage 7A changed retrieval/selection.

Outcome **a2465488-cdcd-4d78-bce9-415ef2724211** was recorded as answer, LMS-0716, player_interface, eligible=true, with zero detailed occurrences before voting. That is observationally consistent with the pipeline's actual final kind. It does **not** validate automatic insufficient_evidence capture. No feedback was clicked on this second answer and no alternative no-source question was tried after the stop condition fired.

Per the owner's instruction to stop on unexpected Ask LWR behavior, no further acceptance interactions or fixes were performed. Only read-only outcome/log inspection and this documentation followed. No rollback was performed: no serious regression attributable to LMS-0716 has been established. LMS-0716 remains deployed pending review.

### Still pending / acceptance decision

Genuine insufficient-evidence capture, repeated unanswered grouping, protected privacy, clarification/follow-up, actual Test AI Assistant manager_test separation, authenticated capture-health role matrix, safe hosted fail-open/cancellation, exact response-payload parity and mobile/viewer acceptance remain uncompleted. Anonymous capture-health denial and prior isolated/database tests remain valid within their documented scope. Live success-log visibility is now proven; live failure-log visibility is not.

**LMS-0716 / Stage 7A cannot yet be production accepted.** Review this unexpected answer before authorizing continuation or diagnosis. No code, SQL, migration, HMAC, corpus/document/embedding, active version, retrieval/selection or deployment changes were made in this test pass. The previously deferred roster questions were not investigated. LMS-0717 has not started. Live acceptance events are retained; no real feedback/history was cleaned up.

## Diagnosis-only follow-up

The completed `lms-0716-reimbursement-diagnosis.md` contains the historical-versus-replay distinction, full fresh candidate/selection/model-input trace, exact source passages, reimbursement/waiver controls, LMS-0715 neutrality comparison and a verified alternative no-source question. Diagnosis did not write production rows or change application code/configuration. The original negative policy wording was not reproduced verbatim; the incorrect grounded classification and permissive selection reproduce under accepted LMS-0715. Stage 7A may resume unchanged after review using the verified alternative, but remains not production accepted until outstanding live tests pass.

## Resumed Stage 7A acceptance — 2026-09-05, current checkpoint

The owner accepted the diagnosis and authorized continuation without Stage 3/4/generation changes. All interactions below used the deployed application, existing authenticated session and normal UI. Only the authorized requests created operational capture rows. No extra feedback clicks, replayed migration, credential extraction, role change, HMAC change, corpus operation, deployment or application edit occurred in this continuation. Real acceptance history remains stored.

### Automatic no-source capture and exact repeat — passed

Question: **What is the chemical symbol for tungsten?**

| Request | Outcome/answer ID | Occurrence ID | Completed UTC |
|---|---|---|---|
| First | 28c00993-e808-460f-a6fb-73b41e6ab6f0 | bfcd5dc5-e3e4-4c19-b981-6e3deb852652 | 20:14:43.962 |
| Exact repeat, new request | 81fd76b8-cc6e-41e8-8eab-a67de8fa373c | 8f9cb00b-0693-4b32-abac-68dfc7c8b0f7 | 20:15:38.477 |

Both are LMS-0716/player_interface/insufficient_evidence, reason stage3_insufficient_evidence, model_call_skipped=true. Each has exactly one outcome and one automatic occurrence. Both share deterministic group **6932b916-e45e-4299-864e-c10d812a5844** and the single **New** case **8216aace-13eb-49b8-ae9b-037e1b172dd5**. The route uses key_version=1 and normalizer_version=1. No feedback click was required or made.

The existing fallback was displayed for both requests. Top candidate score was .0898; no evidence was selected and no answer-model call was made. Each source snapshot and selected-evidence array is empty. The outcome diagnostic is 271 bytes; selection snapshots are 1,583/1,584 bytes, containing bounded candidate identifiers/scores and reason diagnostics, without candidate passage text or unrelated generated model content. The stored output is the existing fallback, not an invented chemistry answer.

### Other functional gates — passed

| Gate | Production evidence |
|---|---|
| Protected privacy | `What is my DUPR?` → outcome **ad719a08-95da-403c-a7f9-0df2225859ce**, final_kind=protected, raw_live_data_guard, stage3_invoked=false, model skipped, source_family=none, diagnostic_snapshot={}. No detail occurrence/group/case or feedback eligibility. The unchanged generic fallback displayed; telemetry correctly distinguishes protection from missing rules. Outcomes have no question, answer or member identity columns. |
| Clarification | `Are there any color considerations?` → **7fae6a8d-33b3-429f-a374-d8981e7f868d**, clarification/clarification_required, no Stage 3/model, no detail occurrence. UI asked whether ball, paddle, clothing or something else. |
| Follow-up | `Paddle.` → **66fa3d1c-32b3-41ba-a1e7-0463ee46cce3**, effective question `Are there any color considerations for Paddle?`, resolver=clarification_response, clarificationConsumed=true. Actual pipeline result was insufficient_evidence/stage4_no_applicable_evidence, model skipped; one automatic occurrence with no source/selected evidence and bounded resolver flags, not conversation history. This verifies capture/resolution, not a new paddle-rule quality diagnosis. |
| Actual manager interface | Submitted tungsten through **Test AI Assistant**, not the player drawer. Outcome **5f672eb1-dd51-45f4-ad91-d05608ffe0d1**, occurrence **28d2552c-be7d-4885-b196-32a84209a639**, origin=manager_test, insufficient_evidence, feedback_eligible=false. Separate group **5e18213d-0778-423c-8560-2a32df300cd4** and one New case; never joined the player tungsten group. Manager UI showed model skipped, zero supplied evidence and existing diagnostics. |
| Feedback compatibility | Preserved the earlier passed four-click sequence and same-answer correlation without repeating votes. The 11 pre-existing events still match full-row aggregate hash **1fbd99e7e03a37ad0f30865e9ef7617a**. There remain exactly two added LMS-0716 feedback events for the accepted NVZ answer. Legacy receipt/de-duplication compatibility also passed the existing isolated regression. No historical backfill or manufactured vote was performed. |
| Reconciliation/privacy | Eight outcomes total: player 2 answer, 3 insufficient_evidence, 1 clarification, 1 protected; manager 1 insufficient_evidence. Five occurrences, four groups, four cases; zero duplicate answer occurrences or group cases. Protected/clarification detailed occurrences=0. Snapshot key inspection found no auth/member identity, conversation, receipt, signed URL, embedding, content or API-key fields. |
| Existing data/security preservation | Existing relation ACL/RLS, column, constraint, index, function and project-default ACL hashes equal the pre-migration baseline. Full-row hashes/counts still match for documents (7), versions (18), chunks (1,438), and the original feedback (11). Prior effective six-table/RPC privilege operation tests remain passed. |
| Player contract/UI | Existing result-key regression passed and route still serializes only `{success:true,result}`. Observer returns the identical execution object. Player UI/CSS, retrieval, generation and viewer files are unchanged from accepted LMS-0715. Live desktop and 390×844 checks showed the compact opaque full-screen mobile panel, visible composer/close control, scrolling newest-first exchanges and ordinary clarification/fallback rendering. Desktop viewport restored. Exact live network-payload parity and a physical phone keyboard were not independently measured. |

### Capture health, logs and latency

Sanitized production `ai_quality_capture` success logs were verified for player insufficient-evidence, protected, clarification/follow-up, and manager requests, in addition to the already-passed answer/feedback events. Application fields remain event, stage, assistant_version and time; no question, evidence, identifiers, credentials or signed URLs. Hosting adds its ordinary request/deployment metadata separately.

| Request | Completion → success-log interval |
|---|---:|
| Prior grounded NVZ answer | 44 ms |
| Prior reimbursement answer | 27 ms |
| Tungsten first | 75 ms |
| Tungsten repeat | 47 ms |
| Protected | 52 ms |
| Clarification | 50 ms |
| Clarification follow-up | 52 ms |
| Manager test | 58 ms |

These are eight successful application-clock capture intervals (27–75 ms), not a load test, overall answer latency or proof of a deployed failure deadline.

Operational choice: use the existing Vercel runtime logs and manual operator verification. The project's Hobby retention is **one hour**, per the verified [Vercel runtime-log documentation](https://vercel.com/docs/logs/runtime). Check the same deployment's last 15 minutes for capture_succeeded/capture_failed; database recency alone is not health. The endpoint deliberately returns Unknown with operator_log_verification_required when its database read succeeds, or Degraded when unavailable. No automated external log feed or longer-retention drain was configured or claimed.

Previously passed live anonymous health denial remains valid. An isolated harness executed the current route, authorizeAdminRequest and actual role hierarchy, substituting only Supabase/NextResponse dependencies: anonymous/invalid token=401; Player/Captain/Club Pro=403 without outcome reads; League Manager/Commissioner=200 with private,no-store and Unknown; simulated database failure=Degraded without raw errors. This was **not** the live authenticated endpoint role matrix, and no user token or role was changed to produce it.

An isolated current-source test of the **default 500 ms** capture deadline completed in **503 ms**, aborted persistence, emitted only capture_failed/persistence, and returned the identical valid answer object. Prior production synthetic lock failures (297–298 ms) and local wrapper using production PostgREST rejection (61 ms) remain separately scoped evidence. No deployed outage, missing-schema condition or HMAC failure was induced. The 15 existing focused capture tests passed again, including Unicode byte boundaries, fail-open, privacy, legacy receipt and result-key compatibility. Prior full 209-test/build/lint/type/PDF results remain unchanged; no application change required rebuilding.

### Acceptance decision and remaining verification limits

**Functional Stage 7A production capture acceptance passed; no new Stage 7A defect was observed.** The safe tests requested in this continuation are complete. An unqualified claim that every original live operational gate passed would be inaccurate. Final owner production-acceptance review must explicitly consider:

1. The authenticated capture-health role matrix was exercised in isolation, not against production. The signed-in UI has no health action that supplies the required bearer header; available browser automation does not provide an authorized API-request surface. No credential extraction, impersonation or role manipulation was used to bypass that limitation.
2. Deployed failure-log emission and end-to-end hosted timeout/cancellation remain unobserved. Successful live latency, bounded real database failures and isolated fail-open passed, but no safe deployed fault-injection mechanism exists in this release. Do not create a production outage merely to fill this test cell.

These are verification gaps for final review, **not demonstrated defects**. They are separate from the deferred answer-quality issue. This report stops at acceptance review and does not silently waive those original live gates or label them passed. No LMS-0717 work is authorized.

### Approved deferred follow-ups — not implemented

- **Generic upstream applicability/generation issue:** the owner accepted the reimbursement diagnosis as pre-existing, not a demonstrated LMS-0716 regression. After Stage 7A acceptance, obtain separate diagnosis/implementation authorization for a generic Stage 4 applicability rule: retrieval rank/authority alone must not make tangential evidence directly applicable to the user's issue. When selected evidence does not establish the requested fact/policy, generation must not infer a policy or incorrectly label it grounded. Do not hardcode reimbursement, sunglasses, lost property or waiver-specific answers. Preserve the existing three deferred roster investigations and LMS-0701/LMS-0705 controls; none was investigated here.
- **Future player UI only:** `Ask LWR PC AI may make mistakes. Check Official Sources for important information.` Place small muted centered text immediately above the `Ask a question` composer on desktop/mobile, unobtrusively, without changing answer/source behavior. Recorded only; not implemented in LMS-0716.

## Final read-only acceptance review — 2026-09-05

**LMS-0716 / 0.1.538 — PRODUCTION ACCEPTED**

**Stage 7A — COMPLETE**

This decision follows the owner's explicit authorization to accept the two documented verification limitations if the evidence remains sound. It supersedes the preceding pending-review status, without retroactively labeling unexecuted checks passed. No new defect was found.

### Final production findings

- Vercel production alias still resolves to READY deployment `dpl_CntbLvoarcpooSgYzGsxby34DWz2`, Git commit `7dae6d0c49a431e31a73bba2309242a633307b5c`. Local reviewed capture/grouping/health code matches that source commit. The 500 ms constant, cancellation, guarded secondary persistence and unchanged answer return are the tested implementation; no evidence indicates a materially different production fail-open implementation.
- Re-read all eight acceptance outcomes and five correlated occurrences. Grounded metadata exists; the NVZ answer/outcome identity remains `a3c4db5d-c48f-4f15-b827-91c6b06b5a09` with exactly two feedback values `[true,false]` in time order. The unvoted second grounded answer still has no detailed occurrence. Tungsten's two distinct outcomes/occurrences share group `6932b916-e45e-4299-864e-c10d812a5844` and exactly one New case. Protected and initial clarification outcomes have no detailed occurrence; the resolved follow-up's actual insufficient-evidence result is captured separately. Manager_test retains its separate group and reporting origin.
- No duplicate cases, deterministic groups or answer occurrences were found. Outcome identities remain unique. Across all six tables, no pre-deployment synthetic UUID prefix or validation-run marker remains. No new requests or votes were created during this review.
- All six tables retain RLS. Effective anon/authenticated table privileges are empty; both browser roles cannot execute the capture RPC. Service_role retains only SELECT/INSERT on outcomes/audit and SELECT/INSERT/UPDATE on the other four, with DELETE/TRUNCATE/REFERENCES/TRIGGER denied throughout. Service_role alone among these tested roles retains capture RPC execution. These are fresh catalog/effective-privilege checks, supported by the previously passed actual-operation tests; no DML permission probes were repeated in this read-only review.
- Existing schema/relation ACL/RLS, constraints, indexes, functions and default-ACL hashes still match the baseline. Original 11 feedback events have the identical aggregate full-row hash. Documents (7), versions (18), chunks including embeddings (1,438) retain identical full-row hashes. No corpus data changed.
- Protected diagnostics remain empty with no raw/effective personal question or member identity. Snapshot scans found zero forbidden identity/conversation/receipt/token/embedding/content keys and zero HTTP URL/JWT patterns. This complements the server snapshot allowlists and privacy regressions; it does not claim an unlimited semantic PII detector.
- All four production fingerprint routes record key_version=1. Successful grouping and repeated exact-question reuse establish runtime use of the configured production HMAC, alongside the previously verified Production configuration. No secret was read, printed or changed. The deployment is unchanged.
- Fresh Vercel runtime-log review still shows sanitized success events for all eight requests and two feedback transitions, with only event/stage/version/time in application capture logs. No capture-failure event was observed in that reviewed window. The eight measured successful request-capture intervals remain 27–75 ms, below the intended 500 ms budget. This is observed successful behavior, not proof of every possible latency or failure path.

### Live authorization checks actually exercised

A fresh uncredentialed GET to `/api/ai-assistant/capture-health` returned HTTP 401 with exactly `{"success":false,"error":"Manager access required."}`. No question, user, source or secret data was returned.

The only available browser session displays Commissioner in Test AI Assistant. Its document exposes no health button or WebMCP tools; the available browser API has no authenticated request facility. The endpoint requires an Authorization bearer header rather than merely the browser's signed-in page state. Therefore **live Commissioner/League Manager health success was not exercised**, and no authenticated minimal-success response is claimed. No other role session was available, no token was extracted, and no account or role was changed. Existing isolated tests execute the actual authorization/route code and verify Commissioner/League Manager allow, all lower-role denial, minimal Unknown/Degraded output and private,no-store. Static review of the unchanged deployed-source route confirms the success payload is limited to success plus status, lastRecordedAt and independentSignal; live success-payload validation remains part of this accepted authorization limitation.

### Accepted operational limitations

1. Full live capture-health denial matrix was not exercised using separately authenticated production accounts for every role; isolated authorization tests plus available live checks provide current evidence. The tooling limitation also prevented an authenticated health success call despite an existing Commissioner UI session. This remains visible for future operational review, not silently marked passed.
2. **Production failure injection intentionally not performed because analytics capture is non-critical and intentionally causing a production failure would create more risk than acceptance value.** Production failure/timeout injection was intentionally not performed; isolated fail-open testing (default timeout returned unchanged answer in 503 ms), previously bounded synthetic production lock/concurrency validation, and deployed successful capture/log behavior provide current evidence.

Per the owner's final acceptance instructions, these limitations do **not block Stage 7B unless new evidence indicates a problem**. Existing log retention is one hour and health requires manual operator review; no automated health or guaranteed capture delivery is claimed.

### Scope preserved / stop

Only documentation changed in this final pass. No production database mutation, new test outcome/vote, user/role change, HMAC change, migration replay, application code/version change or deployment occurred. `git diff --check` passed after documentation updates. Historical evidence is preserved.

The generic applicability/generation hardening remains a separately authorized post-Stage-7A quality item. All three roster questions remain pending. The exact future disclaimer remains recorded: **Ask LWR PC AI may make mistakes. Check Official Sources for important information.** Placement remains small muted centered text immediately above the Ask a question composer on desktop/mobile. None was implemented. LMS-0717, AI Feedback & Review manager UI and Live LMS Intelligence have not started.
