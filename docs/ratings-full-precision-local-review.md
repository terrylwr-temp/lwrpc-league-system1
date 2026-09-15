# Full-precision ratings â€” local implementation and repair review

Status: LOCAL REVIEW ONLY. No production migration, repair, deployment, Upload, or Clean was executed. Accepted application baseline: `7c0e5c7c1fff3803f6b3c2593175dd5ef11c9037`. Candidate branch: `codex/ratings-full-precision` in the isolated `.local-validation/ratings-full-precision` worktree.

## Migration and application correction

Migration: `lwrpc-admin/supabase/migrations/20260911232820_ratings_full_precision_and_guarded_repair.sql`.

SHA-256: c3b4cfb6b433087c6b419898ffacfca282c4f0da2f7ed41b77f81394b7c4e811.

The existing `ratings_workflow_private.plan(uuid,uuid,text,jsonb)` fill expression changes from truncating Doubles/Age to `s->field`. Source validation and fill-blank-only behavior remain intact. Upload/Transfer fingerprints include `:full-source-precision-v2`, rejecting outstanding receipts from the prior planner. Migration apply checks the reviewed expression, fails on unexpected baseline definitions, and supports replay. Clean and commit function definitions remain identical.

`SeasonRatingsWorkflow.js` displays full source values in administrative Upload preview and explains where truncation occurs. No main-grid Age-Based column is added. The grid already renders stored Doubles text directly: production `4.0` is an already-truncated stored value, not a display-only rounding issue. Working Doubles text and unrestricted numeric Age already support the precision; no column changes, uniqueness constraints, or table additions are included.

Upload preserves populated inputs and final ratings. Clean alone truncates final regular/PrimeTime ratings and leaves all working values and RF intact.

## Production-derived preview

Read-only production snapshots were replayed into local PGlite with actual production planner/Clean/commit definitions, 1,986 member identities, accepted batch evidence, working rows, provenance, current Rules and division context. All repair/rollback mutations were confined to that local database. The preview is an evidence snapshot, not permission to execute it.

Fall season: `3780e56b-adeb-46be-ab1c-b754bc8aa737`.

| Measure | Count |
|---|---:|
| Affected members | 625 |
| Previously truncated Doubles fields | 620 |
| Previously truncated Age-Based fields | 556 |
| Detected later manual edits | 0 |
| Source-conflict members excluded entirely | 2 |
| Repairable members | 623 |
| Repairable Doubles fields | 618 |
| Repairable Age-Based fields | 554 |
| RF changes | 0 |

Two source conflicts require owner review:

| Member | DUPR ID | Originally selected source | Latest accepted source |
|---|---|---|---|
| Barry Wolf | 3L4VK3 | Doubles 4.196; Age 4.744 | Doubles 4.193; Age 4.744 |
| Chris Oleson | V4MJ6J | Doubles 3.779; Age 4.028 | Doubles 3.776; Age 4.025 |

The repair does not choose between conflicting snapshots or repair even the nonconflicting field of an excluded member. Original batch `19754fb2-d203-4e1a-8416-f2a0a21cc9a5`; latest batch `e2371f6f-a4a0-415e-a824-798a3302ff69`.

Normal inline edits set `updated_at`; none of the populated rows has a later timestamp than its input selection. Preview also verifies exact current values, provenance, accepted batch identity, latest source agreement, RF, and unique active member identity. There is no immutable per-field audit or update trigger capable of disproving a historical direct-SQL edit-and-restore that bypassed `updated_at`. Thus zero means **zero detected normal-workflow later edits**, not proof that arbitrary privileged historical changes were impossible. Invalid/malformed evidence fails closed and must be reviewed.

Terry Adelman (`1R9LNE`, member `43e1e363-82f1-47d7-a869-befed4c967b8`): Doubles `4.0 â†’ 4.077`; RF `100 â†’ 100`; internal Age `4.3 â†’ 4.311`; final Season `4.0` and PrimeTime `4.3` remain untouched. Terry Captain and the remaining eight duplicate-ID groups are outside the repair.

## Clean impact

Across all 625 affected members, restoring the originally selected source gives: regular same **625**, changed **0**; PrimeTime same **625**, changed **0**. Compared with current stored finals, an effective Clean also leaves regular **625 same / 0 changed** and PrimeTime **625 same / 0 changed**. Existing rules defer 83 regular and 130 PrimeTime results. The two conflicts are included only in this hypothetical comparison and remain excluded from repair. Local repair successfully changed 1,172 fields for 623 eligible members in approximately 25.7 seconds under concurrent test load; guarded rollback restored exact prior ratings, sources and provenance..

This comparison uses current Rules/divisions and RF cutoff **29**. It is not a claim about a different future cutoff or changed membership/division context. Local boundary tests cover 4.077, 4.099, 4.100, 4.199, 4.999, and 3.604, including committed Clean results without altering working inputs. No production Clean ran.

## Repair safeguards and security

Private `precision_candidate` derives changes solely from accepted source/provenance. `precision_repair_preview` is read-only. `repair_precision` accepts 1â€“1,000 exact reviewed rows, up to 8 MB, exact season/version/run ID, and compares the entire current candidate with the manifest after locks. It cannot serve as a general overwrite endpoint. A row conflict aborts every repair change in that run.

New functions are owned by `postgres`, SECURITY DEFINER, with fixed empty `search_path`. PUBLIC, anon and authenticated have no execution rights. Only service_role may execute preview/repair; it cannot execute the helper or directly read the private audit table. Existing authorization plus explicit Commissioner identity is required. There is no public RPC wrapper, browser route, RLS change, or new table grant. The existing planner retains its owner/security/grants through replacement.

