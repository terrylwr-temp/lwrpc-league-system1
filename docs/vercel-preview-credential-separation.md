# Vercel Preview / Production Credential Separation

**Checkpoint date:** 2026-09-22  
**Project:** `lwrpc-admin`  
**Accepted Production:** LMS-0755 / 0.1.578, commit `cab2a8127779fcddc3455dafb762f4479aa5f457`, deployment `dpl_GSqHMdNV4qfudbin18nTY77K2sGK`  
**Status:** **P1 credential-separation cleanup complete — all credential-bearing legacy Previews retired; `WEB_PUSH_PRIVATE_KEY` remains a separate deferred VAPID item**

No secret value is included in this report. No application code, Supabase configuration, business data, email template, or Production deployment was changed.

## 1. Reason for change

The Vercel Pro audit found that generic Preview deployments received the same Supabase service-role and notification-provider credentials as Production. Deployment protection limits who can reach Preview URLs but does not prevent Preview server code from holding Production administrative or notification authority.

The required boundary is:

- Production retains its real privileged credentials.
- Future Preview deployments do not receive Production service-role, provider-send, web-push private, or cron credentials.
- Public Supabase configuration remains available to Preview so normal browser authentication and RLS-governed reads can work.
- Missing privileged credentials fail closed without a global application crash.

## 2. Environment variable inventory by name and scope

The baseline below was captured before any change. Vercel exposed no Development-targeted project variables.

| Group | Variable | Baseline scope | Vercel type | Repository purpose |
|---|---|---|---|---|
| A. Privileged server credentials | `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Sensitive | Supabase administrative client for authorized server reads/writes |
| A. Privileged server credentials | `CRON_SECRET` | Production, Preview | Sensitive | Bearer credential for PBCC and match-setup reminder invocations |
| A. Privileged server credentials | `AI_QUALITY_HMAC_KEY` | Production | Sensitive | Server-only AI quality grouping/signing material |
| A. Privileged server credentials | `AI_QUALITY_HMAC_KEY_VERSION` | Production | Sensitive | AI quality signing-key version selector |
| A. Privileged server credentials | `VIEW_AS_ENCRYPTION_KEY` | Production | Sensitive | View-As server-side encryption/signing boundary |
| B. Public/browser-safe variables | `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Sensitive metadata flag | Public Supabase project URL used by browser and server clients |
| B. Public/browser-safe variables | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Sensitive metadata flag | Public/RLS-governed Supabase browser key |
| B. Public/browser-safe variables | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Production, Preview | Sensitive metadata flag | Public Turnstile widget site key |
| B. Public/browser-safe variables | `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` | Production, Preview | Sensitive metadata flag | Browser-visible VAPID public key |
| B. Public/browser-safe variables | `WEB_PUSH_PUBLIC_KEY` | Production, Preview | Sensitive metadata flag | Server copy/fallback of the public VAPID key |
| C. Notification/email credentials | `BREVO_API_KEY` | Production, Preview | Sensitive | Authorizes real Brevo email and SMS delivery |
| C. Notification/email credentials | `WEB_PUSH_PRIVATE_KEY` | Production, Preview | Sensitive | Authorizes web-push delivery for the configured VAPID identity |
| C. Notification/email configuration | `BREVO_FROM_EMAIL` | Production, Preview | Sensitive metadata flag | Email sender address; cannot send without the API key |
| C. Notification/email configuration | `BREVO_FROM_NAME` | Production, Preview | Sensitive metadata flag | Email sender display name |
| C. Notification/email configuration | `BREVO_REPLY_TO_EMAIL` | Production, Preview | Sensitive metadata flag | Reply-to address |
| C. Notification/email configuration | `BREVO_SMS_SENDER` | Production | Sensitive | Production SMS sender identity |
| C. Notification/email configuration | `BREVO_SMS_ORGANIZATION_PREFIX` | Production | Sensitive | Production SMS organization prefix |
| C. Notification/email configuration | `WEB_PUSH_SUBJECT` | Production, Preview | Sensitive metadata flag | Public VAPID contact subject; cannot send without private key |
| D. AI/API credentials | `OPENAI_API_KEY` | Production | Sensitive | Authorizes OpenAI embeddings and generation; creates paid usage |
| D. AI/API configuration | `LWR_AI_ENABLED` | Production | Encrypted | Enables the Production AI workflow |
| E. Miscellaneous configuration | `TURNSTILE_SECRET_KEY` | Production, Preview | Sensitive | Server-side Turnstile challenge verification; does not grant LMS data or notification authority |
| E. Miscellaneous configuration | `LMS_ORIGIN` | Production | Encrypted | Canonical LMS origin |
| E. Miscellaneous configuration | `VIEW_AS_ORIGIN` | Production | Encrypted | Isolated View-As origin |

