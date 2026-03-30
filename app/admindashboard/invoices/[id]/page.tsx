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
  | "paid"
  | "failed"
  | "overdue"
  | "cancelled"
  | "refunded"
  | null;

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
  plan_code: string | null;
  bill_type: string | null;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  amount: number | null;
  currency: string | null;
  created_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  status: BillingStatus;
  notes: string | null;
};

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
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "cancelled":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "refunded":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "pending":
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
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    case "pending":
    default:
      return "UNPAID";
  }
}

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = typeof params?.id === "string" ? params.id : "";

  const [invoice, setInvoice] = useState<BillingRecordRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInvoice() {
      if (!invoiceId) return;

      setLoading(true);
      setError("");

      const { data, error } = await supabase
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
            plan_code,
            bill_type,
            subtotal,
            tax,
            discount,
            total,
            amount,
            currency,
            created_at,
            due_at,
            paid_at,
            status,
            notes
          `
        )
        .eq("id", invoiceId)
        .maybeSingle();

      if (!isMounted) return;

      if (error || !data) {
        console.error("Failed to load invoice detail:", error);
        setError("Gagal memuat invoice.");
        setInvoice(null);
        setLoading(false);
        return;
      }

      setInvoice(data as BillingRecordRow);
      setLoading(false);
    }

    loadInvoice();

    return () => {
      isMounted = false;
    };
  }, [invoiceId]);

  const subtotal = invoice?.subtotal ?? invoice?.amount ?? 0;
  const tax = invoice?.tax ?? 0;
  const discount = invoice?.discount ?? 0;
  const total = invoice?.total ?? subtotal + tax - discount;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/admindashboard/invoices"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#1C1C1E] shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          Back to Invoices
        </Link>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
        >
          <Printer size={16} />
          Print
        </button>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-gray-200 bg-white p-8 text-sm text-gray-500 shadow-sm">
          Loading invoice...
        </div>
      ) : error || !invoice ? (
        <div className="rounded-[28px] border border-gray-200 bg-white p-8 text-sm text-red-600 shadow-sm">
          {error || "Invoice not found."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-7 md:px-8 md:py-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <img
                  src="/tetamo-logo-transparent1.png"
                  alt="Tetamo"
                  className="h-16 w-16 rounded-2xl border border-gray-200 bg-white object-contain p-2"
                />

                <div>
                  <p className="text-2xl font-bold leading-tight text-[#1C1C1E]">
                    Tetamo Pty Ltd
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    ABN 18 689 780 970
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    Suite 809 168 Kent Street Sydney NSW 2000
                  </p>
                  <p className="text-sm text-gray-500">www.tetamo.com</p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-3xl font-bold tracking-tight text-[#1C1C1E]">
                  Invoice
                </p>
                <p className="mt-2 text-lg font-medium text-gray-500">
                  {invoice.invoice_number || "-"}
                </p>
                <span
                  className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClasses(
                    invoice.status
                  )}`}
                >
                  {getStatusLabel(invoice.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-8 border-b border-gray-100 px-6 py-7 md:grid-cols-2 md:px-8 md:py-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Bill To
              </p>
              <p className="mt-4 text-2xl font-semibold text-[#1C1C1E]">
                {invoice.customer_name || "Unknown"}
              </p>
              <p className="mt-1 text-base text-gray-500">
                {invoice.customer_email || "-"}
              </p>
              <p className="text-base text-gray-500">
                {invoice.customer_phone || "-"}
              </p>
              <p className="text-base text-gray-500">
                {invoice.customer_address || "-"}
              </p>
              <p className="mt-3 text-base text-gray-500">
                {invoice.customer_role || "-"}
                {invoice.customer_agency ? ` • ${invoice.customer_agency}` : ""}
              </p>
            </div>

            <div className="grid gap-4 text-base">
              <div className="flex items-center justify-between gap-6">
                <span className="text-gray-500">Issue Date</span>
                <span className="font-medium text-[#1C1C1E]">
                  {formatDate(invoice.created_at)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6">
                <span className="text-gray-500">Due Date</span>
                <span className="font-medium text-[#1C1C1E]">
                  {formatDate(invoice.due_at)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6">
                <span className="text-gray-500">Paid Date</span>
                <span className="font-medium text-[#1C1C1E]">
                  {formatDate(invoice.paid_at)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-6">
                <span className="text-gray-500">Listing Code</span>
                <span className="font-medium text-[#1C1C1E]">
                  {invoice.listing_code || "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-100 px-6 py-7 md:px-8 md:py-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Invoice Item
            </p>

            <div className="mt-5 rounded-3xl border border-gray-200">
              <div className="grid gap-5 border-b border-gray-100 px-6 py-6 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-2xl font-semibold leading-tight text-[#1C1C1E]">
                    {invoice.description ||
                      invoice.property_title ||
                      invoice.plan_code ||
                      invoice.bill_type ||
                      "-"}
                  </p>

                  <p className="mt-2 text-base text-gray-500">
                    {invoice.property_title || "-"}
                  </p>

                  <p className="text-base text-gray-500">
                    {invoice.property_city || "-"}
                    {invoice.property_province
                      ? `, ${invoice.property_province}`
                      : ""}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-3xl font-semibold text-[#1C1C1E]">
                    {formatAmount(total, invoice.currency)}
                  </p>
                </div>
              </div>

              <div className="grid gap-8 px-6 py-6 md:grid-cols-[1fr_300px]">
                <div>
                  <p className="text-base text-gray-500">
                    Plan Code: {invoice.plan_code || "-"}
                  </p>
                  <p className="text-base text-gray-500">
                    Bill Type: {invoice.bill_type || "-"}
                  </p>
                </div>

                <div className="rounded-3xl bg-gray-50 p-5">
                  <div className="flex items-center justify-between text-base">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium text-[#1C1C1E]">
                      {formatAmount(subtotal, invoice.currency)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-base">
                    <span className="text-gray-500">Tax</span>
                    <span className="font-medium text-[#1C1C1E]">
                      {formatAmount(tax, invoice.currency)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-base">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-[#1C1C1E]">
                      {formatAmount(discount, invoice.currency)}
                    </span>
                  </div>

                  <div className="mt-5 border-t border-gray-200 pt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-[#1C1C1E]">
                        Total
                      </span>
                      <span className="text-2xl font-bold text-[#1C1C1E]">
                        {formatAmount(total, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 px-6 py-7 md:grid-cols-2 md:px-8 md:py-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Notes
              </p>
              <p className="mt-3 whitespace-pre-line text-base leading-7 text-gray-600">
                {invoice.notes || "No additional notes."}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Terms
              </p>
              <p className="mt-3 text-base leading-7 text-gray-600">
                This invoice was generated by the Tetamo billing system. Please
                keep this document for your records.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}