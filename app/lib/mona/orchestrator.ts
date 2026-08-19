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
  writeMonaFollowUp,
  type MonaWriterResult,
  type MonaFollowUpNumber,
} from "./writer";

import {
  evaluateMonaSalesStage,
  evaluateExplicitTransactionStage,
  type MonaSalesStageSuggestion,
} from "./stage";

import {
  evaluateMonaSilenceFollowUp,
  type MonaSilenceFollowUpDecision,
  type MonaSilenceFollowUpState,
} from "./timing";

export type MonaScheduledFollowUpResult =
  | {
      action: "reply";
      reply: string;
      source: "openai" | "fallback";
      followUpNumber: MonaFollowUpNumber;
      memory: MonaConversationMemory;
      brain: MonaBrainDecision;
      salesGuidance: MonaSalesGuidance;
      knowledge: MonaKnowledgeResult;
    }
  | {
      action: "silent";
      reason: string;
      followUpNumber: MonaFollowUpNumber | null;
    };

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

export type MonaFollowUpPersistenceState = {
  followUpCount: 0 | 1 | 2;
  waitingSince: string | null;
  firstFollowUpSentAt: string | null;
  nextFollowUpDueAt: string | null;
  dependencyControlled: boolean;
  dependencyReason: string | null;
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
  aiPaused?: boolean;
  blocked?: boolean;
  optedOut?: boolean;

  messageDirection?: string | null;
  messageSource?: string | null;
  aiGenerated?: boolean;
  adminGenerated?: boolean;
  isCampaign?: boolean;
  isSystem?: boolean;
};

type FollowUpConversationRow = {
  id: string;
  sales_stage?: string | null;
  ai_enabled?: boolean | null;
  handover_to_admin?: boolean | null;
  opted_out_at?: string | null;
  status?: string | null;

  mona_followup_count?: number | null;
  mona_followup_waiting_since?: string | null;
  mona_first_followup_sent_at?: string | null;
  mona_next_followup_due_at?: string | null;
  mona_dependency_controlled?: boolean | null;
  mona_dependency_reason?: string | null;
};

function getLatestCustomerMessageFromMemory(
  memory: MonaConversationMemory
) {
  const latestCustomerMessage =
    [...memory.messages]
      .reverse()
      .find(
        (item) =>
          item.speaker === "Customer" &&
          Boolean(
            String(item.message || "").trim()
          )
      );

  return latestCustomerMessage
    ? String(
        latestCustomerMessage.message || ""
      ).trim()
    : "";
}

function memoryToSalesContext(
  memory: MonaConversationMemory
) {
  if (!memory.messages.length) {
    return null;
  }

  return memory.messages
    .map((item) => {
      const source =
        item.source
          ? ` source=${item.source}`
          : "";

      return `[${item.createdAt}] ${item.speaker}${source}: ${item.message}`;
    })
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
      suggestedSalesStage:
        context.suggestedSalesStage,
    };
  }

  if (writer.action === "handover") {
    return {
      action: "handover",
      reason: writer.reason,
      suggestedSalesStage:
        context.suggestedSalesStage,
    };
  }

  return {
    action: "reply",
    reply: writer.reply,
    source: writer.source,
    memory: context.memory,
    brain: context.brain,
    salesGuidance:
      context.salesGuidance,
    knowledge: context.knowledge,
    suggestedSalesStage:
      context.suggestedSalesStage,
  };
}

function normalizeFollowUpCount(
  value: unknown
): 0 | 1 | 2 {
  const numeric =
    Number(value);

  if (numeric >= 2) {
    return 2;
  }

  if (numeric >= 1) {
    return 1;
  }

  return 0;
}

function addHoursIso(
  value: Date,
  hours: number
) {
  return new Date(
    value.getTime() +
      hours * 60 * 60 * 1000
  ).toISOString();
}

/*
 * CUSTOMER REPLIED
 * ----------------
 *
 * A genuine new customer reply cancels the previous unanswered
 * Mona-message silence cycle.
 *
 * Brain may later establish a new timing dependency for the newly
 * processed customer message.
 */
export async function resetMonaFollowUpCycleForCustomerReply(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
  }
) {
  const { error } =
    await params.supabase
      .from("whatsapp_conversations")
      .update({
        mona_followup_count: 0,
        mona_followup_waiting_since: null,
        mona_first_followup_sent_at: null,
        mona_next_followup_due_at: null,
        mona_dependency_controlled: false,
        mona_dependency_reason: null,
      })
      .eq(
        "id",
        params.conversationId
      );

  if (error) {
    throw new Error(
      `Failed to reset Mona follow-up cycle: ${error.message}`
    );
  }
}

