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

type TemplateSendStatus =
  | "sent"
  | "failed"
  | "skipped";

type CampaignConfig = {
  id: string;
  send_provider?: string | null;
  template_name?: string | null;
  template_language?: string | null;
  category?: string | null;
  campaign_type?: string | null;
};

type MetaTemplate = {
  id: string;
  template_name: string;
  display_name: string;
  category: string;
  language_code: string;
  meta_status: string;
  quality_status: string;
  body_text: string | null;
  variable_count: number;
  variable_examples:
    | Record<string, unknown>
    | null;
  variable_definitions:
    | Array<Record<string, unknown>>
    | null;
  header_type: string | null;
  footer_text: string | null;
  website_button_text: string | null;
  website_url: string | null;
  quick_reply_text: string | null;
  buttons: unknown;
  is_active: boolean;
};

const META_PROVIDER = "meta_cloud_api";

const TEMPLATE_SELECT = `
  id,
  template_name,
  display_name,
  category,
  language_code,
  meta_status,
  quality_status,
  body_text,
  variable_count,
  variable_examples,
  variable_definitions,
  header_type,
  footer_text,
  website_button_text,
  website_url,
  quick_reply_text,
  buttons,
  is_active
`;

function cleanText(value?: unknown) {
  return String(value || "").trim();
}

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

