import type {
  MonaCampaignContext,
  MonaConversationAction,
  MonaConversationDecision,
  MonaConversationIntent,
  MonaConversationSource,
} from "./conversation-engine";

import type { MonaClassificationResult } from "./classifier";
import type { MonaConversationState } from "./conversation-state";

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
  const shouldGenerateReply =
    params.action === "reply";

  const shouldHandover =
    params.action === "handover";

  return {
    action: params.action,
    intent: params.intent,
    source: params.source,
    confidence: params.confidence,
    reason: params.reason,
    shouldGenerateReply,
    shouldHandover,
    campaignContext: params.campaignContext,
    promptContext: {
      source: params.source,
      intent: params.intent,
      campaignTemplateName:
        params.campaignContext?.templateName ?? null,
      campaignTemplateCategory:
        params.campaignContext?.templateCategory ?? null,
      campaignSendType:
        params.campaignContext?.sendType ?? null,
    },
  };
}

function createIgnoreDecision(params: {
  state: MonaConversationState;
  classification: MonaClassificationResult;
  reason: string;
}): MonaConversationDecision {
  return createDecision({
    action: "ignore",
    intent: params.classification.intent,
    source: params.state.source,
    confidence: 1,
    reason: params.reason,
    campaignContext: params.state.campaignContext,
  });
}

export function applyMonaBusinessRules(
  input: MonaBusinessRuleInput
): MonaConversationDecision {
  const { state, classification } = input;

  /*
   * Blocked customers must not receive automated replies.
   */
  if (state.isBlocked) {
    return createIgnoreDecision({
      state,
      classification,
      reason: "Customer is blocked.",
    });
  }

  /*
   * When AI has already been paused, Mona must remain silent.
   */
  if (!state.aiEnabled) {
    return createIgnoreDecision({
      state,
      classification,
      reason: "AI is disabled for this conversation.",
    });
  }

  /*
   * When the conversation has already been passed to admin,
   * Mona must not reply again.
   */
  if (state.handoverToAdmin) {
    return createIgnoreDecision({
      state,
      classification,
      reason:
        "Conversation is already assigned to admin.",
    });
  }

  /*
   * Automatic system replies must not trigger Mona.
   */
  if (classification.isAutomaticReply) {
    return createIgnoreDecision({
      state,
      classification,
      reason: classification.reason,
    });
  }

  /*
   * Mona currently answers text messages only.
   *
   * Media messages are not sent to the reply generator because
   * they cannot be reliably matched against a text Knowledge Base.
   */
  if (!classification.isTextMessage) {
    return createIgnoreDecision({
      state,
      classification,
      reason:
        "Message is not a supported text message.",
    });
  }

  /*
   * Do not allow the classifier to decide admin handover.
   *
   * The conversation engine must first search the approved
   * Knowledge Base.
   *
   * MATCH FOUND:
   * - generate a reply using that approved knowledge.
   *
   * NO MATCH:
   * - send no AI reply;
   * - save the message as a Pending Question;
   * - pause AI;
   * - pass the conversation to admin.
   */
  return createDecision({
    action: "reply",
    intent: classification.intent,
    source: state.source,
    confidence: classification.confidence,
    reason:
      "Message is eligible for approved Knowledge Base retrieval.",
    campaignContext: state.campaignContext,
  });
}