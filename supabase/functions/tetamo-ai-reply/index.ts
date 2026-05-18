import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

type SupportLanguage = "en" | "id";
type AudienceType =
  | "buyer_renter"
  | "owner_seller"
  | "agent_agency"
  | "developer"
  | "guest"
  | "unknown";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-5.4-mini";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.tetamo.com").replace(
  /\/+$/,
  "",
);

const PRICELIST_URL = `${SITE_URL}/pricelist`;
const FAQ_URL = `${SITE_URL}/faq`;
const BLOG_URL = `${SITE_URL}/blog`;

const SUPPORT_HOURS_EN = "Monday - Friday, 9:00 AM - 6:00 PM.";
const SUPPORT_HOURS_ID = "Senin - Jumat, 9:00 pagi - 6:00 sore.";

const OWNER_PRICING_EN = `
Owner listing packages:
- Basic Listing: Rp50,000 for 1 year / 365 days. Includes 1 active listing, AI-generated title/description, verification badge after approval, direct WhatsApp buyer/renter inquiry, viewing scheduling, and marketplace/app visibility.
- Priority Listing: Rp150,000 for 1 year / 365 days. Includes 1 active listing, everything in Basic, plus higher marketplace visibility and display priority.
- Featured Listing: Rp550,000 for 1 year / 365 days. Includes 1 active listing, featured exposure for 1 year, featured badge, highest marketplace visibility, social media posting on FB / IG / TikTok, and Tetamo Agent support.
`.trim();

const OWNER_PRICING_ID = `
Paket listing pemilik:
- Basic Listing: Rp50.000 untuk 1 tahun / 365 hari. Termasuk 1 listing aktif, AI-generated title/description, verification badge setelah disetujui, direct WhatsApp buyer/renter, jadwal viewing, dan tampil di marketplace/app.
- Priority Listing: Rp150.000 untuk 1 tahun / 365 hari. Termasuk 1 listing aktif, semua fitur Basic, plus visibilitas marketplace lebih tinggi dan prioritas tampil.
- Featured Listing: Rp550.000 untuk 1 tahun / 365 hari. Termasuk 1 listing aktif, featured selama 1 tahun, featured badge, visibilitas tertinggi, posting social media FB / IG / TikTok, dan Tetamo Agent support.
`.trim();

const AGENT_PRICING_EN = `
Agent packages:
- Silver: Rp499,000 per year. Includes 30 active listings, agent profile website, social media integration, leads dashboard, viewing schedule, packages/billing, payments/receipts, analytics/insights, commission tracking, and Boost/Spotlight access.
- Gold: Rp1,800,000 per year. Includes 100 active listings, Silver features, 1 AI Avatar introduction video, 3 free Featured Listings for 90 days each, and priority listing visibility.
- Agent Pro: Rp3,999,000 per year. Includes 500 active listings, Gold features, Featured Agent placement eligibility, premium exposure opportunity, limited Featured Agent slots, and monthly payment option.
- Agent Pro monthly option: Rp399,000/month with a 12-month commitment.
`.trim();

const AGENT_PRICING_ID = `
Paket agen:
- Silver: Rp499.000 per tahun. Termasuk 30 listing aktif, website profil agen, integrasi media sosial, dashboard leads, jadwal viewing, paket/tagihan, pembayaran/receipt, analytics/insights, tracking komisi, dan akses Boost/Spotlight.
- Gold: Rp1.800.000 per tahun. Termasuk 100 listing aktif, fitur Silver, 1 AI Avatar video perkenalan, 3 free Featured Listings masing-masing 90 hari, dan prioritas visibilitas listing.
- Agent Pro: Rp3.999.000 per tahun. Termasuk 500 listing aktif, fitur Gold, eligible untuk Featured Agent placement, kesempatan premium exposure, slot Featured Agent terbatas, dan opsi bayar bulanan.
- Opsi bulanan Agent Pro: Rp399.000/bulan dengan komitmen 12 bulan.
`.trim();

const ADD_ON_PRICING_EN = `
Add-ons:
- Boost Listing: Rp300,000 for 14 days. Increases listing visibility in the Tetamo marketplace. Available for owners and agents.
- Homepage Spotlight: Rp200,000 for 7 days. Displays a listing in the Tetamo homepage spotlight area. Slots are limited.
`.trim();

const ADD_ON_PRICING_ID = `
Add-on:
- Boost Listing: Rp300.000 untuk 14 hari. Meningkatkan visibilitas listing di marketplace Tetamo. Tersedia untuk owner dan agent.
- Homepage Spotlight: Rp200.000 untuk 7 hari. Menampilkan listing di area spotlight homepage Tetamo. Slot terbatas.
`.trim();

const EDUCATION_PRICING_EN = `
Education:
- Education Pass: Rp100,000 for 90 days. Gives premium access to Tetamo educational videos for owners or non-member agents. It does not auto renew.
`.trim();

const EDUCATION_PRICING_ID = `
Edukasi:
- Education Pass: Rp100.000 untuk 90 hari. Memberikan akses premium video edukasi Tetamo untuk owner atau non-member agent. Tidak auto renew.
`.trim();

const PAYMENT_KNOWLEDGE_EN = `
Tetamo payment modes:
- Tetamo currently accepts QRIS and debit/credit card payment.
- QRIS is suitable for users in Indonesia because users can usually pay using Indonesian bank apps and e-wallets that support QRIS.
- Debit and credit card payment is also available.
- Do not say Tetamo accepts manual bank transfer unless the context explicitly confirms it.
- Never ask users to share full card numbers, CVV, OTP, banking passwords, or sensitive payment details.
- If payment was deducted but the package/listing is not active, guide the user to Tetamo Agent.
`.trim();

