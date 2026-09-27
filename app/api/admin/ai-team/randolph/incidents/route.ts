import {
  aiTeamSupabaseAdmin,
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

const SEVERITIES = [
  "info",
  "warning",
  "high",
  "critical",
] as const;

const STATUSES = [
  "open",
  "investigating",
  "awaiting_approval",
  "mitigating",
  "monitoring",
  "resolved",
  "closed",
] as const;

const CONFIDENCE = [
  "confirmed",
  "probable",
  "possible",
  "unknown",
] as const;

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function isOneOf<
  T extends readonly string[]
>(
  value: string,
  options: T
): value is T[number] {
  return options.includes(
    value as T[number]
  );
}

async function getRandolph() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, agent_key, display_name, role_title, status, enabled"
      )
      .eq(
        "agent_key",
        "randolph"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Randolph is not configured in the AI Team."
    );
  }

  return data;
}

export async function GET(
  req: Request
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    requireAgentPermission(
      "randolph",
      "read_system_data"
    );

    const randolph =
      await getRandolph();

    const [
      incidentsResult,
      tasksResult,
      activityResult,
      healthResult,
    ] =
      await Promise.all([
        aiTeamSupabaseAdmin
          .from(
            "ai_incidents"
          )
          .select(
            [
              "id",
              "detected_by_agent_id",
              "title",
              "description",
              "surface",
              "platform",
              "severity",
              "status",
              "confidence",
              "impact_summary",
              "probable_cause",
              "evidence",
              "recommended_action",
              "related_task_id",
              "related_approval_id",
              "related_entity_type",
              "related_entity_id",
              "detected_at",
              "acknowledged_at",
              "resolved_at",
              "resolution_summary",
              "postmortem",
              "metadata",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .order(
            "detected_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            200
          ),

        aiTeamSupabaseAdmin
          .from(
            "ai_tasks"
          )
          .select(
            [
              "id",
              "title",
              "description",
              "priority",
              "status",
              "source_type",
              "source_id",
              "expected_outcome",
              "result_summary",
              "requires_approval",
              "due_at",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .eq(
            "assigned_to_agent_id",
            randolph.id
          )
          .order(
            "updated_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            100
          ),

        aiTeamSupabaseAdmin
          .from(
            "ai_activity"
          )
          .select(
            [
              "id",
              "event_type",
              "action",
              "entity_type",
              "entity_id",
              "task_id",
              "severity",
              "details",
              "created_at",
            ].join(",")
          )
          .eq(
            "agent_id",
            randolph.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            100
          ),

        aiTeamSupabaseAdmin
          .from(
            "ai_system_health"
          )
          .select(
            [
              "check_key",
              "display_name",
              "category",
              "check_type",
              "status",
              "severity_on_failure",
              "message",
              "latency_ms",
              "consecutive_failures",
              "last_checked_at",
              "last_success_at",
              "last_failure_at",
              "failure_started_at",
              "last_recovered_at",
              "evidence",
              "metadata",
              "created_at",
              "updated_at",
            ].join(",")
          )
          .order(
            "display_name",
            {
              ascending:
                true,
            }
          ),
      ]);

    if (
      incidentsResult.error
    ) {
      throw incidentsResult.error;
    }

    if (
      tasksResult.error
    ) {
      throw tasksResult.error;
    }

    if (
      activityResult.error
    ) {
      throw activityResult.error;
    }

    if (
      healthResult.error
    ) {
      throw healthResult.error;
    }

    return Response.json({
      ok: true,

      randolph,

      incidents:
        incidentsResult.data ??
        [],

      tasks:
        tasksResult.data ??
        [],

      activity:
        activityResult.data ??
        [],

      health:
        healthResult.data ??
        [],

      generatedAt:
        new Date()
          .toISOString(),
    });
  } catch (error) {
    console.error(
      "Randolph incident desk load failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to load Randolph incident desk.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  req: Request
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    requireAgentPermission(
      "randolph",
      "record_incident"
    );

    let body:
      Record<
        string,
        unknown
      >;

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
        {
          status: 400,
        }
      );
    }

    const title =
      cleanString(
        body.title
      );

    const description =
      cleanString(
        body.description
      );

    const surface =
      cleanString(
        body.surface
      );

    const platform =
      cleanString(
        body.platform
      );

    const severity =
      cleanString(
        body.severity
      ) ||
      "warning";

    const status =
      cleanString(
        body.status
      ) ||
      "open";

    const confidence =
      cleanString(
        body.confidence
      ) ||
      "unknown";

    const impactSummary =
      cleanString(
        body.impactSummary
      );

    const probableCause =
      cleanString(
        body.probableCause
      );

    const recommendedAction =
      cleanString(
        body.recommendedAction
      );

    if (!title) {
      return Response.json(
        {
          ok: false,
          error:
            "Incident title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!surface) {
      return Response.json(
        {
          ok: false,
          error:
            "Incident surface is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isOneOf(
        severity,
        SEVERITIES
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid incident severity.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isOneOf(
        status,
        STATUSES
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid incident status.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isOneOf(
        confidence,
        CONFIDENCE
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid incident confidence.",
        },
        {
          status: 400,
        }
      );
    }

    const randolph =
      await getRandolph();

    const detectedAt =
      new Date()
        .toISOString();

    const {
      data: incident,
      error: incidentError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_incidents"
        )
        .insert({
          detected_by_agent_id:
            randolph.id,

          title,

          description:
            description ||
            null,

          surface,

          platform:
            platform ||
            null,

          severity,

          status,

          confidence,

          impact_summary:
            impactSummary ||
            null,

          probable_cause:
            probableCause ||
            null,

          evidence:
            [],

          recommended_action:
            recommendedAction ||
            null,

          detected_at:
            detectedAt,

          acknowledged_at:
            status !==
              "open"
              ? detectedAt
              : null,

          metadata: {
            source:
              "founder_admin_entry",

            recorded_by:
              "admin",

            safety_note:
              "Incident registration does not authorize production changes.",
          },
        })
        .select(
          [
            "id",
            "title",
            "description",
            "surface",
            "platform",
            "severity",
            "status",
            "confidence",
            "impact_summary",
            "probable_cause",
            "evidence",
            "recommended_action",
            "detected_at",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .single();

    if (
      incidentError ||
      !incident
    ) {
      throw (
        incidentError ??
        new Error(
          "Incident could not be created."
        )
      );
    }

    const savedIncident =
      incident as unknown as {
        id: string;
        [key: string]: unknown;
      };

    const {
      error: activityError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_activity"
        )
        .insert({
          agent_id:
            randolph.id,

          actor_user_id:
            auth.admin.userId,

          event_type:
            "system_incident",

          action:
            "incident_recorded",

          entity_type:
            "ai_incident",

          entity_id:
            savedIncident.id,

          severity,

          details: {
            title,
            surface,
            platform:
              platform ||
              null,
            status,
            confidence,

            safety_note:
              "Recording an incident does not mean Randolph has verified the cause or executed a fix.",
          },
        });

    if (
      activityError
    ) {
      console.error(
        "Randolph incident audit log failed:",
        activityError
      );
    }

    return Response.json(
      {
        ok: true,
        incident:
          savedIncident,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Randolph incident creation failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to create Randolph incident.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(
  req: Request
) {
  const auth =
    await requireTetamoAdmin(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    requireAgentPermission(
      "randolph",
      "diagnose_system_issue"
    );

    let body: {
      incidentId?: unknown;
      status?: unknown;
      confidence?: unknown;
      probableCause?: unknown;
      recommendedAction?: unknown;
      resolutionSummary?: unknown;
    };

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
        {
          status: 400,
        }
      );
    }

    const incidentId =
      cleanString(
        body.incidentId
      );

    const status =
      cleanString(
        body.status
      );

    if (!incidentId) {
      return Response.json(
        {
          ok: false,
          error:
            "Incident ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !status ||
      !isOneOf(
        status,
        STATUSES
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "A valid incident status is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: existingIncidentRaw,
      error: existingError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_incidents"
        )
        .select(
          "id, title, severity, status, confidence, acknowledged_at, resolved_at"
        )
        .eq(
          "id",
          incidentId
        )
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingIncidentRaw) {
      return Response.json(
        {
          ok: false,
          error:
            "Incident not found.",
        },
        {
          status: 404,
        }
      );
    }

    const existingIncident =
      existingIncidentRaw as unknown as {
        id: string;
        title: string;
        severity: string;
        status: string;
        confidence: string;
        acknowledged_at:
          string | null;
        resolved_at:
          string | null;
      };

    let confidence =
      existingIncident.confidence;

    if (
      body.confidence !==
      undefined
    ) {
      const requestedConfidence =
        cleanString(
          body.confidence
        );

      if (
        !requestedConfidence ||
        !isOneOf(
          requestedConfidence,
          CONFIDENCE
        )
      ) {
        return Response.json(
          {
            ok: false,
            error:
              "Invalid incident confidence.",
          },
          {
            status: 400,
          }
        );
      }

      confidence =
        requestedConfidence;
    }

    const probableCause =
      body.probableCause ===
      undefined
        ? undefined
        : cleanString(
            body.probableCause
          );

    const recommendedAction =
      body.recommendedAction ===
      undefined
        ? undefined
        : cleanString(
            body.recommendedAction
          );

    const resolutionSummary =
      cleanString(
        body.resolutionSummary
      );

    const isResolved =
      status ===
        "resolved" ||
      status ===
        "closed";

    if (
      isResolved &&
      !resolutionSummary
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "A resolution summary is required before resolving an incident.",
        },
        {
          status: 400,
        }
      );
    }

    const now =
      new Date()
        .toISOString();

    const updatePayload:
      Record<
        string,
        unknown
      > = {
        status,
        confidence,

        acknowledged_at:
          existingIncident
            .acknowledged_at ??
          (
            status !==
            "open"
              ? now
              : null
          ),
      };

    if (
      probableCause !==
      undefined
    ) {
      updatePayload.probable_cause =
        probableCause ||
        null;
    }

    if (
      recommendedAction !==
      undefined
    ) {
      updatePayload.recommended_action =
        recommendedAction ||
        null;
    }

    if (isResolved) {
      updatePayload.resolved_at =
        now;

      updatePayload.resolution_summary =
        resolutionSummary;
    } else if (
      existingIncident
        .resolved_at
    ) {
      updatePayload.resolved_at =
        null;

      updatePayload.resolution_summary =
        null;
    }

    const {
      data: updatedIncidentRaw,
      error: updateError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_incidents"
        )
        .update(
          updatePayload
        )
        .eq(
          "id",
          incidentId
        )
        .select(
          "id, title, description, surface, platform, severity, status, confidence, impact_summary, probable_cause, evidence, recommended_action, related_task_id, related_approval_id, detected_at, acknowledged_at, resolved_at, resolution_summary, created_at, updated_at"
        )
        .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updatedIncidentRaw) {
      return Response.json(
        {
          ok: false,
          error:
            "Incident state changed before it could be updated.",
        },
        {
          status: 409,
        }
      );
    }

    const updatedIncident =
      updatedIncidentRaw as unknown as {
        id: string;
        [key: string]: unknown;
      };

    const randolph =
      await getRandolph();

    const action =
      isResolved
        ? "incident_resolved"
        : status ===
            "investigating"
          ? "incident_investigation_started"
          : "incident_status_updated";

    const {
      error: activityError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_activity"
        )
        .insert({
          agent_id:
            randolph.id,

          actor_user_id:
            auth.admin.userId,

          event_type:
            "system_incident",

          action,

          entity_type:
            "ai_incident",

          entity_id:
            incidentId,

          severity:
            existingIncident
              .severity,

          details: {
            title:
              existingIncident
                .title,

            previous_status:
              existingIncident
                .status,

            new_status:
              status,

            confidence,

            resolution_summary:
              isResolved
                ? resolutionSummary
                : null,

            safety_note:
              "Incident status updates do not represent or authorize production deployment, database modification, secret rotation or other restricted technical actions.",
          },
        });

    if (
      activityError
    ) {
      console.error(
        "Randolph incident update audit log failed:",
        activityError
      );
    }

    return Response.json({
      ok: true,
      incident:
        updatedIncident,
    });
  } catch (error) {
    console.error(
      "Randolph incident update failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof
            Error
            ? error.message
            : "Unable to update Randolph incident.",
      },
      {
        status: 500,
      }
    );
  }
}
