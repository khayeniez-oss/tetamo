import "server-only";

import { createClient } from "@supabase/supabase-js";
import { REPORTING_TIME_ZONE } from "@/lib/reporting/revenue";

const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

export type GrowthPeriod =
  | "today"
  | "7d"
  | "30d"
  | "all";

type AnalyticsEventRow = {
  id: string;
  created_at: string;
  event_name: string;
  property_id: string | null;
  user_id: string | null;
  source_page: string | null;
  session_id: string | null;
  visitor_id: string | null;
  lead_id: string | null;
  buyer_request_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type GrowthPeriodAnalytics = {
  period: GrowthPeriod;
  label: string;

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

export type GrowthAnalytics = {
  reportingTimezone: string;
  generatedAt: string;

  source: {
    table: "analytics_events";
    rowsLoaded: number;
    totalRows: number | null;
    truncated: boolean;
  };

  periods: {
    today: GrowthPeriodAnalytics;
    last7Days: GrowthPeriodAnalytics;
    last30Days: GrowthPeriodAnalytics;
    allTime: GrowthPeriodAnalytics;
  };
};

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

const ANALYTICS_SELECT =
  "id, created_at, event_name, property_id, user_id, source_page, session_id, visitor_id, lead_id, buyer_request_id, metadata";

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

  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: REPORTING_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(date);

  const map = Object.fromEntries(
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

function dateKey(value: string | Date) {
  const parts = getDateParts(value);

  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function getSessionKey(
  event: AnalyticsEventRow
) {
  return (
    event.session_id ||
    event.visitor_id ||
    event.id
  );
}

function isLeadEvent(
  eventName: string
) {
  return (
    eventName === "lead_created" ||
    eventName ===
      "buyer_request_submitted"
  );
}

function filterForPeriod(
  rows: AnalyticsEventRow[],
  period: GrowthPeriod,
  now: Date
) {
  if (period === "all") {
    return rows;
  }

  if (period === "today") {
    const todayKey =
      dateKey(now);

    return rows.filter(
      (row) =>
        dateKey(row.created_at) ===
        todayKey
    );
  }

  const days =
    period === "7d" ? 7 : 30;

  const cutoff =
    now.getTime() -
    days * 24 * 60 * 60 * 1000;

  return rows.filter((row) => {
    const timestamp =
      new Date(
        row.created_at
      ).getTime();

    return (
      !Number.isNaN(timestamp) &&
      timestamp >= cutoff
    );
  });
}

function buildPeriodAnalytics(
  rows: AnalyticsEventRow[],
  period: GrowthPeriod,
  label: string,
  now: Date
): GrowthPeriodAnalytics {
  const scopedRows =
    filterForPeriod(
      rows,
      period,
      now
    );

  const sessionKeys =
    new Set<string>();

  let cardViews = 0;
  let detailClicks = 0;
  let detailViews = 0;
  let whatsappClicks = 0;
  let scheduleClicks = 0;
  let leads = 0;

  for (const event of scopedRows) {
    sessionKeys.add(
      getSessionKey(event)
    );

    switch (event.event_name) {
      case "property_card_view":
        cardViews += 1;
        break;

      case "property_view_detail_click":
        detailClicks += 1;
        break;

      case "property_detail_view":
        detailViews += 1;
        break;

      case "property_whatsapp_click":
        whatsappClicks += 1;
        break;

      case "property_schedule_viewing_click":
        scheduleClicks += 1;
        break;

      default:
        if (
          isLeadEvent(
            event.event_name
          )
        ) {
          leads += 1;
        }
        break;
    }
  }

  const leadActions =
    whatsappClicks +
    scheduleClicks +
    leads;

  const viewToDetailRate =
    cardViews > 0
      ? (detailClicks /
          cardViews) *
        100
      : 0;

  const leadActionRate =
    detailViews > 0
      ? (leadActions /
          detailViews) *
        100
      : 0;

  const leadFormRate =
    detailViews > 0
      ? (leads /
          detailViews) *
        100
      : 0;

  return {
    period,
    label,

    sessions: sessionKeys.size,
    totalEvents:
      scopedRows.length,

    cardViews,
    detailClicks,
    detailViews,
    whatsappClicks,
    scheduleClicks,
    leads,

    leadActions,

    rates: {
      viewToDetailRate,
      leadActionRate,
      leadFormRate,
    },
  };
}

async function fetchAnalyticsEvents() {
  const rows: AnalyticsEventRow[] = [];

  const countResult =
    await supabaseAdmin
      .from("analytics_events")
      .select(
        "id",
        {
          count: "exact",
          head: true,
        }
      );

  if (countResult.error) {
    throw countResult.error;
  }

  for (
    let from = 0;
    from < MAX_ROWS;
    from += PAGE_SIZE
  ) {
    const to =
      from + PAGE_SIZE - 1;

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("analytics_events")
      .select(ANALYTICS_SELECT)
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .range(from, to);

    if (error) {
      throw error;
    }

    const pageRows =
      (data ||
        []) as AnalyticsEventRow[];

    rows.push(...pageRows);

    if (
      pageRows.length <
      PAGE_SIZE
    ) {
      break;
    }
  }

  return {
    rows,
    totalCount:
      countResult.count ?? null,
    truncated:
      countResult.count !== null
        ? rows.length <
          countResult.count
        : rows.length >=
          MAX_ROWS,
  };
}

export async function buildGrowthAnalytics(): Promise<GrowthAnalytics> {
  const now = new Date();

  const {
    rows,
    totalCount,
    truncated,
  } =
    await fetchAnalyticsEvents();

  return {
    reportingTimezone:
      REPORTING_TIME_ZONE,

    generatedAt:
      now.toISOString(),

    source: {
      table:
        "analytics_events",
      rowsLoaded: rows.length,
      totalRows: totalCount,
      truncated,
    },

    periods: {
      today:
        buildPeriodAnalytics(
          rows,
          "today",
          "Today",
          now
        ),

      last7Days:
        buildPeriodAnalytics(
          rows,
          "7d",
          "Last 7 Days",
          now
        ),

      last30Days:
        buildPeriodAnalytics(
          rows,
          "30d",
          "Last 30 Days",
          now
        ),

      allTime:
        buildPeriodAnalytics(
          rows,
          "all",
          "All Time",
          now
        ),
    },
  };
}
