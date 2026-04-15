"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* =========================
TYPES
========================= */

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
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  property_code_snapshot: string | null;
  product_name_snapshot: string | null;
  description: string | null;
  payment_type: string | null;
  amount_total: number | null;
  currency: string | null;
  created_at: string | null;
  status: PaymentStatus | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type Payment = {
  id: string;
  owner: string;
  listingKode: string;
  package: string;
  amount: string;
  method: string;
  date: string;
  status: PaymentStatus;
};

/* =========================
STATUS UI
========================= */

function normalizeStatus(value?: string | null): PaymentStatus {
  const v = String(value || "").toLowerCase();

  if (
    v === "pending" ||
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

function statusUI(status: PaymentStatus) {
  const normalized = status === "checkout_created" ? "pending" : status;

  if (normalized === "paid")
    return {
      label: "Paid",
      badge: "bg-green-50 text-green-700 border-green-200",
    };

  if (normalized === "pending")
    return {
      label: "Pending",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };

  if (normalized === "failed")
    return {
      label: "Failed",
      badge: "bg-red-50 text-red-700 border-red-200",
    };

  if (normalized === "expired")
    return {
      label: "Expired",
      badge: "bg-orange-50 text-orange-700 border-orange-200",
    };

  if (normalized === "canceled" || normalized === "cancelled")
    return {
      label: "Cancelled",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
    };

  return {
    label: "Refunded",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  };
}

/* =========================
HELPERS
========================= */

function formatAmount(amount: number | null, currency: string | null) {
  const code = (currency || "IDR").toUpperCase();
  const value = Number(amount ?? 0);

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

function visiblePageNumbers(current: number, total: number) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return pages;
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

function humanizeMethod() {
  return "Debit / Credit Card";
}

/* =========================
PAGE
========================= */

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      setLoading(true);
      setError("");

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payment_transactions")
        .select(
          `
            id,
            user_id,
            customer_name,
            customer_email,
            property_code_snapshot,
            product_name_snapshot,
            description,
            payment_type,
            amount_total,
            currency,
            created_at,
            status
          `
        )
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (paymentsError) {
        console.error("Failed to load payments:", paymentsError);
        setError("Gagal memuat payments.");
        setPayments([]);
        setLoading(false);
        return;
      }

      const rows = (paymentsData || []) as PaymentRow[];

      const userIds = Array.from(
        new Set(
          rows
            .map((row) => row.user_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      let profileMap = new Map<string, ProfileRow>();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (!isMounted) return;

        if (profilesError) {
          console.error("Failed to load payment owners:", profilesError);
        } else {
          profileMap = new Map(
            ((profilesData || []) as ProfileRow[]).map((row) => [row.id, row])
          );
        }
      }

      const mapped: Payment[] = rows.map((row) => ({
        id: row.id,
        owner:
          row.customer_name?.trim() ||
          row.customer_email?.trim() ||
          (row.user_id ? profileMap.get(row.user_id)?.full_name : null)?.trim() ||
          "Unknown",
        listingKode: row.property_code_snapshot?.trim() || "-",
        package:
          row.product_name_snapshot?.trim() ||
          row.description?.trim() ||
          humanizePaymentType(row.payment_type),
        amount: formatAmount(row.amount_total, row.currency),
        method: humanizeMethod(),
        date: formatDate(row.created_at),
        status: normalizeStatus(row.status),
      }));

      setPayments(mapped);
      setLoading(false);
    }

    loadPayments();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return payments;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return payments.filter((p) => {
      const searchable = `
        ${p.owner}
        ${p.listingKode}
        ${p.package}
        ${p.method}
        ${p.status}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, payments]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, payments.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);

  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const startItem =
    filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(safePage * ITEMS_PER_PAGE, filtered.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(safePage, totalPages),
    [safePage, totalPages]
  );

  async function updateStatus(id: string, status: PaymentStatus) {
    setSavingId(id);
    setError("");

    const { error } = await supabase
      .from("payment_transactions")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Failed to update payment status:", error);
      setError("Gagal mengubah status payment.");
      setSavingId(null);
      return;
    }

    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );

    setSavingId(null);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Payments
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Monitor dan kelola transaksi pembayaran.
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Cari owner, listing, metode pembayaran..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="h-10 w-full rounded-2xl border border-gray-300 py-3 pl-10 pr-4 text-[13px] outline-none placeholder-gray-400 focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading payments...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : paginated.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">Belum ada payment.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginated.map((payment) => {
              const ui = statusUI(payment.status);
              const isSaving = savingId === payment.id;

              return (
                <div key={payment.id} className="px-3.5 py-4 sm:px-5">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badge}`}
                          >
                            {ui.label}
                          </span>
                        </div>

                        <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                          {payment.owner}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Listing
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {payment.listingKode}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Package
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {payment.package}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Method
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {payment.method}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Date
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {payment.date}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 xl:w-[220px] xl:shrink-0">
                        <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3 text-center xl:text-right">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                            Amount
                          </p>
                          <p className="mt-1 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm">
                            {payment.amount}
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => updateStatus(payment.id, "paid")}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-green-200 bg-green-50 text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Mark as paid"
                        >
                          <CheckCircle size={15} />
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => updateStatus(payment.id, "failed")}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Mark as failed"
                        >
                          <XCircle size={15} />
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => updateStatus(payment.id, "refunded")}
                          className="col-span-2 inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Mark as refunded"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
          Menampilkan {startItem}–{endItem} dari {filtered.length} transaksi
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1 || filtered.length === 0}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-4 sm:text-sm"
          >
            Sebelumnya
          </button>

          {filtered.length > 0 &&
            visiblePages.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPage(p)}
                className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                  safePage === p
                    ? "border-black bg-black text-white"
                    : "border-gray-300 bg-white text-gray-700"
                }`}
              >
                {p}
              </button>
            ))}

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages || filtered.length === 0}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:px-4 sm:text-sm"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}