# LMS-0723 / 0.1.545 — deployed; acceptance stopped on session authorization failure

## Current status

LMS-0723 / 0.1.545 is DEPLOYED, NOT PRODUCTION ACCEPTED. The last accepted release remains LMS-0722 / 0.1.544; no rollback was performed. Stop condition reached on the first production live self-rating request. No corrective permission change, code edit or redeployment after the failure.

## Completed deployment

- Supabase project: glikrmmgirilnmamxxyl (LWR PC League Management).
- Exact reviewed migration applied once, successfully recorded as server version **20260907123652**, name **lms0723_live_intelligence**. Local reviewed file: **20260907110701_lms0723_live_intelligence.sql**, SHA-256 **A069AB845DEEBBEB5477B824D4825B0338872AAA3CFB2591305A567F168AE44D**. Do not reapply this file because the recorder uses a different execution timestamp.
- Normal main-branch deployment: commit **d7da5f66f0f228a4d1baa215c495a269d7f91f00**; Vercel **dpl_GgXqVHuLEc3fGC3Kb7NrJe14wZcx**, READY, production alias league.lwrpickleballclub.com.
- Required production environment entries, including both AI_QUALITY_HMAC entries, were listed by name/metadata only. No value read, printed or modified.

## Actual failure and read-only diagnosis

Signed-in Commissioner asked **What is my Season DUPR?** through the deployed Ask LWR UI. UI showed LIVE LMS DATA / SELF RATING / current-as-of timestamp, then **I couldn't complete the live lookup. Please try again.**

Expected was a bounded active-season clarification followed by truthful missing-value handling. Both active seasons currently contain zero numeric Season/PrimeTime ratings. No rating was fabricated; absence of data should not produce a technical failure.

Effective production permission checks:

| Permission | Actual |
|---|---|
| ai_live_session_reader SELECT auth.sessions.id | true |
| ai_live_session_reader SELECT auth.sessions.user_id | true |
| ai_live_session_reader SELECT auth.sessions.not_after | true |
| ai_live_session_reader USAGE on auth schema | **false** |
| auth schema owner | supabase_admin |
| postgres USAGE WITH GRANT OPTION on auth schema | **false** |

A read-only call `select ai_live_private.session_valid(null::uuid,null::uuid)` reproduced SQLSTATE **42501: permission denied for schema auth**, during session_valid startup. No valid user/session identifiers were supplied to that probe and no authentication data was read.

The migration includes the intended schema USAGE grant, but the migration executor lacks grant option on production's auth schema. The successful migration response did not prove that this grant became effective. Isolated tests created auth under their local database owner and did not reproduce production's auth-schema ownership/grant-option boundary. The earlier postmigration check verified private schema access, table/RPC permissions and function settings but omitted this helper-role auth-schema USAGE check. The first live test exposed that gap.

A correction must first establish an authorized way to grant the narrow schema usage or an explicitly approved alternative. Do not repeat the same ineffective GRANT, broaden Auth table reads, switch to an unrestricted definer owner, or reapply the entire migration as a workaround. No correction performed.

## Captured failure is sanitized

One outcome, **59d59b4a-1218-4546-af1a-27f0abffc5ea**:

- assistant_version LMS-0723; final_kind/reason_code technical_error.
- source_family LIVE_LMS_DATA; SELF_RATING; relationship unresolved; projectionVersion 1.
- model null; model_call_skipped true; stage3_invoked false; input/output tokens zero.
- total_ms 38 (failed lookup interval, not representative successful production latency).
- No raw question/name/email/rating/team/roster/match value or protected subject reference in the diagnostic snapshot.
- Vercel sanitized ai_quality_capture capture_succeeded log at 2026-09-07T12:41:54.450Z.
- Private attempts, contact audit and live feedback all remain zero. No Helpful interaction was submitted after the failed result. No generated answer model or embedding call for this tested path.

## Production acceptance matrix

