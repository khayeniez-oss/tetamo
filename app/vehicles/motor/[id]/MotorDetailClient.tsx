"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music2,
  Gem,
  Crown,
  Zap,
  Bike,
  Calendar,
  Gauge,
  Fuel,
  Settings2,
  FileText,
  BadgeCheck,
  Heart,
  Bookmark,
  Star,
  Clock,
  Share2,
  ShieldCheck,
} from "lucide-react";

type SupportedCurrency = "IDR" | "USD" | "AUD";

type MotorItem = {
  id: string;
  slug: string;
  kodeListing: string;
  postedDate: string;
  title: string;
  description: string;
  descriptionEn: string;
  priceValue: number;
  province: string;
  area: string;
  year: string;
  transmission: string;
  fuel: string;
  mileage: string;
  bodyType: string;
  color: string;
  engine: string;
  condition: string;
  marketType: string;
  sellerName: string;
  agency: string;
  phone: string;
  whatsapp: string;
  email: string;
  photo: string;
  images: string[];
  videoUrl?: string;
  spotlight?: boolean;
  featured?: boolean;
  boosted?: boolean;
  verifiedListing: boolean;
  ownerApproved: boolean;
  dealerVerified: boolean;
  postedByType: "owner" | "dealer" | "agent";
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
};

const FALLBACK_POSTER_PHOTO =
  "https://randomuser.me/api/portraits/men/32.jpg";

const IDR_PER_USD = 16500;
const IDR_PER_AUD = 12072;

