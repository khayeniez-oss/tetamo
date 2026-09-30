import "server-only";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  type AIAgentKey,
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

export type AITaskStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "awaiting_approval"
  | "completed"
  | "cancelled";

type AgentRow = {
  id: string;
  agent_key: AIAgentKey;
  status: string;
  enabled: boolean;
};

type TaskRow = {
  id: string;
  title: string;
  status: AITaskStatus;
  assigned_to_agent_id:
    string | null;
  requires_approval: boolean;
  result_summary:
    string | null;
  started_at:
    string | null;
  completed_at:
    string | null;
  metadata:
    Record<string, unknown> | null;
};

type TransitionAssignedAITaskInput = {
  taskId: string;
  actorAgentKey: AIAgentKey;
  nextStatus: AITaskStatus;
  resultSummary?: string | null;
  blockReason?: string | null;
  transitionSource?: string | null;
  sourceTurnId?: string | null;
};

type StartAssignedMeetingTasksInput = {
  meetingId: string;
  founderTurnId: string;
  specialistTurnId: string;
  actorAgentKey: AIAgentKey;
};

function cleanText(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

const OWNER_TRANSITIONS:
Record<
  AITaskStatus,
  readonly AITaskStatus[]
> = {
  pending: [
    "in_progress",
    "blocked",
  ],

  in_progress: [
    "blocked",
    "awaiting_approval",
    "completed",
  ],

  blocked: [
    "in_progress",
  ],

  awaiting_approval: [
    "in_progress",
  ],

  completed: [],

  cancelled: [],
};

async function loadActiveAgent(
  agentKey: AIAgentKey
): Promise<AgentRow> {
  requireAgentPermission(
    agentKey,
    "update_internal_task"
  );

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key, status, enabled"
      )
      .eq(
        "agent_key",
        agentKey
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  const agent =
    data as unknown as
      AgentRow | null;

  if (!agent) {
    throw new Error(
      `AI agent "${agentKey}" was not found.`
    );
  }

  if (
    agent.status !== "active" ||
    agent.enabled !== true
  ) {
    throw new Error(
      `AI agent "${agentKey}" is not active and enabled.`
    );
  }

  return agent;
}

async function getLatestApprovalStatus(
  taskId: string
) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_approvals")
      .select(
        "id, status, created_at"
      )
      .eq(
        "task_id",
        taskId
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data
    ? {
        id:
          String(
            data.id
          ),

        status:
          cleanText(
            data.status
          ),
      }
    : null;
}

async function syncTaskHandoffLifecycle({
  taskId,
  agentId,
  nextStatus,
  now,
}: {
  taskId: string;
  agentId: string;
  nextStatus: AITaskStatus;
  now: string;
}) {
  if (
    nextStatus ===
    "in_progress"
  ) {
    const {
      error,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_handoffs"
        )
        .update({
          status:
            "accepted",

          accepted_at:
            now,
        })
        .eq(
          "task_id",
          taskId
        )
        .eq(
          "to_agent_id",
          agentId
        )
        .eq(
          "status",
          "pending"
        );

    if (error) {
      console.error(
        "AI task handoff acceptance sync failed:",
        error
      );
    }

    return;
  }

  if (
    nextStatus !==
    "completed"
  ) {
    return;
  }

  /*
   * If an old handoff somehow remained pending
   * until the task completed, close it safely
   * while preserving an acknowledgement time.
   */
  const {
    error:
      pendingError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_handoffs"
      )
      .update({
        status:
          "completed",

        accepted_at:
          now,

        completed_at:
          now,
      })
      .eq(
        "task_id",
        taskId
      )
      .eq(
        "to_agent_id",
        agentId
      )
      .eq(
        "status",
        "pending"
      );

  if (pendingError) {
    console.error(
      "Pending AI handoff completion sync failed:",
      pendingError
    );
  }

  const {
    error:
      acceptedError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_handoffs"
      )
      .update({
        status:
          "completed",

        completed_at:
          now,
      })
      .eq(
        "task_id",
        taskId
      )
      .eq(
        "to_agent_id",
        agentId
      )
      .eq(
        "status",
        "accepted"
      );

  if (acceptedError) {
    console.error(
      "Accepted AI handoff completion sync failed:",
      acceptedError
    );
  }
}

export async function transitionAssignedAITask({
  taskId,
  actorAgentKey,
  nextStatus,
  resultSummary,
  blockReason,
  transitionSource,
  sourceTurnId,
}: TransitionAssignedAITaskInput) {
  const agent =
    await loadActiveAgent(
      actorAgentKey
    );

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        [
          "id",
          "title",
          "status",
          "assigned_to_agent_id",
          "requires_approval",
          "result_summary",
          "started_at",
          "completed_at",
          "metadata",
        ].join(",")
      )
      .eq(
        "id",
        taskId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  const task =
    data as unknown as
      TaskRow | null;

  if (!task) {
    throw new Error(
      "AI task was not found."
    );
  }

  /*
   * Jake may supervise everybody,
   * but he may only mutate a task when
   * Jake himself is the assigned owner.
   *
   * This prevents a COO summary from
   * falsely completing a specialist's work.
   */
  if (
    task.assigned_to_agent_id !==
    agent.id
  ) {
    throw new Error(
      `${actorAgentKey} cannot change a task assigned to another owner.`
    );
  }

  if (
    task.status ===
    nextStatus
  ) {
    return {
      changed: false,
      task,
    };
  }

  if (
    !OWNER_TRANSITIONS[
      task.status
    ].includes(
      nextStatus
    )
  ) {
    throw new Error(
      `AI task cannot move from ${task.status} to ${nextStatus}.`
    );
  }

  const finalResultSummary =
    cleanText(
      resultSummary
    );

  const finalBlockReason =
    cleanText(
      blockReason
    );

  if (
    nextStatus ===
      "blocked" &&
    !finalBlockReason
  ) {
    throw new Error(
      "A block reason is required before an AI task can be marked blocked."
    );
  }

  const latestApproval =
    task.requires_approval
      ? await getLatestApprovalStatus(
          task.id
        )
      : null;

  if (
    nextStatus ===
      "awaiting_approval"
  ) {
    if (
      !task.requires_approval
    ) {
      throw new Error(
        "This task is not configured to require Founder approval."
      );
    }

    if (
      !latestApproval ||
      latestApproval.status !==
        "pending"
    ) {
      throw new Error(
        "A pending approval must exist before this task can wait for approval."
      );
    }
  }

  if (
    task.status ===
      "awaiting_approval" &&
    nextStatus ===
      "in_progress" &&
    (
      !latestApproval ||
      latestApproval.status !==
        "approved"
    )
  ) {
    throw new Error(
      "Founder approval is required before this task can resume."
    );
  }

  if (
    nextStatus ===
      "completed"
  ) {
    if (
      !finalResultSummary
    ) {
      throw new Error(
        "A result summary is required before an AI task can be completed."
      );
    }

    if (
      task.requires_approval &&
      (
        !latestApproval ||
        latestApproval.status !==
          "approved"
      )
    ) {
      throw new Error(
        "Founder approval is required before this task can be completed."
      );
    }
  }

  const now =
    new Date()
      .toISOString();

  const metadata =
    task.metadata &&
    typeof task.metadata ===
      "object" &&
    !Array.isArray(
      task.metadata
    )
      ? task.metadata
      : {};

  const update: {
    status: AITaskStatus;
    started_at?: string;
    completed_at?: string;
    result_summary?: string;
    metadata:
      Record<
        string,
        unknown
      >;
  } = {
    status:
      nextStatus,

    metadata: {
      ...metadata,

      last_lifecycle_transition: {
        from:
          task.status,

        to:
          nextStatus,

        actor_agent_key:
          actorAgentKey,

        transitioned_at:
          now,

        transition_source:
          cleanText(
            transitionSource
          ) ||
          null,

        source_turn_id:
          cleanText(
            sourceTurnId
          ) ||
          null,

        block_reason:
          finalBlockReason ||
          null,
      },
    },
  };

  if (
    nextStatus ===
      "in_progress" &&
    !task.started_at
  ) {
    update.started_at =
      now;
  }

  if (
    nextStatus ===
      "blocked"
  ) {
    update.result_summary =
      finalBlockReason;
  }

  if (
    nextStatus ===
      "completed"
  ) {
    update.completed_at =
      now;

    update.result_summary =
      finalResultSummary;
  }

  const {
    data:
      updatedData,
    error:
      updateError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .update(
        update
      )
      .eq(
        "id",
        task.id
      )
      .eq(
        "status",
        task.status
      )
      .eq(
        "assigned_to_agent_id",
        agent.id
      )
      .select(
        [
          "id",
          "title",
          "status",
          "assigned_to_agent_id",
          "requires_approval",
          "result_summary",
          "started_at",
          "completed_at",
          "metadata",
        ].join(",")
      )
      .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!updatedData) {
    throw new Error(
      "AI task changed before its lifecycle transition could be saved."
    );
  }

  await syncTaskHandoffLifecycle({
    taskId:
      task.id,

    agentId:
      agent.id,

    nextStatus,

    now,
  });

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
          agent.id,

        actor_user_id:
          null,

        event_type:
          "task_lifecycle",

        action:
          `task_${nextStatus}`,

        entity_type:
          "ai_task",

        entity_id:
          task.id,

        task_id:
          task.id,

        severity:
          nextStatus ===
            "blocked"
            ? "warning"
            : "info",

        details: {
          title:
            task.title,

          from_status:
            task.status,

          to_status:
            nextStatus,

          transition_source:
            cleanText(
              transitionSource
            ) ||
            null,

          source_turn_id:
            cleanText(
              sourceTurnId
            ) ||
            null,

          block_reason:
            finalBlockReason ||
            null,
        },
      });

  if (activityError) {
    console.error(
      "AI task lifecycle activity log failed:",
      activityError
    );
  }

  return {
    changed: true,
    task:
      updatedData,
  };
}

