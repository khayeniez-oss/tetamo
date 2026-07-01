"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ApprovalType = "LISTING" | "AGENT" | "OWNER" | "FEATURED" | "PAYMENT";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
type ApprovalFilter = "ALL" | ApprovalType;

type DbRow = Record<string, any>;

type ApprovalItem = {
  id: string;
  recordId: string;
  idColumn: string;
  table: string;
  title: string;
  subtitle: string;
  type: ApprovalType;
  date: string;
  createdAt: string | null;
  status: ApprovalStatus;
  raw: DbRow;
};

const ITEMS_PER_PAGE = 12;
const READ_LIMIT = 500;

const PAYMENT_TABLES = [
  "property_payments",
  "listing_payments",
  "payments",
  "payment_verifications",
];

const LISTING_STATUS_COLUMNS = [
  "approval_status",
  "listing_status",
  "verification_status",
  "admin_status",
  "status",
];

const PROFILE_STATUS_COLUMNS = [
  "approval_status",
  "verification_status",
  "admin_status",
  "status",
];

const PAYMENT_STATUS_COLUMNS = [
  "payment_status",
  "verification_status",
  "approval_status",
  "status",
];

const FEATURED_STATUS_COLUMNS = [
  "featured_status",
  "featured_approval_status",
  "boost_status",
  "boost_approval_status",
  "spotlight_status",
  "spotlight_approval_status",
];

