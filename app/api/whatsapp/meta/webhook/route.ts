import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

import {
  cleanMonaAdminClosing,
  cleanMonaIdentityIntroduction,
  detectMonaLanguage,
  isMonaIdentityQuestion,
  limitMonaReply,
  type MonaLanguage,
} from "@/lib/mona/behaviour";
import { searchApprovedMonaKnowledge } from "@/lib/mona/knowledge";
import { buildMonaPrompt } from "@/lib/mona/prompt";

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
  return cleanEnv(process.env.META_DIRECT_WHATSAPP_ACCESS_TOKEN);
}

function getPhoneNumberId(fallback?: string | null) {
  return (
    cleanEnv(fallback) ||
    cleanEnv(process.env.META_DIRECT_WHATSAPP_PHONE_NUMBER_ID)
  );
}

/**
 * Process only the WhatsApp business phone number IDs explicitly configured
 * for this Meta Direct webhook. If none are configured, fail closed.
 */
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

function getMetaBusinessSenderKey(phoneNumberId: string) {
  return `meta:${phoneNumberId}`;
}

function getMetaConversationKey(phoneNumberId: string, customerPhone: string) {
  return `${getMetaBusinessSenderKey(phoneNumberId)}:${customerPhone}`;
}

function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function randomNumberBetween(minimum: number, maximum: number) {
  return Math.floor(
    Math.random() * (maximum - minimum + 1) + minimum
  );
}

function getMonaResponseDelay(reply: string) {
  const characterCount = String(reply || "").trim().length;

  if (characterCount <= 120) {
    return randomNumberBetween(2300, 2900);
  }

  if (characterCount <= 600) {
    return randomNumberBetween(6000, 8000);
  }

  return randomNumberBetween(10000, 12000);
}

function getFallbackReply(
  customerMessage: string,
  language: MonaLanguage
) {
  if (isMonaIdentityQuestion(customerMessage)) {
    return language === "id"
      ? "Halo, saya Mona dari Tetamo. Saya bisa bantu seputar Tetamo dan properti."
      : "Hi, I’m Mona from Tetamo. I can help with Tetamo and property-related questions.";
  }

  return language === "id"
    ? "Maaf, saya belum memiliki informasi terkonfirmasi untuk menjawab pertanyaan itu. Bisa jelaskan sedikit lebih spesifik tentang bantuan yang Anda butuhkan?"
    : "Sorry, I don’t currently have confirmed information to answer that. Could you briefly clarify what you need help with?";
}

function getMediaRedirectReply(language: MonaLanguage) {
  if (language === "en") {
    return `Thanks, your photo or video has been received.

Property listings cannot be created by sending media through WhatsApp. Owners and agents need to sign up or log in to Tetamo and create the listing from their own dashboard.

Upload at least 3 property photos. You may also add a video if available.`;
  }

  return `Terima kasih, foto atau video sudah diterima.

Listing properti tidak dapat dibuat dengan mengirim media melalui WhatsApp. Pemilik dan agen perlu sign up atau log in ke Tetamo lalu membuat listing melalui dashboard mereka sendiri.

Upload minimal 3 foto properti. Video juga dapat ditambahkan jika tersedia.`;
}

async function getConversationContext(
  conversationId: string,
  currentCustomerMessage: string
) {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("direction, message, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error("Failed to load Mona conversation context:", error);
    return null;
  }

  const orderedMessages = (data || []).slice().reverse();

  const latestMessage = orderedMessages.at(-1);
  if (
    latestMessage?.direction === "inbound" &&
    String(latestMessage.message || "").trim() ===
      String(currentCustomerMessage || "").trim()
  ) {
    orderedMessages.pop();
  }

  const messages = orderedMessages
    .map((item) => {
      const speaker = item.direction === "outbound" ? "Mona" : "Customer";
      return `${speaker}: ${String(item.message || "").trim()}`;
    })
    .filter((item) => !item.endsWith(": "));

  if (!messages.length) {
    return null;
  }

  return messages.join("\n").slice(-6000);
}

