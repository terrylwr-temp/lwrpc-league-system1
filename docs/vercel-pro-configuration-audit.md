# Vercel Pro Configuration & Performance Audit

**Audit date:** 2026-09-22  
**Scope:** Read-only repository, Vercel project, deployment, configuration, and recent production-log review  
**Accepted release:** LMS-0755 / 0.1.578  
**Commit:** `cab2a8127779fcddc3455dafb762f4479aa5f457`  
**Deployment:** `dpl_GSqHMdNV4qfudbin18nTY77K2sGK` (`READY`)  
**Production:** <https://league.lwrpickleballclub.com>

No application code, Vercel setting, environment variable, Supabase object, dependency, deployment, or business row was changed during this audit. This report is the only artifact created.

## 1. Executive Summary

The accepted LMS-0755 production release is healthy. The inspected deployment exactly matches the requested commit, is `READY`, and recent production evidence contains no current-deployment 5xx response or function-timeout signal. The most recent 24-hour sample was dominated by successful responses (752 HTTP 200 and 32 HTTP 304); the only current error-level log entries were two Node deprecation warnings attached to successful HTTP 200 requests. The production build completed successfully.

The current Vercel compute configuration is already appropriate:

- Fluid Compute is **already enabled**. Retain it.
- The effective project function duration is **300 seconds**. Do not raise it globally.
- Runtime region is **`iad1`**, appropriately close to Supabase **`us-east-1`**. Do not change it.
- Functions use standard memory and Node.js; no evidence supports more memory, Edge runtime, or multi-region execution.
- No persistent PostgreSQL connection pool exists. Server routes use Supabase JavaScript clients over HTTP.

The principal finding is Vercel environment isolation. Several secrets—including `SUPABASE_SERVICE_ROLE_KEY`, the Supabase URL/anon key, Brevo credentials, web-push private material, and `CRON_SECRET`—are each represented by a single Vercel environment entry targeted to both Preview and Production. As a result, Preview server code can reach the production Supabase project with service-role authority and can use production notification providers. Preview deployment protection reduces exposure but does not create a data boundary. This is **P1** and should be corrected in the Vercel dashboard before relying on Preview deployments for untrusted or experimental code. No secret value was retrieved into this report.

### Recent production health evidence

- The current deployment is `READY`, serves the production aliases, and exactly matches the accepted commit.
- The available 24-hour current-deployment runtime sample contained 752 HTTP 200, 32 HTTP 304, and 25 HTTP 404 responses among the three most common of four observed statuses. No 5xx or timeout was found for the current deployment.
- The only current-deployment error-level entries were two `[DEP0169]` warnings on `/api/round-robin/player`; both requests returned HTTP 200.
- The available seven-day error-cluster summary contained the recurring `url.parse()` warning (14 occurrences, 11 users) plus one older password-reset rate-limit response and one older `/api/account-identity` `AbortError`, both on superseded deployments. No repeated production failure pattern emerged.
- Recent deployment history showed 20 `READY` deployments and retained rollback candidates. The accepted build completed without an error. Build output contained only package allow-script warnings for `sharp` and `unrs-resolver`; no runtime defect was linked to them.
- Raw runtime-log access for this project exposed approximately a one-day window during the audit. Seven-day raw-log queries exceeded that available window; the seven-day error-cluster aggregation was used instead. There is not enough structured duration data to rank slow routes reliably, which is why instrumentation—not speculative tuning—is recommended.
- No unusual request spike was apparent in the inspected sample. The audit generated no synthetic traffic and invoked no business workflow.

No immediate application-code emergency is present. Worthwhile P2 work is to add bounded provider timeouts and route-duration telemetry to AI and notification paths, instrument Speed Insights, replace broad AI Insights reads with scoped aggregation, and make the standings rebuild transactional/batched. Those changes should be separate reviewed releases, not part of this audit.

## 2. Current Vercel Architecture

### Repository and framework

- Next.js App Router `16.2.4`, React `19.2.4`, Vercel Node.js `24.x` build/runtime configuration.
- Project root in Vercel: `lwrpc-admin`.
- There is **no `vercel.json` or `now.json`**.
- `next.config.ts` configures output tracing, redirects/rewrites, image sources, and the Turbopack root. It contains no function duration, memory, Fluid, region, or cron configuration.
- `proxy.js` applies the View-As host boundary, CSP/security headers, API mutation restrictions, and `private, no-store` behavior on the isolated host. The deployed functions manifest identifies the proxy as Node runtime.
- `app/layout.tsx` calls `headers()` to identify the isolated View-As host. Consequently, the production build classifies the App Router pages as dynamic. This is a deliberate security/correctness boundary, not an accidental optimization failure.

### Effective Vercel project configuration

