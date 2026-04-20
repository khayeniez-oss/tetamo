"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  AGENT_PACKAGES,
  getAgentPackageById,
  getAddOnProductById,
  getAnyProductById,
} from "@/app/data/pricelist";
import type {
  TetamoPayment,
  TetamoPaymentFlow,
  TetamoProductType,
} from "@/types/payment";

type ExistingProperty = {
  id: string;
  title: string | null;
  listing_type: string | null;
  province: string | null;
  city: string | null;
  kode: string | null;
  property_images: { id: string }[] | null;
};

type BillingCycle = "monthly" | "yearly";
type GatewayType = "stripe" | "xendit";

type AgentPackageUI = (typeof AGENT_PACKAGES)[number] & {
  availableBillingCycles?: BillingCycle[];
  monthlyPriceIdr?: number;
  monthlyCommitmentMonths?: number;
  monthlyBillingNote?: string;
  packageTermDays?: number;
  billingIntervalDays?: number;
  cancelStopsFutureRenewalOnly?: boolean;
  listingLimit?: number;
  activeListings?: number;
};

type AddOnProductUI = Exclude<ReturnType<typeof getAddOnProductById>, null>;

type EducationProductUI = Extract<
  NonNullable<ReturnType<typeof getAnyProductById>>,
  { productType: "education" }
>;

type SelectedProduct =
  | AgentPackageUI
  | AddOnProductUI
  | EducationProductUI
  | null;

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function cleanProviderWords(value: string | null | undefined) {
  return String(value || "")
    .replace(/stripe/gi, "secure payment")
    .replace(/xendit/gi, "payment provider");
}

function normalizePaymentFlow(
  value: string,
  isAddon: boolean,
  isEducation: boolean,
  productId: string
): TetamoPaymentFlow {
  const v = value.toLowerCase();

  if (isEducation) return "education-access";

  if (isAddon) {
    if (productId === "homepage-spotlight") return "homepage-spotlight";
    return "boost-listing";
  }

  if (
    v === "agent-membership" ||
    v === "boost-listing" ||
    v === "homepage-spotlight" ||
    v === "renew-listing" ||
    v === "new-listing" ||
    v === "education-access"
  ) {
    return v;
  }

  return "agent-membership";
}

function normalizeProductType(value?: string | null): TetamoProductType {
  const v = String(value || "").toLowerCase();

  if (v === "membership" || v === "addon" || v === "education") return v;
  return "listing";
}

function isMembershipProduct(
  product: SelectedProduct
): product is AgentPackageUI {
  return Boolean(product && product.productType === "membership");
}

function isEducationProduct(
  product: SelectedProduct
): product is EducationProductUI {
  return Boolean(product && product.productType === "education");
}

function finalKodeForDisplay(
  existingKode?: string | null,
  urlKode?: string | null
) {
  return existingKode || urlKode || "-";
}

function getListingLimit(product: SelectedProduct) {
  if (!product || !isMembershipProduct(product)) return 0;

  const direct =
    Number(product.listingLimit || 0) || Number(product.activeListings || 0);

  if (direct > 0) return direct;

  const featureText = (product.features || []).join(" ");
  const match = featureText.match(/(\d+)\s*(Listing|Listings)/i);

  if (match?.[1]) return Number(match[1]);

  return 0;
}

function getMembershipTotal(product: AgentPackageUI, cycle: BillingCycle) {
  if (cycle === "monthly") {
    if (typeof product.monthlyPriceIdr === "number") {
      return product.monthlyPriceIdr;
    }

    if (product.billingCycle === "monthly") {
      return product.priceIdr;
    }

    return Math.ceil(product.priceIdr / 12);
  }

  return product.priceIdr;
}

function getAvailableBillingCycles(product: AgentPackageUI): BillingCycle[] {
  const cycles = new Set<BillingCycle>();

  if (product.availableBillingCycles?.includes("monthly")) {
    cycles.add("monthly");
  }

  if (product.availableBillingCycles?.includes("yearly")) {
    cycles.add("yearly");
  }

  if (product.billingCycle === "monthly") cycles.add("monthly");
  if (product.billingCycle === "yearly") cycles.add("yearly");

  if (product.monthlyPriceIdr && product.monthlyPriceIdr > 0) {
    cycles.add("monthly");
  }

  if (product.priceIdr && product.priceIdr > 0) {
    cycles.add(product.billingCycle === "monthly" ? "monthly" : "yearly");
  }

  if (cycles.size === 0) cycles.add("yearly");

  return Array.from(cycles);
}

