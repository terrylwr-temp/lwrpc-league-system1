> Current status: the owner approved this plan for local implementation in attachment b077eb98-4e8b-4869-a0cd-f68af4abd299. The later [normal-LMS safety gate](lms-0726-normal-lms-safety.md) is controlling. STOP FOR REVIEW statements below describe the historical proposal, not a new permission requirement. Production SQL/deployment remain prohibited. Local implementation and final validation are incomplete.

# LMS-0726 / 0.1.548 — narrowed View-As parity scope

**RESCOPED — STOP FOR REVIEW.** Owner scope correction in attachment `208b0c3a-7622-481c-b1a5-9147514aa8bd` supersedes the broad foundation/cutover implementation instructions. This report is a proposal, not a parity PASS or permission to deploy. This pass changed documentation only. No code reverted, migrations moved/applied, mini-LMS deleted, production accessed, or OpenAI called.

## 1. Exact release boundary

Deliver ONE actual LMS presentation with ordinary user context or accepted LMS-0724 secure View-As target context. Reuse actual components, styling, navigation, page render trees and pure display calculations. Adapt only the selected pages' identity/read transport and read-only control availability. Preserve ordinary loaders, writes, authorizations and business rules. Small component/controller separation needed to reuse the real UI is in scope; a normal-LMS database cutover is not.

Keep dedicated origin, browser-bound handoff/context, real-actor validation, target-effective authorization, expiration, audit, maintenance, Exit and untouched target Auth. No administrator bearer token or writable client enters the isolated browser. Ordinary API/Server Action/event-code mutations remain denied even if context is omitted or a normal token is supplied.

Out of this release: 292-consumer migration; 82-write migration; changes to the other 30 browser writes; Phase 2 revokes; admission/removal/lineup business-rule changes; policy bindings; outbox/notification redesign; system-wide role/route changes. Prior owner policy decisions remain recorded for the future hardening project, not activated by this UI release.

## 2–4. Page-by-page reuse classification

These are source-backed design classifications, not executed browser/security acceptance. A means the rendering is already reusable; it still sits inside the validated View-As shell. B requires a bounded adaptation before exposure. C is unavailable only in View-As for this release. An existing component importing normal Auth/Supabase cannot simply be mounted in isolation.

