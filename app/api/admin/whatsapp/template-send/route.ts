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

type TemplateSendStatus = "sent" | "failed" | "skipped";
type SendProvider = "meta_cloud_api" | "twilio_whatsapp";

type CampaignConfig = {
  id: string;
  send_provider?: string | null;
  twilio_content_sid?: string | null;
  twilio_from?: string | null;
  template_name?: string | null;
  template_language?: string | null;
  template_category?: string | null;
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

function normalizePhone(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function phoneDisplay(phoneE164: string) {
  return phoneE164.startsWith("+") ? phoneE164 : `+${phoneE164}`;
}

function toTwilioWhatsappAddress(value?: string | null) {
  const raw = cleanEnv(value);

  if (!raw) return "";

  if (raw.toLowerCase().startsWith("whatsapp:")) {
    const number = raw.slice("whatsapp:".length).trim();
    const cleanNumber = number.startsWith("+")
      ? number
      : `+${normalizePhone(number)}`;

    return `whatsapp:${cleanNumber}`;
  }

  const digits = normalizePhone(raw);
  return digits ? `whatsapp:+${digits}` : "";
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeBodyVariables(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
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
      .map((key) => String(record[key] || "").trim())
      .filter(Boolean);
  }

  const single = String(value || "").trim();
  return single ? [single] : [];
}

function normalizeSendProvider(value?: string | null): SendProvider {
  const clean = cleanEnv(value).toLowerCase();

  if (
    clean === "twilio" ||
    clean === "twilio_whatsapp" ||
    clean === "twilio_content"
  ) {
    return "twilio_whatsapp";
  }

  return "meta_cloud_api";
}

function getMetaAccessToken() {
  return cleanEnv(process.env.META_WHATSAPP_ACCESS_TOKEN);
}

function getMetaPhoneNumberId() {
  return (
    cleanEnv(process.env.META_WHATSAPP_PHONE_NUMBER_ID) ||
    cleanEnv(process.env.WHATSAPP_PHONE_NUMBER_ID)
  );
}

function getGraphVersion() {
  return cleanEnv(process.env.META_GRAPH_VERSION) || "v25.0";
}

function getTwilioAccountSid() {
  return cleanEnv(process.env.TWILIO_ACCOUNT_SID);
}

function getTwilioAuthToken() {
  return cleanEnv(process.env.TWILIO_AUTH_TOKEN);
}

function getTwilioWhatsappFrom() {
  return toTwilioWhatsappAddress(process.env.TWILIO_WHATSAPP_FROM);
}

function getTwilioContentSidForTemplate(templateName: string) {
  const cleanTemplateName = cleanEnv(templateName);

  if (cleanTemplateName === "tetamo_agent_invite_id_01") {
    return cleanEnv(process.env.TWILIO_AGENT_INVITE_CONTENT_SID);
  }

  return "";
}

function getSendSource(sendType: string, sendProvider: SendProvider) {
  const providerPrefix =
    sendProvider === "twilio_whatsapp" ? "twilio_template" : "meta_template";

  if (sendType === "followup_3_day") return `${providerPrefix}_followup_3_day`;
  if (sendType === "followup_14_day") return `${providerPrefix}_followup_14_day`;
  if (sendType === "manual_template") return `admin_${providerPrefix}`;

  return `${providerPrefix}_business_initiated`;
}

function getFollowupUpdate(sendType: string) {
  const now = new Date().toISOString();

  if (sendType === "business_initiated") {
    return {
      followup_3_day_due_at: addDays(3),
      followup_14_day_due_at: addDays(14),
      followup_paused: false,
      followup_pause_reason: null,
      last_template_sent_at: now,
    };
  }

  if (sendType === "followup_3_day") {
    return {
      followup_3_day_sent_at: now,
      last_template_sent_at: now,
    };
  }

  if (sendType === "followup_14_day") {
    return {
      followup_14_day_sent_at: now,
      last_template_sent_at: now,
    };
  }

  return {
    last_template_sent_at: now,
  };
}

async function getCampaignConfig(
  campaignId: string | null
): Promise<CampaignConfig | null> {
  if (!campaignId) return null;

  const { data, error } = await supabaseAdmin
    .from("whatsapp_template_campaigns")
    .select(
      "id, send_provider, twilio_content_sid, twilio_from, template_name, template_language, template_category"
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load WhatsApp template campaign config:", error);
    return null;
  }

  return (data || null) as CampaignConfig | null;
}

async function updateCampaignTotals(
  campaignId: string | null,
  status: TemplateSendStatus
) {
  if (!campaignId) return;

  const { data } = await supabaseAdmin
    .from("whatsapp_template_campaigns")
    .select("total_sent, total_failed, total_skipped")
    .eq("id", campaignId)
    .maybeSingle();

  if (!data) return;

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status === "sent") {
    updatePayload.total_sent = Number((data as any).total_sent || 0) + 1;
  }

  if (status === "failed") {
    updatePayload.total_failed = Number((data as any).total_failed || 0) + 1;
  }

  if (status === "skipped") {
    updatePayload.total_skipped = Number((data as any).total_skipped || 0) + 1;
  }

  await supabaseAdmin
    .from("whatsapp_template_campaigns")
    .update(updatePayload)
    .eq("id", campaignId);
}

async function markRecipient(params: {
  recipientId: string | null;
  campaignId: string | null;
  phoneE164: string;
  status: TemplateSendStatus;
  metaMessageId?: string | null;
  twilioMessageSid?: string | null;
  errorPayload?: unknown;
  skipReason?: string | null;
}) {
  const now = new Date().toISOString();

  const updatePayload: Record<string, unknown> = {
    status: params.status,
    updated_at: now,
  };

  if (params.status === "sent") {
    updatePayload.sent_at = now;
    updatePayload.meta_message_id = params.metaMessageId || null;
    updatePayload.twilio_message_sid = params.twilioMessageSid || null;
    updatePayload.send_error = null;
  }

  if (params.status === "failed") {
    updatePayload.failed_at = now;
    updatePayload.send_error = params.errorPayload || null;
  }

  if (params.status === "skipped") {
    updatePayload.skipped_at = now;
    updatePayload.skip_reason = params.skipReason || "Skipped by system";
  }

  if (params.recipientId) {
    await supabaseAdmin
      .from("whatsapp_template_recipients")
      .update(updatePayload)
      .eq("id", params.recipientId);

    return;
  }

  if (params.campaignId) {
    await supabaseAdmin
      .from("whatsapp_template_recipients")
      .update(updatePayload)
      .eq("campaign_id", params.campaignId)
      .eq("phone_e164", params.phoneE164);
  }
}

async function getOrCreateContact(params: {
  phoneE164: string;
  customerName: string | null;
  leadType: string;
  source: string;
}) {
  const { data: existingContact, error: existingError } = await supabaseAdmin
    .from("whatsapp_contacts")
    .select("id, phone_e164, status, opted_out_at")
    .eq("phone_e164", params.phoneE164)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to check WhatsApp contact:", existingError);
  }

  if (existingContact?.id) {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (params.customerName) updatePayload.profile_name = params.customerName;
    if (params.leadType) updatePayload.lead_type = params.leadType;
    if (params.source) updatePayload.source = params.source;

    await supabaseAdmin
      .from("whatsapp_contacts")
      .update(updatePayload)
      .eq("id", existingContact.id);

    return existingContact as {
      id: string;
      phone_e164: string;
      status?: string | null;
      opted_out_at?: string | null;
    };
  }

  const { data: createdContact, error: createError } = await supabaseAdmin
    .from("whatsapp_contacts")
    .insert({
      phone_e164: params.phoneE164,
      phone_display: phoneDisplay(params.phoneE164),
      profile_name: params.customerName,
      lead_type: params.leadType || "unknown",
      source: params.source || "campaign_import",
      status: "active",
      first_seen_at: new Date().toISOString(),
    })
    .select("id, phone_e164, status, opted_out_at")
    .maybeSingle();

  if (createError || !createdContact?.id) {
    console.error("Failed to create WhatsApp contact:", createError);
    return null;
  }

  return createdContact as {
    id: string;
    phone_e164: string;
    status?: string | null;
    opted_out_at?: string | null;
  };
}

