import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  captureAndPersistMeetingLiveOperations,
} from "@/lib/ai-team/core/meeting-live-capture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    meetingId: string;
  }>;
};

type InputSource = "text" | "voice";

function isInputSource(
  value: unknown
): value is InputSource {
  return value === "text" || value === "voice";
}

export async function GET(
  req: Request,
  context: RouteContext
) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const { meetingId } = await context.params;

  const {
    data: meeting,
    error: meetingError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meetings")
    .select("id, status, title")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    console.error(
      "AI Team meeting lookup failed:",
      meetingError
    );

    return Response.json(
      {
        ok: false,
        error: "Unable to load meeting.",
      },
      { status: 500 }
    );
  }

  if (!meeting) {
    return Response.json(
      {
        ok: false,
        error: "Meeting not found.",
      },
      { status: 404 }
    );
  }

  const {
    data: turns,
    error: turnsError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meeting_turns")
    .select(
      [
        "id",
        "meeting_id",
        "turn_order",
        "speaker_type",
        "spoken_by_agent_id",
        "spoken_by_user_id",
        "speaker_name_snapshot",
        "speaker_role_snapshot",
        "input_source",
        "presence_state",
        "content",
        "reply_to_turn_id",
        "related_meeting_item_id",
        "related_task_id",
        "related_decision_id",
        "metadata",
        "spoken_at",
        "created_at",
      ].join(",")
    )
    .eq("meeting_id", meetingId)
    .order("turn_order", {
      ascending: true,
    })
    .limit(500);

  if (turnsError) {
    console.error(
      "AI Team meeting turns fetch failed:",
      turnsError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load meeting conversation.",
      },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    meeting,
    turns: turns ?? [],
  });
}

