"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import type { ElementType } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Home,
  CheckCircle2,
  AlertTriangle,
  Users,
  BadgeDollarSign,
  CalendarDays,
  Star,
  FileText,
  KeyRound,
  HandCoins,
  UserRound,
  BriefcaseBusiness,
} from "lucide-react";

/* =========================
   ADMIN TYPES
========================= */

type ListingStatus = "PENDING" | "ACTIVE" | "FEATURED" | "REJECTED";
type ClosedByRole = "owner" | "agent" | "-";

type AdminListing = {
  id: string;
  kode: string;
  title: string;
  price: string;
  city: string;
  ownerName: string;
  agentName: string;
  postedDate: string;
  status: ListingStatus;
  photos?: string[];
};

type ClosedDeal = {
  id: string;
  kode: string;
  title: string;
  price: string;
  city: string;
  transactionStatus: "sold" | "rented";
  closedByRole: ClosedByRole;
  closedByName: string;
  closedAt: string;
  photos?: string[];
};

type AdminDashboardData = {
  stats: {
    totalListings: number;
    pendingApprovals: number;
    totalLeads: number;
    totalRevenue: string;
    totalAgents: number;
    totalOwners: number;
    viewingsToday: number;
    soldByOwner: number;
    soldByAgent: number;
    rentedByOwner: number;
    rentedByAgent: number;
  };
  listings: AdminListing[];
  closedDeals: ClosedDeal[];
};

