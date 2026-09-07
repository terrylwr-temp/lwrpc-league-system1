# LMS-0723 / 0.1.545 — fresh identity review and protected proposed manifest

**CURRENT — LMS-0723 / 0.1.545 PRODUCTION ACCEPTED (2026-09-07).** Exact approved 16-candidate repair completed and replayed safely; coordination migration applied once; commit adb4389d9c2a88501a907fe46e6fcbdb46c31002 deployed. All currently testable acceptance gates passed. Owner confirmed concurrent member edits and registration activity as intentional. Real roster/match and logout-revocation limitations remain explicitly recorded. [Final production evidence and limitations](lms-0723-manifest-production-acceptance.md). No new version or View As User work started. Earlier status entries below are historical and superseded by this result.

**READ-ONLY PRODUCTION REVIEW COMPLETE — STOP FOR OWNER REVIEW.** This is a new snapshot, not a reconstruction of the historical 15. No candidate is approved for mutation by this report. LMS-0723 remains deployed, NOT production accepted.

Snapshot: **2026-09-07 18:35:53.858301 UTC** (2:35:53 PM America/New_York). All classification, candidate material state, role-reference inventory and acceptance-rating presence checks came from one read-only SQL statement/MVCC snapshot against project `glikrmmgirilnmamxxyl`. No persistent database object or row was created/updated/deleted. Coordination remains unapplied; session correction `20260907132549` remains present.

## 1. Current classification

| Classification | Current count |
|---|---:|
| Total Auth accounts | **176** |
| Complete and matching | 41 |
| Proposed safe existing-role links | **15** |
| Proposed safe identical-role consolidations | **1** |
| Existing-link discrepancy/conflict | 2 |
| Unusable/unverified matching state | 9 |
| Inactive member | 1 |
| No existing role row — policy decision needed | **107** |
| Other/manual review | 0 |
| Total proposed candidates | **16** |

All categories are exclusive and sum to 176. No duplicate Auth/member IDs occur in the proposed candidate set. No-role and all held categories remain excluded; no roles were provisioned. Existing bound discrepancies are classified as conflicts, even if the relationship is structurally complete. Unverified/unusable states, inactive matches, duplicate matching candidates and unsupported/multiple role shapes are held; only the two shapes supported by the current guarded implementation are proposed.

Historical context only: the prior 172-account snapshot recorded 39 complete/matching, 14 safe links, one split, two conflicts, eight unusable/unverified, one inactive and 107 no-role accounts. The fresh totals differ by +4 Auth, +2 complete, +1 safe link and +1 unusable/unverified. These deltas do not identify which accounts changed, reconstruct the former cohort or establish any anomalous provenance. Current operational counts are 1,951 members, 126 role rows and 74 teams; normal registration may continue.

## 2. Acceptance account

The acceptance account currently classifies **safe_identical_split**. Its internal reference is the unique `acceptance_account: true` candidate within manifest `57fb2ed9-d821-4264-a48a-1cf8105dee36`. The encrypted record contains its exact Auth/member UUIDs and both role UUIDs; the report does not reproduce them. The prior diagnosis's Commissioner row creation marker and the corresponding owner member were corroborated in the current read, then current immutable identity/material state was captured. Neither a display name nor a timestamp will authorize future mutation: the exact manifest IDs and state must match.

Both existing fragments remain Commissioner, the matching member is active, matching Auth/member counts are each one, and no competing durable binding exists. No inbound foreign key to `public.user_roles` was found anywhere in the current catalog. No reference repointing is proposed.

Current authorized-data expectation AFTER a successful future repair:

| Active season | Rating rows for acceptance member | Usable Season DUPR rows |
|---|---:|---:|
| 26/27 Saturday Season | 1 | 0 — field NULL |
| 2026 Fall Season | 0 | 0 — row absent |

Thus the unchanged Live pipeline should first clarify between two active seasons, then return authorized `missing` after either selection. This is an expectation from current read-only data and the already-tested code, not a production repair/retest result. No numeric rating was fetched into the artifact. NULL must not become NR or a substituted rating. Without repair, the fragmented durable relationship still cannot satisfy the Live member join.

## 3. Protected storage and approval binding

Manifest identifier: **57fb2ed9-d821-4264-a48a-1cf8105dee36**. Format version: **1**. Status: **PROPOSED_NOT_APPROVED_FOR_MUTATION**.

