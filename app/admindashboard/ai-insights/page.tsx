"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Brain,
  BriefcaseBusiness,
  CircleAlert,
  CircleCheckBig,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  AITeamNavigation,
  AI_TEAM_TABS,
  type AITeamTab,
} from "@/components/ai-team/AITeamNavigation";
import { MeetingRoom } from "@/components/ai-team/MeetingRoom";
import { RupertResearchDesk } from "@/components/ai-team/RupertResearchDesk";
import { UncleSamFinanceDesk } from "@/components/ai-team/UncleSamFinanceDesk";
import { AIWorkboard } from "@/components/ai-team/AIWorkboard";
import { JakeCooDesk } from "@/components/ai-team/JakeCooDesk";

type AgentStatus =
  | "inactive"
  | "active"
  | "paused"
  | "maintenance";

type AIAgent = {
  id: string;
  agent_key:
    | "jake"
    | "mona"
    | "rupert"
    | "randolph"
    | "lola"
    | "uncle_sam";
  display_name: string;
  role_title: string;
  mission: string;
  status: AgentStatus;
  reports_to_agent_id: string | null;
  version: number;
  enabled: boolean;
  updated_at: string;
};

type AgentsResponse = {
  ok: boolean;
  agents?: AIAgent[];
  generatedAt?: string;
  error?: string;
};

const AGENT_ORDER: AIAgent["agent_key"][] = [
  "jake",
  "mona",
  "rupert",
  "randolph",
  "lola",
  "uncle_sam",
];

function getStatusLabel(agent: AIAgent) {
  if (!agent.enabled) {
    return "Inactive";
  }

  if (agent.status === "active") {
    return "Active";
  }

  if (agent.status === "paused") {
    return "Paused";
  }

  if (agent.status === "maintenance") {
    return "Maintenance";
  }

  return "Inactive";
}

