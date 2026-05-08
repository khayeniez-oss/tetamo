"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { TetamoSelect } from "@/components/ui/TetamoSelect";

type DraftState = {
  mode?: string;
  source?: string;
  plan?: string;
  listingType?: string;
  address?: string;
  province?: string;
  city?: string;
  housingName?: string;
  customHousing?: string;
  note?: string;
  kode?: string;
  postedDate?: string;
  [key: string]: unknown;
};

type DraftUpdater = (prev: DraftState | null | undefined) => DraftState;

type Props = {
  draft: DraftState | null | undefined;
  setDraft: (fn: DraftUpdater) => void;
  onNext: () => void;
  onReset?: () => void;

  inputBase?: string;
  provinces?: string[];
  citiesByProvince?: Record<string, string[]>;
  housingSuggestions?: string[];
};

type GoogleSuggestionText = {
  toString: () => string;
};

type GooglePlacePrediction = {
  text?: string | GoogleSuggestionText;
  mainText?: string | GoogleSuggestionText;
  secondaryText?: string | GoogleSuggestionText;
};

type GoogleQueryPrediction = {
  text?: string | GoogleSuggestionText;
};

type GoogleAutocompleteSuggestionItem = {
  placePrediction?: GooglePlacePrediction;
  queryPrediction?: GoogleQueryPrediction;
};

type GoogleAutocompleteRequestNew = {
  input: string;
  includedRegionCodes?: string[];
  sessionToken?: unknown;
};

type GoogleAutocompleteSuggestionApi = {
  fetchAutocompleteSuggestions: (
    request: GoogleAutocompleteRequestNew
  ) => Promise<{
    suggestions?: GoogleAutocompleteSuggestionItem[];
  }>;
};

type GooglePlacesLibrary = {
  AutocompleteSuggestion?: GoogleAutocompleteSuggestionApi;
  AutocompleteSessionToken?: new () => unknown;
};

type GoogleMapsNamespace = {
  places?: unknown;
  importLibrary?: (libraryName: "places") => Promise<GooglePlacesLibrary>;
};

type GoogleNamespace = {
  maps?: GoogleMapsNamespace;
};

declare global {
  interface Window {
    google?: GoogleNamespace;
    __tetamoGoogleMapsPlacesPromise?: Promise<void>;
  }
}

const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const DEFAULT_PROVINCES = [
  "Aceh",
  "Bali",
  "Banten",
  "Bengkulu",
  "DI Yogyakarta",
  "DKI Jakarta",
  "Gorontalo",
  "Jambi",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Kalimantan Barat",
  "Kalimantan Selatan",
  "Kalimantan Tengah",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Kepulauan Bangka Belitung",
  "Kepulauan Riau",
  "Lampung",
  "Maluku",
  "Maluku Utara",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Papua",
  "Papua Barat",
  "Riau",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tengah",
  "Sulawesi Tenggara",
  "Sulawesi Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Sumatera Utara",
];

const DEFAULT_CITIES_BY_PROVINCE: Record<string, string[]> = {
  Bali: [
    "Badung",
    "Bangli",
    "Buleleng",
    "Denpasar",
    "Gianyar",
    "Jembrana",
    "Karangasem",
    "Klungkung",
    "Tabanan",
  ],
  "DKI Jakarta": [
    "Jakarta Barat",
    "Jakarta Pusat",
    "Jakarta Selatan",
    "Jakarta Timur",
    "Jakarta Utara",
    "Kepulauan Seribu",
  ],
  "Jawa Barat": [
    "Bandung",
    "Bandung Barat",
    "Bekasi",
    "Bogor",
    "Cimahi",
    "Cirebon",
    "Depok",
    "Garut",
    "Karawang",
    "Sukabumi",
    "Tasikmalaya",
  ],
  "Jawa Timur": [
    "Batu",
    "Blitar",
    "Gresik",
    "Jember",
    "Kediri",
    "Lamongan",
    "Madiun",
    "Malang",
    "Mojokerto",
    "Pasuruan",
    "Sidoarjo",
    "Surabaya",
  ],
  Banten: [
    "Cilegon",
    "Lebak",
    "Pandeglang",
    "Serang",
    "Tangerang",
    "Tangerang Selatan",
  ],
  "DI Yogyakarta": [
    "Bantul",
    "Gunungkidul",
    "Kulon Progo",
    "Sleman",
    "Yogyakarta",
  ],
};

