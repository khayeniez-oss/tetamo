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

type MetaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: {
    body?: string;
  };
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

const TETAMO_LINKS = {
  pricelist: "https://www.tetamo.com/pricelist",
  developerLicense: "https://www.tetamo.com/developer-license",
  howToListBlog:
    "https://www.tetamo.com/blog/how-to-list-my-property-in-tetamo",
  howToPostVideo:
    "https://www.tetamo.com/education/cara-posting-properti-di-tetamo",
  dashboardVideo:
    "https://www.tetamo.com/education/cara-menggunakan-dashboard-tetamo-untuk-owner-dan-agent",
};

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
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
  return cleanEnv(process.env.META_WHATSAPP_ACCESS_TOKEN);
}

function getPhoneNumberId(fallback?: string | null) {
  return (
    cleanEnv(fallback) ||
    cleanEnv(process.env.META_WHATSAPP_PHONE_NUMBER_ID) ||
    cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID)
  );
}

/**
 * IMPORTANT SAFETY GUARD
 *
 * Tetamo must not reply to Kolkap's WhatsApp number.
 *
 * This function decides which Meta phone_number_id Tetamo is allowed to process.
 *
 * If Tetamo Vercel has no allowed phone number ID configured, Tetamo will ignore
 * all inbound WhatsApp webhook messages.
 *
 * Recommended Tetamo Vercel env:
 *
 * If Tetamo WhatsApp should be disabled:
 * - Leave these blank / do not set:
 *   TETAMO_ALLOWED_WHATSAPP_PHONE_NUMBER_IDS
 *   META_WHATSAPP_PHONE_NUMBER_ID
 *   WHATSAPP_PHONE_NUMBER_ID
 *
 * If Tetamo has its own WhatsApp number:
 * - Add only Tetamo's real phone_number_id here:
 *   TETAMO_ALLOWED_WHATSAPP_PHONE_NUMBER_IDS=1234567890
 *
 * Never put Kolkap's Australian number phone_number_id here.
 */
