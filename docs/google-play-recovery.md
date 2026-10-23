# Google Play listing purchase recovery

This release repairs one-time listing/add-on recovery. It does not reverse refunds
already issued by Google. Existing subscription billing remains unchanged.

## Release order

1. Apply `supabase/migrations/20261023012543_google_play_product_recovery.sql` to
   the Tetamo project. The new queue and both functions are service-role only.
2. Deploy the backend, preserving any production-only changes outside GitHub.
   Keep the existing `CRON_SECRET` configured. The new daily cron is compatible
   with Hobby and is a fallback; use RTDN for timely recovery when the app closes.
3. Configure authenticated Google Play RTDN, then send a test notification.
4. Release the Tetamo Partner Android update containing one-time recovery.
   This requires an Android build and Play release; there is no Expo Updates
   configuration in the current app. Backend release alone cannot change already
   installed Android clients.
5. Run a license-tester purchase, kill the app before its callback finishes,
   reopen it, and verify the same payment/listing is finalized exactly once.
   Simulate a temporary Google API failure in staging and verify server retry.

## Authenticated RTDN setup

Use a Pub/Sub topic in the Google Cloud project associated with Play Console.
Grant `google-play-developer-notifications@system.gserviceaccount.com` Publisher
on that topic only. Create an authenticated push subscription whose endpoint is:

`https://www.tetamo.com/api/google/play/notifications`

Use a dedicated push service account and configure Pub/Sub's service agent to
mint its OIDC tokens using the standard Google authentication setup. Keep this
identity scoped to notification delivery; it does not need database credentials.
Set the following backend environment variables, then redeploy:

- `GOOGLE_PLAY_RTDN_AUDIENCE`: the exact configured push audience (normally the
  endpoint URL above).
- `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`: the dedicated push service account.

In Play Console select notifications for subscriptions **and one-time products**,
enter the topic, and send a test notification. The endpoint verifies Google's JWT
signature, audience, verified email, and package name. It never trusts a listing
ID in the notification. It queries Google for the original profile/intent.
Return 503 asks Pub/Sub to redeliver; data is also persisted for cron recovery.
Do not enable unauthenticated push as a shortcut.

## What is stored

`google_play_product_jobs` stores the original owner/intent/listing, attempt count,
retry deadline, lease, last error and result. A raw Google token exists only while
unfinished and is removed after finalization/rejection. Token hashes support
idempotency and refund matching. Never grant this table to client roles.

The worker leases by property as well as purchase to avoid duplicate extensions.
If a function dies, its lease expires in ten minutes. The original activation
plan is reused on retry. Final payment metadata records consumed/acknowledged
state and `google_finalized_at` only after Google's consume API succeeds.

## Refund reconciliation

The worker queries Google's Voided Purchases API over the last 29 days. The
service account must have Play order/financial access sufficient for this API.
A refund marks the matching payment and queue record refunded. It restores an
entitlement only when its current expiry exactly matches the original grant and
a previous snapshot exists. Later purchases or legacy records require review;
they are never overwritten by guessing. Unmatched order IDs are logged for
investigation. Partial quantity refunds are not requested because current
products are single-quantity purchases.

## Operations

Check pending jobs and `last_error` with a privileged database session. A pending
job older than 24 hours is urgent; the acknowledgement limit is three days from
PURCHASED. The cron reports overdue jobs and refunds requiring review. Persistent
API 401/403 requires correcting the Google Play service-account configuration;
retrying cannot fix revoked permissions. Hobby runs the fallback once daily;
for tighter fallback latency configure a supported authenticated scheduler or
upgrade the existing schedule, without removing RTDN.

The October 19 legacy purchase has no saved payment/token match. Do not attach it
to a listing solely by timestamp; obtain its original purchase token/Google
profile attribution before any manual adjustment.

## Validation and rollback

`npm run test:billing` covers restart recovery, delayed purchases, failed consume,
expired leases, duplicate requests, account/listing attribution, refund safety,
JWT authentication, and client-role denial. Also run TypeScript and production
build checks. A real Play license-tester transaction is required after rollout.

Rollback the application deployment if needed; the additive database objects can
remain in place. Do not drop the queue or discard unfinished tokens during an
incident. Keep the compatible worker running until pending purchases finalize.
