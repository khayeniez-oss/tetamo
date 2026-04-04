"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  AGENT_PACKAGES,
  getAgentPackageById,
  getAddOnProductById,
} from "@/app/data/pricelist";
import type {
  TetamoPayment,
  TetamoPaymentFlow,
  TetamoProductType,
} from "@/types/payment";

type GatewayType = "stripe" | "xendit";

type ExistingProperty = {
  id: string;
  title: string | null;
  listing_type: string | null;
  province: string | null;
  city: string | null;
  kode: string | null;
  property_images: { id: string }[] | null;
};

type AgentPackageUI = (typeof AGENT_PACKAGES)[number] & {
  availableBillingCycles?: Array<"monthly" | "yearly">;
  monthlyPriceIdr?: number;
  monthlyCommitmentMonths?: number;
  monthlyBillingNote?: string;
  packageTermDays?: number;
  billingIntervalDays?: number;
  cancelStopsFutureRenewalOnly?: boolean;
};

type AddOnProductUI = Exclude<ReturnType<typeof getAddOnProductById>, null>;
type SelectedProduct = AgentPackageUI | AddOnProductUI | null;

function normalizePaymentFlow(
  value: string,
  isAddon: boolean,
  productId: string
): TetamoPaymentFlow {
  const v = value.toLowerCase();

  if (isAddon) {
    if (productId === "homepage-spotlight") return "homepage-spotlight";
    return "boost-listing";
  }

  if (
    v === "agent-membership" ||
    v === "boost-listing" ||
    v === "homepage-spotlight" ||
    v === "renew-listing" ||
    v === "new-listing"
  ) {
    return v;
  }

  return "agent-membership";
}

function normalizeProductType(value?: string | null): TetamoProductType {
  const v = String(value || "").toLowerCase();

  if (v === "membership" || v === "addon") return v;
  return "listing";
}

function isMembershipProduct(product: SelectedProduct): product is AgentPackageUI {
  return Boolean(product && product.productType === "membership");
}

