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
        metadata: {
          submitted_from:
            "admin_ai_team_meeting_room",
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
          "spoken_at",
          "created_at",
        ].join(",")
      )
      .single();

    if (!insertError && turn) {
      let liveCapture = null;

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

      return Response.json(
        {
          ok: true,
          turn,
          liveCapture,
        },
        { status: 201 }
      );
    }

    lastInsertError = insertError;

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