import { saveKnowledgeCandidate } from "@/lib/mona/knowledge-candidates";
import {
  runMonaV2,
  type RunMonaV2Result,
} from "@/lib/mona-v2/orchestrator";
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
import { runMonaConversationEngine } from "@/lib/mona/conversation-engine";
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

type CampaignContext = {
  campaignId: string;
  recipientId: string | null;
  templateName: string;
  templateLanguage: string | null;
  templateCategory: string | null;
  sendType: string | null;
  sentAt: string | null;
};

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

type MonaV2Mode = "off" | "shadow" | "live";

function getMonaV2Mode(): MonaV2Mode {
  const configuredMode = cleanEnv(
    process.env.MONA_V2_MODE
  ).toLowerCase();

  if (
    configuredMode === "shadow" ||
    configuredMode === "live"
  ) {
    return configuredMode;
  }

  return "off";
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

function getMonaV2LivePhoneAllowlist() {
  const configuredPhones = cleanEnv(
    process.env.MONA_V2_LIVE_PHONE_ALLOWLIST
  );

  return Array.from(
    new Set(
      configuredPhones
        .split(/[,\s]+/)
        .map((value) => normalizePhone(value))
        .filter(Boolean)
    )
  );
}

function getMonaV2ModeForCustomer(
  customerPhone: string
): MonaV2Mode {
  const configuredMode = getMonaV2Mode();

  if (configuredMode !== "live") {
    return configuredMode;
  }

  const normalizedCustomerPhone =
    normalizePhone(customerPhone);

  if (!normalizedCustomerPhone) {
    return "shadow";
  }

  return getMonaV2LivePhoneAllowlist().includes(
    normalizedCustomerPhone
  )
    ? "live"
    : "shadow";
}

function isMonaAiEnabled(value: unknown) {
  return value !== false;
}

function containsExternalLink(value?: string | null) {
  const message = String(value || "").trim();

  if (!message) return false;

  return /(?:https?:\/\/|www\.|(?:[a-z0-9-]+\.)+(?:com|net|org|id|co\.id|io|app|me|link|site|online|store)\b)/i.test(
    message
  );
}

function isEmojiOnlyMessage(value?: string | null) {
  const compact = String(value || "").replace(/\s+/g, "");

  if (!compact) return false;

  const withoutEmoji = compact
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu, "")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "");

  return withoutEmoji.length === 0;
}

function getUnsupportedMessageHandoverReason(params: {
  messageType?: string | null;
  messageText?: string | null;
}) {
  const messageType = String(params.messageType || "").trim().toLowerCase();
  const messageText = String(params.messageText || "").trim();

  if (messageType !== "text") {
    const labels: Record<string, string> = {
      image: "Customer sent a photo",
      video: "Customer sent a video",
      audio: "Customer sent an audio or voice message",
      document: "Customer sent a document",
      sticker: "Customer sent a sticker",
      location: "Customer sent a location",
      contacts: "Customer sent contact information",
      contact: "Customer sent contact information",
      reaction: "Customer sent a reaction",
    };

    return labels[messageType] || `Customer sent unsupported WhatsApp content: ${
      messageType || "unknown"
    }`;
  }

  if (containsExternalLink(messageText)) {
    return "Customer sent a link";
  }

  if (isEmojiOnlyMessage(messageText)) {
    return "Customer sent an emoji-only message";
  }

  return null;
}

function sanitiseAdminStyleExample(value?: string | null) {
  return String(value || "")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/www\.\S+/gi, "[link]")
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[email]"
    )
    .replace(/\+?\d[\d\s().-]{6,}\d/g, "[number]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);
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

  console.log("Mona paused for admin handover.", {
    conversationId: params.conversationId,
    reason: params.reason,
  });

  return true;
}

async function getRecentAdminStyleExamples(
  language: MonaLanguage
) {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_messages")
    .select("message, created_at")
    .eq("direction", "outbound")
    .eq("admin_generated", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Failed to load Mona admin style examples:", error);
    return null;
  }

  const examples = (data || [])
    .map((item) => sanitiseAdminStyleExample(item.message))
    .filter(Boolean)
    .filter((message) => detectMonaLanguage(message) === language)
    .slice(0, 6);

  if (!examples.length) {
    return null;
  }

  return examples
    .map((message, index) => `Admin example ${index + 1}: ${message}`)
    .join("\n");
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
    .select(
      "direction, message, created_at, admin_generated, ai_generated"
    )
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(12);

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
      let speaker = "Customer";

      if (item.direction === "outbound") {
        speaker = item.admin_generated ? "Admin" : "Mona";
      }

      return `${speaker}: ${String(item.message || "").trim()}`;
    })
    .filter((item) => !item.endsWith(": "));

  if (!messages.length) {
    return null;
  }

  return messages.join("\n").slice(-8000);
}

