import { applyMonaBusinessRules } from "./business-rules";
import { classifyMonaMessage } from "./classifier";
import { buildMonaConversationState } from "./conversation-state";

export type MonaConversationAction =
  | "reply"
  | "ignore"
  | "handover";

export type MonaConversationIntent =
  | "question"
  | "greeting"
  | "acknowledgement"
  | "automatic_reply"
  | "unsubscribe"
  | "human_support"
  | "complaint"
  | "abuse"
  | "media"
  | "unknown";

export type MonaConversationSource =
  | "organic"
  | "campaign"
  | "advertisement"
  | "support"
  | "unknown";

export type MonaCampaignContext = {
  campaignId?: string | null;
  recipientId?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateCategory?: string | null;
  sendType?: string | null;
};

export type MonaConversationEngineInput = {
  customerMessage: string;
  messageType?: string | null;

  conversationId?: string | null;
  customerPhone?: string | null;

  source?: MonaConversationSource;
  campaignContext?: MonaCampaignContext | null;

  isBlocked?: boolean;
  aiEnabled?: boolean;
  handoverToAdmin?: boolean;
};

export type MonaConversationDecision = {
  action: MonaConversationAction;
  intent: MonaConversationIntent;
  source: MonaConversationSource;
  confidence: number;
  reason: string;

  shouldGenerateReply: boolean;
  shouldHandover: boolean;

  campaignContext: MonaCampaignContext | null;

  promptContext: {
    source: MonaConversationSource;
    intent: MonaConversationIntent;
    campaignTemplateName: string | null;
    campaignTemplateCategory: string | null;
    campaignSendType: string | null;
  };
};

export function runMonaConversationEngine(
  input: MonaConversationEngineInput
): MonaConversationDecision {
  const state = buildMonaConversationState({
    conversation: {
      id: input.conversationId || null,
      customer_phone: input.customerPhone || null,
      is_blocked: input.isBlocked ?? false,
      ai_enabled: input.aiEnabled ?? true,
      handover_to_admin: input.handoverToAdmin ?? false,
      source: input.source || "unknown",
    },

    campaign: input.campaignContext
      ? {
          campaign_id:
            input.campaignContext.campaignId || null,
          recipient_id:
            input.campaignContext.recipientId || null,
          template_name:
            input.campaignContext.templateName || null,
          template_language:
            input.campaignContext.templateLanguage || null,
          template_category:
            input.campaignContext.templateCategory || null,
          send_type:
            input.campaignContext.sendType || null,
        }
      : null,

    incomingMessage: {
      text: input.customerMessage,
      type: input.messageType || "text",
    },

    fallbackConversationId:
      input.conversationId || null,

    fallbackCustomerPhone:
      input.customerPhone || null,

    fallbackSource:
      input.source || "unknown",
  });

  const classification = classifyMonaMessage({
    customerMessage: state.customerMessage,
    messageType: state.messageType,
  });

  return applyMonaBusinessRules({
    state,
    classification,
  });
}
