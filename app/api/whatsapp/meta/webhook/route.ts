import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

type MonaLanguage = "id" | "en";

type MetaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
  button?: {
    text?: string;
    payload?: string;
  };
  interactive?: {
    type?: string;
    button_reply?: {
      id?: string;
      title?: string;
    };
    list_reply?: {
      id?: string;
      title?: string;
      description?: string;
    };
  };
  image?: Record<string, unknown>;
  video?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  document?: Record<string, unknown>;
  sticker?: Record<string, unknown>;
  location?: Record<string, unknown>;
  contacts?: Array<Record<string, unknown>>;
  reaction?: Record<string, unknown>;
  referral?: {
    headline?: string;
    body?: string;
    source_type?: string;
    source_id?: string;
    source_url?: string;
    image?: Record<string, unknown>;
    video?: Record<string, unknown>;
    [key: string]: unknown;
  };
};

type MetaWebhookValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: {
      name?: string;
    };
    wa_id?: string;
  }>;
  messages?: MetaMessage[];
  statuses?: Array<Record<string, unknown>>;
};

type CampaignContext = {
  campaignId: string;
  recipientId: string | null;
  templateName: string;
  templateLanguage: string | null;
  templateCategory: string | null;
  sendType: string | null;
  sentAt: string | null;
};

type ConversationRow = {
  id: string;
  phone: string;
  phone_e164?: string | null;
  channel?: string | null;
  business_sender_key?: string | null;
  conversation_key?: string | null;
  ai_enabled?: boolean | null;
  handover_to_admin?: boolean | null;
  handover_reason?: string | null;
  free_entry_point_expires_at?: string | null;
  free_entry_point_source?: string | null;
  ad_referral_source?: string | null;
};

type StoredMessageRow = {
  id: string;
  direction: string;
  message: string;
  created_at: string;
  admin_generated?: boolean | null;
  ai_generated?: boolean | null;
};

type KnowledgeEntry = {
  id: string;
  category: string | null;
  canonical_question: string | null;
  approved_answer: string | null;
  language: string | null;
  priority: number | null;
};

type MetaSendResult = {
  success: boolean;
  id: string | null;
  error: unknown;
};

type HandoverResult = {
  shouldHandover: boolean;
  reason: string;
  replyType: "general" | "support" | null;
};

type MonaGenerationResult =
  | {
      action: "reply";
      reply: string;
    }
  | {
      action: "handover_unreadable";
      reason: string;
    };

const TETAMO_LINKS = {
  website: "https://www.tetamo.com",
  pricelist: "https://www.tetamo.com/pricelist",
  faq: "https://www.tetamo.com/faq",
  subscriptionPolicy: "https://www.tetamo.com/kebijakan-berlangganan",
  developerLicense: "https://www.tetamo.com/developer-license",
  howToListBlog:
    "https://www.tetamo.com/blog/how-to-list-my-property-in-tetamo",
  howToPostVideo:
    "https://www.tetamo.com/education/cara-posting-properti-di-tetamo",
  dashboardVideo:
    "https://www.tetamo.com/education/cara-menggunakan-dashboard-tetamo-untuk-owner-dan-agent",
} as const;

