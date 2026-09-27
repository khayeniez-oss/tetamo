"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

type AgentStatus =
  | "inactive"
  | "active"
  | "paused"
  | "maintenance";

type AgentRow = {
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
  enabled: boolean;
};

type AgentSummary = {
  id: string;
  agent_key: string;
  display_name: string;
  role_title:
    string | null;
};

type TaskRow = {
  id: string;
  title: string;
  description:
    string | null;
  priority: string;
  status: string;
  source_type:
    string | null;
  expected_outcome:
    string | null;
  result_summary:
    string | null;
  requires_approval: boolean;
  due_at:
    string | null;
  created_at: string;
  updated_at: string;
  requested_by_agent:
    AgentSummary | null;
  assigned_to_agent:
    AgentSummary | null;
};

type ApprovalRow = {
  id: string;
  action_type: string;
  action_summary: string;
  risk_level: string;
  status: string;
  execution_status: string;
  created_at: string;
  requested_by_agent:
    AgentSummary | null;
};

type ActivityRow = {
  id: string;
  event_type: string;
  action: string;
  severity: string;
  created_at: string;
  agent:
    AgentSummary | null;
};

type MeetingRow = {
  id: string;
  meeting_type: string;
  title: string;
  status: string;
  scheduled_for: string;
  started_at:
    string | null;
  completed_at:
    string | null;
  chaired_by_agent_id:
    string | null;
  summary:
    string | null;
};

type WorkboardResponse = {
  ok: boolean;
  tasks?: TaskRow[];
  approvals?: ApprovalRow[];
  activity?: ActivityRow[];
  error?: string;
};

type AgentsResponse = {
  ok: boolean;
  agents?: AgentRow[];
  error?: string;
};

type MeetingsResponse = {
  ok: boolean;
  meetings?: MeetingRow[];
  error?: string;
};

type StartMeetingResponse = {
  ok: boolean;
  alreadyActive?: boolean;
  error?: string;
};

const SPECIALIST_ORDER = [
  "mona",
  "rupert",
  "randolph",
  "lola",
  "uncle_sam",
];

