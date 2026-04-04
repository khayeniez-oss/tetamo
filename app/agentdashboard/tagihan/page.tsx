"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";

type PaymentStatus =
  | "initiated"
  | "pending"
  | "succeeded"
  | "failed"
  | "expired"
  | "refunded"
  | "paid"
  | "completed"
  | "settled"
  | "active"
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

  product_id?: string | null;
  product_type?: string | null;
  flow?: string | null;
  metadata?: Record<string, unknown> | null;

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

type HistoryCategory = "membership" | "addon" | "other";

type RenewTarget = {
  kind: "membership" | "addon" | "none";
  href: string;
};

type HistoryItem = {
  id: string;
  billingId: string;
  paymentId: string;
  sortDate: string;

  title: string;
  packageName: string;
  billingType: string;
  category: HistoryCategory;
  productId: string;

  listingCode: string;
  invoiceNumber: string;
  receiptNumber: string;
  planCode: string;
  billType: string;

  amount: string;
  method: string;

  createdDate: string;
  dueDate: string;
  paidDate: string;
  expiryDate: string;

  status: HistoryDisplayStatus;
  checkoutUrl: string;
};

function cleanText(value: string | null | undefined) {
  const v = String(value || "").trim();
  return v || "-";
}

function getMetaString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value.trim() : "";
}

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

  if (
    p === "succeeded" ||
    p === "paid" ||
    p === "completed" ||
    p === "settled" ||
    p === "active"
  ) {
    return "paid";
  }

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

