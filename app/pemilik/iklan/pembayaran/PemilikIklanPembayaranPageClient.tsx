"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import { usePemilikDraftListing } from "../layout";
import {
  getOwnerPackageById,
  getAnyProductById,
} from "../../../data/pricelist";
import type {
  TetamoPayment,
  TetamoPaymentFlow,
  TetamoProductType,
} from "@/types/payment";
import type { PemilikPlanType } from "../layout";

type PlanId = PemilikPlanType;
type GatewayType = "stripe" | "xendit";

type ExistingProperty = {
  id: string;
  title: string | null;
  listing_type: string | null;
  province: string | null;
  city: string | null;
  kode: string | null;
  plan_id: string | null;
  property_images: { id: string }[] | null;
};

function isPlanId(v: string): v is PlanId {
  return v === "basic" || v === "featured";
}

function normalizePaymentFlow(
  value: string,
  isRenew: boolean,
  isAddon: boolean,
  isEducation: boolean,
  productId: string
): TetamoPaymentFlow {
  const v = value.toLowerCase();

  if (isEducation) return "education-access";
  if (isRenew) return "renew-listing";

  if (isAddon) {
    if (productId === "homepage-spotlight") return "homepage-spotlight";
    return "boost-listing";
  }

  if (
    v === "new-listing" ||
    v === "renew-listing" ||
    v === "boost-listing" ||
    v === "homepage-spotlight" ||
    v === "agent-membership" ||
    v === "education-access"
  ) {
    return v;
  }

  return "new-listing";
}

function normalizeProductType(value?: string | null): TetamoProductType {
  const v = String(value || "").toLowerCase();

  if (v === "membership") return "membership";
  if (v === "addon") return "addon";
  if (v === "education") return "education";
  return "listing";
}

function buildDraftSnapshot(draft: any) {
  try {
    if (!draft) return null;

    const safeDraft = {
      ...draft,
      payment: undefined,
    };

    return JSON.stringify(safeDraft);
  } catch {
    return null;
  }
}

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function finalKodeForDisplay(
  existingKode?: string | null,
  draftKode?: string | null,
  urlKode?: string | null
) {
  return existingKode || draftKode || urlKode || "-";
}

function getUserIdFromStoredSession(): string | null {
  if (typeof window === "undefined") return null;

  try {
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);

      const userId =
        parsed?.user?.id ||
        parsed?.currentSession?.user?.id ||
        parsed?.session?.user?.id ||
        null;

      if (typeof userId === "string" && userId.trim()) {
        return userId;
      }
    }
  } catch (error) {
    console.error("getUserIdFromStoredSession error:", error);
  }

  return null;
}

export default function PemilikIklanPembayaranPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const action = String(searchParams.get("action") || "");
  const kode = String(searchParams.get("kode") || "");
  const flow = String(searchParams.get("flow") || "new-listing");
  const productId = String(searchParams.get("product") || "").toLowerCase();

  const isEducation =
    flow === "education-access" || productId === "education-pass";
  const isRenew = !isEducation && action === "renew";
  const isAddon =
    !isEducation &&
    (flow === "addon" ||
      productId === "boost-listing" ||
      productId === "homepage-spotlight");

  const needsExistingProperty = isRenew || isAddon;

  const { draft, setDraft } = usePemilikDraftListing();

  const [selectedGateway, setSelectedGateway] =
    useState<GatewayType>("stripe");
  const [submitting, setSubmitting] = useState(false);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [existingProperty, setExistingProperty] =
    useState<ExistingProperty | null>(null);
  const [loadingExistingProperty, setLoadingExistingProperty] =
    useState(needsExistingProperty);
  const [existingPropertyError, setExistingPropertyError] = useState("");

  const planFromUrlRaw = String(searchParams.get("plan") || "").toLowerCase();

  const ui = useMemo(
    () =>
      lang === "id"
        ? {
            back: "← Kembali",
            stepTitle: "Step 5 • Pembayaran",
            stepDescEducation:
              "Tinjau Education Pass lalu lanjutkan pembayaran.",
            stepDescDefault: "Pilih paket iklan dan lanjutkan pembayaran.",
            summaryEducation: "Ringkasan Education Pass",
            summaryAddon: "Ringkasan Add-On",
            summaryListing: "Ringkasan Iklan",
            product: "Produk",
            access: "Akses",
            premiumEducation: "Premium Education",
            duration: "Durasi",
            buyer: "Pembeli",
            owner: "Pemilik",
            listingType: "Tipe Listing",
            location: "Lokasi",
            title: "Judul",
            photos: "Foto",
            photosCount: (count: number) => `${count} foto`,
            checkingSession: "Memeriksa sesi login...",
            loadingListing: "Memuat data listing...",
            failedLoadListing: "Gagal memuat listing",
            cannotPayYet: "Belum bisa bayar",
            cannotPayYetDesc:
              "Pastikan: tipe listing, lokasi, minimal 3 foto, judul & deskripsi, dan form verifikasi sudah terisi.",
            activationTitle: "Aktivasi dilakukan setelah pembayaran terkonfirmasi",
            activationEducation:
              "Education Pass akan aktif setelah pembayaran berhasil terkonfirmasi.",
            activationDefault:
              "Halaman ini sekarang hanya membuat payment checkout. Listing, renew, boost, atau spotlight tidak diaktifkan dari sini.",
            payment: "Pembayaran",
            renewalFallback:
              "Perpanjangan produk akan mengikuti paket yang dipilih.",
            addonAppliedTo: "Add-on ini akan diterapkan ke listing dengan kode",
            educationDescPrefix:
              "Education Pass ini akan memberi akses premium ke video edukasi TETAMO selama",
            days: "hari",
            cardTitle: "Debit / Credit Card",
            cardSubtitle: "Visa, Mastercard, JCB, American Express",
            otherMethodsTitle: "QRIS / E-Wallet / Virtual Account",
            otherMethodsSubtitle:
              "BCA, BNI, BRI, Mandiri, QRIS, GoPay, OVO, DANA, ShopeePay — coming soon",
            whatYouGet: "Yang Anda Dapatkan",
            total: "Total",
            billingFallback:
              "Detail pembayaran akan mengikuti produk yang dipilih.",
            payNow: "Bayar Sekarang",
            creatingCheckout: "Membuat Checkout...",
            checkingAuth: "Memeriksa Sesi...",
            checkoutNote: "Checkout akan dibuat otomatis saat tombol ditekan.",
            listingCodeNotFound: "Kode listing tidak ditemukan.",
            relogin: "Silakan login ulang.",
            notFoundPaymentProduct: "Produk pembayaran tidak ditemukan.",
            listingTargetNotFound: "Listing target tidak ditemukan.",
            loginFirst: "Silakan login terlebih dahulu.",
            checkoutUrlMissing: "Checkout URL tidak ditemukan.",
            genericCheckoutError:
              "Terjadi kendala saat membuat pembayaran.",
            soldType: "Dijual",
            rentType: "Disewa",
            auctionType: "Lelang",
            activeFeatured: "Featured aktif",
          }
        : {
            back: "← Back",
            stepTitle: "Step 5 • Payment",
            stepDescEducation:
              "Review the Education Pass and continue to payment.",
            stepDescDefault: "Choose your listing package and continue to payment.",
            summaryEducation: "Education Pass Summary",
            summaryAddon: "Add-On Summary",
            summaryListing: "Listing Summary",
            product: "Product",
            access: "Access",
            premiumEducation: "Premium Education",
            duration: "Duration",
            buyer: "Buyer",
            owner: "Owner",
            listingType: "Listing Type",
            location: "Location",
            title: "Title",
            photos: "Photos",
            photosCount: (count: number) => `${count} photos`,
            checkingSession: "Checking login session...",
            loadingListing: "Loading listing data...",
            failedLoadListing: "Failed to load listing",
            cannotPayYet: "Cannot pay yet",
            cannotPayYetDesc:
              "Make sure listing type, location, at least 3 photos, title, description, and verification form are all completed.",
            activationTitle: "Activation happens after payment is confirmed",
            activationEducation:
              "Education Pass will become active after successful payment confirmation.",
            activationDefault:
              "This page currently only creates the payment checkout. Listing, renew, boost, or spotlight are not activated here directly.",
            payment: "Payment",
            renewalFallback:
              "Renewal will follow the selected product package.",
            addonAppliedTo: "This add-on will be applied to listing code",
            educationDescPrefix:
              "This Education Pass gives premium access to TETAMO educational videos for",
            days: "days",
            cardTitle: "Debit / Credit Card",
            cardSubtitle: "Visa, Mastercard, JCB, American Express",
            otherMethodsTitle: "QRIS / E-Wallet / Virtual Account",
            otherMethodsSubtitle:
              "BCA, BNI, BRI, Mandiri, QRIS, GoPay, OVO, DANA, ShopeePay — coming soon",
            whatYouGet: "What You Get",
            total: "Total",
            billingFallback:
              "Payment details will follow the selected product.",
            payNow: "Pay Now",
            creatingCheckout: "Creating Checkout...",
            checkingAuth: "Checking Session...",
            checkoutNote: "Checkout will be created automatically when you click the button.",
            listingCodeNotFound: "Listing code was not found.",
            relogin: "Please log in again.",
            notFoundPaymentProduct: "Payment product was not found.",
            listingTargetNotFound: "Target listing was not found.",
            loginFirst: "Please log in first.",
            checkoutUrlMissing: "Checkout URL was not found.",
            genericCheckoutError: "Something went wrong while creating payment.",
            soldType: "For Sale",
            rentType: "For Rent",
            auctionType: "Auction",
            activeFeatured: "Featured active",
          },
    [lang]
  );

  useEffect(() => {
    let ignore = false;

    async function loadAuthUser() {
      try {
        setAuthLoading(true);

        const { data, error } = await supabase.auth.getSession();

        if (ignore) return;

        if (error) {
          console.error("getSession error:", error);
        }

        const sessionUserId =
          data.session?.user?.id || getUserIdFromStoredSession();

        setAuthUserId(sessionUserId || null);
      } catch (error) {
        if (ignore) return;
        console.error("loadAuthUser error:", error);
        setAuthUserId(getUserIdFromStoredSession());
      } finally {
        if (!ignore) setAuthLoading(false);
      }
    }

    loadAuthUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ignore) return;
      setAuthUserId(session?.user?.id ?? getUserIdFromStoredSession());
      setAuthLoading(false);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

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

      if (authLoading) return;

      const userId = authUserId || getUserIdFromStoredSession();

      if (!userId) {
        setLoadingExistingProperty(false);
        setExistingProperty(null);
        setExistingPropertyError(ui.relogin);
        return;
      }

      setLoadingExistingProperty(true);
      setExistingPropertyError("");

      const { data, error } = await supabase
        .from("properties")
        .select(`
          id,
          title,
          listing_type,
          province,
          city,
          kode,
          plan_id,
          property_images (
            id
          )
        `)
        .eq("user_id", userId)
        .eq("kode", kode)
        .single();

      if (ignore) return;

      if (error || !data) {
        setExistingProperty(null);
        setLoadingExistingProperty(false);
        setExistingPropertyError(error?.message || ui.listingTargetNotFound);
        return;
      }

      setExistingProperty(data as ExistingProperty);
      setLoadingExistingProperty(false);
    }

    loadExistingProperty();

    return () => {
      ignore = true;
    };
  }, [needsExistingProperty, kode, authLoading, authUserId, ui.listingCodeNotFound, ui.relogin, ui.listingTargetNotFound]);

  const selectedPlan: PlanId = useMemo(() => {
    if (isPlanId(planFromUrlRaw)) {
      return planFromUrlRaw;
    }

    const draftPlan = String(draft?.plan || "");
    if (isPlanId(draftPlan)) {
      return draftPlan;
    }

    const existingPlanId = String(existingProperty?.plan_id || "");
    if (isPlanId(existingPlanId)) {
      return existingPlanId;
    }

    return "basic";
  }, [planFromUrlRaw, draft?.plan, existingProperty?.plan_id]);

  useEffect(() => {
    if (isEducation) return;

    setDraft((prev) => ({
      ...(prev ?? {}),
      mode: "create",
      source: "owner",
      kode: kode || prev?.kode,
      plan: selectedPlan,
      payment: {
        ...(prev?.payment ?? {}),
        planId: selectedPlan,
        method: selectedGateway,
        status: prev?.payment?.status ?? "unpaid",
        currency: "IDR",
      },
    }));
  }, [isEducation, selectedPlan, kode, selectedGateway, setDraft]);

  const effectiveProductId = useMemo(() => {
    if (productId) return productId;
    if (isEducation) return "education-pass";
    return "";
  }, [productId, isEducation]);

  const selectedProduct = useMemo(() => {
    if (effectiveProductId) {
      return getAnyProductById(effectiveProductId);
    }

    return getOwnerPackageById(selectedPlan);
  }, [effectiveProductId, selectedPlan]);

  const fotoCount = useMemo(() => {
    if (isEducation) return 0;

    if (needsExistingProperty) {
      return existingProperty?.property_images?.length ?? 0;
    }

    const imgs = draft?.photos;
    return Array.isArray(imgs) ? imgs.length : 0;
  }, [isEducation, draft?.photos, needsExistingProperty, existingProperty]);

  const listingTypeLabel = useMemo(() => {
    if (isEducation) return "-";

    if (needsExistingProperty) {
      const lt = String(existingProperty?.listing_type || "").toLowerCase();
      if (lt === "dijual") return ui.soldType;
      if (lt === "disewa") return ui.rentType;
      if (lt === "lelang") return ui.auctionType;
      return "-";
    }

    const lt = String(draft?.listingType || "").toLowerCase();
    if (lt === "dijual") return ui.soldType;
    if (lt === "disewa") return ui.rentType;
    if (lt === "lelang") return ui.auctionType;
    return "-";
  }, [
    isEducation,
    draft?.listingType,
    needsExistingProperty,
    existingProperty,
    ui.soldType,
    ui.rentType,
    ui.auctionType,
  ]);

  const lokasiLabel = useMemo(() => {
    if (isEducation) return "-";

    if (needsExistingProperty) {
      const prov = String(existingProperty?.province || "").trim();
      const city = String(existingProperty?.city || "").trim();
      if (!prov && !city) return "-";
      if (prov && city) return `${prov} • ${city}`;
      return prov || city;
    }

    const prov = String(draft?.province || "").trim();
    const city = String(draft?.city || "").trim();
    if (!prov && !city) return "-";
    if (prov && city) return `${prov} • ${city}`;
    return prov || city;
  }, [isEducation, draft?.province, draft?.city, needsExistingProperty, existingProperty]);

  const judulLabel = useMemo(() => {
    if (isEducation) return "-";

    if (needsExistingProperty) {
      const t = String(existingProperty?.title || "").trim();
      return t || "-";
    }

    const t = String(draft?.title || "").trim();
    return t || "-";
  }, [isEducation, draft?.title, needsExistingProperty, existingProperty]);

  const isReadyToPay = useMemo(() => {
    if (!selectedProduct) return false;

    if (isEducation) {
      return true;
    }

    if (needsExistingProperty) {
      return Boolean(existingProperty?.id) && !loadingExistingProperty;
    }

    const ltOk = String(draft?.listingType || "").trim().length > 0;
    const provOk = String(draft?.province || "").trim().length > 0;
    const titleOk = String(draft?.title || "").trim().length > 0;
    const descOk = String(draft?.description || "").trim().length > 0;
    const photosOk = fotoCount >= 3;
    const verifiedOk = true;

    return ltOk && provOk && titleOk && descOk && photosOk && verifiedOk;
  }, [
    selectedProduct,
    isEducation,
    draft?.listingType,
    draft?.province,
    draft?.title,
    draft?.description,
    fotoCount,
    needsExistingProperty,
    existingProperty?.id,
    loadingExistingProperty,
  ]);

  const total = selectedProduct?.priceIdr ?? 0;

  function onBack() {
    if (isEducation) {
      router.push("/education");
      return;
    }

    if (needsExistingProperty) {
      router.push("/pemilikdashboard");
      return;
    }

    router.push(`/pemilik/iklan/verifikasi?plan=${selectedPlan}`);
  }

  async function onPay() {
    if (!isReadyToPay || submitting || authLoading) return;

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token || null;
      const userId = session?.user?.id || authUserId || getUserIdFromStoredSession();

      if (!userId) {
        alert(ui.loginFirst);
        router.push("/login");
        return;
      }

      if (!selectedProduct) {
        alert(ui.notFoundPaymentProduct);
        return;
      }

      if (needsExistingProperty && !existingProperty?.id) {
        alert(ui.listingTargetNotFound);
        return;
      }

      const normalizedFlow = normalizePaymentFlow(
        flow,
        isRenew,
        isAddon,
        isEducation,
        effectiveProductId
      );

      const normalizedProductType = normalizeProductType(
        selectedProduct?.productType
      );

      const finalKode = isEducation
        ? ""
        : existingProperty?.kode || draft?.kode || kode || "";

      const paymentRecord: TetamoPayment = {
        id: crypto.randomUUID(),
        userId,
        userType: "owner",
        flow: normalizedFlow,
        productId: selectedProduct.id ?? selectedPlan,
        productType: normalizedProductType,
        listingCode: finalKode,
        amount: total,
        currency: "IDR",
        autoRenew: Boolean(selectedProduct?.autoRenewDefault ?? true),
        status: "pending",
        paymentMethod: "card",
        gateway: selectedGateway,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          action: isEducation
            ? "education-access"
            : isRenew
              ? "renew"
              : isAddon
                ? effectiveProductId === "homepage-spotlight"
                  ? "spotlight"
                  : "boost"
                : "create",
          selectedPlan: isEducation ? null : selectedPlan,
          existingPropertyId:
            isEducation ? null : existingProperty?.id || null,
          existingPropertyCode:
            isEducation ? null : existingProperty?.kode || null,
          existingPropertyTitle:
            isEducation ? null : existingProperty?.title || null,
          listingType: isEducation
            ? null
            : needsExistingProperty
              ? String(existingProperty?.listing_type || "") || null
              : String(draft?.listingType || "") || null,
          draftSnapshot:
            needsExistingProperty || isEducation
              ? null
              : buildDraftSnapshot(draft),
          productDurationDays: selectedProduct?.durationDays ?? null,
          featuredDurationDays:
            !isEducation && "featuredDurationDays" in (selectedProduct as any)
              ? Number((selectedProduct as any).featuredDurationDays || 0)
              : null,
          paymentTitle: selectedProduct?.paymentTitle ?? null,
          paymentDescription: selectedProduct?.paymentDescription ?? null,
          billingNote: selectedProduct?.billingNote ?? null,
        },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers,
        body: JSON.stringify(paymentRecord),
      });

      const data = await res.json();
      console.log("create payment response:", data);

      if (!res.ok || !data?.success) {
        alert(data?.message || ui.genericCheckoutError);
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

      alert(ui.checkoutUrlMissing);
    } catch (error: any) {
      console.error("onPay error:", error);
      alert(error?.message || ui.genericCheckoutError);
    } finally {
      setSubmitting(false);
    }
  }

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
          {ui.stepTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {isEducation ? ui.stepDescEducation : ui.stepDescDefault}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {isEducation
                ? ui.summaryEducation
                : isAddon
                  ? ui.summaryAddon
                  : ui.summaryListing}
            </h2>

            {isEducation ? (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{ui.product}</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {selectedProduct?.name ?? "Education Pass"}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{ui.access}</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {ui.premiumEducation}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{ui.duration}</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {selectedProduct?.durationDays
                      ? `${selectedProduct.durationDays} ${ui.days}`
                      : "-"}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="text-xs text-gray-500">{ui.buyer}</div>
                  <div className="mt-1 text-sm font-semibold sm:text-base">
                    {ui.owner}
                  </div>
                </div>
              </div>
            ) : (
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

                {authLoading && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                    <div className="text-sm text-gray-600">
                      {ui.checkingSession}
                    </div>
                  </div>
                )}

                {loadingExistingProperty && needsExistingProperty && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                    <div className="text-sm text-gray-600">
                      {ui.loadingListing}
                    </div>
                  </div>
                )}

                {existingPropertyError && needsExistingProperty && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:mt-5">
                    <div className="text-sm font-semibold text-red-700 sm:text-base">
                      {ui.failedLoadListing}
                    </div>
                    <div className="mt-1 text-sm text-red-600">
                      {existingPropertyError}
                    </div>
                  </div>
                )}

                {!isReadyToPay && !needsExistingProperty && (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                    <div className="text-sm font-semibold sm:text-base">
                      {ui.cannotPayYet}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-gray-600">
                      {ui.cannotPayYetDesc}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:mt-5">
              <div className="text-sm font-semibold text-blue-700 sm:text-base">
                {ui.activationTitle}
              </div>
              <div className="mt-1 text-sm leading-6 text-blue-700">
                {isEducation ? ui.activationEducation : ui.activationDefault}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {selectedProduct?.paymentTitle ?? ui.payment}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {selectedProduct?.paymentDescription ?? ui.billingFallback}
            </p>

            {isRenew && !isEducation && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {selectedProduct?.renewalLabel ?? ui.renewalFallback}
              </p>
            )}

            {isAddon && !isEducation && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {ui.addonAppliedTo}{" "}
                <span className="font-semibold">
                  {finalKodeForDisplay(existingProperty?.kode, draft?.kode, kode)}
                </span>
                .
              </p>
            )}

            {isEducation && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {ui.educationDescPrefix}{" "}
                <span className="font-semibold">
                  {selectedProduct?.durationDays ?? 90} {ui.days}
                </span>
                .
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                    {selectedProduct?.name ?? "-"}
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    {money(total)}
                  </div>
                </div>

                {"badge" in (selectedProduct || {}) ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                    {(selectedProduct as any).badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <span className="font-semibold">{ui.duration}:</span>{" "}
                {selectedProduct?.durationDays
                  ? `${selectedProduct.durationDays} ${ui.days}`
                  : "-"}
              </div>

              {!isEducation &&
              "featuredDurationDays" in (selectedProduct || {}) &&
              (selectedProduct as any).featuredDurationDays ? (
                <div className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">{ui.activeFeatured}:</span>{" "}
                  {(selectedProduct as any).featuredDurationDays} {ui.days}
                </div>
              ) : null}
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
                  selectedGateway === "stripe" ? "text-white/80" : "text-gray-500",
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
                      <span>{feature}</span>
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
                {selectedProduct?.billingNote ?? ui.billingFallback}
              </div>
            </div>

            <button
              onClick={onPay}
              disabled={
                !isReadyToPay ||
                submitting ||
                loadingExistingProperty ||
                authLoading
              }
              className={[
                "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition",
                isReadyToPay &&
                !submitting &&
                !loadingExistingProperty &&
                !authLoading
                  ? "bg-[#1C1C1E] text-white hover:opacity-90"
                  : "cursor-not-allowed bg-gray-200 text-gray-500",
              ].join(" ")}
              type="button"
            >
              {submitting
                ? ui.creatingCheckout
                : authLoading
                  ? ui.checkingAuth
                  : ui.payNow}
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