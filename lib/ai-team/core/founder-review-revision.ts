import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  transitionAssignedAITask,
} from "@/lib/ai-team/core/task-lifecycle";

import {
  executeMeetingTask,
} from "@/lib/ai-team/core/meeting-task-executor";

type AgentKey =
  | "jake"
  | "mona"
  | "rupert"
  | "randolph"
  | "lola"
  | "uncle_sam";

type RevisionTaskRow = {
  id: string;
  status: string;
  source_type: string | null;
  assigned_to_agent_id: string | null;
};

type AgentRow = {
  id: string;
  agent_key: AgentKey;
};

export async function executeFounderReviewRevision({
  taskId,
}: {
  taskId: string;
}) {
  const {
    data: rawTask,
    error: taskError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_tasks")
      .select(
        "id, status, source_type, assigned_to_agent_id"
      )
      .eq("id", taskId)
      .maybeSingle();

  if (taskError) {
    throw taskError;
  }

  const task =
    rawTask as unknown as
      RevisionTaskRow | null;

  if (!task) {
    throw new Error(
      "Founder Review revision task was not found."
    );
  }

  if (
    task.source_type !==
    "founder_review"
  ) {
    throw new Error(
      "Only Founder Review revision tasks can use this runner."
    );
  }

  if (
    !task.assigned_to_agent_id
  ) {
    throw new Error(
      "Founder Review revision task has no assigned owner."
    );
  }

  if (
    task.status !== "pending"
  ) {
    return {
      ok: false,
      skipped: true,
      reason:
        `Revision task is ${task.status}, not pending.`,
    };
  }

  const {
    data: rawAgent,
    error: agentError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key"
      )
      .eq(
        "id",
        task.assigned_to_agent_id
      )
      .eq(
        "status",
        "active"
      )
      .eq(
        "enabled",
        true
      )
      .maybeSingle();

  if (agentError) {
    throw agentError;
  }

  const agent =
    rawAgent as unknown as
      AgentRow | null;

  if (!agent) {
    throw new Error(
      "Assigned revision owner is not an active AI agent."
    );
  }

  const transition =
    await transitionAssignedAITask({
      taskId:
        task.id,

      actorAgentKey:
        agent.agent_key,

      nextStatus:
        "in_progress",

      transitionSource:
        "founder_review_revision",
    });

  if (
    !transition.changed
  ) {
    return {
      ok: false,
      skipped: true,
      reason:
        "Revision task did not transition to in_progress.",
    };
  }

  try {
    const execution =
      await executeMeetingTask({
        taskId:
          task.id,
      });

    return {
      ok: true,
      taskId:
        task.id,
      ownerAgentKey:
        agent.agent_key,
      execution,
    };
  } catch (error) {
    console.error(
      "Founder Review revision execution failed:",
      error
    );

    throw error;
  }
}
