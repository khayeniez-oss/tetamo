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
        "id, agent_key, display_name, role_title"
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

  let task:
    | {
        id: string;
        title: string;
        status: string;
        assigned_to_agent_id:
          | string
          | null;
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
          "id, title, status, assigned_to_agent_id"
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

    task = taskRow;

    /*
     * Research is only one part of
     * Rupert's work, so do NOT mark
     * the task completed here.
     */
    if (
      taskRow.status ===
      "pending"
    ) {
      const {
        error:
          startTaskError,
      } =
        await aiTeamSupabaseAdmin
          .from("ai_tasks")
          .update({
            status:
              "in_progress",
            started_at:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            taskRow.id
          );

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
    }
  }

  try {
    const result =
      await researchWithRupert({
        topic,
        context:
          context || null,
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
              context || null,

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
              error instanceof
              Error
                ? error.message
                : "Unknown research error",
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
          error instanceof Error
            ? error.message
            : "Rupert's web research failed.",
      },
      { status: 500 }
    );
  }
}
