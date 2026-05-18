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

type SupportReplyResult = {
  text: string;
  matchedFaq?: any | null;
  matchedArticle?: any | null;
  matchedEducation?: any | null;
  usedCurrentPricing?: boolean;
  usedOfficialIdentity?: boolean;
  usedPaymentKnowledge?: boolean;
};

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

const TETAMO_IDENTITY_EN = `
Tetamo identity and company information:
- Tetamo is an Australian-based SaaS business serving Indonesia's property market through a digital property marketplace platform.
- Tetamo is operated by Tetamo Pty Ltd.
- Tetamo Pty Ltd is an Australian Private Company registered in NSW, Australia.
- Tetamo company details: ACN 689 780 970 and ABN 18 689 780 970.
- Tetamo has company presence / office in Sydney, Australia.
- Tetamo operates digitally through www.tetamo.com to serve owners, sellers, agents, agencies, developers, buyers, and renters in Indonesia.
- Tetamo is not a real estate agency, not a broker, and does not take commission from property sale/rental transactions.
- Tetamo helps users through verified listings, direct WhatsApp inquiries, viewing schedules, AI-assisted listing tools, dashboards, packages, education content, blog/articles, and marketing exposure.
- If asked where Tetamo is located or where the office is, answer clearly: Tetamo is an Australian-based SaaS business with company presence / office in Sydney, Australia, serving Indonesia's property market digitally.
- If asked whether Tetamo is legitimate, answer clearly: Tetamo is operated by Tetamo Pty Ltd, an Australian Private Company registered in NSW, with ACN 689 780 970 and ABN 18 689 780 970.
`.trim();

const TETAMO_IDENTITY_ID = `
Informasi identitas dan perusahaan Tetamo:
- Tetamo adalah bisnis SaaS berbasis Australia yang melayani pasar properti Indonesia melalui platform digital property marketplace.
- Tetamo dioperasikan oleh Tetamo Pty Ltd.
- Tetamo Pty Ltd adalah Australian Private Company yang terdaftar di NSW, Australia.
- Detail perusahaan Tetamo: ACN 689 780 970 dan ABN 18 689 780 970.
- Tetamo memiliki company presence / office di Sydney, Australia.
- Tetamo beroperasi secara digital melalui www.tetamo.com untuk melayani owner, seller, agent, agency, developer, buyer, dan renter di Indonesia.
- Tetamo bukan agency properti, bukan broker, dan tidak mengambil komisi dari transaksi jual/sewa properti.
- Tetamo membantu pengguna melalui verified listings, direct WhatsApp inquiries, jadwal viewing, AI-assisted listing tools, dashboard, paket, konten edukasi, blog/artikel, dan marketing exposure.
- Jika ditanya Tetamo berlokasi di mana atau office Tetamo di mana, jawab dengan jelas: Tetamo adalah bisnis SaaS berbasis Australia dengan company presence / office di Sydney, Australia, yang melayani pasar properti Indonesia secara digital.
- Jika ditanya apakah Tetamo legit/resmi, jawab dengan jelas: Tetamo dioperasikan oleh Tetamo Pty Ltd, Australian Private Company yang terdaftar di NSW, dengan ACN 689 780 970 dan ABN 18 689 780 970.
`.trim();

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

const PAYMENT_KNOWLEDGE_EN = `
Tetamo payment modes:
- Tetamo currently accepts QRIS and debit/credit card payment.
- QRIS is suitable for users in Indonesia because users can usually pay using QRIS-supported Indonesian bank apps and e-wallets.
- Examples of QRIS-supported payment options commonly used in Indonesia include BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, and ShopeePay.
- Debit and credit card payment is also available.
- Do not say Tetamo accepts manual bank transfer unless the context explicitly confirms it.
- Never ask users to share full card numbers, CVV, OTP, banking passwords, or sensitive payment details.
`.trim();

const PAYMENT_KNOWLEDGE_ID = `
Metode pembayaran Tetamo:
- Tetamo saat ini menerima QRIS dan pembayaran debit/kredit card.
- QRIS cocok untuk pengguna di Indonesia karena biasanya bisa dibayar melalui aplikasi bank dan e-wallet yang mendukung QRIS.
- Contoh pilihan pembayaran QRIS yang umum digunakan di Indonesia termasuk BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, dan ShopeePay.
- Pembayaran debit dan kredit card juga tersedia.
- Jangan bilang Tetamo menerima transfer bank manual kecuali konteks memang mengonfirmasi hal itu.
- Jangan pernah meminta nomor kartu penuh, CVV, OTP, password bank, atau detail pembayaran sensitif.
`.trim();

const PLATFORM_KNOWLEDGE_EN = `
Tetamo platform knowledge:
- Buyer/renter can browse listings, view property details, contact owner/agent through WhatsApp, and schedule viewing when available.
- Owner/seller can sign up, choose owner package, fill property form, upload photos/videos, use AI-generated title/description, verify/pay, and listing enters go-live step.
- Agent/agency can sign up, choose Silver/Gold/Agent Pro, complete profile, manage active listings, leads, viewing schedule, billing/receipt, analytics, commission tracking, and Boost/Spotlight.
- Developer/project owner can use Tetamo for project exposure, developer profile, multiple project/property listings, direct inquiries, and viewing interest. Developer pricing/license should be discussed with Tetamo.
- Tetamo has website, mobile app, marketplace, dashboards, pricing page, FAQ, blog/articles, and education content.
- Tetamo supports bilingual English/Indonesian communication.
`.trim();

