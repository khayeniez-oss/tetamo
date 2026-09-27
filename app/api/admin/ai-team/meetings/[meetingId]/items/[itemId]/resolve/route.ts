import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    meetingId: string;
    itemId: string;
  }>;
};

type ResolveRequest = {
  taskId?: unknown;
  founderTurnId?: unknown;
};

type JsonRecord =
  Record<string, unknown>;

function cleanString(
  value: unknown
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function asRecord(
  value: unknown
): JsonRecord {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export async function POST(
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
    itemId,
  } = await context.params;

  let body: ResolveRequest;

  try {
    body =
      await req.json();
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

  const taskId =
    cleanString(
      body.taskId
    );

  const founderTurnId =
    cleanString(
      body.founderTurnId
    );

  if (
    !taskId ||
    !founderTurnId
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Task ID and Founder clarification turn ID are required.",
      },
      { status: 400 }
    );
  }

  /*
   * The browser supplies identifiers only.
   *
   * The service-role RPC performs the authoritative
   * database validation and atomic transition.
   * Clarification text is NEVER accepted from this
   * endpoint; the RPC reads it from the already-saved
   * linked Founder meeting turn.
   */
  const {
    data: resolution,
    error: resolutionError,
  } =
    await aiTeamSupabaseAdmin.rpc(
      "resolve_ai_founder_clarification",
      {
        p_meeting_id:
          meetingId,

        p_meeting_item_id:
          itemId,

        p_task_id:
          taskId,

        p_founder_turn_id:
          founderTurnId,

        p_actor_user_id:
          auth.admin.userId,
      }
    );

  if (!resolutionError) {
    return Response.json({
      ok: true,
      resolution,
      alreadyResolved:
        false,
    });
  }

  /*
   * A network/response interruption can theoretically
   * occur after PostgreSQL committed the RPC.
   *
   * Before reporting failure, verify whether this exact
   * Founder turn already produced the intended state.
   * This makes the HTTP endpoint safely retryable without
   * creating another Founder clarification turn.
   */
  const [
    itemResult,
    taskResult,
    turnResult,
  ] = await Promise.all([
    aiTeamSupabaseAdmin
      .from(
        "ai_meeting_items"
      )
      .select(
        [
          "id",
          "meeting_id",
          "related_task_id",
          "status",
          "metadata",
        ].join(",")
      )
      .eq(
        "id",
        itemId
      )
      .eq(
        "meeting_id",
        meetingId
      )
      .maybeSingle(),

    aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
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
        taskId
      )
      .maybeSingle(),

    aiTeamSupabaseAdmin
      .from(
        "ai_meeting_turns"
      )
      .select(
        [
          "id",
          "meeting_id",
          "speaker_type",
          "spoken_by_user_id",
          "related_meeting_item_id",
          "related_task_id",
          "metadata",
        ].join(",")
      )
      .eq(
        "id",
        founderTurnId
      )
      .eq(
        "meeting_id",
        meetingId
      )
      .maybeSingle(),
  ]);

  if (
    itemResult.error ||
    taskResult.error ||
    turnResult.error
  ) {
    console.error(
      "Founder clarification recovery verification failed:",
      {
        itemError:
          itemResult.error,
        taskError:
          taskResult.error,
        turnError:
          turnResult.error,
      }
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to verify Founder clarification resolution.",
      },
      { status: 500 }
    );
  }

  const item =
    itemResult.data as
      | {
          id: string;
          meeting_id: string;
          related_task_id:
            | string
            | null;
          status: string;
          metadata:
            | JsonRecord
            | null;
        }
      | null;

  const task =
    taskResult.data as
      | {
          id: string;
          status: string;
          source_type:
            | string
            | null;
          metadata:
            | JsonRecord
            | null;
        }
      | null;

  const turn =
    turnResult.data as
      | {
          id: string;
          meeting_id: string;
          speaker_type: string;
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
            | JsonRecord
            | null;
        }
      | null;

  const itemMetadata =
    asRecord(
      item?.metadata
    );

  const taskMetadata =
    asRecord(
      task?.metadata
    );

  const turnMetadata =
    asRecord(
      turn?.metadata
    );

  const alreadyResolved =
    Boolean(
      item &&
      task &&
      turn &&

      item.status ===
        "actioned" &&

      item.related_task_id ===
        taskId &&

      cleanString(
        itemMetadata
          .clarification_turn_id
      ) ===
        founderTurnId &&

      cleanString(
        itemMetadata.source
      ) ===
        "founder_clarification_queue" &&

      cleanString(
        itemMetadata
          .clarification_status
      ) ===
        "resolved" &&

      cleanString(
        itemMetadata
          .resulting_task_status
      ) ===
        "pending" &&

      cleanString(
        itemMetadata
          .resulting_customer_intent_scope
      ) ===
        "founder_clarified" &&

      task.status ===
        "pending" &&

      task.source_type ===
        "rupert_lola_handoff" &&

      cleanString(
        taskMetadata
          .customer_intent_scope
      ).toLowerCase() ===
        "founder_clarified" &&

      cleanString(
        taskMetadata
          .founder_clarification_turn_id
      ) ===
        founderTurnId &&

      cleanString(
        taskMetadata
          .founder_clarification_item_id
      ) ===
        itemId &&

      cleanString(
        taskMetadata
          .founder_clarification_meeting_id
      ) ===
        meetingId &&

      cleanString(
        taskMetadata
          .founder_clarification_actor_user_id
      ) ===
        auth.admin.userId &&

      cleanString(
        taskMetadata
          .founder_clarification_source
      ) ===
        "meeting_room" &&

      taskMetadata
        .content_eligible ===
        false &&

      cleanString(
        taskMetadata
          .content_block_reason
      ) ===
        "founder_clarification_requires_research" &&

      cleanString(
        taskMetadata
          .quality_review_state
      ) ===
        "founder_clarified_pending_research" &&

      cleanString(
        taskMetadata
          .post_research_disposition
      ) ===
        "retry_research_with_founder_clarification" &&

      turn.speaker_type ===
        "user" &&

      turn.spoken_by_user_id ===
        auth.admin.userId &&

      turn.related_meeting_item_id ===
        itemId &&

      turn.related_task_id ===
        taskId &&

      cleanString(
        turnMetadata
          .turn_kind
      ) ===
        "founder_clarification" &&

      cleanString(
        turnMetadata
          .clarification_source
      ) ===
        "founder_clarification_queue"
    );

  if (alreadyResolved) {
    return Response.json({
      ok: true,

      alreadyResolved:
        true,

      resolution: {
        meeting_id:
          meetingId,

        meeting_item_id:
          itemId,

        task_id:
          taskId,

        founder_turn_id:
          founderTurnId,

        meeting_item_status:
          "actioned",

        task_status:
          "pending",

        customer_intent_scope:
          "founder_clarified",
      },
    });
  }

  console.error(
    "Founder clarification resolution failed:",
    resolutionError
  );

  return Response.json(
    {
      ok: false,
      error:
        "Founder clarification could not be resolved safely.",
    },
    {
      status:
        resolutionError.code ===
          "P0001"
          ? 409
          : 500,
    }
  );
}
