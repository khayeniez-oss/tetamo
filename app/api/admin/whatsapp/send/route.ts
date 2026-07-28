


import { createClient } from "@supabase/supabase-js";

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

type AdminAuthResult = {
  authorized: boolean;
  userId?: string;
  response?: Response;
};

type SendResult = {
  success: boolean;
  provider: "meta" | "twilio";
  messageId: string | null;
  status?: string | null;
  error?: unknown;
};

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

function normalizePhone(value?: string | null) {
  return String(value || "")
    .replace(/^whatsapp:/i, "")
    .replace(/\D/g, "");
}

function toTwilioWhatsappAddress(value?: string | null) {
  const digits = normalizePhone(value);
  return digits ? `whatsapp:+${digits}` : "";
}

function getGraphVersion() {
  return cleanEnv(process.env.META_GRAPH_VERSION) || "v25.0";
}

function getMetaDirectPhoneNumberId() {
  return cleanEnv(process.env.META_DIRECT_WHATSAPP_PHONE_NUMBER_ID);
}

function getMetaDirectBusinessSenderKey() {
  const phoneNumberId = getMetaDirectPhoneNumberId();
  return phoneNumberId ? `meta:${phoneNumberId}` : "";
}

function getTwilioFromAddress() {
  return toTwilioWhatsappAddress(process.env.TWILIO_WHATSAPP_FROM);
}

function getTwilioBusinessSenderKey() {
  const digits = normalizePhone(getTwilioFromAddress());
  return digits ? `twilio:${digits}` : "";
}

function isWindowOpen(value?: string | null) {
  if (!value) return false;

  const expiry = new Date(value).getTime();

  if (!Number.isFinite(expiry)) return false;

  return expiry > Date.now();
}

async function verifyAdmin(req: Request): Promise<AdminAuthResult> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Supabase server environment variables are missing." },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Unauthorized. Login is required." },
        { status: 401 }
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
        { error: "Unauthorized. Invalid session." },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to verify admin profile:", profileError);

    return {
      authorized: false,
      response: Response.json(
        { error: "Unable to verify admin access." },
        { status: 500 }
      ),
    };
  }

  const role = String((profile as any)?.role || "").toLowerCase();
  const isAdmin = role.includes("admin");

  if (!isAdmin) {
    return {
      authorized: false,
      response: Response.json(
        { error: "Forbidden. Admin access is required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
  };
}

async function sendMetaText(params: {
  phoneNumberId: string;
  to: string;
  message: string;
}): Promise<SendResult> {
  const accessToken = cleanEnv(process.env.META_DIRECT_WHATSAPP_ACCESS_TOKEN);

  if (!accessToken || !params.phoneNumberId || !params.to || !params.message) {
    return {
      success: false,
      provider: "meta",
      messageId: null,
      error: {
        message: "Missing Meta Direct WhatsApp send configuration.",
        hasAccessToken: Boolean(accessToken),
        hasPhoneNumberId: Boolean(params.phoneNumberId),
        hasTo: Boolean(params.to),
        hasMessage: Boolean(params.message),
      },
    };
  }

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

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      success: false,
      provider: "meta",
      messageId: null,
      error: result,
    };
  }

  return {
    success: true,
    provider: "meta",
    messageId: result?.messages?.[0]?.id || null,
    status: result?.messages?.[0]?.message_status || null,
    error: null,
  };
}