const PLATFORM_KNOWLEDGE_ID = `
Pengetahuan platform Tetamo:
- Buyer/renter bisa mencari listing, melihat detail properti, menghubungi owner/agent melalui WhatsApp, dan membuat jadwal viewing jika tersedia.
- Owner/seller bisa sign up, memilih paket owner, mengisi form properti, upload foto/video, menggunakan AI-generated title/description, verifikasi/bayar, lalu listing masuk proses go live.
- Agent/agency bisa sign up, memilih Silver/Gold/Agent Pro, melengkapi profil, mengelola listing aktif, leads, jadwal viewing, billing/receipt, analytics, tracking komisi, dan Boost/Spotlight.
- Developer/project owner bisa menggunakan Tetamo untuk exposure proyek, profil developer, multiple project/property listings, direct inquiries, dan viewing interest. Harga/license developer perlu dibahas dengan Tetamo.
- Tetamo memiliki website, mobile app, marketplace, dashboard, halaman harga, FAQ, blog/artikel, dan konten edukasi.
- Tetamo mendukung komunikasi bilingual English/Indonesian.
`.trim();

const SYSTEM_PROMPT = `
You are Scorpio Assist, Tetamo's AI sales, support, and knowledge assistant.

Use this knowledge priority:
1. Official Tetamo identity/company knowledge.
2. Tetamo platform, website, mobile app, package, pricing, payment, and workflow knowledge.
3. Tetamo FAQ entries.
4. Tetamo blog/article content.
5. Tetamo education content.
6. AI reasoning only after trusted Tetamo context is loaded.

Official Tetamo identity:
${TETAMO_IDENTITY_EN}

Tetamo platform:
${PLATFORM_KNOWLEDGE_EN}

Current Tetamo pricing:
${CURRENT_PRICING_EN}

Payment knowledge:
${PAYMENT_KNOWLEDGE_EN}

Rules:
- Do not guess.
- Do not invent.
- Do not say Tetamo has no office.
- If asked where Tetamo office/location is, answer that Tetamo is an Australian-based SaaS business serving Indonesia's property market, with company presence / office in Sydney, Australia.
- If asked whether Tetamo is legit/registered, mention Tetamo Pty Ltd, Australian Private Company registered in NSW, ACN 689 780 970, ABN 18 689 780 970.
- Tetamo is not a real estate agency or broker and does not take commission from property sale/rental transactions.
- Reply in the requested language.
- For mobile/website support chat, produce answers that can be shown in English or Indonesian.
- For WhatsApp, reply only in the user's message language because WhatsApp has no toggle.
- Be sales-aware: after answering pricing/package/listing questions, recommend the next step.
- Sales flow: sign up → choose role/package → fill profile/listing form → upload photos/videos when relevant → verify/pay → listing/dashboard enters go-live step.
- Never guarantee leads, sales, rentals, ROI, buyers, tenants, or income.
- Do not proactively mention refunds, deducted payments, failed payments, invoice problems, or package activation problems unless the user specifically reports a problem.
- Never ask for OTP, CVV, full card number, banking password, or private financial credentials.
- Suggest Tetamo Agent only for account-specific issues, private support cases, payment problems explicitly reported by the user, refund/invoice issues, developer pricing/license discussion, or when user asks for human help.
- Keep replies clear, practical, professional, friendly, warm, sales-aware, and mobile-friendly.
- Sound like a helpful human assistant, not a manual, script, robot, legal page, or internal admin system.
- Use natural conversation. Be confident, warm, and easy to understand.
- Avoid stiff phrases like "flow", "go-live step", "activation flow", "process flow", "enters go live", or "dashboard flow".
- Use human wording such as:
  - "It’s easy to get started."
  - "After payment, your listing can go live after Tetamo’s quick review."
  - "After payment, your agent dashboard becomes active and you can start adding listings."
  - "Would you like to continue as an owner or agent?"
  - "I can guide you through the next step."
- When explaining steps, do not sound like a technical checklist. Explain naturally and guide the user forward.
- For pricing/package answers, include a soft sales close, but do not pressure the user.
- For support answers, be calm and reassuring.
- For Tetamo identity/company answers, be clear and confident.
- Never sound like you are guessing.
`.trim();

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .trim();
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
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function buildBilingualMessageText(en: string, id: string) {
  return JSON.stringify({
    en: String(en || "").trim(),
    id: String(id || "").trim(),
  });
}

function getLocalizedMessageText(value: string, lang: SupportLanguage) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[lang] === "string" &&
      parsed[lang].trim()
    ) {
      return parsed[lang].trim();
    }

    const fallbackLang: SupportLanguage = lang === "id" ? "en" : "id";
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[fallbackLang] === "string" &&
      parsed[fallbackLang].trim()
    ) {
      return parsed[fallbackLang].trim();
    }
  } catch {
    return raw;
  }

  return raw;
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
    value.includes("mobile_chat_guest_id") ||
    value.includes("website_chat_id") ||
    value.includes("website_chat_guest_id")
  ) {
    return "id";
  }

  if (
    value.includes("_en") ||
    value.includes("english") ||
    value.includes("mobile_chat_en") ||
    value.includes("mobile_chat_guest_en") ||
    value.includes("website_chat_en") ||
    value.includes("website_chat_guest_en")
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
    "kartu",
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
    "kantor",
    "dimana",
    "di mana",
    "resmi",
    "legal",
    "perusahaan",
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
    "office",
    "located",
    "location",
    "legit",
    "registered",
    "company",
  ];

  const indonesianHits = indonesianWords.filter((word) =>
    value.includes(word),
  ).length;

  const englishHits = englishWords.filter((word) =>
    value.includes(word),
  ).length;

  if (indonesianHits >= 2 && indonesianHits > englishHits) return "id";
  if (englishHits >= 2 && englishHits > indonesianHits) return "en";
  if (value.length <= 18 && fallbackLanguage) return fallbackLanguage;
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

  if (includesAny(value, ["guest", "visitor", "tamu"])) return "guest";

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
    "faktur",
    "masalah pembayaran",
    "pembayaran gagal",
    "sudah bayar",
    "sudah membayar",
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

