import { OAuth2Client } from "google-auth-library";
import { googlePlayAdmin } from "@/lib/google-play-admin";
import { enqueueGoogleProduct, runGoogleProductJob } from "@/lib/google-play-jobs";
import { reconcileGoogleProductRefunds } from "@/lib/google-play-refunds";
import { TETAMO_PARTNER_ANDROID_PACKAGE } from "@/lib/google-play-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const oidc = new OAuth2Client();

export async function POST(req: Request) {
  const audience = process.env.GOOGLE_PLAY_RTDN_AUDIENCE;
  const email = process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL;
  if (!audience || !email) return new Response(null, { status: 503 });
  try {
    const header = req.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) return new Response(null, { status: 401 });
    const ticket = await oidc.verifyIdToken({ idToken: header.slice(7), audience });
    const identity = ticket.getPayload();
    if (identity?.email !== email || identity.email_verified !== true) return new Response(null, { status: 403 });
  } catch {
    return new Response(null, { status: 401 });
  }
  const admin = googlePlayAdmin();
  if (!admin) return new Response(null, { status: 503 });
  try {
    const raw = await req.text();
    if (raw.length > 128_000) return new Response(null, { status: 413 });
    const envelope = JSON.parse(raw);
    const notification = JSON.parse(Buffer.from(envelope.message.data, "base64").toString("utf8"));
    if (notification.packageName !== TETAMO_PARTNER_ANDROID_PACKAGE) return new Response(null, { status: 400 });
    if (notification.testNotification) return new Response(null, { status: 204 });
    if (notification.voidedPurchaseNotification || notification.oneTimeProductNotification?.notificationType === 2) {
      await reconcileGoogleProductRefunds(admin);
    } else if (notification.oneTimeProductNotification?.notificationType === 1) {
      const job = await enqueueGoogleProduct(admin, null, { purchaseToken: notification.oneTimeProductNotification.purchaseToken });
      const result = await runGoogleProductJob(admin, job.token_hash);
      if (result.status >= 500) return new Response(null, { status: 503 });
    }
    return new Response(null, { status: 204 });
  } catch {
    // A non-2xx response asks Pub/Sub to redeliver. Never acknowledge an event
    // that failed to reach durable storage or Google finalization.
    console.error("Google Play notification processing failed; redelivery required.");
    return new Response(null, { status: 503 });
  }
}
