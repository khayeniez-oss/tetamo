"use client";

import { useMemo } from "react";
import { TetamoSelect } from "@/components/ui/TetamoSelect";
import { useLanguage } from "@/app/context/LanguageContext";

type DraftRecord = Record<string, unknown>;

type Props<TDraft extends DraftRecord = DraftRecord> = {
  draft: TDraft | null | undefined;
  setDraft: (fn: (prev: TDraft | null | undefined) => TDraft) => void;

  inputBase?: string;
  isValid: boolean;

  onBack: () => void;
  onNext: () => void;

  router?: unknown;
  showPackageBadge?: boolean;
};

type ChecklistItem = {
  key: string;
  label: string;
};

type OptionItem = {
  value: string;
  label: string;
};

const defaultInputBase =
  "mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10";

const saleTypeOwnershipMap: Record<string, string> = {
  freehold: "Hak Milik / Freehold",
  leasehold: "Hak Sewa / Leasehold",
  hgb: "Hak Guna Bangunan / HGB",
  hak_pakai: "Hak Pakai",
  lainnya: "Lainnya",
};

function toRecord(value: unknown): DraftRecord {
  if (typeof value === "object" && value !== null) {
    return value as DraftRecord;
  }

  return {};
}

function getString(source: DraftRecord, key: string) {
  const value = source[key];

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function getNestedRecord(source: DraftRecord, key: string) {
  return toRecord(source[key]);
}

function mergeChecklist(...groups: ChecklistItem[][]) {
  return Array.from(
    new Map(groups.flat().map((item) => [item.key, item])).values()
  );
}

function cleanNumber(value: string) {
  return value.replace(/[^\d]/g, "");
}

function cleanDecimal(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value !== "string") return 0;

  const parsed = Number(value.replace(/[^\d.]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRupiah(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function getOwnerPackageLabel(plan?: string) {
  if (plan === "featured") return "Featured";
  if (plan === "priority") return "Priority";
  return "Basic";
}

function convertLandToSqm(size: number, unit: string) {
  if (!size || size <= 0) return 0;

  if (unit === "are") return size * 100;
  if (unit === "hectare") return size * 10000;
  if (unit === "acre") return size * 4046.8564224;

  return size;
}

export default function ListingForm<TDraft extends DraftRecord = DraftRecord>(
  props: Props<TDraft>
) {
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
  const draftRecord = toRecord(draft);

  const listingType = getString(draftRecord, "listingType");
  const propertyType = getString(draftRecord, "propertyType");
  const ownershipType = getString(draftRecord, "jenisKepemilikan");
  const savedSaleType = getString(draftRecord, "saleType");

  const isDisewa = listingType === "disewa";
  const isSaleLike = !isDisewa;
  const hasPlan = Boolean(getString(draftRecord, "plan"));

  const inferredSaleType =
    savedSaleType ||
    (ownershipType.toLowerCase().includes("lease") ||
    ownershipType.toLowerCase().includes("hak sewa")
      ? "leasehold"
      : "");

  const saleType = inferredSaleType;
  const isLeaseholdSale = isSaleLike && saleType === "leasehold";

  const isStudio = propertyType === "studio";
  const isApartment = ["apartemen", "studio"].includes(propertyType);
  const isTanah = propertyType === "tanah";
  const isIndustrial = ["gudang", "pabrik"].includes(propertyType);
  const isRuko = propertyType === "ruko";
  const isRukos = propertyType === "rukos";
  const isCommercial = ["kantor", "ruko", "kios", "komersial"].includes(
    propertyType
  );
  const isHospitality = ["guesthouse", "hotel", "kos", "resort"].includes(
    propertyType
  );
  const isHouseLike = ["rumah", "vila"].includes(propertyType);

  const usesLandSize = !isApartment;
  const usesBuildingSize = !isTanah;

  const showBedroomField =
    !isStudio && (isHouseLike || isApartment || isHospitality || isRukos);
  const showBedroomInput = isHospitality;
  const showBedroomSelect = showBedroomField && !showBedroomInput;

  const showBathroomField = !isTanah;
  const showBathroomInput = isHospitality;
  const showBathroomSelect = showBathroomField && !showBathroomInput;

  const showMaidRoom =
    isHouseLike || ["guesthouse", "hotel", "resort"].includes(propertyType);
  const showFurnishing = !isTanah && !isIndustrial;
  const showParking = !isTanah;
  const showFloor = !isTanah;
  const showUnitFloor = isApartment;
  const showTowerBlock = isApartment;
  const showCeilingHeight = isIndustrial || isCommercial;
  const showRoadAccess = isTanah || isIndustrial;
  const showDimensionFields = isTanah || isIndustrial;
  const showFacilities = !isTanah;
  const showNearby = true;

  const showLegalFields = isSaleLike;
  const showMarketType = isSaleLike;
  const showSaleType = isSaleLike;
  const showLandTypeField = showLegalFields && !isApartment;
  const showZoningField = showLegalFields && !isApartment;

  const price = parseNumber(draftRecord.price);
  const landSize = parseNumber(draftRecord.lt);
  const buildingSize = parseNumber(draftRecord.lb);
  const landUnit = getString(draftRecord, "landUnit") || "m2";
  const leaseYears = parseNumber(draftRecord.leaseYears);
  const landSqm = usesLandSize ? convertLandToSqm(landSize, landUnit) : 0;

  const autoCalculation = useMemo(() => {
    const hasPrice = price > 0;
    const hasLand = landSqm > 0;
    const hasBuilding = usesBuildingSize && buildingSize > 0;

    if (!hasPrice || (!hasLand && !hasBuilding)) {
      return {
        hasCalculation: false,
        landPricePerSqm: 0,
        landPricePerAre: 0,
        landPricePerHectare: 0,
        buildingPricePerSqm: 0,
        leaseLandPricePerSqmPerYear: 0,
        leaseLandPricePerArePerYear: 0,
        leaseBuildingPricePerSqmPerYear: 0,
      };
    }

    const landPricePerSqm = hasLand ? price / landSqm : 0;
    const landPricePerAre = hasLand ? price / (landSqm / 100) : 0;
    const landPricePerHectare = hasLand ? price / (landSqm / 10000) : 0;
    const buildingPricePerSqm = hasBuilding ? price / buildingSize : 0;

    const hasLeaseYears = isLeaseholdSale && leaseYears > 0;

    return {
      hasCalculation: true,
      landPricePerSqm,
      landPricePerAre,
      landPricePerHectare,
      buildingPricePerSqm,
      leaseLandPricePerSqmPerYear:
        hasLeaseYears && hasLand ? landPricePerSqm / leaseYears : 0,
      leaseLandPricePerArePerYear:
        hasLeaseYears && hasLand ? landPricePerAre / leaseYears : 0,
      leaseBuildingPricePerSqmPerYear:
        hasLeaseYears && hasBuilding ? buildingPricePerSqm / leaseYears : 0,
    };
  }, [
    price,
    landSqm,
    buildingSize,
    usesBuildingSize,
    isLeaseholdSale,
    leaseYears,
  ]);

  const facilityItems = useMemo(() => {
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
        label: "Water Heater",
      },
      {
        key: "fac_kitchen_set",
        label: "Kitchen Set",
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
      { key: "fac_carport", label: "Carport" },
      {
        key: "fac_garage",
        label: lang === "id" ? "Garasi" : "Garage",
      },
      {
        key: "fac_maid_room",
        label: lang === "id" ? "Kamar ART" : "Maid Room",
      },
      { key: "fac_smart_lock", label: "Smart Lock" },
      { key: "fac_smart_home", label: "Smart Home" },
      { key: "fac_rooftop", label: "Rooftop" },
      { key: "fac_gazebo", label: "Gazebo" },
    ];

    const apartmentFacilities: ChecklistItem[] = [
      { key: "fac_lift", label: "Lift" },
      { key: "fac_gym", label: "Gym" },
      {
        key: "fac_shared_pool",
        label: lang === "id" ? "Kolam Renang Bersama" : "Shared Pool",
      },
      { key: "fac_lobby", label: "Lobby" },
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
      { key: "fac_function_room", label: "Function Room" },
      {
        key: "fac_playground",
        label: lang === "id" ? "Taman Bermain Anak" : "Kids Playground",
      },
    ];

    const industrialFacilities: ChecklistItem[] = [
      { key: "fac_loading_dock", label: "Loading Dock" },
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
      { key: "fac_generator", label: "Generator" },
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
      { key: "fac_spa", label: "Spa" },
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
      { key: "fac_lobby", label: "Lobby" },
      {
        key: "fac_reception",
        label: lang === "id" ? "Resepsionis" : "Reception",
      },
      {
        key: "fac_meeting_room",
        label: lang === "id" ? "Ruang Meeting" : "Meeting Room",
      },
      { key: "fac_generator", label: "Generator" },
      { key: "fac_lift", label: "Lift" },
    ];

    if (isApartment) return mergeChecklist(commonFacilities, apartmentFacilities);
    if (isIndustrial) return mergeChecklist(commonFacilities, industrialFacilities);

    if (isHospitality) {
      return mergeChecklist(
        commonFacilities,
        houseFacilities,
        hospitalityFacilities
      );
    }

    if (isCommercial || isRuko) {
      return mergeChecklist(commonFacilities, commercialFacilities);
    }

    return mergeChecklist(commonFacilities, houseFacilities);
  }, [
    lang,
    isApartment,
    isIndustrial,
    isHospitality,
    isCommercial,
    isRuko,
  ]);

  const nearbyItems = useMemo<ChecklistItem[]>(
    () => [
      { key: "near_cafe", label: "Cafe" },
      {
        key: "near_restaurant",
        label: lang === "id" ? "Restoran" : "Restaurant",
      },
      { key: "near_gym", label: "Gym" },
      {
        key: "near_coworking",
        label: "Co-working Space",
      },
      {
        key: "near_beach_club",
        label: "Beach Club",
      },
      { key: "near_beach", label: lang === "id" ? "Pantai" : "Beach" },
      {
        key: "near_supermarket",
        label: "Supermarket",
      },
      {
        key: "near_traditional_market",
        label: lang === "id" ? "Pasar Tradisional" : "Traditional Market",
      },
      { key: "near_mall", label: "Mall" },
      { key: "near_school", label: lang === "id" ? "Sekolah" : "School" },
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
      { key: "near_clinic", label: lang === "id" ? "Klinik" : "Clinic" },
      {
        key: "near_pharmacy",
        label: lang === "id" ? "Apotek" : "Pharmacy",
      },
      { key: "near_airport", label: lang === "id" ? "Bandara" : "Airport" },
      { key: "near_port", label: lang === "id" ? "Pelabuhan" : "Port" },
      { key: "near_toll", label: lang === "id" ? "Akses Tol" : "Toll Access" },
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

  const bedSelectOptions = useMemo<OptionItem[]>(
    () => [
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
      { value: "10+", label: "10+" },
    ],
    []
  );

  const bathSelectOptions = useMemo<OptionItem[]>(
    () => [
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
      { value: "10+", label: "10+" },
    ],
    []
  );

  function updateDraft(patch: DraftRecord) {
    setDraft((prev) => {
      const previousDraft = toRecord(prev);

      return {
        ...previousDraft,
        ...patch,
      } as TDraft;
    });
  }

  function updateNestedBoolean(
    parentKey: "fasilitas" | "nearby",
    itemKey: string,
    checked: boolean
  ) {
    setDraft((prev) => {
      const previousDraft = toRecord(prev);
      const previousNested = toRecord(previousDraft[parentKey]);

      return {
        ...previousDraft,
        [parentKey]: {
          ...previousNested,
          [itemKey]: checked,
        },
      } as TDraft;
    });
  }

  function handlePropertyTypeChange(value: string) {
    const nextPatch: DraftRecord = {
      propertyType: value,
    };

    const nextIsStudio = value === "studio";
    const nextIsApartment = ["apartemen", "studio"].includes(value);
    const nextIsTanah = value === "tanah";
    const nextIsIndustrial = ["gudang", "pabrik"].includes(value);
    const nextShowFacilities = !nextIsTanah;
    const nextUsesBuildingSize = !nextIsTanah;
    const nextShowLandDetails = !nextIsApartment;
    const nextShowRoadAndDimension = nextIsTanah || nextIsIndustrial;

    if (nextIsStudio) {
      nextPatch.bed = "studio";
    } else if (getString(draftRecord, "bed") === "studio") {
      nextPatch.bed = "";
    }

    if (!nextShowLandDetails) {
      nextPatch.lt = "";
      nextPatch.landUnit = "";
      nextPatch.frontage = "";
      nextPatch.depth = "";
      nextPatch.dimensionText = "";
      nextPatch.roadAccess = "";
      nextPatch.jenisTanah = "";
      nextPatch.jenisZoning = "";
    }

    if (!nextUsesBuildingSize) {
      nextPatch.lb = "";
      nextPatch.bed = "";
      nextPatch.bath = "";
      nextPatch.maid = "";
      nextPatch.furnishing = "";
      nextPatch.garage = "";
      nextPatch.floor = "";
      nextPatch.unitFloor = "";
      nextPatch.towerBlock = "";
      nextPatch.ceilingHeight = "";
      nextPatch.listrik = "";
      nextPatch.jenisAir = "";
    }

    if (!nextShowRoadAndDimension) {
      nextPatch.frontage = "";
      nextPatch.depth = "";
      nextPatch.dimensionText = "";
      nextPatch.roadAccess = "";
    }

    if (!nextShowFacilities) {
      nextPatch.fasilitas = {};
    }

    updateDraft(nextPatch);
  }

  function handleSaleTypeChange(value: string) {
    const patch: DraftRecord = {
      saleType: value,
      jenisKepemilikan: saleTypeOwnershipMap[value] ?? "",
    };

    if (value !== "leasehold") {
      patch.leaseYears = "";
      patch.leaseUntilYear = "";
      patch.leaseExtendable = "";
    }

    updateDraft(patch);
  }

  function sanitizeHiddenFieldsBeforeNext() {
    const patch: DraftRecord = {};

    if (isDisewa) {
      patch.marketType = "";
      patch.saleType = "";
      patch.leaseYears = "";
      patch.leaseUntilYear = "";
      patch.leaseExtendable = "";
      patch.sertifikat = "";
      patch.jenisKepemilikan = "";
      patch.jenisTanah = "";
      patch.jenisZoning = "";
    }

    if (!isDisewa) {
      patch.rentalType = "";
    }

    if (!isLeaseholdSale) {
      patch.leaseYears = "";
      patch.leaseUntilYear = "";
      patch.leaseExtendable = "";
    }

    if (isApartment) {
      patch.lt = "";
      patch.landUnit = "";
      patch.frontage = "";
      patch.depth = "";
      patch.dimensionText = "";
      patch.roadAccess = "";
      patch.jenisTanah = "";
      patch.jenisZoning = "";
    }

    if (isStudio) {
      patch.bed = "studio";
    }

    if (isTanah) {
      patch.lb = "";
      patch.bed = "";
      patch.bath = "";
      patch.maid = "";
      patch.furnishing = "";
      patch.garage = "";
      patch.floor = "";
      patch.unitFloor = "";
      patch.towerBlock = "";
      patch.ceilingHeight = "";
      patch.listrik = "";
      patch.jenisAir = "";
      patch.fasilitas = {};
    }

    if (!showFacilities) {
      patch.fasilitas = {};
    }

    updateDraft(patch);
  }

  function handleNext() {
    sanitizeHiddenFieldsBeforeNext();
    onNext();
  }

  const propertyTypeOptions: OptionItem[] = [
    { value: "studio", label: "Studio" },
    { value: "rumah", label: lang === "id" ? "Rumah" : "House" },
    { value: "apartemen", label: lang === "id" ? "Apartemen" : "Apartment" },
    { value: "vila", label: lang === "id" ? "Vila" : "Villa" },
    { value: "tanah", label: lang === "id" ? "Tanah" : "Land" },
    { value: "ruko", label: lang === "id" ? "Ruko" : "Shophouse" },
    { value: "rukos", label: lang === "id" ? "Rukos" : "Shop-Boarding House" },
    { value: "kios", label: lang === "id" ? "Kios / Retail" : "Kiosk / Retail" },
    { value: "kantor", label: lang === "id" ? "Kantor" : "Office" },
    { value: "komersial", label: lang === "id" ? "Komersial" : "Commercial" },
    { value: "gudang", label: lang === "id" ? "Gudang" : "Warehouse" },
    { value: "pabrik", label: lang === "id" ? "Pabrik" : "Factory" },
    { value: "kos", label: lang === "id" ? "Kos" : "Boarding House" },
    { value: "guesthouse", label: "Guesthouse" },
    { value: "hotel", label: "Hotel" },
    { value: "resort", label: "Resort" },
  ];

  const zoningOptions: OptionItem[] = [
    {
      value: "permukiman",
      label:
        lang === "id"
          ? "Permukiman / Residential"
          : "Residential / Permukiman",
    },
    {
      value: "perdagangan_jasa",
      label:
        lang === "id"
          ? "Perdagangan & Jasa / Commercial"
          : "Commercial / Trade & Services",
    },
    {
      value: "pariwisata",
      label: lang === "id" ? "Pariwisata / Tourism" : "Tourism / Pariwisata",
    },
    {
      value: "campuran",
      label: lang === "id" ? "Campuran / Mixed-use" : "Mixed-use / Campuran",
    },
    {
      value: "industri",
      label: lang === "id" ? "Industri" : "Industrial",
    },
    {
      value: "pergudangan",
      label: lang === "id" ? "Pergudangan" : "Warehousing",
    },
    {
      value: "pertanian",
      label: lang === "id" ? "Pertanian" : "Agricultural",
    },
    {
      value: "perkebunan",
      label: lang === "id" ? "Perkebunan" : "Plantation",
    },
    {
      value: "sawah_lahan_pangan",
      label: lang === "id" ? "Sawah / Lahan Pangan" : "Rice Field / Food Land",
    },
    {
      value: "konservasi_lindung",
      label: lang === "id" ? "Konservasi / Lindung" : "Conservation / Protected",
    },
    {
      value: "fasilitas_umum_sosial",
      label:
        lang === "id"
          ? "Fasilitas Umum / Sosial"
          : "Public / Social Facilities",
    },
    {
      value: "tidak_tahu",
      label:
        lang === "id"
          ? "Tidak Tahu / Perlu Cek RDTR"
          : "Not Sure / Need RDTR Check",
    },
  ];

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
              {getOwnerPackageLabel(getString(draftRecord, "plan"))}
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
                    value={propertyType}
                    placeholder={lang === "id" ? "Pilih" : "Select"}
                    options={propertyTypeOptions}
                    onChange={handlePropertyTypeChange}
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
                      value={getString(draftRecord, "rentalType")}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "harian",
                          label: lang === "id" ? "Harian" : "Daily",
                        },
                        {
                          value: "bulanan",
                          label: lang === "id" ? "Bulanan" : "Monthly",
                        },
                        {
                          value: "tahunan",
                          label: lang === "id" ? "Tahunan" : "Yearly",
                        },
                      ]}
                      onChange={(value) => updateDraft({ rentalType: value })}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jenis Penjualan" : "Sale Type"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={saleType}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "freehold",
                          label:
                            lang === "id"
                              ? "Freehold / Hak Milik"
                              : "Freehold / Hak Milik",
                        },
                        {
                          value: "leasehold",
                          label:
                            lang === "id"
                              ? "Leasehold / Hak Sewa"
                              : "Leasehold / Hak Sewa",
                        },
                        {
                          value: "hgb",
                          label:
                            lang === "id"
                              ? "HGB / Hak Guna Bangunan"
                              : "HGB / Right to Build",
                        },
                        {
                          value: "hak_pakai",
                          label:
                            lang === "id" ? "Hak Pakai" : "Right to Use",
                        },
                        {
                          value: "lainnya",
                          label: lang === "id" ? "Lainnya" : "Other",
                        },
                      ]}
                      onChange={handleSaleTypeChange}
                    />
                  </div>
                </div>
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
                  value={getString(draftRecord, "price")}
                  onChange={(e) => updateDraft({ price: cleanNumber(e.target.value) })}
                />
              </div>

              {showMarketType ? (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Primary / Secondary" : "Primary / Secondary"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={getString(draftRecord, "marketType")}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        { value: "primary", label: "Primary" },
                        { value: "secondary", label: "Secondary" },
                      ]}
                      onChange={(value) => updateDraft({ marketType: value })}
                    />
                  </div>
                </div>
              ) : (
                <div />
              )}

              {isLeaseholdSale && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id"
                        ? "Masa Leasehold (Tahun)"
                        : "Leasehold Period (Years)"}
                    </label>
                    <input
                      className={inputBase}
                      inputMode="numeric"
                      placeholder={lang === "id" ? "Contoh: 25" : "Example: 25"}
                      value={getString(draftRecord, "leaseYears")}
                      onChange={(e) =>
                        updateDraft({ leaseYears: cleanNumber(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id"
                        ? "Leasehold Sampai Tahun"
                        : "Leasehold Until Year"}
                    </label>
                    <input
                      className={inputBase}
                      inputMode="numeric"
                      placeholder={lang === "id" ? "Contoh: 2050" : "Example: 2050"}
                      value={getString(draftRecord, "leaseUntilYear")}
                      onChange={(e) =>
                        updateDraft({
                          leaseUntilYear: cleanNumber(e.target.value).slice(0, 4),
                        })
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id"
                        ? "Bisa Diperpanjang?"
                        : "Can Be Extended?"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={getString(draftRecord, "leaseExtendable")}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "ya", label: lang === "id" ? "Ya" : "Yes" },
                          {
                            value: "tidak",
                            label: lang === "id" ? "Tidak" : "No",
                          },
                          {
                            value: "tidak_tahu",
                            label:
                              lang === "id" ? "Tidak Tahu" : "Not Sure",
                          },
                        ]}
                        onChange={(value) =>
                          updateDraft({ leaseExtendable: value })
                        }
                      />
                    </div>
                  </div>
                </>
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
                      inputMode="decimal"
                      placeholder={lang === "id" ? "Contoh: 120" : "Example: 120"}
                      value={getString(draftRecord, "lt")}
                      onChange={(e) => updateDraft({ lt: cleanDecimal(e.target.value) })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Satuan Luas Tanah" : "Land Size Unit"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={getString(draftRecord, "landUnit") || "m2"}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "m2", label: "m²" },
                          { value: "are", label: "Are" },
                          {
                            value: "hectare",
                            label: lang === "id" ? "Hektare" : "Hectare",
                          },
                          { value: "acre", label: "Acre" },
                        ]}
                        onChange={(value) => updateDraft({ landUnit: value })}
                      />
                    </div>
                  </div>
                </>
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
                      value={getString(draftRecord, "frontage")}
                      onChange={(e) =>
                        updateDraft({ frontage: cleanDecimal(e.target.value) })
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
                      value={getString(draftRecord, "depth")}
                      onChange={(e) =>
                        updateDraft({ depth: cleanDecimal(e.target.value) })
                      }
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Dimensi" : "Dimension"}
                    </label>
                    <input
                      className={inputBase}
                      placeholder={
                        lang === "id" ? "Contoh: 10 x 20" : "Example: 10 x 20"
                      }
                      value={getString(draftRecord, "dimensionText")}
                      onChange={(e) =>
                        updateDraft({ dimensionText: e.target.value })
                      }
                    />
                  </div>
                </>
              )}

              {usesBuildingSize && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {isApartment
                      ? lang === "id"
                        ? "Luas Unit (m²)"
                        : "Unit Size (m²)"
                      : lang === "id"
                        ? "Luas Bangunan (LB) m²"
                        : "Building Size (LB) m²"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="decimal"
                    placeholder={lang === "id" ? "Contoh: 90" : "Example: 90"}
                    value={getString(draftRecord, "lb")}
                    onChange={(e) => updateDraft({ lb: cleanDecimal(e.target.value) })}
                  />
                </div>
              )}

              {autoCalculation.hasCalculation && (
                <div className="md:col-span-2">
                  <div className="rounded-3xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                    <h2 className="text-sm font-bold text-[#1C1C1E] sm:text-base">
                      {lang === "id"
                        ? "Estimasi Harga Otomatis"
                        : "Automatic Price Estimate"}
                    </h2>

                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {landSqm > 0 && (
                        <>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs text-gray-500">
                              {lang === "id"
                                ? "Harga per m² tanah"
                                : "Land price per m²"}
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                              {formatRupiah(autoCalculation.landPricePerSqm)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs text-gray-500">
                              {lang === "id" ? "Harga per are" : "Price per are"}
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                              {formatRupiah(autoCalculation.landPricePerAre)}
                            </p>
                          </div>

                          {landSqm >= 10000 && (
                            <div className="rounded-2xl bg-white p-4">
                              <p className="text-xs text-gray-500">
                                {lang === "id"
                                  ? "Harga per hektare"
                                  : "Price per hectare"}
                              </p>
                              <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                                {formatRupiah(
                                  autoCalculation.landPricePerHectare
                                )}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {buildingSize > 0 && usesBuildingSize && (
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs text-gray-500">
                            {isApartment
                              ? lang === "id"
                                ? "Harga per m² unit"
                                : "Unit price per m²"
                              : lang === "id"
                                ? "Harga per m² bangunan"
                                : "Building price per m²"}
                          </p>
                          <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                            {formatRupiah(autoCalculation.buildingPricePerSqm)}
                          </p>
                        </div>
                      )}

                      {isLeaseholdSale && leaseYears > 0 && landSqm > 0 && (
                        <>
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs text-gray-500">
                              {lang === "id"
                                ? "Harga tanah per m² / tahun"
                                : "Land price per m² / year"}
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                              {formatRupiah(
                                autoCalculation.leaseLandPricePerSqmPerYear
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs text-gray-500">
                              {lang === "id"
                                ? "Harga per are / tahun"
                                : "Price per are / year"}
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                              {formatRupiah(
                                autoCalculation.leaseLandPricePerArePerYear
                              )}
                            </p>
                          </div>
                        </>
                      )}

                      {isLeaseholdSale &&
                        leaseYears > 0 &&
                        buildingSize > 0 &&
                        usesBuildingSize && (
                          <div className="rounded-2xl bg-white p-4">
                            <p className="text-xs text-gray-500">
                              {lang === "id"
                                ? "Harga bangunan/unit per m² / tahun"
                                : "Building/unit price per m² / year"}
                            </p>
                            <p className="mt-1 text-sm font-bold text-[#1C1C1E]">
                              {formatRupiah(
                                autoCalculation.leaseBuildingPricePerSqmPerYear
                              )}
                            </p>
                          </div>
                        )}
                    </div>

                    <p className="mt-4 text-xs leading-5 text-gray-500">
                      {lang === "id"
                        ? "Perhitungan ini otomatis berdasarkan harga dan luas yang diisi. Nilai akhir properti tetap dapat dipengaruhi oleh lokasi, kondisi bangunan, legalitas, akses jalan, furnishing, dan fasilitas."
                        : "This is an automatic estimate based on the entered price and size. Final property value may still depend on location, building condition, legality, road access, furnishing, and facilities."}
                    </p>
                  </div>
                </div>
              )}

              {isStudio && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Kamar Tidur" : "Bedrooms"}
                  </label>
                  <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-[#1C1C1E]">
                    Studio
                  </div>
                </div>
              )}

              {showBedroomSelect && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Kamar Tidur" : "Bedrooms"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={getString(draftRecord, "bed")}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={bedSelectOptions}
                      onChange={(value) => updateDraft({ bed: value })}
                    />
                  </div>
                </div>
              )}

              {showBedroomInput && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id"
                      ? "Jumlah Kamar / Bedroom"
                      : "Total Rooms / Bedrooms"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    placeholder={lang === "id" ? "Contoh: 24" : "Example: 24"}
                    value={getString(draftRecord, "bed")}
                    onChange={(e) => updateDraft({ bed: cleanNumber(e.target.value) })}
                  />
                </div>
              )}

              {showBathroomSelect && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Kamar Mandi" : "Bathrooms"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={getString(draftRecord, "bath")}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={bathSelectOptions}
                      onChange={(value) => updateDraft({ bath: value })}
                    />
                  </div>
                </div>
              )}

              {showBathroomInput && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Jumlah Kamar Mandi" : "Total Bathrooms"}
                  </label>
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    placeholder={lang === "id" ? "Contoh: 24" : "Example: 24"}
                    value={getString(draftRecord, "bath")}
                    onChange={(e) => updateDraft({ bath: cleanNumber(e.target.value) })}
                  />
                </div>
              )}

              {showMaidRoom && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    {lang === "id" ? "Kamar ART" : "Maid Room"}
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={getString(draftRecord, "maid")}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        { value: "0", label: "0" },
                        { value: "1", label: "1" },
                        { value: "2", label: "2" },
                        { value: "3", label: "3" },
                        { value: "4+", label: "4+" },
                      ]}
                      onChange={(value) => updateDraft({ maid: value })}
                    />
                  </div>
                </div>
              )}

              {showFurnishing && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    Furnishing
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={getString(draftRecord, "furnishing")}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "unfurnished",
                          label:
                            lang === "id" ? "Tanpa Furnitur" : "Unfurnished",
                        },
                        {
                          value: "semi",
                          label: "Semi Furnished",
                        },
                        {
                          value: "full",
                          label: "Full Furnished",
                        },
                      ]}
                      onChange={(value) => updateDraft({ furnishing: value })}
                    />
                  </div>
                </div>
              )}

              {showParking && (
                <div>
                  <label className="block text-sm font-semibold text-[#1C1C1E]">
                    Parking
                  </label>
                  <div className="mt-2">
                    <TetamoSelect
                      value={getString(draftRecord, "garage")}
                      placeholder={lang === "id" ? "Pilih" : "Select"}
                      options={[
                        {
                          value: "ada",
                          label: lang === "id" ? "Ada" : "Available",
                        },
                        {
                          value: "tidak_ada",
                          label: lang === "id" ? "Tidak Ada" : "Not Available",
                        },
                      ]}
                      onChange={(value) => updateDraft({ garage: value })}
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
                      value={getString(draftRecord, "floor")}
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
                      onChange={(value) => updateDraft({ floor: value })}
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
                    value={getString(draftRecord, "unitFloor")}
                    onChange={(e) =>
                      updateDraft({ unitFloor: cleanNumber(e.target.value) })
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
                    placeholder={
                      lang === "id" ? "Contoh: Tower A" : "Example: Tower A"
                    }
                    value={getString(draftRecord, "towerBlock")}
                    onChange={(e) => updateDraft({ towerBlock: e.target.value })}
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
                    value={getString(draftRecord, "ceilingHeight")}
                    onChange={(e) =>
                      updateDraft({ ceilingHeight: cleanDecimal(e.target.value) })
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
                      lang === "id"
                        ? "Contoh: Jalan 6 meter"
                        : "Example: 6-meter road"
                    }
                    value={getString(draftRecord, "roadAccess")}
                    onChange={(e) => updateDraft({ roadAccess: e.target.value })}
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
                      placeholder={
                        lang === "id" ? "Contoh: 2200 VA" : "Example: 2200 VA"
                      }
                      value={getString(draftRecord, "listrik")}
                      onChange={(e) => updateDraft({ listrik: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Jenis Air" : "Water Type"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={getString(draftRecord, "jenisAir")}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "pdam", label: "PDAM" },
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
                        onChange={(value) => updateDraft({ jenisAir: value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {showLegalFields && (
              <div className="mt-6 border-t border-gray-100 pt-6 sm:pt-8">
                <h2 className="text-sm font-bold text-[#1C1C1E] sm:text-base">
                  {lang === "id"
                    ? "Legal & Peruntukan Lahan"
                    : "Legal & Land Use"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {lang === "id"
                    ? "Lengkapi informasi legal dan peruntukan lahan sesuai data yang tersedia."
                    : "Complete the legal and land-use information based on available data."}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Sertifikat" : "Certificate"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={getString(draftRecord, "sertifikat")}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          { value: "SHM", label: "SHM" },
                          { value: "SHGB", label: "SHGB / HGB" },
                          { value: "SHMSRS", label: "SHMSRS / Strata Title" },
                          { value: "Hak Pakai", label: "Hak Pakai" },
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
                        onChange={(value) => updateDraft({ sertifikat: value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1C1C1E]">
                      {lang === "id" ? "Jenis Kepemilikan" : "Ownership Type"}
                    </label>
                    <div className="mt-2">
                      <TetamoSelect
                        value={getString(draftRecord, "jenisKepemilikan")}
                        placeholder={lang === "id" ? "Pilih" : "Select"}
                        options={[
                          {
                            value: "Hak Milik / Freehold",
                            label:
                              lang === "id"
                                ? "Hak Milik / Freehold"
                                : "Freehold / Hak Milik",
                          },
                          {
                            value: "Hak Sewa / Leasehold",
                            label:
                              lang === "id"
                                ? "Hak Sewa / Leasehold"
                                : "Leasehold / Hak Sewa",
                          },
                          {
                            value: "Hak Guna Bangunan / HGB",
                            label:
                              lang === "id"
                                ? "Hak Guna Bangunan / HGB"
                                : "Right to Build / HGB",
                          },
                          {
                            value: "Hak Pakai",
                            label:
                              lang === "id" ? "Hak Pakai" : "Right to Use",
                          },
                          { value: "Strata Title", label: "Strata Title" },
                          {
                            value: "Corporate Ownership",
                            label:
                              lang === "id"
                                ? "Kepemilikan Perusahaan"
                                : "Corporate Ownership",
                          },
                          {
                            value: "Shared Ownership",
                            label:
                              lang === "id"
                                ? "Kepemilikan Bersama"
                                : "Shared Ownership",
                          },
                          {
                            value: "Lainnya",
                            label: lang === "id" ? "Lainnya" : "Other",
                          },
                        ]}
                        onChange={(value) =>
                          updateDraft({ jenisKepemilikan: value })
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
                          value={getString(draftRecord, "jenisTanah")}
                          placeholder={lang === "id" ? "Pilih" : "Select"}
                          options={[
                            {
                              value: "tanah_hunian",
                              label:
                                lang === "id"
                                  ? "Tanah Hunian"
                                  : "Residential Land",
                            },
                            {
                              value: "tanah_komersial",
                              label:
                                lang === "id"
                                  ? "Tanah Komersial"
                                  : "Commercial Land",
                            },
                            {
                              value: "tanah_pariwisata",
                              label:
                                lang === "id"
                                  ? "Tanah Pariwisata"
                                  : "Tourism Land",
                            },
                            {
                              value: "tanah_pertanian",
                              label:
                                lang === "id"
                                  ? "Tanah Pertanian"
                                  : "Agricultural Land",
                            },
                            {
                              value: "tanah_industri",
                              label:
                                lang === "id"
                                  ? "Tanah Industri"
                                  : "Industrial Land",
                            },
                            {
                              value: "tanah_campuran",
                              label:
                                lang === "id"
                                  ? "Tanah Campuran / Mixed-use"
                                  : "Mixed-use Land",
                            },
                            {
                              value: "sawah",
                              label: lang === "id" ? "Sawah" : "Rice Field",
                            },
                            {
                              value: "perkebunan",
                              label:
                                lang === "id" ? "Perkebunan" : "Plantation",
                            },
                            { value: "beachfront", label: "Beachfront" },
                            { value: "riverfront", label: "Riverfront" },
                            { value: "hilltop", label: "Hilltop" },
                            {
                              value: "lainnya",
                              label: lang === "id" ? "Lainnya" : "Other",
                            },
                          ]}
                          onChange={(value) =>
                            updateDraft({ jenisTanah: value })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {showZoningField && (
                    <div>
                      <label className="block text-sm font-semibold text-[#1C1C1E]">
                        {lang === "id"
                          ? "Zoning / Peruntukan Lahan"
                          : "Zoning / Land Use"}
                      </label>
                      <div className="mt-2">
                        <TetamoSelect
                          value={getString(draftRecord, "jenisZoning")}
                          placeholder={lang === "id" ? "Pilih" : "Select"}
                          options={zoningOptions}
                          onChange={(value) =>
                            updateDraft({ jenisZoning: value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {showZoningField && (
                  <p className="mt-4 text-xs leading-5 text-gray-500">
                    {lang === "id"
                      ? "Informasi zoning/peruntukan lahan perlu dikonfirmasi kembali melalui RDTR, RTRW, atau pihak berwenang setempat. Contoh istilah lokal: Yellow Zone = Permukiman, Pink Zone = Pariwisata, Green Zone = Pertanian/Lindung."
                      : "Zoning/land-use information should be reconfirmed through RDTR, RTRW, or the relevant local authority. Local example: Yellow Zone = Residential, Pink Zone = Tourism, Green Zone = Agricultural/Protected."}
                  </p>
                )}
              </div>
            )}

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
                          const checked = Boolean(
                            getNestedRecord(draftRecord, "fasilitas")[item.key]
                          );

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
                                  updateNestedBoolean(
                                    "fasilitas",
                                    item.key,
                                    e.target.checked
                                  )
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
                          const checked = Boolean(
                            getNestedRecord(draftRecord, "nearby")[item.key]
                          );

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
                                  updateNestedBoolean(
                                    "nearby",
                                    item.key,
                                    e.target.checked
                                  )
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

            <div className="mt-8">
              <button
                type="button"
                onClick={handleNext}
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