import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.tetamo.com").replace(
  /\/+$/,
  ""
);

const PRICELIST_URL = `${SITE_URL}/pricelist`;
const FAQ_URL = `${SITE_URL}/faq`;

const SUPPORT_HOURS_EN = "Monday - Friday, 9:00 AM - 6:00 PM.";
const SUPPORT_HOURS_ID = "Senin - Jumat, 9:00 pagi - 6:00 sore.";

const CURRENT_PRICING_EN = `
Tetamo current pricing source of truth:

Owner listing packages:
- Basic Listing: Rp50.000 for 1 year / 365 days. Includes 1 active listing.
- Priority Listing: Rp150.000 for 1 year / 365 days. Includes 1 active listing with higher marketplace visibility than Basic.
- Featured Listing: Rp550.000 for 1 year / 365 days. Includes 1 active listing with featured exposure for up to 365 days.

Agent packages:
- Silver: Rp499.000 per year. Includes 30 active listings.
- Gold: Rp1.800.000 per year. Includes 100 active listings.
- Agent Pro: Rp3.999.000 per year. Includes 500 active listings and has an optional monthly payment option with a 12-month commitment.

Important:
- Do not mention Rp399.000.
- Do not mention owner package duration as 2 months.
- Do not mention owner Basic as Rp150.000.
- Owner Basic is Rp50.000 for 1 year.
- Owner Priority is Rp150.000 for 1 year.
- Owner Featured is Rp550.000 for 1 year.
- For the latest price page, direct users to: ${PRICELIST_URL}
`.trim();

const CURRENT_PRICING_ID = `
Sumber kebenaran harga Tetamo saat ini:

Paket listing pemilik:
- Basic Listing: Rp50.000 untuk 1 tahun / 365 hari. Termasuk 1 listing aktif.
- Priority Listing: Rp150.000 untuk 1 tahun / 365 hari. Termasuk 1 listing aktif dengan visibilitas marketplace lebih tinggi dari Basic.
- Featured Listing: Rp550.000 untuk 1 tahun / 365 hari. Termasuk 1 listing aktif dengan exposure featured hingga 365 hari.

Paket agen:
- Silver: Rp499.000 per tahun. Termasuk 30 listing aktif.
- Gold: Rp1.800.000 per tahun. Termasuk 100 listing aktif.
- Agent Pro: Rp3.999.000 per tahun. Termasuk 500 listing aktif dan memiliki opsi pembayaran bulanan dengan komitmen 12 bulan.

Penting:
- Jangan sebut Rp399.000.
- Jangan sebut durasi paket owner sebagai 2 bulan.
- Jangan sebut Owner Basic sebagai Rp150.000.
- Owner Basic adalah Rp50.000 untuk 1 tahun.
- Owner Priority adalah Rp150.000 untuk 1 tahun.
- Owner Featured adalah Rp550.000 untuk 1 tahun.
- Untuk halaman harga terbaru, arahkan user ke: ${PRICELIST_URL}
`.trim();

const SYSTEM_PROMPT = `
You are Tetamo AI Support Assistant.

Your job:
- Answer Tetamo questions using Tetamo FAQ, Tetamo articles, Tetamo pricing, and Tetamo platform knowledge.
- Answer simple workflow and FAQ questions directly.
- Use tutorial/article links when available.
- Keep answers practical, short, clear, warm, and professional.
- Sound human, sympathetic, and helpful.
- Only suggest Tetamo Agent when the user really needs human help.

Current Tetamo pricing:
${CURRENT_PRICING_EN}

Important rules:
- Do not act like a generic bot.
- Do not push simple Tetamo questions to admin.
- Do not invent facts outside the provided Tetamo knowledge/context.
- Do not use old pricing from FAQ, old memory, or old content if it conflicts with current pricing.
- Pricing source of truth is the current pricing knowledge provided in the prompt.
- Never say Owner Basic Listing is Rp150.000.
- Never say Owner Basic Listing is valid for 2 months.
- Never say Agent Silver is Rp399.000.
- If you are unsure, say so politely and guide the user to the pricelist, FAQ, or Tetamo Agent.
- For listing workflow, owner vs agent, package price, and process after signup, answer directly when the source is available.
- Only suggest Tetamo Agent for:
  - account-specific issues
  - payment problems
  - complaints
  - refunds/invoices
  - sensitive/private support cases
  - when the user explicitly asks for human/agent/admin help
  - when you cannot safely answer based on Tetamo knowledge

When suggesting Tetamo Agent:
- Mention support hours naturally.
- English support hours: ${SUPPORT_HOURS_EN}
- Indonesian support hours: ${SUPPORT_HOURS_ID}

Language:
- Reply in the same language as the user's latest message.
- If the message is clearly English, reply in English.
- If the message is clearly Indonesian, reply in Indonesian.
- If mixed or unclear, default to English.

Style:
- Short and direct.
- Helpful.
- Natural.
- Sympathetic but professional.
- No markdown bold.
- No long essays.
`.trim();

