"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Eye,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   TYPES
========================= */

type LeadStatus = "NEW" | "CONTACTED" | "VIEWING" | "INTERESTED" | "CLOSED";

type ActivitySource =
  | "LEAD"
  | "BUYER_REQUEST"
  | "VIEWING_REQUEST"
  | "SCHEDULE"
  | "ANALYTICS";

type ActivityKind =
  | "INQUIRY"
  | "BUYER_REQUEST"
  | "VIEWING"
  | "SCHEDULE"
  | "WHATSAPP_CLICK"
  | "DETAIL_CLICK"
  | "LEAD_CREATED"
  | "UNKNOWN";

type ActivityFilter =
  | "ALL"
  | "LEADS"
  | "REQUESTS"
  | "VIEWINGS"
  | "WHATSAPP"
  | "AGENT"
  | "OWNER"
  | "ANALYTICS";

type DbRow = Record<string, any>;

type AdminLeadActivity = {
  id: string;
  recordId: string;
  idColumn: string;
  table: string;
  source: ActivitySource;
  kind: ActivityKind;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  propertyId: string | null;
  propertyTitle: string;
  listingKode: string;
  agentName: string;
  ownerName: string;
  createdAt: string;
  rawCreatedAt: string | null;
  status: LeadStatus;
  receiverRole: string;
  leadType: string;
  notes: string;
  isActionable: boolean;
  statusColumn: string | null;
  raw: DbRow;
};

type PropertyRow = {
  id: string;
  title: string | null;
  kode: string | null;
  source: string | null;
  user_id: string | null;
  owner_id?: string | null;
  agent_id?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
};

type TableFetchResult = {
  table: string;
  rows: DbRow[];
  skipped: boolean;
  error: any;
};

/* =========================
   CONSTANTS
========================= */

const ITEMS_PER_PAGE = 12;
const TABLE_PAGE_SIZE = 1000;
const MAX_ROWS_PER_TABLE = 20000;

const ACTIVITY_TABLES: {
  table: string;
  source: ActivitySource;
}[] = [
  { table: "leads", source: "LEAD" },
  { table: "buyer_requests", source: "BUYER_REQUEST" },
  { table: "viewing_requests", source: "VIEWING_REQUEST" },
  { table: "schedule_viewings", source: "SCHEDULE" },
];

const ANALYTICS_LEAD_EVENTS = [
  "lead_created",
  "buyer_request_submitted",
  "property_whatsapp_click",
  "property_schedule_viewing_click",
  "property_view_detail_click",
];

const STATUS_COLUMNS = [
  "status",
  "lead_status",
  "request_status",
  "viewing_status",
  "schedule_status",
  "admin_status",
];

const PROPERTY_ID_KEYS = [
  "property_id",
  "propertyId",
  "listing_id",
  "listingId",
];

const USER_ID_KEYS = [
  "sender_user_id",
  "buyer_user_id",
  "user_id",
  "receiver_user_id",
  "owner_id",
  "agent_id",
  "profile_id",
];

/* =========================
   BASIC HELPERS
========================= */

function hasKey(row: DbRow, key: string) {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function cleanText(value: any) {
  return String(value ?? "").trim();
}

function cleanLower(value: any) {
  return cleanText(value).toLowerCase();
}

function getMetadata(row: DbRow) {
  const metadata = row.metadata;

  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata as DbRow;
  }

  return {};
}

function getFirstValue(row: DbRow, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== null && row[key] !== undefined && cleanText(row[key])) {
      return row[key];
    }
  }

  const metadata = getMetadata(row);

  for (const key of keys) {
    if (
      metadata[key] !== null &&
      metadata[key] !== undefined &&
      cleanText(metadata[key])
    ) {
      return metadata[key];
    }
  }

  return null;
}

function getFirstExistingKey(row: DbRow, keys: string[]) {
  for (const key of keys) {
    if (hasKey(row, key)) return key;
  }

  return null;
}

function getRecordIdentity(row: DbRow) {
  const possibleIds = ["id", "uuid", "lead_id", "request_id", "schedule_id"];

  for (const key of possibleIds) {
    const value = cleanText(row[key]);

    if (value) {
      return {
        idColumn: key,
        recordId: value,
      };
    }
  }

  return null;
}

