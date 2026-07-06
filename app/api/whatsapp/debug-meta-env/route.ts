import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanEnv(value?: string | null) {
  return String(value || "").trim();
}

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export async function GET() {
  const graphVersion = cleanEnv(process.env.META_GRAPH_VERSION) || "v25.0";
  const token = cleanEnv(process.env.META_WHATSAPP_ACCESS_TOKEN);
  const phoneNumberId = cleanEnv(process.env.META_WHATSAPP_PHONE_NUMBER_ID);
  const wabaId = cleanEnv(process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID);
  const allowedIds = cleanEnv(
    process.env.TETAMO_ALLOWED_WHATSAPP_PHONE_NUMBER_IDS
  );

  const envCheck = {
    META_GRAPH_VERSION: {
      exists: Boolean(graphVersion),
      value: graphVersion,
    },
    META_WHATSAPP_ACCESS_TOKEN: {
      exists: Boolean(token),
      length: token.length,
      hash: token ? hash(token) : null,
      startsWith: token ? token.slice(0, 8) : null,
    },
    META_WHATSAPP_PHONE_NUMBER_ID: {
      exists: Boolean(phoneNumberId),
      value: phoneNumberId,
    },
    META_WHATSAPP_BUSINESS_ACCOUNT_ID: {
      exists: Boolean(wabaId),
      value: wabaId,
    },
    TETAMO_ALLOWED_WHATSAPP_PHONE_NUMBER_IDS: {
      exists: Boolean(allowedIds),
      value: allowedIds,
    },
  };

  let phoneNumberCheck: unknown = null;
  let wabaPhoneNumbersCheck: unknown = null;

  if (token && phoneNumberId) {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${phoneNumberId}?fields=id,display_phone_number,verified_name&access_token=${token}`
    );

    phoneNumberCheck = {
      ok: response.ok,
      status: response.status,
      result: await response.json().catch(() => null),
    };
  }

  if (token && wabaId) {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${wabaId}/phone_numbers?access_token=${token}`
    );

    wabaPhoneNumbersCheck = {
      ok: response.ok,
      status: response.status,
      result: await response.json().catch(() => null),
    };
  }

  return Response.json({
    ok: true,
    envCheck,
    phoneNumberCheck,
    wabaPhoneNumbersCheck,
  });
}