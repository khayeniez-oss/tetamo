"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  BedDouble,
  Square,
  MapPin,
  Trash2,
  ExternalLink,
  Clock3,
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useCurrency } from "@/app/context/CurrencyContext";
import { supabase } from "@/lib/supabase";

type RentalType = "monthly" | "yearly" | "";
type SupportedCurrency = "IDR" | "USD" | "AUD";

type LikeRow = {
  property_id: string;
};

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type PropertyRow = {
  id: string;
  kode: string | null;
  posted_date: string | null;
  created_at: string | null;
  title: string | null;
  price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  building_size: number | null;
  land_size: number | null;
  bedrooms: number | null;
  furnishing: string | null;
  listing_type: string | null;
  rental_type: string | null;
  property_type: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;
  transaction_status: string | null;
  property_images: PropertyImageRow[] | null;
};

type LikedProperty = {
  id: string;
  kode: string;
  title: string;
  priceValue: number;
  province: string;
  area: string;
  size: string;
  bed: string;
  furnished: string;
  propertyType: string;
  jenisListing: "dijual" | "disewa";
  rentalType: RentalType;
  postedDate: string;
  image: string;
  isAvailable: boolean;
};

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
  if (Number.isNaN(d.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function mapFurnishing(value?: string | null, lang?: string) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return lang === "id" ? "Full Furnish" : "Full Furnished";
  if (v === "semi") return lang === "id" ? "Semi Furnish" : "Semi Furnished";
  if (v === "unfurnished") return "Unfurnished";

  return value;
}

function normalizeRentalType(value?: string | null): RentalType {
  const v = String(value || "").trim().toLowerCase();

  if (v === "monthly" || v === "bulanan") return "monthly";
  if (v === "yearly" || v === "tahunan") return "yearly";

  return "";
}

function getRentalTypeLabel(
  rentalType: RentalType,
  lang: "id" | "en"
): string {
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

function formatPropertyType(value?: string | null, lang?: string) {
  const raw = String(value || "").trim().toLowerCase();

  if (!raw) return lang === "id" ? "Properti" : "Property";

  if (raw === "tanah") return lang === "id" ? "Tanah" : "Land";
  if (raw === "rumah") return lang === "id" ? "Rumah" : "House";
  if (raw === "villa") return "Villa";
  if (raw === "apartemen") return lang === "id" ? "Apartemen" : "Apartment";
  if (raw === "apartment") return lang === "id" ? "Apartemen" : "Apartment";
  if (raw === "ruko") return lang === "id" ? "Ruko" : "Shophouse";
  if (raw === "rukan") return lang === "id" ? "Rukan" : "Office Unit";
  if (raw === "gudang") return lang === "id" ? "Gudang" : "Warehouse";
  if (raw === "kantor") return lang === "id" ? "Kantor" : "Office";
  if (raw === "kost") return lang === "id" ? "Kost" : "Boarding House";
  if (raw === "kos") return lang === "id" ? "Kos" : "Boarding House";
  if (raw === "hotel") return "Hotel";
  if (raw === "pabrik") return lang === "id" ? "Pabrik" : "Factory";
  if (raw === "toko") return lang === "id" ? "Toko" : "Shop";

  return raw
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeTransactionStatus(value?: string | null) {
  const v = (value || "").trim().toLowerCase();
  if (v === "sold") return "sold";
  if (v === "rented") return "rented";
  return "available";
}

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  return d.getTime() > Date.now();
}

function isPropertyAvailable(row: PropertyRow) {
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

export default function AgentLikedPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { currency } = useCurrency();
  const currentCurrency: SupportedCurrency =
    currency === "AUD" ? "AUD" : currency === "USD" ? "USD" : "IDR";

  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [items, setItems] = useState<LikedProperty[]>([]);

  const t =
    lang === "id"
      ? {
          pageTitle: "Properti Disukai",
          pageSubtitle:
            "Semua properti yang Anda sukai akan muncul di sini.",
          loading: "Memuat properti yang disukai...",
          emptyTitle: "Belum ada properti disukai",
          emptyDesc:
            "Sukai properti dari marketplace agar mudah Anda cek lagi nanti.",
          goMarketplace: "Ke Marketplace",
          remove: "Hapus",
          viewDetail: "Lihat Detail",
          posted: "Listing",
          available: "Masih tersedia",
          unavailable: "Tidak tersedia",
          forSale: "Dijual",
          forRent: "Disewa",
          loginRequired: "Silakan login terlebih dahulu.",
          removeFailed: "Gagal menghapus properti yang disukai.",
          totalLiked: "Total disukai",
        }
      : {
          pageTitle: "Liked Properties",
          pageSubtitle: "All properties you liked will appear here.",
          loading: "Loading liked properties...",
          emptyTitle: "No liked properties yet",
          emptyDesc:
            "Like properties from the marketplace so you can check them again later.",
          goMarketplace: "Go to Marketplace",
          remove: "Remove",
          viewDetail: "View Detail",
          posted: "Listing",
          available: "Still available",
          unavailable: "Unavailable",
          forSale: "For Sale",
          forRent: "For Rent",
          loginRequired: "Please log in first.",
          removeFailed: "Failed to remove liked property.",
          totalLiked: "Total liked",
        };

  useEffect(() => {
    let ignore = false;

    async function loadLiked() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (ignore) return;

      if (!user) {
        setCurrentUserId(null);
        setItems([]);
        setLoading(false);
        router.push("/login?next=/agentdashboard/liked");
        return;
      }

      setCurrentUserId(user.id);

      const { data: likeRows, error: likeError } = await supabase
        .from("property_likes")
        .select("property_id")
        .eq("user_id", user.id);

      if (ignore) return;

      if (likeError) {
        console.error("Failed to load liked properties:", likeError);
        setItems([]);
        setLoading(false);
        return;
      }

      const propertyIds = Array.from(
        new Set(((likeRows ?? []) as LikeRow[]).map((row) => row.property_id))
      );

      if (propertyIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: propertyRows, error: propertyError } = await supabase
        .from("properties")
        .select(`
          id,
          kode,
          posted_date,
          created_at,
          title,
          price,
          province,
          city,
          area,
          building_size,
          land_size,
          bedrooms,
          furnishing,
          listing_type,
          rental_type,
          property_type,
          source,
          status,
          verification_status,
          verified_ok,
          is_paused,
          listing_expires_at,
          transaction_status,
          property_images (
            image_url,
            sort_order,
            is_cover
          )
        `)
        .in("id", propertyIds);

      if (ignore) return;

      if (propertyError) {
        console.error("Failed to load property data for liked items:", propertyError);
        setItems([]);
        setLoading(false);
        return;
      }

      const propertyMap = new Map<string, LikedProperty>();

      ((propertyRows ?? []) as PropertyRow[]).forEach((row) => {
        const sortedImages = [...(row.property_images ?? [])].sort((a, b) => {
          const coverA = a.is_cover ? 1 : 0;
          const coverB = b.is_cover ? 1 : 0;

          if (coverA !== coverB) return coverB - coverA;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });

        const image =
          sortedImages.length > 0
            ? sortedImages[0].image_url
            : "/placeholder-property.jpg";

        propertyMap.set(row.id, {
          id: row.id,
          kode: row.kode ?? "-",
          title: row.title ?? "-",
          priceValue: Number(row.price ?? 0),
          province: row.province ?? "-",
          area: row.city || row.area || "-",
          size: `${row.building_size ?? row.land_size ?? 0} m²`,
          bed: `${row.bedrooms ?? 0} ${lang === "id" ? "Kamar" : "Bed"}`,
          furnished: mapFurnishing(row.furnishing, lang),
          propertyType: formatPropertyType(row.property_type, lang),
          jenisListing: row.listing_type === "disewa" ? "disewa" : "dijual",
          rentalType: normalizeRentalType(row.rental_type),
          postedDate: formatPostedDate(row.posted_date || row.created_at),
          image,
          isAvailable: isPropertyAvailable(row),
        });
      });

      const orderedItems = propertyIds
        .map((id) => propertyMap.get(id))
        .filter(Boolean) as LikedProperty[];

      setItems(orderedItems);
      setLoading(false);
    }

    loadLiked();

    return () => {
      ignore = true;
    };
  }, [lang, router]);

  async function handleRemove(propertyId: string) {
    if (!currentUserId) {
      alert(t.loginRequired);
      return;
    }

    const previous = items;
    setRemovingId(propertyId);
    setItems((prev) => prev.filter((item) => item.id !== propertyId));

    const { error } = await supabase
      .from("property_likes")
      .delete()
      .eq("user_id", currentUserId)
      .eq("property_id", propertyId);

    if (error) {
      console.error("Failed to remove liked property:", error);
      setItems(previous);
      alert(t.removeFailed);
    }

    setRemovingId(null);
  }

  const totalLiked = useMemo(() => items.length, [items.length]);

  return (
    <main className="min-h-screen bg-[#F7F7F7] text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E] sm:text-3xl">
                {t.pageTitle}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                {t.pageSubtitle}
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-[#1C1C1E]">
              <Heart className="h-4 w-4" />
              {t.totalLiked}: {totalLiked}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center text-sm text-gray-500 sm:text-base">
              {t.loading}
            </div>
          ) : items.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-gray-200 bg-gray-50 px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                <Heart className="h-7 w-7 text-gray-400" />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-[#1C1C1E]">
                {t.emptyTitle}
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
                {t.emptyDesc}
              </p>

              <Link
                href="/properti"
                className="mt-5 inline-flex items-center justify-center rounded-2xl bg-[#1C1C1E] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t.goMarketplace}
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const displayPrice = formatPriceByCurrency(
                  item.priceValue,
                  currentCurrency
                );
                const secondaryPrice = formatSecondaryPrice(
                  item.priceValue,
                  currentCurrency
                );

                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="relative">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-[260px] w-full object-cover sm:h-[280px]"
                      />

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] shadow-sm">
                          {item.jenisListing === "dijual"
                            ? t.forSale
                            : t.forRent}
                        </span>

                        {item.jenisListing === "disewa" && item.rentalType ? (
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm ${rentalTypeBadgeClass(
                              item.rentalType
                            )}`}
                          >
                            {getRentalTypeLabel(item.rentalType, lang)}
                          </span>
                        ) : null}

                        <span className="rounded-full border border-white/80 bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] shadow-sm">
                          {item.propertyType}
                        </span>
                      </div>

                      <div className="absolute bottom-3 right-3 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-[10px] font-semibold text-white">
                        TETAMO
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="text-lg font-extrabold text-[#1C1C1E] sm:text-xl">
                        {displayPrice}
                      </div>

                      <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                        ≈ {secondaryPrice}
                      </div>

                      <Link href={`/properti/${item.id}`} className="mt-2 block">
                        <h3 className="text-sm font-semibold leading-snug text-[#1C1C1E] hover:underline sm:text-base">
                          {item.title}
                        </h3>
                      </Link>

                      <div className="mt-2 flex items-start gap-2 text-xs text-gray-500 sm:text-sm">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {item.area}, {item.province}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs text-gray-600 sm:text-sm">
                        <span className="inline-flex items-center gap-1.5">
                          <Square className="h-3.5 w-3.5" />
                          {item.size}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <BedDouble className="h-3.5 w-3.5" />
                          {item.bed}
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-gray-500 sm:text-sm">
                        {item.furnished}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span>
                            {t.posted}: <span className="font-medium">{item.postedDate}</span>
                          </span>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold sm:text-[11px] ${
                            item.isAvailable
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.isAvailable ? t.available : t.unavailable}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleRemove(item.id)}
                          disabled={removingId === item.id}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t.remove}
                        </button>

                        <Link
                          href={`/properti/${item.id}`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {t.viewDetail}
                        </Link>
                      </div>

                      <div className="mt-3 text-[11px] text-gray-500">
                        {item.kode}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}