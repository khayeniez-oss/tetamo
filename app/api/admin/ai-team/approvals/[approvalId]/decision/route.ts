import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    approvalId: string;
  }>;
};

type DecisionRequest = {
  decision?: unknown;
  reviewNotes?: unknown;
};

type AiApprovalRow = {
  id: string;
  requested_by_agent_id:
    string | null;
  task_id:
    string | null;
  status: string;
  execution_status: string;
  action_type: string;
  action_summary: string;
  requested_payload:
    Record<string, unknown> | null;
  reviewed_by_user_id:
    string | null;
  reviewed_at:
    string | null;
  review_notes:
    string | null;
  updated_at?:
    string | null;
};

type AiTaskRow = {
  id: string;
  status: string;
  assigned_to_agent_id:
    string | null;
  metadata:
    Record<string, unknown> | null;
};

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function reopenRejectedRupertBlogTask(
  approval: AiApprovalRow,
  reviewNotes: string
) {
  if (
    approval.action_type !==
      "publish_content" ||
    !approval.task_id ||
    !approval.requested_by_agent_id
  ) {
    return {
      applicable: false,
      reopened: false,
    };
  }

  const payload =
    approval.requested_payload &&
    typeof approval.requested_payload ===
      "object" &&
    !Array.isArray(
      approval.requested_payload
    )
      ? approval.requested_payload
      : {};

  const contentType =
    cleanString(
      payload.content_type
    );

  const publishAction =
    cleanString(
      payload.publish_action
    );

  const blogId =
    cleanString(
      payload.blog_id
    );

  const researchReportId =
    cleanString(
      payload.research_report_id
    );

  if (
    contentType !== "blog" ||
    publishAction !==
      "publish_blog" ||
    !blogId ||
    !researchReportId
  ) {
    return {
      applicable: false,
      reopened: false,
    };
  }

  /*
   * This lifecycle rule is intentionally Rupert-only.
   */
  const {
    data: agentData,
    error: agentError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, agent_key"
      )
      .eq(
        "id",
        approval.requested_by_agent_id
      )
      .maybeSingle();

  if (agentError) {
    throw agentError;
  }

  const agent =
    agentData as unknown as {
      id: string;
      agent_key: string;
    } | null;

  if (
    !agent ||
    cleanString(
      agent.agent_key
    ).toLowerCase() !==
      "rupert"
  ) {
    return {
      applicable: false,
      reopened: false,
    };
  }

  const {
    data: taskData,
    error: taskError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id, status, assigned_to_agent_id, metadata"
      )
      .eq(
        "id",
        approval.task_id
      )
      .maybeSingle();

  if (taskError) {
    throw taskError;
  }

  const task =
    taskData as unknown as
      AiTaskRow | null;

  if (!task) {
    throw new Error(
      "Linked Rupert task was not found."
    );
  }

  if (
    task.assigned_to_agent_id !==
    approval.requested_by_agent_id
  ) {
    throw new Error(
      "Linked task is no longer assigned to Rupert."
    );
  }

  const metadata =
    task.metadata &&
    typeof task.metadata ===
      "object" &&
    !Array.isArray(
      task.metadata
    )
      ? task.metadata
      : {};

  const currentReportId =
    cleanString(
      metadata.current_research_report_id
    );

  const qualityReviewState =
    cleanString(
      metadata.quality_review_state
    );

  const disposition =
    cleanString(
      metadata.post_research_disposition
    );

  /*
   * Reopen only when the SAME verified research package
   * is still current and draft-eligible.
   */
  if (
    currentReportId !==
      researchReportId ||
    metadata.content_eligible !==
      true ||
    qualityReviewState !==
      "passed" ||
    disposition !==
      "content_may_proceed"
  ) {
    throw new Error(
      "Rejected Rupert draft is no longer backed by the task's current verified draft-eligible research report."
    );
  }

  /*
   * Idempotent reconciliation.
   */
  if (
    task.status ===
      "in_progress"
  ) {
    return {
      applicable: true,
      reopened: false,
      alreadyReady: true,
      taskId:
        task.id,
    };
  }

  if (
    task.status !==
      "awaiting_approval"
  ) {
    throw new Error(
      `Rejected Rupert blog task cannot be reopened from ${task.status}.`
    );
  }

  const reopenedAt =
    new Date()
      .toISOString();

  const nextMetadata = {
    ...metadata,

    last_content_rejection_at:
      reopenedAt,

    last_rejected_approval_id:
      approval.id,

    last_rejected_blog_id:
      blogId,

    last_content_rejection_reason:
      reviewNotes ||
      "Founder/admin rejected the draft for revision.",
  };

  const {
    data: reopenedTaskData,
    error: reopenError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .update({
        status:
          "in_progress",

        result_summary:
          `Founder rejected Rupert blog draft ${blogId}; task reopened for corrected redraft from the current verified research report.`,

        metadata:
          nextMetadata,
      })
      .eq(
        "id",
        task.id
      )
      .eq(
        "status",
        "awaiting_approval"
      )
      .eq(
        "assigned_to_agent_id",
        approval.requested_by_agent_id
      )
      .select(
        "id, status"
      )
      .maybeSingle();

  if (reopenError) {
    throw reopenError;
  }

  if (!reopenedTaskData) {
    throw new Error(
      "Rupert task changed before redraft reopening could be saved."
    );
  }

  return {
    applicable: true,
    reopened: true,
    alreadyReady: false,
    taskId:
      task.id,
  };
}

export async function POST(
  req: Request,
  context: RouteContext
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  const {
    approvalId,
  } = await context.params;

  if (
    !approvalId ||
    !isUuid(approvalId)
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Approval ID is invalid.",
      },
      {
        status: 400,
      }
    );
  }

  let body: DecisionRequest;

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
      {
        status: 400,
      }
    );
  }

  const decision =
    cleanString(
      body.decision
    ).toLowerCase();

  const reviewNotes =
    cleanString(
      body.reviewNotes
    );

  if (
    decision !== "approved" &&
    decision !== "rejected"
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Decision must be approved or rejected.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: existingApproval,
    error: existingError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_approvals"
      )
      .select(
        [
          "id",
          "requested_by_agent_id",
          "task_id",
          "status",
          "execution_status",
          "action_type",
          "action_summary",
          "requested_payload",
          "reviewed_by_user_id",
          "reviewed_at",
          "review_notes",
        ].join(",")
      )
      .eq(
        "id",
        approvalId
      )
      .maybeSingle();

  if (existingError) {
    console.error(
      "AI approval lookup failed:",
      existingError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI approval.",
      },
      {
        status: 500,
      }
    );
  }

  const currentApproval =
    existingApproval as unknown as
      AiApprovalRow | null;

  if (!currentApproval) {
    return Response.json(
      {
        ok: false,
        error:
          "AI approval was not found.",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * Idempotent retry:
   * if the same human decision was already stored,
   * report success without changing anything.
   */
  if (
    currentApproval.status ===
      decision
  ) {
    let redraft = null;

    if (
      decision ===
        "rejected"
    ) {
      try {
        redraft =
          await reopenRejectedRupertBlogTask(
            currentApproval,
            currentApproval.review_notes ||
              reviewNotes
          );
      } catch (error) {
        console.error(
          "Rejected Rupert task reconciliation failed:",
          error
        );

        return Response.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to reopen rejected Rupert task.",
          },
          {
            status: 500,
          }
        );
      }
    }

    return Response.json({
      ok: true,
      approval:
        currentApproval,
      alreadyReviewed:
        true,
      redraft,
    });
  }

  /*
   * Only pending approvals may receive a new
   * Founder/admin decision.
   *
   * Approved, rejected, cancelled and expired approvals
   * are historical records and must not be rewritten.
   */
  if (
    currentApproval.status !==
      "pending"
  ) {
    return Response.json(
      {
        ok: false,
        error:
          `AI approval is already ${currentApproval.status}.`,
      },
      {
        status: 409,
      }
    );
  }

  const reviewedAt =
    new Date()
      .toISOString();

  const update: {
    status:
      "approved" |
      "rejected";
    reviewed_by_user_id:
      string;
    reviewed_at:
      string;
    review_notes:
      string | null;
    execution_status?:
      "cancelled";
  } = {
    status:
      decision,

    reviewed_by_user_id:
      auth.admin.userId,

    reviewed_at:
      reviewedAt,

    review_notes:
      reviewNotes ||
      null,
  };

  /*
   * Rejection explicitly cancels execution.
   *
   * Approval deliberately DOES NOT queue or execute
   * anything. The schema's contract is that approval
   * alone does not grant technical authority.
   */
  if (
    decision === "rejected"
  ) {
    update.execution_status =
      "cancelled";
  }

  const {
    data: updatedApproval,
    error: updateError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_approvals"
      )
      .update(
        update
      )
      .eq(
        "id",
        approvalId
      )
      .eq(
        "status",
        "pending"
      )
      .select(
        [
          "id",
          "requested_by_agent_id",
          "task_id",
          "status",
          "execution_status",
          "action_type",
          "action_summary",
          "requested_payload",
          "reviewed_by_user_id",
          "reviewed_at",
          "review_notes",
          "updated_at",
        ].join(",")
      )
      .maybeSingle();

  if (updateError) {
    console.error(
      "AI approval decision failed:",
      updateError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to save AI approval decision.",
      },
      {
        status: 500,
      }
    );
  }

  const savedApproval =
    updatedApproval as unknown as
      AiApprovalRow | null;

  /*
   * Protect against a concurrent review winning
   * between our initial read and update.
   */
  if (!savedApproval) {
    return Response.json(
      {
        ok: false,
        error:
          "AI approval changed before this decision could be saved.",
      },
      {
        status: 409,
      }
    );
  }

  let redraft = null;

  if (
    decision ===
      "rejected"
  ) {
    try {
      redraft =
        await reopenRejectedRupertBlogTask(
          savedApproval,
          reviewNotes
        );
    } catch (error) {
      console.error(
        "Rejected Rupert task reopening failed:",
        error
      );

      /*
       * The rejection itself is already safely persisted.
       * A repeated rejection can run the idempotent
       * reconciliation branch above.
       */
      return Response.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "AI approval was rejected, but its Rupert task could not be reopened.",
          approval:
            savedApproval,
          decisionSaved:
            true,
        },
        {
          status: 500,
        }
      );
    }
  }

  return Response.json({
    ok: true,
    approval:
      savedApproval,
    alreadyReviewed:
      false,
    redraft,
  });
}
