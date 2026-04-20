"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { supabase } from "@/lib/supabase";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageCircle,
  Phone,
  RotateCcw,
  Search,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

type ViewingStatus = "scheduled" | "rescheduled" | "done" | "no_show";
type LeadDbStatus = "new" | "contacted" | "viewing" | "interested" | "closed";
type FilterStatus = "all" | ViewingStatus;

type LeadRow = {
  id: string;
  property_id: string | null;
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
  city: string | null;
  area: string | null;
  province: string | null;
};

type Viewing = {
  id: string;
  propertyId: string;
  listingKode: string;
  propertyTitle: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  viewingDate: string;
  viewingTime: string;
  viewingDateRaw: string | null;
  viewingTimeRaw: string | null;
  location: string;
  status: ViewingStatus;
  dbStatus: LeadDbStatus;
};

function normalizeLeadDbStatus(value?: string | null): LeadDbStatus {
  const v = (value || "").trim().toLowerCase();

  if (v === "contacted") return "contacted";
  if (v === "viewing") return "viewing";
  if (v === "interested") return "interested";
  if (v === "closed") return "closed";

  return "new";
}

function normalizeViewingStatus(value?: string | null): ViewingStatus {
  const v = (value || "").trim().toLowerCase();

  if (v === "rescheduled") return "rescheduled";
  if (v === "done") return "done";
  if (v === "no_show") return "no_show";

  return "scheduled";
}