const HARDCODED_FAQ = [
  {
    topic: "Mona identity",
    questions: [
      "Ini siapa?",
      "Siapa ini?",
      "Kamu siapa?",
      "Saya bicara dengan siapa?",
      "Apakah ini admin?",
      "Are you AI?",
      "Who is this?",
      "What is your name?",
    ],
    answerId:
      "Saya Mona dari Tetamo 😊 Saya bisa membantu terkait pencarian properti, pemasangan listing, paket pemilik atau agen, dan cara menggunakan Tetamo.",
    answerEn:
      "I’m Mona from Tetamo 😊 I can help with property searches, listings, owner or agent packages, and using Tetamo.",
  },
  {
    topic: "What Tetamo is",
    questions: [
      "Apa itu Tetamo?",
      "Tetamo itu apa?",
      "Tetamo bergerak di bidang apa?",
      "What is Tetamo?",
      "What does Tetamo do?",
    ],
    answerId:
      "Tetamo adalah marketplace properti online di Indonesia yang membantu pemilik, agen, kantor agen, developer, pembeli, penyewa, dan investor mengiklankan, menemukan, dan menanyakan properti di seluruh Indonesia. Pembeli dan penyewa dapat melihat informasi, foto, dan video properti, menghubungi pemilik atau agen langsung melalui WhatsApp, mengatur viewing secara langsung, serta menyimpan, menyukai, dan membagikan atau merekomendasikan properti melalui media sosial atau saluran lainnya.",
    answerEn:
      "Tetamo is an online property marketplace in Indonesia that helps owners, agents, agencies, developers, buyers, renters and investors advertise, discover and inquire about properties across Indonesia. Buyers and renters can view property information, photos and videos, contact the owner or agent directly through WhatsApp, arrange property viewings directly, and save, like, share or recommend properties through social media or other channels.",
  },
  {
    topic: "Tetamo is not a real-estate agency",
    questions: [
      "Apakah Tetamo agen properti?",
      "Tetamo broker ya?",
      "Apakah Tetamo menjual properti?",
      "Is Tetamo a real-estate agency?",
      "Is Tetamo a broker?",
    ],
    answerId:
      "Tidak. Tetamo bukan kantor agen properti. Tetamo adalah marketplace properti dan platform teknologi yang membantu pengguna mengiklankan, mencari, membeli, menjual, dan menyewa properti.",
    answerEn:
      "No. Tetamo is not a real-estate agency. Tetamo is a property marketplace and technology platform that helps users advertise, search for, buy, sell and rent properties.",
  },
  {
    topic: "Tetamo company and location",
    questions: [
      "Kantor Tetamo di mana?",
      "Tetamo perusahaan mana?",
      "Apakah Tetamo dari Indonesia?",
      "Where is Tetamo based?",
      "Where is the Tetamo office?",
      "What is Tetamo's ABN?",
    ],
    answerId:
      "Tetamo beroperasi di bawah Tetamo Pty Ltd, perusahaan berbasis di Australia dengan keberadaan perusahaan dan kantor di Sydney, New South Wales. Tetamo Pty Ltd terdaftar dengan ABN 18 689 780 970. Tetamo beroperasi secara digital untuk melayani pasar properti Indonesia melalui website dan aplikasi Tetamo.",
    answerEn:
      "Tetamo operates under Tetamo Pty Ltd, an Australian-based company with a company presence and office in Sydney, New South Wales. Tetamo Pty Ltd is registered under ABN 18 689 780 970. Tetamo operates digitally to serve Indonesia’s property market through the Tetamo website and app.",
  },
  {
    topic: "Who can advertise",
    questions: [
      "Siapa yang bisa pasang properti?",
      "Apakah pemilik bisa pasang iklan?",
      "Apakah agen bisa pasang listing?",
      "Apakah developer bisa pasang listing?",
      "Can owners list property?",
      "Can agents advertise properties?",
      "Can developers list projects?",
    ],
    answerId:
      "Pemilik properti, agen, kantor agen, dan developer dapat memasang dan mengiklankan properti di Tetamo. Pemilik, agen, dan developer dapat membuat serta mengelola listing melalui akun dan dashboard Tetamo mereka sendiri.",
    answerEn:
      "Property owners, agents, agencies and developers can list and advertise properties on Tetamo. Owners, agents and developers can create and manage listings through their own Tetamo account and dashboard.",
  },
  {
    topic: "Owner listing steps",
    questions: [
      "Bagaimana cara pasang properti sebagai pemilik?",
      "Cara iklan rumah sendiri di Tetamo?",
      "Gimana cara listing sebagai owner?",
      "Saya mau jual rumah sendiri.",
      "How do I list my property as an owner?",
      "How can an owner advertise a property?",
    ],
    answerId: `Untuk memasang properti sebagai Pemilik di Tetamo:
1. Buka ${TETAMO_LINKS.website}
2. Daftar atau login sebagai Pemilik
3. Pilih Buat Listing
4. Isi detail properti, harga, lokasi, dan fasilitas
5. Upload minimal 3 foto dan tambahkan video bila tersedia
6. Klik Generate AI untuk membantu membuat judul dan deskripsi
7. Selesaikan verifikasi bila ingin mendapatkan status verifikasi
8. Bayar menggunakan QRIS dengan memindai kode melalui aplikasi bank atau e-wallet yang mendukung QRIS, seperti BCA, BNI, BRI, Mandiri, OVO, GoPay, DANA, LinkAja, ShopeePay, atau aplikasi QRIS lainnya
Setelah selesai, listing akan otomatis muncul di marketplace Tetamo.`,
    answerEn: `To list a property as an Owner on Tetamo:
1. Open ${TETAMO_LINKS.website}
2. Sign up or log in as an Owner
3. Select Create Listing
4. Enter the property details, price, location and facilities
5. Upload at least 3 photos and add a video when available
6. Click Generate AI to help create the title and description
7. Complete verification if you want verification status
8. Pay using QRIS by scanning the code with a supported banking or e-wallet app, such as BCA, BNI, BRI, Mandiri, OVO, GoPay, DANA, LinkAja, ShopeePay, or another QRIS-enabled app
Once completed, the listing will automatically appear in the Tetamo marketplace.`,
  },
  {
    topic: "Agent listing steps",
    questions: [
      "Bagaimana cara pasang properti sebagai agen?",
      "Cara daftar agen Tetamo?",
      "Gimana cara listing sebagai agent?",
      "How do I list property as an agent?",
      "How can an agent join Tetamo?",
    ],
    answerId: `Untuk memasang properti sebagai Agen di Tetamo:
1. Buka ${TETAMO_LINKS.website}
2. Daftar atau login sebagai Agen
3. Pilih paket membership yang sesuai
4. Bayar menggunakan QRIS dengan memindai kode melalui aplikasi bank atau e-wallet yang mendukung QRIS, seperti BCA, BNI, BRI, Mandiri, OVO, GoPay, DANA, LinkAja, ShopeePay, atau aplikasi QRIS lainnya
5. Setelah membership aktif, klik Buat Listing
6. Isi detail properti, harga, lokasi, dan fasilitas
7. Upload minimal 3 foto dan tambahkan video bila tersedia
8. Klik Generate AI untuk membantu membuat judul dan deskripsi
9. Periksa kembali lalu publikasikan listing
Setelah dipublikasikan, listing akan otomatis muncul di marketplace Tetamo. Membership berlaku 1 tahun dan jumlah properti yang dapat dipasang mengikuti paket yang dipilih.`,
    answerEn: `To list a property as an Agent on Tetamo:
1. Open ${TETAMO_LINKS.website}
2. Sign up or log in as an Agent
3. Select the membership package that suits your needs
4. Pay using QRIS by scanning the code with a supported banking or e-wallet app, such as BCA, BNI, BRI, Mandiri, OVO, GoPay, DANA, LinkAja, ShopeePay, or another QRIS-enabled app
5. Once the membership is active, click Create Listing
6. Enter the property details, price, location and facilities
7. Upload at least 3 photos and add a video when available
8. Click Generate AI to help create the title and description
9. Review the information and publish the listing
Once published, the listing will automatically appear in the Tetamo marketplace. Membership is active for 1 year, and the number of properties you can list depends on the selected package.`,
  },
  {
    topic: "Listings cannot be created through WhatsApp",
    questions: [
      "Saya kirim foto ke sini saja ya?",
      "Bisa titip iklan lewat WhatsApp?",
      "Tolong upload properti saya.",
      "Can I send my photos here?",
      "Can Tetamo upload the listing for me?",
    ],
    answerId:
      "Listing tidak dibuat melalui WhatsApp. Pemilik atau agen perlu membuat listing melalui akun Tetamo sendiri agar dapat mengelola detail properti, leads, WhatsApp enquiry, perubahan listing, pembayaran, dan jadwal viewing melalui dashboard.",
    answerEn:
      "Listings are not created through WhatsApp. Owners or agents need to create the listing through their own Tetamo account so they can manage property details, leads, WhatsApp enquiries, listing changes, payments and viewing schedules through the dashboard.",
  },
  {
    topic: "Photo and video requirements",
    questions: [
      "Minimal berapa foto?",
      "Bisa upload video?",
      "Berapa foto yang dibutuhkan?",
      "How many photos are required?",
      "Can I upload a video?",
    ],
    answerId:
      "Minimal 3 foto properti diperlukan untuk membuat listing. Video juga dapat ditambahkan bila tersedia. Foto dan video di-upload langsung melalui akun Tetamo saat membuat listing.",
    answerEn:
      "At least 3 property photos are required for a listing. You can also add a video when available. Photos and videos are uploaded directly through your Tetamo account while creating the listing.",
  },
  {
    topic: "Why advertise on Tetamo",
    questions: [
      "Apa keuntungan pasang di Tetamo?",
      "Kenapa harus pakai Tetamo?",
      "Bisa dapat leads?",
      "Why should I advertise on Tetamo?",
      "Will Tetamo help me get enquiries?",
    ],
    answerId:
      "Tetamo membantu menampilkan properti dengan informasi yang lebih jelas dan lengkap, termasuk foto, video, harga, lokasi, fasilitas, judul dan deskripsi bilingual, serta beberapa pilihan mata uang agar pembeli dan investor asing lebih mudah memahaminya. Pembeli atau penyewa dapat menghubungi pemilik atau agen langsung melalui WhatsApp dan mengatur viewing dengan lebih mudah. Komisi, leads, dan aktivitas viewing juga dapat dikelola melalui dashboard bila fitur tersebut tersedia pada akun.",
    answerEn:
      "Tetamo helps present your property with clearer information, including photos, videos, price, location, facilities, bilingual titles and descriptions, and multiple currencies so foreign buyers and investors can understand it more easily. Buyers or renters can contact the owner or agent directly through WhatsApp and arrange viewings more easily. Commission information, leads and viewing activity can also be managed through the dashboard where available.",
  },
  {
    topic: "Tetamo features",
    questions: [
      "Apa saja fitur Tetamo?",
      "Dapat apa kalau pasang di Tetamo?",
      "What features are included?",
      "What can Tetamo do?",
    ],
    answerId:
      "Fitur Tetamo mencakup direct WhatsApp enquiry, schedule viewing, indikator verifikasi bila tersedia, Generate AI untuk judul dan deskripsi bilingual, upload foto dan video, tampilan beberapa mata uang, marketplace dan aplikasi, save, like dan share, profil agen, integrasi media sosial, dashboard pemilik dan agen, leads, pembayaran, receipt, komisi, serta analytics sesuai fitur yang tersedia pada akun.",
    answerEn:
      "Tetamo features include direct WhatsApp enquiries, viewing scheduling, verification indicators where available, Generate AI for bilingual titles and descriptions, photo and video uploads, multiple-currency display, marketplace and app visibility, save, like and share, agent profiles, social-media integration, owner and agent dashboards, leads, payments, receipts, commission tracking and analytics according to the features available on the account.",
  },
  {
    topic: "Vague pricing question",
    questions: [
      "Berapa biayanya?",
      "Harga paketnya berapa?",
      "Price?",
      "How much?",
      "Berapa biaya listing?",
    ],
    answerId: `Ibu/Bapak ingin memasang properti sebagai pemilik, bergabung sebagai agen, atau membutuhkan Developer License? Detail harga terbaru dapat dilihat di ${TETAMO_LINKS.pricelist}`,
    answerEn: `Are you looking to advertise as a property owner, join as an agent, or inquire about a Developer License? The latest pricing details are available at ${TETAMO_LINKS.pricelist}`,
  },
  {
    topic: "Owner packages",
    questions: [
      "Apa paket pemilik?",
      "Harga listing owner berapa?",
      "Paket owner apa saja?",
      "What are the owner packages?",
      "How much are owner listings?",
    ],
    answerId: `Paket Pemilik Tetamo:
• Basic Listing — 1 listing aktif selama 1 tahun, Rp50.000
• Priority Listing — 1 listing aktif selama 1 tahun dengan visibilitas lebih tinggi, Rp150.000
• Featured Listing — 1 listing aktif dan featured selama 1 tahun, termasuk Featured Badge, visibilitas tertinggi, posting media sosial, dan Tetamo Agent Support, Rp550.000
Detail terbaru: ${TETAMO_LINKS.pricelist}`,
    answerEn: `Tetamo Owner packages:
• Basic Listing — 1 active listing for 1 year, Rp50,000
• Priority Listing — 1 active listing for 1 year with higher visibility, Rp150,000
• Featured Listing — 1 active and featured listing for 1 year, including a Featured Badge, highest visibility, social-media posting and Tetamo Agent Support, Rp550,000
Latest details: ${TETAMO_LINKS.pricelist}`,
  },
  {
    topic: "Agent packages",
    questions: [
      "Apa paket agen?",
      "Harga membership agen berapa?",
      "Paket agent apa saja?",
      "What are the agent packages?",
      "How much is agent membership?",
    ],
    answerId: `Paket Agen Tetamo:
• Silver — 30 listing aktif selama 1 tahun, Rp499.000 per tahun
• Gold — 100 listing aktif selama 1 tahun, termasuk 1 AI Avatar Introduction Video dan 3 Featured Listing gratis masing-masing 90 hari, Rp1.800.000 per tahun
• Agent Pro — 500 listing aktif selama 1 tahun, termasuk peluang premium exposure dan eligibility Featured Agent, Rp3.999.000 per tahun atau Rp399.000 per bulan dengan komitmen 12 bulan
Detail terbaru: ${TETAMO_LINKS.pricelist}`,
    answerEn: `Tetamo Agent packages:
• Silver — 30 active listings for 1 year, Rp499,000 per year
• Gold — 100 active listings for 1 year, including 1 AI Avatar Introduction Video and 3 free Featured Listings for 90 days each, Rp1,800,000 per year
• Agent Pro — 500 active listings for 1 year, including premium exposure opportunities and Featured Agent eligibility, Rp3,999,000 per year or Rp399,000 per month with a 12-month commitment
Latest details: ${TETAMO_LINKS.pricelist}`,
  },
  {
    topic: "Developer License",
    questions: [
      "Ada paket developer?",
      "Saya punya project perumahan.",
      "Bagaimana cara iklan project?",
      "Do you have a developer package?",
      "I want to advertise a development project.",
    ],
    answerId: `Untuk developer, project owner, atau perusahaan properti, Tetamo menggunakan Developer License, bukan paket listing pemilik atau membership agen biasa. Informasi tersedia di ${TETAMO_LINKS.developerLicense}. Kebutuhan project atau proposal khusus akan ditindaklanjuti oleh tim Tetamo.`,
    answerEn: `For developers, project owners or property companies, Tetamo uses a Developer License rather than a normal owner listing or agent membership. Information is available at ${TETAMO_LINKS.developerLicense}. Project-specific requirements or proposals will be followed up by the Tetamo team.`,
  },
  {
    topic: "Refund, verification, payment and account support",
    questions: [
      "Saya sudah bayar tapi belum aktif.",
      "Pembayaran saya gagal.",
      "Paket belum aktif.",
      "Saya mau refund.",
      "Verifikasi saya ditolak.",
      "I already paid.",
      "My package is not active.",
      "I need a refund.",
    ],
    answerId: `Untuk masalah refund, verifikasi, pembayaran, atau akun, tim Tetamo akan menghubungi Anda untuk membantu pemeriksaan lebih lanjut. Anda juga dapat melihat ${TETAMO_LINKS.faq} dan ${TETAMO_LINKS.subscriptionPolicy}.`,
    answerEn: `For refund, verification, payment or account problems, the Tetamo team will contact you to review the issue further. You can also check ${TETAMO_LINKS.faq} and ${TETAMO_LINKS.subscriptionPolicy}.`,
  },
] as const;

