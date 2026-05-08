import { NextRequest, NextResponse } from "next/server";
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

function cleanHeader(value: string | null) {
  const text = String(value || "").trim();
  if (!text || text.toLowerCase() === "unknown") return "";
  return decodeURIComponent(text);
}

function getGeoMetadata(request: NextRequest) {
  const countryCode = cleanHeader(request.headers.get("x-vercel-ip-country"));
  const countryRegion = cleanHeader(
    request.headers.get("x-vercel-ip-country-region")
  );
  const city = cleanHeader(request.headers.get("x-vercel-ip-city"));
  const latitude = cleanHeader(request.headers.get("x-vercel-ip-latitude"));
  const longitude = cleanHeader(request.headers.get("x-vercel-ip-longitude"));
  const timezone = cleanHeader(request.headers.get("x-vercel-ip-timezone"));

  return {
    geo_country_code: countryCode || null,
    geo_region: countryRegion || null,
    geo_city: city || null,
    geo_latitude: latitude ? Number(latitude) : null,
    geo_longitude: longitude ? Number(longitude) : null,
    geo_timezone: timezone || null,
  };
}

function getRequestMetadata(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";

  return {
    server_user_agent: userAgent,
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

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Analytics route error:", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Analytics tracking failed." },
      { status: 500 }
    );
  }
}