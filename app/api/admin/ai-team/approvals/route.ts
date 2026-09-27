import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type ApprovalRow = {
  id: string;
  requested_by_agent_id:
    string | null;
  task_id:
    string | null;
  decision_id:
    string | null;
  action_type: string;
  action_summary: string;
  risk_level: string;
  status: string;
  requested_payload:
    Record<string, unknown> | null;
  execution_status: string;
  expires_at:
    string | null;
  created_at: string;
  updated_at: string;
};

type AgentRow = {
  id: string;
  agent_key: string;
  display_name: string;
  role_title:
    string | null;
};

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

  const {
    data: approvalData,
    error: approvalError,
  } =
    await aiTeamSupabaseAdmin
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
          "execution_status",
          "expires_at",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq(
        "status",
        "pending"
      )
      .eq(
        "action_type",
        "publish_content"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(200);

  if (approvalError) {
    console.error(
      "AI approval queue lookup failed:",
      approvalError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI approvals.",
      },
      {
        status: 500,
      }
    );
  }

  const approvals =
    (
      approvalData ?? []
    ) as unknown as
      ApprovalRow[];

  const agentIds =
    Array.from(
      new Set(
        approvals
          .map(
            (row) =>
              row
                .requested_by_agent_id
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    );

  let agents:
    AgentRow[] = [];

  if (
    agentIds.length >
    0
  ) {
    const {
      data: agentData,
      error: agentError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_agents"
        )
        .select(
          [
            "id",
            "agent_key",
            "display_name",
            "role_title",
          ].join(",")
        )
        .in(
          "id",
          agentIds
        );

    if (agentError) {
      console.error(
        "AI approval agent lookup failed:",
        agentError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to load AI approval agents.",
        },
        {
          status: 500,
        }
      );
    }

    agents =
      (
        agentData ?? []
      ) as unknown as
        AgentRow[];
  }

  const agentById =
    new Map(
      agents.map(
        (agent) => [
          agent.id,
          agent,
        ]
      )
    );

  return Response.json({
    ok: true,

    approvals:
      approvals.map(
        (approval) => {
          const agent =
            approval
              .requested_by_agent_id
              ? agentById.get(
                  approval
                    .requested_by_agent_id
                )
              : null;

          return {
            ...approval,

            requested_by_agent:
              agent
                ? {
                    id:
                      agent.id,

                    agent_key:
                      agent
                        .agent_key,

                    display_name:
                      agent
                        .display_name,

                    role_title:
                      agent
                        .role_title,
                  }
                : null,
          };
        }
      ),
  });
}
