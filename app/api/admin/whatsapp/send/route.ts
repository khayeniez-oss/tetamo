import { createClient } from "@supabase/supabase-js";

import {
  markMonaFollowUpSuccessfullySent,
  runMonaScheduledFollowUp,
} from "@/app/lib/mona/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      persistSession: false,
    },
  }
);

type SendMode = "admin" | "mona_followup";

type AdminAuthResult = {
  authorized: boolean;
  userId?: string;
  response?: Response;
};

type SystemAuthResult = {
  authorized: boolean;
  response?: Response;
};

type MetaSendResult = {
  success: boolean;
  messageId: string | null;
  status?: string | null;
  error?: unknown;
};

type ConversationRecord = {
  id: string;
  phone?: string | null;
  phone_e164?: string | null;
  profile_name?: string | null;
  channel?: string | null;
  business_sender_key?: string | null;
  conversation_key?: string | null;
  window_expires_at?: string | null;
  status?: string | null;
  ai_enabled?: boolean | null;
  handover_to_admin?: boolean | null;
  handover_reason?: string | null;
  opted_out_at?: string | null;

  mona_followup_count?: number | null;
  mona_followup_waiting_since?: string | null;
  mona_first_followup_sent_at?: string | null;
  mona_next_followup_due_at?: string | null;
  mona_dependency_controlled?: boolean | null;
  mona_dependency_reason?: string | null;
  mona_followup_claimed_at?: string | null;
  mona_followup_claim_token?: string | null;
};

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function normalizePhone(value?: string | null) {
  return String(value || "")
    .replace(/^whatsapp:/i, "")
    .replace(/\D/g, "");
}

function getGraphVersion() {
  return cleanEnv(process.env.META_GRAPH_VERSION) || "v25.0";
}

function getMetaPhoneNumberId() {
  return cleanEnv(
    process.env.META_DIRECT_WHATSAPP_PHONE_NUMBER_ID
  );
}

function getMetaBusinessSenderKey() {
  const phoneNumberId = getMetaPhoneNumberId();

  return phoneNumberId
    ? `meta:${phoneNumberId}`
    : "";
}

function isWindowOpen(value?: string | null) {
  if (!value) return false;

  const expiry = new Date(value).getTime();

  if (!Number.isFinite(expiry)) {
    return false;
  }

  return expiry > Date.now();
}

function isBlocked(
  conversation: ConversationRecord
) {
  return (
    String(conversation.status || "")
      .toLowerCase()
      .trim() === "blocked"
  );
}

function isOptedOut(
  conversation: ConversationRecord
) {
  return (
    Boolean(conversation.opted_out_at) ||
    String(conversation.status || "")
      .toLowerCase()
      .trim() === "opted_out"
  );
}

function isMetaConversation(
  conversation: ConversationRecord
) {
  return (
    String(conversation.channel || "")
      .toLowerCase()
      .trim() === "meta_whatsapp"
  );
}

function isMonaUnavailable(
  conversation: ConversationRecord
) {
  return (
    conversation.ai_enabled === false ||
    conversation.handover_to_admin === true
  );
}

async function verifyAdmin(
  req: Request
): Promise<AdminAuthResult> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "Supabase server environment variables are missing.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "Unauthorized. Login is required.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "Unauthorized. Invalid session.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Failed to verify admin profile:",
      profileError
    );

    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "Unable to verify admin access.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const role = String(
    (profile as any)?.role || ""
  ).toLowerCase();

  if (!role.includes("admin")) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "Forbidden. Admin access is required.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
  };
}

function verifySystem(
  req: Request
): SystemAuthResult {
  const cronSecret = cleanEnv(
    process.env.CRON_SECRET
  );

  if (!cronSecret) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "CRON_SECRET is not configured.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token || token !== cronSecret) {
    return {
      authorized: false,
      response: Response.json(
        {
          error:
            "Unauthorized system request.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  return {
    authorized: true,
  };
}

async function sendMetaText(params: {
  phoneNumberId: string;
  to: string;
  message: string;
}): Promise<MetaSendResult> {
  const accessToken = cleanEnv(
    process.env.META_DIRECT_WHATSAPP_ACCESS_TOKEN
  );

  if (
    !accessToken ||
    !params.phoneNumberId ||
    !params.to ||
    !params.message
  ) {
    return {
      success: false,
      messageId: null,
      error: {
        message:
          "Missing Meta Direct WhatsApp send configuration.",
        hasAccessToken: Boolean(accessToken),
        hasPhoneNumberId: Boolean(
          params.phoneNumberId
        ),
        hasTo: Boolean(params.to),
        hasMessage: Boolean(params.message),
      },
    };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${getGraphVersion()}/${params.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: params.to,
          type: "text",
          text: {
            preview_url: false,
            body: params.message,
          },
        }),
      }
    );

    const result = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        messageId: null,
        error: result,
      };
    }

    return {
      success: true,
      messageId:
        result?.messages?.[0]?.id || null,
      status:
        result?.messages?.[0]?.message_status ||
        null,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      messageId: null,
      error,
    };
  }
}