export async function startAssignedMeetingTasksForAgent({
  meetingId,
  founderTurnId,
  specialistTurnId,
  actorAgentKey,
}: StartAssignedMeetingTasksInput) {
  const agent =
    await loadActiveAgent(
      actorAgentKey
    );

  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id"
      )
      .eq(
        "related_entity_type",
        "ai_meeting"
      )
      .eq(
        "related_entity_id",
        meetingId
      )
      .eq(
        "source_type",
        "meeting_turn"
      )
      .eq(
        "source_id",
        founderTurnId
      )
      .eq(
        "assigned_to_agent_id",
        agent.id
      )
      .eq(
        "status",
        "pending"
      )
      .limit(20);

  if (error) {
    throw error;
  }

  const tasks =
    data ?? [];

  let started = 0;

  const startedTaskIds:
    string[] = [];

  for (
    const task of tasks
  ) {
    const taskId =
      String(
        task.id
      );

    const result =
      await transitionAssignedAITask({
        taskId,

        actorAgentKey,

        nextStatus:
          "in_progress",

        transitionSource:
          "meeting_room_specialist_acknowledgement",

        sourceTurnId:
          specialistTurnId,
      });

    if (
      result.changed
    ) {
      started += 1;

      startedTaskIds.push(
        taskId
      );
    }
  }

  return {
    eligible:
      tasks.length,

    started,

    /*
     * Only tasks whose transition actually changed
     * pending -> in_progress are returned here.
     *
     * Meeting execution must use this list rather
     * than scanning existing in-progress tasks.
     */
    startedTaskIds,
  };
}
