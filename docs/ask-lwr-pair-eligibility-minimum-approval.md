# Pair eligibility: minimum approval scope

September 12, 2026. **STOP FOR REVIEW.** Production remains d399272a4e3cfcd1026c04c67db77856543260ec / dpl_B5vYMadFVmMA1GLG9DLxyvgKLK3p. Fresh local execution of that application's classifiers returns eligibility=null and live=null for both exact questions, “Can Terry play with Tim” and “Can Tim play with Terry”. Production function metadata confirms no ELIGIBILITY_PAIR capability, SELF-only eligibility inputs, and denial of ordinary-player other-member lookup. This is a missing capability, not a different answer caused by name order. The previous pair work was diagnosis only; neither subsequent UI fix implemented pair eligibility.

## Recommended approval boundary

Authorize a read-only pair eligibility capability for subjects the actor may already resolve through Live LMS. Preserve existing roles and member populations: Commissioner/League Manager active-member access; captain/club-pro access only through existing authorized team relationships. Ordinary player access to another member remains denied. This initial scope fixes the Commissioner's reported case without opening a member directory to ordinary players. If ordinary players must ask about proposed partners, a separate explicit partner-access policy is required; this approval does not imply it.

## Minimum database changes

1. Add one private ELIGIBILITY_PAIR operation behind the existing service-role-only public.ai_live_lookup wrapper. Extend ai_live_private.lookup through a narrow helper/branch, with no browser-callable grant, general member SELECT grant, RLS relaxation or change to accepted SELF/PLAYER_RATING operations.
2. Reuse authenticated/effective identity and existing subject population checks for each member. Resolution returns at most five authorized name choices for one unresolved slot; do not fetch eligibility inputs until both subjects and context are verified. Recheck membership/role relationships on every continuation and before the final read.
3. Final input: exactly two distinct server-verified subject IDs, one exact active division/season, and optional authorized team context. All IDs originate from validated SELF, signed choices or authorized server context resolution. Reject unknown fields, duplicate subjects, invalid seasons and unauthorized targets.
4. Final minimal server-only result: each member's display identity, applicable regular/PrimeTime Season DUPR, RF and independent source-NR marker needed by the existing classifier, plus bounded division-placement facts needed to determine the highest applicable NR adjustment. Raw source DUPR must not substitute for Season DUPR and need not be returned as a numeric field. Read both players and relevant placement facts consistently. RF/source classification inputs stay server-side; the user receives the applicable rating/NR calculation and reason, not standalone RF values or unrelated details.
5. For additional current Rules restrictions, return only narrowly derived pass/fail/unknown indicators where an authoritative existing field supports them; do not expose DOB, contact data or notes. If a required condition is unavailable, report what remains unverified instead of inventing an unconditional Yes. A full eligibility claim must include those conditions; numerical pair compliance alone must be labeled accordingly.
6. Extend the existing access-audit intent allowlist and wrapper denial-audit handling to ELIGIBILITY_PAIR; retain rate limits and sanitized audit behavior. These are security/operational records, not business-data changes. No member, rating, roster, team, rule or schedule writes. No backfill.

This is a proposed migration scope, not executed SQL. The deployment must check actual function/grant drift and preserve prior definitions. View-As must either receive equivalent separately reviewed effective-identity handling or explicitly deny this new capability; never fall through to Commissioner privileges.

## Minimum application changes

Add a pair intent before document fallback and before single-player/general eligibility classification. Parse generic two-person wording and SELF into two slots; no name constants. Keep a stable unordered pair key for evaluation so reversing the names produces the same facts, calculation and outcome, while clarification wording may follow the user's order.

Add a small deterministic continuation coordinator: resolve player A, resolve player B, resolve missing exact league/division/season, then evaluate. Reuse encrypted session/purpose-bound receipts; preserve completed selections. Narrow actual catalog choices progressively instead of dumping members/divisions. Keep validated page context; authorize any team ID inferred from a page path. Missing or conflicting context causes clarification, never PDF insufficient-evidence fallback.

Reuse exact-decimal individual/combined-limit checks and official source citations. For NR, a blank numerical Season DUPR is permitted. Derive the proposed division adjustment under Rule 4.5.1 and apply Rule 4.5.2's highest adjusted value across relevant placements. Do not store an adjustment or alter roster state. Missing RF/status/placement evidence remains unknown; do not guess. Distinguish two-player lineup eligibility from simply sharing a roster.

Review and update the current policy binding only after validating active Rules version 478a87bb-1b05-4da9-ac09-7ddecec64f69 against applicable current division configuration. Existing code is bound to 6ae10e5f-fdde-41be-a941-d1b7ed360d1a and intentionally refuses unreviewed versions. No corpus edits or Approved Answer are needed.

## Acceptance and rollback

Use synthetic database/application fixtures for all branches: both exact name orders and generic variants; ambiguity for either/both players; SELF; missing/retained context; same member twice; rated boundaries and pair limit; NR with blank value and multi-division adjustments; current-source conflict; role/relationship removal, tampered/expired receipts, and privacy projections. Verify reversal produces identical substantive outcomes. Retain SELF rating, Important Dates, single-player eligibility and Rule 3.5 controls.

After approved implementation, static/build checks and normal LMS regression, production-test both exact questions with the signed-in authorized account. Ambiguous names should produce actual bounded choices, not an invented member pair. Proceed to a Yes/No only with sufficient authorized facts. Production acceptance must perform no business-data writes. Retain the previous application deployment and compatible database definitions; rollback must not touch business rows.

Approval requested: the narrowly scoped SQL/read projection, audit allowance, current-policy review and application coordinator above, preserving existing actor-to-member access boundaries. Broader ordinary-player partner access is expressly outside this recommendation and needs its own scope decision.