function statusUI(status: HistoryDisplayStatus, lang: string) {
  const currentLang = lang === "id" ? "id" : "en";

  switch (status) {
    case "paid":
      return {
        label: currentLang === "id" ? "Lunas" : "Paid",
        badge: "bg-green-50 text-green-700 border-green-200",
      };
    case "initiated":
      return {
        label: currentLang === "id" ? "Dimulai" : "Initiated",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    case "pending":
      return {
        label: "Pending",
        badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    case "failed":
      return {
        label: currentLang === "id" ? "Gagal" : "Failed",
        badge: "bg-red-50 text-red-700 border-red-200",
      };
    case "expired":
      return {
        label: currentLang === "id" ? "Kedaluwarsa" : "Expired",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
      };
    case "refunded":
      return {
        label: currentLang === "id" ? "Refund" : "Refunded",
        badge: "bg-blue-50 text-blue-700 border-blue-200",
      };
    case "overdue":
      return {
        label: currentLang === "id" ? "Jatuh Tempo" : "Overdue",
        badge: "bg-orange-50 text-orange-700 border-orange-200",
      };
    case "cancelled":
      return {
        label: currentLang === "id" ? "Dibatalkan" : "Cancelled",
        badge: "bg-gray-100 text-gray-700 border-gray-200",
      };
    case "unpaid":
    default:
      return {
        label: currentLang === "id" ? "Belum Dibayar" : "Unpaid",
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

function joinTexts(values: Array<string | null | undefined>) {
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferProductId(payment?: PaymentRow, billing?: BillingRow) {
  const directProductId = String(payment?.product_id || "").trim().toLowerCase();
  if (directProductId) return directProductId;

  const metadataProductId = getMetaString(payment?.metadata, "productId").toLowerCase();
  if (metadataProductId) return metadataProductId;

  const metadataPackageId = getMetaString(payment?.metadata, "packageId").toLowerCase();
  if (metadataPackageId) return metadataPackageId;

  const text = joinTexts([
    billing?.plan_code,
    billing?.bill_type,
    billing?.description,
    payment?.product_name,
    payment?.payment_title,
    payment?.payment_description,
    payment?.billing_note,
  ]);

  if (text.includes("agent pro")) return "agent-pro";
  if (text.includes("gold")) return "gold";
  if (text.includes("silver")) return "silver";
  if (text.includes("homepage spotlight")) return "homepage-spotlight";
  if (text.includes("spotlight")) return "homepage-spotlight";
  if (text.includes("boost")) return "boost-listing";

  return "";
}

function inferCategory(payment?: PaymentRow, billing?: BillingRow): HistoryCategory {
  const productType = String(payment?.product_type || "").trim().toLowerCase();
  const flow = String(payment?.flow || "").trim().toLowerCase();
  const productId = inferProductId(payment, billing);

  if (
    productType === "membership" ||
    flow === "agent-membership" ||
    productId === "silver" ||
    productId === "gold" ||
    productId === "agent-pro"
  ) {
    return "membership";
  }

  if (
    productType === "addon" ||
    flow === "boost-listing" ||
    flow === "homepage-spotlight" ||
    productId === "boost-listing" ||
    productId === "homepage-spotlight"
  ) {
    return "addon";
  }

  const text = joinTexts([
    payment?.product_name,
    payment?.payment_title,
    payment?.payment_description,
    payment?.billing_note,
    billing?.description,
    billing?.plan_code,
    billing?.bill_type,
  ]);

  if (
    text.includes("boost") ||
    text.includes("spotlight") ||
    text.includes("addon") ||
    text.includes("add-on")
  ) {
    return "addon";
  }

  if (
    text.includes("silver") ||
    text.includes("gold") ||
    text.includes("agent pro") ||
    text.includes("membership")
  ) {
    return "membership";
  }

  return "other";
}

function inferPackageName(payment?: PaymentRow, billing?: BillingRow) {
  const productId = inferProductId(payment, billing);

  if (productId === "silver") return "Silver";
  if (productId === "gold") return "Gold";
  if (productId === "agent-pro") return "Agent Pro";
  if (productId === "boost-listing") return "Boost Listing";
  if (productId === "homepage-spotlight") return "Homepage Spotlight";

  const metadataPackageName = getMetaString(payment?.metadata, "packageName");
  if (metadataPackageName) return metadataPackageName;

  const text = joinTexts([
    billing?.plan_code,
    payment?.product_name,
    payment?.payment_title,
    payment?.payment_description,
    payment?.billing_note,
    billing?.description,
    billing?.bill_type,
  ]);

  if (text.includes("agent pro")) return "Agent Pro";
  if (text.includes("gold")) return "Gold";
  if (text.includes("silver")) return "Silver";
  if (text.includes("homepage spotlight")) return "Homepage Spotlight";
  if (text.includes("spotlight")) return "Homepage Spotlight";
  if (text.includes("boost")) return "Boost Listing";

  return cleanText(
    billing?.plan_code ||
      payment?.product_name ||
      payment?.payment_title ||
      billing?.description ||
      payment?.payment_description ||
      billing?.bill_type
  );
}

function inferBillingType(
  payment?: PaymentRow,
  billing?: BillingRow,
  lang: string = "id"
) {
  const currentLang = lang === "id" ? "id" : "en";

  const selectedBillingCycle = getMetaString(payment?.metadata, "selectedBillingCycle").toLowerCase();

  if (selectedBillingCycle === "monthly") {
    return currentLang === "id" ? "Bulanan" : "Monthly";
  }

  if (selectedBillingCycle === "yearly") {
    return currentLang === "id" ? "Tahunan" : "Yearly";
  }

  const productType = String(payment?.product_type || "").trim().toLowerCase();
  const flow = String(payment?.flow || "").trim().toLowerCase();
  const productId = inferProductId(payment, billing);

  if (
    productType === "addon" ||
    flow === "boost-listing" ||
    flow === "homepage-spotlight" ||
    productId === "boost-listing" ||
    productId === "homepage-spotlight"
  ) {
    return "Add-On";
  }

  const text = joinTexts([
    billing?.plan_code,
    billing?.bill_type,
    payment?.product_name,
    payment?.payment_title,
    payment?.payment_description,
    payment?.billing_note,
    billing?.description,
  ]);

  if (text.includes("monthly") || text.includes("bulanan")) {
    return currentLang === "id" ? "Bulanan" : "Monthly";
  }

  if (
    text.includes("yearly") ||
    text.includes("tahunan") ||
    text.includes("annual") ||
    text.includes("per year")
  ) {
    return currentLang === "id" ? "Tahunan" : "Yearly";
  }

  if (
    text.includes("boost") ||
    text.includes("spotlight") ||
    text.includes("addon") ||
    text.includes("add-on")
  ) {
    return "Add-On";
  }

  return "-";
}

function buildRenewTarget(item: HistoryItem): RenewTarget {
  if (item.category === "membership" && item.productId) {
    return {
      kind: "membership",
      href: `/agentdashboard/paket?renew=1&package=${encodeURIComponent(
        item.productId
      )}`,
    };
  }

  if (
    item.category === "addon" &&
    item.productId &&
    item.listingCode !== "-" &&
    item.listingCode
  ) {
    return {
      kind: "addon",
      href: `/agentdashboard/pembayaran?flow=addon&product=${encodeURIComponent(
        item.productId
      )}&kode=${encodeURIComponent(item.listingCode)}`,
    };
  }

  return {
    kind: "none",
    href: "",
  };
}

export default function AgentTagihanPage() {
  const { lang } = useLanguage();

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
        setError(lang === "id" ? "Silakan login ulang." : "Please log in again.");
        setItems([]);
        setLoading(false);
        return;
      }

      const [paymentsRes, billingsRes] = await Promise.all([
        supabase
          .from("payments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("billing_records")
          .select("*")
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
        setError(
          lang === "id"
            ? "Gagal memuat riwayat tagihan."
            : "Failed to load billing history."
        );
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

        const packageName = inferPackageName(latestPayment, billing);
        const billingType = inferBillingType(latestPayment, billing, lang);
        const category = inferCategory(latestPayment, billing);
        const productId = inferProductId(latestPayment, billing);

        const methodText = cleanText(
          latestPayment?.payment_method ||
            latestPayment?.method ||
            latestPayment?.gateway ||
            latestPayment?.provider
        );

        const rawTitle = latestPayment
          ? buildTitleFromPayment(latestPayment)
          : buildTitleFromBilling(billing);

        return {
          id: billing.id,
          billingId: billing.id,
          paymentId: latestPayment?.id || "",
          sortDate:
            latestPayment?.created_at ||
            billing.created_at ||
            new Date().toISOString(),

          title:
            rawTitle === "Tetamo Payment" && packageName !== "-"
              ? packageName
              : rawTitle,

          packageName,
          billingType,
          category,
          productId,

          listingCode: cleanText(
            latestPayment?.listing_code || billing.listing_code
          ),
          invoiceNumber: cleanText(billing.invoice_number),
          receiptNumber: cleanText(latestPayment?.receipt_number),
          planCode: cleanText(billing.plan_code),
          billType: cleanText(billing.bill_type),

          amount: formatAmount(
            latestPayment?.amount ?? billing.total ?? billing.amount ?? 0,
            latestPayment?.amount_idr ?? null,
            latestPayment?.currency ?? billing.currency ?? "IDR"
          ),

          method: methodText,
          createdDate: formatDate(billing.created_at),
          dueDate: formatDate(billing.due_at),
          paidDate: formatDate(latestPayment?.paid_at || billing.paid_at),
          expiryDate: formatDate(latestPayment?.expires_at || null),

          status,
          checkoutUrl:
            cleanText(latestPayment?.checkout_url) === "-"
              ? ""
              : cleanText(latestPayment?.checkout_url),
        };
      });

      const orphanPayments: HistoryItem[] = payments
        .filter(
          (payment) =>
            !payment.billing_record_id || !billingMap.has(payment.billing_record_id)
        )
        .map((payment) => {
          const packageName = inferPackageName(payment, undefined);
          const billingType = inferBillingType(payment, undefined, lang);
          const category = inferCategory(payment, undefined);
          const productId = inferProductId(payment, undefined);

          const methodText = cleanText(
            payment.payment_method ||
              payment.method ||
              payment.gateway ||
              payment.provider
          );

          const rawTitle = buildTitleFromPayment(payment);

          return {
            id: payment.id,
            billingId: "",
            paymentId: payment.id,
            sortDate: payment.created_at || new Date().toISOString(),

            title:
              rawTitle === "Tetamo Payment" && packageName !== "-"
                ? packageName
                : rawTitle,

            packageName,
            billingType,
            category,
            productId,

            listingCode: cleanText(payment.listing_code),
            invoiceNumber: "-",
            receiptNumber: cleanText(payment.receipt_number),
            planCode: "-",
            billType: "-",

            amount: formatAmount(
              payment.amount ?? 0,
              payment.amount_idr ?? null,
              payment.currency
            ),

            method: methodText,
            createdDate: formatDate(payment.created_at),
            dueDate: "-",
            paidDate: formatDate(payment.paid_at),
            expiryDate: formatDate(payment.expires_at),

            status: normalizeHistoryStatus(payment.status, null),
            checkoutUrl:
              cleanText(payment.checkout_url) === "-"
                ? ""
                : cleanText(payment.checkout_url),
          };
        });

      const merged = [...billingItems, ...orphanPayments].sort((a, b) => {
        return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
      });

      if (!ignore) {
        setItems(merged);
        setLoading(false);
      }
    }

    loadBillingHistory();

    return () => {
      ignore = true;
    };
  }, [lang]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return items.filter((item) => {
      const searchable = `
        ${item.title}
        ${item.packageName}
        ${item.billingType}
        ${item.planCode}
        ${item.billType}
        ${item.listingCode}
        ${item.invoiceNumber}
        ${item.receiptNumber}
        ${item.method}
        ${item.status}
        ${item.productId}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [searchQuery, items]);

  const latestMembership = useMemo(() => {
    return items.find((item) => item.category === "membership") ?? null;
  }, [items]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 sm:py-8 lg:px-6 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-bold tracking-tight text-[#1C1C1E] sm:text-2xl">
            {lang === "id" ? "Tagihan Agen" : "Agent Billing"}
          </h1>
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">
            {lang === "id"
              ? "Lihat paket yang dipilih, kode tagihan, invoice, receipt, dan status pembayaran Anda di sini."
              : "View your selected package, billing codes, invoice, receipt, and payment status here."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] text-gray-500 sm:text-xs">
              {lang === "id" ? "Paket Terakhir" : "Latest Package"}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {latestMembership?.packageName || "-"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] text-gray-500 sm:text-xs">
              {lang === "id" ? "Tipe Tagihan" : "Billing Type"}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {latestMembership?.billingType || "-"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-[11px] text-gray-500 sm:text-xs">
              {lang === "id" ? "Status Terakhir" : "Latest Status"}
            </div>
            <div className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
              {latestMembership ? statusUI(latestMembership.status, lang).label : "-"}
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
              lang === "id"
                ? "Cari paket, invoice, receipt, plan code, atau status..."
                : "Search package, invoice, receipt, plan code, or status..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-[13px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#1C1C1E] sm:py-3 sm:pl-11 sm:pr-4 sm:text-sm"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-8">
          {loading ? (
            <div className="p-4 text-xs text-gray-500 sm:p-6 sm:text-sm">
              {lang === "id"
                ? "Memuat riwayat tagihan..."
                : "Loading billing history..."}
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-red-600 sm:p-6 sm:text-sm">
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 sm:p-6 sm:text-sm">
              {lang === "id"
                ? "Belum ada riwayat tagihan."
                : "No billing history yet."}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const ui = statusUI(item.status, lang);
                const canRetry =
                  Boolean(item.checkoutUrl) &&
                  ["initiated", "pending", "failed", "expired", "unpaid"].includes(
                    item.status
                  );

                const renewTarget = buildRenewTarget(item);
                const canRenew = renewTarget.kind !== "none";

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
                          {item.billingType === "-"
                            ? lang === "id"
                              ? "Tagihan"
                              : "Billing"
                            : item.billingType}
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
                          {lang === "id" ? "Tipe Tagihan:" : "Billing Type:"}{" "}
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
                          Bill Type:{" "}
                          <span className="font-medium text-gray-700">
                            {item.billType}
                          </span>
                        </p>
                        <p>
                          Listing Code:{" "}
                          <span className="font-medium text-gray-700">
                            {item.listingCode}
                          </span>
                        </p>
                        <p>
                          Method:{" "}
                          <span className="font-medium text-gray-700">
                            {item.method}
                          </span>
                        </p>
                        <p>
                          Invoice:{" "}
                          <span className="font-medium text-gray-700">
                            {item.invoiceNumber}
                          </span>
                        </p>
                        <p>
                          Receipt:{" "}
                          <span className="font-medium text-gray-700">
                            {item.receiptNumber === "-"
                              ? lang === "id"
                                ? "Belum tersedia"
                                : "Not available yet"
                              : item.receiptNumber}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-1.5 text-[11px] leading-relaxed text-gray-500 sm:gap-2 sm:text-sm lg:min-w-[240px] lg:text-right">
                      <p className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                        {item.amount}
                      </p>
                      <p>
                        {lang === "id" ? "Dibuat:" : "Created:"} {item.createdDate}
                      </p>
                      <p>
                        {lang === "id" ? "Jatuh Tempo:" : "Due:"} {item.dueDate}
                      </p>
                      <p>
                        {lang === "id" ? "Dibayar:" : "Paid:"} {item.paidDate}
                      </p>
                      <p>
                        {lang === "id" ? "Kedaluwarsa:" : "Expired:"} {item.expiryDate}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-start gap-2 lg:min-w-[220px] lg:flex-col lg:items-end">
                      {item.invoiceNumber !== "-" ? (
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-700 sm:text-xs">
                          Invoice Ready
                        </span>
                      ) : null}

                      {item.receiptNumber !== "-" && item.paymentId ? (
                        <Link
                          href={`/agentdashboard/tagihan/receipt/${item.paymentId}`}
                          className="inline-flex rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs font-medium text-green-700 transition hover:bg-green-100 sm:px-4 sm:text-sm"
                        >
                          {lang === "id" ? "Lihat Receipt" : "View Receipt"}
                        </Link>
                      ) : null}

                      {canRenew ? (
                        <Link
                          href={renewTarget.href}
                          className="inline-flex rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 transition hover:bg-blue-100 sm:px-4 sm:text-sm"
                        >
                          {renewTarget.kind === "membership"
                            ? lang === "id"
                              ? "Perpanjang Membership"
                              : "Renew Membership"
                            : lang === "id"
                            ? "Perpanjang Add-On"
                            : "Renew Add-On"}
                        </Link>
                      ) : null}

                      {canRetry ? (
                        <a
                          href={item.checkoutUrl}
                          className="inline-flex rounded-xl bg-[#1C1C1E] px-3.5 py-2 text-xs font-medium text-white transition hover:opacity-90 sm:px-4 sm:text-sm"
                        >
                          {item.status === "failed" || item.status === "expired"
                            ? lang === "id"
                              ? "Coba Lagi"
                              : "Try Again"
                            : lang === "id"
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