async function getOrCreateConversation(params: {
  phoneE164: string;
  customerName: string | null;
  contactId: string | null;
  leadType: string;
  sendProvider: SendProvider;
}) {
  const candidates = Array.from(
    new Set([params.phoneE164, phoneDisplay(params.phoneE164)])
  );

  const { data: existingConversation } = await supabaseAdmin
    .from("whatsapp_conversations")
    .select(
      "id, phone, phone_e164, profile_name, business_initiated_count, opted_out_at"
    )
    .in("phone_e164", candidates)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (existingConversation?.id) {
    const updatePayload: Record<string, unknown> = {
      contact_id: params.contactId,
      lead_type: params.leadType || "unknown",
      updated_at: new Date().toISOString(),
    };

    if (params.customerName) updatePayload.profile_name = params.customerName;

    await supabaseAdmin
      .from("whatsapp_conversations")
      .update(updatePayload)
      .eq("id", existingConversation.id);

    return existingConversation as {
      id: string;
      business_initiated_count?: number | null;
      opted_out_at?: string | null;
    };
  }

  const now = new Date().toISOString();
  const channel =
    params.sendProvider === "twilio_whatsapp"
      ? "twilio_whatsapp"
      : "meta_whatsapp";

  const { data: createdConversation, error: createError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .upsert(
      {
        phone: `whatsapp:${params.phoneE164}`,
        phone_e164: params.phoneE164,
        profile_name: params.customerName,
        channel,
        status: "active",
        ai_enabled: true,
        handover_to_admin: false,
        contact_id: params.contactId,
        lead_type: params.leadType || "unknown",
        created_at: now,
        updated_at: now,
      },
      {
        onConflict: "phone",
      }
    )
    .select(
      "id, phone, phone_e164, profile_name, business_initiated_count, opted_out_at"
    )
    .maybeSingle();

  if (createError || !createdConversation?.id) {
    console.error("Failed to create WhatsApp conversation:", createError);
    return null;
  }

  return createdConversation as {
    id: string;
    business_initiated_count?: number | null;
    opted_out_at?: string | null;
  };
}

async function insertSendLog(params: {
  campaignId: string | null;
  recipientId: string | null;
  conversationId: string | null;
  contactId: string | null;
  phoneE164: string;
  templateName: string;
  templateLanguage: string;
  templateCategory: string;
  sendType: string;
  sendProvider: SendProvider;
  status: TemplateSendStatus;
  metaMessageId?: string | null;
  twilioMessageSid?: string | null;
  twilioContentSid?: string | null;
  errorPayload?: unknown;
  rawPayload?: unknown;
}) {
  const now = new Date().toISOString();

  await supabaseAdmin.from("whatsapp_template_send_logs").insert({
    campaign_id: params.campaignId,
    recipient_id: params.recipientId,
    conversation_id: params.conversationId,
    contact_id: params.contactId,
    phone_e164: params.phoneE164,
    template_name: params.templateName,
    template_language: params.templateLanguage,
    template_category: params.templateCategory,
    send_type: params.sendType,
    provider: params.sendProvider === "twilio_whatsapp" ? "twilio" : "meta",
    send_provider: params.sendProvider,
    status: params.status,
    meta_message_id: params.metaMessageId || null,
    twilio_message_sid: params.twilioMessageSid || null,
    twilio_content_sid: params.twilioContentSid || null,
    error_payload: params.errorPayload || null,
    sent_at: params.status === "sent" ? now : null,
    failed_at: params.status === "failed" ? now : null,
    raw_payload: params.rawPayload || {},
    created_at: now,
    updated_at: now,
  });
}

async function sendMetaTemplate(params: {
  phoneNumberId: string;
  accessToken: string;
  phoneE164: string;
  templateName: string;
  templateLanguage: string;
  bodyVariables: string[];
}) {
  const templatePayload: Record<string, unknown> = {
    name: params.templateName,
    language: {
      code: params.templateLanguage,
    },
  };

  if (params.bodyVariables.length > 0) {
    templatePayload.components = [
      {
        type: "body",
        parameters: params.bodyVariables.map((text) => ({
          type: "text",
          text,
        })),
      },
    ];
  }

  const payload = {
    messaging_product: "whatsapp",
    to: params.phoneE164,
    type: "template",
    template: templatePayload,
  };

  const response = await fetch(
    `https://graph.facebook.com/${getGraphVersion()}/${params.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      success: false,
      messageId: null,
      result,
      payload,
    };
  }

  return {
    success: true,
    messageId: result?.messages?.[0]?.id || null,
    result,
    payload,
  };
}

function buildTwilioContentVariables(bodyVariables: string[]) {
  if (!bodyVariables.length) return "";

  const variables: Record<string, string> = {};

  bodyVariables.forEach((value, index) => {
    variables[String(index + 1)] = value;
  });

  return JSON.stringify(variables);
}

async function sendTwilioTemplate(params: {
  accountSid: string;
  authToken: string;
  from: string;
  phoneE164: string;
  contentSid: string;
  bodyVariables: string[];
}) {
  const to = toTwilioWhatsappAddress(params.phoneE164);
  const contentVariables = buildTwilioContentVariables(params.bodyVariables);

  const form = new URLSearchParams({
    From: params.from,
    To: to,
    ContentSid: params.contentSid,
  });

  if (contentVariables) {
    form.set("ContentVariables", contentVariables);
  }

  const payload = {
    from: params.from,
    to,
    contentSid: params.contentSid,
    contentVariables: contentVariables ? JSON.parse(contentVariables) : null,
  };

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${params.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${params.accountSid}:${params.authToken}`).toString(
            "base64"
          ),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
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
      messageId: null,
      status: null,
      result,
      payload,
    };
  }

  return {
    success: true,
    messageId: result?.sid || null,
    status: result?.status || null,
    result,
    payload,
  };
}

