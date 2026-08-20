


import { createClient } from "@supabase/supabase-js";
import {
  runMonaOrchestrator,
  markMonaReplySuccessfullySent,
  resetMonaFollowUpCycleForCustomerReply,
} from "../../../../lib/mona/orchestrator";
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

  status?: string | null;
  ai_enabled?: boolean | null;
  handover_to_admin?: boolean | null;
  handover_reason?: string | null;
  opted_out_at?: string | null;

  free_entry_point_expires_at?: string | null;
  free_entry_point_source?: string | null;
  ad_referral_source?: string | null;

  sales_stage?: SalesStage | null;
  suggested_sales_stage?: SalesStage | null;
  suggested_sales_stage_reason?: string | null;
  suggested_sales_stage_confidence?: number | null;
  suggested_sales_stage_at?: string | null;

  mona_followup_count?: number | null;
  mona_followup_waiting_since?: string | null;
  mona_first_followup_sent_at?: string | null;
  mona_next_followup_due_at?: string | null;
  mona_dependency_controlled?: boolean | null;
  mona_dependency_reason?: string | null;
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

async function saveSalesStageSuggestion(params: {
  conversationId: string;
  suggestion: SalesStageSuggestion | null;
}) {
  /*
   * No new evidence means "leave the CRM state alone".
   *
   * When Stage does provide a suggestion, persist it as the actual CRM stage
   * as well as the suggestion/audit fields. Otherwise sales_stage remains stale
   * forever and Stage protection rules cannot work correctly on later turns.
   */
  if (!params.suggestion) return true;

  const updatedAt = new Date().toISOString();

  const updatePayload = {
    /*
     * Stage is an automatic CRM observer now.
     *
     * A valid Stage decision becomes the actual CRM stage immediately.
     * It is NOT placed into a manual "Mona suggestion" approval queue.
     */
    sales_stage: params.suggestion.stage,
    sales_stage_updated_at: updatedAt,
    sales_stage_updated_by: null,

    /*
     * Clear any legacy review suggestion so the Admin dashboard does not
     * show a stale Approve / Ignore task for an already-applied stage.
     */
    suggested_sales_stage: null,
    suggested_sales_stage_reason: null,
    suggested_sales_stage_confidence: null,
    suggested_sales_stage_at: null,
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

      /*
       * Admin now owns the conversation. An old Mona silence timer must not
       * survive the handover and fire after an eventual Resume AI.
       */
      mona_followup_count: 0,
      mona_followup_waiting_since: null,
      mona_first_followup_sent_at: null,
      mona_next_followup_due_at: null,
      mona_dependency_controlled: false,
      mona_dependency_reason: null,
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
    /*
     * Do not force an existing conversation back to "active" on every inbound.
     * Status such as opted_out / admin-owned state must survive ordinary
     * customer messages. New rows can use the database default.
     */
    ...(params.isBlocked ? { status: "blocked" } : {}),
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
      "id, phone, phone_e164, channel, business_sender_key, conversation_key, status, ai_enabled, handover_to_admin, handover_reason, opted_out_at, free_entry_point_expires_at, free_entry_point_source, ad_referral_source, sales_stage, suggested_sales_stage, suggested_sales_stage_reason, suggested_sales_stage_confidence, suggested_sales_stage_at, mona_followup_count, mona_followup_waiting_since, mona_first_followup_sent_at, mona_next_followup_due_at, mona_dependency_controlled, mona_dependency_reason"
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
  sendSucceeded: boolean;
}) {
  const outboundAt = new Date().toISOString();

  const { error: messageError } = await supabaseAdmin
    .from("whatsapp_messages")
    .insert({
      conversation_id: params.conversationId,

      /*
       * A failed outbound attempt is a system/audit event, not a conversational
       * Mona turn. Memory must never conclude that the customer saw text that
       * Meta failed to deliver.
       */
      direction: params.sendSucceeded ? "outbound" : "system",
      from_number: params.businessPhoneNumberId,
      to_number: params.customerPhone,
      phone: `whatsapp:+${params.customerPhone}`,
      profile_name: params.profileName,
      message: params.sendSucceeded
        ? params.reply
        : "[Mona outbound send failed]",
      source: params.source,
      provider: "meta",
      provider_message_id: params.metaSendId,
      ai_generated: params.sendSucceeded ? params.aiGenerated : false,
      admin_generated: false,
      media_count: 0,
      raw_payload: {
        meta_send_id: params.metaSendId,
        meta_send_error: params.metaSendError,
        intended_reply: params.sendSucceeded ? null : params.reply,
      },
      created_at: outboundAt,
    });

  if (messageError) {
    console.error("Failed to save Meta outbound WhatsApp message:", messageError);
  }

  /*
   * A failed Meta send remains stored above for audit/debugging,
   * but it must NOT make the conversation look as though Mona
   * successfully replied.
   */
  if (!params.sendSucceeded) {
    return {
      outboundAt,
      stored: !messageError,
    };
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
      "Failed to update Meta conversation after successful reply:",
      conversationError
    );
  }

  return {
    outboundAt,
    stored: !messageError,
  };
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


