"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type PaymentStatus =
  | "initiated"
  | "pending"
  | "checkout_created"
  | "succeeded"
  | "failed"
  | "expired"
  | "refunded"
  | "completed"
  | "paid"
  | "settled"
  | "active"
  | null;

type PaymentTransactionRow = {
  id: string;
  user_id: string | null;
  property_id: string | null;
  source_role: string | null;
  payment_type: string | null;
  product_id: string | null;
  product_name_snapshot: string | null;
  product_type: string | null;
  audience_snapshot: string | null;
  status: PaymentStatus;
  currency: string | null;
  amount_subtotal: number | null;
  amount_discount: number | null;
  amount_tax: number | null;
  amount_total: number | null;
  description: string | null;
  plan_name: string | null;
  duration_days: number | null;
  property_title_snapshot: string | null;
  property_code_snapshot: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  checkout_url: string | null;
  checkout_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  receipt_url: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  paid_at: string | null;
  expired_at: string | null;
  failed_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

type AgentMembershipRow = {
  id: string;
  user_id: string | null;
  payment_id: string | null;
  package_id: string | null;
  package_name: string | null;
  billing_cycle: string | null;
  listing_limit: number | null;
  status: string | null;
  auto_renew: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function cleanText(value: unknown) {
  const v = String(value || "").trim();
  return v || "-";
}

function blankText(value: unknown) {
  const v = String(value || "").trim();
  return v && v !== "-" ? v : "";
}

function getMetaString(
  metadata: Record<string, any> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getMetaNumber(
  metadata: Record<string, any> | null | undefined,
  key: string
) {
  const value = metadata?.[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getNestedMetaString(
  metadata: Record<string, any> | null | undefined,
  objectKey: string,
  key: string
) {
  const obj = metadata?.[objectKey];

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "";

  const value = (obj as Record<string, any>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNestedMetaNumber(
  metadata: Record<string, any> | null | undefined,
  objectKey: string,
  key: string
) {
  const obj = metadata?.[objectKey];

  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return 0;

  const value = (obj as Record<string, any>)[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(amount: number | null, currency: string | null) {
  const code = String(currency || "idr").toUpperCase();
  const value = toNumber(amount ?? 0);

  if (code === "IDR") {
    return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US").format(value)}`;
  }
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function paymentStatusClasses(status: PaymentStatus) {
  switch ((status || "").toLowerCase()) {
    case "paid":
    case "succeeded":
    case "completed":
    case "settled":
    case "active":
      return "bg-green-50 text-green-700 border-green-200";
    case "checkout_created":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "failed":
      return "bg-red-50 text-red-700 border-red-200";
    case "expired":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "refunded":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "pending":
    case "initiated":
    default:
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
}

function paymentStatusLabel(status: PaymentStatus, lang: "id" | "en") {
  switch ((status || "").toLowerCase()) {
    case "paid":
    case "succeeded":
    case "completed":
    case "settled":
    case "active":
      return lang === "id" ? "LUNAS" : "PAID";
    case "checkout_created":
      return lang === "id" ? "CHECKOUT DIBUAT" : "CHECKOUT CREATED";
    case "failed":
      return lang === "id" ? "GAGAL" : "FAILED";
    case "expired":
      return lang === "id" ? "KEDALUWARSA" : "EXPIRED";
    case "refunded":
      return lang === "id" ? "DIKEMBALIKAN" : "REFUNDED";
    case "pending":
    case "initiated":
    default:
      return lang === "id" ? "MENUNGGU" : "PENDING";
  }
}

function getBillingCycleLabel(
  payment: PaymentTransactionRow | null,
  membership: AgentMembershipRow | null,
  lang: "id" | "en"
) {
  const direct =
    membership?.billing_cycle ||
    getMetaString(payment?.metadata, "selectedBillingCycle") ||
    getMetaString(payment?.metadata, "selected_billing_cycle") ||
    getMetaString(payment?.metadata, "billingCycle") ||
    getMetaString(payment?.metadata, "billing_cycle");

  const normalized = String(direct || "").toLowerCase();

  if (normalized === "monthly") return lang === "id" ? "Bulanan" : "Monthly";
  if (normalized === "yearly") return lang === "id" ? "Tahunan" : "Yearly";

  const paymentType = String(payment?.payment_type || "").toLowerCase();

  if (paymentType === "boost" || paymentType === "spotlight") return "Add-On";
  if (paymentType === "education") return "Education";

  return "-";
}

function getPaymentTypeLabel(
  payment: PaymentTransactionRow | null,
  lang: "id" | "en"
) {
  const paymentType = String(payment?.payment_type || "").toLowerCase();

  if (paymentType === "package") {
    return lang === "id" ? "Membership Agen" : "Agent Membership";
  }

  if (paymentType === "boost") return "Boost Listing";
  if (paymentType === "spotlight") return "Homepage Spotlight";
  if (paymentType === "education") return "Education";
  if (paymentType === "listing_fee") {
    return lang === "id" ? "Biaya Listing" : "Listing Fee";
  }

  if (paymentType === "featured") return "Featured Listing";

  return cleanText(payment?.payment_type || payment?.product_type || "Payment");
}

function getPackageName(
  payment: PaymentTransactionRow | null,
  membership: AgentMembershipRow | null
) {
  return cleanText(
    membership?.package_name ||
      getMetaString(payment?.metadata, "packageName") ||
      getMetaString(payment?.metadata, "package_name") ||
      payment?.product_name_snapshot ||
      payment?.plan_name ||
      payment?.product_id ||
      payment?.description
  );
}

function getListingLimit(
  payment: PaymentTransactionRow | null,
  membership: AgentMembershipRow | null
) {
  const direct =
    Number(membership?.listing_limit || 0) ||
    getMetaNumber(payment?.metadata, "listingLimit") ||
    getMetaNumber(payment?.metadata, "activeListingLimit") ||
    getMetaNumber(payment?.metadata, "listing_limit") ||
    getMetaNumber(payment?.metadata, "active_listing_limit") ||
    getNestedMetaNumber(payment?.metadata, "activation", "listingLimit");

  return direct > 0 ? direct : 0;
}

function getExpiryDate(
  payment: PaymentTransactionRow | null,
  membership: AgentMembershipRow | null
) {
  return (
    membership?.expires_at ||
    getNestedMetaString(payment?.metadata, "activation", "expiresAt") ||
    getNestedMetaString(payment?.metadata, "activation", "endsAt") ||
    getMetaString(payment?.metadata, "expires_at") ||
    null
  );
}

function getStartsAt(
  payment: PaymentTransactionRow | null,
  membership: AgentMembershipRow | null
) {
  return (
    membership?.starts_at ||
    getNestedMetaString(payment?.metadata, "activation", "startsAt") ||
    getMetaString(payment?.metadata, "starts_at") ||
    payment?.paid_at ||
    payment?.created_at ||
    null
  );
}

function getPaymentMethod() {
  return "Debit / Credit Card";
}

export default function AgentReceiptDetailPage() {
  const { lang } = useLanguage();
  const currentLang = lang === "id" ? "id" : "en";
  const locale = currentLang === "id" ? "id-ID" : "en-GB";

  const params = useParams();
  const paymentIdRaw = params?.id;
  const paymentId = Array.isArray(paymentIdRaw)
    ? paymentIdRaw[0]
    : typeof paymentIdRaw === "string"
    ? paymentIdRaw
    : "";

  const [payment, setPayment] = useState<PaymentTransactionRow | null>(null);
  const [membership, setMembership] = useState<AgentMembershipRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadReceipt() {
      if (!paymentId) {
        setError(
          currentLang === "id"
            ? "ID receipt tidak ditemukan."
            : "Receipt ID was not found."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (authError || !user) {
        setError(
          currentLang === "id" ? "Silakan login ulang." : "Please log in again."
        );
        setLoading(false);
        return;
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_transactions")
        .select(
          `
            id,
            user_id,
            property_id,
            source_role,
            payment_type,
            product_id,
            product_name_snapshot,
            product_type,
            audience_snapshot,
            status,
            currency,
            amount_subtotal,
            amount_discount,
            amount_tax,
            amount_total,
            description,
            plan_name,
            duration_days,
            property_title_snapshot,
            property_code_snapshot,
            customer_name,
            customer_email,
            customer_phone,
            checkout_url,
            checkout_expires_at,
            stripe_checkout_session_id,
            stripe_payment_intent_id,
            stripe_charge_id,
            stripe_invoice_id,
            receipt_url,
            hosted_invoice_url,
            invoice_pdf_url,
            paid_at,
            expired_at,
            failed_at,
            metadata,
            created_at,
            updated_at
          `
        )
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ignore) return;

      if (paymentError || !paymentData) {
        console.error("Failed to load agent receipt:", paymentError);
        setError(
          currentLang === "id"
            ? "Gagal memuat receipt."
            : "Failed to load receipt."
        );
        setLoading(false);
        return;
      }

      const paymentRow = paymentData as PaymentTransactionRow;
      setPayment(paymentRow);

      const { data: membershipData } = await supabase
        .from("agent_memberships")
        .select(
          `
            id,
            user_id,
            payment_id,
            package_id,
            package_name,
            billing_cycle,
            listing_limit,
            status,
            auto_renew,
            starts_at,
            expires_at,
            metadata,
            created_at,
            updated_at
          `
        )
        .eq("payment_id", paymentRow.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ignore) return;

      setMembership((membershipData as AgentMembershipRow) || null);
      setLoading(false);
    }

    loadReceipt();

    return () => {
      ignore = true;
    };
  }, [paymentId, currentLang]);

  const paymentAmount = useMemo(() => {
    return formatAmount(
      payment?.amount_total ?? payment?.amount_subtotal ?? 0,
      payment?.currency ?? "idr"
    );
  }, [payment]);

  const subtotalAmount = useMemo(() => {
    return formatAmount(
      payment?.amount_subtotal ?? payment?.amount_total ?? 0,
      payment?.currency ?? "idr"
    );
  }, [payment]);

  const discountAmount = useMemo(() => {
    return formatAmount(payment?.amount_discount ?? 0, payment?.currency ?? "idr");
  }, [payment]);

  const taxAmount = useMemo(() => {
    return formatAmount(payment?.amount_tax ?? 0, payment?.currency ?? "idr");
  }, [payment]);

  const statusBadgeClass = useMemo(() => {
    return paymentStatusClasses(payment?.status ?? null);
  }, [payment?.status]);

  const statusLabel = useMemo(() => {
    return paymentStatusLabel(payment?.status ?? null, currentLang);
  }, [payment?.status, currentLang]);

  const receiptNumber = useMemo(() => {
    return (
      payment?.stripe_invoice_id ||
      payment?.stripe_charge_id ||
      payment?.stripe_payment_intent_id ||
      (payment?.id ? `RCT-${payment.id.slice(0, 8).toUpperCase()}` : "-")
    );
  }, [payment]);

  const invoiceNumber = useMemo(() => {
    return payment?.stripe_invoice_id || "-";
  }, [payment?.stripe_invoice_id]);

  const productTitle = useMemo(() => {
    return (
      payment?.description ||
      getMetaString(payment?.metadata, "paymentTitle") ||
      getMetaString(payment?.metadata, "payment_title") ||
      getPackageName(payment, membership)
    );
  }, [payment, membership]);

  const packageName = useMemo(() => {
    return getPackageName(payment, membership);
  }, [payment, membership]);

  const billingType = useMemo(() => {
    return getBillingCycleLabel(payment, membership, currentLang);
  }, [payment, membership, currentLang]);

  const paymentType = useMemo(() => {
    return getPaymentTypeLabel(payment, currentLang);
  }, [payment, currentLang]);

  const listingLimit = useMemo(() => {
    return getListingLimit(payment, membership);
  }, [payment, membership]);

  const startsAt = useMemo(() => {
    return getStartsAt(payment, membership);
  }, [payment, membership]);

  const expiryDate = useMemo(() => {
    return getExpiryDate(payment, membership);
  }, [payment, membership]);

  const paymentMethod = useMemo(() => {
    return getPaymentMethod();
  }, []);

  const referenceNumber = useMemo(() => {
    return (
      payment?.stripe_payment_intent_id ||
      payment?.stripe_charge_id ||
      payment?.stripe_checkout_session_id ||
      payment?.id ||
      "-"
    );
  }, [payment]);

  const customerName = useMemo(() => {
    return cleanText(payment?.customer_name || payment?.customer_email);
  }, [payment]);

  const customerEmail = useMemo(() => {
    return cleanText(payment?.customer_email);
  }, [payment]);

  const customerPhone = useMemo(() => {
    return cleanText(payment?.customer_phone);
  }, [payment]);

  return (
    <main className="bg-[#F7F7F8] text-gray-900">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-8 lg:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <Link
            href="/agentdashboard/tagihan"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 sm:px-3.5 sm:text-xs md:px-4 md:text-sm"
          >
            <ArrowLeft size={15} />
            {currentLang === "id" ? "Kembali ke Tagihan" : "Back to Billing"}
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-3 py-2 text-[11px] font-medium text-white shadow-sm transition hover:opacity-90 sm:px-3.5 sm:text-xs md:px-4 md:text-sm"
          >
            <Printer size={15} />
            {currentLang === "id" ? "Cetak" : "Print"}
          </button>
        </div>

        {loading ? (
          <div className="rounded-[24px] border border-gray-200 bg-white p-5 text-xs text-gray-500 shadow-sm sm:rounded-[26px] sm:p-6 md:rounded-[28px] md:p-8 md:text-sm">
            {currentLang === "id" ? "Memuat receipt..." : "Loading receipt..."}
          </div>
        ) : error || !payment ? (
          <div className="rounded-[24px] border border-gray-200 bg-white p-5 text-xs text-red-600 shadow-sm sm:rounded-[26px] sm:p-6 md:rounded-[28px] md:p-8 md:text-sm">
            {error ||
              (currentLang === "id"
                ? "Receipt tidak ditemukan."
                : "Receipt not found.")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm sm:rounded-[26px] md:rounded-[28px]">
            <div className="border-b border-gray-100 px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-7 lg:px-8 lg:py-8">
              <div className="flex flex-col gap-5 sm:gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative h-11 w-11 shrink-0 rounded-2xl border border-gray-200 bg-white p-2 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16">
                    <Image
                      src="/tetamo-logo-transparent1.png"
                      alt="Tetamo"
                      fill
                      sizes="64px"
                      className="object-contain p-2"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight text-[#1C1C1E] sm:text-sm md:text-lg lg:text-xl">
                      Tetamo Pty Ltd
                    </p>
                    <p className="mt-1 text-[10px] text-gray-500 sm:text-xs md:text-sm">
                      ABN 18 689 780 970
                    </p>
                    <p className="mt-1.5 text-[10px] leading-5 text-gray-500 sm:text-xs sm:leading-5 md:text-sm md:leading-6">
                      Suite 809 168 Kent Street Sydney NSW 2000
                    </p>
                    <p className="text-[10px] text-gray-500 sm:text-xs md:text-sm">
                      www.tetamo.com
                    </p>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm font-bold tracking-tight text-[#1C1C1E] sm:text-lg md:text-2xl lg:text-3xl">
                    Receipt
                  </p>
                  <p className="mt-1 break-words text-[11px] font-medium text-gray-500 sm:text-sm md:text-sm lg:text-base">
                    {receiptNumber}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] md:text-xs ${statusBadgeClass}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-5 border-b border-gray-100 px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-2 md:px-7 md:py-7 lg:px-8 lg:py-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
                  {currentLang === "id" ? "Diterima Dari" : "Received From"}
                </p>
                <p className="mt-3 text-xs font-semibold text-[#1C1C1E] sm:text-sm md:text-lg lg:text-xl">
                  {customerName}
                </p>
                <p className="mt-1 break-all text-[11px] text-gray-500 sm:text-sm md:text-sm">
                  {customerEmail}
                </p>
                <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                  {customerPhone}
                </p>
              </div>

              <div className="grid gap-2.5 text-xs sm:gap-3 sm:text-sm md:gap-4 md:text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">
                    {currentLang === "id" ? "Tanggal Receipt" : "Receipt Date"}
                  </span>
                  <span className="text-right font-medium text-[#1C1C1E]">
                    {formatDate(payment.paid_at || payment.created_at, locale)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">
                    {currentLang === "id" ? "Waktu Bayar" : "Paid Time"}
                  </span>
                  <span className="text-right font-medium text-[#1C1C1E]">
                    {formatDateTime(payment.paid_at || payment.created_at, locale)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">
                    {currentLang === "id" ? "Nomor Invoice" : "Invoice Number"}
                  </span>
                  <span className="break-all text-right font-medium text-[#1C1C1E]">
                    {invoiceNumber}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">
                    {currentLang === "id" ? "Metode Pembayaran" : "Payment Method"}
                  </span>
                  <span className="text-right font-medium text-[#1C1C1E]">
                    {paymentMethod}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <span className="text-gray-500">
                    {currentLang === "id" ? "Referensi" : "Reference"}
                  </span>
                  <span className="break-all text-right font-medium text-[#1C1C1E]">
                    {referenceNumber}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-100 px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-7 lg:px-8 lg:py-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
                {currentLang === "id" ? "Detail Pembayaran" : "Payment Details"}
              </p>

              <div className="mt-4 rounded-3xl border border-gray-200">
                <div className="grid gap-4 border-b border-gray-100 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-[1fr_auto] md:px-6 md:py-6">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-[#1C1C1E] sm:text-base md:text-lg lg:text-xl">
                      {productTitle}
                    </p>

                    <p className="mt-2 text-[11px] text-gray-500 sm:text-sm md:text-sm">
                      Package: {packageName}
                    </p>

                    <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                      {currentLang === "id" ? "Tipe Pembayaran" : "Payment Type"}:{" "}
                      {paymentType}
                    </p>

                    <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                      {currentLang === "id" ? "Tipe Tagihan" : "Billing Type"}:{" "}
                      {billingType}
                    </p>

                    <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                      Plan Code: {cleanText(payment.product_id)}
                    </p>

                    {blankText(payment.property_code_snapshot) ? (
                      <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                        {currentLang === "id" ? "Kode Listing" : "Listing Code"}:{" "}
                        {payment.property_code_snapshot}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-left md:text-right">
                    <p className="break-words text-sm font-semibold text-[#1C1C1E] sm:text-base md:text-xl lg:text-2xl">
                      {paymentAmount}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-[1fr_260px] md:px-6 md:py-6 lg:grid-cols-[1fr_300px]">
                  <div className="grid gap-2 text-xs leading-6 text-gray-600 sm:text-sm">
                    <p>
                      {payment.description ||
                        getMetaString(payment.metadata, "paymentDescription") ||
                        getMetaString(payment.metadata, "payment_description") ||
                        "-"}
                    </p>

                    <div className="mt-2 grid gap-2 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex justify-between gap-3">
                        <span>{currentLang === "id" ? "Mulai" : "Starts"}</span>
                        <span className="font-medium text-[#1C1C1E]">
                          {formatDate(startsAt, locale)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span>{currentLang === "id" ? "Expired" : "Expiry"}</span>
                        <span className="font-medium text-[#1C1C1E]">
                          {formatDate(expiryDate, locale)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span>
                          {currentLang === "id" ? "Limit Listing" : "Listing Limit"}
                        </span>
                        <span className="font-medium text-[#1C1C1E]">
                          {listingLimit > 0
                            ? currentLang === "id"
                              ? `${listingLimit} listing aktif`
                              : `${listingLimit} active listings`
                            : "-"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span>Auto Renew</span>
                        <span className="font-medium text-[#1C1C1E]">
                          {membership?.auto_renew
                            ? currentLang === "id"
                              ? "Aktif"
                              : "Enabled"
                            : currentLang === "id"
                            ? "Tidak aktif"
                            : "Disabled"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-gray-500 sm:text-sm">
                        Subtotal
                      </span>
                      <span className="break-words text-xs font-semibold text-[#1C1C1E] sm:text-sm">
                        {subtotalAmount}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-gray-500 sm:text-sm">
                        Discount
                      </span>
                      <span className="break-words text-xs font-semibold text-[#1C1C1E] sm:text-sm">
                        {discountAmount}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-gray-500 sm:text-sm">
                        Tax
                      </span>
                      <span className="break-words text-xs font-semibold text-[#1C1C1E] sm:text-sm">
                        {taxAmount}
                      </span>
                    </div>

                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold text-[#1C1C1E] sm:text-sm md:text-sm lg:text-base">
                          {currentLang === "id" ? "Jumlah Dibayar" : "Amount Paid"}
                        </span>
                        <span className="break-words text-xs font-bold text-[#1C1C1E] sm:text-sm md:text-lg lg:text-xl">
                          {paymentAmount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(payment.receipt_url ||
                payment.hosted_invoice_url ||
                payment.invoice_pdf_url) ? (
                <div className="mt-5 flex flex-wrap gap-2 print:hidden">
                  {payment.receipt_url ? (
                    <a
                      href={payment.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Payment Receipt
                    </a>
                  ) : null}

                  {payment.hosted_invoice_url ? (
                    <a
                      href={payment.hosted_invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Payment Invoice
                    </a>
                  ) : null}

                  {payment.invoice_pdf_url ? (
                    <a
                      href={payment.invoice_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Invoice PDF
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-2 md:px-7 md:py-7 lg:px-8 lg:py-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
                  {currentLang === "id" ? "Catatan" : "Notes"}
                </p>
                <p className="mt-3 whitespace-pre-line text-xs leading-6 text-gray-600 sm:text-sm md:text-sm lg:text-base lg:leading-7">
                  {getMetaString(payment.metadata, "billingNote") ||
                    getMetaString(payment.metadata, "billing_note") ||
                    (currentLang === "id"
                      ? "Tidak ada catatan tambahan."
                      : "No additional notes.")}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
                  {currentLang === "id" ? "Konfirmasi" : "Confirmation"}
                </p>
                <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm md:text-sm lg:text-base lg:leading-7">
                  {currentLang === "id"
                    ? "Receipt ini mengonfirmasi bahwa pembayaran telah diterima oleh sistem billing Tetamo."
                    : "This receipt confirms that payment has been received by the Tetamo billing system."}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}