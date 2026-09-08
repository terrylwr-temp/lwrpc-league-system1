# LMS-0724 / 0.1.546 — View As User implementation

**CURRENT LMS-0724 — production migration applied once and verified; application deployment/acceptance pending.** Exact approved hash applied, database security and unchanged operational/Auth/AI fingerprints verified. [Production evidence](lms-0724-production-acceptance.md). Do not reapply migration. Earlier blockers below are historical.

**CURRENT LMS-0724 — production migration blocked by automatic approval review.** DNS/HTTPS and three approved production View-As variables are configured. Exact migration rejected before execution twice; no migration or application deployment. [Completed setup and review block](lms-0724-production-review-block.md). Production application remains LMS-0723 / 0.1.545; do not regenerate the configured encryption key on resume.

**CURRENT LMS-0724 production continuation — DNS GATE:** final hash verified; approved view-as.lwrpickleballclub.com attached to lwrpc-admin in Vercel. Bluehost DNS is missing (A view-as → 76.76.21.21). No migration, new environment/key configuration or application deployment yet; LMS-0723 / 0.1.545 remains accepted production. [Preflight, domain action and resume point](lms-0724-production-dns-gate.md).

**CURRENT LMS-0724 / 0.1.546 — replay correction validated locally; STOP BEFORE PRODUCTION.** Exact-state no-op dispatcher replay preserves executor ownership; non-superuser clean apply/two replays/partial recovery/drift/concurrency pass. 666 tests and isolated build pass. [Final correction, hash and validation](lms-0724-replay-ownership-correction.md). No production changes; LMS-0723 / 0.1.545 remains accepted. Earlier blocker/status entries below are historical.

**LMS-0724 correction status — STOP FOR REVIEW:** home_location_id SQL/grant/fixture correction and schema/Club Pro tests pass locally. Non-superuser initial migration succeeds, but replay fails: must be owner of function lms_view_as. No further security correction or production changes. [Full correction and validation report](lms-0724-home-location-correction.md). Earlier preflight and validation statements below are historical.

**Production preflight STOP (2026-09-07):** reviewed View-As SQL references nonexistent `teams.location_id`; production uses `teams.home_location_id`. Fixture mismatch masked the incompatibility. No migration, domain/configuration, deployment or production data mutation attempted. [Evidence and proposed bounded correction](lms-0724-production-preflight-stop.md). LMS-0723 / 0.1.545 remains accepted production; LMS-0724 awaits review.

Local implementation and isolated validation. **Not deployed; no production migration, DNS, Vercel domain, Auth setting, cookie or operational data changes.** LMS-0723 / 0.1.545 remains the accepted production baseline. The dedicated-origin approval supersedes the historical actor-wide-lock proposal.

## Architecture and credentials

Proposed hostname for review: **https://view-as.lwrpickleballclub.com**. Map it to the existing `lwrpc-admin` Next.js deployment after approval. Normal origin: `https://league.lwrpickleballclub.com`. The two hosts share code, not browser Auth storage. Normal Supabase Auth uses origin-local browser storage; the isolated renderer never imports/initializes the normal authentication client, PWA registration or inactivity handler. It never receives an administrator or target access/refresh token.

Member Detail offers View As User to authorized managers. Confirmation explains that the normal tab remains writable. The child first establishes a host-only binding, then sends its challenge digest to its expected opener. The normal tab uses its own normal bearer credential for the privileged start operation. The server validates `getUser(token)`, immutable actor ID, current manager role and unambiguous active target. It stores an encrypted actor access credential (no refresh credential), with AES-256-GCM authenticated to the context ID. It returns only a random one-use handoff code. Exact-origin/expected-window `postMessage` transfers that code, never a normal access token or URL credential. Exchange is limited to 60 seconds and is bound to actor, target and browser binding. Exchange consumes the code atomically and appends `VIEW_AS_STARTED`.

The context expires at the earlier of 30 minutes and the verified actor token expiry. A new start is required to extend it. Each request uses online actor authentication and current database authorization; no direct `auth.sessions` reads or target authentication exist. Target role changes take effect on subsequent reads; inactive, missing-role or ambiguous targets are denied. A target with a member-linked role but no Auth account can be previewed with an explicit permission-preview notice.

