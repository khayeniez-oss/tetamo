import {createClient} from "@supabase/supabase-js";
import {createWorkerController} from "@/lib/ai-video-durable/worker-controller.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
 if (!process.env.AI_VIDEO_DATABASE_REF || process.env.NEXT_PUBLIC_SUPABASE_URL !== `https://${process.env.AI_VIDEO_DATABASE_REF}.supabase.co` || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({error:"Video worker disabled"},{status:503});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 return createWorkerController(db,process.env)(req);
}