function viewingStatusUI(status: ViewingStatus, lang: string) {
  const isID = lang === "id";

  if (status === "scheduled") {
    return {
      label: isID ? "Terjadwal" : "Scheduled",
      description: isID
        ? "Viewing sudah masuk jadwal dan menunggu konfirmasi/kunjungan."
        : "Viewing is scheduled and waiting for confirmation or visit.",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "rescheduled") {
    return {
      label: isID ? "Dijadwalkan Ulang" : "Rescheduled",
      description: isID
        ? "Tanggal atau jam viewing sudah diubah oleh agent."
        : "Viewing date or time has been changed by the agent.",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "done") {
    return {
      label: isID ? "Selesai" : "Done",
      description: isID
        ? "Viewing sudah dilakukan."
        : "Viewing has been completed.",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: isID ? "Tidak Hadir" : "No Show",
    description: isID
      ? "Calon buyer tidak hadir pada jadwal viewing."
      : "The buyer did not attend the scheduled viewing.",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  };
}

function leadStatusUI(status: LeadDbStatus, lang: string) {
  const isID = lang === "id";

  if (status === "new") {
    return {
      label: isID ? "Lead Baru" : "New Lead",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
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
      label: "Viewing",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "interested") {
    return {
      label: isID ? "Tertarik" : "Interested",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: isID ? "Closed" : "Closed",
    badgeClass: "bg-black text-white border-black",
  };
}

function StatCard({
  title,
  value,
  Icon,
}: {
  title: string;
  value: string | number;
  Icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 sm:text-sm">{title}</p>
          <p className="mt-2 text-2xl font-semibold leading-none text-[#1C1C1E] sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-11 sm:w-11">
          <Icon className="h-5 w-5 text-[#1C1C1E]" />
        </div>
      </div>
    </div>
  );
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

  const date = parseLocalDate(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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

function buildLocation(property?: PropertyRow | null) {
  if (!property) return "-";

  return (
    [property.area, property.city, property.province].filter(Boolean).join(", ") ||
    "-"
  );
}

function getSortTime(item: Viewing) {
  if (!item.viewingDateRaw) return 0;

  const date = new Date(`${item.viewingDateRaw}T${item.viewingTimeRaw || "00:00"}`);
  const time = date.getTime();

  return Number.isNaN(time) ? 0 : time;
}

function sortViewingItems(items: Viewing[]) {
  return [...items].sort((a, b) => {
    const aDate = getSortTime(a);
    const bDate = getSortTime(b);

    if (aDate === bDate) return b.id.localeCompare(a.id);
    if (aDate === 0) return 1;
    if (bDate === 0) return -1;

    return aDate - bDate;
  });
}

function buildPropertyUrl(viewing: Viewing) {
  if (viewing.propertyId) {
    return `https://www.tetamo.com/properti/${viewing.propertyId}`;
  }

  return "https://www.tetamo.com";
}

export default function AgentJadwalViewingPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const ui = useMemo(
    () =>
      isID
        ? {
            pageTitle: "Jadwal Viewing",
            pageDesc:
              "Kelola jadwal kunjungan properti, hubungi calon buyer, dan update status viewing.",
            errorLogin: "Silakan login sebagai agent terlebih dahulu.",
            loading: "Memuat jadwal viewing...",
            empty: "Belum ada jadwal viewing untuk agent ini.",
            statsScheduled: "Terjadwal",
            statsRescheduled: "Dijadwalkan Ulang",
            statsDone: "Selesai",
            statsNoShow: "Tidak Hadir",
            listTitle: "Daftar Viewing",
            searchPlaceholder:
              "Cari nama buyer, telepon, judul properti, kode listing, atau lokasi...",
            filterAll: "Semua",
            call: "Hubungi",
            whatsapp: "WhatsApp",
            reschedule: "Reschedule",
            done: "Selesai",
            noShow: "No Show",
            kode: "Kode",
            buyer: "Buyer",
            location: "Lokasi",
            viewingStatus: "Status Viewing",
            leadStatus: "Status Lead",
            noPhone: "Nomor tidak tersedia",
            showing: (start: number, end: number, total: number) =>
              `Menampilkan ${start}–${end} dari ${total} viewing`,
            prev: "Sebelumnya",
            next: "Berikutnya",
            modalTitle: "Reschedule Viewing",
            newDate: "Tanggal Baru",
            newTime: "Jam Baru",
            saveNewSchedule: "Simpan Jadwal Baru",
            close: "Tutup",
            updateFailed: "Gagal memperbarui viewing.",
            message: (viewing: Viewing, agentName: string) =>
              `Halo ${viewing.buyerName},

Saya ${agentName}, agent dari TETAMO.

Saya ingin mengonfirmasi jadwal viewing untuk properti berikut:

🏠 ${viewing.propertyTitle}
📍 ${viewing.location}
📅 ${viewing.viewingDate}
⏰ ${viewing.viewingTime}

${buildPropertyUrl(viewing)}

Apakah jadwal ini masih sesuai untuk Anda?`,
          }
        : {
            pageTitle: "Viewing Schedule",
            pageDesc:
              "Manage property viewing appointments, contact buyers, and update viewing status.",
            errorLogin: "Please log in as an agent first.",
            loading: "Loading viewing schedule...",
            empty: "No viewing schedule found for this agent yet.",
            statsScheduled: "Scheduled",
            statsRescheduled: "Rescheduled",
            statsDone: "Done",
            statsNoShow: "No Show",
            listTitle: "Viewing List",
            searchPlaceholder:
              "Search buyer name, phone, property title, listing code, or location...",
            filterAll: "All",
            call: "Call",
            whatsapp: "WhatsApp",
            reschedule: "Reschedule",
            done: "Done",
            noShow: "No Show",
            kode: "Code",
            buyer: "Buyer",
            location: "Location",
            viewingStatus: "Viewing Status",
            leadStatus: "Lead Status",
            noPhone: "Phone number unavailable",
            showing: (start: number, end: number, total: number) =>
              `Showing ${start}–${end} of ${total} viewings`,
            prev: "Previous",
            next: "Next",
            modalTitle: "Reschedule Viewing",
            newDate: "New Date",
            newTime: "New Time",
            saveNewSchedule: "Save New Schedule",
            close: "Close",
            updateFailed: "Failed to update viewing.",
            message: (viewing: Viewing, agentName: string) =>
              `Hi ${viewing.buyerName},

This is ${agentName}, an agent from TETAMO.

I would like to confirm the viewing schedule for this property:

🏠 ${viewing.propertyTitle}
📍 ${viewing.location}
📅 ${viewing.viewingDate}
⏰ ${viewing.viewingTime}

${buildPropertyUrl(viewing)}

Is this schedule still suitable for you?`,
          },
    [isID]
  );

  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [agentName, setAgentName] = useState("TETAMO Agent");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");

  const [rescheduleTarget, setRescheduleTarget] = useState<Viewing | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let isMounted = true;

    async function loadViewings() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (authError || !user) {
        setViewings([]);
        setLoading(false);
        setErrorMessage(ui.errorLogin);
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
              "id, property_id, sender_name, sender_phone, sender_email, message, created_at, status, lead_type, viewing_date, viewing_time, viewing_status, receiver_user_id, receiver_role"
            )
            .eq("receiver_user_id", user.id)
            .eq("receiver_role", "agent")
            .eq("lead_type", "viewing")
            .order("created_at", { ascending: false }),
        ]);

      if (!isMounted) return;

      if (profileData?.full_name) {
        setAgentName(profileData.full_name);
      }

      if (leadsError) {
        setViewings([]);
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
        const { data: propertiesData, error: propertiesError } = await supabase
          .from("properties")
          .select("id, kode, title, city, area, province")
          .in("id", propertyIds);

        if (!isMounted) return;

        if (propertiesError) {
          setViewings([]);
          setLoading(false);
          setErrorMessage(propertiesError.message);
          return;
        }

        propertyMap = new Map(
          ((propertiesData || []) as PropertyRow[]).map((item) => [item.id, item])
        );
      }

      const mapped = sortViewingItems(
        leadRows.map((lead) => {
          const property = lead.property_id
            ? propertyMap.get(lead.property_id)
            : null;

          return {
            id: lead.id,
            propertyId: lead.property_id || "",
            listingKode: property?.kode || "-",
            propertyTitle:
              property?.title || (isID ? "Properti Tanpa Judul" : "Untitled Property"),
            buyerName: lead.sender_name || (isID ? "Tanpa Nama" : "No Name"),
            buyerPhone: lead.sender_phone || "-",
            buyerEmail: lead.sender_email || "-",
            viewingDate: formatDate(lead.viewing_date, lang),
            viewingTime: formatTime(lead.viewing_time),
            viewingDateRaw: lead.viewing_date,
            viewingTimeRaw: lead.viewing_time,
            location: buildLocation(property),
            status: normalizeViewingStatus(lead.viewing_status),
            dbStatus: normalizeLeadDbStatus(lead.status),
          } satisfies Viewing;
        })
      );

      setViewings(mapped);
      setLoading(false);
    }

    loadViewings();

    return () => {
      isMounted = false;
    };
  }, [lang, isID, ui.errorLogin]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus]);

  const summary = useMemo(() => {
    return {
      scheduled: viewings.filter((v) => v.status === "scheduled").length,
      rescheduled: viewings.filter((v) => v.status === "rescheduled").length,
      done: viewings.filter((v) => v.status === "done").length,
      noShow: viewings.filter((v) => v.status === "no_show").length,
    };
  }, [viewings]);

  const filteredViewings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return viewings.filter((viewing) => {
      const statusOk =
        selectedStatus === "all" || viewing.status === selectedStatus;

      if (!statusOk) return false;

      if (!query) return true;

      const searchable = `
        ${viewing.propertyTitle}
        ${viewing.listingKode}
        ${viewing.buyerName}
        ${viewing.buyerPhone}
        ${viewing.buyerEmail}
        ${viewing.location}
        ${viewing.viewingDate}
        ${viewing.viewingTime}
        ${viewing.status}
        ${viewing.dbStatus}
      `.toLowerCase();

      return searchable.includes(query);
    });
  }, [viewings, searchQuery, selectedStatus]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredViewings.length / ITEMS_PER_PAGE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginatedViewings = useMemo(() => {
    const start = (safePage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredViewings.slice(start, end);
  }, [filteredViewings, safePage]);

  const startItem =
    filteredViewings.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filteredViewings.length);

  async function updateViewingInDb(
    viewingId: string,
    payload: {
      status?: string;
      viewing_status?: string;
      viewing_date?: string | null;
      viewing_time?: string | null;
    }
  ) {
    setUpdatingId(viewingId);

    const { error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", viewingId);

    if (error) {
      setUpdatingId(null);
      alert(error.message || ui.updateFailed);
      return false;
    }

    setUpdatingId(null);
    return true;
  }

  async function markAsContacted(viewing: Viewing) {
    if (viewing.dbStatus !== "new") return;

    const ok = await updateViewingInDb(viewing.id, {
      status: "contacted",
    });

    if (!ok) return;

    setViewings((prev) =>
      prev.map((item) =>
        item.id === viewing.id ? { ...item, dbStatus: "contacted" } : item
      )
    );
  }

  function openReschedule(viewing: Viewing) {
    setRescheduleTarget(viewing);
    setRescheduleDate(viewing.viewingDateRaw || "");
    setRescheduleTime(viewing.viewingTimeRaw || "");
  }

  function closeReschedule() {
    setRescheduleTarget(null);
    setRescheduleDate("");
    setRescheduleTime("");
  }

  async function handleRescheduleSubmit() {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime) return;

    const nextDbStatus =
      rescheduleTarget.dbStatus === "interested" ||
      rescheduleTarget.dbStatus === "closed"
        ? rescheduleTarget.dbStatus
        : "viewing";

    const ok = await updateViewingInDb(rescheduleTarget.id, {
      status: nextDbStatus,
      viewing_status: "rescheduled",
      viewing_date: rescheduleDate,
      viewing_time: rescheduleTime,
    });

    if (!ok) return;

    setViewings((prev) =>
      sortViewingItems(
        prev.map((item) =>
          item.id === rescheduleTarget.id
            ? {
                ...item,
                dbStatus: nextDbStatus,
                status: "rescheduled",
                viewingDateRaw: rescheduleDate,
                viewingTimeRaw: rescheduleTime,
                viewingDate: formatDate(rescheduleDate, lang),
                viewingTime: formatTime(rescheduleTime),
              }
            : item
        )
      )
    );

    closeReschedule();
  }

  async function handleDone(viewing: Viewing) {
    const nextDbStatus =
      viewing.dbStatus === "interested" || viewing.dbStatus === "closed"
        ? viewing.dbStatus
        : "viewing";

    const ok = await updateViewingInDb(viewing.id, {
      status: nextDbStatus,
      viewing_status: "done",
    });

    if (!ok) return;

    setViewings((prev) =>
      prev.map((item) =>
        item.id === viewing.id
          ? {
              ...item,
              dbStatus: nextDbStatus,
              status: "done",
            }
          : item
      )
    );
  }

  async function handleNoShow(viewing: Viewing) {
    const nextDbStatus =
      viewing.dbStatus === "interested" || viewing.dbStatus === "closed"
        ? viewing.dbStatus
        : "viewing";

    const ok = await updateViewingInDb(viewing.id, {
      status: nextDbStatus,
      viewing_status: "no_show",
    });

    if (!ok) return;

    setViewings((prev) =>
      prev.map((item) =>
        item.id === viewing.id
          ? {
              ...item,
              dbStatus: nextDbStatus,
              status: "no_show",
            }
          : item
      )
    );
  }

  const filterOptions: Array<{
    value: FilterStatus;
    label: string;
    count: number;
  }> = [
    { value: "all", label: ui.filterAll, count: viewings.length },
    { value: "scheduled", label: ui.statsScheduled, count: summary.scheduled },
    {
      value: "rescheduled",
      label: ui.statsRescheduled,
      count: summary.rescheduled,
    },
    { value: "done", label: ui.statsDone, count: summary.done },
    { value: "no_show", label: ui.statsNoShow, count: summary.noShow },
  ];

  return (
    <div className="px-0">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
          {ui.pageTitle}
        </h1>
        <p className="mt-1 text-sm leading-6 text-gray-500">{ui.pageDesc}</p>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={ui.statsScheduled}
          value={loading ? "..." : summary.scheduled}
          Icon={CalendarDays}
        />
        <StatCard
          title={ui.statsRescheduled}
          value={loading ? "..." : summary.rescheduled}
          Icon={RotateCcw}
        />
        <StatCard
          title={ui.statsDone}
          value={loading ? "..." : summary.done}
          Icon={CheckCircle2}
        />
        <StatCard
          title={ui.statsNoShow}
          value={loading ? "..." : summary.noShow}
          Icon={XCircle}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={ui.searchPlaceholder}
              className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#1C1C1E]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {filterOptions.map((item) => {
              const active = selectedStatus === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setSelectedStatus(item.value)}
                  className={[
                    "rounded-xl border px-3 py-2 text-xs font-medium transition sm:text-sm",
                    active
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {item.label} ({item.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-5 md:p-6">
          <h2 className="font-semibold text-[#1C1C1E]">{ui.listTitle}</h2>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">{ui.loading}</div>
        ) : paginatedViewings.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">{ui.empty}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedViewings.map((viewing) => {
              const viewingBadge = viewingStatusUI(viewing.status, lang);
              const leadBadge = leadStatusUI(viewing.dbStatus, lang);

              const whatsappPhone = normalizePhoneForWhatsapp(viewing.buyerPhone);
              const callPhone = normalizePhoneForCall(viewing.buyerPhone);
              const whatsappLink = whatsappPhone
                ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
                    ui.message(viewing, agentName)
                  )}`
                : "";

              const isUpdating = updatingId === viewing.id;
              const isClosed =
                viewing.status === "done" || viewing.status === "no_show";

              return (
                <div key={viewing.id} className="p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          title={viewingBadge.description}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${viewingBadge.badgeClass}`}
                        >
                          <Clock3 className="h-3.5 w-3.5" />
                          {viewingBadge.label}
                        </span>

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${leadBadge.badgeClass}`}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {leadBadge.label}
                        </span>

                        <div className="text-xs text-gray-500">
                          {viewing.viewingDate} • {viewing.viewingTime}
                        </div>
                      </div>

                      <p className="mt-3 text-base font-semibold leading-snug text-[#1C1C1E] sm:text-lg">
                        {viewing.propertyTitle}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {ui.kode}: {viewing.listingKode}
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-gray-500 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-xs font-medium text-gray-400">
                            {ui.buyer}
                          </p>
                          <p className="mt-1 font-semibold text-[#1C1C1E]">
                            {viewing.buyerName}
                          </p>
                          <p className="mt-1">{viewing.buyerPhone}</p>
                          {viewing.buyerEmail !== "-" ? (
                            <p className="break-all">{viewing.buyerEmail}</p>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-xs font-medium text-gray-400">
                            {ui.location}
                          </p>
                          <p className="mt-1 leading-6 text-[#1C1C1E]">
                            {viewing.location}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:w-auto xl:max-w-[360px] xl:justify-end">
                      {callPhone ? (
                        <a
                          href={`tel:${callPhone}`}
                          onClick={() => {
                            void markAsContacted(viewing);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-center text-sm text-gray-700 transition hover:bg-gray-50"
                        >
                          <Phone className="h-4 w-4" />
                          {ui.call}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={ui.noPhone}
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-center text-sm text-gray-400"
                        >
                          <Phone className="h-4 w-4" />
                          {ui.call}
                        </button>
                      )}

                      {whatsappLink ? (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            void markAsContacted(viewing);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-3 py-2.5 text-center text-sm text-white transition hover:opacity-90"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {ui.whatsapp}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title={ui.noPhone}
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gray-200 px-3 py-2.5 text-center text-sm text-gray-400"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {ui.whatsapp}
                        </button>
                      )}

                      {!isClosed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openReschedule(viewing)}
                            disabled={isUpdating}
                            className="rounded-xl border border-gray-300 px-3 py-2.5 text-center text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            {ui.reschedule}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDone(viewing)}
                            disabled={isUpdating}
                            className="rounded-xl border border-gray-300 px-3 py-2.5 text-center text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            {ui.done}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleNoShow(viewing)}
                            disabled={isUpdating}
                            className="col-span-2 rounded-xl border border-gray-300 px-3 py-2.5 text-center text-sm text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 sm:col-span-1"
                          >
                            {ui.noShow}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredViewings.length > 0 ? (
          <div className="flex flex-col gap-4 border-t border-gray-100 px-4 py-4 sm:px-6">
            <p className="text-sm text-gray-500">
              {ui.showing(startItem, endItem, filteredViewings.length)}
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

              <div className="flex flex-wrap items-center gap-2">
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
              </div>

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

      {rescheduleTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={closeReschedule}
            className="absolute inset-0 bg-black/50"
            aria-label={ui.close}
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[#1C1C1E]">
                {ui.modalTitle}
              </h3>

              <button
                type="button"
                onClick={closeReschedule}
                className="rounded-full px-3 py-1 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-sm font-semibold text-[#1C1C1E]">
                {rescheduleTarget.propertyTitle}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {rescheduleTarget.viewingDate} • {rescheduleTarget.viewingTime}
              </p>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {ui.newDate}
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {ui.newTime}
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <button
                type="button"
                disabled={
                  !rescheduleDate ||
                  !rescheduleTime ||
                  updatingId === rescheduleTarget.id
                }
                onClick={() => void handleRescheduleSubmit()}
                className="w-full rounded-2xl bg-[#1C1C1E] py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {ui.saveNewSchedule}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}