type PropertyImageRow = {
  image_url: string;
  sort_order: number | null;
  is_cover: boolean | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type PropertyRow = {
  id: string;
  user_id: string | null;
  kode: string | null;
  title: string | null;
  price: number | null;
  city: string | null;
  area: string | null;
  posted_date: string | null;
  status: string | null;
  source: string | null;
  plan_id: string | null;
  created_at: string | null;
  verification_status: string | null;
  transaction_status: string | null;
  transaction_closed_at: string | null;
  transaction_closed_by: string | null;
  contact_name: string | null;
  contact_role: string | null;
  property_images: PropertyImageRow[] | null;
  profiles: ProfileRow | ProfileRow[] | null;
};

type PaymentRow = {
  amount: number | null;
  status: string | null;
};

const EMPTY_ADMIN_DASHBOARD: AdminDashboardData = {
  stats: {
    totalListings: 0,
    pendingApprovals: 0,
    totalLeads: 0,
    totalRevenue: "Rp 0",
    totalAgents: 0,
    totalOwners: 0,
    viewingsToday: 0,
    soldByOwner: 0,
    soldByAgent: 0,
    rentedByOwner: 0,
    rentedByAgent: 0,
  },
  listings: [],
  closedDeals: [],
};

/* =========================
   HELPERS
========================= */

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPostedDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function normalizeRole(value?: string | null) {
  const v = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (v.includes("agent") || v.includes("agen")) return "agent";
  if (v.includes("owner") || v.includes("pemilik")) return "owner";
  if (v.includes("developer")) return "developer";

  return v;
}

function mapListingStatus(row: PropertyRow): ListingStatus {
  const status = normalizeRole(row.status);
  const verificationStatus = normalizeRole(row.verification_status);
  const planId = String(row.plan_id || "").toLowerCase();

  if (status === "rejected") return "REJECTED";

  if (
    status === "pending" ||
    status === "pending_approval" ||
    verificationStatus === "pending_verification" ||
    verificationStatus === "pending_approval"
  ) {
    return "PENDING";
  }

  if (planId === "featured") return "FEATURED";

  return "ACTIVE";
}

function listingStatusUI(status: ListingStatus) {
  if (status === "PENDING") {
    return {
      label: "Pending Approval",
      Icon: AlertTriangle,
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "ACTIVE") {
    return {
      label: "Active",
      Icon: CheckCircle2,
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "FEATURED") {
    return {
      label: "Featured",
      Icon: Star,
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  return {
    label: "Rejected",
    Icon: FileText,
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  };
}

function transactionUI(status: "sold" | "rented") {
  if (status === "sold") {
    return {
      label: "Sold",
      Icon: HandCoins,
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  return {
    label: "Rented",
    Icon: KeyRound,
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  };
}

function getProfile(
  input: ProfileRow | ProfileRow[] | null | undefined
): ProfileRow | null {
  if (!input) return null;
  if (Array.isArray(input)) return input[0] || null;
  return input;
}

function getSortedPhotos(images?: PropertyImageRow[] | null) {
  const fallback =
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

  if (!images || images.length === 0) return [fallback];

  return [...images]
    .sort((a, b) => {
      const coverA = a.is_cover ? 1 : 0;
      const coverB = b.is_cover ? 1 : 0;
      if (coverA !== coverB) return coverB - coverA;
      return (a.sort_order || 0) - (b.sort_order || 0);
    })
    .map((img) => img.image_url);
}

function resolveClosedByRole(
  row: PropertyRow,
  closerProfile?: ProfileRow | null
): ClosedByRole {
  const closerRole = normalizeRole(closerProfile?.role);
  const source = normalizeRole(row.source);

  if (closerRole === "owner") return "owner";
  if (closerRole === "agent") return "agent";

  if (source === "owner") return "owner";
  if (source === "agent") return "agent";

  return "-";
}

function resolveListingPosterRole(
  row: PropertyRow,
  profile?: ProfileRow | null
): "owner" | "agent" | "developer" | "-" {
  const role = normalizeRole(row.contact_role || row.source || profile?.role);

  if (role === "owner") return "owner";
  if (role === "agent") return "agent";
  if (role === "developer") return "developer";
  return "-";
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
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
            {title}
          </p>
          <p className="mt-2 break-words text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
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

/* =========================
   PAGE
========================= */

export default function AdminDashboardPage() {
  const router = useRouter();

  const [data, setData] = useState<AdminDashboardData>(EMPTY_ADMIN_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      setLoading(true);
      setLoadError("");

      const today = new Date().toISOString().slice(0, 10);

      try {
        const [
          totalListingsRes,
          pendingApprovalsRes,
          totalLeadsRes,
          profilesRes,
          viewingsTodayRes,
          recentListingsRes,
          closedDealsRes,
        ] = await Promise.all([
          supabase
            .from("properties")
            .select("*", { count: "exact", head: true })
            .neq("status", "rejected"),

          supabase
            .from("properties")
            .select("*", { count: "exact", head: true })
            .or(
              "status.eq.pending,status.eq.pending_approval,verification_status.eq.pending_verification,verification_status.eq.pending_approval"
            ),

          supabase.from("leads").select("*", { count: "exact", head: true }),

          supabase.from("profiles").select("id, full_name, role"),

          supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("lead_type", "viewing")
            .eq("viewing_date", today),

          supabase
            .from("properties")
            .select(`
              id,
              user_id,
              kode,
              title,
              price,
              city,
              area,
              posted_date,
              status,
              source,
              plan_id,
              created_at,
              verification_status,
              transaction_status,
              transaction_closed_at,
              transaction_closed_by,
              contact_name,
              contact_role,
              property_images (
                image_url,
                sort_order,
                is_cover
              ),
              profiles:user_id (
                id,
                full_name,
                role
              )
            `)
            .order("created_at", { ascending: false })
            .limit(50),

          supabase
            .from("properties")
            .select(`
              id,
              user_id,
              kode,
              title,
              price,
              city,
              area,
              posted_date,
              status,
              source,
              plan_id,
              created_at,
              verification_status,
              transaction_status,
              transaction_closed_at,
              transaction_closed_by,
              contact_name,
              contact_role,
              property_images (
                image_url,
                sort_order,
                is_cover
              ),
              profiles:user_id (
                id,
                full_name,
                role
              )
            `)
            .in("transaction_status", ["sold", "rented"])
            .order("transaction_closed_at", { ascending: false })
            .limit(50),
        ]);

        let revenueTotal = 0;

        try {
          const { data: paymentRows, error: paymentError } = await supabase
            .from("payments")
            .select("amount,status");

          if (!paymentError && paymentRows) {
            revenueTotal = (paymentRows as PaymentRow[]).reduce((sum, row) => {
              const status = String(row.status || "").toLowerCase();
              const amount = typeof row.amount === "number" ? row.amount : 0;

              return [
                "paid",
                "success",
                "succeeded",
                "completed",
                "active",
                "settled",
              ].includes(status)
                ? sum + amount
                : sum;
            }, 0);
          }
        } catch {
          revenueTotal = 0;
        }

        if (profilesRes.error) throw profilesRes.error;
        if (recentListingsRes.error) throw recentListingsRes.error;
        if (closedDealsRes.error) throw closedDealsRes.error;

        const profiles = (profilesRes.data ?? []) as ProfileRow[];
        const recentListingRows = (recentListingsRes.data ?? []) as PropertyRow[];
        const closedDealRows = (closedDealsRes.data ?? []) as PropertyRow[];

        let totalAgents = 0;
        let totalOwners = 0;

        for (const profile of profiles) {
          const role = normalizeRole(profile.role);

          if (role === "agent") totalAgents += 1;
          if (role === "owner") totalOwners += 1;
        }

        const closerIds = Array.from(
          new Set(
            closedDealRows
              .map((row) => row.transaction_closed_by)
              .filter(Boolean)
          )
        ) as string[];

        let closerProfilesMap = new Map<string, ProfileRow>();

        if (closerIds.length > 0) {
          const { data: closerProfiles, error: closerProfilesError } =
            await supabase
              .from("profiles")
              .select("id, full_name, role")
              .in("id", closerIds);

          if (closerProfilesError) throw closerProfilesError;

          closerProfilesMap = new Map(
            ((closerProfiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
          );
        }

        const mappedListings: AdminListing[] = recentListingRows.map((item) => {
          const profile = getProfile(item.profiles);
          const photos = getSortedPhotos(item.property_images);

          const posterRole = resolveListingPosterRole(item, profile);
          const displayName =
            item.contact_name || profile?.full_name || "Unknown User";

          return {
            id: item.id,
            kode: item.kode || "-",
            title: item.title || "-",
            price: formatIdr(item.price || 0),
            city: item.city || item.area || "-",
            ownerName: posterRole === "owner" ? displayName : "-",
            agentName: posterRole === "agent" ? displayName : "-",
            postedDate: formatPostedDate(item.posted_date || item.created_at),
            status: mapListingStatus(item),
            photos,
          };
        });

        const mappedClosedDeals: ClosedDeal[] = closedDealRows.map((item) => {
          const closerProfile = item.transaction_closed_by
            ? closerProfilesMap.get(item.transaction_closed_by) || null
            : null;

          const closedByRole = resolveClosedByRole(item, closerProfile);
          const photos = getSortedPhotos(item.property_images);

          return {
            id: item.id,
            kode: item.kode || "-",
            title: item.title || "-",
            price: formatIdr(item.price || 0),
            city: item.city || item.area || "-",
            transactionStatus:
              item.transaction_status === "rented" ? "rented" : "sold",
            closedByRole,
            closedByName:
              closerProfile?.full_name ||
              (closedByRole === "owner"
                ? "Owner Direct"
                : closedByRole === "agent"
                ? "Agent"
                : "-"),
            closedAt: formatPostedDate(item.transaction_closed_at || item.created_at),
            photos,
          };
        });

        let soldByOwner = 0;
        let soldByAgent = 0;
        let rentedByOwner = 0;
        let rentedByAgent = 0;

        for (const deal of mappedClosedDeals) {
          if (deal.transactionStatus === "sold") {
            if (deal.closedByRole === "owner") soldByOwner += 1;
            if (deal.closedByRole === "agent") soldByAgent += 1;
          }

          if (deal.transactionStatus === "rented") {
            if (deal.closedByRole === "owner") rentedByOwner += 1;
            if (deal.closedByRole === "agent") rentedByAgent += 1;
          }
        }

        if (!ignore) {
          setData({
            stats: {
              totalListings: totalListingsRes.count || 0,
              pendingApprovals: pendingApprovalsRes.count || 0,
              totalLeads: totalLeadsRes.count || 0,
              totalRevenue: formatIdr(revenueTotal),
              totalAgents,
              totalOwners,
              viewingsToday: viewingsTodayRes.count || 0,
              soldByOwner,
              soldByAgent,
              rentedByOwner,
              rentedByAgent,
            },
            listings: mappedListings,
            closedDeals: mappedClosedDeals,
          });
        }
      } catch (error: any) {
        console.error("Admin dashboard load error:", error);
        if (!ignore) {
          setLoadError(error?.message || "Failed to load admin dashboard.");
          setData(EMPTY_ADMIN_DASHBOARD);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return data.listings;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return data.listings.filter((listing) => {
      const searchable = `
        ${listing.title}
        ${listing.city}
        ${listing.kode}
        ${listing.price}
        ${listing.ownerName}
        ${listing.agentName}
        ${listing.status}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [data.listings, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, data.listings.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const startItem =
    filteredListings.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filteredListings.length);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let p = start; p <= end; p += 1) {
      pages.push(p);
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#1C1C1E] sm:text-2xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
            Monitor approvals, listings, revenue, marketplace activity, and recent closed deals.
          </p>
        </div>

        <button
          onClick={() => router.push("/admindashboard/listings")}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 sm:w-auto"
        >
          + Review Listings
        </button>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Listings"
          value={loading ? "..." : data.stats.totalListings}
          Icon={Home}
        />
        <StatCard
          title="Pending Approval"
          value={loading ? "..." : data.stats.pendingApprovals}
          Icon={AlertTriangle}
        />
        <StatCard
          title="Total Leads"
          value={loading ? "..." : data.stats.totalLeads}
          Icon={Users}
        />
        <StatCard
          title="Revenue"
          value={loading ? "..." : data.stats.totalRevenue}
          Icon={BadgeDollarSign}
        />
        <StatCard
          title="Total Agents"
          value={loading ? "..." : data.stats.totalAgents}
          Icon={Users}
        />
        <StatCard
          title="Total Owners"
          value={loading ? "..." : data.stats.totalOwners}
          Icon={Home}
        />
        <StatCard
          title="Viewings Today"
          value={loading ? "..." : data.stats.viewingsToday}
          Icon={CalendarDays}
        />
        <StatCard
          title="Sold by Owner / Agent"
          value={
            loading
              ? "..."
              : `${data.stats.soldByOwner} / ${data.stats.soldByAgent}`
          }
          Icon={UserRound}
        />
        <StatCard
          title="Rented by Owner / Agent"
          value={
            loading
              ? "..."
              : `${data.stats.rentedByOwner} / ${data.stats.rentedByAgent}`
          }
          Icon={BriefcaseBusiness}
        />
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={18}
        />

        <input
          type="text"
          placeholder="Search listings, owner, agent, city, status, code..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="h-11 w-full rounded-2xl border border-gray-300 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E]"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                Listing Review Queue
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                Monitor recent listings, approval status, owner, and assigned agent.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-6 text-sm text-gray-500 sm:px-6">
                  Loading listings...
                </div>
              ) : paginatedListings.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 sm:px-6">
                  No listings found.
                </div>
              ) : (
                paginatedListings.map((item) => {
                  const ui = listingStatusUI(item.status);
                  const BadgeIcon = ui.Icon;

                  const cover =
                    item.photos?.[0] ??
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

                  return (
                    <div key={item.id} className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-32">
                            <img
                              src={cover}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium sm:text-xs ${ui.badgeClass}`}
                              >
                                <BadgeIcon className="h-3.5 w-3.5" />
                                {ui.label}
                              </span>

                              <span className="text-[11px] text-gray-500 sm:text-xs">
                                Code: {item.kode}
                              </span>
                              <span className="text-[11px] text-gray-300 sm:text-xs">
                                •
                              </span>
                              <span className="text-[11px] text-gray-500 sm:text-xs">
                                {item.postedDate}
                              </span>
                              <span className="text-[11px] text-gray-300 sm:text-xs">
                                •
                              </span>
                              <span className="text-[11px] text-gray-500 sm:text-xs">
                                {item.city}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                              {item.title}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">{item.price}</p>

                            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                              Owner: {item.ownerName}{" "}
                              <span className="text-gray-300">•</span> Agent:{" "}
                              {item.agentName}
                            </p>
                          </div>
                        </div>

                        <div className="flex w-full justify-end">
                          <button
                            onClick={() => router.push("/admindashboard/listings")}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 sm:text-sm">
              Showing {startItem}–{endItem} of {filteredListings.length} listings
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                Previous
              </button>

              {visiblePages.map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-3 text-sm font-medium ${
                    currentPage === p
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-4 text-sm font-medium text-white disabled:opacity-60"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                Recent Closed Deals
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                Properties marked as sold or rented by owner or agent.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-6 text-sm text-gray-500 sm:px-6">
                  Loading closed deals...
                </div>
              ) : data.closedDeals.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-500 sm:px-6">
                  No closed deals yet.
                </div>
              ) : (
                data.closedDeals.slice(0, 12).map((item) => {
                  const ui = transactionUI(item.transactionStatus);
                  const BadgeIcon = ui.Icon;

                  const cover =
                    item.photos?.[0] ??
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

                  return (
                    <div key={item.id} className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-32">
                            <img
                              src={cover}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium sm:text-xs ${ui.badgeClass}`}
                              >
                                <BadgeIcon className="h-3.5 w-3.5" />
                                {ui.label}
                              </span>

                              <span className="text-[11px] text-gray-500 sm:text-xs">
                                Code: {item.kode}
                              </span>
                              <span className="text-[11px] text-gray-300 sm:text-xs">
                                •
                              </span>
                              <span className="text-[11px] text-gray-500 sm:text-xs">
                                {item.closedAt}
                              </span>
                              <span className="text-[11px] text-gray-300 sm:text-xs">
                                •
                              </span>
                              <span className="text-[11px] text-gray-500 sm:text-xs">
                                {item.city}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                              {item.title}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">{item.price}</p>

                            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                              Closed by: {item.closedByName}{" "}
                              <span className="text-gray-300">•</span> Role:{" "}
                              {item.closedByRole}
                            </p>
                          </div>
                        </div>

                        <div className="flex w-full justify-end">
                          <button
                            onClick={() => router.push("/admindashboard/listings")}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:w-auto"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}