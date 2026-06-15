import { createClient } from "npm:@supabase/supabase-js@2";
import OpenAI from "npm:openai";

type SupportLanguage = "en" | "id";
type AudienceType =
  | "buyer_renter"
  | "owner_seller"
  | "agent_agency"
  | "developer"
  | "unknown";

type SupportReplyResult = {
  text: string;
  suggestedAction?: "handoff_to_human" | null;
  suggestedActionLabel?: string | null;
  usedCurrentPricing?: boolean;
  usedOfficialIdentity?: boolean;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://www.tetamo.com").replace(
  /\/+$/,
  "",
);

const PRICELIST_URL = `${SITE_URL}/pricelist`;
const BLOG_URL = `${SITE_URL}/blog`;
const EDUCATION_URL = `${SITE_URL}/education`;
const EDUCATION_DASHBOARD_GUIDE_URL = `${SITE_URL}/education/cara-menggunakan-dashboard-tetamo-untuk-owner-dan-agent`;
const EDUCATION_POSTING_PROPERTY_URL = `${SITE_URL}/education/cara-posting-properti-di-tetamo`;
const FAQ_URL = `${SITE_URL}/faq`;

const SUPPORT_HOURS_EN = "Monday - Friday, 9:00 AM - 6:00 PM.";
const SUPPORT_HOURS_ID = "Senin - Jumat, 9:00 pagi - 6:00 sore.";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const OWNER_PRICING_EN = `
Owner packages:
- Basic Listing: Rp50,000 for 1 year, 1 active listing.
- Priority Listing: Rp150,000 for 1 year, 1 active listing with higher visibility.
- Featured Listing: Rp550,000 for 1 year, 1 active listing with featured exposure, highest visibility, social media posting, and Tetamo Agent support.
`.trim();

const OWNER_PRICING_ID = `
Paket owner:
- Basic Listing: Rp50.000 untuk 1 tahun, 1 listing aktif.
- Priority Listing: Rp150.000 untuk 1 tahun, 1 listing aktif dengan visibilitas lebih tinggi.
- Featured Listing: Rp550.000 untuk 1 tahun, 1 listing aktif dengan featured exposure, visibilitas tertinggi, posting social media, dan Tetamo Agent support.
`.trim();

const AGENT_PRICING_EN = `
Agent packages:
- Silver: Rp499,000/year for 30 active listings.
- Gold: Rp1,800,000/year for 100 active listings.
- Agent Pro: Rp3,999,000/year for 500 active listings.
- Agent Pro monthly option: Rp399,000/month with a 12-month commitment.
`.trim();

const AGENT_PRICING_ID = `
Paket agent:
- Silver: Rp499.000/tahun untuk 30 listing aktif.
- Gold: Rp1.800.000/tahun untuk 100 listing aktif.
- Agent Pro: Rp3.999.000/tahun untuk 500 listing aktif.
- Opsi bulanan Agent Pro: Rp399.000/bulan dengan komitmen 12 bulan.
`.trim();

const ADD_ON_PRICING_EN = `
Add-ons:
- Boost Listing: Rp300,000 for 14 days.
- Homepage Spotlight: Rp200,000 for 7 days.
`.trim();

const ADD_ON_PRICING_ID = `
Add-on:
- Boost Listing: Rp300.000 untuk 14 hari.
- Homepage Spotlight: Rp200.000 untuk 7 hari.
`.trim();

const EDUCATION_PRICING_EN = `
Education:
- Education Pass: Rp100,000 for 90 days.
`.trim();

const EDUCATION_PRICING_ID = `
Edukasi:
- Education Pass: Rp100.000 untuk 90 hari.
`.trim();

