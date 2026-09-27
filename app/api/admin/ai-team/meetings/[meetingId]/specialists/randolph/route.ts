import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  generateRandolphMeetingReply,
} from "@/lib/ai-team/agents/randolph-meeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    meetingId: string;
  }>;
};

export async function POST(
  req: Request,
  context: RouteContext
) {
  const auth =
    await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const { meetingId } =
    await context.params;

  let body: {
    triggerTurnId?: unknown;
  };

  try {
    body = await req.json();
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

  const triggerTurnId =
    typeof body.triggerTurnId ===
    "string"
      ? body.triggerTurnId.trim()
      : "";

  if (!triggerTurnId) {
    return Response.json(
      {
        ok: false,
        error:
          "A triggering meeting turn is required.",
      },
      { status: 400 }
    );
  }

  const {
    data: meeting,
    error: meetingError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meetings")
    .select(
      "id, title, status"
    )
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    console.error(
      "Randolph meeting lookup failed:",
      meetingError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load meeting.",
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

  if (
    meeting.status !==
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

  const {
    data: turns,
    error: turnsError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meeting_turns")
    .select(
      "id, turn_order, speaker_type, speaker_name_snapshot, speaker_role_snapshot, content"
    )
    .eq(
      "meeting_id",
      meetingId
    )
    .order("turn_order", {
      ascending: true,
    })
    .limit(500);

  if (turnsError) {
    console.error(
      "Randolph meeting turn lookup failed:",
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

  const meetingTurns =
    turns ?? [];

  const triggerTurn =
    meetingTurns.find(
      (turn) =>
        turn.id ===
        triggerTurnId
    ) ?? null;

  if (!triggerTurn) {
    return Response.json(
      {
        ok: false,
        error:
          "Trigger turn was not found in this meeting.",
      },
      { status: 404 }
    );
  }

  const latestFounderTurn =
    [...meetingTurns]
      .reverse()
      .find(
        (turn) =>
          turn.speaker_type ===
          "user"
      ) ?? null;

  if (!latestFounderTurn) {
    return Response.json(
      {
        ok: false,
        error:
          "No Founder turn is available for the specialist to answer.",
      },
      { status: 409 }
    );
  }

  const latestTurn =
    meetingTurns[
      meetingTurns.length - 1
    ] ?? null;

  if (
    !latestTurn ||
    latestTurn.id !==
      triggerTurnId
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Trigger turn is no longer the latest meeting turn.",
      },
      { status: 409 }
    );
  }

  const {
    data: randolphRecord,
    error: randolphError,
  } = await aiTeamSupabaseAdmin
    .from("ai_agents")
    .select(
      "id, agent_key, display_name, role_title"
    )
    .eq(
      "agent_key",
      "randolph"
    )
    .maybeSingle();

  if (randolphError) {
    console.error(
      "Randolph agent lookup failed:",
      randolphError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load Randolph's AI Team profile.",
      },
      { status: 500 }
    );
  }

  if (!randolphRecord) {
    return Response.json(
      {
        ok: false,
        error:
          "Randolph is not configured in the AI Team.",
      },
      { status: 500 }
    );
  }

  try {
    const randolphResult =
      await generateRandolphMeetingReply({
        question:
          latestFounderTurn.content,

        recentTurns:
          meetingTurns
            .slice(-20)
            .map((turn) => ({
              turnOrder:
                turn.turn_order,

              speakerName:
                turn.speaker_name_snapshot,

              speakerRole:
                turn.speaker_role_snapshot,

              content:
                turn.content,
            })),
      });

    let savedTurn = null;

    let lastInsertError: {
      code?: string;
      message?: string;
    } | null = null;

    for (
      let attempt = 0;
      attempt < 3;
      attempt += 1
    ) {
      const {
        data:
          latestStoredTurn,
        error:
          latestStoredTurnError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_meeting_turns"
          )
          .select(
            "id, turn_order"
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
          .limit(1)
          .maybeSingle();

      if (
        latestStoredTurnError
      ) {
        throw latestStoredTurnError;
      }

      if (
        latestStoredTurn?.id !==
        triggerTurnId
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "Meeting advanced before Randolph could save his reply.",
          },
          { status: 409 }
        );
      }

      const nextTurnOrder =
        (
          latestStoredTurn.turn_order ??
          0
        ) + 1;

      const {
        data: insertedTurn,
        error: insertError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_meeting_turns"
          )
          .insert({
            meeting_id:
              meetingId,

            turn_order:
              nextTurnOrder,

            speaker_type:
              "agent",

            spoken_by_agent_id:
              randolphRecord.id,

            spoken_by_user_id:
              null,

            speaker_name_snapshot:
              randolphRecord.display_name,

            speaker_role_snapshot:
              randolphRecord.role_title,

            input_source:
              "text",

            presence_state:
              "speaking",

            content:
              randolphResult.reply,

            reply_to_turn_id:
              triggerTurnId,

            metadata: {
              generated_by:
                "randolph_meeting_adapter",

              reply_source:
                randolphResult.source,
            },
          })
          .select(
            "id, meeting_id, turn_order, speaker_type, spoken_by_agent_id, spoken_by_user_id, speaker_name_snapshot, speaker_role_snapshot, input_source, presence_state, content, reply_to_turn_id, spoken_at, created_at"
          )
          .single();

      if (
        !insertError &&
        insertedTurn
      ) {
        savedTurn =
          insertedTurn;
        break;
      }

      lastInsertError =
        insertError;

      if (
        insertError?.code !==
        "23505"
      ) {
        break;
      }
    }

    if (!savedTurn) {
      console.error(
        "Randolph meeting reply insert failed:",
        lastInsertError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to save Randolph's meeting reply.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      savedTurn,
      source:
        randolphResult.source,
    });
  } catch (error) {
    console.error(
      "Randolph meeting reply failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Randolph could not respond.",
      },
      { status: 500 }
    );
  }
}
