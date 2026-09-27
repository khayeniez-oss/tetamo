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
  Bug,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Siren,
  Wrench,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

type IncidentRow = {
  id: string;
  title: string;
  description:
    string | null;
  surface: string;
  platform:
    string | null;
  severity: string;
  status: string;
  confidence: string;
  impact_summary:
    string | null;
  probable_cause:
    string | null;
  evidence:
    unknown[];
  recommended_action:
    string | null;
  related_task_id:
    string | null;
  related_approval_id:
    string | null;
  detected_at: string;
  acknowledged_at:
    string | null;
  resolved_at:
    string | null;
  resolution_summary:
    string | null;
  created_at: string;
  updated_at: string;
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
  expected_outcome:
    string | null;
  result_summary:
    string | null;
  requires_approval: boolean;
  due_at:
    string | null;
  created_at: string;
  updated_at: string;
};

type ActivityRow = {
  id: string;
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
    Record<string, unknown> | null;
  created_at: string;
};

type RandolphRow = {
  id: string;
  agent_key: string;
  display_name: string;
  role_title: string;
  status: string;
  enabled: boolean;
};

type DeskResponse = {
  ok: boolean;
  randolph?: RandolphRow;
  incidents?: IncidentRow[];
  tasks?: TaskRow[];
  activity?: ActivityRow[];
  error?: string;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  surface: "",
  platform: "",
  severity: "warning",
  status: "open",
  confidence: "unknown",
  impactSummary: "",
  probableCause: "",
  recommendedAction: "",
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
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    date
  );
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

