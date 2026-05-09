cat > app/api/whatsapp/twilio/inbound/route.ts <<'EOF'
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createTwimlMessage(message: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;
}

function cleanWhatsappPhone(value: string) {
  return value.replace(/^whatsapp:/i, "").trim();
}

function getWindowExpiry() {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry.toISOString();
}

async function saveWhatsappConversation(params: URLSearchParams, reply: string) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.error("Missing Supabase env vars for WhatsApp webhook.");
    return;
  }

  const from = params.get("From") || "";
  const to = params.get("To") || "";
  const body = params.get("Body") || "";
  const profileName = params.get("ProfileName") || "";
  const messageSid =
    params.get("MessageSid") || params.get("SmsMessageSid") || "";
  const mediaCount = Number(params.get("NumMedia") || 0);
  const now = new Date().toISOString();
  const windowExpiresAt = getWindowExpiry();

  const rawPayload = Object.fromEntries(params.entries());

  const phone = from;
  const phoneE164 = cleanWhatsappPhone(from);

  const { data: conversation, error: conversationError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .upsert(
      {
        phone,
        phone_e164: phoneE164,
        profile_name: profileName || null,
        channel: "twilio_whatsapp",
        status: "active",
        ai_enabled: true,
        handover_to_admin: false,
        last_inbound_at: now,
        window_expires_at: windowExpiresAt,
        last_message: body,
        last_message_direction: "inbound",
        last_message_at: now,
      },
      {
        onConflict: "phone",
      }
    )
    .select("id")
    .single();

  if (conversationError || !conversation?.id) {
    console.error("Failed to upsert WhatsApp conversation:", conversationError);
    return;
  }

  const conversationId = conversation.id;

  if (messageSid) {
    const { error: inboundError } = await supabaseAdmin
      .from("whatsapp_messages")
      .upsert(
        {
          conversation_id: conversationId,
          twilio_message_sid: messageSid,
          direction: "inbound",
          from_number: from,
          to_number: to,
          phone,
          profile_name: profileName || null,
          message: body || "",
          source: "twilio",
          ai_generated: false,
          admin_generated: false,
          media_count: Number.isFinite(mediaCount) ? mediaCount : 0,
          raw_payload: rawPayload,
          created_at: now,
        },
        {
          onConflict: "twilio_message_sid",
          ignoreDuplicates: true,
        }
      );

    if (inboundError) {
      console.error("Failed to save inbound WhatsApp message:", inboundError);
    }
  } else {
    const { error: inboundError } = await supabaseAdmin
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        direction: "inbound",
        from_number: from,
        to_number: to,
        phone,
        profile_name: profileName || null,
        message: body || "",
        source: "twilio",
        ai_generated: false,
        admin_generated: false,
        media_count: Number.isFinite(mediaCount) ? mediaCount : 0,
        raw_payload: rawPayload,
        created_at: now,
      });

    if (inboundError) {
      console.error("Failed to save inbound WhatsApp message:", inboundError);
    }
  }

  const { error: outboundError } = await supabaseAdmin
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversationId,
      direction: "outbound",
      from_number: to,
      to_number: from,
      phone,
      profile_name: profileName || null,
      message: reply,
      source: "tetamo_webhook",
      ai_generated: false,
      admin_generated: false,
      media_count: 0,
      raw_payload: {
        test_reply: true,
      },
      created_at: new Date().toISOString(),
    });

  if (outboundError) {
    console.error("Failed to save outbound WhatsApp reply:", outboundError);
  }

  const { error: updateError } = await supabaseAdmin
    .from("whatsapp_conversations")
    .update({
      last_message: reply,
      last_message_direction: "outbound",
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (updateError) {
    console.error("Failed to update conversation after outbound reply:", updateError);
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);

    const from = params.get("From") || "";
    const to = params.get("To") || "";
    const body = params.get("Body") || "";
    const profileName = params.get("ProfileName") || "";

    console.log("Twilio WhatsApp inbound message:", {
      from,
      to,
      profileName,
      body,
    });

    const reply = `Hi, welcome to Tetamo 👋

We received your message and saved this conversation successfully.

This is still a test reply. Next, Tetamo AI will answer your WhatsApp messages automatically.

Halo, selamat datang di Tetamo 👋

Pesan Anda sudah kami terima dan percakapan ini sudah tersimpan.

Ini masih balasan uji coba. Langkah berikutnya, Tetamo AI akan menjawab pesan WhatsApp secara otomatis.`;

    await saveWhatsappConversation(params, reply);

    return new Response(createTwimlMessage(reply), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Twilio inbound webhook error:", error);

    const fallbackReply =
      "Hi, Tetamo received your message. Please try again shortly.";

    return new Response(createTwimlMessage(fallbackReply), {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  }
}

export async function GET() {
  return Response.json({
    success: true,
    message:
      "Tetamo Twilio WhatsApp inbound webhook is active and connected to Supabase.",
  });
}