async function isMonaStillAllowedToReply(
  conversationId: string
) {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select("ai_enabled, handover_to_admin, opted_out_at, status")
    .eq("id", conversationId)
    .maybeSingle();

  if (error || !data) {
    console.error(
      "Failed to recheck Mona conversation state before reply:",
      error
    );

    // Fail closed: never send if current ownership/state cannot be verified.
    return false;
  }

  const status = String(data.status || "")
    .trim()
    .toLowerCase();

  return (
    data.ai_enabled !== false &&
    data.handover_to_admin !== true &&
    !data.opted_out_at &&
    status !== "blocked" &&
    status !== "opted_out"
  );
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

      /*
       * If Admin already owns this conversation, Safety will intentionally stop
       * Mona before the normal Orchestrator reset runs. The customer's new reply
       * must still cancel any stale Mona silence timer.
       */
      if (
        conversation.ai_enabled === false ||
        conversation.handover_to_admin === true
      ) {
        try {
          await resetMonaFollowUpCycleForCustomerReply({
            supabase: supabaseAdmin,
            conversationId: conversation.id,
          });
        } catch (error) {
          console.error(
            "Failed to clear stale Mona follow-up state while AI is paused:",
            error
          );
        }
      }

      /*
       * Do not make Mona/Safety decisions here.
       *
       * The message has already been safely persisted.
       * Safety inside Orchestrator receives the actual message type and
       * conversation state and decides whether Mona should continue,
       * remain silent, or hand over.
       */
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

      const campaignContext =
        await getLatestCampaignContext(
          conversation.id
        );

      const salesStage =
        normalizeSalesStage(
          conversation.sales_stage
        );

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

        /*
         * Inbound event origin.
         * This is a genuine Meta customer event saved above.
         */
        messageDirection: "inbound",
        messageSource: "meta",
        aiGenerated: false,
        adminGenerated: false,
        isCampaign: false,
        isSystem: false,

        /*
         * Conversation/account Safety state.
         */
        blocked: blockedNumber,
        optedOut:
          Boolean(conversation.opted_out_at) ||
          String(conversation.status || "")
            .trim()
            .toLowerCase() === "opted_out",

        aiPaused:
          conversation.ai_enabled === false,

        adminTakeover:
          conversation.handover_to_admin === true,
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

      const stillAllowedToReply = await isMonaStillAllowedToReply(
        conversation.id
      );

      if (!stillLatestAfterDelay || !stillAllowedToReply) {
        console.log(
          "Mona V2 cancelled reply because the conversation changed during human delay.",
          {
            conversationId: conversation.id,
            humanDelayMs,
            stillLatestAfterDelay,
            stillAllowedToReply,
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
        sendSucceeded:
          sendResult.success,
      });

      processedCount += 1;

      if (sendResult.success) {
        replyCount += 1;

        const dependencyControlled =
          generation.brain.timingDependency.active ===
          true;

        const dependencyReason =
          dependencyControlled
            ? (
                generation.brain.timingDependency.reason ||
                generation.brain.latestMeaning ||
                "Customer has an explicit timing dependency."
              )
            : null;

        try {
          await markMonaReplySuccessfullySent({
            supabase: supabaseAdmin,
            conversationId:
              conversation.id,
            dependencyControlled,
            dependencyReason,
          });
        } catch (error) {
          /*
           * Do not resend the WhatsApp message if Timing persistence fails.
           * The customer already received the reply.
           *
           * Log the failure so we can repair follow-up state safely.
           */
          console.error(
            "Mona reply sent successfully but follow-up timing state could not be started:",
            error
          );
        }
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