function normalize(text: string) {
  return String(text || "").toLowerCase().trim();
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function limitReply(value: string, max = 1600) {
  const clean = String(value || "").trim();

  if (clean.length <= max) return clean;

  return `${clean.slice(0, max - 10).trim()}...`;
}

function createTwimlMessage(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(limitReply(message, 1500))}</Message>
</Response>`;
}

function twimlResponse(message: string) {
  return new Response(createTwimlMessage(message), {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

function includesAny(text: string, keywords: string[]) {
  const value = normalize(text);
  return keywords.some((keyword) => value.includes(keyword));
}

function sourceLanguage(source?: string | null): SupportLanguage | null {
  const value = normalize(source || "");

  if (value.includes("_id") || value.includes("indonesia")) return "id";
  if (value.includes("_en") || value.includes("english")) return "en";

  return null;
}

function detectReplyLanguage(
  text: string,
  fallbackLanguage: SupportLanguage | null = null,
): SupportLanguage {
  const value = normalize(text);

  const indonesianWords = [
    "saya",
    "mau",
    "ingin",
    "cara",
    "bagaimana",
    "berapa",
    "harga",
    "paket",
    "properti",
    "agen",
    "pemilik",
    "jual",
    "sewa",
    "pasang",
    "iklan",
    "daftar",
    "bayar",
    "qris",
    "apakah",
    "dimana",
    "di mana",
    "kantor",
    "resmi",
    "bisa",
    "tolong",
  ];

  const englishWords = [
    "how",
    "what",
    "where",
    "price",
    "pricing",
    "package",
    "property",
    "owner",
    "agent",
    "list",
    "listing",
    "sell",
    "rent",
    "payment",
    "qris",
    "office",
    "company",
    "registered",
    "help",
  ];

  const idHits = indonesianWords.filter((word) => value.includes(word)).length;
  const enHits = englishWords.filter((word) => value.includes(word)).length;

  if (idHits > enHits) return "id";
  if (enHits > idHits) return "en";

  return fallbackLanguage ?? "en";
}

function detectAudience(text: string): AudienceType {
  const value = normalize(text);

  if (
    includesAny(value, [
      "developer",
      "pengembang",
      "project",
      "proyek",
      "license",
      "lisensi",
      "bulk listing",
      "multiple project",
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
      "broker",
      "silver",
      "gold",
      "agent pro",
      "membership",
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
      "rumah saya",
      "properti saya",
      "list my property",
      "sell my property",
      "rent out",
      "sewakan",
      "pasang iklan",
      "pasang properti",
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
      "cari",
      "looking for",
      "rent",
      "buy",
      "sewa",
      "beli",
      "viewing",
      "schedule",
      "jadwal",
    ])
  ) {
    return "buyer_renter";
  }

  return "unknown";
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

function isTetamoIdentityQuestion(text: string) {
  const value = normalize(text);

  return includesAny(value, [
    "what is tetamo",
    "apa itu tetamo",
    "tentang tetamo",
    "where is tetamo",
    "where is your office",
    "where is tetamo office",
    "office location",
    "company location",
    "where are you located",
    "lokasi tetamo",
    "kantor tetamo",
    "tetamo dimana",
    "tetamo di mana",
    "alamat tetamo",
    "is tetamo legit",
    "is tetamo legal",
    "is tetamo registered",
    "is tetamo real",
    "apakah tetamo resmi",
    "apakah tetamo legal",
    "apakah tetamo legit",
    "tetamo perusahaan apa",
    "registered company",
    "acn",
    "abn",
  ]);
}

function isPricingQuestion(text: string) {
  const value = normalize(text);

  return includesAny(value, [
    "price",
    "pricing",
    "pricelist",
    "package",
    "packages",
    "cost",
    "how much",
    "membership",
    "basic",
    "priority",
    "featured",
    "silver",
    "gold",
    "agent pro",
    "boost",
    "spotlight",
    "education pass",
    "harga",
    "paket",
    "biaya",
    "berapa harga",
    "berapa paket",
    "membership",
  ]);
}

function isPaymentQuestion(text: string) {
  const value = normalize(text);

  return includesAny(value, [
    "payment",
    "payment method",
    "how to pay",
    "pay with",
    "qris",
    "qr code",
    "debit",
    "credit",
    "credit card",
    "debit card",
    "metode pembayaran",
    "cara bayar",
    "bayar pakai",
    "pembayaran",
    "kartu debit",
    "kartu kredit",
  ]);
}

function isListingQuestion(text: string) {
  const value = normalize(text);

  return includesAny(value, [
    "list property",
    "list my property",
    "listing",
    "advertise",
    "post property",
    "sell my property",
    "rent out",
    "pasang properti",
    "pasang iklan",
    "iklan properti",
    "posting properti",
    "jual properti",
    "sewakan",
    "upload foto",
    "upload photo",
    "create listing",
    "buat listing",
  ]);
}

function isEducationOrBlogQuestion(text: string) {
  const value = normalize(text);

  return includesAny(value, [
    "blog",
    "article",
    "artikel",
    "education",
    "edukasi",
    "learn",
    "belajar",
    "tutorial",
    "guide",
    "panduan",
    "cara menggunakan dashboard",
    "dashboard tetamo",
    "cara posting",
    "posting properti",
    "how to post property",
    "how to use dashboard",
  ]);
}

function needsHumanHelp(text: string) {
  const value = normalize(text);

  return includesAny(value, [
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
  ]);
}

function cleanOldText(text: string) {
  return String(text || "")
    .replace(/review\/live flow/gi, "go-live step")
    .replace(/live\/review flow/gi, "go-live step")
    .replace(/activation flow/gi, "next step")
    .replace(/process flow/gi, "next step")
    .replace(/dashboard flow/gi, "dashboard")
    .replace(`${PRICELIST_URL}#owner-packages`, PRICELIST_URL)
    .replace(`${PRICELIST_URL}#agent-packages`, PRICELIST_URL)
    .replace(`${PRICELIST_URL}#add-ons`, PRICELIST_URL)
    .trim();
}

function buildGreetingReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Halo, saya Scorpio Assist dari Tetamo.

Saya bisa bantu tentang cara pasang listing, cari properti, paket owner/agent, QRIS, dashboard, blog, edukasi, dan cara kerja Tetamo.

Apa yang ingin Anda lakukan hari ini?`;
  }

  return `Hi, I’m Scorpio Assist from Tetamo.

I can help with listing a property, finding property, owner/agent packages, QRIS, dashboard, blogs, education, and how Tetamo works.

What would you like to do today?`;
}

function buildTetamoIdentityReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Tetamo adalah bisnis SaaS berbasis Australia yang melayani pasar properti Indonesia melalui digital property marketplace.

Tetamo dioperasikan oleh Tetamo Pty Ltd, Australian Private Company yang terdaftar di NSW, Australia, dengan ACN 689 780 970 dan ABN 18 689 780 970.

Tetamo memiliki company presence / office di Sydney, Australia dan beroperasi secara digital melalui ${SITE_URL} untuk melayani owner, agent, agency, developer, buyer, dan renter di Indonesia.

Tetamo bukan agency properti, bukan broker, dan tidak mengambil komisi dari transaksi jual/sewa properti.`;
  }

  return `Tetamo is an Australian-based SaaS business serving Indonesia's property market through a digital property marketplace.

Tetamo is operated by Tetamo Pty Ltd, an Australian Private Company registered in NSW, Australia, with ACN 689 780 970 and ABN 18 689 780 970.

Tetamo has company presence / office in Sydney, Australia and operates digitally through ${SITE_URL} to serve owners, agents, agencies, developers, buyers, and renters in Indonesia.

Tetamo is not a real estate agency or broker, and it does not take commission from property sale/rental transactions.`;
}

function buildListingReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk pasang listing properti di Tetamo, Anda perlu sign up atau log in terlebih dahulu lalu membuat listing sendiri di Tetamo.

Alurnya:
1. Sign up atau log in
2. Pilih role owner atau agent
3. Create Listing
4. Isi detail properti
5. Upload minimal 3 foto properti, boleh tambah video jika ada
6. Klik Generate untuk bantu buat judul dan deskripsi dengan AI
7. Lakukan verifikasi
8. Bayar dengan QRIS atau debit/kredit card
9. Setelah flow selesai, listing otomatis tayang di marketplace Tetamo.

Listing tidak dibuat melalui chat. Ini supaya Anda bisa mengelola dashboard, leads, WhatsApp inquiry, dan schedule viewing sendiri.

Panduan posting:
${EDUCATION_POSTING_PROPERTY_URL}`;
  }

  return `To list a property on Tetamo, you need to sign up or log in first and create the listing yourself inside Tetamo.

The flow is:
1. Sign up or log in
2. Choose owner or agent role
3. Create Listing
4. Enter property details
5. Upload minimum 3 property photos, and add video if available
6. Click Generate to create the title and description with AI
7. Complete verification
8. Pay with QRIS or debit/credit card
9. Once the flow is completed, the listing is automatically posted in Tetamo marketplace.

Listings are not created through chat. This is so you can manage your dashboard, leads, WhatsApp inquiries, and schedule viewing yourself.

Posting guide:
${EDUCATION_POSTING_PROPERTY_URL}`;
}

function buildOwnerPricingReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `${OWNER_PRICING_ID}

Basic cocok untuk mulai sederhana. Priority cocok jika ingin visibilitas lebih tinggi. Featured cocok jika ingin exposure paling kuat.

Lihat semua paket:
${PRICELIST_URL}`;
  }

  return `${OWNER_PRICING_EN}

Basic is good for a simple start. Priority is better if you want higher visibility. Featured is best if you want the strongest exposure.

View all packages:
${PRICELIST_URL}`;
}

function buildAgentPricingReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `${AGENT_PRICING_ID}

