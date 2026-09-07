# LMS-0723 session redesign controlled production acceptance

2026-09-07. In progress, not accepted. Owner confirmed concurrent team registrations are legitimate; do not treat operational count changes alone as drift. Attribute mutations to application/user activity versus migration/testing.

Pre-correction baseline: 1,951 members; 72 teams; zero roster memberships; zero matches; 22 document versions; 1,733 chunks; 20 legacy feedback events. Original LMS-0723 migration recorded once as 20260907123652; corrective migration absent. Expected old function signatures/ACLs and auth RLS confirmed. Reviewed corrective SHA256 DA4684CE2CB7B28CA7381886446F53D31456A8B89EE514A67D442A6D33F9C99C matches.

Reviewed migration contains function/ACL/reader cleanup and the approved nullable historical audit session column only. Function definitions contain existing reads and approved private audit/feedback writes but creating/replacing them does not execute them. There is no operational member/team/roster/match row DML in the migration transaction. No corpus or environment change is required.

## STOP — first self-rating gate failed

Corrective migration applied successfully once, server recorder **20260907132549 / lms0723_server_session_validation**. The local reviewed filename remains 20260907131012_lms0723_server_session_validation.sql. Do not reapply either the original or corrective migration.

Deployment: commit **a2d4af0be68ba11631aa9662cf20340c30c1d294**, Vercel **dpl_288Q8zmgsnohrzJeHcAB2BzxTAAL**, READY and aliased to league.lwrpickleballclub.com. The refreshed production UI displays LMS-0723. No environment/HMAC change or document processing.

Postmigration read-only evidence:

- Reader role absent; session_valid helper absent; zero Live LMS custom-role SELECT access to Auth tables; zero Live LMS function references to auth.sessions.
- Four corrected RPC/helper signatures: SECURITY INVOKER, empty search_path, anon/authenticated EXECUTE false, service_role EXECUTE true.
- Historical access_audit.session_id is nullable as approved; retention function unchanged.
- Auth sessions RLS enabled, zero policies, no broadening.
- Member, corpus version/chunk, legacy-feedback, public table ACL/RLS and policy fingerprints matched pre-migration values.
- Counts immediately after migration remained 1,951 members, 72 teams, zero rosters/matches, 22 versions, 1,733 chunks, 20 legacy feedback rows. Concurrent legitimate registration remains permitted and must not be confused with migration writes.

First required question, through the refreshed signed-in production Ask LWR UI:

`What is my Season DUPR?`

UI result at 2026-09-07 13:29:22.795 UTC (9:29:22 AM local):

`LIVE LMS DATA` / `SELF RATING`

`I can't access that player information for your account.`

This is **FAIL**, not a successful missing-rating or season-clarification result. No further acceptance question or Helpful event was submitted. No correction, permission change, rollback or redeployment followed this failure.

Sanitized outcome **541109b7-3f52-49bc-84ac-ce410c44dc5e**:

- final_kind protected; reason_code denied; relationship unresolved; intent SELF_RATING; projectionVersion 1.
- source_family LIVE_LMS_DATA; assistant_version LMS-0723.
- stage3_invoked false; model_call_skipped true; model null; input/output tokens 0.
- total_ms 43: denied lookup interval only, not a successful authentication/authorization latency benchmark.
- Diagnostic snapshot contains no user/member/subject identifiers, credentials or rating values.
- Private attempts, audit and live feedback counts remain zero; rosters and matches remain zero.

Online authentication did not return its 401/503 failure response; execution reached the live database denial path. Since no attempt row was written, the denial is consistent with a pre-budget principal/subject authorization gate. The specific reason (such as immutable user-ID/member binding, active state, or another initial guard) is **not yet established**. Do not assert an identity mismatch or repair associations without a separate bounded diagnosis. The UI's legacy email-based authorization is not proof that the immutable live binding is valid.

## Gate disposition

| Requested area | Result |
|---|---|
| Corrective migration / cleanup / effective grants | PRODUCTION VERIFIED |
| Corrected READY deployment and version | PRODUCTION VERIFIED |
| Online auth → deterministic Live LMS route | Reached live path; first protected lookup denied |
| First self-rating | FAILED — acceptance stopped |
| Direct authenticated HTTP RPC substitution | Not run after stop; production catalog denial and isolated actual-role denial verified |
| Six capabilities, named-person no-self-fallback, role matrix, field projections | 638-test local suite retained; new production paths not exercised after stop |
| Zero model/embedding boundary | Failed self path has Stage 3 false/model skipped/zero tokens; isolated six-capability zero-network controls retained |
| Telemetry/privacy | One sanitized denied outcome verified |
| Feedback/contact audit | No production interaction manufactured; infrastructure preserved and private counts zero |
| Routing follow-up/New Question | New Question state cleared by reload; remaining production follow-up/routing gates not run |
| Timeout/auth unavailable | Isolated five-second deadline/fail-closed evidence retained; no Auth disruption |
| Revocation | Prior invalid-token live probes and v2.196.0 source evidence retained; actual logout/revocation replay NOT LIVE-VERIFIED |
| LMS-0722 nine-question sanity | Pending, not waived |
| AI management/history/viewer/activation UI | Pending in this sequence |
| Successful production performance | Not measured; denied 43 ms is not a success benchmark |
| Operational integrity | No migration/test operational row DML; postmigration fingerprints unchanged; legitimate registrations remain expected |
| Final status | **LMS-0723 / 0.1.545 DEPLOYED, NOT PRODUCTION ACCEPTED** |

Captain/Co-Captain roster-dependent capabilities: **ISOLATED/SYNTHETIC VERIFIED — LIVE PRODUCTION VERIFICATION PENDING LEGITIMATE ROSTERS.**

Next-match capability: **ISOLATED/SYNTHETIC VERIFIED — LIVE PRODUCTION VERIFICATION PENDING LEGITIMATE MATCH DATA.**

These accepted seasonal limitations do not waive the failed self-rating gate. Last production-accepted release remains LMS-0722 / 0.1.544. No new version or phase started. Next work requires bounded diagnosis of the failed live requester authorization before any correction or further acceptance.
