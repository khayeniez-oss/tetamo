"use client";

import { useEffect, useMemo } from "react";
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

type ChecklistItem = {
  key: string;
  label: string;
};

function mergeChecklist(...groups: ChecklistItem[][]) {
  return Array.from(
    new Map(groups.flat().map((item) => [item.key, item])).values()
  );
}

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

  const propertyType = draft?.propertyType ?? "";
  const isDisewa = draft?.listingType === "disewa";
  const hasPlan = Boolean(draft?.plan);

  const isApartment = ["apartemen", "studio"].includes(propertyType);
  const isTanah = propertyType === "tanah";
  const isIndustrial = ["gudang", "pabrik"].includes(propertyType);
  const isCommercial = ["kantor", "ruko", "rukos"].includes(propertyType);
  const isHospitality = ["guesthouse", "hotel", "kos", "resort"].includes(
    propertyType
  );
  const isHouseLike = ["rumah", "vila"].includes(propertyType);

  const isResidential =
    isHouseLike || isApartment || isHospitality || ["ruko", "rukos"].includes(propertyType);

  const usesLandSize = !isApartment;
  const usesBuildingSize = !isTanah;

  const showBedrooms = isResidential;
  const showBathrooms = !isTanah;
  const showMaidRoom = isHouseLike || ["guesthouse", "hotel", "resort"].includes(propertyType);
  const showFurnishing = !isTanah && !isIndustrial;
  const showParking = !isTanah;
  const showFloor = !isTanah;
  const showUnitFloor = isApartment;
  const showTowerBlock = isApartment;
  const showCeilingHeight = isIndustrial || isCommercial;
  const showRoadAccess = isTanah || isIndustrial;
  const showPricePerArea = isTanah || isIndustrial;
  const showDimensionFields = isTanah || isIndustrial;
  const showFacilities = !isTanah;
  const showNearby = true;
  const showLegalFields = true;
  const showLandTypeField = !isApartment;
  const showZoningField = !isApartment;

  const hasFacilities = Object.values(draft?.fasilitas || {}).some(Boolean);

  const commonFacilities: ChecklistItem[] = [
    { key: "fac_ac", label: "AC" },
    { key: "fac_wifi", label: "WiFi" },
    { key: "fac_cctv", label: "CCTV" },
    {
      key: "fac_security",
      label: lang === "id" ? "Security 24 Jam" : "24-Hour Security",
    },
    {
      key: "fac_parking",
      label: lang === "id" ? "Parkir" : "Parking",
    },
    {
      key: "fac_garden",
      label: lang === "id" ? "Taman" : "Garden",
    },
    {
      key: "fac_water_heater",
      label: lang === "id" ? "Water Heater" : "Water Heater",
    },
    {
      key: "fac_kitchen_set",
      label: lang === "id" ? "Kitchen Set" : "Kitchen Set",
    },
    {
      key: "fac_dining_area",
      label: lang === "id" ? "Ruang Makan" : "Dining Area",
    },
    {
      key: "fac_living_room",
      label: lang === "id" ? "Ruang Tamu" : "Living Room",
    },
    {
      key: "fac_storage",
      label: lang === "id" ? "Gudang / Storage" : "Storage Room",
    },
    {
      key: "fac_balcony",
      label: lang === "id" ? "Balkon" : "Balcony",
    },
    {
      key: "fac_terrace",
      label: lang === "id" ? "Teras" : "Terrace",
    },
    {
      key: "fac_laundry_area",
      label: lang === "id" ? "Area Laundry" : "Laundry Area",
    },
  ];

  const houseFacilities: ChecklistItem[] = [
    {
      key: "fac_private_pool",
      label: lang === "id" ? "Kolam Renang Pribadi" : "Private Pool",
    },
    {
      key: "fac_shared_pool",
      label: lang === "id" ? "Kolam Renang" : "Swimming Pool",
    },
    {
      key: "fac_carport",
      label: lang === "id" ? "Carport" : "Carport",
    },
    {
      key: "fac_garage",
      label: lang === "id" ? "Garasi" : "Garage",
    },
    {
      key: "fac_maid_room",
      label: lang === "id" ? "Kamar ART" : "Maid Room",
    },
    {
      key: "fac_smart_lock",
      label: lang === "id" ? "Smart Lock" : "Smart Lock",
    },
    {
      key: "fac_smart_home",
      label: lang === "id" ? "Smart Home" : "Smart Home",
    },
    {
      key: "fac_rooftop",
      label: lang === "id" ? "Rooftop" : "Rooftop",
    },
    {
      key: "fac_gazebo",
      label: lang === "id" ? "Gazebo" : "Gazebo",
    },
  ];

  const apartmentFacilities: ChecklistItem[] = [
    {
      key: "fac_lift",
      label: lang === "id" ? "Lift" : "Lift",
    },
    {
      key: "fac_gym",
      label: lang === "id" ? "Gym" : "Gym",
    },
    {
      key: "fac_shared_pool",
      label: lang === "id" ? "Kolam Renang Bersama" : "Shared Pool",
    },
    {
      key: "fac_lobby",
      label: lang === "id" ? "Lobby" : "Lobby",
    },
    {
      key: "fac_reception",
      label: lang === "id" ? "Resepsionis" : "Reception",
    },
    {
      key: "fac_access_card",
      label: lang === "id" ? "Kartu Akses" : "Access Card",
    },
    {
      key: "fac_basement_parking",
      label: lang === "id" ? "Parkir Basement" : "Basement Parking",
    },
    {
      key: "fac_function_room",
      label: lang === "id" ? "Function Room" : "Function Room",
    },
    {
      key: "fac_playground",
      label: lang === "id" ? "Taman Bermain Anak" : "Kids Playground",
    },
  ];

  const industrialFacilities: ChecklistItem[] = [
    {
      key: "fac_loading_dock",
      label: lang === "id" ? "Loading Dock" : "Loading Dock",
    },
    {
      key: "fac_truck_access",
      label: lang === "id" ? "Akses Truk" : "Truck Access",
    },
    {
      key: "fac_office_room",
      label: lang === "id" ? "Ruang Kantor" : "Office Room",
    },
    {
      key: "fac_staff_room",
      label: lang === "id" ? "Ruang Staff" : "Staff Room",
    },
    {
      key: "fac_generator",
      label: lang === "id" ? "Generator" : "Generator",
    },
    {
      key: "fac_three_phase",
      label: lang === "id" ? "Listrik 3 Phase" : "3-Phase Electricity",
    },
    {
      key: "fac_high_ceiling",
      label: lang === "id" ? "Plafon Tinggi" : "High Ceiling",
    },
    {
      key: "fac_meeting_room",
      label: lang === "id" ? "Ruang Meeting" : "Meeting Room",
    },
  ];

  const hospitalityFacilities: ChecklistItem[] = [
    {
      key: "fac_reception",
      label: lang === "id" ? "Resepsionis" : "Reception",
    },
    {
      key: "fac_restaurant",
      label: lang === "id" ? "Restoran" : "Restaurant",
    },
    {
      key: "fac_spa",
      label: lang === "id" ? "Spa" : "Spa",
    },
    {
      key: "fac_housekeeping",
      label: lang === "id" ? "Ruang Housekeeping" : "Housekeeping Room",
    },
    {
      key: "fac_meeting_room",
      label: lang === "id" ? "Ruang Meeting" : "Meeting Room",
    },
  ];

  const commercialFacilities: ChecklistItem[] = [
    {
      key: "fac_lobby",
      label: lang === "id" ? "Lobby" : "Lobby",
    },
    {
      key: "fac_reception",
      label: lang === "id" ? "Resepsionis" : "Reception",
    },
    {
      key: "fac_meeting_room",
      label: lang === "id" ? "Ruang Meeting" : "Meeting Room",
    },
    {
      key: "fac_generator",
      label: lang === "id" ? "Generator" : "Generator",
    },
    {
      key: "fac_lift",
      label: lang === "id" ? "Lift" : "Lift",
    },
  ];

  const facilityItems = useMemo(() => {
    if (isApartment) {
      return mergeChecklist(commonFacilities, apartmentFacilities);
    }

    if (isIndustrial) {
      return mergeChecklist(commonFacilities, industrialFacilities);
    }

    if (isHospitality) {
      return mergeChecklist(commonFacilities, houseFacilities, hospitalityFacilities);
    }

    if (isCommercial) {
      return mergeChecklist(commonFacilities, commercialFacilities);
    }

    return mergeChecklist(commonFacilities, houseFacilities);
  }, [lang, propertyType]);

  const nearbyItems = useMemo(
    () => [
      {
        key: "near_cafe",
        label: lang === "id" ? "Cafe" : "Cafe",
      },
      {
        key: "near_restaurant",
        label: lang === "id" ? "Restoran" : "Restaurant",
      },
      {
        key: "near_gym",
        label: lang === "id" ? "Gym" : "Gym",
      },
      {
        key: "near_coworking",
        label: lang === "id" ? "Co-working Space" : "Co-working Space",
      },
      {
        key: "near_beach_club",
        label: lang === "id" ? "Beach Club" : "Beach Club",
      },
      {
        key: "near_beach",
        label: lang === "id" ? "Pantai" : "Beach",
      },
      {
        key: "near_supermarket",
        label: lang === "id" ? "Supermarket" : "Supermarket",
      },
      {
        key: "near_traditional_market",
        label: lang === "id" ? "Pasar Tradisional" : "Traditional Market",
      },
      {
        key: "near_mall",
        label: "Mall",
      },
      {
        key: "near_school",
        label: lang === "id" ? "Sekolah" : "School",
      },
      {
        key: "near_international_school",
        label: lang === "id" ? "Sekolah Internasional" : "International School",
      },
      {
        key: "near_university",
        label: lang === "id" ? "Universitas" : "University",
      },
      {
        key: "near_hospital",
        label: lang === "id" ? "Rumah Sakit" : "Hospital",
      },
      {
        key: "near_clinic",
        label: lang === "id" ? "Klinik" : "Clinic",
      },
      {
        key: "near_pharmacy",
        label: lang === "id" ? "Apotek" : "Pharmacy",
      },
      {
        key: "near_airport",
        label: lang === "id" ? "Bandara" : "Airport",
      },
      {
        key: "near_port",
        label: lang === "id" ? "Pelabuhan" : "Port",
      },
      {
        key: "near_toll",
        label: lang === "id" ? "Akses Tol" : "Toll Access",
      },
      {
        key: "near_main_road",
        label: lang === "id" ? "Jalan Utama" : "Main Road",
      },
      {
        key: "near_office",
        label: lang === "id" ? "Area Perkantoran" : "Office Area",
      },
      {
        key: "near_tourist_attraction",
        label: lang === "id" ? "Tempat Wisata" : "Tourist Attraction",
      },
    ],
    [lang]
  );

  useEffect(() => {
    if (!isApartment) return;

    if (
      draft?.lt ||
      draft?.landUnit ||
      draft?.pricePerAre ||
      draft?.pricePerHectare ||
      draft?.frontage ||
      draft?.depth ||
      draft?.dimensionText ||
      draft?.roadAccess ||
      draft?.jenisTanah
    ) {
      setDraft((p: any) => ({
        ...(p || {}),
        lt: "",
        landUnit: "",
        pricePerAre: "",
        pricePerHectare: "",
        frontage: "",
        depth: "",
        dimensionText: "",
        roadAccess: "",
        jenisTanah: "",
      }));
    }
  }, [
    isApartment,
    draft?.lt,
    draft?.landUnit,
    draft?.pricePerAre,
    draft?.pricePerHectare,
    draft?.frontage,
    draft?.depth,
    draft?.dimensionText,
    draft?.roadAccess,
    draft?.jenisTanah,
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
      draft?.unitFloor ||
      draft?.towerBlock ||
      draft?.ceilingHeight ||
      draft?.listrik ||
      draft?.jenisAir ||
      hasFacilities
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
        unitFloor: "",
        towerBlock: "",
        ceilingHeight: "",
        listrik: "",
        jenisAir: "",
        fasilitas: {},
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
    draft?.unitFloor,
    draft?.towerBlock,
    draft?.ceilingHeight,
    draft?.listrik,
    draft?.jenisAir,
    hasFacilities,
    setDraft,
  ]);

  useEffect(() => {
    if (showPricePerArea || showDimensionFields || showRoadAccess) return;

    if (
      draft?.pricePerAre ||
      draft?.pricePerHectare ||
      draft?.frontage ||
      draft?.depth ||
      draft?.dimensionText ||
      draft?.roadAccess
    ) {
      setDraft((p: any) => ({
        ...(p || {}),
        pricePerAre: "",
        pricePerHectare: "",
        frontage: "",
        depth: "",
        dimensionText: "",
        roadAccess: "",
      }));
    }
  }, [
    showPricePerArea,
    showDimensionFields,
    showRoadAccess,
    draft?.pricePerAre,
    draft?.pricePerHectare,
    draft?.frontage,
    draft?.depth,
    draft?.dimensionText,
    draft?.roadAccess,
    setDraft,
  ]);

  useEffect(() => {
    if (showUnitFloor || showTowerBlock) return;

    if (draft?.unitFloor || draft?.towerBlock) {
      setDraft((p: any) => ({
        ...(p || {}),
        unitFloor: "",
        towerBlock: "",
      }));
    }
  }, [
    showUnitFloor,
    showTowerBlock,
    draft?.unitFloor,
    draft?.towerBlock,
    setDraft,
  ]);

  useEffect(() => {
    if (showCeilingHeight) return;

    if (draft?.ceilingHeight) {
      setDraft((p: any) => ({
        ...(p || {}),
        ceilingHeight: "",
      }));
    }
  }, [showCeilingHeight, draft?.ceilingHeight, setDraft]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 text-sm text-gray-700 transition hover:text-[#1C1C1E] sm:mb-6"
        >
          ← {lang === "id" ? "Kembali" : "Back"}
        </button>

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:gap-6">
          <div>
            <h1 className="text-xl font-bold leading-tight text-[#1C1C1E] sm:text-2xl lg:text-3xl">
              {lang === "id" ? "Detail Properti" : "Property Details"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {lang === "id"
                ? "Lengkapi detail agar listing terlihat rapi, premium, dan dipercaya."
                : "Complete the details so your listing looks neat, premium, and trustworthy."}
            </p>
          </div>

          {showPackageBadge && hasPlan && (
            <span className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold sm:text-sm">
              {lang === "id" ? "Paket:" : "Package:"}{" "}
              {draft?.plan === "featured" ? "Featured" : "Basic"}
            </span>
          )}
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white shadow-sm sm:mt-10">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
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
                        label: lang === "id" ? "Rukos" : "Shop-Boarding House",
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
                  <div className="mt-2">
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

              <div>
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
                  {lang === "id" ? "Primary / Secondary" : "Primary / Secondary"}
                </label>
                <div className="mt-2">
                  <TetamoSelect
                    value={draft?.marketType ?? ""}
                    placeholder={lang === "id" ? "Pilih" : "Select"}
                    options={[
                      { value: "primary", label: "Primary" },
                      { value: "secondary", label: "Secondary" },
                    ]}
                    onChange={(value) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        marketType: value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1C1C1E]">
                  {lang === "id" ? "Harga per m² (Rp)" : "Price per m² (Rp)"}
                </label>
                <input
                  className={inputBase}
                  inputMode="numeric"
                  placeholder={lang === "id" ? "Contoh: 15000000" : "Example: 15000000"}
                  value={draft?.pricePerSqm ?? ""}
                  onChange={(e) =>
                    setDraft((p: any) => ({
                      ...(p || {}),
                      pricePerSqm: e.target.value.replace(/[^\d]/g, ""),
                    }))
                  }
                />
              </div>

              {showPricePerArea ? (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Harga per Are (Rp)" : "Price per Are (Rp)"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    placeholder={lang === "id" ? "Contoh: 250000000" : "Example: 250000000"}
                    value={draft?.pricePerAre ?? ""}
                    onChange={(e) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        pricePerAre: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>
              ) : (
                <div />
              )}

              {usesLandSize && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Luas Tanah" : "Land Size"}{" "}
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
                          lt: e.target.value.replace(/[^\d.]/g, ""),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Satuan Luas Tanah" : "Land Size Unit"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={draft?.landUnit ?? ""}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "m2", label: "m²" },
                          { value: "are", label: lang === "id" ? "Are" : "Are" },
                          {
                            value: "hectare",
                            label: lang === "id" ? "Hektare" : "Hectare",
                          },
                          { value: "acre", label: "Acre" },
                        ]}
                        onChange={(value) =>
                          setDraft((p: any) => ({
                            ...(p || {}),
                            landUnit: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {showPricePerArea && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Harga per Hektare (Rp)" : "Price per Hectare (Rp)"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    placeholder={lang === "id" ? "Contoh: 2500000000" : "Example: 2500000000"}
                    value={draft?.pricePerHectare ?? ""}
                    onChange={(e) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        pricePerHectare: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>
              )}

              {showDimensionFields && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Lebar / Frontage (m)" : "Frontage (m)"}
                    </label>
                    <input
                      className={inputBase}
                      inputMode="decimal"
                      placeholder={lang === "id" ? "Contoh: 10" : "Example: 10"}
                      value={draft?.frontage ?? ""}
                      onChange={(e) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          frontage: e.target.value.replace(/[^\d.]/g, ""),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Panjang / Depth (m)" : "Depth (m)"}
                    </label>
                    <input
                      className={inputBase}
                      inputMode="decimal"
                      placeholder={lang === "id" ? "Contoh: 20" : "Example: 20"}
                      value={draft?.depth ?? ""}
                      onChange={(e) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          depth: e.target.value.replace(/[^\d.]/g, ""),
                        }))
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Dimensi" : "Dimension"}
                    </label>
                    <input
                      className={inputBase}
                      placeholder={lang === "id" ? "Contoh: 10 x 20" : "Example: 10 x 20"}
                      value={draft?.dimensionText ?? ""}
                      onChange={(e) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          dimensionText: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

              {usesBuildingSize && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Luas Bangunan (LB) m²" : "Building Size (LB) m²"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    placeholder={lang === "id" ? "Contoh: 90" : "Example: 90"}
                    value={draft?.lb ?? ""}
                    onChange={(e) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        lb: e.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                  />
                </div>
              )}

              {showBedrooms && (
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
                        { value: "6", label: "6" },
                        { value: "7", label: "7" },
                        { value: "8", label: "8" },
                        { value: "9", label: "9" },
                        { value: "10", label: "10" },
                      ]}
                      onChange={(value) =>
                        setDraft((p: any) => ({ ...(p || {}), bed: value }))
                      }
                    />
                  </div>
                </div>
              )}

              {showBathrooms && (
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
                        { value: "5", label: "5" },
                        { value: "6", label: "6" },
                        { value: "7", label: "7" },
                        { value: "8", label: "8" },
                        { value: "9", label: "9" },
                        { value: "10", label: "10" },
                      ]}
                      onChange={(value) =>
                        setDraft((p: any) => ({ ...(p || {}), bath: value }))
                      }
                    />
                  </div>
                </div>
              )}

              {showMaidRoom && (
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
              )}

              {showFurnishing && (
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
                          label: lang === "id" ? "Tanpa Furnitur" : "Unfurnished",
                        },
                        {
                          value: "semi",
                          label: lang === "id" ? "Semi Furnished" : "Semi Furnished",
                        },
                        {
                          value: "full",
                          label: lang === "id" ? "Full Furnished" : "Full Furnished",
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
              )}

              {showParking && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Parking" : "Parking"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={draft?.garage ?? ""}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "ada",
                          label: lang === "id" ? "Ada" : "Have",
                        },
                        {
                          value: "tidak_ada",
                          label: lang === "id" ? "Tidak Ada" : "Don't Have",
                        },
                      ]}
                      onChange={(value) =>
                        setDraft((p: any) => ({
                          ...(p || {}),
                          garage: value,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {showFloor && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jumlah Lantai" : "Total Floors"}
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
              )}

              {showUnitFloor && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Lantai Unit" : "Unit Floor"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    placeholder={lang === "id" ? "Contoh: 12" : "Example: 12"}
                    value={draft?.unitFloor ?? ""}
                    onChange={(e) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        unitFloor: e.target.value.replace(/[^\d]/g, ""),
                      }))
                    }
                  />
                </div>
              )}

              {showTowerBlock && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Tower / Blok" : "Tower / Block"}
                  </label>
                  <input
                    className={inputBase}
                    placeholder={lang === "id" ? "Contoh: Tower A" : "Example: Tower A"}
                    value={draft?.towerBlock ?? ""}
                    onChange={(e) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        towerBlock: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {showCeilingHeight && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Tinggi Plafon (m)" : "Ceiling Height (m)"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="decimal"
                    placeholder={lang === "id" ? "Contoh: 6" : "Example: 6"}
                    value={draft?.ceilingHeight ?? ""}
                    onChange={(e) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        ceilingHeight: e.target.value.replace(/[^\d.]/g, ""),
                      }))
                    }
                  />
                </div>
              )}

              {showRoadAccess && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Akses Jalan" : "Road Access"}
                  </label>
                  <input
                    className={inputBase}
                    placeholder={
                      lang === "id" ? "Contoh: Jalan 6 meter" : "Example: 6-meter road"
                    }
                    value={draft?.roadAccess ?? ""}
                    onChange={(e) =>
                      setDraft((p: any) => ({
                        ...(p || {}),
                        roadAccess: e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              {!isTanah && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Listrik" : "Electricity"}
                    </label>
                    <input
                      className={inputBase}
                      placeholder={lang === "id" ? "Contoh: 2200 VA" : "Example: 2200 VA"}
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

            {(showFacilities || showNearby) && (
              <div className="md:col-span-2">
                <div
                  className={`grid grid-cols-1 items-start gap-6 ${
                    showFacilities ? "md:grid-cols-2" : "md:grid-cols-1"
                  }`}
                >
                  {showFacilities && (
                    <div className="mt-6 border-t border-gray-100 pt-6 sm:pt-8">
                      <h2 className="text-sm font-bold text-[#1C1C1E] sm:text-base">
                        {lang === "id" ? "Fasilitas" : "Facilities"}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {lang === "id"
                          ? "Pilih fasilitas yang tersedia."
                          : "Select the available facilities."}
                      </p>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {facilityItems.map((item) => {
                          const checked = Boolean((draft as any)?.fasilitas?.[item.key]);

                          return (
                            <label
                              key={item.key}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition sm:px-4 ${
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
                                className="mt-0.5 h-4 w-4"
                              />
                              <span className="text-sm font-semibold leading-5 text-[#1C1C1E]">
                                {item.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {showNearby && (
                    <div className="mt-6 border-t border-gray-100 pt-6 sm:pt-8">
                      <h2 className="text-sm font-bold text-[#1C1C1E] sm:text-base">
                        {lang === "id" ? "Terdekat" : "Nearby"}
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {lang === "id"
                          ? "Pilih tempat atau fasilitas terdekat."
                          : "Select nearby places or facilities."}
                      </p>

                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                        {nearbyItems.map((item) => {
                          const checked = Boolean((draft as any)?.nearby?.[item.key]);

                          return (
                            <label
                              key={item.key}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition sm:px-4 ${
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
                                className="mt-0.5 h-4 w-4"
                              />
                              <span className="text-sm font-semibold leading-5 text-[#1C1C1E]">
                                {item.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showLegalFields && (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Sertifikat" : "Certificate"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={draft?.sertifikat ?? ""}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        { value: "SHM", label: "SHM" },
                        { value: "SHGB", label: "SHGB / HGB" },
                        { value: "SHMSRS", label: "SHMSRS / Strata Title" },
                        { value: "Hak Pakai", label: lang === "id" ? "Hak Pakai" : "Hak Pakai" },
                        { value: "AJB", label: "AJB" },
                        { value: "PPJB", label: "PPJB" },
                        { value: "Girik", label: "Girik" },
                        { value: "Letter C", label: "Letter C" },
                        { value: "Petok D", label: "Petok D" },
                        { value: "Akta Notarial", label: "Akta Notarial" },
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
                          value: "Hak Milik / Freehold",
                          label: lang === "id" ? "Hak Milik / Freehold" : "Freehold / Hak Milik",
                        },
                        {
                          value: "Hak Sewa / Leasehold",
                          label: lang === "id" ? "Hak Sewa / Leasehold" : "Leasehold / Hak Sewa",
                        },
                        {
                          value: "Hak Guna Bangunan / HGB",
                          label: lang === "id"
                            ? "Hak Guna Bangunan / HGB"
                            : "Right to Build / HGB",
                        },
                        {
                          value: "Hak Pakai",
                          label: lang === "id" ? "Hak Pakai" : "Right to Use",
                        },
                        {
                          value: "Strata Title",
                          label: "Strata Title",
                        },
                        {
                          value: "Corporate Ownership",
                          label: lang === "id" ? "Kepemilikan Perusahaan" : "Corporate Ownership",
                        },
                        {
                          value: "Shared Ownership",
                          label: lang === "id" ? "Kepemilikan Bersama" : "Shared Ownership",
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

                {showLandTypeField && (
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
                            label: lang === "id" ? "Tanah Hunian" : "Residential Land",
                          },
                          {
                            value: "Tanah Komersial",
                            label: lang === "id" ? "Tanah Komersial" : "Commercial Land",
                          },
                          {
                            value: "Tanah Pariwisata",
                            label: lang === "id" ? "Tanah Pariwisata" : "Tourism Land",
                          },
                          {
                            value: "Tanah Pertanian",
                            label: lang === "id" ? "Tanah Pertanian" : "Agricultural Land",
                          },
                          {
                            value: "Tanah Industri",
                            label: lang === "id" ? "Tanah Industri" : "Industrial Land",
                          },
                          {
                            value: "Tanah Mixed Use",
                            label: lang === "id" ? "Tanah Mixed Use" : "Mixed Use Land",
                          },
                          {
                            value: "Beachfront",
                            label: "Beachfront",
                          },
                          {
                            value: "Riverfront",
                            label: "Riverfront",
                          },
                          {
                            value: "Cliff Front",
                            label: "Cliff Front",
                          },
                          {
                            value: "Hilltop",
                            label: "Hilltop",
                          },
                          {
                            value: "Rice Field View",
                            label: "Rice Field View",
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
                )}

                {showZoningField && (
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
                            value: "Residential",
                            label: lang === "id" ? "Residential / Perumahan" : "Residential",
                          },
                          {
                            value: "Commercial",
                            label: lang === "id" ? "Commercial / Komersial" : "Commercial",
                          },
                          {
                            value: "Tourism",
                            label: lang === "id" ? "Tourism / Pariwisata" : "Tourism",
                          },
                          {
                            value: "Mixed Use",
                            label: lang === "id" ? "Mixed Use / Campuran" : "Mixed Use",
                          },
                          {
                            value: "Green Zone",
                            label: lang === "id" ? "Green Zone" : "Green Zone",
                          },
                          {
                            value: "Yellow Zone",
                            label: lang === "id" ? "Yellow Zone" : "Yellow Zone",
                          },
                          {
                            value: "Pink Zone",
                            label: lang === "id" ? "Pink Zone" : "Pink Zone",
                          },
                          {
                            value: "Industrial",
                            label: lang === "id" ? "Industrial / Industri" : "Industrial",
                          },
                          {
                            value: "Agricultural",
                            label: lang === "id" ? "Agricultural / Pertanian" : "Agricultural",
                          },
                          {
                            value: "Public Facilities",
                            label: lang === "id" ? "Fasilitas Umum" : "Public Facilities",
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
                )}
              </div>
            )}

            <div className="mt-8">
              <button
                type="button"
                onClick={onNext}
                disabled={!isValid}
                className={[
                  "w-full rounded-2xl px-6 py-3.5 text-center text-sm font-semibold transition",
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