const DEFAULT_HOUSING_SUGGESTIONS = [
  "Alam Sutera",
  "BSD City",
  "CitraGarden",
  "Gading Serpong",
  "Pantai Indah Kapuk",
  "Setiabudi",
  "Canggu",
].sort((a, b) => a.localeCompare(b));

const PROVINCE_ALIASES: Record<string, string[]> = {
  "DKI Jakarta": ["jakarta"],
  "DI Yogyakarta": ["yogyakarta", "jogja", "jogjakarta"],
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  );
}

function uniqueStringsInOrder(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const cleanValue = value.trim();
    const key = cleanValue.toLowerCase();

    if (!cleanValue || seen.has(key)) return;

    seen.add(key);
    result.push(cleanValue);
  });

  return result;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function toSuggestionText(value: unknown) {
  if (typeof value === "string") return value;

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof (value as GoogleSuggestionText).toString === "function"
  ) {
    return (value as GoogleSuggestionText).toString();
  }

  return "";
}

function buildAddressSuggestionVariants(params: {
  query: string;
  city: string;
  province: string;
  housingName: string;
  customHousing: string;
  note: string;
}) {
  const query = params.query.trim();
  const city = params.city.trim();
  const province = params.province.trim();
  const note = params.note.trim();

  const housing =
    params.housingName === "__OTHER__"
      ? params.customHousing.trim()
      : params.housingName.trim();

  if (!query) return [];

  return uniqueStrings([
    query,
    city ? `${query}, ${city}` : "",
    city && province ? `${query}, ${city}, ${province}` : "",
    housing ? `${query}, ${housing}` : "",
    housing && city ? `${query}, ${housing}, ${city}` : "",
    housing && city && province
      ? `${query}, ${housing}, ${city}, ${province}`
      : "",
    province ? `${query}, ${province}` : "",
    note ? `${query} - ${note}` : "",
    city && note ? `${query}, ${city} - ${note}` : "",
    housing && note ? `${query}, ${housing} - ${note}` : "",
  ]);
}

function inferProvinceFromAddress(addressText: string, provinces: string[]) {
  const lowerAddress = normalizeSearch(addressText);

  return (
    provinces.find((province) => {
      const lowerProvince = normalizeSearch(province);
      const aliases = PROVINCE_ALIASES[province] ?? [];

      return (
        lowerAddress.includes(lowerProvince) ||
        aliases.some((alias) => lowerAddress.includes(alias))
      );
    }) ?? ""
  );
}

function inferCityFromAddress(
  addressText: string,
  province: string,
  citiesByProvince: Record<string, string[]>
) {
  const lowerAddress = normalizeSearch(addressText);

  const cityCandidates = province
    ? citiesByProvince[province] ?? []
    : Object.values(citiesByProvince).flat();

  return (
    uniqueStrings(cityCandidates).find((city) =>
      lowerAddress.includes(normalizeSearch(city))
    ) ?? ""
  );
}

function loadGoogleMapsPlaces() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is not available."));
  }

  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error("Missing Google Maps API key."));
  }

  if (window.__tetamoGoogleMapsPlacesPromise) {
    return window.__tetamoGoogleMapsPlacesPromise;
  }

  window.__tetamoGoogleMapsPlacesPromise = new Promise<void>(
    (resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-tetamo-google-maps="true"]'
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () =>
          reject(new Error("Failed to load Google Maps."))
        );
        return;
      }

      const script = document.createElement("script");

      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        GOOGLE_MAPS_API_KEY
      )}&libraries=places&language=id&region=ID&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.tetamoGoogleMaps = "true";

      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps."));

      document.head.appendChild(script);
    }
  );

  return window.__tetamoGoogleMapsPlacesPromise;
}

