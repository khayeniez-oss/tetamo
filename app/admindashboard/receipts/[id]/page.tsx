"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  receipt_number: string | null;
  receipt_pdf_url: string | null;
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
  proof_url: string | null;
  payment_title: string | null;
  payment_description: string | null;
  product_name: string | null;
  billing_note: string | null;
};

type BillingRecordRow = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  customer_role: string | null;
  customer_agency: string | null;
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

function paymentStatusLabel(status: PaymentStatus) {
  switch ((status || "").toLowerCase()) {
    case "succeeded":
      return "PAID";
    case "failed":
      return "FAILED";
    case "expired":
      return "EXPIRED";
    case "refunded":
      return "REFUNDED";
    case "pending":
    case "initiated":
    default:
      return "PENDING";
  }
}

export default function AdminReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const paymentId = typeof params?.id === "string" ? params.id : "";

  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [invoice, setInvoice] = useState<BillingRecordRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReceipt() {
      if (!paymentId) return;

      setLoading(true);
      setError("");

      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(
          `
            id,
            receipt_number,
            receipt_pdf_url,
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
            proof_url,
            payment_title,
            payment_description,
            product_name,
            billing_note
          `
        )
        .eq("id", paymentId)
        .maybeSingle();

      if (!isMounted) return;

      if (paymentError || !paymentData) {
        console.error("Failed to load receipt detail:", paymentError);
        setError("Gagal memuat receipt.");
        setPayment(null);
        setLoading(false);
        return;
      }

      setPayment(paymentData as PaymentRow);

      if (paymentData.billing_record_id) {
        const { data: invoiceData } = await supabase
          .from("billing_records")
          .select(
            `
              id,
              invoice_number,
              customer_name,
              customer_email,
              customer_phone,
              customer_address,
              customer_role,
              customer_agency,
              listing_code,
              property_title,
              property_city,
              property_province,
              description,
              notes
            `
          )
          .eq("id", paymentData.billing_record_id)
          .maybeSingle();

        if (!isMounted) return;

        setInvoice((invoiceData as BillingRecordRow) || null);
      }

      setLoading(false);
    }

    loadReceipt();

    return () => {
      isMounted = false;
    };
  }, [paymentId]);

  const paymentAmount = formatAmount(
    payment?.amount ?? 0,
    payment?.amount_idr ?? null,
    payment?.currency ?? "IDR"
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <div className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admindashboard/receipts"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:w-auto sm:text-sm"
        >
          <ArrowLeft size={15} />
          Back to Receipts
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 text-[12px] font-medium text-white shadow-sm hover:opacity-90 sm:h-11 sm:w-auto sm:text-sm"
        >
          <Printer size={15} />
          Print
        </button>
      </div>

      {loading ? (
        <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm sm:rounded-[28px] sm:p-8">
          Loading receipt...
        </div>
      ) : error || !payment ? (
        <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-sm text-red-600 shadow-sm sm:rounded-[28px] sm:p-8">
          {error || "Receipt not found."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-gray-200 bg-white shadow-sm sm:rounded-[28px]">
          <div className="border-b border-gray-100 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <img
                  src="/tetamo-logo-transparent1.png"
                  alt="Tetamo"
                  className="h-14 w-14 rounded-2xl border border-gray-200 bg-white object-contain p-2 sm:h-16 sm:w-16"
                />

                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-[#1C1C1E] sm:text-2xl">
                    Tetamo Pty Ltd
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 sm:text-sm">
                    ABN 18 689 780 970
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-gray-500 sm:text-sm">
                    Suite 809 168 Kent Street Sydney NSW 2000
                  </p>
                  <p className="text-[11px] text-gray-500 sm:text-sm">
                    www.tetamo.com
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                  Receipt
                </p>
                <p className="mt-1.5 text-sm font-medium text-gray-500 sm:mt-2 sm:text-lg">
                  {payment.receipt_number || "-"}
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:mt-4 sm:px-3 sm:text-xs ${paymentStatusClasses(
                    payment.status
                  )}`}
                >
                  {paymentStatusLabel(payment.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-b border-gray-100 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 md:grid-cols-2 md:px-8 md:py-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-xs sm:tracking-[0.16em]">
                Received From
              </p>
              <p className="mt-3 text-lg font-semibold text-[#1C1C1E] sm:mt-4 sm:text-2xl">
                {invoice?.customer_name || "Unknown"}
              </p>
              <p className="mt-1 text-[12px] text-gray-500 sm:text-base">
                {invoice?.customer_email || "-"}
              </p>
              <p className="text-[12px] text-gray-500 sm:text-base">
                {invoice?.customer_phone || "-"}
              </p>
              <p className="text-[12px] text-gray-500 sm:text-base">
                {invoice?.customer_address || "-"}
              </p>
              <p className="mt-2 text-[12px] text-gray-500 sm:mt-3 sm:text-base">
                {invoice?.customer_role || "-"}
                {invoice?.customer_agency ? ` • ${invoice.customer_agency}` : ""}
              </p>
            </div>

            <div className="grid gap-2.5 sm:gap-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Receipt Date
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {formatDate(payment.paid_at || payment.created_at)}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Invoice Number
                  </p>
                  <p className="mt-1 break-words text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {invoice?.invoice_number || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Payment Method
                  </p>
                  <p className="mt-1 break-words text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {payment.payment_method ||
                      payment.method ||
                      payment.gateway ||
                      payment.provider ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Reference
                  </p>
                  <p className="mt-1 break-words text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {payment.gateway_reference || payment.reference || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-xs sm:tracking-[0.16em]">
              Payment Details
            </p>

            <div className="mt-4 rounded-3xl border border-gray-200 sm:mt-5">
              <div className="grid gap-4 border-b border-gray-100 px-4 py-5 sm:px-6 sm:py-6 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-lg font-semibold leading-tight text-[#1C1C1E] sm:text-2xl">
                    {payment.product_name ||
                      payment.payment_title ||
                      payment.payment_description ||
                      invoice?.description ||
                      invoice?.property_title ||
                      "-"}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Listing
                      </p>
                      <p className="mt-1 text-[12px] text-gray-600 sm:text-sm">
                        {invoice?.listing_code
                          ? `Listing: ${invoice.listing_code}`
                          : "Listing: -"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Property
                      </p>
                      <p className="mt-1 text-[12px] text-gray-600 sm:text-sm">
                        {invoice?.property_title || "-"}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Location
                      </p>
                      <p className="mt-1 text-[12px] text-gray-600 sm:text-sm">
                        {invoice?.property_city || "-"}
                        {invoice?.property_province
                          ? `, ${invoice.property_province}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-2xl font-semibold text-[#1C1C1E] sm:text-3xl">
                    {paymentAmount}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 px-4 py-5 sm:px-6 sm:py-6 md:grid-cols-[1fr_300px] md:gap-8">
                <div />
                <div className="rounded-3xl bg-gray-50 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#1C1C1E] sm:text-lg">
                      Amount Paid
                    </span>
                    <span className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                      {paymentAmount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 md:grid-cols-2 md:gap-8 md:px-8 md:py-8">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-xs sm:tracking-[0.16em]">
                Notes
              </p>
              <p className="mt-2 whitespace-pre-line text-[12px] leading-6 text-gray-600 sm:mt-3 sm:text-base sm:leading-7">
                {payment.billing_note ||
                  payment.payment_description ||
                  invoice?.notes ||
                  "No additional notes."}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-xs sm:tracking-[0.16em]">
                Confirmation
              </p>
              <p className="mt-2 text-[12px] leading-6 text-gray-600 sm:mt-3 sm:text-base sm:leading-7">
                This receipt confirms that payment has been received by the
                Tetamo billing system.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}