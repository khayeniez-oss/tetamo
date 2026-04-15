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

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

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

function getDisplayStatus(status: PaymentStatus) {
  if (status === "checkout_created") return "pending";
  if (status === "partially_refunded") return "refunded";
  if (status === "cancelled") return "canceled";
  return status;
}

function humanizePaymentType(value?: string | null, lang: "id" | "en" = "id") {
  const v = String(value || "").toLowerCase();

  if (v === "listing_fee") return lang === "id" ? "Iklan Listing" : "Listing Payment";
  if (v === "featured") return lang === "id" ? "Featured Listing" : "Featured Listing";
  if (v === "boost") return lang === "id" ? "Boost Listing" : "Boost Listing";
  if (v === "spotlight") return lang === "id" ? "Homepage Spotlight" : "Homepage Spotlight";
  if (v === "education") return lang === "id" ? "Education Pass" : "Education Pass";
  if (v === "package") return lang === "id" ? "Paket Membership" : "Membership Package";

  return lang === "id" ? "Pembayaran" : "Payment";
}

function humanizePaymentMethod(lang: "id" | "en") {
  return lang === "id" ? "Debit / Credit Card" : "Debit / Credit Card";
}

function getStatusUI(status: PaymentStatus, lang: "id" | "en") {
  const normalized = getDisplayStatus(status);

  if (normalized === "paid") {
    return {
      icon: "✓",
      title: lang === "id" ? "Pembayaran Berhasil" : "Payment Successful",
      boxClass: "bg-green-50 border-green-200 text-green-700",
    };
  }

  if (normalized === "pending") {
    return {
      icon: "⏳",
      title:
        lang === "id" ? "Pembayaran Sedang Diproses" : "Payment Processing",
      boxClass: "bg-yellow-50 border-yellow-200 text-yellow-700",
    };
  }

  if (normalized === "expired") {
    return {
      icon: "!",
      title: lang === "id" ? "Pembayaran Kadaluarsa" : "Payment Expired",
      boxClass: "bg-orange-50 border-orange-200 text-orange-700",
    };
  }

  if (normalized === "canceled") {
    return {
      icon: "×",
      title: lang === "id" ? "Pembayaran Dibatalkan" : "Payment Cancelled",
      boxClass: "bg-gray-100 border-gray-200 text-gray-700",
    };
  }

  if (normalized === "refunded") {
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

function buildPaymentContent(
  payment: PaymentRow | null,
  status: PaymentStatus,
  lang: "id" | "en"
) {
  const metadata = asObject(payment?.metadata);
  const activation = asObject(metadata.activation);
  const action = String(metadata.action || "").toLowerCase();
  const code = String(payment?.property_code_snapshot || "").trim();
  const productName =
    String(payment?.product_name_snapshot || "").trim() ||
    humanizePaymentType(payment?.payment_type, lang);

  const activationDone = activation.done === true;
  const activationType = String(activation.activationType || "").toLowerCase();

  const codeText = code ? ` ${code}` : "";

  if (status === "paid") {
    if (payment?.payment_type === "education") {
      return {
        description:
          lang === "id"
            ? `${productName} berhasil dibayar.${activationDone ? " Akses premium sedang aktif." : ""}`
            : `${productName} was paid successfully.${activationDone ? " Premium access is now active." : ""}`,
        points:
          lang === "id"
            ? [
                activationDone
                  ? "Akses education telah diaktifkan otomatis"
                  : "Akses education sedang diproses otomatis",
                "Riwayat pembayaran tersimpan",
                "Anda bisa lanjut menggunakan akses premium setelah status terkonfirmasi",
              ]
            : [
                activationDone
                  ? "Education access has been activated automatically"
                  : "Education access is being processed automatically",
                "Your payment history has been saved",
                "You can continue using premium access after the status is confirmed",
              ],
      };
    }

    if (payment?.payment_type === "boost" || payment?.payment_type === "spotlight") {
      return {
        description:
          lang === "id"
            ? `${productName} untuk listing${codeText} berhasil dibayar.`
            : `${productName} for listing${codeText} was paid successfully.`,
        points:
          lang === "id"
            ? [
                activationDone
                  ? "Add-on telah diaktifkan otomatis pada listing terkait"
                  : "Add-on sedang diproses otomatis",
                "Riwayat pembayaran tersimpan di tagihan pemilik",
                "Silakan cek dashboard pemilik untuk status listing terbaru",
              ]
            : [
                activationDone
                  ? "The add-on has been activated automatically for the related listing"
                  : "The add-on is being processed automatically",
                "Payment history is saved in owner billing",
                "Please check the owner dashboard for the latest listing status",
              ],
      };
    }

    if (action === "renew" || activationType === "renew-listing") {
      return {
        description:
          lang === "id"
            ? `Perpanjangan listing${codeText} berhasil dibayar.`
            : `The renewal for listing${codeText} was paid successfully.`,
        points:
          lang === "id"
            ? [
                activationDone
                  ? "Masa aktif listing telah diperpanjang otomatis"
                  : "Perpanjangan listing sedang diproses otomatis",
                "Riwayat pembayaran tersimpan di tagihan pemilik",
                "Silakan cek dashboard pemilik untuk melihat status terbaru",
              ]
            : [
                activationDone
                  ? "The listing period has been extended automatically"
                  : "The listing renewal is being processed automatically",
                "Payment history is saved in owner billing",
                "Please check the owner dashboard for the latest status",
              ],
      };
    }

    return {
      description:
        lang === "id"
          ? `${productName} berhasil dibayar${code ? ` untuk listing ${code}` : ""}.`
          : `${productName} was paid successfully${code ? ` for listing ${code}` : ""}.`,
      points:
        lang === "id"
          ? [
              activationDone
                ? "Aktivasi listing telah diproses otomatis"
                : "Aktivasi listing sedang diproses otomatis",
              "Status pembayaran sudah tercatat",
              "Anda bisa melihat riwayat pembayaran di tagihan pemilik",
            ]
          : [
              activationDone
                ? "Listing activation has been processed automatically"
                : "Listing activation is being processed automatically",
              "The payment status has been recorded",
              "You can see payment history in owner billing",
            ],
    };
  }

  if (status === "pending" || status === "checkout_created") {
    return {
      description:
        lang === "id"
          ? "Pembayaran Anda masih menunggu konfirmasi. Status akan diperbarui otomatis setelah webhook Stripe masuk."
          : "Your payment is still waiting for confirmation. The status will update automatically after the Stripe webhook arrives.",
      points:
        lang === "id"
          ? [
              "Halaman ini akan memeriksa status pembayaran secara otomatis",
              "Jika pembayaran belum selesai, Anda bisa lanjutkan checkout",
              "Riwayat pembayaran tetap tersimpan di tagihan pemilik",
            ]
          : [
              "This page will check the payment status automatically",
              "If the payment is not complete yet, you can continue the checkout",
              "Payment history remains saved in owner billing",
            ],
    };
  }

  if (status === "expired") {
    return {
      description:
        lang === "id"
          ? "Checkout pembayaran sudah kadaluarsa."
          : "The payment checkout has expired.",
      points:
        lang === "id"
          ? [
              "Pembayaran tidak lagi bisa dilanjutkan dari checkout lama",
              "Silakan buat atau lanjutkan pembayaran baru dari halaman tagihan",
            ]
          : [
              "The old checkout can no longer be used",
              "Please create or continue a new payment from the billing page",
            ],
    };
  }

  if (status === "canceled" || status === "cancelled") {
    return {
      description:
        lang === "id"
          ? "Pembayaran dibatalkan."
          : "The payment was cancelled.",
      points:
        lang === "id"
          ? [
              "Tidak ada aktivasi yang dijalankan",
              "Silakan kembali ke tagihan pemilik untuk mencoba lagi",
            ]
          : [
              "No activation was completed",
              "Please return to owner billing to try again",
            ],
    };
  }

  if (status === "refunded" || status === "partially_refunded") {
    return {
      description:
        lang === "id"
          ? "Pembayaran sudah direfund."
          : "The payment has been refunded.",
      points:
        lang === "id"
          ? [
              "Silakan cek detail refund di invoice atau receipt",
              "Hubungi admin jika Anda perlu klarifikasi lebih lanjut",
            ]
          : [
              "Please check the refund details in the invoice or receipt",
              "Contact admin if you need further clarification",
            ],
    };
  }

  return {
    description:
      lang === "id"
        ? "Pembayaran belum berhasil diselesaikan."
        : "The payment has not been completed successfully.",
    points:
      lang === "id"
        ? [
            "Tidak ada aktivasi final yang dijalankan",
            "Silakan cek tagihan pemilik untuk status terbaru atau lanjutkan pembayaran",
          ]
        : [
            "No final activation was completed",
            "Please check owner billing for the latest status or continue the payment",
          ],
  };
}

export default function PemilikIklanSuksesPageClient() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const locale = lang === "id" ? "id-ID" : "en-US";

  const t =
    lang === "id"
      ? {
          loadingSubmission: "Memuat status pengiriman...",
          loadingPayment: "Memuat status pembayaran...",
          statusLabel: "Status",
          amountLabel: "Jumlah",
          typeLabel: "Tipe",
          methodLabel: "Metode",
          codeLabel: "Kode Listing",
          createdLabel: "Dibuat",
          paidAtLabel: "Dibayar Pada",
          whatNow: "Yang Terjadi Sekarang",
          continuePayment: "Lanjutkan Pembayaran",
          viewMarketplace: "Lihat Marketplace",
          createNewListing: "Buat Iklan Baru",
          toOwnerBilling: "Ke Tagihan Pemilik",
          toOwnerDashboard: "Ke Dashboard Pemilik",
          receiptButton: "Lihat Receipt",
          invoiceButton: "Lihat Invoice",
          editApprovalTitle: "Dikirim untuk Persetujuan",
          editApprovalDescription: (kode: string) =>
            kode && kode !== "-"
              ? `Perubahan listing ${kode} berhasil dikirim untuk approval. Listing tetap dapat tampil di marketplace dengan status pending approval sampai ditinjau.`
              : "Perubahan listing berhasil dikirim untuk approval. Listing tetap dapat tampil di marketplace dengan status pending approval sampai ditinjau.",
          editApprovalPoints: [
            "Perubahan listing sudah berhasil dikirim",
            "Status listing sekarang pending approval",
            "Listing tetap bisa tampil di marketplace",
            "Marketplace akan menampilkan label pending approval",
          ],
          editApprovalFooter:
            "Halaman ini menampilkan status submit edit listing untuk owner.",
          paymentFooter:
            "Halaman ini hanya membaca status pembayaran owner. Tidak ada proses insert listing atau upload foto dari halaman ini.",
          loginFirst: "Silakan login terlebih dahulu.",
          loadPaymentError: "Gagal memuat status pembayaran.",
          paymentNotFound: "Data pembayaran tidak ditemukan.",
        }
      : {
          loadingSubmission: "Loading submission status...",
          loadingPayment: "Loading payment status...",
          statusLabel: "Status",
          amountLabel: "Amount",
          typeLabel: "Type",
          methodLabel: "Method",
          codeLabel: "Listing Code",
          createdLabel: "Created",
          paidAtLabel: "Paid At",
          whatNow: "What Happens Now",
          continuePayment: "Continue Payment",
          viewMarketplace: "View Marketplace",
          createNewListing: "Create New Listing",
          toOwnerBilling: "Go to Owner Billing",
          toOwnerDashboard: "Go to Owner Dashboard",
          receiptButton: "View Receipt",
          invoiceButton: "View Invoice",
          editApprovalTitle: "Submitted for Approval",
          editApprovalDescription: (kode: string) =>
            kode && kode !== "-"
              ? `Your changes for listing ${kode} have been submitted for approval. The listing can still appear in the marketplace with pending approval status until it is reviewed.`
              : "Your listing changes have been submitted for approval. The listing can still appear in the marketplace with pending approval status until it is reviewed.",
          editApprovalPoints: [
            "Your listing changes have been submitted successfully",
            "The listing status is now pending approval",
            "The listing can still appear in the marketplace",
            "The marketplace will show a pending approval label",
          ],
          editApprovalFooter:
            "This page shows the owner listing edit submission status.",
          paymentFooter:
            "This page only reads owner payment status. No listing insert or photo upload happens here anymore.",
          loginFirst: "Please log in first.",
          loadPaymentError: "Failed to load payment status.",
          paymentNotFound: "Payment data was not found.",
        };

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const sessionId = String(searchParams.get("session_id") || "");
  const paymentId = String(searchParams.get("payment_id") || "");
  const urlKode = String(searchParams.get("kode") || "");
  const urlPayment = String(searchParams.get("payment") || "").toLowerCase();
  const urlMode = String(searchParams.get("mode") || "").toLowerCase();
  const urlStatus = String(searchParams.get("status") || "").toLowerCase();

  const isEditApprovalFlow =
    urlMode === "edit" && urlStatus === "pending-approval";

  useEffect(() => {
    let ignore = false;

    async function loadPayment() {
      if (isEditApprovalFlow) {
        setPayment(null);
        setErrorMessage("");
        setLoading(false);
        return;
      }

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
    isEditApprovalFlow,
    paymentId,
    sessionId,
    urlKode,
    pollCount,
    t.loginFirst,
    t.loadPaymentError,
    t.paymentNotFound,
  ]);

  const resolvedStatus = useMemo(() => {
    if (isEditApprovalFlow) return "pending" as PaymentStatus;
    if (urlPayment === "cancelled") return "canceled" as PaymentStatus;
    return normalizeStatus(payment?.status);
  }, [isEditApprovalFlow, payment?.status, urlPayment]);

  const resolvedKode = isEditApprovalFlow
    ? urlKode || "-"
    : payment?.property_code_snapshot || urlKode || "-";

  const statusUI = isEditApprovalFlow
    ? {
        icon: "✓",
        title: t.editApprovalTitle,
        boxClass: "bg-yellow-50 border-yellow-200 text-yellow-700",
      }
    : getStatusUI(resolvedStatus, lang);

  const content = isEditApprovalFlow
    ? {
        description: t.editApprovalDescription(resolvedKode),
        points: t.editApprovalPoints,
      }
    : buildPaymentContent(payment, resolvedStatus, lang);

  const shouldShowContinuePayment =
    !isEditApprovalFlow &&
    (resolvedStatus === "pending" || resolvedStatus === "checkout_created") &&
    Boolean(payment?.checkout_url);

  const shouldPoll =
    !isEditApprovalFlow &&
    (Boolean(sessionId) || Boolean(paymentId)) &&
    pollCount < 6 &&
    (!payment ||
      resolvedStatus === "pending" ||
      resolvedStatus === "checkout_created");

  const showSuccessButtons = isEditApprovalFlow || resolvedStatus === "paid";

  useEffect(() => {
    if (!shouldPoll) return;

    const timer = setTimeout(() => {
      setPollCount((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [shouldPoll]);

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
            {isEditApprovalFlow ? t.loadingSubmission : t.loadingPayment}
          </div>
        ) : null}

        {!loading && errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {!loading && !errorMessage && !isEditApprovalFlow && payment ? (
          <div className="mt-6 grid grid-cols-1 gap-3 text-left sm:mt-8 sm:gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.statusLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {getDisplayStatus(resolvedStatus)}
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
                {payment.product_name_snapshot ||
                  humanizePaymentType(payment.payment_type, lang)}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500">{t.methodLabel}</p>
              <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {humanizePaymentMethod(lang)}
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
              {t.whatNow}
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

        {!loading && !errorMessage && payment && resolvedStatus === "paid" ? (
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

        {showSuccessButtons ? (
          <div className="mt-8 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-3">
            <Link
              href="/properti"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t.viewMarketplace}
            </Link>

            <Link
              href="/pemilik"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              {t.createNewListing}
            </Link>

            <Link
              href="/pemilikdashboard"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              {t.toOwnerDashboard}
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
                href="/pemilikdashboard/tagihan"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
              >
                {t.toOwnerBilling}
              </Link>
            )}

            <Link
              href="/pemilikdashboard"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50 sm:w-auto"
            >
              {t.toOwnerDashboard}
            </Link>
          </div>
        )}

        <div className="mt-8 text-xs leading-5 text-gray-500">
          {isEditApprovalFlow ? t.editApprovalFooter : t.paymentFooter}
        </div>
      </div>
    </main>
  );
}