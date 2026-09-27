import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  isAIAgentKey,
} from "@/lib/ai-team/permissions/agent-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_AGENT_STATUSES = [
  "inactive",
  "active",
  "paused",
  "maintenance",
] as const;

type AIAgentStatus =
  (typeof AI_AGENT_STATUSES)[number];

export async function GET(req: Request) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const { data: agents, error } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        [
          "id",
          "agent_key",
          "display_name",
          "role_title",
          "mission",
          "status",
          "reports_to_agent_id",
          "version",
          "enabled",
          "updated_at",
        ].join(",")
      )
      .order("display_name", {
        ascending: true,
      });

  if (error) {
    console.error(
      "AI Team agents fetch failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI Team agents.",
      },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    agents: agents ?? [],
    generatedAt: new Date().toISOString(),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  let body: {
    agentKey?: unknown;
    status?: unknown;
    enabled?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      { status: 400 }
    );
  }

  if (!isAIAgentKey(body.agentKey)) {
    return Response.json(
      {
        ok: false,
        error: "Invalid AI agent.",
      },
      { status: 400 }
    );
  }

  if (
    typeof body.status !== "string" ||
    !AI_AGENT_STATUSES.includes(
      body.status as AIAgentStatus
    )
  ) {
    return Response.json(
      {
        ok: false,
        error: "Invalid AI agent status.",
      },
      { status: 400 }
    );
  }

  if (typeof body.enabled !== "boolean") {
    return Response.json(
      {
        ok: false,
        error:
          "AI agent enabled must be true or false.",
      },
      { status: 400 }
    );
  }

  const { data: agent, error } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .update({
        status: body.status,
        enabled: body.enabled,
      })
      .eq("agent_key", body.agentKey)
      .select(
        [
          "id",
          "agent_key",
          "display_name",
          "role_title",
          "mission",
          "status",
          "reports_to_agent_id",
          "version",
          "enabled",
          "updated_at",
        ].join(",")
      )
      .maybeSingle();

  if (error) {
    console.error(
      "AI Team agent status update failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to update AI Team agent.",
      },
      { status: 500 }
    );
  }

  if (!agent) {
    return Response.json(
      {
        ok: false,
        error: "AI Team agent was not found.",
      },
      { status: 404 }
    );
  }

  return Response.json({
    ok: true,
    agent,
    updatedAt: new Date().toISOString(),
  });
}
