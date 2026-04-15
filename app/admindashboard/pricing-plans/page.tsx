"use client";

import { useMemo } from "react";
import {
  Crown,
  CheckCircle2,
  Package2,
  Sparkles,
  LayoutGrid,
  BookOpen,
} from "lucide-react";
import {
  OWNER_PACKAGES,
  AGENT_PACKAGES,
  ADD_ON_PRODUCTS,
  EDUCATION_PRODUCTS,
} from "@/app/data/pricelist";

function formatIdr(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

function getBooleanLabel(value: boolean) {
  return value ? "Yes" : "No";
}

function getBillingLabel(
  billingCycle: "monthly" | "yearly",
  availableBillingCycles?: Array<"monthly" | "yearly">
) {
  const available = availableBillingCycles ?? [billingCycle];
  const hasMonthly = available.includes("monthly");
  const hasYearly = available.includes("yearly");

  if (hasMonthly && hasYearly) return "Yearly • Monthly option available";
  if (hasMonthly) return "Monthly";
  return "Yearly";
}

function getEducationAudienceLabel(audience?: string) {
  if ((audience || "").toLowerCase() === "all") {
    return "Owner • Non-member Agent";
  }

  if ((audience || "").toLowerCase() === "owner") {
    return "Owner";
  }

  if ((audience || "").toLowerCase() === "agent") {
    return "Agent";
  }

  return "Education Access";
}

export default function AdminPricingPage() {
  const ownerPackages = useMemo(
    () => [...OWNER_PACKAGES].sort((a, b) => a.priceIdr - b.priceIdr),
    []
  );

  const agentPackages = useMemo(
    () => [...AGENT_PACKAGES].sort((a, b) => a.priceIdr - b.priceIdr),
    []
  );

  const addOnProducts = useMemo(
    () => [...ADD_ON_PRODUCTS].sort((a, b) => a.priceIdr - b.priceIdr),
    []
  );

  const educationProducts = useMemo(
    () => [...EDUCATION_PRODUCTS].sort((a, b) => a.priceIdr - b.priceIdr),
    []
  );

  const totalProducts =
    ownerPackages.length +
    agentPackages.length +
    addOnProducts.length +
    educationProducts.length;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl lg:text-3xl">
            Pricing Plans
          </h1>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-gray-600 sm:text-sm sm:leading-6 lg:text-base">
            Semua produk yang sedang dijual dari pricelist Tetamo ditampilkan di
            halaman ini untuk admin review.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:mb-8 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
              Total Products
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
              {totalProducts}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
              Owner Packages
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
              {ownerPackages.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
              Agent Packages
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
              {agentPackages.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
              Add-ons
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
              {addOnProducts.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
              Education
            </p>
            <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
              {educationProducts.length}
            </p>
          </div>
        </div>

        <section className="mb-8 sm:mb-10">
          <div className="mb-4 flex items-center gap-2 sm:mb-5">
            <Package2 className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg lg:text-xl">
              Owner Packages
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {ownerPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl lg:text-2xl">
                        {pkg.name}
                      </h3>

                      {pkg.badge ? (
                        <span className="rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white sm:text-xs">
                          {pkg.badge}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs font-medium text-gray-500 sm:text-sm">
                      Owner • Listing Package
                    </p>

                    <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                      {pkg.paymentDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-gray-50 p-3 sm:p-4">
                  <p className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                    {formatIdr(pkg.priceIdr)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                    {pkg.durationDays} days
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Max Listings
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {pkg.maxListings}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Featured
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {pkg.isFeatured
                        ? `${pkg.featuredDurationDays ?? 0} days`
                        : "No"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Renewable
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {getBooleanLabel(pkg.renewable)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Auto Renew
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {getBooleanLabel(pkg.autoRenewDefault)}
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 text-gray-700">
                  {pkg.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 sm:gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                      <span className="text-xs leading-6 sm:text-sm sm:leading-7">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                    Billing Note
                  </p>
                  <p className="mt-2 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                    {pkg.billingNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 sm:mb-10">
          <div className="mb-4 flex items-center gap-2 sm:mb-5">
            <Crown className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg lg:text-xl">
              Agent Packages
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agentPackages.map((pkg) => {
              const isHighestTier =
                pkg.id === agentPackages[agentPackages.length - 1]?.id;

              return (
                <div
                  key={pkg.id}
                  className="relative rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"
                >
                  {isHighestTier ? (
                    <div className="absolute right-3 top-3 rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white sm:right-4 sm:top-4 sm:text-xs">
                      Highest Tier
                    </div>
                  ) : null}

                  <div className="min-w-0 pr-14 sm:pr-16">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 shrink-0 text-yellow-500 sm:h-5 sm:w-5" />
                      <h3 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl lg:text-2xl">
                        {pkg.name}
                      </h3>
                    </div>

                    <p className="mt-2 text-xs font-medium text-gray-500 sm:text-sm">
                      Agent • Membership •{" "}
                      {getBillingLabel(pkg.billingCycle, pkg.availableBillingCycles)}
                    </p>

                    <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                      {pkg.paymentDescription}
                    </p>
                  </div>

                  <div className="mt-5">
                    <div className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                      {formatIdr(pkg.priceIdr)}
                    </div>

                    <div className="mt-1 text-xs text-gray-600 sm:text-sm">
                      / year
                    </div>

                    {pkg.monthlyPriceIdr ? (
                      <p className="mt-3 text-xs leading-6 text-gray-500 sm:text-sm sm:leading-6">
                        {formatIdr(pkg.monthlyPriceIdr)} / month with{" "}
                        {pkg.monthlyCommitmentMonths ?? 12} months commitment
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="rounded-2xl border border-gray-200 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                        Active Listings
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                        {pkg.maxListings}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                        Featured Listings
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                        {pkg.maxFeaturedListings}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                        Duration
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                        {pkg.durationDays} days
                      </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 p-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                        Auto Renew
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                        {getBooleanLabel(pkg.autoRenewDefault)}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3 text-gray-700">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 sm:gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                        <span className="text-xs leading-6 sm:text-sm sm:leading-7">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Billing Note
                    </p>
                    <p className="mt-2 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                      {pkg.billingNote}
                    </p>

                    {pkg.monthlyBillingNote ? (
                      <p className="mt-3 text-xs leading-6 text-gray-500 sm:text-sm sm:leading-7">
                        {pkg.monthlyBillingNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mb-8 sm:mb-10">
          <div className="mb-4 flex items-center gap-2 sm:mb-5">
            <BookOpen className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg lg:text-xl">
              Education Products
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {educationProducts.map((product) => (
              <div
                key={product.id}
                className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl lg:text-2xl">
                        {product.name}
                      </h3>

                      {product.badge ? (
                        <span className="rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white sm:text-xs">
                          {product.badge}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs font-medium text-gray-500 sm:text-sm">
                      Education • {getEducationAudienceLabel(product.audience)}
                    </p>

                    <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                      {product.paymentDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-gray-50 p-3 sm:p-4">
                  <p className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                    {formatIdr(product.priceIdr)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                    {product.durationDays} days
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Audience
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {getEducationAudienceLabel(product.audience)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Duration
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {product.durationDays} days
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Renewable
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {getBooleanLabel(product.renewable)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Auto Renew
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {getBooleanLabel(product.autoRenewDefault)}
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 text-gray-700">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 sm:gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                      <span className="text-xs leading-6 sm:text-sm sm:leading-7">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                    Billing Note
                  </p>
                  <p className="mt-2 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                    {product.billingNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2 sm:mb-5">
            <Sparkles className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg lg:text-xl">
              Add-on Products
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {addOnProducts.map((addon) => (
              <div
                key={addon.id}
                className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
                        <h3 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl lg:text-2xl">
                          {addon.name}
                        </h3>
                      </div>

                      {addon.badge ? (
                        <span className="rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white sm:text-xs">
                          {addon.badge}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs font-medium text-gray-500 sm:text-sm">
                      Add-on • {addon.audience} • {addon.placement}
                    </p>

                    <p className="mt-3 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                      {addon.paymentDescription}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-gray-50 p-3 sm:p-4">
                  <p className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                    {formatIdr(addon.priceIdr)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                    {addon.durationDays} days
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Placement
                    </p>
                    <p className="mt-1 text-sm font-semibold capitalize text-[#1C1C1E] sm:text-base">
                      {addon.placement}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                      Auto Renew
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                      {getBooleanLabel(addon.autoRenewDefault)}
                    </p>
                  </div>
                </div>

                <ul className="mt-5 space-y-3 text-gray-700">
                  {addon.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 sm:gap-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 sm:h-5 sm:w-5" />
                      <span className="text-xs leading-6 sm:text-sm sm:leading-7">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                    Billing Note
                  </p>
                  <p className="mt-2 text-xs leading-6 text-gray-600 sm:text-sm sm:leading-7">
                    {addon.billingNote}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}