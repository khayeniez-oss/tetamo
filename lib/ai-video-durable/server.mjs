import {randomUUID} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const facts=['propertyType','location','price','rentPrice','bedrooms','bathrooms','landSize','buildingSize','furnishing','purpose','rentalType','ownershipTitle'];
export function createHandler(db,env){
 return async function handle(req){
  if(env.AI_VIDEO_DURABLE_ENABLED!=='true'||!env.AI_VIDEO_DATABASE_REF||env.NEXT_PUBLIC_SUPABASE_URL!==`https://${env.AI_VIDEO_DATABASE_REF}.supabase.co`)return reply({error:'Durable video generation is not active.'},403);
  const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if(!token)return reply({error:'Login required.'},401);
  const auth=await db.auth.getUser(token);if(auth.error||!auth.data.user)return reply({error:'Invalid session.'},401);
  const user=auth.data.user;
  try{
   if(req.method==='GET'){
    const id=new URL(req.url).searchParams.get('id');if(!uuid.test(id||''))return reply({error:'Invalid job.'},400);
    const {data:job,error}=await db.from('ai_video_render_jobs').select('id,status,output_path,project_id').eq('id',id).eq('user_id',user.id).maybeSingle();
    if(error)throw error;if(!job)return reply({error:'Job not found.'},404);
    const project=await db.from('ai_property_video_projects').select('successful_generation_count,generation_limit').eq('id',job.project_id).eq('user_id',user.id).single();if(project.error)throw project.error;
    let downloadUrl;
    if(job.status==='succeeded'){
     const signed=await db.storage.from('ai-property-video-output').createSignedUrl(job.output_path,60);if(signed.error)throw signed.error;downloadUrl=signed.data.signedUrl;
    }
    return reply({id:job.id,status:job.status,downloadUrl,successfulGenerationCount:project.data.successful_generation_count,generationLimit:project.data.generation_limit});
   }
   if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
   if(Number(req.headers.get('content-length')||0)>32768)return reply({error:'Request too large.'},413);
   const raw=await req.text();if(raw.length>32768)return reply({error:'Request too large.'},413);
   let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid JSON.'},400);}
   if(!body||!uuid.test(body.projectId||''))return reply({error:'Invalid project.'},400);
   const {data:project,error}=await db.from('ai_property_video_projects').select('id,property_id,selected_package').eq('id',body.projectId).eq('user_id',user.id).maybeSingle();
   if(error)throw error;if(!project)return reply({error:'Project not found.'},404);
   if(project.property_id)return reply({error:'Saved listing videos are locked.'},403);
   const profile=await db.from('profiles').select('role').eq('id',user.id).single();if(profile.error)throw profile.error;
   const role=String(profile.data.role).toLowerCase();
   if(role==='owner'&&!['priority','featured'].includes(project.selected_package))return reply({error:'Owner Priority or Featured is required.'},403);
   if(role==='agent'){
    const memberships=await db.from('agent_memberships').select('package_id,status,expires_at').eq('user_id',user.id).order('created_at',{ascending:false});if(memberships.error)throw memberships.error;
    const active=memberships.data.find(m=>m.status==='active'&&(!m.expires_at||Date.parse(m.expires_at)>Date.now()));
    if(!active||!['gold','agent-pro'].includes(active.package_id))return reply({error:'Gold or Agent Pro is required.'},403);
   }else if(role!=='owner')return reply({error:'Package not eligible.'},403);
   if(body.action==='upload'){
    const type=body.mediaType;const filename=typeof body.filename==='string'?body.filename:'';const ext=filename.split('.').pop()?.toLowerCase();
    const allowed={image:['jpg','jpeg','png','webp','heic','heif'],video:['mp4','mov','webm'],music:['mp3','wav','m4a']};
    const max={image:10*1024*1024,video:100*1024*1024,music:20*1024*1024};
    if(!allowed[type]?.includes(ext)||!Number.isInteger(body.size)||body.size<=0||body.size>max[type]||filename.length>240)return reply({error:'Invalid upload.'},400);
    const id=randomUUID(),storagePath=`${user.id}/${project.id}/uploads/${id}.${ext}`;
    const insert=await db.from('ai_video_uploads').insert({id,user_id:user.id,project_id:project.id,storage_path:storagePath,media_type:type,filename,file_size:body.size,duration_seconds:type==='video'?Number(body.durationSeconds)||null:null});if(insert.error)throw insert.error;
    const signed=await db.storage.from('ai-property-video-source').createSignedUploadUrl(storagePath,{upsert:false});if(signed.error)throw signed.error;
    return reply({id,uploadUrl:signed.data.signedUrl});
   }
   if(body.action==='submit'){
    if(!uuid.test(body.requestKey||'')||!Array.isArray(body.sourceIds)||body.sourceIds.some(id=>!uuid.test(id))||!body.settings||typeof body.settings!=='object')return reply({error:'Invalid render request.'},400);
    const context={language:body.language==='en'?'en':'id'};
    for(const name of facts)if(typeof body.propertyContext?.[name]==='string')context[name]=body.propertyContext[name].trim().slice(0,300);
    const {data,error}=await db.rpc('enqueue_ai_video_job',{p_project_id:project.id,p_user_id:user.id,p_request_key:body.requestKey,p_source_ids:body.sourceIds,p_music_id:body.musicId||null,p_settings:body.settings,p_context:context});
    if(error)return reply({error:'Unable to queue video. Check your allowance and whether a generation is already running.'},409);
    const job=Array.isArray(data)?data[0]:data;return reply({id:job.id,status:job.status},202);
   }
   return reply({error:'Unknown action.'},400);
  }catch{return reply({error:'Unable to process video request.'},500);}
 };
}
