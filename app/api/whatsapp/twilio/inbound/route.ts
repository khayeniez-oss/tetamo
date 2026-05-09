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

const TETAMO_LINKS = {
  marketplace: "https://www.tetamo.com/properti",
  ownerListing: "https://www.tetamo.com/pemilik/iklan",
  pricelist: "https://www.tetamo.com/pricelist",
  faq: "https://www.tetamo.com/faq",
  blog: "https://www.tetamo.com/blog",
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

  if (clean.length <= 1400) return clean;

  return clean.slice(0, 1390).trim() + "...";
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
    "sewa",
    "pemilik",
    "agent",
    "agen",
    "bisa",
    "admin",
    "tolong",
  ];

  return indonesianHints.some((word) => lower.includes(word)) ? "id" : "en";
}

function detectHandover(message: string): HandoverResult {
  const lower = message.toLowerCase();

  const handoverRules: Array<{ reason: string; keywords: string[] }> = [
    {
      reason: "Customer requested human/admin",
      keywords: [
        "admin",
        "human",
        "real person",
        "orang asli",
        "orang beneran",
        "manusia",
        "cs",
        "customer service",
        "speak to someone",
        "bicara dengan admin",
        "hubungi admin",
      ],
    },
    {
      reason: "Payment issue",
      keywords: [
        "i already paid",
        "already paid",
        "payment failed",
        "payment problem",
        "paid but",
        "sudah bayar",
        "saya sudah bayar",
        "pembayaran gagal",
        "masalah pembayaran",
        "invoice",
        "receipt",
        "struk",
        "bukti bayar",
      ],
    },
    {
      reason: "Refund or complaint",
      keywords: [
        "refund",
        "complaint",
        "complain",
        "komplain",
        "keluhan",
        "pengembalian dana",
        "uang kembali",
        "laporan",
      ],
    },
    {
      reason: "Verification or document issue",
      keywords: [
        "verification rejected",
        "verifikasi ditolak",
        "dokumen ditolak",
        "document rejected",
        "ktp",
        "sertifikat bermasalah",
        "verification problem",
        "masalah verifikasi",
      ],
    },
    {
      reason: "Developer/custom pricing inquiry",
      keywords: [
        "developer pricing",
        "developer package",
        "custom package",
        "special package",
        "paket khusus",
        "harga developer",
        "kerja sama developer",
        "partnership",
        "proposal",
      ],
    },
  ];

  for (const rule of handoverRules) {
    if (rule.keywords.some((keyword) => lower.includes(keyword))) {
      return {
        shouldHandover: true,
        reason: rule.reason,
      };
    }
  }

  return {
    shouldHandover: false,
    reason: "",
  };
}

function buildHandoverReply(message: string, reason: string) {
  const lang = detectLanguage(message);

  if (lang === "id") {
    return `Terima kasih. Untuk hal ini, admin Tetamo perlu membantu secara langsung.

Saya akan tandai percakapan ini untuk ditindaklanjuti oleh admin Tetamo agar dapat dibantu dengan tepat.

Alasan: ${reason}`;
  }

  return `Thank you. This needs to be checked by Tetamo admin directly.

I’ll mark this conversation for admin follow-up so the team can assist you properly.

Reason: ${reason}`;
}

async function upsertConversation(params: URLSearchParams): Promise<ConversationRow | null> {
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
    .limit(10);

  if (error) {
    console.error("Failed to get recent WhatsApp messages:", error);
    return [];
  }

  return ((data || []) as MessageRow[]).reverse();
}