function getBearerToken(req: Request) {
  const authHeader =
    req.headers.get("authorization") || "";

  if (
    !authHeader
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return "";
  }

  return authHeader.slice(7).trim();
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
          success: false,
          error:
            "Supabase server environment variables are missing.",
        },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorized: false,
      response: Response.json(
        {
          success: false,
          error:
            "Unauthorized. Login is required.",
        },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(
    token
  );

  if (userError || !user) {
    return {
      authorized: false,
      response: Response.json(
        {
          success: false,
          error:
            "Unauthorized. Invalid session.",
        },
        { status: 401 }
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
          success: false,
          error:
            "Unable to verify admin access.",
        },
        { status: 500 }
      ),
    };
  }

  const role = cleanText(
    (profile as any)?.role
  ).toLowerCase();

  if (!role.includes("admin")) {
    return {
      authorized: false,
      response: Response.json(
        {
          success: false,
          error:
            "Forbidden. Admin access is required.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
  };
}

function normalizePhone(value?: unknown) {
  let phone = cleanText(value)
    .replace(/^whatsapp:/i, "")
    .replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("0")) {
    phone = `62${phone.slice(1)}`;
  }

  if (phone.startsWith("8")) {
    phone = `62${phone}`;
  }

  return phone;
}

function isValidPhone(phone: string) {
  return (
    phone.length >= 8 &&
    phone.length <= 16
  );
}

function phoneDisplay(phone: string) {
  return phone.startsWith("+")
    ? phone
    : `+${phone}`;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date.toISOString();
}

function normalizeVariableRecord(
  value: unknown
): Record<string, string> {
  if (!value) {
    return {};
  }

  if (Array.isArray(value)) {
    return value.reduce<
      Record<string, string>
    >((result, item, index) => {
      const text = cleanText(item);

      if (text) {
        result[String(index + 1)] =
          text;
      }

      return result;
    }, {});
  }

  if (typeof value === "object") {
    const record =
      value as Record<string, unknown>;

    const normalized: Record<
      string,
      string
    > = {};

    for (const [key, item] of Object.entries(
      record
    )) {
      const cleanKey = cleanText(key);
      const cleanValue = cleanText(item);

      if (cleanKey && cleanValue) {
        normalized[cleanKey] =
          cleanValue;
      }
    }

    return normalized;
  }

  const single = cleanText(value);

  return single
    ? {
        "1": single,
      }
    : {};
}

function getOrderedBodyVariables(
  variables: Record<string, string>,
  variableCount: number
) {
  const result: string[] = [];

  for (
    let index = 1;
    index <= variableCount;
    index += 1
  ) {
    result.push(
      cleanText(variables[String(index)])
    );
  }

  return result;
}

function getMissingVariables(
  variables: Record<string, string>,
  variableCount: number
) {
  const missing: number[] = [];

  for (
    let index = 1;
    index <= variableCount;
    index += 1
  ) {
    if (
      !cleanText(
        variables[String(index)]
      )
    ) {
      missing.push(index);
    }
  }

  return missing;
}

function getMetaAccessToken() {
  return (
    cleanEnv(
      process.env
        .META_DIRECT_WHATSAPP_ACCESS_TOKEN
    ) ||
    cleanEnv(
      process.env
        .META_WHATSAPP_ACCESS_TOKEN
    )
  );
}

function getMetaPhoneNumberId() {
  return (
    cleanEnv(
      process.env
        .META_DIRECT_WHATSAPP_PHONE_NUMBER_ID
    ) ||
    cleanEnv(
      process.env
        .META_WHATSAPP_PHONE_NUMBER_ID
    ) ||
    cleanEnv(
      process.env
        .WHATSAPP_PHONE_NUMBER_ID
    )
  );
}

function getGraphVersion() {
  return (
    cleanEnv(
      process.env.META_GRAPH_VERSION
    ) || "v25.0"
  );
}

function getMetaBusinessSenderKey(
  phoneNumberId: string
) {
  const cleanPhoneNumberId =
    cleanText(phoneNumberId);

  return cleanPhoneNumberId
    ? `meta:${cleanPhoneNumberId}`
    : "";
}

function getConversationKey(
  businessSenderKey: string,
  customerPhone: string
) {
  const sender =
    cleanText(businessSenderKey);

  const phone =
    normalizePhone(customerPhone);

  if (!sender || !phone) {
    return "";
  }

  return `${sender}:${phone}`;
}

function getSendSource(sendType: string) {
  if (sendType === "followup_3_day") {
    return "meta_template_followup_3_day";
  }

  if (sendType === "followup_14_day") {
    return "meta_template_followup_14_day";
  }

  if (sendType === "manual_template") {
    return "admin_meta_template";
  }

  return "meta_template_business_initiated";
}

function getFollowupUpdate(
  sendType: string
) {
  const now =
    new Date().toISOString();

  if (
    sendType === "business_initiated"
  ) {
    return {
      followup_3_day_due_at:
        addDays(3),
      followup_14_day_due_at:
        addDays(14),
      followup_paused: false,
      followup_pause_reason: null,
      last_template_sent_at: now,
    };
  }

  if (
    sendType === "followup_3_day"
  ) {
    return {
      followup_3_day_sent_at: now,
      last_template_sent_at: now,
    };
  }

  if (
    sendType === "followup_14_day"
  ) {
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
  if (!campaignId) {
    return null;
  }

  const { data, error } =
    await supabaseAdmin
      .from(
        "whatsapp_template_campaigns"
      )
      .select(
        `
          id,
          send_provider,
          template_name,
          template_language,
          category,
          campaign_type
        `
      )
      .eq("id", campaignId)
      .maybeSingle();

  if (error) {
    console.error(
      "Failed to load WhatsApp campaign config:",
      error
    );

    return null;
  }

  return (
    (data as CampaignConfig | null) ||
    null
  );
}

async function getApprovedTemplate(
  templateName: string
): Promise<MetaTemplate | null> {
  const { data, error } =
    await supabaseAdmin
      .from("whatsapp_templates")
      .select(TEMPLATE_SELECT)
      .eq(
        "template_name",
        templateName
      )
      .eq("is_active", true)
      .eq("meta_status", "active")
      .maybeSingle();

  if (error) {
    console.error(
      "Failed to load approved Meta template:",
      error
    );

    return null;
  }

  return (
    (data as MetaTemplate | null) ||
    null
  );
}

async function markRecipient(params: {
  recipientId: string | null;
  campaignId: string | null;
  phoneE164: string;
  status: TemplateSendStatus;
  metaMessageId?: string | null;
  errorPayload?: unknown;
  skipReason?: string | null;
}) {
  const now =
    new Date().toISOString();

  const updatePayload: Record<
    string,
    unknown
  > = {
    status: params.status,
    updated_at: now,
  };

  if (params.status === "sent") {
    updatePayload.sent_at = now;
    updatePayload.failed_at = null;
    updatePayload.skipped_at = null;
    updatePayload.meta_message_id =
      params.metaMessageId || null;
    updatePayload.twilio_message_sid =
      null;
    updatePayload.send_error = null;
    updatePayload.skip_reason = null;
  }

  if (params.status === "failed") {
    updatePayload.failed_at = now;
    updatePayload.send_error =
      params.errorPayload || null;
  }

  if (params.status === "skipped") {
    updatePayload.skipped_at = now;
    updatePayload.skip_reason =
      params.skipReason ||
      "Skipped by system";
  }

  if (params.recipientId) {
    const { error } =
      await supabaseAdmin
        .from(
          "whatsapp_template_recipients"
        )
        .update(updatePayload)
        .eq(
          "id",
          params.recipientId
        );

    if (error) {
      console.error(
        "Failed to update campaign recipient:",
        error
      );
    }

    return;
  }

  if (params.campaignId) {
    const { error } =
      await supabaseAdmin
        .from(
          "whatsapp_template_recipients"
        )
        .update(updatePayload)
        .eq(
          "campaign_id",
          params.campaignId
        )
        .eq(
          "phone_e164",
          params.phoneE164
        );

    if (error) {
      console.error(
        "Failed to update campaign recipient by phone:",
        error
      );
    }
  }
}

async function getOrCreateContact(params: {
  phoneE164: string;
  customerName: string | null;
  leadType: string;
  source: string;
}) {
  const {
    data: existingContact,
    error: existingError,
  } = await supabaseAdmin
    .from("whatsapp_contacts")
    .select(
      `
        id,
        phone_e164,
        status,
        opted_out_at
      `
    )
    .eq(
      "phone_e164",
      params.phoneE164
    )
    .maybeSingle();

  if (existingError) {
    console.error(
      "Failed to check WhatsApp contact:",
      existingError
    );
  }

  if (existingContact?.id) {
    const updatePayload: Record<
      string,
      unknown
    > = {
      updated_at:
        new Date().toISOString(),
    };

    if (params.customerName) {
      updatePayload.profile_name =
        params.customerName;
    }

    if (params.leadType) {
      updatePayload.lead_type =
        params.leadType;
    }

    if (params.source) {
      updatePayload.source =
        params.source;
    }

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

  const {
    data: createdContact,
    error: createError,
  } = await supabaseAdmin
    .from("whatsapp_contacts")
    .insert({
      phone_e164: params.phoneE164,
      phone_display: phoneDisplay(
        params.phoneE164
      ),
      profile_name:
        params.customerName,
      lead_type:
        params.leadType || "unknown",
      source:
        params.source ||
        "template_send_api",
      status: "active",
      first_seen_at:
        new Date().toISOString(),
      updated_at:
        new Date().toISOString(),
    })
    .select(
      `
        id,
        phone_e164,
        status,
        opted_out_at
      `
    )
    .maybeSingle();

  if (
    createError ||
    !createdContact?.id
  ) {
    console.error(
      "Failed to create WhatsApp contact:",
      createError
    );

    return null;
  }

  return createdContact as {
    id: string;
    phone_e164: string;
    status?: string | null;
    opted_out_at?: string | null;
  };
}

async function getOrCreateConversation(
  params: {
    phoneE164: string;
    customerName: string | null;
    contactId: string | null;
    leadType: string;
    businessSenderKey: string;
  }
) {
  const now =
    new Date().toISOString();

  const conversationKey =
    getConversationKey(
      params.businessSenderKey,
      params.phoneE164
    );

  if (!conversationKey) {
    console.error(
      "Failed to build Meta WhatsApp conversation identity."
    );

    return null;
  }

  const { data, error } =
    await supabaseAdmin
      .from(
        "whatsapp_conversations"
      )
      .upsert(
        {
          phone: `whatsapp:+${params.phoneE164}`,
          phone_e164:
            params.phoneE164,
          profile_name:
            params.customerName,
          channel: "meta_whatsapp",
          business_sender_key:
            params.businessSenderKey,
          conversation_key:
            conversationKey,
          status: "active",
          contact_id:
            params.contactId,
          lead_type:
            params.leadType ||
            "unknown",
          updated_at: now,
        },
        {
          onConflict:
            "conversation_key",
        }
      )
      .select(
        `
          id,
          phone,
          phone_e164,
          profile_name,
          channel,
          business_sender_key,
          conversation_key,
          business_initiated_count,
          opted_out_at
        `
      )
      .maybeSingle();

  if (error || !data?.id) {
    console.error(
      "Failed to create or load Meta WhatsApp conversation:",
      error
    );

    return null;
  }

  return data as {
    id: string;
    phone?: string | null;
    phone_e164?: string | null;
    channel?: string | null;
    business_sender_key?:
      | string
      | null;
    conversation_key?:
      | string
      | null;
    business_initiated_count?:
      | number
      | null;
    opted_out_at?:
      | string
      | null;
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
  status: TemplateSendStatus;
  metaMessageId?: string | null;
  errorPayload?: unknown;
  rawPayload?: unknown;
}) {
  const now =
    new Date().toISOString();

  const { error } =
    await supabaseAdmin
      .from(
        "whatsapp_template_send_logs"
      )
      .insert({
        campaign_id:
          params.campaignId,
        recipient_id:
          params.recipientId,
        conversation_id:
          params.conversationId,
        contact_id: params.contactId,
        phone_e164: params.phoneE164,
        template_name:
          params.templateName,
        template_language:
          params.templateLanguage,
        template_category:
          params.templateCategory,
        send_type: params.sendType,
        provider: "meta",
        send_provider: META_PROVIDER,
        status: params.status,
        meta_message_id:
          params.metaMessageId || null,

        // Legacy Twilio fields remain
        // empty for schema compatibility.
        twilio_message_sid: null,
        twilio_content_sid: null,

        error_payload:
          params.errorPayload || null,
        sent_at:
          params.status === "sent"
            ? now
            : null,
        failed_at:
          params.status === "failed"
            ? now
            : null,
        raw_payload:
          params.rawPayload || {},
        created_at: now,
        updated_at: now,
      });

  if (error) {
    console.error(
      "Failed to insert WhatsApp template send log:",
      error
    );
  }
}

async function sendMetaTemplate(params: {
  phoneNumberId: string;
  accessToken: string;
  phoneE164: string;
  templateName: string;
  templateLanguage: string;
  bodyVariables: string[];
}) {
  const templatePayload: Record<
    string,
    unknown
  > = {
    name: params.templateName,
    language: {
      code: params.templateLanguage,
    },
  };

  if (
    params.bodyVariables.length > 0
  ) {
    templatePayload.components = [
      {
        type: "body",
        parameters:
          params.bodyVariables.map(
            (text) => ({
              type: "text",
              text,
            })
          ),
      },
    ];
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.phoneE164,
    type: "template",
    template: templatePayload,
  };

  const response = await fetch(
    `https://graph.facebook.com/${getGraphVersion()}/${params.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization:
          `Bearer ${params.accessToken}`,
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const result = await response
    .json()
    .catch(() => null);

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      messageId: null,
      result,
      payload,
    };
  }

  return {
    success: true,
    status: response.status,
    messageId:
      result?.messages?.[0]?.id ||
      null,
    result,
    payload,
  };
}

async function saveOutboundTemplateMessage(
  params: {
    conversationId: string;
    contactId: string | null;
    phoneE164: string;
    customerName: string | null;
    templateName: string;
    templateLanguage: string;
    bodyVariables: string[];
    sendType: string;
    businessSender: string;
    metaMessageId: string | null;
    sendResult: unknown;
  }
) {
  const now =
    new Date().toISOString();

  const message =
    params.bodyVariables.length > 0
      ? `[Meta Template] ${params.templateName}\nVariables: ${params.bodyVariables.join(
          " | "
        )}`
      : `[Meta Template] ${params.templateName}`;

  const { error } =
    await supabaseAdmin
      .from("whatsapp_messages")
      .insert({
        conversation_id:
          params.conversationId,

        // Legacy Twilio field.
        twilio_message_sid: null,

        direction: "outbound",
        from_number:
          params.businessSender,
        to_number:
          params.phoneE164,
        phone:
          `whatsapp:+${params.phoneE164}`,
        profile_name:
          params.customerName,
        message,
        source: getSendSource(
          params.sendType
        ),
        provider: "meta",
        provider_message_id:
          params.metaMessageId,
        ai_generated: false,
        admin_generated: true,
        media_count: 0,
        raw_payload: {
          template_name:
            params.templateName,
          template_language:
            params.templateLanguage,
          body_variables:
            params.bodyVariables,
          send_type: params.sendType,
          send_provider:
            META_PROVIDER,
          business_sender:
            params.businessSender,
          meta_message_id:
            params.metaMessageId,
          send_result:
            params.sendResult,
          contact_id:
            params.contactId,
        },
        created_at: now,
      });

  if (error) {
    console.error(
      "Failed to save outbound Meta template message:",
      error
    );
  }
}

async function updateAfterSuccessfulSend(
  params: {
    conversationId: string;
    contactId: string | null;
    templateName: string;
    sendType: string;
    currentBusinessInitiatedCount?:
      | number
      | null;
  }
) {
  const now =
    new Date().toISOString();

  const conversationUpdate: Record<
    string,
    unknown
  > = {
    last_message:
      `[Template] ${params.templateName}`,
    last_message_direction:
      "outbound",
    last_message_at: now,
    updated_at: now,
    ...getFollowupUpdate(
      params.sendType
    ),
  };

  if (
    params.sendType ===
    "business_initiated"
  ) {
    conversationUpdate.business_initiated_count =
      Number(
        params.currentBusinessInitiatedCount ||
          0
      ) + 1;
  }

  await supabaseAdmin
    .from("whatsapp_conversations")
    .update(conversationUpdate)
    .eq(
      "id",
      params.conversationId
    );

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
    const body = await req
      .json()
      .catch(() => null);

    const phoneE164 =
      normalizePhone(
        body?.phoneE164 ||
          body?.phone_e164 ||
          body?.phone ||
          body?.to
      );

    const campaignId =
      cleanText(
        body?.campaignId ||
          body?.campaign_id
      ) || null;

    const recipientId =
      cleanText(
        body?.recipientId ||
          body?.recipient_id
      ) || null;

    if (
      !phoneE164 ||
      !isValidPhone(phoneE164)
    ) {
      return Response.json(
        {
          success: false,
          error:
            "A valid phoneE164 is required.",
        },
        { status: 400 }
      );
    }

    const campaignConfig =
      await getCampaignConfig(
        campaignId
      );

    if (
      campaignConfig?.send_provider &&
      cleanText(
        campaignConfig.send_provider
      ).toLowerCase() !==
        META_PROVIDER
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Legacy Twilio campaigns cannot be sent through this Meta-only route. Create a new Meta campaign.",
        },
        { status: 400 }
      );
    }

    const templateName =
      cleanText(
        body?.templateName ||
          body?.template_name ||
          campaignConfig?.template_name
      );

    if (!templateName) {
      return Response.json(
        {
          success: false,
          error:
            "templateName is required.",
        },
        { status: 400 }
      );
    }

    const template =
      await getApprovedTemplate(
        templateName
      );

    if (!template) {
      return Response.json(
        {
          success: false,
          error:
            "The selected Meta template is not active or does not exist in whatsapp_templates.",
        },
        { status: 400 }
      );
    }

    const suppliedLanguage =
      cleanText(
        body?.templateLanguage ||
          body?.template_language ||
          campaignConfig?.template_language
      );

    if (
      suppliedLanguage &&
      suppliedLanguage !==
        template.language_code
    ) {
      return Response.json(
        {
          success: false,
          error:
            `Template language mismatch. ${template.template_name} must use ${template.language_code}.`,
        },
        { status: 400 }
      );
    }

    const templateLanguage =
      template.language_code;

    const templateCategory =
      template.category;

    const sendType =
      cleanText(
        body?.sendType ||
          body?.send_type ||
          campaignConfig?.campaign_type
      ) ||
      (template.category === "utility"
        ? "manual_template"
        : "business_initiated");

    const customerName =
      cleanText(
        body?.customerName ||
          body?.customer_name
      ) || null;

    const leadType =
      cleanText(
        body?.leadType ||
          body?.lead_type
      ) || "unknown";

    const source =
      cleanText(body?.source) ||
      "template_send_api";

    const variableRecord =
      normalizeVariableRecord(
        body?.bodyVariables ||
          body?.body_variables ||
          body?.variables
      );

    const variableCount = Math.max(
      0,
      Number(
        template.variable_count || 0
      )
    );

    if (
      variableCount > 0 &&
      customerName &&
      !variableRecord["1"]
    ) {
      variableRecord["1"] =
        customerName;
    }

    const missingVariables =
      getMissingVariables(
        variableRecord,
        variableCount
      );

    if (
      missingVariables.length > 0
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Required Meta template variables are missing.",
          missingVariables,
          variableDefinitions:
            template.variable_definitions ||
            [],
        },
        { status: 400 }
      );
    }

    const bodyVariables =
      getOrderedBodyVariables(
        variableRecord,
        variableCount
      );

    const metaAccessToken =
      getMetaAccessToken();

    const metaPhoneNumberId =
      getMetaPhoneNumberId();

    if (
      !metaAccessToken ||
      !metaPhoneNumberId
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Missing Meta WhatsApp configuration. Check META_DIRECT_WHATSAPP_ACCESS_TOKEN and META_DIRECT_WHATSAPP_PHONE_NUMBER_ID.",
        },
        { status: 500 }
      );
    }

    const businessSender =
      metaPhoneNumberId;

    const businessSenderKey =
      getMetaBusinessSenderKey(
        metaPhoneNumberId
      );

    const contact =
      await getOrCreateContact({
        phoneE164,
        customerName,
        leadType,
        source,
      });

    if (!contact?.id) {
      return Response.json(
        {
          success: false,
          error:
            "Failed to create or load WhatsApp contact.",
        },
        { status: 500 }
      );
    }

    if (
      contact.opted_out_at ||
      contact.status === "opted_out" ||
      contact.status === "blocked"
    ) {
      const reason =
        contact.status === "blocked"
          ? "Contact is blocked."
          : "Contact opted out.";

      await markRecipient({
        recipientId,
        campaignId,
        phoneE164,
        status: "skipped",
        skipReason: reason,
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
        status: "skipped",
        errorPayload: {
          reason,
        },
        rawPayload: {
          provider:
            META_PROVIDER,
          template_id:
            template.id,
        },
      });

      return Response.json({
        success: true,
        skipped: true,
        reason,
      });
    }

    const conversation =
      await getOrCreateConversation({
        phoneE164,
        customerName,
        contactId: contact.id,
        leadType,
        businessSenderKey,
      });

    if (!conversation?.id) {
      return Response.json(
        {
          success: false,
          error:
            "Failed to create or load WhatsApp conversation.",
        },
        { status: 500 }
      );
    }

    if (
      conversation.opted_out_at
    ) {
      const reason =
        "Conversation opted out.";

      await markRecipient({
        recipientId,
        campaignId,
        phoneE164,
        status: "skipped",
        skipReason: reason,
      });

      await insertSendLog({
        campaignId,
        recipientId,
        conversationId:
          conversation.id,
        contactId: contact.id,
        phoneE164,
        templateName,
        templateLanguage,
        templateCategory,
        sendType,
        status: "skipped",
        errorPayload: {
          reason,
        },
        rawPayload: {
          provider:
            META_PROVIDER,
          template_id:
            template.id,
        },
      });

      return Response.json({
        success: true,
        skipped: true,
        reason,
      });
    }

    const sendResult =
      await sendMetaTemplate({
        phoneNumberId:
          metaPhoneNumberId,
        accessToken:
          metaAccessToken,
        phoneE164,
        templateName:
          template.template_name,
        templateLanguage:
          template.language_code,
        bodyVariables,
      });

    if (!sendResult.success) {
      await markRecipient({
        recipientId,
        campaignId,
        phoneE164,
        status: "failed",
        errorPayload:
          sendResult.result,
      });

      await insertSendLog({
        campaignId,
        recipientId,
        conversationId:
          conversation.id,
        contactId: contact.id,
        phoneE164,
        templateName,
        templateLanguage,
        templateCategory,
        sendType,
        status: "failed",
        errorPayload:
          sendResult.result,
        rawPayload: {
          provider:
            META_PROVIDER,
          meta_payload:
            sendResult.payload,
          meta_result:
            sendResult.result,
          http_status:
            sendResult.status,
          template_id:
            template.id,
        },
      });

      return Response.json(
        {
          success: false,
          error:
            "Meta template send failed.",
          details:
            sendResult.result,
          status:
            sendResult.status,
        },
        { status: 502 }
      );
    }

    const metaMessageId =
      sendResult.messageId;

    await saveOutboundTemplateMessage({
      conversationId:
        conversation.id,
      contactId: contact.id,
      phoneE164,
      customerName,
      templateName,
      templateLanguage,
      bodyVariables,
      sendType,
      businessSender,
      metaMessageId,
      sendResult:
        sendResult.result,
    });

    await updateAfterSuccessfulSend({
      conversationId:
        conversation.id,
      contactId: contact.id,
      templateName,
      sendType,
      currentBusinessInitiatedCount:
        conversation.business_initiated_count,
    });

    await markRecipient({
      recipientId,
      campaignId,
      phoneE164,
      status: "sent",
      metaMessageId,
    });

    await insertSendLog({
      campaignId,
      recipientId,
      conversationId:
        conversation.id,
      contactId: contact.id,
      phoneE164,
      templateName,
      templateLanguage,
      templateCategory,
      sendType,
      status: "sent",
      metaMessageId,
      rawPayload: {
        provider: META_PROVIDER,
        template_id: template.id,
        meta_payload:
          sendResult.payload,
        meta_result:
          sendResult.result,
        http_status:
          sendResult.status,
      },
    });

    return Response.json({
      success: true,
      provider: "meta",
      sendProvider: META_PROVIDER,
      phoneE164,
      conversationId:
        conversation.id,
      contactId: contact.id,
      templateName,
      templateLanguage,
      templateCategory,
      sendType,
      metaMessageId,
    });
  } catch (error) {
    console.error(
      "WhatsApp template send API error:",
      error
    );

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
