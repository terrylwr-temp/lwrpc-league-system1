**RESCOPE NOTICE:** The current acceptance scope is [View-As real-page parity](lms-0726-rescoped-parity-plan.md). Broad normal read/write cutover, policy bindings, Phase 2, admission and notification redesign gates below are deferred hardening requirements, not prerequisites for scoped LMS-0726. Accepted LMS-0724 isolation/security and real-page mobile/accessibility/button gates remain mandatory. No existing test result is reclassified as parity acceptance.

# LMS-0726 role and acceptance matrix

**Foundation continuation:** [Security-foundation implementation plan](lms-0726-security-foundation-plan.md) is the current continuation. Owner selected HOLD FOR LEAGUE REVIEW for unknown required Add Player facts: no provisional roster row. Six shared read functions remain; one separate atomic normal-write function and internal audit table are proposed for review. No implementation or production mutation.

**Final security gate:** [permanent direct Data API and eligibility controls](lms-0726-final-design-gate.md). Current email/RF/unrelated-rating/private-team controls FAIL in production-matched synthetic SELECT tests. Do not mark parity/security accepted until underlying bypasses and independent admission validation are addressed; existing M01–M15 retained.

**Owner-directed review controls:** [RD01–RD22 and route matrix](lms-0726-review-decisions.md) are required, not executed passes. Global Teams manager-only; assigned-team roster access; cross-community legitimate candidates; candidate contact/RF absence; setup roster-only; forged resource/direct-URL/actor-bleed and normal Data API limitations. Existing M01–M15 remain.

Read-boundary continuation: [exact proposal and attacks](lms-0726-read-boundary-design.md), [field manifest](lms-0726-read-fields.md). Additional required gates (not executed): RB01 reject forged identity/role/resource/context; RB02 deny direct browser RPC and origin replay; RB03 test expired/ended/wrong-actor context; RB04 prove zero Commissioner privilege bleed; RB05 enforce self-only RF/eligibility; RB06 test role/relationship/location revocation races; RB07 compare both modes' field DTOs and pagination; RB08 apply/replay/rollback/ACL checks; RB09 preserve no-Auth member reads with narrow Auth limitations; RB10 measure query/byte/latency budgets. Review G1–G3 normal-route visibility conflicts before implementation. Existing M01–M15 remain mandatory.

DESIGN ONLY: no checks below have been executed for LMS-0726. Gate = observed role entry threshold; it is not permission to every row/action. S = scoped route admission subject to relationship/RLS; N = not in normal navigation/threshold denied; P = public content; C = capability/receipt/event-code dependent; X = auth workflow unavailable in View-As; R = redirect to indicated normal route. Co-Captain is a team assignment, not a separate ROLE_LEVELS value; captain-level cells require the normal captain role plus applicable co-captain assignment.

In every View-As column interpretation, use the EFFECTIVE role and server-authorized scope; preserve the real actor only for initiation/audit. No normal route is admitted solely because the real actor is a manager.