Repository aliases/fallbacks were also checked. The code recognizes `SUPABASE_SERVICE_KEY`, `SUPABASE_SERVICE_ROLE`, `SERVICE_ROLE_KEY`, `SUPABASE_URL`, `PBCC_REMINDER_SECRET`, and `MATCH_SETUP_REMINDER_SECRET`, but none was configured in the Vercel project. Therefore, Preview has no alias that can silently restore Production service-role or cron authority after the primary entries are removed.

Other environment names found only in scripts/tests or with code defaults are not Vercel project entries and do not form a Preview credential path.

## 3. Variables classified Production-only

| Variable | Classification | Reason |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **PRODUCTION ONLY** | Bypasses ordinary RLS and authorizes privileged server operations against the Production Supabase project |
| `BREVO_API_KEY` | **PRODUCTION ONLY** | Can send real email/SMS and consume provider usage |
| `WEB_PUSH_PRIVATE_KEY` | **PRODUCTION ONLY** | Can send push messages under the Production VAPID identity |
| `CRON_SECRET` | **PRODUCTION ONLY** | Authorizes operational reminder entry points |
| `OPENAI_API_KEY` | **PRODUCTION ONLY — already correct** | Paid provider key; Preview AI is not currently provisioned |
| `AI_QUALITY_HMAC_KEY` / `AI_QUALITY_HMAC_KEY_VERSION` | **PRODUCTION ONLY — already correct** | Production server signing/grouping material |
| `VIEW_AS_ENCRYPTION_KEY` | **PRODUCTION ONLY — already correct** | Production isolation/encryption boundary |
| `BREVO_SMS_SENDER` / `BREVO_SMS_ORGANIZATION_PREFIX` | **PRODUCTION ONLY — already correct** | Production sender configuration |

`LMS_ORIGIN`, `VIEW_AS_ORIGIN`, and `LWR_AI_ENABLED` were already Production-only and were not changed.

## 4. Variables retained in Preview

| Variable/group | Classification | Reason |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **SAFE FOR PREVIEW** | Supabase project URL is public configuration; access remains governed by anon/auth roles and RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **SAFE FOR PREVIEW** | Intended browser key; it is not service-role authority |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **SAFE FOR PREVIEW** | Browser-visible site key |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PUBLIC_KEY` | **SAFE FOR PREVIEW** | Public keys cannot send without `WEB_PUSH_PRIVATE_KEY` |
| `WEB_PUSH_SUBJECT` | **SAFE FOR PREVIEW** | Contact metadata, not sending authority |
| Brevo from/name/reply-to settings | **SAFE FOR PREVIEW without API key** | They do not authorize provider calls without `BREVO_API_KEY` |
| `TURNSTILE_SECRET_KEY` | **REVIEW BEFORE CHANGING; retained** | Verifies anti-bot challenges and supports Preview flows; it does not access Production data or send notifications |

## 5. Variables needing separate Preview credentials

No separate Preview credential was found.

If privileged Preview workflows are later required, provision all of the following as an independently authorized project:

- a separate non-production Supabase project and service-role credential;
- a Brevo sandbox/test credential and non-member recipients;
- a separate Preview VAPID key pair;
- a Preview-only cron secret and explicitly configured Preview caller.

None was created because the task expressly prohibited new projects, paid resources, manufactured credentials, and copying Production secrets to Preview.

## 6. Vercel scope changes made

The documented CLI form `vercel env rm <name> preview` was used for the four multi-target entries. In this project/CLI behavior, that command deleted each whole multi-target entry rather than removing only its Preview target. Vercel audit events explicitly record that each deletion removed a variable that “was in Production and Preview.”

Recovery actions were then limited to verifiable existing sources:

| Variable | Baseline | Current project metadata | Recovery status |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | **Production only** | Restored from the existing gitignored `.env.local` snapshot, which was newer than the last Vercel update |
| `BREVO_API_KEY` | Production, Preview | **Production only** | Restored from the same newer gitignored snapshot |
| `WEB_PUSH_PRIVATE_KEY` | Production, Preview | **Absent in every scope** | Existing private value was not recoverable; controlled VAPID rotation remains deferred |
| `CRON_SECRET` | Production, Preview | **Production only** | Owner restored the existing working value from Supabase Vault; value was not displayed, retrieved, copied, or changed during this verification |

The current running Production deployment is immutable and still has the four values captured when it was built. Current Vercel project metadata now guarantees that future Production deployments receive `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, and `CRON_SECRET`, while new Preview deployments receive none of those three. `WEB_PUSH_PRIVATE_KEY` remains absent, so future Production web-push delivery is the only credential-dependent function still not ready for redeployment.

