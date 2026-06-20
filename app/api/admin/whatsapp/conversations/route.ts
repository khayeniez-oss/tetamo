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

type ConversationStats = {
  total: number;
  metaDirect: number;
  twilio: number;
  adWindowOpen: number;
  needsAdmin: number;
  activeAi: number;
  pausedAi: number;
  handled: number;
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

  const body = await req.json();
  const conversationId = String(body?.conversationId || "");
  const action = String(body?.action || "");

  if (!conversationId) {
    return Response.json(
      { success: false, error: "conversationId is required." },
      { status: 400 }
    );
  }

  const updatePayload = getActionUpdate(action);

  if (!updatePayload) {
    return Response.json(
      { success: false, error: "Invalid action." },
      { status: 400 }
    );
  }

  const { data: updatedConversation, error: updateError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .select(CONVERSATION_SELECT)
    .maybeSingle();

  if (updateError) {
    console.error("Failed to update WhatsApp conversation:", updateError);

    return Response.json(
      { success: false, error: "Failed to update WhatsApp conversation." },
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
}