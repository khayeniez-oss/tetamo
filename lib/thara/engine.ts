import { renderNaturalReply } from "./reply-evidence";
import { confirmedRole, statedListingCount } from "./role";
import { INTENTS, type Audience, type Knowledge, type Language, type Message, type Memory, type Plan, type Planner, type Reply } from "./types";

const audiences = ["owner", "agent", "agency", "buyer", "renter", "developer", "unknown"];
export function validatePlan(value: unknown, knowledge: Knowledge): Plan {
  const p = value as Plan;
  if (!p || !Array.isArray(p.packageIds) || p.packageIds.length > 6 || typeof p.details !== "boolean" || !audiences.includes(p.audience) || !Array.isArray(p.intents) || !p.intents.length || p.intents.length > 6 || p.intents.some(i => !INTENTS.includes(i)) || !Array.isArray(p.factIds) || p.factIds.length > 5 || typeof p.clarify !== "boolean" || typeof p.repeat !== "boolean" || !(p.listingCount === null || Number.isInteger(p.listingCount) && p.listingCount >= 0 && p.listingCount <= 100000)) throw new Error("Invalid understanding result");
  return { ...p, packageIds: p.packageIds.filter(id => knowledge.packages.some(item => item.id === id)), factIds: p.factIds.filter(id => knowledge.facts.some(f => f.id === id)) };
}
export function redact(value: string): string {
  return value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]").replace(/(?:\+?\d[\d ()-]{8,}\d)/g, "[private number]").replace(/\b(?:otp|password|cvv|kata sandi)\s*[:=]?\s*\S+/gi, "[private credential]");
}
export function safeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && ["www.tetamo.com", "tetamo.com", "apps.apple.com", "play.google.com"].includes(u.hostname) && !u.username && !u.password;
  } catch { return false; }
}
// Possessive listing language describes management, not legal ownership.
function understoodRole(plan: Plan, question: string, history: Message[], memory?: Memory): Audience {
  const current = confirmedRole(question);
  if (current) return current;
  const known = memory?.audience !== "unknown" ? memory?.audience : undefined;
  const previous = [...history].reverse().filter(m => m.sender_type === "user").map(m => confirmedRole(m.message_text)).find(Boolean);
  const ambiguous = /\bmy\s+(?:(?:existing|current|own|\d+)\s+)*(?:(?:property|properties)\s+)?(?:properties|property|listings?)\b|\b(?:properti|listing|iklan)(?:\s+(?:properti|yang sudah ada|saat ini))?\s+(?:saya|aku)\b/i.test(question);
  return memory?.confirmedAudience || previous || known || (question && (ambiguous || plan.audience === "owner") ? "unknown" : plan.audience);
}
export async function answer(question: string, language: Language, history: Message[], knowledge: Knowledge, planner: Planner, memory?: Memory): Promise<Reply> {
  if (!question.trim() || question.length > 2000) throw new Error("Invalid message");
  const previous = [...history].reverse().find(m => m.sender_type === "user" && confirmedRole(m.message_text) !== null);
  const currentRole = confirmedRole(question);
  const role = currentRole || memory?.confirmedAudience || (previous ? confirmedRole(previous.message_text) : null);
  // Repair historical inferred memory before classification, not just after model output.
  if (role) {
    const roleText = currentRole ? question : !memory?.confirmedAudience ? previous?.message_text || "" : "";
    memory = { ...memory, audience: role, confirmedAudience: role, listingCount: statedListingCount(roleText) ?? (memory?.audience === role ? memory.listingCount : null) };
  }
  const plan = validatePlan(await planner(redact(question), history.slice(-24).map(m => ({ ...m, message_text: redact(m.message_text).slice(0, 2500) })), knowledge, language, memory), knowledge);
  if (plan.naturalReply !== undefined && !role && (!memory || memory.audience === "unknown") && ["owner","agent","agency"].includes(plan.audience)) plan.audience = "unknown";
  const guarded = compose(plan, knowledge, language, history, question, memory);
  if (plan.naturalReply !== undefined) {
    guarded.text = renderNaturalReply(plan, knowledge, language, guarded.memory, question, history);
    guarded.memory.topicPackageIds = plan.packageIds;
  }
  return guarded;
}
export function compose(plan: Plan, k: Knowledge, lang: Language, history: Message[] = [], question = "", memory?: Memory): Reply {
  const audience = understoodRole(plan, question, history, memory);
  const roleChanged = audience !== plan.audience;
  plan = { ...plan, audience,
    listingCount: roleChanged ? statedListingCount(question) ?? memory?.listingCount ?? plan.listingCount : plan.listingCount,
    packageIds: plan.packageIds.filter(id => k.packages.some(p => p.id === id && p.audience === (audience === "agency" ? "agent" : audience))),
    factIds: plan.factIds.filter(id => !/^journey:(owner|agent)$/.test(id) || id === `journey:${audience === "agency" ? "agent" : audience}`),
  };
  if (question) {
    const acceptsPackageOffer = /^(yes|yes please|sure|please|ya|iya|boleh|silakan)[.! ]*$/i.test(question.trim()) && /(?:benefits|manfaat).*\?/i.test(history.filter(m => m.sender_type === "ai").at(-1)?.message_text || "");
    const packageQuestion = acceptsPackageOffer || /package|paket|price|harga|cost|biaya|benefit|manfaat|feature|fitur|gold|silver|basic|priority|featured|agent pro|recommend|rekomendasi|capacity|kapasitas|listing.*limit|batas.*listing/i.test(question);
    const capacityIntroduction = /\b\d+\s+(?:active\s+)?(?:listing|propert)/i.test(question);
    const packageFocused = packageQuestion && !/how.*(?:list|start|join)|cara.*(?:pasang|mulai|gabung)/i.test(question);
    plan = { ...plan, intents: plan.intents.filter(intent => {
      if (intent === "packages") return packageQuestion || capacityIntroduction;
      if (packageFocused && ["payment", "support", "tools", "start", "listing"].includes(intent)) {
        return intent === "payment" ? /pay|bayar|checkout/i.test(question) : intent === "support" ? /refund|fail|gagal|login|human|admin|help.*account/i.test(question) : intent === "tools" ? /tool|alat/i.test(question) : false;
      }
      return true;
    }) };
  }
  if (plan.audience === "developer") plan = { ...plan, intents: plan.intents.filter(i => ["developer", "support", "payment"].includes(i)) };
  const id = lang === "id";
  const t = (en: string, indo: string) => id ? indo : en;
  const blocks: string[] = [];
  const used: string[] = [];
  const add = (key: string, text: string) => { if (!used.includes(key)) { blocks.push(text); used.push(key); } };
  const partner = plan.audience === "agent" || plan.audience === "agency" || plan.audience === "owner";
  const has = (...intents: string[]) => plan.intents.some(i => intents.includes(i));
  // Detail belongs to the current request, never to a previous assistant reply.
  const previousAnswer = history.filter(m => m.sender_type === "ai").at(-1)?.message_text || "";
  const acceptsDetails = /^(yes|yes please|sure|please|ya|iya|boleh|silakan)[.! ]*$/i.test(question.trim()) && /(?:benefits|manfaat|detail).*\?/i.test(previousAnswer);
  const remainingDetails = /remaining|rest of|manfaat lainnya|sisa manfaat/i.test(question) || acceptsDetails && /remaining benefits|manfaat lainnya/i.test(previousAnswer);
  const wantsDetails = acceptsDetails || plan.details && (!question || /benefit|feature|included|include|compare|comparison|manfaat|fitur|termasuk|banding|kelebihan/i.test(question));
  const wantsSteps = /step.by.step|all.*steps|full.*steps|langkah.demi.langkah|semua langkah/i.test(question);
  const wantsAll = /all.*(?:benefit|feature|detail)|(?:semua|seluruh).*(?:manfaat|fitur|detail)/i.test(question);
  const wantsExplanation = /more detail|tell me more|explain.*detail|jelaskan lebih|penjelasan.*lengkap|lebih lanjut/i.test(question);
  const wantsComparison = /compare|comparison|banding/i.test(question);
  let handoff = false;
  const roleAffectsAnswer = has("packages") || has("start") && !has("listing", "manage") || has("listing", "manage") && /register|registration|sign.up|join|pendaftaran|mendaftar|(?:cara|untuk) daftar|daftar (?:sebagai|akun|di|untuk)|bergabung|gabung/i.test(question);
  if (plan.audience === "unknown" && roleAffectsAnswer) {
    add("clarify", t("Are you a property owner or an agent? This determines the registration steps and packages that apply to you.", "Apakah Anda pemilik properti atau agen? Peran Anda menentukan langkah pendaftaran dan paket yang sesuai."));
  }
  if ((partner && has("start", "apps", "manage")) || has("listing", "manage")) {
    add("partner", t("Download or open Tetamo Partner on iOS or Android to create and manage your property listings.", "Unduh atau buka Tetamo Partner di iOS atau Android untuk membuat dan mengelola listing properti Anda."));
    if (has("start", "listing")) {
      const role = plan.audience === "owner" ? "owner" : ["agent", "agency"].includes(plan.audience) ? "agent" : null;
      const journey = k.facts.find(f => f.id === `journey:${role}`);
      const steps = journey && (id ? journey.idText : journey.en);
      if (steps) {
        const brief = steps.split("\n")[0]
          .replace(/^The (?:agent|owner) registers or logs in as an (Agent|Owner) in Tetamo Partner\.$/, "Register or log in as an $1 in Tetamo Partner.")
          .replace(/^Agen /, "Silakan ").replace(/^Pemilik /, "Silakan ");
        add(journey!.id, wantsSteps ? steps : brief);
      }
      else if (role) add("journey-unverified", t("Please follow the current registration and listing steps shown in the app.", "Silakan ikuti langkah pendaftaran dan listing terbaru yang ditampilkan di aplikasi."));
    }
    add("stores", `iOS: ${k.partner.ios}\nAndroid: ${k.partner.android}`);
  }
  if (has("packages") && partner) {
    const audience = plan.audience === "owner" ? "owner" : ["agent", "agency"].includes(plan.audience) ? "agent" : null;
    let packages = k.packages.filter(p => !audience || p.audience === audience);
    if (plan.packageIds.length) packages = packages.filter(p => plan.packageIds.includes(p.id));
    if (audience === "agent" && plan.listingCount && !wantsComparison && (!plan.packageIds.length || plan.packageIds.length > 1)) {
      const fit = [...packages].sort((a,b) => a.maxListings - b.maxListings).find(p => p.maxListings >= plan.listingCount!);
      if (fit) packages = [fit];
    }
    if (!packages.length || k.unavailable.includes("packages")) {
      add("packages-unavailable", t("I can’t verify the current packages right now. Please check the price page or ask a Tetamo Agent.", "Saya belum dapat memastikan paket terbaru. Silakan lihat halaman harga atau tanyakan kepada Tetamo Agent."));
    } else {
      const amount = (n: number) => `Rp${new Intl.NumberFormat(id ? "id-ID" : "en-US").format(n)}`;
      add("packages", packages.map(p => {
        const period = p.durationDays === 365 ? t("year", "tahun") : `${p.durationDays} ${t("days", "hari")}`;
        const capacity = `${p.maxListings} ${t(p.maxListings === 1 ? "active listing" : "active listings", "listing aktif")}`;
        const benefits = wantsDetails ? (id ? p.features : p.featuresEn).slice(remainingDetails ? 4 : 0, wantsAll || remainingDetails ? undefined : 4).map(f => `• ${f}`).join("\n") : "";
        return `${id ? p.name : p.nameEn}: ${amount(p.priceIdr)}/${period} · ${capacity}.${/monthly|per month|bulanan|per bulan|cicil/i.test(question) && p.monthlyPriceIdr && p.monthlyCommitmentMonths ? t(` Monthly option: ${amount(p.monthlyPriceIdr)}/month with a ${p.monthlyCommitmentMonths}-month commitment.`, ` Opsi bulanan: ${amount(p.monthlyPriceIdr)}/bulan dengan komitmen ${p.monthlyCommitmentMonths} bulan.`) : ""}${benefits ? `\n${benefits}${!wantsAll && !remainingDetails && p.features.length > 4 ? t("\nWould you like the remaining benefits?", "\nIngin melihat manfaat lainnya?") : ""}` : ""}`;
      }).join("\n\n"));
      if (audience === "agent" && plan.listingCount) {
        const fit = [...packages].sort((a,b) => a.maxListings - b.maxListings).find(p => p.maxListings >= plan.listingCount!);
        if (fit) add("fit", t(`For ${plan.listingCount} listings, ${fit.nameEn} has enough listing capacity. Would you like to see its benefits?`, `Untuk ${plan.listingCount} listing, ${fit.name} memiliki kapasitas yang cukup. Ingin melihat manfaatnya?`));
      }
    }
    add("pricelist", "https://www.tetamo.com/pricelist");
  }
  if (has("apps") && !partner) add("apps", t("Tetamo is for buyers and renters discovering properties. Tetamo Partner is the separate app for owners and agents to post and manage listings, enquiries, and their tools. Tetamo Partner is available on iOS and Android.", "Tetamo digunakan pembeli dan penyewa untuk mencari properti. Tetamo Partner adalah aplikasi terpisah untuk pemilik dan agen memasang dan mengelola listing, enquiry, serta tool mereka. Tetamo Partner tersedia di iOS dan Android.") + `\n\niOS: ${k.partner.ios}\nAndroid: ${k.partner.android}`);
  if (has("payment")) add("payment", t("Use the payment methods shown at checkout in Tetamo Partner. Never share passwords, OTPs, CVVs, or full card numbers.", "Gunakan metode pembayaran yang tersedia saat checkout di Tetamo Partner. Jangan bagikan kata sandi, OTP, CVV, atau nomor kartu lengkap."));
  if (has("search", "enquiry", "viewing") || ["buyer", "renter"].includes(plan.audience) && has("start", "apps")) {
    add("marketplace", t("Use Tetamo, the property marketplace, to discover properties. Open a listing to contact its owner or agent through WhatsApp, or request a viewing where available.", "Gunakan Tetamo, marketplace properti, untuk mencari properti. Buka detail listing untuk menghubungi pemilik atau agen melalui WhatsApp, atau mengajukan viewing jika tersedia."));
    add("marketplace-link", "https://www.tetamo.com/properti");
  }
  if (has("developer") || plan.audience === "developer") {
    add("developer", t("For project listings, developer accounts, and commercial arrangements, please speak with a Tetamo Agent. I can’t quote an unverified developer price.", "Untuk listing proyek, akun developer, dan kerja sama komersial, silakan berbicara dengan Tetamo Agent. Saya tidak dapat memberikan harga developer yang belum terverifikasi."));
    add("developer-link", "https://www.tetamo.com/developer-license");
    handoff = true;
  }
  let selectedCount = 0;
  const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const ignored = new Set(["what","which","where","when","does","with","that","this","have","about","your","property","properties","tetamo","agent","owner","how","start","apa","saja","yang","untuk","dengan","saya","bagaimana","cara","agen","properti","pemilik"]);
  const questionTerms = normalize(question).split(" ").filter(w => w.length >= 4 && !ignored.has(w));
  for (const factId of plan.factIds) {
    const f = k.facts.find(f => f.id === factId);
    if (!f || f.id.startsWith("journey:")) continue; // Role journeys are selected by the server, never by the model.
    if (["product:tetamo_partner", "product:listing_management"].includes(f.id) && has("start", "listing", "manage", "apps")) continue;
    if (["product:direct_whatsapp", "product:viewing_schedule"].includes(f.id) && has("search", "enquiry", "viewing")) continue;
    if (question) {
      const q = normalize(question);
      const aliasMatch = f.aliases?.some(alias => normalize(alias).length >= 4 && q.includes(normalize(alias)));
      const title = normalize(f.title);
      const overlap = questionTerms.filter(word => title.includes(word)).length;
      if (!aliasMatch && overlap < (f.kind === "product" ? 1 : 2)) continue;
    }
    // Public editorial text cannot override checkout/package data or unresolved operational policy.
    if (f.kind !== "product" && /(?:\bRp\s*[0-9]|\bIDR\b|refund|reimburse|verification|verifikasi|publish|penerbitan)/i.test(f.en + " " + f.idText)) continue;
    const body = id ? f.idText : f.en;
    if (body && safeUrl(f.url)) {
      // Show complete source sentences, never a character cut that can lose a condition.
      const sentences = body.match(/[^.!?\n]+(?:[.!?](?=\s|$)|$)/g)?.map(s => s.trim()).filter(Boolean) || [body];
      const brief = wantsAll || wantsSteps || wantsExplanation ? body : sentences.slice(0, 2).join(" ");
      add(f.id, `${brief}\n${f.url}${brief !== body && sentences.length > 2 ? t("\nWould you like more detail?", "\nIngin penjelasan lebih lanjut?") : ""}`); selectedCount++;
      if (!wantsAll && !wantsSteps) break;
    }
  }
  if (has("tools") && !selectedCount && !has("start", "listing", "manage")) add("tools-unavailable", t("I can’t verify the specific tool or its access conditions yet. Which Agent Tool would you like help with?", "Saya belum dapat memastikan tool atau ketentuan aksesnya. Agent Tool mana yang ingin Anda tanyakan?"));
  if (has("faq", "articles", "commission") && !selectedCount) add("knowledge-unavailable", t("I can’t verify that information in the current public knowledge. Please ask a Tetamo Agent or check the official support page: https://www.tetamo.com/support", "Saya belum dapat memastikan informasi itu dari sumber publik terbaru. Silakan tanyakan kepada Tetamo Agent atau lihat halaman support resmi: https://www.tetamo.com/support"));
  if (has("promotion")) add("promotion", t("I can’t confirm a current promotion unless it is included in the approved package information above. Please check the current price page.", "Saya tidak dapat memastikan promo jika tidak tercantum dalam informasi paket yang terverifikasi di atas. Silakan lihat halaman harga terbaru."));
  if (has("support")) {
    add("support", t("A Tetamo Agent can help with account access, payment problems, invoices, or refunds. Tap Chat with Tetamo Agent. Please don’t share credentials here.", "Tetamo Agent dapat membantu akses akun, kendala pembayaran, invoice, atau refund. Ketuk Chat dengan Tetamo Agent. Jangan bagikan kredensial di sini."));
    handoff = true;
  }
  if (!blocks.length) add("unknown", t("What would you like help with—finding a property, listing one, packages, or your account?", "Apa yang ingin Anda tanyakan—mencari properti, memasang listing, paket, atau akun Anda?"));
  let text = blocks.join("\n\n");
  // Rephrasing a question must never turn a relevant answer into a generic menu.

  return { memory: { audience: plan.audience, listingCount: plan.listingCount }, text, factIds: used, knowledgeVersion: k.version, suggestedAction: handoff ? "handoff_to_human" : null };
}
