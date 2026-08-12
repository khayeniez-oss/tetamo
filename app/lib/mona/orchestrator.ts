import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateMonaSafety,
  type MonaSafetyCampaignContext,
} from "./safety";
import {
  loadFullConversationMemory,
  type MonaConversationMemory,
} from "./memory";
import {
  analyseMonaBrain,
  type MonaBrainDecision,
} from "./brain";
import {
  routeMonaSalesStrategy,
  type MonaSalesGuidance,
} from "./sales-router";
import {
  retrieveMonaKnowledge,
  type MonaKnowledgeResult,
} from "./knowledge";
import {
  writeMonaReply,
  type MonaWriterResult,
} from "./writer";
import {
  evaluateMonaSalesStage,
  evaluateExplicitTransactionStage,
  type MonaSalesStageSuggestion,
} from "./stage";

export type MonaOrchestratorResult =
  | {
      action: "reply";
      reply: string;
      source: "openai" | "fallback";
      memory: MonaConversationMemory;
      brain: MonaBrainDecision;
      salesGuidance: MonaSalesGuidance;
      knowledge: MonaKnowledgeResult;
      suggestedSalesStage: MonaSalesStageSuggestion | null;
    }
  | {
      action: "silent";
      reason: string;
      suggestedSalesStage: MonaSalesStageSuggestion | null;
    }
  | {
      action: "handover";
      reason: string;
      suggestedSalesStage: MonaSalesStageSuggestion | null;
    };

type RunMonaOrchestratorParams = {
  supabase: SupabaseClient;
  conversationId: string;
  latestCustomerMessage: string;
  messageType?: string | null;
  excludedMessageIds?: string[];
  campaignContext?: MonaSafetyCampaignContext;
  salesStage?: string | null;
  adminTakeover?: boolean;
};

function memoryToSalesContext(
  memory: MonaConversationMemory
) {
  if (!memory.messages.length) {
    return null;
  }

  return memory.messages
    .map(
      (item) =>
        `[${item.createdAt}] ${item.speaker}: ${item.message}`
    )
    .join("\n");
}

function resolveWriterResult(
  writer: MonaWriterResult,
  context: {
    memory: MonaConversationMemory;
    brain: MonaBrainDecision;
    salesGuidance: MonaSalesGuidance;
    knowledge: MonaKnowledgeResult;
    suggestedSalesStage: MonaSalesStageSuggestion | null;
  }
): MonaOrchestratorResult {
  if (writer.action === "silent") {
    return {
      action: "silent",
      reason:
        "Mona Writer determined that no conversational reply was needed.",
      suggestedSalesStage: context.suggestedSalesStage,
    };
  }

  if (writer.action === "handover") {
    return {
      action: "handover",
      reason: writer.reason,
      suggestedSalesStage: context.suggestedSalesStage,
    };
  }

  return {
    action: "reply",
    reply: writer.reply,
    source: writer.source,
    memory: context.memory,
    brain: context.brain,
    salesGuidance: context.salesGuidance,
    knowledge: context.knowledge,
    suggestedSalesStage: context.suggestedSalesStage,
  };
}

export async function runMonaOrchestrator(
  params: RunMonaOrchestratorParams
): Promise<MonaOrchestratorResult> {
  const explicitTransactionStage = evaluateExplicitTransactionStage({
    latestCustomerMessage: params.latestCustomerMessage,
    currentStage: params.salesStage || null,
  });

  const safety = evaluateMonaSafety({
    message: {
      type: params.messageType || "text",
      text: params.latestCustomerMessage,
    },
    campaignContext: params.campaignContext || null,
    adminTakeover: params.adminTakeover === true,
  });

  if (safety.action === "silent") {
    return {
      action: "silent",
      reason: safety.reason,
      suggestedSalesStage: explicitTransactionStage,
    };
  }

  if (safety.action === "handover") {
    return {
      action: "handover",
      reason: safety.reason,
      suggestedSalesStage: explicitTransactionStage,
    };
  }

  let memory: MonaConversationMemory;

  try {
    memory = await loadFullConversationMemory({
      supabase: params.supabase,
      conversationId: params.conversationId,
      excludedMessageIds: params.excludedMessageIds || [],
    });
  } catch (error) {
    console.error("Mona V2 memory loading failed:", error);

    return {
      action: "handover",
      reason:
        "Mona could not load the conversation memory safely.",
        suggestedSalesStage: explicitTransactionStage,
    };
  }

  const brain = await analyseMonaBrain({
    memory,
    latestCustomerMessage: params.latestCustomerMessage,
    salesStage: params.salesStage || null,
    campaignContext: params.campaignContext || null,
  });

  const suggestedSalesStage =
    explicitTransactionStage ||
    evaluateMonaSalesStage({
      brain,
      latestCustomerMessage: params.latestCustomerMessage,
      currentStage: params.salesStage || null,
    });

  if (!brain.understood || brain.handoverRecommended) {
    return {
      action: "handover",
      reason:
        brain.handoverReason ||
        "Mona could not reliably understand the conversation.",
        suggestedSalesStage,
    };
  }

  if (!brain.replyNeeded) {
    return {
      action: "silent",
      reason:
        "Mona Brain determined that no conversational reply was needed.",
      suggestedSalesStage,
    };
  }

  const conversationContext =
    memoryToSalesContext(memory);

  const salesGuidance = await routeMonaSalesStrategy({
    brain,
    customerMessage: params.latestCustomerMessage,
    conversationContext,
    salesStage: params.salesStage || null,
  });

  const knowledge = await retrieveMonaKnowledge({
    supabase: params.supabase,
    brain,
    salesGuidance,
    language: brain.languageStyle.primaryLanguage,
  });

  const writer = await writeMonaReply({
    memory,
    brain,
    salesGuidance,
    knowledge,
    latestCustomerMessage:
      params.latestCustomerMessage,
  });

  return resolveWriterResult(writer, {
    memory,
    brain,
    salesGuidance,
    knowledge,
    suggestedSalesStage,
  });
}
