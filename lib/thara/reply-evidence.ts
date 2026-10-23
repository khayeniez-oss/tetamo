import { safeUrl } from "./engine";
import type { Knowledge, Language, Memory, Message, Plan } from "./types";
export function replyEvidence(k: Knowledge, language: Language, memory?: Memory, question = "", history: Message[] = []) {
  const id = language === "id", tokens: Record<string,string> = {};
  const role = memory?.confirmedAudience || memory?.audience || "unknown";
  const compatible = (audience: string) => audience === (role === "agency" ? "agent" : role);
  const named = (p: Knowledge["packages"][number], text: string) => [p.name,p.nameEn].some(name => name.length >= 4 && !/^basic$/i.test(name) && new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(text));
  const topic = [question,...history.slice(-24).reverse().map(m=>m.message_text)].find(text=>k.packages.some(p=>named(p,text))) || "";
  const packages = k.unavailable.includes("packages") ? [] : k.packages.filter(p => role === "unknown" ? named(p,topic) || memory?.topicPackageIds?.includes(p.id) : compatible(p.audience));
  for (const p of packages) {
    const prefix = `package.${p.id}`;
    tokens[`${prefix}.name`] = id ? p.name : p.nameEn;
    tokens[`${prefix}.price`] = `Rp${new Intl.NumberFormat(id?"id-ID":"en-US").format(p.priceIdr)}`;
    tokens[`${prefix}.duration`] = p.durationDays === 365 ? (id?"satu tahun":"one year") : `${p.durationDays} ${id?"hari":"days"}`;
    tokens[`${prefix}.capacity`] = `${p.maxListings} ${id?"listing aktif":"active listings"}`;
    if (p.monthlyPriceIdr && p.monthlyCommitmentMonths) {
      tokens[`${prefix}.monthlyPrice`] = `Rp${new Intl.NumberFormat(id?"id-ID":"en-US").format(p.monthlyPriceIdr)}`;
      tokens[`${prefix}.commitment`] = `${p.monthlyCommitmentMonths} ${id?"bulan":"months"}`;
    }
    (id?p.features:p.featuresEn).forEach((text,i)=>{tokens[`${prefix}.benefit.${i}`]=text;});
  }
  if(memory?.listingCount!=null)tokens["customer.listingCount"]=String(memory.listingCount);
  tokens["partner.ios"]=k.partner.ios;tokens["partner.android"]=k.partner.android;
  const terms=question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>3);
  const facts=[...k.facts].sort((a,b)=>terms.filter(w=>(b.title+" "+b.en+" "+b.idText).toLowerCase().includes(w)).length-terms.filter(w=>(a.title+" "+a.en+" "+a.idText).toLowerCase().includes(w)).length).slice(0,64);
  for(const f of facts){
    if(f.id.startsWith("journey:")&&f.id!==`journey:${role==="agency"?"agent":role}`)continue;
    if(f.kind!=="product"&&/(?:\bRp\s*[0-9]|\bIDR\b|refund|reimburse|verification|verifikasi|publish|penerbitan)/i.test(f.en+" "+f.idText))continue;
    const body=id?f.idText:f.en;if(body)tokens[`fact.${f.id}`]=body;}
  return {tokens,packages:packages.map(p=>({id:p.id,name:id?p.name:p.nameEn,audience:p.audience})),role};
}
export function renderNaturalReply(plan: Plan, k: Knowledge, language: Language, memory: Memory, question: string, history: Message[]) {
  const text=plan.naturalReply?.trim();if(!text||text.length>4000)throw Error('Invalid natural response');
  const evidence=replyEvidence(k,language,memory,question,history);
  const packages=k.packages.filter(p=>evidence.packages.some(x=>x.id===p.id)&&(plan.packageIds.includes(p.id)||[p.name,p.nameEn].some(n=>new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(text))||memory.topicPackageIds?.includes(p.id)));
  for(const pid of plan.packageIds)if(!evidence.packages.some(p=>p.id===pid))throw Error('Incompatible package audience');
  if(memory.audience==='unknown'&&!(plan.clarify&&/(?:owner|pemilik).*\b(?:or|atau)\b.*(?:agent|agen)/i.test(text))&&/\byou(?: are|'re) (?:a |an |the )?(?:property )?owner\b|\banda\s+(?:adalah|sebagai)\s+(?:seorang\s+)?pemilik\b/i.test(text))throw Error('Unidentified customer role assertion');
  const durationOnly=/how long|how many months|membership.*(?:length|period)|berapa lama|masa (?:berlaku|aktif|keanggotaan)|durasi/i.test(question)&&!/price|cost|capacity|benefit|feature|harga|biaya|kapasitas|manfaat|fitur/i.test(question);
  if(durationOnly&&/\bRp\s*\d|\bIDR\b|active listings|listing aktif|benefits|manfaat|fitur/i.test(text))throw Error('Unrequested package detail');
  if(/shortly|mohon tunggu|tunggu sebentar|agent (?:has|is) (?:already )?(?:joined|joining)/i.test(text))throw Error('Unverified agent availability');
  // A denial of a guarantee is not a promise; affirmative claims still fail closed.
  const promiseClaims=text.replace(/\b(?:not|never|aren['’]t|isn['’]t|can(?:not|'t|’t) be) guaranteed\b/gi,'');
  if(/\b(?:lifetime|guaranteed|unlimited|seumur hidup|tanpa batas)\b/i.test(promiseClaims))throw Error('Unverified promise');
  if(/What would you like help with—|Would you like help with registration, choosing a package|Apa yang ingin Anda tanyakan—/i.test(text)&&/gold|membership|how long|berapa lama|masa berlaku/i.test(question))throw Error('Nonresponsive reply');
  const amounts=packages.flatMap(p=>[p.priceIdr,...(/monthly|bulanan|per bulan/i.test(question)&&p.monthlyPriceIdr?[p.monthlyPriceIdr]:[])]);
  for(const match of text.matchAll(/(?:Rp|IDR)\s*(\d[\d.,]*)|(\d[\d.,]*)\s*IDR/gi))if(!amounts.includes(Number((match[1]||match[2]).replace(/\D/g,''))))throw Error('Unverified price');
  const written:Record<string,number>={one:1,a:1,an:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twelve:12,satu:1,dua:2,tiga:3,empat:4,lima:5,enam:6,tujuh:7,delapan:8,sembilan:9,sepuluh:10};
  let durationClaims=0;
  for(const match of text.matchAll(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|a|an|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s*(years?|months?|days?|tahun|bulan|hari)\b/gi)){
    const n=written[match[1].toLowerCase()]??Number(match[1]),unit=match[2].toLowerCase();
    if(!packages.some(p=>/year|tahun/.test(unit)?p.durationDays===n*365:/day|hari/.test(unit)?p.durationDays===n:(n===12&&p.durationDays===365)||/monthly|bulanan|per bulan/i.test(question)&&p.monthlyCommitmentMonths===n))throw Error('Unverified duration');durationClaims++;
  }
  if(durationOnly&&packages.length&&!durationClaims)throw Error('Duration question not answered');
  const allowedNumbers=new Set<number>([...(memory.listingCount!=null?[memory.listingCount]:[]),...packages.flatMap(p=>[p.priceIdr,p.maxListings,p.durationDays,...(p.durationDays===365?[1,12]:[]),...(p.monthlyPriceIdr?[p.monthlyPriceIdr]:[]),...(p.monthlyCommitmentMonths?[p.monthlyCommitmentMonths]:[])])]);
  for(const fact of k.facts.filter(f=>plan.factIds.includes(f.id)))for(const match of (language==='id'?fact.idText:fact.en).matchAll(/\d[\d.,]*/g))allowedNumbers.add(Number(match[0].replace(/\D/g,'')));
  const withoutLinks=text.replace(/https?:\/\/[^\s)]+/g,link=>{if(!safeUrl(link))throw Error('Unverified link');return '';});
  for(const match of withoutLinks.matchAll(/\d[\d.,]*/g))if(!allowedNumbers.has(Number(match[0].replace(/\D/g,''))))throw Error('Unverified numerical claim');
  if(memory.audience==='unknown'&&packages.some(p=>p.audience==='owner')&&/recommend|best|suits you|cocok untuk Anda|rekomendasi/i.test(text))throw Error('Unknown role cannot receive owner recommendation');
  return text;
}
