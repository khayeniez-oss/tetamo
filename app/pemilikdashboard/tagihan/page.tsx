"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useOwnerProfile } from "../layout";
import { useLanguage } from "@/app/context/LanguageContext";

type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded";

type PaymentRow = {
  id: string;
  flow: string | null;
  product_id: string | null;
  product_type: string | null;
  listing_code: string | null;
  amount: number | null;
  currency: string | null;
  status: PaymentStatus | null;
  gateway: string | null;
  payment_method: string | null;
  checkout_url: string | null;
  gateway_reference: string | null;
  auto_renew: boolean | null;
  paid_at: string | null;
  expires_at: string | null;
  created_at: string | null;
};

type PropertyLookupRow = {
  kode: string | null;
  title: string | null;
};

type BillingItem = {
  id: string;
  title: string;
  listingCode: string;
  flow: string;
  productId: string;
  productType: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gateway: string;
  paymentMethod: string;
  checkoutUrl: string;
  autoRenew: boolean;
  gatewayReference: string;
  paidAt: string | null;
  expiresAt: string | null;
  createdAtRaw: string | null;
  createdAtLabel: string;
};

function normalizeStatus(value?: string | null): PaymentStatus {
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

function formatCurrency(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  }
}

function formatDateTime(
  dateString: string | null | undefined,
  locale: string
) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function buildOwnerTitle(
  row: PaymentRow,
  propertyTitle: string | null | undefined,
  lang: "id" | "en"
) {
  if (propertyTitle) return propertyTitle;

  const productType = String(row.product_type || "").toLowerCase();
  const productId = String(row.product_id || "").toLowerCase();
  const flow = String(row.flow || "").toLowerCase();

  if (productType === "addon") {
    if (productId === "boost-listing") {
      return lang === "id" ? "Boost Listing" : "Listing Boost";
    }
    if (productId === "homepage-spotlight") {
      return "Homepage Spotlight";
    }
    return lang === "id" ? "Add-On Listing" : "Listing Add-On";
  }

  if (flow === "renew-listing") {
    return lang === "id" ? "Perpanjangan Listing" : "Listing Renewal";
  }

  return lang === "id" ? "Listing Baru" : "New Listing";
}

function buildTypeLabel(bill: BillingItem, lang: "id" | "en") {
  const productType = bill.productType.toLowerCase();
  const productId = bill.productId.toLowerCase();
  const flow = bill.flow.toLowerCase();

  if (productType === "addon") {
    if (productId === "boost-listing") {
      return lang === "id" ? "BOOST LISTING" : "LISTING BOOST";
    }
    if (productId === "homepage-spotlight") {
      return "HOMEPAGE SPOTLIGHT";
    }
    return "ADD-ON";
  }

  if (flow === "renew-listing") {
    return lang === "id" ? "PERPANJANGAN" : "RENEWAL";
  }

  return lang === "id" ? "LISTING BARU" : "NEW LISTING";
}