function cleanText(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function humanize(
  value: unknown
) {
  const text =
    cleanText(
      value
    );

  if (!text) {
    return "—";
  }

  return text
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

function isOpenTask(
  task: TaskRow
) {
  return ![
    "completed",
    "cancelled",
  ].includes(
    task.status
  );
}

function isOverdue(
  task: TaskRow
) {
  if (
    !task.due_at ||
    !isOpenTask(
      task
    )
  ) {
    return false;
  }

  const due =
    new Date(
      task.due_at
    ).getTime();

  return (
    Number.isFinite(
      due
    ) &&
    due <
      Date.now()
  );
}

function statusClasses(
  value: string
) {
  switch (
    value
  ) {
    case "active":
    case "completed":
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "blocked":
    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    case "pending":
    case "awaiting_approval":
    case "paused":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function priorityClasses(
  value: string
) {
  switch (
    value
  ) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";

    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "low":
      return "border-gray-200 bg-gray-50 text-gray-500";

    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function Badge({
  children,
  className,
}: {
  children:
    ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value:
    string | number;
  icon:
    ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold text-[#1C1C1E]">
            {value}
          </p>
        </div>

        <div className="text-gray-400">
          {icon}
        </div>
      </div>
    </div>
  );
}

async function getAccessToken() {
  const {
    data: {
      session,
    },
    error,
  } =
    await supabase.auth
      .getSession();

  if (error) {
    throw error;
  }

  if (
    !session
      ?.access_token
  ) {
    throw new Error(
      "Admin session not found. Please log in again."
    );
  }

  return session
    .access_token;
}

export function JakeCooDesk({
  onOpenMeetingRoom,
}: {
  onOpenMeetingRoom?: () => void;
}) {
  const [
    agents,
    setAgents,
  ] =
    useState<
      AgentRow[]
    >([]);

  const [
    tasks,
    setTasks,
  ] =
    useState<
      TaskRow[]
    >([]);

  const [
    approvals,
    setApprovals,
  ] =
    useState<
      ApprovalRow[]
    >([]);

  const [
    activity,
    setActivity,
  ] =
    useState<
      ActivityRow[]
    >([]);

  const [
    meetings,
    setMeetings,
  ] =
    useState<
      MeetingRow[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    startingMeeting,
    setStartingMeeting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const loadJake =
    useCallback(
      async (
        refresh =
          false
      ) => {
        try {
          if (
            refresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          const token =
            await getAccessToken();

          const [
            agentsResponse,
            workboardResponse,
            meetingsResponse,
          ] =
            await Promise.all([
              fetch(
                "/api/admin/ai-team/agents",
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/admin/ai-team/workboard",
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  cache:
                    "no-store",
                }
              ),

              fetch(
                "/api/admin/ai-team/meetings",
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },

                  cache:
                    "no-store",
                }
              ),
            ]);

          const [
            agentsPayload,
            workboardPayload,
            meetingsPayload,
          ] =
            await Promise.all([
              agentsResponse
                .json()
                .catch(
                  () =>
                    null
                ) as Promise<
                AgentsResponse |
                null
              >,

              workboardResponse
                .json()
                .catch(
                  () =>
                    null
                ) as Promise<
                WorkboardResponse |
                null
              >,

              meetingsResponse
                .json()
                .catch(
                  () =>
                    null
                ) as Promise<
                MeetingsResponse |
                null
              >,
            ]);

          if (
            !agentsResponse.ok ||
            !agentsPayload ||
            agentsPayload.ok !==
              true
          ) {
            throw new Error(
              agentsPayload
                ?.error ||
                "Unable to load AI Team agents."
            );
          }

          if (
            !workboardResponse.ok ||
            !workboardPayload ||
            workboardPayload.ok !==
              true
          ) {
            throw new Error(
              workboardPayload
                ?.error ||
                "Unable to load AI Team operations."
            );
          }

          if (
            !meetingsResponse.ok ||
            !meetingsPayload ||
            meetingsPayload.ok !==
              true
          ) {
            throw new Error(
              meetingsPayload
                ?.error ||
                "Unable to load Meeting Room history."
            );
          }

          setAgents(
            agentsPayload
              .agents ??
              []
          );

          setTasks(
            workboardPayload
              .tasks ??
              []
          );

          setApprovals(
            workboardPayload
              .approvals ??
              []
          );

          setActivity(
            workboardPayload
              .activity ??
              []
          );

          setMeetings(
            meetingsPayload
              .meetings ??
              []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load Jake COO workspace."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(
    () => {
      void loadJake();
    },
    [
      loadJake,
    ]
  );

  const jake =
    useMemo(
      () =>
        agents.find(
          (agent) =>
            agent.agent_key ===
            "jake"
        ) ??
        null,
      [
        agents,
      ]
    );

  const specialists =
    useMemo(
      () =>
        agents
          .filter(
            (agent) =>
              agent.agent_key !==
              "jake"
          )
          .sort(
            (
              a,
              b
            ) =>
              SPECIALIST_ORDER.indexOf(
                a.agent_key
              ) -
              SPECIALIST_ORDER.indexOf(
                b.agent_key
              )
          ),
      [
        agents,
      ]
    );

  const openTasks =
    useMemo(
      () =>
        tasks.filter(
          isOpenTask
        ),
      [
        tasks,
      ]
    );

  const blockedTasks =
    useMemo(
      () =>
        openTasks.filter(
          (task) =>
            task.status ===
            "blocked"
        ),
      [
        openTasks,
      ]
    );

  const highPriorityTasks =
    useMemo(
      () =>
        openTasks.filter(
          (task) =>
            [
              "high",
              "critical",
            ].includes(
              task.priority
            )
        ),
      [
        openTasks,
      ]
    );

  const overdueTasks =
    useMemo(
      () =>
        openTasks.filter(
          isOverdue
        ),
      [
        openTasks,
      ]
    );

  const pendingApprovals =
    useMemo(
      () =>
        approvals.filter(
          (approval) =>
            approval.status ===
            "pending"
        ),
      [
        approvals,
      ]
    );

  const activeMeeting =
    useMemo(
      () =>
        meetings.find(
          (meeting) =>
            meeting.status ===
            "in_progress"
        ) ??
        null,
      [
        meetings,
      ]
    );

  const recentJakeActivity =
    useMemo(
      () =>
        activity
          .filter(
            (entry) =>
              entry.agent
                ?.agent_key ===
              "jake"
          )
          .slice(
            0,
            8
          ),
      [
        activity,
      ]
    );

  const attentionTasks =
    useMemo(
      () => {
        const rank = (
          task: TaskRow
        ) => {
          if (
            task.priority ===
            "critical"
          ) {
            return 0;
          }

          if (
            task.status ===
            "blocked"
          ) {
            return 1;
          }

          if (
            isOverdue(
              task
            )
          ) {
            return 2;
          }

          if (
            task.status ===
              "awaiting_approval" ||
            task.requires_approval
          ) {
            return 3;
          }

          if (
            task.priority ===
            "high"
          ) {
            return 4;
          }

          return 5;
        };

        return openTasks
          .filter(
            (task) =>
              task.status ===
                "blocked" ||
              task.status ===
                "awaiting_approval" ||
              task.requires_approval ||
              [
                "high",
                "critical",
              ].includes(
                task.priority
              ) ||
              isOverdue(
                task
              )
          )
          .sort(
            (
              a,
              b
            ) =>
              rank(a) -
              rank(b)
          )
          .slice(
            0,
            10
          );
      },
      [
        openTasks,
      ]
    );

  async function startStrategyMeeting() {
    try {
      setStartingMeeting(
        true
      );

      setError("");
      setNotice("");

      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/admin/ai-team/meetings",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                meetingType:
                  "founder_coo_strategy",

                title:
                  "Founder / COO Strategy Review",
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () =>
              null
          ) as
          StartMeetingResponse |
          null;

      if (
        !response.ok ||
        !payload ||
        payload.ok !==
          true
      ) {
        throw new Error(
          payload
            ?.error ||
            "Unable to start COO strategy meeting."
        );
      }

      setNotice(
        payload.alreadyActive
          ? "An AI Team meeting is already active. Opening the Meeting Room."
          : "Founder / COO strategy meeting started."
      );

      await loadJake(
        true
      );

      onOpenMeetingRoom?.();
    } catch (
      meetingError
    ) {
      setError(
        meetingError instanceof
          Error
          ? meetingError.message
          : "Unable to start COO strategy meeting."
      );
    } finally {
      setStartingMeeting(
        false
      );
    }
  }

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Jake COO workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              COO Control Center
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[#1C1C1E]">
                Jake
              </h2>

              {jake ? (
                <Badge
                  className={
                    jake.enabled &&
                    jake.status ===
                      "active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50 text-gray-500"
                  }
                >
                  {jake.enabled
                    ? humanize(
                        jake.status
                      )
                    : "Disabled"}
                </Badge>
              ) : null}
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Executive coordination view across Tetamo&apos;s
              AI staff, operational work, Founder approvals,
              escalations and Meeting Room activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void loadJake(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                void startStrategyMeeting()
              }
              disabled={
                startingMeeting
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startingMeeting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BriefcaseBusiness className="h-4 w-4" />
              )}

              {activeMeeting
                ? "Open Active Meeting"
                : "Start COO Strategy Meeting"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Open Work"
          value={
            openTasks.length
          }
          icon={
            <BriefcaseBusiness className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Blocked"
          value={
            blockedTasks.length
          }
          icon={
            <ShieldAlert className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Founder Approvals"
          value={
            pendingApprovals.length
          }
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
        />

        <MetricCard
          label="High / Critical"
          value={
            highPriorityTasks.length
          }
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Overdue"
          value={
            overdueTasks.length
          }
          icon={
            <Clock3 className="h-5 w-5" />
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Founder Attention
            </p>

            <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
              Priority & Escalation Queue
            </h3>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Blocked, overdue, approval-sensitive and
              high-impact work Jake should keep visible.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {attentionTasks.length ===
            0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
                No escalated AI Team work requires attention.
              </div>
            ) : (
              attentionTasks.map(
                (task) => (
                  <div
                    key={
                      task.id
                    }
                    className="rounded-xl border border-gray-100 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            className={
                              statusClasses(
                                task.status
                              )
                            }
                          >
                            {humanize(
                              task.status
                            )}
                          </Badge>

                          <Badge
                            className={
                              priorityClasses(
                                task.priority
                              )
                            }
                          >
                            {humanize(
                              task.priority
                            )}
                          </Badge>

                          {isOverdue(
                            task
                          ) ? (
                            <Badge className="border-red-200 bg-red-50 text-red-700">
                              Overdue
                            </Badge>
                          ) : null}
                        </div>

                        <p className="mt-2 text-sm font-semibold text-[#1C1C1E]">
                          {
                            task.title
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Owner:{" "}
                          {task
                            .assigned_to_agent
                            ?.display_name ||
                            "Unassigned"}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs text-gray-400">
                        Due{" "}
                        {formatDate(
                          task.due_at
                        )}
                      </p>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Meeting Room
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Executive Session
          </h3>

          {activeMeeting ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <Badge className="border-emerald-200 bg-white text-emerald-700">
                In Progress
              </Badge>

              <p className="mt-3 text-sm font-semibold text-emerald-900">
                {
                  activeMeeting.title
                }
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                Started{" "}
                {formatDate(
                  activeMeeting.started_at
                )}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                No active executive meeting.
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Jake can chair a Founder / COO strategy
                session through the existing Meeting Room.
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700">
              Recent meetings
            </p>

            <div className="mt-3 space-y-3">
              {meetings
                .slice(
                  0,
                  4
                )
                .map(
                  (
                    meeting
                  ) => (
                    <div
                      key={
                        meeting.id
                      }
                      className="flex items-start gap-3"
                    >
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />

                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-gray-700">
                          {
                            meeting.title
                          }
                        </p>

                        <p className="mt-0.5 text-[11px] text-gray-400">
                          {humanize(
                            meeting.status
                          )}{" "}
                          •{" "}
                          {formatDate(
                            meeting.started_at ||
                              meeting.scheduled_for
                          )}
                        </p>
                      </div>
                    </div>
                  )
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Team Coordination
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Specialist Workload
          </h3>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {specialists.map(
            (agent) => {
              const assigned =
                openTasks.filter(
                  (task) =>
                    task
                      .assigned_to_agent
                      ?.id ===
                    agent.id
                );

              const blocked =
                assigned.filter(
                  (task) =>
                    task.status ===
                    "blocked"
                ).length;

              const approvalSensitive =
                assigned.filter(
                  (task) =>
                    task.status ===
                      "awaiting_approval" ||
                    task.requires_approval
                ).length;

              return (
                <div
                  key={
                    agent.id
                  }
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[#1C1C1E]">
                        {
                          agent.display_name
                        }
                      </p>

                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {
                          agent.role_title
                        }
                      </p>
                    </div>

                    <Badge
                      className={
                        agent.enabled &&
                        agent.status ===
                          "active"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : statusClasses(
                              agent.status
                            )
                      }
                    >
                      {agent.enabled
                        ? humanize(
                            agent.status
                          )
                        : "Disabled"}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-gray-500">
                    <div className="flex justify-between gap-3">
                      <span>
                        Open work
                      </span>

                      <span className="font-semibold text-gray-700">
                        {
                          assigned.length
                        }
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>
                        Blocked
                      </span>

                      <span className="font-semibold text-gray-700">
                        {
                          blocked
                        }
                      </span>
                    </div>

                    <div className="flex justify-between gap-3">
                      <span>
                        Approval-sensitive
                      </span>

                      <span className="font-semibold text-gray-700">
                        {
                          approvalSensitive
                        }
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Founder Approval Queue
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Pending Decisions
          </h3>

          <div className="mt-4 space-y-3">
            {pendingApprovals.length ===
            0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
                No pending AI approvals.
              </div>
            ) : (
              pendingApprovals
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    approval
                  ) => (
                    <div
                      key={
                        approval.id
                      }
                      className="rounded-xl border border-gray-100 p-4"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                          Pending
                        </Badge>

                        <Badge
                          className={
                            priorityClasses(
                              approval.risk_level
                            )
                          }
                        >
                          Risk:{" "}
                          {humanize(
                            approval.risk_level
                          )}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {
                          approval.action_summary
                        }
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Requested by{" "}
                        {approval
                          .requested_by_agent
                          ?.display_name ||
                          "AI Team"}
                      </p>
                    </div>
                  )
                )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Jake Audit Trail
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Recent COO Activity
          </h3>

          <div className="mt-4 space-y-3">
            {recentJakeActivity.length ===
            0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500">
                No recent Jake activity recorded.
              </div>
            ) : (
              recentJakeActivity.map(
                (
                  entry
                ) => (
                  <div
                    key={
                      entry.id
                    }
                    className="flex gap-3 rounded-xl border border-gray-100 p-4"
                  >
                    <div className="mt-0.5">
                      <Users className="h-4 w-4 text-gray-400" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {humanize(
                          entry.action
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {humanize(
                          entry.event_type
                        )}{" "}
                        •{" "}
                        {formatDate(
                          entry.created_at
                        )}
                      </p>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