Restricted operational folder, outside the repository and web application:

`C:\Users\t_ade\.codex\private-artifacts\lms0723`

Encrypted manifest:

`57fb2ed9-d821-4264-a48a-1cf8105dee36.manifest.dpapi`

Companion metadata:

`57fb2ed9-d821-4264-a48a-1cf8105dee36.reference.json`

Approval checksum — SHA-256 of the exact UTF-8 plaintext manifest bytes:

`f28b31208beca918bff2095b549a4c70bf18bc221b48d5fa8773bcd24fc2b076`

Encrypted-file SHA-256:

`84998d76a33ad68c4cd1f12f1b77ddf932fe27aaff26e1f9e55f36f50d4d1d16`

Protection: Windows DPAPI CurrentUser, plus folder ACL with inheritance disabled and access limited to the current Windows user and SYSTEM. No plaintext manifest file was written. The encrypted file was read back, decrypted and byte-compared with the original server JSON, and both hashes verified. A separate candidate validation confirmed 16 unique Auth/member pairs, all reviewed invariants and the correct one-row/two-row repair shapes. The ordinary restricted sandbox could not read the file; the authorized Windows-user context performed the verification successfully.

DPAPI depends on the Windows profile/key material. Do not assume copying the ciphertext to another machine makes it decryptable. Preserve the protected profile/operational backup according to the owner's backup policy; any transfer/recovery requires a separately secured process. Lost decryption capability means stop and re-review, not rebuild from counts. The reference metadata contains only manifest ID, counts, timestamp, paths and checksums.

## 4. Exact expected-state contents

Each candidate contains:

- Immutable Auth and member IDs, supported repair shape, classification, review timestamp and acceptance marker when applicable.
- Auth expected state: immutable ID, normalized current-email fingerprint, confirmation timestamp, pending-email fingerprint/null, deleted/banned timestamps, anonymous and SSO flags.
- Member expected state: immutable ID, normalized-email fingerprint, active flag.
- Every related role row: exact ID, user_id, member_id, role, creation/update epoch markers in the same structure used by `identity_repair_private.state`.
- Exact original role-row backup values, including ISO timestamps, so all original role UUIDs and nullable links can be restored.
- Reviewed invariants: one normalized Auth candidate, one normalized member candidate, zero competing durable links, one member-bound role row.
- Expected inbound role-reference inventory (empty in this snapshot).

Global manifest identity/version/checksum bind every entry, the approved candidate set and the reconciliation method. No row index or display name is used as maintenance authority. The server's raw JSON was preserved rather than parsed and reserialized through JavaScript numbers: this avoids rounding PostgreSQL microsecond epoch markers and falsely changing the expected-state guard. Future loading must likewise preserve exact numeric tokens when sending JSONB to PostgreSQL.

Normalized email evidence is `E:` plus SHA-256(lower(trim(email))), matching the implemented state function. It is only a reconciliation signal. A deterministic email hash is not anonymization and may be guessable; therefore it remains encrypted/private. No raw emails, names, passwords, tokens, sessions, MFA, contact information or rating values are in the candidate records. No held-account identity list was exported. The manifest is not in the AI corpus, Stage 7, feedback, player UI or ordinary application logs.

## 5. Scope limit requiring review before future execution

The fresh review correctly includes **15 links + 1 split = 16** proposed candidates. The unchanged validated migration currently accepts at most **14 links + 1 split = 15**. Its SHA-256 remains:

`f3a35aa9b8e099f1cb985b6fb1422853aea2e5b3506c2bb650c4161becc8b13f`

This is an explicit scope guard, not a reason to discard a candidate silently, split the manifest into bypass batches, or repair 16 under the prior approval. No implementation change was made. Owner review must either select an exact subset within the existing cap (with a new subset manifest/checksum) or separately authorize the minimal cap adjustment and its validation for this exact 16-candidate manifest. Approval of a count alone is insufficient. Existing concurrency evidence remains valid for the shared protocol; no new writer/state pattern was discovered, and the suite was not unnecessarily rerun.

## 6. Future manifest-bound execution and stale behavior

After explicit approval of the manifest ID/checksum and scope-limit resolution:

