Latest: role-drift diagnosis and local replacement validation complete. Production remains unchanged by LMS-0726; corrected SQL awaits review and new-hash authorization. See [diagnosis](lms-0726-role-drift-diagnosis.md). No production retry.

# LMS-0726 / 0.1.548 controlled production review — access checkpoint

Status: PREFLIGHT IN PROGRESS; no production mutation or deployment. September 9, 2026, approximately 14:55 UTC.

The owner approved the exact scoped migration and candidate deployment subject to preflight and normal-LMS-first gates. This approval remains applicable; this checkpoint does not request renewed deployment approval.

Verified read-only:
- Supabase production glikrmmgirilnmamxxyl, LWR PC League Management, ACTIVE_HEALTHY.
- Vercel project prj_IBm5EKA3B2hciTmhvz0kIrPhZAX3, team team_l5rlGNrtKbyjq5Q0V4Pg9ouR; latest production READY deployment dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8. Project lists normal and dedicated View-As domains.
- Normal production login footer remains LMS-0725.
- Exact migration 20260909014356_lms0726_view_as_real_ui_reads.sql is absent from production migration history. Latest recorded migration is 20260908211419_lms0725_eligibility_self.
- Migration SHA256: 690f3c2777f760b84fee2b756ef64060c844924ded304d7ae22344e015d28125.
- All 258 registered baseline files plus 16 new scoped files match reviewed expected hashes/removals. lmsViewer.js absence is the explicitly reviewed REMOVED entry, not drift.
- Accepted dispatcher source MD5 77ef613cac6db4df5e6849a686be0c26; owner lms_view_as_executor; empty search_path.
- No page_read/lock_viewer/competition/people function collisions in the two scoped schemas; no lms0726_internal_page_read policies.
- Maintenance job 3 active, every minute; 30 successful executions in preceding 30 minutes, latest end 2026-09-09 14:54:00.070232+00.

Access prerequisite: the available browser has no authenticated production session. Opening the normal LMS redirected to /login. The login tab is open for owner sign-in. Immediate post-deployment normal Commissioner verification requires this session. Independent normal Captain/Player role verification also requires legitimate sessions; View-As must not substitute for normal-role verification.

Pending before mutation: resume read-only preflight after sign-in, verify full exact SQL ACL/ownership/RLS interaction and candidate packaging identity, capture business fingerprints/counts, then follow the approved exact migration verification and deployment sequence. No business baseline was captured yet, so refresh it immediately before mutation rather than using stale counts.

No SQL mutation, deployment, business changes, View-As initiation, OpenAI calls or notifications occurred. No rollback needed. LMS-0726 is not production accepted. Deferred security hardening remains open and out of scope.

## Signed-in continuation — automatic approval stop

Normal Terry Adelman Commissioner dashboard confirmed. Production remains LMS-0725; dashboard shows 1819 active members and zero active-scope team/roster/match activity. Read-only catalog baseline has 1970 members, 169 roles, 97 teams, 1012 rating records, 18 divisions, 204 division lines, 141 locations; zero roster memberships, matches, match lines, lineups, games and standings. Production cannot demonstrate populated roster/lineup behavior without legitimate new activity; no acceptance data will be manufactured.

All 300 accepted-source provenance entries outside reviewed changes match. A 312-file deployment package was copied to .local-validation/lms0726-production-candidate and every byte hash compared to current reviewed source. No env files, logs, SQL, tests or deferred artifacts included. Manifest: lms-0726-production-package-manifest.json. Package version 0.1.548. Vercel production baseline rechecked unchanged.

Read-only security baseline: dispatcher MD5 77ef613cac6db4df5e6849a686be0c26; maintenance MD5 b33c163b8a739d361f939aa5704bb5cf; public policies MD5 a8ed963ac9fed56fbe973a1bdcc91654; public table ACL MD5 8484d4920b24d644ac6d1bfcda71c3b4; column ACL MD5 3d6c4eaaf98d472ed2d54cde421ea074. New reader role/schema absent as expected before migration. Initial read-only query assumed reader existed and failed; corrected to nullable catalog lookup. No mutation from that query.

The exact scoped migration was submitted once to Supabase apply_migration. AUTOMATIC APPROVAL REVIEW REJECTED the action before execution: it said the transcript lacked trusted user authorization for the exact production mutation (role/schema, grants/RLS, security-sensitive functions). No alternate path or retry was attempted. Production migration/deployment is blocked pending direct user confirmation of the exact action. Existing pasted approval was read and followed, but not accepted by automatic approval review.

Post-rejection read-only verification and table fingerprints saved in lms-0726-production-business-after-block.json; pre-attempt baseline in lms-0726-production-business-before.json. No application deployment, View-As initiation, business writes, notifications or OpenAI calls. Rollback not needed. Status: CONTROLLED PRODUCTION REVIEW BLOCKED BEFORE MIGRATION; NOT PRODUCTION ACCEPTED. Deferred security hardening stays open.
Post-rejection catalog confirms migration count 0, new reader/schema absent, accepted dispatcher and maintenance hashes unchanged. All 19 business-table counts/fingerprints compare exactly equal across the blocked attempt.

## Direct authorization received; exact migration safety-guard failure

Direct user authorization explicitly named the exact migration and SHA256. Hash rechecked: 690f3c2777f760b84fee2b756ef64060c844924ded304d7ae22344e015d28125. Production migration count 0 and accepted dispatcher reverified. Fresh 19-table baseline and pre-migration catalog saved in lms-0726-production-baseline.json and lms-0726-production-catalog-before.json.

One authorized apply_migration execution attempted the unchanged SQL. It FAILED with PostgreSQL P0001: `View-As read role drift`, in the second DO block ($scope_guard$), line 2. This is the migration's own guard failure, not an approval rejection. No retry, alternative SQL, correction or application deployment performed.

Rollback verification at 2026-09-09 15:15:44.906864 UTC: migration count 0; lms_view_as_reader role absent; lms_read_private schema absent; zero new scoped functions/policies; dispatcher MD5 remains 77ef613cac6db4df5e6849a686be0c26; maintenance MD5 remains b33c163b8a739d361f939aa5704bb5cf. All 19 business-table counts/fingerprints match the immediately preceding baseline exactly. Failure evidence: lms-0726-production-after-migration-failure.json.

The role guard checks both role attributes and membership rows. The reported exception does not identify which subcondition fired. Root cause is NOT established by this error alone. No reproduction using production role creation or other mutation is authorized or attempted after the strict stop.

Status: LMS-0726 / 0.1.548 STOPPED BEFORE APPLICATION DEPLOYMENT — exact reviewed migration cannot currently apply. LMS-0725 remains the deployed application. Database transaction rolled back; no application rollback needed. OpenAI calls/tokens/cost: 0/0/$0. Normal post-deployment and View-As acceptance gates are unrun. Deferred security hardening remains open.
