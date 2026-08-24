import { NextResponse } from "next/server";

import {
  verifyAppleSignedNotification,
} from "../../../../../lib/apple-iap-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    { status }
  );
}

function errorMessage(
  error: unknown
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return String(
    error || "Unknown error"
  );
}

export async function POST(
  req: Request
) {
  try {
    const body =
      await req
        .json()
        .catch(() => null);

    const signedPayload =
      body &&
      typeof body.signedPayload ===
        "string"
        ? body.signedPayload.trim()
        : "";

    if (!signedPayload) {
      return json(
        {
          success: false,
          message:
            "signedPayload is required.",
        },
        400
      );
    }

    const {
      environment,
      notification,
    } =
      await verifyAppleSignedNotification(
        signedPayload
      );

    const notificationType =
      String(
        notification
          .notificationType || ""
      );

    const subtype =
      String(
        notification.subtype || ""
      );

    const notificationUUID =
      String(
        notification
          .notificationUUID || ""
      );

    console.info(
      "Apple server notification verified:",
      {
        notificationUUID,
        notificationType,
        subtype,
        environment,
      }
    );

    if (
      notificationType ===
      "TEST"
    ) {
      return json({
        success: true,
        verified: true,
        handled: true,
        notificationType,
        environment,
      });
    }

    /*
     * IMPORTANT:
     *
     * Real lifecycle mutation is
     * intentionally NOT enabled yet.
     *
     * Returning a non-2xx response
     * prevents us from silently
     * acknowledging a subscription
     * event before reconciliation is
     * implemented and tested.
     */
    console.warn(
      "Apple lifecycle notification deferred:",
      {
        notificationUUID,
        notificationType,
        subtype,
        environment,
      }
    );

    return json(
      {
        success: false,
        verified: true,
        handled: false,
        retry: true,
      },
      503
    );
  } catch (error) {
    console.error(
      "Apple server notification error:",
      error
    );

    return json(
      {
        success: false,
        verified: false,
        message:
          "Apple notification verification failed.",
        error:
          errorMessage(error),
      },
      400
    );
  }
}
