# LMS-0724 / 0.1.546 — View As User: architecture and security design

**Current decision:** dedicated-origin implementation approved and implemented locally in LMS-0724 / 0.1.546. The historical stop and actor-wide-lock alternatives below are superseded. See [implementation, actual boundaries, validation and production gates](lms-0724-implementation-report.md). No production deployment or migration.


**Subsequent owner implementation decision:** isolated tabs and protection of all independent event-code mutations are approved; the actor-wide recommendation below is superseded. Implementation preflight identified the context-omission boundary. See [dedicated-origin resolution and stop report](lms-0724-isolated-tab-security-boundary.md). Original design analysis is retained as history, not authority to implement an actor-wide lock.

2026-09-07. **Design only; not approved for implementation by this report.** LMS-0723 / 0.1.545 remains production accepted and is the current application version. No application code, SQL, production data, Auth account, deployment or version was changed during this diagnosis. The earlier Teams By Division toggle remains a separate undeployed local change; its location-data diagnosis is not bundled into this feature.

The original attachment ended mid-list in section 66. The continuation through section 121 was subsequently supplied and is incorporated here; all 121 requirements govern this completed report.

## 1. Recommendation and approval boundaries

Implement a server-authorized **View As User** read context, with distinct real actor and effective member, not a target Supabase session. Start from Member Detail with confirmation. Use the existing dashboard/rendering components only after their data access has moved behind target-effective server readers. All unconverted pages must fail closed under View As User.

This is not safely implementable as a menu/button change or an extra member-ID parameter on current queries. The repository has direct browser Supabase reads/writes, several independent server authorization paths, and separate event-code modules. The following decisions require approval before implementation:

1. **Phase 1 uses a server-enforced actor-wide LMS read-only lock**, affecting the initiating administrator's other LMS tabs/sessions too. This is deliberately stronger than a tab flag. Every affected tab must announce it; no silently writable “normal Commissioner” tab. Independent writable/viewing tabs are deferred unless a separate-origin architecture is explicitly chosen.
2. **Database protections are necessary**, not only a central Next.js route guard. Direct Data API access must be denied for a locked actor; approved target-effective reads go through protected server readers. Existing ordinary-mode policies must otherwise retain their behavior.
3. **Event-code modules require a boundary decision.** Their standalone requests do not necessarily identify the real LMS administrator. Phase 1 should make these modules unavailable inside View As User. To promise that all same-application direct write endpoints are blocked, their mutation requests also need an attributable application session, or these modules must move behind a separately isolated origin/access boundary. Hiding links is insufficient. This is a release gate, not a claim that the current code already provides this protection.
4. Per continuation section 106, allow either authorized manager role to view privileged targets read-only. This is an explicit delegated support-read capability, not proof that read-only access carries no disclosure risk. Audit privileged-target starts, show the effective role clearly and confine reads to the target's allowed fields. All manager AI workflow pages require Exit under section 80 regardless of target role. No target or actor write authority is conferred by this delegation.

If approval instead requires writable Tab A and View-As Tab B in Phase 1, revisit the security boundary before writing code. A same-origin header/sessionStorage design cannot distinguish deliberately omitted headers from normal requests using the same real-actor credential.

## 2. Evidence from the current repository