function isTetamoIdentityQuestion(text: string) {
  const value = normalize(text);

  return [
    "what is tetamo",
    "apa itu tetamo",
    "tentang tetamo",
    "where is tetamo",
    "where is your office",
    "where is tetamo office",
    "tetamo office",
    "office location",
    "company location",
    "where are you located",
    "where is it located",
    "lokasi tetamo",
    "kantor tetamo",
    "tetamo dimana",
    "tetamo di mana",
    "alamat tetamo",
    "kantor dimana",
    "kantor di mana",
    "is tetamo legit",
    "is tetamo legal",
    "is tetamo registered",
    "is tetamo real",
    "tetamo legit",
    "tetamo legal",
    "tetamo registered",
    "apakah tetamo resmi",
    "apakah tetamo legal",
    "apakah tetamo legit",
    "tetamo resmi",
    "tetamo legal",
    "tetamo perusahaan apa",
    "company name",
    "registered company",
    "acn",
    "abn",
  ].some((keyword) => value.includes(keyword));
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
    "kartu debit",
    "kartu kredit",
    "dompet digital",
    "bank indonesia",
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
      if (value.includes("payment was deducted")) return false;
      if (value.includes("package is not active")) return false;
      if (value.includes("saldo terpotong")) return false;
      if (value.includes("paket belum aktif")) return false;
      return true;
    })
    .join("\n")
    .trim();
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

function buildTetamoIdentityReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Tetamo adalah bisnis SaaS berbasis Australia yang melayani pasar properti Indonesia melalui platform digital property marketplace.

Tetamo dioperasikan oleh Tetamo Pty Ltd, Australian Private Company yang terdaftar di NSW, Australia, dengan ACN 689 780 970 dan ABN 18 689 780 970.

Tetamo memiliki company presence / office di Sydney, Australia, dan beroperasi secara digital melalui www.tetamo.com untuk melayani owner, agent, agency, developer, buyer, dan renter di Indonesia.

Tetamo bukan agency properti atau broker, dan tidak mengambil komisi dari transaksi jual/sewa properti. Tetamo membantu pengguna melalui verified listings, direct WhatsApp inquiry, jadwal viewing, AI-assisted listing tools, dashboard, paket, blog/artikel, edukasi, dan marketing exposure.

Jika Anda ingin mulai menggunakan Tetamo, alurnya mudah:
Sign up → pilih role owner/agent/developer → pilih paket jika diperlukan → buat listing/profil → ikuti step verifikasi dan pembayaran → listing masuk proses go live.`;
  }

  return `Tetamo is an Australian-based SaaS business serving Indonesia's property market through a digital property marketplace platform.

Tetamo is operated by Tetamo Pty Ltd, an Australian Private Company registered in NSW, Australia, with ACN 689 780 970 and ABN 18 689 780 970.

Tetamo has company presence / office in Sydney, Australia, and operates digitally through www.tetamo.com to serve owners, agents, agencies, developers, buyers, and renters in Indonesia.

Tetamo is not a real estate agency or broker, and it does not take commission from property sale/rental transactions. Tetamo helps users through verified listings, direct WhatsApp inquiries, viewing schedules, AI-assisted listing tools, dashboards, packages, blog/articles, education content, and marketing exposure.

If you want to start using Tetamo, the flow is simple:
Sign up → choose owner/agent/developer role → choose a package if needed → create your listing/profile → follow verification and payment steps → listing enters go-live step.`;
}

function buildGreetingReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Halo, saya Scorpio Assist dari Tetamo.

Saya bisa bantu Anda sebagai buyer/renter, owner/seller, agent, developer, atau guest.

Anda bisa tanya tentang:
- Apa itu Tetamo dan legalitasnya
- Lokasi/office Tetamo
- Cara pasang listing
- Paket owner atau agent
- QRIS/debit/kredit card
- Blog, artikel, dan edukasi Tetamo
- Cara mencari properti atau jadwal viewing`;
  }

  return `Hi, I’m Scorpio Assist from Tetamo.

I can help you as a buyer/renter, owner/seller, agent, developer, or guest.

You can ask about:
- What Tetamo is and its company legitimacy
- Tetamo office/location
- How to list a property
- Owner or agent packages
- QRIS/debit/credit card payment
- Tetamo blog, articles, and education
- How to find properties or schedule viewing`;
}

function buildPaymentModeReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Tetamo saat ini menerima pembayaran melalui QRIS dan debit/kredit card.

QRIS cocok untuk pengguna di Indonesia karena biasanya bisa dibayar melalui aplikasi bank dan e-wallet yang mendukung QRIS, termasuk pilihan populer seperti BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, dan ShopeePay.

Debit dan kredit card juga tersedia.

Setelah Anda memilih paket, Tetamo akan mengarahkan Anda ke halaman pembayaran agar prosesnya mudah.`;
  }

  return `Tetamo currently accepts QRIS and debit/credit card payments.

QRIS is suitable for users in Indonesia because it can usually be paid through QRIS-supported Indonesian bank apps and e-wallets, including popular options such as BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, and ShopeePay.

