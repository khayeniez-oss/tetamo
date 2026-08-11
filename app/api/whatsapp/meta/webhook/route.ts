import { createClient } from "@supabase/supabase-js";
import { runMonaOrchestrator } from "../../../../lib/mona/orchestrator";
import { waitForMonaHumanDelay } from "../../../../lib/mona/timing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);


type SalesStage =
  | "new_inquiry"
  | "lead"
  | "agent_package"
  | "owner_package"
  | "developer_agency"
  | "follow_up"
  | "payment_started"
  | "payment_failed"
  | "closed_won"
  | "closed_lost";

const SALES_STAGES = new Set<SalesStage>([
  "new_inquiry",
  "lead",
  "agent_package",
  "owner_package",
  "developer_agency",
  "follow_up",
  "payment_started",
  "payment_failed",
  "closed_won",
  "closed_lost",
]);

function normalizeSalesStage(value?: string | null): SalesStage | null {
  const normalized = String(value || "").trim().toLowerCase() as SalesStage;
  return SALES_STAGES.has(normalized) ? normalized : null;
}

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
  sales_stage?: SalesStage | null;
  suggested_sales_stage?: SalesStage | null;
  suggested_sales_stage_reason?: string | null;
  suggested_sales_stage_confidence?: number | null;
  suggested_sales_stage_at?: string | null;
};

type StoredMessageRow = {
  id: string;
  direction: string;
  message: string;
  created_at: string;
  admin_generated?: boolean | null;
  ai_generated?: boolean | null;
};


type MetaSendResult = {
  success: boolean;
  id: string | null;
  error: unknown;
};


type SalesStageSuggestion = {
  stage: SalesStage;
  reason: string;
  confidence: number;
};


function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
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

