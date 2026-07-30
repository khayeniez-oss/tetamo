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

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeLowercase(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function resolveBoolean(
  value: boolean | null | undefined,
  fallback: boolean
): boolean {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function resolveSource(params: {
  conversation: MonaConversationRecord | null;
  campaign: MonaCampaignRecord | null;
  fallbackSource?: MonaConversationSource;
}): MonaConversationSource {
  const campaignId = cleanString(
    params.campaign?.campaign_id
  );

  if (campaignId) {
    return "campaign";
  }

  const storedSource = normalizeLowercase(
    params.conversation?.source
  );

  if (storedSource === "campaign") {
    return "campaign";
  }

  if (
    storedSource === "advertisement" ||
    storedSource === "ad"
  ) {
    return "advertisement";
  }

  if (storedSource === "support") {
    return "support";
  }

  if (storedSource === "organic") {
    return "organic";
  }

  return params.fallbackSource ?? "unknown";
}

function resolveCampaignContext(
  campaign: MonaCampaignRecord | null
): MonaCampaignContext | null {
  if (!campaign) {
    return null;
  }

  const campaignContext: MonaCampaignContext = {
    campaignId:
      cleanString(campaign.campaign_id) || null,

    recipientId:
      cleanString(campaign.recipient_id) || null,

    templateName:
      cleanString(campaign.template_name) || null,

    templateLanguage:
      cleanString(campaign.template_language) || null,

    templateCategory:
      cleanString(campaign.template_category) || null,

    sendType:
      cleanString(campaign.send_type) || null,
  };

  const hasCampaignContext = Object.values(
    campaignContext
  ).some((value) => Boolean(value));

  return hasCampaignContext
    ? campaignContext
    : null;
}

function resolveConversationStatus(params: {
  isBlocked: boolean;
  aiEnabled: boolean;
  handoverToAdmin: boolean;
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

  return "active";
}

export function buildMonaConversationState(
  input: MonaConversationStateInput
): MonaConversationState {
  const conversation = input.conversation ?? null;
  const campaign = input.campaign ?? null;

  const conversationId =
    cleanString(conversation?.id) ||
    cleanString(input.fallbackConversationId) ||
    null;

  const customerPhone =
    cleanString(conversation?.customer_phone) ||
    cleanString(input.fallbackCustomerPhone) ||
    null;

  const customerMessage = cleanString(
    input.incomingMessage.text
  );

  const messageType =
    normalizeLowercase(input.incomingMessage.type) ||
    "text";

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

  const source = resolveSource({
    conversation,
    campaign,
    fallbackSource: input.fallbackSource,
  });

  const campaignContext =
    resolveCampaignContext(campaign);

  const status = resolveConversationStatus({
    isBlocked,
    aiEnabled,
    handoverToAdmin,
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