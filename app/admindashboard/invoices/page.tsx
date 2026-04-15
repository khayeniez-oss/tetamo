"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type InvoiceStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED"
  | "UNPAID";

type AdminInvoiceRow = {
  payment_id: string;
  issued_at: string | null;
  paid_at: string | null;
  invoice_status: string | null;
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

type Invoice = {
  id: string;
  invoiceNumber: string;
  owner: string;
  listingCode: string;
  package: string;
  amount: string;
  date: string;
  status: InvoiceStatus;
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

function formatDate(date: string | null) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function normalizeStatus(status: string | null): InvoiceStatus {
  const v = String(status || "").toLowerCase();

  if (v === "paid") return "PAID";
  if (v === "pending" || v === "checkout_created") return "UNPAID";
  if (v === "overdue") return "OVERDUE";
  if (v === "failed") return "FAILED";
  if (v === "canceled" || v === "cancelled") return "CANCELLED";
  if (v === "refunded" || v === "partially_refunded") return "REFUNDED";

  return "UNPAID";
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

function getPackageLabel(row: AdminInvoiceRow) {
  if (row.description?.trim()) return row.description.trim();
  if (row.plan_name?.trim()) return row.plan_name.trim();
  if (row.property_title_snapshot?.trim()) return row.property_title_snapshot.trim();
  if (row.payment_type?.trim()) return humanizePaymentType(row.payment_type);
  return "-";
}

function getInvoiceNumber(row: AdminInvoiceRow) {
  if (row.stripe_invoice_id?.trim()) return row.stripe_invoice_id.trim();
  return `INV-${row.payment_id.slice(0, 8).toUpperCase()}`;
}

function getOwnerLabel(row: AdminInvoiceRow) {
  if (row.customer_name?.trim()) return row.customer_name.trim();
  if (row.customer_email?.trim()) return row.customer_email.trim();
  return "Unknown";
}

function getStatusClasses(status: InvoiceStatus) {
  switch (status) {
    case "PAID":
      return "bg-green-50 text-green-700 border-green-200";
    case "FAILED":
      return "bg-red-50 text-red-700 border-red-200";
    case "OVERDUE":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-700 border-gray-200";
    case "REFUNDED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "PENDING":
    case "UNPAID":
    default:
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
}

export default function AdminInvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInvoices() {
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
        .order("issued_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load invoices:", error);
        setError("Gagal memuat invoice.");
        setInvoices([]);
        setLoading(false);
        return;
      }

      const mapped: Invoice[] = ((data || []) as AdminInvoiceRow[]).map((row) => ({
        id: row.payment_id,
        invoiceNumber: getInvoiceNumber(row),
        owner: getOwnerLabel(row),
        listingCode: row.property_code_snapshot?.trim() || "-",
        package: getPackageLabel(row),
        amount: formatAmount(row.amount_total ?? row.amount_subtotal ?? 0, row.currency),
        date: formatDate(row.paid_at || row.issued_at),
        status: normalizeStatus(row.invoice_status),
      }));

      setInvoices(mapped);
      setLoading(false);
    }

    loadInvoices();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return invoices;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return invoices.filter((invoice) => {
      const searchable = `
        ${invoice.invoiceNumber}
        ${invoice.owner}
        ${invoice.listingCode}
        ${invoice.package}
        ${invoice.status}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, invoices]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Invoices
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Semua tagihan yang dibuat oleh sistem.
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Cari invoice..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-2xl border border-gray-300 py-3 pl-10 pr-4 text-[13px] outline-none focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading invoices...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Belum ada invoice.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/admindashboard/invoices/${invoice.id}`}
                className="block px-3.5 py-4 transition hover:bg-gray-50 sm:px-5"
              >
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${getStatusClasses(
                        invoice.status
                      )}`}
                    >
                      {invoice.status}
                    </span>
                  </div>

                  <p className="text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                    {invoice.invoiceNumber}
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Owner
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                        {invoice.owner}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Listing Code
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                        {invoice.listingCode}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Package
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                        {invoice.package}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Amount
                      </p>
                      <p className="mt-1 text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                        {invoice.amount}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                        Date
                      </p>
                      <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                        {invoice.date}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}