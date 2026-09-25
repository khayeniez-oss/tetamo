import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEETING_TYPES = [
  "weekly_executive",
  "founder_coo_strategy",
  "incident",
  "special",
  "ad_hoc",
] as const;

type MeetingType =
  (typeof VALID_MEETING_TYPES)[number];

function isMeetingType(
  value: unknown
): value is MeetingType {
  return (
    typeof value === "string" &&
    VALID_MEETING_TYPES.includes(
      value as MeetingType
    )
  );
}

export async function GET(req: Request) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  const { data: meetings, error } =
    await aiTeamSupabaseAdmin
      .from("ai_meetings")
      .select(
        [
          "id",
          "meeting_type",
          "title",
          "status",
          "scheduled_for",
          "started_at",
          "completed_at",
          "chaired_by_agent_id",
          "created_by_user_id",
          "agenda",
          "attendees",
          "summary",
          "decisions_summary",
          "action_items_summary",
          "previous_meeting_id",
          "created_at",
          "updated_at",
        ].join(",")
      )
      .order("scheduled_for", {
        ascending: false,
      })
      .limit(25);

  if (error) {
    console.error(
      "AI Team meetings fetch failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI Team meetings.",
      },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    meetings: meetings ?? [],
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const auth = await requireTetamoAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  let body: {
    meetingType?: unknown;
    title?: unknown;
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

  const meetingType =
    body.meetingType ?? "ad_hoc";

  if (!isMeetingType(meetingType)) {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid meeting type.",
      },
      { status: 400 }
    );
  }

  const requestedTitle =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const defaultTitles: Record<
    MeetingType,
    string
  > = {
    weekly_executive:
      "Tetamo AI Weekly Executive Meeting",
    founder_coo_strategy:
      "Founder / COO Strategy Review",
    incident:
      "AI Team Incident Meeting",
    special:
      "AI Team Special Meeting",
    ad_hoc:
      "AI Team Ad Hoc Meeting",
  };

  const title =
    requestedTitle ||
    defaultTitles[meetingType];

  const {
    data: agents,
    error: agentsError,
  } = await aiTeamSupabaseAdmin
    .from("ai_agents")
    .select(
      "id, agent_key, display_name, role_title, status, enabled"
    )
    .order("display_name", {
      ascending: true,
    });

  if (agentsError) {
    console.error(
      "AI Team meeting agent lookup failed:",
      agentsError
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to prepare meeting participants.",
      },
      { status: 500 }
    );
  }

  const jake =
    agents?.find(
      (agent) =>
        agent.agent_key === "jake"
    ) ?? null;

  if (!jake) {
    return Response.json(
      {
        ok: false,
        error:
          "Jake is not configured in the AI Team.",
      },
      { status: 500 }
    );
  }

  const now = new Date().toISOString();

  const attendees = [
    {
      participant_type: "user",
      user_id: auth.admin.userId,
      name: "Khaye",
      role: "Founder / CEO",
    },
    {
      participant_type: "advisor",
      name: "KooT",
      role: "Strategic Adviser to Founder",
    },
    ...(agents ?? []).map(
      (agent) => ({
        participant_type: "agent",
        agent_id: agent.id,
        agent_key: agent.agent_key,
        name: agent.display_name,
        role: agent.role_title,
        status: agent.status,
        enabled: agent.enabled,
      })
    ),
  ];

  const { data: meeting, error } =
    await aiTeamSupabaseAdmin
      .from("ai_meetings")
      .insert({
        meeting_type: meetingType,
        title,
        status: "in_progress",
        scheduled_for: now,
        started_at: now,
        chaired_by_agent_id: jake.id,
        created_by_user_id:
          auth.admin.userId,
        attendees,
        agenda: [],
        metadata: {
          started_from:
            "admin_ai_team_meeting_room",
        },
      })
      .select(
        [
          "id",
          "meeting_type",
          "title",
          "status",
          "scheduled_for",
          "started_at",
          "chaired_by_agent_id",
          "created_by_user_id",
          "attendees",
          "created_at",
        ].join(",")
      )
      .single();

  if (error) {
    console.error(
      "AI Team meeting creation failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to start AI Team meeting.",
      },
      { status: 500 }
    );
  }

  return Response.json(
    {
      ok: true,
      meeting,
    },
    { status: 201 }
  );
}