"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserCheck, Eye, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
   TYPES
========================= */

type BuyerRequestStatus =
  | "NEW"
  | "REVIEWED"
  | "MATCHED"
  | "CONTACTED"
  | "CLOSED";

type BuyerRequest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  searchType: "sale" | "rent" | "auction";
  location: string;
  budget: string;
  propertyType: string;
  bedroom: string;
  bathroom: string;
  furnished: string;
  certificate: string;
  timeline: string;
  needAgent: "yes" | "no";
  notes: string;
  createdAt: string;
  status: BuyerRequestStatus;
  matchedAgentUserId: string | null;
  matchedAgentName: string;
};

type BuyerRequestRow = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  search_type: "sale" | "rent" | "auction" | null;
  location: string | null;
  budget: string | null;
  property_type: string | null;
  bedroom: string | null;
  bathroom: string | null;
  furnished: string | null;
  certificate: string | null;
  timeline: string | null;
  need_agent: "yes" | "no" | null;
  notes: string | null;
  created_at: string | null;
  status: BuyerRequestStatus | null;
  matched_agent_user_id: string | null;
};

type Agent = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  agency: string;
  address: string;
};

type AgentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  agency: string | null;
  address: string | null;
};

/* =========================
   HELPERS
========================= */

function statusUI(status: BuyerRequestStatus) {
  if (status === "NEW") {
    return {
      label: "New",
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    };
  }

  if (status === "REVIEWED") {
    return {
      label: "Reviewed",
      badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

  if (status === "MATCHED") {
    return {
      label: "Matched",
      badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    };
  }

  if (status === "CONTACTED") {
    return {
      label: "Contacted",
      badgeClass: "bg-green-50 text-green-700 border-green-200",
    };
  }

  return {
    label: "Closed",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  };
}

function searchTypeLabel(value: BuyerRequest["searchType"]) {
  if (value === "sale") return "Dijual";
  if (value === "rent") return "Disewa";
  return "Lelang";
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeStatus(value?: string | null): BuyerRequestStatus {
  if (
    value === "NEW" ||
    value === "REVIEWED" ||
    value === "MATCHED" ||
    value === "CONTACTED" ||
    value === "CLOSED"
  ) {
    return value;
  }

  return "NEW";
}

function normalizeSearchType(
  value?: string | null
): "sale" | "rent" | "auction" {
  if (value === "rent") return "rent";
  if (value === "auction") return "auction";
  return "sale";
}

function buildAgentSearchText(agent: Agent) {
  return `
    ${agent.fullName}
    ${agent.email}
    ${agent.phone}
    ${agent.agency}
    ${agent.address}
  `.toLowerCase();
}

function getLocationScore(agent: Agent, location: string) {
  const haystack = `${agent.address} ${agent.agency} ${agent.fullName}`.toLowerCase();
  const parts = location
    .toLowerCase()
    .split(/[\s,/-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  if (parts.length === 0) return 0;

  let score = 0;

  for (const part of parts) {
    if (haystack.includes(part)) {
      score += 1;
    }
  }

  return score;
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

/* =========================
   PAGE
========================= */

export default function AdminBuyerRequestsPage() {
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentNameMap, setAgentNameMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [matching, setMatching] = useState(false);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let ignore = false;

    async function loadAgents() {
      setAgentsLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, agency, address")
        .eq("role", "agent")
        .order("full_name", { ascending: true });

      if (ignore) return;

      if (error) {
        console.error("Failed to load agents:", error);
        setAgents([]);
        setAgentNameMap({});
        setAgentsLoading(false);
        return;
      }

      const mappedAgents: Agent[] = ((data || []) as AgentRow[]).map((item) => ({
        id: item.id,
        fullName: item.full_name || "Tanpa Nama",
        email: item.email || "-",
        phone: item.phone || "-",
        agency: item.agency || "-",
        address: item.address || "-",
      }));

      const nameMap = mappedAgents.reduce<Record<string, string>>((acc, agent) => {
        acc[agent.id] = agent.fullName;
        return acc;
      }, {});

      setAgents(mappedAgents);
      setAgentNameMap(nameMap);
      setAgentsLoading(false);
    }

    loadAgents();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadBuyerRequests() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("buyer_requests")
        .select(`
          id,
          name,
          phone,
          email,
          search_type,
          location,
          budget,
          property_type,
          bedroom,
          bathroom,
          furnished,
          certificate,
          timeline,
          need_agent,
          notes,
          created_at,
          status,
          matched_agent_user_id
        `)
        .order("created_at", { ascending: false });

      if (ignore) return;

      if (error) {
        console.error("Failed to load buyer requests:", error);
        setRequests([]);
        setErrorMessage(error.message || "Failed to load buyer requests.");
        setLoading(false);
        return;
      }

      const mapped: BuyerRequest[] = ((data || []) as BuyerRequestRow[]).map(
        (item) => ({
          id: item.id,
          name: item.name || "-",
          phone: item.phone || "-",
          email: item.email || "-",
          searchType: normalizeSearchType(item.search_type),
          location: item.location || "-",
          budget: item.budget || "-",
          propertyType: item.property_type || "-",
          bedroom: item.bedroom || "",
          bathroom: item.bathroom || "",
          furnished: item.furnished || "",
          certificate: item.certificate || "",
          timeline: item.timeline || "-",
          needAgent: item.need_agent === "no" ? "no" : "yes",
          notes: item.notes || "",
          createdAt: formatDate(item.created_at),
          status: normalizeStatus(item.status),
          matchedAgentUserId: item.matched_agent_user_id || null,
          matchedAgentName: item.matched_agent_user_id
            ? agentNameMap[item.matched_agent_user_id] || "Assigned Agent"
            : "",
        })
      );

      setRequests(mapped);
      setLoading(false);
    }

    loadBuyerRequests();

    return () => {
      ignore = true;
    };
  }, [agentNameMap]);

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return requests.filter((item) => {
      const searchable = `
        ${item.name}
        ${item.phone}
        ${item.email}
        ${item.location}
        ${item.budget}
        ${item.propertyType}
        ${item.searchType}
        ${item.notes}
        ${item.certificate}
        ${item.status}
        ${item.matchedAgentName}
      `.toLowerCase();

      return words.every((word) => searchable.includes(word));
    });
  }, [requests, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRequests.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRequests = filteredRequests.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredRequests.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredRequests.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

  const recommendedAgents = useMemo(() => {
    if (!selectedRequest) return [];

    return [...agents]
      .map((agent) => ({
        ...agent,
        locationScore: getLocationScore(agent, selectedRequest.location),
      }))
      .filter((agent) => agent.locationScore > 0)
      .sort((a, b) => b.locationScore - a.locationScore);
  }, [agents, selectedRequest]);

  const filteredAgents = useMemo(() => {
    const query = agentSearchQuery.trim().toLowerCase();

    if (!query) return agents;

    return agents.filter((agent) =>
      buildAgentSearchText(agent).includes(query)
    );
  }, [agents, agentSearchQuery]);

  function openMatchModal(request: BuyerRequest) {
    setSelectedRequest(request);
    setSelectedAgentId(request.matchedAgentUserId || "");
    setAgentSearchQuery("");
    setMatchModalOpen(true);
  }

  function closeMatchModal(force = false) {
    if (matching && !force) return;
    setMatchModalOpen(false);
    setSelectedRequest(null);
    setSelectedAgentId("");
    setAgentSearchQuery("");
  }

  async function updateStatus(id: string, status: BuyerRequestStatus) {
    setUpdatingId(id);

    const { error } = await supabase
      .from("buyer_requests")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Failed to update buyer request status:", error);
      alert(error.message || "Failed to update status.");
      setUpdatingId(null);
      return;
    }

    setRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );

    window.dispatchEvent(new CustomEvent("tetamo-buyer-requests-updated"));

    setUpdatingId(null);
  }

  async function handleConfirmMatch() {
    if (!selectedRequest || !selectedAgentId) {
      alert("Please select an agent first.");
      return;
    }

    setMatching(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        alert("Please login again.");
        setMatching(false);
        return;
      }

      const nowIso = new Date().toISOString();

      const { error } = await supabase
        .from("buyer_requests")
        .update({
          matched_agent_user_id: selectedAgentId,
          matched_at: nowIso,
          matched_by_admin_user_id: user.id,
          status: "MATCHED",
          updated_at: nowIso,
        })
        .eq("id", selectedRequest.id);

      if (error) {
        console.error("Failed to match buyer request:", error);
        alert(error.message || "Failed to assign agent.");
        setMatching(false);
        return;
      }

      const matchedAgentName =
        agentNameMap[selectedAgentId] ||
        agents.find((agent) => agent.id === selectedAgentId)?.fullName ||
        "Assigned Agent";

      setRequests((prev) =>
        prev.map((item) =>
          item.id === selectedRequest.id
            ? {
                ...item,
                status: "MATCHED",
                matchedAgentUserId: selectedAgentId,
                matchedAgentName,
              }
            : item
        )
      );

      window.dispatchEvent(new CustomEvent("tetamo-buyer-requests-updated"));

      closeMatchModal(true);
    } catch (error: any) {
      console.error("Match flow error:", error);
      alert(error?.message || "Something went wrong while matching.");
    } finally {
      setMatching(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-[#1C1C1E] sm:text-xl">
          Buyer Requests
        </h1>
        <p className="text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
          Monitor and manage buyer requests from the Pembeli page.
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          size={16}
        />

        <input
          type="text"
          placeholder="Cari nama, lokasi, budget, tipe properti..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none focus:border-[#1C1C1E] placeholder:text-gray-400 sm:h-11 sm:pl-11 sm:text-sm"
        />
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-3.5 py-4 sm:px-5">
          <h2 className="text-sm font-semibold text-[#1C1C1E] sm:text-base">
            All Buyer Requests
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
            Permintaan pembeli yang masuk dari halaman Pembeli.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-gray-500">
            Loading buyer requests...
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedRequests.map((item) => {
              const ui = statusUI(item.status);
              const isUpdating = updatingId === item.id;

              return (
                <div key={item.id} className="px-3.5 py-4 sm:px-5">
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${ui.badgeClass}`}
                          >
                            {ui.label}
                          </span>

                          <span className="text-[10px] text-gray-500 sm:text-[11px]">
                            {item.createdAt}
                          </span>

                          <span className="text-[10px] text-gray-300 sm:text-[11px]">
                            •
                          </span>

                          <span className="text-[10px] text-gray-500 sm:text-[11px]">
                            {searchTypeLabel(item.searchType)}
                          </span>
                        </div>

                        <p className="mt-2 text-[13px] font-semibold text-[#1C1C1E] sm:text-sm md:text-[15px]">
                          {item.name}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2.5">
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Contact
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.phone}
                            </p>
                            <p className="mt-1 break-words text-[11px] text-gray-500 sm:text-xs">
                              {item.email}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Search
                            </p>
                            <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-[13px]">
                              {item.propertyType}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              {item.location}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Budget
                            </p>
                            <p className="mt-1 text-[12px] font-semibold text-[#1C1C1E] sm:text-[13px]">
                              {item.budget}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              Timeline: {item.timeline}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Preferences
                            </p>
                            <p className="mt-1 text-[11px] text-gray-600 sm:text-xs md:text-sm">
                              {item.bedroom || "—"} • {item.bathroom || "—"} •{" "}
                              {item.furnished || "—"} • {item.certificate || "—"}
                            </p>
                            <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                              Butuh agen: {item.needAgent === "yes" ? "Ya" : "Tidak"}
                            </p>
                          </div>

                          <div className="col-span-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                              Notes / Match
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-gray-600 sm:text-xs md:text-sm">
                              {item.notes || "No additional notes."}
                            </p>

                            {item.matchedAgentName ? (
                              <p className="mt-2 text-[11px] font-medium text-purple-700 sm:text-xs">
                                Matched Agent: {item.matchedAgentName}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 xl:w-[180px] xl:shrink-0">
                        <button
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          onClick={() => updateStatus(item.id, "REVIEWED")}
                          disabled={isUpdating}
                          type="button"
                          title="Mark as reviewed"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-3 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-50 sm:text-sm"
                          onClick={() => openMatchModal(item)}
                          disabled={isUpdating}
                          type="button"
                        >
                          <UserCheck className="h-4 w-4" />
                          <span>Match</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {paginatedRequests.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                No buyer requests found.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] text-gray-500 sm:text-xs md:text-sm">
          Menampilkan {startItem}–{endItem} dari {filteredRequests.length} buyer
          requests
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-3.5 text-[12px] font-medium text-white disabled:opacity-50 sm:h-10 sm:px-4 sm:text-sm"
            type="button"
          >
            Sebelumnya
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
            Berikutnya
          </button>
        </div>
      </div>

      {matchModalOpen && selectedRequest ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center sm:p-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                  Match Buyer Request to Agent
                </h3>
                <p className="mt-1 text-[11px] leading-5 text-gray-500 sm:text-xs md:text-sm">
                  Buyer: {selectedRequest.name} • Lokasi: {selectedRequest.location}
                </p>
              </div>

              <button
                type="button"
                onClick={() => closeMatchModal()}
                className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Buyer
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {selectedRequest.name}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Location
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {selectedRequest.location}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Property Type
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {selectedRequest.propertyType}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">
                    Budget
                  </p>
                  <p className="mt-1 text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                    {selectedRequest.budget}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-gray-700 sm:text-sm">
                  Search Agent
                </label>

                <div className="relative mt-2">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={16}
                  />
                  <input
                    type="text"
                    value={agentSearchQuery}
                    onChange={(e) => setAgentSearchQuery(e.target.value)}
                    placeholder="Cari nama, agency, email, area..."
                    className="h-10 w-full rounded-2xl border border-gray-300 pl-10 pr-4 text-[13px] outline-none focus:border-[#1C1C1E] sm:h-11 sm:pl-11 sm:text-sm"
                  />
                </div>
              </div>

              {recommendedAgents.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-[#1C1C1E]">
                    Recommended by Location
                  </p>

                  <div className="mt-3 space-y-3">
                    {recommendedAgents.slice(0, 5).map((agent) => (
                      <label
                        key={`recommended-${agent.id}`}
                        className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 ${
                          selectedAgentId === agent.id
                            ? "border-[#1C1C1E] bg-gray-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                            {agent.fullName}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500 sm:text-sm">
                            {agent.agency}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                            {agent.phone} • {agent.email}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                            {agent.address}
                          </p>
                        </div>

                        <input
                          type="radio"
                          name="selectedAgent"
                          checked={selectedAgentId === agent.id}
                          onChange={() => setSelectedAgentId(agent.id)}
                          className="mt-1"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-sm font-semibold text-[#1C1C1E]">
                  All Agents
                </p>

                <div className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-1">
                  {agentsLoading ? (
                    <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-500">
                      Loading agents...
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-500">
                      No agents found.
                    </div>
                  ) : (
                    filteredAgents.map((agent) => (
                      <label
                        key={agent.id}
                        className={`flex cursor-pointer items-start justify-between gap-4 rounded-2xl border p-4 ${
                          selectedAgentId === agent.id
                            ? "border-[#1C1C1E] bg-gray-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#1C1C1E] sm:text-sm">
                            {agent.fullName}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-500 sm:text-sm">
                            {agent.agency}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                            {agent.phone} • {agent.email}
                          </p>
                          <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                            {agent.address}
                          </p>
                        </div>

                        <input
                          type="radio"
                          name="selectedAgent"
                          checked={selectedAgentId === agent.id}
                          onChange={() => setSelectedAgentId(agent.id)}
                          className="mt-1"
                        />
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 p-4 sm:p-5">
              <button
                type="button"
                onClick={() => closeMatchModal()}
                className="rounded-2xl border border-gray-200 px-4 py-2.5 text-[12px] font-semibold text-[#1C1C1E] hover:bg-gray-50 sm:px-5 sm:py-3 sm:text-sm"
                disabled={matching}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmMatch}
                disabled={!selectedAgentId || matching}
                className="rounded-2xl bg-[#1C1C1E] px-4 py-2.5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:px-5 sm:py-3 sm:text-sm"
              >
                {matching ? "Matching..." : "Confirm Match"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}