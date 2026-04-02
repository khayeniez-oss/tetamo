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

type BillingRecordRow = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
  listing_code: string | null;
  property_title: string | null;
  description: string | null;
  plan_code: string | null;
  bill_type: string | null;
  total: number | null;
  amount: number | null;
  currency: string | null;
  created_at: string | null;
  status:
    | "pending"
    | "paid"
    | "failed"
    | "overdue"
    | "cancelled"
    | "refunded"
    | null;
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

function normalizeStatus(status: BillingRecordRow["status"]): InvoiceStatus {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "PAID";
    case "pending":
      return "UNPAID";
    case "overdue":
      return "OVERDUE";
    case "failed":
      return "FAILED";
    case "cancelled":
      return "CANCELLED";
    case "refunded":
      return "REFUNDED";
    default:
      return "UNPAID";
  }
}

function getPackageLabel(row: BillingRecordRow) {
  if (row.description?.trim()) return row.description.trim();
  if (row.plan_code?.trim()) return row.plan_code.trim();
  if (row.bill_type?.trim()) return row.bill_type.trim();
  if (row.property_title?.trim()) return row.property_title.trim();
  return "-";
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
        .from("billing_records")
        .select(
          `
            id,
            invoice_number,
            customer_name,
            listing_code,
            property_title,
            description,
            plan_code,
            bill_type,
            total,
            amount,
            currency,
            created_at,
            status
          `
        )
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load invoices:", error);
        setError("Gagal memuat invoice.");
        setInvoices([]);
        setLoading(false);
        return;
      }

      const mapped: Invoice[] = (data || []).map((row: BillingRecordRow) => ({
        id: row.id,
        invoiceNumber: row.invoice_number?.trim() || "-",
        owner: row.customer_name?.trim() || "Unknown",
        listingCode: row.listing_code?.trim() || "-",
        package: getPackageLabel(row),
        amount: formatAmount(row.total ?? row.amount ?? 0, row.currency),
        date: formatDate(row.created_at),
        status: normalizeStatus(row.status),
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