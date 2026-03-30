"use client";

import { useEffect } from "react";
import { TetamoSelect } from "@/components/ui/TetamoSelect";
import { useLanguage } from "@/app/context/LanguageContext";

type Props = {
  draft: any;
  setDraft: (fn: any) => void;

  inputBase?: string;
  isValid: boolean;

  onBack: () => void;
  onNext: () => void;

  router?: any;
  showPackageBadge?: boolean;
};

const defaultInputBase =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

export default function ListingForm(props: Props) {
  const {
    draft,
    setDraft,
    inputBase = defaultInputBase,
    isValid,
    onBack,
    onNext,
    showPackageBadge = true,
  } = props;

  const { lang } = useLanguage();

  const isDisewa = draft?.listingType === "disewa";
  const isTanah = draft?.propertyType === "tanah";
  const hasPlan = Boolean(draft?.plan);

  const hasFacilities = Object.values(draft?.fasilitas || {}).some(Boolean);
  const hasNearby = Object.values(draft?.nearby || {}).some(Boolean);

  useEffect(() => {
    if (!isDisewa || isTanah) return;

    if (
      draft?.sertifikat ||
      draft?.jenisKepemilikan ||
      draft?.jenisTanah ||
      draft?.jenisZoning
    ) {
      setDraft((p: any) => ({
        ...(p || {}),
        sertifikat: "",
        jenisKepemilikan: "",
        jenisTanah: "",
        jenisZoning: "",
      }));
    }
  }, [
    isDisewa,
    isTanah,
    draft?.sertifikat,
    draft?.jenisKepemilikan,
    draft?.jenisTanah,
    draft?.jenisZoning,
    setDraft,
  ]);

  useEffect(() => {
    if (!isTanah) return;

    if (
      draft?.lb ||
      draft?.bed ||
      draft?.bath ||
      draft?.maid ||
      draft?.furnishing ||
      draft?.garage ||
      draft?.floor ||
      draft?.listrik ||
      draft?.jenisAir ||
      hasFacilities ||
      hasNearby
    ) {
      setDraft((p: any) => ({
        ...(p || {}),
        lb: "",
        bed: "",
        bath: "",
        maid: "",
        furnishing: "",
        garage: "",
        floor: "",
        listrik: "",
        jenisAir: "",
        fasilitas: {},
        nearby: {},
      }));
    }
  }, [
    isTanah,
    draft?.lb,
    draft?.bed,
    draft?.bath,
    draft?.maid,
    draft?.furnishing,
    draft?.garage,
    draft?.floor,
    draft?.listrik,
    draft?.jenisAir,
    hasFacilities,
    hasNearby,
    setDraft,
  ]);

  const showBuildingFields = !isTanah;
  const showLegalFields = isTanah || !isDisewa;
  const showFacilitiesAndNearby = !isTanah;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 text-sm text-gray-700 transition hover:text-[#1C1C1E]"
        >
          ← {lang === "id" ? "Kembali" : "Back"}
        </button>

        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1C1C1E]">
              {lang === "id" ? "Detail Properti" : "Property Details"}
            </h1>
            <p className="mt-2 text-gray-600">
              {lang === "id"
                ? "Lengkapi detail agar listing terlihat rapi, premium, dan dipercaya."
                : "Complete the details so your listing looks neat, premium, and trustworthy."}
            </p>
          </div>

          {showPackageBadge && hasPlan && (
            <span className="shrink-0 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold">
              {lang === "id" ? "Paket:" : "Package:"}{" "}
              {draft?.plan === "featured" ? "Featured" : "Basic"}
            </span>
          )}
        </div>

        <div className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="p-8 md:p-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Tipe Properti" : "Property Type"}
                </label>
                <div className="mt-2">
                  <TetamoSelect
                    value={draft?.propertyType ?? ""}
                    placeholder={lang === "id" ? "Pilih" : "Select"}
                    options={[
                      {
                        value: "studio",
                        label: lang === "id" ? "Studio" : "Studio",
                      },
                      {
                        value: "rumah",
                        label: lang === "id" ? "Rumah" : "House",
                      },
                      {
                        value: "apartemen",
                        label: lang === "id" ? "Apartemen" : "Apartment",
                      },
                      {
                        value: "gudang",
                        label: lang === "id" ? "Gudang" : "Warehouse",
                      },
                      {
                        value: "guesthouse",
                        label: lang === "id" ? "Guesthouse" : "Guesthouse",
                      },
                      {
                        value: "hotel",
                        label: lang === "id" ? "Hotel" : "Hotel",
                      },
                      {
                        value: "kantor",
                        label: lang === "id" ? "Kantor" : "Office",
                      },
                      {
                        value: "kos",
                        label: lang === "id" ? "Kos" : "Boarding House",
                      },
                      {
                        value: "resort",
                        label: lang === "id" ? "Resort" : "Resort",
                      },
                      {
                        value: "ruko",
                        label: lang === "id" ? "Ruko" : "Shophouse",
                      },
                      {
                        value: "rukos",
                        label: lang === "id" ? "Rukos" : "Shop-boardhouse",
                      },
                      {
                        value: "tanah",
                        label: lang === "id" ? "Tanah" : "Land",
                      },
                      {
                        value: "pabrik",
                        label: lang === "id" ? "Pabrik" : "Factory",
                      },
                      {
                        value: "vila",
                        label: lang === "id" ? "Vila" : "Villa",
                      },
                    ]}
                    onChange={(value) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        propertyType: value,
                      }))
                    }
                  />
                </div>
              </div>

              {isDisewa ? (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jenis Sewa" : "Rental Type"}
                  </label>
                  <div className="relative mt-2">
                    <TetamoSelect
                      value={draft?.rentalType ?? ""}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "bulanan",
                          label: lang === "id" ? "Bulanan" : "Monthly",
                        },
                        {
                          value: "tahunan",
                          label: lang === "id" ? "Tahunan" : "Yearly",
                        },
                      ]}
                      onChange={(value) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          rentalType: value,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div />
              )}

              <div className={isTanah ? "" : "md:col-span-2"}>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Harga (Rp)" : "Price (Rp)"}{" "}
                  <span className="text-gray-400">
                    {lang === "id" ? "(Wajib)" : "(Required)"}
                  </span>
                </label>
                <input
                  className={inputBase}
                  inputMode="numeric"
                  placeholder={
                    lang === "id" ? "Contoh: 1500000000" : "Example: 1500000000"
                  }
                  value={draft?.price ?? ""}
                  onChange={(e) =>
                    setDraft((p: any) => ({
                      ...(p || {}),
                      price: e.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Luas Tanah (LT) m²" : "Land Size (LT) m²"}{" "}
                  <span className="text-gray-400">
                    {lang === "id" ? "(Wajib)" : "(Required)"}
                  </span>
                </label>
                <input
                  className={inputBase}
                  inputMode="numeric"
                  placeholder={lang === "id" ? "Contoh: 120" : "Example: 120"}
                  value={draft?.lt ?? ""}
                  onChange={(e) =>
                    setDraft((p: any) => ({
                      ...(p || {}),
                      lt: e.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                />
              </div>

              {showBuildingFields && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id"
                        ? "Luas Bangunan (LB) m²"
                        : "Building Size (LB) m²"}
                    </label>
                    <input
                      className={inputBase}
                      inputMode="numeric"
                      placeholder={lang === "id" ? "Contoh: 90" : "Example: 90"}
                      value={draft?.lb ?? ""}
                      onChange={(e) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          lb: e.target.value.replace(/[^\d]/g, ""),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Kamar Tidur" : "Bedrooms"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={draft?.bed ?? ""}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          {
                            value: "studio",
                            label: lang === "id" ? "Studio" : "Studio",
                          },
                          { value: "1", label: "1" },
                          { value: "2", label: "2" },
                          { value: "3", label: "3" },
                          { value: "4", label: "4" },
                          { value: "5", label: "5" },
                          { value: "6+", label: "6+" },
                        ]}
                        onChange={(value) =>
                          setDraft((p: any) => ({ ...(p || {}), bed: value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Kamar Mandi" : "Bathrooms"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={draft?.bath ?? ""}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "0", label: "0" },
                          { value: "1", label: "1" },
                          { value: "2", label: "2" },
                          { value: "3", label: "3" },
                          { value: "4", label: "4" },
                          { value: "5+", label: "5+" },
                        ]}
                        onChange={(value) =>
                          setDraft((p: any) => ({ ...(p || {}), bath: value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Kamar ART" : "Maid Room"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={draft?.maid ?? ""}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "0", label: "0" },
                          { value: "1", label: "1" },
                          { value: "2", label: "2" },
                          { value: "3", label: "3" },
                          { value: "4+", label: "4+" },
                        ]}
                        onChange={(val) =>
                          setDraft((p: any) => ({ ...(p || {}), maid: val }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Furnishing" : "Furnishing"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={draft?.furnishing ?? ""}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          {
                            value: "unfurnished",
                            label:
                              lang === "id" ? "Tanpa Furnitur" : "Unfurnished",
                          },
                          {
                            value: "semi",
                            label:
                              lang === "id"
                                ? "Semi Furnished"
                                : "Semi Furnished",
                          },
                          {
                            value: "full",
                            label:
                              lang === "id"
                                ? "Full Furnished"
                                : "Full Furnished",
                          },
                        ]}
                        onChange={(val) =>
                          setDraft((p: any) => ({
                            ...(p || {}),
                            furnishing: val,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id"
                        ? "Parkir Mobil/Motor"
                        : "Car/Bike Parking"}
                    </label>
                    <input
                      className={inputBase}
                      inputMode="numeric"
                      placeholder={lang === "id" ? "Contoh: 1" : "Example: 1"}
                      value={draft?.garage ?? ""}
                      onChange={(e) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          garage: e.target.value.replace(/[^\d]/g, ""),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Lantai" : "Floor"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={draft?.floor ?? ""}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "1", label: "1" },
                          { value: "1.5", label: "1.5" },
                          { value: "2", label: "2" },
                          { value: "2.5", label: "2.5" },
                          { value: "3", label: "3" },
                          { value: "3.5", label: "3.5" },
                          { value: "4", label: "4" },
                          { value: "4.5", label: "4.5" },
                          { value: "5", label: "5" },
                          { value: "6", label: "6" },
                          { value: "7", label: "7" },
                          { value: "8", label: "8" },
                          { value: "9", label: "9" },
                          { value: "10+", label: "10+" },
                        ]}
                        onChange={(value) =>
                          setDraft((p: any) => ({
                            ...(p || {}),
                            floor: value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Listrik" : "Electricity"}
                    </label>
                    <input
                      className={inputBase}
                      placeholder={
                        lang === "id" ? "Contoh: 2200 VA" : "Example: 2200 VA"
                      }
                      value={draft?.listrik ?? ""}
                      onChange={(e) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          listrik: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Jenis Air" : "Water Type"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={draft?.jenisAir ?? ""}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          {
                            value: "pdam",
                            label: lang === "id" ? "PDAM" : "PDAM",
                          },
                          {
                            value: "sumur",
                            label: lang === "id" ? "Sumur" : "Well Water",
                          },
                          {
                            value: "campuran",
                            label: lang === "id" ? "Campuran" : "Mixed",
                          },
                          {
                            value: "lainnya",
                            label: lang === "id" ? "Lainnya" : "Other",
                          },
                        ]}
                        onChange={(val) =>
                          setDraft((p: any) => ({
                            ...(p || {}),
                            jenisAir: val,
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {showFacilitiesAndNearby && (
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                  <div className="mt-6 border-t border-gray-100 pt-8">
                    <h2 className="text-lg font-bold text-[#1C1C1E]">
                      {lang === "id" ? "Fasilitas" : "Facilities"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {lang === "id"
                        ? "Pilih fasilitas yang tersedia."
                        : "Select the available facilities."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[
                        { key: "fac_ac", label: lang === "id" ? "AC" : "AC" },
                        {
                          key: "fac_pool",
                          label:
                            lang === "id" ? "Kolam Renang" : "Swimming Pool",
                        },
                        { key: "fac_gym", label: lang === "id" ? "Gym" : "Gym" },
                        {
                          key: "fac_security",
                          label:
                            lang === "id"
                              ? "Security 24 Jam"
                              : "24-Hour Security",
                        },
                        { key: "fac_cctv", label: "CCTV" },
                        {
                          key: "fac_lift",
                          label: lang === "id" ? "Lift" : "Lift",
                        },
                        {
                          key: "fac_parking",
                          label: lang === "id" ? "Parkir" : "Parking",
                        },
                        {
                          key: "fac_garden",
                          label: lang === "id" ? "Taman" : "Garden",
                        },
                        { key: "fac_wifi", label: "WiFi" },
                      ].map((item) => {
                        const checked = Boolean(
                          (draft as any)?.fasilitas?.[item.key]
                        );

                        return (
                          <label
                            key={item.key}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                              checked ? "border-[#1C1C1E]" : "border-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setDraft((p: any) => ({
                                  ...(p || {}),
                                  fasilitas: {
                                    ...(p?.fasilitas || {}),
                                    [item.key]: e.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-semibold text-[#1C1C1E]">
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-gray-100 pt-8">
                    <h2 className="text-lg font-bold text-[#1C1C1E]">
                      {lang === "id" ? "Terdekat" : "Nearby"}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {lang === "id"
                        ? "Pilih fasilitas umum terdekat."
                        : "Select nearby public facilities."}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[
                        {
                          key: "near_toll",
                          label: lang === "id" ? "Akses Tol" : "Toll Access",
                        },
                        { key: "near_mall", label: "Mall" },
                        {
                          key: "near_school",
                          label: lang === "id" ? "Sekolah" : "School",
                        },
                        {
                          key: "near_hospital",
                          label: lang === "id" ? "Rumah Sakit" : "Hospital",
                        },
                        {
                          key: "near_station",
                          label: lang === "id" ? "Stasiun" : "Station",
                        },
                        {
                          key: "near_airport",
                          label: lang === "id" ? "Bandara" : "Airport",
                        },
                        {
                          key: "near_market",
                          label: lang === "id" ? "Pasar" : "Market",
                        },
                        {
                          key: "near_office",
                          label: lang === "id" ? "Perkantoran" : "Office Area",
                        },
                        {
                          key: "near_beach",
                          label: lang === "id" ? "Pantai" : "Beach",
                        },
                      ].map((item) => {
                        const checked = Boolean((draft as any)?.nearby?.[item.key]);

                        return (
                          <label
                            key={item.key}
                            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                              checked ? "border-[#1C1C1E]" : "border-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setDraft((p: any) => ({
                                  ...(p || {}),
                                  nearby: {
                                    ...(p?.nearby || {}),
                                    [item.key]: e.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4"
                            />
                            <span className="text-sm font-semibold text-[#1C1C1E]">
                              {item.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showLegalFields && (
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Sertifikat" : "Certificate"}
                  </label>
                  <div className="mt-4">
                    <TetamoSelect
                      value={draft?.sertifikat ?? ""}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        { value: "SHM", label: "SHM" },
                        { value: "HGB", label: "HGB" },
                        { value: "AJB", label: "AJB" },
                        { value: "Girik", label: "Girik" },
                        {
                          value: "Lainnya",
                          label: lang === "id" ? "Lainnya" : "Other",
                        },
                      ]}
                      onChange={(val) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          sertifikat: val,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jenis Kepemilikan" : "Ownership Type"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={draft?.jenisKepemilikan ?? ""}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "Hak Milik",
                          label: lang === "id" ? "Hak Milik" : "Freehold",
                        },
                        { value: "HGB", label: "HGB" },
                        {
                          value: "Hak Pakai",
                          label:
                            lang === "id" ? "Hak Pakai" : "Right to Use",
                        },
                        {
                          value: "Lainnya",
                          label: lang === "id" ? "Lainnya" : "Other",
                        },
                      ]}
                      onChange={(val) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          jenisKepemilikan: val,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jenis Tanah" : "Land Type"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={draft?.jenisTanah ?? ""}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "Tanah Hunian",
                          label:
                            lang === "id"
                              ? "Tanah Hunian"
                              : "Residential Land",
                        },
                        {
                          value: "Tanah Komersial",
                          label:
                            lang === "id"
                              ? "Tanah Komersial"
                              : "Commercial Land",
                        },
                        {
                          value: "Tanah Industri",
                          label:
                            lang === "id"
                              ? "Tanah Industri"
                              : "Industrial Land",
                        },
                        {
                          value: "Lainnya",
                          label: lang === "id" ? "Lainnya" : "Other",
                        },
                      ]}
                      onChange={(val) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          jenisTanah: val,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jenis Zoning" : "Zoning Type"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={draft?.jenisZoning ?? ""}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "Perumahan",
                          label:
                            lang === "id" ? "Perumahan" : "Residential",
                        },
                        {
                          value: "Komersial",
                          label: lang === "id" ? "Komersial" : "Commercial",
                        },
                        {
                          value: "Industri",
                          label: lang === "id" ? "Industri" : "Industrial",
                        },
                        {
                          value: "Campuran",
                          label: lang === "id" ? "Campuran" : "Mixed Use",
                        },
                        {
                          value: "Lainnya",
                          label: lang === "id" ? "Lainnya" : "Other",
                        },
                      ]}
                      onChange={(val) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          jenisZoning: val,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-10">
              <button
                type="button"
                onClick={onNext}
                disabled={!isValid}
                className={[
                  "w-full rounded-2xl px-6 py-4 text-center font-semibold transition",
                  isValid
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