Silver cocok untuk agent yang baru mulai. Gold cocok untuk agent aktif dengan lebih banyak listing. Agent Pro cocok untuk agent atau agency yang ingin scale lebih besar.

Lihat semua paket:
${PRICELIST_URL}`;
  }

  return `${AGENT_PRICING_EN}

Silver is good for agents starting professionally. Gold is better for active agents with more listings. Agent Pro is best for agents or agencies ready to scale bigger.

View all packages:
${PRICELIST_URL}`;
}

function buildGeneralPricingReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Harga Tetamo saat ini:

${OWNER_PRICING_ID}

${AGENT_PRICING_ID}

${ADD_ON_PRICING_ID}

${EDUCATION_PRICING_ID}

Pembayaran tersedia melalui QRIS dan debit/kredit card.

Lihat semua paket:
${PRICELIST_URL}`;
  }

  return `Tetamo pricing:

${OWNER_PRICING_EN}

${AGENT_PRICING_EN}

${ADD_ON_PRICING_EN}

${EDUCATION_PRICING_EN}

Payment is available through QRIS and debit/credit card.

View all packages:
${PRICELIST_URL}`;
}

function buildPricingReply(question: string, lang: SupportLanguage) {
  const value = normalize(question);

  const asksOwner = includesAny(value, [
    "owner",
    "pemilik",
    "basic",
    "priority",
    "featured",
    "paket owner",
    "paket pemilik",
  ]);

  const asksAgent = includesAny(value, [
    "agent",
    "agen",
    "silver",
    "gold",
    "agent pro",
    "membership",
    "agency",
    "agensi",
  ]);

  const asksAddOn = includesAny(value, ["boost", "spotlight", "add-on", "addon"]);

  const asksEducation = includesAny(value, [
    "education",
    "edukasi",
    "education pass",
  ]);

  const asksDeveloper = includesAny(value, [
    "developer",
    "pengembang",
    "project",
    "proyek",
    "license",
    "lisensi",
  ]);

  if (asksDeveloper) return buildDeveloperReply(lang);
  if (asksOwner && !asksAgent) return buildOwnerPricingReply(lang);
  if (asksAgent && !asksOwner) return buildAgentPricingReply(lang);

  if (asksAddOn && !asksOwner && !asksAgent) {
    if (lang === "id") {
      return `${ADD_ON_PRICING_ID}

Add-on tersedia untuk owner dan agent.

Lihat semua paket:
${PRICELIST_URL}`;
    }

    return `${ADD_ON_PRICING_EN}

Add-ons are available for owners and agents.

View all packages:
${PRICELIST_URL}`;
  }

  if (asksEducation && !asksOwner && !asksAgent) {
    if (lang === "id") {
      return `${EDUCATION_PRICING_ID}

Lihat halaman edukasi:
${EDUCATION_URL}

Lihat semua paket:
${PRICELIST_URL}`;
    }

    return `${EDUCATION_PRICING_EN}

View education:
${EDUCATION_URL}

View all packages:
${PRICELIST_URL}`;
  }

  return buildGeneralPricingReply(lang);
}

function buildPaymentReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Tetamo menerima pembayaran melalui QRIS dan debit/kredit card.

QRIS biasanya bisa dibayar melalui aplikasi bank atau e-wallet yang mendukung QRIS, seperti BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, dan ShopeePay.

Jangan pernah membagikan OTP, CVV, nomor kartu penuh, atau password bank kepada siapa pun.`;
  }

  return `Tetamo accepts QRIS and debit/credit card payments.

QRIS can usually be paid through QRIS-supported bank apps or e-wallets such as BRI, BNI, BCA, Mandiri, GoPay, OVO, DANA, and ShopeePay.

Never share OTP, CVV, full card numbers, or banking passwords with anyone.`;
}

function buildBuyerRenterReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Jika Anda ingin mencari properti, Anda bisa browse listing di Tetamo, buka detail properti, lalu hubungi owner atau agent langsung melalui WhatsApp jika tersedia.

Anda juga bisa gunakan schedule viewing jika listing tersebut menyediakan fitur jadwal viewing.

Mulai dari marketplace Tetamo:
${SITE_URL}`;
  }

  return `If you want to find a property, you can browse listings on Tetamo, open the property details, then contact the owner or agent directly through WhatsApp when available.

You can also use schedule viewing if the listing supports viewing requests.

Start from Tetamo marketplace:
${SITE_URL}`;
}

function buildOwnerSellerReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk owner/seller, Tetamo membantu properti Anda tampil lebih jelas dan profesional di marketplace.

