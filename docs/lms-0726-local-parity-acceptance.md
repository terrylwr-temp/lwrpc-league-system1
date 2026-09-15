**2026-09-09 current status — LMS-0726 / 0.1.548: READY FOR CONTROLLED PRODUCTION REVIEW.** Member-directory read RPC is proven read-only and correctly classified in the fixture. Accepted/candidate/restored Member Administration, normal safe member/roster/Match Setup writes, isolated View-As, SQL removal/application rollback and zero migration-caused business-row changes verified. Final 1,010/1,010 tests; build/types/PDF/diff PASS; lint 0 errors/10 existing warnings. No application/candidate SQL changes for this correction; no deployment, production mutation or OpenAI calls. [Final report, evidence limits and production sequence](lms-0726-member-final-readiness.md). This supersedes earlier NOT READY fixture-stop entries; production acceptance remains pending.

**2026-09-09 current status — LMS-0726 / 0.1.548: NOT READY.** Commissioner count fixture fixed and PostgreSQL-verified; 1,007 tests passed; scoped migration/application rollback compatibility verified. Restored accepted Member Administration exposes a second fixture gap: `admin_member_directory_page` read RPC is rejected by the synthetic write allowlist. Comprehensive normal/rollback acceptance is incomplete. Earlier page-presence pass claims are superseded by the [current gate report](lms-0726-fixture-final-gates.md). No application/SQL change for this fixture correction; no production mutation/deployment/OpenAI calls.

# LMS-0726 / 0.1.548 — local implementation and production review

September 9, 2026. Rescoped implementation is present locally: ONE actual LMS UI, selected by normal authenticated context or the isolated, validated View-As effective-user context. The mini-LMS presentation is removed. No production SQL, deployment, production business mutation, or OpenAI request was performed during this implementation/verification.

**Review qualification:** this is not production acceptance or an unconditional deployment-ready declaration. The independently identified production application's local rollback rehearsal is not complete. The preserved local baseline and recovered source copies are not independently proven to be that deployment's exact source. The recorded accepted deployment is `dpl_7V7DQdKkpz8w9T39eGt6KbqeeMN8` in `lms-0725-badge-deployment.txt`; its restore artifact/provenance must be confirmed and rehearsed against the additive schema before production approval. Ordinary schema/ACL compatibility tests have passed, but are not that rehearsal.

## Implementation and exact inventory

[Final source change register](lms-0726-final-source-change-register.json) lists every changed baseline file with before/after SHA256, reason, classification and evidence, plus 16 new scoped application/migration/test/tool files and two adapted existing tests. Of 258 preserved baseline files, 25 changed and 233 remain byte-identical. The baseline includes previously accepted uncommitted work; the whole working-tree Git diff is therefore not the LMS-0726 diff. Hashes supplement functional evidence; they do not prove behavior or deployed-source identity.

The actual shared Player/Captain dashboards, Team Detail/roster, published match display, Standings, AppHeader, profile dialog, SystemFooter and Ask LWR render in View-As. `ViewAsSharedPages` owns lifecycle and route admission; it does not contain parallel dashboard/roster/match/Ask renderers. The isolated projection adapter evaluates the existing read query shape against authorized server data. It cannot authenticate, make arbitrary database requests, call RPCs, or mutate. Normal Supabase creation and normal write handlers remain in place.

### Scoped migration

`lwrpc-admin/supabase/migrations/20260909014356_lms0726_view_as_real_ui_reads.sql`

SHA256: `690f3c2777f760b84fee2b756ef64060c844924ded304d7ae22344e015d28125`

Four new functions:

1. `view_as_private.page_read(jsonb,text,jsonb)` — fixed contract/argument validation and projection coordinator; restricted reader ownership, accepted executor only.
2. `lms_read_private.lock_viewer(jsonb,text,jsonb)` — protected identity/relationship locking and revalidation; migration-owner security definer, reader only.
3. `lms_read_private.competition(jsonb,text,jsonb)` — explicit competition/configuration/published match/authorized saved-lineup projection.
4. `lms_read_private.people(jsonb,text,jsonb)` — self, managed roster and minimum authorized related-person projection.

The accepted `public.lms_view_as` dispatcher gains one `page_read` delegation. Existing body/ownership and object/ACL drift guards prevent unexpected replacement. The new internal role is NOLOGIN, NOINHERIT and NOBYPASSRLS. Empty search paths, exact column SELECT grants, internal-role SELECT policies and private function execution apply. No business DML, browser EXECUTE entry, raw RF page-read grant, normal write replacement, normal privilege revocation or Phase 2 migration.

Target relationships, identity, roles and relevant match publication are locked/rechecked. Historical season/team inactivity alone is **not** treated as authorization revocation: actual normal dashboards retain authorized historical teams and memberships. Removing the authorizing relationship or role still reduces/denies access. Opposing saved player assignments are not exposed; only necessary aggregate readiness is projected.

## Parity and functional evidence

