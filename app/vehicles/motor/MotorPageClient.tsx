"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Crown,
  ShieldCheck,
  UserCheck,
  Clock,
  Bookmark,
  Heart,
  Star,
  Search,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
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

type VehicleRow = Record<string, any>;
type VehicleMediaRow = Record<string, any>;
type ProfileRow = Record<string, any>;

const IDR_PER_USD = 16500;
const IDR_PER_AUD = 12072;

const FALLBACK_MOTOR_IMAGE =
  "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80";

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
  return String(b.postedDate).localeCompare(String(a.postedDate));
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
  if (v === "automatic") return "Automatic";
  if (v === "manual") return "Manual";
  if (v === "cvt") return "CVT";
  return value || "-";
}

function translateFuel(value: string, lang: "id" | "en") {
  const v = value.toLowerCase();
  if (v === "petrol") return lang === "id" ? "Bensin" : "Petrol";
  if (v === "diesel") return "Diesel";
  if (v === "electric") return lang === "id" ? "Listrik" : "Electric";
  if (v === "hybrid") return "Hybrid";
  return value || "-";
}

function motorTypeLabel(value: string, lang: "id" | "en") {
  const v = value.toLowerCase();
  if (v === "scooter") return lang === "id" ? "Skuter" : "Scooter";
  if (v === "sport") return "Sport";
  if (v === "touring") return "Touring";
  if (v === "naked") return lang === "id" ? "Naked Bike" : "Naked Bike";
  return value || "-";
}

