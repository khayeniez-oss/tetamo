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

export type MonaKnowledgeResolutionInput = {
  decision: MonaConversationDecision;
  hasApprovedKnowledge: boolean;
};

export type MonaKnowledgeResolution =
  MonaConversationDecision & {
    knowledgeMatched: boolean;
    shouldSavePendingQuestion: boolean;
    shouldPauseAi: boolean;
  };

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveSource(
  source?: MonaConversationSource
): MonaConversationSource {
  return source ?? "unknown";
}

function buildCampaignRecord(
  campaignContext?: MonaCampaignContext | null
) {
  if (!campaignContext) {
    return null;
  }

  return {
    campaign_id:
      cleanString(campaignContext.campaignId) || null,

    recipient_id:
      cleanString(campaignContext.recipientId) || null,

    template_name:
      cleanString(campaignContext.templateName) || null,

    template_language:
      cleanString(campaignContext.templateLanguage) ||
      null,

    template_category:
      cleanString(campaignContext.templateCategory) ||
      null,

    send_type:
      cleanString(campaignContext.sendType) || null,
  };
}

/**
 * First stage of Mona's conversation flow.
 *
 * This stage:
 * - builds the current conversation state;
 * - classifies the incoming message;
 * - applies basic business rules;
 * - decides whether the message is eligible for Knowledge Base search.
 *
 * It does not decide whether Mona knows the answer.
 */
export function runMonaConversationEngine(
  input: MonaConversationEngineInput
): MonaConversationDecision {
  const source = resolveSource(input.source);

  const state = buildMonaConversationState({
    conversation: {
      id: cleanString(input.conversationId) || null,

      customer_phone:
        cleanString(input.customerPhone) || null,

      is_blocked:
        input.isBlocked ?? false,

      ai_enabled:
        input.aiEnabled ?? true,

      handover_to_admin:
        input.handoverToAdmin ?? false,

      source,
    },

    campaign: buildCampaignRecord(
      input.campaignContext
    ),

    incomingMessage: {
      text: cleanString(input.customerMessage),

      type:
        cleanString(input.messageType).toLowerCase() ||
        "text",
    },

    fallbackConversationId:
      cleanString(input.conversationId) || null,

    fallbackCustomerPhone:
      cleanString(input.customerPhone) || null,

    fallbackSource: source,
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

/**
 * Final stage after the server searches the approved Knowledge Base.
 *
 * Approved match:
 * - Mona may generate a reply.
 *
 * No approved match:
 * - Mona sends no reply;
 * - the original question must be saved as Pending;
 * - AI must be paused;
 * - the conversation must be handed to admin.
 */
export function resolveMonaKnowledgeDecision(
  input: MonaKnowledgeResolutionInput
): MonaKnowledgeResolution {
  const { decision, hasApprovedKnowledge } = input;

  /*
   * Messages rejected by the first-stage business rules
   * must not continue into Knowledge Base handling.
   */
  if (decision.action !== "reply") {
    return {
      ...decision,
      knowledgeMatched: false,
      shouldSavePendingQuestion: false,
      shouldPauseAi: false,
    };
  }

  /*
   * Mona may reply only when approved knowledge was found.
   */
  if (hasApprovedKnowledge) {
    return {
      ...decision,
      action: "reply",
      reason:
        "Approved Knowledge Base content was found.",
      shouldGenerateReply: true,
      shouldHandover: false,
      knowledgeMatched: true,
      shouldSavePendingQuestion: false,
      shouldPauseAi: false,
    };
  }

  /*
   * No approved knowledge means silence and admin handover.
   */
  return {
    ...decision,
    action: "handover",
    reason:
      "No approved Knowledge Base content matched the customer message.",
    shouldGenerateReply: false,
    shouldHandover: true,
    knowledgeMatched: false,
    shouldSavePendingQuestion: true,
    shouldPauseAi: true,
  };
}