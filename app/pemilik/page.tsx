"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  MessageCircle,
  CalendarCheck,
  Tag,
  Crown,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { OWNER_PACKAGES } from "../data/pricelist";
import { useLanguage } from "@/app/context/LanguageContext";

export default function PemilikPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const featuredOwnerPlanId =
    OWNER_PACKAGES.find((pkg) => pkg.id === "featured")?.id ??
    OWNER_PACKAGES[0]?.id ??
    "basic";

  const [selectedPlan, setSelectedPlan] = useState<string>(featuredOwnerPlanId);

  const selectedPackage = useMemo(() => {
    return (
      OWNER_PACKAGES.find((pkg) => pkg.id === selectedPlan) ??
      OWNER_PACKAGES[0]
    );
  }, [selectedPlan]);

  const BENEFITS = [
    {
      icon: Store,
      title:
        lang === "id" ? "Tampil di Marketplace" : "Appear in the Marketplace",
      desc:
        lang === "id"
          ? "Properti Anda tampil di marketplace Tetamo dan lebih mudah ditemukan pembeli atau penyewa serius."
          : "Your property appears on Tetamo’s marketplace and is easier for serious buyers or renters to discover.",
    },
    {
      icon: MessageCircle,
      title:
        lang === "id"
          ? "Kontak Langsung WhatsApp"
          : "Direct WhatsApp Contact",
      desc:
        lang === "id"
          ? "Calon pembeli atau penyewa bisa langsung menghubungi Anda tanpa proses yang rumit."
          : "Buyers and renters can contact you directly without a complicated process.",
    },
    {
      icon: CalendarCheck,
      title:
        lang === "id"
          ? "Jadwal Viewing Lebih Rapi"
          : "Better Viewing Scheduling",
      desc:
        lang === "id"
          ? "Proses viewing lebih rapi dan memudahkan calon buyer melihat properti Anda."
          : "Viewing is more organized and makes it easier for potential buyers to visit your property.",
    },
  ];

  const translateFeature = (feature: string) => {
    if (lang === "id") return feature;

    const map: Record<string, string> = {
      "1 Listing Aktif": "1 Active Listing",
      "Durasi aktif 60 hari": "Active for 60 days",
      "Direct WhatsApp (Buyer/Renter contact langsung)":
        "Direct WhatsApp (Buyer/Renter contact directly)",
      "Tampil di Tetamo Marketplace & App":
        "Visible on Tetamo Marketplace & App",
      "Jadwal Scheduling Viewing": "Viewing Scheduling",
      "Auto renew aktif secara default": "Auto renew enabled by default",
      "Listing aktif total 60 hari": "Listing active for 60 days",
      "Featured / highlighted selama 30 hari":
        "Featured / highlighted for 30 days",
      "Posting di Social Media (FB / IG / TikTok)":
        "Posted on Social Media (FB / IG / TikTok)",
      "Verification Badge": "Verification Badge",
      "Tetamo Agent Support": "Tetamo Agent Support",
    };

    return map[feature] ?? feature;
  };

  const ownerPackageIntro = (packageId: string) => {
    if (packageId === "featured") {
      return lang === "id"
        ? "Pilihan terbaik untuk pemilik yang ingin listing lebih menonjol dan visibilitas lebih kuat."
        : "Best for owners who want stronger visibility and a more prominent listing.";
    }

    return lang === "id"
      ? "Pilihan sederhana untuk mulai memasang properti Anda di Tetamo."
      : "A simple option to start listing your property on Tetamo.";
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#FFFDF8_0%,#FFFFFF_42%,#F7FCFA_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="overflow-hidden rounded-[30px] border border-[#E9E5DA] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="relative px-4 py-7 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.98),rgba(255,255,255,1))]" />

            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8EC] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {lang === "id" ? "Owner Listing" : "Owner Listing"}
              </div>

              <h1 className="mt-4 text-2xl font-black tracking-tight text-[#111827] sm:text-3xl lg:text-4xl">
                {lang === "id"
                  ? "Iklankan, Sewakan, atau Jual Properti Anda di Tetamo"
                  : "Advertise, Rent, or Sell Your Property on Tetamo"}
              </h1>

              <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
                {lang === "id"
                  ? "Marketplace properti yang fokus pada transparansi, listing serius, dan proses viewing yang lebih rapi."
                  : "A property marketplace focused on transparency, serious listings, and a better viewing process."}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 sm:mt-8">
          <div className="grid gap-4 md:grid-cols-3">
            {BENEFITS.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-[26px] border border-[#E7E7EA] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-[linear-gradient(180deg,#FAFAFA_0%,#F2F2F3_100%)] shadow-sm">
                      <Icon className="h-5 w-5 text-[#1C1C1E]" />
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs leading-6 text-gray-600 sm:text-sm">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 sm:mt-12">
          <div className="text-center">
            <h2 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
              {lang === "id" ? "Pilih Paket Anda" : "Choose Your Package"}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Pilih paket pemilik yang paling sesuai. Paket Featured dibuat lebih menonjol untuk membantu properti Anda tampil lebih kuat."
                : "Choose the owner package that fits you best. Featured is designed to help your property stand out more strongly."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {OWNER_PACKAGES.map((pkg) => {
              const checked = selectedPlan === pkg.id;
              const isFeatured = pkg.id === "featured";

              return (
                <div
                  key={pkg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPlan(pkg.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPlan(pkg.id);
                    }
                  }}
                  className={[
                    "relative overflow-hidden rounded-[28px] border p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] transition-all duration-300 sm:p-5 cursor-pointer",
                    isFeatured
                      ? "border-amber-300 bg-[linear-gradient(180deg,#FFF9E8_0%,#FFFFFF_100%)] shadow-[0_24px_60px_rgba(245,158,11,0.18)]"
                      : "border-gray-200 bg-white",
                    checked
                      ? isFeatured
                        ? "ring-1 ring-amber-400"
                        : "ring-1 ring-[#111827]"
                      : "hover:border-gray-300 hover:-translate-y-0.5",
                  ].join(" ")}
                  aria-label={pkg.name}
                >
                  {isFeatured ? (
                    <>
                      <div className="pointer-events-none absolute -left-10 top-0 h-32 w-32 rounded-full bg-amber-300/30 blur-3xl" />
                      <div className="pointer-events-none absolute -right-8 bottom-8 h-28 w-28 rounded-full bg-yellow-200/30 blur-3xl" />
                    </>
                  ) : null}

                  <div className="relative z-10 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isFeatured ? (
                          <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                        ) : (
                          <Tag className="h-4 w-4 shrink-0 text-gray-500" />
                        )}
                        <h3 className="text-xl font-semibold leading-tight text-[#1C1C1E] sm:text-2xl">
                          {pkg.name}
                        </h3>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-gray-600 sm:text-sm sm:leading-6">
                        {ownerPackageIntro(pkg.id)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <div
                        className={[
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition sm:h-6 sm:w-6",
                          checked
                            ? isFeatured
                              ? "border-amber-600 bg-amber-600"
                              : "border-[#1C1C1E] bg-[#1C1C1E]"
                            : "border-gray-400 bg-white",
                        ].join(" ")}
                      >
                        {checked ? (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </div>

                      {isFeatured ? (
                        <div className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)] sm:px-3 sm:text-[11px]">
                          {lang === "id" ? "Rekomendasi" : "Recommended"}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative z-10 mt-5">
                    <div
                      className={`text-[30px] font-bold leading-none tracking-tight sm:text-[36px] ${
                        isFeatured ? "text-amber-700" : "text-[#111827]"
                      }`}
                    >
                      Rp {pkg.priceIdr.toLocaleString("id-ID")}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 sm:text-base">
                      / {pkg.durationDays} {lang === "id" ? "hari" : "days"}
                    </div>
                  </div>

                  <ul className="relative z-10 mt-5 space-y-2.5 text-gray-700">
                    {(pkg.features ?? []).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span
                          className={`mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                            isFeatured
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          ✓
                        </span>
                        <span className="text-xs leading-5 sm:text-sm sm:leading-6">
                          {translateFeature(feature)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="relative z-10 mt-5">
                    <Link
                      href={`/pemilik/iklan?plan=${pkg.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={[
                        "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition sm:w-auto",
                        isFeatured
                          ? "bg-amber-500 shadow-[0_14px_35px_-18px_rgba(245,158,11,0.75)] hover:bg-amber-600"
                          : "bg-[#1C1C1E] hover:opacity-95",
                      ].join(" ")}
                    >
                      {lang === "id" ? "Lanjut Iklan" : "List Now"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="rounded-[28px] border border-[#E7E7EA] bg-white p-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)] sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8EC] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6B7280] shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  {lang === "id" ? "Paket Terpilih" : "Selected Package"}
                </div>

                <h3 className="mt-3 text-lg font-bold text-[#1C1C1E] sm:text-xl">
                  {selectedPackage?.name || "-"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {selectedPackage
                    ? ownerPackageIntro(selectedPackage.id)
                    : ""}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(selectedPackage?.features ?? []).slice(0, 3).map((feature, idx) => (
                    <span
                      key={`${feature}-${idx}`}
                      className="rounded-full border border-gray-200 bg-[#FAFAFA] px-3 py-1.5 text-[11px] font-medium text-[#1C1C1E] sm:text-xs"
                    >
                      {translateFeature(feature)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#ECECF1] bg-[linear-gradient(180deg,#FAFAFB_0%,#FFFFFF_100%)] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  {lang === "id" ? "Ringkasan Paket" : "Package Summary"}
                </div>

                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <span className="text-sm text-gray-500">
                      {lang === "id" ? "Paket" : "Package"}
                    </span>
                    <span className="text-sm font-semibold text-[#1C1C1E]">
                      {selectedPackage?.name || "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <span className="text-sm text-gray-500">
                      {lang === "id" ? "Harga" : "Price"}
                    </span>
                    <span className="text-sm font-semibold text-[#1C1C1E]">
                      {selectedPackage
                        ? `Rp ${selectedPackage.priceIdr.toLocaleString("id-ID")}`
                        : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-500">
                      {lang === "id" ? "Durasi" : "Duration"}
                    </span>
                    <span className="text-sm font-semibold text-[#1C1C1E]">
                      {selectedPackage
                        ? `${selectedPackage.durationDays} ${
                            lang === "id" ? "hari" : "days"
                          }`
                        : "-"}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/pemilik/iklan?plan=${selectedPlan}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                  >
                    {lang === "id" ? "Pilih Paket Ini" : "Choose This Package"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 sm:mt-10">
          <div className="rounded-[28px] border border-gray-200 bg-[linear-gradient(180deg,#FAFAFA_0%,#FFFFFF_100%)] p-5 sm:p-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
                {lang === "id"
                  ? "Siap Iklankan Properti Anda?"
                  : "Ready to List Your Property?"}
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                {lang === "id"
                  ? "Buat listing yang rapi, transparan, dan lebih mudah ditemukan pembeli atau penyewa serius."
                  : "Create a clean, transparent listing that serious buyers and renters can discover more easily."}
              </p>

              <div className="mt-5 flex flex-col justify-center gap-3 sm:mt-6 sm:flex-row">
                <Link
                  href={`/pemilik/iklan?plan=${selectedPlan}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  {lang === "id" ? "Mulai Listing" : "Start Listing"}
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => router.push("/properti")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                >
                  <Store className="h-4 w-4" />
                  {lang === "id" ? "Lihat Marketplace" : "View Marketplace"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}