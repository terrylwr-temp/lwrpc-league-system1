# LMS-0723 / 0.1.545 — identity repair concurrency validation STOP

2026-09-07. **Deployed, NOT production accepted. No production repair, migration, deployment, backup export or version change.**

The owner approved local repair implementation for only the 14 existing-role links and one identical Commissioner split, but expressly prohibited the broad table locks in the prior SQL proposal. Real independent-session testing demonstrates that removing those locks and adding a repair-only advisory lock does **not** preserve all required mutation-time safety guarantees with current legacy writers. Implementation stops before a deployable migration is finalized. No unsafe repair was promoted into application code.

## Reproduction and results

[Diagnostic harness](../lwrpc-admin/scripts/lms0723-identity-concurrency-probe.mjs) and [machine-readable results](lms-0723-identity-concurrency-probe-results.json).

Runtime: official EDB portable PostgreSQL **17.11**, Windows x64, temporary isolated cluster listening only on 127.0.0.1:56173. Production is PostgreSQL **17.6**, Linux/aarch64. This is the same major version, not an exact patch/platform replica. The installed PostgreSQL 18 command-line package lacked server initialization resources, so a portable runtime was downloaded to the OS temporary directory; no system service was installed or changed. The test cluster was stopped after the run. Only synthetic `example.invalid` identities were used; no production credentials or records were copied.

The experiment extracts the approved proposal's function into the isolated database, removes its three broad table locks and substitutes one transaction advisory lock keyed by Auth ID, retaining existing row locks and validation. It adds a test-only synchronization barrier after eligibility/uniqueness validation and before the role-row mutation branch. The barrier allows a second independent client to commit a competing member row before the repair writes the link. This is a diagnostic candidate, **not final production SQL**. The harness exit code is zero when the expected defects are reproduced; it does not signify repair acceptance.

| Required gate | Observed result |
|---|---|
| A: simultaneous repair of same safe identity | First succeeds, second waits and returns `already_linked`; one audit event. |
| B: legitimate update of the same role row | Repair waits, then preserves the changed role text, but still links it. The proposal has no expected-role/row-state manifest guard to reject this unreviewed change. No role overwrite occurred; strict reviewed-state requirement is unmet. |
| C: simultaneous identical-role consolidation | One consolidation; second returns `already_linked`; one audit event. |
| D: immediate rerun | No-op; audit count unchanged. |
| E: conflicting link committed before revalidation | Correctly refused. |
| E: new duplicate candidate while repair transaction is open | **FAIL:** competing member insert and repair both commit; two normalized-email candidates now exist. |
| Same duplicate race with SERIALIZABLE repair / READ COMMITTED legacy writer | **FAIL:** both still commit. Changing the repair's isolation level alone is insufficient. |
| Unrelated team registration during held repair | Synthetic team insert completed in both A and C tests. No broad table locks were used by the experimental repair. |