Cookie: `__Host-lwr-view-binding`; `Path=/; Secure; HttpOnly; SameSite=Strict`; **no Domain attribute**. A 256-bit tab-local selector in sessionStorage is necessary to distinguish simultaneous isolated tabs. Neither selector nor cookie alone authorizes a read. Both are hashed in context lookup; neither is a Supabase credential. Exit revokes the server context and removes the tab selector. The shared host-only browser binding is not itself an authorization and remains so exiting one preview does not invalidate sibling previews. Context ciphertext is erased on termination/expiry maintenance. No selectors or handoff codes go in URLs, logs or model inputs.

## Origin enforcement

The proxy routes the configured isolated host to the dedicated renderer and allows only bootstrap, exchange and the bounded read dispatcher. Other APIs and non-read page requests are rejected before ordinary authentication/event-code processing. Root layout independently selects the isolated renderer. Normal routes also invoke the shared guard before their existing handler logic. Requests carrying a View-As marker/binding or originating from the isolated host cannot become ordinary requests by omitting other context.

Next.js can normalize `request.url` to its server hostname. Host recognition therefore uses the HTTP Host authority, never `X-Forwarded-Host`. Internal rewrites retain Next's original URL authority so they do not become self-proxying external rewrites. This boundary has a permanent regression test.

The normal tab keeps its ordinary session and authorized operations. The isolated tab cannot acquire it by stripping a header. An independent external client possessing separate legitimate administrator/event credentials is outside this isolation claim; no such credential is supplied by View As User.

Security headers on the isolated host: private/no-store, nosniff, no-referrer, frame-ancestors none, X-Frame-Options DENY, disabled camera/microphone/geolocation. CSP restricts resources and connections to self, with per-request script nonce, no third-party scripts, no Supabase browser connection and no object embedding. Blob frames support fetched source PDFs. Development alone permits unsafe-eval for Next's development runtime. Production does not. No credentialed CORS permission or wildcard CORS is added. POST operations require the exact isolated Origin and reject cross-site Fetch Metadata and any bearer Authorization header. Privileged initiation requires the exact normal Origin plus online authentication.

## Target-effective reads and screens

SQL computes target scope before selecting fields. It does not fetch Commissioner data and filter it in React. Supported preview screens are the dashboard, active Teams & Rosters, published Matches, relevant Standings, and Ask LWR. Captain/Co-Captain/team Club Pro relationships and dashboard location Club Pro assignments constrain dashboard readers. Live lookups retain the existing narrower Live relationship rules rather than silently changing LMS-0723 behavior. Manager/Commissioner targets receive their own authorized scope, never a union with the actor.

This is an adapted read-only preview, not a pixel-identical copy of every legacy page. Manager administration/AI workflows, historical/inactive editing screens, exports, event modules and other unadapted screens require Exit. Snapshot limits are displayed: 100 teams, 500 roster names, 100 published matches, 200 standings rows. No roster emails or member records are fetched wholesale. There are no edit/send/import/upload/activate/score/feedback controls in this renderer. Direct API calls remain denied regardless of button visibility.

The banner distinguishes actor and effective roles, remains sticky, includes READ ONLY and an accessible 44px Exit target, and uses mobile safe-area padding. Refresh/focus/pageshow revalidate; expired/denied contexts clear rendered data. Exit returns to the originating normal Member Detail without signing either person out. No nested start endpoint is exposed on the isolated host.

## Ask LWR, sources and telemetry

The six deterministic Live capabilities run against the trusted target member, retaining real actor attribution for rate limits and audit. Explicit other-person requests retain their subject and may not fall back to SELF. A Player preview cannot use the administrator's relationship/role to read another person's contact data. No Live lookup invokes an answer model or embedding model.

Ordinary document questions reuse existing conversation/retrieval/selection/generation and authority behavior. Conversation/source receipts bind to the context identity; Live receipts additionally bind to the real actor session and context. The dispatcher revalidates after generation before returning. PDF/Approved Answer sources resolve server-side from signed receipts; storage credentials/URLs are not returned. Feedback receipts are removed and feedback endpoints are blocked. No managed threshold, corpus, embedding, document, Approved Answer data, HMAC configuration or ordinary Stage 7 semantics change.

View-As outcomes go only to `view_as_private.diagnostic_outcomes`: request/context reference, family, kind, bounded timing and mode. No raw question, answer, name, email, rating, roster or conversation snapshot is persisted there. Document diagnostics also omit text. No `capture_ai_quality`, ordinary answer-feedback or Live-feedback write is made by this dispatcher. Context initiation is bounded to 5/minute and 30/hour per actor; diagnostic questions share 10/minute and 100/day, with the existing tighter Live contact budget.

## Migration and effective privileges

