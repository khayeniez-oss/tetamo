import "server-only";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  generateJakeOperationalCaptures,
  type JakeOperationalCapture,
  type JakeOperationsAgent,
  type JakeOperationsTurn,
} from "@/lib/ai-team/agents/jake-operations";

import type {
  AIAgentKey,
} from "@/lib/ai-team/permissions/agent-permissions";

type CaptureInput = {
  meetingId: string;
  meetingTitle: string;
  sourceTurnId: string;
  founderUserId: string;
};

type AgentRow = {
  id: string;
  agent_key: AIAgentKey;
  display_name: string;
  role_title: string;
};

type MeetingTurnRow = {
  turn_order: number;

  speaker_type:
    | "user"
    | "advisor"
    | "agent"
    | "system";

  speaker_name_snapshot: string;

  speaker_role_snapshot:
    | string
    | null;

  content: string;
};

function priorityToSeverity(
  priority:
    JakeOperationalCapture["priority"]
) {
  if (priority === "critical") {
    return "critical";
  }

  if (priority === "high") {
    return "high";
  }

  return "info";
}

function isTaskLike(
  kind: JakeOperationalCapture["kind"]
) {
  return (
    kind === "task" ||
    kind === "investigation" ||
    kind === "follow_up" ||
    kind === "reminder"
  );
}

function isDecisionLike(
  kind: JakeOperationalCapture["kind"]
) {
  return (
    kind === "decision" ||
    kind === "defer" ||
    kind === "priority_change"
  );
}

