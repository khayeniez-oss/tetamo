"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/app/context/LanguageContext";
import { useVehicleDraftListing } from "../layout";

type PlanId = "basic" | "featured";
type GatewayType = "stripe" | "xendit";

type VehicleProduct = {
  id: PlanId;
  productType: "listing";
  priceIdr: number;
  durationDays: number;
  autoRenewDefault: boolean;

  name: string;
  nameEn: string;
  badge?: string;
  badgeEn?: string;

  paymentTitle: string;
  paymentTitleEn: string;

  paymentDescription: string;
  paymentDescriptionEn: string;

  billingNote: string;
  billingNoteEn: string;

  features: string[];
  featuresEn: string[];

  featuredDurationDays?: number;
};

type VehiclePaymentRecord = {
  id: string;
  userId: string;
  userType: "owner";
  flow: "new-listing";
  productId: string;
  productType: "listing";
  listingCode: string;
  amount: number;
  currency: "IDR";
  autoRenew: boolean;
  status: "pending";
  paymentMethod: "card";
  gateway: GatewayType;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
};

const VEHICLE_PRODUCTS: Record<PlanId, VehicleProduct> = {
  basic: {
    id: "basic",
    productType: "listing",
    priceIdr: 80000,
    durationDays: 90,
    autoRenewDefault: false,

    name: "Basic Listing",
    nameEn: "Basic Listing",
    badge: "BASIC",
    badgeEn: "BASIC",

    paymentTitle: "Pembayaran Basic Listing",
    paymentTitleEn: "Basic Listing Payment",

    paymentDescription:
      "Listing kendaraan Anda akan aktif selama 90 hari di marketplace Tetamo.",
    paymentDescriptionEn:
      "Your vehicle listing will stay active for 90 days in the Tetamo marketplace.",

    billingNote:
      "Paket Basic aktif 90 hari dan termasuk dashboard owner, leads, serta schedule.",
    billingNoteEn:
      "The Basic package stays active for 90 days and includes the owner dashboard, leads, and scheduling.",

    features: [
      "1 listing aktif",
      "Aktif selama 90 hari",
      "Tampil di vehicle marketplace",
      "Owner dashboard",
      "Leads masuk ke owner",
      "Jadwal viewing / test drive / test ride",
      "Edit & kelola listing",
    ],
    featuresEn: [
      "1 active listing",
      "Active for 90 days",
      "Visible in the vehicle marketplace",
      "Owner dashboard",
      "Leads go directly to owner",
      "Viewing / test drive / test ride scheduling",
      "Edit & manage listing",
    ],
  },
  featured: {
    id: "featured",
    productType: "listing",
    priceIdr: 250000,
    durationDays: 90,
    autoRenewDefault: false,

    name: "Featured Listing",
    nameEn: "Featured Listing",
    badge: "FEATURED",
    badgeEn: "FEATURED",

    paymentTitle: "Pembayaran Featured Listing",
    paymentTitleEn: "Featured Listing Payment",

    paymentDescription:
      "Listing kendaraan Anda aktif 90 hari dengan featured exposure selama 30 hari pertama.",
    paymentDescriptionEn:
      "Your vehicle listing stays active for 90 days with featured exposure during the first 30 days.",

    billingNote:
      "Featured aktif 30 hari, lalu listing tetap lanjut normal sampai hari ke-90.",
    billingNoteEn:
      "Featured stays active for 30 days, then the listing continues normally until day 90.",

    features: [
      "1 listing aktif",
      "Aktif selama 90 hari",
      "Featured selama 30 hari",
      "Prioritas posisi lebih tinggi",
      "Tampil di vehicle marketplace",
      "Owner dashboard",
      "Leads masuk ke owner",
      "Jadwal viewing / test drive / test ride",
      "Edit & kelola listing",
    ],
    featuresEn: [
      "1 active listing",
      "Active for 90 days",
      "Featured for 30 days",
      "Higher marketplace placement",
      "Visible in the vehicle marketplace",
      "Owner dashboard",
      "Leads go directly to owner",
      "Viewing / test drive / test ride scheduling",
      "Edit & manage listing",
    ],
    featuredDurationDays: 30,
  },
};

function isPlanId(v: string): v is PlanId {
  return v === "basic" || v === "featured";
}

