import {
  aiTeamSupabaseAdmin,
  requireTetamoAdminOrCron,
} from "@/lib/ai-team/core/admin-auth";

import {
  researchWithRupert,
} from "@/lib/ai-team/agents/rupert-research";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResearchRequest = {
  topic?: unknown;
  context?: unknown;
  taskId?: unknown;
};

function cleanOptionalString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function POST(
  req: Request
) {
  const auth =
    await requireTetamoAdminOrCron(req);

  if (!auth.authorized) {
    return auth.response;
  }

  let body: ResearchRequest;

  try {
    body =
      await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const topic =
    cleanOptionalString(
      body.topic
    );

  const context =
    cleanOptionalString(
      body.context
    );

  const taskId =
    cleanOptionalString(
      body.taskId
    );

  if (!topic) {
    return Response.json(
      {
        ok: false,
        error:
          "Research topic is required.",
      },
      { status: 400 }
    );
  }

  /*
   * Rupert must explicitly have
   * authority both to research the
   * public web and to create an
   * internal report.
   */
  try {
    requireAgentPermission(
      "rupert",
      "research_public_web"
    );

    requireAgentPermission(
      "rupert",
      "create_report"
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Rupert permission denied.",
      },
      { status: 403 }
    );
  }

  const {
    data: rupert,
    error: rupertError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        "id, agent_key, display_name, role_title, status, enabled"
      )
      .eq(
        "agent_key",
        "rupert"
      )
      .maybeSingle();

  if (rupertError) {
    console.error(
      "Rupert research agent lookup failed:",
      rupertError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load Rupert's AI Team profile.",
      },
      { status: 500 }
    );
  }

  if (!rupert) {
    return Response.json(
      {
        ok: false,
        error:
          "Rupert is not configured in the AI Team.",
      },
      { status: 500 }
    );
  }

  /*
   * Operational off-switch.
   *
   * Autonomous research must not run when Rupert has
   * been disabled or made inactive.
   */
  if (
    rupert.status !== "active" ||
    rupert.enabled !== true
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Rupert is inactive or disabled.",
      },
      { status: 409 }
    );
  }

  let task:
    | {
        id: string;
        title: string;
        status: string;
        assigned_to_agent_id:
          | string
          | null;

        source_type:
          string | null;

        source_id:
          string | null;

        metadata:
          Record<string, unknown> | null;
      }
    | null = null;

  /*
   * A task is optional.
   *
   * If supplied, verify that the
   * task exists and belongs to
   * Rupert before attaching the
   * research to it.
   */
  if (taskId) {
    const {
      data: taskRow,
      error: taskError,
    } =
      await aiTeamSupabaseAdmin
        .from("ai_tasks")
        .select(
          "id, title, status, assigned_to_agent_id, source_type, source_id, metadata"
        )
        .eq(
          "id",
          taskId
        )
        .maybeSingle();

    if (taskError) {
      console.error(
        "Rupert research task lookup failed:",
        taskError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to load the research task.",
        },
        { status: 500 }
      );
    }

    if (!taskRow) {
      return Response.json(
        {
          ok: false,
          error:
            "Research task was not found.",
        },
        { status: 404 }
      );
    }

    if (
      taskRow
        .assigned_to_agent_id !==
      rupert.id
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "This task is not assigned to Rupert.",
        },
        { status: 409 }
      );
    }

    if (
      taskRow.status ===
        "cancelled" ||
      taskRow.status ===
        "completed"
    ) {
      return Response.json(
        {
          ok: false,
          error:
            `Research cannot run for a ${taskRow.status} task.`,
        },
        { status: 409 }
      );
    }

    /*
     * Lola -> Rupert research tasks use a stricter execution
     * state than Rupert's existing general research workflow.
     *
     * pending     -> first research attempt
     * blocked     -> explicit retry after failed research
     * in_progress -> do not run the same research again
     *
     * Other Rupert research task types keep their existing
     * behaviour.
     */
    const isLolaHandoffResearchTask =
      taskRow.source_type ===
        "rupert_lola_handoff";

    if (
      isLolaHandoffResearchTask &&
      taskRow.status !==
        "pending" &&
      taskRow.status !==
        "blocked"
    ) {
      return Response.json(
        {
          ok: false,
          error:
            `Rupert Lola-handoff research cannot run for a ${taskRow.status} task.`,
        },
        { status: 409 }
      );
    }

    task = taskRow;

    /*
     * Research is only one part of
     * Rupert's work, so do NOT mark
     * the task completed here.
     */
    const shouldStartTask =
      taskRow.status ===
        "pending" ||
      (
        isLolaHandoffResearchTask &&
        taskRow.status ===
          "blocked"
      );

    if (shouldStartTask) {
      const startedAt =
        new Date()
          .toISOString();

      const currentMetadata =
        taskRow.metadata &&
        typeof taskRow.metadata ===
          "object" &&
        !Array.isArray(
          taskRow.metadata
        )
          ? taskRow.metadata
          : {};

      let nextMetadata =
        taskRow.metadata;

      if (
        isLolaHandoffResearchTask
      ) {
        const rawAttemptCount =
          currentMetadata
            .attempt_count;

        const attemptCount =
          typeof rawAttemptCount ===
            "number" &&
          Number.isFinite(
            rawAttemptCount
          )
            ? Math.max(
                0,
                Math.floor(
                  rawAttemptCount
                )
              )
            : 0;

        nextMetadata = {
          ...currentMetadata,

          attempt_count:
            attemptCount + 1,

          last_research_attempt_at:
            startedAt,

          last_research_error:
            null,

          last_research_failed_at:
            null,
        };
      }

      const taskUpdate: {
        status: string;
        started_at: string;
        metadata?:
          Record<string, unknown> |
          null;
      } = {
        status:
          "in_progress",

        started_at:
          startedAt,
      };

      if (
        isLolaHandoffResearchTask
      ) {
        taskUpdate.metadata =
          nextMetadata;
      }

      const {
        data:
          startedTask,
        error:
          startTaskError,
      } =
        await aiTeamSupabaseAdmin
          .from("ai_tasks")
          .update(
            taskUpdate
          )
          .eq(
            "id",
            taskRow.id
          )
          .eq(
            "status",
            taskRow.status
          )
          .select(
            "id"
          )
          .maybeSingle();

      if (
        startTaskError
      ) {
        console.error(
          "Rupert research task start update failed:",
          startTaskError
        );

        return Response.json(
          {
            ok: false,
            error:
              "Unable to start Rupert's task.",
          },
          { status: 500 }
        );
      }

      /*
       * Another worker changed the task between the initial
       * read and our conditional update.
       */
      if (!startedTask) {
        return Response.json(
          {
            ok: false,
            error:
              "Rupert research task state changed before research could start.",
          },
          { status: 409 }
        );
      }

      task = {
        ...taskRow,

        status:
          "in_progress",

        metadata:
          nextMetadata,
      };
    }

  }

  let researchContext =
    context;

  if (
    task?.source_type ===
      "rupert_lola_handoff"
  ) {
    const metadata =
      task.metadata &&
      typeof task.metadata ===
        "object" &&
      !Array.isArray(
        task.metadata
      )
        ? task.metadata
        : {};

    const intakeOutcome =
      cleanOptionalString(
        metadata
          .intake_outcome
      );

    const sourceThemeKey =
      cleanOptionalString(
        metadata
          .source_theme_key
      );

    if (
      intakeOutcome ===
        "needs_research" &&
      sourceThemeKey ===
        "payment_timing_after_sale"
    ) {
      const protectedScope =
        [
          "CUSTOMER_INTENT_SCOPE=UNRESOLVED",
          "",
          "Internal evidence confirms recurrence only.",
          "It does not identify the payment event, payer, recipient, Tetamo's role, settlement direction, fee type or other payment direction.",
          "Public-web research may verify external facts but cannot determine which payment event these customers meant.",
          "Preserve that distinction explicitly.",
        ]
          .join("\n");

      researchContext =
        [
          context,
          protectedScope,
        ]
          .filter(
            Boolean
          )
          .join("\n\n");
    }
  }

  try {
    const result =
      await researchWithRupert({
        topic,
        context:
          researchContext ||
          null,
      });

    /*
     * report_type MUST be "content"
     * because ai_reports has a
     * constrained report_type enum.
     */
    const {
      data: report,
      error:
        reportError,
    } =
      await aiTeamSupabaseAdmin
        .from("ai_reports")
        .insert({
          agent_id:
            rupert.id,

          report_type:
            "content",

          title:
            `Web Research: ${topic}`,

          summary:
            result.summary,

          metrics: {
            source_count:
              result.sources
                .length,

            finding_count:
              result.findings
                .length,

            recommendation_count:
              result
                .recommendations
                .length,
          },

          findings:
            result.findings,

          recommendations:
            result.recommendations,

          recipient_user_id:
            auth.admin.userId,

          source_data: {
            research_kind:
              "public_web",

            task_id:
              task?.id ??
              null,

            task_title:
              task?.title ??
              null,

            topic:
              result.topic,

            context:
              researchContext ||
              null,

            researched_at:
              result.researchedAt,

            openai_response_id:
              result.responseId,

            sources:
              result.sources,

            research_memo:
              result.researchText,

            warnings:
              result.warnings,

            /*
             * Explicit downstream eligibility.
             *
             * Research success and content readiness are separate.
             *
             * A Lola -> Rupert inquiry task must not become
             * draft-eligible while the customer-intended subject
             * is still unresolved, even when valid external
             * findings were discovered.
             */
            content_eligible:
              result.findings.length >
                0 &&
              !(
                task?.source_type ===
                  "rupert_lola_handoff" &&
                String(
                  task?.metadata &&
                    typeof task.metadata ===
                      "object" &&
                    !Array.isArray(
                      task.metadata
                    )
                    ? (
                        task.metadata as Record<
                          string,
                          unknown
                        >
                      )
                        .customer_intent_scope
                    : null
                ).toLowerCase() ===
                  "unresolved"
              ),

            quality_review_state:
              task?.source_type ===
                "rupert_lola_handoff" &&
              String(
                task?.metadata &&
                  typeof task.metadata ===
                    "object" &&
                  !Array.isArray(
                    task.metadata
                  )
                  ? (
                      task.metadata as Record<
                        string,
                        unknown
                      >
                    )
                      .customer_intent_scope
                  : null
              ).toLowerCase() ===
                "unresolved"
                ? "needs_internal_clarification"
                : result.findings.length >
                    0
                  ? "passed"
                  : "insufficient_verified_findings",

            content_block_reason:
              task?.source_type ===
                "rupert_lola_handoff" &&
              String(
                task?.metadata &&
                  typeof task.metadata ===
                    "object" &&
                  !Array.isArray(
                    task.metadata
                  )
                  ? (
                      task.metadata as Record<
                        string,
                        unknown
                      >
                    )
                      .customer_intent_scope
                  : null
              ).toLowerCase() ===
                "unresolved"
                ? "customer_intent_unresolved"
                : null,

            post_research_disposition:
              task?.source_type ===
                "rupert_lola_handoff" &&
              String(
                task?.metadata &&
                  typeof task.metadata ===
                    "object" &&
                  !Array.isArray(
                    task.metadata
                  )
                  ? (
                      task.metadata as Record<
                        string,
                        unknown
                      >
                    )
                      .customer_intent_scope
                  : null
              ).toLowerCase() ===
                "unresolved"
                ? "needs_internal_clarification"
                : "content_may_proceed",

            evidence_standard_version:
              "rupert_research_v5",

            quality_reviewed_at:
              result.researchedAt,
          },
        })
        .select(
          "id, title, report_type, summary, findings, recommendations, source_data, created_at"
        )
        .single();

    if (
      reportError ||
      !report
    ) {
      throw (
        reportError ??
        new Error(
          "Research report was not saved."
        )
      );
    }

    const {
      error:
        activityError,
    } =
      await aiTeamSupabaseAdmin
        .from("ai_activity")
        .insert({
          agent_id:
            rupert.id,

          actor_user_id:
            auth.admin.userId,

          event_type:
            "research",

          action:
            "completed_public_web_research",

          entity_type:
            "ai_report",

          entity_id:
            report.id,

          task_id:
            task?.id ??
            null,

          severity:
            "info",

          details: {
            topic:
              result.topic,

            report_id:
              report.id,

            source_count:
              result.sources
                .length,

            finding_count:
              result.findings
                .length,

            researched_at:
              result.researchedAt,
          },
        });

    if (activityError) {
      /*
       * Audit failure should be
       * visible in logs, but should
       * not destroy a valid saved
       * research report.
       */
      console.error(
        "Rupert research activity log failed:",
        activityError
      );
    }

    return Response.json({
      ok: true,

      report: {
        id:
          report.id,

        title:
          report.title,

        summary:
          report.summary,

        findings:
          report.findings,

        recommendations:
          report.recommendations,

        warnings:
          result.warnings,

        sources:
          result.sources,

        researchedAt:
          result.researchedAt,
      },

      task: task
        ? {
            id:
              task.id,
            title:
              task.title,
            status:
              task.status ===
              "pending"
                ? "in_progress"
                : task.status,
          }
        : null,
    });
  } catch (error) {
    console.error(
      "Rupert public web research failed:",
      error
    );

    const researchError =
      error instanceof Error
        ? error.message
        : "Unknown research error";

    /*
     * Protected Lola -> Rupert research must fail closed.
     *
     * If research fails, cannot source the claim, or violates
     * the customer-intent evidence boundary, return the task
     * to a visible retryable BLOCKED state rather than leaving
     * it stuck in_progress.
     */
    if (
      task?.source_type ===
        "rupert_lola_handoff"
    ) {
      const currentMetadata =
        task.metadata &&
        typeof task.metadata ===
          "object" &&
        !Array.isArray(
          task.metadata
        )
          ? task.metadata
          : {};

      const failedAt =
        new Date()
          .toISOString();

      const {
        error:
          blockTaskError,
      } =
        await aiTeamSupabaseAdmin
          .from("ai_tasks")
          .update({
            status:
              "blocked",

            metadata: {
              ...currentMetadata,

              last_research_error:
                researchError,

              last_research_failed_at:
                failedAt,
            },
          })
          .eq(
            "id",
            task.id
          )
          .eq(
            "status",
            "in_progress"
          );

      if (
        blockTaskError
      ) {
        console.error(
          "Rupert failed research task recovery failed:",
          blockTaskError
        );
      }
    }

    /*
     * Record the failure when
     * possible. No research report
     * is created for failed or
     * unsourced research.
     */
    const {
      error:
        failureLogError,
    } =
      await aiTeamSupabaseAdmin
        .from("ai_activity")
        .insert({
          agent_id:
            rupert.id,

          actor_user_id:
            auth.admin.userId,

          event_type:
            "research",

          action:
            "public_web_research_failed",

          entity_type:
            task
              ? "ai_task"
              : "ai_agent",

          entity_id:
            task?.id ??
            rupert.id,

          task_id:
            task?.id ??
            null,

          severity:
            "warning",

          details: {
            topic,

            error:
              researchError,
          },
        });

    if (
      failureLogError
    ) {
      console.error(
        "Rupert research failure audit log failed:",
        failureLogError
      );
    }

    return Response.json(
      {
        ok: false,

        error:
          researchError,
      },
      { status: 500 }
    );
  }
}