export async function captureAndPersistMeetingLiveOperations({
  meetingId,
  meetingTitle,
  sourceTurnId,
  founderUserId,
}: CaptureInput) {
  const [
    turnsResult,
    agentsResult,
  ] = await Promise.all([
    aiTeamSupabaseAdmin
      .from("ai_meeting_turns")
      .select(
        [
          "turn_order",
          "speaker_type",
          "speaker_name_snapshot",
          "speaker_role_snapshot",
          "content",
        ].join(",")
      )
      .eq(
        "meeting_id",
        meetingId
      )
      .order(
        "turn_order",
        {
          ascending: false,
        }
      )
      .limit(20),

    aiTeamSupabaseAdmin
      .from("ai_agents")
      .select(
        [
          "id",
          "agent_key",
          "display_name",
          "role_title",
        ].join(",")
      ),
  ]);

  if (turnsResult.error) {
    throw turnsResult.error;
  }

  if (agentsResult.error) {
    throw agentsResult.error;
  }

  const agentRows =
    (
      agentsResult.data ??
      []
    ) as unknown as AgentRow[];

  const turnRows =
    (
      turnsResult.data ??
      []
    ) as unknown as MeetingTurnRow[];

  const agents: JakeOperationsAgent[] =
    agentRows.map(
      (agent) => ({
        agentKey:
          agent.agent_key,
        displayName:
          agent.display_name,
        roleTitle:
          agent.role_title,
      })
    );

  const recentTurns: JakeOperationsTurn[] =
    turnRows
      .slice()
      .reverse()
      .map((turn) => ({
        turnOrder:
          turn.turn_order,

        speakerName:
          turn.speaker_name_snapshot,

        speakerRole:
          turn.speaker_role_snapshot,

        speakerType:
          turn.speaker_type,

        content:
          turn.content,
      }));

  const captures =
    await generateJakeOperationalCaptures({
      meetingTitle,
      recentTurns,
      agents,
    });

  if (captures.length === 0) {
    return {
      captures: [],
      tasksCreated: 0,
      decisionsCreated: 0,
      pendingConfirmations: 0,
      risksRecorded: 0,
      approvalsCreated: 0,
      duplicatesSuppressed: 0,
    };
  }

  const agentByKey =
    new Map<
      AIAgentKey,
      AgentRow
    >();

  for (const agent of agentRows) {
    agentByKey.set(
      agent.agent_key,
      agent
    );
  }

  const jake =
    agentByKey.get("jake") ??
    null;

  let tasksCreated = 0;
  let decisionsCreated = 0;
  let pendingConfirmations = 0;
  let risksRecorded = 0;
  let approvalsCreated = 0;
  let duplicatesSuppressed = 0;

  for (const capture of captures) {
    const owner =
      capture.ownerAgentKey
        ? agentByKey.get(
            capture.ownerAgentKey
          ) ?? null
        : null;

    const commonMetadata = {
      capture_source:
        "jake_live_capture",
      capture_kind:
        capture.kind,
      capture_dedupe_key:
        capture.dedupeKey,
      capture_certainty:
        capture.certainty,
      source_turn_id:
        sourceTurnId,
      source_excerpt:
        capture.sourceExcerpt,
      deadline_text:
        capture.deadlineText,
      owner_agent_key:
        capture.ownerAgentKey,
    };

    /*
     * Tentative Founder language is preserved
     * for confirmation, but does NOT become
     * committed work.
     */
    if (
      capture.certainty ===
      "tentative"
    ) {
      const {
        data: item,
        error: itemError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_meeting_items"
          )
          .insert({
            meeting_id:
              meetingId,

            item_type:
              "discussion",

            title:
              capture.title,

            content:
              capture.description ??
              capture.sourceExcerpt,

            presented_by_agent_id:
              jake?.id ?? null,

            status:
              "pending",

            metadata: {
              ...commonMetadata,
              capture_status:
                "needs_confirmation",
              expected_outcome:
                capture.expectedOutcome,
              requires_approval:
                capture.requiresApproval,
              proposed_priority:
                capture.priority,
              proposed_due_at:
                capture.dueAt,
            },
          })
          .select("id")
          .single();

      if (itemError) {
        console.error(
          "AI Team tentative capture failed:",
          itemError
        );

        continue;
      }

      pendingConfirmations += 1;

      await aiTeamSupabaseAdmin
        .from("ai_activity")
        .insert({
          agent_id:
            jake?.id ?? null,

          actor_user_id:
            founderUserId,

          event_type:
            "meeting_capture",

          action:
            "captured_tentative_item",

          entity_type:
            "ai_meeting_item",

          entity_id:
            item.id,

          severity:
            "info",

          details: {
            ...commonMetadata,
            title:
              capture.title,
          },
        });

      continue;
    }

    /*
     * A task-like capture without a concrete owner is not yet
     * executable work.
     *
     * Broad Founder questions such as "Team, what should we
     * focus on?" may sound operational, but they must not
     * silently create ownerless Workboard tasks.
     *
     * Preserve the item as Meeting Room discussion instead.
     */
    if (
      isTaskLike(
        capture.kind
      ) &&
      !owner
    ) {
      const {
        error:
          discussionError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_meeting_items"
          )
          .insert({
            meeting_id:
              meetingId,

            item_type:
              "discussion",

            title:
              capture.title,

            content:
              capture.description ??
              capture.sourceExcerpt,

            presented_by_agent_id:
              jake?.id ?? null,

            status:
              "pending",

            metadata: {
              ...commonMetadata,

              capture_status:
                "owner_required",

              expected_outcome:
                capture.expectedOutcome,

              requires_approval:
                capture.requiresApproval,
            },
          });

      if (discussionError) {
        console.error(
          "AI Team ownerless task discussion capture failed:",
          discussionError
        );
      }

      continue;
    }

    /*
     * Confirmed operational task.
     */
    if (
      isTaskLike(
        capture.kind
      )
    ) {
      /*
       * Do not create repeated copies of the
       * same open work inside one meeting.
       *
       * Jake supplies a semantic dedupe key so
       * rewording the same instruction does not
       * silently create another task.
       */
      const {
        data: existingTasks,
        error: duplicateCheckError,
      } =
        await aiTeamSupabaseAdmin
          .from("ai_tasks")
          .select(
            "id, title, status"
          )
          .eq(
            "related_entity_type",
            "ai_meeting"
          )
          .eq(
            "related_entity_id",
            meetingId
          )
          .in(
            "status",
            [
              "pending",
              "in_progress",
              "blocked",
              "awaiting_approval",
            ]
          )
          .contains(
            "metadata",
            {
              capture_dedupe_key:
                capture.dedupeKey,
            }
          )
          .limit(1);

      if (duplicateCheckError) {
        console.error(
          "AI Team duplicate task check failed:",
          duplicateCheckError
        );
      }

      const existingTask =
        existingTasks?.[0] ??
        null;

      if (existingTask) {
        duplicatesSuppressed += 1;

        await aiTeamSupabaseAdmin
          .from("ai_activity")
          .insert({
            agent_id:
              jake?.id ?? null,

            actor_user_id:
              founderUserId,

            event_type:
              "meeting_capture",

            action:
              "suppressed_duplicate_task",

            entity_type:
              "ai_task",

            entity_id:
              existingTask.id,

            task_id:
              existingTask.id,

            severity:
              "info",

            details: {
              ...commonMetadata,

              duplicate_of_task_id:
                existingTask.id,

              existing_task_title:
                existingTask.title,

              repeated_source_turn_id:
                sourceTurnId,
            },
          });

        continue;
      }

      const taskStatus =
        capture.requiresApproval
          ? "awaiting_approval"
          : "pending";

      const {
        data: task,
        error: taskError,
      } =
        await aiTeamSupabaseAdmin
          .from("ai_tasks")
          .insert({
            title:
              capture.title,

            description:
              capture.description,

            requested_by_agent_id:
              null,

            requested_by_user_id:
              founderUserId,

            assigned_to_agent_id:
              owner?.id ?? null,

            priority:
              capture.priority,

            status:
              taskStatus,

            source_type:
              "meeting_turn",

            source_id:
              sourceTurnId,

            related_entity_type:
              "ai_meeting",

            related_entity_id:
              meetingId,

            expected_outcome:
              capture.expectedOutcome,

            requires_approval:
              capture.requiresApproval,

            due_at:
              capture.dueAt,

            metadata: {
              ...commonMetadata,
            },
          })
          .select("id")
          .single();

      if (taskError) {
        console.error(
          "AI Team task capture failed:",
          taskError
        );

        continue;
      }

      tasksCreated += 1;

      await aiTeamSupabaseAdmin
        .from(
          "ai_meeting_items"
        )
        .insert({
          meeting_id:
            meetingId,

          item_type:
            "action",

          title:
            capture.title,

          content:
            capture.description ??
            capture.sourceExcerpt,

          presented_by_agent_id:
            jake?.id ?? null,

          related_task_id:
            task.id,

          status:
            "actioned",

          metadata: {
            ...commonMetadata,
            expected_outcome:
              capture.expectedOutcome,
          },
        });

      await aiTeamSupabaseAdmin
        .from("ai_activity")
        .insert({
          agent_id:
            jake?.id ?? null,

          actor_user_id:
            founderUserId,

          event_type:
            "meeting_capture",

          action:
            "created_task_from_meeting",

          entity_type:
            "ai_task",

          entity_id:
            task.id,

          task_id:
            task.id,

          severity:
            priorityToSeverity(
              capture.priority
            ),

          details: {
            ...commonMetadata,
            title:
              capture.title,
          },
        });

      /*
       * Only create an approval request
       * when Jake determined a separate
       * Founder approval is still needed.
       */
      if (
        capture.requiresApproval
      ) {
        const {
          error:
            approvalError,
        } =
          await aiTeamSupabaseAdmin
            .from(
              "ai_approvals"
            )
            .insert({
              requested_by_agent_id:
                owner?.id ??
                jake?.id ??
                null,

              task_id:
                task.id,

              action_type:
                "ai_task_execution",

              action_summary:
                capture.title,

              risk_level:
                capture.priority,

              status:
                "pending",

              requested_payload: {
                ...commonMetadata,
                task_id:
                  task.id,
                description:
                  capture.description,
                expected_outcome:
                  capture.expectedOutcome,
              },

              execution_status:
                "not_started",
            });

        if (
          approvalError
        ) {
          console.error(
            "AI Team approval capture failed:",
            approvalError
          );
        } else {
          approvalsCreated += 1;
        }
      }

      continue;
    }

    /*
     * Confirmed Founder decision.
     */
    if (
      isDecisionLike(
        capture.kind
      )
    ) {
      const decisionStatus =
        capture.kind === "defer"
          ? "deferred"
          : "approved";

      const {
        data: decision,
        error:
          decisionError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_decisions"
          )
          .insert({
            title:
              capture.title,

            description:
              capture.description,

            proposed_by_agent_id:
              null,

            decision_maker_agent_id:
              null,

            decision_maker_user_id:
              founderUserId,

            status:
              decisionStatus,

            rationale:
              capture.description,

            related_entity_type:
              "ai_meeting",

            related_entity_id:
              meetingId,

            decided_at:
              new Date()
                .toISOString(),

            metadata: {
              ...commonMetadata,
              priority:
                capture.priority,
              expected_outcome:
                capture.expectedOutcome,
            },
          })
          .select("id")
          .single();

      if (
        decisionError
      ) {
        console.error(
          "AI Team decision capture failed:",
          decisionError
        );

        continue;
      }

      decisionsCreated += 1;

      await aiTeamSupabaseAdmin
        .from(
          "ai_meeting_items"
        )
        .insert({
          meeting_id:
            meetingId,

          item_type:
            "decision",

          title:
            capture.title,

          content:
            capture.description ??
            capture.sourceExcerpt,

          presented_by_agent_id:
            jake?.id ?? null,

          related_decision_id:
            decision.id,

          status:
            capture.kind ===
            "defer"
              ? "deferred"
              : "closed",

          metadata: {
            ...commonMetadata,
          },
        });

      await aiTeamSupabaseAdmin
        .from("ai_activity")
        .insert({
          agent_id:
            jake?.id ?? null,

          actor_user_id:
            founderUserId,

          event_type:
            "meeting_capture",

          action:
            "recorded_founder_decision",

          entity_type:
            "ai_decision",

          entity_id:
            decision.id,

          severity:
            priorityToSeverity(
              capture.priority
            ),

          details: {
            ...commonMetadata,
            title:
              capture.title,
          },
        });

      continue;
    }

    /*
     * A confirmed problem with no
     * corrective action yet becomes
     * a Meeting Room risk, not a fake task.
     */
    if (
      capture.kind ===
      "problem"
    ) {
      const {
        data: item,
        error: itemError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_meeting_items"
          )
          .insert({
            meeting_id:
              meetingId,

            item_type:
              "risk",

            title:
              capture.title,

            content:
              capture.description ??
              capture.sourceExcerpt,

            presented_by_agent_id:
              jake?.id ?? null,

            status:
              "pending",

            metadata: {
              ...commonMetadata,
              expected_outcome:
                capture.expectedOutcome,
            },
          })
          .select("id")
          .single();

      if (
        itemError
      ) {
        console.error(
          "AI Team problem capture failed:",
          itemError
        );

        continue;
      }

      risksRecorded += 1;

      await aiTeamSupabaseAdmin
        .from("ai_activity")
        .insert({
          agent_id:
            jake?.id ?? null,

          actor_user_id:
            founderUserId,

          event_type:
            "meeting_capture",

          action:
            "recorded_meeting_risk",

          entity_type:
            "ai_meeting_item",

          entity_id:
            item.id,

          severity:
            priorityToSeverity(
              capture.priority
            ),

          details: {
            ...commonMetadata,
            title:
              capture.title,
          },
        });
    }
  }

  return {
    captures,
    tasksCreated,
    decisionsCreated,
    pendingConfirmations,
    risksRecorded,
    approvalsCreated,
    duplicatesSuppressed,
  };
}