| Actual page or surface | Class | Scoped treatment |
|---|---|---|
| `/help/[role]`; static instructions; existing icons/dialogs/styles | A | Same render components; effective role picks content. No new privileged lookup. |
| `/design-preview`, `/design-preview/admin`, `/design-preview/captain` redirects | A | Preserve redirect semantics to the supported real destination; destination gate still applies. |
| `/print` | A, conditional | Same renderer only for payload created by an authorized page in this isolated tab; no administrator-tab storage import. Without such payload show empty/limitation state. |
| Shared `AppHeader`, navigation/sidebar, footer, profile display | B | Keep the actual render tree. Supply validated target identity/settings; isolate normal Auth/profile-write/device effects. Target roles drive links. Persistent banner and Exit are additional. |
| `/player-dashboard` | B — required | Own profile/team/hierarchy, permitted roster labels, published activity, selected history/standings through bounded target reads. Same tabs/cards/dialogs and display calculations. |
| `/captain-dashboard` | B — required, highest priority | Actual dashboard/controller state and render tree. Assigned captain/co-captain/direct and home-location Club Pro read scopes; current/previous-season selection, roster, matches, records, setup status. No all-team manager fallback. |
| Captain roster modal | B | Reuse actual modal and permitted roster data already loaded for the selected team. No candidate discovery added here. |
| Match Setup within Captain Dashboard | B — required attempt | Actual existing setup dialog; selected match/team/roster/lineups/relevant season ratings and configuration. Preserve other-side reveal rules; return completeness only where player identities are not authorized. Disable edit/submit/email. Normal submission unchanged. If a specific read cannot be safely reproduced, limit this feature only. |
| `/teams/[id]` / Manage Roster | B — required attempt | Actual page, managed-team read entitlement and existing lock behavior. Bounded roster/history and candidate search with current UI status meanings. Candidates: names/ID, selected-season display rating and minimal indicators; no contact, raw RF or unrelated ratings. Add/Remove unavailable; no admission redesign. |
| `/teams` | B with explicit scope qualification | Reuse actual Teams UI only for target-authorized team rows. Manager target can receive its authorized team listing via a fixed read contract; Captain/Club Pro receives its authorized relationships. Show a View-As scope notice if the normal legacy global listing is broader. Do not change the normal global Teams route/authorization. If the page cannot operate with this bounded data without broader work, classify that route C instead of substituting a summary. |
| `/standings`; embedded division schedule/results | B | Same tables/dialogs; existing authenticated/publication audience, competition fields and labels only. A team name is not permission for private contacts/roster. |
| `/live-match/[id]` | B | Same published display, authorized member context, participant names/scores only; no anonymous audience expansion. |
| `/matches/[id]`, `/score-entry/[id]` | B, after priority dashboard reads | Same render tree for authorized managed match side; safely available roster/score/setup state. No save/default insertion/verification/export on mount or click. If controller cannot be separated safely within bounded work, that route becomes C. |
| `/matches` | C where its real redirect reaches unsupported `/scoring` | Retain actual navigation/redirect relationship; destination shows limitation. Do not create a substitute Matches summary. Dashboard and supported match detail/display remain available. |
| `/ask-lwr`, Ask drawer | B — reuse accepted backend | SAME `AskLwrAssistant`, welcome/help, clarification and source presentation. Accepted View-As ask/source transport; SELF is target, feedback disabled, diagnostic behavior preserved. No model/retrieval redesign or model tests. |
| `/official-document/[citation]`, `/approved-answer/[citation]` | B | Reuse actual viewer with accepted context/receipt-bound source transport; never use an administrator receipt. |
| `/round-robin`, `/round-robin/[id]`, `/tournaments`, `/tournaments/[id]`, `/tournaments/[id]/display`, `/tournaments/[id]/standings` | B, public reads only | Reuse existing explicitly public endpoint serializers through same-origin read-only transport if bounded. Parent publication rules unchanged. Private/capability-only variants C. |
| `/` AdminDashboardClient | C initially | Broad administration aggregates/loaders and associated dialogs are outside the Player/Captain priority read set. Same real shell with page limitation for manager target; no fake admin dashboard. |
| `/members`, `/members/[id]`, `/ratings`, `/member-import` | C in View-As | Broad directory, administrative RF/contact/history/import/Auth metadata contracts deferred. Normal Member Detail remains unchanged except approved View As button placement. |
| `/scoring`, `/scheduling`, `/schedule-editor` | C | Compound operational controllers/default generation and broad private reads; do not refactor normal mutation architecture to enable these routes. |
| `/seasons`, `/leagues`, `/divisions`, `/divisions/[id]`, `/locations`, `/score-sheets` | C | Administrative configuration screens deferred; necessary selected-team configuration can still feed B pages through their bounded read contracts. |
| `/system-setup`, `/email-options`, `/league-communications` | C | Settings, provider/notification administration and send/preview side effects outside scope. |
| `/ai-assistant`, `/ai-assistant/console`, `/ai-assistant/review`, `/ai-insights` | C | Administrative AI/diagnostic controllers deferred; player Ask LWR remains B. |
| `/round-robin/[id]/admin`, `/round-robin/[id]/player`, `/tournaments/[id]/admin`, `/tournaments/[id]/player` | C | Private event administrator/player-capability state is not supplied by target member identity; never borrow actor tokens or event codes. |
| `/login`, `/reset-password`, password/passkey/push/install controls | C in View-As | Target Auth/device behavior is not simulated. Retain page-independent shared UI; Exit remains usable. |
| `/view-as` mini-LMS | Replace after acceptance | Lifecycle bootstrap/controller is preserved/extracted; old summary presentation removed only after real pages and limitations pass. |

Class C does not mean these pages are inherently impossible to secure. It means exposing them now would require additional private-read/controller scope beyond this bounded release. Do not promote C through a generic privileged proxy. A B-to-C fallback needs an exact documented reason and review in the acceptance report; Player/Captain dashboards must not silently become limitations while claiming parity success.

## 5. Existing eight functions

| Function | Decision | Reason |
|---|---|---|
| `lms_write_private.lock_roster_add(uuid,uuid,uuid)` | DEFER | Normal Add transaction lock; no View-As write is allowed. |
| `lms_write_private.lock_roster_remove(uuid,uuid,uuid)` | DEFER | Normal Remove transaction lock. |
| `public.lms_roster_remove_player(uuid,uuid,uuid,uuid)` | DEFER | Normal removal redesign. |
| `lms_write_private.evaluate_eligibility(uuid,uuid,uuid[],text,uuid,jsonb)` | DEFER | New admission/play certification engine, not a display requirement. |
| `public.lms_roster_add_player(uuid,uuid,uuid,uuid)` | DEFER | Normal admission transaction. |
| `lms_write_private.lock_match_setup(uuid,uuid,uuid)` | DEFER | Normal setup mutation lock. Read authorization will use a separate narrow read coordinator. |
| `public.lms_match_setup_save(uuid,uuid,uuid,jsonb,uuid)` | DEFER | Normal setup submission redesign. |
| `public.lms_match_setup_reset(uuid,uuid,uuid)` | DEFER | Normal manager reset. |