function normalize(text: string) {
  return String(text || "").toLowerCase().trim();
}

function formatIdr(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  if (!amount || Number.isNaN(amount)) return "Rp0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function limitWhatsAppReply(value: string) {
  const clean = String(value || "").trim();

  if (clean.length <= 1500) return clean;

  return clean.slice(0, 1490).trim() + "...";
}

function createTwimlMessage(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

function twimlResponse(message: string) {
  return new Response(createTwimlMessage(limitWhatsAppReply(message)), {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function detectReplyLanguage(text: string): "id" | "en" {
  const value = normalize(text);

  const indonesianWords = [
    "bagaimana",
    "cara",
    "berapa",
    "harga",
    "properti",
    "agen",
    "pemilik",
    "setelah",
    "daftar",
    "pasang",
    "iklan",
    "tolong",
    "saya",
    "ingin",
    "mau",
    "apakah",
    "dengan",
    "untuk",
    "bisa",
    "sudah",
    "biaya",
    "paket",
  ];

  const englishWords = [
    "how",
    "what",
    "when",
    "where",
    "price",
    "pricing",
    "package",
    "property",
    "owner",
    "agent",
    "after",
    "signup",
    "sign up",
    "list",
    "listing",
    "difference",
    "process",
    "can",
    "please",
    "help",
    "cost",
  ];

  const indonesianHits = indonesianWords.filter((word) =>
    value.includes(word)
  ).length;

  const englishHits = englishWords.filter((word) =>
    value.includes(word)
  ).length;

  if (indonesianHits >= 2 && indonesianHits > englishHits) {
    return "id";
  }

  return "en";
}

function needsHumanHelp(text: string) {
  const value = normalize(text);

  return [
    "chat with agent",
    "chat with admin",
    "real person",
    "human",
    "speak to someone",
    "talk to support",
    "agent please",
    "admin please",
    "refund",
    "invoice",
    "billing issue",
    "payment failed",
    "payment problem",
    "cannot pay",
    "can't pay",
    "cant pay",
    "complaint",
    "issue with my account",
    "problem with my account",
    "login problem",
    "cannot login",
    "can't login",
    "cant login",
    "chat dengan agent",
    "chat dengan admin",
    "bicara dengan admin",
    "bicara dengan agent",
    "manusia",
    "orang asli",
    "masalah pembayaran",
    "pembayaran gagal",
    "tidak bisa bayar",
    "komplain",
    "keluhan",
    "masalah akun",
    "tidak bisa login",
  ].some((word) => value.includes(word));
}

function isPricingQuestion(text: string) {
  const value = normalize(text);

  return [
    "price",
    "pricing",
    "pricelist",
    "package",
    "packages",
    "cost",
    "how much",
    "membership",
    "owner package",
    "owner packages",
    "agent package",
    "agent packages",
    "basic",
    "priority",
    "featured",
    "silver",
    "gold",
    "agent pro",
    "harga",
    "paket",
    "paket owner",
    "paket pemilik",
    "paket agen",
    "harga paket",
    "berapa harga",
    "berapa paket",
    "biaya",
    "membership agent",
    "membership",
  ].some((word) => value.includes(word));
}

function getPricingPageUrl(question: string) {
  const value = normalize(question);

  if (
    value.includes("owner") ||
    value.includes("pemilik") ||
    value.includes("basic") ||
    value.includes("priority") ||
    value.includes("featured") ||
    value.includes("owner package") ||
    value.includes("paket owner") ||
    value.includes("paket pemilik")
  ) {
    return `${PRICELIST_URL}#owner-packages`;
  }

  if (
    value.includes("agent") ||
    value.includes("agen") ||
    value.includes("silver") ||
    value.includes("gold") ||
    value.includes("pro") ||
    value.includes("agent package") ||
    value.includes("paket agen") ||
    value.includes("membership")
  ) {
    return `${PRICELIST_URL}#agent-packages`;
  }

  return PRICELIST_URL;
}

function buildConversationContext(conversation: any) {
  return `
Conversation source: ${conversation?.source ?? "website_chat"}
Guest name: ${conversation?.guest_name ?? "-"}
Guest email: ${conversation?.guest_email ?? "-"}
Guest phone: ${conversation?.guest_phone ?? "-"}
Property ID: ${conversation?.property_id ?? "-"}
Conversation status: ${conversation?.status ?? "-"}
Handoff requested: ${conversation?.handoff_requested ?? false}
Handoff status: ${conversation?.handoff_status ?? "ai_active"}
`.trim();
}

async function fetchFaqEntries() {
  const { data, error } = await supabase
    .from("faq_entries")
    .select(
      "id, slug, category, question_en, question_id, answer_en, answer_id, keywords, link_url, is_published, sort_order"
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch faq_entries:", error);
    return [];
  }

  return data ?? [];
}

function scoreFaqEntry(entry: any, question: string, lang: "id" | "en") {
  const q = normalize(question);

  const questionText =
    lang === "id"
      ? normalize(entry?.question_id || entry?.question_en)
      : normalize(entry?.question_en || entry?.question_id);

  const answerText =
    lang === "id"
      ? normalize(entry?.answer_id || entry?.answer_en)
      : normalize(entry?.answer_en || entry?.answer_id);

  const keywords = Array.isArray(entry?.keywords) ? entry.keywords : [];
  const keywordText = normalize(keywords.join(" "));
  const slug = normalize(entry?.slug || "");
  const haystack = `${questionText} ${answerText} ${keywordText} ${slug}`;

  let score = 0;

  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word.length < 3) continue;
    if (haystack.includes(word)) score += 2;
    if (questionText.includes(word)) score += 3;
    if (keywordText.includes(word)) score += 4;
  }

  if (questionText === q) score += 20;
  if (questionText.includes(q)) score += 12;

  if (
    q.includes("how do i list my property") ||
    q.includes("how to list my property") ||
    q.includes("list my property") ||
    q.includes("pasang properti") ||
    q.includes("cara pasang")
  ) {
    if (slug.includes("list")) score += 10;
    if (slug.includes("property")) score += 10;
  }

  if (
    q.includes("difference between owner and agent") ||
    q.includes("owner vs agent") ||
    q.includes("perbedaan owner dan agent") ||
    q.includes("beda owner dan agent")
  ) {
    if (slug.includes("owner")) score += 10;
    if (slug.includes("agent")) score += 10;
  }

  if (
    q.includes("process after signup") ||
    q.includes("what happens after signup") ||
    q.includes("setelah signup") ||
    q.includes("proses setelah signup")
  ) {
    if (slug.includes("signup")) score += 10;
    if (slug.includes("process")) score += 10;
  }

  return score;
}

function findBestFaqEntry(entries: any[], question: string, lang: "id" | "en") {
  if (!entries.length) return null;

  const scored = entries
    .map((entry) => ({
      entry,
      score: scoreFaqEntry(entry, question, lang),
    }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return null;
  if (scored[0].score < 8) return null;

  return scored[0].entry;
}

function removeOldPricingLines(text: string) {
  return String(text || "")
    .split("\n")
    .filter((line) => {
      const value = normalize(line);

      if (value.includes("rp399") || value.includes("rp 399")) return false;
      if (value.includes("rp150") && value.includes("basic")) return false;
      if (value.includes("rp 150") && value.includes("basic")) return false;
      if (value.includes("2 months") || value.includes("2 bulan")) return false;

      return true;
    })
    .join("\n")
    .trim();
}

function buildFaqAnswer(entry: any, lang: "id" | "en") {
  if (!entry) return "";

  const answer =
    lang === "id"
      ? entry?.answer_id || entry?.answer_en || ""
      : entry?.answer_en || entry?.answer_id || "";

  const cleanedAnswer = removeOldPricingLines(answer);

  const rawLink = String(entry?.link_url || "").trim();
  if (!rawLink) return cleanedAnswer;

  const fullLink = rawLink.startsWith("http")
    ? rawLink
    : `${SITE_URL}${rawLink.startsWith("/") ? rawLink : `/${rawLink}`}`;

  const linkLine =
    lang === "id"
      ? `Anda juga bisa baca selengkapnya di sini: ${fullLink}`
      : `You can also read more here: ${fullLink}`;

  return [cleanedAnswer, linkLine].filter(Boolean).join("\n\n");
}

async function fetchPublishedArticles() {
  const { data, error } = await supabase
    .from("blogs")
    .select(
      "id, slug, title, title_id, excerpt, excerpt_id, content, content_id, published_at, status, access_type"
    )
    .eq("status", "published")
    .eq("access_type", "public")
    .order("published_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Failed to fetch blogs:", error);
    return [];
  }

  return data ?? [];
}

function scoreArticle(article: any, question: string, lang: "id" | "en") {
  const q = normalize(question);

  const title =
    lang === "id"
      ? normalize(article?.title_id || article?.title)
      : normalize(article?.title || article?.title_id);

  const excerpt =
    lang === "id"
      ? normalize(article?.excerpt_id || article?.excerpt)
      : normalize(article?.excerpt || article?.excerpt_id);

  const slug = normalize(article?.slug || "");
  const haystack = `${title} ${excerpt} ${slug}`;

  let score = 0;

  const words = q.split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word.length < 3) continue;
    if (haystack.includes(word)) score += 2;
    if (title.includes(word)) score += 3;
  }

  if (slug.includes("tutorial")) score += 4;
  if (slug.includes("listing")) score += 3;
  if (slug.includes("pasang")) score += 3;

  return score;
}

function findBestArticle(articles: any[], question: string, lang: "id" | "en") {
  if (!articles.length) return null;

  const scored = articles
    .map((article) => ({
      article,
      score: scoreArticle(article, question, lang),
    }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 5) return null;
  return scored[0].article;
}

function buildArticleContext(article: any, lang: "id" | "en") {
  if (!article) return "";

  const title =
    lang === "id"
      ? article?.title_id || article?.title || ""
      : article?.title || article?.title_id || "";

  const excerpt =
    lang === "id"
      ? article?.excerpt_id || article?.excerpt || ""
      : article?.excerpt || article?.excerpt_id || "";

  const content =
    lang === "id"
      ? article?.content_id || article?.content || ""
      : article?.content || article?.content_id || "";

  const cleanedContent = removeOldPricingLines(String(content));

  const slug = article?.slug || "";

  return `
Relevant Tetamo article:
Title: ${title}
Slug: ${slug}
Excerpt: ${excerpt}
Content snippet: ${cleanedContent.slice(0, 1800)}
Article URL: ${slug ? `${SITE_URL}/blog/${slug}` : "-"}
`.trim();
}

function buildCoreKnowledge(lang: "id" | "en") {
  const pricing = lang === "id" ? CURRENT_PRICING_ID : CURRENT_PRICING_EN;

  if (lang === "id") {
    return `
Tetamo core knowledge:
- Listing biasanya dimulai dengan sign up sebagai owner atau agent.
- Setelah itu pilih paket, isi detail properti, upload foto/video, lanjut verifikasi, lalu pembayaran jika diperlukan.
- Setelah pembayaran disetujui, listing dapat masuk ke alur marketplace secara otomatis dalam hitungan menit.
- Owner biasanya untuk properti milik sendiri.
- Agent biasanya untuk listing klien atau banyak properti.
- Tetamo tidak mengambil komisi dari transaksi jual/sewa properti.
- Tetamo Agent hanya untuk masalah akun, pembayaran bermasalah, invoice/refund, komplain, atau jika user minta bantuan manusia.
- Jam support Tetamo Agent: ${SUPPORT_HOURS_ID}

${pricing}
`.trim();
  }

  return `
Tetamo core knowledge:
- Listing usually starts by signing up as an owner or agent.
- Then choose a package, fill in property details, upload photos/video, continue verification, and proceed to payment if required.
- Once payment is approved, the listing can move into the marketplace flow automatically within minutes.
- Owner is usually for your own property.
- Agent is usually for client listings or multiple properties.
- Tetamo does not take commission from property sale/rental transactions.
- Tetamo Agent is only for account issues, payment problems, invoice/refund, complaints, or when the user asks for human help.
- Tetamo Agent support hours: ${SUPPORT_HOURS_EN}

${pricing}
`.trim();
}

async function fetchPricingPlansFromSupabase() {
  const { data, error } = await supabase
    .from("pricing_plans")
    .select(
      "plan_code, plan_name, plan_type, billing_cycle, price, currency, duration_days, max_listings, max_featured_listings, payment_title, payment_description, billing_note, is_active, sort_order"
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("price", { ascending: true });

  if (error) {
    console.error("Failed to fetch pricing_plans:", error);
    return [];
  }

  return data ?? [];
}

function buildPricingPlansText(plans: any[], lang: "id" | "en") {
  if (!plans.length) {
    return lang === "id" ? CURRENT_PRICING_ID : CURRENT_PRICING_EN;
  }

  const lines = plans.map((plan) => {
    const name =
      plan?.plan_name || plan?.payment_title || plan?.plan_code || "Package";
    const price = formatIdr(plan?.price);
    const durationDays = Number(plan?.duration_days ?? 0);

    const duration =
      durationDays >= 365
        ? lang === "id"
          ? "1 tahun / 365 hari"
          : "1 year / 365 days"
        : durationDays > 0
        ? lang === "id"
          ? `${durationDays} hari`
          : `${durationDays} days`
        : lang === "id"
        ? "sesuai paket"
        : "per package";

    const listings = Number(plan?.max_listings ?? 0);

    const listingText =
      listings > 0
        ? lang === "id"
          ? `, ${listings} listing aktif`
          : `, ${listings} active listing${listings > 1 ? "s" : ""}`
        : "";

    return `- ${name}: ${price} for ${duration}${listingText}.`;
  });

  const base = lang === "id" ? CURRENT_PRICING_ID : CURRENT_PRICING_EN;

  return `
Pricing plans from Supabase pricing_plans:
${lines.join("\n")}

Current public pricelist fallback:
${base}
`.trim();
}

async function answerPricingQuestion(params: {
  question: string;
  lang: "id" | "en";
}) {
  const { question, lang } = params;
  const value = normalize(question);
  const pricingUrl = getPricingPageUrl(question);

  const asksOwner =
    value.includes("owner") ||
    value.includes("pemilik") ||
    value.includes("basic") ||
    value.includes("priority") ||
    value.includes("featured");

  const asksAgent =
    value.includes("agent") ||
    value.includes("agen") ||
    value.includes("silver") ||
    value.includes("gold") ||
    value.includes("pro") ||
    value.includes("membership");

  // Keep this fetch for website/support knowledge freshness.
  // If pricing_plans fails, static pricing below still answers correctly.
  const plans = await fetchPricingPlansFromSupabase();
  buildPricingPlansText(plans, lang);

  if (lang === "id") {
    if (asksOwner && !asksAgent) {
      return `Harga paket listing pemilik Tetamo saat ini:

- Basic Listing: Rp50.000 untuk 1 tahun / 365 hari, termasuk 1 listing aktif.
- Priority Listing: Rp150.000 untuk 1 tahun / 365 hari, dengan visibilitas lebih tinggi dari Basic.
- Featured Listing: Rp550.000 untuk 1 tahun / 365 hari, dengan exposure featured hingga 365 hari.

Tetamo tidak mengambil komisi dari transaksi jual/sewa properti.

Harga terbaru bisa dicek di sini:
${pricingUrl}`;
    }

    if (asksAgent && !asksOwner) {
      return `Harga paket agen Tetamo saat ini:

- Silver: Rp499.000 per tahun, termasuk 30 listing aktif.
- Gold: Rp1.800.000 per tahun, termasuk 100 listing aktif.
- Agent Pro: Rp3.999.000 per tahun, termasuk 500 listing aktif dan tersedia opsi pembayaran bulanan dengan komitmen 12 bulan.

Harga terbaru bisa dicek di sini:
${pricingUrl}`;
    }

    return `Harga Tetamo saat ini:

Paket pemilik:
- Basic Listing: Rp50.000 untuk 1 tahun.
- Priority Listing: Rp150.000 untuk 1 tahun.
- Featured Listing: Rp550.000 untuk 1 tahun.

Paket agen:
- Silver: Rp499.000 per tahun untuk 30 listing aktif.
- Gold: Rp1.800.000 per tahun untuk 100 listing aktif.
- Agent Pro: Rp3.999.000 per tahun untuk 500 listing aktif.

Harga terbaru bisa dicek di sini:
${pricingUrl}`;
  }

  if (asksOwner && !asksAgent) {
    return `Tetamo owner listing packages currently start from:

- Basic Listing: Rp50,000 for 1 year / 365 days, including 1 active listing.
- Priority Listing: Rp150,000 for 1 year / 365 days, with higher visibility than Basic.
- Featured Listing: Rp550,000 for 1 year / 365 days, with featured exposure for up to 365 days.

Tetamo does not take commission from property sale/rental transactions.

You can check the latest pricing here:
${pricingUrl}`;
  }

  if (asksAgent && !asksOwner) {
    return `Tetamo agent packages currently are:

- Silver: Rp499,000 per year, including 30 active listings.
- Gold: Rp1,800,000 per year, including 100 active listings.
- Agent Pro: Rp3,999,000 per year, including 500 active listings and an optional monthly payment option with a 12-month commitment.

You can check the latest pricing here:
${pricingUrl}`;
  }

  return `Tetamo pricing currently starts from:

Owner packages:
- Basic Listing: Rp50,000 for 1 year.
- Priority Listing: Rp150,000 for 1 year.
- Featured Listing: Rp550,000 for 1 year.

Agent packages:
- Silver: Rp499,000 per year for 30 active listings.
- Gold: Rp1,800,000 per year for 100 active listings.
- Agent Pro: Rp3,999,000 per year for 500 active listings.

You can check the latest pricing here:
${pricingUrl}`;
}

function buildFallbackHelpReply(lang: "id" | "en") {
  if (lang === "id") {
    return `Maaf, saya belum bisa menjawab itu dengan pasti berdasarkan informasi Tetamo yang tersedia.

Anda bisa cek FAQ Tetamo di sini:
${FAQ_URL}

Jika pertanyaan ini berkaitan dengan akun, pembayaran, invoice, refund, atau masalah khusus, Anda bisa chat dengan Tetamo Agent. Jam support Tetamo Agent: ${SUPPORT_HOURS_ID}`;
  }

  return `Sorry, I cannot answer that with full confidence based on the Tetamo information available.

You can check Tetamo FAQ here:
${FAQ_URL}

If this is about your account, payment, invoice, refund, or a specific issue, you can chat with a Tetamo Agent. Tetamo Agent support hours: ${SUPPORT_HOURS_EN}`;
}

function buildWhatsAppFallbackReply(lang: "id" | "en") {
  if (lang === "id") {
    return `Halo, selamat datang di Tetamo.

Apakah Anda ingin pasang listing properti, mencari properti, atau bertanya tentang paket owner/agen?`;
  }

  return `Hi, welcome to Tetamo.

Are you looking to list a property, find a property, or ask about owner/agent packages?`;
}

async function generateTwilioWhatsAppReply(question: string) {
  const cleanQuestion = String(question || "").trim();
  const lang = detectReplyLanguage(cleanQuestion);

  if (!cleanQuestion) {
    return buildWhatsAppFallbackReply(lang);
  }

  try {
    if (isPricingQuestion(cleanQuestion)) {
      return await answerPricingQuestion({
        question: cleanQuestion,
        lang,
      });
    }

    const faqEntries = await fetchFaqEntries();
    const matchedFaq = findBestFaqEntry(faqEntries, cleanQuestion, lang);

    if (matchedFaq) {
      const faqAnswer = buildFaqAnswer(matchedFaq, lang);
      if (faqAnswer) return faqAnswer;
    }

    const articles = await fetchPublishedArticles();
    const matchedArticle = findBestArticle(articles, cleanQuestion, lang);
    const articleContext = buildArticleContext(matchedArticle, lang);
    const coreKnowledge = buildCoreKnowledge(lang);

    if (!Deno.env.get("OPENAI_API_KEY")) {
      return buildWhatsAppFallbackReply(lang);
    }

    const userPrompt = `
Customer WhatsApp message:
${cleanQuestion}

Tetamo core knowledge:
${coreKnowledge}

${articleContext ? articleContext : "No strongly matched article found."}

Reply as Tetamo WhatsApp support.

Rules:
- Keep it short and WhatsApp-friendly.
- Reply in the same language as the customer.
- If the customer only says "hi", "hello", "info", or unclear, ask if they are an owner, agent, buyer/renter, or developer.
- Explain Tetamo clearly when relevant.
- Tetamo is a property marketplace platform for owners, agents, agencies, developers, buyers, and renters.
- Mention direct WhatsApp inquiry, verified listing/owner/agent where available, schedule viewing, AI bilingual listing title/description, photo/video upload, and marketplace exposure when relevant.
- Do not guarantee leads, sale, rental, or ROI.
- If pricing is asked, use the current Tetamo pricing in the system prompt.
- Do not invent facts.
`.trim();

    const response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: userPrompt,
    });

    const aiText = removeOldPricingLines(String(response.output_text || "").trim());

    return aiText || buildWhatsAppFallbackReply(lang);
  } catch (error) {
    console.error("Twilio WhatsApp AI reply error:", error);
    return buildWhatsAppFallbackReply(lang);
  }
}

async function handleTwilioWhatsAppWebhook(req: Request) {
  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);

    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const body = params.get("Body") || "";
    const profileName = params.get("ProfileName") || "";
    const messageSid = params.get("MessageSid") || params.get("SmsMessageSid") || "";
    const numMedia = params.get("NumMedia") || "0";

    console.log("Twilio WhatsApp inbound:", {
      from,
      to,
      body,
      profileName,
      messageSid,
      numMedia,
    });

    const reply = await generateTwilioWhatsAppReply(body);

    console.log("Twilio WhatsApp reply generated:", {
      to: from,
      from: to,
      messageSid,
      replyPreview: reply.slice(0, 120),
    });

    return twimlResponse(reply);
  } catch (error) {
    console.error("Twilio WhatsApp webhook error:", error);

    return twimlResponse(
      "Hi, welcome to Tetamo. We received your message. Are you looking to list a property, find a property, or ask about owner/agent packages?"
    );
  }
}

