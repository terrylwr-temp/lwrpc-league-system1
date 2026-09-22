# LMS-0756 PBCC VAPID rotation — local review

Date: September 22, 2026

Release candidate: LMS-0756 / 0.1.579

Starting Production: LMS-0755 / 0.1.578, commit `cab2a8127779fcddc3455dafb762f4479aa5f457`, deployment `dpl_GSqHMdNV4qfudbin18nTY77K2sGK`

## Status

Code, the additive migration, automated tests, the production build, and a fail-closed Preview are complete. Work is intentionally stopped at the owner credential-entry gate. No new VAPID pair has been generated or entered, the Production database migration has not been applied, and LMS-0756 has not been deployed to Production.

The owner-supplied starting Production baseline is six enabled `app_notification_subscriptions` belonging to five distinct PBCC players; one player has two devices. No endpoint, browser key, phone number, email address, private key, or other subscription secret was retrieved or recorded during this work. The old private VAPID key remains unavailable for future deployments.

## Existing behavior and correction

Before LMS-0756, `AppNotificationsButton` treated any existing browser `PushSubscription` as enabled without comparing `subscription.options.applicationServerKey` with the configured public VAPID key. The server also had no metadata identifying which VAPID public key created a stored subscription, so a credential-only rotation could make a stale subscription appear enabled and could cause the sender to try it with the wrong private key.

LMS-0756 adds the following bounded behavior:

- A server-derived SHA-256 identifier of the decoded public VAPID key is stored as non-secret `vapid_key_id`. The private key is not part of the identifier.
- The subscribe route derives the identifier from server configuration. A browser cannot provide or override it.
- Delivery queries select only enabled subscriptions whose `vapid_key_id` equals the current server-derived identifier. Null and different identifiers are excluded from push delivery and therefore remain eligible for the existing SMS fallback.
- A browser with notification permission already granted compares the actual bytes in its existing `applicationServerKey` with the current public key returned by the server. ArrayBuffer, typed-array, missing, and malformed cases fail safely.
- A matching subscription remains unchanged. A stale subscription is disabled server-side, unsubscribed in the browser, recreated with the current public key, and saved through the existing subscribe route.
- A browser with no existing subscription is not automatically opted in. The existing manual enable flow remains user-controlled and uses the current key.
- A failed migration does not report notifications as enabled and tells the user to turn App Notifications on again; SMS fallback remains available.
- Existing recipient validation, service-role boundary, endpoint handling, enabled-state behavior, and View-As mutation rejection remain in place.

`WEB_PUSH_PUBLIC_KEY` remains the preferred server configuration. `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY` is retained as the existing compatibility fallback; current browser behavior obtains the public key from the server endpoint. If both variables are configured, LMS-0756 requires them to be identical before App Notifications are considered configured. Both values are public, but neither may contain the private key.

## Additive database migration

Migration `lwrpc-admin/supabase/migrations/20260922131117_app_notification_vapid_key_id.sql` uses:

```sql
alter table if exists public.app_notification_subscriptions
  add column if not exists vapid_key_id text;
```

The column is nullable. The migration performs no insert, update, delete, backfill, status change, or business-data mutation and is idempotent. Existing rows therefore remain enabled with a null identifier until each device is migrated. No index is added: the current dataset is six enabled subscriptions, and delivery already narrows by the existing recipient phone/email paths before the key-generation predicate. The Production migration has not been applied.

## Verification

- Focused VAPID rotation tests: 13/13 passed.
- Full `npm test`: 1,456/1,456 passed; 0 failed, skipped, cancelled, or todo.
- `npm run lint`: passed with 0 errors and the same 11 pre-existing warnings; none are in LMS-0756 files.
- `npm run build`: passed with Next.js 16.2.4; 84/84 static pages generated.
- `git diff --check`: passed before documentation and is rerun as the final release gate.
- The migration was applied twice to an isolated PGlite database. Both existing rows retained their prior `enabled` values and received null `vapid_key_id` values.

