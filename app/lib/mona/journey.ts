import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonaBrainDecision } from "./brain";
import type { MonaSalesGuidance } from "./sales-router";

export type MonaJourneyStatus =
  | "active"
  | "resolved"
  | "stopped";

export type MonaJourneyDecision =
  | {
      action: "establish_active";
      reason: string;
    }
  | {
      action: "keep";
      reason: string;
    }
  | {
      action: "stop";
      reason: string;
    };

/*
 * MONA SALES JOURNEY
 * ------------------
 *
 * Journey is persistent opportunity/pursuit history.
 *
 * It is deliberately separate from Mona's silence-cycle state.
 *
 * A customer reply may reset:
 *   mona_followup_count
 *   mona_followup_waiting_since
 *   mona_first_followup_sent_at
 *   mona_next_followup_due_at
 *
 * It must NOT automatically reset:
 *   mona_journey_status
 *   mona_journey_started_at
 *   mona_pursuit_count
 *   mona_last_pursuit_at
 *
 * Brain + Sales remain the live source of truth for current meaning,
 * qualification and strategy. Journey persists only factual history.
 */

export function evaluateMonaJourney(
  params: {
    brain: MonaBrainDecision;
    salesGuidance: MonaSalesGuidance;
    currentStatus?: MonaJourneyStatus | null;
  }
): MonaJourneyDecision {
  const {
    brain,
    salesGuidance,
    currentStatus = null,
  } = params;

  /*
   * Never establish a sales journey from an unclear turn,
   * clarification state or human-handover state.
   */
  if (
    !brain.understood ||
    brain.clarification.needed ||
    brain.handoverRecommended
  ) {
    return {
      action: "keep",
      reason:
        "Brain does not currently support autonomous sales-journey progression.",
    };
  }

  /*
   * Phase 1 terminal-state protection.
   *
   * A resolved or stopped journey must not be automatically reopened
   * merely because a later Brain/Sales evaluation produces a stronger
   * buying signal. Reopening requires an explicit future rule.
   */
  if (
    currentStatus === "resolved" ||
    currentStatus === "stopped"
  ) {
    return {
      action: "keep",
      reason:
        `Existing Mona sales journey is terminal (${currentStatus}) and is not automatically reopened.`,
    };
  }

  const guidance = salesGuidance.guidance;

  /*
   * No Agent/Owner Sales guidance means we do not have enough
   * commercial qualification to establish a new journey.
   */
  if (!guidance) {
    return {
      action: "keep",
      reason:
        "No qualified Agent/Owner Sales guidance is available.",
    };
  }

  /*
   * Sales explicitly says stop selling.
   *
   * We only persist STOP when a journey already exists.
   * A random/non-sales conversation should not become a sales
   * journey merely so that it can be marked stopped.
   */
  if (
    guidance.pressureLevel === "stop"
  ) {
    if (currentStatus === "active") {
      return {
        action: "stop",
        reason:
          "Sales guidance explicitly requires Mona to stop pursuing this journey.",
      };
    }

    return {
      action: "keep",
      reason:
        "Sales says stop, but no persistent sales journey has been established.",
    };
  }

  /*
   * Medium/high buying signal is enough to establish a genuine
   * commercial journey.
   */
  if (
    guidance.buyingSignal === "medium" ||
    guidance.buyingSignal === "high"
  ) {
    return {
      action: "establish_active",
      reason:
        `Sales identified ${guidance.buyingSignal} buying intent.`,
    };
  }

  /*
   * A temporary low signal must not erase an existing journey.
   * Brain/Sales can reassess again on the next customer turn.
   */
  return {
    action: "keep",
    reason:
      currentStatus
        ? "Current buying signal is low, but an existing journey is preserved."
        : "Buying signal is low, so no new sales journey is established.",
  };
}

