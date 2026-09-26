import {
  requireTetamoAdminOrCron,
} from "@/lib/ai-team/core/admin-auth";

import {
  intakeLolaHandoffWithRupert,
} from "@/lib/ai-team/agents/rupert-handoff-intake";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;


function isUuid(
  value: unknown
): value is string {
  return (
    typeof value ===
      "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
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
    return Response.json(
      {
        ok: false,

        error:
          "JSON request body is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isUuid(
      body.handoffId
    )
  ) {
    return Response.json(
      {
        ok: false,

        error:
          "A valid handoffId UUID is required.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const result =
      await intakeLolaHandoffWithRupert({
        handoffId:
          body
            .handoffId
            .trim(),

        actorUserId:
          auth.admin.userId,
      });

    return Response.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error(
      "Rupert handoff intake failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof
            Error
            ? error.message
            : "Rupert handoff intake failed.",
      },
      {
        status: 500,
      }
    );
  }
}
