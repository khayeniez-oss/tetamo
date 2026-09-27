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

export async function PATCH(
  req: Request,
  context: RouteContext
) {
  const auth =
    await requireTetamoAdmin(req);

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
        "id, meeting_type, title, status, scheduled_for, started_at, completed_at"
      )
      .eq(
        "id",
        meetingId
      )
      .maybeSingle();

  if (meetingError) {
    console.error(
      "AI Team meeting completion lookup failed:",
      meetingError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to verify AI Team meeting.",
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

  /*
   * Ending a meeting is idempotent.
   */
  if (
    meeting.status ===
      "completed"
  ) {
    return Response.json({
      ok: true,
      meeting,
      alreadyCompleted: true,
    });
  }

  if (
    meeting.status !==
      "in_progress"
  ) {
    return Response.json(
      {
        ok: false,
        error:
          `A ${meeting.status} meeting cannot be ended as an active meeting.`,
      },
      { status: 409 }
    );
  }

  /*
   * Never strand an already-saved Founder clarification.
   *
   * Pending clarification items with NO saved Founder turn may
   * safely remain unresolved; the blocked task can be surfaced
   * again in a later meeting.
   *
   * But once the Founder turn has been persisted, its resolver
   * must finish before this meeting can leave in_progress,
   * because the atomic resolver requires an active meeting.
   */
  const {
    data: pendingClarificationItems,
    error: pendingItemsError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_meeting_items"
      )
      .select(
        "id"
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
      .contains(
        "metadata",
        {
          source:
            "founder_clarification_queue",

          requires_founder_clarification:
            true,
        }
      );

  if (pendingItemsError) {
    console.error(
      "AI Team meeting completion clarification lookup failed:",
      pendingItemsError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to verify pending Founder clarifications.",
      },
      { status: 500 }
    );
  }

  const pendingItemIds =
    (
      pendingClarificationItems ??
      []
    ).map(
      (item) => item.id
    );

  if (
    pendingItemIds.length >
      0
  ) {
    const {
      data: savedClarificationTurn,
      error:
        savedClarificationError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_meeting_turns"
        )
        .select(
          "id, related_meeting_item_id"
        )
        .eq(
          "meeting_id",
          meetingId
        )
        .eq(
          "speaker_type",
          "user"
        )
        .in(
          "related_meeting_item_id",
          pendingItemIds
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
        .limit(1)
        .maybeSingle();

    if (savedClarificationError) {
      console.error(
        "AI Team meeting completion saved-clarification lookup failed:",
        savedClarificationError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to verify saved Founder clarification state.",
        },
        { status: 500 }
      );
    }

    if (savedClarificationTurn) {
      return Response.json(
        {
          ok: false,
          error:
            "Resolve the saved Founder clarification before ending this meeting.",
        },
        { status: 409 }
      );
    }
  }

  const completedAt =
    new Date()
      .toISOString();

  const {
    data: completedMeeting,
    error: completionError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_meetings"
      )
      .update({
        status:
          "completed",

        completed_at:
          completedAt,
      })
      .eq(
        "id",
        meetingId
      )
      .eq(
        "status",
        "in_progress"
      )
      .select(
        "id, meeting_type, title, status, scheduled_for, started_at, completed_at"
      )
      .maybeSingle();

  if (completionError) {
    console.error(
      "AI Team meeting completion failed:",
      completionError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to end AI Team meeting.",
      },
      { status: 500 }
    );
  }

  if (!completedMeeting) {
    return Response.json(
      {
        ok: false,
        error:
          "Meeting state changed before it could be ended.",
      },
      { status: 409 }
    );
  }

  return Response.json({
    ok: true,
    meeting:
      completedMeeting,
    alreadyCompleted:
      false,
  });
}
