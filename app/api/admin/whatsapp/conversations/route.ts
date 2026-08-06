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

const CONVERSATION_SELECT = `
  id,
  phone,
  phone_e164,
  profile_name,
  channel,
  status,
  ai_enabled,
  handover_to_admin,
  handover_reason,
  sales_stage,
  sales_stage_updated_at,
  sales_stage_updated_by,
  last_inbound_at,
  window_expires_at,
  free_entry_point_expires_at,
  free_entry_point_source,
  ad_referral_source,
  ad_referral_payload,
  ad_referral_updated_at,
  last_message,
  last_message_direction,
  last_message_at,
  created_at,
  updated_at
`;

const MESSAGE_SELECT = `
  id,
  conversation_id,
  direction,
  from_number,
  to_number,
  phone,
  profile_name,
  message,
  source,
  ai_generated,
  admin_generated,
  media_count,
  created_at
`;

type AdminAuthResult = {
  authorized: boolean;
  userId?: string;
  response?: Response;
};

type SalesStage =
  | "new_inquiry"
  | "lead"
  | "agent_package"
  | "owner_package"
  | "developer_agency"
  | "follow_up"
  | "payment_started"
  | "payment_failed"
  | "closed_won"
  | "closed_lost";

type SalesStageStats = Record<SalesStage, number>;

type ConversationStats = {
  total: number;
  metaDirect: number;
  twilio: number;
  adWindowOpen: number;
  needsAdmin: number;
  activeAi: number;
  pausedAi: number;
  handled: number;
  salesStages: SalesStageStats;
};

const SALES_STAGES: SalesStage[] = [
  "new_inquiry",
  "lead",
  "agent_package",
  "owner_package",
  "developer_agency",
  "follow_up",
  "payment_started",
  "payment_failed",
  "closed_won",
  "closed_lost",
];

const SALES_STAGE_LABELS: Record<SalesStage, string> = {
  new_inquiry: "New Inquiry",
  lead: "Lead",
  agent_package: "Agent Package",
  owner_package: "Owner Package",
  developer_agency: "Developer / Agency",
  follow_up: "Follow-Up",
  payment_started: "Payment Started",
  payment_failed: "Payment Failed",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

function getPageNumber(value?: string | null) {
  const page = Number(value || "1");

  if (!Number.isFinite(page) || page < 1) return 1;

  return Math.floor(page);
}

function getPageSize(value?: string | null) {
  const pageSize = Number(value || String(DEFAULT_PAGE_SIZE));

  if (!Number.isFinite(pageSize) || pageSize < 1) return DEFAULT_PAGE_SIZE;

  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}

function applyStatusFilter(query: any, filter: string) {
  if (filter === "needs_admin") {
    return query.eq("handover_to_admin", true);
  }

  if (filter === "active_ai") {
    return query.eq("ai_enabled", true).eq("handover_to_admin", false);
  }

  if (filter === "paused_ai") {
    return query.eq("ai_enabled", false);
  }

  if (filter === "handled") {
    return query.eq("status", "handled");
  }

  return query;
}

function applyChannelFilter(query: any, channelFilter: string) {
  if (channelFilter === "meta_whatsapp") {
    return query.ilike("channel", "%meta%");
  }

  if (channelFilter === "twilio_whatsapp") {
    return query.ilike("channel", "%twilio%");
  }

  if (channelFilter === "unknown_channel") {
    return query.is("channel", null);
  }

  return query;
}

function applySalesStageFilter(query: any, salesStageFilter: string) {
  if (salesStageFilter === "all_stages") {
    return query;
  }

  if (salesStageFilter === "new_inquiry") {
    return query.or("sales_stage.eq.new_inquiry,sales_stage.is.null");
  }

  if (SALES_STAGES.includes(salesStageFilter as SalesStage)) {
    return query.eq("sales_stage", salesStageFilter);
  }

  return query;
}

async function verifyAdmin(req: Request): Promise<AdminAuthResult> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: "Supabase server environment variables are missing." },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorized: false,
      response: Response.json(
        { success: false, error: "Unauthorized. Login is required." },
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
        { success: false, error: "Unauthorized. Invalid session." },
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
        { success: false, error: "Unable to verify admin access." },
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
        { success: false, error: "Forbidden. Admin access is required." },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
  };
}

