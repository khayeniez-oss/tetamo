"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PaymentStatus =
  | "initiated"
  | "pending"
  | "succeeded"
  | "failed"
  | "expired"
  | "refunded"
  | null;

type BillingStatus =
  | "pending"
  | "paid"
  | "failed"
  | "overdue"
  | "cancelled"
  | "refunded"
  | null;

type PaymentRow = {
  id: string;
  user_id: string | null;
  billing_record_id: string | null;
  listing_code: string | null;
  product_name: string | null;
  payment_title: string | null;
  payment_description: string | null;
  billing_note: string | null;
  payment_method: string | null;
  method: string | null;
  gateway: string | null;
  provider: string | null;
  amount: number | null;
  amount_idr: number | null;
  currency: string | null;
  status: PaymentStatus;
  receipt_number: string | null;
  checkout_url: string | null;
  created_at: string | null;
  paid_at: string | null;
  expires_at: string | null;
};

type BillingRow = {
  id: string;
  user_id: string | null;
  invoice_number: string | null;
  listing_code: string | null;
  property_title: string | null;
  description: string | null;
  plan_code: string | null;
  bill_type: string | null;
  total: number | null;
  amount: number | null;
  currency: string | null;
  created_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  status: BillingStatus;
};

type HistoryDisplayStatus =
  | "initiated"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "unpaid"
  | "overdue"
  | "cancelled";