function getBillStatusUI(status: PaymentStatus, lang: "id" | "en") {
  if (status === "paid") {
    return {
      label: "Paid",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "pending") {
    return {
      label: "Pending",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "expired") {
    return {
      label: lang === "id" ? "Kadaluarsa" : "Expired",
      badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    };
  }

  if (status === "cancelled") {
    return {
      label: lang === "id" ? "Dibatalkan" : "Cancelled",
      badgeClass: "bg-gray-50 text-gray-700 border-gray-200",
    };
  }

  if (status === "refunded") {
    return {
      label: "Refunded",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  return {
    label: lang === "id" ? "Gagal" : "Failed",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  };
}

function getActionLabel(bill: BillingItem, lang: "id" | "en") {
  if (bill.status === "pending" && bill.checkoutUrl) {
    return lang === "id" ? "Lanjutkan Bayar" : "Continue Payment";
  }

  if (bill.status === "paid") return lang === "id" ? "Berhasil Dibayar" : "Paid";
  if (bill.status === "expired") return lang === "id" ? "Kadaluarsa" : "Expired";
  if (bill.status === "failed") return lang === "id" ? "Gagal" : "Failed";
  if (bill.status === "cancelled") return lang === "id" ? "Dibatalkan" : "Cancelled";
  if (bill.status === "refunded") return "Refunded";

  return lang === "id" ? "Link Tidak Tersedia" : "Link Unavailable";
}

export default function PemilikTagihanPage() {
  const { userId, loadingProfile } = useOwnerProfile();
  const sp = useSearchParams();
  const { lang } = useLanguage();

  const locale = lang === "id" ? "id-ID" : "en-US";

  const t =
    lang === "id"
      ? {
          pageTitle: "Tagihan",
          pageSubtitle:
            "Riwayat pembayaran listing, perpanjangan, boost, spotlight, dan percobaan pembayaran Anda.",
          totalRecords: "Total Tagihan",
          totalPaid: "Total Paid",
          totalPending: "Total Pending",
          latestSuccessfulPayment: "Pembayaran Sukses Terakhir",
          loadingBills: "Loading tagihan...",
          loadFailed: "Gagal memuat tagihan:",
          noBills: "Belum ada tagihan untuk akun ini.",
          historyTitle: "Riwayat Tagihan",
          createdAt: "Dibuat",
          paidAt: "Dibayar",
          expiresAt: "Expired checkout",
          code: "Kode",
          type: "Jenis",
          gateway: "Gateway",
          method: "Metode",
          reference: "Reference",
          autoRenew: "Auto Renew",
          active: "Aktif",
          inactive: "Nonaktif",
          continuePaymentMissing:
            "Checkout URL belum tersedia untuk tagihan ini.",
          paidSuccessBanner:
            "Pembayaran berhasil dibuat. Status akan berubah setelah pembayaran terkonfirmasi.",
          cancelledBanner:
            "Pembayaran dibatalkan atau belum diselesaikan.",
          noteTitle: "Catatan",
          noteBody:
            "Setiap baris di bawah adalah satu catatan pembayaran atau satu attempt pembayaran. Jadi satu listing bisa memiliki lebih dari satu riwayat jika Anda pernah mencoba ulang, membuat checkout baru, gagal, expired, atau berhasil membayar lebih dari satu produk seperti renew, boost, atau spotlight.",
        }
      : {
          pageTitle: "Billing",
          pageSubtitle:
            "Your listing payments, renewals, boosts, spotlights, and payment attempt history.",
          totalRecords: "Total Records",
          totalPaid: "Total Paid",
          totalPending: "Total Pending",
          latestSuccessfulPayment: "Latest Successful Payment",
          loadingBills: "Loading billing history...",
          loadFailed: "Failed to load billing:",
          noBills: "There are no billing records for this account yet.",
          historyTitle: "Billing History",
          createdAt: "Created",
          paidAt: "Paid",
          expiresAt: "Checkout Expires",
          code: "Code",
          type: "Type",
          gateway: "Gateway",
          method: "Method",
          reference: "Reference",
          autoRenew: "Auto Renew",
          active: "Active",
          inactive: "Inactive",
          continuePaymentMissing:
            "Checkout URL is not available for this billing record.",
          paidSuccessBanner:
            "The payment record has been created. The status will change after the payment is confirmed.",
          cancelledBanner:
            "The payment was cancelled or has not been completed.",
          noteTitle: "Note",
          noteBody:
            "Each row below is one payment record or one payment attempt. So one listing can have more than one history entry if you retried, created a new checkout, failed, expired, or successfully paid for more than one product such as renewal, boost, or spotlight.",
        };

  const [bills, setBills] = useState<BillingItem[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const justPaid = sp.get("payment") === "success";
  const justCancelled = sp.get("payment") === "cancelled";

  useEffect(() => {
    let ignore = false;

    async function loadBills() {
      if (!userId) {
        setBills([]);
        setLoadingBills(false);
        return;
      }

      setLoadingBills(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("payments")
        .select(
          "id, flow, product_id, product_type, listing_code, amount, currency, status, gateway, payment_method, checkout_url, gateway_reference, auto_renew, paid_at, expires_at, created_at"
        )
        .eq("user_id", userId)
        .eq("user_type", "owner")
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (error) {
        setBills([]);
        setLoadingBills(false);
        setErrorMessage(error.message || "Failed to load billing.");
        return;
      }

      const paymentRows = (data || []) as PaymentRow[];

      const listingCodes = Array.from(
        new Set(
          paymentRows
            .map((item) => item.listing_code)
            .filter((item): item is string => Boolean(item))
        )
      );

      let propertyMap = new Map<string, string>();

      if (listingCodes.length > 0) {
        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("kode, title")
          .in("kode", listingCodes);

        if (!ignore && propertyError) {
          setBills([]);
          setLoadingBills(false);
          setErrorMessage(
            propertyError.message || "Failed to load property title."
          );
          return;
        }

        propertyMap = new Map(
          ((propertyData || []) as PropertyLookupRow[])
            .filter((item) => item.kode)
            .map((item) => [
              String(item.kode),
              item.title ||
                (lang === "id"
                  ? "Tanpa Judul Properti"
                  : "Untitled Property"),
            ])
        );
      }

      const mapped: BillingItem[] = paymentRows.map((row) => {
        const listingCode = row.listing_code || "-";
        const propertyTitle = row.listing_code
          ? propertyMap.get(row.listing_code) || null
          : null;

        return {
          id: row.id,
          title: buildOwnerTitle(row, propertyTitle, lang),
          listingCode,
          flow: row.flow || "",
          productId: row.product_id || "",
          productType: row.product_type || "",
          amount: Number(row.amount || 0),
          currency: row.currency || "IDR",
          status: normalizeStatus(row.status),
          gateway: humanizeGateway(row.gateway),
          paymentMethod: humanizePaymentMethod(row.payment_method),
          checkoutUrl: row.checkout_url || "",
          autoRenew: Boolean(row.auto_renew),
          gatewayReference: row.gateway_reference || "-",
          paidAt: row.paid_at,
          expiresAt: row.expires_at,
          createdAtRaw: row.created_at,
          createdAtLabel: formatDateTime(row.created_at, locale),
        };
      });

      setBills(mapped);
      setLoadingBills(false);
    }

    if (!loadingProfile) {
      loadBills();
    }

    return () => {
      ignore = true;
    };
  }, [userId, loadingProfile, lang, locale]);

  const totalPaidAmount = useMemo(() => {
    return bills
      .filter((bill) => bill.status === "paid")
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  }, [bills]);

  const totalPendingAmount = useMemo(() => {
    return bills
      .filter((bill) => bill.status === "pending")
      .reduce((sum, bill) => sum + Number(bill.amount || 0), 0);
  }, [bills]);

  const latestPaidBill = useMemo(() => {
    return bills.find((bill) => bill.status === "paid") || null;
  }, [bills]);

  const handleContinuePayment = (bill: BillingItem) => {
    if (!bill.checkoutUrl) {
      alert(t.continuePaymentMissing);
      return;
    }

    window.open(bill.checkoutUrl, "_blank", "noopener,noreferrer");
  };

  const isLoading = loadingProfile || loadingBills;

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
          {t.pageTitle}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t.pageSubtitle}</p>
      </div>

      {justPaid ? (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {t.paidSuccessBanner}
        </div>
      ) : null}

      {justCancelled ? (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          {t.cancelledBanner}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 sm:text-sm">{t.totalRecords}</p>
          <p className="mt-2 text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
            {bills.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 sm:text-sm">{t.totalPaid}</p>
          <p className="mt-2 break-words text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
            {formatCurrency(totalPaidAmount, "IDR", locale)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 sm:text-sm">{t.totalPending}</p>
          <p className="mt-2 break-words text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
            {formatCurrency(totalPendingAmount, "IDR", locale)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 sm:text-sm">
            {t.latestSuccessfulPayment}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#1C1C1E] sm:text-base">
            {latestPaidBill
              ? formatDateTime(latestPaidBill.paidAt, locale)
              : "-"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <h2 className="font-semibold text-[#1C1C1E]">{t.historyTitle}</h2>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">{t.loadingBills}</div>
        ) : errorMessage ? (
          <div className="p-4 text-sm text-red-600 sm:p-6">
            {t.loadFailed} {errorMessage}
          </div>
        ) : bills.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">{t.noBills}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {bills.map((bill) => {
              const ui = getBillStatusUI(bill.status, lang);
              const actionLabel = getActionLabel(bill, lang);

              return (
                <div
                  key={bill.id}
                  className="flex flex-col gap-4 p-4 sm:p-6 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${ui.badgeClass}`}
                      >
                        {ui.label}
                      </span>

                      <div className="text-xs text-gray-500">
                        {bill.status === "paid"
                          ? `${t.paidAt}: ${formatDateTime(
                              bill.paidAt,
                              locale
                            )}`
                          : `${t.createdAt}: ${bill.createdAtLabel}`}
                      </div>
                    </div>

                    <p className="mt-3 break-words text-sm font-medium text-[#1C1C1E] sm:text-base">
                      {bill.title}
                    </p>

                    <p className="text-sm text-gray-500">
                      {formatCurrency(bill.amount, bill.currency, locale)}
                    </p>

                    <div className="mt-3 text-xs leading-5 text-gray-500">
                      {t.code}: {bill.listingCode} • {t.type}:{" "}
                      {buildTypeLabel(bill, lang)}
                    </div>

                    <div className="mt-1 text-xs leading-5 text-gray-500">
                      {t.gateway}: {bill.gateway} • {t.method}:{" "}
                      {bill.paymentMethod}
                    </div>

                    <div className="mt-1 break-all text-xs leading-5 text-gray-500">
                      {t.reference}: {bill.gatewayReference}
                    </div>

                    <div className="mt-1 text-xs leading-5 text-gray-500">
                      {t.autoRenew}: {bill.autoRenew ? t.active : t.inactive}
                    </div>

                    {bill.expiresAt ? (
                      <div className="mt-1 text-xs leading-5 text-gray-500">
                        {t.expiresAt}: {formatDateTime(bill.expiresAt, locale)}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                    {bill.status === "pending" && bill.checkoutUrl ? (
                      <button
                        onClick={() => handleContinuePayment(bill)}
                        className="rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm text-white hover:opacity-90"
                      >
                        {actionLabel}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-400 disabled:cursor-not-allowed"
                      >
                        {actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {bills.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-sm text-gray-500">{t.noteTitle}</p>
          <p className="mt-2 text-sm leading-6 text-gray-700">{t.noteBody}</p>
        </div>
      ) : null}
    </div>
  );
}