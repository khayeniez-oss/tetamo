import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  executeFounderReviewRevision,
} from "@/lib/ai-team/core/founder-review-revision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FounderReviewDecision =
  | "approved"
  | "request_change"
  | "rejected";

type FounderReviewTaskRow = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  source_type: string | null;
  source_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  expected_outcome: string | null;
  result_summary: string | null;
  requires_approval: boolean;
  assigned_to_agent_id: string | null;
  requested_by_agent_id: string | null;
  requested_by_user_id: string | null;
  metadata: Record<string, unknown> | null;
};

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

export async function POST(
  req: Request,
  context: {
    params: Promise<{
      taskId: string;
    }>;
  }
) {
  const auth =
    await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const { taskId } =
    await context.params;

  const body =
    await req.json().catch(
      () => null
    ) as {
      decision?: unknown;
      feedback?: unknown;
    } | null;

  const decision =
    cleanText(body?.decision) as
      FounderReviewDecision;

  const feedback =
    cleanText(body?.feedback);

  if (
    ![
      "approved",
      "request_change",
      "rejected",
    ].includes(decision)
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid Founder review decision.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    decision === "request_change" &&
    !feedback
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Founder feedback is required when requesting a change.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: taskData,
    error: taskError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_tasks")
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
          "assigned_to_agent_id",
          "requested_by_agent_id",
          "requested_by_user_id",
          "metadata",
        ].join(",")
      )
      .eq("id", taskId)
      .maybeSingle();

  if (taskError) {
    throw taskError;
  }

  const task =
    taskData as unknown as
      FounderReviewTaskRow | null;

  if (!task) {
    return Response.json(
      {
        ok: false,
        error:
          "AI task was not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    task.status !== "completed" ||
    !cleanText(
      task.result_summary
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Only a completed task with a result can receive Founder review.",
      },
      {
        status: 409,
      }
    );
  }

  const currentMetadata =
    task.metadata &&
    typeof task.metadata ===
      "object" &&
    !Array.isArray(
      task.metadata
    )
      ? task.metadata as
          Record<string, unknown>
      : {};

  const now =
    new Date().toISOString();

  const reviewStatus =
    decision === "request_change"
      ? "changes_requested"
      : decision;

  const founderReview = {
    status: reviewStatus,
    decision,
    feedback:
      feedback || null,
    reviewed_at: now,
    reviewed_by_user_id:
      auth.admin.userId,
  };

  const {
    error: updateError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_tasks")
      .update({
        metadata: {
          ...currentMetadata,
          founder_review:
            founderReview,
        },
      })
      .eq("id", task.id)
      .eq("status", "completed");

  if (updateError) {
    throw updateError;
  }

  let revisionTaskId:
    string | null = null;

  if (
    decision === "request_change"
  ) {
    const {
      data: revisionTask,
      error: revisionError,
    } =
      await aiTeamSupabaseAdmin
        .from("ai_tasks")
        .insert({
          title:
            `Revision: ${task.title}`,

          description:
            [
              "Founder requested changes to a completed AI Team deliverable.",
              "",
              `Founder feedback: ${feedback}`,
              "",
              "Revise the original deliverable while preserving useful parts unless the Founder specifically asked to replace them.",
            ].join("\n"),

          requested_by_agent_id:
            null,

          requested_by_user_id:
            auth.admin.userId,

          assigned_to_agent_id:
            task.assigned_to_agent_id,

          priority:
            task.priority,

          status:
            "pending",

          source_type:
            "founder_review",

          source_id:
            task.id,

          related_entity_type:
            task.related_entity_type,

          related_entity_id:
            task.related_entity_id,

          expected_outcome:
            `Revised deliverable addressing Founder feedback: ${feedback}`,

          requires_approval:
            false,

          metadata: {
            revision_of_task_id:
              task.id,

            founder_review_feedback:
              feedback,

            original_result_summary:
              task.result_summary,

            created_from:
              "founder_review",
          },
        })
        .select("id")
        .single();

    if (revisionError) {
      throw revisionError;
    }

    revisionTaskId =
      String(
        revisionTask.id
      );

    try {
      await executeFounderReviewRevision({
        taskId:
          revisionTaskId,
      });
    } catch (executionError) {
      console.error(
        "Automatic Founder Review revision execution failed:",
        executionError
      );

      /*
       * Keep the Founder review and revision task.
       * A failed execution must never erase the
       * Founder feedback or create another revision.
       *
       * If execution failed after the lifecycle
       * transition, the task remains in_progress
       * for diagnosis/retry.
       *
       * If it failed before transition, it remains
       * pending.
       */
    }
  }

  const {
    error: activityError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_activity")
      .insert({
        agent_id: null,

        actor_user_id:
          auth.admin.userId,

        event_type:
          "founder_review",

        action:
          decision ===
          "request_change"
            ? "requested_task_change"
            : decision ===
                "approved"
              ? "approved_task_result"
              : "rejected_task_result",

        entity_type:
          "ai_task",

        entity_id:
          task.id,

        task_id:
          task.id,

        severity:
          "info",

        details: {
          decision,
          review_status:
            reviewStatus,
          feedback:
            feedback || null,
          revision_task_id:
            revisionTaskId,
        },
      });

  if (activityError) {
    console.error(
      "Founder review activity log failed:",
      activityError
    );
  }

  return Response.json({
    ok: true,
    taskId:
      task.id,
    review:
      founderReview,
    revisionTaskId,
  });
}
