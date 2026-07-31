import type {
  MonaV2Analysis,
  MonaV2Decision,
} from "./types";

/**
 * Convert Mona's message analysis into one clear system route.
 *
 * This router does not generate replies, search knowledge,
 * access customer records or pause conversations itself.
 * It only decides which capability should run next.
 */
export function routeMonaV2Analysis(
  analysis: MonaV2Analysis
): MonaV2Decision {
  const baseDecision: MonaV2Decision = {
    analysis,
    shouldSearchTetamoKnowledge: false,
    shouldSearchPropertyKnowledge: false,
    shouldGenerateNaturalReply: false,
    shouldUseTetamoTool: false,
    shouldPauseForAdmin: false,
    shouldIgnore: false,
  };

  /*
   * Explicit human review and handover always take priority.
   */
  if (
    analysis.action === "handover" ||
    analysis.knowledgeRoute === "admin_handover" ||
    analysis.requiresHumanReview
  ) {
    return {
      ...baseDecision,
      shouldPauseForAdmin: true,
    };
  }

  /*
   * Automatic replies, unsupported messages and other
   * intentionally ignored messages receive no response.
   */
  if (analysis.action === "ignore") {
    return {
      ...baseDecision,
      shouldIgnore: true,
    };
  }

  /*
   * Account-specific matters must use an authorised Tetamo
   * system tool instead of being answered from general knowledge.
   */
  if (
    analysis.action === "use_tool" ||
    analysis.knowledgeRoute === "tetamo_system_tool"
  ) {
    return {
      ...baseDecision,
      shouldUseTetamoTool: true,
    };
  }

  /*
   * Official Tetamo facts must come from the approved
   * Tetamo Knowledge Base.
   */
  if (analysis.knowledgeRoute === "tetamo_official") {
    return {
      ...baseDecision,
      shouldSearchTetamoKnowledge: true,
    };
  }

  /*
   * General Indonesian property guidance must come from
   * the property education knowledge layer.
   */
  if (analysis.knowledgeRoute === "property_education") {
    return {
      ...baseDecision,
      shouldSearchPropertyKnowledge: true,
    };
  }

  /*
   * Greetings, acknowledgements, language changes,
   * identity questions and harmless clarification are
   * handled as natural conversation.
   */
  if (
    analysis.knowledgeRoute === "natural_conversation" ||
    analysis.action === "clarify" ||
    analysis.action === "reply"
  ) {
    return {
      ...baseDecision,
      shouldGenerateNaturalReply: true,
    };
  }

  /*
   * A high-risk unresolved analysis fails safely.
   * A harmless unresolved analysis may receive a careful
   * natural clarification rather than automatically pausing AI.
   */
  if (analysis.riskLevel === "high") {
    return {
      ...baseDecision,
      shouldPauseForAdmin: true,
    };
  }

  return {
    ...baseDecision,
    shouldGenerateNaturalReply: true,
  };
}