const PAYMENT_KNOWLEDGE_ID = `
Metode pembayaran Tetamo:
- Tetamo saat ini menerima QRIS dan pembayaran debit/kredit card.
- QRIS cocok untuk pengguna di Indonesia karena biasanya bisa dibayar melalui aplikasi bank Indonesia dan e-wallet yang mendukung QRIS.
- Pembayaran debit dan kredit card juga tersedia.
- Jangan bilang Tetamo menerima transfer bank manual kecuali konteks memang mengonfirmasi hal itu.
- Jangan pernah meminta nomor kartu penuh, CVV, OTP, password bank, atau detail pembayaran sensitif.
- Jika saldo sudah terpotong tapi paket/listing belum aktif, arahkan user ke Tetamo Agent.
`.trim();

const DEVELOPER_KNOWLEDGE_EN = `
Developer / project listing:
- Developers can use Tetamo for project exposure, developer profile, multiple property/project listings, direct WhatsApp inquiries, viewing interest, and marketplace visibility.
- Developer pricing is not the same as owner or agent packages.
- Developer packages or license/use arrangements should be discussed with Tetamo.
- For developer pricing, guide the user to contact Tetamo Agent.
`.trim();

const DEVELOPER_KNOWLEDGE_ID = `
Developer / listing proyek:
- Developer bisa menggunakan Tetamo untuk exposure proyek, profil developer, multiple listing properti/proyek, direct WhatsApp inquiry, minat viewing, dan visibilitas marketplace.
- Harga developer tidak sama dengan paket owner atau agent.
- Paket developer atau license/use arrangement perlu dibahas dengan Tetamo.
- Untuk harga developer, arahkan user ke Tetamo Agent.
`.trim();

const CURRENT_PRICING_EN = `
Tetamo current pricing source of truth:

${OWNER_PRICING_EN}

${AGENT_PRICING_EN}

${ADD_ON_PRICING_EN}

${EDUCATION_PRICING_EN}

Important pricing rules:
- Owner Basic is Rp50,000 for 1 year.
- Owner Priority is Rp150,000 for 1 year.
- Owner Featured is Rp550,000 for 1 year.
- Agent Silver is Rp499,000 per year for 30 active listings.
- Agent Gold is Rp1,800,000 per year for 100 active listings.
- Agent Pro is Rp3,999,000 per year for 500 active listings.
- Agent Pro monthly option is Rp399,000/month with a 12-month commitment.
- Do not say Agent Silver is Rp399,000.
- Do not say Owner Basic is Rp150,000.
- Do not say owner packages are valid for 2 months.
- For the latest pricing page, direct users to: ${PRICELIST_URL}
`.trim();

const CURRENT_PRICING_ID = `
Sumber kebenaran harga Tetamo saat ini:

${OWNER_PRICING_ID}

${AGENT_PRICING_ID}

${ADD_ON_PRICING_ID}

${EDUCATION_PRICING_ID}

Aturan harga penting:
- Owner Basic adalah Rp50.000 untuk 1 tahun.
- Owner Priority adalah Rp150.000 untuk 1 tahun.
- Owner Featured adalah Rp550.000 untuk 1 tahun.
- Agent Silver adalah Rp499.000 per tahun untuk 30 listing aktif.
- Agent Gold adalah Rp1.800.000 per tahun untuk 100 listing aktif.
- Agent Pro adalah Rp3.999.000 per tahun untuk 500 listing aktif.
- Opsi bulanan Agent Pro adalah Rp399.000/bulan dengan komitmen 12 bulan.
- Jangan bilang Agent Silver Rp399.000.
- Jangan bilang Owner Basic Rp150.000.
- Jangan bilang paket owner berlaku 2 bulan.
- Untuk halaman harga terbaru, arahkan user ke: ${PRICELIST_URL}
`.trim();

const SYSTEM_PROMPT = `
You are Scorpio Assist, Tetamo's AI support and sales assistant.

Tetamo context:
- Tetamo is a property marketplace platform in Indonesia.
- Tetamo serves buyers, renters, owners, sellers, agents, agencies, developers, and guests.
- Tetamo is not a real estate agency and does not take commission from property sale/rental transactions.
- Tetamo helps listings get marketplace visibility, direct WhatsApp inquiries, viewing scheduling, profile/dashboard tools, AI-generated bilingual listing content, and payment/receipt flow.
- Tetamo must never guarantee leads, sales, rentals, ROI, buyers, or tenants.

Your job:
- Answer Tetamo questions using Tetamo FAQ, Tetamo articles, Tetamo pricing, payment knowledge, and Tetamo platform knowledge.
- Be useful for buyer/renter, owner/seller, agent/agency, developer, guest, and logged-in users.
- Be sales-aware: explain value, recommend the right next step, and help users move toward signup, listing, package selection, payment, browsing, or Tetamo Agent when appropriate.
- Keep answers practical, short, clear, warm, and professional.
- Only suggest Tetamo Agent when the user really needs human help.

Current Tetamo pricing:
${CURRENT_PRICING_EN}

Payment knowledge:
${PAYMENT_KNOWLEDGE_EN}

Developer knowledge:
${DEVELOPER_KNOWLEDGE_EN}

Important rules:
- Reply in the same language as the user's latest message when possible.
- If the conversation/app source clearly indicates Indonesian, reply in Indonesian for short unclear messages.
- If the conversation/app source clearly indicates English, reply in English for short unclear messages.
- If mixed or unclear, default to English.
- Do not act like a generic bot.
- Do not push simple Tetamo questions to admin.
- Do not invent facts outside the provided Tetamo knowledge/context.
- Do not use old pricing from FAQ, old memory, or old content if it conflicts with current pricing.
- Pricing source of truth is the current pricing knowledge provided in this prompt.
- Payment source of truth is QRIS plus debit/credit card.
- Do not say Tetamo accepts manual bank transfer unless context explicitly confirms it.
- Do not ask for sensitive payment details.
- Never ask for OTP, CVV, full card number, banking password, or private financial credentials.
- For listing workflow, owner vs agent, package price, payment mode, and process after signup, answer directly when the source is available.
- Suggest Tetamo Agent for:
  - account-specific issues
  - payment deducted but package/listing not active
  - payment problems
  - complaints
  - refunds/invoices
  - sensitive/private support cases
  - developer pricing/license discussion
  - when the user explicitly asks for human/agent/admin help
  - when you cannot safely answer based on Tetamo knowledge

When suggesting Tetamo Agent:
- Mention support hours naturally.
- English support hours: ${SUPPORT_HOURS_EN}
- Indonesian support hours: ${SUPPORT_HOURS_ID}

Style:
- Short and direct.
- Helpful.
- Natural.
- Sympathetic but professional.
- No long essays.
- Use light bullets only when helpful.
- Do not use markdown tables.
`.trim();

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .trim();
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

