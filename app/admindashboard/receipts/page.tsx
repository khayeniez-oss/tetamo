"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PaymentRow = {
  id: string;
  receipt_number: string | null;
  billing_record_id: string | null;
  amount: number | null;
  currency: string | null;
  paid_at: string | null;
  created_at: string | null;
  status:
    | "initiated"
    | "pending"
    | "succeeded"
    | "failed"
    | "expired"
    | "refunded"
    | null;
};

type BillingRecordRow = {
  id: string;
  invoice_number: string | null;
  customer_name: string | null;
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

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(
          `
            id,
            receipt_number,
            billing_record_id,
            amount,
            currency,
            paid_at,
            created_at,
            status
          `
        )
        .eq("status", "succeeded")
        .not("receipt_number", "is", null)
        .order("paid_at", { ascending: false });

      if (!isMounted) return;

      if (paymentsError) {
        console.error("Failed to load receipts:", paymentsError);
        setError("Gagal memuat receipt.");
        setReceipts([]);
        setLoading(false);
        return;
      }

      const paymentRows = (paymentsData || []) as PaymentRow[];
      const billingIds = Array.from(
        new Set(
          paymentRows
            .map((row) => row.billing_record_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let billingMap = new Map<string, BillingRecordRow>();

      if (billingIds.length > 0) {
        const { data: billingData, error: billingError } = await supabase
          .from("billing_records")
          .select(
            `
              id,
              invoice_number,
              customer_name
            `
          )
          .in("id", billingIds);

        if (!isMounted) return;

        if (billingError) {
          console.error(
            "Failed to load billing records for receipts:",
            billingError
          );
          setError("Gagal memuat receipt.");
          setReceipts([]);
          setLoading(false);
          return;
        }

        billingMap = new Map(
          ((billingData || []) as BillingRecordRow[]).map((row) => [row.id, row])
        );
      }

      const mapped: ReceiptItem[] = paymentRows.map((row) => {
        const billing = row.billing_record_id
          ? billingMap.get(row.billing_record_id)
          : undefined;

        return {
          id: row.id,
          receiptNumber: row.receipt_number?.trim() || "-",
          owner: billing?.customer_name?.trim() || "Unknown",
          invoiceNumber: billing?.invoice_number?.trim() || "-",
          amount: formatAmount(row.amount ?? 0, row.currency),
          date: formatDate(row.paid_at || row.created_at),
        };
      });

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Receipts</h1>
        <p className="text-sm text-gray-500">Bukti pembayaran yang berhasil.</p>
      </div>

      <div className="relative mt-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari receipt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-gray-400 py-3 pl-12 pr-4 text-sm outline-none focus:border-[#1C1C1E]"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                className="flex items-center justify-between p-6 transition hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium text-[#1C1C1E]">{r.receiptNumber}</p>

                  <p className="text-sm text-gray-500">Owner: {r.owner}</p>

                  <p className="text-sm text-gray-500">
                    Invoice: {r.invoiceNumber}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-600">{r.amount}</p>

                  <p className="text-xs text-gray-500">{r.date}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}