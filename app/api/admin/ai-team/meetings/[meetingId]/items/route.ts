import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    meetingId: string;
  }>;
};

type FounderClarificationMeetingItem = {
  id: string;
  meeting_id: string;
  item_type: "discussion";
  title: string;
  content: string | null;
  presented_by_agent_id: string | null;
  related_task_id: string;
  status: "pending";
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  saved_founder_turn_id:
    | string
    | null;
};

export async function GET(
  req: Request,
  context: RouteContext
) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const {
    meetingId,
  } = await context.params;

  const {
    data: meeting,
    error: meetingError,
  } =
    await aiTeamSupabaseAdmin
      .from("ai_meetings")
      .select(
        "id, status, title"
      )
      .eq(
        "id",
        meetingId
      )
      .maybeSingle();

  if (meetingError) {
    console.error(
      "AI Team meeting-item meeting lookup failed:",
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
        error:
          "Meeting not found.",
      },
      { status: 404 }
    );
  }

  const currentMeeting =
    meeting as unknown as {
      id: string;
      status: string;
      title: string;
    };

  if (
    currentMeeting.status !==
      "in_progress"
  ) {
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
   * Only expose pending Founder-clarification discussion
   * items created by Jake's executive clarification queue.
   *
   * Do not expose unrelated Meeting Room items through
   * this narrow endpoint.
   */
  const {
    data: rawItems,
    error: itemsError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_meeting_items"
      )
      .select(
        [
          "id",
          "meeting_id",
          "item_type",
          "title",
          "content",
          "presented_by_agent_id",
          "related_task_id",
          "status",
          "sort_order",
          "metadata",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .eq(
        "meeting_id",
        meetingId
      )
      .eq(
        "item_type",
        "discussion"
      )
      .eq(
        "status",
        "pending"
      )
      .not(
        "related_task_id",
        "is",
        null
      )
      .contains(
        "metadata",
        {
          source:
            "founder_clarification_queue",

          requires_founder_clarification:
            true,
        }
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (itemsError) {
    console.error(
      "AI Team Founder clarification items fetch failed:",
      itemsError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load pending Founder clarifications.",
      },
      { status: 500 }
    );
  }

  const baseItems =
    (rawItems ?? []) as unknown as
      Array<
        Omit<
          FounderClarificationMeetingItem,
          "saved_founder_turn_id"
        >
      >;

  /*
   * Reload-safe clarification recovery.
   *
   * A Founder clarification turn can already be safely stored
   * while the atomic resolver is still pending. In that case
   * the Meeting Room must recover the SAME turn ID after a
   * browser refresh instead of inviting the Founder to create
   * another clarification turn.
   */
  const itemIds =
    baseItems.map(
      (item) => item.id
    );

  const savedTurnByItemId =
    new Map<string, string>();

  if (itemIds.length > 0) {
    const {
      data: rawSavedTurns,
      error: savedTurnsError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_meeting_turns"
        )
        .select(
          [
            "id",
            "meeting_id",
            "spoken_by_user_id",
            "related_meeting_item_id",
            "related_task_id",
            "metadata",
            "spoken_at",
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
        .in(
          "related_meeting_item_id",
          itemIds
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
          "spoken_at",
          {
            ascending: true,
          }
        );

    if (savedTurnsError) {
      console.error(
        "AI Team saved Founder clarification turn lookup failed:",
        savedTurnsError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to recover saved Founder clarifications.",
        },
        { status: 500 }
      );
    }

    const savedTurns =
      (rawSavedTurns ?? []) as unknown as
        Array<{
          id: string;
          meeting_id: string;
          spoken_by_user_id:
            | string
            | null;
          related_meeting_item_id:
            | string
            | null;
          related_task_id:
            | string
            | null;
          metadata:
            Record<string, unknown>;
          spoken_at: string;
        }>;

    const taskByItemId =
      new Map(
        baseItems.map(
          (item) => [
            item.id,
            item.related_task_id,
          ]
        )
      );

    for (const turn of savedTurns) {
      const itemId =
        turn.related_meeting_item_id;

      if (!itemId) {
        continue;
      }

      /*
       * Only recover a turn when its linked task still matches
       * the exact pending clarification item.
       */
      if (
        taskByItemId.get(itemId) !==
        turn.related_task_id
      ) {
        continue;
      }

      if (
        !savedTurnByItemId.has(
          itemId
        )
      ) {
        savedTurnByItemId.set(
          itemId,
          turn.id
        );
      }
    }
  }

  const items:
    FounderClarificationMeetingItem[] =
      baseItems.map(
        (item) => ({
          ...item,

          saved_founder_turn_id:
            savedTurnByItemId.get(
              item.id
            ) ?? null,
        })
      );

  return Response.json({
    ok: true,

    meeting: {
      id:
        currentMeeting.id,

      title:
        currentMeeting.title,

      status:
        currentMeeting.status,
    },

    items,

    count:
      items.length,
  });
}