The duplicate insertion commits after the eligibility check and **before the actual link mutation**, not merely after an otherwise completed repair. Another final SELECT only relocates that race window unless concurrent writers share an enforced coordination/constraint mechanism. Rows not yet present cannot be protected by locking the existing candidate alone. Repair-only advisory locking serializes participating repair calls, not legacy member/Auth/role writers. PostgreSQL documents that row locks affect writers/lockers of the same rows and that advisory locking relies on application cooperation: [locking documentation](https://www.postgresql.org/docs/17/explicit-locking.html). Serializable guarantees also require careful coordination with other transactions: [transaction isolation](https://www.postgresql.org/docs/17/transaction-iso.html). The observed failure is from the local database, not merely an inference from documentation.

## Current production structure and role-row references — read-only

Production catalog verification found:

- `user_roles.user_id` has a UNIQUE index.
- `user_roles.member_id` has a **nonunique** index.
- `members` has a nonunique `lower(email)` index, not normalized-email uniqueness.
- No non-internal triggers exist on `auth.users`, `members` or `user_roles` to coordinate identity reconciliation.
- No foreign key references `user_roles` row IDs. No reference repointing is authorized or needed under the current catalog.

Application role-row ID readers/writers include member detail role edits, stale-Captain corrections, team Captain/Pro helpers and location Pro helpers. They must remain in the prospective compatibility review; no member/team rows were changed here. Member-detail update uses `.select('*').single()` and surfaces a missing/stale row as an error. Team/location helpers also retain existing role IDs during their update flow; a cached ID for the removed fragment requires stale-state handling/retry review, not blind reference repointing.

The acceptance identity remains eligible in the prior approved snapshot: R1 Auth-only Commissioner and R2 member-only Commissioner. The proposed canonical R1 survives, R2 is removed only after proving exact identical-role identity and no FK references; both snapshots are retained atomically. That row-level behavior remains proposed and was simulated successfully in concurrent test C. It cannot be executed in production until the broader concurrent-candidate and expected-state guards are resolved.

## Required design correction before continuing

Keep the prohibition on broad table locks. Do not silently reinstate them or freeze registration.

1. **Reviewed manifest guard:** pin the exact approved Auth/member/role-row IDs and expected pre-repair role/link state for the 15 identities, using a protected artifact/table and an immutable operation/run identifier. Re-read under locks and compare to the approved state, not merely an allowed role name. Mismatch means skip/report. Replays must be recognized from the exact committed repair provenance before treating a changed row as safe. Do not dynamically expand the cohort to newly eligible accounts.
2. **Shared identity-key coordination or suitable database-enforced constraints:** repair and relevant member/Auth/role writes must participate in a common protocol that protects new competing rows as well as existing ones. A repair-only advisory lock does not do this. Review a narrowly scoped per-identity/email-key guard enforced by relevant writers (potentially carefully reviewed triggers/server write paths) and its lock ordering, deadlock handling and expiry/release behavior. Do not add a global unique email constraint: historical duplicate members exist and email is not permanent identity. Do not add a one-role-per-member constraint without resolving the multiple-role policy.
3. **Prospective workflow boundary:** the reviewed design explicitly left a future coordinated server/writer protocol for separate review. Implementing triggers on Auth/member/role writes or changing those writers' locking contract is a broader workflow/schema correction. Under the owner's section 13 instruction, stop and report it before implementing. The maintenance function must not simply gain service-role execution.

This report identifies the needed correction but does not prescribe an unreviewed trigger or final new constraint. No final migration/RPC can honestly be represented as production-ready under the current lock restriction. The prior SQL remains historical design evidence and is now marked blocked.

## Scope and acceptance preservation

- Only the previously approved **15** are eligible for a future reviewed repair. The **107 absent-role accounts remain deferred**; no Player or other role provisioning. The two conflicts (including the structurally complete email discrepancy), eight unusable/unverified accounts and one inactive member remain untouched. Email mismatches never authorize reassignment of an existing durable link.
- Mutation-time checks must still cover existence, verified/current exact normalized email, unique candidates, active member, competing links, exact approved role state and FK references. Current counts alone are not a protected candidate manifest.
- Audit design stays private and atomic: operation/time/actor/operator/IDs/method plus role-row before/after states, no email copies. A/C/D demonstrated one event, no duplicate consolidation/audit. An incomplete concurrency implementation is not accepted merely because its audit works.
- No changes to getUser, server-only RPCs, subject resolution, field authorization, email access, named-person no-self-fallback, Live response generation or Stage 7. No email runtime fallback. No model/embedding calls were made by this work; the concurrency harness calls local SQL only.
- The previous 30-check post-link simulation remains evidence of the expected database path: two active seasons cause the existing season clarification, then `missing` for each applicable season (one no row, one NULL). This pass does not claim a new production SELF_RATING success. Do not select a different season or manufacture NR/rating data.
- Existing full regression tests include Live projection/relationship guards and sanitized telemetry checks. A final revised repair must additionally rerun the post-repair security/telemetry suite before production authorization; this blocked experimental function is not that final repair.

## Backup/rollback and continuation

No production backup/export occurred. Before a future authorized repair: protected exact row-level snapshots for the pinned 15, expected state/IDs/role values/timestamps, run identifier, and no unnecessary emails. Audit must retain the two original Commissioner fragments and final canonical row. Rollback must compare current state with the committed after-state, restore only unchanged affected identity rows, reinstate the removed fragment and original timestamps where approved, and append a rollback event. Any intervening legitimate role change requires review; do not restore an old operational database snapshot over current registrations. No references are currently repointed.

Next sequence:

1. Review/authorize the narrowly scoped shared-writer coordination and exact-manifest design correction.
2. Implement locally; rerun all five concurrency gates plus competing candidate inserts/updates, exact-state skips, committed rollback, stale role-ID writers and effective security under production-like defaults.
3. Complete final missing-data/projection/telemetry and full regression validation; stop for owner review before production.
4. Only after separate authorization: fresh preflight, exact candidate manifest review and protected backup, support migration, acceptance-account-only repair, SELF_RATING season/missing-data test, then remaining 14 if still eligible, followed by the previously approved production acceptance sequence. Never include the 107 no-role accounts or reapply earlier Live/session migrations.

## Validation disposition

Passing baseline checks does not override the failed concurrency gate. No application code or deployable migration was changed; only the diagnostic harness/results, local logs and documentation were added.

| Requested validation | Result |
|---|---|
| `npm test` | PASS — 638 tests, zero failures. [Log](lms-0723-identity-tests.log). |
| `npm run lint` | PASS — zero errors, six existing warnings. [Log](lms-0723-identity-lint.log). |
| `npx tsc --noEmit --incremental false` | PASS, exit 0. [Log](lms-0723-identity-types.log). |
| `npm run verify:ai-pdf-server-bundle` | PASS. [Log](lms-0723-identity-pdf.log). |
| `npm run build` | Compilation succeeded; then known `.next/cache/.tsbuildinfo` EPERM write lock, exit 1. This was not a compilation failure. [Log](lms-0723-identity-build.log). |
| Established isolated clean production build | PASS, exit 0, using `scripts/lms0722-isolated-build.mjs` against current 0.1.545 source. [Log](lms-0723-identity-isolated-build.log). |
| `git diff --check` | PASS; only Git's existing LF/CRLF conversion notices. |
| Real multi-session concurrency acceptance | **FAIL / STOP**, with successful controls and failing candidate/expected-state gates detailed above. |

The final stricter probe placed the barrier **before** the role mutation and again reproduced both duplicate-candidate failures. The isolated PostgreSQL server shut down normally after the tests. No production identity, operational data, Auth state, RLS/grant or application version was modified.
