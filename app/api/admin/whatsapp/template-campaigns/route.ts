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

type ImportedRecipient = {
  phone: string;
  customerName?: string;
  leadType?: string;
  source?: string;
  variables?: Record<string, unknown> | string[] | null;
};

type SendProvider = "meta_cloud_api" | "twilio_whatsapp";

function cleanText(value?: unknown) {
  return String(value || "").trim();
}

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

function normalizePhone(value?: unknown) {
  let phone = String(value || "").replace(/\D/g, "");

  if (!phone) return "";

  if (phone.startsWith("0")) {
    phone = `62${phone.slice(1)}`;
  }

  if (phone.startsWith("8")) {
    phone = `62${phone}`;
  }

  return phone;
}

function phoneDisplay(phoneE164: string) {
  return phoneE164.startsWith("+") ? phoneE164 : `+${phoneE164}`;
}

function isValidPhone(phoneE164: string) {
  return phoneE164.length >= 8 && phoneE164.length <= 16;
}

function normalizeSendProvider(value?: unknown): SendProvider {
  const clean = cleanText(value).toLowerCase();

  if (
    clean === "twilio" ||
    clean === "twilio_whatsapp" ||
    clean === "twilio_content"
  ) {
    return "twilio_whatsapp";
  }

  if (clean === "meta" || clean === "meta_cloud_api") {
    return "meta_cloud_api";
  }

  return "twilio_whatsapp";
}

function toTwilioWhatsappAddress(value?: unknown) {
  const raw = cleanText(value);

  if (!raw) return "";

  if (raw.toLowerCase().startsWith("whatsapp:")) {
    const number = raw.slice("whatsapp:".length).trim();
    const digits = normalizePhone(number);

    return digits ? `whatsapp:+${digits}` : "";
  }

  const digits = normalizePhone(raw);
  return digits ? `whatsapp:+${digits}` : "";
}

function getTwilioWhatsappFrom() {
  return toTwilioWhatsappAddress(process.env.TWILIO_WHATSAPP_FROM);
}

function getTwilioContentSidForTemplate(templateName: string) {
  const cleanTemplateName = cleanText(templateName);

  if (cleanTemplateName === "tetamo_agent_invite_id_01") {
    return cleanEnv(process.env.TWILIO_AGENT_INVITE_CONTENT_SID);
  }

  return "";
}

function normalizeVariables(value: unknown) {
  if (!value) return {};

  if (Array.isArray(value)) {
    return value.reduce<Record<string, string>>((acc, item, index) => {
      const clean = cleanText(item);
      if (clean) acc[String(index + 1)] = clean;
      return acc;
    }, {});
  }

  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }

  const clean = cleanText(value);

  return clean ? { "1": clean } : {};
}

function parseRecipients(value: unknown, defaultLeadType: string) {
  const recipients: ImportedRecipient[] = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string") {
        recipients.push({
          phone: item,
          leadType: defaultLeadType,
        });
      } else if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;

        recipients.push({
          phone: cleanText(record.phone || record.phoneE164 || record.to),
          customerName: cleanText(record.customerName || record.name),
          leadType:
            cleanText(record.leadType || record.lead_type) || defaultLeadType,
          source: cleanText(record.source) || "campaign_import",
          variables: (record.variables ||
            record.bodyVariables ||
            record.body_variables ||
            null) as Record<string, unknown> | string[] | null,
        });
      }
    }
  }

  if (typeof value === "string") {
    const lines = value
      .split(/\r?\n|,/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      recipients.push({
        phone: line,
        leadType: defaultLeadType,
      });
    }
  }

  const seen = new Set<string>();
  const cleanRecipients: ImportedRecipient[] = [];
  const invalidRecipients: string[] = [];

  for (const recipient of recipients) {
    const phoneE164 = normalizePhone(recipient.phone);

    if (!isValidPhone(phoneE164)) {
      invalidRecipients.push(recipient.phone);
      continue;
    }

    if (seen.has(phoneE164)) continue;

    seen.add(phoneE164);

    cleanRecipients.push({
      ...recipient,
      phone: phoneE164,
      leadType: recipient.leadType || defaultLeadType || "unknown",
      source: recipient.source || "campaign_import",
    });
  }

  return {
    recipients: cleanRecipients,
    invalidRecipients,
  };
}

