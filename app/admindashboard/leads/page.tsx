"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Search,
  Users,
  PhoneCall,
  CalendarDays,
  Eye,
  BadgeCheck,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   TYPES
========================= */

type LeadStatus = "NEW" | "CONTACTED" | "VIEWING" | "INTERESTED" | "CLOSED";

type AdminLead = {
  id: string;
  buyerName: string;
  buyerPhone: string;
  propertyTitle: string;
  listingKode: string;
  agentName: string;
  ownerName: string;
  createdAt: string;
  status: LeadStatus;
  rawCreatedAt: string | null;
  receiverRole: string;
  leadType: string;
};

type LeadRow = {
  id: string;
  property_id: string | null;
  sender_user_id: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  receiver_user_id: string | null;
  receiver_role: string | null;
  created_at: string | null;
  status: string | null;
  lead_type: string | null;
};

type PropertyRow = {
  id: string;
  title: string | null;
  kode: string | null;
  source: string | null;
  user_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

/* =========================
   HELPERS
========================= */

function mapLeadStatus(
  status?: string | null,
  leadType?: string | null
): LeadStatus {
  const s = (status || "").toLowerCase();
  const lt = (leadType || "").toLowerCase();

  if (s === "new") return lt === "viewing" ? "VIEWING" : "NEW";
  if (s === "contacted") return "CONTACTED";
  if (s === "scheduled" || s === "viewing") return "VIEWING";
  if (s === "interested") return "INTERESTED";
  if (s === "completed" || s === "closed") return "CLOSED";

  return lt === "viewing" ? "VIEWING" : "NEW";
}

function dbStatusFromLeadStatus(status: LeadStatus): string {
  if (status === "NEW") return "new";
  if (status === "CONTACTED") return "contacted";
  if (status === "VIEWING") return "scheduled";
  if (status === "INTERESTED") return "interested";
  return "closed";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function leadStatusUI(status: LeadStatus) {
  if (status === "NEW") {
    return {
      label: "New",
      Icon: Users,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "CONTACTED") {
    return {
      label: "Contacted",
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
      label: "Interested",
      Icon: Eye,
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: "Closed",
    Icon: BadgeCheck,
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  };
}

function nextReviewStatus(status: LeadStatus): LeadStatus {
  if (status === "NEW") return "CONTACTED";
  if (status === "CONTACTED") return "VIEWING";
  if (status === "VIEWING") return "INTERESTED";
  if (status === "INTERESTED") return "CLOSED";
  return "CLOSED";
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

export default function AdminLeadsPage() {
  const [allLeads, setAllLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let ignore = false;

    async function loadLeads() {
      setLoading(true);
      setLoadError("");

      try {
        const { data: leadsData, error: leadsError } = await supabase
          .from("leads")
          .select(
            `
            id,
            property_id,
            sender_user_id,
            sender_name,
            sender_phone,
            receiver_user_id,
            receiver_role,
            created_at,
            status,
            lead_type
          `
          )
          .order("created_at", { ascending: false });

        if (leadsError) throw leadsError;

        const leads = (leadsData ?? []) as LeadRow[];

        const propertyIds = Array.from(
          new Set(leads.map((x) => x.property_id).filter(Boolean))
        ) as string[];

        const { data: propertiesData, error: propertiesError } = propertyIds.length
          ? await supabase
              .from("properties")
              .select("id,title,kode,source,user_id")
              .in("id", propertyIds)
          : { data: [], error: null };

        if (propertiesError) throw propertiesError;

        const properties = (propertiesData ?? []) as PropertyRow[];

        const userIds = Array.from(
          new Set(
            [
              ...leads.flatMap((x) =>
                [x.sender_user_id, x.receiver_user_id].filter(Boolean)
              ),
              ...properties.map((p) => p.user_id).filter(Boolean),
            ]
          )
        ) as string[];

        const { data: profilesData, error: profilesError } = userIds.length
          ? await supabase
              .from("profiles")
              .select("id,full_name")
              .in("id", userIds)
          : { data: [], error: null };

        if (profilesError) throw profilesError;

        const profiles = (profilesData ?? []) as ProfileRow[];

        const propertyMap = new Map(properties.map((p) => [p.id, p]));
        const profileMap = new Map(profiles.map((p) => [p.id, p]));

        const mapped: AdminLead[] = leads.map((lead) => {
          const property = lead.property_id
            ? propertyMap.get(lead.property_id)
            : null;

          const senderProfile = lead.sender_user_id
            ? profileMap.get(lead.sender_user_id)
            : null;

          const receiverProfile = lead.receiver_user_id
            ? profileMap.get(lead.receiver_user_id)
            : null;

          const propertyOwnerOrAgent = property?.user_id
            ? profileMap.get(property.user_id)
            : null;

          const propertySource = (property?.source || "").toLowerCase();
          const receiverRole = (lead.receiver_role || "").toLowerCase();

          const ownerName =
            receiverRole === "owner"
              ? receiverProfile?.full_name || "-"
              : propertySource === "owner"
              ? propertyOwnerOrAgent?.full_name || "-"
              : "-";

          const agentName =
            receiverRole === "agent"
              ? receiverProfile?.full_name || "-"
              : propertySource === "agent"
              ? propertyOwnerOrAgent?.full_name || "-"
              : "-";

          return {
            id: lead.id,
            buyerName:
              lead.sender_name || senderProfile?.full_name || "Unknown Buyer",
            buyerPhone: lead.sender_phone || "-",
            propertyTitle: property?.title || "-",
            listingKode: property?.kode || "-",
            agentName,
            ownerName,
            createdAt: formatDate(lead.created_at),
            rawCreatedAt: lead.created_at,
            status: mapLeadStatus(lead.status, lead.lead_type),
            receiverRole: lead.receiver_role || "-",
            leadType: lead.lead_type || "-",
          };
        });

        if (!ignore) {
          setAllLeads(mapped);
        }
      } catch (error: any) {
        console.error("Failed to load admin leads:", error);
        if (!ignore) {
          setLoadError(error?.message || "Failed to load leads.");
          setAllLeads([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadLeads();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return allLeads;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return allLeads.filter((lead) => {
      const searchable = `
        ${lead.buyerName}
        ${lead.buyerPhone}
        ${lead.propertyTitle}
        ${lead.listingKode}
        ${lead.agentName}
        ${lead.ownerName}
        ${lead.status}
        ${lead.leadType}
        ${lead.receiverRole}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [searchQuery, allLeads]);

  const stats = useMemo(() => {
    return {
      total: allLeads.length,
      newCount: allLeads.filter((lead) => lead.status === "NEW").length,
      contacted: allLeads.filter((lead) => lead.status === "CONTACTED").length,
      viewing: allLeads.filter((lead) => lead.status === "VIEWING").length,
      interested: allLeads.filter((lead) => lead.status === "INTERESTED").length,
      closed: allLeads.filter((lead) => lead.status === "CLOSED").length,
    };
  }, [allLeads]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, allLeads.length]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedLeads = filteredLeads.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredLeads.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredLeads.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

  async function updateLeadStatus(id: string, nextStatus: LeadStatus) {
    setStatusUpdatingId(id);

    const { error } = await supabase
      .from("leads")
      .update({
        status: dbStatusFromLeadStatus(nextStatus),
      })
      .eq("id", id);

    if (error) {
      console.error("Failed to update lead status:", error);
      alert(error.message || "Failed to update lead status.");
      setStatusUpdatingId(null);
      return;
    }

    setAllLeads((prev) =>
      prev.map((lead) =>
        lead.id === id ? { ...lead, status: nextStatus } : lead
      )
    );

    setSelectedLead((prev) =>
      prev && prev.id === id ? { ...prev, status: nextStatus } : prev
    );

    window.dispatchEvent(new CustomEvent("tetamo-leads-updated"));
    setStatusUpdatingId(null);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Leads
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Monitor all leads across owners, agents, and listings.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <SummaryCard title="Total Leads" value={stats.total} />
        <SummaryCard title="New" value={stats.newCount} />
        <SummaryCard title="Contacted" value={stats.contacted} />
        <SummaryCard title="Viewing" value={stats.viewing} />
        <SummaryCard title="Interested" value={stats.interested} />
        <SummaryCard title="Closed" value={stats.closed} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] xl:gap-5">
        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Lead Overview
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              Keep track of buyer activity, listing interest, and lead progress.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Search Result
                </p>
                <p className="mt-1.5 text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  {filteredLeads.length}
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
              {(["NEW", "CONTACTED", "VIEWING", "INTERESTED", "CLOSED"] as LeadStatus[]).map(
                (status) => {
                  const ui = leadStatusUI(status);
                  const Icon = ui.Icon;

                  return (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 px-3 py-2.5"
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badgeClass}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {ui.label}
                      </span>

                      <span className="text-sm font-semibold text-[#1C1C1E]">
                        {status === "NEW"
                          ? stats.newCount
                          : status === "CONTACTED"
                          ? stats.contacted
                          : status === "VIEWING"
                          ? stats.viewing
                          : status === "INTERESTED"
                          ? stats.interested
                          : stats.closed}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4">
            <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
              Lead Status Flow
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
              Review the lead and move it through the next stage when needed.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {(["NEW", "CONTACTED", "VIEWING", "INTERESTED", "CLOSED"] as LeadStatus[]).map(
                (status) => {
                  const ui = leadStatusUI(status);
                  const Icon = ui.Icon;

                  return (
                    <div
                      key={status}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[10px] font-medium sm:text-[11px] ${ui.badgeClass}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {ui.label}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
                All Marketplace Leads
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                Track inquiries, assigned agents, and listing interest.
              </p>

              <div className="relative mt-3">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />

                <input
                  type="text"
                  placeholder="Search buyer, listing, agent, owner, code..."
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
                  Loading leads...
                </div>
              ) : paginatedLeads.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 sm:px-5">
                  No leads found.
                </div>
              ) : (
                paginatedLeads.map((lead) => {
                  const ui = leadStatusUI(lead.status);
                  const BadgeIcon = ui.Icon;
                  const isUpdating = statusUpdatingId === lead.id;

                  return (
                    <div key={lead.id} className="px-3.5 py-4 sm:px-5">
                      <div className="flex flex-col gap-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badgeClass}`}
                              >
                                <BadgeIcon className="h-3.5 w-3.5" />
                                {ui.label}
                              </span>

                              <span className="text-[10px] text-gray-500 sm:text-[11px]">
                                {lead.createdAt}
                              </span>

                              <span className="text-[10px] text-gray-300 sm:text-[11px]">
                                •
                              </span>

                              <span className="text-[10px] text-gray-500 sm:text-[11px]">
                                Code: {lead.listingKode}
                              </span>
                            </div>

                            <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                              {lead.buyerName}
                            </p>

                            <p className="mt-1 text-[12px] text-gray-500 sm:text-[13px]">
                              {lead.buyerPhone}
                            </p>

                            <p className="mt-2 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px] md:text-sm">
                              {lead.propertyTitle}
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                              Agent: {lead.agentName}{" "}
                              <span className="text-gray-300">•</span> Owner:{" "}
                              {lead.ownerName}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-300 px-3 text-[12px] font-medium text-gray-700 transition hover:bg-gray-50 sm:text-sm"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            disabled={isUpdating || lead.status === "CLOSED"}
                            onClick={() =>
                              updateLeadStatus(
                                lead.id,
                                nextReviewStatus(lead.status)
                              )
                            }
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#1C1C1E] px-3 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:text-sm"
                          >
                            {lead.status === "NEW"
                              ? "Review"
                              : lead.status === "CONTACTED"
                              ? "Set Viewing"
                              : lead.status === "VIEWING"
                              ? "Mark Interested"
                              : lead.status === "INTERESTED"
                              ? "Close"
                              : "Closed"}
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
              Showing {startItem}–{endItem} of {filteredLeads.length} leads
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
                  type="button"
                  className={`inline-flex h-9 min-w-[36px] items-center justify-center rounded-xl border px-3 text-[12px] font-medium sm:h-10 sm:min-w-[40px] sm:text-sm ${
                    page === p
                      ? "border-black bg-black text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  }`}
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

      {selectedLead ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  Lead Details
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                  Full marketplace lead information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 p-4 sm:gap-3 sm:p-5">
              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Buyer
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.buyerName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Phone
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.buyerPhone}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Property
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.propertyTitle}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Listing Code
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.listingKode}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Agent
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.agentName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Owner
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.ownerName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Lead Type
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.leadType || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Receiver Role
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {selectedLead.receiverRole || "-"}
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-gray-200 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                  Created At
                </p>
                <p className="mt-1.5 text-[12px] font-semibold text-[#1C1C1E] sm:text-sm">
                  {formatDateTime(selectedLead.rawCreatedAt)}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 p-4 sm:p-5">
              <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-gray-400">
                Update Status
              </p>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {(
                  ["NEW", "CONTACTED", "VIEWING", "INTERESTED", "CLOSED"] as LeadStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={
                      statusUpdatingId === selectedLead.id ||
                      selectedLead.status === status
                    }
                    onClick={() => updateLeadStatus(selectedLead.id, status)}
                    className={`rounded-2xl border px-3 py-2.5 text-[12px] font-semibold transition sm:text-sm ${
                      selectedLead.status === status
                        ? "border-black bg-black text-white"
                        : "border-gray-300 text-[#1C1C1E] hover:bg-gray-50"
                    } disabled:opacity-50`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}