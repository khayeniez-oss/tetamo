"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MortgageCalculator from "@/components/MortgageCalculator";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/trackEvent";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music2,
  Gem,
  Crown,
  Zap,
  BedDouble,
  Bath,
  Layers3,
  CarFront,
  Droplets,
  Ruler,
  FileText,
  Home,
  Square,
  Heart,
  Bookmark,
  Star,
  Clock,
  Share2,
  Eye,
  Flag,
  ShieldAlert,
  UserRound,
} from "lucide-react";

type RentalType = "daily" | "monthly" | "yearly" | "";
type SupportedCurrency = "IDR" | "USD" | "AUD";

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
  agency: string | null;
  photo_url: string | null;
  email?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  youtube_url?: string | null;
  linkedin_url?: string | null;
};

type PropertyRow = {
  [key: string]: any;
  id: string;
  slug: string | null;
  kode: string | null;
  posted_date: string | null;

  title: string | null;
  title_id: string | null;

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
  certificate: string | null;
  market_type: string | null;

  description: string | null;
  description_id: string | null;
  description_en: string | null;

  view_count: number | null;

  facilities: Record<string, boolean> | null;
  nearby: Record<string, boolean> | null;
  listing_type: string | null;
  rental_type: string | null;
  sale_type: string | null;
  lease_years: number | null;
  lease_until_year: number | null;
  lease_extendable: string | null;
  property_type: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  plan_id: string | null;
  created_at: string | null;
  user_id: string | null;
  video_url: string | null;
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
  created_by_user_id: string | null;
  property_images: PropertyImageRow[] | null;
};

type PropertyItem = {
  id: string;
  slug?: string;
  jenisListing: "dijual" | "disewa" | "dijual_disewa" | "lelang";
  rentalType: RentalType;
  saleType: string;
  leaseYearsValue: number | null;
  leaseUntilYearValue: number | null;
  leaseExtendable: string;
  propertyType: string;

  title: string;
  titleId: string;

  price: string;
  priceValue: number;
  salePriceValue: number;
  rentPriceValue: number;
  province: string;
  area: string;
  furnished: string;
  certificate: string;
  marketType: string;

  description: string;
  descriptionId: string;
  descriptionEn: string;

  viewCount: number;

  agency: string;
  agentName: string;
  images: string[];
  videoUrl?: string | null;
  photo: string;
  facilities?: Record<string, boolean>;
  nearby?: Record<string, boolean>;
  kodeListing: string;
  postedDate?: string;
  boosted?: boolean;
  featured?: boolean;
  spotlight?: boolean;
  verifiedListing: boolean;
  pendingVerification: boolean;
  ownerApproved: boolean;
  agentVerified: boolean;
  postedByType: "owner" | "agent" | "developer";
  receiverId: string;
  receiverName: string;
  receiverWhatsapp: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  buildingSizeValue: number | null;
  landSizeValue: number | null;
  bedroomsValue: number | null;
  bathroomsValue: number | null;
  floorsValue: number | null;
  parkingValue: number | null;
  parkingAvailable: boolean;
  electricityValue: string;
  waterValue: string;

  landUnit: string;
  pricePerSqmValue: number | null;
  pricePerAreValue: number | null;
  pricePerHectareValue: number | null;
  frontageValue: number | null;
  depthValue: number | null;
  dimensionText: string;
  roadAccess: string;
  ownershipType: string;
  landType: string;
  zoningType: string;
  unitFloorValue: number | null;
  towerBlock: string;
  ceilingHeightValue: number | null;
};

type DetailChip = {
  key: string;
  label: string;
  value: string;
  icon: any;
};

type OrderedPropertyRef = {
  id: string;
  slug?: string;
};

const FALLBACK_POSTER_PHOTO =
  "https://randomuser.me/api/portraits/men/32.jpg";

const IDR_PER_USD = 16500;
const IDR_PER_AUD = 12072;

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

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatCompactNumber(value: number | null | undefined) {
  const safeValue = Number(value ?? 0);
  return new Intl.NumberFormat("en", {
    notation: safeValue >= 1000 ? "compact" : "standard",
    maximumFractionDigits: safeValue >= 1000 ? 1 : 0,
  }).format(safeValue);
}

function toNumberOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toStringOrEmpty(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
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

function mapFurnishing(value?: string | null, lang?: string) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return lang === "id" ? "Full Furnish" : "Full Furnished";
  if (v === "semi") return lang === "id" ? "Semi Furnish" : "Semi Furnished";
  if (v === "unfurnished") return "Unfurnished";

  return value;
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

function getRentalTypeLabel(rentalType: RentalType, lang: string): string {
  if (rentalType === "daily") {
    return lang === "id" ? "Harian" : "Daily";
  }

  if (rentalType === "monthly") {
    return lang === "id" ? "Bulanan" : "Monthly";
  }

  if (rentalType === "yearly") {
    return lang === "id" ? "Tahunan" : "Yearly";
  }

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

function formatLeaseExtendable(value?: string | null, lang?: string) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "";
  if (raw === "ya") return lang === "id" ? "Bisa diperpanjang" : "Extendable";
  if (raw === "tidak") return lang === "id" ? "Tidak bisa diperpanjang" : "Not extendable";
  if (raw === "tidak_tahu") return lang === "id" ? "Belum diketahui" : "Not sure";

  return value || "";
}

function isListingPublic(
  row: Pick<
    PropertyRow,
    "status" | "is_paused" | "listing_expires_at" | "transaction_status"
  >
) {
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

function formatPropertyType(value?: string | null, lang?: string) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "";

  if (raw === "tanah") return lang === "id" ? "Tanah" : "Land";
  if (raw === "rumah") return lang === "id" ? "Rumah" : "House";
  if (raw === "villa" || raw === "vila") return "Villa";
  if (raw === "studio") return "Studio";
  if (raw === "apartemen" || raw === "apartment") {
    return lang === "id" ? "Apartemen" : "Apartment";
  }
  if (raw === "ruko") return lang === "id" ? "Ruko" : "Shophouse";
  if (raw === "rukan") return lang === "id" ? "Rukan" : "Office Unit";
  if (raw === "gudang") return lang === "id" ? "Gudang" : "Warehouse";
  if (raw === "kantor") return lang === "id" ? "Kantor" : "Office";
  if (raw === "kost" || raw === "kos") {
    return lang === "id" ? "Kost" : "Boarding House";
  }
  if (raw === "guesthouse") return lang === "id" ? "Guesthouse" : "Guesthouse";
  if (raw === "hotel") return "Hotel";
  if (raw === "resort") return "Resort";
  if (raw === "pabrik") return lang === "id" ? "Pabrik" : "Factory";
  if (raw === "toko") return lang === "id" ? "Toko" : "Shop";
  if (raw === "rukos") {
    return lang === "id" ? "Rukos" : "Shop-Boarding House";
  }

  return raw
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatMarketType(value?: string | null) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return "-";
  if (raw === "primary") return "Primary";
  if (raw === "secondary") return "Secondary";

  return value || "-";
}

function getPosterLabel(
  postedByType: "owner" | "agent" | "developer",
  lang: string
) {
  if (lang === "id") {
    if (postedByType === "agent") return "Agen";
    if (postedByType === "developer") return "Developer";
    return "Pemilik";
  }

  if (postedByType === "agent") return "The agent";
  if (postedByType === "developer") return "The developer";
  return "The owner";
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

function getPropertyHref(property: { slug?: string | null; id: string }) {
  return `/properti/${property.slug || property.id}`;
}

function isApartmentType(value?: string | null) {
  const v = String(value || "").trim().toLowerCase();
  return v === "apartemen" || v === "apartment" || v === "studio";
}

function isLandType(value?: string | null) {
  return String(value || "").trim().toLowerCase() === "tanah";
}

function isIndustrialType(value?: string | null) {
  const v = String(value || "").trim().toLowerCase();
  return v === "gudang" || v === "pabrik";
}

function usesLandSizeForType(value?: string | null) {
  return !isApartmentType(value);
}

function formatLandUnitShort(value?: string | null) {
  const v = String(value || "").trim().toLowerCase();

  if (v === "are") return "are";
  if (v === "hectare" || v === "hektare") return "ha";
  if (v === "acre" || v === "acres") return "acre";
  return "m²";
}

function formatLandSize(
  value: number | null | undefined,
  landUnit?: string | null
) {
  if (typeof value !== "number") return "";
  return `${formatNumber(value)} ${formatLandUnitShort(landUnit)}`;
}

function formatDimensionValue(
  dimensionText?: string | null,
  frontageValue?: number | null,
  depthValue?: number | null
) {
  const cleanText = toStringOrEmpty(dimensionText);
  if (cleanText) return cleanText;

  if (frontageValue && depthValue) {
    return `${formatNumber(frontageValue)} x ${formatNumber(depthValue)} m`;
  }

  if (frontageValue) return `${formatNumber(frontageValue)} m`;
  if (depthValue) return `${formatNumber(depthValue)} m`;

  return "";
}

function formatUnitPrice(
  value: number | null | undefined,
  currency: SupportedCurrency,
  suffix: string
) {
  if (typeof value !== "number") return "";
  return `${formatPriceByCurrency(value, currency)} / ${suffix}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getOrCreateVisitorHash() {
  if (typeof window === "undefined") return "";

  const key = "tetamo_property_visitor_id";
  const existing = window.localStorage.getItem(key);

  if (existing) return existing;

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, next);
  return next;
}

function getStructuredDescription(raw?: string | null, lang?: string) {
  const text = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();

  if (!text) {
    return {
      intro: [] as string[],
      detailHeading: "",
      detailItems: [] as string[],
    };
  }

  const detailHeadingPattern =
    lang === "id"
      ? /(Detail properti\s*:)/i
      : /(Property details\s*:)/i;

  const splitByHeading = text.split(detailHeadingPattern);

  if (splitByHeading.length < 3) {
    return {
      intro: text
        .split(/\n{2,}/)
        .map((item) => item.trim())
        .filter(Boolean),
      detailHeading: "",
      detailItems: [],
    };
  }

  const introText = splitByHeading[0]?.trim() || "";
  const detailHeading = splitByHeading[1]?.trim() || "";
  const detailText = splitByHeading.slice(2).join("").trim();

  const knownLabels =
    lang === "id"
      ? [
          "Harga",
          "Harga Sewa",
          "Harga Jual",
          "Minimum Sewa",
          "Opsi Sewa",
          "Transaksi",
          "Tipe Properti",
          "Lokasi",
          "Luas Tanah",
          "Luas Bangunan",
          "Total Bangunan",
          "Total Kamar",
          "Tipe Kamar",
          "Kamar Tidur",
          "Kamar Mandi",
          "Listrik",
          "Air",
          "Hadap",
          "Furnish",
          "Furnishing",
          "Parkir",
          "Ukuran Tanah",
          "Dimensi",
          "Legalitas",
          "View",
          "Fasilitas",
          "Akses",
        ]
      : [
          "Price",
          "Rental Price",
          "Sale Price",
          "Minimum Lease",
          "Lease Option",
          "Transaction",
          "Property Type",
          "Location",
          "Land Size",
          "Building Size",
          "Total Buildings",
          "Total Rooms",
          "Room Type",
          "Bedrooms",
          "Bathrooms",
          "Electricity",
          "Water",
          "Facing",
          "Furnish",
          "Furnishing",
          "Parking",
          "Land Dimensions",
          "Dimensions",
          "Legal",
          "View",
          "Facilities",
          "Access",
        ];

  const labelPattern = new RegExp(
    `(${knownLabels.map(escapeRegExp).join("|")})\\s*:`,
    "gi"
  );

  const matches = Array.from(detailText.matchAll(labelPattern));

  const detailItems =
    matches.length > 0
      ? matches.map((match, index) => {
          const label = match[1]?.trim() || "";
          const valueStart = (match.index ?? 0) + match[0].length;
          const valueEnd =
            index + 1 < matches.length
              ? (matches[index + 1].index ?? detailText.length)
              : detailText.length;

          const value = detailText
            .slice(valueStart, valueEnd)
            .replace(/\s+/g, " ")
            .trim();

          return value ? `${label}: ${value}` : `${label}:`;
        })
      : detailText
          .split(/\n+/)
          .map((item) => item.trim())
          .filter(Boolean);

  return {
    intro: introText
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean),
    detailHeading,
    detailItems,
  };
}

export default function PropertyDetailClient({
  id,
  initialProperty = null,
  initialOrderedProperties = [],
}: {
  id: string;
  initialProperty?: PropertyItem | null;
  initialOrderedProperties?: OrderedPropertyRef[];
}) {
  const { lang } = useLanguage();
  const { currency } = useCurrency();
  const currentCurrency: SupportedCurrency =
    currency === "AUD" ? "AUD" : currency === "USD" ? "USD" : "IDR";

  const router = useRouter();
  const pathname = usePathname();

  const [jadwalOpen, setJadwalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [idx, setIdx] = useState(0);

  const [property, setProperty] = useState<PropertyItem | null>(initialProperty);
const [orderedProperties, setOrderedProperties] = useState<
  OrderedPropertyRef[]
>(initialOrderedProperties);
const [loading, setLoading] = useState(!initialProperty);

  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [displayLikeCount, setDisplayLikeCount] = useState(0);
  const [displaySaveCount, setDisplaySaveCount] = useState(0);
  const [displayRatingAverage, setDisplayRatingAverage] = useState(0);
  const [displayRatingCount, setDisplayRatingCount] = useState(0);
  const [displayShareCount, setDisplayShareCount] = useState(0);

  const trackedDetailViewRef = useRef<string | null>(null);

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
    setIdx(0);
  }, [id]);

  useEffect(() => {
    let ignore = false;

    async function loadProperty() {
      if (!id) {
        if (!ignore) {
          setProperty(null);
          setLoading(false);
        }
        return;
      }

      if (!(property && property.id === id)) {
  setLoading(true);
}

      const [
        { data: propertyData, error: propertyError },
        { data: idRows, error: idsError },
      ] = await Promise.all([
        supabase
          .from("properties")
          .select(`
            *,
            property_images (
              image_url,
              sort_order,
              is_cover
            )
          `)
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("properties")
          .select(
            "id, slug, created_at, status, is_paused, listing_expires_at, transaction_status"
          )
          .neq("status", "rejected")
          .order("created_at", { ascending: false }),
      ]);

      if (propertyError) {
        console.error("Failed to load property detail:", propertyError);
        if (!ignore) {
          setProperty(null);
          setLoading(false);
        }
        return;
      }

      if (idsError) {
        console.error("Failed to load property order:", idsError);
      }

      if (!propertyData) {
        if (!ignore) {
          setProperty(null);
          setOrderedProperties(
            ((idRows ?? []) as Array<{
              id: string;
              slug: string | null;
              status: string | null;
              is_paused: boolean | null;
              listing_expires_at: string | null;
              transaction_status: string | null;
            }>)
              .filter((row) =>
                isListingPublic({
                  status: row.status ?? "",
                  is_paused: row.is_paused,
                  listing_expires_at: row.listing_expires_at,
                  transaction_status: row.transaction_status,
                })
              )
              .map((x) => ({ id: x.id, slug: x.slug ?? undefined }))
          );
          setLoading(false);
        }
        return;
      }

      const row = propertyData as PropertyRow;

      if (!isListingPublic(row)) {
        if (!ignore) {
          setProperty(null);
          setOrderedProperties(
            ((idRows ?? []) as Array<{
              id: string;
              slug: string | null;
              status: string | null;
              is_paused: boolean | null;
              listing_expires_at: string | null;
              transaction_status: string | null;
            }>)
              .filter((item) =>
                isListingPublic({
                  status: item.status ?? "",
                  is_paused: item.is_paused,
                  listing_expires_at: item.listing_expires_at,
                  transaction_status: item.transaction_status,
                })
              )
              .map((x) => ({ id: x.id, slug: x.slug ?? undefined }))
          );
          setLoading(false);
        }
        return;
      }

      const possibleProfileIds = Array.from(
        new Set(
          [row.contact_user_id, row.user_id].filter(
            (value): value is string => Boolean(value)
          )
        )
      );

      let contactProfile: ProfileRow | null = null;
      let userProfile: ProfileRow | null = null;

      if (possibleProfileIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(`
            id,
            full_name,
            phone,
            role,
            agency,
            photo_url,
            email,
            instagram_url,
            facebook_url,
            tiktok_url,
            youtube_url,
            linkedin_url
          `)
          .in("id", possibleProfileIds);

        if (profilesError) {
          console.error("Failed to load poster profiles:", profilesError);
        }

        const profilesMap = new Map(
          ((profilesData ?? []) as ProfileRow[]).map((profile) => [
            profile.id,
            profile,
          ])
        );

        contactProfile = row.contact_user_id
          ? profilesMap.get(row.contact_user_id) ?? null
          : null;

        userProfile = row.user_id ? profilesMap.get(row.user_id) ?? null : null;
      }

      const posterProfile =
        (contactProfile?.photo_url ? contactProfile : null) ||
        (userProfile?.photo_url ? userProfile : null) ||
        contactProfile ||
        userProfile ||
        null;

      const sortedImages = [...(row.property_images ?? [])].sort((a, b) => {
        const coverA = a.is_cover ? 1 : 0;
        const coverB = b.is_cover ? 1 : 0;

        if (coverA !== coverB) return coverB - coverA;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      const images = sortedImages.length
        ? sortedImages.map((img) => img.image_url)
        : ["/placeholder-property.jpg"];

      const postedByType = normalizePostedByType(
        row.contact_role,
        row.source
      );

      const spotlight = isPromotionActive(
        row.spotlight_active,
        row.spotlight_expires_at
      );

      const featured =
        row.plan_id === "featured" &&
        (!row.featured_expires_at || isFutureDate(row.featured_expires_at));

      const boosted = isPromotionActive(
        row.boost_active,
        row.boost_expires_at
      );

      const isVerified =
        row.verification_status === "verified" || Boolean(row.verified_ok);
        const isPendingVerification =
  !isVerified &&
  (
    row.verification_status === "pending_verification" ||
    row.verification_status === "pending_approval" ||
    row.status === "pending" ||
    row.status === "pending_approval"
  );

      const bedroomsValue = toNumberOrNull(row.bedrooms ?? row.bed);
      const bathroomsValue = toNumberOrNull(
        row.bathrooms ?? row.bathroom ?? row.bath
      );
      const floorsValue = toNumberOrNull(
        row.floors ?? row.floor ?? row.floor_count
      );
      const parkingValue = toNumberOrNull(
        row.parking_spaces ??
          row.parking ??
          row.garage_count ??
          row.carport_count
      );

      const rawParking = toStringOrEmpty(row.garage ?? row.parking).toLowerCase();
      const parkingAvailable =
        Boolean(row.facilities?.fac_parking) ||
        rawParking === "ada" ||
        rawParking === "available" ||
        rawParking === "yes" ||
        rawParking === "true";

      const localizedTitle =
        lang === "id"
          ? toStringOrEmpty(row.title_id) || toStringOrEmpty(row.title) || "-"
          : toStringOrEmpty(row.title) || toStringOrEmpty(row.title_id) || "-";

      const localizedDescription =
        lang === "id"
          ? toStringOrEmpty(row.description_id) ||
            toStringOrEmpty(row.description) ||
            "-"
          : toStringOrEmpty(row.description) ||
            toStringOrEmpty(row.description_id) ||
            "-";

      const mapped: PropertyItem = {
        id: row.id,
        slug: row.slug ?? undefined,
        jenisListing:
          row.listing_type === "disewa" ||
          row.listing_type === "dijual_disewa" ||
          row.listing_type === "lelang"
            ? row.listing_type
            : "dijual",
        rentalType: normalizeRentalType(row.rental_type),
        saleType: toStringOrEmpty(row.sale_type),
        leaseYearsValue: toNumberOrNull(row.lease_years),
        leaseUntilYearValue: toNumberOrNull(row.lease_until_year),
        leaseExtendable: toStringOrEmpty(row.lease_extendable),
        propertyType: row.property_type || "",

        title: localizedTitle,
        titleId: toStringOrEmpty(row.title_id),

        price: formatIdr(row.price ?? 0),
        priceValue: Number(row.price ?? 0),
        salePriceValue: Number(
          row.sale_price ??
            (row.listing_type === "dijual" ||
            row.listing_type === "dijual_disewa"
              ? row.price
              : 0) ??
            0
        ),
        rentPriceValue: Number(
          row.rent_price ??
            (row.listing_type === "disewa" ? row.price : 0) ??
            0
        ),
        province: row.province ?? "-",
        area: row.city || row.area || "-",
        furnished: mapFurnishing(row.furnishing ?? row.furnished, lang),
        certificate: toStringOrEmpty(row.certificate ?? row.sertifikat) || "-",
        marketType: toStringOrEmpty(row.market_type ?? row.marketType),

        description: localizedDescription,
        descriptionId: toStringOrEmpty(row.description_id),
        descriptionEn: row.description_en || "",

        viewCount: Number(row.view_count ?? 0),

        agency:
          row.contact_agency ||
          posterProfile?.agency ||
          (postedByType === "agent"
            ? "Tetamo Agent"
            : postedByType === "developer"
              ? "Developer"
              : "Owner"),
        agentName:
          row.contact_name ||
          contactProfile?.full_name ||
          userProfile?.full_name ||
          "Tetamo User",
        images,
        videoUrl: row.video_url ?? null,
        photo: posterProfile?.photo_url || FALLBACK_POSTER_PHOTO,

        facilities: row.facilities ?? {},
        nearby: row.nearby ?? {},

        kodeListing: row.kode ?? "-",
        postedDate: formatPostedDate(row.posted_date || row.created_at),

        boosted,
        featured,
        spotlight,

        verifiedListing: isVerified,
pendingVerification: isPendingVerification,
ownerApproved: postedByType === "owner" && isVerified,
agentVerified: postedByType === "agent" && isVerified,

        postedByType,
        receiverId: row.contact_user_id || row.user_id || "",
        receiverName:
          row.contact_name ||
          contactProfile?.full_name ||
          userProfile?.full_name ||
          "Tetamo User",
        receiverWhatsapp: normalizeWhatsapp(
          row.contact_phone || contactProfile?.phone || userProfile?.phone
        ),

        instagramUrl:
          posterProfile?.instagram_url ||
          contactProfile?.instagram_url ||
          userProfile?.instagram_url ||
          "",
        facebookUrl:
          posterProfile?.facebook_url ||
          contactProfile?.facebook_url ||
          userProfile?.facebook_url ||
          "",
        tiktokUrl:
          posterProfile?.tiktok_url ||
          contactProfile?.tiktok_url ||
          userProfile?.tiktok_url ||
          "",
        youtubeUrl:
          posterProfile?.youtube_url ||
          contactProfile?.youtube_url ||
          userProfile?.youtube_url ||
          "",
        linkedinUrl:
          posterProfile?.linkedin_url ||
          contactProfile?.linkedin_url ||
          userProfile?.linkedin_url ||
          "",

        buildingSizeValue: toNumberOrNull(row.building_size ?? row.lb),
        landSizeValue: toNumberOrNull(row.land_size ?? row.lt),
        bedroomsValue,
        bathroomsValue,
        floorsValue,
        parkingValue,
        parkingAvailable,
        electricityValue: toStringOrEmpty(
          row.electricity ?? row.listrik ?? row.power_capacity
        ),
        waterValue: toStringOrEmpty(
          row.water_source ?? row.water ?? row.air ?? row.jenis_air
        ),

        landUnit: toStringOrEmpty(row.land_unit ?? row.lt_unit) || "m2",
        pricePerSqmValue: toNumberOrNull(
          row.price_per_sqm ?? row.price_per_m2 ?? row.price_per_meter
        ),
        pricePerAreValue: toNumberOrNull(row.price_per_are),
        pricePerHectareValue: toNumberOrNull(
          row.price_per_hectare ?? row.price_per_hektare
        ),
        frontageValue: toNumberOrNull(row.frontage ?? row.width),
        depthValue: toNumberOrNull(row.depth ?? row.length),
        dimensionText: toStringOrEmpty(
          row.dimension_text ?? row.dimension ?? row.land_dimension
        ),
        roadAccess: toStringOrEmpty(row.road_access ?? row.akses_jalan),
        ownershipType: toStringOrEmpty(
          row.ownership_type ?? row.jenis_kepemilikan ?? row.ownership
        ),
        landType: toStringOrEmpty(row.land_type ?? row.jenis_tanah),
        zoningType: toStringOrEmpty(
          row.zoning_type ?? row.jenis_zoning ?? row.zoning
        ),
        unitFloorValue: toNumberOrNull(
          row.unit_floor ?? row.floor_level ?? row.lantai_unit
        ),
        towerBlock: toStringOrEmpty(
          row.tower_block ?? row.tower ?? row.block ?? row.blok
        ),
        ceilingHeightValue: toNumberOrNull(
          row.ceiling_height ?? row.high_ceiling ?? row.tinggi_plafon
        ),
      };

      if (!ignore) {
        setProperty(mapped);
        setOrderedProperties(
          ((idRows ?? []) as Array<{
            id: string;
            slug: string | null;
            status: string | null;
            is_paused: boolean | null;
            listing_expires_at: string | null;
            transaction_status: string | null;
          }>)
            .filter((item) =>
              isListingPublic({
                status: item.status ?? "",
                is_paused: item.is_paused,
                listing_expires_at: item.listing_expires_at,
                transaction_status: item.transaction_status,
              })
            )
            .map((x) => ({ id: x.id, slug: x.slug ?? undefined }))
        );
        setLoading(false);
      }
    }

    loadProperty();

    return () => {
      ignore = true;
    };
  }, [id, lang]);

useEffect(() => {
  if (!property?.id) return;

  const propertyId = property.id;
  const propertyTitle = property.title;
  const propertyCode = property.kodeListing ?? null;
  const listingType = property.jenisListing;
  const rentalType = property.rentalType || null;
  const propertyType = property.propertyType;
  const postedByType = property.postedByType;
  const propertyArea = property.area;
  const propertyProvince = property.province;

  if (trackedDetailViewRef.current === propertyId) return;

  trackedDetailViewRef.current = propertyId;

  async function trackDetailView() {
    try {
      const visitorHash = getOrCreateVisitorHash();

      const { data, error } = await (supabase as any).rpc(
        "track_property_view",
        {
          p_property_id: propertyId,
          p_visitor_hash: visitorHash,
        }
      );

      if (!error && typeof data === "number") {
        setProperty((prev) =>
          prev && prev.id === propertyId
            ? {
                ...prev,
                viewCount: Number(data),
              }
            : prev
        );
      }

      if (error) {
        console.error("Failed to track property view count:", error);
      }
    } catch (error) {
      console.error("Failed to call property view RPC:", error);
    }

    void trackEvent({
      event_name: "property_detail_view",
      property_id: propertyId,
      source_page: "property_detail",
      metadata: {
        property_title: propertyTitle,
        property_code: propertyCode,
        listing_type: listingType,
        rental_type: rentalType,
        property_type: propertyType,
        posted_by_type: postedByType,
        area: propertyArea,
        province: propertyProvince,
      },
    });
  }

  void trackDetailView();
}, [
  property?.id,
  property?.title,
  property?.kodeListing,
  property?.jenisListing,
  property?.rentalType,
  property?.propertyType,
  property?.postedByType,
  property?.area,
  property?.province,
]);

  useEffect(() => {
    let ignore = false;

    async function loadEngagement() {
      if (!property) return;

      setLiked(false);
      setSaved(false);
      setUserRating(0);
      setDisplayLikeCount(0);
      setDisplaySaveCount(0);
      setDisplayRatingAverage(0);
      setDisplayRatingCount(0);
      setDisplayShareCount(0);

      try {
        const [summaryRes, savedRes, likedRes, userRatingRes] =
          await Promise.all([
            supabase
              .from("property_engagement_summary")
              .select(
                "save_count, like_count, rating_count, avg_rating, share_count"
              )
              .eq("property_id", property.id)
              .maybeSingle(),
            authUserId
              ? supabase
                  .from("saved_properties")
                  .select("id")
                  .eq("user_id", authUserId)
                  .eq("property_id", property.id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null } as any),
            authUserId
              ? supabase
                  .from("property_likes")
                  .select("id")
                  .eq("user_id", authUserId)
                  .eq("property_id", property.id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null } as any),
            authUserId
              ? supabase
                  .from("property_ratings")
                  .select("rating")
                  .eq("user_id", authUserId)
                  .eq("property_id", property.id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null } as any),
          ]);

        if (ignore) return;

        if (summaryRes.data) {
          const summary = summaryRes.data as any;
          setDisplaySaveCount(Number(summary.save_count || 0));
          setDisplayLikeCount(Number(summary.like_count || 0));
          setDisplayRatingCount(Number(summary.rating_count || 0));
          setDisplayRatingAverage(
            Number(Number(summary.avg_rating || 0).toFixed(1))
          );
          setDisplayShareCount(Number(summary.share_count || 0));
        }

        setSaved(Boolean(savedRes.data));
        setLiked(Boolean(likedRes.data));
        setUserRating(Number((userRatingRes.data as any)?.rating || 0));
      } catch (error) {
        console.error("Failed to load property engagement:", error);
      }
    }

    loadEngagement();

    return () => {
      ignore = true;
    };
  }, [property, authUserId]);

  const propertyIndex = useMemo(
    () => orderedProperties.findIndex((x) => x.id === id),
    [orderedProperties, id]
  );

  const prevProperty =
    propertyIndex > 0 ? orderedProperties[propertyIndex - 1] : null;
  const nextProperty =
    propertyIndex >= 0 && propertyIndex < orderedProperties.length - 1
      ? orderedProperties[propertyIndex + 1]
      : null;

  const nextImg = () =>
    property &&
    setIdx((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));

  const prevImg = () =>
    property &&
    setIdx((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));

  async function ensureAuthenticated() {
    if (authUserId) return authUserId;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      setAuthUserId(user.id);
      return user.id;
    }

    alert(
      lang === "id"
        ? "Silakan login terlebih dahulu."
        : "Please log in first."
    );
    router.push(`/login?next=${encodeURIComponent(pathname)}`);
    return null;
  }

  async function toggleSave() {
    if (!property) return;

    const userId = await ensureAuthenticated();
    if (!userId) return;

    const currentlySaved = saved;

    setSaved(!currentlySaved);
    setDisplaySaveCount((prev) =>
      Math.max(0, prev + (currentlySaved ? -1 : 1))
    );

    if (currentlySaved) {
      const { error } = await supabase
        .from("saved_properties")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", property.id);

      if (error) {
        console.error("Failed to remove saved property:", error);
        setSaved(true);
        setDisplaySaveCount((prev) => prev + 1);
      }
      return;
    }

    const { error } = await supabase.from("saved_properties").insert({
      user_id: userId,
      property_id: property.id,
    });

    if (error) {
      console.error("Failed to save property:", error);
      setSaved(false);
      setDisplaySaveCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function toggleLike() {
    if (!property) return;

    const userId = await ensureAuthenticated();
    if (!userId) return;

    const currentlyLiked = liked;

    setLiked(!currentlyLiked);
    setDisplayLikeCount((prev) =>
      Math.max(0, prev + (currentlyLiked ? -1 : 1))
    );

    if (currentlyLiked) {
      const { error } = await supabase
        .from("property_likes")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", property.id);

      if (error) {
        console.error("Failed to remove property like:", error);
        setLiked(true);
        setDisplayLikeCount((prev) => prev + 1);
      }
      return;
    }

    const { error } = await supabase.from("property_likes").insert({
      user_id: userId,
      property_id: property.id,
    });

    if (error) {
      console.error("Failed to like property:", error);
      setLiked(false);
      setDisplayLikeCount((prev) => Math.max(0, prev - 1));
    }
  }

  async function handleRate(nextValue: number) {
    if (!property) return;

    const userId = await ensureAuthenticated();
    if (!userId) return;

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

    if (nextRating === 0) {
      const { error } = await supabase
        .from("property_ratings")
        .delete()
        .eq("user_id", userId)
        .eq("property_id", property.id);

      if (error) {
        console.error("Failed to delete property rating:", error);
        setUserRating(currentRating);
        setDisplayRatingCount(currentCount);
        setDisplayRatingAverage(currentAverage);
      }
      return;
    }

    const { error } = await supabase.from("property_ratings").upsert(
      {
        user_id: userId,
        property_id: property.id,
        rating: nextRating,
      },
      { onConflict: "user_id,property_id" }
    );

    if (error) {
      console.error("Failed to rate property:", error);
      setUserRating(currentRating);
      setDisplayRatingCount(currentCount);
      setDisplayRatingAverage(currentAverage);
    }
  }

  async function handleShare() {
    if (!property) return;

    const shareUrl = `${window.location.origin}${getPropertyHref(property)}`;
    const shareText =
      lang === "id"
        ? `Lihat properti ini di TETAMO:\n\n${property.title}\n${property.area}, ${property.province}`
        : `Check out this property on TETAMO:\n\n${property.title}\n${property.area}, ${property.province}`;

    let shareMethod = "copy_link";

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

    setDisplayShareCount((prev) => prev + 1);
  }

  function openJadwal() {
    setJadwalOpen(true);
  }

  function closeJadwal() {
    setJadwalOpen(false);
  }

  function openJadwalWithTracking() {
    if (!property) return;

    void trackEvent({
      event_name: "property_schedule_viewing_click",
      property_id: property.id,
      source_page: "property_detail",
      metadata: {
        button: "schedule_viewing",
        property_title: property.title,
        property_code: property.kodeListing ?? null,
        listing_type: property.jenisListing,
        rental_type: property.rentalType || null,
        property_type: property.propertyType,
        posted_by_type: property.postedByType,
        area: property.area,
        province: property.province,
      },
    });

    openJadwal();
  }

  const displayPrice = property
    ? formatPriceByCurrency(property.priceValue, currentCurrency)
    : "";

  const secondaryPrices = property
    ? formatSecondaryPrices(property.priceValue, currentCurrency)
    : [];

  const hasSale =
    property?.jenisListing === "dijual" ||
    property?.jenisListing === "dijual_disewa";

  const hasRent =
    property?.jenisListing === "disewa" ||
    property?.jenisListing === "dijual_disewa";

  const isAuction =
    property?.jenisListing === "lelang";

  const isSaleLike = hasSale || isAuction;

  const saleDisplayPrice = property
    ? formatPriceByCurrency(property.salePriceValue, currentCurrency)
    : "";

  const saleSecondaryPrices = property
    ? formatSecondaryPrices(property.salePriceValue, currentCurrency)
    : [];

  const rentDisplayPrice = property
    ? formatPriceByCurrency(property.rentPriceValue, currentCurrency)
    : "";

  const rentSecondaryPrices = property
    ? formatSecondaryPrices(property.rentPriceValue, currentCurrency)
    : [];

  const rentalPeriod =
    property?.rentalType === "monthly"
      ? lang === "id"
        ? "Bulan"
        : "Month"
      : property?.rentalType === "yearly"
        ? lang === "id"
          ? "Tahun"
          : "Year"
        : property?.rentalType === "daily"
          ? lang === "id"
            ? "Hari"
            : "Day"
          : "";

  const combinedPriceSummary =
    property?.jenisListing === "dijual_disewa"
      ? `${saleDisplayPrice} — ${
          lang === "id" ? "Dijual" : "For Sale"
        } | ${rentDisplayPrice}${
          rentalPeriod ? ` / ${rentalPeriod}` : ""
        } — ${lang === "id" ? "Disewa" : "For Rent"}`
      : displayPrice;

  const listingLabel =
    property?.jenisListing === "dijual_disewa"
      ? lang === "id"
        ? "Dijual + Disewa"
        : "For Sale + For Rent"
      : property?.jenisListing === "lelang"
        ? lang === "id"
          ? "Lelang"
          : "Auction"
        : property?.jenisListing === "dijual"
          ? lang === "id"
            ? "Dijual"
            : "For Sale"
          : lang === "id"
            ? "Disewa"
            : "For Rent";

  async function handleWhatsAppClick() {
    if (!property) return;

    if (!property.receiverWhatsapp) {
      alert(
        lang === "id"
          ? "Nomor WhatsApp penjual belum tersedia."
          : "Seller WhatsApp number is not available yet."
      );
      return;
    }

    const message =
      lang === "id"
        ? `Halo ${property.receiverName}, saya tertarik dengan properti ini di TETAMO.

Properti: ${property.title}
Kode: ${property.kodeListing ?? "-"}
Lokasi: ${property.area}, ${property.province}
Harga: ${combinedPriceSummary}

Apakah properti ini masih tersedia?`
        : `Hello ${property.receiverName}, I'm interested in this property on TETAMO.

Property: ${property.title}
Code: ${property.kodeListing ?? "-"}
Location: ${property.area}, ${property.province}
Price: ${combinedPriceSummary}

Is this property still available?`;

    const whatsappURL = `https://wa.me/${
      property.receiverWhatsapp
    }?text=${encodeURIComponent(message)}`;

    const popup = window.open("about:blank", "_blank");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await trackEvent({
        event_name: "property_whatsapp_click",
        property_id: property.id,
        user_id: user?.id ?? null,
        source_page: "property_detail",
        metadata: {
          button: "whatsapp",
          property_title: property.title,
          property_code: property.kodeListing ?? null,
          listing_type: property.jenisListing,
          rental_type: property.rentalType || null,
          property_type: property.propertyType,
          posted_by_type: property.postedByType,
          area: property.area,
          province: property.province,
          receiver_id: property.receiverId || null,
          receiver_name: property.receiverName || null,
        },
      });

      let senderProfile:
        | {
            full_name: string | null;
            phone: string | null;
            email: string | null;
          }
        | null = null;

      if (user?.id) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", user.id)
          .maybeSingle();

        senderProfile = profileData;
      }

      const leadPayload = {
  property_id: property.id,
  property_code: property.kodeListing ?? null,
  property_title: property.title,

  sender_user_id: user?.id || null,
        sender_name:
          senderProfile?.full_name ||
          (typeof user?.user_metadata?.full_name === "string"
            ? user.user_metadata.full_name
            : null),
        sender_email: senderProfile?.email || user?.email || null,
        sender_phone: senderProfile?.phone || null,

        receiver_user_id: property.receiverId || null,
        receiver_name: property.receiverName || null,
        receiver_role: property.postedByType || "owner",

        assigned_admin_user_id: null,
        admin_visible: true,

        lead_type: "whatsapp",
        source: "whatsapp_button",
        message,
        viewing_date: null,
        viewing_time: null,

        status: "new",
        priority: "normal",
        notes: null,
      };

      const { data: insertedLead, error } = await supabase
        .from("leads")
        .insert(leadPayload)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("WhatsApp lead insert error:", error);
      } else if (insertedLead?.id && user?.id) {
        await trackEvent({
          event_name: "lead_created",
          property_id: property.id,
          user_id: user.id,
          source_page: "property_detail",
          lead_id: String(insertedLead.id),
          metadata: {
            lead_type: "whatsapp",
            source: "whatsapp_button",
            property_title: property.title,
            property_code: property.kodeListing ?? null,
          },
        });

        try {
          if (property.receiverId) {
            await createNotification({
              userId: property.receiverId,
              relatedUserId: user.id,
              propertyId: property.id,
              leadId: insertedLead.id,
              type: "new_whatsapp_inquiry",
              title: "New WhatsApp inquiry",
              body:
                lang === "id"
                  ? `Ada WhatsApp inquiry baru untuk "${property.title}".`
                  : `There is a new WhatsApp inquiry for "${property.title}".`,
              audience: "user",
              priority: "high",
            });
          }

          await notifyAdmins({
            relatedUserId: user.id,
            propertyId: property.id,
            leadId: insertedLead.id,
            type: "new_whatsapp_inquiry",
            title: "New WhatsApp inquiry",
            body: `New WhatsApp inquiry for "${property.title}".`,
            priority: "high",
          });
        } catch (notifyError) {
          console.error("Failed to notify WhatsApp inquiry:", notifyError);
        }
      }
    } catch (err) {
      console.error("Failed to create WhatsApp lead:", err);
    } finally {
      if (popup) {
        popup.location.href = whatsappURL;
      } else {
        window.location.href = whatsappURL;
      }
    }
  }

  async function handleViewingRequest() {
    if (!property || !selectedDate || !selectedTime) return;

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert(
        lang === "id"
          ? "Silakan login terlebih dahulu."
          : "Please log in first."
      );
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", user.id)
      .maybeSingle();

    const message =
      lang === "id"
        ? `Request viewing untuk ${property.title} pada ${selectedDate} jam ${selectedTime}`
        : `Viewing request for ${property.title} on ${selectedDate} at ${selectedTime}`;

    const leadPayload = {
  property_id: property.id,
  property_code: property.kodeListing ?? null,
  property_title: property.title,

      sender_user_id: user.id,
      sender_name:
        senderProfile?.full_name ||
        (typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "Tetamo User"),
      sender_email: senderProfile?.email || user.email || null,
      sender_phone: senderProfile?.phone || null,

      receiver_user_id: property.receiverId || null,
      receiver_name: property.receiverName || null,
      receiver_role: property.postedByType || "owner",

      assigned_admin_user_id: null,
      admin_visible: true,

      lead_type: "viewing",
      source: "viewing_form",
      message,
      viewing_date: selectedDate,
      viewing_time: selectedTime,
      status: "new",
      priority: "normal",
      notes: null,
    };

    const { data: insertedLead, error } = await supabase
      .from("leads")
      .insert(leadPayload)
      .select("id")
      .single();

    if (error || !insertedLead?.id) {
      console.error("Viewing lead insert error:", error);
      alert(error?.message || "Failed to save viewing request.");
      return;
    }

    await trackEvent({
      event_name: "lead_created",
      property_id: property.id,
      user_id: user.id,
      source_page: "property_detail",
      lead_id: String(insertedLead.id),
      metadata: {
        lead_type: "viewing",
        source: "viewing_form",
        viewing_date: selectedDate,
        viewing_time: selectedTime,
        property_title: property.title,
        property_code: property.kodeListing ?? null,
      },
    });

    try {
      if (property.receiverId) {
        await createNotification({
          userId: property.receiverId,
          relatedUserId: user.id,
          propertyId: property.id,
          leadId: insertedLead.id,
          type: "new_viewing_request",
          title: "New viewing request",
          body:
            lang === "id"
              ? `Ada permintaan viewing untuk "${property.title}" pada ${selectedDate} jam ${selectedTime}.`
              : `There is a new viewing request for "${property.title}" on ${selectedDate} at ${selectedTime}.`,
          audience: "user",
          priority: "high",
        });
      }

      await notifyAdmins({
        relatedUserId: user.id,
        propertyId: property.id,
        leadId: insertedLead.id,
        type: "new_viewing_request",
        title: "New viewing request",
        body: `Viewing requested for "${property.title}" on ${selectedDate} at ${selectedTime}.`,
        priority: "high",
      });
    } catch (notifyError) {
      console.error("Failed to notify viewing request:", notifyError);
    }

    const posterLabel = getPosterLabel(property.postedByType, lang);

    alert(
      lang === "id"
        ? `Jadwal viewing berhasil dikirim. ${posterLabel} akan menghubungi Anda untuk konfirmasi.`
        : `Viewing request sent successfully. ${posterLabel} will contact you for confirmation.`
    );
    setJadwalOpen(false);
    setSelectedDate("");
    setSelectedTime("");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:text-base">
            {lang === "id" ? "Memuat properti..." : "Loading property..."}
          </div>
        </div>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="text-2xl font-bold">
            {lang === "id" ? "Properti tidak ditemukan" : "Property not found"}
          </h1>
          <Link
            href="/properti"
            className="mt-4 inline-block text-[#1C1C1E] underline"
          >
            {lang === "id" ? "Kembali ke Marketplace" : "Back to Marketplace"}
          </Link>
        </div>
      </main>
    );
  }

  const propertyTypeLabel = formatPropertyType(property.propertyType, lang);
  const isApartment = isApartmentType(property.propertyType);
  const isLand = isLandType(property.propertyType);
  const isIndustrial = isIndustrialType(property.propertyType);

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

  const detailChips: DetailChip[] = [
    {
      key: "type",
      label: lang === "id" ? "Tipe Properti" : "Property Type",
      value: propertyTypeLabel || "-",
      icon: Home,
    },

    !isLand && property.bedroomsValue
      ? {
          key: "bed",
          label: lang === "id" ? "Kamar Tidur" : "Bedrooms",
          value: formatNumber(property.bedroomsValue),
          icon: BedDouble,
        }
      : null,

    !isLand && property.bathroomsValue
      ? {
          key: "bath",
          label: lang === "id" ? "Kamar Mandi" : "Bathrooms",
          value: formatNumber(property.bathroomsValue),
          icon: Bath,
        }
      : null,

    usesLandSizeForType(property.propertyType) && property.landSizeValue
      ? {
          key: "land",
          label: lang === "id" ? "Luas Tanah" : "Land Size",
          value: formatLandSize(property.landSizeValue, property.landUnit),
          icon: Square,
        }
      : null,

    !isLand && property.buildingSizeValue
      ? {
          key: "building",
          label: lang === "id" ? "Luas Bangunan" : "Building Size",
          value: `${formatNumber(property.buildingSizeValue)} m²`,
          icon: Ruler,
        }
      : null,

    property.parkingValue || property.parkingAvailable
      ? {
          key: "parking",
          label: lang === "id" ? "Parkir" : "Parking",
          value: property.parkingValue
            ? formatNumber(property.parkingValue)
            : lang === "id"
              ? "Tersedia"
              : "Available",
          icon: CarFront,
        }
      : null,

    !isLand && property.floorsValue
      ? {
          key: "floors",
          label: lang === "id" ? "Lantai" : "Floors",
          value: formatNumber(property.floorsValue),
          icon: Layers3,
        }
      : null,

    isApartment && property.unitFloorValue
      ? {
          key: "unitFloor",
          label: lang === "id" ? "Lantai Unit" : "Unit Floor",
          value: formatNumber(property.unitFloorValue),
          icon: Layers3,
        }
      : null,

    isApartment && property.towerBlock
      ? {
          key: "tower",
          label: lang === "id" ? "Tower / Blok" : "Tower / Block",
          value: property.towerBlock,
          icon: Home,
        }
      : null,

    property.electricityValue
      ? {
          key: "electricity",
          label: lang === "id" ? "Listrik" : "Electricity",
          value: property.electricityValue,
          icon: Zap,
        }
      : null,

    property.waterValue
      ? {
          key: "water",
          label: lang === "id" ? "Air" : "Water",
          value: property.waterValue,
          icon: Droplets,
        }
      : null,

    !isLand && property.furnished && property.furnished !== "-"
      ? {
          key: "furnishing",
          label: lang === "id" ? "Furnishing" : "Furnishing",
          value: property.furnished,
          icon: Home,
        }
      : null,

    hasRent && property.rentalType
      ? {
          key: "rentalType",
          label: lang === "id" ? "Jenis Sewa" : "Rental Type",
          value: getRentalTypeLabel(property.rentalType, lang),
          icon: Clock,
        }
      : null,

    isSaleLike && property.saleType
      ? {
          key: "saleType",
          label: lang === "id" ? "Tipe Jual" : "Sale Type",
          value: getSaleTypeLabel(property.saleType, lang),
          icon: FileText,
        }
      : null,

    isSaleLike && property.leaseYearsValue
      ? {
          key: "leaseYears",
          label: lang === "id" ? "Masa Lease" : "Lease Term",
          value: `${formatNumber(property.leaseYearsValue)} ${
            lang === "id" ? "tahun" : "years"
          }`,
          icon: Clock,
        }
      : null,

    isSaleLike && property.leaseUntilYearValue
      ? {
          key: "leaseUntilYear",
          label: lang === "id" ? "Lease Sampai" : "Lease Until",
          value: String(property.leaseUntilYearValue),
          icon: Clock,
        }
      : null,

    isSaleLike && property.leaseExtendable
      ? {
          key: "leaseExtendable",
          label: lang === "id" ? "Perpanjangan" : "Extension",
          value: formatLeaseExtendable(property.leaseExtendable, lang),
          icon: FileText,
        }
      : null,

    property.pricePerSqmValue
      ? {
          key: "pricePerSqm",
          label: lang === "id" ? "Harga / m²" : "Price / m²",
          value: formatUnitPrice(property.pricePerSqmValue, currentCurrency, "m²"),
          icon: Ruler,
        }
      : null,

    property.pricePerAreValue
      ? {
          key: "pricePerAre",
          label: lang === "id" ? "Harga / Are" : "Price / Are",
          value: formatUnitPrice(property.pricePerAreValue, currentCurrency, "are"),
          icon: Square,
        }
      : null,

    property.pricePerHectareValue
      ? {
          key: "pricePerHectare",
          label: lang === "id" ? "Harga / Hektare" : "Price / Hectare",
          value: formatUnitPrice(
            property.pricePerHectareValue,
            currentCurrency,
            "ha"
          ),
          icon: Square,
        }
      : null,

    formatDimensionValue(
      property.dimensionText,
      property.frontageValue,
      property.depthValue
    )
      ? {
          key: "dimension",
          label: lang === "id" ? "Dimensi" : "Dimensions",
          value: formatDimensionValue(
            property.dimensionText,
            property.frontageValue,
            property.depthValue
          ),
          icon: Square,
        }
      : null,

    property.roadAccess
      ? {
          key: "roadAccess",
          label: lang === "id" ? "Akses Jalan" : "Road Access",
          value: property.roadAccess,
          icon: Home,
        }
      : null,

    property.ceilingHeightValue
      ? {
          key: "ceilingHeight",
          label: lang === "id" ? "Tinggi Plafon" : "Ceiling Height",
          value: `${formatNumber(property.ceilingHeightValue)} m`,
          icon: Layers3,
        }
      : null,

    property.certificate && property.certificate !== "-"
      ? {
          key: "certificate",
          label: lang === "id" ? "Sertifikat" : "Certificate",
          value: property.certificate,
          icon: FileText,
        }
      : null,

    property.ownershipType
      ? {
          key: "ownership",
          label: lang === "id" ? "Kepemilikan" : "Ownership",
          value: property.ownershipType,
          icon: FileText,
        }
      : null,

    property.marketType
      ? {
          key: "marketType",
          label: lang === "id" ? "Market Type" : "Market Type",
          value: formatMarketType(property.marketType),
          icon: Home,
        }
      : null,

    property.landType
      ? {
          key: "landType",
          label: lang === "id" ? "Jenis Tanah" : "Land Type",
          value: property.landType,
          icon: Square,
        }
      : null,

    property.zoningType
      ? {
          key: "zoning",
          label: lang === "id" ? "Zoning" : "Zoning",
          value: property.zoningType,
          icon: FileText,
        }
      : null,
  ].filter((item): item is DetailChip => Boolean(item && item.value && item.value !== "-"));

  const facilityLabels: Record<string, string> = {
    fac_ac: "AC",
    fac_pool: lang === "id" ? "Kolam Renang" : "Swimming Pool",
    fac_private_pool:
      lang === "id" ? "Kolam Renang Pribadi" : "Private Pool",
    fac_shared_pool:
      lang === "id" ? "Kolam Renang Bersama" : "Shared Pool",
    fac_gym: "Gym",
    fac_security: lang === "id" ? "Security 24 Jam" : "24-Hour Security",
    fac_cctv: "CCTV",
    fac_lift: lang === "id" ? "Lift" : "Lift",
    fac_parking: lang === "id" ? "Parkir" : "Parking",
    fac_garden: lang === "id" ? "Taman" : "Garden",
    fac_wifi: "WiFi",
    fac_water_heater: "Water Heater",
    fac_kitchen_set: "Kitchen Set",
    fac_dining_area: lang === "id" ? "Ruang Makan" : "Dining Area",
    fac_living_room: lang === "id" ? "Ruang Tamu" : "Living Room",
    fac_storage: lang === "id" ? "Gudang / Storage" : "Storage Room",
    fac_balcony: lang === "id" ? "Balkon" : "Balcony",
    fac_terrace: lang === "id" ? "Teras" : "Terrace",
    fac_laundry_area: lang === "id" ? "Area Laundry" : "Laundry Area",
    fac_carport: "Carport",
    fac_garage: lang === "id" ? "Garasi" : "Garage",
    fac_maid_room: lang === "id" ? "Kamar ART" : "Maid Room",
    fac_smart_lock: "Smart Lock",
    fac_smart_home: "Smart Home",
    fac_rooftop: "Rooftop",
    fac_gazebo: "Gazebo",
    fac_lobby: "Lobby",
    fac_reception: lang === "id" ? "Resepsionis" : "Reception",
    fac_access_card: lang === "id" ? "Kartu Akses" : "Access Card",
    fac_basement_parking:
      lang === "id" ? "Parkir Basement" : "Basement Parking",
    fac_function_room: "Function Room",
    fac_playground:
      lang === "id" ? "Taman Bermain Anak" : "Kids Playground",
    fac_loading_dock: "Loading Dock",
    fac_truck_access: lang === "id" ? "Akses Truk" : "Truck Access",
    fac_office_room: lang === "id" ? "Ruang Kantor" : "Office Room",
    fac_staff_room: lang === "id" ? "Ruang Staff" : "Staff Room",
    fac_generator: "Generator",
    fac_three_phase:
      lang === "id" ? "Listrik 3 Phase" : "3-Phase Electricity",
    fac_high_ceiling: lang === "id" ? "Plafon Tinggi" : "High Ceiling",
    fac_meeting_room: lang === "id" ? "Ruang Meeting" : "Meeting Room",
    fac_restaurant: lang === "id" ? "Restoran" : "Restaurant",
    fac_spa: "Spa",
    fac_housekeeping:
      lang === "id" ? "Ruang Housekeeping" : "Housekeeping Room",
  };

  const nearbyLabels: Record<string, string> = {
    near_toll: lang === "id" ? "Akses Tol" : "Toll Access",
    near_mall: "Mall",
    near_school: lang === "id" ? "Sekolah" : "School",
    near_hospital: lang === "id" ? "Rumah Sakit" : "Hospital",
    near_station: lang === "id" ? "Stasiun" : "Station",
    near_airport: lang === "id" ? "Bandara" : "Airport",
    near_port: lang === "id" ? "Pelabuhan" : "Port",
    near_market: lang === "id" ? "Pasar" : "Market",
    near_office: lang === "id" ? "Perkantoran" : "Office Area",
    near_beach: lang === "id" ? "Pantai" : "Beach",
    near_university: lang === "id" ? "Universitas" : "University",
    near_supermarket: lang === "id" ? "Supermarket" : "Supermarket",
    near_cafe: "Cafe",
    near_restaurant: lang === "id" ? "Restoran" : "Restaurant",
    near_gym: "Gym",
    near_coworking:
      lang === "id" ? "Co-working Space" : "Co-working Space",
    near_beach_club: lang === "id" ? "Beach Club" : "Beach Club",
    near_traditional_market:
      lang === "id" ? "Pasar Tradisional" : "Traditional Market",
    near_international_school:
      lang === "id" ? "Sekolah Internasional" : "International School",
    near_clinic: lang === "id" ? "Klinik" : "Clinic",
    near_pharmacy: lang === "id" ? "Apotek" : "Pharmacy",
    near_main_road: lang === "id" ? "Jalan Utama" : "Main Road",
    near_tourist_attraction:
      lang === "id" ? "Tempat Wisata" : "Tourist Attraction",
  };

  const activeFacilities = Object.entries(property.facilities ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => facilityLabels[key] ?? key);

  const activeNearby = Object.entries(property.nearby ?? {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => nearbyLabels[key] ?? key);

  const activeTitle = property.title;

  const activeDescription =
    lang === "id"
      ? property.descriptionId || property.description
      : property.description || property.descriptionId;

  const structuredDescription = getStructuredDescription(activeDescription, lang);

const reportLocation = `${property.area}, ${property.province}`;

const reportListingHref = `/report/listing?property_id=${encodeURIComponent(
  property.id
)}&listing_code=${encodeURIComponent(
  property.kodeListing || ""
)}&title=${encodeURIComponent(activeTitle || "")}&location=${encodeURIComponent(
  reportLocation
)}`;

const reporterRoleLabel =
  property.postedByType === "owner"
    ? lang === "id"
      ? "Pemilik"
      : "Owner"
    : property.postedByType === "developer"
      ? "Developer"
      : lang === "id"
        ? "Agen"
        : "Agent";

const reportUserHref = `/report/user?reported_user_id=${encodeURIComponent(
  property.receiverId || ""
)}&name=${encodeURIComponent(
  property.receiverName || property.agentName || "Tetamo User"
)}&role=${encodeURIComponent(
  reporterRoleLabel
)}&listing_code=${encodeURIComponent(property.kodeListing || "")}`;

const hasPosterPhoto = Boolean(
  property.photo &&
  property.photo !== FALLBACK_POSTER_PHOTO
);

const posterInitials =
  (property.agentName ||
    property.receiverName ||
    "Tetamo")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "T";

const detailPromoTheme = property.spotlight
  ? {
      border: "border-cyan-200/80",
      glow: "bg-cyan-400/20",
    }
  : property.featured
    ? {
        border: "border-[#D8B46A]/70",
        glow: "bg-[#D8B46A]/22",
      }
    : property.boosted
      ? {
          border: "border-orange-200/80",
          glow: "bg-orange-300/20",
        }
      : {
          border: "border-[#E8E2D8]",
          glow: "bg-gray-200/20",
        };


  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* =========================================
    TOP NAVIGATION
========================================= */}
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

  <Link
    href="/properti"
    className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5DFD4] bg-white px-4 py-2.5 text-sm font-bold text-[#1C1C1E] transition hover:border-[#B8860B] hover:text-[#B8860B]"
  >
    <span>←</span>

    <span>
      {lang === "id"
        ? "Kembali ke Marketplace"
        : "Back to Marketplace"}
    </span>
  </Link>

  <div className="flex items-center gap-2">

    {prevProperty ? (
      <Link
        href={getPropertyHref(prevProperty)}
        className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#E5DFD4] bg-white px-4 text-xs font-bold text-[#1C1C1E] transition hover:border-[#B8860B] hover:text-[#B8860B] sm:text-sm"
      >
        ← {lang === "id" ? "Sebelumnya" : "Prev"}
      </Link>
    ) : (
      <button
        type="button"
        disabled
        className="inline-flex min-h-[42px] cursor-not-allowed items-center justify-center rounded-full border border-[#E5DFD4] bg-white px-4 text-xs font-bold text-gray-300 sm:text-sm"
      >
        ← {lang === "id" ? "Sebelumnya" : "Prev"}
      </button>
    )}

    {nextProperty ? (
      <Link
        href={getPropertyHref(nextProperty)}
        className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#E5DFD4] bg-white px-4 text-xs font-bold text-[#1C1C1E] transition hover:border-[#B8860B] hover:text-[#B8860B] sm:text-sm"
      >
        {lang === "id" ? "Berikutnya" : "Next"} →
      </Link>
    ) : (
      <button
        type="button"
        disabled
        className="inline-flex min-h-[42px] cursor-not-allowed items-center justify-center rounded-full border border-[#E5DFD4] bg-white px-4 text-xs font-bold text-gray-300 sm:text-sm"
      >
        {lang === "id" ? "Berikutnya" : "Next"} →
      </button>
    )}

  </div>
</div>


{/* =========================================
    HERO — GALLERY + CONVERSION PANEL
========================================= */}
<div className="mt-6 grid items-start gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(400px,0.7fr)]">

  {/* =====================================
      LEFT — PROPERTY GALLERY
  ===================================== */}
  <section className="min-w-0">

    <div className="rounded-[30px] border border-[#E8E2D8] bg-white p-3 shadow-[0_18px_55px_rgba(0,0,0,0.06)] sm:p-4">

      {/* MAIN IMAGE */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#F2F0EB]">

        <img
          src={property.images[idx]}
          alt={activeTitle}
          className="h-full w-full object-cover transition duration-700"
        />

        {/* PHOTO GRADIENT */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

        {/* TOP LEFT — IMAGE COUNT */}
        <div className="absolute left-4 top-4 z-20 inline-flex items-center rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md sm:text-xs">
          {idx + 1} / {property.images.length}
        </div>

        {/* TOP RIGHT — TETAMO */}
        <div className="absolute right-4 top-4 z-20 rounded-full border border-white/15 bg-[#1C1C1E]/85 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-md sm:text-xs">
          TETAMO
        </div>

        {/* BOTTOM PROPERTY BADGES */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center gap-2">

          <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#1C1C1E] shadow-sm sm:text-xs">
            {listingLabel}
          </span>

          {hasRent && property.rentalType ? (
            <span
              className={`rounded-full border px-3 py-1.5 text-[10px] font-bold shadow-sm sm:text-xs ${rentalTypeBadgeClass(
                property.rentalType
              )}`}
            >
              {getRentalTypeLabel(
                property.rentalType,
                lang
              )}
            </span>
          ) : null}

          {propertyTypeLabel ? (
            <span className="rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-md sm:text-xs">
              {propertyTypeLabel}
            </span>
          ) : null}

        </div>

        {/* IMAGE ARROWS */}
        {property.images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prevImg}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-xl text-white backdrop-blur-md transition hover:scale-110 hover:bg-black/80"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={nextImg}
              aria-label="Next image"
              className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-xl text-white backdrop-blur-md transition hover:scale-110 hover:bg-black/80"
            >
              ›
            </button>
          </>
        ) : null}

      </div>


      {/* THUMBNAILS */}
      {property.images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

          {property.images
            .slice(0, 8)
            .map((image, imageIndex) => (
              <button
                key={`${image}-${imageIndex}`}
                type="button"
                onClick={() =>
                  setIdx(imageIndex)
                }
                className={[
                  "relative h-16 w-20 shrink-0 overflow-hidden rounded-[14px] border-2 transition sm:h-18 sm:w-24",
                  idx === imageIndex
                    ? "border-[#B8860B]"
                    : "border-transparent opacity-70 hover:opacity-100",
                ].join(" ")}
              >
                <img
                  src={image}
                  alt={`${activeTitle} ${imageIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}

        </div>
      ) : null}

    </div>

  </section>


  {/* =====================================
      RIGHT — CONVERSION PANEL
  ===================================== */}
  <aside className="relative min-w-0 lg:sticky lg:top-24">

    {/* PROMOTION GLOW */}
    <div
      className={[
        "pointer-events-none absolute -inset-2 rounded-[36px] opacity-70 blur-[34px]",
        detailPromoTheme.glow,
      ].join(" ")}
    />

    <div
      className={[
        "relative overflow-hidden rounded-[30px] border bg-white p-5 shadow-[0_20px_65px_rgba(0,0,0,0.08)] sm:p-6",
        detailPromoTheme.border,
      ].join(" ")}
    >

      {/* DECORATION */}
      <div
        className={[
          "pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-70 blur-[70px]",
          detailPromoTheme.glow,
        ].join(" ")}
      />


      <div className="relative z-10">

        {/* =================================
            PRICE + SAVE / SHARE
        ================================= */}
        <div className="flex items-start justify-between gap-5">

          <div className="min-w-0">

            {property.jenisListing === "dijual_disewa" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[26px] font-extrabold leading-tight tracking-[-0.04em] text-[#1C1C1E] sm:text-[30px]">
                    {saleDisplayPrice} — {lang === "id" ? "Dijual" : "For Sale"}
                  </p>

                  {saleSecondaryPrices.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-gray-400 sm:text-sm">
                      {saleSecondaryPrices.map((item) => (
                        <span key={item}>≈ {item}</span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div>
                  <p className="text-[21px] font-extrabold leading-tight text-[#1C1C1E] sm:text-[24px]">
                    {rentDisplayPrice}
                    {rentalPeriod ? ` / ${rentalPeriod}` : ""} —{" "}
                    {lang === "id" ? "Disewa" : "For Rent"}
                  </p>

                  {rentSecondaryPrices.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-gray-400 sm:text-sm">
                      {rentSecondaryPrices.map((item) => (
                        <span key={item}>
                          ≈ {item}
                          {rentalPeriod ? ` / ${rentalPeriod}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <p className={`text-[30px] font-extrabold leading-none tracking-[-0.045em] text-[#1C1C1E] sm:text-[34px] ${
              property.jenisListing === "dijual_disewa" ? "hidden" : ""
            }`}>
              {displayPrice}
            </p>

            {property.jenisListing !== "dijual_disewa" &&
            secondaryPrices.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-gray-400 sm:text-sm">
                {secondaryPrices.map(
                  (item) => (
                    <span key={item}>
                      ≈ {item}
                    </span>
                  )
                )}
              </div>
            ) : null}

          </div>


          {/* QUICK ACTIONS */}
          <div className="flex shrink-0 items-center gap-2">

            <button
              type="button"
              onClick={toggleSave}
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
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full border transition",
                saved
                  ? "border-[#D8B46A] bg-[#F8F2E5] text-[#B8860B]"
                  : "border-[#E5DFD4] bg-white text-gray-500 hover:border-[#B8860B] hover:text-[#B8860B]",
              ].join(" ")}
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
              onClick={handleShare}
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5DFD4] bg-white text-gray-500 transition hover:border-[#B8860B] hover:text-[#B8860B]"
            >
              <Share2 className="h-4 w-4" />
            </button>

          </div>

        </div>


        {/* =================================
            PROMOTION + VERIFICATION
        ================================= */}
        <div className="mt-5 flex flex-wrap gap-2">

          {property.spotlight ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-cyan-700">
              <Gem className="h-3.5 w-3.5" />
              Spotlight
            </span>
          ) : null}

          {property.featured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D8B46A]/50 bg-[#F8F2E5] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#8A650B]">
              <Crown className="h-3.5 w-3.5" />
              Featured
            </span>
          ) : null}

          {property.boosted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange-700">
              <Zap className="h-3.5 w-3.5" />
              Boost
            </span>
          ) : null}

          {property.verifiedListing ? (
            <span className="inline-flex items-center rounded-full bg-[#1C1C1E] px-3 py-1.5 text-[10px] font-extrabold text-white">
              {lang === "id"
                ? "Listing Terverifikasi"
                : "Verified Listing"}
            </span>
          ) : property.pendingVerification ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">
              <Clock className="h-3.5 w-3.5" />

              {lang === "id"
                ? "Menunggu Verifikasi"
                : "Pending Verification"}
            </span>
          ) : null}

        </div>


        {/* =================================
            TITLE + LOCATION
        ================================= */}
        <h1 className="mt-5 text-[23px] font-extrabold leading-[1.25] tracking-[-0.025em] text-[#1C1C1E] sm:text-[27px]">
          {activeTitle}
        </h1>

        <p className="mt-2 text-sm font-medium leading-6 text-gray-500">
          {property.area},{" "}
          {property.province}
        </p>


        {/* =================================
            POSTER PROFILE
        ================================= */}
        <div className="mt-6 rounded-[22px] border border-[#EAE4D9] bg-[#F8F6F1] p-4">

          <div className="flex items-center gap-3">

            {/* PHOTO OR INITIALS */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#1C1C1E] text-sm font-extrabold tracking-[0.06em] text-[#D8B46A] shadow-sm">

              <span>
                {posterInitials}
              </span>

              {hasPosterPhoto ? (
                <img
                  src={property.photo}
                  alt={property.agentName}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              ) : null}

            </div>


            {/* NAME */}
            <div className="min-w-0 flex-1">

              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#B8860B]">
                {reporterRoleLabel}
              </p>

              <p className="mt-1 truncate text-[15px] font-extrabold text-[#1C1C1E]">
                {property.agentName}
              </p>

              {property.postedByType !==
                "owner" &&
              property.agency ? (
                <p className="mt-0.5 truncate text-[11px] font-medium text-gray-500">
                  {property.agency}
                </p>
              ) : null}

            </div>

          </div>


          {/* CODE + DATE */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E3DCCE] pt-4">

            <div>
              <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                {lang === "id"
                  ? "Kode Properti"
                  : "Property Code"}
              </p>

              <p className="mt-1.5 text-xs font-extrabold text-[#1C1C1E]">
                {property.kodeListing ||
                  "-"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-gray-400">
                {lang === "id"
                  ? "Tanggal Dipasang"
                  : "Posted Date"}
              </p>

              <p className="mt-1.5 text-xs font-extrabold text-[#1C1C1E]">
                {property.postedDate ||
                  "-"}
              </p>
            </div>

          </div>


          {/* AGENT SOCIAL LINKS */}
          {socialLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E3DCCE] pt-4">

              {socialLinks.map(
                (item) => (
                  <SocialCircle
                    key={item.key}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                  />
                )
              )}

            </div>
          ) : null}

        </div>


        {/* =================================
            PRIMARY CONVERSION ACTIONS
        ================================= */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="min-h-[50px] rounded-[16px] bg-[#1C1C1E] px-4 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-black hover:shadow-lg"
          >
            WhatsApp
          </button>

          <button
            type="button"
            onClick={
              openJadwalWithTracking
            }
            className="min-h-[50px] rounded-[16px] bg-[#D8B46A] px-4 text-sm font-extrabold text-[#111111] transition hover:-translate-y-0.5 hover:bg-[#C59F4F] hover:shadow-lg"
          >
            {lang === "id"
              ? "Jadwalkan Viewing"
              : "Schedule Viewing"}
          </button>

        </div>


        {/* =================================
            SAFETY — COLLAPSED
        ================================= */}
        <details className="group mt-4 rounded-[18px] border border-[#E8E2D8] bg-white">

          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8F2E5] text-[#B8860B]">
                <ShieldAlert className="h-4 w-4" />
              </div>

              <div>
                <p className="text-xs font-extrabold text-[#1C1C1E]">
                  {lang === "id"
                    ? "Keamanan & Laporan"
                    : "Safety & Reports"}
                </p>

                <p className="mt-0.5 text-[10px] text-gray-400">
                  {lang === "id"
                    ? "Laporkan masalah pada listing ini"
                    : "Report an issue with this listing"}
                </p>
              </div>

            </div>

            <span className="text-xs text-gray-400 transition-transform group-open:rotate-180">
              ▼
            </span>

          </summary>


          <div className="grid gap-2 border-t border-[#EEE8DE] p-3">

            <Link
              href={reportListingHref}
              className="flex items-center gap-3 rounded-[14px] bg-[#F8F6F1] px-3 py-3 transition hover:bg-[#F2EEE6]"
            >
              <Flag className="h-4 w-4 shrink-0 text-[#B8860B]" />

              <div>
                <p className="text-xs font-bold text-[#1C1C1E]">
                  {lang === "id"
                    ? "Laporkan listing"
                    : "Report listing"}
                </p>

                <p className="mt-0.5 text-[10px] text-gray-500">
                  {lang === "id"
                    ? "Listing palsu atau detail salah"
                    : "Fake listing or incorrect details"}
                </p>
              </div>
            </Link>

            <Link
              href={reportUserHref}
              className="flex items-center gap-3 rounded-[14px] bg-[#F8F6F1] px-3 py-3 transition hover:bg-[#F2EEE6]"
            >
              <UserRound className="h-4 w-4 shrink-0 text-[#B8860B]" />

              <div>
                <p className="text-xs font-bold text-[#1C1C1E]">
                  {lang === "id"
                    ? "Laporkan pengguna"
                    : "Report user"}
                </p>

                <p className="mt-0.5 text-[10px] text-gray-500">
                  {lang === "id"
                    ? "Agen atau pengguna mencurigakan"
                    : "Suspicious agent or user"}
                </p>
              </div>
            </Link>

          </div>

        </details>

      </div>
    </div>

  </aside>

</div>

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-[#1C1C1E]">
            {lang === "id" ? "Detail Properti" : "Property Details"}
          </h2>

          {detailChips.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
              {detailChips.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="min-h-[74px] rounded-2xl border border-gray-200 bg-gray-50 p-2.5 sm:p-3"
                  >
                    <div className="flex h-full flex-col justify-between gap-2">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide">
                          {item.label}
                        </div>
                      </div>

                      <div className="text-xs font-semibold leading-tight text-[#1C1C1E] sm:text-[13px]">
                        {item.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">
              {lang === "id"
                ? "Belum ada detail properti."
                : "No property details yet."}
            </p>
          )}
        </div>

      {/* =========================================
    DESCRIPTION + VIDEO
========================================= */}
<div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.22fr)_360px] xl:grid-cols-[minmax(0,1.28fr)_380px]">

  {/* =====================================
      DESCRIPTION
  ===================================== */}
  <section className="rounded-[30px] border border-[#E8E2D8] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-7">

    <div className="flex items-center gap-3">
      <span className="h-px w-8 bg-[#B8860B]" />

      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B8860B]">
        {lang === "id"
          ? "Tentang Properti"
          : "About This Property"}
      </p>
    </div>

    <h2 className="mt-3 text-xl font-extrabold tracking-[-0.02em] text-[#1C1C1E]">
      {lang === "id"
        ? "Deskripsi"
        : "Description"}
    </h2>

    <div className="mt-5 text-sm leading-7 text-gray-600 sm:text-[15px] sm:leading-8">

      {structuredDescription.intro.length > 0 ? (
        <div className="space-y-5">
          {structuredDescription.intro.map(
            (paragraph, index) => (
              <p
                key={index}
                className="whitespace-pre-line"
              >
                {paragraph}
              </p>
            )
          )}
        </div>
      ) : null}

      {structuredDescription.detailHeading ? (
        <div
          className={
            structuredDescription.intro.length >
            0
              ? "mt-7 border-t border-[#EEE8DE] pt-6"
              : ""
          }
        >
          <p className="font-extrabold text-[#1C1C1E]">
            {structuredDescription.detailHeading}
          </p>

          {structuredDescription.detailItems
            .length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {structuredDescription.detailItems.map(
                (item, index) => (
                  <li
                    key={index}
                    className="flex gap-3"
                  >
                    <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D8B46A]" />

                    <span className="whitespace-pre-line">
                      {item}
                    </span>
                  </li>
                )
              )}
            </ul>
          ) : null}
        </div>
      ) : structuredDescription.intro.length ===
        0 ? (
        <p className="whitespace-pre-line">
          {activeDescription}
        </p>
      ) : null}

    </div>

  </section>


  {/* =====================================
      VIDEO
  ===================================== */}
  <section className="rounded-[30px] border border-[#E8E2D8] bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.05)] sm:p-6">

    <div className="flex items-center justify-between gap-3">

      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B8860B]">
          TETAMO
        </p>

        <h2 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-[#1C1C1E]">
          Video
        </h2>
      </div>

      {property.videoUrl ? (
        <span className="rounded-full bg-[#F8F2E5] px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-[#8A650B]">
          Property Video
        </span>
      ) : null}

    </div>


   {property.videoUrl ? (

  /* VIDEO EXISTS — 9:16 */
  <div className="mx-auto mt-5 w-full max-w-[340px]">

    <div className="rounded-[26px] border border-[#E8E2D8] bg-[#F8F6F1] p-3">

      <div className="relative aspect-[9/16] overflow-hidden rounded-[20px] bg-black">

        <video
          src={property.videoUrl}
          controls
          playsInline
          className="h-full w-full object-cover"
        />

      </div>

    </div>

  </div>

) : (

  /* NO VIDEO — SAME 9:16 SIZE */
  <div className="mx-auto mt-5 w-full max-w-[340px]">

    <div className="rounded-[26px] border border-[#E8E2D8] bg-[#F8F6F1] p-3">

      <div className="flex aspect-[9/16] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#DDD5C7] bg-[#F8F6F1] px-6 text-center">

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          <span className="text-xl text-[#B8860B]">
            ▶
          </span>
        </div>

        <p className="mt-4 text-sm font-extrabold text-[#1C1C1E]">
          {lang === "id"
            ? "Video belum tersedia"
            : "Video not available"}
        </p>

        <p className="mt-2 max-w-[230px] text-xs leading-5 text-gray-500">
          {lang === "id"
            ? "Pemilik atau agen belum menambahkan video untuk properti ini."
            : "The owner or agent has not added a video for this property yet."}
        </p>

      </div>

    </div>

  </div>

)}

  </section>

</div>


{/* =========================================
    FACILITIES + NEARBY
    ONLY SHOW SECTIONS WITH DATA
========================================= */}
{activeFacilities.length > 0 ||
activeNearby.length > 0 ? (

  <div
    className={[
      "mt-6 grid gap-6",
      activeFacilities.length > 0 &&
      activeNearby.length > 0
        ? "lg:grid-cols-2"
        : "grid-cols-1",
    ].join(" ")}
  >

    {/* FACILITIES */}
    {activeFacilities.length > 0 ? (
      <section className="rounded-[28px] border border-[#E8E2D8] bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.045)] sm:p-6">

        <div className="flex items-center justify-between gap-4">

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#B8860B]">
              {lang === "id"
                ? "Yang Tersedia"
                : "Available"}
            </p>

            <h2 className="mt-2 text-lg font-extrabold text-[#1C1C1E]">
              {lang === "id"
                ? "Fasilitas"
                : "Facilities"}
            </h2>
          </div>

          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#F8F2E5] px-3 text-xs font-extrabold text-[#B8860B]">
            {activeFacilities.length}
          </span>

        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">

          {activeFacilities.map(
            (item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-[#E5DFD4] bg-[#F8F6F1] px-3.5 py-2 text-xs font-semibold text-[#1C1C1E]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#D8B46A]" />

                {item}
              </span>
            )
          )}

        </div>

      </section>
    ) : null}


    {/* NEARBY */}
    {activeNearby.length > 0 ? (
      <section className="rounded-[28px] border border-[#E8E2D8] bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.045)] sm:p-6">

        <div className="flex items-center justify-between gap-4">

          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#B8860B]">
              {lang === "id"
                ? "Di Sekitar Properti"
                : "Around The Property"}
            </p>

            <h2 className="mt-2 text-lg font-extrabold text-[#1C1C1E]">
              {lang === "id"
                ? "Terdekat"
                : "Nearby"}
            </h2>
          </div>

          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#F8F2E5] px-3 text-xs font-extrabold text-[#B8860B]">
            {activeNearby.length}
          </span>

        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">

          {activeNearby.map(
            (item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-[#E5DFD4] bg-[#F8F6F1] px-3.5 py-2 text-xs font-semibold text-[#1C1C1E]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#D8B46A]" />

                {item}
              </span>
            )
          )}

        </div>

      </section>
    ) : null}

  </div>

) : null}


{/* =========================================
    SECOND CONVERSION CTA
========================================= */}
<div className="relative mt-6 overflow-hidden rounded-[30px] bg-[#1C1C1E] p-5 sm:p-6">

  {/* GOLD GLOW */}
  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#D8B46A]/20 blur-[85px]" />

  <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

    <div className="max-w-xl">

      <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#D8B46A]">
        TETAMO
      </p>

      <h3 className="mt-2 text-xl font-extrabold tracking-[-0.025em] text-white sm:text-2xl">
        {lang === "id"
          ? "Tertarik dengan properti ini?"
          : "Interested in this property?"}
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/60">
        {lang === "id"
          ? "Hubungi pemilik atau agen langsung melalui WhatsApp, atau kirim permintaan jadwal viewing."
          : "Contact the owner or agent directly through WhatsApp, or request a property viewing."}
      </p>

    </div>


    <div className="grid w-full shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[430px]">

      <button
        type="button"
        onClick={handleWhatsAppClick}
        className="min-h-[50px] rounded-[16px] border border-white/15 bg-white px-6 text-sm font-extrabold text-[#1C1C1E] transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        WhatsApp
      </button>

      <button
        type="button"
        onClick={openJadwalWithTracking}
        className="min-h-[50px] rounded-[16px] bg-[#D8B46A] px-6 text-sm font-extrabold text-[#111111] transition hover:-translate-y-0.5 hover:bg-[#C59F4F] hover:shadow-xl"
      >
        {lang === "id"
          ? "Jadwalkan Viewing"
          : "Schedule Viewing"}
      </button>

    </div>

  </div>

</div>

        <div className="mt-6">
          <MortgageCalculator
            price={
              property.jenisListing === "dijual_disewa"
                ? property.salePriceValue
                : property.priceValue
            }
            jenisListing={
              property.jenisListing === "dijual_disewa"
                ? "dijual"
                : property.jenisListing
            }
          />
        </div>

        {jadwalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">

    {/* BACKDROP */}
    <button
      type="button"
      onClick={closeJadwal}
      className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      aria-label="Close Schedule Viewing popup"
    />


    {/* MODAL */}
    <div className="relative z-10 w-full max-w-[540px] overflow-hidden rounded-[30px] border border-white/10 bg-[#F8F6F1] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">

      {/* GOLD GLOW */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#D8B46A]/20 blur-[80px]" />


      <div className="relative z-10 p-5 sm:p-7">

        {/* =================================
            HEADER
        ================================= */}
        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#B8860B]">
              TETAMO
            </p>

            <h3 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#1C1C1E]">
              {lang === "id"
                ? "Jadwalkan Viewing"
                : "Schedule Viewing"}
            </h3>

            <p className="mt-2 max-w-sm text-xs leading-5 text-gray-500 sm:text-sm">
              {lang === "id"
                ? "Pilih tanggal dan waktu yang Anda inginkan. Pemilik atau agen akan menghubungi Anda untuk konfirmasi."
                : "Choose your preferred date and time. The owner or agent will contact you to confirm the viewing."}
            </p>

          </div>


          <button
            type="button"
            onClick={closeJadwal}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E3DCCE] bg-white text-sm font-bold text-[#1C1C1E] transition hover:border-[#B8860B] hover:text-[#B8860B]"
            aria-label="Close"
          >
            ✕
          </button>

        </div>


        {/* =================================
            PROPERTY MINI SUMMARY
        ================================= */}
        <div className="mt-6 flex items-center gap-3 rounded-[20px] border border-[#E5DFD4] bg-white p-3">

          <div className="h-16 w-20 shrink-0 overflow-hidden rounded-[14px] bg-gray-100">

            <img
              src={property.images?.[0]}
              alt={property.title}
              className="h-full w-full object-cover"
            />

          </div>


          <div className="min-w-0 flex-1">

            <p className="truncate text-sm font-extrabold text-[#1C1C1E]">
              {property.title}
            </p>

            <p className="mt-1 truncate text-xs text-gray-500">
              {property.area}, {property.province}
            </p>

            <p className="mt-1 text-xs font-bold text-[#B8860B]">
              {combinedPriceSummary}
            </p>

          </div>

        </div>


        {/* =================================
            DATE
        ================================= */}
        <div className="mt-6">

          <label className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
            {lang === "id"
              ? "Pilih Tanggal"
              : "Select Date"}
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) =>
              setSelectedDate(e.target.value)
            }
            className="mt-3 w-full rounded-[17px] border border-[#E3DCCE] bg-white px-4 py-3.5 text-sm font-semibold text-[#1C1C1E] outline-none transition focus:border-[#B8860B] focus:ring-2 focus:ring-[#D8B46A]/15"
          />

        </div>


        {/* =================================
            TIME
        ================================= */}
        <div className="mt-5">

          <label className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-500">
            {lang === "id"
              ? "Pilih Jam"
              : "Select Time"}
          </label>

          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">

            {[
              "10:00",
              "11:00",
              "13:00",
              "15:00",
              "17:00",
            ].map((time) => (

              <button
                key={time}
                type="button"
                onClick={() =>
                  setSelectedTime(time)
                }
                className={[
                  "min-h-[44px] rounded-[14px] border text-xs font-extrabold transition",
                  selectedTime === time
                    ? "border-[#1C1C1E] bg-[#1C1C1E] text-white shadow-sm"
                    : "border-[#E3DCCE] bg-white text-[#1C1C1E] hover:border-[#B8860B] hover:text-[#B8860B]",
                ].join(" ")}
              >
                {time}
              </button>

            ))}

          </div>

        </div>


        {/* =================================
            SELECTED SUMMARY
        ================================= */}
        {selectedDate || selectedTime ? (
          <div className="mt-5 rounded-[18px] border border-[#E3DCCE] bg-[#F2EEE6] px-4 py-3">

            <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gray-400">
              {lang === "id"
                ? "Pilihan Anda"
                : "Your Selection"}
            </p>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-[#1C1C1E]">

              {selectedDate ? (
                <span>
                  {selectedDate}
                </span>
              ) : null}

              {selectedTime ? (
                <span>
                  {selectedTime}
                </span>
              ) : null}

            </div>

          </div>
        ) : null}


        {/* =================================
            SUBMIT
        ================================= */}
        <button
          type="button"
          onClick={handleViewingRequest}
          disabled={
            !selectedDate ||
            !selectedTime
          }
          className={[
            "mt-6 min-h-[52px] w-full rounded-[17px] px-5 text-sm font-extrabold transition",
            selectedDate && selectedTime
              ? "bg-[#D8B46A] text-[#111111] hover:-translate-y-0.5 hover:bg-[#C59F4F] hover:shadow-lg"
              : "cursor-not-allowed bg-gray-200 text-gray-400",
          ].join(" ")}
        >
          {lang === "id"
            ? "Kirim Permintaan Viewing"
            : "Send Viewing Request"}
        </button>


        {/* FOOTNOTE */}
        <p className="mt-3 text-center text-[10px] leading-5 text-gray-400">
          {lang === "id"
            ? "Jadwal belum dikonfirmasi sampai pemilik atau agen menyetujuinya."
            : "The viewing is not confirmed until the owner or agent approves the request."}
        </p>

      </div>

    </div>

  </div>
)}
      </div>
    </main>
  );
}