Migration: `lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql` — **local only**.

Private tables: contexts, append-only audit events, separated diagnostic outcomes and attempt budgets. RLS is enabled. Explicit revokes remove PUBLIC/anon/authenticated/service_role default table/sequence privileges. Browser roles have no RPC execution. `service_role` has only dispatcher/maintenance EXECUTE for these objects, not direct private-table access.

The dispatcher has an empty search_path and a dedicated NOLOGIN/NOINHERIT executor. Only the migration owner can SET that role for ownership/maintenance; runtime/browser roles cannot assume it. Existing-object ACL additions are limited to this executor's explicit read columns and key-column UPDATE privilege needed by PostgreSQL row-share locking. The dispatcher contains no operational UPDATE/INSERT/DELETE path. Dedicated SELECT policies permit this non-login executor to read under RLS; ordinary browser policies/default privileges are not rewritten. CREATE on public is revoked after function ownership transfer. An unexpected existing executor role/membership state raises an error.

Runtime audit/diagnostic rows cannot be updated/deleted. Sensitive reads fail closed when audit insertion fails. Lifecycle transitions serialize on the context row. A separate protected maintenance function expires abandoned contexts, erases credentials, and applies the documented 30-day diagnostic / 90-day audit retention, without touching operational/Auth data. Schedule maintenance during approved production setup; no cron or production configuration was created here. Retention uses observed end timestamps and records expiration reason rather than claiming the browser closed at that time.

The existing ordinary Live function is unchanged. The private View-As evaluator preserves its six-capability query logic with separate effective-member resolution, rate-limit storage and audit attribution. Changes to either evaluator require the paired regression suite to prevent drift.

## Event-code and legacy mutation coverage

All current API route handlers have the guard; an executable route inventory catches new unguarded handlers, including non-async wrapper exports. Ordinary cron/system authentication remains unchanged on the normal origin.

| Endpoint family | Existing authority / mutation | View-As protection |
| --- | --- | --- |
| tournaments/action, admin, sms | event/admin credentials; event, schedule, score, player and send actions | Host rejects before handler; handler guard before legacy authority |
| round-robin/action, admin, player | event/role paths; roster, score, schedule and administration | Same host and handler boundary |
| pbcc/reminders, match-setup-reminders | cron/admin reminder sends, including GET | View host/markers denied; legitimate normal-host cron preserved |
| members, roles, teams, lineups, scores, season/reset, settings, notification/send APIs | existing normal application authority and mutations | Same guard before original handler |
| AI management/review/Approved Answers and feedback | existing manager/player authorization and mutations | All unavailable through the isolated host |

The isolated runtime has no credential for direct Supabase Auth/Storage/Data API mutation, and CSP disallows that browser connection. No ordinary session, RLS policy or operational write is frozen in Tab A.

## Validation evidence

- `npm test`: **664 passed**, including the existing LMS-0723 and LMS-0722 suites and new View-As tests.
- Isolated PostgreSQL **17.11** independent connections: one-use exchange race produces one winner/one denial; Exit waits for an admitted read; later reads deny.
- Effective grants/operations tested with production-like broad defaults, RLS enabled on protected fixture tables, browser RPC/table denial, service-role direct-table denial, replay/idempotency, role/relationship loss, no-Auth target, six Live projections, actor/effective/subject audit, privacy and audit failure.
- Nonincremental TypeScript check passed. PDF server-bundle verification passed.
- Normal build compiled successfully, then encountered the established `.next/cache/.tsbuildinfo` EPERM lock. Isolated clean production build passed, including Proxy.
- Lint and final browser/diff results are recorded in the completion update below.

Local artifacts/logs are under `.local-validation/`, excluded from Git. `scripts/lms0724-local-verification.mjs` uses a copied app and synthetic loopback-only Auth/database fixture; it does not load production environment files. Start the fixture from lwrpc-admin. Normal local origin is `http://localhost:3074`, isolated local origin is `http://127.0.0.1:3074`; different hosts avoid cookies crossing merely because ports differ. Production origin validation still requires HTTPS. The independent PostgreSQL harness starts/stops a temporary loopback server and uses no production connection.

## Controlled production sequence — approval required

