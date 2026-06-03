"use client";

import type { ElementType, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Download,
  Eye,
  Filter,
  Flame,
  Globe,
  MapPin,
  MessageCircle,
  MousePointerClick,
  RefreshCw,
  Search,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    __tetamoGoogleMapsPromise?: Promise<void>;
  }
}

type DateRangeOption = "today" | "7d" | "30d" | "all";

type AnalyticsEventRow = {
  id: string;
  created_at: string;
  event_name: string;
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

type StatItem = {
  label: string;
  value: number;
};

type LocationStat = {
  key: string;
  countryCode: string;
  country: string;
  region: string;
  city: string;
  label: string;
  sublabel: string;
  visitors: number;
  events: number;
  views: number;
  clicks: number;
  leads: number;
  lat: number | null;
  lng: number | null;
};

type ListingInsight = {
  propertyId: string;
  kode: string;
  title: string;
  city: string;
  views: number;
  detailViews: number;
  detailClicks: number;
  whatsappClicks: number;
  scheduleClicks: number;
  leads: number;
  topCountry: string;
  topRegion: string;
  topCity: string;
  topLocationText: string;
};

type CampaignInsight = {
  key: string;
  platform: string;
  source: string;
  medium: string;
  campaign: string;
  adSet: string;
  adName: string;
  visitors: number;
  events: number;
  views: number;
  clicks: number;
  leads: number;
  countries: string;
  tagged: boolean;
};

const GOOGLE_MAPS_SCRIPT_ID = "tetamo-google-maps-script";

const DATE_FILTERS: { value: DateRangeOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "all", label: "All" },
];

const VIEW_EVENTS = new Set(["property_card_view", "property_detail_view"]);

const CLICK_EVENTS = new Set([
  "property_view_detail_click",
  "property_whatsapp_click",
  "property_schedule_viewing_click",
]);

const LEAD_EVENTS = new Set(["lead_created", "buyer_request_submitted"]);

