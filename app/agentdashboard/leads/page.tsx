"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type LeadStatus = "new" | "contacted" | "viewing" | "interested" | "closed";
type ViewingStatus = "scheduled" | "rescheduled" | "done" | "no_show" | null;
type StatusFilter = "all" | LeadStatus;

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

function normalizeViewingStatus(value?: string | null): ViewingStatus {
  const v = (value || "").trim().toLowerCase();

  if (v === "scheduled") return "scheduled";
  if (v === "rescheduled") return "rescheduled";
  if (v === "done") return "done";
  if (v === "no_show") return "no_show";
  return null;
}

function leadStatusUI(status: LeadStatus) {
  if (status === "new") {
    return {
      label: "Baru",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "contacted") {
    return {
      label: "Sudah Dihubungi",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  if (status === "viewing") {
    return {
      label: "Jadwal Viewing",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "interested") {
    return {
      label: "Sangat Tertarik",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: "Selesai",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  };
}

function viewingStatusUI(status: ViewingStatus) {
  if (status === "scheduled") {
    return {
      label: "Terjadwal",
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
      label: "Viewing Selesai",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "no_show") {
    return {
      label: "No Show",
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

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

function buildPropertyLocation(row?: PropertyRow | null) {
  if (!row) return "-";

  const parts = [row.area, row.city, row.province].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "-";
}

export default function AgentLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agentName, setAgentName] = useState("Agent TETAMO");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
          ((propertyData || []) as PropertyRow[]).map((item) => [item.id, item])
        );
      }

      const mapped: Lead[] = leadRows.map((lead) => {
        const property = lead.property_id ? propertyMap.get(lead.property_id) : null;

        return {
          id: lead.id,
          propertyId: lead.property_id,
          listingKode: property?.kode || "-",
          propertyTitle: property?.title || "Properti",
          propertyPrice: formatCurrency(property?.price || 0),
          propertyLocation: buildPropertyLocation(property),
          buyerName: lead.sender_name || "Tanpa Nama",
          buyerPhone: lead.sender_phone || "-",
          buyerEmail: lead.sender_email || "-",
          message: lead.message || "-",
          createdAt: formatDate(lead.created_at),
          status: normalizeLeadStatus(lead.status),
          leadType: lead.lead_type || "lead",
          viewingDate: lead.viewing_date,
          viewingTime: lead.viewing_time,
          viewingStatus: normalizeViewingStatus(lead.viewing_status),
        };
      });

      setLeads(mapped);
      setLoading(false);
    }

    loadLeads();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

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
      alert(error.message || "Gagal mengubah status lead.");
      return false;
    }

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id
          ? {
              ...lead,
              status: (payload.status ?? lead.status) as LeadStatus,
              viewingStatus:
                payload.viewing_status === undefined
                  ? lead.viewingStatus
                  : payload.viewing_status,
            }
          : lead
      )
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

    if (target.leadType === "viewing" && nextStatus === "viewing" && !target.viewingStatus) {
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

      const searchable = `
        ${lead.buyerName}
        ${lead.buyerPhone}
        ${lead.buyerEmail}
        ${lead.message}
        ${lead.propertyTitle}
        ${lead.propertyLocation}
        ${lead.listingKode}
        ${lead.propertyPrice}
      `.toLowerCase();

      const matchesSearch = !q || searchable.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [leads, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLeads.length / ITEMS_PER_PAGE)
  );

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredLeads.slice(start, end);
  }, [filteredLeads, currentPage]);

  const startItem =
    filteredLeads.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Leads</h1>
        <p className="text-sm text-gray-500">
          Kelola leads buyer dan pantau progres follow-up.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari buyer, kode listing, lokasi, pesan..."
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E] md:max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Semua" },
            { key: "new", label: "Baru" },
            { key: "contacted", label: "Dihubungi" },
            { key: "viewing", label: "Viewing" },
            { key: "interested", label: "Tertarik" },
            { key: "closed", label: "Selesai" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStatusFilter(item.key as StatusFilter)}
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

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-[#1C1C1E]">Daftar Leads</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading leads...</div>
        ) : paginatedLeads.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            Belum ada leads untuk agent ini.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedLeads.map((lead) => {
              const ui = leadStatusUI(lead.status);
              const viewingUi =
                lead.leadType === "viewing"
                  ? viewingStatusUI(lead.viewingStatus)
                  : null;

              const whatsappPhone = normalizePhoneForWhatsapp(lead.buyerPhone);
              const callPhone = normalizePhoneForCall(lead.buyerPhone);

              const message = encodeURIComponent(
                `Halo ${lead.buyerName},

Saya ${agentName}, agent dari TETAMO.

Anda sebelumnya tertarik dengan properti berikut:

🏠 ${lead.propertyTitle}
📍 ${lead.propertyLocation}
💰 ${lead.propertyPrice}

https://tetamo.com/listing/${lead.listingKode}

Jika Anda berminat, kita juga bisa:

1️⃣ Diskusi lebih lanjut
2️⃣ Kirim detail lengkap
3️⃣ Jadwalkan viewing

Silakan beri tahu waktu yang paling nyaman untuk Anda.`
              );

              const whatsappLink = whatsappPhone
                ? `https://wa.me/${whatsappPhone}?text=${message}`
                : "#";

              const isUpdating = updatingId === lead.id;

              return (
                <div
                  key={lead.id}
                  className="p-6 flex items-start justify-between gap-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${ui.badgeClass}`}
                      >
                        {ui.label}
                      </span>

                      {lead.leadType === "viewing" ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          Viewing Request
                        </span>
                      ) : null}

                      {viewingUi ? (
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${viewingUi.badgeClass}`}
                        >
                          {viewingUi.label}
                        </span>
                      ) : null}

                      <div className="text-xs text-gray-500">{lead.createdAt}</div>
                    </div>

                    <p className="mt-3 font-medium text-[#1C1C1E]">
                      {lead.buyerName}
                    </p>

                    <p className="text-sm text-gray-500">{lead.buyerPhone}</p>

                    {lead.buyerEmail !== "-" ? (
                      <p className="text-sm text-gray-500">{lead.buyerEmail}</p>
                    ) : null}

                    <p className="mt-3 text-sm text-gray-700">{lead.message}</p>

                    <div className="mt-3 text-xs text-gray-500">
                      Properti: {lead.propertyTitle} • Kode: {lead.listingKode}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      Lokasi: {lead.propertyLocation} • Harga: {lead.propertyPrice}
                    </div>

                    {lead.leadType === "viewing" &&
                    (lead.viewingDate || lead.viewingTime) ? (
                      <div className="mt-2 text-xs text-amber-700">
                        Jadwal diminta: {lead.viewingDate || "-"} • {lead.viewingTime || "-"}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {lead.status !== "viewing" && (
                        <button
                          type="button"
                          onClick={() => updateLeadStatus(lead.id, "viewing")}
                          disabled={isUpdating}
                          className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs font-semibold text-yellow-700 hover:bg-yellow-100 disabled:opacity-50"
                        >
                          Viewing
                        </button>
                      )}

                      {lead.status !== "interested" && (
                        <button
                          type="button"
                          onClick={() => updateLeadStatus(lead.id, "interested")}
                          disabled={isUpdating}
                          className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                        >
                          Interested
                        </button>
                      )}

                      {lead.status !== "closed" && (
                        <button
                          type="button"
                          onClick={() => updateLeadStatus(lead.id, "closed")}
                          disabled={isUpdating}
                          className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        >
                          Closed
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={callPhone ? `tel:${callPhone}` : "#"}
                      onClick={() => {
                        void markAsContacted(lead.id);
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
                        void markAsContacted(lead.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm hover:opacity-90"
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredLeads.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Menampilkan {startItem}–{endItem} dari {filteredLeads.length} leads
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-[#1C1C1E] text-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="px-3 py-2 rounded-xl border border-gray-200 bg-[#1C1C1E] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}