| Area | Local result and scope |
|---|---|
| Player | Same actual dashboard, self identity, team/cards and navigation compared with the same synthetic normal Player; desktop, 390px, 320px evidence. |
| Captain Dashboard | Same renderer, assigned team, roster count, matches, setup entry, standings and tools compared with normal Captain. Mutations disabled only under View-As. |
| Team Detail / Manage Roster | Actual normal roster screen and target-effective roster. View-As Add/Remove disabled; leadership-change request unavailable. Normal synthetic Add and Remove succeeded using unchanged handlers. |
| Match Setup | Actual Captain dialog, saved own-team assignments, ratings and validation. Normal selectors/Save/Email remain enabled; View-As selectors and mutations disabled. Desktop/390px/320px, Escape/focus return and keyboard containment checked. Synthetic duplicate-player warnings are shared normal behavior. |
| Matches | Dashboard match cards plus actual published live-match display; score entry disabled in View-As. Private/unpublished match scope tested server-side. |
| Standings | Actual page/cards consume authorized standings projection; normal calculation/rendering retained and rebuild denied in View-As. Synthetic ranked rows are projected. |
| Ask LWR | Exact shared LMS-0725 UI: compact welcome, actionable help examples, clarification and source badges. View transport resolves SELF as target, conversation is memory-only, feedback has no usable write receipt. Help drawer at 390px/320px and Escape/focus return checked. No generation requests; quality/security regressions use fixtures. |
| Club Pro | Normal and View-As actual Captain-style dashboard compared for synthetic authorized Club Pro. Location-based and direct team-based authority are tested in the database fixture. |
| Multi-role | Projection/auth tests cover combined roles without actor privilege inheritance. Browser evidence is strongest for Player/Captain/Club Pro; no separate complete multi-role manual workflow certification is claimed. |
| No target Auth | Durable member/role relationship support passes database/facade tests. Final post-cleanup browser rendered the actual Captain dashboard for target 3 with null role user_id. No target Auth session created. |
| Unsupported routes | Real shared shell with explicit page-unavailable message. No actor-data fallback or mini-LMS substitute. |
| Member Detail entry | Real Commissioner/League Manager plus valid target preflight; same action-row style. Desktop/390px/320px with button, 390px/320px invalid target without button/gap. Confirmation identifies target/read-only behavior and retains isolated handoff. |
| Banner / Exit | Persistent target/effective roles/real actor/READ-ONLY/Exit; spacing accounts for mobile navigation/footer and dialogs. Exit ends context, clears local credential/state and returns to normal target detail. Original administrator tab stays unchanged. |
| Navigation | Shared navigation, direct route, refresh and unsupported route tests. Final no-Auth Captain roster round trip exercised browser Back/Forward/Reload on the isolated origin. |
| Expiry | Real database expiry denies; accelerated local browser timer test removes shared content and clears context. No normal-actor fallback. The browser test accelerated time rather than waiting the entire production lifetime. |

Browser evidence includes `lms-0726-normal-player-desktop.png`, `lms-0726-view-player-{desktop,390,320}.png`, `lms-0726-normal-captain-setup.png`, `lms-0726-view-captain-setup-{desktop,390,320}.png`, `lms-0726-view-roster-390.png`, `lms-0726-live-match-390.png`, `lms-0726-view-ask-drawer-{390,320}.png`, `lms-0726-member-actions-{desktop,390,320}.png`, `lms-0726-member-actions-without-view-{390,320}.png`, the normal/View Club Pro desktop pair, and `lms-0726-final-no-auth-captain.{png,txt}`. Earlier files explicitly named `before` are development evidence, not final acceptance screenshots.

## Normal LMS regression and limits

Normal-origin route/API tests pass with View-As configured, missing and unavailable, without calling the View-As service. Normal auth behavior is executed against the recovered baseline implementation for five role cases. Normal settings fetch preserves its original request/response path. [Handler comparison](lms-0726-normal-handler-comparison.json) verifies 12 normal handler bodies unchanged after accounting for View-As-only early exits, including Add/Remove, setup/flex save and notifications, profile saves and logout.

Executed browser comparisons cover normal Player, Captain, Club Pro, Member Detail, roster and Match Setup. Normal synthetic provisional Add and Remove commit successfully. The local fake email environment intentionally has no sending credentials; an email-delivery failure in the provisional-add flow is expected and no real message was sent. This does **not** certify actual notification delivery.

Commissioner/League Manager dashboards, general Teams, scheduling, ratings, member administration and other unchanged normal workflows are covered by unchanged source paths, normal routing/auth controls and the existing deterministic suite where applicable. They have **not each received a fresh complete browser/database write-through workflow test** in this pass. No claim of comprehensive production workflow certification is made. Before deployment approval, close the rollback provenance/rehearsal gap and review whether additional normal workflow fixture coverage is needed for the production gate.

## Security and validation

