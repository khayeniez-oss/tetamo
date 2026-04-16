"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { TetamoSelect } from "@/components/ui/TetamoSelect";
import { useVehicleDraftListing } from "../layout";

type PlanType = "basic" | "featured";

const inputBase =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

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

export default function VehicleCreateDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { draft, setDraft } = useVehicleDraftListing();

  const currentPlan = useMemo<PlanType>(() => {
    const planFromUrl = searchParams.get("plan");
    return planFromUrl === "featured" ? "featured" : "basic";
  }, [searchParams]);

  const [brand, setBrand] = useState(draft?.brand ?? "");
  const [model, setModel] = useState(draft?.model ?? "");
  const [variant, setVariant] = useState(draft?.variant ?? "");
  const [year, setYear] = useState(draft?.year ?? "");
  const [price, setPrice] = useState(draft?.price ?? "");
  const [transmission, setTransmission] = useState(draft?.transmission ?? "");
  const [fuel, setFuel] = useState(draft?.fuel ?? "");
  const [mileage, setMileage] = useState(draft?.mileage ?? "");
  const [color, setColor] = useState(draft?.color ?? "");
  const [condition, setCondition] = useState(draft?.condition ?? "");
  const [bodyType, setBodyType] = useState(draft?.bodyType ?? "");
  const [engineCc, setEngineCc] = useState(draft?.engineCc ?? "");
  const [seats, setSeats] = useState(draft?.seats ?? "");
  const [plateNumber, setPlateNumber] = useState(draft?.plateNumber ?? "");

  const vehicleType = String(draft?.vehicleType || "").trim().toLowerCase();
  const listingType = String(draft?.listingType || "").trim().toLowerCase();

  useEffect(() => {
    setBrand(draft?.brand ?? "");
    setModel(draft?.model ?? "");
    setVariant(draft?.variant ?? "");
    setYear(draft?.year ?? "");
    setPrice(draft?.price ?? "");
    setTransmission(draft?.transmission ?? "");
    setFuel(draft?.fuel ?? "");
    setMileage(draft?.mileage ?? "");
    setColor(draft?.color ?? "");
    setCondition(draft?.condition ?? "");
    setBodyType(draft?.bodyType ?? "");
    setEngineCc(draft?.engineCc ?? "");
    setSeats(draft?.seats ?? "");
    setPlateNumber(draft?.plateNumber ?? "");
  }, [
    draft?.brand,
    draft?.model,
    draft?.variant,
    draft?.year,
    draft?.price,
    draft?.transmission,
    draft?.fuel,
    draft?.mileage,
    draft?.color,
    draft?.condition,
    draft?.bodyType,
    draft?.engineCc,
    draft?.seats,
    draft?.plateNumber,
  ]);

  const bodyTypeOptions = useMemo(() => {
    return vehicleType === "motor" ? MOTOR_BODY_TYPES : CAR_BODY_TYPES;
  }, [vehicleType]);

  const pageTitle =
    vehicleType === "motor"
      ? lang === "id"
        ? "Detail Motor"
        : "Motorbike Details"
      : lang === "id"
        ? "Detail Mobil"
        : "Car Details";

  const pageDesc =
    vehicleType === "motor"
      ? lang === "id"
        ? "(Step 2) Isi spesifikasi utama motor Anda."
        : "(Step 2) Fill in the main motorbike specifications."
      : lang === "id"
        ? "(Step 2) Isi spesifikasi utama mobil Anda."
        : "(Step 2) Fill in the main car specifications.";

  const priceLabel =
    listingType === "disewa"
      ? lang === "id"
        ? "Harga Sewa"
        : "Rental Price"
      : lang === "id"
        ? "Harga"
        : "Price";

  const canNext = useMemo(() => {
    const baseValid =
      brand.trim().length > 0 &&
      model.trim().length > 0 &&
      year.trim().length > 0 &&
      price.trim().length > 0 &&
      transmission.trim().length > 0 &&
      fuel.trim().length > 0 &&
      mileage.trim().length > 0 &&
      color.trim().length > 0 &&
      condition.trim().length > 0 &&
      bodyType.trim().length > 0 &&
      engineCc.trim().length > 0;

    if (!baseValid) return false;

    if (vehicleType === "car") {
      return seats.trim().length > 0;
    }

    return true;
  }, [
    brand,
    model,
    year,
    price,
    transmission,
    fuel,
    mileage,
    color,
    condition,
    bodyType,
    engineCc,
    seats,
    vehicleType,
  ]);

  function handleBack() {
    router.push(`/vehicles/create?plan=${currentPlan}`);
  }

  function handleNext() {
    if (!canNext) return;

    setDraft((prev: any) => ({
      ...(prev || {}),
      mode: "create",
      source: "owner",
      plan: currentPlan,

      brand,
      model,
      variant,
      year,
      price,
      transmission,
      fuel,
      mileage,
      color,
      condition,
      bodyType,
      engineCc,
      seats,
      plateNumber,
    }));

    router.push(`/vehicles/create/media?plan=${currentPlan}`);
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
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder={
                    lang === "id" ? "Contoh: Toyota / Yamaha" : "Example: Toyota / Yamaha"
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Model" : "Model"}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    lang === "id" ? "Contoh: Fortuner / XMAX" : "Example: Fortuner / XMAX"
                  }
                  className={inputBase}
                />
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
                <input
                  type="text"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  placeholder={
                    lang === "id" ? "Contoh: VRZ / Connected" : "Example: VRZ / Connected"
                  }
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Tahun" : "Year"}{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="2024"
                  className={inputBase}
                />
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
                <input
                  type="text"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder={
                    lang === "id" ? "Contoh: 18.000 km" : "Example: 18,000 km"
                  }
                  className={inputBase}
                />
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
                <input
                  type="text"
                  value={engineCc}
                  onChange={(e) => setEngineCc(e.target.value)}
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
                    lang === "id" ? "Contoh: Hitam / Putih" : "Example: Black / White"
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
                  <input
                    type="number"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    placeholder={lang === "id" ? "Contoh: 5" : "Example: 5"}
                    className={inputBase}
                  />
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
                      lang === "id" ? "Contoh: DK 1234 XX" : "Example: DK 1234 XX"
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
                      lang === "id" ? "Contoh: B 1234 XX" : "Example: B 1234 XX"
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