import "server-only";
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGooglePlayOneTimePurchase } from "./google-play-server";
import { processGoogleProductPurchase } from "./google-play-products";

export class GoogleProductInputError extends Error {
  constructor(public status: number) { super("Invalid Google Play purchase context."); }
}

export function googleTokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type ProductJob = {
  token_hash: string;
  purchase_token: string | null;
  intent_id: string;
  user_id: string;
  property_id: string;
  product_id: string;
  google_product_id: string;
  attempts: number;
  state: string;
  result: Record<string, unknown> | null;
};

// Persist before calling Google's verification API whenever the app supplies
// its intent. The worker can then finish even after the original request dies.
export async function enqueueGoogleProduct(
  admin: SupabaseClient,
  userId: string | null,
  input: unknown,
) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new GoogleProductInputError(400);
  const body = input as Record<string, unknown>;
  const token = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
  if (!token || token.length > 16_384) throw new GoogleProductInputError(400);
  let intentId = typeof body.intentId === "string" ? body.intentId.trim().toLowerCase() : "";
  if (!intentId) {
    // Recovery/RTDN has no screen context. Google's authenticated response is
    // the only source allowed to identify the original listing intent.
    const purchase = await getGooglePlayOneTimePurchase(token);
    intentId = String(purchase.obfuscatedExternalProfileId || "").toLowerCase();
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(intentId)) throw new GoogleProductInputError(400);
  const { data: intent, error } = await admin.from("google_play_purchase_intents")
    .select("id,user_id,property_id,product_id,google_product_id")
    .eq("id", intentId).maybeSingle();
  if (error) throw error;
  if (!intent || (userId && intent.user_id !== userId)) throw new GoogleProductInputError(403);
  for (const [key, column] of [["propertyId", "property_id"], ["productId", "product_id"], ["googleProductId", "google_product_id"]] as const) {
    if (body[key] && body[key] !== intent[column]) throw new GoogleProductInputError(409);
  }
  const tokenHash = googleTokenHash(token);
  const { error: insertError } = await admin.from("google_play_product_jobs").upsert({
    token_hash: tokenHash, purchase_token: token, intent_id: intent.id,
    user_id: intent.user_id, property_id: intent.property_id,
    product_id: intent.product_id, google_product_id: intent.google_product_id,
  }, { onConflict: "token_hash", ignoreDuplicates: true });
  if (insertError) throw insertError;
  const { data: job, error: jobError } = await admin.from("google_play_product_jobs")
    .select("token_hash,user_id,intent_id").eq("token_hash", tokenHash).single();
  if (jobError) throw jobError;
  if (job.user_id !== intent.user_id || job.intent_id !== intent.id) throw new GoogleProductInputError(409);
  return job as { token_hash: string };
}

export async function runGoogleProductJob(admin: SupabaseClient, tokenHash: string) {
  const leaseId = crypto.randomUUID();
  const { data, error } = await admin.rpc("claim_google_play_product_job", { p_token_hash: tokenHash, p_lease_id: leaseId });
  if (error) throw error;
  const job = (data as ProductJob[] | null)?.[0];
  if (!job) {
    const { data: existing, error: lookupError } = await admin.from("google_play_product_jobs")
      .select("state,result").eq("token_hash", tokenHash).single();
    if (lookupError) throw lookupError;
    if (existing.state === "completed" && existing.result) return Response.json(existing.result);
    if (existing.state === "rejected" || existing.state === "refunded") return Response.json({ success: false, message: "Purchase could not be verified." }, { status: 409 });
    return Response.json({ success: false, retryable: true, message: "Payment confirmation is queued. Do not pay again." }, { status: 503 });
  }
  let response: Response;
  try {
    response = await processGoogleProductPurchase(admin, { id: job.user_id }, {
      purchaseToken: job.purchase_token, intentId: job.intent_id,
      propertyId: job.property_id, productId: job.product_id,
      googleProductId: job.google_product_id,
    });
  } catch {
    response = Response.json({ success: false }, { status: 500 });
  }
  const result = await response.json() as Record<string, unknown>;
  const completed = response.ok && result.serverFinalized === true;
  // A pending Google payment is not a permanent rejection. It may complete
  // later, without the user reopening the payment screen.
  const pendingPurchase = String(result.message || "").includes("state PENDING");
  const rejected = response.status >= 400 && response.status < 500 && !pendingPurchase;
  const retryAt = new Date(Date.now() + Math.min(6 * 60 * 60_000, 60_000 * 2 ** Math.min(job.attempts, 8))).toISOString();
  const { error: updateError } = await admin.from("google_play_product_jobs").update({
    state: completed ? "completed" : rejected ? "rejected" : "pending",
    result: completed ? result : null,
    // Keep raw tokens only while unfinished; completed/refunded records use hashes.
    purchase_token: completed || rejected ? null : job.purchase_token,
    next_attempt_at: retryAt, lease_id: null, lease_expires_at: null,
    last_http_status: response.status,
    last_error: completed ? null : String(result.error || result.message || "Purchase verification failed").slice(0, 500),
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("token_hash", tokenHash).eq("lease_id", leaseId);
  if (updateError) throw updateError;
  if (!completed) console.error("Google Play product finalization unfinished", {
    intentId: job.intent_id, attempt: job.attempts, status: response.status, retryable: !rejected,
  });
  return Response.json(result, { status: response.status });
}

export async function retryGoogleProductJobs(admin: SupabaseClient) {
  const now = new Date().toISOString();
  const { data: jobs, error } = await admin.from("google_play_product_jobs").select("token_hash")
    .eq("state", "pending").lte("next_attempt_at", now)
    .or(`lease_expires_at.is.null,lease_expires_at.lt.${now}`)
    .order("created_at").limit(50);
  if (error) throw error;
  let unfinished = 0;
  for (const job of jobs || []) {
    const result = await runGoogleProductJob(admin, job.token_hash);
    if (!result.ok) unfinished++;
  }
  return { attempted: jobs?.length || 0, unfinished };
}
