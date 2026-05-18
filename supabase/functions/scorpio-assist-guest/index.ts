import { createClient } from "npm:@supabase/supabase-js@2";

type Language = "en" | "id";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLanguage(value: unknown): Language {
  return value === "id" ? "id" : "en";
}

function normalizeSource(value: unknown, language: Language) {
  const rawSource = String(value || "").trim();

  if (
    rawSource === "mobile_chat_guest_en" ||
    rawSource === "mobile_chat_guest_id" ||
    rawSource === "website_chat_guest_en" ||
    rawSource === "website_chat_guest_id" ||
    rawSource === "website_chat_guest"
  ) {
    return rawSource;
  }

  return `mobile_chat_guest_${language}`;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const payload = await req.json().catch(() => null);

    const rawMessage = String(payload?.message_text || "").trim();
    const rawGuestSessionId = String(payload?.guest_session_id || "").trim();
    const language = normalizeLanguage(payload?.language);
    const source = normalizeSource(payload?.source, language);

    if (!rawMessage) {
      return jsonResponse({ error: "message_text is required" }, 400);
    }

    const guestSessionId = rawGuestSessionId || crypto.randomUUID();

    const { data: existingConversation, error: existingConversationError } =
      await supabase
        .from("support_conversations")
        .select(
          "id, guest_session_id, handoff_requested, handoff_status, status, source, created_at, updated_at, last_message_at"
        )
        .is("user_id", null)
        .eq("guest_session_id", guestSessionId)
        .eq("status", "open")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingConversationError) {
      throw existingConversationError;
    }

    let conversation = existingConversation;

    if (!conversation) {
      const { data: createdConversation, error: createConversationError } =
        await supabase
          .from("support_conversations")
          .insert({
            user_id: null,
            guest_session_id: guestSessionId,
            source,
            status: "open",
            handoff_requested: false,
            handoff_status: "ai_active",
          })
          .select(
            "id, guest_session_id, handoff_requested, handoff_status, status, source, created_at, updated_at, last_message_at"
          )
          .maybeSingle();

      if (createConversationError) {
        throw createConversationError;
      }

      conversation = createdConversation;
    } else if (conversation.source !== source) {
      const { data: updatedConversation, error: updateConversationError } =
        await supabase
          .from("support_conversations")
          .update({
            source,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversation.id)
          .select(
            "id, guest_session_id, handoff_requested, handoff_status, status, source, created_at, updated_at, last_message_at"
          )
          .maybeSingle();

      if (updateConversationError) {
        throw updateConversationError;
      }

      conversation = updatedConversation || conversation;
    }

    if (!conversation?.id) {
      throw new Error("Failed to create or load guest conversation.");
    }

    const { data: insertedUserMessage, error: insertUserMessageError } =
      await supabase
        .from("support_messages")
        .insert({
          conversation_id: conversation.id,
          sender_type: "user",
          message_text: rawMessage,
          ai_status: "pending",
        })
        .select("id, conversation_id, sender_type, message_text, ai_status, created_at")
        .maybeSingle();

    if (insertUserMessageError) {
      throw insertUserMessageError;
    }

    if (!insertedUserMessage?.id) {
      throw new Error("Failed to insert guest message.");
    }

    let aiReplyFound = false;

    for (let i = 0; i < 12; i += 1) {
      await sleep(700);

      const { data: refreshedUserMessage, error: refreshedUserMessageError } =
        await supabase
          .from("support_messages")
          .select("id, ai_status")
          .eq("id", insertedUserMessage.id)
          .maybeSingle();

      if (refreshedUserMessageError) {
        throw refreshedUserMessageError;
      }

      const { data: aiReplyRow, error: aiReplyRowError } = await supabase
        .from("support_messages")
        .select(
          "id, conversation_id, sender_type, message_text, ai_status, suggested_action, suggested_action_label, created_at"
        )
        .eq("conversation_id", conversation.id)
        .eq("sender_type", "ai")
        .gt("created_at", insertedUserMessage.created_at)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (aiReplyRowError) {
        throw aiReplyRowError;
      }

      if (refreshedUserMessage?.ai_status === "replied" || aiReplyRow) {
        aiReplyFound = true;
        break;
      }
    }

    const { data: latestConversation, error: latestConversationError } =
      await supabase
        .from("support_conversations")
        .select(
          "id, guest_session_id, handoff_requested, handoff_status, status, source, created_at, updated_at, last_message_at"
        )
        .eq("id", conversation.id)
        .maybeSingle();

    if (latestConversationError) {
      throw latestConversationError;
    }

    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select(
        "id, conversation_id, sender_type, message_text, ai_status, suggested_action, suggested_action_label, created_at"
      )
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return jsonResponse({
      ok: true,
      guest_session_id: guestSessionId,
      conversation: latestConversation,
      messages: messages ?? [],
      ai_reply_completed: aiReplyFound,
      reply_language_source: source,
    });
  } catch (error) {
    console.error("scorpio-assist-guest error:", error);

    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
