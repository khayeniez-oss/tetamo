import "server-only";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

import {
  buildBusinessGrowthAnalytics,
} from "@/lib/reporting/business-growth";

import {
  REPORTING_TIME_ZONE,
} from "@/lib/reporting/revenue";

type AgentRow = {
  id: string;
  agent_key: string;
  display_name: string;
  enabled: boolean;
  status: string;
};

export type MonaSalesReviewResult = {
  generatedAt: string;
  reportingTimezone: string;

  snapshot: {
    totalConversations: number;
    activeAi: number;
    needsAdmin: number;
    followupWaiting: number;
    followupDue: number;
    followupOverdueBeyond15m: number;
    packageIntent: number;
    openCommercialPipeline: number;
    paymentStarted: number;
    paymentFailed: number;
    closedWon: number;
    closedLost: number;
    verifiedSalesThisMonth: number;
  };

  report: {
    created: boolean;
    reportId: string | null;
    reportKey: string;
  };

  insight: {
    created: boolean;
    insightId: string | null;
    insightKey: string;
  };

  tasks: {
    created: number;
    existing: number;
  };

  adminHandoff: {
    created: boolean;
    existing: boolean;
    handoffId: string | null;
  };
};

function dateKey(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          REPORTING_TIME_ZONE,
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  return `${values.year}-${values.month}-${values.day}`;
}

async function countConversations(
  apply?: (
    query: any
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

async function loadAgents() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, agent_key, display_name, enabled, status"
      )
      .in(
        "agent_key",
        [
          "mona",
          "jake",
        ]
      );

  if (error) {
    throw error;
  }

  const rows =
    (data ??
      []) as AgentRow[];

  const mona =
    rows.find(
      (row) =>
        row.agent_key ===
        "mona"
    );

  const jake =
    rows.find(
      (row) =>
        row.agent_key ===
        "jake"
    );

  if (!mona) {
    throw new Error(
      "Mona AI agent was not found."
    );
  }

  return {
    mona,
    jake:
      jake ??
      null,
  };
}

