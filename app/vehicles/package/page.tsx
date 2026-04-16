"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CarFront,
  Bike,
  MessageCircle,
  CalendarCheck,
  BadgeCheck,
  Tag,
  Crown,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

type VehiclePackage = {
  id: "basic" | "featured";
  nameId: string;
  nameEn: string;
  priceIdr: number;
  durationDays: number;
  featuredDays?: number;
  featuresId: string[];
  featuresEn: string[];
};

const VEHICLE_PACKAGES: VehiclePackage[] = [
  {
    id: "basic",
    nameId: "Basic Listing",
    nameEn: "Basic Listing",
    priceIdr: 80000,
    durationDays: 90,
    featuresId: [
      "1 Listing Aktif",
      "Durasi aktif 90 hari",
      "Tampil di Tetamo Vehicle Marketplace",
      "Direct WhatsApp",
      "Owner Page / Dashboard",
      "Leads masuk ke owner",
      "Jadwal viewing / test drive / test ride",
      "Edit & kelola listing",
      "Invoice / receipt / riwayat pembayaran",
    ],
    featuresEn: [
      "1 Active Listing",
      "Active for 90 days",
      "Visible on Tetamo Vehicle Marketplace",
      "Direct WhatsApp",
      "Owner Page / Dashboard",
      "Leads go directly to owner",
      "Viewing / test drive / test ride scheduling",
      "Edit & manage listing",
      "Invoice / receipt / payment history",
    ],
  },
  {
    id: "featured",
    nameId: "Featured Listing",
    nameEn: "Featured Listing",
    priceIdr: 250000,
    durationDays: 90,
    featuredDays: 30,
    featuresId: [
      "1 Listing Aktif",
      "Durasi aktif 90 hari",
      "Featured / highlighted selama 30 hari",
      "Prioritas posisi lebih tinggi di marketplace",
      "Tampil di Tetamo Vehicle Marketplace",
      "Direct WhatsApp",
      "Owner Page / Dashboard",
      "Leads masuk ke owner",
      "Jadwal viewing / test drive / test ride",
      "Edit & kelola listing",
      "Invoice / receipt / riwayat pembayaran",
    ],
    featuresEn: [
      "1 Active Listing",
      "Active for 90 days",
      "Featured / highlighted for 30 days",
      "Higher placement priority in marketplace",
      "Visible on Tetamo Vehicle Marketplace",
      "Direct WhatsApp",
      "Owner Page / Dashboard",
      "Leads go directly to owner",
      "Viewing / test drive / test ride scheduling",
      "Edit & manage listing",
      "Invoice / receipt / payment history",
    ],
  },
];