function hasKey(row: DbRow, key: string) {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function cleanText(value: any) {
  return String(value ?? "").trim();
}

function cleanLower(value: any) {
  return cleanText(value).toLowerCase();
}

function getFirstValue(row: DbRow, keys: string[]) {
  for (const key of keys) {
    if (hasKey(row, key) && row[key] !== null && row[key] !== undefined) {
      return row[key];
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
  const possibleIds = ["id", "uuid", "property_id", "profile_id", "payment_id"];

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

function normalizeApprovalStatus(value: any): ApprovalStatus {
  const raw = cleanLower(value);

  if (
    raw.includes("approved") ||
    raw === "active" ||
    raw === "published" ||
    raw === "verified" ||
    raw === "paid" ||
    raw === "success" ||
    raw === "completed"
  ) {
    return "APPROVED";
  }

  if (
    raw.includes("reject") ||
    raw.includes("decline") ||
    raw.includes("failed") ||
    raw.includes("cancel") ||
    raw === "inactive"
  ) {
    return "REJECTED";
  }

  return "PENDING";
}

function formatStatusValueForRow(row: DbRow, statusColumn: string, status: ApprovalStatus) {
  const current = cleanText(row[statusColumn]);

  if (current && current === current.toUpperCase()) {
    return status;
  }

  return status.toLowerCase();
}

function getDateValue(row: DbRow) {
  return (
    cleanText(row.created_at) ||
    cleanText(row.submitted_at) ||
    cleanText(row.updated_at) ||
    cleanText(row.date) ||
    null
  );
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function typeUI(type: ApprovalType) {
  if (type === "LISTING") return "bg-blue-50 text-blue-700 border-blue-200";
  if (type === "AGENT") return "bg-green-50 text-green-700 border-green-200";
  if (type === "OWNER") return "bg-purple-50 text-purple-700 border-purple-200";
  if (type === "FEATURED")
    return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function statusUI(status: ApprovalStatus) {
  if (status === "APPROVED") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
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

function getPropertyTitle(row: DbRow) {
  return (
    cleanText(row.title) ||
    cleanText(row.property_title) ||
    cleanText(row.name) ||
    cleanText(row.kode) ||
    "Untitled Property"
  );
}

function getPropertySubtitle(row: DbRow) {
  const code = cleanText(row.kode || row.property_code);
  const owner =
    cleanText(row.owner_name) ||
    cleanText(row.owner_full_name) ||
    cleanText(row.full_name) ||
    cleanText(row.name);
  const city = cleanText(row.city || row.area || row.province);
  const price = cleanText(row.price || row.rent_price || row.sale_price);

  return [
    "Listing",
    code ? `Code: ${code}` : "",
    owner ? `Owner: ${owner}` : "",
    city ? `Location: ${city}` : "",
    price ? `Price: ${price}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function getProfileTitle(row: DbRow) {
  return (
    cleanText(row.full_name) ||
    cleanText(row.name) ||
    cleanText(row.display_name) ||
    cleanText(row.email) ||
    cleanText(row.phone) ||
    "Unnamed User"
  );
}

function getProfileRole(row: DbRow) {
  return cleanLower(row.role || row.user_role || row.account_type || row.type);
}

function getProfileSubtitle(row: DbRow, type: ApprovalType) {
  const email = cleanText(row.email);
  const phone = cleanText(row.phone || row.whatsapp || row.phone_number);
  const city = cleanText(row.city || row.area || row.province);
  const agency = cleanText(row.agency_name || row.company_name);

  return [
    type === "AGENT" ? "Agent registration" : "Owner registration",
    agency ? `Agency: ${agency}` : "",
    city ? `Location: ${city}` : "",
    email,
    phone,
  ]
    .filter(Boolean)
    .join(" • ");
}

function getPaymentTitle(row: DbRow) {
  const amount = cleanText(row.amount || row.total || row.price || row.nominal);
  const currency = cleanText(row.currency || "Rp");
  const code = cleanText(row.kode || row.property_code || row.reference);

  if (amount) {
    return `Payment verification — ${currency} ${amount}`;
  }

  return code ? `Payment verification — ${code}` : "Payment verification";
}

function getPaymentSubtitle(row: DbRow, table: string) {
  const payer =
    cleanText(row.owner_name) ||
    cleanText(row.agent_name) ||
    cleanText(row.full_name) ||
    cleanText(row.name) ||
    cleanText(row.email);
  const packageName = cleanText(row.package_name || row.plan_name || row.type);
  const propertyCode = cleanText(row.kode || row.property_code || row.property_id);

  return [
    table,
    payer ? `User: ${payer}` : "",
    packageName ? `Package: ${packageName}` : "",
    propertyCode ? `Property: ${propertyCode}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildListingApproval(row: DbRow): ApprovalItem | null {
  const identity = getRecordIdentity(row);
  if (!identity) return null;

  const status = normalizeApprovalStatus(
    getFirstValue(row, LISTING_STATUS_COLUMNS)
  );

  if (status !== "PENDING") return null;

  const createdAt = getDateValue(row);

  return {
    id: `properties:${identity.recordId}:LISTING`,
    recordId: identity.recordId,
    idColumn: identity.idColumn,
    table: "properties",
    title: getPropertyTitle(row),
    subtitle: getPropertySubtitle(row),
    type: "LISTING",
    date: formatDate(createdAt),
    createdAt,
    status,
    raw: row,
  };
}

function buildFeaturedApproval(row: DbRow): ApprovalItem | null {
  const identity = getRecordIdentity(row);
  if (!identity) return null;

  const hasFeaturedStatusColumn = FEATURED_STATUS_COLUMNS.some((key) =>
    hasKey(row, key)
  );

  const hasFeaturedRequest =
    Boolean(row.featured_requested) ||
    Boolean(row.request_featured) ||
    Boolean(row.is_featured_requested) ||
    Boolean(row.boost_requested) ||
    Boolean(row.request_boost) ||
    Boolean(row.spotlight_requested) ||
    Boolean(row.request_spotlight);

  if (!hasFeaturedStatusColumn && !hasFeaturedRequest) return null;

  const status = normalizeApprovalStatus(
    getFirstValue(row, FEATURED_STATUS_COLUMNS)
  );

  if (status !== "PENDING") return null;

  const createdAt = getDateValue(row);

  return {
    id: `properties:${identity.recordId}:FEATURED`,
    recordId: identity.recordId,
    idColumn: identity.idColumn,
    table: "properties",
    title: `Featured request — ${cleanText(row.kode) || getPropertyTitle(row)}`,
    subtitle: getPropertySubtitle(row),
    type: "FEATURED",
    date: formatDate(createdAt),
    createdAt,
    status,
    raw: row,
  };
}

function buildProfileApproval(row: DbRow): ApprovalItem | null {
  const identity = getRecordIdentity(row);
  if (!identity) return null;

  const role = getProfileRole(row);

  let type: ApprovalType | null = null;

  if (role.includes("agent") || role.includes("agency")) {
    type = "AGENT";
  } else if (role.includes("owner") || role.includes("pemilik")) {
    type = "OWNER";
  }

  if (!type) return null;

  const status = normalizeApprovalStatus(
    getFirstValue(row, PROFILE_STATUS_COLUMNS)
  );

  if (status !== "PENDING") return null;

  const createdAt = getDateValue(row);

  return {
    id: `profiles:${identity.recordId}:${type}`,
    recordId: identity.recordId,
    idColumn: identity.idColumn,
    table: "profiles",
    title: getProfileTitle(row),
    subtitle: getProfileSubtitle(row, type),
    type,
    date: formatDate(createdAt),
    createdAt,
    status,
    raw: row,
  };
}

function buildPaymentApproval(row: DbRow, table: string): ApprovalItem | null {
  const identity = getRecordIdentity(row);
  if (!identity) return null;

  const status = normalizeApprovalStatus(
    getFirstValue(row, PAYMENT_STATUS_COLUMNS)
  );

  if (status !== "PENDING") return null;

  const createdAt = getDateValue(row);

  return {
    id: `${table}:${identity.recordId}:PAYMENT`,
    recordId: identity.recordId,
    idColumn: identity.idColumn,
    table,
    title: getPaymentTitle(row),
    subtitle: getPaymentSubtitle(row, table),
    type: "PAYMENT",
    date: formatDate(createdAt),
    createdAt,
    status,
    raw: row,
  };
}

async function fetchRowsFromTable(table: string) {
  const ordered = await (supabase as any)
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(READ_LIMIT);

  if (!ordered.error) {
    return {
      rows: (ordered.data || []) as DbRow[],
      error: null,
      skipped: false,
    };
  }

  const fallback = await (supabase as any)
    .from(table)
    .select("*")
    .limit(READ_LIMIT);

  if (!fallback.error) {
    return {
      rows: (fallback.data || []) as DbRow[],
      error: null,
      skipped: false,
    };
  }

  return {
    rows: [] as DbRow[],
    error: fallback.error || ordered.error,
    skipped: true,
  };
}

function buildUpdatePayload(item: ApprovalItem, status: ApprovalStatus) {
  const row = item.raw;
  const now = new Date().toISOString();
  const update: DbRow = {};

  let statusColumns = LISTING_STATUS_COLUMNS;

  if (item.type === "AGENT" || item.type === "OWNER") {
    statusColumns = PROFILE_STATUS_COLUMNS;
  }

  if (item.type === "PAYMENT") {
    statusColumns = PAYMENT_STATUS_COLUMNS;
  }

  if (item.type === "FEATURED") {
    statusColumns = FEATURED_STATUS_COLUMNS;
  }

  const statusColumn = getFirstExistingKey(row, statusColumns);

  if (statusColumn) {
    update[statusColumn] = formatStatusValueForRow(row, statusColumn, status);
  }

  if (hasKey(row, "is_approved")) {
    update.is_approved = status === "APPROVED";
  }

  if (hasKey(row, "is_verified")) {
    update.is_verified = status === "APPROVED";
  }

  if (item.type === "AGENT" && hasKey(row, "is_agent_verified")) {
    update.is_agent_verified = status === "APPROVED";
  }

  if (item.type === "OWNER" && hasKey(row, "is_owner_verified")) {
    update.is_owner_verified = status === "APPROVED";
  }

  if (item.type === "FEATURED") {
    const approved = status === "APPROVED";

    if (hasKey(row, "featured")) update.featured = approved;
    if (hasKey(row, "is_featured")) update.is_featured = approved;
    if (hasKey(row, "boosted")) update.boosted = approved;
    if (hasKey(row, "is_boosted")) update.is_boosted = approved;
    if (hasKey(row, "spotlight")) update.spotlight = approved;
    if (hasKey(row, "is_spotlight")) update.is_spotlight = approved;
  }

  if (status === "APPROVED") {
    if (hasKey(row, "approved_at")) update.approved_at = now;
    if (hasKey(row, "verified_at")) update.verified_at = now;
    if (hasKey(row, "published_at")) update.published_at = now;
    if (item.type === "PAYMENT" && hasKey(row, "paid_at")) update.paid_at = now;
  }

  if (status === "REJECTED") {
    if (hasKey(row, "rejected_at")) update.rejected_at = now;
  }

  if (hasKey(row, "reviewed_at")) update.reviewed_at = now;
  if (hasKey(row, "admin_reviewed_at")) update.admin_reviewed_at = now;
  if (hasKey(row, "updated_at")) update.updated_at = now;

  return update;
}

export default function AdminApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ApprovalFilter>("ALL");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [skippedTables, setSkippedTables] = useState<string[]>([]);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setNotice("");
    setErrorMessage("");

    try {
      const skipped: string[] = [];

      const [propertiesResult, profilesResult, ...paymentResults] =
        await Promise.all([
          fetchRowsFromTable("properties"),
          fetchRowsFromTable("profiles"),
          ...PAYMENT_TABLES.map((table) => fetchRowsFromTable(table)),
        ]);

      if (propertiesResult.skipped) skipped.push("properties");
      if (profilesResult.skipped) skipped.push("profiles");

      const nextItems: ApprovalItem[] = [];

      for (const row of propertiesResult.rows) {
        const listing = buildListingApproval(row);
        const featured = buildFeaturedApproval(row);

        if (listing) nextItems.push(listing);
        if (featured) nextItems.push(featured);
      }

      for (const row of profilesResult.rows) {
        const profile = buildProfileApproval(row);

        if (profile) nextItems.push(profile);
      }

      paymentResults.forEach((result, index) => {
        const table = PAYMENT_TABLES[index];

        if (result.skipped) {
          skipped.push(table);
          return;
        }

        for (const row of result.rows) {
          const payment = buildPaymentApproval(row, table);

          if (payment) nextItems.push(payment);
        }
      });

      nextItems.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bTime - aTime;
      });

      setItems(nextItems);
      setSkippedTables(skipped);
    } catch (error: any) {
      console.error("Failed to load approvals:", error);
      setErrorMessage(
        error?.message || "Failed to load approvals from Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const filtered = useMemo(() => {
    let result = items;

    if (typeFilter !== "ALL") {
      result = result.filter((item) => item.type === typeFilter);
    }

    if (!searchQuery.trim()) return result;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return result.filter((item) => {
      const searchable =
        `${item.title} ${item.subtitle} ${item.type} ${item.status} ${item.table}`.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [items, searchQuery, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, items.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filtered.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, filtered.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

  const counts = useMemo(() => {
    return {
      all: items.length,
      listing: items.filter((item) => item.type === "LISTING").length,
      agent: items.filter((item) => item.type === "AGENT").length,
      owner: items.filter((item) => item.type === "OWNER").length,
      featured: items.filter((item) => item.type === "FEATURED").length,
      payment: items.filter((item) => item.type === "PAYMENT").length,
    };
  }, [items]);

  async function updateStatus(item: ApprovalItem, status: ApprovalStatus) {
    setActionId(item.id);
    setNotice("");
    setErrorMessage("");

    try {
      const payload = buildUpdatePayload(item, status);

      if (Object.keys(payload).length === 0) {
        throw new Error(
          `No editable approval/status column found on ${item.table}. Add a column like approval_status or status.`
        );
      }

      const { data, error } = await (supabase as any)
        .from(item.table)
        .update(payload)
        .eq(item.idColumn, item.recordId)
        .select("*")
        .single();

      if (error) throw error;

      setItems((prev) => prev.filter((approval) => approval.id !== item.id));

      setNotice(
        `${item.type} approval ${status.toLowerCase()} successfully.`
      );

      if (data) {
        console.log("Updated approval row:", data);
      }
    } catch (error: any) {
      console.error("Approval update failed:", error);
      setErrorMessage(
        error?.message ||
          `Failed to update ${item.type.toLowerCase()} approval.`
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
            Approvals Center
          </h1>
          <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
            Real approval queue from Supabase. Review pending listings, agents,
            owners, featured requests, and payment verification.
          </p>
        </div>

        <button
          type="button"
          onClick={loadApprovals}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {notice ? (
        <div className="flex items-start gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {skippedTables.length > 0 ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Skipped missing/unavailable table(s): {skippedTables.join(", ")}.
            This is okay if you are not using those tables.
          </span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-6">
        {[
          { label: "All", value: "ALL" as ApprovalFilter, count: counts.all },
          {
            label: "Listing",
            value: "LISTING" as ApprovalFilter,
            count: counts.listing,
          },
          {
            label: "Agent",
            value: "AGENT" as ApprovalFilter,
            count: counts.agent,
          },
          {
            label: "Owner",
            value: "OWNER" as ApprovalFilter,
            count: counts.owner,
          },
          {
            label: "Featured",
            value: "FEATURED" as ApprovalFilter,
            count: counts.featured,
          },
          {
            label: "Payment",
            value: "PAYMENT" as ApprovalFilter,
            count: counts.payment,
          },
        ].map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setTypeFilter(filter.value)}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              typeFilter === filter.value
                ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-70">
              {filter.label}
            </p>
            <p className="mt-1 text-xl font-bold">{filter.count}</p>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />
        <input
          type="text"
          placeholder="Cari approval..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500 sm:px-5">
              Loading real approvals from Supabase...
            </div>
          ) : paginated.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500 sm:px-5">
              No pending approvals found.
            </div>
          ) : (
            paginated.map((item) => (
              <div key={item.id} className="px-3.5 py-4 sm:px-5">
                <div className="flex flex-col gap-3.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${typeUI(
                          item.type
                        )}`}
                      >
                        {item.type}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${statusUI(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>

                      <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-500 sm:text-[11px]">
                        {item.table}
                      </span>
                    </div>

                    <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                      {item.title}
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Details
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                          {item.subtitle || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Date
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                          {item.date}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          ID: {item.recordId}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateStatus(item, "APPROVED")}
                      disabled={actionId === item.id}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 text-[12px] font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50 sm:text-sm"
                      type="button"
                    >
                      <CheckCircle2 size={15} />
                      <span>
                        {actionId === item.id ? "Saving..." : "Approve"}
                      </span>
                    </button>

                    <button
                      onClick={() => updateStatus(item, "REJECTED")}
                      disabled={actionId === item.id}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 sm:text-sm"
                      type="button"
                    >
                      <XCircle size={15} />
                      <span>
                        {actionId === item.id ? "Saving..." : "Reject"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
          Menampilkan {startItem}–{endItem} dari {filtered.length} approvals
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
            type="button"
          >
            Sebelumnya
          </button>

          {visiblePages.map((currentPage) => (
            <button
              key={currentPage}
              onClick={() => setPage(currentPage)}
              className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                page === currentPage
                  ? "border-black bg-black text-white"
                  : "border-gray-300 bg-white text-gray-700"
              }`}
              type="button"
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
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}