function getAllowedBusinessPhoneNumberIds() {
  const rawValues = [
    process.env.TETAMO_ALLOWED_WHATSAPP_PHONE_NUMBER_IDS,
    process.env.META_WHATSAPP_PHONE_NUMBER_ID,
    process.env.WHATSAPP_PHONE_NUMBER_ID,
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

  if (!cleanPhoneNumberId) return false;

  /**
   * Fail closed:
   * If Tetamo has no allowed phone number ID configured, do not process any
   * WhatsApp inbound webhook. This prevents Tetamo from accidentally replying
   * to Kolkap if Meta routes the webhook incorrectly.
   */
  if (allowedIds.length === 0) return false;

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

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function detectLanguage(message: string) {
  const lower = message.toLowerCase();

  const indonesianHints = [
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
    "photo",
    "video",
    "upload",
  ];

  return indonesianHints.some((word) => lower.includes(word)) ? "id" : "en";
}

function isIdentityQuestion(message: string) {
  const lower = message.toLowerCase().trim();

  const identityQuestions = [
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
  ];

  return identityQuestions.some((item) => lower.includes(item));
}

function getListingInstructionReply(language: "id" | "en") {
  if (language === "id") {
    return `Untuk pasang listing properti di Tetamo, listing tidak bisa dibuat melalui WhatsApp.

Pemilik atau agent harus sign up / log in dan membuat listing sendiri di Tetamo supaya bisa mengelola dashboard, melihat leads, menerima WhatsApp langsung, dan mengatur schedule viewing sendiri.

Alurnya:
1. Sign up atau log in
2. Create Listing
3. Isi detail properti
4. Upload minimal 3 foto properti, boleh tambah video jika ada
5. Klik Generate untuk bantu buat Judul & Deskripsi dengan AI
6. Lakukan verifikasi
7. Bayar pakai QRIS
8. Setelah itu listing otomatis tayang di marketplace Tetamo, tidak perlu menunggu lagi.

Panduan posting properti:
${TETAMO_LINKS.howToPostVideo}`;
  }

  return `To list a property on Tetamo, the listing cannot be created through WhatsApp.

The owner or agent must sign up / log in and create the listing directly in Tetamo, so they can manage their dashboard, leads, direct WhatsApp inquiries, and schedule viewing requests.

The flow is:
1. Sign up or log in
2. Create Listing
3. Enter the property details
4. Upload minimum 3 property photos, and add video if available
5. Click Generate to create the title and description with AI
6. Complete verification
7. Pay with QRIS
8. The listing will be automatically posted in Tetamo marketplace, no need to wait.

Property posting guide:
${TETAMO_LINKS.howToPostVideo}`;
}

function getMediaRedirectReply() {
  return `Terima kasih, foto/video sudah diterima.

Namun untuk pasang listing properti di Tetamo, foto/video tidak bisa dikirim melalui WhatsApp untuk kami upload-kan.

Pemilik atau agent perlu sign up / log in dan membuat listing sendiri di Tetamo agar bisa mengelola dashboard, melihat leads, menerima WhatsApp langsung dari pembeli/penyewa, dan mengatur schedule viewing sendiri.

Minimum upload: 3 foto properti.

Alurnya:
1. Sign up atau log in
2. Create Listing
3. Isi detail properti
4. Upload minimal 3 foto properti, boleh tambah video jika ada
5. Klik Generate untuk bantu buat Judul & Deskripsi dengan AI
6. Verifikasi
7. Bayar pakai QRIS
8. Listing otomatis tayang di marketplace Tetamo.`;
}

function getFallbackReply(message: string) {
  const lang = detectLanguage(message);

  if (isIdentityQuestion(message)) {
    if (lang === "id") {
      return "Halo, saya Mona dari Tetamo. Saya bisa bantu seputar cari properti, pasang listing, paket owner/agent, dan cara menggunakan Tetamo.";
    }

    return "Hi, I’m Mona from Tetamo. I can help with property search, listings, owner/agent packages, and how to use Tetamo.";
  }

  const lower = message.toLowerCase();

  const listingIntent =
    lower.includes("pasang") ||
    lower.includes("iklan") ||
    lower.includes("listing") ||
    lower.includes("upload") ||
    lower.includes("foto") ||
    lower.includes("photo") ||
    lower.includes("video") ||
    lower.includes("jual rumah") ||
    lower.includes("sewa rumah") ||
    lower.includes("list my property") ||
    lower.includes("advertise my property");

  if (listingIntent) {
    return getListingInstructionReply(lang);
  }

  if (lang === "id") {
    return "Halo, selamat datang di Tetamo. Anda ingin pasang iklan properti, cari properti, atau tanya paket owner/agent/developer?";
  }

  return "Hi, welcome to Tetamo. Are you looking to list a property, find a property, or ask about owner, agent, or developer packages?";
}

function limitReply(value: string) {
  const clean = String(value || "").trim();

  if (clean.length <= 1700) return clean;

  return clean.slice(0, 1690).trim() + "...";
}

function removeUnwantedIdentity(reply: string, customerMessage: string) {
  if (isIdentityQuestion(customerMessage)) return reply;

  let clean = String(reply || "").trim();

  const patterns = [
    /^halo,?\s*saya\s+(?:adalah\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^hi,?\s*i(?:'|’)m\s+(?:a\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^hello,?\s*i(?:'|’)m\s+(?:a\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^saya\s+(?:adalah\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
    /^i\s+am\s+(?:a\s+)?(?:whatsapp\s+)?ai.*?(?:\.|\n)/i,
  ];

  for (const pattern of patterns) {
    clean = clean.replace(pattern, "").trim();
  }

  return clean || reply;
}

function removeUnwantedAdminClosing(reply: string) {
  let clean = String(reply || "").trim();

  const patterns = [
    /(?:\n|\r|^).*?(?:apakah|apa)\s+(?:anda|kamu)\s+(?:ingin|mau).*?(?:admin|tim|human|manusia).*?\??\s*$/i,
    /(?:\n|\r|^).*?(?:mau|ingin)\s+saya\s+(?:hubungkan|sambungkan|teruskan).*?(?:admin|tim).*?\??\s*$/i,
    /(?:\n|\r|^).*?do\s+you\s+want\s+me\s+to\s+(?:connect|transfer|pass|assign).*?(?:admin|team|human).*?\??\s*$/i,
    /(?:\n|\r|^).*?would\s+you\s+like\s+me\s+to\s+(?:connect|transfer|pass|assign).*?(?:admin|team|human).*?\??\s*$/i,
  ];

  for (const pattern of patterns) {
    clean = clean.replace(pattern, "").trim();
  }

  return clean || reply;
}

async function generateMonaReply(customerMessage: string) {
  const fallback = getFallbackReply(customerMessage);

  if (!process.env.OPENAI_API_KEY) return fallback;

  try {
    const prompt = `
You are Mona from Tetamo.

Identity rule:
- Your name is Mona.
- You represent Tetamo in WhatsApp conversations.
- Never introduce yourself as WhatsApp AI, AI customer assistance, chatbot, bot, or automated assistant.
- Do not introduce yourself in every reply.
- Only introduce yourself if the customer asks who they are speaking with, asks your name, asks if you are AI, asks if you are admin, or asks "ini siapa?"
- If asked in Indonesian, say: "Halo, saya Mona dari Tetamo. Saya bisa bantu seputar cari properti, pasang listing, paket owner/agent, dan cara menggunakan Tetamo."
- If asked in English, say: "Hi, I’m Mona from Tetamo. I can help with property search, listings, owner/agent packages, and how to use Tetamo."

Language rule:
- If the customer writes in Indonesian, reply in Indonesian.
- If the customer writes in English, reply in English.
- If mixed, light bilingual is okay.
- Do not randomly switch language.

Tetamo:
- Tetamo is an Australian SaaS/property marketplace business serving the Indonesian property market.
- Users can search, buy, sell, or rent property in Tetamo.
- Owners and agents can create property listings.
- Tetamo supports verified listings, direct WhatsApp inquiry, schedule viewing, QRIS payment, photo/video upload, and AI support for title/description.
- Tetamo charges listing/advertising fees, not sale/rental commission unless separately agreed.
- Do not guarantee leads, sale, rental, ROI, or legal safety.

VERY IMPORTANT LISTING RULE:
- Customers cannot list their property by sending photos, videos, or details through WhatsApp.
- Do not offer to upload or create the listing for them through WhatsApp.
- Do not say "send your photos here and we will list it."
- From the beginning, guide owners/agents to sign up or log in and create the listing themselves.
- Explain why: they need their own dashboard so they can manage leads, direct WhatsApp inquiries, schedule viewing requests, listing edits, and payment status themselves.
- Minimum 3 property photos are required for listing.
- They may add video if available.
- AI title and description are generated inside Tetamo by clicking Generate.
- After verification and QRIS payment, the listing is automatically posted in Tetamo marketplace. No need to wait.

Correct listing steps:
1. Sign up or log in
2. Click Create Listing
3. Input property details
4. Upload minimum 3 property photos, and add video if available
5. Click Generate to create Judul & Deskripsi with AI
6. Complete verification
7. Pay with QRIS
8. Listing automatically appears in the Tetamo marketplace

If customer asks how to list, how to advertise property, how to upload photos/videos, or sends property details:
- Reply with the correct listing steps.
- Clearly say listing must be created inside Tetamo, not through WhatsApp.
- Mention minimum 3 photos.
- Mention the dashboard benefit.
- Share this guide only when relevant:
  ${TETAMO_LINKS.howToPostVideo}

Tone:
- Friendly, professional, sales-smart, clear, WhatsApp-friendly.
- Short paragraphs.
- No long essay unless asked.
- Do not offer admin handover at the end of normal replies.
- Only mention Tetamo team follow-up for payment/account/refund/complaint/legal/custom proposal or account-specific issue.

If vague message like "hi", "info", "price", or "mau tanya":
Ask if they want to pasang iklan properti, cari properti, or ask about owner/agent/developer packages.

Buyer/renter:
- If they want to search, buy, rent, or schedule viewing, ask location, budget, property type, and whether they want to buy or rent.
- Explain they can contact owner/agent directly by WhatsApp and schedule viewing where available.

Official Tetamo package knowledge:
Use ONLY these official Tetamo package names when talking about packages.

Owner packages are for property owners / pemilik who want to advertise their own property listing:
1. Basic Listing
   - For owners who want to display 1 active property on Tetamo marketplace.
   - 1 active listing.
   - Active for 1 year.
   - Includes AI-generated title & description, verification badge after approval, direct WhatsApp buyer/renter, viewing scheduling, and marketplace/app visibility.
   - Price: Rp50.000.

2. Priority Listing
   - For owners who want better visibility than Basic Listing.
   - 1 active listing.
   - Active for 1 year.
   - Includes everything in Basic Listing plus higher marketplace visibility and priority display.
   - Price: Rp150.000.

3. Featured Listing
   - For owners who want the strongest owner listing exposure.
   - 1 active listing.
   - Active and featured for 1 year.
   - Includes everything in owner listing plus Featured Badge, highest marketplace visibility, social media posting on FB / IG / TikTok, and Tetamo Agent Support.
   - Price: Rp550.000.

Agent packages are memberships for property agents / agen / agencies who want to manage multiple listings and use the agent dashboard:
1. Silver
   - For agents starting professionally on Tetamo.
   - 30 active listings.
   - 1-year membership.
   - Includes Agent Profile Website, Social Media Integration, Leads Dashboard, Viewing Schedule, Packages & Billing, Payments / Receipts, Analytics / Insights, Commission Tracking, and Boost & Spotlight access.
   - Price: Rp499.000 per year.

2. Gold
   - For active agents who want stronger branding and listing visibility.
   - 100 active listings.
   - 1-year membership.
   - Includes Silver features plus 1 AI Avatar Introduction Video, 3 free Featured Listings for 90 days each, and priority listing visibility.
   - Price: Rp1.800.000 per year.

3. Agent Pro
   - For serious agents or agencies that want to scale bigger.
   - 500 active listings.
   - 1-year membership.
   - Includes Gold-style benefits plus eligibility for Featured Agent placement, premium exposure opportunity, limited Featured Agent slots, and monthly payment option.
   - Price: Rp3.999.000 per year, or Rp399.000/month with 12-month commitment.

Developer:
- Developer is NOT a normal owner or agent package.
- Do NOT say "Paket Developer" as if it is a normal checkout package.
- For developers, project owners, or property companies, call it Developer License / quotation.
- Explain that developer exposure and licensing are handled separately from normal owner/agent listing.
- Share:
  ${TETAMO_LINKS.developerLicense}

Pricing answer style:
If user asks about price, paket, pricing, package details, "detailnya", or "boleh dijelaskan":
- Do not invent package names.
- Do not say "Paket Premium" as a package name.
- Do not say "Paket Developer" as a normal package name.
- Use the official names above.
- If the customer is vague, first ask whether they are a pemilik/owner, agen/agent, or developer/project owner.
- Give a short summary of the correct category first, then offer to explain the full difference.
- If the customer clearly says they are an owner/pemilik, explain only Basic Listing, Priority Listing, and Featured Listing.
- If the customer clearly says they are an agent/agen, explain only Silver, Gold, and Agent Pro.
- If the customer clearly says they are a developer/project owner, explain Developer License / quotation and share the developer license link.
- Always share the pricelist when relevant:
  ${TETAMO_LINKS.pricelist}
- Mention that prices/package details should be checked on the pricelist page for the latest information.

Customer message:
${customerMessage}

Write only the WhatsApp reply.
Do not return JSON.
Do not add labels like "Tetamo:".
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.45,
      max_output_tokens: 650,
    });

    const raw = response.output_text || fallback;
    const noIdentity = removeUnwantedIdentity(raw, customerMessage);
    const noAdminClosing = removeUnwantedAdminClosing(noIdentity);

    return limitReply(noAdminClosing || fallback);
  } catch (error) {
    console.error("Meta WhatsApp AI generation failed:", error);
    return fallback;
  }
}

async function sendMetaWhatsappText(params: {
  phoneNumberId: string;
  to: string;
  message: string;
}) {
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
}

async function upsertConversation(params: {
  customerPhone: string;
  profileName: string | null;
  messageText: string;
  referral?: MetaMessage["referral"] | null;
}) {
  const now = new Date().toISOString();

  const upsertPayload: Record<string, unknown> = {
    phone: `whatsapp:${params.customerPhone}`,
    phone_e164: params.customerPhone,
    profile_name: params.profileName,
    channel: "meta_whatsapp",
    status: "active",
    last_inbound_at: now,
    window_expires_at: getWindowExpiry(),
    last_message: params.messageText,
    last_message_direction: "inbound",
    last_message_at: now,
  };

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
      onConflict: "phone",
    })
    .select(
      "id, phone, ai_enabled, handover_to_admin, handover_reason, free_entry_point_expires_at, free_entry_point_source, ad_referral_source"
    )
    .single();

  if (error || !data?.id) {
    console.error("Failed to upsert Meta WhatsApp conversation:", error);
    return null;
  }

  return data as {
    id: string;
    phone: string;
    ai_enabled?: boolean | null;
    handover_to_admin?: boolean | null;
    handover_reason?: string | null;
    free_entry_point_expires_at?: string | null;
    free_entry_point_source?: string | null;
    ad_referral_source?: string | null;
  };
}

async function saveInboundMessage(params: {
  conversationId: string;
  customerPhone: string;
  businessPhoneNumberId: string | null;
  profileName: string | null;
  messageText: string;
  metaMessageId: string | null;
  rawPayload: unknown;
  referral?: MetaMessage["referral"] | null;
  messageType?: string | null;
}) {
  const { error } = await supabaseAdmin.from("whatsapp_messages").insert({
    conversation_id: params.conversationId,
    direction: "inbound",
    from_number: params.customerPhone,
    to_number: params.businessPhoneNumberId,
    phone: `whatsapp:${params.customerPhone}`,
    profile_name: params.profileName,
    message: params.messageText,
    source: "meta",
    ai_generated: false,
    admin_generated: false,
    media_count: params.messageType && params.messageType !== "text" ? 1 : 0,
    raw_payload: {
      meta_message_id: params.metaMessageId,
      meta_message_type: params.messageType || null,
      meta_referral: params.referral || null,
      meta_payload: params.rawPayload,
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Failed to save Meta inbound WhatsApp message:", error);
  }
}

async function saveOutboundMessage(params: {
  conversationId: string;
  customerPhone: string;
  businessPhoneNumberId: string | null;
  profileName: string | null;
  reply: string;
  metaSendId: string | null;
  metaSendError: unknown;
}) {
  const outboundAt = new Date().toISOString();

  const { error: messageError } = await supabaseAdmin
    .from("whatsapp_messages")
    .insert({
      conversation_id: params.conversationId,
      direction: "outbound",
      from_number: params.businessPhoneNumberId,
      to_number: params.customerPhone,
      phone: `whatsapp:${params.customerPhone}`,
      profile_name: params.profileName,
      message: params.reply,
      source: "tetamo_mona_meta",
      ai_generated: true,
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
      "Failed to update Meta WhatsApp conversation after reply:",
      conversationError
    );
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

  console.log("Meta WhatsApp webhook verification request:", {
    mode,
    hasProvidedToken: Boolean(providedToken),
    providedTokenLength: providedToken.length,
    expectedTokenCount: expectedTokens.length,
    expectedTokenLengths: expectedTokens.map((value) => value.length),
    tokenMatches,
    hasChallenge: Boolean(challenge),
  });

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
      providedTokenLength: providedToken.length,
      expectedTokenCount: expectedTokens.length,
      expectedTokenLengths: expectedTokens.map((value) => value.length),
      tokenMatches,
      hasChallenge: Boolean(challenge),
      note:
        "Set META_WEBHOOK_VERIFY_TOKEN in Vercel Production env, redeploy, then use the same token value in Meta Verify token.",
    },
    { status: 403 }
  );
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);

    if (!payload) {
      return Response.json({ success: true, ignored: true });
    }

    if (payload.object !== "whatsapp_business_account") {
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

    for (const item of webhookMessages) {
      const incomingPhoneNumberId = cleanEnv(item.phoneNumberId);

      if (!isAllowedBusinessPhoneNumberId(incomingPhoneNumberId)) {
        ignoredCount += 1;

        console.log("Tetamo ignored WhatsApp webhook for non-allowed phone number.", {
          incomingPhoneNumberId: incomingPhoneNumberId || "missing",
          allowedPhoneNumberIdCount: getAllowedBusinessPhoneNumberIds().length,
        });

        continue;
      }

      const customerPhone = normalizePhone(item.message.from || "");
      const textBody = String(item.message.text?.body || "").trim();
      const phoneNumberId = getPhoneNumberId(incomingPhoneNumberId);
      const isTextMessage = item.message.type === "text" && Boolean(textBody);
      const referral = item.message.referral || null;

      if (!customerPhone) {
        ignoredCount += 1;
        continue;
      }

      const messageText = isTextMessage
        ? textBody
        : "[Customer sent photo, video, or non-text WhatsApp message]";

      const conversation = await upsertConversation({
        customerPhone,
        profileName: item.profileName,
        messageText,
        referral,
      });

      if (!conversation?.id) {
        ignoredCount += 1;
        continue;
      }

      await saveInboundMessage({
        conversationId: conversation.id,
        customerPhone,
        businessPhoneNumberId: phoneNumberId,
        profileName: item.profileName,
        messageText,
        metaMessageId: item.message.id || null,
        rawPayload: payload,
        referral,
        messageType: item.message.type || null,
      });

      if (conversation.handover_to_admin || conversation.ai_enabled === false) {
        processedCount += 1;
        continue;
      }

      const reply = isTextMessage
        ? await generateMonaReply(messageText)
        : getMediaRedirectReply();

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
      });

      processedCount += 1;
    }

    return Response.json({
      success: true,
      processedCount,
      ignoredCount,
    });
  } catch (error) {
    console.error("Meta WhatsApp webhook error:", error);
    return Response.json({ success: true, error_logged: true });
  }
}