| Route | Player | Captain | Co-Captain | Club Pro | League Manager | Commissioner | Basis / View-As requirement |
|---|---|---|---|---|---|---|
| /ai-assistant/console | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /ai-assistant | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /ai-assistant/review | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /ai-insights | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /approved-answer/[citation] | C | C | C | C | C | C | Bound source receipt; shared viewer uses isolated source transport and validated target context. |
| /ask-lwr | S | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /captain-dashboard | N | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /design-preview/admin | R | R | R | R | R | R | Existing redirect to player/captain/admin destination; enforce destination guard. |
| /design-preview/captain | R | R | R | R | R | R | Existing redirect to player/captain/admin destination; enforce destination guard. |
| /design-preview | R | R | R | R | R | R | Existing redirect to player/captain/admin destination; enforce destination guard. |
| /divisions/[id] | N | N | N | N | S | S | Normal division navigation is manager-level; this legacy page has no literal role guard. Resolve direct-access gap before enabling; do not inherit broad client reads. |
| /divisions | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /email-options | N | N | N | N | N | S | Observed literal page guard; data/action scope remains additional. |
| /help/[role] | P | P | P | P | P | P | Role-specific static guide config; preserve normal links, no invented role grants. |
| /league-communications | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /leagues | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /live-match/[id] | C | C | C | C | C | C | No literal role guard; effective match visibility must be proven in isolated fixtures before admission. |
| /locations | N | N | N | N | N | S | Observed literal page guard; data/action scope remains additional. |
| /login | X | X | X | X | X | X | Normal authentication workflow; no target Auth simulation, no reset/change in View-As. |
| /matches/[id] | N | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /matches | N | N | N | N | S | S | Redirects /scoring; captain match links use /matches/[id]. |
| /member-import | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /members/[id] | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /members | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /official-document/[citation] | C | C | C | C | C | C | Bound source receipt; shared viewer uses isolated source transport and validated target context. |
| / | N | N | N | N | S | S | AdminDashboardClient guard; default target dashboard dispatch uses permissions.js. |
| /player-dashboard | S | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /print | C | C | C | C | C | C | Origin-local print payload; rebuild from authorized displayed data, never import Tab A storage. |
| /ratings | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /reset-password | X | X | X | X | X | X | Normal authentication workflow; no target Auth simulation, no reset/change in View-As. |
| /round-robin/[id]/admin | C | C | C | C | C | C | Event/admin capability, not LMS role alone. No copied event secret; public read projection or narrow unavailable state. |
| /round-robin/[id] | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /round-robin/[id]/player | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /round-robin | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /schedule-editor | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /scheduling | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /score-entry/[id] | N | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /score-sheets | N | N | N | N | N | S | Observed literal page guard; data/action scope remains additional. |
| /scoring | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /seasons | N | N | N | N | S | S | Observed literal page guard; data/action scope remains additional. |
| /standings | S | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /system-setup | N | N | N | N | N | S | Observed literal page guard; data/action scope remains additional. |
| /teams/[id] | N | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /teams | N | S | S | S | S | S | Observed literal page guard; data/action scope remains additional. |
| /tournaments/[id]/admin | C | C | C | C | C | C | Event/admin capability, not LMS role alone. No copied event secret; public read projection or narrow unavailable state. |
| /tournaments/[id]/display | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /tournaments/[id] | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /tournaments/[id]/player | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /tournaments/[id]/standings | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /tournaments | P/C | P/C | P/C | P/C | P/C | P/C | Public event data with optional event/player capability. Preserve public display, deny event-code mutations. |
| /view-as | N | N | N | N | N | N | Normal-origin denied; obsolete presentation route to remove after shared route replacement. |

## Required paired fixtures

Compare normal authenticated target and View-As same target using synthetic local Auth/member fixtures; never create production target sessions. Test all effective role sets including Player, Captain, both Co-Captain slots, Club Pro with home_location_id coverage, League Manager, Commissioner and multi-role. Each S/C cell must resolve to a proved allowed or denied fixture before release. For legacy direct-route ambiguity, record the normal observed baseline and seek design resolution rather than copying a leak or widening permissions.

| IDs | Required acceptance |
|---|---|
| P01-P06 | Same real components, shell, navigation and data for each role; include empty/populated states and dual-role memberships. |
| C01-C05 | Actual Captain Dashboard teams, roster, notices, matches and setup status; Match Setup modal populated/draft/published/opposing-team visibility; Manage Roster modal with exact authorized data. |
| S01-S12 | Omit-context, forged/replayed context, normal-origin replay, cross-target query, nested initiation, direct API/Server Action write, event-code write, expired/revoked actor, target invalidation, cleanup, context/Auth isolation. |
| A01-A06 | Exact Ask LWR component, compact help and examples, chips, source badges, effective SELF RF/NR/missing inputs, disabled feedback/diagnostic telemetry; deterministic fixtures, no model benchmark. |
| H01-H07 | Refresh, back/forward, direct link, internal copy, new tab without context, context expiration, Exit/credential purge and Tab A unchanged. |
| V01-V04 | Desktop, 390px, 320px, keyboard/screen-reader/focus and sticky banner overlap. |
| D01-D04 | No remaining mini navigation/cards/Ask wrapper/snapshot presentation; no dynamic references; security tests retained; routes and bundles contain one presentation implementation. |

