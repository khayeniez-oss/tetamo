"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Search,
  MapPin,
  Hash,
  SlidersHorizontal,
  CarFront,
  Bike,
} from "lucide-react";

type VehicleCategory = "car" | "motor";
type PostedByType = "owner" | "agent" | "dealer";
type ListingTier = "featured" | "normal";

type SortOption =
  | "relevan"
  | "terbaru"
  | "harga-rendah"
  | "harga-tinggi";

type PriceRange =
  | ""
  | "<50jt"
  | "50jt-200jt"
  | "200jt-500jt"
  | "500jt-1m"
  | ">1m";

type SuggestionItem = {
  id: string;
  type: "vehicle" | "location" | "kode";
  label: string;
  sublabel?: string;
  query: string;
  vehicleId?: string;
  detailHref?: string;
  listingTier?: ListingTier;
};

type VehicleItem = {
  id: string;
  slug?: string | null;
  category: VehicleCategory;
  title: string;
  brand: string;
  model: string;
  price: number;
  city: string;
  province: string;
  location: string;
  year: string;
  transmission: string;
  fuel: string;
  mileage: string;
  posterName: string;
  postedByType: PostedByType;
  whatsapp: string;
  images: string[];
  kodeListing: string;
  postedDate: string;
  verifiedListing: boolean;
  listingTier: ListingTier;
  detailHref: string;
};

type DbVehicleMedia = {
  vehicle_id: string;
  file_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
  media_type: "photo" | "video";
};

type DbProfile = {
  id: string;
  full_name: string | null;
  agency: string | null;
  photo_url: string | null;
  phone: string | null;
};

type DbVehicle = {
  id: string;
  kode: string | null;
  slug: string | null;
  user_id: string | null;
  owner_user_id: string | null;
  agent_user_id: string | null;
  source: string | null;
  vehicle_type: string | null;
  title: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  price: number | null;
  transmission: string | null;
  fuel: string | null;
  mileage: string | null;
  province: string | null;
  city: string | null;
  cover_image_url: string | null;
  is_featured: boolean | null;
  approval_status: string | null;
  listing_status: string | null;
  created_at: string | null;
};

const VALID_SORTS: SortOption[] = [
  "relevan",
  "terbaru",
  "harga-rendah",
  "harga-tinggi",
];

const VALID_PRICE_RANGES: PriceRange[] = [
  "",
  "<50jt",
  "50jt-200jt",
  "200jt-500jt",
  "500jt-1m",
  ">1m",
];

const FALLBACK_IMAGES: Record<VehicleCategory, string[]> = {
  car: [
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
  ],
  motor: [
    "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80",
  ],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/,/g, "")
    .replace(/\//g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatIdr(value: number | null | undefined) {
  if (typeof value !== "number") return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
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

function normalizeWhatsapp(phone?: string | null) {
  if (!phone) return "";
  const digits = phone.replace(/[^\d]/g, "");

  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;

  return digits;
}

function getPriceRange(value: number): PriceRange {
  if (value < 50_000_000) return "<50jt";
  if (value < 200_000_000) return "50jt-200jt";
  if (value < 500_000_000) return "200jt-500jt";
  if (value <= 1_000_000_000) return "500jt-1m";
  return ">1m";
}

function buildVehicleDetailHref(category: VehicleCategory, slugOrId: string) {
  return category === "motor"
    ? `/vehicles/motor/${slugOrId}`
    : `/vehicles/car/${slugOrId}`;
}

function buildSearchableText(item: VehicleItem) {
  return normalizeText(`
    ${item.title}
    ${item.brand}
    ${item.model}
    ${item.kodeListing}
    ${item.city}
    ${item.province}
    ${item.location}
    ${item.year}
    ${item.transmission}
    ${item.fuel}
    ${item.mileage}
    ${item.posterName}
    ${item.category}
    ${item.listingTier}
  `);
}

function parsePostedDateToTime(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

  const fallback = Date.parse(value);
  return Number.isNaN(fallback) ? 0 : fallback;
}

function calculateRelevanceScore(item: VehicleItem, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return item.listingTier === "featured" ? 100 : 0;
  }

  const words = normalizedQuery.split(" ").filter(Boolean);
  const searchable = buildSearchableText(item);
  const normalizedCode = normalizeText(item.kodeListing);
  const normalizedTitle = normalizeText(item.title);
  const normalizedBrand = normalizeText(item.brand);
  const normalizedModel = normalizeText(item.model);
  const normalizedCity = normalizeText(item.city);
  const normalizedProvince = normalizeText(item.province);

  let score = 0;

  if (normalizedCode === normalizedQuery) score += 4000;
  if (normalizedCode.startsWith(normalizedQuery)) score += 1800;
  if (normalizedTitle === normalizedQuery) score += 1600;
  if (normalizedTitle.includes(normalizedQuery)) score += 900;
  if (normalizedBrand === normalizedQuery) score += 700;
  if (normalizedModel === normalizedQuery) score += 650;
  if (normalizedCity === normalizedQuery) score += 600;
  if (normalizedProvince === normalizedQuery) score += 500;

  for (const word of words) {
    if (normalizedCode.includes(word)) score += 220;
    if (normalizedTitle.includes(word)) score += 150;
    if (normalizedBrand.includes(word)) score += 120;
    if (normalizedModel.includes(word)) score += 120;
    if (normalizedCity.includes(word)) score += 100;
    if (normalizedProvince.includes(word)) score += 90;
    if (searchable.includes(word)) score += 20;
  }

  if (words.length > 0 && words.every((word) => searchable.includes(word))) {
    score += 180;
  }

  if (item.listingTier === "featured") score += 100;

  return score;
}

