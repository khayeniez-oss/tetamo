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

type ConversationRow = {
  id: string;
  phone: string;
  ai_enabled?: boolean | null;
  handover_to_admin?: boolean | null;
  handover_reason?: string | null;
};

type MessageRow = {
  direction: string;
  message: string;
  created_at: string;
  ai_generated?: boolean | null;
  admin_generated?: boolean | null;
};

type HandoverResult = {
  shouldHandover: boolean;
  reason: string;
};

type TwilioSendResult = {
  success: boolean;
  sid: string | null;
  status?: string | null;
  error?: unknown;
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

function escapeXml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createTwimlMessage(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

function createEmptyTwimlResponse() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>`;
}

function twimlResponse(xml: string) {
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

function cleanWhatsappPhone(value: string) {
  return String(value || "").replace(/^whatsapp:/i, "").trim();
}

function getWindowExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry.toISOString();
}

function getRawPayload(params: URLSearchParams) {
  const payload: Record<string, string> = {};

  params.forEach((value, key) => {
    payload[key] = value;
  });

  return payload;
}

function limitWhatsAppReply(value: string) {
  const clean = String(value || "").trim();

  if (clean.length <= 1700) return clean;

  return clean.slice(0, 1690).trim() + "...";
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
  ];

  return indonesianHints.some((word) => lower.includes(word)) ? "id" : "en";
}

function getSafeFallbackReply(message: string) {
  const lang = detectLanguage(message);

  if (lang === "id") {
    return `Halo, selamat datang di Tetamo.

Apakah Anda ingin memasang listing properti, mencari properti, atau bertanya tentang paket owner, agent, atau developer?`;
  }

  return `Hi, welcome to Tetamo.

Are you looking to list a property, find a property, or ask about owner, agent, or developer packages?`;
}

async function sendTwilioWhatsappMessage(
  to: string,
  message: string
): Promise<TwilioSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!to) {
    console.error("Twilio WhatsApp send skipped. Missing recipient number.");

    return {
      success: false,
      sid: null,
      error: "Missing recipient number.",
    };
  }

  if (!accountSid || !authToken || !from) {
    console.error("Missing Twilio send env vars.", {
      hasAccountSid: Boolean(accountSid),
      hasAuthToken: Boolean(authToken),
      hasFrom: Boolean(from),
    });

    return {
      success: false,
      sid: null,
      error: "Missing Twilio send environment variables.",
    };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: message,
        }),
      }
    );

    const responseText = await response.text();

    let result: any = null;

    try {
      result = responseText ? JSON.parse(responseText) : null;
    } catch {
      result = responseText;
    }

    if (!response.ok) {
      console.error("Twilio WhatsApp API send failed:", result);

      return {
        success: false,
        sid: null,
        error: result,
      };
    }

    console.log("Twilio WhatsApp API reply sent:", {
      sid: result?.sid || null,
      status: result?.status || null,
      to,
    });

    return {
      success: true,
      sid: result?.sid || null,
      status: result?.status || null,
      error: null,
    };
  } catch (error) {
    console.error("Twilio WhatsApp API send error:", error);

    return {
      success: false,
      sid: null,
      error,
    };
  }
}

async function sendReplyAndReturnXml(params: URLSearchParams, reply: string) {
  const from = params.get("From") || "";

  const twilioSendResult = await sendTwilioWhatsappMessage(from, reply);

  if (twilioSendResult.success) {
    return {
      twilioSendResult,
      response: twimlResponse(createEmptyTwimlResponse()),
    };
  }

  return {
    twilioSendResult,
    response: twimlResponse(createTwimlMessage(reply)),
  };
}

function includesAny(message: string, keywords: string[]) {
  const lower = message.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function detectHandover(message: string): HandoverResult {
  const lower = message.toLowerCase().trim();

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
      reason: "Customer explicitly requested human/admin support",
    };
  }

  const paymentIssue = [
    "i already paid",
    "already paid",
    "payment failed",
    "payment problem",
    "paid but",
    "payment not active",
    "my payment",
    "invoice issue",
    "receipt issue",
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
  ];

  if (includesAny(lower, paymentIssue)) {
    return {
      shouldHandover: true,
      reason: "Payment or billing issue",
    };
  }

  const refundComplaintIssue = [
    "refund",
    "complaint",
    "complain",
    "i want to complain",
    "bad service",
    "not happy",
    "angry",
    "komplain",
    "keluhan",
    "kecewa",
    "marah",
    "pengembalian dana",
    "uang kembali",
    "laporan",
  ];

  if (includesAny(lower, refundComplaintIssue)) {
    return {
      shouldHandover: true,
      reason: "Complaint or refund request",
    };
  }

  const verificationIssue = [
    "verification rejected",
    "verifikasi ditolak",
    "dokumen ditolak",
    "document rejected",
    "ktp bermasalah",
    "sertifikat bermasalah",
    "verification problem",
    "masalah verifikasi",
    "listing ditolak",
    "iklan ditolak",
  ];

  if (includesAny(lower, verificationIssue)) {
    return {
      shouldHandover: true,
      reason: "Verification or document issue",
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
    };
  }

  return {
    shouldHandover: false,
    reason: "",
  };
}

function buildHandoverReply(message: string, reason: string) {
  const lang = detectLanguage(message);

  if (lang === "id") {
    return `Baik, untuk hal ini tim Tetamo akan membantu mengecek lebih lanjut.

Saya sudah tandai percakapan ini agar bisa ditindaklanjuti dengan lebih tepat.`;
  }

  return `Sure, the Tetamo team will help check this further.

I’ve marked this conversation so it can be followed up properly.`;
}

function removeUnwantedAdminClosing(reply: string) {
  let clean = String(reply || "").trim();

  const unwantedPatterns = [
    /(?:\n|\r|^).*?(?:apakah|apa)\s+(?:anda|kamu)\s+(?:ingin|mau).*?(?:admin|tim|human|manusia).*?\??\s*$/i,
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

async function upsertConversation(
  params: URLSearchParams
): Promise<ConversationRow | null> {
  const from = params.get("From") || "";
  const body = params.get("Body") || "";
  const profileName = params.get("ProfileName") || "";

  const now = new Date().toISOString();
  const windowExpiresAt = getWindowExpiry();

  const phone = from;
  const phoneE164 = cleanWhatsappPhone(from);

  const { data, error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .upsert(
      {
        phone,
        phone_e164: phoneE164,
        profile_name: profileName || null,
        channel: "twilio_whatsapp",
        status: "active",
        last_inbound_at: now,
        window_expires_at: windowExpiresAt,
        last_message: body,
        last_message_direction: "inbound",
        last_message_at: now,
      },
      {
        onConflict: "phone",
      }
    )
    .select("id, phone, ai_enabled, handover_to_admin, handover_reason")
    .single();

  if (error || !data?.id) {
    console.error("Failed to upsert WhatsApp conversation:", error);
    return null;
  }

  return data as ConversationRow;
}

async function saveInboundMessage(
  params: URLSearchParams,
  conversationId: string
) {
  const from = params.get("From") || "";
  const to = params.get("To") || "";
  const body = params.get("Body") || "";
  const profileName = params.get("ProfileName") || "";
  const messageSid =
    params.get("MessageSid") || params.get("SmsMessageSid") || "";
  const mediaCount = Number(params.get("NumMedia") || 0);
  const now = new Date().toISOString();
  const rawPayload = getRawPayload(params);

  if (messageSid) {
    const { error } = await supabaseAdmin
      .from("whatsapp_messages")
      .upsert(
        {
          conversation_id: conversationId,
          twilio_message_sid: messageSid,
          direction: "inbound",
          from_number: from,
          to_number: to,
          phone: from,
          profile_name: profileName || null,
          message: body || "",
          source: "twilio",
          ai_generated: false,
          admin_generated: false,
          media_count: Number.isFinite(mediaCount) ? mediaCount : 0,
          raw_payload: rawPayload,
          created_at: now,
        },
        {
          onConflict: "twilio_message_sid",
          ignoreDuplicates: true,
        }
      );

    if (error) {
      console.error("Failed to save inbound WhatsApp message:", error);
    }

    return;
  }

  const { error } = await supabaseAdmin.from("whatsapp_messages").insert({
    conversation_id: conversationId,
    direction: "inbound",
    from_number: from,
    to_number: to,
    phone: from,
    profile_name: profileName || null,
    message: body || "",
    source: "twilio",
    ai_generated: false,
    admin_generated: false,
    media_count: Number.isFinite(mediaCount) ? mediaCount : 0,
    raw_payload: rawPayload,
    created_at: now,
  });

  if (error) {
    console.error("Failed to save inbound WhatsApp message:", error);
  }
}

async function getRecentMessages(conversationId: string) {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("direction, message, created_at, ai_generated, admin_generated")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    console.error("Failed to get recent WhatsApp messages:", error);
    return [];
  }

  return ((data || []) as MessageRow[]).reverse();
}

async function saveOutboundMessage(
  params: URLSearchParams,
  conversationId: string,
  reply: string,
  options?: {
    aiGenerated?: boolean;
    adminGenerated?: boolean;
    source?: string;
    handoverReason?: string;
    twilioMessageSid?: string | null;
    twilioSendStatus?: string | null;
    twilioSendError?: unknown;
  }
) {
  const from = params.get("From") || "";
  const to = params.get("To") || "";
  const profileName = params.get("ProfileName") || "";
  const outboundAt = new Date().toISOString();

  const { error: outboundError } = await supabaseAdmin
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversationId,
      direction: "outbound",
      from_number: to,
      to_number: from,
      phone: from,
      profile_name: profileName || null,
      message: reply,
      source: options?.source || "tetamo_ai",
      ai_generated: Boolean(options?.aiGenerated),
      admin_generated: Boolean(options?.adminGenerated),
      media_count: 0,
      raw_payload: {
        ai_reply: Boolean(options?.aiGenerated),
        admin_handover: Boolean(options?.handoverReason),
        handover_reason: options?.handoverReason || null,
        twilio_message_sid: options?.twilioMessageSid || null,
        twilio_send_status: options?.twilioSendStatus || null,
        twilio_send_error: options?.twilioSendError || null,
      },
      created_at: outboundAt,
    });

  if (outboundError) {
    console.error("Failed to save outbound WhatsApp reply:", outboundError);
  }

  const updatePayload: Record<string, unknown> = {
    last_message: reply,
    last_message_direction: "outbound",
    last_message_at: outboundAt,
  };

  if (options?.handoverReason) {
    updatePayload.handover_to_admin = true;
    updatePayload.ai_enabled = false;
    updatePayload.handover_reason = options.handoverReason;
  }

  const { error: updateError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update(updatePayload)
    .eq("id", conversationId);

  if (updateError) {
    console.error(
      "Failed to update conversation after outbound reply:",
      updateError
    );
  }
}

function buildTetamoAiPrompt(params: {
  customerMessage: string;
  recentMessages: MessageRow[];
}) {
  const conversationText = params.recentMessages
    .map((message) => {
      const speaker = message.direction === "inbound" ? "Customer" : "Tetamo";
      return `${speaker}: ${message.message}`;
    })
    .join("\n");

  return `
You are Tetamo WhatsApp AI Lead Handler and Support Assistant.

Main language rule:
- If the customer writes in Indonesian, reply in Indonesian.
- If the customer writes in English, reply in English.
- If the customer mixes Indonesian and English, light bilingual is okay.
- Do not randomly switch language.

Your main purpose:
Most messages come from Instagram/Facebook/Meta advertising. You respond 24/7 to help Tetamo capture leads, answer questions, guide users, and move the conversation forward professionally.

Your personality:
- Professional, friendly, helpful, and sales-driven.
- Sound like a real Tetamo admin, not a robotic FAQ bot.
- Be warm, clear, confident, and practical.
- Do not be too formal unless the customer is formal.
- Do not always start with "Thank you" or "Thanks for reaching out."
- Vary your opening naturally:
  - "Yes, you can..."
  - "Sure, the flow is quite simple..."
  - "Bisa, Pak/Bu..."
  - "Untuk pasang listing di Tetamo..."
  - "That’s a fair question..."
- Keep replies WhatsApp-friendly with short paragraphs.
- Keep the answer focused. Avoid long essays unless the customer asks for details.

Very important admin handover rule:
- Do NOT offer admin handover at the end of normal replies.
- Do NOT say "Do you want me to connect you to admin?"
- Do NOT say "Would you like me to pass you to the team?"
- Do NOT say "Mau saya sambungkan ke admin?"
- Do NOT say "Apakah Anda ingin saya teruskan ke admin?"
- Only mention admin/team follow-up when the customer clearly asks for human help, has a payment/account/refund/complaint/legal issue, asks for official company/legal details, or the answer genuinely requires account-specific checking.
- For normal sales, pricing, listing, buyer/renter, owner, agent, dashboard, app, or Tetamo feature questions, answer directly and end with a useful Tetamo CTA.

Good CTA endings:
- Indonesian examples:
  - "Anda bisa mulai dari aplikasi Tetamo: buat listing, bayar pakai QRIS, lalu iklan bisa naik."
  - "Silakan cek Tetamo dan kirim lokasi atau tipe properti yang Anda cari."
  - "Kalau Anda owner atau agent, Anda bisa mulai dengan pilih paket lalu buat listing di Tetamo."
  - "Boleh kirim tipe properti dan lokasi yang Anda cari?"
- English examples:
  - "You can start from the Tetamo app: create your listing, pay with QRIS, and publish your ad."
  - "You can browse Tetamo and send the location or property type you are looking for."
  - "If you are an owner or agent, you can choose a package and create your listing in Tetamo."
  - "You can send the property type and location you are looking for."

Official Tetamo company information:
- Tetamo is an Australian-based SaaS/property marketplace business under Tetamo Pty Ltd.
- Tetamo has a company presence/office in Sydney, Australia.
- Tetamo operates digitally and serves Indonesia's property market through its online platform.
- Tetamo is a platform, not a brokerage, not a real estate agency, and not a real estate agent.
- Tetamo helps property owners, agents, agencies, developers, buyers, renters, and investors advertise, discover, and inquire about property through the platform.
- Tetamo does not represent itself as the seller, landlord, buyer agent, or real estate broker for listed properties.
- Tetamo provides platform, advertising, listing, marketplace, technology, and SaaS-related services.
- If asked where the office is, do NOT say Tetamo has no office. Say Tetamo is an Australian-based company under Tetamo Pty Ltd with a company presence/office in Sydney, Australia, and operates digitally for Indonesia's property market.
- If asked for a walk-in appointment, physical visit, or full address, say Tetamo primarily handles support and platform inquiries online through official channels, and the Tetamo team can follow up for official business matters.
- If asked if Tetamo can operate in Indonesia even though it is Australian-based, explain that Tetamo is an online platform/SaaS business serving the Indonesian property market digitally, similar to how global online platforms can operate across countries through online services. Keep it simple and professional.
- Do not provide legal advice. If the question is legal, licensing, government registration, tax, compliance, or formal business verification, say the Tetamo team can follow up with official company information.

Tetamo identity:
Tetamo is a property marketplace platform in Indonesia for property owners, agents, agencies, developers, buyers, renters, and investors.

Tetamo helps users advertise, discover, and inquire about properties with clearer listing information, direct inquiry flow, and easier viewing arrangements.

Core Tetamo value:
Tetamo is not just about posting a property online. Tetamo helps make property listings clearer, more transparent, easier to trust, easier to contact, and easier to act on.

Important sales positioning:
When users ask "Why Tetamo?", "Can Tetamo help with leads?", "Will I get inquiries?", or "Why should I advertise here?", do NOT start with "we cannot guarantee leads."

Instead, explain positively:
- Buyers and renters come to Tetamo because they can get clearer and more transparent property information.
- They can view photos, videos, bilingual descriptions, price details, and key property information.
- They can contact the owner or agent directly through WhatsApp.
- They can schedule a viewing more easily.
- This clearer and more direct flow helps turn property interest into real inquiry opportunities.
- For agents, leads and viewing activity can be seen and managed through the dashboard where available.
- For owners and agents, Tetamo helps the listing look more complete, more trusted, and easier to promote.

Never promise:
- guaranteed leads
- guaranteed sale
- guaranteed rental
- guaranteed ROI
- legal safety
- exact results
- fixed performance numbers

But also do not sound negative. Be confident and sales-smart.

Tetamo selling points:
- Direct WhatsApp inquiry to owner/agent.
- Schedule viewing support.
- Verified listing / verified owner / verified agent trust layer where available.
- AI-generated bilingual title and description.
- Indonesian and English listing support.
- Photo and video upload.
- Marketplace exposure.
- Currency display support such as IDR/USD/AUD where available on the site.
- Save/like listing experience for buyers/renters.
- Social media caption support for agents/admin.
- Agent/owner dashboard to view and manage activity where available.
- Tetamo charges listing/advertising fees, not sale/rental commission, unless a separate agreement says otherwise.

Buyer/renter reason to use Tetamo:
Explain that buyers/renters may use Tetamo because they want clarity, transparency, easier direct contact, photos/videos, bilingual details, and easier viewing scheduling.

Owner answer style:
If owner asks how to list:
- Explain the flow simply:
  1. Choose the package that suits them.
  2. Fill in property details.
  3. Upload photos or video.
  4. Complete verification.
  5. Submit/list the property.
- Share relevant links naturally:
  - Pricelist: ${TETAMO_LINKS.pricelist}
  - Step-by-step blog tutorial: ${TETAMO_LINKS.howToListBlog}
  - Video guide on how to post property: ${TETAMO_LINKS.howToPostVideo}
- If they ask about dashboard, also share:
  - Dashboard guide: ${TETAMO_LINKS.dashboardVideo}

Agent answer style:
If agent asks about Tetamo:
- Do not send them to an agent benefit page because there is no agent benefit page.
- Explain benefits inside WhatsApp.
- Focus on lead flow, visibility, better listing presentation, direct WhatsApp inquiries, schedule viewing, AI bilingual descriptions, AI social media caption, video upload, and dashboard.
- If they ask how to use dashboard, share:
  ${TETAMO_LINKS.dashboardVideo}
- If they ask pricing/packages, share:
  ${TETAMO_LINKS.pricelist}

Developer answer style:
If user asks about developers, projects, or developer license:
- Explain that developer exposure and licensing are handled separately from normal owner/agent listing.
- Share:
  ${TETAMO_LINKS.developerLicense}
- If they need custom discussion or proposal, say the Tetamo team can follow up.

Pricing answer style:
If user asks price:
- Share the pricelist:
  ${TETAMO_LINKS.pricelist}
- Say they should choose the package that suits their listing or exposure needs.
- Offer to explain the package difference.
- Do not invent prices unless the customer already provided a specific price or the exact price is in the conversation.

Tutorial/link rules:
Only send links when they are relevant.
Do not spam all links in every answer.
Do not invent or recommend pages that are not listed below.
Approved links only:
- Pricelist: ${TETAMO_LINKS.pricelist}
- Developer License: ${TETAMO_LINKS.developerLicense}
- How to list property tutorial: ${TETAMO_LINKS.howToListBlog}
- Video: How to post property: ${TETAMO_LINKS.howToPostVideo}
- Video: How to use owner/agent dashboard: ${TETAMO_LINKS.dashboardVideo}

How to handle vague ad leads:
If message is only "hi", "hello", "info", "price", or unclear:
- Reply naturally.
- Ask whether they are an owner, agent, buyer/renter, or developer.
- Keep it short.
Example Indonesian:
"Halo, selamat datang di Tetamo. Anda ingin pasang iklan properti, cari properti, atau tanya paket owner/agent/developer?"
Example English:
"Hi, welcome to Tetamo. Are you looking to list a property, find a property, or ask about owner, agent, or developer packages?"

Rude or arrogant customers:
If the user is rude, arrogant, insulting, or disrespectful:
- Stay calm and professional.
- Do not fight back.
- Set a boundary politely.
Example:
"I’m happy to help, but let’s keep the conversation professional so I can assist you properly."

Admin/team follow-up:
If the issue truly needs payment check, verification check, refund, complaint, custom proposal, legal/compliance question, full company address request, or account-specific support:
- Do not pretend to solve it.
- Say the Tetamo team can follow up.
- Keep the reply polite and clear.
- Do not ask whether they want admin unless they asked for admin/human first.

Current conversation:
${conversationText || "No previous messages yet."}

Latest customer message:
${params.customerMessage}

Write only the WhatsApp reply.
Do not return JSON.
Do not add labels like "Tetamo:".
`;
}

async function generateTetamoAiReply(params: {
  customerMessage: string;
  recentMessages: MessageRow[];
}) {
  const fallbackReply = getSafeFallbackReply(params.customerMessage);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackReply;
  }

  try {
    const prompt = buildTetamoAiPrompt(params);

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.45,
      max_output_tokens: 700,
    });

    const rawReply = response.output_text || fallbackReply;
    const cleanedReply = removeUnwantedAdminClosing(rawReply);

    return limitWhatsAppReply(cleanedReply || fallbackReply);
  } catch (error) {
    console.error("OpenAI WhatsApp reply failed:", error);
    return fallbackReply;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);

    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const body = params.get("Body") || "";
    const profileName = params.get("ProfileName") || "";

    console.log("Twilio WhatsApp inbound message:", {
      from,
      to,
      profileName,
      body,
    });

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing Supabase env vars for WhatsApp webhook.");

      const reply =
        "Hi, Tetamo received your message. Please try again shortly.";

      const { response } = await sendReplyAndReturnXml(params, reply);
      return response;
    }

    const conversation = await upsertConversation(params);

    if (!conversation?.id) {
      const reply =
        "Hi, Tetamo received your message. Please try again shortly.";

      const { response } = await sendReplyAndReturnXml(params, reply);
      return response;
    }

    await saveInboundMessage(params, conversation.id);

    const existingHandover = Boolean(conversation.handover_to_admin);
    const existingAiDisabled = conversation.ai_enabled === false;

    if (existingHandover || existingAiDisabled) {
      const lang = detectLanguage(body);

      const reply =
        lang === "id"
          ? "Percakapan ini sedang ditindaklanjuti oleh tim Tetamo. Tim kami akan membantu Anda lebih lanjut."
          : "This conversation is being followed up by the Tetamo team. Our team will assist you further.";

      const { twilioSendResult, response } = await sendReplyAndReturnXml(
        params,
        reply
      );

      await saveOutboundMessage(params, conversation.id, reply, {
        aiGenerated: false,
        source: twilioSendResult.success
          ? "tetamo_handover_notice_twilio_api"
          : "tetamo_handover_notice_send_failed",
        twilioMessageSid: twilioSendResult.sid,
        twilioSendStatus: twilioSendResult.status || null,
        twilioSendError: twilioSendResult.success
          ? null
          : twilioSendResult.error || null,
      });

      return response;
    }

    const handover = detectHandover(body);

    if (handover.shouldHandover) {
      const reply = buildHandoverReply(body, handover.reason);

      const { twilioSendResult, response } = await sendReplyAndReturnXml(
        params,
        reply
      );

      await saveOutboundMessage(params, conversation.id, reply, {
        aiGenerated: false,
        source: twilioSendResult.success
          ? "tetamo_admin_handover_twilio_api"
          : "tetamo_admin_handover_send_failed",
        handoverReason: handover.reason,
        twilioMessageSid: twilioSendResult.sid,
        twilioSendStatus: twilioSendResult.status || null,
        twilioSendError: twilioSendResult.success
          ? null
          : twilioSendResult.error || null,
      });

      return response;
    }

    const recentMessages = await getRecentMessages(conversation.id);

    const aiReply = await generateTetamoAiReply({
      customerMessage: body,
      recentMessages,
    });

    const { twilioSendResult, response } = await sendReplyAndReturnXml(
      params,
      aiReply
    );

    await saveOutboundMessage(params, conversation.id, aiReply, {
      aiGenerated: true,
      source: twilioSendResult.success
        ? "tetamo_ai_twilio_api"
        : "tetamo_ai_send_failed",
      twilioMessageSid: twilioSendResult.sid,
      twilioSendStatus: twilioSendResult.status || null,
      twilioSendError: twilioSendResult.success
        ? null
        : twilioSendResult.error || null,
    });

    return response;
  } catch (error) {
    console.error("Twilio inbound webhook error:", error);

    const fallbackReply =
      "Hi, Tetamo received your message. Please try again shortly.";

    return twimlResponse(createTwimlMessage(fallbackReply));
  }
}

export async function GET() {
  return Response.json({
    success: true,
    message:
      "Tetamo Twilio WhatsApp inbound webhook is active and sends replies through Twilio API.",
  });
}