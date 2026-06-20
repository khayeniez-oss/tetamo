export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewMessageBody = {
  phone?: string;
  phoneE164?: string;
  to?: string;
  customerName?: string;
  customer_name?: string;
  message?: string;
  templateName?: string;
  template_name?: string;
  templateLanguage?: string;
  template_language?: string;
  templateCategory?: string;
  template_category?: string;
  sendProvider?: string;
  send_provider?: string;
  bodyVariables?: unknown;
  body_variables?: unknown;
  variables?: unknown;
  leadType?: string;
  lead_type?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function normalizePhone(value: unknown) {
  return String(value || "")
    .replace(/^whatsapp:/i, "")
    .replace(/\D/g, "");
}

function normalizeBodyVariables(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => clean(item)).filter(Boolean);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    return Object.keys(record)
      .sort((a, b) => {
        const numA = Number(a);
        const numB = Number(b);

        if (Number.isFinite(numA) && Number.isFinite(numB)) {
          return numA - numB;
        }

        return a.localeCompare(b);
      })
      .map((key) => clean(record[key]))
      .filter(Boolean);
  }

  const single = clean(value);
  return single ? [single] : [];
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader;
}

export async function POST(req: Request) {
  try {
    const authorization = getBearerToken(req);

    if (!authorization) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized. Login is required.",
        },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => null)) as NewMessageBody | null;

    if (!body) {
      return Response.json(
        {
          success: false,
          error: "Request body is required.",
        },
        { status: 400 }
      );
    }

    const phoneE164 = normalizePhone(body.phoneE164 || body.phone || body.to);

    if (!phoneE164) {
      return Response.json(
        {
          success: false,
          error: "WhatsApp phone number is required.",
        },
        { status: 400 }
      );
    }

    const message = clean(body.message);

    const templateName =
      clean(body.templateName || body.template_name) ||
      clean(process.env.WHATSAPP_NEW_MESSAGE_TEMPLATE_NAME) ||
      "tetamo_agent_invite_id_01";

    const templateLanguage =
      clean(body.templateLanguage || body.template_language) ||
      clean(process.env.WHATSAPP_NEW_MESSAGE_TEMPLATE_LANGUAGE) ||
      "id";

    const templateCategory =
      clean(body.templateCategory || body.template_category) ||
      clean(process.env.WHATSAPP_NEW_MESSAGE_TEMPLATE_CATEGORY) ||
      "marketing";

    const sendProvider =
      clean(body.sendProvider || body.send_provider) ||
      clean(process.env.WHATSAPP_NEW_MESSAGE_PROVIDER) ||
      "meta_cloud_api";

    const customerName =
      clean(body.customerName || body.customer_name) || null;

    const leadType = clean(body.leadType || body.lead_type) || "manual_admin";

    const providedVariables =
      body.bodyVariables || body.body_variables || body.variables;

    const bodyVariables =
      normalizeBodyVariables(providedVariables).length > 0
        ? normalizeBodyVariables(providedVariables)
        : message
        ? [message]
        : [];

    if (!templateName) {
      return Response.json(
        {
          success: false,
          error: "Template name is required.",
        },
        { status: 400 }
      );
    }

    const origin = new URL(req.url).origin;

    const templateResponse = await fetch(
      `${origin}/api/admin/whatsapp/template-send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
        body: JSON.stringify({
          phoneE164,
          customerName,
          templateName,
          templateLanguage,
          templateCategory,
          sendProvider,
          sendType: "business_initiated",
          leadType,
          source: "admin_create_message",
          bodyVariables,
        }),
      }
    );

    const result = await templateResponse.json().catch(() => null);

    if (!templateResponse.ok || !result?.success) {
      return Response.json(
        {
          success: false,
          error:
            result?.error ||
            "Failed to create and send the WhatsApp message.",
          details: result?.details || result || null,
        },
        { status: templateResponse.status || 500 }
      );
    }

    return Response.json({
      success: true,
      provider: result.provider,
      sendProvider: result.sendProvider,
      phoneE164: result.phoneE164 || phoneE164,
      conversationId: result.conversationId,
      contactId: result.contactId,
      templateName: result.templateName || templateName,
      templateLanguage: result.templateLanguage || templateLanguage,
      sendType: result.sendType || "business_initiated",
      metaMessageId: result.metaMessageId || null,
      twilioMessageSid: result.twilioMessageSid || null,
      twilioContentSid: result.twilioContentSid || null,
      twilioStatus: result.twilioStatus || null,
      skipped: Boolean(result.skipped),
      reason: result.reason || null,
    });
  } catch (error) {
    console.error("Admin WhatsApp new-message route error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create WhatsApp message.",
      },
      { status: 500 }
    );
  }
}