"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { UserCheck, UserX, Shield } from "lucide-react";
import { supabase } from "@/lib/supabase";

/* =========================
TYPES
========================= */

type AgentStatus = "ACTIVE" | "SUSPENDED" | "PENDING";

type Agent = {
  id: string;
  name: string;
  phone: string;
  email: string;
  agency: string;
  city: string;
  listings: number;
  leads: number;
  status: AgentStatus;
  raw: Record<string, any>;
};

/* =========================
HELPERS
========================= */

function normalizeRole(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function isAgentLikeRole(value: unknown) {
  const role = normalizeRole(value);
  return role.includes("agent") || role.includes("agen");
}

function deriveAgentStatus(profile: Record<string, any>): AgentStatus {
  const suspended =
    Boolean(profile?.is_suspended) ||
    Boolean(profile?.suspended) ||
    Boolean(profile?.isSuspended);

  const rawStatus = String(
    profile?.status ||
      profile?.approval_status ||
      profile?.account_status ||
      profile?.verification_status ||
      ""
  )
    .trim()
    .toLowerCase();

  if (suspended) return "SUSPENDED";
  if (rawStatus.includes("pending")) return "PENDING";

  return "ACTIVE";
}

function statusUI(status: AgentStatus) {
  if (status === "ACTIVE")
    return {
      label: "Active",
      badge: "bg-green-50 text-green-700 border-green-200",
    };

  if (status === "PENDING")
    return {
      label: "Pending Approval",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };

  return {
    label: "Suspended",
    badge: "bg-red-50 text-red-700 border-red-200",
  };
}

function buildStatusUpdatePayload(
  agent: Agent,
  nextStatus: AgentStatus
): Record<string, any> {
  const payload: Record<string, any> = {};
  const raw = agent.raw || {};

  if ("is_suspended" in raw) {
    payload.is_suspended = nextStatus === "SUSPENDED";
  } else if ("suspended" in raw) {
    payload.suspended = nextStatus === "SUSPENDED";
  } else if ("isSuspended" in raw) {
    payload.isSuspended = nextStatus === "SUSPENDED";
  }

  if ("status" in raw) {
    payload.status =
      nextStatus === "PENDING"
        ? "pending"
        : nextStatus === "SUSPENDED"
        ? "suspended"
        : "active";
  } else if ("approval_status" in raw) {
    payload.approval_status =
      nextStatus === "PENDING"
        ? "pending"
        : nextStatus === "SUSPENDED"
        ? "suspended"
        : "approved";
  } else if ("account_status" in raw) {
    payload.account_status =
      nextStatus === "PENDING"
        ? "pending"
        : nextStatus === "SUSPENDED"
        ? "suspended"
        : "active";
  } else if ("verification_status" in raw) {
    payload.verification_status =
      nextStatus === "PENDING" ? "pending_approval" : "verified";
  }

  return payload;
}

/* =========================
PAGE
========================= */

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let ignore = false;

    async function loadAgents() {
      setLoading(true);
      setLoadError("");

      try {
        const [{ data: profilesData, error: profilesError }, { data: propertiesData, error: propertiesError }, { data: leadsData, error: leadsError }] =
          await Promise.all([
            supabase.from("profiles").select("*"),
            supabase
              .from("properties")
              .select("id,user_id,source,status")
              .eq("source", "agent")
              .neq("status", "rejected"),
            supabase
              .from("leads")
              .select("id,receiver_user_id,receiver_role")
              .eq("receiver_role", "agent"),
          ]);

        if (profilesError) throw profilesError;
        if (propertiesError) throw propertiesError;
        if (leadsError) throw leadsError;

        const profiles = (profilesData || []) as Record<string, any>[];
        const properties = (propertiesData || []) as Record<string, any>[];
        const leads = (leadsData || []) as Record<string, any>[];

        const listingCountMap = new Map<string, number>();
        const leadCountMap = new Map<string, number>();

        for (const property of properties) {
          const key = String(property.user_id || "");
          if (!key) continue;
          listingCountMap.set(key, (listingCountMap.get(key) || 0) + 1);
        }

        for (const lead of leads) {
          const key = String(lead.receiver_user_id || "");
          if (!key) continue;
          leadCountMap.set(key, (leadCountMap.get(key) || 0) + 1);
        }

        const mappedAgents: Agent[] = profiles
          .filter((profile) => isAgentLikeRole(profile?.role))
          .map((profile) => {
            const id = String(profile?.id || "");
            const address =
              String(profile?.city || "").trim() ||
              String(profile?.address || "").trim() ||
              "-";

            return {
              id,
              name:
                String(profile?.full_name || "").trim() ||
                String(profile?.name || "").trim() ||
                "Unknown Agent",
              phone:
                String(profile?.phone || "").trim() ||
                String(profile?.number || "").trim() ||
                "-",
              email: String(profile?.email || "").trim() || "-",
              agency: String(profile?.agency || "").trim() || "-",
              city: address,
              listings: listingCountMap.get(id) || 0,
              leads: leadCountMap.get(id) || 0,
              status: deriveAgentStatus(profile),
              raw: profile,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!ignore) {
          setAgents(mappedAgents);
        }
      } catch (error: any) {
        console.error("Failed to load admin agents:", error);
        if (!ignore) {
          setLoadError(error?.message || "Failed to load agents.");
          setAgents([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAgents();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;

    const words = searchQuery.toLowerCase().split(" ").filter(Boolean);

    return agents.filter((a) => {
      const searchable = `
      ${a.name}
      ${a.phone}
      ${a.email}
      ${a.agency}
      ${a.city}
      `.toLowerCase();

      return words.every((w) => searchable.includes(w));
    });
  }, [searchQuery, agents]);

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / ITEMS_PER_PAGE));

  const paginated = filteredAgents.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredAgents.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredAgents.length);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function updateStatus(id: string, status: AgentStatus) {
    const target = agents.find((a) => a.id === id);
    if (!target) return;

    const payload = buildStatusUpdatePayload(target, status);

    setUpdatingId(id);

    try {
      if (Object.keys(payload).length > 0) {
        const { error } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", id);

        if (error) throw error;
      }

      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch (error: any) {
      console.error("Failed to update agent status:", error);
      alert(error?.message || "Failed to update agent status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      {/* Header */}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1C1C1E]">
          Agents Management
        </h1>
        <p className="text-sm text-gray-500">
          Approve, monitor and manage marketplace agents.
        </p>
      </div>

      {loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {/* Search */}

      <div className="mt-6 relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600"
          size={18}
        />

        <input
          type="text"
          placeholder="Cari agent, phone, email, kota..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full border border-gray-400 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#1C1C1E] placeholder-gray-500"
        />
      </div>

      {/* Agents Card */}

      <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading agents...</div>
          ) : paginated.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No agents found.</div>
          ) : (
            paginated.map((agent) => {
              const ui = statusUI(agent.status);
              const isUpdating = updatingId === agent.id;

              return (
                <div
                  key={agent.id}
                  className="p-6 flex items-center justify-between gap-6"
                >
                  {/* LEFT */}

                  <div className="min-w-0">
                    <span
                      className={`inline-flex text-xs px-3 py-1 rounded-full border ${ui.badge}`}
                    >
                      {ui.label}
                    </span>

                    <p className="mt-2 font-medium text-[#1C1C1E]">
                      {agent.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {agent.phone} • {agent.email}
                    </p>

                    <p className="text-xs text-gray-500 mt-1">
                      {agent.agency} • {agent.city}
                    </p>

                    <p className="text-xs text-gray-400">
                      Listings: {agent.listings} • Leads: {agent.leads}
                    </p>
                  </div>

                  {/* ACTIONS */}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateStatus(agent.id, "ACTIVE")}
                      disabled={isUpdating}
                      className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <UserCheck size={16} />
                    </button>

                    <button
                      onClick={() => updateStatus(agent.id, "SUSPENDED")}
                      disabled={isUpdating}
                      className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <UserX size={16} />
                    </button>

                    <button
                      onClick={() => updateStatus(agent.id, "PENDING")}
                      disabled={isUpdating}
                      className="px-3 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Shield size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}

      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-gray-900">
          Menampilkan {startItem}–{endItem} dari {filteredAgents.length} agent
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white disabled:opacity-50"
          >
            Sebelumnya
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
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
            className="px-3 py-2 border rounded-lg bg-[#1C1C1E] text-white disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  );
}