function sourceLanguage(
  source: string | null | undefined,
): SupportLanguage | null {
  const value = normalize(source || "");

  if (
    value.includes("_id") ||
    value.includes("bahasa") ||
    value.includes("indonesia") ||
    value.includes("mobile_chat_id") ||
    value.includes("mobile_chat_guest_id")
  ) {
    return "id";
  }

  if (
    value.includes("_en") ||
    value.includes("english") ||
    value.includes("mobile_chat_en") ||
    value.includes("mobile_chat_guest_en")
  ) {
    return "en";
  }

  return null;
}

function detectReplyLanguage(
  text: string,
  fallbackLanguage: SupportLanguage | null = null,
): SupportLanguage {
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
    "bayar",
    "pembayaran",
    "qris",
    "kartu",
    "debit",
    "kredit",
    "developer",
    "penjual",
    "pembeli",
    "penyewa",
    "sewa",
    "jual",
    "listing",
    "unggulan",
    "jadwal",
    "lihat",
    "bantuan",
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
    "payment",
    "pay",
    "card",
    "credit",
    "debit",
    "buyer",
    "renter",
    "seller",
    "developer",
    "viewing",
    "schedule",
    "support",
  ];

  const indonesianHits = indonesianWords.filter((word) =>
    value.includes(word),
  ).length;

  const englishHits = englishWords.filter((word) =>
    value.includes(word),
  ).length;

  if (indonesianHits >= 2 && indonesianHits > englishHits) {
    return "id";
  }

  if (englishHits >= 2 && englishHits > indonesianHits) {
    return "en";
  }

  if (value.length <= 18 && fallbackLanguage) {
    return fallbackLanguage;
  }

  if (indonesianHits > englishHits) return "id";
  if (englishHits > indonesianHits) return "en";

  return fallbackLanguage ?? "en";
}

function includesAny(text: string, keywords: string[]) {
  const value = normalize(text);
  return keywords.some((keyword) => value.includes(keyword));
}

function isGreetingOrVague(text: string) {
  const value = normalize(text).replace(/[!?.]/g, "").trim();

  return [
    "hi",
    "hello",
    "hey",
    "halo",
    "hallo",
    "info",
    "help",
    "bantuan",
    "mau tanya",
    "saya mau tanya",
    "ask",
    "question",
    "test",
  ].includes(value);
}

function detectAudience(text: string): AudienceType {
  const value = normalize(text);

  if (
    includesAny(value, [
      "developer",
      "pengembang",
      "project",
      "proyek",
      "bulk listing",
      "multiple project",
      "license",
      "lisensi",
      "perumahan",
      "apartemen project",
    ])
  ) {
    return "developer";
  }

  if (
    includesAny(value, [
      "agent",
      "agen",
      "agency",
      "agensi",
      "real estate agent",
      "property agent",
      "broker",
      "listing klien",
      "client listings",
      "membership",
      "silver",
      "gold",
      "agent pro",
    ])
  ) {
    return "agent_agency";
  }

  if (
    includesAny(value, [
      "owner",
      "pemilik",
      "seller",
      "penjual",
      "my property",
      "properti saya",
      "rumah saya",
      "villa saya",
      "tanah saya",
      "pasang properti",
      "list my property",
      "sell my property",
      "rent out",
      "sewakan",
      "jual properti",
    ])
  ) {
    return "owner_seller";
  }

  if (
    includesAny(value, [
      "buyer",
      "renter",
      "pembeli",
      "penyewa",
      "rent",
      "sewa",
      "buy",
      "beli",
      "looking for",
      "cari properti",
      "mencari properti",
      "schedule viewing",
      "jadwal viewing",
      "viewing",
      "lihat properti",
    ])
  ) {
    return "buyer_renter";
  }

  if (includesAny(value, ["guest", "visitor", "tamu"])) {
    return "guest";
  }

  return "unknown";
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
    "payment deducted",
    "charged",
    "already paid",
    "paid already",
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
    "account locked",
    "receipt problem",
    "developer pricing",
    "developer package",
    "license pricing",
    "chat dengan agent",
    "chat dengan agen",
    "chat dengan admin",
    "bicara dengan admin",
    "bicara dengan agent",
    "bicara dengan agen",
    "manusia",
    "orang asli",
    "refund",
    "invoice",
    "faktur",
    "masalah pembayaran",
    "pembayaran gagal",
    "saldo terpotong",
    "sudah bayar",
    "sudah membayar",
    "tidak aktif",
    "tidak masuk",
    "tidak bisa bayar",
    "komplain",
    "keluhan",
    "masalah akun",
    "tidak bisa login",
    "harga developer",
    "paket developer",
    "lisensi developer",
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
    "boost",
    "spotlight",
    "education pass",
    "developer pricing",
    "developer package",
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
    "berapa bayar",
    "harga developer",
    "paket developer",
  ].some((word) => value.includes(word));
}

