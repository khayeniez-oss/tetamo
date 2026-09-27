import {
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

import {
  runRandolphSystemWatchdog,
} from "@/lib/ai-team/agents/randolph-system-watchdog";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

function getProductionBaseUrl() {
  const configured =
    String(
      process.env
        .NEXT_PUBLIC_SITE_URL ||
        ""
    )
      .trim()
      .replace(
        /\/+$/,
        ""
      );

  return (
    configured ||
    "https://www.tetamo.com"
  );
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
      "read_system_data"
    );

    requireAgentPermission(
      "randolph",
      "diagnose_system_issue"
    );

    const result =
      await runRandolphSystemWatchdog({
        baseUrl:
          getProductionBaseUrl(),

        /*
         * Founder/Admin may run one controlled
         * validation while Randolph is inactive.
         *
         * The autonomous cron does NOT use this.
         */
        allowInactive:
          true,
      });

    return Response.json({
      ok: true,

      mode:
        "founder_manual_validation",

      result,
    });
  } catch (error) {
    console.error(
      "Randolph manual watchdog run failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof
            Error
            ? error.message
            : "Unable to run Randolph health checks.",
      },
      {
        status: 500,
      }
    );
  }
}