Fitur yang bisa membantu:
- AI-generated judul dan deskripsi
- Upload foto dan video
- Direct WhatsApp inquiry
- Schedule viewing
- Dashboard untuk mengelola listing dan leads

Untuk mulai, sign up atau log in, pilih paket owner, lalu buat listing sendiri di Tetamo.

${PRICELIST_URL}`;
  }

  return `For owners/sellers, Tetamo helps your property appear clearer and more professional in the marketplace.

Helpful features include:
- AI-generated title and description
- Photo and video upload
- Direct WhatsApp inquiry
- Schedule viewing
- Dashboard to manage listings and leads

To start, sign up or log in, choose an owner package, then create the listing yourself inside Tetamo.

${PRICELIST_URL}`;
}

function buildAgentAgencyReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk agent/agency, Tetamo membantu Anda mengelola listing, leads, schedule viewing, billing/receipt, analytics, dan commission tracking dalam satu dashboard.

Paket agent tersedia mulai dari Silver, Gold, sampai Agent Pro, tergantung jumlah listing aktif yang dibutuhkan.

Lihat paket agent:
${PRICELIST_URL}`;
  }

  return `For agents/agencies, Tetamo helps you manage listings, leads, viewing schedules, billing/receipts, analytics, and commission tracking in one dashboard.

Agent packages are available from Silver, Gold, to Agent Pro, depending on how many active listings you need.

View agent packages:
${PRICELIST_URL}`;
}

function buildDeveloperReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Untuk developer, Tetamo bisa membantu exposure proyek, profil developer, multiple project/property listings, direct WhatsApp inquiry, dan viewing interest.

Harga atau license developer biasanya tergantung kebutuhan proyek dan volume listing, jadi paling tepat dibahas langsung dengan Tetamo Agent.

Jam support: ${SUPPORT_HOURS_ID}`;
  }

  return `For developers, Tetamo can help with project exposure, developer profiles, multiple project/property listings, direct WhatsApp inquiries, and viewing interest.

Developer pricing or license usually depends on project needs and listing volume, so it is best discussed directly with a Tetamo Agent.

Support hours: ${SUPPORT_HOURS_EN}`;
}

function buildEducationReply(question: string, lang: SupportLanguage) {
  const value = normalize(question);

  if (
    includesAny(value, [
      "posting",
      "post property",
      "post properti",
      "cara posting",
      "pasang properti",
    ])
  ) {
    if (lang === "id") {
      return `Untuk belajar cara posting properti di Tetamo, mulai dari panduan ini:

${EDUCATION_POSTING_PROPERTY_URL}`;
    }

    return `To learn how to post a property on Tetamo, start with this guide:

${EDUCATION_POSTING_PROPERTY_URL}`;
  }

  if (includesAny(value, ["dashboard", "owner dan agent", "owner and agent"])) {
    if (lang === "id") {
      return `Untuk memahami dashboard Tetamo untuk owner dan agent, mulai dari panduan ini:

${EDUCATION_DASHBOARD_GUIDE_URL}`;
    }

    return `To understand the Tetamo dashboard for owners and agents, start with this guide:

${EDUCATION_DASHBOARD_GUIDE_URL}`;
  }

  if (includesAny(value, ["blog", "article", "artikel"])) {
    if (lang === "id") {
      return `Anda bisa membaca blog dan artikel Tetamo di sini:

${BLOG_URL}`;
    }

    return `You can read Tetamo blogs and articles here:

${BLOG_URL}`;
  }

  if (lang === "id") {
    return `Untuk materi edukasi Tetamo, mulai dari sini:

${EDUCATION_URL}

Panduan dashboard:
${EDUCATION_DASHBOARD_GUIDE_URL}

Panduan posting properti:
${EDUCATION_POSTING_PROPERTY_URL}`;
  }

  return `For Tetamo education content, start here:

${EDUCATION_URL}

Dashboard guide:
${EDUCATION_DASHBOARD_GUIDE_URL}

Property posting guide:
${EDUCATION_POSTING_PROPERTY_URL}`;
}

function buildFallbackReply(lang: SupportLanguage) {
  if (lang === "id") {
    return `Saya bisa bantu tentang Tetamo, cara pasang listing, cari properti, paket owner/agent, QRIS, dashboard, blog, dan edukasi.

Untuk pertanyaan khusus akun, pembayaran bermasalah, invoice/refund, atau developer license, silakan chat dengan Tetamo Agent. Jam support: ${SUPPORT_HOURS_ID}`;
  }

  return `I can help with Tetamo, listing a property, finding property, owner/agent packages, QRIS, dashboard, blogs, and education.

