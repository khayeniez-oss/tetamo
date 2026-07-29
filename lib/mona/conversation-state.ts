import type {
  MonaCampaignContext,
  MonaConversationEngineInput,
  MonaConversationSource,
} from "./conversation-engine";

export type MonaConversationStatus =
  | "active"
  | "ai_disabled"
  | "admin_handover"
  | "blocked";

export type MonaConversationRecord = {
  id?: string | null;
  customer_phone?: string | null;

  ai_enabled?: boolean | null;
  handover_to_admin?: boolean | null;
  is_blocked?: boolean | null;

  source?: string | null;
  status?: string | null;
};

export type MonaCampaignRecord = {
  campaign_id?: string | null;
  recipient_id?: string | null;
  template_name?: string | null;
  template_language?: string | null;
  template_category?: string | null;
  send_type?: string | null;
};

export type MonaIncomingMessage = {
  text?: string | null;
  type?: string | null;
};

export type MonaConversationStateInput = {
  conversation?: MonaConversationRecord | null;
  campaign?: MonaCampaignRecord | null;
  incomingMessage: MonaIncomingMessage;

  fallbackConversationId?: string | null;
  fallbackCustomerPhone?: string | null;
  fallbackSource?: MonaConversationSource;
};

export type MonaConversationState = {
  conversationId: string | null;
  customerPhone: string | null;

  customerMessage: string;
  messageType: string;

  source: MonaConversationSource;
  status: MonaConversationStatus;

  isBlocked: boolean;
  aiEnabled: boolean;
  handoverToAdmin: boolean;

  campaignContext: MonaCampaignContext | null;

  engineInput: MonaConversationEngineInput;
};

function normalizeString(value?: string | null): string {
  return String(value || "").trim();
}

function normalizeLowercase(value?: string | null): string {
  return normalizeString(value).toLowerCase();
}

function resolveBoolean(
  value: boolean | null | undefined,
  fallback: boolean
): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function resolveSource(
  conversation?: MonaConversationRecord | null,
  campaign?: MonaCampaignRecord | null,
  fallbackSource?: MonaConversationSource
): MonaConversationSource {
  if (normalizeString(campaign?.campaign_id)) {
    return "campaign";
  }

  const source = normalizeLowercase(conversation?.source);

  if (source === "campaign") {
    return "campaign";
  }

  if (source === "advertisement" || source === "ad") {
    return "advertisement";
  }

  if (source === "support") {
    return "support";
  }

  if (source === "organic") {
    return "organic";
  }

  return fallbackSource || "unknown";
}

function resolveCampaignContext(
  campaign?: MonaCampaignRecord | null
): MonaCampaignContext | null {
  if (!campaign) {
    return null;
  }

  const context: MonaCampaignContext = {
    campaignId: normalizeString(campaign.campaign_id) || null,
    recipientId: normalizeString(campaign.recipient_id) || null,
    templateName: normalizeString(campaign.template_name) || null,
    templateLanguage:
      normalizeString(campaign.template_language) || null,
    templateCategory:
      normalizeString(campaign.template_category) || null,
    sendType: normalizeString(campaign.send_type) || null,
  };

  const hasCampaignData = Object.values(context).some(
    (value) => Boolean(value)
  );

  return hasCampaignData ? context : null;
}

function resolveConversationStatus(params: {
  isBlocked: boolean;
  aiEnabled: boolean;
  handoverToAdmin: boolean;
  storedStatus?: string | null;
}): MonaConversationStatus {
  if (params.isBlocked) {
    return "blocked";
  }

  if (params.handoverToAdmin) {
    return "admin_handover";
  }

  if (!params.aiEnabled) {
    return "ai_disabled";
  }

  const storedStatus = normalizeLowercase(params.storedStatus);

  if (
    storedStatus === "blocked" ||
    storedStatus === "admin_handover" ||
    storedStatus === "ai_disabled"
  ) {
    return storedStatus;
  }

  return "active";
}

export function buildMonaConversationState(
  input: MonaConversationStateInput
): MonaConversationState {
  const conversation = input.conversation || null;
  const campaign = input.campaign || null;

  const conversationId =
    normalizeString(conversation?.id) ||
    normalizeString(input.fallbackConversationId) ||
    null;

  const customerPhone =
    normalizeString(conversation?.customer_phone) ||
    normalizeString(input.fallbackCustomerPhone) ||
    null;

  const customerMessage = normalizeString(
    input.incomingMessage.text
  );

  const messageType =
    normalizeLowercase(input.incomingMessage.type) || "text";

  const isBlocked = resolveBoolean(
    conversation?.is_blocked,
    false
  );

  const aiEnabled = resolveBoolean(
    conversation?.ai_enabled,
    true
  );

  const handoverToAdmin = resolveBoolean(
    conversation?.handover_to_admin,
    false
  );

  const source = resolveSource(
    conversation,
    campaign,
    input.fallbackSource
  );

  const campaignContext = resolveCampaignContext(campaign);

  const status = resolveConversationStatus({
    isBlocked,
    aiEnabled,
    handoverToAdmin,
    storedStatus: conversation?.status,
  });

  const engineInput: MonaConversationEngineInput = {
    customerMessage,
    messageType,
    conversationId,
    customerPhone,
    source,
    campaignContext,
    isBlocked,
    aiEnabled,
    handoverToAdmin,
  };

  return {
    conversationId,
    customerPhone,

    customerMessage,
    messageType,

    source,
    status,

    isBlocked,
    aiEnabled,
    handoverToAdmin,

    campaignContext,

    engineInput,
  };
}