async function loadConversation(
  conversationId: string
): Promise<ConversationRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select(
      `
        id,
        phone,
        phone_e164,
        profile_name,
        channel,
        business_sender_key,
        conversation_key,
        window_expires_at,
        status,
        ai_enabled,
        handover_to_admin,
        handover_reason,
        opted_out_at,
        mona_followup_count,
        mona_followup_waiting_since,
        mona_first_followup_sent_at,
        mona_next_followup_due_at,
        mona_dependency_controlled,
        mona_dependency_reason,
        mona_followup_claimed_at,
        mona_followup_claim_token
      `
    )
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load WhatsApp conversation:",
      error
    );

    return null;
  }

  return data as ConversationRecord | null;
}

async function isNumberBlocked(
  phone: string
) {
  if (!phone) return false;

  const candidates = [
    phone,
    `+${phone}`,
    `whatsapp:+${phone}`,
  ];

  const { data, error } = await supabaseAdmin
    .from("whatsapp_blocked_numbers")
    .select("phone_e164")
    .in("phone_e164", candidates)
    .limit(1);

  if (error) {
    console.error(
      "Failed to check blocked WhatsApp number:",
      error
    );

    /*
     * Automated Mona sending fails closed.
     */
    return true;
  }

  return Boolean(data?.length);
}

async function deliverMetaMessage(params: {
  conversation: ConversationRecord;
  message: string;
}) {
  if (!isMetaConversation(params.conversation)) {
    throw new Error(
      "This conversation is not a Meta WhatsApp conversation."
    );
  }

  const phone = normalizePhone(
    params.conversation.phone_e164
  ) ||
    normalizePhone(
      params.conversation.phone
    );

  if (!phone) {
    throw new Error(
      "Customer WhatsApp phone number is missing."
    );
  }

  const phoneNumberId =
    getMetaPhoneNumberId();

  const expectedSenderKey =
    getMetaBusinessSenderKey();

  const businessSenderKey =
    String(
      params.conversation.business_sender_key ||
        ""
    ).trim();

  if (
    !phoneNumberId ||
    !expectedSenderKey
  ) {
    throw new Error(
      "Meta Direct WhatsApp configuration is missing. Check META_DIRECT_* variables."
    );
  }

  if (
    !businessSenderKey ||
    businessSenderKey !== expectedSenderKey
  ) {
    throw new Error(
      "This conversation is not tied to the configured Meta Direct business sender."
    );
  }

  const sendResult =
    await sendMetaText({
      phoneNumberId,
      to: phone,
      message: params.message,
    });

  return {
    sendResult,
    phoneNumberId,
    phone,
  };
}

async function saveAdminOutbound(params: {
  conversation: ConversationRecord;
  message: string;
  sendResult: MetaSendResult;
  phoneNumberId: string;
  phone: string;
  adminUserId: string | null;
}) {
  const now = new Date().toISOString();

  const { error: messageError } =
    await supabaseAdmin
      .from("whatsapp_messages")
      .insert({
        conversation_id:
          params.conversation.id,
        direction: "outbound",
        from_number:
          params.phoneNumberId,
        to_number:
          params.phone,
        phone:
          `whatsapp:+${params.phone}`,
        profile_name:
          params.conversation.profile_name ||
          null,
        message:
          params.message,
        source:
          "admin_meta_direct",
        provider:
          "meta",
        provider_message_id:
          params.sendResult.messageId,
        ai_generated:
          false,
        admin_generated:
          true,
        media_count:
          0,
        raw_payload: {
          admin_user_id:
            params.adminUserId,
          provider:
            "meta",
          provider_message_id:
            params.sendResult.messageId,
          provider_status:
            params.sendResult.status || null,
          sent_from_admin_dashboard:
            true,
        },
        created_at:
          now,
      });

  if (messageError) {
    console.error(
      "Failed to save admin WhatsApp reply:",
      messageError
    );
  }

  const { error: updateError } =
    await supabaseAdmin
      .from("whatsapp_conversations")
      .update({
        status:
          "active",
        ai_enabled:
          false,
        handover_to_admin:
          true,
        handover_reason:
          "Admin replied manually",
        last_message:
          params.message,
        last_message_direction:
          "outbound",
        last_message_at:
          now,

        /*
         * A real Admin reply stops any
         * pending Mona silence follow-up.
         */
        mona_next_followup_due_at:
          null,
        mona_followup_claimed_at:
          null,
        mona_followup_claim_token:
          null,
      })
      .eq(
        "id",
        params.conversation.id
      );

  if (updateError) {
    console.error(
      "Failed to update conversation after admin WhatsApp reply:",
      updateError
    );
  }
}

