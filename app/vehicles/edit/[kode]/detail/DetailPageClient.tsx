"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { TetamoSelect } from "@/components/ui/TetamoSelect";
import { useVehicleEditDraftListing } from "../layout";

type PlanType = "basic" | "featured";

const inputBase =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

const SELECT_OTHER = "__OTHER__";

const CAR_CATALOG: Record<string, Record<string, string[]>> = {
  Toyota: {
    Fortuner: ["VRZ", "GR Sport", "G"],
    Avanza: ["E", "G"],
    Raize: ["G", "GR Sport"],
    Alphard: ["X", "G", "Executive Lounge"],
  },
  Honda: {
    "BR-V": ["S", "E", "Prestige"],
    "HR-V": ["S", "E", "SE"],
    "CR-V": ["Turbo", "RS e:HEV"],
    Brio: ["Satya S", "Satya E", "RS"],
  },
  Mitsubishi: {
    "Pajero Sport": ["Exceed", "Dakar", "Dakar Ultimate"],
    Xpander: ["GLS", "Exceed", "Ultimate"],
    "Xpander Cross": ["MT", "CVT"],
  },
  Suzuki: {
    XL7: ["Zeta", "Beta", "Alpha"],
    Ertiga: ["GA", "GL", "GX"],
    Jimny: ["MT", "AT"],
  },
  BMW: {
    X1: ["sDrive18i", "xLine"],
    X3: ["xDrive30i", "M Sport"],
    "3 Series": ["320i", "330i M Sport"],
  },
  "Mercedes-Benz": {
    "C-Class": ["C200", "C300 AMG Line"],
    "E-Class": ["E200", "E300 AMG Line"],
    GLC: ["GLC 200", "GLC 300 AMG Line"],
  },
};

const MOTOR_CATALOG: Record<string, Record<string, string[]>> = {
  Yamaha: {
    XMAX: ["Standard", "Connected", "Tech Max"],
    NMAX: ["Neo", "Turbo", "Standard"],
    Aerox: ["Standard", "Connected"],
    "MT-25": ["Standard"],
  },
  Honda: {
    "ADV 160": ["CBS", "ABS"],
    "PCX 160": ["CBS", "ABS", "RoadSync"],
    "Vario 160": ["CBS", "ABS"],
    CBR250RR: ["Standard", "SP QS"],
  },
  Kawasaki: {
    "Ninja ZX-25R": ["Standard", "SE", "RR"],
    "KLX 150": ["Standard", "BF", "Supermoto"],
    W175: ["Standard", "Cafe"],
  },
  Vespa: {
    Primavera: ["Standard", "S"],
    Sprint: ["Standard", "S"],
    GTS: ["Classic", "Super Sport"],
  },
  Suzuki: {
    "V-Strom 250SX": ["Standard"],
    GSX150: ["Bandit", "S"],
    Nex: ["Standard"],
  },
  KTM: {
    "Duke 250": ["Standard"],
    "Duke 390": ["Standard"],
    RC390: ["Standard"],
  },
  "Royal Enfield": {
    Himalayan: ["Standard", "Adventure"],
    Classic350: ["Standard", "Chrome"],
  },
};

const CAR_BODY_TYPES = [
  "SUV",
  "Sedan",
  "Hatchback",
  "MPV",
  "Pickup",
  "Coupe",
  "Convertible",
  "Van",
  "Wagon",
];

const MOTOR_BODY_TYPES = [
  "Scooter",
  "Sport",
  "Touring",
  "Naked",
  "Matic",
  "Cruiser",
  "Trail",
  "Cub",
];

const TRANSMISSION_OPTIONS = ["Automatic", "Manual", "CVT"];
const FUEL_OPTIONS = ["Petrol", "Diesel", "Electric", "Hybrid"];
const CONDITION_OPTIONS = [
  "Excellent",
  "Very Good",
  "Good",
  "Needs Minor Repair",
];

const CAR_ENGINE_OPTIONS = [
  "1.0L",
  "1.2L",
  "1.3L",
  "1.5L",
  "1.8L",
  "2.0L",
  "2.4L",
  "3.0L",
  "Electric",
];

const MOTOR_ENGINE_OPTIONS = [
  "110cc",
  "125cc",
  "150cc",
  "155cc",
  "160cc",
  "250cc",
  "300cc",
  "500cc",
  "Electric",
];

const MILEAGE_OPTIONS = [
  "0 km",
  "5,000 km",
  "10,000 km",
  "20,000 km",
  "30,000 km",
  "50,000 km",
  "80,000 km",
  "100,000 km+",
];