function isPaymentModeQuestion(text: string) {
  const value = normalize(text);

  return [
    "payment method",
    "payment mode",
    "how to pay",
    "pay with",
    "payment",
    "qris",
    "qr code",
    "debit",
    "credit",
    "credit card",
    "debit card",
    "bank app",
    "e-wallet",
    "ewallet",
    "wallet",
    "bayar pakai",
    "metode pembayaran",
    "cara bayar",
    "pembayaran",
    "qris",
    "kartu debit",
    "kartu kredit",
    "debit",
    "kredit",
    "e-wallet",
    "dompet digital",
    "bank indonesia",
  ].some((word) => value.includes(word));
}

function isSensitivePaymentProblem(text: string) {
  const value = normalize(text);

  return [
    "payment failed",
    "payment problem",
    "payment deducted",
    "charged",
    "already paid",
    "paid already",
    "receipt",
    "invoice",
    "refund",
    "cannot pay",
    "can't pay",
    "cant pay",
    "saldo terpotong",
    "sudah bayar",
    "sudah membayar",
    "pembayaran gagal",
    "masalah pembayaran",
    "receipt",
    "invoice",
    "refund",
    "tagihan",
    "struk",
    "kwitansi",
    "tidak aktif",
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

  if (value.includes("boost") || value.includes("spotlight")) {
    return `${PRICELIST_URL}#add-ons`;
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
      "id, slug, category, question_en, question_id, answer_en, answer_id, keywords, link_url, is_published, sort_order",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch faq_entries:", error);
    return [];
  }

  return data ?? [];
}

function scoreFaqEntry(entry: any, question: string, lang: SupportLanguage) {
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

function findBestFaqEntry(
  entries: any[],
  question: string,
  lang: SupportLanguage,
) {
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

      if (value.includes("owner basic") && value.includes("rp150"))
        return false;
      if (value.includes("owner basic") && value.includes("rp 150"))
        return false;
      if (value.includes("basic listing") && value.includes("rp150"))
        return false;
      if (value.includes("basic listing") && value.includes("rp 150"))
        return false;
      if (value.includes("2 months") || value.includes("2 bulan")) return false;

      return true;
    })
    .join("\n")
    .trim();
}

function buildFaqAnswer(entry: any, lang: SupportLanguage) {
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
      "id, slug, title, title_id, excerpt, excerpt_id, content, content_id, published_at, status, access_type",
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

function scoreArticle(article: any, question: string, lang: SupportLanguage) {
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
  if (slug.includes("agent")) score += 2;
  if (slug.includes("owner")) score += 2;

  return score;
}

function findBestArticle(
  articles: any[],
  question: string,
  lang: SupportLanguage,
) {
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

function buildArticleContext(article: any, lang: SupportLanguage) {
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

function buildCoreKnowledge(lang: SupportLanguage) {
  const pricing = lang === "id" ? CURRENT_PRICING_ID : CURRENT_PRICING_EN;
  const payment = lang === "id" ? PAYMENT_KNOWLEDGE_ID : PAYMENT_KNOWLEDGE_EN;
  const developer =
    lang === "id" ? DEVELOPER_KNOWLEDGE_ID : DEVELOPER_KNOWLEDGE_EN;

  if (lang === "id") {
    return `
Tetamo core knowledge:
- Tetamo adalah marketplace properti, bukan agency/brokerage.
- Tetamo melayani buyer, renter, owner, seller, agent, agency, developer, dan guest.
- Listing biasanya dimulai dengan sign up sebagai owner atau agent.
- Setelah itu pilih paket, isi detail properti, upload foto/video, lanjut verifikasi, lalu pembayaran jika diperlukan.
- Setelah pembayaran disetujui, listing dapat masuk ke alur marketplace secara otomatis dalam hitungan menit.
- Owner biasanya untuk properti milik sendiri.
- Agent biasanya untuk listing klien atau banyak properti.
- Buyer/renter dapat mencari properti, menghubungi owner/agent langsung lewat WhatsApp, dan menggunakan jadwal viewing jika tersedia.
- Developer perlu diskusi dengan Tetamo untuk package/license.
- Tetamo tidak mengambil komisi dari transaksi jual/sewa properti.
- Tetamo tidak boleh menjamin leads, penjualan, penyewaan, ROI, buyer, atau tenant.
- Tetamo Agent hanya untuk masalah akun, pembayaran bermasalah, invoice/refund, komplain, developer pricing/license, atau jika user minta bantuan manusia.
- Jam support Tetamo Agent: ${SUPPORT_HOURS_ID}

${pricing}

${payment}

${developer}
`.trim();
  }

  return `
Tetamo core knowledge:
- Tetamo is a property marketplace, not an agency/brokerage.
- Tetamo serves buyers, renters, owners, sellers, agents, agencies, developers, and guests.
- Listing usually starts by signing up as an owner or agent.
- Then choose a package, fill in property details, upload photos/video, continue verification, and proceed to payment if required.
- Once payment is approved, the listing can move into the marketplace flow automatically within minutes.
- Owner is usually for your own property.
- Agent is usually for client listings or multiple properties.
- Buyer/renter can browse properties, contact owners/agents directly through WhatsApp, and use viewing schedule when available.
- Developers should discuss package/license arrangements with Tetamo.
- Tetamo does not take commission from property sale/rental transactions.
- Tetamo must not guarantee leads, sales, rentals, ROI, buyers, or tenants.
- Tetamo Agent is only for account issues, payment problems, invoice/refund, complaints, developer pricing/license, or when the user asks for human help.
- Tetamo Agent support hours: ${SUPPORT_HOURS_EN}

${pricing}

${payment}

${developer}
`.trim();
}

function buildFallbackHelpReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Maaf, saya belum bisa menjawab itu dengan pasti berdasarkan informasi Tetamo yang tersedia.

Anda bisa cek FAQ Tetamo di sini:
${FAQ_URL}

Jika pertanyaan ini berkaitan dengan akun, pembayaran, invoice, refund, developer pricing/license, atau masalah khusus, Anda bisa chat dengan Tetamo Agent. Jam support Tetamo Agent: ${SUPPORT_HOURS_ID}`;
  }

  return `Sorry, I cannot answer that with full confidence based on the Tetamo information available.

You can check Tetamo FAQ here:
${FAQ_URL}

If this is about your account, payment, invoice, refund, developer pricing/license, or a specific issue, you can chat with a Tetamo Agent. Tetamo Agent support hours: ${SUPPORT_HOURS_EN}`;
}

function buildGreetingReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Halo, saya Scorpio Assist dari Tetamo.

Saya bisa bantu Anda sebagai buyer/renter, owner/seller, agent, developer, atau guest.

Apa yang ingin Anda lakukan?
- Cari properti
- Pasang listing sebagai owner
- Daftar sebagai agent
- Tanya harga paket
- Tanya metode pembayaran QRIS / debit / kredit
- Bicara dengan Tetamo Agent`;
  }

  return `Hi, I’m Scorpio Assist from Tetamo.

I can help you as a buyer/renter, owner/seller, agent, developer, or guest.

What would you like to do?
- Find a property
- List a property as an owner
- Join as an agent
- Ask about packages/pricing
- Ask about QRIS / debit / credit payment
- Chat with a Tetamo Agent`;
}

function buildWhatsAppFallbackReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Halo, selamat datang di Tetamo.

Apakah Anda ingin pasang listing properti, mencari properti, bertanya tentang paket owner/agen, atau metode pembayaran QRIS/debit/kredit?`;
  }

  return `Hi, welcome to Tetamo.

Are you looking to list a property, find a property, ask about owner/agent packages, or ask about QRIS/debit/credit payment?`;
}

function buildPaymentModeReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Tetamo saat ini menerima QRIS dan debit/kredit card.

QRIS cocok untuk pengguna di Indonesia karena biasanya bisa dibayar lewat aplikasi bank Indonesia dan e-wallet yang mendukung QRIS. Debit dan kredit card juga tersedia.

Setelah Anda memilih paket, Tetamo akan mengarahkan Anda ke halaman pembayaran. Jika pembayaran berhasil, listing atau membership akan lanjut ke proses aktivasi/review.

Jika saldo sudah terpotong tapi paket belum aktif, silakan chat dengan Tetamo Agent agar bisa dicek. Jam support: ${SUPPORT_HOURS_ID}`;
  }

  return `Tetamo currently accepts QRIS and debit/credit card payments.

QRIS is suitable for users in Indonesia because you can usually pay using Indonesian bank apps and e-wallets that support QRIS. Debit and credit card payment is also available.

After you choose a package, Tetamo will guide you to the payment page. Once payment is successful, your listing or membership continues to activation/review.

If your payment was deducted but your package is not active, please chat with a Tetamo Agent so it can be checked. Support hours: ${SUPPORT_HOURS_EN}`;
}

function buildDeveloperReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk developer, Tetamo bisa membantu exposure proyek, profil developer, multiple listing properti/proyek, direct WhatsApp inquiry, minat viewing, dan visibilitas marketplace.

Harga developer tidak sama dengan paket owner atau agent karena biasanya tergantung kebutuhan proyek, volume listing, dan license/use arrangement.

Untuk pricing developer, sebaiknya lanjut chat dengan Tetamo Agent supaya kebutuhan proyek Anda bisa dibahas dengan tepat. Jam support: ${SUPPORT_HOURS_ID}`;
  }

  return `For developers, Tetamo can help with project exposure, developer profile, multiple property/project listings, direct WhatsApp inquiries, viewing interest, and marketplace visibility.

Developer pricing is not the same as owner or agent packages because it usually depends on project needs, listing volume, and license/use arrangement.

For developer pricing, it is best to continue with a Tetamo Agent so your project needs can be discussed properly. Support hours: ${SUPPORT_HOURS_EN}`;
}

function buildBuyerRenterReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Jika Anda buyer atau renter, Anda bisa mencari properti di Tetamo, cek detail listing, lalu hubungi owner/agent langsung melalui WhatsApp jika tersedia.

Tetamo membantu dengan verified listing/owner/agent jika sudah disetujui, foto/video properti, informasi harga, dan jadwal viewing jika listing menyediakan schedule viewing.

Silakan mulai dari marketplace:
${SITE_URL}`;
  }

  return `If you are a buyer or renter, you can browse properties on Tetamo, check the listing details, then contact the owner/agent directly through WhatsApp when available.

Tetamo helps with verified listing/owner/agent status when approved, property photos/videos, price information, and viewing scheduling when the listing supports it.

You can start from the marketplace:
${SITE_URL}`;
}

function buildOwnerSellerReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk owner/seller, Tetamo membantu properti Anda tampil di marketplace dan app, dengan direct WhatsApp inquiry, jadwal viewing, AI-generated title/description, dan verification badge setelah disetujui.

Alur umumnya:
1. Daftar sebagai owner
2. Pilih paket Basic, Priority, atau Featured
3. Isi detail properti
4. Upload foto/video
5. Lanjut verifikasi dan pembayaran
6. Listing masuk ke proses marketplace/review

Jika ingin exposure paling kuat, Featured Listing adalah pilihan terbaik karena termasuk featured exposure dan social media posting.

Lihat paket owner:
${PRICELIST_URL}#owner-packages`;
  }

  return `For owners/sellers, Tetamo helps your property appear on the marketplace and app, with direct WhatsApp inquiries, viewing scheduling, AI-generated title/description, and verification badge after approval.

The usual flow:
1. Sign up as an owner
2. Choose Basic, Priority, or Featured
3. Fill in property details
4. Upload photos/videos
5. Continue verification and payment
6. Listing moves into marketplace/review flow

For stronger exposure, Featured Listing is the best option because it includes featured exposure and social media posting.

See owner packages:
${PRICELIST_URL}#owner-packages`;
}

function buildAgentAgencyReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk agent/agency, Tetamo membantu Anda tampil lebih profesional dan mengelola listing, leads, viewing, billing, receipt, analytics, dan commission tracking dalam satu dashboard.