function getDateValue(row: DbRow) {
  return (
    cleanText(row.created_at) ||
    cleanText(row.submitted_at) ||
    cleanText(row.requested_at) ||
    cleanText(row.scheduled_at) ||
    cleanText(row.updated_at) ||
    cleanText(getMetadata(row).created_at) ||
    null
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

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

function formatRelativeTime(value?: string | null) {
  if (!value) return "-";

  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;

  const diffMs = Date.now() - time;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function numberFormat(value: number) {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

/* =========================
   STATUS HELPERS
========================= */

function mapLeadStatus(status?: string | null, leadType?: string | null) {
  const s = cleanLower(status);
  const lt = cleanLower(leadType);

  if (s === "new" || s === "pending") return lt === "viewing" ? "VIEWING" : "NEW";
  if (s === "contacted") return "CONTACTED";
  if (s === "scheduled" || s === "viewing" || s === "confirmed") return "VIEWING";
  if (s === "interested") return "INTERESTED";
  if (
    s === "completed" ||
    s === "closed" ||
    s === "done" ||
    s === "finished"
  ) {
    return "CLOSED";
  }

  return lt === "viewing" || lt === "schedule" || lt === "scheduled"
    ? "VIEWING"
    : "NEW";
}

function dbStatusFromLeadStatus(status: LeadStatus) {
  if (status === "NEW") return "new";
  if (status === "CONTACTED") return "contacted";
  if (status === "VIEWING") return "scheduled";
  if (status === "INTERESTED") return "interested";
  return "closed";
}

function nextReviewStatus(status: LeadStatus): LeadStatus {
  if (status === "NEW") return "CONTACTED";
  if (status === "CONTACTED") return "VIEWING";
  if (status === "VIEWING") return "INTERESTED";
  if (status === "INTERESTED") return "CLOSED";
  return "CLOSED";
}

/* =========================
   UI HELPERS
========================= */

function leadStatusUI(status: LeadStatus) {
  if (status === "NEW") {
    return {
      label: "New",
      Icon: Users,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "CONTACTED") {
    return {
      label: "Contacted",
      Icon: PhoneCall,
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  if (status === "VIEWING") {
    return {
      label: "Viewing",
      Icon: CalendarDays,
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "INTERESTED") {
    return {
      label: "Interested",
      Icon: Eye,
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: "Closed",
    Icon: BadgeCheck,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  };
}

function sourceUI(source: ActivitySource, kind: ActivityKind) {
  if (kind === "WHATSAPP_CLICK") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (source === "LEAD") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (source === "BUYER_REQUEST") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }

  if (source === "VIEWING_REQUEST" || source === "SCHEDULE") {
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

function sourceLabel(source: ActivitySource, kind: ActivityKind) {
  if (kind === "WHATSAPP_CLICK") return "WhatsApp";
  if (kind === "DETAIL_CLICK") return "Detail Click";
  if (kind === "LEAD_CREATED") return "Lead Event";
  if (source === "LEAD") return "Lead";
  if (source === "BUYER_REQUEST") return "Buyer Request";
  if (source === "VIEWING_REQUEST") return "Viewing Request";
  if (source === "SCHEDULE") return "Schedule";
  return "Analytics";
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

function SummaryCard({
  title,
  value,
  caption,
}: {
  title: string;
  value: number | string;
  caption?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
        {title}
      </p>
      <p className="mt-1.5 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
        {value}
      </p>
      {caption ? (
        <p className="mt-1 text-[10px] leading-4 text-gray-500 sm:text-[11px]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}

/* =========================
   DATA FETCH HELPERS
========================= */

async function fetchRowsFromTable(
  table: string,
  options?: {
    analyticsEvents?: string[];
  }
): Promise<TableFetchResult> {
  const rows: DbRow[] = [];

  let shouldOrderByCreatedAt = true;
  let lastError: any = null;

  for (let from = 0; from < MAX_ROWS_PER_TABLE; from += TABLE_PAGE_SIZE) {
    const to = from + TABLE_PAGE_SIZE - 1;

    let query = (supabase as any).from(table).select("*");

    if (options?.analyticsEvents?.length) {
      query = query.in("event_name", options.analyticsEvents);
    }

    if (shouldOrderByCreatedAt) {
      query = query.order("created_at", { ascending: false });
    }

    let result = await query.range(from, to);

    if (result.error && shouldOrderByCreatedAt) {
      shouldOrderByCreatedAt = false;

      let fallbackQuery = (supabase as any).from(table).select("*");

      if (options?.analyticsEvents?.length) {
        fallbackQuery = fallbackQuery.in("event_name", options.analyticsEvents);
      }

      result = await fallbackQuery.range(from, to);
    }

    if (result.error) {
      lastError = result.error;

      if (from === 0) {
        return {
          table,
          rows: [],
          skipped: true,
          error: lastError,
        };
      }

      break;
    }

    const batch = (result.data || []) as DbRow[];
    rows.push(...batch);

    if (batch.length < TABLE_PAGE_SIZE) {
      break;
    }
  }

  return {
    table,
    rows,
    skipped: false,
    error: lastError,
  };
}

function extractPropertyId(row: DbRow) {
  return cleanText(getFirstValue(row, PROPERTY_ID_KEYS)) || null;
}

function extractUserIds(row: DbRow) {
  const ids = new Set<string>();

  for (const key of USER_ID_KEYS) {
    const value = cleanText(row[key]);
    if (value) ids.add(value);
  }

  const metadata = getMetadata(row);

  for (const key of USER_ID_KEYS) {
    const value = cleanText(metadata[key]);
    if (value) ids.add(value);
  }

  return Array.from(ids);
}

function getProfileName(profile?: ProfileRow | null) {
  if (!profile) return "";

  return (
    cleanText(profile.full_name) ||
    cleanText(profile.name) ||
    cleanText(profile.display_name) ||
    cleanText(profile.email) ||
    cleanText(profile.phone) ||
    cleanText(profile.whatsapp)
  );
}

function getPropertyTitle(row: DbRow, property?: PropertyRow | null) {
  const metadata = getMetadata(row);

  return (
    cleanText(property?.title) ||
    cleanText(row.property_title) ||
    cleanText(metadata.property_title) ||
    cleanText(row.title) ||
    cleanText(row.name) ||
    "-"
  );
}

function getPropertyCode(row: DbRow, property?: PropertyRow | null) {
  const metadata = getMetadata(row);

  return (
    cleanText(property?.kode) ||
    cleanText(row.kode) ||
    cleanText(row.property_code) ||
    cleanText(metadata.property_code) ||
    "-"
  );
}

function getBuyerName(row: DbRow, senderProfile?: ProfileRow | null) {
  const metadata = getMetadata(row);

  return (
    cleanText(row.sender_name) ||
    cleanText(row.buyer_name) ||
    cleanText(row.name) ||
    cleanText(row.full_name) ||
    cleanText(metadata.sender_name) ||
    cleanText(metadata.buyer_name) ||
    cleanText(metadata.name) ||
    getProfileName(senderProfile) ||
    "Unknown Buyer"
  );
}

function getBuyerPhone(row: DbRow) {
  const metadata = getMetadata(row);

  return (
    cleanText(row.sender_phone) ||
    cleanText(row.buyer_phone) ||
    cleanText(row.phone) ||
    cleanText(row.whatsapp) ||
    cleanText(row.phone_number) ||
    cleanText(metadata.sender_phone) ||
    cleanText(metadata.buyer_phone) ||
    cleanText(metadata.phone) ||
    cleanText(metadata.whatsapp) ||
    "-"
  );
}

function getBuyerEmail(row: DbRow) {
  const metadata = getMetadata(row);

  return (
    cleanText(row.sender_email) ||
    cleanText(row.buyer_email) ||
    cleanText(row.email) ||
    cleanText(metadata.sender_email) ||
    cleanText(metadata.buyer_email) ||
    cleanText(metadata.email) ||
    "-"
  );
}

function detectActivityKind(row: DbRow, source: ActivitySource): ActivityKind {
  const eventName = cleanLower(row.event_name);
  const leadType = cleanLower(row.lead_type || row.type || row.request_type);

  if (eventName === "property_whatsapp_click") return "WHATSAPP_CLICK";
  if (eventName === "property_schedule_viewing_click") return "SCHEDULE";
  if (eventName === "property_view_detail_click") return "DETAIL_CLICK";
  if (eventName === "lead_created") return "LEAD_CREATED";
  if (eventName === "buyer_request_submitted") return "BUYER_REQUEST";

  if (leadType.includes("whatsapp")) return "WHATSAPP_CLICK";
  if (leadType.includes("viewing") || leadType.includes("schedule")) {
    return "VIEWING";
  }

  if (source === "BUYER_REQUEST") return "BUYER_REQUEST";
  if (source === "VIEWING_REQUEST" || source === "SCHEDULE") return "VIEWING";
  if (source === "LEAD") return "INQUIRY";

  return "UNKNOWN";
}

function buildActivityItem({
  row,
  table,
  source,
  propertyMap,
  profileMap,
}: {
  row: DbRow;
  table: string;
  source: ActivitySource;
  propertyMap: Map<string, PropertyRow>;
  profileMap: Map<string, ProfileRow>;
}): AdminLeadActivity | null {
  const identity = getRecordIdentity(row);
  if (!identity) return null;

  const propertyId = extractPropertyId(row);
  const property = propertyId ? propertyMap.get(propertyId) : null;

  const senderUserId =
    cleanText(row.sender_user_id) ||
    cleanText(row.buyer_user_id) ||
    cleanText(row.user_id) ||
    cleanText(getMetadata(row).sender_user_id) ||
    "";

  const receiverUserId =
    cleanText(row.receiver_user_id) ||
    cleanText(row.owner_id) ||
    cleanText(row.agent_id) ||
    "";

  const senderProfile = senderUserId ? profileMap.get(senderUserId) : null;
  const receiverProfile = receiverUserId ? profileMap.get(receiverUserId) : null;

  const propertyOwnerProfile = property?.user_id
    ? profileMap.get(property.user_id)
    : null;

  const propertyAgentProfile = property?.agent_id
    ? profileMap.get(property.agent_id)
    : null;

  const propertyOwnerByOwnerId = property?.owner_id
    ? profileMap.get(property.owner_id)
    : null;

  const receiverRole = cleanLower(
    row.receiver_role || row.receiver_type || row.role
  );

  const propertySource = cleanLower(property?.source);

  const ownerName =
    cleanText(row.owner_name) ||
    cleanText(getMetadata(row).owner_name) ||
    (receiverRole === "owner" ? getProfileName(receiverProfile) : "") ||
    (propertySource === "owner" ? getProfileName(propertyOwnerProfile) : "") ||
    getProfileName(propertyOwnerByOwnerId) ||
    "-";

  const agentName =
    cleanText(row.agent_name) ||
    cleanText(getMetadata(row).agent_name) ||
    (receiverRole === "agent" ? getProfileName(receiverProfile) : "") ||
    (propertySource === "agent" ? getProfileName(propertyOwnerProfile) : "") ||
    getProfileName(propertyAgentProfile) ||
    "-";

  const leadType =
    cleanText(row.lead_type) ||
    cleanText(row.type) ||
    cleanText(row.request_type) ||
    cleanText(row.event_name) ||
    "-";

  const kind = detectActivityKind(row, source);
  const statusColumn = getFirstExistingKey(row, STATUS_COLUMNS);
  const rawStatus = statusColumn ? row[statusColumn] : row.status;

  const status = mapLeadStatus(rawStatus, leadType);
  const createdAt = getDateValue(row);

  const notes =
    cleanText(row.message) ||
    cleanText(row.notes) ||
    cleanText(row.description) ||
    cleanText(getMetadata(row).message) ||
    cleanText(getMetadata(row).notes) ||
    "";

  const isActionable = source !== "ANALYTICS" && Boolean(statusColumn);

  return {
    id: `${table}:${identity.recordId}:${source}:${kind}`,
    recordId: identity.recordId,
    idColumn: identity.idColumn,
    table,
    source,
    kind,
    buyerName: getBuyerName(row, senderProfile),
    buyerPhone: getBuyerPhone(row),
    buyerEmail: getBuyerEmail(row),
    propertyId,
    propertyTitle: getPropertyTitle(row, property),
    listingKode: getPropertyCode(row, property),
    agentName,
    ownerName,
    createdAt: formatDate(createdAt),
    rawCreatedAt: createdAt,
    status,
    receiverRole: cleanText(row.receiver_role || row.receiver_type || "-"),
    leadType,
    notes,
    isActionable,
    statusColumn,
    raw: row,
  };
}

/* =========================
   PAGE
========================= */

export default function AdminLeadsPage() {
  const [allActivities, setAllActivities] = useState<AdminLeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [skippedTables, setSkippedTables] = useState<string[]>([]);
  const [loadedTableCounts, setLoadedTableCounts] = useState<
    Record<string, number>
  >({});

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ActivityFilter>("ALL");
  const [page, setPage] = useState(1);

  const [selectedLead, setSelectedLead] = useState<AdminLeadActivity | null>(
    null
  );
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const loadLeadActivities = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setSkippedTables([]);

    try {
      const activityResults = await Promise.all([
        ...ACTIVITY_TABLES.map((item) => fetchRowsFromTable(item.table)),
        fetchRowsFromTable("analytics_events", {
          analyticsEvents: ANALYTICS_LEAD_EVENTS,
        }),
      ]);

      const nextSkipped = activityResults
        .filter((result) => result.skipped)
        .map((result) => result.table);

      const tableCounts: Record<string, number> = {};
      for (const result of activityResults) {
        tableCounts[result.table] = result.rows.length;
      }

      const sourceByTable = new Map<string, ActivitySource>();
      for (const item of ACTIVITY_TABLES) {
        sourceByTable.set(item.table, item.source);
      }
      sourceByTable.set("analytics_events", "ANALYTICS");

      const allRows = activityResults.flatMap((result) =>
        result.rows.map((row) => ({
          row,
          table: result.table,
          source: sourceByTable.get(result.table) || "ANALYTICS",
        }))
      );

      const propertyIds = Array.from(
        new Set(
          allRows
            .map((item) => extractPropertyId(item.row))
            .filter(Boolean) as string[]
        )
      );

      const propertiesResult = propertyIds.length
        ? await (supabase as any)
            .from("properties")
            .select("*")
            .in("id", propertyIds)
        : { data: [], error: null };

      if (propertiesResult.error) throw propertiesResult.error;

      const properties = (propertiesResult.data || []) as PropertyRow[];
      const propertyMap = new Map(properties.map((property) => [property.id, property]));

      const userIds = new Set<string>();

      for (const item of allRows) {
        for (const userId of extractUserIds(item.row)) {
          userIds.add(userId);
        }
      }

      for (const property of properties) {
        if (property.user_id) userIds.add(property.user_id);
        if (property.owner_id) userIds.add(property.owner_id);
        if (property.agent_id) userIds.add(property.agent_id);
      }

      const profilesResult = userIds.size
        ? await (supabase as any)
            .from("profiles")
            .select("*")
            .in("id", Array.from(userIds))
        : { data: [], error: null };

      if (profilesResult.error) throw profilesResult.error;

      const profiles = (profilesResult.data || []) as ProfileRow[];
      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

      const mapped = allRows
        .map((item) =>
          buildActivityItem({
            row: item.row,
            table: item.table,
            source: item.source,
            propertyMap,
            profileMap,
          })
        )
        .filter(Boolean) as AdminLeadActivity[];

      mapped.sort((a, b) => {
        const aTime = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
        const bTime = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;

        return bTime - aTime;
      });

      setAllActivities(mapped);
      setSkippedTables(nextSkipped);
      setLoadedTableCounts(tableCounts);
    } catch (error: any) {
      console.error("Failed to load admin lead activity:", error);
      setLoadError(error?.message || "Failed to load lead activity.");
      setAllActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeadActivities();
  }, [loadLeadActivities]);

  const filteredActivities = useMemo(() => {
    let result = allActivities;

    if (filter === "LEADS") {
      result = result.filter((item) => item.source === "LEAD");
    }

    if (filter === "REQUESTS") {
      result = result.filter(
        (item) =>
          item.source === "BUYER_REQUEST" || item.kind === "BUYER_REQUEST"
      );
    }

    if (filter === "VIEWINGS") {
      result = result.filter(
        (item) =>
          item.source === "VIEWING_REQUEST" ||
          item.source === "SCHEDULE" ||
          item.kind === "VIEWING" ||
          item.kind === "SCHEDULE"
      );
    }

    if (filter === "WHATSAPP") {
      result = result.filter((item) => item.kind === "WHATSAPP_CLICK");
    }

    if (filter === "AGENT") {
      result = result.filter(
        (item) =>
          item.agentName !== "-" ||
          cleanLower(item.receiverRole).includes("agent")
      );
    }

    if (filter === "OWNER") {
      result = result.filter(
        (item) =>
          item.ownerName !== "-" ||
          cleanLower(item.receiverRole).includes("owner")
      );
    }

    if (filter === "ANALYTICS") {
      result = result.filter((item) => item.source === "ANALYTICS");
    }

    if (!searchQuery.trim()) return result;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return result.filter((lead) => {
      const searchable = `
        ${lead.buyerName}
        ${lead.buyerPhone}
        ${lead.buyerEmail}
        ${lead.propertyTitle}
        ${lead.listingKode}
        ${lead.agentName}
        ${lead.ownerName}
        ${lead.status}
        ${lead.leadType}
        ${lead.receiverRole}
        ${lead.table}
        ${lead.source}
        ${lead.kind}
        ${lead.notes}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [searchQuery, allActivities, filter]);

  const stats = useMemo(() => {
    return {
      total: allActivities.length,
      leads: allActivities.filter((item) => item.source === "LEAD").length,
      requests: allActivities.filter(
        (item) =>
          item.source === "BUYER_REQUEST" || item.kind === "BUYER_REQUEST"
      ).length,
      viewings: allActivities.filter(
        (item) =>
          item.source === "VIEWING_REQUEST" ||
          item.source === "SCHEDULE" ||
          item.kind === "VIEWING" ||
          item.kind === "SCHEDULE"
      ).length,
      whatsapp: allActivities.filter((item) => item.kind === "WHATSAPP_CLICK")
        .length,
      newCount: allActivities.filter((lead) => lead.status === "NEW").length,
      contacted: allActivities.filter((lead) => lead.status === "CONTACTED")
        .length,
      viewing: allActivities.filter((lead) => lead.status === "VIEWING").length,
      interested: allActivities.filter((lead) => lead.status === "INTERESTED")
        .length,
      closed: allActivities.filter((lead) => lead.status === "CLOSED").length,
      actionable: allActivities.filter((lead) => lead.isActionable).length,
      analytics: allActivities.filter((lead) => lead.source === "ANALYTICS")
        .length,
    };
  }, [allActivities]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filter, allActivities.length]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredActivities.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedLeads = filteredActivities.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredActivities.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredActivities.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

  async function updateLeadStatus(item: AdminLeadActivity, nextStatus: LeadStatus) {
    if (!item.isActionable || !item.statusColumn) {
      alert("This activity is read-only. It came from analytics or has no status column.");
      return;
    }

    setStatusUpdatingId(item.id);

    const updatePayload: DbRow = {
      [item.statusColumn]: dbStatusFromLeadStatus(nextStatus),
    };

    if (hasKey(item.raw, "updated_at")) {
      updatePayload.updated_at = new Date().toISOString();
    }

    const { error } = await (supabase as any)
      .from(item.table)
      .update(updatePayload)
      .eq(item.idColumn, item.recordId);

    if (error) {
      console.error("Failed to update lead activity status:", error);
      alert(error.message || "Failed to update lead status.");
      setStatusUpdatingId(null);
      return;
    }

    setAllActivities((prev) =>
      prev.map((lead) =>
        lead.id === item.id ? { ...lead, status: nextStatus } : lead
      )
    );

    setSelectedLead((prev) =>
      prev && prev.id === item.id ? { ...prev, status: nextStatus } : prev
    );

    window.dispatchEvent(new CustomEvent("tetamo-leads-updated"));
    setStatusUpdatingId(null);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
            Leads & Activity
          </h1>
          <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
            Monitor all real lead activity across owners, agents, listings,
            buyer requests, viewing requests, WhatsApp clicks, and analytics
            events.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLeadActivities}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loadError ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {skippedTables.length > 0 ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Skipped missing/unavailable table(s): {skippedTables.join(", ")}.
            This is okay if Tetamo is not using those tables yet.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Total Activity" value={stats.total} />
        <SummaryCard title="Real Leads" value={stats.leads} />
        <SummaryCard title="Buyer Requests" value={stats.requests} />
        <SummaryCard title="Viewings" value={stats.viewings} />
        <SummaryCard title="WhatsApp Clicks" value={stats.whatsapp} />
        <SummaryCard title="Actionable" value={stats.actionable} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="New" value={stats.newCount} />
        <SummaryCard title="Contacted" value={stats.contacted} />
        <SummaryCard title="Viewing" value={stats.viewing} />
        <SummaryCard title="Interested" value={stats.interested} />
        <SummaryCard title="Closed" value={stats.closed} />
        <SummaryCard title="Analytics Events" value={stats.analytics} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { label: "All", value: "ALL" as ActivityFilter },
            { label: "Leads", value: "LEADS" as ActivityFilter },
            { label: "Requests", value: "REQUESTS" as ActivityFilter },
            { label: "Viewings", value: "VIEWINGS" as ActivityFilter },
            { label: "WhatsApp", value: "WHATSAPP" as ActivityFilter },
            { label: "Agent", value: "AGENT" as ActivityFilter },
            { label: "Owner", value: "OWNER" as ActivityFilter },
            { label: "Analytics", value: "ANALYTICS" as ActivityFilter },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                filter === item.value
                  ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
          {Object.entries(loadedTableCounts).map(([table, count]) => (
            <span key={table} className="rounded-full bg-gray-100 px-3 py-1">
              {table}: {numberFormat(count)}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:gap-5">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Lead Overview
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              This now combines real lead records and lead-related activity
              events.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Search Result
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  {filteredActivities.length}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Current Page
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  {page} / {totalPages}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {(["NEW", "CONTACTED", "VIEWING", "INTERESTED", "CLOSED"] as LeadStatus[]).map(
                (status) => {
                  const ui = leadStatusUI(status);
                  const Icon = ui.Icon;

                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2.5"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {ui.label}
                      </span>

                      <span className="text-sm font-semibold text-[#1C1C1E]">
                        {status === "NEW"
                          ? stats.newCount
                          : status === "CONTACTED"
                          ? stats.contacted
                          : status === "VIEWING"
                          ? stats.viewing
                          : status === "INTERESTED"
                          ? stats.interested
                          : stats.closed}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Lead Status Flow
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              Only real records with a status column can be updated. Analytics
              events are read-only.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {(["NEW", "CONTACTED", "VIEWING", "INTERESTED", "CLOSED"] as LeadStatus[]).map(
                (status) => {
                  const ui = leadStatusUI(status);
                  const Icon = ui.Icon;

                  return (
                    <div
                      key={status}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[10px] font-medium sm:text-[11px] ${ui.badgeClass}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {ui.label}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                All Lead Activity
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                Track inquiries, buyer requests, viewing requests, WhatsApp
                clicks, assigned agents, owners, and listing interest.
              </p>

              <div className="relative mt-3">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />

                <input
                  type="text"
                  placeholder="Search buyer, phone, listing, agent, owner, code, source..."
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:text-sm"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                  Loading all lead activity...
                </div>
              ) : paginatedLeads.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                  No lead activity found.
                </div>
              ) : (
                paginatedLeads.map((lead) => {
                  const ui = leadStatusUI(lead.status);
                  const BadgeIcon = ui.Icon;
                  const isUpdating = statusUpdatingId === lead.id;

                  return (
                    <div key={lead.id} className="px-3.5 py-4 sm:px-5">
                      <div className="flex flex-col gap-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badgeClass}`}
                              >
                                <BadgeIcon className="h-3.5 w-3.5" />
                                {ui.label}
                              </span>

                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${sourceUI(
                                  lead.source,
                                  lead.kind
                                )}`}
                              >
                                {sourceLabel(lead.source, lead.kind)}
                              </span>

                              {!lead.isActionable ? (
                                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500 sm:text-[11px]">
                                  Read-only
                                </span>
                              ) : null}

                              <span className="text-[10px] text-gray-500 sm:text-[11px]">
                                {formatRelativeTime(lead.rawCreatedAt)}
                              </span>

                              <span className="text-[10px] text-gray-300 sm:text-[11px]">
                                •
                              </span>

                              <span className="text-[10px] text-gray-500 sm:text-[11px]">
                                Code: {lead.listingKode}
                              </span>
                            </div>

                            <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                              {lead.buyerName}
                            </p>

                            <p className="mt-1 text-[12px] text-gray-500 sm:text-[13px]">
                              {lead.buyerPhone}
                              {lead.buyerEmail !== "-" ? ` • ${lead.buyerEmail}` : ""}
                            </p>

                            <p className="mt-2 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px] md:text-sm">
                              {lead.propertyTitle}
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                              Agent: {lead.agentName}{" "}
                              <span className="text-gray-300">•</span> Owner:{" "}
                              {lead.ownerName}
                            </p>

                            <p className="mt-1 text-[10px] leading-5 text-gray-400 sm:text-[11px]">
                              Table: {lead.table} • Type: {lead.leadType} • Role:{" "}
                              {lead.receiverRole}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-300 px-3 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 sm:text-sm"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            disabled={
                              isUpdating ||
                              lead.status === "CLOSED" ||
                              !lead.isActionable
                            }
                            onClick={() =>
                              updateLeadStatus(
                                lead,
                                nextReviewStatus(lead.status)
                              )
                            }
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-3 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:text-sm"
                          >
                            {!lead.isActionable
                              ? "Read-only"
                              : lead.status === "NEW"
                              ? "Review"
                              : lead.status === "CONTACTED"
                              ? "Set Viewing"
                              : lead.status === "VIEWING"
                              ? "Mark Interested"
                              : lead.status === "INTERESTED"
                              ? "Close"
                              : "Closed"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
              Showing {startItem}–{endItem} of {filteredActivities.length} lead
              activities
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
                type="button"
              >
                Previous
              </button>

              {visiblePages.map((currentPage) => (
                <button
                  key={currentPage}
                  onClick={() => setPage(currentPage)}
                  type="button"
                  className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                    page === currentPage
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {currentPage}
                </button>
              ))}

              <button
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page === totalPages}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedLead ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  Lead Activity Details
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                  Full information from {selectedLead.table}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-4 sm:gap-3 sm:p-5">
              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Source
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {sourceLabel(selectedLead.source, selectedLead.kind)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Table
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.table}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Buyer
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.buyerName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Phone
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.buyerPhone}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Email
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.buyerEmail}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Status
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.status}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Property
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.propertyTitle}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Listing Code
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.listingKode}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Agent
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.agentName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Owner
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.ownerName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Lead Type
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.leadType || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Receiver Role
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.receiverRole || "-"}
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Created At
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {formatDateTime(selectedLead.rawCreatedAt)}
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Notes / Message
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-5 text-[#1C1C1E] sm:text-sm">
                  {selectedLead.notes || "-"}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 sm:p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-gray-400">
                Update Status
              </p>

              {!selectedLead.isActionable ? (
                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
                  This activity is read-only because it came from analytics or
                  the source table has no status column.
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {(
                  ["NEW", "CONTACTED", "VIEWING", "INTERESTED", "CLOSED"] as LeadStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={
                      statusUpdatingId === selectedLead.id ||
                      selectedLead.status === status ||
                      !selectedLead.isActionable
                    }
                    onClick={() => updateLeadStatus(selectedLead, status)}
                    className={`rounded-2xl border px-3 py-2.5 text-[12px] font-semibold transition sm:text-sm ${
                      selectedLead.status === status
                        ? "border-black bg-black text-white"
                        : "border-gray-300 text-[#1C1C1E] hover:bg-gray-50"
                    } disabled:opacity-50`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}