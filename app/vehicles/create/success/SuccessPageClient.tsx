"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type PaymentStatus =
  | "pending"
  | "checkout_created"
  | "paid"
  | "failed"
  | "expired"
  | "canceled"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

type PaymentRow = {
  id: string;
  source_role: string | null;
  payment_type: string | null;
  product_id: string | null;
  product_name_snapshot: string | null;
  product_type: string | null;
  property_code_snapshot: string | null;
  amount_total: number | null;
  currency: string | null;
  status: PaymentStatus | null;
  checkout_url: string | null;
  stripe_checkout_session_id: string | null;
  paid_at: string | null;
  checkout_expires_at: string | null;
  created_at: string | null;
  receipt_url: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  metadata: Record<string, any> | null;
};

function formatCurrency(
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale: string
) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: (currency || "IDR").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `Rp ${(amount || 0).toLocaleString("id-ID")}`;
  }
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeStatus(value?: string | null): PaymentStatus {
  const v = String(value || "").toLowerCase();

  if (
    v === "checkout_created" ||
    v === "paid" ||
    v === "failed" ||
    v === "expired" ||
    v === "canceled" ||
    v === "cancelled" ||
    v === "refunded" ||
    v === "partially_refunded"
  ) {
    return v as PaymentStatus;
  }

  return "pending";
}

function humanizePaymentMethod() {
  return "Debit / Credit Card";
}

function getStateUI(args: {
  returnedFromSuccess: boolean;
  status: PaymentStatus;
  lang: "id" | "en";
}) {
  const { returnedFromSuccess, status, lang } = args;

  if (returnedFromSuccess || status === "paid") {
    return {
      icon: "✓",
      title: lang === "id" ? "Pembayaran Berhasil" : "Payment Successful",
      boxClass: "bg-green-50 border-green-200 text-green-700",
    };
  }

  if (status === "pending" || status === "checkout_created") {
    return {
      icon: "⏳",
      title: lang === "id" ? "Pembayaran Menunggu Konfirmasi" : "Payment Pending",
      boxClass: "bg-yellow-50 border-yellow-200 text-yellow-700",
    };
  }

  if (status === "expired") {
    return {
      icon: "!",
      title: lang === "id" ? "Pembayaran Kadaluarsa" : "Payment Expired",
      boxClass: "bg-orange-50 border-orange-200 text-orange-700",
    };
  }

  if (status === "canceled" || status === "cancelled") {
    return {
      icon: "×",
      title: lang === "id" ? "Pembayaran Dibatalkan" : "Payment Cancelled",
      boxClass: "bg-gray-100 border-gray-200 text-gray-700",
    };
  }

  if (status === "refunded" || status === "partially_refunded") {
    return {
      icon: "↺",
      title: lang === "id" ? "Pembayaran Direfund" : "Payment Refunded",
      boxClass: "bg-sky-50 border-sky-200 text-sky-700",
    };
  }

  return {
    icon: "×",
    title: lang === "id" ? "Pembayaran Gagal" : "Payment Failed",
    boxClass: "bg-red-50 border-red-200 text-red-700",
  };
}

function inferVehicleType(
  urlVehicleType: string,
  payment: PaymentRow | null
): "car" | "motor" {
  const fromUrl = String(urlVehicleType || "").toLowerCase();
  if (fromUrl === "motor") return "motor";
  if (fromUrl === "car") return "car";

  const fromMetadata = String(payment?.metadata?.vehicleType || "").toLowerCase();
  if (fromMetadata === "motor") return "motor";

  return "car";
}

function inferListingCode(payment: PaymentRow | null, urlKode: string) {
  return (
    String(payment?.property_code_snapshot || "").trim() ||
    String(payment?.metadata?.listingCode || "").trim() ||
    String(urlKode || "").trim() ||
    "-"
  );
}

function getMarketplaceHref(vehicleType: "car" | "motor") {
  return vehicleType === "motor" ? "/vehicles/motor" : "/vehicles/car";
}

function getVehicleLabel(vehicleType: "car" | "motor", lang: "id" | "en") {
  if (vehicleType === "motor") {
    return lang === "id" ? "motor" : "motorbike";
  }
  return lang === "id" ? "mobil" : "car";
}

