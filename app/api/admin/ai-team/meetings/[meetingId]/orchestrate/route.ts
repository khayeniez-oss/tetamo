import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  generateJakeMeetingDecision,
  type JakeMeetingTurn,
  type JakeMeetingAgent,
} from "@/lib/ai-team/agents/jake";

import {
  isAIAgentKey,
} from "@/lib/ai-team/permissions/agent-permissions";

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
  } = {};

  try {
    body = await req.json();
  } catch {
    // Body may be empty for manual testing.
  }

  const triggerTurnId =
    typeof body.triggerTurnId === "string"
      ? body.triggerTurnId.trim()
      : "";

  const {
    data: meeting,
    error: meetingError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meetings")
    .select(
      "id, title, status, chaired_by_agent_id"
    )
    .eq("id", meetingId)
    .maybeSingle();

  if (meetingError) {
    console.error(
      "AI Team orchestration meeting lookup failed:",
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
    data: rawTurns,
    error: turnsError,
  } = await aiTeamSupabaseAdmin
    .from("ai_meeting_turns")
    .select(
      "id, turn_order, speaker_type, spoken_by_agent_id, speaker_name_snapshot, speaker_role_snapshot, content"
    )
    .eq("meeting_id", meetingId)
    .order("turn_order", {
      ascending: true,
    })
    .limit(500);

  if (turnsError) {
    console.error(
      "AI Team orchestration turn lookup failed:",
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

  const turns = rawTurns ?? [];

  if (turns.length === 0) {
    return Response.json(
      {
        ok: false,
        error:
          "There is no meeting conversation to orchestrate yet.",
      },
      { status: 409 }
    );
  }

  if (triggerTurnId) {
    const triggerTurn =
      turns.find(
        (turn) => turn.id === triggerTurnId
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
      turns[turns.length - 1];

    if (latestTurn.id !== triggerTurnId) {
      return Response.json(
        {
          ok: false,
          error:
            "Trigger turn is no longer the latest meeting turn.",
        },
        { status: 409 }
      );
    }
  }

  const {
    data: rawAgents,
    error: agentsError,
  } = await aiTeamSupabaseAdmin
    .from("ai_agents")
    .select(
      "id, agent_key, display_name, role_title, status, enabled"
    );

  if (agentsError) {
    console.error(
      "AI Team orchestration agent lookup failed:",
      agentsError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI Team roster.",
      },
      { status: 500 }
    );
  }

  /*
   * Only active + enabled AI staff may participate in
   * live orchestration.
   */
  const activeAgentRows =
    (rawAgents ?? []).filter(
      (agent) =>
        isAIAgentKey(
          agent.agent_key
        ) &&
        agent.enabled ===
          true &&
        agent.status ===
          "active"
    );

  /*
   * For one Founder turn, each specialist may speak at most
   * once. This is enforced here, not merely requested in the
   * model prompt.
   */
  const latestFounderTurn =
    [...turns]
      .reverse()
      .find(
        (turn) =>
          turn.speaker_type ===
          "user"
      ) ?? null;

  const spokenAgentIdsSinceFounder =
    new Set(
      turns
        .filter(
          (turn) =>
            Boolean(
              latestFounderTurn
            ) &&
            turn.turn_order >
              latestFounderTurn!.turn_order &&
            turn.speaker_type ===
              "agent" &&
            Boolean(
              turn.spoken_by_agent_id
            )
        )
        .map(
          (turn) =>
            String(
              turn.spoken_by_agent_id
            )
        )
    );

  const eligibleAgentRows =
    activeAgentRows.filter(
      (agent) =>
        agent.agent_key ===
          "jake" ||
        !spokenAgentIdsSinceFounder.has(
          String(
            agent.id
          )
        )
    );

  const agents: JakeMeetingAgent[] =
    eligibleAgentRows
      .map((agent) => ({
        agentKey:
          agent.agent_key,
        displayName:
          agent.display_name,
        roleTitle:
          agent.role_title,
      }));

  const jakeRecord =
    activeAgentRows.find(
      (agent) =>
        agent.agent_key ===
        "jake"
    ) ?? null;

  if (!jakeRecord) {
    return Response.json(
      {
        ok: false,
        error:
          "Jake must be active and enabled before he can orchestrate the Meeting Room.",
      },
      { status: 500 }
    );
  }

  const recentTurns: JakeMeetingTurn[] =
    turns.slice(-30).map((turn) => ({
      turnOrder: turn.turn_order,
      speakerName:
        turn.speaker_name_snapshot,
      speakerRole:
        turn.speaker_role_snapshot,
      speakerType: turn.speaker_type,
      content: turn.content,
    }));

  try {
    const decision =
      await generateJakeMeetingDecision({
        meetingTitle: meeting.title,
        recentTurns,
        agents,
      });

    let savedTurn = null;

    if (
      decision.action === "speak" &&
      decision.reply
    ) {
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
          .eq("meeting_id", meetingId)
          .order("turn_order", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

        if (latestStoredTurnError) {
          throw latestStoredTurnError;
        }

        if (
          triggerTurnId &&
          latestStoredTurn?.id !== triggerTurnId
        ) {
          return Response.json(
            {
              ok: false,
              error:
                "Meeting advanced before Jake could save his reply.",
            },
            { status: 409 }
          );
        }

        const nextTurnOrder =
          (latestStoredTurn?.turn_order ?? 0) + 1;

        const {
          data: insertedTurn,
          error: insertError,
        } = await aiTeamSupabaseAdmin
          .from("ai_meeting_turns")
          .insert({
            meeting_id: meetingId,
            turn_order: nextTurnOrder,
            speaker_type: "agent",
            spoken_by_agent_id:
              jakeRecord.id,
            spoken_by_user_id: null,
            speaker_name_snapshot:
              jakeRecord.display_name,
            speaker_role_snapshot:
              jakeRecord.role_title,
            input_source: "text",
            presence_state: "speaking",
            content: decision.reply,
            reply_to_turn_id:
              triggerTurnId || null,
            metadata: {
              generated_by:
                "jake_meeting_orchestrator",
            },
          })
          .select(
            "id, meeting_id, turn_order, speaker_type, spoken_by_agent_id, spoken_by_user_id, speaker_name_snapshot, speaker_role_snapshot, input_source, presence_state, content, reply_to_turn_id, spoken_at, created_at"
          )
          .single();

        if (!insertError && insertedTurn) {
          savedTurn = insertedTurn;
          break;
        }

        lastInsertError = insertError;

        if (insertError?.code !== "23505") {
          break;
        }
      }

      if (!savedTurn) {
        console.error(
          "Jake meeting turn creation failed:",
          lastInsertError
        );

        return Response.json(
          {
            ok: false,
            error:
              "Jake made a decision but his meeting reply could not be saved.",
          },
          { status: 500 }
        );
      }
    }

    return Response.json({
      ok: true,
      meetingId,
      triggerTurnId:
        triggerTurnId || null,
      decision,
      savedTurn,
    });
  } catch (error) {
    console.error(
      "Jake meeting orchestration failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Jake was unable to make a meeting decision.",
      },
      { status: 500 }
    );
  }
}