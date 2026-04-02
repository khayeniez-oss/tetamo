"use client";

import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Globe,
  MousePointerClick,
  Users,
  Smartphone,
  Monitor,
  Tablet,
  MapPinned,
  BarChart3,
  Activity,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type AnalyticsEventName =
  | "property_card_view"
  | "property_detail_view"
  | "property_whatsapp_click"
  | "property_schedule_viewing_click"
  | "property_view_detail_click"
  | "lead_created"
  | "buyer_request_submitted";

type TrafficSource = {
  name: string;
  visits: number;
};

type DeviceData = {
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
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-[#FAFAFA] p-5 text-center sm:min-h-[190px] sm:p-6">
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

function numberFormat(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function percentFormat(value: number) {
  return `${value.toFixed(1)}%`;
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

export default function AdminAnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [loading, setLoading] = useState(true);

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
          .limit(5000),
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
          setEvents((prev) => [nextEvent, ...prev].slice(0, 5000));
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

  const totalVisitors = useMemo<number>(() => {
    const set = new Set<string>();

    for (const event of events) {
      if (event.visitor_id) set.add(event.visitor_id);
    }

    return set.size;
  }, [events]);

  const totalViews = useMemo<number>(() => {
    return events.filter((event) => isViewEvent(event.event_name)).length;
  }, [events]);

  const totalClicks = useMemo<number>(() => {
    return events.filter((event) => isClickEvent(event.event_name)).length;
  }, [events]);

  const activeNow = useMemo<number>(() => {
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

    return events.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return !Number.isNaN(time) && time >= fifteenMinutesAgo;
    }).length;
  }, [events]);

  const trafficSources = useMemo<TrafficSource[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, Set<string>>();

    for (const event of events) {
      const label = getTrafficSourceLabel(event);
      const sessionKey = event.session_id || event.visitor_id || event.id;

      if (!map.has(label)) {
        map.set(label, new Set<string>());
      }

      map.get(label)!.add(sessionKey);
    }

    return Array.from(map.entries())
      .map(([name, set]): TrafficSource => ({
        name,
        visits: set.size,
      }))
      .filter((item) => (q ? item.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.visits - a.visits);
  }, [events, searchQuery]);

  const devices = useMemo<DeviceData[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, Set<string>>();

    for (const event of events) {
      const label = getDeviceLabel(event);
      const sessionKey = event.session_id || event.visitor_id || event.id;

      if (!map.has(label)) {
        map.set(label, new Set<string>());
      }

      map.get(label)!.add(sessionKey);
    }

    return Array.from(map.entries())
      .map(([name, set]): DeviceData => ({
        name,
        visits: set.size,
      }))
      .filter((item) => (q ? item.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.visits - a.visits);
  }, [events, searchQuery]);

  const conversion = useMemo(() => {
    const views = events.filter((event) => isViewEvent(event.event_name)).length;
    const clicks = events.filter((event) => isClickEvent(event.event_name)).length;
    const leads = events.filter((event) => event.event_name === "lead_created").length;

    return {
      views,
      clicks,
      leads,
      clickRate: views > 0 ? (clicks / views) * 100 : 0,
      leadRateFromClicks: clicks > 0 ? (leads / clicks) * 100 : 0,
      leadRateFromViews: views > 0 ? (leads / views) * 100 : 0,
    };
  }, [events]);

  const listingPerformance = useMemo<ListingAnalytics[]>(() => {
    const map = new Map<string, ListingAnalytics>();

    for (const property of properties) {
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

    for (const event of events) {
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
  }, [events, properties, propertyMap, searchQuery]);

  const recentEvents = useMemo<RecentEventItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();

    return events
      .filter(
        (event) =>
          event.event_name === "property_whatsapp_click" ||
          event.event_name === "lead_created" ||
          event.event_name === "buyer_request_submitted" ||
          event.event_name === "property_schedule_viewing_click"
      )
      .map((event): RecentEventItem => {
        const property = event.property_id ? propertyMap.get(event.property_id) : null;

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
  }, [events, propertyMap, searchQuery]);

  const recentEventsTotalPages = Math.max(
    1,
    Math.ceil(recentEvents.length / recentEventsPageSize)
  );

  useEffect(() => {
    setRecentEventsPage(1);
  }, [searchQuery, recentEvents.length]);

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

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Analytics
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Real Supabase event analytics for traffic, devices, listings,
          conversion, and recent activity.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Visitors"
          value={numberFormat(totalVisitors)}
          Icon={Users}
          caption="Unique visitor_id tracked from browser."
        />
        <StatCard
          title="Total Views"
          value={numberFormat(totalViews)}
          Icon={Globe}
          caption="Property card views plus detail views."
        />
        <StatCard
          title="Tracked Clicks"
          value={numberFormat(totalClicks)}
          Icon={MousePointerClick}
          caption="WhatsApp, view detail, and schedule viewing."
        />
        <StatCard
          title="Active Now"
          value={numberFormat(activeNow)}
          Icon={Activity}
          caption="Events recorded in the last 15 minutes."
        />
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Search source, device, city, listing, code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:gap-5">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                Traffic Sources
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                Real traffic source buckets from referrer and UTM parameters.
              </p>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                Loading traffic sources...
              </div>
            ) : trafficSources.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {trafficSources.map((source) => (
                  <div
                    key={source.name}
                    className="flex items-center justify-between gap-3 px-3.5 py-3.5 sm:px-5"
                  >
                    <p className="min-w-0 truncate text-[12px] text-[#1C1C1E] sm:text-sm">
                      {source.name}
                    </p>
                    <p className="shrink-0 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                      {numberFormat(source.visits)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                No traffic source data yet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
                <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  Devices
                </h2>
                <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                  Device buckets based on browser user agent data.
                </p>
              </div>

              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                  Loading devices...
                </div>
              ) : devices.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {devices.map((device) => {
                    const Icon =
                      device.name === "Mobile"
                        ? Smartphone
                        : device.name === "Tablet"
                        ? Tablet
                        : Monitor;

                    return (
                      <div
                        key={device.name}
                        className="flex items-center justify-between gap-3 px-3.5 py-3.5 sm:px-5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-9 sm:w-9">
                            <Icon className="h-4 w-4 text-[#1C1C1E]" />
                          </div>
                          <p className="truncate text-[12px] text-[#1C1C1E] sm:text-sm">
                            {device.name}
                          </p>
                        </div>

                        <p className="shrink-0 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                          {numberFormat(device.visits)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                  No device data yet.
                </div>
              )}
            </div>

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
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                Listing Performance
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                Real data from analytics_events: views, clicks, and leads per
                listing.
              </p>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                Loading analytics...
              </div>
            ) : listingPerformance.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {listingPerformance.map((item) => (
                  <div key={item.id} className="px-3.5 py-4 sm:px-5">
                    <div className="flex flex-col gap-3">
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

                      <div className="grid grid-cols-3 gap-2.5 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center sm:gap-3 sm:text-right sm:bg-transparent sm:p-0">
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
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                No tracked listing data yet.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
                  <Building2 className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
                </div>
                <h3 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  Traffic Summary
                </h3>
              </div>

              <div className="space-y-2.5">
                {trafficSources.slice(0, 5).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-3 text-[12px] sm:text-sm"
                  >
                    <span className="min-w-0 truncate text-gray-500">
                      {item.name}
                    </span>
                    <span className="shrink-0 font-semibold text-[#1C1C1E]">
                      {numberFormat(item.visits)}
                    </span>
                  </div>
                ))}

                {trafficSources.length === 0 ? (
                  <p className="text-[12px] text-gray-500 sm:text-sm">
                    No traffic source data yet.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
                  <MapPinned className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
                </div>
                <h3 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  Top Locations
                </h3>
              </div>

              <PlaceholderBlock
                title="Location analytics later"
                description="City or province analytics usually needs opt-in geolocation or a server-side IP geo source."
                icon={MapPinned}
              />
            </div>
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
    </div>
  );
}