1. Read the restricted file, verify encrypted-file hash, decrypt with the approved profile, and verify the exact plaintext SHA-256. Confirm project, release, manifest version, candidate set and expected state. Any mismatch stops the operation.
2. Complete the production preflight under current legitimate registration state. Apply only the separately approved coordination migration once; verify deployed definitions, ownership, trigger scope, grants/RLS and Auth sanity. Earlier Live/session migrations must not be reapplied.
3. Under the shared coordination boundary, load CURRENT material state and compare it to this immutable review. Repeat unique Auth/member candidate, competing-link, role-shape and reference checks. Never replace this manifest's expected state with a newly read one under old approval.
4. Seal the exact approved entries using `run_id = manifest_id`, the authorized Commissioner actor and original expected JSONB. Current `seal_manifest` fails the transaction on a stale entry; if a subset is needed, obtain explicitly approved revised set/checksum rather than silently editing the manifest.
5. Verify exact protected pre-mutation role backup and audit baseline. Repair only the acceptance account first; then verify Commissioner preservation, canonical relationship, audit and rollback evidence.
6. First Live retest: `What is my Season DUPR?`, then the valid season choice. Require authorized missing-data, LIVE LMS DATA provenance, zero model/embedding calls and sanitized telemetry. Denial or fabricated/substituted rating stops continuation.
7. Only after that gate passes, process the remaining approved candidates individually under the same guards. A later material change is STALE/REQUIRES RE-REVIEW; skip it without reverting unrelated successful repairs. BUSY can retry with the unchanged approved record; it cannot fall back to an unlocked write.
8. Verify no-op replay, expected audit, no role broadening and unchanged unrelated operational/corpus/Stage 7 state. Resume the previously approved security, telemetry, feedback and LMS-0722 regression gates.

Normal team changes, unrelated member profile edits and sign-in activity do not automatically invalidate the manifest. Material role/identity/eligibility changes do. The manifest is a maintenance authorization artifact only; runtime remains getUser(token) → current durable LMS identity → current relationship authorization. It must never supply a fallback runtime identity.

## 7. Row-level backup and audit binding

The protected read-only export contains **17 original role rows**: one for each proposed link and both Commissioner fragments for the consolidation. This is review-time rollback evidence, not permission to restore later unrelated changes. Immediately before future mutation, verify the role rows still equal this review and retain an exact protected pre-change backup. Verify the no-inbound-reference condition again. New references require review; the existing repair already returns REFERENCE_REVIEW rather than guessing a repoint.

At this snapshot the private audit/schema does not exist; its pre-migration baseline is absence. After approved migration, verify the actual pre-repair event baseline rather than assuming an empty audit if legitimate prospective linking has occurred. Each committed repair atomically writes the exact before/after role rows and run/actor/operator provenance. Audit failure rolls back the identity mutation.

The existing audit's `run_id` is the manifest UUID, providing the equivalent reconciliation-batch reference requested. The owner-approved report plus protected reference file bind that UUID to the exact checksum; production sealing/execution must verify the checksum before using it. Do not claim the current SQL independently verifies a plaintext file hash—it accepts the pinned JSONB and run ID from the authorized maintenance caller. No audit schema change is required for this documented equivalent reference, and none was made.

Rollback uses the guarded per-identity function and exact after-state/reference checks, restores original row IDs/links/roles/timestamps and appends a rollback event. It never restores whole member/Auth/team/rating tables. Intervening material changes require a reviewed compensating action.

## 8. Verification and current status

- Read-only single-statement review: 176 classified once; counts reconcile; 16 distinct proposed identity pairs.
- Protected write/decrypt/byte/hash round trip passed; persisted candidate shapes/invariants verified without identity output.
- Existing coordination SQL hash unchanged; session applied / coordination unapplied state confirmed within the review snapshot.
- No production mutations, repair, role provisioning, migration, deployment, model/embedding call or Live behavior change.
- No application/version changes. Added only an operational manifest-protection script and documentation; full app build/concurrency suite was not rerun for this read-only review/export.
- Existing live roster/match limitations remain; do not manufacture production relationships. No View As User or other next feature started.

Changed local review artifacts: this report; current-status entries in project-roadmap.md and lms-0723-implementation-report.md; `lwrpc-admin/scripts/lms0723-protect-review-manifest.ps1`. The script encrypts and verifies a supplied review artifact and refuses overwriting an existing manifest; it performs no database work. The candidate data itself is stored only in the restricted operational folder described above.

**Next action is owner review of this exact proposed manifest and an explicit decision on the 16-versus-15 scope limit. LMS-0723 / 0.1.545 remains NOT production accepted.**