KEEP: zero of these eight. Discard: zero. Preserve source/tests/hash evidence in the hardening archive, then exclude them from the scoped release's runnable migration/application paths after rescope approval. No functions were applied to production, so no production rollback is needed.

## 6. Policy bindings and infrastructure

All 360 policy bindings: **DEFER**, including the accepted PrimeTime normalization and owner admission/removal decisions. The new policy_bindings, operation_receipts and notification_outbox tables, writer/evaluator/normal/delivery roles and their grants: **DEFER**. No policy seeding, pending admission, new eligibility labels, or notifications are needed for View-As display.

The additive draft `20260909002847_lms0726_security_foundation_additive.sql` and empty tightening draft `20260909002931_lms0726_security_foundation_tightening.sql` are deferred artifacts, not release migrations. Following approval, archive them with their builders/fixtures outside `supabase/migrations` and active test discovery, retaining reproducible relative-path support. Do not leave an automatic deployment path able to apply them. This report does not move/delete them yet.

## 7. Existing application/source changes

| Files/work | Decision for narrowed release |
|---|---|
| `app/lib/lmsViewer.js` | KEEP only effective viewer identity/mode/readOnly utilities, if used by the scoped adapter. Remove/defer its unwired normal Add/Remove authority mirror. It is currently unused, so no normal behavior depends on it. |
| `app/lib/lmsRatingDomain.js` | DEFER / remove from active app after archival. New admission decimal/RF policy interpreter is unnecessary for read-only parity; retain existing normal display helpers. |
| `test/lms0726Domain.test.mjs` | KEEP effective-identity/no-actor-bleed assertions when wired; DEFER admission/rating/normal-write sections. |
| `test/lms0726Database.test.mjs`, `test/helpers/lms0726Database.mjs`, `scripts/lms0726-build-foundation.mjs`, `scripts/lms0726-foundation-postgres.mjs`, `scripts/lms0726/*` | DEFER as a preserved reproducible hardening bundle; remove from scoped release execution after review. |
| `test/lms0725SourceClassification.test.mjs` scalar-privacy assertion fix | KEEP. Removes a timestamp false positive without changing Ask LWR behavior or weakening private-value checks. |
| Existing LMS-0725 modified/untracked application files, accepted LMS-0724 security files | KEEP accepted work. Do not reset them based on a broad `git status` list. The pre-0726 working-tree patch distinguishes this work. |
| `docs/project-roadmap.md`, inventories, reports, checkpoint, test logs | KEEP as history; add explicit superseding scope and future-hardening ownership. |

No existing normal page/controller, normal write endpoint, `auth.js`, `proxy.js` or `layout.tsx` was changed by the eight-function implementation. The Member Detail button move and real-page reuse remain unimplemented. Thus no normal workflow rewrite needs rolling back. App/package version still remains the accepted baseline until the scoped release is ready.

## 8. SQL actually required

The accepted snapshot lacks real dashboard fields, selected-side saved lineups, page history and minimal candidate data. Merely restyling it or fetching all data with the actor's service authority would fail the objective/security boundary.

Proposed scoped SQL: **four new read-only functions**, one restricted NOLOGIN/NOBYPASSRLS read role, one private read schema, and one additive `page_read` branch in the accepted `lms_view_as` dispatcher:

1. `view_as_private.page_read(p_proof jsonb,p_contract text,p_args jsonb)` — validate exact contract/arguments, coordinate the two projections; restricted read-role owner; EXECUTE only accepted View-As executor.
2. `lms_read_private.lock_viewer(p_proof jsonb,p_contract text,p_args jsonb)` — postgres-owned protected coordinator, invokes accepted identity/context validation and locks/rechecks relevant target relationships; read-role EXECUTE only; no business writes.
3. `lms_read_private.competition(p_viewer jsonb,p_contract text,p_args jsonb)` — fixed explicit competition/configuration/lineup fields for B pages; owner-only execution.
4. `lms_read_private.people(p_viewer jsonb,p_contract text,p_args jsonb)` — fixed self/managed-roster/minimal-candidate fields; owner-only execution.

Empty search_path, explicit column SELECT grants and internal-role SELECT policies only. No browser/PUBLIC EXECUTE, arbitrary table/column/filter API, business-table ownership, new normal entry RPC, mutation helper or Phase 2 revocation. No new raw-RF grant for page reads. Existing accepted Ask SELF capability remains separate. Existing lifecycle/maintenance/Ask functions and ordinary browser ACLs remain unchanged apart from the single reviewed dispatcher delegation.

This reduces the earlier six-read architecture by omitting the normal read entry and extra shared coordinator; the View-As entry coordinates directly. Normal loaders stay in place. The SAME rendering and pure business/display calculations consume the resulting authorized state; the necessary secure transport adapter is not a second presentation or a rewritten normal business subsystem.

