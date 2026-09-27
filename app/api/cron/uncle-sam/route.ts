import {
  requireTetamoAdminOrCron,
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
    const result =
      await runUncleSamFinanceReview();

    return Response.json({
      ok: true,
      scheduler:
        "uncle_sam_finance_review",
      result,
    });
  } catch (error) {
    console.error(
      "Uncle Sam finance cron failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Uncle Sam finance cron failed.",
      },
      {
        status: 500,
      }
    );
  }
}
