import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPORTING_TIME_ZONE = "Asia/Jakarta";
const PAGE_SIZE = 1000;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

  metadata: Record<string, any> | null;
};

type Provider = "stripe" | "hitpay";

type CurrencyTotals = Record<string, number>;

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return clean(value).toLowerCase();
}

function getBearerToken(req: Request) {
  const authHeader = req.headers.get("authorization") || "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authHeader.slice(7).trim();
}

async function verifyAdmin(req: Request) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error: "Supabase server environment is not configured.",
        },
        { status: 500 }
      ),
    };
  }

  const token = getBearerToken(req);

  if (!token) {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error: "Unauthorized. Login is required.",
        },
        { status: 401 }
      ),
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user) {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error: "Unauthorized. Invalid session.",
        },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Revenue admin verification failed:", profileError);

    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error: "Unable to verify admin access.",
        },
        { status: 500 }
      ),
    };
  }

  const role = lower(profile?.role);

  if (role !== "admin") {
    return {
      authorized: false,
      response: Response.json(
        {
          ok: false,
          error: "Forbidden. Admin access is required.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    userId: user.id,
  };
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

  const metadata = asObject(payment.metadata);
  const stripeMeta = asObject(metadata.stripe);
  const hitpayMeta = asObject(metadata.hitpay);

  const stripeEventId =
    clean(payment.stripe_event_id_last) ||
    clean(stripeMeta.event_id);

  const stripeEventType = lower(stripeMeta.event_type);
  const stripePaymentStatus = lower(
    stripeMeta.payment_status
  );

  const stripeSuccess =
    stripePaymentStatus === "paid" ||
    stripePaymentStatus === "succeeded" ||
    stripeEventType === "invoice.paid" ||
    stripeEventType === "charge.succeeded" ||
    stripeEventType ===
      "checkout.session.async_payment_succeeded";

  if (stripeEventId && stripeSuccess) {
    return "stripe";
  }

  const hitpayEventId = clean(hitpayMeta.event_id);
  const hitpayEventType = lower(hitpayMeta.event_type);
  const hitpayPaymentStatus = lower(
    hitpayMeta.payment_status
  );
  const hitpayStatus = lower(hitpayMeta.status);

  const hitpaySuccessValues = new Set([
    "paid",
    "succeeded",
    "success",
    "completed",
  ]);

  const hitpaySuccess =
    hitpaySuccessValues.has(hitpayEventType) ||
    hitpaySuccessValues.has(hitpayPaymentStatus) ||
    hitpaySuccessValues.has(hitpayStatus);

  if (hitpayEventId && hitpaySuccess) {
    return "hitpay";
  }

  return null;
}

function getCurrency(payment: PaymentRow) {
  const currency = clean(payment.currency).toUpperCase();
  return currency || "IDR";
}

function addAmount(
  totals: CurrencyTotals,
  currency: string,
  amount: number
) {
  totals[currency] =
    Number(totals[currency] || 0) + Number(amount || 0);
}

function sumByCurrency(
  rows: PaymentRow[]
): CurrencyTotals {
  const totals: CurrencyTotals = {};

  for (const row of rows) {
    addAmount(
      totals,
      getCurrency(row),
      Number(row.amount_total || 0)
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
    value instanceof Date ? value : new Date(value);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORTING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function dateKey(value: string | Date) {
  const parts = getDateParts(value);

  return `${parts.year}-${String(parts.month).padStart(
    2,
    "0"
  )}-${String(parts.day).padStart(2, "0")}`;
}

function monthKey(value: string | Date) {
  return dateKey(value).slice(0, 7);
}

function getMonthDefinitions(count = 6) {
  const now = getDateParts(new Date());
  const currentIndex =
    now.year * 12 + (now.month - 1);

  return Array.from({ length: count }, (_, index) => {
    const monthIndex =
      currentIndex - (count - 1 - index);

    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;

    const key = `${year}-${String(month).padStart(
      2,
      "0"
    )}`;

    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));

    return {
      key,
      label,
    };
  });
}

async function fetchAllPaidPayments() {
  const rows: PaymentRow[] = [];

  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabaseAdmin
      .from("payment_transactions")
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

    const batch = (data || []) as PaymentRow[];

    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

function buildGroupedBreakdown(
  rows: PaymentRow[],
  keyFn: (row: PaymentRow) => string,
  labelFn: (row: PaymentRow) => string
) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      rows: PaymentRow[];
    }
  >();

  for (const row of rows) {
    const key = keyFn(row);
    const existing = groups.get(key);

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

  return Array.from(groups.values())
    .map((group) => ({
      key: group.key,
      label: group.label,
      sales: group.rows.length,
      revenue: sumByCurrency(group.rows),
    }))
    .sort((a, b) => b.sales - a.sales);
}

export async function GET(req: Request) {
  const auth = await verifyAdmin(req);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const paidRows = await fetchAllPaidPayments();

    const verifiedRows = paidRows
      .map((row) => ({
        row,
        provider: detectVerifiedProvider(row),
      }))
      .filter(
        (
          item
        ): item is {
          row: PaymentRow;
          provider: Provider;
        } => Boolean(item.provider)
      );

    const verifiedPayments = verifiedRows.map(
      (item) => item.row
    );

    const verifiedIds = new Set(
      verifiedPayments.map((row) => row.id)
    );

    const unverifiedPaid = paidRows.filter(
      (row) => !verifiedIds.has(row.id)
    );

    const today = dateKey(new Date());
    const currentMonth = today.slice(0, 7);

    const todayRows = verifiedPayments.filter(
      (row) =>
        row.paid_at &&
        dateKey(row.paid_at) === today
    );

    const monthRows = verifiedPayments.filter(
      (row) =>
        row.paid_at &&
        monthKey(row.paid_at) === currentMonth
    );

    const stripeRows = verifiedRows
      .filter((item) => item.provider === "stripe")
      .map((item) => item.row);

    const hitpayRows = verifiedRows
      .filter((item) => item.provider === "hitpay")
      .map((item) => item.row);

    const ownerRows = verifiedPayments.filter(
      (row) => lower(row.source_role) === "owner"
    );

    const agentRows = verifiedPayments.filter(
      (row) => lower(row.source_role) === "agent"
    );

    const productBreakdown = buildGroupedBreakdown(
      verifiedPayments,
      (row) =>
        clean(row.product_id) ||
        clean(row.payment_type) ||
        "unknown",
      (row) =>
        clean(row.product_name_snapshot) ||
        clean(row.product_id) ||
        clean(row.payment_type) ||
        "Unknown"
    );

    const monthDefinitions = getMonthDefinitions(6);

    const trend = monthDefinitions.map((month) => {
      const rows = verifiedPayments.filter(
        (row) =>
          row.paid_at &&
          monthKey(row.paid_at) === month.key
      );

      return {
        key: month.key,
        label: month.label,
        sales: rows.length,
        revenue: sumByCurrency(rows),
      };
    });

    return Response.json({
      ok: true,
      reportingTimezone: REPORTING_TIME_ZONE,
      generatedAt: new Date().toISOString(),

      summary: {
        today: {
          sales: todayRows.length,
          revenue: sumByCurrency(todayRows),
        },
        month: {
          sales: monthRows.length,
          revenue: sumByCurrency(monthRows),
        },
        total: {
          sales: verifiedPayments.length,
          revenue: sumByCurrency(verifiedPayments),
        },
      },

      providers: {
        hitpay: {
          sales: hitpayRows.length,
          revenue: sumByCurrency(hitpayRows),
        },
        stripe: {
          sales: stripeRows.length,
          revenue: sumByCurrency(stripeRows),
        },
      },

      customerTypes: {
        owner: {
          sales: ownerRows.length,
          revenue: sumByCurrency(ownerRows),
        },
        agent: {
          sales: agentRows.length,
          revenue: sumByCurrency(agentRows),
        },
      },

      products: productBreakdown,

      trend,

      unverifiedPaid: {
        sales: unverifiedPaid.length,
        revenue: sumByCurrency(unverifiedPaid),
        transactions: unverifiedPaid.map((row) => ({
          id: row.id,
          product:
            clean(row.product_name_snapshot) ||
            clean(row.product_id) ||
            clean(row.payment_type) ||
            "Unknown",
          amount: Number(row.amount_total || 0),
          currency: getCurrency(row),
          paidAt: row.paid_at,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to build revenue analytics:", error);

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load revenue analytics.",
      },
      { status: 500 }
    );
  }
}
