import "server-only";

import OpenAI from "openai";

import {
  buildRevenueAnalytics,
  REPORTING_TIME_ZONE,
  type CurrencyTotals,
  type RevenueAnalytics,
} from "@/lib/reporting/revenue";

import {
  aiTeamSupabaseAdmin,
} from "@/lib/ai-team/core/admin-auth";

import {
  requireAgentPermission,
} from "@/lib/ai-team/permissions/agent-permissions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const UNCLE_SAM_MEETING_MODEL =
  "gpt-4.1-mini";

export type UncleSamMeetingTurn = {
  turnOrder: number;
  speakerName: string;
  speakerRole?: string | null;
  content: string;
};

export type UncleSamMeetingReply = {
  reply: string;
  source:
    | "openai"
    | "deterministic_fallback";
  financeGeneratedAt: string;
  reportingTimezone: string;
};

type GenerateUncleSamMeetingReplyInput = {
  question: string;
  recentTurns?: UncleSamMeetingTurn[];
};

type ExpenseRow = {
  id: string;
  expense_type: string;
  vendor_name: string | null;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  payment_status: string;
};

type SubscriptionRow = {
  id: string;
  vendor_name: string;
  service_name: string;
  purpose: string | null;
  billing_cycle: string | null;
  amount: number | null;
  currency: string | null;
  status: string;
  next_renewal_date: string | null;
  value_assessment: string | null;
  owner_name: string | null;
  business_value: string | null;
};

type AssetRow = {
  id: string;
  asset_type: string;
  asset_name: string;
  vendor_name: string | null;
  purchase_date: string | null;
  purchase_amount: number | null;
  currency: string | null;
  status: string;
  assigned_to: string | null;
  warranty_expires_at: string | null;
};

type UncleSamFinanceSnapshot = {
  generatedAt: string;
  reportingTimezone: string;
  revenue: RevenueAnalytics;

  expenses: {
    registeredCount: number;
    totals: CurrencyTotals;
    last30DaysCount: number;
    last30DaysTotals: CurrencyTotals;
    statusCounts: Record<string, number>;
  };

  subscriptions: {
    registeredCount: number;
    activeCount: number;
    trialCount: number;
    reviewCount: number;
    recordedAmounts: CurrencyTotals;
    upcomingRenewals: SubscriptionRow[];
  };

  assets: {
    registeredCount: number;
    activeCount: number;
    repairCount: number;
    purchaseTotals: CurrencyTotals;
  };
};

function cleanString(
  value: unknown
) {
  return typeof value === "string"
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
      .toUpperCase() ||
    "IDR";

  totals[code] =
    Number(
      totals[code] || 0
    ) +
    Number(amount || 0);
}

function formatAmount(
  amount: number,
  currency: string
) {
  const code =
    currency.toUpperCase();

  if (code === "IDR") {
    return `Rp ${new Intl.NumberFormat(
      "id-ID",
      {
        maximumFractionDigits: 0,
      }
    ).format(amount)}`;
  }

  try {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: code,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  } catch {
    return `${code} ${new Intl.NumberFormat(
      "en-US"
    ).format(amount)}`;
  }
}

function formatTotals(
  totals: CurrencyTotals
) {
  const entries =
    Object.entries(totals);

  if (!entries.length) {
    return "None recorded";
  }

  return entries
    .map(
      ([currency, amount]) =>
        formatAmount(
          Number(amount || 0),
          currency
        )
    )
    .join(", ");
}

function getDateKeyInTimezone(
  date: Date,
  timeZone: string
) {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const values =
    Object.fromEntries(
      parts.map(
        (part) => [
          part.type,
          part.value,
        ]
      )
    );

  return [
    values.year,
    values.month,
    values.day,
  ].join("-");
}

