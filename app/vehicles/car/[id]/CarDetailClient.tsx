"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { supabase } from "@/lib/supabase";
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music2,
  Crown,
  CarFront,
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
type RawRow = Record<string, any>;
type RawProfile = Record<string, any>;

type CarItem = {
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
  featured?: boolean;
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
const FALLBACK_CAR_IMAGE =
  "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80";

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

function normalizePhone(value?: string | null) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function dedupeImages(images: string[]) {
  return Array.from(new Set(images.filter(Boolean)));
}

function getCarHref(car: { slug?: string | null; id: string }) {
  return `/vehicles/car/${car.slug || car.id}`;
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
  if (v === "automatic") return "Automatic";
  if (v === "manual") return "Manual";
  if (v === "cvt") return "CVT";
  return value || "-";
}

function translateFuel(value: string, lang: string) {
  const v = value.toLowerCase();
  if (v === "petrol") return lang === "id" ? "Bensin" : "Petrol";
  if (v === "diesel") return "Diesel";
  if (v === "electric") return lang === "id" ? "Listrik" : "Electric";
  if (v === "hybrid") return "Hybrid";
  return value || "-";
}

function mapPostedByType(source?: string | null) {
  const v = String(source || "").toLowerCase();
  if (v === "owner") return "owner" as const;
  if (v === "agent") return "agent" as const;
  return "dealer" as const;
}

function mapBodyType(row: RawRow) {
  return String(
    row?.body_type ||
      row?.bodyType ||
      row?.vehicle_body_type ||
      row?.category ||
      ""
  ).trim();
}

function formatPostedDate(value?: string | null, lang: string = "en") {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function getProfileName(profile?: RawProfile | null) {
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

function getProfileAgency(profile?: RawProfile | null) {
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

function getProfileWhatsapp(profile?: RawProfile | null) {
  return normalizePhone(
    profile?.whatsapp ||
      profile?.whatsapp_number ||
      profile?.phone ||
      profile?.phone_number ||
      ""
  );
}

function getProfileEmail(profile?: RawProfile | null) {
  return String(profile?.email || "").trim();
}

function getProfilePhoto(profile?: RawProfile | null) {
  return (
    String(profile?.photo_url || profile?.avatar_url || profile?.photo || "").trim() ||
    FALLBACK_POSTER_PHOTO
  );
}

function mapRawToCarItem(
  row: RawRow,
  profile: RawProfile | null,
  photoUrls: string[],
  videoUrl: string,
  lang: string
): CarItem {
  const postedByType = mapPostedByType(row?.source || row?.role_snapshot);
  const approved = String(row?.approval_status || "").toLowerCase() === "approved";

  const sellerName =
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
          : "Vehicle Partner");

  return {
    id: String(row?.id || ""),
    slug: String(row?.slug || row?.id || ""),
    kodeListing: String(row?.kode || row?.listing_code || "-"),
    postedDate: formatPostedDate(row?.created_at, lang),
    title: String(row?.title || "-"),
    description: String(row?.description || ""),
    descriptionEn: String(row?.description_en || row?.description || ""),
    priceValue: Number(row?.price || 0),
    province: String(row?.province || "-"),
    area: String(row?.city || row?.area || "-"),
    year: String(row?.year || "-"),
    transmission: String(row?.transmission || "-"),
    fuel: String(row?.fuel || "-"),
    mileage: String(row?.mileage || row?.odometer || "-"),
    bodyType: mapBodyType(row) || "-",
    color: String(row?.color || "-"),
    engine: String(row?.engine_cc || row?.engine || "-"),
    condition: String(row?.condition || "-"),
    marketType:
      String(row?.listing_type || "").toLowerCase() === "disewa"
        ? lang === "id"
          ? "Disewa"
          : "For Rent"
        : lang === "id"
          ? "Dijual"
          : "For Sale",
    sellerName,
    agency: getProfileAgency(profile),
    phone: normalizePhone(
      profile?.phone || profile?.phone_number || row?.phone || row?.contact_phone || ""
    ),
    whatsapp:
      getProfileWhatsapp(profile) ||
      normalizePhone(row?.whatsapp || row?.phone || row?.contact_phone || ""),
    email: getProfileEmail(profile),
    photo: getProfilePhoto(profile),
    images: photoUrls.length > 0 ? photoUrls : [FALLBACK_CAR_IMAGE],
    videoUrl,
    featured: Boolean(row?.is_featured),
    verifiedListing: approved,
    ownerApproved: postedByType === "owner" && approved,
    dealerVerified: postedByType === "dealer" && approved,
    postedByType,
    instagramUrl: String(profile?.instagram_url || profile?.instagram || ""),
    facebookUrl: String(profile?.facebook_url || profile?.facebook || ""),
    tiktokUrl: String(profile?.tiktok_url || profile?.tiktok || ""),
    youtubeUrl: String(profile?.youtube_url || profile?.youtube || ""),
    linkedinUrl: String(profile?.linkedin_url || profile?.linkedin || ""),
  };
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

async function fetchOrderedCars() {
  const viewResult = await supabase
    .from("vehicle_marketplace_view")
    .select("id,slug")
    .eq("vehicle_type", "car")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (!viewResult.error) {
    return (viewResult.data || []) as Array<{ id: string; slug?: string | null }>;
  }

  const tableResult = await supabase
    .from("vehicles")
    .select("id,slug")
    .eq("vehicle_type", "car")
    .eq("approval_status", "approved")
    .eq("listing_status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (tableResult.error) throw tableResult.error;
  return (tableResult.data || []) as Array<{ id: string; slug?: string | null }>;
}

async function fetchSingleCar(idOrSlug: string, lang: string) {
  const slugKey = String(idOrSlug || "").trim();

  async function fetchFromTable(tableName: "vehicle_marketplace_view" | "vehicles") {
    const bySlug = await supabase
      .from(tableName)
      .select("*")
      .eq("vehicle_type", "car")
      .eq("slug", slugKey)
      .limit(1)
      .maybeSingle();

    if (!bySlug.error && bySlug.data) return bySlug.data as RawRow;

    const byId = await supabase
      .from(tableName)
      .select("*")
      .eq("vehicle_type", "car")
      .eq("id", slugKey)
      .limit(1)
      .maybeSingle();

    if (!byId.error && byId.data) return byId.data as RawRow;
    return null;
  }

  let row = await fetchFromTable("vehicle_marketplace_view");
  if (!row) row = await fetchFromTable("vehicles");
  if (!row) return null;

  const vehicleId = String(row.id || "");

  const mediaResult = await supabase
    .from("vehicle_media")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });

  const mediaRows = mediaResult.error ? [] : ((mediaResult.data || []) as RawRow[]);

  const photoUrls = dedupeImages([
    String(row?.cover_image_url || ""),
    ...mediaRows
      .filter((item) => String(item?.media_type || "") === "photo")
      .map((item) => String(item?.file_url || item?.public_url || "").trim()),
  ]);

  const firstVideo =
    mediaRows.find((item) => String(item?.media_type || "") === "video") || null;

  const videoUrl = String(
    firstVideo?.file_url || firstVideo?.public_url || row?.video_url || ""
  ).trim();

  const userIds = Array.from(
    new Set(
      [
        String(row?.owner_user_id || ""),
        String(row?.agent_user_id || ""),
        String(row?.user_id || ""),
      ].filter(Boolean)
    )
  );

  let profile: RawProfile | null = null;
  if (userIds.length > 0) {
    const profileResult = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (!profileResult.error) {
      const profiles = (profileResult.data || []) as RawProfile[];
      profile =
        profiles.find((item) => String(item.id) === String(row?.owner_user_id || "")) ||
        profiles.find((item) => String(item.id) === String(row?.agent_user_id || "")) ||
        profiles.find((item) => String(item.id) === String(row?.user_id || "")) ||
        null;
    }
  }

  return mapRawToCarItem(row, profile, photoUrls, videoUrl, lang);
}

export default function CarDetailClient({ id }: { id: string }) {
  const { lang } = useLanguage();
  const { currency } = useCurrency();
  const currentCurrency: SupportedCurrency =
    currency === "AUD" ? "AUD" : currency === "USD" ? "USD" : "IDR";

  const router = useRouter();

  const [jadwalOpen, setJadwalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [idx, setIdx] = useState(0);

  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [displayLikeCount, setDisplayLikeCount] = useState(16);
  const [displaySaveCount, setDisplaySaveCount] = useState(11);
  const [displayRatingAverage, setDisplayRatingAverage] = useState(4.8);
  const [displayRatingCount, setDisplayRatingCount] = useState(18);
  const [displayShareCount, setDisplayShareCount] = useState(6);

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<CarItem | null>(null);
  const [orderedCars, setOrderedCars] = useState<Array<{ id: string; slug?: string | null }>>([]);

  useEffect(() => {
    let ignore = false;

    async function loadDetail() {
      try {
        setLoading(true);

        const [orderList, car] = await Promise.all([
          fetchOrderedCars(),
          fetchSingleCar(id, lang),
        ]);

        if (ignore) return;

        setOrderedCars(orderList);
        setProperty(car);
        setIdx(0);
      } catch (error) {
        console.error("Failed to load car detail:", error);
        if (!ignore) {
          setOrderedCars([]);
          setProperty(null);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadDetail();

    return () => {
      ignore = true;
    };
  }, [id, lang]);

  const propertyIndex = useMemo(
    () => orderedCars.findIndex((x) => x.id === property?.id),
    [orderedCars, property?.id]
  );

  const prevProperty =
    propertyIndex > 0 ? orderedCars[propertyIndex - 1] : null;
  const nextProperty =
    propertyIndex >= 0 && propertyIndex < orderedCars.length - 1
      ? orderedCars[propertyIndex + 1]
      : null;

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

    const shareUrl = `${window.location.origin}${getCarHref(property)}`;
    const shareText =
      lang === "id"
        ? `Lihat mobil ini di TETAMO:\n\n${property.title}\n${property.area}, ${property.province}`
        : `Check out this car on TETAMO:\n\n${property.title}\n${property.area}, ${property.province}`;

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
            ? "Link mobil berhasil disalin."
            : "Car link copied successfully."
        );
      } else {
        window.prompt(
          lang === "id" ? "Salin link mobil ini:" : "Copy this car link:",
          shareUrl
        );
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error("Failed to share car:", error);
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

    if (!property.whatsapp) {
      alert(
        lang === "id"
          ? "Nomor WhatsApp penjual belum tersedia."
          : "The seller WhatsApp number is not available yet."
      );
      return;
    }

    const message =
      lang === "id"
        ? `Halo ${property.sellerName}, saya tertarik dengan mobil ini di TETAMO.

Mobil: ${property.title}
Kode: ${property.kodeListing}
Lokasi: ${property.area}, ${property.province}
Harga: ${displayPrice}

Apakah unit ini masih tersedia?`
        : `Hello ${property.sellerName}, I'm interested in this car on TETAMO.

Car: ${property.title}
Code: ${property.kodeListing}
Location: ${property.area}, ${property.province}
Price: ${displayPrice}

Is this unit still available?`;

    const whatsappURL = `https://wa.me/${property.whatsapp}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappURL, "_blank");
  }

  async function handleTestDriveRequest() {
    if (!property || !selectedDate || !selectedTime) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?next=${encodeURIComponent(getCarHref(property))}`);
        return;
      }

      const requestedAt = new Date(`${selectedDate}T${selectedTime}:00`);

      const { error } = await supabase.from("vehicle_viewings").insert({
        vehicle_id: property.id,
        requester_user_id: user.id,
        viewing_type: "test_drive",
        requested_at: requestedAt.toISOString(),
        status: "pending",
        note: `Requested from car detail page ${property.kodeListing}`,
      });

      if (error) throw error;

      const sellerLabel = getSellerLabel(property.postedByType, lang);

      alert(
        lang === "id"
          ? `Permintaan test drive berhasil dikirim. ${sellerLabel} akan menghubungi Anda untuk konfirmasi.`
          : `Test drive request sent successfully. The ${sellerLabel.toLowerCase()} will contact you for confirmation.`
      );

      setJadwalOpen(false);
      setSelectedDate("");
      setSelectedTime("");
    } catch (error) {
      console.error("Failed to create test drive request:", error);
      alert(
        lang === "id"
          ? "Terjadi kendala saat mengirim permintaan test drive."
          : "Something went wrong while sending the test drive request."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:text-base">
            {lang === "id" ? "Memuat detail mobil..." : "Loading car detail..."}
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
            {lang === "id" ? "Mobil tidak ditemukan" : "Car not found"}
          </h1>
          <Link
            href="/vehicles/car"
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
      label: lang === "id" ? "Tipe Kendaraan" : "Vehicle Type",
      value: property.bodyType,
      icon: CarFront,
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
            href="/vehicles/car"
            className="text-sm underline text-[#1C1C1E] hover:opacity-80"
          >
            {lang === "id" ? "Kembali ke Marketplace" : "Back to Marketplace"}
          </Link>

          <div className="flex items-center gap-2">
            {prevProperty ? (
              <Link
                href={getCarHref(prevProperty)}
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
                href={getCarHref(nextProperty)}
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
                  {property.featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#B8860B] shadow-md sm:text-[11px]">
                      <Crown size={13} className="text-[#FFD700]" />
                      FEATURED
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {property.dealerVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#B8860B] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
                      <BadgeCheck size={11} strokeWidth={2.5} />
                      {lang === "id" ? "Dealer Terverifikasi" : "Verified Dealer"}
                    </span>
                  ) : property.ownerApproved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1C1C1E] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm sm:text-[11px]">
                      <ShieldCheck size={11} strokeWidth={2.5} />
                      {lang === "id" ? "Pemilik Terverifikasi" : "Verified Owner"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#1C1C1E]/20 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-gray-900 shadow-sm sm:text-[11px]">
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
              >
                ‹
              </button>

              <button
                type="button"
                onClick={nextImg}
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#1C1C1E]/70 text-lg text-white transition hover:bg-[#1C1C1E]"
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
                  {property.marketType}
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
                  {lang === "id" ? "Jadwal Test Drive" : "Schedule Test Drive"}
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
                  >
                    <Star
                      className="h-3.5 w-3.5"
                      fill={userRating >= value ? "currentColor" : "transparent"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {detailChips.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#1C1C1E]" />
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {item.label}
                      </div>
                    </div>

                    <div className="mt-2 text-sm font-semibold text-[#1C1C1E]">
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-4">
                <img
                  src={property.photo || FALLBACK_POSTER_PHOTO}
                  alt={property.sellerName}
                  className="h-16 w-16 rounded-2xl object-cover"
                />

                <div className="min-w-0 flex-1">
                  <div className="text-lg font-bold text-[#1C1C1E]">
                    {property.sellerName}
                  </div>

                  <div className="mt-1 text-sm text-gray-500">
                    {getSellerLabel(property.postedByType, lang)}
                    {property.agency ? ` • ${property.agency}` : ""}
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    {property.area}, {property.province}
                  </div>
                </div>
              </div>

              {socialLinks.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
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

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={handleWhatsAppClick}
                  className="w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  WhatsApp
                </button>

                {property.email ? (
                  <a
                    href={`mailto:${property.email}`}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
                  >
                    Email
                  </a>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="text-lg font-bold text-[#1C1C1E]">
                {lang === "id" ? "Deskripsi" : "Description"}
              </div>

              <div className="mt-4 space-y-3 text-sm leading-7 text-gray-600">
                {activeDescription
                  ? activeDescription
                      .split("\n")
                      .filter(Boolean)
                      .map((line, index) => <p key={index}>{line}</p>)
                  : (
                    <p>
                      {lang === "id"
                        ? "Deskripsi belum tersedia."
                        : "Description is not available yet."}
                    </p>
                  )}
              </div>
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
                  {lang === "id" ? "Jadwal Test Drive" : "Schedule Test Drive"}
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
                onClick={handleTestDriveRequest}
                disabled={!selectedDate || !selectedTime}
                className="w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {lang === "id"
                  ? "Kirim Permintaan Test Drive"
                  : "Send Test Drive Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
