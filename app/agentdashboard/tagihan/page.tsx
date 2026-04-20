"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  PackageCheck,
  Receipt,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type MembershipStatus = "active" | "expired" | "cancelled" | "pending" | null;

type PaymentStatus =
  | "initiated"
  | "pending"
  | "checkout_created"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "completed"
  | "succeeded"
  | "settled"
  | null;

type AgentMembershipRow = {
  id: string;
  user_id: string | null;
  payment_id: string | null;
  package_id: string | null;
  package_name: string | null;
  billing_cycle: string | null;
  listing_limit: number | null;
  status: MembershipStatus;
  auto_renew: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

type PaymentTransactionRow = {
  id: string;
  user_id: string | null;
  property_id: string | null;
  source_role: string | null;
  payment_type: string | null;
  product_id: string | null;
  product_name_snapshot: string | null;
  product_type: string | null;
  status: PaymentStatus;
  currency: string | null;
  amount_subtotal: number | null;
  amount_total: number | null;
  description: string | null;
  plan_name: string | null;
  duration_days: number | null;
  property_title_snapshot: string | null;
  property_code_snapshot: string | null;
  customer_name: string | null;
  customer_email: string | null;
  checkout_url: string | null;
  checkout_expires_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  receipt_url: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  paid_at: string | null;
  expired_at: string | null;
  failed_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

type HistoryDisplayStatus =
  | "checkout_created"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "refunded"
  | "unpaid";

type HistoryCategory = "membership" | "addon" | "education" | "other";

type HistoryItem = {
  id: string;
  paymentId: string;
  sortDate: string;

  title: string;
  packageName: string;
  paymentType: string;
  category: HistoryCategory;
  productId: string;
  planCode: string;
  billingType: string;
  listingCode: string;

  amount: string;
  method: string;
  status: HistoryDisplayStatus;

  createdDate: string;
  createdDateTime: string;
  paidDate: string;
  paidDateTime: string;
  expiryDate: string;

  checkoutUrl: string;
  receiptUrl: string;
  hostedInvoiceUrl: string;
  invoicePdfUrl: string;

  canRetry: boolean;
  canRenew: boolean;
  renewHref: string;
};

function cleanText(value: unknown) {
  const v = String(value || "").trim();
  return v || "-";
}

function emptyToBlank(value: unknown) {
  const v = String(value || "").trim();
  return v === "-" ? "" : v;
}

function sanitizePublicPaymentText(value: unknown) {
  return String(value || "")
    .replace(/stripe/gi, "secure payment")
    .replace(/xendit/gi, "payment provider")
    .trim();
}

function getMetaString(
  metadata: Record<string, any> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function getNestedMetaString(
  metadata: Record<string, any> | null | undefined,
  objectKey: string,
  key: string
) {
  const obj = metadata?.[objectKey];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "";
  const value = (obj as Record<string, any>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatAmount(amount: number | null, currency: string | null) {
  const code = String(currency || "idr").toUpperCase();
  const value = Number(amount || 0);

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

function formatDate(value: string | null, lang: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatDateTime(value: string | null, lang: string) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function normalizeStatus(status: PaymentStatus): HistoryDisplayStatus {
  const s = String(status || "").toLowerCase();

  if (
    s === "paid" ||
    s === "completed" ||
    s === "succeeded" ||
    s === "settled"
  ) {
    return "paid";
  }

  if (s === "checkout_created") return "checkout_created";
  if (s === "pending" || s === "initiated") return "pending";
  if (s === "failed") return "failed";
  if (s === "expired") return "expired";
  if (s === "refunded") return "refunded";

  return "unpaid";
}

function statusUI(status: HistoryDisplayStatus, lang: string) {
  const isID = lang === "id";

  switch (status) {
    case "paid":
      return {
        label: isID ? "Lunas" : "Paid",
        badge: "bg-green-50 text-green-700 border-green-200",
      };
    case "checkout_created":
      return {
        label: isID ? "Checkout Dibuat" : "Checkout Created",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "pending":
      return {
        label: "Pending",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    case "failed":
      return {
        label: isID ? "Gagal" : "Failed",
        badge: "bg-red-50 text-red-700 border-red-200",
      };
    case "expired":
      return {
        label: isID ? "Kedaluwarsa" : "Expired",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
      };
    case "refunded":
      return {
        label: isID ? "Refund" : "Refunded",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "unpaid":
    default:
      return {
        label: isID ? "Belum Dibayar" : "Unpaid",
        badge: "bg-gray-100 text-gray-700 border-gray-200",
      };
  }
}

function membershipStatusUI(
  status: MembershipStatus,
  expiresAt: string | null,
  lang: string
) {
  const isID = lang === "id";
  const now = new Date();
  const expiry = expiresAt ? new Date(expiresAt) : null;
  const expiredByDate =
    expiry && !Number.isNaN(expiry.getTime()) && expiry < now;

  if (status === "active" && !expiredByDate) {
    return {
      label: isID ? "Aktif" : "Active",
      badge: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "cancelled") {
    return {
      label: isID ? "Dibatalkan" : "Cancelled",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  if (status === "pending") {
    return {
      label: "Pending",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  return {
    label: isID ? "Kedaluwarsa" : "Expired",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  };
}

function inferCategory(row: PaymentTransactionRow): HistoryCategory {
  const paymentType = String(row.payment_type || "").toLowerCase();
  const productType = String(row.product_type || "").toLowerCase();

  if (paymentType === "package" || productType === "membership") {
    return "membership";
  }

  if (
    paymentType === "boost" ||
    paymentType === "spotlight" ||
    productType === "addon"
  ) {
    return "addon";
  }

  if (paymentType === "education" || productType === "education") {
    return "education";
  }

  return "other";
}

function inferBillingType(
  row: PaymentTransactionRow,
  matchedMembership: AgentMembershipRow | null,
  lang: string
) {
  const isID = lang === "id";

  const direct =
    getMetaString(row.metadata, "selectedBillingCycle") ||
    getMetaString(row.metadata, "selected_billing_cycle") ||
    getMetaString(row.metadata, "billingCycle") ||
    getMetaString(row.metadata, "billing_cycle") ||
    matchedMembership?.billing_cycle ||
    "";

  const normalized = String(direct || "").toLowerCase();

  if (normalized === "monthly") return isID ? "Bulanan" : "Monthly";
  if (normalized === "yearly") return isID ? "Tahunan" : "Yearly";

  const category = inferCategory(row);
  if (category === "addon") return "Add-On";
  if (category === "education") return "Education";

  return "-";
}

function inferPackageName(
  row: PaymentTransactionRow,
  matchedMembership: AgentMembershipRow | null
) {
  return cleanText(
    matchedMembership?.package_name ||
      getMetaString(row.metadata, "packageName") ||
      getMetaString(row.metadata, "package_name") ||
      row.product_name_snapshot ||
      row.plan_name ||
      row.product_id ||
      row.description
  );
}

function inferExpiryDate(
  row: PaymentTransactionRow,
  matchedMembership: AgentMembershipRow | null
) {
  return (
    matchedMembership?.expires_at ||
    getNestedMetaString(row.metadata, "activation", "expiresAt") ||
    getNestedMetaString(row.metadata, "activation", "endsAt") ||
    getMetaString(row.metadata, "expires_at") ||
    row.checkout_expires_at ||
    null
  );
}

function getPaymentTypeLabel(row: PaymentTransactionRow, lang: string) {
  const isID = lang === "id";
  const paymentType = String(row.payment_type || "").toLowerCase();

  if (paymentType === "package") {
    return isID ? "Membership Agen" : "Agent Membership";
  }

  if (paymentType === "boost") return "Boost Listing";
  if (paymentType === "spotlight") return "Homepage Spotlight";
  if (paymentType === "education") return "Education";
  if (paymentType === "listing_fee") {
    return isID ? "Biaya Listing" : "Listing Fee";
  }

  if (paymentType === "featured") return "Featured Listing";

  return cleanText(row.payment_type || row.product_type || "Payment");
}

function buildRenewHref(item: {
  category: HistoryCategory;
  productId: string;
  listingCode: string;
}) {
  if (item.category === "membership" && item.productId && item.productId !== "-") {
    return `/agentdashboard/paket?renew=1&package=${encodeURIComponent(
      item.productId
    )}`;
  }

  if (
    item.category === "addon" &&
    item.productId &&
    item.productId !== "-" &&
    item.listingCode &&
    item.listingCode !== "-"
  ) {
    return `/agentdashboard/pembayaran?flow=addon&product=${encodeURIComponent(
      item.productId
    )}&kode=${encodeURIComponent(item.listingCode)}`;
  }

  return "";
}

function getPublicPaymentMethod() {
  return "Debit / Credit Card";
}

function mapTransactionToHistoryItem(
  row: PaymentTransactionRow,
  memberships: AgentMembershipRow[],
  lang: string
): HistoryItem {
  const matchedMembership =
    memberships.find((m) => m.payment_id === row.id) || null;

  const category = inferCategory(row);
  const productId = cleanText(row.product_id);
  const packageName = inferPackageName(row, matchedMembership);
  const billingType = inferBillingType(row, matchedMembership, lang);
  const status = normalizeStatus(row.status);
  const listingCode = cleanText(
    row.property_code_snapshot ||
      getMetaString(row.metadata, "existingPropertyCode") ||
      getMetaString(row.metadata, "listing_code")
  );

  const expiryRaw = inferExpiryDate(row, matchedMembership);

  const baseForRenew = {
    category,
    productId,
    listingCode,
  };

  const renewHref = buildRenewHref(baseForRenew);

  const title =
    row.description ||
    getMetaString(row.metadata, "paymentTitle") ||
    getMetaString(row.metadata, "payment_title") ||
    packageName;

  return {
    id: row.id,
    paymentId: row.id,
    sortDate: row.created_at || row.updated_at || new Date().toISOString(),

    title: cleanText(sanitizePublicPaymentText(title)),
    packageName: cleanText(sanitizePublicPaymentText(packageName)),
    paymentType: getPaymentTypeLabel(row, lang),
    category,
    productId,
    planCode: productId,
    billingType,
    listingCode,

    amount: formatAmount(row.amount_total ?? row.amount_subtotal ?? 0, row.currency),
    method: getPublicPaymentMethod(),
    status,

    createdDate: formatDate(row.created_at, lang),
    createdDateTime: formatDateTime(row.created_at, lang),
    paidDate: formatDate(row.paid_at, lang),
    paidDateTime: formatDateTime(row.paid_at, lang),
    expiryDate: formatDate(expiryRaw, lang),

    checkoutUrl: emptyToBlank(row.checkout_url),
    receiptUrl: emptyToBlank(row.receipt_url),
    hostedInvoiceUrl: emptyToBlank(row.hosted_invoice_url),
    invoicePdfUrl: emptyToBlank(row.invoice_pdf_url),

    canRetry:
      Boolean(row.checkout_url) &&
      ["checkout_created", "pending", "failed", "expired", "unpaid"].includes(
        status
      ),
    canRenew: Boolean(renewHref),
    renewHref,
  };
}

export default function AgentTagihanPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  const [searchQuery, setSearchQuery] = useState("");
  const [memberships, setMemberships] = useState<AgentMembershipRow[]>([]);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentResult, setPaymentResult] = useState<
    "success" | "cancelled" | null
  >(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");

    if (payment === "success") {
      setPaymentResult("success");
    } else if (payment === "cancelled") {
      setPaymentResult("cancelled");
    }
  }, []);

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
        setError(isID ? "Silakan login ulang." : "Please log in again.");
        setItems([]);
        setMemberships([]);
        setLoading(false);
        return;
      }

      const [membershipsRes, transactionsRes] = await Promise.all([
        supabase
          .from("agent_memberships")
          .select(
            `
              id,
              user_id,
              payment_id,
              package_id,
              package_name,
              billing_cycle,
              listing_limit,
              status,
              auto_renew,
              starts_at,
              expires_at,
              metadata,
              created_at,
              updated_at
            `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("payment_transactions")
          .select(
            `
              id,
              user_id,
              property_id,
              source_role,
              payment_type,
              product_id,
              product_name_snapshot,
              product_type,
              status,
              currency,
              amount_subtotal,
              amount_total,
              description,
              plan_name,
              duration_days,
              property_title_snapshot,
              property_code_snapshot,
              customer_name,
              customer_email,
              checkout_url,
              checkout_expires_at,
              stripe_checkout_session_id,
              stripe_payment_intent_id,
              stripe_charge_id,
              stripe_invoice_id,
              receipt_url,
              hosted_invoice_url,
              invoice_pdf_url,
              paid_at,
              expired_at,
              failed_at,
              metadata,
              created_at,
              updated_at
            `
          )
          .eq("user_id", user.id)
          .eq("source_role", "agent")
          .order("created_at", { ascending: false }),
      ]);

      if (ignore) return;

      if (membershipsRes.error) {
        console.error("Failed to load agent memberships:", membershipsRes.error);
      }

      if (transactionsRes.error) {
        console.error("Failed to load payment transactions:", transactionsRes.error);
      }

      if (membershipsRes.error && transactionsRes.error) {
        setError(
          isID ? "Gagal memuat tagihan agen." : "Failed to load agent billing."
        );
        setItems([]);
        setMemberships([]);
        setLoading(false);
        return;
      }

      const membershipRows = (membershipsRes.data || []) as AgentMembershipRow[];
      const transactionRows = (transactionsRes.data || []) as PaymentTransactionRow[];

      const historyItems = transactionRows
        .map((row) => mapTransactionToHistoryItem(row, membershipRows, lang))
        .sort(
          (a, b) =>
            new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
        );

      setMemberships(membershipRows);
      setItems(historyItems);
      setLoading(false);
    }

    loadBillingHistory();

    return () => {
      ignore = true;
    };
  }, [lang, isID]);

  const activeMembership = useMemo(() => {
    const now = new Date();

    const active = memberships.find((membership) => {
      const expiresAt = membership.expires_at
        ? new Date(membership.expires_at)
        : null;

      return (
        membership.status === "active" &&
        (!expiresAt ||
          Number.isNaN(expiresAt.getTime()) ||
          expiresAt.getTime() >= now.getTime())
      );
    });

    return active || memberships[0] || null;
  }, [memberships]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return items.filter((item) => {
      const searchable = `
        ${item.title}
        ${item.packageName}
        ${item.paymentType}
        ${item.billingType}
        ${item.planCode}
        ${item.listingCode}
        ${item.method}
        ${item.status}
        ${item.productId}
        ${item.amount}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [searchQuery, items]);

  const activeMembershipUI = activeMembership
    ? membershipStatusUI(activeMembership.status, activeMembership.expires_at, lang)
    : null;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8 lg:px-6 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-bold tracking-tight text-[#1C1C1E] sm:text-2xl">
            {isID ? "Tagihan Agen" : "Agent Billing"}
          </h1>

          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            {isID
              ? "Lihat status membership, pembayaran, invoice, receipt, dan riwayat tagihan Anda di sini."
              : "View your membership status, payments, invoices, receipts, and billing history here."}
          </p>
        </div>

        {paymentResult === "success" ? (
          <div className="mb-5 rounded-3xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {isID ? "Pembayaran berhasil." : "Payment successful."}
                </p>
                <p className="mt-1 leading-6">
                  {isID
                    ? "Pembayaran Anda telah diterima. Membership akan tampil aktif setelah sistem selesai memproses pembayaran."
                    : "Your payment has been received. Your membership will appear active once the system finishes processing the payment."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {paymentResult === "cancelled" ? (
          <div className="mb-5 rounded-3xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 shadow-sm">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {isID ? "Pembayaran dibatalkan." : "Payment cancelled."}
                </p>
                <p className="mt-1 leading-6">
                  {isID
                    ? "Anda dapat melanjutkan pembayaran dari riwayat tagihan jika checkout masih tersedia."
                    : "You can continue payment from the billing history if checkout is still available."}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 sm:text-xs">
              <PackageCheck className="h-4 w-4" />
              {isID ? "Paket Aktif" : "Active Package"}
            </div>
            <div className="mt-2 text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {sanitizePublicPaymentText(activeMembership?.package_name || "-")}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 sm:text-xs">
              <ShieldCheck className="h-4 w-4" />
              {isID ? "Limit Listing" : "Listing Limit"}
            </div>
            <div className="mt-2 text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {activeMembership?.listing_limit
                ? isID
                  ? `${activeMembership.listing_limit} listing aktif`
                  : `${activeMembership.listing_limit} active listings`
                : "-"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 sm:text-xs">
              <CreditCard className="h-4 w-4" />
              {isID ? "Tipe Tagihan" : "Billing Type"}
            </div>
            <div className="mt-2 text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {activeMembership?.billing_cycle
                ? activeMembership.billing_cycle === "monthly"
                  ? isID
                    ? "Bulanan"
                    : "Monthly"
                  : isID
                  ? "Tahunan"
                  : "Yearly"
                : "-"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] text-gray-500 sm:text-xs">
              <CalendarDays className="h-4 w-4" />
              {isID ? "Status / Expired" : "Status / Expiry"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {activeMembershipUI ? (
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium sm:text-xs ${activeMembershipUI.badge}`}
                >
                  {activeMembershipUI.label}
                </span>
              ) : null}

              <span className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                {formatDate(activeMembership?.expires_at || null, lang)}
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-5 sm:mt-6">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            size={16}
          />

          <input
            type="text"
            placeholder={
              isID
                ? "Cari paket, billing type, plan code, status, atau metode..."
                : "Search package, billing type, plan code, status, or method..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#1C1C1E] sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-8">
          {loading ? (
            <div className="p-4 text-xs text-gray-500 sm:p-6 sm:text-sm">
              {isID ? "Memuat riwayat tagihan..." : "Loading billing history..."}
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-red-600 sm:p-6 sm:text-sm">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 sm:p-6 sm:text-sm">
              {isID ? "Belum ada riwayat tagihan." : "No billing history yet."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const ui = statusUI(item.status, lang);

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:flex-row lg:items-start lg:justify-between lg:p-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:text-xs ${ui.badge}`}
                        >
                          {ui.label}
                        </span>

                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 sm:px-3 sm:text-xs">
                          {item.billingType === "-" ? item.paymentType : item.billingType}
                        </span>

                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-700 sm:px-3 sm:text-xs">
                          {item.paymentType}
                        </span>
                      </div>

                      <p className="mt-3 text-sm font-semibold leading-snug text-[#1C1C1E] sm:text-base">
                        {item.packageName}
                      </p>

                      <p className="mt-1 text-xs leading-6 text-gray-500 sm:text-sm">
                        {item.title}
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-1.5 text-[11px] leading-relaxed text-gray-500 sm:grid-cols-2 sm:text-sm">
                        <p>
                          Package:{" "}
                          <span className="font-medium text-gray-700">
                            {item.packageName}
                          </span>
                        </p>

                        <p>
                          {isID ? "Tipe Tagihan:" : "Billing Type:"}{" "}
                          <span className="font-medium text-gray-700">
                            {item.billingType}
                          </span>
                        </p>

                        <p>
                          Plan Code:{" "}
                          <span className="font-medium text-gray-700">
                            {item.planCode}
                          </span>
                        </p>

                        <p>
                          Listing Code:{" "}
                          <span className="font-medium text-gray-700">
                            {item.listingCode}
                          </span>
                        </p>

                        <p>
                          {isID ? "Metode:" : "Method:"}{" "}
                          <span className="font-medium text-gray-700">
                            {item.method}
                          </span>
                        </p>

                        <p>
                          Payment ID:{" "}
                          <span className="break-all font-medium text-gray-700">
                            {item.paymentId}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-1.5 text-[11px] leading-relaxed text-gray-500 sm:gap-2 sm:text-sm lg:min-w-[240px] lg:text-right">
                      <p className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                        {item.amount}
                      </p>

                      <p>
                        {isID ? "Dibuat:" : "Created:"} {item.createdDateTime}
                      </p>

                      <p>
                        {isID ? "Dibayar:" : "Paid:"} {item.paidDateTime}
                      </p>

                      <p>
                        {isID ? "Expired:" : "Expiry:"} {item.expiryDate}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-start gap-2 lg:min-w-[230px] lg:flex-col lg:items-end">
                      {item.status === "paid" ? (
                        <Link
                          href={`/agentdashboard/tagihan/receipt/${item.paymentId}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100 sm:px-4 sm:text-sm"
                        >
                          <Receipt className="h-4 w-4" />
                          {isID ? "Lihat Receipt" : "View Receipt"}
                        </Link>
                      ) : null}

                      {item.receiptUrl ? (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Payment Receipt
                        </a>
                      ) : null}

                      {item.hostedInvoiceUrl ? (
                        <a
                          href={item.hostedInvoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          Payment Invoice
                        </a>
                      ) : null}

                      {item.invoicePdfUrl ? (
                        <a
                          href={item.invoicePdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50 sm:px-4 sm:text-sm"
                        >
                          <FileText className="h-4 w-4" />
                          Invoice PDF
                        </a>
                      ) : null}

                      {item.canRenew ? (
                        <Link
                          href={item.renewHref}
                          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 sm:px-4 sm:text-sm"
                        >
                          <RefreshCw className="h-4 w-4" />
                          {item.category === "membership"
                            ? isID
                              ? "Perpanjang Membership"
                              : "Renew Membership"
                            : isID
                            ? "Perpanjang Add-On"
                            : "Renew Add-On"}
                        </Link>
                      ) : null}

                      {item.canRetry ? (
                        <a
                          href={item.checkoutUrl}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90 sm:px-4 sm:text-sm"
                        >
                          <CreditCard className="h-4 w-4" />
                          {item.status === "failed" || item.status === "expired"
                            ? isID
                              ? "Coba Lagi"
                              : "Try Again"
                            : isID
                            ? "Lanjutkan Bayar"
                            : "Continue Payment"}
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