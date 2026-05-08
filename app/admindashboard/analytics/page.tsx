"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Download,
  Filter,
  Globe,
  MapPin,
  MapPinned,
  Monitor,
  MousePointerClick,
  Search,
  Smartphone,
  Tablet,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    __tetamoGoogleMapsPromise?: Promise<void>;
  }
}

type AnalyticsEventName =
  | "property_card_view"
  | "property_detail_view"
  | "property_whatsapp_click"
  | "property_schedule_viewing_click"
  | "property_view_detail_click"
  | "lead_created"
  | "buyer_request_submitted";

type DateRangeOption = "today" | "7d" | "30d" | "all";

type AnalyticsEventRow = {
  id: string;
  created_at: string;
  event_name: AnalyticsEventName;
  property_id: string | null;
  user_id: string | null;
  source_page: string | null;
  session_id: string | null;
  visitor_id: string | null;
  lead_id: string | null;
  buyer_request_id: string | null;
  metadata: Record<string, any> | null;
};

type PropertyRow = {
  id: string;
  kode: string | null;
  title: string | null;
  city: string | null;
  province: string | null;
  area: string | null;
};

type TrafficSource = {
  name: string;
  visits: number;
};

type DeviceData = {
  name: string;
  visits: number;
};

type PageViewItem = {
  name: string;
  visits: number;
};

type ListingAnalytics = {
  id: string;
  kode: string;
  title: string;
  city: string;
  views: number;
  clicks: number;
  leads: number;
};

type RecentEventItem = {
  id: string;
  event_name: AnalyticsEventName;
  created_at: string;
  property_id: string | null;
  title: string;
  kode: string;
  city: string;
  source_page: string;
};

type LocationStat = {
  key: string;
  label: string;
  sublabel?: string;
  countryCode?: string;
  visits: number;
  events: number;
};

type BubbleMapPoint = {
  key: string;
  label: string;
  sublabel: string;
  countryCode: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  visits: number;
  events: number;
  views: number;
  clicks: number;
  leads: number;
};

type PropertyCountryInsight = {
  propertyId: string;
  kode: string;
  title: string;
  city: string;
  topCountry: string;
  topCountryCode: string;
  topCountryVisitors: number;
  countries: string;
  views: number;
  clicks: number;
  leads: number;
};

type MetaAttribution = {
  platform: "Facebook" | "Instagram" | "Messenger" | "Audience Network" | "Meta";
  source: string;
  medium: string;
  campaign: string;
  adSet: string;
  adName: string;
  campaignId: string;
  isTagged: boolean;
};

type MetaAdInsight = {
  key: string;
  platform: string;
  source: string;
  campaign: string;
  adSet: string;
  adName: string;
  campaignId: string;
  visits: number;
  events: number;
  views: number;
  clicks: number;
  leads: number;
  countries: string;
  isTagged: boolean;
};

const GOOGLE_MAPS_SCRIPT_ID = "tetamo-google-maps-script";

const DATE_FILTERS: { value: DateRangeOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All" },
];

function loadGoogleMapsScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in browser."));
  }

  const googleWindow = (window as any).google;

  if (googleWindow?.maps) {
    return Promise.resolve();
  }

  if (window.__tetamoGoogleMapsPromise) {
    return window.__tetamoGoogleMapsPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.")
    );
  }

  window.__tetamoGoogleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      GOOGLE_MAPS_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Failed to load Google Maps.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&v=weekly`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };

    script.onerror = () => {
      reject(new Error("Failed to load Google Maps."));
    };

    document.head.appendChild(script);
  });

  return window.__tetamoGoogleMapsPromise;
}

function numberFormat(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function percentFormat(value: number) {
  return `${value.toFixed(1)}%`;
}

function cleanText(value: any) {
  return String(value ?? "").trim();
}

function cleanLower(value: any) {
  return cleanText(value).toLowerCase();
}

function cleanUpper(value: any) {
  return cleanText(value).toUpperCase();
}

function cleanNumber(value: any) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function csvCell(value: any) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getCountryName(countryCode: string) {
  const code = cleanUpper(countryCode);

  if (!code) return "Unknown Country";

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code) || code;
  } catch {
    return code;
  }
}

function getCountryFlag(countryCode?: string) {
  const code = cleanUpper(countryCode);

  if (!code || code.length !== 2) return "🌍";

  return code
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getDateRangeStart(range: DateRangeOption) {
  const now = new Date();

  if (range === "all") return null;

  if (range === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const days = range === "7d" ? 7 : 30;
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date;
}

function getDateRangeLabel(range: DateRangeOption) {
  if (range === "today") return "Today";
  if (range === "7d") return "Last 7 Days";
  if (range === "30d") return "Last 30 Days";
  return "All Time";
}

function getEventSessionKey(event: AnalyticsEventRow) {
  return event.session_id || event.visitor_id || event.id;
}

function getEventCountryCode(event: AnalyticsEventRow) {
  return cleanUpper(
    event.metadata?.geo_country_code ||
      event.metadata?.country_code ||
      event.metadata?.country
  );
}

function getEventRegion(event: AnalyticsEventRow) {
  return cleanText(
    event.metadata?.geo_region ||
      event.metadata?.region ||
      event.metadata?.country_region
  );
}

function getEventCity(event: AnalyticsEventRow) {
  return cleanText(event.metadata?.geo_city || event.metadata?.city);
}

function getEventLatitude(event: AnalyticsEventRow) {
  return cleanNumber(event.metadata?.geo_latitude || event.metadata?.latitude);
}

function getEventLongitude(event: AnalyticsEventRow) {
  return cleanNumber(event.metadata?.geo_longitude || event.metadata?.longitude);
}

function isClickEvent(eventName: AnalyticsEventName) {
  return (
    eventName === "property_whatsapp_click" ||
    eventName === "property_view_detail_click" ||
    eventName === "property_schedule_viewing_click"
  );
}

function isViewEvent(eventName: AnalyticsEventName) {
  return (
    eventName === "property_detail_view" || eventName === "property_card_view"
  );
}

function eventLabel(eventName: AnalyticsEventName) {
  switch (eventName) {
    case "property_whatsapp_click":
      return "WhatsApp Click";
    case "property_schedule_viewing_click":
      return "Schedule Viewing Click";
    case "property_view_detail_click":
      return "View Detail Click";
    case "property_detail_view":
      return "Property Detail View";
    case "property_card_view":
      return "Property Card View";
    case "lead_created":
      return "Lead Submitted";
    case "buyer_request_submitted":
      return "Buyer Request Submitted";
    default:
      return eventName;
  }
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function formatRelativeTime(value: string) {
  const now = Date.now();
  const then = new Date(value).getTime();

  if (Number.isNaN(then)) return value;

  const diffMs = now - then;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getTrafficSourceLabel(event: AnalyticsEventRow) {
  const source = String(event.metadata?.traffic_source ?? "").trim();
  const medium = String(event.metadata?.traffic_medium ?? "").trim();
  const referrerDomain = String(event.metadata?.referrer_domain ?? "").trim();

  if (source && medium && medium !== "direct") return `${source} / ${medium}`;
  if (source) return source;
  if (referrerDomain) return referrerDomain;

  return "Direct";
}

function getDeviceLabel(event: AnalyticsEventRow) {
  const device = String(event.metadata?.device_type ?? "").trim();
  if (!device) return "Unknown";
  return device;
}

function visiblePageNumbers(current: number, total: number) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return pages;
}

function shortenPath(value: string, maxLength = 64) {
  if (!value) return "-";
  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeMetaPlatform(source: string, referrerDomain: string) {
  const s = cleanLower(source);
  const ref = cleanLower(referrerDomain);

  if (
    s === "ig" ||
    s.includes("instagram") ||
    ref.includes("instagram") ||
    ref.includes("l.instagram")
  ) {
    return "Instagram" as const;
  }

  if (
    s === "fb" ||
    s.includes("facebook") ||
    ref.includes("facebook") ||
    ref.includes("lm.facebook") ||
    ref.includes("l.facebook")
  ) {
    return "Facebook" as const;
  }

  if (s === "msg" || s.includes("messenger")) {
    return "Messenger" as const;
  }

  if (s === "an" || s.includes("audience")) {
    return "Audience Network" as const;
  }

  return "Meta" as const;
}

function getMetaAttribution(event: AnalyticsEventRow): MetaAttribution | null {
  const metadata = event.metadata || {};

  const utmSource = cleanText(metadata.utm_source);
  const utmMedium = cleanText(metadata.utm_medium);
  const utmCampaign = cleanText(metadata.utm_campaign);
  const utmContent = cleanText(metadata.utm_content);
  const utmTerm = cleanText(metadata.utm_term);
  const utmId = cleanText(metadata.utm_id);
  const utmPlatform = cleanLower(metadata.utm_platform);
  const trafficSource = cleanText(metadata.traffic_source);
  const referrerDomain = cleanText(metadata.referrer_domain);

  const sourceCheck = cleanLower(
    `${utmSource} ${utmMedium} ${utmPlatform} ${trafficSource} ${referrerDomain}`
  );

  const isMeta =
    utmPlatform === "meta" ||
    utmMedium === "paid_social" ||
    sourceCheck.includes("facebook") ||
    sourceCheck.includes("instagram") ||
    sourceCheck.includes("fb") ||
    sourceCheck.includes("ig") ||
    sourceCheck.includes("l.instagram") ||
    sourceCheck.includes("lm.facebook") ||
    sourceCheck.includes("l.facebook");

  if (!isMeta) return null;

  const source = utmSource || trafficSource || referrerDomain || "meta";
  const platform = normalizeMetaPlatform(source, referrerDomain);

  return {
    platform,
    source,
    medium: utmMedium || "referral",
    campaign: utmCampaign || "No campaign tag",
    adSet: utmTerm || "No ad set tag",
    adName: utmContent || "No ad tag",
    campaignId: utmId || "",
    isTagged: Boolean(utmSource || utmCampaign || utmContent || utmTerm || utmId),
  };
}

function StatCard({
  title,
  value,
  Icon,
  caption,
}: {
  title: string;
  value: string | number;
  Icon: ElementType;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
            {title}
          </p>
          <p className="mt-1.5 break-words text-lg font-semibold text-[#1C1C1E] sm:text-xl">
            {value}
          </p>
          {caption ? (
            <p className="mt-1.5 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              {caption}
            </p>
          ) : null}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

function PlaceholderBlock({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: ElementType;
}) {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-[#FAFAFA] p-5 text-center sm:min-h-[340px] sm:p-6">
      <Icon className="mb-3 h-8 w-8 text-gray-400 sm:h-9 sm:w-9" />
      <p className="text-[13px] font-medium text-[#1C1C1E] sm:text-sm">
        {title}
      </p>
      <p className="mt-1 max-w-md text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
        {description}
      </p>
    </div>
  );
}

function MiniList({
  title,
  items,
  empty,
  icon: Icon,
  showFlag = false,
}: {
  title: string;
  items: LocationStat[];
  empty: string;
  icon: ElementType;
  showFlag?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
        </div>
        <h3 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
          {title}
        </h3>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2.5">
          {items.slice(0, 6).map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 text-[12px] sm:text-sm"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  {showFlag ? (
                    <span className="shrink-0 text-lg leading-none">
                      {getCountryFlag(item.countryCode)}
                    </span>
                  ) : null}

                  <span className="min-w-0 truncate font-medium text-[#1C1C1E]">
                    {item.label}
                  </span>
                </div>

                {item.sublabel ? (
                  <p className="mt-0.5 truncate text-[10px] text-gray-500 sm:text-[11px]">
                    {item.sublabel}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                <p className="font-semibold text-[#1C1C1E]">
                  {numberFormat(item.visits)}
                </p>
                <p className="text-[10px] text-gray-500 sm:text-[11px]">
                  visitors
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-gray-500 sm:text-sm">{empty}</p>
      )}
    </div>
  );
}

function DeviceDonut({ devices }: { devices: DeviceData[] }) {
  const total = devices.reduce((sum, item) => sum + item.visits, 0);
  const mobile = devices.find((item) => item.name === "Mobile")?.visits || 0;
  const desktop = devices.find((item) => item.name === "Desktop")?.visits || 0;
  const tablet = devices.find((item) => item.name === "Tablet")?.visits || 0;

  const mobilePct = total > 0 ? (mobile / total) * 100 : 0;
  const desktopPct = total > 0 ? (desktop / total) * 100 : 0;
  const tabletPct = total > 0 ? (tablet / total) * 100 : 0;

  const gradient =
    total > 0
      ? `conic-gradient(#2563eb 0 ${mobilePct}%, #111827 ${mobilePct}% ${
          mobilePct + desktopPct
        }%, #93c5fd ${mobilePct + desktopPct}% ${
          mobilePct + desktopPct + tabletPct
        }%, #e5e7eb ${mobilePct + desktopPct + tabletPct}% 100%)`
      : "conic-gradient(#e5e7eb 0 100%)";

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-20 w-20 shrink-0 rounded-full"
        style={{ background: gradient }}
      >
        <div className="absolute inset-4 rounded-full bg-white" />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-gray-500">Mobile</span>
          <span className="font-semibold text-[#1C1C1E]">
            {percentFormat(mobilePct)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-gray-500">Desktop</span>
          <span className="font-semibold text-[#1C1C1E]">
            {percentFormat(desktopPct)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-gray-500">Tablet</span>
          <span className="font-semibold text-[#1C1C1E]">
            {percentFormat(tabletPct)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BubbleIntensityMap({
  points,
  loading,
}: {
  points: BubbleMapPoint[];
  loading: boolean;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!mapElementRef.current) return;

      try {
        setMapError("");

        await loadGoogleMapsScript();

        const googleMaps = (window as any).google?.maps;

        if (cancelled || !mapElementRef.current || !googleMaps) return;

        const validPoints = points.filter(
          (point) =>
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng) &&
            !(point.lat === 0 && point.lng === 0)
        );

        const fallbackCenter = { lat: -2.5489, lng: 118.0149 };
        const firstPoint = validPoints[0];

        const center = firstPoint
          ? { lat: firstPoint.lat, lng: firstPoint.lng }
          : fallbackCenter;

        if (!mapRef.current) {
          mapRef.current = new googleMaps.Map(mapElementRef.current, {
            center,
            zoom: firstPoint ? 10 : 4,
            disableDefaultUI: true,
            zoomControl: true,
            fullscreenControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
          });
        }

        const map = mapRef.current;

        overlaysRef.current.forEach((overlay) => overlay.setMap(null));
        overlaysRef.current = [];

        if (!infoWindowRef.current) {
          infoWindowRef.current = new googleMaps.InfoWindow();
        }

        if (validPoints.length === 0) {
          map.setCenter(fallbackCenter);
          map.setZoom(4);
          return;
        }

        const bounds = new googleMaps.LatLngBounds();

        validPoints.forEach((point) => {
          const visitCount = Math.max(1, point.visits);
          const absoluteIntensity = Math.min(
            1,
            Math.log10(visitCount + 1) / Math.log10(40)
          );

          const position = { lat: point.lat, lng: point.lng };
          bounds.extend(position);

          const radius = Math.min(22000, 2200 + Math.sqrt(visitCount) * 2200);
          const outerRadius = Math.min(30000, radius * 1.3);

          const fillOpacity = Math.min(0.28, 0.1 + absoluteIntensity * 0.16);
          const outerFillOpacity = Math.min(
            0.14,
            0.035 + absoluteIntensity * 0.075
          );
          const strokeOpacity = Math.min(
            0.68,
            0.34 + absoluteIntensity * 0.22
          );
          const strokeWeight = visitCount >= 10 ? 2 : 1;

          const outerCircle = new googleMaps.Circle({
            map,
            center: position,
            radius: outerRadius,
            strokeColor: "#2563eb",
            strokeOpacity: 0.05,
            strokeWeight: 1,
            fillColor: "#2563eb",
            fillOpacity: outerFillOpacity,
            clickable: false,
          });

          const innerCircle = new googleMaps.Circle({
            map,
            center: position,
            radius,
            strokeColor: "#1d4ed8",
            strokeOpacity,
            strokeWeight,
            fillColor: "#2563eb",
            fillOpacity,
            clickable: true,
          });

          const labelMarker = new googleMaps.Marker({
            position,
            map,
            clickable: false,
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              scale: 0,
              strokeOpacity: 0,
              fillOpacity: 0,
            },
            label: {
              text: String(point.visits),
              color: "#0f172a",
              fontSize: "12px",
              fontWeight: "700",
            },
          });

          innerCircle.addListener("click", () => {
            const country = point.countryCode
              ? getCountryName(point.countryCode)
              : "";

            infoWindowRef.current.setContent(`
              <div style="font-family: Arial, sans-serif; min-width: 220px;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                  ${escapeHtml(point.label)}
                </div>
                <div style="font-size: 12px; color: #555;">
                  ${escapeHtml(point.sublabel || country || "")}
                </div>
                <div style="font-size: 12px; margin-top: 10px; line-height: 1.7;">
                  <strong>${numberFormat(point.visits)}</strong> visitors<br/>
                  <strong>${numberFormat(point.events)}</strong> events<br/>
                  <strong>${numberFormat(point.views)}</strong> views<br/>
                  <strong>${numberFormat(point.clicks)}</strong> clicks<br/>
                  <strong>${numberFormat(point.leads)}</strong> leads
                </div>
              </div>
            `);

            infoWindowRef.current.setPosition(position);
            infoWindowRef.current.open(map);
          });

          overlaysRef.current.push(outerCircle, innerCircle, labelMarker);
        });

        if (validPoints.length === 1) {
          map.setCenter({
            lat: validPoints[0].lat,
            lng: validPoints[0].lng,
          });
          map.setZoom(10);
        } else {
          map.fitBounds(bounds, 90);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMapError(error?.message || "Failed to load map.");
        }
      }
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [points]);

  if (loading) {
    return (
      <PlaceholderBlock
        title="Loading visitor map..."
        description="Tetamo is preparing the viewer location bubble map."
        icon={MapPinned}
      />
    );
  }

  if (mapError) {
    return (
      <PlaceholderBlock
        title="Map not available yet"
        description={mapError}
        icon={MapPinned}
      />
    );
  }

  if (points.length === 0) {
    return (
      <PlaceholderBlock
        title="No visitor location yet"
        description="Once live Vercel traffic includes latitude and longitude, Tetamo will show clean blue visitor bubbles on the map."
        icon={MapPinned}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
      <div ref={mapElementRef} className="h-[360px] w-full sm:h-[440px]" />
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeOption>("7d");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const listingPerformancePageSize = 10;
  const [listingPerformancePage, setListingPerformancePage] = useState(1);

  const recentEventsPageSize = 3;
  const [recentEventsPage, setRecentEventsPage] = useState(1);

  useEffect(() => {
    let ignore = false;

    async function loadAnalytics() {
      setLoading(true);

      const [
        { data: propertyRows, error: propertyError },
        { data: eventRows, error: eventError },
      ] = await Promise.all([
        supabase
          .from("properties")
          .select("id, kode, title, city, province, area")
          .order("created_at", { ascending: false }),
        supabase
          .from("analytics_events")
          .select(
            "id, created_at, event_name, property_id, user_id, source_page, session_id, visitor_id, lead_id, buyer_request_id, metadata"
          )
          .order("created_at", { ascending: false })
          .limit(10000),
      ]);

      if (propertyError) {
        console.error("Failed to load properties for analytics:", propertyError);
      }

      if (eventError) {
        console.error("Failed to load analytics events:", eventError);
      }

      if (!ignore) {
        setProperties((propertyRows ?? []) as PropertyRow[]);
        setEvents((eventRows ?? []) as AnalyticsEventRow[]);
        setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-analytics-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analytics_events",
        },
        (payload) => {
          const nextEvent = payload.new as AnalyticsEventRow;
          setEvents((prev) => [nextEvent, ...prev].slice(0, 10000));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const propertyMap = useMemo<Map<string, PropertyRow>>(() => {
    const map = new Map<string, PropertyRow>();

    for (const item of properties) {
      map.set(item.id, item);
    }

    return map;
  }, [properties]);

  const dateFilteredEvents = useMemo(() => {
    const start = getDateRangeStart(dateRange);
    if (!start) return events;

    const startTime = start.getTime();

    return events.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return !Number.isNaN(time) && time >= startTime;
    });
  }, [events, dateRange]);

  const analyticsEvents = useMemo(() => {
    if (selectedPropertyId === "all") return dateFilteredEvents;

    return dateFilteredEvents.filter(
      (event) => event.property_id === selectedPropertyId
    );
  }, [dateFilteredEvents, selectedPropertyId]);

  const propertyScopedAllEvents = useMemo(() => {
    if (selectedPropertyId === "all") return events;

    return events.filter((event) => event.property_id === selectedPropertyId);
  }, [events, selectedPropertyId]);

  const propertyOptions = useMemo(() => {
    const idsWithEvents = new Set<string>();

    for (const event of dateFilteredEvents) {
      if (event.property_id) idsWithEvents.add(event.property_id);
    }

    return properties
      .filter((property) => idsWithEvents.has(property.id))
      .map((property) => ({
        id: property.id,
        label: `${property.kode || "No Code"} • ${property.title || "Untitled"}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [properties, dateFilteredEvents]);

  const selectedProperty = useMemo(() => {
    if (selectedPropertyId === "all") return null;
    return propertyMap.get(selectedPropertyId) || null;
  }, [selectedPropertyId, propertyMap]);

  const selectedScopeLabel =
    selectedPropertyId === "all"
      ? "All Properties"
      : selectedProperty?.title || "Selected Property";

  const last30Events = useMemo(() => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

    return propertyScopedAllEvents.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return !Number.isNaN(time) && time >= thirtyMinutesAgo;
    });
  }, [propertyScopedAllEvents]);

  const liveEvents = useMemo(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    return propertyScopedAllEvents.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return !Number.isNaN(time) && time >= fiveMinutesAgo;
    });
  }, [propertyScopedAllEvents]);

  const visitorsLast30 = useMemo(() => {
    const set = new Set<string>();

    for (const event of last30Events) {
      set.add(getEventSessionKey(event));
    }

    return set.size;
  }, [last30Events]);

  const liveVisitors = useMemo(() => {
    const set = new Set<string>();

    for (const event of liveEvents) {
      set.add(getEventSessionKey(event));
    }

    return set.size;
  }, [liveEvents]);

  const totalVisitors = useMemo(() => {
    const set = new Set<string>();

    for (const event of analyticsEvents) {
      set.add(getEventSessionKey(event));
    }

    return set.size;
  }, [analyticsEvents]);

  const totalViews = useMemo(() => {
    return analyticsEvents.filter((event) => isViewEvent(event.event_name))
      .length;
  }, [analyticsEvents]);

  const totalClicks = useMemo(() => {
    return analyticsEvents.filter((event) => isClickEvent(event.event_name))
      .length;
  }, [analyticsEvents]);

  const activeNow = liveVisitors;

  const trafficSources = useMemo<TrafficSource[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, Set<string>>();

    for (const event of analyticsEvents) {
      const label = getTrafficSourceLabel(event);
      const sessionKey = getEventSessionKey(event);

      if (!map.has(label)) {
        map.set(label, new Set<string>());
      }

      map.get(label)!.add(sessionKey);
    }

    return Array.from(map.entries())
      .map(([name, set]) => ({
        name,
        visits: set.size,
      }))
      .filter((item) => (q ? item.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.visits - a.visits);
  }, [analyticsEvents, searchQuery]);

  const devices = useMemo<DeviceData[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, Set<string>>();

    for (const event of analyticsEvents) {
      const label = getDeviceLabel(event);
      const sessionKey = getEventSessionKey(event);

      if (!map.has(label)) {
        map.set(label, new Set<string>());
      }

      map.get(label)!.add(sessionKey);
    }

    return Array.from(map.entries())
      .map(([name, set]) => ({
        name,
        visits: set.size,
      }))
      .filter((item) => (q ? item.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.visits - a.visits);
  }, [analyticsEvents, searchQuery]);

  const conversion = useMemo(() => {
    const views = analyticsEvents.filter((event) =>
      isViewEvent(event.event_name)
    ).length;
    const clicks = analyticsEvents.filter((event) =>
      isClickEvent(event.event_name)
    ).length;
    const leads = analyticsEvents.filter(
      (event) => event.event_name === "lead_created"
    ).length;

    return {
      views,
      clicks,
      leads,
      clickRate: views > 0 ? (clicks / views) * 100 : 0,
      leadRateFromClicks: clicks > 0 ? (leads / clicks) * 100 : 0,
      leadRateFromViews: views > 0 ? (leads / views) * 100 : 0,
    };
  }, [analyticsEvents]);

  const metaAdInsights = useMemo<MetaAdInsight[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    const map = new Map<
      string,
      {
        platform: string;
        source: string;
        medium: string;
        campaign: string;
        adSet: string;
        adName: string;
        campaignId: string;
        isTagged: boolean;
        sessions: Set<string>;
        events: number;
        views: number;
        clicks: number;
        leads: number;
        countries: Map<string, Set<string>>;
      }
    >();

    for (const event of analyticsEvents) {
      const meta = getMetaAttribution(event);
      if (!meta) continue;

      const key = [
        meta.platform,
        meta.source,
        meta.campaign,
        meta.adSet,
        meta.adName,
        meta.campaignId,
      ].join("|");

      if (!map.has(key)) {
        map.set(key, {
          platform: meta.platform,
          source: meta.source,
          medium: meta.medium,
          campaign: meta.campaign,
          adSet: meta.adSet,
          adName: meta.adName,
          campaignId: meta.campaignId,
          isTagged: meta.isTagged,
          sessions: new Set<string>(),
          events: 0,
          views: 0,
          clicks: 0,
          leads: 0,
          countries: new Map<string, Set<string>>(),
        });
      }

      const item = map.get(key)!;
      const sessionKey = getEventSessionKey(event);

      item.sessions.add(sessionKey);
      item.events += 1;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (isClickEvent(event.event_name)) item.clicks += 1;
      if (event.event_name === "lead_created") item.leads += 1;

      const countryCode = getEventCountryCode(event);
      if (countryCode) {
        const countryName = getCountryName(countryCode);
        if (!item.countries.has(countryName)) {
          item.countries.set(countryName, new Set<string>());
        }
        item.countries.get(countryName)!.add(sessionKey);
      }
    }

    return Array.from(map.entries())
      .map(([key, item]) => {
        const countryLabels = Array.from(item.countries.entries())
          .map(([country, sessions]) => `${country} (${sessions.size})`)
          .join(", ");

        return {
          key,
          platform: item.platform,
          source: item.source,
          campaign: item.campaign,
          adSet: item.adSet,
          adName: item.adName,
          campaignId: item.campaignId,
          visits: item.sessions.size,
          events: item.events,
          views: item.views,
          clicks: item.clicks,
          leads: item.leads,
          countries: countryLabels,
          isTagged: item.isTagged,
        };
      })
      .filter((item) => {
        if (!q) return true;

        return `${item.platform} ${item.source} ${item.campaign} ${item.adSet} ${item.adName} ${item.countries}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.visits - a.visits || b.clicks - a.clicks);
  }, [analyticsEvents, searchQuery]);

  const metaPlatformStats = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const event of analyticsEvents) {
      const meta = getMetaAttribution(event);
      if (!meta) continue;

      if (!map.has(meta.platform)) {
        map.set(meta.platform, new Set<string>());
      }

      map.get(meta.platform)!.add(getEventSessionKey(event));
    }

    const order = ["Facebook", "Instagram", "Messenger", "Audience Network", "Meta"];

    return order
      .map((platform) => ({
        platform,
        visits: map.get(platform)?.size || 0,
      }))
      .filter((item) => item.visits > 0);
  }, [analyticsEvents]);

  const pageViewsByPath = useMemo<PageViewItem[]>(() => {
    const map = new Map<string, number>();

    for (const event of analyticsEvents) {
      if (!isViewEvent(event.event_name)) continue;

      const pathname = cleanText(
        event.metadata?.pathname || event.source_page || "-"
      );

      map.set(pathname, (map.get(pathname) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, visits]) => ({ name, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);
  }, [analyticsEvents]);

  const topCountries = useMemo<LocationStat[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    const map = new Map<
      string,
      {
        countryCode: string;
        label: string;
        sessions: Set<string>;
        events: number;
      }
    >();

    for (const event of analyticsEvents) {
      const countryCode = getEventCountryCode(event);
      if (!countryCode) continue;

      const label = getCountryName(countryCode);
      const sessionKey = getEventSessionKey(event);

      if (!map.has(countryCode)) {
        map.set(countryCode, {
          countryCode,
          label,
          sessions: new Set<string>(),
          events: 0,
        });
      }

      const item = map.get(countryCode)!;
      item.sessions.add(sessionKey);
      item.events += 1;
    }

    return Array.from(map.entries())
      .map(([key, item]) => ({
        key,
        label: item.label,
        sublabel: item.countryCode,
        countryCode: item.countryCode,
        visits: item.sessions.size,
        events: item.events,
      }))
      .filter((item) =>
        q ? `${item.label} ${item.sublabel}`.toLowerCase().includes(q) : true
      )
      .sort((a, b) => b.visits - a.visits || b.events - a.events);
  }, [analyticsEvents, searchQuery]);

  const topCities = useMemo<LocationStat[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    const map = new Map<
      string,
      {
        label: string;
        sublabel: string;
        countryCode: string;
        sessions: Set<string>;
        events: number;
      }
    >();

    for (const event of analyticsEvents) {
      const countryCode = getEventCountryCode(event);
      const region = getEventRegion(event);
      const city = getEventCity(event);

      if (!countryCode && !region && !city) continue;

      const countryName = countryCode ? getCountryName(countryCode) : "";
      const label = city || region || countryName || "Unknown Location";
      const sublabel = [region && region !== label ? region : "", countryName]
        .filter(Boolean)
        .join(", ");

      const key = `${countryCode || "unknown"}-${region || "unknown"}-${
        city || "unknown"
      }`;

      const sessionKey = getEventSessionKey(event);

      if (!map.has(key)) {
        map.set(key, {
          label,
          sublabel,
          countryCode,
          sessions: new Set<string>(),
          events: 0,
        });
      }

      const item = map.get(key)!;
      item.sessions.add(sessionKey);
      item.events += 1;
    }

    return Array.from(map.entries())
      .map(([key, item]) => ({
        key,
        label: item.label,
        sublabel: item.sublabel,
        countryCode: item.countryCode,
        visits: item.sessions.size,
        events: item.events,
      }))
      .filter((item) =>
        q ? `${item.label} ${item.sublabel}`.toLowerCase().includes(q) : true
      )
      .sort((a, b) => b.visits - a.visits || b.events - a.events);
  }, [analyticsEvents, searchQuery]);

  const bubbleMapPoints = useMemo<BubbleMapPoint[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    const map = new Map<
      string,
      {
        label: string;
        sublabel: string;
        countryCode: string;
        city: string;
        region: string;
        lat: number;
        lng: number;
        sessions: Set<string>;
        events: number;
        views: number;
        clicks: number;
        leads: number;
      }
    >();

    for (const event of analyticsEvents) {
      const lat = getEventLatitude(event);
      const lng = getEventLongitude(event);

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        (lat === 0 && lng === 0)
      ) {
        continue;
      }

      const countryCode = getEventCountryCode(event);
      const countryName = countryCode ? getCountryName(countryCode) : "";
      const region = getEventRegion(event);
      const city = getEventCity(event);
      const label = city || region || countryName || "Unknown Location";
      const sublabel = [region && region !== label ? region : "", countryName]
        .filter(Boolean)
        .join(", ");

      const key = `${lat.toFixed(3)},${lng.toFixed(3)}-${label}`;
      const sessionKey = getEventSessionKey(event);

      if (!map.has(key)) {
        map.set(key, {
          label,
          sublabel,
          countryCode,
          city,
          region,
          lat,
          lng,
          sessions: new Set<string>(),
          events: 0,
          views: 0,
          clicks: 0,
          leads: 0,
        });
      }

      const item = map.get(key)!;
      item.sessions.add(sessionKey);
      item.events += 1;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (isClickEvent(event.event_name)) item.clicks += 1;
      if (event.event_name === "lead_created") item.leads += 1;
    }

    return Array.from(map.entries())
      .map(([key, item]) => ({
        key,
        label: item.label,
        sublabel: item.sublabel,
        countryCode: item.countryCode,
        city: item.city,
        region: item.region,
        lat: item.lat,
        lng: item.lng,
        visits: item.sessions.size,
        events: item.events,
        views: item.views,
        clicks: item.clicks,
        leads: item.leads,
      }))
      .filter((item) =>
        q ? `${item.label} ${item.sublabel}`.toLowerCase().includes(q) : true
      )
      .sort((a, b) => b.visits - a.visits || b.events - a.events);
  }, [analyticsEvents, searchQuery]);

  const listingPerformance = useMemo<ListingAnalytics[]>(() => {
    const map = new Map<string, ListingAnalytics>();

    for (const property of properties) {
      if (selectedPropertyId !== "all" && property.id !== selectedPropertyId) {
        continue;
      }

      map.set(property.id, {
        id: property.id,
        kode: property.kode ?? "-",
        title: property.title ?? "-",
        city: property.city || property.area || property.province || "-",
        views: 0,
        clicks: 0,
        leads: 0,
      });
    }

    for (const event of analyticsEvents) {
      if (!event.property_id) continue;

      const property = propertyMap.get(event.property_id);

      if (!map.has(event.property_id)) {
        map.set(event.property_id, {
          id: event.property_id,
          kode: String(event.metadata?.property_code ?? "-"),
          title: String(event.metadata?.property_title ?? "-"),
          city: property?.city || property?.area || property?.province || "-",
          views: 0,
          clicks: 0,
          leads: 0,
        });
      }

      const item = map.get(event.property_id);
      if (!item) continue;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (isClickEvent(event.event_name)) item.clicks += 1;
      if (event.event_name === "lead_created") item.leads += 1;
    }

    const q = searchQuery.trim().toLowerCase();

    return Array.from(map.values())
      .filter((item) => item.views > 0 || item.clicks > 0 || item.leads > 0)
      .filter((item) => {
        if (!q) return true;

        return (
          item.title.toLowerCase().includes(q) ||
          item.kode.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (b.leads !== a.leads) return b.leads - a.leads;
        if (b.clicks !== a.clicks) return b.clicks - a.clicks;
        return b.views - a.views;
      });
  }, [
    analyticsEvents,
    properties,
    propertyMap,
    searchQuery,
    selectedPropertyId,
  ]);

  const propertyCountryInsights = useMemo<PropertyCountryInsight[]>(() => {
    const propertyMapData = new Map<
      string,
      {
        propertyId: string;
        kode: string;
        title: string;
        city: string;
        views: number;
        clicks: number;
        leads: number;
        countries: Map<
          string,
          {
            countryCode: string;
            countryName: string;
            sessions: Set<string>;
            events: number;
          }
        >;
      }
    >();

    for (const event of analyticsEvents) {
      if (!event.property_id) continue;

      const property = propertyMap.get(event.property_id);

      if (!propertyMapData.has(event.property_id)) {
        propertyMapData.set(event.property_id, {
          propertyId: event.property_id,
          kode: property?.kode || String(event.metadata?.property_code || "-"),
          title:
            property?.title ||
            String(event.metadata?.property_title || "Unknown Property"),
          city: property?.city || property?.area || property?.province || "-",
          views: 0,
          clicks: 0,
          leads: 0,
          countries: new Map(),
        });
      }

      const item = propertyMapData.get(event.property_id)!;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (isClickEvent(event.event_name)) item.clicks += 1;
      if (event.event_name === "lead_created") item.leads += 1;

      const countryCode = getEventCountryCode(event);
      if (!countryCode) continue;

      const countryName = getCountryName(countryCode);
      const sessionKey = getEventSessionKey(event);

      if (!item.countries.has(countryCode)) {
        item.countries.set(countryCode, {
          countryCode,
          countryName,
          sessions: new Set(),
          events: 0,
        });
      }

      const country = item.countries.get(countryCode)!;
      country.sessions.add(sessionKey);
      country.events += 1;
    }

    return Array.from(propertyMapData.values())
      .map((item) => {
        const countries = Array.from(item.countries.values()).sort(
          (a, b) => b.sessions.size - a.sessions.size || b.events - a.events
        );

        const top = countries[0];

        return {
          propertyId: item.propertyId,
          kode: item.kode,
          title: item.title,
          city: item.city,
          topCountry: top?.countryName || "-",
          topCountryCode: top?.countryCode || "",
          topCountryVisitors: top?.sessions.size || 0,
          countries: countries
            .slice(0, 3)
            .map((country) => `${country.countryName} (${country.sessions.size})`)
            .join(", "),
          views: item.views,
          clicks: item.clicks,
          leads: item.leads,
        };
      })
      .filter(
        (item) =>
          item.views > 0 ||
          item.clicks > 0 ||
          item.leads > 0 ||
          item.topCountryVisitors > 0
      )
      .sort(
        (a, b) => b.topCountryVisitors - a.topCountryVisitors || b.views - a.views
      )
      .slice(0, 10);
  }, [analyticsEvents, propertyMap]);

  const listingPerformanceTotalPages = Math.max(
    1,
    Math.ceil(listingPerformance.length / listingPerformancePageSize)
  );

  useEffect(() => {
    setListingPerformancePage(1);
  }, [searchQuery, listingPerformance.length, dateRange, selectedPropertyId]);

  useEffect(() => {
    if (listingPerformancePage > listingPerformanceTotalPages) {
      setListingPerformancePage(listingPerformanceTotalPages);
    }
  }, [listingPerformancePage, listingPerformanceTotalPages]);

  const pagedListingPerformance = listingPerformance.slice(
    (listingPerformancePage - 1) * listingPerformancePageSize,
    listingPerformancePage * listingPerformancePageSize
  );

  const visibleListingPerformancePages = useMemo(
    () =>
      visiblePageNumbers(
        listingPerformancePage,
        listingPerformanceTotalPages
      ),
    [listingPerformancePage, listingPerformanceTotalPages]
  );

  const listingPerformanceStartItem =
    listingPerformance.length === 0
      ? 0
      : (listingPerformancePage - 1) * listingPerformancePageSize + 1;

  const listingPerformanceEndItem = Math.min(
    listingPerformancePage * listingPerformancePageSize,
    listingPerformance.length
  );

  const recentEvents = useMemo<RecentEventItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    return analyticsEvents
      .filter(
        (event) =>
          event.event_name === "property_whatsapp_click" ||
          event.event_name === "lead_created" ||
          event.event_name === "buyer_request_submitted" ||
          event.event_name === "property_schedule_viewing_click"
      )
      .map((event): RecentEventItem => {
        const property = event.property_id
          ? propertyMap.get(event.property_id)
          : null;

        return {
          id: event.id,
          event_name: event.event_name,
          created_at: event.created_at,
          property_id: event.property_id,
          title:
            property?.title ||
            String(event.metadata?.property_title ?? "Unknown Property"),
          kode: property?.kode || String(event.metadata?.property_code ?? "-"),
          city: property?.city || property?.area || property?.province || "-",
          source_page: event.source_page || "-",
        };
      })
      .filter((item) => {
        if (!q) return true;

        return (
          item.title.toLowerCase().includes(q) ||
          item.kode.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q) ||
          eventLabel(item.event_name).toLowerCase().includes(q)
        );
      });
  }, [analyticsEvents, propertyMap, searchQuery]);

  const recentEventsTotalPages = Math.max(
    1,
    Math.ceil(recentEvents.length / recentEventsPageSize)
  );

  useEffect(() => {
    setRecentEventsPage(1);
  }, [searchQuery, recentEvents.length, dateRange, selectedPropertyId]);

  useEffect(() => {
    if (recentEventsPage > recentEventsTotalPages) {
      setRecentEventsPage(recentEventsTotalPages);
    }
  }, [recentEventsPage, recentEventsTotalPages]);

  const pagedRecentEvents = recentEvents.slice(
    (recentEventsPage - 1) * recentEventsPageSize,
    recentEventsPage * recentEventsPageSize
  );

  const visibleRecentPages = useMemo(
    () => visiblePageNumbers(recentEventsPage, recentEventsTotalPages),
    [recentEventsPage, recentEventsTotalPages]
  );

  function handleExportReport() {
    const rows: string[][] = [];

    rows.push(["Tetamo Analytics Report"]);
    rows.push(["Date Range", getDateRangeLabel(dateRange)]);
    rows.push(["Scope", selectedScopeLabel]);
    rows.push(["Generated At", new Date().toISOString()]);
    rows.push([]);

    rows.push(["Summary"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Visitors", String(totalVisitors)]);
    rows.push(["Total Views", String(totalViews)]);
    rows.push(["Tracked Clicks", String(totalClicks)]);
    rows.push(["Live Visitors", String(liveVisitors)]);
    rows.push(["Click Rate", percentFormat(conversion.clickRate)]);
    rows.push(["Lead / Click", percentFormat(conversion.leadRateFromClicks)]);
    rows.push(["Lead / View", percentFormat(conversion.leadRateFromViews)]);
    rows.push([]);

    rows.push(["Meta Ads Performance"]);
    rows.push([
      "Platform",
      "Source",
      "Campaign",
      "Ad Set",
      "Ad Name",
      "Campaign ID",
      "Visitors",
      "Events",
      "Views",
      "Clicks",
      "Leads",
      "Countries",
      "Tagged",
    ]);

    metaAdInsights.forEach((item) => {
      rows.push([
        item.platform,
        item.source,
        item.campaign,
        item.adSet,
        item.adName,
        item.campaignId,
        String(item.visits),
        String(item.events),
        String(item.views),
        String(item.clicks),
        String(item.leads),
        item.countries,
        item.isTagged ? "Yes" : "No",
      ]);
    });

    rows.push([]);
    rows.push(["Listing Performance"]);
    rows.push(["Code", "Title", "City", "Views", "Clicks", "Leads"]);
    listingPerformance.forEach((item) => {
      rows.push([
        item.kode,
        item.title,
        item.city,
        String(item.views),
        String(item.clicks),
        String(item.leads),
      ]);
    });

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `tetamo-analytics-${dateRange}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-tight text-[#1C1C1E] sm:text-2xl">
            Real-time Analytics
          </h1>
          <p className="text-[12px] leading-5 text-gray-500 sm:text-sm">
            Track Tetamo visitors, Meta ads traffic, listing activity, and viewer
            location.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportReport}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_260px_180px]">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={16}
            />

            <input
              type="text"
              placeholder="Search source, Meta campaign, ad name, country, city, listing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:text-sm"
            />
          </div>

          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="h-11 rounded-2xl border border-gray-300 bg-white px-4 text-[13px] outline-none focus:border-[#1C1C1E] sm:text-sm"
          >
            <option value="all">All properties</option>
            {propertyOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-4 gap-1 rounded-2xl border border-gray-200 bg-gray-50 p-1">
            {DATE_FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setDateRange(item.value)}
                className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition sm:text-xs ${
                  dateRange === item.value
                    ? "bg-[#1C1C1E] text-white shadow-sm"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 sm:text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1">
            <Filter className="h-3.5 w-3.5" />
            {getDateRangeLabel(dateRange)}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Scope: {selectedScopeLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Visitors"
          value={numberFormat(totalVisitors)}
          Icon={Users}
          caption="Unique visitors in selected scope."
        />
        <StatCard
          title="Total Views"
          value={numberFormat(totalViews)}
          Icon={Globe}
          caption="Property card and detail views."
        />
        <StatCard
          title="Tracked Clicks"
          value={numberFormat(totalClicks)}
          Icon={MousePointerClick}
          caption="WhatsApp, details, and viewing clicks."
        />
        <StatCard
          title="Active Now"
          value={numberFormat(activeNow)}
          Icon={Activity}
          caption="Unique visitors in the last 5 minutes."
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-1 border-b border-gray-200 sm:grid-cols-2">
          <div className="border-b border-gray-200 px-5 py-5 sm:border-b-0 sm:border-r">
            <p className="text-sm font-medium text-[#1C1C1E]">
              Visitors in the last 30 minutes
            </p>
            <p className="mt-1 text-2xl font-bold text-[#1C1C1E]">
              {numberFormat(visitorsLast30)}
            </p>
          </div>

          <div className="px-5 py-5">
            <p className="text-sm font-medium text-[#1C1C1E]">Live visitors</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-2xl font-bold text-[#1C1C1E]">
                {numberFormat(liveVisitors)}
              </p>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)]" />
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <BubbleIntensityMap points={bubbleMapPoints} loading={loading} />
        </div>

        <div className="grid grid-cols-1 gap-5 border-t border-gray-200 p-4 sm:p-5 lg:grid-cols-3">
          <div>
            <h3 className="text-sm font-semibold text-[#1C1C1E]">Page views</h3>

            <div className="mt-3 space-y-2.5">
              {pageViewsByPath.length > 0 ? (
                pageViewsByPath.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 text-xs"
                    title={item.name}
                  >
                    <span className="min-w-0 truncate text-gray-500">
                      {shortenPath(item.name, 52)}
                    </span>
                    <span className="shrink-0 font-semibold text-[#1C1C1E]">
                      {numberFormat(item.visits)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No page view data yet.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1C1C1E]">
              Traffic source
            </h3>

            <div className="mt-3 space-y-2.5">
              {trafficSources.length > 0 ? (
                trafficSources.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 truncate text-gray-500">
                      {item.name}
                    </span>
                    <span className="shrink-0 font-semibold text-[#1C1C1E]">
                      {numberFormat(item.visits)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">
                  No traffic source data yet.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1C1C1E]">Device</h3>
            <div className="mt-3">
              <DeviceDonut devices={devices} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Meta Ads Performance
            </h2>
            <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              Shows Facebook/Instagram traffic from UTM tags and Meta referral
              sources. New FB clicks after your URL parameter update will appear
              here.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {metaPlatformStats.length > 0 ? (
            metaPlatformStats.map((item) => (
              <div
                key={item.platform}
                className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
              >
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  {item.platform}
                </p>
                <p className="mt-1 text-xl font-semibold text-[#1C1C1E]">
                  {numberFormat(item.visits)}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">visitors</p>
              </div>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-500">
              No Meta ad traffic detected yet. Future Facebook/Instagram clicks
              with UTM parameters will appear here.
            </div>
          )}
        </div>

        {metaAdInsights.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {metaAdInsights.slice(0, 12).map((item) => (
              <div key={item.key} className="px-4 py-4 sm:px-5">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-semibold text-white">
                        {item.platform}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          item.isTagged
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.isTagged ? "UTM Tagged" : "Referral / Untagged"}
                      </span>
                    </div>

                    <p className="mt-2 truncate text-sm font-semibold text-[#1C1C1E]">
                      {item.campaign}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-gray-500">
                      Ad Set: {item.adSet}
                    </p>
                    <p className="mt-1 truncate text-[12px] text-gray-500">
                      Ad: {item.adName}
                    </p>
                    {item.countries ? (
                      <p className="mt-1 truncate text-[11px] text-gray-400">
                        Countries: {item.countries}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-4 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400">Visitors</p>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {numberFormat(item.visits)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Views</p>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {numberFormat(item.views)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Clicks</p>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {numberFormat(item.clicks)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Leads</p>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {numberFormat(item.leads)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MiniList
          title="Top Countries"
          items={topCountries}
          empty="No country data yet."
          icon={Globe}
          showFlag
        />

        <MiniList
          title="Top Cities / Regions"
          items={topCities}
          empty="No city or region data yet."
          icon={MapPin}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Listing Performance
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              Showing 10 listings per page from analytics_events: views,
              clicks, and leads per listing.
            </p>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
              Loading analytics...
            </div>
          ) : listingPerformance.length > 0 ? (
            <>
              <div className="divide-y divide-gray-100">
                {pagedListingPerformance.map((item) => (
                  <div key={item.id} className="px-3.5 py-4 sm:px-5">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 sm:text-[11px]">
                          <span>Code: {item.kode}</span>
                          <span className="text-gray-300">•</span>
                          <span>{item.city}</span>
                        </div>

                        <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                          {item.title}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center">
                        <div>
                          <p className="text-[10px] text-gray-400 sm:text-[11px]">
                            Views
                          </p>
                          <p className="text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                            {numberFormat(item.views)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-gray-400 sm:text-[11px]">
                            Clicks
                          </p>
                          <p className="text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                            {numberFormat(item.clicks)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-gray-400 sm:text-[11px]">
                            Leads
                          </p>
                          <p className="text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                            {numberFormat(item.leads)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 px-3.5 py-4 sm:px-5">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
                    Showing {listingPerformanceStartItem}–
                    {listingPerformanceEndItem} of {listingPerformance.length}{" "}
                    listings
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setListingPerformancePage((p) => Math.max(1, p - 1))
                      }
                      disabled={listingPerformancePage === 1}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-40 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      Previous
                    </button>

                    {visibleListingPerformancePages.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setListingPerformancePage(p)}
                        className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                          listingPerformancePage === p
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setListingPerformancePage((p) =>
                          Math.min(listingPerformanceTotalPages, p + 1)
                        )
                      }
                      disabled={
                        listingPerformancePage === listingPerformanceTotalPages
                      }
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-40 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
              No tracked listing data yet.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
                <BarChart3 className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
              </div>
              <h3 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                Conversion Insight
              </h3>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] sm:text-sm">
                <span className="text-gray-500">Views</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {numberFormat(conversion.views)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[12px] sm:text-sm">
                <span className="text-gray-500">Clicks</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {numberFormat(conversion.clicks)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[12px] sm:text-sm">
                <span className="text-gray-500">Leads</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {numberFormat(conversion.leads)}
                </span>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between text-[12px] sm:text-sm">
                  <span className="text-gray-500">Click Rate</span>
                  <span className="font-semibold text-[#1C1C1E]">
                    {percentFormat(conversion.clickRate)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[12px] sm:text-sm">
                  <span className="text-gray-500">Lead / Click</span>
                  <span className="font-semibold text-[#1C1C1E]">
                    {percentFormat(conversion.leadRateFromClicks)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[12px] sm:text-sm">
                  <span className="text-gray-500">Lead / View</span>
                  <span className="font-semibold text-[#1C1C1E]">
                    {percentFormat(conversion.leadRateFromViews)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                Top Viewed Countries Per Listing
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                Useful for agent and developer reporting.
              </p>
            </div>

            {propertyCountryInsights.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {propertyCountryInsights.map((item) => (
                  <div key={item.propertyId} className="px-3.5 py-4 sm:px-5">
                    <div className="flex flex-col gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-500 sm:text-[11px]">
                          {item.kode} • {item.city}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm">
                          {item.title}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Top Country
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-[#1C1C1E]">
                              {getCountryFlag(item.topCountryCode)}{" "}
                              {item.topCountry}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#1C1C1E]">
                              {numberFormat(item.topCountryVisitors)}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              visitors
                            </p>
                          </div>
                        </div>

                        {item.countries ? (
                          <p className="mt-2 text-[11px] leading-5 text-gray-500">
                            {item.countries}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-gray-500 sm:px-5">
                No country-by-listing data yet.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
                  <Activity className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                    Real-Time Events
                  </h2>
                  <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                    Recent tracked interactions from the platform.
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-sm text-gray-500 sm:px-5">
                Loading recent events...
              </div>
            ) : recentEvents.length > 0 ? (
              <div className="px-3.5 py-4 sm:px-5">
                <div className="min-h-[250px] space-y-2.5 sm:min-h-[280px]">
                  {pagedRecentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                            {eventLabel(event.event_name)}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-gray-600 sm:text-xs">
                            {event.title}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-500 sm:text-[11px]">
                            {event.kode} <span className="text-gray-300">•</span>{" "}
                            {event.city}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-medium text-[#1C1C1E] sm:text-xs">
                            {formatRelativeTime(event.created_at)}
                          </p>
                          <p className="mt-1 max-w-[90px] truncate text-[10px] text-gray-500 sm:max-w-[120px] sm:text-[11px]">
                            {event.source_page}
                          </p>
                        </div>
                      </div>

                      <p className="mt-2 text-[10px] text-gray-500 sm:text-[11px]">
                        {formatDateTime(event.created_at)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
                    Page {recentEventsPage} of {recentEventsTotalPages}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRecentEventsPage((p) => Math.max(1, p - 1))
                      }
                      disabled={recentEventsPage === 1}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-40 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      Previous
                    </button>

                    {visibleRecentPages.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setRecentEventsPage(p)}
                        className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                          recentEventsPage === p
                            ? "border-black bg-black text-white"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() =>
                        setRecentEventsPage((p) =>
                          Math.min(recentEventsTotalPages, p + 1)
                        )
                      }
                      disabled={recentEventsPage === recentEventsTotalPages}
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-40 sm:h-10 sm:px-4 sm:text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-sm text-gray-500 sm:px-5">
                No recent tracked events yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-5 text-gray-500 sm:text-xs">
        Note: Meta Ads Performance becomes clearer after your ads use URL
        parameters. Old boosted Instagram traffic may still appear as referral
        or direct.
      </p>
    </div>
  );
}