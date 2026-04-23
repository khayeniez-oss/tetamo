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
} from "lucide-react";

type RentalType = "monthly" | "yearly" | "";
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
  jenisListing: "dijual" | "disewa";
  rentalType: RentalType;
  propertyType: string;

  title: string;
  titleId: string;

  price: string;
  priceValue: number;
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

  if (v === "monthly" || v === "bulanan") return "monthly";
  if (v === "yearly" || v === "tahunan") return "yearly";

  return "";
}

function getRentalTypeLabel(rentalType: RentalType, lang: string): string {
  if (rentalType === "monthly") {
    return lang === "id" ? "Bulanan" : "Monthly";
  }

  if (rentalType === "yearly") {
    return lang === "id" ? "Tahunan" : "Yearly";
  }

  return "";
}

function rentalTypeBadgeClass(rentalType: RentalType) {
  if (rentalType === "monthly") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (rentalType === "yearly") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
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

export default function PropertyDetailClient({ id }: { id: string }) {
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

  const [property, setProperty] = useState<PropertyItem | null>(null);
  const [orderedProperties, setOrderedProperties] = useState<
    OrderedPropertyRef[]
  >([]);
  const [loading, setLoading] = useState(true);

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

      setLoading(true);

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
        jenisListing: row.listing_type === "disewa" ? "disewa" : "dijual",
        rentalType: normalizeRentalType(row.rental_type),
        propertyType: row.property_type || "",

        title: localizedTitle,
        titleId: toStringOrEmpty(row.title_id),

        price: formatIdr(row.price ?? 0),
        priceValue: Number(row.price ?? 0),
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
Harga: ${displayPrice}

Apakah properti ini masih tersedia?`
        : `Hello ${property.receiverName}, I'm interested in this property on TETAMO.

Property: ${property.title}
Code: ${property.kodeListing ?? "-"}
Location: ${property.area}, ${property.province}
Price: ${displayPrice}

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

    property.jenisListing === "disewa" && property.rentalType
      ? {
          key: "rentalType",
          label: lang === "id" ? "Jenis Sewa" : "Rental Type",
          value: getRentalTypeLabel(property.rentalType, lang),
          icon: Clock,
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
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <Link
            href="/properti"
            className="text-sm underline text-[#1C1C1E] hover:opacity-80"
          >
            {lang === "id" ? "Kembali ke Marketplace" : "Back to Marketplace"}
          </Link>

          <div className="flex items-center gap-2">
            {prevProperty ? (
              <Link
                href={getPropertyHref(prevProperty)}
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
                href={getPropertyHref(nextProperty)}
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
            <div className="relative overflow-hidden rounded-[24px]">
              <img
                src={property.images[idx]}
                alt={activeTitle}
                className="h-[520px] w-full object-cover sm:h-[580px] lg:h-[640px]"
              />

              <div className="absolute right-3 top-3 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-[11px] font-semibold text-white sm:right-4 sm:top-4 sm:text-xs">
                TETAMO
              </div>

              <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 sm:bottom-4 sm:left-4">
                <span className="rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                  {property.jenisListing === "dijual"
                    ? lang === "id"
                      ? "Dijual"
                      : "For Sale"
                    : lang === "id"
                      ? "Disewa"
                      : "For Rent"}
                </span>

                {property.jenisListing === "disewa" && property.rentalType ? (
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold sm:text-xs ${rentalTypeBadgeClass(
                      property.rentalType
                    )}`}
                  >
                    {getRentalTypeLabel(property.rentalType, lang)}
                  </span>
                ) : null}

                {propertyTypeLabel ? (
                  <span className="rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                    {propertyTypeLabel}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={prevImg}
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E] sm:left-4"
                aria-label="Previous image"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={nextImg}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E] sm:right-4"
                aria-label="Next image"
              >
                ›
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-2xl font-extrabold text-[#1C1C1E] sm:text-[30px]">
                {displayPrice}
              </div>

              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-gray-700 sm:text-xs">
                <Eye className="h-3.5 w-3.5" />
                <span>{formatCompactNumber(property.viewCount)}</span>
                <span>{lang === "id" ? "Dilihat" : "Views"}</span>
              </div>
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500 sm:text-[15px]">
              {secondaryPrices.map((item) => (
                <span key={item}>≈ {item}</span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {property.spotlight && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                  <Gem className="h-3.5 w-3.5" />
                  Spotlight
                </span>
              )}

              {property.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                  <Crown className="h-3.5 w-3.5" />
                  Featured
                </span>
              )}

              {property.boosted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                  <Zap className="h-3.5 w-3.5" />
                  Boost
                </span>
              )}

              {property.verifiedListing && (
                <span className="inline-flex items-center rounded-full bg-[#1C1C1E] px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                  Verified Listing
                </span>
              )}
            </div>

            <h1 className="mt-5 text-xl font-bold leading-snug text-[#1C1C1E] sm:text-2xl">
              {activeTitle}
            </h1>

            <div className="mt-2 text-sm text-gray-600 sm:text-[15px]">
              {property.area}, {property.province}
            </div>

            <div className="mt-5 border-t border-gray-200 pt-5">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 sm:h-24 sm:w-24">
                  <img
                    src={property.photo}
                    alt={property.agentName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      if (e.currentTarget.src !== FALLBACK_POSTER_PHOTO) {
                        e.currentTarget.src = FALLBACK_POSTER_PHOTO;
                      }
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    {property.postedByType === "owner"
                      ? "Owner"
                      : property.postedByType === "developer"
                        ? "Developer"
                        : "Agent"}
                  </div>

                  <div className="mt-1 text-base font-semibold text-[#1C1C1E]">
                    {property.agentName}
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    {property.agency}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                    <span>
                      Code:{" "}
                      <span className="font-medium text-gray-700">
                        {property.kodeListing}
                      </span>
                    </span>

                    <span>
                      Posted:{" "}
                      <span className="font-medium text-gray-700">
                        {property.postedDate}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {socialLinks.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-3">
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

              <button
                type="button"
                onClick={openJadwalWithTracking}
                className="mt-5 w-full rounded-2xl bg-[#B8860B] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
              >
                Schedule Viewing
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-3">
          <button
            type="button"
            onClick={toggleSave}
            className={`flex min-h-[62px] items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center text-[11px] font-semibold shadow-sm transition ${
              saved
                ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Save ({displaySaveCount})</span>
          </button>

          <button
            type="button"
            onClick={toggleLike}
            className={`flex min-h-[62px] items-center justify-center gap-1 rounded-2xl border px-2 py-2.5 text-center text-[11px] font-semibold shadow-sm transition ${
              liked
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-[#1C1C1E] hover:bg-gray-50"
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>Like ({displayLikeCount})</span>
          </button>

          <div className="min-h-[62px] rounded-2xl border border-gray-200 bg-white px-2 py-2.5 text-center shadow-sm">
            <div className="text-sm font-extrabold text-[#1C1C1E] sm:text-base">
              {displayRatingAverage.toFixed(1)}
            </div>
            <div className="mt-1 text-[10px] text-gray-500 sm:text-[11px]">
              Property Rating ({displayRatingCount})
            </div>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="min-h-[62px] rounded-2xl border border-gray-200 bg-white px-2 py-2.5 text-center shadow-sm transition hover:bg-gray-50"
          >
            <div className="text-sm font-extrabold text-[#1C1C1E] sm:text-base">
              {displayShareCount}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1 text-[10px] text-gray-500 sm:text-[11px]">
              <Share2 className="h-3.5 w-3.5" />
              <span>{lang === "id" ? "Bagikan" : "Share"}</span>
            </div>
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => handleRate(value)}
              className={`rounded-full border p-[4px] transition ${
                userRating >= value
                  ? "border-amber-200 bg-amber-50 text-amber-500"
                  : "border-gray-200 bg-white text-gray-300 hover:bg-gray-50"
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

        <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-[#1C1C1E]">
            {lang === "id" ? "Detail Properti" : "Property Details"}
          </h2>

          {detailChips.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {detailChips.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <div className="text-[10px] font-semibold uppercase leading-tight tracking-wide">
                          {item.label}
                        </div>
                      </div>

                      <div className="text-sm font-semibold leading-tight text-[#1C1C1E]">
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.22fr)_360px] xl:grid-cols-[minmax(0,1.28fr)_380px]">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {lang === "id" ? "Deskripsi" : "Description"}
            </h2>

            <div className="mt-4 text-sm leading-7 text-gray-700">
              {structuredDescription.intro.length > 0 ? (
                <div className="space-y-4">
                  {structuredDescription.intro.map((paragraph, index) => (
                    <p key={index} className="whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}

              {structuredDescription.detailHeading ? (
                <div
                  className={
                    structuredDescription.intro.length > 0 ? "mt-6" : ""
                  }
                >
                  <p className="font-bold">
                    {structuredDescription.detailHeading}
                  </p>

                  {structuredDescription.detailItems.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5">
                      {structuredDescription.detailItems.map((item, index) => (
                        <li key={index} className="whitespace-pre-line">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : structuredDescription.intro.length === 0 ? (
                <p className="whitespace-pre-line">{activeDescription}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {lang === "id" ? "Video" : "Video"}
            </h2>

            <div className="mx-auto mt-4 w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[360px] xl:max-w-[380px]">
              {property.videoUrl ? (
                <div className="rounded-[28px] border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-black">
                    <video
                      src={property.videoUrl}
                      controls
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-[28px] border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex aspect-[9/16] items-center justify-center rounded-[22px] bg-gray-100 px-4 text-center text-sm text-gray-500">
                    {lang === "id"
                      ? "Belum ada video untuk properti ini."
                      : "No video available for this property yet."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {lang === "id" ? "Fasilitas" : "Facilities"}
            </h2>

            {activeFacilities.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeFacilities.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-[#1C1C1E]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                {lang === "id"
                  ? "Belum ada data fasilitas."
                  : "No facilities data yet."}
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-[#1C1C1E]">
              {lang === "id" ? "Terdekat" : "Nearby"}
            </h2>

            {activeNearby.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeNearby.map((item) => (
                  <span
                    key={item}
                    className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-[#1C1C1E]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                {lang === "id"
                  ? "Belum ada data lokasi terdekat."
                  : "No nearby data yet."}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
          >
            WhatsApp
          </button>

          <button
            type="button"
            onClick={openJadwalWithTracking}
            className="w-full rounded-2xl bg-yellow-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-yellow-700"
          >
            Schedule Viewing
          </button>
        </div>

        <div className="mt-6">
          <MortgageCalculator
            price={property.priceValue}
            jenisListing={property.jenisListing}
          />
        </div>

        {jadwalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button
              type="button"
              onClick={closeJadwal}
              className="absolute inset-0 bg-black/50"
              aria-label="Close Jadwal popup"
            />

            <div className="relative z-10 w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[#1C1C1E]">
                  {lang === "id" ? "Jadwal Viewing" : "Schedule Viewing"}
                </h3>

                <button
                  type="button"
                  onClick={closeJadwal}
                  className="rounded-full px-3 py-1 text-sm font-semibold text-[#1C1C1E] hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Pilih Tanggal" : "Select Date"}
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Pilih Jam" : "Select Time"}
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["10:00", "11:00", "13:00", "15:00", "17:00"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        className={[
                          "rounded-full border px-4 py-2 text-sm",
                          selectedTime === t
                            ? "border-[#1C1C1E] bg-[#1C1C1E] text-white"
                            : "border-gray-200 bg-white text-[#1C1C1E]",
                        ].join(" ")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleViewingRequest}
                  disabled={!selectedDate || !selectedTime}
                  className={[
                    "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    selectedDate && selectedTime
                      ? "bg-[#B8860B] text-white hover:opacity-90"
                      : "cursor-not-allowed bg-gray-200 text-gray-500",
                  ].join(" ")}
                >
                  {lang === "id"
                    ? "Kirim Permintaan Viewing"
                    : "Send Viewing Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