export default function SuccessPageClient() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const currentLang: "id" | "en" = lang === "en" ? "en" : "id";
  const locale = currentLang === "id" ? "id-ID" : "en-US";

  const t =
    currentLang === "id"
      ? {
          loadingPayment: "Memuat status pembayaran...",
          statusLabel: "Status",
          amountLabel: "Jumlah",
          typeLabel: "Tipe",
          methodLabel: "Metode",
          codeLabel: "Kode Listing",
          createdLabel: "Dibuat",
          paidAtLabel: "Dibayar Pada",
          detailsTitle: "Detail Status",
          continuePayment: "Lanjutkan Pembayaran",
          seeMarketplace: "Lihat Marketplace",
          createAnother: "Buat Listing Baru",
          toVehiclePackage: "Ke Paket Kendaraan",
          receiptButton: "Lihat Receipt",
          invoiceButton: "Lihat Invoice",
          successDescription: (product: string, vehicleLabel: string, kode: string) =>
            kode && kode !== "-"
              ? `${product} berhasil dibayar. Listing ${vehicleLabel} ${kode} siap diproses dan diarahkan ke marketplace yang sesuai.`
              : `${product} berhasil dibayar. Listing ${vehicleLabel} Anda siap diproses dan diarahkan ke marketplace yang sesuai.`,
          successPoints: [
            "Pembayaran sudah tercatat",
            "Listing kendaraan sudah siap diproses",
            "Marketplace mobil / motor akan membaca tipe kendaraan yang dipilih",
          ],
          pendingDescription:
            "Pembayaran Anda masih sedang dikonfirmasi. Silakan tunggu sebentar atau lanjutkan checkout bila masih tersedia.",
          pendingPoints: [
            "Status pembayaran akan diperbarui otomatis",
            "Jika checkout masih aktif, Anda bisa lanjutkan pembayaran",
          ],
          expiredDescription:
            "Checkout pembayaran sudah kadaluarsa. Silakan kembali dan buat pembayaran baru.",
          expiredPoints: [
            "Checkout lama tidak bisa digunakan lagi",
            "Silakan mulai ulang dari flow listing kendaraan",
          ],
          cancelledDescription:
            "Pembayaran dibatalkan. Silakan kembali bila Anda ingin mencoba lagi.",
          cancelledPoints: [
            "Tidak ada aktivasi final yang dijalankan",
            "Silakan lanjutkan lagi dari flow kendaraan",
          ],
          refundedDescription:
            "Pembayaran sudah direfund. Silakan cek invoice atau receipt untuk detail refund.",
          refundedPoints: [
            "Detail refund tersedia di invoice atau receipt",
            "Hubungi admin jika Anda butuh klarifikasi lebih lanjut",
          ],
          failedDescription:
            "Pembayaran belum berhasil diselesaikan. Silakan coba lagi.",
          failedPoints: [
            "Tidak ada aktivasi final yang dijalankan",
            "Silakan ulangi dari flow listing kendaraan",
          ],
          loginFirst: "Silakan login terlebih dahulu.",
          loadPaymentError: "Gagal memuat status pembayaran.",
          paymentNotFound: "Data pembayaran tidak ditemukan.",
          successStatusText: "berhasil",
          basicFallback: "Pembayaran Listing Kendaraan",
        }
      : {
          loadingPayment: "Loading payment status...",
          statusLabel: "Status",
          amountLabel: "Amount",
          typeLabel: "Type",
          methodLabel: "Method",
          codeLabel: "Listing Code",
          createdLabel: "Created",
          paidAtLabel: "Paid At",
          detailsTitle: "Status Details",
          continuePayment: "Continue Payment",
          seeMarketplace: "See Marketplace",
          createAnother: "Create Another Listing",
          toVehiclePackage: "Go to Vehicle Package",
          receiptButton: "View Receipt",
          invoiceButton: "View Invoice",
          successDescription: (product: string, vehicleLabel: string, kode: string) =>
            kode && kode !== "-"
              ? `${product} was paid successfully. Your ${vehicleLabel} listing ${kode} is ready to be processed and routed to the correct marketplace.`
              : `${product} was paid successfully. Your ${vehicleLabel} listing is ready to be processed and routed to the correct marketplace.`,
          successPoints: [
            "Your payment has been recorded",
            "Your vehicle listing is ready to be processed",
            "The car / motorbike marketplace will read the selected vehicle type",
          ],
          pendingDescription:
            "Your payment is still being confirmed. Please wait a moment or continue the checkout if it is still available.",
          pendingPoints: [
            "The payment status will update automatically",
            "If the checkout is still active, you can continue the payment",
          ],
          expiredDescription:
            "The payment checkout has expired. Please go back and create a new payment.",
          expiredPoints: [
            "The old checkout can no longer be used",
            "Please restart from the vehicle listing flow",
          ],
          cancelledDescription:
            "The payment was cancelled. Please come back if you want to try again.",
          cancelledPoints: [
            "No final activation was completed",
            "Please continue again from the vehicle flow",
          ],
          refundedDescription:
            "The payment has been refunded. Please check the invoice or receipt for refund details.",
          refundedPoints: [
            "Refund details are available in the invoice or receipt",
            "Contact admin if you need further clarification",
          ],
          failedDescription:
            "The payment was not completed successfully. Please try again.",
          failedPoints: [
            "No final activation was completed",
            "Please retry from the vehicle listing flow",
          ],
          loginFirst: "Please log in first.",
          loadPaymentError: "Failed to load payment status.",
          paymentNotFound: "Payment data was not found.",
          successStatusText: "success",
          basicFallback: "Vehicle Listing Payment",
        };

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const sessionId = String(searchParams.get("session_id") || "");
  const paymentId = String(searchParams.get("payment_id") || "");
  const urlKode = String(searchParams.get("kode") || "");
  const urlPayment = String(searchParams.get("payment") || "").toLowerCase();
  const urlStatus = String(searchParams.get("status") || "").toLowerCase();
  const urlVehicleType = String(
    searchParams.get("vehicleType") || searchParams.get("type") || ""
  ).toLowerCase();

  useEffect(() => {
    let ignore = false;

    async function loadPayment() {
      setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (authError || !user) {
        setPayment(null);
        setLoading(false);
        setErrorMessage(t.loginFirst);
        return;
      }

      let foundPayment: PaymentRow | null = null;

      if (paymentId) {
        const { data, error } = await supabase
          .from("payment_transactions")
          .select(
            "id, source_role, payment_type, product_id, product_name_snapshot, product_type, property_code_snapshot, amount_total, currency, status, checkout_url, stripe_checkout_session_id, paid_at, checkout_expires_at, created_at, receipt_url, hosted_invoice_url, invoice_pdf_url, metadata"
          )
          .eq("id", paymentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data) {
          foundPayment = data as PaymentRow;
        }
      }

      if (!foundPayment && sessionId) {
        const { data, error } = await supabase
          .from("payment_transactions")
          .select(
            "id, source_role, payment_type, product_id, product_name_snapshot, product_type, property_code_snapshot, amount_total, currency, status, checkout_url, stripe_checkout_session_id, paid_at, checkout_expires_at, created_at, receipt_url, hosted_invoice_url, invoice_pdf_url, metadata"
          )
          .eq("user_id", user.id)
          .eq("stripe_checkout_session_id", sessionId)
          .maybeSingle();

        if (!error && data) {
          foundPayment = data as PaymentRow;
        }
      }

      if (!foundPayment) {
        let query = supabase
          .from("payment_transactions")
          .select(
            "id, source_role, payment_type, product_id, product_name_snapshot, product_type, property_code_snapshot, amount_total, currency, status, checkout_url, stripe_checkout_session_id, paid_at, checkout_expires_at, created_at, receipt_url, hosted_invoice_url, invoice_pdf_url, metadata"
          )
          .eq("user_id", user.id)
          .eq("source_role", "owner")
          .order("created_at", { ascending: false })
          .limit(10);

        if (urlKode) {
          query = query.eq("property_code_snapshot", urlKode);
        }

        const { data, error } = await query;

        if (ignore) return;

        if (error) {
          setPayment(null);
          setLoading(false);
          setErrorMessage(error.message || t.loadPaymentError);
          return;
        }

        const rows = (data || []) as PaymentRow[];
        foundPayment = rows[0] || null;
      }

      if (!foundPayment) {
        setPayment(null);
        setLoading(false);
        setErrorMessage(t.paymentNotFound);
        return;
      }

      setPayment(foundPayment);
      setLoading(false);
    }

    loadPayment();

    return () => {
      ignore = true;
    };
  }, [
    paymentId,
    sessionId,
    urlKode,
    pollCount,
    t.loginFirst,
    t.loadPaymentError,
    t.paymentNotFound,
  ]);

  const resolvedStatus = useMemo(() => {
    if (urlPayment === "cancelled") return "canceled" as PaymentStatus;
    if (urlStatus === "paid") return "paid" as PaymentStatus;
    return normalizeStatus(payment?.status);
  }, [payment?.status, urlPayment, urlStatus]);

  const returnedFromSuccess = urlPayment === "success";
  const successfulScreen = returnedFromSuccess || resolvedStatus === "paid";

  const vehicleType = useMemo(
    () => inferVehicleType(urlVehicleType, payment),
    [urlVehicleType, payment]
  );

  const resolvedKode = useMemo(
    () => inferListingCode(payment, urlKode),
    [payment, urlKode]
  );

  const marketplaceHref = getMarketplaceHref(vehicleType);
  const vehicleLabel = getVehicleLabel(vehicleType, currentLang);

  const shouldPoll =
    pollCount < 6 &&
    (Boolean(sessionId) || Boolean(paymentId) || returnedFromSuccess) &&
    resolvedStatus !== "paid";

  useEffect(() => {
    if (!shouldPoll) return;

    const timer = setTimeout(() => {
      setPollCount((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [shouldPoll]);

  const statusUI = getStateUI({
    returnedFromSuccess,
    status: resolvedStatus,
    lang: currentLang,
  });

  const detailStatusText = successfulScreen
    ? t.successStatusText
    : resolvedStatus === "checkout_created"
      ? "pending"
      : resolvedStatus;

  const productName = payment?.product_name_snapshot || t.basicFallback;

  const content = useMemo(() => {
    if (successfulScreen) {
      return {
        description: t.successDescription(productName, vehicleLabel, resolvedKode),
        points: t.successPoints,
      };
    }

    if (resolvedStatus === "pending" || resolvedStatus === "checkout_created") {
      return {
        description: t.pendingDescription,
        points: t.pendingPoints,
      };
    }

    if (resolvedStatus === "expired") {
      return {
        description: t.expiredDescription,
        points: t.expiredPoints,
      };
    }

    if (resolvedStatus === "canceled" || resolvedStatus === "cancelled") {
      return {
        description: t.cancelledDescription,
        points: t.cancelledPoints,
      };
    }

    if (resolvedStatus === "refunded" || resolvedStatus === "partially_refunded") {
      return {
        description: t.refundedDescription,
        points: t.refundedPoints,
      };
    }

    return {
      description: t.failedDescription,
      points: t.failedPoints,
    };
  }, [successfulScreen, resolvedStatus, t, productName, vehicleLabel, resolvedKode]);

  const shouldShowContinuePayment =
    !successfulScreen &&
    (resolvedStatus === "pending" || resolvedStatus === "checkout_created") &&
    Boolean(payment?.checkout_url);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-14 md:py-16">
        <div
          className={[
            "mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-bold sm:h-14 sm:w-14 sm:text-2xl",
            statusUI.boxClass,
          ].join(" ")}
        >
          {statusUI.icon}
        </div>

        <h1 className="mt-5 text-2xl font-bold leading-tight text-[#1C1C1E] sm:mt-6 sm:text-3xl md:text-4xl">
          {statusUI.title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base">
          {content.description}
        </p>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            {t.loadingPayment}
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {!loading && !errorMessage && payment ? (
          <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:mt-8 sm:gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.statusLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {detailStatusText}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.amountLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {formatCurrency(payment.amount_total, payment.currency, locale)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.typeLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {productName}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.methodLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {humanizePaymentMethod()}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.codeLabel}</p>
              <p className="mt-1 break-words text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {resolvedKode}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.createdLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {formatDate(payment.created_at, locale)}
              </p>
            </div>

            {payment.paid_at ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:col-span-2">
                <p className="text-xs text-gray-500">{t.paidAtLabel}</p>
                <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                  {formatDate(payment.paid_at, locale)}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {content.points?.length ? (
          <div className="mt-6 rounded-3xl border border-gray-200 bg-gray-50 p-5 text-left sm:mt-8 sm:p-6">
            <div className="text-sm font-semibold text-[#1C1C1E]">
              {t.detailsTitle}
            </div>

            <ul className="mt-4 space-y-3">
              {content.points.map((point, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm leading-6 text-gray-700"
                >
                  <span className="text-green-600">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!loading && !errorMessage && payment && successfulScreen ? (
          <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            {payment.receipt_url ? (
              <a
                href={payment.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
              >
                {t.receiptButton}
              </a>
            ) : null}

            {payment.hosted_invoice_url ? (
              <a
                href={payment.hosted_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
              >
                {t.invoiceButton}
              </a>
            ) : null}
          </div>
        ) : null}

        {successfulScreen ? (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3">
            <Link
              href={marketplaceHref}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t.seeMarketplace}
            </Link>

            <Link
              href="/vehicles/create"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              {t.createAnother}
            </Link>

            <Link
              href="/vehicles/package"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              {t.toVehiclePackage}
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center">
            {shouldShowContinuePayment ? (
              <a
                href={payment?.checkout_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
              >
                {t.continuePayment}
              </a>
            ) : (
              <Link
                href="/vehicles/create"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
              >
                {t.createAnother}
              </Link>
            )}

            <Link
              href="/vehicles/package"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50 sm:w-auto"
            >
              {t.toVehiclePackage}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}