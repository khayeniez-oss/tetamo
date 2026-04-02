"use client";

import type { ElementType } from "react";
import {
  BadgeDollarSign,
  TrendingUp,
  Star,
  Building2,
} from "lucide-react";

function StatCard({
  title,
  value,
  Icon,
}: {
  title: string;
  value: string | number;
  Icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
            {title}
          </p>
          <p className="mt-1.5 break-words text-lg font-semibold text-[#1C1C1E] sm:text-xl">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminRevenueAnalyticsPage() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Revenue Analytics
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Monitor marketplace earnings, package performance, and growth.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Revenue Today"
          value="Rp 5.250.000"
          Icon={BadgeDollarSign}
        />
        <StatCard
          title="Revenue This Month"
          value="Rp 187.500.000"
          Icon={TrendingUp}
        />
        <StatCard
          title="Featured Revenue"
          value="Rp 92.750.000"
          Icon={Star}
        />
        <StatCard
          title="Top City Revenue"
          value="Jakarta Selatan"
          Icon={Building2}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
            Revenue Trend
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
            Placeholder for monthly revenue chart by package and city.
          </p>

          <div className="mt-4 flex h-56 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-[#FAFAFA] px-4 text-center text-[12px] text-gray-500 sm:mt-5 sm:h-64 sm:text-sm md:h-72">
            Revenue chart placeholder
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
            Revenue Breakdown
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                Basic Listings
              </p>
              <p className="mt-1 text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                Rp 94.750.000
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                Featured Listings
              </p>
              <p className="mt-1 text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                Rp 92.750.000
              </p>
            </div>

            <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-gray-600 sm:text-xs md:text-sm">
                  Refunds
                </p>
                <p className="text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                  Rp 3.500.000
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}