async function countConversations(apply?: (query: any) => any) {
  let query = supabaseAdmin
    .from("whatsapp_conversations")
    .select("id", { count: "exact", head: true });

  if (apply) {
    query = apply(query);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count || 0;
}

async function getConversationStats(): Promise<ConversationStats> {
  const nowIso = new Date().toISOString();

  const [
    total,
    metaDirect,
    twilio,
    adWindowOpen,
    needsAdmin,
    activeAi,
    pausedAi,
    handled,
    newInquiry,
    lead,
    agentPackage,
    ownerPackage,
    developerAgency,
    followUp,
    paymentStarted,
    paymentFailed,
    closedWon,
    closedLost,
  ] = await Promise.all([
    countConversations(),
    countConversations((query) => query.ilike("channel", "%meta%")),
    countConversations((query) => query.ilike("channel", "%twilio%")),
    countConversations((query) =>
      query.gt("free_entry_point_expires_at", nowIso)
    ),
    countConversations((query) => query.eq("handover_to_admin", true)),
    countConversations((query) =>
      query.eq("ai_enabled", true).eq("handover_to_admin", false)
    ),
    countConversations((query) => query.eq("ai_enabled", false)),
    countConversations((query) => query.eq("status", "handled")),
    countConversations((query) =>
      query.or("sales_stage.eq.new_inquiry,sales_stage.is.null")
    ),
    countConversations((query) => query.eq("sales_stage", "lead")),
    countConversations((query) => query.eq("sales_stage", "agent_package")),
    countConversations((query) => query.eq("sales_stage", "owner_package")),
    countConversations((query) => query.eq("sales_stage", "developer_agency")),
    countConversations((query) => query.eq("sales_stage", "follow_up")),
    countConversations((query) => query.eq("sales_stage", "payment_started")),
    countConversations((query) => query.eq("sales_stage", "payment_failed")),
    countConversations((query) => query.eq("sales_stage", "closed_won")),
    countConversations((query) => query.eq("sales_stage", "closed_lost")),
  ]);

  return {
    total,
    metaDirect,
    twilio,
    adWindowOpen,
    needsAdmin,
    activeAi,
    pausedAi,
    handled,
    salesStages: {
      new_inquiry: newInquiry,
      lead,
      agent_package: agentPackage,
      owner_package: ownerPackage,
      developer_agency: developerAgency,
      follow_up: followUp,
      payment_started: paymentStarted,
      payment_failed: paymentFailed,
      closed_won: closedWon,
      closed_lost: closedLost,
    },
  };
}

function getActionUpdate(action: string) {
  if (action === "mark_handled") {
    return {
      status: "handled",
      handover_to_admin: false,
      ai_enabled: false,
      handover_reason: null,
    };
  }

  if (action === "resume_ai") {
    return {
      status: "active",
      handover_to_admin: false,
      ai_enabled: true,
      handover_reason: null,
    };
  }

  if (action === "pause_ai") {
    return {
      status: "active",
      handover_to_admin: true,
      ai_enabled: false,
      handover_reason: "AI paused by admin - needs admin attention",
    };
  }

  return null;
}

function getSystemMessage(action: string) {
  if (action === "mark_handled") {
    return "Admin marked this conversation as handled.";
  }

  if (action === "resume_ai") {
    return "Admin resumed AI replies for this conversation.";
  }

  if (action === "pause_ai") {
    return "Admin paused AI replies. This conversation now needs admin attention.";
  }

  return "Admin updated this conversation.";
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorized) {
    return auth.response!;
  }

  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId") || "";
  const filter = url.searchParams.get("filter") || "all";
  const channelFilter = url.searchParams.get("channelFilter") || "all_channels";
  const salesStageFilter =
    url.searchParams.get("salesStageFilter") || "all_stages";
  const page = getPageNumber(url.searchParams.get("page"));
  const pageSize = getPageSize(url.searchParams.get("pageSize"));

  if (conversationId) {
    const { data: conversation, error: conversationError } =
      await supabaseAdmin
        .from("whatsapp_conversations")
        .select(CONVERSATION_SELECT)
        .eq("id", conversationId)
        .maybeSingle();

    if (conversationError) {
      console.error("Failed to load WhatsApp conversation:", conversationError);

      return Response.json(
        { success: false, error: "Failed to load WhatsApp conversation." },
        { status: 500 }
      );
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("whatsapp_messages")
      .select(MESSAGE_SELECT)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Failed to load WhatsApp messages:", messagesError);

      return Response.json(
        { success: false, error: "Failed to load WhatsApp messages." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      conversation,
      messages: messages || [],
    });
  }

  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabaseAdmin
      .from("whatsapp_conversations")
      .select(CONVERSATION_SELECT, { count: "exact" });

    query = applyStatusFilter(query, filter);
    query = applyChannelFilter(query, channelFilter);
    query = applySalesStageFilter(query, salesStageFilter);

    query = query
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .range(from, to);

    const [{ data, error, count }, stats] = await Promise.all([
      query,
      getConversationStats(),
    ]);

    if (error) {
      console.error("Failed to load WhatsApp conversations:", error);

      return Response.json(
        { success: false, error: "Failed to load WhatsApp conversations." },
        { status: 500 }
      );
    }

    const totalCount = count || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return Response.json({
      success: true,
      conversations: data || [],
      stats,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
        from: totalCount === 0 ? 0 : from + 1,
        to: Math.min(to + 1, totalCount),
      },
    });
  } catch (error) {
    console.error("Failed to load WhatsApp inbox data:", error);

    return Response.json(
      { success: false, error: "Failed to load WhatsApp inbox data." },
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
    const body = await req.json();
    const conversationId = String(body?.conversationId || "").trim();
    const action = String(body?.action || "").trim();
    const reason = String(body?.reason || "").trim();
    const salesStage = String(body?.salesStage || "").trim();

    if (!conversationId) {
      return Response.json(
        { success: false, error: "conversationId is required." },
        { status: 400 }
      );
    }

    const { data: existingConversation, error: conversationError } =
      await supabaseAdmin
        .from("whatsapp_conversations")
        .select(CONVERSATION_SELECT)
        .eq("id", conversationId)
        .maybeSingle();

    if (conversationError) {
      console.error(
        "Failed to load WhatsApp conversation:",
        conversationError
      );

      return Response.json(
        { success: false, error: "Failed to load WhatsApp conversation." },
        { status: 500 }
      );
    }

    if (!existingConversation) {
      return Response.json(
        { success: false, error: "WhatsApp conversation was not found." },
        { status: 404 }
      );
    }

    const phoneE164 = String(
      existingConversation.phone_e164 ||
        existingConversation.phone ||
        ""
    ).trim();

    if (action === "update_sales_stage") {
      if (!SALES_STAGES.includes(salesStage as SalesStage)) {
        return Response.json(
          { success: false, error: "Invalid sales stage." },
          { status: 400 }
        );
      }

      const previousStage = existingConversation.sales_stage || null;
      const updatedAt = new Date().toISOString();

      const { data: updatedConversation, error: updateError } =
        await supabaseAdmin
          .from("whatsapp_conversations")
          .update({
            sales_stage: salesStage,
            sales_stage_updated_at: updatedAt,
            sales_stage_updated_by: auth.userId || null,
          })
          .eq("id", conversationId)
          .select(CONVERSATION_SELECT)
          .maybeSingle();

      if (updateError) {
        console.error("Failed to update WhatsApp sales stage:", updateError);

        return Response.json(
          { success: false, error: "Failed to update sales stage." },
          { status: 500 }
        );
      }

      const { error: historyError } = await supabaseAdmin
        .from("whatsapp_sales_stage_history")
        .insert({
          conversation_id: conversationId,
          previous_stage: previousStage,
          new_stage: salesStage,
          changed_by: auth.userId || null,
          changed_at: updatedAt,
        });

      if (historyError) {
        console.error("Failed to save WhatsApp sales stage history:", historyError);
      }

      const stageLabel =
        SALES_STAGE_LABELS[salesStage as SalesStage] || salesStage;

      await supabaseAdmin.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "system",
        from_number: "tetamo_admin_dashboard",
        to_number: phoneE164 || null,
        phone: phoneE164 || null,
        profile_name: existingConversation.profile_name || null,
        message: `Admin moved this conversation to ${stageLabel}.`,
        source: "admin_dashboard",
        ai_generated: false,
        admin_generated: true,
        media_count: 0,
        raw_payload: {
          action,
          previous_stage: previousStage,
          new_stage: salesStage,
          admin_user_id: auth.userId,
        },
        created_at: updatedAt,
      });

      return Response.json({
        success: true,
        conversation: updatedConversation,
      });
    }

    if (action === "block_number") {
      if (!phoneE164) {
        return Response.json(
          {
            success: false,
            error: "This conversation does not have a valid phone number.",
          },
          { status: 400 }
        );
      }

      const { error: blockError } = await supabaseAdmin
        .from("whatsapp_blocked_numbers")
        .upsert(
          {
            phone_e164: phoneE164,
            reason: reason || "Blocked by admin from WhatsApp Inbox",
            blocked_by: auth.userId || null,
            blocked_at: new Date().toISOString(),
          },
          {
            onConflict: "phone_e164",
          }
        );

      if (blockError) {
        console.error("Failed to block WhatsApp number:", blockError);

        return Response.json(
          { success: false, error: "Failed to block WhatsApp number." },
          { status: 500 }
        );
      }

      const { data: updatedConversation, error: updateError } =
        await supabaseAdmin
          .from("whatsapp_conversations")
          .update({
            status: "blocked",
            handover_to_admin: false,
            ai_enabled: false,
            handover_reason: "Number blocked by admin",
          })
          .eq("id", conversationId)
          .select(CONVERSATION_SELECT)
          .maybeSingle();

      if (updateError) {
        console.error(
          "Failed to update blocked conversation:",
          updateError
        );

        return Response.json(
          {
            success: false,
            error: "The number was blocked, but the conversation update failed.",
          },
          { status: 500 }
        );
      }

      await supabaseAdmin.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "system",
        from_number: "tetamo_admin_dashboard",
        to_number: phoneE164,
        phone: phoneE164,
        profile_name: existingConversation.profile_name || null,
        message: "Admin blocked this WhatsApp number.",
        source: "admin_dashboard",
        ai_generated: false,
        admin_generated: true,
        media_count: 0,
        raw_payload: {
          action,
          reason: reason || "Blocked by admin from WhatsApp Inbox",
          admin_user_id: auth.userId,
        },
        created_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        blocked: true,
        conversation: updatedConversation,
      });
    }

    if (action === "unblock_number") {
      if (!phoneE164) {
        return Response.json(
          {
            success: false,
            error: "This conversation does not have a valid phone number.",
          },
          { status: 400 }
        );
      }

      const { error: unblockError } = await supabaseAdmin
        .from("whatsapp_blocked_numbers")
        .delete()
        .eq("phone_e164", phoneE164);

      if (unblockError) {
        console.error("Failed to unblock WhatsApp number:", unblockError);

        return Response.json(
          { success: false, error: "Failed to unblock WhatsApp number." },
          { status: 500 }
        );
      }

      const { data: updatedConversation, error: updateError } =
        await supabaseAdmin
          .from("whatsapp_conversations")
          .update({
            status: "active",
            handover_to_admin: false,
            ai_enabled: false,
            handover_reason: null,
          })
          .eq("id", conversationId)
          .select(CONVERSATION_SELECT)
          .maybeSingle();

      if (updateError) {
        console.error(
          "Failed to update unblocked conversation:",
          updateError
        );

        return Response.json(
          {
            success: false,
            error:
              "The number was unblocked, but the conversation update failed.",
          },
          { status: 500 }
        );
      }

      await supabaseAdmin.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        direction: "system",
        from_number: "tetamo_admin_dashboard",
        to_number: phoneE164,
        phone: phoneE164,
        profile_name: existingConversation.profile_name || null,
        message:
          "Admin unblocked this WhatsApp number. AI remains paused until manually resumed.",
        source: "admin_dashboard",
        ai_generated: false,
        admin_generated: true,
        media_count: 0,
        raw_payload: {
          action,
          admin_user_id: auth.userId,
        },
        created_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        blocked: false,
        conversation: updatedConversation,
      });
    }

    const updatePayload = getActionUpdate(action);

    if (!updatePayload) {
      return Response.json(
        { success: false, error: "Invalid action." },
        { status: 400 }
      );
    }

    const { data: updatedConversation, error: updateError } =
      await supabaseAdmin
        .from("whatsapp_conversations")
        .update(updatePayload)
        .eq("id", conversationId)
        .select(CONVERSATION_SELECT)
        .maybeSingle();

    if (updateError) {
      console.error(
        "Failed to update WhatsApp conversation:",
        updateError
      );

      return Response.json(
        {
          success: false,
          error: "Failed to update WhatsApp conversation.",
        },
        { status: 500 }
      );
    }

    await supabaseAdmin.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      direction: "system",
      from_number: "tetamo_admin_dashboard",
      to_number: updatedConversation?.phone || null,
      phone: updatedConversation?.phone || null,
      profile_name: updatedConversation?.profile_name || null,
      message: getSystemMessage(action),
      source: "admin_dashboard",
      ai_generated: false,
      admin_generated: true,
      media_count: 0,
      raw_payload: {
        action,
        admin_user_id: auth.userId,
      },
      created_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      conversation: updatedConversation,
    });
  } catch (error) {
    console.error("Update WhatsApp conversation error:", error);

    return Response.json(
      {
        success: false,
        error: "Failed to update WhatsApp conversation.",
      },
      { status: 500 }
    );
  }
}