function getStatusClasses(agent: AIAgent) {
  if (!agent.enabled) {
    return "border-gray-200 bg-gray-50 text-gray-500";
  }

  if (agent.status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (agent.status === "paused") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (agent.status === "maintenance") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-500";
}

function AgentIcon({
  agentKey,
}: {
  agentKey: AIAgent["agent_key"];
}) {
  const iconClass = "h-5 w-5 text-[#1C1C1E]";

  switch (agentKey) {
    case "jake":
      return <BriefcaseBusiness className={iconClass} />;

    case "randolph":
      return <ShieldCheck className={iconClass} />;

    case "lola":
      return <Brain className={iconClass} />;

    case "mona":
    case "rupert":
    case "uncle_sam":
    default:
      return <Bot className={iconClass} />;
  }
}

export default function AdminAIInsightsPage() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [agentActionKey, setAgentActionKey] =
    useState<AIAgent["agent_key"] | null>(null);
  const [agentNotice, setAgentNotice] = useState("");
  const [activeTab, setActiveTab] =
    useState<AITeamTab>("overview");

  const loadAgents = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.access_token) {
          throw new Error(
            "Admin session not found. Please log in again."
          );
        }

        const response = await fetch(
          "/api/admin/ai-team/agents",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            cache: "no-store",
          }
        );

        const payload =
          (await response.json()) as AgentsResponse;

        if (!response.ok || !payload.ok) {
          throw new Error(
            payload.error ||
              "Failed to load AI Team."
          );
        }

        setAgents(payload.agents ?? []);
      } catch (err) {
        console.error(
          "Failed to load AI Team:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load AI Team."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  async function updateAgentState(
    agentKey: AIAgent["agent_key"],
    status: AgentStatus,
    enabled: boolean
  ) {
    try {
      setAgentActionKey(agentKey);
      setAgentNotice("");
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error(
          "Admin session not found. Please log in again."
        );
      }

      const response = await fetch(
        "/api/admin/ai-team/agents",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agentKey,
            status,
            enabled,
          }),
        }
      );

      const payload = await response
        .json()
        .catch(() => null);

      if (
        !response.ok ||
        !payload ||
        payload.ok !== true
      ) {
        throw new Error(
          payload?.error ||
            "Unable to update AI agent status."
        );
      }

      setAgentNotice(
        `${payload.agent.display_name} is now ${
          enabled ? "active" : "disabled"
        }.`
      );

      await loadAgents(true);
    } catch (agentError) {
      setError(
        agentError instanceof Error
          ? agentError.message
          : "Unable to update AI agent status."
      );
    } finally {
      setAgentActionKey(null);
    }
  }

  const orderedAgents = useMemo(() => {
    return [...agents].sort(
      (a, b) =>
        AGENT_ORDER.indexOf(a.agent_key) -
        AGENT_ORDER.indexOf(b.agent_key)
    );
  }, [agents]);

  const activeCount = useMemo(
    () =>
      agents.filter(
        (agent) =>
          agent.enabled &&
          agent.status === "active"
      ).length,
    [agents]
  );

  const inactiveCount =
    agents.length - activeCount;

  const activeTabLabel =
    AI_TEAM_TABS.find(
      (tab) => tab.key === activeTab
    )?.label ?? "Overview";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
            Tetamo Operations
          </p>

          <h1 className="mt-1 text-2xl font-bold text-[#1C1C1E]">
            AI Team
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Internal AI workforce for operations, sales,
            content, systems, growth, finance and executive
            coordination.
          </p>
        </div>

        {activeTab === "overview" ? (
          <button
            type="button"
            onClick={() => void loadAgents(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        ) : null}
      </div>

      <AITeamNavigation
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "overview" ? (
        <>
          {agentNotice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {agentNotice}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                AI Staff
              </p>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-[#1C1C1E]">
                  {agents.length}
                </p>

                <Users className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                Active
              </p>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-[#1C1C1E]">
                  {activeCount}
                </p>

                <CircleCheckBig className="h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                Not Active
              </p>

              <div className="mt-2 flex items-center justify-between">
                <p className="text-2xl font-semibold text-[#1C1C1E]">
                  {inactiveCount}
                </p>

                <CircleAlert className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading AI Team...
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <div>
                  <p className="font-semibold text-red-800">
                    Unable to load AI Team
                  </p>

                  <p className="mt-1 text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-[#1C1C1E]">
                  Team
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Live staff records from the protected AI
                  Team database.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {orderedAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                          <AgentIcon
                            agentKey={agent.agent_key}
                          />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-semibold text-[#1C1C1E]">
                            {agent.display_name}
                          </h3>

                          <p className="mt-0.5 text-xs text-gray-500">
                            {agent.role_title}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(
                          agent
                        )}`}
                      >
                        {getStatusLabel(agent)}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-gray-500">
                      {agent.mission}
                    </p>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-gray-400">
                        Version {agent.version}
                      </p>

                      <button
                        type="button"
                        disabled={agentActionKey === agent.agent_key}
                        onClick={() =>
                          void updateAgentState(
                            agent.agent_key,
                            agent.enabled ? "inactive" : "active",
                            !agent.enabled
                          )
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          agent.enabled
                            ? "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            : "bg-[#1C1C1E] text-white hover:bg-black"
                        }`}
                      >
                        {agentActionKey === agent.agent_key
                          ? "Updating..."
                          : agent.enabled
                            ? "Disable"
                            : "Activate"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : activeTab === "meeting-room" ? (
        <MeetingRoom agents={orderedAgents} />
      ) : activeTab === "jake" ? (
        <JakeCooDesk
          onOpenMeetingRoom={() =>
            setActiveTab("meeting-room")
          }
        />
      ) : activeTab === "rupert" ? (
        <RupertResearchDesk />
      ) : activeTab === "uncle-sam" ? (
        <UncleSamFinanceDesk />
      ) : activeTab === "tasks" ? (
        <AIWorkboard tab="tasks" />
      ) : activeTab === "approvals" ? (
        <AIWorkboard tab="approvals" />
      ) : activeTab === "activity" ? (
        <AIWorkboard tab="activity" />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            AI Team Workspace
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#1C1C1E]">
            {activeTabLabel}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
            This workspace has not been activated yet. We are
            building it on top of the shared AI Team
            foundation rather than displaying simulated or
            placeholder operational data.
          </p>

          <div className="mt-5 inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500">
            Not built yet
          </div>
        </div>
      )}
    </div>
  );
}