No value was overwritten with an empty string. No Preview value was added. No Development scope was changed.

### Current metadata checkpoint

This checkpoint inspected names, targets, types, and presence only. No credential value was requested or displayed.

| Variable | Present | Current targets | Metadata conclusion |
|---|---:|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Production only | Future Production receives it; new Preview and Development do not |
| `BREVO_API_KEY` | Yes | Production only | Future Production receives it; new Preview and Development do not |
| `CRON_SECRET` | Yes | Production only | Future Production receives it; new Preview and Development do not |
| `WEB_PUSH_PRIVATE_KEY` | No | None | Sole unresolved credential item |
| `WEB_PUSH_PUBLIC_KEY` | Yes | Production, Preview | Public VAPID configuration retained separately; value not inspected |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` | Yes | Production, Preview | Browser-visible public VAPID configuration retained separately; value not inspected |

## 7. Preview verification

One clean Preview was built from an exact archive of accepted commit `cab2a8127779fcddc3455dafb762f4479aa5f457`; it was not promoted:

- deployment: `dpl_6V5EpUZzdnuxF4Q7ffzLdQ1RG5At`;
- URL: `lwrpc-admin-5rfb7ej86-terry-lwrpc.vercel.app`;
- created: 2026-09-22 12:34:13 UTC;
- state/target: `READY` / Preview;
- rendered version: LMS-0755;
- browser result: sign-in page rendered normally and browser console contained no warnings or errors.

Read-only, unauthenticated endpoint checks confirmed the intended fail-closed behavior without submitting credentials, executing a reminder, sending a notification, or writing business data:

- `/api/app-notifications/public-key` returned success with `configured: false`; a public key was available, but its value was neither recorded nor displayed;
- `/api/pbcc/reminders` returned HTTP 401 before acquiring privileged data access;
- `/api/match-setup-reminders` returned HTTP 500 because the service-role configuration is intentionally absent in Preview; no reminder logic ran;
- browser authentication configuration remained available and the login form rendered, but no real account login was attempted because credentials and authentication side effects were outside this read-only scope.

Code-path review and the clean deployment establish the fail-closed behavior:

- Supabase service-role clients are instantiated lazily inside server operations, not globally at import time.
- Missing service-role configuration returns controlled JSON configuration errors from privileged routes; it does not crash the root layout or browser Supabase client.
- Browser authentication uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which remain in Preview.
- Missing `BREVO_API_KEY` causes email/SMS helpers to return a skipped/missing-configuration result without calling Brevo.
- Missing `WEB_PUSH_PRIVATE_KEY` makes App Notifications report `configured: false`; sends are skipped before web-push is configured.
- Missing `CRON_SECRET` in Preview causes cron bearer authorization to fail closed. No fallback cron secret is configured.

### Old-Preview risk review and retirement

The retirement inventory identified exactly five legacy Preview deployments created before credential separation. All five were `READY`, had Preview target metadata (`target: null`), came from non-main branches, served no Production/custom domain, and were not the documented Production rollback target. Because deployment environment snapshots are immutable, each could have retained the former Preview-scoped copies of `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `CRON_SECRET`, and `WEB_PUSH_PRIVATE_KEY`.

