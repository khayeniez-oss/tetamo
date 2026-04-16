"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Gem,
  Crown,
  Zap,
  ShieldCheck,
  UserCheck,
  Clock,
  Bookmark,
  Heart,
  Star,
  Search,
  Share2,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";

type SupportedCurrency = "IDR" | "USD" | "AUD";

type MotorListing = {
  verifiedListing: boolean;
  ownerVerified: boolean;
  ownerPendingVerification: boolean;
  dealerVerified: boolean;
  dealerPendingVerification: boolean;
  agentVerified: boolean;
  agentPendingVerification: boolean;

  spotlight?: boolean;
  featured?: boolean;
  boosted?: boolean;

  id: string;
  slug: string;
  kode: string;
  postedDate: string;

  title: string;
  priceValue: number;
  province: string;
  area: string;

  year: string;
  transmission: string;
  fuel: string;
  mileage: string;
  bodyType: string;

  sellerName: string;
  agency: string;
  whatsapp: string;
  images: string[];

  postedByType: "owner" | "dealer" | "agent";
};

type RatingSummary = {
  avg: number;
  count: number;
};

const IDR_PER_USD = 16500;
const IDR_PER_AUD = 12072;

const DUMMY_MOTORS: MotorListing[] = [
  {
    verifiedListing: true,
    ownerVerified: false,
    ownerPendingVerification: false,
    dealerVerified: true,
    dealerPendingVerification: false,
    agentVerified: false,
    agentPendingVerification: false,
    spotlight: true,
    featured: false,
    boosted: false,
    id: "motor-001",
    slug: "yamaha-xmax-connected-2024",
    kode: "MTR-TTM-001",
    postedDate: "16 Apr 2026",
    title: "Yamaha XMAX Connected 2024",
    priceValue: 69000000,
    province: "Bali",
    area: "Denpasar",
    year: "2024",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "3.200 km",
    bodyType: "scooter",
    sellerName: "Tetamo Moto Partner",
    agency: "Tetamo Moto Network",
    whatsapp: "6282230000001",
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "dealer",
  },
  {
    verifiedListing: true,
    ownerVerified: true,
    ownerPendingVerification: false,
    dealerVerified: false,
    dealerPendingVerification: false,
    agentVerified: false,
    agentPendingVerification: false,
    spotlight: false,
    featured: true,
    boosted: false,
    id: "motor-002",
    slug: "honda-adv-160-2024",
    kode: "MTR-TTM-002",
    postedDate: "15 Apr 2026",
    title: "Honda ADV 160 2024",
    priceValue: 42000000,
    province: "Jawa Timur",
    area: "Surabaya",
    year: "2024",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "1.900 km",
    bodyType: "scooter",
    sellerName: "Andre Kurniawan",
    agency: "",
    whatsapp: "6282230000002",
    images: [
      "https://images.unsplash.com/photo-1622185135825-d5fc1d3f1c7d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "owner",
  },
  {
    verifiedListing: true,
    ownerVerified: false,
    ownerPendingVerification: false,
    dealerVerified: true,
    dealerPendingVerification: false,
    agentVerified: false,
    agentPendingVerification: false,
    spotlight: false,
    featured: false,
    boosted: true,
    id: "motor-003",
    slug: "kawasaki-ninja-zx25r-2023",
    kode: "MTR-TTM-003",
    postedDate: "14 Apr 2026",
    title: "Kawasaki Ninja ZX-25R 2023",
    priceValue: 118000000,
    province: "DKI Jakarta",
    area: "Jakarta Selatan",
    year: "2023",
    transmission: "Manual",
    fuel: "Petrol",
    mileage: "7.500 km",
    bodyType: "sport",
    sellerName: "Green Line Motors",
    agency: "Green Line Motors",
    whatsapp: "6282230000003",
    images: [
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "dealer",
  },
  {
    verifiedListing: true,
    ownerVerified: true,
    ownerPendingVerification: false,
    dealerVerified: false,
    dealerPendingVerification: false,
    agentVerified: false,
    agentPendingVerification: false,
    spotlight: false,
    featured: false,
    boosted: false,
    id: "motor-004",
    slug: "vespa-primavera-s-2023",
    kode: "MTR-TTM-004",
    postedDate: "13 Apr 2026",
    title: "Vespa Primavera S 2023",
    priceValue: 51500000,
    province: "Bali",
    area: "Canggu",
    year: "2023",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "4.800 km",
    bodyType: "scooter",
    sellerName: "Melissa Hartono",
    agency: "",
    whatsapp: "6282230000004",
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "owner",
  },
  {
    verifiedListing: true,
    ownerVerified: false,
    ownerPendingVerification: false,
    dealerVerified: false,
    dealerPendingVerification: false,
    agentVerified: true,
    agentPendingVerification: false,
    spotlight: false,
    featured: false,
    boosted: false,
    id: "motor-005",
    slug: "yamaha-mt25-2022",
    kode: "MTR-TTM-005",
    postedDate: "12 Apr 2026",
    title: "Yamaha MT-25 2022",
    priceValue: 56500000,
    province: "Jawa Barat",
    area: "Bandung",
    year: "2022",
    transmission: "Manual",
    fuel: "Petrol",
    mileage: "9.200 km",
    bodyType: "naked",
    sellerName: "Randy Prasetyo",
    agency: "Tetamo Agent Network",
    whatsapp: "6282230000005",
    images: [
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "agent",
  },
  {
    verifiedListing: true,
    ownerVerified: false,
    ownerPendingVerification: false,
    dealerVerified: true,
    dealerPendingVerification: false,
    agentVerified: false,
    agentPendingVerification: false,
    spotlight: false,
    featured: true,
    boosted: false,
    id: "motor-006",
    slug: "honda-pcx-160-2024",
    kode: "MTR-TTM-006",
    postedDate: "11 Apr 2026",
    title: "Honda PCX 160 2024",
    priceValue: 35500000,
    province: "Banten",
    area: "BSD City",
    year: "2024",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "2.100 km",
    bodyType: "scooter",
    sellerName: "City Motohub",
    agency: "City Motohub",
    whatsapp: "6282230000006",
    images: [
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "dealer",
  },
  {
    verifiedListing: false,
    ownerVerified: false,
    ownerPendingVerification: true,
    dealerVerified: false,
    dealerPendingVerification: false,
    agentVerified: false,
    agentPendingVerification: false,
    spotlight: false,
    featured: false,
    boosted: false,
    id: "motor-007",
    slug: "suzuki-vstrom-250sx-2023",
    kode: "MTR-TTM-007",
    postedDate: "10 Apr 2026",
    title: "Suzuki V-Strom 250SX 2023",
    priceValue: 63500000,
    province: "DI Yogyakarta",
    area: "Sleman",
    year: "2023",
    transmission: "Manual",
    fuel: "Petrol",
    mileage: "5.600 km",
    bodyType: "touring",
    sellerName: "Bagas Mahendra",
    agency: "",
    whatsapp: "6282230000007",
    images: [
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "owner",
  },
  {
    verifiedListing: true,
    ownerVerified: false,
    ownerPendingVerification: false,
    dealerVerified: false,
    dealerPendingVerification: false,
    agentVerified: true,
    agentPendingVerification: false,
    spotlight: false,
    featured: false,
    boosted: true,
    id: "motor-008",
    slug: "ktm-duke-390-2022",
    kode: "MTR-TTM-008",
    postedDate: "09 Apr 2026",
    title: "KTM Duke 390 2022",
    priceValue: 89500000,
    province: "DKI Jakarta",
    area: "Jakarta Barat",
    year: "2022",
    transmission: "Manual",
    fuel: "Petrol",
    mileage: "8.300 km",
    bodyType: "naked",
    sellerName: "Jonathan Lim",
    agency: "Tetamo Agent Network",
    whatsapp: "6282230000008",
    images: [
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "agent",
  },
  {
    verifiedListing: true,
    ownerVerified: false,
    ownerPendingVerification: false,
    dealerVerified: true,
    dealerPendingVerification: false,
    agentVerified: false,
    agentPendingVerification: false,
    spotlight: false,
    featured: false,
    boosted: false,
    id: "motor-009",
    slug: "royal-enfield-himalayan-2024",
    kode: "MTR-TTM-009",
    postedDate: "08 Apr 2026",
    title: "Royal Enfield Himalayan 2024",
    priceValue: 148000000,
    province: "Jawa Timur",
    area: "Malang",
    year: "2024",
    transmission: "Manual",
    fuel: "Petrol",
    mileage: "2.700 km",
    bodyType: "touring",
    sellerName: "Adventure Wheels",
    agency: "Adventure Wheels",
    whatsapp: "6282230000009",
    images: [
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    ],
    postedByType: "dealer",
  },
];

function calculateRanking(p: MotorListing) {
  let score = 0;
  if (p.spotlight) score += 1000;
  if (p.featured) score += 500;
  if (p.boosted) score += 200;
  if (p.ownerVerified) score += 20;
  if (p.dealerVerified) score += 15;
  if (p.agentVerified) score += 10;
  if (p.verifiedListing) score += 10;
  return score;
}

function sortByRanking(a: MotorListing, b: MotorListing) {
  const rankDiff = calculateRanking(b) - calculateRanking(a);
  if (rankDiff !== 0) return rankDiff;
  return String(b.id).localeCompare(String(a.id));
}

function formatIdr(value: number | null | undefined) {
  if (typeof value !== "number") return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUsd(value: number | null | undefined) {
  if (typeof value !== "number") return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / IDR_PER_USD);
}

function formatAud(value: number | null | undefined) {
  if (typeof value !== "number") return "A$0";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(value / IDR_PER_AUD);
}

function formatPriceByCurrency(
  value: number | null | undefined,
  currency: SupportedCurrency
) {
  if (currency === "USD") return formatUsd(value);
  if (currency === "AUD") return formatAud(value);
  return formatIdr(value);
}

function formatSecondaryPrice(
  value: number | null | undefined,
  currency: SupportedCurrency
) {
  if (currency === "USD" || currency === "AUD") return formatIdr(value);
  return formatUsd(value);
}

function translateTransmission(value: string, lang: "id" | "en") {
  const v = value.toLowerCase();
  if (v === "automatic") return lang === "id" ? "Automatic" : "Automatic";
  if (v === "manual") return lang === "id" ? "Manual" : "Manual";
  return value;
}

function translateFuel(value: string, lang: "id" | "en") {
  const v = value.toLowerCase();
  if (v === "petrol") return lang === "id" ? "Bensin" : "Petrol";
  if (v === "diesel") return lang === "id" ? "Diesel" : "Diesel";
  if (v === "electric") return lang === "id" ? "Listrik" : "Electric";
  if (v === "hybrid") return lang === "id" ? "Hybrid" : "Hybrid";
  return value;
}

function motorTypeLabel(value: string, lang: "id" | "en") {
  const v = value.toLowerCase();
  if (v === "scooter") return lang === "id" ? "Skuter" : "Scooter";
  if (v === "sport") return "Sport";
  if (v === "touring") return "Touring";
  if (v === "naked") return lang === "id" ? "Naked Bike" : "Naked Bike";
  return value;
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[#1C1C1E] text-white"
          : "border border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  );
}

function MotorCard({
  p,
  saved,
  liked,
  saveCount,
  likeCount,
  userRating,
  ratingSummary,
  shareCount,
  onToggleSave,
  onToggleLike,
  onRate,
  onShare,
}: {
  p: MotorListing;
  saved: boolean;
  liked: boolean;
  saveCount: number;
  likeCount: number;
  userRating: number;
  ratingSummary: RatingSummary;
  shareCount: number;
  onToggleSave: (propertyId: string) => void;
  onToggleLike: (propertyId: string) => void;
  onRate: (propertyId: string, rating: number) => void;
  onShare: (property: MotorListing) => void;
}) {
  const { lang } = useLanguage();
  const { currency } = useCurrency();

  const currentCurrency: SupportedCurrency =
    currency === "AUD" ? "AUD" : currency === "USD" ? "USD" : "IDR";

  const [idx, setIdx] = useState(0);

  const displayPrice = formatPriceByCurrency(p.priceValue, currentCurrency);
  const secondaryPrice = formatSecondaryPrice(p.priceValue, currentCurrency);

  const next = () =>
    setIdx((prev) => (prev === p.images.length - 1 ? 0 : prev + 1));

  const prev = () =>
    setIdx((prev) => (prev === 0 ? p.images.length - 1 : prev - 1));

  function postedByLabel() {
    if (lang === "id") {
      if (p.postedByType === "owner") return "Pemilik";
      if (p.postedByType === "dealer") return "Dealer";
      return "Agen";
    }
    if (p.postedByType === "owner") return "Owner";
    if (p.postedByType === "dealer") return "Dealer";
    return "Agent";
  }

  function renderVerificationBadge() {
    if (p.postedByType === "dealer") {
      if (p.dealerVerified) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#B8860B] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
            <UserCheck size={11} strokeWidth={2.5} />
            {lang === "id" ? "Dealer Terverifikasi" : "Verified Dealer"}
          </span>
        );
      }

      if (p.dealerPendingVerification) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 shadow-sm sm:text-[11px]">
            <Clock size={11} strokeWidth={2.5} />
            {lang === "id"
              ? "Menunggu Verifikasi"
              : "Pending for Verification"}
          </span>
        );
      }

      return null;
    }

    if (p.postedByType === "agent") {
      if (p.agentVerified) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#B8860B] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
            <UserCheck size={11} strokeWidth={2.5} />
            {lang === "id" ? "Agen Terverifikasi" : "Verified Agent"}
          </span>
        );
      }

      if (p.agentPendingVerification) {
        return (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 shadow-sm sm:text-[11px]">
            <Clock size={11} strokeWidth={2.5} />
            {lang === "id"
              ? "Menunggu Verifikasi"
              : "Pending for Verification"}
          </span>
        );
      }

      return null;
    }

    if (p.ownerVerified) {
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
          <ShieldCheck size={11} strokeWidth={2.5} />
          {lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner"}
        </span>
      );
    }

    if (p.ownerPendingVerification) {
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#1C1C1E]/20 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-gray-900 shadow-sm sm:text-[11px]">
          <Clock size={11} strokeWidth={2.5} />
          {lang === "id"
            ? "Menunggu Verifikasi"
            : "Pending for Verification"}
        </span>
      );
    }

    return null;
  }

  function handleWhatsAppInquiry() {
    const message =
      lang === "id"
        ? `Halo, saya melihat motor ini di TETAMO dan tertarik.

Motor: ${p.title}
Kode: ${p.kode}
Lokasi: ${p.area}, ${p.province}
Harga: ${displayPrice}

Apakah unit ini masih tersedia?`
        : `Hello, I saw this motorbike on TETAMO and I am interested.

Motorbike: ${p.title}
Code: ${p.kode}
Location: ${p.area}, ${p.province}
Price: ${displayPrice}

Is this unit still available?`;

    const whatsappURL = `https://wa.me/${p.whatsapp}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappURL, "_blank");
  }

  function handleScheduleTestRide() {
    alert(
      lang === "id"
        ? "Dummy schedule test ride dulu. Nanti kita sambungkan ke form / leads."
        : "Dummy schedule test ride for now. Later we can connect it to a form / leads flow."
    );
  }

  return (
    <div
      className={[
        "relative overflow-hidden rounded-3xl border bg-white transition-all duration-300",
        p.spotlight
          ? "border-[#00CFE8] shadow-[0_0_0_1px_#00CFE8,0_18px_42px_rgba(0,207,232,0.20),0_10px_28px_rgba(0,0,0,0.08)] sm:scale-[1.01] sm:-translate-y-1 sm:hover:-translate-y-2 sm:hover:scale-[1.015]"
          : p.featured
            ? "border-[#D4A017] shadow-[0_0_0_1px_#D4A017,0_8px_25px_rgba(212,160,23,0.25)]"
            : p.boosted
              ? "border-slate-200 shadow-[0_0_0_1px_rgba(226,232,240,1),0_10px_28px_rgba(148,163,184,0.18)]"
              : "border-gray-200 shadow-sm",
      ].join(" ")}
    >
      <div className="relative">
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-24px)] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {p.spotlight && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold text-[#1C1C1E] shadow-[0_6px_18px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:text-[11px]">
                <Gem size={13} className="text-[#00CFE8]" />
                SPOTLIGHT
              </span>
            )}

            {p.featured && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#B8860B] shadow-md sm:text-[11px]">
                <Crown size={13} className="text-[#FFD700]" />
                FEATURED
              </span>
            )}

            {p.boosted && !p.featured && !p.spotlight && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-md sm:text-[11px]">
                <Zap size={13} className="text-[#F59E0B]" />
                BOOST
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {renderVerificationBadge()}
          </div>
        </div>

        <Link href={`/vehicles/motor/${p.slug || p.id}`} className="block">
          <img
            src={p.images[idx]}
            alt={p.title}
            className="h-[440px] w-full object-cover sm:h-[390px] lg:h-[460px]"
          />
        </Link>

        <div className="absolute bottom-3 right-3 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-[10px] font-semibold text-white sm:text-[11px]">
          TETAMO
        </div>

        <button
          type="button"
          onClick={prev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={next}
          aria-label="Next image"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
        >
          ›
        </button>

        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-96px)] flex-wrap items-center gap-2">
          <div className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 sm:text-[11px]">
            {lang === "id" ? "Dijual" : "For Sale"}
          </div>

          <div className="rounded-full border border-white/80 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-[#1C1C1E] shadow-sm sm:text-[11px]">
            {motorTypeLabel(p.bodyType, lang)}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="text-lg font-extrabold text-[#1C1C1E] sm:text-xl">
          {displayPrice}
        </div>

        <div className="mt-1 text-sm text-gray-500 sm:text-sm">
          ≈ {secondaryPrice}
        </div>

        <div className="mt-1 text-sm text-gray-500 sm:text-sm">
          {p.area}, {p.province}
        </div>

        <Link href={`/vehicles/motor/${p.slug || p.id}`} className="mt-2 block">
          <h3 className="text-sm font-semibold leading-snug text-[#1C1C1E] hover:underline sm:text-base">
            {p.title}
          </h3>
        </Link>

        <div className="mt-3 text-sm leading-6 text-gray-600 sm:text-sm">
          {p.year} • {translateTransmission(p.transmission, lang)} •{" "}
          {translateFuel(p.fuel, lang)} • {p.mileage}
        </div>

        <div className="mt-2.5 text-sm leading-6 text-gray-600 sm:text-sm">
          {postedByLabel()}:{" "}
          <span className="font-semibold text-[#1C1C1E]">{p.sellerName}</span>
          {p.agency ? (
            <>
              <span className="text-gray-400"> • </span>
              <span className="text-gray-700">{p.agency}</span>
            </>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[12px] tracking-wide text-gray-500 sm:text-sm">
          <span>{p.kode}</span>
          <span>•</span>
          <span>{p.postedDate}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleWhatsAppInquiry}
            className="rounded-2xl bg-[#1C1C1E] px-3 py-2.5 text-center text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
          >
            WhatsApp
          </button>

          <Link
            href={`/vehicles/motor/${p.slug || p.id}`}
            className="rounded-2xl bg-yellow-600 px-3 py-2.5 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
          >
            {lang === "id" ? "Lihat Detail" : "View Detail"}
          </Link>
        </div>

        <button
          type="button"
          onClick={handleScheduleTestRide}
          className="mt-3 block w-full rounded-2xl border border-gray-200 px-4 py-2.5 text-center text-[13px] font-semibold text-[#1C1C1E] transition hover:bg-gray-50 sm:text-sm"
        >
          {lang === "id" ? "Jadwal Test Ride" : "Schedule Test Ride"}
        </button>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onToggleSave(p.id)}
            className={`rounded-2xl border px-2 py-2 text-center transition ${
              saved
                ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Bookmark className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold sm:text-xs">
                {lang === "id" ? `Simpan (${saveCount})` : `Save (${saveCount})`}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onToggleLike(p.id)}
            className={`rounded-2xl border px-2 py-2 text-center transition ${
              liked
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold sm:text-xs">
                {lang === "id" ? `Suka (${likeCount})` : `Like (${likeCount})`}
              </span>
            </div>
          </button>

          <div className="rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center">
            <div className="text-sm font-bold text-[#1C1C1E]">
              {ratingSummary.count > 0 ? ratingSummary.avg.toFixed(1) : "0.0"}
            </div>
            <div className="text-[10px] text-gray-500 sm:text-[11px]">
              {lang === "id" ? "Rating" : "Rating"} ({ratingSummary.count})
            </div>
          </div>

          <button
            type="button"
            onClick={() => onShare(p)}
            className="rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center transition hover:bg-gray-50"
          >
            <div className="text-sm font-bold text-[#1C1C1E]">
              {shareCount}
            </div>
            <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 sm:text-[11px]">
              <Share2 className="h-3.5 w-3.5" />
              <span>{lang === "id" ? "Bagikan" : "Share"}</span>
            </div>
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRate(p.id, value)}
              className={`rounded-full p-1 transition ${
                userRating >= value
                  ? "text-amber-500"
                  : "text-gray-300 hover:text-amber-400"
              }`}
              aria-label={`Rate ${value}`}
              title={`Rate ${value}`}
            >
              <Star
                className="h-3.5 w-3.5"
                fill={userRating >= value ? "currentColor" : "transparent"}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MotorPageClient() {
  const { lang } = useLanguage();
  const sp = useSearchParams();
  const bodyType = sp.get("type");

  const [all] = useState<MotorListing[]>(DUMMY_MOTORS);
  const [loading] = useState(false);

  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [saveCountMap, setSaveCountMap] = useState<Record<string, number>>({});
  const [likeCountMap, setLikeCountMap] = useState<Record<string, number>>({});
  const [userRatingsMap, setUserRatingsMap] = useState<Record<string, number>>(
    {}
  );
  const [ratingSummaryMap, setRatingSummaryMap] = useState<
    Record<string, RatingSummary>
  >({});
  const [shareCountMap, setShareCountMap] = useState<Record<string, number>>(
    {}
  );
  const [marketplaceSearch, setMarketplaceSearch] = useState("");

  useEffect(() => {
    const nextSaveCountMap: Record<string, number> = {};
    const nextLikeCountMap: Record<string, number> = {};
    const nextRatingSummaryMap: Record<string, RatingSummary> = {};
    const nextShareCountMap: Record<string, number> = {};

    all.forEach((item, index) => {
      nextSaveCountMap[item.id] = 7 + index;
      nextLikeCountMap[item.id] = 12 + index;
      nextRatingSummaryMap[item.id] = {
        avg: 4.4 + (index % 3) * 0.1,
        count: 9 + index,
      };
      nextShareCountMap[item.id] = 2 + index;
    });

    setSaveCountMap(nextSaveCountMap);
    setLikeCountMap(nextLikeCountMap);
    setRatingSummaryMap(nextRatingSummaryMap);
    setShareCountMap(nextShareCountMap);
  }, [all]);

  function handleToggleSave(propertyId: string) {
    const currentlySaved = Boolean(savedMap[propertyId]);

    setSavedMap((prev) => ({
      ...prev,
      [propertyId]: !currentlySaved,
    }));

    setSaveCountMap((prev) => ({
      ...prev,
      [propertyId]: Math.max(
        0,
        (prev[propertyId] ?? 0) + (currentlySaved ? -1 : 1)
      ),
    }));
  }

  function handleToggleLike(propertyId: string) {
    const currentlyLiked = Boolean(likedMap[propertyId]);

    setLikedMap((prev) => ({
      ...prev,
      [propertyId]: !currentlyLiked,
    }));

    setLikeCountMap((prev) => ({
      ...prev,
      [propertyId]: Math.max(
        0,
        (prev[propertyId] ?? 0) + (currentlyLiked ? -1 : 1)
      ),
    }));
  }

  function handleRate(propertyId: string, rating: number) {
    const currentUserRating = userRatingsMap[propertyId] ?? 0;
    const nextRating = currentUserRating === rating ? 0 : rating;

    setUserRatingsMap((prev) => ({
      ...prev,
      [propertyId]: nextRating,
    }));

    setRatingSummaryMap((prev) => {
      const summary = prev[propertyId] ?? { avg: 0, count: 0 };
      let total = summary.avg * summary.count;
      let count = summary.count;

      if (currentUserRating > 0) {
        total -= currentUserRating;
        count -= 1;
      }

      if (nextRating > 0) {
        total += nextRating;
        count += 1;
      }

      return {
        ...prev,
        [propertyId]: {
          avg: count > 0 ? total / count : 0,
          count: Math.max(count, 0),
        },
      };
    });
  }

  async function handleShare(property: MotorListing) {
    const shareUrl = `${window.location.origin}/vehicles/motor/${property.slug || property.id}`;
    const shareText =
      lang === "id"
        ? `Lihat motor ini di TETAMO:\n\n${property.title}\n${property.area}, ${property.province}`
        : `Check out this motorbike on TETAMO:\n\n${property.title}\n${property.area}, ${property.province}`;

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: property.title,
          text: shareText,
          url: shareUrl,
        });
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(shareUrl);
        alert(
          lang === "id"
            ? "Link motor berhasil disalin."
            : "Motorbike link copied successfully."
        );
      } else {
        window.prompt(
          lang === "id" ? "Salin link motor ini:" : "Copy this motorbike link:",
          shareUrl
        );
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error("Failed to share motor:", error);
      }
    }

    setShareCountMap((prev) => ({
      ...prev,
      [property.id]: (prev[property.id] ?? 0) + 1,
    }));
  }

  function handleMarketplaceSearchSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
  }

  const filtered = useMemo(() => {
    let list = [...all];

    if (
      bodyType === "scooter" ||
      bodyType === "sport" ||
      bodyType === "touring"
    ) {
      list = list.filter((p) => p.bodyType === bodyType);
    }

    const search = marketplaceSearch.trim().toLowerCase();

    if (search) {
      list = list.filter((p) =>
        [
          p.title,
          p.kode,
          p.area,
          p.province,
          p.sellerName,
          p.agency,
          p.year,
          p.transmission,
          p.fuel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    const spotlight = list.filter((p) => p.spotlight).sort(sortByRanking);
    const featured = list
      .filter((p) => !p.spotlight && p.featured)
      .sort(sortByRanking);
    const boosted = list
      .filter((p) => !p.spotlight && !p.featured && p.boosted)
      .sort(sortByRanking);
    const normal = list
      .filter((p) => !p.spotlight && !p.featured && !p.boosted)
      .sort(sortByRanking);

    return [...spotlight, ...featured, ...boosted, ...normal];
  }, [all, bodyType, marketplaceSearch]);

  const pageSize = 9;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [bodyType, marketplaceSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const currentFilterLabel =
    bodyType === "scooter"
      ? lang === "id"
        ? "Skuter"
        : "Scooter"
      : bodyType === "sport"
        ? "Sport"
        : bodyType === "touring"
          ? "Touring"
          : lang === "id"
            ? "Semua"
            : "All";

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="rounded-[32px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-extrabold text-[#1C1C1E] sm:text-3xl">
                {lang === "id" ? "Marketplace Motor" : "Motor Marketplace"}
              </h1>

              <p className="mt-2 text-sm leading-7 text-gray-600 sm:text-base">
                {lang === "id"
                  ? "Temukan listing motor dari pemilik, dealer, dan agen dengan Tetamo."
                  : "Discover motorbike listings from owners, dealers, and agents with the same Tetamo."}
              </p>
            </div>

            <form
              onSubmit={handleMarketplaceSearchSubmit}
              className="w-full xl:max-w-[420px]"
            >
              <div className="rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F7F7F8] text-gray-500">
                    <Search className="h-4 w-4" />
                  </div>

                  <input
                    type="text"
                    value={marketplaceSearch}
                    onChange={(e) => setMarketplaceSearch(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Cari brand, model, dealer, lokasi..."
                        : "Search brand, model, dealer, location..."
                    }
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[#1C1C1E] outline-none placeholder:text-gray-400 sm:text-sm"
                  />

                  <button
                    type="submit"
                    className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#1C1C1E] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
                  >
                    {lang === "id" ? "Cari" : "Search"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <FilterChip
              href="/vehicles/motor"
              active={!bodyType}
              label={lang === "id" ? "Semua" : "All"}
            />
            <FilterChip
              href="/vehicles/motor?type=scooter"
              active={bodyType === "scooter"}
              label={lang === "id" ? "Skuter" : "Scooter"}
            />
            <FilterChip
              href="/vehicles/motor?type=sport"
              active={bodyType === "sport"}
              label="Sport"
            />
            <FilterChip
              href="/vehicles/motor?type=touring"
              active={bodyType === "touring"}
              label="Touring"
            />
          </div>

          <p className="mt-4 text-sm font-medium text-gray-600">
            {lang === "id" ? "Filter aktif:" : "Active filter:"}{" "}
            <span className="font-semibold text-[#1C1C1E]">
              {currentFilterLabel}
            </span>
          </p>
        </div>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:text-base">
            {lang === "id" ? "Memuat motor..." : "Loading motorbikes..."}
          </div>
        ) : paged.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:text-base">
            {lang === "id"
              ? "Belum ada motor untuk ditampilkan."
              : "No motorbikes to display yet."}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {paged.map((p) => (
              <MotorCard
                key={p.id}
                p={p}
                saved={Boolean(savedMap[p.id])}
                liked={Boolean(likedMap[p.id])}
                saveCount={saveCountMap[p.id] ?? 0}
                likeCount={likeCountMap[p.id] ?? 0}
                userRating={userRatingsMap[p.id] ?? 0}
                ratingSummary={ratingSummaryMap[p.id] ?? { avg: 0, count: 0 }}
                shareCount={shareCountMap[p.id] ?? 0}
                onToggleSave={handleToggleSave}
                onToggleLike={handleToggleLike}
                onRate={handleRate}
                onShare={handleShare}
              />
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex min-w-[92px] items-center justify-center rounded-2xl border border-gray-200 px-3 py-2.5 text-[13px] font-medium transition hover:bg-gray-50 disabled:opacity-40 sm:min-w-[110px] sm:px-4 sm:py-3 sm:text-sm"
          >
            {lang === "id" ? "Sebelumnya" : "Prev"}
          </button>

          <div className="shrink-0 text-center text-[13px] text-gray-600 sm:text-sm">
            {lang === "id" ? "Halaman" : "Page"}{" "}
            <span className="font-semibold">{page}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex min-w-[92px] items-center justify-center rounded-2xl border border-gray-200 px-3 py-2.5 text-[13px] font-medium transition hover:bg-gray-50 disabled:opacity-40 sm:min-w-[110px] sm:px-4 sm:py-3 sm:text-sm"
          >
            {lang === "id" ? "Berikutnya" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}