export default function VehiclePackagePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isID = lang === "id";

  const featuredPackageId =
    VEHICLE_PACKAGES.find((pkg) => pkg.id === "featured")?.id ?? "basic";

  const [selectedPlan, setSelectedPlan] =
    useState<VehiclePackage["id"]>(featuredPackageId);

  const benefits = [
    {
      icon: CarFront,
      title: isID ? "Untuk Mobil" : "For Cars",
      desc: isID
        ? "Owner bisa listing mobil dengan dashboard, leads, dan schedule yang rapi."
        : "Owners can list cars with a clean dashboard, leads, and scheduling flow.",
    },
    {
      icon: Bike,
      title: isID ? "Untuk Motor" : "For Motorbikes",
      desc: isID
        ? "Owner juga bisa listing motor dengan flow yang sama."
        : "Owners can also list motorbikes with the same flow.",
    },
    {
      icon: MessageCircle,
      title: isID ? "Kontak Langsung" : "Direct Contact",
      desc: isID
        ? "Buyer bisa langsung hubungi owner lewat WhatsApp."
        : "Buyers can contact the owner directly through WhatsApp.",
    },
    {
      icon: CalendarCheck,
      title: isID ? "Jadwal Lebih Rapi" : "Better Scheduling",
      desc: isID
        ? "Schedule viewing, test drive, dan test ride lebih teratur."
        : "Viewing, test drive, and test ride schedules stay more organized.",
    },
  ];

  const packageIntro = (packageId: VehiclePackage["id"]) => {
    if (packageId === "featured") {
      return isID
        ? "Pilihan terbaik untuk owner yang ingin listing kendaraannya lebih menonjol."
        : "Best for owners who want their vehicle listing to stand out more.";
    }

    return isID
      ? "Pilihan sederhana untuk mulai listing kendaraan Anda di Tetamo."
      : "A simple option to start listing your vehicle on Tetamo.";
  };

  const featuresFor = (pkg: VehiclePackage) =>
    isID ? pkg.featuresId : pkg.featuresEn;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="text-center">
          <h1 className="text-2xl font-bold leading-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
            {isID
              ? "Pilih Paket Listing Kendaraan Anda di Tetamo"
              : "Choose Your Vehicle Listing Package on Tetamo"}
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
            {isID
              ? "Listing mobil atau motor Anda dengan paket yang jelas, sederhana, dan sudah termasuk dashboard owner, leads, dan schedule."
              : "List your car or motorbike with a clear and simple package that already includes the owner dashboard, leads, and scheduling."}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {benefits.map((item) => {
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
              {isID ? "Pilih Paket Anda" : "Choose Your Package"}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              {isID
                ? "Basic cocok untuk listing normal. Featured cocok untuk exposure yang lebih kuat selama 30 hari pertama."
                : "Basic is suitable for a normal listing. Featured is suitable for stronger exposure during the first 30 days."}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:gap-6">
            {VEHICLE_PACKAGES.map((pkg) => {
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
                    "relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition-all duration-300 sm:p-6 lg:p-7 cursor-pointer",
                    isFeatured
                      ? "border-blue-200 bg-gradient-to-br from-white via-blue-50/80 to-white shadow-[0_24px_70px_-30px_rgba(59,130,246,0.45)]"
                      : "border-gray-200",
                    checked
                      ? isFeatured
                        ? "ring-2 ring-blue-400/70"
                        : "ring-2 ring-[#1C1C1E]/80"
                      : "hover:-translate-y-1 hover:shadow-md",
                  ].join(" ")}
                  aria-label={isID ? pkg.nameId : pkg.nameEn}
                >
                  {isFeatured ? (
                    <>
                      <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-blue-400/25 blur-3xl" />
                      <div className="pointer-events-none absolute -left-10 bottom-8 h-24 w-24 rounded-full bg-sky-300/20 blur-3xl" />

                      <div className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white shadow-sm sm:text-xs">
                        <Sparkles className="h-3.5 w-3.5" />
                        {isID ? "Rekomendasi" : "Recommended"}
                      </div>
                    </>
                  ) : null}

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
                            {isID ? pkg.nameId : pkg.nameEn}
                          </h3>
                        </div>

                        <p className="mt-2 text-xs leading-6 text-gray-600 sm:text-sm">
                          {packageIntro(pkg.id)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlan(pkg.id);
                        }}
                        className={[
                          "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 sm:h-6 sm:w-6",
                          checked
                            ? isFeatured
                              ? "border-blue-600 bg-blue-600"
                              : "border-[#1C1C1E] bg-[#1C1C1E]"
                            : "border-gray-400 bg-white",
                        ].join(" ")}
                        aria-label={`Select ${isID ? pkg.nameId : pkg.nameEn}`}
                      >
                        {checked ? (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </button>
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
                        / {pkg.durationDays} {isID ? "hari" : "days"}
                      </div>

                      {pkg.featuredDays ? (
                        <div className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {isID
                            ? `Featured ${pkg.featuredDays} hari`
                            : `Featured ${pkg.featuredDays} days`}
                        </div>
                      ) : null}
                    </div>

                    <ul className="mt-6 space-y-3 text-gray-700">
                      {featuresFor(pkg).map((feature, idx) => {
                        const showBlue = isFeatured;
                        return (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span
                              className={[
                                "mt-0.5 text-sm",
                                showBlue ? "text-blue-600" : "text-green-600",
                              ].join(" ")}
                            >
                              ✅
                            </span>
                            <span className="text-sm leading-6 sm:text-[15px]">
                              {feature}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="mt-6">
                      <Link
                        href={`/vehicles/create?plan=${pkg.id}`}
                        className={[
                          "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition sm:w-auto",
                          isFeatured
                            ? "bg-blue-600 shadow-[0_14px_35px_-18px_rgba(37,99,235,0.75)] hover:bg-blue-700"
                            : "bg-[#1C1C1E] hover:opacity-90",
                        ].join(" ")}
                      >
                        {isID ? "Lanjut Listing" : "List Now"}
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
              {isID ? "Yang Sudah Termasuk" : "What’s Already Included"}
            </h3>

            <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-left">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4 text-[#1C1C1E]" />
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    {isID ? "Owner Dashboard" : "Owner Dashboard"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isID
                    ? "Owner tetap punya halaman sendiri untuk lihat status listing."
                    : "Owners still get their own page to see listing status."}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-left">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#1C1C1E]" />
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    {isID ? "Leads Masuk" : "Incoming Leads"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isID
                    ? "Buyer inquiry tetap masuk ke owner."
                    : "Buyer inquiries still go directly to the owner."}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-left">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-[#1C1C1E]" />
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    {isID ? "Schedule" : "Schedule"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isID
                    ? "Test drive, test ride, atau viewing tetap bisa diterima."
                    : "Test drive, test ride, or viewing requests can still be received."}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-left">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#1C1C1E]" />
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    {isID ? "Invoice & Receipt" : "Invoice & Receipt"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isID
                    ? "Riwayat pembayaran tetap tersimpan."
                    : "Payment history remains saved."}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-left">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#1C1C1E]" />
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    {isID ? "Kelola Listing" : "Manage Listing"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isID
                    ? "Owner bisa edit dan update listing."
                    : "Owners can edit and update their listing."}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#1C1C1E]" />
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    {isID ? "Featured Logic" : "Featured Logic"}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {isID
                    ? "Featured aktif 30 hari, lalu listing tetap normal sampai 90 hari."
                    : "Featured stays active for 30 days, then the listing continues normally until day 90."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-gray-200 bg-gray-50 p-5 sm:mt-14 sm:p-8">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
              {isID
                ? "Siap Listing Kendaraan Anda?"
                : "Ready to List Your Vehicle?"}
            </h3>

            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              {isID
                ? "Mulai dari paket yang sesuai, lalu lanjut ke flow listing kendaraan Anda."
                : "Start with the package that fits you, then continue to your vehicle listing flow."}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-3 sm:mt-6">
              <button
                type="button"
                onClick={() => router.push("/vehicles/car")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                <CarFront className="h-4 w-4" />
                {isID ? "Lihat Mobil" : "View Cars"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/vehicles/motor")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
              >
                <Bike className="h-4 w-4" />
                {isID ? "Lihat Motor" : "View Motorbikes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}