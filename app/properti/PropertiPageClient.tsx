"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
  Eye,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/trackEvent";
import { createNotification, notifyAdmins } from "@/lib/notifications";

type RentalType = "daily" | "monthly" | "yearly" | "";
type SupportedCurrency = "IDR" | "USD" | "AUD";

type Property = {
  verifiedListing: boolean;

  ownerVerified: boolean;
  ownerPendingVerification: boolean;

  agentVerified: boolean;
  agentPendingVerification: boolean;

  developerVerified: boolean;
  developerPendingApproval: boolean;

  spotlight?: boolean;
  featured?: boolean;
  boosted?: boolean;
  priority?: boolean;

  id: string;
  slug?: string;

  jenisListing: "dijual" | "disewa" | "dijual_disewa" | "lelang";
  rentalType: RentalType;
  saleType?: string;
  propertyType: string;

  kode?: string;
  postedDate?: string;
  sortDateRaw?: string | null;

  title: string;
  titleId?: string;

  description?: string;
  descriptionId?: string;

  viewCount: number;

  priceValue: number;
  salePriceValue: number;
  rentPriceValue: number;

  province: string;
  area: string;

  size: string;
  bed: string;
  furnished: string;

  agentName: string;
  agentPhoto: string;
  agency: string;
  whatsapp: string;

  images: string[];

  postedByType:
    | "owner"
    | "agent"
    | "developer";

  receiverId: string;
  receiverName: string;
  receiverWhatsapp: string;

  rankingScore?: number;
};

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type PropertyRow = {
  id: string;
  slug: string | null;
  kode: string | null;
  posted_date: string | null;

  title: string | null;
  title_id: string | null;
  description: string | null;
  description_id: string | null;
  view_count: number | null;

  price: number | null;
  sale_price: number | null;
  rent_price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  building_size: number | null;
  land_size: number | null;
  bedrooms: number | null;
  furnishing: string | null;
  listing_type: string | null;
  rental_type: string | null;
  sale_type: string | null;
  property_type: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  plan_id: string | null;
  created_at: string | null;
  user_id: string | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;
  featured_expires_at: string | null;
  boost_active: boolean | null;
  boost_expires_at: string | null;
  spotlight_active: boolean | null;
  spotlight_expires_at: string | null;
  transaction_status: string | null;

  contact_user_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_role: string | null;
  contact_agency: string | null;
  property_images: PropertyImageRow[] | null;
};

type SavedRow = {
  property_id: string;
};

type LikeRow = {
  property_id: string;
};

type RatingRow = {
  property_id: string;
  rating: number;
};

type RatingSummary = {
  avg: number;
  count: number;
};

type EngagementSummaryRow = {
  property_id: string;
  save_count: number | string | null;
  like_count: number | string | null;
  rating_count: number | string | null;
  avg_rating: number | string | null;
  share_count: number | string | null;
};

const IDR_PER_USD = 16500;
const IDR_PER_AUD = 12072;

function calculateRanking(p: Property) {
  let score = p.rankingScore ?? 0;

  if (p.spotlight) score += 1000;
  if (p.featured) score += 500;
  if (p.boosted) score += 200;
  if (p.priority) score += 100;
  if (p.ownerVerified) score += 20;
  if (p.agentVerified) score += 10;
  if (p.developerVerified) score += 10;
  if (p.verifiedListing) score += 10;

  return score;
}

function getSortTimestamp(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortByNewestWithinTier(a: Property, b: Property) {
  const dateDiff =
    getSortTimestamp(b.sortDateRaw) - getSortTimestamp(a.sortDateRaw);
  if (dateDiff !== 0) return dateDiff;

  const rankingDiff = calculateRanking(b) - calculateRanking(a);
  if (rankingDiff !== 0) return rankingDiff;

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
  if (currency === "USD") return formatIdr(value);
  if (currency === "AUD") return formatIdr(value);
  return formatUsd(value);
}

function formatPostedDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatCompactNumber(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);
  return new Intl.NumberFormat("en", {
    notation: safeValue >= 1000 ? "compact" : "standard",
    maximumFractionDigits: safeValue >= 1000 ? 1 : 0,
  }).format(safeValue);
}

function mapFurnishing(value?: string | null, lang?: string) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return lang === "id" ? "Full Furnish" : "Full Furnished";
  if (v === "semi") return lang === "id" ? "Semi Furnish" : "Semi Furnished";
  if (v === "unfurnished") return "Unfurnished";

  return value;
}

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";

  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  return d.getTime() > Date.now();
}

function isPromotionActive(flag?: boolean | null, expiresAt?: string | null) {
  return Boolean(flag) && (!expiresAt || isFutureDate(expiresAt));
}

function normalizeTransactionStatus(value?: string | null) {
  const v = (value || "").trim().toLowerCase();
  if (v === "sold") return "sold";
  if (v === "rented") return "rented";
  return "available";
}

function isListingPublic(row: PropertyRow) {
  if (row.status === "rejected") return false;
  if (row.is_paused) return false;

  if (normalizeTransactionStatus(row.transaction_status) !== "available") {
    return false;
  }

  if (row.listing_expires_at && !isFutureDate(row.listing_expires_at)) {
    return false;
  }

  return true;
}

function normalizePostedByType(
  role?: string | null,
  source?: string | null
): "owner" | "agent" | "developer" {
  const value = (role || source || "owner").toLowerCase();

  if (value === "agent") return "agent";
  if (value === "developer") return "developer";
  return "owner";
}

function normalizeRentalType(value?: string | null): RentalType {
  const v = String(value || "").trim().toLowerCase();

  if (v === "daily" || v === "harian") return "daily";
  if (v === "monthly" || v === "bulanan") return "monthly";
  if (v === "yearly" || v === "tahunan") return "yearly";

  return "";
}

function getRentalTypeLabel(
  rentalType: RentalType,
  lang: "id" | "en"
): string {
  if (rentalType === "daily") return lang === "id" ? "Harian" : "Daily";
  if (rentalType === "monthly") return lang === "id" ? "Bulanan" : "Monthly";
  if (rentalType === "yearly") return lang === "id" ? "Tahunan" : "Yearly";

  return "";
}

