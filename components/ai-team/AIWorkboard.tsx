"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ListTodo,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

type WorkboardTab =
  | "tasks"
  | "approvals"
  | "activity";

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
  source_id:
    string | null;
  related_entity_type:
    string | null;
  related_entity_id:
    string | null;
  expected_outcome:
    string | null;
  result_summary:
    string | null;
  requires_approval:
    boolean;
  due_at:
    string | null;
  started_at:
    string | null;
  completed_at:
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
  requested_by_agent_id:
    string | null;
  task_id:
    string | null;
  decision_id:
    string | null;
  action_type: string;
  action_summary: string;
  risk_level: string;
  status: string;
  requested_payload:
    Record<
      string,
      unknown
    > | null;
  reviewed_by_user_id:
    string | null;
  reviewed_at:
    string | null;
  review_notes:
    string | null;
  execution_status: string;
  executed_at:
    string | null;
  expires_at:
    string | null;
  created_at: string;
  updated_at: string;
  requested_by_agent:
    AgentSummary | null;
};

type ActivityRow = {
  id: string;
  agent_id:
    string | null;
  actor_user_id:
    string | null;
  event_type: string;
  action: string;
  entity_type:
    string | null;
  entity_id:
    string | null;
  task_id:
    string | null;
  severity: string;
  details:
    Record<
      string,
      unknown
    > | null;
  created_at: string;
  agent:
    AgentSummary | null;
};

type WorkboardResponse = {
  ok: boolean;
  generatedAt?: string;
  tasks?: TaskRow[];
  approvals?: ApprovalRow[];
  activity?: ActivityRow[];
  error?: string;
};

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

