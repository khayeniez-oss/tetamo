import { createClient } from "@supabase/supabase-js";
import { readJson } from "../../../../lib/thara/request";
import { HttpError } from "../../../../lib/thara/service";
export const dynamic = "force-dynamic";
const json = (value: unknown, status=200) => Response.json(value,{status,headers:{"Cache-Control":"no-store"}});
async function staff(req: Request) {
  if(process.env.THARA_AGENT_INBOX_ENABLED!=="true")throw new HttpError(503,"Support inbox activation is pending");
  const token=/^Bearer (.+)$/.exec(req.headers.get("authorization")||"")?.[1];
  if(!token)throw new HttpError(401,"Sign in required");
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
  const {data,error}=await db.auth.getUser(token);
  if(error||!data.user||!["admin","super_admin"].includes(data.user.app_metadata.role))throw new HttpError(403,"Administrator access required");
  return {db,user:data.user};
}
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(req: Request) {
  try {
    const {db,user}=await staff(req);const params=new URL(req.url).searchParams;const id=params.get("conversation_id");
    if(id){
      if(!uuid(id))throw new HttpError(400,"Invalid conversation");
      const {data:conversation,error:cError}=await db.from("support_conversations").select("id,source,status,handoff_status,handoff_requested,assigned_to,updated_at").eq("id",id).maybeSingle();
      if(cError)throw cError;if(!conversation)throw new HttpError(404,"Conversation not found");
      const {data:messages,error}=await db.from("support_messages").select("id,sender_type,message_text,created_at").eq("conversation_id",id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(100);
      if(error)throw error;return json({conversation,messages:(messages||[]).reverse(),staff_id:user.id});
    }
    const {data,error}=await db.from("support_conversations").select("id,source,status,handoff_status,handoff_requested,assigned_to,updated_at,last_message_at").eq("status","open").order("handoff_requested",{ascending:false}).order("updated_at",{ascending:false}).limit(100);
    if(error)throw error;return json({conversations:data,staff_id:user.id});
  }catch(e){return json({error:e instanceof HttpError?e.message:"Support inbox unavailable"},e instanceof HttpError?e.status:503);}
}
export async function POST(req: Request) {
  try {
    const {db,user}=await staff(req);
    const body=await readJson(req,12000) as {conversation_id:string;action:string;expected_updated_at:string;text?:string};
    if(!body||!uuid(body.conversation_id||"")||!["takeover","reply","resume","close"].includes(body.action)||!Number.isFinite(Date.parse(body.expected_updated_at)))throw new HttpError(400,"Invalid request");
    const {error}=await db.rpc("thara_agent_transition",{p_admin_id:user.id,p_conversation_id:body.conversation_id,p_action:body.action,p_expected_updated_at:body.expected_updated_at,p_text:body.text||null});
    if(error)return json({error:"Conversation changed or action denied. Reload before retrying."},409);
    return json({ok:true});
  }catch(e){return json({error:e instanceof HttpError?e.message:"Support inbox unavailable"},e instanceof HttpError?e.status:503);}
}