type HistoryItem = {
  id: string;
  billingId: string;
  paymentId: string;
  sortDate: string;
  title: string;
  listingCode: string;
  invoiceNumber: string;
  receiptNumber: string;
  amount: string;
  method: string;
  createdDate: string;
  dueDate: string;
  paidDate: string;
  expiryDate: string;
  status: HistoryDisplayStatus;
  checkoutUrl: string;
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

function normalizeHistoryStatus(
  paymentStatus: PaymentStatus | undefined,
  billingStatus: BillingStatus | undefined
): HistoryDisplayStatus {
  const p = String(paymentStatus || "").toLowerCase();
  const b = String(billingStatus || "").toLowerCase();

  if (p === "succeeded") return "paid";
  if (p === "initiated") return "initiated";
  if (p === "pending") return "pending";
  if (p === "failed") return "failed";
  if (p === "expired") return "expired";
  if (p === "refunded") return "refunded";

  if (b === "paid") return "paid";
  if (b === "failed") return "failed";
  if (b === "overdue") return "overdue";
  if (b === "cancelled") return "cancelled";
  if (b === "refunded") return "refunded";

  return "unpaid";
}

function statusUI(status: HistoryDisplayStatus) {
  switch (status) {
    case "paid":
      return {
        label: "Paid",
        badge: "bg-green-50 text-green-700 border-green-200",
      };
    case "initiated":
      return {
        label: "Initiated",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    case "pending":
      return {
        label: "Pending",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    case "failed":
      return {
        label: "Failed",
        badge: "bg-red-50 text-red-700 border-red-200",
      };
    case "expired":
      return {
        label: "Expired",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
      };
    case "refunded":
      return {
        label: "Refunded",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "overdue":
      return {
        label: "Overdue",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        badge: "bg-gray-100 text-gray-700 border-gray-200",
      };
    case "unpaid":
    default:
      return {
        label: "Unpaid",
        badge: "bg-gray-100 text-gray-700 border-gray-200",
      };
  }
}

function buildTitleFromBilling(row: BillingRow) {
  if (row.description?.trim()) return row.description.trim();
  if (row.property_title?.trim()) return row.property_title.trim();
  if (row.plan_code?.trim()) return row.plan_code.trim();
  if (row.bill_type?.trim()) return row.bill_type.trim();
  return "Tetamo Billing";
}

function buildTitleFromPayment(row: PaymentRow) {
  if (row.product_name?.trim()) return row.product_name.trim();
  if (row.payment_title?.trim()) return row.payment_title.trim();
  if (row.payment_description?.trim()) return row.payment_description.trim();
  if (row.billing_note?.trim()) return row.billing_note.trim();
  return "Tetamo Payment";
}

export default function AgentPembayaranPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadBillingHistory() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (authError || !user) {
        setError("Silakan login ulang.");
        setItems([]);
        setLoading(false);
        return;
      }

      const [paymentsRes, billingsRes] = await Promise.all([
        supabase
          .from("payments")
          .select(
            `
              id,
              user_id,
              billing_record_id,
              listing_code,
              product_name,
              payment_title,
              payment_description,
              billing_note,
              payment_method,
              method,
              gateway,
              provider,
              amount,
              amount_idr,
              currency,
              status,
              receipt_number,
              checkout_url,
              created_at,
              paid_at,
              expires_at
            `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("billing_records")
          .select(
            `
              id,
              user_id,
              invoice_number,
              listing_code,
              property_title,
              description,
              plan_code,
              bill_type,
              total,
              amount,
              currency,
              created_at,
              due_at,
              paid_at,
              status
            `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (ignore) return;

      if (paymentsRes.error) {
        console.error("Failed to load agent payments:", paymentsRes.error);
      }

      if (billingsRes.error) {
        console.error("Failed to load agent billing records:", billingsRes.error);
      }

      if (paymentsRes.error && billingsRes.error) {
        setError("Gagal memuat riwayat pembayaran.");
        setItems([]);
        setLoading(false);
        return;
      }

      const payments = (paymentsRes.data || []) as PaymentRow[];
      const billings = (billingsRes.data || []) as BillingRow[];

      const billingMap = new Map<string, BillingRow>();
      billings.forEach((billing) => {
        billingMap.set(billing.id, billing);
      });

      const latestPaymentByBillingId = new Map<string, PaymentRow>();
      payments.forEach((payment) => {
        if (
          payment.billing_record_id &&
          !latestPaymentByBillingId.has(payment.billing_record_id)
        ) {
          latestPaymentByBillingId.set(payment.billing_record_id, payment);
        }
      });

      const billingItems: HistoryItem[] = billings.map((billing) => {
        const latestPayment = latestPaymentByBillingId.get(billing.id);
        const status = normalizeHistoryStatus(
          latestPayment?.status,
          billing.status
        );

        return {
          id: billing.id,
          billingId: billing.id,
          paymentId: latestPayment?.id || "",
          sortDate:
            latestPayment?.created_at ||
            billing.created_at ||
            new Date().toISOString(),
          title: latestPayment
            ? buildTitleFromPayment(latestPayment)
            : buildTitleFromBilling(billing),
          listingCode: billing.listing_code?.trim() || "-",
          invoiceNumber: billing.invoice_number?.trim() || "-",
          receiptNumber: latestPayment?.receipt_number?.trim() || "-",
          amount: formatAmount(
            latestPayment?.amount ?? billing.total ?? billing.amount ?? 0,
            latestPayment?.amount_idr ?? null,
            latestPayment?.currency ?? billing.currency ?? "IDR"
          ),
          method:
            latestPayment?.payment_method?.trim() ||
            latestPayment?.method?.trim() ||
            latestPayment?.gateway?.trim() ||
            latestPayment?.provider?.trim() ||
            "-",
          createdDate: formatDate(billing.created_at),
          dueDate: formatDate(billing.due_at),
          paidDate: formatDate(latestPayment?.paid_at || billing.paid_at),
          expiryDate: formatDate(latestPayment?.expires_at || null),
          status,
          checkoutUrl: latestPayment?.checkout_url?.trim() || "",
        };
      });

      const orphanPayments: HistoryItem[] = payments
        .filter(
          (payment) =>
            !payment.billing_record_id || !billingMap.has(payment.billing_record_id)
        )
        .map((payment) => ({
          id: payment.id,
          billingId: "",
          paymentId: payment.id,
          sortDate: payment.created_at || new Date().toISOString(),
          title: buildTitleFromPayment(payment),
          listingCode: payment.listing_code?.trim() || "-",
          invoiceNumber: "-",
          receiptNumber: payment.receipt_number?.trim() || "-",
          amount: formatAmount(
            payment.amount ?? 0,
            payment.amount_idr ?? null,
            payment.currency
          ),
          method:
            payment.payment_method?.trim() ||
            payment.method?.trim() ||
            payment.gateway?.trim() ||
            payment.provider?.trim() ||
            "-",
          createdDate: formatDate(payment.created_at),
          dueDate: "-",
          paidDate: formatDate(payment.paid_at),
          expiryDate: formatDate(payment.expires_at),
          status: normalizeHistoryStatus(payment.status, null),
          checkoutUrl: payment.checkout_url?.trim() || "",
        }));

      const merged = [...billingItems, ...orphanPayments].sort((a, b) => {
        return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
      });

      setItems(merged);
      setLoading(false);
    }

    loadBillingHistory();

    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return items.filter((item) => {
      const searchable = `
        ${item.title}
        ${item.listingCode}
        ${item.invoiceNumber}
        ${item.receiptNumber}
        ${item.method}
        ${item.status}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [searchQuery, items]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8 lg:px-6 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-bold tracking-tight text-[#1C1C1E] sm:text-2xl">
            Pembayaran Agent
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            Lihat status pembayaran, invoice, dan receipt Anda di sini.
          </p>
        </div>

        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={16}
          />

          <input
            type="text"
            placeholder="Cari invoice, receipt, listing, atau status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#1C1C1E] sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-8">
          {loading ? (
            <div className="p-4 text-xs text-gray-500 sm:p-6 sm:text-sm">
              Memuat riwayat pembayaran...
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-red-600 sm:p-6 sm:text-sm">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 sm:p-6 sm:text-sm">
              Belum ada riwayat pembayaran.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const ui = statusUI(item.status);
                const canRetry =
                  Boolean(item.checkoutUrl) &&
                  ["initiated", "pending", "failed", "expired", "unpaid"].includes(
                    item.status
                  );

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6"
                  >
                    <div className="min-w-0 flex-1">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${ui.badge}`}
                      >
                        {ui.label}
                      </span>

                      <p className="mt-3 text-sm font-semibold leading-snug text-[#1C1C1E] sm:text-base">
                        {item.title}
                      </p>

                      <div className="mt-2 space-y-1 text-xs leading-relaxed text-gray-500 sm:text-sm">
                        <p>Listing: {item.listingCode}</p>
                        <p>Invoice: {item.invoiceNumber}</p>
                        <p>
                          Receipt:{" "}
                          {item.receiptNumber === "-"
                            ? "Belum tersedia"
                            : item.receiptNumber}
                        </p>
                        <p>Method: {item.method}</p>
                      </div>
                    </div>

                    <div className="grid gap-1.5 text-xs leading-relaxed text-gray-500 sm:gap-2 sm:text-sm lg:min-w-[250px] lg:text-right">
                      <p className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                        {item.amount}
                      </p>
                      <p>Created: {item.createdDate}</p>
                      <p>Due: {item.dueDate}</p>
                      <p>Paid: {item.paidDate}</p>
                      <p>Expired: {item.expiryDate}</p>
                    </div>

                    <div className="flex flex-wrap items-start gap-2 lg:min-w-[190px] lg:flex-col lg:items-end">
                      {item.invoiceNumber !== "-" ? (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-700 sm:text-xs">
                          Invoice Ready
                        </span>
                      ) : null}

                      {item.receiptNumber !== "-" ? (
                        <Link
                          href={`/agentdashboard/pembayaran/receipt/${item.paymentId}`}
                          className="inline-flex rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100 sm:px-4 sm:text-sm"
                        >
                          Lihat Receipt
                        </Link>
                      ) : null}

                      {canRetry ? (
                        <a
                          href={item.checkoutUrl}
                          className="inline-flex rounded-xl bg-[#1C1C1E] px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90 sm:px-4 sm:text-sm"
                        >
                          {item.status === "failed" || item.status === "expired"
                            ? "Coba Lagi"
                            : "Lanjutkan Bayar"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}