For account-specific questions, payment issues, invoice/refund, or developer license, please chat with a Tetamo Agent. Support hours: ${SUPPORT_HOURS_EN}`;
}

function buildHandoffLabel(lang: SupportLanguage) {
  return lang === "id" ? "Chat dengan Tetamo Agent" : "Chat with Tetamo Agent";
}

function buildDirectReply(params: {
  question: string;
  lang: SupportLanguage;
  audience: AudienceType;
}): SupportReplyResult | null {
  const { question, lang, audience } = params;

  if (isGreetingOrVague(question)) {
    return { text: buildGreetingReply(lang) };
  }

  if (isTetamoIdentityQuestion(question)) {
    return {
      text: buildTetamoIdentityReply(lang),
      usedOfficialIdentity: true,
    };
  }

  if (isPricingQuestion(question)) {
    return {
      text: buildPricingReply(question, lang),
      usedCurrentPricing: true,
    };
  }

  if (isPaymentQuestion(question)) {
    return { text: buildPaymentReply(lang) };
  }

  if (isListingQuestion(question)) {
    return { text: buildListingReply(lang) };
  }

  if (isEducationOrBlogQuestion(question)) {
    return { text: buildEducationReply(question, lang) };
  }

  if (audience === "developer") {
    return {
      text: buildDeveloperReply(lang),
      suggestedAction: "handoff_to_human",
      suggestedActionLabel: buildHandoffLabel(lang),
    };
  }

  if (audience === "buyer_renter") {
    return { text: buildBuyerRenterReply(lang) };
  }

  if (audience === "owner_seller") {
    return { text: buildOwnerSellerReply(lang) };
  }

  if (audience === "agent_agency") {
    return { text: buildAgentAgencyReply(lang) };
  }

  return null;
}

async function fetchFaqEntries() {
  const { data, error } = await supabase
    .from("faq_entries")
    .select(
      "id, slug, category, question_en, question_id, answer_en, answer_id, keywords, link_url, is_published, sort_order",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(60);

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

function findBestFaqEntry(entries: any[], question: string, lang: SupportLanguage) {
  if (!entries.length) return null;

  const scored = entries
    .map((entry) => {
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

      const score = scoreTextAgainstQuestion(
        `${questionText} ${answerText} ${keywords} ${entry?.slug || ""}`,
        question,
      );

      return { entry, score };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 7) return null;

  return scored[0].entry;
}

function buildFaqReply(entry: any, lang: SupportLanguage) {
  const answer =
    lang === "id"
      ? entry?.answer_id || entry?.answer_en || ""
      : entry?.answer_en || entry?.answer_id || "";

  const cleanAnswer = cleanOldText(answer);

  const rawLink = String(entry?.link_url || "").trim();

  if (!rawLink) return cleanAnswer;

  const fullLink = rawLink.startsWith("http")
    ? rawLink
    : `${SITE_URL}${rawLink.startsWith("/") ? rawLink : `/${rawLink}`}`;

  return [cleanAnswer, fullLink].filter(Boolean).join("\n\n");
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
    .limit(20);

  if (error) {
    console.error("Failed to fetch blogs:", error);
    return [];
  }

  return data ?? [];
}

function findBestArticle(articles: any[], question: string, lang: SupportLanguage) {
  if (!articles.length) return null;

  const scored = articles
    .map((article) => {
      const text =
        lang === "id"
          ? `${article?.title_id || ""} ${article?.excerpt_id || ""} ${article?.content_id || ""} ${article?.slug || ""}`
          : `${article?.title || ""} ${article?.excerpt || ""} ${article?.content || ""} ${article?.slug || ""}`;

      return {
        article,
        score: scoreTextAgainstQuestion(String(text).slice(0, 3000), question),
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 6) return null;

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

  const slug = article?.slug || "";
  const articleUrl = slug ? `${BLOG_URL}/${slug}` : BLOG_URL;

  return `