function formatPostedDate(value?: string | null, lang: "id" | "en" = "en") {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function normalizeText(value: string) {
  return value.toLowerCase().trim();
}

function dedupeImages(images: string[]) {
  return Array.from(new Set(images.filter(Boolean)));
}

function getProfileName(profile?: ProfileRow | null) {
  return (
    String(
      profile?.full_name ||
        profile?.name ||
        profile?.display_name ||
        profile?.company_name ||
        ""
    ).trim() || ""
  );
}

function getProfileAgency(profile?: ProfileRow | null) {
  return (
    String(
      profile?.agency ||
        profile?.agency_name ||
        profile?.company ||
        profile?.company_name ||
        ""
    ).trim() || ""
  );
}

function getProfileWhatsapp(profile?: ProfileRow | null) {
  return normalizePhone(
    profile?.whatsapp ||
      profile?.whatsapp_number ||
      profile?.phone ||
      profile?.phone_number ||
      ""
  );
}

function mapPostedByType(source?: string | null) {
  const v = String(source || "").toLowerCase();
  if (v === "owner") return "owner" as const;
  if (v === "agent") return "agent" as const;
  return "dealer" as const;
}

function mapBodyType(row: VehicleRow) {
  return String(
    row?.body_type ||
      row?.bodyType ||
      row?.vehicle_body_type ||
      row?.category ||
      ""
  ).trim();
}

function mapVehicleToMotor(
  row: VehicleRow,
  mediaMap: Map<string, string[]>,
  profileMap: Map<string, ProfileRow>,
  lang: "id" | "en"
): MotorListing {
  const userId =
    String(row?.owner_user_id || row?.agent_user_id || row?.user_id || "") || "";
  const profile = profileMap.get(userId) || null;
  const postedByType = mapPostedByType(row?.source || row?.role_snapshot);
  const approved = String(row?.approval_status || "").toLowerCase() === "approved";
  const listingStatus = String(row?.listing_status || "").toLowerCase();

  const images = dedupeImages([
    String(row?.cover_image_url || ""),
    ...(mediaMap.get(String(row?.id || "")) || []),
  ]);

  return {
    verifiedListing: approved,
    ownerVerified: postedByType === "owner" && approved,
    ownerPendingVerification:
      postedByType === "owner" && !approved && listingStatus.includes("pending"),
    dealerVerified: postedByType === "dealer" && approved,
    dealerPendingVerification:
      postedByType === "dealer" && !approved && listingStatus.includes("pending"),
    agentVerified: postedByType === "agent" && approved,
    agentPendingVerification:
      postedByType === "agent" && !approved && listingStatus.includes("pending"),

    spotlight: false,
    featured: Boolean(row?.is_featured),
    boosted: false,

    id: String(row?.id || ""),
    slug: String(row?.slug || row?.id || ""),
    kode: String(row?.kode || row?.listing_code || "-"),
    postedDate: formatPostedDate(row?.created_at, lang),

    title: String(row?.title || "-"),
    priceValue: Number(row?.price || 0),
    province: String(row?.province || "-"),
    area: String(row?.city || row?.area || "-"),

    year: String(row?.year || "-"),
    transmission: String(row?.transmission || "-"),
    fuel: String(row?.fuel || "-"),
    mileage: String(row?.mileage || row?.odometer || "-"),
    bodyType: mapBodyType(row) || "-",

    sellerName:
      getProfileName(profile) ||
      (postedByType === "owner"
        ? lang === "id"
          ? "Pemilik Kendaraan"
          : "Vehicle Owner"
        : postedByType === "agent"
          ? lang === "id"
            ? "Agen Kendaraan"
            : "Vehicle Agent"
          : lang === "id"
            ? "Partner Kendaraan"
            : "Vehicle Partner"),
    agency: getProfileAgency(profile),
    whatsapp:
      getProfileWhatsapp(profile) ||
      normalizePhone(row?.whatsapp || row?.phone || row?.contact_phone || ""),
    images: images.length > 0 ? images : [FALLBACK_MOTOR_IMAGE],

    postedByType,
  };
}

async function fetchMotorsFromSupabase(lang: "id" | "en") {
  let baseRows: VehicleRow[] = [];

  const viewResult = await supabase
    .from("vehicle_marketplace_view")
    .select("*")
    .eq("vehicle_type", "motor")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (viewResult.error) {
    const tableResult = await supabase
      .from("vehicles")
      .select("*")
      .eq("vehicle_type", "motor")
      .eq("approval_status", "approved")
      .eq("listing_status", "active")
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (tableResult.error) throw tableResult.error;
    baseRows = (tableResult.data || []) as VehicleRow[];
  } else {
    baseRows = (viewResult.data || []) as VehicleRow[];
  }

  const vehicleIds = baseRows.map((row) => String(row.id)).filter(Boolean);

  const mediaMap = new Map<string, string[]>();
  if (vehicleIds.length > 0) {
    const mediaResult = await supabase
      .from("vehicle_media")
      .select("*")
      .in("vehicle_id", vehicleIds)
      .eq("media_type", "photo")
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });

    if (!mediaResult.error) {
      const mediaRows = (mediaResult.data || []) as VehicleMediaRow[];
      mediaRows.forEach((media) => {
        const vehicleId = String(media?.vehicle_id || "");
        const current = mediaMap.get(vehicleId) || [];
        const url = String(media?.file_url || media?.public_url || "").trim();
        if (url) {
          current.push(url);
          mediaMap.set(vehicleId, current);
        }
      });
    }
  }

  const userIds = Array.from(
    new Set(
      baseRows
        .map((row) =>
          String(row?.owner_user_id || row?.agent_user_id || row?.user_id || "")
        )
        .filter(Boolean)
    )
  );

  const profileMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const profileResult = await supabase.from("profiles").select("*").in("id", userIds);

    if (!profileResult.error) {
      const profiles = (profileResult.data || []) as ProfileRow[];
      profiles.forEach((profile) => {
        profileMap.set(String(profile.id), profile);
      });
    }
  }

  return baseRows.map((row) => mapVehicleToMotor(row, mediaMap, profileMap, lang));
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
            {lang === "id" ? "Menunggu Verifikasi" : "Pending for Verification"}
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
            {lang === "id" ? "Menunggu Verifikasi" : "Pending for Verification"}
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
          {lang === "id" ? "Menunggu Verifikasi" : "Pending for Verification"}
        </span>
      );
    }

    return null;
  }

  function handleWhatsAppInquiry() {
    if (!p.whatsapp) {
      alert(
        lang === "id"
          ? "Nomor WhatsApp penjual belum tersedia."
          : "The seller WhatsApp number is not available yet."
      );
      return;
    }

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
    window.location.href = `/vehicles/motor/${p.slug || p.id}`;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="relative">
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-24px)] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {p.featured ? (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#B8860B] shadow-md sm:text-[11px]">
                <Crown size={13} className="text-[#FFD700]" />
                FEATURED
              </span>
            ) : null}
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

  const [all, setAll] = useState<MotorListing[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [page, setPage] = useState(1);

  useEffect(() => {
    let ignore = false;

    async function loadMotors() {
      try {
        setLoading(true);
        const rows = await fetchMotorsFromSupabase(lang);

        if (ignore) return;
        setAll(rows);
      } catch (error) {
        console.error("Failed to load motors:", error);
        if (!ignore) setAll([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadMotors();

    return () => {
      ignore = true;
    };
  }, [lang]);

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

  useEffect(() => {
    setPage(1);
  }, [bodyType, marketplaceSearch]);

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

  const filtered = useMemo(() => {
    let list = [...all];

    if (bodyType === "scooter" || bodyType === "sport" || bodyType === "touring") {
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

    return [...list].sort(sortByRanking);
  }, [all, bodyType, marketplaceSearch]);

  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
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
                  ? "Temukan listing motor dari pemilik, dealer, dan agen dengan tampilan Tetamo yang lebih rapi."
                  : "Discover motorbike listings from owners, dealers, and agents with a cleaner Tetamo marketplace experience."}
              </p>
            </div>

            <div className="w-full xl:max-w-[420px]">
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
                    type="button"
                    className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#1C1C1E] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 sm:text-sm"
                    onClick={() => setPage(1)}
                  >
                    {lang === "id" ? "Cari" : "Search"}
                  </button>
                </div>
              </div>
            </div>
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
            disabled={safePage === 1}
            className="inline-flex min-w-[92px] items-center justify-center rounded-2xl border border-gray-200 px-3 py-2.5 text-[13px] font-medium transition hover:bg-gray-50 disabled:opacity-40 sm:min-w-[110px] sm:px-4 sm:py-3 sm:text-sm"
          >
            {lang === "id" ? "Sebelumnya" : "Prev"}
          </button>

          <div className="shrink-0 text-center text-[13px] text-gray-600 sm:text-sm">
            {lang === "id" ? "Halaman" : "Page"}{" "}
            <span className="font-semibold">{safePage}</span> /{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="inline-flex min-w-[92px] items-center justify-center rounded-2xl border border-gray-200 px-3 py-2.5 text-[13px] font-medium transition hover:bg-gray-50 disabled:opacity-40 sm:min-w-[110px] sm:px-4 sm:py-3 sm:text-sm"
          >
            {lang === "id" ? "Berikutnya" : "Next"}
          </button>
        </div>
      </div>
    </main>
  );
}