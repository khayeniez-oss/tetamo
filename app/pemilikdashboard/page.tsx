"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ElementType } from "react";
import { supabase } from "@/lib/supabase";
import { notifyAdmins } from "@/lib/notifications";
import { useOwnerProfile } from "./layout";
import { useLanguage } from "@/app/context/LanguageContext";

import {
  Home,
  CheckCircle2,
  AlertTriangle,
  Users,
  BadgeCheck,
  Clock3,
  XCircle,
  CirclePause,
  KeyRound,
  HandCoins,
  Wallet,
  ShieldAlert,
} from "lucide-react";

type ListingStatus = "AKTIF" | "AKAN_KADALUWARSA" | "KADALUWARSA";
type TransactionStatus = "available" | "sold" | "rented";
type EffectiveStatus =
  | ListingStatus
  | "JEDA"
  | "TERJUAL"
  | "TERSEWA"
  | "PENDING_PAYMENT"
  | "PENDING_APPROVAL";

type PropertyRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  verified_ok: boolean | null;
  verification_status: string | null;
  kode: string | null;
  posted_date: string | null;
  title: string | null;
  price: number | null;
  listing_expires_at: string | null;
  featured_expires_at: string | null;
  is_paused: boolean | null;
  created_at: string | null;
  plan_id: string | null;
  boost_active: boolean | null;
  boost_expires_at: string | null;
  spotlight_active: boolean | null;
  spotlight_expires_at: string | null;
  transaction_status: string | null;
  transaction_closed_at: string | null;
  transaction_closed_by: string | null;
};

