import { googlePlayAdmin } from "@/lib/google-play-admin";
import { enqueueGoogleProduct, runGoogleProductJob, GoogleProductInputError } from "@/lib/google-play-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  const admin = googlePlayAdmin();
  if (!admin) return Response.json({ success: false, message: "Server database configuration is missing." }, { status: 500 });
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return Response.json({ success: false }, { status: 401 });
  const { data, error } = await admin.auth.getUser(authorization.slice(7));
  if (error || !data.user) return Response.json({ success: false }, { status: 401 });
  let body;
  try { body = await req.json(); } catch {
    return Response.json({ success: false, message: "Invalid JSON." }, { status: 400 });
  }
  try {
    const job = await enqueueGoogleProduct(admin, data.user.id, body);
    return await runGoogleProductJob(admin, job.token_hash);
  } catch (error) {
    const status = error instanceof GoogleProductInputError ? error.status : 500;
    console.error("Google Play purchase intake failed", { status });
    return Response.json({ success: false, message: "Google Play purchase verification could not complete. Please retry; do not pay again." }, { status });
  }
}
