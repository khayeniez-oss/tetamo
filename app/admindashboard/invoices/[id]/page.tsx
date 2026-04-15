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

type BillingStatus =
  | "pending"
  | "checkout_created"
  | "paid"
  | "failed"
  | "overdue"
  | "expired"
  | "canceled"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | null;

type AdminInvoiceRow = {
  payment_id: string | null;
  issued_at: string | null;
  paid_at: string | null;
  invoice_status: BillingStatus;
  currency: string | null;
  amount_subtotal: number | null;
  amount_discount: number | null;
  amount_tax: number | null;
  amount_total: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  property_id: string | null;
  property_title_snapshot: string | null;
  property_code_snapshot: string | null;
  source_role: string | null;
  payment_type: string | null;
  plan_name: string | null;
  duration_days: number | null;
  description: string | null;
  stripe_invoice_id: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  metadata: Record<string, any> | null;
};

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizeBillingStatus(value: string | null | undefined): BillingStatus {
  const v = String(value || "").toLowerCase();

  if (
    v === "pending" ||
    v === "checkout_created" ||
    v === "paid" ||
    v === "failed" ||
    v === "overdue" ||
    v === "expired" ||
    v === "canceled" ||
    v === "cancelled" ||
    v === "refunded" ||
    v === "partially_refunded"
  ) {
    return v as BillingStatus;
  }

  return null;
}

