"use client";

import { useState, useMemo, useEffect } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  CheckCircle,
  XCircle,
  Star,
  PauseCircle,
  Gem,
  Zap,
  Trash2,
} from "lucide-react";

/* =========================
TYPES
========================= */

type ListingStatus =
  | "PENDING"
  | "ACTIVE"
  | "FEATURED"
  | "PAUSED"
  | "REJECTED";

type AdminAction =
  | "ACTIVE"
  | "REJECTED"
  | "FEATURED"
  | "SPOTLIGHT"
  | "BOOST"
  | "PAUSED";

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

type Listing = {
  id: string;
  kode: string;
  title: string;
  price: string;
  city: string;
  owner: string;
  agent: string;
  postedDate: string;
  status: ListingStatus;
  featuredActive: boolean;
  spotlightActive: boolean;
  boostActive: boolean;
  photos?: string[];
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
  is_paused: boolean | null;
  featured_expires_at: string | null;
  boost_active: boolean | null;
  boost_expires_at: string | null;
  spotlight_active: boolean | null;
  spotlight_expires_at: string | null;
  verified_ok: boolean | null;
  verification_status: string | null;
  property_images: PropertyImageRow[] | null;
  profiles: ProfileRow | ProfileRow[] | null;
};

/* =========================
HELPERS
========================= */

function formatIdr(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(typeof value === "number" ? value : 0);
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

function isFutureDate(value?: string | null) {
  if (!value) return false;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;

  return d.getTime() > Date.now();
}

function addDaysIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function visiblePageNumbers(current: number, total: number) {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);

  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }

  return pages;
}

function mapListingStatus(row: PropertyRow): ListingStatus {
  const status = (row.status || "").toLowerCase();
  const verificationStatus = (row.verification_status || "").toLowerCase();

  if (status === "rejected" || verificationStatus === "rejected") {
    return "REJECTED";
  }

  if (row.is_paused) return "PAUSED";

  if (
    row.plan_id === "featured" &&
    (!row.featured_expires_at || isFutureDate(row.featured_expires_at))
  ) {
    return "FEATURED";
  }

  if (
    status === "pending" ||
    status === "pending_approval" ||
    verificationStatus === "pending_verification" ||
    verificationStatus === "pending_approval"
  ) {
    return "PENDING";
  }

  return "ACTIVE";
}

/* =========================
STATUS UI
========================= */