The documented rollback target was separately confirmed as LMS-0754 deployment `dpl_36FKQJ5hyceQmwFdEztoVxNVMVXg`, `READY` / Production. It was protected along with current Production and the clean Preview.

| Legacy deployment | Created UTC | Branch / commit | State before | Active alias before retirement | Production/custom domain | Rollback target | Predates separation / could contain prior credentials | Result |
|---|---|---|---|---|---|---|---|---|
| `dpl_BsKFCZWgt6NCf6QhBuenPxnEPqyt` | 2026-08-29 15:47:23 | `vercel/install-vercel-web-analytics-riwurk` / `d74d2fa03cbe38367a7a5a3b2c87cc0168e9e93c` | `READY` | `lwrpc-admin-git-vercel-install-vercel-web-an-a421cc-terry-lwrpc.vercel.app` | None | No | Yes / Yes | Deleted; deployment URL now HTTP 404 |
| `dpl_CtP8KbEkgfbPe4vxXZYVoEt2E479` | 2026-07-19 01:38:01 | `codex/admin-sidebar-cleanup` / `e2b9a4b6a114845ac6b009b5910a218c95c2c05e` | `READY` | `lwrpc-admin-git-codex-admin-sidebar-cleanup-terry-lwrpc.vercel.app` | None | No | Yes / Yes | Deleted; deployment URL now HTTP 404 |
| `dpl_URNys4qyQFK1UwCUgH9baxWBrKHK` | 2026-07-19 01:26:56 | `codex/shared-admin-shell` / `16a70947c1dd28f56d086f0c2791df1a57362e67` | `READY` | `lwrpc-admin-git-codex-shared-admin-shell-terry-lwrpc.vercel.app` | None | No | Yes / Yes | Deleted; deployment URL now HTTP 404 |
| `dpl_3wZafMGryZ5aG6k1YgNk2iY9jVHf` | 2026-07-19 00:57:54 | `codex/shared-admin-shell` / `d24b5e55cf138dcdf09ef924ee5dee10ede81777` | `READY` | None active; deployment metadata retained the superseded branch alias | None | No | Yes / Yes | Deleted; deployment URL now HTTP 404 |
| `dpl_6cEfdSGEimd8kj5m3JUUCrFaPBGh` | 2026-07-18 23:03:36 | `codex/dashboard-design-preview` / `1d90b2eee5db96f0ef2a1bd990d4f82edd15c80b` | `READY` | `lwrpc-admin-git-codex-dashboard-design-preview-terry-lwrpc.vercel.app` | None | No | Yes / Yes | Deleted; deployment URL now HTTP 404 |

Each deletion used Vercel's deployment removal mechanism and was followed immediately by the full protection gate. After every deletion:

- Production remained `dpl_GSqHMdNV4qfudbin18nTY77K2sGK`, `READY`, and HTTP 200;
- all five Production aliases, including `league.lwrpickleballclub.com` and `view-as.lwrpickleballclub.com`, remained on that same deployment;
- clean Preview `dpl_6V5EpUZzdnuxF4Q7ffzLdQ1RG5At` remained `READY`;
- the newest deployment remained the clean Preview, proving no new deployment was created;
- the 22-entry Vercel environment metadata fingerprint remained unchanged.

Final Vercel inventory contains exactly one Preview deployment: the protected clean Preview. No legacy deployment ID or legacy alias remains, and all five retired immutable URLs return HTTP 404. Therefore the count of publicly reachable legacy Previews that may contain the former privileged environment is **zero**.

## 8. Production verification

The current accepted Production deployment was verified after the configuration work:

- deployment `dpl_GSqHMdNV4qfudbin18nTY77K2sGK` remains `READY` / `production`;
- commit remains `cab2a8127779fcddc3455dafb762f4479aa5f457`;
- `https://league.lwrpickleballclub.com/` returned HTTP 200;
- the PBCC scheduler continued to POST `/api/pbcc/reminders` every 15 minutes with HTTP 200 at 11:45, 12:00, 12:15, and 12:30 UTC on 2026-09-22;
- no Production redeployment or promotion occurred.

Future Production deployment metadata is currently sufficient for Supabase service-role, Brevo API access, and cron authorization. It remains insufficient only for web push because `WEB_PUSH_PRIVATE_KEY` is absent. Production deployment remains held pending an explicit VAPID recovery/rotation decision.

