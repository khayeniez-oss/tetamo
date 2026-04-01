"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePemilikDraftListing } from "../layout";
import {
  OWNER_PACKAGES,
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
  productId: string
): TetamoPaymentFlow {
  const v = value.toLowerCase();

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
    v === "agent-membership"
  ) {
    return v;
  }

  return "new-listing";
}

function normalizeProductType(value?: string | null): TetamoProductType {
  const v = String(value || "").toLowerCase();

  if (v === "membership") return "membership";
  if (v === "addon") return "addon";
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

export default function PemilikIklanPembayaranPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const action = String(searchParams.get("action") || "");
  const kode = String(searchParams.get("kode") || "");
  const flow = String(searchParams.get("flow") || "new-listing");
  const productId = String(searchParams.get("product") || "").toLowerCase();

  const isRenew = action === "renew";
  const isAddon =
    flow === "addon" ||
    productId === "boost-listing" ||
    productId === "homepage-spotlight";

  const needsExistingProperty = isRenew || isAddon;

  const { draft, setDraft } = usePemilikDraftListing();

  const [selectedGateway, setSelectedGateway] =
    useState<GatewayType>("stripe");
  const [submitting, setSubmitting] = useState(false);

  const [existingProperty, setExistingProperty] =
    useState<ExistingProperty | null>(null);
  const [loadingExistingProperty, setLoadingExistingProperty] =
    useState(needsExistingProperty);
  const [existingPropertyError, setExistingPropertyError] = useState("");

  const planFromUrlRaw = String(searchParams.get("plan") || "").toLowerCase();

  useEffect(() => {
    let ignore = false;

    async function loadExistingProperty() {
      if (!needsExistingProperty) {
        setLoadingExistingProperty(false);
        return;
      }

      if (!kode) {
        setLoadingExistingProperty(false);
        setExistingPropertyError("Kode listing tidak ditemukan.");
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
          setExistingPropertyError("Silakan login ulang.");
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
          plan_id,
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
        setExistingPropertyError(error?.message || "Listing tidak ditemukan.");
        return;
      }

      setExistingProperty(data as ExistingProperty);
      setLoadingExistingProperty(false);
    }

    loadExistingProperty();

    return () => {
      ignore = true;
    };
  }, [needsExistingProperty, kode]);

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
  }, [selectedPlan, kode, selectedGateway, setDraft]);

  const selectedProduct = useMemo(() => {
    if (productId) {
      return getAnyProductById(productId);
    }
    return getOwnerPackageById(selectedPlan);
  }, [productId, selectedPlan]);

  const fotoCount = useMemo(() => {
    if (needsExistingProperty) {
      return existingProperty?.property_images?.length ?? 0;
    }

    const imgs = draft?.photos;
    return Array.isArray(imgs) ? imgs.length : 0;
  }, [draft?.photos, needsExistingProperty, existingProperty]);

  const listingTypeLabel = useMemo(() => {
    if (needsExistingProperty) {
      const lt = String(existingProperty?.listing_type || "").toLowerCase();
      if (lt === "dijual") return "Dijual";
      if (lt === "disewa") return "Disewa";
      if (lt === "lelang") return "Lelang";
      return "-";
    }

    const lt = String(draft?.listingType || "").toLowerCase();
    if (lt === "dijual") return "Dijual";
    if (lt === "disewa") return "Disewa";
    if (lt === "lelang") return "Lelang";
    return "-";
  }, [draft?.listingType, needsExistingProperty, existingProperty]);

  const lokasiLabel = useMemo(() => {
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
  }, [draft?.province, draft?.city, needsExistingProperty, existingProperty]);

  const judulLabel = useMemo(() => {
    if (needsExistingProperty) {
      const t = String(existingProperty?.title || "").trim();
      return t || "-";
    }

    const t = String(draft?.title || "").trim();
    return t || "-";
  }, [draft?.title, needsExistingProperty, existingProperty]);

  const isReadyToPay = useMemo(() => {
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
    if (needsExistingProperty) {
      router.push("/pemilikdashboard");
      return;
    }

    router.push(`/pemilik/iklan/verifikasi?plan=${selectedPlan}`);
  }

  async function onPay() {
    if (!isReadyToPay || submitting) return;

    setSubmitting(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Please log in first.");
        router.push("/login");
        return;
      }

      if (!selectedProduct) {
        alert("Produk pembayaran tidak ditemukan.");
        return;
      }

      if (needsExistingProperty && !existingProperty?.id) {
        alert("Listing target tidak ditemukan.");
        return;
      }

      const normalizedFlow = normalizePaymentFlow(
        flow,
        isRenew,
        isAddon,
        productId
      );

      const normalizedProductType = normalizeProductType(
        selectedProduct?.productType
      );

      const finalKode = existingProperty?.kode || draft?.kode || kode || "";

      const paymentRecord: TetamoPayment = {
        id: crypto.randomUUID(),
        userId: user.id,
        userType: "owner",
        flow: normalizedFlow,
        productId: selectedProduct.id ?? selectedPlan,
        productType: normalizedProductType,
        listingCode: finalKode,
        amount: total,
        currency: "IDR",
        autoRenew: true,
        status: "pending",
        paymentMethod: "card",
        gateway: selectedGateway,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          action: isRenew
            ? "renew"
            : isAddon
            ? productId === "homepage-spotlight"
              ? "spotlight"
              : "boost"
            : "create",
          selectedPlan,
          existingPropertyId: existingProperty?.id || null,
          existingPropertyCode: existingProperty?.kode || null,
          existingPropertyTitle: existingProperty?.title || null,
          listingType: needsExistingProperty
            ? String(existingProperty?.listing_type || "") || null
            : String(draft?.listingType || "") || null,
          draftSnapshot: needsExistingProperty ? null : buildDraftSnapshot(draft),
          productDurationDays: selectedProduct?.durationDays ?? null,
          featuredDurationDays:
            "featuredDurationDays" in (selectedProduct as any)
              ? Number((selectedProduct as any).featuredDurationDays || 0)
              : null,
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
        alert(data?.message || "Failed to create payment.");
        return;
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      alert("Checkout URL tidak ditemukan.");
    } catch (error: any) {
      console.error("onPay error:", error);
      alert(error?.message || "Something went wrong while creating payment.");
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
          ← Kembali
        </button>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[#1C1C1E] sm:text-3xl lg:text-4xl">
          Step 5 • Pembayaran
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Pilih paket iklan dan lanjutkan pembayaran.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {isAddon ? "Ringkasan Add-On" : "Ringkasan Iklan"}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">Tipe Listing</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {listingTypeLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">Lokasi</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {lokasiLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">Judul</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {judulLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">Foto</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {fotoCount} foto
                </div>
              </div>
            </div>

            {loadingExistingProperty && needsExistingProperty && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                <div className="text-sm text-gray-600">
                  Memuat data listing...
                </div>
              </div>
            )}

            {existingPropertyError && needsExistingProperty && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:mt-5">
                <div className="text-sm font-semibold text-red-700 sm:text-base">
                  Gagal memuat listing
                </div>
                <div className="mt-1 text-sm text-red-600">
                  {existingPropertyError}
                </div>
              </div>
            )}

            {!isReadyToPay && !needsExistingProperty && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                <div className="text-sm font-semibold sm:text-base">
                  Belum bisa bayar
                </div>
                <div className="mt-1 text-sm leading-6 text-gray-600">
                  Pastikan: tipe listing, lokasi, minimal 3 foto, judul &
                  deskripsi, dan form verifikasi sudah terisi.
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:mt-5">
              <div className="text-sm font-semibold text-blue-700 sm:text-base">
                Aktivasi dilakukan setelah pembayaran terkonfirmasi
              </div>
              <div className="mt-1 text-sm leading-6 text-blue-700">
                Halaman ini sekarang hanya membuat payment checkout. Listing,
                renew, boost, atau spotlight tidak diaktifkan dari sini.
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {selectedProduct?.paymentTitle ?? "Pembayaran"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {selectedProduct?.paymentDescription ??
                "Detail pembayaran akan mengikuti produk yang dipilih."}
            </p>

            {isRenew && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {selectedProduct?.renewalLabel ??
                  "Perpanjangan produk akan mengikuti paket yang dipilih."}
              </p>
            )}

            {isAddon && (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Add-on ini akan diterapkan ke listing dengan kode{" "}
                <span className="font-semibold">
                  {finalKodeForDisplay(existingProperty?.kode, draft?.kode, kode)}
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
                <span className="font-semibold">Durasi:</span>{" "}
                {selectedProduct?.durationDays
                  ? `${selectedProduct.durationDays} hari`
                  : "-"}
              </div>

              {"featuredDurationDays" in (selectedProduct || {}) &&
              (selectedProduct as any).featuredDurationDays ? (
                <div className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">Featured aktif:</span>{" "}
                  {(selectedProduct as any).featuredDurationDays} hari
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
                  Yang Anda Dapatkan
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
                  Total
                </div>
                <div className="text-sm font-semibold">{money(total)}</div>
              </div>

              <div className="mt-2 text-xs leading-5 text-gray-500">
                {selectedProduct?.billingNote ??
                  "Detail pembayaran akan mengikuti produk yang dipilih."}
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
              {submitting ? "Membuat Checkout..." : "Bayar Sekarang"}
            </button>

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Checkout akan dibuat otomatis saat tombol ditekan.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}