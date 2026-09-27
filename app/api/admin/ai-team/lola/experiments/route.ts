import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type LolaRow = {
  id: string;
  agent_key: string;
  display_name: string;
  status: string;
  enabled: boolean;
};

type ProposalBody = {
  title?: unknown;
  hypothesis?: unknown;
  proposedAction?: unknown;
  targetMetricKey?: unknown;
  baselineValue?: unknown;
  targetValue?: unknown;
  unit?: unknown;
  evaluationDays?: unknown;
  relatedInsightId?: unknown;
  expectedOutcome?: unknown;
};

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function cleanNumber(
  value: unknown
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : null;
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value
  );
}

async function loadLola() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key, display_name, status, enabled"
      )
      .eq(
        "agent_key",
        "lola"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Lola is not configured in the AI Team."
    );
  }

  return data as unknown as LolaRow;
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
      "lola",
      "read_ai_team_data"
    );

    const lola =
      await loadLola();

    const [
      experimentsResult,
      approvalsResult,
    ] =
      await Promise.all([
        aiTeamSupabaseAdmin
          .from(
            "ai_experiments"
          )
          .select(
            [
              "id",
              "created_by_agent_id",
              "related_insight_id",
              "related_task_id",
              "title",
              "hypothesis",
              "proposed_action",
              "target_metric_key",
              "baseline_value",
              "target_value",
              "result_value",
              "unit",
              "status",
              "outcome",
              "evidence",
              "started_at",
              "ends_at",
              "completed_at",
              "result_summary",
              "metadata",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq(
            "created_by_agent_id",
            lola.id
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
            "ai_approvals"
          )
          .select(
            [
              "id",
              "requested_by_agent_id",
              "status",
              "execution_status",
              "action_type",
              "action_summary",
              "risk_level",
              "requested_payload",
              "reviewed_at",
              "review_notes",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq(
            "requested_by_agent_id",
            lola.id
          )
          .eq(
            "action_type",
            "growth_experiment"
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

    if (
      experimentsResult.error
    ) {
      throw experimentsResult.error;
    }

    if (
      approvalsResult.error
    ) {
      throw approvalsResult.error;
    }

    return Response.json({
      ok: true,
      lola,
      experiments:
        experimentsResult.data ??
        [],
      approvals:
        approvalsResult.data ??
        [],
    });
  } catch (error) {
    console.error(
      "Lola experiment workspace failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to load Lola experiments.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
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
      "propose_growth_experiment"
    );

    requireAgentPermission(
      "lola",
      "request_approval"
    );

    let body:
      ProposalBody =
      {};

    try {
      body =
        await req.json();
    } catch {
      return Response.json(
        {
          ok: false,
          error:
            "JSON request body is required.",
        },
        {
          status: 400,
        }
      );
    }

    const title =
      cleanString(
        body.title
      );

    const hypothesis =
      cleanString(
        body.hypothesis
      );

    const proposedAction =
      cleanString(
        body.proposedAction
      );

    const targetMetricKey =
      cleanString(
        body.targetMetricKey
      );

    const unit =
      cleanString(
        body.unit
      );

    const expectedOutcome =
      cleanString(
        body.expectedOutcome
      );

    const relatedInsightId =
      cleanString(
        body.relatedInsightId
      );

    const baselineValue =
      cleanNumber(
        body.baselineValue
      );

    const targetValue =
      cleanNumber(
        body.targetValue
      );

    const evaluationDays =
      Number(
        body.evaluationDays
      );

    if (
      !title ||
      !hypothesis ||
      !proposedAction ||
      !targetMetricKey
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Title, hypothesis, proposed action and target metric are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      title.length > 220 ||
      hypothesis.length > 2000 ||
      proposedAction.length > 2000 ||
      expectedOutcome.length >
        1200 ||
      targetMetricKey.length >
        120 ||
      unit.length > 50
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Growth experiment proposal contains a field that is too long.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        7,
        14,
        30,
      ].includes(
        evaluationDays
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Evaluation period must be 7, 14 or 30 days.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      relatedInsightId &&
      !isUuid(
        relatedInsightId
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Related insight ID is invalid.",
        },
        {
          status: 400,
        }
      );
    }

    const lola =
      await loadLola();

    /*
     * Founder-triggered validation is allowed while Lola
     * remains inactive.
     *
     * This route only records a proposed experiment and
     * creates an approval request. It does not execute any
     * growth action.
     */
    const now =
      new Date();

    const endsAt =
      new Date(
        now.getTime() +
          evaluationDays *
            24 *
            60 *
            60 *
            1000
      ).toISOString();

    const {
      data:
        experimentData,
      error:
        experimentError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_experiments"
        )
        .insert({
          created_by_agent_id:
            lola.id,

          related_insight_id:
            relatedInsightId ||
            null,

          title,

          hypothesis,

          proposed_action:
            proposedAction,

          target_metric_key:
            targetMetricKey,

          baseline_value:
            baselineValue,

          target_value:
            targetValue,

          unit:
            unit || null,

          status:
            "proposed",

          ends_at:
            endsAt,

          metadata: {
            source:
              "lola_growth_experiment",

            proposal_mode:
              "founder_manual_validation",

            evaluation_days:
              evaluationDays,

            expected_outcome:
              expectedOutcome ||
              null,

            execution_authorized:
              false,

            external_action_authorized:
              false,
          },
        })
        .select(
          [
            "id",
            "title",
            "hypothesis",
            "proposed_action",
            "target_metric_key",
            "baseline_value",
            "target_value",
            "unit",
            "status",
            "ends_at",
            "metadata",
            "created_at",
          ].join(",")
        )
        .single();

    if (
      experimentError ||
      !experimentData
    ) {
      throw new Error(
        `Unable to create Lola experiment proposal: ${
          experimentError?.message ??
          "unknown database error"
        }`
      );
    }

    const experiment =
      experimentData as unknown as {
        id: string;
        title: string;
        status: string;
      };

    const {
      data:
        approvalData,
      error:
        approvalError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_approvals"
        )
        .insert({
          requested_by_agent_id:
            lola.id,

          task_id:
            null,

          decision_id:
            null,

          action_type:
            "growth_experiment",

          action_summary:
            title,

          risk_level:
            "normal",

          status:
            "pending",

          requested_payload: {
            source:
              "lola_growth_experiment",

            experiment_id:
              experiment.id,

            hypothesis,

            proposed_action:
              proposedAction,

            target_metric_key:
              targetMetricKey,

            baseline_value:
              baselineValue,

            target_value:
              targetValue,

            unit:
              unit || null,

            evaluation_days:
              evaluationDays,

            expected_outcome:
              expectedOutcome ||
              null,

            execution_authorized:
              false,
          },

          execution_status:
            "not_started",
        })
        .select(
          "id, status, action_type, action_summary, requested_payload, created_at"
        )
        .single();

    if (
      approvalError ||
      !approvalData
    ) {
      /*
       * Do not leave an orphan proposal if its required
       * Founder approval could not be created.
       */
      await aiTeamSupabaseAdmin
        .from(
          "ai_experiments"
        )
        .delete()
        .eq(
          "id",
          experiment.id
        )
        .eq(
          "status",
          "proposed"
        );

      throw new Error(
        `Unable to create Founder approval for Lola experiment: ${
          approvalError?.message ??
          "unknown database error"
        }`
      );
    }

    await aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .insert({
        agent_id:
          lola.id,

        actor_user_id:
          auth.admin.userId,

        event_type:
          "growth_experiment",

        action:
          "proposed_growth_experiment",

        entity_type:
          "ai_experiment",

        entity_id:
          experiment.id,

        severity:
          "info",

        details: {
          title,

          target_metric_key:
            targetMetricKey,

          approval_id:
            (
              approvalData as unknown as {
                id: string;
              }
            ).id,

          execution_authorized:
            false,
        },
      });

    return Response.json({
      ok: true,
      experiment:
        experimentData,
      approval:
        approvalData,

      executionStarted:
        false,

      message:
        "Lola experiment proposal recorded and sent for Founder approval. No experiment action has been executed.",
    });
  } catch (error) {
    console.error(
      "Lola experiment proposal failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create Lola growth experiment proposal.",
      },
      {
        status: 500,
      }
    );
  }
}