const INDONESIAN_HINTS = [
  "saya",
  "aku",
  "mau",
  "ingin",
  "gimana",
  "bagaimana",
  "berapa",
  "harga",
  "iklan",
  "properti",
  "rumah",
  "jual",
  "beli",
  "sewa",
  "pemilik",
  "agent",
  "agen",
  "bisa",
  "admin",
  "tolong",
  "cara",
  "paket",
  "dashboard",
  "listing",
  "kantor",
  "alamat",
  "perusahaan",
  "bayar",
  "pembayaran",
  "jadwal",
  "viewing",
  "pasang",
  "aplikasi",
  "download",
  "qris",
  "siapa",
  "bicara",
  "foto",
  "video",
  "upload",
  "brp",
  "gmn",
  "udh",
  "sdh",
  "blm",
  "sy",
  "yg",
  "gak",
  "ga",
  "nggak",
  "min",
  "iya",
  "bgt",
  "dong",
  "nih",
  "kok",
  "info",
];

const COMMON_SHORT_FORMS = new Set([
  "ya",
  "iya",
  "y",
  "ok",
  "oke",
  "siap",
  "ga",
  "gak",
  "gk",
  "nggak",
  "tdk",
  "tak",
  "sy",
  "saya",
  "aq",
  "aku",
  "km",
  "kamu",
  "yg",
  "dgn",
  "utk",
  "brp",
  "berapa",
  "dmn",
  "dimana",
  "kpn",
  "kapan",
  "udh",
  "udah",
  "sdh",
  "sudah",
  "blm",
  "belum",
  "bgt",
  "banget",
  "mau",
  "min",
  "admin",
  "wa",
  "thx",
  "thanks",
  "tks",
  "pls",
  "kpr",
  "shm",
  "hgb",
  "ajb",
  "ppjb",
  "pbb",
  "bphtb",
  "qris",
  "nib",
  "imb",
  "pbg",
  "slf",
  "lsp",
  "arebi",
]);

const SEARCH_STOPWORDS = new Set([
  "yang",
  "dan",
  "atau",
  "untuk",
  "dengan",
  "dari",
  "pada",
  "saya",
  "anda",
  "kamu",
  "bisa",
  "apa",
  "apakah",
  "bagaimana",
  "gimana",
  "berapa",
  "mau",
  "ingin",
  "the",
  "and",
  "or",
  "for",
  "with",
  "from",
  "this",
  "that",
  "what",
  "how",
  "can",
  "could",
  "would",
  "you",
  "your",
  "are",
  "is",
]);

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function includesAny(message: string, keywords: string[]) {
  const lower = message.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getGraphVersion() {
  return cleanEnv(process.env.META_GRAPH_VERSION) || "v25.0";
}

function getVerifyTokens() {
  return [
    process.env.META_WEBHOOK_VERIFY_TOKEN,
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
    process.env.META_VERIFY_TOKEN,
    process.env.META_WHATSAPP_VERIFY_TOKEN,
    process.env.TETAMO_WHATSAPP_VERIFY_TOKEN,
  ]
    .map((value) => cleanEnv(value))
    .filter(Boolean);
}

function getMetaAccessToken() {
  return cleanEnv(process.env.META_DIRECT_WHATSAPP_ACCESS_TOKEN);
}

function getPhoneNumberId(fallback?: string | null) {
  return (
    cleanEnv(fallback) ||
    cleanEnv(process.env.META_DIRECT_WHATSAPP_PHONE_NUMBER_ID)
  );
}

function getAllowedBusinessPhoneNumberIds() {
  const rawValues = [
    process.env.META_DIRECT_ALLOWED_PHONE_NUMBER_IDS,
    process.env.META_DIRECT_WHATSAPP_PHONE_NUMBER_ID,
  ];

  return Array.from(
    new Set(
      rawValues
        .join(",")
        .split(/[,\s]+/)
        .map((value) => cleanEnv(value))
        .filter(Boolean)
    )
  );
}

function isAllowedBusinessPhoneNumberId(phoneNumberId?: string | null) {
  const cleanPhoneNumberId = cleanEnv(phoneNumberId);
  const allowedIds = getAllowedBusinessPhoneNumberIds();

  if (!cleanPhoneNumberId || allowedIds.length === 0) {
    return false;
  }

  return allowedIds.includes(cleanPhoneNumberId);
}

function getWindowExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry.toISOString();
}

function getFreeEntryPointExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 72);
  return expiry.toISOString();
}

function getAdReferralSource(referral?: MetaMessage["referral"] | null) {
  if (!referral) return null;

  return (
    cleanEnv(referral.source_type as string) ||
    cleanEnv(referral.source_id as string) ||
    cleanEnv(referral.headline as string) ||
    "meta_click_to_whatsapp_ad"
  );
}

function getMetaBusinessSenderKey(phoneNumberId: string) {
  return `meta:${phoneNumberId}`;
}

function getMetaConversationKey(phoneNumberId: string, customerPhone: string) {
  return `${getMetaBusinessSenderKey(phoneNumberId)}:${customerPhone}`;
}

function isMonaAiEnabled(value: unknown) {
  return value !== false;
}

function detectLanguage(message: string): MonaLanguage {
  const lower = String(message || "").toLowerCase();

  if (INDONESIAN_HINTS.some((word) => lower.includes(word))) {
    return "id";
  }

  if (
    /\b(hello|hi|price|cost|owner|developer|property|house|rent|buy|sell|listing|agent|office|company|help|package|payment|refund)\b/i.test(
      lower
    )
  ) {
    return "en";
  }

  return "id";
}

function isIdentityQuestion(message: string) {
  const lower = String(message || "").toLowerCase().trim();

  return includesAny(lower, [
    "ini siapa",
    "siapa ini",
    "saya bicara dengan siapa",
    "aku bicara dengan siapa",
    "saya chat dengan siapa",
    "ini admin",
    "apakah ini admin",
    "kamu siapa",
    "anda siapa",
    "ini ai",
    "apakah ini ai",
    "ini bot",
    "apakah ini bot",
    "who is this",
    "who am i speaking with",
    "who am i talking to",
    "are you ai",
    "are you a bot",
    "are you admin",
    "is this admin",
    "your name",
    "what is your name",
  ]);
}

function limitWhatsAppReply(value: string) {
  const clean = String(value || "").trim();

  if (clean.length <= 1700) return clean;

  return clean.slice(0, 1690).trim() + "...";
}

