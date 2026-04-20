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

function sanitizePublicPaymentText(value: string | null | undefined) {
  return String(value || "")
    .replace(/stripe/gi, "secure payment checkout")
    .replace(/xendit/gi, "available payment method");
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

function isAddOnProduct(product: SelectedProduct): product is AddOnProductUI {
  return Boolean(product && product.productType === "addon");
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

export default function AgentPembayaranPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const currentLang = lang === "id" ? "id" : "en";

  const flow = String(searchParams.get("flow") || "agent-membership");
  const packageFromUrl = String(searchParams.get("package") || "").toLowerCase();
  const productFromUrl = String(searchParams.get("product") || "").toLowerCase();
  const kode = String(searchParams.get("kode") || "");
  const billingFromUrl = String(searchParams.get("billing") || "").toLowerCase();

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
        setExistingPropertyError(
          currentLang === "id"
            ? "Kode listing tidak ditemukan."
            : "Listing code was not found."
        );
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
          setExistingPropertyError(
            currentLang === "id"
              ? "Silakan login ulang."
              : "Please login again."
          );
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
        setExistingPropertyError(
          error?.message ||
            (currentLang === "id"
              ? "Listing tidak ditemukan."
              : "Listing was not found.")
        );
        return;
      }

      setExistingProperty(data as ExistingProperty);
      setLoadingExistingProperty(false);
    }

    loadExistingProperty();

    return () => {
      ignore = true;
    };
  }, [needsExistingProperty, kode, currentLang]);

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
    if (!selectedProduct) return "-";

    if (isMembershipProduct(selectedProduct)) {
      if (selectedBillingCycle === "monthly") {
        return currentLang === "id"
          ? `${selectedProduct.name} - Tagihan Bulanan`
          : `${selectedProduct.name} - Monthly Billing`;
      }

      return selectedProduct.name;
    }

    return selectedProduct.name;
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedPaymentTitle = useMemo(() => {
    if (!selectedProduct) {
      return currentLang === "id" ? "Pembayaran Agen" : "Agent Payment";
    }

    if (isMembershipProduct(selectedProduct)) {
      if (selectedBillingCycle === "monthly") {
        return currentLang === "id"
          ? `${selectedProduct.name} - Pembayaran Bulanan`
          : `${selectedProduct.name} - Monthly Billing`;
      }

      return sanitizePublicPaymentText(selectedProduct.paymentTitle);
    }

    return sanitizePublicPaymentText(selectedProduct.paymentTitle);
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedPaymentDescription = useMemo(() => {
    if (!selectedProduct) {
      return currentLang === "id"
        ? "Detail pembayaran akan mengikuti produk yang dipilih."
        : "Payment details will follow the selected product.";
    }

    if (isMembershipProduct(selectedProduct)) {
      if (selectedBillingCycle === "monthly") {
        return currentLang === "id"
          ? `${selectedProduct.name} dibayar bulanan dengan membership aktif sesuai masa paket.`
          : `${selectedProduct.name} is billed monthly with membership active according to the package term.`;
      }

      return sanitizePublicPaymentText(selectedProduct.paymentDescription);
    }

    return sanitizePublicPaymentText(selectedProduct.paymentDescription);
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedBillingNote = useMemo(() => {
    if (!selectedProduct) {
      return currentLang === "id"
        ? "Detail pembayaran akan mengikuti produk yang dipilih."
        : "Payment details will follow the selected product.";
    }

    if (isMembershipProduct(selectedProduct)) {
      if (
        selectedBillingCycle === "monthly" &&
        selectedProduct.monthlyBillingNote
      ) {
        return sanitizePublicPaymentText(selectedProduct.monthlyBillingNote);
      }

      return sanitizePublicPaymentText(selectedProduct.billingNote);
    }

    return sanitizePublicPaymentText(selectedProduct.billingNote);
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
      return selectedProduct.badge ?? null;
    }

    return null;
  }, [selectedProduct]);

  const listingTypeLabel = useMemo(() => {
    const lt = String(existingProperty?.listing_type || "").toLowerCase();

    if (currentLang === "id") {
      if (lt === "dijual") return "Dijual";
      if (lt === "disewa") return "Disewa";
      if (lt === "lelang") return "Lelang";
      return "-";
    }

    if (lt === "dijual") return "For Sale";
    if (lt === "disewa") return "For Rent";
    if (lt === "lelang") return "Auction";
    return "-";
  }, [existingProperty, currentLang]);

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

  function translateFeature(feature: string) {
    if (currentLang === "id") return sanitizePublicPaymentText(feature);

    const map: Record<string, string> = {
      "30 Listing Aktif": "30 Active Listings",
      "100 Listing Aktif": "100 Active Listings",
      "500 Listing Aktif": "500 Active Listings",
      "Membership aktif selama 1 tahun": "Membership active for 1 year",
      "Website Profil Agen": "Agent Profile Website",
      "Integrasi Media Sosial": "Social Media Integration",
      "Dashboard Leads": "Leads Dashboard",
      "Jadwal Viewing": "Viewing Schedule",
      "Paket & Tagihan": "Package & Billing",
      "Pembayaran / Receipt": "Payment / Receipt",
      "Analytics / Insights": "Analytics & Insights",
      "Tracking Komisi": "Commission Tracking",
      "Akses Boost & Spotlight": "Access to Boost & Spotlight",
      "1 AI Avatar Video Perkenalan": "1 AI Avatar Introduction Video",
      "3 Listing Unggulan Gratis (90 hari masing-masing)":
        "3 Free Featured Listings (90 days each)",
      "Prioritas visibilitas listing": "Listing visibility priority",
      "Eligible untuk penempatan Agen Unggulan":
        "Eligible for Featured Agent placement",
      "Kesempatan eksposur premium di platform":
        "Opportunity for premium platform exposure",
      "Slot Agen Unggulan terbatas (7 agen)":
        "Limited Featured Agent slots (7 agents)",
      "Tersedia opsi bayar bulanan": "Monthly payment option available",
      "Auto renew aktif secara default": "Auto renew enabled by default",
      "Durasi boost 14 hari": "Boost duration 14 days",
      "Prioritas tampil lebih tinggi di marketplace":
        "Higher priority placement in marketplace",
      "Tersedia untuk owner dan agent": "Available for owners and agents",
      "Durasi spotlight 7 hari": "Spotlight duration 7 days",
      "Tampil di homepage TETAMO": "Displayed on the TETAMO homepage",
      "Slot terbatas (maksimal 3 listing aktif)":
        "Limited slots (maximum 3 active listings)",
      "Akses premium video edukasi TETAMO":
        "Access to TETAMO premium education videos",
      "Aktif selama 90 hari": "Active for 90 days",
      "Berlaku untuk owner dan non-member agent":
        "Available for owners and non-member agents",
      "Tidak auto renew": "No auto renew",
    };

    return sanitizePublicPaymentText(map[feature] ?? feature);
  }

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
        alert(
          currentLang === "id"
            ? "Silakan login terlebih dahulu."
            : "Please log in first."
        );
        router.push("/login");
        return;
      }

      if (needsExistingProperty && !existingProperty?.id) {
        alert(
          currentLang === "id"
            ? "Listing target tidak ditemukan."
            : "Target listing was not found."
        );
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
        gateway: "stripe",
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
        alert(
          data?.message ||
            (currentLang === "id"
              ? "Gagal membuat pembayaran."
              : "Failed to create payment.")
        );
        return;
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      alert(
        currentLang === "id"
          ? "Checkout pembayaran tidak ditemukan."
          : "Payment checkout was not found."
      );
    } catch (error: any) {
      console.error("agent onPay error:", error);
      alert(
        error?.message ||
          (currentLang === "id"
            ? "Terjadi kesalahan saat membuat pembayaran."
            : "Something went wrong while creating payment.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  const availableBillingCycles = isMembershipProduct(selectedProduct)
    ? getAvailableBillingCycles(selectedProduct)
    : [];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <button
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-900"
          type="button"
        >
          ← {currentLang === "id" ? "Kembali" : "Back"}
        </button>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
          {currentLang === "id" ? "Pembayaran Agen" : "Agent Payment"}
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
          {isEducation
            ? currentLang === "id"
              ? "Tinjau Education Pass lalu lanjutkan ke pembayaran."
              : "Review the Education Pass, then continue to payment."
            : currentLang === "id"
            ? "Tinjau paket agen atau add-on yang dipilih lalu lanjutkan ke pembayaran."
            : "Review the selected agent package or add-on, then continue to payment."}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {isEducation
                ? currentLang === "id"
                  ? "Ringkasan Education Pass"
                  : "Education Pass Summary"
                : isAddon
                ? currentLang === "id"
                  ? "Ringkasan Add-On"
                  : "Add-On Summary"
                : currentLang === "id"
                ? "Ringkasan Membership Agen"
                : "Agent Membership Summary"}
            </h2>

            {isAddon ? (
              <>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">
                      {currentLang === "id" ? "Tipe Listing" : "Listing Type"}
                    </div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {listingTypeLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">
                      {currentLang === "id" ? "Lokasi" : "Location"}
                    </div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {lokasiLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">
                      {currentLang === "id" ? "Judul" : "Title"}
                    </div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {judulLabel}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">
                      {currentLang === "id" ? "Foto" : "Photos"}
                    </div>
                    <div className="mt-1 text-sm font-semibold sm:text-base">
                      {currentLang === "id"
                        ? `${fotoCount} foto`
                        : `${fotoCount} photos`}
                    </div>
                  </div>
                </div>

                {loadingExistingProperty ? (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                    <div className="text-sm text-gray-600">
                      {currentLang === "id"
                        ? "Memuat data listing..."
                        : "Loading listing data..."}
                    </div>
                  </div>
                ) : null}

                {existingPropertyError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:mt-5">
                    <div className="text-sm font-semibold text-red-700 sm:text-base">
                      {currentLang === "id"
                        ? "Gagal memuat listing"
                        : "Failed to load listing"}
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
                    {isEducation
                      ? currentLang === "id"
                        ? "Produk"
                        : "Product"
                      : currentLang === "id"
                      ? "Paket"
                      : "Package"}
                  </div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {selectedProduct?.name ?? "-"}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">
                    {currentLang === "id" ? "Tipe Tagihan" : "Billing Type"}
                  </div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {isMembershipProduct(selectedProduct)
                      ? selectedBillingCycle === "monthly"
                        ? currentLang === "id"
                          ? "Bulanan"
                          : "Monthly"
                        : currentLang === "id"
                        ? "Tahunan"
                        : "Yearly"
                      : "-"}
                  </div>
                </div>

                {isMembershipProduct(selectedProduct) ? (
                  <div className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-xs text-gray-500">
                      {currentLang === "id"
                        ? "Limit Listing Aktif"
                        : "Active Listing Limit"}
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
                  <div className="text-xs text-gray-500">
                    {currentLang === "id" ? "Masa Aktif" : "Active Period"}
                  </div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {resolvedDurationLabel}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">Auto Renew</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {currentLang === "id"
                      ? "Aktif secara default"
                      : "Enabled by default"}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:mt-5">
              <div className="text-sm font-semibold text-blue-700 sm:text-base">
                {currentLang === "id"
                  ? "Checkout pembayaran aman"
                  : "Secure payment checkout"}
              </div>
              <div className="mt-1 text-sm leading-6 text-blue-700">
                {currentLang === "id"
                  ? "Setelah pembayaran berhasil, sistem akan mengaktifkan paket agen dan mencatat invoice/receipt secara otomatis."
                  : "After successful payment, the system will activate the agent package and record the invoice/receipt automatically."}
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
                  {currentLang === "id"
                    ? "Pilih Tipe Tagihan"
                    : "Choose Billing Type"}
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
                      <div className="font-semibold">
                        {currentLang === "id" ? "Tahunan" : "Yearly"}
                      </div>
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
                      <div className="font-semibold">
                        {currentLang === "id" ? "Bulanan" : "Monthly"}
                      </div>
                      <div className="mt-1 text-xs opacity-80">
                        {money(getMembershipTotal(selectedProduct, "monthly"))}
                        {currentLang === "id"
                          ? ` / bulan • komitmen ${
                              selectedProduct.monthlyCommitmentMonths ?? 12
                            } bulan`
                          : ` / month • ${
                              selectedProduct.monthlyCommitmentMonths ?? 12
                            }-month commitment`}
                      </div>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isAddon ? (
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {currentLang === "id"
                  ? "Add-on ini akan diterapkan ke listing dengan kode "
                  : "This add-on will be applied to listing code "}
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
                <span className="font-semibold">
                  {currentLang === "id" ? "Durasi:" : "Duration:"}
                </span>{" "}
                {resolvedDurationLabel}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[#1C1C1E] bg-black px-4 py-3 text-left text-sm text-white">
              <div className="font-semibold">Debit / Credit Card</div>
              <div className="mt-1 text-xs opacity-80">
                {currentLang === "id"
                  ? "QRIS dan metode pembayaran lokal lainnya segera tersedia."
                  : "QRIS and other local payment methods coming soon."}
              </div>
            </div>

            {selectedProduct?.features?.length ? (
              <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-[#1C1C1E]">
                  {currentLang === "id" ? "Yang Anda Dapatkan" : "What You Get"}
                </div>

                <ul className="mt-3 space-y-2">
                  {selectedProduct.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm leading-6 text-gray-700"
                    >
                      <span className="text-green-600">✓</span>
                      <span>{translateFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-[#1C1C1E]">
                  Total
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
              {submitting
                ? currentLang === "id"
                  ? "Membuat Checkout..."
                  : "Creating Checkout..."
                : currentLang === "id"
                ? "Bayar Sekarang"
                : "Pay Now"}
            </button>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              {currentLang === "id"
                ? "Checkout pembayaran akan dibuat otomatis saat tombol ditekan."
                : "Payment checkout will be created automatically when the button is pressed."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}