async function saveOutboundMessage(params: URLSearchParams, conversationId: string, reply: string, options?: {
  aiGenerated?: boolean;
  adminGenerated?: boolean;
  source?: string;
  handoverReason?: string;
}) {
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

Main purpose:
Most WhatsApp messages come from Instagram/Facebook/Meta advertising. Reply fast, helpful, human, and sales-aware. Your job is to help Tetamo respond 24/7, qualify leads, explain Tetamo clearly, and guide people to the right next step.

Tetamo identity:
Tetamo is a property marketplace platform in Indonesia. Tetamo helps property owners, agents, agencies, developers, buyers, renters, and investors advertise, discover, and inquire about properties.

Important positioning:
Tetamo is not just a software feature. Owners and agents mainly care about leads and inquiries. When asked "Why Tetamo?", answer like a human:
- Acknowledge that the real concern is whether Tetamo can help generate inquiries.
- Do not guarantee leads.
- Explain that leads depend on property price, location, demand, photos, and listing quality.
- Explain how Tetamo is designed to improve the chance of inquiries by making listings clearer, more trusted, easier to contact, and easier to promote.

Tetamo selling points:
- Direct WhatsApp inquiry to owner/agent.
- No unnecessary middleman in the inquiry flow.
- Schedule viewing support.
- Verified listing / verified owner / verified agent trust layer where available.
- AI-generated bilingual title and description.
- Indonesian and English listing support.
- Photo and video upload.
- Marketplace exposure.
- Currency display support such as IDR/USD/AUD where available on the site.
- Save/like listing experience for buyers/renters.
- Social media caption support for agents/admin.
- Helps agents and owners present listings better and look more professional.
- Tetamo charges listing/advertising fees, not sale/rental commission, unless a separate agreement says otherwise.

Buyer/renter reason to use Tetamo:
Explain that buyers/renters may use Tetamo because they can browse listings, see clearer property details, contact owner/agent directly, arrange viewing more easily, and compare properties in a simpler flow.

Important restrictions:
- Do not promise guaranteed leads, guaranteed sale, guaranteed rent, guaranteed ROI, legal safety, or investment returns.
- Do not say Tetamo is "better than every platform" or attack competitors.
- You may explain why Tetamo is different from ordinary property portals in a professional way.
- Do not invent exact prices if not sure.
- Do not invent policy details.
- Do not send users to a non-existing "agent benefit page".
- If asked for agent benefits, explain inside WhatsApp and offer admin follow-up for package details.
- Keep replies WhatsApp-friendly. Prefer short paragraphs.
- Use Indonesian if customer writes Indonesian. Use English if customer writes English.
- If user is rude, arrogant, or disrespectful, stay polite but firm. Say that Tetamo is happy to help, but the conversation should remain professional.

Available links:
Use links only when helpful. Do not spam links.
- Browse properties: ${TETAMO_LINKS.marketplace}
- Owner listing start: ${TETAMO_LINKS.ownerListing}
- Pricelist: ${TETAMO_LINKS.pricelist}
- FAQ: ${TETAMO_LINKS.faq}
- Blog/tips: ${TETAMO_LINKS.blog}

How to handle common ad leads:
1. If the message is just "hi", "hello", or vague:
Ask whether they are owner, agent, buyer/renter, or developer.
2. If owner wants to list:
Explain the owner listing flow and share owner listing link.
3. If agent asks why use Tetamo:
Explain lead logic, presentation, direct inquiry, AI bilingual content, social caption, video upload, schedule viewing, and visibility. Do not send agent benefit page.
4. If buyer/renter wants property:
Guide them to marketplace and ask location/budget/property type.
5. If pricing:
Share pricelist link if appropriate, but for special/custom pricing say admin can follow up.
6. If developer/custom package/payment/refund/complaint/verification issue:
Say admin needs to follow up. Do not pretend to solve private account issues.

Current conversation:
${conversationText || "No previous messages yet."}

Latest customer message:
${params.customerMessage}

Write only the WhatsApp reply. Do not return JSON. Do not add labels like "Tetamo:".
`;
}

async function generateTetamoAiReply(params: {
  customerMessage: string;
  recentMessages: MessageRow[];
}) {
  if (!process.env.OPENAI_API_KEY) {
    const lang = detectLanguage(params.customerMessage);

    return lang === "id"
      ? "Halo, selamat datang di Tetamo. Terima kasih sudah menghubungi kami. Saat ini AI sedang belum tersedia, namun pesan Anda sudah kami terima."
      : "Hi, welcome to Tetamo. Thank you for contacting us. Our AI is temporarily unavailable, but we have received your message.";
  }

  const prompt = buildTetamoAiPrompt(params);

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
    temperature: 0.45,
    max_output_tokens: 500,
  });

  return limitWhatsAppReply(
    response.output_text ||
      "Hi, welcome to Tetamo. Thank you for contacting us. How can we assist you today?"
  );
}

export async function POST(req: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.error("Missing Supabase env vars for WhatsApp webhook.");

      const reply =
        "Hi, Tetamo received your message. Please try again shortly.";

      return new Response(createTwimlMessage(reply), {
        status: 200,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
        },
      });
    }

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

    const conversation = await upsertConversation(params);

    if (!conversation?.id) {
      const reply =
        "Hi, Tetamo received your message. Please try again shortly.";

      return new Response(createTwimlMessage(reply), {
        status: 200,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
        },
      });
    }

    await saveInboundMessage(params, conversation.id);

    const existingHandover = Boolean(conversation.handover_to_admin);
    const existingAiDisabled = conversation.ai_enabled === false;

    if (existingHandover || existingAiDisabled) {
      const lang = detectLanguage(body);

      const reply =
        lang === "id"
          ? "Terima kasih. Percakapan ini sudah ditandai untuk ditindaklanjuti oleh admin Tetamo. Tim kami akan membantu Anda lebih lanjut."
          : "Thank you. This conversation has already been marked for Tetamo admin follow-up. Our team will assist you further.";

      await saveOutboundMessage(params, conversation.id, reply, {
        aiGenerated: false,
        source: "tetamo_handover_notice",
      });

      return new Response(createTwimlMessage(reply), {
        status: 200,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
        },
      });
    }

    const handover = detectHandover(body);

    if (handover.shouldHandover) {
      const reply = buildHandoverReply(body, handover.reason);

      await saveOutboundMessage(params, conversation.id, reply, {
        aiGenerated: false,
        source: "tetamo_admin_handover",
        handoverReason: handover.reason,
      });

      return new Response(createTwimlMessage(reply), {
        status: 200,
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
        },
      });
    }

    const recentMessages = await getRecentMessages(conversation.id);

    const aiReply = await generateTetamoAiReply({
      customerMessage: body,
      recentMessages,
    });

    await saveOutboundMessage(params, conversation.id, aiReply, {
      aiGenerated: true,
      source: "tetamo_ai",
    });

    return new Response(createTwimlMessage(aiReply), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Twilio inbound webhook error:", error);

    const fallbackReply =
      "Hi, Tetamo received your message. Please try again shortly.";

    return new Response(createTwimlMessage(fallbackReply), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  }
}

export async function GET() {
  return Response.json({
    success: true,
    message:
      "Tetamo Twilio WhatsApp inbound webhook is active with AI reply and Supabase logging.",
  });
}