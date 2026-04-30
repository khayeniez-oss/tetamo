"use client";

import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import { OWNER_PACKAGES, AGENT_PACKAGES } from "@/app/data/pricelist";

type PackageLike =
  | (typeof OWNER_PACKAGES)[number]
  | (typeof AGENT_PACKAGES)[number];

function formatIdr(value?: number | null) {
  const safeValue = Number(value ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safeValue);
}

function getPackageName(pkg: PackageLike, isID: boolean) {
  const item = pkg as any;
  return isID ? item.name ?? item.nameEn ?? "" : item.nameEn ?? item.name ?? "";
}

function getPackageBadge(pkg: PackageLike, isID: boolean) {
  const item = pkg as any;
  return isID
    ? item.badge ?? item.badgeEn ?? ""
    : item.badgeEn ?? item.badge ?? "";
}

function getPackageDescription(pkg: PackageLike, isID: boolean) {
  const item = pkg as any;

  return isID
    ? item.paymentDescription ??
        item.description ??
        item.paymentDescriptionEn ??
        item.descriptionEn ??
        ""
    : item.paymentDescriptionEn ??
        item.descriptionEn ??
        item.paymentDescription ??
        item.description ??
        "";
}

function getDurationText(pkg: PackageLike, isID: boolean) {
  const item = pkg as any;
  const billingCycle = String(item.billingCycle ?? "").toLowerCase();
  const days = Number(item.durationDays ?? 0);

  if (billingCycle === "monthly") return isID ? "Bulanan" : "Monthly";
  if (billingCycle === "yearly") return isID ? "Tahunan" : "Yearly";

  if (!days || Number.isNaN(days)) return isID ? "Sesuai paket" : "Per package";

  if (days % 365 === 0) {
    const years = days / 365;
    return isID
      ? `${years} Tahun`
      : `${years} Year${years > 1 ? "s" : ""}`;
  }

  if (days % 30 === 0) {
    const months = days / 30;
    return isID
      ? `${months} Bulan`
      : `${months} Month${months > 1 ? "s" : ""}`;
  }

  return isID ? `${days} Hari` : `${days} Days`;
}

function getListingCount(pkg: PackageLike) {
  const item = pkg as any;

  return (
    item.maxListings ??
    item.listingLimit ??
    item.activeListingLimit ??
    item.maxActiveListings ??
    null
  );
}

function getFeaturedDays(pkg: PackageLike) {
  const item = pkg as any;
  return item.featuredDurationDays ?? null;
}

function isRecommendedOwner(pkg: PackageLike, index: number) {
  const item = pkg as any;
  const key = `${item.id ?? ""} ${item.name ?? ""} ${item.nameEn ?? ""}`.toLowerCase();

  if (item.isFeatured) return true;
  if (key.includes("featured")) return true;

  return index === Math.min(1, OWNER_PACKAGES.length - 1);
}

function isRecommendedAgent(pkg: PackageLike, index: number) {
  const item = pkg as any;
  const key = `${item.id ?? ""} ${item.name ?? ""} ${item.nameEn ?? ""}`.toLowerCase();

  if (key.includes("silver")) return true;
  if (key.includes("popular")) return true;

  return index === Math.min(1, AGENT_PACKAGES.length - 1);
}

function SectionHeader({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle: string;
  accent: "amber" | "emerald";
}) {
  const accentClasses =
    accent === "amber"
      ? "from-amber-500/20 to-orange-500/20 border-amber-200"
      : "from-emerald-500/20 to-cyan-500/20 border-emerald-200";

  return (
    <div className="mb-8">
      <div
        className={`inline-flex items-center rounded-full border bg-gradient-to-r px-4 py-1.5 text-xs font-semibold text-[#1C1C1E] ${accentClasses}`}
      >
        {title}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5C5C62] sm:text-base">
        {subtitle}
      </p>
    </div>
  );
}

