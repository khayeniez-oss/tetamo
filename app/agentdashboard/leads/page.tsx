"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MessageCircle,
  Phone,
  Search,
  UserCheck,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";

type LeadStatus = "new" | "contacted" | "viewing" | "interested" | "closed";
type ViewingStatus = "scheduled" | "rescheduled" | "done" | "no_show" | null;
type StatusFilter = "all" | LeadStatus;
type SourceFilter = "all" | "whatsapp" | "viewing" | "general";

type LeadRow = {
  id: string;
  property_id: string | null;
  property_code: string | null;
  property_title: string | null;
  source: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  sender_email: string | null;
  message: string | null;
  created_at: string | null;
  status: string | null;
  lead_type: string | null;
  viewing_date: string | null;
  viewing_time: string | null;
  viewing_status: string | null;
  receiver_user_id: string | null;
  receiver_role: string | null;
};

type PropertyRow = {
  id: string;
  kode: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  area: string | null;
  province: string | null;
};

type Lead = {
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
  status: LeadStatus;
  leadType: string;
  source: string;
  sourceType: SourceFilter;
  viewingDate: string | null;
  viewingTime: string | null;
  viewingStatus: ViewingStatus;
};

function normalizeLeadStatus(value?: string | null): LeadStatus {
  const v = (value || "").trim().toLowerCase();

  if (v === "contacted") return "contacted";
  if (v === "viewing") return "viewing";
  if (v === "interested") return "interested";
  if (v === "closed") return "closed";

  return "new";
}

