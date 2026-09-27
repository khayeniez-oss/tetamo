"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowRightLeft,
  Bot,
  CircleDollarSign,
  Clock3,
  Lightbulb,
  ListTodo,
  Loader2,
  MessageCircleMore,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

type CurrencyTotals =
  Record<string, number>;

type MonaAgent = {
  id: string;
  agent_key: string;
  display_name: string;
  role_title: string;
  mission: string;
  status: string;
  enabled: boolean;
  version: number;
  updated_at: string;
};

type SalesStages = {
  new_inquiry: number;
  lead: number;
  agent_package: number;
  owner_package: number;
  developer_agency: number;
  follow_up: number;
  payment_started: number;
  payment_failed: number;
  closed_won: number;
  closed_lost: number;
};

type ConversationRow = {
  id: string;
  phone: string | null;
  phone_e164: string | null;
  profile_name: string | null;
  channel: string | null;
  status: string | null;
  ai_enabled: boolean | null;
  handover_to_admin: boolean | null;
  handover_reason: string | null;
  sales_stage: string | null;
  sales_stage_updated_at: string | null;
  mona_followup_count: number | null;
  mona_followup_waiting_since: string | null;
  mona_next_followup_due_at: string | null;
  mona_dependency_controlled: boolean | null;
  mona_dependency_reason: string | null;
  last_message: string | null;
  last_message_direction: string | null;
  last_message_at: string | null;
  ad_referral_source: string | null;
  free_entry_point_source: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  priority: string;
  status: string;
  expected_outcome: string | null;
  due_at: string | null;
  created_at: string;
};

type HandoffRow = {
  id: string;
  handoff_type: string;
  summary: string;
  status: string;
  created_at: string;
};

type InsightRow = {
  id: string;
  insight_type: string;
  title: string;
  summary: string;
  confidence: string;
  priority: string;
  status: string;
  created_at: string;
};

type ActivityRow = {
  id: string;
  event_type: string;
  action: string;
  severity: string;
  created_at: string;
};

type SalesReviewResponse = {
  ok: boolean;
  error?: string;

  result?: {
    generatedAt: string;

    snapshot: {
      totalConversations: number;
      activeAi: number;
      needsAdmin: number;
      followupWaiting: number;
      followupDue: number;
      followupOverdueBeyond15m: number;
      packageIntent: number;
      openCommercialPipeline: number;
      paymentStarted: number;
      paymentFailed: number;
      closedWon: number;
      closedLost: number;
      verifiedSalesThisMonth: number;
    };

    report: {
      created: boolean;
      reportId: string | null;
      reportKey: string;
    };

    insight: {
      created: boolean;
      insightId: string | null;
      insightKey: string;
    };

    tasks: {
      created: number;
      existing: number;
    };

    adminHandoff: {
      created: boolean;
      existing: boolean;
      handoffId: string | null;
    };
  };
};

type MonaResponse = {
  ok: boolean;
  error?: string;
  generatedAt?: string;

  mona?: MonaAgent;

  salesOperations?: {
    totalConversations: number;
    activeAi: number;
    needsAdmin: number;
    pausedAi: number;
    handled: number;

    stages: SalesStages;

    commercial: {
      packageIntent: number;
      openCommercialPipeline: number;
      classifiedBeyondNewInquiry: number;
      paymentRecovery: number;

      terminal: {
        closedWon: number;
        closedLost: number;
      };
    };

    channels: {
      meta: number;
      twilio: number;
      other: number;
    };

    attribution: {
      adAttributedConversations: number;
      nonAdOrUnknownConversations: number;
    };

    verifiedBusiness: {
      today: {
        sales: number;
        revenue: CurrencyTotals;
      };

      month: {
        sales: number;
        revenue: CurrencyTotals;
      };

      total: {
        sales: number;
        revenue: CurrencyTotals;
      };
    };
  };

  followUpControl?: {
    waiting: number;
    dueOrOverdue: number;
    dependencyControlled: number;
  };

  reportingIntegrity?: {
    historicalConversionReliable: boolean;
    automaticHistoryAvailable: boolean;
    historyRows: number;
    warning: string;
  };

  pipeline?: {
    recentConversations: ConversationRow[];
  };

  aiTeam?: {
    tasks: TaskRow[];
    outgoingHandoffs: HandoffRow[];
    incomingHandoffs: HandoffRow[];
    insights: InsightRow[];
    activity: ActivityRow[];
  };

  safety?: {
    workspaceMode: string;
    sendsExternalMessages: boolean;
    changesPricing: boolean;
    spendsMoney: boolean;
    note: string;
  };
};

