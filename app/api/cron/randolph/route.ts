import {
  requireTetamoAdminOrCron,
} from "@/lib/ai-team/core/admin-auth";

import {
  runRandolphSystemWatchdog,
} from "@/lib/ai-team/agents/randolph-system-watchdog";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

export async function GET(
  req: Request
) {
  const auth =
    await requireTetamoAdminOrCron(
      req
    );

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const baseUrl =
      new URL(
        req.url
      ).origin;

    const result =
      await runRandolphSystemWatchdog({
        baseUrl,
      });

    return Response.json({
      ok: true,

      scheduler:
        "randolph_system_watchdog",

      result,
    });
  } catch (error) {
    console.error(
      "Randolph system watchdog cron failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof
            Error
            ? error.message
            : "Randolph system watchdog cron failed.",
      },
      {
        status: 500,
      }
    );
  }
}
