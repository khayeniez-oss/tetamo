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
} from "lucide-react";
import { OWNER_PACKAGES, AGENT_PACKAGES } from "../data/pricelist";
import { useLanguage } from "@/app/context/LanguageContext";

export default function PemilikPage() {
  const router = useRouter();
  const { lang } = useLanguage();

  const defaultPlanId = OWNER_PACKAGES[0]?.id ?? "basic";
  const [selectedPlan, setSelectedPlan] = useState<string>(defaultPlanId);

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
          ? "Sistem jadwal viewing membantu proses lebih teratur (V1: basic, V2: kalender slot otomatis)."
          : "Viewing scheduling keeps the process organized (V1: basic, V2: automatic calendar slots).",
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
      "100 Listing Aktif": "100 Active Listings",
      "Membership aktif selama 1 tahun": "Membership active for 1 year",
      "Membership aktif selama 30 hari": "Membership active for 30 days",
      "Website Profil Agen (Terhubung ke Media Sosial)":
        "Agent Profile Website (Connected to Social Media)",
      "1 AI Avatar Video Perkenalan": "1 AI Avatar Introduction Video",
      "3 Jadwal Viewing ": "3 Viewing Schedules",
      "3 Featured Listing Slot": "3 Featured Listing Slots",
      "Prioritas Lead dari Buyer, WhatsApp Langsung dari Listing ":
        "Priority buyer leads, direct WhatsApp from listing",
      "Optimasi Judul & Deskripsi (SEO Friendly)":
        "Title & Description Optimization (SEO Friendly)",
      "Promosi Featured Listing di Media Sosial TETAMO":
        "Featured Listing Promotion on TETAMO Social Media",
      "Direkomendasikan ke Buyer sesuai Area":
        "Recommended to Buyers by Area",
      "Support Admin 09.00 – 14.00": "Admin Support 09.00 – 14.00",
    };

    return map[feature] ?? feature;
  };

  const agentPackage = AGENT_PACKAGES[0];

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#1C1C1E]">
            {lang === "id"
              ? "Iklan, Sewakan atau Jualkan Properti Anda di Tetamo"
              : "Advertise, Rent, or Sell Your Property on Tetamo"}
          </h1>

          <div className="h-6" />

          <p className="mx-auto mt-4 max-w-3xl text-gray-600">
            {lang === "id"
              ? "Marketplace properti yang fokus pada transparansi, listing serius, dan kemudahan booking viewing — tanpa drama, tanpa spam."
              : "A property marketplace focused on transparency, serious listings, and easy viewings"}
          </p>
        </div>

        <div className="h-10" />

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;

            return (
              <div
                key={b.title}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-xl border border-gray-200 bg-gray-50 p-2">
                    <Icon className="h-5 w-5 text-[#1C1C1E]" />
                  </div>

                  <div>
                    <div className="font-semibold text-[#1C1C1E]">
                      {b.title}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">{b.desc}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-20" />

        <div className="mt-8 mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
          {OWNER_PACKAGES.map((pkg) => {
            const checked = selectedPlan === pkg.id;

            return (
              <div
                key={pkg.id}
                className={`rounded-2xl border bg-white p-7 shadow-sm transition ${
                  checked
                    ? "border-[#1C1C1E]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {pkg.id === "basic" && (
                      <Tag className="h-4 w-4 text-gray-500" />
                    )}
                    {pkg.id === "featured" && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}

                    <h3 className="text-xl font-semibold text-[#1C1C1E]">
                      {pkg.name}
                    </h3>
                  </div>

                  <input
                    type="radio"
                    name="plan"
                    checked={checked}
                    onChange={() => setSelectedPlan(pkg.id)}
                    className="h-4 w-4"
                  />
                </div>

                <div className="mt-6">
                  <div className="text-4xl font-bold text-[#1C1C1E]">
                    Rp {pkg.priceIdr.toLocaleString("id-ID")}
                  </div>
                  <div className="mt-1 text-gray-600">
                    / {pkg.durationDays} {lang === "id" ? "hari" : "days"}
                  </div>
                </div>

                <ul className="mt-6 space-y-3 text-gray-700">
                  {(pkg.features ?? []).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600">✅</span>
                      <span>{translateFeature(feature)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Link
                    href={`/signup?role=owner&plan=${pkg.id}`}
                    className="inline-block rounded-lg bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    {lang === "id" ? "Lanjut Iklan" : "List Now"}
                  </Link>
                </div>
              </div>
            );
          })}

          {agentPackage && (
            <div className="rounded-2xl border border-gray-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <h3 className="text-xl font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Agen Properti" : "Property Agent"}
                </h3>
              </div>

              <div className="mt-6">
                <div className="text-4xl font-bold text-[#1C1C1E]">
                  Rp {agentPackage.priceIdr.toLocaleString("id-ID")}
                </div>
              </div>

              <ul className="mt-6 space-y-3 text-gray-700">
                {(agentPackage.features ?? []).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600">✅</span>
                    <span>{translateFeature(feature)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <Link
  href={`/signup?role=agent&package=${agentPackage.id}&from=agent-button&next=/agentdashboard/paket`}
  className="inline-block rounded-lg bg-[#1C1C1E] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
>
  {lang === "id" ? "Daftar Agen" : "Register as Agent"}
</Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-16" />

        <div className="mt-10 mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-gray-50 p-8">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-[#1C1C1E]">
              {lang === "id"
                ? "Siap Iklankan Properti Anda?"
                : "Ready to List Your Property?"}
            </h3>

            <p className="mt-2 text-gray-600">
              {lang === "id"
                ? "Buat listing yang rapi, transparan, dan mudah ditemukan pembeli/penyewa serius."
                : "Create a clean, transparent listing that serious buyers and renters can easily discover."}
            </p>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => router.push("/properti")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-6 py-3 font-semibold text-white transition hover:opacity-90"
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