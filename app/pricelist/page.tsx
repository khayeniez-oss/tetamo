"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { OWNER_PACKAGES, AGENT_PACKAGES } from "@/app/data/pricelist";

type PackageItem = {
  id: string;
  name?: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  paymentDescription?: string;
  paymentDescriptionEn?: string;
  badge?: string;
  badgeEn?: string;
  billingNote?: string;
  billingNoteEn?: string;
  audience?: "owner" | "agent" | string;
  productType?: string;
  priceIdr?: number;
  durationDays?: number;
  maxListings?: number;
  renewable?: boolean;
  autoRenewDefault?: boolean;
  isFeatured?: boolean;
  featuredDurationDays?: number;
  downgradeToBasicAfterFeatured?: boolean;
};

function formatIdr(value?: number) {
  if (!value || Number.isNaN(value)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getText(
  isID: boolean,
  idText?: string,
  enText?: string,
  fallback = ""
) {
  if (isID) return idText || enText || fallback;
  return enText || idText || fallback;
}

function getDescription(pkg: PackageItem, isID: boolean) {
  return (
    getText(
      isID,
      pkg.paymentDescription,
      pkg.paymentDescriptionEn,
      ""
    ) ||
    getText(isID, pkg.description, pkg.descriptionEn, "")
  );
}

function getBadge(pkg: PackageItem, isID: boolean) {
  return getText(isID, pkg.badge, pkg.badgeEn, "");
}

function durationLabel(days?: number, isID?: boolean) {
  if (!days) return isID ? "Durasi fleksibel" : "Flexible duration";
  if (days === 30) return isID ? "30 hari" : "30 days";
  if (days === 365) return isID ? "1 tahun" : "1 year";
  return isID ? `${days} hari` : `${days} days`;
}

function listingLabel(count?: number, isID?: boolean) {
  if (!count) return isID ? "Sesuai paket" : "Based on package";
  return isID ? `${count} listing aktif` : `${count} active listings`;
}

function SectionPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#D9D9DE] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280] shadow-sm">
      {children}
    </span>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-3 py-3 text-center text-sm font-semibold transition sm:px-4 sm:py-4 sm:text-base",
        active
          ? "border-[#0F172A] bg-[#0F172A] text-white shadow-[0_16px_32px_rgba(15,23,42,0.16)]"
          : "border-[#D9D9DE] bg-white text-[#111827] hover:bg-[#FAFAFB]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function InfoCard({
  eyebrow,
  title,
  description,
  tone = "amber",
}: {
  eyebrow: string;
  title: string;
  description: string;
  tone?: "amber" | "emerald";
}) {
  const toneClass =
    tone === "amber"
      ? "border-[#F2D67A] bg-[linear-gradient(180deg,#FFFDF6_0%,#FFFFFF_100%)]"
      : "border-[#9EECCF] bg-[linear-gradient(180deg,#F5FFFB_0%,#FFFFFF_100%)]";

  const eyebrowClass = tone === "amber" ? "text-[#B45309]" : "text-[#047857]";

  return (
    <div
      className={`rounded-[28px] border p-5 sm:p-6 ${toneClass}`}
    >
      <p className={`text-sm font-semibold ${eyebrowClass}`}>{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-bold leading-tight text-[#111827] sm:text-3xl">
        {title}
      </h3>
      <p className="mt-4 text-sm leading-7 text-[#6B7280] sm:text-base">
        {description}
      </p>
    </div>
  );
}

function FeatureRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#ECECF1] py-3 last:border-b-0">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span className="text-right text-sm font-semibold text-[#111827]">
        {value}
      </span>
    </div>
  );
}