/*
 * BRAIN DEPENDENCY STATE
 * ----------------------
 *
 * If Brain determines that the customer has a real timing dependency
 * such as "next month", "after salary", or "after I ask my husband",
 * normal 1-hour / 12-hour silence chasing must not start.
 *
 * Timing controls WHEN.
 * Brain controls whether the dependency exists.
 */
export async function persistMonaDependencyState(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    brain: MonaBrainDecision;
  }
) {
  const dependencyControlled =
    params.brain.timingDependency.active ===
    true;

  const dependencyReason =
    dependencyControlled
      ? (
          params.brain.timingDependency.reason ||
          params.brain.latestMeaning ||
          "Customer has an explicit timing dependency."
        )
      : null;

  const { error } =
    await params.supabase
      .from("whatsapp_conversations")
      .update({
        mona_dependency_controlled:
          dependencyControlled,
        mona_dependency_reason:
          dependencyReason,
      })
      .eq(
        "id",
        params.conversationId
      );

  if (error) {
    throw new Error(
      `Failed to persist Mona dependency state: ${error.message}`
    );
  }

  return {
    dependencyControlled,
    dependencyReason,
  };
}

/*
 * NORMAL MONA REPLY SUCCESSFULLY SENT
 * -----------------------------------
 *
 * Call this ONLY after Meta/Twilio confirms the outgoing Mona reply
 * was sent successfully.
 *
 * This begins a fresh silence-waiting cycle:
 *
 *   Mona reply
 *   -> +1 hour
 *   -> Follow-up #1 becomes due
 *
 * If Brain identified an explicit timing dependency, normal silence
 * follow-up remains suppressed.
 */
export async function markMonaReplySuccessfullySent(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    sentAt?: Date;
    dependencyControlled?: boolean;
    dependencyReason?: string | null;
  }
) {
  const sentAt =
    params.sentAt ||
    new Date();

  const dependencyControlled =
    params.dependencyControlled ===
    true;

  const nextDueAt =
    dependencyControlled
      ? null
      : addHoursIso(
          sentAt,
          1
        );

  const { error } =
    await params.supabase
      .from("whatsapp_conversations")
      .update({
        mona_followup_count: 0,
        mona_followup_waiting_since:
          sentAt.toISOString(),
        mona_first_followup_sent_at:
          null,
        mona_next_followup_due_at:
          nextDueAt,
        mona_dependency_controlled:
          dependencyControlled,
        mona_dependency_reason:
          dependencyControlled
            ? (
                params.dependencyReason ||
                "Customer has an explicit timing dependency."
              )
            : null,
      })
      .eq(
        "id",
        params.conversationId
      );

  if (error) {
    throw new Error(
      `Failed to start Mona silence follow-up cycle: ${error.message}`
    );
  }

  return {
    followUpCount: 0 as const,
    waitingSince:
      sentAt.toISOString(),
    firstFollowUpSentAt: null,
    nextFollowUpDueAt:
      nextDueAt,
    dependencyControlled,
    dependencyReason:
      dependencyControlled
        ? (
            params.dependencyReason ||
            "Customer has an explicit timing dependency."
          )
        : null,
  };
}

/*
 * FOLLOW-UP SUCCESSFULLY SENT
 * ---------------------------
 *
 * Follow-up #1:
 *   schedule Follow-up #2 for +12 hours.
 *
 * Follow-up #2:
 *   stop. No next due time.
 */
export async function markMonaFollowUpSuccessfullySent(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    followUpNumber: 1 | 2;
    sentAt?: Date;
  }
) {
  const sentAt =
    params.sentAt ||
    new Date();

  if (
    params.followUpNumber === 1
  ) {
    const nextDueAt =
      addHoursIso(
        sentAt,
        12
      );

    const { error } =
      await params.supabase
        .from(
          "whatsapp_conversations"
        )
        .update({
          mona_followup_count: 1,
          mona_first_followup_sent_at:
            sentAt.toISOString(),
          mona_next_followup_due_at:
            nextDueAt,
        })
        .eq(
          "id",
          params.conversationId
        );

    if (error) {
      throw new Error(
        `Failed to persist Mona follow-up #1 state: ${error.message}`
      );
    }

    return {
      followUpCount: 1 as const,
      firstFollowUpSentAt:
        sentAt.toISOString(),
      nextFollowUpDueAt:
        nextDueAt,
    };
  }

  const { error } =
    await params.supabase
      .from("whatsapp_conversations")
      .update({
        mona_followup_count: 2,
        mona_next_followup_due_at:
          null,
      })
      .eq(
        "id",
        params.conversationId
      );

  if (error) {
    throw new Error(
      `Failed to persist Mona follow-up #2 state: ${error.message}`
    );
  }

  return {
    followUpCount: 2 as const,
    firstFollowUpSentAt: null,
    nextFollowUpDueAt: null,
  };
}

