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

  let protectedInquiryResearch =
    false;

  let protectedCustomerIntentScope =
    "";

  let protectedFounderClarificationValid =
    false;

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
      const customerIntentScope =
        cleanOptionalString(
          metadata
            .customer_intent_scope
        ).toLowerCase();

      const founderClarificationText =
        cleanOptionalString(
          metadata
            .founder_clarification_text
        );

      const founderClarificationTurnId =
        cleanOptionalString(
          metadata
            .founder_clarification_turn_id
        );

      /*
       * Founder clarification changes the INTERNAL research
       * scope for this content task. It does not rewrite the
       * original customer evidence.
       *
       * Fail closed: metadata claiming founder_clarified is not
       * sufficient by itself. The exact Founder clarification
       * text must also be present.
       */
      const hasValidFounderClarification =
        customerIntentScope ===
          "founder_clarified" &&
        Boolean(
          founderClarificationText
        ) &&
        Boolean(
          founderClarificationTurnId
        ) &&
        Boolean(
          cleanOptionalString(
            metadata
              .founder_clarification_item_id
          )
        ) &&
        Boolean(
          cleanOptionalString(
            metadata
              .founder_clarification_meeting_id
          )
        ) &&
        cleanOptionalString(
          metadata
            .founder_clarification_source
        ) ===
          "meeting_room";

      protectedInquiryResearch =
        true;

      protectedCustomerIntentScope =
        customerIntentScope;

      protectedFounderClarificationValid =
        hasValidFounderClarification;

      const protectedScope =
        hasValidFounderClarification
          ? [
              "CUSTOMER_INTENT_SCOPE=FOUNDER_CLARIFIED",
              "",
              "The original customer evidence remained ambiguous and did not identify the specific payment event.",
              "Founder Khaye has now supplied internal business clarification for this content task.",
              "Treat the Founder clarification only as internal task context.",
              "Do NOT claim or imply that customers themselves supplied this clarified meaning.",
              "Do NOT rewrite the Founder clarification as customer evidence.",
              "Public-web research may verify externally supportable facts relevant to this clarified scope.",
              "",
              `FOUNDER_CLARIFICATION_TURN_ID=${founderClarificationTurnId || "not_supplied"}`,
              `FOUNDER_CLARIFICATION_TEXT=${JSON.stringify(founderClarificationText)}`,
            ]
              .join("\n")
          : [
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

    const hasVerifiedFindings =
      result.findings.length >
        0;

    const protectedScopeNeedsClarification =
      protectedInquiryResearch &&
      !protectedFounderClarificationValid;

    const researchContentEligible =
      hasVerifiedFindings &&
      !protectedScopeNeedsClarification;

    const researchQualityReviewState =
      protectedScopeNeedsClarification
        ? "needs_internal_clarification"
        : hasVerifiedFindings
          ? "passed"
          : "insufficient_verified_findings";

    const researchBlockReason =
      protectedScopeNeedsClarification
        ? protectedCustomerIntentScope ===
            "unresolved"
          ? "customer_intent_unresolved"
          : "founder_clarification_invalid"
        : hasVerifiedFindings
          ? null
          : "insufficient_verified_findings";

    const researchPostResearchDisposition =
      protectedScopeNeedsClarification
        ? protectedCustomerIntentScope ===
            "unresolved"
          ? "needs_internal_clarification"
          : "blocked_invalid_founder_clarification"
        : hasVerifiedFindings
          ? "content_may_proceed"
          : "retry_research";

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

            protected_inquiry_research:
              protectedInquiryResearch,

            customer_intent_scope:
              protectedInquiryResearch
                ? protectedCustomerIntentScope ||
                  null
                : null,

            founder_clarification_verified:
              protectedInquiryResearch
                ? protectedFounderClarificationValid
                : null,

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
              researchContentEligible,

            quality_review_state:
              researchQualityReviewState,

            content_block_reason:
              researchBlockReason,

            post_research_disposition:
              researchPostResearchDisposition,

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

    /*
     * Protected Lola -> Rupert inquiry research may complete
     * successfully while the customer-intended subject remains
     * unresolved.
     *
     * In that case research is finished, but content work is not
     * allowed to continue. Finalize the task into the same visible
     * blocked clarification state that downstream Meeting Room
     * orchestration can safely detect.
     */
    const currentTaskMetadata =
      task?.metadata &&
      typeof task.metadata ===
        "object" &&
      !Array.isArray(
        task.metadata
      )
        ? task.metadata
        : {};

    const needsInternalClarification =
      protectedInquiryResearch &&
      protectedCustomerIntentScope ===
        "unresolved";

    if (
      needsInternalClarification &&
      task
    ) {
      const clarificationMetadata = {
        ...currentTaskMetadata,

        research_report_id:
          report.id,

        current_research_report_id:
          report.id,

        content_eligible:
          false,

        content_block_reason:
          "customer_intent_unresolved",

        quality_review_state:
          "needs_internal_clarification",

        post_research_disposition:
          "needs_internal_clarification",

        evidence_standard_version:
          "rupert_research_v5",

        research_completed_at:
          result.researchedAt,

        last_research_error:
          null,

        last_research_failed_at:
          null,
      };

      const clarificationResultSummary =
        "Rupert completed public-web research under the protected evidence boundary. Customer-intended payment meaning remains unresolved, so content drafting is blocked pending Founder clarification.";

      const {
        data:
          finalizedTask,
        error:
          finalizeTaskError,
      } =
        await aiTeamSupabaseAdmin
          .from("ai_tasks")
          .update({
            status:
              "blocked",

            result_summary:
              clarificationResultSummary,

            metadata:
              clarificationMetadata,
          })
          .eq(
            "id",
            task.id
          )
          .eq(
            "status",
            "in_progress"
          )
          .select(
            "id, status"
          )
          .maybeSingle();

      if (finalizeTaskError) {
        throw new Error(
          `Rupert clarification task finalization failed: ${finalizeTaskError.message}`
        );
      }

      if (!finalizedTask) {
        throw new Error(
          "Rupert research task state changed before clarification finalization."
        );
      }

      task = {
        ...task,

        status:
          "blocked",

        metadata:
          clarificationMetadata,
      };

      const {
        error:
          clarificationActivityError,
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
              "research_requires_internal_clarification",

            entity_type:
              "ai_report",

            entity_id:
              report.id,

            task_id:
              task.id,

            severity:
              "info",

            details: {
              report_id:
                report.id,

              content_eligible:
                false,

              content_block_reason:
                "customer_intent_unresolved",

              quality_review_state:
                "needs_internal_clarification",

              post_research_disposition:
                "needs_internal_clarification",

              evidence_standard_version:
                "rupert_research_v5",
            },
          });

      if (clarificationActivityError) {
        console.error(
          "Rupert clarification activity log failed:",
          clarificationActivityError
        );
      }
    }

    if (
      protectedInquiryResearch &&
      !needsInternalClarification &&
      task
    ) {
      const protectedResearchMetadata = {
        ...currentTaskMetadata,

        research_report_id:
          report.id,

        current_research_report_id:
          report.id,

        content_eligible:
          researchContentEligible,

        content_block_reason:
          researchBlockReason,

        quality_review_state:
          researchQualityReviewState,

        post_research_disposition:
          researchPostResearchDisposition,

        evidence_standard_version:
          "rupert_research_v5",

        research_completed_at:
          result.researchedAt,

        last_research_error:
          null,

        last_research_failed_at:
          null,
      };

      const protectedNextStatus =
        researchContentEligible
          ? "in_progress"
          : "blocked";

      const protectedResultSummary =
        researchContentEligible
          ? "Rupert completed Founder-scoped public-web research with verified findings. The current research report is eligible for content drafting and remains subject to Founder approval before publication."
          : protectedFounderClarificationValid
            ? "Rupert completed Founder-scoped public-web research, but sufficient verified findings were not available. Content drafting remains blocked."
            : "Rupert research detected incomplete or invalid Founder clarification metadata. Content drafting remains blocked.";

      const {
        data:
          protectedFinalizedTask,
        error:
          protectedFinalizeError,
      } =
        await aiTeamSupabaseAdmin
          .from("ai_tasks")
          .update({
            status:
              protectedNextStatus,

            result_summary:
              protectedResultSummary,

            metadata:
              protectedResearchMetadata,
          })
          .eq(
            "id",
            task.id
          )
          .eq(
            "status",
            "in_progress"
          )
          .select(
            "id, status"
          )
          .maybeSingle();

      if (protectedFinalizeError) {
        throw new Error(
          `Rupert protected research finalization failed: ${protectedFinalizeError.message}`
        );
      }

      if (!protectedFinalizedTask) {
        throw new Error(
          "Rupert protected research task state changed before finalization."
        );
      }

      task = {
        ...task,

        status:
          protectedNextStatus,

        metadata:
          protectedResearchMetadata,
      };
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