async function upsertContact(params: {
  phoneE164: string;
  customerName: string | null;
  leadType: string;
  source: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_contacts")
    .upsert(
      {
        phone_e164: params.phoneE164,
        phone_display: phoneDisplay(params.phoneE164),
        profile_name: params.customerName,
        lead_type: params.leadType || "unknown",
        source: params.source || "campaign_import",
        status: "active",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "phone_e164",
      }
    )
    .select("id, phone_e164")
    .maybeSingle();

  if (error) {
    console.error("Failed to upsert WhatsApp contact:", error);
    return null;
  }

  return data as { id: string; phone_e164: string } | null;
}

async function sendRecipientThroughTemplateApi(params: {
  req: Request;
  campaign: any;
  recipient: any;
}) {
  const authorization = params.req.headers.get("authorization") || "";
  const sendUrl = new URL("/api/admin/whatsapp/template-send", params.req.url);

  const sendProvider = normalizeSendProvider(params.campaign.send_provider);
  const templateName = cleanText(params.campaign.template_name);
  const twilioContentSid =
    cleanText(params.campaign.twilio_content_sid) ||
    getTwilioContentSidForTemplate(templateName);
  const twilioFrom =
    toTwilioWhatsappAddress(params.campaign.twilio_from) ||
    getTwilioWhatsappFrom();

  const response = await fetch(sendUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
    },
    body: JSON.stringify({
      campaignId: params.campaign.id,
      recipientId: params.recipient.id,
      phoneE164: params.recipient.phone_e164,
      customerName: params.recipient.customer_name,
      leadType: params.recipient.lead_type || "unknown",
      source: params.recipient.source || "campaign",
      templateName,
      templateLanguage: params.campaign.template_language || "en",
      templateCategory: params.campaign.category || "marketing",
      sendType: params.campaign.campaign_type || "business_initiated",
      sendProvider,
      twilioContentSid,
      twilioFrom,
      variables: params.recipient.variables || {},
    }),
  });

  const result = await response.json().catch(() => null);

  return {
    ok: response.ok && Boolean(result?.success),
    status: response.status,
    result,
  };
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorized) {
    return auth.response!;
  }

  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaignId") || "";
  const includeRecipients = url.searchParams.get("includeRecipients") === "true";

  if (campaignId) {
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("whatsapp_template_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) {
      return Response.json(
        { error: "Failed to load campaign." },
        { status: 500 }
      );
    }

    let recipients: any[] = [];

    if (includeRecipients) {
      const { data, error } = await supabaseAdmin
        .from("whatsapp_template_recipients")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: true })
        .limit(5000);

      if (error) {
        return Response.json(
          { error: "Failed to load campaign recipients." },
          { status: 500 }
        );
      }

      recipients = data || [];
    }

    return Response.json({
      success: true,
      campaign,
      recipients,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("whatsapp_template_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return Response.json(
      { error: "Failed to load campaigns." },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    campaigns: data || [],
  });
}

