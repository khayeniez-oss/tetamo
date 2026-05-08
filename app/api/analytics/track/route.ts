import { NextRequest, NextResponse } from "next/server";
import { geolocation } from "@vercel/functions";
import { supabase } from "@/lib/supabase";

type AnalyticsEventName =
  | "property_card_view"
  | "property_detail_view"
  | "property_whatsapp_click"
  | "property_schedule_viewing_click"
  | "property_view_detail_click"
  | "lead_created"
  | "buyer_request_submitted";

type TrackEventBody = {
  event_name: AnalyticsEventName;
  property_id?: string | null;
  user_id?: string | null;
  source_page?: string | null;
  session_id?: string | null;
  visitor_id?: string | null;
  lead_id?: string | null;
  buyer_request_id?: string | null;
  metadata?: Record<string, any>;
};

function cleanText(value: unknown) {
  const text = String(value || "").trim();

  if (!text || text.toLowerCase() === "unknown") return "";

  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function cleanNumber(value: unknown) {
  const text = cleanText(value);
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function readHeader(request: NextRequest, key: string) {
  return cleanText(request.headers.get(key));
}

function getGeoMetadata(request: NextRequest) {
  const geo = geolocation(request);

  const countryCode =
    cleanText(geo.country) || readHeader(request, "x-vercel-ip-country");

  const region =
    cleanText((geo as any).countryRegion) ||
    cleanText((geo as any).region) ||
    readHeader(request, "x-vercel-ip-country-region");

  const city = cleanText(geo.city) || readHeader(request, "x-vercel-ip-city");

  const latitude =
    cleanNumber((geo as any).latitude) ||
    cleanNumber(request.headers.get("x-vercel-ip-latitude"));

  const longitude =
    cleanNumber((geo as any).longitude) ||
    cleanNumber(request.headers.get("x-vercel-ip-longitude"));

  const timezone =
    cleanText((geo as any).timezone) ||
    readHeader(request, "x-vercel-ip-timezone");

  return {
    geo_country_code: countryCode || null,
    geo_country_name: countryCode ? countryCode : null,
    geo_region: region || null,
    geo_city: city || null,
    geo_latitude: latitude,
    geo_longitude: longitude,
    geo_timezone: timezone || null,
  };
}

function getRequestMetadata(request: NextRequest) {
  return {
    server_user_agent: request.headers.get("user-agent") || "",
    server_host: request.headers.get("host") || "",
    server_referer: request.headers.get("referer") || "",
  };
}

function isValidEventName(value: unknown): value is AnalyticsEventName {
  return (
    value === "property_card_view" ||
    value === "property_detail_view" ||
    value === "property_whatsapp_click" ||
    value === "property_schedule_viewing_click" ||
    value === "property_view_detail_click" ||
    value === "lead_created" ||
    value === "buyer_request_submitted"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrackEventBody;

    if (!isValidEventName(body.event_name)) {
      return NextResponse.json(
        { ok: false, error: "Invalid event name." },
        { status: 400 }
      );
    }

    const geoMetadata = getGeoMetadata(request);
    const requestMetadata = getRequestMetadata(request);

    const { error } = await supabase.from("analytics_events").insert({
      event_name: body.event_name,
      property_id: body.property_id || null,
      user_id: body.user_id || null,
      source_page: body.source_page || null,
      session_id: body.session_id || null,
      visitor_id: body.visitor_id || null,
      lead_id: body.lead_id || null,
      buyer_request_id: body.buyer_request_id || null,
      metadata: {
        ...(body.metadata || {}),
        ...requestMetadata,
        ...geoMetadata,
      },
    });

    if (error) {
      console.error("Analytics insert error:", error);

      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, geo: geoMetadata });
  } catch (error: any) {
    console.error("Analytics route error:", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Analytics tracking failed." },
      { status: 500 }
    );
  }
}