These are exact proposed function responsibilities/counts, not tested executable SQL. Final columns/DTOs must be limited to the selected B consumers and checked against their actual render dependencies. Generate a new scoped migration using the CLI after review; do not reuse the broad draft's identity. No production SQL now.

## 9–10. Replacement and limitations

Change the isolated route allowlist/layout to render the real shared pages inside a validated View-As provider, not rewrite every GET to the summary. Unsupported routes render the SAME shell/navigation plus:

“This page is not currently available in View As mode.”

Persistent VIEWING AS / READ-ONLY banner and Exit remain. Preserve effective-role navigation; a link to C opens the limitation, never an actor-authorized page or automatic escape to the administrator origin. No protected request is made for C. Normal-origin behavior is unchanged. Device/account controls have an explicit unavailable state, not fake target sessions.

Retain handoff, context restoration, revalidation, purge/expiry and source-receipt logic. Extract these from the current mixed mini page. Reuse real AskLwrAssistant rather than keep its duplicate conversation UI. After Player/Captain/Club Pro parity, mutation denial and mobile/accessibility pass, delete mini dashboard/team/match/standings navigation/rendering, duplicate Ask wrapper and snapshot-only presentation consumers/tests. Keep accepted lifecycle/audit/maintenance/security tests and historical reports. Preserve security helpers; any forward retirement of unused snapshot SQL must be separately dependency-checked, never by deleting old migrations.

## 11. Future hardening roadmap item

**HIGH PRIORITY — LMS SECURITY HARDENING: DIRECT DATA API / NORMAL LMS AUTHORIZATION.** Scheduled after View-As parity; no new release number or implementation started. Preserve confirmed unrelated email/RF/rating/private-team exposure, 292 read dependencies, 112 browser writes (82 migrated proposal + 30 retained proposal), admission/removal/lineup enforcement, notification idempotency and privilege tightening. Evidence remains in the existing design/catalog/manifests and local foundation bundle.

The known ordinary Data API exposure is NOT fixed by this release. It is not permission to use that path in View-As: no ordinary authenticated token, raw database client or privileged generic proxy is exposed there. Acceptance claims concern the isolated View-As boundary and shared UI, not system-wide confidentiality remediation.

## 12. Size estimate

Planning estimate, not a commitment or LOC measurement: about 20–35 application files adapted/added, 10–18 test/fixture files, and one scoped read-only migration. Approximately 2,500–5,000 lines of new/adapted transport, bounded SQL and tests; 6,000–12,000 existing page lines may be touched/moved because Captain/Player controllers are monolithic, while their presentation remains shared. No 82-write rewrite. Actual deletion/duplicate LOC will be measured after replacement, not inferred from compressed physical lines in the current mini page. If this estimate grows because a subsystem needs redesign, limit that page and report the precise reason instead of expanding scope.

## 13. Exact local sequence after review

1. Archive deferred foundation code/migrations/tests reproducibly outside active app/deployment/test discovery; preserve all evidence. Retain accepted 0724/0725 work and viewer identity pieces actually used.
2. Freeze bounded B-page contracts/field lists and C route registry; add synthetic target/role/relationship fixtures. No whole-LMS dependency cutover.
3. Implement scoped read-only SQL plus accepted dispatcher delegation; local PostgreSQL apply/replay/ACL/proof/expiry/relationship-race tests. No mutation/corpus/policy work.
4. Separate shared presentation from ordinary Auth/write effects in AppHeader and the priority pages. Ordinary behavior stays the same; isolated branch obtains only accepted View-As read state. No browser Supabase initialization in View-As.
5. Wire actual Player and Captain dashboards, then their roster and Match Setup surfaces, Team Detail/candidates, Teams, standings and safe match views. Preserve combined roles/home-location read scope and no-Auth targets.
6. Wire actual Ask/source viewers and bounded public/static content. C routes remain specific limitations in the real shell.
7. Move normal Member Detail View As User into the existing action group with matching style, real LM/Commissioner/valid-target predicate, unchanged confirmation and isolated handoff. No nested action in View-As.
8. Test normal-regression behavior for every touched component plus paired normal-target/View-As-target content, route scope and desktop/390/320 accessibility. Normal writes remain unchanged and View-As direct/event-code/omit-context writes deny.
9. Once these gates pass, remove obsolete mini presentation and replace presentation-only tests with real-page parity tests; retain all security coverage. Verify no orphan imports/styles/loaders and no second LMS interface.
10. Run deterministic tests, lint, TypeScript, PDF-bundle check, build, diff check, local SQL/security and browser matrices; report actual limitations, file/LOC inventory and read-only migration hash. Zero model calls planned. Stop for production review; do not deploy/apply production SQL.

**Current action: STOP FOR REVIEW of this narrowed plan.** The broad implementation is suspended. No mini deletion or further implementation occurred in this rescope pass.