async function createActionTask(
  params: {
    monaId: string;
    sourceId: string;
    title: string;
    description: string;
    priority:
      | "normal"
      | "high";
    expectedOutcome: string;
  }
) {
  const {
    data:
      existing,
    error:
      existingError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id"
      )
      .eq(
        "source_type",
        "mona_sales_review_action"
      )
      .eq(
        "source_id",
        params.sourceId
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return {
      created:
        false,
      taskId:
        String(
          existing.id
        ),
    };
  }

  const {
    data:
      created,
    error:
      createError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .insert({
        title:
          params.title,

        description:
          params.description,

        requested_by_agent_id:
          params.monaId,

        assigned_to_agent_id:
          params.monaId,

        priority:
          params.priority,

        status:
          "pending",

        source_type:
          "mona_sales_review_action",

        source_id:
          params.sourceId,

        related_entity_type:
          "whatsapp_sales_operations",

        expected_outcome:
          params.expectedOutcome,

        requires_approval:
          false,

        metadata: {
          source:
            "mona_sales_review",

          external_action_authorized:
            false,
        },
      })
      .select(
        "id"
      )
      .single();

  if (createError) {
    if (
      createError.code ===
      "23505"
    ) {
      return {
        created:
          false,
        taskId:
          null,
      };
    }

    throw createError;
  }

  return {
    created:
      true,
    taskId:
      String(
        created.id
      ),
  };
}

export async function runMonaSalesReview(
  options?: {
    now?: Date;
  }
): Promise<MonaSalesReviewResult> {
  requireAgentPermission(
    "mona",
    "read_sales_data"
  );

  requireAgentPermission(
    "mona",
    "read_ai_team_data"
  );

  requireAgentPermission(
    "mona",
    "create_report"
  );

  requireAgentPermission(
    "mona",
    "create_insight"
  );

  requireAgentPermission(
    "mona",
    "create_internal_task"
  );

  requireAgentPermission(
    "mona",
    "create_handoff"
  );

  const now =
    options?.now ??
    new Date();

  const generatedAt =
    now.toISOString();

  const todayKey =
    dateKey(
      now
    );

  const fifteenMinutesAgo =
    new Date(
      now.getTime() -
        15 *
          60 *
          1000
    ).toISOString();

  const {
    mona,
    jake,
  } =
    await loadAgents();

  if (
    !mona.enabled ||
    mona.status !==
      "active"
  ) {
    throw new Error(
      "Mona must be active before running her Sales Operations Review."
    );
  }

  const [
    businessGrowth,
    totalConversations,
    activeAi,
    needsAdmin,
    followupWaiting,
    followupDue,
    followupOverdueBeyond15m,
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
              generatedAt
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
              fifteenMinutesAgo
            )
      ),
    ]);

  const stages =
    businessGrowth
      .crmSnapshot
      .stages;

  const commercial =
    businessGrowth
      .crmSnapshot
      .commercial;

  const verifiedMonth =
    businessGrowth
      .verifiedBusiness
      .month;

  const snapshot = {
    totalConversations,
    activeAi,
    needsAdmin,
    followupWaiting,
    followupDue,
    followupOverdueBeyond15m,

    packageIntent:
      commercial
        .packageIntent,

    openCommercialPipeline:
      commercial
        .openCommercialPipeline,

    paymentStarted:
      stages
        .payment_started,

    paymentFailed:
      stages
        .payment_failed,

    closedWon:
      stages
        .closed_won,

    closedLost:
      stages
        .closed_lost,

    verifiedSalesThisMonth:
      verifiedMonth
        .sales,
  };

  const reportKey =
    `mona_daily_sales_review:${todayKey}`;

  const insightKey =
    `mona_sales_operations:${todayKey}`;

  const [
    existingReportResult,
    existingInsightResult,
  ] =
    await Promise.all([
      aiTeamSupabaseAdmin
        .from(
          "ai_reports"
        )
        .select(
          "id"
        )
        .eq(
          "agent_id",
          mona.id
        )
        .eq(
          "report_type",
          "sales"
        )
        .contains(
          "source_data",
          {
            report_key:
              reportKey,
          }
        )
        .maybeSingle(),

      aiTeamSupabaseAdmin
        .from(
          "ai_insights"
        )
        .select(
          "id"
        )
        .eq(
          "agent_id",
          mona.id
        )
        .contains(
          "metadata",
          {
            insight_key:
              insightKey,
          }
        )
        .maybeSingle(),
    ]);

  if (
    existingReportResult.error
  ) {
    throw existingReportResult.error;
  }

  if (
    existingInsightResult.error
  ) {
    throw existingInsightResult.error;
  }

  let reportId =
    existingReportResult
      .data?.id
      ? String(
          existingReportResult
            .data.id
        )
      : null;

  let reportCreated =
    false;

  const reportSummary =
    [
      `Current CRM snapshot contains ${totalConversations} conversations.`,
      `${commercial.openCommercialPipeline} are currently in the open commercial pipeline and ${commercial.packageIntent} show package intent.`,
      `${needsAdmin} conversations currently require Admin attention.`,
      `${followupWaiting} conversations have an active Mona waiting cycle; ${followupDue} are currently due and ${followupOverdueBeyond15m} have remained overdue for more than 15 minutes.`,
      `Current payment stages: ${stages.payment_started} payment started and ${stages.payment_failed} payment failed.`,
      `Verified sales this month: ${verifiedMonth.sales}.`,
      "These are current CRM stage counts, not historical conversion rates.",
    ].join(
      " "
    );

  if (!reportId) {
    const {
      data:
        createdReport,
      error:
        reportError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_reports"
        )
        .insert({
          agent_id:
            mona.id,

          report_type:
            "sales",

          title:
            `Mona Sales Operations Review — ${todayKey}`,

          period_start:
            `${todayKey}T00:00:00.000Z`,

          period_end:
            generatedAt,

          summary:
            reportSummary,

          metrics:
            snapshot,

          findings: [
            `${needsAdmin} conversations currently require Admin attention.`,
            `${followupOverdueBeyond15m} Mona follow-ups have remained overdue beyond 15 minutes.`,
            `${stages.payment_failed} conversations are currently classified as payment failed.`,
          ],

          recommendations: [
            "Review Admin handovers through the existing WhatsApp/Admin workflow.",
            "Investigate follow-up scheduling only when items remain overdue beyond the normal five-minute scheduler cadence.",
            "Do not infer historical conversion rates from incomplete stage history.",
          ],

          recipient_agent_id:
            jake?.id ??
            null,

          source_data: {
            source:
              "mona_sales_review",

            report_key:
              reportKey,

            generated_at:
              generatedAt,

            historical_conversion_reliable:
              false,

            external_action_authorized:
              false,
          },
        })
        .select(
          "id"
        )
        .single();

    if (reportError) {
      if (
        reportError.code !==
        "23505"
      ) {
        throw reportError;
      }
    } else {
      reportId =
        String(
          createdReport.id
        );

      reportCreated =
        true;
    }
  } else {
    const {
      error:
        refreshReportError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_reports"
        )
        .update({
          period_end:
            generatedAt,

          summary:
            reportSummary,

          metrics:
            snapshot,

          findings: [
            `${needsAdmin} conversations currently require Admin attention.`,
            `${followupOverdueBeyond15m} Mona follow-ups have remained overdue beyond 15 minutes.`,
            `${stages.payment_failed} conversations are currently classified as payment failed.`,
          ],

          recommendations: [
            "Review Admin handovers through the existing WhatsApp/Admin workflow.",
            "Investigate follow-up scheduling only when items remain overdue beyond the normal five-minute scheduler cadence.",
            "Do not infer historical conversion rates from incomplete stage history.",
          ],

          source_data: {
            source:
              "mona_sales_review",

            report_key:
              reportKey,

            generated_at:
              generatedAt,

            historical_conversion_reliable:
              false,

            external_action_authorized:
              false,
          },
        })
        .eq(
          "id",
          reportId
        );

    if (refreshReportError) {
      throw refreshReportError;
    }
  }

  let insightId =
    existingInsightResult
      .data?.id
      ? String(
          existingInsightResult
            .data.id
        )
      : null;

  let insightCreated =
    false;

  const hasOperationalRisk =
    followupOverdueBeyond15m >
      0 ||
    stages.payment_failed >
      0;

  if (!insightId) {
    const {
      data:
        createdInsight,
      error:
        insightError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_insights"
        )
        .insert({
          agent_id:
            mona.id,

          insight_type:
            hasOperationalRisk
              ? "risk"
              : "observation",

          title:
            `Mona Sales Operations Snapshot — ${todayKey}`,

          summary:
            reportSummary,

          confidence:
            "confirmed",

          priority:
            hasOperationalRisk
              ? "high"
              : needsAdmin >
                  0
                ? "normal"
                : "low",

          evidence: [
            {
              source:
                "whatsapp_conversations",

              metric:
                "open_commercial_pipeline",

              value:
                commercial
                  .openCommercialPipeline,
            },
            {
              source:
                "whatsapp_conversations",

              metric:
                "needs_admin",

              value:
                needsAdmin,
            },
            {
              source:
                "whatsapp_conversations",

              metric:
                "followup_overdue_beyond_15m",

              value:
                followupOverdueBeyond15m,
            },
            {
              source:
                "verified_revenue_reporting",

              metric:
                "verified_sales_this_month",

              value:
                verifiedMonth
                  .sales,
            },
          ],

          related_entity_type:
            "whatsapp_sales_operations",

          related_entity_id:
            todayKey,

          status:
            "open",

          metadata: {
            source:
              "mona_sales_review",

            insight_key:
              insightKey,

            report_id:
              reportId,

            historical_conversion_reliable:
              false,

            external_action_authorized:
              false,
          },
        })
        .select(
          "id"
        )
        .single();

    if (insightError) {
      if (
        insightError.code !==
        "23505"
      ) {
        throw insightError;
      }
    } else {
      insightId =
        String(
          createdInsight.id
        );

      insightCreated =
        true;
    }
  } else {
    const {
      error:
        refreshInsightError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_insights"
        )
        .update({
          insight_type:
            hasOperationalRisk
              ? "risk"
              : "observation",

          title:
            `Mona Sales Operations Snapshot — ${todayKey}`,

          summary:
            reportSummary,

          confidence:
            "confirmed",

          priority:
            hasOperationalRisk
              ? "high"
              : needsAdmin > 0
                ? "normal"
                : "low",

          evidence: [
            {
              source:
                "whatsapp_conversations",
              metric:
                "open_commercial_pipeline",
              value:
                commercial.openCommercialPipeline,
            },
            {
              source:
                "whatsapp_conversations",
              metric:
                "needs_admin",
              value:
                needsAdmin,
            },
            {
              source:
                "whatsapp_conversations",
              metric:
                "followup_overdue_beyond_15m",
              value:
                followupOverdueBeyond15m,
            },
            {
              source:
                "verified_revenue_reporting",
              metric:
                "verified_sales_this_month",
              value:
                verifiedMonth.sales,
            },
          ],

          related_entity_type:
            "whatsapp_sales_operations",

          related_entity_id:
            todayKey,

          metadata: {
            source:
              "mona_sales_review",

            insight_key:
              insightKey,

            report_id:
              reportId,

            generated_at:
              generatedAt,

            historical_conversion_reliable:
              false,

            external_action_authorized:
              false,
          },
        })
        .eq(
          "id",
          insightId
        );

    if (refreshInsightError) {
      throw refreshInsightError;
    }
  }

  let tasksCreated =
    0;

  let tasksExisting =
    0;

  if (
    followupOverdueBeyond15m >
    0
  ) {
    const result =
      await createActionTask({
        monaId:
          mona.id,

        sourceId:
          `${todayKey}:stuck_followups`,

        title:
          "Review overdue Mona follow-up queue",

        description:
          `${followupOverdueBeyond15m} Mona follow-up cycle(s) have remained overdue beyond 15 minutes, which exceeds the normal five-minute scheduler cadence. Investigate the internal scheduler and conversation eligibility state. Do not send customer messages from the AI Team workspace.`,

        priority:
          followupOverdueBeyond15m >=
          25
            ? "high"
            : "normal",

        expectedOutcome:
          "Confirm whether the follow-up scheduler is healthy and clear only invalid/stale timer state. Customer-facing sending remains controlled by the existing WhatsApp flow.",
      });

    if (
      result.created
    ) {
      tasksCreated +=
        1;
    } else {
      tasksExisting +=
        1;
    }
  }

  if (
    stages.payment_failed >
    0
  ) {
    const result =
      await createActionTask({
        monaId:
          mona.id,

        sourceId:
          `${todayKey}:payment_failed`,

        title:
          "Review payment-failed sales conversations",

        description:
          `${stages.payment_failed} conversation(s) are currently classified as payment failed. Review the existing sales/payment records and determine whether internal follow-up or human review is required. Do not issue refunds, change pricing or alter payment records autonomously.`,

        priority:
          "high",

        expectedOutcome:
          "A documented internal assessment of the current payment-failed queue with any human escalation clearly identified.",
      });

    if (
      result.created
    ) {
      tasksCreated +=
        1;
    } else {
      tasksExisting +=
        1;
    }
  }

  let handoffCreated =
    false;

  let handoffExisting =
    false;

  let handoffId:
    string | null =
      null;

  if (
    needsAdmin >
      0 &&
    jake
  ) {
    const {
      data:
        existingHandoff,
      error:
        existingHandoffError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_handoffs"
        )
        .select(
          "id"
        )
        .eq(
          "from_agent_id",
          mona.id
        )
        .eq(
          "to_agent_id",
          jake.id
        )
        .eq(
          "handoff_type",
          "sales_admin_attention_summary"
        )
        .in(
          "status",
          [
            "pending",
            "accepted",
          ]
        )
        .maybeSingle();

    if (
      existingHandoffError
    ) {
      throw existingHandoffError;
    }

    if (
      existingHandoff?.id
    ) {
      handoffExisting =
        true;

      handoffId =
        String(
          existingHandoff.id
        );
    } else {
      const {
        data:
          createdHandoff,
        error:
          handoffError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_handoffs"
          )
          .insert({
            from_agent_id:
              mona.id,

            to_agent_id:
              jake.id,

            handoff_type:
              "sales_admin_attention_summary",

            summary:
              `${needsAdmin} customer conversation(s) currently require Admin attention in the existing WhatsApp workflow.`,

            context: {
              source:
                "mona_sales_review",

              needs_admin:
                needsAdmin,

              generated_at:
                generatedAt,

              contains_customer_pii:
                false,

              external_action_authorized:
                false,

              instruction:
                "Coordinate internal ownership only. Do not send customer messages from this handoff.",
            },

            status:
              "pending",
          })
          .select(
            "id"
          )
          .single();

      if (handoffError) {
        if (
          handoffError.code ===
          "23505"
        ) {
          handoffExisting =
            true;
        } else {
          throw handoffError;
        }
      } else {
        handoffCreated =
          true;

        handoffId =
          String(
            createdHandoff.id
          );
      }
    }
  }

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
          mona.id,

        event_type:
          "sales_operations",

        action:
          "sales_review_completed",

        entity_type:
          "whatsapp_sales_operations",

        entity_id:
          todayKey,

        severity:
          hasOperationalRisk
            ? "warning"
            : "info",

        details: {
          source:
            "mona_sales_review",

          report_id:
            reportId,

          insight_id:
            insightId,

          snapshot,

          report_created:
            reportCreated,

          insight_created:
            insightCreated,

          tasks_created:
            tasksCreated,

          tasks_existing:
            tasksExisting,

          admin_handoff_created:
            handoffCreated,

          admin_handoff_existing:
            handoffExisting,

          external_action_authorized:
            false,
        },
      });

  if (activityError) {
    throw activityError;
  }

  return {
    generatedAt,
    reportingTimezone:
      REPORTING_TIME_ZONE,

    snapshot,

    report: {
      created:
        reportCreated,

      reportId,

      reportKey,
    },

    insight: {
      created:
        insightCreated,

      insightId,

      insightKey,
    },

    tasks: {
      created:
        tasksCreated,

      existing:
        tasksExisting,
    },

    adminHandoff: {
      created:
        handoffCreated,

      existing:
        handoffExisting,

      handoffId,
    },
  };
}