| Gate | Evidence/status |
|---|---|
| Correct project, exact unapplied migration, object collision preflight | Verified before mutation |
| Migration applied exactly once | Verified |
| Four private tables RLS, browser denial, service minimal writes | Verified effective grants |
| Six RPC/helper fixed search paths, minimum EXECUTE, constrained helper owners | Verified |
| Session helper auth schema permission | **FAIL**; production acceptance blocker |
| Public-table ACL / public RLS-policy hashes | Unchanged |
| READY deployment, target release | Verified |
| Authenticated self request routing | SELF_RATING and LIVE LMS DATA verified; lookup failed |
| Numeric self-rating positive | Production data unavailable; zero current values; isolated evidence only |
| Manager-directory positive | Not run after first failure |
| Unsupported sensitive/bulk/reverse-email denials | Isolated passed; production not run after failure |
| New Question/follow-up/cross-user controls | Isolated passed; production not run after failure |
| Live provenance UI | LIVE LMS DATA, operation, local current-as-of shown |
| Live telemetry sanitization / zero-model calls | Verified for the one failed production request; isolated evidence for other paths |
| Controlled Helpful / live review / contact audit production | Not run; none manufactured |
| Six minimum field projections | Existing isolated ACL/guard tests retained; deployed function definitions unchanged; successful live reads not verified |
| Successful production latency | Not measured; failure interval is not a success benchmark |
| Nine LMS-0722 document sanity questions / Cross-League Leakage = 0 | **Pending**, not waived and not rerun after stop |
| Approved Answer historical viewer / activation-history UI | Pending production UI verification |
| Final acceptance | **NOT ACCEPTED** |

## Accepted seasonal limitations (separate from actual blocker)

Owner confirmed team registration is underway; legitimate rosters are expected near the end of September 2026. Zero roster memberships, zero Captain-to-roster-player pairs and zero matches are expected seasonal state, not anomalous. No synthetic production member, rating, email, team, assignment, roster membership or match was created.

Captain/Co-Captain managed-player rating/contact/roster and roster-dependent named-person team checks retain the 633-test local suite's isolated evidence: authorized match, unauthorized/nonexistent safe denial, explicit failure never self, projection guard preventing requester rating retrieval, forbidden email column inaccessible, references/reauthorization/reset, minimal projections, zero model/embedding calls, sanitized capture and contact audit. Manager-directory tests must never be reported as proof of Captain authorization.

Future obligations after correction and acceptance:

1. First legitimate Captain/Co-Captain roster relationship: live verify managed-player rating/email allow, unrelated email deny, managed roster, explicit subject/no-self-fallback, sanitized telemetry and audit.
2. First legitimate scheduled match: live verify next match/opponent/location/authorization and follow-up/New Question. No artificial match for acceptance.

No automatic authorization/behavior change is intended when data appears. These deferred gates do not excuse the actual session-helper failure or the pending hard document sanity gate.

## Integrity at stop

Member hash 7a1339ae60af33874417d29367733770 unchanged. Versions 674ac09eab94a42c1dc9095151c3bfbb, chunks d65105883eb0551997df8090e5d83ce7, Approved Answer revisions 8f9e50dc7b5dccf49af0a726965b1d52 and legacy feedback f7ef29d172daad403be08ef061ed2096 match this pass's preflight hashes. Rosters/matches remain zero. Public ACL hash 8484d4920b24d644ac6d1bfcda71c3b4 and policy hash e646b6159c90bd2e013a6c9ee9708016 match preflight.

Teams hash changed during the acceptance window (fc9e4acbed0d854178c5985db6fd95a7 to be32db7d39a4c537828a7abc63437a7c). This sequence issued no team writes; registration is underway, but the external change has not been individually attributed. Do not claim the whole team dataset remained unchanged. No corpus/Approved Answer/HMAC/environment operation occurred. One sanitized live outcome is the only acceptance event created by this sequence.

Next action requires owner review of the bounded session-helper permission correction and a production-realistic ownership test. Do not reapply the applied migration, modify privileges, redeploy, or resume acceptance without that review. No new version started.
