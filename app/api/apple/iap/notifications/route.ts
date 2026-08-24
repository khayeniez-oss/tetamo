import { NextResponse } from "next/server";

import {
  reconcileAppleAgentSubscriptionNotification,
} from "../../../../../lib/apple-subscription-reconciliation";

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

  let verified:
    Awaited<
      ReturnType<
        typeof verifyAppleSignedNotification
      >
    >;

  try {
    verified =
      await verifyAppleSignedNotification(
        signedPayload
      );
  } catch (error) {
    console.error(
      "[apple-iap-notifications] verification failed",
      errorMessage(error)
    );

    return json(
      {
        success: false,
        verified: false,
        message:
          "Apple notification verification failed.",
      },
      400
    );
  }

  const {
    environment,
    notification,
  } = verified;

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
    "[apple-iap-notifications] verified",
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
      retry: false,
      notificationType,
      environment,
    });
  }

  try {
    const result =
      await reconcileAppleAgentSubscriptionNotification(
        {
          environment,
          notification,
        }
      );

    console.info(
      "[apple-iap-notifications] reconciliation",
      {
        notificationUUID,
        notificationType,
        subtype,
        environment,
        handled:
          result.handled,
        retry:
          result.retry,
        reason:
          result.reason,
      }
    );

    if (result.retry) {
      return json(
        {
          success: false,
          verified: true,
          handled: false,
          retry: true,
          notificationType,
          environment,
          reason:
            result.reason,
        },
        503
      );
    }

    return json({
      success: true,
      verified: true,
      handled:
        result.handled,
      retry: false,
      notificationType,
      environment,
      reason:
        result.reason,
    });
  } catch (error) {
    console.error(
      "[apple-iap-notifications] reconciliation failed",
      {
        notificationUUID,
        notificationType,
        subtype,
        environment,
        error:
          errorMessage(error),
      }
    );

    return json(
      {
        success: false,
        verified: true,
        handled: false,
        retry: true,
        notificationType,
        environment,
        message:
          "Apple subscription reconciliation failed.",
      },
      503
    );
  }
}
