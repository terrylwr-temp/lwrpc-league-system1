# MEMBER ROLE SEMANTICS — DEFAULT “PLAYER” DISPLAY VS ACTUAL ROLE ASSIGNMENT

## OWNER RESOLVED — PLAYER IS IMPLICIT BASELINE ROLE

Local correction now implemented as **LMS-0728 / 0.1.550 — STOP FOR REVIEW**. [Implementation/validation report](lms-0728-local-review.md). Production stays accepted LMS-0727; no production SQL/deployment, role backfill or account changes. The design-only status below is historical. Normal Ask LWR Live identity is explicitly a separate post-release MUST-FIX, not resolved by these two View-As functions.

September 9, 2026: Owner confirms an otherwise valid active/eligible member with no explicit higher/special role has effective Player permissions, independently of team membership. Members' default Player label is intentional and stays unchanged. No role backfill, Marilyn account change, target Auth creation or synthetic role assignment is authorized. Explicit higher and combined roles retain existing semantics; inactive/invalid membership must not become valid merely through the fallback.

Remaining work: align View-As/effective-role resolution with intended semantics in the next small bounded release. [Diagnosis/design and 12 requested deliverables](implicit-player-diagnosis-design.md). Application-only is insufficient: private target-role resolution and View-As Live lookup both require SQL function corrections. STOP at design review; no implementation or mutation. Normal Live identity linkage has a related inconsistency recorded for separate bounded review. LMS-0727 stays production accepted and unchanged; broad security hardening remains separate.

The original record below is historical and superseded wherever it requires durable Player assignment or leaves the Player policy undecided.

Post-LMS-0726 follow-up. Owner accepted the Marilyn finding as a separate existing data/UI semantics issue; it is not an LMS-0726 acceptance blocker. Do not decide or implement this policy during current acceptance.

Preserve durable role assignment as the View-As authorization source. Members' default Player label grants no authority. Do not modify Marilyn's account, assign roles for testing, or loosen target validation. Mark Abbott has an actual Player assignment and is a valid acceptance target; shared Player Dashboard verification passed.

Future diagnosis/review must determine:
- How many active members have no assigned LMS role.
- Whether normal Player login/navigation requires an explicit Player role.
- Whether imported members should automatically receive Player.
- Whether provisioning occurs only after Auth/account creation.
- Whether Captain/other roles implicitly include Player semantics.
- Whether the selected policy requires a separately approved data backfill.
- Whether future imports/account creation should automatically provision Player.

Review, without presupposing either outcome:
A. Every normal member should receive a durable Player assignment automatically.
B. No-role members remain valid, but the UI must not imply Player was assigned.

Any data/account/backfill change requires separate reviewed scope and authorization. No counts, account creation, SQL mutation or provisioning changes were performed for this follow-up.
