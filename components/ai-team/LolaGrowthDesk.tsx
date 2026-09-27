"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRightLeft,
  BarChart3,
  Brain,
  CircleDollarSign,
  Eye,
  Lightbulb,
  Loader2,
  MessageCircleMore,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  supabase,
} from "@/lib/supabase";

type CurrencyTotals =
  Record<string, number>;

type LolaAgent = {
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

type ThemeRow = {
  id: string;
  theme_key: string;
  title: string;
  summary: string;
  signal_count: number;
  distinct_conversation_count: number;
  content_score: number;
  growth_score: number;
  confidence: string;
  status: string;
  last_seen_at: string | null;
};

type DecisionRow = {
  id: string;
  title: string;
  status: string;
  rationale: string | null;
  related_entity_type:
    string | null;
  related_entity_id:
    string | null;
  metadata:
    Record<string, unknown> | null;
  created_at: string;
};

type HandoffRow = {
  id: string;
  handoff_type: string;
  summary: string;
  status: string;
  context:
    Record<string, unknown> | null;
  created_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  priority: string;
  status: string;
  expected_outcome:
    string | null;
  due_at:
    string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  event_type: string;
  action: string;
  severity: string;
  created_at: string;
};

type GrowthResponse = {
  ok: boolean;
  error?: string;
  generatedAt?: string;

  lola?: LolaAgent;

  businessGrowth?: {
    crmSnapshot: {
      totalConversations: number;

      commercial: {
        packageIntent: number;
        openCommercialPipeline: number;
        classifiedBeyondNewInquiry: number;
        paymentRecovery: number;
      };

      stages: {
        payment_started: number;
        payment_failed: number;
        follow_up: number;
      };
    };

    verifiedBusiness: {
      month: {
        sales: number;
        revenue:
          CurrencyTotals;
      };

      customerTypes: {
        owner: {
          sales: number;
          revenue:
            CurrencyTotals;
        };

        agent: {
          sales: number;
          revenue:
            CurrencyTotals;
        };
      };
    };
  };

  marketplaceGrowth?: {
    periods: {
      last30Days: {
        sessions: number;
        totalEvents: number;
        cardViews: number;
        detailClicks: number;
        detailViews: number;
        whatsappClicks: number;
        scheduleClicks: number;
        leads: number;
        leadActions: number;

        rates: {
          viewToDetailRate: number;
          leadActionRate: number;
          leadFormRate: number;
        };
      };
    };
  };

  growthIntelligence?: {
    themes: ThemeRow[];
    decisions: DecisionRow[];
    handoffs: HandoffRow[];
    tasks: TaskRow[];
    activity: ActivityRow[];
  };
};

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

function formatPercent(
  value:
    number | undefined
) {
  return `${new Intl.NumberFormat(
    "en-US",
    {
      maximumFractionDigits:
        1,
    }
  ).format(
    Number(
      value || 0
    )
  )}%`;
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
  ).format(date);
}

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

function outcomeLabel(
  decision: DecisionRow
) {
  const outcome =
    decision.metadata &&
    typeof decision.metadata
      .outcome ===
      "string"
      ? decision.metadata
          .outcome
      : null;

  return outcome
    ? humanize(
        outcome
      )
    : humanize(
        decision.status
      );
}

