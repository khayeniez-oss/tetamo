"use client";

import type { ElementType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  TrendingUp,
  CircleCheckBig,
  WalletCards,
  RefreshCw,
  CreditCard,
  QrCode,
  Building2,
  Users,
  AlertTriangle,
  Package,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type CurrencyTotals = Record<string, number>;

type RevenueBucket = {
  sales: number;
  revenue: CurrencyTotals;
};

type ProductRow = {
  key: string;
  label: string;
  sales: number;
  revenue: CurrencyTotals;
};

type TrendRow = {
  key: string;
  label: string;
  sales: number;
  revenue: CurrencyTotals;
};

type UnverifiedTransaction = {
  id: string;
  product: string;
  amount: number;
  currency: string;
  paidAt: string | null;
};

type RevenueResponse = {
  ok: boolean;
  reportingTimezone: string;
  generatedAt: string;

  summary: {
    today: RevenueBucket;
    month: RevenueBucket;
    total: RevenueBucket;
  };

  providers: {
    hitpay: RevenueBucket;
    stripe: RevenueBucket;
  };

  customerTypes: {
    owner: RevenueBucket;
    agent: RevenueBucket;
  };

  products: ProductRow[];

  trend: TrendRow[];

  unverifiedPaid: {
    sales: number;
    revenue: CurrencyTotals;
    transactions: UnverifiedTransaction[];
  };

  error?: string;
};

function formatCurrencyAmount(
  amount: number,
  currency = "IDR"
) {
  const code = String(currency || "IDR").toUpperCase();

  if (code === "IDR") {
    return `Rp ${new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(amount || 0)}`;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `${code} ${new Intl.NumberFormat("en-US").format(
      amount || 0
    )}`;
  }
}

function formatTotals(totals?: CurrencyTotals) {
  const entries = Object.entries(totals || {}).filter(
    ([, value]) => Number(value || 0) !== 0
  );

  if (entries.length === 0) {
    return "Rp 0";
  }

  return entries
    .map(([currency, value]) =>
      formatCurrencyAmount(Number(value || 0), currency)
    )
    .join(" · ");
}

function getIdr(totals?: CurrencyTotals) {
  return Number(
    totals?.IDR ??
      totals?.idr ??
      0
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function StatCard({
  title,
  value,
  subtitle,
  Icon,
}: {
  title: string;
  value: ReactNode;
  subtitle?: string;
  Icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
            {title}
          </p>

          <div className="mt-1.5 break-words text-lg font-semibold text-[#1C1C1E] sm:text-xl">
            {value}
          </div>

          {subtitle ? (
            <p className="mt-1 text-[10px] leading-4 text-gray-400 sm:text-[11px]">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  subtitle,
  value,
  sales,
  Icon,
}: {
  title: string;
  subtitle: string;
  value: string;
  sales: number;
  Icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
            {title}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-400">
            {subtitle}
          </p>

          <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm">
            {value}
          </p>

          <p className="mt-0.5 text-[10px] text-gray-500 sm:text-[11px]">
            {sales} successful {sales === 1 ? "sale" : "sales"}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Icon size={16} className="text-[#1C1C1E]" />
        </div>
      </div>
    </div>
  );
}

export default function AdminRevenueAnalyticsPage() {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadRevenue = useCallback(
    async (manualRefresh = false) => {
      if (manualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.access_token) {
          throw new Error(
            "Admin session not found. Please log in again."
          );
        }

        const response = await fetch("/api/admin/revenue", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const payload =
          (await response.json()) as RevenueResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error ||
              "Failed to load revenue analytics."
          );
        }

        setData(payload);
      } catch (err) {
        console.error(
          "Failed to load revenue analytics:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load revenue analytics."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadRevenue();
  }, [loadRevenue]);

  const maxTrendRevenue = useMemo(() => {
    if (!data?.trend?.length) return 0;

    return Math.max(
      ...data.trend.map((item) =>
        getIdr(item.revenue)
      ),
      0
    );
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
            Revenue Analytics
          </h1>
          <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
            Loading verified revenue...
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[105px] animate-pulse rounded-2xl border border-gray-200 bg-white"
            />
          ))}
        </div>

        <div className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
            Revenue Analytics
          </h1>
          <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
            Verified Stripe and HitPay revenue.
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            Unable to load revenue
          </p>
          <p className="mt-1 text-xs leading-5 text-red-600">
            {error || "Revenue data is unavailable."}
          </p>

          <button
            type="button"
            onClick={() => loadRevenue(true)}
            className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-medium text-red-700 transition hover:bg-red-50"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
            Revenue Analytics
          </h1>

          <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
            Verified revenue confirmed by Stripe and HitPay payment webhooks.
          </p>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() => loadRevenue(true)}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-[11px] font-medium text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
        <StatCard
          title="Revenue Today"
          value={formatTotals(data.summary.today.revenue)}
          subtitle={`${data.summary.today.sales} successful ${
            data.summary.today.sales === 1 ? "sale" : "sales"
          }`}
          Icon={BadgeDollarSign}
        />

        <StatCard
          title="Revenue This Month"
          value={formatTotals(data.summary.month.revenue)}
          subtitle={`${data.summary.month.sales} successful ${
            data.summary.month.sales === 1 ? "sale" : "sales"
          }`}
          Icon={TrendingUp}
        />

        <StatCard
          title="Total Verified Revenue"
          value={formatTotals(data.summary.total.revenue)}
          subtitle="Stripe + HitPay confirmed"
          Icon={WalletCards}
        />

        <StatCard
          title="Successful Sales"
          value={data.summary.total.sales}
          subtitle="Provider-confirmed transactions"
          Icon={CircleCheckBig}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
          <div>
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Revenue Trend
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
              Verified revenue for the last 6 months.
            </p>
          </div>

          <div className="mt-5">
            <div className="flex h-52 items-end gap-2 sm:h-64 sm:gap-3">
              {data.trend.map((item) => {
                const amount = getIdr(item.revenue);

                const heightPercent =
                  maxTrendRevenue > 0
                    ? Math.max(
                        (amount / maxTrendRevenue) * 100,
                        amount > 0 ? 5 : 0
                      )
                    : 0;

                return (
                  <div
                    key={item.key}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  >
                    <div className="mb-2 min-h-[30px] text-center">
                      <p className="truncate text-[9px] font-medium text-[#1C1C1E] sm:text-[10px]">
                        {amount > 0
                          ? formatCurrencyAmount(amount, "IDR")
                          : "Rp 0"}
                      </p>
                    </div>

                    <div className="flex h-36 w-full items-end rounded-t-xl bg-gray-50 sm:h-44">
                      <div
                        className="w-full rounded-t-xl bg-[#1C1C1E] transition-all"
                        style={{
                          height: `${heightPercent}%`,
                          minHeight: amount > 0 ? 6 : 0,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-center text-[9px] font-medium text-gray-500 sm:text-[10px]">
                      {item.label}
                    </p>

                    <p className="mt-0.5 text-[9px] text-gray-400">
                      {item.sales} {item.sales === 1 ? "sale" : "sales"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
            Revenue by Provider
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
            Confirmed payment gateway revenue.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <BreakdownCard
              title="HitPay"
              subtitle="QRIS & supported HitPay methods"
              value={formatTotals(
                data.providers.hitpay.revenue
              )}
              sales={data.providers.hitpay.sales}
              Icon={QrCode}
            />

            <BreakdownCard
              title="Stripe"
              subtitle="Debit / credit card"
              value={formatTotals(
                data.providers.stripe.revenue
              )}
              sales={data.providers.stripe.sales}
              Icon={CreditCard}
            />
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <h3 className="text-xs font-semibold text-[#1C1C1E]">
              Revenue by Customer Type
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <BreakdownCard
                title="Owners"
                subtitle="Property owner payments"
                value={formatTotals(
                  data.customerTypes.owner.revenue
                )}
                sales={data.customerTypes.owner.sales}
                Icon={Building2}
              />

              <BreakdownCard
                title="Agents"
                subtitle="Agent package payments"
                value={formatTotals(
                  data.customerTypes.agent.revenue
                )}
                sales={data.customerTypes.agent.sales}
                Icon={Users}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
        <div>
          <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
            Revenue by Product
          </h2>

          <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs">
            Verified sales grouped by Tetamo product or package.
          </p>
        </div>

        {data.products.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
            <Package
              size={20}
              className="mx-auto text-gray-400"
            />
            <p className="mt-2 text-xs text-gray-500">
              No verified product revenue yet.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
            {data.products.map((product, index) => (
              <div
                key={product.key}
                className={`flex items-center justify-between gap-4 p-3.5 ${
                  index !== data.products.length - 1
                    ? "border-b border-gray-100"
                    : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                    {product.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400 sm:text-[11px]">
                    {product.sales} successful{" "}
                    {product.sales === 1 ? "sale" : "sales"}
                  </p>
                </div>

                <p className="shrink-0 text-right text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                  {formatTotals(product.revenue)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {data.unverifiedPaid.sales > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-white">
              <AlertTriangle
                size={16}
                className="text-amber-700"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-amber-900">
                Unverified / Manual Paid
              </h2>

              <p className="mt-1 text-[11px] leading-5 text-amber-800 sm:text-xs">
                These transactions are marked paid but do not contain verified
                Stripe or HitPay webhook evidence. They are excluded from all
                revenue totals above.
              </p>

              <div className="mt-3 rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-gray-600">
                    {data.unverifiedPaid.sales}{" "}
                    {data.unverifiedPaid.sales === 1
                      ? "transaction"
                      : "transactions"}
                  </p>

                  <p className="text-[12px] font-semibold text-[#1C1C1E]">
                    {formatTotals(
                      data.unverifiedPaid.revenue
                    )}
                  </p>
                </div>
              </div>

              {data.unverifiedPaid.transactions.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {data.unverifiedPaid.transactions.map(
                    (transaction) => (
                      <div
                        key={transaction.id}
                        className="rounded-xl border border-amber-100 bg-white/70 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium text-[#1C1C1E]">
                              {transaction.product}
                            </p>

                            <p className="mt-0.5 text-[9px] text-gray-400 sm:text-[10px]">
                              {formatDateTime(
                                transaction.paidAt
                              )}
                            </p>
                          </div>

                          <p className="text-[11px] font-semibold text-[#1C1C1E]">
                            {formatCurrencyAmount(
                              transaction.amount,
                              transaction.currency
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-[9px] text-gray-400 sm:text-[10px]">
        <span>
          Reporting timezone: {data.reportingTimezone}
        </span>

        <span>
          Updated {formatDateTime(data.generatedAt)}
        </span>
      </div>
    </div>
  );
}