async function handleWebsiteSupportAi(req: Request) {
  const payload = await req.json();
  const messageId = payload?.message_id || payload?.record?.id || null;

  if (!messageId) {
    return jsonResponse({ error: "Missing message_id" }, 400);
  }

  const { data: incomingMessage, error: incomingError } = await supabase
    .from("support_messages")
    .select("id, conversation_id, sender_type, message_text, ai_status, created_at")
    .eq("id", messageId)
    .maybeSingle();

  if (incomingError) throw incomingError;

  if (!incomingMessage) {
    return jsonResponse({ error: "Message not found" }, 404);
  }

  if (incomingMessage.sender_type !== "user") {
    return jsonResponse({ ok: true, skipped: "Not a user message" }, 200);
  }

  if (incomingMessage.ai_status && incomingMessage.ai_status !== "pending") {
    return jsonResponse({ ok: true, skipped: "Already processed" }, 200);
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("support_conversations")
    .select(
      "id, user_id, property_id, guest_name, guest_email, guest_phone, source, status, handoff_requested, handoff_status"
    )
    .eq("id", incomingMessage.conversation_id)
    .maybeSingle();

  if (conversationError) throw conversationError;

  const { data: history, error: historyError } = await supabase
    .from("support_messages")
    .select("sender_type, message_text, created_at")
    .eq("conversation_id", incomingMessage.conversation_id)
    .order("created_at", { ascending: true })
    .limit(12);

  if (historyError) throw historyError;

  const question = String(incomingMessage.message_text || "");
  const lang = detectReplyLanguage(question);

  const historyText = (history ?? [])
    .map(
      (item: any) =>
        `${String(item.sender_type).toUpperCase()}: ${item.message_text}`
    )
    .join("\n");

  const conversationContext = buildConversationContext(conversation);
  const pricingQuestion = isPricingQuestion(question);

  let aiText = "";
  let matchedFaq: any = null;

  if (pricingQuestion) {
    aiText = await answerPricingQuestion({
      question,
      lang,
    });
  } else {
    const faqEntries = await fetchFaqEntries();
    matchedFaq = findBestFaqEntry(faqEntries, question, lang);

    if (matchedFaq) {
      aiText = buildFaqAnswer(matchedFaq, lang);
    } else {
      const articles = await fetchPublishedArticles();
      const matchedArticle = findBestArticle(articles, question, lang);
      const articleContext = buildArticleContext(matchedArticle, lang);
      const coreKnowledge = buildCoreKnowledge(lang);

      const userPrompt = `
Tetamo support conversation context:
${conversationContext}

Recent conversation:
${historyText}

Tetamo core knowledge:
${coreKnowledge}

${articleContext ? articleContext : "No strongly matched article found."}

No FAQ entry matched strongly enough, so answer carefully from the Tetamo knowledge above.

Rules:
- Answer directly if this is still a simple Tetamo workflow question.
- Do not push simple questions to admin.
- If relevant, include the tutorial/article URL.
- Keep the answer short and clear.
- Be sympathetic and professional.
- Do not invent facts.
- Do not use old pricing.
- If the answer is not available from Tetamo knowledge, say you are not fully sure and guide the user to FAQ or Tetamo Agent.
- Only suggest Tetamo Agent if the issue is account-specific, payment-problem related, complaint/refund related, or the user explicitly asks for human help.
- If suggesting Tetamo Agent, mention support hours: ${
        lang === "id" ? SUPPORT_HOURS_ID : SUPPORT_HOURS_EN
      }.
`.trim();

      const response = await openai.responses.create({
        model: MODEL,
        instructions: SYSTEM_PROMPT,
        input: userPrompt,
      });

      aiText = String(response.output_text || "").trim();
    }
  }

  if (!aiText) {
    aiText = buildFallbackHelpReply(lang);
  }

  aiText = removeOldPricingLines(aiText);

  if (!aiText) {
    aiText = buildFallbackHelpReply(lang);
  }

  const shouldHandoff = needsHumanHelp(question);

  const actionLabel = shouldHandoff
    ? lang === "id"
      ? "Chat dengan Tetamo Agent"
      : "Chat with Tetamo Agent"
    : null;

  const { error: insertAiError } = await supabase
    .from("support_messages")
    .insert({
      conversation_id: incomingMessage.conversation_id,
      sender_type: "ai",
      message_text: aiText,
      ai_status: "sent",
      suggested_action: shouldHandoff ? "handoff_to_human" : null,
      suggested_action_label: actionLabel,
    });

  if (insertAiError) throw insertAiError;

  const { error: updateUserMessageError } = await supabase
    .from("support_messages")
    .update({ ai_status: "replied" })
    .eq("id", incomingMessage.id);

  if (updateUserMessageError) throw updateUserMessageError;

  return jsonResponse(
    {
      ok: true,
      message_id: incomingMessage.id,
      ai_reply: aiText,
      suggested_action: shouldHandoff ? "handoff_to_human" : null,
      suggested_action_label: actionLabel,
      matched_faq_slug: matchedFaq?.slug ?? null,
      reply_language: lang,
      used_current_pricing: pricingQuestion,
    },
    200
  );
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "GET") {
      return jsonResponse({
        ok: true,
        message:
          "Tetamo AI reply function is active. Supports website JSON and Twilio WhatsApp form webhook.",
      });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
      return await handleTwilioWhatsAppWebhook(req);
    }

    return await handleWebsiteSupportAi(req);
  } catch (error) {
    console.error("tetamo-ai-reply error:", error);

    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});