Paket agent saat ini:
- Silver: Rp499.000/tahun untuk 30 listing aktif
- Gold: Rp1.800.000/tahun untuk 100 listing aktif
- Agent Pro: Rp3.999.000/tahun untuk 500 listing aktif
- Agent Pro juga punya opsi Rp399.000/bulan dengan komitmen 12 bulan

Jika Anda baru mulai, Silver cukup untuk membangun presence. Jika Anda punya banyak listing, Gold atau Agent Pro memberi value lebih besar per listing dan fitur exposure lebih kuat.

Lihat paket agent:
${PRICELIST_URL}#agent-packages`;
  }

  return `For agents/agencies, Tetamo helps you look more professional and manage listings, leads, viewings, billing, receipts, analytics, and commission tracking in one dashboard.

Current agent packages:
- Silver: Rp499,000/year for 30 active listings
- Gold: Rp1,800,000/year for 100 active listings
- Agent Pro: Rp3,999,000/year for 500 active listings
- Agent Pro also has a Rp399,000/month option with a 12-month commitment

If you are starting, Silver is enough to build your presence. If you manage many listings, Gold or Agent Pro gives stronger value per listing and better exposure features.

See agent packages:
${PRICELIST_URL}#agent-packages`;
}

function buildWhatIsTetamoReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Tetamo adalah marketplace properti di Indonesia untuk buyer, renter, owner, agent, agency, dan developer.

Tetamo membantu listing properti tampil lebih profesional dengan:
- Verified listing/owner/agent setelah disetujui
- Direct WhatsApp inquiry
- Jadwal viewing
- Foto/video properti
- AI-generated title & description
- Paket owner dan agent
- Pembayaran QRIS dan debit/kredit card

Tetamo bukan agency dan tidak mengambil komisi dari transaksi jual/sewa properti.`;
  }

  return `Tetamo is a property marketplace in Indonesia for buyers, renters, owners, agents, agencies, and developers.

Tetamo helps property listings look more professional with:
- Verified listing/owner/agent status after approval
- Direct WhatsApp inquiry
- Viewing schedule
- Property photos/videos
- AI-generated title & description
- Owner and agent packages
- QRIS and debit/credit card payment

Tetamo is not an agency and does not take commission from property sale/rental transactions.`;
}

async function answerPricingQuestion(params: {
  question: string;
  lang: SupportLanguage;
}) {
  const { question, lang } = params;
  const value = normalize(question);
  const pricingUrl = getPricingPageUrl(question);

  const asksOwner =
    value.includes("owner") ||
    value.includes("pemilik") ||
    value.includes("basic") ||
    value.includes("priority") ||
    value.includes("featured") ||
    value.includes("listing pemilik") ||
    value.includes("paket owner");

  const asksAgent =
    value.includes("agent") ||
    value.includes("agen") ||
    value.includes("silver") ||
    value.includes("gold") ||
    value.includes("pro") ||
    value.includes("membership") ||
    value.includes("agency") ||
    value.includes("agensi");

  const asksAddOn =
    value.includes("boost") ||
    value.includes("spotlight") ||
    value.includes("add-on") ||
    value.includes("addon");

  const asksEducation =
    value.includes("education") ||
    value.includes("edukasi") ||
    value.includes("course") ||
    value.includes("video");

  const asksDeveloper =
    value.includes("developer") ||
    value.includes("pengembang") ||
    value.includes("project") ||
    value.includes("proyek") ||
    value.includes("license") ||
    value.includes("lisensi");

  if (asksDeveloper) {
    return buildDeveloperReply(lang);
  }

  if (lang === "id") {
    if (asksOwner && !asksAgent) {
      return `Harga paket listing pemilik Tetamo saat ini:

- Basic Listing: Rp50.000 untuk 1 tahun, termasuk 1 listing aktif.
- Priority Listing: Rp150.000 untuk 1 tahun, dengan visibilitas lebih tinggi dari Basic.
- Featured Listing: Rp550.000 untuk 1 tahun, dengan featured exposure, visibilitas tertinggi, social media posting, dan Tetamo Agent support.

Tetamo tidak mengambil komisi dari transaksi jual/sewa properti.

Metode pembayaran: QRIS dan debit/kredit card. QRIS cocok untuk aplikasi bank dan e-wallet Indonesia yang mendukung QRIS.

Jika Anda hanya ingin mulai tampil, Basic cukup. Jika ingin exposure paling kuat, pilih Featured.

Harga terbaru:
${pricingUrl}`;
    }

    if (asksAgent && !asksOwner) {
      return `Harga paket agent Tetamo saat ini:

- Silver: Rp499.000/tahun untuk 30 listing aktif.
- Gold: Rp1.800.000/tahun untuk 100 listing aktif.
- Agent Pro: Rp3.999.000/tahun untuk 500 listing aktif.
- Agent Pro opsi bulanan: Rp399.000/bulan dengan komitmen 12 bulan.

Silver cocok untuk mulai tampil profesional. Gold cocok untuk agent aktif dengan banyak listing. Agent Pro cocok untuk agent/agency yang ingin scale lebih besar dan exposure premium.

Metode pembayaran: QRIS dan debit/kredit card.

Harga terbaru:
${pricingUrl}`;
    }

    if (asksAddOn) {
      return `Add-on Tetamo saat ini:

- Boost Listing: Rp300.000 untuk 14 hari, untuk meningkatkan visibilitas listing di marketplace.
- Homepage Spotlight: Rp200.000 untuk 7 hari, untuk tampil di area spotlight homepage. Slot terbatas.

Add-on tersedia untuk owner dan agent. Pembayaran bisa menggunakan QRIS atau debit/kredit card.

Lihat harga terbaru:
${pricingUrl}`;
    }

    if (asksEducation) {
      return `Education Pass Tetamo saat ini adalah Rp100.000 untuk 90 hari.

Paket ini memberikan akses premium ke video edukasi Tetamo untuk owner atau non-member agent. Paket ini tidak auto renew.

