"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import {
  Search,
  Gem,
  Home,
  CheckCircle2,
  AlertTriangle,
  Users,
  BadgeCheck,
  Clock3,
  XCircle,
  CirclePause,
  Star,
  ShieldCheck,
  PackageCheck,
  CreditCard,
  PlusCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { notifyAdmins } from "@/lib/notifications";
import { useAgentProfile } from "../layout";

/* =========================
   TYPES
========================= */

type ListingStatus = "AKTIF" | "AKAN_KADALUWARSA" | "KADALUWARSA";
type TransactionStatus = "available" | "sold" | "rented";
type EffectiveStatus =
  | ListingStatus
  | "PENDING_VERIFICATION"
  | "JEDA"
  | "TERJUAL"
  | "TERSEWA";

type Listing = {
  id: string;
  kode: string;
  ownerId: string;
  title: string;
  price: string;
  postedDate: string;
  listingExpiresAt: string | null;
  city: string;
  photos?: string[];
  isPaused: boolean;
  boostActive: boolean;
  spotlightActive: boolean;
  transactionStatus: TransactionStatus;
  isPendingVerification: boolean;
};

type PropertyRow = {
  id: string;
  user_id: string | null;
  kode: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  area: string | null;
  province: string | null;
  posted_date: string | null;
  created_at: string | null;
  source: string | null;
  status: string | null;
  verification_status: string | null;
  verified_ok: boolean | null;
  is_paused: boolean | null;
  listing_expires_at: string | null;
  boost_active: boolean | null;
  boost_expires_at: string | null;
  spotlight_active: boolean | null;
  spotlight_expires_at: string | null;
  transaction_status: string | null;
};