Relevant Tetamo article:
Title: ${title}
Excerpt: ${excerpt}
Content snippet: ${String(content).slice(0, 1500)}
Article URL: ${articleUrl}
`.trim();
}

async function fetchEducationContext(question: string, lang: SupportLanguage) {
  const candidates: any[] = [];

  const attempts = [
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

  for (const attempt of attempts) {
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

  if (!scored.length || scored[0].score < 5) return "";

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
Relevant Tetamo education:
Title: ${title}
Description: ${description}
Content snippet: ${String(content).slice(0, 1000)}
Education URL: ${EDUCATION_URL}
`.trim();
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
  if (!Deno.env.get("OPENAI_API_KEY")) return "";

  const { question, lang, audience, conversationContext, historyText } = params;

  const languageName = lang === "id" ? "Indonesian" : "English";

  const coreKnowledge =
    lang === "id"
      ? `
Tetamo adalah bisnis SaaS berbasis Australia yang melayani pasar properti Indonesia melalui digital property marketplace.
Tetamo dioperasikan oleh Tetamo Pty Ltd, Australian Private Company terdaftar di NSW, Australia.
ACN 689 780 970. ABN 18 689 780 970.
Tetamo bukan agency properti atau broker dan tidak mengambil komisi jual/sewa.
Tetamo membantu owner, agent, developer, buyer, dan renter melalui marketplace, dashboard, direct WhatsApp inquiry, schedule viewing, AI title/description, QRIS/debit/credit payment, blog, dan edukasi.

${OWNER_PRICING_ID}
${AGENT_PRICING_ID}
${ADD_ON_PRICING_ID}
${EDUCATION_PRICING_ID}

Listing harus dibuat sendiri di Tetamo setelah sign up/log in. Minimal 3 foto properti. Pengguna bisa klik Generate untuk judul/deskripsi AI. Setelah verifikasi dan pembayaran selesai, listing otomatis tayang di marketplace.
`
      : `
Tetamo is an Australian-based SaaS business serving Indonesia's property market through a digital property marketplace.
Tetamo is operated by Tetamo Pty Ltd, an Australian Private Company registered in NSW, Australia.
ACN 689 780 970. ABN 18 689 780 970.
Tetamo is not a real estate agency or broker and does not take sale/rental commission.
Tetamo helps owners, agents, developers, buyers, and renters through marketplace, dashboard, direct WhatsApp inquiry, schedule viewing, AI title/description, QRIS/debit/credit payment, blog, and education.

${OWNER_PRICING_EN}
${AGENT_PRICING_EN}
${ADD_ON_PRICING_EN}
${EDUCATION_PRICING_EN}

Listings must be created by the user inside Tetamo after sign up/log in. Minimum 3 property photos. Users can click Generate for AI title/description. After verification and payment are completed, the listing is automatically posted in the marketplace.
`;

  const prompt = `
You are Scorpio Assist from Tetamo.

Reply in ${languageName}.
Keep the reply short, clean, mobile-friendly, and helpful.
Do not return JSON.
Do not mention internal systems.
Do not invent pricing, links, policies, or guarantees.
Do not guarantee leads, sale, rental, ROI, buyer, tenant, or income.
If user needs account-specific help, payment issue, invoice/refund, login issue, or developer license, suggest Tetamo Agent.
For pricing, use only the pricing below.
For listing, clearly say the user must sign up/log in and create the listing inside Tetamo, not through chat.

Conversation context:
${conversationContext}

Detected audience:
${audience}

Recent conversation:
${historyText}

Official Tetamo knowledge:
${coreKnowledge}

${params.articleContext || ""}
${params.educationContext || ""}

User question:
${question}

Write only Scorpio Assist reply.
`.trim();

  const response = await openai.responses.create({
    model: MODEL,
    input: prompt,
    temperature: 0.35,
    max_output_tokens: 450,
  });

  return cleanOldText(String(response.output_text || "").trim());
}

async function buildSupportReply(params: {
  question: string;
  lang: SupportLanguage;
  audience: AudienceType;
  conversationContext: string;
  historyText: string;
}): Promise<SupportReplyResult> {
  const { question, lang, audience, conversationContext, historyText } = params;

  if (needsHumanHelp(question)) {
    return {
      text:
        lang === "id"
          ? `Untuk hal ini, paling tepat dibantu oleh Tetamo Agent karena mungkin membutuhkan pengecekan akun, pembayaran, invoice, refund, atau detail khusus.

Jam support: ${SUPPORT_HOURS_ID}`
          : `For this, it is best handled by a Tetamo Agent because it may require account, payment, invoice, refund, or specific detail checking.

Support hours: ${SUPPORT_HOURS_EN}`,
      suggestedAction: "handoff_to_human",
      suggestedActionLabel: buildHandoffLabel(lang),
    };
  }

  const directReply = buildDirectReply({ question, lang, audience });
  if (directReply) return directReply;

  const faqEntries = await fetchFaqEntries();
  const matchedFaq = findBestFaqEntry(faqEntries, question, lang);

  if (matchedFaq) {
    const faqReply = buildFaqReply(matchedFaq, lang);

    if (faqReply) {
      return { text: faqReply };
    }
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

  if (aiText) return { text: aiText };

  return { text: buildFallbackReply(lang) };
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

function getLocalizedMessageText(value: string, lang: SupportLanguage) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[lang] === "string"
    ) {
      return parsed[lang].trim();
    }

    const fallbackLang = lang === "id" ? "en" : "id";

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed[fallbackLang] === "string"
    ) {
      return parsed[fallbackLang].trim();
    }
  } catch {
    return raw;
  }

  return raw;
}