export async function POST(
  req: Request,
  context: RouteContext
) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const { meetingId } = await context.params;

  let body: {
    content?: unknown;
    inputSource?: unknown;
    relatedMeetingItemId?: unknown;
    relatedTaskId?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid request body.",
      },
      { status: 400 }
    );
  }

  const content =
    typeof body.content === "string"
      ? body.content.trim()
      : "";

  if (!content) {
    return Response.json(
      {
        ok: false,
        error:
          "Meeting turn content is required.",
      },
      { status: 400 }
    );
  }

  if (content.length > 10000) {
    return Response.json(
      {
        ok: false,
        error:
          "Meeting turn is too long.",
      },
      { status: 400 }
    );
  }

  const inputSource =
    body.inputSource ?? "text";

  const relatedMeetingItemId =
    typeof body.relatedMeetingItemId ===
      "string"
      ? body.relatedMeetingItemId.trim()
      : "";

  const relatedTaskId =
    typeof body.relatedTaskId ===
      "string"
      ? body.relatedTaskId.trim()
      : "";

  const hasClarificationLink =
    Boolean(
      relatedMeetingItemId ||
      relatedTaskId
    );

  if (
    hasClarificationLink &&
    (
      !relatedMeetingItemId ||
      !relatedTaskId
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Founder clarification requires both a meeting item and task link.",
      },
      { status: 400 }
    );
  }

  if (!isInputSource(inputSource)) {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid meeting input source.",
      },
      { status: 400 }
    );
  }

  const {
    data: meeting,
    error: meetingError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meetings")
    .select("id, status, title")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    console.error(
      "AI Team meeting lookup failed:",
      meetingError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to verify meeting.",
      },
      { status: 500 }
    );
  }

  if (!meeting) {
    return Response.json(
      {
        ok: false,
        error: "Meeting not found.",
      },
      { status: 404 }
    );
  }

  if (meeting.status !== "in_progress") {
    return Response.json(
      {
        ok: false,
        error:
          "Meeting is not currently in progress.",
      },
      { status: 409 }
    );
  }

  /*
   * Reload/double-submit protection for Founder clarification.
   *
   * Once a clarification turn already exists for this exact
   * meeting item/task/user, return that same turn instead of
   * creating another one.
   *
   * The database unique index added separately protects the
   * concurrent race; this lookup handles normal retries and
   * browser reload/re-submit behaviour.
   */
  const loadExistingFounderClarificationTurn =
    async () => {
      if (!hasClarificationLink) {
        return {
          turn: null,
          error: null,
        };
      }

      const {
        data:
          existingTurn,
        error:
          existingTurnError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_meeting_turns"
          )
          .select(
            [
              "id",
              "meeting_id",
              "turn_order",
              "speaker_type",
              "spoken_by_user_id",
              "speaker_name_snapshot",
              "speaker_role_snapshot",
              "input_source",
              "presence_state",
              "content",
              "related_meeting_item_id",
              "related_task_id",
              "metadata",
              "spoken_at",
              "created_at",
            ].join(",")
          )
          .eq(
            "meeting_id",
            meetingId
          )
          .eq(
            "speaker_type",
            "user"
          )
          .eq(
            "spoken_by_user_id",
            auth.admin.userId
          )
          .eq(
            "related_meeting_item_id",
            relatedMeetingItemId
          )
          .eq(
            "related_task_id",
            relatedTaskId
          )
          .contains(
            "metadata",
            {
              turn_kind:
                "founder_clarification",

              clarification_source:
                "founder_clarification_queue",
            }
          )
          .order(
            "created_at",
            {
              ascending: true,
            }
          )
          .limit(1)
          .maybeSingle();

      return {
        turn:
          existingTurn ??
          null,

        error:
          existingTurnError ??
          null,
      };
    };

  if (hasClarificationLink) {
    const {
      turn:
        existingClarificationTurn,
      error:
        existingClarificationError,
    } =
      await loadExistingFounderClarificationTurn();

    if (existingClarificationError) {
      console.error(
        "Existing Founder clarification turn lookup failed:",
        existingClarificationError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to verify existing Founder clarification.",
        },
        { status: 500 }
      );
    }

    if (existingClarificationTurn) {
      return Response.json(
        {
          ok: true,

          turn:
            existingClarificationTurn,

          liveCapture:
            null,

          liveCaptureSkipped:
            "founder_clarification",

          alreadySaved:
            true,
        },
        { status: 200 }
      );
    }
  }

  /*
   * Explicit Founder clarification linkage.
   *
   * Never trust task/item IDs supplied by the browser.
   * The server proves that:
   *
   * - the item belongs to this active meeting;
   * - it is still pending;
   * - it came from Jake's Founder clarification queue;
   * - it points to the same task;
   * - the task is still the protected blocked
   *   Lola -> Rupert inquiry task.
   */
  if (hasClarificationLink) {
    const {
      data: rawMeetingItem,
      error: meetingItemError,
    } =
      await aiTeamSupabaseAdmin
        .from("ai_meeting_items")
        .select(
          [
            "id",
            "meeting_id",
            "item_type",
            "related_task_id",
            "status",
            "metadata",
          ].join(",")
        )
        .eq(
          "id",
          relatedMeetingItemId
        )
        .eq(
          "meeting_id",
          meetingId
        )
        .maybeSingle();

    if (meetingItemError) {
      console.error(
        "Founder clarification meeting-item verification failed:",
        meetingItemError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to verify Founder clarification item.",
        },
        { status: 500 }
      );
    }

    if (!rawMeetingItem) {
      return Response.json(
        {
          ok: false,
          error:
            "Founder clarification item is no longer available.",
        },
        { status: 409 }
      );
    }

    const meetingItem =
      rawMeetingItem as unknown as {
        id: string;
        meeting_id: string;
        item_type: string;
        related_task_id: string | null;
        status: string;
        metadata:
          | Record<string, unknown>
          | null;
      };

    const meetingItemMetadata =
      meetingItem.metadata &&
      typeof meetingItem.metadata ===
        "object" &&
      !Array.isArray(
        meetingItem.metadata
      )
        ? meetingItem.metadata
        : {};

    if (
      meetingItem.item_type !==
        "discussion" ||
      meetingItem.status !==
        "pending" ||
      meetingItem.related_task_id !==
        relatedTaskId ||
      meetingItemMetadata.source !==
        "founder_clarification_queue" ||
      meetingItemMetadata
        .requires_founder_clarification !==
        true
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Founder clarification item is stale or does not match this task.",
        },
        { status: 409 }
      );
    }

    const {
      data: rawTask,
      error: taskError,
    } =
      await aiTeamSupabaseAdmin
        .from("ai_tasks")
        .select(
          [
            "id",
            "status",
            "source_type",
            "metadata",
          ].join(",")
        )
        .eq(
          "id",
          relatedTaskId
        )
        .maybeSingle();

    if (taskError) {
      console.error(
        "Founder clarification task verification failed:",
        taskError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to verify blocked clarification task.",
        },
        { status: 500 }
      );
    }

    if (!rawTask) {
      return Response.json(
        {
          ok: false,
          error:
            "Blocked clarification task no longer exists.",
        },
        { status: 409 }
      );
    }

    const task =
      rawTask as unknown as {
        id: string;
        status: string;
        source_type: string | null;
        metadata:
          | Record<string, unknown>
          | null;
      };

    const taskMetadata =
      task.metadata &&
      typeof task.metadata ===
        "object" &&
      !Array.isArray(
        task.metadata
      )
        ? task.metadata
        : {};

    if (
      task.status !==
        "blocked" ||
      task.source_type !==
        "rupert_lola_handoff" ||
      taskMetadata
        .customer_intent_scope !==
        "unresolved" ||
      taskMetadata
        .content_block_reason !==
        "customer_intent_unresolved" ||
      taskMetadata
        .post_research_disposition !==
        "needs_internal_clarification" ||
      taskMetadata
        .content_eligible !==
        false
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "This task is no longer awaiting Founder clarification.",
        },
        { status: 409 }
      );
    }
  }

  let lastInsertError: {
    code?: string;
    message?: string;
  } | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const {
      data: latestTurn,
      error: latestTurnError,
    } = await aiTeamSupabaseAdmin
      .from("ai_meeting_turns")
      .select("turn_order")
      .eq("meeting_id", meetingId)
      .order("turn_order", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (latestTurnError) {
      console.error(
        "AI Team latest turn lookup failed:",
        latestTurnError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to determine meeting turn order.",
        },
        { status: 500 }
      );
    }

    const nextTurnOrder =
      (latestTurn?.turn_order ?? 0) + 1;

    const {
      data: turn,
      error: insertError,
    } = await aiTeamSupabaseAdmin
      .from("ai_meeting_turns")
      .insert({
        meeting_id: meetingId,
        turn_order: nextTurnOrder,
        speaker_type: "user",
        spoken_by_agent_id: null,
        spoken_by_user_id:
          auth.admin.userId,
        speaker_name_snapshot: "Khaye",
        speaker_role_snapshot:
          "Founder / CEO",
        input_source: inputSource,
        presence_state: "speaking",
        content,

        related_meeting_item_id:
          hasClarificationLink
            ? relatedMeetingItemId
            : null,

        related_task_id:
          hasClarificationLink
            ? relatedTaskId
            : null,

        metadata: {
          submitted_from:
            "admin_ai_team_meeting_room",

          turn_kind:
            hasClarificationLink
              ? "founder_clarification"
              : "meeting_turn",

          clarification_source:
            hasClarificationLink
              ? "founder_clarification_queue"
              : null,
        },
      })
      .select(
        [
          "id",
          "meeting_id",
          "turn_order",
          "speaker_type",
          "spoken_by_user_id",
          "speaker_name_snapshot",
          "speaker_role_snapshot",
          "input_source",
          "presence_state",
          "content",
          "related_meeting_item_id",
          "related_task_id",
          "metadata",
          "spoken_at",
          "created_at",
        ].join(",")
      )
      .single();

    if (!insertError && turn) {
      let liveCapture = null;

      let liveCaptureSkipped:
        string | null =
          null;

      if (hasClarificationLink) {
        /*
         * This Founder turn belongs to a dedicated clarification
         * workflow. Do not let generic Meeting Live Capture
         * independently reinterpret the same clarification into
         * another task, decision or discussion item.
         */
        liveCaptureSkipped =
          "founder_clarification";
      } else {
        try {
          liveCapture =
            await captureAndPersistMeetingLiveOperations({
              meetingId,
              meetingTitle:
                meeting.title ||
                "Tetamo AI Team Meeting",
              sourceTurnId:
                (
                  turn as unknown as {
                    id: string;
                  }
                ).id,
              founderUserId:
                auth.admin.userId,
            });
        } catch (captureError) {
          /*
           * Live Capture must never break the meeting.
           * The Founder turn has already been stored safely.
           */
          console.error(
            "AI Team Meeting Live Capture failed:",
            captureError
          );
        }
      }

      return Response.json(
        {
          ok: true,
          turn,
          liveCapture,
          liveCaptureSkipped,
        },
        { status: 201 }
      );
    }

    lastInsertError = insertError;

    if (
      insertError?.code ===
        "23505" &&
      hasClarificationLink
    ) {
      /*
       * After the clarification uniqueness index is active,
       * a concurrent double-submit can lose the insert race.
       *
       * Recover by returning the already-persisted exact
       * clarification turn. If none exists, this was probably
       * the ordinary meeting turn-order uniqueness race and
       * the loop may safely retry.
       */
      const {
        turn:
          racedClarificationTurn,
        error:
          racedClarificationError,
      } =
        await loadExistingFounderClarificationTurn();

      if (racedClarificationError) {
        console.error(
          "Founder clarification race recovery failed:",
          racedClarificationError
        );

        return Response.json(
          {
            ok: false,
            error:
              "Unable to recover Founder clarification turn.",
          },
          { status: 500 }
        );
      }

      if (racedClarificationTurn) {
        return Response.json(
          {
            ok: true,

            turn:
              racedClarificationTurn,

            liveCapture:
              null,

            liveCaptureSkipped:
              "founder_clarification",

            alreadySaved:
              true,
          },
          { status: 200 }
        );
      }
    }

    if (insertError?.code !== "23505") {
      break;
    }
  }

  console.error(
    "AI Team meeting turn creation failed:",
    lastInsertError
  );

  return Response.json(
    {
      ok: false,
      error:
        "Unable to save meeting turn.",
    },
    { status: 500 }
  );
}