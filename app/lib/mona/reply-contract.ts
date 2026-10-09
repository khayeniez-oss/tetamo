import type { MonaBrainDecision } from "./brain";

// These are resolved meanings, not keyword guesses about the raw message.
const FACTUAL_INTENTS = new Set([
  "platform_features", "feature_details", "feature_example",
  "feature_availability", "package_features", "package_price",
  "package_recommendation", "competitor_comparison", "proof_testimonial",
  "traffic_growth", "buyer_availability", "buyer_quality",
  "guarantee_question", "how_to_list", "how_to_use", "registration",
  "payment", "general_information",
]);

export function requiresApprovedReplyFacts(brain: MonaBrainDecision): boolean {
  return brain.understood && !brain.handoverRecommended && (
    brain.factualKnowledgeNeeded || brain.knowledgeRequest.length > 0 ||
    FACTUAL_INTENTS.has(brain.intent)
  );
}

export function preserveReplyFactRequest(brain: MonaBrainDecision): MonaBrainDecision {
  if (!requiresApprovedReplyFacts(brain)) return brain;
  const requests = [...brain.knowledgeRequest];
  if (!requests.length) {
    requests.push(`Approved Tetamo facts for ${brain.intent}: ${brain.latestMeaning}`);
  }
  return {
    ...brain,
    factualKnowledgeNeeded: true,
    knowledgeRequest: requests,
  };
}
