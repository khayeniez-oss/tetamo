import { timingSafeEqual } from "node:crypto";
import { googlePlayAdmin } from "@/lib/google-play-admin";
import { retryGoogleProductJobs } from "@/lib/google-play-jobs";
import { reconcileGoogleProductRefunds } from "@/lib/google-play-refunds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ success: false }, { status: 503 });
  const supplied = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return new Response(null, { status: 401 });
  const admin = googlePlayAdmin();
  if (!admin) return new Response(null, { status: 503 });
  try {
    const retries = await retryGoogleProductJobs(admin);
    const refunds = await reconcileGoogleProductRefunds(admin);
    const { count, error } = await admin.from("google_play_product_jobs").select("token_hash", { count: "exact", head: true })
      .eq("state", "pending").lt("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());
    if (error) throw error;
    if (count || refunds.reviewRequired) console.error("Google Play billing requires attention", { overdue: count, ...refunds });
    return Response.json({ success: true, ...retries, ...refunds, overdue: count });
  } catch {
    console.error("Google Play billing recovery worker failed; scheduled retry required.");
    return Response.json({ success: false }, { status: 500 });
  }
}