type PropertyImageRow = {
  id: string;
  property_id: string;
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type Listing = {
  id: string;
  kode: string;
  title: string;
  price: number;
  postedDate: string;
  listingExpiresAt: string | null;
  featuredExpiresAt: string | null;
  isPaused: boolean;
  status: string;
  verifiedOk: boolean;
  verificationStatus: string | null;
  photo: string;
  planId: string | null;
  boostActive: boolean;
  boostExpiresAt: string | null;
  spotlightActive: boolean;
  spotlightExpiresAt: string | null;
  transactionStatus: TransactionStatus;
  transactionClosedAt: string | null;
};

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date) {
  const ms = toDateOnly(a).getTime() - toDateOnly(b).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function isFutureDate(dateString: string | null) {
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  return date.getTime() > Date.now();
}

function computeLifecycleStatus(listingExpiresAt: string | null): ListingStatus {
  if (!listingExpiresAt) return "AKTIF";

  const today = toDateOnly(new Date());
  const exp = toDateOnly(new Date(listingExpiresAt));

  if (Number.isNaN(exp.getTime())) return "AKTIF";

  const daysLeft = diffDays(exp, today);

  if (daysLeft < 0) return "KADALUWARSA";
  if (daysLeft <= 7) return "AKAN_KADALUWARSA";
  return "AKTIF";
}

function mapTransactionStatus(value: string | null | undefined): TransactionStatus {
  if (value === "sold") return "sold";
  if (value === "rented") return "rented";
  return "available";
}

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDisplayDate(dateString: string | null, locale: string) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function pickPostedDate(property: PropertyRow, locale: string) {
  return formatDisplayDate(property.posted_date || property.created_at || null, locale);
}

function mapPropertiesWithImages(
  properties: PropertyRow[],
  images: PropertyImageRow[],
  locale: string
): Listing[] {
  const fallbackPhoto =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

  return properties.map((property) => {
    const propertyImages = images
      .filter((img) => img.property_id === property.id)
      .sort((a, b) => {
        const coverA = a.is_cover ? 1 : 0;
        const coverB = b.is_cover ? 1 : 0;

        if (coverA !== coverB) return coverB - coverA;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });

    const coverPhoto = propertyImages[0]?.image_url || fallbackPhoto;

    return {
      id: property.id,
      kode: property.kode || "-",
      title: property.title || "-",
      price: Number(property.price || 0),
      postedDate: pickPostedDate(property, locale),
      listingExpiresAt: property.listing_expires_at || null,
      featuredExpiresAt: property.featured_expires_at || null,
      isPaused: Boolean(property.is_paused),
      status: property.status || "active",
      verifiedOk: Boolean(property.verified_ok),
      verificationStatus: property.verification_status || null,
      photo: coverPhoto,
      planId: property.plan_id || null,
      boostActive: Boolean(property.boost_active),
      boostExpiresAt: property.boost_expires_at || null,
      spotlightActive: Boolean(property.spotlight_active),
      spotlightExpiresAt: property.spotlight_expires_at || null,
      transactionStatus: mapTransactionStatus(property.transaction_status),
      transactionClosedAt: property.transaction_closed_at || null,
    };
  });
}

function getPromotionFlags(item: Listing) {
  const featuredActive =
    item.planId === "featured" &&
    (!item.featuredExpiresAt || isFutureDate(item.featuredExpiresAt));

  const boostActive =
    item.boostActive &&
    (!item.boostExpiresAt || isFutureDate(item.boostExpiresAt));

  const spotlightActive =
    item.spotlightActive &&
    (!item.spotlightExpiresAt || isFutureDate(item.spotlightExpiresAt));

  return {
    featuredActive,
    boostActive,
    spotlightActive,
  };
}

function deriveEffectiveStatus(item: Listing): EffectiveStatus {
  if (item.transactionStatus === "sold") return "TERJUAL";
  if (item.transactionStatus === "rented") return "TERSEWA";

  const rawStatus = String(item.status || "").toLowerCase();
  const verificationStatus = String(item.verificationStatus || "").toLowerCase();

  if (
    rawStatus === "pending_payment" ||
    rawStatus === "awaiting_payment" ||
    rawStatus === "unpaid" ||
    rawStatus === "draft_payment_pending"
  ) {
    return "PENDING_PAYMENT";
  }

  if (
    verificationStatus === "pending_verification" ||
    verificationStatus === "pending_approval"
  ) {
    return "PENDING_APPROVAL";
  }

  if (item.isPaused) return "JEDA";

  return computeLifecycleStatus(item.listingExpiresAt);
}

function computeStats(listings: Listing[]) {
  let iklanAktif = 0;
  let segeraKadaluwarsa = 0;

  for (const listing of listings) {
    const effectiveStatus = deriveEffectiveStatus(listing);

    if (effectiveStatus === "AKTIF") iklanAktif += 1;
    if (effectiveStatus === "AKAN_KADALUWARSA") segeraKadaluwarsa += 1;
  }

  return {
    totalIklan: listings.length,
    iklanAktif,
    segeraKadaluwarsa,
  };
}

function StatCard({
  title,
  value,
  Icon,
}: {
  title: string;
  value: string | number;
  Icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 sm:text-sm">{title}</p>
          <p className="mt-1 text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 sm:h-10 sm:w-10">
          <Icon className="h-4 w-4 text-[#1C1C1E] sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { userId, loadingProfile } = useOwnerProfile();
  const { lang } = useLanguage();

  const locale = lang === "id" ? "id-ID" : "en-US";

  const t =
    lang === "id"
      ? {
          pageTitle: "Dashboard Pemilik",
          pageSubtitle:
            "Kelola iklan, perpanjangan, leads, dan status transaksi Anda.",
          createListing: "+ Buat Iklan Baru",
          loadError: "Gagal memuat dashboard:",
          totalListings: "Total Iklan",
          activeListings: "Iklan Aktif",
          expiringSoon: "Segera Kadaluwarsa",
          totalLeads: "Total Leads",
          myListings: "Iklan Saya",
          myListingsSubtitle:
            "Daftar iklan Anda beserta status, promosi, dan aksi cepat.",
          loadingDashboard: "Loading dashboard...",
          noListings: "Belum ada iklan untuk akun ini.",
          code: "Kode",
          listingUntil: "Listing sampai",
          featuredUntil: "Featured sampai",
          boostUntil: "Boost sampai",
          spotlightUntil: "Spotlight sampai",
          soldAt: "Terjual pada",
          rentedAt: "Tersewa pada",
          verified: "Terverifikasi",
          featured: "Featured",
          boostActive: "Boost Aktif",
          spotlightActive: "Spotlight Aktif",
          edit: "Edit",
          boost: "Boost",
          spotlight: "Spotlight",
          pause: "Jeda",
          activate: "Aktifkan",
          sold: "Sold",
          rented: "Rented",
          renew: "Perpanjang",
          loading: "Loading...",
          confirmSold: "terjual",
          confirmRented: "tersewa",
          markConfirm:
            'Tandai listing "{title}" sebagai {action}? Listing akan hilang dari marketplace publik tetapi tetap ada di dashboard pemilik dan admin.',
          toggleFailed: "Gagal mengubah status iklan.",
          updateFailed: "Gagal memperbarui status transaksi.",
          addonFailed: "Gagal mengaktifkan add-on.",
          active: "Aktif",
          expiring: "Akan Kadaluwarsa",
          paused: "Dijeda",
          soldLabel: "Terjual",
          rentedLabel: "Tersewa",
          expired: "Kadaluwarsa",
          pendingPayment: "Menunggu Pembayaran",
          pendingApproval: "Menunggu Persetujuan",
        }
      : {
          pageTitle: "Owner Dashboard",
          pageSubtitle:
            "Manage your listings, renewals, leads, and transaction statuses.",
          createListing: "+ Create New Listing",
          loadError: "Failed to load dashboard:",
          totalListings: "Total Listings",
          activeListings: "Active Listings",
          expiringSoon: "Expiring Soon",
          totalLeads: "Total Leads",
          myListings: "My Listings",
          myListingsSubtitle:
            "Your listings with status, promotions, and quick actions.",
          loadingDashboard: "Loading dashboard...",
          noListings: "No listings found for this account.",
          code: "Code",
          listingUntil: "Listing until",
          featuredUntil: "Featured until",
          boostUntil: "Boost until",
          spotlightUntil: "Spotlight until",
          soldAt: "Sold on",
          rentedAt: "Rented on",
          verified: "Verified",
          featured: "Featured",
          boostActive: "Boost Active",
          spotlightActive: "Spotlight Active",
          edit: "Edit",
          boost: "Boost",
          spotlight: "Spotlight",
          pause: "Pause",
          activate: "Activate",
          sold: "Sold",
          rented: "Rented",
          renew: "Renew",
          loading: "Loading...",
          confirmSold: "sold",
          confirmRented: "rented",
          markConfirm:
            'Mark listing "{title}" as {action}? The listing will be hidden from the public marketplace but will remain visible in the owner and admin dashboards.',
          toggleFailed: "Failed to change listing status.",
          updateFailed: "Failed to update transaction status.",
          addonFailed: "Failed to activate add-on.",
          active: "Active",
          expiring: "Expiring Soon",
          paused: "Paused",
          soldLabel: "Sold",
          rentedLabel: "Rented",
          expired: "Expired",
          pendingPayment: "Pending Payment",
          pendingApproval: "Pending Approval",
        };

  function statusUI(status: EffectiveStatus) {
    if (status === "AKTIF") {
      return {
        label: t.active,
        Icon: BadgeCheck,
        badgeClass: "bg-green-50 text-green-700 border-green-200",
      };
    }

    if (status === "AKAN_KADALUWARSA") {
      return {
        label: t.expiring,
        Icon: Clock3,
        badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
      };
    }

    if (status === "JEDA") {
      return {
        label: t.paused,
        Icon: CirclePause,
        badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
      };
    }

    if (status === "TERJUAL") {
      return {
        label: t.soldLabel,
        Icon: HandCoins,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    if (status === "TERSEWA") {
      return {
        label: t.rentedLabel,
        Icon: KeyRound,
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
      };
    }

    if (status === "PENDING_PAYMENT") {
      return {
        label: t.pendingPayment,
        Icon: Wallet,
        badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
      };
    }

    if (status === "PENDING_APPROVAL") {
      return {
        label: t.pendingApproval,
        Icon: ShieldAlert,
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
      };
    }

    return {
      label: t.expired,
      Icon: XCircle,
      badgeClass: "bg-red-50 text-red-700 border-red-200",
    };
  }

  const [listings, setListings] = useState<Listing[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [activatingAddonId, setActivatingAddonId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!userId) {
        if (isMounted) {
          setListings([]);
          setTotalLeads(0);
          setLoadingDashboard(false);
        }
        return;
      }

      if (isMounted) {
        setLoadingDashboard(true);
        setErrorMessage("");
      }

      const { data: propertiesData, error: propertiesError } = await supabase
        .from("properties")
        .select(
          "id, user_id, status, verified_ok, verification_status, kode, posted_date, title, price, listing_expires_at, featured_expires_at, is_paused, created_at, plan_id, boost_active, boost_expires_at, spotlight_active, spotlight_expires_at, transaction_status, transaction_closed_at, transaction_closed_by"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (propertiesError) {
        setListings([]);
        setTotalLeads(0);
        setLoadingDashboard(false);
        setErrorMessage(propertiesError.message);
        return;
      }

      const propertyRows = (propertiesData || []) as PropertyRow[];
      const propertyIds = propertyRows.map((property) => property.id);

      let imageRows: PropertyImageRow[] = [];

      if (propertyIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from("property_images")
          .select("id, property_id, image_url, sort_order, is_cover")
          .in("property_id", propertyIds)
          .order("sort_order", { ascending: true });

        if (!isMounted) return;

        if (imagesError) {
          setListings([]);
          setTotalLeads(0);
          setLoadingDashboard(false);
          setErrorMessage(imagesError.message);
          return;
        }

        imageRows = (imagesData || []) as PropertyImageRow[];
      }

      const { count: leadsCount, error: leadsError } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("receiver_user_id", userId)
        .eq("receiver_role", "owner");

      if (!isMounted) return;

      if (leadsError) {
        setListings([]);
        setTotalLeads(0);
        setLoadingDashboard(false);
        setErrorMessage(leadsError.message);
        return;
      }

      const mappedListings = mapPropertiesWithImages(propertyRows, imageRows, locale);

      setListings(mappedListings);
      setTotalLeads(leadsCount || 0);
      setLoadingDashboard(false);
    }

    if (!loadingProfile) {
      loadDashboard();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, loadingProfile, locale]);

  const computedStats = useMemo(() => {
    const stats = computeStats(listings);
    return {
      ...stats,
      totalLeads,
    };
  }, [listings, totalLeads]);

  async function toggleJeda(item: Listing) {
    if (item.transactionStatus !== "available") return;

    setTogglingId(item.id);

    const { error } = await supabase
      .from("properties")
      .update({ is_paused: !item.isPaused })
      .eq("id", item.id);

    if (error) {
      setTogglingId(null);
      alert(t.toggleFailed);
      return;
    }

    setListings((prev) =>
      prev.map((listing) =>
        listing.id === item.id
          ? { ...listing, isPaused: !listing.isPaused }
          : listing
      )
    );

    setTogglingId(null);
  }

  async function activateAddon(item: Listing, addon: "boost" | "spotlight") {
    if (!userId) return;
    if (item.transactionStatus !== "available") return;

    const loadingKey = `${item.id}-${addon}`;
    setActivatingAddonId(loadingKey);

    const payload =
      addon === "boost"
        ? { boost_active: true }
        : { spotlight_active: true };

    const { error } = await supabase
      .from("properties")
      .update(payload)
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      setActivatingAddonId(null);
      alert(error.message || t.addonFailed);
      return;
    }

    setListings((prev) =>
      prev.map((listing) =>
        listing.id === item.id
          ? {
              ...listing,
              boostActive: addon === "boost" ? true : listing.boostActive,
              spotlightActive:
                addon === "spotlight" ? true : listing.spotlightActive,
            }
          : listing
      )
    );

    setActivatingAddonId(null);
  }

  async function markTransaction(
    item: Listing,
    nextStatus: Extract<TransactionStatus, "sold" | "rented">
  ) {
    if (!userId) return;

    const actionLabel =
      nextStatus === "sold" ? t.confirmSold : t.confirmRented;

    const confirmed = window.confirm(
      t.markConfirm
        .replace("{title}", item.title)
        .replace("{action}", actionLabel)
    );

    if (!confirmed) return;

    setMarkingId(item.id);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("properties")
      .update({
        transaction_status: nextStatus,
        transaction_closed_at: now,
        transaction_closed_by: userId,
      })
      .eq("id", item.id);

    if (error) {
      setMarkingId(null);
      alert(error.message || t.updateFailed);
      return;
    }

    setListings((prev) =>
      prev.map((listing) =>
        listing.id === item.id
          ? {
              ...listing,
              transactionStatus: nextStatus,
              transactionClosedAt: now,
            }
          : listing
      )
    );

    try {
      await notifyAdmins({
        relatedUserId: userId,
        propertyId: item.id,
        type:
          nextStatus === "sold"
            ? "listing_marked_sold"
            : "listing_marked_rented",
        title:
          nextStatus === "sold"
            ? "Listing marked as sold"
            : "Listing marked as rented",
        body:
          nextStatus === "sold"
            ? `Owner marked "${item.title}" as sold.`
            : `Owner marked "${item.title}" as rented.`,
        priority: "high",
      });
    } catch (notifyError) {
      console.error("Failed to notify admins:", notifyError);
    }

    setMarkingId(null);
  }

  const isLoading = loadingProfile || loadingDashboard;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
            {t.pageTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t.pageSubtitle}</p>
        </div>

        <button
          onClick={() => router.push("/pemilik/iklan")}
          className="inline-flex w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 sm:w-auto"
        >
          {t.createListing}
        </button>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t.loadError} {errorMessage}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t.totalListings}
          value={isLoading ? "..." : computedStats.totalIklan}
          Icon={Home}
        />
        <StatCard
          title={t.activeListings}
          value={isLoading ? "..." : computedStats.iklanAktif}
          Icon={CheckCircle2}
        />
        <StatCard
          title={t.expiringSoon}
          value={isLoading ? "..." : computedStats.segeraKadaluwarsa}
          Icon={AlertTriangle}
        />
        <StatCard
          title={t.totalLeads}
          value={isLoading ? "..." : computedStats.totalLeads}
          Icon={Users}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              {t.myListings}
            </h2>
            <p className="text-sm text-gray-500">{t.myListingsSubtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">
            {t.loadingDashboard}
          </div>
        ) : listings.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 sm:p-6">{t.noListings}</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {listings.map((item) => {
              const effectiveStatus = deriveEffectiveStatus(item);
              const ui = statusUI(effectiveStatus);
              const BadgeIcon = ui.Icon;
              const isToggling = togglingId === item.id;
              const isMarking = markingId === item.id;
              const isClosed = item.transactionStatus !== "available";
              const hasKode = Boolean(item.kode && item.kode !== "-");
              const isBoosting = activatingAddonId === `${item.id}-boost`;
              const isSpotlighting = activatingAddonId === `${item.id}-spotlight`;

              const { featuredActive, boostActive, spotlightActive } =
                getPromotionFlags(item);

              const canEdit = hasKode;
              const canBuyAddon =
                hasKode &&
                !isClosed &&
                effectiveStatus !== "KADALUWARSA" &&
                effectiveStatus !== "PENDING_PAYMENT" &&
                !item.isPaused;

              const canPause =
                !isClosed &&
                effectiveStatus !== "PENDING_PAYMENT";

              const canRenew =
                hasKode &&
                !isClosed &&
                !item.isPaused &&
                (effectiveStatus === "AKAN_KADALUWARSA" ||
                  effectiveStatus === "KADALUWARSA");

              return (
                <div key={item.id} className="p-4 sm:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="h-80 w-full overflow-hidden rounded-2xl bg-gray-100 sm:h-52">
                      <img
                        src={item.photo}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${ui.badgeClass}`}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {ui.label}
                        </span>

                        {item.verifiedOk ? (
                          <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] text-green-700">
                            {t.verified}
                          </span>
                        ) : null}

                        {featuredActive ? (
                          <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] text-purple-700">
                            {t.featured}
                          </span>
                        ) : null}

                        {boostActive && !isClosed ? (
                          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700">
                            {t.boostActive}
                          </span>
                        ) : null}

                        {spotlightActive && !isClosed ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
                            {t.spotlightActive}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                        <span>
                          {t.code}: {item.kode}
                        </span>
                        <span>{item.postedDate}</span>
                      </div>

                      <p className="mt-3 break-words text-base font-medium text-[#1C1C1E]">
                        {item.title}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {formatCurrency(item.price, locale)}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span>
                          {t.listingUntil}:{" "}
                          {formatDisplayDate(item.listingExpiresAt, locale)}
                        </span>

                        {featuredActive ? (
                          <span>
                            {t.featuredUntil}:{" "}
                            {formatDisplayDate(item.featuredExpiresAt, locale)}
                          </span>
                        ) : null}

                        {boostActive && !isClosed ? (
                          <span>
                            {t.boostUntil}:{" "}
                            {formatDisplayDate(item.boostExpiresAt, locale)}
                          </span>
                        ) : null}

                        {spotlightActive && !isClosed ? (
                          <span>
                            {t.spotlightUntil}:{" "}
                            {formatDisplayDate(item.spotlightExpiresAt, locale)}
                          </span>
                        ) : null}

                        {item.transactionStatus === "sold" ? (
                          <span>
                            {t.soldAt}:{" "}
                            {formatDisplayDate(item.transactionClosedAt, locale)}
                          </span>
                        ) : null}

                        {item.transactionStatus === "rented" ? (
                          <span>
                            {t.rentedAt}:{" "}
                            {formatDisplayDate(item.transactionClosedAt, locale)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
                      <button
                        onClick={() => {
                          if (!canEdit) return;
                          router.push(
                            `/pemilik/iklan/edit/${encodeURIComponent(item.kode)}`
                          );
                        }}
                        disabled={!canEdit}
                        className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {t.edit}
                      </button>

                      {!boostActive && canBuyAddon ? (
                        <button
                          onClick={() => activateAddon(item, "boost")}
                          disabled={isBoosting}
                          className="shrink-0 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                        >
                          {isBoosting ? t.loading : t.boost}
                        </button>
                      ) : null}

                      {!spotlightActive && canBuyAddon ? (
                        <button
                          onClick={() => activateAddon(item, "spotlight")}
                          disabled={isSpotlighting}
                          className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {isSpotlighting ? t.loading : t.spotlight}
                        </button>
                      ) : null}

                      {!isClosed && canPause && !item.isPaused ? (
                        <button
                          onClick={() => toggleJeda(item)}
                          disabled={isToggling}
                          className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isToggling ? t.loading : t.pause}
                        </button>
                      ) : null}

                      {!isClosed && canPause && item.isPaused ? (
                        <button
                          onClick={() => toggleJeda(item)}
                          disabled={isToggling}
                          className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                        >
                          {isToggling ? t.loading : t.activate}
                        </button>
                      ) : null}

                      {!isClosed ? (
                        <>
                          <button
                            onClick={() => markTransaction(item, "sold")}
                            disabled={
                              isMarking ||
                              effectiveStatus === "PENDING_PAYMENT" ||
                              effectiveStatus === "PENDING_APPROVAL"
                            }
                            className="shrink-0 rounded-xl border border-emerald-300 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {isMarking ? t.loading : t.sold}
                          </button>

                          <button
                            onClick={() => markTransaction(item, "rented")}
                            disabled={
                              isMarking ||
                              effectiveStatus === "PENDING_PAYMENT" ||
                              effectiveStatus === "PENDING_APPROVAL"
                            }
                            className="shrink-0 rounded-xl border border-sky-300 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                          >
                            {isMarking ? t.loading : t.rented}
                          </button>
                        </>
                      ) : null}

                      {canRenew ? (
                        <button
                          onClick={() =>
                            router.push(
                              `/pemilik/iklan/pembayaran?kode=${encodeURIComponent(
                                item.kode
                              )}&action=renew`
                            )
                          }
                          className="shrink-0 rounded-xl bg-[#1C1C1E] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                        >
                          {t.renew}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}