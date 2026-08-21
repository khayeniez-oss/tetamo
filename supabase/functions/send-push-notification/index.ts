import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const TETAMO_SOUND_FILE = "tetamo_notification.wav";
const TETAMO_SOUND_CHANNEL_ID = "tetamo-alerts";
const TETAMO_SILENT_CHANNEL_ID = "tetamo-silent";
const TETAMO_PARTNER_SOUND_CHANNEL_ID =
  "tetamo-partner-alerts";
const TETAMO_PARTNER_SILENT_CHANNEL_ID =
  "tetamo-partner-silent";

const INQUIRY_NOTIFICATION_TYPES = new Set([
  "new_whatsapp_inquiry",
  "new_viewing_request",
  "property_lead",
  "schedule_viewing_request",
  "whatsapp_inquiry",
]);

type NotificationRow = {
  id: string;
  user_id: string | null;
  type: string;
  title: string | null;
  body: string | null;
  message: string | null;
  priority: string | null;
  property_id: string | null;
  lead_id: string | null;
  action_url: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: {
    id?: string | null;
  } | null;
  old_record?: unknown;
  notification_id?: string | null;
};

type PushTokenRow = {
  id: string;
  expo_push_token: string;
  platform: string | null;
  source: string | null;
};

type LeadRoutingRow = {
  receiver_user_id: string | null;
  receiver_role: string | null;
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isAuthorizedRequest(req: Request) {
  const expectedSecret =
    Deno.env.get("PUSH_WEBHOOK_SECRET")?.trim() ?? "";

  const suppliedSecret =
    req.headers.get("x-tetamo-push-secret")?.trim() ?? "";

  if (!expectedSecret || !suppliedSecret) {
    return false;
  }

  return suppliedSecret === expectedSecret;
}

function getNotificationId(payload: WebhookPayload) {
  const directId =
    typeof payload.notification_id === "string"
      ? payload.notification_id.trim()
      : "";

  if (directId) return directId;

  const recordId =
    typeof payload.record?.id === "string"
      ? payload.record.id.trim()
      : "";

  return recordId;
}

function isWebhookInsert(payload: WebhookPayload) {
  if (!payload.type && !payload.table && !payload.schema) {
    return true;
  }

  return (
    payload.type === "INSERT" &&
    payload.table === "notifications" &&
    payload.schema === "public"
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: "method_not_allowed",
      },
      405,
    );
  }

  /*
   * The function is configured with verify_jwt = false because it
   * is called by a Database Webhook rather than an authenticated user.
   *
   * The webhook must provide Tetamo's dedicated push secret through:
   *   x-tetamo-push-secret
   *
   * SUPABASE_SERVICE_ROLE_KEY remains private inside this function
   * and is used only for server-side database access.
   */
  if (!isAuthorizedRequest(req)) {
    return jsonResponse(
      {
        ok: false,
        error: "unauthorized",
      },
      401,
    );
  }

  let payload: WebhookPayload;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_json",
      },
      400,
    );
  }

  /*
   * Database webhook delivery should only react to INSERT events on
   * public.notifications.
   *
   * notification_id is also accepted so we can perform a controlled
   * manual test before enabling the database webhook.
   */
  if (!isWebhookInsert(payload)) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "unsupported_webhook_event",
    });
  }

  const notificationId = getNotificationId(payload);

  if (!notificationId) {
    return jsonResponse(
      {
        ok: false,
        error: "missing_notification_id",
      },
      400,
    );
  }

  /*
   * Always reload the notification from the database rather than
   * trusting title/body/user data supplied by the HTTP request.
   */
  const {
    data: notification,
    error: notificationError,
  } = await supabaseAdmin
    .from("notifications")
    .select(
      [
        "id",
        "user_id",
        "type",
        "title",
        "body",
        "message",
        "priority",
        "property_id",
        "lead_id",
        "action_url",
        "link",
        "metadata",
      ].join(","),
    )
    .eq("id", notificationId)
    .maybeSingle();

  if (notificationError) {
    console.error(
      "Push notification lookup error:",
      notificationError,
    );

    return jsonResponse(
      {
        ok: false,
        error: "notification_lookup_failed",
      },
      500,
    );
  }

  if (!notification) {
    return jsonResponse(
      {
        ok: false,
        error: "notification_not_found",
      },
      404,
    );
  }

  const row = notification as NotificationRow;

  if (!row.user_id) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "missing_recipient",
      notification_id: row.id,
    });
  }

  /*
   * These are the five notification types currently present in Tetamo.
   * All five represent inquiry / lead activity.
   */
  if (!INQUIRY_NOTIFICATION_TYPES.has(row.type)) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "unsupported_notification_type",
      notification_id: row.id,
      notification_type: row.type,
    });
  }

  /*
   * Require an explicit preferences row.
   *
   * Missing preferences do NOT mean opt-in.
   */
  const {
    data: preferences,
    error: preferencesError,
  } = await supabaseAdmin
    .from("notification_preferences")
    .select(
      "push_notifications, inquiry_updates, notification_sound",
    )
    .eq("user_id", row.user_id)
    .order("updated_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (preferencesError) {
    console.error(
      "Push preferences lookup error:",
      preferencesError,
    );

    return jsonResponse(
      {
        ok: false,
        error: "preferences_lookup_failed",
      },
      500,
    );
  }

  if (!preferences) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "preferences_missing",
      notification_id: row.id,
    });
  }

  if (preferences.push_notifications !== true) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "push_disabled",
      notification_id: row.id,
    });
  }

  if (preferences.inquiry_updates !== true) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "inquiry_updates_disabled",
      notification_id: row.id,
    });
  }

  /*
   * Decide which Tetamo app should receive this notification.
   *
   * Agent / owner lead recipients should use Tetamo Partner.
   * Admin notifications and other recipients remain on Tetamo Mobile.
   *
   * While Partner is still being rolled out, an agent/owner without
   * an active Partner token falls back to their existing Tetamo Mobile
   * token so current push delivery is not interrupted.
   */
  let preferPartnerApp = false;

  if (row.lead_id) {
    const {
      data: leadRoutingData,
      error: leadRoutingError,
    } = await supabaseAdmin
      .from("leads")
      .select(
        "receiver_user_id, receiver_role",
      )
      .eq("id", row.lead_id)
      .maybeSingle();

    if (leadRoutingError) {
      console.error(
        "Push lead routing lookup error:",
        leadRoutingError,
      );

      return jsonResponse(
        {
          ok: false,
          error: "lead_routing_lookup_failed",
        },
        500,
      );
    }

    const leadRouting =
      leadRoutingData as LeadRoutingRow | null;

    const receiverRole =
      String(
        leadRouting?.receiver_role || "",
      )
        .trim()
        .toLowerCase();

    const isActualLeadReceiver =
      Boolean(
        leadRouting?.receiver_user_id &&
          leadRouting.receiver_user_id ===
            row.user_id,
      );

    preferPartnerApp =
      isActualLeadReceiver &&
      (
        receiverRole === "agent" ||
        receiverRole === "owner"
      );
  }

  const {
    data: tokenRows,
    error: tokensError,
  } = await supabaseAdmin
    .from("push_tokens")
    .select(
      "id, expo_push_token, platform, source",
    )
    .eq("user_id", row.user_id)
    .eq("status", "active");

  if (tokensError) {
    console.error(
      "Push token lookup error:",
      tokensError,
    );

    return jsonResponse(
      {
        ok: false,
        error: "push_token_lookup_failed",
      },
      500,
    );
  }

  const allTokens =
    (tokenRows ?? []) as PushTokenRow[];

  const partnerTokens =
    allTokens.filter(
      (token) =>
        String(
          token.source || "",
        )
          .trim()
          .toLowerCase() ===
        "tetamo-partner",
    );

  const mobileTokens =
    allTokens.filter(
      (token) => {
        const source =
          String(
            token.source || "",
          )
            .trim()
            .toLowerCase();

        return (
          !source ||
          source ===
            "tetamo-mobile"
        );
      },
    );

  const usePartnerTokens =
    preferPartnerApp &&
    partnerTokens.length > 0;

  const tokens =
    usePartnerTokens
      ? partnerTokens
      : mobileTokens;

  const deliveryApp =
    usePartnerTokens
      ? "tetamo-partner"
      : "tetamo-mobile";

  if (tokens.length === 0) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "no_active_push_tokens",
      notification_id: row.id,
      delivery_app: deliveryApp,
    });
  }

  const soundEnabled =
    preferences.notification_sound === true;

  const soundChannelId =
    deliveryApp === "tetamo-partner"
      ? TETAMO_PARTNER_SOUND_CHANNEL_ID
      : TETAMO_SOUND_CHANNEL_ID;

  const silentChannelId =
    deliveryApp === "tetamo-partner"
      ? TETAMO_PARTNER_SILENT_CHANNEL_ID
      : TETAMO_SILENT_CHANNEL_ID;

  const title =
    row.title?.trim() ||
    "Tetamo";

  const body =
    row.body?.trim() ||
    row.message?.trim() ||
    "You have a new Tetamo notification.";

  const actionUrl =
    row.action_url?.trim() ||
    row.link?.trim() ||
    null;

  const messages = tokens
    .map((token) => ({
      token,
      message: {
        to: token.expo_push_token,
        title,
        body,

        /*
         * iOS custom sound.
         * Android 8+ uses channelId.
         */
        sound: soundEnabled
          ? TETAMO_SOUND_FILE
          : null,

        channelId: soundEnabled
          ? soundChannelId
          : silentChannelId,

        priority:
          row.priority === "high"
            ? "high"
            : "default",

        data: {
          notificationId: row.id,
          type: row.type,
          propertyId: row.property_id,
          leadId: row.lead_id,
          actionUrl,
        },
      },
    }))
    .filter(
      ({ token }) =>
        typeof token.expo_push_token === "string" &&
        token.expo_push_token.trim().length > 0,
    );

  if (messages.length === 0) {
    return jsonResponse({
      ok: true,
      skipped: true,
      reason: "no_valid_push_tokens",
      notification_id: row.id,
    });
  }

  const expoAccessToken =
    Deno.env.get("EXPO_ACCESS_TOKEN")?.trim() ?? "";

  const expoResults: unknown[] = [];

  /*
   * Expo accepts up to 100 notification messages per request.
   */
  for (let index = 0; index < messages.length; index += 100) {
    const chunk = messages.slice(index, index + 100);

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    /*
     * Expo Push Service does not require this unless enhanced
     * push security is enabled. Supporting it here makes the
     * function compatible with either configuration.
     */
    if (expoAccessToken) {
      headers.Authorization =
        `Bearer ${expoAccessToken}`;
    }

    let expoResponse: Response;

    try {
      expoResponse = await fetch(
        EXPO_PUSH_URL,
        {
          method: "POST",
          headers,
          body: JSON.stringify(
            chunk.map(({ message }) => message),
          ),
        },
      );
    } catch (error) {
      console.error(
        "Expo Push Service network error:",
        error,
      );

      return jsonResponse(
        {
          ok: false,
          error: "expo_network_error",
          notification_id: row.id,
        },
        502,
      );
    }

    let expoBody: unknown;

    try {
      expoBody = await expoResponse.json();
    } catch {
      expoBody = {
        error: "invalid_expo_response",
      };
    }

    expoResults.push(expoBody);

    if (!expoResponse.ok) {
      console.error(
        "Expo Push Service error:",
        expoResponse.status,
        expoBody,
      );

      return jsonResponse(
        {
          ok: false,
          error: "expo_push_failed",
          expo_status: expoResponse.status,
          expo: expoBody,
          notification_id: row.id,
        },
        502,
      );
    }

    /*
     * Mark tokens inactive immediately if Expo reports that the
     * application is no longer installed on that device.
     */
    const ticketData =
      expoBody &&
      typeof expoBody === "object" &&
      Array.isArray(
        (expoBody as { data?: unknown[] }).data,
      )
        ? (
            expoBody as {
              data: Array<{
                status?: string;
                details?: {
                  error?: string;
                };
              }>;
            }
          ).data
        : [];

    for (
      let ticketIndex = 0;
      ticketIndex < ticketData.length;
      ticketIndex += 1
    ) {
      const ticket = ticketData[ticketIndex];

      if (
        ticket?.status === "error" &&
        ticket?.details?.error === "DeviceNotRegistered"
      ) {
        const tokenRow =
          chunk[ticketIndex]?.token;

        if (tokenRow?.id) {
          await supabaseAdmin
            .from("push_tokens")
            .update({
              status: "inactive",
              updated_at: new Date().toISOString(),
            })
            .eq("id", tokenRow.id);
        }
      }
    }
  }

  return jsonResponse({
    ok: true,
    sent: messages.length,
    notification_id: row.id,
    recipient_user_id: row.user_id,
    notification_type: row.type,
    delivery_app: deliveryApp,
    sound_enabled: soundEnabled,
    expo: expoResults,
  });
});
