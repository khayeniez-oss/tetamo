import "server-only";

import { createClient } from "@supabase/supabase-js";

export const REPORTING_TIME_ZONE =
  "Asia/Jakarta";

const PAGE_SIZE = 1000;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "";

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

type PaymentRow = {
  id: string;
  source_role: string | null;
  payment_type: string | null;
  product_type: string | null;
  product_id: string | null;
  product_name_snapshot: string | null;
  amount_total: number | null;
  currency: string | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;

  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_invoice_id: string | null;
  stripe_event_id_last: string | null;

  metadata: Record<string, unknown> | null;
};

type Provider =
  | "stripe"
  | "hitpay"
  | "apple"
  | "google_play";

export type CurrencyTotals =
  Record<string, number>;

export type RevenueAnalytics = {
  reportingTimezone: string;
  generatedAt: string;

  summary: {
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

  providers: {
    hitpay: {
      sales: number;
      revenue: CurrencyTotals;
    };
    stripe: {
      sales: number;
      revenue: CurrencyTotals;
    };
    apple: {
      sales: number;
      revenue: CurrencyTotals;
    };
    googlePlay: {
      sales: number;
      revenue: CurrencyTotals;
    };
  };

  customerTypes: {
    owner: {
      sales: number;
      revenue: CurrencyTotals;
    };
    agent: {
      sales: number;
      revenue: CurrencyTotals;
    };
  };

  products: Array<{
    key: string;
    label: string;
    sales: number;
    revenue: CurrencyTotals;
  }>;

  trend: Array<{
    key: string;
    label: string;
    sales: number;
    revenue: CurrencyTotals;
  }>;

  testPaid: {
    sales: number;
    revenue: CurrencyTotals;
    transactions: Array<{
      id: string;
      product: string;
      amount: number;
      currency: string;
      paidAt: string | null;
      provider: "apple" | "google_play";
    }>;
  };

  unverifiedPaid: {
    sales: number;
    revenue: CurrencyTotals;
    transactions: Array<{
      id: string;
      product: string;
      amount: number;
      currency: string;
      paidAt: string | null;
    }>;
  };
};

function asObject(
  value: unknown
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function detectKnownStoreTest(
  payment: PaymentRow
): "apple" | "google_play" | null {
  if (lower(payment.status) !== "paid") {
    return null;
  }

  const metadata =
    asObject(payment.metadata);

  const gateway =
    lower(metadata.gateway);

  const paymentMethod =
    lower(metadata.payment_method);

  const appleEnvironment =
    lower(
      metadata.apple_environment
    );

  if (
    gateway === "apple" &&
    paymentMethod === "apple_iap" &&
    appleEnvironment === "sandbox"
  ) {
    return "apple";
  }

  if (
    gateway === "google_play" &&
    paymentMethod === "google_play" &&
    metadata.google_test_purchase === true
  ) {
    return "google_play";
  }

  return null;
}

function detectVerifiedProvider(
  payment: PaymentRow
): Provider | null {
  if (lower(payment.status) !== "paid") {
    return null;
  }

  if (!payment.paid_at) {
    return null;
  }

  const metadata =
    asObject(payment.metadata);

  const stripeMeta =
    asObject(metadata.stripe);

  const hitpayMeta =
    asObject(metadata.hitpay);

  const stripeEventId =
    clean(
      payment.stripe_event_id_last
    ) ||
    clean(stripeMeta.event_id);

  const stripeEventType =
    lower(stripeMeta.event_type);

  const stripePaymentStatus =
    lower(stripeMeta.payment_status);

  const stripeSuccess =
    stripePaymentStatus === "paid" ||
    stripePaymentStatus === "succeeded" ||
    stripeEventType === "invoice.paid" ||
    stripeEventType ===
      "charge.succeeded" ||
    stripeEventType ===
      "checkout.session.async_payment_succeeded";

  if (
    stripeEventId &&
    stripeSuccess
  ) {
    return "stripe";
  }

  const hitpayEventId =
    clean(hitpayMeta.event_id);

  const hitpayEventType =
    lower(hitpayMeta.event_type);

  const hitpayPaymentStatus =
    lower(hitpayMeta.payment_status);

  const hitpayStatus =
    lower(hitpayMeta.status);

  const hitpaySuccessValues =
    new Set([
      "paid",
      "succeeded",
      "success",
      "completed",
    ]);

  const hitpaySuccess =
    hitpaySuccessValues.has(
      hitpayEventType
    ) ||
    hitpaySuccessValues.has(
      hitpayPaymentStatus
    ) ||
    hitpaySuccessValues.has(
      hitpayStatus
    );

  if (
    hitpayEventId &&
    hitpaySuccess
  ) {
    return "hitpay";
  }

  const gateway =
    lower(metadata.gateway);

  const paymentMethod =
    lower(metadata.payment_method);

  const requestSource =
    lower(metadata.request_source);

  const verifiedAt =
    clean(metadata.verified_at);

  const appleTransactionId =
    clean(
      metadata.apple_transaction_id
    );

  const appleEnvironment =
    lower(
      metadata.apple_environment
    );

  const isAppleVerificationRoute =
    requestSource ===
      "api/apple/iap/verify" ||
    requestSource ===
      "api/apple/iap/verify-product";

  if (
    gateway === "apple" &&
    paymentMethod === "apple_iap" &&
    isAppleVerificationRoute &&
    appleTransactionId &&
    verifiedAt &&
    appleEnvironment === "production"
  ) {
    return "apple";
  }

  const googleTokenHash =
    clean(
      metadata.google_purchase_token_sha256
    );

  const googleOrderId =
    clean(
      metadata.google_order_id
    ) ||
    clean(
      metadata.google_latest_order_id
    );

  const isGoogleVerificationRoute =
    requestSource ===
      "api/google/play/verify-subscription" ||
    requestSource ===
      "api/google/play/verify-product";

  if (
    gateway === "google_play" &&
    paymentMethod === "google_play" &&
    isGoogleVerificationRoute &&
    metadata.google_test_purchase === false &&
    googleTokenHash &&
    verifiedAt &&
    (
      googleOrderId ||
      clean(
        metadata.google_subscription_state
      ) ||
      clean(
        metadata.google_purchase_state
      )
    )
  ) {
    return "google_play";
  }

  return null;
}

function getCurrency(
  payment: PaymentRow
) {
  const currency =
    clean(payment.currency).toUpperCase();

  return currency || "IDR";
}

function addAmount(
  totals: CurrencyTotals,
  currency: string,
  amount: number
) {
  totals[currency] =
    Number(
      totals[currency] || 0
    ) + Number(amount || 0);
}

function sumByCurrency(
  rows: PaymentRow[]
): CurrencyTotals {
  const totals: CurrencyTotals = {};

  for (const row of rows) {
    addAmount(
      totals,
      getCurrency(row),
      Number(
        row.amount_total || 0
      )
    );
  }

  return totals;
}

function getDateParts(
  value: string | Date
): {
  year: number;
  month: number;
  day: number;
} {
  const date =
    value instanceof Date
      ? value
      : new Date(value);

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          REPORTING_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const map =
    Object.fromEntries(
      parts.map((part) => [
        part.type,
        part.value,
      ])
    );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function dateKey(
  value: string | Date
) {
  const parts =
    getDateParts(value);

  return `${parts.year}-${String(
    parts.month
  ).padStart(2, "0")}-${String(
    parts.day
  ).padStart(2, "0")}`;
}

function monthKey(
  value: string | Date
) {
  return dateKey(value).slice(
    0,
    7
  );
}

function getMonthDefinitions(
  count = 6
) {
  const now =
    getDateParts(new Date());

  const currentIndex =
    now.year * 12 +
    (now.month - 1);

  return Array.from(
    { length: count },
    (_, index) => {
      const monthIndex =
        currentIndex -
        (count - 1 - index);

      const year =
        Math.floor(
          monthIndex / 12
        );

      const month =
        (monthIndex % 12) + 1;

      const key =
        `${year}-${String(
          month
        ).padStart(2, "0")}`;

      const label =
        new Intl.DateTimeFormat(
          "en-US",
          {
            month: "short",
            year: "2-digit",
            timeZone: "UTC",
          }
        ).format(
          new Date(
            Date.UTC(
              year,
              month - 1,
              1
            )
          )
        );

      return {
        key,
        label,
      };
    }
  );
}

async function fetchAllPaidPayments() {
  const rows: PaymentRow[] = [];

  let from = 0;

  while (true) {
    const to =
      from + PAGE_SIZE - 1;

    const {
      data,
      error,
    } = await supabaseAdmin
      .from(
        "payment_transactions"
      )
      .select(
        `
          id,
          source_role,
          payment_type,
          product_type,
          product_id,
          product_name_snapshot,
          amount_total,
          currency,
          status,
          paid_at,
          created_at,
          stripe_checkout_session_id,
          stripe_payment_intent_id,
          stripe_charge_id,
          stripe_invoice_id,
          stripe_event_id_last,
          metadata
        `
      )
      .eq("status", "paid")
      .order("paid_at", {
        ascending: false,
      })
      .range(from, to);

    if (error) {
      throw error;
    }

    const batch =
      (data || []) as PaymentRow[];

    rows.push(...batch);

    if (
      batch.length < PAGE_SIZE
    ) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

function buildGroupedBreakdown(
  rows: PaymentRow[],
  keyFn: (
    row: PaymentRow
  ) => string,
  labelFn: (
    row: PaymentRow
  ) => string
) {
  const groups =
    new Map<
      string,
      {
        key: string;
        label: string;
        rows: PaymentRow[];
      }
    >();

  for (const row of rows) {
    const key = keyFn(row);

    const existing =
      groups.get(key);

    if (existing) {
      existing.rows.push(row);
      continue;
    }

    groups.set(key, {
      key,
      label: labelFn(row),
      rows: [row],
    });
  }

  return Array.from(
    groups.values()
  )
    .map((group) => ({
      key: group.key,
      label: group.label,
      sales:
        group.rows.length,
      revenue:
        sumByCurrency(
          group.rows
        ),
    }))
    .sort(
      (a, b) =>
        b.sales - a.sales
    );
}

export async function buildRevenueAnalytics(): Promise<RevenueAnalytics> {
  if (
    !supabaseUrl ||
    !supabaseServiceRoleKey
  ) {
    throw new Error(
      "Supabase server environment is not configured."
    );
  }

  const paidRows =
    await fetchAllPaidPayments();

  const verifiedRows =
    paidRows
      .map((row) => ({
        row,
        provider:
          detectVerifiedProvider(
            row
          ),
      }))
      .filter(
        (
          item
        ): item is {
          row: PaymentRow;
          provider: Provider;
        } =>
          Boolean(item.provider)
      );

  const verifiedPayments =
    verifiedRows.map(
      (item) => item.row
    );

  const verifiedIds =
    new Set(
      verifiedPayments.map(
        (row) => row.id
      )
    );

  const testPaidRows =
    paidRows
      .map((row) => ({
        row,
        provider:
          detectKnownStoreTest(
            row
          ),
      }))
      .filter(
        (
          item
        ): item is {
          row: PaymentRow;
          provider:
            | "apple"
            | "google_play";
        } =>
          Boolean(item.provider)
      );

  const testPaidIds =
    new Set(
      testPaidRows.map(
        (item) => item.row.id
      )
    );

  const unverifiedPaid =
    paidRows.filter(
      (row) =>
        !verifiedIds.has(row.id) &&
        !testPaidIds.has(row.id)
    );

  const today =
    dateKey(new Date());

  const currentMonth =
    today.slice(0, 7);

  const todayRows =
    verifiedPayments.filter(
      (row) =>
        row.paid_at &&
        dateKey(row.paid_at) ===
          today
    );

  const monthRows =
    verifiedPayments.filter(
      (row) =>
        row.paid_at &&
        monthKey(
          row.paid_at
        ) === currentMonth
    );

  const stripeRows =
    verifiedRows
      .filter(
        (item) =>
          item.provider ===
          "stripe"
      )
      .map(
        (item) => item.row
      );

  const hitpayRows =
    verifiedRows
      .filter(
        (item) =>
          item.provider ===
          "hitpay"
      )
      .map(
        (item) => item.row
      );

  const appleRows =
    verifiedRows
      .filter(
        (item) =>
          item.provider ===
          "apple"
      )
      .map(
        (item) => item.row
      );

  const googlePlayRows =
    verifiedRows
      .filter(
        (item) =>
          item.provider ===
          "google_play"
      )
      .map(
        (item) => item.row
      );

  const ownerRows =
    verifiedPayments.filter(
      (row) =>
        lower(
          row.source_role
        ) === "owner"
    );

  const agentRows =
    verifiedPayments.filter(
      (row) =>
        lower(
          row.source_role
        ) === "agent"
    );

  const productBreakdown =
    buildGroupedBreakdown(
      verifiedPayments,
      (row) =>
        clean(
          row.product_id
        ) ||
        clean(
          row.payment_type
        ) ||
        "unknown",
      (row) =>
        clean(
          row.product_name_snapshot
        ) ||
        clean(
          row.product_id
        ) ||
        clean(
          row.payment_type
        ) ||
        "Unknown"
    );

  const monthDefinitions =
    getMonthDefinitions(6);

  const trend =
    monthDefinitions.map(
      (month) => {
        const rows =
          verifiedPayments.filter(
            (row) =>
              row.paid_at &&
              monthKey(
                row.paid_at
              ) === month.key
          );

        return {
          key: month.key,
          label: month.label,
          sales:
            rows.length,
          revenue:
            sumByCurrency(
              rows
            ),
        };
      }
    );

  return {
    reportingTimezone:
      REPORTING_TIME_ZONE,

    generatedAt:
      new Date().toISOString(),

    summary: {
      today: {
        sales:
          todayRows.length,
        revenue:
          sumByCurrency(
            todayRows
          ),
      },

      month: {
        sales:
          monthRows.length,
        revenue:
          sumByCurrency(
            monthRows
          ),
      },

      total: {
        sales:
          verifiedPayments.length,
        revenue:
          sumByCurrency(
            verifiedPayments
          ),
      },
    },

    providers: {
      hitpay: {
        sales:
          hitpayRows.length,
        revenue:
          sumByCurrency(
            hitpayRows
          ),
      },

      stripe: {
        sales:
          stripeRows.length,
        revenue:
          sumByCurrency(
            stripeRows
          ),
      },

      apple: {
        sales:
          appleRows.length,
        revenue:
          sumByCurrency(
            appleRows
          ),
      },

      googlePlay: {
        sales:
          googlePlayRows.length,
        revenue:
          sumByCurrency(
            googlePlayRows
          ),
      },
    },

    customerTypes: {
      owner: {
        sales:
          ownerRows.length,
        revenue:
          sumByCurrency(
            ownerRows
          ),
      },

      agent: {
        sales:
          agentRows.length,
        revenue:
          sumByCurrency(
            agentRows
          ),
      },
    },

    products:
      productBreakdown,

    trend,

    testPaid: {
      sales:
        testPaidRows.length,

      revenue:
        sumByCurrency(
          testPaidRows.map(
            (item) => item.row
          )
        ),

      transactions:
        testPaidRows.map(
          (item) => ({
            id: item.row.id,

            product:
              clean(
                item.row.product_name_snapshot
              ) ||
              clean(
                item.row.product_id
              ) ||
              clean(
                item.row.payment_type
              ) ||
              "Unknown",

            amount:
              Number(
                item.row.amount_total ||
                  0
              ),

            currency:
              getCurrency(
                item.row
              ),

            paidAt:
              item.row.paid_at,

            provider:
              item.provider,
          })
        ),
    },

    unverifiedPaid: {
      sales:
        unverifiedPaid.length,

      revenue:
        sumByCurrency(
          unverifiedPaid
        ),

      transactions:
        unverifiedPaid.map(
          (row) => ({
            id: row.id,
            product:
              clean(
                row.product_name_snapshot
              ) ||
              clean(
                row.product_id
              ) ||
              clean(
                row.payment_type
              ) ||
              "Unknown",

            amount:
              Number(
                row.amount_total ||
                  0
              ),

            currency:
              getCurrency(row),

            paidAt:
              row.paid_at,
          })
        ),
    },
  };
}