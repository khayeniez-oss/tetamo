import {
  requireTetamoAdmin,
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

import {
  buildBusinessGrowthAnalytics,
} from "@/lib/reporting/business-growth";

import {
  buildGrowthAnalytics,
} from "@/lib/reporting/growth-analytics";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

type LolaAgentRow = {
  id: string;
  agent_key: string;
  display_name: string;
  role_title: string;
  mission: string;
  status: string;
  enabled: boolean;
  version: number;
  updated_at: string;
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

  try {
    requireAgentPermission(
      "lola",
      "read_ai_team_data"
    );

    requireAgentPermission(
      "lola",
      "read_sales_data"
    );

    requireAgentPermission(
      "lola",
      "read_analytics_data"
    );

    requireAgentPermission(
      "lola",
      "read_finance_data"
    );

    const {
      data: lola,
      error: lolaError,
    } =
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
            "enabled",
            "version",
            "updated_at",
          ].join(",")
        )
        .eq(
          "agent_key",
          "lola"
        )
        .maybeSingle();

    if (lolaError) {
      throw lolaError;
    }

    if (!lola) {
      throw new Error(
        "Lola is not configured in the AI Team."
      );
    }

    const lolaRow =
      lola as unknown as LolaAgentRow;

    const [
      businessGrowth,
      marketplaceGrowth,
      themesResult,
      decisionsResult,
      handoffsResult,
      tasksResult,
      activityResult,
      insightsResult,
    ] =
      await Promise.all([
        buildBusinessGrowthAnalytics(),

        buildGrowthAnalytics(),

        aiTeamSupabaseAdmin
          .from(
            "ai_inquiry_themes"
          )
          .select(
            [
              "id",
              "theme_key",
              "title",
              "summary",
              "signal_count",
              "distinct_conversation_count",
              "first_seen_at",
              "last_seen_at",
              "customer_types",
              "representative_questions",
              "content_score",
              "growth_score",
              "confidence",
              "status",
              "latest_insight_id",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .order(
            "growth_score",
            {
              ascending:
                false,
            }
          )
          .order(
            "last_seen_at",
            {
              ascending:
                false,
              nullsFirst:
                false,
            }
          )
          .limit(50),

        aiTeamSupabaseAdmin
          .from(
            "ai_decisions"
          )
          .select(
            [
              "id",
              "title",
              "description",
              "status",
              "rationale",
              "related_task_id",
              "related_entity_type",
              "related_entity_id",
              "decided_at",
              "metadata",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq(
            "proposed_by_agent_id",
            lolaRow.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(100),

        aiTeamSupabaseAdmin
          .from(
            "ai_handoffs"
          )
          .select(
            [
              "id",
              "to_agent_id",
              "task_id",
              "handoff_type",
              "summary",
              "context",
              "status",
              "accepted_at",
              "completed_at",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq(
            "from_agent_id",
            lolaRow.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(100),

        aiTeamSupabaseAdmin
          .from(
            "ai_tasks"
          )
          .select(
            [
              "id",
              "title",
              "description",
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
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq(
            "assigned_to_agent_id",
            lolaRow.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(100),

        aiTeamSupabaseAdmin
          .from(
            "ai_activity"
          )
          .select(
            [
              "id",
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
          .eq(
            "agent_id",
            lolaRow.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(100),

        aiTeamSupabaseAdmin
          .from(
            "ai_insights"
          )
          .select(
            [
              "id",
              "insight_type",
              "title",
              "summary",
              "confidence",
              "priority",
              "status",
              "related_entity_type",
              "related_entity_id",
              "metadata",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq(
            "agent_id",
            lolaRow.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(100),
      ]);

    const queryErrors = [
      themesResult.error,
      decisionsResult.error,
      handoffsResult.error,
      tasksResult.error,
      activityResult.error,
      insightsResult.error,
    ].filter(Boolean);

    if (
      queryErrors.length >
      0
    ) {
      throw queryErrors[0];
    }

    return Response.json({
      ok: true,

      generatedAt:
        new Date()
          .toISOString(),

      lola:
        lolaRow,

      businessGrowth,

      marketplaceGrowth,

      growthIntelligence: {
        themes:
          themesResult.data ??
          [],

        insights:
          insightsResult.data ??
          [],

        decisions:
          decisionsResult.data ??
          [],

        handoffs:
          handoffsResult.data ??
          [],

        tasks:
          tasksResult.data ??
          [],

        activity:
          activityResult.data ??
          [],
      },
    });
  } catch (error) {
    console.error(
      "Lola growth overview failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to load Lola growth overview.",
      },
      {
        status: 500,
      }
    );
  }
}
