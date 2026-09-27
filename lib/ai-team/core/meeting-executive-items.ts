import "server-only";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

type SyncPendingExecutiveClarificationsInput = {
  meetingId: string;
  actorUserId: string | null;
};

type SyncPendingExecutiveClarificationsResult = {
  action:
    | "synced_founder_clarifications"
    | "no_pending_founder_clarifications"
    | "skipped_jake_inactive";
  eligibleTasks: number;
  createdItems: number;
  duplicatesSuppressed: number;
  meetingItemIds: string[];
  taskIds: string[];
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  source_type: string | null;
  source_id: string | null;
  result_summary: string | null;
  metadata: Record<string, unknown> | null;
};

function cleanString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function syncPendingExecutiveClarifications({
  meetingId,
  actorUserId,
}: SyncPendingExecutiveClarificationsInput): Promise<SyncPendingExecutiveClarificationsResult> {
  requireAgentPermission(
    "jake",
    "read_ai_team_data"
  );

  requireAgentPermission(
    "jake",
    "create_meeting_item"
  );

  const {
    data: meeting,
    error: meetingError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_meetings")
      .select(
        "id, status"
      )
      .eq(
        "id",
        meetingId
      )
      .maybeSingle();

  if (meetingError) {
    throw new Error(
      `Unable to verify Meeting Room session: ${meetingError.message}`
    );
  }

  if (
    !meeting ||
    meeting.status !==
      "in_progress"
  ) {
    throw new Error(
      "Founder clarification sync requires an active Meeting Room session."
    );
  }

  const {
    data: jake,
    error: jakeError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key, status, enabled"
      )
      .eq(
        "agent_key",
        "jake"
      )
      .maybeSingle();

  if (jakeError) {
    throw new Error(
      `Unable to load Jake: ${jakeError.message}`
    );
  }

  if (!jake) {
    throw new Error(
      "Jake is not configured in the AI Team."
    );
  }

  /*
   * Operational off-switch.
   *
   * Jake must not autonomously create Meeting Room
   * items while inactive or disabled.
   */
  if (
    jake.status !== "active" ||
    jake.enabled !== true
  ) {
    return {
      action:
        "skipped_jake_inactive",
      eligibleTasks: 0,
      createdItems: 0,
      duplicatesSuppressed: 0,
      meetingItemIds: [],
      taskIds: [],
    };
  }

  /*
   * Only surface the narrow clarification state produced
   * by protected Lola -> Rupert inquiry research.
   *
   * Do not treat every blocked AI task as a Founder
   * clarification request.
   */
  const {
    data: rawTasks,
    error: tasksError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_tasks")
      .select(
        [
          "id",
          "title",
          "status",
          "source_type",
          "source_id",
          "result_summary",
          "metadata",
        ].join(",")
      )
      .eq(
        "status",
        "blocked"
      )
      .eq(
        "source_type",
        "rupert_lola_handoff"
      )
      .contains(
        "metadata",
        {
          customer_intent_scope:
            "unresolved",

          content_block_reason:
            "customer_intent_unresolved",

          post_research_disposition:
            "needs_internal_clarification",

          content_eligible:
            false,
        }
      )
      .order(
        "updated_at",
        {
          ascending: true,
        }
      )
      .limit(25);

  if (tasksError) {
    throw new Error(
      `Unable to load pending Founder clarifications: ${tasksError.message}`
    );
  }

  const tasks =
    (rawTasks ?? []) as unknown as TaskRow[];

  if (tasks.length === 0) {
    return {
      action:
        "no_pending_founder_clarifications",
      eligibleTasks: 0,
      createdItems: 0,
      duplicatesSuppressed: 0,
      meetingItemIds: [],
      taskIds: [],
    };
  }

  let createdItems = 0;
  let duplicatesSuppressed = 0;

  const meetingItemIds:
    string[] = [];

  const taskIds:
    string[] = [];

  for (const task of tasks) {
    /*
     * One clarification discussion item per task
     * per meeting.
     *
     * A later meeting may surface the same task again
     * if the Founder has still not clarified it.
     */
    const {
      data: existingItems,
      error: existingItemError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_meeting_items"
        )
        .select(
          "id, status"
        )
        .eq(
          "meeting_id",
          meetingId
        )
        .eq(
          "related_task_id",
          task.id
        )
        .contains(
          "metadata",
          {
            source:
              "founder_clarification_queue",
          }
        )
        .limit(1);

    if (existingItemError) {
      throw new Error(
        `Unable to check Founder clarification deduplication: ${existingItemError.message}`
      );
    }

    const existingItem =
      existingItems?.[0] ??
      null;

    if (existingItem) {
      duplicatesSuppressed +=
        1;

      continue;
    }

    const taskMetadata =
      task.metadata &&
      typeof task.metadata ===
        "object" &&
      !Array.isArray(
        task.metadata
      )
        ? task.metadata
        : {};

    const researchReportId =
      cleanString(
        taskMetadata
          .current_research_report_id
      ) ||
      cleanString(
        taskMetadata
          .research_report_id
      ) ||
      null;

    /*
     * Keep the Meeting Room presentation intentionally
     * neutral.
     *
     * Do not infer the payment event, payer, recipient,
     * transaction direction, Tetamo role, settlement type,
     * fee type or any other missing customer intent.
     */
    const content =
      "Rupert completed protected research, but the customer-intended payment meaning remains unresolved. Founder clarification is required before this content task can continue.";

    const {
      data: item,
      error: itemError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_meeting_items"
        )
        .insert({
          meeting_id:
            meetingId,

          item_type:
            "discussion",

          title:
            `Founder clarification required: ${task.title}`,

          content,

          presented_by_agent_id:
            jake.id,

          related_task_id:
            task.id,

          status:
            "pending",

          metadata: {
            source:
              "founder_clarification_queue",

            clarification_type:
              "customer_intent",

            requires_founder_clarification:
              true,

            requested_agent_key:
              "rupert",

            source_task_id:
              task.id,

            task_source_type:
              task.source_type,

            task_source_id:
              task.source_id,

            research_report_id:
              researchReportId,

            content_block_reason:
              "customer_intent_unresolved",

            post_research_disposition:
              "needs_internal_clarification",
          },
        })
        .select(
          "id"
        )
        .single();

    if (
      itemError?.code ===
        "23505"
    ) {
      duplicatesSuppressed +=
        1;

      continue;
    }

    if (
      itemError ||
      !item
    ) {
      throw new Error(
        `Unable to create Founder clarification Meeting Room item: ${
          itemError?.message ??
          "unknown error"
        }`
      );
    }

    createdItems +=
      1;

    meetingItemIds.push(
      item.id
    );

    taskIds.push(
      task.id
    );

    const {
      error:
        activityError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_activity"
        )
        .insert({
          agent_id:
            jake.id,

          actor_user_id:
            actorUserId,

          event_type:
            "meeting_executive_item",

          action:
            "surfaced_founder_clarification",

          entity_type:
            "ai_meeting_item",

          entity_id:
            item.id,

          task_id:
            task.id,

          severity:
            "info",

          details: {
            meeting_id:
              meetingId,

            source:
              "founder_clarification_queue",

            clarification_type:
              "customer_intent",

            customer_intent_scope:
              "unresolved",

            content_block_reason:
              "customer_intent_unresolved",

            post_research_disposition:
              "needs_internal_clarification",

            research_report_id:
              researchReportId,
          },
        });

    if (activityError) {
      /*
       * Audit failure must not destroy a valid
       * Meeting Room clarification item.
       */
      console.error(
        "Founder clarification Meeting Room activity log failed:",
        activityError
      );
    }
  }

  return {
    action:
      createdItems > 0
        ? "synced_founder_clarifications"
        : "no_pending_founder_clarifications",

    eligibleTasks:
      tasks.length,

    createdItems,

    duplicatesSuppressed,

    meetingItemIds,

    taskIds,
  };
}
