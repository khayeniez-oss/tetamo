import {
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  runUncleSamFinanceReview,
} from "@/lib/ai-team/agents/uncle-sam-finance-review";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  180;

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
    /*
     * Manual Founder/Admin test.
     *
     * forceWeeklyReport lets us verify the weekly-report
     * path even when today is not Monday.
     *
     * Idempotency prevents duplicate renewal tasks and
     * duplicate reports for the same report key.
     */
    const result =
      await runUncleSamFinanceReview({
        forceWeeklyReport:
          true,
      });

    return Response.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error(
      "Uncle Sam finance review failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof
            Error
            ? error.message
            : "Uncle Sam finance review failed.",
      },
      {
        status: 500,
      }
    );
  }
}
