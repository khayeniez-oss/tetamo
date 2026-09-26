import {
  requireTetamoAdminOrCron,
} from "@/lib/ai-team/core/admin-auth";

import {
  previewInquiryIntelligence,
} from "@/lib/ai-team/inquiry-intelligence/preview";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  120;

function parsePositiveInteger(
  value: string | null,
  fallback: number
) {
  const parsed =
    Number(value);

  return (
    Number.isInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : fallback;
}

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
    const url =
      new URL(req.url);

    const limit =
      parsePositiveInteger(
        url.searchParams.get(
          "limit"
        ),
        5
      );

    const lookbackDays =
      parsePositiveInteger(
        url.searchParams.get(
          "days"
        ),
        14
      );

    const before =
      url.searchParams.get(
        "before"
      );

    const preview =
      await previewInquiryIntelligence({
        limit,
        lookbackDays,
        before,
      });

    return Response.json({
      ok: true,

      bridgeEnabled:
        false,

      writesPerformed:
        false,

      preview,
    });
  } catch (error) {
    console.error(
      "Inquiry intelligence preview failed:",
      error
    );

    return Response.json(
      {
        ok: false,

        bridgeEnabled:
          false,

        writesPerformed:
          false,

        error:
          error instanceof
          Error
            ? error.message
            : "Inquiry intelligence preview failed.",
      },
      {
        status: 500,
      }
    );
  }
}
