"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ReceiptRow = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  property_code_snapshot: string | null;
  amount_total: number | null;
  currency: string | null;
  paid_at: string | null;
  created_at: string | null;
  receipt_url: string | null;
  stripe_charge_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_invoice_id: string | null;
  product_name_snapshot: string | null;
  status:
    | "pending"
    | "checkout_created"
    | "paid"
    | "failed"
    | "expired"
    | "canceled"
    | "cancelled"
    | "refunded"
    | "partially_refunded"
    | null;
};

type ReceiptItem = {
  id: string;
  receiptNumber: string;
  owner: string;
  invoiceNumber: string;
  amount: string;
  date: string;
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

function getReceiptNumber(row: ReceiptRow) {
  if (row.stripe_charge_id?.trim()) {
    return `RCT-${row.stripe_charge_id.trim()}`;
  }

  if (row.stripe_payment_intent_id?.trim()) {
    return `RCT-${row.stripe_payment_intent_id.trim()}`;
  }

  return `RCT-${row.id.slice(0, 8).toUpperCase()}`;
}

function getInvoiceNumber(row: ReceiptRow) {
  if (row.stripe_invoice_id?.trim()) return row.stripe_invoice_id.trim();
  if (row.stripe_checkout_session_id?.trim()) {
    return `INV-${row.stripe_checkout_session_id.slice(0, 8).toUpperCase()}`;
  }
  return "-";
}

export default function AdminReceiptsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadReceipts() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("payment_transactions")
        .select(
          `
            id,
            customer_name,
            customer_email,
            property_code_snapshot,
            amount_total,
            currency,
            paid_at,
            created_at,
            receipt_url,
            stripe_charge_id,
            stripe_payment_intent_id,
            stripe_checkout_session_id,
            stripe_invoice_id,
            product_name_snapshot,
            status
          `
        )
        .eq("status", "paid")
        .not("receipt_url", "is", null)
        .order("paid_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load receipts:", error);
        setError("Gagal memuat receipt.");
        setReceipts([]);
        setLoading(false);
        return;
      }

      const rows = (data || []) as ReceiptRow[];

      const mapped: ReceiptItem[] = rows.map((row) => ({
        id: row.id,
        receiptNumber: getReceiptNumber(row),
        owner:
          row.customer_name?.trim() ||
          row.customer_email?.trim() ||
          "Unknown",
        invoiceNumber: getInvoiceNumber(row),
        amount: formatAmount(row.amount_total ?? 0, row.currency),
        date: formatDate(row.paid_at || row.created_at),
      }));

      setReceipts(mapped);
      setLoading(false);
    }

    loadReceipts();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return receipts;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return receipts.filter((r) => {
      const searchable = `
        ${r.receiptNumber}
        ${r.owner}
        ${r.invoiceNumber}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, receipts]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Receipts
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Bukti pembayaran yang berhasil.
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Cari receipt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-2xl border border-gray-300 py-3 pl-10 pr-4 text-[13px] outline-none focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading receipts...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Belum ada receipt.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/admindashboard/receipts/${r.id}`}
                className="block px-3.5 py-4 transition hover:bg-gray-50 sm:px-5"
              >
                <div className="flex flex-col gap-3.5">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-700 sm:text-[11px]">
                      Paid Receipt
                    </span>

                    <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                      {r.receiptNumber}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Owner
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                          {r.owner}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Invoice
                        </p>
                        <p className="mt-1 break-words text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                          {r.invoiceNumber}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Amount
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                          {r.amount}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                          Date
                        </p>
                        <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                          {r.date}
                        </p>
                      </div>
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