async function sendTwilioText(params: {
  to: string;
  message: string;
}): Promise<SendResult> {
  const accountSid = cleanEnv(process.env.TWILIO_ACCOUNT_SID);
  const authToken = cleanEnv(process.env.TWILIO_AUTH_TOKEN);
  const from = getTwilioFromAddress();

  if (!accountSid || !authToken || !from || !params.to || !params.message) {
    return {
      success: false,
      provider: "twilio",
      messageId: null,
      error: {
        message: "Missing Twilio WhatsApp send configuration.",
        hasAccountSid: Boolean(accountSid),
        hasAuthToken: Boolean(authToken),
        hasFrom: Boolean(from),
        hasTo: Boolean(params.to),
        hasMessage: Boolean(params.message),
      },
    };
  }

  const to = toTwilioWhatsappAddress(params.to);

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: params.message,
      }),
    }
  );

  const responseText = await response.text();

  let result: any = null;

  try {
    result = responseText ? JSON.parse(responseText) : null;
  } catch {
    result = responseText;
  }

  if (!response.ok) {
    return {
      success: false,
      provider: "twilio",
      messageId: null,
      error: result,
    };
  }

  return {
    success: true,
    provider: "twilio",
    messageId: result?.sid || null,
    status: result?.status || null,
    error: null,
  };
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json();

    const conversationId = String(body?.conversationId || "").trim();
    const message = String(body?.message || "").trim();

    if (!conversationId) {
      return Response.json(
        { error: "conversationId is required." },
        { status: 400 }
      );
    }

    if (!message) {
      return Response.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > 1700) {
      return Response.json(
        { error: "Message is too long. Please keep it under 1700 characters." },
        { status: 400 }
      );
    }

    const { data: conversation, error: conversationError } =
      await supabaseAdmin
        .from("whatsapp_conversations")
        .select(
          "id, phone, phone_e164, profile_name, channel, business_sender_key, conversation_key, window_expires_at, status, ai_enabled, handover_to_admin"
        )
        .eq("id", conversationId)
        .maybeSingle();

    if (conversationError || !conversation) {
      console.error("Failed to load WhatsApp conversation:", conversationError);

      return Response.json(
        { error: "WhatsApp conversation was not found." },
        { status: 404 }
      );
    }

    if (
      String((conversation as any).status || "")
        .toLowerCase()
        .trim() === "blocked"
    ) {
      return Response.json(
        {
          error:
            "This WhatsApp number is blocked. Unblock the number before sending a reply.",
        },
        { status: 403 }
      );
    }

    if (!isWindowOpen((conversation as any).window_expires_at)) {
      return Response.json(
        {
          error:
            "The 24-hour WhatsApp window is closed. Use an approved template message for this customer.",
        },
        { status: 400 }
      );
    }

    const channel = String((conversation as any).channel || "")
      .toLowerCase()
      .trim();

    const businessSenderKey = String(
      (conversation as any).business_sender_key || ""
    ).trim();

    const phone =
      normalizePhone((conversation as any).phone_e164) ||
      normalizePhone((conversation as any).phone);

    if (!phone) {
      return Response.json(
        { error: "Customer WhatsApp phone number is missing." },
        { status: 400 }
      );
    }

    let sendResult: SendResult;
    let fromNumber = "";
    let toNumber = "";

    if (channel === "meta_whatsapp") {
      const phoneNumberId = getMetaDirectPhoneNumberId();
      const expectedSenderKey = getMetaDirectBusinessSenderKey();

      if (!phoneNumberId || !expectedSenderKey) {
        return Response.json(
          {
            error:
              "Meta Direct WhatsApp configuration is missing. Check META_DIRECT_* variables.",
          },
          { status: 500 }
        );
      }

      if (!businessSenderKey || businessSenderKey !== expectedSenderKey) {
        return Response.json(
          {
            error:
              "This Meta conversation is not tied to the configured Meta Direct business sender. Complete the WhatsApp conversation migration before replying.",
          },
          { status: 409 }
        );
      }

      sendResult = await sendMetaText({
        phoneNumberId,
        to: phone,
        message,
      });

      fromNumber = phoneNumberId;
      toNumber = phone;
    } else if (channel === "twilio_whatsapp") {
      const twilioFrom = getTwilioFromAddress();
      const expectedSenderKey = getTwilioBusinessSenderKey();

      if (!twilioFrom || !expectedSenderKey) {
        return Response.json(
          {
            error:
              "Twilio WhatsApp configuration is missing. Check TWILIO_* variables.",
          },
          { status: 500 }
        );
      }

      if (!businessSenderKey || businessSenderKey !== expectedSenderKey) {
        return Response.json(
          {
            error:
              "This Twilio conversation is not tied to the configured Tetamo Twilio sender. Complete the WhatsApp conversation migration before replying.",
          },
          { status: 409 }
        );
      }

      const twilioTo = toTwilioWhatsappAddress(phone);

      sendResult = await sendTwilioText({
        to: twilioTo,
        message,
      });

      fromNumber = twilioFrom;
      toNumber = twilioTo;
    } else {
      return Response.json(
        {
          error:
            "Unknown WhatsApp channel. This conversation is not marked as Meta Direct or Twilio.",
        },
        { status: 400 }
      );
    }

    if (!sendResult.success) {
      console.error("Admin WhatsApp send failed:", sendResult);

      return Response.json(
        {
          error: "Failed to send WhatsApp message.",
          provider: sendResult.provider,
          details: sendResult.error,
        },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();
    const source =
      sendResult.provider === "meta"
        ? "admin_meta_direct"
        : "admin_twilio_direct";

    const { error: messageError } = await supabaseAdmin
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        twilio_message_sid:
          sendResult.provider === "twilio" ? sendResult.messageId : null,
        direction: "outbound",
        from_number: fromNumber || null,
        to_number: toNumber || null,
        phone: `whatsapp:+${phone}`,
        profile_name: (conversation as any).profile_name || null,
        message,
        source,
        provider: sendResult.provider,
        provider_message_id: sendResult.messageId,
        ai_generated: false,
        admin_generated: true,
        media_count: 0,
        raw_payload: {
          admin_user_id: auth.userId,
          provider: sendResult.provider,
          provider_message_id: sendResult.messageId,
          provider_status: sendResult.status || null,
          sent_from_admin_dashboard: true,
        },
        created_at: now,
      });

    if (messageError) {
      console.error("Failed to save admin WhatsApp reply:", messageError);
    }

    const { error: updateError } = await supabaseAdmin
      .from("whatsapp_conversations")
      .update({
        status: "active",
        ai_enabled: false,
        handover_to_admin: true,
        handover_reason: "Admin replied manually",
        last_message: message,
        last_message_direction: "outbound",
        last_message_at: now,
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error(
        "Failed to update WhatsApp conversation after admin reply:",
        updateError
      );
    }

    return Response.json({
      success: true,
      provider: sendResult.provider,
      messageId: sendResult.messageId,
      status: sendResult.status || null,
    });
  } catch (error) {
    console.error("Admin WhatsApp send route error:", error);

    return Response.json(
      { error: "Failed to send WhatsApp message." },
      { status: 500 }
    );
  }
}