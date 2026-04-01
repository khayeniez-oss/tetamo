"use client";

import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Landmark,
} from "lucide-react";

type CommissionStatus =
  | "pending"
  | "waiting_confirmation"
  | "approved"
  | "paid"
  | "cancelled";

type CommissionItem = {
  id: string;
  propertyTitle: string;
  listingCode: string;
  clientName: string;
  dealType: "Sale" | "Rent" | "Renewal";
  dealValue: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  dealDate: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
};

const COMMISSION_DATA: CommissionItem[] = [
  {
    id: "COM-001",
    propertyTitle: "Villa Modern 3 Bedroom di Canggu",
    listingCode: "TTM001",
    clientName: "Michael Tan",
    dealType: "Sale",
    dealValue: 3250000000,
    commissionRate: 2.5,
    commissionAmount: 81250000,
    status: "paid",
    dealDate: "2026-03-12",
    paidDate: "2026-03-20",
    paymentMethod: "Bank Transfer",
    notes: "Komisi dibayar langsung oleh pihak owner di luar TETAMO.",
  },
  {
    id: "COM-002",
    propertyTitle: "Rumah 2 Lantai di Maguwo",
    listingCode: "TTM013",
    clientName: "Jake",
    dealType: "Sale",
    dealValue: 1450000000,
    commissionRate: 2,
    commissionAmount: 29000000,
    status: "waiting_confirmation",
    dealDate: "2026-03-25",
    notes: "Menunggu konfirmasi pembayaran dari owner.",
  },
  {
    id: "COM-003",
    propertyTitle: "Apartment 2 Bedroom di Seminyak",
    listingCode: "TTM021",
    clientName: "Sarah Lim",
    dealType: "Rent",
    dealValue: 180000000,
    commissionRate: 5,
    commissionAmount: 9000000,
    status: "approved",
    dealDate: "2026-03-28",
    notes: "Komisi disetujui, pembayaran belum diterima.",
  },
  {
    id: "COM-004",
    propertyTitle: "Ruko Strategis di Denpasar",
    listingCode: "TTM031",
    clientName: "Budi Santoso",
    dealType: "Renewal",
    dealValue: 95000000,
    commissionRate: 4,
    commissionAmount: 3800000,
    status: "pending",
    dealDate: "2026-03-30",
    notes: "Masih dicatat sebagai komisi manual.",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string) {
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

  return {
    label: "Pending",
    className: "border-gray-200 bg-gray-100 text-gray-700",
  };
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 sm:text-sm">{title}</p>
          <p className="mt-2 break-words text-2xl font-semibold leading-none text-[#1C1C1E] sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AgentKomisiPage() {
  const paidTotal = COMMISSION_DATA.filter((item) => item.status === "paid").reduce(
    (sum, item) => sum + item.commissionAmount,
    0
  );

  const pendingTotal = COMMISSION_DATA.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "waiting_confirmation" ||
      item.status === "approved"
  ).reduce((sum, item) => sum + item.commissionAmount, 0);

  const thisMonthTotal = COMMISSION_DATA.reduce(
    (sum, item) => sum + item.commissionAmount,
    0
  );

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
          Komisi
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Catatan komisi manual untuk transaksi properti yang berhasil.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Manual Commission Record</p>
            <p className="mt-1 leading-6">
              Halaman ini digunakan untuk mencatat komisi agent secara manual.
              Pembayaran komisi saat ini masih dilakukan di luar sistem TETAMO.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Komisi"
          value={formatCurrency(thisMonthTotal)}
          icon={<TrendingUp className="h-5 w-5 text-[#1C1C1E]" />}
        />
        <StatCard
          title="Sudah Dibayar"
          value={formatCurrency(paidTotal)}
          icon={<CheckCircle2 className="h-5 w-5 text-[#1C1C1E]" />}
        />
        <StatCard
          title="Masih Pending"
          value={formatCurrency(pendingTotal)}
          icon={<Clock className="h-5 w-5 text-[#1C1C1E]" />}
        />
        <StatCard
          title="Total Records"
          value={COMMISSION_DATA.length}
          icon={<Wallet className="h-5 w-5 text-[#1C1C1E]" />}
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
                Daftar komisi yang dicatat manual oleh agent.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700 sm:text-xs">
              Record Only
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {COMMISSION_DATA.map((item) => {
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
                          {item.propertyTitle}
                        </p>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${ui.className}`}
                        >
                          {ui.label}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        Kode: {item.listingCode}
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-gray-500">Client</p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {item.clientName}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Deal Type</p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {item.dealType}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Deal Value</p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {formatCurrency(item.dealValue)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Rate</p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {item.commissionRate}%
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Deal Date</p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {formatDate(item.dealDate)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Paid Date</p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {formatDate(item.paidDate)}
                          </p>
                        </div>
                      </div>

                      {item.notes ? (
                        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">Notes</p>
                          <p className="mt-1 text-sm leading-6 text-gray-700">
                            {item.notes}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:w-[240px]">
                      <p className="text-xs text-gray-500">Komisi</p>
                      <p className="mt-2 text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                        {formatCurrency(item.commissionAmount)}
                      </p>

                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            Payment Method
                          </p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {item.paymentMethod || "-"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">Record ID</p>
                          <p className="mt-1 text-sm font-medium text-[#1C1C1E]">
                            {item.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                    Math.max(...COMMISSION_DATA.map((item) => item.commissionAmount))
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Paid Records</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {
                    COMMISSION_DATA.filter((item) => item.status === "paid")
                      .length
                  }{" "}
                  transaksi
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Pending Records</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {
                    COMMISSION_DATA.filter(
                      (item) =>
                        item.status === "pending" ||
                        item.status === "waiting_confirmation" ||
                        item.status === "approved"
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
                <Landmark className="h-5 w-5 text-[#1C1C1E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1C1C1E]">
                  Catatan Penting
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-6 text-gray-600">
              <p>
                Halaman ini belum terhubung ke sistem payout otomatis TETAMO.
              </p>
              <p>
                Semua komisi yang tampil di sini berfungsi sebagai catatan manual
                agent untuk tracking transaksi yang berhasil.
              </p>
              <p>
                Pembayaran komisi masih dilakukan langsung antara pihak terkait di
                luar platform.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <FileText className="h-5 w-5 text-[#1C1C1E]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#1C1C1E]">
                  Next Step
                </h2>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-600">
              Nanti halaman ini bisa dihubungkan ke Supabase untuk create, edit,
              update status, dan upload bukti pembayaran komisi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}