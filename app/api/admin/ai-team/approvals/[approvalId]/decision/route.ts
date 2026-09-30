import {
  aiTeamSupabaseAdmin,
  requireTetamoAdminOrCron,
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
  source_type:
    string | null;
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

async function reconcileLolaGrowthExperiment(
  approval: AiApprovalRow,
  decision:
    | "approved"
    | "rejected",
  reviewNotes: string
) {
  if (
    approval.action_type !==
      "growth_experiment"
  ) {
    return {
      applicable: false,
      updated: false,
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

  const experimentId =
    cleanString(
      payload.experiment_id
    );

  if (
    !experimentId ||
    !isUuid(
      experimentId
    )
  ) {
    throw new Error(
      "Lola growth approval is missing a valid experiment ID."
    );
  }

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
      .select(
        "id, created_by_agent_id, status, metadata"
      )
      .eq(
        "id",
        experimentId
      )
      .maybeSingle();

  if (experimentError) {
    throw experimentError;
  }

  const experiment =
    experimentData as unknown as {
      id: string;
      created_by_agent_id:
        string | null;
      status: string;
      metadata:
        Record<string, unknown> | null;
    } | null;

  if (!experiment) {
    throw new Error(
      "Linked Lola growth experiment was not found."
    );
  }

  if (
    approval.requested_by_agent_id &&
    experiment.created_by_agent_id !==
      approval.requested_by_agent_id
  ) {
    throw new Error(
      "Growth experiment no longer belongs to the requesting AI agent."
    );
  }

  const nextStatus =
    decision ===
      "approved"
      ? "approved"
      : "cancelled";

  if (
    experiment.status ===
      nextStatus
  ) {
    return {
      applicable: true,
      updated: false,
      experimentId,
      status:
        nextStatus,
    };
  }

  if (
    experiment.status !==
      "proposed"
  ) {
    throw new Error(
      `Lola growth experiment cannot move from ${experiment.status} to ${nextStatus}.`
    );
  }

  const metadata =
    experiment.metadata &&
    typeof experiment.metadata ===
      "object" &&
    !Array.isArray(
      experiment.metadata
    )
      ? experiment.metadata
      : {};

  const reviewedAt =
    new Date()
      .toISOString();

  const {
    data:
      updatedExperiment,
    error:
      updateError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_experiments"
      )
      .update({
        status:
          nextStatus,

        metadata: {
          ...metadata,

          founder_approval_id:
            approval.id,

          founder_decision:
            decision,

          founder_reviewed_at:
            reviewedAt,

          founder_review_notes:
            reviewNotes ||
            null,

          /*
           * Approval records permission to proceed to a
           * later controlled execution step only.
           * It never starts the experiment itself.
           */
          execution_authorized:
            false,
        },
      })
      .eq(
        "id",
        experimentId
      )
      .eq(
        "status",
        "proposed"
      )
      .select(
        "id, status"
      )
      .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!updatedExperiment) {
    throw new Error(
      "Lola growth experiment changed before approval reconciliation could be saved."
    );
  }

  return {
    applicable: true,
    updated: true,
    experimentId,
    status:
      nextStatus,
  };
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
        "id, status, source_type, assigned_to_agent_id, metadata"
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

  const originalReportId =
    cleanString(
      metadata.research_report_id
    );

  const qualityReviewState =
    cleanString(
      metadata.quality_review_state
    );

  const disposition =
    cleanString(
      metadata.post_research_disposition
    );

  const taskSourceType =
    cleanString(
      task.source_type
    );

  /*
   * Protected Lola -> Rupert inquiry tasks use the newer,
   * stricter research-safety contract.
   *
   * Do not weaken this gate: the exact current verified
   * report must still be draft-eligible.
   */
  if (
    taskSourceType ===
      "rupert_lola_handoff"
  ) {
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
  } else {
    /*
     * Standard Rupert content tasks predate the protected
     * inquiry metadata contract.
     *
     * They may be reopened only when the rejected approval
     * points to the exact research report linked to that task.
     */
    const linkedReportId =
      currentReportId ||
      originalReportId;

    if (
      !linkedReportId ||
      linkedReportId !==
        researchReportId
    ) {
      throw new Error(
        "Rejected Rupert draft does not match the research report linked to its task."
      );
    }
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

async function completeApprovedRupertBlogTask(
  approval: AiApprovalRow
) {
  if (
    approval.action_type !==
      "publish_content" ||
    !approval.task_id ||
    !approval.requested_by_agent_id
  ) {
    return {
      applicable: false,
      completed: false,
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
      completed: false,
    };
  }

  /*
   * Founder approval closes Rupert's content task.
   * It does NOT publish the blog.
   *
   * Publication remains a manual Founder action
   * through Tetamo Blog Manager.
   */
  const {
    data: agentData,
    error: agentError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_agents")
      .select("id, agent_key")
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
      completed: false,
    };
  }

  const {
    data: taskData,
    error: taskError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_tasks")
      .select(
        "id, status, source_type, assigned_to_agent_id, metadata"
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

  const originalReportId =
    cleanString(
      metadata.research_report_id
    );

  const qualityReviewState =
    cleanString(
      metadata.quality_review_state
    );

  const disposition =
    cleanString(
      metadata.post_research_disposition
    );

  const taskSourceType =
    cleanString(
      task.source_type
    );

  if (
    taskSourceType ===
      "rupert_lola_handoff"
  ) {
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
        "Approved Rupert draft is no longer backed by the task's current verified draft-eligible research report."
      );
    }
  } else {
    const linkedReportId =
      currentReportId ||
      originalReportId;

    if (
      !linkedReportId ||
      linkedReportId !==
        researchReportId
    ) {
      throw new Error(
        "Approved Rupert draft does not match the research report linked to its task."
      );
    }
  }

  /*
   * Idempotent reconciliation.
   */
  if (
    task.status ===
      "completed"
  ) {
    return {
      applicable: true,
      completed: false,
      alreadyCompleted: true,
      taskId:
        task.id,
      blogId,
    };
  }

  if (
    task.status !==
      "awaiting_approval"
  ) {
    throw new Error(
      `Approved Rupert blog task cannot be completed from ${task.status}.`
    );
  }

  const approvedAt =
    new Date()
      .toISOString();

  const nextMetadata = {
    ...metadata,

    content_approved_at:
      approvedAt,

    approved_approval_id:
      approval.id,

    approved_blog_id:
      blogId,

    publication_authority:
      "founder_manual",
  };

  const {
    data: completedTaskData,
    error: completeError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_tasks")
      .update({
        status:
          "completed",

        result_summary:
          `Founder approved Rupert blog draft ${blogId}. Content task completed; blog remains a draft awaiting manual Founder publication.`,

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

  if (completeError) {
    throw completeError;
  }

  if (!completedTaskData) {
    throw new Error(
      "Rupert task changed before approved-content completion could be saved."
    );
  }

  return {
    applicable: true,
    completed: true,
    alreadyCompleted: false,
    taskId:
      task.id,
    blogId,
  };
}

export async function POST(
  req: Request,
  context: RouteContext
) {
  const auth =
    await requireTetamoAdminOrCron(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  const isCronAuth =
    "authMode" in auth &&
    auth.authMode ===
      "cron";

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

  if (
    reviewNotes.length >
      3000
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Founder review note is too long.",
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
   * Founder revision feedback is mandatory for Rupert
   * content rejection.
   *
   * An idempotent retry of an already-rejected approval
   * may rely on the review note that was persisted with the
   * original human decision.
   */
  if (
    currentApproval.action_type ===
      "publish_content" &&
    decision ===
      "rejected" &&
    !reviewNotes &&
    !cleanString(
      currentApproval.review_notes
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "A Founder review note is required when rejecting AI content.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Internal/cron auth is allowed ONLY to reconcile an
   * approval that is already rejected.
   *
   * It cannot create a rejection, approve content,
   * change the decision, or supply/replace Founder notes.
   * The original persisted human review note must exist.
   */
  if (isCronAuth) {
    if (
      currentApproval.action_type !==
        "publish_content" ||
      decision !==
        "rejected" ||
      currentApproval.status !==
        "rejected" ||
      reviewNotes ||
      !cleanString(
        currentApproval.review_notes
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Cron may only reconcile an already-rejected AI content approval with an existing Founder review note.",
        },
        {
          status: 403,
        }
      );
    }
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

    let rupertApproval = null;

    if (
      decision ===
        "approved"
    ) {
      try {
        rupertApproval =
          await completeApprovedRupertBlogTask(
            currentApproval
          );
      } catch (error) {
        console.error(
          "Approved Rupert task reconciliation failed:",
          error
        );

        return Response.json(
          {
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to complete approved Rupert task.",
            approval:
              currentApproval,
            decisionSaved:
              true,
          },
          {
            status: 500,
          }
        );
      }
    }

    let growthExperiment = null;

    try {
      growthExperiment =
        await reconcileLolaGrowthExperiment(
          currentApproval,
          decision,
          currentApproval.review_notes ||
            reviewNotes
        );
    } catch (error) {
      console.error(
        "Lola growth experiment approval reconciliation failed:",
        error
      );

      return Response.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to reconcile Lola growth experiment approval.",
          approval:
            currentApproval,
          decisionSaved:
            true,
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      ok: true,
      approval:
        currentApproval,
      alreadyReviewed:
        true,
      redraft,
      rupertApproval,
      growthExperiment,
    });
  }

  /*
   * Cron reconciliation must have returned from the
   * idempotent rejected branch above. It may never reach
   * the approval mutation path.
   */
  if (isCronAuth) {
    return Response.json(
      {
        ok: false,
        error:
          "Cron cannot create or change AI approval decisions.",
      },
      {
        status: 403,
      }
    );
  }

  const reviewerUserId =
    cleanString(
      auth.admin.userId
    );

  if (!reviewerUserId) {
    return Response.json(
      {
        ok: false,
        error:
          "A human admin reviewer is required for a new AI approval decision.",
      },
      {
        status: 403,
      }
    );
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
      reviewerUserId,

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

  let rupertApproval = null;

  if (
    decision ===
      "approved"
  ) {
    try {
      rupertApproval =
        await completeApprovedRupertBlogTask(
          savedApproval
        );
    } catch (error) {
      console.error(
        "Approved Rupert task completion failed:",
        error
      );

      /*
       * Founder approval itself is already safely persisted.
       * This reports only the linked Rupert task
       * reconciliation failure.
       */
      return Response.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "AI approval was saved, but the Rupert task could not be completed.",
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

  let growthExperiment = null;

  try {
    growthExperiment =
      await reconcileLolaGrowthExperiment(
        savedApproval,
        decision,
        reviewNotes
      );
  } catch (error) {
    console.error(
      "Lola growth experiment approval reconciliation failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI approval was saved, but the Lola growth experiment could not be reconciled.",
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

  return Response.json({
    ok: true,
    approval:
      savedApproval,
    alreadyReviewed:
      false,
    redraft,
    rupertApproval,
    growthExperiment,
  });
}