async function saveOutboundTemplateMessage(params: {
  conversationId: string;
  contactId: string | null;
  phoneE164: string;
  customerName: string | null;
  templateName: string;
  templateLanguage: string;
  bodyVariables: string[];
  sendType: string;
  sendProvider: SendProvider;
  metaMessageId: string | null;
  twilioMessageSid: string | null;
  twilioContentSid: string | null;
  sendResult: unknown;
}) {
  const now = new Date().toISOString();
  const source = getSendSource(params.sendType, params.sendProvider);

  const providerLabel =
    params.sendProvider === "twilio_whatsapp" ? "Twilio Template" : "Template";

  const message =
    params.bodyVariables.length > 0
      ? `[${providerLabel}] ${params.templateName}\nVariables: ${params.bodyVariables.join(
          " | "
        )}`
      : `[${providerLabel}] ${params.templateName}`;

  await supabaseAdmin.from("whatsapp_messages").insert({
    conversation_id: params.conversationId,
    direction: "outbound",
    from_number:
      params.sendProvider === "twilio_whatsapp"
        ? getTwilioWhatsappFrom() || "twilio_whatsapp"
        : getMetaPhoneNumberId() || "meta_whatsapp",
    to_number: params.phoneE164,
    phone: `whatsapp:${params.phoneE164}`,
    profile_name: params.customerName,
    message,
    source,
    ai_generated: false,
    admin_generated: true,
    media_count: 0,
    raw_payload: {
      template_name: params.templateName,
      template_language: params.templateLanguage,
      body_variables: params.bodyVariables,
      send_type: params.sendType,
      send_provider: params.sendProvider,
      meta_message_id: params.metaMessageId,
      twilio_message_sid: params.twilioMessageSid,
      twilio_content_sid: params.twilioContentSid,
      send_result: params.sendResult,
      contact_id: params.contactId,
    },
    created_at: now,
  });
}