async function runMonaV2ForMeta(params: {
  customerMessage: string;
  messageType?: string | null;
  conversationId: string;
  sourceMessageId?: string | null;
  campaignContext?: CampaignContext | null;
  persistKnowledgeCandidate: boolean;
}): Promise<RunMonaV2Result> {
  const recentMessages =
    await getConversationContext(
      params.conversationId,
      params.customerMessage
    );

  const campaignContext = params.campaignContext
    ? [
        `Template: ${
          params.campaignContext.templateName ||
          "unknown"
        }`,
        `Category: ${
          params.campaignContext.templateCategory ||
          "unknown"
        }`,
        `Send type: ${
          params.campaignContext.sendType ||
          "unknown"
        }`,
        `Sent at: ${
          params.campaignContext.sentAt ||
          "unknown"
        }`,
      ].join("\n")
    : null;

  return runMonaV2({
    customerMessage: params.customerMessage,
    messageType: params.messageType || "text",
    conversationContext: {
      recentMessages,
      campaignContext,
    },
    knowledgeCandidateContext: {
      enabled:
        params.persistKnowledgeCandidate,
      conversationId: params.conversationId,
      sourceMessageId:
        params.sourceMessageId || null,
    },
    supabase: supabaseAdmin,
  });
}

function getMonaV2PauseReason(
  result: RunMonaV2Result
): string | null {
  if (result.decision.shouldPauseForAdmin) {
    return `Mona V2 requested admin handover for ${result.analysis.intent}`;
  }

  if (
    result.tetamoKnowledge?.shouldPauseForAdmin
  ) {
    return `Mona V2 Tetamo Knowledge requires admin review for ${result.analysis.intent}`;
  }

  if (
    result.propertyEducation?.shouldPauseForAdmin
  ) {
    return `Mona V2 property education requires admin review for ${result.analysis.intent}`;
  }

  if (result.decision.shouldUseTetamoTool) {
    return `Mona V2 requires an unavailable Tetamo system tool for ${result.analysis.intent}`;
  }

  if (!result.reply) {
    return `Mona V2 produced no reply for ${result.analysis.intent}`;
  }

  return null;
}

function logMonaV2ShadowComparison(params: {
  conversationId: string;
  oldDecision:
    | {
        shouldReply: true;
        reply: string;
      }
    | {
        shouldReply: false;
        reason: string;
      };
  v2Result: RunMonaV2Result;
}) {
  console.log("Mona V2 shadow comparison.", {
    conversationId: params.conversationId,
    oldMonaShouldReply:
      params.oldDecision.shouldReply,
    oldMonaReplyLength:
      params.oldDecision.shouldReply
        ? params.oldDecision.reply.length
        : 0,
    oldMonaReason:
      params.oldDecision.shouldReply
        ? null
        : params.oldDecision.reason,
    v2Intent:
      params.v2Result.analysis.intent,
    v2Route:
      params.v2Result.analysis.knowledgeRoute,
    v2Action:
      params.v2Result.analysis.action,
    v2HasReply:
      Boolean(params.v2Result.reply),
    v2ReplyLength:
      params.v2Result.reply?.length || 0,
    v2ShouldPause:
      Boolean(
        getMonaV2PauseReason(
          params.v2Result
        )
      ),
    v2TetamoMatched:
      params.v2Result.tetamoKnowledge?.matched ??
      null,
    v2PropertyMatched:
      params.v2Result.propertyEducation?.matched ??
      null,
    v2NeedsExternalResearch:
      params.v2Result.propertyEducation
        ?.requiresExternalResearch ?? null,
  });
}

async function generateMonaReply(params: {
  customerMessage: string;
  conversationId: string;
  sourceMessageId?: string | null;
  campaignContext?: CampaignContext | null;
}): Promise<
  | {
      shouldReply: true;
      reply: string;
    }
  | {
      shouldReply: false;
      reason: string;
    }
