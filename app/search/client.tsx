"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Search,
  MapPin,
  Building2,
  Hash,
  SlidersHorizontal,
} from "lucide-react";

type ListingTier = "spotlight" | "featured" | "normal";

type PropertyItem = {
  verifiedListing: boolean;
  ownerApproved: boolean;
  agentVerified: boolean;
  id: string;
  jenisListing: "dijual" | "disewa";
  title: string;
  price: string;
  province: string;
  area: string;
  size: string;
  bed: string;
  furnished: string;
  certificate: string;
  description: string;
  agentName: string;
  agency: string;
  photo: string;
  whatsapp: string;
  images: string[];
  kodeListing: string;
  postedDate: string;
  verifiedOwnerStatus?: string;
  verifiedAgent?: boolean;
  boosted?: boolean;
  listingTier: ListingTier;
};

type SortOption =
  | "relevan"
  | "terbaru"
  | "harga-rendah"
  | "harga-tinggi";

type PriceRange =
  | ""
  | "<100jt"
  | "100jt-500jt"
  | "500jt-1m"
  | "1m-3m"
  | ">3m";

type SuggestionItem = {
  id: string;
  type: "property" | "location" | "kode";
  label: string;
  sublabel?: string;
  query: string;
  propertyId?: string;
  listingTier?: ListingTier;
  boosted?: boolean;
};

type DbPropertyImage = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type DbProfile = {
  full_name: string | null;
  agency: string | null;
  photo_url: string | null;
  phone: string | null;
};

type DbProperty = {
  id: string;
  title: string | null;
  price: number | null;
  province: string | null;
  city: string | null;
  area: string | null;
  building_size: number | null;
  land_size: number | null;
  bedrooms: number | null;
  furnishing: string | null;
  certificate: string | null;
  description: string | null;
  listing_type: string | null;
  kode: string | null;
  posted_date: string | null;
  created_at: string | null;
  plan_id: string | null;
  verified_ok: boolean | null;
  verification_status: string | null;
  source: string | null;
  status: string | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;
  featured_expires_at: string | null;
  boost_active: boolean | null;
  boost_expires_at: string | null;
  spotlight_active: boolean | null;
  spotlight_expires_at: string | null;
  transaction_status: string | null;
  property_images: DbPropertyImage[] | null;
  profiles: DbProfile | DbProfile[] | null;
};

const VALID_SORTS: SortOption[] = [
  "relevan",
  "terbaru",
  "harga-rendah",
  "harga-tinggi",
];

const VALID_PRICE_RANGES: PriceRange[] = [
  "",
  "<100jt",
  "100jt-500jt",
  "500jt-1m",
  "1m-3m",
  ">3m",
];

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