/*
 * LOAD PERSISTED FOLLOW-UP STATE
 */
export async function loadMonaFollowUpPersistenceState(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
  }
): Promise<
  {
    conversation:
      FollowUpConversationRow;
    state:
      MonaFollowUpPersistenceState;
  } | null
> {
  const { data, error } =
    await params.supabase
      .from("whatsapp_conversations")
      .select(
        [
          "id",
          "sales_stage",
          "ai_enabled",
          "handover_to_admin",
          "opted_out_at",
          "status",
          "mona_followup_count",
          "mona_followup_waiting_since",
          "mona_first_followup_sent_at",
          "mona_next_followup_due_at",
          "mona_dependency_controlled",
          "mona_dependency_reason",
        ].join(", ")
      )
      .eq(
        "id",
        params.conversationId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load Mona follow-up state: ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  const row =
    data as unknown as
      FollowUpConversationRow;

  return {
    conversation: row,
    state: {
      followUpCount:
        normalizeFollowUpCount(
          row.mona_followup_count
        ),
      waitingSince:
        row.mona_followup_waiting_since ||
        null,
      firstFollowUpSentAt:
        row.mona_first_followup_sent_at ||
        null,
      nextFollowUpDueAt:
        row.mona_next_followup_due_at ||
        null,
      dependencyControlled:
        row.mona_dependency_controlled ===
        true,
      dependencyReason:
        row.mona_dependency_reason ||
        null,
    },
  };
}

/*
 * CHECK WHETHER A SILENCE FOLLOW-UP IS DUE
 *
 * This does NOT write or send the follow-up.
 * It only evaluates the persisted conversation state + Memory.
 */
export async function evaluateMonaConversationFollowUp(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    now?: Date;
    blocked?: boolean;
  }
): Promise<MonaSilenceFollowUpDecision> {
  const persisted =
    await loadMonaFollowUpPersistenceState({
      supabase: params.supabase,
      conversationId:
        params.conversationId,
    });

  if (!persisted) {
    return {
      action: "none",
      reason:
        "Conversation does not exist.",
      nextDueAt: null,
    };
  }

  const memory =
    await loadFullConversationMemory({
      supabase: params.supabase,
      conversationId:
        params.conversationId,
    });

  const state:
    MonaSilenceFollowUpState = {
      followUpsSent:
        persisted.state
          .followUpCount,
      firstFollowUpSentAt:
        persisted.state
          .firstFollowUpSentAt,
      dependencyControlled:
        persisted.state
          .dependencyControlled,
      dependencyReason:
        persisted.state
          .dependencyReason,
    };

  const status =
    String(
      persisted.conversation
        .status || ""
    )
      .trim()
      .toLowerCase();

  return evaluateMonaSilenceFollowUp({
    memory,
    state,
    now: params.now,
    salesStage:
      persisted.conversation
        .sales_stage ||
      null,
    aiPaused:
      persisted.conversation
        .ai_enabled === false ||
      persisted.conversation
        .handover_to_admin === true,
    blocked:
      params.blocked === true ||
      status === "blocked",
    optedOut:
      Boolean(
        persisted.conversation
          .opted_out_at
      ) ||
      status === "opted_out",
  });
}

/*
 * SCHEDULED SILENCE FOLLOW-UP ORCHESTRATION
 * -----------------------------------------
 *
 * There is NO new customer inbound message here.
 *
 * Timing first decides whether follow-up #1 or #2 is actually due.
 * If due, Mona reconstructs the existing conversation from Memory,
 * Brain, Sales and Knowledge, then the dedicated Follow-up Writer
 * phrases a natural continuation.
 *
 * This function NEVER sends WhatsApp itself.
 *
 * The transport/scheduler must call
 * markMonaFollowUpSuccessfullySent() only AFTER Meta confirms that
 * the generated follow-up was successfully sent.
 */
