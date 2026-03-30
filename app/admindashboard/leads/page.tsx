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

function mapLeadStatus(status?: string | null, leadType?: string | null): LeadStatus {
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
          .select(`
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
          `)
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
          const property = lead.property_id ? propertyMap.get(lead.property_id) : null;
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
            buyerName: lead.sender_name || senderProfile?.full_name || "Unknown Buyer",
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">Leads</h1>
        <p className="text-sm text-gray-500">
          Monitor all leads across owners, agents, and listings.
        </p>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="mt-6 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari buyer, listing, agent, owner, kode..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder:text-gray-500"
        />
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[#1C1C1E]">
            All Marketplace Leads
          </h2>
          <p className="text-sm text-gray-500">
            Track inquiries, assigned agents, and listing interest.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading leads...
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No leads found.
            </div>
          ) : (
            paginatedLeads.map((lead) => {
              const ui = leadStatusUI(lead.status);
              const BadgeIcon = ui.Icon;
              const isUpdating = statusUpdatingId === lead.id;

              return (
                <div
                  key={lead.id}
                  className="p-6 flex items-center justify-between gap-6 border-b border-gray-200 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${ui.badgeClass}`}
                      >
                        <BadgeIcon className="h-3.5 w-3.5" />
                        {ui.label}
                      </span>

                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{lead.createdAt}</span>
                        <span>•</span>
                        <span>Kode: {lead.listingKode}</span>
                      </div>
                    </div>

                    <p className="mt-3 font-medium text-[#1C1C1E]">
                      {lead.buyerName}
                    </p>

                    <p className="text-sm text-gray-500">{lead.buyerPhone}</p>

                    <p className="mt-2 text-sm text-[#1C1C1E]">
                      {lead.propertyTitle}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Agent: {lead.agentName} • Owner: {lead.ownerName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedLead(lead)}
                      className="px-4 py-2 rounded-xl border border-gray-400 text-gray-700 hover:bg-gray-50"
                    >
                      View
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating || lead.status === "CLOSED"}
                      onClick={() => updateLeadStatus(lead.id, nextReviewStatus(lead.status))}
                      className="px-4 py-2 rounded-xl bg-[#1C1C1E] text-white text-sm hover:opacity-90 disabled:opacity-50"
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
              );
            })
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filteredLeads.length} leads
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white border-gray-200 disabled:opacity-50"
            type="button"
          >
            Sebelumnya
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              type="button"
              className={`px-3 py-2 border rounded-lg text-sm ${
                page === p
                  ? "bg-black text-white border-black"
                  : "border-gray-400"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white border-gray-400 disabled:opacity-50"
            type="button"
          >
            Berikutnya
          </button>
        </div>
      </div>

      {selectedLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-2xl rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h3 className="text-xl font-semibold text-[#1C1C1E]">
                  Lead Details
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Full marketplace lead information
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Buyer</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.buyerName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.buyerPhone}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Property</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.propertyTitle}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Listing Code</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.listingKode}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Agent</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.agentName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Owner</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.ownerName}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Lead Type</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.leadType || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Receiver Role</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {selectedLead.receiverRole || "-"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 md:col-span-2">
                <p className="text-xs text-gray-500">Created At</p>
                <p className="mt-1 font-semibold text-[#1C1C1E]">
                  {formatDateTime(selectedLead.rawCreatedAt)}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 p-6">
              <div className="flex flex-wrap gap-3">
                {(["NEW", "CONTACTED", "VIEWING", "INTERESTED", "CLOSED"] as LeadStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={
                        statusUpdatingId === selectedLead.id ||
                        selectedLead.status === status
                      }
                      onClick={() => updateLeadStatus(selectedLead.id, status)}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold border ${
                        selectedLead.status === status
                          ? "border-black bg-black text-white"
                          : "border-gray-300 text-[#1C1C1E] hover:bg-gray-50"
                      } disabled:opacity-50`}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}