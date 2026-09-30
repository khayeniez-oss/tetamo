import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  planRupertWeek,
  type RupertWeeklyTopic,
} from "@/lib/ai-team/agents/rupert-weekly";

import {
  recordSystemHeartbeat,
} from "@/lib/ai-team/agents/randolph-system-watchdog";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

const WITA_OFFSET =
  8 * 60 * 60 * 1000;

async function recordRupertCronHeartbeat() {
  try {
    await recordSystemHeartbeat({
      checkKey:
        "cron_rupert",

      displayName:
        "Rupert Daily Worker",

      message:
        "Rupert daily scheduler completed successfully.",
    });
  } catch (error) {
    console.error(
      "Unable to record Rupert cron heartbeat:",
      error
    );
  }
}

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function asRecord(
  value: unknown
): Record<string, unknown> {
  return value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
    ? value as Record<
        string,
        unknown
      >
    : {};
}

function verifyCron(
  req: Request
) {
  const secret =
    String(
      process.env.CRON_SECRET ||
        ""
    ).trim();

  if (!secret) {
    return {
      ok: false as const,

      response:
        Response.json(
          {
            ok: false,
            error:
              "CRON_SECRET is not configured.",
          },
          {
            status: 500,
          }
        ),
    };
  }

  const authorization =
    req.headers.get(
      "authorization"
    ) || "";

  const token =
    authorization
      .toLowerCase()
      .startsWith("bearer ")
      ? authorization
          .slice(7)
          .trim()
      : "";

  if (
    !token ||
    token !== secret
  ) {
    return {
      ok: false as const,

      response:
        Response.json(
          {
            ok: false,
            error:
              "Unauthorized Rupert scheduler request.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  return {
    ok:
      true as const,

    secret,
  };
}

function getWitaClock(
  now =
    new Date()
) {
  const shifted =
    new Date(
      now.getTime() +
      WITA_OFFSET
    );

  const day =
    shifted.getUTCDay();

  const mondayDistance =
    (day + 6) % 7;

  const monday =
    new Date(
      Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate() -
          mondayDistance
      )
    );

  return {
    now,

    day,

    dayName:
      [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][day],

    weekKey:
      monday
        .toISOString()
        .slice(0, 10),
  };
}

function dueAtForSlot(
  weekKey: string,
  slotIndex: number
) {
  /*
   * weekKey = Monday in WITA.
   *
   * Production days:
   * slot 1 Tuesday 08:00 WITA
   * slot 2 Thursday 08:00 WITA
   * slot 3 Saturday 08:00 WITA
   *
   * 08:00 WITA = 00:00 UTC.
   */
  const offsets =
    [1, 3, 5];

  const date =
    new Date(
      `${weekKey}T00:00:00.000Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      offsets[
        slotIndex - 1
      ]
  );

  return date.toISOString();
}

function parsePlanTopics(
  sourceData: unknown
): RupertWeeklyTopic[] {
  const data =
    asRecord(
      sourceData
    );

  if (
    !Array.isArray(
      data.topics
    )
  ) {
    return [];
  }

  return data.topics
    .map(
      (item) => {
        const row =
          asRecord(item);

        const slot =
          cleanString(
            row.slot
          );

        if (
          slot !== "timely" &&
          slot !==
            "educational" &&
          slot !==
            "evergreen"
        ) {
          return null;
        }

        const title =
          cleanString(
            row.title
          );

        const researchTopic =
          cleanString(
            row.researchTopic ??
              row.research_topic
          );

        const rationale =
          cleanString(
            row.rationale
          );

        if (
          !title ||
          !researchTopic ||
          !rationale
        ) {
          return null;
        }

        return {
          slot,
          title,
          researchTopic,
          rationale,
        } as RupertWeeklyTopic;
      }
    )
    .filter(
      (
        value
      ): value is RupertWeeklyTopic =>
        Boolean(value)
    );
}

async function getAgents() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, agent_key, display_name, status, enabled"
      )
      .in(
        "agent_key",
        [
          "rupert",
          "jake",
        ]
      );

  if (error) {
    throw error;
  }

  const rupert =
    (data ?? []).find(
      (agent) =>
        agent.agent_key ===
        "rupert"
    );

  const jake =
    (data ?? []).find(
      (agent) =>
        agent.agent_key ===
        "jake"
    );

  if (!rupert) {
    throw new Error(
      "Rupert AI agent was not found."
    );
  }

  return {
    rupert,
    jake:
      jake ?? null,
  };
}

async function getRecentContentSubjects({
  rupertId,
  excludePlanTitle,
}: {
  rupertId: string;
  excludePlanTitle?: string;
}) {
  const [
    blogsResult,
    reportsResult,
  ] =
    await Promise.all([
      aiTeamSupabaseAdmin
        .from(
          "blogs"
        )
        .select(
          "title, title_id, created_at"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(30),

      aiTeamSupabaseAdmin
        .from(
          "ai_reports"
        )
        .select(
          "title, source_data, created_at"
        )
        .eq(
          "agent_id",
          rupertId
        )
        .eq(
          "report_type",
          "content"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(40),
    ]);

  if (
    blogsResult.error
  ) {
    throw blogsResult.error;
  }

  if (
    reportsResult.error
  ) {
    throw reportsResult.error;
  }

  const subjects:
    string[] = [];

  for (
    const blog of
      blogsResult.data ?? []
  ) {
    const title =
      cleanString(
        blog.title
      );

    const titleId =
      cleanString(
        blog.title_id
      );

    if (title) {
      subjects.push(title);
    }

    if (titleId) {
      subjects.push(titleId);
    }
  }

  for (
    const report of
      reportsResult.data ?? []
  ) {
    if (
      excludePlanTitle &&
      report.title ===
        excludePlanTitle
    ) {
      continue;
    }

    const sourceData =
      asRecord(
        report.source_data
      );

    const researchKind =
      cleanString(
        sourceData
          .research_kind
      );

    /*
     * Only prior actual subject research contributes
     * to duplicate avoidance.
     *
     * Weekly plan reports are intentionally excluded.
     */
    if (
      researchKind !==
      "public_web"
    ) {
      continue;
    }

    const topic =
      cleanString(
        sourceData.topic
      );

    if (topic) {
      subjects.push(topic);
      continue;
    }

    const reportTitle =
      cleanString(
        report.title
      )
        .replace(
          /^Web Research:\s*/i,
          ""
        )
        .trim();

    if (reportTitle) {
      subjects.push(
        reportTitle
      );
    }
  }

  return Array.from(
    new Set(
      subjects.map(
        (subject) =>
          subject.trim()
      )
    )
  )
    .filter(Boolean)
    .slice(0, 50);
}

async function ensureWeeklyPlan({
  weekKey,
  rupertId,
}: {
  weekKey: string;
  rupertId: string;
}) {
  const title =
    `Rupert Weekly Content Plan — ${weekKey}`;

  const {
    data:
      existingReport,
    error:
      existingError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_reports"
      )
      .select(
        "id, title, summary, source_data, created_at"
      )
      .eq(
        "agent_id",
        rupertId
      )
      .eq(
        "report_type",
        "content"
      )
      .eq(
        "title",
        title
      )
      .limit(1)
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  let report =
    existingReport;

  let topics =
    report
      ? parsePlanTopics(
          report.source_data
        )
      : [];

  if (
    !report ||
    topics.length !== 3
  ) {
    const recentTitles =
      await getRecentContentSubjects({
        rupertId,

        excludePlanTitle:
          title,
      });

    const plan =
      await planRupertWeek({
        weekKey,
        recentTitles,
      });

    topics =
      plan.topics;

    const {
      data:
        inserted,
      error:
        insertError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_reports"
        )
        .insert({
          agent_id:
            rupertId,

          report_type:
            "content",

          title,

          summary:
            plan.summary,

          metrics: {
            topic_count:
              3,
          },

          findings:
            plan.topics,

          recommendations:
            plan.topics.map(
              (topic) =>
                topic.rationale
            ),

          source_data: {
            research_kind:
              "weekly_content_plan",

            week_key:
              weekKey,

            topics:
              plan.topics,

            research_memo:
              plan.researchMemo,

            verification_memo:
              plan.verificationMemo,

            openai_response_id:
              plan.responseId,

            openai_verification_response_id:
              plan.verificationResponseId,

            reporting_timezone:
              "Asia/Makassar",
          },
        })
        .select(
          "id, title, summary, source_data, created_at"
        )
        .single();

    if (
      insertError ||
      !inserted
    ) {
      throw (
        insertError ??
        new Error(
          "Unable to save Rupert weekly content plan."
        )
      );
    }

    report =
      inserted;

    await aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .insert({
        agent_id:
          rupertId,

        actor_user_id:
          null,

        event_type:
          "content",

        action:
          "created_weekly_content_plan",

        entity_type:
          "ai_report",

        entity_id:
          report.id,

        severity:
          "info",

        details: {
          week_key:
            weekKey,

          topic_count:
            topics.length,
        },
      });
  }

  const createdTasks:
    string[] = [];

  for (
    let index = 0;
    index <
    topics.length;
    index += 1
  ) {
    const topic =
      topics[index];

    const slotIndex =
      index + 1;

    const sourceId =
      `${weekKey}:${slotIndex}`;

    const {
      data:
        existingTask,
      error:
        taskLookupError,
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
          "rupert_weekly_blog"
        )
        .eq(
          "source_id",
          sourceId
        )
        .limit(1)
        .maybeSingle();

    if (
      taskLookupError
    ) {
      throw taskLookupError;
    }

    if (existingTask) {
      continue;
    }

    const {
      data:
        insertedTask,
      error:
        taskInsertError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_tasks"
        )
        .insert({
          title:
            `Rupert Blog ${slotIndex}: ${topic.title}`,

          description:
            topic.rationale,

          requested_by_agent_id:
            rupertId,

          assigned_to_agent_id:
            rupertId,

          requested_by_user_id:
            null,

          priority:
            "normal",

          status:
            "pending",

          source_type:
            "rupert_weekly_blog",

          source_id:
            sourceId,

          expected_outcome:
            "Complete bilingual Tetamo blog draft with verified research, SEO structure, generated editorial images, publish settings and Founder approval request.",

          requires_approval:
            true,

          due_at:
            dueAtForSlot(
              weekKey,
              slotIndex
            ),

          metadata: {
            week_key:
              weekKey,

            slot_index:
              slotIndex,

            slot_type:
              topic.slot,

            planned_title:
              topic.title,

            research_topic:
              topic.researchTopic,

            rationale:
              topic.rationale,

            weekly_plan_report_id:
              report.id,

            attempt_count:
              0,

            reporting_timezone:
              "Asia/Makassar",
          },
        })
        .select(
          "id"
        )
        .single();

    if (
      taskInsertError
    ) {
      /*
       * The unique index added by the migration
       * protects against concurrent duplicate
       * scheduler calls.
       */
      if (
        taskInsertError.code ===
        "23505"
      ) {
        continue;
      }

      throw taskInsertError;
    }

    if (
      insertedTask
    ) {
      createdTasks.push(
        insertedTask.id
      );
    }
  }

  return {
    reportId:
      report.id,

    topics,

    createdTasks,
  };
}

async function refreshUntouchedWeeklyPlan({
  weekKey,
  rupertId,
}: {
  weekKey: string;
  rupertId: string;
}) {
  const title =
    `Rupert Weekly Content Plan — ${weekKey}`;

  const {
    data:
      report,
    error:
      reportError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_reports"
      )
      .select(
        "id, title, source_data"
      )
      .eq(
        "agent_id",
        rupertId
      )
      .eq(
        "report_type",
        "content"
      )
      .eq(
        "title",
        title
      )
      .limit(1)
      .maybeSingle();

  if (reportError) {
    throw reportError;
  }

  if (!report) {
    throw new Error(
      "Current Rupert weekly plan was not found."
    );
  }

  const {
    data:
      tasks,
    error:
      tasksError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id, title, status, source_id, metadata"
      )
      .eq(
        "assigned_to_agent_id",
        rupertId
      )
      .eq(
        "source_type",
        "rupert_weekly_blog"
      )
      .like(
        "source_id",
        `${weekKey}:%`
      )
      .order(
        "source_id",
        {
          ascending:
            true,
        }
      );

  if (tasksError) {
    throw tasksError;
  }

  const rows =
    tasks ?? [];

  if (
    rows.length !== 3
  ) {
    throw new Error(
      `Expected exactly 3 current-week Rupert tasks; found ${rows.length}.`
    );
  }

  /*
   * Refresh is allowed ONLY while the three test tasks
   * are truly untouched.
   */
  for (
    const task of rows
  ) {
    const metadata =
      asRecord(
        task.metadata
      );

    const attemptCount =
      Number(
        metadata
          .attempt_count ??
          0
      );

    if (
      task.status !==
        "pending" ||
      attemptCount !== 0 ||
      cleanString(
        metadata
          .research_report_id
      ) ||
      cleanString(
        metadata.blog_id
      ) ||
      cleanString(
        metadata
          .approval_id
      ) ||
      cleanString(
        metadata
          .completed_production_at
      )
    ) {
      throw new Error(
        `Refusing to refresh task ${task.id}: weekly production has already started.`
      );
    }
  }

  const recentTitles =
    await getRecentContentSubjects({
      rupertId,

      excludePlanTitle:
        title,
    });

  const plan =
    await planRupertWeek({
      weekKey,
      recentTitles,
    });

  const {
    error:
      reportUpdateError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_reports"
      )
      .update({
        summary:
          plan.summary,

        metrics: {
          topic_count:
            3,

          verified:
            true,
        },

        findings:
          plan.topics,

        recommendations:
          plan.topics.map(
            (topic) =>
              topic.rationale
          ),

        source_data: {
          research_kind:
            "weekly_content_plan",

          week_key:
            weekKey,

          topics:
            plan.topics,

          research_memo:
            plan.researchMemo,

          verification_memo:
            plan.verificationMemo,

          openai_response_id:
            plan.responseId,

          openai_verification_response_id:
            plan.verificationResponseId,

          reporting_timezone:
            "Asia/Makassar",
        },
      })
      .eq(
        "id",
        report.id
      );

  if (
    reportUpdateError
  ) {
    throw reportUpdateError;
  }

  const updatedTaskIds:
    string[] = [];

  for (
    let index = 0;
    index <
    rows.length;
    index += 1
  ) {
    const task =
      rows[index];

    const topic =
      plan.topics[index];

    const metadata =
      asRecord(
        task.metadata
      );

    const {
      data:
        updatedTask,
      error:
        taskUpdateError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_tasks"
        )
        .update({
          title:
            `Rupert Blog ${index + 1}: ${topic.title}`,

          description:
            topic.rationale,

          metadata: {
            ...metadata,

            week_key:
              weekKey,

            slot_index:
              index + 1,

            slot_type:
              topic.slot,

            planned_title:
              topic.title,

            research_topic:
              topic.researchTopic,

            rationale:
              topic.rationale,

            weekly_plan_report_id:
              report.id,

            attempt_count:
              0,

            plan_verified:
              true,
          },
        })
        .eq(
          "id",
          task.id
        )
        .eq(
          "status",
          "pending"
        )
        .select(
          "id"
        )
        .maybeSingle();

    if (
      taskUpdateError
    ) {
      throw taskUpdateError;
    }

    if (
      !updatedTask
    ) {
      throw new Error(
        `Task ${task.id} changed while Rupert was refreshing the weekly plan.`
      );
    }

    updatedTaskIds.push(
      updatedTask.id
    );
  }

  await aiTeamSupabaseAdmin
    .from(
      "ai_activity"
    )
    .insert({
      agent_id:
        rupertId,

      actor_user_id:
        null,

      event_type:
        "content",

      action:
        "refreshed_verified_weekly_content_plan",

      entity_type:
        "ai_report",

      entity_id:
        report.id,

      severity:
        "info",

      details: {
        week_key:
          weekKey,

        updated_task_ids:
          updatedTaskIds,

        verification_memo:
          plan.verificationMemo,
      },
    });

  return {
    reportId:
      report.id,

    topics:
      plan.topics,

    verificationMemo:
      plan.verificationMemo,

    updatedTaskIds,
  };
}

async function selectDueTask({
  weekKey,
  rupertId,
}: {
  weekKey: string;
  rupertId: string;
}) {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id, title, description, status, due_at, started_at, updated_at, metadata, source_id"
      )
      .eq(
        "assigned_to_agent_id",
        rupertId
      )
      .eq(
        "source_type",
        "rupert_weekly_blog"
      )
      .like(
        "source_id",
        `${weekKey}:%`
      )
      .lte(
        "due_at",
        new Date()
          .toISOString()
      )
      .in(
        "status",
        [
          "pending",
          "blocked",
          "in_progress",
        ]
      )
      .order(
        "due_at",
        {
          ascending:
            true,
        }
      )
      .limit(10);

  if (error) {
    throw error;
  }

  const now =
    Date.now();

  for (
    const task of
      data ?? []
  ) {
    const metadata =
      asRecord(
        task.metadata
      );

    const attempts =
      Number(
        metadata.attempt_count ??
          0
      );

    if (
      Number.isFinite(
        attempts
      ) &&
      attempts >= 2 &&
      task.status ===
        "blocked"
    ) {
      continue;
    }

    if (
      task.status ===
      "in_progress"
    ) {
      const updated =
        new Date(
          task.updated_at
        ).getTime();

      const stale =
        Number.isFinite(
          updated
        ) &&
        now - updated >
          6 * 60 * 60 * 1000;

      if (!stale) {
        continue;
      }
    }

    return task;
  }

  return null;
}

async function callJson(
  url: URL,
  secret: string,
  body: unknown
) {
  const response =
    await fetch(
      url,
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${secret}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(
            body
          ),

        cache:
          "no-store",
      }
    );

  const payload =
    await response
      .json()
      .catch(
        () => null
      );

  return {
    response,
    payload,
  };
}

async function processDueTask({
  req,
  secret,
  task,
  rupertId,
}: {
  req: Request;
  secret: string;
  task: any;
  rupertId: string;
}) {
  const metadata =
    asRecord(
      task.metadata
    );

  const previousAttempts =
    Number(
      metadata.attempt_count ??
        0
    ) || 0;

  const attempt =
    previousAttempts + 1;

  const claimMetadata = {
    ...metadata,

    attempt_count:
      attempt,

    last_attempt_at:
      new Date()
        .toISOString(),

    auto_retry_exhausted:
      false,
  };

  const {
    data:
      claimed,
    error:
      claimError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .update({
        status:
          "in_progress",

        started_at:
          new Date()
            .toISOString(),

        metadata:
          claimMetadata,
      })
      .eq(
        "id",
        task.id
      )
      .eq(
        "status",
        task.status
      )
      .select(
        "id"
      )
      .maybeSingle();

  if (claimError) {
    throw claimError;
  }

  if (!claimed) {
    return {
      action:
        "not_claimed",
    };
  }

  try {
    let reportId =
      cleanString(
        metadata
          .research_report_id
      );

    if (!reportId) {
      const researchTopic =
        cleanString(
          metadata
            .research_topic
        );

      if (
        !researchTopic
      ) {
        throw new Error(
          "Weekly Rupert task has no research topic."
        );
      }

      const researchUrl =
        new URL(
          "/api/admin/ai-team/rupert/research",
          req.url
        );

      const researchResult =
        await callJson(
          researchUrl,
          secret,
          {
            topic:
              researchTopic,

            context:
              `Autonomous weekly Tetamo content production. Week ${cleanString(
                metadata.week_key
              )}. Slot: ${cleanString(
                metadata.slot_type
              )}. Research only before drafting. Do not publish anything.`,

            taskId:
              task.id,
          }
        );

      if (
        !researchResult
          .response.ok ||
        !researchResult
          .payload?.ok
      ) {
        const researchError =
          researchResult
            .payload?.error;

        const researchErrorMessage =
          typeof researchError ===
            "string"
            ? researchError
            : researchError != null
              ? JSON.stringify(
                  researchError
                )
              : "No error payload returned.";

        throw new Error(
          `Rupert research failed with HTTP ${researchResult.response.status}: ${researchErrorMessage}`
        );
      }

      reportId =
        cleanString(
          researchResult
            .payload
            ?.report
            ?.id
        ) ||
        cleanString(
          researchResult
            .payload
            ?.reportId
        );

      if (!reportId) {
        throw new Error(
          "Rupert research succeeded but returned no report ID."
        );
      }

      await aiTeamSupabaseAdmin
        .from(
          "ai_tasks"
        )
        .update({
          metadata: {
            ...claimMetadata,

            research_report_id:
              reportId,
          },
        })
        .eq(
          "id",
          task.id
        );
    }

    const blogUrl =
      new URL(
        "/api/admin/ai-team/rupert/blog-draft",
        req.url
      );

    const draftResult =
      await callJson(
        blogUrl,
        secret,
        {
          reportId,
        }
      );

    /*
     * A duplicate active approval can mean a
     * previous execution completed correctly
     * before the scheduler lost its response.
     */
    if (
      draftResult
        .response.status ===
        409 &&
      draftResult
        .payload?.existing
        ?.blogId
    ) {
      await aiTeamSupabaseAdmin
        .from(
          "ai_tasks"
        )
        .update({
          status:
            "awaiting_approval",

          result_summary:
            "Rupert blog draft already exists and is awaiting Founder approval.",

          metadata: {
            ...claimMetadata,

            research_report_id:
              reportId,

            blog_id:
              draftResult
                .payload
                .existing
                .blogId,

            approval_id:
              draftResult
                .payload
                .existing
                .approvalId ??
              null,

            recovered_existing_draft:
              true,
          },
        })
        .eq(
          "id",
          task.id
        );

      return {
        action:
          "recovered_existing_draft",

        taskId:
          task.id,

        blogId:
          draftResult
            .payload
            .existing
            .blogId,
      };
    }

    if (
      !draftResult
        .response.ok ||
      !draftResult
        .payload?.ok
    ) {
      throw new Error(
        draftResult
          .payload?.error ||
          `Rupert blog production failed with HTTP ${draftResult.response.status}.`
      );
    }

    const blogId =
      cleanString(
        draftResult
          .payload
          ?.blog
          ?.id
      );

    const approvalId =
      cleanString(
        draftResult
          .payload
          ?.approval
          ?.id
      );

    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .update({
        status:
          "awaiting_approval",

        result_summary:
          "Rupert completed the bilingual blog package. Draft is awaiting Founder approval.",

        metadata: {
          ...claimMetadata,

          research_report_id:
            reportId,

          blog_id:
            blogId ||
            null,

          approval_id:
            approvalId ||
            null,

          completed_production_at:
            new Date()
              .toISOString(),
        },
      })
      .eq(
        "id",
        task.id
      );

    await aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .insert({
        agent_id:
          rupertId,

        actor_user_id:
          null,

        event_type:
          "content",

        action:
          "completed_scheduled_blog_production",

        entity_type:
          "ai_task",

        entity_id:
          task.id,

        task_id:
          task.id,

        severity:
          "info",

        details: {
          blog_id:
            blogId ||
            null,

          approval_id:
            approvalId ||
            null,

          research_report_id:
            reportId,

          attempt,
        },
      });

    return {
      action:
        "created_blog_draft",

      taskId:
        task.id,

      blogId:
        blogId ||
        null,

      approvalId:
        approvalId ||
        null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown Rupert scheduler error.";

    /*
     * Research may have written diagnostic metadata
     * after this scheduler claimed the task.
     *
     * Reload the latest metadata before recording the
     * scheduler failure so those diagnostics are not
     * overwritten by the older claimMetadata snapshot.
     */
    const {
      data:
        latestTask,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_tasks"
        )
        .select(
          "metadata"
        )
        .eq(
          "id",
          task.id
        )
        .maybeSingle();

    const latestMetadata =
      asRecord(
        latestTask?.metadata
      );

    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .update({
        status:
          "blocked",

        result_summary:
          `Autonomous Rupert attempt ${attempt} failed: ${message}`,

        metadata: {
          ...claimMetadata,
          ...latestMetadata,

          auto_retry_exhausted:
            attempt >= 2,

          last_error:
            message,
        },
      })
      .eq(
        "id",
        task.id
      );

    await aiTeamSupabaseAdmin
      .from(
        "ai_activity"
      )
      .insert({
        agent_id:
          rupertId,

        actor_user_id:
          null,

        event_type:
          "content",

        action:
          "scheduled_blog_production_failed",

        entity_type:
          "ai_task",

        entity_id:
          task.id,

        task_id:
          task.id,

        severity:
          "warning",

        details: {
          attempt,
          error:
            message,

          auto_retry_exhausted:
            attempt >= 2,
        },
      });

    return {
      action:
        "blocked",

      taskId:
        task.id,

      attempt,

      error:
        message,
    };
  }
}

async function ensureWeeklyReport({
  weekKey,
  rupertId,
  jakeId,
}: {
  weekKey: string;
  rupertId: string;
  jakeId: string | null;
}) {
  const title =
    `Rupert Weekly Content Report — ${weekKey}`;

  const {
    data:
      existing,
    error:
      existingError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_reports"
      )
      .select(
        "id"
      )
      .eq(
        "agent_id",
        rupertId
      )
      .eq(
        "report_type",
        "weekly"
      )
      .eq(
        "title",
        title
      )
      .limit(1)
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return {
      id:
        existing.id,

      existing:
        true,
    };
  }

  const {
    data:
      tasks,
    error:
      tasksError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id, title, status, due_at, result_summary, metadata"
      )
      .eq(
        "assigned_to_agent_id",
        rupertId
      )
      .eq(
        "source_type",
        "rupert_weekly_blog"
      )
      .like(
        "source_id",
        `${weekKey}:%`
      )
      .order(
        "due_at",
        {
          ascending:
            true,
        }
      );

  if (tasksError) {
    throw tasksError;
  }

  const rows =
    tasks ?? [];

  const counts =
    rows.reduce(
      (
        result,
        task
      ) => {
        result[
          task.status
        ] =
          (
            result[
              task.status
            ] || 0
          ) + 1;

        return result;
      },
      {} as Record<
        string,
        number
      >
    );

  const summary =
    `Rupert weekly content operations for ${weekKey}: ${rows.length} planned blogs. ` +
    `${counts.awaiting_approval || 0} awaiting Founder approval, ` +
    `${counts.completed || 0} completed, ` +
    `${counts.blocked || 0} blocked, ` +
    `${counts.pending || 0} pending, ` +
    `${counts.in_progress || 0} in progress.`;

  const {
    data:
      report,
    error:
      reportError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_reports"
      )
      .insert({
        agent_id:
          rupertId,

        report_type:
          "weekly",

        title,

        summary,

        metrics: {
          planned:
            rows.length,

          awaiting_approval:
            counts.awaiting_approval ||
            0,

          completed:
            counts.completed ||
            0,

          blocked:
            counts.blocked ||
            0,

          pending:
            counts.pending ||
            0,

          in_progress:
            counts.in_progress ||
            0,
        },

        findings:
          rows.map(
            (task) => ({
              task_id:
                task.id,

              title:
                task.title,

              status:
                task.status,

              result_summary:
                task.result_summary,

              metadata:
                task.metadata,
            })
          ),

        recommendations:
          [],

        recipient_agent_id:
          jakeId,

        source_data: {
          reporting_kind:
            "rupert_weekly_content_operations",

          week_key:
            weekKey,

          reporting_timezone:
            "Asia/Makassar",
        },
      })
      .select(
        "id"
      )
      .single();

  if (
    reportError ||
    !report
  ) {
    throw (
      reportError ??
      new Error(
        "Unable to save Rupert weekly report."
      )
    );
  }

  return {
    id:
      report.id,

    existing:
      false,
  };
}

async function run(
  req: Request
) {
  const auth =
    verifyCron(req);

  if (!auth.ok) {
    return auth.response;
  }

  const clock =
    getWitaClock();

  const mode =
    new URL(req.url)
      .searchParams
      .get("mode") ||
    "run";

  try {
    const {
      rupert,
      jake,
    } =
      await getAgents();

    /*
     * Rupert's database state is the master ON/OFF switch.
     *
     * A scheduled request while Rupert is disabled should
     * exit successfully without creating research, tasks,
     * blogs, images, approvals or reports.
     */
    if (
      !rupert.enabled ||
      rupert.status !==
        "active"
    ) {
      await recordRupertCronHeartbeat();

      return Response.json({
        ok:
          true,

        reportingTimezone:
          "Asia/Makassar",

        weekday:
          clock.dayName,

        weekKey:
          clock.weekKey,

        agent: {
          key:
            "rupert",

          status:
            rupert.status,

          enabled:
            rupert.enabled,
        },

        production: {
          action:
            "skipped_agent_disabled",
        },

        message:
          "Rupert is disabled in the AI Team registry.",

        ranAt:
          new Date()
            .toISOString(),
      });
    }

    /*
     * Every daily wake-up repairs/creates the
     * current weekly plan if necessary.
     *
     * Therefore if Monday was missed, Tuesday
     * can safely recreate the plan before work.
     */
    const plan =
      await ensureWeeklyPlan({
        weekKey:
          clock.weekKey,

        rupertId:
          rupert.id,
      });

    /*
     * Controlled test-plan refresh.
     *
     * This is allowed only while all three weekly tasks
     * remain pending and attempt_count=0.
     *
     * It updates the existing report/tasks in place.
     * No blog production.
     * No images.
     * No approval request.
     */
    if (
      mode ===
      "refresh_plan_only"
    ) {
      const refreshed =
        await refreshUntouchedWeeklyPlan({
          weekKey:
            clock.weekKey,

          rupertId:
            rupert.id,
        });

      await recordRupertCronHeartbeat();

      return Response.json({
        ok:
          true,

        mode:
          "refresh_plan_only",

        reportingTimezone:
          "Asia/Makassar",

        weekday:
          clock.dayName,

        weekKey:
          clock.weekKey,

        plan: {
          reportId:
            refreshed.reportId,

          topics:
            refreshed.topics,

          verificationMemo:
            refreshed.verificationMemo,

          updatedTaskIds:
            refreshed.updatedTaskIds,
        },

        production: {
          action:
            "skipped_refresh_plan_only",
        },

        ranAt:
          new Date()
            .toISOString(),
      });
    }

    /*
     * Safe manual test mode.
     *
     * Research + weekly plan + task creation only.
     * No article production.
     * No images.
     * No approval request.
     */
    if (
      mode ===
      "plan_only"
    ) {
      await recordRupertCronHeartbeat();

      return Response.json({
        ok: true,

        mode:
          "plan_only",

        reportingTimezone:
          "Asia/Makassar",

        weekday:
          clock.dayName,

        weekKey:
          clock.weekKey,

        plan: {
          reportId:
            plan.reportId,

          topics:
            plan.topics,

          createdTaskIds:
            plan.createdTasks,
        },

        production: {
          action:
            "skipped_plan_only",
        },

        ranAt:
          new Date()
            .toISOString(),
      });
    }

    /*
     * Process at most ONE due article per daily
     * wake-up. This keeps image generation and
     * research isolated and traceable.
     */
    const dueTask =
      await selectDueTask({
        weekKey:
          clock.weekKey,

        rupertId:
          rupert.id,
      });

    const production =
      dueTask
        ? await processDueTask({
            req,

            secret:
              auth.secret,

            task:
              dueTask,

            rupertId:
              rupert.id,
          })
        : {
            action:
              "nothing_due",
          };

    /*
     * Sunday creates the operational report
     * for Jake. Draft approval remains Kai's.
     */
    const weeklyReport =
      clock.day === 0
        ? await ensureWeeklyReport({
            weekKey:
              clock.weekKey,

            rupertId:
              rupert.id,

            jakeId:
              jake?.id ??
              null,
          })
        : null;

    await recordRupertCronHeartbeat();

    return Response.json({
      ok:
        true,

      reportingTimezone:
        "Asia/Makassar",

      weekday:
        clock.dayName,

      weekKey:
        clock.weekKey,

      plan: {
        reportId:
          plan.reportId,

        topics:
          plan.topics,

        createdTaskIds:
          plan.createdTasks,
      },

      production,

      weeklyReport,

      ranAt:
        new Date()
          .toISOString(),
    });
  } catch (error) {
    console.error(
      "Rupert daily scheduler failed:",
      error
    );

    return Response.json(
      {
        ok:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Rupert scheduler failed.",
      },
      {
        status:
          500,
      }
    );
  }
}

export async function GET(
  req: Request
) {
  return run(req);
}

export async function POST(
  req: Request
) {
  return run(req);
}