async function generateTwilioWhatsAppReply(question: string) {
  const cleanQuestion = String(question || "").trim();
  const lang = detectReplyLanguage(cleanQuestion);

  if (!cleanQuestion) {
    return lang === "id"
      ? "Halo, selamat datang di Tetamo. Anda ingin pasang listing, mencari properti, atau bertanya tentang paket?"
      : "Hi, welcome to Tetamo. Are you looking to list a property, find property, or ask about packages?";
  }

  try {
    const audience = detectAudience(cleanQuestion);

    const result = await buildSupportReply({
      question: cleanQuestion,
      lang,
      audience,
      conversationContext: "Source: Twilio WhatsApp inbound",
      historyText: `USER: ${cleanQuestion}`,
    });

    return limitReply(result.text);
  } catch (error) {
    console.error("Twilio WhatsApp AI reply error:", error);

    return lang === "id"
      ? "Halo, Tetamo sudah menerima pesan Anda. Silakan coba lagi sebentar."
      : "Hi, Tetamo received your message. Please try again shortly.";
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
      "Hi, Tetamo received your message. Please try again shortly.",
    );
  }
}

async function handleWebsiteSupportAi(req: Request) {
  const payload = await req.json().catch(() => null);
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

  const question = String(incomingMessage.message_text || "").trim();
  const fallbackLanguage = sourceLanguage(conversation?.source);
  const lang = detectReplyLanguage(question, fallbackLanguage);
  const audience = detectAudience(question);

  const historyText = (history ?? [])
    .map((item: any) => {
      const sender = String(item.sender_type || "").toUpperCase();
      const text = getLocalizedMessageText(String(item.message_text || ""), lang);

      return `${sender}: ${text}`;
    })
    .join("\n");

  const result = await buildSupportReply({
    question,
    lang,
    audience,
    conversationContext: buildConversationContext(conversation),
    historyText,
  });

  const shouldHandoff = Boolean(result.suggestedAction) || needsHumanHelp(question);

  const cleanAiReply = limitReply(
    cleanOldText(result.text || buildFallbackReply(lang)),
    1800,
  );

  const suggestedAction = shouldHandoff ? "handoff_to_human" : null;
  const suggestedActionLabel = shouldHandoff ? buildHandoffLabel(lang) : null;

  const { error: insertAiError } = await supabase.from("support_messages").insert({
    conversation_id: incomingMessage.conversation_id,
    sender_type: "ai",
    message_text: cleanAiReply,
    ai_status: "sent",
    suggested_action: suggestedAction,
    suggested_action_label: suggestedActionLabel,
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
      ai_reply: cleanAiReply,
      suggested_action: suggestedAction,
      suggested_action_label: suggestedActionLabel,
      reply_language: lang,
      detected_audience: audience,
      used_current_pricing: result.usedCurrentPricing ?? false,
      used_official_identity: result.usedOfficialIdentity ?? false,
      payment_modes_supported: ["QRIS", "Debit/Credit Card"],
      useful_urls: {
        pricelist: PRICELIST_URL,
        blog: BLOG_URL,
        education: EDUCATION_URL,
        dashboard_guide: EDUCATION_DASHBOARD_GUIDE_URL,
        posting_property_guide: EDUCATION_POSTING_PROPERTY_URL,
        faq: FAQ_URL,
      },
    },
    200,
  );
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: CORS_HEADERS });
    }

    if (req.method === "GET") {
      return jsonResponse({
        ok: true,
        message:
          "Tetamo AI reply function is active. Scorpio Assist uses clean plain-text replies for website/mobile support and Twilio WhatsApp replies.",
        payment_modes_supported: ["QRIS", "Debit/Credit Card"],
        useful_urls: {
          pricelist: PRICELIST_URL,
          blog: BLOG_URL,
          education: EDUCATION_URL,
          dashboard_guide: EDUCATION_DASHBOARD_GUIDE_URL,
          posting_property_guide: EDUCATION_POSTING_PROPERTY_URL,
          faq: FAQ_URL,
        },
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