export async function runMonaScheduledFollowUp(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    now?: Date;
    blocked?: boolean;
  }
): Promise<MonaScheduledFollowUpResult> {
  const timingDecision =
    await evaluateMonaConversationFollowUp({
      supabase: params.supabase,
      conversationId:
        params.conversationId,
      now: params.now,
      blocked:
        params.blocked === true,
    });

  if (
    timingDecision.action !==
    "follow_up"
  ) {
    return {
      action: "silent",
      reason:
        timingDecision.reason ||
        "No Mona silence follow-up is due.",
      followUpNumber: null,
    };
  }

  const followUpNumber =
    timingDecision.followUpNumber;

  if (
    followUpNumber !== 1 &&
    followUpNumber !== 2
  ) {
    return {
      action: "silent",
      reason:
        "Timing did not provide a valid Mona follow-up number.",
      followUpNumber: null,
    };
  }

  const persisted =
    await loadMonaFollowUpPersistenceState({
      supabase: params.supabase,
      conversationId:
        params.conversationId,
    });

  if (!persisted) {
    return {
      action: "silent",
      reason:
        "Conversation no longer exists.",
      followUpNumber,
    };
  }

  const memory =
    await loadFullConversationMemory({
      supabase: params.supabase,
      conversationId:
        params.conversationId,
    });

  const latestCustomerMessage =
    getLatestCustomerMessageFromMemory(
      memory
    );

  if (!latestCustomerMessage) {
    return {
      action: "silent",
      reason:
        "No real customer message exists in Memory, so Mona will not invent a follow-up.",
      followUpNumber,
    };
  }

  /*
   * Reconstruct Brain state from the FULL conversation.
   *
   * latestCustomerMessage is the last real Customer message,
   * while Memory still contains Mona/Admin/Campaign messages that
   * occurred after it. Brain therefore sees the complete history.
   */
  const brain =
    await analyseMonaBrain({
      memory,
      latestCustomerMessage,
      salesStage:
        persisted.conversation
          .sales_stage ||
        null,
      campaignContext: null,
    });

  if (
    !brain.understood ||
    brain.handoverRecommended
  ) {
    return {
      action: "silent",
      reason:
        "Brain could not safely reconstruct the conversation for a scheduled follow-up.",
      followUpNumber,
    };
  }

  /*
   * Defense in depth.
   *
   * A dependency may have been established in Memory even if stale
   * persistence state failed to reflect it. Do not chase.
   */
  if (
    brain.timingDependency.active ===
    true
  ) {
    return {
      action: "silent",
      reason:
        brain.timingDependency.reason ||
        "Customer has a real timing dependency.",
      followUpNumber,
    };
  }

  if (
    brain.conversationSituation ===
    "rejection"
  ) {
    return {
      action: "silent",
      reason:
        "Customer conversation is a rejection; Mona will not chase.",
      followUpNumber,
    };
  }

  const conversationContext =
    memoryToSalesContext(
      memory
    );

  const salesGuidance =
    await routeMonaSalesStrategy({
      brain,
      customerMessage:
        latestCustomerMessage,
      conversationContext,
      salesStage:
        persisted.conversation
          .sales_stage ||
        null,
    });

  const knowledge =
    await retrieveMonaKnowledge({
      supabase: params.supabase,
      brain,
      salesGuidance,
      language:
        brain.languageStyle
          .primaryLanguage,
    });

  const writer =
    await writeMonaFollowUp({
      memory,
      brain,
      salesGuidance,
      knowledge,
      followUpNumber,
    });

  if (
    writer.action !== "reply"
  ) {
    return {
      action: "silent",
      reason:
        writer.action === "handover"
          ? writer.reason
          : "Mona Follow-up Writer determined that no follow-up should be sent.",
      followUpNumber,
    };
  }

  const reply =
    String(
      writer.reply || ""
    ).trim();

  if (!reply) {
    return {
      action: "silent",
      reason:
        "Mona Follow-up Writer returned an empty message.",
      followUpNumber,
    };
  }

  return {
    action: "reply",
    reply,
    source: writer.source,
    followUpNumber,
    memory,
    brain,
    salesGuidance,
    knowledge,
  };
}

/*
 * NORMAL INBOUND ORCHESTRATION
 * ----------------------------
 *
 * Safety
 * -> Memory
 * -> Brain
 * -> Stage
 * -> Sales Router
 * -> Knowledge
 * -> Writer
 *
 * Timing does not create a follow-up here.
 * A successful outbound send starts the waiting cycle through
 * markMonaReplySuccessfullySent().
 */