- `npm test`: **1003 passed, 0 failed, 0 skipped** — `lms-0726-rescoped-tests.txt`.
- `npm run lint`: **0 errors, 10 warnings** — `lms-0726-rescoped-lint.txt`.
- `npx tsc --noEmit --incremental false`: passed — `lms-0726-rescoped-types.txt`.
- `npm run verify:ai-pdf-server-bundle`: passed — `lms-0726-rescoped-pdf.txt`.
- `npm run build`: passed — `lms-0726-rescoped-build.txt`.
- `git diff --check`: passed — `lms-0726-rescoped-diff.txt`.
- Real PostgreSQL **17.11**: clean apply, two replays, concurrent team/role/hierarchy/publication changes, historical scope, public-helper denial and expiry passed — `lms-0726-scoped-postgres-results.txt`.
- Synthetic catalog tests verify business rows and normal ACLs unchanged by migration; deny raw RF, DML, public helper execution, forged proof/arguments, and drifted ACL/function objects. Missing-helper recovery and replay are tested.
- Nine crafted mutation endpoints return **403** — `lms-0726-browser-mutation-denial.json`. Existing isolation tests and projection-client tests deny roster/setup/score/profile/team/manager/event mutations independently of hidden controls.
- Browser confirms no target Supabase Auth storage and detached opener. Fixed source/image operations validate configured path/target scope and revalidate context; no arbitrary storage/browser URL proxy.
- Mobile and accessibility checks cover actual action row, persistent status, disabled controls, Ask help focus/Escape, Match Setup focus/Escape and compact layouts. This is targeted keyboard/semantic verification, not a complete assistive-technology audit.

## Cleanup, limitations and deferred work

`app/view-as/page.js` changed from 69 lines / 12,254 bytes to a required two-line / 134-byte null landing entry: **67 duplicate presentation lines and 12,120 bytes removed**. This removes mini dashboard/team/roster/match/standings navigation, duplicate Ask presentation and inline styling. Its HTTP `snapshot` loader is removed. Presentation assertions now target the shared renderer; accepted security/lifecycle tests remain. Historical accepted snapshot SQL is retained, with no active View-As UI/HTTP consumer; deleting historical security migrations is not part of this release.

Unused `app/lib/lmsViewer.js` was moved into `docs/deferred-security-hardening/workspace/lmsViewer-unused.js`. This is archival, not an active second implementation. The 67-line figure is duplicate-renderer reduction, **not net repository LOC reduction**: the scoped adapters, migration and tests add code. No entire shared LMS route was deleted.

Explicit limitations remain for unsupported manager/global pages and combined opposing-private-lineup/scoresheet/contact detail that exceeds the scoped read contract. The normal UI continues to operate unchanged. View-As shows the approved limitation rather than fabricated empty data or broader actor authority. Candidate discovery/Add and all writes remain unavailable in View-As.

**HIGH PRIORITY deferred normal-LMS Data API/security hardening remains open and outside this release.** Previously identified ordinary Data API exposures are not fixed by LMS-0726. No admission/removal redesign, notification-outbox architecture, 82-write cutover or Phase 2 tightening is active. Do not start LMS-0727.

OpenAI calls for this implementation/verification: **0**. Incremental model cost: **$0**. Production model and AI architecture unchanged.

## Controlled production sequence — later approval required

1. Resolve exact accepted deployment/source provenance and complete the local rollback rehearsal against this additive schema. Finish any missing normal workflow acceptance coverage; do not infer it from hashes alone.
2. Obtain explicit production approval for this exact app inventory and migration SHA. Read-only preflight: accepted immutable deployment, current schema/function/role/ACL drift, normal-role baseline, and business-data counts/fingerprints with observation times. Never include sensitive row content in the report.
3. Apply **only** the named scoped migration. Stop on any guard/drift failure. Compare object inventory, normal ACLs and business-data integrity. No normal-write/Phase 2 SQL.
4. Test **normal LMS first against the additive schema while the accepted application remains active**. Verify auth, dashboards, teams/rosters, setup, matches/standings/ratings/members, Club Pro/manager and Ask paths. Production write smoke tests require separately authorized safe records/actions.
5. Deploy the reviewed 0.1.548 app only after the schema/normal gates pass. Repeat normal smoke/integrity checks before View-As acceptance. Account for concurrent legitimate administrator/player changes.
6. Targeted View-As acceptance: same Player/Captain/Club Pro/multi-role/no-Auth targets, core pages, source access, handoff/Tab A, expiry/Exit, crafted mutation denial, mobile/accessibility and cleanup. No automatic full OpenAI benchmark.
7. Stop/restore the accepted immutable application immediately for a critical normal regression. Additive read infrastructure may remain pending dependency review; no business-data restore should be needed because this release must not mutate business data. Do not drop LMS-0724 security infrastructure or blindly reverse migrations.

No production step in this sequence has been executed for LMS-0726.

## Final safety-gate follow-up

See [September 9 final gate report](lms-0726-final-safety-gates.md). Exact accepted-source provenance is now verified against the deployment manifest (300 files), superseding the source-provenance limitation above. The complete rollback rehearsal remains unperformed: accepted-baseline normal Dashboard testing exposed an unsupported query in the local fixture, so work stopped before the candidate migration. Status remains NOT READY; prior checks are not represented as a new completed final-gate run.
