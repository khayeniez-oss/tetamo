"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import { OWNER_PACKAGES, AGENT_PACKAGES } from "../data/pricelist";

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

function getPackageId(pkg: PackageLike) {
  const item = pkg as any;
  return String(item.id ?? "").trim();
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

function getStartHref(pkg: PackageLike, audience: "owner" | "agent") {
  const packageId = getPackageId(pkg);

  if (audience === "owner") {
    if (!packageId) return "/signup?role=owner";
    return `/signup?role=owner&plan=${encodeURIComponent(packageId)}`;
  }

  if (!packageId) return "/signup?role=agent";
  return `/signup?role=agent&package=${encodeURIComponent(packageId)}`;
}

function isRecommendedOwner(pkg: PackageLike, index: number) {
  const item = pkg as any;
  const key =
    `${item.id ?? ""} ${item.name ?? ""} ${item.nameEn ?? ""}`.toLowerCase();

  if (item.isFeatured) return true;
  if (key.includes("featured")) return true;

  return index === Math.min(1, OWNER_PACKAGES.length - 1);
}

function isRecommendedAgent(pkg: PackageLike, index: number) {
  const item = pkg as any;
  const key =
    `${item.id ?? ""} ${item.name ?? ""} ${item.nameEn ?? ""}`.toLowerCase();

  if (key.includes("gold")) return true;
  if (key.includes("popular")) return true;
  if (key.includes("recommended")) return true;

  return index === Math.min(1, AGENT_PACKAGES.length - 1);
}

function SectionLabel({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "amber" | "emerald";
}) {
  const className =
    tone === "amber"
      ? "border-amber-200 bg-gradient-to-r from-amber-100 via-orange-50 to-white text-amber-900"
      : "border-emerald-200 bg-gradient-to-r from-emerald-100 via-cyan-50 to-white text-emerald-900";

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${className}`}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  id,
  title,
  subtitle,
  tone,
}: {
  id: string;
  title: string;
  subtitle: string;
  tone: "amber" | "emerald";
}) {
  return (
    <div id={id} className="scroll-mt-28">
      <SectionLabel tone={tone}>{title}</SectionLabel>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl lg:text-[34px]">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5C5C62] sm:text-base">
        {subtitle}
      </p>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-[11px] font-medium text-[#374151] sm:text-xs">
      {children}
    </span>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-start gap-3 text-sm leading-6 text-[#4B5563]"
        >
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#111827]" />
          <span>{item}</span>
        </div>
      ))}
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
  const features = isID
    ? item.features ?? []
    : item.featuresEn ?? item.features ?? [];
  const monthlyBillingNote = isID
    ? item.monthlyBillingNote
    : item.monthlyBillingNoteEn ?? item.monthlyBillingNote;
  const startHref = getStartHref(pkg, audience);

  const cardBorder = recommended
    ? audience === "owner"
      ? "border-amber-300"
      : "border-emerald-300"
    : "border-[#E5E7EB]";

  const cardShadow = recommended
    ? audience === "owner"
      ? "shadow-[0_24px_60px_rgba(245,158,11,0.14)]"
      : "shadow-[0_24px_60px_rgba(16,185,129,0.14)]"
    : "shadow-[0_18px_40px_rgba(17,24,39,0.06)]";

  const topGlow = recommended
    ? audience === "owner"
      ? "from-amber-100 via-orange-50 to-white"
      : "from-emerald-100 via-cyan-50 to-white"
    : "from-white to-white";

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border bg-white p-5 transition-all duration-300 hover:-translate-y-1 sm:p-6 ${cardBorder} ${cardShadow}`}
    >
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${topGlow}`} />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {badge ? <Pill>{badge}</Pill> : null}
            {recommended ? (
              <span className="inline-flex rounded-full bg-gradient-to-r from-[#F59E0B] to-[#10B981] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                {isID ? "Rekomendasi" : "Recommended"}
              </span>
            ) : null}
          </div>

          <Pill>{duration}</Pill>
        </div>

        <div className="mt-5">
          <h3 className="text-2xl font-bold tracking-tight text-[#111827]">
            {name}
          </h3>

          <div className="mt-4">
            <div className="text-3xl font-extrabold tracking-tight text-[#111827] sm:text-[34px]">
              {price}
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-[#5C5C62]">
            {description ||
              (isID
                ? "Paket premium untuk membantu Anda tampil lebih profesional di Tetamo."
                : "A premium package to help you present your listings more professionally on Tetamo.")}
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7A7A85]">
              {isID ? "Cocok untuk" : "Best for"}
            </div>
            <div className="mt-1 text-sm font-medium text-[#1C1C1E]">
              {audience === "owner"
                ? isID
                  ? "Pemilik properti yang ingin listing lebih menarik"
                  : "Owners who want stronger listing visibility"
                : isID
                ? "Agen yang ingin berkembang lebih profesional"
                : "Agents who want to grow more professionally"}
            </div>
          </div>

          {listingCount !== null ? (
            <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7A7A85]">
                {audience === "owner"
                  ? isID
                    ? "Jumlah listing"
                    : "Listing quantity"
                  : isID
                  ? "Listing aktif"
                  : "Active listings"}
              </div>
              <div className="mt-1 text-sm font-medium text-[#1C1C1E]">
                {listingCount} listing
              </div>
            </div>
          ) : null}

          {featuredDays ? (
            <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7A7A85]">
                {isID ? "Exposure tambahan" : "Extra exposure"}
              </div>
              <div className="mt-1 text-sm font-medium text-[#1C1C1E]">
                {isID
                  ? `Featured hingga ${featuredDays} hari`
                  : `Featured up to ${featuredDays} days`}
              </div>
            </div>
          ) : null}

          {monthlyBillingNote ? (
            <div className="rounded-2xl border border-[#ECECF1] bg-[#FAFAFB] px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#7A7A85]">
                {isID ? "Opsi pembayaran" : "Payment option"}
              </div>
              <div className="mt-1 text-sm font-medium leading-6 text-[#1C1C1E]">
                {monthlyBillingNote}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6">
          <FeatureList items={features} />
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <Link
            href={startHref}
            className={`inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-center text-sm font-semibold transition ${
              recommended
                ? "bg-[#111827] text-white hover:bg-black"
                : "border border-[#D8D8DD] bg-white text-[#111827] hover:bg-[#F8F8FA]"
            }`}
          >
            {audience === "owner"
              ? isID
                ? "Pasang Listing sebagai Pemilik"
                : "List as Owner"
              : isID
              ? "Pasang Listing sebagai Agen"
              : "List as Agent"}
          </Link>

          <Link
            href="/faq"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-[#D8D8DD] bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827] transition hover:bg-[#F8F8FA]"
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_32%,#F8FCFB_100%)]">
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
        <div className="overflow-hidden rounded-[32px] border border-[#ECE8DD] bg-white shadow-[0_28px_70px_rgba(17,24,39,0.08)]">
          <div className="relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.15),transparent_35%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_35%),linear-gradient(to_bottom,rgba(255,255,255,0.96),rgba(255,255,255,1))]" />

            <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-full border border-[#E5E7EB] bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] sm:text-xs">
                  Tetamo Pricelist
                </span>

                <h1 className="mt-5 max-w-3xl text-[28px] font-black leading-[1.08] tracking-tight text-[#111827] sm:text-4xl lg:text-5xl">
                  {isID
                    ? "Pilih paket terbaik untuk kebutuhan listing Anda"
                    : "Choose the best package for your listing needs"}
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#5B5B63] sm:text-base lg:text-lg">
                  {isID
                    ? "Dirancang untuk pemilik dan agen yang ingin tampil lebih profesional, lebih menarik, dan lebih siap mendapatkan leads di Tetamo."
                    : "Designed for owners and agents who want a more professional, more attractive presence and a better chance to generate leads on Tetamo."}
                </p>

                <div className="mt-6 grid max-w-xl grid-cols-2 gap-3">
                  <a
                    href="#owner-packages"
                    className="inline-flex items-center justify-center rounded-2xl bg-[#111827] px-3 py-3 text-center text-[13px] font-semibold text-white transition hover:bg-black sm:px-5 sm:text-sm"
                  >
                    {isID ? "Lihat Paket Pemilik" : "View Owner Packages"}
                  </a>

                  <a
                    href="#agent-packages"
                    className="inline-flex items-center justify-center rounded-2xl border border-[#D8D8DD] bg-white px-3 py-3 text-center text-[13px] font-semibold text-[#111827] transition hover:bg-[#F8F8FA] sm:px-5 sm:text-sm"
                  >
                    {isID ? "Lihat Paket Agen" : "View Agent Packages"}
                  </a>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[26px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_18px_50px_rgba(245,158,11,0.10)]">
                  <div className="text-sm font-semibold text-[#92400E]">
                    {isID ? "Rekomendasi Pemilik" : "Owner Recommendation"}
                  </div>
                  <div className="mt-2 text-xl font-bold text-[#111827] sm:text-2xl">
                    {isID
                      ? "Pilih paket dengan visibilitas lebih kuat"
                      : "Choose stronger visibility for your listing"}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#6B7280]">
                    {isID
                      ? "Jika Anda ingin unit terlihat lebih menonjol, pilih paket dengan exposure yang lebih tinggi."
                      : "If you want your unit to stand out more, choose the package with stronger exposure."}
                  </p>
                </div>

                <div className="rounded-[26px] border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-5 shadow-[0_18px_50px_rgba(16,185,129,0.10)]">
                  <div className="text-sm font-semibold text-[#065F46]">
                    {isID ? "Rekomendasi Agen" : "Agent Recommendation"}
                  </div>
                  <div className="mt-2 text-xl font-bold text-[#111827] sm:text-2xl">
                    {isID
                      ? "Pilih paket agen yang paling seimbang"
                      : "Choose the most balanced agent plan"}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[#6B7280]">
                    {isID
                      ? "Untuk agen, paket yang seimbang biasanya paling ideal untuk listing lebih konsisten dan profesional."
                      : "For agents, a balanced package is usually the most practical way to list more consistently and professionally."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section id="owner-packages" className="mt-12 sm:mt-14">
          <SectionHeader
            id="owner-packages"
            tone="amber"
            title={isID ? "Paket Pemilik" : "Owner Packages"}
            subtitle={
              isID
                ? "Pilih paket yang sesuai untuk mengiklankan properti Anda dengan lebih profesional dan lebih menarik perhatian pembeli atau penyewa."
                : "Choose the right package to advertise your property more professionally and attract more buyer or renter attention."
            }
          />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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

        <section id="agent-packages" className="mt-14 sm:mt-16">
          <SectionHeader
            id="agent-packages"
            tone="emerald"
            title={isID ? "Paket Agen" : "Agent Packages"}
            subtitle={
              isID
                ? "Paket agen dirancang untuk membantu Anda mengelola listing secara lebih serius, tampil lebih profesional, dan berkembang bersama Tetamo."
                : "Agent packages are designed to help you manage listings more seriously, look more professional, and grow with Tetamo."
            }
          />

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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

        <section className="mt-14 sm:mt-16">
          <div className="overflow-hidden rounded-[30px] border border-[#E6E8EC] bg-gradient-to-r from-[#111827] via-[#1F2937] to-[#0F172A] p-6 text-white shadow-[0_24px_60px_rgba(17,24,39,0.22)] sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                  {isID
                    ? "Masih bingung mau pilih paket yang mana?"
                    : "Still not sure which package to choose?"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
                  {isID
                    ? "Lihat FAQ Tetamo untuk memahami alur listing, perbedaan pemilik dan agen, serta proses setelah sign up."
                    : "Check Tetamo FAQ to understand the listing flow, the difference between owner and agent, and what happens after sign up."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:max-w-md lg:justify-self-end">
                <Link
                  href="/faq"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-[#111827] transition hover:bg-[#F4F4F5]"
                >
                  {isID ? "Buka FAQ" : "Open FAQ"}
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  {isID ? "Pasang Listing" : "List Now"}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}