function badgeClasses(
  value: string
) {
  const normalized =
    value
      .toLowerCase();

  if (
    normalized ===
      "content_opportunity" ||
    normalized ===
      "approved" ||
    normalized ===
      "completed" ||
    normalized ===
      "qualified"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized ===
      "escalate" ||
    normalized ===
      "high" ||
    normalized ===
      "critical"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    normalized ===
      "watch" ||
    normalized ===
      "pending" ||
    normalized ===
      "in_progress" ||
    normalized ===
      "observing"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
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
  value: string | number;
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

export function LolaGrowthDesk() {
  const [
    data,
    setData,
  ] =
    useState<
      GrowthResponse | null
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
              "/api/admin/ai-team/lola/overview",
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
              GrowthResponse | null;

          if (
            !response.ok ||
            !payload ||
            payload.ok !==
              true
          ) {
            throw new Error(
              payload?.error ||
                "Unable to load Lola's growth workspace."
            );
          }

          setData(
            payload
          );
        } catch (loadError) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load Lola's growth workspace."
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

  const business =
    data?.businessGrowth;

  const marketplace =
    data
      ?.marketplaceGrowth
      ?.periods
      .last30Days;

  const intelligence =
    data
      ?.growthIntelligence;

  const themes =
    intelligence?.themes ??
    [];

  const decisions =
    intelligence?.decisions ??
    [];

  const handoffs =
    intelligence?.handoffs ??
    [];

  const tasks =
    intelligence?.tasks ??
    [];

  const activity =
    intelligence?.activity ??
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

  const activeThemes =
    useMemo(
      () =>
        themes.filter(
          (theme) =>
            ![
              "dismissed",
              "resolved",
            ].includes(
              theme.status
            )
        ),
      [
        themes,
      ]
    );

  const currentDecisions =
    useMemo(
      () => {
        const seen =
          new Set<string>();

        return decisions.filter(
          (decision) => {
            if (
              ![
                "proposed",
                "approved",
                "deferred",
              ].includes(
                decision.status
              )
            ) {
              return false;
            }

            const themeKey =
              typeof decision
                .metadata
                ?.source_theme_id ===
                "string"
                ? decision
                    .metadata
                    .source_theme_id
                : typeof decision
                    .metadata
                    ?.source_theme_key ===
                    "string"
                  ? decision
                      .metadata
                      .source_theme_key
                  : decision
                      .related_entity_id ||
                    decision.id;

            if (
              seen.has(
                themeKey
              )
            ) {
              return false;
            }

            seen.add(
              themeKey
            );

            return true;
          }
        );
      },
      [
        decisions,
      ]
    );

  const currentHandoffs =
    useMemo(
      () => {
        const seen =
          new Set<string>();

        return handoffs.filter(
          (handoff) => {
            if (
              ![
                "pending",
                "accepted",
                "completed",
              ].includes(
                handoff.status
              )
            ) {
              return false;
            }

            const themeKey =
              typeof handoff
                .context
                ?.source_theme_id ===
                "string"
                ? handoff
                    .context
                    .source_theme_id
                : typeof handoff
                    .context
                    ?.source_theme_key ===
                    "string"
                  ? handoff
                      .context
                      .source_theme_key
                  : handoff.id;

            if (
              seen.has(
                themeKey
              )
            ) {
              return false;
            }

            seen.add(
              themeKey
            );

            return true;
          }
        );
      },
      [
        handoffs,
      ]
    );

  if (
    loading
  ) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Lola Growth Desk...
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
              Growth Strategist
            </p>

            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                data?.lola?.enabled &&
                data?.lola?.status ===
                  "active"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              {data?.lola?.enabled &&
              data?.lola?.status ===
                "active"
                ? "Active"
                : "Inactive"}
            </span>
          </div>

          <h2 className="mt-2 text-xl font-semibold text-[#1C1C1E]">
            Lola Growth Desk
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
            Read-only growth intelligence from Tetamo&apos;s
            CRM, verified business reporting, marketplace
            analytics and AI Team records. Evidence and
            hypotheses remain separate.
          </p>

          {!data?.lola?.enabled ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
              Lola remains inactive while her workspace is
              being validated. This desk reads current data
              but does not authorize autonomous growth
              actions.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() =>
            void loadWorkspace(
              true
            )
          }
          disabled={
            refreshing
          }
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1C1C1E] shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-[#1C1C1E]">
            Business Growth
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Current CRM pipeline and verified Tetamo business.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Open Commercial Pipeline"
            value={
              business
                ?.crmSnapshot
                .commercial
                .openCommercialPipeline ??
              0
            }
            note="Current commercial-stage conversations"
            icon={
              <Users className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Package Intent"
            value={
              business
                ?.crmSnapshot
                .commercial
                .packageIntent ??
              0
            }
            note="Agent, owner and developer/agency package intent"
            icon={
              <Target className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Verified Sales This Month"
            value={
              business
                ?.verifiedBusiness
                .month
                .sales ??
              0
            }
            note={
              formatTotals(
                business
                  ?.verifiedBusiness
                  .month
                  .revenue
              )
            }
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Payment Failed"
            value={
              business
                ?.crmSnapshot
                .stages
                .payment_failed ??
              0
            }
            note={`${business?.crmSnapshot.stages.payment_started ?? 0} payment started · current CRM stage`}
            icon={
              <TrendingUp className="h-5 w-5" />
            }
          />
        </div>
      </div>

      <div>
        <div className="mb-3">
          <h3 className="text-base font-semibold text-[#1C1C1E]">
            Marketplace Growth · Last 30 Days
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Buyer and renter interaction with property
            listings. This is marketplace engagement, not
            Tetamo&apos;s subscription-sales funnel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Sessions"
            value={
              marketplace
                ?.sessions ??
              0
            }
            icon={
              <Eye className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Detail Views"
            value={
              marketplace
                ?.detailViews ??
              0
            }
            note={`${marketplace?.detailClicks ?? 0} detail clicks`}
            icon={
              <BarChart3 className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Lead Actions"
            value={
              marketplace
                ?.leadActions ??
              0
            }
            note={`${marketplace?.whatsappClicks ?? 0} WhatsApp · ${marketplace?.scheduleClicks ?? 0} viewing · ${marketplace?.leads ?? 0} lead events`}
            icon={
              <MessageCircleMore className="h-5 w-5" />
            }
          />

          <MetricCard
            label="Detail → Lead Action"
            value={
              formatPercent(
                marketplace
                  ?.rates
                  .leadActionRate
              )
            }
            note={`Card → detail ${formatPercent(
              marketplace
                ?.rates
                .viewToDetailRate
            )}`}
            icon={
              <TrendingUp className="h-5 w-5" />
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[#1C1C1E]">
                Growth Intelligence
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Aggregated recurring customer themes.
              </p>
            </div>

            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold text-gray-500">
              {activeThemes.length} active
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {activeThemes.length ===
            0 ? (
              <p className="rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
                No active growth themes yet.
              </p>
            ) : (
              activeThemes
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    theme
                  ) => (
                    <div
                      key={
                        theme.id
                      }
                      className="rounded-xl border border-gray-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#1C1C1E]">
                            {
                              theme.title
                            }
                          </p>

                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            {
                              theme.summary
                            }
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeClasses(
                            theme.status
                          )}`}
                        >
                          {humanize(
                            theme.status
                          )}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-gray-500">
                        <span className="rounded-full bg-gray-50 px-2 py-1">
                          Growth {
                            theme.growth_score
                          }/100
                        </span>

                        <span className="rounded-full bg-gray-50 px-2 py-1">
                          Content {
                            theme.content_score
                          }/100
                        </span>

                        <span className="rounded-full bg-gray-50 px-2 py-1">
                          {
                            theme.signal_count
                          } signals
                        </span>

                        <span className="rounded-full bg-gray-50 px-2 py-1">
                          {
                            theme.distinct_conversation_count
                          } conversations
                        </span>
                      </div>
                    </div>
                  )
                )
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-[#1C1C1E]">
                Lola Decisions
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Growth evaluations and proposed direction.
              </p>
            </div>

            <Lightbulb className="h-5 w-5 text-gray-400" />
          </div>

          <div className="mt-4 space-y-3">
            {currentDecisions.length ===
            0 ? (
              <p className="rounded-xl bg-gray-50 px-3 py-4 text-sm text-gray-500">
                No Lola decisions recorded yet.
              </p>
            ) : (
              currentDecisions
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    decision
                  ) => (
                    <div
                      key={
                        decision.id
                      }
                      className="rounded-xl border border-gray-100 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-[#1C1C1E]">
                          {
                            decision.title
                          }
                        </p>

                        <span
                          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${badgeClasses(
                            String(
                              decision.metadata
                                ?.outcome ??
                                decision.status
                            )
                          )}`}
                        >
                          {outcomeLabel(
                            decision
                          )}
                        </span>
                      </div>

                      {decision.rationale ? (
                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          {
                            decision.rationale
                          }
                        </p>
                      ) : null}

                      <p className="mt-2 text-[10px] text-gray-400">
                        {formatDate(
                          decision.created_at
                        )}
                      </p>
                    </div>
                  )
                )
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-gray-400" />

            <h3 className="font-semibold text-[#1C1C1E]">
              Handoffs
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {currentHandoffs.length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No Lola handoffs yet.
              </p>
            ) : (
              currentHandoffs
                .slice(
                  0,
                  6
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
            <Target className="h-4 w-4 text-gray-400" />

            <h3 className="font-semibold text-[#1C1C1E]">
              Growth Tasks
            </h3>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {openTasks.length} open
          </p>

          <div className="mt-4 space-y-3">
            {tasks.length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No Lola tasks yet.
              </p>
            ) : (
              tasks
                .slice(
                  0,
                  6
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

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-gray-400" />

            <h3 className="font-semibold text-[#1C1C1E]">
              Recent Activity
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            {activity.length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No Lola activity recorded yet.
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
                        )} ·{" "}
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
