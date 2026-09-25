import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  generateMonaMeetingReply,
} from "@/lib/ai-team/agents/mona-meeting";

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
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const { meetingId } = await context.params;

  let body: {
    triggerTurnId?: unknown;
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

  const triggerTurnId =
    typeof body.triggerTurnId === "string"
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
    .select("id, title, status")
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    console.error(
      "Mona meeting lookup failed:",
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

  const {
    data: turns,
    error: turnsError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meeting_turns")
    .select(
      "id, turn_order, speaker_type, speaker_name_snapshot, speaker_role_snapshot, content"
    )
    .eq("meeting_id", meetingId)
    .order("turn_order", {
      ascending: true,
    })
    .limit(500);

  if (turnsError) {
    console.error(
      "Mona meeting turn lookup failed:",
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

  const meetingTurns = turns ?? [];

  const triggerTurn =
    meetingTurns.find(
      (turn) =>
        turn.id === triggerTurnId
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

  const latestTurn =
    meetingTurns[
      meetingTurns.length - 1
    ] ?? null;

  if (
    !latestTurn ||
    latestTurn.id !== triggerTurnId
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
    data: monaRecord,
    error: monaError,
  } = await aiTeamSupabaseAdmin
    .from("ai_agents")
    .select(
      "id, agent_key, display_name, role_title"
    )
    .eq("agent_key", "mona")
    .maybeSingle();

  if (monaError) {
    console.error(
      "Mona agent lookup failed:",
      monaError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load Mona's AI Team profile.",
      },
      { status: 500 }
    );
  }

  if (!monaRecord) {
    return Response.json(
      {
        ok: false,
        error:
          "Mona is not configured in the AI Team.",
      },
      { status: 500 }
    );
  }

  try {
    const monaResult =
      await generateMonaMeetingReply({
        question:
          triggerTurn.content,

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
        data: latestStoredTurn,
        error: latestStoredTurnError,
      } = await aiTeamSupabaseAdmin
        .from("ai_meeting_turns")
        .select("id, turn_order")
        .eq(
          "meeting_id",
          meetingId
        )
        .order("turn_order", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      if (latestStoredTurnError) {
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
              "Meeting advanced before Mona could save her reply.",
          },
          { status: 409 }
        );
      }

      const nextTurnOrder =
        (latestStoredTurn.turn_order ??
          0) + 1;

      const {
        data: insertedTurn,
        error: insertError,
      } = await aiTeamSupabaseAdmin
        .from("ai_meeting_turns")
        .insert({
          meeting_id:
            meetingId,
          turn_order:
            nextTurnOrder,

          speaker_type:
            "agent",

          spoken_by_agent_id:
            monaRecord.id,

          spoken_by_user_id:
            null,

          speaker_name_snapshot:
            monaRecord.display_name,

          speaker_role_snapshot:
            monaRecord.role_title,

          input_source:
            "text",

          presence_state:
            "speaking",

          content:
            monaResult.reply,

          reply_to_turn_id:
            triggerTurnId,

          metadata: {
            generated_by:
              "mona_meeting_adapter",

            reply_source:
              monaResult.source,

            analytics_generated_at:
              monaResult.analyticsGeneratedAt,

            reporting_timezone:
              monaResult.reportingTimezone,
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
        "Mona meeting turn creation failed:",
        lastInsertError
      );

      return Response.json(
        {
          ok: false,
          error:
            "Mona generated a reply but her meeting turn could not be saved.",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        meetingId,
        triggerTurnId,
        agentKey: "mona",
        savedTurn,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Mona meeting response failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Mona was unable to respond.",
      },
      { status: 500 }
    );
  }
}