The repair takes the existing per-season advisory lock, deterministic rating/provenance row locks, and brief SHARE locks on member/source/batch tables to prevent evidence races. These can temporarily delay member/source writes across seasons; schedule any later authorized execution accordingly. It configures lock timeout 5 seconds and statement timeout 30 seconds; the controlling transaction must also set these before invocation. Local timing is evidence, not a production performance guarantee.

Existing private `runs` records actor, exact payload, before/after rows, source batch fingerprints, affected counts, timestamps, and success/failure. Field provenance retains original raw/import/selectedAt and records repaired value/run/time. RF, final ratings, notes, timestamps, member identity, teams, Auth and histories are not changed. Failure handling rolls working/provenance changes back together and records zero affected rows plus reason; invalid authorization and external cancellation abort before a durable failure audit can be guaranteed.

Rollback requires a successful target repair run, exact after-state and unchanged source; it restores the original working values and provenance only. Any intervening edit blocks rollback. Audit records remain. Run IDs replay idempotently and cannot be repurposed.

## Validation

Focused: **14/14 pass**. Full candidate: **1,259 pass / 10 fail / 1,269 total**. Exact accepted baseline: **1,244 pass / 11 fail / 1,255 total**. All ten candidate failures reproduce on baseline; **zero candidate-only failures**. The additional baseline failure, `0723 real Stage 7 live outcomes retain no facts or unanswered occurrences`, passed its isolated rerun (1/1) and passes in the candidate. Its broad string-search assertion is intermittent; no unrelated correction was made. The ten established failures remain separate test debt (seven Ask LWR assertions and three SQL rollback/identity comparisons).

| Failure | Accepted baseline | Candidate |
|---|---|---|
| 0724 review-only rollback restores prior function and privilege state without data changes | FAIL | FAIL |
| 0725 formerly missing evidence is selected from current sources with all distinct rating requirements | FAIL | FAIL |
| 0725 policy operation: When does my Season DUPR lock? | FAIL | FAIL |
| 0725 policy operation: When is Season DUPR established? | FAIL | FAIL |
| 0725 policy operation: When is my PrimeTime Season DUPR established? | FAIL | FAIL |
| 0725 policy operation: When is my Season DUPR established? | FAIL | FAIL |
| 0725 policy operation: When is my Season DUPR locked? | FAIL | FAIL |
| 0725 policy operation: When is my Season DUPR set? | FAIL | FAIL |
| 0728 rollback and partial recovery retain metadata and business data | FAIL | FAIL |
| 0729 SQL identity, record, feedback and effective View-As | FAIL | FAIL |

Lint: **0 errors, 6 existing warnings**. TypeScript `tsc --noEmit`: pass. `npm run build`: pass. PDF server bundle: pass. Diff checks: pass. No test failures were waived as fixed. Production acceptance is not claimed..

Production-compatible validation uses local PGlite and captured production functions/data, not a full hosted Supabase instance. It verifies planner apply/replay without rating/source changes, identical Clean/commit definitions, full repair, and exact ratings/source/provenance restoration after rollback. Synthetic tests cover browser/role denial, grants, stale receipts, manual/source/RF/identity conflicts, protected final changes, changed batch evidence, manifest tampering, injected second-row failure, rollback conflicts and run-ID collision. Live production execution and hosted concurrency testing remain outside this authorization.

## Controlled migration sequence â€” requires separate approval

1. Approve the exact migration hash and application diff. Recheck current live function definitions/ACLs and application identity against reviewed baselines; stop on drift.
2. Capture restricted recovery copies of planner definition, grants and relevant data/provenance. Confirm the tested planner rollback file is available.
3. Apply only this migration through the controlled migration mechanism in a transaction; no repair call. Verify new function ownership/grants, unchanged business-data fingerprints, planner version and stale Upload/Transfer receipt rejection using local fixtures/read-only checks.
4. Deploy the paired preview formatter only when separately approved. Preview-only acceptance; no Import or Clean.
5. If reverting, use `lwrpc-admin/supabase/rollback/ratings_full_precision_planner.sql` and the accepted application rollback. That SQL restores the old planner and disables repair entry points, retains audit, and does not rewrite data. If repair has already run, perform its separately approved guarded data rollback **before** disabling repair entry points.

## Controlled repair sequence â€” requires separate approval

1. After the migration is separately authorized/applied, obtain a fresh read-only preview under the actual Commissioner. Recheck all source, identity, protected-value and provenance evidence. The local snapshot manifest is not an executable approval.
2. Present the exact 623-or-currently-eligible member list, field changes, excluded conflicts, source batches, season, manifest SHA-256, and fresh run UUID for owner approval. Any drift changes the review scope. Keep both conflict members and all duplicate-ID groups excluded.
3. Set transaction timeouts before calling the private repair once using trusted server-side service access and the authenticated Commissioner identity. Execute only the approved exact manifest; inspect returned `status`, not merely SQL success. Commit audit and verify affected counts. Never automatically retry with a changed manifest or run Clean.
4. Verify full working source precision, unchanged RF/finals and protected business data, recorded provenance, and zero remaining repair candidates among that approved set. Preserve before/after audit securely.
5. If rollback is separately authorized, use a fresh run ID with mode `rollback`, exact season/version, and target repair ID. Require unchanged after-state/source; stop on conflicts, never overwrite them.

Restricted per-member preview, manifest and production snapshots remain in ignored `.local-validation` files and are excluded from commits. No secrets or raw member snapshots belong in the repository.

**STOP FOR REVIEW â€” production migration and repair remain unauthorized.**
