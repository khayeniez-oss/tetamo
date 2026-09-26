import {
  requireTetamoAdminOrCron,
} from "@/lib/ai-team/core/admin-auth";

import {
  processInquiryIntelligence,
} from "@/lib/ai-team/inquiry-intelligence/processor";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

function positiveInteger(
  value: unknown
) {
  const parsed =
    Number(value);

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : undefined;
}

function sourceMessageIds(
  value: unknown
) {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > 50
  ) {
    throw new Error(
      "sourceMessageIds must be a non-empty array of at most 50 UUIDs."
    );
  }

  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const ids =
    value.map(
      (item) =>
        typeof item === "string"
          ? item.trim()
          : ""
    );

  if (
    ids.some(
      (id) =>
        !uuidPattern.test(
          id
        )
    )
  ) {
    throw new Error(
      "sourceMessageIds contains an invalid UUID."
    );
  }

  return Array.from(
    new Set(
      ids
    )
  );
}

export async function POST(
  req: Request
) {
  const auth =
    await requireTetamoAdminOrCron(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  let body:
    Record<string, unknown> =
      {};

  try {
    body =
      await req.json();
  } catch {
    // Empty body is allowed.
  }

  try {
    const result =
      await processInquiryIntelligence({
        limit:
          positiveInteger(
            body.limit
          ),

        lookbackDays:
          positiveInteger(
            body.lookbackDays
          ),

        sourceMessageIds:
          sourceMessageIds(
            body.sourceMessageIds
          ),

        actorUserId:
          auth.admin.userId,
      });

    return Response.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error(
      "Inquiry intelligence processing failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Inquiry intelligence processing failed.",
      },
      {
        status: 500,
      }
    );
  }
}