function getBillingCycleLabel(cycle: BillingCycle, lang: "id" | "en") {
  if (lang === "id") return cycle === "monthly" ? "Bulanan" : "Tahunan";
  return cycle === "monthly" ? "Monthly" : "Yearly";
}

function getProductName(
  product: SelectedProduct,
  cycle: BillingCycle,
  lang: "id" | "en"
) {
  if (!product) return "-";

  if (isMembershipProduct(product)) {
    if (cycle === "monthly") {
      return lang === "id"
        ? `${product.name} - Tagihan Bulanan`
        : `${product.name} - Monthly Billing`;
    }

    return product.name;
  }

  if (product.id === "boost-listing") {
    return "Boost Listing";
  }

  if (product.id === "homepage-spotlight") {
    return "Homepage Spotlight";
  }

  if (product.id === "education-pass") {
    return "Education Pass";
  }

  return cleanProviderWords(product.name);
}

function getPaymentTitle(
  product: SelectedProduct,
  cycle: BillingCycle,
  lang: "id" | "en"
) {
  if (!product) return lang === "id" ? "Pembayaran Agen" : "Agent Payment";

  if (isMembershipProduct(product)) {
    return lang === "id"
      ? `Pembayaran ${getProductName(product, cycle, lang)}`
      : `${getProductName(product, cycle, lang)} Payment`;
  }

  if (product.id === "boost-listing") {
    return lang === "id" ? "Pembayaran Boost Listing" : "Boost Listing Payment";
  }

  if (product.id === "homepage-spotlight") {
    return lang === "id"
      ? "Pembayaran Homepage Spotlight"
      : "Homepage Spotlight Payment";
  }

  if (product.id === "education-pass") {
    return lang === "id"
      ? "Pembayaran Education Pass"
      : "Education Pass Payment";
  }

  return cleanProviderWords(product.paymentTitle || product.name);
}

function getPaymentDescription(
  product: SelectedProduct,
  cycle: BillingCycle,
  lang: "id" | "en",
  listingLimit: number
) {
  if (!product) {
    return lang === "id"
      ? "Detail pembayaran akan mengikuti produk yang dipilih."
      : "Payment details will follow the selected product.";
  }

  if (isMembershipProduct(product)) {
    const cycleLabel = getBillingCycleLabel(cycle, lang);

    if (lang === "id") {
      return `Tinjau paket ${product.name} dengan tipe tagihan ${cycleLabel}. Paket ini mencakup ${
        listingLimit > 0 ? `${listingLimit} listing aktif` : "akses membership agen"
      }.`;
    }

    return `Review the ${product.name} package with ${cycleLabel} billing. This package includes ${
      listingLimit > 0 ? `${listingLimit} active listings` : "agent membership access"
    }.`;
  }

  if (product.id === "boost-listing") {
    return lang === "id"
      ? "Boost Listing membantu listing Anda tampil dengan prioritas lebih tinggi di marketplace."
      : "Boost Listing helps your listing appear with higher priority in the marketplace.";
  }

  if (product.id === "homepage-spotlight") {
    return lang === "id"
      ? "Homepage Spotlight membantu listing Anda tampil di area promosi homepage Tetamo."
      : "Homepage Spotlight helps your listing appear in Tetamo’s homepage promotion area.";
  }

  if (product.id === "education-pass") {
    return lang === "id"
      ? "Education Pass memberikan akses ke materi edukasi premium Tetamo selama masa aktif produk."
      : "Education Pass gives access to Tetamo premium education materials during the active period.";
  }

  return cleanProviderWords(product.paymentDescription);
}

function getBillingNote(
  product: SelectedProduct,
  cycle: BillingCycle,
  lang: "id" | "en"
) {
  if (!product) {
    return lang === "id"
      ? "Detail pembayaran akan mengikuti produk yang dipilih."
      : "Payment details will follow the selected product.";
  }

  if (isMembershipProduct(product)) {
    if (cycle === "monthly") {
      const months = product.monthlyCommitmentMonths ?? 12;

      return lang === "id"
        ? `Pembayaran bulanan berlaku dengan komitmen ${months} bulan. Membership akan aktif sesuai masa paket setelah pembayaran berhasil.`
        : `Monthly billing applies with a ${months}-month commitment. Membership will be activated according to the package term after successful payment.`;
    }

    return lang === "id"
      ? "Membership akan aktif setelah pembayaran berhasil dan tercatat di sistem Tetamo."
      : "Membership will be activated after successful payment and recorded in the Tetamo system.";
  }

  if (product.id === "boost-listing") {
    return lang === "id"
      ? "Boost akan aktif setelah pembayaran berhasil."
      : "Boost will be activated after successful payment.";
  }

  if (product.id === "homepage-spotlight") {
    return lang === "id"
      ? "Spotlight akan aktif setelah pembayaran berhasil."
      : "Spotlight will be activated after successful payment.";
  }

  if (product.id === "education-pass") {
    return lang === "id"
      ? "Akses edukasi akan aktif setelah pembayaran berhasil."
      : "Education access will be activated after successful payment.";
  }

  return cleanProviderWords(product.billingNote);
}