## Member Detail action-row requirement (mandatory)

| ID | Acceptance |
|---|---|
| M01 | View As User is in the existing Member Detail action row with Members/Edit Member/Edit Ratings/Show Player History as applicable, not under the member name. |
| M02 | Reuse the same local action-button component/style contract: height, padding, typography, border/radius, hover/focus and wrapping; no separate card/oversized panel. |
| M03 | Real Commissioner + valid target: present. |
| M04 | Real League Manager + valid target: present. |
| M05 | Real Player/Captain/Co-Captain/Club Pro: absent, not disabled; no wrapper/placeholder/gap. |
| M06 | View-As mode, including manager effective target: entry absent; nested request independently denied. |
| M07 | Inactive, roleless, ambiguous/cross-linked or otherwise rejected target: no enabled entry; preferred hidden; no context created. |
| M08 | Valid member with no Auth account: available only when accepted target preflight allows it; no account/session creation. |
| M09 | Pending/error capability check: fail closed without an advertised disabled button or reserved gap; cancel stale requests when target changes. |
| M10 | Revalidate current actor and selected target before confirmation; POST independently revalidates after confirmation, including role loss/target invalidation races. |
| M11 | Confirmation names server-validated selected target, explains separate READ-ONLY tab and unchanged administrator tab; cancel creates no context. |
| M12 | Only confirmed action starts protected one-time handoff to dedicated origin; no credentials in URL/referrer, same accepted flow. |
| M13 | Desktop/390px/320px, with and without button: consistent wrapping and no overflow/empty cell; include read/edit modes and long labels. |
| M14 | Semantic button, accessible name, keyboard activation, visible focus; confirmation initial focus, Escape/cancel/confirm and focus return; handle trigger invalidation by returning focus to row heading/nearest action. |
| M15 | Direct crafted initiation tests deny unauthorized real roles, invalid target, nested/omit-context/replay; button hiding is not the security mechanism. |

All entries are planned gates, not pass claims. No implementation, deletion, SQL or deployment in this diagnosis.

## Final atomic-write / cutover gates (planned, not tested)

The [final gate report](lms-0726-atomic-add-player-gate.md) governs these additions and supersedes earlier generic-write/early-parity sequencing.

| ID | Required evidence |
|---|---|
| AW01 | Single-purpose Add contract; no supplied authority/rating/RF/NR; verified normal actor; authorization before candidate evaluation. |
| AW02 | Known pass adds; known fail refuses; unknown REVIEW_REQUIRED with no membership/pending row or added notification; safe reasons. |
| AW03 | RF <29, RF=29, numeric rating with NR, unknown classification, applicable adjustment/season history; no raw RF output. |
| AW04 | Actual cross-community conjunction and legitimate discovery; unresolved material season community/availability holds; no invented capacity. |
| AW05 | Pair sum N/A at roster; actual lineup validates pair/NR; championship participation at match stage; source/stage mappings reviewed. |
| AW06 | Concurrent duplicate adds/retries: at most one membership and committed side-effect event; no duplicate external send under reviewed delivery protocol. |
| AW07 | Concurrent authority/assignment/season/division/member/rating/community changes across all material writers; whole-transaction retry, no stale validation. |
| AW08 | Normal-only EXECUTE and RLS/column grants; browser/View-As writes denied even for real Commissioner; no service-write fallback. |
| AW09 | Remove scoped to team/membership; lock exception and lineup/history impact validated; no member deletion; safe retries. |
| AW10 | 112 writes reconciled: 82 B/30 C; protected helper/dynamic/server/read consumers moved; C concurrency review and reclassification if needed. |
| AW11 | Normal Player, Captain Dashboard, Team Detail, Manage Roster, Add/Remove, cross-community, Match Setup, Club Pro and Manager PASS before tightening. |
| AW12 | After tightening: direct/embedded/alternate unrelated email/RF/ratings/private team and candidate email/RF DENY; intended public/shared data PASS. |
| AW13 | Before/after Phase 2 rollback rehearsed with compatible build; no old app alone after revocation or permanent dual paths. |
| AW14 | Real-LMS View-As parity only after Phase 2 security acceptance; M01–M15 retained; mini deletion after foundation/parity/read-only acceptance. |

