"use client";

import Link from "next/link";
import { useState } from "react";
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

  const BENEFITS = [
    {
      icon: Store,
      title:
        lang === "id" ? "Tampil di Marketplace" : "Appear in the Marketplace",
      desc:
        lang === "id"
          ? "Properti Anda muncul di halaman properti Tetamo dan bisa ditemukan pembeli/penyewa serius."
          : "Your property appears on Tetamo’s marketplace where serious buyers or renters can discover it.",
    },
    {
      icon: MessageCircle,
      title:
        lang === "id"
          ? "Kontak Langsung WhatsApp"
          : "Direct WhatsApp Contact",
      desc:
        lang === "id"
          ? "Pembeli/penyewa bisa kontak Anda langsung. Anda tetap pegang kendali."
          : "Buyers and renters can contact you directly via WhatsApp. You stay in control.",
    },
    {
      icon: CalendarCheck,
      title:
        lang === "id"
          ? "Jadwal Viewing Lebih Rapi"
          : "Better Viewing Scheduling",
      desc:
        lang === "id"
          ? "Sistem jadwal viewing membantu proses lebih teratur dan memudahkan buyer melihat properti Anda."
          : "Viewing scheduling keeps the process organized and makes it easier for buyers to view your property.",
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
        ? "Pilihan terbaik untuk pemilik yang ingin visibilitas lebih tinggi dan listing lebih menonjol."
        : "Best for owners who want stronger visibility and a more prominent listing.";
    }

    return lang === "id"
      ? "Pilihan sederhana untuk mulai memasang properti Anda di Tetamo."
      : "A simple option to start listing your property on Tetamo.";
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="text-center">
          <h1 className="text-2xl font-bold leading-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
            {lang === "id"
              ? "Iklankan, Sewakan, atau Jual Properti Anda di Tetamo"
              : "Advertise, Rent, or Sell Your Property on Tetamo"}
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
            {lang === "id"
              ? "Marketplace properti yang fokus pada transparansi, listing serius, dan kemudahan booking viewing — tanpa drama, tanpa spam."
              : "A property marketplace focused on transparency, serious listings, and easy viewing bookings."}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-3 lg:gap-6">
          {BENEFITS.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 lg:p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-2.5">
                    <Icon className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-[#1C1C1E] sm:text-base lg:text-[17px]">
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

        <div className="mt-12 sm:mt-14 lg:mt-16">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
              {lang === "id" ? "Pilih Paket Anda" : "Choose Your Package"}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Pilih paket pemilik yang paling sesuai. Paket Featured dibuat lebih menonjol untuk membantu properti Anda tampil lebih kuat."
                : "Choose the owner package that fits you best. Featured is designed to help your property stand out more strongly."}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
            {OWNER_PACKAGES.map((pkg) => {
              const checked = selectedPlan === pkg.id;
              const isFeatured = pkg.id === "featured";

              return (
                <div
                  key={pkg.id}
                  className={[
                    "relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition-all duration-300 sm:p-6 lg:p-7",
                    isFeatured
                      ? "border-blue-200 bg-gradient-to-br from-white via-blue-50/80 to-white shadow-[0_24px_70px_-30px_rgba(59,130,246,0.45)]"
                      : "border-gray-200",
                    checked
                      ? isFeatured
                        ? "ring-2 ring-blue-400/70"
                        : "ring-2 ring-[#1C1C1E]/80"
                      : "hover:-translate-y-1 hover:shadow-md",
                  ].join(" ")}
                >
                  {isFeatured ? (
                    <>
                      <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-blue-400/25 blur-3xl" />
                      <div className="pointer-events-none absolute -left-10 bottom-8 h-24 w-24 rounded-full bg-sky-300/20 blur-3xl" />

                      <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:text-xs">
                        <Sparkles className="h-3.5 w-3.5" />
                        {lang === "id" ? "Rekomendasi" : "Recommended"}
                      </div>
                    </>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setSelectedPlan(pkg.id)}
                    className="absolute inset-0 z-0"
                    aria-label={pkg.name}
                  />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 pr-12">
                        <div className="flex items-center gap-2">
                          {isFeatured ? (
                            <Crown className="h-4 w-4 shrink-0 text-blue-600" />
                          ) : (
                            <Tag className="h-4 w-4 shrink-0 text-gray-500" />
                          )}

                          <h3 className="text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                            {pkg.name}
                          </h3>
                        </div>

                        <p className="mt-2 text-xs leading-6 text-gray-600 sm:text-sm">
                          {ownerPackageIntro(pkg.id)}
                        </p>
                      </div>

                      <div
                        className={[
                          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 sm:h-6 sm:w-6",
                          checked
                            ? isFeatured
                              ? "border-blue-600 bg-blue-600"
                              : "border-[#1C1C1E] bg-[#1C1C1E]"
                            : "border-gray-400 bg-white",
                        ].join(" ")}
                      >
                        {checked ? (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6">
                      <div
                        className={[
                          "text-3xl font-bold leading-tight tracking-tight sm:text-4xl",
                          isFeatured ? "text-blue-700" : "text-[#1C1C1E]",
                        ].join(" ")}
                      >
                        Rp {pkg.priceIdr.toLocaleString("id-ID")}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 sm:text-base">
                        / {pkg.durationDays} {lang === "id" ? "hari" : "days"}
                      </div>
                    </div>

                    <ul className="mt-6 space-y-3 text-gray-700">
                      {(pkg.features ?? []).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span
                            className={[
                              "mt-0.5 text-sm",
                              isFeatured ? "text-blue-600" : "text-green-600",
                            ].join(" ")}
                          >
                            ✅
                          </span>
                          <span className="text-sm leading-6 sm:text-[15px]">
                            {translateFeature(feature)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-6">
                      <Link
                        href={`/pemilik/iklan?plan=${pkg.id}`}
                        className={[
                          "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition sm:w-auto",
                          isFeatured
                            ? "bg-blue-600 shadow-[0_14px_35px_-18px_rgba(37,99,235,0.75)] hover:bg-blue-700"
                            : "bg-[#1C1C1E] hover:opacity-90",
                        ].join(" ")}
                      >
                        {lang === "id" ? "Lanjut Iklan" : "List Now"}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:mt-14 sm:p-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
              {lang === "id"
                ? "Siap Iklankan Properti Anda?"
                : "Ready to List Your Property?"}
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Buat listing yang rapi, transparan, dan mudah ditemukan pembeli atau penyewa serius."
                : "Create a clean, transparent listing that serious buyers and renters can easily discover."}
            </p>

            <div className="mt-5 flex justify-center sm:mt-6">
              <button
                type="button"
                onClick={() => router.push("/properti")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto sm:px-6"
              >
                <Store className="h-4 w-4" />
                {lang === "id" ? "Lihat Marketplace" : "View Marketplace"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}