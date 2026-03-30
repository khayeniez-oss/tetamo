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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-[#1C1C1E]">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#1C1C1E]" />
        </div>
      </div>
    </div>
  );
}

export default function AdminRevenueAnalyticsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Revenue Analytics</h1>
        <p className="text-sm text-gray-500">
          Monitor marketplace earnings, package performance, and growth.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <StatCard title="Revenue Today" value="Rp 5.250.000" Icon={BadgeDollarSign} />
        <StatCard title="Revenue This Month" value="Rp 187.500.000" Icon={TrendingUp} />
        <StatCard title="Featured Revenue" value="Rp 92.750.000" Icon={Star} />
        <StatCard title="Top City Revenue" value="Jakarta Selatan" Icon={Building2} />
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">Revenue Trend</h2>
          <p className="text-sm text-gray-500 mt-1">
            Placeholder for monthly revenue chart by package and city.
          </p>
          <div className="h-72 mt-6 rounded-2xl border border-dashed border-gray-300 bg-[#FAFAFA] flex items-center justify-center text-sm text-gray-500">
            Revenue chart placeholder
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">Revenue Breakdown</h2>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Basic Listings</p>
              <p className="text-sm font-semibold text-[#1C1C1E]">Rp 94.750.000</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Featured Listings</p>
              <p className="text-sm font-semibold text-[#1C1C1E]">Rp 92.750.000</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Refunds</p>
              <p className="text-sm font-semibold text-[#1C1C1E]">Rp 3.500.000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}