# LMS-0723 controlled production preflight — required data unavailable

Status: STOP BEFORE MIGRATION AND DEPLOYMENT. LMS-0723 / 0.1.545 remains locally validated but not deployed/production accepted. Production remains accepted LMS-0722 / 0.1.544.

The latest controlled-deployment approval requires an existing Captain/Co-Captain and a player already on a team they explicitly manage for the first authorized named-player rating/email gates. It also says to stop before mutation on unexpected production state and prohibits production member/role mutation solely for testing.

## Read-only findings

- Correct Supabase project: glikrmmgirilnmamxxyl, LWR PC League Management, ACTIVE_HEALTHY.
- Vercel lwrpc-admin's latest production deployment is the accepted LMS-0722 deployment dpl_F1A5PEKbyNdPjqfz7RHD9QkdPHdy, READY. No new deployment created.
- Reviewed migration SHA-256 matches A069AB845DEEBBEB5477B824D4825B0338872AAA3CFB2591305A567F168AE44D.
- No migration entry for version 20260907110701 / LMS-0723, no ai_live_private tables/functions or reserved live roles, and no public ai_live_lookup/ai_live_feedback/ai_live_review collision.
- Core column metadata matches the required named fields, including the three auth.sessions columns. Production public-schema default grants remain broad as modeled in isolated tests. Existing core tables have RLS enabled; this does not substitute for the pending capability authorization.
- Corpus counts match the accepted report: 7 documents, 22 versions, 1,733 chunks. Active Rules pointer remains e4d9bf77-e15e-4d80-84ba-2f7259970ba6. Approved Answers: 1 answer, 2 revisions, 7 events. Legacy feedback: 20 rows. These are count/pointer checks, not a complete history hash verification.

## Blocking prerequisite

Two read-only queries confirmed:

| Production fact | Count |
|---|---:|
| Members | 1,951 |
| Teams | 69 |
| Active teams | 16 |
| Teams with Captain or Co-Captain assigned | 21 |
| All roster memberships (team_members) | 0 |
| Active roster memberships | 0 |
| Authorized active Captain-to-roster-player pairs | 0 |
| All matches | 0 |
| Active seasons | 2 |

The confirming query ran as postgres with bypass_rls=true. These zero counts are not an authenticated user's RLS-filtered view. They do not establish that data was deleted or when the state arose; no earlier operational row baseline was available for a historical change claim.

There is no existing managed-roster player for the required Captain rating/email/authorized-person-team tests. A directory-authorized Manager/Commissioner lookup is a different capability population and cannot prove the Captain gate. There is also no real upcoming published match for a successful NEXT_MATCH test; empty-state behavior and isolated positive coverage are distinct from production-positive acceptance.

## Production acceptance matrix

| Gate | Disposition |
|---|---|
| Project and accepted deployment identity | Confirmed |
| Exact migration hash; unapplied/no function-role-table collisions | Confirmed |
| Required production Captain-to-roster fixture | BLOCKED: zero roster memberships |
| SELF_RATING production response | Not run |
| PLAYER_RATING managed-player production response | Blocked; not run |
| PLAYER_CONTACT managed-player positive/negative gates | Blocked; not run |
| SELF_TEAM named authorized/unauthorized production gates | Blocked; not run |
| TEAM_ROSTER production positive | No roster rows; not run |
| NEXT_MATCH production positive | No match rows; not run |
| Migration application and effective postmigration security | Not run |
| Deployment/version smoke test | Not run |
| Role matrix, follow-up/reset, live telemetry/feedback/audit | Not run |
| Production zero-model/projection/latency checks | Not run; local evidence preserved |
| Document sanity, historical viewers, activation UI | Not run |
| Full HMAC/history hash/final integrity checks | Pending; no config/secret changed or exposed |

Local 633-test validation remains valid evidence for the local implementation only. No acceptance test event, member/roster/match change, SQL migration, code change, corpus processing, environment/HMAC modification or deployment occurred in this pass. Only local status documentation changed.

## Required review to resume

Either legitimate existing-workflow roster membership must become available before the required production-positive Captain gates, or the owner must explicitly revise the acceptance sequence to allow deployment with specified positive gates deferred and isolated evidence retained as limitations. No such change is inferred. A legitimate published match is separately needed for a production-positive next-match check. Do not manufacture test members, roles, roster rows or matches under the current approval.

After prerequisites or revised authorization are established, repeat the read-only preflight, then continue the exact reviewed migration/deployment sequence. LMS-0723 is NOT production accepted. No subsequent version or live capability phase started.