Focused coverage verifies configuration requires a public/private pair, public-key consistency, deterministic public-only key identification, server-only derivation, fake client-ID rejection, current-key delivery filtering, null/stale exclusion, SMS fallback, byte-level browser comparison, no automatic opt-in, unchanged matching subscriptions, the ordered migration sequence, safe migration failure, manual enable, idempotent schema application, and retained View-As/private-output boundaries.

## Safe Preview

Preview deployment `dpl_7mX4yrekaNp1Yt44Qz5FfCzPoR5N` is READY at `https://lwrpc-admin-mrxifyzju-terry-lwrpc.vercel.app` with target `preview`. Its Vercel metadata contains `WEB_PUSH_PUBLIC_KEY` and `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, but does not contain `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, `CRON_SECRET`, or `WEB_PUSH_PRIVATE_KEY`.

The Preview login page visibly reports LMS-0756 and produced zero browser console warnings/errors. `/api/app-notifications/public-key` returned success with a public key present, `configured=false`, and no private-key field. Thus Preview cannot send Production push notifications and its privileged subscribe path remains fail-closed. No login, subscription creation, permission request, notification send, cron invocation, or business-data mutation was performed.

The source-only Preview package excluded dependencies, build output, local environment files, tests, scripts, migrations, and unrelated documentation. It contained no `.env*` files, and hashes of all LMS-0756 runtime files and version manifests matched the verified workspace candidate exactly. Vercel independently rebuilt all 84 pages.

After Preview creation, `league.lwrpickleballclub.com` still resolves to READY Production deployment `dpl_GSqHMdNV4qfudbin18nTY77K2sGK`. The Production and `view-as` aliases did not move, and no Production deployment was created.

## Device migration status

No real device was migrated because the new pair is not configured and LMS-0756 is not in Production. After Production deployment, an existing authorized subscribed device should migrate automatically the next time it opens PBCC with notification permission already granted. Real-device acceptance remains pending and must not be replaced with a manufactured subscription or test reminder.

## Rollback analysis

The retained LMS-0755 deployment `dpl_GSqHMdNV4qfudbin18nTY77K2sGK` contains the old VAPID pair in its immutable environment snapshot. The nullable database column is backward-compatible, so an application rollback does not require dropping the column.

After rotation, however, a normal LMS-0755 application rollback is not a complete VAPID rollback:

- LMS-0755 would advertise its immutable old public key and send with its old private key.
- Legacy subscriptions that still belong to that old pair could work again.
- Subscriptions already migrated to the new pair would not match the old sender and could fail or be disabled by LMS-0755's delivery-error handling.
- A browser opening PBCC under LMS-0755 could observe the old public-key endpoint, while future deployments cannot reconstruct the old pair because the old private key is unavailable.

Rollback after rotation must therefore be treated as a security/notification incident decision, not a routine application rollback. Prefer a forward correction. Restoring the old key pair to a new deployment is not available unless the owner independently recovers that private key.

## Owner credential-entry gate

The owner must now generate one new matched VAPID pair privately and enter it directly in Vercel. Do not paste either key into ChatGPT, Codex, source control, documentation, screenshots, logs, or Supabase.

Required Vercel configuration:

- `WEB_PUSH_PRIVATE_KEY`: the new private key; Production only; marked Sensitive; excluded from Preview and Development.
- `WEB_PUSH_PUBLIC_KEY`: the matching new public key; Production required; Preview permitted.
- `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`: retained for compatibility; set to exactly the same new public key wherever configured; never set it to the private key.

Both public variables must be identical. Changing the environment variables will not alter the currently running immutable Production deployment. Do not deploy Production yet. After the owner confirms only that the matched pair has been entered with these scopes, the next controlled phase is metadata verification, approved migration application, normal GitHub/Vercel Production deployment, and Production/device acceptance.

## Scope confirmation

No VAPID key was generated, printed, retrieved, stored, or rotated. No Vercel environment variable changed. No Production migration or deployment occurred. No subscription, PBCC session, reminder configuration, member/player record, score, schedule, roster, or other business data changed. No notification or reminder was sent.
