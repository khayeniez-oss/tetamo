"use client";

import { useRouter } from "next/navigation";
import type { ElementType } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Home,
  Users,
  CalendarDays,
  BadgeCheck,
  PhoneCall,
  Eye,
  Pencil,
  Plus,
  Bookmark,
  Heart,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAgentProfile } from "./layout";
import { useLanguage } from "@/app/context/LanguageContext";

/* =========================
   AGENT TYPES
========================= */

type LeadStatus = "NEW" | "CONTACTED" | "VIEWING" | "INTERESTED" | "CLOSED";

type AssignedListing = {
  id: string;
  kode: string;
  ownerId: string;
  title: string;
  price: string;
  city: string;
  postedDate: string;
  photos?: string[];
  totalLeads: number;
  leadStatus: LeadStatus;
};

type AgentDashboardData = {
  stats: {
    totalListing: number;
    totalLeads: number;
    viewingToday: number;
    interestedLeads: number;
  };
  listings: AssignedListing[];
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
};

type PropertyImageRow = {
  id: string;
  property_id: string;
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type LeadRow = {
  id: string;
  property_id: string | null;
  status: string | null;
  lead_type: string | null;
  viewing_date: string | null;
  created_at: string | null;
};

type PaymentRow = {
  id: string;
  user_id: string | null;
  user_type?: string | null;
  audience?: string | null;
  product_type?: string | null;
  product_name?: string | null;
  payment_title?: string | null;
  billing_cycle?: string | null;
  duration_days?: number | null;
  status?: string | null;
  created_at?: string | null;
  metadata?: Record<string, any> | null;
};

/* =========================
   HELPERS
========================= */

function leadStatusUI(status: LeadStatus, lang: string) {
  if (status === "NEW") {
    return {
      label: lang === "id" ? "Baru" : "New",
      Icon: Users,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "CONTACTED") {
    return {
      label: lang === "id" ? "Dihubungi" : "Contacted",
      Icon: PhoneCall,
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  if (status === "VIEWING") {
    return {
      label: "Viewing",
      Icon: CalendarDays,
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "INTERESTED") {
    return {
      label: lang === "id" ? "Tertarik" : "Interested",
      Icon: Eye,
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: lang === "id" ? "Selesai" : "Closed",
    Icon: BadgeCheck,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
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
    <div className="rounded-[24px] border border-gray-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-gray-500 sm:text-xs">
            {title}
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-[#1C1C1E] sm:mt-2 sm:text-3xl">
            {value}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F5F5F5] sm:h-11 sm:w-11">
          <Icon className="h-4.5 w-4.5 text-[#1C1C1E] sm:h-5 sm:w-5" />
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

function toDateOnlyString(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function deriveLeadStatus(leads: LeadRow[]): LeadStatus {
  if (leads.length === 0) return "NEW";

  const statuses = leads.map((lead) => normalizeStatus(lead.status));

  const hasInterested = statuses.some((s) => s === "interested");
  const hasViewing =
    statuses.some((s) => s === "viewing") ||
    leads.some((lead) => normalizeStatus(lead.lead_type) === "viewing") ||
    leads.some((lead) => Boolean(lead.viewing_date));
  const hasContacted = statuses.some((s) => s === "contacted");
  const hasNew = statuses.some((s) => s === "new");
  const hasClosed = statuses.some((s) => s === "closed");

  if (hasInterested) return "INTERESTED";
  if (hasViewing) return "VIEWING";
  if (hasContacted) return "CONTACTED";
  if (hasNew) return "NEW";
  if (hasClosed) return "CLOSED";

  return "NEW";
}

function pickCoverPhotos(
  properties: PropertyRow[],
  images: PropertyImageRow[],
  leads: LeadRow[]
): AssignedListing[] {
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

    const listingLeads = leads.filter((lead) => lead.property_id === property.id);
    const cover = propertyImages[0]?.image_url || fallbackPhoto;

    return {
      id: property.id,
      kode: property.kode || "-",
      ownerId: property.user_id || "",
      title: property.title || "Tanpa Judul",
      price: formatCurrency(property.price),
      city: property.city || property.area || property.province || "-",
      postedDate: formatDisplayDate(property.posted_date || property.created_at),
      totalLeads: listingLeads.length,
      leadStatus: deriveLeadStatus(listingLeads),
      photos: [cover],
    };
  });
}

function getMembershipDurationDays(row: PaymentRow) {
  if (typeof row.duration_days === "number" && row.duration_days > 0) {
    return row.duration_days;
  }

  const metadataDuration = row.metadata?.duration_days;
  if (typeof metadataDuration === "number" && metadataDuration > 0) {
    return metadataDuration;
  }

  const cycle = String(
    row.billing_cycle || row.metadata?.billing_cycle || ""
  ).toLowerCase();

  if (cycle === "monthly") return 30;
  if (cycle === "yearly") return 365;

  return null;
}

function isMembershipStillActive(row: PaymentRow) {
  const createdAt = row.created_at ? new Date(row.created_at) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    return false;
  }

  const durationDays = getMembershipDurationDays(row);

  if (!durationDays) {
    return true;
  }

  const endDate = new Date(createdAt);
  endDate.setDate(endDate.getDate() + durationDays);

  return endDate.getTime() >= Date.now();
}

function getMembershipLabel(row: PaymentRow | null, lang: string) {
  if (!row) return "";

  const cycle = String(
    row.billing_cycle || row.metadata?.billing_cycle || ""
  ).toLowerCase();

  const productName = String(
    row.product_name || row.payment_title || ""
  ).trim();

  if (cycle === "monthly") {
    return lang === "id" ? "Bulanan" : "Monthly";
  }

  if (cycle === "yearly") {
    return lang === "id" ? "Tahunan" : "Yearly";
  }

  return productName;
}

/* =========================
   PAGE
========================= */

export default function AgentDashboardPage() {
  const router = useRouter();
  const { userId, loadingProfile } = useAgentProfile();
  const { lang } = useLanguage();

  const [dashboardData, setDashboardData] = useState<AgentDashboardData>({
    stats: {
      totalListing: 0,
      totalLeads: 0,
      viewingToday: 0,
      interestedLeads: 0,
    },
    listings: [],
  });

  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [checkingMembership, setCheckingMembership] = useState(true);
  const [hasActiveMembership, setHasActiveMembership] = useState(false);
  const [activeMembershipLabel, setActiveMembershipLabel] = useState("");

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let isMounted = true;

    async function checkAgentMembership() {
      if (!userId) {
        if (isMounted) {
          setHasActiveMembership(false);
          setActiveMembershipLabel("");
          setCheckingMembership(false);
        }
        return;
      }

      try {
        setCheckingMembership(true);

        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const rows = ((data || []) as PaymentRow[]).filter((row) => {
          const status = String(row.status || "").toLowerCase();
          const audience = String(row.audience || row.user_type || "").toLowerCase();
          const productType = String(row.product_type || "").toLowerCase();
          const productName = String(
            row.product_name || row.payment_title || ""
          ).toLowerCase();

          const isPaid =
            status === "paid" ||
            status === "succeeded" ||
            status === "completed" ||
            status === "active" ||
            status === "success" ||
            status === "settled";

          const isAgent =
            audience === "agent" || productName.includes("agent");

          const isMembership =
            productType === "membership" ||
            productName.includes("membership") ||
            productName.includes("agent");

          return isPaid && isAgent && isMembership;
        });

        const activeRow = rows.find((row) => isMembershipStillActive(row)) || null;

        if (!isMounted) return;

        setHasActiveMembership(Boolean(activeRow));
        setActiveMembershipLabel(getMembershipLabel(activeRow, lang));
      } catch {
        if (!isMounted) return;
        setHasActiveMembership(false);
        setActiveMembershipLabel("");
      } finally {
        if (isMounted) {
          setCheckingMembership(false);
        }
      }
    }

    checkAgentMembership();

    return () => {
      isMounted = false;
    };
  }, [userId, lang]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!userId) {
        if (!loadingProfile && isMounted) {
          setDashboardData({
            stats: {
              totalListing: 0,
              totalLeads: 0,
              viewingToday: 0,
              interestedLeads: 0,
            },
            listings: [],
          });
          setLoadingDashboard(false);
        }
        return;
      }

      try {
        setLoadingDashboard(true);
        setErrorMessage("");

        const { data: propertyRows, error: propertyError } = await supabase
          .from("properties")
          .select(
            "id, user_id, kode, title, price, city, area, province, posted_date, created_at, source, status"
          )
          .eq("user_id", userId)
          .eq("source", "agent")
          .order("created_at", { ascending: false });

        if (propertyError) {
          throw propertyError;
        }

        const properties = (propertyRows || []) as PropertyRow[];
        const propertyIds = properties.map((item) => item.id);

        let images: PropertyImageRow[] = [];
        let leads: LeadRow[] = [];

        if (propertyIds.length > 0) {
          const [{ data: imageRows, error: imageError }, { data: leadRows, error: leadError }] =
            await Promise.all([
              supabase
                .from("property_images")
                .select("id, property_id, image_url, sort_order, is_cover")
                .in("property_id", propertyIds),
              supabase
                .from("leads")
                .select("id, property_id, status, lead_type, viewing_date, created_at")
                .in("property_id", propertyIds),
            ]);

          if (imageError) {
            throw imageError;
          }

          if (leadError) {
            throw leadError;
          }

          images = (imageRows || []) as PropertyImageRow[];
          leads = (leadRows || []) as LeadRow[];
        }

        const listings = pickCoverPhotos(properties, images, leads);

        const today = toDateOnlyString(new Date());
        const viewingToday = leads.filter((lead) => {
          if (!lead.viewing_date) return false;
          const dateOnly = String(lead.viewing_date).slice(0, 10);
          return dateOnly === today;
        }).length;

        const interestedLeads = leads.filter(
          (lead) => normalizeStatus(lead.status) === "interested"
        ).length;

        if (!isMounted) return;

        setDashboardData({
          stats: {
            totalListing: properties.length,
            totalLeads: leads.length,
            viewingToday,
            interestedLeads,
          },
          listings,
        });
      } catch (error: any) {
        if (!isMounted) return;
        setErrorMessage(
          error?.message ||
            (lang === "id"
              ? "Gagal memuat dashboard agent."
              : "Failed to load agent dashboard.")
        );
      } finally {
        if (isMounted) {
          setLoadingDashboard(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [userId, loadingProfile, lang]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredListings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return dashboardData.listings;

    return dashboardData.listings.filter((listing) => {
      return (
        listing.title.toLowerCase().includes(query) ||
        listing.kode.toLowerCase().includes(query) ||
        listing.city.toLowerCase().includes(query)
      );
    });
  }, [dashboardData.listings, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  );

  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredListings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredListings, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleCreateListing() {
    if (checkingMembership) return;

    if (hasActiveMembership) {
      router.push("/agentdashboard/propertilokasi");
      return;
    }

    router.push("/agentdashboard/paket");
  }

  if (loadingProfile || loadingDashboard) {
    return (
      <main className="min-h-screen bg-[#F7F7F8]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-10">
          <div className="rounded-[24px] border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm sm:p-6">
            {lang === "id" ? "Memuat dashboard..." : "Loading dashboard..."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F8]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 lg:mb-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#1C1C1E] sm:text-xl lg:text-3xl">
              {lang === "id" ? "Dashboard Agen" : "Agent Dashboard"}
            </h1>
            <p className="mt-1 text-[12px] leading-5 text-gray-500 sm:text-sm sm:leading-6">
              {lang === "id"
                ? "Kelola listing agent, leads, dan update properti Anda."
                : "Manage your agent listings, leads, and property updates."}
            </p>
          </div>

          <div className="flex w-full flex-col items-start gap-2 sm:w-auto lg:items-end">
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto lg:justify-end">
              <button
                type="button"
                onClick={() => router.push("/agentdashboard/saved")}
                className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] font-semibold text-amber-700 transition hover:bg-amber-100 sm:text-sm"
              >
                <Bookmark className="h-4 w-4" />
                {lang === "id" ? "Tersimpan" : "Saved"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/agentdashboard/liked")}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-700 transition hover:bg-rose-100 sm:text-sm"
              >
                <Heart className="h-4 w-4" />
                {lang === "id" ? "Disukai" : "Liked"}
              </button>
            </div>

            <button
              onClick={handleCreateListing}
              disabled={checkingMembership}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-5 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              {checkingMembership
                ? lang === "id"
                  ? "Memeriksa Membership..."
                  : "Checking Membership..."
                : lang === "id"
                ? "Buat Listing Baru"
                : "Create New Listing"}
            </button>

            {!checkingMembership && (
              <p className="mt-1 text-[12px] text-gray-500 lg:text-right sm:text-[13px]">
                {hasActiveMembership
                  ? lang === "id"
                    ? `Membership aktif${activeMembershipLabel ? `: ${activeMembershipLabel}` : ""}`
                    : `Active membership${activeMembershipLabel ? `: ${activeMembershipLabel}` : ""}`
                  : lang === "id"
                  ? "Belum ada membership aktif"
                  : "No active membership yet"}
              </p>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 sm:text-[13px]">
            {errorMessage}
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:mb-7 xl:grid-cols-4">
          <StatCard
            title={lang === "id" ? "Total Listing" : "Total Listings"}
            value={dashboardData.stats.totalListing}
            Icon={Home}
          />
          <StatCard
            title={lang === "id" ? "Total Leads" : "Total Leads"}
            value={dashboardData.stats.totalLeads}
            Icon={Users}
          />
          <StatCard
            title={lang === "id" ? "Viewing Hari Ini" : "Viewings Today"}
            value={dashboardData.stats.viewingToday}
            Icon={CalendarDays}
          />
          <StatCard
            title={lang === "id" ? "Lead Tertarik" : "Interested Leads"}
            value={dashboardData.stats.interestedLeads}
            Icon={BadgeCheck}
          />
        </div>

        <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-gray-200 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === "id"
                  ? "Cari judul, kode, atau kota..."
                  : "Search title, code, or city..."
              }
              className="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-[12px] outline-none transition focus:ring-2 focus:ring-black/10 sm:text-sm"
            />
          </div>

          <p className="text-[12px] text-gray-500 md:text-right sm:text-sm">
            {lang === "id"
              ? `Menampilkan ${filteredListings.length} listing`
              : `Showing ${filteredListings.length} listings`}
          </p>
        </div>

        {filteredListings.length === 0 ? (
          <div className="rounded-[26px] border border-gray-200 bg-white p-5 text-center shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-8">
            <h2 className="text-[15px] font-semibold text-[#1C1C1E] sm:text-lg">
              {lang === "id" ? "Belum ada listing" : "No listings yet"}
            </h2>
            <p className="mt-2 text-[12px] leading-5 text-gray-500 sm:text-sm sm:leading-6">
              {lang === "id"
                ? "Buat listing pertama Anda untuk mulai menerima leads."
                : "Create your first listing to start receiving leads."}
            </p>

            <button
              onClick={handleCreateListing}
              disabled={checkingMembership}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1C1C1E] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-5 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              {checkingMembership
                ? lang === "id"
                  ? "Memeriksa Membership..."
                  : "Checking Membership..."
                : lang === "id"
                ? "Buat Listing"
                : "Create Listing"}
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
              {paginatedListings.map((listing) => {
                const statusData = leadStatusUI(listing.leadStatus, lang);
                const coverPhoto = listing.photos?.[0] || "";

                return (
                  <div
                    key={listing.id}
                    className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
                  >
                    <div className="aspect-[16/10] w-full overflow-hidden bg-gray-100">
                      <img
                        src={coverPhoto}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="p-4 sm:p-6">
                      <p className="text-[15px] font-bold tracking-tight text-[#1C1C1E] sm:text-[20px]">
                        {listing.price}
                      </p>

                      <p className="mt-1 text-[12px] text-gray-500 sm:text-[15px]">
                        {listing.city}
                      </p>

                      <h3 className="mt-2 line-clamp-2 text-[14px] font-semibold leading-6 text-[#1C1C1E] sm:text-[22px] sm:leading-8">
                        {listing.title}
                      </h3>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-[10px] text-gray-400 sm:text-xs">
                          {listing.kode} <span className="mx-1">•</span> {listing.postedDate}
                        </p>

                        <div
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusData.badgeClass} sm:px-3 sm:text-[11px]`}
                        >
                          <statusData.Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {statusData.label}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between rounded-[18px] border border-gray-100 bg-[#F8F8F8] px-4 py-2.5">
                        <p className="text-[10px] font-medium text-gray-400 sm:text-xs">
                          {lang === "id" ? "Total Leads" : "Total Leads"}
                        </p>
                        <p className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                          {listing.totalLeads}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2.5">
                        <button
                          onClick={() =>
                            router.push(
                              `/agentdashboard/leads?kode=${encodeURIComponent(listing.kode)}`
                            )
                          }
                          className="inline-flex h-10 items-center justify-center rounded-2xl border border-gray-300 bg-white px-2 text-[10px] font-medium text-gray-700 transition hover:bg-gray-100 sm:h-11 sm:text-sm"
                        >
                          Leads
                        </button>

                        <button
                          onClick={() =>
                            router.push(
                              `/agentdashboard/propertilokasi/edit/${encodeURIComponent(
                                listing.kode
                              )}`
                            )
                          }
                          className="inline-flex h-10 items-center justify-center gap-1 rounded-2xl border border-gray-300 bg-white px-2 text-[10px] font-medium text-gray-700 transition hover:bg-gray-50 sm:h-11 sm:gap-1.5 sm:text-sm"
                        >
                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Edit
                        </button>

                        <button
                          onClick={() => router.push(`/properti/${listing.id}`)}
                          className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#1C1C1E] px-2 text-[10px] font-medium text-white transition hover:opacity-90 sm:h-11 sm:text-sm"
                        >
                          {lang === "id" ? "Lihat Iklan" : "View Listing"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
                >
                  {lang === "id" ? "Sebelumnya" : "Prev"}
                </button>

                {Array.from({ length: totalPages }).map((_, index) => {
                  const page = index + 1;
                  const active = currentPage === page;

                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`rounded-xl px-3 py-2 text-[12px] font-medium sm:px-4 sm:text-sm ${
                        active
                          ? "bg-[#1C1C1E] text-white"
                          : "border border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
                >
                  {lang === "id" ? "Berikutnya" : "Next"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}