const SEAT_OPTIONS = ["2", "4", "5", "6", "7", "8", "9+"];

function withOtherOption(options: string[], otherLabel: string) {
  return [
    ...options.map((item) => ({ value: item, label: item })),
    { value: SELECT_OTHER, label: otherLabel },
  ];
}

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: currentYear - 1989 }, (_, index) =>
    String(currentYear - index)
  );
}

function isPreset(value: string, options: string[]) {
  return Boolean(value) && options.includes(value);
}

export default function DetailPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { draft, setDraft, kode } = useVehicleEditDraftListing();

  const currentPlan = useMemo<PlanType>(() => {
    const planFromUrl = searchParams.get("plan");
    if (planFromUrl === "featured") return "featured";

    const planFromDraft = String(draft?.plan || "").toLowerCase();
    return planFromDraft === "featured" ? "featured" : "basic";
  }, [searchParams, draft?.plan]);

  const vehicleType = String(draft?.vehicleType || "").trim().toLowerCase();
  const listingCode = String(draft?.kode || kode || "").trim();

  const catalog = vehicleType === "motor" ? MOTOR_CATALOG : CAR_CATALOG;
  const brandPresetOptions = Object.keys(catalog).sort((a, b) =>
    a.localeCompare(b)
  );

  const initialBrandSelection = isPreset(
    String(draft?.brand || ""),
    brandPresetOptions
  )
    ? String(draft?.brand || "")
    : String(draft?.brand || "")
      ? SELECT_OTHER
      : "";

  const initialCustomBrand =
    initialBrandSelection === SELECT_OTHER ? String(draft?.brand || "") : "";

  const initialBrandValue =
    initialBrandSelection === SELECT_OTHER ? "" : initialBrandSelection;

  const modelPresetOptions =
    initialBrandValue && catalog[initialBrandValue]
      ? Object.keys(catalog[initialBrandValue]).sort((a, b) =>
          a.localeCompare(b)
        )
      : [];

  const initialModelSelection = isPreset(
    String(draft?.model || ""),
    modelPresetOptions
  )
    ? String(draft?.model || "")
    : String(draft?.model || "")
      ? SELECT_OTHER
      : "";

  const initialCustomModel =
    initialModelSelection === SELECT_OTHER ? String(draft?.model || "") : "";

  const initialModelValue =
    initialModelSelection === SELECT_OTHER ? "" : initialModelSelection;

  const variantPresetOptions =
    initialBrandValue &&
    initialModelValue &&
    catalog[initialBrandValue]?.[initialModelValue]
      ? [...catalog[initialBrandValue][initialModelValue]].sort((a, b) =>
          a.localeCompare(b)
        )
      : [];

  const initialVariantSelection = isPreset(
    String(draft?.variant || ""),
    variantPresetOptions
  )
    ? String(draft?.variant || "")
    : String(draft?.variant || "")
      ? SELECT_OTHER
      : "";

  const initialCustomVariant =
    initialVariantSelection === SELECT_OTHER ? String(draft?.variant || "") : "";

  const yearOptions = buildYearOptions();
  const initialYearSelection = isPreset(String(draft?.year || ""), yearOptions)
    ? String(draft?.year || "")
    : "";

  const enginePresetOptions =
    vehicleType === "motor" ? MOTOR_ENGINE_OPTIONS : CAR_ENGINE_OPTIONS;

  const initialEngineSelection = isPreset(
    String(draft?.engineCc || ""),
    enginePresetOptions
  )
    ? String(draft?.engineCc || "")
    : String(draft?.engineCc || "")
      ? SELECT_OTHER
      : "";

  const initialCustomEngine =
    initialEngineSelection === SELECT_OTHER ? String(draft?.engineCc || "") : "";

  const initialMileageSelection = isPreset(
    String(draft?.mileage || ""),
    MILEAGE_OPTIONS
  )
    ? String(draft?.mileage || "")
    : String(draft?.mileage || "")
      ? SELECT_OTHER
      : "";

  const initialCustomMileage =
    initialMileageSelection === SELECT_OTHER ? String(draft?.mileage || "") : "";

  const initialSeatsSelection = isPreset(
    String(draft?.seats || ""),
    SEAT_OPTIONS
  )
    ? String(draft?.seats || "")
    : "";

  const [brandSelection, setBrandSelection] = useState(initialBrandSelection);
  const [customBrand, setCustomBrand] = useState(initialCustomBrand);

  const [modelSelection, setModelSelection] = useState(initialModelSelection);
  const [customModel, setCustomModel] = useState(initialCustomModel);

  const [variantSelection, setVariantSelection] = useState(initialVariantSelection);
  const [customVariant, setCustomVariant] = useState(initialCustomVariant);

  const [year, setYear] = useState(initialYearSelection);
  const [price, setPrice] = useState(String(draft?.price ?? ""));
  const [transmission, setTransmission] = useState(String(draft?.transmission ?? ""));
  const [fuel, setFuel] = useState(String(draft?.fuel ?? ""));

  const [mileageSelection, setMileageSelection] = useState(initialMileageSelection);
  const [customMileage, setCustomMileage] = useState(initialCustomMileage);

  const [color, setColor] = useState(String(draft?.color ?? ""));
  const [condition, setCondition] = useState(String(draft?.condition ?? ""));
  const [bodyType, setBodyType] = useState(String(draft?.bodyType ?? ""));

  const [engineSelection, setEngineSelection] = useState(initialEngineSelection);
  const [customEngine, setCustomEngine] = useState(initialCustomEngine);

  const [seats, setSeats] = useState(initialSeatsSelection);
  const [plateNumber, setPlateNumber] = useState(String(draft?.plateNumber ?? ""));

  useEffect(() => {
    if (!vehicleType || !listingCode) {
      router.replace(`/vehicles/edit/${encodeURIComponent(kode || "")}`);
    }
  }, [vehicleType, listingCode, router, kode]);

  const brandOptions = useMemo(
    () =>
      withOtherOption(
        brandPresetOptions,
        lang === "id" ? "Lainnya (ketik manual)" : "Other (type manually)"
      ),
    [brandPresetOptions, lang]
  );

  const resolvedBrand =
    brandSelection === SELECT_OTHER ? customBrand.trim() : brandSelection;

  const modelPresetDynamicOptions = useMemo(() => {
    if (!resolvedBrand || !catalog[resolvedBrand]) return [];
    return Object.keys(catalog[resolvedBrand]).sort((a, b) => a.localeCompare(b));
  }, [resolvedBrand, catalog]);

  const modelOptions = useMemo(
    () =>
      withOtherOption(
        modelPresetDynamicOptions,
        lang === "id" ? "Lainnya (ketik manual)" : "Other (type manually)"
      ),
    [modelPresetDynamicOptions, lang]
  );

  const resolvedModel =
    modelSelection === SELECT_OTHER ? customModel.trim() : modelSelection;

  const variantPresetDynamicOptions = useMemo(() => {
    if (!resolvedBrand || !resolvedModel) return [];
    return catalog[resolvedBrand]?.[resolvedModel] ?? [];
  }, [resolvedBrand, resolvedModel, catalog]);

  const variantOptions = useMemo(
    () =>
      withOtherOption(
        variantPresetDynamicOptions,
        lang === "id" ? "Lainnya (ketik manual)" : "Other (type manually)"
      ),
    [variantPresetDynamicOptions, lang]
  );

  const resolvedVariant =
    variantSelection === SELECT_OTHER ? customVariant.trim() : variantSelection;

  const bodyTypeOptions = useMemo(() => {
    return vehicleType === "motor" ? MOTOR_BODY_TYPES : CAR_BODY_TYPES;
  }, [vehicleType]);

  const engineOptions = useMemo(
    () =>
      withOtherOption(
        enginePresetOptions,
        lang === "id" ? "Lainnya (ketik manual)" : "Other (type manually)"
      ),
    [enginePresetOptions, lang]
  );

  const resolvedEngine =
    engineSelection === SELECT_OTHER ? customEngine.trim() : engineSelection;

  const mileageOptions = useMemo(
    () =>
      withOtherOption(
        MILEAGE_OPTIONS,
        lang === "id" ? "Lainnya (ketik manual)" : "Other (type manually)"
      ),
    [lang]
  );

  const resolvedMileage =
    mileageSelection === SELECT_OTHER ? customMileage.trim() : mileageSelection;

  const pageTitle =
    vehicleType === "motor"
      ? lang === "id"
        ? "Edit Detail Motor"
        : "Edit Motorbike Details"
      : lang === "id"
        ? "Edit Detail Mobil"
        : "Edit Car Details";

  const pageDesc =
    vehicleType === "motor"
      ? lang === "id"
        ? "(Step 2) Perbarui detail motor dengan dropdown dan pilihan siap pakai."
        : "(Step 2) Update motorbike details with dropdowns and ready-made options."
      : lang === "id"
        ? "(Step 2) Perbarui detail mobil dengan dropdown dan pilihan siap pakai."
        : "(Step 2) Update car details with dropdowns and ready-made options.";

  const priceLabel =
    String(draft?.listingType || "").toLowerCase() === "disewa"
      ? lang === "id"
        ? "Harga Sewa"
        : "Rental Price"
      : lang === "id"
        ? "Harga"
        : "Price";

  const canNext = useMemo(() => {
    const baseValid =
      resolvedBrand.length > 0 &&
      resolvedModel.length > 0 &&
      year.trim().length > 0 &&
      price.trim().length > 0 &&
      transmission.trim().length > 0 &&
      fuel.trim().length > 0 &&
      resolvedMileage.length > 0 &&
      color.trim().length > 0 &&
      condition.trim().length > 0 &&
      bodyType.trim().length > 0 &&
      resolvedEngine.length > 0;

    if (!baseValid) return false;

    if (vehicleType === "car") {
      return seats.trim().length > 0;
    }

    return true;
  }, [
    resolvedBrand,
    resolvedModel,
    year,
    price,
    transmission,
    fuel,
    resolvedMileage,
    color,
    condition,
    bodyType,
    resolvedEngine,
    seats,
    vehicleType,
  ]);

  function handleBack() {
    router.push(`/vehicles/edit/${encodeURIComponent(listingCode)}?plan=${currentPlan}`);
  }

  function handleNext() {
    if (!canNext) return;

    setDraft((prev: any) => ({
      ...(prev || {}),
      mode: "edit",
      source: "owner",
      plan: currentPlan,
      brand: resolvedBrand,
      model: resolvedModel,
      variant: resolvedVariant,
      year,
      price,
      transmission,
      fuel,
      mileage: resolvedMileage,
      color,
      condition,
      bodyType,
      engineCc: resolvedEngine,
      seats,
      plateNumber,
    }));

    router.push(
      `/vehicles/edit/${encodeURIComponent(listingCode)}/media?plan=${currentPlan}`
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-[#1C1C1E] sm:text-2xl lg:text-3xl">
                {pageTitle}
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

              <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold text-blue-700 sm:text-[11px]">
                {lang === "id" ? "EDIT MODE" : "EDIT MODE"}
              </span>

              {vehicleType ? (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-semibold text-gray-700 sm:text-[11px]">
                  {vehicleType === "motor"
                    ? lang === "id"
                      ? "MOTOR"
                      : "MOTORBIKE"
                    : lang === "id"
                      ? "MOBIL"
                      : "CAR"}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm leading-6 text-gray-600">{pageDesc}</p>
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

        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Brand" : "Brand"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={brandSelection}
                    placeholder={lang === "id" ? "Pilih brand" : "Select brand"}
                    options={brandOptions}
                    onChange={(value) => {
                      setBrandSelection(value);
                      setModelSelection("");
                      setCustomModel("");
                      setVariantSelection("");
                      setCustomVariant("");
                    }}
                  />
                </div>

                {brandSelection === SELECT_OTHER ? (
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Ketik brand manual"
                        : "Type brand manually"
                    }
                    className={inputBase}
                  />
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Model" : "Model"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={modelSelection}
                    placeholder={
                      resolvedBrand
                        ? lang === "id"
                          ? "Pilih model"
                          : "Select model"
                        : lang === "id"
                          ? "Pilih brand dulu"
                          : "Select brand first"
                    }
                    options={modelOptions}
                    onChange={(value) => {
                      setModelSelection(value);
                      setVariantSelection("");
                      setCustomVariant("");
                    }}
                  />
                </div>

                {modelSelection === SELECT_OTHER ? (
                  <input
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Ketik model manual"
                        : "Type model manually"
                    }
                    className={inputBase}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Varian" : "Variant"}{" "}
                  <span className="text-gray-400">
                    {lang === "id" ? "(Opsional)" : "(Optional)"}
                  </span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={variantSelection}
                    placeholder={
                      resolvedModel
                        ? lang === "id"
                          ? "Pilih varian"
                          : "Select variant"
                        : lang === "id"
                          ? "Pilih model dulu"
                          : "Select model first"
                    }
                    options={variantOptions}
                    onChange={(value) => setVariantSelection(value)}
                  />
                </div>

                {variantSelection === SELECT_OTHER ? (
                  <input
                    type="text"
                    value={customVariant}
                    onChange={(e) => setCustomVariant(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Ketik varian manual"
                        : "Type variant manually"
                    }
                    className={inputBase}
                  />
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Tahun" : "Year"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={year}
                    placeholder={lang === "id" ? "Pilih tahun" : "Select year"}
                    options={yearOptions.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(value) => setYear(value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {priceLabel} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={
                    lang === "id"
                      ? "Contoh: 350000000"
                      : "Example: 350000000"
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Kilometer / Mileage" : "Mileage"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={mileageSelection}
                    placeholder={
                      lang === "id" ? "Pilih mileage" : "Select mileage"
                    }
                    options={mileageOptions}
                    onChange={(value) => setMileageSelection(value)}
                  />
                </div>

                {mileageSelection === SELECT_OTHER ? (
                  <input
                    type="text"
                    value={customMileage}
                    onChange={(e) => setCustomMileage(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Contoh: 18.000 km"
                        : "Example: 18,000 km"
                    }
                    className={inputBase}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Transmisi" : "Transmission"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={transmission}
                    placeholder={
                      lang === "id"
                        ? "Pilih transmisi"
                        : "Select transmission"
                    }
                    options={TRANSMISSION_OPTIONS.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(value) => setTransmission(value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Bahan Bakar" : "Fuel"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={fuel}
                    placeholder={
                      lang === "id"
                        ? "Pilih bahan bakar"
                        : "Select fuel"
                    }
                    options={FUEL_OPTIONS.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(value) => setFuel(value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {vehicleType === "motor"
                    ? lang === "id"
                      ? "Tipe Motor"
                      : "Motorbike Type"
                    : lang === "id"
                      ? "Tipe Mobil"
                      : "Car Body Type"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={bodyType}
                    placeholder={
                      lang === "id" ? "Pilih tipe" : "Select type"
                    }
                    options={bodyTypeOptions.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(value) => setBodyType(value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {vehicleType === "motor"
                    ? lang === "id"
                      ? "CC / Mesin"
                      : "Engine CC"
                    : lang === "id"
                      ? "Mesin"
                      : "Engine"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={engineSelection}
                    placeholder={
                      lang === "id" ? "Pilih mesin" : "Select engine"
                    }
                    options={engineOptions}
                    onChange={(value) => setEngineSelection(value)}
                  />
                </div>

                {engineSelection === SELECT_OTHER ? (
                  <input
                    type="text"
                    value={customEngine}
                    onChange={(e) => setCustomEngine(e.target.value)}
                    placeholder={
                      vehicleType === "motor"
                        ? lang === "id"
                          ? "Contoh: 160cc"
                          : "Example: 160cc"
                        : lang === "id"
                          ? "Contoh: 2.4L / 2400cc"
                          : "Example: 2.4L / 2400cc"
                    }
                    className={inputBase}
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Warna" : "Color"}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder={
                    lang === "id"
                      ? "Contoh: Hitam / Putih"
                      : "Example: Black / White"
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Kondisi" : "Condition"}{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="mt-2">
                  <TetamoSelect
                    value={condition}
                    placeholder={
                      lang === "id"
                        ? "Pilih kondisi"
                        : "Select condition"
                    }
                    options={CONDITION_OPTIONS.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onChange={(value) => setCondition(value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {vehicleType === "car" ? (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jumlah Kursi" : "Seats"}{" "}
                    <span className="text-red-600">*</span>
                  </label>

                  <div className="mt-2">
                    <TetamoSelect
                      value={seats}
                      placeholder={lang === "id" ? "Pilih kursi" : "Select seats"}
                      options={SEAT_OPTIONS.map((item) => ({
                        value: item,
                        label: item,
                      }))}
                      onChange={(value) => setSeats(value)}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Nomor Polisi" : "Plate Number"}{" "}
                    <span className="text-gray-400">
                      {lang === "id" ? "(Opsional)" : "(Optional)"}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Contoh: DK 1234 XX"
                        : "Example: DK 1234 XX"
                    }
                    className={inputBase}
                  />
                </div>
              )}

              {vehicleType === "car" ? (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Nomor Polisi" : "Plate Number"}{" "}
                    <span className="text-gray-400">
                      {lang === "id" ? "(Opsional)" : "(Optional)"}
                    </span>
                  </label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    placeholder={
                      lang === "id"
                        ? "Contoh: B 1234 XX"
                        : "Example: B 1234 XX"
                    }
                    className={inputBase}
                  />
                </div>
              ) : (
                <div />
              )}
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