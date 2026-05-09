export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

We received your message.

This is Tetamo WhatsApp AI test reply. Our AI support setup is now connected.

Halo, selamat datang di Tetamo 👋

Pesan Anda sudah kami terima.

Ini adalah balasan otomatis uji coba dari Tetamo WhatsApp AI.`;

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
    message: "Tetamo Twilio WhatsApp inbound webhook is active.",
  });
}
