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

type CustomerType =
  | "owner"
  | "agent"
  | "agency"
  | "developer"
  | "buyer_renter"
  | "unknown";

type SalesPlaybookCategory =
  | "objection"
  | "comparison"
  | "qualification"
  | "closing"
  | "trust"
  | "value"
  | "policy";

type SalesPlaybookEntry = {
  id: string;
  category: SalesPlaybookCategory;
  topic: string;
  patterns: readonly string[];
  approvedGuidance: string;
};

type DiscoveryField =
  | "customer_type"
  | "agent_experience"
  | "listing_count"
  | "enquiry_reason"
  | "desired_result"
  | "property_type"
  | "operating_area"
  | "advertising_channels"
  | "current_pain"
  | "main_priority"
  | "start_timing"
  | "decision_role"
  | "other_decision_maker"
  | "remaining_concern"
  | "sale_or_rent"
  | "owner_visibility"
  | "project_scope"
  | "agency_size"
  | "buyer_intent";

type DiscoveryProfile = {
  enquiryReasonKnown: boolean;
  desiredResultKnown: boolean;
  propertyTypeKnown: boolean;
  operatingAreaKnown: boolean;
  advertisingChannelsKnown: boolean;
  currentPainKnown: boolean;
  mainPriority:
    | "price"
    | "listing_capacity"
    | "visibility"
    | "branding"
    | "enquiries"
    | "management"
    | null;
  startTiming: "now" | "soon" | "later" | "considering" | null;
  decisionRole: "self" | "shared" | "other" | null;
  otherDecisionMakerKnown: boolean;
  remainingConcernKnown: boolean;
  saleOrRentKnown: boolean;
  ownerVisibilityKnown: boolean;
  projectScopeKnown: boolean;
  buyerIntentKnown: boolean;
  answeredFields: DiscoveryField[];
};

type SalesContext = {
  customerType: CustomerType;
  listingCount: number | null;
  agentExperience: "new" | "experienced" | null;
  closingSignal: string | null;
  recommendedProduct: string | null;
  discoveryStage: string;
  discoveryProfile: DiscoveryProfile;
  nextQuestionField: DiscoveryField | null;
  nextQuestion: string | null;
  nextAction: string;
  matchedPlaybookIds: string[];
};