const DUMMY_MOTORS: MotorItem[] = [
  {
    id: "motor-001",
    slug: "yamaha-xmax-connected-2024",
    kodeListing: "MTR-TTM-001",
    postedDate: "16 Apr 2026",
    title: "Yamaha XMAX Connected 2024",
    description:
      "A premium maxi scooter with modern styling, smooth automatic ride, and strong road presence for city and leisure use.\n\nMotor details:\nYear: 2024\nTransmission: Automatic\nFuel: Petrol\nMileage: 3.200 km\nType: Scooter\nColor: Grey\nEngine: 250cc\nCondition: Excellent",
    descriptionEn:
      "A premium maxi scooter with modern styling, smooth automatic ride, and strong road presence for city and leisure use.\n\nMotor details:\nYear: 2024\nTransmission: Automatic\nFuel: Petrol\nMileage: 3,200 km\nType: Scooter\nColor: Grey\nEngine: 250cc\nCondition: Excellent",
    priceValue: 69000000,
    province: "Bali",
    area: "Denpasar",
    year: "2024",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "3.200 km",
    bodyType: "Scooter",
    color: "Grey",
    engine: "250cc",
    condition: "Excellent",
    marketType: "Secondary",
    sellerName: "Tetamo Moto Partner",
    agency: "Tetamo Moto Network",
    phone: "082230000001",
    whatsapp: "6282230000001",
    email: "moto@tetamo.com",
    photo:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
    ],
    videoUrl: "",
    spotlight: true,
    featured: false,
    boosted: false,
    verifiedListing: true,
    ownerApproved: false,
    dealerVerified: true,
    postedByType: "dealer",
    instagramUrl: "https://instagram.com/tetamo",
    facebookUrl: "https://facebook.com/tetamo",
    tiktokUrl: "https://tiktok.com/@tetamo",
    youtubeUrl: "",
    linkedinUrl: "https://linkedin.com/company/tetamo",
  },
  {
    id: "motor-002",
    slug: "honda-adv-160-2024",
    kodeListing: "MTR-TTM-002",
    postedDate: "15 Apr 2026",
    title: "Honda ADV 160 2024",
    description:
      "A stylish urban adventure scooter with practical everyday comfort, elevated riding position, and sporty modern design.\n\nMotor details:\nYear: 2024\nTransmission: Automatic\nFuel: Petrol\nMileage: 1.900 km\nType: Scooter\nColor: Black\nEngine: 160cc\nCondition: Very Good",
    descriptionEn:
      "A stylish urban adventure scooter with practical everyday comfort, elevated riding position, and sporty modern design.\n\nMotor details:\nYear: 2024\nTransmission: Automatic\nFuel: Petrol\nMileage: 1,900 km\nType: Scooter\nColor: Black\nEngine: 160cc\nCondition: Very Good",
    priceValue: 42000000,
    province: "Jawa Timur",
    area: "Surabaya",
    year: "2024",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "1.900 km",
    bodyType: "Scooter",
    color: "Black",
    engine: "160cc",
    condition: "Very Good",
    marketType: "Secondary",
    sellerName: "Andre Kurniawan",
    agency: "",
    phone: "082230000002",
    whatsapp: "6282230000002",
    email: "andre@example.com",
    photo: FALLBACK_POSTER_PHOTO,
    images: [
      "https://images.unsplash.com/photo-1622185135825-d5fc1d3f1c7d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    ],
    videoUrl: "",
    spotlight: false,
    featured: true,
    boosted: false,
    verifiedListing: true,
    ownerApproved: true,
    dealerVerified: false,
    postedByType: "owner",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
  },
  {
    id: "motor-003",
    slug: "kawasaki-ninja-zx25r-2023",
    kodeListing: "MTR-TTM-003",
    postedDate: "14 Apr 2026",
    title: "Kawasaki Ninja ZX-25R 2023",
    description:
      "A performance-focused sport bike with aggressive styling, exciting manual ride feel, and strong enthusiast appeal.\n\nMotor details:\nYear: 2023\nTransmission: Manual\nFuel: Petrol\nMileage: 7.500 km\nType: Sport\nColor: Green\nEngine: 250cc\nCondition: Excellent",
    descriptionEn:
      "A performance-focused sport bike with aggressive styling, exciting manual ride feel, and strong enthusiast appeal.\n\nMotor details:\nYear: 2023\nTransmission: Manual\nFuel: Petrol\nMileage: 7,500 km\nType: Sport\nColor: Green\nEngine: 250cc\nCondition: Excellent",
    priceValue: 118000000,
    province: "DKI Jakarta",
    area: "Jakarta Selatan",
    year: "2023",
    transmission: "Manual",
    fuel: "Petrol",
    mileage: "7.500 km",
    bodyType: "Sport",
    color: "Green",
    engine: "250cc",
    condition: "Excellent",
    marketType: "Secondary",
    sellerName: "Green Line Motors",
    agency: "Green Line Motors",
    phone: "082230000003",
    whatsapp: "6282230000003",
    email: "sales@greenline.id",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
    images: [
      "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1517846693594-1567da72af75?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
    ],
    videoUrl: "",
    spotlight: false,
    featured: false,
    boosted: true,
    verifiedListing: true,
    ownerApproved: false,
    dealerVerified: true,
    postedByType: "dealer",
    instagramUrl: "https://instagram.com/tetamo",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
  },
  {
    id: "motor-004",
    slug: "vespa-primavera-s-2023",
    kodeListing: "MTR-TTM-004",
    postedDate: "13 Apr 2026",
    title: "Vespa Primavera S 2023",
    description:
      "A fashionable scooter with timeless Italian styling, premium visual identity, and a light, smooth city ride.\n\nMotor details:\nYear: 2023\nTransmission: Automatic\nFuel: Petrol\nMileage: 4.800 km\nType: Scooter\nColor: White\nEngine: 150cc\nCondition: Excellent",
    descriptionEn:
      "A fashionable scooter with timeless Italian styling, premium visual identity, and a light, smooth city ride.\n\nMotor details:\nYear: 2023\nTransmission: Automatic\nFuel: Petrol\nMileage: 4,800 km\nType: Scooter\nColor: White\nEngine: 150cc\nCondition: Excellent",
    priceValue: 51500000,
    province: "Bali",
    area: "Canggu",
    year: "2023",
    transmission: "Automatic",
    fuel: "Petrol",
    mileage: "4.800 km",
    bodyType: "Scooter",
    color: "White",
    engine: "150cc",
    condition: "Excellent",
    marketType: "Secondary",
    sellerName: "Melissa Hartono",
    agency: "",
    phone: "082230000004",
    whatsapp: "6282230000004",
    email: "melissa@example.com",
    photo: FALLBACK_POSTER_PHOTO,
    images: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1622185135505-2d7950039943?auto=format&fit=crop&w=1200&q=80",
    ],
    videoUrl: "",
    spotlight: false,
    featured: false,
    boosted: false,
    verifiedListing: true,
    ownerApproved: true,
    dealerVerified: false,
    postedByType: "owner",
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    youtubeUrl: "",
    linkedinUrl: "",
  },
];

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

