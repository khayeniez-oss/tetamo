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
      handover_to_admin: false,
      ai_enabled: false,
      handover_reason: "AI paused by admin",
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
    return "Admin paused AI replies for this conversation.";
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

  if (conversationId) {
    const { data: conversation, error: conversationError } =
      await supabaseAdmin
        .from("whatsapp_conversations")
        .select(
          "id, phone, phone_e164, profile_name, channel, status, ai_enabled, handover_to_admin, handover_reason, last_inbound_at, window_expires_at, last_message, last_message_direction, last_message_at, created_at, updated_at"
        )
        .eq("id", conversationId)
        .maybeSingle();

    if (conversationError) {
      console.error("Failed to load WhatsApp conversation:", conversationError);

      return Response.json(
        { error: "Failed to load WhatsApp conversation." },
        { status: 500 }
      );
    }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from("whatsapp_messages")
      .select(
        "id, conversation_id, direction, from_number, to_number, phone, profile_name, message, source, ai_generated, admin_generated, media_count, created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Failed to load WhatsApp messages:", messagesError);

      return Response.json(
        { error: "Failed to load WhatsApp messages." },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      conversation,
      messages: messages || [],
    });
  }

  let query = supabaseAdmin
    .from("whatsapp_conversations")
    .select(
      "id, phone, phone_e164, profile_name, channel, status, ai_enabled, handover_to_admin, handover_reason, last_inbound_at, window_expires_at, last_message, last_message_direction, last_message_at, created_at, updated_at"
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);

  if (filter === "needs_admin") {
    query = query.eq("handover_to_admin", true);
  }

  if (filter === "active_ai") {
    query = query.eq("ai_enabled", true).eq("handover_to_admin", false);
  }

  if (filter === "paused_ai") {
    query = query.eq("ai_enabled", false);
  }

  if (filter === "handled") {
    query = query.eq("status", "handled");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load WhatsApp conversations:", error);

    return Response.json(
      { error: "Failed to load WhatsApp conversations." },
      { status: 500 }
    );
  }

  return Response.json({
    success: true,
    conversations: data || [],
  });
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
      { error: "conversationId is required." },
      { status: 400 }
    );
  }

  const updatePayload = getActionUpdate(action);

  if (!updatePayload) {
    return Response.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: updatedConversation, error: updateError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .select(
      "id, phone, phone_e164, profile_name, channel, status, ai_enabled, handover_to_admin, handover_reason, last_inbound_at, window_expires_at, last_message, last_message_direction, last_message_at, created_at, updated_at"
    )
    .maybeSingle();

  if (updateError) {
    console.error("Failed to update WhatsApp conversation:", updateError);

    return Response.json(
      { error: "Failed to update WhatsApp conversation." },
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