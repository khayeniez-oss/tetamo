"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type PaymentStatus =
  | "initiated"
  | "pending"
  | "succeeded"
  | "failed"
  | "expired"
  | "refunded"
  | null;

type PaymentRow = {
  id: string;
  user_id: string | null;
  receipt_number: string | null;
  billing_record_id: string | null;
  amount: number | null;
  amount_idr: number | null;
  currency: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string | null;
  payment_method: string | null;
  method: string | null;
  gateway: string | null;
  provider: string | null;
  reference: string | null;
  gateway_reference: string | null;
  product_name: string | null;
  payment_title: string | null;
  payment_description: string | null;
  billing_note: string | null;
};

type BillingRow = {
  id: string;
  user_id: string | null;
  invoice_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  listing_code: string | null;
  property_title: string | null;
  property_city: string | null;
  property_province: string | null;
  description: string | null;
  notes: string | null;
};

function formatAmount(
  amount: number | null,
  amountIdr: number | null,
  currency: string | null
) {
  const code = (currency || "IDR").toUpperCase();

  if (code === "IDR" || amountIdr !== null) {
    const value = Number(amountIdr ?? amount ?? 0);
    return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
  }

  const value = Number(amount ?? amountIdr ?? 0);

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

function formatDate(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function paymentStatusClasses(status: PaymentStatus) {
  switch ((status || "").toLowerCase()) {
    case "succeeded":
      return "bg-green-50 text-green-700 border-green-200";
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

function paymentStatusLabel(status: PaymentStatus, lang: string) {
  const currentLang = lang === "id" ? "id" : "en";

  switch ((status || "").toLowerCase()) {
    case "succeeded":
      return currentLang === "id" ? "LUNAS" : "PAID";
    case "failed":
      return currentLang === "id" ? "GAGAL" : "FAILED";
    case "expired":
      return currentLang === "id" ? "KEDALUWARSA" : "EXPIRED";
    case "refunded":
      return currentLang === "id" ? "DIKEMBALIKAN" : "REFUNDED";
    case "pending":
    case "initiated":
    default:
      return currentLang === "id" ? "MENUNGGU" : "PENDING";
  }
}

export default function AgentReceiptDetailPage() {
  const { lang } = useLanguage();

  const params = useParams<{ id: string }>();
  const paymentId = typeof params?.id === "string" ? params.id : "";

  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [billing, setBilling] = useState<BillingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadReceipt() {
      if (!paymentId) return;

      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (authError || !user) {
        setError(
          lang === "id" ? "Silakan login ulang." : "Please log in again."
        );
        setLoading(false);
        return;
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(
          `
            id,
            user_id,
            receipt_number,
            billing_record_id,
            amount,
            amount_idr,
            currency,
            status,
            paid_at,
            created_at,
            payment_method,
            method,
            gateway,
            provider,
            reference,
            gateway_reference,
            product_name,
            payment_title,
            payment_description,
            billing_note
          `
        )
        .eq("id", paymentId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ignore) return;

      if (paymentError || !paymentData) {
        console.error("Failed to load agent receipt:", paymentError);
        setError(
          lang === "id" ? "Gagal memuat receipt." : "Failed to load receipt."
        );
        setLoading(false);
        return;
      }

      setPayment(paymentData as PaymentRow);

      if (paymentData.billing_record_id) {
        const { data: billingData } = await supabase
          .from("billing_records")
          .select(
            `
              id,
              user_id,
              invoice_number,
              customer_name,
              customer_email,
              customer_phone,
              customer_address,
              listing_code,
              property_title,
              property_city,
              property_province,
              description,
              notes
            `
          )
          .eq("id", paymentData.billing_record_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (ignore) return;

        setBilling((billingData as BillingRow) || null);
      }

      setLoading(false);
    }

    loadReceipt();

    return () => {
      ignore = true;
    };
  }, [paymentId, lang]);

  const paymentAmount = formatAmount(
    payment?.amount ?? 0,
    payment?.amount_idr ?? null,
    payment?.currency ?? "IDR"
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7 lg:px-8 lg:py-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/agentdashboard/tagihan"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 sm:px-3.5 sm:text-xs md:px-4 md:text-sm"
        >
          <ArrowLeft size={15} />
          {lang === "id" ? "Kembali ke Tagihan" : "Back to Billing"}
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-3 py-2 text-[11px] font-medium text-white shadow-sm transition hover:opacity-90 sm:px-3.5 sm:text-xs md:px-4 md:text-sm"
        >
          <Printer size={15} />
          {lang === "id" ? "Cetak" : "Print"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 text-xs text-gray-500 shadow-sm sm:rounded-[26px] sm:p-6 md:rounded-[28px] md:p-8 md:text-sm">
          {lang === "id" ? "Memuat receipt..." : "Loading receipt..."}
        </div>
      ) : error || !payment ? (
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 text-xs text-red-600 shadow-sm sm:rounded-[26px] sm:p-6 md:rounded-[28px] md:p-8 md:text-sm">
          {error ||
            (lang === "id" ? "Receipt tidak ditemukan." : "Receipt not found.")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm sm:rounded-[26px] md:rounded-[28px]">
          <div className="border-b border-gray-100 px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-7 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-5 sm:gap-6 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <img
                  src="/tetamo-logo-transparent1.png"
                  alt="Tetamo"
                  className="h-11 w-11 rounded-2xl border border-gray-200 bg-white object-contain p-2 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16"
                />

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
                  {payment.receipt_number || "-"}
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] md:text-xs ${paymentStatusClasses(
                    payment.status
                  )}`}
                >
                  {paymentStatusLabel(payment.status, lang)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 border-b border-gray-100 px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-2 md:px-7 md:py-7 lg:px-8 lg:py-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
                {lang === "id" ? "Diterima Dari" : "Received From"}
              </p>
              <p className="mt-3 text-xs font-semibold text-[#1C1C1E] sm:text-sm md:text-lg lg:text-xl">
                {billing?.customer_name || "Unknown"}
              </p>
              <p className="mt-1 text-[11px] text-gray-500 sm:text-sm md:text-sm">
                {billing?.customer_email || "-"}
              </p>
              <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                {billing?.customer_phone || "-"}
              </p>
              <p className="text-[11px] leading-5 text-gray-500 sm:text-sm sm:leading-6 md:text-sm md:leading-6">
                {billing?.customer_address || "-"}
              </p>
            </div>

            <div className="grid gap-2.5 text-xs sm:gap-3 sm:text-sm md:gap-4 md:text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">
                  {lang === "id" ? "Tanggal Receipt" : "Receipt Date"}
                </span>
                <span className="text-right font-medium text-[#1C1C1E]">
                  {formatDate(payment.paid_at || payment.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">
                  {lang === "id" ? "Nomor Invoice" : "Invoice Number"}
                </span>
                <span className="text-right font-medium text-[#1C1C1E]">
                  {billing?.invoice_number || "-"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">
                  {lang === "id" ? "Metode Pembayaran" : "Payment Method"}
                </span>
                <span className="text-right font-medium text-[#1C1C1E]">
                  {payment.payment_method ||
                    payment.method ||
                    payment.gateway ||
                    payment.provider ||
                    "-"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">
                  {lang === "id" ? "Referensi" : "Reference"}
                </span>
                <span className="text-right font-medium text-[#1C1C1E]">
                  {payment.gateway_reference || payment.reference || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 px-4 py-5 sm:px-5 sm:py-6 md:px-7 md:py-7 lg:px-8 lg:py-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
              {lang === "id" ? "Detail Pembayaran" : "Payment Details"}
            </p>

            <div className="mt-4 rounded-3xl border border-gray-200">
              <div className="grid gap-4 border-b border-gray-100 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-[1fr_auto] md:px-6 md:py-6">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-[#1C1C1E] sm:text-base md:text-lg lg:text-xl">
                    {payment.product_name ||
                      payment.payment_title ||
                      payment.payment_description ||
                      billing?.description ||
                      billing?.property_title ||
                      "-"}
                  </p>

                  <p className="mt-2 text-[11px] text-gray-500 sm:text-sm md:text-sm">
                    {billing?.listing_code
                      ? `Listing: ${billing.listing_code}`
                      : "Listing: -"}
                  </p>

                  <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                    {billing?.property_title || "-"}
                  </p>

                  <p className="text-[11px] text-gray-500 sm:text-sm md:text-sm">
                    {billing?.property_city || "-"}
                    {billing?.property_province
                      ? `, ${billing.property_province}`
                      : ""}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="break-words text-sm font-semibold text-[#1C1C1E] sm:text-base md:text-xl lg:text-2xl">
                    {paymentAmount}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-[1fr_240px] md:px-6 md:py-6 lg:grid-cols-[1fr_260px]">
                <div />

                <div className="rounded-3xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-[#1C1C1E] sm:text-sm md:text-sm lg:text-base">
                      {lang === "id" ? "Jumlah Dibayar" : "Amount Paid"}
                    </span>
                    <span className="break-words text-xs font-bold text-[#1C1C1E] sm:text-sm md:text-lg lg:text-xl">
                      {paymentAmount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-4 py-5 sm:px-5 sm:py-6 md:grid-cols-2 md:px-7 md:py-7 lg:px-8 lg:py-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
                {lang === "id" ? "Catatan" : "Notes"}
              </p>
              <p className="mt-3 whitespace-pre-line text-xs leading-6 text-gray-600 sm:text-sm md:text-sm lg:text-base lg:leading-7">
                {payment.billing_note ||
                  payment.payment_description ||
                  billing?.notes ||
                  (lang === "id"
                    ? "Tidak ada catatan tambahan."
                    : "No additional notes.")}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px] md:text-xs">
                {lang === "id" ? "Konfirmasi" : "Confirmation"}
              </p>
              <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm md:text-sm lg:text-base lg:leading-7">
                {lang === "id"
                  ? "Receipt ini mengonfirmasi bahwa pembayaran telah diterima oleh sistem billing Tetamo."
                  : "This receipt confirms that payment has been received by the Tetamo billing system."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}