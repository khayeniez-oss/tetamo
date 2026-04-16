"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { TetamoSelect } from "@/components/ui/TetamoSelect";
import { useVehicleDraftListing } from "./layout";

type PlanType = "basic" | "featured";

const inputBase =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

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

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b)
  );
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function buildAddressSuggestionVariants(params: {
  query: string;
  city: string;
  province: string;
  note: string;
}) {
  const query = params.query.trim();
  const city = params.city.trim();
  const province = params.province.trim();
  const note = params.note.trim();

  if (!query) return [];

  return uniqueStrings([
    query,
    city ? `${query}, ${city}` : "",
    city && province ? `${query}, ${city}, ${province}` : "",
    province ? `${query}, ${province}` : "",
    note ? `${query} - ${note}` : "",
    city && note ? `${query}, ${city} - ${note}` : "",
  ]);
}

export default function VehicleCreateLocationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { draft, setDraft, resetDraft } = useVehicleDraftListing();

  const currentPlan = useMemo<PlanType>(() => {
    const planFromUrl = searchParams.get("plan");
    return planFromUrl === "featured" ? "featured" : "basic";
  }, [searchParams]);

  const [listingType, setListingType] = useState(draft?.listingType ?? "");
  const [vehicleType, setVehicleType] = useState(draft?.vehicleType ?? "");
  const [kode, setKode] = useState(draft?.kode ?? "");
  const [postedDate, setPostedDate] = useState(
    (draft?.postedDate ?? "").slice(0, 10)
  );
  const [address, setAddress] = useState(draft?.address ?? "");
  const [province, setProvince] = useState(draft?.province ?? "");
  const [city, setCity] = useState(draft?.city ?? "");
  const [note, setNote] = useState(draft?.note ?? "");

  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);

  const addressBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraft((prev: any) => ({
      ...(prev || {}),
      mode: "create",
      source: "owner",
      plan: currentPlan,
    }));
  }, [currentPlan, setDraft]);

  useEffect(() => {
    setListingType(draft?.listingType ?? "");
    setVehicleType(draft?.vehicleType ?? "");
    setKode(draft?.kode ?? "");
    setPostedDate((draft?.postedDate ?? "").slice(0, 10));
    setAddress(draft?.address ?? "");
    setProvince(draft?.province ?? "");
    setCity(draft?.city ?? "");
    setNote(draft?.note ?? "");
  }, [
    draft?.listingType,
    draft?.vehicleType,
    draft?.kode,
    draft?.postedDate,
    draft?.address,
    draft?.province,
    draft?.city,
    draft?.note,
  ]);

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
    () => uniqueStrings(DEFAULT_PROVINCES),
    []
  );

  const cityOptions = useMemo(() => {
    if (!province) return [];
    return uniqueStrings(DEFAULT_CITIES_BY_PROVINCE[province] ?? []);
  }, [province]);

  const rawAddressSuggestions = useMemo(() => {
    return buildAddressSuggestionVariants({
      query: address,
      city,
      province,
      note,
    });
  }, [address, city, province, note]);

  const filteredAddressSuggestions = useMemo(() => {
    const query = normalizeSearch(address);

    if (query.length < 3) return [];

    return rawAddressSuggestions
      .filter((item) => normalizeSearch(item).includes(query))
      .filter((item) => normalizeSearch(item) !== query)
      .slice(0, 6);
  }, [address, rawAddressSuggestions]);

  useEffect(() => {
    setHighlightedAddressIndex(-1);
  }, [filteredAddressSuggestions]);

  const canNext = useMemo(() => {
    return (
      listingType.trim().length > 0 &&
      vehicleType.trim().length > 0 &&
      kode.trim().length > 0 &&
      postedDate.trim().length > 0 &&
      address.trim().length > 0 &&
      province.trim().length > 0 &&
      city.trim().length > 0
    );
  }, [listingType, vehicleType, kode, postedDate, address, province, city]);

  function chooseAddressSuggestion(value: string) {
    setAddress(value);
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
        chooseAddressSuggestion(filteredAddressSuggestions[highlightedAddressIndex]);
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

    setDraft((prev: any) => ({
      ...(prev || {}),
      mode: "create",
      source: "owner",
      plan: currentPlan,
      listingType,
      vehicleType,
      kode,
      postedDate,
      address,
      province,
      city,
      note,
    }));

    router.push(`/vehicles/create/detail?plan=${currentPlan}`);
  }

  function handleBack() {
    resetDraft();
    router.push("/vehicles/package");
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-[#1C1C1E] sm:text-2xl lg:text-3xl">
                {lang === "id" ? "Lokasi Kendaraan" : "Vehicle Location"}
              </h1>

              <span
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold sm:text-[11px]",
                  currentPlan === "featured"
                    ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-600"
                    : "border-gray-300 bg-white text-gray-700",
                ].join(" ")}
              >
                {currentPlan === "featured" ? "FEATURED" : "BASIC"}
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {lang === "id"
                ? "(Step 1) Pilih jenis listing, pilih car atau motor, lalu isi lokasi."
                : "(Step 1) Choose the listing type, choose car or motor, then fill in the location."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1C1C1E] hover:opacity-80 sm:mt-1"
          >
            ← {lang === "id" ? "Kembali" : "Back"}
          </button>
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
                ? "Pilih salah satu: Dijual / Disewa."
                : "Choose one: For Sale / For Rent."}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#1C1C1E]">
            {lang === "id" ? "Jenis Kendaraan" : "Vehicle Type"}{" "}
            <span className="text-red-600">*</span>
          </label>

          <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-1 sm:inline-flex sm:gap-0">
            {[
              { key: "car", label: lang === "id" ? "Car / Mobil" : "Car" },
              { key: "motor", label: lang === "id" ? "Motor" : "Motorbike" },
            ].map((item) => {
              const active = vehicleType === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setVehicleType(item.key)}
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

          {!vehicleType && (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              {lang === "id"
                ? "Pilih salah satu: Car / Motor."
                : "Choose one: Car / Motorbike."}
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
              value={kode}
              placeholder={
                lang === "id" ? "Contoh: VEH-0001" : "Example: VEH-0001"
              }
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              onChange={(e) => setKode(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1C1C1E]">
              {lang === "id" ? "Tanggal Tayang" : "Posted Date"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={postedDate}
              className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#1C1C1E]"
              onChange={(e) => setPostedDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="p-4 sm:p-6">
            <div ref={addressBoxRef} className="relative">
              <label className="text-sm font-semibold text-[#1C1C1E]">
                {lang === "id" ? "Alamat / Lokasi Kendaraan" : "Vehicle Address / Location"}{" "}
                <span className="text-red-600">*</span>
              </label>

              <input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setIsAddressDropdownOpen(true);
                }}
                onFocus={() => {
                  if (filteredAddressSuggestions.length > 0) {
                    setIsAddressDropdownOpen(true);
                  }
                }}
                onKeyDown={handleAddressKeyDown}
                placeholder={
                  lang === "id"
                    ? "Contoh: Jalan Sunset Road No. 25, Kuta"
                    : "Example: Jalan Sunset Road No. 25, Kuta"
                }
                className={inputBase}
              />

              {filteredAddressSuggestions.length > 0 && isAddressDropdownOpen && (
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
                  list="vehicle-city-area-suggestions"
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

                <datalist id="vehicle-city-area-suggestions">
                  {cityOptions.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
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
                    ? "Contoh: dekat showroom, dekat tol, area pusat kota..."
                    : "Example: near showroom, toll access, city center area..."
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
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}