async function getGooglePlacePredictionsNew(
  request: Omit<GoogleAutocompleteRequestNew, "sessionToken">
): Promise<string[]> {
  try {
    await loadGoogleMapsPlaces();

    const placesLibrary = await window.google?.maps?.importLibrary?.("places");
    const AutocompleteSuggestion = placesLibrary?.AutocompleteSuggestion;
    const AutocompleteSessionToken = placesLibrary?.AutocompleteSessionToken;

    if (!AutocompleteSuggestion) return [];

    const sessionToken = AutocompleteSessionToken
      ? new AutocompleteSessionToken()
      : undefined;

    const response =
      await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        ...request,
        sessionToken,
      });

    return uniqueStringsInOrder(
      (response.suggestions ?? [])
        .map((suggestion) => {
          const placeText = toSuggestionText(
            suggestion.placePrediction?.text
          );

          if (placeText) return placeText;

          const mainText = toSuggestionText(
            suggestion.placePrediction?.mainText
          );
          const secondaryText = toSuggestionText(
            suggestion.placePrediction?.secondaryText
          );

          if (mainText && secondaryText) return `${mainText}, ${secondaryText}`;
          if (mainText) return mainText;

          return toSuggestionText(suggestion.queryPrediction?.text);
        })
        .filter(Boolean)
    );
  } catch {
    return [];
  }
}

function getPlanBadgeClass(plan?: string) {
  if (plan === "featured") {
    return "border-yellow-500/40 bg-yellow-500/10 text-yellow-600";
  }

  if (plan === "priority") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-700";
  }

  if (plan === "basic") {
    return "border-gray-300 bg-white text-gray-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-400";
}

function getPlanBadgeLabel(plan?: string, lang?: string) {
  if (plan === "featured") return "FEATURED";
  if (plan === "priority") return "PRIORITY";
  if (plan === "basic") return "BASIC";

  return lang === "id" ? "MEMUAT..." : "LOADING...";
}

