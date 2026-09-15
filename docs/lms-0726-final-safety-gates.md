**2026-09-09 current status — LMS-0726 / 0.1.548: READY FOR CONTROLLED PRODUCTION REVIEW.** Member-directory read RPC is proven read-only and correctly classified in the fixture. Accepted/candidate/restored Member Administration, normal safe member/roster/Match Setup writes, isolated View-As, SQL removal/application rollback and zero migration-caused business-row changes verified. Final 1,010/1,010 tests; build/types/PDF/diff PASS; lint 0 errors/10 existing warnings. No application/candidate SQL changes for this correction; no deployment, production mutation or OpenAI calls. [Final report, evidence limits and production sequence](lms-0726-member-final-readiness.md). This supersedes earlier NOT READY fixture-stop entries; production acceptance remains pending.

**2026-09-09 current status — LMS-0726 / 0.1.548: NOT READY.** Commissioner count fixture fixed and PostgreSQL-verified; 1,007 tests passed; scoped migration/application rollback compatibility verified. Restored accepted Member Administration exposes a second fixture gap: `admin_member_directory_page` read RPC is rejected by the synthetic write allowlist. Comprehensive normal/rollback acceptance is incomplete. Earlier page-presence pass claims are superseded by the [current gate report](lms-0726-fixture-final-gates.md). No application/SQL change for this fixture correction; no production mutation/deployment/OpenAI calls.

# LMS-0726 / 0.1.548 — final safety gates: NOT READY

September 9, 2026. Owner instruction: `f7a464e2-1fb4-47e5-8ec5-35fee5eb53db`. The current local candidate remains accepted for verification, unchanged. Stopped at the accepted-baseline workflow failure, before applying the LMS-0726 migration in the rehearsal or running candidate/rollback stages. This is a **test-fixture failure, not a demonstrated application regression**. It prevents certifying the two requested readiness gates.

## Exact failure and required resolution

The actual accepted Commissioner Dashboard calls `countScopedPlayedGames` in `app/AdminDashboardClient.js`. Its normal Supabase query uses nested `line_games -> match_lines -> matches` filters and:

`home_score.not.is.null,away_score.not.is.null,game_status.not.is.null`

The isolated REST fixture currently delegates normal reads to `createViewAsProjectionClient`, which deliberately supports only the narrow View-As query subset. Its `or()` parser rejects `not.is.null`. The browser logs `Unable to count dashboard games played`; the equivalent diagnostic GET returns **HTTP 500 / Unsupported page filter**. See [exact failure](lms-0726-final-gate-failure.json), [server/browser log](lms-0726-safety-server.txt), and [partial accepted UI matrix](lms-0726-normal-accepted-matrix.json).

The initial fixture also lacked HEAD/count support; that harness-only omission was corrected. The remaining query failure is recorded separately and has not been hidden by forcing a count or suppressing the error. No normal production application or View-As adapter was changed.

**Resolution needed before resuming:** replace the normal-fixture dependency on the View-As projection adapter with an independent normal backend capable of the real normal query/write contracts, ideally isolated PostgREST/PostgreSQL using the relevant baseline schema, constraints and authorization. Then re-run the accepted baseline cleanly, followed by the candidate and rollback. Do not broaden the production View-As adapter merely to satisfy normal test queries. The existing synthetic transport is not proof of production RLS, transactional writes or hosted Auth/email delivery.

## Exact accepted-source provenance — now PASS

Read-only Vercel inspection confirms accepted deployment `dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8` is READY and retains the normal/View-As production aliases. It is a CLI deployment with `gitDirty=1`; the recorded Git commit alone is insufficient.

Retrieved its source-file manifest via the documented GET deployment-files API. **All 300 required app/config/public files match the deployment manifest's content hashes.** 298 were recovered from local byte-identical copies; the two missing files (`app/api/view-as/read/route.js`, `app/components/AskLwrAssistant.js`) were retrieved through the read-only deployment-file-content API and hash-verified. SHA256 for every recovered file is in [accepted-source provenance](lms-0726-accepted-source-provenance.json).