function shiftDateKey(
  dateKey: string,
  days: number
) {
  const date =
    new Date(
      `${dateKey}T00:00:00Z`
    );

  date.setUTCDate(
    date.getUTCDate() +
      days
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function buildConversation(
  turns: UncleSamMeetingTurn[]
) {
  if (!turns.length) {
    return "(No prior meeting context supplied.)";
  }

  return turns
    .slice(-20)
    .map((turn) => {
      const role =
        turn.speakerRole
          ? ` — ${turn.speakerRole}`
          : "";

      return [
        `Turn ${turn.turnOrder}`,
        `${turn.speakerName}${role}`,
        turn.content,
      ].join("\n");
    })
    .join("\n\n");
}

async function buildFinanceSnapshot():
Promise<UncleSamFinanceSnapshot> {
  requireAgentPermission(
    "uncle_sam",
    "read_finance_data"
  );

  const [
    revenue,
    expensesResult,
    subscriptionsResult,
    assetsResult,
  ] =
    await Promise.all([
      buildRevenueAnalytics(),

      aiTeamSupabaseAdmin
        .from(
          "business_expenses"
        )
        .select(
          "id, expense_type, vendor_name, description, amount, currency, expense_date, payment_status"
        )
        .eq(
          "business_key",
          "tetamo"
        )
        .order(
          "expense_date",
          {
            ascending: false,
          }
        ),

      aiTeamSupabaseAdmin
        .from(
          "business_subscriptions"
        )
        .select(
          "id, vendor_name, service_name, purpose, billing_cycle, amount, currency, status, next_renewal_date, value_assessment, owner_name, business_value"
        )
        .eq(
          "business_key",
          "tetamo"
        )
        .order(
          "next_renewal_date",
          {
            ascending: true,
            nullsFirst: false,
          }
        ),

      aiTeamSupabaseAdmin
        .from(
          "business_assets"
        )
        .select(
          "id, asset_type, asset_name, vendor_name, purchase_date, purchase_amount, currency, status, assigned_to, warranty_expires_at"
        )
        .eq(
          "business_key",
          "tetamo"
        )
        .order(
          "purchase_date",
          {
            ascending: false,
          }
        ),
    ]);

  if (expensesResult.error) {
    throw expensesResult.error;
  }

  if (
    subscriptionsResult.error
  ) {
    throw subscriptionsResult.error;
  }

  if (assetsResult.error) {
    throw assetsResult.error;
  }

  const expenses =
    (
      expensesResult.data ??
      []
    ) as ExpenseRow[];

  const subscriptions =
    (
      subscriptionsResult.data ??
      []
    ) as SubscriptionRow[];

  const assets =
    (
      assetsResult.data ??
      []
    ) as AssetRow[];

  const todayKey =
    getDateKeyInTimezone(
      new Date(),
      REPORTING_TIME_ZONE
    );

  const thirtyDaysAgoKey =
    shiftDateKey(
      todayKey,
      -29
    );

  const thirtyDaysAheadKey =
    shiftDateKey(
      todayKey,
      30
    );

  const expenseTotals:
    CurrencyTotals = {};

  const last30DaysTotals:
    CurrencyTotals = {};

  const expenseStatusCounts:
    Record<string, number> =
      {};

  let last30DaysCount = 0;

  for (
    const expense of expenses
  ) {
    addCurrencyAmount(
      expenseTotals,
      expense.currency,
      Number(
        expense.amount || 0
      )
    );

    const status =
      cleanString(
        expense.payment_status
      ) ||
      "unknown";

    expenseStatusCounts[
      status
    ] =
      (
        expenseStatusCounts[
          status
        ] ||
        0
      ) + 1;

    if (
      expense.expense_date >=
        thirtyDaysAgoKey &&
      expense.expense_date <=
        todayKey
    ) {
      last30DaysCount += 1;

      addCurrencyAmount(
        last30DaysTotals,
        expense.currency,
        Number(
          expense.amount || 0
        )
      );
    }
  }

  const recordedSubscriptionAmounts:
    CurrencyTotals = {};

  for (
    const subscription of
      subscriptions
  ) {
    if (
      subscription.amount !==
        null &&
      subscription.currency
    ) {
      addCurrencyAmount(
        recordedSubscriptionAmounts,
        subscription.currency,
        Number(
          subscription.amount
        )
      );
    }
  }

  const upcomingRenewals =
    subscriptions
      .filter(
        (subscription) =>
          Boolean(
            subscription
              .next_renewal_date
          ) &&
          subscription
            .next_renewal_date! >=
            todayKey &&
          subscription
            .next_renewal_date! <=
            thirtyDaysAheadKey &&
          ![
            "cancelled",
            "expired",
          ].includes(
            subscription.status
          )
      )
      .slice(0, 20);

  const assetPurchaseTotals:
    CurrencyTotals = {};

  for (const asset of assets) {
    if (
      asset.purchase_amount !==
        null &&
      asset.currency
    ) {
      addCurrencyAmount(
        assetPurchaseTotals,
        asset.currency,
        Number(
          asset.purchase_amount
        )
      );
    }
  }

  return {
    generatedAt:
      new Date()
        .toISOString(),

    reportingTimezone:
      REPORTING_TIME_ZONE,

    revenue,

    expenses: {
      registeredCount:
        expenses.length,

      totals:
        expenseTotals,

      last30DaysCount,

      last30DaysTotals,

      statusCounts:
        expenseStatusCounts,
    },

    subscriptions: {
      registeredCount:
        subscriptions.length,

      activeCount:
        subscriptions.filter(
          (row) =>
            row.status ===
            "active"
        ).length,

      trialCount:
        subscriptions.filter(
          (row) =>
            row.status ===
            "trial"
        ).length,

      reviewCount:
        subscriptions.filter(
          (row) =>
            row.status ===
            "review"
        ).length,

      recordedAmounts:
        recordedSubscriptionAmounts,

      upcomingRenewals,
    },

    assets: {
      registeredCount:
        assets.length,

      activeCount:
        assets.filter(
          (row) =>
            row.status ===
            "active"
        ).length,

      repairCount:
        assets.filter(
          (row) =>
            row.status ===
            "repair"
        ).length,

      purchaseTotals:
        assetPurchaseTotals,
    },
  };
}

function buildFinanceFacts(
  snapshot:
    UncleSamFinanceSnapshot
) {
  const revenue =
    snapshot.revenue.summary;

  const renewals =
    snapshot
      .subscriptions
      .upcomingRenewals;

  const renewalFacts =
    renewals.length
      ? renewals
          .map(
            (item) =>
              [
                item.service_name,
                item.vendor_name,
                item.next_renewal_date,
                item.amount !==
                    null &&
                  item.currency
                  ? formatAmount(
                      item.amount,
                      item.currency
                    )
                  : "amount not recorded",
                item.billing_cycle ||
                  "billing cycle not recorded",
              ].join(" | ")
          )
          .join("\n")
      : "None recorded in the next 30 days.";

  return `
FINANCE SNAPSHOT

Generated:
${snapshot.generatedAt}

Reporting timezone:
${snapshot.reportingTimezone}

VERIFIED REVENUE
Today:
- Sales: ${revenue.today.sales}
- Revenue: ${formatTotals(
    revenue.today.revenue
  )}

Current month:
- Sales: ${revenue.month.sales}
- Revenue: ${formatTotals(
    revenue.month.revenue
  )}

Verified total:
- Sales: ${revenue.total.sales}
- Revenue: ${formatTotals(
    revenue.total.revenue
  )}

OPERATING EXPENSE REGISTER
- Registered expenses: ${snapshot.expenses.registeredCount}
- Registered totals: ${formatTotals(
    snapshot.expenses.totals
  )}
- Last 30 days count: ${snapshot.expenses.last30DaysCount}
- Last 30 days totals: ${formatTotals(
    snapshot.expenses.last30DaysTotals
  )}
- Status counts: ${JSON.stringify(
    snapshot.expenses.statusCounts
  )}

SUBSCRIPTION REGISTER
- Registered services: ${snapshot.subscriptions.registeredCount}
- Active: ${snapshot.subscriptions.activeCount}
- Trial: ${snapshot.subscriptions.trialCount}
- Review: ${snapshot.subscriptions.reviewCount}
- Recorded subscription amounts by native billing cycle: ${formatTotals(
    snapshot.subscriptions.recordedAmounts
  )}

Renewals recorded within 30 days:
${renewalFacts}

BUSINESS ASSET REGISTER
- Registered assets: ${snapshot.assets.registeredCount}
- Active: ${snapshot.assets.activeCount}
- In repair: ${snapshot.assets.repairCount}
- Recorded historical purchase amounts: ${formatTotals(
    snapshot.assets.purchaseTotals
  )}

DATA BOUNDARIES
- Verified revenue comes from Tetamo's shared revenue reporting engine.
- Expense, subscription and asset figures come only from Tetamo's internal operating registers.
- These registers do NOT replace formal accounting, tax or audited financial records.
- Subscription amounts above use their original billing cycles and must NOT be added together as if they were all monthly costs.
- Asset purchases remain separate from ordinary operating expenses.
- Do NOT combine different currencies into one total.
- This snapshot does not establish bank cash balance, accounts payable, payroll, tax liability, formal profit, net income or cash runway.
`.trim();
}

function deterministicReply(
  snapshot:
    UncleSamFinanceSnapshot
) {
  return [
    `From Tetamo's current records, verified revenue this month is ${formatTotals(
      snapshot
        .revenue
        .summary
        .month
        .revenue
    )} across ${snapshot.revenue.summary.month.sales} verified sale${snapshot.revenue.summary.month.sales === 1 ? "" : "s"}.`,
    `The operating expense register contains ${snapshot.expenses.registeredCount} entries, with ${snapshot.expenses.last30DaysCount} dated within the last 30 days totaling ${formatTotals(
      snapshot.expenses.last30DaysTotals
    )}.`,
    `${snapshot.subscriptions.upcomingRenewals.length} recorded subscription renewal${snapshot.subscriptions.upcomingRenewals.length === 1 ? "" : "s"} fall within the next 30 days.`,
    `I would not call the difference profit or cash runway because these operating registers do not establish complete accounting liabilities, payroll, taxes or bank cash balances.`,
  ].join(" ");
}

function replyPassesSafety(
  reply: string
) {
  const normalized =
    reply
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );

  const prohibitedClaims = [
    /\bnet profit is\b/i,
    /\bprofit is\b/i,
    /\bcash balance is\b/i,
    /\bcash runway is\b/i,
    /\bwe can afford\b/i,
    /\btax (?:due|owed|liability) is\b/i,
    /\bi (?:have )?(?:cancelled|canceled|paid|refunded|purchased)\b/i,
    /\bi changed (?:the )?(?:price|pricing|budget)\b/i,
  ];

  return !prohibitedClaims.some(
    (pattern) =>
      pattern.test(normalized)
  );
}

export async function generateUncleSamMeetingReply({
  question,
  recentTurns = [],
}: GenerateUncleSamMeetingReplyInput):
Promise<UncleSamMeetingReply> {
  requireAgentPermission(
    "uncle_sam",
    "read_ai_team_data"
  );

  requireAgentPermission(
    "uncle_sam",
    "read_finance_data"
  );

  const snapshot =
    await buildFinanceSnapshot();

  const fallbackReply =
    deterministicReply(
      snapshot
    );

  if (
    !process.env.OPENAI_API_KEY
  ) {
    return {
      reply:
        fallbackReply,

      source:
        "deterministic_fallback",

      financeGeneratedAt:
        snapshot.generatedAt,

      reportingTimezone:
        snapshot.reportingTimezone,
    };
  }

  const conversation =
    buildConversation(
      recentTurns
    );

  const financeFacts =
    buildFinanceFacts(
      snapshot
    );

  const prompt = `
You are Uncle Sam, Tetamo's AI Finance & Admin Manager.

You are participating in an internal Tetamo executive meeting.

ORGANISATION
- Khaye is Founder / CEO and final decision-maker.
- Jake is the AI COO and meeting orchestrator.
- KooT is Strategic Adviser to the Founder.
- Mona owns Sales & Revenue operations.
- Rupert owns Content & SEO.
- Randolph owns Systems & IT.
- Lola owns Growth Strategy.
- You own Finance & Admin visibility.

PERSONALITY
You are practical, commercially aware, organised and slightly dry-humoured.
You care about where the money went.
You notice renewals, recurring costs, duplicate tools and missing financial records.
Keep the humour subtle. Be useful first.

YOUR JOB
Help Tetamo understand:
- verified revenue,
- recorded operating expenses,
- subscriptions and renewals,
- recurring-cost visibility,
- business assets,
- cost efficiency,
- upcoming commitments,
- financial/admin gaps,
- what needs Founder attention.

FINANCIAL TRUTH RULES

Use ONLY the supplied finance snapshot for factual financial claims.

Never invent:
- revenue,
- expenses,
- bank balances,
- profit,
- net income,
- tax liability,
- payroll,
- debt,
- accounts payable,
- cash runway,
- budgets,
- subscription charges,
- asset values.

Do not combine currencies.

Do not describe the difference between verified revenue and registered expenses as profit.

Do not assume the expense register is a complete accounting ledger.

Do not treat asset purchase values as ordinary operating expenses.

Do not convert subscription prices to monthly equivalents unless the supplied data explicitly supports that calculation.

If Khaye asks:
"Are we profitable?"
"How much cash do we have?"
"Can we afford this?"
"What tax do we owe?"
"What's our runway?"

and the supplied data is insufficient, say exactly what is missing.

AUTHORITY

You may:
- read finance/admin data,
- explain it,
- identify recorded cost patterns,
- flag renewals,
- identify missing records,
- recommend review,
- suggest cost-saving decisions,
- propose internal tasks,
- request approval.

You must NOT autonomously:
- spend money,
- issue refunds,
- cancel subscriptions,
- purchase assets,
- change pricing,
- change ad budgets,
- make tax filings,
- move money,
- alter billing,
- claim an approval happened.

Those actions require Founder approval and the appropriate execution system.

MEETING BEHAVIOUR

When Khaye directly assigns you a task:
- acknowledge it naturally,
- state what records you would inspect,
- state a limitation only if it matters,
- do not invent completion.

Do not speak for Jake or other specialists.
Do not close the meeting yourself.
Do not expose hidden reasoning.
Keep normal answers concise.
Use more detail only when needed.

RECENT MEETING CONVERSATION

${conversation}

CURRENT VERIFIED FINANCE / ADMIN FACTS

${financeFacts}

KHAYE'S CURRENT QUESTION / INSTRUCTION

${question}

Respond only with Uncle Sam's natural spoken meeting reply.
`.trim();

  try {
    const response =
      await openai.responses.create({
        model:
          UNCLE_SAM_MEETING_MODEL,

        input:
          prompt,

        temperature:
          0.25,

        max_output_tokens:
          700,
      });

    const reply =
      response.output_text
        .trim();

    if (
      !reply ||
      !replyPassesSafety(
        reply
      )
    ) {
      return {
        reply:
          fallbackReply,

        source:
          "deterministic_fallback",

        financeGeneratedAt:
          snapshot.generatedAt,

        reportingTimezone:
          snapshot.reportingTimezone,
      };
    }

    return {
      reply,

      source:
        "openai",

      financeGeneratedAt:
        snapshot.generatedAt,

      reportingTimezone:
        snapshot.reportingTimezone,
    };
  } catch (error) {
    console.error(
      "Uncle Sam meeting generation failed:",
      error
    );

    return {
      reply:
        fallbackReply,

      source:
        "deterministic_fallback",

      financeGeneratedAt:
        snapshot.generatedAt,

      reportingTimezone:
        snapshot.reportingTimezone,
    };
  }
}