function translateFeature(feature: string, lang: "id" | "en") {
  const pairs = [
    ["30 Listing Aktif", "30 Active Listings"],
    ["100 Listing Aktif", "100 Active Listings"],
    ["500 Listing Aktif", "500 Active Listings"],
    ["Membership aktif selama 1 tahun", "Membership active for 1 year"],
    ["Website Profil Agen", "Agent Profile Website"],
    ["Integrasi Media Sosial", "Social Media Integration"],
    ["Dashboard Leads", "Leads Dashboard"],
    ["Jadwal Viewing", "Viewing Schedule"],
    ["Paket & Tagihan", "Package & Billing"],
    ["Pembayaran / Receipt", "Payment / Receipt"],
    ["Analytics / Insights", "Analytics & Insights"],
    ["Tracking Komisi", "Commission Tracking"],
    ["Akses Boost & Spotlight", "Access to Boost & Spotlight"],
    ["1 AI Avatar Video Perkenalan", "1 AI Avatar Introduction Video"],
    [
      "3 Listing Unggulan Gratis (90 hari masing-masing)",
      "3 Free Featured Listings (90 days each)",
    ],
    ["Prioritas visibilitas listing", "Listing visibility priority"],
    [
      "Eligible untuk penempatan Agen Unggulan",
      "Eligible for Featured Agent placement",
    ],
    [
      "Kesempatan eksposur premium di platform",
      "Opportunity for premium platform exposure",
    ],
    ["Slot Agen Unggulan terbatas (7 agen)", "Limited Featured Agent slots (7 agents)"],
    ["Tersedia opsi bayar bulanan", "Monthly payment option available"],
    ["Auto renew aktif secara default", "Auto renew enabled by default"],
    ["Durasi boost 14 hari", "Boost duration 14 days"],
    [
      "Prioritas tampil lebih tinggi di marketplace",
      "Higher priority placement in marketplace",
    ],
    ["Tersedia untuk owner dan agent", "Available for owners and agents"],
    ["Durasi spotlight 7 hari", "Spotlight duration 7 days"],
    ["Tampil di homepage TETAMO", "Displayed on the TETAMO homepage"],
    [
      "Slot terbatas (maksimal 3 listing aktif)",
      "Limited slots (maximum 3 active listings)",
    ],
    [
      "Akses premium video edukasi TETAMO",
      "Access to TETAMO premium education videos",
    ],
    ["Aktif selama 90 hari", "Active for 90 days"],
    [
      "Berlaku untuk owner dan non-member agent",
      "Available for owners and non-member agents",
    ],
    ["Tidak auto renew", "No auto renew"],
  ];

  const found = pairs.find(
    ([idText, enText]) =>
      feature.toLowerCase() === idText.toLowerCase() ||
      feature.toLowerCase() === enText.toLowerCase()
  );

  if (!found) return cleanProviderWords(feature);

  return cleanProviderWords(lang === "id" ? found[0] : found[1]);
}