function normalizeSourceType(leadType?: string | null, source?: string | null): SourceFilter {
  const combined = `${leadType || ""} ${source || ""}`.trim().toLowerCase();

  if (
    combined.includes("whatsapp") ||
    combined.includes("wa") ||
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
      label: isID ? "Dihubungi" : "Contacted",
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
    label: "Closed",
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

function buildPropertyUrl(lead: Lead) {
  if (lead.propertyId) {
    return `https://www.tetamo.com/properti/${lead.propertyId}`;
  }

  return "https://www.tetamo.com";
}

export default function AgentLeadsPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const ui = useMemo(
    () =>
      isID
        ? {
            pageTitle: "Leads",
            pageDesc:
              "Kelola semua leads buyer berdasarkan sumber, status follow-up, dan progres viewing.",
            searchPlaceholder:
              "Cari buyer, nomor, email, kode listing, lokasi, harga, atau pesan...",
            listTitle: "Daftar Leads",
            loading: "Memuat leads...",
            empty: "Belum ada leads untuk agent ini.",
            loginError: "Silakan login sebagai agent terlebih dahulu.",
            updateError: "Gagal mengubah status lead.",
            all: "Semua",
            sourceAll: "Semua Sumber",
            sourceWhatsapp: "WhatsApp",
            sourceViewing: "Request Viewing",
            sourceGeneral: "Inquiry Umum",
            new: "Baru",
            contacted: "Dihubungi",
            viewing: "Tahap Viewing",
            interested: "Tertarik",
            closed: "Closed",
            contact: "Hubungi",
            whatsapp: "WhatsApp",
            noPhone: "Nomor tidak tersedia",
            property: "Properti",
            code: "Kode",
            location: "Lokasi",
            price: "Harga",
            messageLabel: "Pesan",
            requestedSchedule: "Jadwal diminta",
            leadSource: "Sumber Lead",
            leadStage: "Tahap Lead",
            show: (start: number, end: number, total: number) =>
              `Menampilkan ${start}–${end} dari ${total} leads`,
            prev: "Sebelumnya",
            next: "Berikutnya",
            noName: "Tanpa Nama",
            noProperty: "Properti",
            message: (lead: Lead, agentName: string) =>
              `Halo ${lead.buyerName},

Saya ${agentName}, agent dari TETAMO.

Anda sebelumnya menghubungi kami terkait properti berikut:

🏠 ${lead.propertyTitle}
📍 ${lead.propertyLocation}
💰 ${lead.propertyPrice}

${buildPropertyUrl(lead)}

Jika Anda berminat, kita bisa:

1️⃣ Diskusi lebih lanjut
2️⃣ Kirim detail lengkap
3️⃣ Jadwalkan viewing

Silakan beri tahu waktu yang paling nyaman untuk Anda.`,
          }
        : {
            pageTitle: "Leads",
            pageDesc:
              "Manage buyer leads by source, follow-up status, and viewing progress.",
            searchPlaceholder:
              "Search buyer, phone, email, listing code, location, price, or message...",
            listTitle: "Lead List",
            loading: "Loading leads...",
            empty: "No leads found for this agent yet.",
            loginError: "Please log in as an agent first.",
            updateError: "Failed to update lead status.",
            all: "All",
            sourceAll: "All Sources",
            sourceWhatsapp: "WhatsApp",
            sourceViewing: "Viewing Request",
            sourceGeneral: "General Inquiry",
            new: "New",
            contacted: "Contacted",
            viewing: "Viewing Stage",
            interested: "Interested",
            closed: "Closed",
            contact: "Call",
            whatsapp: "WhatsApp",
            noPhone: "Phone number unavailable",
            property: "Property",
            code: "Code",
            location: "Location",
            price: "Price",
            messageLabel: "Message",
            requestedSchedule: "Requested schedule",
            leadSource: "Lead Source",
            leadStage: "Lead Stage",
            show: (start: number, end: number, total: number) =>
              `Showing ${start}–${end} of ${total} leads`,
            prev: "Previous",
            next: "Next",
            noName: "No Name",
            noProperty: "Property",
            message: (lead: Lead, agentName: string) =>
              `Hi ${lead.buyerName},

This is ${agentName}, an agent from TETAMO.

You previously contacted us regarding this property:

🏠 ${lead.propertyTitle}
📍 ${lead.propertyLocation}
💰 ${lead.propertyPrice}

${buildPropertyUrl(lead)}

If you are interested, we can:

1️⃣ Discuss further
2️⃣ Send full details
3️⃣ Schedule a viewing

Please let me know the most convenient time for you.`,
          },
    [isID]
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [agentName, setAgentName] = useState("TETAMO Agent");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let isMounted = true;

    async function loadLeads() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (authError || !user) {
        setLeads([]);
        setLoading(false);
        setErrorMessage(ui.loginError);
        return;
      }

      const [{ data: profileData }, { data: leadsData, error: leadsError }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("leads")
            .select(
              "id, property_id, property_code, property_title, source, sender_name, sender_phone, sender_email, message, created_at, status, lead_type, viewing_date, viewing_time, viewing_status, receiver_user_id, receiver_role"
            )
            .eq("receiver_user_id", user.id)
            .eq("receiver_role", "agent")
            .order("created_at", { ascending: false }),
        ]);

      if (!isMounted) return;

      if (profileData?.full_name) {
        setAgentName(profileData.full_name);
      }

      if (leadsError) {
        setLeads([]);
        setLoading(false);
        setErrorMessage(leadsError.message);
        return;
      }

      const leadRows = (leadsData || []) as LeadRow[];

      const propertyIds = Array.from(
        new Set(leadRows.map((lead) => lead.property_id).filter(Boolean))
      ) as string[];

      let propertyMap = new Map<string, PropertyRow>();

      if (propertyIds.length > 0) {
        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("id, kode, title, price, city, area, province")
          .in("id", propertyIds);

        if (!isMounted) return;

        if (propertyError) {
          setLeads([]);
          setLoading(false);
          setErrorMessage(propertyError.message);
          return;
        }

        propertyMap = new Map(
          ((propertyData || []) as PropertyRow[]).map((item) => [
            item.id,
            item,
          ])
        );
      }

      const mapped: Lead[] = leadRows.map((lead) => {
        const property = lead.property_id
          ? propertyMap.get(lead.property_id)
          : null;

        const sourceType = normalizeSourceType(lead.lead_type, lead.source);
        const viewingStatus = normalizeViewingStatus(
          lead.viewing_status,
          sourceType
        );

        return {
          id: lead.id,
          propertyId: lead.property_id,
          listingKode: property?.kode || lead.property_code || "-",
          propertyTitle: property?.title || lead.property_title || ui.noProperty,
          propertyPrice: formatCurrency(property?.price || 0),
          propertyLocation: buildPropertyLocation(property),
          buyerName: lead.sender_name || ui.noName,
          buyerPhone: lead.sender_phone || "-",
          buyerEmail: lead.sender_email || "-",
          message: lead.message || "-",
          createdAt: formatDate(lead.created_at, lang),
          status: normalizeLeadStatus(lead.status),
          leadType: lead.lead_type || "lead",
          source: lead.source || "-",
          sourceType,
          viewingDate: lead.viewing_date,
          viewingTime: lead.viewing_time,
          viewingStatus,
        };
      });

      setLeads(mapped);
      setLoading(false);
    }

    loadLeads();

    return () => {
      isMounted = false;
    };
  }, [lang, ui.loginError, ui.noName, ui.noProperty]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sourceFilter]);

  async function updateLead(
    id: string,
    payload: Partial<{
      status: LeadStatus;
      viewing_status: "scheduled" | "rescheduled" | "done" | "no_show" | null;
    }>
  ) {
    setUpdatingId(id);

    const { error } = await supabase.from("leads").update(payload).eq("id", id);

    if (error) {
      setUpdatingId(null);
      alert(error.message || ui.updateError);
      return false;
    }

    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== id) return lead;

        return {
          ...lead,
          status: (payload.status ?? lead.status) as LeadStatus,
          viewingStatus:
            payload.viewing_status === undefined
              ? lead.viewingStatus
              : normalizeViewingStatus(payload.viewing_status, lead.sourceType),
        };
      })
    );

    setUpdatingId(null);
    return true;
  }

  async function updateLeadStatus(id: string, nextStatus: LeadStatus) {
    const target = leads.find((lead) => lead.id === id);
    if (!target) return;

    const payload: Partial<{
      status: LeadStatus;
      viewing_status: "scheduled" | "rescheduled" | "done" | "no_show" | null;
    }> = {
      status: nextStatus,
    };

    if (
      target.sourceType === "viewing" &&
      nextStatus === "viewing" &&
      !target.viewingStatus
    ) {
      payload.viewing_status = "scheduled";
    }

    await updateLead(id, payload);
  }

  async function markAsContacted(id: string) {
    const target = leads.find((lead) => lead.id === id);
    if (!target) return;
    if (target.status !== "new") return;

    await updateLead(id, { status: "contacted" });
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
      `.toLowerCase();

      const matchesSearch = !q || searchable.includes(q);

      return matchesStatus && matchesSource && matchesSearch;
    });
  }, [leads, search, statusFilter, sourceFilter]);

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

  const statusOptions: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: ui.all },
    { key: "new", label: ui.new },
    { key: "contacted", label: ui.contacted },
    { key: "viewing", label: ui.viewing },
    { key: "interested", label: ui.interested },
    { key: "closed", label: ui.closed },
  ];

  const sourceOptions: Array<{ key: SourceFilter; label: string }> = [
    { key: "all", label: ui.sourceAll },
    { key: "whatsapp", label: ui.sourceWhatsapp },
    { key: "viewing", label: ui.sourceViewing },
    { key: "general", label: ui.sourceGeneral },
  ];

  return (
    <div className="min-w-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
          {ui.pageTitle}
        </h1>
        <p className="mt-1 text-sm leading-6 text-gray-500">{ui.pageDesc}</p>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ui.searchPlaceholder}
            className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              {ui.leadSource}
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
              {ui.leadStage}
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

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
            {ui.listTitle}
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">{ui.loading}</div>
        ) : paginatedLeads.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">{ui.empty}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedLeads.map((lead) => {
              const sourceBadge = sourceTypeUI(lead.sourceType, lang);
              const leadBadge = leadStatusUI(lead.status, lang);
              const appointmentBadge =
                lead.sourceType === "viewing"
                  ? viewingStatusUI(lead.viewingStatus, lang)
                  : null;

              const whatsappPhone = normalizePhoneForWhatsapp(lead.buyerPhone);
              const callPhone = normalizePhoneForCall(lead.buyerPhone);

              const whatsappLink = whatsappPhone
                ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                    ui.message(lead, agentName)
                  )}`
                : "";

              const isUpdating = updatingId === lead.id;

              return (
                <div key={lead.id} className="p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between xl:gap-6">
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

                        <div className="text-xs text-gray-500">
                          {lead.createdAt}
                        </div>
                      </div>

                      <p className="mt-3 text-base font-semibold text-[#1C1C1E]">
                        {lead.buyerName}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {lead.buyerPhone}
                      </p>

                      {lead.buyerEmail !== "-" ? (
                        <p className="break-all text-sm text-gray-500">
                          {lead.buyerEmail}
                        </p>
                      ) : null}

                      <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                          {ui.messageLabel}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-700">
                          {lead.message}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-xs leading-5 text-gray-500 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-white p-3">
                          <p>
                            {ui.property}:{" "}
                            <span className="font-medium text-gray-700">
                              {lead.propertyTitle}
                            </span>
                          </p>
                          <p>
                            {ui.code}:{" "}
                            <span className="font-medium text-gray-700">
                              {lead.listingKode}
                            </span>
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white p-3">
                          <p>
                            {ui.location}:{" "}
                            <span className="font-medium text-gray-700">
                              {lead.propertyLocation}
                            </span>
                          </p>
                          <p>
                            {ui.price}:{" "}
                            <span className="font-medium text-gray-700">
                              {lead.propertyPrice}
                            </span>
                          </p>
                        </div>
                      </div>

                      {lead.sourceType === "viewing" ? (
                        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                          {ui.requestedSchedule}:{" "}
                          {formatDate(lead.viewingDate, lang)} •{" "}
                          {formatTime(lead.viewingTime)}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {lead.status !== "viewing" ? (
                          <button
                            type="button"
                            onClick={() => updateLeadStatus(lead.id, "viewing")}
                            disabled={isUpdating}
                            className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                          >
                            {ui.viewing}
                          </button>
                        ) : null}

                        {lead.status !== "interested" ? (
                          <button
                            type="button"
                            onClick={() =>
                              updateLeadStatus(lead.id, "interested")
                            }
                            disabled={isUpdating}
                            className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            {ui.interested}
                          </button>
                        ) : null}

                        {lead.status !== "closed" ? (
                          <button
                            type="button"
                            onClick={() => updateLeadStatus(lead.id, "closed")}
                            disabled={isUpdating}
                            className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                          >
                            {ui.closed}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-2 xl:w-auto xl:min-w-[230px]">
                      {callPhone ? (
                        <a
                          href={`tel:${callPhone}`}
                          onClick={() => {
                            void markAsContacted(lead.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Phone className="h-4 w-4" />
                          {ui.contact}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={ui.noPhone}
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-400"
                        >
                          <Phone className="h-4 w-4" />
                          {ui.contact}
                        </button>
                      )}

                      {whatsappLink ? (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            void markAsContacted(lead.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm text-white hover:opacity-90"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {ui.whatsapp}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={ui.noPhone}
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-200 px-4 py-2.5 text-sm text-gray-400"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {ui.whatsapp}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredLeads.length > 0 ? (
          <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 sm:px-6">
            <p className="text-sm text-gray-500">
              {ui.show(startItem, endItem, filteredLeads.length)}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ui.prev}
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
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
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage === totalPages}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ui.next}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}