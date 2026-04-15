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

type LinkedPropertyRow = {
  id: string;
  kode: string | null;
  title: string | null;
  status: string | null;
  verification_status: string | null;
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

function humanizePaymentType(value?: string | null, lang: "id" | "en" = "id") {
  const v = String(value || "").toLowerCase();

  if (v === "listing_fee") return lang === "id" ? "Iklan Listing" : "Listing Payment";
  if (v === "featured") return "Featured Listing";
  if (v === "boost") return "Boost Listing";
  if (v === "spotlight") return "Homepage Spotlight";
  if (v === "education") return "Education Pass";
  if (v === "package") return lang === "id" ? "Paket Membership" : "Membership Package";

  return lang === "id" ? "Pembayaran" : "Payment";
}

function humanizePaymentMethod() {
  return "Debit / Credit Card";
}

function isPropertyPendingReview(property: LinkedPropertyRow | null) {
  if (!property) return false;

  const status = String(property.status || "").toLowerCase();
  const verification = String(property.verification_status || "").toLowerCase();

  return (
    status === "pending" ||
    status === "pending_approval" ||
    verification === "pending_verification" ||
    verification === "pending_approval"
  );
}

function getStateUI(
  args: {
    isEditApprovalFlow: boolean;
    returnedFromSuccess: boolean;
    status: PaymentStatus;
    lang: "id" | "en";
  }
) {
  const { isEditApprovalFlow, returnedFromSuccess, status, lang } = args;

  if (isEditApprovalFlow) {
    return {
      icon: "✓",
      title: lang === "id" ? "Dikirim untuk Approval" : "Submitted for Approval",
      boxClass: "bg-yellow-50 border-yellow-200 text-yellow-700",
    };
  }

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

export default function PemilikIklanSuksesPageClient() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const currentLang: "id" | "en" = lang === "en" ? "en" : "id";
  const locale = currentLang === "id" ? "id-ID" : "en-US";

  const t =
    currentLang === "id"
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
          detailsTitle: "Detail Status",
          continuePayment: "Lanjutkan Pembayaran",
          seeListing: "Lihat Listing",
          toOwnerBilling: "Ke Tagihan Pemilik",
          toOwnerDashboard: "Ke Dashboard Pemilik",
          receiptButton: "Lihat Receipt",
          invoiceButton: "Lihat Invoice",
          editApprovalDescription: (kode: string) =>
            kode && kode !== "-"
              ? `Perubahan listing ${kode} berhasil dikirim dan sekarang menunggu review admin.`
              : "Perubahan listing berhasil dikirim dan sekarang menunggu review admin.",
          editApprovalPoints: [
            "Perubahan listing sudah berhasil dikirim",
            "Status listing sekarang pending approval",
            "Anda bisa cek status terbaru dari dashboard pemilik",
          ],
          successDescriptionPending: (product: string, kode: string) =>
            kode && kode !== "-"
              ? `${product} berhasil dibayar. Listing ${kode} sudah dikirim dan sekarang menunggu review admin.`
              : `${product} berhasil dibayar dan sekarang menunggu review admin.`,
          successDescriptionLive: (product: string, kode: string) =>
            kode && kode !== "-"
              ? `${product} berhasil dibayar. Listing ${kode} sudah tampil di marketplace.`
              : `${product} berhasil dibayar dan listing sudah tampil di marketplace.`,
          successDescriptionGeneric: (product: string) =>
            `${product} berhasil dibayar.`,
          successPointsPending: [
            "Pembayaran sudah tercatat",
            "Listing sudah dikirim ke marketplace",
            "Status listing sekarang pending review",
          ],
          successPointsLive: [
            "Pembayaran sudah tercatat",
            "Listing sudah tampil di marketplace",
            "Anda bisa cek status terbaru dari dashboard pemilik",
          ],
          pendingDescription:
            "Pembayaran Anda masih sedang dikonfirmasi. Silakan tunggu sebentar atau cek tagihan pemilik.",
          pendingPoints: [
            "Status pembayaran akan diperbarui otomatis",
            "Anda bisa cek detail pembayaran di tagihan pemilik",
          ],
          expiredDescription:
            "Checkout pembayaran sudah kadaluarsa. Silakan buat pembayaran baru dari tagihan pemilik.",
          expiredPoints: [
            "Checkout lama tidak bisa digunakan lagi",
            "Silakan lanjutkan dari tagihan pemilik",
          ],
          cancelledDescription:
            "Pembayaran dibatalkan. Silakan kembali ke tagihan pemilik jika ingin mencoba lagi.",
          cancelledPoints: [
            "Tidak ada aktivasi yang dijalankan",
            "Silakan cek tagihan pemilik untuk mencoba lagi",
          ],
          refundedDescription:
            "Pembayaran sudah direfund. Silakan cek invoice atau receipt untuk detail refund.",
          refundedPoints: [
            "Detail refund tersedia di invoice atau receipt",
            "Hubungi admin jika Anda butuh klarifikasi lebih lanjut",
          ],
          failedDescription:
            "Pembayaran belum berhasil diselesaikan. Silakan cek tagihan pemilik untuk mencoba lagi.",
          failedPoints: [
            "Tidak ada aktivasi final yang dijalankan",
            "Silakan lanjutkan dari tagihan pemilik",
          ],
          loginFirst: "Silakan login terlebih dahulu.",
          loadPaymentError: "Gagal memuat status pembayaran.",
          paymentNotFound: "Data pembayaran tidak ditemukan.",
          successStatusText: "berhasil",
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
          detailsTitle: "Status Details",
          continuePayment: "Continue Payment",
          seeListing: "See Listing",
          toOwnerBilling: "Go to Owner Billing",
          toOwnerDashboard: "Go to Owner Dashboard",
          receiptButton: "View Receipt",
          invoiceButton: "View Invoice",
          editApprovalDescription: (kode: string) =>
            kode && kode !== "-"
              ? `Your changes for listing ${kode} have been submitted and are now waiting for admin review.`
              : "Your listing changes have been submitted and are now waiting for admin review.",
          editApprovalPoints: [
            "Your listing changes were submitted successfully",
            "The listing status is now pending approval",
            "You can check the latest status from the owner dashboard",
          ],
          successDescriptionPending: (product: string, kode: string) =>
            kode && kode !== "-"
              ? `${product} was paid successfully. Listing ${kode} has been submitted and is now pending admin review.`
              : `${product} was paid successfully and is now pending admin review.`,
          successDescriptionLive: (product: string, kode: string) =>
            kode && kode !== "-"
              ? `${product} was paid successfully. Listing ${kode} is now visible in the marketplace.`
              : `${product} was paid successfully and the listing is now visible in the marketplace.`,
          successDescriptionGeneric: (product: string) =>
            `${product} was paid successfully.`,
          successPointsPending: [
            "Your payment has been recorded",
            "Your listing has been submitted to the marketplace",
            "The listing status is now pending review",
          ],
          successPointsLive: [
            "Your payment has been recorded",
            "Your listing is now visible in the marketplace",
            "You can check the latest status from the owner dashboard",
          ],
          pendingDescription:
            "Your payment is still being confirmed. Please wait a moment or check owner billing.",
          pendingPoints: [
            "The payment status will update automatically",
            "You can review the payment details in owner billing",
          ],
          expiredDescription:
            "The payment checkout has expired. Please create a new payment from owner billing.",
          expiredPoints: [
            "The old checkout can no longer be used",
            "Please continue from owner billing",
          ],
          cancelledDescription:
            "The payment was cancelled. Please return to owner billing if you want to try again.",
          cancelledPoints: [
            "No activation was completed",
            "Please check owner billing to try again",
          ],
          refundedDescription:
            "The payment has been refunded. Please check the invoice or receipt for refund details.",
          refundedPoints: [
            "Refund details are available in the invoice or receipt",
            "Contact admin if you need further clarification",
          ],
          failedDescription:
            "The payment was not completed successfully. Please check owner billing to try again.",
          failedPoints: [
            "No final activation was completed",
            "Please continue from owner billing",
          ],
          loginFirst: "Please log in first.",
          loadPaymentError: "Failed to load payment status.",
          paymentNotFound: "Payment data was not found.",
          successStatusText: "success",
        };

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [linkedProperty, setLinkedProperty] = useState<LinkedPropertyRow | null>(
    null
  );
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

  const returnedFromSuccess = urlPayment === "success";
  const successfulScreen =
    isEditApprovalFlow || returnedFromSuccess || resolvedStatus === "paid";

  const resolvedKode = isEditApprovalFlow
    ? urlKode || "-"
    : payment?.property_code_snapshot || urlKode || "-";

  useEffect(() => {
    let ignore = false;

    async function loadLinkedProperty() {
      if (isEditApprovalFlow || !resolvedKode || resolvedKode === "-") {
        setLinkedProperty(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (ignore || !user) return;

      const { data, error } = await supabase
        .from("properties")
        .select("id, kode, title, status, verification_status")
        .eq("user_id", user.id)
        .eq("kode", resolvedKode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ignore) return;

      if (error || !data) {
        setLinkedProperty(null);
        return;
      }

      setLinkedProperty(data as LinkedPropertyRow);
    }

    loadLinkedProperty();

    return () => {
      ignore = true;
    };
  }, [isEditApprovalFlow, resolvedKode, pollCount]);

  const shouldPoll =
    !isEditApprovalFlow &&
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
    isEditApprovalFlow,
    returnedFromSuccess,
    status: resolvedStatus,
    lang: currentLang,
  });

  const detailStatusText = successfulScreen
    ? t.successStatusText
    : resolvedStatus === "checkout_created"
      ? "pending"
      : resolvedStatus;

  const productName =
    payment?.product_name_snapshot ||
    humanizePaymentType(payment?.payment_type, currentLang);

  const propertyPendingReview = isPropertyPendingReview(linkedProperty);

  const content = useMemo(() => {
    if (isEditApprovalFlow) {
      return {
        description: t.editApprovalDescription(resolvedKode),
        points: t.editApprovalPoints,
      };
    }

    if (successfulScreen) {
      if (payment?.payment_type === "education") {
        return {
          description:
            currentLang === "id"
              ? `${productName} berhasil dibayar. Akses premium Anda sudah diproses.`
              : `${productName} was paid successfully. Your premium access has been processed.`,
          points:
            currentLang === "id"
              ? [
                  "Pembayaran sudah tercatat",
                  "Akses premium akan tersedia sesuai status terbaru",
                  "Anda bisa cek detail pembayaran di tagihan pemilik",
                ]
              : [
                  "Your payment has been recorded",
                  "Premium access will be available based on the latest status",
                  "You can check payment details in owner billing",
                ],
        };
      }

      if (payment?.payment_type === "boost" || payment?.payment_type === "spotlight") {
        return {
          description:
            currentLang === "id"
              ? `${productName} berhasil dibayar untuk listing ${resolvedKode}.`
              : `${productName} was paid successfully for listing ${resolvedKode}.`,
          points:
            currentLang === "id"
              ? [
                  "Pembayaran sudah tercatat",
                  "Add-on sedang atau sudah diterapkan ke listing terkait",
                  "Anda bisa cek status terbaru dari dashboard pemilik",
                ]
              : [
                  "Your payment has been recorded",
                  "The add-on is being applied or has already been applied to the related listing",
                  "You can check the latest status from the owner dashboard",
                ],
        };
      }

      if (propertyPendingReview) {
        return {
          description: t.successDescriptionPending(productName, resolvedKode),
          points: t.successPointsPending,
        };
      }

      if (linkedProperty?.id) {
        return {
          description: t.successDescriptionLive(productName, resolvedKode),
          points: t.successPointsLive,
        };
      }

      return {
        description: t.successDescriptionGeneric(productName),
        points:
          currentLang === "id"
            ? [
                "Pembayaran sudah tercatat",
                "Anda bisa cek status terbaru dari dashboard pemilik",
                "Riwayat pembayaran tersimpan di tagihan pemilik",
              ]
            : [
                "Your payment has been recorded",
                "You can check the latest status from the owner dashboard",
                "Payment history is saved in owner billing",
              ],
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
  }, [
    isEditApprovalFlow,
    successfulScreen,
    resolvedStatus,
    resolvedKode,
    payment?.payment_type,
    productName,
    propertyPendingReview,
    linkedProperty?.id,
    currentLang,
    t,
  ]);

  const shouldShowContinuePayment =
    !successfulScreen &&
    (resolvedStatus === "pending" || resolvedStatus === "checkout_created") &&
    Boolean(payment?.checkout_url);

  const listingHref = linkedProperty?.id ? `/properti/${linkedProperty.id}` : "/properti";

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
              href={listingHref}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {t.seeListing}
            </Link>

            <Link
              href="/pemilikdashboard/tagihan"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-6 py-3 text-sm font-semibold transition hover:bg-gray-50"
            >
              {t.toOwnerBilling}
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
      </div>
    </main>
  );
}