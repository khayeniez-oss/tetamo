"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type CommissionStatus =
  | "pending"
  | "waiting_confirmation"
  | "approved"
  | "paid"
  | "cancelled"
  | "disputed";

type CommissionDealType = "sale" | "rent" | "renewal" | "other";

type StatusFilter = "all" | CommissionStatus;
type DealTypeFilter = "all" | CommissionDealType;

type CommissionRow = {
  id: string;
  agent_user_id: string;
  property_id: string | null;
  listing_code: string | null;
  property_title: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  deal_type: CommissionDealType;
  deal_value: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  status: CommissionStatus;
  deal_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FormState = {
  listingCode: string;
  propertyTitle: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  dealType: CommissionDealType;
  dealValue: string;
  commissionRate: string;
  status: CommissionStatus;
  dealDate: string;
  paidDate: string;
  paymentMethod: string;
  paymentReference: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  listingCode: "",
  propertyTitle: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  dealType: "sale",
  dealValue: "",
  commissionRate: "",
  status: "pending",
  dealDate: "",
  paidDate: "",
  paymentMethod: "",
  paymentReference: "",
  notes: "",
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function calculateCommissionAmount(
  dealValue: number | string | null | undefined,
  commissionRate: number | string | null | undefined
) {
  const value = toNumber(dealValue);
  const rate = toNumber(commissionRate);

  if (value <= 0 || rate <= 0) return 0;

  return Math.round((value * rate) / 100);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined, lang: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusUI(status: CommissionStatus, lang: string) {
  const isID = lang === "id";

  if (status === "paid") {
    return {
      label: isID ? "Dibayar" : "Paid",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  }

  if (status === "approved") {
    return {
      label: isID ? "Disetujui" : "Approved",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (status === "waiting_confirmation") {
    return {
      label: isID ? "Menunggu Konfirmasi" : "Waiting Confirmation",
      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
    };
  }

  if (status === "cancelled") {
    return {
      label: isID ? "Dibatalkan" : "Cancelled",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (status === "disputed") {
    return {
      label: isID ? "Sengketa" : "Disputed",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  return {
    label: "Pending",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  };
}

function dealTypeLabel(type: CommissionDealType, lang: string) {
  const isID = lang === "id";

  if (type === "sale") return isID ? "Jual" : "Sale";
  if (type === "rent") return isID ? "Sewa" : "Rent";
  if (type === "renewal") return isID ? "Perpanjangan" : "Renewal";
  return isID ? "Lainnya" : "Other";
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
}) {
  const isLongText = typeof value === "string" && value.length > 14;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] leading-4 text-gray-500 sm:text-sm">
            {title}
          </p>

          <p
            className={[
              "mt-2 break-words font-semibold leading-tight text-[#1C1C1E]",
              isLongText ? "text-[13px] sm:text-lg" : "text-lg sm:text-3xl",
            ].join(" ")}
          >
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AgentKomisiPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const ui = useMemo(
    () =>
      isID
        ? {
            pageTitle: "Komisi",
            pageDesc:
              "Catatan komisi manual untuk deal properti yang berhasil atau sedang berjalan.",
            addCommission: "Tambah Komisi",
            manualTitle: "Catatan Komisi Manual",
            manualDesc:
              "Halaman ini hanya untuk mencatat komisi agent secara manual. Pembayaran komisi saat ini masih dilakukan di luar sistem TETAMO.",
            totalCommission: "Total Komisi",
            paidCommission: "Sudah Dibayar",
            pendingCommission: "Belum Dibayar",
            totalRecords: "Total Record",
            historyTitle: "Riwayat Komisi",
            historyDesc: "Semua record komisi yang Anda input manual.",
            searchPlaceholder:
              "Cari properti, kode listing, client, metode pembayaran, atau catatan...",
            statusFilter: "Filter Status",
            dealTypeFilter: "Filter Deal",
            all: "Semua",
            loading: "Memuat komisi...",
            empty:
              "Belum ada record komisi. Klik Tambah Komisi untuk mulai mencatat.",
            summary: "Ringkasan",
            biggestCommission: "Komisi Terbesar",
            paidRecords: "Record Dibayar",
            pendingRecords: "Record Pending",
            howToUse: "Cara Pakai",
            importantNote: "Catatan Penting",
            howTo1: "Klik Tambah Komisi.",
            howTo2: "Isi detail properti, client, nilai deal, dan rate komisi.",
            howTo3: "Sistem akan menghitung estimasi komisi dari deal value × rate.",
            howTo4: "Update status saat komisi disetujui atau dibayar.",
            note1: "Halaman ini belum terhubung ke payout otomatis TETAMO.",
            note2: "Semua komisi di sini adalah record manual agent.",
            note3: "Pembayaran komisi masih dilakukan di luar platform.",
            propertyTitle: "Judul Properti",
            listingCode: "Kode Listing",
            client: "Client",
            clientName: "Nama Client",
            clientPhone: "Telepon Client",
            clientEmail: "Email Client",
            dealType: "Tipe Deal",
            dealValue: "Nilai Deal",
            rate: "Rate Komisi",
            commission: "Komisi",
            dealDate: "Tanggal Deal",
            paidDate: "Tanggal Dibayar",
            paymentMethod: "Metode Pembayaran",
            paymentReference: "Referensi Pembayaran",
            notes: "Catatan",
            edit: "Edit",
            delete: "Hapus",
            modalAdd: "Tambah Komisi",
            modalEdit: "Edit Komisi",
            cancel: "Batal",
            save: "Simpan Komisi",
            update: "Update Komisi",
            saving: "Menyimpan...",
            preview: "Estimasi Komisi",
            requiredProperty: "Property title wajib diisi.",
            requiredClient: "Client name wajib diisi.",
            invalidDealValue: "Deal value harus lebih besar dari 0.",
            invalidRate: "Commission rate tidak valid.",
            userNotFound: "User agent tidak ditemukan.",
            loadError: "Gagal memuat komisi.",
            updateError: "Gagal update komisi.",
            insertError: "Gagal tambah komisi.",
            deleteConfirm: "Hapus record komisi ini?",
            deleteError: "Gagal hapus komisi.",
            loginError: "Silakan login sebagai agent terlebih dahulu.",
            sale: "Jual",
            rent: "Sewa",
            renewal: "Perpanjangan",
            other: "Lainnya",
          }
        : {
            pageTitle: "Commission",
            pageDesc:
              "Manual commission records for successful or ongoing property deals.",
            addCommission: "Add Commission",
            manualTitle: "Manual Commission Record",
            manualDesc:
              "This page is only for manually tracking agent commissions. Commission payment is currently handled outside the TETAMO system.",
            totalCommission: "Total Commission",
            paidCommission: "Paid",
            pendingCommission: "Unpaid / Pending",
            totalRecords: "Total Records",
            historyTitle: "Commission History",
            historyDesc: "All commission records you manually entered.",
            searchPlaceholder:
              "Search property, listing code, client, payment method, or notes...",
            statusFilter: "Status Filter",
            dealTypeFilter: "Deal Filter",
            all: "All",
            loading: "Loading commissions...",
            empty:
              "No commission records yet. Click Add Commission to start tracking.",
            summary: "Summary",
            biggestCommission: "Biggest Commission",
            paidRecords: "Paid Records",
            pendingRecords: "Pending Records",
            howToUse: "How to Use",
            importantNote: "Important Note",
            howTo1: "Click Add Commission.",
            howTo2: "Fill property, client, deal value, and commission rate.",
            howTo3: "The system calculates estimated commission from deal value × rate.",
            howTo4: "Update the status when commission is approved or paid.",
            note1: "This page is not connected to automatic TETAMO payout yet.",
            note2: "All commissions here are manual agent records.",
            note3: "Commission payment is still handled outside the platform.",
            propertyTitle: "Property Title",
            listingCode: "Listing Code",
            client: "Client",
            clientName: "Client Name",
            clientPhone: "Client Phone",
            clientEmail: "Client Email",
            dealType: "Deal Type",
            dealValue: "Deal Value",
            rate: "Commission Rate",
            commission: "Commission",
            dealDate: "Deal Date",
            paidDate: "Paid Date",
            paymentMethod: "Payment Method",
            paymentReference: "Payment Reference",
            notes: "Notes",
            edit: "Edit",
            delete: "Delete",
            modalAdd: "Add Commission",
            modalEdit: "Edit Commission",
            cancel: "Cancel",
            save: "Save Commission",
            update: "Update Commission",
            saving: "Saving...",
            preview: "Estimated Commission",
            requiredProperty: "Property title is required.",
            requiredClient: "Client name is required.",
            invalidDealValue: "Deal value must be greater than 0.",
            invalidRate: "Commission rate is invalid.",
            userNotFound: "Agent user was not found.",
            loadError: "Failed to load commission.",
            updateError: "Failed to update commission.",
            insertError: "Failed to add commission.",
            deleteConfirm: "Delete this commission record?",
            deleteError: "Failed to delete commission.",
            loginError: "Please log in as an agent first.",
            sale: "Sale",
            rent: "Rent",
            renewal: "Renewal",
            other: "Other",
          },
    [isID]
  );

  const [agentUserId, setAgentUserId] = useState<string | null>(null);
  const [records, setRecords] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dealTypeFilter, setDealTypeFilter] = useState<DealTypeFilter>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function loadCommissions() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setAgentUserId(null);
      setRecords([]);
      setLoading(false);
      setErrorMessage(ui.loginError);
      return;
    }

    setAgentUserId(user.id);

    const { data, error } = await supabase
      .from("agent_commissions")
      .select(
        `
          id,
          agent_user_id,
          property_id,
          listing_code,
          property_title,
          client_name,
          client_phone,
          client_email,
          deal_type,
          deal_value,
          commission_rate,
          commission_amount,
          status,
          deal_date,
          paid_date,
          payment_method,
          payment_reference,
          notes,
          created_at,
          updated_at
        `
      )
      .eq("agent_user_id", user.id)
      .order("deal_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setRecords([]);
      setLoading(false);
      setErrorMessage(error.message || ui.loadError);
      return;
    }

    const mapped = ((data || []) as CommissionRow[]).map((row) => {
      const dealValue = Number(row.deal_value || 0);
      const commissionRate = Number(row.commission_rate || 0);
      const calculatedCommission = calculateCommissionAmount(
        dealValue,
        commissionRate
      );

      return {
        ...row,
        deal_value: dealValue,
        commission_rate: commissionRate,
        commission_amount:
          Number(row.commission_amount || 0) > 0
            ? Number(row.commission_amount || 0)
            : calculatedCommission,
      };
    });

    setRecords(mapped);
    setLoading(false);
  }

  useEffect(() => {
    void loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();

    return records.filter((item) => {
      const statusOk =
        statusFilter === "all" || item.status === statusFilter;

      const dealTypeOk =
        dealTypeFilter === "all" || item.deal_type === dealTypeFilter;

      const searchable = `
        ${item.property_title}
        ${item.listing_code || ""}
        ${item.client_name}
        ${item.client_phone || ""}
        ${item.client_email || ""}
        ${item.deal_type}
        ${item.status}
        ${item.payment_method || ""}
        ${item.payment_reference || ""}
        ${item.notes || ""}
      `.toLowerCase();

      const searchOk = !q || searchable.includes(q);

      return statusOk && dealTypeOk && searchOk;
    });
  }, [records, search, statusFilter, dealTypeFilter]);

  const summary = useMemo(() => {
    const totalCommission = records.reduce(
      (sum, item) => sum + Number(item.commission_amount || 0),
      0
    );

    const paidCommission = records
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

    const pendingCommission = records
      .filter((item) =>
        ["pending", "waiting_confirmation", "approved"].includes(item.status)
      )
      .reduce((sum, item) => sum + Number(item.commission_amount || 0), 0);

    const biggestCommission = Math.max(
      0,
      ...records.map((item) => Number(item.commission_amount || 0))
    );

    return {
      totalRecords: records.length,
      totalCommission,
      paidCommission,
      pendingCommission,
      biggestCommission,
      paidRecords: records.filter((item) => item.status === "paid").length,
      pendingRecords: records.filter((item) =>
        ["pending", "waiting_confirmation", "approved"].includes(item.status)
      ).length,
    };
  }, [records]);

  const formCommissionPreview = useMemo(() => {
    return calculateCommissionAmount(form.dealValue, form.commissionRate);
  }, [form.dealValue, form.commissionRate]);

  function openAddModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  }

  function openEditModal(item: CommissionRow) {
    setEditingId(item.id);
    setForm({
      listingCode: item.listing_code || "",
      propertyTitle: item.property_title || "",
      clientName: item.client_name || "",
      clientPhone: item.client_phone || "",
      clientEmail: item.client_email || "",
      dealType: item.deal_type,
      dealValue: String(Number(item.deal_value || 0)),
      commissionRate: String(Number(item.commission_rate || 0)),
      status: item.status,
      dealDate: item.deal_date || "",
      paidDate: item.paid_date || "",
      paymentMethod: item.payment_method || "",
      paymentReference: item.payment_reference || "",
      notes: item.notes || "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSave() {
    if (!agentUserId) {
      alert(ui.userNotFound);
      return;
    }

    if (!form.propertyTitle.trim()) {
      alert(ui.requiredProperty);
      return;
    }

    if (!form.clientName.trim()) {
      alert(ui.requiredClient);
      return;
    }

    if (!form.dealValue.trim() || Number(form.dealValue) <= 0) {
      alert(ui.invalidDealValue);
      return;
    }

    if (!form.commissionRate.trim() || Number(form.commissionRate) < 0) {
      alert(ui.invalidRate);
      return;
    }

    setSaving(true);

    const payload = {
      agent_user_id: agentUserId,
      property_id: null,
      listing_code: form.listingCode.trim() || null,
      property_title: form.propertyTitle.trim(),
      client_name: form.clientName.trim(),
      client_phone: form.clientPhone.trim() || null,
      client_email: form.clientEmail.trim() || null,
      deal_type: form.dealType,
      deal_value: Number(form.dealValue || 0),
      commission_rate: Number(form.commissionRate || 0),
      status: form.status,
      deal_date: form.dealDate || null,
      paid_date: form.paidDate || null,
      payment_method: form.paymentMethod.trim() || null,
      payment_reference: form.paymentReference.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("agent_commissions")
        .update(payload)
        .eq("id", editingId)
        .eq("agent_user_id", agentUserId);

      if (error) {
        setSaving(false);
        alert(error.message || ui.updateError);
        return;
      }
    } else {
      const { error } = await supabase
        .from("agent_commissions")
        .insert(payload);

      if (error) {
        setSaving(false);
        alert(error.message || ui.insertError);
        return;
      }
    }

    setSaving(false);
    closeModal();
    await loadCommissions();
  }

  async function handleDelete(id: string) {
    if (!agentUserId) return;

    const confirmed = window.confirm(ui.deleteConfirm);
    if (!confirmed) return;

    const { error } = await supabase
      .from("agent_commissions")
      .delete()
      .eq("id", id)
      .eq("agent_user_id", agentUserId);

    if (error) {
      alert(error.message || ui.deleteError);
      return;
    }

    await loadCommissions();
  }

  const statusOptions: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: ui.all },
    { key: "pending", label: statusUI("pending", lang).label },
    {
      key: "waiting_confirmation",
      label: statusUI("waiting_confirmation", lang).label,
    },
    { key: "approved", label: statusUI("approved", lang).label },
    { key: "paid", label: statusUI("paid", lang).label },
    { key: "cancelled", label: statusUI("cancelled", lang).label },
    { key: "disputed", label: statusUI("disputed", lang).label },
  ];

  const dealTypeOptions: Array<{ key: DealTypeFilter; label: string }> = [
    { key: "all", label: ui.all },
    { key: "sale", label: dealTypeLabel("sale", lang) },
    { key: "rent", label: dealTypeLabel("rent", lang) },
    { key: "renewal", label: dealTypeLabel("renewal", lang) },
    { key: "other", label: dealTypeLabel("other", lang) },
  ];

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
            {ui.pageTitle}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
            {ui.pageDesc}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {ui.addCommission}
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{ui.manualTitle}</p>
            <p className="mt-1 leading-6">{ui.manualDesc}</p>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title={ui.totalCommission}
          value={formatCurrency(summary.totalCommission)}
          icon={<TrendingUp className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
        <StatCard
          title={ui.paidCommission}
          value={formatCurrency(summary.paidCommission)}
          icon={<CheckCircle2 className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
        <StatCard
          title={ui.pendingCommission}
          value={formatCurrency(summary.pendingCommission)}
          icon={<Clock className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
        <StatCard
          title={ui.totalRecords}
          value={summary.totalRecords}
          icon={<Wallet className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ui.searchPlaceholder}
            className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-4 text-sm outline-none focus:border-[#1C1C1E]"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              {ui.statusFilter}
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

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              {ui.dealTypeFilter}
            </p>
            <div className="flex flex-wrap gap-2">
              {dealTypeOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDealTypeFilter(item.key)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    dealTypeFilter === item.key
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

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6 xl:col-span-2">
          <div className="border-b border-gray-100 pb-5">
            <h2 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl">
              {ui.historyTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              {ui.historyDesc}
            </p>
          </div>

          {loading ? (
            <div className="py-8 text-sm text-gray-500">{ui.loading}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-8 text-sm text-gray-500">{ui.empty}</div>
          ) : (
            <div className="mt-5 space-y-4">
              {filteredRecords.map((item) => {
                const status = statusUI(item.status, lang);

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold leading-snug text-[#1C1C1E] sm:text-lg">
                            {item.property_title}
                          </p>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          {ui.listingCode}: {item.listing_code || "-"}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-gray-500">{ui.client}</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {item.client_name}
                            </p>
                            {item.client_phone ? (
                              <p className="mt-1 text-xs text-gray-500">
                                {item.client_phone}
                              </p>
                            ) : null}
                            {item.client_email ? (
                              <p className="mt-1 break-all text-xs text-gray-500">
                                {item.client_email}
                              </p>
                            ) : null}
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              {ui.dealType}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {dealTypeLabel(item.deal_type, lang)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              {ui.dealValue}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {formatCurrency(item.deal_value)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">{ui.rate}</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {Number(item.commission_rate || 0)}%
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              {ui.dealDate}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {formatDate(item.deal_date, lang)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              {ui.paidDate}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {formatDate(item.paid_date, lang)}
                            </p>
                          </div>
                        </div>

                        {item.notes ? (
                          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">{ui.notes}</p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">
                              {item.notes}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:w-[250px]">
                        <p className="text-xs text-gray-500">
                          {ui.commission}
                        </p>
                        <p className="mt-2 break-words text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                          {formatCurrency(item.commission_amount)}
                        </p>

                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-xs text-gray-500">
                              {ui.paymentMethod}
                            </p>
                            <p className="mt-1 break-words text-sm font-medium text-[#1C1C1E]">
                              {item.payment_method || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">
                              {ui.paymentReference}
                            </p>
                            <p className="mt-1 break-words text-sm font-medium text-[#1C1C1E]">
                              {item.payment_reference || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-[#1C1C1E] hover:bg-gray-50"
                          >
                            <Pencil className="h-4 w-4" />
                            {ui.edit}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            {ui.delete}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <h2 className="text-lg font-semibold text-[#1C1C1E]">
              {ui.summary}
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">
                  {ui.biggestCommission}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {formatCurrency(summary.biggestCommission)}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{ui.paidRecords}</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {summary.paidRecords} {isID ? "transaksi" : "transactions"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">{ui.pendingRecords}</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {summary.pendingRecords}{" "}
                  {isID ? "transaksi" : "transactions"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <FileText className="h-5 w-5 text-[#1C1C1E]" />
              </div>
              <h2 className="text-lg font-semibold text-[#1C1C1E]">
                {ui.howToUse}
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
              <p>1. {ui.howTo1}</p>
              <p>2. {ui.howTo2}</p>
              <p>3. {ui.howTo3}</p>
              <p>4. {ui.howTo4}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <AlertCircle className="h-5 w-5 text-[#1C1C1E]" />
              </div>
              <h2 className="text-lg font-semibold text-[#1C1C1E]">
                {ui.importantNote}
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
              <p>{ui.note1}</p>
              <p>{ui.note2}</p>
              <p>{ui.note3}</p>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={closeModal}
            className="absolute inset-0 bg-black/50"
            aria-label="Close modal"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[#1C1C1E]">
                {editingId ? ui.modalEdit : ui.modalAdd}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-[#1C1C1E] hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500">{ui.preview}</p>
              <p className="mt-1 text-xl font-bold text-[#1C1C1E]">
                {formatCurrency(formCommissionPreview)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatCurrency(toNumber(form.dealValue))} ×{" "}
                {toNumber(form.commissionRate)}%
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.listingCode}
                </label>
                <input
                  type="text"
                  value={form.listingCode}
                  onChange={(e) => updateForm("listingCode", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.propertyTitle} *
                </label>
                <input
                  type="text"
                  value={form.propertyTitle}
                  onChange={(e) => updateForm("propertyTitle", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.clientName} *
                </label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => updateForm("clientName", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.clientPhone}
                </label>
                <input
                  type="text"
                  value={form.clientPhone}
                  onChange={(e) => updateForm("clientPhone", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.clientEmail}
                </label>
                <input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => updateForm("clientEmail", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.dealType}
                </label>
                <select
                  value={form.dealType}
                  onChange={(e) =>
                    updateForm("dealType", e.target.value as CommissionDealType)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                >
                  <option value="sale">{ui.sale}</option>
                  <option value="rent">{ui.rent}</option>
                  <option value="renewal">{ui.renewal}</option>
                  <option value="other">{ui.other}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.dealValue} *
                </label>
                <input
                  type="number"
                  value={form.dealValue}
                  onChange={(e) => updateForm("dealValue", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.rate} (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.commissionRate}
                  onChange={(e) => updateForm("commissionRate", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateForm("status", e.target.value as CommissionStatus)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                >
                  <option value="pending">
                    {statusUI("pending", lang).label}
                  </option>
                  <option value="waiting_confirmation">
                    {statusUI("waiting_confirmation", lang).label}
                  </option>
                  <option value="approved">
                    {statusUI("approved", lang).label}
                  </option>
                  <option value="paid">{statusUI("paid", lang).label}</option>
                  <option value="cancelled">
                    {statusUI("cancelled", lang).label}
                  </option>
                  <option value="disputed">
                    {statusUI("disputed", lang).label}
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.dealDate}
                </label>
                <input
                  type="date"
                  value={form.dealDate}
                  onChange={(e) => updateForm("dealDate", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.paidDate}
                </label>
                <input
                  type="date"
                  value={form.paidDate}
                  onChange={(e) => updateForm("paidDate", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.paymentMethod}
                </label>
                <input
                  type="text"
                  value={form.paymentMethod}
                  onChange={(e) => updateForm("paymentMethod", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.paymentReference}
                </label>
                <input
                  type="text"
                  value={form.paymentReference}
                  onChange={(e) =>
                    updateForm("paymentReference", e.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  {ui.notes}
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-[#1C1C1E] hover:bg-gray-50"
              >
                {ui.cancel}
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? ui.saving : editingId ? ui.update : ui.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}