| Setting | Effective state | Evidence/conclusion |
|---|---|---|
| Fluid Compute | Enabled (`fluid: true`) | Project resource configuration; retain |
| Default function duration | 300 seconds | Project default resource configuration |
| Default region | `iad1` | Project `serverlessFunctionRegion` and default region list |
| Function memory | Standard | No application override |
| Failover region | Not enabled | Appropriate for this single-region database architecture |
| Route `maxDuration` | None in source | No route exports or Vercel route overrides |
| `preferredRegion` | None in source | Runtime region is controlled by the project setting |
| Edge routes | None found | All API routes use Node explicitly or inherit Node |
| Route-specific memory/Fluid settings | None | No Vercel function configuration files or exports |
| Cron jobs | None | Vercel cron definitions are empty |
| Rolling releases | Not configured | Current rolling-release configuration is null |
| Deployment protection | SSO on all deployments except custom domains; Git-fork protection on | Appropriate; custom production domains remain public intentionally |
| Skew protection | 43,200 seconds (12 hours) | Useful for safe transitions between deployments; retain |
| Web Analytics | Enabled in the project | Confirm data collection in the dashboard |
| Speed Insights | Project capability present, but `hasData: false` | No `@vercel/speed-insights` package or component found |
| Firewall | Automatic DDoS baseline; no custom active/draft rules; Attack Mode off | Appropriate without evidence of abuse |

There is no code-level background queue. AI quality capture uses Next.js `after()`, which is a good bounded post-response pattern. No Vercel Cron invokes reminders. Reminder workflows are manual or externally initiated.

