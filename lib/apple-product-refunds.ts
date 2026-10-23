import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { ResponseBodyV2DecodedPayload } from "@apple/app-store-server-library";
import { verifyAppleSignedTransaction, type AppleIapEnvironment } from "./apple-iap-server";

const products = new Set([
  "tetamo.owner.basic", "tetamo.owner.priority", "tetamo.owner.featured",
  "tetamo.boost.listing", "tetamo.homepage.spotlight",
]);

// Called only after the outer Apple notification signature has been verified.
export async function reconcileAppleProductRefund(input: {
  environment: AppleIapEnvironment;
  notification: ResponseBodyV2DecodedPayload;
}) {
  const { notification, environment } = input;
  if (notification.notificationType !== "REFUND" && notification.notificationType !== "REVOKE") return null;
  const signed = notification.data?.signedTransactionInfo;
  if (!signed) throw new Error("Apple refund is missing its signed transaction.");
  const transaction = await verifyAppleSignedTransaction(signed, environment);
  if (!products.has(String(transaction.productId))) return null;
  if (!transaction.transactionId || !transaction.revocationDate) {
    throw new Error("Apple refund has no verified transaction revocation.");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Apple refund database is not configured.");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: payment, error } = await admin.from("payment_transactions")
    .select("id").eq("metadata->>apple_transaction_id", transaction.transactionId)
    .eq("metadata->>gateway", "apple").maybeSingle();
  if (error) throw error;
  // Retry instead of acknowledging a notification that raced payment persistence.
  if (!payment) return { handled: false, retry: true, reason: "apple-product-refund-payment-not-found" };
  const { data: result, error: updateError } = await admin.rpc("reconcile_apple_product_refund", {
    p_payment_id: payment.id,
    p_refund: { transactionId: transaction.transactionId, notificationUUID: notification.notificationUUID,
      revocationDate: transaction.revocationDate, revocationReason: transaction.revocationReason,
      reconciledAt: new Date().toISOString() },
  });
  if (updateError) throw updateError;
  if (result?.reviewRequired) console.error("Apple product refund requires entitlement review", { paymentId: payment.id });
  return { handled: !!result?.matched, retry: !result?.matched,
    reason: result?.reviewRequired ? "apple-product-refund-review-required" : "apple-product-refund-reconciled" };
}