1. Review this implementation, supported-screen limits, migration, hostname and cookie policy. Keep production on accepted LMS-0723 until separately approved.
2. Read-only preflight: correct Supabase/Vercel project; latest legitimate operational baseline; current table/column/RLS/ACL and function inventory; no unexpected `view_as_private`, function or executor-role collision. Distinguish legitimate ongoing registrations from deployment/test mutation.
3. On an isolated production-shaped database, run migration/replay/security and independent-session tests as the actual migration privilege class. Check executor ownership/SET ROLE support and preserve existing-role ACLs. Do not weaken production permissions to bypass a failed preflight.
4. After explicit production authorization, apply the reviewed migration once. Verify private RLS/revokes, executor-only column/policy additions, immutable audit, RPC ACLs and unchanged normal Live/feedback functions. No operational data repair is part of this migration.
5. Configure server-only `LMS_ORIGIN=https://league.lwrpickleballclub.com`, `VIEW_AS_ORIGIN=https://view-as.lwrpickleballclub.com`, and a new dedicated 32-byte base64 `VIEW_AS_ENCRYPTION_KEY` through approved secret management. No NEXT_PUBLIC secret; do not reuse or change existing AI HMAC keys. Configure a protected periodic `lms_view_as_maintenance()` execution. Confirm no parent-domain Auth cookie crosses hosts.
6. Add/review the isolated hostname and DNS mapping on the existing Vercel project, with TLS. Do not enable it against an old deployment without the host boundary. Deploy the reviewed LMS-0724 commit through the normal pipeline. Verify exact deployed Host/protocol behavior, CSP nonce, CORS, no-referrer, frame policy and cache bypass on the real hosting platform.
7. Run controlled normal Tab A / isolated Tab B tests: privileged initiation, no-Auth/inactive/missing-role cases, all roles, SELF, permitted relationship reads, unrelated-person denial, refresh/back/forward, explicit Exit, expiry, actor role loss, source viewers and separated diagnostics. Use legitimate authorized relationships only; do not manufacture production rosters/matches or expose private data in reports.
8. Hard security gates: omitted context, raw selector/cookie replay, forged actor/target, wrong browser binding, handoff replay/expiry, direct event-code/admin/API/RPC/Storage/Auth attempt, no writable token in the isolated browser, no normal player telemetry/feedback pollution, no operational mutation from View-As. Verify the ordinary tab's authorized write through an owner-approved harmless operation, not an invented production mutation.
9. Verify desktop/390/320, keyboard/focus, source PDFs/Approved Answer exact revisions, measured hosting latency and key/maintenance configuration. Local synthetic timing is not production latency. Stop on any disclosure, write bypass, privilege drift or unexpected operational mutation. Obtain explicit production acceptance; do not infer it from local tests.

## Member Detail entry-point clarification and final local checks

The only Phase 1 entry is Members → Member Detail → View As User. No sidebar, global menu/search, dashboard, Match Operations or Administration entry was added. The isolated target renderer has no nested entry. Visibility comes from server verification of the real authenticated actor, restricted to Commissioner/League Manager, with Member Detail's existing role gate as an additional UX check.

Clicking first revalidates the actor and selected target through a read-only server preflight. Only then does confirmation show the authoritative target name. No context is created by preflight. After confirmation, the isolated tab initializes its browser binding; the server revalidates actor/target again before creating the bounded context and exchanging the one-use handoff. Target content is unavailable until exchange succeeds. The original administrator session is not changed. This ordering retains the approved browser-binding protection.

Regression coverage checks all lower roles, missing/inactive targets, no preflight context insertion, revalidation at creation, sole component entry placement, and absence of nested entry. Final suite: 664 passed. Lint: zero errors, six pre-existing warnings. Nonincremental TypeScript and PDF bundle checks passed. PostgreSQL 17.11 independent-connection tests passed again after preflight was added (one exchange winner, one denied replay; Exit/read serialization).

Earlier local synthetic browser checks verified host isolation, no target/admin Auth token in the isolated browser, severed opener, allowed SELF rating and denied unrelated contact, blocked omitted-context mutation routes, a still-writable synthetic administrator tab, refresh persistence, and 390/320-pixel layouts without horizontal overflow. Five loopback validation samples measured 7.9–13.0 ms (median 8.9 ms), not production latency. The final pre-confirmation change has automated/database coverage; final real-host keyboard/Exit/source-viewer acceptance remains in the controlled production checklist above. No production operation was performed.

## Exact working-tree files

