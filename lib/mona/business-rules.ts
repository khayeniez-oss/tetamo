import type {
  MonaConversationAction,
  MonaConversationDecision,
  MonaConversationSource,
  MonaConversationIntent,
  MonaCampaignContext,
} from "./conversation-engine";

import type { MonaConversationState } from "./conversation-state";
import type { MonaClassificationResult } from "./classifier";

export type MonaBusinessRuleInput = {
  state: MonaConversationState;
  classification: MonaClassificationResult;
};

function createDecision(params: {
  action: MonaConversationAction;
  intent: MonaConversationIntent;
  source: MonaConversationSource;
  confidence: number;
  reason: string;
  campaignContext: MonaCampaignContext | null;
}): MonaConversationDecision {
  return {
    action: params.action,
    intent: params.intent,
    source: params.source,
    confidence: params.confidence,
    reason: params.reason,

    shouldGenerateReply: params.action === "reply",
    shouldHandover: params.action === "handover",

    campaignContext: params.campaignContext,

    promptContext: {
      source: params.source,
      intent: params.intent,
      campaignTemplateName:
        params.campaignContext?.templateName || null,
      campaignTemplateCategory:
        params.campaignContext?.templateCategory || null,
      campaignSendType:
        params.campaignContext?.sendType || null,
    },
  };
}

export function applyMonaBusinessRules(
  input: MonaBusinessRuleInput
): MonaConversationDecision {
  const { state, classification } = input;

  if (state.isBlocked) {
    return createDecision({
      action: "ignore",
      intent: classification.intent,
      source: state.source,
      confidence: 1,
      reason: "Customer is blocked.",
      campaignContext: state.campaignContext,
    });
  }

  if (!state.aiEnabled) {
    return createDecision({
      action: "ignore",
      intent: classification.intent,
      source: state.source,
      confidence: 1,
      reason: "AI is disabled.",
      campaignContext: state.campaignContext,
    });
  }

  if (state.handoverToAdmin) {
    return createDecision({
      action: "ignore",
      intent: classification.intent,
      source: state.source,
      confidence: 1,
      reason: "Conversation already assigned to admin.",
      campaignContext: state.campaignContext,
    });
  }

  if (classification.requiresHumanReview) {
    return createDecision({
      action: "handover",
      intent: classification.intent,
      source: state.source,
      confidence: classification.confidence,
      reason: classification.reason,
      campaignContext: state.campaignContext,
    });
  }

  if (!classification.isTextMessage) {
    if (state.source === "campaign") {
      return createDecision({
        action: "ignore",
        intent: classification.intent,
        source: state.source,
        confidence: 1,
        reason: "Ignore media replies from campaign recipients.",
        campaignContext: state.campaignContext,
      });
    }

    return createDecision({
      action: "reply",
      intent: classification.intent,
      source: state.source,
      confidence: classification.confidence,
      reason: "Allow Mona to respond to media messages.",
      campaignContext: state.campaignContext,
    });
  }

  if (classification.isAutomaticReply) {
    return createDecision({
      action: "ignore",
      intent: classification.intent,
      source: state.source,
      confidence: classification.confidence,
      reason: classification.reason,
      campaignContext: state.campaignContext,
    });
  }

  if (classification.isSimpleAcknowledgement) {
    if (state.source === "campaign") {
      return createDecision({
        action: "ignore",
        intent: classification.intent,
        source: state.source,
        confidence: classification.confidence,
        reason: "Ignore simple campaign acknowledgements.",
        campaignContext: state.campaignContext,
      });
    }

    return createDecision({
      action: "reply",
      intent: classification.intent,
      source: state.source,
      confidence: classification.confidence,
      reason: "Allow Mona to continue organic conversations.",
      campaignContext: state.campaignContext,
    });
  }

  return createDecision({
    action: "reply",
    intent: classification.intent,
    source: state.source,
    confidence: classification.confidence,
    reason: classification.reason,
    campaignContext: state.campaignContext,
  });
}