function statusClasses(
  value: string
) {
  switch (
    value
  ) {
    case "resolved":
    case "closed":
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "investigating":
    case "mitigating":
    case "monitoring":
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "awaiting_approval":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "blocked":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

function confidenceClasses(
  value: string
) {
  switch (
    value
  ) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "probable":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "possible":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-gray-200 bg-gray-50 text-gray-500";
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

export function RandolphWatchdogDesk() {
  const [
    randolph,
    setRandolph,
  ] =
    useState<
      RandolphRow | null
    >(null);

  const [
    incidents,
    setIncidents,
  ] =
    useState<
      IncidentRow[]
    >([]);

  const [
    tasks,
    setTasks,
  ] =
    useState<
      TaskRow[]
    >([]);

  const [
    activity,
    setActivity,
  ] =
    useState<
      ActivityRow[]
    >([]);

  const [
    form,
    setForm,
  ] =
    useState(
      EMPTY_FORM
    );

  const [
    showForm,
    setShowForm,
  ] =
    useState(false);

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
    saving,
    setSaving,
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

  const loadDesk =
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
              "/api/admin/ai-team/randolph/incidents",
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
              DeskResponse |
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
                "Unable to load Randolph watchdog desk."
            );
          }

          setRandolph(
            payload.randolph ??
              null
          );

          setIncidents(
            payload.incidents ??
              []
          );

          setTasks(
            payload.tasks ??
              []
          );

          setActivity(
            payload.activity ??
              []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load Randolph watchdog desk."
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
      void loadDesk();
    },
    [
      loadDesk,
    ]
  );

  const openIncidents =
    useMemo(
      () =>
        incidents.filter(
          (incident) =>
            ![
              "resolved",
              "closed",
            ].includes(
              incident.status
            )
        ),
      [
        incidents,
      ]
    );

  const criticalIncidents =
    useMemo(
      () =>
        openIncidents.filter(
          (incident) =>
            incident.severity ===
              "critical" ||
            incident.severity ===
              "high"
        ),
      [
        openIncidents,
      ]
    );

  const investigating =
    useMemo(
      () =>
        openIncidents.filter(
          (incident) =>
            [
              "investigating",
              "mitigating",
              "monitoring",
            ].includes(
              incident.status
            )
        ),
      [
        openIncidents,
      ]
    );

  const openTasks =
    useMemo(
      () =>
        tasks.filter(
          (task) =>
            ![
              "completed",
              "cancelled",
            ].includes(
              task.status
            )
        ),
      [
        tasks,
      ]
    );

  async function createIncident() {
    try {
      setSaving(
        true
      );

      setError("");
      setNotice("");

      if (
        !form.title.trim()
      ) {
        throw new Error(
          "Incident title is required."
        );
      }

      if (
        !form.surface.trim()
      ) {
        throw new Error(
          "System surface is required."
        );
      }

      const token =
        await getAccessToken();

      const response =
        await fetch(
          "/api/admin/ai-team/randolph/incidents",
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
              JSON.stringify(
                form
              ),
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
            "Unable to record incident."
        );
      }

      setNotice(
        "Incident recorded. This does not mean the cause has been verified or a production fix has been executed."
      );

      setForm(
        EMPTY_FORM
      );

      setShowForm(
        false
      );

      await loadDesk(
        true
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : "Unable to record incident."
      );
    } finally {
      setSaving(
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
          Loading Randolph watchdog desk...
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
              Systems & IT Watchdog
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-[#1C1C1E]">
                Randolph
              </h2>

              <Badge
                className={
                  randolph
                    ?.enabled &&
                  randolph
                    ?.status ===
                    "active"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }
              >
                {randolph
                  ?.enabled
                  ? humanize(
                      randolph
                        .status
                    )
                  : "Inactive"}
              </Badge>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
              Technical incident register, system investigations,
              assigned watchdog work and evidence-based audit
              history.
            </p>

            {!randolph
              ?.enabled ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
                Randolph is intentionally inactive until his
                incident workflow is verified end-to-end.
                This desk does not claim automatic production
                monitoring is active.
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                refreshing
              }
              onClick={() =>
                void loadDesk(
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

            <button
              type="button"
              onClick={() =>
                setShowForm(
                  (
                    current
                  ) =>
                    !current
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-3 py-2 text-sm font-semibold text-white hover:bg-black"
            >
              <Plus className="h-4 w-4" />
              Record Incident
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

      {showForm ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            New Incident
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Record System Evidence
          </h3>

          <p className="mt-1 text-xs leading-5 text-gray-500">
            Record what is known. Do not mark a cause confirmed
            unless there is evidence supporting it.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-semibold text-gray-700">
              Incident title
              <input
                value={
                  form.title
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      title:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
                placeholder="e.g. WhatsApp webhook delivery delay"
              />
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Surface
              <input
                value={
                  form.surface
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      surface:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
                placeholder="e.g. WhatsApp, Mobile App, Vercel"
              />
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Platform
              <input
                value={
                  form.platform
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      platform:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
                placeholder="Optional"
              />
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Severity
              <select
                value={
                  form.severity
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      severity:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
              >
                <option value="info">
                  Info
                </option>
                <option value="warning">
                  Warning
                </option>
                <option value="high">
                  High
                </option>
                <option value="critical">
                  Critical
                </option>
              </select>
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Status
              <select
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      status:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
              >
                <option value="open">
                  Open
                </option>
                <option value="investigating">
                  Investigating
                </option>
                <option value="awaiting_approval">
                  Awaiting Approval
                </option>
                <option value="mitigating">
                  Mitigating
                </option>
                <option value="monitoring">
                  Monitoring
                </option>
              </select>
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Confidence
              <select
                value={
                  form.confidence
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      confidence:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
              >
                <option value="unknown">
                  Unknown
                </option>
                <option value="possible">
                  Possible
                </option>
                <option value="probable">
                  Probable
                </option>
                <option value="confirmed">
                  Confirmed
                </option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="text-xs font-semibold text-gray-700">
              Description
              <textarea
                rows={
                  3
                }
                value={
                  form.description
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      description:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
              />
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Impact summary
              <textarea
                rows={
                  2
                }
                value={
                  form.impactSummary
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      impactSummary:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
              />
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Probable cause
              <textarea
                rows={
                  2
                }
                value={
                  form.probableCause
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      probableCause:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
                placeholder="Leave blank if unknown."
              />
            </label>

            <label className="text-xs font-semibold text-gray-700">
              Recommended action
              <textarea
                rows={
                  2
                }
                value={
                  form.recommendedAction
                }
                onChange={(
                  event
                ) =>
                  setForm(
                    {
                      ...form,
                      recommendedAction:
                        event
                          .target
                          .value,
                    }
                  )
                }
                className="mt-2 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-gray-400"
                placeholder="Recommendation only. Production changes still require approval."
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                void createIncident()
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
              Record Incident
            </button>

            <button
              type="button"
              disabled={
                saving
              }
              onClick={() =>
                setShowForm(
                  false
                )
              }
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Open Incidents"
          value={
            openIncidents.length
          }
          icon={
            <Siren className="h-5 w-5" />
          }
        />

        <MetricCard
          label="High / Critical"
          value={
            criticalIncidents.length
          }
          icon={
            <AlertTriangle className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Under Investigation"
          value={
            investigating.length
          }
          icon={
            <Bug className="h-5 w-5" />
          }
        />

        <MetricCard
          label="Open Technical Work"
          value={
            openTasks.length
          }
          icon={
            <Wrench className="h-5 w-5" />
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Incident Register
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Systems & Technical Risks
          </h3>

          <div className="mt-4 space-y-3">
            {incidents.length ===
            0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
                No Randolph incidents recorded yet.
              </div>
            ) : (
              incidents.map(
                (
                  incident
                ) => (
                  <div
                    key={
                      incident.id
                    }
                    className="rounded-xl border border-gray-100 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            className={
                              severityClasses(
                                incident.severity
                              )
                            }
                          >
                            {humanize(
                              incident.severity
                            )}
                          </Badge>

                          <Badge
                            className={
                              statusClasses(
                                incident.status
                              )
                            }
                          >
                            {humanize(
                              incident.status
                            )}
                          </Badge>

                          <Badge
                            className={
                              confidenceClasses(
                                incident.confidence
                              )
                            }
                          >
                            {humanize(
                              incident.confidence
                            )}
                          </Badge>
                        </div>

                        <h4 className="mt-3 text-sm font-semibold text-[#1C1C1E]">
                          {
                            incident.title
                          }
                        </h4>

                        <p className="mt-1 text-xs text-gray-500">
                          {
                            incident.surface
                          }
                          {incident
                            .platform
                            ? ` • ${incident.platform}`
                            : ""}
                        </p>
                      </div>

                      <p className="shrink-0 text-xs text-gray-400">
                        {formatDate(
                          incident.detected_at
                        )}
                      </p>
                    </div>

                    {incident
                      .description ? (
                      <p className="mt-3 text-sm leading-6 text-gray-500">
                        {
                          incident.description
                        }
                      </p>
                    ) : null}

                    {incident
                      .impact_summary ? (
                      <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600">
                        <span className="font-semibold text-gray-700">
                          Impact:
                        </span>{" "}
                        {
                          incident.impact_summary
                        }
                      </div>
                    ) : null}

                    {incident
                      .probable_cause ? (
                      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                        <span className="font-semibold">
                          Probable cause:
                        </span>{" "}
                        {
                          incident.probable_cause
                        }
                      </div>
                    ) : null}

                    {incident
                      .recommended_action ? (
                      <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
                        <span className="font-semibold">
                          Recommended action:
                        </span>{" "}
                        {
                          incident.recommended_action
                        }
                      </div>
                    ) : null}
                  </div>
                )
              )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            Assigned Work
          </p>

          <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
            Randolph Technical Tasks
          </h3>

          <div className="mt-4 space-y-3">
            {tasks.length ===
            0 ? (
              <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
                No tasks assigned to Randolph yet.
              </div>
            ) : (
              tasks
                .slice(
                  0,
                  12
                )
                .map(
                  (
                    task
                  ) => (
                    <div
                      key={
                        task.id
                      }
                      className="rounded-xl border border-gray-100 p-4"
                    >
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
                            severityClasses(
                              task.priority ===
                                "critical"
                                ? "critical"
                                : task.priority ===
                                    "high"
                                  ? "high"
                                  : "info"
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

                      <p className="mt-3 text-sm font-semibold text-gray-800">
                        {
                          task.title
                        }
                      </p>

                      {task
                        .expected_outcome ? (
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          {
                            task.expected_outcome
                          }
                        </p>
                      ) : null}

                      <p className="mt-2 text-[11px] text-gray-400">
                        Due{" "}
                        {formatDate(
                          task.due_at
                        )}
                      </p>
                    </div>
                  )
                )
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-gray-400" />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Randolph Audit Trail
            </p>

            <h3 className="mt-2 text-base font-semibold text-[#1C1C1E]">
              Recent Watchdog Activity
            </h3>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {activity.length ===
          0 ? (
            <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
              No Randolph audit activity recorded yet.
            </div>
          ) : (
            activity
              .slice(
                0,
                15
              )
              .map(
                (
                  entry
                ) => (
                  <div
                    key={
                      entry.id
                    }
                    className="flex flex-col gap-2 rounded-xl border border-gray-100 p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
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

                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {humanize(
                          entry.action
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(
                        entry.created_at
                      )}
                    </div>
                  </div>
                )
              )
          )}
        </div>
      </div>
    </div>
  );
}