> {
  const language = detectMonaLanguage(params.customerMessage);

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

    if (knowledgeEntries.length === 0) {
      await saveKnowledgeCandidate({
        supabase: supabaseAdmin,
        sourceMessageId: params.sourceMessageId || null,
        conversationId: params.conversationId,
        customerMessage: params.customerMessage,
        language,
      });

      const reason = "No relevant approved Knowledge Base answer";

      await pauseMonaForAdmin({
        conversationId: params.conversationId,
        reason,
      });

      return {
        shouldReply: false,
        reason,
      };
    }

    if (!process.env.OPENAI_API_KEY) {
      const reason = "Mona AI generation is unavailable";

      await pauseMonaForAdmin({
        conversationId: params.conversationId,
        reason,
      });

      return {
        shouldReply: false,
        reason,
      };
    }

    const campaignInstruction = params.campaignContext
      ? `

CAMPAIGN CONTEXT (internal):
The customer is replying after Tetamo sent a WhatsApp template campaign.
Template: ${params.campaignContext.templateName || "unknown"}.
Category: ${params.campaignContext.templateCategory || "unknown"}.
Send type: ${params.campaignContext.sendType || "unknown"}.
Answer in relation to that campaign when relevant.
Never mention campaign IDs, routing, logs or internal metadata.`
      : "";

    const styleInstruction = `

MONA PERSONALITY AND RESPONSE STYLE:
- Use the approved Knowledge Base only as the factual source.
- Do not copy and paste the Knowledge Base answer word-for-word.
- Speak like a real, experienced Tetamo team member.
- Sound warm, calm, welcoming, professional and genuinely helpful.
- Match the customer's language and level of formality naturally.
- Answer the customer's actual question first and directly.
- Keep the response concise and easy to read in WhatsApp.
- Be gently sales-aware, but never pushy or aggressive.
- Never pressure the customer to register, pay, advertise, book, buy or make a commitment.
- Do not treat every message as an opportunity to close a sale.
- Do not end every response with a question.
- Ask one follow-up question only when information is genuinely required to answer correctly.
- Never end with sales-closing questions such as “Do you want to start now?”, “Would you like to register?”, or similar wording.
- When no follow-up is required, finish naturally with a warm offer of help, without asking for a commitment.
- Avoid robotic wording, excessive enthusiasm, repetitive greetings and excessive emojis.
- Use at most one subtle, appropriate emoji when it genuinely makes the message warmer.
- Never invent prices, policies, services, promises, links or property facts.
- Admin examples are communication-style references only, never factual sources.
- Never repeat private names, phone numbers, email addresses, links, property details or customer-specific information from an admin example.`;

    const combinedContext = [
      conversationContext
        ? `CURRENT CONVERSATION:\n${conversationContext}`
        : null,
      params.campaignContext ? campaignInstruction.trim() : null,
      styleInstruction,
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt = buildMonaPrompt({
      customerMessage: params.customerMessage,
      language,
      knowledgeEntries,
      conversationContext: combinedContext || null,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      temperature: 0.45,
      max_output_tokens: 650,
    });

    const rawReply = String(response.output_text || "").trim();

    if (!rawReply) {
      const reason = "Mona produced an empty response";

      await pauseMonaForAdmin({
        conversationId: params.conversationId,
        reason,
      });

      return {
        shouldReply: false,
        reason,
      };
    }

    const withoutIdentity = cleanMonaIdentityIntroduction(
      rawReply,
      params.customerMessage
    );

    const withoutAdminClosing =
      cleanMonaAdminClosing(withoutIdentity);

    const finalReply = limitMonaReply(
      withoutAdminClosing || rawReply
    );

    return {
      shouldReply: true,
      reply: finalReply,
    };
  } catch (error) {
    console.error("Meta Direct WhatsApp AI generation failed:", error);

    const reason = "Mona AI generation failed";

    await pauseMonaForAdmin({
      conversationId: params.conversationId,
      reason,
    });

    return {
      shouldReply: false,
      reason,
    };
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
        params.messageType && params.messageType !== "text" ? 1 : 0,
      raw_payload: {
        meta_message_id: params.metaMessageId,
        meta_message_type: params.messageType || null,
        meta_referral: params.referral || null,
        meta_payload: params.rawPayload,
      },
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    return {
      stored: false,
      duplicate: true,
      messageId: null,
    };
  }

  if (error) {
    console.error(
      "Failed to save Meta Direct inbound WhatsApp message:",
      error
    );

    return {
      stored: false,
      duplicate: false,
      messageId: null,
    };
  }

  return {
    stored: true,
    duplicate: false,
    messageId: data?.id ? String(data.id) : null,
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

      // Hard Meta Mona lock: once the conversation needs admin, save the
      // inbound message but remain completely silent until Resume AI is used.
      if (
        !isMonaAiEnabled(conversation.ai_enabled) ||
        conversation.handover_to_admin === true
      ) {
        console.log("Meta Mona remains silent while conversation needs admin.", {
          conversationId: conversation.id,
          aiEnabled: conversation.ai_enabled,
          handoverToAdmin: conversation.handover_to_admin,
          handoverReason: conversation.handover_reason || null,
        });

        processedCount += 1;
        continue;
      }

      const unsupportedHandoverReason =
        getUnsupportedMessageHandoverReason({
          messageType: item.message.type || null,
          messageText: isTextMessage ? messageText : null,
        });

      if (unsupportedHandoverReason) {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: unsupportedHandoverReason,
        });

        processedCount += 1;
        continue;
      }

      const campaignContext = await getLatestCampaignContext(
        conversation.id
      );

      const engineDecision = runMonaConversationEngine({
        customerMessage: messageText,
        messageType: item.message.type || null,
        conversationId: conversation.id,
        customerPhone,
        source: referral ? "advertisement" : "organic",
        campaignContext,
        isBlocked: blockedNumber,
        aiEnabled: isMonaAiEnabled(conversation.ai_enabled),
        handoverToAdmin: Boolean(conversation.handover_to_admin),
      });

      if (!engineDecision.shouldGenerateReply) {
        console.log("Mona reply suppressed by conversation engine.", {
          conversationId: conversation.id,
          action: engineDecision.action,
          intent: engineDecision.intent,
          source: engineDecision.source,
          confidence: engineDecision.confidence,
          reason: engineDecision.reason,
          campaignId: campaignContext?.campaignId || null,
          templateName: campaignContext?.templateName || null,
        });
        processedCount += 1;
        continue;
      }

      const configuredMonaV2Mode =
        getMonaV2Mode();
      const monaV2Mode =
        getMonaV2ModeForCustomer(customerPhone);

      if (configuredMonaV2Mode === "live") {
        console.log(
          "Mona V2 live allowlist decision.",
          {
            conversationId: conversation.id,
            effectiveMode: monaV2Mode,
            allowlisted: monaV2Mode === "live",
            livePhoneAllowlistCount:
              getMonaV2LivePhoneAllowlist()
                .length,
          }
        );
      }

      let monaDecision:
        | {
            shouldReply: true;
            reply: string;
          }
        | {
            shouldReply: false;
            reason: string;
          };

      if (monaV2Mode === "off") {
        monaDecision = await generateMonaReply({
          customerMessage: messageText,
          conversationId: conversation.id,
          sourceMessageId:
            inboundSave.messageId,
          campaignContext,
        });
      } else if (monaV2Mode === "shadow") {
        const shadowPromise =
          runMonaV2ForMeta({
            customerMessage: messageText,
            messageType:
              item.message.type || null,
            conversationId:
              conversation.id,
            sourceMessageId:
              inboundSave.messageId,
            campaignContext,
            persistKnowledgeCandidate: false,
          }).catch(
            (
              error
            ): RunMonaV2Result | null => {
              console.error(
                "Mona V2 shadow execution failed:",
                error
              );

              return null;
            }
          );

        const [
          oldMonaDecision,
          shadowResult,
        ] = await Promise.all([
          generateMonaReply({
            customerMessage: messageText,
            conversationId:
              conversation.id,
            sourceMessageId:
              inboundSave.messageId,
            campaignContext,
          }),
          shadowPromise,
        ]);

        monaDecision = oldMonaDecision;

        if (shadowResult) {
          logMonaV2ShadowComparison({
            conversationId:
              conversation.id,
            oldDecision:
              oldMonaDecision,
            v2Result: shadowResult,
          });
        }
      } else {
        try {
          const v2Result =
            await runMonaV2ForMeta({
              customerMessage: messageText,
              messageType:
                item.message.type || null,
              conversationId:
                conversation.id,
              sourceMessageId:
                inboundSave.messageId,
              campaignContext,
              persistKnowledgeCandidate: true,
            });

          if (
            v2Result.decision.shouldIgnore
          ) {
            monaDecision = {
              shouldReply: false,
              reason:
                "Mona V2 intentionally ignored this message.",
            };
          } else {
            const pauseReason =
              getMonaV2PauseReason(
                v2Result
              );

            if (pauseReason) {
              await pauseMonaForAdmin({
                conversationId:
                  conversation.id,
                reason: pauseReason,
              });

              monaDecision = {
                shouldReply: false,
                reason: pauseReason,
              };
            } else {
              monaDecision = {
                shouldReply: true,
                reply: limitMonaReply(
                  v2Result.reply || ""
                ),
              };
            }
          }
        } catch (error) {
          console.error(
            "Mona V2 live execution failed. Falling back to current Mona:",
            error
          );

          monaDecision =
            await generateMonaReply({
              customerMessage:
                messageText,
              conversationId:
                conversation.id,
              sourceMessageId:
                inboundSave.messageId,
              campaignContext,
            });
        }
      }

      if (!monaDecision.shouldReply) {
        console.log("Mona did not send a reply.", {
          conversationId: conversation.id,
          mode: monaV2Mode,
          reason: monaDecision.reason,
        });

        processedCount += 1;
        continue;
      }

      const reply = monaDecision.reply;

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