export async function POST(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json().catch(() => null);

    const name = cleanText(body?.name);
    const templateName = cleanText(body?.templateName || body?.template_name);
    const templateLanguage = cleanText(
      body?.templateLanguage || body?.template_language || "en"
    );
    const category = cleanText(body?.category || "marketing");
    const campaignType = cleanText(
      body?.campaignType || body?.campaign_type || "business_initiated"
    );
    const leadType = cleanText(body?.leadType || body?.lead_type || "unknown");
    const batchSize = Number(body?.batchSize || body?.batch_size || 100);
    const sendProvider = normalizeSendProvider(
      body?.sendProvider || body?.send_provider || "twilio_whatsapp"
    );

    const defaultVariables = normalizeVariables(
      body?.defaultVariables || body?.default_variables || {}
    );

    const twilioContentSid =
      cleanText(body?.twilioContentSid || body?.twilio_content_sid) ||
      getTwilioContentSidForTemplate(templateName);

    const twilioFrom =
      toTwilioWhatsappAddress(body?.twilioFrom || body?.twilio_from) ||
      getTwilioWhatsappFrom();

    const parsed = parseRecipients(body?.recipients, leadType);

    if (!name) {
      return Response.json(
        { error: "Campaign name is required." },
        { status: 400 }
      );
    }

    if (!templateName) {
      return Response.json(
        { error: "Template name is required." },
        { status: 400 }
      );
    }

    if (sendProvider === "twilio_whatsapp" && !twilioContentSid) {
      return Response.json(
        {
          error:
            "Twilio ContentSid is required for Twilio WhatsApp campaigns.",
        },
        { status: 400 }
      );
    }

    if (sendProvider === "twilio_whatsapp" && !twilioFrom) {
      return Response.json(
        {
          error:
            "Twilio WhatsApp sender is required for Twilio WhatsApp campaigns.",
        },
        { status: 400 }
      );
    }

    if (parsed.recipients.length === 0) {
      return Response.json(
        { error: "At least one valid recipient phone number is required." },
        { status: 400 }
      );
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("whatsapp_template_campaigns")
      .insert({
        name,
        template_name: templateName,
        template_language: templateLanguage || "en",
        category,
        campaign_type: campaignType,
        send_provider: sendProvider,
        twilio_content_sid:
          sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
        twilio_from: sendProvider === "twilio_whatsapp" ? twilioFrom : null,
        status: "draft",
        total_recipients: parsed.recipients.length,
        batch_size:
          Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 100,
        created_by: auth.userId,
        notes: cleanText(body?.notes) || null,
        raw_payload: {
          invalid_recipients: parsed.invalidRecipients,
          default_variables: defaultVariables,
          send_provider: sendProvider,
          twilio_content_sid:
            sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
          twilio_from: sendProvider === "twilio_whatsapp" ? twilioFrom : null,
        },
      })
      .select("*")
      .maybeSingle();

    if (campaignError || !campaign?.id) {
      console.error("Failed to create WhatsApp campaign:", campaignError);

      return Response.json(
        { error: "Failed to create campaign." },
        { status: 500 }
      );
    }

    let insertedCount = 0;
    let skippedCount = 0;

    for (const recipient of parsed.recipients) {
      const contact = await upsertContact({
        phoneE164: recipient.phone,
        customerName: recipient.customerName || null,
        leadType: recipient.leadType || leadType || "unknown",
        source: recipient.source || "campaign_import",
      });

      const mergedVariables = {
        ...defaultVariables,
        ...normalizeVariables(recipient.variables),
      };

      const { error: recipientError } = await supabaseAdmin
        .from("whatsapp_template_recipients")
        .insert({
          campaign_id: campaign.id,
          contact_id: contact?.id || null,
          phone_e164: recipient.phone,
          customer_name: recipient.customerName || null,
          lead_type: recipient.leadType || leadType || "unknown",
          source: recipient.source || "campaign_import",
          variables: mergedVariables,
          status: "pending",
        });

      if (recipientError) {
        skippedCount += 1;
        console.error("Failed to insert campaign recipient:", recipientError);
      } else {
        insertedCount += 1;
      }
    }

    await supabaseAdmin
      .from("whatsapp_template_campaigns")
      .update({
        total_recipients: insertedCount,
        total_skipped: skippedCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    return Response.json({
      success: true,
      campaignId: campaign.id,
      sendProvider,
      twilioContentSid:
        sendProvider === "twilio_whatsapp" ? twilioContentSid : null,
      twilioFrom: sendProvider === "twilio_whatsapp" ? twilioFrom : null,
      totalRecipients: insertedCount,
      skippedCount,
      invalidRecipients: parsed.invalidRecipients,
    });
  } catch (error) {
    console.error("Create WhatsApp campaign API error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create campaign.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorized) {
    return auth.response!;
  }

  try {
    const body = await req.json().catch(() => null);
    const action = cleanText(body?.action);
    const campaignId = cleanText(body?.campaignId || body?.campaign_id);
    const requestedBatchSize = Number(body?.batchSize || body?.batch_size || 0);

    if (!campaignId) {
      return Response.json(
        { error: "campaignId is required." },
        { status: 400 }
      );
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("whatsapp_template_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError || !campaign?.id) {
      return Response.json({ error: "Campaign not found." }, { status: 404 });
    }

    if (action === "pause") {
      await supabaseAdmin
        .from("whatsapp_template_campaigns")
        .update({
          status: "paused",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return Response.json({ success: true, status: "paused" });
    }

    if (action === "resume") {
      await supabaseAdmin
        .from("whatsapp_template_campaigns")
        .update({
          status: "draft",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return Response.json({ success: true, status: "draft" });
    }

    if (action !== "send_next_batch" && action !== "start") {
      return Response.json({ error: "Invalid action." }, { status: 400 });
    }

    const batchSize =
      Number.isFinite(requestedBatchSize) && requestedBatchSize > 0
        ? requestedBatchSize
        : Number(campaign.batch_size || 100);

    await supabaseAdmin
      .from("whatsapp_template_campaigns")
      .update({
        status: "sending",
        started_at: campaign.started_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    const { data: pendingRecipients, error: recipientsError } =
      await supabaseAdmin
        .from("whatsapp_template_recipients")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(batchSize);

    if (recipientsError) {
      return Response.json(
        { error: "Failed to load pending recipients." },
        { status: 500 }
      );
    }

    if (!pendingRecipients || pendingRecipients.length === 0) {
      await supabaseAdmin
        .from("whatsapp_template_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);

      return Response.json({
        success: true,
        status: "completed",
        sentThisBatch: 0,
        failedThisBatch: 0,
        skippedThisBatch: 0,
        message: "No pending recipients left.",
      });
    }

    const results: Array<{
      phoneE164: string;
      ok: boolean;
      status: number;
      error?: unknown;
    }> = [];

    for (const recipient of pendingRecipients) {
      const sendResult = await sendRecipientThroughTemplateApi({
        req,
        campaign,
        recipient,
      });

      results.push({
        phoneE164: recipient.phone_e164,
        ok: sendResult.ok,
        status: sendResult.status,
        error: sendResult.ok ? null : sendResult.result,
      });
    }

    const { count: pendingCount } = await supabaseAdmin
      .from("whatsapp_template_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    const nextStatus = Number(pendingCount || 0) > 0 ? "draft" : "completed";

    await supabaseAdmin
      .from("whatsapp_template_campaigns")
      .update({
        status: nextStatus,
        completed_at:
          nextStatus === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return Response.json({
      success: true,
      campaignId,
      status: nextStatus,
      sendProvider: normalizeSendProvider(campaign.send_provider),
      batchSize,
      processedThisBatch: pendingRecipients.length,
      sentThisBatch: results.filter((item) => item.ok).length,
      failedThisBatch: results.filter((item) => !item.ok).length,
      pendingLeft: Number(pendingCount || 0),
      results,
    });
  } catch (error) {
    console.error("Send WhatsApp campaign batch API error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send campaign batch.",
      },
      { status: 500 }
    );
  }
}