function rentalTypeBadgeClass(rentalType: RentalType) {
  if (rentalType === "daily") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (rentalType === "monthly") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (rentalType === "yearly") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function normalizeSaleType(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getSaleTypeLabel(value?: string | null, lang?: string) {
  const raw = normalizeSaleType(value);

  if (!raw) return "";

  if (raw === "freehold") return "Freehold";
  if (raw === "leasehold") return "Leasehold";
  if (raw === "hgb") return "HGB";
  if (raw === "hak_pakai") return lang === "id" ? "Hak Pakai" : "Right to Use";
  if (raw === "lainnya") return lang === "id" ? "Lainnya" : "Other";

  return raw
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function saleTypeBadgeClass(value?: string | null) {
  const raw = normalizeSaleType(value);

  if (raw === "leasehold") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (raw === "freehold") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (raw === "hgb" || raw === "hak_pakai") {
    return "border-purple-200 bg-purple-50 text-purple-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function formatPropertyType(value?: string | null, lang?: string) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return lang === "id" ? "Properti" : "Property";

  if (raw === "tanah") return lang === "id" ? "Tanah" : "Land";
  if (raw === "rumah") return lang === "id" ? "Rumah" : "House";
  if (raw === "villa" || raw === "vila") return "Villa";
  if (raw === "studio") return "Studio";
  if (raw === "apartemen") return lang === "id" ? "Apartemen" : "Apartment";
  if (raw === "apartment") return lang === "id" ? "Apartemen" : "Apartment";
  if (raw === "ruko") return lang === "id" ? "Ruko" : "Shophouse";
  if (raw === "rukan") return lang === "id" ? "Rukan" : "Office Unit";
  if (raw === "gudang") return lang === "id" ? "Gudang" : "Warehouse";
  if (raw === "kantor") return lang === "id" ? "Kantor" : "Office";
  if (raw === "kost") return lang === "id" ? "Kost" : "Boarding House";
  if (raw === "kos") return lang === "id" ? "Kos" : "Boarding House";
  if (raw === "guesthouse") return "Guesthouse";
  if (raw === "hotel") return "Hotel";
  if (raw === "resort") return "Resort";
  if (raw === "pabrik") return lang === "id" ? "Pabrik" : "Factory";
  if (raw === "toko") return lang === "id" ? "Toko" : "Shop";
  if (raw === "rukos") return lang === "id" ? "Rukos" : "Shop-Boarding House";

  return raw
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPropertyHref(property: { slug?: string; id: string }) {
  return `/properti/${property.slug || property.id}`;
}

function getLocalizedPropertyTitle(property: Property, lang: string) {
  if (lang === "id") {
    return property.titleId || property.title || "-";
  }

  return property.title || property.titleId || "-";
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

function PropertyCard({
  p,
  saved,
  onToggleSave,
  onShare,
}: {
  p: Property;
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
  onShare: (property: Property) => void;
}) {
  const { lang } = useLanguage();
  const { currency } = useCurrency();

  const currentCurrency: SupportedCurrency =
    currency === "AUD"
      ? "AUD"
      : currency === "USD"
        ? "USD"
        : "IDR";

  const router = useRouter();

  const [idx, setIdx] = useState(0);

  const cardRef =
    useRef<HTMLDivElement | null>(null);

  const cardViewTrackedRef =
    useRef(false);

  const displayTitle =
    getLocalizedPropertyTitle(p, lang);

  const displayPrice =
    formatPriceByCurrency(
      p.priceValue,
      currentCurrency
    );

  const secondaryPrice =
    formatSecondaryPrice(
      p.priceValue,
      currentCurrency
    );

  const saleDisplayPrice =
    formatPriceByCurrency(
      p.salePriceValue,
      currentCurrency
    );

  const saleSecondaryPrice =
    formatSecondaryPrice(
      p.salePriceValue,
      currentCurrency
    );

  const rentDisplayPrice =
    formatPriceByCurrency(
      p.rentPriceValue,
      currentCurrency
    );

  const rentSecondaryPrice =
    formatSecondaryPrice(
      p.rentPriceValue,
      currentCurrency
    );

  const rentalPeriod =
    p.rentalType === "monthly"
      ? lang === "id"
        ? "Bulan"
        : "Month"
      : p.rentalType === "yearly"
        ? lang === "id"
          ? "Tahun"
          : "Year"
        : p.rentalType === "daily"
          ? lang === "id"
            ? "Hari"
            : "Day"
          : "";

  const saleTypeLabel =
    getSaleTypeLabel(
      p.saleType,
      lang
    );

  const next = () =>
    setIdx((prev) =>
      prev === p.images.length - 1
        ? 0
        : prev + 1
    );

  const prev = () =>
    setIdx((prev) =>
      prev === 0
        ? p.images.length - 1
        : prev - 1
    );

  /* =====================================
     CARD VIEW TRACKING
  ===================================== */

  useEffect(() => {
    const node = cardRef.current;

    if (
      !node ||
      cardViewTrackedRef.current
    ) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (
            entry?.isIntersecting &&
            entry.intersectionRatio >= 0.6 &&
            !cardViewTrackedRef.current
          ) {
            cardViewTrackedRef.current = true;

            void trackEvent({
              event_name:
                "property_card_view",

              property_id: p.id,

              source_page:
                "marketplace",

              metadata: {
                property_title:
                  displayTitle,

                property_code:
                  p.kode ?? null,

                listing_type:
                  p.jenisListing,

                rental_type:
                  p.rentalType || null,

                sale_type:
                  p.saleType || null,

                property_type:
                  p.propertyType,

                posted_by_type:
                  p.postedByType,

                area:
                  p.area,

                province:
                  p.province,
              },
            });

            observer.disconnect();
          }
        },

        {
          threshold: [0.6],
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, [
    p.id,
    displayTitle,
    p.kode,
    p.jenisListing,
    p.rentalType,
    p.saleType,
    p.propertyType,
    p.postedByType,
    p.area,
    p.province,
  ]);

  /* =====================================
     POSTED BY LABEL
  ===================================== */

  function postedByLabel() {
    if (lang === "id") {
      if (
        p.postedByType === "owner"
      ) {
        return "Pemilik";
      }

      if (
        p.postedByType ===
        "developer"
      ) {
        return "Developer";
      }

      return "Agen";
    }

    if (
      p.postedByType === "owner"
    ) {
      return "Owner";
    }

    if (
      p.postedByType ===
      "developer"
    ) {
      return "Developer";
    }

    return "Agent";
  }

  /* =====================================
     PROMOTION BADGE
  ===================================== */

  function renderPromotionBadge() {
    if (p.spotlight) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#111111]/95 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-white shadow-lg backdrop-blur-md sm:text-[10px]">
          <Gem
            size={12}
            className="text-[#D8B46A]"
          />

          Spotlight
        </span>
      );
    }

    if (p.featured) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D8B46A] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#111111] shadow-lg sm:text-[10px]">
          <Crown size={12} />

          Featured
        </span>
      );
    }

    if (p.boosted) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8B46A]/40 bg-[#F8F2E5]/95 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#8A650B] shadow-lg backdrop-blur-md sm:text-[10px]">
          <Zap size={12} />

          Boost
        </span>
      );
    }

    return null;
  }

  /* =====================================
     VERIFICATION BADGE
  ===================================== */

  function renderVerificationBadge() {
    if (
      p.postedByType === "agent"
    ) {
      if (p.agentVerified) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold text-[#1C1C1E] shadow-lg backdrop-blur-md sm:text-[10px]">
            <UserCheck
              size={12}
              className="text-[#B8860B]"
            />

            {lang === "id"
              ? "Agen Terverifikasi"
              : "Verified Agent"}
          </span>
        );
      }

      if (
        p.agentPendingVerification
      ) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold text-gray-600 shadow-lg backdrop-blur-md sm:text-[10px]">
            <Clock size={12} />

            {lang === "id"
              ? "Menunggu Verifikasi"
              : "Pending Verification"}
          </span>
        );
      }

      return null;
    }

    if (
      p.postedByType ===
      "developer"
    ) {
      if (
        p.developerVerified
      ) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold text-[#1C1C1E] shadow-lg backdrop-blur-md sm:text-[10px]">
            <ShieldCheck
              size={12}
              className="text-[#B8860B]"
            />

            {lang === "id"
              ? "Developer Terverifikasi"
              : "Verified Developer"}
          </span>
        );
      }

      if (
        p.developerPendingApproval
      ) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold text-gray-600 shadow-lg backdrop-blur-md sm:text-[10px]">
            <Clock size={12} />

            {lang === "id"
              ? "Menunggu Persetujuan"
              : "Pending Approval"}
          </span>
        );
      }

      return null;
    }

    if (p.ownerVerified) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold text-[#1C1C1E] shadow-lg backdrop-blur-md sm:text-[10px]">
          <ShieldCheck
            size={12}
            className="text-[#B8860B]"
          />

          {lang === "id"
            ? "Pemilik Terverifikasi"
            : "Verified Owner"}
        </span>
      );
    }

    if (
      p.ownerPendingVerification
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[9px] font-bold text-gray-600 shadow-lg backdrop-blur-md sm:text-[10px]">
          <Clock size={12} />

          {lang === "id"
            ? "Menunggu Verifikasi"
            : "Pending Verification"}
        </span>
      );
    }

    return null;
  }

  /* =====================================
     MARKETPLACE TRACKING
  ===================================== */

  function trackMarketplaceClick(
    event_name:
      | "property_whatsapp_click"
      | "property_view_detail_click"
      | "property_schedule_viewing_click",

    property: Property,

    extraMetadata: Record<
      string,
      any
    > = {}
  ) {
    const propertyTitle =
      getLocalizedPropertyTitle(
        property,
        lang
      );

    void trackEvent({
      event_name,

      property_id:
        property.id,

      source_page:
        "marketplace",

      metadata: {
        property_title:
          propertyTitle,

        property_code:
          property.kode ?? null,

        listing_type:
          property.jenisListing,

        rental_type:
          property.rentalType ||
          null,

        sale_type:
          property.saleType ||
          null,

        property_type:
          property.propertyType,

        posted_by_type:
          property.postedByType,

        area:
          property.area,

        province:
          property.province,

        ...extraMetadata,
      },
    });
  }

  /* =====================================
     REQUIRE LOGIN
  ===================================== */

  async function requireLogin(
    nextPath: string
  ) {
    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      alert(
        lang === "id"
          ? "Silakan login terlebih dahulu."
          : "Please log in first."
      );

      router.push(
        `/login?next=${encodeURIComponent(
          nextPath
        )}`
      );

      return null;
    }

    return user;
  }

  /* =====================================
     WHATSAPP
  ===================================== */

  async function handleWhatsAppInquiry(
    property: Property
  ) {
    const user =
      await requireLogin(
        getPropertyHref(property)
      );

    if (!user) return;

    if (
      !property.receiverWhatsapp
    ) {
      alert(
        lang === "id"
          ? "Nomor WhatsApp penjual belum tersedia."
          : "Seller WhatsApp number is not available yet."
      );

      return;
    }

    const propertyTitle =
      getLocalizedPropertyTitle(
        property,
        lang
      );

    const message =
      lang === "id"
        ? `Halo ${property.receiverName}, saya tertarik dengan properti ini di TETAMO.

Properti: ${propertyTitle}
Kode: ${property.kode ?? "-"}
Lokasi: ${property.area}, ${property.province}
Harga: ${displayPrice}

Apakah properti ini masih tersedia?`
        : `Hello ${property.receiverName}, I'm interested in this property on TETAMO.

Property: ${propertyTitle}
Code: ${property.kode ?? "-"}
Location: ${property.area}, ${property.province}
Price: ${displayPrice}

Is this property still available?`;

    const whatsappURL =
      `https://wa.me/${property.receiverWhatsapp}` +
      `?text=${encodeURIComponent(
        message
      )}`;

    const popup =
      window.open(
        "about:blank",
        "_blank"
      );

    try {
      await trackEvent({
        event_name:
          "property_whatsapp_click",

        property_id:
          property.id,

        user_id:
          user.id,

        source_page:
          "marketplace",

        metadata: {
          button:
            "whatsapp",

          property_title:
            propertyTitle,

          property_code:
            property.kode ?? null,

          listing_type:
            property.jenisListing,

          rental_type:
            property.rentalType ||
            null,

          sale_type:
            property.saleType ||
            null,

          property_type:
            property.propertyType,

          posted_by_type:
            property.postedByType,

          area:
            property.area,

          province:
            property.province,

          receiver_id:
            property.receiverId ||
            null,

          receiver_name:
            property.receiverName ||
            null,
        },
      });

      let senderProfile:
        | {
            full_name:
              | string
              | null;

            phone:
              | string
              | null;

            email:
              | string
              | null;
          }
        | null = null;

      const {
        data: profileData,

        error:
          senderProfileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, email"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

      if (
        senderProfileError
      ) {
        console.error(
          "Failed to load sender profile:",
          senderProfileError
        );
      } else {
        senderProfile =
          profileData;
      }

      const leadPayload = {
        property_id:
          property.id,

        property_code:
          property.kode ?? null,

        property_title:
          propertyTitle,

        sender_user_id:
          user.id,

        sender_name:
          senderProfile?.full_name ||
          (typeof user
            .user_metadata
            ?.full_name ===
          "string"
            ? user.user_metadata
                .full_name
            : null),

        sender_email:
          senderProfile?.email ||
          user.email ||
          null,

        sender_phone:
          senderProfile?.phone ||
          null,

        receiver_user_id:
          property.receiverId ||
          null,

        receiver_name:
          property.receiverName ||
          null,

        receiver_role:
          property.postedByType ||
          "owner",

        assigned_admin_user_id:
          null,

        admin_visible:
          true,

        lead_type:
          "whatsapp",

        source:
          "whatsapp_button",

        message,

        viewing_date:
          null,

        viewing_time:
          null,

        status:
          "new",

        priority:
          "normal",

        notes:
          null,
      };

      const {
        data: insertedLead,
        error,
      } = await supabase
        .from("leads")
        .insert(leadPayload)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error(
          "Marketplace WhatsApp lead insert error:",
          error
        );
      } else if (
        insertedLead?.id
      ) {
        await trackEvent({
          event_name:
            "lead_created",

          property_id:
            property.id,

          user_id:
            user.id,

          source_page:
            "marketplace",

          lead_id:
            String(
              insertedLead.id
            ),

          metadata: {
            lead_type:
              "whatsapp",

            source:
              "whatsapp_button",

            property_title:
              propertyTitle,

            property_code:
              property.kode ??
              null,
          },
        });

        try {
          if (
            property.receiverId
          ) {
            await createNotification(
              {
                userId:
                  property.receiverId,

                relatedUserId:
                  user.id,

                propertyId:
                  property.id,

                leadId:
                  insertedLead.id,

                type:
                  "new_whatsapp_inquiry",

                title:
                  "New WhatsApp inquiry",

                body:
                  lang === "id"
                    ? `Ada WhatsApp inquiry baru untuk "${propertyTitle}".`
                    : `There is a new WhatsApp inquiry for "${propertyTitle}".`,

                audience:
                  "user",

                priority:
                  "high",
              }
            );
          }

          await notifyAdmins({
            relatedUserId:
              user.id,

            propertyId:
              property.id,

            leadId:
              insertedLead.id,

            type:
              "new_whatsapp_inquiry",

            title:
              "New WhatsApp inquiry",

            body:
              `New WhatsApp inquiry for "${propertyTitle}".`,

            priority:
              "high",
          });
        } catch (
          notifyError
        ) {
          console.error(
            "Failed to notify marketplace WhatsApp inquiry:",
            notifyError
          );
        }
      }
    } catch (err) {
      console.error(
        "Failed to create marketplace WhatsApp lead:",
        err
      );
    } finally {
      if (popup) {
        popup.location.href =
          whatsappURL;
      } else {
        window.location.href =
          whatsappURL;
      }
    }
  }

  /* =====================================
     SCHEDULE VIEWING
  ===================================== */

  async function handleScheduleViewing(
    property: Property
  ) {
    const user =
      await requireLogin(
        getPropertyHref(property)
      );

    if (!user) return;

    trackMarketplaceClick(
      "property_schedule_viewing_click",
      property,
      {
        button:
          "schedule_viewing",
      }
    );

    router.push(
      getPropertyHref(property)
    );
  }

  const promoTheme = p.spotlight
  ? {
      border:
        "border-cyan-300/70",
      hoverBorder:
        "hover:border-cyan-300",
      glowMain:
        "bg-cyan-400/28",
      glowSoft:
        "bg-sky-300/18",
      cornerLine:
        "bg-cyan-300",
    }
  : p.featured
    ? {
        border:
          "border-[#D8B46A]/65",
        hoverBorder:
          "hover:border-[#D8B46A]",
        glowMain:
          "bg-[#D8B46A]/28",
        glowSoft:
          "bg-amber-300/18",
        cornerLine:
          "bg-[#D8B46A]",
      }
    : p.boosted
      ? {
          border:
            "border-orange-300/60",
          hoverBorder:
            "hover:border-orange-300",
          glowMain:
            "bg-orange-300/24",
          glowSoft:
            "bg-amber-200/18",
          cornerLine:
            "bg-orange-300",
        }
      : {
          border:
            "border-gray-200",
          hoverBorder:
            "hover:border-gray-300",
          glowMain:
            "bg-gray-300/18",
          glowSoft:
            "bg-gray-200/10",
          cornerLine:
            "bg-gray-300",
        };

  /* =====================================
     CARD
  ===================================== */

  return (
    <article
  ref={cardRef}
  className={[
    "group relative overflow-hidden rounded-[28px] border bg-white transition-all duration-500",
    promoTheme.border,
    promoTheme.hoverBorder,
    "shadow-[0_12px_32px_rgba(0,0,0,0.06)]",
    "hover:-translate-y-2 hover:scale-[1.01] hover:shadow-[0_30px_80px_rgba(0,0,0,0.14)]",
  ].join(" ")}
>

    {/* =================================
      FLOATING PROMO GLOW
  ================================= */}
  <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">

    {/* TOP RIGHT MAIN GLOW */}
    <div
      className={[
        "absolute -right-16 -top-16 h-40 w-40 rounded-full blur-[55px] transition-all duration-700",
        promoTheme.glowMain,
        "group-hover:-right-8 group-hover:-top-10 group-hover:h-52 group-hover:w-52 group-hover:blur-[70px]",
      ].join(" ")}
    />

    {/* SECOND SOFT GLOW */}
    <div
      className={[
        "absolute right-10 top-10 h-24 w-24 rounded-full blur-[35px] transition-all duration-700",
        promoTheme.glowSoft,
        "group-hover:right-2 group-hover:top-4 group-hover:h-32 group-hover:w-32 group-hover:blur-[45px]",
      ].join(" ")}
    />

    {/* SUBTLE BOTTOM LIGHT */}
    <div
      className={[
        "absolute -bottom-10 -left-10 h-24 w-24 rounded-full blur-[35px] transition-all duration-700",
        promoTheme.glowSoft,
        "group-hover:-bottom-6 group-hover:-left-6 group-hover:h-32 group-hover:w-32",
      ].join(" ")}
    />

    {/* ACCENT CORNER LINE */}
    <div className="absolute right-0 top-0 h-20 w-20 overflow-hidden">
      <div
        className={[
          "absolute right-[-18px] top-[16px] h-[2px] w-[92px] rotate-45 opacity-70 transition-all duration-500",
          promoTheme.cornerLine,
          "group-hover:right-[-8px] group-hover:top-[10px] group-hover:w-[110px]",
        ].join(" ")}
      />
    </div>
  </div>

      {/* =================================
          PROPERTY IMAGE
      ================================= */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F2F0EB]">

        <Link
          href={getPropertyHref(p)}
          className="block h-full w-full"
          onClick={() =>
            trackMarketplaceClick(
              "property_view_detail_click",
              p,
              {
                button:
                  "property_image",
              }
            )
          }
        >
          <img
            src={p.images[idx]}
            alt={displayTitle}
           className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.06] group-hover:-translate-y-1"
          />
        </Link>

        {/* subtle photo gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

        {/* PROMOTION */}
        <div className="absolute left-4 top-4 z-20">
          {renderPromotionBadge()}
        </div>

        {/* VERIFIED */}
        <div className="absolute right-4 top-4 z-20">
          {renderVerificationBadge()}
        </div>

        {/* IMAGE ARROWS */}
        {p.images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-lg text-white backdrop-blur-md transition hover:bg-black/75"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-lg text-white backdrop-blur-md transition hover:bg-black/75"
            >
              ›
            </button>
          </>
        ) : null}

        {/* LISTING DETAILS OVER PHOTO */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center gap-2">

          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#1C1C1E] shadow-sm">
            {p.jenisListing === "dijual_disewa"
              ? lang === "id"
                ? "Dijual + Disewa"
                : "For Sale + For Rent"
              : p.jenisListing === "lelang"
                ? lang === "id"
                  ? "Lelang"
                  : "Auction"
                : p.jenisListing === "dijual"
                  ? lang === "id"
                    ? "Dijual"
                    : "For Sale"
                  : lang === "id"
                    ? "Disewa"
                    : "For Rent"}
          </span>

          {(p.jenisListing === "disewa" ||
            p.jenisListing === "dijual_disewa") &&
          p.rentalType ? (
            <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
              {getRentalTypeLabel(
                p.rentalType,
                lang
              )}
            </span>
          ) : null}

          {(p.jenisListing === "dijual" ||
            p.jenisListing === "dijual_disewa" ||
            p.jenisListing === "lelang") &&
          saleTypeLabel ? (
            <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
              {saleTypeLabel}
            </span>
          ) : null}

          <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md">
            {formatPropertyType(
              p.propertyType,
              lang
            )}
          </span>

        </div>
      </div>

      {/* =================================
          CONTENT
      ================================= */}
      {/* =================================
    CONTENT
================================= */}
<div className="p-5">

  {/* =================================
      PRICE + QUICK ACTIONS
  ================================= */}
  <div className="flex items-start justify-between gap-5">

    {/* PRICE */}
    <div className="min-w-0">
      {p.jenisListing === "dijual_disewa" ? (
        <div className="space-y-3">
          <div>
            <p className="text-[20px] font-extrabold leading-tight tracking-[-0.035em] text-[#1C1C1E] sm:text-[22px]">
              {saleDisplayPrice} — {lang === "id" ? "Dijual" : "For Sale"}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-400">
              ≈ {saleSecondaryPrice}
            </p>
          </div>

          <div>
            <p className="text-[17px] font-bold leading-tight text-[#1C1C1E] sm:text-[19px]">
              {rentDisplayPrice}
              {rentalPeriod ? ` / ${rentalPeriod}` : ""} —{" "}
              {lang === "id" ? "Disewa" : "For Rent"}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-400">
              ≈ {rentSecondaryPrice}
              {rentalPeriod ? ` / ${rentalPeriod}` : ""}
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[22px] font-extrabold leading-none tracking-[-0.035em] text-[#1C1C1E] sm:text-[24px]">
            {displayPrice}
          </p>

          <p className="mt-2 text-xs font-semibold text-gray-400">
            ≈ {secondaryPrice}
          </p>
        </>
      )}
    </div>

    {/* SAVE / SHARE */}
    <div className="flex shrink-0 items-center gap-2">

      <button
        type="button"
        onClick={() =>
          onToggleSave(p.id)
        }
        aria-label={
          lang === "id"
            ? "Simpan properti"
            : "Save property"
        }
        title={
          lang === "id"
            ? "Simpan"
            : "Save"
        }
        className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
          saved
            ? "border-[#D8B46A] bg-[#F8F2E5] text-[#B8860B]"
            : "border-gray-200 bg-white text-gray-500 hover:border-[#D8B46A] hover:text-[#B8860B]"
        }`}
      >
        <Bookmark
          className="h-4 w-4"
          fill={
            saved
              ? "currentColor"
              : "none"
          }
        />
      </button>

      <button
        type="button"
        onClick={() =>
          onShare(p)
        }
        aria-label={
          lang === "id"
            ? "Bagikan properti"
            : "Share property"
        }
        title={
          lang === "id"
            ? "Bagikan"
            : "Share"
        }
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-[#D8B46A] hover:text-[#B8860B]"
      >
        <Share2 className="h-4 w-4" />
      </button>

    </div>
  </div>

  {/* =================================
      LOCATION
  ================================= */}
  <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[#B8860B]">
    {p.area},{" "}
    {p.province}
  </p>

  {/* =================================
      TITLE
  ================================= */}
  <Link
    href={getPropertyHref(p)}
    onClick={() =>
      trackMarketplaceClick(
        "property_view_detail_click",
        p,
        {
          button:
            "property_title",
        }
      )
    }
    className="mt-2 block"
  >
    <h3 className="line-clamp-2 min-h-[48px] text-[16px] font-extrabold leading-6 text-[#1C1C1E] transition group-hover:text-[#8D680C]">
      {displayTitle}
    </h3>
  </Link>

  {/* =================================
      PROPERTY SPECS
  ================================= */}
  <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-gray-600">

    <span>
      {p.size}
    </span>

    <span className="text-[#D8B46A]">
      •
    </span>

    <span>
      {p.bed.replace(
        "Kamar",
        lang === "id"
          ? "Kamar"
          : "Bed"
      )}
    </span>

    <span className="text-[#D8B46A]">
      •
    </span>

    <span>
      {p.furnished}
    </span>

  </div>

  {/* =================================
      AGENT / OWNER / DEVELOPER PROFILE
  ================================= */}
  <div className="mt-5 flex items-center gap-3 rounded-[20px] border border-[#EEE9DF] bg-[#F8F6F1] p-3">

    {/* PROFILE PHOTO */}
    <img
      src={p.agentPhoto}
      alt={p.agentName}
      className="h-12 w-12 shrink-0 rounded-full border-2 border-white bg-white object-cover shadow-sm"
    />

    {/* PROFILE INFO */}
    <div className="min-w-0 flex-1">

      <div className="flex items-center gap-2">

        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#B8860B]">
          {postedByLabel()}
        </p>

        {(p.agentVerified ||
          p.ownerVerified ||
          p.developerVerified) && (
          <ShieldCheck className="h-3.5 w-3.5 text-[#B8860B]" />
        )}

      </div>

      <p className="mt-1 truncate text-sm font-extrabold text-[#1C1C1E]">
        {p.agentName}
      </p>

      {p.agency ? (
        <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500">
          {p.agency}
        </p>
      ) : (
        <p className="mt-0.5 text-[11px] font-medium text-gray-400">
          {p.postedByType ===
          "owner"
            ? lang === "id"
              ? "Pemilik langsung"
              : "Direct owner"
            : p.postedByType ===
                "developer"
              ? "Developer"
              : lang === "id"
                ? "Agen independen"
                : "Independent agent"}
        </p>
      )}

    </div>

  </div>

  {/* =================================
      PROPERTY METADATA
  ================================= */}
  <div className="mt-5 grid grid-cols-2 gap-3 border-b border-gray-100 pb-5">

    {/* PROPERTY CODE */}
    <div>
      <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
        {lang === "id"
          ? "Kode Properti"
          : "Property Code"}
      </p>

      <p className="mt-1.5 text-xs font-extrabold text-[#1C1C1E]">
        {p.kode || "-"}
      </p>
    </div>

    {/* POSTED DATE */}
    <div className="text-right">
      <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
        {lang === "id"
          ? "Tanggal Dipasang"
          : "Posted Date"}
      </p>

      <p className="mt-1.5 text-xs font-extrabold text-[#1C1C1E]">
        {p.postedDate || "-"}
      </p>
    </div>

  </div>

  {/* =================================
      VIEW PROPERTY
  ================================= */}
  <Link
    href={getPropertyHref(p)}
    onClick={() =>
      trackMarketplaceClick(
        "property_view_detail_click",
        p,
        {
          button:
            "view_property",
        }
      )
    }
    className="group/button mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[16px] bg-[#D8B46A] px-5 text-sm font-extrabold text-[#111111] transition hover:bg-[#C59F4F]"
  >
    {lang === "id"
      ? "Lihat Properti"
      : "View Property"}

    <span className="transition group-hover/button:translate-x-1">
      →
    </span>
  </Link>

  {/* =================================
      CONTACT ACTIONS
  ================================= */}
  <div className="mt-3 grid grid-cols-2 gap-3">

    <button
      type="button"
      onClick={() =>
        handleWhatsAppInquiry(p)
      }
      className="min-h-[45px] rounded-[15px] bg-[#1C1C1E] px-3 text-xs font-extrabold text-white transition hover:bg-black sm:text-[13px]"
    >
      WhatsApp
    </button>

    <button
      type="button"
      onClick={() =>
        handleScheduleViewing(p)
      }
      className="min-h-[45px] rounded-[15px] border border-gray-200 bg-white px-3 text-xs font-extrabold text-[#1C1C1E] transition hover:border-[#D8B46A] hover:bg-[#F8F6F1] sm:text-[13px]"
    >
      {lang === "id"
        ? "Jadwal Viewing"
        : "Schedule Viewing"}
    </button>

  </div>

</div>

    </article>
  );
}

function MarketplacePromoSidebar() {
  const { lang } = useLanguage();

  const appStoreUrl =
    "https://apps.apple.com/us/app/tetamo/id6753583699";

  const playStoreUrl =
    "https://play.google.com/store/apps/details?id=com.tetamo.mobile";

  const affiliateMessage =
    lang === "id"
      ? "Halo Tetamo, saya ingin mengetahui lebih lanjut tentang program Affiliate Tetamo dan cara membantu agen atau pemilik memasang properti."
      : "Hello Tetamo, I would like to learn more about the Tetamo Affiliate program and how I can help agents or owners list properties.";

  const affiliateWhatsappUrl =
    `https://wa.me/628133947717?text=${encodeURIComponent(
      affiliateMessage
    )}`;

  const developerSubject =
    "Tetamo Developer License";

  const developerBody =
    lang === "id"
      ? `Halo Tetamo,