async function updateAfterSuccessfulSend(params: {
  conversationId: string;
  contactId: string | null;
  phoneE164: string;
  templateName: string;
  sendType: string;
  currentBusinessInitiatedCount?: number | null;
}) {
  const now = new Date().toISOString();

  const conversationUpdate: Record<string, unknown> = {
    last_message: `[Template] ${params.templateName}`,
    last_message_direction: "outbound",
    last_message_at: now,
    updated_at: now,
    ...getFollowupUpdate(params.sendType),
  };

  if (params.sendType === "business_initiated") {
    conversationUpdate.business_initiated_count =
      Number(params.currentBusinessInitiatedCount || 0) + 1;
  }

  await supabaseAdmin
    .from("whatsapp_conversations")
    .update(conversationUpdate)
    .eq("id", params.conversationId);

  if (params.contactId) {
    await supabaseAdmin
      .from("whatsapp_contacts")
      .update({
        last_outbound_at: now,
        last_template_sent_at: now,
        updated_at: now,
      })
      .eq("id", params.contactId);
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json().catch(() => null);

    const phoneE164 = normalizePhone(
      body?.phoneE164 || body?.phone || body?.to || ""
    );

    const campaignId = cleanEnv(body?.campaignId || body?.campaign_id) || null;

    const recipientId =
      cleanEnv(body?.recipientId || body?.recipient_id) || null;

    const campaignConfig = await getCampaignConfig(campaignId);

    const templateName = cleanEnv(
      body?.templateName ||
        body?.template_name ||
        campaignConfig?.template_name ||
        ""
    );

    const templateLanguage = cleanEnv(
      body?.templateLanguage ||
        body?.template_language ||
        campaignConfig?.template_language ||
        "en"
    );

    const templateCategory = cleanEnv(
      body?.templateCategory ||
        body?.template_category ||
        campaignConfig?.template_category ||
        "marketing"
    );

    const sendType =
      cleanEnv(body?.sendType || body?.send_type) || "business_initiated";

    const sendProvider = normalizeSendProvider(
      body?.sendProvider ||
        body?.send_provider ||
        campaignConfig?.send_provider ||
        "meta_cloud_api"
    );

    const customerName =
      cleanEnv(body?.customerName || body?.customer_name) || null;

    const leadType = cleanEnv(body?.leadType || body?.lead_type) || "unknown";

    const source = cleanEnv(body?.source) || "template_send_api";

    const bodyVariables = normalizeBodyVariables(
      body?.bodyVariables || body?.body_variables || body?.variables
    );

    const twilioContentSid =
      cleanEnv(
        body?.twilioContentSid ||
          body?.twilio_content_sid ||
          campaignConfig?.twilio_content_sid
      ) || getTwilioContentSidForTemplate(templateName);

    const twilioFrom =
      toTwilioWhatsappAddress(
        body?.twilioFrom || body?.twilio_from || campaignConfig?.twilio_from
      ) || getTwilioWhatsappFrom();

    if (!phoneE164) {
      return Response.json({ error: "phoneE164 is required." }, { status: 400 });
    }

    if (!templateName) {
      return Response.json(
        { error: "templateName is required." },
        { status: 400 }
      );
    }

    if (sendProvider === "meta_cloud_api") {
      const accessToken = getMetaAccessToken();
      const phoneNumberId = getMetaPhoneNumberId();

      if (!accessToken || !phoneNumberId) {
        return Response.json(
          {
            error:
              "Missing Meta environment variables. Check META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID.",
          },
          { status: 500 }
        );
      }
    }

    if (sendProvider === "twilio_whatsapp") {
      if (!getTwilioAccountSid() || !getTwilioAuthToken()) {
        return Response.json(
          {
            error:
              "Missing Twilio environment variables. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.",
          },
          { status: 500 }
        );
      }

      if (!twilioFrom) {
        return Response.json(
          {
            error:
              "Missing Twilio WhatsApp sender. Check TWILIO_WHATSAPP_FROM or campaign twilio_from.",
          },
          { status: 500 }
        );
      }

      if (!twilioContentSid) {
        return Response.json(
          {
            error:
              "Missing Twilio ContentSid. Check TWILIO_AGENT_INVITE_CONTENT_SID or campaign twilio_content_sid.",
          },
          { status: 500 }
        );
      }
    }

    const contact = await getOrCreateContact({
      phoneE164,
      customerName,
      leadType,
      source,
    });

    if (!contact?.id) {
      return Response.json(
        { error: "Failed to create or load WhatsApp contact." },
        { status: 500 }
      );
    }

    if (contact.opted_out_at || contact.status === "opted_out") {
      await markRecipient({
        recipientId,
        campaignId,
        phoneE164,
        status: "skipped",
        skipReason: "Contact opted out.",
      });

      await insertSendLog({
        campaignId,
        recipientId,
        conversationId: null,
        contactId: contact.id,
        phoneE164,
        templateName,
        templateLanguage,
        templateCategory,
        sendType,
        sendProvider,
        status: "skipped",
        twilioContentSid:
          sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
        errorPayload: { reason: "Contact opted out." },
      });

      await updateCampaignTotals(campaignId, "skipped");

      return Response.json({
        success: true,
        skipped: true,
        reason: "Contact opted out.",
      });
    }

    const conversation = await getOrCreateConversation({
      phoneE164,
      customerName,
      contactId: contact.id,
      leadType,
      sendProvider,
    });

    if (!conversation?.id) {
      return Response.json(
        { error: "Failed to create or load WhatsApp conversation." },
        { status: 500 }
      );
    }

    if (conversation.opted_out_at) {
      await markRecipient({
        recipientId,
        campaignId,
        phoneE164,
        status: "skipped",
        skipReason: "Conversation opted out.",
      });

      await insertSendLog({
        campaignId,
        recipientId,
        conversationId: conversation.id,
        contactId: contact.id,
        phoneE164,
        templateName,
        templateLanguage,
        templateCategory,
        sendType,
        sendProvider,
        status: "skipped",
        twilioContentSid:
          sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
        errorPayload: { reason: "Conversation opted out." },
      });

      await updateCampaignTotals(campaignId, "skipped");

      return Response.json({
        success: true,
        skipped: true,
        reason: "Conversation opted out.",
      });
    }

    const sendResult =
      sendProvider === "twilio_whatsapp"
        ? await sendTwilioTemplate({
            accountSid: getTwilioAccountSid(),
            authToken: getTwilioAuthToken(),
            from: twilioFrom,
            phoneE164,
            contentSid: twilioContentSid,
            bodyVariables,
          })
        : await sendMetaTemplate({
            phoneNumberId: getMetaPhoneNumberId(),
            accessToken: getMetaAccessToken(),
            phoneE164,
            templateName,
            templateLanguage,
            bodyVariables,
          });

    if (!sendResult.success) {
      await markRecipient({
        recipientId,
        campaignId,
        phoneE164,
        status: "failed",
        errorPayload: sendResult.result,
      });

      await insertSendLog({
        campaignId,
        recipientId,
        conversationId: conversation.id,
        contactId: contact.id,
        phoneE164,
        templateName,
        templateLanguage,
        templateCategory,
        sendType,
        sendProvider,
        status: "failed",
        twilioContentSid:
          sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
        errorPayload: sendResult.result,
        rawPayload: sendResult.payload,
      });

      await updateCampaignTotals(campaignId, "failed");

      return Response.json(
        {
          success: false,
          error:
            sendProvider === "twilio_whatsapp"
              ? "Twilio template send failed."
              : "Meta template send failed.",
          details: sendResult.result,
        },
        { status: 502 }
      );
    }

    const metaMessageId =
      sendProvider === "meta_cloud_api" ? sendResult.messageId : null;

    const twilioMessageSid =
      sendProvider === "twilio_whatsapp" ? sendResult.messageId : null;

    await saveOutboundTemplateMessage({
      conversationId: conversation.id,
      contactId: contact.id,
      phoneE164,
      customerName,
      templateName,
      templateLanguage,
      bodyVariables,
      sendType,
      sendProvider,
      metaMessageId,
      twilioMessageSid,
      twilioContentSid:
        sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
      sendResult: sendResult.result,
    });

    await updateAfterSuccessfulSend({
      conversationId: conversation.id,
      contactId: contact.id,
      phoneE164,
      templateName,
      sendType,
      currentBusinessInitiatedCount: conversation.business_initiated_count,
    });

    await markRecipient({
      recipientId,
      campaignId,
      phoneE164,
      status: "sent",
      metaMessageId,
      twilioMessageSid,
    });

    await insertSendLog({
      campaignId,
      recipientId,
      conversationId: conversation.id,
      contactId: contact.id,
      phoneE164,
      templateName,
      templateLanguage,
      templateCategory,
      sendType,
      sendProvider,
      status: "sent",
      metaMessageId,
      twilioMessageSid,
      twilioContentSid:
        sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
      rawPayload:
        sendProvider === "twilio_whatsapp"
          ? {
              twilio_payload: sendResult.payload,
              twilio_result: sendResult.result,
            }
          : {
              meta_payload: sendResult.payload,
              meta_result: sendResult.result,
            },
    });

    await updateCampaignTotals(campaignId, "sent");

    return Response.json({
      success: true,
      provider: sendProvider === "twilio_whatsapp" ? "twilio" : "meta",
      sendProvider,
      phoneE164,
      conversationId: conversation.id,
      contactId: contact.id,
      templateName,
      templateLanguage,
      sendType,
      metaMessageId,
      twilioMessageSid,
      twilioContentSid:
        sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
      twilioStatus:
  sendProvider === "twilio_whatsapp" && "status" in sendResult
    ? sendResult.status
    : null,
    });
  } catch (error) {
    console.error("WhatsApp template send API error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send WhatsApp template.",
      },
      { status: 500 }
    );
  }
}