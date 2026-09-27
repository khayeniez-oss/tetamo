import {
  requireTetamoAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  runMonaSalesReview,
} from "@/lib/ai-team/agents/mona-sales-review";

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
    const result =
      await runMonaSalesReview();

    return Response.json({
      ok: true,

      mode:
        "founder_manual_validation",

      result,
    });
  } catch (error) {
    console.error(
      "Mona Sales Operations Review failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        error:
          error instanceof
            Error
            ? error.message
            : "Unable to run Mona Sales Operations Review.",
      },
      {
        status: 500,
      }
    );
  }
}