Saya ingin mendapatkan informasi mengenai Developer License Tetamo dan cara mendaftarkan akun developer atau proyek properti.

Nama:
Perusahaan:
Nomor WhatsApp:
Nama Proyek:

Terima kasih.`
      : `Hello Tetamo,

I would like more information about the Tetamo Developer License and how to register a developer account or property project.

Name:
Company:
WhatsApp:
Project Name:

Thank you.`;

  const developerEmailUrl =
    `mailto:support@tetamo.com?subject=${encodeURIComponent(
      developerSubject
    )}&body=${encodeURIComponent(
      developerBody
    )}`;

  return (
    <aside className="space-y-5">

      {/* =====================================
          01 — LIST PROPERTY
      ===================================== */}
      <div className="relative overflow-hidden rounded-[30px] border border-[#E5DDCE] bg-[#F7F3EA] p-7">

        {/* WIDE GOLD GLOW */}
        <div className="pointer-events-none absolute -right-28 -top-24 h-64 w-64 rounded-full bg-[#D8B46A]/20 blur-[85px]" />

        <div className="pointer-events-none absolute -bottom-24 -left-24 h-52 w-52 rounded-full bg-[#B8860B]/10 blur-[90px]" />

        <div className="relative z-10">

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1C1C1E] text-[#D8B46A] shadow-sm">
            <Crown size={19} />
          </div>

          <p className="mt-6 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#B8860B]">
            {lang === "id"
              ? "Pasang Properti"
              : "List Your Property"}
          </p>

          <h3 className="mt-2 text-[25px] font-extrabold leading-[1.08] tracking-[-0.04em] text-[#1C1C1E]">
            {lang === "id"
              ? "Jangkau lebih banyak pencari properti."
              : "Reach more property seekers."}
          </h3>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            {lang === "id"
              ? "Promosikan properti Anda di Tetamo sebagai pemilik atau agen dan terhubung langsung dengan calon pembeli maupun penyewa."
              : "Promote your property on Tetamo as an owner or agent and connect directly with buyers and renters."}
          </p>

          <div className="mt-6 border-t border-[#DED5C6] pt-5">

            <div className="space-y-3 text-xs font-semibold text-gray-600">

              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#B8860B]" />
                <span>
                  {lang === "id"
                    ? "Listing lebih profesional"
                    : "Professional listings"}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#B8860B]" />
                <span>Direct WhatsApp</span>
              </div>

              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#B8860B]" />
                <span>
                  {lang === "id"
                    ? "Jadwalkan viewing"
                    : "Schedule viewings"}
                </span>
              </div>

            </div>

          </div>

          <Link
            href="/pricelist"
            className="group mt-7 flex min-h-[50px] w-full items-center justify-between rounded-[16px] bg-[#D8B46A] px-5 text-sm font-extrabold text-[#111111] transition hover:bg-[#C59F4F]"
          >
            <span>
              {lang === "id"
                ? "Pasang Properti"
                : "List Property"}
            </span>

            <span className="transition group-hover:translate-x-1">
              →
            </span>
          </Link>

        </div>
      </div>

      {/* =====================================
          02 — TETAMO APP
      ===================================== */}
      <div className="relative overflow-hidden rounded-[30px] border border-[#D8B46A]/30 bg-[#101010] p-7 text-white">

        {/* LARGE FLOATING GLOW */}
        <div className="pointer-events-none absolute -right-36 -top-20 h-80 w-80 rounded-full bg-[#D8B46A]/20 blur-[105px]" />

        <div className="pointer-events-none absolute -bottom-36 -left-28 h-72 w-72 rounded-full bg-[#B8860B]/10 blur-[110px]" />

        <div className="relative z-10">

          <div className="flex items-start justify-between gap-5">

            <div className="min-w-0">

              <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#D8B46A]">
                TETAMO APP
              </p>

              <h3 className="mt-2 text-[25px] font-extrabold leading-[1.08] tracking-[-0.04em] text-white">
                {lang === "id"
                  ? "Properti dalam genggaman Anda."
                  : "Property in your hands."}
              </h3>

            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8B46A]/30 bg-[#D8B46A]/10 text-[#D8B46A]">
              <Zap size={18} />
            </div>

          </div>

          <p className="mt-4 text-sm leading-6 text-white/55">
            {lang === "id"
              ? "Cari properti, hubungi pemilik atau agen, jadwalkan viewing dan kelola listing langsung melalui aplikasi Tetamo."
              : "Find properties, contact owners or agents, schedule viewings and manage listings through the Tetamo app."}
          </p>

          {/* APP VISUAL */}
          <div className="relative mt-6 h-[185px] overflow-hidden rounded-[22px] border border-white/10 bg-[#080808]">

            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#D8B46A]/20 blur-[60px]" />

            <div className="absolute bottom-6 left-5 z-10 max-w-[135px]">

              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#D8B46A]">
                iOS · Android
              </p>

              <p className="mt-2 text-xs font-bold leading-5 text-white/75">
                {lang === "id"
                  ? "Cari properti kapan saja, di mana saja."
                  : "Find property anytime, anywhere."}
              </p>

            </div>

            <img
              src="/app-showcase/tetamo-home.png"
              alt="Tetamo mobile app"
              className="absolute -bottom-20 right-4 w-[135px] rotate-[4deg] rounded-[20px] border border-white/15 shadow-2xl"
            />

          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">

            <a
              href={appStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[46px] items-center justify-center rounded-[14px] bg-white px-3 text-center text-[11px] font-extrabold text-[#111111] transition hover:bg-[#D8B46A]"
            >
              App Store
            </a>

            <a
              href={playStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[46px] items-center justify-center rounded-[14px] border border-white/15 bg-white/[0.06] px-3 text-center text-[11px] font-extrabold text-white transition hover:border-[#D8B46A] hover:text-[#D8B46A]"
            >
              Google Play
            </a>

          </div>

        </div>
      </div>

      {/* =====================================
          03 — AFFILIATE
      ===================================== */}
      <div className="relative overflow-hidden rounded-[30px] border border-[#E5DDCE] bg-white p-7">

        <div className="pointer-events-none absolute -right-28 -bottom-28 h-64 w-64 rounded-full bg-[#D8B46A]/12 blur-[90px]" />

        <div className="relative z-10">

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F6F1E7] text-[#B8860B]">
            <UserCheck size={19} />
          </div>

          <p className="mt-6 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#B8860B]">
            TETAMO AFFILIATE
          </p>

          <h3 className="mt-2 text-[24px] font-extrabold leading-[1.1] tracking-[-0.04em] text-[#1C1C1E]">
            {lang === "id"
              ? "Bantu agen & pemilik memasang properti."
              : "Help agents & owners list property."}
          </h3>

          <p className="mt-4 text-sm leading-6 text-gray-600">
            {lang === "id"
              ? "Gabung program Affiliate Tetamo dan bantu proses pemasangan listing properti."
              : "Join the Tetamo Affiliate program and help with property listing submissions."}
          </p>

          <div className="mt-6 rounded-[20px] border border-[#EEE7DA] bg-[#F8F6F1] p-4">

            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#B8860B]">
              {lang === "id"
                ? "Peluang Penghasilan"
                : "Income Opportunity"}
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-600">
              {lang === "id"
                ? "Bantu proses listing dan dapatkan fee sesuai program Affiliate Tetamo."
                : "Assist with listings and earn fees through the Tetamo Affiliate program."}
            </p>

          </div>

          <a
            href={affiliateWhatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="group mt-6 flex min-h-[50px] w-full items-center justify-between rounded-[16px] bg-[#1C1C1E] px-5 text-sm font-extrabold text-white transition hover:bg-black"
          >
            <span>
              {lang === "id"
                ? "Tanya via WhatsApp"
                : "Ask via WhatsApp"}
            </span>

            <span className="text-[#D8B46A] transition group-hover:translate-x-1">
              →
            </span>
          </a>

        </div>
      </div>

      {/* =====================================
          04 — DEVELOPER
      ===================================== */}
      <div className="relative overflow-hidden rounded-[30px] border border-[#D8B46A]/35 bg-[#151515] p-7 text-white">

        {/* LARGE GOLD ATMOSPHERE */}
        <div className="pointer-events-none absolute -right-36 -top-28 h-80 w-80 rounded-full bg-[#D8B46A]/20 blur-[105px]" />

        <div className="pointer-events-none absolute -bottom-32 -left-28 h-72 w-72 rounded-full bg-[#B8860B]/10 blur-[110px]" />

        {/* geometric accent */}
        <div className="pointer-events-none absolute right-[-60px] top-[65px] h-48 w-48 rotate-45 border border-[#D8B46A]/15" />

        <div className="pointer-events-none absolute right-[-20px] top-[105px] h-48 w-48 rotate-45 border border-[#D8B46A]/10" />

        <div className="relative z-10">

          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D8B46A]/35 bg-[#D8B46A]/10 text-[#D8B46A]">
            <ShieldCheck size={19} />
          </div>

          <p className="mt-6 text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#D8B46A]">
            TETAMO DEVELOPER
          </p>

          <h3 className="mt-2 text-[25px] font-extrabold leading-[1.08] tracking-[-0.04em] text-white">
            {lang === "id"
              ? "Promosikan proyek development Anda."
              : "Promote your property development."}
          </h3>

          <p className="mt-4 text-sm leading-6 text-white/55">
            {lang === "id"
              ? "Untuk developer perumahan, apartemen, vila, kawasan komersial dan proyek properti lainnya di Indonesia."
              : "For residential, apartment, villa, commercial and other property developments across Indonesia."}
          </p>

          <div className="mt-6 border-y border-white/10 py-5">

            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#D8B46A]">
              Developer License
            </p>

            <p className="mt-2 text-xs leading-5 text-white/60">
              {lang === "id"
                ? "Daftarkan akun Developer Tetamo dan tampilkan proyek Anda melalui marketplace Tetamo."
                : "Register a Tetamo Developer account and showcase your projects through the Tetamo marketplace."}
            </p>

          </div>

          <a
            href={developerEmailUrl}
            className="group mt-6 flex min-h-[50px] w-full items-center justify-between rounded-[16px] bg-[#D8B46A] px-5 text-sm font-extrabold text-[#111111] transition hover:bg-[#C59F4F]"
          >
            <span>
              {lang === "id"
                ? "Hubungi Developer Support"
                : "Developer Support"}
            </span>

            <span className="transition group-hover:translate-x-1">
              →
            </span>
          </a>

          <p className="mt-4 text-center text-[10px] font-semibold tracking-wide text-white/35">
            support@tetamo.com
          </p>

        </div>
      </div>

    </aside>
  );
}


export default function PropertiPageClient({
  initialProperties = [],
}: {
  initialProperties?: Property[];
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const jenisListing = sp.get("jenisListing");
  const selectedRentalType = normalizeRentalType(sp.get("rentalType"));

  const [all, setAll] = useState<Property[]>(initialProperties);
  const [loading, setLoading] = useState(initialProperties.length === 0);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
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
    let mounted = true;

    async function loadAuthUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setAuthUserId(user?.id ?? null);
    }

    loadAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
  let ignore = false;

  async function loadProperties() {
    setLoading(true);

    /* =====================================
       LOAD PROPERTY LISTINGS
    ===================================== */

    const {
      data,
      error,
    } = await supabase
      .from("properties")
      .select(`
        id,
        slug,
        kode,
        posted_date,
        title,
        title_id,
        description,
        description_id,
        view_count,
        price,
        sale_price,
        rent_price,
        province,
        city,
        area,
        building_size,
        land_size,
        bedrooms,
        furnishing,
        listing_type,
        rental_type,
        sale_type,
        property_type,
        source,
        status,
        verification_status,
        verified_ok,
        plan_id,
        created_at,
        user_id,
        is_paused,
        listing_expires_at,
        featured_expires_at,
        boost_active,
        boost_expires_at,
        spotlight_active,
        spotlight_expires_at,
        transaction_status,
        contact_user_id,
        contact_name,
        contact_phone,
        contact_role,
        contact_agency,
        property_images (
          image_url,
          sort_order,
          is_cover
        )
      `)
      .neq("status", "rejected")
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.warn(
        "Failed to load marketplace properties:",
        error
      );

      if (!ignore) {
        setAll([]);
        setLoading(false);
      }

      return;
    }

    const rows = (
      (data ?? []) as PropertyRow[]
    ).filter(isListingPublic);

    /* =====================================
       LOAD PROFILES

       Used for:
       - profile photo
       - name fallback
       - agency fallback
       - phone fallback
    ===================================== */

    const profileIds = Array.from(
      new Set(
        rows
          .map(
            (row) =>
              row.contact_user_id ||
              row.user_id ||
              ""
          )
          .filter(Boolean)
      )
    );

    const profileMap = new Map<
      string,
      {
        id: string;
        full_name: string | null;
        photo_url: string | null;
        agency: string | null;
        phone: string | null;
      }
    >();

    if (profileIds.length > 0) {
      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          photo_url,
          agency,
          phone
        `)
        .in(
          "id",
          profileIds
        );

      if (profileError) {
        console.warn(
          "Failed to load marketplace profiles:",
          profileError
        );
      } else {
        (
          (profileData ?? []) as {
            id: string;
            full_name: string | null;
            photo_url: string | null;
            agency: string | null;
            phone: string | null;
          }[]
        ).forEach(
          (profile) => {
            profileMap.set(
              profile.id,
              profile
            );
          }
        );
      }
    }

    /* =====================================
       MAP PROPERTY DATA
    ===================================== */

    const mapped: Property[] =
      rows.map((row) => {
        const sortedImages = [
          ...(row.property_images ??
            []),
        ].sort((a, b) => {
          const coverA =
            a.is_cover ? 1 : 0;

          const coverB =
            b.is_cover ? 1 : 0;

          if (
            coverA !== coverB
          ) {
            return coverB - coverA;
          }

          return (
            (a.sort_order ?? 0) -
            (b.sort_order ?? 0)
          );
        });

        const images =
          sortedImages.length > 0
            ? sortedImages.map(
                (img) =>
                  img.image_url
              )
            : [
                "/placeholder-property.jpg",
              ];

        const receiverId =
          row.contact_user_id ||
          row.user_id ||
          "";

        const profile =
          profileMap.get(
            receiverId
          );

        const postedByType =
          normalizePostedByType(
            row.contact_role,
            row.source
          );

        const isVerified =
          row.verification_status ===
            "verified" ||
          Boolean(
            row.verified_ok
          );

        const spotlight =
          isPromotionActive(
            row.spotlight_active,
            row.spotlight_expires_at
          );

        const featured =
          row.plan_id ===
            "featured" &&
          (!row.featured_expires_at ||
            isFutureDate(
              row.featured_expires_at
            ));

        const boosted =
          isPromotionActive(
            row.boost_active,
            row.boost_expires_at
          );

        const priority =
          row.plan_id ===
          "priority";

        const ownerPendingVerification =
          postedByType ===
            "owner" &&
          !isVerified &&
          (row.status ===
            "pending" ||
            row.status ===
              "pending_approval" ||
            row.verification_status ===
              "pending_verification" ||
            row.verification_status ===
              "pending_approval");

        const agentPendingVerification =
          postedByType ===
            "agent" &&
          !isVerified &&
          (row.status ===
            "pending" ||
            row.status ===
              "pending_approval" ||
            row.verification_status ===
              "pending_verification" ||
            row.verification_status ===
              "pending_approval");

        const developerPendingApproval =
          postedByType ===
            "developer" &&
          !isVerified &&
          (row.status ===
            "pending" ||
            row.status ===
              "pending_approval" ||
            row.verification_status ===
              "pending_verification" ||
            row.verification_status ===
              "pending_approval");

        /* =================================
           CONTACT / PROFILE
        ================================= */

        const resolvedName =
          row.contact_name ||
          profile?.full_name ||
          "Tetamo User";

        const resolvedAgency =
          row.contact_agency ||
          profile?.agency ||
          "";

        const resolvedWhatsapp =
          normalizeWhatsapp(
            row.contact_phone ||
              profile?.phone
          );

        const fallbackPhoto =
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            resolvedName
          )}&background=1C1C1E&color=ffffff&bold=true`;

        const resolvedPhoto =
          profile?.photo_url ||
          fallbackPhoto;

        const liveDate =
          row.posted_date ||
          row.created_at ||
          null;

        return {
          verifiedListing:
            isVerified,

          ownerVerified:
            postedByType ===
              "owner" &&
            isVerified,

          ownerPendingVerification,

          agentVerified:
            postedByType ===
              "agent" &&
            isVerified,

          agentPendingVerification,

          developerVerified:
            postedByType ===
              "developer" &&
            isVerified,

          developerPendingApproval,

          spotlight,
          featured,
          boosted,
          priority,

          id:
            row.id,

          slug:
            row.slug ??
            undefined,

          jenisListing:
            row.listing_type === "disewa" ||
            row.listing_type === "dijual_disewa" ||
            row.listing_type === "lelang"
              ? row.listing_type
              : "dijual",

          rentalType:
            normalizeRentalType(
              row.rental_type
            ),

          saleType:
            row.sale_type ||
            "",

          propertyType:
            row.property_type ||
            "",

          kode:
            row.kode ??
            undefined,

          postedDate:
            formatPostedDate(
              liveDate
            ),

          sortDateRaw:
            liveDate,

          title:
            row.title ??
            "-",

          titleId:
            row.title_id ??
            undefined,

          description:
            row.description ??
            undefined,

          descriptionId:
            row.description_id ??
            undefined,

          viewCount:
            Number(
              row.view_count ??
                0
            ),

          priceValue:
            Number(
              row.price ?? 0
            ),

          salePriceValue:
            Number(
              row.sale_price ??
                (row.listing_type === "dijual" ||
                row.listing_type === "dijual_disewa"
                  ? row.price
                  : 0) ??
                0
            ),

          rentPriceValue:
            Number(
              row.rent_price ??
                (row.listing_type === "disewa"
                  ? row.price
                  : 0) ??
                0
            ),

          province:
            row.province ??
            "-",

          area:
            row.city ||
            row.area ||
            "-",

          size:
            `${
              row.building_size ??
              row.land_size ??
              0
            } m²`,

          bed:
            `${
              row.bedrooms ??
              0
            } Kamar`,

          furnished:
            mapFurnishing(
              row.furnishing,
              lang
            ),

          agentName:
            resolvedName,

          agentPhoto:
            resolvedPhoto,

          agency:
            resolvedAgency,

          whatsapp:
            resolvedWhatsapp,

          images,

          postedByType,

          receiverId,

          receiverName:
            resolvedName,

          receiverWhatsapp:
            resolvedWhatsapp,

          rankingScore: 0,
        };
      });

    if (!ignore) {
      setAll(mapped);
      setLoading(false);
    }
  }

  loadProperties();

  return () => {
    ignore = true;
  };
}, [lang]);


  useEffect(() => {
    let ignore = false;

    async function loadEngagement() {
      const propertyIds = all.map((item) => item.id);

      if (propertyIds.length === 0) {
        if (!ignore) {
          setSavedMap({});
          setLikedMap({});
          setSaveCountMap({});
          setLikeCountMap({});
          setUserRatingsMap({});
          setRatingSummaryMap({});
          setShareCountMap({});
        }
        return;
      }

      const nextSavedMap: Record<string, boolean> = {};
      const nextLikedMap: Record<string, boolean> = {};
      const nextSaveCountMap: Record<string, number> = {};
      const nextLikeCountMap: Record<string, number> = {};
      const nextUserRatingsMap: Record<string, number> = {};
      const nextRatingSummaryMap: Record<string, RatingSummary> = {};
      const nextShareCountMap: Record<string, number> = {};

      const { data: summaryData, error: summaryError } = await supabase
        .from("property_engagement_summary")
        .select(
          "property_id, save_count, like_count, rating_count, avg_rating, share_count"
        )
        .in("property_id", propertyIds);

      if (ignore) return;

      if (summaryError) {
        console.error(
          "Failed to load property engagement summary:",
          summaryError
        );
      } else {
        ((summaryData ?? []) as EngagementSummaryRow[]).forEach((row) => {
          nextSaveCountMap[row.property_id] = Number(row.save_count ?? 0);
          nextLikeCountMap[row.property_id] = Number(row.like_count ?? 0);
          nextRatingSummaryMap[row.property_id] = {
            avg: Number(row.avg_rating ?? 0),
            count: Number(row.rating_count ?? 0),
          };
          nextShareCountMap[row.property_id] = Number(row.share_count ?? 0);
        });
      }

      if (!authUserId) {
        if (!ignore) {
          setSavedMap({});
          setLikedMap({});
          setSaveCountMap(nextSaveCountMap);
          setLikeCountMap(nextLikeCountMap);
          setUserRatingsMap({});
          setRatingSummaryMap(nextRatingSummaryMap);
          setShareCountMap(nextShareCountMap);
        }
        return;
      }

      const [savedRes, likesRes, userRatingsRes] = await Promise.all([
        supabase
          .from("saved_properties")
          .select("property_id")
          .eq("user_id", authUserId)
          .in("property_id", propertyIds),
        supabase
          .from("property_likes")
          .select("property_id")
          .eq("user_id", authUserId)
          .in("property_id", propertyIds),
        supabase
          .from("property_ratings")
          .select("property_id, rating")
          .eq("user_id", authUserId)
          .in("property_id", propertyIds),
      ]);

      if (ignore) return;

      if (savedRes.error) {
        console.error("Failed to load saved properties:", savedRes.error);
      } else {
        ((savedRes.data ?? []) as SavedRow[]).forEach((row) => {
          nextSavedMap[row.property_id] = true;
        });
      }

      if (likesRes.error) {
        console.error("Failed to load property likes:", likesRes.error);
      } else {
        ((likesRes.data ?? []) as LikeRow[]).forEach((row) => {
          nextLikedMap[row.property_id] = true;
        });
      }

      if (userRatingsRes.error) {
        console.error(
          "Failed to load user property ratings:",
          userRatingsRes.error
        );
      } else {
        ((userRatingsRes.data ?? []) as RatingRow[]).forEach((row) => {
          nextUserRatingsMap[row.property_id] = row.rating;
        });
      }

      setSavedMap(nextSavedMap);
      setLikedMap(nextLikedMap);
      setSaveCountMap(nextSaveCountMap);
      setLikeCountMap(nextLikeCountMap);
      setUserRatingsMap(nextUserRatingsMap);
      setRatingSummaryMap(nextRatingSummaryMap);
      setShareCountMap(nextShareCountMap);
    }

    loadEngagement();

    return () => {
      ignore = true;
    };
  }, [all, authUserId]);

  async function ensureAuthenticated() {
    if (authUserId) return authUserId;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      setAuthUserId(user.id);
      return user.id;
    }

    const currentPath = `${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`;

    alert(
      lang === "id"
        ? "Silakan login terlebih dahulu."
        : "Please log in first."
    );
    router.push(`/login?next=${encodeURIComponent(currentPath)}`);
    return null;
  }

  async function handleToggleSave(propertyId: string) {
    const userId = await ensureAuthenticated();
    if (!userId) return;

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

    if (currentlySaved) {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) {
        console.error("Failed to remove saved property:", error);
        setSavedMap((prev) => ({
          ...prev,
          [propertyId]: true,
        }));
        setSaveCountMap((prev) => ({
          ...prev,
          [propertyId]: (prev[propertyId] ?? 0) + 1,
        }));
      }
      return;
    }

    const { error } = await supabase.from("saved_properties").insert({
      user_id: userId,
      property_id: propertyId,
    });

    if (error) {
      console.error("Failed to save property:", error);
      setSavedMap((prev) => ({
        ...prev,
        [propertyId]: false,
      }));
      setSaveCountMap((prev) => ({
        ...prev,
        [propertyId]: Math.max(0, (prev[propertyId] ?? 0) - 1),
      }));
    }
  }

  async function handleToggleLike(propertyId: string) {
    const userId = await ensureAuthenticated();
    if (!userId) return;

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

    if (currentlyLiked) {
      const { error } = await supabase
        .from("property_likes")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) {
        console.error("Failed to remove property like:", error);
        setLikedMap((prev) => ({
          ...prev,
          [propertyId]: true,
        }));
        setLikeCountMap((prev) => ({
          ...prev,
          [propertyId]: (prev[propertyId] ?? 0) + 1,
        }));
      }
      return;
    }

    const { error } = await supabase.from("property_likes").insert({
      user_id: userId,
      property_id: propertyId,
    });

    if (error) {
      console.error("Failed to like property:", error);
      setLikedMap((prev) => ({
        ...prev,
        [propertyId]: false,
      }));
      setLikeCountMap((prev) => ({
        ...prev,
        [propertyId]: Math.max(0, (prev[propertyId] ?? 0) - 1),
      }));
    }
  }

  async function handleRate(propertyId: string, rating: number) {
    const userId = await ensureAuthenticated();
    if (!userId) return;

    const currentUserRating = userRatingsMap[propertyId] ?? 0;
    const currentSummary = ratingSummaryMap[propertyId] ?? { avg: 0, count: 0 };
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

    if (nextRating === 0) {
      const { error } = await supabase
        .from("property_ratings")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", propertyId);

      if (error) {
        console.error("Failed to delete property rating:", error);
        setUserRatingsMap((prev) => ({
          ...prev,
          [propertyId]: currentUserRating,
        }));
        setRatingSummaryMap((prev) => ({
          ...prev,
          [propertyId]: currentSummary,
        }));
      }
      return;
    }

    const { error } = await supabase.from("property_ratings").upsert(
      {
        user_id: userId,
        property_id: propertyId,
        rating: nextRating,
      },
      {
        onConflict: "user_id,property_id",
      }
    );

    if (error) {
      console.error("Failed to rate property:", error);
      setUserRatingsMap((prev) => ({
        ...prev,
        [propertyId]: currentUserRating,
      }));
      setRatingSummaryMap((prev) => ({
        ...prev,
        [propertyId]: currentSummary,
      }));
    }
  }

  async function handleShare(property: Property) {
    const propertyTitle = getLocalizedPropertyTitle(property, lang);
    const shareUrl = `${window.location.origin}${getPropertyHref(property)}`;
    const shareText =
      lang === "id"
        ? `Lihat properti ini di TETAMO:\n\n${propertyTitle}\n${property.area}, ${property.province}`
        : `Check out this property on TETAMO:\n\n${propertyTitle}\n${property.area}, ${property.province}`;

    let shareMethod = "copy_link";

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: propertyTitle,
          text: shareText,
          url: shareUrl,
        });
        shareMethod = "native_share";
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(shareUrl);
        shareMethod = "copy_link";
        alert(
          lang === "id"
            ? "Link properti berhasil disalin."
            : "Property link copied successfully."
        );
      } else {
        window.prompt(
          lang === "id"
            ? "Salin link properti ini:"
            : "Copy this property link:",
          shareUrl
        );
        shareMethod = "manual_copy";
      }
    } catch (error: any) {
      if (error?.name === "AbortError") return;

      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(shareUrl);
          shareMethod = "copy_link";
          alert(
            lang === "id"
              ? "Link properti berhasil disalin."
              : "Property link copied successfully."
          );
        } else {
          window.prompt(
            lang === "id"
              ? "Salin link properti ini:"
              : "Copy this property link:",
            shareUrl
          );
          shareMethod = "manual_copy";
        }
      } catch (fallbackError) {
        console.error("Failed to share property:", fallbackError);
        alert(
          lang === "id"
            ? "Gagal membagikan properti."
            : "Failed to share property."
        );
        return;
      }
    }

    let userId = authUserId;

    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      userId = user?.id ?? null;
    }

    if (!userId) return;

    const { error } = await supabase.from("property_shares").insert({
      property_id: property.id,
      user_id: userId,
      share_method: shareMethod,
    });

    if (error) {
      console.error("Failed to save property share:", error);
      return;
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

    const value = marketplaceSearch.trim();

    if (!value) {
      router.push("/search");
      return;
    }

    const encoded = encodeURIComponent(value);
    router.push(`/search?q=${encoded}&query=${encoded}`);
  }

  const filtered = useMemo(() => {
  let list = [...all];

  /* =========================
     LISTING FILTER
  ========================= */

  if (jenisListing === "dijual") {
    list = list.filter(
      (property) =>
        property.jenisListing === "dijual" ||
        property.jenisListing === "dijual_disewa"
    );
  }

  if (jenisListing === "disewa") {
    list = list.filter(
      (property) =>
        property.jenisListing === "disewa" ||
        property.jenisListing === "dijual_disewa"
    );
  }

  /* =========================
     RENTAL TYPE FILTER
  ========================= */

  if (selectedRentalType) {
    list = list.filter(
      (property) =>
        (property.jenisListing === "disewa" ||
          property.jenisListing === "dijual_disewa") &&
        property.rentalType === selectedRentalType
    );
  }

  /* =========================
     MARKETPLACE ORDER

     1. Spotlight
     2. Featured
     3. Boost
     4. Everything else

     Within every group:
     NEWEST → OLDEST
  ========================= */

  const spotlight = list
    .filter(
      (property) => property.spotlight
    )
    .sort(sortByNewestWithinTier);

  const featured = list
    .filter(
      (property) =>
        !property.spotlight &&
        property.featured
    )
    .sort(sortByNewestWithinTier);

  const boosted = list
    .filter(
      (property) =>
        !property.spotlight &&
        !property.featured &&
        property.boosted
    )
    .sort(sortByNewestWithinTier);

  /*
    IMPORTANT:
    Priority is intentionally NOT its own
    marketplace tier anymore.

    After paid promotion positions,
    freshness controls the marketplace.
  */
  const latest = list
    .filter(
      (property) =>
        !property.spotlight &&
        !property.featured &&
        !property.boosted
    )
    .sort(sortByNewestWithinTier);

  return [
    ...spotlight,
    ...featured,
    ...boosted,
    ...latest,
  ];
}, [
  all,
  jenisListing,
  selectedRentalType,
]);

  const pageSize = 12;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [jenisListing, selectedRentalType, all.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const currentFilterLabel = useMemo(() => {
    const listingLabel = jenisListing
      ? jenisListing === "dijual"
        ? lang === "id"
          ? "Dijual"
          : "For Sale"
        : lang === "id"
          ? "Disewa"
          : "For Rent"
      : lang === "id"
        ? "Semua"
        : "All";

    const rentalLabel = selectedRentalType
      ? getRentalTypeLabel(selectedRentalType, lang)
      : "";

    return rentalLabel ? `${listingLabel} • ${rentalLabel}` : listingLabel;
  }, [jenisListing, selectedRentalType, lang]);

  return (
  <main className="min-h-screen bg-white text-gray-900">
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

      {/* =========================================
          MARKETPLACE HERO + SEARCH + FILTERS
      ========================================= */}
      <section className="relative overflow-visible rounded-[36px] border border-[#E8E1D5] bg-[#F6F3EC] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">

        {/* subtle decoration */}
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#D8B46A]/10 blur-[90px]" />

        <div className="relative">

          {/* EYEBROW */}
          <div className="flex items-center gap-3">
            <span className="h-px w-10 bg-[#B8860B]" />

            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#B8860B] sm:text-xs">
              {lang === "id"
                ? "Properti di Indonesia"
                : "Property in Indonesia"}
            </span>
          </div>

          {/* TITLE */}
          <div className="mt-4 max-w-3xl">
            <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.045em] text-[#1C1C1E] sm:text-[44px] lg:text-[52px]">
              {lang === "id"
                ? "Temukan properti yang tepat untuk Anda."
                : "Find the right property for you."}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-600 sm:text-base">
              {lang === "id"
                ? "Jelajahi rumah, vila, apartemen, tanah dan properti lainnya dari pemilik, agen, dan developer di seluruh Indonesia."
                : "Explore houses, villas, apartments, land and other properties from owners, agents and developers across Indonesia."}
            </p>
          </div>
    {/* =====================================
        SEARCH
    ===================================== */}
    <form
      onSubmit={handleMarketplaceSearchSubmit}
      className="mt-8"
    >
      <div className="flex flex-col gap-3 rounded-[24px] border border-[#DED8CC] bg-white p-2 shadow-[0_12px_35px_rgba(0,0,0,0.06)] sm:flex-row sm:items-center">

        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 sm:px-4">

          <Search className="h-5 w-5 shrink-0 text-[#B8860B]" />

          <input
            type="text"
            value={marketplaceSearch}
            onChange={(e) =>
              setMarketplaceSearch(e.target.value)
            }
            placeholder={
              lang === "id"
                ? "Cari kota, area, nama atau tipe properti..."
                : "Search city, area, property name or type..."
            }
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[#1C1C1E] outline-none placeholder:font-normal placeholder:text-gray-400 sm:text-base"
          />

        </div>

        <button
          type="submit"
          className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-[18px] bg-[#1C1C1E] px-7 text-sm font-extrabold text-white transition hover:bg-[#B8860B]"
        >
          {lang === "id" ? "Cari Properti" : "Search Property"}

          <span>→</span>
        </button>

      </div>
    </form>

    {/* =====================================
        MAIN FILTERS
    ===================================== */}
    <div className="mt-6 flex flex-wrap items-center gap-2.5">

      {/* ALL */}
      <Link
        href="/properti"
        className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-extrabold transition ${
          !jenisListing && !selectedRentalType
            ? "bg-[#1C1C1E] text-white shadow-sm"
            : "border border-[#DED8CC] bg-white text-[#1C1C1E] hover:border-[#B8860B] hover:text-[#B8860B]"
        }`}
      >
        {lang === "id" ? "Semua" : "All"}
      </Link>

      {/* FOR SALE */}
      <Link
        href="/properti?jenisListing=dijual"
        className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-sm font-extrabold transition ${
          jenisListing === "dijual"
            ? "bg-[#1C1C1E] text-white shadow-sm"
            : "border border-[#DED8CC] bg-white text-[#1C1C1E] hover:border-[#B8860B] hover:text-[#B8860B]"
        }`}
      >
        {lang === "id" ? "Dijual" : "For Sale"}
      </Link>

      {/* =================================
          RENT DROPDOWN
      ================================= */}
    <details className="group relative">
  <summary
    className={[
      "flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-full border px-5 text-sm font-extrabold transition",
      jenisListing === "disewa"
        ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
        : "border-[#DED8CC] bg-white text-[#1C1C1E] hover:border-[#B8860B]",
    ].join(" ")}
  >
    <span>
      {lang === "id"
        ? "Disewa"
        : "For Rent"}
    </span>

    <span className="text-[10px] transition-transform group-open:rotate-180">
      ▼
    </span>
  </summary>

  <div className="absolute left-0 top-[calc(100%+10px)] z-50 min-w-[235px] overflow-hidden rounded-[22px] border border-[#E5DFD4] bg-white p-2 shadow-[0_22px_60px_rgba(0,0,0,0.14)]">

    {/* SEMUA SEWA */}
    <button
      type="button"
      onClick={(event) => {
        router.push(
          "/properti?jenisListing=disewa"
        );

        event.currentTarget
          .closest("details")
          ?.removeAttribute("open");
      }}
      className={[
        "flex w-full items-center justify-between rounded-[15px] px-4 py-3 text-left transition",
        jenisListing === "disewa" &&
        !selectedRentalType
          ? "bg-[#F6F3EC]"
          : "hover:bg-[#F8F6F1]",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-extrabold text-[#1C1C1E]">
          {lang === "id"
            ? "Semua Sewa"
            : "All Rentals"}
        </p>

        <p className="mt-0.5 text-[10px] font-medium text-gray-400">
          {lang === "id"
            ? "Lihat semua properti disewakan"
            : "View all rental properties"}
        </p>
      </div>

      {jenisListing === "disewa" &&
      !selectedRentalType ? (
        <span className="text-[#B8860B]">
          ✓
        </span>
      ) : null}
    </button>

    {/* BULANAN */}
    <button
      type="button"
      onClick={(event) => {
        router.push(
          "/properti?jenisListing=disewa&rentalType=monthly"
        );

        event.currentTarget
          .closest("details")
          ?.removeAttribute("open");
      }}
      className={[
        "mt-1 flex w-full items-center justify-between rounded-[15px] px-4 py-3 text-left transition",
        selectedRentalType === "monthly"
          ? "bg-[#F6F3EC]"
          : "hover:bg-[#F8F6F1]",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-extrabold text-[#1C1C1E]">
          {lang === "id"
            ? "Bulanan"
            : "Monthly"}
        </p>

        <p className="mt-0.5 text-[10px] font-medium text-gray-400">
          {lang === "id"
            ? "Sewa per bulan"
            : "Rent per month"}
        </p>
      </div>

      {selectedRentalType ===
      "monthly" ? (
        <span className="text-[#B8860B]">
          ✓
        </span>
      ) : null}
    </button>

    {/* TAHUNAN */}
    <button
      type="button"
      onClick={(event) => {
        router.push(
          "/properti?jenisListing=disewa&rentalType=yearly"
        );

        event.currentTarget
          .closest("details")
          ?.removeAttribute("open");
      }}
      className={[
        "mt-1 flex w-full items-center justify-between rounded-[15px] px-4 py-3 text-left transition",
        selectedRentalType === "yearly"
          ? "bg-[#F6F3EC]"
          : "hover:bg-[#F8F6F1]",
      ].join(" ")}
    >
      <div>
        <p className="text-sm font-extrabold text-[#1C1C1E]">
          {lang === "id"
            ? "Tahunan"
            : "Yearly"}
        </p>

        <p className="mt-0.5 text-[10px] font-medium text-gray-400">
          {lang === "id"
            ? "Sewa per tahun"
            : "Rent per year"}
        </p>
      </div>

      {selectedRentalType ===
      "yearly" ? (
        <span className="text-[#B8860B]">
          ✓
        </span>
      ) : null}
    </button>

  </div>
</details>

    </div>

    {/* =====================================
        SMALL MARKETPLACE INFO
    ===================================== */}
    <div className="mt-7 flex flex-col gap-3 border-t border-[#DED8CC] pt-5 sm:flex-row sm:items-center sm:justify-between">

      <p className="text-xs font-medium text-gray-500 sm:text-sm">
        {lang === "id"
          ? `${filtered.length} properti tersedia`
          : `${filtered.length} properties available`}
      </p>

      <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-500 sm:text-xs">

        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[#B8860B]" />

          {lang === "id"
            ? "Listing terverifikasi"
            : "Verified listings"}
        </span>

        <span className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block" />

        <span className="hidden sm:inline">
          {lang === "id"
            ? "Terbaru diperbarui otomatis"
            : "Latest listings updated automatically"}
        </span>

      </div>

    </div>

  </div>
</section>  
        
        {/* =========================================
    MARKETPLACE RESULTS + PROMO SIDEBAR
========================================= */}
<div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2.7fr)_minmax(320px,1fr)] xl:items-start">

  {/* =====================================
      LEFT — PROPERTY MARKETPLACE
  ===================================== */}
  <section className="min-w-0">

    {/* RESULTS HEADER */}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B8860B]">
          {lang === "id"
            ? "Properti Tersedia"
            : "Available Properties"}
        </p>

        <p className="mt-1 text-sm font-semibold text-gray-600">
          {lang === "id"
            ? `${filtered.length} properti ditemukan`
            : `${filtered.length} properties found`}
        </p>
      </div>

    </div>

    {/* =================================
        LOADING
    ================================= */}
    {loading ? (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

        {[1, 2, 3, 4, 5, 6].map(
          (item) => (
            <div
              key={item}
              className="overflow-hidden rounded-[28px] border border-gray-200 bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-gray-200" />

              <div className="space-y-4 p-5">
                <div className="h-6 w-2/3 animate-pulse rounded bg-gray-200" />

                <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />

                <div className="h-12 animate-pulse rounded bg-gray-100" />

                <div className="h-16 animate-pulse rounded-[18px] bg-gray-100" />
              </div>
            </div>
          )
        )}

      </div>

    ) : paged.length === 0 ? (

      /* =================================
          EMPTY STATE
      ================================= */
      <div className="rounded-[30px] border border-[#E5DFD4] bg-[#F8F6F1] px-6 py-16 text-center">

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#B8860B] shadow-sm">
          <Search className="h-5 w-5" />
        </div>

        <h3 className="mt-5 text-lg font-extrabold text-[#1C1C1E]">
          {lang === "id"
            ? "Belum ada properti untuk ditampilkan."
            : "No properties to display yet."}
        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          {lang === "id"
            ? "Coba pilih kategori lain atau gunakan pencarian untuk menemukan properti lainnya."
            : "Try another category or use search to discover other properties."}
        </p>

        <Link
          href="/properti"
          className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#1C1C1E] px-6 text-sm font-extrabold text-white transition hover:bg-[#B8860B]"
        >
          {lang === "id"
            ? "Lihat Semua Properti"
            : "View All Properties"}
        </Link>

      </div>

    ) : (

      /* =================================
          PROPERTY GRID
      ================================= */
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

        {paged.map((p) => (
          <PropertyCard
            key={p.id}
            p={p}

            saved={Boolean(
              savedMap[p.id]
            )}

            liked={Boolean(
              likedMap[p.id]
            )}

            saveCount={
              saveCountMap[p.id] ?? 0
            }

            likeCount={
              likeCountMap[p.id] ?? 0
            }

            userRating={
              userRatingsMap[p.id] ?? 0
            }

            ratingSummary={
              ratingSummaryMap[p.id] ?? {
                avg: 0,
                count: 0,
              }
            }

            shareCount={
              shareCountMap[p.id] ?? 0
            }

            onToggleSave={
              handleToggleSave
            }

            onToggleLike={
              handleToggleLike
            }

            onRate={
              handleRate
            }

            onShare={
              handleShare
            }
          />
        ))}

      </div>
    )}

    {/* =================================
        PAGINATION
    ================================= */}
    {!loading &&
      paged.length > 0 &&
      totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-3">

          {/* PREVIOUS */}
          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.max(
                  1,
                  current - 1
                )
              )
            }
            disabled={page === 1}
            className="inline-flex min-h-[44px] min-w-[105px] items-center justify-center rounded-full border border-[#DED8CC] bg-white px-4 text-sm font-bold text-[#1C1C1E] transition hover:border-[#B8860B] hover:text-[#B8860B] disabled:cursor-not-allowed disabled:opacity-35"
          >
            ←{" "}
            {lang === "id"
              ? "Sebelumnya"
              : "Previous"}
          </button>

          {/* PAGE NUMBER */}
          <div className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#F6F3EC] px-5 text-xs font-semibold text-gray-500">

            <span>
              {lang === "id"
                ? "Halaman"
                : "Page"}
            </span>

            <span className="mx-1.5 font-extrabold text-[#1C1C1E]">
              {page}
            </span>

            <span>/</span>

            <span className="ml-1.5 font-extrabold text-[#1C1C1E]">
              {totalPages}
            </span>

          </div>

          {/* NEXT */}
          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.min(
                  totalPages,
                  current + 1
                )
              )
            }
            disabled={
              page === totalPages
            }
            className="inline-flex min-h-[44px] min-w-[105px] items-center justify-center rounded-full border border-[#DED8CC] bg-white px-4 text-sm font-bold text-[#1C1C1E] transition hover:border-[#B8860B] hover:text-[#B8860B] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {lang === "id"
              ? "Berikutnya"
              : "Next"}{" "}
            →
          </button>

        </div>
      )}

  </section>

  {/* =====================================
      RIGHT — TETAMO PROMOTION SIDEBAR
  ===================================== */}
  <aside className="min-w-0">

    {/* STICKY ON DESKTOP */}
    <div className="xl:sticky xl:top-24">

      <MarketplacePromoSidebar />

    </div>

  </aside>

</div>

        <div className="mt-10 rounded-[32px] border border-gray-200 bg-[#1C1C1E] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.18)] sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
                TETAMO MARKETPLACE
              </div>

              <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {lang === "id"
                  ? "Cari atau Pasang Properti Anda dengan Tetamo"
                  : "Find or List Your Property with Tetamo"}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                {lang === "id"
                  ? "Tetamo membantu pemilik, agen, dan developer menampilkan properti dengan lebih profesional — lengkap dengan listing terverifikasi, direct WhatsApp, jadwal viewing, dan exposure marketplace."
                  : "Tetamo helps owners, agents, and developers present properties professionally — with verified listings, direct WhatsApp leads, viewing schedule, and marketplace exposure."}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-bold text-white">
                    {lang === "id" ? "Listing Terverifikasi" : "Verified Listing"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/60">
                    {lang === "id"
                      ? "Bangun trust lebih cepat."
                      : "Build trust faster."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-bold text-white">Direct WhatsApp</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">
                    {lang === "id"
                      ? "Lead langsung ke pemilik atau agen."
                      : "Leads go directly to owner or agent."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm font-bold text-white">
                    {lang === "id"
                      ? "AI Judul & Deskripsi"
                      : "AI Title & Description"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/60">
                    {lang === "id"
                      ? "Lebih rapi, bilingual, dan SEO friendly."
                      : "Cleaner, bilingual, and SEO friendly."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-4 text-[#1C1C1E] shadow-2xl sm:p-5">
              <p className="text-sm font-bold">
                {lang === "id"
                  ? "Siap pasang listing?"
                  : "Ready to list your property?"}
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {lang === "id"
                  ? "Pilih paket yang sesuai untuk pemilik, agen, atau kebutuhan promosi properti Anda."
                  : "Choose the right package for owners, agents, or your property promotion needs."}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href="/pricelist"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
                >
                  {lang === "id" ? "Lihat Paket Tetamo" : "View Tetamo Packages"}
                </Link>

                <Link
                  href="/search"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                >
                  {lang === "id" ? "Cari Properti" : "Find Property"}
                </Link>
              </div>

              <p className="mt-4 text-center text-[11px] leading-5 text-gray-500">
                {lang === "id"
                  ? "Tanpa komisi. Listing lebih mudah. Exposure lebih luas."
                  : "No commission. Easier listing. Wider exposure."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}