function statusClasses(
  value: string
) {
  switch (
    value
  ) {
    case "completed":
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "in_progress":
    case "running":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "blocked":
    case "rejected":
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "awaiting_approval":
    case "pending":
    case "queued":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "cancelled":
    case "expired":
      return "border-gray-200 bg-gray-50 text-gray-500";

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

function severityClasses(
  value: string
) {
  switch (
    value
  ) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";

    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function Badge({
  children,
  className,
}: {
  children:
    React.ReactNode;
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
    React.ReactNode;
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

export function AIWorkboard({
  tab,
}: {
  tab:
    WorkboardTab;
}) {
  const [
    data,
    setData,
  ] =
    useState<
      WorkboardResponse | null
    >(null);

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
    error,
    setError,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    approvalActionId,
    setApprovalActionId,
  ] =
    useState<
      string | null
    >(null);

  const [
    reviewNotes,
    setReviewNotes,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const loadWorkboard =
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

          const response =
            await fetch(
              "/api/admin/ai-team/workboard",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                cache:
                  "no-store",
              }
            );

          const payload =
            await response
              .json()
              .catch(
                () =>
                  null
              ) as
              WorkboardResponse |
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
                "Unable to load AI Team workboard."
            );
          }

          setData(
            payload
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load AI Team workboard."
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
      void loadWorkboard();
    },
    [
      loadWorkboard,
    ]
  );

  const tasks =
    useMemo(
      () =>
        data
          ?.tasks ??
        [],
      [
        data,
      ]
    );

  const approvals =
    useMemo(
      () =>
        data
          ?.approvals ??
        [],
      [
        data,
      ]
    );

  const activity =
    useMemo(
      () =>
        data
          ?.activity ??
        [],
      [
        data,
      ]
    );

  const taskMetrics =
    useMemo(
      () => {
        const active =
          tasks.filter(
            (task) =>
              ![
                "completed",
                "cancelled",
              ].includes(
                task.status
              )
          );

        return {
          total:
            tasks.length,

          active:
            active.length,

          approval:
            tasks.filter(
              (task) =>
                task.status ===
                "awaiting_approval"
            ).length,

          priority:
            active.filter(
              (task) =>
                [
                  "high",
                  "critical",
                ].includes(
                  task.priority
                )
            ).length,
        };
      },
      [
        tasks,
      ]
    );

  const approvalMetrics =
    useMemo(
      () => ({
        total:
          approvals.length,

        pending:
          approvals.filter(
            (approval) =>
              approval.status ===
              "pending"
          ).length,

        approved:
          approvals.filter(
            (approval) =>
              approval.status ===
              "approved"
          ).length,

        rejected:
          approvals.filter(
            (approval) =>
              approval.status ===
              "rejected"
          ).length,
      }),
      [
        approvals,
      ]
    );

  const activityMetrics =
    useMemo(
      () => ({
        total:
          activity.length,

        warning:
          activity.filter(
            (entry) =>
              entry.severity ===
              "warning"
          ).length,

        high:
          activity.filter(
            (entry) =>
              entry.severity ===
              "high"
          ).length,

        critical:
          activity.filter(
            (entry) =>
              entry.severity ===
              "critical"
          ).length,
      }),
      [
        activity,
      ]
    );

  async function decideApproval(
    approval:
      ApprovalRow,
    decision:
      "approved" |
      "rejected"
  ) {
    try {
      setApprovalActionId(
        approval.id
      );

      setError("");
      setNotice("");

      const note =
        cleanText(
          reviewNotes[
            approval.id
          ]
        );

      if (
        decision ===
          "rejected" &&
        approval.action_type ===
          "publish_content" &&
        !note
      ) {
        throw new Error(
          "Add a Founder review note before rejecting AI content."
        );
      }

      const token =
        await getAccessToken();

      const response =
        await fetch(
          `/api/admin/ai-team/approvals/${encodeURIComponent(
            approval.id
          )}/decision`,
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
                decision,

                reviewNotes:
                  note,
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () =>
              null
          );

      if (
        !response.ok ||
        !payload ||
        payload.ok !==
          true
      ) {
        throw new Error(
          cleanText(
            payload
              ?.error
          ) ||
            "Unable to save approval decision."
        );
      }

      setNotice(
        decision ===
          "approved"
          ? "AI approval approved. Approval alone does not execute the requested action."
          : "AI approval rejected."
      );

      setReviewNotes(
        (
          current
        ) => ({
          ...current,
          [
            approval.id
          ]:
            "",
        })
      );

      await loadWorkboard(
        true
      );
    } catch (
      decisionError
    ) {
      setError(
        decisionError instanceof
          Error
          ? decisionError.message
          : "Unable to save approval decision."
      );
    } finally {
      setApprovalActionId(
        null
      );
    }
  }

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading shared AI Team workboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Shared AI Team
          </p>

          <h2 className="mt-2 text-xl font-semibold text-[#1C1C1E]">
            {tab ===
            "tasks"
              ? "Tasks"
              : tab ===
                  "approvals"
                ? "Approvals"
                : "Activity"}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            {tab ===
            "tasks"
              ? "Live work assigned to and between Tetamo AI staff."
              : tab ===
                  "approvals"
                ? "Founder-controlled decisions requested by the AI Team. Approval does not automatically execute restricted actions."
                : "Append-style operational audit trail showing what the AI Team has actually done."}
          </p>
        </div>

        <button
          type="button"
          disabled={
            refreshing
          }
          onClick={() =>
            void loadWorkboard(
              true
            )
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

      {tab ===
      "tasks" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Tasks"
              value={
                taskMetrics.total
              }
              icon={
                <ListTodo className="h-5 w-5" />
              }
            />

            <MetricCard
              label="Active"
              value={
                taskMetrics.active
              }
              icon={
                <Clock3 className="h-5 w-5" />
              }
            />

            <MetricCard
              label="Awaiting Approval"
              value={
                taskMetrics.approval
              }
              icon={
                <ShieldCheck className="h-5 w-5" />
              }
            />

            <MetricCard
              label="High / Critical"
              value={
                taskMetrics.priority
              }
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
            />
          </div>

          <div className="space-y-3">
            {tasks.length ===
            0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                No AI Team tasks recorded yet.
              </div>
            ) : (
              tasks.map(
                (task) => (
                  <div
                    key={
                      task.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
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

                          {task
                            .requires_approval ? (
                            <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                              Approval Required
                            </Badge>
                          ) : null}
                        </div>

                        <h3 className="mt-3 font-semibold text-[#1C1C1E]">
                          {
                            task.title
                          }
                        </h3>

                        {task
                          .description ? (
                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            {
                              task.description
                            }
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right text-xs text-gray-400">
                        Updated{" "}
                        {formatDate(
                          task.updated_at
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 text-xs text-gray-500 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <span className="font-semibold text-gray-700">
                          Assigned:
                        </span>{" "}
                        {task
                          .assigned_to_agent
                          ?.display_name ||
                          "Unassigned"}
                      </div>

                      <div>
                        <span className="font-semibold text-gray-700">
                          Requested by:
                        </span>{" "}
                        {task
                          .requested_by_agent
                          ?.display_name ||
                          "Founder / System"}
                      </div>

                      <div>
                        <span className="font-semibold text-gray-700">
                          Due:
                        </span>{" "}
                        {formatDate(
                          task.due_at
                        )}
                      </div>

                      <div>
                        <span className="font-semibold text-gray-700">
                          Source:
                        </span>{" "}
                        {humanize(
                          task.source_type
                        )}
                      </div>
                    </div>

                    {task
                      .expected_outcome ? (
                      <div className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
                        <span className="font-semibold text-gray-700">
                          Expected outcome:
                        </span>{" "}
                        {
                          task.expected_outcome
                        }
                      </div>
                    ) : null}

                    {task
                      .result_summary ? (
                      <div className="mt-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700">
                        <span className="font-semibold">
                          Result:
                        </span>{" "}
                        {
                          task.result_summary
                        }
                      </div>
                    ) : null}
                  </div>
                )
              )
            )}
          </div>
        </>
      ) : null}

      {tab ===
      "approvals" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total"
              value={
                approvalMetrics.total
              }
              icon={
                <ShieldCheck className="h-5 w-5" />
              }
            />

            <MetricCard
              label="Pending"
              value={
                approvalMetrics.pending
              }
              icon={
                <Clock3 className="h-5 w-5" />
              }
            />

            <MetricCard
              label="Approved"
              value={
                approvalMetrics.approved
              }
              icon={
                <CheckCircle2 className="h-5 w-5" />
              }
            />

            <MetricCard
              label="Rejected"
              value={
                approvalMetrics.rejected
              }
              icon={
                <XCircle className="h-5 w-5" />
              }
            />
          </div>

          <div className="space-y-3">
            {approvals.length ===
            0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                No AI Team approval records yet.
              </div>
            ) : (
              approvals.map(
                (
                  approval
                ) => {
                  const pending =
                    approval.status ===
                    "pending";

                  const busy =
                    approvalActionId ===
                    approval.id;

                  return (
                    <div
                      key={
                        approval.id
                      }
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              className={
                                statusClasses(
                                  approval.status
                                )
                              }
                            >
                              {humanize(
                                approval.status
                              )}
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

                            <Badge
                              className={
                                statusClasses(
                                  approval.execution_status
                                )
                              }
                            >
                              Execution:{" "}
                              {humanize(
                                approval.execution_status
                              )}
                            </Badge>
                          </div>

                          <h3 className="mt-3 font-semibold text-[#1C1C1E]">
                            {
                              approval.action_summary
                            }
                          </h3>

                          <p className="mt-2 text-sm text-gray-500">
                            Requested by{" "}
                            {approval
                              .requested_by_agent
                              ?.display_name ||
                              "AI Team"}{" "}
                            •{" "}
                            {humanize(
                              approval.action_type
                            )}
                          </p>
                        </div>

                        <div className="shrink-0 text-xs text-gray-400">
                          {formatDate(
                            approval.created_at
                          )}
                        </div>
                      </div>

                      {approval
                        .review_notes ? (
                        <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-600">
                          <span className="font-semibold text-gray-700">
                            Founder review:
                          </span>{" "}
                          {
                            approval.review_notes
                          }
                        </div>
                      ) : null}

                      {pending ? (
                        <div className="mt-4 border-t border-gray-100 pt-4">
                          <label className="text-xs font-semibold text-gray-700">
                            Founder review note
                          </label>

                          <textarea
                            value={
                              reviewNotes[
                                approval.id
                              ] ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              setReviewNotes(
                                (
                                  current
                                ) => ({
                                  ...current,
                                  [
                                    approval.id
                                  ]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            rows={
                              3
                            }
                            placeholder={
                              approval.action_type ===
                              "publish_content"
                                ? "Required when rejecting AI content. Add exactly what must be revised."
                                : "Optional decision note."
                            }
                            className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-400"
                          />

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void decideApproval(
                                  approval,
                                  "approved"
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-3 py-2 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4" />
                              )}
                              Approve
                            </button>

                            <button
                              type="button"
                              disabled={
                                busy
                              }
                              onClick={() =>
                                void decideApproval(
                                  approval,
                                  "rejected"
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                }
              )
            )}
          </div>
        </>
      ) : null}

      {tab ===
      "activity" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Recent Activity"
              value={
                activityMetrics.total
              }
              icon={
                <Activity className="h-5 w-5" />
              }
            />

            <MetricCard
              label="Warnings"
              value={
                activityMetrics.warning
              }
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
            />

            <MetricCard
              label="High"
              value={
                activityMetrics.high
              }
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
            />

            <MetricCard
              label="Critical"
              value={
                activityMetrics.critical
              }
              icon={
                <AlertTriangle className="h-5 w-5" />
              }
            />
          </div>

          <div className="space-y-3">
            {activity.length ===
            0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
                No AI Team activity recorded yet.
              </div>
            ) : (
              activity.map(
                (entry) => (
                  <div
                    key={
                      entry.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            className={
                              severityClasses(
                                entry.severity
                              )
                            }
                          >
                            {humanize(
                              entry.severity
                            )}
                          </Badge>

                          <Badge className="border-gray-200 bg-gray-50 text-gray-600">
                            {humanize(
                              entry.event_type
                            )}
                          </Badge>
                        </div>

                        <h3 className="mt-3 font-semibold text-[#1C1C1E]">
                          {humanize(
                            entry.action
                          )}
                        </h3>

                        <p className="mt-2 text-sm text-gray-500">
                          {entry
                            .agent
                            ?.display_name ||
                            "Founder / System"}
                          {entry
                            .entity_type
                            ? ` • ${humanize(
                                entry.entity_type
                              )}`
                            : ""}
                        </p>
                      </div>

                      <div className="shrink-0 text-xs text-gray-400">
                        {formatDate(
                          entry.created_at
                        )}
                      </div>
                    </div>

                    {entry
                      .details &&
                    Object.keys(
                      entry.details
                    ).length >
                      0 ? (
                      <details className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
                        <summary className="cursor-pointer text-xs font-semibold text-gray-600">
                          View audit details
                        </summary>

                        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-[11px] leading-5 text-gray-500">
                          {JSON.stringify(
                            entry.details,
                            null,
                            2
                          )}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                )
              )
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