Debit and credit card payment is also available.

Once you choose a package, Tetamo will guide you to the payment page so you can complete it easily.`;
}

function buildDeveloperReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk developer, Tetamo membantu exposure proyek, profil developer, multiple listing properti/proyek, direct WhatsApp inquiry, minat viewing, dan visibilitas marketplace.

Harga developer tidak sama dengan paket owner atau agent karena biasanya tergantung kebutuhan proyek, volume listing, dan license/use arrangement.

Untuk mulai:
1. Hubungi Tetamo
2. Jelaskan proyek dan volume listing
3. Diskusikan kebutuhan exposure/marketplace
4. Tetamo bantu arahkan package/license yang sesuai

Untuk developer pricing/license, sebaiknya lanjut chat dengan Tetamo Agent. Jam support: ${SUPPORT_HOURS_ID}`;
  }

  return `For developers, Tetamo helps with project exposure, developer profile, multiple property/project listings, direct WhatsApp inquiries, viewing interest, and marketplace visibility.

Developer pricing is not the same as owner or agent packages because it usually depends on project needs, listing volume, and license/use arrangement.

To get started:
1. Contact Tetamo
2. Explain your project and listing volume
3. Discuss exposure/marketplace needs
4. Tetamo can guide you to the right package/license arrangement

For developer pricing/license, it is best to continue with a Tetamo Agent. Support hours: ${SUPPORT_HOURS_EN}`;
}

function buildBuyerRenterReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Jika Anda buyer atau renter, Anda bisa mencari properti di Tetamo, cek detail listing, lalu hubungi owner/agent langsung melalui WhatsApp jika tersedia.

Tetamo membantu dengan verified listing/owner/agent jika sudah disetujui, foto/video properti, informasi harga, dan jadwal viewing jika listing menyediakan schedule viewing.

Alurnya mudah:
Cari properti → buka detail listing → cek foto/video/harga/lokasi → chat via WhatsApp → jadwalkan viewing jika tersedia.

Mulai dari marketplace:
${SITE_URL}`;
  }

  return `If you are a buyer or renter, you can browse properties on Tetamo, check the listing details, then contact the owner/agent directly through WhatsApp when available.

Tetamo helps with verified listing/owner/agent status when approved, property photos/videos, price information, and viewing scheduling when the listing supports it.

The flow is simple:
Search property → open listing detail → check photos/videos/price/location → chat via WhatsApp → schedule viewing when available.

Start from the marketplace:
${SITE_URL}`;
}

function buildOwnerSellerReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk owner/seller, Tetamo membantu properti Anda tampil lebih profesional di marketplace dan app, dengan direct WhatsApp inquiry, jadwal viewing, AI-generated title/description, foto/video, dan verification badge setelah disetujui.

Alur setup sangat mudah:
1. Sign up sebagai owner
2. Pilih paket Basic, Priority, atau Featured
3. Isi form listing properti
4. Upload foto/video
5. Ikuti step verifikasi dan pembayaran
6. Listing masuk proses review dan bisa tampil live setelah disetujui

Jika ingin mulai sederhana, Basic sudah cukup. Jika ingin exposure lebih kuat, Priority lebih cocok. Jika ingin visibilitas tertinggi plus social media posting, Featured adalah pilihan terbaik.

Apakah Anda ingin lanjut daftar sebagai owner dan pilih paket listing?

Lihat paket owner:
${PRICELIST_URL}#owner-packages`;
  }

  return `For owners/sellers, Tetamo helps your property look more professional on the marketplace and app, with direct WhatsApp inquiries, viewing scheduling, AI-generated title/description, photos/videos, and a verification badge after approval.

The setup is simple:
1. Sign up as an owner
2. Choose Basic, Priority, or Featured
3. Fill in the property listing form
4. Upload photos/videos
5. Follow the verification and payment steps
6. The listing can go live after Tetamo’s quick review

If you want to start simple, Basic is enough. If you want stronger exposure, Priority is better. If you want the highest visibility plus social media posting, Featured is the best choice.

Would you like to proceed with owner signup and choose a listing package?

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

Alur setup sangat mudah:
1. Sign up sebagai agent
2. Pilih paket Silver, Gold, atau Agent Pro
3. Lengkapi profil agent
4. Mulai tambah listing properti
5. Ikuti step pembayaran
6. Dashboard agent aktif dan listing bisa masuk proses go live

Jika Anda baru mulai, Silver cukup untuk membangun presence. Jika Anda punya banyak listing, Gold atau Agent Pro memberi value lebih besar per listing dan fitur exposure lebih kuat.

Apakah Anda ingin lanjut daftar sebagai agent dan pilih paket?

Lihat paket agent:
${PRICELIST_URL}#agent-packages`;
  }

  return `For agents/agencies, Tetamo helps you look more professional and manage listings, leads, viewings, billing, receipts, analytics, and commission tracking in one dashboard.

Current agent packages:
- Silver: Rp499,000/year for 30 active listings
- Gold: Rp1,800,000/year for 100 active listings
- Agent Pro: Rp3,999,000/year for 500 active listings
- Agent Pro also has a Rp399,000/month option with a 12-month commitment

The setup is simple:
1. Sign up as an agent
2. Choose Silver, Gold, or Agent Pro
3. Complete your agent profile
4. Start adding property listings
5. Follow the payment steps
6. Your agent dashboard becomes active and listings can enter go-live step

If you are starting, Silver is enough to build your presence. If you manage many listings, Gold or Agent Pro gives stronger value per listing and better exposure features.

Would you like to start as an agent? I can guide you to the best package for your listings.

See agent packages:
${PRICELIST_URL}#agent-packages`;
}

function buildWhatsAppFallbackReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Halo, selamat datang di Tetamo.

Tetamo adalah bisnis SaaS berbasis Australia yang melayani pasar properti Indonesia melalui platform digital property marketplace.

Apakah Anda ingin pasang listing properti, mencari properti, bertanya tentang paket owner/agen, atau metode pembayaran QRIS/debit/kredit?`;
  }

  return `Hi, welcome to Tetamo.

Tetamo is an Australian-based SaaS business serving Indonesia's property market through a digital property marketplace platform.

Are you looking to list a property, find a property, ask about owner/agent packages, or ask about QRIS/debit/credit payment?`;
}

function buildFallbackHelpReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Saya belum menemukan jawaban yang cukup pasti dari knowledge Tetamo yang tersedia.

Anda bisa cek FAQ Tetamo:
${FAQ_URL}

Untuk pertanyaan khusus akun, pembayaran yang bermasalah, invoice/refund, developer pricing/license, atau bantuan manusia, silakan chat dengan Tetamo Agent. Jam support: ${SUPPORT_HOURS_ID}`;
  }

  return `I could not find a confident answer from the available Tetamo knowledge.

You can check Tetamo FAQ:
${FAQ_URL}

For account-specific questions, reported payment issues, invoice/refund, developer pricing/license, or human support, please chat with a Tetamo Agent. Support hours: ${SUPPORT_HOURS_EN}`;
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

function scoreTextAgainstQuestion(text: string, question: string) {
  const haystack = normalize(text);
  const words = normalize(question)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);

  let score = 0;

  for (const word of words) {
    if (haystack.includes(word)) score += 2;
  }

  return score;
}

function scoreFaqEntry(entry: any, question: string, lang: SupportLanguage) {
  const questionText =
    lang === "id"
      ? `${entry?.question_id || ""} ${entry?.question_en || ""}`
      : `${entry?.question_en || ""} ${entry?.question_id || ""}`;

  const answerText =
    lang === "id"
      ? `${entry?.answer_id || ""} ${entry?.answer_en || ""}`
      : `${entry?.answer_en || ""} ${entry?.answer_id || ""}`;

  const keywords = Array.isArray(entry?.keywords)
    ? entry.keywords.join(" ")
    : "";
  const slug = entry?.slug || "";

  let score = scoreTextAgainstQuestion(
    `${questionText} ${answerText} ${keywords} ${slug}`,
    question,
  );

  if (normalize(questionText).includes(normalize(question))) score += 15;

  return score;
}