function getTextFromMetaMessage(message: MetaMessage) {
  const type = String(message.type || "").toLowerCase();

  if (type === "text") {
    return cleanEnv(message.text?.body);
  }

  if (type === "button") {
    return cleanEnv(message.button?.text || message.button?.payload);
  }

  if (type === "interactive") {
    return cleanEnv(
      message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        message.interactive?.list_reply?.description
    );
  }

  return "";
}

function getMessageDisplayText(message: MetaMessage) {
  const text = getTextFromMetaMessage(message);

  if (text) return text;

  const type = String(message.type || "unknown").toLowerCase();
  const labels: Record<string, string> = {
    image: "[Customer sent a photo]",
    video: "[Customer sent a video]",
    audio: "[Customer sent an audio or voice message]",
    document: "[Customer sent a document]",
    sticker: "[Customer sent a sticker]",
    location: "[Customer sent a location]",
    contacts: "[Customer sent contact information]",
    contact: "[Customer sent contact information]",
    reaction: "[Customer sent a reaction]",
  };

  return labels[type] || `[Customer sent unsupported WhatsApp content: ${type}]`;
}

function isTextLikeMessage(message: MetaMessage) {
  const type = String(message.type || "").toLowerCase();
  return type === "text" || type === "button" || type === "interactive";
}

function isReactionMessage(message: MetaMessage) {
  return String(message.type || "").toLowerCase() === "reaction";
}

function isMediaOrUnsupportedMessage(message: MetaMessage) {
  const type = String(message.type || "").toLowerCase();

  return [
    "image",
    "video",
    "audio",
    "document",
    "sticker",
    "location",
    "contacts",
    "contact",
  ].includes(type);
}

function isClearlyUnreadableMessage(value?: string | null) {
  const raw = String(value || "").trim();

  if (!raw) return false;

  const normalized = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return false;
  }

  const tokens = normalized.split(" ").filter(Boolean);

  if (
    tokens.every(
      (token) => COMMON_SHORT_FORMS.has(token) || /^\d+$/.test(token)
    )
  ) {
    return false;
  }

  const compact = normalized.replace(/\s+/g, "");
  const latinLetters = compact.replace(/[^a-z]/g, "");

  if (/^(ha){2,}$|^(he){2,}$|^(hi){2,}$|^(wkwk)+$/i.test(latinLetters)) {
    return false;
  }

  if (/(qwerty|asdfg|zxcv|poiuy|lkjhg|asdasd)/i.test(compact)) {
    return true;
  }

  if (
    tokens.length === 1 &&
    latinLetters.length >= 6 &&
    /^([a-z]{1,3})\1{2,}$/i.test(latinLetters)
  ) {
    return true;
  }

  if (
    tokens.length === 1 &&
    latinLetters.length >= 5 &&
    !/[aiueo]/i.test(latinLetters)
  ) {
    return true;
  }

  if (
    tokens.length > 1 &&
    tokens.every((token) => {
      const letters = token.replace(/[^a-z]/g, "");
      return letters.length >= 4 && !/[aiueo]/i.test(letters);
    })
  ) {
    return true;
  }

  return false;
}

function detectHandover(message: string): HandoverResult {
  const lower = String(message || "").toLowerCase().trim();

  const explicitHumanRequest = [
    "sambungkan ke admin",
    "hubungkan ke admin",
    "mau bicara dengan admin",
    "ingin bicara dengan admin",
    "saya mau bicara dengan admin",
    "saya ingin bicara dengan admin",
    "mau ngomong sama admin",
    "ingin ngomong sama admin",
    "hubungi admin",
    "tolong hubungi admin",
    "minta admin",
    "minta dihubungi admin",
    "admin hubungi saya",
    "bicara dengan manusia",
    "bicara dengan orang",
    "orang asli",
    "orang beneran",
    "customer service",
    "speak to human",
    "speak to a human",
    "speak to someone",
    "real person",
    "connect me to admin",
    "connect me to a human",
    "connect me to support",
    "talk to admin",
    "talk to a human",
    "human support",
  ];

  if (
    includesAny(lower, explicitHumanRequest) ||
    lower === "cs" ||
    lower === "admin please" ||
    lower === "admin pls"
  ) {
    return {
      shouldHandover: true,
      reason: "Customer explicitly requested human or admin support",
      replyType: "general",
    };
  }

  const paymentAccountRefundVerification = [
    "i already paid",
    "already paid",
    "payment failed",
    "payment problem",
    "paid but",
    "payment not active",
    "my payment",
    "invoice issue",
    "receipt issue",
    "account problem",
    "account issue",
    "cannot login",
    "can't login",
    "refund",
    "complaint",
    "complain",
    "bad service",
    "not happy",
    "angry",
    "verification rejected",
    "document rejected",
    "verification problem",
    "sudah bayar",
    "saya sudah bayar",
    "sudah transfer",
    "sudah bayar tapi",
    "pembayaran gagal",
    "masalah pembayaran",
    "paket belum aktif",
    "iklan belum aktif",
    "invoice",
    "receipt",
    "struk",
    "bukti bayar",
    "akun bermasalah",
    "masalah akun",
    "tidak bisa login",
    "gagal login",
    "komplain",
    "keluhan",
    "kecewa",
    "marah",
    "pengembalian dana",
    "uang kembali",
    "verifikasi ditolak",
    "dokumen ditolak",
    "ktp bermasalah",
    "sertifikat bermasalah",
    "masalah verifikasi",
    "listing ditolak",
    "iklan ditolak",
  ];

  if (includesAny(lower, paymentAccountRefundVerification)) {
    return {
      shouldHandover: true,
      reason: "Payment, refund, verification, complaint, or account support issue",
      replyType: "support",
    };
  }

  const legalComplianceIssue = [
    "legal advice",
    "legal issue",
    "lawsuit",
    "court",
    "notaris",
    "ppat",
    "pajak",
    "tax issue",
    "government registration",
    "compliance issue",
    "masalah hukum",
    "gugatan",
    "pengadilan",
    "izin usaha",
    "legalitas perusahaan",
  ];

  if (includesAny(lower, legalComplianceIssue)) {
    return {
      shouldHandover: true,
      reason: "Legal, compliance, or official company matter",
      replyType: "general",
    };
  }

  const customProposalIssue = [
    "custom package",
    "special package",
    "paket khusus",
    "custom quotation",
    "custom quote",
    "proposal khusus",
    "kerja sama khusus",
    "enterprise",
    "bulk listing",
    "bulk upload",
  ];

  if (includesAny(lower, customProposalIssue)) {
    return {
      shouldHandover: true,
      reason: "Custom package or proposal inquiry",
      replyType: "general",
    };
  }

  return {
    shouldHandover: false,
    reason: "",
    replyType: null,
  };
}

function buildHandoverReply(message: string, replyType: "general" | "support") {
  const language = detectLanguage(message);

  if (replyType === "support") {
    return language === "id"
      ? `Baik, untuk masalah refund, verifikasi, pembayaran, atau akun, tim Tetamo akan menghubungi Anda untuk membantu pemeriksaan lebih lanjut. Anda juga dapat melihat:\n${TETAMO_LINKS.faq}\n${TETAMO_LINKS.subscriptionPolicy}`
      : `The Tetamo team will contact you to review your refund, verification, payment or account issue further. You can also check:\n${TETAMO_LINKS.faq}\n${TETAMO_LINKS.subscriptionPolicy}`;
  }

  return language === "id"
    ? "Baik, percakapan ini sudah saya tandai agar tim Tetamo dapat membantu menindaklanjutinya."
    : "I’ve marked this conversation so the Tetamo team can follow it up.";
}

function removeUnwantedAdminClosing(reply: string) {
  let clean = String(reply || "").trim();

  const unwantedPatterns = [
    /(?:\n|\r|^).*?(?:apakah|apa)\s+(?:anda|kamu|ibu\/bapak)\s+(?:ingin|mau).*?(?:admin|tim|human|manusia).*?\??\s*$/i,
    /(?:\n|\r|^).*?(?:mau|ingin)\s+saya\s+(?:hubungkan|sambungkan|teruskan).*?(?:admin|tim).*?\??\s*$/i,
    /(?:\n|\r|^).*?do\s+you\s+want\s+me\s+to\s+(?:connect|transfer|pass|assign).*?(?:admin|team|human).*?\??\s*$/i,
    /(?:\n|\r|^).*?would\s+you\s+like\s+me\s+to\s+(?:connect|transfer|pass|assign).*?(?:admin|team|human).*?\??\s*$/i,
    /(?:\n|\r|^).*?shall\s+i\s+(?:connect|transfer|pass|assign).*?(?:admin|team|human).*?\??\s*$/i,
  ];

  for (const pattern of unwantedPatterns) {
    clean = clean.replace(pattern, "").trim();
  }

  return clean || reply;
}

