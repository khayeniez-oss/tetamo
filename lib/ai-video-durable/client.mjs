const defaultStore=()=>{try{return globalThis.window?.localStorage}catch{return null}};
const keyFor=id=>'tetamo-video-pending:'+id;
function read(id,store){try{return JSON.parse(store?.getItem(keyFor(id))||'null')}catch{return null}}
export function hasPendingRender(id,store=defaultStore()){return !!read(id,store)}
export async function renderDurable({token,projectId,media,music,language,propertyContext,requestKey=crypto.randomUUID(),onJob=()=>{},fetcher=fetch,pause=ms=>new Promise(r=>setTimeout(r,ms)),maxPolls=600,store=defaultStore()}){
 let pending=read(projectId,store);
 const save=value=>{pending=value;try{if(value)store?.setItem(keyFor(projectId),JSON.stringify(value));else store?.removeItem(keyFor(projectId))}catch{}};
 const endpoint='/api/agent/ai-property-video/render-jobs';
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const call=async body=>{
  const response=await fetcher(endpoint,{method:'POST',headers,body:JSON.stringify({projectId,...body})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Video request failed.');return result;
 };
 const upload=async(file,mediaType,durationSeconds)=>{
  const result=await call({action:'upload',filename:file.name,size:file.size,mediaType,durationSeconds});
  const response=await fetcher(result.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
  if(!response.ok)throw new Error('Unable to upload video source or music.');return result.id;
 };
 if(!pending){
  const sourceIds=[];for(const item of media)sourceIds.push(await upload(item.file,item.kind,item.durationSeconds));
  let musicId=null;if(music.track==='upload'){if(!music.file||!music.rightsConfirmed)throw new Error('Music permission and file required.');musicId=await upload(music.file,'music');}
  save({payload:{action:'submit',requestKey,sourceIds,musicId,settings:{track:music.track,volume:music.volume,rightsConfirmed:music.rightsConfirmed},language,propertyContext}});
 }
 const job=pending.jobId?{id:pending.jobId}:await call(pending.payload);
 save({...pending,jobId:job.id});
 onJob(job.id);
 for(let n=0;n<maxPolls;n++){
  const response=await fetcher(endpoint+'?id='+encodeURIComponent(job.id),{headers:{Authorization:`Bearer ${token}`}});
  const status=await response.json();if(!response.ok)throw new Error(status.error||'Unable to check video progress.');
  if(status.status==='failed'){save(null);throw new Error('Video generation failed. Your successful-generation allowance was not used.');}
  if(status.status==='succeeded'){
   if(!status.downloadUrl)throw new Error('Video output is unavailable.');
   const output=await fetcher(status.downloadUrl);if(!output.ok)throw new Error('Unable to download generated video.');
   const blob=await output.blob();save(null);
   return new Response(blob,{headers:{'Content-Type':'video/mp4','X-Tetamo-AI-Successful-Generation':String(status.successfulGenerationCount),'X-Tetamo-AI-Generation-Limit':String(status.generationLimit)}});
  }
  await pause(2000);
 }
 throw new Error('Your video is still processing. Keep this listing draft and check again shortly.');
}