Pembayaran bisa menggunakan QRIS atau debit/kredit card.

Lihat harga terbaru:
${pricingUrl}`;
    }

    return `Harga Tetamo saat ini:

Paket owner:
- Basic Listing: Rp50.000 untuk 1 tahun.
- Priority Listing: Rp150.000 untuk 1 tahun.
- Featured Listing: Rp550.000 untuk 1 tahun.

Paket agent:
- Silver: Rp499.000/tahun untuk 30 listing aktif.
- Gold: Rp1.800.000/tahun untuk 100 listing aktif.
- Agent Pro: Rp3.999.000/tahun untuk 500 listing aktif.
- Agent Pro opsi bulanan: Rp399.000/bulan dengan komitmen 12 bulan.

Add-on:
- Boost Listing: Rp300.000 untuk 14 hari.
- Homepage Spotlight: Rp200.000 untuk 7 hari.

Pembayaran tersedia melalui QRIS dan debit/kredit card.

Harga terbaru:
${pricingUrl}`;
  }

  if (asksOwner && !asksAgent) {
    return `Tetamo owner listing packages currently are:

- Basic Listing: Rp50,000 for 1 year, including 1 active listing.
- Priority Listing: Rp150,000 for 1 year, with higher visibility than Basic.
- Featured Listing: Rp550,000 for 1 year, with featured exposure, highest visibility, social media posting, and Tetamo Agent support.

Tetamo does not take commission from property sale/rental transactions.

Payment methods: QRIS and debit/credit card. QRIS is suitable for Indonesian bank apps and e-wallets that support QRIS.

If you only want to start showing your property, Basic is enough. If you want the strongest exposure, Featured is the best choice.

Latest pricing:
${pricingUrl}`;
  }

  if (asksAgent && !asksOwner) {
    return `Tetamo agent packages currently are:

- Silver: Rp499,000/year for 30 active listings.
- Gold: Rp1,800,000/year for 100 active listings.
- Agent Pro: Rp3,999,000/year for 500 active listings.
- Agent Pro monthly option: Rp399,000/month with a 12-month commitment.

Silver is good if you are starting professionally. Gold is better for active agents with more listings. Agent Pro is best for agents/agencies that want to scale bigger with premium exposure features.

Payment methods: QRIS and debit/credit card.

Latest pricing:
${pricingUrl}`;
  }

  if (asksAddOn) {
    return `Tetamo add-ons currently are:

- Boost Listing: Rp300,000 for 14 days, to increase listing visibility in the marketplace.
- Homepage Spotlight: Rp200,000 for 7 days, to show a listing in the homepage spotlight area. Slots are limited.

Add-ons are available for owners and agents. Payment is available through QRIS and debit/credit card.

Latest pricing:
${pricingUrl}`;
  }

  if (asksEducation) {
    return `Tetamo Education Pass is currently Rp100,000 for 90 days.

It gives premium access to Tetamo educational videos for owners or non-member agents. It does not auto renew.

Payment is available through QRIS and debit/credit card.

Latest pricing:
${pricingUrl}`;
  }

  return `Tetamo pricing currently starts from:

Owner packages:
- Basic Listing: Rp50,000 for 1 year.
- Priority Listing: Rp150,000 for 1 year.
- Featured Listing: Rp550,000 for 1 year.

Agent packages:
- Silver: Rp499,000/year for 30 active listings.
- Gold: Rp1,800,000/year for 100 active listings.
- Agent Pro: Rp3,999,000/year for 500 active listings.
- Agent Pro monthly option: Rp399,000/month with a 12-month commitment.

Add-ons:
- Boost Listing: Rp300,000 for 14 days.
- Homepage Spotlight: Rp200,000 for 7 days.

Payment is available through QRIS and debit/credit card.

Latest pricing:
${pricingUrl}`;
}

function buildDirectReply(params: {
  question: string;
  lang: SupportLanguage;
  audience: AudienceType;
}) {
  const { question, lang, audience } = params;
  const value = normalize(question);

  if (isGreetingOrVague(question)) {
    return buildGreetingReply(lang);
  }

  if (
    value.includes("what is tetamo") ||
    value.includes("apa itu tetamo") ||
    value.includes("tentang tetamo") ||
    value.includes("is tetamo agency") ||
    value.includes("tetamo agency") ||
    value.includes("tetamo itu apa")
  ) {
    return buildWhatIsTetamoReply(lang);
  }

  if (isPaymentModeQuestion(question)) {
    return buildPaymentModeReply(lang);
  }

  if (audience === "developer") {
    return buildDeveloperReply(lang);
  }

  if (
    audience === "buyer_renter" &&
    includesAny(value, [
      "find",
      "search",
      "cari",
      "looking",
      "rent",
      "buy",
      "sewa",
      "beli",
      "viewing",
      "jadwal",
      "whatsapp",
      "contact",
      "hubungi",
    ])
  ) {
    return buildBuyerRenterReply(lang);
  }

  if (
    audience === "owner_seller" &&
    includesAny(value, [
      "list",
      "listing",
      "pasang",
      "jual",
      "sewa",
      "rent out",
      "sell",
      "owner",
      "pemilik",
      "seller",
      "penjual",
      "property",
      "properti",
    ])
  ) {
    return buildOwnerSellerReply(lang);
  }

  if (
    audience === "agent_agency" &&
    includesAny(value, [
      "agent",
      "agen",
      "agency",
      "agensi",
      "membership",
      "listing",
      "leads",
      "dashboard",
      "silver",
      "gold",
      "pro",
      "package",
      "paket",
    ])
  ) {
    return buildAgentAgencyReply(lang);
  }

  return "";
}

async function generateOpenAiReply(params: {
  question: string;
  lang: SupportLanguage;
  audience: AudienceType;
  conversationContext: string;
  historyText: string;
  articleContext: string;
}) {
  const {
    question,
    lang,
    audience,
    conversationContext,
    historyText,
    articleContext,
  } = params;

  if (!Deno.env.get("OPENAI_API_KEY")) {
    return "";
  }

  const coreKnowledge = buildCoreKnowledge(lang);

  const userPrompt = `
