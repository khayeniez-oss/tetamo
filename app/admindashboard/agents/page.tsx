"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserCheck, UserX, Shield, ChevronDown } from "lucide-react";
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
  if (status === "ACTIVE") {
    return {
      label: "Active",
      badge: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "PENDING") {
    return {
      label: "Pending Approval",
      badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  }

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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400 sm:text-xs">
        {title}
      </p>
      <p className="mt-2 text-xl font-semibold text-[#1C1C1E] sm:text-2xl">
        {value}
      </p>
    </div>
  );
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
  const [expandedActionsId, setExpandedActionsId] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    let ignore = false;

    async function loadAgents() {
      setLoading(true);
      setLoadError("");

      try {
        const [
          { data: profilesData, error: profilesError },
          { data: propertiesData, error: propertiesError },
          { data: leadsData, error: leadsError },
        ] = await Promise.all([
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

  const stats = useMemo(() => {
    return {
      total: agents.length,
      active: agents.filter((agent) => agent.status === "ACTIVE").length,
      pending: agents.filter((agent) => agent.status === "PENDING").length,
      suspended: agents.filter((agent) => agent.status === "SUSPENDED").length,
    };
  }, [agents]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredAgents.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginated = filteredAgents.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const startItem =
    filteredAgents.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;

  const endItem = Math.min(page * ITEMS_PER_PAGE, filteredAgents.length);

  const visiblePages = useMemo(
    () => visiblePageNumbers(page, totalPages),
    [page, totalPages]
  );

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

  function ActionButton({
    onClick,
    disabled,
    label,
    className,
    children,
  }: {
    onClick: () => void;
    disabled: boolean;
    label: string;
    className: string;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={className}
      >
        <span className="shrink-0">{children}</span>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight text-[#1C1C1E] sm:text-2xl">
          Agents Management
        </h1>
        <p className="text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
          Approve, monitor, and manage marketplace agents.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard title="Total Agents" value={stats.total} />
        <SummaryCard title="Active" value={stats.active} />
        <SummaryCard title="Pending" value={stats.pending} />
        <SummaryCard title="Suspended" value={stats.suspended} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              Agent Overview
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
              Review agent account status, activity, and marketplace participation.
            </p>

            {/* MOBILE SIDE BY SIDE */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                  Search Result
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                  {filteredAgents.length}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-gray-400 sm:text-[11px]">
                  Current Page
                </p>
                <p className="mt-2 text-lg font-semibold text-[#1C1C1E] sm:text-xl">
                  {page} / {totalPages}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {(["ACTIVE", "PENDING", "SUSPENDED"] as AgentStatus[]).map((status) => {
                const ui = statusUI(status);
                const count =
                  status === "ACTIVE"
                    ? stats.active
                    : status === "PENDING"
                    ? stats.pending
                    : stats.suspended;

                return (
                  <div
                    key={status}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3"
                  >
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium sm:text-xs ${ui.badge}`}
                    >
                      {ui.label}
                    </span>

                    <span className="text-sm font-semibold text-[#1C1C1E]">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
              Status Guide
            </h2>
            <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
              Use the controls to keep agent access and approval status updated.
            </p>

            {/* MOBILE SIDE BY SIDE */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">Active</p>
                <p className="mt-1 text-xs leading-5 text-green-700">
                  The agent can use the platform normally.
                </p>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-semibold text-yellow-800">
                  Pending Approval
                </p>
                <p className="mt-1 text-xs leading-5 text-yellow-700">
                  The agent account still needs review or approval.
                </p>
              </div>

              <div className="col-span-2 rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">Suspended</p>
                <p className="mt-1 text-xs leading-5 text-red-700">
                  The agent account is restricted until reactivated.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
              <h2 className="text-base font-semibold text-[#1C1C1E] sm:text-lg">
                All Agents
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                Search and manage every agent account.
              </p>

              <div className="relative mt-4">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />

                <input
                  type="text"
                  placeholder="Search agent, phone, email, city..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="h-11 w-full rounded-2xl border border-gray-300 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#1C1C1E]"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="px-4 py-8 text-sm text-gray-500 sm:px-6">
                  Loading agents...
                </div>
              ) : paginated.length === 0 ? (
                <div className="px-4 py-8 text-sm text-gray-500 sm:px-6">
                  No agents found.
                </div>
              ) : (
                paginated.map((agent) => {
                  const ui = statusUI(agent.status);
                  const isUpdating = updatingId === agent.id;
                  const actionsOpen = expandedActionsId === agent.id;

                  return (
                    <div key={agent.id} className="px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex flex-col gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium sm:text-xs ${ui.badge}`}
                            >
                              {ui.label}
                            </span>
                          </div>

                          <p className="mt-3 text-sm font-semibold text-[#1C1C1E] sm:text-base">
                            {agent.name}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {agent.phone} <span className="text-gray-300">•</span>{" "}
                            {agent.email}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-500 sm:text-sm">
                            {agent.agency} <span className="text-gray-300">•</span>{" "}
                            {agent.city}
                          </p>

                          <p className="mt-1 text-[11px] text-gray-400 sm:text-xs">
                            Listings: {agent.listings}{" "}
                            <span className="text-gray-300">•</span> Leads:{" "}
                            {agent.leads}
                          </p>
                        </div>

                        <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-2">
                          <button
                            onClick={() => updateStatus(agent.id, "ACTIVE")}
                            disabled={isUpdating}
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                            type="button"
                            title="Set Active"
                          >
                            <UserCheck size={16} />
                          </button>

                          <button
                            onClick={() => updateStatus(agent.id, "SUSPENDED")}
                            disabled={isUpdating}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                            type="button"
                            title="Suspend"
                          >
                            <UserX size={16} />
                          </button>

                          <button
                            onClick={() => updateStatus(agent.id, "PENDING")}
                            disabled={isUpdating}
                            className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-700 transition hover:bg-yellow-100 disabled:opacity-50"
                            type="button"
                            title="Set Pending"
                          >
                            <Shield size={16} />
                          </button>
                        </div>

                        <div className="lg:hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedActionsId((prev) =>
                                prev === agent.id ? null : agent.id
                              )
                            }
                            className="flex h-10 w-full items-center justify-between rounded-xl border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                          >
                            <span>Actions</span>
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                actionsOpen ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {actionsOpen ? (
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <ActionButton
                                onClick={() => updateStatus(agent.id, "ACTIVE")}
                                disabled={isUpdating}
                                label="Active"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                              >
                                <UserCheck size={16} />
                              </ActionButton>

                              <ActionButton
                                onClick={() => updateStatus(agent.id, "SUSPENDED")}
                                disabled={isUpdating}
                                label="Suspend"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                              >
                                <UserX size={16} />
                              </ActionButton>

                              <ActionButton
                                onClick={() => updateStatus(agent.id, "PENDING")}
                                disabled={isUpdating}
                                label="Pending"
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-3 text-sm font-medium text-yellow-700 transition hover:bg-yellow-100 disabled:opacity-50"
                              >
                                <Shield size={16} />
                              </ActionButton>
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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500 sm:text-sm">
              Showing {startItem}–{endItem} of {filteredAgents.length} agents
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-4 text-sm font-medium text-white disabled:opacity-50"
                type="button"
              >
                Previous
              </button>

              {visiblePages.map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`inline-flex h-10 min-w-[40px] items-center justify-center rounded-xl border px-3 text-sm font-medium ${
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
                className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-300 bg-[#1C1C1E] px-4 text-sm font-medium text-white disabled:opacity-50"
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