## 9. Secret exposure assessment

- No service-role credential is stored under a `NEXT_PUBLIC_*` name.
- Privileged environment references occur in server routes/libraries; no privileged name was found in the generated client static bundle.
- The exact locally available Supabase service-role and Brevo API values appeared in zero tracked files and zero generated client static bundles.
- `.env.local` is gitignored and was not modified.
- Repository source contains variable names and controlled missing-configuration messages, not secret contents.
- No secret value was printed to terminal output, documentation, a command argument, a commit, or a screenshot during this task.
- There is no evidence that a privileged value was exposed to an unauthorized client or party. The finding remains “available to authorized Vercel Preview server execution,” not confirmed exfiltration.

## 10. Rotation recommendation

Routine rotation is **not currently required** because no unauthorized/client exposure was found. Scope separation is the appropriate remediation.

The existing `CRON_SECRET` was recovered from Supabase Vault and restored as Production-only, so cron rotation is not required.

The original `WEB_PUSH_PRIVATE_KEY` was not recovered. A controlled VAPID rotation is required before future Production web-push delivery can be relied on. Rotation remains deferred by owner instruction; changing the VAPID identity may require existing browsers to resubscribe and needs a separately authorized application/acceptance plan.

## 11. Remaining follow-up items

### Remaining credential item

1. `WEB_PUSH_PRIVATE_KEY` is absent and is the only unresolved credential item.
2. Do not deploy Production until the owner either authorizes controlled VAPID rotation or explicitly accepts that web-push delivery will be unavailable on the next Production deployment.

### Completed legacy deployment cleanup

1. Five legacy Preview deployments were identified and all five were deleted.
2. Zero legacy deployments required protection instead of deletion.
3. Zero publicly reachable legacy Preview deployments remain.
4. The new clean Preview remains `READY` and has none of the three restored privileged credentials.

### Final credential table

| Credential / Group | Before | After | Preview Behavior | Production Impact |
|---|---|---|---|---|
| Supabase service role | Production + Preview | Production only, restored | Future Preview has no service-role path; privileged routes fail closed | Current and future Production entry present |
| Brevo API key | Production + Preview | Production only, restored | Future Preview cannot call Brevo; sends skip | Current and future Production entry present |
| Web-push private key | Production + Preview | **Absent; controlled rotation deferred** | New Preview cannot send push | Current deployment retained its build-time value; future Production push would be unavailable, so deployment is held |
| Cron secret | Production + Preview | **Production only, restored from existing Vault value** | New Preview cannot authenticate cron requests | Current and future Production credential present; no rotation required |
| Public Supabase URL/anon key | Production + Preview | Unchanged | Browser auth/RLS reads remain possible | None |
| Public VAPID keys/subject | Production + Preview | Unchanged | Public metadata only; `configured: false` without private key | None on current deployment |
| Brevo sender metadata | Production + Preview | Unchanged | Cannot send without API key | None |
| Turnstile site/secret keys | Production + Preview | Unchanged | Challenge verification remains available | None |
| OpenAI API key | Production only | Unchanged | Preview AI key unavailable | None |

**Did any code change?** No.  
**Did any Production deployment occur?** No.  
**Did any deployment occur during legacy cleanup?** No; the newest deployment before and after cleanup remained clean Preview `dpl_6V5EpUZzdnuxF4Q7ffzLdQ1RG5At`.  
**Did any business data change?** No.  
**Were any real notifications sent?** No.  
**Is credential rotation necessary?** Cron rotation is not required. Controlled VAPID rotation is required because the original private key is unrecoverable, but remains deferred.  
**How many legacy Previews were identified / deleted / protected instead?** 5 / 5 / 0.  
**Does any legacy Preview credential risk remain?** No publicly reachable legacy deployment or alias remains; risk count is zero.  
**Production deployment before / after cleanup:** `dpl_GSqHMdNV4qfudbin18nTY77K2sGK` / `dpl_GSqHMdNV4qfudbin18nTY77K2sGK`; `READY`, HTTP 200.  
**Are there remaining P1 credential-separation items?** No legacy Preview cleanup item remains. `WEB_PUSH_PRIVATE_KEY` is the only unresolved credential and is explicitly deferred to the separate VAPID rotation task.
