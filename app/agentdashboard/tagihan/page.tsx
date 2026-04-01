"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ElementType } from "react";
import {
  CreditCard,
  RefreshCcw,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { AGENT_PACKAGES } from "@/app/data/pricelist";
import { useAgentProfile } from "../layout";

type BillingStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

type PaymentRow = {
  id: string;
  product_id: string | null;
  product_type: string | null;
  flow: string | null;
  amount: number | null;
  currency: string | null;
  status: BillingStatus | null;
  gateway: string | null;
  payment_method: string | null;
  checkout_url: string | null;
  gateway_reference: string | null;
  auto_renew: boolean | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

type BillingItem = {
  id: string;
  title: string;
  amount: number;
  status: BillingStatus;
  gateway: string;
  paymentMethod: string;
  createdAt: string;
  paidAt: string | null;
  checkoutUrl: string;
  autoRenew: boolean;
  productId: string;
  productType: string;
  flow: string;
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 sm:text-sm">{title}</p>
          <p
            className={[
              "mt-2 break-words font-semibold leading-tight text-[#1C1C1E]",
              isLongText ? "text-base sm:text-lg" : "text-2xl sm:text-3xl",
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

function addDays(dateValue: string, days: number) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";
  d.setDate(d.getDate() + days);
  return formatDate(d.toISOString());
}

function normalizeStatus(value?: string | null): BillingStatus {
  const v = String(value || "").toLowerCase();

  if (
    v === "paid" ||
    v === "failed" ||
    v === "expired" ||
    v === "cancelled" ||
    v === "refunded"
  ) {
    return v;
  }

  return "pending";
}

function paymentStatusUI(status: BillingStatus) {
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

  if (status === "expired") {
    return {
      label: "Expired",
      className: "bg-orange-50 text-orange-700 border-orange-200",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  if (status === "refunded") {
    return {
      label: "Refunded",
      className: "bg-sky-50 text-sky-700 border-sky-200",
    };
  }

  return {
    label: "Failed",
    className: "bg-red-50 text-red-700 border-red-200",
  };
}

function humanizeGateway(value?: string | null) {
  if (!value) return "-";
  if (value.toLowerCase() === "stripe") return "Stripe";
  if (value.toLowerCase() === "xendit") return "Xendit";
  return value;
}

function humanizePaymentMethod(value?: string | null) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "card") return "Card";
  if (v === "bank_transfer") return "Bank Transfer";
  if (v === "virtual_account") return "Virtual Account";
  if (v === "qris") return "QRIS";
  if (v === "ewallet") return "E-Wallet";

  return value;
}

function buildBillingTitle(row: PaymentRow) {
  const productType = String(row.product_type || "").toLowerCase();
  const productId = String(row.product_id || "").toLowerCase();
  const flow = String(row.flow || "").toLowerCase();

  if (productType === "membership") {
    const matchedPackage = AGENT_PACKAGES.find((pkg) => pkg.id === productId);
    return matchedPackage?.name || "Membership Agent";
  }

  if (productType === "addon") {
    if (productId === "boost-listing") return "Boost Listing";
    if (productId === "homepage-spotlight") return "Homepage Spotlight";
    return "Add-On";
  }

  if (flow === "renew-listing") {
    return "Renew Listing";
  }

  return "Pembayaran Listing";
}

function AgentTagihanPageContent() {
  const sp = useSearchParams();
  const { userId } = useAgentProfile();

  const [billingHistory, setBillingHistory] = useState<BillingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const paymentState = sp.get("payment");
  const justPaid = paymentState === "success";
  const justCancelled = paymentState === "cancelled";

  useEffect(() => {
    let ignore = false;

    async function loadPayments() {
      if (!userId) {
        setBillingHistory([]);
        setLoading(false);
        setErrorMessage("User agent tidak ditemukan.");
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("payments")
        .select(
          "id, product_id, product_type, flow, amount, currency, status, gateway, payment_method, checkout_url, gateway_reference, auto_renew, paid_at, expires_at, created_at"
        )
        .eq("user_id", userId)
        .eq("user_type", "agent")
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (error) {
        setBillingHistory([]);
        setLoading(false);
        setErrorMessage(error.message || "Gagal memuat tagihan.");
        return;
      }

      const mapped: BillingItem[] = ((data || []) as PaymentRow[]).map((row) => ({
        id: row.id,
        title: buildBillingTitle(row),
        amount: Number(row.amount || 0),
        status: normalizeStatus(row.status),
        gateway: humanizeGateway(row.gateway),
        paymentMethod: humanizePaymentMethod(row.payment_method),
        createdAt: formatDate(row.created_at),
        paidAt: row.paid_at,
        checkoutUrl: row.checkout_url || "",
        autoRenew: Boolean(row.auto_renew),
        productId: row.product_id || "",
        productType: row.product_type || "",
        flow: row.flow || "",
      }));

      setBillingHistory(mapped);
      setLoading(false);
    }

    loadPayments();

    return () => {
      ignore = true;
    };
  }, [userId]);

  const latestMembershipPayment = useMemo(() => {
    return billingHistory.find(
      (item) => item.productType.toLowerCase() === "membership"
    );
  }, [billingHistory]);

  const latestPaidMembership = useMemo(() => {
    return billingHistory.find(
      (item) =>
        item.productType.toLowerCase() === "membership" && item.status === "paid"
    );
  }, [billingHistory]);

  const membership = useMemo(() => {
    const productId = latestMembershipPayment?.productId || "";
    return (
      AGENT_PACKAGES.find((pkg) => pkg.id === productId) || AGENT_PACKAGES[0]
    );
  }, [latestMembershipPayment]);

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

  const membershipStatus = useMemo(() => {
    if (latestPaidMembership) return "Aktif";
    if (latestMembershipPayment?.status === "pending") return "Pending Payment";
    if (latestMembershipPayment?.status === "failed") return "Failed";
    if (latestMembershipPayment?.status === "cancelled") return "Cancelled";
    if (latestMembershipPayment?.status === "expired") return "Expired";
    return "Belum ada pembayaran";
  }, [latestMembershipPayment, latestPaidMembership]);

  const nextRenewal = useMemo(() => {
    if (!latestPaidMembership?.paidAt) return "-";
    return addDays(latestPaidMembership.paidAt, membership.durationDays);
  }, [latestPaidMembership, membership.durationDays]);

  const latestPaymentMethod = useMemo(() => {
    if (!latestMembershipPayment) return "-";
    return `${latestMembershipPayment.paymentMethod} • ${latestMembershipPayment.gateway}`;
  }, [latestMembershipPayment]);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
          Tagihan
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola membership, status tagihan, dan riwayat pembayaran Anda.
        </p>
      </div>

      {justPaid ? (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Pembayaran berhasil dibuat. Status akan berubah setelah pembayaran terkonfirmasi.
        </div>
      ) : null}

      {justCancelled ? (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          Pembayaran dibatalkan atau belum diselesaikan.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Membership" value={membership.name} Icon={ShieldCheck} />
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

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6 xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                Membership Agent
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Ringkasan paket membership agent yang sedang digunakan.
              </p>
            </div>

            <span className="inline-flex w-fit items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700 sm:text-xs">
              Tersambung ke data billing
            </span>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                  {membership.name}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {membership.paymentDescription}
                </p>
              </div>

              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500">Harga Membership</p>
                <p className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                  {formatCurrency(membership.priceIdr)}
                </p>
                <p className="text-xs text-gray-500">
                  {membership.durationDays} hari
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Status</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {loading ? "Loading..." : membershipStatus}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Auto Renew</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {latestMembershipPayment
                    ? latestMembershipPayment.autoRenew
                      ? "Aktif"
                      : "Nonaktif"
                    : membership.autoRenewDefault
                    ? "Aktif (Default)"
                    : "Nonaktif"}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Maks Listing</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {membership.maxListings} listing
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Maks Featured</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {membership.maxFeaturedListings} featured listing
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-[#1C1C1E]">
                Yang Anda Dapatkan
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">
            Status Tagihan
          </h2>

          <div className="mt-5 space-y-3 sm:space-y-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Tagihan Terakhir</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {latestMembershipPayment
                  ? formatCurrency(latestMembershipPayment.amount)
                  : "Belum ada"}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Renewal Berikutnya</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {nextRenewal}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Metode Pembayaran</p>
              <p className="mt-1 break-words text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {latestPaymentMethod}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Catatan</p>
              <p className="mt-1 text-sm text-gray-600">
                Status pembayaran agent sekarang diambil langsung dari tabel payments.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-5 md:p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">
            Riwayat Pembayaran
          </h2>
          <p className="text-sm text-gray-500">
            Daftar invoice dan pembayaran membership atau add-on Anda.
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-gray-500 sm:p-8">
            Loading riwayat pembayaran...
          </div>
        ) : billingHistory.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 sm:p-8">
            Belum ada riwayat pembayaran yang ditampilkan.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {billingHistory.map((item) => {
              const ui = paymentStatusUI(item.status);

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-4 p-4 sm:p-5 md:p-6 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <p className="text-sm font-medium text-[#1C1C1E] sm:text-base">
                        {item.title}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold ${ui.className}`}
                      >
                        {ui.label}
                      </span>
                    </div>

                    <p className="mt-1 break-words text-xs text-gray-500 sm:text-sm">
                      {item.gateway} • {item.paymentMethod} • {item.createdAt}
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:w-auto lg:justify-end">
                    <div className="shrink-0 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {formatCurrency(item.amount)}
                    </div>

                    {item.status === "pending" && item.checkoutUrl ? (
                      <a
                        href={item.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Lanjutkan Bayar
                      </a>
                    ) : null}
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

export default function AgentTagihanPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading tagihan...
        </div>
      }
    >
      <AgentTagihanPageContent />
    </Suspense>
  );
}