async function saveMonaOutbound(params: {
  conversation: ConversationRecord;
  message: string;
  source: string;
  followUpNumber: 1 | 2;
  sendResult: MetaSendResult;
  phoneNumberId: string;
  phone: string;
}) {
  const now = new Date().toISOString();

  const source =
    cleanEnv(params.source) ||
    `tetamo_mona_followup_${params.followUpNumber}`;

  const { error: messageError } =
    await supabaseAdmin
      .from("whatsapp_messages")
      .insert({
        conversation_id:
          params.conversation.id,
        direction:
          "outbound",
        from_number:
          params.phoneNumberId,
        to_number:
          params.phone,
        phone:
          `whatsapp:+${params.phone}`,
        profile_name:
          params.conversation.profile_name ||
          null,
        message:
          params.message,
        source,
        provider:
          "meta",
        provider_message_id:
          params.sendResult.messageId,
        ai_generated:
          true,
        admin_generated:
          false,
        media_count:
          0,
        raw_payload: {
          provider:
            "meta",
          provider_message_id:
            params.sendResult.messageId,
          provider_status:
            params.sendResult.status || null,
          mona_followup_number:
            params.followUpNumber,
          mona_automatic_followup:
            true,
        },
        created_at:
          now,
      });

  if (messageError) {
    console.error(
      "Failed to save Mona WhatsApp follow-up:",
      messageError
    );
  }

  const { error: updateError } =
    await supabaseAdmin
      .from("whatsapp_conversations")
      .update({
        status:
          "active",
        last_message:
          params.message,
        last_message_direction:
          "outbound",
        last_message_at:
          now,
        mona_followup_claimed_at:
          null,
        mona_followup_claim_token:
          null,
      })
      .eq(
        "id",
        params.conversation.id
      );

  if (updateError) {
    console.error(
      "Failed to update conversation after Mona WhatsApp follow-up:",
      updateError
    );
  }
}

async function releaseMonaClaim(params: {
  conversationId: string;
  claimToken?: string | null;
}) {
  let query = supabaseAdmin
    .from("whatsapp_conversations")
    .update({
      mona_followup_claimed_at: null,
      mona_followup_claim_token: null,
    })
    .eq(
      "id",
      params.conversationId
    );

  if (params.claimToken) {
    query = query.eq(
      "mona_followup_claim_token",
      params.claimToken
    );
  }

  const { error } = await query;

  if (error) {
    console.error(
      "Failed to release Mona follow-up claim:",
      error
    );
  }
}

async function stopMonaFollowUpCycle(params: {
  conversationId: string;
  claimToken?: string | null;
  reason?: string | null;
}) {
  let query = supabaseAdmin
    .from("whatsapp_conversations")
    .update({
      mona_next_followup_due_at: null,
      mona_followup_claimed_at: null,
      mona_followup_claim_token: null,
    })
    .eq(
      "id",
      params.conversationId
    );

  if (params.claimToken) {
    query = query.eq(
      "mona_followup_claim_token",
      params.claimToken
    );
  }

  const { error } = await query;

  if (error) {
    console.error(
      "Failed to stop Mona follow-up cycle:",
      {
        error,
        reason:
          params.reason || null,
      }
    );
  }
}