function PackageCard({
  pkg,
  isID,
  recommended,
  audience,
}: {
  pkg: PackageLike;
  isID: boolean;
  recommended: boolean;
  audience: "owner" | "agent";
}) {
  const item = pkg as any;
  const name = getPackageName(pkg, isID);
  const badge = getPackageBadge(pkg, isID);
  const description = getPackageDescription(pkg, isID);
  const listingCount = getListingCount(pkg);
  const featuredDays = getFeaturedDays(pkg);
  const price = formatIdr(item.priceIdr ?? 0);
  const duration = getDurationText(pkg, isID);

  const topGlow = recommended
    ? audience === "owner"
      ? "from-amber-500/20 via-orange-500/10 to-white"
      : "from-emerald-500/20 via-cyan-500/10 to-white"
    : "from-white to-white";

  const borderClass = recommended
    ? audience === "owner"
      ? "border-amber-300 shadow-[0_20px_60px_rgba(245,158,11,0.16)]"
      : "border-emerald-300 shadow-[0_20px_60px_rgba(16,185,129,0.16)]"
    : "border-[#E7E7EA] shadow-[0_18px_40px_rgba(16,24,40,0.06)]";

  const buttonClass = recommended
    ? audience === "owner"
      ? "bg-[#1C1C1E] text-white hover:bg-black"
      : "bg-[#1C1C1E] text-white hover:bg-black"
    : "bg-white text-[#1C1C1E] border border-[#D8D8DD] hover:bg-[#F8F8FA]";

  return (
    <div
      className={`group relative overflow-hidden rounded-[30px] border bg-white p-6 transition-all duration-300 hover:-translate-y-1 sm:p-7 ${borderClass}`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${topGlow}`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {badge ? (
              <span className="rounded-full bg-[#1C1C1E] px-3 py-1 text-xs font-semibold text-white">
                {badge}
              </span>
            ) : null}

            {recommended ? (
              <span className="rounded-full bg-gradient-to-r from-[#F59E0B] to-[#10B981] px-3 py-1 text-xs font-semibold text-white">
                {isID ? "Rekomendasi" : "Recommended"}
              </span>
            ) : null}
          </div>

          <span className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium text-[#6B7280]">
            {duration}
          </span>
        </div>

        <div className="mt-6">
          <h3 className="text-2xl font-bold tracking-tight text-[#111827]">
            {name}
          </h3>

          <div className="mt-4 flex items-end gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#111827]">
              {price}
            </span>
          </div>

          <p className="mt-4 min-h-[72px] text-sm leading-7 text-[#5B5B63]">
            {description ||
              (isID
                ? "Paket premium untuk membantu Anda tampil lebih profesional di Tetamo."
                : "A premium package to help you present your listings more professionally on Tetamo.")}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#7A7A85]">
              {isID ? "Cocok untuk" : "Best for"}
            </div>
            <div className="mt-1 text-sm font-medium text-[#1C1C1E]">
              {audience === "owner"
                ? isID
                  ? "Pemilik properti yang ingin listing dengan lebih menarik"
                  : "Property owners who want stronger listing visibility"
                : isID
                ? "Agen yang ingin mengelola listing secara profesional"
                : "Agents who want to manage listings more professionally"}
            </div>
          </div>

          {listingCount !== null ? (
            <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7A7A85]">
                {audience === "owner"
                  ? isID
                    ? "Jumlah listing"
                    : "Listing quantity"
                  : isID
                  ? "Listing aktif"
                  : "Active listings"}
              </div>
              <div className="mt-1 text-sm font-medium text-[#1C1C1E]">
                {listingCount}{" "}
                {isID ? "listing" : "listing"}
              </div>
            </div>
          ) : null}

          {featuredDays ? (
            <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#7A7A85]">
                {isID ? "Exposure tambahan" : "Extra exposure"}
              </div>
              <div className="mt-1 text-sm font-medium text-[#1C1C1E]">
                {isID
                  ? `Featured exposure hingga ${featuredDays} hari`
                  : `Featured exposure up to ${featuredDays} days`}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-[#7A7A85]">
              {isID ? "Pembayaran" : "Payment"}
            </div>
            <div className="mt-1 text-sm font-medium text-[#1C1C1E]">
              {item.renewable
                ? isID
                  ? "Dapat diperpanjang"
                  : "Renewable"
                : isID
                ? "Sekali bayar"
                : "One-time payment"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className={`inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${buttonClass}`}
          >
            {audience === "owner"
              ? isID
                ? "Mulai sebagai Pemilik"
                : "Start as Owner"
              : isID
              ? "Mulai sebagai Agen"
              : "Start as Agent"}
          </Link>

          <Link
            href="/faq"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-[#D9D9DE] bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#F8F8FA]"
          >
            {isID ? "Lihat FAQ" : "View FAQ"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PriceListPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_30%,#F8FCFB_100%)]">
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div className="overflow-hidden rounded-[36px] border border-[#ECE8DD] bg-white shadow-[0_30px_80px_rgba(17,24,39,0.08)]">
          <div className="relative overflow-hidden px-6 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.15),transparent_35%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.96),rgba(255,255,255,1))]" />

            <div className="relative grid items-center gap-8 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <span className="inline-flex rounded-full border border-[#E5E7EB] bg-white/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
                  {isID ? "Tetamo Pricelist" : "Tetamo Pricelist"}
                </span>

                <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-[#111827] sm:text-5xl">
                  {isID
                    ? "Pilih paket terbaik untuk listing properti Anda"
                    : "Choose the best package for your property listings"}
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-[#5B5B63] sm:text-lg">
                  {isID
                    ? "Dirancang untuk pemilik dan agen yang ingin tampil lebih profesional, lebih menarik, dan lebih siap mendapatkan leads di Tetamo."
                    : "Designed for owners and agents who want a more professional, more attractive presence and a better chance to generate leads on Tetamo."}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    href="#owner-packages"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
                  >
                    {isID ? "Lihat Paket Pemilik" : "View Owner Packages"}
                  </a>

                  <a
                    href="#agent-packages"
                    className="inline-flex items-center justify-center rounded-2xl border border-[#D8D8DD] bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#F8F8FA]"
                  >
                    {isID ? "Lihat Paket Agen" : "View Agent Packages"}
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  {[
                    isID ? "Harga jelas" : "Clear pricing",
                    isID ? "Pilihan untuk pemilik & agen" : "Options for owners & agents",
                    isID ? "Tampilan lebih premium" : "More premium presentation",
                    isID ? "Lebih menarik untuk leads" : "More inviting for leads",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-medium text-[#4B5563] sm:text-sm"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-[0_18px_50px_rgba(245,158,11,0.12)]">
                  <div className="text-sm font-semibold text-[#92400E]">
                    {isID ? "Rekomendasi untuk Pemilik" : "Recommended for Owners"}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-[#111827]">
                    {isID ? "Pilih paket yang paling menonjol" : "Choose the package with stronger visibility"}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#6B7280]">
                    {isID
                      ? "Jika Anda ingin listing terlihat lebih menonjol, pilih paket dengan exposure yang lebih kuat."
                      : "If you want your listing to stand out more, choose the package with stronger exposure."}
                  </p>
                </div>

                <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-6 shadow-[0_18px_50px_rgba(16,185,129,0.12)]">
                  <div className="text-sm font-semibold text-[#065F46]">
                    {isID ? "Rekomendasi untuk Agen" : "Recommended for Agents"}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-[#111827]">
                    {isID ? "Pilih paket yang seimbang" : "Pick the most balanced package"}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#6B7280]">
                    {isID
                      ? "Untuk agen, paket yang seimbang biasanya paling ideal untuk mulai tumbuh dan tetap efisien."
                      : "For agents, a balanced package is usually the best way to grow while staying efficient."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="owner-packages" className="mt-14">
          <SectionHeader
            accent="amber"
            title={isID ? "Paket Pemilik" : "Owner Packages"}
            subtitle={
              isID
                ? "Pilih paket yang sesuai untuk mengiklankan properti Anda dengan lebih profesional dan menarik perhatian pembeli atau penyewa."
                : "Choose the package that fits your needs to advertise your property more professionally and attract buyers or renters."
            }
          />

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {OWNER_PACKAGES.map((pkg, index) => (
              <PackageCard
                key={(pkg as any).id ?? index}
                pkg={pkg}
                isID={isID}
                recommended={isRecommendedOwner(pkg, index)}
                audience="owner"
              />
            ))}
          </div>
        </section>

        <section id="agent-packages" className="mt-16">
          <SectionHeader
            accent="emerald"
            title={isID ? "Paket Agen" : "Agent Packages"}
            subtitle={
              isID
                ? "Paket agen dirancang untuk membantu Anda mengelola listing secara lebih serius, tampil lebih profesional, dan berkembang bersama Tetamo."
                : "Agent packages are designed to help you manage listings more seriously, look more professional, and grow with Tetamo."
            }
          />

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {AGENT_PACKAGES.map((pkg, index) => (
              <PackageCard
                key={(pkg as any).id ?? index}
                pkg={pkg}
                isID={isID}
                recommended={isRecommendedAgent(pkg, index)}
                audience="agent"
              />
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="overflow-hidden rounded-[32px] border border-[#E6E8EC] bg-gradient-to-r from-[#111827] via-[#1F2937] to-[#0F172A] p-8 text-white shadow-[0_24px_60px_rgba(17,24,39,0.22)] sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  {isID
                    ? "Masih bingung mau pilih yang mana?"
                    : "Still not sure which package to choose?"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  {isID
                    ? "Lihat FAQ Tetamo untuk memahami alur listing, perbedaan pemilik dan agen, serta proses setelah sign up."
                    : "Check Tetamo FAQ to understand the listing flow, the difference between owner and agent, and what happens after sign up."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  href="/faq"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#F4F4F5]"
                >
                  {isID ? "Buka FAQ" : "Open FAQ"}
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {isID ? "Mulai Sekarang" : "Get Started"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}