function PackageCard({
  pkg,
  isID,
  type,
}: {
  pkg: PackageItem;
  isID: boolean;
  type: "owner" | "agent";
}) {
  const name = getText(isID, pkg.name, pkg.nameEn, "Package");
  const desc = getDescription(pkg, isID);
  const badge = getBadge(pkg, isID);
  const billingNote = getText(
    isID,
    pkg.billingNote,
    pkg.billingNoteEn,
    ""
  );

  const primaryHref =
    type === "owner" ? "/signup?role=owner" : "/signup?role=agent";

  const primaryLabel =
    type === "owner"
      ? isID
        ? "Pilih Paket Owner"
        : "Choose Owner Package"
      : isID
      ? "Pilih Paket Agent"
      : "Choose Agent Package";

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-[#E8E8ED] bg-white p-5 shadow-[0_16px_40px_rgba(17,24,39,0.06)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {badge ? (
            <div className="mb-3 inline-flex rounded-full border border-[#E7E7EA] bg-[#F8F8FA] px-3 py-1 text-xs font-semibold text-[#4B5563]">
              {badge}
            </div>
          ) : null}

          <h3 className="text-xl font-bold text-[#111827] sm:text-2xl">
            {name}
          </h3>

          {desc ? (
            <p className="mt-3 text-sm leading-7 text-[#6B7280] sm:text-base">
              {desc}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-[22px] border border-[#EFEFF3] bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_100%)] p-4">
        <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#8A8A93]">
          {isID ? "Harga Paket" : "Package Price"}
        </div>
        <div className="mt-2 text-3xl font-black tracking-tight text-[#0F172A] sm:text-4xl">
          {formatIdr(pkg.priceIdr)}
        </div>
        {billingNote ? (
          <p className="mt-2 text-sm text-[#6B7280]">{billingNote}</p>
        ) : null}
      </div>

      <div className="mt-6 rounded-[22px] border border-[#ECECF1] bg-[#FCFCFD] px-4">
        <FeatureRow
          label={isID ? "Durasi" : "Duration"}
          value={durationLabel(pkg.durationDays, isID)}
        />
        <FeatureRow
          label={isID ? "Kapasitas" : "Capacity"}
          value={listingLabel(pkg.maxListings, isID)}
        />
        <FeatureRow
          label={isID ? "Renewal" : "Renewal"}
          value={
            pkg.renewable
              ? isID
                ? "Tersedia"
                : "Available"
              : isID
              ? "Tidak"
              : "No"
          }
        />
        {pkg.isFeatured ? (
          <FeatureRow
            label={isID ? "Featured" : "Featured"}
            value={
              pkg.featuredDurationDays
                ? isID
                  ? `${pkg.featuredDurationDays} hari`
                  : `${pkg.featuredDurationDays} days`
                : isID
                ? "Ya"
                : "Yes"
            }
          />
        ) : null}
      </div>

      <ul className="mt-6 space-y-3">
        <li className="flex items-start gap-3 text-sm text-[#374151]">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
          <span>
            {type === "owner"
              ? isID
                ? "Cocok untuk pemilik yang ingin memasarkan propertinya dengan lebih baik."
                : "Suitable for owners who want to market their property more effectively."
              : isID
              ? "Cocok untuk agent yang ingin mengelola listing dan lead lebih profesional."
              : "Suitable for agents who want to manage listings and leads more professionally."}
          </span>
        </li>

        <li className="flex items-start gap-3 text-sm text-[#374151]">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
          <span>
            {type === "owner"
              ? isID
                ? "Dirancang untuk meningkatkan visibilitas listing."
                : "Designed to improve your listing visibility."
              : isID
              ? "Dirancang untuk mendukung pertumbuhan listing aktif."
              : "Designed to support active listing growth."}
          </span>
        </li>
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center rounded-2xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
        >
          {primaryLabel}
        </Link>

        <Link
          href={type === "owner" ? "/signup?role=owner" : "/signup?role=agent"}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DADAE0] bg-white px-4 py-3 text-sm font-semibold text-[#111827] transition hover:bg-[#FAFAFB]"
        >
          {isID ? "Mulai Sekarang" : "Get Started"}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function PricelistPage() {
  const { lang } = useLanguage();
  const isID = lang === "id";
  const [activeTab, setActiveTab] = useState<"owner" | "agent">("owner");

  const ownerPackages = OWNER_PACKAGES as PackageItem[];
  const agentPackages = AGENT_PACKAGES as PackageItem[];

  const activePackages = useMemo(() => {
    return activeTab === "owner" ? ownerPackages : agentPackages;
  }, [activeTab, ownerPackages, agentPackages]);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_36%,#F6FFFB_100%)] pb-28 pt-6 sm:pt-8">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-[#E9E5DA] bg-[linear-gradient(135deg,#FFF7EA_0%,#F3FFF9_100%)] shadow-[0_24px_60px_rgba(17,24,39,0.07)]">
          <div className="px-5 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <SectionPill>
              {isID ? "Tetamo Pricelist" : "Tetamo Pricelist"}
            </SectionPill>

            <div className="mt-5 max-w-4xl">
              <h1 className="text-[32px] font-black leading-[1.08] tracking-[-0.03em] text-[#0F172A] sm:text-[42px] lg:text-[56px]">
                {isID
                  ? "Pilih paket terbaik untuk kebutuhan listing Anda"
                  : "Choose the best package for your listing needs"}
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-8 text-[#5F6368] sm:text-lg">
                {isID
                  ? "Dirancang untuk pemilik dan agent yang ingin tampil lebih profesional, lebih menarik, dan memiliki peluang lebih baik untuk mendapatkan lead di Tetamo."
                  : "Designed for owners and agents who want a more professional, more attractive presence and a better chance to generate leads on Tetamo."}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:max-w-xl">
              <ToggleButton
                active={activeTab === "owner"}
                onClick={() => setActiveTab("owner")}
              >
                {isID ? "Paket Owner" : "View Owner Packages"}
              </ToggleButton>

              <ToggleButton
                active={activeTab === "agent"}
                onClick={() => setActiveTab("agent")}
              >
                {isID ? "Paket Agent" : "View Agent Packages"}
              </ToggleButton>
            </div>
          </div>
        </section>

        <section className="mt-8 sm:mt-10">
          {activeTab === "owner" ? (
            <InfoCard
              eyebrow={isID ? "Rekomendasi Owner" : "Owner Recommendation"}
              title={
                isID
                  ? "Pilih visibilitas yang lebih kuat untuk listing Anda"
                  : "Choose stronger visibility for your listing"
              }
              description={
                isID
                  ? "Jika Anda ingin unit Anda lebih menonjol, pilih paket yang memberi exposure lebih kuat."
                  : "If you want your unit to stand out more, choose the package with stronger exposure."
              }
              tone="amber"
            />
          ) : (
            <InfoCard
              eyebrow={isID ? "Rekomendasi Agent" : "Agent Recommendation"}
              title={
                isID
                  ? "Mulai dari paket yang paling seimbang"
                  : "Start from the most balanced plan"
              }
              description={
                isID
                  ? "Untuk agent, paket yang seimbang biasanya menjadi cara paling praktis untuk bertumbuh secara stabil."
                  : "For agents, a balanced package is usually the most practical way to grow steadily."
              }
              tone="emerald"
            />
          )}
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#111827]" />
            <h2 className="text-2xl font-bold text-[#111827] sm:text-3xl">
              {activeTab === "owner"
                ? isID
                  ? "Paket Owner"
                  : "Owner Packages"
                : isID
                ? "Paket Agent"
                : "Agent Packages"}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activePackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                isID={isID}
                type={activeTab}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}