# Apple billing safeguards and rollout

Apple purchase verification still uses Apple's signed transaction validation, bundle/environment checks and the original account-bound purchase intent. StoreKit transactions finish only after successful server activation.

## Changes

- Atomic database finalization locks the property, extends the entitlement, records the original entitlement snapshot and marks the receipt complete in one transaction. Receipt persistence failure rolls everything back; duplicate callbacks return the original activation.
- Payment insertion ignores duplicate IDs instead of overwriting a previously completed/refunded receipt with stale metadata.
- App verification requests abort after 20 seconds. Unfinished StoreKit purchases are queried and republished on connection, foreground, sign-in and every minute while active. Background failures remain unfinished without repeated error alerts. Deferred/pending purchases grant nothing.
- Verified REFUND/REVOKE notifications now reconcile one-time listing/add-on payments as well as the existing subscription path. Refunds only restore the exact granted expiry snapshot; legacy receipts or later purchases are flagged for review rather than overwritten. A notification racing payment persistence requests redelivery.

## Rollout

1. Applied migration `20261023044212_apple_product_atomic_activation.sql` to Tetamo Supabase. RPC execution is service-role only. No existing payment or listing records were manually changed.
2. Deploy backend branch while preserving the newer production-only website changes. Confirm production contains the Apple signing credentials and existing notification endpoint configuration.
3. Build and upload iOS build 6 to TestFlight; no automatic submission is configured by this change.
4. Run sandbox purchases for owner packages, boost and spotlight, plus membership purchase/restore. Verify account/intent binding, exact expiry changes and receipt completion.
5. Interrupt network between payment and verification, relaunch/sign in and confirm recovery without a second charge or duration extension.
6. Exercise a sandbox refund and confirm notification delivery, payment status and entitlement reconciliation; exercise later-purchase/legacy cases and handle review flags. Refund reversals need operator review; automatic entitlement restoration is not implemented.

## Evidence and limits

11 backend Apple tests cover atomic rollback, duplicate grants, ownership, cross-store locking, refunds and access restrictions. Four app Apple tests cover recovery, pending/duplicate callbacks and request timeout. Existing Google tests remain green. These are controlled tests, not proof of completed App Store sandbox validation. Google Android version 8 was built before these iOS-only changes and is not yet released.
