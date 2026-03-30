"use client";

import { useMemo } from "react";
import type { ElementType } from "react";
import {
  CreditCard,
  RefreshCcw,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { AGENT_PACKAGES } from "@/app/data/pricelist";

type BillingItem = {
  id: string;
  title: string;
  amount: number;
  status: "paid" | "pending" | "failed";
  gateway: string;
  createdAt: string;
};

function StatCard({
  title,
  value,
  Icon,
}: {
  title: string;
  value: string | number;
  Icon: ElementType;
}) {
  const isLongText = typeof value === "string" && value.length > 12;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p
            className={[
              "mt-2 font-semibold text-[#1C1C1E] break-words leading-tight",
              isLongText ? "text-xl" : "text-3xl",
            ].join(" ")}
          >
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-5 w-5 text-[#1C1C1E]" />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function paymentStatusUI(status: BillingItem["status"]) {
  if (status === "paid") {
    return {
      label: "Paid",
      className: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "pending") {
    return {
      label: "Pending",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  return {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  };
}

export default function AgentTagihanPage() {
  const membership = AGENT_PACKAGES[0];

  // sementara kosong dulu sampai source payment real sudah kita wire
  const billingHistory: BillingItem[] = [];

  const summary = useMemo(() => {
    const paidCount = billingHistory.filter((item) => item.status === "paid").length;
    const pendingCount = billingHistory.filter(
      (item) => item.status === "pending"
    ).length;

    const lastPaid = billingHistory.find((item) => item.status === "paid");

    return {
      totalInvoices: billingHistory.length,
      paidCount,
      pendingCount,
      lastPaidAmount: lastPaid ? formatCurrency(lastPaid.amount) : "-",
    };
  }, [billingHistory]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Tagihan</h1>
        <p className="text-sm text-gray-500">
          Kelola membership, status tagihan, dan riwayat pembayaran Anda.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Membership"
          value={membership.name}
          Icon={ShieldCheck}
        />
        <StatCard
          title="Tagihan Dibayar"
          value={summary.paidCount}
          Icon={CreditCard}
        />
        <StatCard
          title="Tagihan Pending"
          value={summary.pendingCount}
          Icon={RefreshCcw}
        />
        <StatCard
          title="Pembayaran Terakhir"
          value={summary.lastPaidAmount}
          Icon={FileText}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1C1C1E]">
                Membership Agent
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Ringkasan paket membership agent yang sedang digunakan.
              </p>
            </div>

            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
              Belum tersambung ke data billing
            </span>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xl font-semibold text-[#1C1C1E]">
                  {membership.name}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {membership.paymentDescription}
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500">Harga Membership</p>
                <p className="text-2xl font-bold text-[#1C1C1E]">
                  {formatCurrency(membership.priceIdr)}
                </p>
                <p className="text-xs text-gray-500">
                  {membership.durationDays} hari
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Status</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  Menunggu data pembayaran
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Auto Renew</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {membership.autoRenewDefault ? "Aktif (Default)" : "Nonaktif"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Maks Listing</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {membership.maxListings} listing
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Maks Featured</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {membership.maxFeaturedListings} featured listing
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-[#1C1C1E]">
                Yang Anda Dapatkan
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {membership.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                  >
                    <span className="mt-0.5 text-green-600">✓</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">
            Status Tagihan
          </h2>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Tagihan Terakhir</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">Belum ada</p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Renewal Berikutnya</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">-</p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Metode Pembayaran</p>
              <p className="mt-1 font-semibold text-[#1C1C1E]">-</p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Catatan</p>
              <p className="mt-1 text-sm text-gray-600">
                Halaman ini sudah siap. Tinggal kita sambungkan ke source payment
                real agar status membership, renewal, dan invoice history muncul otomatis.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">
            Riwayat Pembayaran
          </h2>
          <p className="text-sm text-gray-500">
            Daftar invoice dan pembayaran membership atau add-on Anda.
          </p>
        </div>

        {billingHistory.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Belum ada riwayat pembayaran yang ditampilkan.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {billingHistory.map((item) => {
              const ui = paymentStatusUI(item.status);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-6 p-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium text-[#1C1C1E]">{item.title}</p>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${ui.className}`}
                      >
                        {ui.label}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.gateway} • {item.createdAt}
                    </p>
                  </div>

                  <div className="shrink-0 font-semibold text-[#1C1C1E]">
                    {formatCurrency(item.amount)}
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