Tetamo support conversation context:
${conversationContext}

Detected user type:
${audience}

Recent conversation:
${historyText}

User's latest question:
${question}

Tetamo core knowledge:
${coreKnowledge}

${articleContext ? articleContext : "No strongly matched article found."}

Answer as Scorpio Assist.

Rules:
- Reply in ${lang === "id" ? "Indonesian" : "English"}.
- Identify what the user needs: buyer/renter, owner/seller, agent/agency, developer, guest, pricing, payment, listing, or support issue.
- Answer directly if the answer is available from Tetamo knowledge.
- Be sales-aware: explain value before pushing the next step.
- Recommend the most logical next action.
- For owner pricing, mention Basic, Priority, Featured only when relevant.
- For agent pricing, mention Silver, Gold, Agent Pro only when relevant.
- For payment mode, mention QRIS and debit/credit card only.
- For QRIS, explain it is suitable for Indonesian bank apps and e-wallets that support QRIS.
- For developer pricing/license, guide to Tetamo Agent.
- Do not guarantee leads, sales, rentals, ROI, buyers, or tenants.
- Do not invent facts.
- Do not use old pricing.
- Do not ask for sensitive payment details.
- Do not push simple questions to admin.
- Only suggest Tetamo Agent for account-specific issues, payment problems, complaints/refunds/invoices, developer pricing/license, or if the user asks for human help.
- Keep the answer short and mobile/WhatsApp-friendly.
`.trim();

  const response = await openai.responses.create({
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input: userPrompt,
  });

  return removeOldPricingLines(String(response.output_text || "").trim());
}

async function buildSupportReply(params: {
  question: string;
  lang: SupportLanguage;
  audience: AudienceType;
  conversationContext: string;
  historyText: string;
}) {
  const { question, lang, audience, conversationContext, historyText } = params;

  if (isPricingQuestion(question)) {
    return {
      text: await answerPricingQuestion({ question, lang }),
      matchedFaq: null,
      usedCurrentPricing: true,
    };
  }

  const directReply = buildDirectReply({ question, lang, audience });
  if (directReply) {
    return {
      text: directReply,
      matchedFaq: null,
      usedCurrentPricing: false,
    };
  }

  const faqEntries = await fetchFaqEntries();
  const matchedFaq = findBestFaqEntry(faqEntries, question, lang);

  if (matchedFaq) {
    const faqAnswer = buildFaqAnswer(matchedFaq, lang);
    if (faqAnswer) {
      return {
        text: faqAnswer,
        matchedFaq,
        usedCurrentPricing: false,
      };
    }
  }

  const articles = await fetchPublishedArticles();
  const matchedArticle = findBestArticle(articles, question, lang);
  const articleContext = buildArticleContext(matchedArticle, lang);

  const aiText = await generateOpenAiReply({
    question,
    lang,
    audience,
    conversationContext,
    historyText,
    articleContext,
  });

  if (aiText) {
    return {
      text: aiText,
      matchedFaq: null,
      usedCurrentPricing: false,
    };
  }

  return {
    text: buildFallbackHelpReply(lang),
    matchedFaq: null,
    usedCurrentPricing: false,
  };
}

async function generateTwilioWhatsAppReply(question: string) {
  const cleanQuestion = String(question || "").trim();
  const lang = detectReplyLanguage(cleanQuestion);

  if (!cleanQuestion) {
    return buildWhatsAppFallbackReply(lang);
  }

  try {
    const audience = detectAudience(cleanQuestion);

    if (isPricingQuestion(cleanQuestion)) {
      return await answerPricingQuestion({
        question: cleanQuestion,
        lang,
      });
    }

    const directReply = buildDirectReply({
      question: cleanQuestion,
      lang,
      audience,
    });

    if (directReply) {
      return directReply;
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

    const aiText = await generateOpenAiReply({
      question: cleanQuestion,
      lang,
      audience,
      conversationContext: "Source: Twilio WhatsApp inbound",
      historyText: `USER: ${cleanQuestion}`,
      articleContext,
    });

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
    const messageSid =
      params.get("MessageSid") || params.get("SmsMessageSid") || "";
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
      "Hi, welcome to Tetamo. We received your message. Are you looking to list a property, find a property, ask about owner/agent packages, or ask about QRIS/debit/credit payment?",
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
    .select(
      "id, conversation_id, sender_type, message_text, ai_status, created_at",
    )
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
      "id, user_id, property_id, guest_name, guest_email, guest_phone, source, status, handoff_requested, handoff_status",
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
  const fallbackLanguage = sourceLanguage(conversation?.source);
  const lang = detectReplyLanguage(question, fallbackLanguage);
  const audience = detectAudience(question);

  const historyText = (history ?? [])
    .map(
      (item: any) =>
        `${String(item.sender_type).toUpperCase()}: ${item.message_text}`,
    )
    .join("\n");

  const conversationContext = buildConversationContext(conversation);

  let result = await buildSupportReply({
    question,
    lang,
    audience,
    conversationContext,
    historyText,
  });

  let aiText = removeOldPricingLines(result.text);

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
      matched_faq_slug: result.matchedFaq?.slug ?? null,
      reply_language: lang,
      detected_audience: audience,
      used_current_pricing: result.usedCurrentPricing,
      payment_modes_supported: ["QRIS", "Debit/Credit Card"],
    },
    200,
  );
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "GET") {
      return jsonResponse({
        ok: true,
        message:
          "Tetamo AI reply function is active. Supports Scorpio Assist, website JSON, and Twilio WhatsApp form webhook.",
        payment_modes_supported: ["QRIS", "Debit/Credit Card"],
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
      500,
    );
  }
});
