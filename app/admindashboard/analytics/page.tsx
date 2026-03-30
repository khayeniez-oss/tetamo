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

type LocationData = {
  province: string;
  city: string;
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

const PLACEHOLDER_LOCATIONS: LocationData[] = [];

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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-[#1C1C1E]">{value}</p>
          {caption ? <p className="mt-2 text-xs text-gray-500">{caption}</p> : null}
        </div>

        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#1C1C1E]" />
        </div>
      </div>
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

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
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
    <div className="h-full rounded-2xl border border-dashed border-gray-300 bg-[#FAFAFA] flex flex-col items-center justify-center text-center p-8">
      <Icon className="h-10 w-10 text-gray-400 mb-3" />
      <p className="text-sm font-medium text-[#1C1C1E]">{title}</p>
      <p className="mt-1 text-sm text-gray-500 max-w-md">{description}</p>
    </div>
  );
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
      .map(([name, set]): TrafficSource => {
        return {
          name,
          visits: set.size,
        };
      })
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
      .map(([name, set]): DeviceData => {
        return {
          name,
          visits: set.size,
        };
      })
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

  const pagedRecentEvents = recentEvents.slice(
    (recentEventsPage - 1) * recentEventsPageSize,
    recentEventsPage * recentEventsPageSize
  );

  useEffect(() => {
    setRecentEventsPage(1);
  }, [searchQuery, recentEvents.length]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">Analytics</h1>
          <p className="text-sm text-gray-500">
            Real Supabase event analytics for traffic, devices, listings, conversion, and recent activity.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <StatCard
          title="Total Visitors"
          value={numberFormat(totalVisitors)}
          Icon={Users}
          caption="Unique visitor_id tracked from browser"
        />
        <StatCard
          title="Total Views"
          value={numberFormat(totalViews)}
          Icon={Globe}
          caption="Property card views + property detail views"
        />
        <StatCard
          title="Tracked Clicks"
          value={numberFormat(totalClicks)}
          Icon={MousePointerClick}
          caption="WhatsApp + View Detail + Schedule Viewing"
        />
        <StatCard
          title="Active Now"
          value={numberFormat(activeNow)}
          Icon={Activity}
          caption="Events in the last 15 minutes"
        />
      </div>

      <div className="mt-6 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari source, device, kota, listing, kode..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder:text-gray-500"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#1C1C1E]">Traffic Sources</h2>
            <p className="text-sm text-gray-500">
              Real traffic source buckets from referrer + UTM params.
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              Loading traffic sources...
            </div>
          ) : trafficSources.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {trafficSources.map((source) => (
                <div
                  key={source.name}
                  className="p-4 flex items-center justify-between"
                >
                  <p className="text-sm text-[#1C1C1E]">{source.name}</p>
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    {numberFormat(source.visits)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-gray-500 text-center">
              No traffic source data yet.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#1C1C1E]">Devices</h2>
            <p className="text-sm text-gray-500">
              Real device buckets from browser user agent.
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500 text-center">
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
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-[#1C1C1E]" />
                      </div>
                      <p className="text-sm text-[#1C1C1E]">{device.name}</p>
                    </div>

                    <p className="text-sm font-semibold text-[#1C1C1E]">
                      {numberFormat(device.visits)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-sm text-gray-500 text-center">
              No device data yet.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#1C1C1E]">
              Listing Performance
            </h2>
            <p className="text-sm text-gray-500">
              Real data from analytics_events: views, clicks, and leads per listing.
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-gray-500 text-center">
              Loading analytics...
            </div>
          ) : listingPerformance.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {listingPerformance.map((item) => (
                <div
                  key={item.id}
                  className="p-6 flex items-center justify-between gap-6"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>Kode: {item.kode}</span>
                      <span>•</span>
                      <span>{item.city}</span>
                    </div>

                    <p className="mt-2 font-medium text-[#1C1C1E] truncate">
                      {item.title}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-8 shrink-0 text-right">
                    <div>
                      <p className="text-xs text-gray-500">Views</p>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {numberFormat(item.views)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Clicks</p>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {numberFormat(item.clicks)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Leads</p>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {numberFormat(item.leads)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-gray-500 text-center">
              No tracked listing data yet.
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-[#1C1C1E]">
              Top Locations
            </h2>
            <p className="text-sm text-gray-500">
              This one stays for later.
            </p>
          </div>

          <div className="p-6">
            <PlaceholderBlock
              title="Location analytics later"
              description="City / province usually needs opt-in geolocation or a server-side IP geo source."
              icon={MapPinned}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-[#1C1C1E]" />
            </div>
            <h3 className="font-semibold text-[#1C1C1E]">Conversion Insight</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Views</span>
              <span className="font-semibold text-[#1C1C1E]">
                {numberFormat(conversion.views)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Clicks</span>
              <span className="font-semibold text-[#1C1C1E]">
                {numberFormat(conversion.clicks)}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Leads</span>
              <span className="font-semibold text-[#1C1C1E]">
                {numberFormat(conversion.leads)}
              </span>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Click Rate</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {percentFormat(conversion.clickRate)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Lead / Click</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {percentFormat(conversion.leadRateFromClicks)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Lead / View</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {percentFormat(conversion.leadRateFromViews)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-[#1C1C1E]" />
            </div>
            <h3 className="font-semibold text-[#1C1C1E]">Traffic Summary</h3>
          </div>

          <div className="space-y-3">
            {trafficSources.slice(0, 5).map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-500">{item.name}</span>
                <span className="font-semibold text-[#1C1C1E]">
                  {numberFormat(item.visits)}
                </span>
              </div>
            ))}

            {trafficSources.length === 0 ? (
              <p className="text-sm text-gray-500">No traffic source data yet.</p>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-[#1C1C1E]" />
            </div>
            <h3 className="font-semibold text-[#1C1C1E]">Real-Time Events</h3>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading recent events...</p>
          ) : recentEvents.length > 0 ? (
            <>
              <div className="space-y-3 min-h-[360px]">
                {pagedRecentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1C1C1E]">
                          {eventLabel(event.event_name)}
                        </p>
                        <p className="mt-1 text-xs text-gray-600 truncate">
                          {event.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {event.kode} • {event.city}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-[#1C1C1E]">
                          {formatRelativeTime(event.created_at)}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          {event.source_page}
                        </p>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] text-gray-500">
                      {formatDateTime(event.created_at)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page {recentEventsPage} / {recentEventsTotalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setRecentEventsPage((p) => Math.max(1, p - 1))
                    }
                    disabled={recentEventsPage === 1}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#1C1C1E] disabled:opacity-40"
                  >
                    Prev
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setRecentEventsPage((p) =>
                        Math.min(recentEventsTotalPages, p + 1)
                      )
                    }
                    disabled={recentEventsPage === recentEventsTotalPages}
                    className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-[#1C1C1E] disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              No recent tracked events yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}