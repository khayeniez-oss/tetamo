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

export async function PATCH(
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
    let body: {
      experimentId?: unknown;
      action?: unknown;
      resultValue?: unknown;
      outcome?: unknown;
      resultSummary?: unknown;
    };

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

    const experimentId =
      cleanString(
        body.experimentId
      );

    const action =
      cleanString(
        body.action
      );

    if (
      !experimentId ||
      !isUuid(
        experimentId
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "A valid experiment ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "start",
        "pause",
        "resume",
        "complete",
      ].includes(
        action
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid experiment lifecycle action.",
        },
        {
          status: 400,
        }
      );
    }

    const lola =
      await loadLola();

    const {
      data:
        existingRaw,
      error:
        existingError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_experiments"
        )
        .select(
          [
            "id",
            "created_by_agent_id",
            "title",
            "status",
            "target_metric_key",
            "baseline_value",
            "target_value",
            "result_value",
            "unit",
            "outcome",
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
          "id",
          experimentId
        )
        .eq(
          "created_by_agent_id",
          lola.id
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingRaw) {
      return Response.json(
        {
          ok: false,
          error:
            "Lola growth experiment was not found.",
        },
        {
          status: 404,
        }
      );
    }

    const existing =
      existingRaw as unknown as {
        id: string;
        created_by_agent_id:
          string | null;
        title: string;
        status: string;
        target_metric_key: string;
        baseline_value:
          number | null;
        target_value:
          number | null;
        result_value:
          number | null;
        unit:
          string | null;
        outcome:
          string | null;
        started_at:
          string | null;
        ends_at:
          string | null;
        completed_at:
          string | null;
        result_summary:
          string | null;
        metadata:
          Record<string, unknown> | null;
        created_at: string;
        updated_at: string;
      };

    const {
      data:
        approvalRows,
      error:
        approvalLookupError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_approvals"
        )
        .select(
          [
            "id",
            "status",
            "execution_status",
            "requested_payload",
            "reviewed_at",
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
        .limit(100);

    if (
      approvalLookupError
    ) {
      throw approvalLookupError;
    }

    const approval =
      (
        approvalRows ??
        []
      ).find(
        (row) => {
          const rawPayload =
            (
              row as {
                requested_payload?:
                  unknown;
              }
            ).requested_payload;

          if (
            !rawPayload ||
            typeof rawPayload !==
              "object" ||
            Array.isArray(
              rawPayload
            )
          ) {
            return false;
          }

          return (
            cleanString(
              (
                rawPayload as
                  Record<
                    string,
                    unknown
                  >
              ).experiment_id
            ) ===
            experimentId
          );
        }
      ) as
        | {
            id: string;
            status: string;
            execution_status:
              string;
            requested_payload:
              Record<
                string,
                unknown
              > | null;
            reviewed_at:
              string | null;
          }
        | undefined;

    if (!approval) {
      return Response.json(
        {
          ok: false,
          error:
            "Founder approval record for this experiment was not found.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      approval.status !==
      "approved"
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Founder approval is required before the experiment lifecycle can start.",
        },
        {
          status: 403,
        }
      );
    }

    const allowedFrom:
      Record<
        string,
        string[]
      > = {
        start: [
          "approved",
        ],

        pause: [
          "running",
        ],

        resume: [
          "paused",
        ],

        complete: [
          "running",
          "paused",
        ],
      };

    if (
      !allowedFrom[
        action
      ].includes(
        existing.status
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            `Experiment cannot ${action} from status "${existing.status}".`,
        },
        {
          status: 409,
        }
      );
    }

    const metadata =
      existing.metadata &&
      typeof existing.metadata ===
        "object" &&
      !Array.isArray(
        existing.metadata
      )
        ? {
            ...existing.metadata,
          }
        : {};

    const now =
      new Date();

    const nowIso =
      now.toISOString();

    const updatePayload:
      Record<
        string,
        unknown
      > = {};

    let nextStatus =
      existing.status;

    let activityAction =
      "growth_experiment_status_updated";

    if (
      action ===
      "start"
    ) {
      const evaluationDays =
        Number(
          metadata.evaluation_days
        );

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
              "Experiment is missing a valid evaluation period.",
          },
          {
            status: 409,
          }
        );
      }

      nextStatus =
        "running";

      updatePayload.status =
        nextStatus;

      updatePayload.started_at =
        nowIso;

      updatePayload.ends_at =
        new Date(
          now.getTime() +
            evaluationDays *
              24 *
              60 *
              60 *
              1000
        ).toISOString();

      updatePayload.metadata =
        {
          ...metadata,

          tracking_started_at:
            nowIso,

          tracking_started_by_user_id:
            auth.admin.userId,

          tracking_status:
            "running",

          /*
           * Running means the measurement lifecycle is open.
           * This route does NOT execute an external growth
           * action.
           */
          external_action_authorized:
            false,
        };

      activityAction =
        "growth_experiment_tracking_started";
    }

    if (
      action ===
      "pause"
    ) {
      nextStatus =
        "paused";

      updatePayload.status =
        nextStatus;

      updatePayload.metadata =
        {
          ...metadata,

          tracking_status:
            "paused",

          tracking_paused_at:
            nowIso,

          tracking_paused_by_user_id:
            auth.admin.userId,

          external_action_authorized:
            false,
        };

      activityAction =
        "growth_experiment_tracking_paused";
    }

    if (
      action ===
      "resume"
    ) {
      nextStatus =
        "running";

      let nextEndsAt =
        existing.ends_at;

      const pausedAt =
        cleanString(
          metadata.tracking_paused_at
        );

      if (
        pausedAt &&
        existing.ends_at
      ) {
        const pausedAtMs =
          new Date(
            pausedAt
          ).getTime();

        const previousEndMs =
          new Date(
            existing.ends_at
          ).getTime();

        if (
          Number.isFinite(
            pausedAtMs
          ) &&
          Number.isFinite(
            previousEndMs
          )
        ) {
          const pausedDuration =
            Math.max(
              0,
              now.getTime() -
                pausedAtMs
            );

          nextEndsAt =
            new Date(
              previousEndMs +
                pausedDuration
            ).toISOString();
        }
      }

      updatePayload.status =
        nextStatus;

      updatePayload.ends_at =
        nextEndsAt;

      updatePayload.metadata =
        {
          ...metadata,

          tracking_status:
            "running",

          tracking_paused_at:
            null,

          tracking_resumed_at:
            nowIso,

          tracking_resumed_by_user_id:
            auth.admin.userId,

          external_action_authorized:
            false,
        };

      activityAction =
        "growth_experiment_tracking_resumed";
    }

    if (
      action ===
      "complete"
    ) {
      const resultValue =
        cleanNumber(
          body.resultValue
        );

      const outcome =
        cleanString(
          body.outcome
        );

      const resultSummary =
        cleanString(
          body.resultSummary
        );

      if (
        resultValue ===
        null
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "A numeric result value is required to complete the experiment.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        ![
          "keep",
          "modify",
          "stop",
          "inconclusive",
        ].includes(
          outcome
        )
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "A valid experiment outcome is required.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !resultSummary
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "A result summary is required to complete the experiment.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        resultSummary.length >
        2000
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "Experiment result summary is too long.",
          },
          {
            status: 400,
          }
        );
      }

      nextStatus =
        "completed";

      updatePayload.status =
        nextStatus;

      updatePayload.result_value =
        resultValue;

      updatePayload.outcome =
        outcome;

      updatePayload.result_summary =
        resultSummary;

      updatePayload.completed_at =
        nowIso;

      updatePayload.metadata =
        {
          ...metadata,

          tracking_status:
            "completed",

          tracking_completed_at:
            nowIso,

          tracking_completed_by_user_id:
            auth.admin.userId,

          external_action_authorized:
            false,
        };

      activityAction =
        "growth_experiment_completed";
    }

    const {
      data:
        updatedRaw,
      error:
        updateError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_experiments"
        )
        .update(
          updatePayload
        )
        .eq(
          "id",
          experimentId
        )
        .eq(
          "created_by_agent_id",
          lola.id
        )
        .eq(
          "status",
          existing.status
        )
        .select(
          [
            "id",
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
            "started_at",
            "ends_at",
            "completed_at",
            "result_summary",
            "metadata",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updatedRaw) {
      return Response.json(
        {
          ok: false,
          error:
            "Experiment state changed before the lifecycle update could be saved.",
        },
        {
          status: 409,
        }
      );
    }

    const approvalUpdate:
      Record<
        string,
        unknown
      > = {};

    if (
      action ===
      "start"
    ) {
      approvalUpdate.execution_status =
        "running";
    }

    if (
      action ===
      "complete"
    ) {
      approvalUpdate.execution_status =
        "completed";

      approvalUpdate.executed_at =
        nowIso;

      approvalUpdate.execution_result =
        {
          experiment_id:
            experimentId,

          final_status:
            "completed",

          result_value:
            cleanNumber(
              body.resultValue
            ),

          outcome:
            cleanString(
              body.outcome
            ),

          result_summary:
            cleanString(
              body.resultSummary
            ),

          safety_note:
            "Completion records the experiment measurement result only.",
        };
    }

    if (
      Object.keys(
        approvalUpdate
      ).length >
      0
    ) {
      const {
        error:
          approvalUpdateError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_approvals"
          )
          .update(
            approvalUpdate
          )
          .eq(
            "id",
            approval.id
          )
          .eq(
            "status",
            "approved"
          );

      if (
        approvalUpdateError
      ) {
        throw approvalUpdateError;
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
            lola.id,

          actor_user_id:
            auth.admin.userId,

          event_type:
            "growth_experiment",

          action:
            activityAction,

          entity_type:
            "ai_experiment",

          entity_id:
            experimentId,

          severity:
            "info",

          details: {
            title:
              existing.title,

            previous_status:
              existing.status,

            new_status:
              nextStatus,

            target_metric_key:
              existing.target_metric_key,

            approval_id:
              approval.id,

            founder_controlled:
              true,

            external_action_authorized:
              false,

            safety_note:
              "Lifecycle controls manage experiment tracking only and do not send messages, spend money, publish content, change pricing or execute external growth actions.",
          },
        });

    if (
      activityError
    ) {
      console.error(
        "Lola experiment lifecycle audit failed:",
        activityError
      );
    }

    return Response.json({
      ok: true,

      experiment:
        updatedRaw,

      action,

      externalActionExecuted:
        false,

      message:
        action ===
        "complete"
          ? "Experiment measurement completed. No external action was executed by this lifecycle control."
          : "Experiment tracking lifecycle updated. No external action was executed by this lifecycle control.",
    });
  } catch (error) {
    console.error(
      "Lola experiment lifecycle update failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to update Lola growth experiment lifecycle.",
      },
      {
        status: 500,
      }
    );
  }
}