function mapFurnishing(value?: string | null, lang?: string) {
  if (!value) return "-";

  const v = value.toLowerCase();

  if (v === "full") return lang === "id" ? "Full Furnish" : "Fully Furnished";
  if (v === "semi") return lang === "id" ? "Semi Furnish" : "Semi Furnished";
  if (v === "unfurnished") return lang === "id" ? "Tanpa Furnitur" : "Unfurnished";

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

function extractPriceNumber(price: string) {
  const cleaned = price
    .toLowerCase()
    .replace(/rp/g, "")
    .replace(/\./g, "")
    .trim();

  if (cleaned.includes("/ tahun")) {
    const yearly = cleaned.replace("/ tahun", "").trim();
    return Number(yearly) || 0;
  }

  return Number(cleaned) || 0;
}

function getPriceRange(value: number): PriceRange {
  if (value < 100_000_000) return "<100jt";
  if (value < 500_000_000) return "100jt-500jt";
  if (value < 1_000_000_000) return "500jt-1m";
  if (value <= 3_000_000_000) return "1m-3m";
  return ">3m";
}

function extractBedroomCount(bed: string) {
  const match = bed.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function buildSearchableText(item: PropertyItem) {
  return normalizeText(`
    ${item.title}
    ${item.jenisListing}
    ${item.price}
    ${item.province}
    ${item.area}
    ${item.size}
    ${item.bed}
    ${item.furnished}
    ${item.certificate}
    ${item.description}
    ${item.agentName}
    ${item.agency}
    ${item.kodeListing}
    ${item.postedDate}
    ${item.listingTier}
    ${item.boosted ? "boost boosted" : ""}
    ${item.verifiedListing ? "verified listing" : ""}
    ${item.ownerApproved ? "owner approved" : ""}
    ${item.agentVerified ? "agent verified" : ""}
  `);
}

function getListingTierUI(tier: ListingTier, lang: string) {
  if (tier === "spotlight") {
    return {
      label: lang === "id" ? "Spotlight" : "Spotlight",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  if (tier === "featured") {
    return {
      label: lang === "id" ? "Featured" : "Featured",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  return null;
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

function getTierBoost(tier: ListingTier) {
  if (tier === "spotlight") return 220;
  if (tier === "featured") return 140;
  return 0;
}

function parsePostedDateToTime(value: string) {
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

  const fallback = Date.parse(value);
  return Number.isNaN(fallback) ? 0 : fallback;
}

function calculateRelevanceScore(item: PropertyItem, query: string) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return (
      getTierBoost(item.listingTier) +
      (item.boosted ? 120 : 0) +
      (item.agentVerified ? 40 : 0) +
      (item.ownerApproved ? 20 : 0) +
      (item.verifiedListing ? 20 : 0)
    );
  }

  const words = normalizedQuery.split(" ").filter(Boolean);
  const searchable = buildSearchableText(item);
  const normalizedCode = normalizeText(item.kodeListing);
  const normalizedTitle = normalizeText(item.title);
  const normalizedArea = normalizeText(item.area);
  const normalizedProvince = normalizeText(item.province);
  const normalizedAgency = normalizeText(item.agency);
  const normalizedAgent = normalizeText(item.agentName);

  let score = 0;

  if (normalizedCode === normalizedQuery) score += 5000;
  if (normalizedCode.startsWith(normalizedQuery)) score += 2200;
  if (normalizedTitle === normalizedQuery) score += 1800;
  if (normalizedTitle.includes(normalizedQuery)) score += 1000;
  if (normalizedArea === normalizedQuery) score += 900;
  if (normalizedProvince === normalizedQuery) score += 800;
  if (`${normalizedArea} ${normalizedProvince}`.includes(normalizedQuery)) {
    score += 700;
  }

  for (const word of words) {
    if (normalizedCode.includes(word)) score += 250;
    if (normalizedTitle.includes(word)) score += 160;
    if (normalizedArea.includes(word)) score += 120;
    if (normalizedProvince.includes(word)) score += 100;
    if (normalizedAgency.includes(word)) score += 70;
    if (normalizedAgent.includes(word)) score += 60;
    if (searchable.includes(word)) score += 25;
  }

  if (words.length > 0 && words.every((word) => searchable.includes(word))) {
    score += 220;
  }

  if (normalizedQuery.includes("dijual") && item.jenisListing === "dijual") {
    score += 120;
  }

  if (normalizedQuery.includes("disewa") && item.jenisListing === "disewa") {
    score += 120;
  }

  score += getTierBoost(item.listingTier);
  if (item.boosted) score += 120;
  if (item.agentVerified) score += 40;
  if (item.ownerApproved) score += 20;
  if (item.verifiedListing) score += 20;

  return score;
}

function normalizeTransactionStatus(value?: string | null) {
  const v = (value || "").trim().toLowerCase();
  if (v === "sold") return "sold";
  if (v === "rented") return "rented";
  return "available";
}

function isListingPublic(row: DbProperty) {
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

function mapDbPropertyToUi(item: DbProperty, lang: string): PropertyItem {
  const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;

  const sortedImages = [...(item.property_images ?? [])].sort((a, b) => {
    const coverA = a.is_cover ? 1 : 0;
    const coverB = b.is_cover ? 1 : 0;

    if (coverA !== coverB) return coverB - coverA;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  const images = sortedImages.length
    ? sortedImages.map((img) => img.image_url)
    : ["/placeholder-property.jpg"];

  const spotlightActive = isPromotionActive(
    item.spotlight_active,
    item.spotlight_expires_at
  );

  const featuredActive =
    item.plan_id === "featured" &&
    (!item.featured_expires_at || isFutureDate(item.featured_expires_at));

  const boostActive = isPromotionActive(item.boost_active, item.boost_expires_at);

  const listingTier: ListingTier = spotlightActive
    ? "spotlight"
    : featuredActive
    ? "featured"
    : "normal";

  const postedByType =
    item.source === "agent" || item.source === "developer"
      ? item.source
      : "owner";

  return {
    verifiedListing: Boolean(item.verified_ok),
    ownerApproved:
      item.verification_status === "verified" || Boolean(item.verified_ok),
    agentVerified: postedByType === "agent" ? Boolean(item.verified_ok) : false,
    id: item.id,
    jenisListing: item.listing_type === "disewa" ? "disewa" : "dijual",
    title: item.title || "-",
    price: formatIdr(item.price ?? 0),
    province: item.province || "-",
    area: item.area || item.city || "-",
    size: `${item.building_size ?? item.land_size ?? 0} m²`,
    bed:
      lang === "id"
        ? `${item.bedrooms ?? 0} Kamar`
        : `${item.bedrooms ?? 0} Bed`,
    furnished: mapFurnishing(item.furnishing, lang),
    certificate: item.certificate || "-",
    description: item.description || "-",
    agentName: profile?.full_name || "Tetamo User",
    agency: profile?.agency || "",
    photo:
      profile?.photo_url ||
      "https://randomuser.me/api/portraits/men/32.jpg",
    whatsapp: normalizeWhatsapp(profile?.phone),
    images,
    kodeListing: item.kode || "-",
    postedDate: formatPostedDate(item.posted_date || item.created_at),
    verifiedOwnerStatus:
      item.verification_status === "verified" ? "verified" : "pending",
    verifiedAgent: postedByType === "agent" ? Boolean(item.verified_ok) : false,
    boosted: boostActive,
    listingTier,
  };
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
          title: "Hasil Pencarian",
          allProperties: "Menampilkan semua properti yang tersedia.",
          foundFor: "properti ditemukan untuk",
          loading: "Memuat properti...",
          failed: "Gagal memuat properti:",
          empty: "Tidak ada properti ditemukan.",
          search: "Cari",
          searchPlaceholder:
            "Cari lokasi, kode listing, project, harga, agen, sertifikat...",
          noSuggestion: "Tidak ada saran pencarian.",
          listingCode: "Kode Listing",
          location: "Lokasi",
          property: "Properti",
          listingType: "Tipe Listing",
          province: "Provinsi",
          area: "Area",
          bedroom: "Kamar",
          price: "Harga",
          sort: "Urutkan",
          allListing: "Semua Listing",
          forSale: "Dijual",
          forRent: "Disewa",
          allProvince: "Semua Provinsi",
          allArea: "Semua Area",
          allBedroom: "Semua Kamar",
          bedroomPlus: "Kamar",
          allPrice: "Semua Harga",
          mostRelevant: "Paling Relevan",
          newest: "Terbaru",
          lowestPrice: "Harga Terendah",
          highestPrice: "Harga Tertinggi",
          showing: "Menampilkan",
          from: "dari",
          properties: "properti",
          clearFilters: "Reset Filter",
          moreFilters: "Filter Lainnya",
          hideFilters: "Sembunyikan Filter",
          verified: "Verified",
          boost: "Boost",
          previous: "Sebelumnya",
          next: "Berikutnya",
          page: "Halaman",
        }
      : {
          title: "Search Results",
          allProperties: "Showing all available properties.",
          foundFor: "properties found for",
          loading: "Loading properties...",
          failed: "Failed to load properties:",
          empty: "No properties found.",
          search: "Search",
          searchPlaceholder:
            "Search location, listing code, project, price, agent, certificate...",
          noSuggestion: "No search suggestions.",
          listingCode: "Listing Code",
          location: "Location",
          property: "Property",
          listingType: "Listing Type",
          province: "Province",
          area: "Area",
          bedroom: "Bedrooms",
          price: "Price",
          sort: "Sort By",
          allListing: "All Listings",
          forSale: "For Sale",
          forRent: "For Rent",
          allProvince: "All Provinces",
          allArea: "All Areas",
          allBedroom: "Any Bedroom",
          bedroomPlus: "Bedrooms",
          allPrice: "All Prices",
          mostRelevant: "Most Relevant",
          newest: "Newest",
          lowestPrice: "Lowest Price",
          highestPrice: "Highest Price",
          showing: "Showing",
          from: "of",
          properties: "properties",
          clearFilters: "Clear Filters",
          moreFilters: "More Filters",
          hideFilters: "Hide Filters",
          verified: "Verified",
          boost: "Boost",
          previous: "Previous",
          next: "Next",
          page: "Page",
        };

  const qParam = searchParams.get("q") || "";
  const jenisListingParam =
    searchParams.get("jenisListing") === "dijual" ||
    searchParams.get("jenisListing") === "disewa"
      ? (searchParams.get("jenisListing") as "" | "dijual" | "disewa")
      : "";
  const provinceParam = searchParams.get("province") || "";
  const areaParam = searchParams.get("area") || "";
  const bedroomParam = searchParams.get("bedroom") || "";
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

  const [allProperties, setAllProperties] = useState<PropertyItem[]>([]);
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
    return params ? `/search?${params}` : "/search";
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
    return qs ? `/search?${qs}` : "/search";
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

    async function loadProperties() {
      setLoadingData(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          title,
          price,
          province,
          city,
          area,
          building_size,
          land_size,
          bedrooms,
          furnishing,
          certificate,
          description,
          listing_type,
          kode,
          posted_date,
          created_at,
          plan_id,
          verified_ok,
          verification_status,
          source,
          status,
          is_paused,
          listing_expires_at,
          featured_expires_at,
          boost_active,
          boost_expires_at,
          spotlight_active,
          spotlight_expires_at,
          transaction_status,
          property_images (
            image_url,
            sort_order,
            is_cover
          ),
          profiles:user_id (
            full_name,
            agency,
            photo_url,
            phone
          )
        `)
        .neq("status", "rejected")
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (error) {
        setAllProperties([]);
        setLoadingData(false);
        setErrorMessage(error.message);
        return;
      }

      const rows = ((data || []) as DbProperty[]).filter(isListingPublic);
      const mapped = rows.map((item) => mapDbPropertyToUi(item, lang));

      setAllProperties(mapped);
      setLoadingData(false);
    }

    loadProperties();

    return () => {
      ignore = true;
    };
  }, [lang]);

  const provinces = useMemo(
    () => [...new Set(allProperties.map((item) => item.province))].sort(),
    [allProperties]
  );

  const areas = useMemo(() => {
    const base = provinceParam
      ? allProperties.filter((item) => item.province === provinceParam)
      : allProperties;

    return [...new Set(base.map((item) => item.area))].sort();
  }, [provinceParam, allProperties]);

  useEffect(() => {
    if (!provinceParam) return;
    const validAreas = new Set(
      allProperties
        .filter((item) => item.province === provinceParam)
        .map((item) => item.area)
    );

    if (areaParam && !validAreas.has(areaParam)) {
      replaceSearchUrl({ area: "" });
    }
  }, [provinceParam, areaParam, allProperties]);

  const autocompleteGroups = useMemo(() => {
    const q = normalizeText(searchInput);

    if (!q) {
      return {
        kode: [] as SuggestionItem[],
        lokasi: [] as SuggestionItem[],
        properti: [] as SuggestionItem[],
      };
    }

    const scored = allProperties
      .map((item) => ({
        item,
        score: calculateRelevanceScore(item, q),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    const kode = scored
      .filter(({ item }) => normalizeText(item.kodeListing).includes(q))
      .slice(0, 3)
      .map(({ item }) => ({
        id: `kode-${item.id}`,
        type: "kode" as const,
        label: item.kodeListing,
        sublabel: `${item.title} • ${item.area}, ${item.province}`,
        query: item.kodeListing,
        propertyId: item.id,
        listingTier: item.listingTier,
        boosted: item.boosted,
      }));

    const lokasiValues = Array.from(
      new Set(
        allProperties.flatMap((item) => [
          `${item.area}, ${item.province}`,
          item.area,
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

    const properti = scored.slice(0, 6).map(({ item }) => ({
      id: `property-${item.id}`,
      type: "property" as const,
      label: item.title,
      sublabel: `${item.area}, ${item.province} • ${item.price}`,
      query: item.title,
      propertyId: item.id,
      listingTier: item.listingTier,
      boosted: item.boosted,
    }));

    return { kode, lokasi, properti };
  }, [searchInput, allProperties]);

  const filteredResults = useMemo(() => {
    const normalizedQuery = normalizeText(qParam);

    let result = allProperties
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

        const matchesJenis =
          !jenisListingParam || item.jenisListing === jenisListingParam;
        const matchesProvince = !provinceParam || item.province === provinceParam;
        const matchesArea = !areaParam || item.area === areaParam;
        const matchesBedroom =
          !bedroomParam || extractBedroomCount(item.bed) >= Number(bedroomParam);
        const matchesPrice =
          !priceRangeParam ||
          getPriceRange(extractPriceNumber(item.price)) === priceRangeParam;

        return (
          matchesQuery &&
          matchesJenis &&
          matchesProvince &&
          matchesArea &&
          matchesBedroom &&
          matchesPrice
        );
      });

    if (sortByParam === "harga-rendah") {
      result = [...result].sort(
        (a, b) => extractPriceNumber(a.item.price) - extractPriceNumber(b.item.price)
      );
    } else if (sortByParam === "harga-tinggi") {
      result = [...result].sort(
        (a, b) => extractPriceNumber(b.item.price) - extractPriceNumber(a.item.price)
      );
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
    allProperties,
    qParam,
    jenisListingParam,
    provinceParam,
    areaParam,
    bedroomParam,
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

    if ((item.type === "property" || item.type === "kode") && item.propertyId) {
      router.push(
        `/properti/${item.propertyId}?back=${encodeURIComponent(currentSearchUrl)}`
      );
      return;
    }

    setSearchInput(item.query);
    pushSearchUrl({ q: item.query || null });
  }

  function clearFilters() {
    replaceSearchUrl({
      jenisListing: "",
      province: "",
      area: "",
      bedroom: "",
      priceRange: "",
      sortBy: "relevan",
    });
    setMobileMoreFiltersOpen(false);
  }

  const hasActiveFilters =
    jenisListingParam ||
    provinceParam ||
    areaParam ||
    bedroomParam ||
    priceRangeParam ||
    sortByParam !== "relevan";

  const hasAutocompleteResults =
    autocompleteGroups.kode.length > 0 ||
    autocompleteGroups.lokasi.length > 0 ||
    autocompleteGroups.properti.length > 0;

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
              <>{t.allProperties}</>
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

                            {autocompleteGroups.kode.map((item) => {
                              const tierUI = item.listingTier
                                ? getListingTierUI(item.listingTier, lang)
                                : null;

                              return (
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

                                      {tierUI ? (
                                        <span
                                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${tierUI.badgeClass}`}
                                        >
                                          {tierUI.label}
                                        </span>
                                      ) : null}

                                      {item.boosted ? (
                                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">
                                          {t.boost}
                                        </span>
                                      ) : null}
                                    </div>

                                    <p className="mt-1 text-sm text-gray-500">
                                      {item.sublabel}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
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

                        {autocompleteGroups.properti.length > 0 && (
                          <div>
                            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t.property}
                            </div>

                            {autocompleteGroups.properti.map((item) => {
                              const tierUI = item.listingTier
                                ? getListingTierUI(item.listingTier, lang)
                                : null;

                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleSuggestionClick(item)}
                                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left hover:bg-gray-50"
                                >
                                  <div className="mt-0.5 rounded-lg bg-gray-100 p-2">
                                    <Building2 className="h-4 w-4 text-[#1C1C1E]" />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-[#1C1C1E]">
                                        {item.label}
                                      </p>

                                      {tierUI ? (
                                        <span
                                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${tierUI.badgeClass}`}
                                        >
                                          {tierUI.label}
                                        </span>
                                      ) : null}

                                      {item.boosted ? (
                                        <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">
                                          {t.boost}
                                        </span>
                                      ) : null}
                                    </div>

                                    <p className="mt-1 text-sm text-gray-500">
                                      {item.sublabel}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
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
              label={t.listingType}
              value={jenisListingParam}
              onChange={(value) =>
                replaceSearchUrl({ jenisListing: value as "" | "dijual" | "disewa" })
              }
            >
              <option value="">{t.allListing}</option>
              <option value="dijual">{t.forSale}</option>
              <option value="disewa">{t.forRent}</option>
            </FilterSelect>

            <FilterSelect
              label={t.province}
              value={provinceParam}
              onChange={(value) =>
                replaceSearchUrl({ province: value, area: "" })
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
                label={t.area}
                value={areaParam}
                onChange={(value) => replaceSearchUrl({ area: value })}
              >
                <option value="">{t.allArea}</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label={t.bedroom}
                value={bedroomParam}
                onChange={(value) => replaceSearchUrl({ bedroom: value })}
              >
                <option value="">{t.allBedroom}</option>
                <option value="1">1+ {t.bedroomPlus}</option>
                <option value="2">2+ {t.bedroomPlus}</option>
                <option value="3">3+ {t.bedroomPlus}</option>
                <option value="4">4+ {t.bedroomPlus}</option>
                <option value="5">5+ {t.bedroomPlus}</option>
              </FilterSelect>

              <FilterSelect
                label={t.price}
                value={priceRangeParam}
                onChange={(value) => replaceSearchUrl({ priceRange: value })}
              >
                <option value="">{t.allPrice}</option>
                <option value="<100jt">&lt; 100 Juta</option>
                <option value="100jt-500jt">100 - 500 Juta</option>
                <option value="500jt-1m">500 Juta - 1 Miliar</option>
                <option value="1m-3m">1 - 3 Miliar</option>
                <option value=">3m">&gt; 3 Miliar</option>
              </FilterSelect>
            </div>
          )}

          <div className="mt-4 hidden xl:grid xl:grid-cols-6 xl:gap-3">
            <FilterSelect
              label={t.listingType}
              value={jenisListingParam}
              onChange={(value) =>
                replaceSearchUrl({ jenisListing: value as "" | "dijual" | "disewa" })
              }
            >
              <option value="">{t.allListing}</option>
              <option value="dijual">{t.forSale}</option>
              <option value="disewa">{t.forRent}</option>
            </FilterSelect>

            <FilterSelect
              label={t.province}
              value={provinceParam}
              onChange={(value) => replaceSearchUrl({ province: value, area: "" })}
            >
              <option value="">{t.allProvince}</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.area}
              value={areaParam}
              onChange={(value) => replaceSearchUrl({ area: value })}
            >
              <option value="">{t.allArea}</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label={t.bedroom}
              value={bedroomParam}
              onChange={(value) => replaceSearchUrl({ bedroom: value })}
            >
              <option value="">{t.allBedroom}</option>
              <option value="1">1+ {t.bedroomPlus}</option>
              <option value="2">2+ {t.bedroomPlus}</option>
              <option value="3">3+ {t.bedroomPlus}</option>
              <option value="4">4+ {t.bedroomPlus}</option>
              <option value="5">5+ {t.bedroomPlus}</option>
            </FilterSelect>

            <FilterSelect
              label={t.price}
              value={priceRangeParam}
              onChange={(value) => replaceSearchUrl({ priceRange: value })}
            >
              <option value="">{t.allPrice}</option>
              <option value="<100jt">&lt; 100 Juta</option>
              <option value="100jt-500jt">100 - 500 Juta</option>
              <option value="500jt-1m">500 Juta - 1 Miliar</option>
              <option value="1m-3m">1 - 3 Miliar</option>
              <option value=">3m">&gt; 3 Miliar</option>
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
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              {t.showing} {startItem}–{endItem} {t.from} {filteredResults.length}{" "}
              {t.properties}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-[#1C1C1E] transition hover:bg-gray-50 sm:w-auto"
              >
                {t.clearFilters}
              </button>
            )}
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
                const tierUI = getListingTierUI(item.listingTier, lang);

                return (
                  <Link
                    href={`/properti/${item.id}?back=${encodeURIComponent(currentSearchUrl)}`}
                    key={item.id}
                    className="block overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative">
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="h-[440px] w-full object-cover sm:h-[430px] lg:h-[500px]"
                      />

                      <div className="absolute bottom-3 right-3 rounded-full bg-[#1C1C1E]/85 px-3 py-1 text-[11px] font-semibold text-white sm:text-xs">
                        TETAMO
                      </div>
                    </div>

                    <div className="p-4 sm:p-5">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {item.verifiedListing && (
                          <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] text-green-700">
                            {t.verified}
                          </span>
                        )}

                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${
                            item.jenisListing === "dijual"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-yellow-200 bg-yellow-50 text-yellow-700"
                          }`}
                        >
                          {item.jenisListing === "dijual" ? t.forSale : t.forRent}
                        </span>

                        {tierUI ? (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] ${tierUI.badgeClass}`}
                          >
                            {tierUI.label}
                          </span>
                        ) : null}

                        {item.boosted ? (
                          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700">
                            {t.boost}
                          </span>
                        ) : null}
                      </div>

                      <p className="mb-2 text-sm text-gray-500">
                        {item.area}, {item.province}
                      </p>

                      <h3 className="mb-2 text-base font-semibold leading-snug text-[#1C1C1E] sm:text-lg">
                        {item.title}
                      </h3>

                      <p className="text-base font-bold text-[#1C1C1E] sm:text-lg">
                        {item.price}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <span>{item.size}</span>
                        <span>•</span>
                        <span>{item.bed}</span>
                        <span>•</span>
                        <span>{item.furnished}</span>
                      </div>

                      <p className="mt-3 text-sm text-gray-400">
                        {item.kodeListing} • {item.postedDate}
                      </p>
                    </div>
                  </Link>
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