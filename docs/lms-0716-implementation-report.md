# LMS-0716 implementation report — Stage 7A

Version **LMS-0716 / 0.1.538**. **Corrected additive migration applied to production on 2026-09-05; application not deployed and Stage 7A not production accepted.** Controlled validation stopped at the HMAC configuration gate because authenticated Vercel environment-write access is unavailable. All identified synthetic validation rows were removed. LMS-0715 / 0.1.537 remains the accepted production application. Stages 1–6 remain production accepted. LMS-0717 has not started. The final section supersedes the earlier local-review/preflight checkpoints below.

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
