import type { Audience } from "./types";
const roleName = (value: string): Audience => value === "pemilik" ? "owner" : ["agen", "realtor", "broker"].includes(value) ? "agent" : value as Audience;
// Only customer self-identification is confirmation. Possessive listings and AI/admin text are not.
export function confirmedRole(text: string): Audience | null {
  const normalized=text.toLowerCase().replace(/[’‘]/g,"'");
  const events: {index:number;role:Audience;denied:boolean}[]=[];
  const positive=/\b(?:i am|i'm|i work as|i am working as|saya(?: adalah| seorang| sebagai)?|aku(?: adalah| seorang)?)\s+(?:(?:actually|really|sebenarnya)\s+)?(?:(?:an?|the)\s+)?(?:property\s+|real estate\s+|listing\s+)?(owner|agent|agency|pemilik|agen|realtor|broker)\b/g;
  const negative=/\b(?:i am|i'm|saya|aku)\s+(?:not(?:\s+(?:an?|the))?|no longer(?:\s+an?)?|bukan(?:\s+seorang)?)\s+(?:property\s+)?(owner|agent|agency|pemilik|agen|realtor|broker)\b/g;
  for(const match of normalized.matchAll(positive))events.push({index:match.index,role:roleName(match[1]),denied:false});
  for(const match of normalized.matchAll(negative))events.push({index:match.index,role:roleName(match[1]),denied:true});
  const bare=normalized.trim().match(/^(?:(?:actually|sebenarnya)[, :]*)?(?:(?:an?|the)\s+)?(owner|agent|agency|pemilik|agen|realtor|broker)(?=[.!?,]|$)/);
  if(bare)events.push({index:0,role:roleName(bare[1]),denied:false});
  for(const match of normalized.matchAll(/\bi own (?:this|that|the|a|my)\s+(?:property|properties|house|home|villa|apartment|land)\b/g))events.push({index:match.index,role:"owner",denied:false});
  let role:Audience|null=null;
  for(const event of events.sort((a,b)=>a.index-b.index)){
    if(!event.denied)role=event.role;
    else if(role===null||role===event.role)role="unknown";
  }
  return role;
}
export function statedListingCount(text:string):number|null {
 const match=text.match(/\b(\d{1,6})\s+(?:active\s+)?(?:listings?|propert(?:y|ies|i))\b/i);
 const count=match?Number(match[1]):null;
 return count!==null&&count<=100000?count:null;
}
