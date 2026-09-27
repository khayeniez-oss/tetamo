import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type AgentRow = {
  id: string;
  agent_key: string;
  display_name: string;
  role_title: string | null;
};

type TaskRow = {
  requested_by_agent_id:
    string | null;
  assigned_to_agent_id:
    string | null;
  [key: string]:
    unknown;
};

type ApprovalRow = {
  requested_by_agent_id:
    string | null;
  [key: string]:
    unknown;
};

type ActivityRow = {
  agent_id:
    string | null;
  [key: string]:
    unknown;
};

function agentSummary(
  agent:
    | AgentRow
    | undefined
    | null
) {
  if (!agent) {
    return null;
  }

  return {
    id:
      agent.id,

    agent_key:
      agent.agent_key,

    display_name:
      agent.display_name,

    role_title:
      agent.role_title,
  };
}

export async function GET(
  req: Request
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  const [
    agentsResult,
    tasksResult,
    approvalsResult,
    activityResult,
  ] =
    await Promise.all([
      aiTeamSupabaseAdmin
        .from(
          "ai_agents"
        )
        .select(
          "id, agent_key, display_name, role_title"
        ),

      aiTeamSupabaseAdmin
        .from(
          "ai_tasks"
        )
        .select(
          [
            "id",
            "title",
            "description",
            "requested_by_agent_id",
            "assigned_to_agent_id",
            "requested_by_user_id",
            "priority",
            "status",
            "source_type",
            "source_id",
            "related_entity_type",
            "related_entity_id",
            "expected_outcome",
            "result_summary",
            "requires_approval",
            "due_at",
            "started_at",
            "completed_at",
            "metadata",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .order(
          "updated_at",
          {
            ascending:
              false,
          }
        )
        .limit(250),

      aiTeamSupabaseAdmin
        .from(
          "ai_approvals"
        )
        .select(
          [
            "id",
            "requested_by_agent_id",
            "task_id",
            "decision_id",
            "action_type",
            "action_summary",
            "risk_level",
            "status",
            "requested_payload",
            "reviewed_by_user_id",
            "reviewed_at",
            "review_notes",
            "execution_status",
            "executed_at",
            "execution_result",
            "expires_at",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(200),

      aiTeamSupabaseAdmin
        .from(
          "ai_activity"
        )
        .select(
          [
            "id",
            "agent_id",
            "actor_user_id",
            "event_type",
            "action",
            "entity_type",
            "entity_id",
            "task_id",
            "severity",
            "details",
            "created_at",
          ].join(",")
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(300),
    ]);

  if (
    agentsResult.error
  ) {
    console.error(
      "AI workboard agent lookup failed:",
      agentsResult.error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI Team agents.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    tasksResult.error
  ) {
    console.error(
      "AI workboard task lookup failed:",
      tasksResult.error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI Team tasks.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    approvalsResult.error
  ) {
    console.error(
      "AI workboard approval lookup failed:",
      approvalsResult.error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI Team approvals.",
      },
      {
        status: 500,
      }
    );
  }

  if (
    activityResult.error
  ) {
    console.error(
      "AI workboard activity lookup failed:",
      activityResult.error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI Team activity.",
      },
      {
        status: 500,
      }
    );
  }

  const agents =
    (
      agentsResult.data ??
      []
    ) as AgentRow[];

  const agentById =
    new Map(
      agents.map(
        (agent) => [
          agent.id,
          agent,
        ]
      )
    );

  const taskRows =
    (
      tasksResult.data ??
      []
    ) as unknown as
      TaskRow[];

  const tasks =
    taskRows.map(
      (task) => ({
        ...task,

        requested_by_agent:
          task
            .requested_by_agent_id
            ? agentSummary(
                agentById.get(
                  task
                    .requested_by_agent_id
                )
              )
            : null,

        assigned_to_agent:
          task
            .assigned_to_agent_id
            ? agentSummary(
                agentById.get(
                  task
                    .assigned_to_agent_id
                )
              )
            : null,
      })
    );

  const approvalRows =
    (
      approvalsResult.data ??
      []
    ) as unknown as
      ApprovalRow[];

  const approvals =
    approvalRows.map(
      (approval) => ({
        ...approval,

        requested_by_agent:
          approval
            .requested_by_agent_id
            ? agentSummary(
                agentById.get(
                  approval
                    .requested_by_agent_id
                )
              )
            : null,
      })
    );

  const activityRows =
    (
      activityResult.data ??
      []
    ) as unknown as
      ActivityRow[];

  const activity =
    activityRows.map(
      (entry) => ({
        ...entry,

        agent:
          entry.agent_id
            ? agentSummary(
                agentById.get(
                  entry.agent_id
                )
              )
            : null,
      })
    );

  return Response.json({
    ok: true,

    generatedAt:
      new Date()
        .toISOString(),

    tasks,

    approvals,

    activity,
  });
}
