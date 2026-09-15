# Terry DUPR correction and local assignment prevention — 2026-09-11

## Production result

The sole production mutation cleared `members.dupr_id` for Terry Captain, member `a6cc5885-f6da-41f2-8bdc-88596b176d96`, from `1R9LNE` to NULL. The guarded update affected exactly one row. Terry Adelman, member `43e1e363-82f1-47d7-a869-befed4c967b8`, retains `1R9LNE`. An independent query confirmed exactly one normalized match across all LMS members.

Before/after hashes matched for both members excluding DUPR ID, their Auth records, roles, teams, rosters, ratings, tournament contacts, and the other duplicate-member groups. The same hashes matched after CSV preview. No account was merged, deleted, or deactivated; no email, role, Auth, membership status, or history was changed. Evidence: `terry-dupr-correction-evidence.json`.

## Production CSV preview

Used the Commissioner's signed-in session and current file `members-list-lakewoodranchpickleballclub-091026223019.csv` (SHA-256 `a4857c7a1d9ee43261ec29a7e226d478bec4f4b2b47253cc4e3a77a2c247a704`). In 2026 Fall Season, preview page 2 shows **Terry Adelman / 1R9LNE — READY TO IMPORT**, reason **Fill blank imported rating inputs**, with:

| Input | CSV source | Proposed working value |
|---|---|---|
| Doubles | doubles = 4.077 | 4.0 |
| Reliability | doublesReliability = 100 | 100 |
| Age-Based | over_65 absent; over_50 = 4.311 | 4.3 |

Terry is no longer AMBIGUOUS. Preview totals: matched 707, ready 668, skipped 214, ambiguous 11, invalid 0, existing inputs unchanged 667. Preview ambiguity counts describe CSV rows, not the database duplicate-group count. **Import Ratings was not committed. Clean Ratings was not run.**

## Remaining inventory — unchanged

| DUPR ID | Active member names | Records |
|---|---|---:|
| 309R64 | Liam Daly | 2 |
| 67POVE | Jay Solomon | 2 |
| EGL7GM | Sharon Hunt | 2 |
| JJVRPW | John Ledford | 2 |
| MYLYJD | Kristin Markey | 2 |
| QP7W65 | Barbara Ritter | 2 |
| RW4QDD | Kelly Depalo | 2 |
| ZN5DGM | Kathleen Vacca | 2 |

Eight groups / 16 active records remain. None was corrected automatically.

## Root cause and local implementation

Create Member, Edit Member, inline Season Ratings DUPR-ID editing, and MembershipWorks import previously wrote `members.dupr_id` without checking whether another member owned it. There is no database uniqueness enforcement for normalized nonblank DUPR IDs. This permits duplicates; it does not establish which historical UI operation originally copied Terry's ID. The accepted identity review distinguishes Terry's authoritative MembershipWorks/Commissioner account from the auxiliary manually created account.

Implemented a shared `app/lib/memberDuprAssignment.js` preflight in isolated branch `codex/member-dupr-assignment-validation`, based on production commit `d8b55475a5377b6c6c05ead4e72a63236f681dab`. Local worktree: `C:/lwrpc-league-system/.local-validation/member-dupr-assignment-validation`.

- Compares exact IDs after trim and uppercase normalization; no fuzzy matching.
- Includes active and inactive owners, paginating through all members rather than relying on the currently loaded page. Production SELECT policy permits the existing authenticated client to see these records; no permissions were expanded.
- Blocks new/changed conflicting IDs with “This DUPR ID is already assigned to another member,” and the conflicting member's name.
- Allows blank/null IDs and unchanged own IDs, including existing duplicate holders saving unrelated edits.
- Fails closed if ownership lookup fails or the edited member cannot be verified.
- Checks all MembershipWorks planned new/fill-blank assignments together before any audit or member write, detecting duplicates within the upload. Existing assigned IDs remain protected. An additional update predicate prevents overwriting an ID changed since preview.
- Restores rejected inline values and handles failed writes; existing role checks remain intact.
- Does not change the ratings parser, source matching, ambiguity rules, or ratings writes.

Affected normal paths: `/members` Create Member; `/members/[id]` Edit Member (including links from other administration pages); `/ratings` desktop/mobile inline DUPR ID; `/member-import` new members and fill-blank DUPR IDs. Other member writers update unrelated fields. Round-robin player IDs are stored in separate event records, not assigned to `members`; historical event data is untouched.

## Verification and SQL requirement

Final results: **66/66 targeted tests passed; npm run lint passed with 0 errors and the same 6 pre-existing warnings; npm run build passed including TypeScript; git diff --check passed.** Build used the production public URL and a non-secret placeholder anon key, without importing production credentials. No production test members were created.

Targeted tests cover unused new IDs, conflicting new IDs, own unchanged IDs, edits to another member's ID, case/whitespace equivalence, multiple blanks/clearing, inactive ownership, legacy unchanged duplicates, no fuzzy matching, batch conflicts, missing member identity, pagination beyond 1,000 records with a lower server cap, failed reads, import assignment selection, and unchanged ratings-import ambiguity/no-update behavior. Existing CSV mapping, MembershipWorks location, and ratings workflow database safety tests are included.

No SQL migration or uniqueness constraint is included. The application preflight prevents normal sequential conflicting saves, but **is not an atomic guarantee against simultaneous saves from different clients or direct database/API writes**. After the owner reviews and resolves all existing duplicates (including inactive records), separately propose a database unique index over the agreed normalized nonblank ID, with matching whitespace semantics and a tested recovery plan. Do not apply that constraint now.

## Remaining duplicate review and small report proposal

Review each pair's MembershipWorks account, Auth link and login, email, status, roles, roster/team references, Season Ratings, and tournament history. Identify the authoritative account before choosing a one-field correction. Retain auxiliary identities where they carry valid account/history references. Merge or deactivate only under separate authorization after examining the specific effects on history.

Members already supports searching a known DUPR ID; it does not provide an aggregate duplicate inventory. A small manager-only “Duplicate DUPR IDs” filter and group count, with links to the existing member detail pages, would make review easier. Proposed only; no duplicate-management UI or bulk cleanup was built.

Prevention changes are local only. No application deployment was performed under this request.
