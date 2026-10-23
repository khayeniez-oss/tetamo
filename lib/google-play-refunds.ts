import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGooglePlayVoidedPurchases } from "./google-play-server";
import { googleTokenHash } from "./google-play-jobs";

export async function reconcileGoogleProductRefunds(admin: SupabaseClient) {
  let pageToken: string | undefined;
  let matched = 0;
  let reviewRequired = 0;
  for (let page = 0; page < 10; page++) {
    const data = await getGooglePlayVoidedPurchases(pageToken);
    for (const refund of data.voidedPurchases || []) {
      if (!refund.purchaseToken) continue;
      const { data: payment, error } = await admin.from("payment_transactions")
        .select("id").eq("metadata->>google_purchase_token_sha256", googleTokenHash(refund.purchaseToken)).maybeSingle();
      if (error) throw error;
      if (!payment) {
        // Do not guess a listing/customer from a time or price match.
        console.warn("Google Play refund has no matching Tetamo payment", { orderId: refund.orderId });
        continue;
      }
      const { data: result, error: updateError } = await admin.rpc("reconcile_google_play_product_refund", {
        p_payment_id: payment.id,
        p_refund: { orderId: refund.orderId, voidedTimeMillis: refund.voidedTimeMillis, reason: refund.voidedReason, reconciledAt: new Date().toISOString() },
      });
      if (updateError) throw updateError;
      if (result?.matched) matched++;
      if (result?.reviewRequired) reviewRequired++;
    }
    pageToken = data.tokenPagination?.nextPageToken;
    if (!pageToken) return { matched, reviewRequired };
  }
  throw new Error("Google Play refund reconciliation exceeded page limit; follow-up required.");
}
