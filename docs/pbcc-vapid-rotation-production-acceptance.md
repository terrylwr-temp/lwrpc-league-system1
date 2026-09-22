# LMS-0756 / 0.1.579 — PBCC VAPID rotation production acceptance

Date: September 22, 2026

## Release identity

| Item | Accepted value |
| --- | --- |
| Version | `LMS-0756 / 0.1.579` |
| Release commit | `755177c56acaa6244eb650c22db9dd1894da1798` |
| Commit message | `LMS-0756 rotate PBCC VAPID subscriptions safely` |
| Vercel deployment | `dpl_AVnoqaaCjucKNTgKmUsKFqKUG3Bd` |
| Immutable deployment | `https://lwrpc-admin-2osz8eswx-terry-lwrpc.vercel.app` |
| Production domain | `https://league.lwrpickleballclub.com` |
| Vercel state | `READY`, Production target, aliases assigned |
| Previous application | `LMS-0755 / 0.1.578` |
| Previous deployment | `dpl_GSqHMdNV4qfudbin18nTY77K2sGK` |

The GitHub push of the exact release commit created the normal Vercel Git deployment. Vercel reports the matching full commit SHA, `main` branch, Git source, Production target, READY state, and both `league.lwrpickleballclub.com` and `view-as.lwrpickleballclub.com` aliases. The deployment was created at 16:01:14 UTC and became READY at 16:02:05 UTC.

## Credential gate

Vercel environment metadata, and only metadata, was inspected before migration and deployment:

- `WEB_PUSH_PRIVATE_KEY` is present only in Production and is excluded from Preview and Development. The owner confirmed it is Sensitive.
- `WEB_PUSH_PUBLIC_KEY` is present in Production and Preview.
- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` is present in Production and Preview.
- The owner confirmed that the two public variables are identical and match the new private key.

No VAPID value was retrieved, displayed, copied, logged, or written by this acceptance work.

## Database migration

The reviewed additive migration `20260922131117_app_notification_vapid_key_id.sql` was applied once through the Supabase migration API. Supabase recorded it as remote migration `20260922160002 app_notification_vapid_key_id`.

It added only nullable text column `public.app_notification_subscriptions.vapid_key_id`. It performed no insert, update, delete, backfill, status change, or subscription conversion. The existing rows retained their enabled state and a null key identifier. The security and performance advisor category/count baseline was unchanged after application.

Nineteen protected LMS table counts and fingerprints and ten PBCC operational table counts and fingerprints matched the pre-migration baseline immediately after application. Fresh whole-row snapshots at 16:11:44 UTC and again at 16:16:14 UTC, after the first natural Production reminder run, matched exactly for all 29 tables. No protected LMS or PBCC business row changed during deployment and acceptance.

## Release gates

| Gate | Result |
| --- | --- |
| Focused VAPID rotation tests | **13/13 PASS** |
| Full automated suite | **1,456/1,456 PASS**, 0 failed/skipped/cancelled/todo |
| Lint | **PASS**, 0 errors and 11 existing warnings; none in LMS-0756 files |
| Production build | **PASS**, Next.js 16.2.4, 84/84 static pages |
| Diff/whitespace check | **PASS** |
| Preview safety gate | **PASS**, READY Preview has public keys but no private VAPID key or privileged Production credentials |

Focused coverage proves server-only derivation of the non-secret public-key identifier, public/private configuration requirements, public-key consistency, null/stale delivery exclusion, SMS fallback, byte-level browser comparison, ordered stale-subscription migration, safe migration failure, no automatic opt-in, manual enable behavior, idempotent schema application, and the existing View-As/private-output boundaries.

## Production application checks

- The Production login page visibly reports `LMS-0756` and produced zero browser console warnings or errors.
- `/api/app-notifications/public-key` returns `success=true` and `configured=true` with a public key present.
- Its response fields are limited to `success`, `configured`, and `publicKey`; no private-key field or private environment-variable name is exposed.
- Vercel reports no runtime-error clusters during the release and acceptance window.
- The Production deployment remains READY and the Production aliases remain attached to the LMS-0756 deployment.

The available Commissioner browser session had expired before the deployment. It correctly redirected to the login page, so authenticated normal-LMS and PBCC-page navigation was not claimed or manufactured. The exact application commit nevertheless passed the complete local suite and Production build, and the unauthenticated Production surface and server endpoint checks above passed.

## Reminder health and delivery boundaries

PBCC and Match Setup reminder health was verified from Vercel request metadata only. No cron endpoint was manually invoked and no notification was sent for acceptance.

- PBCC reminder cron: the first natural scheduled request after cutover ran at 16:15:00 UTC against LMS-0756 deployment `dpl_AVnoqaaCjucKNTgKmUsKFqKUG3Bd` and returned HTTP 200. The preceding 15:45 and 16:00 requests against LMS-0755 also returned HTTP 200.
- Match Setup reminder route: 43 Production requests returned HTTP 200 in the preceding 24 hours; the most recent bounded raw-log sample returned HTTP 200. No failed status pattern was observed.
- Push delivery in LMS-0756 requires `enabled=true` and `vapid_key_id` equal to the current server-derived identifier. All existing rows remain null, so no legacy/null row is eligible for new-key push delivery.
- Excluded legacy/null rows remain available to the existing SMS fallback path. Acceptance did not send a real reminder solely for testing.

## Subscription counts and device migration

Only aggregate counts were read; no endpoint, browser key, member identity, phone number, email address, or subscription row detail was retrieved.

| Aggregate | Before migration/deploy | After migration/deploy |
| --- | ---: | ---: |
| Total subscription rows | 17 | 17 |
| Enabled subscriptions | 6 | 6 |
| Distinct enabled PBCC players | 5 | 5 |
| Rows with current-generation metadata | column absent | 0 |
| Rows with null `vapid_key_id` | column absent | 17 |

No authorized subscribed real-device session was available. The only available browser session was signed out and did not expose an existing Production push subscription. Per the approved plan, no device or subscription was manufactured and no permission prompt or test reminder was used. Real-device acceptance therefore remains **pending**: an existing authorized subscribed PBCC device still needs to demonstrate stale-key detection, automatic unsubscribe/resubscribe, and a new subscription carrying the server-derived current `vapid_key_id`.

## Rollback considerations

The database change is additive, nullable, and backward-compatible; do not drop the column during an application rollback. The previous LMS-0755 deployment is retained, but it has the old immutable VAPID environment snapshot. It is not a complete VAPID rollback after any device migrates: it would advertise/send with the old pair, while new-pair subscriptions could fail or be disabled by the old sender. Prefer a forward correction. Treat use of LMS-0755 after device migration begins as a notification-security incident decision, not a routine rollback.

At the acceptance snapshot all 17 subscriptions still have null `vapid_key_id`, so no device has yet migrated to the new generation. No VAPID value, environment setting, subscription state, PBCC business row, score, schedule, roster, or other business data was changed by acceptance. No notification was sent.

## Final status

**LMS-0756 VAPID rotation — PRODUCTION ACCEPTED, REAL-DEVICE MIGRATION PENDING.**

LMS-0756 is READY and serving Production. The credential, migration, deployment, public endpoint, private-key non-exposure, legacy-delivery exclusion, SMS-fallback, aggregate-count, protected-data, runtime-error, and scheduled-route health gates pass. Real-device subscription migration and an authenticated Commissioner page smoke remain explicitly pending because no safe authorized session/device was available.