function statusUI(status: ListingStatus) {
  if (status === "PENDING") {
    return {
      label: "Pending Review",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "ACTIVE") {
    return {
      label: "Active",
      badge: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "FEATURED") {
    return {
      label: "Featured",
      badge: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  if (status === "PAUSED") {
    return {
      label: "Paused",
      badge: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  return {
    label: "Rejected",
    badge: "bg-red-50 text-red-700 border-red-200",
  };
}

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
        {title}
      </p>
      <p className="mt-1.5 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
        {value}
      </p>
    </div>
  );
}

/* =========================
PAGE
========================= */

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let ignore = false;

    async function loadListings() {
      setLoading(true);
      setLoadError("");

      try {
        const { data, error } = await supabase
          .from("properties")
          .select(`
            id,
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
            is_paused,
            featured_expires_at,
            boost_active,
            boost_expires_at,
            spotlight_active,
            spotlight_expires_at,
            verified_ok,
            verification_status,
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
          .order("created_at", { ascending: false });

        if (error) throw error;

        const mapped: Listing[] = ((data ?? []) as PropertyRow[]).map((item) => {
          const profile = Array.isArray(item.profiles)
            ? item.profiles[0]
            : item.profiles;

          const source = (item.source || "").toLowerCase();

          const sortedImages = [...(item.property_images ?? [])].sort((a, b) => {
            const coverA = a.is_cover ? 1 : 0;
            const coverB = b.is_cover ? 1 : 0;

            if (coverA !== coverB) return coverB - coverA;
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          });

          const photos = sortedImages.length
            ? sortedImages.map((img) => img.image_url)
            : [
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
              ];

          return {
            id: item.id,
            kode: item.kode || "-",
            title: item.title || "-",
            price: formatIdr(item.price),
            city: item.city || item.area || "-",
            owner: source === "owner" ? profile?.full_name || "Unknown Owner" : "-",
            agent: source === "agent" ? profile?.full_name || "Unknown Agent" : "-",
            postedDate: formatPostedDate(item.posted_date || item.created_at),
            status: mapListingStatus(item),
            featuredActive:
              item.plan_id === "featured" &&
              (!item.featured_expires_at || isFutureDate(item.featured_expires_at)),
            spotlightActive:
              Boolean(item.spotlight_active) &&
              (!item.spotlight_expires_at || isFutureDate(item.spotlight_expires_at)),
            boostActive:
              Boolean(item.boost_active) &&
              (!item.boost_expires_at || isFutureDate(item.boost_expires_at)),
            photos,
          };
        });

        if (!ignore) {
          setListings(mapped);
        }
      } catch (error: any) {
        console.error("Failed to load admin listings:", error);
        if (!ignore) {
          setLoadError(error?.message || "Failed to load listings.");
          setListings([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      ignore = true;
    };
  }, []);

  /* =========================
  SEARCH
  ========================= */

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return listings;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return listings.filter((l) => {
      const searchable = `
        ${l.title}
        ${l.city}
        ${l.kode}
        ${l.owner}
        ${l.agent}
        ${l.price}
        ${l.status}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, listings]);

  const stats = useMemo(() => {
    return {
      total: listings.length,
      pending: listings.filter((item) => item.status === "PENDING").length,
      active: listings.filter((item) => item.status === "ACTIVE").length,
      featured: listings.filter((item) => item.status === "FEATURED").length,
      paused: listings.filter((item) => item.status === "PAUSED").length,
      rejected: listings.filter((item) => item.status === "REJECTED").length,
    };
  }, [listings]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, listings.length]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredListings.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = filteredListings.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredListings.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredListings.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

  /* =========================
  ACTIONS
  ========================= */

  async function updateStatus(id: string, action: AdminAction) {
    setUpdatingId(id);

    const current = listings.find((item) => item.id === id);

    try {
      if (action === "ACTIVE") {
        const { error } = await supabase
          .from("properties")
          .update({
            status: "active",
            is_paused: false,
            verified_ok: true,
            verification_status: "verified",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        setListings((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: l.featuredActive ? "FEATURED" : "ACTIVE",
                }
              : l
          )
        );

        setToast({
          type: "success",
          message: "Property has been approved and activated.",
        });

        window.dispatchEvent(new CustomEvent("tetamo-approvals-updated"));
        setUpdatingId(null);
        return;
      }

      if (action === "REJECTED") {
        const { error } = await supabase
          .from("properties")
          .update({
            status: "rejected",
            verification_status: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: "REJECTED" } : l))
        );

        setToast({
          type: "success",
          message: "Property has been rejected.",
        });

        window.dispatchEvent(new CustomEvent("tetamo-approvals-updated"));
        setUpdatingId(null);
        return;
      }

      if (action === "FEATURED") {
        const { error } = await supabase
          .from("properties")
          .update({
            status: "active",
            is_paused: false,
            verified_ok: true,
            verification_status: "verified",
            plan_id: "featured",
            featured_expires_at: addDaysIso(30),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        setListings((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: "FEATURED",
                  featuredActive: true,
                }
              : l
          )
        );

        setToast({
          type: "success",
          message: "This property has been featured for 30 days.",
        });

        window.dispatchEvent(new CustomEvent("tetamo-approvals-updated"));
        setUpdatingId(null);
        return;
      }

      if (action === "SPOTLIGHT") {
        const { error } = await supabase
          .from("properties")
          .update({
            status: "active",
            is_paused: false,
            verified_ok: true,
            verification_status: "verified",
            spotlight_active: true,
            spotlight_expires_at: addDaysIso(7),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        setListings((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: l.featuredActive ? "FEATURED" : "ACTIVE",
                  spotlightActive: true,
                }
              : l
          )
        );

        setToast({
          type: "success",
          message: "This property is now in spotlight for 7 days.",
        });

        setUpdatingId(null);
        return;
      }

      if (action === "BOOST") {
        const { error } = await supabase
          .from("properties")
          .update({
            status: "active",
            is_paused: false,
            verified_ok: true,
            verification_status: "verified",
            boost_active: true,
            boost_expires_at: addDaysIso(14),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        setListings((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: l.featuredActive ? "FEATURED" : "ACTIVE",
                  boostActive: true,
                }
              : l
          )
        );

        setToast({
          type: "success",
          message: "This property has been boosted for 14 days.",
        });

        setUpdatingId(null);
        return;
      }

      if (action === "PAUSED") {
        const nextPaused = current?.status !== "PAUSED";

        const { error } = await supabase
          .from("properties")
          .update({
            is_paused: nextPaused,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) throw error;

        setListings((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: nextPaused
                    ? "PAUSED"
                    : l.featuredActive
                    ? "FEATURED"
                    : "ACTIVE",
                }
              : l
          )
        );

        setToast({
          type: "success",
          message: nextPaused
            ? "Property has been paused."
            : "Property has been reactivated.",
        });

        setUpdatingId(null);
      }
    } catch (error: any) {
      console.error("Failed to update listing:", error);
      setToast({
        type: "error",
        message: error?.message || "Failed to update listing.",
      });
      setUpdatingId(null);
    }
  }

  async function deleteListing(id: string) {
    const current = listings.find((item) => item.id === id);
    const confirmDelete = window.confirm(
      `Delete this listing?\n\n${current?.title || "Untitled Listing"}\n${current?.kode || ""}\n\nThis cannot be undone.`
    );

    if (!confirmDelete) return;

    setDeletingId(id);

    try {
      const { error: imageDeleteError } = await supabase
        .from("property_images")
        .delete()
        .eq("property_id", id);

      if (imageDeleteError) throw imageDeleteError;

      const { error: propertyDeleteError } = await supabase
        .from("properties")
        .delete()
        .eq("id", id);

      if (propertyDeleteError) throw propertyDeleteError;

      setListings((prev) => prev.filter((item) => item.id !== id));

      setToast({
        type: "success",
        message: "Listing has been deleted.",
      });

      window.dispatchEvent(new CustomEvent("tetamo-approvals-updated"));
    } catch (error: any) {
      console.error("Failed to delete listing:", error);
      setToast({
        type: "error",
        message: error?.message || "Failed to delete listing.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  /* =========================
  UI
  ========================= */

  function ActionButton({
    onClick,
    disabled,
    title,
    label,
    className,
    children,
  }: {
    onClick: () => void;
    disabled: boolean;
    title: string;
    label: string;
    className: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={className}
        type="button"
      >
        <span className="shrink-0">{children}</span>
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {toast ? (
        <div className="fixed right-3 top-3 z-50 sm:right-6 sm:top-6">
          <div
            className={[
              "min-w-[250px] max-w-[320px] rounded-2xl border px-4 py-3 shadow-xl backdrop-blur",
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800",
            ].join(" ")}
          >
            <p className="text-sm font-semibold">
              {toast.type === "success" ? "Success" : "Something went wrong"}
            </p>
            <p className="mt-1 text-xs sm:text-sm">{toast.message}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Listings Control
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Approve, reject, feature, and manage all marketplace listings.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Total Listings" value={stats.total} />
        <SummaryCard title="Pending" value={stats.pending} />
        <SummaryCard title="Active" value={stats.active} />
        <SummaryCard title="Featured" value={stats.featured} />
        <SummaryCard title="Paused" value={stats.paused} />
        <SummaryCard title="Rejected" value={stats.rejected} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:gap-5">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Listing Overview
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              Review listing health, search results, and moderation flow.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Search Result
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  {filteredListings.length}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Current Page
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  {page} / {totalPages}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {(
                ["PENDING", "ACTIVE", "FEATURED", "PAUSED", "REJECTED"] as ListingStatus[]
              ).map((status) => {
                const ui = statusUI(status);

                return (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2.5"
                  >
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badge}`}
                    >
                      {ui.label}
                    </span>

                    <span className="text-sm font-semibold text-[#1C1C1E]">
                      {status === "PENDING"
                        ? stats.pending
                        : status === "ACTIVE"
                        ? stats.active
                        : status === "FEATURED"
                        ? stats.featured
                        : status === "PAUSED"
                        ? stats.paused
                        : stats.rejected}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Action Guide
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              Use the controls to approve, reject, feature, spotlight, boost,
              pause, or remove a listing.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3">
                <p className="text-[12px] font-semibold text-green-800 sm:text-sm">
                  Approve
                </p>
                <p className="mt-1 text-[11px] leading-5 text-green-700 sm:text-xs md:text-sm">
                  Marks the property as active and verified.
                </p>
              </div>

              <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                <p className="text-[12px] font-semibold text-red-800 sm:text-sm">
                  Reject / Delete
                </p>
                <p className="mt-1 text-[11px] leading-5 text-red-700 sm:text-xs md:text-sm">
                  Rejects a listing or removes it permanently.
                </p>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3">
                <p className="text-[12px] font-semibold text-purple-800 sm:text-sm">
                  Feature / Spotlight
                </p>
                <p className="mt-1 text-[11px] leading-5 text-purple-700 sm:text-xs md:text-sm">
                  Adds premium placement and stronger visibility.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-[12px] font-semibold text-gray-800 sm:text-sm">
                  Pause / Reactivate
                </p>
                <p className="mt-1 text-[11px] leading-5 text-gray-700 sm:text-xs md:text-sm">
                  Temporarily hides the property until reactivated.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                All Listings
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                Search, review, and manage every marketplace listing.
              </p>

              <div className="relative mt-3">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />

                <input
                  type="text"
                  placeholder="Search listing, owner, agent, city, code..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E] sm:text-sm"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                  Loading listings...
                </div>
              ) : paginated.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                  No listings found.
                </div>
              ) : (
                paginated.map((item) => {
                  const ui = statusUI(item.status);
                  const isUpdating = updatingId === item.id;
                  const isDeleting = deletingId === item.id;
                  const isBusy = isUpdating || isDeleting;

                  const cover =
                    item.photos?.[0] ??
                    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80";

                  return (
                    <div key={item.id} className="px-3.5 py-4 sm:px-5">
                      <div className="flex flex-col gap-3.5">
                        <div className="flex items-start gap-3">
                          <div className="h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-36">
                            <img
                              src={cover}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badge}`}
                              >
                                {ui.label}
                              </span>

                              {item.spotlightActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold text-cyan-700 sm:text-[11px]">
                                  <Gem size={11} />
                                  Spotlight
                                </span>
                              ) : null}

                              {item.boostActive ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 sm:text-[11px]">
                                  <Zap size={11} />
                                  Boost
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-2 line-clamp-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                              {item.title}
                            </p>

                            <p className="mt-1 text-[12px] font-medium text-gray-600 sm:text-[13px]">
                              {item.price}
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                              Owner: {item.owner}{" "}
                              <span className="text-gray-300">•</span> Agent: {item.agent}{" "}
                              <span className="text-gray-300">•</span> {item.city}
                            </p>

                            <p className="mt-1 text-[10px] text-gray-400 sm:text-[11px]">
                              Code: {item.kode} <span className="text-gray-300">•</span>{" "}
                              {item.postedDate}
                            </p>
                          </div>
                        </div>

                        <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-2">
                          <button
                            onClick={() => updateStatus(item.id, "ACTIVE")}
                            disabled={isBusy}
                            title="Approve / Activate"
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                            type="button"
                          >
                            <CheckCircle size={16} />
                          </button>

                          <button
                            onClick={() => updateStatus(item.id, "REJECTED")}
                            disabled={isBusy}
                            title="Reject"
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                            type="button"
                          >
                            <XCircle size={16} />
                          </button>

                          <button
                            onClick={() => updateStatus(item.id, "FEATURED")}
                            disabled={isBusy}
                            title="Feature for 30 days"
                            className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                            type="button"
                          >
                            <Star size={16} />
                          </button>

                          <button
                            onClick={() => updateStatus(item.id, "SPOTLIGHT")}
                            disabled={isBusy}
                            title="Spotlight for 7 days"
                            className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50"
                            type="button"
                          >
                            <Gem size={16} />
                          </button>

                          <button
                            onClick={() => updateStatus(item.id, "BOOST")}
                            disabled={isBusy}
                            title="Boost for 14 days"
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                            type="button"
                          >
                            <Zap size={16} />
                          </button>

                          <button
                            onClick={() => updateStatus(item.id, "PAUSED")}
                            disabled={isBusy}
                            title={item.status === "PAUSED" ? "Unpause" : "Pause"}
                            className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                            type="button"
                          >
                            <PauseCircle size={16} />
                          </button>

                          <button
                            onClick={() => deleteListing(item.id)}
                            disabled={isBusy}
                            title="Delete listing"
                            className="rounded-lg border border-red-300 bg-red-600 px-3 py-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                            type="button"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 lg:hidden md:grid-cols-3">
                          <ActionButton
                            onClick={() => updateStatus(item.id, "ACTIVE")}
                            disabled={isBusy}
                            title="Approve / Activate"
                            label="Approve"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 text-[12px] font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50 sm:text-sm"
                          >
                            <CheckCircle size={15} />
                          </ActionButton>

                          <ActionButton
                            onClick={() => updateStatus(item.id, "REJECTED")}
                            disabled={isBusy}
                            title="Reject"
                            label="Reject"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-[12px] font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 sm:text-sm"
                          >
                            <XCircle size={15} />
                          </ActionButton>

                          <ActionButton
                            onClick={() => updateStatus(item.id, "FEATURED")}
                            disabled={isBusy}
                            title="Feature for 30 days"
                            label="Feature"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 text-[12px] font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50 sm:text-sm"
                          >
                            <Star size={15} />
                          </ActionButton>

                          <ActionButton
                            onClick={() => updateStatus(item.id, "SPOTLIGHT")}
                            disabled={isBusy}
                            title="Spotlight for 7 days"
                            label="Spotlight"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-[12px] font-medium text-cyan-700 transition hover:bg-cyan-100 disabled:opacity-50 sm:text-sm"
                          >
                            <Gem size={15} />
                          </ActionButton>

                          <ActionButton
                            onClick={() => updateStatus(item.id, "BOOST")}
                            disabled={isBusy}
                            title="Boost for 14 days"
                            label="Boost"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-[12px] font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 sm:text-sm"
                          >
                            <Zap size={15} />
                          </ActionButton>

                          <ActionButton
                            onClick={() => updateStatus(item.id, "PAUSED")}
                            disabled={isBusy}
                            title={item.status === "PAUSED" ? "Unpause" : "Pause"}
                            label={item.status === "PAUSED" ? "Unpause" : "Pause"}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-3 text-[12px] font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50 sm:text-sm"
                          >
                            <PauseCircle size={15} />
                          </ActionButton>

                          <button
                            onClick={() => deleteListing(item.id)}
                            disabled={isBusy}
                            title="Delete listing"
                            className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-600 px-3 text-[12px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50 md:col-span-3 sm:text-sm"
                            type="button"
                          >
                            <Trash2 size={15} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
              Showing {startItem}–{endItem} of {filteredListings.length} listings
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
                type="button"
              >
                Previous
              </button>

              {visiblePages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                    page === p
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
                  type="button"
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}