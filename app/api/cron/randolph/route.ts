import {
  runRandolphSystemWatchdog,
} from "@/lib/ai-team/agents/randolph-system-watchdog";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

function verifyRandolphWatchdogSecret(
  req: Request
) {
  const secret =
    String(
      process.env
        .RANDOLPH_WATCHDOG_SECRET ||
        ""
    ).trim();

  if (!secret) {
    return {
      ok: false as const,

      response:
        Response.json(
          {
            ok: false,
            error:
              "RANDOLPH_WATCHDOG_SECRET is not configured.",
          },
          {
            status: 500,
          }
        ),
    };
  }

  const authorization =
    req.headers.get(
      "authorization"
    ) || "";

  const token =
    authorization
      .toLowerCase()
      .startsWith("bearer ")
      ? authorization
          .slice(7)
          .trim()
      : "";

  if (
    !token ||
    token !== secret
  ) {
    return {
      ok: false as const,

      response:
        Response.json(
          {
            ok: false,
            error:
              "Unauthorized Randolph watchdog request.",
          },
          {
            status: 401,
          }
        ),
    };
  }

  return {
    ok: true as const,
  };
}

export async function GET(
  req: Request
) {
  const auth =
    verifyRandolphWatchdogSecret(
      req
    );

  if (!auth.ok) {
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
          error instanceof Error
            ? error.message
            : "Randolph system watchdog cron failed.",
      },
      {
        status: 500,
      }
    );
  }
}