function formatAmount(value: number | null, currency: string | null) {
  const amount = Number(value ?? 0);
  const code = (currency || "IDR").toUpperCase();

  if (code === "IDR") {
    return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US").format(amount)}`;
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

function getStatusClasses(status: BillingStatus) {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "bg-green-50 text-green-700 border-green-200";
    case "failed":
      return "bg-red-50 text-red-700 border-red-200";
    case "overdue":
    case "expired":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "canceled":
    case "cancelled":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "refunded":
    case "partially_refunded":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "pending":
    case "checkout_created":
    default:
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
}

function getStatusLabel(status: BillingStatus) {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "PAID";
    case "failed":
      return "FAILED";
    case "overdue":
      return "OVERDUE";
    case "expired":
      return "EXPIRED";
    case "canceled":
    case "cancelled":
      return "CANCELLED";
    case "refunded":
    case "partially_refunded":
      return "REFUNDED";
    case "pending":
    case "checkout_created":
    default:
      return "UNPAID";
  }
}

function humanizePaymentType(value?: string | null) {
  const v = String(value || "").toLowerCase();

  if (v === "listing_fee") return "Listing Payment";
  if (v === "featured") return "Featured Listing";
  if (v === "boost") return "Boost Listing";
  if (v === "spotlight") return "Homepage Spotlight";
  if (v === "education") return "Education Pass";
  if (v === "package") return "Membership Package";

  return "Payment";
}

function getInvoiceNumber(invoice: AdminInvoiceRow | null) {
  if (!invoice) return "-";

  if (invoice.stripe_invoice_id?.trim()) {
    return invoice.stripe_invoice_id.trim();
  }

  if (invoice.payment_id?.trim()) {
    return `INV-${invoice.payment_id.slice(0, 8).toUpperCase()}`;
  }

  return "-";
}

function getCustomerRoleLabel(sourceRole: string | null) {
  const v = String(sourceRole || "").toLowerCase();

  if (v === "owner") return "Owner";
  if (v === "agent") return "Agent";
  if (v === "developer") return "Developer";
  if (v === "admin") return "Admin";

  return "-";
}

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = typeof params?.id === "string" ? params.id : "";

  const [invoice, setInvoice] = useState<AdminInvoiceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInvoice() {
      if (!invoiceId) {
        setError("Invoice not found.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("admin_invoices_view")
        .select(
          `
            payment_id,
            issued_at,
            paid_at,
            invoice_status,
            currency,
            amount_subtotal,
            amount_discount,
            amount_tax,
            amount_total,
            customer_name,
            customer_email,
            customer_phone,
            property_id,
            property_title_snapshot,
            property_code_snapshot,
            source_role,
            payment_type,
            plan_name,
            duration_days,
            description,
            stripe_invoice_id,
            hosted_invoice_url,
            invoice_pdf_url,
            stripe_checkout_session_id,
            stripe_payment_intent_id,
            metadata
          `
        )
        .eq("payment_id", invoiceId)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        console.error("Failed to load invoice detail:", error);
        setError("Gagal memuat invoice.");
        setInvoice(null);
        setLoading(false);
        return;
      }

      const row = data as Omit<AdminInvoiceRow, "invoice_status"> & {
        invoice_status: string | null;
      };

      setInvoice({
        ...row,
        invoice_status: normalizeBillingStatus(row.invoice_status),
      });
      setLoading(false);
    }

    loadInvoice();

    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <div className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admindashboard/invoices"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:w-auto sm:text-sm"
          >
            <ArrowLeft size={15} />
            Back to Invoices
          </Link>

          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 text-[12px] font-medium text-white opacity-60 shadow-sm sm:h-11 sm:w-auto sm:text-sm"
          >
            <Printer size={15} />
            Print
          </button>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm sm:rounded-[28px] sm:p-8">
          Loading invoice...
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <div className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/admindashboard/invoices"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:w-auto sm:text-sm"
          >
            <ArrowLeft size={15} />
            Back to Invoices
          </Link>
        </div>

        <div className="rounded-[24px] border border-gray-200 bg-white p-6 text-sm text-red-600 shadow-sm sm:rounded-[28px] sm:p-8">
          {error || "Invoice not found."}
        </div>
      </div>
    );
  }

  const meta = asObject(invoice.metadata);

  const subtotal = invoice.amount_subtotal ?? 0;
  const tax = invoice.amount_tax ?? 0;
  const discount = invoice.amount_discount ?? 0;
  const total = invoice.amount_total ?? subtotal + tax - discount;

  const invoiceNumber = getInvoiceNumber(invoice);

  const notes =
    String(
      meta.admin_notes ||
        meta.billing_note ||
        meta.paymentDescription ||
        meta.payment_description ||
        ""
    ).trim() || "No additional notes.";

  const propertyLocation = [meta.property_city, meta.property_province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
      <div className="mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admindashboard/invoices"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:w-auto sm:text-sm"
        >
          <ArrowLeft size={15} />
          Back to Invoices
        </Link>

        <div className="flex flex-col gap-2 sm:flex-row">
          {invoice.hosted_invoice_url ? (
            <a
              href={invoice.hosted_invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:w-auto sm:text-sm"
            >
              View Invoice
            </a>
          ) : null}

          {invoice.invoice_pdf_url ? (
            <a
              href={invoice.invoice_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-[12px] font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:h-11 sm:w-auto sm:text-sm"
            >
              PDF
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 text-[12px] font-medium text-white shadow-sm hover:opacity-90 sm:h-11 sm:w-auto sm:text-sm"
          >
            <Printer size={15} />
            Print
          </button>
        </div>
      </div>

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
                Invoice
              </p>
              <p className="mt-1.5 text-sm font-medium text-gray-500 sm:mt-2 sm:text-lg">
                {invoiceNumber}
              </p>
              <span
                className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:mt-4 sm:px-3 sm:text-xs ${getStatusClasses(
                  invoice.invoice_status
                )}`}
              >
                {getStatusLabel(invoice.invoice_status)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-gray-100 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 md:grid-cols-2 md:px-8 md:py-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-xs sm:tracking-[0.16em]">
              Bill To
            </p>
            <p className="mt-3 text-lg font-semibold text-[#1C1C1E] sm:mt-4 sm:text-2xl">
              {invoice.customer_name || "Unknown"}
            </p>
            <p className="mt-1 text-[12px] text-gray-500 sm:text-base">
              {invoice.customer_email || "-"}
            </p>
            <p className="text-[12px] text-gray-500 sm:text-base">
              {invoice.customer_phone || "-"}
            </p>
            <p className="mt-2 text-[12px] text-gray-500 sm:mt-3 sm:text-base">
              {getCustomerRoleLabel(invoice.source_role)}
            </p>
          </div>

          <div className="grid gap-2.5 sm:gap-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Issue Date
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                  {formatDate(invoice.issued_at)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Due Date
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                  -
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Paid Date
                </p>
                <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                  {formatDate(invoice.paid_at)}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Listing Code
                </p>
                <p className="mt-1 break-words text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                  {invoice.property_code_snapshot || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-xs sm:tracking-[0.16em]">
            Invoice Item
          </p>

          <div className="mt-4 rounded-3xl border border-gray-200 sm:mt-5">
            <div className="grid gap-4 border-b border-gray-100 px-4 py-5 sm:px-6 sm:py-6 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-lg font-semibold leading-tight text-[#1C1C1E] sm:text-2xl">
                  {invoice.description ||
                    invoice.property_title_snapshot ||
                    invoice.plan_name ||
                    humanizePaymentType(invoice.payment_type) ||
                    "-"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      Property
                    </p>
                    <p className="mt-1 text-[12px] text-gray-600 sm:text-sm">
                      {invoice.property_title_snapshot || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      Location
                    </p>
                    <p className="mt-1 text-[12px] text-gray-600 sm:text-sm">
                      {propertyLocation || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      Plan Code
                    </p>
                    <p className="mt-1 text-[12px] text-gray-600 sm:text-sm">
                      {invoice.plan_name || "-"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      Bill Type
                    </p>
                    <p className="mt-1 text-[12px] text-gray-600 sm:text-sm">
                      {humanizePaymentType(invoice.payment_type)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-2xl font-semibold text-[#1C1C1E] sm:text-3xl">
                  {formatAmount(total, invoice.currency)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 px-4 py-5 sm:px-6 sm:py-6 md:grid-cols-[1fr_320px] md:gap-8">
              <div />

              <div className="rounded-3xl bg-gray-50 p-4 sm:p-5">
                <div className="flex items-center justify-between text-[12px] sm:text-base">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-[#1C1C1E]">
                    {formatAmount(subtotal, invoice.currency)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-[12px] sm:mt-4 sm:text-base">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-medium text-[#1C1C1E]">
                    {formatAmount(tax, invoice.currency)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-[12px] sm:mt-4 sm:text-base">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-medium text-[#1C1C1E]">
                    {formatAmount(discount, invoice.currency)}
                  </span>
                </div>

                <div className="mt-4 border-t border-gray-200 pt-4 sm:mt-5 sm:pt-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1C1C1E] sm:text-lg">
                      Total
                    </span>
                    <span className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
                      {formatAmount(total, invoice.currency)}
                    </span>
                  </div>
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
              {notes}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-xs sm:tracking-[0.16em]">
              Terms
            </p>
            <p className="mt-2 text-[12px] leading-6 text-gray-600 sm:mt-3 sm:text-base sm:leading-7">
              This invoice was generated by the Tetamo billing system. Please
              keep this document for your records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}