function isAddOnProduct(product: SelectedProduct): product is AddOnProductUI {
  return Boolean(product && product.productType === "addon");
}

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function finalKodeForDisplay(
  existingKode?: string | null,
  urlKode?: string | null
) {
  return existingKode || urlKode || "-";
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
      (a, b) => a.priceIdr - b.priceIdr
    );
  }, []);

  const fallbackAgentPackageId = sortedAgentPackages[0]?.id ?? "";
  const requestedProductId =
    (productFromUrl || packageFromUrl || fallbackAgentPackageId).toLowerCase();

  const isAddon =
    flow === "addon" ||
    requestedProductId === "boost-listing" ||
    requestedProductId === "homepage-spotlight";

  const needsExistingProperty = isAddon;

  const [selectedGateway, setSelectedGateway] =
    useState<GatewayType>("stripe");
  const [submitting, setSubmitting] = useState(false);

  const [existingProperty, setExistingProperty] =
    useState<ExistingProperty | null>(null);
  const [loadingExistingProperty, setLoadingExistingProperty] =
    useState(needsExistingProperty);
  const [existingPropertyError, setExistingPropertyError] = useState("");

  const selectedProduct: SelectedProduct = useMemo(() => {
    if (isAddon) {
      return getAddOnProductById(requestedProductId);
    }

    return getAgentPackageById(requestedProductId) as AgentPackageUI | null;
  }, [isAddon, requestedProductId]);

  const [selectedBillingCycle, setSelectedBillingCycle] = useState<
    "monthly" | "yearly"
  >("yearly");

  useEffect(() => {
    if (!isMembershipProduct(selectedProduct)) return;

    const available = selectedProduct.availableBillingCycles ?? [
      selectedProduct.billingCycle,
    ];

    if (billingFromUrl === "monthly" && available.includes("monthly")) {
      setSelectedBillingCycle("monthly");
      return;
    }

    if (billingFromUrl === "yearly" && available.includes("yearly")) {
      setSelectedBillingCycle("yearly");
      return;
    }

    if (available.includes(selectedProduct.billingCycle)) {
      setSelectedBillingCycle(selectedProduct.billingCycle);
      return;
    }

    setSelectedBillingCycle(available[0] ?? "yearly");
  }, [selectedProduct, billingFromUrl]);

  useEffect(() => {
    let ignore = false;

    async function loadExistingProperty() {
      if (!needsExistingProperty) {
        setLoadingExistingProperty(false);
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
      if (
        selectedBillingCycle === "monthly" &&
        typeof selectedProduct.monthlyPriceIdr === "number"
      ) {
        return selectedProduct.monthlyPriceIdr;
      }

      return selectedProduct.priceIdr;
    }

    return selectedProduct.priceIdr;
  }, [selectedProduct, selectedBillingCycle]);

  const selectedProductName = useMemo(() => {
    if (!selectedProduct) return "-";

    if (isMembershipProduct(selectedProduct)) {
      if (
        selectedBillingCycle === "monthly" &&
        typeof selectedProduct.monthlyPriceIdr === "number"
      ) {
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
      if (
        selectedBillingCycle === "monthly" &&
        typeof selectedProduct.monthlyPriceIdr === "number"
      ) {
        return currentLang === "id"
          ? `${selectedProduct.name} - Pembayaran Bulanan`
          : `${selectedProduct.name} - Monthly Billing`;
      }

      return selectedProduct.paymentTitle;
    }

    return selectedProduct.paymentTitle;
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedPaymentDescription = useMemo(() => {
    if (!selectedProduct) {
      return currentLang === "id"
        ? "Detail pembayaran akan mengikuti produk yang dipilih."
        : "Payment details will follow the selected product.";
    }

    if (isMembershipProduct(selectedProduct)) {
      if (
        selectedBillingCycle === "monthly" &&
        typeof selectedProduct.monthlyPriceIdr === "number"
      ) {
        return currentLang === "id"
          ? `${selectedProduct.name} dibayar bulanan dengan membership aktif selama 1 tahun penuh.`
          : `${selectedProduct.name} billed monthly with membership active for a full year.`;
      }

      return selectedProduct.paymentDescription;
    }

    return selectedProduct.paymentDescription;
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
        typeof selectedProduct.monthlyPriceIdr === "number" &&
        selectedProduct.monthlyBillingNote
      ) {
        return selectedProduct.monthlyBillingNote;
      }

      return selectedProduct.billingNote;
    }

    return selectedProduct.billingNote;
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const resolvedDurationLabel = useMemo(() => {
    if (!selectedProduct) return "-";

    if (isMembershipProduct(selectedProduct)) {
      if (
        selectedBillingCycle === "monthly" &&
        typeof selectedProduct.monthlyPriceIdr === "number"
      ) {
        return currentLang === "id"
          ? `Tagihan per 30 hari • Membership aktif ${
              selectedProduct.packageTermDays ?? selectedProduct.durationDays
            } hari`
          : `Billed every 30 days • Membership active for ${
              selectedProduct.packageTermDays ?? selectedProduct.durationDays
            } days`;
      }

      return currentLang === "id"
        ? `Membership aktif ${
            selectedProduct.packageTermDays ?? selectedProduct.durationDays
          } hari`
        : `Membership active for ${
            selectedProduct.packageTermDays ?? selectedProduct.durationDays
          } days`;
    }

    return currentLang === "id"
      ? `${selectedProduct.durationDays} hari`
      : `${selectedProduct.durationDays} days`;
  }, [selectedProduct, selectedBillingCycle, currentLang]);

  const productBadge = useMemo(() => {
    if (!isAddOnProduct(selectedProduct)) return null;
    return selectedProduct.badge ?? null;
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
    const t = String(existingProperty?.title || "").trim();
    return t || "-";
  }, [existingProperty]);

  const fotoCount = useMemo(() => {
    return existingProperty?.property_images?.length ?? 0;
  }, [existingProperty]);

  const isReadyToPay = useMemo(() => {
    if (!selectedProduct) return false;

    if (needsExistingProperty) {
      return Boolean(existingProperty?.id) && !loadingExistingProperty;
    }

    return true;
  }, [
    selectedProduct,
    needsExistingProperty,
    existingProperty,
    loadingExistingProperty,
  ]);

  function translateFeature(feature: string) {
    if (currentLang === "id") return feature;

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
    };

    return map[feature] ?? feature;
  }

  function onBack() {
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
        requestedProductId
      );

      const normalizedProductType = normalizeProductType(
        selectedProduct.productType
      );

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
        autoRenew: true,
        status: "pending",
        paymentMethod: "card",
        gateway: selectedGateway,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          action: isAddon ? "addon" : "membership",
          selectedBillingCycle: isMembershipProduct(selectedProduct)
            ? selectedBillingCycle
            : null,
          packageName: isMembershipProduct(selectedProduct)
            ? selectedProduct.name
            : null,
          packageTermDays: isMembershipProduct(selectedProduct)
            ? selectedProduct.packageTermDays ?? selectedProduct.durationDays
            : null,
          billingIntervalDays: isMembershipProduct(selectedProduct)
            ? selectedBillingCycle === "monthly"
              ? 30
              : 365
            : selectedProduct.durationDays,
          monthlyPriceIdr: isMembershipProduct(selectedProduct)
            ? selectedProduct.monthlyPriceIdr ?? null
            : null,
          monthlyCommitmentMonths: isMembershipProduct(selectedProduct)
            ? selectedProduct.monthlyCommitmentMonths ?? null
            : null,
          cancelStopsFutureRenewalOnly: isMembershipProduct(selectedProduct)
            ? selectedProduct.cancelStopsFutureRenewalOnly ?? true
            : true,
          existingPropertyId: existingProperty?.id || null,
          existingPropertyCode: existingProperty?.kode || null,
          existingPropertyTitle: existingProperty?.title || null,
          listingType: existingProperty?.listing_type || null,
          productDurationDays: selectedProduct.durationDays ?? null,
          paymentTitle: resolvedPaymentTitle,
          paymentDescription: resolvedPaymentDescription,
          billingNote: resolvedBillingNote,
        },
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
          ? "Checkout URL tidak ditemukan."
          : "Checkout URL was not found."
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

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {currentLang === "id"
            ? "Tinjau paket agen atau add-on yang dipilih lalu lanjutkan ke pembayaran."
            : "Review the selected agent package or add-on, then continue to payment."}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {isAddon
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
                    {currentLang === "id" ? "Paket" : "Package"}
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

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">
                    {currentLang === "id" ? "Masa Aktif" : "Active Period"}
                  </div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {resolvedDurationLabel}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">
                    {currentLang === "id" ? "Auto Renew" : "Auto Renew"}
                  </div>
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
                  ? "Checkout dibuat dari halaman ini"
                  : "Checkout is created from this page"}
              </div>
              <div className="mt-1 text-sm leading-6 text-blue-700">
                {currentLang === "id"
                  ? "Detail paket, invoice, receipt, dan status tagihan akan terlihat di halaman Tagihan setelah pembayaran dibuat."
                  : "Package details, invoice, receipt, and billing status will appear on the Billing page after payment is created."}
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
                  {(selectedProduct.availableBillingCycles ?? [
                    selectedProduct.billingCycle,
                  ]).includes("yearly") ? (
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

                  {(selectedProduct.availableBillingCycles ?? []).includes(
                    "monthly"
                  ) && typeof selectedProduct.monthlyPriceIdr === "number" ? (
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
                        {money(selectedProduct.monthlyPriceIdr)}
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
              Stripe
            </button>

            <button
              onClick={() => setSelectedGateway("xendit")}
              type="button"
              className={[
                "mt-3 w-full rounded-2xl border px-4 py-3 text-left text-sm transition",
                selectedGateway === "xendit"
                  ? "border-[#1C1C1E] bg-black text-white"
                  : "border-gray-200 bg-white text-[#1C1C1E]",
              ].join(" ")}
            >
              Xendit
            </button>

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
                ? "Checkout akan dibuat otomatis saat tombol ditekan."
                : "Checkout will be created automatically when the button is pressed."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}