async function generateMonaReply(params: {
  customerMessage: string;
  conversationId: string;
}) {
  const language = detectMonaLanguage(params.customerMessage);
  const fallback = getFallbackReply(params.customerMessage, language);

  if (!process.env.OPENAI_API_KEY) {
    return fallback;
  }

  try {
    const [knowledgeEntries, conversationContext] = await Promise.all([
      searchApprovedMonaKnowledge({
        supabase: supabaseAdmin,
        customerMessage: params.customerMessage,
        language,
      }),
      getConversationContext(
        params.conversationId,
        params.customerMessage
      ),
    ]);

    const prompt = buildMonaPrompt({
      customerMessage: params.customerMessage,
      language,
      knowledgeEntries,
      conversationContext,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.35,
      max_output_tokens: 650,
    });

    const rawReply = response.output_text || fallback;
    const withoutIdentity = cleanMonaIdentityIntroduction(
      rawReply,
      params.customerMessage
    );
    const withoutAdminClosing = cleanMonaAdminClosing(withoutIdentity);

    return limitMonaReply(withoutAdminClosing || fallback);
  } catch (error) {
    console.error("Meta Direct WhatsApp AI generation failed:", error);
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
    console.error("Meta Direct send skipped. Missing required data.", {
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
    console.error("Meta Direct WhatsApp send failed:", result);

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
    console.error("Failed to upsert Meta Direct WhatsApp conversation:", error);
    return null;
  }

  return data as {
    id: string;
    phone: string;
    phone_e164?: string | null;
    channel: string;
    business_sender_key?: string | null;
    conversation_key?: string | null;
    ai_enabled?: boolean | null;
    handover_to_admin?: boolean | null;
    handover_reason?: string | null;
    free_entry_point_expires_at?: string | null;
    free_entry_point_source?: string | null;
    ad_referral_source?: string | null;
  };
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
    console.error(
      "Failed to check Meta Direct WhatsApp message deduplication:",
      error
    );
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
  const { error } = await supabaseAdmin.from("whatsapp_messages").insert({
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
    media_count: params.messageType && params.messageType !== "text" ? 1 : 0,
    raw_payload: {
      meta_message_id: params.metaMessageId,
      meta_message_type: params.messageType || null,
      meta_referral: params.referral || null,
      meta_payload: params.rawPayload,
    },
    created_at: new Date().toISOString(),
  });

  if (error?.code === "23505") {
    return {
      stored: false,
      duplicate: true,
    };
  }

  if (error) {
    console.error("Failed to save Meta Direct inbound WhatsApp message:", error);
    return {
      stored: false,
      duplicate: false,
    };
  }

  return {
    stored: true,
    duplicate: false,
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
      source: "tetamo_mona_meta",
      provider: "meta",
      provider_message_id: params.metaSendId,
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
    console.error("Failed to save Meta Direct outbound WhatsApp message:", messageError);
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
      "Failed to update Meta Direct WhatsApp conversation after reply:",
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

  console.log("Meta Direct WhatsApp webhook verification request:", {
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
      console.error("Missing Supabase env vars for Meta Direct WhatsApp webhook.");
      return Response.json({ success: true, stored: false });
    }

    const webhookMessages = extractWebhookMessages(payload);

    let processedCount = 0;
    let ignoredCount = 0;
    let duplicateCount = 0;

    for (const item of webhookMessages) {
      const incomingPhoneNumberId = cleanEnv(item.phoneNumberId);

      if (!isAllowedBusinessPhoneNumberId(incomingPhoneNumberId)) {
        ignoredCount += 1;

        console.log(
          "Tetamo ignored Meta Direct webhook for non-allowed phone number.",
          {
            incomingPhoneNumberId: incomingPhoneNumberId || "missing",
            allowedPhoneNumberIdCount:
              getAllowedBusinessPhoneNumberIds().length,
          }
        );

        continue;
      }

      const customerPhone = normalizePhone(item.message.from || "");
      const textBody = String(item.message.text?.body || "").trim();
      const phoneNumberId = getPhoneNumberId(incomingPhoneNumberId);
      const metaMessageId = cleanEnv(item.message.id);
      const isTextMessage = item.message.type === "text" && Boolean(textBody);
      const referral = item.message.referral || null;

      if (!customerPhone || !phoneNumberId) {
        ignoredCount += 1;
        continue;
      }

      if (await hasProcessedMetaInboundMessage(metaMessageId)) {
        duplicateCount += 1;
        continue;
      }

      const messageText = isTextMessage
        ? textBody
        : "[Customer sent photo, video, or non-text WhatsApp message]";

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
        messageType: item.message.type || null,
      });

      if (inboundSave.duplicate) {
        duplicateCount += 1;
        continue;
      }

      if (!inboundSave.stored) {
        ignoredCount += 1;
        continue;
      }

      if (blockedNumber) {
        processedCount += 1;
        continue;
      }

      if (conversation.handover_to_admin || conversation.ai_enabled === false) {
        processedCount += 1;
        continue;
      }

      const reply = isTextMessage
        ? await generateMonaReply({
            customerMessage: messageText,
            conversationId: conversation.id,
          })
        : getMediaRedirectReply("id");

      await sleep(getMonaResponseDelay(reply));

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
      duplicateCount,
    });
  } catch (error) {
    console.error("Meta Direct WhatsApp webhook error:", error);
    return Response.json({ success: true, error_logged: true });
  }
}
