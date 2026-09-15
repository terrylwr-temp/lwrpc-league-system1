# DUPR-ID prevention deployment — September 11, 2026

**DUPR-ID PREVENTION CORRECTION — PRODUCTION ACCEPTED.** Owner confirmed the concurrent team edit was intentional and unrelated to this release. Focused production-safe acceptance passed; this task performed zero production business-data mutations.

## Release identity

- Owner-approved exact commit: `7c0e5c7c1fff3803f6b3c2593175dd5ef11c9037`.
- Production deployment: `dpl_8YTFfmCy1VF4thuJoRMd2X9R49T1`.
- Immutable URL: https://lwrpc-admin-pu7j1yigf-terry-lwrpc.vercel.app
- Live domain: https://league.lwrpickleballclub.com
- Previous accepted deployment / rollback: `dpl_7TPb3ZXyPMpPrgMy35CEpDH4cvSd`, https://lwrpc-admin-ao1oe9i9i-terry-lwrpc.vercel.app, commit `d8b55475a5377b6c6c05ead4e72a63236f681dab`.
- Existing LMS-0733 label retained; no automatic version bump.

Deployed a Git archive of the approved commit, excluding unrelated workspace changes and local test logs. All 1,165 archived files match the deployment source directory byte-for-byte. Vercel reports READY, the production domain is assigned, and both `gitCommitSha` and `reviewedCommit` identify the exact approved SHA. The CLI inherited an old commit-message metadata label from the parent workspace; that label is not the deployed source identity. The archive, exact SHA, and published-code checks establish the release content.

No SQL, migration, uniqueness constraint, RLS/grant modification, or environment change was performed. Existing ratings maintenance flags retain their false-by-default behavior. Application rollback is available through Vercel rollback to the previous immutable deployment; no database rollback is required for this release.

## Production-safe feature verification

Downloaded the actual JavaScript published by the live production domain for `/members`, `/members/[id]`, `/ratings`, and `/member-import`. Executed each published validator module in an isolated test harness using a read-only snapshot of all 1,980 production members. The supplied database adapter implements SELECT pagination only: no insert, update, upsert, delete, Auth, or external request method exists. No production save was submitted, including for allowed cases.

**26/26 checks passed with zero writes.** Each published page's save-handler code was also inspected: its ownership check occurs before its first write.

| Path | Another member's normalized ID | Own unchanged ID | Blank ID |
|---|---|---|---|
| Create Member | Blocked, including ` 1r9lne ` | Not applicable to new member | Allowed |
| Edit Member | Blocked | Allowed | Allowed |
| Ratings inline ID | Blocked | Allowed | Allowed |
| MembershipWorks import | New/fill-blank conflicts blocked | Preserved, allowed | Allowed |

Unused new IDs are allowed. For Edit/inline tests, the authoritative Terry Adelman ID and auxiliary Terry Captain ID were used only as input to the read-only harness; neither record was saved. Case/whitespace normalization is exact, with no fuzzy matching. The shared validation is present in all four production route bundles; hashes and per-case results are in `dupr-prevention-published-code-acceptance.json`.

Live Commissioner browser checks confirmed Members loads, Add New Member exposes its DUPR field/Create action, Terry's Edit Member form shows `1R9LNE` with Save/Cancel, Ratings inline fields load, MembershipWorks Import loads without a file applied, and Teams & Rosters loads normally. Add/Edit forms were closed without changes. Browser checks were visual/read-only; validation behavior was exercised through the published-code harness rather than saving live records.

## Ratings importer and protected data

Ran current CSV **Preview Ratings only**. It still reports 11 ambiguous CSV rows. Barbara Ritter / `QP7W65` appears as **REVIEW — Ambiguous DUPR identity**, with no proposed rating values. Terry Adelman / `1R9LNE` remains READY TO IMPORT with Doubles 4.077 → 4.0, doublesReliability 100 → 100, and over_50 4.311 → 4.3. **No Ratings Import, Clean Ratings, or MembershipWorks import was committed.**

Production before/after hashes match for all members, both Terry Auth records and roles, all Season Ratings, rosters, tournament contacts, MembershipWorks import batches/rows, and all eight remaining duplicate groups. Ratings source/workflow/initialization history hashes also match before/after preview. Terry Captain's ID remains null; `1R9LNE` still has exactly one member match.

The unchanged active duplicate groups are: `309R64` Liam Daly; `67POVE` Jay Solomon; `EGL7GM` Sharon Hunt; `JJVRPW` John Ledford; `MYLYJD` Kristin Markey; `QP7W65` Barbara Ritter; `RW4QDD` Kelly Depalo; `ZN5DGM` Kathleen Vacca. Each has two active records. No cleanup was performed.

The all-teams hash differs because **Dill With It (Windward)**, ID `b6792f17-c1de-4bc2-9e90-b7c352e189ac`, has an update timestamp of **12:29:53 p.m. Eastern** during acceptance, before this task opened Teams. This task performed no team edit or save. The owner confirmed this was an intentional edit. It is recorded as an unrelated concurrent business change, not a release regression; the all-teams hash is not represented as unchanged.

## Checks and remaining limitations

Approved local validation: 66/66 targeted tests, lint with zero errors/six existing warnings, and production build including TypeScript passed. Vercel's production build passed. No code changed after approval.

Application preflight does not provide atomic cross-client uniqueness and does not protect direct database/API writes. A database uniqueness constraint remains deferred until existing duplicate identities are individually reviewed and resolved, under separate authorization. The proposed small manager-only duplicate filter/count remains a proposal; no bulk-management feature was added.

Evidence: `dupr-prevention-production-evidence.json`, `dupr-prevention-published-code-acceptance.json`, and `terry-dupr-correction-and-prevention.md`.