const LOCATION_FALLBACKS: Record<string, { lat: number; lng: number }> = {
  indonesia: { lat: -2.5489, lng: 118.0149 },
  id: { lat: -2.5489, lng: 118.0149 },
  jakarta: { lat: -6.2088, lng: 106.8456 },
  "dki jakarta": { lat: -6.2088, lng: 106.8456 },
  "west jakarta": { lat: -6.1683, lng: 106.7588 },
  "jakarta barat": { lat: -6.1683, lng: 106.7588 },
  "south jakarta": { lat: -6.2615, lng: 106.8106 },
  "jakarta selatan": { lat: -6.2615, lng: 106.8106 },
  "central jakarta": { lat: -6.1865, lng: 106.8341 },
  "jakarta pusat": { lat: -6.1865, lng: 106.8341 },
  "north jakarta": { lat: -6.1384, lng: 106.8639 },
  "jakarta utara": { lat: -6.1384, lng: 106.8639 },
  "east jakarta": { lat: -6.225, lng: 106.9004 },
  "jakarta timur": { lat: -6.225, lng: 106.9004 },
  bali: { lat: -8.3405, lng: 115.092 },
  canggu: { lat: -8.65, lng: 115.138 },
  seminyak: { lat: -8.6913, lng: 115.1682 },
  denpasar: { lat: -8.65, lng: 115.2167 },
  ubud: { lat: -8.5069, lng: 115.2625 },
  kuta: { lat: -8.7223, lng: 115.1763 },
  badung: { lat: -8.5819, lng: 115.1771 },
  bandung: { lat: -6.9175, lng: 107.6191 },
  bogor: { lat: -6.595, lng: 106.8166 },
  surabaya: { lat: -7.2575, lng: 112.7521 },
  yogyakarta: { lat: -7.7956, lng: 110.3695 },
  medan: { lat: 3.5952, lng: 98.6722 },
  makassar: { lat: -5.1477, lng: 119.4327 },
  australia: { lat: -25.2744, lng: 133.7751 },
  au: { lat: -25.2744, lng: 133.7751 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  sg: { lat: 1.3521, lng: 103.8198 },
  malaysia: { lat: 4.2105, lng: 101.9758 },
  my: { lat: 4.2105, lng: 101.9758 },
  "kuala lumpur": { lat: 3.139, lng: 101.6869 },
  philippines: { lat: 12.8797, lng: 121.774 },
  ph: { lat: 12.8797, lng: 121.774 },
  manila: { lat: 14.5995, lng: 120.9842 },
};

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
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

function percentFormat(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
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

function getSessionKey(event: AnalyticsEventRow) {
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
      event.metadata?.country_region ||
      event.metadata?.region_name
  );
}

function getEventCity(event: AnalyticsEventRow) {
  return cleanText(
    event.metadata?.geo_city ||
      event.metadata?.city ||
      event.metadata?.city_name
  );
}

function getEventLat(event: AnalyticsEventRow) {
  return cleanNumber(event.metadata?.geo_latitude || event.metadata?.latitude);
}

function getEventLng(event: AnalyticsEventRow) {
  return cleanNumber(event.metadata?.geo_longitude || event.metadata?.longitude);
}

function getPath(event: AnalyticsEventRow) {
  return cleanText(
    event.metadata?.pathname ||
      event.metadata?.path ||
      event.metadata?.page_path ||
      event.source_page ||
      "-"
  );
}

function getTrafficSourceLabel(event: AnalyticsEventRow) {
  const metadata = event.metadata || {};
  const source = cleanText(metadata.utm_source || metadata.traffic_source);
  const medium = cleanText(metadata.utm_medium || metadata.traffic_medium);
  const referrerDomain = cleanText(metadata.referrer_domain);

  if (source && medium && medium !== "direct") return `${source} / ${medium}`;
  if (source) return source;
  if (referrerDomain) return `${referrerDomain} / referral`;

  return "Direct";
}

function getDeviceLabel(event: AnalyticsEventRow) {
  const raw = cleanLower(event.metadata?.device_type || event.metadata?.device);

  if (raw.includes("mobile")) return "Mobile";
  if (raw.includes("tablet")) return "Tablet";
  if (raw.includes("desktop")) return "Desktop";

  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unknown";
}

function isViewEvent(eventName: string) {
  return VIEW_EVENTS.has(eventName);
}

function isClickEvent(eventName: string) {
  return CLICK_EVENTS.has(eventName);
}

function isLeadEvent(eventName: string) {
  return LEAD_EVENTS.has(eventName);
}

function eventLabel(eventName: string) {
  switch (eventName) {
    case "property_card_view":
      return "Property Card View";
    case "property_detail_view":
      return "Property Detail View";
    case "property_view_detail_click":
      return "View Detail Click";
    case "property_whatsapp_click":
      return "WhatsApp Click";
    case "property_schedule_viewing_click":
      return "Schedule Viewing Click";
    case "lead_created":
      return "Lead Created";
    case "buyer_request_submitted":
      return "Buyer Request Submitted";
    default:
      return eventName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
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

function shorten(value: string, length = 56) {
  if (!value) return "-";
  if (value.length <= length) return value;
  return `${value.slice(0, length - 3)}...`;
}

function csvCell(value: any) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function detectMetaPlatform(event: AnalyticsEventRow) {
  const metadata = event.metadata || {};
  const sourceCheck = cleanLower(
    `${metadata.utm_source} ${metadata.utm_medium} ${metadata.utm_platform} ${metadata.traffic_source} ${metadata.referrer_domain}`
  );

  if (sourceCheck.includes("instagram") || sourceCheck.includes("ig")) {
    return "Instagram";
  }

  if (
    sourceCheck.includes("facebook") ||
    sourceCheck.includes("fb") ||
    sourceCheck.includes("l.facebook") ||
    sourceCheck.includes("lm.facebook")
  ) {
    return "Facebook";
  }

  if (sourceCheck.includes("messenger")) return "Messenger";

  if (
    sourceCheck.includes("meta") ||
    sourceCheck.includes("paid_social") ||
    sourceCheck.includes("social")
  ) {
    return "Meta";
  }

  return "";
}

function getCampaignKey(event: AnalyticsEventRow) {
  const metadata = event.metadata || {};
  const platform = detectMetaPlatform(event);

  if (!platform) return null;

  const source = cleanText(
    metadata.utm_source || metadata.traffic_source || platform
  );
  const medium = cleanText(
    metadata.utm_medium || metadata.traffic_medium || "referral"
  );
  const campaign = cleanText(metadata.utm_campaign || "No campaign tag");
  const adSet = cleanText(metadata.utm_term || "No ad set tag");
  const adName = cleanText(metadata.utm_content || "No ad tag");
  const tagged = Boolean(
    metadata.utm_source ||
      metadata.utm_medium ||
      metadata.utm_campaign ||
      metadata.utm_content ||
      metadata.utm_term
  );

  return {
    platform,
    source,
    medium,
    campaign,
    adSet,
    adName,
    tagged,
    key: `${platform}|${source}|${medium}|${campaign}|${adSet}|${adName}`,
  };
}

function getFallbackCoordinates(location: {
  countryCode: string;
  country: string;
  region: string;
  city: string;
}) {
  const keys = [
    location.city,
    location.region,
    location.country,
    location.countryCode,
  ]
    .map(cleanLower)
    .filter(Boolean);

  for (const key of keys) {
    if (LOCATION_FALLBACKS[key]) return LOCATION_FALLBACKS[key];
  }

  return null;
}

function hasCoordinates(
  item: LocationStat
): item is LocationStat & { lat: number; lng: number } {
  return (
    typeof item.lat === "number" &&
    typeof item.lng === "number" &&
    Number.isFinite(item.lat) &&
    Number.isFinite(item.lng) &&
    !(item.lat === 0 && item.lng === 0)
  );
}

function StatCard({
  title,
  value,
  caption,
  Icon,
}: {
  title: string;
  value: string | number;
  caption?: string;
  Icon: ElementType;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
            {title}
          </p>
          <p className="mt-2 break-words text-2xl font-bold text-[#1C1C1E]">
            {value}
          </p>
          {caption ? (
            <p className="mt-1.5 text-[11px] leading-5 text-gray-500 sm:text-xs">
              {caption}
            </p>
          ) : null}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100">
          <Icon className="h-5 w-5 text-[#1C1C1E]" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
        <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
            {description}
          </p>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  Icon,
}: {
  title: string;
  description: string;
  Icon: ElementType;
}) {
  return (
    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
      <Icon className="mb-3 h-8 w-8 text-gray-400" />
      <p className="text-sm font-semibold text-[#1C1C1E]">{title}</p>
      <p className="mt-1 max-w-lg text-xs leading-5 text-gray-500">
        {description}
      </p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>

      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
            page === currentPage
              ? "bg-[#1C1C1E] text-white"
              : "border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

function DeviceBreakdown({ devices }: { devices: StatItem[] }) {
  const total = devices.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      {devices.length > 0 ? (
        devices.map((device) => {
          const pct = total > 0 ? (device.value / total) * 100 : 0;

          return (
            <div key={device.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-[#1C1C1E]">
                  {device.label}
                </span>
                <span className="text-gray-500">
                  {numberFormat(device.value)} • {percentFormat(pct)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#1C1C1E]"
                  style={{ width: `${Math.max(2, pct)}%` }}
                />
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-gray-500">No device data yet.</p>
      )}
    </div>
  );
}

function BlueBubbleHeatMap({
  points,
  loading,
  totalEvents,
}: {
  points: LocationStat[];
  loading: boolean;
  totalEvents: number;
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

        if (cancelled || !googleMaps || !mapElementRef.current) return;

        const validPoints = points.filter(hasCoordinates);
        const fallbackCenter = { lat: -2.5489, lng: 118.0149 };
        const firstPoint = validPoints[0];

        if (!mapRef.current) {
          mapRef.current = new googleMaps.Map(mapElementRef.current, {
            center: firstPoint
              ? { lat: firstPoint.lat, lng: firstPoint.lng }
              : fallbackCenter,
            zoom: firstPoint ? 5 : 4,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            clickableIcons: false,
            gestureHandling: "greedy",
          });
        }

        const map = mapRef.current;

        if (!infoWindowRef.current) {
          infoWindowRef.current = new googleMaps.InfoWindow();
        }

        overlaysRef.current.forEach((overlay) => overlay.setMap(null));
        overlaysRef.current = [];

        if (validPoints.length === 0) {
          map.setCenter(fallbackCenter);
          map.setZoom(4);
          return;
        }

        const maxVisitors = Math.max(
          1,
          ...validPoints.map((point) => point.visitors)
        );

        const bounds = new googleMaps.LatLngBounds();

        validPoints.forEach((point) => {
          const position = { lat: point.lat, lng: point.lng };
          bounds.extend(position);

          const intensity = Math.min(1, point.visitors / maxVisitors);
          const spread = Math.sqrt(Math.max(1, point.visitors));

          const outerRadius = Math.min(260000, 35000 + spread * 50000);
          const middleRadius = Math.min(180000, 22000 + spread * 34000);
          const innerRadius = Math.min(105000, 11000 + spread * 21000);

          const outerCircle = new googleMaps.Circle({
            map,
            center: position,
            radius: outerRadius,
            strokeColor: "#1d4ed8",
            strokeOpacity: 0.3 + intensity * 0.2,
            strokeWeight: 3,
            fillColor: "#60a5fa",
            fillOpacity: 0.08 + intensity * 0.08,
            clickable: false,
          });

          const middleCircle = new googleMaps.Circle({
            map,
            center: position,
            radius: middleRadius,
            strokeColor: "#2563eb",
            strokeOpacity: 0.42 + intensity * 0.2,
            strokeWeight: 3,
            fillColor: "#3b82f6",
            fillOpacity: 0.12 + intensity * 0.14,
            clickable: false,
          });

          const innerCircle = new googleMaps.Circle({
            map,
            center: position,
            radius: innerRadius,
            strokeColor: "#1e40af",
            strokeOpacity: 0.62 + intensity * 0.24,
            strokeWeight: 3,
            fillColor: "#1d4ed8",
            fillOpacity: 0.2 + intensity * 0.28,
            clickable: true,
          });

          innerCircle.addListener("click", () => {
            infoWindowRef.current.setContent(`
              <div style="font-family: Arial, sans-serif; min-width: 240px;">
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">
                  ${escapeHtml(point.label)}
                </div>
                <div style="font-size: 12px; color: #555;">
                  ${escapeHtml(point.sublabel || "No sub-location saved")}
                </div>
                <div style="font-size: 12px; margin-top: 10px; line-height: 1.8;">
                  <strong>${numberFormat(point.visitors)}</strong> visitors<br/>
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

          overlaysRef.current.push(outerCircle, middleCircle, innerCircle);
        });

        if (validPoints.length === 1) {
          map.setCenter({
            lat: validPoints[0].lat,
            lng: validPoints[0].lng,
          });
          map.setZoom(7);
        } else {
          map.fitBounds(bounds, 80);
        }
      } catch (error: any) {
        if (!cancelled) {
          setMapError(error?.message || "Failed to load analytics map.");
        }
      }
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [points]);

  const mappedEvents = points.reduce((sum, point) => sum + point.events, 0);
  const mappedVisitors = points.reduce((sum, point) => sum + point.visitors, 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1C1C1E]">
              Visitor Heat Map
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              Blue circles only. Bigger and darker circles mean more visitors in
              that location.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
            <span className="rounded-full bg-gray-100 px-3 py-1">
              Location events: {numberFormat(mappedEvents)}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1">
              Location visitors: {numberFormat(mappedVisitors)}
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1">
              Total events: {numberFormat(totalEvents)}
            </span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div ref={mapElementRef} className="h-[430px] w-full sm:h-[540px]" />

        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] shadow-sm">
              Loading map...
            </div>
          </div>
        ) : null}

        {mapError ? (
          <div className="absolute left-4 top-4 max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 shadow-sm">
            {mapError}
          </div>
        ) : null}

        {!loading && points.length === 0 ? (
          <div className="absolute left-4 top-4 max-w-md rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600 shadow-sm">
            Map is ready, but no location metadata is available for this filter.
            Choose All or 30 Days to view saved locations.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeOption>("all");
  const [selectedPropertyId, setSelectedPropertyId] = useState("all");

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignPage, setCampaignPage] = useState(1);
  const [listingPage, setListingPage] = useState(1);
  const [locationListingPage, setLocationListingPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);

  const campaignPageSize = 6;
  const listingPageSize = 10;
  const locationListingPageSize = 8;
  const eventsPageSize = 12;

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
        .limit(20000),
    ]);

    if (propertyError) {
      console.error("Failed to load analytics properties:", propertyError);
    }

    if (eventError) {
      console.error("Failed to load analytics events:", eventError);
    }

    setProperties((propertyRows || []) as PropertyRow[]);
    setEvents((eventRows || []) as AnalyticsEventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    async function safeLoad() {
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
          .limit(20000),
      ]);

      if (propertyError) {
        console.error("Failed to load analytics properties:", propertyError);
      }

      if (eventError) {
        console.error("Failed to load analytics events:", eventError);
      }

      if (!ignore) {
        setProperties((propertyRows || []) as PropertyRow[]);
        setEvents((eventRows || []) as AnalyticsEventRow[]);
        setLoading(false);
      }
    }

    safeLoad();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-analytics-live-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analytics_events",
        },
        (payload) => {
          const nextEvent = payload.new as AnalyticsEventRow;
          setEvents((prev) => [nextEvent, ...prev].slice(0, 20000));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setCampaignPage(1);
    setListingPage(1);
    setLocationListingPage(1);
    setEventsPage(1);
  }, [searchQuery, dateRange, selectedPropertyId]);

  const propertyMap = useMemo(() => {
    const map = new Map<string, PropertyRow>();

    for (const property of properties) {
      map.set(property.id, property);
    }

    return map;
  }, [properties]);

  const filteredByDate = useMemo(() => {
    const start = getDateRangeStart(dateRange);

    if (!start) return events;

    const startTime = start.getTime();

    return events.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return !Number.isNaN(time) && time >= startTime;
    });
  }, [events, dateRange]);

  const scopedEvents = useMemo(() => {
    if (selectedPropertyId === "all") return filteredByDate;

    return filteredByDate.filter(
      (event) => event.property_id === selectedPropertyId
    );
  }, [filteredByDate, selectedPropertyId]);

  const searchedEvents = useMemo(() => {
    const q = cleanLower(searchQuery);

    if (!q) return scopedEvents;

    return scopedEvents.filter((event) => {
      const property = event.property_id
        ? propertyMap.get(event.property_id)
        : null;

      const haystack = [
        event.event_name,
        event.source_page,
        getPath(event),
        getTrafficSourceLabel(event),
        getEventCountryCode(event),
        getEventRegion(event),
        getEventCity(event),
        property?.kode,
        property?.title,
        property?.city,
        property?.province,
        property?.area,
        event.metadata?.utm_source,
        event.metadata?.utm_medium,
        event.metadata?.utm_campaign,
        event.metadata?.utm_content,
        event.metadata?.utm_term,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [scopedEvents, searchQuery, propertyMap]);

  const propertyOptions = useMemo(() => {
    const idsWithEvents = new Set<string>();

    for (const event of filteredByDate) {
      if (event.property_id) idsWithEvents.add(event.property_id);
    }

    return properties
      .filter((property) => idsWithEvents.has(property.id))
      .map((property) => ({
        id: property.id,
        label: `${property.kode || "No Code"} • ${
          property.title || "Untitled"
        }`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [properties, filteredByDate]);

  const selectedPropertyLabel = useMemo(() => {
    if (selectedPropertyId === "all") return "All Properties";

    const property = propertyMap.get(selectedPropertyId);
    return property?.title || "Selected Property";
  }, [selectedPropertyId, propertyMap]);

  const visitors = useMemo(() => {
    const set = new Set<string>();

    for (const event of searchedEvents) {
      set.add(getSessionKey(event));
    }

    return set.size;
  }, [searchedEvents]);

  const last30Events = useMemo(() => {
    const start = Date.now() - 30 * 60 * 1000;

    return scopedEvents.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return !Number.isNaN(time) && time >= start;
    });
  }, [scopedEvents]);

  const liveEvents = useMemo(() => {
    const start = Date.now() - 5 * 60 * 1000;

    return scopedEvents.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return !Number.isNaN(time) && time >= start;
    });
  }, [scopedEvents]);

  const last30Visitors = useMemo(() => {
    const set = new Set<string>();

    for (const event of last30Events) {
      set.add(getSessionKey(event));
    }

    return set.size;
  }, [last30Events]);

  const liveVisitors = useMemo(() => {
    const set = new Set<string>();

    for (const event of liveEvents) {
      set.add(getSessionKey(event));
    }

    return set.size;
  }, [liveEvents]);

  const eventCounts = useMemo(() => {
    return {
      totalEvents: searchedEvents.length,
      cardViews: searchedEvents.filter(
        (event) => event.event_name === "property_card_view"
      ).length,
      detailViews: searchedEvents.filter(
        (event) => event.event_name === "property_detail_view"
      ).length,
      detailClicks: searchedEvents.filter(
        (event) => event.event_name === "property_view_detail_click"
      ).length,
      whatsappClicks: searchedEvents.filter(
        (event) => event.event_name === "property_whatsapp_click"
      ).length,
      scheduleClicks: searchedEvents.filter(
        (event) => event.event_name === "property_schedule_viewing_click"
      ).length,
      leads: searchedEvents.filter((event) => isLeadEvent(event.event_name))
        .length,
    };
  }, [searchedEvents]);

  const conversion = useMemo(() => {
    const viewToDetailRate =
      eventCounts.cardViews > 0
        ? (eventCounts.detailClicks / eventCounts.cardViews) * 100
        : 0;

    const leadActions =
      eventCounts.whatsappClicks +
      eventCounts.scheduleClicks +
      eventCounts.leads;

    const leadActionRate =
      eventCounts.detailViews > 0
        ? (leadActions / eventCounts.detailViews) * 100
        : 0;

    const leadFormRate =
      eventCounts.detailViews > 0
        ? (eventCounts.leads / eventCounts.detailViews) * 100
        : 0;

    return {
      viewToDetailRate,
      leadActionRate,
      leadFormRate,
    };
  }, [eventCounts]);

  const trafficSources = useMemo<StatItem[]>(() => {
    const map = new Map<string, Set<string>>();

    for (const event of searchedEvents) {
      const label = getTrafficSourceLabel(event);
      const key = getSessionKey(event);

      if (!map.has(label)) map.set(label, new Set<string>());
      map.get(label)!.add(key);
    }

    return Array.from(map.entries())
      .map(([label, sessions]) => ({
        label,
        value: sessions.size,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [searchedEvents]);

  const devices = useMemo<StatItem[]>(() => {
    const map = new Map<string, Set<string>>();

    for (const event of searchedEvents) {
      const label = getDeviceLabel(event);
      const key = getSessionKey(event);

      if (!map.has(label)) map.set(label, new Set<string>());
      map.get(label)!.add(key);
    }

    return Array.from(map.entries())
      .map(([label, sessions]) => ({
        label,
        value: sessions.size,
      }))
      .sort((a, b) => b.value - a.value);
  }, [searchedEvents]);

  const pages = useMemo<StatItem[]>(() => {
    const map = new Map<string, number>();

    for (const event of searchedEvents) {
      const path = getPath(event);
      map.set(path, (map.get(path) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [searchedEvents]);

  const locations = useMemo<LocationStat[]>(() => {
    const map = new Map<
      string,
      {
        countryCode: string;
        country: string;
        region: string;
        city: string;
        sessions: Set<string>;
        events: number;
        views: number;
        clicks: number;
        leads: number;
        latValues: number[];
        lngValues: number[];
      }
    >();

    for (const event of searchedEvents) {
      const countryCode = getEventCountryCode(event);
      const country = countryCode ? getCountryName(countryCode) : "";
      const region = getEventRegion(event);
      const city = getEventCity(event);
      const lat = getEventLat(event);
      const lng = getEventLng(event);

      if (
        !countryCode &&
        !country &&
        !region &&
        !city &&
        lat === null &&
        lng === null
      ) {
        continue;
      }

      const key = `${countryCode || "unknown"}|${region || "unknown"}|${
        city || "unknown"
      }`;

      if (!map.has(key)) {
        map.set(key, {
          countryCode,
          country,
          region,
          city,
          sessions: new Set<string>(),
          events: 0,
          views: 0,
          clicks: 0,
          leads: 0,
          latValues: [],
          lngValues: [],
        });
      }

      const item = map.get(key)!;

      item.sessions.add(getSessionKey(event));
      item.events += 1;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (isClickEvent(event.event_name)) item.clicks += 1;
      if (isLeadEvent(event.event_name)) item.leads += 1;

      if (lat !== null && lng !== null) {
        item.latValues.push(lat);
        item.lngValues.push(lng);
      }
    }

    return Array.from(map.entries())
      .map(([key, item]) => {
        let lat =
          item.latValues.length > 0
            ? item.latValues.reduce((sum, value) => sum + value, 0) /
              item.latValues.length
            : null;

        let lng =
          item.lngValues.length > 0
            ? item.lngValues.reduce((sum, value) => sum + value, 0) /
              item.lngValues.length
            : null;

        if (lat === null || lng === null) {
          const fallback = getFallbackCoordinates({
            countryCode: item.countryCode,
            country: item.country,
            region: item.region,
            city: item.city,
          });

          if (fallback) {
            lat = fallback.lat;
            lng = fallback.lng;
          }
        }

        const label =
          item.city || item.region || item.country || "Unknown Location";
        const sublabel = [
          item.region && item.region !== label ? item.region : "",
          item.country,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          key,
          countryCode: item.countryCode,
          country: item.country,
          region: item.region,
          city: item.city,
          label,
          sublabel,
          visitors: item.sessions.size,
          events: item.events,
          views: item.views,
          clicks: item.clicks,
          leads: item.leads,
          lat,
          lng,
        };
      })
      .sort((a, b) => b.visitors - a.visitors || b.events - a.events);
  }, [searchedEvents]);

  const countries = useMemo<LocationStat[]>(() => {
    const map = new Map<
      string,
      {
        countryCode: string;
        country: string;
        sessions: Set<string>;
        events: number;
        views: number;
        clicks: number;
        leads: number;
        lat: number | null;
        lng: number | null;
      }
    >();

    for (const event of searchedEvents) {
      const countryCode = getEventCountryCode(event);
      const country = countryCode ? getCountryName(countryCode) : "";

      if (!countryCode && !country) continue;

      const key = countryCode || country || "unknown";

      if (!map.has(key)) {
        const fallback = getFallbackCoordinates({
          countryCode,
          country,
          region: "",
          city: "",
        });

        map.set(key, {
          countryCode,
          country: country || "Unknown Country",
          sessions: new Set<string>(),
          events: 0,
          views: 0,
          clicks: 0,
          leads: 0,
          lat: fallback?.lat || null,
          lng: fallback?.lng || null,
        });
      }

      const item = map.get(key)!;

      item.sessions.add(getSessionKey(event));
      item.events += 1;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (isClickEvent(event.event_name)) item.clicks += 1;
      if (isLeadEvent(event.event_name)) item.leads += 1;
    }

    return Array.from(map.entries())
      .map(([key, item]) => ({
        key,
        countryCode: item.countryCode,
        country: item.country,
        region: "",
        city: "",
        label: item.country,
        sublabel: item.countryCode,
        visitors: item.sessions.size,
        events: item.events,
        views: item.views,
        clicks: item.clicks,
        leads: item.leads,
        lat: item.lat,
        lng: item.lng,
      }))
      .sort((a, b) => b.visitors - a.visitors || b.events - a.events);
  }, [searchedEvents]);

  const citiesRegions = useMemo(() => {
    return locations
      .filter((item) => item.city || item.region)
      .sort((a, b) => b.visitors - a.visitors || b.events - a.events);
  }, [locations]);

  const listingInsights = useMemo<ListingInsight[]>(() => {
    const map = new Map<
      string,
      {
        propertyId: string;
        kode: string;
        title: string;
        city: string;
        views: number;
        detailViews: number;
        detailClicks: number;
        whatsappClicks: number;
        scheduleClicks: number;
        leads: number;
        locationSessions: Map<string, Set<string>>;
      }
    >();

    for (const event of searchedEvents) {
      if (!event.property_id) continue;

      const property = propertyMap.get(event.property_id);
      const metadata = event.metadata || {};

      if (!map.has(event.property_id)) {
        map.set(event.property_id, {
          propertyId: event.property_id,
          kode: property?.kode || cleanText(metadata.property_code) || "-",
          title:
            property?.title ||
            cleanText(metadata.property_title) ||
            "Unknown Property",
          city: property?.city || property?.area || property?.province || "-",
          views: 0,
          detailViews: 0,
          detailClicks: 0,
          whatsappClicks: 0,
          scheduleClicks: 0,
          leads: 0,
          locationSessions: new Map<string, Set<string>>(),
        });
      }

      const item = map.get(event.property_id)!;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (event.event_name === "property_detail_view") item.detailViews += 1;
      if (event.event_name === "property_view_detail_click")
        item.detailClicks += 1;
      if (event.event_name === "property_whatsapp_click")
        item.whatsappClicks += 1;
      if (event.event_name === "property_schedule_viewing_click")
        item.scheduleClicks += 1;
      if (isLeadEvent(event.event_name)) item.leads += 1;

      const countryCode = getEventCountryCode(event);
      const country = countryCode ? getCountryName(countryCode) : "";
      const region = getEventRegion(event);
      const city = getEventCity(event);
      const locationKey = [
        country || "Unknown Country",
        region,
        city,
      ].join("|");

      if (!item.locationSessions.has(locationKey)) {
        item.locationSessions.set(locationKey, new Set<string>());
      }

      item.locationSessions.get(locationKey)!.add(getSessionKey(event));
    }

    return Array.from(map.values())
      .map((item) => {
        const locationRows = Array.from(item.locationSessions.entries())
          .map(([key, sessions]) => {
            const [country, region, city] = key.split("|");

            return {
              country,
              region,
              city,
              visitors: sessions.size,
            };
          })
          .sort((a, b) => b.visitors - a.visitors);

        const top = locationRows[0];

        const topLocationText = locationRows
          .slice(0, 4)
          .map((location) => {
            const parts = [
              location.country,
              location.region,
              location.city,
            ].filter(Boolean);

            return `${parts.join(" / ")} (${location.visitors})`;
          })
          .join(", ");

        return {
          propertyId: item.propertyId,
          kode: item.kode,
          title: item.title,
          city: item.city,
          views: item.views,
          detailViews: item.detailViews,
          detailClicks: item.detailClicks,
          whatsappClicks: item.whatsappClicks,
          scheduleClicks: item.scheduleClicks,
          leads: item.leads,
          topCountry: top?.country || "-",
          topRegion: top?.region || "-",
          topCity: top?.city || "-",
          topLocationText: topLocationText || "-",
        };
      })
      .filter(
        (item) =>
          item.views > 0 ||
          item.detailViews > 0 ||
          item.detailClicks > 0 ||
          item.whatsappClicks > 0 ||
          item.scheduleClicks > 0 ||
          item.leads > 0
      )
      .sort((a, b) => {
        const bLeadActions = b.whatsappClicks + b.scheduleClicks + b.leads;
        const aLeadActions = a.whatsappClicks + a.scheduleClicks + a.leads;

        if (bLeadActions !== aLeadActions) return bLeadActions - aLeadActions;
        if (b.detailClicks !== a.detailClicks)
          return b.detailClicks - a.detailClicks;
        return b.views - a.views;
      });
  }, [searchedEvents, propertyMap]);

  const campaignInsights = useMemo<CampaignInsight[]>(() => {
    const map = new Map<
      string,
      {
        platform: string;
        source: string;
        medium: string;
        campaign: string;
        adSet: string;
        adName: string;
        sessions: Set<string>;
        events: number;
        views: number;
        clicks: number;
        leads: number;
        countries: Map<string, Set<string>>;
        tagged: boolean;
      }
    >();

    for (const event of searchedEvents) {
      const campaign = getCampaignKey(event);
      if (!campaign) continue;

      if (!map.has(campaign.key)) {
        map.set(campaign.key, {
          platform: campaign.platform,
          source: campaign.source,
          medium: campaign.medium,
          campaign: campaign.campaign,
          adSet: campaign.adSet,
          adName: campaign.adName,
          sessions: new Set<string>(),
          events: 0,
          views: 0,
          clicks: 0,
          leads: 0,
          countries: new Map<string, Set<string>>(),
          tagged: campaign.tagged,
        });
      }

      const item = map.get(campaign.key)!;
      const sessionKey = getSessionKey(event);

      item.sessions.add(sessionKey);
      item.events += 1;

      if (isViewEvent(event.event_name)) item.views += 1;
      if (isClickEvent(event.event_name)) item.clicks += 1;
      if (isLeadEvent(event.event_name)) item.leads += 1;

      const countryCode = getEventCountryCode(event);
      const country = countryCode ? getCountryName(countryCode) : "";

      if (country) {
        if (!item.countries.has(country)) {
          item.countries.set(country, new Set<string>());
        }

        item.countries.get(country)!.add(sessionKey);
      }
    }

    return Array.from(map.entries())
      .map(([key, item]) => ({
        key,
        platform: item.platform,
        source: item.source,
        medium: item.medium,
        campaign: item.campaign,
        adSet: item.adSet,
        adName: item.adName,
        visitors: item.sessions.size,
        events: item.events,
        views: item.views,
        clicks: item.clicks,
        leads: item.leads,
        countries: Array.from(item.countries.entries())
          .map(([country, sessions]) => `${country} (${sessions.size})`)
          .join(", "),
        tagged: item.tagged,
      }))
      .sort((a, b) => b.visitors - a.visitors || b.clicks - a.clicks);
  }, [searchedEvents]);

  const latestEvents = useMemo(() => searchedEvents, [searchedEvents]);

  const campaignTotalPages = Math.max(
    1,
    Math.ceil(campaignInsights.length / campaignPageSize)
  );
  const listingTotalPages = Math.max(
    1,
    Math.ceil(listingInsights.length / listingPageSize)
  );
  const locationListingTotalPages = Math.max(
    1,
    Math.ceil(listingInsights.length / locationListingPageSize)
  );
  const eventsTotalPages = Math.max(
    1,
    Math.ceil(latestEvents.length / eventsPageSize)
  );

  const pagedCampaigns = campaignInsights.slice(
    (campaignPage - 1) * campaignPageSize,
    campaignPage * campaignPageSize
  );

  const pagedListings = listingInsights.slice(
    (listingPage - 1) * listingPageSize,
    listingPage * listingPageSize
  );

  const pagedLocationListings = listingInsights.slice(
    (locationListingPage - 1) * locationListingPageSize,
    locationListingPage * locationListingPageSize
  );

  const pagedEvents = latestEvents.slice(
    (eventsPage - 1) * eventsPageSize,
    eventsPage * eventsPageSize
  );

  function handleExportReport() {
    const rows: string[][] = [];

    rows.push(["Tetamo Analytics Report"]);
    rows.push(["Date Range", getDateRangeLabel(dateRange)]);
    rows.push(["Scope", selectedPropertyLabel]);
    rows.push(["Generated At", new Date().toISOString()]);
    rows.push([]);

    rows.push(["Overview"]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Events", String(eventCounts.totalEvents)]);
    rows.push(["Unique Visitors", String(visitors)]);
    rows.push(["Property Card Views", String(eventCounts.cardViews)]);
    rows.push(["Property Detail Views", String(eventCounts.detailViews)]);
    rows.push(["Detail Clicks", String(eventCounts.detailClicks)]);
    rows.push(["WhatsApp Clicks", String(eventCounts.whatsappClicks)]);
    rows.push(["Schedule Clicks", String(eventCounts.scheduleClicks)]);
    rows.push(["Leads", String(eventCounts.leads)]);
    rows.push([
      "View To Detail Rate",
      percentFormat(conversion.viewToDetailRate),
    ]);
    rows.push(["Lead Action Rate", percentFormat(conversion.leadActionRate)]);
    rows.push([]);

    rows.push(["Meta / UTM Campaigns"]);
    rows.push([
      "Platform",
      "Source",
      "Medium",
      "Campaign",
      "Ad Set",
      "Ad Name",
      "Visitors",
      "Events",
      "Views",
      "Clicks",
      "Leads",
      "Countries",
      "Tagged",
    ]);

    campaignInsights.forEach((item) => {
      rows.push([
        item.platform,
        item.source,
        item.medium,
        item.campaign,
        item.adSet,
        item.adName,
        String(item.visitors),
        String(item.events),
        String(item.views),
        String(item.clicks),
        String(item.leads),
        item.countries,
        item.tagged ? "Yes" : "No",
      ]);
    });

    rows.push([]);
    rows.push(["Listing Performance"]);
    rows.push([
      "Code",
      "Title",
      "City",
      "Views",
      "Detail Views",
      "Detail Clicks",
      "WhatsApp Clicks",
      "Schedule Clicks",
      "Leads",
      "Top Country",
      "Top Region",
      "Top City",
      "Top Locations",
    ]);

    listingInsights.forEach((item) => {
      rows.push([
        item.kode,
        item.title,
        item.city,
        String(item.views),
        String(item.detailViews),
        String(item.detailClicks),
        String(item.whatsappClicks),
        String(item.scheduleClicks),
        String(item.leads),
        item.topCountry,
        item.topRegion,
        item.topCity,
        item.topLocationText,
      ]);
    });

    rows.push([]);
    rows.push(["Top Locations"]);
    rows.push([
      "Country",
      "Region",
      "City",
      "Visitors",
      "Events",
      "Views",
      "Clicks",
      "Leads",
    ]);

    locations.forEach((item) => {
      rows.push([
        item.country,
        item.region,
        item.city,
        String(item.visitors),
        String(item.events),
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
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C1C1E] sm:text-2xl">
            Tetamo Analytics
          </h1>
          <p className="mt-1 text-[12px] leading-5 text-gray-500 sm:text-sm">
            Internal website analytics from Supabase. The map shows blue
            location intensity without numbered pins.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={loadAnalytics}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px_220px]">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Search listing, city, source, campaign, ad name, country, region..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:text-sm"
            />
          </div>

          <select
            value={selectedPropertyId}
            onChange={(event) => setSelectedPropertyId(event.target.value)}
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
            Scope: {selectedPropertyLabel}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Loaded rows: {numberFormat(events.length)}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1">
            Mapped locations:{" "}
            {numberFormat(locations.filter(hasCoordinates).length)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard
          title="Total Events"
          value={loading ? "..." : numberFormat(eventCounts.totalEvents)}
          Icon={BarChart3}
          caption="All tracked analytics events in selected range."
        />
        <StatCard
          title="Unique Visitors"
          value={loading ? "..." : numberFormat(visitors)}
          Icon={Users}
          caption="Unique visitor/session IDs."
        />
        <StatCard
          title="Views"
          value={
            loading
              ? "..."
              : numberFormat(eventCounts.cardViews + eventCounts.detailViews)
          }
          Icon={Eye}
          caption="Property card views + detail views."
        />
        <StatCard
          title="Lead Actions"
          value={
            loading
              ? "..."
              : numberFormat(
                  eventCounts.whatsappClicks +
                    eventCounts.scheduleClicks +
                    eventCounts.leads
                )
          }
          Icon={MessageCircle}
          caption="WhatsApp, schedule, and lead form actions."
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard
          title="Last 30 Minutes"
          value={loading ? "..." : numberFormat(last30Visitors)}
          Icon={Activity}
          caption={`${numberFormat(
            last30Events.length
          )} events in last 30 minutes.`}
        />
        <StatCard
          title="Live Visitors"
          value={loading ? "..." : numberFormat(liveVisitors)}
          Icon={Flame}
          caption={`${numberFormat(liveEvents.length)} events in last 5 minutes.`}
        />
        <StatCard
          title="WhatsApp Clicks"
          value={loading ? "..." : numberFormat(eventCounts.whatsappClicks)}
          Icon={MousePointerClick}
          caption="Direct WhatsApp intent from listings."
        />
        <StatCard
          title="Schedule Clicks"
          value={loading ? "..." : numberFormat(eventCounts.scheduleClicks)}
          Icon={TrendingUp}
          caption="Schedule viewing button clicks."
        />
      </div>

      <BlueBubbleHeatMap
        points={locations}
        loading={loading}
        totalEvents={eventCounts.totalEvents}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Page / Source Activity">
          <div className="space-y-2.5">
            {pages.length > 0 ? (
              pages.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 text-xs"
                  title={item.label}
                >
                  <span className="min-w-0 truncate text-gray-500">
                    {shorten(item.label, 42)}
                  </span>
                  <span className="shrink-0 font-semibold text-[#1C1C1E]">
                    {numberFormat(item.value)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No page activity yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Traffic Source">
          <div className="space-y-2.5">
            {trafficSources.length > 0 ? (
              trafficSources.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 truncate text-gray-500">
                    {item.label}
                  </span>
                  <span className="shrink-0 font-semibold text-[#1C1C1E]">
                    {numberFormat(item.value)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No source data yet.</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Device">
          <div className="mb-3 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-[#1C1C1E]" />
            <p className="text-xs text-gray-500">
              Visitors by detected device type.
            </p>
          </div>
          <DeviceBreakdown devices={devices} />
        </SectionCard>
      </div>

      <SectionCard
        title="Conversion Insight"
        description="Separated by real Tetamo actions so views, clicks, WhatsApp, schedule, and leads are easier to understand."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
              Card Views
            </p>
            <p className="mt-1 text-xl font-bold text-[#1C1C1E]">
              {numberFormat(eventCounts.cardViews)}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
              Detail Views
            </p>
            <p className="mt-1 text-xl font-bold text-[#1C1C1E]">
              {numberFormat(eventCounts.detailViews)}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
              Detail Clicks
            </p>
            <p className="mt-1 text-xl font-bold text-[#1C1C1E]">
              {numberFormat(eventCounts.detailClicks)}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
              WhatsApp
            </p>
            <p className="mt-1 text-xl font-bold text-[#1C1C1E]">
              {numberFormat(eventCounts.whatsappClicks)}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
              Schedule
            </p>
            <p className="mt-1 text-xl font-bold text-[#1C1C1E]">
              {numberFormat(eventCounts.scheduleClicks)}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
              Leads
            </p>
            <p className="mt-1 text-xl font-bold text-[#1C1C1E]">
              {numberFormat(eventCounts.leads)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Detail Click / Card View</p>
            <p className="mt-1 text-lg font-bold text-[#1C1C1E]">
              {percentFormat(conversion.viewToDetailRate)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Lead Action / Detail View</p>
            <p className="mt-1 text-lg font-bold text-[#1C1C1E]">
              {percentFormat(conversion.leadActionRate)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Lead Form / Detail View</p>
            <p className="mt-1 text-lg font-bold text-[#1C1C1E]">
              {percentFormat(conversion.leadFormRate)}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Meta / Facebook / Instagram Tracking"
        description="This reads referral and UTM data from analytics_events. To show all ads separately, each ad needs its own UTM campaign/ad name."
      >
        {campaignInsights.length > 0 ? (
          <>
            <div className="space-y-3">
              {pagedCampaigns.map((item) => (
                <div
                  key={item.key}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white">
                          {item.platform}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            item.tagged
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {item.tagged ? "UTM Tagged" : "Referral / Untagged"}
                        </span>
                      </div>

                      <p className="mt-2 truncate text-sm font-semibold text-[#1C1C1E]">
                        Campaign: {item.campaign}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        Source: {item.source} / {item.medium}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        Ad Set: {item.adSet}
                      </p>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        Ad: {item.adName}
                      </p>
                      {item.countries ? (
                        <p className="mt-1 truncate text-[11px] text-gray-400">
                          Countries: {item.countries}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center">
                      {[
                        ["Visitors", item.visitors],
                        ["Events", item.events],
                        ["Views", item.views],
                        ["Clicks", item.clicks],
                        ["Leads", item.leads],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="rounded-2xl border border-gray-100 bg-white p-3"
                        >
                          <p className="text-[10px] text-gray-400">{label}</p>
                          <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                            {numberFormat(Number(value))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={campaignPage}
              totalPages={campaignTotalPages}
              onPageChange={setCampaignPage}
            />
          </>
        ) : (
          <EmptyState
            title="No Meta ad traffic detected yet"
            description="This does not mean your ads are not running. It means the website events do not yet contain Meta referral or UTM campaign data for this selected filter."
            Icon={Globe}
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Top Countries">
          {countries.length > 0 ? (
            <div className="space-y-3">
              {countries.slice(0, 10).map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[minmax(0,1fr)_80px] gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1C1C1E]">
                      {getCountryFlag(item.countryCode)} {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {item.sublabel || "No country code saved"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-[#1C1C1E]">
                      {numberFormat(item.visitors)}
                    </p>
                    <p className="text-[10px] text-gray-500">visitors</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No country data saved yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Top Cities / Regions">
          {citiesRegions.length > 0 ? (
            <div className="space-y-3">
              {citiesRegions.slice(0, 10).map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[minmax(0,1fr)_80px] gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#1C1C1E]">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {item.sublabel || "No country/region saved"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-[#1C1C1E]">
                      {numberFormat(item.visitors)}
                    </p>
                    <p className="text-[10px] text-gray-500">visitors</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No city or region data saved yet.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Listing Performance"
        description="Shows which listings get views, detail clicks, WhatsApp clicks, schedule clicks, and leads."
      >
        {listingInsights.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <div className="hidden grid-cols-[minmax(0,1fr)_90px_90px_90px_90px_90px_90px] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500 lg:grid">
                <div>Listing</div>
                <div className="text-right">Views</div>
                <div className="text-right">Details</div>
                <div className="text-right">Clicks</div>
                <div className="text-right">WhatsApp</div>
                <div className="text-right">Schedule</div>
                <div className="text-right">Leads</div>
              </div>

              <div className="divide-y divide-gray-100">
                {pagedListings.map((item) => (
                  <div
                    key={item.propertyId}
                    className="grid grid-cols-1 gap-3 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_90px_90px_90px_90px_90px_90px] lg:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500">
                        {item.kode} • {item.city}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#1C1C1E]">
                        {item.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-gray-400">
                        Top location: {item.topLocationText}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs lg:contents lg:text-right">
                      <div>
                        <p className="text-[10px] text-gray-400 lg:hidden">
                          Views
                        </p>
                        <p className="font-semibold text-[#1C1C1E]">
                          {numberFormat(item.views)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 lg:hidden">
                          Details
                        </p>
                        <p className="font-semibold text-[#1C1C1E]">
                          {numberFormat(item.detailViews)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 lg:hidden">
                          Clicks
                        </p>
                        <p className="font-semibold text-[#1C1C1E]">
                          {numberFormat(item.detailClicks)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 lg:hidden">
                          WhatsApp
                        </p>
                        <p className="font-semibold text-[#1C1C1E]">
                          {numberFormat(item.whatsappClicks)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 lg:hidden">
                          Schedule
                        </p>
                        <p className="font-semibold text-[#1C1C1E]">
                          {numberFormat(item.scheduleClicks)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 lg:hidden">
                          Leads
                        </p>
                        <p className="font-semibold text-[#1C1C1E]">
                          {numberFormat(item.leads)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Pagination
              currentPage={listingPage}
              totalPages={listingTotalPages}
              onPageChange={setListingPage}
            />
          </>
        ) : (
          <EmptyState
            title="No listing analytics found"
            description="No listing activity matches the selected filters."
            Icon={BarChart3}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Viewer Locations Per Listing"
        description="Shows country, region, city, and top viewer location per listing."
      >
        {listingInsights.length > 0 ? (
          <>
            <div className="space-y-3">
              {pagedLocationListings.map((item) => (
                <div
                  key={`${item.propertyId}-location`}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-500">
                        {item.kode} • {item.city}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#1C1C1E]">
                        {item.title}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Top Viewer Location
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C1C1E]">
                        {item.topCity !== "-"
                          ? item.topCity
                          : item.topRegion !== "-"
                          ? item.topRegion
                          : item.topCountry}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {[
                          item.topRegion !== "-" ? item.topRegion : "",
                          item.topCountry !== "-" ? item.topCountry : "",
                        ]
                          .filter(Boolean)
                          .join(", ") || "No location saved"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs text-gray-500">
                    Full location breakdown: {item.topLocationText}
                  </p>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={locationListingPage}
              totalPages={locationListingTotalPages}
              onPageChange={setLocationListingPage}
            />
          </>
        ) : (
          <EmptyState
            title="No viewer location per listing yet"
            description="Once listing events contain country/region/city metadata, they will appear here."
            Icon={MapPin}
          />
        )}
      </SectionCard>

      <SectionCard
        title="Real-Time Events"
        description="Shows the latest analytics events, not only leads."
      >
        {latestEvents.length > 0 ? (
          <>
            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
              {pagedEvents.map((event) => {
                const property = event.property_id
                  ? propertyMap.get(event.property_id)
                  : null;

                const countryCode = getEventCountryCode(event);
                const country = countryCode ? getCountryName(countryCode) : "";
                const region = getEventRegion(event);
                const city = getEventCity(event);

                return (
                  <div
                    key={event.id}
                    className="grid grid-cols-1 gap-3 px-4 py-3 text-sm lg:grid-cols-[180px_minmax(0,1fr)_220px_140px] lg:items-center"
                  >
                    <div>
                      <p className="font-semibold text-[#1C1C1E]">
                        {eventLabel(event.event_name)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatRelativeTime(event.created_at)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#1C1C1E]">
                        {property?.title ||
                          cleanText(event.metadata?.property_title) ||
                          getPath(event)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {property?.kode ||
                          cleanText(event.metadata?.property_code) ||
                          "-"}{" "}
                        • {getPath(event)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs text-gray-500">
                        {city || region || country || "No location saved"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-400">
                        {[region && region !== city ? region : "", country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>

                    <div className="text-xs text-gray-500 lg:text-right">
                      {formatDateTime(event.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              currentPage={eventsPage}
              totalPages={eventsTotalPages}
              onPageChange={setEventsPage}
            />
          </>
        ) : (
          <EmptyState
            title="No events found"
            description="No analytics events match the selected date, search, or property filter."
            Icon={Activity}
          />
        )}
      </SectionCard>
    </div>
  );
}