export default function AgentPembayaranPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const currentLang: "id" | "en" = lang === "id" ? "id" : "en";

  const flow = String(searchParams.get("flow") || "agent-membership");
  const packageFromUrl = String(searchParams.get("package") || "").toLowerCase();
  const productFromUrl = String(searchParams.get("product") || "").toLowerCase();
  const kode = String(searchParams.get("kode") || "");
  const billingFromUrl = String(searchParams.get("billing") || "").toLowerCase();

  const [selectedGateway, setSelectedGateway] =
    useState<GatewayType>("stripe");

  const ui = useMemo(
    () =>
      currentLang === "id"
        ? {
            back: "← Kembali",
            pageTitle: "Pembayaran Agen",
            pageDescEducation:
              "Tinjau Education Pass lalu lanjutkan ke pembayaran.",
            pageDescDefault:
              "Tinjau paket agen atau add-on yang dipilih lalu lanjutkan ke pembayaran.",
            summaryEducation: "Ringkasan Education Pass",
            summaryAddon: "Ringkasan Add-On",
            summaryMembership: "Ringkasan Membership Agen",
            product: "Produk",
            package: "Paket",
            billingType: "Tipe Tagihan",
            activeListingLimit: "Limit Listing Aktif",
            activePeriod: "Masa Aktif",
            autoRenew: "Auto Renew",
            autoRenewDefault: "Aktif secara default",
            listingType: "Tipe Listing",
            location: "Lokasi",
            title: "Judul",
            photos: "Foto",
            photosCount: (count: number) => `${count} foto`,
            loadingListing: "Memuat data listing...",
            failedLoadListing: "Gagal memuat listing",
            secureCheckout: "Aktivasi dilakukan setelah pembayaran terkonfirmasi",
            secureCheckoutDesc:
              "Halaman ini hanya membuat payment checkout. Paket agen, add-on, atau akses edukasi akan aktif setelah pembayaran berhasil terkonfirmasi.",
            chooseBillingType: "Pilih Tipe Tagihan",
            yearly: "Tahunan",
            monthly: "Bulanan",
            month: "bulan",
            year: "tahun",
            commitment: "komitmen",
            addonAppliedTo: "Add-on ini akan diterapkan ke listing dengan kode",
            duration: "Durasi",
            days: "hari",
            cardTitle: "Debit / Credit Card",
            cardSubtitle: "Visa, Mastercard, JCB, American Express",
            otherMethodsTitle: "QRIS / E-Wallet / Virtual Account",
            otherMethodsSubtitle:
              "BCA, BNI, BRI, Mandiri, QRIS, GoPay, OVO, DANA, ShopeePay — coming soon",
            whatYouGet: "Yang Anda Dapatkan",
            total: "Total",
            payNow: "Bayar Sekarang",
            preparingPayment: "Menyiapkan Pembayaran...",
            checkoutNote:
              "Checkout akan dibuat otomatis saat tombol ditekan.",
            listingCodeNotFound: "Kode listing tidak ditemukan.",
            relogin: "Silakan login ulang.",
            listingNotFound: "Listing tidak ditemukan.",
            loginFirst: "Silakan login terlebih dahulu.",
            targetListingNotFound: "Listing target tidak ditemukan.",
            checkoutMissing: "Checkout pembayaran tidak ditemukan.",
            createPaymentFailed: "Gagal membuat pembayaran.",
            genericPaymentError:
              "Terjadi kesalahan saat membuat pembayaran.",
            soldType: "Dijual",
            rentType: "Disewa",
            auctionType: "Lelang",
          }
        : {
            back: "← Back",
            pageTitle: "Agent Payment",
            pageDescEducation:
              "Review the Education Pass, then continue to payment.",
            pageDescDefault:
              "Review the selected agent package or add-on, then continue to payment.",
            summaryEducation: "Education Pass Summary",
            summaryAddon: "Add-On Summary",
            summaryMembership: "Agent Membership Summary",
            product: "Product",
            package: "Package",
            billingType: "Billing Type",
            activeListingLimit: "Active Listing Limit",
            activePeriod: "Active Period",
            autoRenew: "Auto Renew",
            autoRenewDefault: "Enabled by default",
            listingType: "Listing Type",
            location: "Location",
            title: "Title",
            photos: "Photos",
            photosCount: (count: number) => `${count} photos`,
            loadingListing: "Loading listing data...",
            failedLoadListing: "Failed to load listing",
            secureCheckout: "Activation happens after payment is confirmed",
            secureCheckoutDesc:
              "This page only creates the payment checkout. Agent package, add-on, or education access will be activated after successful payment confirmation.",
            chooseBillingType: "Choose Billing Type",
            yearly: "Yearly",
            monthly: "Monthly",
            month: "month",
            year: "year",
            commitment: "commitment",
            addonAppliedTo: "This add-on will be applied to listing code",
            duration: "Duration",
            days: "days",
            cardTitle: "Debit / Credit Card",
            cardSubtitle: "Visa, Mastercard, JCB, American Express",
            otherMethodsTitle: "QRIS / E-Wallet / Virtual Account",
            otherMethodsSubtitle:
              "BCA, BNI, BRI, Mandiri, QRIS, GoPay, OVO, DANA, ShopeePay — coming soon",
            whatYouGet: "What You Get",
            total: "Total",
            payNow: "Pay Now",
            preparingPayment: "Preparing Payment...",
            checkoutNote:
              "Checkout will be created automatically when you click the button.",
            listingCodeNotFound: "Listing code was not found.",
            relogin: "Please log in again.",
            listingNotFound: "Listing was not found.",
            loginFirst: "Please log in first.",
            targetListingNotFound: "Target listing was not found.",
            checkoutMissing: "Payment checkout was not found.",
            createPaymentFailed: "Failed to create payment.",
            genericPaymentError:
              "Something went wrong while creating payment.",
            soldType: "For Sale",
            rentType: "For Rent",
            auctionType: "Auction",
          },
    [currentLang]
  );

  const sortedAgentPackages = useMemo(() => {
    return ([...AGENT_PACKAGES] as AgentPackageUI[]).sort(
      (a, b) => Number(a.priceIdr || 0) - Number(b.priceIdr || 0)
    );
  }, []);

  const fallbackAgentPackageId = sortedAgentPackages[0]?.id ?? "";

  const requestedProductId =
    (productFromUrl || packageFromUrl || fallbackAgentPackageId).toLowerCase();

  const isEducation =
    flow === "education-access" || requestedProductId === "education-pass";

  const isAddon =
    !isEducation &&
    (flow === "addon" ||
      requestedProductId === "boost-listing" ||
      requestedProductId === "homepage-spotlight");

  const needsExistingProperty = isAddon;

  const [submitting, setSubmitting] = useState(false);
  const [existingProperty, setExistingProperty] =
    useState<ExistingProperty | null>(null);
  const [loadingExistingProperty, setLoadingExistingProperty] =
    useState(needsExistingProperty);
  const [existingPropertyError, setExistingPropertyError] = useState("");

  const selectedProduct: SelectedProduct = useMemo(() => {
    if (isEducation) {
      return getAnyProductById("education-pass") as EducationProductUI | null;
    }

    if (isAddon) {
      return getAddOnProductById(requestedProductId);
    }

    return getAgentPackageById(requestedProductId) as AgentPackageUI | null;
  }, [isEducation, isAddon, requestedProductId]);

  const [selectedBillingCycle, setSelectedBillingCycle] =
    useState<BillingCycle>("yearly");

  useEffect(() => {
    if (!isMembershipProduct(selectedProduct)) return;

    const available = getAvailableBillingCycles(selectedProduct);

    if (billingFromUrl === "monthly" && available.includes("monthly")) {
      setSelectedBillingCycle("monthly");
      return;
    }

    if (billingFromUrl === "yearly" && available.includes("yearly")) {
      setSelectedBillingCycle("yearly");
      return;
    }

    if (
      selectedProduct.billingCycle === "monthly" &&
      available.includes("monthly")
    ) {
      setSelectedBillingCycle("monthly");
      return;
    }

    if (available.includes("yearly")) {
      setSelectedBillingCycle("yearly");
      return;
    }

    setSelectedBillingCycle(available[0] ?? "yearly");
  }, [selectedProduct, billingFromUrl]);

  useEffect(() => {
    let ignore = false;

    async function loadExistingProperty() {
      if (!needsExistingProperty) {
        setLoadingExistingProperty(false);
        setExistingProperty(null);
        setExistingPropertyError("");
        return;
      }

      if (!kode) {
        setLoadingExistingProperty(false);
        setExistingPropertyError(ui.listingCodeNotFound);
        return;
      }

      setLoadingExistingProperty(true);
      setExistingPropertyError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (!ignore) {
          setLoadingExistingProperty(false);
          setExistingPropertyError(ui.relogin);
        }
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          title,
          listing_type,
          province,
          city,
          kode,
          property_images (
            id
          )
        `)
        .eq("user_id", user.id)
        .eq("kode", kode)
        .single();

      if (ignore) return;

      if (error || !data) {
        setExistingProperty(null);
        setLoadingExistingProperty(false);
        setExistingPropertyError(error?.message || ui.listingNotFound);
        return;
      }

      setExistingProperty(data as ExistingProperty);
      setLoadingExistingProperty(false);
    }

    loadExistingProperty();

    return () => {
      ignore = true;
    };
  }, [
    needsExistingProperty,
    kode,
    ui.listingCodeNotFound,
    ui.relogin,
    ui.listingNotFound,
  ]);

  const total = useMemo(() => {
    if (!selectedProduct) return 0;

    if (isMembershipProduct(selectedProduct)) {
      return getMembershipTotal(selectedProduct, selectedBillingCycle);
    }

    return selectedProduct.priceIdr;
  }, [selectedProduct, selectedBillingCycle]);

  const listingLimit = useMemo(() => {
    return getListingLimit(selectedProduct);
  }, [selectedProduct]);

  const selectedProductName = useMemo(() => {
    return getProductName(selectedProduct, selectedBillingCycle, currentLang);
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedPaymentTitle = useMemo(() => {
    return getPaymentTitle(selectedProduct, selectedBillingCycle, currentLang);
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedPaymentDescription = useMemo(() => {
    return getPaymentDescription(
      selectedProduct,
      selectedBillingCycle,
      currentLang,
      listingLimit
    );
  }, [selectedProduct, selectedBillingCycle, currentLang, listingLimit]);

  const resolvedBillingNote = useMemo(() => {
    return getBillingNote(selectedProduct, selectedBillingCycle, currentLang);
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedDurationLabel = useMemo(() => {
    if (!selectedProduct) return "-";

    if (isEducationProduct(selectedProduct)) {
      return currentLang === "id"
        ? `${selectedProduct.durationDays} hari`
        : `${selectedProduct.durationDays} days`;
    }

    if (isMembershipProduct(selectedProduct)) {
      const activeDays =
        selectedProduct.packageTermDays ?? selectedProduct.durationDays;

      if (selectedBillingCycle === "monthly") {
        return currentLang === "id"
          ? `Ditagih per 30 hari • Membership aktif ${activeDays} hari`
          : `Billed every 30 days • Membership active for ${activeDays} days`;
      }

      return currentLang === "id"
        ? `Membership aktif ${activeDays} hari`
        : `Membership active for ${activeDays} days`;
    }

    return currentLang === "id"
      ? `${selectedProduct.durationDays} hari`
      : `${selectedProduct.durationDays} days`;
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const productBadge = useMemo(() => {
    if (!selectedProduct) return null;

    if ("badge" in selectedProduct) {
      return cleanProviderWords(selectedProduct.badge ?? "");
    }

    return null;
  }, [selectedProduct]);

  const listingTypeLabel = useMemo(() => {
    const lt = String(existingProperty?.listing_type || "").toLowerCase();

    if (currentLang === "id") {
      if (lt === "dijual") return ui.soldType;
      if (lt === "disewa") return ui.rentType;
      if (lt === "lelang") return ui.auctionType;
      return "-";
    }

    if (lt === "dijual") return ui.soldType;
    if (lt === "disewa") return ui.rentType;
    if (lt === "lelang") return ui.auctionType;
    return "-";
  }, [existingProperty, currentLang, ui.soldType, ui.rentType, ui.auctionType]);

  const lokasiLabel = useMemo(() => {
    const prov = String(existingProperty?.province || "").trim();
    const city = String(existingProperty?.city || "").trim();

    if (!prov && !city) return "-";
    if (prov && city) return `${prov} • ${city}`;
    return prov || city;
  }, [existingProperty]);

  const judulLabel = useMemo(() => {
    const title = String(existingProperty?.title || "").trim();
    return title || "-";
  }, [existingProperty]);

  const fotoCount = useMemo(() => {
    return existingProperty?.property_images?.length ?? 0;
  }, [existingProperty]);

  const isReadyToPay = useMemo(() => {
    if (!selectedProduct) return false;
    if (total <= 0) return false;

    if (needsExistingProperty) {
      return Boolean(existingProperty?.id) && !loadingExistingProperty;
    }

    return true;
  }, [
    selectedProduct,
    total,
    needsExistingProperty,
    existingProperty,
    loadingExistingProperty,
  ]);

  function onBack() {
    if (isEducation) {
      router.push("/education");
      return;
    }

    if (isAddon) {
      router.push("/agentdashboard/listing-saya");
      return;
    }

    router.push("/agentdashboard/paket");
  }

  async function onPay() {
    if (!isReadyToPay || submitting || !selectedProduct) return;

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert(ui.loginFirst);
        router.push("/login");
        return;
      }

      if (needsExistingProperty && !existingProperty?.id) {
        alert(ui.targetListingNotFound);
        return;
      }

      const normalizedFlow = normalizePaymentFlow(
        flow,
        isAddon,
        isEducation,
        requestedProductId
      );

      const normalizedProductType = normalizeProductType(
        selectedProduct.productType
      );

      const membershipTermDays = isMembershipProduct(selectedProduct)
        ? selectedProduct.packageTermDays ?? selectedProduct.durationDays
        : null;

      const billingIntervalDays = isMembershipProduct(selectedProduct)
        ? selectedBillingCycle === "monthly"
          ? 30
          : membershipTermDays ?? selectedProduct.durationDays
        : selectedProduct.durationDays;

      const paymentRecord: TetamoPayment = {
        id: crypto.randomUUID(),
        userId: user.id,
        userType: "agent",
        flow: normalizedFlow,
        productId: selectedProduct.id,
        productType: normalizedProductType,
        listingCode: isAddon ? existingProperty?.kode || kode || "" : "",
        amount: total,
        currency: "IDR",
        autoRenew: Boolean(selectedProduct.autoRenewDefault ?? true),
        status: "pending",
        paymentMethod: "card",
        gateway: selectedGateway,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          action: isEducation
            ? "education-access"
            : isAddon
            ? "addon"
            : "membership",

          selectedBillingCycle: isMembershipProduct(selectedProduct)
            ? selectedBillingCycle
            : null,

          packageId: isMembershipProduct(selectedProduct)
            ? selectedProduct.id
            : null,

          packageName: isMembershipProduct(selectedProduct)
            ? selectedProduct.name
            : null,

          listingLimit: isMembershipProduct(selectedProduct)
            ? listingLimit
            : null,

          activeListingLimit: isMembershipProduct(selectedProduct)
            ? listingLimit
            : null,

          packageTermDays: membershipTermDays,
          billingIntervalDays,

          monthlyPriceIdr: isMembershipProduct(selectedProduct)
            ? selectedProduct.monthlyPriceIdr ?? null
            : null,

          monthlyCommitmentMonths: isMembershipProduct(selectedProduct)
            ? selectedProduct.monthlyCommitmentMonths ?? null
            : null,

          cancelStopsFutureRenewalOnly: isMembershipProduct(selectedProduct)
            ? selectedProduct.cancelStopsFutureRenewalOnly ?? true
            : true,

          existingPropertyId: isAddon ? existingProperty?.id || null : null,
          existingPropertyCode: isAddon ? existingProperty?.kode || null : null,
          existingPropertyTitle: isAddon ? existingProperty?.title || null : null,
          listingType: isAddon ? existingProperty?.listing_type || null : null,

          productDurationDays: selectedProduct.durationDays ?? null,
          paymentTitle: resolvedPaymentTitle,
          paymentDescription: resolvedPaymentDescription,
          billingNote: resolvedBillingNote,

          stripeMode: "live-ready",
          role: "agent",
        } as any,
      };

      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentRecord),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.message || ui.createPaymentFailed);
        return;
      }

      const checkoutUrl =
        data?.checkoutUrl ||
        data?.checkout_url ||
        data?.url ||
        data?.sessionUrl ||
        data?.session_url ||
        data?.data?.checkoutUrl ||
        data?.data?.checkout_url ||
        data?.data?.url;

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      alert(ui.checkoutMissing);
    } catch (error: any) {
      console.error("agent onPay error:", error);
      alert(error?.message || ui.genericPaymentError);
    } finally {
      setSubmitting(false);
    }
  }

  const availableBillingCycles = isMembershipProduct(selectedProduct)
    ? getAvailableBillingCycles(selectedProduct)
    : [];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900"
          type="button"
        >
          {ui.back}
        </button>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
          {ui.pageTitle}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          {isEducation ? ui.pageDescEducation : ui.pageDescDefault}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {isEducation
                ? ui.summaryEducation
                : isAddon
                ? ui.summaryAddon
                : ui.summaryMembership}
            </h2>

            {isAddon ? (
              <>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">{ui.listingType}</div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {listingTypeLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">{ui.location}</div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {lokasiLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">{ui.title}</div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {judulLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">{ui.photos}</div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {ui.photosCount(fotoCount)}
                    </div>
                  </div>
                </div>

                {loadingExistingProperty ? (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                    <div className="text-sm text-gray-600">
                      {ui.loadingListing}
                    </div>
                  </div>
                ) : null}

                {existingPropertyError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:mt-5">
                    <div className="text-sm font-semibold text-red-700 sm:text-base">
                      {ui.failedLoadListing}
                    </div>
                    <div className="mt-1 text-sm text-red-600">
                      {existingPropertyError}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">
                    {isEducation ? ui.product : ui.package}
                  </div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {selectedProduct?.name ?? "-"}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{ui.billingType}</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {isMembershipProduct(selectedProduct)
                      ? getBillingCycleLabel(selectedBillingCycle, currentLang)
                      : "-"}
                  </div>
                </div>

                {isMembershipProduct(selectedProduct) ? (
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">
                      {ui.activeListingLimit}
                    </div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {listingLimit > 0
                        ? currentLang === "id"
                          ? `${listingLimit} listing aktif`
                          : `${listingLimit} active listings`
                        : "-"}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{ui.activePeriod}</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {resolvedDurationLabel}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{ui.autoRenew}</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {ui.autoRenewDefault}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:mt-5">
              <div className="text-sm font-semibold text-blue-700 sm:text-base">
                {ui.secureCheckout}
              </div>
              <div className="mt-1 text-sm leading-6 text-blue-700">
                {ui.secureCheckoutDesc}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {resolvedPaymentTitle}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {resolvedPaymentDescription}
            </p>

            {isMembershipProduct(selectedProduct) ? (
              <div className="mt-4">
                <div className="text-sm font-semibold text-[#1C1C1E]">
                  {ui.chooseBillingType}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3">
                  {availableBillingCycles.includes("yearly") ? (
                    <button
                      onClick={() => setSelectedBillingCycle("yearly")}
                      type="button"
                      className={[
                        "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                        selectedBillingCycle === "yearly"
                          ? "border-[#1C1C1E] bg-black text-white"
                          : "border-gray-200 bg-white text-[#1C1C1E]",
                      ].join(" ")}
                    >
                      <div className="font-semibold">{ui.yearly}</div>
                      <div className="mt-1 text-xs opacity-80">
                        {money(selectedProduct.priceIdr)}
                      </div>
                    </button>
                  ) : null}

                  {availableBillingCycles.includes("monthly") ? (
                    <button
                      onClick={() => setSelectedBillingCycle("monthly")}
                      type="button"
                      className={[
                        "w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                        selectedBillingCycle === "monthly"
                          ? "border-[#1C1C1E] bg-black text-white"
                          : "border-gray-200 bg-white text-[#1C1C1E]",
                      ].join(" ")}
                    >
                      <div className="font-semibold">{ui.monthly}</div>
                      <div className="mt-1 text-xs opacity-80">
                        {money(getMembershipTotal(selectedProduct, "monthly"))}
                        {` / ${ui.month} • ${ui.commitment} ${
                          selectedProduct.monthlyCommitmentMonths ?? 12
                        } ${ui.month}`}
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isAddon ? (
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {ui.addonAppliedTo}{" "}
                <span className="font-semibold">
                  {finalKodeForDisplay(existingProperty?.kode, kode)}
                </span>
                .
              </p>
            ) : null}

            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                    {selectedProductName}
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    {money(total)}
                  </div>
                </div>

                {productBadge ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                    {productBadge}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <span className="font-semibold">{ui.duration}:</span>{" "}
                {resolvedDurationLabel}
              </div>
            </div>

            <button
              onClick={() => setSelectedGateway("stripe")}
              type="button"
              className={[
                "mt-4 w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                selectedGateway === "stripe"
                  ? "border-[#1C1C1E] bg-black text-white"
                  : "border-gray-200 bg-white text-[#1C1C1E]",
              ].join(" ")}
            >
              <div className="font-semibold">{ui.cardTitle}</div>
              <div
                className={[
                  "mt-1 text-xs",
                  selectedGateway === "stripe"
                    ? "text-white/80"
                    : "text-gray-500",
                ].join(" ")}
              >
                {ui.cardSubtitle}
              </div>
            </button>

            <button
              type="button"
              disabled
              className="mt-3 w-full cursor-not-allowed rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-400"
            >
              <div className="font-semibold">{ui.otherMethodsTitle}</div>
              <div className="mt-1 text-xs text-gray-400">
                {ui.otherMethodsSubtitle}
              </div>
            </button>

            {selectedProduct?.features?.length ? (
              <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-[#1C1C1E]">
                  {ui.whatYouGet}
                </div>

                <ul className="mt-3 space-y-2">
                  {selectedProduct.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm leading-6 text-gray-700"
                    >
                      <span className="text-green-600">✓</span>
                      <span>{translateFeature(feature, currentLang)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#1C1C1E]">
                  {ui.total}
                </div>
                <div className="text-sm font-semibold">{money(total)}</div>
              </div>

              <div className="mt-2 text-xs leading-5 text-gray-500">
                {resolvedBillingNote}
              </div>
            </div>

            <button
              onClick={onPay}
              disabled={!isReadyToPay || submitting || loadingExistingProperty}
              className={[
                "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition",
                isReadyToPay && !submitting && !loadingExistingProperty
                  ? "bg-[#1C1C1E] text-white hover:opacity-90"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              ].join(" ")}
              type="button"
            >
              {submitting ? ui.preparingPayment : ui.payNow}
            </button>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              {ui.checkoutNote}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}