export async function persistMonaJourneyDecision(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    decision: MonaJourneyDecision;
    currentStatus?: MonaJourneyStatus | null;
    now?: Date;
  }
) {
  const now =
    params.now ||
    new Date();

  if (params.decision.action === "keep") {
    return;
  }

  if (params.decision.action === "stop") {
    const { error } =
      await params.supabase
        .from("whatsapp_conversations")
        .update({
          mona_journey_status: "stopped",
        })
        .eq("id", params.conversationId);

    if (error) {
      throw new Error(
        `Failed to stop Mona sales journey: ${error.message}`
      );
    }

    return;
  }

  /*
   * Establish ACTIVE without resetting factual pursuit history.
   *
   * journey_started_at is written only when there was no previous
   * persistent journey status supplied by the caller.
   */
  const update: {
    mona_journey_status: "active";
    mona_journey_started_at?: string;
  } = {
    mona_journey_status: "active",
  };

  if (!params.currentStatus) {
    update.mona_journey_started_at =
      now.toISOString();
  }

  const { error } =
    await params.supabase
      .from("whatsapp_conversations")
      .update(update)
      .eq("id", params.conversationId);

  if (error) {
    throw new Error(
      `Failed to persist Mona sales journey: ${error.message}`
    );
  }
}

/*
 * PROACTIVE PURSUIT SUCCESS
 * -------------------------
 *
 * Call this only AFTER a proactive Mona sales follow-up has been
 * confirmed successfully delivered.
 *
 * This records factual journey history. It does not control the
 * current silence-cycle counter or schedule.
 */
export async function markMonaPursuitSuccessfullySent(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    sentAt?: Date;
  }
) {
  const sentAt =
    params.sentAt ||
    new Date();

  /*
   * The database performs the pursuit increment atomically.
   *
   * This helper must only be called AFTER the existing transport
   * layer confirms that the proactive follow-up was successfully
   * delivered.
   *
   * It does not modify Mona's silence-cycle or claim state.
   */
  const {
    data,
    error,
  } =
    await params.supabase.rpc(
      "record_mona_successful_pursuit",
      {
        p_conversation_id:
          params.conversationId,
        p_sent_at:
          sentAt.toISOString(),
      }
    );

  if (error) {
    throw new Error(
      `Failed to record Mona pursuit success: ${error.message}`
    );
  }

  const result =
    Array.isArray(data)
      ? data[0]
      : data;

  if (!result) {
    throw new Error(
      "Failed to record Mona pursuit success: conversation was not found."
    );
  }

  return {
    journeyStatus:
      result.journey_status as MonaJourneyStatus,
    pursuitCount:
      Number(result.pursuit_count),
    lastPursuitAt:
      String(result.last_pursuit_at),
  };
}

/*
 * NORMAL CUSTOMER-FACING MONA REPLY
 * ---------------------------------
 *
 * Evaluate the already-produced Brain + Sales result against the
 * currently persisted journey state.
 *
 * This does not start or modify Mona's silence-cycle timer.
 */
export async function evaluateAndPersistMonaJourney(
  params: {
    supabase: SupabaseClient;
    conversationId: string;
    brain: MonaBrainDecision;
    salesGuidance: MonaSalesGuidance;
  }
) {
  const {
    data,
    error,
  } =
    await params.supabase
      .from("whatsapp_conversations")
      .select("mona_journey_status")
      .eq("id", params.conversationId)
      .single();

  if (error) {
    throw new Error(
      `Failed to read Mona sales journey: ${error.message}`
    );
  }

  const rawStatus =
    data?.mona_journey_status;

  const currentStatus: MonaJourneyStatus | null =
    rawStatus === "active" ||
    rawStatus === "resolved" ||
    rawStatus === "stopped"
      ? rawStatus
      : null;

  const decision =
    evaluateMonaJourney({
      brain: params.brain,
      salesGuidance:
        params.salesGuidance,
      currentStatus,
    });

  await persistMonaJourneyDecision({
    supabase:
      params.supabase,
    conversationId:
      params.conversationId,
    decision,
    currentStatus,
  });

  return {
    previousStatus:
      currentStatus,
    decision,
  };
}
