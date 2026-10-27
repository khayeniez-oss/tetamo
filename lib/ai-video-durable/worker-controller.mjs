import {timingSafeEqual} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function createWorkerController(db,env){
 return async req=>{
  const secret=env.AI_VIDEO_CONTROLLER_SECRET;
  if(env.AI_VIDEO_DURABLE_ENABLED!=='true'||!secret||secret.length<32)return reply({error:'Worker disabled'},503);
  const actual=Buffer.from(req.headers.get('authorization')||''),expected=Buffer.from(`Bearer ${secret}`);
  if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return reply({error:'Unauthorized'},401);
  if(req.method!=='POST')return reply({error:'Method not allowed'},405);
  const rpc=async(name,args={})=>{const {data,error}=await db.rpc(name,args);if(error)throw error;return data;};
  let claimed;
  try{
   const raw=await req.text();if(raw.length>4096)return reply({error:'Request too large'},413);
   let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
   if(body.action==='claim'){
    const jobs=await rpc('claim_ai_video_job');const job=jobs?.[0];
    if(!job)return reply({job:null});claimed=job;
    const project=await db.from('ai_property_video_projects').select('user_id,property_id').eq('id',job.project_id).single();
    if(project.error||project.data.user_id!==job.user_id||project.data.property_id)throw new Error('Project locked');
    const uploads=await db.from('ai_video_uploads').select('storage_path,media_type').eq('project_id',job.project_id).eq('user_id',job.user_id);
    if(uploads.error)throw uploads.error;
    const allowed=new Set(uploads.data.map(item=>item.storage_path));
    const sources=[...job.payload.media,...(job.payload.music?.track==='upload'?[job.payload.music.source]:[])];
    const downloads={};
    for(const source of sources){
     if(!allowed.has(source.storage_path))throw new Error('Unauthorized source');
     const signed=await db.storage.from('ai-property-video-source').createSignedUrl(source.storage_path,1800);
     if(signed.error)throw signed.error;downloads[source.storage_path]=signed.data.signedUrl;
    }
    const outputPath=`renders/${job.user_id}/${job.id}/${job.lease_token}.mp4`;
    const signed=await db.storage.from('ai-property-video-output').createSignedUploadUrl(outputPath,{upsert:false});
    if(signed.error)throw signed.error;
    return reply({job:{id:job.id,lease_token:job.lease_token,payload:job.payload,downloads,outputPath,uploadUrl:signed.data.signedUrl}});
   }
   if(!uuid.test(body.id||'')||!uuid.test(body.token||''))return reply({error:'Invalid job identity'},400);
   const identity={p_id:body.id,p_token:body.token};
   if(body.action==='heartbeat')return reply({valid:await rpc('heartbeat_ai_video_job',identity)});
   if(body.action==='finish')return reply({result:await rpc('finish_ai_video_job',{...identity,p_output_path:body.outputPath})});
   if(body.action==='fail')return reply({result:await rpc('fail_ai_video_job',identity)});
   return reply({error:'Unknown action'},400);
  }catch{
   if(claimed)try{await rpc('fail_ai_video_job',{p_id:claimed.id,p_token:claimed.lease_token});}catch{}
   return reply({error:'Video job operation failed'},503);
  }
 };
}
