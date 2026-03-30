import { supabase } from "@/lib/supabase";

export type AnalyticsEventName =
  | "property_card_view"
  | "property_detail_view"
  | "property_whatsapp_click"
  | "property_schedule_viewing_click"
  | "property_view_detail_click"
  | "lead_created"
  | "buyer_request_submitted";

type TrackEventParams = {
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

function getVisitorId() {
  if (typeof window === "undefined") return null;

  const key = "tetamo_visitor_id";
  let visitorId = localStorage.getItem(key);

  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem(key, visitorId);
  }

  return visitorId;
}

function getSessionId() {
  if (typeof window === "undefined") return null;

  const key = "tetamo_session_id";
  let sessionId = sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }

  return sessionId;
}

function getReferrerDomain(referrer: string) {
  if (!referrer) return "";

  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function detectBrowser(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "Chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("firefox/")) return "Firefox";

  return "Unknown";
}

function detectOS(userAgent: string) {
  const ua = userAgent.toLowerCase();

  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios"))
    return "iOS";
  if (ua.includes("linux")) return "Linux";

  return "Unknown";
}

function detectDeviceType(userAgent: string, width: number) {
  const ua = userAgent.toLowerCase();

  if (
    ua.includes("ipad") ||
    ua.includes("tablet") ||
    (width >= 768 && width <= 1024)
  ) {
    return "Tablet";
  }

  if (
    ua.includes("mobi") ||
    ua.includes("iphone") ||
    ua.includes("android")
  ) {
    return "Mobile";
  }

  return "Desktop";
}

function detectTrafficSource(referrerDomain: string, utmSource: string) {
  const source = utmSource.trim().toLowerCase();
  const ref = referrerDomain.trim().toLowerCase();

  if (source) return source;
  if (!ref) return "Direct";

  if (ref.includes("google")) return "Google";
  if (ref.includes("facebook")) return "Facebook";
  if (ref.includes("instagram")) return "Instagram";
  if (ref.includes("tiktok")) return "TikTok";
  if (ref.includes("linkedin")) return "LinkedIn";
  if (ref.includes("youtube")) return "YouTube";

  return referrerDomain;
}

function buildBrowserMetadata() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {};
  }

  const url = new URL(window.location.href);
  const params = url.searchParams;

  const userAgent = navigator.userAgent || "";
  const referrer = document.referrer || "";
  const referrerDomain = getReferrerDomain(referrer);

  const utm_source = params.get("utm_source") || "";
  const utm_medium = params.get("utm_medium") || "";
  const utm_campaign = params.get("utm_campaign") || "";
  const utm_term = params.get("utm_term") || "";
  const utm_content = params.get("utm_content") || "";

  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent);
  const device_type = detectDeviceType(userAgent, window.innerWidth);

  const traffic_source = detectTrafficSource(referrerDomain, utm_source);
  const traffic_medium = utm_medium || (referrerDomain ? "referral" : "direct");

  return {
    page_url: window.location.href,
    pathname: window.location.pathname,
    referrer,
    referrer_domain: referrerDomain,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    traffic_source,
    traffic_medium,
    browser,
    os,
    device_type,
    language: navigator.language || "",
    viewport_width: window.innerWidth || null,
    viewport_height: window.innerHeight || null,
    screen_width: window.screen?.width || null,
    screen_height: window.screen?.height || null,
  };
}

export async function trackEvent({
  event_name,
  property_id = null,
  user_id = null,
  source_page = null,
  session_id,
  visitor_id,
  lead_id = null,
  buyer_request_id = null,
  metadata = {},
}: TrackEventParams) {
  try {
    const finalVisitorId = visitor_id ?? getVisitorId();
    const finalSessionId = session_id ?? getSessionId();
    const browserMetadata = buildBrowserMetadata();

    const { error } = await supabase.from("analytics_events").insert({
      event_name,
      property_id,
      user_id,
      source_page,
      session_id: finalSessionId,
      visitor_id: finalVisitorId,
      lead_id,
      buyer_request_id,
      metadata: {
        ...browserMetadata,
        ...metadata,
      },
    });

    if (error) {
      console.error("trackEvent insert error:", error);
    }
  } catch (error) {
    console.error("trackEvent unexpected error:", error);
  }
}