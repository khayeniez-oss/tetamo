"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOwnerProfile } from "../layout";
import { useLanguage } from "@/app/context/LanguageContext";

type DbLead = {
  id: string;
  property_id: string | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  receiver_user_id: string;
  receiver_name: string | null;
  receiver_role: string | null;
  lead_type: string | null;
  source: string | null;
  message: string | null;
  viewing_date: string | null;
  viewing_time: string | null;
  status: string;
  priority: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(dateString: string | null, lang: string) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function leadStatusUI(status: string, lang: string) {
  const isID = lang === "id";

  if (status === "new") {
    return {
      label: isID ? "Baru" : "New",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "contacted") {
    return {
      label: isID ? "Sudah Dihubungi" : "Contacted",
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  if (status === "scheduled") {
    return {
      label: isID ? "Viewing Dijadwalkan" : "Viewing Scheduled",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "completed") {
    return {
      label: isID ? "Selesai" : "Completed",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  if (status === "closed") {
    return {
      label: isID ? "Ditutup" : "Closed",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    };
  }

  if (status === "cancelled") {
    return {
      label: isID ? "Dibatalkan" : "Cancelled",
      badgeClass: "bg-red-50 text-red-700 border-red-200",
    };
  }

  return {
    label: status || (isID ? "Tidak Diketahui" : "Unknown"),
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
}

function leadTypeLabel(type: string | null, lang: string) {
  const isID = lang === "id";

  if (type === "whatsapp") return isID ? "Pertanyaan WhatsApp" : "WhatsApp Inquiry";
  if (type === "viewing") return isID ? "Permintaan Viewing" : "Viewing Request";
  if (type === "inquiry") return isID ? "Pertanyaan" : "Inquiry";
  return type || (isID ? "Lead" : "Lead");
}

function normalizePhone(phone: string | null) {
  if (!phone) return "";
  return phone.replace(/\D/g, "").replace(/^0/, "62");
}

function viewingScheduleLabel(
  viewingDate: string | null,
  viewingTime: string | null
) {
  if (!viewingDate && !viewingTime) return "-";
  if (viewingDate && viewingTime) return `${viewingDate} • ${viewingTime}`;
  return viewingDate || viewingTime || "-";
}

export default function PemilikLeadsPage() {
  const { userId, loadingProfile } = useOwnerProfile();
  const { lang } = useLanguage();

  const isID = lang === "id";

  const t = {
    pageTitle: isID ? "Leads" : "Leads",
    pageSubtitle: isID
      ? "Orang yang tertarik dengan properti Anda."
      : "People who are interested in your property.",

    listTitle: isID ? "Daftar Leads" : "Lead List",
    loadingLeads: isID ? "Memuat leads..." : "Loading leads...",
    failedToLoad: isID ? "Gagal memuat leads:" : "Failed to load leads:",
    emptyLeads: isID
      ? "Belum ada leads untuk akun ini."
      : "There are no leads for this account yet.",

    noName: isID ? "Tanpa Nama" : "No Name",
    viewingSchedule: isID ? "Jadwal viewing" : "Viewing schedule",
    notes: isID ? "Catatan" : "Notes",
    priority: isID ? "Prioritas" : "Priority",

    loading: "Loading...",
    contact: isID ? "Hubungi" : "Contact",
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

    whatsappMessage: isID
      ? `Halo, saya pemilik properti ini dari TETAMO.

Anda sebelumnya tertarik pada properti kami.

Apakah Anda masih berminat?`
      : `Hello, I am the owner of this property from TETAMO.

You were previously interested in our property.

Are you still interested?`,
  };

  const [leads, setLeads] = useState<DbLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLeads() {
      if (!userId) {
        if (isMounted) {
          setLeads([]);
          setLoadingLeads(false);
        }
        return;
      }

      if (isMounted) {
        setLoadingLeads(true);
        setErrorMessage("");
      }

      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, property_id, sender_name, sender_email, sender_phone, receiver_user_id, receiver_name, receiver_role, lead_type, source, message, viewing_date, viewing_time, status, priority, notes, created_at, updated_at"
        )
        .eq("receiver_user_id", userId)
        .eq("receiver_role", "owner")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setLeads([]);
        setLoadingLeads(false);
        setErrorMessage(error.message);
        return;
      }

      setLeads((data || []) as DbLead[]);
      setLoadingLeads(false);
    }

    if (!loadingProfile) {
      loadLeads();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, loadingProfile]);

  async function markLeadAsContacted(leadId: string, currentStatus: string) {
    if (currentStatus !== "new") return true;

    setUpdatingLeadId(leadId);

    const { error } = await supabase
      .from("leads")
      .update({
        status: "contacted",
      })
      .eq("id", leadId);

    if (error) {
      setUpdatingLeadId(null);
      alert(t.updateLeadFailed);
      return false;
    }

    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, status: "contacted" } : lead
      )
    );

    setUpdatingLeadId(null);
    return true;
  }

  async function handleCall(lead: DbLead) {
    const phone = lead.sender_phone || "";
    if (!phone) {
      alert(t.phoneUnavailable);
      return;
    }

    const ok = await markLeadAsContacted(lead.id, lead.status);
    if (!ok) return;

    window.location.href = `tel:${phone}`;
  }

  async function handleWhatsApp(lead: DbLead) {
    const normalizedPhone = normalizePhone(lead.sender_phone);
    if (!normalizedPhone) {
      alert(t.whatsappUnavailable);
      return;
    }

    const message = encodeURIComponent(t.whatsappMessage);

    const ok = await markLeadAsContacted(lead.id, lead.status);
    if (!ok) return;

    window.location.href = `https://wa.me/${normalizedPhone}?text=${message}`;
  }

  const isLoading = loadingProfile || loadingLeads;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">{t.pageTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{t.pageSubtitle}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-[#1C1C1E]">{t.listTitle}</h2>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">{t.loadingLeads}</div>
        ) : errorMessage ? (
          <div className="p-4 text-sm text-red-600 sm:p-6">
            {t.failedToLoad} {errorMessage}
          </div>
        ) : leads.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">{t.emptyLeads}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {leads.map((lead) => {
              const ui = leadStatusUI(lead.status, lang);
              const isUpdating = updatingLeadId === lead.id;
              const hasPhone = !!lead.sender_phone;

              return (
                <div
                  key={lead.id}
                  className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${ui.badgeClass}`}
                      >
                        {ui.label}
                      </span>

                      <div className="text-xs text-gray-500">
                        {formatDate(lead.created_at, lang)}
                      </div>

                      <div className="text-xs text-gray-500">
                        {leadTypeLabel(lead.lead_type, lang)}
                      </div>
                    </div>

                    <p className="mt-3 break-words text-sm font-medium text-[#1C1C1E] sm:text-base">
                      {lead.sender_name || t.noName}
                    </p>

                    <p className="text-sm text-gray-500">
                      {lead.sender_phone || "-"}
                    </p>

                    {lead.sender_email ? (
                      <p className="break-words text-sm text-gray-500">
                        {lead.sender_email}
                      </p>
                    ) : null}

                    {lead.message ? (
                      <p className="mt-3 text-sm leading-6 text-gray-700">
                        {lead.message}
                      </p>
                    ) : null}

                    {lead.lead_type === "viewing" ? (
                      <div className="mt-3 text-xs leading-5 text-blue-600">
                        {t.viewingSchedule}:{" "}
                        {viewingScheduleLabel(lead.viewing_date, lead.viewing_time)}
                      </div>
                    ) : null}

                    {lead.notes ? (
                      <div className="mt-2 text-xs leading-5 text-gray-500">
                        {t.notes}: {lead.notes}
                      </div>
                    ) : null}

                    {lead.priority ? (
                      <div className="mt-1 text-xs leading-5 text-gray-500">
                        {t.priority}: {lead.priority}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      onClick={() => handleCall(lead)}
                      disabled={isUpdating || !hasPhone}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? t.loading : t.contact}
                    </button>

                    <button
                      onClick={() => handleWhatsApp(lead)}
                      disabled={isUpdating || !hasPhone}
                      className="rounded-xl bg-green-600 px-4 py-2 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdating ? t.loading : t.whatsapp}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}