- `.gitignore`
- `docs/lms-0724-implementation-report.md`
- `docs/lms-0724-isolated-tab-security-boundary.md`
- `docs/lms-0724-view-as-user-design.md`
- `docs/project-roadmap.md`
- `lwrpc-admin/app/api/account-identity/route.js`
- `lwrpc-admin/app/api/admin/delete-member/route.js`
- `lwrpc-admin/app/api/admin/member-directory/route.js`
- `lwrpc-admin/app/api/admin/member-last-login/route.js`
- `lwrpc-admin/app/api/ai-assistant/answer/route.js`
- `lwrpc-admin/app/api/ai-assistant/approved-answers/route.js`
- `lwrpc-admin/app/api/ai-assistant/capture-health/route.js`
- `lwrpc-admin/app/api/ai-assistant/documents/route.js`
- `lwrpc-admin/app/api/ai-assistant/live-review/route.js`
- `lwrpc-admin/app/api/ai-assistant/retrieval/route.js`
- `lwrpc-admin/app/api/ai-assistant/review/route.js`
- `lwrpc-admin/app/api/ai-insights/route.js`
- `lwrpc-admin/app/api/app-notifications/public-key/route.js`
- `lwrpc-admin/app/api/app-notifications/subscribe/route.js`
- `lwrpc-admin/app/api/approved-answer-viewer/route.js`
- `lwrpc-admin/app/api/ask-lwr/feedback/route.js`
- `lwrpc-admin/app/api/ask-lwr/route.js`
- `lwrpc-admin/app/api/brevo-diagnostics/route.js`
- `lwrpc-admin/app/api/league-communications/route.js`
- `lwrpc-admin/app/api/master-reset/route.js`
- `lwrpc-admin/app/api/match-lineups/route.js`
- `lwrpc-admin/app/api/match-setup-reminders/route.js`
- `lwrpc-admin/app/api/member-password-reset-check/route.js`
- `lwrpc-admin/app/api/notification-template-history/route.js`
- `lwrpc-admin/app/api/notification-templates/route.js`
- `lwrpc-admin/app/api/notifications/route.js`
- `lwrpc-admin/app/api/official-document-viewer/pdf/route.js`
- `lwrpc-admin/app/api/official-document-viewer/route.js`
- `lwrpc-admin/app/api/pbcc/reminders/route.js`
- `lwrpc-admin/app/api/round-robin/action/route.js`
- `lwrpc-admin/app/api/round-robin/admin/route.js`
- `lwrpc-admin/app/api/round-robin/player/route.js`
- `lwrpc-admin/app/api/score-notification/route.js`
- `lwrpc-admin/app/api/season-reset/route.js`
- `lwrpc-admin/app/api/season-rollover/route.js`
- `lwrpc-admin/app/api/system-settings/route.js`
- `lwrpc-admin/app/api/teams/delete/route.js`
- `lwrpc-admin/app/api/tournaments/action/route.js`
- `lwrpc-admin/app/api/tournaments/admin/route.js`
- `lwrpc-admin/app/api/tournaments/sms/route.js`
- `lwrpc-admin/app/api/user-last-logins/route.js`
- `lwrpc-admin/app/api/view-as/bootstrap/route.js`
- `lwrpc-admin/app/api/view-as/exchange/route.js`
- `lwrpc-admin/app/api/view-as/read/route.js`
- `lwrpc-admin/app/api/view-as/start/route.js`
- `lwrpc-admin/app/components/ViewAsStartButton.js`
- `lwrpc-admin/app/layout.tsx`
- `lwrpc-admin/app/lib/version.js`
- `lwrpc-admin/app/lib/viewAsBoundary.js`
- `lwrpc-admin/app/lib/viewAsCrypto.js`
- `lwrpc-admin/app/lib/viewAsServer.js`
- `lwrpc-admin/app/members/[id]/page.js`
- `lwrpc-admin/app/view-as/page.js`
- `lwrpc-admin/package-lock.json`
- `lwrpc-admin/package.json`
- `lwrpc-admin/proxy.js`
- `lwrpc-admin/scripts/lms0724-concurrency-tests.mjs`
- `lwrpc-admin/scripts/lms0724-isolated-build.mjs`
- `lwrpc-admin/scripts/lms0724-local-verification.mjs`
- `lwrpc-admin/supabase/migrations/20260907201448_lms0724_view_as.sql`
- `lwrpc-admin/test/helpers/viewAsFixture.mjs`
- `lwrpc-admin/test/viewAsBoundary.test.mjs`
- `lwrpc-admin/test/viewAsDatabase.test.mjs`

Final build result: normal build compiled successfully and hit the known .next/cache/.tsbuildinfo EPERM; the final isolated clean production build passed. git diff --check passed. Production migration, host setup, deployment and acceptance remain pending review.
