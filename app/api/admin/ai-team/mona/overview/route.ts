import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

import {
  buildBusinessGrowthAnalytics,
} from "@/lib/reporting/business-growth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

type MonaAgentRow = {
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

async function countConversations(
  apply?: (
    query: ReturnType<
      typeof aiTeamSupabaseAdmin.from
    > extends never
      ? never
      : any
  ) => any
) {
  let query =
    aiTeamSupabaseAdmin
      .from(
        "whatsapp_conversations"
      )
      .select(
        "id",
        {
          count:
            "exact",
          head:
            true,
        }
      );

  if (apply) {
    query =
      apply(
        query
      );
  }

  const {
    count,
    error,
  } =
    await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
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

  try {
    requireAgentPermission(
      "mona",
      "read_ai_team_data"
    );

    requireAgentPermission(
      "mona",
      "read_sales_data"
    );

    const {
      data:
        monaRaw,
      error:
        monaError,
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
            "mission",
            "status",
            "enabled",
            "version",
            "updated_at",
          ].join(",")
        )
        .eq(
          "agent_key",
          "mona"
        )
        .maybeSingle();

    if (monaError) {
      throw monaError;
    }

    if (!monaRaw) {
      throw new Error(
        "Mona is not configured in the AI Team."
      );
    }

    const mona =
      monaRaw as unknown as
        MonaAgentRow;

    const nowIso =
      new Date()
        .toISOString();

    const [
      businessGrowth,
      totalConversations,
      activeAi,
      needsAdmin,
      pausedAi,
      handled,
      followupWaiting,
      followupDue,
      dependencyControlled,
      conversationsResult,
      tasksResult,
      outgoingHandoffsResult,
      incomingHandoffsResult,
      insightsResult,
      activityResult,
    ] =
      await Promise.all([
        buildBusinessGrowthAnalytics(),

        countConversations(),

        countConversations(
          (query) =>
            query
              .eq(
                "ai_enabled",
                true
              )
              .eq(
                "handover_to_admin",
                false
              )
        ),

        countConversations(
          (query) =>
            query.eq(
              "handover_to_admin",
              true
            )
        ),

        countConversations(
          (query) =>
            query.eq(
              "ai_enabled",
              false
            )
        ),

        countConversations(
          (query) =>
            query.eq(
              "status",
              "handled"
            )
        ),

        countConversations(
          (query) =>
            query.not(
              "mona_followup_waiting_since",
              "is",
              null
            )
        ),

        countConversations(
          (query) =>
            query
              .not(
                "mona_next_followup_due_at",
                "is",
                null
              )
              .lte(
                "mona_next_followup_due_at",
                nowIso
              )
        ),

        countConversations(
          (query) =>
            query.eq(
              "mona_dependency_controlled",
              true
            )
        ),

        aiTeamSupabaseAdmin
          .from(
            "whatsapp_conversations"
          )
          .select(
            [
              "id",
              "phone",
              "phone_e164",
              "profile_name",
              "channel",
              "status",
              "ai_enabled",
              "handover_to_admin",
              "handover_reason",
              "sales_stage",
              "sales_stage_updated_at",
              "sales_stage_updated_by",
              "suggested_sales_stage",
              "suggested_sales_stage_reason",
              "suggested_sales_stage_confidence",
              "suggested_sales_stage_at",
              "mona_followup_count",
              "mona_followup_waiting_since",
              "mona_first_followup_sent_at",
              "mona_next_followup_due_at",
              "mona_dependency_controlled",
              "mona_dependency_reason",
              "last_inbound_at",
              "last_message",
              "last_message_direction",
              "last_message_at",
              "ad_referral_source",
              "free_entry_point_source",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .order(
            "last_message_at",
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
            mona.id
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
              "from_agent_id",
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
            mona.id
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
              "from_agent_id",
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
            "to_agent_id",
            mona.id
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
            mona.id
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
            mona.id
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

    const queryErrors =
      [
        conversationsResult.error,
        tasksResult.error,
        outgoingHandoffsResult.error,
        incomingHandoffsResult.error,
        insightsResult.error,
        activityResult.error,
      ].filter(
        Boolean
      );

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

      mona,

      salesOperations: {
        totalConversations,
        activeAi,
        needsAdmin,
        pausedAi,
        handled,

        stages:
          businessGrowth
            .crmSnapshot
            .stages,

        commercial:
          businessGrowth
            .crmSnapshot
            .commercial,

        channels:
          businessGrowth
            .crmSnapshot
            .channels,

        attribution:
          businessGrowth
            .crmSnapshot
            .attribution,

        verifiedBusiness:
          businessGrowth
            .verifiedBusiness,
      },

      followUpControl: {
        waiting:
          followupWaiting,

        dueOrOverdue:
          followupDue,

        dependencyControlled,
      },

      reportingIntegrity: {
        historicalConversionReliable:
          businessGrowth
            .stageHistory
            .historicalConversionReliable,

        automaticHistoryAvailable:
          businessGrowth
            .stageHistory
            .automaticHistoryAvailable,

        historyRows:
          businessGrowth
            .stageHistory
            .totalRows,

        warning:
          businessGrowth
            .stageHistory
            .warning,
      },

      pipeline: {
        recentConversations:
          conversationsResult.data ??
          [],
      },

      aiTeam: {
        tasks:
          tasksResult.data ??
          [],

        outgoingHandoffs:
          outgoingHandoffsResult.data ??
          [],

        incomingHandoffs:
          incomingHandoffsResult.data ??
          [],

        insights:
          insightsResult.data ??
          [],

        activity:
          activityResult.data ??
          [],
      },

      safety: {
        workspaceMode:
          "read_only_operations_overview",

        sendsExternalMessages:
          false,

        changesPricing:
          false,

        spendsMoney:
          false,

        note:
          "Mona's AI Team workspace reads existing operational data. It does not create a second WhatsApp sending path.",
      },
    });
  } catch (error) {
    console.error(
      "Mona sales overview failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof
            Error
            ? error.message
            : "Unable to load Mona sales overview.",
      },
      {
        status: 500,
      }
    );
  }
}
