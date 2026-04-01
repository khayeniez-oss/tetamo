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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CommissionStatus =
  | "pending"
  | "waiting_confirmation"
  | "approved"
  | "paid"
  | "cancelled"
  | "disputed";

type CommissionDealType = "sale" | "rent" | "renewal" | "other";

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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

function statusUI(status: CommissionStatus) {
  if (status === "paid") {
    return {
      label: "Paid",
      className: "border-green-200 bg-green-50 text-green-700",
    };
  }

  if (status === "approved") {
    return {
      label: "Approved",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (status === "waiting_confirmation") {
    return {
      label: "Waiting Confirmation",
      className: "border-yellow-200 bg-yellow-50 text-yellow-700",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (status === "disputed") {
    return {
      label: "Disputed",
      className: "border-orange-200 bg-orange-50 text-orange-700",
    };
  }

  return {
    label: "Pending",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  };
}

function dealTypeLabel(type: CommissionDealType) {
  if (type === "sale") return "Sale";
  if (type === "rent") return "Rent";
  if (type === "renewal") return "Renewal";
  return "Other";
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
  const isLongText = typeof value === "string" && value.length > 12;

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
  const [agentUserId, setAgentUserId] = useState<string | null>(null);
  const [records, setRecords] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      setErrorMessage("Silakan login sebagai agent terlebih dahulu.");
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
      setErrorMessage(error.message || "Gagal memuat komisi.");
      return;
    }

    const mapped = ((data || []) as CommissionRow[]).map((row) => ({
      ...row,
      deal_value: Number(row.deal_value || 0),
      commission_rate: Number(row.commission_rate || 0),
      commission_amount: Number(row.commission_amount || 0),
    }));

    setRecords(mapped);
    setLoading(false);
  }

  useEffect(() => {
    void loadCommissions();
  }, []);

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

    return {
      totalRecords: records.length,
      totalCommission,
      paidCommission,
      pendingCommission,
    };
  }, [records]);

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
      alert("User agent tidak ditemukan.");
      return;
    }

    if (!form.propertyTitle.trim()) {
      alert("Property title wajib diisi.");
      return;
    }

    if (!form.clientName.trim()) {
      alert("Client name wajib diisi.");
      return;
    }

    if (!form.dealValue.trim() || Number(form.dealValue) <= 0) {
      alert("Deal value harus lebih besar dari 0.");
      return;
    }

    if (!form.commissionRate.trim() || Number(form.commissionRate) < 0) {
      alert("Commission rate tidak valid.");
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
        alert(error.message || "Gagal update komisi.");
        return;
      }
    } else {
      const { error } = await supabase
        .from("agent_commissions")
        .insert(payload);

      if (error) {
        setSaving(false);
        alert(error.message || "Gagal tambah komisi.");
        return;
      }
    }

    setSaving(false);
    closeModal();
    await loadCommissions();
  }

  async function handleDelete(id: string) {
    if (!agentUserId) return;

    const confirmed = window.confirm("Hapus record komisi ini?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("agent_commissions")
      .delete()
      .eq("id", id)
      .eq("agent_user_id", agentUserId);

    if (error) {
      alert(error.message || "Gagal hapus komisi.");
      return;
    }

    await loadCommissions();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
            Komisi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Catatan komisi manual untuk transaksi properti yang berhasil.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Tambah Komisi
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Manual Commission Record</p>
            <p className="mt-1 leading-6">
              Halaman ini mencatat komisi agent secara manual.
              Pembayaran komisi saat ini masih dilakukan di luar sistem TETAMO.
            </p>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title="Total Komisi"
          value={formatCurrency(summary.totalCommission)}
          icon={<TrendingUp className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
        <StatCard
          title="Sudah Dibayar"
          value={formatCurrency(summary.paidCommission)}
          icon={<CheckCircle2 className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
        <StatCard
          title="Masih Pending"
          value={formatCurrency(summary.pendingCommission)}
          icon={<Clock className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
        <StatCard
          title="Total Records"
          value={summary.totalRecords}
          icon={<Wallet className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6 xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                Riwayat Komisi
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Semua record komisi yang Anda input manual.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700 sm:text-xs">
              Supabase Live
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-sm text-gray-500">
              Loading komisi...
            </div>
          ) : records.length === 0 ? (
            <div className="py-8 text-sm text-gray-500">
              Belum ada record komisi. Klik <span className="font-semibold">Tambah Komisi</span> untuk mulai mencatat.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {records.map((item) => {
                const ui = statusUI(item.status);

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
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${ui.className}`}
                          >
                            {ui.label}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-gray-500">
                          Kode: {item.listing_code || "-"}
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-gray-500">Client</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {item.client_name}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Deal Type</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {dealTypeLabel(item.deal_type)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Deal Value</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {formatCurrency(item.deal_value)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Rate</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {Number(item.commission_rate || 0)}%
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Deal Date</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {formatDate(item.deal_date)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Paid Date</p>
                            <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                              {formatDate(item.paid_date)}
                            </p>
                          </div>
                        </div>

                        {item.notes ? (
                          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">Notes</p>
                            <p className="mt-1 whitespace-pre-line text-sm leading-6 text-gray-700">
                              {item.notes}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:w-[240px]">
                        <p className="text-xs text-gray-500">Komisi</p>
                        <p className="mt-2 text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                          {formatCurrency(item.commission_amount)}
                        </p>

                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-xs text-gray-500">
                              Payment Method
                            </p>
                            <p className="mt-1 break-words text-sm font-medium text-[#1C1C1E]">
                              {item.payment_method || "-"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500">Reference</p>
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
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
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
              Ringkasan
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Komisi Terbesar</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {formatCurrency(
                    Math.max(0, ...records.map((item) => Number(item.commission_amount || 0)))
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Paid Records</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {records.filter((item) => item.status === "paid").length} transaksi
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Pending Records</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {
                    records.filter((item) =>
                      ["pending", "waiting_confirmation", "approved"].includes(item.status)
                    ).length
                  }{" "}
                  transaksi
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <FileText className="h-5 w-5 text-[#1C1C1E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1C1C1E]">
                  Cara Pakai
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
              <p>1. Klik <span className="font-semibold">Tambah Komisi</span>.</p>
              <p>2. Isi detail deal, client, rate, dan status.</p>
              <p>3. Simpan sebagai record manual.</p>
              <p>4. Edit status saat komisi dibayar atau berubah.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <AlertCircle className="h-5 w-5 text-[#1C1C1E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1C1C1E]">
                  Catatan Penting
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
              <p>Halaman ini belum terhubung ke payout otomatis TETAMO.</p>
              <p>Semua komisi di sini adalah record manual agent.</p>
              <p>Pembayaran masih dilakukan di luar platform.</p>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={closeModal}
            className="absolute inset-0 bg-black/50"
            aria-label="Close modal"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[#1C1C1E]">
                {editingId ? "Edit Komisi" : "Tambah Komisi"}
              </h3>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-2 text-[#1C1C1E] hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  Listing Code
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
                  Property Title *
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
                  Client Name *
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
                  Client Phone
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
                  Client Email
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
                  Deal Type
                </label>
                <select
                  value={form.dealType}
                  onChange={(e) =>
                    updateForm("dealType", e.target.value as CommissionDealType)
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                >
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                  <option value="renewal">Renewal</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  Deal Value *
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
                  Commission Rate (%) *
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
                  <option value="pending">Pending</option>
                  <option value="waiting_confirmation">Waiting Confirmation</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  Deal Date
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
                  Paid Date
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
                  Payment Method
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
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={form.paymentReference}
                  onChange={(e) => updateForm("paymentReference", e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1C1C1E]">
                  Notes
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
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update Komisi" : "Simpan Komisi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}