function removeUnwantedAiIdentity(reply: string, customerMessage: string) {
  if (isIdentityQuestion(customerMessage)) return reply;

  let clean = String(reply || "").trim();

  const unwantedIdentityPatterns = [
    /^halo,?\s*saya\s+(?:adalah\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^hi,?\s*i(?:'|’)m\s+(?:a\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^hello,?\s*i(?:'|’)m\s+(?:a\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^saya\s+(?:adalah\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^i\s+am\s+(?:a\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^sebagai\s+(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^as\s+(?:a\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^halo,?\s*saya\s+(?:adalah\s+)?(?:asisten virtual|virtual assistant|chatbot|bot).*?(?:\.|\n)/i,
    /^hi,?\s*i(?:'|’)m\s+(?:a\s+)?(?:virtual assistant|chatbot|bot).*?(?:\.|\n)/i,
  ];

  for (const pattern of unwantedIdentityPatterns) {
    clean = clean.replace(pattern, "").trim();
  }

  return clean || reply;
}

function replaceUnsupportedFuturePromises(value: string) {
  return String(value || "")
    .replace(
      /\bMau saya kirim(?:kan)?\s+((?:langkah|panduan|penjelasan|detail|informasi|cara)\b[^?\n]*)\?/gi,
      (_match, subject: string) => {
        const cleanedSubject = String(subject)
          .trim()
          .replace(/\s+di sini$/i, "");

        return `Mau saya jelaskan ${cleanedSubject} di sini?`;
      }
    )
    .replace(
      /\bWould you like me to send\s+((?:(?:the|a)\s+)?(?:full\s+)?(?:steps|instructions|guide|details|information|process)\b[^?\n]*)\?/gi,
      (_match, subject: string) => {
        const cleanedSubject = String(subject)
          .trim()
          .replace(/\s+here$/i, "");

        return `Would you like me to explain ${cleanedSubject} here?`;
      }
    );
}

function cleanFinalReply(reply: string, customerMessage: string) {
  let clean = String(reply || "")
    .trim()
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\n{3,}/g, "\n\n");

  clean = removeUnwantedAiIdentity(clean, customerMessage);
  clean = removeUnwantedAdminClosing(clean);
  clean = replaceUnsupportedFuturePromises(clean);

  clean = clean
    .replace(
      /^(halo|hai|hi|hello)[!,.]?\s+(halo|hai|hi|hello)[!,.]?\s+/i,
      "$1! "
    )
    .trim();

  return limitWhatsAppReply(clean);
}

function getFallbackReply(message: string, language: MonaLanguage) {
  const lower = String(message || "").toLowerCase();

  if (isIdentityQuestion(message)) {
    return language === "id"
      ? HARDCODED_FAQ[0].answerId
      : HARDCODED_FAQ[0].answerEn;
  }

  if (
    includesAny(lower, [
      "apa itu tetamo",
      "tetamo itu apa",
      "what is tetamo",
      "what does tetamo do",
    ])
  ) {
    return language === "id"
      ? HARDCODED_FAQ[1].answerId
      : HARDCODED_FAQ[1].answerEn;
  }

  if (
    includesAny(lower, [
      "kantor tetamo",
      "tetamo perusahaan",
      "where is tetamo",
      "tetamo office",
      "abn",
    ])
  ) {
    return language === "id"
      ? HARDCODED_FAQ[3].answerId
      : HARDCODED_FAQ[3].answerEn;
  }

  if (
    includesAny(lower, [
      "paket agen",
      "membership agen",
      "agent package",
      "agent membership",
    ])
  ) {
    return language === "id"
      ? HARDCODED_FAQ[13].answerId
      : HARDCODED_FAQ[13].answerEn;
  }

  if (
    includesAny(lower, [
      "paket pemilik",
      "paket owner",
      "owner package",
      "owner listing",
    ])
  ) {
    return language === "id"
      ? HARDCODED_FAQ[12].answerId
      : HARDCODED_FAQ[12].answerEn;
  }

  if (includesAny(lower, ["developer", "project", "proyek"])) {
    return language === "id"
      ? HARDCODED_FAQ[14].answerId
      : HARDCODED_FAQ[14].answerEn;
  }

  if (
    includesAny(lower, ["agen", "agent"]) &&
    includesAny(lower, ["pasang", "listing", "iklan", "daftar", "join"])
  ) {
    return language === "id"
      ? HARDCODED_FAQ[6].answerId
      : HARDCODED_FAQ[6].answerEn;
  }

  if (
    includesAny(lower, [
      "pasang",
      "listing",
      "iklan",
      "jual rumah",
      "sewa rumah",
      "list my property",
      "advertise my property",
    ])
  ) {
    return language === "id"
      ? HARDCODED_FAQ[5].answerId
      : HARDCODED_FAQ[5].answerEn;
  }

  if (
    includesAny(lower, [
      "harga",
      "biaya",
      "berapa",
      "price",
      "cost",
      "how much",
    ])
  ) {
    return language === "id"
      ? HARDCODED_FAQ[11].answerId
      : HARDCODED_FAQ[11].answerEn;
  }

  return language === "id"
    ? "Halo 😊 Ibu/Bapak ingin memasang properti sebagai pemilik, bergabung sebagai agen, mencari properti, atau menanyakan Developer License?"
    : "Hi 😊 Are you looking to advertise a property as an owner, join as an agent, find a property, or ask about a Developer License?";
}

function tokeniseForSearch(value: string) {
  return Array.from(
    new Set(
      String(value || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3)
        .filter((token) => !SEARCH_STOPWORDS.has(token))
    )
  );
}

function scoreKnowledgeEntry(message: string, entry: KnowledgeEntry) {
  const normalizedMessage = String(message || "").toLowerCase().trim();
  const messageTokens = tokeniseForSearch(message);
  const question = String(entry.canonical_question || "").toLowerCase();
  const answer = String(entry.approved_answer || "").toLowerCase();
  const category = String(entry.category || "").toLowerCase();

  let score = 0;

  const questionLines = question
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of questionLines) {
    if (line === normalizedMessage) score += 20;
    else if (line.length >= 8 && normalizedMessage.includes(line)) score += 10;
    else if (normalizedMessage.length >= 8 && line.includes(normalizedMessage)) {
      score += 8;
    }
  }

  for (const token of messageTokens) {
    if (question.includes(token)) score += 3;
    if (category.includes(token)) score += 1.5;
    if (answer.includes(token)) score += 0.5;
  }

  score += Math.max(0, Number(entry.priority || 0)) / 1000;

  return score;
}

async function searchApprovedKnowledge(
  customerMessage: string,
  language: MonaLanguage
) {
  const { data, error } = await supabaseAdmin
    .from("knowledge_base_entries")
    .select(
      "id, category, canonical_question, approved_answer, language, priority"
    )
    .eq("status", "active")
    .order("priority", { ascending: false })
    .limit(150);

  if (error) {
    console.error("Failed to search approved Knowledge Base:", error);
    return [] as KnowledgeEntry[];
  }

  return ((data || []) as KnowledgeEntry[])
    .filter((entry) => {
      const entryLanguage = String(entry.language || "both").toLowerCase();
      return (
        entryLanguage === "both" ||
        entryLanguage === language ||
        entryLanguage === "id/en" ||
        entryLanguage === "en/id"
      );
    })
    .map((entry) => ({
      entry,
      score: scoreKnowledgeEntry(customerMessage, entry),
    }))
    .filter((item) => item.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.entry);
}

function formatHardcodedFaq() {
  return HARDCODED_FAQ.map((item, index) => {
    return [
      `FAQ ${index + 1}: ${item.topic}`,
      `Question variations: ${item.questions.join(" | ")}`,
      `Approved Indonesian answer: ${item.answerId}`,
      `Approved English answer: ${item.answerEn}`,
    ].join("\n");
  }).join("\n\n");
}

function formatKnowledgeEntries(entries: KnowledgeEntry[]) {
  if (!entries.length) {
    return "No additional relevant approved Knowledge Base entries were found.";
  }

  return entries
    .map((entry, index) => {
      return [
        `Knowledge Base ${index + 1}`,
        `Category: ${entry.category || "general"}`,
        `Question patterns: ${entry.canonical_question || ""}`,
        `Approved answer: ${entry.approved_answer || ""}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildMonaPrompt(params: {
  customerMessage: string;
  language: MonaLanguage;
  conversationContext: string | null;
  campaignContext: CampaignContext | null;
  knowledgeEntries: KnowledgeEntry[];
}) {
  const campaignText = params.campaignContext
    ? [
        `Template: ${params.campaignContext.templateName || "unknown"}`,
        `Category: ${params.campaignContext.templateCategory || "unknown"}`,
        `Send type: ${params.campaignContext.sendType || "unknown"}`,
        `Sent at: ${params.campaignContext.sentAt || "unknown"}`,
      ].join("\n")
    : "No recent campaign context.";

  return `
You are Mona from Tetamo, replying to customers through WhatsApp.

MONA IDENTITY:
- Your name is Mona.
- You represent Tetamo.
- Never introduce yourself as an AI assistant, WhatsApp AI, chatbot, bot, automated assistant or virtual assistant.
- Do not introduce yourself in every reply.
- Introduce yourself only when the customer asks who you are, your name, whether you are AI, or whether you are admin.
- When identity is asked, use the approved identity answer in the customer's language and continue answering any real question they also asked.

LANGUAGE:
- Reply in Indonesian when the customer uses Indonesian.
- Reply in English when the customer uses English.
- Understand normal Indonesian slang, abbreviations and spelling mistakes, including brp, gmn, udh, sdh, blm, sy, yg, gak, ga and nggak.
- When the customer mixes Indonesian and English, use the main language naturally.
- Do not randomly switch languages.
- The detected language for this message is: ${params.language}.

PERSONALITY:
- Professional, friendly, helpful, warm, clear, confident, practical and naturally sales-aware.
- Sound like an experienced Tetamo team member, not a robotic FAQ system.
- Be less formal when the customer is casual and appropriately professional when the customer is formal.
- Answer the actual question first.
- Keep replies focused, concise and WhatsApp-friendly.
- Use short paragraphs.
- Do not write a long tutorial unless the customer asks for detailed steps.
- Use at most one subtle emoji when it feels natural.
- Do not repeat greetings, introductions, questions or information already given in the conversation.
- Do not ask the customer to repeat a readable question.
- If the latest message is genuinely unreadable, meaningless or impossible to understand even after using the conversation context, output exactly [[HANDOVER_UNREADABLE]] and nothing else.
- Do not use [[HANDOVER_UNREADABLE]] for normal Indonesian slang, abbreviations, spelling mistakes, greetings or vague but understandable messages.
- Ask at most one useful follow-up question, only when genuinely needed.

ADMIN-OFFER PREVENTION:
- Do not offer admin handover at the end of ordinary answers.
- Never ask “Mau saya sambungkan ke admin?” or “Would you like me to connect you to the team?” during normal sales, pricing, listing, buyer, renter, owner, agent, dashboard, app or feature questions.
- The webhook has already handled issues that require admin.

FACTUAL RULES:
- Use the hardcoded official Tetamo information below as the primary source of truth.
- Use approved Knowledge Base entries only as supplementary factual information when relevant.
- Do not invent prices, package names, listing limits, durations, benefits, links, company details, policies, property facts or promises.
- When a Knowledge Base entry conflicts with the hardcoded official information, follow the hardcoded official information.
- Use only the approved links included below.
- Do not guarantee leads, sales, rentals, ROI, legal safety, exact results or fixed performance numbers.
- Explain Tetamo positively before discussing limitations.
- Tetamo is a property marketplace and technology platform, not a real-estate agency or brokerage.

LISTING RULES:
- Customers cannot create a listing by sending property details, photos or videos through WhatsApp.
- Owners and agents create and manage listings through their own Tetamo account and dashboard.
- Minimum 3 photos are required; video may be added when available.
- Generate AI helps create the title and description inside Tetamo.
- Owner verification is optional when the owner wants verification status.
- QRIS may be paid using a banking or e-wallet app that supports QRIS.
- Owner and agent listing flows are different. Do not mix their steps.
- Agent membership is active for 1 year, and the listing limit depends on the selected package.
- Once the required process is completed and the listing is published, it automatically appears in the Tetamo marketplace.

PRICING RULES:
- When a pricing question is vague, ask whether the customer is an owner, an agent, or a developer/project owner.
- If the customer is an owner, explain only owner packages.
- If the customer is an agent, explain only agent packages.
- If the customer is a developer or project owner, explain Developer License only.
- Always use official package names.
- Never call Developer License a normal “Developer Package”.
- Share the official pricelist when relevant: ${TETAMO_LINKS.pricelist}

APPROVED LINKS:
- Website: ${TETAMO_LINKS.website}
- Pricelist: ${TETAMO_LINKS.pricelist}
- FAQ: ${TETAMO_LINKS.faq}
- Subscription Policy: ${TETAMO_LINKS.subscriptionPolicy}
- Developer License: ${TETAMO_LINKS.developerLicense}
- How to list property blog: ${TETAMO_LINKS.howToListBlog}
- How to post property video: ${TETAMO_LINKS.howToPostVideo}
- Owner and agent dashboard guide: ${TETAMO_LINKS.dashboardVideo}
- Share only the link relevant to the customer's question. Do not send every link at once.

HARDCODED OFFICIAL QUESTIONS AND ANSWERS:
${formatHardcodedFaq()}

RELEVANT APPROVED KNOWLEDGE BASE INFORMATION:
${formatKnowledgeEntries(params.knowledgeEntries)}

RECENT CAMPAIGN CONTEXT:
${campaignText}
- Use campaign context only when it helps explain what the customer is replying to.
- Never mention internal campaign IDs, routing, logs or metadata.

RECENT CONVERSATION:
${params.conversationContext || "No earlier conversation context."}

LATEST CUSTOMER MESSAGE:
${params.customerMessage}

Write only Mona's final WhatsApp reply.
Do not return JSON.
Do not add labels such as “Mona:” or “Tetamo:”.
`.trim();
}

async function pauseMonaForAdmin(params: {
  conversationId: string;
  reason: string;
}) {
  const { error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update({
      ai_enabled: false,
      handover_to_admin: true,
      handover_reason: params.reason,
    })
    .eq("id", params.conversationId);

  if (error) {
    console.error("Failed to pause Mona for admin handover:", error);
    return false;
  }

  console.log("Meta Mona paused for admin handover.", {
    conversationId: params.conversationId,
    reason: params.reason,
  });

  return true;
}

async function isWhatsappNumberBlocked(customerPhone: string) {
  const normalizedPhone = normalizePhone(customerPhone);

  if (!normalizedPhone) return false;

  const phoneVariants = [
    normalizedPhone,
    `+${normalizedPhone}`,
    `whatsapp:+${normalizedPhone}`,
  ];

  const { data, error } = await supabaseAdmin
    .from("whatsapp_blocked_numbers")
    .select("id")
    .in("phone_e164", phoneVariants)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check WhatsApp blocked number:", error);
    return false;
  }

  return Boolean(data?.id);
}

async function getLatestCampaignContext(
  conversationId: string
): Promise<CampaignContext | null> {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_template_send_logs")
    .select(
      "campaign_id, recipient_id, template_name, template_language, template_category, send_type, sent_at, created_at"
    )
    .eq("conversation_id", conversationId)
    .eq("status", "sent")
    .not("campaign_id", "is", null)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load WhatsApp campaign context:", error);
    return null;
  }

  if (!data?.campaign_id) return null;

  const sentAt = data.sent_at || data.created_at || null;

  if (sentAt) {
    const age = Date.now() - new Date(sentAt).getTime();
    const maximumAge = 30 * 24 * 60 * 60 * 1000;

    if (!Number.isFinite(age) || age > maximumAge) {
      return null;
    }
  }

  return {
    campaignId: String(data.campaign_id),
    recipientId: data.recipient_id ? String(data.recipient_id) : null,
    templateName: String(data.template_name || ""),
    templateLanguage: data.template_language
      ? String(data.template_language)
      : null,
    templateCategory: data.template_category
      ? String(data.template_category)
      : null,
    sendType: data.send_type ? String(data.send_type) : null,
    sentAt,
  };
}

async function upsertConversation(params: {
  customerPhone: string;
  businessPhoneNumberId: string;
  profileName: string | null;
  messageText: string;
  referral?: MetaMessage["referral"] | null;
  isBlocked: boolean;
}) {
  const now = new Date().toISOString();
  const businessSenderKey = getMetaBusinessSenderKey(
    params.businessPhoneNumberId
  );
  const conversationKey = getMetaConversationKey(
    params.businessPhoneNumberId,
    params.customerPhone
  );

  const upsertPayload: Record<string, unknown> = {
    phone: `whatsapp:+${params.customerPhone}`,
    phone_e164: params.customerPhone,
    profile_name: params.profileName,
    channel: "meta_whatsapp",
    business_sender_key: businessSenderKey,
    conversation_key: conversationKey,
    status: params.isBlocked ? "blocked" : "active",
    last_inbound_at: now,
    window_expires_at: getWindowExpiry(),
    last_message: params.messageText,
    last_message_direction: "inbound",
    last_message_at: now,
  };

  if (params.isBlocked) {
    upsertPayload.ai_enabled = false;
    upsertPayload.handover_to_admin = false;
    upsertPayload.handover_reason = "Number blocked by admin";
  }

  if (params.referral) {
    upsertPayload.free_entry_point_expires_at = getFreeEntryPointExpiry();
    upsertPayload.free_entry_point_source = "meta_click_to_whatsapp_ad";
    upsertPayload.ad_referral_source = getAdReferralSource(params.referral);
    upsertPayload.ad_referral_payload = params.referral;
    upsertPayload.ad_referral_updated_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .upsert(upsertPayload, {
      onConflict: "conversation_key",
    })
    .select(
      "id, phone, phone_e164, channel, business_sender_key, conversation_key, ai_enabled, handover_to_admin, handover_reason, free_entry_point_expires_at, free_entry_point_source, ad_referral_source"
    )
    .single();

  if (error || !data?.id) {
    console.error("Failed to upsert Meta WhatsApp conversation:", error);
    return null;
  }

  return data as ConversationRow;
}

async function hasProcessedMetaInboundMessage(
  metaMessageId?: string | null
) {
  const cleanMessageId = cleanEnv(metaMessageId);

  if (!cleanMessageId) return false;

  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id")
    .eq("provider", "meta")
    .eq("provider_message_id", cleanMessageId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to check Meta message deduplication:", error);
    return false;
  }

  return Boolean(data?.id);
}

async function saveInboundMessage(params: {
  conversationId: string;
  customerPhone: string;
  businessPhoneNumberId: string;
  profileName: string | null;
  messageText: string;
  metaMessageId: string | null;
  rawPayload: unknown;
  referral?: MetaMessage["referral"] | null;
  messageType?: string | null;
}) {
  const createdAt = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .insert({
      conversation_id: params.conversationId,
      direction: "inbound",
      from_number: params.customerPhone,
      to_number: params.businessPhoneNumberId,
      phone: `whatsapp:+${params.customerPhone}`,
      profile_name: params.profileName,
      message: params.messageText,
      source: "meta",
      provider: "meta",
      provider_message_id: params.metaMessageId,
      ai_generated: false,
      admin_generated: false,
      media_count:
        params.messageType &&
        !["text", "button", "interactive"].includes(params.messageType)
          ? 1
          : 0,
      raw_payload: {
        meta_message_id: params.metaMessageId,
        meta_message_type: params.messageType || null,
        meta_referral: params.referral || null,
        meta_payload: params.rawPayload,
      },
      created_at: createdAt,
    })
    .select("id, created_at")
    .single();

  if (error?.code === "23505") {
    return {
      stored: false,
      duplicate: true,
      messageId: null,
      createdAt: null,
    };
  }

  if (error) {
    console.error("Failed to save Meta inbound WhatsApp message:", error);

    return {
      stored: false,
      duplicate: false,
      messageId: null,
      createdAt: null,
    };
  }

  return {
    stored: true,
    duplicate: false,
    messageId: data?.id ? String(data.id) : null,
    createdAt: data?.created_at ? String(data.created_at) : createdAt,
  };
}

async function saveOutboundMessage(params: {
  conversationId: string;
  customerPhone: string;
  businessPhoneNumberId: string | null;
  profileName: string | null;
  reply: string;
  metaSendId: string | null;
  metaSendError: unknown;
  aiGenerated: boolean;
  source: string;
}) {
  const outboundAt = new Date().toISOString();

  const { error: messageError } = await supabaseAdmin
    .from("whatsapp_messages")
    .insert({
      conversation_id: params.conversationId,
      direction: "outbound",
      from_number: params.businessPhoneNumberId,
      to_number: params.customerPhone,
      phone: `whatsapp:+${params.customerPhone}`,
      profile_name: params.profileName,
      message: params.reply,
      source: params.source,
      provider: "meta",
      provider_message_id: params.metaSendId,
      ai_generated: params.aiGenerated,
      admin_generated: false,
      media_count: 0,
      raw_payload: {
        meta_send_id: params.metaSendId,
        meta_send_error: params.metaSendError,
      },
      created_at: outboundAt,
    });

  if (messageError) {
    console.error("Failed to save Meta outbound WhatsApp message:", messageError);
  }

  const { error: conversationError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update({
      last_message: params.reply,
      last_message_direction: "outbound",
      last_message_at: outboundAt,
    })
    .eq("id", params.conversationId);

  if (conversationError) {
    console.error(
      "Failed to update Meta conversation after reply:",
      conversationError
    );
  }
}

async function getConversationContext(
  conversationId: string,
  excludedMessageIds: string[]
) {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .select(
      "id, direction, message, created_at, admin_generated, ai_generated"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(16);

  if (error) {
    console.error("Failed to load Meta conversation context:", error);
    return null;
  }

  const excludedIds = new Set(
    excludedMessageIds.map((value) => String(value || "")).filter(Boolean)
  );

  const orderedMessages = ((data || []) as StoredMessageRow[])
    .filter((item) => !excludedIds.has(String(item.id)))
    .slice()
    .reverse();

  const messages = orderedMessages
    .map((item) => {
      let speaker = "Customer";

      if (item.direction === "outbound") {
        speaker = item.admin_generated ? "Admin" : "Mona";
      }

      return `${speaker}: ${String(item.message || "").trim()}`;
    })
    .filter((item) => !item.endsWith(": "));

  if (!messages.length) return null;

  return messages.join("\n").slice(-8000);
}

async function collectRecentInboundBurst(params: {
  conversationId: string;
  currentMessageId: string;
}) {
  await sleep(2800);

  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id, direction, message, created_at")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to collect fast Meta message burst:", error);
    return {
      isLatest: true,
      combinedMessage: "",
      messageIds: [params.currentMessageId],
    };
  }

  const ordered = ((data || []) as StoredMessageRow[]).slice().reverse();
  const inboundMessages = ordered.filter((item) => item.direction === "inbound");
  const newestInbound = inboundMessages.at(-1);

  if (!newestInbound) {
    return {
      isLatest: true,
      combinedMessage: "",
      messageIds: [params.currentMessageId],
    };
  }

  if (String(newestInbound.id) !== String(params.currentMessageId)) {
    return {
      isLatest: false,
      combinedMessage: "",
      messageIds: [],
    };
  }

  const newestTime = new Date(newestInbound.created_at).getTime();
  const latestOutboundIndex = ordered
    .map((item) => item.direction)
    .lastIndexOf("outbound");
  const afterLatestOutbound = ordered.slice(latestOutboundIndex + 1);

  const burstMessages = afterLatestOutbound.filter((item) => {
    if (item.direction !== "inbound") return false;

    const itemTime = new Date(item.created_at).getTime();
    const age = newestTime - itemTime;
    const message = String(item.message || "").trim();

    return (
      Number.isFinite(age) &&
      age >= 0 &&
      age <= 6500 &&
      Boolean(message) &&
      !message.startsWith("[Customer sent")
    );
  });

  return {
    isLatest: true,
    combinedMessage: burstMessages
      .map((item) => String(item.message || "").trim())
      .filter(Boolean)
      .join("\n"),
    messageIds: burstMessages.map((item) => String(item.id)),
  };
}

async function isStillLatestInboundMessage(
  conversationId: string,
  messageId: string
) {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("direction", "inbound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to recheck latest Meta inbound message:", error);
    return true;
  }

  return String(data?.id || "") === String(messageId);
}

async function generateMonaReply(params: {
  customerMessage: string;
  conversationId: string;
  excludedMessageIds: string[];
  campaignContext: CampaignContext | null;
}): Promise<MonaGenerationResult> {
  const language = detectLanguage(params.customerMessage);
  const fallbackReply = getFallbackReply(params.customerMessage, language);

  if (!process.env.OPENAI_API_KEY) {
    return {
      action: "reply",
      reply: cleanFinalReply(fallbackReply, params.customerMessage),
    };
  }

  try {
    const [knowledgeEntries, conversationContext] = await Promise.all([
      searchApprovedKnowledge(params.customerMessage, language),
      getConversationContext(params.conversationId, params.excludedMessageIds),
    ]);

    const prompt = buildMonaPrompt({
      customerMessage: params.customerMessage,
      language,
      conversationContext,
      campaignContext: params.campaignContext,
      knowledgeEntries,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.45,
      max_output_tokens: 700,
    });

    const rawReply = String(response.output_text || "").trim();

    if (rawReply === "[[HANDOVER_UNREADABLE]]") {
      return {
        action: "handover_unreadable",
        reason:
          "OpenAI could not reliably understand the customer message and requested admin review",
      };
    }

    return {
      action: "reply",
      reply: cleanFinalReply(
        rawReply || fallbackReply,
        params.customerMessage
      ),
    };
  } catch (error) {
    console.error("Meta WhatsApp OpenAI generation failed:", error);
    return {
      action: "reply",
      reply: cleanFinalReply(fallbackReply, params.customerMessage),
    };
  }
}

async function sendMetaWhatsappText(params: {
  phoneNumberId: string;
  to: string;
  message: string;
}): Promise<MetaSendResult> {
  const accessToken = getMetaAccessToken();

  if (!accessToken || !params.phoneNumberId || !params.to || !params.message) {
    console.error("Meta send skipped. Missing required data.", {
      hasAccessToken: Boolean(accessToken),
      hasPhoneNumberId: Boolean(params.phoneNumberId),
      hasTo: Boolean(params.to),
      hasMessage: Boolean(params.message),
    });

    return {
      success: false,
      id: null,
      error: "Missing Meta send data.",
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${getGraphVersion()}/${params.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: params.to,
          type: "text",
          text: {
            preview_url: false,
            body: params.message,
          },
        }),
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Meta WhatsApp send failed:", result);

      return {
        success: false,
        id: null,
        error: result,
      };
    }

    return {
      success: true,
      id: result?.messages?.[0]?.id || null,
      error: null,
    };
  } catch (error) {
    console.error("Meta WhatsApp send error:", error);

    return {
      success: false,
      id: null,
      error,
    };
  }
}

function extractWebhookMessages(payload: any) {
  const items: Array<{
    value: MetaWebhookValue;
    message: MetaMessage;
    profileName: string | null;
    phoneNumberId: string | null;
  }> = [];

  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change?.value as MetaWebhookValue;
      const phoneNumberId = value?.metadata?.phone_number_id || null;
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      const messages = Array.isArray(value?.messages) ? value.messages : [];

      for (const message of messages) {
        const profileName =
          contacts.find((contact) => contact?.wa_id === message?.from)?.profile
            ?.name ||
          contacts[0]?.profile?.name ||
          null;

        items.push({
          value,
          message,
          profileName,
          phoneNumberId,
        });
      }
    }
  }

  return items;
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const mode = cleanEnv(url.searchParams.get("hub.mode"));
  const providedToken = cleanEnv(url.searchParams.get("hub.verify_token"));
  const challenge = cleanEnv(url.searchParams.get("hub.challenge"));
  const expectedTokens = getVerifyTokens();

  const tokenMatches = expectedTokens.some(
    (expectedToken) => providedToken === expectedToken
  );

  if (mode === "subscribe" && tokenMatches && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return Response.json(
    {
      success: false,
      error: "Meta webhook verification failed.",
      mode,
      hasProvidedToken: Boolean(providedToken),
      expectedTokenCount: expectedTokens.length,
      tokenMatches,
      hasChallenge: Boolean(challenge),
    },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);

    if (!payload || payload.object !== "whatsapp_business_account") {
      return Response.json({ success: true, ignored: true });
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing Supabase env vars for Meta WhatsApp webhook.");
      return Response.json({ success: true, stored: false });
    }

    const webhookMessages = extractWebhookMessages(payload);

    let processedCount = 0;
    let ignoredCount = 0;
    let duplicateCount = 0;
    let handoverCount = 0;
    let replyCount = 0;

    for (const item of webhookMessages) {
      const incomingPhoneNumberId = cleanEnv(item.phoneNumberId);

      if (!isAllowedBusinessPhoneNumberId(incomingPhoneNumberId)) {
        ignoredCount += 1;
        continue;
      }

      const customerPhone = normalizePhone(item.message.from || "");
      const phoneNumberId = getPhoneNumberId(incomingPhoneNumberId);
      const metaMessageId = cleanEnv(item.message.id);
      const messageType = String(item.message.type || "unknown").toLowerCase();
      const messageText = getMessageDisplayText(item.message);
      const readableText = getTextFromMetaMessage(item.message);
      const referral = item.message.referral || null;

      if (!customerPhone || !phoneNumberId) {
        ignoredCount += 1;
        continue;
      }

      if (await hasProcessedMetaInboundMessage(metaMessageId)) {
        duplicateCount += 1;
        continue;
      }

      const blockedNumber = await isWhatsappNumberBlocked(customerPhone);

      const conversation = await upsertConversation({
        customerPhone,
        businessPhoneNumberId: phoneNumberId,
        profileName: item.profileName,
        messageText,
        referral,
        isBlocked: blockedNumber,
      });

      if (!conversation?.id) {
        ignoredCount += 1;
        continue;
      }

      const inboundSave = await saveInboundMessage({
        conversationId: conversation.id,
        customerPhone,
        businessPhoneNumberId: phoneNumberId,
        profileName: item.profileName,
        messageText,
        metaMessageId: metaMessageId || null,
        rawPayload: payload,
        referral,
        messageType,
      });

      if (inboundSave.duplicate) {
        duplicateCount += 1;
        continue;
      }

      if (!inboundSave.stored || !inboundSave.messageId) {
        ignoredCount += 1;
        continue;
      }

      if (blockedNumber) {
        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      if (
        !isMonaAiEnabled(conversation.ai_enabled) ||
        conversation.handover_to_admin === true
      ) {
        console.log(
          "Meta Mona remains silent while the conversation is with admin.",
          {
            conversationId: conversation.id,
            handoverReason: conversation.handover_reason || null,
          }
        );

        processedCount += 1;
        continue;
      }

      if (isReactionMessage(item.message)) {
        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      if (isMediaOrUnsupportedMessage(item.message)) {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: `Customer sent ${messageType} content for admin review`,
        });

        processedCount += 1;
        handoverCount += 1;
        continue;
      }

      if (!isTextLikeMessage(item.message) || !readableText) {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: "Customer sent unsupported or unreadable WhatsApp content",
        });

        processedCount += 1;
        handoverCount += 1;
        continue;
      }

      if (isClearlyUnreadableMessage(readableText)) {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: "Customer message is clearly unreadable and needs admin review",
        });

        processedCount += 1;
        handoverCount += 1;
        continue;
      }

      const burst = await collectRecentInboundBurst({
        conversationId: conversation.id,
        currentMessageId: inboundSave.messageId,
      });

      if (!burst.isLatest) {
        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      const combinedMessage = burst.combinedMessage || readableText;

      if (isClearlyUnreadableMessage(combinedMessage)) {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: "Combined customer message is unreadable and needs admin review",
        });

        processedCount += 1;
        handoverCount += 1;
        continue;
      }

      const handover = detectHandover(combinedMessage);

      if (handover.shouldHandover && handover.replyType) {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: handover.reason,
        });

        const handoverReply = buildHandoverReply(
          combinedMessage,
          handover.replyType
        );

        const sendResult = await sendMetaWhatsappText({
          phoneNumberId,
          to: customerPhone,
          message: handoverReply,
        });

        await saveOutboundMessage({
          conversationId: conversation.id,
          customerPhone,
          businessPhoneNumberId: phoneNumberId,
          profileName: item.profileName,
          reply: handoverReply,
          metaSendId: sendResult.id,
          metaSendError: sendResult.success ? null : sendResult.error,
          aiGenerated: false,
          source: "tetamo_admin_handover_meta",
        });

        processedCount += 1;
        handoverCount += 1;
        continue;
      }

      const campaignContext = await getLatestCampaignContext(conversation.id);

      const generation = await generateMonaReply({
        customerMessage: combinedMessage,
        conversationId: conversation.id,
        excludedMessageIds: burst.messageIds.length
          ? burst.messageIds
          : [inboundSave.messageId],
        campaignContext,
      });

      if (generation.action === "handover_unreadable") {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: generation.reason,
        });

        processedCount += 1;
        handoverCount += 1;
        continue;
      }

      const reply = generation.reply;

      if (!reply) {
        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      const stillLatest = await isStillLatestInboundMessage(
        conversation.id,
        inboundSave.messageId
      );

      if (!stillLatest) {
        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      const sendResult = await sendMetaWhatsappText({
        phoneNumberId,
        to: customerPhone,
        message: reply,
      });

      await saveOutboundMessage({
        conversationId: conversation.id,
        customerPhone,
        businessPhoneNumberId: phoneNumberId,
        profileName: item.profileName,
        reply,
        metaSendId: sendResult.id,
        metaSendError: sendResult.success ? null : sendResult.error,
        aiGenerated: true,
        source: sendResult.success
          ? "tetamo_mona_meta"
          : "tetamo_mona_meta_send_failed",
      });

      processedCount += 1;
      replyCount += 1;
    }

    return Response.json({
      success: true,
      processedCount,
      ignoredCount,
      duplicateCount,
      handoverCount,
      replyCount,
    });
  } catch (error) {
    console.error("Meta WhatsApp webhook error:", error);
    return Response.json({ success: true, error_logged: true });
  }
}