function money(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
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

export default function PaymentPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { draft, setDraft } = useVehicleDraftListing();

  const currentLang: "id" | "en" = lang === "en" ? "en" : "id";

  const [selectedGateway, setSelectedGateway] =
    useState<GatewayType>("stripe");
  const [submitting, setSubmitting] = useState(false);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const planFromUrlRaw = String(searchParams.get("plan") || "").toLowerCase();

  const selectedPlan: PlanId = useMemo(() => {
    if (isPlanId(planFromUrlRaw)) return planFromUrlRaw;

    const draftPlan = String(draft?.plan || "");
    if (isPlanId(draftPlan)) return draftPlan;

    return "basic";
  }, [planFromUrlRaw, draft?.plan]);

  const selectedProduct = VEHICLE_PRODUCTS[selectedPlan];
  const total = selectedProduct.priceIdr;

  const ui = useMemo(
    () =>
      currentLang === "id"
        ? {
            back: "← Kembali",
            stepTitle: "Step 5 • Pembayaran",
            stepDesc: "Tinjau ringkasan listing kendaraan Anda lalu lanjutkan pembayaran.",
            summary: "Ringkasan Listing Kendaraan",
            listingType: "Tipe Listing",
            vehicleType: "Tipe Kendaraan",
            location: "Lokasi",
            title: "Judul",
            brandModel: "Brand / Model",
            photos: "Foto",
            photosCount: (count: number) => `${count} foto`,
            checkingSession: "Memeriksa sesi login...",
            cannotPayYet: "Belum bisa bayar",
            cannotPayYetDesc:
              "Pastikan lokasi, detail kendaraan, minimal 3 foto, judul, deskripsi, dan verifikasi sudah terisi.",
            activationTitle: "Aktivasi dilakukan setelah pembayaran terkonfirmasi",
            activationDesc:
              "Checkout pembayaran akan dibuat saat tombol ditekan. Setelah pembayaran berhasil, listing kendaraan akan lanjut ke halaman sukses.",
            payment: "Pembayaran",
            cardTitle: "Debit / Credit Card",
            cardSubtitle: "Visa, Mastercard, JCB, American Express",
            otherMethodsTitle: "QRIS / E-Wallet / Virtual Account",
            otherMethodsSubtitle:
              "BCA, BNI, BRI, Mandiri, QRIS, GoPay, OVO, DANA, ShopeePay — coming soon",
            whatYouGet: "Yang Anda Dapatkan",
            total: "Total",
            payNow: "Bayar Sekarang",
            creatingCheckout: "Membuat Checkout...",
            checkingAuth: "Memeriksa Sesi...",
            checkoutNote:
              "Checkout akan dibuat otomatis saat tombol ditekan.",
            packageDuration: "Durasi",
            featuredActive: "Featured aktif",
            soldType: "Dijual",
            rentType: "Disewa",
            carType: "Mobil",
            motorType: "Motor",
            loginFirst: "Silakan login terlebih dahulu.",
            checkoutUrlMissing: "Checkout URL tidak ditemukan.",
            genericCheckoutError:
              "Terjadi kendala saat membuat pembayaran.",
          }
        : {
            back: "← Back",
            stepTitle: "Step 5 • Payment",
            stepDesc: "Review your vehicle listing summary and continue to payment.",
            summary: "Vehicle Listing Summary",
            listingType: "Listing Type",
            vehicleType: "Vehicle Type",
            location: "Location",
            title: "Title",
            brandModel: "Brand / Model",
            photos: "Photos",
            photosCount: (count: number) => `${count} photos`,
            checkingSession: "Checking login session...",
            cannotPayYet: "Cannot pay yet",
            cannotPayYetDesc:
              "Make sure the location, vehicle details, at least 3 photos, title, description, and verification are all completed.",
            activationTitle: "Activation happens after payment is confirmed",
            activationDesc:
              "The payment checkout will be created when you press the button. After successful payment, the vehicle listing will continue to the success page.",
            payment: "Payment",
            cardTitle: "Debit / Credit Card",
            cardSubtitle: "Visa, Mastercard, JCB, American Express",
            otherMethodsTitle: "QRIS / E-Wallet / Virtual Account",
            otherMethodsSubtitle:
              "BCA, BNI, BRI, Mandiri, QRIS, GoPay, OVO, DANA, ShopeePay — coming soon",
            whatYouGet: "What You Get",
            total: "Total",
            payNow: "Pay Now",
            creatingCheckout: "Creating Checkout...",
            checkingAuth: "Checking Session...",
            checkoutNote:
              "Checkout will be created automatically when you click the button.",
            packageDuration: "Duration",
            featuredActive: "Featured active",
            soldType: "For Sale",
            rentType: "For Rent",
            carType: "Car",
            motorType: "Motorbike",
            loginFirst: "Please log in first.",
            checkoutUrlMissing: "Checkout URL was not found.",
            genericCheckoutError:
              "Something went wrong while creating payment.",
          },
    [currentLang]
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
    setDraft((prev: any) => ({
      ...(prev ?? {}),
      mode: "create",
      source: "owner",
      plan: selectedPlan,
      payment: {
        ...(prev?.payment ?? {}),
        planId: selectedPlan,
        method: selectedGateway,
        status: prev?.payment?.status ?? "unpaid",
        currency: "IDR",
      },
    }));
  }, [selectedPlan, selectedGateway, setDraft]);

  const localizedName =
    currentLang === "en" ? selectedProduct.nameEn : selectedProduct.name;
  const localizedBadge =
    currentLang === "en"
      ? selectedProduct.badgeEn || selectedProduct.badge
      : selectedProduct.badge || selectedProduct.badgeEn;
  const localizedPaymentTitle =
    currentLang === "en"
      ? selectedProduct.paymentTitleEn
      : selectedProduct.paymentTitle;
  const localizedPaymentDescription =
    currentLang === "en"
      ? selectedProduct.paymentDescriptionEn
      : selectedProduct.paymentDescription;
  const localizedBillingNote =
    currentLang === "en"
      ? selectedProduct.billingNoteEn
      : selectedProduct.billingNote;
  const localizedFeatures =
    currentLang === "en"
      ? selectedProduct.featuresEn
      : selectedProduct.features;

  const fotoCount = useMemo(() => {
    const imgs = draft?.photos;
    return Array.isArray(imgs) ? imgs.length : 0;
  }, [draft?.photos]);

  const listingTypeLabel = useMemo(() => {
    const lt = String(draft?.listingType || "").toLowerCase();
    if (lt === "dijual") return ui.soldType;
    if (lt === "disewa") return ui.rentType;
    return "-";
  }, [draft?.listingType, ui.soldType, ui.rentType]);

  const vehicleTypeLabel = useMemo(() => {
    const vt = String(draft?.vehicleType || "").toLowerCase();
    if (vt === "motor") return ui.motorType;
    if (vt === "car") return ui.carType;
    return "-";
  }, [draft?.vehicleType, ui.carType, ui.motorType]);

  const lokasiLabel = useMemo(() => {
    const prov = String(draft?.province || "").trim();
    const city = String(draft?.city || "").trim();
    if (!prov && !city) return "-";
    if (prov && city) return `${prov} • ${city}`;
    return prov || city;
  }, [draft?.province, draft?.city]);

  const judulLabel = useMemo(() => {
    const t = String(draft?.title || "").trim();
    return t || "-";
  }, [draft?.title]);

  const brandModelLabel = useMemo(() => {
    const brand = String(draft?.brand || "").trim();
    const model = String(draft?.model || "").trim();
    if (!brand && !model) return "-";
    if (brand && model) return `${brand} • ${model}`;
    return brand || model;
  }, [draft?.brand, draft?.model]);

  const isReadyToPay = useMemo(() => {
    const locationOk =
      String(draft?.province || "").trim().length > 0 &&
      String(draft?.city || "").trim().length > 0;

    const baseDetailOk =
      String(draft?.listingType || "").trim().length > 0 &&
      String(draft?.vehicleType || "").trim().length > 0 &&
      String(draft?.brand || "").trim().length > 0 &&
      String(draft?.model || "").trim().length > 0 &&
      String(draft?.year || "").trim().length > 0 &&
      String(draft?.price || "").trim().length > 0 &&
      String(draft?.transmission || "").trim().length > 0 &&
      String(draft?.fuel || "").trim().length > 0 &&
      String(draft?.mileage || "").trim().length > 0 &&
      String(draft?.color || "").trim().length > 0 &&
      String(draft?.condition || "").trim().length > 0 &&
      String(draft?.bodyType || "").trim().length > 0 &&
      String(draft?.engineCc || "").trim().length > 0;

    const titleOk = String(draft?.title || "").trim().length > 0;
    const descOk = String(draft?.description || "").trim().length > 0;
    const photosOk = fotoCount >= 3;
    const verifiedOk = Boolean(draft?.verifiedOk);

    return locationOk && baseDetailOk && titleOk && descOk && photosOk && verifiedOk;
  }, [draft, fotoCount]);

  function onBack() {
    router.push(`/vehicles/create/verification?plan=${selectedPlan}`);
  }

  async function onPay() {
    if (!isReadyToPay || submitting || authLoading) return;

    setSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token || null;
      const userId =
        session?.user?.id || authUserId || getUserIdFromStoredSession();

      if (!userId) {
        alert(ui.loginFirst);
        router.push("/login");
        return;
      }

      const finalKode =
        String(draft?.kode || "").trim() || `VEH-${Date.now()}`;

      const paymentRecord: VehiclePaymentRecord = {
        id: crypto.randomUUID(),
        userId,
        userType: "owner",
        flow: "new-listing",
        productId: selectedProduct.id,
        productType: "listing",
        listingCode: finalKode,
        amount: total,
        currency: "IDR",
        autoRenew: Boolean(selectedProduct.autoRenewDefault),
        status: "pending",
        paymentMethod: "card",
        gateway: selectedGateway,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          action: "create",
          selectedPlan,
          vehicleType: draft?.vehicleType || null,
          listingType: draft?.listingType || null,
          draftSnapshot: buildDraftSnapshot(draft),
          productDurationDays: selectedProduct.durationDays ?? null,
          featuredDurationDays: selectedProduct.featuredDurationDays ?? null,
          paymentTitle: localizedPaymentTitle || null,
          paymentDescription: localizedPaymentDescription || null,
          billingNote: localizedBillingNote || null,
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
      console.log("vehicle create payment response:", data);

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

      setDraft((prev: any) => ({
        ...(prev || {}),
        kode: finalKode,
        payment: {
          ...(prev?.payment || {}),
          planId: selectedPlan,
          status: "pending",
          gateway: selectedGateway,
        },
      }));

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      alert(ui.checkoutUrlMissing);
    } catch (error: any) {
      console.error("vehicle onPay error:", error);
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
          {ui.stepDesc}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {ui.summary}
            </h2>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">{ui.listingType}</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {listingTypeLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">{ui.vehicleType}</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {vehicleTypeLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">{ui.location}</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {lokasiLabel}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">{ui.brandModel}</div>
                <div className="mt-1 text-sm font-semibold sm:text-base">
                  {brandModelLabel}
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

            {!isReadyToPay && (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:mt-5">
                <div className="text-sm font-semibold sm:text-base">
                  {ui.cannotPayYet}
                </div>
                <div className="mt-1 text-sm leading-6 text-gray-600">
                  {ui.cannotPayYetDesc}
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:mt-5">
              <div className="text-sm font-semibold text-blue-700 sm:text-base">
                {ui.activationTitle}
              </div>
              <div className="mt-1 text-sm leading-6 text-blue-700">
                {ui.activationDesc}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {localizedPaymentTitle || ui.payment}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {localizedPaymentDescription}
            </p>

            <div className="mt-4 rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                    {localizedName}
                  </div>

                  <div className="mt-1 text-sm text-gray-600">
                    {money(total)}
                  </div>
                </div>

                {localizedBadge ? (
                  <span className="inline-flex shrink-0 items-center rounded-full border border-gray-200 px-3 py-1 text-[11px] font-semibold text-[#1C1C1E] sm:text-xs">
                    {localizedBadge}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <span className="font-semibold">{ui.packageDuration}:</span>{" "}
                {selectedProduct.durationDays}{" "}
                {currentLang === "id" ? "hari" : "days"}
              </div>

              {selectedProduct.featuredDurationDays ? (
                <div className="mt-2 text-sm text-gray-700">
                  <span className="font-semibold">{ui.featuredActive}:</span>{" "}
                  {selectedProduct.featuredDurationDays}{" "}
                  {currentLang === "id" ? "hari" : "days"}
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

            {localizedFeatures.length ? (
              <div className="mt-4 rounded-2xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-[#1C1C1E]">
                  {ui.whatYouGet}
                </div>

                <ul className="mt-3 space-y-2">
                  {localizedFeatures.map((feature, idx) => (
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
                {localizedBillingNote}
              </div>
            </div>

            <button
              onClick={onPay}
              disabled={!isReadyToPay || submitting || authLoading}
              className={[
                "mt-5 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition",
                isReadyToPay && !submitting && !authLoading
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