export default function ListingIklan({
  draft,
  setDraft,
  onNext,
  onReset,
  inputBase = "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10",
  provinces = [],
  citiesByProvince = {},
  housingSuggestions = [],
}: Props) {
  const { lang } = useLanguage();

  const mode = draft?.mode === "edit" ? "edit" : "create";

  const [listingType, setListingType] = useState(
    () => draft?.listingType ?? ""
  );
  const [address, setAddress] = useState(() => draft?.address ?? "");
  const [province, setProvince] = useState(() => draft?.province ?? "");
  const [city, setCity] = useState(() => draft?.city ?? "");
  const [housingName, setHousingName] = useState(
    () => draft?.housingName ?? ""
  );
  const [customHousing, setCustomHousing] = useState(
    () => draft?.customHousing ?? ""
  );
  const [note, setNote] = useState(() => draft?.note ?? "");

  const [googleAddressSuggestions, setGoogleAddressSuggestions] = useState<
    string[]
  >([]);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);

  const addressBoxRef = useRef<HTMLDivElement | null>(null);
  const addressRequestIdRef = useRef(0);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!addressBoxRef.current) return;

      if (!addressBoxRef.current.contains(event.target as Node)) {
        setIsAddressDropdownOpen(false);
        setHighlightedAddressIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const finalProvinces = useMemo(
    () => uniqueStrings(provinces.length > 0 ? provinces : DEFAULT_PROVINCES),
    [provinces]
  );

  const finalCitiesByProvince = useMemo(
    () =>
      Object.keys(citiesByProvince).length > 0
        ? citiesByProvince
        : DEFAULT_CITIES_BY_PROVINCE,
    [citiesByProvince]
  );

  const finalHousingSuggestions = useMemo(
    () =>
      uniqueStrings(
        housingSuggestions.length > 0
          ? housingSuggestions
          : DEFAULT_HOUSING_SUGGESTIONS
      ),
    [housingSuggestions]
  );

  const cityOptions = useMemo(() => {
    if (!province) return [];
    return uniqueStrings(finalCitiesByProvince[province] ?? []);
  }, [province, finalCitiesByProvince]);

  const cityAreaSuggestions = useMemo(() => {
    return uniqueStrings([
      ...cityOptions,
      ...(housingName && housingName !== "__OTHER__" ? [housingName] : []),
      ...(customHousing ? [customHousing] : []),
      ...(city ? [city] : []),
    ]);
  }, [cityOptions, housingName, customHousing, city]);

  const rawAddressSuggestions = useMemo(() => {
    return buildAddressSuggestionVariants({
      query: address,
      city,
      province,
      housingName,
      customHousing,
      note,
    });
  }, [address, city, province, housingName, customHousing, note]);

  useEffect(() => {
    const query = address.trim();

    addressRequestIdRef.current += 1;
    const requestId = addressRequestIdRef.current;

    if (!GOOGLE_MAPS_API_KEY || query.length < 3) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      const locationText = uniqueStringsInOrder([city, province]).join(", ");
      const input = locationText ? `${query}, ${locationText}` : query;

      const predictions = await getGooglePlacePredictionsNew({
        input,
        includedRegionCodes: ["id"],
      });

      if (requestId !== addressRequestIdRef.current) return;

      setGoogleAddressSuggestions(predictions);
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [address, city, province]);

  const filteredAddressSuggestions = useMemo(() => {
    const query = normalizeSearch(address);

    if (query.length < 3) return [];

    const googleSuggestions = googleAddressSuggestions.filter(
      (item) => normalizeSearch(item) !== query
    );

    const localSuggestions = rawAddressSuggestions
      .filter((item) => normalizeSearch(item).includes(query))
      .filter((item) => normalizeSearch(item) !== query);

    return uniqueStringsInOrder([
      ...googleSuggestions,
      ...localSuggestions,
    ]).slice(0, 6);
  }, [address, googleAddressSuggestions, rawAddressSuggestions]);

  const canNext = useMemo(() => {
    return (
      listingType.trim().length > 0 &&
      address.trim().length > 0 &&
      province.trim().length > 0 &&
      city.trim().length > 0 &&
      (housingName === "__OTHER__" ? customHousing.trim().length > 0 : true)
    );
  }, [listingType, address, province, city, housingName, customHousing]);

  function chooseAddressSuggestion(value: string) {
    const inferredProvince = inferProvinceFromAddress(value, finalProvinces);
    const nextProvince = inferredProvince || province;
    const inferredCity = inferCityFromAddress(
      value,
      nextProvince,
      finalCitiesByProvince
    );

    setAddress(value);

    if (inferredProvince) {
      setProvince(inferredProvince);
    }

    if (inferredCity) {
      setCity(inferredCity);
    }

    setIsAddressDropdownOpen(false);
    setHighlightedAddressIndex(-1);
  }

  function handleAddressKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!filteredAddressSuggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsAddressDropdownOpen(true);
      setHighlightedAddressIndex((prev) =>
        prev < filteredAddressSuggestions.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsAddressDropdownOpen(true);
      setHighlightedAddressIndex((prev) =>
        prev > 0 ? prev - 1 : filteredAddressSuggestions.length - 1
      );
      return;
    }

    if (e.key === "Enter") {
      if (!isAddressDropdownOpen) return;

      e.preventDefault();

      if (
        highlightedAddressIndex >= 0 &&
        highlightedAddressIndex < filteredAddressSuggestions.length
      ) {
        chooseAddressSuggestion(
          filteredAddressSuggestions[highlightedAddressIndex]
        );
      } else {
        chooseAddressSuggestion(filteredAddressSuggestions[0]);
      }

      return;
    }

    if (e.key === "Escape") {
      setIsAddressDropdownOpen(false);
      setHighlightedAddressIndex(-1);
    }
  }

  function handleNext() {
    if (!canNext) return;

    setDraft((prev) => ({
      ...(prev || {}),
      mode,
      listingType,
      address,
      province,
      city,
      housingName,
      customHousing,
      note,
    }));

    onNext();
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-[#1C1C1E] sm:text-2xl lg:text-3xl">
                {lang === "id" ? "Lokasi Properti" : "Property Location"}
              </h1>

              {draft?.mode !== "edit" && draft?.source !== "agent" && (
                <span
                  className={[
                    "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold sm:text-[11px]",
                    getPlanBadgeClass(draft?.plan),
                  ].join(" ")}
                >
                  {getPlanBadgeLabel(draft?.plan, lang)}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {lang === "id"
                ? "(Step 1) Isi lokasi dulu, lalu lanjut ke detail dan foto."
                : "(Step 1) Fill in the location first, then continue to details and photos."}
            </p>
          </div>

          {onReset ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:opacity-80 sm:mt-1"
            >
              ← {lang === "id" ? "Kembali" : "Back"}
            </button>
          ) : null}
        </div>

        <div className="h-5 sm:h-7 md:h-8" />

        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#1C1C1E]">
            {lang === "id" ? "Jenis Iklan" : "Listing Type"}{" "}
            <span className="text-red-600">*</span>
          </label>

          <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-1 sm:inline-flex sm:gap-0">
            {[
              { key: "dijual", label: lang === "id" ? "Dijual" : "For Sale" },
              { key: "disewa", label: lang === "id" ? "Disewa" : "For Rent" },
              { key: "lelang", label: lang === "id" ? "Lelang" : "Auction" },
            ].map((item) => {
              const active = listingType === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setListingType(item.key)}
                  className={[
                    "rounded-2xl px-4 py-2 text-sm font-semibold transition sm:px-5",
                    active
                      ? "bg-[#1C1C1E] text-white"
                      : "text-gray-700 hover:bg-gray-50",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {!listingType && (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              {lang === "id"
                ? "Pilih salah satu: Dijual / Disewa / Lelang."
                : "Choose one: For Sale / For Rent / Auction."}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-[#1C1C1E]">
              {lang === "id" ? "Kode" : "Code"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={draft?.kode ?? ""}
              placeholder={
                lang === "id" ? "Contoh: TMO-0001" : "Example: TMO-0001"
              }
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              onChange={(e) =>
                setDraft((prev) => ({
                  ...(prev || {}),
                  kode: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1C1C1E]">
              {lang === "id" ? "Tanggal Tayang" : "Posted Date"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={(draft?.postedDate ?? "").slice(0, 10)}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              onChange={(e) =>
                setDraft((prev) => ({
                  ...(prev || {}),
                  postedDate: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="p-4 sm:p-6">
            <div ref={addressBoxRef} className="relative">
              <label className="text-sm font-semibold text-[#1C1C1E]">
                {lang === "id" ? "Alamat Properti" : "Property Address"}{" "}
                <span className="text-red-600">*</span>
              </label>

              <input
                autoComplete="street-address"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setIsAddressDropdownOpen(true);
                  setHighlightedAddressIndex(-1);
                }}
                onFocus={() => {
                  if (filteredAddressSuggestions.length > 0) {
                    setIsAddressDropdownOpen(true);
                  }
                }}
                onKeyDown={handleAddressKeyDown}
                placeholder={
                  lang === "id"
                    ? "Contoh: 27A, Jalan Pantai Batu Bolong, Canggu"
                    : "Example: 27A, Jalan Pantai Batu Bolong, Canggu"
                }
                className={inputBase}
              />

              {filteredAddressSuggestions.length > 0 &&
                isAddressDropdownOpen && (
                  <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                    <div className="max-h-72 overflow-y-auto py-2">
                      {filteredAddressSuggestions.map((item, index) => {
                        const active = index === highlightedAddressIndex;

                        return (
                          <button
                            key={`${item}-${index}`}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              chooseAddressSuggestion(item);
                            }}
                            className={[
                              "block w-full px-4 py-3 text-left text-sm transition",
                              active
                                ? "bg-[#1C1C1E] text-white"
                                : "text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              <p className="mt-2 text-xs leading-5 text-gray-500">
                {lang === "id"
                  ? "Ketik alamat, lalu pilih saran yang muncul."
                  : "Type the address, then choose one of the suggestions."}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Provinsi" : "Province"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={province}
                    placeholder={
                      lang === "id" ? "Pilih provinsi" : "Select province"
                    }
                    options={finalProvinces.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(value) => {
                      setProvince(value);
                      setCity("");
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Kota / Area" : "City / Area"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <input
                  list="city-area-suggestions"
                  autoComplete="address-level2"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={
                    province
                      ? lang === "id"
                        ? "Masukkan kota / area"
                        : "Enter city / area"
                      : lang === "id"
                      ? "Pilih provinsi dulu"
                      : "Select province first"
                  }
                  className={inputBase}
                />

                <datalist id="city-area-suggestions">
                  {cityAreaSuggestions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold text-[#1C1C1E]">
                {lang === "id"
                  ? "Nama Apartemen / Perumahan / Cluster"
                  : "Apartment / Housing / Cluster Name"}{" "}
                <span className="text-gray-400">
                  {lang === "id" ? "(Opsional)" : "(Optional)"}
                </span>
              </label>

              <div className="mt-2">
                <TetamoSelect
                  value={housingName}
                  placeholder={
                    lang === "id" ? "Pilih (opsional)" : "Select (optional)"
                  }
                  options={[
                    ...finalHousingSuggestions.map((item) => ({
                      value: item,
                      label: item,
                    })),
                    {
                      value: "__OTHER__",
                      label:
                        lang === "id"
                          ? "Lainnya (ketik manual)"
                          : "Other (type manually)",
                    },
                  ]}
                  onChange={(value) => {
                    setHousingName(value);
                    if (value !== "__OTHER__") setCustomHousing("");
                  }}
                />
              </div>

              {housingName === "__OTHER__" && (
                <div className="mt-4">
                  <label className="text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Ketik nama" : "Type name"}
                  </label>
                  <input
                    value={customHousing}
                    onChange={(e) => setCustomHousing(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Contoh: Cluster Melati / The Mansion / dll"
                        : "Example: Cluster Melati / The Mansion / etc"
                    }
                    className={inputBase}
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="text-sm font-semibold text-[#1C1C1E]">
                {lang === "id" ? "Catatan Lokasi" : "Location Notes"}{" "}
                <span className="text-gray-400">
                  {lang === "id" ? "(Opsional)" : "(Optional)"}
                </span>
              </label>

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  lang === "id"
                    ? "Contoh: dekat MRT, akses tol, landmark, patokan..."
                    : "Example: near MRT, toll access, landmark, directions..."
                }
                className={inputBase}
              />
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={handleNext}
                disabled={!canNext}
                className={[
                  "w-full rounded-2xl px-6 py-3.5 text-center text-sm font-semibold transition",
                  canNext
                    ? "bg-[#1C1C1E] text-white hover:opacity-90"
                    : "cursor-not-allowed bg-gray-200 text-gray-500",
                ].join(" ")}
              >
                {lang === "id" ? "Simpan & Lanjutkan" : "Save & Continue"}
              </button>

              {onReset ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="mt-4 text-sm text-gray-500 hover:text-black"
                >
                  {lang === "id" ? "Reset" : "Reset"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}