function findBestFaqEntry(
  entries: any[],
  question: string,
  lang: SupportLanguage,
) {
  if (!entries.length) return null;

  const scored = entries
    .map((entry) => ({ entry, score: scoreFaqEntry(entry, question, lang) }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 6) return null;

  return scored[0].entry;
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
  const title =
    lang === "id"
      ? `${article?.title_id || ""} ${article?.title || ""}`
      : `${article?.title || ""} ${article?.title_id || ""}`;

  const excerpt =
    lang === "id"
      ? `${article?.excerpt_id || ""} ${article?.excerpt || ""}`
      : `${article?.excerpt || ""} ${article?.excerpt_id || ""}`;

  const content =
    lang === "id"
      ? `${article?.content_id || ""} ${article?.content || ""}`
      : `${article?.content || ""} ${article?.content_id || ""}`;

  return scoreTextAgainstQuestion(
    `${title} ${excerpt} ${content.slice(0, 2500)} ${article?.slug || ""}`,
    question,
  );
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
Relevant Tetamo blog/article:
Title: ${title}
Slug: ${slug}
Excerpt: ${excerpt}
Content snippet: ${cleanedContent.slice(0, 1800)}
Article URL: ${slug ? `${SITE_URL}/blog/${slug}` : BLOG_URL}
`.trim();
}

async function fetchEducationContext(question: string, lang: SupportLanguage) {
  const tableAttempts = [
    {
      table: "education_videos",
      select: "id, title, title_id, description, description_id, slug, status",
    },
    {
      table: "education_content",
      select:
        "id, title, title_id, description, description_id, content, content_id, slug, status",
    },
    {
      table: "education_articles",
      select:
        "id, title, title_id, excerpt, excerpt_id, content, content_id, slug, status",
    },
  ];

  const candidates: any[] = [];

  for (const attempt of tableAttempts) {
    try {
      const { data, error } = await supabase
        .from(attempt.table)
        .select(attempt.select)
        .limit(20);

      if (error || !data?.length) continue;

      for (const row of data) {
        candidates.push({ ...row, _table: attempt.table });
      }
    } catch {
      continue;
    }
  }

  if (!candidates.length) return "";

  const scored = candidates
    .map((item) => {
      const text =
        lang === "id"
          ? `${item.title_id || item.title || ""} ${item.description_id || item.description || ""} ${item.excerpt_id || item.excerpt || ""} ${item.content_id || item.content || ""} ${item.slug || ""}`
          : `${item.title || item.title_id || ""} ${item.description || item.description_id || ""} ${item.excerpt || item.excerpt_id || ""} ${item.content || item.content_id || ""} ${item.slug || ""}`;

      return { item, score: scoreTextAgainstQuestion(text, question) };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 4) return "";

  const best = scored[0].item;
  const title =
    lang === "id"
      ? best.title_id || best.title || ""
      : best.title || best.title_id || "";

  const description =
    lang === "id"
      ? best.description_id ||
        best.description ||
        best.excerpt_id ||
        best.excerpt ||
        ""
      : best.description ||
        best.description_id ||
        best.excerpt ||
        best.excerpt_id ||
        "";

  const content =
    lang === "id"
      ? best.content_id || best.content || ""
      : best.content || best.content_id || "";

  return `
Relevant Tetamo education content:
Title: ${title}
Source table: ${best._table}
Description: ${description}
Content snippet: ${String(content).slice(0, 1200)}
`.trim();
}

function buildCoreKnowledge(lang: SupportLanguage) {
  if (lang === "id") {
    return `
${TETAMO_IDENTITY_ID}

${PLATFORM_KNOWLEDGE_ID}

${CURRENT_PRICING_ID}

${PAYMENT_KNOWLEDGE_ID}
`.trim();
  }

  return `
${TETAMO_IDENTITY_EN}

${PLATFORM_KNOWLEDGE_EN}

${CURRENT_PRICING_EN}

${PAYMENT_KNOWLEDGE_EN}
`.trim();
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

  if (asksDeveloper) return buildDeveloperReply(lang);

  if (lang === "id") {
    if (asksOwner && !asksAgent) {
      return `Paket owner Tetamo saat ini:

- Basic Listing: Rp50.000 untuk 1 tahun, termasuk 1 listing aktif.
- Priority Listing: Rp150.000 untuk 1 tahun, dengan visibilitas lebih tinggi dari Basic.
- Featured Listing: Rp550.000 untuk 1 tahun, dengan featured exposure, visibilitas tertinggi, social media posting, dan Tetamo Agent support.

Alur setup sangat mudah:
1. Sign up sebagai owner
2. Pilih paket Basic, Priority, atau Featured
3. Isi form listing properti
4. Upload foto/video
5. Ikuti step verifikasi dan pembayaran
6. Listing masuk proses review dan bisa tampil live setelah disetujui

Pembayaran tersedia melalui QRIS dan debit/kredit card. QRIS biasanya bisa digunakan melalui aplikasi bank dan e-wallet Indonesia yang mendukung QRIS seperti BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, dan ShopeePay.

Jika ingin mulai sederhana, Basic cukup. Jika ingin exposure paling kuat, Featured adalah pilihan terbaik.

Apakah Anda ingin mulai sebagai owner? Saya bisa bantu arahkan paket yang paling cocok.

Lihat paket owner:
${pricingUrl}`;
    }

    if (asksAgent && !asksOwner) {
      return `Paket agent Tetamo saat ini:

- Silver: Rp499.000/tahun untuk 30 listing aktif.
- Gold: Rp1.800.000/tahun untuk 100 listing aktif.
- Agent Pro: Rp3.999.000/tahun untuk 500 listing aktif.
- Agent Pro opsi bulanan: Rp399.000/bulan dengan komitmen 12 bulan.

Alur setup sangat mudah:
1. Sign up sebagai agent
2. Pilih paket Silver, Gold, atau Agent Pro
3. Lengkapi profil agent
4. Mulai tambah listing properti
5. Ikuti step pembayaran
6. Dashboard agent aktif dan listing bisa masuk proses go live

Silver cocok untuk mulai tampil profesional. Gold cocok untuk agent aktif dengan banyak listing. Agent Pro cocok untuk agent/agency yang ingin scale lebih besar dan exposure premium.

Pembayaran tersedia melalui QRIS dan debit/kredit card.

Apakah Anda ingin mulai sebagai agent? Saya bisa bantu arahkan paket terbaik sesuai jumlah listing Anda.

Lihat paket agent:
${pricingUrl}`;
    }

    if (asksAddOn) {
      return `Add-on Tetamo saat ini:

- Boost Listing: Rp300.000 untuk 14 hari, untuk meningkatkan visibilitas listing di marketplace.
- Homepage Spotlight: Rp200.000 untuk 7 hari, untuk tampil di area spotlight homepage. Slot terbatas.

Add-on tersedia untuk owner dan agent. Pembayaran tersedia melalui QRIS dan debit/kredit card.

Apakah Anda ingin lanjut memilih add-on untuk listing Anda?

Lihat add-on:
${pricingUrl}`;
    }

    if (asksEducation) {
      return `Education Pass Tetamo saat ini adalah Rp100.000 untuk 90 hari.

Paket ini memberikan akses premium ke video edukasi Tetamo untuk owner atau non-member agent. Paket ini tidak auto renew.

Pembayaran tersedia melalui QRIS dan debit/kredit card.

Apakah Anda ingin lanjut ke Education Pass?

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

Mudah untuk mulai:
Sign up → pilih paket → isi form listing/profil → upload foto/video → bayar → listing atau dashboard Anda aktif setelah pembayaran dan review singkat dari Tetamo.

Pembayaran tersedia melalui QRIS dan debit/kredit card.

Apakah Anda ingin lanjut sebagai owner atau agent?

Harga terbaru:
${pricingUrl}`;
  }

  if (asksOwner && !asksAgent) {
    return `Tetamo owner packages are:

- Basic Listing: Rp50,000 for 1 year, including 1 active listing.
- Priority Listing: Rp150,000 for 1 year, with higher visibility than Basic.
- Featured Listing: Rp550,000 for 1 year, with featured exposure, highest visibility, social media posting, and Tetamo Agent support.

The setup is simple:
1. Sign up as an owner
2. Choose Basic, Priority, or Featured
3. Fill in the property listing form
4. Upload photos/videos
5. Follow the verification and payment steps
6. The listing can go live after Tetamo’s quick review

Payment is available through QRIS and debit/credit card. QRIS can usually be used through QRIS-supported Indonesian bank apps and e-wallets such as BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, and ShopeePay.

If you want to start simple, Basic is enough. If you want the strongest exposure, Featured is the best choice.

Would you like to start as an owner? I can guide you to the right package.

See owner packages:
${pricingUrl}`;
  }

  if (asksAgent && !asksOwner) {
    return `Tetamo agent packages are:

- Silver: Rp499,000/year for 30 active listings.
- Gold: Rp1,800,000/year for 100 active listings.
- Agent Pro: Rp3,999,000/year for 500 active listings.
- Agent Pro monthly option: Rp399,000/month with a 12-month commitment.

The setup is simple:
1. Sign up as an agent
2. Choose Silver, Gold, or Agent Pro
3. Complete your agent profile
4. Start adding property listings
5. Follow the payment steps
6. Your agent dashboard becomes active and listings can enter go-live step

Silver is good if you are starting professionally. Gold is better for active agents with more listings. Agent Pro is best for agents/agencies that want to scale bigger with premium exposure.

Payment is available through QRIS and debit/credit card.

Would you like to start as an agent? I can guide you to the best package for your listings.

See agent packages:
${pricingUrl}`;
  }

  if (asksAddOn) {
    return `Tetamo add-ons are:

- Boost Listing: Rp300,000 for 14 days, to increase listing visibility in the marketplace.
- Homepage Spotlight: Rp200,000 for 7 days, to show a listing in the homepage spotlight area. Slots are limited.

Add-ons are available for owners and agents. Payment is available through QRIS and debit/credit card.

Would you like to proceed with an add-on for your listing?

Latest pricing:
${pricingUrl}`;
  }

  if (asksEducation) {
    return `Tetamo Education Pass is Rp100,000 for 90 days.

It gives premium access to Tetamo educational videos for owners or non-member agents. It does not auto renew.

Payment is available through QRIS and debit/credit card.

Would you like to proceed with Education Pass?

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

It’s easy to get started:
Sign up → choose package → fill form/profile → upload photos/videos → pay → your listing or dashboard becomes active after payment and Tetamo’s quick review.

Payment is available through QRIS and debit/credit card.

Would you like to proceed as an owner or agent?

Latest pricing:
${pricingUrl}`;
}

function buildDirectReply(params: {
  question: string;
  lang: SupportLanguage;
  audience: AudienceType;
}): string {
  const { question, lang, audience } = params;
  const value = normalize(question);

  if (isGreetingOrVague(question)) return buildGreetingReply(lang);
  if (isTetamoIdentityQuestion(question)) return buildTetamoIdentityReply(lang);
  if (isPaymentModeQuestion(question)) return buildPaymentModeReply(lang);
  if (audience === "developer") return buildDeveloperReply(lang);

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
  educationContext: string;
}) {
  const {
    question,
    lang,
    audience,
    conversationContext,
    historyText,
    articleContext,
    educationContext,
  } = params;

  if (!Deno.env.get("OPENAI_API_KEY")) return "";

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

Official Tetamo knowledge:
${coreKnowledge}

${articleContext || "No strongly matched Tetamo blog/article found."}

${educationContext || "No strongly matched Tetamo education content found."}

Answer as Scorpio Assist.

Rules:
- Reply in ${lang === "id" ? "Indonesian" : "English"}.
- Answer from Tetamo official knowledge, FAQ, blog/article, education, and platform knowledge.
- Do not guess.
- If the answer is about Tetamo identity, office, location, legitimacy, company, ACN/ABN, or what Tetamo is, use the official Tetamo identity knowledge.
- If the user asks about packages/pricing/listing, answer clearly and include a soft next step.
- If the user asks about QRIS/payment modes, mention QRIS and debit/credit card only.
- Do not proactively mention payment failures, refunds, deducted payments, package activation issues, or invoice problems unless the user specifically reports that problem.
- Do not guarantee leads, sales, rentals, ROI, buyers, tenants, or income.
- Keep it clear, practical, and mobile-friendly.
`.trim();

  const response = await openai.responses.create({
    model: MODEL,
    instructions: SYSTEM_PROMPT,
    input: userPrompt,
  });

  return humanizeScorpioReply(String(response.output_text || "").trim(), lang);
}

async function buildSupportReply(params: {
  question: string;
  lang: SupportLanguage;
  audience: AudienceType;
  conversationContext: string;
  historyText: string;
}): Promise<SupportReplyResult> {
  const { question, lang, audience, conversationContext, historyText } = params;

  if (isTetamoIdentityQuestion(question)) {
    return {
      text: buildTetamoIdentityReply(lang),
      usedOfficialIdentity: true,
    };
  }

  if (isPricingQuestion(question)) {
    return {
      text: await answerPricingQuestion({ question, lang }),
      usedCurrentPricing: true,
    };
  }

  const directReply = buildDirectReply({ question, lang, audience });
  if (directReply) {
    return { text: directReply };
  }

  const faqEntries = await fetchFaqEntries();
  const matchedFaq = findBestFaqEntry(faqEntries, question, lang);
  if (matchedFaq) {
    const faqAnswer = buildFaqAnswer(matchedFaq, lang);
    if (faqAnswer) return { text: faqAnswer, matchedFaq };
  }

  const articles = await fetchPublishedArticles();
  const matchedArticle = findBestArticle(articles, question, lang);
  const articleContext = buildArticleContext(matchedArticle, lang);

  const educationContext = await fetchEducationContext(question, lang);

  const aiText = await generateOpenAiReply({
    question,
    lang,
    audience,
    conversationContext,
    historyText,
    articleContext,
    educationContext,
  });

  if (aiText) {
    return {
      text: aiText,
      matchedArticle,
      matchedEducation: educationContext ? true : null,
    };
  }

  return { text: buildFallbackHelpReply(lang) };
}

function humanizeScorpioReply(text: string, lang: SupportLanguage) {
  let value = removeOldPricingLines(String(text || "").trim());

  const replacements: Array<[string, string]> = [
    ["review/live flow", "go-live step"],
    ["live/review flow", "go-live step"],
    ["activation/review", "next step"],
    ["enters review/live flow", "can move toward going live"],
    ["can enter review/live flow", "can move toward going live"],
    [
      "listing/dashboard activates after review",
      "your listing or dashboard becomes active after payment and Tetamo’s quick review",
    ],
    [
      "Your agent dashboard becomes active and listings can enter review/live flow",
      "After payment, your agent dashboard becomes active and you can start adding listings",
    ],
    [
      "Dashboard agent aktif dan listing bisa masuk proses review/live",
      "Setelah pembayaran, dashboard agent Anda aktif dan Anda bisa mulai menambahkan listing",
    ],
    [
      "listing/dashboard aktif setelah proses review",
      "listing atau dashboard Anda aktif setelah pembayaran dan review singkat dari Tetamo",
    ],
  ];

  for (const [oldText, newText] of replacements) {
    value = value.split(oldText).join(newText);
  }

  if (lang === "id") {
    value = value
      .replace("Alur mudah:", "Mudah untuk mulai:")
      .replace("Alur setup sangat mudah:", "Mudah untuk mulai:")
      .replace("Untuk mulai:", "Untuk mulai:");
  } else {
    value = value
      .replace("Easy flow:", "It’s easy to get started:")
      .replace("The setup is simple:", "It’s easy to get started:")
      .replace("Starting flow:", "To get started:");
  }

  return value.trim();
}

async function generateTwilioWhatsAppReply(question: string) {
  const cleanQuestion = String(question || "").trim();
  const lang = detectReplyLanguage(cleanQuestion);

  if (!cleanQuestion) return buildWhatsAppFallbackReply(lang);

  try {
    const audience = detectAudience(cleanQuestion);

    const result = await buildSupportReply({
      question: cleanQuestion,
      lang,
      audience,
      conversationContext: "Source: Twilio WhatsApp inbound",
      historyText: `USER: ${cleanQuestion}`,
    });

    return result.text || buildWhatsAppFallbackReply(lang);
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
    return twimlResponse(buildWhatsAppFallbackReply("en"));
  }
}

async function handleWebsiteSupportAi(req: Request) {
  const payload = await req.json();
  const messageId = payload?.message_id || payload?.record?.id || null;

  if (!messageId) return jsonResponse({ error: "Missing message_id" }, 400);

  const { data: incomingMessage, error: incomingError } = await supabase
    .from("support_messages")
    .select(
      "id, conversation_id, sender_type, message_text, ai_status, created_at",
    )
    .eq("id", messageId)
    .maybeSingle();

  if (incomingError) throw incomingError;
  if (!incomingMessage)
    return jsonResponse({ error: "Message not found" }, 404);

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
    .map((item: any) => {
      const sender = String(item.sender_type).toUpperCase();
      const text = getLocalizedMessageText(
        String(item.message_text || ""),
        lang,
      );
      return `${sender}: ${text}`;
    })
    .join("\n");

  const conversationContext = buildConversationContext(conversation);

  const result = await buildSupportReply({
    question,
    lang,
    audience,
    conversationContext,
    historyText,
  });

  const alternateLang: SupportLanguage = lang === "id" ? "en" : "id";

  const alternateResult = await buildSupportReply({
    question,
    lang: alternateLang,
    audience,
    conversationContext,
    historyText,
  });

  let aiText = humanizeScorpioReply(result.text, lang);
  let alternateAiText = humanizeScorpioReply(
    alternateResult.text,
    alternateLang,
  );

  if (!aiText) aiText = buildFallbackHelpReply(lang);
  if (!alternateAiText) alternateAiText = buildFallbackHelpReply(alternateLang);

  const aiTextEn = lang === "en" ? aiText : alternateAiText;
  const aiTextId = lang === "id" ? aiText : alternateAiText;
  const storedAiText = buildBilingualMessageText(aiTextEn, aiTextId);

  const shouldHandoff = needsHumanHelp(question);

  const { error: insertAiError } = await supabase
    .from("support_messages")
    .insert({
      conversation_id: incomingMessage.conversation_id,
      sender_type: "ai",
      message_text: storedAiText,
      ai_status: "sent",
      suggested_action: shouldHandoff ? "handoff_to_human" : null,
      suggested_action_label: null,
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
      ai_reply: getLocalizedMessageText(storedAiText, lang),
      ai_reply_bilingual: JSON.parse(storedAiText),
      suggested_action: shouldHandoff ? "handoff_to_human" : null,
      suggested_action_label: null,
      matched_faq_slug: result.matchedFaq?.slug ?? null,
      matched_article_slug: result.matchedArticle?.slug ?? null,
      reply_language: lang,
      detected_audience: audience,
      used_current_pricing: result.usedCurrentPricing ?? false,
      used_official_identity: result.usedOfficialIdentity ?? false,
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
          "Tetamo AI reply function is active. Supports Scorpio Assist, official Tetamo identity, FAQ/blog/education search, package sales flow, website/mobile bilingual replies, and Twilio WhatsApp replies.",
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