export async function runMonaOrchestrator(
  params: RunMonaOrchestratorParams
): Promise<MonaOrchestratorResult> {
  const explicitTransactionStage =
    evaluateExplicitTransactionStage({
      latestCustomerMessage:
        params.latestCustomerMessage,
      currentStage:
        params.salesStage ||
        null,
    });

  const safety =
    evaluateMonaSafety({
      message: {
        type:
          params.messageType ||
          "text",
        text:
          params.latestCustomerMessage,
        direction:
          params.messageDirection ||
          "inbound",
        source:
          params.messageSource ||
          null,
        aiGenerated:
          params.aiGenerated === true,
        adminGenerated:
          params.adminGenerated ===
          true,
        isCampaign:
          params.isCampaign === true,
        isSystem:
          params.isSystem === true,
      },

      campaignContext:
        params.campaignContext ||
        null,

      adminTakeover:
        params.adminTakeover ===
        true,

      aiPaused:
        params.aiPaused === true,

      blocked:
        params.blocked === true,

      optedOut:
        params.optedOut === true,
    });

  if (
    safety.action === "silent"
  ) {
    return {
      action: "silent",
      reason: safety.reason,
      suggestedSalesStage:
        explicitTransactionStage,
    };
  }

  if (
    safety.action ===
    "handover"
  ) {
    return {
      action: "handover",
      reason: safety.reason,
      suggestedSalesStage:
        explicitTransactionStage,
    };
  }

  /*
   * A genuine customer inbound message cancels any previous
   * unanswered-Mona silence cycle.
   */
  try {
    await resetMonaFollowUpCycleForCustomerReply({
      supabase:
        params.supabase,
      conversationId:
        params.conversationId,
    });
  } catch (error) {
    console.error(
      "Mona follow-up reset failed:",
      error
    );

    return {
      action: "handover",
      reason:
        "Mona could not safely reset the previous follow-up cycle.",
      suggestedSalesStage:
        explicitTransactionStage,
    };
  }

  let memory:
    MonaConversationMemory;

  try {
    memory =
      await loadFullConversationMemory({
        supabase:
          params.supabase,
        conversationId:
          params.conversationId,
        excludedMessageIds:
          params.excludedMessageIds ||
          [],
      });
  } catch (error) {
    console.error(
      "Mona memory loading failed:",
      error
    );

    return {
      action: "handover",
      reason:
        "Mona could not load the conversation memory safely.",
      suggestedSalesStage:
        explicitTransactionStage,
    };
  }

  const brain =
    await analyseMonaBrain({
      memory,
      latestCustomerMessage:
        params.latestCustomerMessage,
      salesStage:
        params.salesStage ||
        null,
      campaignContext:
        params.campaignContext ||
        null,
    });

  const suggestedSalesStage =
    explicitTransactionStage ||
    evaluateMonaSalesStage({
      brain,
      latestCustomerMessage:
        params.latestCustomerMessage,
      currentStage:
        params.salesStage ||
        null,
    });

  if (
    !brain.understood ||
    brain.handoverRecommended
  ) {
    return {
      action: "handover",
      reason:
        brain.handoverReason ||
        "Mona could not reliably understand the conversation.",
      suggestedSalesStage,
    };
  }

  /*
   * Persist dependency state after Brain has interpreted the
   * new customer message.
   */
  try {
    await persistMonaDependencyState({
      supabase:
        params.supabase,
      conversationId:
        params.conversationId,
      brain,
    });
  } catch (error) {
    console.error(
      "Mona dependency persistence failed:",
      error
    );
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
    memoryToSalesContext(
      memory
    );

  const salesGuidance =
    await routeMonaSalesStrategy({
      brain,
      customerMessage:
        params.latestCustomerMessage,
      conversationContext,
      salesStage:
        params.salesStage ||
        null,
    });

  const knowledge =
    await retrieveMonaKnowledge({
      supabase:
        params.supabase,
      brain,
      salesGuidance,
      language:
        brain.languageStyle
          .primaryLanguage,
    });

  const writer =
    await writeMonaReply({
      memory,
      brain,
      salesGuidance,
      knowledge,
      latestCustomerMessage:
        params.latestCustomerMessage,
    });

  return resolveWriterResult(
    writer,
    {
      memory,
      brain,
      salesGuidance,
      knowledge,
      suggestedSalesStage,
    }
  );
}
