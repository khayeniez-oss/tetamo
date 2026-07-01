"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useOwnerProfile } from "../layout";
import { useLanguage } from "@/app/context/LanguageContext";

type LeadStatus = "new" | "contacted" | "viewing" | "interested" | "closed";
type ViewingStatus = "scheduled" | "rescheduled" | "done" | "no_show" | null;
type StatusFilter = "all" | LeadStatus;
type SourceFilter = "all" | "whatsapp" | "viewing" | "general";

type DbLead = {
  id: string;
  property_id: string | null;
  property_code: string | null;
  property_title: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  receiver_user_id: string | null;
  receiver_name: string | null;
  receiver_role: string | null;
  lead_type: string | null;
  source: string | null;
  message: string | null;
  viewing_date: string | null;
  viewing_time: string | null;
  viewing_status: string | null;
  status: string | null;
  priority: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PropertyRow = {
  id: string;
  kode: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  area: string | null;
  province: string | null;
  contact_user_id?: string | null;
  user_id?: string | null;
  created_by_user_id?: string | null;
  contact_role?: string | null;
  source?: string | null;
};

type OwnerLead = {
  id: string;
  propertyId: string | null;
  listingKode: string;
  propertyTitle: string;
  propertyPrice: string;
  propertyLocation: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  message: string;
  createdAt: string;
  rawCreatedAt: string | null;
  status: LeadStatus;
  leadType: string;
  source: string;
  sourceType: SourceFilter;
  viewingDate: string | null;
  viewingTime: string | null;
  viewingStatus: ViewingStatus;
  priority: string;
  notes: string;
  receiverRole: string;
  matchedBy: "direct" | "property";
};

const ITEMS_PER_PAGE = 12;
const LEADS_PAGE_SIZE = 1000;
const LEADS_MAX_ROWS = 20000;

const LEADS_SELECT =
  "id, property_id, property_code, property_title, sender_name, sender_email, sender_phone, receiver_user_id, receiver_name, receiver_role, lead_type, source, message, viewing_date, viewing_time, viewing_status, status, priority, notes, created_at, updated_at";

const PROPERTIES_SELECT =
  "id, kode, title, price, city, area, province, contact_user_id, user_id, created_by_user_id, contact_role, source";

function normalizeLeadStatus(value?: string | null): LeadStatus {
  const v = (value || "").trim().toLowerCase();

  if (v === "contacted") return "contacted";
  if (v === "viewing" || v === "scheduled") return "viewing";
  if (v === "interested") return "interested";
  if (v === "closed" || v === "completed" || v === "done") return "closed";

  return "new";
}

function normalizeSourceType(
  leadType?: string | null,
  source?: string | null
): SourceFilter {
  const combined = `${leadType || ""} ${source || ""}`.trim().toLowerCase();

  if (
    combined.includes("whatsapp") ||
    combined.includes("wa.me") ||
    combined.includes("chat")
  ) {
    return "whatsapp";
  }

  if (
    combined.includes("viewing") ||
    combined.includes("schedule") ||
    combined.includes("appointment")
  ) {
    return "viewing";
  }

  return "general";
}

function normalizeViewingStatus(
  value: string | null | undefined,
  sourceType: SourceFilter
): ViewingStatus {
  const v = (value || "").trim().toLowerCase();

  if (v === "scheduled") return "scheduled";
  if (v === "rescheduled") return "rescheduled";
  if (v === "done") return "done";
  if (v === "no_show") return "no_show";

  if (sourceType === "viewing") return "scheduled";

  return null;
}

function sourceTypeUI(source: SourceFilter, lang: string) {
  const isID = lang === "id";

  if (source === "whatsapp") {
    return {
      label: isID ? "Lead WhatsApp" : "WhatsApp Lead",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (source === "viewing") {
    return {
      label: isID ? "Request Viewing" : "Viewing Request",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  return {
    label: isID ? "Inquiry Umum" : "General Inquiry",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  };
}

function leadStatusUI(status: LeadStatus, lang: string) {
  const isID = lang === "id";

  if (status === "new") {
    return {
      label: isID ? "Baru" : "New",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "contacted") {
    return {
      label: isID ? "Sudah Dihubungi" : "Contacted",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  if (status === "viewing") {
    return {
      label: isID ? "Tahap Viewing" : "Viewing Stage",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "interested") {
    return {
      label: isID ? "Tertarik" : "Interested",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: isID ? "Ditutup" : "Closed",
    badgeClass: "bg-black text-white border-black",
  };
}

function viewingStatusUI(status: ViewingStatus, lang: string) {
  const isID = lang === "id";

  if (status === "scheduled") {
    return {
      label: isID ? "Terjadwal" : "Scheduled",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "rescheduled") {
    return {
      label: isID ? "Dijadwalkan Ulang" : "Rescheduled",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "done") {
    return {
      label: isID ? "Jadwal Selesai" : "Appointment Done",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "no_show") {
    return {
      label: isID ? "Tidak Hadir" : "No Show",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return null;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function parseLocalDate(value?: string | null) {
  if (!value) return null;

  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatDate(value: string | null | undefined, lang: string) {
  if (!value) return "-";

  const parsed = parseLocalDate(value) || new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function normalizePhoneForWhatsapp(phone?: string | null) {
  if (!phone) return "";

  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

function normalizePhoneForCall(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/[^\d+]/g, "");
}

function buildPropertyLocation(row?: PropertyRow | null) {
  if (!row) return "-";

  const parts = [row.area, row.city, row.province].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

function buildPropertyUrl(lead: OwnerLead) {
  if (lead.propertyId) {
    return `https://www.tetamo.com/properti/${lead.propertyId}`;
  }

  return "https://www.tetamo.com";
}

function visiblePageNumbers(current: number, total: number) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function fetchLeadRowsByReceiver(userId: string) {
  const rows: DbLead[] = [];

  for (let from = 0; from < LEADS_MAX_ROWS; from += LEADS_PAGE_SIZE) {
    const to = from + LEADS_PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("leads")
      .select(LEADS_SELECT)
      .eq("receiver_user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const batch = (data || []) as DbLead[];
    rows.push(...batch);

    if (batch.length < LEADS_PAGE_SIZE) break;
  }

  return rows;
}

async function fetchLeadRowsByPropertyIds(propertyIds: string[]) {
  const uniqueIds = Array.from(new Set(propertyIds.filter(Boolean)));

  if (uniqueIds.length === 0) return [];

  const rows: DbLead[] = [];
  const chunks = chunkArray(uniqueIds, 80);

  for (const chunk of chunks) {
    for (let from = 0; from < LEADS_MAX_ROWS; from += LEADS_PAGE_SIZE) {
      const to = from + LEADS_PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("leads")
        .select(LEADS_SELECT)
        .in("property_id", chunk)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const batch = (data || []) as DbLead[];
      rows.push(...batch);

      if (batch.length < LEADS_PAGE_SIZE) break;
    }
  }

  return rows;
}

async function fetchOwnerProperties(userId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select(PROPERTIES_SELECT)
    .or(
      `contact_user_id.eq.${userId},user_id.eq.${userId},created_by_user_id.eq.${userId}`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as PropertyRow[];
}

async function fetchPropertiesByIds(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

  if (uniqueIds.length === 0) return [];

  const rows: PropertyRow[] = [];

  for (const chunk of chunkArray(uniqueIds, 80)) {
    const { data, error } = await supabase
      .from("properties")
      .select(PROPERTIES_SELECT)
      .in("id", chunk);

    if (error) throw error;

    rows.push(...((data || []) as PropertyRow[]));
  }

  return rows;
}

function isProbablyOwnerLead(row: DbLead, ownerPropertyIds: Set<string>) {
  const role = String(row.receiver_role || "").toLowerCase();
  const propertyId = row.property_id || "";

  if (ownerPropertyIds.has(propertyId)) return true;
  if (role === "owner" || role === "pemilik") return true;
  if (!role && propertyId && ownerPropertyIds.has(propertyId)) return true;

  return false;
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
        {title}
      </p>
      <p className="mt-1.5 text-lg font-bold text-[#1C1C1E] sm:text-xl">
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

export default function PemilikLeadsPage() {
  const { userId, loadingProfile } = useOwnerProfile();
  const { lang } = useLanguage();
  const isID = lang === "id";

  const t = useMemo(
    () => ({
      pageTitle: "Leads",
      pageSubtitle: isID
        ? "Semua orang yang tertarik dengan properti Anda dari WhatsApp, homepage, marketplace, detail properti, dan request viewing."
        : "All people interested in your properties from WhatsApp, homepage, marketplace, property detail, and viewing requests.",
      listTitle: isID ? "Daftar Leads" : "Lead List",
      loadingLeads: isID ? "Memuat leads..." : "Loading leads...",
      failedToLoad: isID ? "Gagal memuat leads:" : "Failed to load leads:",
      emptyLeads: isID
        ? "Belum ada leads untuk akun ini."
        : "There are no leads for this account yet.",
      noName: isID ? "Tanpa Nama" : "No Name",
      noProperty: isID ? "Properti" : "Property",
      viewingSchedule: isID ? "Jadwal viewing" : "Viewing schedule",
      notes: isID ? "Catatan" : "Notes",
      priority: isID ? "Prioritas" : "Priority",
      loading: "Loading...",
      contact: isID ? "Hubungi" : "Call",
      whatsapp: "WhatsApp",
      updateLeadFailed: isID
        ? "Gagal update status lead."
        : "Failed to update lead status.",
      phoneUnavailable: isID
        ? "Nomor telepon tidak tersedia."
        : "Phone number is not available.",
      whatsappUnavailable: isID
        ? "Nomor WhatsApp tidak tersedia."
        : "WhatsApp number is not available.",
      refresh: "Refresh",
      leadSource: isID ? "Sumber Lead" : "Lead Source",
      leadStage: isID ? "Tahap Lead" : "Lead Stage",
      all: isID ? "Semua" : "All",
      sourceAll: isID ? "Semua Sumber" : "All Sources",
      sourceWhatsapp: "WhatsApp",
      sourceViewing: isID ? "Request Viewing" : "Viewing Request",
      sourceGeneral: isID ? "Inquiry Umum" : "General Inquiry",
      new: isID ? "Baru" : "New",
      contacted: isID ? "Sudah Dihubungi" : "Contacted",
      viewing: isID ? "Tahap Viewing" : "Viewing Stage",
      interested: isID ? "Tertarik" : "Interested",
      closed: isID ? "Ditutup" : "Closed",
      searchPlaceholder: isID
        ? "Cari nama, nomor, email, kode listing, properti, lokasi, atau pesan..."
        : "Search name, phone, email, listing code, property, location, or message...",
      property: isID ? "Properti" : "Property",
      code: isID ? "Kode" : "Code",
      location: isID ? "Lokasi" : "Location",
      price: isID ? "Harga" : "Price",
      messageLabel: isID ? "Pesan" : "Message",
      show: (start: number, end: number, total: number) =>
        isID
          ? `Menampilkan ${start}–${end} dari ${total} leads`
          : `Showing ${start}–${end} of ${total} leads`,
      prev: isID ? "Sebelumnya" : "Previous",
      next: isID ? "Berikutnya" : "Next",
      whatsappMessage: (lead: OwnerLead) =>
        isID
          ? `Halo ${lead.buyerName},

Saya pemilik properti ini dari TETAMO.

Anda sebelumnya tertarik pada properti kami:

🏠 ${lead.propertyTitle}
📍 ${lead.propertyLocation}
💰 ${lead.propertyPrice}

${buildPropertyUrl(lead)}

Apakah Anda masih berminat?`
          : `Hello ${lead.buyerName},

I am the owner of this property from TETAMO.

You were previously interested in our property:

🏠 ${lead.propertyTitle}
📍 ${lead.propertyLocation}
💰 ${lead.propertyPrice}

${buildPropertyUrl(lead)}

Are you still interested?`,
    }),
    [isID]
  );

  const [leads, setLeads] = useState<OwnerLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [ownerPropertyCount, setOwnerPropertyCount] = useState(0);
  const [directLeadCount, setDirectLeadCount] = useState(0);
  const [propertyMatchedLeadCount, setPropertyMatchedLeadCount] = useState(0);

  const loadLeads = useCallback(async () => {
    if (!userId) {
      setLeads([]);
      setLoadingLeads(false);
      return;
    }

    setLoadingLeads(true);
    setErrorMessage("");

    try {
      const ownerProperties = await fetchOwnerProperties(userId);
      setOwnerPropertyCount(ownerProperties.length);

      const ownerPropertyIds = new Set(ownerProperties.map((item) => item.id));

      const [directRows, propertyRows] = await Promise.all([
        fetchLeadRowsByReceiver(userId),
        fetchLeadRowsByPropertyIds(Array.from(ownerPropertyIds)),
      ]);

      setDirectLeadCount(directRows.length);
      setPropertyMatchedLeadCount(propertyRows.length);

      const mergedMap = new Map<
        string,
        { row: DbLead; matchedBy: "direct" | "property" }
      >();

      for (const row of propertyRows) {
        if (!isProbablyOwnerLead(row, ownerPropertyIds)) continue;
        mergedMap.set(row.id, { row, matchedBy: "property" });
      }

      for (const row of directRows) {
        if (!isProbablyOwnerLead(row, ownerPropertyIds)) continue;
        mergedMap.set(row.id, { row, matchedBy: "direct" });
      }

      const mergedRows = Array.from(mergedMap.values());

      const allPropertyIds = Array.from(
        new Set(
          mergedRows
            .map((item) => item.row.property_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      const missingPropertyIds = allPropertyIds.filter(
        (propertyId) => !ownerPropertyIds.has(propertyId)
      );

      const extraProperties = await fetchPropertiesByIds(missingPropertyIds);

      const propertyMap = new Map<string, PropertyRow>();

      for (const property of ownerProperties) {
        propertyMap.set(property.id, property);
      }

      for (const property of extraProperties) {
        propertyMap.set(property.id, property);
      }

      const mapped: OwnerLead[] = mergedRows
        .map(({ row, matchedBy }) => {
          const property = row.property_id
            ? propertyMap.get(row.property_id)
            : null;

          const sourceType = normalizeSourceType(row.lead_type, row.source);
          const viewingStatus = normalizeViewingStatus(
            row.viewing_status,
            sourceType
          );

          return {
            id: row.id,
            propertyId: row.property_id,
            listingKode: property?.kode || row.property_code || "-",
            propertyTitle:
              property?.title || row.property_title || t.noProperty,
            propertyPrice: formatCurrency(property?.price || 0),
            propertyLocation: buildPropertyLocation(property),
            buyerName: row.sender_name || t.noName,
            buyerPhone: row.sender_phone || "-",
            buyerEmail: row.sender_email || "-",
            message: row.message || "-",
            createdAt: formatDate(row.created_at, lang),
            rawCreatedAt: row.created_at,
            status: normalizeLeadStatus(row.status),
            leadType: row.lead_type || "lead",
            source: row.source || "-",
            sourceType,
            viewingDate: row.viewing_date,
            viewingTime: row.viewing_time,
            viewingStatus,
            priority: row.priority || "-",
            notes: row.notes || "",
            receiverRole: row.receiver_role || "-",
            matchedBy,
          };
        })
        .sort((a, b) => {
          const aTime = a.rawCreatedAt ? new Date(a.rawCreatedAt).getTime() : 0;
          const bTime = b.rawCreatedAt ? new Date(b.rawCreatedAt).getTime() : 0;

          return bTime - aTime;
        });

      setLeads(mapped);
    } catch (error: any) {
      console.error("Failed to load owner leads:", error);
      setLeads([]);
      setErrorMessage(error?.message || t.updateLeadFailed);
    } finally {
      setLoadingLeads(false);
    }
  }, [userId, lang, t.noName, t.noProperty, t.updateLeadFailed]);

  useEffect(() => {
    if (!loadingProfile) {
      loadLeads();
    }
  }, [loadingProfile, loadLeads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sourceFilter]);

  async function updateLeadStatus(
    leadId: string,
    nextStatus: LeadStatus,
    nextViewingStatus?: ViewingStatus
  ) {
    setUpdatingLeadId(leadId);

    const payload: Record<string, any> = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };

    if (nextViewingStatus !== undefined) {
      payload.viewing_status = nextViewingStatus;
    }

    const { error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", leadId);

    if (error) {
      setUpdatingLeadId(null);
      alert(error.message || t.updateLeadFailed);
      return false;
    }

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              status: nextStatus,
              viewingStatus:
                nextViewingStatus === undefined
                  ? lead.viewingStatus
                  : nextViewingStatus,
            }
          : lead
      )
    );

    setUpdatingLeadId(null);
    return true;
  }

  async function markLeadAsContacted(lead: OwnerLead) {
    if (lead.status !== "new") return true;
    return updateLeadStatus(lead.id, "contacted");
  }

  async function handleCall(lead: OwnerLead) {
    const phone = normalizePhoneForCall(lead.buyerPhone);

    if (!phone) {
      alert(t.phoneUnavailable);
      return;
    }

    const ok = await markLeadAsContacted(lead);
    if (!ok) return;

    window.location.href = `tel:${phone}`;
  }

  async function handleWhatsApp(lead: OwnerLead) {
    const normalizedPhone = normalizePhoneForWhatsapp(lead.buyerPhone);

    if (!normalizedPhone) {
      alert(t.whatsappUnavailable);
      return;
    }

    const message = encodeURIComponent(t.whatsappMessage(lead));

    const ok = await markLeadAsContacted(lead);
    if (!ok) return;

    window.location.href = `https://wa.me/${normalizedPhone}?text=${message}`;
  }

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" || lead.status === statusFilter;

      const matchesSource =
        sourceFilter === "all" || lead.sourceType === sourceFilter;

      const searchable = `
        ${lead.buyerName}
        ${lead.buyerPhone}
        ${lead.buyerEmail}
        ${lead.message}
        ${lead.propertyTitle}
        ${lead.propertyLocation}
        ${lead.listingKode}
        ${lead.propertyPrice}
        ${lead.leadType}
        ${lead.source}
        ${lead.sourceType}
        ${lead.status}
        ${lead.viewingStatus || ""}
        ${lead.receiverRole}
        ${lead.matchedBy}
      `.toLowerCase();

      const matchesSearch = !q || searchable.includes(q);

      return matchesStatus && matchesSource && matchesSearch;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      whatsapp: leads.filter((lead) => lead.sourceType === "whatsapp").length,
      viewing: leads.filter((lead) => lead.sourceType === "viewing").length,
      newCount: leads.filter((lead) => lead.status === "new").length,
      interested: leads.filter((lead) => lead.status === "interested").length,
      closed: leads.filter((lead) => lead.status === "closed").length,
    };
  }, [leads]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLeads.length / ITEMS_PER_PAGE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedLeads = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredLeads.slice(start, end);
  }, [filteredLeads, safePage]);

  const startItem =
    filteredLeads.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredLeads.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(safePage, totalPages),
    [safePage, totalPages]
  );

  const isLoading = loadingProfile || loadingLeads;

  const statusOptions: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: t.all },
    { key: "new", label: t.new },
    { key: "contacted", label: t.contacted },
    { key: "viewing", label: t.viewing },
    { key: "interested", label: t.interested },
    { key: "closed", label: t.closed },
  ];

  const sourceOptions: Array<{ key: SourceFilter; label: string }> = [
    { key: "all", label: t.sourceAll },
    { key: "whatsapp", label: t.sourceWhatsapp },
    { key: "viewing", label: t.sourceViewing },
    { key: "general", label: t.sourceGeneral },
  ];

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1E]">{t.pageTitle}</h1>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            {t.pageSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={loadLeads}
          disabled={isLoading || !userId}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {t.refresh}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Total" value={stats.total} />
        <SummaryCard title="WhatsApp" value={stats.whatsapp} />
        <SummaryCard title="Viewing" value={stats.viewing} />
        <SummaryCard title={t.new} value={stats.newCount} />
        <SummaryCard title={t.interested} value={stats.interested} />
        <SummaryCard title={t.closed} value={stats.closed} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <SummaryCard
          title="Owner Properties"
          value={ownerPropertyCount}
          caption="Properties matched to this owner."
        />
        <SummaryCard
          title="Direct Leads"
          value={directLeadCount}
          caption="receiver_user_id matched owner login."
        />
        <SummaryCard
          title="Property Leads"
          value={propertyMatchedLeadCount}
          caption="Leads attached to this owner’s properties."
        />
      </div>

      {errorMessage ? (
        <div className="mb-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {t.failedToLoad} {errorMessage}
          </span>
        </div>
      ) : null}

      <div className="mb-6 space-y-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              {t.leadSource}
            </p>

            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSourceFilter(item.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    sourceFilter === item.key
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              {t.leadStage}
            </p>

            <div className="flex flex-wrap gap-2">
              {statusOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    statusFilter === item.key
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-[#1C1C1E]">{t.listTitle}</h2>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">
            {t.loadingLeads}
          </div>
        ) : paginatedLeads.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">
            {t.emptyLeads}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedLeads.map((lead) => {
              const sourceBadge = sourceTypeUI(lead.sourceType, lang);
              const leadBadge = leadStatusUI(lead.status, lang);
              const appointmentBadge =
                lead.sourceType === "viewing"
                  ? viewingStatusUI(lead.viewingStatus, lang)
                  : null;

              const isUpdating = updatingLeadId === lead.id;
              const hasPhone =
                Boolean(normalizePhoneForCall(lead.buyerPhone)) ||
                Boolean(normalizePhoneForWhatsapp(lead.buyerPhone));

              return (
                <div
                  key={lead.id}
                  className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${sourceBadge.badgeClass}`}
                      >
                        {lead.sourceType === "whatsapp" ? (
                          <MessageCircle className="h-3.5 w-3.5" />
                        ) : lead.sourceType === "viewing" ? (
                          <CalendarDays className="h-3.5 w-3.5" />
                        ) : (
                          <UserCheck className="h-3.5 w-3.5" />
                        )}
                        {sourceBadge.label}
                      </span>

                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${leadBadge.badgeClass}`}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        {leadBadge.label}
                      </span>

                      {appointmentBadge ? (
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${appointmentBadge.badgeClass}`}
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          {appointmentBadge.label}
                        </span>
                      ) : null}

                      <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500">
                        {lead.matchedBy === "direct"
                          ? "Direct"
                          : "Property Match"}
                      </span>

                      <div className="text-xs text-gray-500">
                        {lead.createdAt}
                      </div>
                    </div>

                    <p className="mt-3 break-words text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {lead.buyerName}
                    </p>

                    <p className="text-sm text-gray-500">{lead.buyerPhone}</p>

                    {lead.buyerEmail !== "-" ? (
                      <p className="break-words text-sm text-gray-500">
                        {lead.buyerEmail}
                      </p>
                    ) : null}

                    <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        {t.messageLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {lead.message}
                      </p>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-xs leading-5 text-gray-500 sm:grid-cols-2">
                      <div className="rounded-2xl border border-gray-100 bg-white p-3">
                        <p>
                          {t.property}:{" "}
                          <span className="font-medium text-gray-700">
                            {lead.propertyTitle}
                          </span>
                        </p>
                        <p>
                          {t.code}:{" "}
                          <span className="font-medium text-gray-700">
                            {lead.listingKode}
                          </span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-white p-3">
                        <p>
                          {t.location}:{" "}
                          <span className="font-medium text-gray-700">
                            {lead.propertyLocation}
                          </span>
                        </p>
                        <p>
                          {t.price}:{" "}
                          <span className="font-medium text-gray-700">
                            {lead.propertyPrice}
                          </span>
                        </p>
                      </div>
                    </div>

                    {lead.sourceType === "viewing" ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                        {t.viewingSchedule}: {formatDate(lead.viewingDate, lang)}{" "}
                        • {formatTime(lead.viewingTime)}
                      </div>
                    ) : null}

                    {lead.notes ? (
                      <div className="mt-2 text-xs leading-5 text-gray-500">
                        {t.notes}: {lead.notes}
                      </div>
                    ) : null}

                    {lead.priority && lead.priority !== "-" ? (
                      <div className="mt-1 text-xs leading-5 text-gray-500">
                        {t.priority}: {lead.priority}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {lead.status !== "viewing" ? (
                        <button
                          type="button"
                          onClick={() =>
                            updateLeadStatus(
                              lead.id,
                              "viewing",
                              lead.viewingStatus || "scheduled"
                            )
                          }
                          disabled={isUpdating}
                          className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                        >
                          {t.viewing}
                        </button>
                      ) : null}

                      {lead.status !== "interested" ? (
                        <button
                          type="button"
                          onClick={() => updateLeadStatus(lead.id, "interested")}
                          disabled={isUpdating}
                          className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          {t.interested}
                        </button>
                      ) : null}

                      {lead.status !== "closed" ? (
                        <button
                          type="button"
                          onClick={() => updateLeadStatus(lead.id, "closed")}
                          disabled={isUpdating}
                          className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          {t.closed}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      onClick={() => handleCall(lead)}
                      disabled={isUpdating || !hasPhone}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Phone className="h-4 w-4" />
                      {isUpdating ? t.loading : t.contact}
                    </button>

                    <button
                      onClick={() => handleWhatsApp(lead)}
                      disabled={isUpdating || !hasPhone}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {isUpdating ? t.loading : t.whatsapp}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredLeads.length > 0 ? (
          <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 sm:px-6">
            <p className="text-sm text-gray-500">
              {t.show(startItem, endItem, filteredLeads.length)}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={safePage === 1}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.prev}
              </button>

              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm",
                    safePage === page
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 text-[#1C1C1E] hover:bg-gray-50",
                  ].join(" ")}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={safePage === totalPages}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t.next}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}