function dedupeImages(images: string[]) {
  return Array.from(new Set(images.filter(Boolean)));
}

function getPostedByType(source?: string | null): PostedByType {
  if (source === "owner") return "owner";
  if (source === "agent") return "agent";
  return "dealer";
}

function getDefaultPosterName(source?: string | null, lang: string = "en") {
  if (source === "owner") {
    return lang === "id" ? "Pemilik Kendaraan" : "Vehicle Owner";
  }
  if (source === "agent") {
    return lang === "id" ? "Agen Kendaraan" : "Vehicle Agent";
  }
  return lang === "id" ? "Partner Kendaraan" : "Vehicle Partner";
}

function mapDbVehicleToUi(args: {
  item: DbVehicle;
  mediaMap: Map<string, string[]>;
  profileMap: Map<string, DbProfile>;
  lang: string;
}): VehicleItem {
  const { item, mediaMap, profileMap, lang } = args;

  const category: VehicleCategory =
    item.vehicle_type === "motor" ? "motor" : "car";

  const profile =
    profileMap.get(item.user_id || "") ||
    profileMap.get(item.owner_user_id || "") ||
    profileMap.get(item.agent_user_id || "");

  const images = dedupeImages([
    item.cover_image_url || "",
    ...(mediaMap.get(item.id) || []),
  ]);

  const finalImages =
    images.length > 0 ? images : FALLBACK_IMAGES[category];

  const slugOrId = item.slug || item.id;

  return {
    id: item.id,
    slug: item.slug,
    category,
    title: item.title || "-",
    brand: item.brand || "-",
    model: item.model || "-",
    price: Number(item.price || 0),
    city: item.city || "-",
    province: item.province || "-",
    location: [item.city, item.province].filter(Boolean).join(", ") || "-",
    year: item.year ? String(item.year) : "-",
    transmission: item.transmission || "-",
    fuel: item.fuel || "-",
    mileage: item.mileage || "-",
    posterName:
      profile?.full_name?.trim() || getDefaultPosterName(item.source, lang),
    postedByType: getPostedByType(item.source),
    whatsapp: normalizeWhatsapp(profile?.phone),
    images: finalImages,
    kodeListing: item.kode || "-",
    postedDate: formatPostedDate(item.created_at, lang),
    verifiedListing: item.approval_status === "approved",
    listingTier: item.is_featured ? "featured" : "normal",
    detailHref: buildVehicleDetailHref(category, slugOrId),
  };
}

async function fetchVehicleRows(): Promise<DbVehicle[]> {
  const selectCols =
    "id,kode,slug,user_id,owner_user_id,agent_user_id,source,vehicle_type,title,brand,model,year,price,transmission,fuel,mileage,province,city,cover_image_url,is_featured,approval_status,listing_status,created_at";

  const viewResult = await supabase
    .from("vehicle_marketplace_view")
    .select(selectCols)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (!viewResult.error) {
    return (viewResult.data || []) as DbVehicle[];
  }

  const tableResult = await supabase
    .from("vehicles")
    .select(selectCols)
    .eq("approval_status", "approved")
    .eq("listing_status", "active")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (tableResult.error) throw tableResult.error;

  return (tableResult.data || []) as DbVehicle[];
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-gray-300 bg-white px-4 py-3 pr-10 text-sm text-[#1C1C1E] outline-none focus:border-[#1C1C1E]"
        >
          {children}
        </select>

        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          ▼
        </span>
      </div>
    </div>
  );
}

function PaginationButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition ${
        active
          ? "border-black bg-black text-white"
          : "border-gray-300 bg-white text-[#1C1C1E] hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const t =
    lang === "id"
      ? {
          title: "Hasil Pencarian Kendaraan",
          allVehicles: "Menampilkan semua kendaraan yang tersedia.",
          foundFor: "kendaraan ditemukan untuk",
          loading: "Memuat kendaraan...",
          failed: "Gagal memuat kendaraan:",
          empty: "Tidak ada kendaraan ditemukan.",
          search: "Cari",
          searchPlaceholder:
            "Cari mobil, motor, brand, model, kode listing, lokasi...",
          noSuggestion: "Tidak ada saran pencarian.",
          listingCode: "Kode Listing",
          location: "Lokasi",
          vehicle: "Kendaraan",
          vehicleType: "Tipe Kendaraan",
          province: "Provinsi",
          city: "Kota",
          transmission: "Transmisi",
          fuel: "Bahan Bakar",
          year: "Tahun",
          price: "Harga",
          sort: "Urutkan",
          allVehicleTypes: "Semua Kendaraan",
          car: "Mobil",
          motor: "Motor",
          allProvince: "Semua Provinsi",
          allCity: "Semua Kota",
          allTransmission: "Semua Transmisi",
          allFuel: "Semua Bahan Bakar",
          allYear: "Semua Tahun",
          allPrice: "Semua Harga",
          mostRelevant: "Paling Relevan",
          newest: "Terbaru",
          lowestPrice: "Harga Terendah",
          highestPrice: "Harga Tertinggi",
          showing: "Menampilkan",
          from: "dari",
          vehicles: "kendaraan",
          clearFilters: "Reset Filter",
          moreFilters: "Filter Lainnya",
          hideFilters: "Sembunyikan Filter",
          verified: "Verified",
          featured: "Featured",
          previous: "Sebelumnya",
          next: "Berikutnya",
          page: "Halaman",
          viewDetail: "Lihat Detail",
        }
      : {
          title: "Vehicle Search Results",
          allVehicles: "Showing all available vehicles.",
          foundFor: "vehicles found for",
          loading: "Loading vehicles...",
          failed: "Failed to load vehicles:",
          empty: "No vehicles found.",
          search: "Search",
          searchPlaceholder:
            "Search car, motorbike, brand, model, listing code, location...",
          noSuggestion: "No search suggestions.",
          listingCode: "Listing Code",
          location: "Location",
          vehicle: "Vehicle",
          vehicleType: "Vehicle Type",
          province: "Province",
          city: "City",
          transmission: "Transmission",
          fuel: "Fuel",
          year: "Year",
          price: "Price",
          sort: "Sort By",
          allVehicleTypes: "All Vehicles",
          car: "Cars",
          motor: "Motorbikes",
          allProvince: "All Provinces",
          allCity: "All Cities",
          allTransmission: "Any Transmission",
          allFuel: "Any Fuel",
          allYear: "Any Year",
          allPrice: "All Prices",
          mostRelevant: "Most Relevant",
          newest: "Newest",
          lowestPrice: "Lowest Price",
          highestPrice: "Highest Price",
          showing: "Showing",
          from: "of",
          vehicles: "vehicles",
          clearFilters: "Clear Filters",
          moreFilters: "More Filters",
          hideFilters: "Hide Filters",
          verified: "Verified",
          featured: "Featured",
          previous: "Previous",
          next: "Next",
          page: "Page",
          viewDetail: "View Detail",
        };

  const qParam = searchParams.get("q") || "";
  const vehicleTypeParam =
    searchParams.get("vehicleType") === "car" ||
    searchParams.get("vehicleType") === "motor"
      ? (searchParams.get("vehicleType") as "" | "car" | "motor")
      : "";
  const provinceParam = searchParams.get("province") || "";
  const cityParam = searchParams.get("city") || "";
  const transmissionParam = searchParams.get("transmission") || "";
  const fuelParam = searchParams.get("fuel") || "";
  const yearParam = searchParams.get("year") || "";
  const priceRangeParam = VALID_PRICE_RANGES.includes(
    (searchParams.get("priceRange") || "") as PriceRange
  )
    ? ((searchParams.get("priceRange") || "") as PriceRange)
    : "";
  const sortByParam = VALID_SORTS.includes(
    (searchParams.get("sortBy") || "relevan") as SortOption
  )
    ? ((searchParams.get("sortBy") || "relevan") as SortOption)
    : "relevan";

  const parsedPage = Number(searchParams.get("page") || "1");
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [allVehicles, setAllVehicles] = useState<VehicleItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchInput, setSearchInput] = useState(qParam);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mobileMoreFiltersOpen, setMobileMoreFiltersOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const currentSearchUrl = useMemo(() => {
    const params = searchParams.toString();
    return params ? `/vehicles/search?${params}` : "/vehicles/search";
  }, [searchParams]);

  function buildSearchUrl(
    updates: Record<string, string | number | null | undefined>,
    options?: { resetPage?: boolean }
  ) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });

    if (options?.resetPage ?? true) {
      params.delete("page");
    }

    const qs = params.toString();
    return qs ? `/vehicles/search?${qs}` : "/vehicles/search";
  }

  function replaceSearchUrl(
    updates: Record<string, string | number | null | undefined>,
    options?: { resetPage?: boolean }
  ) {
    router.replace(buildSearchUrl(updates, options));
  }

  function pushSearchUrl(
    updates: Record<string, string | number | null | undefined>,
    options?: { resetPage?: boolean }
  ) {
    router.push(buildSearchUrl(updates, options));
  }

  useEffect(() => {
    let ignore = false;

    async function loadVehicles() {
      setLoadingData(true);
      setErrorMessage("");

      try {
        const rows = await fetchVehicleRows();
        if (ignore) return;

        const vehicleIds = rows.map((item) => item.id);

        const mediaResult = vehicleIds.length
          ? await supabase
              .from("vehicle_media")
              .select("vehicle_id,file_url,sort_order,is_cover,media_type")
              .in("vehicle_id", vehicleIds)
              .eq("media_type", "photo")
              .order("is_cover", { ascending: false })
              .order("sort_order", { ascending: true })
          : { data: [], error: null };

        if (ignore) return;
        if (mediaResult.error) throw mediaResult.error;

        const mediaRows = ((mediaResult.data || []) as DbVehicleMedia[]) || [];
        const mediaMap = new Map<string, string[]>();

        for (const media of mediaRows) {
          const prev = mediaMap.get(media.vehicle_id) || [];
          prev.push(media.file_url);
          mediaMap.set(media.vehicle_id, prev);
        }

        const userIds = Array.from(
          new Set(
            rows
              .flatMap((item) => [item.user_id, item.owner_user_id, item.agent_user_id])
              .filter(Boolean)
          )
        ) as string[];

        const profileMap = new Map<string, DbProfile>();

        if (userIds.length > 0) {
          const profileResult = await supabase
            .from("profiles")
            .select("id,full_name,agency,photo_url,phone")
            .in("id", userIds);

          if (ignore) return;
          if (profileResult.error) throw profileResult.error;

          const profiles = ((profileResult.data || []) as DbProfile[]) || [];
          profiles.forEach((profile) => {
            profileMap.set(profile.id, profile);
          });
        }

        const mapped = rows.map((item) =>
          mapDbVehicleToUi({
            item,
            mediaMap,
            profileMap,
            lang,
          })
        );

        setAllVehicles(mapped);
        setLoadingData(false);
      } catch (error: any) {
        if (ignore) return;
        setAllVehicles([]);
        setLoadingData(false);
        setErrorMessage(error?.message || "Unknown error");
      }
    }

    loadVehicles();

    return () => {
      ignore = true;
    };
  }, [lang]);

  const provinces = useMemo(
    () =>
      [...new Set(allVehicles.map((item) => item.province).filter(Boolean))].sort(),
    [allVehicles]
  );

  const cities = useMemo(() => {
    const base = provinceParam
      ? allVehicles.filter((item) => item.province === provinceParam)
      : allVehicles;

    return [...new Set(base.map((item) => item.city).filter(Boolean))].sort();
  }, [provinceParam, allVehicles]);

  const transmissions = useMemo(
    () =>
      [...new Set(allVehicles.map((item) => item.transmission).filter(Boolean))].sort(),
    [allVehicles]
  );

  const fuels = useMemo(
    () => [...new Set(allVehicles.map((item) => item.fuel).filter(Boolean))].sort(),
    [allVehicles]
  );

  const years = useMemo(
    () =>
      [...new Set(allVehicles.map((item) => item.year).filter(Boolean))]
        .sort((a, b) => Number(b) - Number(a)),
    [allVehicles]
  );

  useEffect(() => {
    if (!provinceParam) return;
    const validCities = new Set(
      allVehicles
        .filter((item) => item.province === provinceParam)
        .map((item) => item.city)
    );

    if (cityParam && !validCities.has(cityParam)) {
      replaceSearchUrl({ city: "" });
    }
  }, [provinceParam, cityParam, allVehicles]);

  const autocompleteGroups = useMemo(() => {
    const q = normalizeText(searchInput);

    if (!q) {
      return {
        kode: [] as SuggestionItem[],
        lokasi: [] as SuggestionItem[],
        kendaraan: [] as SuggestionItem[],
      };
    }

    const scored = allVehicles
      .map((item) => ({
        item,
        score: calculateRelevanceScore(item, q),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    const kode = scored
      .filter(({ item }) => normalizeText(item.kodeListing).includes(q))
      .slice(0, 4)
      .map(({ item }) => ({
        id: `kode-${item.id}`,
        type: "kode" as const,
        label: item.kodeListing,
        sublabel: `${item.title} • ${item.location}`,
        query: item.kodeListing,
        vehicleId: item.id,
        detailHref: item.detailHref,
        listingTier: item.listingTier,
      }));

    const lokasiValues = Array.from(
      new Set(
        allVehicles.flatMap((item) => [
          `${item.city}, ${item.province}`,
          item.city,
          item.province,
        ])
      )
    );

    const lokasi = lokasiValues
      .filter((value) => normalizeText(value).includes(q))
      .slice(0, 5)
      .map((value, index) => ({
        id: `lokasi-${index}-${value}`,
        type: "location" as const,
        label: value,
        query: value,
      }));

    const kendaraan = scored.slice(0, 6).map(({ item }) => ({
      id: `vehicle-${item.id}`,
      type: "vehicle" as const,
      label: item.title,
      sublabel: `${item.location} • ${formatIdr(item.price)}`,
      query: item.title,
      vehicleId: item.id,
      detailHref: item.detailHref,
      listingTier: item.listingTier,
    }));

    return { kode, lokasi, kendaraan };
  }, [searchInput, allVehicles]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = normalizeText(qParam);

    let result = allVehicles
      .map((item) => ({
        item,
        relevanceScore: calculateRelevanceScore(item, normalizedQuery),
      }))
      .filter(({ item, relevanceScore }) => {
        const searchable = buildSearchableText(item);

        const matchesQuery =
          !normalizedQuery ||
          relevanceScore > 0 ||
          searchable.includes(normalizedQuery);

        const matchesVehicleType =
          !vehicleTypeParam || item.category === vehicleTypeParam;
        const matchesProvince = !provinceParam || item.province === provinceParam;
        const matchesCity = !cityParam || item.city === cityParam;
        const matchesTransmission =
          !transmissionParam || item.transmission === transmissionParam;
        const matchesFuel = !fuelParam || item.fuel === fuelParam;
        const matchesYear = !yearParam || item.year === yearParam;
        const matchesPrice =
          !priceRangeParam || getPriceRange(item.price) === priceRangeParam;

        return (
          matchesQuery &&
          matchesVehicleType &&
          matchesProvince &&
          matchesCity &&
          matchesTransmission &&
          matchesFuel &&
          matchesYear &&
          matchesPrice
        );
      });

    if (sortByParam === "harga-rendah") {
      result = [...result].sort((a, b) => a.item.price - b.item.price);
    } else if (sortByParam === "harga-tinggi") {
      result = [...result].sort((a, b) => b.item.price - a.item.price);
    } else if (sortByParam === "terbaru") {
      result = [...result].sort(
        (a, b) =>
          parsePostedDateToTime(b.item.postedDate) -
          parsePostedDateToTime(a.item.postedDate)
      );
    } else {
      result = [...result].sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    return result.map(({ item }) => item);
  }, [
    allVehicles,
    qParam,
    vehicleTypeParam,
    provinceParam,
    cityParam,
    transmissionParam,
    fuelParam,
    yearParam,
    priceRangeParam,
    sortByParam,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedResults = filteredResults.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const startItem =
    filteredResults.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(
    safeCurrentPage * ITEMS_PER_PAGE,
    filteredResults.length
  );

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, safeCurrentPage - 1);
    const end = Math.min(totalPages, safeCurrentPage + 1);

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    return pages;
  }, [safeCurrentPage, totalPages]);

  function handleSearch(customQuery?: string) {
    const query = (customQuery ?? searchInput).trim();
    setShowSuggestions(false);
    pushSearchUrl({ q: query || null });
  }

  function handleSuggestionClick(item: SuggestionItem) {
    setShowSuggestions(false);

    if ((item.type === "vehicle" || item.type === "kode") && item.detailHref) {
      router.push(
        `${item.detailHref}?back=${encodeURIComponent(currentSearchUrl)}`
      );
      return;
    }

    setSearchInput(item.query);
    pushSearchUrl({ q: item.query || null });
  }

  function clearFilters() {
    replaceSearchUrl({
      vehicleType: "",
      province: "",
      city: "",
      transmission: "",
      fuel: "",
      year: "",
      priceRange: "",
      sortBy: "relevan",
    });
    setMobileMoreFiltersOpen(false);
  }

  const hasActiveFilters =
    vehicleTypeParam ||
    provinceParam ||
    cityParam ||
    transmissionParam ||
    fuelParam ||
    yearParam ||
    priceRangeParam ||
    sortByParam !== "relevan";

  const hasAutocompleteResults =
    autocompleteGroups.kode.length > 0 ||
    autocompleteGroups.lokasi.length > 0 ||
    autocompleteGroups.kendaraan.length > 0;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-[#1C1C1E] sm:text-3xl">
            {t.title}
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-600 sm:text-base">
            {qParam ? (
              <>
                {filteredResults.length} {t.foundFor}{" "}
                <span className="font-semibold text-[#1C1C1E]">{qParam}</span>
              </>
            ) : (
              <>{t.allVehicles}</>
            )}
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div ref={searchBoxRef} className="relative">
            <div className="grid grid-cols-[1fr_96px] gap-3 sm:grid-cols-[1fr_110px]">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />

                <input
                  type="text"
                  value={searchInput}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder={t.searchPlaceholder}
                  className="w-full rounded-2xl border border-gray-300 py-3 pl-11 pr-4 text-sm text-[#1C1C1E] placeholder:text-gray-400 outline-none focus:border-[#1C1C1E]"
                />

                {showSuggestions && searchInput.trim() && (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)]">
                    {hasAutocompleteResults ? (
                      <div className="max-h-[420px] overflow-y-auto p-2">
                        {autocompleteGroups.kode.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t.listingCode}
                            </div>

                            {autocompleteGroups.kode.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSuggestionClick(item)}
                                className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50"
                              >
                                <div className="mt-0.5 rounded-lg bg-gray-100 p-2">
                                  <Hash className="h-4 w-4 text-[#1C1C1E]" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-[#1C1C1E]">
                                      {item.label}
                                    </p>

                                    {item.listingTier === "featured" ? (
                                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                                        {t.featured}
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="mt-1 text-sm text-gray-500">
                                    {item.sublabel}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {autocompleteGroups.lokasi.length > 0 && (
                          <div className="mb-2">
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t.location}
                            </div>

                            {autocompleteGroups.lokasi.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSuggestionClick(item)}
                                className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50"
                              >
                                <div className="mt-0.5 rounded-lg bg-gray-100 p-2">
                                  <MapPin className="h-4 w-4 text-[#1C1C1E]" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-[#1C1C1E]">
                                    {item.label}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {autocompleteGroups.kendaraan.length > 0 && (
                          <div>
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t.vehicle}
                            </div>

                            {autocompleteGroups.kendaraan.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSuggestionClick(item)}
                                className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50"
                              >
                                <div className="mt-0.5 rounded-lg bg-gray-100 p-2">
                                  <CarFront className="h-4 w-4 text-[#1C1C1E]" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-[#1C1C1E]">
                                      {item.label}
                                    </p>

                                    {item.listingTier === "featured" ? (
                                      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
                                        {t.featured}
                                      </span>
                                    ) : null}
                                  </div>

                                  <p className="mt-1 text-sm text-gray-500">
                                    {item.sublabel}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-sm text-gray-500">
                        {t.noSuggestion}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSearch()}
                className="w-full rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t.search}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
            <FilterSelect
              label={t.vehicleType}
              value={vehicleTypeParam}
              onChange={(value) =>
                replaceSearchUrl({ vehicleType: value as "" | "car" | "motor" })
              }
            >
              <option value="">{t.allVehicleTypes}</option>
              <option value="car">{t.car}</option>
              <option value="motor">{t.motor}</option>
            </FilterSelect>

            <FilterSelect
              label={t.province}
              value={provinceParam}
              onChange={(value) =>
                replaceSearchUrl({ province: value, city: "" })
              }
            >
              <option value="">{t.allProvince}</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.sort}
              value={sortByParam}
              onChange={(value) => replaceSearchUrl({ sortBy: value })}
            >
              <option value="relevan">{t.mostRelevant}</option>
              <option value="terbaru">{t.newest}</option>
              <option value="harga-rendah">{t.lowestPrice}</option>
              <option value="harga-tinggi">{t.highestPrice}</option>
            </FilterSelect>

            <button
              type="button"
              onClick={() => setMobileMoreFiltersOpen((prev) => !prev)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-[#1C1C1E] transition hover:bg-gray-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {mobileMoreFiltersOpen ? t.hideFilters : t.moreFilters}
            </button>
          </div>

          {mobileMoreFiltersOpen && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
              <FilterSelect
                label={t.city}
                value={cityParam}
                onChange={(value) => replaceSearchUrl({ city: value })}
              >
                <option value="">{t.allCity}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={t.transmission}
                value={transmissionParam}
                onChange={(value) => replaceSearchUrl({ transmission: value })}
              >
                <option value="">{t.allTransmission}</option>
                {transmissions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={t.fuel}
                value={fuelParam}
                onChange={(value) => replaceSearchUrl({ fuel: value })}
              >
                <option value="">{t.allFuel}</option>
                {fuels.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={t.year}
                value={yearParam}
                onChange={(value) => replaceSearchUrl({ year: value })}
              >
                <option value="">{t.allYear}</option>
                {years.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={t.price}
                value={priceRangeParam}
                onChange={(value) => replaceSearchUrl({ priceRange: value })}
              >
                <option value="">{t.allPrice}</option>
                <option value="<50jt">&lt; 50 Juta</option>
                <option value="50jt-200jt">50 - 200 Juta</option>
                <option value="200jt-500jt">200 - 500 Juta</option>
                <option value="500jt-1m">500 Juta - 1 Miliar</option>
                <option value=">1m">&gt; 1 Miliar</option>
              </FilterSelect>
            </div>
          )}

          <div className="mt-4 hidden xl:grid xl:grid-cols-7 xl:gap-3">
            <FilterSelect
              label={t.vehicleType}
              value={vehicleTypeParam}
              onChange={(value) =>
                replaceSearchUrl({ vehicleType: value as "" | "car" | "motor" })
              }
            >
              <option value="">{t.allVehicleTypes}</option>
              <option value="car">{t.car}</option>
              <option value="motor">{t.motor}</option>
            </FilterSelect>

            <FilterSelect
              label={t.province}
              value={provinceParam}
              onChange={(value) => replaceSearchUrl({ province: value, city: "" })}
            >
              <option value="">{t.allProvince}</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.city}
              value={cityParam}
              onChange={(value) => replaceSearchUrl({ city: value })}
            >
              <option value="">{t.allCity}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.transmission}
              value={transmissionParam}
              onChange={(value) => replaceSearchUrl({ transmission: value })}
            >
              <option value="">{t.allTransmission}</option>
              {transmissions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.fuel}
              value={fuelParam}
              onChange={(value) => replaceSearchUrl({ fuel: value })}
            >
              <option value="">{t.allFuel}</option>
              {fuels.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.year}
              value={yearParam}
              onChange={(value) => replaceSearchUrl({ year: value })}
            >
              <option value="">{t.allYear}</option>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.price}
              value={priceRangeParam}
              onChange={(value) => replaceSearchUrl({ priceRange: value })}
            >
              <option value="">{t.allPrice}</option>
              <option value="<50jt">&lt; 50 Juta</option>
              <option value="50jt-200jt">50 - 200 Juta</option>
              <option value="200jt-500jt">200 - 500 Juta</option>
              <option value="500jt-1m">500 Juta - 1 Miliar</option>
              <option value=">1m">&gt; 1 Miliar</option>
            </FilterSelect>
          </div>

          <div className="mt-4 hidden xl:grid xl:grid-cols-7 xl:gap-3">
            <div className="xl:col-span-2" />
            <div className="xl:col-span-3" />
            <FilterSelect
              label={t.sort}
              value={sortByParam}
              onChange={(value) => replaceSearchUrl({ sortBy: value })}
            >
              <option value="relevan">{t.mostRelevant}</option>
              <option value="terbaru">{t.newest}</option>
              <option value="harga-rendah">{t.lowestPrice}</option>
              <option value="harga-tinggi">{t.highestPrice}</option>
            </FilterSelect>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              {t.showing} {startItem}–{endItem} {t.from} {filteredResults.length}{" "}
              {t.vehicles}
            </p>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50 sm:w-auto"
              >
                {t.clearFilters}
              </button>
            ) : null}
          </div>
        </div>

        {loadingData ? (
          <div className="mt-12 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:mt-16 sm:text-base">
            {t.loading}
          </div>
        ) : errorMessage ? (
          <div className="mt-12 rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600 sm:mt-16 sm:text-base">
            {t.failed} {errorMessage}
          </div>
        ) : paginatedResults.length > 0 ? (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedResults.map((item) => {
                const icon =
                  item.category === "motor" ? (
                    <Bike className="h-3.5 w-3.5" />
                  ) : (
                    <CarFront className="h-3.5 w-3.5" />
                  );

                const whatsappMessage =
                  lang === "id"
                    ? `Halo, saya melihat kendaraan ini di TETAMO dan tertarik.

Kode: ${item.kodeListing}
Unit: ${item.title}
Lokasi: ${item.location}
Harga: ${formatIdr(item.price)}

Apakah unit ini masih tersedia?`
                    : `Hello, I saw this vehicle on TETAMO and I am interested.

Code: ${item.kodeListing}
Unit: ${item.title}
Location: ${item.location}
Price: ${formatIdr(item.price)}

Is this unit still available?`;

                const whatsappHref = item.whatsapp
                  ? `https://wa.me/${item.whatsapp}?text=${encodeURIComponent(
                      whatsappMessage
                    )}`
                  : "#";

                return (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="h-[250px] w-full object-cover sm:h-[320px] lg:h-[360px]"
                      />

                      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                          {icon}
                          {item.category === "motor" ? t.motor : t.car}
                        </span>

                        {item.verifiedListing ? (
                          <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] text-green-700">
                            {t.verified}
                          </span>
                        ) : null}

                        {item.listingTier === "featured" ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
                            {t.featured}
                          </span>
                        ) : null}
                      </div>

                      <div className="absolute bottom-3 right-3 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                        TETAMO
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <p className="mb-1 text-sm text-gray-500">{item.location}</p>

                      <h3 className="text-base font-semibold leading-snug text-[#1C1C1E] sm:text-lg">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-base font-bold text-[#1C1C1E] sm:text-lg">
                        {formatIdr(item.price)}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span>{item.year}</span>
                        <span>•</span>
                        <span>{item.transmission}</span>
                        <span>•</span>
                        <span>{item.fuel}</span>
                        <span>•</span>
                        <span>{item.mileage}</span>
                      </div>

                      <p className="mt-3 text-sm text-gray-600">
                        {lang === "id" ? "Penjual" : "Seller"}:{" "}
                        <span className="font-semibold text-[#1C1C1E]">
                          {item.posterName}
                        </span>
                      </p>

                      <p className="mt-2 text-sm text-gray-400">
                        {item.kodeListing} • {item.postedDate}
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <a
                          href={whatsappHref}
                          onClick={(e) => {
                            if (!item.whatsapp) e.preventDefault();
                          }}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex min-h-[48px] items-center justify-center rounded-2xl px-3 py-3 text-center text-[13px] font-semibold text-white transition sm:text-sm ${
                            item.whatsapp
                              ? "bg-[#1C1C1E] hover:opacity-90"
                              : "cursor-not-allowed bg-gray-300"
                          }`}
                        >
                          WhatsApp
                        </a>

                        <Link
                          href={`${item.detailHref}?back=${encodeURIComponent(
                            currentSearchUrl
                          )}`}
                          className="flex min-h-[48px] items-center justify-center rounded-2xl bg-yellow-600 px-3 py-3 text-center text-[13px] font-bold text-white transition hover:bg-yellow-700 sm:text-sm"
                        >
                          {t.viewDetail}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:mt-10">
              <p className="text-sm text-gray-900">
                {t.page} {safeCurrentPage} / {totalPages}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() =>
                    pushSearchUrl(
                      { page: Math.max(1, safeCurrentPage - 1) },
                      { resetPage: false }
                    )
                  }
                  disabled={safeCurrentPage === 1}
                  className="rounded-xl border bg-[#1C1C1E] px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {t.previous}
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {visiblePages.map((p) => (
                    <PaginationButton
                      key={p}
                      active={safeCurrentPage === p}
                      onClick={() =>
                        pushSearchUrl({ page: p }, { resetPage: false })
                      }
                    >
                      {p}
                    </PaginationButton>
                  ))}
                </div>

                <button
                  onClick={() =>
                    pushSearchUrl(
                      { page: Math.min(totalPages, safeCurrentPage + 1) },
                      { resetPage: false }
                    )
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-xl border bg-[#1C1C1E] px-3 py-2 text-sm text-white disabled:opacity-50"
                >
                  {t.next}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-12 rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 sm:mt-16 sm:text-base">
            {t.empty}
          </div>
        )}
      </div>
    </main>
  );
}