function formatSecondaryPrices(
  value: number | null | undefined,
  currency: SupportedCurrency
) {
  const all: SupportedCurrency[] = ["IDR", "USD", "AUD"];
  return all
    .filter((item) => item !== currency)
    .map((item) => formatPriceByCurrency(value, item));
}

function normalizeExternalUrl(url?: string | null) {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function getMotorHref(motor: { slug?: string | null; id: string }) {
  return `/vehicles/motor/${motor.slug || motor.id}`;
}

function getSellerLabel(
  postedByType: "owner" | "dealer" | "agent",
  lang: string
) {
  if (lang === "id") {
    if (postedByType === "dealer") return "Dealer";
    if (postedByType === "agent") return "Agen";
    return "Pemilik";
  }

  if (postedByType === "dealer") return "Dealer";
  if (postedByType === "agent") return "Agent";
  return "Owner";
}

function translateTransmission(value: string, lang: string) {
  const v = value.toLowerCase();
  if (v === "automatic") return lang === "id" ? "Automatic" : "Automatic";
  if (v === "manual") return lang === "id" ? "Manual" : "Manual";
  return value;
}

function translateFuel(value: string, lang: string) {
  const v = value.toLowerCase();
  if (v === "petrol") return lang === "id" ? "Bensin" : "Petrol";
  if (v === "diesel") return lang === "id" ? "Diesel" : "Diesel";
  if (v === "electric") return lang === "id" ? "Listrik" : "Electric";
  if (v === "hybrid") return lang === "id" ? "Hybrid" : "Hybrid";
  return value;
}

function SocialCircle({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: any;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-[#1C1C1E] transition hover:bg-gray-50"
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}

export default function MotorDetailClient({ id }: { id: string }) {
  const { lang } = useLanguage();
  const { currency } = useCurrency();

  const currentCurrency: SupportedCurrency =
    currency === "AUD" ? "AUD" : currency === "USD" ? "USD" : "IDR";

  const [jadwalOpen, setJadwalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [idx, setIdx] = useState(0);

  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [displayLikeCount, setDisplayLikeCount] = useState(14);
  const [displaySaveCount, setDisplaySaveCount] = useState(10);
  const [displayRatingAverage, setDisplayRatingAverage] = useState(4.7);
  const [displayRatingCount, setDisplayRatingCount] = useState(17);
  const [displayShareCount, setDisplayShareCount] = useState(5);

  const property = useMemo(
    () => DUMMY_MOTORS.find((item) => item.id === id) || null,
    [id]
  );

  const orderedMotors = useMemo(
    () => DUMMY_MOTORS.map((item) => ({ id: item.id, slug: item.slug })),
    []
  );

  const propertyIndex = useMemo(
    () => orderedMotors.findIndex((x) => x.id === id),
    [orderedMotors, id]
  );

  const prevProperty =
    propertyIndex > 0 ? orderedMotors[propertyIndex - 1] : null;
  const nextProperty =
    propertyIndex >= 0 && propertyIndex < orderedMotors.length - 1
      ? orderedMotors[propertyIndex + 1]
      : null;

  useEffect(() => {
    setIdx(0);
  }, [id]);

  const nextImg = () =>
    property &&
    setIdx((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));

  const prevImg = () =>
    property &&
    setIdx((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));

  const displayPrice = property
    ? formatPriceByCurrency(property.priceValue, currentCurrency)
    : "";

  const secondaryPrices = property
    ? formatSecondaryPrices(property.priceValue, currentCurrency)
    : [];

  async function toggleSave() {
    setSaved((prev) => !prev);
    setDisplaySaveCount((prev) => Math.max(0, prev + (saved ? -1 : 1)));
  }

  async function toggleLike() {
    setLiked((prev) => !prev);
    setDisplayLikeCount((prev) => Math.max(0, prev + (liked ? -1 : 1)));
  }

  async function handleRate(nextValue: number) {
    const currentRating = userRating;
    const currentCount = displayRatingCount;
    const currentAverage = displayRatingAverage;
    const nextRating = currentRating === nextValue ? 0 : nextValue;

    let nextCount = currentCount;
    let total = currentAverage * currentCount;

    if (currentRating > 0) {
      total -= currentRating;
      nextCount -= 1;
    }

    if (nextRating > 0) {
      total += nextRating;
      nextCount += 1;
    }

    const nextAverage = nextCount > 0 ? total / nextCount : 0;

    setUserRating(nextRating);
    setDisplayRatingCount(Math.max(nextCount, 0));
    setDisplayRatingAverage(Number(nextAverage.toFixed(1)));
  }

  async function handleShare() {
    if (!property) return;

    const shareUrl = `${window.location.origin}${getMotorHref(property)}`;
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

    setDisplayShareCount((prev) => prev + 1);
  }

  function openJadwal() {
    setJadwalOpen(true);
  }

  function closeJadwal() {
    setJadwalOpen(false);
  }

  function handleWhatsAppClick() {
    if (!property) return;

    const message =
      lang === "id"
        ? `Halo ${property.sellerName}, saya tertarik dengan motor ini di TETAMO.

Motor: ${property.title}
Kode: ${property.kodeListing}
Lokasi: ${property.area}, ${property.province}
Harga: ${displayPrice}

Apakah unit ini masih tersedia?`
        : `Hello ${property.sellerName}, I'm interested in this motorbike on TETAMO.

Motorbike: ${property.title}
Code: ${property.kodeListing}
Location: ${property.area}, ${property.province}
Price: ${displayPrice}

Is this unit still available?`;

    const whatsappURL = `https://wa.me/${property.whatsapp}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappURL, "_blank");
  }

  function handleTestRideRequest() {
    if (!property || !selectedDate || !selectedTime) return;

    const sellerLabel = getSellerLabel(property.postedByType, lang);

    alert(
      lang === "id"
        ? `Permintaan test ride berhasil dikirim. ${sellerLabel} akan menghubungi Anda untuk konfirmasi.`
        : `Test ride request sent successfully. The ${sellerLabel.toLowerCase()} will contact you for confirmation.`
    );

    setJadwalOpen(false);
    setSelectedDate("");
    setSelectedTime("");
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="text-2xl font-bold">
            {lang === "id" ? "Motor tidak ditemukan" : "Motorbike not found"}
          </h1>
          <Link
            href="/vehicles/motor"
            className="mt-4 inline-block text-[#1C1C1E] underline"
          >
            {lang === "id" ? "Kembali ke Marketplace" : "Back to Marketplace"}
          </Link>
        </div>
      </main>
    );
  }

  const socialLinks = [
    {
      key: "instagram",
      href: normalizeExternalUrl(property.instagramUrl),
      icon: Instagram,
      label: "Instagram",
    },
    {
      key: "facebook",
      href: normalizeExternalUrl(property.facebookUrl),
      icon: Facebook,
      label: "Facebook",
    },
    {
      key: "tiktok",
      href: normalizeExternalUrl(property.tiktokUrl),
      icon: Music2,
      label: "TikTok",
    },
    {
      key: "youtube",
      href: normalizeExternalUrl(property.youtubeUrl),
      icon: Youtube,
      label: "YouTube",
    },
    {
      key: "linkedin",
      href: normalizeExternalUrl(property.linkedinUrl),
      icon: Linkedin,
      label: "LinkedIn",
    },
  ].filter((item) => item.href);

  const detailChips = [
    {
      key: "type",
      label: lang === "id" ? "Tipe Motor" : "Motor Type",
      value: property.bodyType,
      icon: Bike,
    },
    {
      key: "year",
      label: lang === "id" ? "Tahun" : "Year",
      value: property.year,
      icon: Calendar,
    },
    {
      key: "transmission",
      label: lang === "id" ? "Transmisi" : "Transmission",
      value: translateTransmission(property.transmission, lang),
      icon: Settings2,
    },
    {
      key: "fuel",
      label: lang === "id" ? "Bahan Bakar" : "Fuel",
      value: translateFuel(property.fuel, lang),
      icon: Fuel,
    },
    {
      key: "mileage",
      label: lang === "id" ? "Kilometer" : "Mileage",
      value: property.mileage,
      icon: Gauge,
    },
    {
      key: "engine",
      label: lang === "id" ? "Mesin" : "Engine",
      value: property.engine,
      icon: Settings2,
    },
    {
      key: "color",
      label: lang === "id" ? "Warna" : "Color",
      value: property.color,
      icon: BadgeCheck,
    },
    {
      key: "condition",
      label: lang === "id" ? "Kondisi" : "Condition",
      value: property.condition,
      icon: ShieldCheck,
    },
    {
      key: "marketType",
      label: lang === "id" ? "Market Type" : "Market Type",
      value: property.marketType,
      icon: FileText,
    },
  ];

  const activeDescription =
    lang === "en" && property.descriptionEn
      ? property.descriptionEn
      : property.description;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/vehicles/motor"
            className="text-sm underline text-[#1C1C1E] hover:opacity-80"
          >
            {lang === "id" ? "Kembali ke Marketplace" : "Back to Marketplace"}
          </Link>

          <div className="flex items-center gap-2">
            {prevProperty ? (
              <Link
                href={getMotorHref(prevProperty)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold transition hover:bg-gray-50 sm:text-sm"
              >
                ← Prev
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold opacity-40 sm:text-sm"
              >
                ← Prev
              </button>
            )}

            {nextProperty ? (
              <Link
                href={getMotorHref(nextProperty)}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold transition hover:bg-gray-50 sm:text-sm"
              >
                Next →
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold opacity-40 sm:text-sm"
              >
                Next →
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="relative overflow-hidden rounded-[28px]">
              <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-24px)] flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {property.spotlight && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-extrabold text-[#1C1C1E] shadow-[0_6px_18px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:text-[11px]">
                      <Gem size={13} className="text-[#00CFE8]" />
                      SPOTLIGHT
                    </span>
                  )}

                  {property.featured && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#B8860B] shadow-md sm:text-[11px]">
                      <Crown size={13} className="text-[#FFD700]" />
                      FEATURED
                    </span>
                  )}

                  {property.boosted && !property.featured && !property.spotlight && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-md sm:text-[11px]">
                      <Zap size={13} className="text-[#F59E0B]" />
                      BOOST
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {property.dealerVerified ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#B8860B] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
                      <BadgeCheck size={11} strokeWidth={2.5} />
                      {lang === "id" ? "Dealer Terverifikasi" : "Verified Dealer"}
                    </span>
                  ) : property.ownerApproved ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
                      <ShieldCheck size={11} strokeWidth={2.5} />
                      {lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[#1C1C1E]/20 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-gray-900 shadow-sm sm:text-[11px]">
                      <Clock size={11} strokeWidth={2.5} />
                      {lang === "id"
                        ? "Menunggu Verifikasi"
                        : "Pending for Verification"}
                    </span>
                  )}
                </div>
              </div>

              <img
                src={property.images[idx]}
                alt={property.title}
                className="h-[360px] w-full object-cover sm:h-[480px] lg:h-[620px]"
              />

              <button
                type="button"
                onClick={prevImg}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={nextImg}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
                aria-label="Next image"
              >
                ›
              </button>

              <div className="absolute bottom-3 right-3 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-[10px] font-semibold text-white sm:text-[11px]">
                TETAMO
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {property.images.map((img, imageIndex) => (
                <button
                  key={`${img}-${imageIndex}`}
                  type="button"
                  onClick={() => setIdx(imageIndex)}
                  className={`overflow-hidden rounded-2xl border transition ${
                    idx === imageIndex
                      ? "border-[#1C1C1E]"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${property.title} ${imageIndex + 1}`}
                    className="h-20 w-full object-cover sm:h-24"
                  />
                </button>
              ))}
            </div>

            {property.videoUrl ? (
              <div className="mt-4 overflow-hidden rounded-3xl border border-gray-200">
                <video
                  src={property.videoUrl}
                  controls
                  className="w-full bg-black"
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 sm:text-xs">
                  {lang === "id" ? "Dijual" : "For Sale"}
                </span>

                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700 sm:text-xs">
                  {property.bodyType}
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-extrabold leading-tight text-[#1C1C1E] sm:text-3xl">
                {property.title}
              </h1>

              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                {property.area}, {property.province}
              </p>

              <div className="mt-5 text-2xl font-extrabold text-[#1C1C1E] sm:text-3xl">
                {displayPrice}
              </div>

              {secondaryPrices.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {secondaryPrices.map((value) => (
                    <span
                      key={value}
                      className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600"
                    >
                      ≈ {value}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-500 sm:text-sm">
                <span>{property.kodeListing}</span>
                <span>•</span>
                <span>{property.postedDate}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="rounded-2xl bg-[#1C1C1E] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
                >
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={openJadwal}
                  className="rounded-2xl bg-yellow-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-yellow-700"
                >
                  {lang === "id" ? "Schedule Test Ride" : "Schedule Test Ride"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={toggleSave}
                  className={`rounded-2xl border px-2 py-2 text-center transition ${
                    saved
                      ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                      : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Bookmark className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold sm:text-xs">
                      {lang === "id"
                        ? `Simpan (${displaySaveCount})`
                        : `Save (${displaySaveCount})`}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={toggleLike}
                  className={`rounded-2xl border px-2 py-2 text-center transition ${
                    liked
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-semibold sm:text-xs">
                      {lang === "id"
                        ? `Suka (${displayLikeCount})`
                        : `Like (${displayLikeCount})`}
                    </span>
                  </div>
                </button>

                <div className="rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center">
                  <div className="text-sm font-bold text-[#1C1C1E]">
                    {displayRatingCount > 0 ? displayRatingAverage.toFixed(1) : "0.0"}
                  </div>
                  <div className="text-[10px] text-gray-500 sm:text-[11px]">
                    {lang === "id" ? "Rating" : "Rating"} ({displayRatingCount})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShare}
                  className="rounded-2xl border border-gray-200 bg-white px-2 py-2 text-center transition hover:bg-gray-50"
                >
                  <div className="text-sm font-bold text-[#1C1C1E]">
                    {displayShareCount}
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
                    onClick={() => handleRate(value)}
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

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-4">
                <img
                  src={property.photo || FALLBACK_POSTER_PHOTO}
                  alt={property.sellerName}
                  className="h-16 w-16 rounded-2xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                    {getSellerLabel(property.postedByType, lang)}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-[#1C1C1E]">
                    {property.sellerName}
                  </h2>
                  {property.agency ? (
                    <p className="text-sm text-gray-500">{property.agency}</p>
                  ) : null}
                  <p className="mt-1 text-sm text-gray-500">{property.email}</p>
                </div>
              </div>

              {socialLinks.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {socialLinks.map((item) => (
                    <SocialCircle
                      key={item.key}
                      href={item.href}
                      label={item.label}
                      icon={item.icon}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-[#1C1C1E]">
            {lang === "id" ? "Detail Motor" : "Motor Details"}
          </h2>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {detailChips.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.key}
                  className="rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1C1C1E] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-400">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-[#1C1C1E]">
              {lang === "id" ? "Deskripsi" : "Description"}
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-gray-600 sm:text-base">
              {activeDescription.split("\n").map((paragraph, index) =>
                paragraph.trim() ? <p key={index}>{paragraph}</p> : null
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-[#1C1C1E]">
              {lang === "id" ? "Catatan" : "Notes"}
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
              <p>
                {lang === "id"
                  ? "Ini adalah halaman detail motor dummy yang mengikuti gaya UI halaman detail properti Tetamo."
                  : "This is a dummy motor detail page following the Tetamo property detail page UI style."}
              </p>
              <p>
                {lang === "id"
                  ? "Nanti bagian ini bisa dihubungkan ke Supabase, lead form, dealer profiles, dan test ride flow yang real."
                  : "Later this can be connected to Supabase, real lead forms, dealer profiles, and a real test ride flow."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {jadwalOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#1C1C1E]">
                  {lang === "id" ? "Jadwal Test Ride" : "Schedule Test Ride"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{property.title}</p>
              </div>

              <button
                type="button"
                onClick={closeJadwal}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Pilih Tanggal" : "Select Date"}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Pilih Jam" : "Select Time"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {["10:00", "11:00", "13:00", "15:00", "17:00"].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                        selectedTime === time
                          ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                          : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestRideRequest}
                disabled={!selectedDate || !selectedTime}
                className="rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {lang === "id"
                  ? "Kirim Permintaan Test Ride"
                  : "Send Test Ride Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}