function isEmojiOnlyText(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return false;

  const remaining = raw
    // Remove keycap emoji sequences first so their digit/#/* base is removed too.
    .replace(/[0-9#*]\uFE0F?\u20E3/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\p{Regional_Indicator}/gu, "")
    .replace(/\p{Emoji_Modifier}/gu, "")
    .replace(/[\u200D\uFE0E\uFE0F]/gu, "")
    // Allow punctuation around an emoji, e.g. "😂!!"
    .replace(/[\s\p{P}]/gu, "")
    .trim();

  return remaining.length === 0;
}

function isRecentCampaignContext(
  context: CampaignContext | null,
  hours = 48
) {
  if (!context?.sentAt) return false;

  const sentAt = new Date(context.sentAt).getTime();
  const age = Date.now() - sentAt;

  return (
    Number.isFinite(age) &&
    age >= 0 &&
    age <= hours * 60 * 60 * 1000
  );
}

function isLikelyAutomaticBusinessReply(
  message: string,
  campaignContext: CampaignContext | null
) {
  if (!isRecentCampaignContext(campaignContext)) return false;

  const normalized = String(message || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  const strongAutomaticPatterns = [
    /terima kasih (?:telah )?menghubungi(?: kami)?/i,
    /pesan (?:anda|kamu) (?:sudah )?(?:kami )?terima/i,
    /kami (?:akan )?(?:segera )?(?:membalas|merespons|merespon) pesan/i,
    /kami sedang (?:tidak tersedia|offline|di luar jam operasional)/i,
    /jam operasional (?:kami|kantor)/i,
    /di luar jam (?:kerja|operasional)/i,
    /balasan otomatis/i,
    /pesan otomatis/i,
    /automated (?:reply|response|message)/i,
    /auto(?:matic)? reply/i,
    /thank you for (?:contacting|messaging|reaching) (?:us|out)/i,
    /we (?:have )?received your message/i,
    /we (?:will|shall) (?:reply|respond|get back to you)/i,
    /we are currently (?:unavailable|offline|away|closed)/i,
    /outside (?:our )?business hours/i,
    /our business hours (?:are|is)/i,
  ];

  return strongAutomaticPatterns.some((pattern) => pattern.test(normalized));
}


async function saveSalesStageSuggestion(params: {
  conversationId: string;
  suggestion: SalesStageSuggestion | null;
}) {
  // Do not erase a pending admin-review suggestion merely because a later
  // acknowledgement such as "ok" or "thank you" has no reliable stage evidence.
  if (!params.suggestion) return true;

  const updatePayload = {
    suggested_sales_stage: params.suggestion.stage,
    suggested_sales_stage_reason: params.suggestion.reason,
    suggested_sales_stage_confidence: params.suggestion.confidence,
    suggested_sales_stage_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update(updatePayload)
    .eq("id", params.conversationId);

  if (error) {
    console.error("Failed to save Mona sales-stage suggestion:", error);
    return false;
  }

  return true;
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
      "id, phone, phone_e164, channel, business_sender_key, conversation_key, ai_enabled, handover_to_admin, handover_reason, free_entry_point_expires_at, free_entry_point_source, ad_referral_source, sales_stage, suggested_sales_stage, suggested_sales_stage_reason, suggested_sales_stage_confidence, suggested_sales_stage_at"
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
    // Fail closed: if we cannot prove this is still the newest inbound message,
    // do not risk sending an outdated Mona reply.
    return false;
  }

  return String(data?.id || "") === String(messageId);
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

      if (
        String(item.message.type || "").toLowerCase() === "text" &&
        isEmojiOnlyText(readableText)
      ) {
        console.log("Ignored emoji-only customer message.", {
          conversationId: conversation.id,
        });

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

      const campaignContext = await getLatestCampaignContext(conversation.id);

      if (isLikelyAutomaticBusinessReply(combinedMessage, campaignContext)) {
        console.log(
          "Meta Mona ignored an automatic business reply after a Tetamo campaign.",
          {
            conversationId: conversation.id,
            campaignId: campaignContext?.campaignId || null,
            templateName: campaignContext?.templateName || null,
          }
        );

        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      const salesStage = normalizeSalesStage(conversation.sales_stage);

      const generation = await runMonaOrchestrator({
        supabase: supabaseAdmin,
        conversationId: conversation.id,
        latestCustomerMessage: combinedMessage,
        messageType,
        excludedMessageIds: burst.messageIds.length
          ? burst.messageIds
          : [inboundSave.messageId],
        campaignContext: campaignContext
          ? {
              templateName: campaignContext.templateName,
              templateLanguage: campaignContext.templateLanguage,
              templateCategory: campaignContext.templateCategory,
              sendType: campaignContext.sendType,
              sentAt: campaignContext.sentAt,
            }
          : null,
        salesStage,
        adminTakeover: conversation.ai_enabled === false,
      });

      await saveSalesStageSuggestion({
        conversationId: conversation.id,
        suggestion: generation.suggestedSalesStage
          ? {
              stage: generation.suggestedSalesStage.stage,
              reason: generation.suggestedSalesStage.reason,
              confidence: generation.suggestedSalesStage.confidence,
            }
          : null,
      });

      if (generation.action === "silent") {
        console.log("Mona V2 stayed silent.", {
          conversationId: conversation.id,
          reason: generation.reason,
        });

        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      if (generation.action === "handover") {
        await pauseMonaForAdmin({
          conversationId: conversation.id,
          reason: generation.reason,
        });

        console.log("Mona V2 handed conversation to admin.", {
          conversationId: conversation.id,
          reason: generation.reason,
        });

        processedCount += 1;
        handoverCount += 1;
        continue;
      }

      const reply = String(generation.reply || "").trim();

      if (!reply) {
        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      const stillLatestBeforeDelay = await isStillLatestInboundMessage(
        conversation.id,
        inboundSave.messageId
      );

      if (!stillLatestBeforeDelay) {
        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      const humanDelayMs = await waitForMonaHumanDelay({
        messageLength: reply.length,
      });

      const stillLatestAfterDelay = await isStillLatestInboundMessage(
        conversation.id,
        inboundSave.messageId
      );

      if (!stillLatestAfterDelay) {
        console.log(
          "Mona V2 cancelled outdated reply because customer sent another message during human delay.",
          {
            conversationId: conversation.id,
            humanDelayMs,
          }
        );

        processedCount += 1;
        ignoredCount += 1;
        continue;
      }

      const sendResult = await sendMetaWhatsappText({
        phoneNumberId,
        to: customerPhone,
        message: reply,
      });

      const sourcePrefix =
        generation.source === "fallback"
          ? "tetamo_mona_v2_fallback_meta"
          : "tetamo_mona_v2_meta";

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

      processedCount += 1;

      if (sendResult.success) {
        replyCount += 1;
      }
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