type PropertyImageRow = {
  id: string;
  property_id: string;
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type AgentMembershipRow = {
  id: string;
  user_id: string | null;
  payment_id: string | null;
  package_id: string | null;
  package_name: string | null;
  billing_cycle: string | null;
  listing_limit: number | null;
  status: string | null;
  auto_renew: boolean | null;
  starts_at: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
  updated_at: string | null;
};

/* =========================
   HELPERS
========================= */

function toDateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a: Date, b: Date) {
  const ms = toDateOnly(a).getTime() - toDateOnly(b).getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function isDateActive(dateString: string | null | undefined) {
  if (!dateString) return false;
  const today = toDateOnly(new Date());
  const target = toDateOnly(new Date(dateString));
  if (Number.isNaN(target.getTime())) return false;
  return target.getTime() >= today.getTime();
}

function computeStatus(listingExpiresAt: string | null): ListingStatus {
  if (!listingExpiresAt) return "AKTIF";

  const today = toDateOnly(new Date());
  const exp = toDateOnly(new Date(listingExpiresAt));

  if (Number.isNaN(exp.getTime())) return "AKTIF";

  const daysLeft = diffDays(exp, today);

  if (daysLeft < 0) return "KADALUWARSA";
  if (daysLeft <= 7) return "AKAN_KADALUWARSA";
  return "AKTIF";
}

function shouldCountAsUsedSlot(listing: Listing) {
  if (listing.transactionStatus !== "available") return false;
  return computeStatus(listing.listingExpiresAt) !== "KADALUWARSA";
}

function computeStats(listings: Listing[]) {
  let iklanAktif = 0;
  let segeraKadaluwarsa = 0;

  for (const listing of listings) {
    if (listing.isPendingVerification) continue;
    if (listing.isPaused) continue;
    if (listing.transactionStatus !== "available") continue;

    const status = computeStatus(listing.listingExpiresAt);
    if (status === "AKTIF") iklanAktif += 1;
    if (status === "AKAN_KADALUWARSA") segeraKadaluwarsa += 1;
  }

  return {
    totalIklan: listings.length,
    iklanAktif,
    segeraKadaluwarsa,
  };
}

function statusUI(status: EffectiveStatus) {
  if (status === "PENDING_VERIFICATION") {
    return {
      label: "Menunggu Verifikasi",
      Icon: ShieldCheck,
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  if (status === "AKTIF") {
    return {
      label: "Aktif",
      Icon: BadgeCheck,
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "AKAN_KADALUWARSA") {
    return {
      label: "Akan Kadaluarsa",
      Icon: Clock3,
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "JEDA") {
    return {
      label: "Dijeda",
      Icon: CirclePause,
      badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  if (status === "TERJUAL") {
    return {
      label: "Terjual",
      Icon: CheckCircle2,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  if (status === "TERSEWA") {
    return {
      label: "Tersewa",
      Icon: Home,
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    };
  }

  return {
    label: "Kadaluwarsa",
    Icon: XCircle,
    badgeClass: "bg-red-50 text-red-700 border-red-200",
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 sm:text-sm">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-[#1C1C1E] sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-5 w-5 text-[#1C1C1E]" />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number | null) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDisplayDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function mapTransactionStatus(
  value: string | null | undefined
): TransactionStatus {
  if (value === "sold") return "sold";
  if (value === "rented") return "rented";
  return "available";
}

function mapPropertiesWithImages(
  properties: PropertyRow[],
  images: PropertyImageRow[]
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

    const isVerified =
      property.verification_status === "verified" || Boolean(property.verified_ok);

    const isPendingVerification =
      property.source === "agent" &&
      !isVerified &&
      (property.verification_status === "pending_verification" ||
        property.status === "pending_approval");

    return {
      id: property.id,
      kode: property.kode || "-",
      ownerId: property.user_id || "",
      title: property.title || "Tanpa Judul",
      price: formatCurrency(property.price),
      postedDate: formatDisplayDate(property.posted_date || property.created_at),
      listingExpiresAt: property.listing_expires_at || null,
      city: property.city || property.area || property.province || "-",
      photos: [coverPhoto],
      isPaused: Boolean(property.is_paused),
      boostActive:
        Boolean(property.boost_active) && isDateActive(property.boost_expires_at),
      spotlightActive:
        Boolean(property.spotlight_active) &&
        isDateActive(property.spotlight_expires_at),
      transactionStatus: mapTransactionStatus(property.transaction_status),
      isPendingVerification,
    };
  });
}

function getMembershipNumber(
  membership: AgentMembershipRow | null,
  key: string
) {
  const direct = Number((membership as any)?.[key] || 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const fromMetadata = Number(membership?.metadata?.[key] || 0);
  if (Number.isFinite(fromMetadata) && fromMetadata > 0) return fromMetadata;

  return 0;
}

function getMembershipListingLimit(membership: AgentMembershipRow | null) {
  return (
    getMembershipNumber(membership, "listing_limit") ||
    getMembershipNumber(membership, "listingLimit") ||
    getMembershipNumber(membership, "active_listing_limit") ||
    getMembershipNumber(membership, "activeListingLimit")
  );
}

function isMembershipActive(membership: AgentMembershipRow | null) {
  if (!membership) return false;
  if (membership.status !== "active") return false;

  if (!membership.expires_at) return true;

  const expiresAt = new Date(membership.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return true;

  return expiresAt.getTime() >= new Date().getTime();
}

function getBillingCycleLabel(value: string | null | undefined) {
  const v = String(value || "").toLowerCase();
  if (v === "monthly") return "Bulanan";
  if (v === "yearly") return "Tahunan";
  return "-";
}

/* =========================
   PAGE
========================= */

export default function AgentListingSayaPage() {
  const router = useRouter();
  const { userId, loadingProfile } = useAgentProfile();

  const [memberships, setMemberships] = useState<AgentMembershipRow[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loadingPage, setLoadingPage] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [activatingAddonId, setActivatingAddonId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      if (!userId) {
        if (isMounted) {
          setMemberships([]);
          setListings([]);
          setTotalLeads(0);
          setLoadingPage(false);
        }
        return;
      }

      if (isMounted) {
        setLoadingPage(true);
        setErrorMessage("");
      }

      const [
        { data: membershipsData, error: membershipsError },
        { data: propertiesData, error: propertiesError },
        { count: leadsCount, error: leadsError },
      ] = await Promise.all([
        supabase
          .from("agent_memberships")
          .select(
            "id, user_id, payment_id, package_id, package_name, billing_cycle, listing_limit, status, auto_renew, starts_at, expires_at, metadata, created_at, updated_at"
          )
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("properties")
          .select(
            "id, user_id, kode, title, price, city, area, province, posted_date, created_at, source, status, verification_status, verified_ok, is_paused, listing_expires_at, boost_active, boost_expires_at, spotlight_active, spotlight_expires_at, transaction_status"
          )
          .eq("user_id", userId)
          .eq("source", "agent")
          .neq("status", "rejected")
          .order("created_at", { ascending: false }),

        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("receiver_user_id", userId)
          .eq("receiver_role", "agent"),
      ]);

      if (!isMounted) return;

      if (membershipsError) {
        setErrorMessage(membershipsError.message);
        setLoadingPage(false);
        return;
      }

      if (propertiesError) {
        setErrorMessage(propertiesError.message);
        setLoadingPage(false);
        return;
      }

      if (leadsError) {
        setErrorMessage(leadsError.message);
        setLoadingPage(false);
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
          setErrorMessage(imagesError.message);
          setLoadingPage(false);
          return;
        }

        imageRows = (imagesData || []) as PropertyImageRow[];
      }

      const mappedListings = mapPropertiesWithImages(propertyRows, imageRows);

      setMemberships((membershipsData || []) as AgentMembershipRow[]);
      setListings(mappedListings);
      setTotalLeads(leadsCount || 0);
      setLoadingPage(false);
    }

    if (!loadingProfile) {
      loadPageData();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, loadingProfile]);

  const activeMembership = useMemo(() => {
    const active = memberships.find((membership) => isMembershipActive(membership));
    return active || null;
  }, [memberships]);

  const latestMembership = useMemo(() => {
    return activeMembership || memberships[0] || null;
  }, [activeMembership, memberships]);

  const membershipListingLimit = useMemo(() => {
    return getMembershipListingLimit(activeMembership);
  }, [activeMembership]);

  const usedListingSlots = useMemo(() => {
    return listings.filter(shouldCountAsUsedSlot).length;
  }, [listings]);

  const remainingListingSlots = Math.max(
    membershipListingLimit - usedListingSlots,
    0
  );

  const canCreateListing =
    Boolean(activeMembership) &&
    membershipListingLimit > 0 &&
    remainingListingSlots > 0;

  const computedStats = useMemo(() => {
    const stats = computeStats(listings);
    return {
      ...stats,
      totalLeads,
    };
  }, [listings, totalLeads]);

  const filteredListings = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return listings;

    const words = q.split(/\s+/);

    return listings.filter((l) => {
      const searchableText =
        `${l.title} ${l.kode} ${l.city} ${l.price}`.toLowerCase();
      return words.every((word) => searchableText.includes(word));
    });
  }, [listings, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const paginatedListings = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredListings.slice(start, end);
  }, [filteredListings, page]);

  const startItem =
    filteredListings.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredListings.length);

  function handleCreateListing() {
    if (!activeMembership) {
      router.push("/agentdashboard/paket");
      return;
    }

    if (membershipListingLimit <= 0) {
      alert("Paket Anda belum memiliki limit listing aktif.");
      return;
    }

    if (remainingListingSlots <= 0) {
      alert(
        "Limit listing aktif Anda sudah penuh. Tandai listing sebagai sold/rented atau upgrade paket untuk menambah listing."
      );
      return;
    }

    router.push("/agentdashboard/propertilokasi");
  }

  function openAgentPayment(params: Record<string, string>) {
    const query = new URLSearchParams({
      source: "agent",
      from: "listing-saya",
      ...params,
    });

    router.push(`/agentdashboard/pembayaran?${query.toString()}`);
  }

  async function toggleJeda(item: Listing) {
    if (item.transactionStatus !== "available") return;
    if (item.isPendingVerification) return;

    setTogglingId(item.id);

    const { error } = await supabase
      .from("properties")
      .update({ is_paused: !item.isPaused })
      .eq("id", item.id);

    if (error) {
      setTogglingId(null);
      alert("Gagal mengubah status listing.");
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

  function activateAddon(item: Listing, addon: "boost" | "spotlight") {
    if (!userId) return;
    if (item.isPendingVerification) return;
    if (item.transactionStatus !== "available") return;

    const loadingKey = `${item.id}-${addon}`;
    setActivatingAddonId(loadingKey);

    openAgentPayment({
      flow: "addon",
      product: addon === "boost" ? "boost-listing" : "homepage-spotlight",
      kode: item.kode,
      propertyId: item.id,
    });
  }

  async function markTransaction(
    item: Listing,
    nextStatus: Extract<TransactionStatus, "sold" | "rented">
  ) {
    if (!userId) return;
    if (item.isPendingVerification) return;

    const actionLabel = nextStatus === "sold" ? "terjual" : "tersewa";
    const confirmed = window.confirm(
      `Tandai listing "${item.title}" sebagai ${actionLabel}? Listing akan hilang dari marketplace publik tetapi tetap ada di dashboard agent dan admin.`
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
      alert(error.message || "Gagal memperbarui status transaksi.");
      return;
    }

    setListings((prev) =>
      prev.map((listing) =>
        listing.id === item.id
          ? { ...listing, transactionStatus: nextStatus }
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
            ? `Agent marked "${item.title}" as sold.`
            : `Agent marked "${item.title}" as rented.`,
        priority: "high",
      });
    } catch (notifyError) {
      console.error("Failed to notify admins:", notifyError);
    }

    setMarkingId(null);
  }

  const isLoading = loadingProfile || loadingPage;

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] sm:text-2xl">
            Listing Saya
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola listing yang sedang Anda tangani.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto xl:justify-end">
          <button
            onClick={() => router.push("/agentdashboard/leads")}
            className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-[#1C1C1E] shadow-sm hover:bg-gray-50 sm:w-auto sm:py-2.5"
          >
            Lihat Leads
          </button>

          <button
            onClick={handleCreateListing}
            disabled={isLoading}
            className={[
              "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition sm:w-auto sm:py-2.5",
              canCreateListing
                ? "bg-[#1C1C1E] text-white hover:opacity-90"
                : "border border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-100",
            ].join(" ")}
          >
            <PlusCircle className="h-4 w-4" />
            {!activeMembership
              ? "Pilih Paket"
              : remainingListingSlots <= 0
              ? "Limit Penuh"
              : "Tambah Listing"}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat listing: {errorMessage}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 sm:text-sm">
            <PackageCheck className="h-4 w-4" />
            Paket Aktif
          </div>
          <p className="mt-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
            {isLoading ? "..." : activeMembership?.package_name || "-"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {latestMembership
              ? `${getBillingCycleLabel(latestMembership.billing_cycle)} • Expired ${formatDisplayDate(
                  latestMembership.expires_at
                )}`
              : "Belum ada paket aktif"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 sm:text-sm">
            <ShieldCheck className="h-4 w-4" />
            Limit Listing
          </div>
          <p className="mt-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
            {isLoading
              ? "..."
              : membershipListingLimit > 0
              ? `${usedListingSlots}/${membershipListingLimit}`
              : "-"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {isLoading
              ? "Memuat..."
              : membershipListingLimit > 0
              ? `${remainingListingSlots} slot tersisa`
              : "Pilih paket untuk membuka listing"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 sm:text-sm">
            <CreditCard className="h-4 w-4" />
            Status Paket
          </div>
          <p className="mt-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
            {isLoading
              ? "..."
              : activeMembership
              ? "Aktif"
              : latestMembership
              ? "Tidak Aktif"
              : "-"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {activeMembership?.auto_renew ? "Auto renew aktif" : "Auto renew tidak aktif"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs text-gray-500 sm:text-sm">
            <Clock3 className="h-4 w-4" />
            Expired
          </div>
          <p className="mt-2 text-base font-semibold text-[#1C1C1E] sm:text-lg">
            {isLoading ? "..." : formatDisplayDate(activeMembership?.expires_at || null)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {activeMembership
              ? "Membership aktif"
              : "Membership belum aktif / sudah expired"}
          </p>
        </div>
      </div>

      {!activeMembership && !isLoading ? (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Paket agen belum aktif.</p>
              <p className="mt-1 leading-6">
                Untuk membuat listing, aktifkan paket agen terlebih dahulu.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/agentdashboard/paket")}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
            >
              Pilih Paket
            </button>
          </div>
        </div>
      ) : null}

      {activeMembership && remainingListingSlots <= 0 && !isLoading ? (
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Limit listing aktif sudah penuh.</p>
              <p className="mt-1 leading-6">
                Listing yang sudah sold/rented tidak dihitung sebagai slot aktif.
                Tandai listing selesai atau upgrade paket untuk menambah kapasitas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/agentdashboard/paket")}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
            >
              Upgrade Paket
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Listing"
          value={isLoading ? "..." : computedStats.totalIklan}
          Icon={Home}
        />
        <StatCard
          title="Listing Aktif"
          value={isLoading ? "..." : computedStats.iklanAktif}
          Icon={CheckCircle2}
        />
        <StatCard
          title="Segera Kadaluarsa"
          value={isLoading ? "..." : computedStats.segeraKadaluwarsa}
          Icon={AlertTriangle}
        />
        <StatCard
          title="Total Leads"
          value={isLoading ? "..." : computedStats.totalLeads}
          Icon={Users}
        />
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />

        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cari seperti Google: jakarta rumah 2.5, TTM-2026, apartemen pusat..."
          className="w-full rounded-2xl border border-gray-300 py-3 pl-12 pr-4 text-sm outline-none placeholder-gray-500 focus:border-[#1C1C1E]"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
            Listing Saya
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Daftar listing yang sedang Anda tangani beserta status dan aksi cepat.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading listing...
            </div>
          ) : paginatedListings.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Tidak ada listing yang cocok dengan pencarian Anda.
            </div>
          ) : (
            paginatedListings.map((item) => {
              const baseStatus = computeStatus(item.listingExpiresAt);

              const effectiveStatus: EffectiveStatus = item.isPendingVerification
                ? "PENDING_VERIFICATION"
                : item.transactionStatus === "sold"
                ? "TERJUAL"
                : item.transactionStatus === "rented"
                ? "TERSEWA"
                : item.isPaused
                ? "JEDA"
                : baseStatus;

              const ui = statusUI(effectiveStatus);
              const BadgeIcon = ui.Icon;
              const isToggling = togglingId === item.id;
              const isMarking = markingId === item.id;
              const isClosed = item.transactionStatus !== "available";
              const isPending = item.isPendingVerification;
              const isBoosting = activatingAddonId === `${item.id}-boost`;
              const isSpotlighting = activatingAddonId === `${item.id}-spotlight`;

              const cover =
                item.photos?.[0] ??
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

              return (
                <div key={item.id} className="p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="h-56 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-24 sm:w-36 lg:h-28 lg:w-40">
                          <img
                            src={cover}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${ui.badgeClass}`}
                            >
                              <BadgeIcon className="h-3.5 w-3.5" />
                              {ui.label}
                            </span>

                            {item.boostActive && !isClosed && !isPending ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
                                <Star className="h-3.5 w-3.5" />
                                Boosted
                              </span>
                            ) : null}

                            {item.spotlightActive && !isClosed && !isPending ? (
                              <span className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs text-purple-700">
                                <Gem className="h-4 w-4" />
                                Spotlight
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                            <span>Kode: {item.kode}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{item.postedDate}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>{item.city}</span>
                          </div>

                          <p className="mt-3 line-clamp-2 text-sm font-medium text-[#1C1C1E] sm:text-base">
                            {item.title}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">{item.price}</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full xl:w-auto xl:max-w-[540px]">
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
                        <button
                          onClick={() =>
                            router.push(
                              `/agentdashboard/propertilokasi/edit/${encodeURIComponent(
                                item.kode
                              )}`
                            )
                          }
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>

                        {!isClosed &&
                        !isPending &&
                        baseStatus === "AKTIF" &&
                        !item.isPaused ? (
                          <button
                            onClick={() => toggleJeda(item)}
                            disabled={isToggling}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isToggling ? "Loading..." : "Jeda"}
                          </button>
                        ) : null}

                        {!isClosed && !isPending && item.isPaused ? (
                          <button
                            onClick={() => toggleJeda(item)}
                            disabled={isToggling}
                            className="rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isToggling ? "Loading..." : "Aktifkan"}
                          </button>
                        ) : null}

                        {!isClosed && !isPending ? (
                          <>
                            <button
                              onClick={() => markTransaction(item, "sold")}
                              disabled={isMarking}
                              className="rounded-xl border border-emerald-300 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {isMarking ? "Loading..." : "Sold"}
                            </button>

                            <button
                              onClick={() => markTransaction(item, "rented")}
                              disabled={isMarking}
                              className="rounded-xl border border-sky-300 px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                            >
                              {isMarking ? "Loading..." : "Rented"}
                            </button>
                          </>
                        ) : null}

                        {!isClosed &&
                        !isPending &&
                        baseStatus !== "AKTIF" &&
                        !item.isPaused ? (
                          <button
                            onClick={() => router.push("/agentdashboard/paket")}
                            className="rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm text-white hover:opacity-90"
                          >
                            Perpanjang Paket
                          </button>
                        ) : null}
                      </div>

                      {!isClosed && !isPending ? (
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end xl:border-l xl:border-gray-200 xl:pl-3">
                          <button
                            onClick={() => activateAddon(item, "boost")}
                            disabled={isBoosting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                          >
                            <Star className="h-4 w-4" />
                            {isBoosting
                              ? "Loading..."
                              : item.boostActive
                              ? "Renew Boost"
                              : "Boost"}
                          </button>

                          <button
                            onClick={() => activateAddon(item, "spotlight")}
                            disabled={isSpotlighting}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            <Gem className="h-4 w-4" />
                            {isSpotlighting
                              ? "Loading..."
                              : item.spotlightActive
                              ? "Renew Spotlight"
                              : "Spotlight"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filteredListings.length} listing
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-gray-200 bg-[#1C1C1E] px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            Sebelumnya
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                page === p
                  ? "border-black bg-black text-white"
                  : "border-gray-400 bg-white text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-gray-400 bg-[#1C1C1E] px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}