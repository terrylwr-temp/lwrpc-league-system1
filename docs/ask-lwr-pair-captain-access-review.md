# ELIGIBILITY_PAIR Captain access review — September 12, 2026

Status: **STOP FOR REVIEW — private SQL authorization change required.** No application, migration, grant, production configuration, or business-data changes were made for this review. No production lookup was invoked; those lookups can write operational audit records.

## Finding

The accepted implementation already admits Captains, but only resolves the actor and active members already rostered on an active team the actor manages. A prospective player outside those rosters is intentionally excluded. This cannot be corrected by enabling a Captain role flag in the application.

The existing roster screen does not expose a reusable bounded prospective-player lookup. It reads a broad member list and season ratings in the browser and then filters candidates locally. Reusing that as an Ask LWR directory, or substituting a service-role member query, would exceed the requested scope.

Inspection used accepted isolated checkout `C:/lwrpc-league-system/.local-validation/fast-fix-ratings-success`, commit `76a31c2` (accepted application `74df01d2b38d5950d053371bd26fe0ca22cb955d`). Findings concern that source and local database fixtures; no fresh production policy inventory was taken.

## Evidence

Paths below are relative to the isolated checkout's `lwrpc-admin` directory.

- `supabase/migrations/20260912181814_eligibility_pair_read_only.sql`: Captain is already an allowed role. Name resolution and selected-target reauthorization require self or an existing active managed-roster relationship. Final facts additionally require the relationship in the requested season. Ordinary Player and View-As are denied.
- The same SQL validates an optional page team during resolution, but the final context check is season-level: it does not require the requested division itself to be a division of a team managed by the Captain. The new requested boundary therefore needs an explicit managed-team/division check, as well as prospective-target authorization.
- `app/lib/aiPairEligibilityService.js:39`: resolves both people before division clarification. Team context comes only from a team page path. Lines 65 and 75 send division/rules context to read/audit without carrying team. Application context and signed continuation state would need to preserve the authorized team through every phase.
- `app/teams/[id]/page.js:148`: browser member query includes contact/membership fields and requests up to 5,001 rows without a team parameter. The subsequent ratings query reads the selected season. `availableMembers` at line 949 applies community/location and existing-roster exclusions in the client. These filters are not an authoritative purpose-scoped name/facts permission.
- `supabase-security-hardening-batches-1-2.sql:99`: `private.current_user_can_manage_team` is an existing reusable team-management predicate based on authenticated roles and Captain/co-Captain assignments (with existing manager/club-pro semantics). Its roster-write policies establish who manages a team; they do not provide a bounded prospective-player read contract for the trusted Ask LWR actor.
- `supabase/migrations/20260910203000_season_ratings_working_workflow.sql:208`: `season_ratings_roster_policy()` checks the role and returns ratings policy, not candidate identities or player ratings.

## Minimum change requiring approval

Extend only the private ELIGIBILITY_PAIR authorization contract for actual Captains. No general member-directory endpoint, Commissioner role substitution, public grant expansion, or broader table RLS access is proposed.

1. Require an active team the Captain currently manages before prospective-name lookup. Use trusted actor identity and the established Captain/co-Captain assignment semantics; do not trust a browser-supplied role or team. If multiple teams apply, return bounded managed-team choices. Derive the exact active league, season and division from that authorized team.
2. Define the prospective candidate population for that team on the server: active members eligible for the roster picker’s community scope, including applicable home-community restrictions. The present client-side filtering must be translated into an explicitly reviewed authorization predicate. Optional UI location selection must not become an authorization bypass. Whether legacy null-active members are included must be stated explicitly; the roster picker and pair function currently differ here.
3. Return at most five name choices with minimal identity labels, independently authorize both selected players, and read only the applicable season/PrimeTime rating, RF/NR basis and placements required by the existing evaluator. Rating noncompliance should produce a useful No answer, not hide an otherwise authorized candidate.
4. Bind team, season, division, both subjects and actor/session to continuation state. Recheck current role, managed-team assignment and both targets during resolve, facts and final audit, including after clarification. Reject unmanaged divisions, other seasons, tampered context and revoked assignments.
5. Preserve ordinary Player and all View-As denial. Leave Commissioner/manager behavior and club-pro scope unchanged. Retain existing audit, stale-facts, receipt and recovery protections. Do not change calculations or business records.

This requires a reviewed SQL function change plus a localized application context/clarification adjustment. No SQL implementation has been started. Existing roster-management permission can anchor the team check, but it does not by itself authorize the missing prospective-player projection.

## Local verification

Ran `node --test test/pairEligibilityDatabase.test.mjs test/pairEligibilityIntegration.test.mjs test/pairEligibility.test.mjs`: **33 passed, 0 failed**.

The actual SQL fixture confirms Captain managed-roster resolution, exclusion of a prospective member outside the managed roster, ordinary Player denial, View-As denial, loss-of-relationship denial, restricted browser execution, minimal projections, receipt/session protections, stale-facts rejection and rollback. Existing Node module-type warnings remain. No application changes were made, so lint/build were not rerun for this documentation-only review.

After approval, add focused controls for prospective pairs and mixed roster/prospective pairs, both name orders, ambiguous names, multiple managed teams, explicit unmanaged division, foreign season, removed Captain assignment, revoked candidate scope, forged/stale team continuations, community restrictions, Player/View-As denial, and absence of contact/profile leakage. Production deployment remains unapproved by this request.
