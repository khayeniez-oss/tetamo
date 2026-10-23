import { readJson } from "../../../../lib/thara/request";
import { HttpError } from "../../../../lib/thara/service";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
type FAQ = { id: string; category: { en: string; id: string }; question: { en: string; id: string }; answer: { en: string; id: string } };
function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
const json = (body: unknown, status=200) => Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function GET() {
  try {
    const {data,error}=await db().rpc("thara_faq_snapshot");
    if(error)throw error;
    return json({version:data.version,faqs:data.rows.map((r:{slug:string;category:string;question_en:string;question_id:string;answer_en:string;answer_id:string})=>({id:r.slug,category:{en:r.category||"General",id:r.category||"Umum"},question:{en:r.question_en,id:r.question_id},answer:{en:r.answer_en,id:r.answer_id}}))});
  }catch{return json({error:"Public FAQ source unavailable"},503);}
}
export async function PUT(req:Request) {
  try {
    if(process.env.THARA_FAQ_PUBLISH_ENABLED!=="true")return json({error:"FAQ publication is not enabled"},503);
    const token=/^Bearer (.+)$/.exec(req.headers.get("authorization")||"")?.[1];
    if(!token)return json({error:"Sign in required"},401);
    const client=db();const {data,error}=await client.auth.getUser(token);
    // Only server-controlled metadata; never trust user_metadata.role or a client-side admin flag.
    if(error||!data.user||!['admin','super_admin'].includes(data.user.app_metadata.role))return json({error:"Administrator access required"},403);
    const {faqs,version}=await readJson(req,300000) as {faqs:FAQ[];version:string};
    if(!Array.isArray(faqs)||faqs.length>500)return json({error:"Invalid FAQs"},400);
    const rows=faqs.map((f,i)=>{
      if(!f.id||![f.question?.en,f.question?.id,f.answer?.en,f.answer?.id].every(v=>typeof v==='string'&&v.trim().length>0&&v.length<=3500))throw Error('Invalid FAQ');
      return {slug:f.id,category:String(f.category.en).slice(0,100),question_en:f.question.en.trim(),question_id:f.question.id.trim(),answer_en:f.answer.en.trim(),answer_id:f.answer.id.trim(),is_published:true,sort_order:i};
    });
    const {error:publishError}=await client.rpc('thara_publish_faqs',{p_rows:rows,p_expected_version:version});
    if(publishError)throw publishError;
    return json({ok:true});
  }catch(error){return json({error:"Unable to publish FAQs"},error instanceof HttpError ? error.status : 400);}
}