No AW gate is marked PASS by documentation or previous SELECT-only proof.

## Four-blocker security matrix

[Resolution report section 9](lms-0726-four-blockers-resolution.md) adds F01–F28: Add/Remove concurrent replay, authority/config races, policy conflicts, no admission check on Remove, lineup unknown and pair bounds, protected lock privileges, after-commit notification/dedup/failure, retained manager-only policies and public-data positive controls. All are planned, not test PASS claims. Review current PT9 configuration against Rules before certifying eligibility. Required unknown lineup workflow remains an explicit owner decision.

## PT9 owner correction control

PT9-01–04 in [owner resolution](lms-0726-pt9-owner-resolution.md): live MPT9/WPT9 normalized 3.4–4.8 matches current Rules 3.4–4.899 under explicit owner approval; no precision change. Configuration comparison PASS; application conflict-guard enforcement remains planned. Reject future material bounds mismatch and stale policy version; never infer a candidate's rating normalization to force PASS. Supersedes any earlier gate requiring correction of the now-resolved PT9 bounds.

## Final removal / reuse / migration gates

RC01: authorized Captain and Co-Captain managed-team removal permitted only under current roster restrictions; manager exception preserved; Player/Club Pro-only/View-As denied. RC02: enforced locks serialize role loss, roster lock and membership/dependency changes. RC03: every authorized remover receives identical downstream behavior. RC04: completed history unchanged. RC05: future/unplayed lineup handling follows explicit owner resolution, never assumes prior saved eligibility remains valid. RC06: after Phase2 Captain/Co-Captain direct DELETE denies while bounded authorized Remove passes. RC07: copied/manual assignments and reopened setup revalidate current facts; no uncommitted-copy notification. RC08: operation receipt/outbox replay, provider failure/ambiguity and duplicate Remove never duplicate a committed-success event. RC09: Phase1 clean/replay/second replay/partial recovery/wrong-owner or ACL drift tested in isolated PostgreSQL. RC10: all82 writes and292 reads reconciled before Phase2; no destructive production probes. These are planned acceptance controls, not executed PASS claims.

## Final owner future-lineup decision (supersedes RC05 alternatives)

RL01: any authorized Captain/Co-Captain/LM/Commissioner attempting removal of a player referenced by a future/unplayed saved setup/lineup receives REMOVAL_NOT_ALLOWED/FUTURE_LINEUP_DEPENDENCY; membership and assignments unchanged, no successful-removal event. RL02: after separately committed authorized lineup correction, retry removes exact membership under fresh locks. RL03: concurrent lineup save/removal serializes; neither path can commit a non-rostered future participant as valid. RL04: historical completed participation/results never rewritten. RL05: no new Remove notification; existing Match Setup correction notice sends only after that operation commits and deduplicates independently. RL06: all role-specific mutation outcomes share identical downstream behavior; management cannot bypass the future-lineup dependency rule. RL07: direct DELETE denied after Phase2 for Captain/Co-Captain/Club Pro/Player/View-As; legitimate bounded removal positive control. Planned tests, not executed PASS claims.
