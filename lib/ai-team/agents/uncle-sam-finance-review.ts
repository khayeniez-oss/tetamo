import "server-only";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

import {
  buildRevenueAnalytics,
  REPORTING_TIME_ZONE,
  type CurrencyTotals,
} from "@/lib/reporting/revenue";

type SubscriptionRow = {
  id: string;
  vendor_name: string;
  service_name: string;
  amount: number | null;
  currency: string | null;
  billing_cycle: string | null;
  status: string;
  next_renewal_date: string | null;
  value_assessment: string | null;
  owner_name: string | null;
  business_value: string | null;
};

type ExpenseRow = {
  id: string;
  amount: number;
  currency: string;
  expense_date: string;
  payment_status: string;
};

export type UncleSamFinanceReviewResult = {
  generatedAt: string;
  reportingTimezone: string;
  renewalTasksCreated: number;
  renewalTasksExisting: number;
  upcomingRenewals: number;
  costReviewFlags: number;
  weeklyReport:
    | {
        created: true;
        reportId: string;
        reportKey: string;
      }
    | {
        created: false;
        reason:
          | "not_weekly_report_day"
          | "already_exists";
        reportId?: string;
        reportKey: string;
      };
};

function cleanString(
  value: unknown
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function addCurrencyAmount(
  totals: CurrencyTotals,
  currency: string,
  amount: number
) {
  const code =
    cleanString(currency)
      .toUpperCase();

  if (!code) {
    return;
  }

  totals[code] =
    Number(
      totals[code] || 0
    ) +
    Number(amount || 0);
}

function formatTotals(
  totals: CurrencyTotals
) {
  const entries =
    Object.entries(
      totals
    );

  if (!entries.length) {
    return "none recorded";
  }

  return entries
    .map(
      ([currency, amount]) =>
        currency === "IDR"
          ? `Rp ${new Intl.NumberFormat(
              "id-ID",
              {
                maximumFractionDigits:
                  0,
              }
            ).format(amount)}`
          : `${currency} ${new Intl.NumberFormat(
              "en-US",
              {
                maximumFractionDigits:
                  2,
              }
            ).format(amount)}`
    )
    .join(", ");
}

function getDateKey(
  date: Date
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          REPORTING_TIME_ZONE,
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
      }
    ).formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(
  dateKey: string,
  days: number
) {
  const date =
    new Date(
      `${dateKey}T00:00:00.000Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function getMondayKey(
  dateKey: string
) {
  const date =
    new Date(
      `${dateKey}T00:00:00.000Z`
    );

  const day =
    date.getUTCDay();

  const distance =
    (day + 6) %
    7;

  return shiftDateKey(
    dateKey,
    -distance
  );
}

function daysBetween(
  fromDateKey: string,
  toDateKey: string
) {
  const from =
    new Date(
      `${fromDateKey}T00:00:00.000Z`
    );

  const to =
    new Date(
      `${toDateKey}T00:00:00.000Z`
    );

  return Math.round(
    (
      to.getTime() -
      from.getTime()
    ) /
      (
        24 *
        60 *
        60 *
        1000
      )
  );
}

async function getAgents() {
  const {
    data,
    error,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_agents"
      )
      .select(
        "id, agent_key, display_name, enabled, status"
      )
      .in(
        "agent_key",
        [
          "uncle_sam",
          "jake",
        ]
      );

  if (error) {
    throw error;
  }

  const uncleSam =
    (data ?? []).find(
      (agent) =>
        agent.agent_key ===
        "uncle_sam"
    );

  const jake =
    (data ?? []).find(
      (agent) =>
        agent.agent_key ===
        "jake"
    );

  if (!uncleSam) {
    throw new Error(
      "Uncle Sam AI agent was not found."
    );
  }

  return {
    uncleSam,
    jake:
      jake ??
      null,
  };
}

async function createRenewalTask(
  uncleSamId: string,
  subscription:
    SubscriptionRow,
  todayKey: string
) {
  const renewalDate =
    subscription
      .next_renewal_date;

  if (!renewalDate) {
    return "skipped" as const;
  }

  const sourceId =
    `${subscription.id}:${renewalDate}`;

  const {
    data:
      existing,
    error:
      existingError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .select(
        "id"
      )
      .eq(
        "source_type",
        "uncle_sam_subscription_renewal"
      )
      .eq(
        "source_id",
        sourceId
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return "existing" as const;
  }

  const daysUntilRenewal =
    daysBetween(
      todayKey,
      renewalDate
    );

  const priority =
    daysUntilRenewal <=
    7
      ? "high"
      : "normal";

  const {
    data:
      created,
    error:
      createError,
  } =
    await aiTeamSupabaseAdmin
      .from(
        "ai_tasks"
      )
      .insert({
        title:
          `Review ${subscription.service_name} renewal`,

        description:
          [
            `${subscription.vendor_name} / ${subscription.service_name}`,
            `renews on ${renewalDate}.`,
            subscription.amount !==
                null &&
              subscription.currency
              ? `Recorded commitment: ${subscription.currency} ${subscription.amount}.`
              : "No subscription amount is recorded.",
            `Current value assessment: ${subscription.value_assessment || "not set"}.`,
            "Review the service value and recommend keep, replace, consolidate, cancel or further review.",
            "Do not cancel, purchase, spend money or alter billing autonomously.",
          ].join(
            " "
          ),

        requested_by_agent_id:
          uncleSamId,

        assigned_to_agent_id:
          uncleSamId,

        priority,

        status:
          "pending",

        source_type:
          "uncle_sam_subscription_renewal",

        source_id:
          sourceId,

        related_entity_type:
          "business_subscription",

        related_entity_id:
          subscription.id,

        expected_outcome:
          "A documented renewal recommendation for Founder review. No autonomous billing action.",

        requires_approval:
          false,

        due_at:
          `${renewalDate}T00:00:00.000Z`,

        metadata: {
          subscription_id:
            subscription.id,

          vendor_name:
            subscription.vendor_name,

          service_name:
            subscription.service_name,

          renewal_date:
            renewalDate,

          amount:
            subscription.amount,

          currency:
            subscription.currency,

          billing_cycle:
            subscription.billing_cycle,

          value_assessment:
            subscription.value_assessment,

          owner_name:
            subscription.owner_name,

          generated_by:
            "uncle_sam_finance_review",
        },
      })
      .select(
        "id"
      )
      .single();

  if (createError) {
    if (
      createError.code ===
      "23505"
    ) {
      return "existing" as const;
    }

    throw createError;
  }

  await aiTeamSupabaseAdmin
    .from(
      "ai_activity"
    )
    .insert({
      agent_id:
        uncleSamId,

      event_type:
        "finance_admin",

      action:
        "renewal_review_task_created",

      entity_type:
        "business_subscriptions",

      entity_id:
        subscription.id,

      task_id:
        created.id,

      severity:
        priority ===
        "high"
          ? "warning"
          : "info",

      details: {
        renewal_date:
          renewalDate,

        days_until_renewal:
          daysUntilRenewal,

        source_id:
          sourceId,
      },
    });

  return "created" as const;
}

export async function runUncleSamFinanceReview(
  options?: {
    now?: Date;
    forceWeeklyReport?: boolean;
  }
): Promise<UncleSamFinanceReviewResult> {
  requireAgentPermission(
    "uncle_sam",
    "read_finance_data"
  );

  requireAgentPermission(
    "uncle_sam",
    "create_internal_task"
  );

  requireAgentPermission(
    "uncle_sam",
    "create_report"
  );

  const now =
    options?.now ??
    new Date();

  const todayKey =
    getDateKey(
      now
    );

  const thirtyDaysAhead =
    shiftDateKey(
      todayKey,
      30
    );

  const mondayKey =
    getMondayKey(
      todayKey
    );

  const previousMonday =
    shiftDateKey(
      mondayKey,
      -7
    );

  const previousSunday =
    shiftDateKey(
      mondayKey,
      -1
    );

  const {
    uncleSam,
    jake,
  } =
    await getAgents();

  const [
    revenue,
    subscriptionsResult,
    expensesResult,
  ] =
    await Promise.all([
      buildRevenueAnalytics(),

      aiTeamSupabaseAdmin
        .from(
          "business_subscriptions"
        )
        .select(
          "id, vendor_name, service_name, amount, currency, billing_cycle, status, next_renewal_date, value_assessment, owner_name, business_value"
        )
        .eq(
          "business_key",
          "tetamo"
        ),

      aiTeamSupabaseAdmin
        .from(
          "business_expenses"
        )
        .select(
          "id, amount, currency, expense_date, payment_status"
        )
        .eq(
          "business_key",
          "tetamo"
        ),
    ]);

  if (
    subscriptionsResult.error
  ) {
    throw subscriptionsResult.error;
  }

  if (
    expensesResult.error
  ) {
    throw expensesResult.error;
  }

  const subscriptions =
    (
      subscriptionsResult.data ??
      []
    ) as SubscriptionRow[];

  const expenses =
    (
      expensesResult.data ??
      []
    ) as ExpenseRow[];

  const upcomingRenewals =
    subscriptions.filter(
      (row) =>
        Boolean(
          row.next_renewal_date
        ) &&
        row.next_renewal_date! >=
          todayKey &&
        row.next_renewal_date! <=
          thirtyDaysAhead &&
        ![
          "cancelled",
          "expired",
        ].includes(
          row.status
        )
    );

  const costReviewSubscriptions =
    subscriptions.filter(
      (row) =>
        ![
          "cancelled",
          "expired",
        ].includes(
          row.status
        ) &&
        [
          "review",
          "replace",
          "consolidate",
          "cancel",
        ].includes(
          row.value_assessment ??
          ""
        )
    );

  let renewalTasksCreated =
    0;

  let renewalTasksExisting =
    0;

  for (
    const subscription of
      upcomingRenewals
  ) {
    const result =
      await createRenewalTask(
        uncleSam.id,
        subscription,
        todayKey
      );

    if (
      result ===
      "created"
    ) {
      renewalTasksCreated +=
        1;
    }

    if (
      result ===
      "existing"
    ) {
      renewalTasksExisting +=
        1;
    }
  }

  const isMonday =
    getMondayKey(
      todayKey
    ) ===
      todayKey;

  const reportKey =
    `uncle_sam_weekly_finance:${mondayKey}`;

  let weeklyReport:
    UncleSamFinanceReviewResult[
      "weeklyReport"
    ] = {
      created:
        false,
      reason:
        "not_weekly_report_day",
      reportKey,
    };

  if (
    isMonday ||
    options
      ?.forceWeeklyReport
  ) {
    const {
      data:
        existingReport,
      error:
        existingReportError,
    } =
      await aiTeamSupabaseAdmin
        .from(
          "ai_reports"
        )
        .select(
          "id"
        )
        .eq(
          "agent_id",
          uncleSam.id
        )
        .eq(
          "report_type",
          "financial"
        )
        .contains(
          "source_data",
          {
            report_key:
              reportKey,
          }
        )
        .maybeSingle();

    if (
      existingReportError
    ) {
      throw existingReportError;
    }

    if (
      existingReport
    ) {
      weeklyReport = {
        created:
          false,
        reason:
          "already_exists",
        reportId:
          existingReport.id,
        reportKey,
      };
    } else {
      const paidExpenseTotals:
        CurrencyTotals = {};

      let paidExpenseCount =
        0;

      for (
        const expense of
          expenses
      ) {
        if (
          expense.payment_status !==
          "paid"
        ) {
          continue;
        }

        if (
          expense.expense_date <
            previousMonday ||
          expense.expense_date >
            previousSunday
        ) {
          continue;
        }

        paidExpenseCount +=
          1;

        addCurrencyAmount(
          paidExpenseTotals,
          expense.currency,
          Number(
            expense.amount ||
            0
          )
        );
      }

      const findings =
        [
          ...upcomingRenewals.map(
            (row) =>
              `${row.service_name} (${row.vendor_name}) renews ${row.next_renewal_date}.`
          ),

          ...costReviewSubscriptions.map(
            (row) =>
              `${row.service_name} is marked "${row.value_assessment}" for cost/value review.`
          ),
        ];

      const recommendations =
        costReviewSubscriptions.length
          ? [
              "Review flagged subscriptions before renewal. Any cancellation or billing change requires Founder action/approval.",
            ]
          : [
              "Continue maintaining complete expense and subscription records so future finance reviews remain reliable.",
            ];

      const summary =
        [
          `Current-month verified revenue: ${formatTotals(
            revenue.summary.month.revenue
          )} across ${revenue.summary.month.sales} verified sale${
            revenue.summary.month.sales ===
            1
              ? ""
              : "s"
          }.`,
          `Paid operating expenses recorded for ${previousMonday} through ${previousSunday}: ${formatTotals(
            paidExpenseTotals
          )} across ${paidExpenseCount} record${
            paidExpenseCount ===
            1
              ? ""
              : "s"
          }.`,
          `Upcoming subscription renewals within 30 days: ${upcomingRenewals.length}.`,
          `Subscriptions flagged for cost/value review: ${costReviewSubscriptions.length}.`,
          "Subscription commitments are not added to paid expense totals, preventing double counting.",
          "This is an internal operating snapshot and does not establish formal profit, tax liability, bank cash or runway.",
        ].join(
          " "
        );

      const {
        data:
          createdReport,
        error:
          reportError,
      } =
        await aiTeamSupabaseAdmin
          .from(
            "ai_reports"
          )
          .insert({
            agent_id:
              uncleSam.id,

            report_type:
              "financial",

            title:
              `Uncle Sam Weekly Finance Snapshot — ${mondayKey}`,

            period_start:
              `${previousMonday}T00:00:00.000Z`,

            period_end:
              `${previousSunday}T23:59:59.999Z`,

            summary,

            metrics: {
              current_month_verified_sales:
                revenue.summary.month.sales,

              current_month_verified_revenue:
                revenue.summary.month.revenue,

              previous_week_paid_expense_count:
                paidExpenseCount,

              previous_week_paid_expenses:
                paidExpenseTotals,

              upcoming_renewals_30d:
                upcomingRenewals.length,

              cost_review_flags:
                costReviewSubscriptions.length,
            },

            findings,

            recommendations,

            recipient_agent_id:
              jake?.id ??
              null,

            source_data: {
              report_key:
                reportKey,

              generated_by:
                "uncle_sam_finance_review",

              reporting_timezone:
                REPORTING_TIME_ZONE,

              revenue_scope:
                "current_month_verified_snapshot",

              expense_scope:
                "previous_week_paid_only",

              subscription_amounts_treated_as:
                "commitments_not_expenses",
            },
          })
          .select(
            "id"
          )
          .single();

      if (reportError) {
        if (
          reportError.code ===
          "23505"
        ) {
          const {
            data:
              racedReport,
          } =
            await aiTeamSupabaseAdmin
              .from(
                "ai_reports"
              )
              .select(
                "id"
              )
              .eq(
                "agent_id",
                uncleSam.id
              )
              .eq(
                "report_type",
                "financial"
              )
              .contains(
                "source_data",
                {
                  report_key:
                    reportKey,
                }
              )
              .maybeSingle();

          weeklyReport = {
            created:
              false,
            reason:
              "already_exists",
            reportId:
              racedReport?.id,
            reportKey,
          };
        } else {
          throw reportError;
        }
      } else {
        weeklyReport = {
          created:
            true,
          reportId:
            createdReport.id,
          reportKey,
        };

        await aiTeamSupabaseAdmin
          .from(
            "ai_activity"
          )
          .insert({
            agent_id:
              uncleSam.id,

            event_type:
              "finance_admin",

            action:
              "weekly_financial_report_created",

            entity_type:
              "ai_reports",

            entity_id:
              createdReport.id,

            severity:
              "info",

            details: {
              report_key:
                reportKey,

              upcoming_renewals:
                upcomingRenewals.length,

              cost_review_flags:
                costReviewSubscriptions.length,
            },
          });
      }
    }
  }

  return {
    generatedAt:
      now.toISOString(),

    reportingTimezone:
      REPORTING_TIME_ZONE,

    renewalTasksCreated,

    renewalTasksExisting,

    upcomingRenewals:
      upcomingRenewals.length,

    costReviewFlags:
      costReviewSubscriptions.length,

    weeklyReport,
  };
}