The exact source is preserved under `.local-validation/lms0725-exact-accepted`. No production environment values or secrets were downloaded. Local synthetic endpoint/configuration scaffolding is separate from the verified source; it is not described as an exact hosted infrastructure replica. This closes source provenance, **not** the application/schema rollback rehearsal.

## Comprehensive normal-workflow matrix

“Prior evidence” below refers to the accepted [local candidate report](lms-0726-local-parity-acceptance.md); it is not a new successful final-gate run.

| Required area | Final-gate status |
|---|---|
| Normal authentication: login/session/refresh/logout/password routing | NOT COMPLETED. Synthetic session bootstrap worked; full normal auth cycle not certified. |
| Commissioner Dashboard | FAIL in accepted-baseline fixture: games-played query unsupported. Actual shell/dashboard rendered; no View-As banner. |
| Commissioner Members | Actual normal Members page rendered; partial UI evidence captured. Administrative writes not certified. |
| Member Detail/action placement, roles, Teams, Divisions, Locations, scheduling, matches, standings, ratings | Not completed in final run after stop; prior selected UI/source evidence retained. |
| League Manager | Not reached in final six-role run. Prior normal role/routing checks retained. |
| Player: dashboard/teams/matches/standings/profile/Ask | Prior paired browser evidence; fresh final-gate run not reached. |
| Captain: dashboard/assigned teams/Team Detail/roster | Prior paired browser evidence; fresh final-gate run not reached. |
| Captain Add/Remove/current cross-community behavior | Prior synthetic Add/Remove succeeded; complete fresh baseline/candidate/write-through comparison not reached. |
| Team creation/editing/Captain and Co-Captain assignment | Not certified in final run. |
| Co-Captain | Not reached in final run. |
| Club Pro/home_location_id | Prior direct/location scope and browser checks retained; final run not reached. |
| Normal Match Setup/lineups/score entry | Prior writable-controls/unchanged-handler evidence retained; full fresh transaction path not certified. |
| Normal/public Standings | Prior evidence retained; final run not reached. |
| Ask LWR | Exact accepted UI source recovered. No generation calls. Prior deterministic LMS-0725 regression remains valid; no fresh final-gate certification. |
| Normal/View-As isolation | Prior permanent routing/auth/settings tests passed. No target banner on observed normal Commissioner/Members pages. Full requested target/role/read-only/telemetry comparison not completed. |

## View-As, cleanup and shared source

Final Player/Captain/Club Pro/multi-role parity checks were **not started** after the baseline failure. Earlier candidate evidence for actual shared dashboards, roster, Match Setup, published matches, Standings, Ask, limitations, no-Auth target, Exit/expiry and mobile remains in the accepted report. No claim that this final rehearsal re-certified them.

The old mini renderer remains removed; the landing page is null and the HTTP snapshot transport has no active consumer. Historical LMS-0724 security/snapshot SQL remains intentionally preserved. No additional deletion occurred in this safety-gate pass.

[Shared-source register](lms-0726-final-source-change-register.json) still identifies the candidate's 25 changed baseline files and their reasons. Candidate source bytes were not changed in this pass. The new exact deployment manifest now provides independent provenance for the recovered normal baseline. Outstanding workflow evidence has not been relabeled PASS. New `scripts/lms0726-safety-rehearsal.mjs` is local test tooling only; it is not an application/migration change or a successfully completed rehearsal. Its candidate and rollback stages were never invoked.

## Migration and business-data safety

Filename: `lwrpc-admin/supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql`

SHA256 reconfirmed: `690f3c2777f760b84fee2b756ef64060c844924ded304d7ae22344e015d28125`

[Exact migration inventory](lms-0726-final-migration-inventory.json) records the function names plus schema/column grants, revokes, ownership and policy statements. Four new functions:

- `view_as_private.page_read(jsonb,text,jsonb)` — restricted-reader owner; accepted executor only; SECURITY DEFINER.
- `lms_read_private.lock_viewer(jsonb,text,jsonb)` — protected migration-owner coordinator; restricted-reader EXECUTE; SECURITY DEFINER.
- `lms_read_private.competition(jsonb,text,jsonb)` — restricted-reader owner; private invoker projection.
- `lms_read_private.people(jsonb,text,jsonb)` — restricted-reader owner; private invoker projection.

All use empty search_path. The existing `public.lms_view_as(text,jsonb)` dispatcher gains the guarded delegation. Internal NOLOGIN/NOINHERIT/NOBYPASSRLS role and private schema, explicit column SELECT grants and internal-role SELECT policies only. No raw RF page grant, business DML, normal-write redesign, 360 policy bindings, 82-write migration, eight-function foundation or Phase 2 tightening. Normal browser table privileges are not revoked. Private schema/function revokes prevent browser/PUBLIC access; the exact statements are in the inventory.

Prior clean/replay/business-row/ACL/concurrency tests passed on synthetic PostgreSQL 17.11. This final rehearsal did **not** reach migration application, so there is no new upgrade/rollback business-integrity result. Production business data was untouched. Local fixture schema/seed setup is explicitly synthetic, separate from the read-only release migration.

## Rollback and maintenance

| Rehearsal stage | Status |
|---|---|
| A. Exact accepted app with synthetic baseline | Source PASS; normal smoke FAIL in fixture |
| B. Apply exact scoped migration | NOT RUN |
| C. Run candidate | NOT RUN |
| D. Verify normal LMS | NOT RUN |
| E. Verify View-As | NOT RUN |
| F. Execute rollback | NOT RUN |
| G. Verify restored normal and accepted View-As | NOT RUN |

Proposed exact rollback order, **pending successful rehearsal**: restore the accepted application first; leave the additive read migration installed; perform **no SQL rollback** during application recovery. Verify normal workflows first, then the restored accepted View-As lifecycle/snapshot, dispatcher, context and maintenance behavior. Optional later removal of additive objects is separate reviewed work, not incident operator judgment. No business-data restoration should be required; that requirement is not yet proven through a completed rehearsal.

LMS-0724 maintenance has prior accepted tests, but upgrade/rollback maintenance compatibility is **not newly certified**. No assertion of orphan-route/context compatibility is made without completing stages B–G.

## Checks, cost and limits

No final all-project check rerun is claimed: the owner required it after completing regression/rehearsal, and this run stopped during the failed accepted baseline. Last accepted candidate checks remain **1003/1003 tests; build/types/PDF/diff PASS; lint 0 errors/10 warnings; scoped PostgreSQL checks PASS**. The new test harness passed JavaScript syntax checking before execution, but is not accepted full regression infrastructure.

OpenAI calls: **0**. Incremental model cost: **$0**. No production SQL or deployment. No LMS-0727, features, AI changes or deferred security implementation.

High-priority normal-LMS Data API/security hardening remains unresolved and separately recorded. The mandatory post-LMS-0726 cross-community Ask correction remains recorded and untouched.

## Controlled production plan — NOT authorized to execute

Only after all local gates pass, run the owner's exact sequence:

A. Production preflight/integrity baseline.
B. Exact scoped SQL migration.
C. Migration/object/ACL verification.
D. Reviewed application deployment.
E. NORMAL LMS smoke tests.
F. NORMAL live-data integrity checks.
G. View-As Member Detail entry.
H. View-As Player parity.
I. View-As Captain parity.
J. Match Setup/roster read-only.
K. Ask LWR targeted acceptance, within API cost policy.
L. Mobile/accessibility.
M. Final integrity, accounting for legitimate concurrent activity.
N. Explicit production acceptance.

Any normal LMS regression stops production acceptance immediately; do not proceed with View-As testing. Use the rehearsed application-first/no-SQL-rollback recovery order only after that order is validated locally.

**Recommendation: NOT READY FOR CONTROLLED PRODUCTION REVIEW.** Exact source provenance is now solved. Independent normal-fixture support, comprehensive clean normal regression, complete rollback/maintenance/integrity rehearsal, and the final check rerun remain required.