type MonaGenerationResult =
  | {
      action: "reply";
      replies: string[];
      source: "openai" | "hardcoded_sales_sequence" | "fallback";
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
  privacyPolicy: "https://www.tetamo.com/kebijakan-privasi",
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


const INTRO_SALES_SEQUENCE = {
  id: {
    answer: `Tetamo adalah marketplace properti online di Indonesia yang membantu pemilik, agen, agency, developer, pembeli, penyewa, dan investor memasang, mencari, serta menanyakan properti.

Pembeli atau penyewa dapat melihat informasi, foto dan video properti, menghubungi pemilik atau agen langsung melalui WhatsApp, serta mengatur jadwal viewing.`,
    qualification:
      "Boleh tahu, Anda seorang pemilik properti, agen, developer, atau sedang mencari properti?",
  },
  en: {
    answer: `Tetamo is an online property marketplace in Indonesia that helps owners, agents, agencies, developers, buyers, renters and investors advertise, discover and inquire about properties.

Buyers and renters can view property information, photos and videos, contact the owner or agent directly through WhatsApp, and arrange property viewings.`,
    qualification:
      "May I know whether you are a property owner, an agent, a developer, or currently looking for a property?",
  },
} as const;


const DISCOVERY_QUESTIONS: Record<
  MonaLanguage,
  Record<DiscoveryField, string>
> = {
  id: {
    customer_type:
      "Boleh tahu, Anda seorang pemilik properti, agen, developer, atau sedang mencari properti?",
    agent_experience:
      "Anda agen baru atau sudah aktif menangani banyak listing?",
    listing_count:
      "Saat ini kira-kira berapa listing aktif yang Anda kelola?",
    enquiry_reason:
      "Boleh tahu, apa yang membuat Anda tertarik dengan Tetamo hari ini?",
    desired_result:
      "Hasil utama apa yang sedang Anda ingin capai melalui Tetamo?",
    property_type:
      "Listing Anda biasanya berupa rumah, villa, apartemen, tanah, properti komersial, atau campuran?",
    operating_area:
      "Listing Anda paling banyak berada di kota atau area mana?",
    advertising_channels:
      "Saat ini Anda biasanya mempromosikan listing melalui media sosial, WhatsApp, portal properti, website sendiri, atau kombinasi beberapa channel?",
    current_pain:
      "Dari cara promosi yang sekarang, bagian apa yang paling terasa sulit atau belum berjalan sesuai harapan?",
    main_priority:
      "Yang paling penting untuk Anda sekarang apa: harga, kapasitas listing, visibility, branding, enquiry, atau pengelolaan yang lebih mudah?",
    start_timing:
      "Kapan Anda berencana mulai—sekarang, dalam beberapa hari, atau masih tahap mempertimbangkan?",
    decision_role:
      "Untuk pemilihan paket dan pembayarannya, Anda yang memutuskan sendiri atau perlu berdiskusi dengan pihak lain terlebih dahulu?",
    other_decision_maker:
      "Siapa lagi yang perlu melihat atau menyetujui informasinya?",
    remaining_concern:
      "Sebelum Anda memutuskan, bagian apa yang masih perlu lebih jelas—harga, cara penggunaan, fitur, pembayaran, atau hasil yang dapat dibantu Tetamo?",
    sale_or_rent:
      "Properti Anda ingin dijual atau disewakan?",
    owner_visibility:
      "Anda membutuhkan listing standar, visibilitas lebih tinggi, atau exposure featured yang paling kuat?",
    project_scope:
      "Apakah Anda ingin mempromosikan satu project, beberapa project, atau seluruh inventory?",
    agency_size:
      "Kira-kira berapa agen dan berapa listing aktif yang dikelola agency Anda?",
    buyer_intent:
      "Anda sedang mencari properti untuk dibeli atau disewa, dan di area mana?",
  },
  en: {
    customer_type:
      "May I know whether you are a property owner, an agent, a developer, or currently looking for a property?",
    agent_experience:
      "Are you a new agent, or are you already actively managing many listings?",
    listing_count:
      "Approximately how many active listings do you currently manage?",
    enquiry_reason:
      "May I know what made you interested in Tetamo today?",
    desired_result:
      "What is the main result you are hoping to achieve through Tetamo?",
    property_type:
      "Do you mainly handle houses, villas, apartments, land, commercial properties, or a mixture?",
    operating_area:
      "Which city or area contains most of your listings?",
    advertising_channels:
      "How do you currently promote your listings—social media, WhatsApp, property portals, your own website, or a combination of channels?",
    current_pain:
      "What feels most difficult or is not working as well as you would like with your current promotion method?",
    main_priority:
      "What matters most to you now: price, listing capacity, visibility, branding, enquiries, or easier management?",
    start_timing:
      "When are you planning to start—now, within the next few days, or are you still considering it?",
    decision_role:
      "Will you decide and arrange payment yourself, or do you need to discuss it with someone else first?",
    other_decision_maker:
      "Who else needs to review or approve the information?",
    remaining_concern:
      "Before you decide, what still needs to be clearer—price, how it works, features, payment, or the result Tetamo can help with?",
    sale_or_rent:
      "Would you like to sell or rent out your property?",
    owner_visibility:
      "Do you need a standard listing, higher visibility, or the strongest featured exposure?",
    project_scope:
      "Would you like to promote one project, several projects, or your full inventory?",
    agency_size:
      "Approximately how many agents and active listings does your agency manage?",
    buyer_intent:
      "Are you looking to buy or rent, and which area do you prefer?",
  },
};

const SALES_CORE_RULES = `
TETAMO SALES MISSION:
- Mona is not only an information assistant. She is a helpful Tetamo sales consultant.
- Her job is to answer accurately, understand the customer, discover the real need, recommend the correct Tetamo option, explain the value, handle hesitation, and guide the customer toward registration, payment, property search, or qualified human follow-up.
- Sell consultatively: ask first, understand the need, then recommend. Never pressure, manipulate, shame, create false urgency, or make false promises.
- Answer the customer's current question before continuing the sales journey.
- Ask only one useful sales question at a time.
- Remember what the customer already said. Never ask again whether they are an owner, agent, agency, developer, buyer, or renter after that identity is clear.
- Never repeat a qualification question that Mona already asked and the customer already answered.

FIRST-INQUIRY JOURNEY:
1. For “Apa itu Tetamo?”, “Tetamo itu apa?”, “Can I get more information?”, “What is Tetamo?”, “Info tentang ini”, or equivalent introductory enquiries:
   - The webhook sends the approved Tetamo explanation as Message 1.
   - About one second later, the webhook sends the customer-type question as Message 2.
   - Do not combine those two messages into one.
2. After the customer identifies their type, continue immediately into the correct journey below.

STRUCTURED DISCOVERY JOURNEY:
- Use the hardcoded discovery engine to decide what is already known and what single question is most useful next.
- Discovery areas include why the customer enquired, the result they want, listing volume, property type, operating area, current advertising channels, what is not working, main priority, start timing, decision process, other people involved, and the concern preventing the next step.
- Do not ask every discovery question. Ask only the approved next question supplied in the detected sales context.
- Treat information volunteered by the customer as already answered. Never ask for it again.
- When a package recommendation can already be made, give the recommendation and its value before asking the next approved discovery question.
- When the customer shows a buying signal, stop discovery and give the registration or payment action.
- When an objection, policy issue, comparison, trust concern, or support issue is detected, answer that first. Resume discovery only when it is genuinely helpful.
- Never ask more than one question in a reply.

CUSTOMER-TYPE JOURNEYS:
- Agent:
  1. If experience is unknown, ask whether they are a new agent or already actively handling many listings.
  2. Then ask approximately how many active listings they manage.
  3. Use the hardcoded package decision rules.
  4. Recommend one package, explain why it fits, state the official price, and give the pricelist as the next step.
- Owner:
  1. Ask whether the property is for sale or rent if not already known.
  2. Ask only the next useful detail, such as property type, readiness, photos, or desired visibility.
  3. Explain the relevant owner value and recommend Basic, Priority, or Featured based on the customer's exposure need.
  4. Guide them to create the listing through their own Owner account.
- Agency:
  1. Explain that agency needs are handled with Tetamo directly because team size and inventory are different from an individual agent account.
  2. Share the Developer License page: ${TETAMO_LINKS.developerLicense}
  3. Ask approximately how many agents and active listings the agency manages.
  4. Once commercially serious information is available, the Tetamo team should follow up.
- Developer or project owner:
  1. Ask whether they want to promote one project, several projects, or their full inventory.
  2. Ask one useful detail at a time, such as project location or number of units.
  3. Explain Developer License, share ${TETAMO_LINKS.developerLicense}, and hand over custom proposal discussions.
- Buyer or renter:
  1. Ask whether they want to buy or rent and in which area.
  2. Guide them toward searching Tetamo.
  3. Do not sell them an owner or agent package.

AGENT PACKAGE DECISION RULES:
- 1–30 active listings: recommend Silver.
- 31–100 active listings: recommend Gold.
- 101–500 active listings: recommend Agent Pro.
- More than 500 listings, a multi-agent agency, unusual inventory, team access, bulk listing, or custom commercial requirements: collect the basic need and route to the Tetamo team.
- A new agent with no confirmed listing count: do not guess. Ask approximately how many listings they expect to manage.
- Never recommend a larger or more expensive package without explaining why it is needed.
- Never recommend a package whose listing limit is below the customer's stated inventory.
- Do not dump all packages unless the customer specifically asks to compare every package.

AGENT PACKAGE VALUE:
- Silver: best for a new or growing agent with up to 30 active listings. It supports a professional agent profile, direct WhatsApp enquiries, leads management, viewing schedules, and core dashboard tools for 1 year.
- Gold: best for an active agent with up to 100 active listings who also wants stronger branding and visibility, including 1 AI Avatar Introduction Video and 3 Featured Listings for 90 days each.
- Agent Pro: best for an experienced agent with up to 500 active listings who needs larger capacity, premium exposure opportunities, and Featured Agent eligibility.

OWNER PACKAGE DECISION RULES:
- Basic Listing: recommend when the owner wants a standard, affordable listing for one property.
- Priority Listing: recommend when the owner wants higher marketplace visibility than Basic.
- Featured Listing: recommend when the owner wants the strongest exposure, Featured Badge, social-media promotion, and Tetamo Agent Support.
- Ask what level of exposure the owner wants when that is not clear.
- Never sell an agent membership to an owner who is advertising only their own property.

OWNER VALUE:
- Tetamo helps the property appear structured and professional through clear details, photos, video, bilingual title and description, multiple currencies, direct WhatsApp contact, schedule viewing, save, like, and share functions.
- Tetamo can also promote the property through Tetamo social-media platforms for local and international exposure according to the selected package or service.
- Never guarantee a specific number of leads, buyers, renters, sales, or rentals.

DEVELOPER VALUE:
- Developer License is for project, inventory, exposure, and commercial needs that differ from one owner listing or an individual agent membership.
- Developer License is quotation-based according to the project and must never be presented as a standard “Developer Package”.

OBJECTION HANDLING:
- Treat hesitation as a request for clarity, not an automatic rejection.
- Acknowledge the concern, answer it factually, connect the answer to the customer's need, and ask one useful question only when it helps reveal the real objection.
- Do not argue with customers or attack competitors.
- Do not immediately offer a discount.
- Never invent a promotion, trial, discount, refund term, upgrade credit, downgrade term, team-access rule, or bulk-upload capability.

COMPARISON METHOD:
1. Identify what matters to the customer.
2. Compare only factual differences.
3. Recommend the option that fits.
4. Explain the reason.
5. Give one clear next step.
- Never call Tetamo “the best” or claim superiority without factual support.

CLOSING SIGNALS:
- Treat “Bagaimana cara daftar?”, “Saya pilih Silver/Gold/Agent Pro”, “Saya mau mulai”, “Bisa bayar sekarang?”, “Kirim link pembayaran”, “How do I join?”, “Where do I pay?”, and equivalent messages as buying signals.
- When a buying signal appears, stop unnecessary qualification.
- Confirm the selected option, give the exact registration/payment steps, share only the relevant link, and guide the customer to complete the action.
- Do not keep asking discovery questions after the customer is ready to buy.

APPROVED CLOSING STYLES:
- Recommendation close: state which package fits and why.
- Choice close: compare only two relevant choices and ask which fits their need.
- Next-step close: explain exactly how to register, select the package, and pay.
- Value close: connect the annual price to the capacity and tools received.
- Soft close: allow the customer to review while clearly stating the most suitable option.
- Human-follow-up close: for agency, developer, bulk, or custom commercial needs, collect essential details and route to the Tetamo team.

WHEN TO CONTINUE SELLING:
- Continue when the customer is asking questions, comparing, raising an objection, sharing their business situation, asking about features, or showing interest.
- Keep the conversation useful and personalised. Do not force a close in every message.

WHEN TO STOP SELLING:
- Stop pushing when the customer clearly says no, asks to stop, is angry about sales pressure, only needs support, or the matter requires account-specific/admin investigation.
- Respect “not interested” and “stop promotion” immediately.
- For payment, refund, verification, complaint, account, legal, custom proposal, media, or unreadable-message handover, follow the webhook handover rules.

PROHIBITED PROMISES:
- Never guarantee leads, sales, rentals, ROI, income, agent success, exact timelines, legal safety, buyers, renters, investors, or performance numbers.
- Never say a customer will definitely earn money or become successful.
- Never invent scarcity, fake deadlines, fake customer demand, fake testimonials, or fake discounts.
- Never promise that Mona or Tetamo will send, upload, call, approve, refund, verify, activate, or complete something later unless that action is actually supported by the system or assigned to the Tetamo team.

TWO-MESSAGE RULE:
- The introductory Tetamo explanation and the customer-type qualification question must be sent as two separate WhatsApp messages.
- Do not split ordinary answers unnecessarily.
`.trim();

const SALES_PLAYBOOK_ENTRIES: SalesPlaybookEntry[] = [
  {
    id: "check_first",
    category: "objection",
    topic: "Customer wants to check or review first",
    patterns: [
      "saya lihat dulu",
      "saya cek dulu",
      "saya pelajari dulu",
      "nanti saya lihat",
      "i will check first",
      "i'll check first",
      "let me check",
      "let me review",
    ],
    approvedGuidance: `Acknowledge without pressure. Indonesian approved direction: “Tentu, silakan dipelajari dulu 😊 Supaya saya bisa membantu lebih tepat, bagian mana yang paling ingin Anda bandingkan—harga, jumlah listing, fitur, atau peluang visibilitas?” English equivalent: “Of course, take your time to review it. Which part would you most like to compare—price, listing capacity, features, or visibility?”`,
  },
  {
    id: "ask_someone_first",
    category: "objection",
    topic: "Customer needs approval from boss, partner, spouse, or team",
    patterns: [
      "saya tanya dulu",
      "tanya bos dulu",
      "diskusi dengan partner",
      "tanya suami",
      "tanya istri",
      "perlu approval",
      "ask my boss",
      "ask my manager",
      "discuss with my partner",
      "discuss with my team",
    ],
    approvedGuidance: `Give a short shareable summary relevant to the customer type, then ask what the decision-maker mainly needs to consider: price, listing capacity, or features. Do not pressure.`,
  },
  {
    id: "not_ready",
    category: "objection",
    topic: "Customer is not ready yet",
    patterns: [
      "belum sekarang",
      "nanti dulu",
      "belum siap",
      "maybe later",
      "not ready",
      "not yet",
    ],
    approvedGuidance: `Reply calmly and discover the reason with one question. Approved Indonesian direction: “Tidak masalah. Apakah Anda belum siap karena listing atau fotonya belum tersedia, budget belum siap, atau masih mempertimbangkan paketnya?”`,
  },
  {
    id: "send_information",
    category: "closing",
    topic: "Customer asks for details, brochure, proposal, or pricelist",
    patterns: [
      "kirim detail",
      "kirim pricelist",
      "kirim informasi",
      "ada brochure",
      "ada brosur",
      "send details",
      "send pricelist",
      "send information",
      "brochure",
    ],
    approvedGuidance: `Use the remembered customer type and send only the relevant category summary and relevant approved link. Do not send every package and every link.`,
  },
  {
    id: "contact_later",
    category: "objection",
    topic: "Customer says they will contact Tetamo later",
    patterns: [
      "saya hubungi nanti",
      "nanti saya kontak",
      "i will contact later",
      "i'll contact you later",
      "get back to you",
    ],
    approvedGuidance: `Respect the delay and offer one concise clarification opportunity. Do not chase or pressure. Approved direction: ask whether one point remains unclear about the price, package, or process.`,
  },
  {
    id: "legitimacy",
    category: "trust",
    topic: "Customer asks whether Tetamo is legitimate or registered",
    patterns: [
      "tetamo resmi",
      "legal nggak",
      "legal gak",
      "penipuan",
      "scam",
      "legitimate",
      "registered company",
      "abn",
    ],
    approvedGuidance: `State that Tetamo operates under Tetamo Pty Ltd, is based in Australia with a company presence and office in Sydney, New South Wales, and is registered under ABN 18 689 780 970. Tetamo serves Indonesia digitally through its website and app. Do not provide legal advice.`,
  },
  {
    id: "australian_company",
    category: "trust",
    topic: "Why an Australian company serves Indonesia",
    patterns: [
      "kenapa australia",
      "perusahaan australia",
      "bukan perusahaan indonesia",
      "why australia",
      "australian company",
      "serve indonesia",
    ],
    approvedGuidance: `Explain simply that Tetamo is an Australian-based technology and online marketplace company providing digital services for Indonesia's property market through its website and app.`,
  },
  {
    id: "payment_safety",
    category: "trust",
    topic: "Customer asks whether payment is safe",
    patterns: [
      "pembayaran aman",
      "bayar aman",
      "qris aman",
      "payment safe",
      "safe to pay",
    ],
    approvedGuidance: `Explain that payment is completed through the Tetamo QRIS checkout and scanned using a banking or e-wallet app that supports QRIS. Do not invent a guarantee or certification.`,
  },
  {
    id: "privacy",
    category: "trust",
    topic: "Customer asks about privacy or use of property information",
    patterns: [
      "data saya",
      "privasi",
      "misuse",
      "property information",
      "privacy",
      "personal data",
    ],
    approvedGuidance: `Explain that listing and account information is used to provide and display the Tetamo service according to Tetamo's policy. Share ${TETAMO_LINKS.privacyPolicy} when relevant. Do not make legal guarantees.`,
  },
  {
    id: "too_expensive",
    category: "objection",
    topic: "Customer says the package is expensive",
    patterns: [
      "mahal",
      "kemahalan",
      "terlalu mahal",
      "too expensive",
      "expensive",
      "costly",
    ],
    approvedGuidance: `Do not argue. Connect the price to the 1-year value, listing capacity, profile, direct WhatsApp enquiry, leads dashboard, viewing schedule, and relevant package features. Ask the customer's listing count so Mona can recommend the most efficient package rather than overselling.`,
  },
  {
    id: "cheaper_package",
    category: "objection",
    topic: "Customer asks for a cheaper package",
    patterns: [
      "paket lebih murah",
      "yang paling murah",
      "ada murah",
      "cheaper package",
      "cheapest",
      "lower price",
    ],
    approvedGuidance: `Recommend the lowest official option that genuinely fits the customer's role and capacity. For an agent with up to 30 listings, Silver is the lowest agent membership at Rp499.000 for 1 year. Never invent a cheaper package.`,
  },
  {
    id: "discount",
    category: "objection",
    topic: "Customer requests a discount",
    patterns: [
      "diskon",
      "discount",
      "harga khusus",
      "nego",
      "negotiable",
      "promo",
    ],
    approvedGuidance: `Use only a confirmed current promotion. When no promotion is included in the approved information, say Mona can only provide the official price shown on the pricelist and must not promise an unconfirmed discount.`,
  },
  {
    id: "monthly_payment",
    category: "comparison",
    topic: "Monthly versus yearly payment",
    patterns: [
      "bayar bulanan",
      "per bulan",
      "monthly",
      "yearly",
      "tahunan atau bulanan",
    ],
    approvedGuidance: `Silver and Gold use yearly payment. Agent Pro is Rp3.999.000 per year or Rp399.000 per month with a 12-month commitment. Explain that yearly is practical for one completed annual payment, while Agent Pro monthly can reduce the immediate monthly payment but still has a 12-month commitment. Share ${TETAMO_LINKS.pricelist}.`,
  },
  {
    id: "free_trial",
    category: "policy",
    topic: "Customer asks to try Tetamo for free",
    patterns: [
      "coba gratis",
      "free trial",
      "trial gratis",
      "try for free",
      "gratis dulu",
    ],
    approvedGuidance: `Approved answer: Tetamo's free-trial period has ended. Owners can select an owner listing and agents can select a membership based on their needs. Offer to recommend the most suitable option based on the number of properties they plan to list. Share ${TETAMO_LINKS.pricelist}.`,
  },
  {
    id: "pay_before_leads",
    category: "objection",
    topic: "Why pay before receiving leads",
    patterns: [
      "bayar sebelum dapat leads",
      "kenapa bayar dulu",
      "pay before leads",
      "pay before enquiry",
    ],
    approvedGuidance: `Explain that the listing or membership fee pays for access to Tetamo's services and tools, not a guaranteed number of leads. Explain the value positively before stating that leads are not guaranteed.`,
  },
  {
    id: "what_do_i_get",
    category: "value",
    topic: "Customer asks what is included",
    patterns: [
      "dapat apa",
      "apa yang saya dapat",
      "what do i get",
      "what is included",
      "benefit",
      "manfaat",
    ],
    approvedGuidance: `Answer according to the remembered customer type. Agent: capacity, profile, direct WhatsApp enquiry, leads dashboard, viewing schedule, and package-specific tools. Owner: structured listing, photos, video, bilingual descriptions, currencies, direct contact, viewing, and package visibility.`,
  },
  {
    id: "social_media_self",
    category: "comparison",
    topic: "Tetamo versus advertising on social media",
    patterns: [
      "instagram sendiri",
      "facebook sendiri",
      "social media sendiri",
      "iklan di instagram",
      "advertise on instagram",
      "advertise on facebook",
      "social media",
    ],
    approvedGuidance: `Explain that social media remains useful but posts can move quickly and property information may be scattered. Tetamo provides a structured property page with details, photos, video, bilingual descriptions, currencies, direct WhatsApp enquiry, and schedule viewing. The Tetamo listing link can also be shared back to social media. Recommend using Tetamo and social media together.`,
  },
  {
    id: "another_portal",
    category: "comparison",
    topic: "Tetamo versus another property portal",
    patterns: [
      "portal lain",
      "platform lain",
      "property portal",
      "another portal",
      "competitor",
      "rumah123",
      "lamudi",
      "olx",
    ],
    approvedGuidance: `Do not attack another portal. Explain Tetamo's factual focus: structured listing information, direct WhatsApp contact, schedule viewing, photos, video, bilingual descriptions, currencies, and dashboard tools. Explain that agents can use multiple channels. Ask which factor matters most: capacity, branding, leads management, or visibility.`,
  },
  {
    id: "what_makes_tetamo_different",
    category: "comparison",
    topic: "What makes Tetamo different",
    patterns: [
      "apa bedanya tetamo",
      "kenapa tetamo",
      "what makes tetamo different",
      "difference tetamo",
      "why tetamo",
    ],
    approvedGuidance: `Focus on clearer presentation, bilingual content, multiple currencies, direct WhatsApp contact, schedule viewing, photos and video, Generate AI, agent profile, dashboard, sharing, marketplace, app visibility, and relevant social promotion. Never claim unsupported superiority.`,
  },
  {
    id: "will_get_leads",
    category: "objection",
    topic: "Customer asks whether they will get leads",
    patterns: [
      "bisa dapat leads",
      "akan dapat leads",
      "will i get leads",
      "get enquiries",
      "dapat inquiry",
      "dapat enquiry",
    ],
    approvedGuidance: `Explain positively that Tetamo helps listings appear complete, professional, and easy to contact through WhatsApp and schedule viewing, creating better enquiry opportunities. Then state clearly that Tetamo cannot guarantee a specific number of leads.`,
  },
  {
    id: "how_many_leads",
    category: "objection",
    topic: "Customer asks for a guaranteed lead number",
    patterns: [
      "berapa leads",
      "how many leads",
      "jumlah leads",
      "guaranteed leads",
    ],
    approvedGuidance: `Do not provide a number. Explain that results depend on property, price, location, listing quality, demand, and promotion. Tetamo does not guarantee a fixed lead count.`,
  },
  {
    id: "guaranteed_sale_rent",
    category: "objection",
    topic: "Customer asks whether property will definitely sell or rent",
    patterns: [
      "pasti terjual",
      "pasti tersewa",
      "guarantee sale",
      "guaranteed rental",
      "definitely sell",
      "definitely rent",
    ],
    approvedGuidance: `Explain that no platform can guarantee a sale or rental. Tetamo supports presentation, discovery, direct contact, and viewing flow so the property is easier to understand and act on.`,
  },
  {
    id: "how_long_results",
    category: "objection",
    topic: "Customer asks how long a sale, rental, or lead will take",
    patterns: [
      "berapa lama",
      "kapan laku",
      "how long",
      "when will it sell",
      "when get leads",
    ],
    approvedGuidance: `Do not invent a timeline. Explain that timing depends on location, price, property condition, market demand, listing quality, and promotion.`,
  },
  {
    id: "new_agent",
    category: "qualification",
    topic: "Customer is a new agent",
    patterns: [
      "agen baru",
      "agent baru",
      "baru jadi agen",
      "new agent",
      "just started",
    ],
    approvedGuidance: `Encourage without guaranteeing success. Explain that Silver is designed for a new or growing agent with up to 30 active listings, but ask the expected listing count before final recommendation when it is unknown.`,
  },
  {
    id: "few_listings",
    category: "qualification",
    topic: "Agent has only a few listings",
    patterns: [
      "sedikit listing",
      "cuma beberapa listing",
      "only a few listings",
      "few properties",
    ],
    approvedGuidance: `Explain that the customer does not need an oversized package. Silver provides room for up to 30 active listings for 1 year and allows the agent to grow.`,
  },
  {
    id: "more_than_30",
    category: "qualification",
    topic: "Agent manages more than 30 listings",
    patterns: [
      "lebih dari 30",
      "31 listing",
      "50 listing",
      "60 listing",
      "more than 30",
      "over 30 listings",
    ],
    approvedGuidance: `Recommend Gold when the stated inventory is 31–100. Explain the 100-listing capacity and branding/visibility additions. If over 100, recommend Agent Pro.`,
  },
  {
    id: "agency",
    category: "qualification",
    topic: "Customer runs an agency",
    patterns: [
      "saya punya agency",
      "saya punya agensi",
      "kantor agen",
      "run an agency",
      "own an agency",
      "real estate agency",
    ],
    approvedGuidance: `Approved answer: agency needs must be discussed with Tetamo because team size and inventory differ from an individual agent account. Share ${TETAMO_LINKS.developerLicense}. Ask approximately how many agents and active listings the agency manages. Route serious commercial follow-up to the Tetamo team.`,
  },
  {
    id: "bulk_upload",
    category: "policy",
    topic: "Bulk listing or bulk upload",
    patterns: [
      "bulk listing",
      "bulk upload",
      "upload banyak sekaligus",
      "mass upload",
    ],
    approvedGuidance: `Do not promise that bulk upload is available. Treat it as a custom commercial requirement and route it to the Tetamo team after collecting the approximate inventory size.`,
  },
  {
    id: "upload_for_me",
    category: "policy",
    topic: "Customer asks Tetamo to upload the listing",
    patterns: [
      "upload untuk saya",
      "tetamo upload",
      "buatkan listing",
      "can tetamo upload",
      "upload everything for me",
      "list it for me",
    ],
    approvedGuidance: `State that listings must be created and managed through the customer's own Tetamo account so they control details, enquiries, viewing, changes, and payments. Do not offer WhatsApp upload.`,
  },
  {
    id: "cancel_anytime",
    category: "policy",
    topic: "Customer asks whether they can cancel anytime",
    patterns: [
      "bisa cancel",
      "bisa batal",
      "cancel anytime",
      "cancel membership",
      "batalkan membership",
    ],
    approvedGuidance: `Approved answer: Yes, the customer can cancel the membership at any time. Cancellation, payment, and service conditions remain subject to Tetamo's Subscription Policy. Share ${TETAMO_LINKS.subscriptionPolicy}.`,
  },
  {
    id: "membership_expiry",
    category: "policy",
    topic: "What happens when membership expires",
    patterns: [
      "membership habis",
      "membership berakhir",
      "paket habis",
      "when membership expires",
      "membership expiry",
    ],
    approvedGuidance: `Approved answer: when membership expires, listings covered by that membership become inactive and dashboard access changes according to account status. The customer must renew or select a new package to reactivate capacity and membership features.`,
  },
  {
    id: "upgrade_later",
    category: "policy",
    topic: "Customer asks whether they can upgrade later",
    patterns: [
      "upgrade nanti",
      "bisa upgrade",
      "upgrade later",
      "change package later",
    ],
    approvedGuidance: `Approved answer: Yes, the customer can upgrade later when listing volume or business needs increase. Example: start with Silver and upgrade when larger capacity or stronger branding and visibility are needed. Do not invent how prior payments are credited.`,
  },
  {
    id: "downgrade",
    category: "policy",
    topic: "Customer asks to downgrade",
    patterns: [
      "downgrade",
      "turun paket",
      "ganti ke paket lebih rendah",
    ],
    approvedGuidance: `Do not invent downgrade timing, credits, or refunds. Share ${TETAMO_LINKS.subscriptionPolicy} and route account-specific downgrade questions to the Tetamo team.`,
  },
  {
    id: "membership_transfer",
    category: "policy",
    topic: "Customer asks to transfer membership",
    patterns: [
      "transfer membership",
      "pindah membership",
      "alih akun",
      "transfer to another agent",
    ],
    approvedGuidance: `Approved answer: No. Tetamo membership cannot be transferred to another agent because it is connected to the registered agent's account, profile, and information.`,
  },
  {
    id: "commission",
    category: "policy",
    topic: "Customer asks whether Tetamo takes commission",
    patterns: [
      "ambil komisi",
      "potong komisi",
      "does tetamo take commission",
      "commission fee",
      "komisi tetamo",
    ],
    approvedGuidance: `Approved answer: No. Tetamo does not take commission from property sales or rentals. Tetamo is a property marketplace platform. Owners pay according to their selected listing, while agents join through an agent membership.`,
  },
  {
    id: "successful_agent",
    category: "value",
    topic: "Customer asks whether Tetamo guarantees agent success",
    patterns: [
      "jamin sukses",
      "jadi agen sukses",
      "successful agent",
      "guarantee success",
    ],
    approvedGuidance: `Use this approved message faithfully and warmly: “Tidak ada seorang pun yang dapat menjamin apakah seseorang akan menjadi agen yang sukses. Namun, ketika Anda memiliki tools yang tepat, profesionalisme, visibility, pengelolaan yang baik dan platform yang membantu properti Anda mendapatkan exposure, Anda memiliki dukungan yang lebih kuat untuk berkembang. Kesuksesan adalah kombinasi dari kerja keras, motivasi, disiplin, kepercayaan pada diri sendiri, tools yang tepat dan pengelolaan yang baik. Jangan lupa juga untuk banyak berdoa. Bersama Tuhan, tidak ada yang mustahil.” English equivalent must retain the prayer and “With God, nothing is impossible.” Never turn this into a financial guarantee.`,
  },
  {
    id: "one_property",
    category: "qualification",
    topic: "Owner has only one property",
    patterns: [
      "cuma satu properti",
      "hanya satu rumah",
      "only one property",
      "one property",
    ],
    approvedGuidance: `Recommend an Owner Listing, not an agent membership. Explain that the owner can choose Basic, Priority, or Featured according to desired visibility.`,
  },
  {
    id: "poor_photos",
    category: "objection",
    topic: "Customer does not have good photos",
    patterns: [
      "foto kurang bagus",
      "tidak punya foto bagus",
      "fotonya jelek",
      "do not have good photos",
      "bad photos",
    ],
    approvedGuidance: `Approved answer: that is okay as long as the customer has at least 3 sufficiently clear property photos. Recommend using the clearest and brightest photos so buyers or renters can understand the property.`,
  },
  {
    id: "description_help",
    category: "objection",
    topic: "Customer cannot write the property description",
    patterns: [
      "tidak bisa tulis deskripsi",
      "bingung deskripsi",
      "buat deskripsi",
      "cannot write description",
      "do not know how to write",
    ],
    approvedGuidance: `Approved answer: after entering the property data, click Generate AI. Tetamo AI creates the title and description based on the information already entered. The customer only needs to review it before publishing.`,
  },
  {
    id: "not_tech_savvy",
    category: "objection",
    topic: "Customer is not good with technology",
    patterns: [
      "tidak ngerti teknologi",
      "gaptek",
      "tidak tech savvy",
      "not good with technology",
      "not tech savvy",
    ],
    approvedGuidance: `Approved direction: reassure them that many owners and agents are not tech-savvy and they are not alone. Explain that Tetamo works step by step. Share ${TETAMO_LINKS.howToPostVideo} and/or ${TETAMO_LINKS.howToListBlog}, but avoid sending unnecessary links.`,
  },
  {
    id: "why_verify",
    category: "value",
    topic: "Customer asks why verification matters",
    patterns: [
      "kenapa verifikasi",
      "perlu verifikasi",
      "why verify",
      "verification benefit",
    ],
    approvedGuidance: `Explain that owner verification is optional and can add a verification status or trust indicator. Clearly state that verification is not a legal guarantee of ownership, transaction safety, or property legality.`,
  },
  {
    id: "free_elsewhere",
    category: "comparison",
    topic: "Why pay when advertising is free elsewhere",
    patterns: [
      "gratis di tempat lain",
      "post gratis",
      "iklan gratis",
      "free elsewhere",
      "advertise for free",
      "why should i pay",
    ],
    approvedGuidance: `Approved answer substance: Tetamo provides more than advertising space. It structures photos, video, price, location, facilities, bilingual descriptions, multiple currencies, direct WhatsApp contact, and schedule viewing. Tetamo also helps promote property through Tetamo social-media platforms for local and international exposure and wider lead/enquiry opportunities according to the selected service. Do not guarantee leads or transactions.`,
  },
  {
    id: "owner_package_choice",
    category: "qualification",
    topic: "Which owner listing is best",
    patterns: [
      "owner listing terbaik",
      "basic priority featured",
      "which owner package",
      "which listing is best",
    ],
    approvedGuidance: `Ask whether the customer needs a standard affordable listing, higher visibility, or the strongest featured exposure. Then recommend Basic, Priority, or Featured and explain why.`,
  },
  {
    id: "developer_license_reason",
    category: "value",
    topic: "Why a Developer License is needed",
    patterns: [
      "kenapa developer license",
      "why developer license",
      "butuh developer license",
    ],
    approvedGuidance: `Explain that Developer License is designed for project, inventory, and exposure needs that differ from one owner listing or an individual agent membership.`,
  },
  {
    id: "friend_agent_account",
    category: "policy",
    topic: "Customer asks whether they can use an agent friend's account",
    patterns: [
      "pakai akun teman",
      "akun agent teman",
      "akun agen teman",
      "friend's agent account",
      "use my friend account",
    ],
    approvedGuidance: `Approved answer: the customer may ask an agent friend who already has a Tetamo account to list the property, provided the agent agrees. The listing will show the registered agent's profile, WhatsApp number, and email, so buyers or renters will contact the agent friend rather than the owner directly. Enquiry handling and any arrangement must be discussed with that agent.`,
  },
  {
    id: "developer_price",
    category: "closing",
    topic: "Customer asks the price of Developer License",
    patterns: [
      "harga developer license",
      "developer license berapa",
      "developer price",
      "how much developer license",
    ],
    approvedGuidance: `Explain that Developer License is quotation-based according to project needs, inventory, and exposure. Ask one useful detail such as project name, location, and approximate unit count, then route to the Tetamo team.`,
  },
  {
    id: "developer_proposal",
    category: "closing",
    topic: "Customer asks for a developer or agency proposal",
    patterns: [
      "kirim proposal",
      "proposal developer",
      "send proposal",
      "custom proposal",
      "quotation",
      "penawaran",
    ],
    approvedGuidance: `Collect only the essential details one at a time: name, company, project, location, unit count, launch status, and contact details. Then route the opportunity to the Tetamo team. Never invent a proposal or quotation.`,
  },
  {
    id: "guaranteed_buyers",
    category: "objection",
    topic: "Developer asks for guaranteed buyers or investors",
    patterns: [
      "jamin pembeli",
      "jamin investor",
      "guaranteed buyers",
      "guaranteed investors",
    ],
    approvedGuidance: `Do not guarantee buyers or investors. Explain the structured project presentation, marketplace exposure, direct enquiry path, and relevant promotional support.`,
  },
  {
    id: "own_website",
    category: "comparison",
    topic: "Tetamo marketplace versus a personal or project website",
    patterns: [
      "sudah punya website",
      "website sendiri",
      "own website",
      "personal website",
      "project website",
    ],
    approvedGuidance: `Explain that a personal/project website supports the customer's own brand, while Tetamo adds a marketplace discovery and enquiry channel. The customer can use both and share Tetamo listing links through the website and social media.`,
  },
  {
    id: "silver_vs_gold",
    category: "comparison",
    topic: "Silver versus Gold",
    patterns: [
      "silver vs gold",
      "silver atau gold",
      "beda silver gold",
      "bedanya silver dan gold",
      "perbedaan silver dan gold",
      "difference silver gold",
    ],
    approvedGuidance: `Silver: up to 30 active listings for 1 year at Rp499.000. Gold: up to 100 active listings for 1 year at Rp1.800.000, including 1 AI Avatar Introduction Video and 3 Featured Listings for 90 days each. Recommend Silver for up to 30 listings; recommend Gold for 31–100 or when stronger branding/visibility is needed. Ask listing count only if not already known.`,
  },
  {
    id: "gold_vs_agent_pro",
    category: "comparison",
    topic: "Gold versus Agent Pro",
    patterns: [
      "gold vs agent pro",
      "gold atau agent pro",
      "beda gold agent pro",
      "bedanya gold dan agent pro",
      "perbedaan gold dan agent pro",
      "difference gold agent pro",
    ],
    approvedGuidance: `Gold: up to 100 active listings at Rp1.800.000/year. Agent Pro: up to 500 active listings at Rp3.999.000/year or Rp399.000/month with a 12-month commitment, including premium exposure opportunities and Featured Agent eligibility. Recommend according to inventory and business scale.`,
  },
  {
    id: "owner_vs_agent",
    category: "comparison",
    topic: "Owner listing versus agent membership",
    patterns: [
      "owner atau agent",
      "listing owner atau membership",
      "owner listing vs agent",
      "bedanya owner listing dan agent membership",
      "owner or agent account",
    ],
    approvedGuidance: `Owner Listing is for advertising the customer's own property. Agent Membership is for an agent managing multiple properties for clients and includes the agent profile and management tools. Ask whether the properties belong to the customer or to multiple clients when unclear.`,
  },
  {
    id: "basic_priority_featured",
    category: "comparison",
    topic: "Basic versus Priority versus Featured",
    patterns: [
      "basic vs priority",
      "priority vs featured",
      "basic priority featured",
      "beda basic priority featured",
      "bedanya basic priority dan featured",
      "perbedaan basic priority featured",
    ],
    approvedGuidance: `All are one-property owner listings for 1 year. Basic Rp50.000 for standard listing. Priority Rp150.000 for higher visibility. Featured Rp550.000 for strongest exposure, Featured Badge, social-media posting, and Tetamo Agent Support. Recommend based on desired exposure.`,
  },
  {
    id: "agent_vs_developer",
    category: "comparison",
    topic: "Agent membership versus Developer License",
    patterns: [
      "agent atau developer",
      "membership agent vs developer",
      "agent membership developer license",
      "bedanya agent membership dan developer license",
    ],
    approvedGuidance: `Agent Membership is for an individual agent managing listings through an agent profile and dashboard. Developer License is for developer/project/company inventory and custom exposure. Do not describe Developer License as a standard package.`,
  },
  {
    id: "direct_whatsapp_vs_platform",
    category: "comparison",
    topic: "Direct WhatsApp enquiry versus platform messaging",
    patterns: [
      "whatsapp langsung",
      "platform messaging",
      "chat platform",
      "direct whatsapp",
    ],
    approvedGuidance: `Explain that direct WhatsApp lets buyers or renters contact the registered owner or agent through a familiar app, while Tetamo structures the listing and can support enquiry/activity management through the dashboard where available. Remind the customer to keep the registered WhatsApp number active.`,
  },
  {
    id: "verified_vs_unverified",
    category: "comparison",
    topic: "Verified versus unverified listing",
    patterns: [
      "verified vs unverified",
      "verified atau tidak",
      "listing verified",
      "beda verified",
    ],
    approvedGuidance: `Explain that verified status shows completion of Tetamo's available verification process and can add a trust indicator. It is not a guarantee of legal ownership, transaction safety, or property legality. Owner verification remains optional.`,
  },
  {
    id: "ready_to_join",
    category: "closing",
    topic: "Customer is ready to register, choose, or pay",
    patterns: [
      "cara daftar",
      "saya mau mulai",
      "saya pilih silver",
      "saya pilih gold",
      "saya pilih agent pro",
      "bisa bayar sekarang",
      "kirim link pembayaran",
      "how do i join",
      "i want to join",
      "where do i pay",
      "send payment link",
    ],
    approvedGuidance: `Stop unnecessary qualification. Confirm the selected option when known. Direct an agent to sign up/log in as Agent, choose the package, and pay by QRIS. Direct an owner to create the listing and complete its QRIS payment. Share ${TETAMO_LINKS.pricelist} when relevant.`,
  },
];

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


function normalizeIntentText(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getCustomerOnlyConversationText(conversationContext?: string | null) {
  return String(conversationContext || "")
    .split("\n")
    .filter((line) => line.trim().toLowerCase().startsWith("customer:"))
    .map((line) => line.replace(/^customer:\s*/i, "").trim())
    .filter(Boolean)
    .join("\n");
}

function containsPattern(text: string, patterns: readonly string[]) {
  const normalized = normalizeIntentText(text);
  return patterns.some((pattern) =>
    normalized.includes(normalizeIntentText(pattern))
  );
}

function detectCustomerType(
  customerMessage: string,
  conversationContext?: string | null
): CustomerType {
  const current = normalizeIntentText(customerMessage);
  const customerHistoryLines = String(
    getCustomerOnlyConversationText(conversationContext)
  )
    .split("\n")
    .map((line) => normalizeIntentText(line))
    .filter(Boolean)
    .reverse();

  const classifyStrongIdentity = (value: string): CustomerType => {
    if (/^(agency|agensi)$/i.test(value)) return "agency";
    if (/^(developer|project owner|pemilik project|pemilik proyek)$/i.test(value)) {
      return "developer";
    }
    if (/^(agen|agent|broker|property consultant)$/i.test(value)) return "agent";
    if (/^(owner|pemilik)$/i.test(value)) return "owner";
    if (/^(buyer|renter|pembeli|penyewa)$/i.test(value)) {
      return "buyer_renter";
    }

    if (
      containsPattern(value, [
        "saya punya agency",
        "saya punya agensi",
        "kami agency",
        "kami agensi",
        "saya dari agency",
        "i run an agency",
        "i own an agency",
        "we are an agency",
        "our agency",
      ])
    ) {
      return "agency";
    }

    if (
      containsPattern(value, [
        "saya developer",
        "kami developer",
        "saya project owner",
        "saya pemilik project",
        "saya pemilik proyek",
        "i am a developer",
        "we are a developer",
        "i am a project owner",
        "our development project",
      ])
    ) {
      return "developer";
    }

    if (
      containsPattern(value, [
        "saya agen",
        "saya agent",
        "aku agen",
        "aku agent",
        "kami agen",
        "i am an agent",
        "i'm an agent",
        "as an agent",
        "property consultant saya",
      ])
    ) {
      return "agent";
    }

    if (
      containsPattern(value, [
        "saya owner",
        "saya pemilik",
        "aku pemilik",
        "properti saya",
        "rumah saya",
        "villa saya",
        "tanah saya",
        "i am an owner",
        "i'm an owner",
        "my property",
        "my house",
        "my villa",
        "my land",
      ])
    ) {
      return "owner";
    }

    if (
      containsPattern(value, [
        "saya pembeli",
        "saya penyewa",
        "mau beli properti",
        "ingin beli properti",
        "mau sewa properti",
        "ingin sewa properti",
        "i am a buyer",
        "i am a renter",
        "i want to buy",
        "i want to rent",
        "looking for property",
      ])
    ) {
      return "buyer_renter";
    }

    return "unknown";
  };

  const classifyCommercialIntent = (value: string): CustomerType => {
    if (
      containsPattern(value, [
        "agency account",
        "agency package",
        "kebutuhan agency",
        "akun agency",
        "kantor agen saya",
      ])
    ) {
      return "agency";
    }

    if (
      containsPattern(value, [
        "developer license",
        "harga developer",
        "iklan project",
        "iklan proyek",
        "promosi project",
        "promosi proyek",
        "project perumahan",
        "proyek perumahan",
      ])
    ) {
      return "developer";
    }

    if (
      containsPattern(value, [
        "paket agen",
        "membership agen",
        "agent package",
        "agent membership",
        "daftar agen",
        "join as agent",
      ])
    ) {
      return "agent";
    }

    if (
      containsPattern(value, [
        "paket owner",
        "paket pemilik",
        "owner listing",
        "listing pemilik",
        "iklan properti sendiri",
      ])
    ) {
      return "owner";
    }

    if (
      containsPattern(value, [
        "cari properti",
        "mencari properti",
        "property search",
        "find property",
        "buy property",
        "rent property",
      ])
    ) {
      return "buyer_renter";
    }

    return "unknown";
  };

  const strongCurrent = classifyStrongIdentity(current);
  if (strongCurrent !== "unknown") return strongCurrent;

  const isComparison =
    /\b(vs|versus|compare|comparison|difference)\b/i.test(current) ||
    current.includes("bedanya") ||
    current.includes("beda ") ||
    current.includes(" atau ");

  if (!isComparison) {
    const currentIntent = classifyCommercialIntent(current);
    if (currentIntent !== "unknown") return currentIntent;
  }

  for (const historyLine of customerHistoryLines) {
    const strongHistory = classifyStrongIdentity(historyLine);
    if (strongHistory !== "unknown") return strongHistory;

    const historyIntent = classifyCommercialIntent(historyLine);
    if (historyIntent !== "unknown") return historyIntent;
  }

  return "unknown";
}

function extractListingCount(
  customerMessage: string,
  conversationContext?: string | null
) {
  const parseCount = (value: string) => {
    const countPatterns = [
      /(?:punya|memiliki|kelola|mengelola|handle|manage|ada|sekitar|around|approximately)?\s*(\d{1,4})\s*(?:listing|properti|property|properties|unit)\b/i,
      /(?:listing|properti|property|properties|unit)\s*(?:saya|kami|yang dikelola|managed)?\s*(?:ada|sekitar|around|approximately|:)?\s*(\d{1,4})\b/i,
    ];

    for (const pattern of countPatterns) {
      const match = value.match(pattern);
      const count = Number(match?.[1] || 0);

      if (Number.isFinite(count) && count > 0) {
        return count;
      }
    }

    return null;
  };

  const currentCount = parseCount(String(customerMessage || ""));
  if (currentCount !== null) return currentCount;

  const current = String(customerMessage || "").trim();
  const askedForCount = /berapa\s+(?:listing|properti)|how many\s+(?:listings|properties)/i.test(
    String(conversationContext || "").slice(-1200)
  );

  if (askedForCount && /^\d{1,4}$/.test(current)) {
    const count = Number(current);
    return count > 0 ? count : null;
  }

  const customerHistoryLines = String(
    getCustomerOnlyConversationText(conversationContext)
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse();

  for (const historyLine of customerHistoryLines) {
    const historicalCount = parseCount(historyLine);
    if (historicalCount !== null) return historicalCount;
  }

  return null;
}

function detectAgentExperience(
  customerMessage: string,
  conversationContext?: string | null
): "new" | "experienced" | null {
  const customerText = normalizeIntentText(
    `${getCustomerOnlyConversationText(conversationContext)}\n${customerMessage}`
  );

  if (
    /^(saya\s+)?(masih\s+)?baru$/i.test(
      normalizeIntentText(customerMessage)
    ) ||
    /^(i\s*(?:am|'m)\s+)?new$/i.test(
      normalizeIntentText(customerMessage)
    ) ||
    containsPattern(customerText, [
      "agen baru",
      "agent baru",
      "baru jadi agen",
      "baru mulai",
      "saya baru",
      "aku baru",
      "masih baru",
      "new agent",
      "i am new",
      "i'm new",
      "just started",
      "beginner agent",
    ])
  ) {
    return "new";
  }

  if (
    containsPattern(customerText, [
      "agen berpengalaman",
      "agent berpengalaman",
      "sudah lama",
      "sudah aktif",
      "experienced agent",
      "active agent",
      "many years",
    ])
  ) {
    return "experienced";
  }

  return null;
}

function detectClosingSignal(message: string) {
  const signals = [
    "cara daftar",
    "bagaimana daftar",
    "saya mau mulai",
    "saya pilih silver",
    "saya pilih gold",
    "saya pilih agent pro",
    "saya ambil silver",
    "saya ambil gold",
    "saya ambil agent pro",
    "bisa bayar sekarang",
    "kirim link pembayaran",
    "link bayar",
    "how do i join",
    "i want to join",
    "i choose silver",
    "i choose gold",
    "i choose agent pro",
    "where do i pay",
    "send payment link",
    "ready to pay",
  ];

  return signals.find((signal) =>
    normalizeIntentText(message).includes(normalizeIntentText(signal))
  ) || null;
}


function getConversationTurns(conversationContext?: string | null) {
  return String(conversationContext || "")
    .split("\n")
    .map((line) => {
      const match = line.match(/^(Customer|Mona|Admin):\s*(.*)$/i);
      if (!match) return null;

      return {
        speaker: match[1].toLowerCase() as "customer" | "mona" | "admin",
        message: String(match[2] || "").trim(),
      };
    })
    .filter(
      (
        item
      ): item is {
        speaker: "customer" | "mona" | "admin";
        message: string;
      } => Boolean(item?.message)
    );
}

const DISCOVERY_QUESTION_PATTERNS: Record<DiscoveryField, readonly string[]> = {
  customer_type: [
    "pemilik properti, agen, developer",
    "property owner, an agent, a developer",
  ],
  agent_experience: [
    "agen baru atau sudah aktif",
    "new agent, or are you already active",
    "new agent or already actively",
  ],
  listing_count: [
    "berapa listing aktif",
    "berapa properti yang ingin",
    "how many active listings",
    "how many properties do you",
  ],
  enquiry_reason: [
    "apa yang membuat anda tertarik",
    "what made you interested",
  ],
  desired_result: [
    "hasil utama apa",
    "tujuan utamanya",
    "main result",
    "what result",
  ],
  property_type: [
    "jenis propert",
    "listing anda biasanya berupa",
    "do you mainly handle",
    "property type",
  ],
  operating_area: [
    "area mana",
    "wilayah mana",
    "kota atau area",
    "which city or area",
    "which area",
  ],
  advertising_channels: [
    "mempromosikan listing melalui",
    "channel apa",
    "how do you currently promote",
    "how do you advertise",
  ],
  current_pain: [
    "bagian apa yang paling terasa sulit",
    "belum berjalan sesuai harapan",
    "what feels most difficult",
    "what is not working",
  ],
  main_priority: [
    "yang paling penting untuk anda",
    "what matters most to you",
  ],
  start_timing: [
    "kapan anda berencana mulai",
    "when are you planning to start",
  ],
  decision_role: [
    "anda yang memutuskan sendiri",
    "will you decide",
    "perlu berdiskusi dengan",
  ],
  other_decision_maker: [
    "siapa lagi yang perlu",
    "who else needs to",
  ],
  remaining_concern: [
    "bagian apa yang masih perlu lebih jelas",
    "apa yang masih membuat anda ragu",
    "what still needs to be clearer",
    "what is still holding you back",
  ],
  sale_or_rent: [
    "ingin dijual atau disewakan",
    "sell or rent out",
  ],
  owner_visibility: [
    "listing standar, visibilitas lebih tinggi",
    "standard listing, higher visibility",
  ],
  project_scope: [
    "satu project, beberapa project",
    "one project, several projects",
  ],
  agency_size: [
    "berapa agen dan berapa listing",
    "how many agents and active listings",
  ],
  buyer_intent: [
    "dibeli atau disewa, dan di area mana",
    "looking to buy or rent, and which area",
  ],
};

function wasDiscoveryQuestionAnswered(params: {
  field: DiscoveryField;
  conversationContext?: string | null;
  currentMessage: string;
}) {
  const turns = getConversationTurns(params.conversationContext);
  const patterns = DISCOVERY_QUESTION_PATTERNS[params.field];
  let latestQuestionIndex = -1;

  turns.forEach((turn, index) => {
    if (turn.speaker === "mona" && containsPattern(turn.message, patterns)) {
      latestQuestionIndex = index;
    }
  });

  if (latestQuestionIndex < 0) return false;

  const answeredInHistory = turns
    .slice(latestQuestionIndex + 1)
    .some((turn) => turn.speaker === "customer" && turn.message.length > 0);

  return answeredInHistory || Boolean(String(params.currentMessage || "").trim());
}

function detectMainPriority(text: string): DiscoveryProfile["mainPriority"] {
  const normalized = normalizeIntentText(text);

  if (
    containsPattern(normalized, [
      "harga",
      "price",
      "murah",
      "budget",
      "biaya",
    ])
  ) {
    return "price";
  }

  if (
    containsPattern(normalized, [
      "kapasitas listing",
      "jumlah listing",
      "banyak listing",
      "listing capacity",
    ])
  ) {
    return "listing_capacity";
  }

  if (
    containsPattern(normalized, [
      "visibility",
      "visibilitas",
      "exposure",
      "lebih terlihat",
      "jangkauan",
    ])
  ) {
    return "visibility";
  }

  if (
    containsPattern(normalized, [
      "branding",
      "brand",
      "profil profesional",
      "professional profile",
    ])
  ) {
    return "branding";
  }

  if (
    containsPattern(normalized, [
      "leads",
      "lead",
      "enquiry",
      "inquiry",
      "calon pembeli",
      "calon penyewa",
    ])
  ) {
    return "enquiries";
  }

  if (
    containsPattern(normalized, [
      "mudah dikelola",
      "pengelolaan",
      "manage listing",
      "management",
      "dashboard",
      "lebih mudah",
    ])
  ) {
    return "management";
  }

  return null;
}

function detectStartTiming(text: string): DiscoveryProfile["startTiming"] {
  const normalized = normalizeIntentText(text);

  if (
    containsPattern(normalized, [
      "mulai sekarang",
      "sekarang juga",
      "hari ini",
      "langsung mulai",
      "start now",
      "today",
      "right now",
    ])
  ) {
    return "now";
  }

  if (
    containsPattern(normalized, [
      "beberapa hari",
      "minggu ini",
      "secepatnya",
      "soon",
      "this week",
      "next few days",
    ])
  ) {
    return "soon";
  }

  if (
    containsPattern(normalized, [
      "bulan depan",
      "nanti",
      "belum sekarang",
      "later",
      "next month",
      "not now",
    ])
  ) {
    return "later";
  }

  if (
    containsPattern(normalized, [
      "masih pertimbangkan",
      "masih mempertimbangkan",
      "lihat dulu",
      "bandingkan dulu",
      "considering",
      "still comparing",
      "review first",
    ])
  ) {
    return "considering";
  }

  return null;
}

function detectDecisionRole(text: string): DiscoveryProfile["decisionRole"] {
  const normalized = normalizeIntentText(text);

  if (
    containsPattern(normalized, [
      "saya sendiri yang memutuskan",
      "saya yang bayar",
      "saya yang putuskan",
      "i decide",
      "i will pay",
      "my decision",
    ])
  ) {
    return "self";
  }

  if (
    containsPattern(normalized, [
      "diskusi dengan partner",
      "diskusi dengan tim",
      "bersama partner",
      "keputusan bersama",
      "discuss with my partner",
      "discuss with my team",
      "joint decision",
    ])
  ) {
    return "shared";
  }

  if (
    containsPattern(normalized, [
      "tanya bos",
      "approval management",
      "atasan yang memutuskan",
      "bos yang bayar",
      "ask my boss",
      "manager decides",
      "not my decision",
    ])
  ) {
    return "other";
  }

  return null;
}

function buildDiscoveryProfile(params: {
  customerMessage: string;
  conversationContext: string | null;
}): DiscoveryProfile {
  const customerText = normalizeIntentText(
    `${getCustomerOnlyConversationText(params.conversationContext)}\n${
      params.customerMessage
    }`
  );
  const answered = (field: DiscoveryField) =>
    wasDiscoveryQuestionAnswered({
      field,
      conversationContext: params.conversationContext,
      currentMessage: params.customerMessage,
    });

  const mainPriority = detectMainPriority(customerText);
  const startTiming = detectStartTiming(customerText);
  const decisionRole = detectDecisionRole(customerText);

  const propertyTypeKnown =
    containsPattern(customerText, [
      "rumah",
      "villa",
      "apartemen",
      "apartment",
      "tanah",
      "land",
      "ruko",
      "warehouse",
      "gudang",
      "hotel",
      "guest house",
      "commercial property",
      "properti komersial",
      "perumahan",
    ]) || answered("property_type");

  const operatingAreaKnown =
    /(?:area|wilayah|lokasi|kota|beroperasi|listing(?:nya)?|properti(?:nya)?)\s+(?:di\s+)?[a-z][a-z\s.'-]{2,40}/i.test(
      customerText
    ) || answered("operating_area");

  const advertisingChannelsKnown =
    containsPattern(customerText, [
      "instagram",
      "facebook",
      "whatsapp status",
      "portal properti",
      "property portal",
      "website sendiri",
      "own website",
      "tiktok",
      "referral",
      "referal",
      "offline",
    ]) || answered("advertising_channels");

  const currentPainKnown =
    containsPattern(customerText, [
      "sulit",
      "susah",
      "tidak bekerja",
      "tidak efektif",
      "kurang leads",
      "sedikit enquiry",
      "postingan tenggelam",
      "ribet",
      "manual",
      "difficult",
      "not working",
      "not effective",
      "few leads",
      "low enquiries",
      "too manual",
    ]) || answered("current_pain");

  const enquiryReasonKnown =
    containsPattern(customerText, [
      "lihat iklan tetamo",
      "melihat iklan tetamo",
      "tertarik dengan tetamo",
      "butuh platform",
      "butuh tempat pasang listing",
      "mencari platform",
      "saw tetamo",
      "saw your ad",
      "need a platform",
      "looking for a platform",
    ]) || answered("enquiry_reason");

  const desiredResultKnown =
    Boolean(mainPriority) ||
    containsPattern(customerText, [
      "ingin jual",
      "ingin menyewakan",
      "mau jual",
      "mau sewa",
      "menambah exposure",
      "mendapatkan leads",
      "bangun branding",
      "kelola listing",
      "sell my property",
      "rent my property",
      "get leads",
      "build my brand",
      "manage listings",
    ]) ||
    answered("desired_result");

  const saleOrRentKnown = containsPattern(customerText, [
    "dijual",
    "jual properti",
    "mau jual",
    "for sale",
    "sell",
    "disewakan",
    "sewa properti",
    "mau sewa",
    "for rent",
    "rent out",
  ]) || answered("sale_or_rent");

  const ownerVisibilityKnown =
    Boolean(mainPriority) ||
    containsPattern(customerText, [
      "basic",
      "priority",
      "featured",
      "listing standar",
      "visibilitas lebih tinggi",
      "exposure paling kuat",
      "standard listing",
      "higher visibility",
      "strongest exposure",
    ]) ||
    answered("owner_visibility");

  const projectScopeKnown =
    containsPattern(customerText, [
      "satu project",
      "beberapa project",
      "seluruh inventory",
      "full inventory",
      "one project",
      "several projects",
    ]) || answered("project_scope");

  const buyerIntentKnown =
    containsPattern(customerText, [
      "mau beli",
      "ingin beli",
      "mau sewa",
      "ingin sewa",
      "looking to buy",
      "looking to rent",
    ]) || answered("buyer_intent");

  const otherDecisionMakerKnown =
    containsPattern(customerText, [
      "bos",
      "atasan",
      "manager",
      "management",
      "partner",
      "suami",
      "istri",
      "tim saya",
      "my team",
      "my spouse",
    ]) || answered("other_decision_maker");

  const remainingConcernKnown =
    containsPattern(customerText, [
      "masih ragu karena",
      "yang saya khawatirkan",
      "concern saya",
      "my concern",
      "holding me back",
      "not sure about",
    ]) || answered("remaining_concern");

  const answerMap: Record<DiscoveryField, boolean> = {
    customer_type: false,
    agent_experience: false,
    listing_count: false,
    enquiry_reason: enquiryReasonKnown,
    desired_result: desiredResultKnown,
    property_type: propertyTypeKnown,
    operating_area: operatingAreaKnown,
    advertising_channels: advertisingChannelsKnown,
    current_pain: currentPainKnown,
    main_priority: Boolean(mainPriority) || answered("main_priority"),
    start_timing: Boolean(startTiming) || answered("start_timing"),
    decision_role: Boolean(decisionRole) || answered("decision_role"),
    other_decision_maker: otherDecisionMakerKnown,
    remaining_concern: remainingConcernKnown,
    sale_or_rent: saleOrRentKnown,
    owner_visibility: ownerVisibilityKnown,
    project_scope: projectScopeKnown,
    agency_size: answered("agency_size"),
    buyer_intent: buyerIntentKnown,
  };

  return {
    enquiryReasonKnown,
    desiredResultKnown,
    propertyTypeKnown,
    operatingAreaKnown,
    advertisingChannelsKnown,
    currentPainKnown,
    mainPriority,
    startTiming,
    decisionRole,
    otherDecisionMakerKnown,
    remainingConcernKnown,
    saleOrRentKnown,
    ownerVisibilityKnown,
    projectScopeKnown,
    buyerIntentKnown,
    answeredFields: (Object.keys(answerMap) as DiscoveryField[]).filter(
      (field) => answerMap[field]
    ),
  };
}

function getDiscoveryQuestion(
  field: DiscoveryField | null,
  language: MonaLanguage
) {
  if (!field) return null;
  return DISCOVERY_QUESTIONS[language][field];
}

function selectNextDiscoveryField(params: {
  customerType: CustomerType;
  listingCount: number | null;
  agentExperience: "new" | "experienced" | null;
  closingSignal: string | null;
  profile: DiscoveryProfile;
  primaryPlaybookEntry: SalesPlaybookEntry | null;
}): { stage: string; field: DiscoveryField | null } {
  if (params.closingSignal) {
    return { stage: "ready_to_close", field: null };
  }

  if (
    params.primaryPlaybookEntry &&
    params.primaryPlaybookEntry.category !== "qualification"
  ) {
    return {
      stage: `handle_${params.primaryPlaybookEntry.category}`,
      field: null,
    };
  }

  if (params.customerType === "unknown") {
    return { stage: "identify_customer_type", field: "customer_type" };
  }

  if (params.customerType === "buyer_renter") {
    if (!params.profile.buyerIntentKnown || !params.profile.operatingAreaKnown) {
      return { stage: "qualify_property_search", field: "buyer_intent" };
    }

    return { stage: "guide_property_search", field: null };
  }

  if (params.customerType === "owner") {
    if (!params.profile.saleOrRentKnown) {
      return { stage: "qualify_owner_intent", field: "sale_or_rent" };
    }
    if (!params.profile.propertyTypeKnown) {
      return { stage: "qualify_owner_property", field: "property_type" };
    }
    if (!params.profile.operatingAreaKnown) {
      return { stage: "qualify_owner_area", field: "operating_area" };
    }
    if (!params.profile.ownerVisibilityKnown) {
      return { stage: "qualify_owner_visibility", field: "owner_visibility" };
    }
    if (!params.profile.startTiming) {
      return { stage: "confirm_start_timing", field: "start_timing" };
    }
    if (
      ["later", "considering"].includes(params.profile.startTiming) &&
      !params.profile.remainingConcernKnown
    ) {
      return { stage: "resolve_remaining_concern", field: "remaining_concern" };
    }

    return { stage: "owner_next_step", field: null };
  }

  if (params.customerType === "agent") {
    if (!params.agentExperience) {
      return { stage: "qualify_agent_experience", field: "agent_experience" };
    }
    if (params.listingCount === null) {
      return { stage: "qualify_listing_count", field: "listing_count" };
    }
    if (!params.profile.desiredResultKnown) {
      return { stage: "discover_desired_result", field: "desired_result" };
    }
    if (!params.profile.mainPriority) {
      return { stage: "discover_main_priority", field: "main_priority" };
    }
    if (!params.profile.propertyTypeKnown) {
      return { stage: "discover_property_type", field: "property_type" };
    }
    if (!params.profile.operatingAreaKnown) {
      return { stage: "discover_operating_area", field: "operating_area" };
    }
    if (!params.profile.advertisingChannelsKnown) {
      return {
        stage: "discover_current_advertising",
        field: "advertising_channels",
      };
    }
    if (!params.profile.currentPainKnown) {
      return { stage: "discover_current_pain", field: "current_pain" };
    }
    if (!params.profile.startTiming) {
      return { stage: "confirm_start_timing", field: "start_timing" };
    }
    if (
      ["now", "soon"].includes(params.profile.startTiming) &&
      !params.profile.decisionRole
    ) {
      return { stage: "confirm_decision_process", field: "decision_role" };
    }
    if (
      ["shared", "other"].includes(params.profile.decisionRole || "") &&
      !params.profile.otherDecisionMakerKnown
    ) {
      return {
        stage: "identify_other_decision_maker",
        field: "other_decision_maker",
      };
    }
    if (
      ["later", "considering"].includes(params.profile.startTiming) &&
      !params.profile.remainingConcernKnown
    ) {
      return { stage: "resolve_remaining_concern", field: "remaining_concern" };
    }

    return { stage: "agent_next_step", field: null };
  }

  if (params.customerType === "agency") {
    if (params.listingCount === null) {
      return { stage: "qualify_agency_size", field: "agency_size" };
    }
    if (!params.profile.desiredResultKnown) {
      return { stage: "discover_desired_result", field: "desired_result" };
    }
    if (!params.profile.operatingAreaKnown) {
      return { stage: "discover_operating_area", field: "operating_area" };
    }
    if (!params.profile.advertisingChannelsKnown) {
      return {
        stage: "discover_current_advertising",
        field: "advertising_channels",
      };
    }
    if (!params.profile.currentPainKnown) {
      return { stage: "discover_current_pain", field: "current_pain" };
    }
    if (!params.profile.startTiming) {
      return { stage: "confirm_start_timing", field: "start_timing" };
    }
    if (!params.profile.decisionRole) {
      return { stage: "confirm_decision_process", field: "decision_role" };
    }

    return { stage: "agency_handover_ready", field: null };
  }

  if (params.customerType === "developer") {
    if (!params.profile.projectScopeKnown) {
      return { stage: "qualify_project_scope", field: "project_scope" };
    }
    if (params.listingCount === null) {
      return { stage: "qualify_project_inventory", field: "listing_count" };
    }
    if (!params.profile.operatingAreaKnown) {
      return { stage: "discover_project_area", field: "operating_area" };
    }
    if (!params.profile.desiredResultKnown) {
      return { stage: "discover_desired_result", field: "desired_result" };
    }
    if (!params.profile.advertisingChannelsKnown) {
      return {
        stage: "discover_current_advertising",
        field: "advertising_channels",
      };
    }
    if (!params.profile.currentPainKnown) {
      return { stage: "discover_current_pain", field: "current_pain" };
    }
    if (!params.profile.startTiming) {
      return { stage: "confirm_start_timing", field: "start_timing" };
    }
    if (!params.profile.decisionRole) {
      return { stage: "confirm_decision_process", field: "decision_role" };
    }

    return { stage: "developer_handover_ready", field: null };
  }

  return { stage: "continue_conversation", field: null };
}

function enforceRequiredDiscoveryQuestion(
  reply: string,
  requiredQuestion: string | null
) {
  const cleanReply = String(reply || "").trim();
  if (!requiredQuestion) return cleanReply;

  const normalizedReply = normalizeIntentText(cleanReply).replace(/\?/g, "");
  const normalizedQuestion = normalizeIntentText(requiredQuestion).replace(
    /\?/g,
    ""
  );

  if (normalizedReply.includes(normalizedQuestion)) {
    return cleanReply;
  }

  const paragraphs = cleanReply
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const lastParagraph = paragraphs[paragraphs.length - 1] || "";

  if (/\?\s*$/.test(lastParagraph) && lastParagraph.length <= 320) {
    paragraphs.pop();
  }

  return [...paragraphs, requiredQuestion].filter(Boolean).join("\n\n");
}

function scoreSalesPlaybookEntry(
  message: string,
  conversationContext: string | null,
  entry: SalesPlaybookEntry
) {
  const current = normalizeIntentText(message);
  const customerHistory = normalizeIntentText(
    getCustomerOnlyConversationText(conversationContext)
  );

  let score = 0;

  for (const pattern of entry.patterns) {
    const normalizedPattern = normalizeIntentText(pattern);

    if (!normalizedPattern) continue;
    if (current === normalizedPattern) score += 20;
    else if (current.includes(normalizedPattern)) score += 12;
    else if (customerHistory.includes(normalizedPattern)) score += 4;
  }

  return score;
}

function selectRelevantSalesPlaybook(
  message: string,
  conversationContext: string | null
) {
  return SALES_PLAYBOOK_ENTRIES.map((entry) => ({
    entry,
    score: scoreSalesPlaybookEntry(message, conversationContext, entry),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((item) => item.entry);
}

function buildSalesContext(params: {
  customerMessage: string;
  conversationContext: string | null;
}): SalesContext {
  const language = detectLanguage(params.customerMessage);
  const customerType = detectCustomerType(
    params.customerMessage,
    params.conversationContext
  );
  const listingCount = extractListingCount(
    params.customerMessage,
    params.conversationContext
  );
  const agentExperience = detectAgentExperience(
    params.customerMessage,
    params.conversationContext
  );
  const closingSignal = detectClosingSignal(params.customerMessage);
  const matchedEntries = selectRelevantSalesPlaybook(
    params.customerMessage,
    params.conversationContext
  );
  const primaryPlaybookEntry = matchedEntries[0] || null;
  const discoveryProfile = buildDiscoveryProfile(params);
  const combined = normalizeIntentText(
    `${getCustomerOnlyConversationText(params.conversationContext)}
${
      params.customerMessage
    }`
  );

  let recommendedProduct: string | null = null;

  if (customerType === "agent" && listingCount !== null) {
    if (listingCount <= 30) {
      recommendedProduct = "Silver";
    } else if (listingCount <= 100) {
      recommendedProduct = "Gold";
    } else if (listingCount <= 500) {
      recommendedProduct = "Agent Pro";
    } else {
      recommendedProduct = "Tetamo team review for inventory above 500";
    }
  } else if (customerType === "agency") {
    recommendedProduct = "Agency discussion / Developer License";
  } else if (customerType === "developer") {
    recommendedProduct = "Developer License";
  } else if (customerType === "owner") {
    if (
      containsPattern(combined, [
        "featured",
        "promosi media sosial",
        "exposure paling kuat",
        "maximum exposure",
        "strongest exposure",
      ])
    ) {
      recommendedProduct = "Featured Listing";
    } else if (
      containsPattern(combined, [
        "priority",
        "lebih terlihat",
        "visibilitas lebih tinggi",
        "higher visibility",
      ]) || discoveryProfile.mainPriority === "visibility"
    ) {
      recommendedProduct = "Priority Listing";
    } else if (
      containsPattern(combined, [
        "basic",
        "yang paling murah",
        "standard listing",
        "affordable",
      ]) || discoveryProfile.mainPriority === "price"
    ) {
      recommendedProduct = "Basic Listing";
    }
  }

  const discovery = selectNextDiscoveryField({
    customerType,
    listingCount,
    agentExperience,
    closingSignal,
    profile: discoveryProfile,
    primaryPlaybookEntry,
  });
  const nextQuestion = getDiscoveryQuestion(discovery.field, language);

  let nextAction = nextQuestion
    ? `Answer the customer's current question first. Then end with exactly this one approved discovery question: “${nextQuestion}” Do not replace it with another question.`
    : "Answer the current question accurately and give the clearest useful next step without adding an unnecessary discovery question.";

  if (customerType === "agent" && recommendedProduct) {
    nextAction = closingSignal
      ? `The customer shows a buying signal. Stop discovery, confirm ${recommendedProduct}, explain the registration and payment step, and share only ${TETAMO_LINKS.pricelist}.`
      : `Recommend ${recommendedProduct} and explain exactly why it fits ${listingCount} active listings. State the official price. ${
          nextQuestion
            ? `Then end with exactly this approved question: “${nextQuestion}”`
            : `Then give one clear next step using ${TETAMO_LINKS.pricelist}.`
        }`;
  } else if (customerType === "agency") {
    nextAction = `Explain that agency needs are handled directly with Tetamo and that Developer License information is available at ${TETAMO_LINKS.developerLicense}. ${
      nextQuestion
        ? `End with exactly this approved question: “${nextQuestion}”`
        : "State that the Tetamo team should follow up on the commercial requirement."
    }`;
  } else if (customerType === "developer") {
    nextAction = `Explain Developer License without presenting it as a standard package and share ${TETAMO_LINKS.developerLicense} only when relevant. ${
      nextQuestion
        ? `End with exactly this approved question: “${nextQuestion}”`
        : "The essential details are sufficient for qualified Tetamo team follow-up."
    }`;
  } else if (customerType === "owner" && recommendedProduct) {
    nextAction = closingSignal
      ? `The owner is ready. Confirm ${recommendedProduct}, explain the Owner listing and QRIS payment steps, and share ${TETAMO_LINKS.pricelist}. Do not ask another discovery question.`
      : `Recommend ${recommendedProduct} and explain why it matches the owner's need. ${
          nextQuestion
            ? `End with exactly this approved question: “${nextQuestion}”`
            : "Guide the owner to create the listing through their own Tetamo account."
        }`;
  } else if (customerType === "buyer_renter") {
    nextAction = nextQuestion
      ? `Do not sell a package. End with exactly this approved property-search question: “${nextQuestion}”`
      : `Do not sell a package. Guide the customer to search Tetamo at ${TETAMO_LINKS.website}.`;
  }

  if (primaryPlaybookEntry?.category === "closing") {
    nextAction = `Use the approved closing handling for “${primaryPlaybookEntry.topic}”. Stop discovery, give the correct action, and ask only an essential missing question when the approved guidance explicitly requires it.`;
  } else if (primaryPlaybookEntry?.category === "comparison") {
    nextAction = `Answer the approved factual comparison for “${primaryPlaybookEntry.topic}” first. Recommend the fitting option when enough information is known. Do not add an unrelated discovery question.`;
  } else if (
    primaryPlaybookEntry &&
    ["objection", "trust", "policy", "value"].includes(
      primaryPlaybookEntry.category
    )
  ) {
    nextAction = `Handle “${primaryPlaybookEntry.topic}” using the approved playbook first. Acknowledge naturally, answer factually, connect the answer to the customer's need, and do not add an unrelated discovery question.`;
  }

  return {
    customerType,
    listingCount,
    agentExperience,
    closingSignal,
    recommendedProduct,
    discoveryStage: discovery.stage,
    discoveryProfile,
    nextQuestionField: discovery.field,
    nextQuestion:
      primaryPlaybookEntry && primaryPlaybookEntry.category !== "qualification"
        ? null
        : nextQuestion,
    nextAction,
    matchedPlaybookIds: matchedEntries.map((entry) => entry.id),
  };
}

function formatSalesContext(context: SalesContext) {
  return [
    `Detected customer type: ${context.customerType}`,
    `Detected agent experience: ${context.agentExperience || "unknown"}`,
    `Detected listing count: ${
      context.listingCount === null ? "unknown" : context.listingCount
    }`,
    `Detected closing signal: ${context.closingSignal || "none"}`,
    `Hardcoded recommended product: ${
      context.recommendedProduct || "not determined yet"
    }`,
    `Discovery stage: ${context.discoveryStage}`,
    `Known discovery fields: ${
      context.discoveryProfile.answeredFields.join(", ") || "none"
    }`,
    `Detected main priority: ${
      context.discoveryProfile.mainPriority || "unknown"
    }`,
    `Detected start timing: ${
      context.discoveryProfile.startTiming || "unknown"
    }`,
    `Detected decision role: ${
      context.discoveryProfile.decisionRole || "unknown"
    }`,
    `Approved next discovery field: ${
      context.nextQuestionField || "none"
    }`,
    `Approved next discovery question: ${context.nextQuestion || "none"}`,
    `Required next sales action: ${context.nextAction}`,
  ].join("\n");
}

function formatRelevantSalesPlaybook(entries: SalesPlaybookEntry[]) {
  if (!entries.length) {
    return "No specific objection or comparison was detected. Follow the core sales journey and qualification rules.";
  }

  return entries
    .map((entry, index) => {
      return [
        `Sales playbook ${index + 1}: ${entry.topic}`,
        `Category: ${entry.category}`,
        `Approved handling: ${entry.approvedGuidance}`,
      ].join("\n");
    })
    .join("\n\n");
}

function isIntroductoryTetamoInquiry(message: string) {
  const normalized = normalizeIntentText(message);

  return containsPattern(normalized, [
    "apa itu tetamo",
    "tetamo itu apa",
    "tetamo bergerak di bidang apa",
    "what is tetamo",
    "what does tetamo do",
    "can i get more info",
    "can i get more information",
    "more information about this",
    "more info about this",
    "info tentang ini",
    "boleh info tentang ini",
  ]);
}

function getMandatorySalesSequence(params: {
  customerMessage: string;
  language: MonaLanguage;
  conversationContext: string | null;
}) {
  if (!isIntroductoryTetamoInquiry(params.customerMessage)) {
    return null;
  }

  const previousExplanation = containsPattern(
    String(params.conversationContext || ""),
    [
      "tetamo adalah marketplace properti online",
      "tetamo is an online property marketplace",
    ]
  );

  if (previousExplanation) {
    return null;
  }

  const base = INTRO_SALES_SEQUENCE[params.language];

  // A general Tetamo introduction must always identify the customer type first.
  // Do not assume owner, agent, developer, buyer or renter from older history.
  return [base.answer, base.qualification];
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
  salesContext: SalesContext;
  relevantSalesPlaybook: SalesPlaybookEntry[];
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
- Ask at most one useful follow-up question. A qualification, objection-discovery, recommendation, or closing question is useful when it follows the hardcoded sales journey.
- Sound human and commercially confident, but never manipulative, aggressive, desperate, or pushy.
- Do not merely list features. Connect the relevant feature to the customer's stated need.
- When the customer gives enough information for a recommendation, recommend one correct option and explain why.
- When the customer shows a buying signal, stop unnecessary qualification and guide them to the next action.

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
- Privacy Policy: ${TETAMO_LINKS.privacyPolicy}
- Developer License: ${TETAMO_LINKS.developerLicense}
- How to list property blog: ${TETAMO_LINKS.howToListBlog}
- How to post property video: ${TETAMO_LINKS.howToPostVideo}
- Owner and agent dashboard guide: ${TETAMO_LINKS.dashboardVideo}
- Share only the link relevant to the customer's question. Do not send every link at once.

HARDCODED TETAMO SALES CORE:
${SALES_CORE_RULES}

DETECTED SALES CONTEXT FOR THIS CONVERSATION:
${formatSalesContext(params.salesContext)}
- Follow the required next sales action unless the customer's immediate question requires a direct factual answer first.
- When an approved next discovery question is provided, finish with that exact question and do not substitute another question.
- Do not ask any discovery question when the approved next discovery question is “none”.
- Never contradict the hardcoded package recommendation.

RELEVANT HARDCODED OBJECTION, COMPARISON, POLICY, VALUE, OR CLOSING ANSWERS:
${formatRelevantSalesPlaybook(params.relevantSalesPlaybook)}
- Use the approved handling faithfully.
- You may phrase it naturally, but never change the facts, price, policy, recommendation, link, or boundary.

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

  const conversationContext = await getConversationContext(
    params.conversationId,
    params.excludedMessageIds
  );

  const mandatorySequence = getMandatorySalesSequence({
    customerMessage: params.customerMessage,
    language,
    conversationContext,
  });

  if (mandatorySequence) {
    return {
      action: "reply",
      replies: mandatorySequence
        .map((reply) => cleanFinalReply(reply, params.customerMessage))
        .filter(Boolean),
      source: "hardcoded_sales_sequence",
    };
  }

  const salesContext = buildSalesContext({
    customerMessage: params.customerMessage,
    conversationContext,
  });
  const relevantSalesPlaybook = selectRelevantSalesPlaybook(
    params.customerMessage,
    conversationContext
  );

  if (!process.env.OPENAI_API_KEY) {
    const cleanedFallback = cleanFinalReply(
      fallbackReply,
      params.customerMessage
    );

    return {
      action: "reply",
      replies: [
        enforceRequiredDiscoveryQuestion(
          cleanedFallback,
          salesContext.nextQuestion
        ),
      ].filter(Boolean),
      source: "fallback",
    };
  }

  try {
    const knowledgeEntries = await searchApprovedKnowledge(
      params.customerMessage,
      language
    );

    const prompt = buildMonaPrompt({
      customerMessage: params.customerMessage,
      language,
      conversationContext,
      campaignContext: params.campaignContext,
      knowledgeEntries,
      salesContext,
      relevantSalesPlaybook,
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

    const cleanedReply = cleanFinalReply(
      rawReply || fallbackReply,
      params.customerMessage
    );

    return {
      action: "reply",
      replies: [
        enforceRequiredDiscoveryQuestion(
          cleanedReply,
          salesContext.nextQuestion
        ),
      ].filter(Boolean),
      source: rawReply ? "openai" : "fallback",
    };
  } catch (error) {
    console.error("Meta WhatsApp OpenAI generation failed:", error);
    const cleanedFallback = cleanFinalReply(
      fallbackReply,
      params.customerMessage
    );

    return {
      action: "reply",
      replies: [
        enforceRequiredDiscoveryQuestion(
          cleanedFallback,
          salesContext.nextQuestion
        ),
      ].filter(Boolean),
      source: "fallback",
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

      const replies = generation.replies
        .map((reply) => String(reply || "").trim())
        .filter(Boolean);

      if (!replies.length) {
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

      let sentReplyCount = 0;

      for (let replyIndex = 0; replyIndex < replies.length; replyIndex += 1) {
        const reply = replies[replyIndex];

        if (replyIndex > 0) {
          await sleep(1000);

          const customerHasNotReplied = await isStillLatestInboundMessage(
            conversation.id,
            inboundSave.messageId
          );

          if (!customerHasNotReplied) {
            console.log(
              "Skipped the next Mona sales-sequence message because the customer replied.",
              {
                conversationId: conversation.id,
                replyIndex,
              }
            );
            break;
          }
        }

        const sendResult = await sendMetaWhatsappText({
          phoneNumberId,
          to: customerPhone,
          message: reply,
        });

        const sourcePrefix =
          generation.source === "hardcoded_sales_sequence"
            ? "tetamo_mona_sales_sequence_meta"
            : generation.source === "fallback"
              ? "tetamo_mona_fallback_meta"
              : "tetamo_mona_meta";

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
            ? sourcePrefix
            : `${sourcePrefix}_send_failed`,
        });

        if (!sendResult.success) {
          break;
        }

        sentReplyCount += 1;
      }

      processedCount += 1;
      replyCount += sentReplyCount;
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