function humanize(
  value:
    string | null | undefined
) {
  if (!value) {
    return "—";
  }

  return value
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
    string | null | undefined
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

function formatTotals(
  totals:
    CurrencyTotals | undefined
) {
  if (!totals) {
    return "—";
  }

  const entries =
    Object.entries(
      totals
    );

  if (!entries.length) {
    return "Rp 0";
  }

  return entries
    .map(
      ([currency, amount]) => {
        if (
          currency.toUpperCase() ===
          "IDR"
        ) {
          return `Rp ${new Intl.NumberFormat(
            "id-ID",
            {
              maximumFractionDigits:
                0,
            }
          ).format(amount)}`;
        }

        return `${currency.toUpperCase()} ${new Intl.NumberFormat(
          "en-US",
          {
            maximumFractionDigits:
              2,
          }
        ).format(amount)}`;
      }
    )
    .join(" + ");
}

function badgeClasses(
  value:
    string | null | undefined
) {
  const normalized =
    String(
      value || ""
    ).toLowerCase();

  if (
    [
      "active",
      "closed_won",
      "completed",
      "approved",
    ].includes(
      normalized
    )
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    [
      "payment_failed",
      "critical",
      "high",
      "rejected",
    ].includes(
      normalized
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    [
      "follow_up",
      "payment_started",
      "pending",
      "in_progress",
      "needs_admin",
    ].includes(
      normalized
    )
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    [
      "agent_package",
      "owner_package",
      "developer_agency",
      "lead",
    ].includes(
      normalized
    )
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-600";
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
    !session?.access_token
  ) {
    throw new Error(
      "Admin session not found. Please log in again."
    );
  }

  return session
    .access_token;
}

function MetricCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value:
    string | number;
  note?: string;
  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-semibold text-[#1C1C1E]">
            {value}
          </p>

          {note ? (
            <p className="mt-1 text-xs leading-5 text-gray-500">
              {note}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl bg-gray-100 p-2.5 text-gray-500">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function MonaSalesDesk() {
  const [
    data,
    setData,
  ] =
    useState<
      MonaResponse | null
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
    reviewing,
    setReviewing,
  ] =
    useState(false);

  const [
    reviewNotice,
    setReviewNotice,
  ] =
    useState("");

  const loadWorkspace =
    useCallback(
      async (
        refresh = false
      ) => {
        try {
          if (refresh) {
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
              "/api/admin/ai-team/mona/overview",
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
            (await response
              .json()
              .catch(
                () =>
                  null
              )) as
              MonaResponse | null;

          if (
            !response.ok ||
            !payload ||
            payload.ok !==
              true
          ) {
            throw new Error(
              payload?.error ||
                "Unable to load Mona's sales workspace."
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
              : "Unable to load Mona's sales workspace."
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
      void loadWorkspace();
    },
    [
      loadWorkspace,
    ]
  );

  const runSalesReview =
    useCallback(
      async () => {
        try {
          setReviewing(true);
          setError("");
          setReviewNotice("");

          const token =
            await getAccessToken();

          const response =
            await fetch(
              "/api/admin/ai-team/mona/sales-review",
              {
                method: "POST",

                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },

                cache: "no-store",
              }
            );

          const payload =
            (await response
              .json()
              .catch(
                () => null
              )) as SalesReviewResponse | null;

          if (
            !response.ok ||
            !payload ||
            payload.ok !== true ||
            !payload.result
          ) {
            throw new Error(
              payload?.error ||
                "Unable to run Mona Sales Review."
            );
          }

          const result =
            payload.result;

          setReviewNotice(
            [
              "Sales Review completed.",
              `Open pipeline: ${result.snapshot.openCommercialPipeline}.`,
              `Needs Admin: ${result.snapshot.needsAdmin}.`,
              `Overdue >15m: ${result.snapshot.followupOverdueBeyond15m}.`,
              `Tasks created: ${result.tasks.created}.`,
              result.adminHandoff.created
                ? "Jake handoff created."
                : result.adminHandoff.existing
                  ? "Jake handoff already active."
                  : "No Jake handoff required.",
            ].join(" ")
          );

          await loadWorkspace(true);
        } catch (reviewError) {
          setError(
            reviewError instanceof Error
              ? reviewError.message
              : "Unable to run Mona Sales Review."
          );
        } finally {
          setReviewing(false);
        }
      },
      [
        loadWorkspace,
      ]
    );

  const sales =
    data?.salesOperations;

  const stages =
    sales?.stages;

  const followUp =
    data?.followUpControl;

  const conversations =
    data
      ?.pipeline
      ?.recentConversations ??
    [];

  const tasks =
    data
      ?.aiTeam
      ?.tasks ??
    [];

  const outgoingHandoffs =
    data
      ?.aiTeam
      ?.outgoingHandoffs ??
    [];

  const incomingHandoffs =
    data
      ?.aiTeam
      ?.incomingHandoffs ??
    [];

  const insights =
    data
      ?.aiTeam
      ?.insights ??
    [];

  const activity =
    data
      ?.aiTeam
      ?.activity ??
    [];

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

  const needsAttention =
    useMemo(
      () =>
        conversations.filter(
          (
            conversation
          ) =>
            Boolean(
              conversation
                .handover_to_admin
            ) ||
            Boolean(
              conversation
                .mona_dependency_controlled
            ) ||
            (
              conversation
                .mona_next_followup_due_at &&
              new Date(
                conversation
                  .mona_next_followup_due_at
              ).getTime() <=
                Date.now()
            )
        ),
      [
        conversations,
      ]
    );

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Mona Sales Desk...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
              Sales & Customer Enquiries
            </p>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                data?.mona
                  ?.enabled &&
                data?.mona
                  ?.status ===
                  "active"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              {data?.mona
                ?.enabled &&
              data?.mona
                ?.status ===
                "active"
                ? "Active"
                : "Inactive"}
            </span>
          </div>

          <h2 className="mt-2 text-xl font-semibold text-[#1C1C1E]">
            Mona Sales Desk
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Live operational view of Mona&apos;s customer
            enquiries, CRM pipeline, follow-up pressure,
            verified Tetamo sales and AI Team work.
          </p>

          <p className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
            This workspace reads Mona&apos;s existing
            WhatsApp and CRM records. It does not create a
            second customer-message sending path.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void runSalesReview()
            }
            disabled={
              reviewing ||
              refreshing
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reviewing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}

            {reviewing
              ? "Reviewing..."
              : "Run Sales Review"}
          </button>

          <button
            type="button"
            onClick={() =>
              void loadWorkspace(
                true
              )
            }
            disabled={
              refreshing ||
              reviewing
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
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
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {reviewNotice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-700">
          {reviewNotice}
        </div>
      ) : null}

      <div>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-[#1C1C1E]">
            Sales Operations
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Current operational snapshot from Mona&apos;s CRM.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open Commercial Pipeline"
            value={
              sales
                ?.commercial
                .openCommercialPipeline ??
              0
            }
            note="Lead, package intent, follow-up and payment-started conversations"
            icon={
              <TrendingUp className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Package Intent"
            value={
              sales
                ?.commercial
                .packageIntent ??
              0
            }
            note="Agent, owner and developer/agency package stages"
            icon={
              <Users className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Needs Admin"
            value={
              sales
                ?.needsAdmin ??
              0
            }
            note={`${sales?.activeAi ?? 0} currently handled by AI`}
            icon={
              <AlertTriangle className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Verified Sales This Month"
            value={
              sales
                ?.verifiedBusiness
                .month
                .sales ??
              0
            }
            note={
              formatTotals(
                sales
                  ?.verifiedBusiness
                  .month
                  .revenue
              )
            }
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
          />
        </div>
      </div>

      <div>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-[#1C1C1E]">
            Follow-up Control
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Mona&apos;s current automated follow-up workload.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Waiting"
            value={
              followUp
                ?.waiting ??
              0
            }
            note="Conversations with an active Mona waiting cycle"
            icon={
              <Clock3 className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Due / Overdue"
            value={
              followUp
                ?.dueOrOverdue ??
              0
            }
            note="Follow-ups whose due time has arrived"
            icon={
              <MessageCircleMore className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Dependency Controlled"
            value={
              followUp
                ?.dependencyControlled ??
              0
            }
            note="Follow-ups paused by a dependency or control condition"
            icon={
              <Bot className="h-5 w-5" />
            }
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[#1C1C1E]">
              Sales Stage Snapshot
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Current CRM classification. These are current
              stage counts, not historical conversion rates.
            </p>
          </div>

          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
            {sales
              ?.totalConversations ??
              0}{" "}
            conversations
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            [
              "New Inquiry",
              stages
                ?.new_inquiry ??
                0,
              "new_inquiry",
            ],
            [
              "Lead",
              stages
                ?.lead ??
                0,
              "lead",
            ],
            [
              "Agent Package",
              stages
                ?.agent_package ??
                0,
              "agent_package",
            ],
            [
              "Owner Package",
              stages
                ?.owner_package ??
                0,
              "owner_package",
            ],
            [
              "Developer / Agency",
              stages
                ?.developer_agency ??
                0,
              "developer_agency",
            ],
            [
              "Follow-Up",
              stages
                ?.follow_up ??
                0,
              "follow_up",
            ],
            [
              "Payment Started",
              stages
                ?.payment_started ??
                0,
              "payment_started",
            ],
            [
              "Payment Failed",
              stages
                ?.payment_failed ??
                0,
              "payment_failed",
            ],
            [
              "Closed Won",
              stages
                ?.closed_won ??
                0,
              "closed_won",
            ],
            [
              "Closed Lost",
              stages
                ?.closed_lost ??
                0,
              "closed_lost",
            ],
          ].map(
            (
              [
                label,
                value,
                stage,
              ]
            ) => (
              <div
                key={
                  String(
                    stage
                  )
                }
                className="rounded-xl border border-gray-100 p-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                  {label}
                </p>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xl font-semibold text-[#1C1C1E]">
                    {value}
                  </p>

                  <span
                    className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${badgeClasses(
                      String(
                        stage
                      )
                    )}`}
                  >
                    {humanize(
                      String(
                        stage
                      )
                    )}
                  </span>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {data
        ?.reportingIntegrity
        ?.historicalConversionReliable ===
      false ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

            <div>
              <p className="text-sm font-semibold text-amber-800">
                Historical conversion reporting is not yet reliable
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                {
                  data
                    ?.reportingIntegrity
                    ?.warning
                }
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-[#1C1C1E]">
              Current Pipeline
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Most recently active customer conversations.
            </p>
          </div>

          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
            {needsAttention.length} attention flags in loaded records
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] uppercase tracking-[0.1em] text-gray-400">
                <th className="px-3 py-2 font-semibold">
                  Customer
                </th>

                <th className="px-3 py-2 font-semibold">
                  Stage
                </th>

                <th className="px-3 py-2 font-semibold">
                  Mona
                </th>

                <th className="px-3 py-2 font-semibold">
                  Follow-Up
                </th>

                <th className="px-3 py-2 font-semibold">
                  Last Message
                </th>

                <th className="px-3 py-2 font-semibold">
                  Last Activity
                </th>
              </tr>
            </thead>

            <tbody>
              {conversations
                .slice(
                  0,
                  20
                )
                .map(
                  (
                    conversation
                  ) => (
                    <tr
                      key={
                        conversation.id
                      }
                      className="border-b border-gray-50 align-top"
                    >
                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-[#1C1C1E]">
                          {conversation.profile_name ||
                            "Unknown customer"}
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          {conversation.phone_e164 ||
                            conversation.phone ||
                            "No phone"}
                        </p>
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeClasses(
                            conversation.sales_stage
                          )}`}
                        >
                          {humanize(
                            conversation.sales_stage ||
                              "new_inquiry"
                          )}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit rounded-full border px-2 py-1 text-[10px] font-semibold ${
                              conversation.handover_to_admin
                                ? "border-red-200 bg-red-50 text-red-700"
                                : conversation.ai_enabled
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-gray-200 bg-gray-50 text-gray-500"
                            }`}
                          >
                            {conversation.handover_to_admin
                              ? "Needs Admin"
                              : conversation.ai_enabled
                                ? "AI Active"
                                : "AI Paused"}
                          </span>

                          {conversation.handover_reason ? (
                            <p className="max-w-[180px] text-[10px] leading-4 text-gray-400">
                              {
                                conversation.handover_reason
                              }
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <p className="text-xs text-gray-600">
                          {conversation.mona_followup_count ??
                            0}{" "}
                          sent
                        </p>

                        {conversation.mona_next_followup_due_at ? (
                          <p className="mt-1 text-[10px] text-gray-400">
                            Due{" "}
                            {formatDate(
                              conversation.mona_next_followup_due_at
                            )}
                          </p>
                        ) : (
                          <p className="mt-1 text-[10px] text-gray-400">
                            No active timer
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <p className="max-w-[300px] truncate text-xs text-gray-600">
                          {conversation.last_message ||
                            "—"}
                        </p>

                        <p className="mt-1 text-[10px] text-gray-400">
                          {humanize(
                            conversation.last_message_direction
                          )}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3 text-xs text-gray-500">
                        {formatDate(
                          conversation.last_message_at
                        )}
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>

          {conversations.length ===
          0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No conversations found.
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-gray-400" />

            <h3 className="font-semibold text-[#1C1C1E]">
              Mona Insights
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {insights.length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No Mona insights recorded yet.
              </p>
            ) : (
              insights
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    insight
                  ) => (
                    <div
                      key={
                        insight.id
                      }
                      className="rounded-xl border border-gray-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[#1C1C1E]">
                          {
                            insight.title
                          }
                        </p>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeClasses(
                            insight.status
                          )}`}
                        >
                          {humanize(
                            insight.status
                          )}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-gray-500">
                        {
                          insight.summary
                        }
                      </p>

                      <p className="mt-2 text-[10px] text-gray-400">
                        {humanize(
                          insight.insight_type
                        )}{" "}
                        ·{" "}
                        {formatDate(
                          insight.created_at
                        )}
                      </p>
                    </div>
                  )
                )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-gray-400" />

            <h3 className="font-semibold text-[#1C1C1E]">
              Mona Tasks
            </h3>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {openTasks.length} open
          </p>

          <div className="mt-4 space-y-3">
            {tasks.length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No Mona tasks recorded yet.
              </p>
            ) : (
              tasks
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    task
                  ) => (
                    <div
                      key={
                        task.id
                      }
                      className="rounded-xl bg-gray-50 p-3"
                    >
                      <p className="text-xs font-semibold text-[#1C1C1E]">
                        {
                          task.title
                        }
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeClasses(
                            task.status
                          )}`}
                        >
                          {humanize(
                            task.status
                          )}
                        </span>

                        <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-500">
                          {humanize(
                            task.priority
                          )}
                        </span>
                      </div>
                    </div>
                  )
                )
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-gray-400" />

            <h3 className="font-semibold text-[#1C1C1E]">
              Handoffs
            </h3>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {outgoingHandoffs.length} outgoing ·{" "}
            {incomingHandoffs.length} incoming
          </p>

          <div className="mt-4 space-y-3">
            {[
              ...outgoingHandoffs,
              ...incomingHandoffs,
            ].length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No Mona handoffs recorded yet.
              </p>
            ) : (
              [
                ...outgoingHandoffs,
                ...incomingHandoffs,
              ]
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    handoff
                  ) => (
                    <div
                      key={
                        handoff.id
                      }
                      className="rounded-xl bg-gray-50 p-3"
                    >
                      <p className="text-xs font-semibold text-[#1C1C1E]">
                        {humanize(
                          handoff.handoff_type
                        )}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        {
                          handoff.summary
                        }
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeClasses(
                          handoff.status
                        )}`}
                      >
                        {humanize(
                          handoff.status
                        )}
                      </span>
                    </div>
                  )
                )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-gray-400" />

            <h3 className="font-semibold text-[#1C1C1E]">
              Recent AI Team Activity
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {activity.length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No Mona AI Team activity recorded yet.
              </p>
            ) : (
              activity
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-xl bg-gray-50 p-3"
                    >
                      <p className="text-xs font-semibold text-[#1C1C1E]">
                        {humanize(
                          item.action
                        )}
                      </p>

                      <p className="mt-1 text-[10px] text-gray-400">
                        {humanize(
                          item.event_type
                        )}{" "}
                        ·{" "}
                        {formatDate(
                          item.created_at
                        )}
                      </p>
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
