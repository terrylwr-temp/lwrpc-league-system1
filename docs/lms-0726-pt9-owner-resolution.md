# LMS-0726 / 0.1.548 — owner PrimeTime 9 resolution and remaining readiness

**PrimeTime 9 discrepancy CLOSED. Overall readiness remains CONDITIONAL.** Production was read only. The owner's configuration edits are intentional authorized administration; no assistant production mutation, deployment, deletion, OpenAI call or application implementation occurred.

## Verified current mapping

Read-only observation at 2026-09-09 00:03:03 UTC (September 8, 8:03 p.m. Eastern):

| Division | Stored minimum | Stored maximum | Governing Rules | Result |
|---|---:|---:|---|---|
| MPT 9 | 3.4 | 4.8 | Current PT9, page12: 3.4–4.899 | MATCH in approved one-decimal Season DUPR domain |
| WPT 9 | 3.4 | 4.8 | Current PT9, page12: 3.4–4.899 | MATCH in approved one-decimal Season DUPR domain |

League: PrimeTime DUPR League; season: 2026 Fall Season. Rules active version: `v20260908162017-f0aad5ad`. Pair maximum remains 9.1 and belongs to lineup validation, not Add Player.

The database did not return an exact stored 4.899: min/max columns are numeric(3,2), and the current Division editor rounds input to two decimals. After this difference was reported, the owner explicitly selected **“Keep normalized 4.8 for Season DUPR.”** That resolves the representation question. Do not propose a precision migration for this decision. Do not attribute the observed 4.8 to automatic truncation by the editor: its rounding behavior alone does not explain that value.

Use current `divisions.min_dupr/max_dupr` through the selected team/division/league/season join as the structured bound source. No independent 3.4/4.8/4.899 constants in Add Player or application admission logic. The owner-approved mapping compares one-decimal Season DUPR with those bounds. This closes the previous 3.3–4.9 conflict, not the distinct need for authoritative Rated/NR/season context for a particular player. No PT9 conflict hold should remain merely because historical evidence recorded the old values.

[Current evidence and deterministic controls](lms-0726-pt9-owner-correction-evidence.json). Earlier JSON snapshots are historical evidence and are intentionally not rewritten as though the correction had already existed.

## Regression controls

The documentation-level deterministic comparison extracted the **current**, non-Future PT9 row from the returned governing Rules text, then compared both returned division rows. No document parsing in production SQL is proposed.

- Both current normalized mappings: PASS.
- Exact decimal equality to 4.899: false, expected under the explicit owner-approved normalized representation; not an active conflict.
- Prior 3.3–4.9 fixture: rejected.
- Future changed-minimum and changed-maximum fixtures: rejected.

Implementation gate PT9-01: selected season/league/current PT9 binding references the approved active Rules version and normalization semantics; MPT9/WPT9 read their own structured bounds. PT9-02: future material mismatch yields POLICY_CONFIGURATION_CONFLICT/League review and no Add, rather than silently accepting a stale bound. PT9-03: changed Rules version invalidates correspondence until reviewed; do not automatically parse or trust a future row. PT9-04: if a rating is not known to belong to the approved one-decimal Season rating domain, do not silently round a candidate to make admission pass. These production controls are required designs, not implemented tests or live admission PASS claims.

## Remaining items, narrowed after this resolution

| Item | Current design disposition | Still needed before readiness |
|---|---|---|
| PT9 bounds/precision | RESOLVED; use stored 3.4–4.8 | No further owner decision or production correction |
| Structured admission policy | PT9 numeric mapping now verified; unknown required Add facts already hold | Final private binding/source/stage specification for NR/RF, membership/waiver, season community/availability, applicable age and other missing facts; review affected home-only setting |
| Unknown lineup | Proposed LINEUP_REVIEW_REQUIRED, no save, preserve prior lineup, no invented forfeiture | Owner decision on that workflow |
| Copy admission | Proposed whole-copy transaction hold/rollback if required candidate facts cannot pass | Owner decision on atomic copy disposition; no partial hidden memberships |
| Notification | Successful receipt + committed outbox, stable event ID, after-commit delivery; no Remove notice invented | Accept/refine handling of ambiguous delivery after provider dedup window, and preserved lineup SMS/app channels |
| Phase1 | Proposed 13 functions: six reads, four business mutations, three protected lock helpers; no old revokes | Final policy-binding and receipt/outbox columns/ACLs tied to above decisions; lock-order/transaction implementation evidence later |
| Phase2 | Eleven protected tables; template policy dependency repair; narrow retained-table TRUNCATE review | Freeze reviewed ACL/RLS specification and confirm all 82 protected-write consumers pass before revocation |

The numeric PT9 mapping does not require designing a second policy engine. Missing required structured facts stay unknown; Add may not certify them from a document narrative, email, name or arbitrary profile label. Existing exact read/write manifests remain the implementation inventory, with 82 migrated and 30 retained paths. Removal still does not rerun admission eligibility. Real-LMS View-As parity follows Phase2 security acceptance, and mini-LMS deletion remains last.

No further behavior decisions were inferred from approval of normalized PT9 bounds. Continue from [four-blocker resolution](lms-0726-four-blockers-resolution.md); implementation remains unauthorized and production remains accepted 0.1.547. Stop for review with the remaining items above.