Relevant Vercel behavior is documented in [Fluid Compute](https://vercel.com/docs/fluid-compute), [function duration](https://vercel.com/docs/functions/configuring-functions/duration), and [deployment protection](https://vercel.com/docs/security/deployment-protection).

## 3. Production Route Inventory

Forty-seven API route files are present. Every route below executes in the **Node.js runtime**. Most declare `runtime = "nodejs"`; View-As `bootstrap`, `exchange`, and `start` inherit the Node default. No Edge route was found. “No route bound” means there is no route-wide `AbortSignal` or total execution budget; it does not mean Vercel has no limit—the effective outer limit is 300 seconds.

### AI, documents, and viewer routes

| Route | Purpose and major calls | Writes | Known bounds | Likely profile |
|---|---|---:|---|---|
| `/api/ask-lwr` | Authenticated Ask LWR orchestration; Supabase routing/retrieval, OpenAI embeddings/planning/answer, deferred quality capture | Yes, quality/audit data | Some planning/evidence calls 15s; initial embedding/final answer lack explicit fetch timeout | AI-, network-, DB-heavy; potentially long |
| `/api/ask-lwr/feedback` | Validates identity/conversation and records feedback | Yes | No route bound | Short, DB-heavy |
| `/api/ai-assistant/answer` | Console answer path; Supabase retrieval plus OpenAI generation and quality capture | Yes | Mixed internal 15s bounds; not all OpenAI calls bounded | AI-, network-, DB-heavy; potentially long |
| `/api/ai-assistant/retrieval` | Embedding plus Supabase retrieval/RPC passes | No business write | Rescue/RPC paths have roughly 5–8s bounds; primary provider path not fully bounded | AI-, network-, DB-heavy |
| `/api/ai-assistant/documents` | List/upload/process/activate official documents; Supabase Storage, PDF extraction, OpenAI embeddings, chunk writes | Yes | Upload validation; no total processing or OpenAI fetch bound | PDF/CPU-, AI-, network-, DB-heavy; potentially long |
| `/api/ai-assistant/review` | Review data and reviewer mutations | Yes | No route bound; force dynamic | Normal, DB-heavy |
| `/api/ai-assistant/approved-answers` | List/create approved answers | Yes | No route bound | Normal, DB-heavy |
| `/api/ai-assistant/live-review` | Live review RPC/read | No | No route bound; force dynamic | Normal, DB-heavy |
| `/api/ai-assistant/capture-health` | Short capture/health read | No | No route bound | Very short |
| `/api/ai-insights` | Loads operational datasets; optional OpenAI analysis | POST may capture/use AI result | OpenAI fetch has no explicit timeout | AI-, DB-, memory-heavy |
| `/api/approved-answer-viewer` | Signed/scoped approved-answer read | No | No route bound | Short, DB-heavy |
| `/api/official-document-viewer` | Signed/scoped document metadata/read | No | No route bound | Short, DB-heavy |
| `/api/official-document-viewer/pdf` | Authorizes and streams a PDF from Supabase Storage | No | Provider request not given a route-wide budget | Network-heavy; response-size sensitive |

### Ratings, scheduling, scores, and standings

| Route/workflow | Purpose and major calls | Writes | Known bounds | Likely profile |
|---|---|---:|---|---|
| `/api/ratings/import` | CSV preview/commit through protected Supabase RPC; up to 4 MiB request and 5,000 rows | Commit only | Application RPC 30s; PostgreSQL function `statement_timeout` 20s | DB-heavy; potentially long but bounded |
| Clean Ratings | Implemented in `app/ratings/page.js`; client calculates/reviews and writes through Supabase rather than a Vercel route | Yes | Browser/Supabase behavior, not Vercel function duration | Client + DB workflow |
| General schedule generation/editor | Implemented in the browser and written directly to Supabase | Yes | Not a Vercel function | Client CPU + DB workflow |
| `/api/match-lineups` | Auth/read/validation and lineup upsert | Yes | No route bound | Normal, DB-heavy |
| `/api/score-notification` | Reads score context and sends email/SMS notification work | Notification/log writes | Provider fetches lack explicit timeout | Network- and DB-heavy |
| `/api/standings-compensation` | Preview/apply compensation; award upsert and standings rebuild | Yes | No transaction-wide or route-wide bound | DB-heavy; potentially long for large divisions |

There is no distinct server-side export route. PDF viewing is covered above; the main season scheduler and Clean Ratings do not consume Vercel Function duration.

### PBCC, round-robin, and tournament routes

| Route | Purpose and major calls | Writes | Known bounds | Likely profile |
|---|---|---:|---|---|
| `/api/round-robin/action` | Settings/player/court/ladder/session actions; round generation; scores; notifications/SMS | Yes | No total bound | CPU- and DB-heavy; sometimes network-heavy |
| `/api/round-robin/admin` | Loads administrative round-robin snapshot | No | No route bound | DB-heavy, normal |
| `/api/round-robin/player` | Loads/records player responses and may trigger notifications | Yes | No total/provider bound | DB- and network-heavy |
| `/api/pbcc/reminders` | Reads sessions/groups/players/logs, sends push/email reminders, records sends | Yes | No total/provider bound | Network- and DB-heavy; potentially long with fan-out |
| `/api/tournaments/action` | Tournament setup, assignment, court, round-robin/elimination generation, scoring, sync/reset | Yes | No total bound | CPU- and DB-heavy; sometimes network-heavy |
| `/api/tournaments/admin` | Loads tournament administration data | No | No route bound | DB-heavy, normal |
| `/api/tournaments/sms` | Sends tournament SMS and records result | Yes | Provider fetch lacks explicit timeout | Network-heavy |

The measured PBCC planning work recorded in project evidence is approximately 2.8–3.0 seconds for nine players and 3.9–4.3 seconds for ten players before persistence/network work. That is not close to the 300-second platform limit and does not justify more duration or memory.

### Communications, identity, system, and destructive administration

| Route | Purpose and major calls | Writes | Known bounds | Likely profile |
|---|---|---:|---|---|
| `/api/notifications` | Sends templated push/email notifications through web-push/Brevo | Yes, delivery/audit data | No Brevo or push timeout | Network-heavy |
| `/api/league-communications` | League-recipient selection and bulk communication | Yes | SMS worker concurrency is bounded to five; individual provider fetches are not timed out | Network- and DB-heavy |
| `/api/match-setup-reminders` | Finds incomplete match setup and sends reminders | Yes | Provider fetches not explicitly bounded | Network- and DB-heavy |
| `/api/brevo-diagnostics` | Authorized provider diagnostic call | No business write | Provider fetch not explicitly bounded | Short/network-heavy |
| `/api/notification-templates` | Reads/saves notification templates | Yes on save | No route bound | Short, DB-heavy |
| `/api/notification-template-history` | Reads dashboard-message history | No | No route bound | Short, DB-heavy |
| `/api/app-notifications/public-key` | Returns public VAPID key | No | No route bound | Very short |
| `/api/app-notifications/subscribe` | Creates/updates a push subscription | Yes | No route bound | Short, DB-heavy |
| `/api/member-password-reset-check` | Turnstile, identity lookup, Supabase Auth/admin path | May trigger auth/email action | Turnstile 10s; identity RPC 3s | Network- and DB-heavy, normal |
| `/api/account-identity` | Resolves authenticated member/account identity via RPC | No | RPC 3s | Short, DB-heavy |
| `/api/admin/member-directory` | Authorized member-directory read | No | No route bound | Normal, DB-heavy |
| `/api/admin/member-last-login` | Reads Auth last-login metadata | No | No route bound | Normal, Auth API-heavy |
| `/api/user-last-logins` | Paged Supabase Auth user listing and last-login lookup | No | 1,000 users per Auth page; no total bound | Network-heavy; grows with user count |
| `/api/admin/delete-member` | Authorized coordinated member deletion | Yes | No route bound | DB/Auth-heavy |
| `/api/teams/delete` | Validates and deletes a team and related data | Yes | No route bound | DB-heavy |
| `/api/master-reset` | Highly privileged multi-table reset | Yes | No route bound | DB-heavy, potentially long |
| `/api/season-reset` | Privileged season reset workflow | Yes | No route bound | DB-heavy, potentially long |
| `/api/season-rollover` | Privileged season rollover workflow | Yes | No route bound | DB-heavy, potentially long |
| `/api/system-settings` | Public settings read; commissioner settings upsert | Yes on POST | No route bound | Very short/normal, DB-heavy |

### View-As routes

| Route | Purpose and major calls | Writes | Known bounds | Likely profile |
|---|---|---:|---|---|
| `/api/view-as/start` | Authorizes and starts isolated View-As flow | Session/token only | No route bound | Short |
| `/api/view-as/exchange` | Exchanges short-lived View-As material | Session/token only | No route bound | Short |
| `/api/view-as/bootstrap` | Provides isolated bootstrap state | No business write | No route bound | Short |
| `/api/view-as/read` | Allow-listed isolated reads, including optional logo/image retrieval | No | View RPCs and logo fetches use 5s bounds | Normal, DB/network-heavy |

## 4. Function Duration Findings

The effective outer limit is 300 seconds. No route declares `maxDuration`, so every function inherits that project setting.

### Ratings import: safe as configured

The current import route uses `RATINGS_UPLOAD_RPC_TIMEOUT_MS = 30_000`. The deployed database function sets a 20-second PostgreSQL `statement_timeout` and accepts at most 5,000 rows; the HTTP body is limited to 4 MiB. Vercel therefore has roughly 270 seconds of margin beyond the application timeout and cannot reasonably terminate this function before its intended application/database failure path. **NO CHANGE** to `maxDuration` is warranted.

### Plausible long-running candidates

1. **AI document processing.** A PDF can be as large as 25 MiB/150 pages. Pages are extracted sequentially, embedding batches are processed sequentially in groups of 40, and chunk inserts are also batched. The OpenAI embedding fetch has no explicit signal. A slow provider or worst-case document could consume a material portion of 300 seconds. There is no production timeout evidence today. Add internal provider and total-job budgets plus duration metrics first. If measured legitimate work exceeds 300 seconds, split processing into a durable/background workflow; only then consider a narrow route duration increase.
2. **Ask LWR / AI answer.** Multiple OpenAI and retrieval passes can occur. Some planning/rescue calls are bounded, while initial embedding and final answer calls are not. The remedy is explicit application time budgets, not a longer Vercel limit.
3. **PBCC reminders and bulk communication.** Sequential session handling plus external fan-out could grow, but current club-sized workload and logs do not demonstrate a duration problem. Bound provider calls and measure batch duration.
4. **Standings rebuild.** Sequential per-match/per-line writes can scale poorly and can leave partial work after failure. Transactional batching is preferable to increasing function duration.
5. **Master reset/season reset/rollover.** These are potentially long privileged writes, but no observed timeout supports a duration change. Their correctness and recoverability matter more than a larger platform ceiling.

**Conclusion:** keep the 300-second project default and add no route-specific `maxDuration` now. A larger global limit would allow hung provider calls and partial operations to consume more compute without solving root causes.

## 5. Fluid Compute Assessment

**Classification: A — retain Fluid Compute now (it is already enabled).** No dashboard change is required.

This LMS is a reasonable Fluid workload because many functions spend time waiting on Supabase HTTP, OpenAI, Brevo, web-push, and Auth APIs. Instance reuse and concurrent request handling can reduce avoidable cold-start and idle-wait cost. It does not make a slow SQL statement or CPU-bound round generator intrinsically faster.

No `pg`, `Pool`, `createPool`, or `DATABASE_URL` connection pool was found. Supabase JavaScript clients are lightweight HTTP clients, so there is no persistent database pool that requires `attachDatabasePool` or special Fluid lifecycle handling. Multiple local `createClient` factories are code duplication, not PostgreSQL socket multiplication.

Keep standard memory. There is no memory-exhaustion, CPU-timeout, or cold-start evidence that justifies a larger memory tier. Fluid behavior and tradeoffs are described in [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute).

## 6. Region / Latency Assessment

`iad1` and Supabase `us-east-1` are a sensible pairing. They keep the principal application/database round trip within the U.S. East region and are also geographically appropriate for a Florida club audience.

No code exports `preferredRegion`. For the Node routes in this project, the effective placement is the Vercel project’s serverless function region. Adding `preferredRegion` provides no demonstrated benefit. Multi-region execution would add complexity around a single-region write database and does not fit the traffic or consistency profile. **NO CHANGE.**

## 7. Cold Start / Bundle Findings

Approximate local Next.js output-file trace sizes for representative routes were:

- AI document route: about 3.11 MiB / 99 traced files.
- Ask LWR and AI answer: about 2.02 MiB.
- View-As read: about 1.98 MiB.
- Round-robin action: about 1.97 MiB.
- Official document PDF viewer: about 1.95 MiB.
- Most other API routes: about 1.86–1.93 MiB.

The clearest bundle-specific candidate is `/api/ai-assistant/documents`. The route’s processing module includes `pdfjs-dist` and a PDF worker import so Vercel reliably traces the worker. That is correct for processing but means list/metadata/activation operations share the same relatively heavy route bundle. After measuring cold-start impact, processing could be separated into a dedicated route/module while retaining the literal worker import and existing bundle verification. This is **P3**, not a current defect.

No large static fixture bundled into server routes was found. The root layout’s dynamic classification is caused by security-sensitive host inspection; it should not be removed merely to create static output. There is no production evidence of repeated cold-start failure.

## 8. Supabase Call Pattern Findings

Concrete findings only:

- **AI Insights broad reads — P2.** The route starts approximately ten queries concurrently, which is good, but several reference-table queries are unbounded and operational tables use high caps (up to thousands of rows). This can silently truncate at API limits and transfers more data into a function than an insight needs. Replace it with purpose-specific aggregates or paginated/scoped RPCs.
- **Standings rebuild sequential writes — P2.** `app/lib/standingsRebuild.js` updates match lines one at a time, then matches one at a time, then deletes and reinserts standings. The compensation award write and rebuild do not form one database transaction. Larger divisions increase round trips and a mid-flight failure can leave partial state. Move the rebuild behind one reviewed transactional RPC or a bounded set-based operation.
- **PBCC reminder fan-out — P2.** Sessions are processed sequentially and provider sends/log writes occur along the path. At current scale this is acceptable, but provider timeouts and route-duration logging are needed before volume grows.
- **Auth user pagination — P3.** Last-login routes page `listUsers` in chunks of 1,000. This is bounded per call but grows linearly with total Auth users. Monitor and replace with a narrower source if it becomes a measurable administration latency.
- **Repeated Supabase clients — NO CHANGE for performance.** Thirty-nine source locations construct clients, but these are HTTP clients rather than persistent connection pools. Consolidation may improve maintainability but is not a current Vercel performance fix and should not trigger an unrelated refactor.
- **AI retrieval — NO CHANGE now.** Multiple retrieval passes are intentional, bounded by evidence selection, and several fallback calls already have timeouts. There is no concrete N+1 defect that warrants redesign during this audit.

## 9. `url.parse()` Deprecation Investigation

**Classification: dependency — monitor/update later (P2).** It is not an LMS source-code call and not a Next.js or Supabase call.

The exact dependency is `web-push@3.6.7`. Its `web-push-lib.js` imports Node’s legacy `url` module and calls `url.parse(subscription.endpoint)` and `url.parse(requestDetails.endpoint)`. The affected LMS routes all reach `app/lib/appNotifications.js`, which calls `webPush.sendNotification`, explaining the observed routes:

- `/api/round-robin/player`
- `/api/round-robin/action`
- `/api/pbcc/reminders`

The warning appeared 14 times across 11 users in the available seven-day error-cluster summary and twice in current-deployment logs. The associated current requests returned HTTP 200. There is no evidence it caused a timeout or failed notification. Nevertheless, Node explicitly warns that the legacy parser has non-standard/security-prone behavior. In a separate dependency-reviewed release, test a maintained `web-push` version or replacement and verify subscription delivery. Do not patch `node_modules`, suppress the warning, or upgrade blindly.

## 10. Timeout / Retry Findings

- **OpenAI calls are inconsistently bounded — P2.** Query-planning and some rescue paths use explicit 5–15 second limits, but Ask LWR initial embedding/final answer, AI document embeddings, and AI Insights generation include fetches without a reasonable `AbortSignal`. Add per-provider limits and one route-level budget that leaves time to return a controlled response.
- **Brevo and SMS fetches lack explicit bounds — P2.** Bulk email and SMS requests can wait until the 300-second platform ceiling. The SMS worker pool limits concurrency to five, which is useful, but each request still needs a timeout.
- **web-push lacks a per-send bound — P2.** Subscription sends are aggregated, including `Promise.all` paths, without an explicit request timeout. Bound each send and record timeout versus provider rejection separately.
- **Supabase heavy writes need database-side bounds — targeted only.** Ratings import correctly has both application and database bounds. Do not add arbitrary short client timeouts to all Supabase calls; instead add database/function bounds to identified bulk RPCs when their expected workloads are known.
- **Client disconnect cancellation is not propagated — P3.** Routes do not generally forward `request.signal` to downstream fetches. It can save work on read-only AI/provider paths. Do not blindly abort a business write after it starts, because that can make the client believe an operation stopped when the database committed.
- **No runaway recursive retry was found.** Retrieval fallbacks and notification concurrency are finite. Retrying non-idempotent writes should remain prohibited unless an idempotency key/receipt is present.
- **`after()` use is appropriate.** Deferred AI quality capture is bounded post-response work and is preferable to holding the user response open.

## 11. Cache / Data Fetching Findings

Next.js route handlers are dynamic by default in this application, and the root layout’s `headers()` call makes page output dynamic. This is safe for the LMS’s authenticated and live operational data.

| Data class | Examples | Recommendation |
|---|---|---|
| Safe public/static | VAPID public key, stable icons/assets | Public key could become static/env-backed; impact is tiny (**P3**) |
| Public but mutable settings | Branding/system settings | Consider a short revalidation window only with explicit invalidation after settings POST (**P3**) |
| Public standings | Standings pages/data | Keep live now; short revalidation is possible later only with explicit invalidation and accepted staleness |
| Authenticated shared | Seasons, leagues, teams, schedules, match operations | Do not CDN-cache; authorization and freshness dominate |
| Private user-specific | Player/captain dashboards, identity, View-As | `private, no-store`; retain |
| Live operational | Scores, rosters, ratings, PBCC/tournament state, reminders | Do not cache |
| AI/review data | Ask LWR responses, reviewer queues, documents | Do not cache responses across users; cache only immutable source artifacts where separately authorized |

Aggressive caching is not recommended. Current traffic does not show a read bottleneck that justifies changing correctness semantics. The 111 recent `/api/system-settings` calls are too small to justify urgent caching work.

## 12. Pro Feature Recommendations

| Pro capability | Classification | LMS-specific recommendation |
|---|---|---|
| Fluid Compute | **USE NOW** | Already on; retain for network-waiting Supabase/AI/notification routes |
| Runtime logs/error clusters | **USE NOW** | Continue incident use; add route/action/duration/request-id structure in code |
| Rollback | **USE NOW** | Existing retained deployments fit the project’s tested recovery process; document the selected recovery deployment per release ([rollback docs](https://vercel.com/docs/deployments/rollback-production-deployment)) |
| Skew protection | **USE NOW** | Existing 12-hour setting is useful; retain |
| Deployment/Git-fork protection | **USE NOW** | Existing protection is appropriate; fix credential scoping as a separate boundary |
| Web Analytics | **USE NOW** | Enabled; verify production events are arriving ([analytics docs](https://vercel.com/docs/analytics)) |
| Speed Insights | **USE NOW / instrument P2** | Project shows no data and package/component is absent; add it in a reviewed release to establish real-user Core Web Vitals ([Speed Insights docs](https://vercel.com/docs/speed-insights)) |
| Spend alerts/budgets | **USE NOW** | Configure percentage alerts and recipients; see Section 13 |
| Function-duration overrides | **NOT NEEDED** | Current 300 seconds is sufficient; fix internal bounds instead |
| Larger function memory | **NOT NEEDED** | No memory/CPU failure evidence |
| Preferred/multi-region functions | **NOT NEEDED** | `iad1`/`us-east-1` is correct |
| Edge runtime | **NOT NEEDED** | Server routes depend on Node libraries and east-region database calls |
| Vercel Cron | **NOT NEEDED** | No current scheduling requirement; do not add one just for Pro |
| Rolling releases | **CONSIDER LATER** | Useful for a genuinely high-risk active-season release, but club traffic may make a canary sample weak; current normal-first acceptance plus rollback is simpler ([rolling release docs](https://vercel.com/docs/rolling-releases)) |
| Custom WAF/rate limits | **CONSIDER LATER** | Observe abuse first; stage/log rules for expensive AI/password-reset/notification paths before enforcement ([Firewall docs](https://vercel.com/docs/vercel-firewall)) |
| Observability Plus/log drains | **CONSIDER LATER** | Current standard logs are enough for routine operation; add only if the apparent one-day raw-log window prevents incident analysis ([runtime logs docs](https://vercel.com/docs/logs/runtime)) |
| Enterprise-oriented secure networking/compute | **NOT NEEDED** | No demonstrated club-system requirement |

## 13. Cost / Spend Protection Recommendations

The current spend-control configuration was not exposed in the inspected project response, so it should be verified in the Vercel dashboard. Do not invent a dollar cap without a billing baseline.

Configure the following (**P2**):

1. Establish a monthly team/project budget from the first normal Pro billing baseline, not from a guessed amount.
2. Create percentage notifications at **50%, 75%, 90%, and 100%** of that budget.
3. Notify the application owner and at least one technical backup; use a shared operational mailbox if available.
4. Review alerts monthly for the first three Pro billing cycles, then quarterly if usage is stable.
5. Watch Functions invocations, Active CPU/GB-hours, Fast Data Transfer, build usage, Image Optimization, Web Analytics/Speed Insights events, and any later cache/ISR usage.
6. Pair spend anomalies with route-level request counts and duration logs before changing architecture.

Likely Vercel cost drivers are dynamic page/API invocations, AI/document processing compute, reminder/notification fan-out, file/PDF transfer, image optimization, and frequent production/preview builds. OpenAI token/embedding charges are **OpenAI spend**; database/API/storage/egress are **Supabase spend**; email/SMS are **Brevo spend**. They should have separate provider alerts and should not be attributed to Vercel merely because a Vercel function initiated them. See [Vercel spend management](https://vercel.com/docs/spend-management).

## 14. Vercel Security Findings

### P1: Preview and Production share privileged environment entries

The same Vercel environment entries target both Preview and Production for at least:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- web-push public/private key material and subject
- Turnstile keys
- `BREVO_API_KEY` and email sender/reply-to configuration

This permits Preview server code to use production service-role authority and production notification services. SSO protection and Git-fork protection reduce who can invoke a Preview URL, but they do not prevent buggy Preview code or an authorized preview user from reaching production data/services.

**Recommendation:** create a separate non-production Supabase project and non-production notification identities for Preview, or remove privileged provider variables from Preview wherever the preview does not require them. At minimum, `SUPABASE_SERVICE_ROLE_KEY`, Brevo, and web-push private material must not be shared casually. Preserve Production values and test the Preview boundary before changing branch/deployment workflows. This is a dashboard/environment remediation, not an application deployment, but it may require a separate non-production Supabase/provider setup and explicit owner authorization.

### Other Vercel security conclusions

- No service-role secret was found in a `NEXT_PUBLIC_*` variable or directly referenced from a client component. Service-role references occur in server routes/server libraries.
- Public client code uses the Supabase URL and anon key, which is the intended Supabase browser model; Row Level Security remains the database boundary.
- SSO protection is enabled for non-custom-domain deployments, and Git-fork protection is enabled. Retain both.
- Production custom domains are public by design. The generated deployment URLs are protected under the current policy.
- The View-As host receives a restrictive CSP, no-store headers, mutation blocking, and allow-listed routes. Do not weaken this boundary for caching.
- No custom WAF rule is currently justified by observed abuse. Automatic DDoS mitigation remains active as part of Vercel’s baseline.

## 15. Recommended Changes

| Priority | Recommendation | Why / acceptance gate | Code change? |
|---|---|---|---:|
| **P1** | Separate Preview from Production service-role and notification-provider credentials | Prevent Preview code from holding production administrative/data-send authority; verify Preview with non-production resources before removing access | No LMS code necessarily; dashboard/provider setup |
| **P2** | Add explicit OpenAI, Brevo, SMS, and web-push timeouts plus route-level total budgets | Prevent a stalled dependency from consuming the full 300-second function window; return controlled errors | Yes |
| **P2** | Add structured duration/result logging to AI documents/answers, ratings import, PBCC reminders/actions, tournament actions, standings rebuild, and bulk communication | Current logs establish health but not route phase latency; needed before tuning duration/memory | Yes |
| **P2** | Instrument Speed Insights and verify Web Analytics data | Establish real-user performance evidence; project currently reports no Speed Insights data | Yes, small reviewed release |
| **P2** | Replace AI Insights broad table loads with scoped aggregates/pagination | Reduce data transfer, memory, truncation risk, and Supabase/Vercel work | Yes; possibly reviewed RPC |
| **P2** | Make standings compensation/rebuild set-based and transactional | Remove sequential network writes and partial-update risk | Yes + reviewed database function/migration |
| **P2** | Test a maintained `web-push` upgrade/replacement | Remove the exact `url.parse()` dependency warning after notification regression testing | Dependency/code release |
| **P2** | Configure Vercel budget percentage alerts and recipients | Limit surprise Pro usage without guessing a dollar amount | Dashboard only |
| **P3** | Split AI PDF processing from document list/metadata operations after measuring cold starts | Avoid loading PDF worker code for operations that do not process a PDF | Yes |
| **P3** | Consider narrow caching for public settings/VAPID key with explicit invalidation | Small latency/invocation reduction; current traffic makes benefit minor | Yes |
| **P3** | Propagate disconnect cancellation to read-only AI/provider work | Avoid wasted work after the caller leaves; exclude already-started business writes | Yes |
| **P3** | Consider rolling releases/WAF rules only when a measured release or abuse case warrants them | Avoid complexity and untested rate limits | Dashboard/release process |

## 16. Changes Not Recommended

- Do **not** raise global `maxDuration` or set every route to 800 seconds.
- Do **not** disable Fluid Compute; it is already enabled and fits network-waiting workloads.
- Do **not** change `iad1`, add `preferredRegion`, or introduce multi-region execution.
- Do **not** switch these routes to Edge runtime; Node dependencies and an east-region database make that counterproductive.
- Do **not** increase function memory without an observed memory/CPU bottleneck.
- Do **not** add a PostgreSQL connection pool; Supabase JS already uses HTTP APIs.
- Do **not** aggressively cache authenticated, private, View-As, score, roster, ratings, PBCC, tournament, or other live operational data.
- Do **not** remove `headers()` from the root layout merely to make pages static; it enforces host-specific View-As composition.
- Do **not** add Vercel Cron without a defined operational scheduling requirement.
- Do **not** suppress the `url.parse()` warning or patch `node_modules`; validate a dependency upgrade separately.
- Do **not** enable custom firewall limits without observing traffic and testing them in log/staged mode.
- Do **not** add Observability Plus, log drains, or enterprise networking merely because Pro features exist.

## 17. Suggested Implementation Order

1. **Environment isolation gate (P1):** design Preview resources, inventory which Preview workflows truly need privileged access, then separate Production service-role/Brevo/push secrets. This should be reviewed as security infrastructure work and must not mutate production business data.
2. **Cost guardrail (P2):** configure budget-percentage alerts and named recipients from the actual Pro baseline.
3. **Measurement release (P2):** instrument Speed Insights and structured route/phase duration logs. Verify no sensitive request/response content enters logs.
4. **Provider-boundary release (P2):** add explicit OpenAI/Brevo/SMS/web-push timeouts and total budgets, with focused failure-path tests.
5. **Data-efficiency work (P2):** independently review AI Insights aggregation and transactional standings rebuild. The latter requires database review and recovery evidence.
6. **Dependency release (P2):** test the web-push upgrade/replacement and notification delivery before deployment.
7. **Optional optimization (P3):** use collected latency/cold-start evidence to decide whether to split PDF processing or cache low-risk public settings.
8. **Conditional platform features (P3):** revisit rolling releases, WAF rules, and longer log retention only if a measured need appears.

### Final decision table

| Item | Current State | Recommendation | Priority | Code Change? |
|---|---|---|---|---:|
| Fluid Compute | Enabled | Retain | NO CHANGE | No |
| `maxDuration` | Inherits effective 300s | Retain; add internal provider budgets | NO CHANGE / P2 timeouts | Timeout work only |
| `preferredRegion` | None; project runs `iad1` | Retain `iad1` with Supabase `us-east-1` | NO CHANGE | No |
| Function memory | Standard | Retain | NO CHANGE | No |
| Preview credentials | Privileged entries shared with Production | Separate Preview service-role and send-provider credentials | **P1** | Usually dashboard/provider setup |
| Spend alerts | Not verifiable from inspected project response | Add 50/75/90/100% alerts and named recipients | **P2** | No |
| Observability | Runtime logs/error clusters available; route timing sparse | Add structured timing; use longer retention only if needed | **P2** | Yes for timing |
| Speed Insights | No data; package/component absent | Instrument and verify | **P2** | Yes |
| Web Analytics | Enabled | Verify production data arrival | NO CHANGE | No unless instrumentation is missing |
| Rolling releases | Not configured | Consider only for unusually high-risk releases | P3 | No |
| Deployment protection | SSO except custom domains; Git-fork protection on | Retain | NO CHANGE | No |
| Caching | Predominantly dynamic/live | Retain; only narrow public-settings/key optimization later | NO CHANGE / P3 | Optional |
| Cold starts | No failure evidence; PDF route is largest | Measure, then optionally split processing route | P3 | Optional |
| `url.parse()` warning | `web-push@3.6.7`; successful requests | Test maintained dependency/replacement | **P2** | Yes/dependency |
| API/provider timeouts | Mixed; several OpenAI/Brevo/push calls unbounded | Add bounded calls and overall budgets | **P2** | Yes |
| Ratings import | App 30s; DB 20s; Vercel 300s | Retain | NO CHANGE | No |
| Supabase pooling | No persistent pool; HTTP clients | No pooling change | NO CHANGE | No |
| WAF/rate limiting | No custom rules; no abuse evidence | Observe first; stage targeted rules only if needed | P3 | No |

**Immediate code change necessary?** No. Production availability does not require an emergency code release. The P1 environment-isolation issue is a dashboard/provider security boundary and should be planned promptly.

**Should a Vercel dashboard setting be changed?** Yes: separate Preview privileged credentials from Production and configure spend alerts. Do not change Fluid, duration, memory, or region.

**Should anything be deployed now?** No. This audit authorizes and performs no deployment.

**Is staying exactly as-is safe?** The accepted production release is operationally healthy, and its compute/duration/region settings are safe to retain. Staying exactly as-is indefinitely is **not** the recommended security posture because Preview currently holds production service-role and notification-provider credentials, and real-user performance/route timing evidence is limited. Address the P1 isolation issue first; implement P2 improvements only as separately reviewed releases.
