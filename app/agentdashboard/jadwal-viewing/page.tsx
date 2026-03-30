"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarDays, RotateCcw, CheckCircle2, XCircle } from "lucide-react";

type ViewingStatus = "scheduled" | "rescheduled" | "done" | "no_show";
type LeadDbStatus = "new" | "contacted" | "viewing" | "interested" | "closed";

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

function viewingStatusUI(status: ViewingStatus) {
  if (status === "scheduled") {
    return {
      label: "Jadwal Viewing",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "rescheduled") {
    return {
      label: "Dijadwalkan Ulang",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "done") {
    return {
      label: "Selesai",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: "No Show",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-[#1C1C1E]">{value}</p>
        </div>

        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#1C1C1E]" />
        </div>
      </div>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
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
  return [property.area, property.city, property.province].filter(Boolean).join(", ") || "-";
}

function sortViewingItems(items: Viewing[]) {
  return [...items].sort((a, b) => {
    const aDate = a.viewingDateRaw
      ? new Date(`${a.viewingDateRaw}T${a.viewingTimeRaw || "00:00"}`).getTime()
      : 0;
    const bDate = b.viewingDateRaw
      ? new Date(`${b.viewingDateRaw}T${b.viewingTimeRaw || "00:00"}`).getTime()
      : 0;

    if (aDate === bDate) return b.id.localeCompare(a.id);
    if (aDate === 0) return 1;
    if (bDate === 0) return -1;

    return aDate - bDate;
  });
}

export default function AgentJadwalViewingPage() {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [agentName, setAgentName] = useState("Agent TETAMO");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
        setErrorMessage("Silakan login sebagai agent terlebih dahulu.");
        return;
      }

      const [{ data: profileData }, { data: leadsData, error: leadsError }] =
        await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
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
          const property = lead.property_id ? propertyMap.get(lead.property_id) : null;

          return {
            id: lead.id,
            listingKode: property?.kode || "-",
            propertyTitle: property?.title || "Properti",
            buyerName: lead.sender_name || "Tanpa Nama",
            buyerPhone: lead.sender_phone || "-",
            buyerEmail: lead.sender_email || "-",
            viewingDate: formatDate(lead.viewing_date),
            viewingTime: lead.viewing_time || "-",
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
  }, []);

  const summary = useMemo(() => {
    return {
      scheduled: viewings.filter((v) => v.status === "scheduled").length,
      rescheduled: viewings.filter((v) => v.status === "rescheduled").length,
      done: viewings.filter((v) => v.status === "done").length,
      noShow: viewings.filter((v) => v.status === "no_show").length,
    };
  }, [viewings]);

  const totalPages = Math.max(1, Math.ceil(viewings.length / ITEMS_PER_PAGE));

  const paginatedViewings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return viewings.slice(start, end);
  }, [viewings, currentPage]);

  const startItem =
    viewings.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, viewings.length);

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
      alert(error.message || "Gagal memperbarui viewing.");
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
      rescheduleTarget.dbStatus === "interested" || rescheduleTarget.dbStatus === "closed"
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
                viewingDate: formatDate(rescheduleDate),
                viewingTime: rescheduleTime,
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Jadwal Viewing</h1>
        <p className="text-sm text-gray-500">
          Daftar jadwal kunjungan properti bersama calon buyer.
        </p>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-8">
        <StatCard
          title="Terjadwal"
          value={loading ? "..." : summary.scheduled}
          Icon={CalendarDays}
        />
        <StatCard
          title="Dijadwalkan Ulang"
          value={loading ? "..." : summary.rescheduled}
          Icon={RotateCcw}
        />
        <StatCard
          title="Selesai"
          value={loading ? "..." : summary.done}
          Icon={CheckCircle2}
        />
        <StatCard
          title="No Show"
          value={loading ? "..." : summary.noShow}
          Icon={XCircle}
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-[#1C1C1E]">Daftar Viewing</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading viewing...</div>
        ) : paginatedViewings.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            Belum ada jadwal viewing untuk agent ini.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedViewings.map((viewing) => {
              const ui = viewingStatusUI(viewing.status);

              const message = encodeURIComponent(
                `Halo ${viewing.buyerName},

Saya ${agentName}, agent dari TETAMO.

Saya ingin mengonfirmasi jadwal viewing untuk properti berikut:

🏠 ${viewing.propertyTitle}
📍 ${viewing.location}
📅 ${viewing.viewingDate}
⏰ ${viewing.viewingTime}

https://tetamo.com/listing/${viewing.listingKode}

Apakah jadwal ini masih sesuai untuk Anda?`
              );

              const whatsappPhone = normalizePhoneForWhatsapp(viewing.buyerPhone);
              const callPhone = normalizePhoneForCall(viewing.buyerPhone);
              const whatsappLink = whatsappPhone
                ? `https://wa.me/${whatsappPhone}?text=${message}`
                : "#";

              const isUpdating = updatingId === viewing.id;
              const isClosed =
                viewing.status === "done" || viewing.status === "no_show";

              return (
                <div
                  key={viewing.id}
                  className="p-6 flex items-start justify-between gap-6"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${ui.badgeClass}`}
                      >
                        {ui.label}
                      </span>

                      <div className="text-xs text-gray-500">
                        {viewing.viewingDate} • {viewing.viewingTime}
                      </div>
                    </div>

                    <p className="mt-3 font-medium text-[#1C1C1E]">
                      {viewing.propertyTitle}
                    </p>

                    <p className="text-sm text-gray-500">
                      Kode: {viewing.listingKode}
                    </p>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-[#1C1C1E]">
                        {viewing.buyerName}
                      </p>
                      <p className="text-sm text-gray-500">
                        {viewing.buyerPhone}
                      </p>
                      {viewing.buyerEmail !== "-" ? (
                        <p className="text-sm text-gray-500">
                          {viewing.buyerEmail}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Lokasi: {viewing.location}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <a
                      href={callPhone ? `tel:${callPhone}` : "#"}
                      onClick={() => {
                        void markAsContacted(viewing);
                      }}
                      className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Hubungi
                    </a>

                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        void markAsContacted(viewing);
                      }}
                      className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm hover:opacity-90"
                    >
                      WhatsApp
                    </a>

                    {!isClosed && (
                      <>
                        <button
                          onClick={() => openReschedule(viewing)}
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Reschedule
                        </button>

                        <button
                          onClick={() => void handleDone(viewing)}
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Selesai
                        </button>

                        <button
                          onClick={() => void handleNoShow(viewing)}
                          disabled={isUpdating}
                          className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          No Show
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {viewings.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Menampilkan {startItem}–{endItem} dari {viewings.length} viewing
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sebelumnya
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={[
                    "px-3 py-2 rounded-xl text-sm border",
                    currentPage === page
                      ? "bg-[#1C1C1E] text-white border-[#1C1C1E]"
                      : "border-gray-200 text-[#1C1C1E] hover:bg-gray-50",
                  ].join(" ")}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <button
            type="button"
            onClick={closeReschedule}
            className="absolute inset-0 bg-black/50"
            aria-label="Close reschedule popup"
          />

          <div className="relative z-10 w-[92%] max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1C1C1E]">
                Reschedule Viewing
              </h3>

              <button
                type="button"
                onClick={closeReschedule}
                className="rounded-full px-3 py-1 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  Tanggal Baru
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  Jam Baru
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2"
                />
              </div>

              <button
                type="button"
                disabled={!rescheduleDate || !rescheduleTime || updatingId === rescheduleTarget.id}
                onClick={() => void handleRescheduleSubmit()}
                className="w-full rounded-2xl bg-[#1C1C1E] py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                Simpan Jadwal Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}