| Current file / path | Observed behavior and implication |
| --- | --- |
| app/lib/auth.js | Shared browser Supabase client, local session retrieval, email-based member lookup, fallback user_roles lookup and default player role. requireRole redirects in the browser. These helpers are not sufficient as the View-As server authorization boundary. |
| app/lib/permissions.js | Ordered roles: player, captain, club_pro, league_manager, commissioner. No separate co_captain role. Co-Captain is represented through team relationships. Preserve role hierarchy plus relationship permissions; do not invent role switching. |
| app/lib/serverSupabase.js | authorizeAdminRequest validates getUser but resolves roles by email. authenticateRequestIdentity is the newer bounded getUser(token) → immutable user ID path with verified-session receipt binding. Reuse the latter for View-As authentication; do not base privileged View-As initiation on email equivalence. |
| app/lib/adminNavigation.js | Members/ratings/AI tools require league_manager; Locations and some setup pages require commissioner. Navigation is role-filtered, but navigation alone does not authorize data. |
| app/player-dashboard/page.js | Browser queries and member-specific localStorage preferences. View-As data/cache/preference namespaces must be isolated from both normal actor and real target sessions. |
| app/captain-dashboard/page.js | Team Captain/Co-Captain/Club Pro relationships and location Club Pro assignments contribute to dashboard scope. Server readers must reproduce those rules rather than use the actor's manager visibility. |
| app/teams/page.js and teams/[id]/page.js | Captain-level route gates, direct reads and writes; menu visibility is narrower than some route gates. Do not infer intended data scope solely from which links are shown. |
| app/lib/liveLmsService.js | ai_live_lookup receives principal.user.id as p_actor. SELF, rate limits, audit and feedback share that identity today. A second trusted effective member is required, without substituting the target into p_actor. |
| supabase/migrations/20260907131012_lms0723_server_session_validation.sql | Current session-redesign lookup maps Auth actor to active member/role, authorizes relationships and returns bounded projections; it also records attempts/audit. The obsolete initial auth.sessions design must not return. Its old file comment is historical; the accepted production report records application. |
| app/lib/liveLmsReceipts.js | Receipts bind real user, session binding, purpose and expiry. View-As receipts additionally need mode/context/effective-member binding and current-context validation. |
| app/api/ask-lwr/route.js; aiQualityCapture.js | POST may perform a read/answer but records quality outcomes. HTTP verb alone is not a reliable side-effect classification. Ordinary capture must not receive View-As tests. |
| app/api/ai-assistant/approved-answers/route.js | GET and POST are exported aliases of a shared handler, so a scan of function declarations alone misses them. Preflight and workflow operations need semantic classification. |
| app/api/pbcc/reminders/route.js | GET can send reminders under cron authorization. “GET means safe” is false. Genuine scheduled jobs are independent of View-As, but no browser may invoke them as a side door. |
| app/api/tournaments/*; api/round-robin/* | Independent event-code/action access, not uniformly based on authorizeAdminRequest. These are explicit guard-coverage prerequisites. |
| app/lib/profilePhotos.js; reset-password/page.js | Storage writes and direct Auth updateUser occur outside normal Next.js mutation routes. LMS UI must gate them before invocation; storage requires database policy protection. |
| app/layout.tsx; next.config.ts | No global View-As context/banner. /tourney and /pbcc rewrite to tournament/round-robin pages; guards must cover aliases as well as destinations. |

This pass inspected local implementation and previously accepted schema/production reports, not a fresh production schema dump or live-data replay. No target/private member data was collected. Implementation preflight must re-inventory effective ACLs, functions, storage policies and deployed code read-only before final migration review.

## 3. Identity model and target eligibility

Keep three values distinct: authenticated real actor Auth ID; viewed member ID; effective authorization context derived from that member. Optional linked target Auth ID is metadata for fidelity checks, never a credential and never the authenticated principal. Rate limits, billing, start/end audit and diagnostic attribution use the real actor.

Resolve the real actor through verified immutable Auth ID and current authoritative role/member links. Require active membership and an unambiguous Commissioner or League Manager authorization. Conflicts, missing links or inactive actors fail closed; do not run account repair/provisioning as a side effect of viewing. Re-check in each protected database read/write-guard transaction. Do not trust client roles, member IDs, teams, session metadata or user-editable JWT metadata.

| Target | Proposed behavior |
| --- | --- |
| Active member with a unique linked Auth/role identity | Allow under the expressly delegated View-As capability; current target permissions and relationships govern. |
| Active member without Auth account, but an explicit member-linked role and sufficient relationship state | Allow **LMS permission preview**. Explain that sign-in/account-state behavior is not being reproduced; no account creation. Live SELF can use the trusted member identity after the evaluator is separated from Auth lookup. |
| Member without a role, ambiguous duplicate identity or contradictory links | Refuse: “This member does not yet have enough LMS account information to simulate their signed-in experience.” Do not use the legacy client default-player fallback to manufacture authority. |
| Player | Own intended dashboard, team/schedule/standings visibility and approved Live SELF. Other-person contact remains denied. |
| Captain / Co-Captain | Existing captain capability plus actual Captain/co_captain_member_id/co_captain_2_member_id relationships; no ownership inferred from community name. Missing qualifying role is a diagnostic finding, not permission to create it. |
| Club Pro | Reflect current UI/Live capability rules separately. Current Captain Dashboard includes location assignments that are not simply identical to every Live lookup branch; do not silently “fix” that difference in View-As. |
| League Manager | Read-only manager experience, including authorized manager pages after their adapters are safe. |
| Commissioner | Commissioner or League Manager may preview under the expressly requested delegated support-read capability. Never union actor and target privileges; manager AI workflows still require Exit. |
| Inactive target | Refuse initiation; if deactivated mid-session, revoke context and clear rendered data on next validation. A separate inactive-account diagnostic panel can be future work. |
| Self | Allow as an explicit read-only diagnostic with the same banner, audit, expiry and write lock. |

Compute effective roles/capabilities from current stored rows and team/location relationships. Display combined capabilities such as Captain and Player, without asking the manager to select a fake lower role. The current single highest-role navigation convention stays consistent; relationship capabilities remain separate. Do not assume all 107 historically deferred no-role accounts are still unchanged or provision them through this feature. The read intersection is: real actor has current View-As authority AND effective user has the requested read capability AND Phase 1 allows that capability. It is not a union, and section 106 explicitly permits privileged-target read previews.

## 4. Context, start, navigation, exit and expiry

Recommend an opaque 256-bit random context handle in a Secure, HttpOnly, SameSite=Strict, host-only session cookie (no Domain; Path=/; __Host- prefix). Store only its digest server-side alongside actor ID, validated session binding, target member, started_at, absolute expires_at, mode/generation and termination state. It is neither a Supabase token nor a target identifier. Never put it in URLs, localStorage, sessionStorage, logs or model inputs. No signing secret is required for a database-backed random handle; hash lookup plus real-actor binding provides validation and revocation. Use platform cryptographic randomness, not UUID secrecy alone.

Start flow: real actor enters Member Detail → confirms “View the LMS as …? You will remain signed in as yourself. View As User is read-only and will put your other LMS sessions into read-only mode.” → exact-Origin/CSRF-protected POST → online actor validation → current actor/target authorization → transaction establishes actor lock, context and VIEW_AS_STARTED → server returns safe banner/effective-navigation DTO → clear previous page data → navigate to effective default dashboard. No nested contexts; atomic unique-active-actor constraint rejects simultaneous starts. Switch target only after Exit.

Choose **30 minutes absolute maximum**, no silent renewal. Refresh/internal navigation validates and retains the context within that limit; back/forward cannot restore stale authorized data. Use private/no-store responses, actor+context+generation cache keys, no shared CDN/RSC cache, no service-worker caching of protected responses, and invalidate prefetched pages/conversation state on enter/exit. Revalidate on pageshow (including bfcache), focus and navigation before revealing protected content. Never render the normal admin page while the context request is pending.

All tabs poll/revalidate mode and receive a BroadcastChannel notification for immediate UX updates; that channel is advisory only. A tab without the cookie still cannot bypass the actor lock. Other devices/sessions for the same actor show “View As User is active in another session; exit it to make changes.” They must not automatically gain the target's context. The originating session displays the target; others are locked until an authenticated explicit exit/recovery operation. This scope must be communicated before start.

Exit is one click, no confirmation, authenticated and CSRF-protected. Transaction ends context/audit and releases the lock; clear cookie, purge subject data/receipts, announce exit, restore actor navigation and a safe return route. It never logs the actor or target out. If exit persistence fails, keep the lock and show retry; do not claim exit succeeded. Role loss still permits ending one's own context but grants no target reads.

Expiry revokes target reads immediately. On the next safe status/navigation request, terminate expired context, append an end event with reason=expired and restore normal navigation with “View As User session expired.” Do not turn the *same* pending write into an admin write after expiry. Writes from an expired/unknown mode generation must be rejected and never automatically replayed. A server sweep records expiration even if the browser closed; distinguish effective end time (expiry) from observed sweep time. Closing a browser does not guarantee an unload request or cookie deletion (session restoration exists), so explicit expiry and server state are authoritative.

## 5. Central request boundary and race-safe read-only enforcement

Every LMS request is classified as context lifecycle, target-effective read, business mutation, authorized system job, or unsupported. Default-deny unclassified operations while View-As is active. Implement one shared server guard and endpoint registry, but do not mistake the registry for database protection. Reads expressed as POST (Ask LWR, source preparation) receive narrow explicit permission. GET endpoints with side effects do not.

For browser-authenticated direct database requests, apply a **restrictive** actor-lock predicate to exposed LMS table/view reads and mutations, plus storage policies. While locked, direct broad reads are denied as well as writes; otherwise a forgotten page can still fetch Commissioner data. Preserve ordinary-mode policies and grants, and do not add broad authenticated access. Audit permissive-policy OR behavior, security-definer RPCs, views that bypass RLS, functions called via GET, updatable views, realtime subscriptions and storage signed-upload paths. An RLS check on tables is insufficient for a privileged function: every exposed bypass-capable RPC needs the same admission guard or narrower callable surface.

Server readers use narrowly reviewed functions/projections after actor AND effective-target authorization. Server service-role credentials are a transport privilege, not a policy decision. Do not pass a client-supplied effective ID to a service-role query. All service-role business mutation entry points must receive verified real-actor context and reject the actor lock. Scheduled/system work uses a separately authenticated system principal and is not frozen by one administrator's mode; no browser-selectable “system” flag.

Prevent start/write races: checking a flag then later issuing an update is insufficient. Start and actor-attributed mutations need the same bounded transaction/admission protocol. A mutation admitted before Start must finish (or fail) before Start succeeds; mutations admitted afterward must fail. Existing multi-request writes need transaction wrappers or durable bounded operation leases. Do not hold a database transaction across email/network delivery; reserve an attributable operation, make start wait/fail while it is in flight, and revalidate before irreversible dispatch. Timeout/stale lease recovery must be designed and tested, not silently bypassed. Pending forms and retries carry mode generation; reject stale requests after Exit. No bulk operational table lock and no freezing other owners/captains.

Allowed persistence exceptions are only View-As lifecycle/audit, diagnostic rate limits, and separately classified diagnostic outcomes. These writes are attributed to the real actor and cannot change LMS business state. Do not run normal login last-seen updates, identity repair, read-receipt notifications, automatic profile fixes or player feedback while presenting the target experience.

Rejected mutations return: “This action is unavailable while using View As User. Exit View As User to make changes.” Disable/hide buttons too, but test direct calls and omitted/tampered context separately.

**Limits to state truthfully:** the application cannot make the real administrator's already-issued Supabase credential cease to be a credential merely by setting a cookie. Guarding all LMS database/API paths is required. Direct Supabase Auth account-management calls are provider operations outside LMS table RLS; View-As must never issue them or touch the target Auth account. Do not promise that this feature revokes an administrator's ability to manually use their own external credentials. If the requirement includes blocking arbitrary direct provider Auth operations, that is an additional Auth architecture requirement, not something solved by this design. Likewise independently authenticated event-code requests cannot be identified as a particular manager when that identity is omitted.

## 6. Target-effective read architecture

Create a server capability resolver returning explicit member, role set/highest role, permitted page IDs, owned/assigned team IDs, relevant season/division scope and field-level capabilities. Resolve current rows each request, not a signed snapshot of yesterday's roles. Check actor's delegated View-As authority and target current state transactionally with the read. Rate-limit per actor/context. Database unavailable or ambiguous authorization → no data, never fallback to Commissioner or default Player.

Build bounded readers for dashboard summary, authorized teams/rosters, schedule/match detail, standings, self-profile/rating and official documents. Queries must constrain rows and select explicit fields before results reach the browser. Do not fetch all member emails and filter them in React. Club Pro, co-captain, inactive league/team, historical-season and published-match rules need parity tests against current intended application behavior. When UI and Live rules differ, preserve and disclose the difference until a separate correction is approved.

Adopt these readers for the same supported ordinary user paths where practical so simulation does not drift into a second implementation. Do not globally replace legacy authentication or infer roles to make a preview work. Unsupported screens display a clear exit-required page; do not show an empty screen that falsely implies the target has no data. Read-only versions of mutation-capable screens preserve useful read information, with actions unavailable.

## 7. Page inventory and Phase 1 policy

All paths below are under app/. Gate both initial rendering/data and direct API access. “Adapt” means not safe to mount the current browser-query implementation unchanged.

| Route(s) | Current surface | View-As treatment |
| --- | --- | --- |
| / (AdminDashboardClient) | Manager overview, analytics, profile/settings/message actions | Effective manager+ only; adapted reads, all actions off. Player/captain goes to own default dashboard. |
| /player-dashboard | Own member, teams, matches, ratings, guides, Ask LWR | Core supported adapted reader; self-profile edit/photo/password/notification mutations off. |
| /captain-dashboard | Assigned teams, lineup/roster/scoring controls, Club Pro relationships | Core supported read-only dashboard; ownership and active scope enforced server-side. |
| /members, /members/[id], /member-import | Manager directory/detail/import and edits | Effective manager+ read-only directory/detail when adapted; import unavailable. No nested View-As action. |
| /ratings | Manager ratings and edits/import/export | Effective manager+ adapted read; mutation/export actions require Exit unless a target-authorized read export is separately reviewed. |
| /seasons, /leagues, /divisions, /divisions/[id] | Structure and configuration mutations | Effective manager+ read-only adapted views; all changes off. |
| /locations | Commissioner courts/location management | Effective Commissioner only, adapted read; no assignments or transfers. |
| /teams, /teams/[id] (Manage Roster) | Captain-level routes, manager operations, roster mutation | Target team/relationship scope, not actor scope; no add/remove/copy/create/assign. |
| /scheduling, /schedule-editor | Manager generation/publishing/reset | Read-only authorized schedule summary only after adaptation; otherwise exit-required. No generation/reset/publish. |
| /matches, /matches/[id], /score-entry/[id], /scoring | Match views, lineup/score edits, verification/notifications | Assigned/published target-effective match reads; mutation endpoints off. Manager scoring tools require effective manager. |
| /standings, /live-match/[id] | Standings/match displays | Target-authorized published views; no hidden contacts/admin fields. |
| /ask-lwr and global Ask LWR panel | Document and deterministic Live answers | Core supported; separate provenance, no feedback, mode-bound conversation. |
| /ai-assistant, /ai-assistant/console, /ai-assistant/review | Source administration, manager testing/review/Approved Answers tab | Exit-required for every target under continuation section 80. Ask LWR itself remains available; do not use the management console as a bypass. |
| /approved-answer/[citation], /official-document/[citation] | Authenticated source viewers | Permit only effective-source authorization, exact revision and context-bound viewer access. |
| /help/[role], /print | Guides and printing | Only effective role/target-authorized material; no actor-only print payload. |
| /system-setup, /email-options, /score-sheets | Commissioner settings/templates | Effective Commissioner read-only after adaptation; sends/uploads/settings changes off. |
| /league-communications, /ai-insights | Manager communications/analysis with sensitive inputs and possible side effects | Exit-required in initial scope unless a separately reviewed read adapter exists; do not send target live data to an AI model. |
| /tournaments and descendants; /round-robin and descendants; /tourney/*; /pbcc/* | Event-code modules, independent admin/player/actions/SMS | Unsupported in Phase 1 context. Resolve attributable-write boundary before claiming global direct-request safety. Public displays may later be allowlisted if side-effect-free. |
| /design-preview and role previews | Demonstration layouts | Unavailable in View-As; do not confuse mock roles with effective identity. |
| /login, /reset-password | Real authentication/account recovery | Never simulate target login/password; Exit before LMS account actions. Logout ends/revokes View-As; target session untouched. |

Downloads/export review includes profile-photo Storage access, roster/contact CSVs, ratings/member exports, schedules/score sheets, print pages, public guide URLs and signed document viewers. Public information remains public, but no private export may be authorized using actor privilege in a target page. Issue private download responses through the target-effective server boundary with no-store and safe filenames. Do not embed View-As IDs/tokens in links or Referer. For new View-As source navigation, keep authorization in the cookie and use a non-secret source reference with server validation; do not reuse actor-only historical citation authority unchecked. Existing normal-mode citation links remain compatible.

## 8. Mutation and API inventory

Current app contains **41 route handlers** (including GET/POST export aliases). This inventory is an initial source review, not a substitute for the implementation-time complete call graph and effective database function/ACL inventory.

| API route group (prefix /api/) | Required policy |
| --- | --- |
| account-identity; admin/delete-member | Deny mutations/automatic linking in View-As. |
| admin/member-directory; admin/member-last-login; user-last-logins | Sensitive manager reads; target-effective privilege and bounded fields, or Exit. Never reveal Auth/session internals as target data. |
| ask-lwr | Allow answer operation via View-As pipeline; not ordinary telemetry. |
| ask-lwr/feedback | Deny both document and Live feedback even with a valid old receipt. |
| ai-assistant/answer; ai-assistant/retrieval | Exit-required manager tools. Use the separately guarded View-As Ask LWR operation instead. |
| ai-assistant/documents | All management access Exit-required; source viewing uses the ordinary effective-authorized viewer capability. |
| ai-assistant/review; ai-assistant/approved-answers | All manager workflow/list/detail/preflight/draft/activation/retire/existing-evidence operations require Exit. |
| ai-assistant/capture-health; ai-assistant/live-review | Exit-required diagnostics, never Player-effective access. |
| official-document-viewer; official-document-viewer/pdf; approved-answer-viewer | Allow target-authorized source preparation/content only; validate exact historical permission/context. |
| ai-insights | Unsupported initially; read/model paths may expose actor-authorized live datasets. |
| league-communications; notifications; score-notification; match-setup-reminders | No browser sending, queued sending, reminders, or state changes. Read-only history only if separately adapted. |
| notification-templates; notification-template-history; system-settings; brevo-diagnostics | Target-effective management reads if adapted; all edits/deletes/test actions off, sensitive diagnostics otherwise Exit. |
| match-lineups; teams/delete; season-reset; master-reset; season-rollover | Deny all mutation operations. |
| member-password-reset-check | Deny View-As initiation of resets/account checks/link repairs; preserve general document password instructions. |
| app-notifications/subscribe; app-notifications/public-key | Deny subscription mutation; public-key read safe. No automatic subscriptions while viewing. |
| tournaments/admin, tournaments/action, tournaments/sms; round-robin/admin, round-robin/action, round-robin/player | Independent credentials and mixed POST reads/writes: unsupported; resolve session attribution before direct-write acceptance. |
| pbcc/reminders | GET/POST can send under cron auth. System job allowed only with its own secret/principal; unavailable to the View-As browser. |

Direct browser mutation files: captain-dashboard/page.js; divisions/page.js and divisions/[id]/page.js; leagues/page.js; locations/page.js; matches/[id]/page.js; member-import/page.js; members/page.js and members/[id]/page.js; ratings/page.js; schedule-editor/page.js; scheduling/page.js; score-entry/[id]/page.js; score-sheets/page.js; scoring/page.js; seasons/page.js; teams/page.js and teams/[id]/page.js. Also inspect profilePhotos.js, identityRoleWriter.js, standingsRebuild.js, accountIdentity.js and reset-password/page.js. Shared components can invoke mutations even on apparently read-only pages. DOM/Map/crypto .update/.delete matches are not database writes and must not be counted blindly.

Server-side workers/services requiring operation classification include aiDocumentProcessing, aiApprovedAnswersService, aiExistingEvidenceDecision, aiReviewService, aiQualityCapture, liveLmsService, notification/reminder services and any internal outbound fetch/queue operation. No use-server application actions were found by this scan; require a future static check for newly introduced Server Actions as well as route methods. Alias routes and background callbacks must not escape the registry.

## 9. Ask LWR, Live SELF and Stage 7

Keep ordinary document retrieval/selection/generation, governing-source rules, corpus, managed threshold and source behavior unchanged. Pass effective role/context only where already relevant. Never send the real actor/target account information, live values, context handle or credentials to the answer model. Ordinary source questions retain their normal model path; Live questions remain deterministic with zero model/embedding calls.

Refactor the Live authorization evaluator to separate **real_actor**, **effective_member**, **lookup_subject** and **mode**. Normal ai_live_lookup continues resolving effective member from the verified real actor. A new server-only View-As wrapper validates actor+context, resolves the effective member internally and invokes the same bounded evaluator. It must not accept an arbitrary browser effective_role/member, mutate p_actor into the target Auth ID, or bypass relationship checks just because the actor is Commissioner.

Under View As John, SELF_RATING uses John's member ID; a named Jane question still undergoes John's permission/relationship checks. Explicit-person failures never fall back to SELF. Current active-season/team rules and authorized-missing behavior remain. Members without Auth can use the same member-level evaluator only when explicit role/identity state is sufficient; this is a labeled permission preview, not proof their real sign-in would succeed. Rate limits charge Terry, never consume John's real request quota; use a bounded diagnostic allowance with comparable capability limits. Record this difference from real user rate-limit history truthfully.

Bind Live and document follow-up receipts to real actor session, View-As context/generation, effective member, mode and purpose. Revalidate current roles/context for every follow-up; clear on enter/exit/switch/expiry. Never reuse a normal-mode receipt or another target's receipt, and never merge a prior personal Live response into a model prompt. No feedback receipt is emitted in View-As; server feedback rejects regardless of disabled UI.

Recommend **B: separated diagnostic outcomes**, with physically separate storage in Phase 1 to minimize Stage 7 contamination. Do not send these through capture_ai_quality/player_interface or disguise them as manager_test. Store context reference (private), mode VIEW_AS, actor/effective role classifications, request ID, source family, intent/result, timing, model-skipped flag and bounded source identities/counts. No raw Live question/answer/name/email/contact/rating/roster payload. Document-question raw text/snapshots are omitted initially too; transient UI provides the debugging content. A future reviewed retention policy can allow sanitized document snapshots without mixing metrics.

No ordinary question outcomes, unanswered routes/groups/cases, feedback events, votes or review resolution are created. Diagnostic counters stay separate and labeled. Mandatory start/end and sensitive-read audit use the real actor with protected target reference. Harmless page navigation need not create audit entries. Diagnostic telemetry may fail open after authorization, but start and sensitive-read audit must succeed before releasing the context/protected data. Failure returns a safe unavailable result, not a privacy fallback.

## 10. Storage, SQL/security work likely required (descriptions only)

No SQL is written here. Proposed private application schema:

- Context/lock state: unique actor lock; context digest, actor, initiating-session binding, target member, start/absolute expiry/end state, generation, reason. No target token/password. Concurrency admission state for in-flight attributable writes.
- Append-only audit: event ID, context, real actor, protected target reference, server timestamp, event type STARTED/ENDED/SENSITIVE_READ, effective permissions summary, safe capability/result/reason. End exactly once with explicit/expired/revoked/deactivated reason; no fake close timestamp.
- Separated diagnostic outcomes: context/request reference plus the allowlist above. No public player metrics join by default.

Private tables have RLS, no anon/authenticated table privileges, no PUBLIC execute, no client service key. Explicitly revoke production default service_role table privileges before granting the exact minimum. Prefer narrow server-only RPCs with private implementation, fixed search_path and least-privileged owner. Audit immutable to runtime callers (no UPDATE/DELETE); no business-data write rights in read functions. Context transition APIs update only context state and append audit; retention maintenance is a separate privileged scheduled operation.

Additional migration scope is **not purely additive tables**: restrictive actor-lock protection for existing exposed LMS tables/views/storage and bypass-capable RPCs; service-route transactional admission; extraction of the Live member-level evaluator and server-only wrapper. This must be separately enumerated and approved. No global default-privilege changes, no broad authenticated grants, no Auth session-reader role, no auth.sessions access, no Auth trigger/account mutation for View-As. Preserve LMS-0723 identity coordination and all ordinary-mode behavior.

Proposed retention: 90 days immutable lifecycle/sensitive-read audit; 30 days diagnostic outcomes; erase expired context secrets/digests after a 24-hour operational window once termination is durable, retaining non-secret context reference for audit. Use protected identifiers rather than names in audit; manager display names resolved through authorized reads. No session/Auth token retained in these tables. Align with the club's eventual retention policy before deployment; these durations are recommendations, not an existing policy claim.

CSRF: exact allowed Origin validation, SameSite cookie and CSRF challenge for start/end/recovery; reject missing/foreign Origin on browser state transitions unless a specifically authenticated non-browser interface is designed. Existing routes do not supply a universal CSRF framework to assume. CORS disallows foreign credentialed origins. Escape display names, no unsafe HTML, no bearer context in public links; HttpOnly helps with extraction but does not make same-origin XSS safe. Follow existing CSP and safe rendering, avoid untrusted redirects, limit input/request sizes and rate-limit start/end/reads.

## 11. Banner and user experience

Sticky, high-contrast professional amber/navy treatment with eye/read-only icon **and text**:

**VIEWING AS: John Smith — Player**

You are still signed in as Terry Adelman (Commissioner). Read-only.

**Exit View As User**

Use semantic region/status, polite entry/exit announcement, explicit focus transfer to dashboard heading and return focus to the initiating action on Exit where still available. Native controls, visible focus and 44px touch target. Mobile: compact stacked actor/target labels, no horizontal clipping, persistent obvious Exit, safe-area padding. Integrate banner with Ask LWR's mobile fullscreen panel so it remains visible and composer/close controls remain usable; banner must not obscure content. Do not rely on color alone or hide the mode inside a menu.

An optional small Details disclosure may show effective role labels, team names already authorized and “permission preview; no linked sign-in account” limitation. Do not show raw Auth IDs, session identifiers or oversized diagnostic output. Offline/revalidation errors show a blocking safe state, not cached privileged content. Normal safe external links remain available without View-As context leakage.

## 12. Likely implementation files

New names are proposals: app/lib/viewAsContextServer.js, viewAsCapabilities.js, viewAsMutationGuard.js, targetEffectiveReads.js; app/api/view-as/{start,status,end,read,ask}/route.js; ViewAsProvider and ViewAsBanner components. Server-only modules must not enter client bundles.

Existing changes expected: app/layout.tsx; app/lib/auth.js (context-aware UI only); serverSupabase.js; permissions.js; adminNavigation.js; AppHeader; members/[id]/page.js; AdminDashboardClient; player/captain dashboards; teams/roster/match/standings readers; all supported page data adapters in section 7; every relevant API guard/service in section 8; liveLmsService and receipts; Ask LWR conversation/feedback components; source-viewer services/routes; PWA/cache handling. Database migration files created only after approval using the established migration workflow. Version/package/current documentation advance to LMS-0724 / 0.1.546 only during implementation, not this pass.

The actor-wide enforcement and module boundary make this broader than a small dashboard addition. Stage implementation in security-first increments behind a disabled feature; do not ship a clickable entry point before direct access protections and parity readers are complete.

## 13. Implementation sequence and acceptance plan

1. Obtain approval of actor-wide scope, explicitly delegated privileged-target reads, separate diagnostic storage, unsupported modules and required database policy/RPC work. Resolve event-code/direct-Auth boundary explicitly. Complete route/action/function/storage inventory; compare to fresh read-only deployed schema. No mutation during preflight.
2. Build pure actor/effective capability resolution with fixtures for ambiguous/no-Auth/multi-role/inactive/relationship cases. Extract Live evaluator under existing regression suite before adding View-As wrapper.
3. Implement private context/audit/admission and restrictive direct-access protection in isolated Postgres with production-like default grants. Test concurrency and rollback before production migration approval.
4. Implement shared server guards and minimal target readers; require registry coverage for every route/action, aliases and bypass RPC. Establish module boundary. Block any unconverted route.
5. Add banner/start/exit and supported dashboard/read-only pages; integrate Ask LWR diagnostic path, sources and receipts. Add separated diagnostics viewer only if approved; no ordinary Stage 7 changes.
6. Run full automated suite, lint, nonincremental tsc, PDF server-bundle verification, normal build plus established isolated clean build if cache lock recurs, diff check; desktop/mobile keyboard/browser testing with synthetic fixtures. Do not use live private player information or send it to a model to test policy.
7. Submit exact migration/ACL diff, data/endpoint scope and results for controlled production authorization. Snapshot immutable security/corpus state; allow legitimate registration concurrency with provenance, not count equality. Deploy only when authorized; no synthetic production members/teams/rosters.
8. Production acceptance with an explicitly authorized target and permitted minimum data; leave real roster/match-dependent gates deferred if still unavailable under an explicit acceptance decision. Check actual UI, direct negative requests, audit actor identity, clean player metrics and Exit restoration. Never mark an unavailable live gate as passed.

Required automated/security matrix:

- Player, Captain, Co-Captain, Club Pro, anonymous and deauthorized manager cannot start. Malformed/unknown target, duplicate identity, inactive target and missing role fail safely. Both manager initiator roles may start valid privileged-target previews under section 106; manager AI tools still require Exit. No implicit role creation or Auth link repair.
- Alter/omit cookie or target/body/header role; replay another actor/session/context; replay expired/revoked context; nested/simultaneous start; CSRF foreign Origin; malicious return URL; name with HTML. None yields additional data/authority.
- Player target direct manager URL/API/download denied even for real Commissioner. Captain sees only assigned authorized players/teams; arbitrary roster/team/pagination IDs rejected. Club Pro location/team differences tested. No Commissioner fields in browser payloads, prefetch, errors, cache or realtime.
- Direct INSERT/UPDATE/DELETE/upsert, storage upload/remove, legacy RPC, security-definer function, view, read-looking GET side effect and service-backed POST all blocked while locked. Omitted context cannot unlock the actor. Exercise every endpoint registry entry including exported aliases and modules. Existing system cron remains separately authorized; forged system flag denied.
- Race Start against already-running member/score/role writes and outbound sends; no post-start unadmitted write; bounded BUSY/retry rather than deadlock. End/expiry against queued stale mutation must never execute it as administrator. Failed start audit leaves no usable context; failed end retains safe lock.
- View As John SELF_RATING matches John's authorized result, including missing/clarification; Jane contact denied when John lacks access despite Commissioner actor. Explicit named person never becomes SELF. No target Auth token, no target quota consumption, no live model calls, no excessive fields.
- Follow-up/feedback/viewer receipts cannot cross actor, target, mode, generation or expiry. Old valid feedback receipt rejected during View-As; original non-View-As feedback behavior preserved.
- Stage 7 player outcome/case/group/feedback counters unchanged by diagnostics; separate diagnostic audit names real actor only and contains no live values. Start/end exactly once, sensitive audit on permitted protected reads. Retention job cannot mutate operational tables.
- Refresh, back/forward, bfcache, PWA restore, cross-tab change, browser close/reopen, logout, role demotion, target deactivation, network/auth/DB failure. Banner never disappears while target data is shown. Exit restores actor session/navigation without signing in again.
- Desktop and 320/390px mobile, keyboard/screen reader, focus and touch targets; Ask LWR mobile overlay/banner coexistence; no mutation controls active. Member-detail entry only for authorized real managers.
- Preserve LMS-0723 immutable identity/session and concurrency tests, Live privacy/authorization, accepted ordinary AI/RAG and Stage 7 behavior, historical citations, source activation/version history and managed threshold. Cross-League Leakage stays zero in the existing required RAG controls.

Acceptance requires complete direct-write guard coverage and faithful server-filtered read payloads, not merely a successful visual demonstration. No View-As implementation, runtime tests or production acceptance is claimed by this design report.

## 14. Continuation: exact shared contract and architecture comparison

Use these exact terms in the future implementation: **REAL ACTOR** = verified authenticated administrator; **EFFECTIVE USER** = viewed member; **AUTHORIZATION MODE** = `VIEW_AS_READ_ONLY` (or `NORMAL` outside this feature). Diagnostic classification may use `interaction_mode=view_as`, but it is never an authorization claim from the browser.

`resolveEffectiveViewer()` is the sole trusted server entry: authenticate real actor, locate actor lock/context, validate binding/expiry, reload actor permission and effective member state, then return realActor (minimal internal immutable reference), mode, effectiveMember, effectiveRoles/capabilities, readOnly, context reference/generation and validity. Its serialized UI projection omits Auth IDs, digest/session binding and service client. On invalid context it returns a typed denial/expired result; it must not silently return NORMAL and process a queued write. `assertNotViewAsMutation()` uses that result plus transactional actor admission; endpoint code must not reinterpret cookies independently.

| Candidate | Tradeoff | Decision |
| --- | --- | --- |
| Plain member ID / role in sessionStorage | Editable, not authoritative, omitted on direct requests | Reject. |
| Opaque server context referenced from sessionStorage | Good target tamper resistance, but same-origin real-actor token still permits requests without the tab flag; JS-readable handle and duplicate-tab copying need treatment | Not sufficient for required same-application write blocking. |
| Stateless signed short-lived token | Server-verifiable, but expiry alone cannot revoke current role/target changes, prevent concurrent nesting or close Start/write races; reauthorization and a lock/audit store are still needed | Reject as unnecessary parallel authority/state. |
| HttpOnly opaque handle + server context + actor-wide guard | Revocable, no target/session token, omission does not defeat actor lock; impacts other tabs | **Single Phase 1 recommendation.** |
| Dedicated View-As origin with an isolated read-only application and server-mediated real-actor session | Could support writable admin Tab A and diagnostic Tab B, no actor Supabase token in View-As renderer, fixed origin API/CSP boundary. Requires secure one-use bootstrap, server-held real-actor authentication validation, routing/viewer duplication and separate hosting/security review | Feasible future architecture; not a small tab-storage variant. Deferred rather than left as an implementation choice. |

The recommended design does not pretend that account-wide locking is the ideal UX; it prioritizes the mandatory security requirement over optional tab convenience within the existing architecture. If that tradeoff is unacceptable, approve a dedicated-origin design pass before implementation. No global target search box; Member Detail remains the only initial entry. Preserve a server-validated relative Member Detail return path, not arbitrary client URLs. Invalid route during View-As redirects to effective dashboard with “That page isn't available while viewing as this user,” never silently exits. Truly public standings remain public, with the banner retained inside the LMS shell.

Inactive members: deny Phase 1 because normal sign-in/Live authorization requires active membership and a fabricated active preview would misrepresent reality. Self-preview: allow; it is useful for testing the read-only environment/role resolution and needs no second code path. Deleted/invalid target terminates context on the next request, including follow-ups and source downloads. No target Auth login, logout, password, email, session, last-login or membership side effects.

## 15. Complete business-operation mutation matrix

Every direct rejection below uses HTTP 403 with a stable `VIEW_AS_READ_ONLY` error and the message in section 5 (or an equivalent database permission error mapped to that message). Invalid authentication still returns 401. An unsupported route must not reach its handler. UI hints never replace the listed guard. Read-only diagnostic/lifecycle persistence is the explicit narrow exception described earlier.

| Operation | UI while viewing | Authoritative direct-call protection |
| --- | --- | --- |
| Member/profile fields, notes, notification preferences | Hide/disable Save with explanation | Central guard + member-row mutation admission/RLS; no profile autosave. |
| Profile photo | Disable upload/delete | Guard + storage-object write policy + member-row update admission. No signed upload grants in this mode. |
| Password/reset/invite | Exit-required, no target account action | Reject LMS reset/invite endpoints and prevent Auth SDK calls in View-As surfaces; external provider boundary stated in section 5. |
| Role changes and identity linking | Hide role editor; no repair-on-read | Guard + user_roles admission + account-identity denial; preserve existing LMS-0723 coordination. |
| Team create/edit/delete/copy | Disable create/save/delete/copy | Guard + teams/RPC admission; copy cannot mutate secondary rosters/roles. |
| Captain/Co-Captain/Club Pro assignment | Disable assignment save | Guard + teams/locations/user_roles admission as one controlled operation. |
| Roster add/remove/copy | Read-only roster, Add Player/Remove disabled | Guard + team_members table/RPC admission. |
| Match Setup and lineup save | Show only authorized existing setup; no Save | match-lineups guard + match_lineups and related table admission. |
| Scores, game entry, verification/reopen, DUPR flags, standings rebuild | Read-only authorized result; no submit/verify/rebuild | Guard + matches/match_lines/line_games/team_standings admission, including helpers/RPCs. |
| Schedule generate/edit/publish/reset, byes | Read-only schedule or Exit-required | Guard + matches/team_byes/settings admission; no queued generation. |
| Court availability / blackout changes | Disable editors | Guard + location_court_availability/league_blackout_dates/locations admission. |
| Season/league/division/line configuration | Read-only fields, Save/Delete disabled | Guard + seasons/leagues/divisions/division_lines/league_schedule_settings admission. |
| Member/ratings import, cleanups and bulk repairs | Exit-required | Guard + members/import_batches/import_rows/member_season_ratings admission; no background job enqueue. |
| AI source upload/process/activate/deactivate | Entire manager workflow Exit-required | documents endpoint and processing-service guard; storage/document/version/chunk writes denied. |
| AI Feedback case classification/status/evidence confirmation | Entire manager workflow Exit-required | review/approved-answers guard + reviewed service/RPC mutations denied. |
| Approved Answer create/edit/preflight/activate/retire | Exit-required | Guard before all managed-knowledge workflow operations; history unchanged. |
| Helpful/Not Helpful (document and Live) | Disabled with explanation, no submission receipt | feedback route and Live RPC entry denied even if prior receipt is valid. |
| Emails, SMS, invitations, reminders, test sends | Send/Test unavailable | Guard before enqueue/provider dispatch; actor operation lease; system-only cron separated. |
| Notification subscription, mark-read, login updates | Suppress automatic side effects | Guard + subscription/state tables and related hooks; no target activity history. |
| Settings, templates, guide/score-sheet uploads, branding | Read-only/Exit-required | Guard + system_settings/template/history and storage admission. |
| Season rollover/reset, master reset, delete-member cleanup | Exit-required | Guard + privileged RPC admission before any delete, cascade, storage cleanup or audit. |
| Tournament / round-robin / PBCC actions | Unsupported/Exit-required | Attributable mutation-session or isolated-origin prerequisite; legacy event-code-only direct write is an implementation stop condition until resolved. |

Guarantee coverage with an executable registry for all 41 existing route handlers (method plus semantic action), alias exports, rewritten paths, direct table operations, privileged RPCs, storage and future Server Actions. A test must fail when a new mutation-capable entry is not classified. Integrations exercise raw Supabase requests and real effective database privileges; a regex scan is only an inventory aid. Block old valid receipts, captured requests and omitted cookies, not just freshly generated UI calls.

## 16. Named proposed objects, privilege review and rollback

Proposed names, not SQL or migration files:

| Object | Purpose and runtime permission |
| --- | --- |
| `view_as_private.contexts` | Context plus actor lock/generation; digest unique, one active lock per actor; server transition functions only. |
| `view_as_private.audit_events` | Append-only start/end/sensitive-read history. No runtime UPDATE/DELETE; actor/effective/lookup-subject references protected. |
| `view_as_private.diagnostic_outcomes` | Separated minimal diagnostic records; append-only runtime access, no normal Stage 7 writes. |
| `view_as_private.operation_leases` | Only if required for cross-request/external mutation admission; bounded actor/operation/generation/state, no business payload. Transactional mutations should avoid needing a lease. |
| `view_as_private.resolve_context`, `start_context`, `end_context`, `assert_actor_writable`, `expire_contexts` | Private policy/state functions; explicit actor/session binding, bounded locks, trusted time. No PUBLIC/anon/authenticated execution except a tightly scoped predicate wrapper if required for RLS. |
| `public.lms_view_as_start`, `lms_view_as_status`, `lms_view_as_end`, `lms_view_as_read`, `ai_live_view_as_lookup` | Narrow server-only wrappers; service_role EXECUTE only, private implementation and authorization within transaction. Public schema alone does not mean browser-callable. |
| `view_as_private.member_live_read` (or equivalent extraction in ai_live_private) | Shared current LMS-0723 member-level authorization/projection evaluator; separate real actor and effective user. No browser execute. |

Use a dedicated NOLOGIN least-privileged function owner, empty search_path with qualified objects, no caller-settable authorization GUC, no unvalidated dynamic table/column selection. Existing ordinary Live wrapper remains server-only and retains its semantics. Exactly which predicate wrapper must be callable by authenticated RLS depends on the migration's invocation design; permit only a zero-argument current-actor lock predicate, never arbitrary actor/target lookup. Test that it cannot reveal other users' context. No direct new-table grants to service_role are needed if all accesses use reviewed definer wrappers; explicitly revoke defaults so this is true in production-like tests. Retention maintenance role has scoped delete rights to expired private records only; ordinary app runtime does not.

Existing relation coverage candidates found in current app calls: members, user_roles, teams, team_members, member_season_ratings, seasons, leagues, divisions, division_lines, locations, location_court_availability, league_blackout_dates, league_schedule_settings, matches, match_lines, match_lineups, line_games, team_byes, team_standings, member_import_batches, member_import_rows, system_settings, score_sheet_templates, notification_templates, notification_template_history, app_notification_subscriptions, league_communication_history; AI documents/versions/chunks, approved answers/revisions/events, feedback/outcomes/groups/occurrences/review cases; tournament and round_robin families; storage.objects and exposed views/functions. Catalog inventory must catch indirect tables not named by literal browser queries. Do not issue blanket production privilege revokes from this list; review exact restrictive guards and preserve ordinary access.

Forward migration order: create private state/functions with explicit ACLs → install/adapt locked-actor protection and service entry guards under disabled feature → verify ordinary-mode parity and direct-request denial → deploy readers/UI → enable only after controlled acceptance authorization. Production-like tests must reproduce automatic grants; effective privileges/operations, idempotency and rollback are required, not just inspection of GRANT text.

Rollback: disable Start first; end/revoke active contexts and append reason=rollback; prevent pending work using old generations; deploy a compatible ordinary-mode build while guards remain capable of rejecting outstanding contexts; drain operation leases; only then remove mode-specific guards/wrappers using the recorded exact pre-migration definitions. Preserve audit and diagnostic history per retention. Never restore target data because View-As must not have changed it. Never drop contexts first and thereby turn active/stale requests into normal administrator operations. If safe drain cannot be proven, keep the feature disabled and actor locks recoverable until reviewed recovery. No credential rotation, target session reset, corpus rollback or identity-link rollback is part of View-As rollback.

## 17. Security matrix, hard gates and performance

Run the cross product requested in section 113 as parameterized isolated tests: real actor Commissioner/League Manager/Club Pro/Captain/Player/anonymous; target Player/Captain/Co-Captain/Club Pro/League Manager/Commissioner/inactive/incomplete; normal/active/expired/forged/changed-target/actor-role-removed mode; permitted read/forbidden read/Live SELF/cross-player Live/mutation/direct API/admin AI/exit. Add valid no-Auth explicit-role targets and conflicting identity targets.

Expected predicates: only currently active authorized managers initiate; only validated contexts return target-effective data; normal mode remains unchanged; expired/forged/revoked contexts return no protected data; every business mutation in active mode fails; every admin AI management route in View-As requires Exit; an authenticated real actor may always request safe termination of their own context. Target permission changes take effect on the next request, including loss of a captain relationship. Do not silently refresh a forged target into a new valid context.

| Hard gate | Required evidence |
| --- | --- |
| A/B initiators and context integrity | Negative starts for all unauthorized roles, forged/tampered/replayed/expired contexts; real server responses. |
| C/D actor preserved, target untouched | Same real actor session before/after; no password/reset/invite/Auth session or target last-login changes. Do not read passwords to prove this. |
| E/I no privilege bleed or direct URL bypass | Exact field/row assertions and forbidden-field absence, direct URL/API/export tests, Player-to-manager denial with banner retained. |
| F all mutations blocked | Every matrix entry, browser Data API/RPC/storage and route bypass tested; Commissioner actor is not an exception. |
| G/H Live effective scope | Terry→John SELF uses John's authorized rating/missing result; Jane email denied for Player John; Captain managed-player email allowed only with legitimate relationship, unrelated player denied. |
| J real actor audit | STARTED/ENDED and sensitive audit contain actor, effective member and lookup subject separately; no copied contact value. |
| K truthful metrics | View-As requests produce only separated diagnostics; no player totals/failure rate/feedback/case/group increments. |

All six Live capabilities remain in scope: SELF_RATING, PLAYER_RATING, PLAYER_CONTACT, SELF_TEAM, TEAM_ROSTER, NEXT_MATCH. Preserve zero Live model calls, subject isolation, server getUser, durable links and direct normal-RPC denial. Preserve full LMS-0722 benchmark/qualification/source/navigation tests. Captain production tests wait for real rosters; View-As does not manufacture the missing relationship or substitute manager permission. Existing legitimate targets may be used only under controlled approval, with unavailable role combinations covered by isolated fixtures.

Performance estimate, **not measured**: continue one existing online getUser verification per application request; combine context lookup, actor/target role checks and small relationship authorization with the bounded read RPC where possible. The incremental database work should be indexed primary-key/digest lookups and bounded relationship checks, normally low single-digit to tens of milliseconds inside the database; network round trips may dominate. Initial engineering budget: no more than one added database round trip, p95 incremental application overhead under 100 ms in comparable deployed measurements, excluding existing provider authentication/model time. This is a target to validate, not a promise or production result. No extra model call due to View-As. Sensitive audit adds a small write and must be measured. Instrument auth/context/policy/query/render timing separately using safe IDs, not raw inputs; report p50/p95 and timeout behavior without fabricated breakdowns. Avoid authorization caches across requests; cache harmless public static material only.

Propose start rate limit of 5 attempts/minute and 30/hour per real actor, plus one active context, with an auditable safe retry message; Exit must not be rate-limited into trapping the user. Current Live diagnostic limits charge the actor as described earlier. Advanced diagnostic history UI is deferred; authorized operators may inspect minimal private diagnostic records under a separate approved support procedure. Error logs identify mode, effective-role class, route/capability, safe error category and pseudonymous real-actor/context correlation; actual references remain in protected audit. Do not dump target data or whole requests into hosting logs or support screenshots.

## 18. Deliverable index and release recommendation

| Requested deliverable | Report section |
| --- | --- |
| 1 current architecture | 2 |
| 2 context mechanism | 4, 14 |
| 3 actor/effective model | 3, 14 |
| 4 initiators; 5 target eligibility | 3 |
| 6 session/tab behavior | 4, 14 |
| 7 banner/UI | 11 |
| 8 target-effective reads | 6, 14 |
| 9 mutation guard | 5, 15 |
| 10 page inventory | 7, 8 |
| 11 document AI; 12 Live AI | 9 |
| 13 Stage 7/feedback | 9 |
| 14 audit; 15 sensitive audit | 9, 10, 16 |
| 16 incomplete identity | 3 |
| 17 security matrix | 13, 17 |
| 18 schema; 19 migration/security | 10, 16 |
| 20 performance | 17 |
| 21 regressions; 22 production sequence | 13, 17 |
| 23 implementation scope | 1, 12, 13, 18 |

Recommend one eventual LMS-0724 / 0.1.546 release implemented in internal security-first subphases, with feature disabled until the full read-only boundary works: context/audit/admission → direct-access and service guards → core Player/Captain/manager read adapters → Ask LWR and mode-bound viewers → accessible UI → controlled acceptance. No intermediate release claiming complete View-As with only client controls. Core scope is start/exit, effective navigation and supported reads, all mutation denial, document + six Live capabilities, audit and desktop/mobile behavior. Defer advanced diagnostics/search, writable impersonation (not part of this feature), independent writable tabs, unsupported independent modules and account-provisioning work.

**Stop for design review.** The actor-wide multi-tab tradeoff and unattributed module-write boundary need an explicit decision before implementation can claim hard gate F. No implementation, SQL, deployment or version bump has occurred in this pass. The separate undeployed chart change and read-only location findings remain separate work.

## References

Local evidence: app/lib/auth.js, serverSupabase.js, permissions.js, liveLmsService.js, liveLmsReceipts.js, aiQualityCapture.js; app/api and pages inventoried above; accepted LMS-0723 manifest production report and server-session migration. Next.js installed use-client guide and Next.js skill consulted. Supabase's official [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Storage access controls](https://supabase.com/docs/guides/storage/security/access-control) confirm that service credentials bypass RLS and storage needs its own policy boundary; neither replaces application authorization. Documentation was consulted read-only; no SQL example from external guidance was executed.

LMS-0724 owner entry-point clarification: Members → Member Detail → View As User is the only Phase 1 entry. Real Commissioner/League Manager authorization and selected-target validity are rechecked server-side before confirmation and again at context creation. No global entry or nested target entry. Implemented locally; production review remains pending.
