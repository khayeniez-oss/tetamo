import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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