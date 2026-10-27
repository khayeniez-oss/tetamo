import { createClient } from "@supabase/supabase-js";
import { createHandler } from "@/lib/ai-video-durable/server.mjs";
import { after } from "next/server";
import { getVercelOidcToken } from "@vercel/functions/oidc";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
async function handle(req: Request) {
 if (process.env.AI_VIDEO_DURABLE_ENABLED !== "true" || !process.env.AI_VIDEO_DATABASE_REF || process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${process.env.AI_VIDEO_DATABASE_REF}.supabase.co` || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({error:"Durable video generation is not active."},{status:403});
 const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const response = await createHandler(db,process.env)(req);
 if (response.status === 202 && process.env.AI_VIDEO_WORKER_URL?.startsWith("https://") && process.env.AI_VIDEO_WORKER_SECRET) {
  after(async () => {
   try {
    const token = await getVercelOidcToken();
    await fetch(new URL("/run", process.env.AI_VIDEO_WORKER_URL), {
     method: "POST", redirect: "error",
     headers: { Authorization: `Bearer ${process.env.AI_VIDEO_WORKER_SECRET}`, "x-vercel-trusted-oidc-idp-token": token },
     signal: AbortSignal.timeout(240000),
    });
   } catch { console.error("Video worker wake-up deferred to scheduled retry."); }
  });
 }
 return response;
}
export const GET = handle;
export const POST = handle;
