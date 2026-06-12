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

function getVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN || "";
}

function getMetaAccessToken() {
  return process.env.META_WHATSAPP_ACCESS_TOKEN || "";
}

function getPhoneNumberId(fallback?: string | null) {
  return (
    fallback ||
    process.env.META_WHATSAPP_PHONE_NUMBER_ID ||
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    ""
  );
}

function getWindowExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry.toISOString();
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

function getFallbackReply(message: string) {
  const lang = detectLanguage(message);

  if (isIdentityQuestion(message)) {
    if (lang === "id") {
      return "Halo, saya Mona dari Tetamo. Saya bisa bantu seputar cari properti, pasang listing, paket owner/agent, dan cara menggunakan Tetamo.";
    }

    return "Hi, I’m Mona from Tetamo. I can help with property search, listings, owner/agent packages, and how to use Tetamo.";
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

Tetamo:
- Tetamo is a property marketplace platform in Indonesia.
- Users can search, buy, sell, or rent property in Tetamo.
- Owners and agents can create property listings.
- Tetamo supports direct WhatsApp inquiry, schedule viewing, verified listing/owner/agent trust layer where available, QRIS payment, photo/video upload, and AI support for title/description.
- Tetamo charges listing/advertising fees, not sale/rental commission unless separately agreed.
- Do not guarantee leads, sale, rental, ROI, or legal safety.

Tone:
- Friendly, professional, sales-smart, clear, WhatsApp-friendly.
- Short paragraphs.
- No long essay unless asked.
- Do not offer admin handover at the end of normal replies.
- Only mention Tetamo team follow-up for payment/account/refund/complaint/legal/custom proposal or account-specific issue.

If vague message like "hi", "info", "price", or "mau tanya":
Ask if they want to pasang iklan properti, cari properti, or ask about owner/agent/developer packages.

Customer message:
${customerMessage}

Write only the WhatsApp reply.
`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.45,
      max_output_tokens: 500,
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
    `https://graph.facebook.com/v25.0/${params.phoneNumberId}/messages`,
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
}) {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .upsert(
      {
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
      },
      {
        onConflict: "phone",
      }
    )
    .select("id, phone, ai_enabled, handover_to_admin, handover_reason")
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
    media_count: 0,
    raw_payload: {
      meta_message_id: params.metaMessageId,
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

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === getVerifyToken() && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return new Response("Forbidden", { status: 403 });
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

    for (const item of webhookMessages) {
      const customerPhone = normalizePhone(item.message.from || "");
      const textBody = String(item.message.text?.body || "").trim();
      const phoneNumberId = getPhoneNumberId(item.phoneNumberId);

      if (!customerPhone) continue;

      const messageText =
        item.message.type === "text" && textBody
          ? textBody
          : detectLanguage(textBody) === "id"
          ? "Pesan Anda sudah diterima. Saat ini Mona dapat membantu paling baik melalui pesan teks."
          : "Your message has been received. Mona can currently help best through text messages.";

      const conversation = await upsertConversation({
        customerPhone,
        profileName: item.profileName,
        messageText,
      });

      if (!conversation?.id) continue;

      await saveInboundMessage({
        conversationId: conversation.id,
        customerPhone,
        businessPhoneNumberId: phoneNumberId,
        profileName: item.profileName,
        messageText,
        metaMessageId: item.message.id || null,
        rawPayload: payload,
      });

      if (conversation.handover_to_admin || conversation.ai_enabled === false) {
        continue;
      }

      const reply = await generateMonaReply(messageText);

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
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Meta WhatsApp webhook error:", error);
    return Response.json({ success: true, error_logged: true });
  }
}