async function handleAdminSend(params: {
  req: Request;
  body: any;
}) {
  const auth =
    await verifyAdmin(params.req);

  if (!auth.authorized) {
    return auth.response!;
  }

  const conversationId =
    String(
      params.body?.conversationId ||
        ""
    ).trim();

  const message =
    String(
      params.body?.message || ""
    ).trim();

  if (!conversationId) {
    return Response.json(
      {
        error:
          "conversationId is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (!message) {
    return Response.json(
      {
        error:
          "Message is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (message.length > 1700) {
    return Response.json(
      {
        error:
          "Message is too long. Please keep it under 1700 characters.",
      },
      {
        status: 400,
      }
    );
  }

  const conversation =
    await loadConversation(
      conversationId
    );

  if (!conversation) {
    return Response.json(
      {
        error:
          "WhatsApp conversation was not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (!isMetaConversation(conversation)) {
    return Response.json(
      {
        error:
          "Only Meta WhatsApp conversations are supported.",
      },
      {
        status: 400,
      }
    );
  }

  if (isBlocked(conversation)) {
    return Response.json(
      {
        error:
          "This WhatsApp number is blocked.",
      },
      {
        status: 403,
      }
    );
  }

  if (isOptedOut(conversation)) {
    return Response.json(
      {
        error:
          "This customer has opted out of WhatsApp messaging.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    !isWindowOpen(
      conversation.window_expires_at
    )
  ) {
    return Response.json(
      {
        error:
          "The 24-hour WhatsApp window is closed. Use an approved template message for this customer.",
      },
      {
        status: 400,
      }
    );
  }

  let delivery;

  try {
    delivery =
      await deliverMetaMessage({
        conversation,
        message,
      });
  } catch (error) {
    console.error(
      "Admin Meta WhatsApp delivery validation failed:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare Meta WhatsApp message.",
      },
      {
        status: 400,
      }
    );
  }

  if (!delivery.sendResult.success) {
    console.error(
      "Admin Meta WhatsApp send failed:",
      delivery.sendResult
    );

    return Response.json(
      {
        error:
          "Failed to send Meta WhatsApp message.",
        details:
          delivery.sendResult.error,
      },
      {
        status: 500,
      }
    );
  }

  await saveAdminOutbound({
    conversation,
    message,
    sendResult:
      delivery.sendResult,
    phoneNumberId:
      delivery.phoneNumberId,
    phone:
      delivery.phone,
    adminUserId:
      auth.userId || null,
  });

  return Response.json({
    success: true,
    mode: "admin",
    provider: "meta",
    messageId:
      delivery.sendResult.messageId,
    status:
      delivery.sendResult.status || null,
  });
}

async function handleMonaFollowUpSend(params: {
  req: Request;
  body: any;
}) {
  const systemAuth =
    verifySystem(params.req);

  if (!systemAuth.authorized) {
    return systemAuth.response!;
  }

  const conversationId =
    String(
      params.body?.conversationId ||
        ""
    ).trim();

  const claimToken =
    String(
      params.body?.claimToken || ""
    ).trim();

  if (!conversationId) {
    return Response.json(
      {
        error:
          "conversationId is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (!claimToken) {
    return Response.json(
      {
        error:
          "claimToken is required for Mona follow-up sends.",
      },
      {
        status: 400,
      }
    );
  }

  const conversation =
    await loadConversation(
      conversationId
    );

  if (!conversation) {
    return Response.json(
      {
        error:
          "WhatsApp conversation was not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    !conversation.mona_followup_claim_token ||
    conversation.mona_followup_claim_token !==
      claimToken
  ) {
    return Response.json(
      {
        error:
          "Mona follow-up claim is invalid or no longer active.",
      },
      {
        status: 409,
      }
    );
  }

  if (!isMetaConversation(conversation)) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "Conversation is not Meta WhatsApp.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "Mona automatic follow-ups only use Meta WhatsApp.",
    });
  }

  const phone =
    normalizePhone(
      conversation.phone_e164
    ) ||
    normalizePhone(
      conversation.phone
    );

  if (!phone) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "Customer phone number is missing.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "Customer phone number is missing.",
    });
  }

  if (
    isBlocked(conversation) ||
    isOptedOut(conversation) ||
    isMonaUnavailable(conversation)
  ) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "Conversation is not eligible for Mona follow-up.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "Conversation is blocked, opted out, AI paused, or under Admin control.",
    });
  }

  const blocked =
    await isNumberBlocked(phone);

  if (blocked) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "Customer number is blocked.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "Customer number is blocked.",
    });
  }

  if (
    !isWindowOpen(
      conversation.window_expires_at
    )
  ) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "WhatsApp 24-hour free-text window is closed.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "WhatsApp 24-hour free-text window is closed.",
    });
  }

  const generation =
    await runMonaScheduledFollowUp({
      supabase:
        supabaseAdmin,
      conversationId,
      blocked: false,
    });

  if (generation.action !== "reply") {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        generation.reason,
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      followUpNumber:
        generation.followUpNumber,
      reason:
        generation.reason,
    });
  }

  const message =
    String(
      generation.reply || ""
    ).trim();

  const followUpNumber =
    generation.followUpNumber;

  if (
    !message ||
    (followUpNumber !== 1 &&
      followUpNumber !== 2)
  ) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "Mona generated an invalid follow-up.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "Mona generated an invalid follow-up.",
    });
  }

  if (message.length > 1700) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "Generated Mona follow-up exceeded the message length limit.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "Generated Mona follow-up exceeded the message length limit.",
    });
  }

  /*
   * Re-check immediately before sending.
   * Customer/Admin state may have changed
   * while Brain and Writer were working.
   */
  const latestConversation =
    await loadConversation(
      conversationId
    );

  if (
    !latestConversation ||
    latestConversation.mona_followup_claim_token !==
      claimToken ||
    !isMetaConversation(
      latestConversation
    ) ||
    isBlocked(
      latestConversation
    ) ||
    isOptedOut(
      latestConversation
    ) ||
    isMonaUnavailable(
      latestConversation
    )
  ) {
    await stopMonaFollowUpCycle({
      conversationId,
      claimToken,
      reason:
        "Conversation changed while Mona was preparing the follow-up.",
    });

    return Response.json({
      success: true,
      mode: "mona_followup",
      action: "silent",
      reason:
        "Conversation changed while Mona was preparing the follow-up.",
    });
  }

  let delivery;

  try {
    delivery =
      await deliverMetaMessage({
        conversation:
          latestConversation,
        message,
      });
  } catch (error) {
    /*
     * Configuration/transport issue.
     * Do not mark the follow-up as sent.
     * Release claim so it can retry later.
     */
    await releaseMonaClaim({
      conversationId,
      claimToken,
    });

    console.error(
      "Mona Meta WhatsApp delivery validation failed:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare Mona Meta WhatsApp follow-up.",
      },
      {
        status: 500,
      }
    );
  }

  if (!delivery.sendResult.success) {
    /*
     * Meta did not confirm the send.
     * Follow-up state must NOT advance.
     */
    await releaseMonaClaim({
      conversationId,
      claimToken,
    });

    console.error(
      "Mona Meta WhatsApp follow-up send failed:",
      delivery.sendResult
    );

    return Response.json(
      {
        error:
          "Failed to send Mona Meta WhatsApp follow-up.",
        details:
          delivery.sendResult.error,
      },
      {
        status: 500,
      }
    );
  }

  /*
   * Meta has confirmed transport.
   * Save the outbound message as Mona,
   * never as Admin.
   */
  await saveMonaOutbound({
    conversation:
      latestConversation,
    message,
    source:
      generation.source ||
      `tetamo_mona_followup_${followUpNumber}`,
    followUpNumber,
    sendResult:
      delivery.sendResult,
    phoneNumberId:
      delivery.phoneNumberId,
    phone:
      delivery.phone,
  });

  /*
   * Only after Meta confirms the message
   * was sent do we advance the timing:
   *
   * #1 -> next due +12 hours
   * #2 -> stop
   */
  await markMonaFollowUpSuccessfullySent({
    supabase:
      supabaseAdmin,
    conversationId,
    followUpNumber,
  });

  await releaseMonaClaim({
    conversationId,
  });

  return Response.json({
    success: true,
    mode: "mona_followup",
    action: "sent",
    followUpNumber,
    provider: "meta",
    messageId:
      delivery.sendResult.messageId,
    status:
      delivery.sendResult.status || null,
  });
}

export async function POST(
  req: Request
) {
  try {
    const body = await req.json();

    const requestedMode =
      String(
        body?.mode || "admin"
      )
        .toLowerCase()
        .trim();

    if (
      requestedMode !== "admin" &&
      requestedMode !== "mona_followup"
    ) {
      return Response.json(
        {
          error:
            "Invalid WhatsApp send mode.",
        },
        {
          status: 400,
        }
      );
    }

    const mode =
      requestedMode as SendMode;

    if (mode === "mona_followup") {
      return await handleMonaFollowUpSend({
        req,
        body,
      });
    }

    return await handleAdminSend({
      req,
      body,
    });
  } catch (error) {
    console.error(
      "Meta WhatsApp send route error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to send Meta WhatsApp message.",
      },
      {
        status: 500,
      }
    );
  }
}
